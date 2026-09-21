(function () {
  'use strict';

  const contexts = {
    'consensus-coordination::Compare-and-swap': {
      scenario: 'A feature-flag control plane protects one checkout ramp setting in etcd so the release UI and the canary automation cannot silently overwrite each other during a Black Friday rollout.',
      components: [
        ['releaseUi', 'Release manager UI', 'Reads the current ramp revision before an operator changes checkout exposure', 'client', 10, 22],
        ['flagApi', 'Flag admin API', 'Owns checkout flag mutations and validation', 'service', 30, 22],
        ['casGuard', 'Compare-and-swap guard', 'Checks the expected etcd revision before a write is accepted', 'control', 53, 16],
        ['configRow', 'Checkout flag row', 'Authoritative ramp state and revision for the checkout flag', 'database', 76, 22],
        ['edgeFanout', 'Gateway config update stream', 'Carries the accepted flag snapshot to API gateways after the write commits', 'queue', 76, 54],
        ['driftMonitor', 'Rollout drift monitor', 'Shows operators when their write lost a race to automation', 'worker', 36, 72]
      ],
      flows: [
        ['releaseUi', 'flagApi', 'read current ramp revision', 'The operator opens the checkout flag and loads revision 173 before touching the slider.'],
        ['releaseUi', 'flagApi', 'set ramp to 10 percent with expected revision 173', 'The UI submits both the new value and the exact revision it read so the server can reject stale intent.'],
        ['flagApi', 'casGuard', 'compare expected revision against live revision', 'The flag API delegates the conditional write to the CAS guard instead of trusting the UI snapshot.'],
        ['casGuard', 'configRow', 'swap ramp to 10 percent and bump revision to 174', 'Only when the live row still matches revision 173 does etcd atomically replace the value and advance the revision.'],
        ['configRow', 'edgeFanout', 'publish flag snapshot revision 174', 'Every gateway receives the same accepted config version and starts routing the 10 percent canary immediately.'],
        ['driftMonitor', 'releaseUi', 'show stale-write rejection', 'If automation already moved the ramp to revision 174, the monitor surfaces the CAS failure so the operator reloads instead of clobbering the live state.']
      ]
    },
    'consensus-coordination::Fencing tokens': {
      scenario: 'A subscription-renewal platform lets only the current shard owner charge customers by attaching fencing tokens to every billing write, even when a crashed worker comes back late.',
      components: [
        ['planner', 'Renewal workload trigger', 'Starts the 02:00 customer-renewal workload for shard 12', 'client', 10, 18],
        ['issuer', 'Ownership service', 'Issues monotonically increasing shard tokens for each renewal shard', 'control', 34, 18],
        ['workerEast', 'Worker east', 'Processes shard 12 while token 9081 is current', 'worker', 18, 54],
        ['workerWest', 'Worker west', 'Takes over shard 12 after the east worker misses heartbeats', 'worker', 54, 54],
        ['gateway', 'Payment gateway adapter', 'Turns renewal jobs into capture requests for the card processor', 'service', 78, 18],
        ['ledger', 'Billing ledger', 'Authoritative charge-attempt history keyed by shard token', 'database', 82, 54],
        ['quarantine', 'Stale worker quarantine', 'Captures late retries that arrive with an obsolete token', 'queue', 54, 82]
      ],
      flows: [
        ['planner', 'issuer', 'assign shard 12 for the 02:00 renewal run', 'The planner asks for a fresh ownership generation before any worker starts charging customers in that shard.'],
        ['issuer', 'workerEast', 'grant token 9081 for shard 12', 'Worker east becomes the only valid owner and must include token 9081 on every state change.'],
        ['workerEast', 'gateway', 'submit renewal captures with token 9081', 'The active worker sends card captures through the payment adapter while its token is still current.'],
        ['gateway', 'ledger', 'persist charge attempt with token 9081', 'The billing ledger records the attempt only because token 9081 is the highest generation it has seen for shard 12.'],
        ['issuer', 'workerWest', 'grant token 9082 after east lease timeout', 'After a heartbeat gap, the ownership service hands the shard to worker west with a newer token.'],
        ['workerEast', 'ledger', 'late retry with token 9081', 'If the old worker wakes up and retries, the ledger rejects the write because token 9081 is now fenced off by token 9082.'],
        ['ledger', 'quarantine', 'send stale-owner rejection', 'Operations can inspect the rejected retry and confirm that the stale worker never mutated billing state after failover.']
      ]
    },
    'consensus-coordination::Leader election': {
      scenario: 'A SaaS billing system elects one scheduler pod to scan due invoices each midnight so duplicate charge jobs are not enqueued when Kubernetes restarts pods during the run.',
      components: [
        ['trigger', 'Midnight billing trigger', 'Starts the daily invoice scan for all active tenants', 'client', 10, 16],
        ['pods', 'Scheduler pod set', 'Several identical pods are ready to run the billing scan', 'service', 28, 38],
        ['election', 'Election backend', 'Tracks the current scheduler epoch and winner', 'control', 50, 16],
        ['invoiceTable', 'Due-invoice table', 'Authoritative list of invoices that should be charged tonight', 'database', 72, 22],
        ['chargeQueue', 'Charge job queue', 'Carries one charge task per invoice after the winner scans the table', 'queue', 74, 52],
        ['workers', 'Charge workers', 'Call the PSP and settle invoices from the queue', 'worker', 88, 74],
        ['ops', 'Billing ops dashboard', 'Shows which pod is leader and whether failover happened mid-run', 'service', 34, 80]
      ],
      flows: [
        ['trigger', 'pods', 'start daily invoice scan', 'The midnight trigger wakes the scheduler deployment and all pods begin contending to run the batch.'],
        ['pods', 'election', 'request leadership for epoch 441', 'Each pod asks the election backend to become the billing leader for the current run.'],
        ['election', 'pods', 'grant leader epoch 441 to one pod', 'Only one pod receives the winning epoch, so every follower stays idle instead of scanning invoices too.'],
        ['pods', 'invoiceTable', 'scan invoices due before 2026-09-22T00:00Z', 'The elected pod reads the authoritative invoice table and decides which tenants need charging tonight.'],
        ['invoiceTable', 'chargeQueue', 'enqueue charge jobs once', 'Every due invoice is turned into one queue item from the single active scheduler.'],
        ['chargeQueue', 'workers', 'dispatch invoice charges', 'The worker fleet charges cards from the queue without caring which scheduler pod originally won leadership.'],
        ['election', 'ops', 'publish leader change event', 'If the winning pod dies halfway through the run, operations can see the epoch swap before the replacement pod resumes scanning.']
      ]
    },
    'consensus-coordination::Leases': {
      scenario: 'A supplier-catalog sync service grants a short lease per supplier account so only one pod polls a flaky supplier API and writes prices into the retail catalog at a time.',
      components: [
        ['scheduler', 'Supplier sync scheduler', 'Starts refreshes for supplier account 44 every five minutes', 'client', 10, 18],
        ['syncA', 'Sync pod A', 'Polls supplier 44 while it still owns the lease', 'worker', 24, 48],
        ['syncB', 'Sync pod B', 'Waits to take over supplier 44 if pod A stops renewing', 'worker', 24, 78],
        ['leaseTable', 'Lease table', 'Authoritative owner, expiry, and generation for supplier 44', 'database', 50, 20],
        ['supplierApi', 'Supplier API', 'Source of truth for new SKUs and price changes', 'service', 78, 20],
        ['catalogDb', 'Retail catalog DB', 'Authoritative imported supplier rows for the storefront', 'database', 80, 54],
        ['monitor', 'Expiry monitor', 'Expires stale owners and alerts on repeated takeover', 'control', 56, 82]
      ],
      flows: [
        ['scheduler', 'syncA', 'start supplier 44 refresh', 'The scheduler asks pod A to begin the next pull cycle for supplier 44.'],
        ['syncA', 'leaseTable', 'acquire 30 second lease for supplier 44', 'Pod A must first become the recorded owner before it talks to the supplier API.'],
        ['syncA', 'supplierApi', 'pull delta feed while lease generation 118 is valid', 'Only the leased pod fetches the new catalog delta so the supplier is not double-polled.'],
        ['supplierApi', 'catalogDb', 'apply price and inventory changes', 'The imported rows land in the retail catalog as the new authoritative storefront copy for supplier 44.'],
        ['syncA', 'leaseTable', 'renew lease before safety margin', 'During a long sync, pod A keeps extending the lease so no standby pod starts a second import.'],
        ['monitor', 'leaseTable', 'expire owner after missed renewals', 'If pod A stops heartbeating, the monitor marks generation 118 dead once the lease timeout passes.'],
        ['leaseTable', 'syncB', 'grant supplier 44 to standby pod', 'Pod B can safely resume pulling deltas only after the old lease is expired and a new generation is recorded.']
      ]
    },
    'consensus-coordination::Paxos': {
      scenario: 'A managed DNS platform uses a Paxos-backed control plane to choose exactly one signed zone package before authoritative name servers pick up a delegation change.',
      components: [
        ['console', 'DNS rollout console', 'Lets an SRE publish a new signed zone for customer vanity domains', 'client', 10, 22],
        ['zoneApi', 'Zone control API', 'Validates the new zone package and owns rollout state', 'service', 30, 22],
        ['paxos', 'Paxos config cluster', 'Runs the quorum protocol that chooses one committed zone package for each zone serial', 'control', 54, 16],
        ['zoneStore', 'Zone package store', 'Authoritative signed records and SOA serial for the zone', 'database', 78, 22],
        ['nameServers', 'Authoritative name servers', 'Serve the committed zone package to resolvers worldwide', 'service', 80, 54],
        ['rollback', 'Rollback controller', 'Submits the previous signed package if monitoring spots a bad publish', 'worker', 42, 80]
      ],
      flows: [
        ['console', 'zoneApi', 'publish SOA serial 2026-09-21-17', 'The SRE pushes a new signed delegation set for a customer domain through the rollout console.'],
        ['zoneApi', 'paxos', 'propose signed zone package for serial 2026-09-21-17', 'The control API asks the Paxos quorum to pick this exact package as the next committed version.'],
        ['paxos', 'zoneStore', 'commit chosen zone package', 'Only the package that wins the quorum write becomes the authoritative zone blob for that serial.'],
        ['zoneStore', 'nameServers', 'serve next SOA serial and records', 'Name servers poll the package store and start answering with the newly chosen zone after commit.'],
        ['nameServers', 'rollback', 'report mixed resolver failures', 'If monitors detect a broken delegation path, the rollback controller sees it from the live name-server fleet.'],
        ['rollback', 'zoneApi', 'submit previous signed package', 'Rollback goes back through the same Paxos-protected path so the revert is also a single chosen decision.']
      ]
    },
    'consensus-coordination::Quorum consensus': {
      scenario: 'An identity platform enables emergency challenge mode only after a quorum-backed policy store accepts the change, so every regional gateway converges on one login policy during an attack.',
      components: [
        ['desk', 'Abuse desk console', 'Lets the fraud team switch login challenge mode during an active credential-stuffing attack', 'client', 10, 20],
        ['policyApi', 'Risk policy API', 'Owns sign-in policy changes for consumer login', 'service', 30, 20],
        ['quorum', 'Quorum policy store', 'Persists the chosen challenge policy only after quorum acceptance', 'control', 54, 14],
        ['ledger', 'Decision ledger', 'Authoritative history of risk policy versions and reasons', 'database', 76, 20],
        ['gateways', 'Regional auth gateways', 'Evaluate the chosen policy on every sign-in request', 'service', 80, 54],
        ['rollback', 'Rollback controller', 'Drives the emergency-policy rollback once attack traffic returns to baseline', 'worker', 42, 80]
      ],
      flows: [
        ['desk', 'policyApi', 'enable challenge-all mode for consumer login', 'The abuse desk initiates an emergency sign-in policy change while attack traffic is still rising.'],
        ['policyApi', 'quorum', 'write policy version 611 with quorum durability', 'The risk API waits for quorum-backed acceptance instead of treating one local write as authoritative.'],
        ['quorum', 'ledger', 'record chosen policy version 611', 'Once the quorum accepts the change, the decision ledger stores the reason code and exact policy payload.'],
        ['ledger', 'gateways', 'fan out policy version 611', 'Every regional gateway reads the same chosen policy version before challenging new login attempts.'],
        ['gateways', 'desk', 'return challenge hit-rate telemetry', 'Operators can watch whether emergency MFA is suppressing the live attack from the same gateway fleet that enforces it.'],
        ['rollback', 'policyApi', 'clear emergency challenge mode', 'When the attack subsides, rollback uses the same quorum path so the system cannot split into mixed login policies.']
      ]
    },
    'consensus-coordination::Raft': {
      scenario: 'A service-mesh control plane stores route weights in a Raft cluster so every sidecar proxy in a multi-AZ Kubernetes fleet consumes one coherent desired state during canary rollout.',
      components: [
        ['cli', 'Platform CLI', 'Lets traffic engineers change the canary weight for the checkout service', 'client', 10, 18],
        ['meshApi', 'Mesh config API', 'Validates xDS route updates and owns rollout history', 'service', 30, 18],
        ['raft', 'Raft metadata cluster', 'Commits one ordered config log for service-mesh state', 'control', 54, 16],
        ['stateStore', 'Desired-state store', 'Authoritative xDS snapshot revisions for checkout routing', 'database', 78, 18],
        ['sidecars', 'Checkout sidecar proxies', 'Apply the committed route weights on live request paths', 'service', 80, 54],
        ['restore', 'Snapshot restore worker', 'Rebuilds a recovered Raft member from the latest snapshot', 'worker', 48, 80]
      ],
      flows: [
        ['cli', 'meshApi', 'set checkout canary to 5 percent', 'The platform engineer submits a new route weight for the checkout deployment.'],
        ['meshApi', 'raft', 'append route-weight update to config log', 'The mesh API writes the change through the Raft cluster so there is one ordered history for xDS state.'],
        ['raft', 'stateStore', 'commit xDS revision 9812', 'After the config entry is committed, the desired-state store exposes revision 9812 as the latest authoritative snapshot.'],
        ['stateStore', 'sidecars', 'stream revision 9812 over xDS', 'Every checkout sidecar subscribes to the committed revision and updates routing tables in the same order.'],
        ['sidecars', 'meshApi', 'ack applied route revision', 'The control plane can tell which proxies are already using the new canary weight before continuing the rollout.'],
        ['restore', 'raft', 'install snapshot on recovered member', 'If a Raft node is rebuilt in another AZ, the restore worker seeds it from the last snapshot before it starts serving traffic again.']
      ]
    },
    'distributed-systems-fundamentals::Causal ordering': {
      scenario: 'An incident-bridge chat service holds replies until their parent messages are visible so war-room participants never see a response before the message it references.',
      components: [
        ['laptop', 'Bridge participant laptop', 'Sends a reply to the on-call war-room thread during an outage', 'client', 10, 18],
        ['chatApi', 'Bridge chat API', 'Owns room writes and dependency metadata for the incident room', 'service', 30, 18],
        ['roomLog', 'Room event log', 'Authoritative record of room messages, edits, and reactions', 'database', 54, 18],
        ['causalBuffer', 'Causal delivery buffer', 'Waits until every referenced message is already visible in the room', 'control', 56, 50],
        ['fanout', 'Room delivery stream', 'Carries released room events to web and mobile clients after dependency checks', 'queue', 80, 28],
        ['clients', 'War-room clients', 'Render the live incident thread to responders on different devices', 'client', 84, 62],
        ['reconnect', 'Reconnect resync job', 'Replays unresolved room events after a region reconnect', 'worker', 32, 80]
      ],
      flows: [
        ['laptop', 'chatApi', 'reply to message 812 with dependency metadata', 'The responder sends a reply that explicitly references the earlier message about a failing token issuer.'],
        ['chatApi', 'roomLog', 'append message and dependency set', 'The chat API stores both the new payload and the list of messages that must already be visible first.'],
        ['roomLog', 'causalBuffer', 'load current room frontier', 'The delivery buffer reads what the room has already exposed so it can evaluate whether the reply is ready.'],
        ['causalBuffer', 'fanout', 'release reply when parent is visible', 'Only after message 812 is in the visible frontier does the buffer hand the reply to the room delivery stream.'],
        ['fanout', 'clients', 'deliver reply after prerequisite messages', 'Web and mobile responders see the parent message first, then the answer, even if packets arrived out of order.'],
        ['reconnect', 'roomLog', 'replay unresolved room events after WAN recovery', 'When the chat region reconnects, the resync job rechecks held events against the authoritative room log before releasing them.']
      ]
    },
    'distributed-systems-fundamentals::FIFO ordering': {
      scenario: 'A parcel-tracking platform uses FIFO delivery per package so customer status changes like loaded, departed, and delivered never apply out of order when scanners retry events.',
      components: [
        ['scanner', 'Warehouse scanner', 'Emits parcel status updates from dock doors and delivery vans', 'client', 10, 18],
        ['trackingApi', 'Tracking ingest API', 'Owns parcel event validation and package-level sequencing', 'service', 30, 18],
        ['fifoQueue', 'Parcel FIFO queue', 'Keeps one in-order stream per parcel identifier', 'queue', 54, 18],
        ['projector', 'Status projector', 'Turns parcel events into a latest-status view', 'worker', 76, 18],
        ['trackingDb', 'Tracking database', 'Authoritative current status and milestone history for each parcel', 'database', 80, 50],
        ['customerApp', 'Customer app', 'Reads the parcel timeline shown to the shopper', 'client', 82, 78],
        ['replayer', 'Parcel recovery controller', 'Repairs stalled parcel lanes by reinjecting failed events into the correct FIFO stream', 'control', 32, 78]
      ],
      flows: [
        ['scanner', 'trackingApi', 'scan parcel 981 as loaded-on-truck', 'A dock scanner reports that parcel 981 has been loaded just before a van reconnects from a dead network spot.'],
        ['trackingApi', 'fifoQueue', 'enqueue parcel 981 event with sequence 442', 'The ingest API assigns the next package sequence and puts the event into the FIFO lane for parcel 981.'],
        ['fifoQueue', 'projector', 'deliver next parcel event only after 441', 'The queue withholds sequence 442 until the earlier departed-the-sorting-center event is already acknowledged.'],
        ['projector', 'trackingDb', 'apply ordered status transition', 'The projector updates the authoritative parcel record only after the queue releases the next contiguous event.'],
        ['trackingDb', 'customerApp', 'serve parcel timeline query', 'The shopper sees a clean status progression instead of delivered appearing before loaded-on-truck.'],
        ['replayer', 'fifoQueue', 'reinject failed parcel event into the same lane', 'If a consumer crashed mid-update, the replayer returns the event to the correct FIFO stream so later milestones still wait behind it.']
      ]
    },
    'distributed-systems-fundamentals::Hybrid logical clocks': {
      scenario: 'A cloud firewall control plane stamps every policy change with a hybrid logical clock so auditors can page through cross-region updates using one sortable cursor without trusting NTP alone.',
      components: [
        ['portal', 'Network engineer portal', 'Submits firewall rule changes from a regional admin session', 'client', 10, 22],
        ['configApi', 'Regional config API', 'Owns policy writes for one firewall management region', 'service', 30, 22],
        ['hlc', 'HLC timestamp service', 'Produces causally safe timestamps that still track wall-clock time', 'clock', 54, 14],
        ['configStore', 'Firewall config store', 'Authoritative desired state for firewall policies', 'database', 78, 22],
        ['auditLog', 'Cross-region audit log', 'Stores every accepted policy change with its HLC stamp', 'storage', 76, 56],
        ['rollback', 'Rollback worker', 'Resumes change replay after a regional failover using the last seen HLC cursor', 'worker', 44, 80]
      ],
      flows: [
        ['portal', 'configApi', 'add deny rule for ASN 64512', 'An engineer pushes an urgent firewall block from the portal during an active abuse event.'],
        ['configApi', 'hlc', 'request causally ordered timestamp', 'Before the write commits, the config API asks the HLC service for a timestamp that respects any remote updates it has already observed.'],
        ['hlc', 'configStore', 'commit policy row with HLC 2026-09-21T21:03:28Z/7', 'The firewall policy store records the new desired state together with a timestamp that is both sortable and causally safe.'],
        ['configStore', 'auditLog', 'emit HLC-tagged changefeed event', 'The committed policy update flows into the cross-region audit log with the same timestamp as the source-of-truth write.'],
        ['auditLog', 'rollback', 'resume scan from last HLC cursor', 'After failover, the rollback worker can continue replaying from the last HLC it processed without double-applying older policy changes.'],
        ['rollback', 'configApi', 'reseed recovered region in HLC order', 'The recovered region rebuilds its local cache in the same causal order even if its wall clock lags behind another region.']
      ]
    },
    'distributed-systems-fundamentals::Lamport clocks': {
      scenario: 'An ecommerce order timeline service uses Lamport clocks to merge payment, fraud, and warehouse events into one stable customer-facing history even when workers publish from skewed machines.',
      components: [
        ['paymentWorker', 'Payment worker', 'Emits card-authorization events for checkout orders', 'worker', 10, 18],
        ['fraudWorker', 'Fraud scorer', 'Approves or holds the same order independently of payment', 'worker', 10, 50],
        ['timelineApi', 'Order timeline API', 'Owns the activity feed shown for each order', 'service', 32, 32],
        ['lamport', 'Lamport clock service', 'Assigns the next logical sequence number per order aggregate', 'control', 54, 16],
        ['events', 'Order events topic', 'Carries stamped order events to all timeline projectors', 'queue', 56, 50],
        ['timelineStore', 'Timeline store', 'Authoritative ordered history for each order', 'database', 80, 30],
        ['support', 'Support console', 'Reads the reconstructed order timeline during escalations', 'client', 82, 72],
        ['replay', 'Timeline replay projector', 'Rebuilds one order timeline after a projector failover', 'worker', 34, 80]
      ],
      flows: [
        ['paymentWorker', 'timelineApi', 'auth-approved event for order 8472', 'The payment worker reports card approval before the warehouse has published any shipping milestones.'],
        ['fraudWorker', 'timelineApi', 'manual-review cleared event', 'Fraud can independently clear the same order from another machine with a completely different wall clock.'],
        ['timelineApi', 'lamport', 'stamp order event before publish', 'The timeline service increments the logical clock for order 8472 instead of trusting the producer timestamps.'],
        ['lamport', 'events', 'publish event with logical stamp 104', 'Every downstream consumer now sees the same logical position for that order activity.'],
        ['events', 'timelineStore', 'append event in Lamport order', 'The timeline store inserts payment and fraud updates by logical stamp and uses producer ID only to break ties deterministically.'],
        ['timelineStore', 'support', 'serve stable order history', 'When support opens the order, the feed is identical no matter which worker published first in real time.'],
        ['replay', 'events', 'reconsume stamped order partition', 'After a failover, the replay projector reconstructs the same sequence because Lamport stamps survive consumer restarts.']
      ]
    },
    'distributed-systems-fundamentals::Total ordering': {
      scenario: 'A flash-sale inventory system totally orders reservation commands for one SKU so hundreds of checkout pods cannot oversell the last few game consoles.',
      components: [
        ['checkouts', 'Checkout pods', 'Submit reserve commands for SKU 441 from many web servers at once', 'client', 10, 18],
        ['reserveApi', 'Reservation API', 'Owns sellable-inventory decisions for flash-sale SKUs', 'service', 30, 18],
        ['sequencer', 'Total-order sequencer', 'Assigns one position to every reservation and release command', 'control', 52, 14],
        ['ledger', 'SKU ledger', 'Authoritative ordered inventory history for SKU 441', 'database', 76, 18],
        ['allocator', 'Fulfillment allocator', 'Turns accepted ledger entries into pickable stock allocations', 'worker', 80, 52],
        ['replay', 'Disaster-recovery replay worker', 'Rebuilds the SKU ledger by replaying the ordered command stream', 'worker', 40, 80]
      ],
      flows: [
        ['checkouts', 'reserveApi', 'reserve 1 unit of SKU 441', 'Dozens of checkout pods race to reserve the same console while stock is nearly exhausted.'],
        ['reserveApi', 'sequencer', 'submit reservation command for total ordering', 'The reservation service does not mutate stock directly until the command has a global position.'],
        ['sequencer', 'ledger', 'append position 884112', 'The sequencer places the reservation into one ordered stream that becomes the only authoritative history for the SKU.'],
        ['ledger', 'allocator', 'apply ordered reservation and remaining stock', 'The allocator decrements sellable quantity in command order and rejects any reservation beyond zero.'],
        ['allocator', 'checkouts', 'confirm or reject hold', 'Each checkout pod learns whether its hold won only after the ordered ledger has applied the command.'],
        ['replay', 'ledger', 'replay ordered command stream after failover', 'If the inventory ledger is rebuilt in another zone, disaster recovery replays the same ordered commands and reaches the same remaining stock.']
      ]
    },
    'distributed-systems-fundamentals::Vector clocks': {
      scenario: 'A field-service work-order app compares vector clocks from offline tablets and the dispatch web console so concurrent checklist edits are detected before they overwrite each other.',
      components: [
        ['tablet', 'Technician tablet', 'Edits the turbine checklist while disconnected at the wind farm', 'client', 10, 18],
        ['dispatch', 'Dispatch web console', 'Updates the same work order from headquarters', 'client', 10, 56],
        ['syncApi', 'Work-order sync API', 'Owns replication for technician checklists', 'service', 34, 32],
        ['vectorGate', 'Vector-clock comparator', 'Determines whether one checklist version descends from another or is concurrent', 'control', 56, 18],
        ['workStore', 'Work-order store', 'Authoritative replicated checklist document for the repair job', 'database', 80, 24],
        ['mergeWorker', 'Merge worker', 'Attempts automatic field-level merges for concurrent edits', 'worker', 56, 62],
        ['supervisor', 'Supervisor queue', 'Escalates unresolved conflicts to a dispatcher', 'queue', 82, 74]
      ],
      flows: [
        ['tablet', 'syncApi', 'sync checklist with vector [12,4]', 'The field technician comes back online and uploads local checklist changes with the last vector seen on the device.'],
        ['dispatch', 'syncApi', 'save checklist update with vector [12,5]', 'Meanwhile the dispatcher has already changed the same work order from the web console.'],
        ['syncApi', 'vectorGate', 'compare incoming vectors', 'The sync API compares the tablet and web vectors instead of trusting modified timestamps from two disconnected clients.'],
        ['vectorGate', 'workStore', 'accept descendant branch', 'When one vector dominates the other, the API writes the newer branch directly into the authoritative work-order store.'],
        ['vectorGate', 'mergeWorker', 'fork concurrent branches for merge', 'If neither vector dominates, the update is classified as concurrent and handed to merge logic instead of being blindly applied.'],
        ['mergeWorker', 'workStore', 'store merged checklist revision', 'Automatic merge writes a new checklist version only after both branches are reconciled into one result.'],
        ['workStore', 'supervisor', 'escalate unresolved conflict', 'If merge is ambiguous, the supervisor queue gets the two competing branches so a dispatcher can pick the final checklist.']
      ]
    },
    'partitioning-sharding::Consistent hashing': {
      scenario: 'A CDN point of presence uses consistent hashing to place hot objects on cache nodes so scaling the cluster only moves the URL ranges near the new node.',
      components: [
        ['browser', 'Viewer browser', 'Requests a frequently accessed hero image from the nearest POP', 'client', 10, 30],
        ['router', 'POP cache router', 'Owns cache-node selection for this edge location', 'gateway', 28, 30],
        ['ring', 'Consistent-hash ring', 'Maps object keys to cache-node tokens', 'index', 50, 14],
        ['cache12', 'Cache node 12', 'Serves the current owner range for hero-image URLs', 'cache', 74, 16],
        ['cache18', 'Cache node 18', 'Receives the adjacent range when the POP scales out', 'cache', 80, 52],
        ['origin', 'Origin image store', 'Authoritative source of object bytes and cache headers', 'storage', 78, 82],
        ['cluster', 'Cluster manager', 'Adds and removes cache-node tokens during maintenance', 'control', 34, 80]
      ],
      flows: [
        ['browser', 'router', 'GET /images/hero.jpg', 'A viewer request lands on the POP router that must choose one cache owner for the object key.'],
        ['router', 'ring', 'hash URL against current ring', 'The router resolves the object key against the current token map instead of using a modulo that would reshuffle everything on scale-out.'],
        ['ring', 'cache12', 'select clockwise token successor', 'The hash ring picks cache node 12 as the first token at or after the object hash.'],
        ['cache12', 'origin', 'fetch object on miss', 'If node 12 does not already have the hero image, it pulls bytes from the authoritative origin store.'],
        ['origin', 'cache12', 'return cacheable bytes and TTL', 'The cache node stores the image locally and can serve later reads without hitting origin again.'],
        ['cluster', 'ring', 'add cache node 18 token', 'During scale-out, the cluster manager inserts a new token for node 18 into the ring.'],
        ['ring', 'cache18', 'move only adjacent URL ranges', 'Only the URLs whose hashes now land between the new token and its predecessor are warmed onto node 18.']
      ]
    },
    'partitioning-sharding::Hash partitioning': {
      scenario: 'A multi-tenant metrics platform hashes tenant IDs to PostgreSQL shards so every write and read for one customer lands on the same database, even under heavy telemetry bursts.',
      components: [
        ['sdk', 'Tenant SDKs', 'Upload metrics batches tagged with tenant 184 from thousands of services', 'client', 10, 18],
        ['ingestApi', 'Metrics ingest API', 'Owns telemetry admission and schema validation', 'service', 28, 18],
        ['router', 'Hash router', 'Maps tenant IDs to shard numbers with the current modulo', 'control', 50, 14],
        ['shard03', 'Shard 03', 'Stores one slice of tenant metrics under the current shard count', 'database', 76, 14],
        ['shard07', 'Shard 07', 'Receives tenants remapped during the next shard-count increase', 'database', 84, 46],
        ['queryApi', 'Dashboard query API', 'Resolves which shard owns a tenant before rendering charts', 'service', 24, 74],
        ['remap', 'Shard-map rollout job', 'Backfills tenants when the shard count changes from 16 to 32', 'worker', 56, 78]
      ],
      flows: [
        ['sdk', 'ingestApi', 'upload metrics batch for tenant 184', 'Application SDKs send metrics with the tenant ID that the storage layer uses as its partition key.'],
        ['ingestApi', 'router', 'hash tenant 184 with modulo 16', 'The ingest API asks the router for the current shard owner instead of embedding shard math in every caller.'],
        ['router', 'shard03', 'write batch to shard 03', 'Under the current modulo, tenant 184 resolves to shard 03 and every metric row for that tenant lands there.'],
        ['queryApi', 'router', 'resolve tenant 184 for chart read', 'The dashboard path uses the same router so reads and writes agree on the authoritative shard.'],
        ['router', 'queryApi', 'return shard 03 ownership', 'The query API can now issue the chart query directly to the same shard that owns the writes.'],
        ['remap', 'router', 'publish shard-count change 16 to 32', 'When the cluster doubles shard count, the rollout job updates the router to a new mapping version.'],
        ['remap', 'shard07', 'backfill tenants whose modulo changed', 'Because plain hash partitioning remaps many tenants on a shard-count change, the rollout job bulk-copies affected tenants before cutover.']
      ]
    },
    'partitioning-sharding::Rendezvous hashing': {
      scenario: 'A mobile chat service uses rendezvous hashing to keep websocket sessions sticky to the same hub while still moving only a few reconnecting users when autoscaling adds capacity.',
      components: [
        ['mobile', 'Mobile chat app', 'Reconnects the same user session whenever the cellular network blips', 'client', 10, 24],
        ['gateway', 'Realtime API gateway', 'Terminates HTTPS and chooses which hub should own the socket', 'gateway', 28, 24],
        ['rendezvous', 'Rendezvous balancer', 'Scores every hub for a given user ID and chooses the top score', 'control', 50, 14],
        ['hubBlue', 'Hub blue', 'Current websocket owner for most user 551 sessions', 'service', 74, 16],
        ['hubGreen', 'Hub green', 'New weighted hub added during scale-out', 'service', 82, 50],
        ['presence', 'Presence store', 'Authoritative session owner and heartbeat record per user', 'database', 76, 82],
        ['autoscaler', 'Realtime autoscaler', 'Adds or removes hub capacity based on active connection counts', 'worker', 30, 82]
      ],
      flows: [
        ['mobile', 'gateway', 'open chat session for user 551', 'A mobile client reconnects after a short network flap and needs to land on the same warm hub if possible.'],
        ['gateway', 'rendezvous', 'score hubs for user 551', 'The gateway asks the balancer to hash the user ID against every current hub and rank the results.'],
        ['rendezvous', 'hubBlue', 'route websocket to highest-score owner', 'Hub blue wins the current score calculation and becomes the socket owner for user 551.'],
        ['hubBlue', 'presence', 'write session owner heartbeat', 'The presence store records which hub owns the live socket so moderation and push paths can find it.'],
        ['autoscaler', 'rendezvous', 'add hub green with weight 2', 'When connection counts spike, autoscaling introduces a new hub without forcing an immediate reshuffle of every open session.'],
        ['mobile', 'gateway', 'reconnect after another carrier drop', 'Only reconnecting clients are re-evaluated against the new hub set after the scale-out event.'],
        ['rendezvous', 'hubGreen', 'move only sessions whose top score changed', 'If hub green now ranks highest for user 551, the reconnect lands there; otherwise the session stays on hub blue.']
      ]
    },
    'partitioning-sharding::Virtual nodes': {
      scenario: 'An object-storage ring uses weighted virtual nodes so large chassis absorb more backup traffic than smaller nodes without forcing giant data moves when hardware changes.',
      components: [
        ['backup', 'Backup agent', 'Uploads hourly database snapshots into the object cluster', 'client', 10, 22],
        ['frontend', 'S3 front end', 'Terminates PUT requests and resolves object placement', 'gateway', 28, 22],
        ['vnodeMap', 'Virtual-node map', 'Expands physical nodes into many weighted token slices', 'index', 50, 14],
        ['largeNode', 'Large storage node', 'Owns many token slices because it has a denser chassis', 'storage', 76, 16],
        ['smallNode', 'Small storage node', 'Owns fewer token slices because it has less disk and NIC capacity', 'storage', 84, 46],
        ['metadata', 'Placement metadata DB', 'Authoritative vnode map and replication policy version', 'database', 78, 80],
        ['rebalance', 'Range rebalance controller', 'Controls token-slice movement and cutover during maintenance', 'control', 40, 82]
      ],
      flows: [
        ['backup', 'frontend', 'PUT snapshot/2026-09-21/full.tar', 'A backup agent writes a large snapshot object into the storage cluster.'],
        ['frontend', 'vnodeMap', 'hash object key to weighted token', 'The front end resolves the object key against the virtual-node map instead of assigning one token per physical node.'],
        ['vnodeMap', 'largeNode', 'store primary copy on vnode owner', 'Because the large chassis owns more token slices, it is more likely to receive the primary for this object.'],
        ['vnodeMap', 'smallNode', 'place replica on different vnode range', 'Replication still chooses a different virtual range so one hardware fault does not wipe both copies.'],
        ['metadata', 'vnodeMap', 'publish weighted token map version 92', 'Placement changes come from the metadata DB so every front end uses the same vnode weighting.'],
        ['rebalance', 'largeNode', 'drain only token slices affected by new hardware', 'When a new storage server joins, the rebalance worker copies just the vnode ranges whose ownership actually changed.'],
        ['vnodeMap', 'frontend', 'skip failed small node and remap its slices', 'If the small node dies, the front end remaps only that nodes virtual ranges instead of rebuilding the whole ring.']
      ]
    },
    'replication::CRDTs': {
      scenario: 'A live sports watch-party service stores room reactions in a CRDT so viewers in different regions can keep tapping emoji during a regional partition and still converge on one final count.',
      components: [
        ['viewers', 'Viewer phones', 'Tap heart and fire reactions during a live playoff stream', 'client', 10, 22],
        ['gatewayEast', 'East websocket gateway', 'Accepts reactions from viewers connected to the east region', 'service', 28, 18],
        ['gatewayWest', 'West websocket gateway', 'Accepts reactions from viewers connected to the west region', 'service', 28, 54],
        ['crdtState', 'CRDT room state', 'Merges reaction adds and removals without a single synchronous writer', 'control', 54, 18],
        ['sessionStore', 'Room state store', 'Authoritative persisted watch-party state snapshot', 'database', 78, 22],
        ['fanout', 'Reaction fanout stream', 'Broadcasts converged room totals back to viewers', 'queue', 80, 56],
        ['moderator', 'Moderator console', 'Removes abusive reactions and blocked users from the room state', 'client', 50, 82]
      ],
      flows: [
        ['viewers', 'gatewayEast', 'tap fire emoji in room finals-2026', 'Viewers in the east region keep sending reactions every few seconds during the game.'],
        ['gatewayEast', 'crdtState', 'apply east-region reaction update', 'The east gateway records the local reaction into the CRDT state without coordinating with the west region first.'],
        ['gatewayWest', 'crdtState', 'merge delayed west-region updates', 'If the west region reconnects after a partition, its queued reactions still merge into the same room state.'],
        ['moderator', 'crdtState', 'remove blocked-user reactions', 'Moderation actions become CRDT updates too, so deletes converge with late adds instead of fighting them.'],
        ['crdtState', 'sessionStore', 'persist converged room snapshot', 'The service periodically writes the merged room state as the durable view that restart recovery will read.'],
        ['sessionStore', 'fanout', 'publish latest reaction totals', 'The fanout stream picks up the converged totals from the persisted room state.'],
        ['fanout', 'viewers', 'render same counts after reconnect', 'After any reconnect, every phone sees the same final reaction counts even if local updates were accepted in different regions.']
      ]
    },
    'replication::Version vectors': {
      scenario: 'A factory-device twin service replicates configuration between robot controllers on the shop floor and a cloud operations portal, using version vectors to detect concurrent edits before rollout.',
      components: [
        ['robot', 'Robot controller', 'Changes conveyor speed limits from the factory edge network', 'client', 10, 18],
        ['portal', 'Cloud ops portal', 'Lets operators edit the same device twin from headquarters', 'client', 10, 56],
        ['syncApi', 'Twin sync API', 'Owns replication for device-twin documents', 'service', 34, 30],
        ['vvTracker', 'Version-vector tracker', 'Compares cloud and edge revisions for each twin document', 'control', 56, 16],
        ['twinStore', 'Twin store', 'Authoritative replicated device-twin document', 'database', 80, 20],
        ['conflict', 'Conflict review queue', 'Holds concurrent twin branches that require operator judgment', 'queue', 78, 56],
        ['pusher', 'Factory config pusher', 'Sends the resolved twin back to edge controllers after merge', 'worker', 48, 82]
      ],
      flows: [
        ['robot', 'syncApi', 'upload speed-limit 0.8 with vector [9,3]', 'The factory controller syncs a local twin edit after working offline during a line-network outage.'],
        ['portal', 'syncApi', 'set speed-limit 0.7 with vector [8,4]', 'An operator has already changed the same speed limit from the cloud portal while the controller was disconnected.'],
        ['syncApi', 'vvTracker', 'compare edge and cloud version vectors', 'The sync API uses version vectors to determine whether one side descends from the other or both changed independently.'],
        ['vvTracker', 'twinStore', 'accept descendant branch', 'If one branch clearly supersedes the other, the authoritative twin store is updated directly.'],
        ['vvTracker', 'conflict', 'queue concurrent twin branches', 'When neither vector dominates, the system preserves both edits and routes the twin into conflict review instead of guessing.'],
        ['conflict', 'twinStore', 'approve merged twin revision', 'An operator resolves the concurrent edits and writes one merged twin back to the authoritative store.'],
        ['twinStore', 'pusher', 'push resolved twin to the factory edge', 'The final merged configuration is sent back to controllers so the cloud and factory floor converge on the same twin state.']
      ]
    },
    'database-distributed-system-concepts::Consistent hashing': {
      scenario: 'A managed document database uses consistent hashing to place tenant collections onto storage shards so the front-door router can absorb new capacity with limited tenant movement during a holiday traffic spike.',
      components: [
        ['ordersApi', 'Orders API', 'Issues tenant-scoped reads and writes for the retail checkout document store', 'service', 10, 24],
        ['dbGateway', 'Database gateway', 'Owns request routing and retry policy for the managed document database', 'gateway', 28, 24],
        ['placement', 'Consistent-hash placement', 'Black-box key placement that maps tenant partitions onto the current token ring', 'control', 50, 14],
        ['routingMeta', 'Routing metadata store', 'Authoritative token map, shard health, and cutover epoch for the cluster', 'database', 74, 14],
        ['shardA', 'Shard A', 'Serves the current primary range for several checkout tenants', 'database', 76, 44],
        ['shardB', 'Shard B', 'Receives ranges that move during scale-out or maintenance cutover', 'database', 86, 70],
        ['rebalance', 'Rebalance orchestrator', 'Copies moved ranges and flips the active routing epoch during shard expansion', 'worker', 42, 82]
      ],
      flows: [
        ['ordersApi', 'dbGateway', 'write cart document for tenant northwind', 'The checkout service sends a tenant-scoped cart write through the database boundary instead of targeting a shard directly.'],
        ['dbGateway', 'routingMeta', 'load active token map epoch 314', 'Before routing, the gateway reads the authoritative membership view so every request uses the same ring and cutover state.'],
        ['dbGateway', 'placement', 'resolve northwind partition against token ring', 'The gateway hands the tenant partition key to the consistent-hash placement component and treats it as an internal placement black box.'],
        ['placement', 'shardA', 'route write to current token owner', 'Under routing epoch 314, the northwind partition lands on shard A, which is the current authoritative storage owner.'],
        ['rebalance', 'shardB', 'copy moved ranges for new capacity', 'When shard B is added for holiday scale-out, the rebalance orchestrator bulk-copies only the token ranges whose owners change.'],
        ['rebalance', 'routingMeta', 'publish routing epoch 315 cutover', 'After validation, the orchestrator advances the metadata store to a new epoch so gateways switch to the post-move ownership map together.'],
        ['placement', 'shardB', 'send post-cutover requests to new owner', 'Once gateways pick up epoch 315, only the tenants whose tokens moved start writing to shard B while untouched ranges stay on shard A.']
      ]
    }
  };

  window.SYSTEM_DESIGN_PRODUCTION_CONTEXTS = Object.assign({}, window.SYSTEM_DESIGN_PRODUCTION_CONTEXTS || {}, contexts);
}());
