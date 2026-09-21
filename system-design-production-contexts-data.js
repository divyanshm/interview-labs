(function(){'use strict';
const contexts={
  'probabilistic-data-structures::Bloom filter':{
    scenario:'A public package registry edge rejects requests for never-published package versions before touching the catalog primary.',
    components:[
      ['caller','CI clients','npm, pip, and Maven clients requesting package versions','client',8,18],
      ['edge','Package download API','Regional edge that terminates auth and package lookups','gateway',30,18],
      ['mechanism','Package existence bloom','Black-box negative-membership gate loaded with published package coordinates','control',54,18],
      ['store','Catalog primary','Authoritative package metadata and publish state','database',84,18],
      ['builder','Catalog CDC builder','Worker that tails publish events and rebuilds the membership asset','worker',18,74],
      ['snapshot','Filter snapshot bucket','Versioned object store for signed filter snapshots','storage',54,74],
      ['control','Release control plane','Rolls out a new filter generation to every edge','control',86,74]
    ],
    flows:[
      ['caller','edge','request package version','CI clients ask the registry edge for a specific package coordinate before any catalog read happens.'],
      ['edge','mechanism','check known package membership','The edge asks the existence gate whether the coordinate is definitely unknown or worth confirming.'],
      ['edge','store','load metadata on maybe-present hit','Only maybe-present coordinates reach the authoritative catalog primary for metadata and entitlement checks.'],
      ['store','builder','emit publish change feed','The catalog streams publish and unpublish changes so the membership asset follows authoritative state.'],
      ['builder','snapshot','publish signed filter snapshot','A builder compacts the latest catalog view into a versioned snapshot that edges can trust.'],
      ['control','edge','pin active snapshot version','The release control plane tells every edge which snapshot generation is active in production.'],
      ['snapshot','edge','restore membership asset after restart','A restarting edge reloads the latest approved snapshot before it resumes package traffic.']
    ]
  },
  'probabilistic-data-structures::Counting Bloom filter':{
    scenario:'A feature-flag service only admits repeat tenant lookups into Redis and removes departed tenants cleanly when organizations are deleted.',
    components:[
      ['caller','App SDKs','Web and mobile apps asking for tenant-scoped flag bundles','client',8,18],
      ['edge','Flag evaluation API','Stateless service boundary serving flag reads','service',30,18],
      ['mechanism','Tenant cache admission filter','Black-box admission gate that tracks cache-worthy tenant keys and supports removals','control',54,18],
      ['cache','Flag bundle cache','Fast cache of hydrated tenant flag bundles','cache',84,18],
      ['store','Flag config store','Authoritative tenant flag definitions and version history','database',18,74],
      ['updater','Invalidation worker','Processes tenant deletion and flag change events','worker',54,74],
      ['control','Flag control plane','Publishes cache admission thresholds and warmup commands','control',86,74]
    ],
    flows:[
      ['caller','edge','evaluate tenant flags','Applications call the flag service for the current tenant context.'],
      ['edge','mechanism','decide cache admission','The API checks whether this tenant key should be admitted to the shared Redis cache.'],
      ['edge','store','load authoritative flag bundle','A miss, first-seen tenant, or cache-loss recovery path falls back to the authoritative config store.'],
      ['edge','cache','write admitted tenant bundle','When the key qualifies, the API stores the hydrated tenant bundle in Redis for future reads.'],
      ['store','updater','emit tenant lifecycle events','The config store publishes tenant deletions and flag mutations to the invalidation worker.'],
      ['updater','cache','evict stale tenant bundle','Version changes or tenant deletion events clear outdated cached bundles.'],
      ['updater','mechanism','remove departed tenant key','The updater removes deleted tenant keys so the admission gate stops treating them as active.'],
      ['control','edge','push admission policy','Operators adjust admission thresholds and warmup behavior without redeploying the read path.']
    ]
  },
  'probabilistic-data-structures::Cuckoo filter':{
    scenario:'An API gateway enforces a short-lived revoked-token denylist for workforce OAuth tokens without sending every request to the identity backend.',
    components:[
      ['caller','Employee apps','Browser and mobile clients calling internal APIs with bearer tokens','client',8,18],
      ['edge','API gateway','Boundary tier that authenticates tokens before routing','gateway',30,18],
      ['mechanism','Revoked-token filter','Black-box denylist gate for recently revoked token IDs','control',54,18],
      ['store','Revocation ledger','Authoritative table of revoked token IDs and expiry timestamps','database',84,18],
      ['writer','Identity admin service','Writes revocations for disabled accounts and suspected compromise','service',18,74],
      ['updater','Revocation distributor','Streams ledger changes and refreshes edge snapshots','worker',54,74],
      ['snapshot','Denylist snapshot store','Publishes signed revocation snapshots for edge recovery','storage',86,74]
    ],
    flows:[
      ['caller','edge','call protected API','Employee clients present access tokens to the public gateway.'],
      ['edge','mechanism','screen token ID against denylist','The gateway checks the token ID against the revocation gate before routing downstream.'],
      ['edge','store','confirm maybe-revoked token','Only tokens that look revoked are confirmed against the authoritative ledger before the gateway blocks them.'],
      ['writer','store','record token revocation','Identity administrators revoke compromised or retired tokens in the ledger.'],
      ['store','updater','stream revocation rows','New revocations feed the distributor so edge denylist state stays current.'],
      ['updater','snapshot','publish refreshed denylist snapshot','The distributor compacts recent revocations into a signed artifact for many gateways.'],
      ['snapshot','edge','restore denylist after restart','A new or restarted gateway reloads the latest approved denylist before it resumes traffic.']
    ]
  },
  'probabilistic-data-structures::Quotient filter':{
    scenario:'An object-storage ingest edge suppresses duplicate multipart part-commit retries during flaky mobile uploads.',
    components:[
      ['caller','Mobile upload clients','Phones and tablets retrying multipart part-commit calls over unstable networks','client',8,18],
      ['edge','Multipart ingest API','Regional boundary that authenticates and finalizes upload parts','service',30,18],
      ['mechanism','Recent part filter','Black-box recent-commit gate used to short-circuit duplicate part commits','control',54,18],
      ['store','Upload manifest store','Authoritative record of committed upload parts and etags','database',84,18],
      ['updater','Manifest change worker','Consumes committed-part changes to keep the recent-commit asset fresh','worker',18,74],
      ['snapshot','Edge snapshot file','Persisted local image of the recent-commit asset for process restarts','storage',54,74],
      ['control','Ingress control plane','Rotates duplicate-detection windows and audits false-positive risk','control',86,74]
    ],
    flows:[
      ['caller','edge','finalize multipart part','A mobile client asks the ingest API to commit an uploaded part.'],
      ['edge','mechanism','screen recent commit token','The ingest tier checks whether this part-commit token looks like a retry before touching the manifest store.'],
      ['edge','store','read or write authoritative part record','Only maybe-new commits reach the manifest store for idempotent confirmation and persistence.'],
      ['store','updater','emit committed-part change','The authoritative manifest stream drives the asset that recognizes recent duplicate commits.'],
      ['updater','snapshot','persist refreshed recent-commit image','The updater writes a new local image so edges can recover quickly after restarts.'],
      ['snapshot','edge','reload recent-commit asset','A restarted ingest process restores the latest local image before it resumes uploads.'],
      ['control','edge','rotate duplicate window policy','Operators rotate the recent-duplicate window and rollout schedule without changing the upload contract.']
    ]
  },
  'probabilistic-data-structures::HyperLogLog':{
    scenario:'An ad analytics platform estimates daily unique devices reached by each campaign from a high-volume impression stream.',
    components:[
      ['caller','Ad SDKs','Mobile and web clients emitting campaign impression events','client',8,18],
      ['edge','Impression ingest API','Boundary service that validates and batches impression traffic','service',30,18],
      ['mechanism','Campaign reach estimator','Black-box distinct-counter service keyed by campaign and day','control',54,18],
      ['store','Impression event log','Authoritative append-only stream of raw impressions','storage',84,18],
      ['rollup','Analytics rollup worker','Merges regional partials into report-ready metrics','worker',18,74],
      ['warehouse','Campaign analytics warehouse','Authoritative reporting store for published reach numbers','database',54,74],
      ['control','Analytics control plane','Schedules backfills and regional recovery jobs','control',86,74]
    ],
    flows:[
      ['caller','edge','post impression event','The SDK sends a campaign impression with device and placement metadata.'],
      ['edge','mechanism','update daily unique reach','The ingest boundary updates the campaign reach estimator for the current reporting day.'],
      ['edge','store','append raw impression','Every impression is durably written to the authoritative event log.'],
      ['mechanism','rollup','flush partial reach state','Regional estimators periodically emit partial reach state to the rollup layer.'],
      ['rollup','warehouse','publish campaign reach metric','The rollup worker writes the current campaign reach numbers to the analytics warehouse.'],
      ['store','rollup','replay impressions for backfill','If attribution rules change, the rollup worker reprocesses raw impressions from the durable log.'],
      ['control','rollup','start recompute job','Operators trigger recompute and recovery jobs from the analytics control plane.']
    ]
  },
  'probabilistic-data-structures::HyperLogLog++':{
    scenario:'A feature-management platform estimates unique tenant administrators touching low-volume preview flags across regions.',
    components:[
      ['caller','Admin portal','Tenant administrators viewing and editing preview feature flags','client',8,18],
      ['edge','Audit ingest API','Boundary service for feature-management audit events','service',30,18],
      ['mechanism','Preview adoption estimator','Black-box distinct-counter service keyed by preview flag, region, and day','control',54,18],
      ['store','Audit event log','Authoritative stream of raw preview-flag activity','storage',84,18],
      ['rollup','Preview metrics aggregator','Worker that combines regional partials into launch-review metrics','worker',18,74],
      ['warehouse','Feature analytics warehouse','Authoritative store for published preview adoption reports','database',54,74],
      ['control','Launch control plane','Triggers recompute before go or no-go reviews','control',86,74]
    ],
    flows:[
      ['caller','edge','emit preview-flag activity','Administrators generate audit events whenever they view or change a preview flag.'],
      ['edge','mechanism','update unique-admin estimate','The ingest API updates the preview adoption estimator for the relevant flag and region.'],
      ['edge','store','append raw audit record','Every administrative interaction is written to the durable audit log.'],
      ['mechanism','rollup','flush regional adoption state','Regional estimators export partial adoption state to the merge worker.'],
      ['rollup','warehouse','publish preview adoption rollup','The merge worker writes launch-review metrics to the analytics warehouse.'],
      ['store','rollup','replay corrected audit history','If tenant segmentation changes, the merge worker reprocesses raw activity from the durable log.'],
      ['control','rollup','start prelaunch recompute','The launch control plane forces a fresh recompute before a release decision meeting.']
    ]
  },
  'probabilistic-data-structures::Count-Min Sketch':{
    scenario:'A public API edge estimates request frequency for each source tuple so it can apply soft throttling before a burst becomes an incident.',
    components:[
      ['caller','Internet traffic','Mixed customer and abusive API calls hitting the public edge','client',8,18],
      ['edge','Edge WAF','Boundary tier that classifies and gates incoming requests','gateway',30,18],
      ['mechanism','Per-source frequency sketch','Black-box rate estimator keyed by source IP and user agent','control',54,18],
      ['store','Access log stream','Authoritative durable stream of classified edge requests','storage',84,18],
      ['policy','Soft-throttle controller','Applies challenges or throttles when estimates exceed policy','service',18,74],
      ['checkpoint','Sketch checkpoint store','Stores periodic estimator snapshots for fast recovery','storage',54,74],
      ['control','Abuse policy control plane','Publishes thresholds, exemptions, and replay commands','control',86,74]
    ],
    flows:[
      ['caller','edge','send API request','Every external call lands at the public edge before it reaches origin services.'],
      ['edge','mechanism','estimate source frequency','The edge asks the frequency sketch for the current request pressure of this source tuple.'],
      ['edge','store','append classified request','Each classified request is durably written to the access log stream for forensics and replay.'],
      ['mechanism','policy','surface elevated source estimate','The estimator sends hot-source signals to the soft-throttle controller for policy evaluation.'],
      ['policy','edge','install challenge or throttle action','The controller pushes the current response policy back to the edge.'],
      ['mechanism','checkpoint','persist estimator snapshot','The estimator periodically checkpoints its state for fast restart recovery.'],
      ['store','mechanism','replay request history after recovery','After an edge loss, the estimator rebuilds from durable access history until it catches up.'],
      ['control','policy','publish thresholds and exemptions','Operators adjust soft-throttle policy and replay scope from the control plane.']
    ]
  },
  'probabilistic-data-structures::Heavy hitters':{
    scenario:'A CDN identifies the top abusive source IPs in each POP and pushes mitigation before one tenant saturates shared ingress.',
    components:[
      ['caller','Edge traffic','Normal and malicious requests entering a POP','client',8,18],
      ['edge','POP ingress gateway','Boundary service that accepts and routes CDN traffic','gateway',30,18],
      ['mechanism','Hot-source analysis service','Black-box heavy-hitter service keyed by source IP','control',54,18],
      ['store','POP request log','Authoritative request stream for each point of presence','storage',84,18],
      ['controller','Mitigation controller','Translates hot-source signals into mitigation actions','service',18,74],
      ['acl','ACL distribution store','Authoritative block and challenge policies for the POP fleet','database',54,74],
      ['checkpoint','Source analysis checkpoint store','Stores hot-source service state for POP failover recovery','storage',86,74]
    ],
    flows:[
      ['caller','edge','enter POP ingress','Customer and attacker traffic arrives at the same shared POP boundary.'],
      ['edge','mechanism','update hot-source detector','The ingress gateway updates the abusive source detector for each accepted request.'],
      ['edge','store','append POP request record','Every request is durably written to the POP request log for replay and audit.'],
      ['mechanism','controller','emit current top talkers','The detector continuously surfaces the sources dominating current POP traffic.'],
      ['controller','acl','publish mitigation list','The controller writes the current mitigation policy to the authoritative ACL store.'],
      ['acl','edge','distribute mitigation policy','Ingress gateways pull the latest block and challenge policy from the ACL store.'],
      ['mechanism','checkpoint','persist detector state','Detector state is checkpointed so a failed POP can restart without losing all context.'],
      ['store','mechanism','replay POP history after failover','A recovered detector replays recent authoritative traffic until live updates take over.']
    ]
  },
  'probabilistic-data-structures::Top-K sketches':{
    scenario:'A news platform maintains the current top trending articles per market from raw clickstream traffic.',
    components:[
      ['caller','Reader apps','Web and mobile readers generating article views','client',8,18],
      ['edge','Clickstream collector','Boundary service that validates and batches market click events','service',26,18],
      ['mechanism','Trending rank estimator','Black-box Top-K ranking service keyed by market and time window','control',48,18],
      ['store','Click event log','Authoritative durable stream of article view events','storage',84,18],
      ['publisher','Ranking publisher','Applies editorial business rules before publishing trends','worker',16,74],
      ['rankdb','Ranking store','Authoritative store of published market trending lists','database',40,74],
      ['home','Homepage API','Serves the current market feed to readers','service',64,74],
      ['control','Editorial control plane','Manages blacklists, boosts, and recompute requests','control',88,74]
    ],
    flows:[
      ['caller','edge','emit article-view event','Reader apps send article-view events tagged with article, market, and session metadata.'],
      ['edge','mechanism','update market trend state','The collector updates the current ranking estimator for the relevant market window.'],
      ['edge','store','append raw click event','Each click is durably recorded in the authoritative event log.'],
      ['mechanism','publisher','flush top candidate set','The estimator emits the current high-rank candidates to the ranking publisher.'],
      ['publisher','rankdb','publish market trend list','The publisher writes the market-specific trending list that the site will serve.'],
      ['home','rankdb','read published ranking','The homepage API reads the latest published market ranking during page render.'],
      ['store','publisher','rebuild rankings after outage','The publisher replays durable click history whenever a ranking window needs recovery.'],
      ['control','publisher','apply editorial policy change','Editors can blacklist content or trigger a recompute without changing click ingestion.']
    ]
  },
  'probabilistic-data-structures::MinHash':{
    scenario:'A marketplace listing pipeline groups near-duplicate seller descriptions so moderators review one cluster instead of every copy.',
    components:[
      ['caller','Seller portal','Bulk listing uploads and listing edits from merchants','client',8,18],
      ['edge','Listing ingest API','Boundary service that normalizes and validates incoming listings','service',30,18],
      ['mechanism','Duplicate-candidate service','Black-box similarity gate that returns likely duplicate listings','control',54,18],
      ['store','Listing catalog','Authoritative listing text, images, and moderation state','database',84,18],
      ['moderation','Moderation queue','Workflow queue for suspicious duplicate clusters','queue',18,74],
      ['reindex','Similarity index maintainer','Worker that refreshes duplicate-candidate state from accepted catalog records','worker',54,74],
      ['control','Catalog policy control plane','Changes normalization rules and starts full rebuilds','control',86,74]
    ],
    flows:[
      ['caller','edge','submit or edit listing','A merchant submits a new product listing or updates an existing one.'],
      ['edge','store','write normalized listing record','The ingest API stores the authoritative normalized listing in the catalog.'],
      ['edge','mechanism','fetch likely duplicate candidates','Before auto-approval, the ingest API asks for likely duplicate catalog entries.'],
      ['mechanism','moderation','enqueue suspicious duplicate cluster','Listings that look too similar are sent to moderation as one grouped case.'],
      ['store','reindex','emit accepted listing change','Accepted catalog changes feed the worker that keeps similarity state aligned with ground truth.'],
      ['reindex','mechanism','refresh duplicate-candidate state','The rebuild worker updates the similarity gate from authoritative catalog records.'],
      ['control','reindex','start full rebuild after policy change','A change in text normalization policy triggers a full similarity rebuild from the control plane.']
    ]
  },
  'probabilistic-data-structures::SimHash':{
    scenario:'A mail-security pipeline clusters near-identical phishing emails so analysts investigate campaigns instead of isolated messages.',
    components:[
      ['caller','Inbound email workload','External inbound email requests entering the security boundary','client',8,18],
      ['edge','Mail screening service','Boundary service that normalizes and scores incoming messages','service',30,18],
      ['mechanism','Campaign clustering service','Black-box similarity gate that groups near-identical email bodies and headers','control',54,18],
      ['store','Message evidence store','Authoritative store of normalized message evidence and verdicts','database',84,18],
      ['cases','Analyst case queue','Workflow queue for campaign-level investigations','queue',18,74],
      ['reindex','Campaign cluster maintainer','Worker that refreshes campaign-cluster state from stored evidence','worker',54,74],
      ['control','SOC control plane','Changes tokenization policy and orders rebuilds','control',86,74]
    ],
    flows:[
      ['caller','edge','ingest inbound message','The security boundary accepts an inbound email and begins the screening workflow.'],
      ['edge','store','store normalized message evidence','The screening service persists the normalized body, headers, and verdict inputs in the evidence store.'],
      ['edge','mechanism','query near-identical campaign cluster','The service asks for the nearest existing campaign cluster before opening a new case.'],
      ['mechanism','cases','open or merge analyst case','Likely campaign matches are merged into one analyst case instead of many single-message cases.'],
      ['store','reindex','emit evidence update','New verdicts and retained evidence feed the worker that rebuilds campaign clusters.'],
      ['reindex','mechanism','refresh campaign cluster state','The rebuild worker updates cluster state from the authoritative evidence corpus.'],
      ['control','reindex','rebuild after tokenizer change','Security operations can trigger a full corpus rebuild after a tokenizer or parser upgrade.']
    ]
  },
  'probabilistic-data-structures::Locality-sensitive hashing':{
    scenario:'A media moderation service finds visually similar re-uploads before a banned image returns to the platform.',
    components:[
      ['caller','Creator apps','Users uploading photos and short videos','client',8,18],
      ['edge','Media moderation API','Boundary service that authenticates uploads and starts screening','service',30,18],
      ['mechanism','Visual neighbor index','Black-box similarity gate that returns candidate near-duplicate assets','control',54,18],
      ['store','Media catalog','Authoritative media metadata, moderation state, and storage pointers','database',84,18],
      ['review','Review queue','Workflow queue for probable re-uploads','queue',18,74],
      ['embedder','Embedding index maintainer','Worker that regenerates asset-similarity state from the media catalog','worker',54,74],
      ['control','Safety control plane','Rolls out embedding-model upgrades and backfills','control',86,74]
    ],
    flows:[
      ['caller','edge','upload media asset','A creator submits a new image or video through the moderation boundary.'],
      ['edge','store','persist asset record','The moderation API writes the authoritative asset record and storage pointer to the media catalog.'],
      ['edge','mechanism','retrieve visually similar candidates','Before publish, the API asks for existing assets that look similar to the new upload.'],
      ['mechanism','review','enqueue probable re-upload','Potential re-uploads are sent to human review instead of going directly live.'],
      ['store','embedder','emit accepted asset change','Moderated catalog changes drive the worker that keeps the similarity state current.'],
      ['embedder','mechanism','refresh visual neighbor state','The rebuild worker updates candidate retrieval from authoritative catalog data.'],
      ['control','embedder','backfill after model upgrade','A new embedding model triggers a controlled reindex from the safety control plane.']
    ]
  },
  'probabilistic-data-structures::Reservoir sampling':{
    scenario:'A payment platform keeps a representative sample of checkout traces per merchant so on-call engineers can inspect real requests without storing every trace hot.',
    components:[
      ['caller','Checkout trace workload','High-volume trace requests emitted by payment services for every checkout','client',8,18],
      ['edge','Telemetry collector','Boundary service that receives spans and merchant metadata','service',30,18],
      ['mechanism','Representative trace sampler','Black-box fixed-budget sampler keyed by merchant and environment','control',54,18],
      ['store','Trace lake','Authoritative durable store of full raw traces','storage',84,18],
      ['viewer','Debug trace workspace','Investigation surface that shows the current representative sample','service',18,74],
      ['checkpoint','Sampler checkpoint store','Stores sampler state so failovers do not restart the sample from zero','storage',54,74],
      ['control','Observability control plane','Adjusts sample budgets and launches replay jobs','control',86,74]
    ],
    flows:[
      ['caller','edge','emit checkout trace','Checkout services send spans and merchant tags to the telemetry boundary.'],
      ['edge','mechanism','update representative sample','The collector updates the representative sample for the merchant and environment.'],
      ['edge','store','append full raw trace','Every trace is still written to the authoritative trace lake for deep investigation and replay.'],
      ['mechanism','viewer','publish current sample set','On-call tooling reads the current representative sample without scanning the full lake.'],
      ['mechanism','checkpoint','persist sampler state','Sampler state is checkpointed so failovers preserve the current representative set.'],
      ['store','mechanism','replay raw traces after failover','A recovered sampler can rebuild from the authoritative trace lake until live traffic catches up.'],
      ['control','edge','change sample budgets','Operators adjust sample budgets and replay scope from the observability control plane.']
    ]
  },
  'probabilistic-data-structures::Probabilistic counters':{
    scenario:'An IoT fleet dashboard approximates firmware-ack event volume per hardware cohort without maintaining large exact counters in every region.',
    components:[
      ['caller','IoT devices','Fleet members acknowledging firmware downloads and installs','client',8,18],
      ['edge','Telemetry ingest API','Boundary service that validates device telemetry','service',26,18],
      ['mechanism','Cohort volume estimator','Black-box approximate counter keyed by firmware cohort and region','control',48,18],
      ['store','Telemetry event log','Authoritative durable stream of raw device acknowledgements','storage',84,18],
      ['rollup','Fleet metrics worker','Converts estimator output into dashboard-ready cohort metrics','worker',16,74],
      ['metrics','Fleet dashboard store','Authoritative published metrics for ops dashboards and alerts','database',40,74],
      ['checkpoint','Estimator checkpoint store','Stores estimator state for regional recovery','storage',64,74],
      ['control','Fleet operations control plane','Launches backfills and changes cohort definitions','control',88,74]
    ],
    flows:[
      ['caller','edge','emit firmware acknowledgement','Devices report download or install acknowledgements to the telemetry boundary.'],
      ['edge','mechanism','update cohort volume estimate','The ingest API updates the current event-volume estimate for the device cohort.'],
      ['edge','store','append raw acknowledgement','Each acknowledgement is written to the durable telemetry log.'],
      ['mechanism','rollup','flush cohort estimate','The estimator periodically exports current cohort volumes to the rollup worker.'],
      ['rollup','metrics','publish dashboard metric','The rollup worker writes published cohort metrics used by dashboards and alerting.'],
      ['mechanism','checkpoint','persist estimator state','Estimator state is checkpointed so a region can restart without losing all volume history.'],
      ['store','mechanism','rebuild estimate after failover','A recovered region replays authoritative telemetry until live ingestion catches up.'],
      ['control','rollup','start cohort backfill','Operations can redefine a cohort and trigger a recompute from durable telemetry.']
    ]
  },
  'distributed-transactions::Two-phase commit (2PC)':{
    scenario:'A corporate travel booking service atomically reserves a hotel room and captures payment across company-owned databases.',
    components:[
      ['caller','Travel portal','Employees and coordinators submitting hotel bookings','client',8,18],
      ['edge','Booking orchestration API','Boundary service that validates policy and starts the booking workflow','service',30,18],
      ['mechanism','Booking transaction coordinator','Black-box atomic transaction service for the booking workflow','control',54,18],
      ['rooms','Hotel inventory database','Authoritative room hold and allocation records','database',84,18],
      ['pay','Corporate payment ledger','Authoritative authorization and capture records','database',18,74],
      ['journal','Booking transaction journal','Durable workflow record of the global booking outcome','storage',54,74],
      ['recovery','Booking outcome reconciler','Worker that replays unresolved booking outcomes until every participant acknowledges','worker',86,74]
    ],
    flows:[
      ['caller','edge','submit hotel booking','An employee asks the travel portal to reserve a room and pay for it.'],
      ['edge','mechanism','open atomic booking workflow','The booking API starts one atomic workflow for room inventory and payment.'],
      ['mechanism','rooms','stage room hold','The coordinator asks the inventory database to durably stage the room hold.'],
      ['mechanism','pay','stage payment capture','The coordinator asks the payment ledger to durably stage the charge.'],
      ['mechanism','journal','persist commit or abort decision','Once both sides respond, the global outcome is recorded in the durable decision log.'],
      ['journal','recovery','scan unresolved bookings','The recovery worker continuously looks for bookings whose final outcome still needs delivery.'],
      ['recovery','rooms','finish room outcome after crash','If the coordinator disappears mid-flight, the worker redelivers the durable outcome to inventory.'],
      ['recovery','pay','finish payment outcome after crash','The same recovery path completes or unwinds the charge in the payment ledger.']
    ]
  },
  'distributed-transactions::Three-phase commit':{
    scenario:'A prepaid-plan activation service coordinates billing and quota updates inside one tightly controlled datacenter fabric.',
    components:[
      ['caller','Sales portal','Carrier agents activating prepaid plans for subscribers','client',8,18],
      ['edge','Plan activation API','Boundary service that validates the requested plan and account','service',30,18],
      ['mechanism','Activation transaction coordinator','Black-box transaction service for subscriber activation workflows','control',54,18],
      ['billing','Billing account store','Authoritative account balance and tariff state','database',84,18],
      ['quota','Quota entitlement store','Authoritative data, voice, and SMS entitlements','database',18,74],
      ['journal','Activation journal','Durable record of each activation workflow state','storage',54,74],
      ['recovery','Activation outcome reconciler','Agent that finishes or unwinds incomplete activations after timeouts','worker',86,74]
    ],
    flows:[
      ['caller','edge','submit plan activation','A carrier agent asks the platform to activate a prepaid plan for a subscriber.'],
      ['edge','mechanism','start activation workflow','The activation API creates one workflow that spans billing and quota state.'],
      ['mechanism','billing','stage billing update','The coordinator asks billing to stage the new tariff and balance treatment.'],
      ['mechanism','quota','stage entitlement update','The coordinator asks quota storage to stage the matching service entitlements.'],
      ['mechanism','journal','record workflow phase','The current workflow phase is durably recorded so recovery can continue from a known point.'],
      ['journal','recovery','load timed-out activations','The recovery agent scans the durable journal for activations that stopped making progress.'],
      ['recovery','billing','finish or unwind billing change','If the original coordinator is gone, the recovery agent delivers the durable outcome to billing.'],
      ['recovery','quota','finish or unwind quota change','The same recovery path completes or unwinds subscriber entitlements.']
    ]
  },
  'distributed-transactions::MVCC':{
    scenario:'A seller catalog dashboard keeps long reads stable while a bulk import continuously publishes new prices and inventory.',
    components:[
      ['caller','Merchant dashboard','Merchandisers browsing the live catalog and inventory state','client',8,18],
      ['edge','Catalog read API','Boundary service that serves filtered catalog views','service',30,18],
      ['mechanism','Catalog version manager','Black-box transaction manager that gives readers a stable view of catalog rows','control',54,18],
      ['store','Catalog primary database','Authoritative products, prices, inventory, and change history','database',84,18],
      ['writer','Bulk import worker','Publishes new price files and inventory corrections','worker',18,74],
      ['recovery','PITR restore worker','Rebuilds replicas or restores the catalog after storage incidents','worker',54,74],
      ['control','Retention and vacuum controller','Advances cleanup policy for obsolete row versions','control',86,74]
    ],
    flows:[
      ['caller','edge','request catalog view','A merchandiser asks for a filtered catalog or inventory view.'],
      ['edge','mechanism','open stable read view','The API opens one stable read view for the user session before scanning catalog rows.'],
      ['mechanism','store','read visible catalog versions','Only row versions visible to that read view are returned from the authoritative database.'],
      ['writer','mechanism','publish new catalog versions','Bulk imports write new price and inventory versions without blocking readers already in flight.'],
      ['store','recovery','ship backups and log records','The primary database feeds the restore worker with the data needed for point-in-time recovery.'],
      ['recovery','store','restore catalog state after incident','Recovery can reseed a replica or restore the primary to a requested point in time.'],
      ['control','mechanism','advance cleanup horizon','A control path periodically permits old catalog versions to be removed once reads no longer need them.']
    ]
  },
  'distributed-transactions::Snapshot isolation':{
    scenario:'A retail checkout service reads cart, promotion, and stock state from one regional SQL cluster while staging an order attempt.',
    components:[
      ['caller','Storefront app','Customers submitting checkout requests','client',8,18],
      ['edge','Checkout API','Boundary service that assembles cart, promo, and stock state','service',30,18],
      ['mechanism','Order snapshot manager','Black-box transaction manager for one checkout attempt','control',54,18],
      ['store','Commerce SQL cluster','Authoritative carts, promotions, stock holds, and orders','database',84,18],
      ['allocator','Stock allocator','Concurrent worker creating and releasing stock holds for other checkouts','worker',18,74],
      ['journal','Order attempt journal','Durable record of checkout attempts and outcomes','storage',54,74],
      ['recovery','Checkout attempt reconciler','Worker that retries abandoned or conflicted attempts from the durable journal','worker',86,74]
    ],
    flows:[
      ['caller','edge','submit checkout','A customer confirms checkout for the current cart.'],
      ['edge','journal','record checkout attempt','The boundary service creates a durable attempt record before it starts the transaction.'],
      ['edge','mechanism','start checkout transaction','The API opens one checkout transaction tied to the durable attempt record.'],
      ['mechanism','store','read cart, stock, and promo snapshot','The transaction reads a single coherent view of the order-critical tables.'],
      ['allocator','store','write competing stock holds','Other checkout workers concurrently create or release stock holds in the same cluster.'],
      ['mechanism','journal','persist commit or conflict outcome','The final order outcome or conflict is durably written back to the attempt journal.'],
      ['journal','recovery','scan abandoned or conflicted attempts','The retry worker looks for attempts that need replay after client disconnects or write conflicts.'],
      ['recovery','mechanism','retry recorded checkout attempt','Recovery can replay the checkout attempt against a fresh view without losing the original intent.']
    ]
  },
  'distributed-transactions::Serializable transactions':{
    scenario:'A seller payouts service closes each payout run against the live ledger without allowing concurrent dispute updates to create inconsistent settlements.',
    components:[
      ['caller','Payout close workload','Nightly scheduler requests that start seller payout runs','client',8,18],
      ['edge','Payout close API','Boundary service that validates close parameters and shards the work','service',30,18],
      ['mechanism','Payout serialization manager','Black-box transaction manager for payout-close batches','control',54,18],
      ['store','Seller ledger database','Authoritative balances, payout rows, and dispute adjustments','database',84,18],
      ['writer','Dispute adjustment worker','Posts late dispute changes while payout close is running','worker',18,74],
      ['journal','Payout run journal','Durable record of batch ownership, progress, and final outcome','storage',54,74],
      ['recovery','Payout batch reconciler','Worker that resumes or reruns failed payout batches from the durable journal','worker',86,74]
    ],
    flows:[
      ['caller','edge','start payout close','The finance scheduler asks the service to close a daily payout run.'],
      ['edge','journal','create payout run record','The API records the payout batch and ownership metadata before any ledger writes happen.'],
      ['edge','mechanism','open payout batch transaction','The boundary service starts one payout batch transaction tied to the durable run record.'],
      ['mechanism','store','read balances and write payout rows','The transaction reads eligible balances and writes seller payouts into the authoritative ledger.'],
      ['writer','store','post competing dispute adjustments','A separate worker can still post dispute changes that may conflict with the payout batch.'],
      ['mechanism','journal','persist commit or serialization failure','The durable journal records whether the batch committed or must be retried.'],
      ['journal','recovery','load failed payout batches','Recovery scans the payout journal for batches that need continuation after errors or crashes.'],
      ['recovery','mechanism','rerun payout batch deterministically','The recovery worker reruns an aborted batch from the durable journal until it commits cleanly.']
    ]
  }
};
window.SYSTEM_DESIGN_PRODUCTION_CONTEXTS=Object.assign({},window.SYSTEM_DESIGN_PRODUCTION_CONTEXTS||{},contexts);
}());
