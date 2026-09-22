(function(){'use strict';
const contexts={
  'consistency-conflict-patterns::Vector clocks':{
    scenario:'Figma design comments sync between us-east-1 and eu-west-1 when editors reconnect after offline work.',
    components:[
      ['editors','Editors','global designers submitting offline thread edits from web and iPad clients','client',8,22],
      ['api','Comment Sync API','service boundary that authenticates file members and terminates sync sessions','service',24,48],
      ['mechanism','Vector Clock Service','control-plane service that applies vector clocks to classify ancestry or concurrency per thread','control',48,48],
      ['store','Comment Event Store','durable authority in DynamoDB global tables for thread mutations and merged versions','database',76,48],
      ['fanout','Thread Fanout','serves merged comment threads back to browsers and mobile clients worldwide','service',90,20],
      ['repair','Conflict Review Worker','repair path that replays concurrent branches needing product-specific resolution','worker',50,82],
      ['obs','Sync SLO Dashboard','observability path for concurrency spikes, replay lag, and repair backlog','observability',88,80]
    ],
    flows:[
      ['editors','api','push offline edits','Mobile editors reconnect and submit buffered comment mutations for one document thread.'],
      ['api','mechanism','classify thread ancestry','The API asks the vector clock service whether the incoming mutation is descendant, ancestor, or concurrent.'],
      ['mechanism','store','append merged mutation','The mechanism records the accepted mutation into the authoritative event store with merged metadata.'],
      ['store','fanout','refresh thread cache','The fanout tier rebuilds the viewer projection from the durable thread history.'],
      ['store','repair','queue disputed branches','Concurrent branches that need product rules or moderator review are scheduled for repair.'],
      ['repair','mechanism','re-evaluate concurrent edits','The repair worker replays disputed edits through the same vector clock service after policy inputs arrive.'],
      ['mechanism','obs','emit causality metrics','Operations dashboards track conflict rate, unresolved branches, and repair latency by region.']
    ]
  },
  'consistency-conflict-patterns::Conflict-free replicated data types':{
    scenario:'WhatsApp reaction counters and read markers merge across phones, tablets, and desktop sessions for the same chat.',
    components:[
      ['users','Chat Clients','global mobile and desktop clients generating reactions and read state changes','client',10,18],
      ['gateway','Chat Sync Gateway','service boundary that authenticates devices and batches delta sync requests','service',24,44],
      ['mechanism','CRDT Merge Service','control-plane service that merges reaction and read-state deltas without coordination','control',49,44],
      ['store','Conversation State Store','durable authority in multi-region ScyllaDB for chat state and delivered deltas','database',78,44],
      ['notify','Push Fanout','delivers merged state to online devices and push queues in every region','service',90,16],
      ['repair','Delta Backfill Worker','repair path that resends missed deltas after device outages or regional failover','worker',54,80],
      ['obs','Realtime Health Board','observability path for replica convergence lag and dropped-device backlog','observability',88,78]
    ],
    flows:[
      ['users','gateway','publish chat delta','A device submits newly observed reactions or read markers after local user interaction.'],
      ['gateway','mechanism','merge replicated state','The gateway routes the delta into the CRDT service for deterministic merge.'],
      ['mechanism','store','persist converged value','The convergence layer writes the merged chat state into the authoritative conversation store.'],
      ['store','notify','fan out merged state','Online devices and push systems receive the converged chat projection from durable state.'],
      ['store','repair','schedule missed replicas','Replica gaps and offline devices are identified for targeted backfill from the source of truth.'],
      ['repair','mechanism','reapply missed deltas','The backfill worker replays missed CRDT deltas through the same merge path before resending them.'],
      ['mechanism','obs','publish convergence telemetry','Telemetry reports merge latency, duplicate delta rate, and backlog per shard.']
    ]
  },
  'consistency-conflict-patterns::Merkle trees':{
    scenario:'Shopify inventory quantities are repaired between North America and Europe after warehouse feeds and replica drift diverge during a sale.',
    components:[
      ['erp','Warehouse Feed','global ERP systems sending SKU quantity changes from multiple fulfillment regions','client',8,26],
      ['api','Inventory Write API','service boundary that validates SKU mutations before they reach the inventory domain','service',24,52],
      ['mechanism','Inventory Digest Service','control-plane service that compares inventory digests and pinpoints divergent replica ranges','control',50,52],
      ['store','Inventory Authority','durable authority in Cassandra for per-SKU available-to-sell counts','database',78,52],
      ['readers','Order Router','uses repaired inventory state to place customer checkouts against healthy stock','service',90,24],
      ['repair','Anti-entropy Orchestrator','repair path that schedules digest scans and range repair jobs between regions','worker',50,84],
      ['obs','Inventory Drift Console','observability path for divergent token ranges, repair duration, and stale checkout risk','observability',88,82]
    ],
    flows:[
      ['erp','api','submit SKU delta','Warehouse systems post stock adjustments as orders, returns, and transfers land globally.'],
      ['api','store','commit authoritative quantity','Validated stock deltas are written into the authoritative inventory keyspace.'],
      ['repair','mechanism','compare replica digests','The orchestrator asks the Merkle tree service to compare digest ranges for selected token slices.'],
      ['mechanism','store','mark divergent ranges','Only mismatched ranges are queued against the authoritative store for repair streaming.'],
      ['store','readers','serve corrected stock','Order routing reads the repaired available quantity before admitting more carts.'],
      ['store','repair','stream missing partitions','The authority emits the rows needed to heal stale regional replicas for each divergent range.'],
      ['mechanism','obs','report drift heatmap','Operators watch divergence hot spots, scan cost, and backlog to protect checkout accuracy.']
    ]
  },
  'time-based-distributed-patterns::Sliding windows':{
    scenario:'GitHub REST API rate limiting enforces a true trailing-minute quota for high-volume OAuth apps at the edge.',
    components:[
      ['apps','OAuth Apps','global integrations driving bursty API traffic from many tenants and regions','client',10,22],
      ['edge','API Edge Gateway','service boundary that terminates auth and decides whether requests enter the core API fleet','service',26,46],
      ['mechanism','Sliding Window Limiter','control-plane service that evaluates the exact trailing minute for each app and route','control',50,46],
      ['store','Quota State Store','durable quota ledger in Redis Enterprise with persistence and cross-AZ replication','database',78,46],
      ['core','REST API Fleet','serves admitted traffic only after quota evaluation completes at the edge','service',92,22],
      ['control','Abuse Policy Controller','control path that changes tenant limits and emergency suppression rules during incidents','control',48,80],
      ['obs','Quota Operations Board','observability path for reject rate, hot tenants, and limiter saturation','observability',88,78]
    ],
    flows:[
      ['apps','edge','issue API burst','Integrations open a burst of authenticated calls that must be evaluated before core service admission.'],
      ['edge','mechanism','check trailing-minute quota','The gateway sends tenant, route, and timestamp data to the sliding window limiter.'],
      ['mechanism','store','record admitted timestamp','The limiter persists the admitted event in the quota ledger so the next decision uses exact history.'],
      ['mechanism','core','forward admitted request','Only requests inside quota cross the service boundary into the REST API fleet.'],
      ['control','mechanism','publish updated budgets','Abuse and SRE controllers push emergency limits and allowlists into the limiter.'],
      ['store','control','surface hot-key pressure','The quota ledger exposes tenant and shard pressure so policy can be tuned before overload.'],
      ['mechanism','obs','emit reject telemetry','Dashboards show quota rejects, limiter latency, and policy churn by region and tenant.']
    ]
  },
  'time-based-distributed-patterns::Tumbling windows':{
    scenario:'Snowflake warehouse metering rolls query usage into hourly finance buckets for invoice generation and anomaly review.',
    components:[
      ['logs','Query Audit Stream','global warehouse execution logs arriving continuously from customer workloads','client',8,18],
      ['metering','Metering Ingest API','service boundary that validates usage events before they enter billing pipelines','service',24,42],
      ['mechanism','Hourly Window Aggregator','control-plane service that closes usage into hourly finance buckets on exact billing boundaries','control',50,42],
      ['store','Usage Lakehouse','durable authority in Delta tables for raw events and finalized hourly buckets','database',78,42],
      ['billing','Invoice Generator','turns closed hourly buckets into downstream billing statements and credits','service',92,18],
      ['control','Backfill Controller','control path that reruns affected hours after schema fixes or delayed source recovery','control',50,78],
      ['obs','Cost Accuracy Dashboard','observability path for bucket completeness, reruns, and invoice drift','observability',88,76]
    ],
    flows:[
      ['logs','metering','ingest usage event','Warehouse clusters stream execution and credit-consumption records into the billing domain.'],
      ['metering','mechanism','assign event to hour','The ingest boundary hands validated usage to the tumbling window service keyed by invoice hour.'],
      ['mechanism','store','seal hourly bucket','At the hour boundary the service writes the finalized bucket into the durable usage lakehouse.'],
      ['store','billing','generate invoice lines','Finance systems read only sealed hourly buckets when building invoices and credits.'],
      ['control','mechanism','rerun affected hour','Backfill control requests recomputation for a specific customer hour after a repair or source delay.'],
      ['store','control','locate missing slices','The authoritative lakehouse highlights holes so only incomplete windows are recomputed.'],
      ['mechanism','obs','publish bucket health','Observability tracks late closures, recomputation cost, and invoice discrepancy risk by account.']
    ]
  },
  'time-based-distributed-patterns::Watermarks':{
    scenario:'Uber Eats delivery telemetry arrives out of order, so payout and SLA analytics wait until stream completeness is believable.',
    components:[
      ['riders','Courier Apps','global rider phones emitting pickup, handoff, and completion events on unreliable mobile links','client',8,24],
      ['ingest','Trip Event Gateway','service boundary that authenticates event producers and normalizes telemetry envelopes','service',24,50],
      ['mechanism','Delivery Watermark Service','control-plane service that estimates event-time completeness across many delivery partitions','control',50,50],
      ['store','Delivery Fact Store','durable authority in Kafka plus Iceberg tables for trip facts and corrected aggregates','database',78,50],
      ['analytics','Payout and SLA Analytics','computes courier pay, ETA adherence, and marketplace dashboards from stable windows','service',92,22],
      ['repair','Late-event Reprocessor','repair path that reopens windows when phones upload delayed events after reconnect','worker',50,84],
      ['obs','Streaming Lag Cockpit','observability path for watermark skew, late data volume, and reopened windows','observability',88,82]
    ],
    flows:[
      ['riders','ingest','upload trip event','Courier devices send event-time telemetry whenever the mobile network allows delivery.'],
      ['ingest','mechanism','advance partition progress','The gateway forwards normalized records so the watermark service can estimate completeness.'],
      ['mechanism','store','commit window-ready data','Only events behind the current completeness frontier are committed as stable aggregates.'],
      ['store','analytics','serve finalized windows','Payout and SLA jobs consume windows that the durable store marks as stable enough to use.'],
      ['store','repair','detect reopened intervals','Late arrivals that land after window closure are queued for targeted recomputation.'],
      ['repair','mechanism','replay delayed facts','The repair worker replays delayed trip events through the same watermark path to produce corrections.'],
      ['mechanism','obs','emit completeness signals','Dashboards monitor watermark skew, out-of-order rate, and corrected payout volume.']
    ]
  },
  'time-based-distributed-patterns::Leases':{
    scenario:'GitHub Actions assigns queued jobs to self-hosted runners with expiring ownership so stale dispatchers cannot double-start work.',
    components:[
      ['queue','Workflow Job Queue','durable queue of workflow jobs waiting for eligible self-hosted runner capacity','queue',10,28],
      ['dispatcher','Runner Assignment API','service boundary that matches jobs to runners and returns dispatch payloads','service',26,54],
      ['mechanism','Runner Lease Coordinator','control-plane service that grants and renews runner assignment intervals','control',50,54],
      ['store','Assignment Ledger','durable authority in PostgreSQL for lease owner, generation, and expiry metadata','database',78,54],
      ['runners','Runner Agents','execute admitted workflow jobs only while their assignment remains valid','service',92,28],
      ['control','Lease Janitor','control path that expires dead owners and requeues stranded workflow jobs','control',50,86],
      ['obs','Dispatch Reliability Board','observability path for expired leases, duplicate starts, and renewal latency','observability',88,84]
    ],
    flows:[
      ['queue','dispatcher','pull ready job','The dispatch boundary pulls the next eligible workflow job from the durable queue before work can start.'],
      ['dispatcher','mechanism','grant job ownership','The boundary requests a lease for one job and one runner before returning the assignment.'],
      ['mechanism','store','persist owner and expiry','The lease service records the owner, generation, and expiry in the authoritative ledger.'],
      ['mechanism','runners','deliver valid assignment','Runner agents start work only after receiving an active lease-backed assignment token.'],
      ['control','mechanism','expire silent owners','The janitor forces expiration when heartbeat or renewal safety margins are missed.'],
      ['store','control','surface orphaned jobs','The authoritative ledger exposes expired job records that must be requeued for execution.'],
      ['mechanism','obs','publish renewal health','Operations teams watch renewal latency, forced expirations, and duplicate-start avoidance.']
    ]
  },
  'advanced-senior-staff-level-concepts::Consistent hashing':{
    scenario:'Fastly edge image caching places object keys on a global cache fleet while minimizing movement during capacity changes.',
    components:[
      ['requests','Image Requests','global browsers requesting product imagery from many edge regions','client',8,20],
      ['edge','Cache Placement API','service boundary that maps content keys onto the current edge membership view','service',24,46],
      ['mechanism','Cache Ring Service','control-plane service that uses consistent hashing to keep object ownership stable during membership churn','control',50,46],
      ['store','Membership Registry','durable authority in etcd for cache node health, weights, and ring epochs','database',78,46],
      ['nodes','Edge Cache Nodes','store and serve the image objects for the owners chosen by the placement function','service',92,20],
      ['control','Rebalance Controller','control path that drains unhealthy nodes and publishes new ring epochs safely','control',50,80],
      ['obs','CDN Placement Board','observability path for key movement, node skew, and miss storms during rebalance','observability',88,78]
    ],
    flows:[
      ['requests','edge','lookup image key','An image request hits the edge placement boundary before any origin fetch or cache lookup.'],
      ['edge','mechanism','compute cache owner','The boundary asks the consistent hashing service for the current owner set for the object key.'],
      ['mechanism','store','read ring epoch','The placement function uses the authoritative membership registry and current ring epoch.'],
      ['mechanism','nodes','route object request','The request is sent to the selected edge owners that should already hold or fetch the image.'],
      ['control','store','publish membership change','The rebalance controller writes safe membership updates and drain markers into the authority.'],
      ['store','mechanism','refresh ownership map','A new epoch invalidates old placement views and updates the placement service.'],
      ['mechanism','obs','report movement budget','Dashboards show how many keys moved, which edges skewed hot, and whether the rebalance stayed within budget.']
    ]
  },
  'advanced-senior-staff-level-concepts::Rendezvous hashing':{
    scenario:'Microsoft Teams notification fanout assigns tenant mailboxes to stateless workers so failover does not reshuffle the whole fleet.',
    components:[
      ['events','Tenant Notifications','global chat and meeting events waiting for push fanout to devices','client',10,24],
      ['dispatcher','Fanout Dispatcher','service boundary that accepts tenant-scoped work and selects a worker owner','service',26,18],
      ['mechanism','Worker Placement Scorer','control-plane service that uses rendezvous hashing to rank workers per tenant and pick the stable owner','control',50,34],
      ['store','Worker Registry','durable authority in Cosmos DB for worker membership, weights, and drain intent','database',78,18],
      ['workers','Fanout Workers','send pushes, webhooks, and retries for the tenants they currently own','service',82,58],
      ['control','Drain Controller','control path that removes workers gracefully before deployment or fault isolation','control',46,82],
      ['obs','Dispatch Telemetry','observability path for reshuffle size, worker imbalance, and tenant failover time','observability',88,82]
    ],
    flows:[
      ['events','dispatcher','submit tenant batch','The dispatcher receives a tenant-scoped batch of notification work from the global event bus.'],
      ['dispatcher','mechanism','score worker candidates','The boundary invokes rendezvous hashing to rank the current worker set for that tenant.'],
      ['mechanism','store','load worker roster','The scoring service uses the authoritative membership and weight view from the worker registry.'],
      ['mechanism','workers','assign stable owner','The top-ranked worker receives ownership of the tenant batch with minimal reshuffle.'],
      ['control','store','mark worker draining','The drain controller writes upcoming maintenance intent before a worker leaves the fleet.'],
      ['store','mechanism','recompute tenant winners','Only tenants whose top-ranked worker changed are remapped after the roster update.'],
      ['mechanism','obs','emit reshuffle stats','Telemetry shows how many tenants moved, how even the load is, and how long failover took.']
    ]
  },
  'advanced-senior-staff-level-concepts::Merkle trees':{
    scenario:'Azure Cosmos DB product catalog replicas use digest comparison to localize divergence before streaming repairs across regions.',
    components:[
      ['catalog','Catalog Mutations','global merchandising systems updating price and availability records','client',8,24],
      ['gateway','Catalog Gateway','service boundary that validates writes and exposes region repair controls','service',24,50],
      ['mechanism','Catalog Digest Service','control-plane service that compares replica digests and narrows anti-entropy work to mismatched ranges','control',50,50],
      ['store','Catalog Authority','durable authority in multi-region Cosmos DB containers for the product catalog','database',78,50],
      ['replicas','Regional Replicas','serve local read traffic and receive targeted repair streams from the authority','service',92,22],
      ['control','Repair Coordinator','control path that schedules range scans, throttles copy work, and retries failures','control',50,84],
      ['obs','Replication Integrity Board','observability path for divergent partitions, scan cost, and customer read risk','observability',88,82]
    ],
    flows:[
      ['catalog','gateway','submit catalog change','Merchandising systems write price or availability changes through the catalog boundary.'],
      ['gateway','store','commit source update','The authoritative multi-region container records the accepted catalog mutation durably.'],
      ['control','mechanism','request range digest scan','The repair coordinator asks the Merkle tree service to compare selected replica ranges.'],
      ['mechanism','replicas','identify mismatched partitions','Only the ranges with digest mismatches are selected for targeted repair.'],
      ['replicas','store','pull authoritative rows','Stale replicas fetch the rows they are missing from the durable catalog authority.'],
      ['store','replicas','stream corrected documents','The authority sends the corrected documents and tombstones for the divergent ranges.'],
      ['mechanism','obs','publish divergence telemetry','Operators monitor mismatch density, repair throughput, and stale-read exposure by region.']
    ]
  },
  'advanced-senior-staff-level-concepts::CRDTs':{
    scenario:'Microsoft Whiteboard merges strokes and sticky-note edits from classrooms with intermittent connectivity across continents.',
    components:[
      ['authors','Whiteboard Clients','global tablets and browsers producing strokes, notes, and cursor annotations offline or online','client',8,18],
      ['gateway','Collaboration Gateway','service boundary that authenticates rooms and batches collaborative deltas','service',24,44],
      ['mechanism','Board Convergence Service','control-plane service that uses CRDT rules to merge whiteboard state without central lockstep coordination','control',50,44],
      ['store','Board State Store','durable authority in Azure Cosmos DB for board state snapshots and durable deltas','database',78,44],
      ['render','Realtime Render Service','pushes merged board state to viewers and presenters around the world','service',92,18],
      ['repair','Session Backfill Worker','repair path that resends missed deltas after reconnect or classroom network outage','worker',52,80],
      ['obs','Collab Reliability Panel','observability path for merge lag, offline backlog, and duplicate-apply suppression','observability',88,78]
    ],
    flows:[
      ['authors','gateway','post board delta','Client devices send batched whiteboard edits whenever connectivity permits.'],
      ['gateway','mechanism','merge collaborative state','The collaboration boundary forwards each board delta to the CRDT engine for convergence.'],
      ['mechanism','store','persist converged snapshot','Merged board state and durable deltas are written to the authoritative board store.'],
      ['store','render','broadcast merged board','The render layer publishes the converged board view to viewers, presenters, and recorders.'],
      ['store','repair','identify missing sessions','The authoritative store flags viewers and editors that missed durable delta ranges.'],
      ['repair','mechanism','replay durable deltas','Repair replays the missing deltas through the same convergence engine before resending them.'],
      ['mechanism','obs','surface convergence health','Dashboards show board merge latency, offline recovery time, and duplicate suppression effectiveness.']
    ]
  },
  'advanced-senior-staff-level-concepts::Vector clocks':{
    scenario:'Dropbox Paper annotation sync needs to explain whether two edits are ordered or truly concurrent before showing reviewers a merge choice.',
    components:[
      ['authors','Annotation Editors','global authors editing comments and highlights from browsers, tablets, and desktop clients','client',8,26],
      ['edge','Annotation Sync Edge','service boundary that accepts document deltas and enforces membership and size policies','service',24,52],
      ['mechanism','Annotation Lineage Service','control-plane service that uses vector clocks to distinguish ordered updates from concurrent branches','control',50,52],
      ['store','Annotation History','durable authority in Spanner for annotation events, versions, and merge outcomes','database',78,52],
      ['review','Merge Presenter','shows the winning annotation state or presents concurrent branches to human reviewers','service',92,26],
      ['repair','Support Merge Worker','support-side worker that replays high-value annotation branches when automatic resolution is not acceptable','worker',50,84],
      ['obs','Lineage Diagnostics','observability path for concurrent branch rate and unresolved merge backlog','observability',88,82]
    ],
    flows:[
      ['authors','edge','submit annotation update','Editors save annotation changes that may have been produced offline or on multiple devices.'],
      ['edge','mechanism','classify version lineage','The sync edge asks the vector clock service whether the update is in-order or concurrent.'],
      ['mechanism','store','record lineage decision','The lineage decision and accepted event are persisted in the authoritative annotation history.'],
      ['store','review','render merged annotation','Review UIs load the current annotation projection or a concurrent merge choice from durable history.'],
      ['store','repair','schedule support replay','Documents with unacceptable automatic outcomes are escalated to a support worker for replay.'],
      ['repair','mechanism','replay candidate branches','Support and policy tools rerun competing branches through the same lineage service with new inputs.'],
      ['mechanism','obs','export branch metrics','Diagnostics report concurrency hotspots, reviewer load, and time to merge acceptance.']
    ]
  },
  'advanced-senior-staff-level-concepts::Hybrid logical clocks':{
    scenario:'A fintech ledger spans Virginia, Frankfurt, and Singapore, and every balance mutation needs globally comparable commit order without trusting pure wall time.',
    components:[
      ['auths','Card Authorization Services','global payment services issuing debit and credit mutations for merchant traffic','client',8,18],
      ['api','Ledger Write API','service boundary that validates idempotency keys and ledger invariants before commit','service',24,42],
      ['mechanism','Commit Timestamp Service','control-plane service that uses hybrid logical clocks to preserve causality while staying close to wall-clock order','control',50,42],
      ['store','Ledger Authority','durable authority in CockroachDB for account journals, balances, and commit timestamps','database',78,42],
      ['readers','Balance Readers','serves account projections and audit exports from stable committed ledger history','service',92,18],
      ['control','Reconciliation Controller','control path that quarantines skewed regions and replays suspect ranges for audit','control',50,78],
      ['obs','Audit Ordering Console','observability path for clock skew, commit inversion alerts, and replay outcomes','observability',88,76]
    ],
    flows:[
      ['auths','api','submit ledger mutation','Payment services submit idempotent journal mutations from multiple regions at once.'],
      ['api','mechanism','request commit timestamp','Before commit the API asks the HLC service for a timestamp that preserves causal ordering.'],
      ['mechanism','store','stamp durable journal entry','The authoritative ledger stores the mutation with its HLC timestamp and consensus metadata.'],
      ['store','readers','serve ordered balance view','Readers materialize balances and exports from the durable journal in commit order.'],
      ['control','mechanism','isolate skewed clock source','Reconciliation can force a region into safer behavior when its physical clock drift grows risky.'],
      ['store','control','scan suspect interval','The durable ledger feeds targeted audit scans for any interval touched by skew or failover.'],
      ['mechanism','obs','publish ordering drift','Dashboards expose clock skew, commit wait inflation, and detected ordering anomalies.']
    ]
  },
  'advanced-senior-staff-level-concepts::Paxos':{
    scenario:'Google Ads campaign budget controls must agree on one rollout value across zones before millions of bids use it.',
    components:[
      ['operators','Budget Operators','global campaign managers changing budget caps and pacing controls','client',8,24],
      ['api','Budget Config API','service boundary that validates config writes and exposes them to the control plane','service',24,50],
      ['mechanism','Budget Consensus Service','control-plane service that uses Paxos rounds to choose one budget config value per rollout slot','control',50,50],
      ['store','Decision Ledger','durable authority in Spanner for chosen config values and rollout epochs','database',78,50],
      ['serving','Bid Serving Fleet','uses only chosen budget values when pacing live auction decisions','service',92,24],
      ['control','Consensus Operations Controller','control-plane service that drains replicas, repairs failed zones, and orchestrates proposer changes','control',50,84],
      ['obs','Consensus SLO Board','observability path for quorum health, proposal retries, and rollout latency','observability',88,82]
    ],
    flows:[
      ['operators','api','propose budget change','Operators submit a new campaign pacing configuration that must be globally agreed before use.'],
      ['api','mechanism','start decision round','The config boundary asks Paxos to choose a single value for the next rollout slot.'],
      ['mechanism','store','record chosen value','The chosen config and epoch are committed to the authoritative decision ledger.'],
      ['store','serving','publish safe rollout','The bid-serving fleet loads only the config values marked chosen in the durable ledger.'],
      ['control','mechanism','reshape quorum members','Quorum operations drains unhealthy members and changes proposer routing under supervision.'],
      ['store','control','replay unchosen proposals','The decision ledger identifies stuck or superseded proposals for targeted remediation.'],
      ['mechanism','obs','emit quorum diagnostics','Dashboards show retry storms, quorum loss risk, and decision latency during peak traffic.']
    ]
  },
  'advanced-senior-staff-level-concepts::Raft':{
    scenario:'A managed Kubernetes control plane needs a single ordered history of object changes before schedulers and controllers act on them.',
    components:[
      ['clients','Cluster Clients','kubectl users and control-plane components issuing object changes from many regions','client',8,18],
      ['apiserver','Kubernetes API Server','service boundary that authenticates callers and validates object schemas','service',24,44],
      ['mechanism','Cluster Log Service','control-plane service that uses Raft to elect one leader and order control-plane mutations','control',50,44],
      ['store','etcd State Store','durable authority for cluster objects, revisions, and watch history','database',78,44],
      ['watchers','Schedulers and Controllers','consume committed object watches and drive pods, services, and repair loops','service',92,18],
      ['control','Cluster Recovery Controller','control path that replaces failed voters, restores snapshots, and gates failover','control',50,80],
      ['obs','Control Plane Board','observability path for election churn, commit lag, and quorum headroom','observability',88,78]
    ],
    flows:[
      ['clients','apiserver','submit object mutation','Users and controllers send writes that must become part of one ordered control-plane history.'],
      ['apiserver','mechanism','replicate state change','The API server forwards validated mutations into the Raft-backed ordering path.'],
      ['mechanism','store','commit cluster revision','The consensus module advances the committed revision in the authoritative etcd store.'],
      ['store','watchers','fan out committed watch event','Schedulers and controllers react only to committed object revisions from durable state.'],
      ['control','mechanism','replace failed voter','Recovery control manages voter replacement and snapshot seeding after failures.'],
      ['store','control','restore from snapshot','The state store exposes snapshots and log position needed for safe recovery workflows.'],
      ['mechanism','obs','report election health','Operations dashboards track leader changes, append latency, and quorum margin.']
    ]
  },
  'advanced-senior-staff-level-concepts::Fencing tokens':{
    scenario:'Stripe payout exports must prevent a stale job owner from writing a second settlement file after failover.',
    components:[
      ['planner','Payout Batch Planner','global finance workflows creating settlement batches that need exclusive export ownership','client',8,26],
      ['api','Export Control API','service boundary that starts export jobs and hands workers their current ownership token','service',24,52],
      ['mechanism','Ownership Token Service','control-plane service that issues monotonically increasing write generations for fenced ownership','control',50,52],
      ['store','Ownership Ledger','durable authority in PostgreSQL for export owner, generation, and final artifact pointers','database',78,52],
      ['writer','Settlement File Writer','produces bank-bound files only when carrying the newest accepted generation','service',92,26],
      ['control','Failover Controller','control path that promotes a new owner after worker death and retires stale generations','control',50,84],
      ['obs','Duplicate Write Monitor','observability path for stale-write rejections, ownership churn, and export completion','observability',88,82]
    ],
    flows:[
      ['planner','api','start payout export','Finance workflows request exclusive ownership before producing a settlement artifact.'],
      ['api','mechanism','issue new generation','The boundary asks the fencing service for the next valid generation for that export batch.'],
      ['mechanism','store','persist active token','The ownership ledger records the accepted generation as the durable authority for future writes.'],
      ['mechanism','writer','authorize file write','Only workers carrying the latest token may write the settlement file or mark it complete.'],
      ['control','mechanism','promote replacement owner','Failover control requests a newer generation when the active writer stops renewing.'],
      ['store','control','detect stale completions','The authoritative ledger reveals stale completion attempts that must be ignored or rolled back.'],
      ['mechanism','obs','count fenced writes','Operators monitor stale-write rejection rate, takeover latency, and export success.']
    ]
  },
  'advanced-senior-staff-level-concepts::Leases':{
    scenario:'Kafka Connect task ownership is renewed continuously so connector work can move safely when pods die or drain.',
    components:[
      ['changes','Connector Change Stream','connector configs and source offsets arriving from many enterprise integrations','client',8,22],
      ['coordinator','Connect Coordinator API','service boundary that assigns tasks and accepts worker heartbeats','service',24,48],
      ['mechanism','Task Lease Coordinator','control-plane service that grants time-bounded task authority to worker pods','control',50,48],
      ['store','Metadata Authority','durable authority in the internal config topic and metadata store for owner and expiry','database',78,48],
      ['workers','Connect Workers','run connector tasks only while their current lease remains valid','service',92,22],
      ['control','Rebalance Manager','control path that revokes, reassigns, and drains ownership during deploys or failures','control',50,82],
      ['obs','Ownership Dashboard','observability path for lease expiry, rebalance churn, and duplicate task risk','observability',88,80]
    ],
    flows:[
      ['changes','coordinator','request task assignment','Connector tasks need an owner before source reads or sink writes can begin.'],
      ['coordinator','mechanism','grant worker lease','The coordinator requests a time-bounded lease for one task and one worker pod.'],
      ['mechanism','store','write owner and expiry','The authoritative metadata store records the worker owner, generation, and expiry.'],
      ['mechanism','workers','release valid task lease','A worker starts processing only after it receives a current lease-backed assignment.'],
      ['control','mechanism','revoke draining owner','The rebalance manager forces lease turnover before deployment or after a dead worker is detected.'],
      ['store','control','list expired assignments','Expired or conflicting assignments are surfaced from durable metadata for reassignment.'],
      ['mechanism','obs','publish lease churn','Dashboards show renewals, forced revocations, and potential duplicate-run windows.']
    ]
  },
  'advanced-senior-staff-level-concepts::Watermarks':{
    scenario:'TikTok ad impression billing waits for event-time completeness before charging advertisers for mobile and offline conversions.',
    components:[
      ['sdk','Ad SDK Events','global mobile apps and browsers sending impression and conversion events with clock skew and delay','client',8,24],
      ['gateway','Event Ingest Gateway','service boundary that validates advertiser identity and normalizes raw event envelopes','service',24,50],
      ['mechanism','Billing Watermark Service','control-plane service that estimates event-time completeness for billing windows across many shards','control',50,50],
      ['store','Revenue Event Lake','durable authority in Kafka and Delta Lake for raw events plus finalized billing facts','database',78,50],
      ['billing','Billing Aggregator','creates advertiser invoices and pacing signals from windows judged sufficiently complete','service',92,22],
      ['repair','Late Arrival Backfill','repair path that corrects invoices and pacing data when late events reopen a closed window','worker',50,84],
      ['obs','Revenue Quality Board','observability path for watermark skew, invoice corrections, and late-data exposure','observability',88,82]
    ],
    flows:[
      ['sdk','gateway','post impression batch','Ad clients upload impression and conversion events from devices with variable connectivity.'],
      ['gateway','mechanism','advance billing completeness','Normalized events are handed to the watermark service to estimate event-time completeness.'],
      ['mechanism','store','seal stable billing slice','Only windows behind the completeness frontier are committed as stable billing facts.'],
      ['store','billing','invoice sealed window','Billing systems charge advertisers and feed pacing logic from durable sealed windows.'],
      ['store','repair','flag reopened invoice range','Late events that cross a closed boundary are routed into targeted billing correction workflows.'],
      ['repair','mechanism','replay delayed advertiser events','The repair worker reprocesses delayed events through the same watermark path to produce adjustments.'],
      ['mechanism','obs','publish completeness drift','Dashboards track late-data volume, reopened invoice windows, and completeness confidence by region.']
    ]
  },
  'advanced-senior-staff-level-concepts::Distributed snapshots':{
    scenario:'A Flink fraud feature pipeline checkpoints operator state so card-authorization scoring can resume without corrupting model inputs.',
    components:[
      ['events','Authorization Event Stream','global card auth events feeding realtime fraud features and models','client',8,20],
      ['gateway','Feature Pipeline Gateway','service boundary that validates schemas and injects jobs into the streaming topology','service',24,46],
      ['mechanism','Checkpoint Coordinator','control-plane service that captures a consistent cut across pipeline operators and offsets','control',50,46],
      ['store','Checkpoint Store','durable authority in object storage for checkpoint manifests, offsets, and operator state files','database',78,46],
      ['serving','Fraud Feature Service','serves committed features to online scoring only after checkpoint-safe processing','service',92,20],
      ['control','Restore Controller','control path that triggers savepoints, rollback, and region recovery after pipeline faults','control',50,80],
      ['obs','State Recovery Board','observability path for checkpoint duration, restore success, and state growth','observability',88,78]
    ],
    flows:[
      ['events','gateway','ingest feature event','Authorization events cross into the streaming domain through the schema-enforcing pipeline boundary.'],
      ['gateway','mechanism','start checkpoint barrier','The gateway and runtime trigger the snapshot coordinator to inject a new checkpoint across the topology.'],
      ['mechanism','store','persist consistent checkpoint','Operator state, offsets, and manifests are written into the authoritative checkpoint store as one recoverable cut.'],
      ['store','serving','publish committed feature state','The serving layer exposes only feature materializations backed by the durable checkpoint lineage.'],
      ['control','mechanism','request restore point','Recovery control asks the snapshot coordinator to roll back or promote a savepoint after faults.'],
      ['store','control','load recovery manifest','The checkpoint store returns the exact state files and offsets needed for deterministic restore.'],
      ['mechanism','obs','export recovery telemetry','Dashboards report checkpoint lag, state bloat, and restore time against fraud SLOs.']
    ]
  }
};
window.SYSTEM_DESIGN_PRODUCTION_CONTEXTS=Object.assign({},window.SYSTEM_DESIGN_PRODUCTION_CONTEXTS||{},contexts);
}());
