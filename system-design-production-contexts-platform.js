(function(){'use strict';
const contexts={
  'rate-limiting-traffic-management::Leaky bucket':{
    scenario:'City operators in us-east-1 push a stadium-event surge override batch, and the pricing admin API must drain writes into the downstream pipeline at a smooth fixed rate.',
    components:[
      ['opsClient','City Ops Console','submits surge override batches for Manhattan and Brooklyn','client',8,28],
      ['pricingApi','Pricing Admin API','owns fare override writes for the regional pricing stack','api',28,28],
      ['policyPlane','Quota Policy Plane','publishes per-city drain contracts and emergency caps','control',52,10],
      ['leakyBucket','Leaky Bucket Gate','smooths admitted override traffic into the writer lane','mechanism',52,40],
      ['writerTopic','Fare Override Kafka','authoritative sink consumed by pricing materializers','stream',82,28],
      ['checkpointStore','Limiter Checkpoint Blob','stores shard ownership and restart checkpoints','storage',52,76],
      ['shedTopic','Overload Incident Topic','captures shed batches for replay and on-call review','sink',82,76]
    ],
    flows:[
      ['opsClient','pricingApi','POST /v1/fare-overrides batch FO-771','City ops pushes a burst of 600 overrides ahead of a stadium event.'],
      ['pricingApi','policyPlane','fetch nyc-drain-policy v31','The API loads the active 40 rps contract and overflow threshold before admitting work.'],
      ['policyPlane','leakyBucket','apply city=nyc drain 40rps policy','The control plane updates the gate for the current city and deployment epoch.'],
      ['pricingApi','leakyBucket','request admission for batch FO-771 on shard nyc-a','The batch is handed to one limiter shard instead of going straight to the writers.'],
      ['leakyBucket','writerTopic','release override slices to pricing.override.us-east','Admitted records leave at the configured steady rate so downstream writers stay stable.'],
      ['leakyBucket','checkpointStore','persist shard nyc-a checkpoint epoch 184','Ownership and replay position are checkpointed so a restarted pod can resume safely.'],
      ['leakyBucket','shedTopic','emit shed notice for FO-771 overflow','If backlog crosses the emergency cap, overflow is recorded for replay rather than silently dropped.']
    ]
  },
  'rate-limiting-traffic-management::Fixed window':{
    scenario:'A consumer identity service limits password reset emails per source IP in five-minute billing windows during a credential-stuffing wave.',
    components:[
      ['browser','Consumer Browser','submits password reset requests from home and mobile networks','client',8,26],
      ['resetApi','Password Reset API','owns reset initiation for the identity edge','api',28,26],
      ['policyService','Abuse Policy Service','publishes the current per-IP fixed-window caps','control',52,10],
      ['fixedWindow','Fixed Window Gate','admits or rejects each reset request for the active window','mechanism',52,40],
      ['mailQueue','Reset Mail Queue','authoritative sink for reset jobs delivered to the mailer','stream',82,24],
      ['windowSnapshot','Quota Snapshot Blob','stores active limiter shard checkpoints for rollouts','storage',52,76],
      ['abuseCases','Abuse Case Stream','captures rejected requests for automated investigation','sink',82,76]
    ],
    flows:[
      ['browser','resetApi','POST /selfservice/reset for account 882114','A user asks for a reset link while attackers are probing the same network range.'],
      ['resetApi','policyService','load ip-reset-cap plan rev 206','The API fetches the five-minute per-IP threshold for the current tenant and region.'],
      ['policyService','fixedWindow','push 20 requests per 5m rule for 198.51.100.0/24','The limiter receives the current fixed-window contract before evaluating the call.'],
      ['resetApi','fixedWindow','evaluate source 198.51.100.42 in window 14:00-14:05','The API binds the request to the current billing window instead of an exact trailing interval.'],
      ['fixedWindow','mailQueue','enqueue reset mail job RM-552901','Admitted requests become durable mail jobs that downstream mailers can retry independently.'],
      ['fixedWindow','windowSnapshot','persist active shard checkpoint fw-eu-12','Checkpoint metadata is written so a rolling restart keeps the same window owner.'],
      ['fixedWindow','abuseCases','emit 429 evidence for source 198.51.100.42','Rejected calls are preserved for abuse automation and operator review.']
    ]
  },
  'rate-limiting-traffic-management::Token bucket':{
    scenario:'A courier-tracking platform in westus2 lets partner fleets burst reconnect-driven GPS updates into the dispatch pipeline while keeping each fleet on a steady ingest budget.',
    components:[
      ['fleetSender','Courier Telemetry Gateway','pushes batched GPS updates after drivers regain network coverage','client',8,28],
      ['trackingApi','Courier Tracking API','owns partner telemetry admission for the dispatch platform','api',28,28],
      ['quotaPlane','Partner Quota Control Plane','publishes burst and refill contracts for each fleet integration','control',52,10],
      ['tokenBucket','Token Bucket Gate','admits short bursts while enforcing the steady ingest rate per fleet','mechanism',52,40],
      ['dispatchTopic','Dispatch Telemetry Kafka','authoritative sink for admitted driver location updates','stream',82,24],
      ['stateStore','Limiter Lease Table','stores shard leases and restart checkpoints for limiter partitions','storage',52,76],
      ['throttleEvents','Throttle Event Topic','captures excess bursts for replay tooling and partner support','sink',82,76]
    ],
    flows:[
      ['fleetSender','trackingApi','POST /v1/driver-locations batch GPS-4402','A partner fleet reconnects after tunnel loss and sends a burst of queued location updates.'],
      ['trackingApi','quotaPlane','fetch fleet rapid-courier quota plan rev 63','The API loads the current burst allowance and refill rate for the partner lane.'],
      ['quotaPlane','tokenBucket','apply fleet=rapid-courier 120 burst / 20rps refill plan','The control plane updates the limiter shard with the active fleet contract and rollout epoch.'],
      ['trackingApi','tokenBucket','request admission for batch GPS-4402 on fleet shard rc-3','The burst is evaluated by one limiter shard before any dispatch work is accepted.'],
      ['tokenBucket','dispatchTopic','enqueue admitted updates to dispatch.telemetry.westus2','Accepted location updates become durable dispatch telemetry events for route planning consumers.'],
      ['tokenBucket','stateStore','persist shard rc-3 checkpoint epoch 511','Shard ownership and restart checkpoints are saved so a new pod can resume without losing limiter state.'],
      ['tokenBucket','throttleEvents','emit throttle record for overflow from fleet rapid-courier','Overflow is preserved for replay and partner support instead of disappearing behind a 429 only.']
    ]
  },
  'rate-limiting-traffic-management::Sliding window':{
    scenario:'A retail banking login API enforces exact trailing ten-minute attempt limits per account to stop OTP brute force attacks without minute-boundary bursts.',
    components:[
      ['mobileApp','Banking Mobile App','submits password and OTP login attempts for retail customers','client',8,30],
      ['loginApi','Retail Login API','owns credential verification entry for consumer banking','api',28,30],
      ['fraudPolicy','Fraud Policy Service','publishes exact-window caps per account risk tier','control',52,10],
      ['slidingWindow','Sliding Window Gate','tracks the exact trailing attempt budget for each account and IP','mechanism',52,42],
      ['authCore','Credential Verification Core','authoritative login execution path after admission','service',82,24],
      ['checkpointStore','Limiter State Blob','stores limiter shard checkpoints for failover and replay','storage',52,78],
      ['socAlerts','SOC Alert Topic','captures repeated blocks for analyst triage','sink',82,78]
    ],
    flows:[
      ['mobileApp','loginApi','POST /login account 443812 req-9812','A customer submits a login attempt while the account is under elevated fraud monitoring.'],
      ['loginApi','fraudPolicy','fetch retail-login exact-window policy rev 44','The API loads the active attempt contract for the account and source network.'],
      ['fraudPolicy','slidingWindow','apply 5 attempts per 10m on account+ip key','The exact-window gate is updated with the current fraud rule before evaluation.'],
      ['loginApi','slidingWindow','evaluate account 443812 from 203.0.113.44','The request is checked against the trailing ten-minute history instead of a coarse bucket.'],
      ['slidingWindow','authCore','forward admitted credential check req-9812','Only admitted attempts reach the authoritative password and OTP verification path.'],
      ['slidingWindow','checkpointStore','persist limiter shard retail-443812 epoch 92','Checkpoint metadata keeps the same account partition recoverable after pod movement.'],
      ['slidingWindow','socAlerts','emit brute-force block for account 443812','Repeated blocks are surfaced to analysts with the offending account and source context.']
    ]
  },
  'rate-limiting-traffic-management::Sliding window counter':{
    scenario:'A partner sync API accepts CRM contact upserts from thousands of tenant daemons and uses an approximate sliding-window counter to cap each app at 20,000 requests per 15 minutes across the edge fleet.',
    components:[
      ['partnerDaemon','Partner CRM Daemon','pushes contact upsert batches from tenant systems','client',8,28],
      ['syncApi','Partner Sync API','owns inbound upsert admission at the public edge','api',28,28],
      ['quotaControl','Tenant Quota Control Plane','publishes app-level rolling quota plans','control',52,10],
      ['windowCounter','Sliding Window Counter Service','approximates rolling usage for each partner app key','mechanism',52,40],
      ['upsertQueue','CRM Upsert Queue','authoritative sink for admitted upsert work','stream',82,24],
      ['stateSnapshot','Quota Snapshot Blob','stores shard checkpoints for restarts and region failover','storage',52,76],
      ['throttleTopic','Throttle Event Topic','captures throttles for billing, replay, and support tooling','sink',82,76]
    ],
    flows:[
      ['partnerDaemon','syncApi','POST /sync/contact batch CT-8801','A tenant daemon sends a large contact sync burst after an overnight export job.'],
      ['syncApi','quotaControl','fetch tenant beta rolling quota plan rev 88','The API loads the 20k per 15-minute rolling contract for the calling app.'],
      ['quotaControl','windowCounter','apply weighted-window plan for app beta-crm','The counter service receives the current policy and approximation weights before admission.'],
      ['syncApi','windowCounter','evaluate app beta-crm in rolling interval 14:00-14:15','The request is checked against the approximate trailing usage shared by many edge pods.'],
      ['windowCounter','upsertQueue','enqueue admitted batch CT-8801 to crm.upsert.ingest','Accepted batches become durable queue work for the materializer fleet.'],
      ['windowCounter','stateSnapshot','persist shard beta-crm snapshot seq 54012','Shard state is checkpointed so an edge replacement can resume from the latest snapshot.'],
      ['windowCounter','throttleTopic','emit throttle record for app beta-crm','Approximation-based rejects are preserved for billing support and replay workflows.']
    ]
  },
  'storage-systems::LSM trees':{
    scenario:'A multiplayer game backend stores player inventory documents in an LSM-backed key-value shard and needs fast write absorption with restore from object storage.',
    components:[
      ['sessionServers','Match Session Servers','emit player inventory mutations after each completed match','producer',8,28],
      ['inventoryApi','Inventory Write API','owns inventory commits for shard us-central-7','api',28,28],
      ['tabletManager','Tablet Manager','assigns shard ownership and repair windows','control',52,10],
      ['lsmShard','Inventory LSM Shard','authoritative key-value store for player inventory documents','mechanism',52,42],
      ['changeStream','Inventory CDC Stream','feeds fraud and analytics consumers from committed mutations','stream',82,22],
      ['backupBucket','Shard Backup Bucket','holds restore checkpoints and manifests','storage',52,78],
      ['repairQueue','Storage Repair Queue','tracks replay and corruption work items','sink',82,78]
    ],
    flows:[
      ['sessionServers','inventoryApi','PUT /inventory/player-8841 delta INV-9921','A completed match generates a burst of inventory mutations for one player.'],
      ['inventoryApi','tabletManager','resolve tenant=global shard us-central-7 owner','The API confirms the current tablet owner before writing the inventory record.'],
      ['inventoryApi','lsmShard','commit inventory mutation INV-9921','The authoritative shard absorbs the write path for the player document.'],
      ['lsmShard','changeStream','publish committed inventory delta offset 551002','Committed mutations fan out to downstream fraud and analytics consumers.'],
      ['tabletManager','lsmShard','apply ownership epoch 441 during rolling failover','The control plane moves shard ownership without changing the client contract.'],
      ['lsmShard','backupBucket','write hourly shard checkpoint cp-2026-09-21T1400Z','The shard publishes a restore checkpoint so a replacement node can bootstrap quickly.'],
      ['lsmShard','repairQueue','open replay ticket for shard us-central-7 checksum alarm','Detected corruption produces a durable repair item instead of a silent data hole.']
    ]
  },
  'storage-systems::B-trees':{
    scenario:'A marketplace orders service uses a B-tree index to serve merchant date-range dashboards from its primary SQL cluster and to survive index rebuilds.',
    components:[
      ['checkoutService','Checkout Service','creates new marketplace orders from live cart checkouts','producer',8,22],
      ['ordersPrimary','Orders SQL Primary','authoritative storage for order rows and transactional state','database',30,42],
      ['btreeIndex','Merchant Date B-Tree','serves merchant and created_at range seeks on the primary cluster','mechanism',56,18],
      ['reportingApi','Merchant Reporting API','owns dashboard queries for merchants and finance operators','api',82,22],
      ['schemaController','Schema Controller','rolls out index builds and versioned query plans','control',56,78],
      ['backupStore','Base Backup Store','retains nightly cluster backups for restore workflows','storage',30,78],
      ['reindexWorker','Reindex Worker','rebuilds damaged indexes without replacing the base table','worker',82,78]
    ],
    flows:[
      ['checkoutService','ordersPrimary','insert order O-551991','A live checkout commits a new order row into the primary transactional store.'],
      ['ordersPrimary','btreeIndex','maintain idx_orders_merchant_created_at entry for O-551991','The index stays aligned with the newly committed order row.'],
      ['reportingApi','btreeIndex','range-scan merchant 441 for last 7 days','Merchant dashboards resolve date ranges through the ordered index path.'],
      ['btreeIndex','ordersPrimary','locate row ids for dashboard hydration','The index directs the API to the authoritative rows that hold the full order records.'],
      ['schemaController','btreeIndex','build concurrently idx_orders_merchant_created_at_v3','Control plane deploys a new index revision without blocking write traffic.'],
      ['ordersPrimary','backupStore','ship nightly base backup bb-2026-09-21','The cluster publishes a durable restore point for disaster recovery and testing.'],
      ['reindexWorker','btreeIndex','rebuild merchant date index after corruption alarm','A repair workflow recreates the index while preserving the primary table as source of truth.']
    ]
  },
  'storage-systems::SSTables':{
    scenario:'A feature flag history service writes immutable daily segments as SSTables into object storage so auditors can query exact past rollouts.',
    components:[
      ['releasePipelines','Release Pipelines','emit flag rollout and rollback events from deployment systems','producer',8,26],
      ['historyIngest','Flag History Ingest API','owns accepted rollout history ingestion for all tenants','api',28,26],
      ['sstableSet','Flag History SSTable Set','packages immutable sorted history segments for audit reads','mechanism',52,40],
      ['manifestService','Segment Manifest Service','tracks which sealed segments belong to each tenant and day','control',52,10],
      ['archiveBucket','Audit Archive Bucket','authoritative storage for sealed history segments and checksums','storage',82,24],
      ['auditQuery','Audit Query API','serves point-in-time rollout lookups to compliance analysts','api',82,58],
      ['rebuildWorker','Manifest Rebuild Worker','repairs missing catalog entries from archived checksums','worker',52,78]
    ],
    flows:[
      ['releasePipelines','historyIngest','POST /history/rollouts event FF-662','Deployment systems send a rollout event when a new flag change is pushed.'],
      ['historyIngest','sstableSet','append sorted history record for tenant alpha','Accepted events are written into the immutable sorted segment path for the tenant.'],
      ['manifestService','sstableSet','seal tenant-alpha day=2026-09-21 segment','The control plane finalizes the current daily segment before publication.'],
      ['sstableSet','archiveBucket','publish segment sst-8842 with checksum manifest','Sealed immutable segments become durable archive artifacts in object storage.'],
      ['auditQuery','manifestService','resolve segments for flag checkout-redesign','Audit queries first discover which archived segments cover the requested time range.'],
      ['auditQuery','sstableSet','scan matching segments for point-in-time lookup','Only the relevant immutable segments are opened for the compliance query.'],
      ['rebuildWorker','manifestService','recreate missing manifest entry from archived checksums','If catalog state is lost, the rebuild path reconstructs it from the authoritative archive.']
    ]
  },
  'storage-systems::Write-ahead logs':{
    scenario:'A real-time payments ledger must durably append transfers before acknowledging the card switch, replicate the log to a standby, and replay after a crash.',
    components:[
      ['cardSwitch','Card Switch Gateway','submits approved authorizations and captures to the ledger','producer',8,24],
      ['ledgerApi','Ledger Write API','owns transfer commits for the tier-0 payments ledger','api',28,24],
      ['syncPolicy','Durability Policy Service','publishes fsync and replica acknowledgement requirements','control',52,10],
      ['wal','Ledger WAL','records every committed transfer before it becomes visible','mechanism',52,40],
      ['ledgerPrimary','Ledger Primary Store','authoritative balances and transfer state after commit','database',82,22],
      ['drStandby','EU-West Ledger Standby','replays the replicated log for disaster recovery','database',82,58],
      ['archiveVault','Immutable WAL Vault','retains completed log segments for audits and restores','storage',52,78],
      ['recoveryRunner','Crash Recovery Runner','replays WAL segments after process or node restart','worker',28,78]
    ],
    flows:[
      ['cardSwitch','ledgerApi','POST /transfers TR-844120','An approved payment reaches the ledger commit path from the card switch.'],
      ['ledgerApi','syncPolicy','load tier0 fsync-and-replicate policy rev 12','The API loads the current durability contract before acknowledging the payment.'],
      ['ledgerApi','wal','append transfer TR-844120 before commit ack','The transfer is durably logged before the primary store exposes the balance change.'],
      ['wal','ledgerPrimary','make TR-844120 visible at LSN 88/4451','The primary ledger applies the logged record as authoritative account state.'],
      ['wal','drStandby','stream segment 88 to eu-west standby','Standby recovery stays current by replaying the replicated log stream.'],
      ['wal','archiveVault','roll completed segment 88 to immutable vault','Completed segments are archived for compliance and deep restore workflows.'],
      ['recoveryRunner','wal','replay from LSN 88/4400 after node restart','If the process crashes, recovery reuses the authoritative log to restore the primary state.']
    ]
  },
  'storage-systems::Memtables':{
    scenario:'A social app presence service absorbs noisy online and offline updates by staging them in memtables backed by a replicated commit log and rebuilding buffers after node loss.',
    components:[
      ['mobileClients','Mobile Presence Clients','emit user presence updates from active devices','producer',8,28],
      ['presenceGateway','Presence Gateway','owns write admission for presence updates at the edge','api',28,28],
      ['shardController','Presence Shard Controller','assigns shard ownership and memory budgets','control',52,10],
      ['commitLog','Presence Commit Log','authoritative ordered history of accepted presence changes','stream',28,78],
      ['memtable','Presence Memtable Buffer','holds the latest per-user presence state for hot reads','mechanism',52,42],
      ['snapshotStore','Hot State Snapshot Store','stores checkpoints used during rolling restarts','storage',52,78],
      ['restoreWorker','Presence Restore Worker','rebuilds buffers after a shard process is replaced','worker',82,78]
    ],
    flows:[
      ['mobileClients','presenceGateway','POST /presence user-18 online','A device reports a fresh presence heartbeat for one user.'],
      ['presenceGateway','shardController','resolve shard pr-4 and active memory budget','The gateway asks which shard owns the user and what memory contract is active.'],
      ['shardController','memtable','apply 6GB budget and flush watermark for shard pr-4','Control plane keeps the hot buffer within the current memory envelope.'],
      ['presenceGateway','commitLog','append presence event PE-991082','Accepted changes first land in the authoritative ordered history.'],
      ['presenceGateway','memtable','upsert latest state for user-18 on shard pr-4','The hot write buffer is updated so friend-list reads see the newest presence immediately.'],
      ['memtable','snapshotStore','write hot-state checkpoint ckpt-pr4-551','Periodic checkpoints reduce the amount of commit-log replay required after restarts.'],
      ['restoreWorker','commitLog','seek replay source from offset 991082','A replacement worker locates the authoritative history to rebuild the lost hot buffer.'],
      ['restoreWorker','memtable','rehydrate shard pr-4 to checkpoint plus replay offset','The restore path reconstructs the buffer before traffic is returned to the shard.']
    ]
  },
  'storage-systems::Compaction':{
    scenario:'An observability platform compacts hourly metric blocks into query-efficient day blocks while keeping rollback and replay paths for failed merges.',
    components:[
      ['nodeAgents','Node Metrics Agents','produce high-cardinality time-series samples from customer nodes','producer',8,24],
      ['metricsGateway','Metrics Ingest Gateway','owns durable sample admission for the TSDB cluster','api',28,24],
      ['tsdbCluster','Metrics Block Store','authoritative storage for accepted time-series blocks','database',28,62],
      ['compactor','TSDB Compactor','merges blocks according to the active retention and merge policy','mechanism',52,40],
      ['retentionPlane','Retention Policy Plane','publishes hot and cold block merge schedules','control',52,10],
      ['snapshotBucket','Pre-Merge Snapshot Bucket','stores rollback checkpoints before merged manifests go live','storage',52,78],
      ['mergeReplayQueue','Merge Replay Queue','holds failed merge work items for retried recovery','sink',82,78]
    ],
    flows:[
      ['nodeAgents','metricsGateway','POST /samples block BLK-7712','Customer nodes push a fresh block of time-series samples into the observability pipeline.'],
      ['metricsGateway','tsdbCluster','append block BLK-7712 to series partition westus2','The accepted block becomes part of the authoritative metrics store.'],
      ['retentionPlane','compactor','publish 2h-to-1d merge plan rev 57','Control plane tells the compactor which block spans can be merged.'],
      ['tsdbCluster','compactor','hand off block set host=westus2 cpu to merge job','The authoritative store exposes candidate blocks to the merge workflow.'],
      ['compactor','snapshotBucket','write rollback checkpoint before manifest swap','A checkpoint is written so the cluster can revert a bad merge without losing source blocks.'],
      ['compactor','tsdbCluster','install merged manifest mb-7741 for host=westus2','The compacted block replaces the previous fragmented span in the active manifest.'],
      ['compactor','mergeReplayQueue','emit failed merge item for checksum mismatch','A failed merge becomes durable recovery work instead of silently skipping data.']
    ]
  },
  'storage-systems::Sparse indexes':{
    scenario:'A compliance audit service scans petabytes of sorted API access logs in object storage using sparse indexes to avoid full block reads.',
    components:[
      ['auditor','Compliance Analyst Console','submits focused access-log investigations for a case','client',8,24],
      ['complianceApi','Compliance Search API','owns audit queries and export jobs for investigators','api',28,24],
      ['partitionCatalog','Archive Partition Catalog','tracks which object prefixes cover each day and region','control',52,10],
      ['sparseIndex','Audit Sparse Index','maps coarse keys to candidate archive block offsets','mechanism',52,40],
      ['logArchive','Sorted Audit Log Archive','authoritative storage for immutable access log blocks','storage',82,24],
      ['caseExport','Case Export Bucket','stores investigator-ready evidence bundles and manifests','sink',82,58],
      ['rebuildJob','Sparse Index Rebuild Job','repairs missing markers after storage audits or migrations','worker',52,78]
    ],
    flows:[
      ['auditor','complianceApi','GET /cases/447/search?principal=alice','An investigator requests all accesses by one principal for an active case.'],
      ['complianceApi','partitionCatalog','resolve 2026-09-20 us-east archive partitions','The API narrows the search to the exact immutable archive spans for the request.'],
      ['complianceApi','sparseIndex','lookup candidate blocks for principal=alice','The sparse index is queried to avoid reading every sorted log block.'],
      ['sparseIndex','logArchive','fetch block offsets 18,44,51 for case 447','Only the candidate blocks are opened from the authoritative archive.'],
      ['logArchive','caseExport','write matched records into case-447 evidence bundle','Matching log records are materialized into the investigator export sink.'],
      ['partitionCatalog','sparseIndex','register markers for new archive day 2026-09-21','Fresh archive partitions publish their sparse markers through the control path.'],
      ['rebuildJob','sparseIndex','rebuild missing markers after checksum audit','If marker state is lost, the rebuild workflow reconstructs it from the authoritative archive.']
    ]
  },
  'storage-systems::Covering indexes':{
    scenario:'A payouts dashboard serves pending-transfer grids directly from a covering index so finance analysts do not hammer the payments base table.',
    components:[
      ['financeUi','Finance Analyst UI','requests filtered payout grids and detail pages','client',8,22],
      ['dashboardApi','Payout Dashboard API','owns dashboard query planning and response shaping','api',28,22],
      ['payoutsTable','Payouts Primary Table','authoritative storage for payout lifecycle records','database',28,62],
      ['coveringIndex','Pending Payout Covering Index','stores the query keys plus returned columns for the main grid','mechanism',56,22],
      ['schemaManager','Schema Manager','rolls out index revisions and query-plan toggles','control',56,78],
      ['backupStore','Payout Backup Store','retains table backups used for repair drills and restores','storage',28,78],
      ['reindexWorker','Covering Index Rebuilder','recreates the covering index when corruption or drift is detected','worker',82,78]
    ],
    flows:[
      ['financeUi','dashboardApi','GET /payouts?merchant=441&state=pending','An analyst requests the pending payout grid for one merchant account.'],
      ['dashboardApi','coveringIndex','scan idx_payouts_state_merchant covering amount,currency,created_at','The API uses the covering index to answer the grid without touching every base-table row.'],
      ['coveringIndex','dashboardApi','return payout grid rows from index-only scan','The grid response is assembled directly from indexed columns for the hot path query.'],
      ['schemaManager','coveringIndex','deploy INCLUDE(amount,currency,created_at) revision 9','The control plane rolls out a new index shape that matches the dashboard contract.'],
      ['dashboardApi','payoutsTable','fallback point-read payout P-8821 on index miss','Detail queries still return to the authoritative table when the index cannot answer them alone.'],
      ['payoutsTable','backupStore','ship hourly logical backup lb-7728','The base table publishes repair-grade backups for recovery and audit exercises.'],
      ['reindexWorker','coveringIndex','rebuild covering index from payouts table after alarm','A repair workflow regenerates the index from the authoritative base table if needed.']
    ]
  },
  'storage-systems::Inverted indexes':{
    scenario:'A support portal indexes troubleshooting articles and ticket notes so agents can find exact token error remedies within milliseconds.',
    components:[
      ['supportAgent','Support Agent UI','submits production incident and troubleshooting searches','client',8,22],
      ['editorPipeline','Knowledge Ingestion Pipeline','publishes new articles and ticket-note batches','producer',8,62],
      ['searchApi','Support Search API','owns query parsing and result ranking for support agents','api',28,22],
      ['documentStore','Knowledge Document Store','authoritative storage for articles and attached notes','database',28,62],
      ['invertedIndex','Support Inverted Index','maps terms to postings lists for fast full-text retrieval','mechanism',56,22],
      ['relevancePolicy','Relevance Policy Service','pushes synonym packs and ranking overrides','control',56,78],
      ['snapshotRepo','Index Snapshot Repository','stores shard snapshots used for rollout and restore','storage',82,62],
      ['rebuildWorker','Index Rebuild Worker','restores shards after corruption or region evacuation','worker',82,22]
    ],
    flows:[
      ['editorPipeline','documentStore','commit article KB-448 token-decryption fix','Knowledge ingestion first lands the new article in the authoritative document store.'],
      ['editorPipeline','invertedIndex','index terms for KB-448 and ticket-note batch N-77','New content is tokenized into postings lists for support search.'],
      ['supportAgent','searchApi','query "invalid x5t token decryption"','A live support case triggers a search for a precise token failure signature.'],
      ['searchApi','invertedIndex','retrieve postings for query q-1182','The API resolves the relevant postings lists through the inverted index shard.'],
      ['invertedIndex','documentStore','hydrate KB-448 and KB-512 snippets','Top document hits are expanded from the authoritative source of truth.'],
      ['relevancePolicy','invertedIndex','push synonym pack cert|thumbprint|x5t rev 14','The control plane updates search semantics without reauthoring every document.'],
      ['invertedIndex','snapshotRepo','publish nightly postings snapshot S-20260921','Each shard emits restore-grade snapshots to the repository on a daily cadence.'],
      ['rebuildWorker','invertedIndex','restore support-east shard from snapshot S-20260921','If a shard is lost or corrupted, the rebuild worker rehydrates it from the latest snapshot.']
    ]
  },
  'streaming-real-time-processing::Tumbling windows':{
    scenario:'A retail ads team computes one-minute gross merchandise value per campaign from clickstream events with minute-closed outputs and replayable checkpoints.',
    components:[
      ['webSdk','Web and App SDKs','produce impression and conversion events for live campaigns','producer',8,22],
      ['clickTopic','Campaign Click Topic','authoritative event source for the revenue job','stream',28,22],
      ['revenueJob','Campaign Revenue Job','owns event-time revenue aggregation for the ads team','worker',28,62],
      ['tumblingWindow','One-Minute Tumbling Window','groups events into non-overlapping minute buckets per campaign','mechanism',56,22],
      ['jobControl','Streaming Job Control Plane','publishes deployment epochs and replay commands','control',56,78],
      ['checkpointBucket','Revenue Checkpoint Bucket','stores operator snapshots used for restart and replay','storage',82,78],
      ['warehouse','Ads Analytics Warehouse','authoritative sink for closed minute revenue rows','sink',82,22],
      ['lateTopic','Late Revenue Correction Topic','captures events that arrive after a minute has closed','sink',82,50]
    ],
    flows:[
      ['webSdk','clickTopic','publish click clk-991 for campaign c44','Live campaign traffic emits click and conversion events into the source topic.'],
      ['jobControl','revenueJob','apply deployment epoch 73 and checkpoint cadence','The control plane sets the current build and restart contract for the operator.'],
      ['clickTopic','revenueJob','deliver campaign events from partition 12','The revenue job consumes the authoritative clickstream in partition order.'],
      ['revenueJob','tumblingWindow','aggregate campaign c44 for minute 14:03','Events are assigned into the current non-overlapping minute bucket.'],
      ['revenueJob','checkpointBucket','persist operator snapshot cp-14-03-30','Checkpointing keeps the in-flight aggregate recoverable during rolling updates.'],
      ['tumblingWindow','warehouse','emit closed revenue row c44@14:03','Once the bucket closes, a durable minute-level revenue row is written to analytics storage.'],
      ['jobControl','revenueJob','restart from checkpoint cp-14-03-30 after pod drain','A controlled restart reuses the latest checkpoint instead of recomputing from the beginning.'],
      ['revenueJob','lateTopic','route post-close c44 minute-14:03 events to correction stream','Events that arrive after closure are preserved for a later correction workflow.']
    ]
  },
  'streaming-real-time-processing::Sliding windows':{
    scenario:'A card network calculates five-minute rolling spend and decline rates per card to feed fraud models without waiting for fixed-window boundaries.',
    components:[
      ['posTerminals','POS Terminals','produce authorizations, reversals, and declines from merchants','producer',8,22],
      ['swipeTopic','Card Swipe Topic','authoritative source of payment events for fraud features','stream',28,22],
      ['featureJob','Fraud Feature Job','owns real-time feature generation for the fraud platform','worker',28,62],
      ['slidingWindow','Five-Minute Sliding Window','maintains rolling spend and decline features per card','mechanism',56,22],
      ['modelControl','Model Control Plane','publishes feature policies and replay commands','control',56,78],
      ['featureStore','Fraud Feature Store','authoritative sink for online model features','sink',82,22],
      ['checkpointStore','Feature Checkpoint Store','stores snapshots used during rollout and failover','storage',82,78],
      ['reviewQueue','Fraud Review Queue','captures corrections and manual-review triggers','sink',82,50]
    ],
    flows:[
      ['posTerminals','swipeTopic','publish auth event AU-771 for card 4312','Merchants stream a new card authorization into the fraud feature pipeline.'],
      ['modelControl','featureJob','push 5m rolling feature policy rev 22','The control plane distributes the current feature contract before processing continues.'],
      ['swipeTopic','featureJob','deliver card 4312 events from partition 88','The operator consumes the authoritative payment event stream in order.'],
      ['featureJob','slidingWindow','update rolling spend and decline rates for card 4312','Each new swipe mutates the trailing five-minute fraud feature state.'],
      ['slidingWindow','featureStore','upsert card_4312 rolling fraud features','The latest rolling features are published to the online model feature store.'],
      ['featureJob','checkpointStore','persist sliding-window snapshot cp-8831','A checkpoint preserves the rolling state across pod restarts and rollouts.'],
      ['featureJob','reviewQueue','emit correction for late reversal RV-551','Late reversals and suspicious spikes are preserved for human and automated review.'],
      ['modelControl','featureJob','replay from checkpoint cp-8831 during model migration','A model rollout can restart the operator from the latest checkpointed feature state.']
    ]
  },
  'streaming-real-time-processing::Session windows':{
    scenario:'A collaborative editor groups bursts of keystrokes into user sessions so product analytics can measure active editing intervals rather than raw event counts.',
    components:[
      ['browserEditors','Browser Editor Clients','produce keystroke, cursor, and save events from shared docs','producer',8,22],
      ['editTopic','Document Edit Topic','authoritative event source for collaboration analytics','stream',28,22],
      ['analyticsJob','Collaboration Analytics Job','owns live activity analytics for the editor product','worker',28,62],
      ['sessionWindow','Editing Session Window','groups activity into user sessions based on inactivity gaps','mechanism',56,22],
      ['activityPolicy','Activity Policy Service','publishes the current inactivity gap per product surface','control',56,78],
      ['checkpointBucket','Session Checkpoint Bucket','stores operator snapshots for restarts and gap replays','storage',82,78],
      ['warehouse','Product Analytics Warehouse','authoritative sink for closed editing sessions','sink',82,22],
      ['replayRunner','Analytics Replay Runner','replays gaps after a worker loss or regional outage','worker',82,50]
    ],
    flows:[
      ['browserEditors','editTopic','publish keystroke EVT-441 for doc-77 user-18','A live collaborative editing burst lands in the shared document event stream.'],
      ['activityPolicy','analyticsJob','set 90s inactivity gap policy rev 11','The analytics job loads the session gap used to separate editing sessions.'],
      ['editTopic','analyticsJob','deliver editor events for document 77 partition','The operator consumes the authoritative edit stream in partition order.'],
      ['analyticsJob','sessionWindow','group user-18 activity for doc-77','Events are assigned to the current session until the inactivity gap expires.'],
      ['analyticsJob','checkpointBucket','persist session-state snapshot cp-doc77-1403','The in-flight session state is checkpointed so restarts do not lose active work.'],
      ['sessionWindow','warehouse','emit closed editing session S-441 duration 12m14s','Closed sessions are written as durable analytics facts for product reporting.'],
      ['replayRunner','analyticsJob','restore editor analytics from checkpoint cp-doc77-1403','After a worker loss, the replay path resumes the operator from the latest saved state.']
    ]
  },
  'streaming-real-time-processing::Watermarks':{
    scenario:'A parcel ETA pipeline uses watermarks from thousands of scanners to know when it can safely close airport and truck-leg delay metrics.',
    components:[
      ['scanDevices','Warehouse and Airport Scanners','produce parcel scans with device event timestamps','producer',8,22],
      ['trackingTopic','Parcel Tracking Topic','authoritative source for the ETA pipeline','stream',28,22],
      ['etaJob','Parcel ETA Job','owns route-delay analytics for the logistics platform','worker',28,62],
      ['watermarkCoordinator','Watermark Coordinator','advances event-time frontier across many lagging sources','mechanism',56,22],
      ['sourceControl','Source Control Plane','publishes idle-source timeout and skew policy','control',56,78],
      ['checkpointStore','ETA Checkpoint Store','stores frontier and operator checkpoints for recovery','storage',82,78],
      ['warehouse','Logistics Delay Warehouse','authoritative sink for closed leg-delay aggregates','sink',82,22],
      ['lateCorrections','Late ETA Correction Topic','captures events that arrive behind the current frontier','sink',82,50]
    ],
    flows:[
      ['scanDevices','trackingTopic','publish scan EVT-9921 with eventTime 14:02:11','Handheld and dock scanners stream package movement events into the pipeline.'],
      ['sourceControl','watermarkCoordinator','set idle-source timeout 45s for handheld scanners','Control plane tells the coordinator how to treat slow and silent sources.'],
      ['trackingTopic','etaJob','deliver route and depot events for SEA-JFK lane','The ETA job consumes the authoritative tracking stream from many depots.'],
      ['etaJob','watermarkCoordinator','report partition progress for route SEA-JFK','The operator periodically reports source progress so the frontier can advance safely.'],
      ['watermarkCoordinator','etaJob','advance event-time frontier to 14:01:30','The job is told which historical time is now complete enough to close.'],
      ['etaJob','warehouse','emit closed leg-delay aggregates through 14:01:30','Only data behind the frontier is materialized as final delay facts.'],
      ['etaJob','checkpointStore','persist frontier checkpoint eta-cp-663','Recovery captures both processing state and the current watermark frontier.'],
      ['etaJob','lateCorrections','route late event EVT-9921 to correction workflow','Events older than the frontier are preserved for correction instead of corrupting final output.']
    ]
  },
  'streaming-real-time-processing::Checkpointing':{
    scenario:'A warehouse reservation job materializes available SKU counts from order, cancel, and receive events and must recover fast after a node or AZ loss.',
    components:[
      ['warehouseApps','Warehouse Apps','produce reserve, cancel, and receive events for each SKU','producer',8,22],
      ['reservationTopic','Inventory Reservation Topic','authoritative stream of inventory changes','stream',28,22],
      ['inventoryJob','Inventory Projection Job','owns materialized availability for the warehouse platform','worker',28,62],
      ['checkpointService','Checkpoint Barrier Service','coordinates durable snapshots of operator state and offsets','mechanism',56,22],
      ['opsControl','Streaming Ops Control','publishes checkpoint interval and restore commands','control',56,78],
      ['projectionDb','Available Inventory Projection DB','authoritative sink for queryable SKU availability','database',82,22],
      ['snapshotBucket','Inventory Snapshot Bucket','stores completed restore points for fast recovery','storage',82,78],
      ['poisonQueue','Inventory Poison Event Queue','captures malformed or unrecoverable events for review','sink',82,50]
    ],
    flows:[
      ['warehouseApps','reservationTopic','publish reserve, cancel, and receive events for sku-884','Warehouse systems emit inventory mutations into the authoritative event stream.'],
      ['opsControl','inventoryJob','deploy build 2026.09.21.4 with 15s checkpoint interval','Operations set the current runtime and checkpoint cadence for the job.'],
      ['reservationTopic','inventoryJob','deliver sku-884 events from partition 17','The projection job consumes the ordered inventory mutation stream.'],
      ['inventoryJob','projectionDb','upsert available_qty for sku-884','Materialized inventory counts are written into the query-serving projection database.'],
      ['inventoryJob','checkpointService','trigger barrier for offsets p17:9921,p18:441','The operator asks the checkpoint service to capture a consistent snapshot boundary.'],
      ['checkpointService','snapshotBucket','persist completed snapshot inv-cp-551','A restore-grade snapshot of state and consumed offsets is durably stored.'],
      ['opsControl','checkpointService','restore inv-job from snapshot inv-cp-551 after AZ failure','Recovery commands restart the job from the latest durable restore point.'],
      ['inventoryJob','poisonQueue','send malformed receive event EVT-118 to review','Bad events are isolated into a poison queue instead of blocking the main inventory stream.']
    ]
  }
};
window.SYSTEM_DESIGN_PRODUCTION_CONTEXTS=Object.assign({},window.SYSTEM_DESIGN_PRODUCTION_CONTEXTS||{},contexts);
}());
