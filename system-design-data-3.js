window.SYSTEM_DESIGN_CHAPTERS = [...(window.SYSTEM_DESIGN_CHAPTERS || []),
  {
    id:'api-service-architecture',
    title:'API / Service Architecture',
    intro:'Route and evolve service traffic through explicit boundaries, policies, and rollout controls.',
    groups:[
      {title:'Edge and routing',concepts:[
        {name:'API Gateway',summary:'A managed edge entry point centralizes routing, authentication, quotas, and protocol adaptation.',tradeoff:'It can become a bottleneck or policy monolith.'},
        {name:'Reverse proxy',summary:'A reverse proxy terminates client connections and forwards requests to internal services.',tradeoff:'It adds a hop and shared failure point.'},
        {name:'Load balancing',summary:'Load balancing spreads work across healthy instances to improve utilization and availability.',tradeoff:'Poor policies amplify hotspots and retries.'},
        {name:'L4 vs L7 load balancing',summary:'L4 routes using transport metadata; L7 understands application protocols and request attributes.',tradeoff:'L7 enables richer policy but costs more processing.'},
        {name:'Service discovery',summary:'Service discovery maps logical service identities to current healthy endpoints.',tradeoff:'Stale registry data can misroute traffic.'},
        {name:'Client-side load balancing',summary:'The client selects an endpoint from discovery data and applies local balancing policy.',tradeoff:'Every client must implement updates and resilience correctly.'},
        {name:'Server-side load balancing',summary:'A proxy or load balancer selects backends on behalf of clients.',tradeoff:'The shared tier adds latency and capacity risk.'},
        {name:'Request routing',summary:'Routing selects a destination using path, identity, version, locality, or health.',tradeoff:'Complex rules become difficult to reason about.'}
      ]},
      {title:'Service networking',concepts:[
        {name:'Service mesh',summary:'A service mesh standardizes transport security, telemetry, and traffic policy between services.',tradeoff:'It adds infrastructure and debugging complexity.'},
        {name:'Sidecars',summary:'Sidecars colocate networking or policy capabilities beside each workload instance.',tradeoff:'Per-instance proxies consume resources and obscure call paths.'},
        {name:'North-south traffic',summary:'North-south traffic crosses the system boundary between external clients and internal services.',tradeoff:'Edge controls must scale without hiding internal failures.'},
        {name:'East-west traffic',summary:'East-west traffic flows among internal services and often dominates distributed call volume.',tradeoff:'Fan-out increases latency and failure amplification.'},
        {name:'Control plane vs data plane',summary:'The control plane distributes desired state while the data plane serves high-volume requests.',tradeoff:'The data plane must remain safe with stale control state.'},
        {name:'Configuration distribution',summary:'Configuration distribution publishes versioned settings with validation, staged rollout, and rollback.',tradeoff:'Fast propagation increases blast radius.'}
      ]},
      {title:'Progressive delivery',concepts:[
        {name:'Traffic shadowing',summary:'Traffic shadowing mirrors requests to a non-authoritative path for realistic validation.',tradeoff:'Shadow paths must suppress side effects and protect data.'},
        {name:'Canary deployments',summary:'Canary deployments expose a new version to a small cohort before wider rollout.',tradeoff:'A poor cohort can miss systemic failures.'},
        {name:'Blue-green deployments',summary:'Blue-green deployments switch traffic between two complete environments.',tradeoff:'They require duplicate capacity and data compatibility.'},
        {name:'A/B routing',summary:'A/B routing assigns cohorts to variants to compare product or system outcomes.',tradeoff:'Cross-cohort effects can bias results.'},
        {name:'Feature flags',summary:'Feature flags separate code deployment from behavior exposure and support targeted rollback.',tradeoff:'Long-lived flags create combinatorial states.'}
      ]}
    ]
  },
  {
    id:'realtime-connections',
    title:'Realtime Connections',
    intro:'Choose and operate client connection lifecycles for timely one-way or bidirectional updates.',
    groups:[
      {title:'Connection models',concepts:[
        {name:'Long polling',summary:'Long polling holds an HTTP request until an event or timeout, then the client reconnects immediately.',tradeoff:'Repeated requests and held connections consume gateway and server capacity.'},
        {name:'Server-Sent Events (SSE)',summary:'SSE keeps one HTTP response open for a server-to-client event stream with built-in reconnect support.',tradeoff:'It is one-way and intermediaries must support long-lived streaming responses.'},
        {name:'WebSockets',summary:'WebSockets upgrade HTTP to a persistent full-duplex framed connection for low-latency bidirectional messaging.',tradeoff:'Connection ownership, fan-out, backpressure, and recovery complicate horizontal scaling.'}
      ]}
    ]
  },
  {
    id:'distributed-identity-security',
    title:'Distributed Identity & Security',
    intro:'Carry verifiable identity and least authority across every service and trust boundary.',
    groups:[
      {title:'Protocols and tokens',concepts:[
        {name:'OAuth 2.0',summary:'OAuth 2.0 delegates scoped API access through resource-targeted access tokens.',tradeoff:'Security depends on flow choice and strict validation.'},
        {name:'OIDC',summary:'OIDC adds authentication and identity claims to OAuth 2.0.',tradeoff:'ID tokens are not general API access tokens.'},
        {name:'JWT',summary:'A JWT carries signed claims that a recipient can validate locally.',tradeoff:'Claims remain stale until expiry.'},
        {name:'JWKS',summary:'JWKS publishes public verification keys identified by key IDs.',tradeoff:'Caching and rotation must handle overlap safely.'},
        {name:'Token introspection',summary:'Token introspection asks an authorization service whether an opaque token is active and what it means.',tradeoff:'It adds latency and availability coupling.'},
        {name:'Access-token validation',summary:'A resource validates signature, issuer, audience, lifetime, algorithm, and required claims.',tradeoff:'Validation policy must evolve without accepting unsafe tokens.'},
        {name:'Edge token validation',summary:'The edge rejects invalid tokens early while downstream services still enforce their own authorization.',tradeoff:'Edge-only trust creates bypass risk.'},
        {name:'Token caching',summary:'Token caching reuses valid tokens or validation metadata until a safe refresh boundary.',tradeoff:'Caching delays revocation and claim changes.'},
        {name:'Key rotation',summary:'Key rotation overlaps old and new verification keys to replace cryptographic material without downtime.',tradeoff:'Overlap temporarily broadens accepted keys.'},
        {name:'Credential rotation',summary:'Credential rotation replaces secrets or certificates through staged issuance, activation, and retirement.',tradeoff:'Consumers must tolerate both versions during rollout.'},
        {name:'Revocation',summary:'Revocation invalidates authority before normal expiry through state checks, lists, or short lifetimes.',tradeoff:'Immediate revocation requires coordination.'}
      ]},
      {title:'Workload identity and transport',concepts:[
        {name:'Workload identity',summary:'Workload identity gives each service a short-lived, attestable principal instead of shared secrets.',tradeoff:'Bootstrap trust becomes critical infrastructure.'},
        {name:'Workload identity federation',summary:'Workload identity federation exchanges trusted external assertions for local credentials without stored secrets.',tradeoff:'Issuer and subject mappings require strict governance.'},
        {name:'SPIFFE',summary:'SPIFFE defines portable workload identity names and credential interfaces.',tradeoff:'Adoption still requires a trusted identity plane.'},
        {name:'SPIRE',summary:'SPIRE implements SPIFFE identity issuance using node and workload attestation.',tradeoff:'Its servers and agents become security-critical.'},
        {name:'SVID',summary:'An SVID is a short-lived credential proving a SPIFFE workload identity.',tradeoff:'Frequent renewal must survive issuer outages.'},
        {name:'mTLS',summary:'mTLS encrypts transport and authenticates both peers with certificates.',tradeoff:'It does not replace application authorization.'},
        {name:'PKI',summary:'PKI binds public keys to identities through certificate authorities and trust chains.',tradeoff:'Issuer compromise has a broad blast radius.'},
        {name:'Certificate rotation',summary:'Certificate rotation renews identities with overlap, automation, and expiry monitoring.',tradeoff:'Broken renewal can cause fleet-wide outages.'},
        {name:'Service-to-service authentication',summary:'Service-to-service authentication verifies the calling workload at each hop.',tradeoff:'Identity infrastructure must be highly available.'},
        {name:'Service-to-service authorization',summary:'Service-to-service authorization evaluates whether a workload may perform a specific resource action.',tradeoff:'Fine-grained policy adds latency and management cost.'}
      ]},
      {title:'Authorization policy',concepts:[
        {name:'RBAC',summary:'RBAC assigns permissions to roles and principals to those roles.',tradeoff:'Context-rich systems suffer role explosion.'},
        {name:'ABAC',summary:'ABAC evaluates actor, resource, action, and environment attributes.',tradeoff:'Flexible rules are harder to explain and cache.'},
        {name:'Policy engines',summary:'Policy engines evaluate centralized rules from explicit request context.',tradeoff:'Remote decisions add latency and dependency risk.'},
        {name:'Policy propagation',summary:'Policy propagation distributes versioned authorization state to enforcement points.',tradeoff:'Caches can enforce stale policy.'},
        {name:'Distributed authorization',summary:'Distributed authorization keeps policy decisions consistent across independently deployed services.',tradeoff:'Consistency, latency, and availability compete.'},
        {name:'Zero Trust',summary:'Zero Trust requires explicit identity and authorization for every interaction regardless of network location.',tradeoff:'Continuous checks add operational dependencies.'},
        {name:'Trust boundaries',summary:'Trust boundaries mark where data or identity changes assurance level and must be revalidated.',tradeoff:'More boundaries increase enforcement work.'},
        {name:'Auditability',summary:'Auditability records attributable identities, policy, resources, actions, and outcomes.',tradeoff:'Detailed audit data raises privacy and retention costs.'}
      ]},
      {title:'Delegation and containment',concepts:[
        {name:'Delegated identity',summary:'Delegated identity lets a workload act with narrowly bounded authority derived from another principal.',tradeoff:'Delegation chains complicate consent and audit.'},
        {name:'OBO',summary:'OBO exchanges a user token for a downstream token representing both user and calling service.',tradeoff:'Extra exchanges add latency and issuer dependence.'},
        {name:'Confused deputy',summary:'A confused deputy uses its privilege for an untrusted caller without binding intent and target.',tradeoff:'Prevention requires explicit delegation and resource scoping.'},
        {name:'Credential blast radius',summary:'Credential blast radius is the maximum authority and systems exposed by one compromised credential.',tradeoff:'Narrower credentials increase lifecycle overhead.'}
      ]}
    ]
  },
  {
    id:'observability-distributed-debugging',
    title:'Observability & Distributed Debugging',
    intro:'Correlate bounded telemetry across hops to explain user impact and distributed causality.',
    groups:[
      {title:'Telemetry signals',concepts:[
        {name:'Metrics',summary:'Metrics aggregate numeric behavior over dimensions and time for fast health detection.',tradeoff:'Aggregation hides individual request context.'},
        {name:'Logs',summary:'Logs capture structured discrete events with enough context for investigation.',tradeoff:'High volume increases cost and search noise.'},
        {name:'Distributed tracing',summary:'Distributed tracing links causal work across services as a tree or graph of spans.',tradeoff:'Instrumentation gaps produce incomplete traces.'},
        {name:'OpenTelemetry',summary:'OpenTelemetry standardizes APIs, context, semantic conventions, and export for telemetry.',tradeoff:'Standard collection still requires careful schemas and sampling.'},
        {name:'Correlation IDs',summary:'Correlation IDs connect related events when full parent-child tracing is unavailable.',tradeoff:'One ID cannot represent concurrency or causality.'},
        {name:'Trace IDs',summary:'Trace IDs identify all spans belonging to one distributed operation.',tradeoff:'They must not become unbounded metric labels.'},
        {name:'Span IDs',summary:'Span IDs identify individual units of work and their parent relationships.',tradeoff:'Missing propagation breaks the causal graph.'}
      ]},
      {title:'Sampling and measurement',concepts:[
        {name:'Sampling',summary:'Sampling retains a representative subset of telemetry to control overhead and cost.',tradeoff:'Rare failures may be omitted.'},
        {name:'Tail-based sampling',summary:'Tail-based sampling decides after observing trace outcomes, retaining errors or slow requests preferentially.',tradeoff:'Collectors must buffer and coordinate trace state.'},
        {name:'RED metrics',summary:'RED metrics track request rate, errors, and duration for request-serving systems.',tradeoff:'They reveal symptoms rather than resource causes.'},
        {name:'USE metrics',summary:'USE metrics track utilization, saturation, and errors for constrained resources.',tradeoff:'Healthy resources do not prove user success.'},
        {name:'SLI / SLO / SLA',summary:'SLIs measure behavior, SLOs set internal targets, and SLAs attach external commitments.',tradeoff:'Bad indicators optimize the wrong outcome.'},
        {name:'Error budgets',summary:'Error budgets quantify allowable unreliability and guide release versus reliability investment.',tradeoff:'They require trusted measurement and enforcement.'},
        {name:'Cardinality management',summary:'Cardinality management bounds telemetry dimensions and keeps unique values out of aggregate indexes.',tradeoff:'Less dimensionality limits ad hoc slicing.'}
      ]},
      {title:'Distributed diagnosis',concepts:[
        {name:'Dependency graphs',summary:'Dependency graphs show runtime service and resource relationships for critical-path analysis.',tradeoff:'Observed graphs omit dormant or unsampled paths.'},
        {name:'Distributed profiling',summary:'Distributed profiling connects CPU, allocation, lock, and wall-time samples across request paths.',tradeoff:'Profiling adds overhead and sensitive detail.'},
        {name:'Anomaly detection',summary:'Anomaly detection identifies deviations from learned baselines across seasonality and dimensions.',tradeoff:'Model drift and noise create false alerts.'}
      ]}
    ]
  },
  {
    id:'distributed-system-migration-patterns',
    title:'Distributed System Migration Patterns',
    intro:'Move systems through observable, compatible, and reversible coexistence states.',
    groups:[
      {title:'Coexistence patterns',concepts:[
        {name:'Strangler pattern',summary:'The Strangler pattern incrementally routes capabilities from a legacy system to a replacement.',tradeoff:'The coexistence layer can become permanent debt.'},
        {name:'Dual writes',summary:'Dual writes update old and new stores while recording partial failures for repair.',tradeoff:'Without one transaction, divergence is inevitable.'},
        {name:'Dual reads',summary:'Dual reads compare or combine results from old and new systems during transition.',tradeoff:'They increase latency and load.'},
        {name:'Shadow reads',summary:'Shadow reads query the target without using its response and compare it asynchronously.',tradeoff:'They can expose sensitive data and double read traffic.'},
        {name:'Compatibility layers',summary:'Compatibility layers translate old contracts and semantics into the new model.',tradeoff:'Translation adds latency and another retirement task.'}
      ]},
      {title:'Data movement',concepts:[
        {name:'Backfill',summary:'Backfill copies historical data with stable partitions, checkpoints, throttling, and retries.',tradeoff:'It competes with production and races live updates.'},
        {name:'CDC migration',summary:'CDC migration streams committed source changes to keep a target synchronized during transfer.',tradeoff:'Ordering, deletes, and schema changes need explicit handling.'},
        {name:'Online migration',summary:'Online migration changes data or infrastructure while normal traffic continues.',tradeoff:'Safe coexistence lengthens the migration.'},
        {name:'Data reconciliation',summary:'Data reconciliation compares invariants, hashes, counts, and records, then repairs differences idempotently.',tradeoff:'Full comparison is expensive.'}
      ]},
      {title:'Compatibility and rollout',concepts:[
        {name:'Expand-and-contract',summary:'Expand-and-contract adds compatible support, migrates all users, then removes the old form.',tradeoff:'Intermediate duplication spans multiple releases.'},
        {name:'Versioned schemas',summary:'Versioned schemas let mixed producers and consumers interpret data intentionally.',tradeoff:'Every supported version adds maintenance cost.'},
        {name:'Rolling migration',summary:'Rolling migration updates nodes or partitions incrementally while mixed versions interoperate.',tradeoff:'Compatibility constrains new feature use.'},
        {name:'Incremental rollout',summary:'Incremental rollout expands exposure only after each cohort meets defined guardrails.',tradeoff:'More stages slow completion.'},
        {name:'Canary migration',summary:'Canary migration moves a small representative data or tenant cohort before the fleet.',tradeoff:'Cross-cohort interactions may hide defects.'}
      ]},
      {title:'Authority transition',concepts:[
        {name:'Cutover strategies',summary:'Cutover strategies define the exact routing, write authority, draining, and validation sequence.',tradeoff:'A hard cutover is simple but risky.'},
        {name:'Rollback strategies',summary:'Rollback strategies preserve compatible code, data, and routing until recovery is proven.',tradeoff:'Rollback options increase temporary complexity and cost.'}
      ]}
    ]
  },
  {
    id:'consistency-conflict-patterns',
    title:'Consistency & Conflict Patterns',
    intro:'Detect concurrent versions and resolve them without violating the required consistency contract.',
    groups:[
      {title:'Conflict selection',concepts:[
        {name:'Last-write-wins',summary:'Last-write-wins selects the value with the greatest timestamp or deterministic version order.',tradeoff:'It can silently discard concurrent valid writes.'},
        {name:'First-write-wins',summary:'First-write-wins preserves the earliest accepted value and rejects later competitors.',tradeoff:'It requires an authoritative ordering point.'},
        {name:'Version numbers',summary:'Version numbers expose update order and support conditional mutation or stale-write rejection.',tradeoff:'Independent writers need a shared or richer version scheme.'},
        {name:'Vector clocks',summary:'Vector clocks distinguish causal order from concurrent versions using per-writer counters.',tradeoff:'Metadata grows with the writer set.'},
        {name:'Conflict-free replicated data types',summary:'Conflict-free replicated data types merge concurrent state or operations algebraically to guarantee convergence.',tradeoff:'Available semantics and metadata can be restrictive.'},
        {name:'Application-level conflict resolution',summary:'Application-level conflict resolution applies domain rules to merge, reject, or escalate concurrent values.',tradeoff:'Correct merge logic is domain-specific.'}
      ]},
      {title:'Replica repair',concepts:[
        {name:'Read repair',summary:'Read repair detects divergent replicas during reads and propagates the selected value.',tradeoff:'Cold keys may remain divergent.'},
        {name:'Anti-entropy',summary:'Anti-entropy compares replicas in the background and exchanges missing or conflicting ranges.',tradeoff:'Repair consumes bandwidth and converges gradually.'},
        {name:'Merkle trees',summary:'Merkle trees summarize ranges hierarchically so replicas can locate differences efficiently.',tradeoff:'Maintaining trees adds compute and metadata.'},
        {name:'Quorum reconciliation',summary:'Quorum reconciliation compares overlapping replica responses and repairs from the winning version set.',tradeoff:'Concurrent versions still need a merge rule.'}
      ]},
      {title:'Consistency contracts',concepts:[
        {name:'Causal consistency',summary:'Causal consistency preserves happened-before relationships while allowing concurrent updates.',tradeoff:'Clients and replicas carry causal metadata.'},
        {name:'Strong consistency',summary:'Strong consistency exposes a single authoritative view according to a defined ordering contract.',tradeoff:'Coordination raises latency and reduces partition availability.'},
        {name:'Eventual consistency',summary:'Eventual consistency guarantees replica convergence after updates stop and propagation succeeds.',tradeoff:'It gives no useful staleness bound alone.'}
      ]}
    ]
  },
  {
    id:'distributed-deduplication-idempotency',
    title:'Distributed Deduplication & Idempotency',
    intro:'Make retries and duplicate delivery produce one durable business outcome.',
    groups:[
      {title:'Request identity',concepts:[
        {name:'Idempotency keys',summary:'Idempotency keys bind retries of one logical command to a durable stored outcome.',tradeoff:'Scope and retention must be explicit.'},
        {name:'Request fingerprints',summary:'Request fingerprints detect reuse of one idempotency key for different payload intent.',tradeoff:'Canonicalization can be difficult.'},
        {name:'Deduplication tables',summary:'Deduplication tables persist processed identities with unique constraints and outcome state.',tradeoff:'They require partitioning and cleanup.'},
        {name:'Sequence numbers',summary:'Sequence numbers identify order and duplicates within a producer or entity stream.',tradeoff:'Producer failover must preserve epochs and progress.'},
        {name:'Event IDs',summary:'Event IDs provide stable identity across publication retries, relays, and replays.',tradeoff:'Derived events need clear identity lineage.'}
      ]},
      {title:'Delivery semantics',concepts:[
        {name:'Exactly-once illusion',summary:'The exactly-once illusion comes from hiding retries inside a bounded transaction while external effects remain ambiguous.',tradeoff:'End-to-end physical execution can still repeat.'},
        {name:'At-least-once + idempotency',summary:'At-least-once + idempotency retries until delivery while making repeated effects harmless.',tradeoff:'Idempotency state adds storage and coordination.'},
        {name:'Idempotent consumers',summary:'Idempotent consumers atomically record message identity with the resulting local state change.',tradeoff:'Processed identity retention must cover replay.'},
        {name:'Transactional deduplication',summary:'Transactional deduplication commits the dedup record and business effect in one atomic transaction.',tradeoff:'It is usually limited to one transactional store.'}
      ]},
      {title:'Distributed state',concepts:[
        {name:'Distributed dedup caches',summary:'Distributed dedup caches share recent identities across instances for fast duplicate checks.',tradeoff:'Eviction and inconsistency can admit duplicates.'}
      ]}
    ]
  },
  {
    id:'time-based-distributed-patterns',
    title:'Time-Based Distributed Patterns',
    intro:'Treat time as an uncertain input and make windows, expiry, and scheduling semantics explicit.',
    groups:[
      {title:'Retention and partitioning',concepts:[
        {name:'TTL',summary:'TTL defines how long a record or cache entry remains valid or retained.',tradeoff:'Deletion is often asynchronous after logical expiry.'},
        {name:'Expiration',summary:'Expiration transitions state based on a time boundary with explicit visibility and cleanup behavior.',tradeoff:'Clock skew can move the boundary.'},
        {name:'Time buckets',summary:'Time buckets group records or counters into fixed intervals for bounded storage and queries.',tradeoff:'Boundary effects complicate rolling calculations.'},
        {name:'Time-based partitioning',summary:'Time-based partitioning places data by time range for efficient retention and range scans.',tradeoff:'Current partitions can become write hotspots.'}
      ]},
      {title:'Windows and stream time',concepts:[
        {name:'Sliding windows',summary:'Sliding windows continuously aggregate overlapping time ranges.',tradeoff:'Overlap increases state and computation.'},
        {name:'Tumbling windows',summary:'Tumbling windows divide time into adjacent non-overlapping intervals.',tradeoff:'Events near boundaries may split one real-world burst.'},
        {name:'Watermarks',summary:'Watermarks estimate event-time completeness and trigger results despite out-of-order arrival.',tradeoff:'Aggressive watermarks require more corrections.'},
        {name:'Event time',summary:'Event time is when an event occurred at its source.',tradeoff:'Source timestamps may be late or inaccurate.'},
        {name:'Processing time',summary:'Processing time is when the system observes or computes over an event.',tradeoff:'Results vary with delays and replays.'}
      ]},
      {title:'Coordination and scheduling',concepts:[
        {name:'Leases',summary:'Leases grant time-bounded ownership that must be renewed and fenced.',tradeoff:'Pauses and skew can create overlapping beliefs.'},
        {name:'Heartbeats',summary:'Heartbeats provide periodic evidence of liveness or progress.',tradeoff:'A missed heartbeat proves suspicion, not failure.'},
        {name:'Delayed queues',summary:'Delayed queues hide work until a not-before time, then expose it for idempotent execution.',tradeoff:'Strict timing precision is expensive.'},
        {name:'Scheduled execution',summary:'Scheduled execution persists job identity, due time, attempts, and outcome across failover.',tradeoff:'Exactly-once wall-clock execution is not guaranteed.'},
        {name:'Clock skew',summary:'Clock skew is the difference between clocks and must be bounded or avoided in correctness decisions.',tradeoff:'Synchronization never removes all uncertainty.'},
        {name:'Logical clocks',summary:'Logical clocks order events from causality rather than relying on physical timestamps.',tradeoff:'They do not measure real elapsed time.'}
      ]}
    ]
  },
  {
    id:'advanced-senior-staff-level-concepts',
    title:'Advanced / Senior-Staff-Level Concepts',
    intro:'Connect distributed theory, resilience, scale, and operational design across the whole system.',
    groups:[
      {title:'Topology and placement',concepts:[
        {name:'Cell-based architecture',summary:'Cell-based architecture deploys self-contained slices of compute and data for bounded failure and scaling.',tradeoff:'Cells duplicate infrastructure and complicate global features.'},
        {name:'Shuffle sharding',summary:'Shuffle sharding assigns each tenant a small random subset of workers to limit shared fate.',tradeoff:'Capacity planning and rebalancing become harder.'},
        {name:'Consistent hashing',summary:'Consistent hashing maps keys around a ring so membership changes move limited data.',tradeoff:'Virtual nodes are needed for good balance.'},
        {name:'Rendezvous hashing',summary:'Rendezvous hashing scores each key-node pair and selects the highest-scoring owners.',tradeoff:'Naive selection evaluates every node.'},
        {name:'Gossip protocols',summary:'Gossip protocols spread membership and state probabilistically through peer exchanges.',tradeoff:'Convergence is eventual and messages are redundant.'},
        {name:'Merkle trees',summary:'Merkle trees compare hierarchical hashes to locate replica divergence efficiently.',tradeoff:'Tree maintenance consumes resources.'}
      ]},
      {title:'Convergence and ordering',concepts:[
        {name:'CRDTs',summary:'CRDTs use mergeable state or commutative operations to converge without coordination.',tradeoff:'Metadata and supported invariants can be limiting.'},
        {name:'Vector clocks',summary:'Vector clocks identify causal order and concurrency among distributed versions.',tradeoff:'Vectors grow with participants.'},
        {name:'Hybrid logical clocks',summary:'Hybrid logical clocks combine physical time with logical counters for causal, readable timestamps.',tradeoff:'Large clock offsets still need handling.'},
        {name:'Quorum systems',summary:'Quorum systems use intersecting replica subsets to preserve evidence across reads, writes, or decisions.',tradeoff:'Quorum loss stops progress.'},
        {name:'Consensus',summary:'Consensus makes replicas agree on one ordered decision history despite crash failures.',tradeoff:'It adds latency and needs a quorum.'},
        {name:'Paxos',summary:'Paxos uses ballots and intersecting quorums to choose values safely.',tradeoff:'Implementation and operation are subtle.'},
        {name:'Raft',summary:'Raft uses terms, leader election, and replicated logs to implement understandable consensus.',tradeoff:'The leader can bottleneck writes.'},
        {name:'Fencing tokens',summary:'Fencing tokens are increasing epochs that resources use to reject stale owners.',tradeoff:'Every protected write path must enforce them.'},
        {name:'Leases',summary:'Leases provide renewable time-bounded authority, normally paired with fencing.',tradeoff:'Time alone cannot prevent stale writes safely.'}
      ]},
      {title:'Transactions and state models',concepts:[
        {name:'Idempotency',summary:'Idempotency makes repeated execution converge on the same intended state.',tradeoff:'Repeated external side effects still need deduplication.'},
        {name:'Exactly-once semantics',summary:'Exactly-once semantics combine transactional progress and deterministic identity within a stated boundary.',tradeoff:'The guarantee rarely spans external systems.'},
        {name:'Transactional outbox',summary:'A transactional outbox commits business state and outgoing intent in one local transaction.',tradeoff:'Publishing remains at least once.'},
        {name:'Sagas',summary:'Sagas coordinate local transactions with durable progress and semantic compensation.',tradeoff:'Intermediate states are externally visible.'},
        {name:'Event sourcing',summary:'Event sourcing stores immutable domain facts and derives current state through replay.',tradeoff:'Evolution, deletion, and replay are complex.'},
        {name:'CQRS',summary:'CQRS separates command and query models when their invariants or scaling differ.',tradeoff:'Projection lag and duplicate models add complexity.'}
      ]},
      {title:'Overload and latency',concepts:[
        {name:'Backpressure',summary:'Backpressure signals producers to slow when downstream capacity is saturated.',tradeoff:'Pressure can propagate across dependencies.'},
        {name:'Load shedding',summary:'Load shedding rejects lower-value work early to preserve critical capacity.',tradeoff:'It deliberately reduces served traffic.'},
        {name:'Hedged requests',summary:'Hedged requests issue a delayed duplicate and use the first valid response to reduce tail latency.',tradeoff:'They consume extra capacity and require idempotency.'},
        {name:'Adaptive throttling',summary:'Adaptive throttling adjusts admission from observed latency, errors, and saturation.',tradeoff:'Feedback loops can oscillate.'},
        {name:'Cache stampede prevention',summary:'Cache stampede prevention coalesces refreshes, jitters expiry, or serves bounded stale data.',tradeoff:'Coordination and stale serving complicate caches.'},
        {name:'Hot-key mitigation',summary:'Hot-key mitigation uses replication, coalescing, salting, or isolation to spread skewed demand.',tradeoff:'Splitting keys complicates ordering and aggregation.'},
        {name:'Approximate data structures',summary:'Approximate data structures trade bounded error for compact, fast membership or frequency estimates.',tradeoff:'False positives or estimation error affect decisions.'}
      ]},
      {title:'Streaming and snapshots',concepts:[
        {name:'Stream processing',summary:'Stream processing continuously transforms ordered partitions while checkpointing state and progress.',tradeoff:'Cross-partition ordering and state recovery are complex.'},
        {name:'Watermarks',summary:'Watermarks estimate event-time progress so stream processors can close windows.',tradeoff:'Late events require updates, retractions, or drops.'},
        {name:'Distributed snapshots',summary:'Distributed snapshots capture a consistent global cut without stopping all participants.',tradeoff:'In-flight messages and channel state must be represented.'}
      ]},
      {title:'Global resilience and architecture',concepts:[
        {name:'Multi-region active-active',summary:'Multi-region active-active serves writes from multiple regions for locality and regional resilience.',tradeoff:'Conflicts and cross-region invariants become harder.'},
        {name:'Conflict resolution',summary:'Conflict resolution selects or merges concurrent state using deterministic domain rules.',tradeoff:'Automatic convergence may lose business intent.'},
        {name:'Disaster recovery',summary:'Disaster recovery restores service and data to explicit RTO and RPO through practiced procedures.',tradeoff:'Tighter objectives cost more capacity and coordination.'},
        {name:'Cell isolation',summary:'Cell isolation prevents traffic, data, and failures from freely crossing cell boundaries.',tradeoff:'Isolation reduces resource pooling.'},
        {name:'Blast-radius management',summary:'Blast-radius management bounds failures through cells, quotas, rings, credentials, and staged changes.',tradeoff:'More boundaries increase operating cost.'},
        {name:'Control plane / data plane separation',summary:'Control plane / data plane separation keeps orchestration failures from directly stopping established serving paths.',tradeoff:'Serving must tolerate stale configuration.'},
        {name:'Data plane scalability',summary:'Data plane scalability partitions high-volume serving work horizontally with local fast paths.',tradeoff:'Global coordination undermines scale.'},
        {name:'Control plane consistency',summary:'Control plane consistency ensures configuration changes are ordered, durable, and auditable before broad application.',tradeoff:'Stronger consistency slows management operations.'}
      ]}
    ]
  }
];

const SYSTEM_DESIGN_VISUAL_SPECS_3 = {
  'api-service-architecture':[
    ['API Gateway',[['Client','API request'],['Gateway','authenticate + limit'],['Router','match route'],['Service','handle request']],['Client sends one public API request.','Gateway authenticates, validates, and applies quota policy.','Router selects the version and healthy destination.','Service handles the request and returns through the gateway.']],
    ['Reverse proxy',[['Client','TLS connection'],['Proxy','terminate + inspect'],['Upstream pool','private endpoints'],['Backend','response']],['Client connects to the public proxy address.','Proxy terminates the connection and applies forwarding policy.','Proxy chooses an available private upstream.','Backend response returns without exposing its address.']],
    ['Load balancing',[['Requests','uneven arrivals'],['Balancer','health + policy'],['Instance A','in flight'],['Instance B','available']],['Requests arrive at one service address.','Balancer removes unhealthy instances from consideration.','Policy distributes work using load or connection state.','Capacity is shared while failed instances receive no new work.']],
    ['L4 vs L7 load balancing',[['Connection','IP + port'],['L4 balancer','transport route'],['HTTP request','host + path'],['L7 balancer','content route']],['A transport connection exposes addresses and ports.','L4 forwards packets without understanding application content.','An HTTP request exposes method, host, headers, and path.','L7 applies content-aware routing at higher processing cost.']],
    ['Service discovery',[['Service instance','register endpoint'],['Registry','versioned membership'],['Resolver','watch changes'],['Caller','connect healthy']],['A service instance registers its endpoint and health.','Registry publishes the current membership set.','Resolver watches or refreshes the versioned set.','Caller connects to a discovered healthy instance.']],
    ['Client-side load balancing',[['Registry','endpoint set'],['Client library','local policy'],['Instance A','healthy'],['Instance B','healthy']],['Client refreshes endpoints from discovery.','Local policy filters health and locality.','Client selects one instance directly.','Failures update local state and influence the next selection.']],
    ['Server-side load balancing',[['Client','single address'],['Load balancer','central policy'],['Backend pool','health set'],['Selected backend','serve']],['Client sends traffic to one stable address.','Load balancer checks the current backend health set.','Central policy selects a backend for the request or connection.','Selected backend serves while membership stays hidden from the client.']],
    ['Request routing',[['Request','path + identity'],['Route table','ordered rules'],['Policy','version + locality'],['Destination','selected cluster']],['Request arrives with routable attributes.','Route table finds the first valid matching rule.','Policy applies version, tenant, locality, and health constraints.','Request reaches the selected destination with a traceable decision.']],
    ['Service mesh',[['Service A','application call'],['Mesh proxy A','mTLS + policy'],['Mesh control plane','config + identity'],['Mesh proxy B','deliver to Service B']],['Service A makes a normal local outbound call.','Its proxy applies identity, telemetry, and traffic policy.','Control-plane configuration tells both proxies how to trust and route.','Peer proxy authenticates the channel and delivers to Service B.']],
    ['Sidecars',[['Application','localhost call'],['Sidecar','intercept traffic'],['Peer sidecar','verify + forward'],['Peer application','receive']],['Application sends traffic through its colocated sidecar.','Sidecar handles transport concerns outside business code.','Peer sidecar verifies identity and inbound policy.','Peer application receives a local trusted connection.']],
    ['North-south traffic',[['External client','internet request'],['Edge','public trust boundary'],['Gateway','route + protect'],['Internal service','serve']],['External traffic reaches the public edge.','Edge terminates external transport and rejects unsafe input.','Gateway applies API policy and selects an internal route.','Internal service responds without becoming directly public.']],
    ['East-west traffic',[['Service A','internal request'],['Identity layer','workload identity'],['Service network','route + balance'],['Service B','authorize']],['Service A initiates an internal dependency call.','Workload identity is attached and verified.','Internal network routes to a healthy Service B instance.','Service B independently authorizes the requested operation.']],
    ['Control plane vs data plane',[['Operator','desired config'],['Control plane','validate + publish'],['Data plane','cached config'],['User traffic','served locally']],['Operator submits a desired-state change.','Control plane validates, orders, and distributes a version.','Data plane adopts the version while retaining a safe prior state.','User traffic continues on the local fast path even if control updates pause.']],
    ['Configuration distribution',[['Config author','proposed version'],['Validator','schema + policy'],['Distributor','staged fan-out'],['Service fleet','apply or rollback']],['Author creates an immutable configuration version.','Validator rejects malformed or unsafe values.','Distributor rolls the version through staged cohorts.','Services acknowledge application or revert to the previous version.']],
    ['Traffic shadowing',[['Live request','production input'],['Mirror','copy request'],['Primary path','authoritative result'],['Shadow path','compare only']],['Live request enters the authoritative route.','Mirror creates a sanitized copy without delaying the caller.','Primary path produces the only user-visible result and effects.','Shadow path suppresses effects and records comparison differences.']],
    ['Canary deployments',[['New build','candidate'],['Canary cohort','small traffic share'],['Guardrails','errors + latency'],['Fleet','expand or rollback']],['Candidate build deploys to a small isolated cohort.','Router sends a bounded representative share to the canary.','Guardrails compare technical and business signals to baseline.','Healthy results expand exposure; violations route back and roll back.']],
    ['Blue-green deployments',[['Blue','current live'],['Green','new idle'],['Validation','smoke + readiness'],['Traffic switch','green live']],['Green environment is deployed beside the live blue environment.','Tests validate green without changing production authority.','Router atomically switches new traffic to green.','Blue remains rollback-ready until green and data compatibility are proven.']],
    ['A/B routing',[['Eligible users','experiment population'],['Assignment','stable cohort hash'],['Variant A','control'],['Variant B','treatment']],['Eligible users enter the experiment population.','Stable assignment places each user in one cohort.','Requests consistently reach control or treatment behavior.','Outcome metrics compare cohorts while guarding reliability.']],
    ['Feature flags',[['Code deploy','flagged path'],['Flag service','versioned rule'],['Evaluator','context decision'],['Behavior','old or new']],['Code containing both paths deploys while the flag stays off.','Flag service publishes a targeted rule and version.','Evaluator chooses behavior from stable request context.','Operators expand or disable exposure without redeploying code.']]
  ],
  'realtime-connections':[
    ['Long polling',[['Client','GET /events'],['Gateway','open HTTP request'],['Long-poll API','registered waiter'],['Event source','event or timeout'],['Client','response then reconnect']],['Client opens an HTTP request for the next event.','Gateway and API hold the request while registering a bounded waiter.','An event completes the waiter, or a deadline returns an empty timeout response.','API releases request resources and sends the response.','Client processes the result and immediately opens the next long poll.']],
    ['Server-Sent Events (SSE)',[['EventSource client','GET text/event-stream'],['Proxy','streaming response'],['SSE service','encode id/event/data'],['Pub/sub','published events'],['Resume cursor','Last-Event-ID']],['Browser EventSource opens a streaming HTTP request through the proxy.','SSE service keeps the response open and subscribes to relevant pub/sub events.','Published events flow one way to the client as id, event, and data fields.','Disconnect triggers automatic reconnect carrying Last-Event-ID.','Service resumes after that cursor and continues the stream without a client-to-server channel.']],
    ['WebSockets',[['Client','HTTP Upgrade'],['Gateway','connection routing'],['WebSocket service','full-duplex session'],['Connection registry','owner + presence'],['Pub/sub','cross-node fan-out'],['Flow control','ping/pong + backpressure']],['Client requests an HTTP Upgrade and gateway returns a persistent route.','WebSocket service accepts the session and registers its owning node.','Client and service exchange independent full-duplex frames.','Pub/sub routes messages to the node currently owning each destination connection.','Ping/pong detects dead peers while bounded send queues apply backpressure.','Disconnect removes registry state and the client reconnects with application-level recovery.']]
  ],
  'distributed-identity-security':[
    ['OAuth 2.0',[['Resource owner','grant intent'],['Authorization server','issue token'],['Client','bearer or proof'],['Resource server','scope check']],['Resource owner or workload authorizes a bounded grant.','Authorization server authenticates the client and issues a scoped access token.','Client presents the token to its intended resource.','Resource server validates it and authorizes the requested scope.']],
    ['OIDC',[['User agent','login'],['Identity provider','authenticate'],['ID token','identity claims'],['Client','session']],['Client redirects the user to the identity provider.','Provider authenticates the user and records consent or policy.','Provider returns a signed ID token for that client.','Client validates nonce, issuer, audience, and signature before creating a session.']],
    ['JWT',[['Issuer','claims'],['Signing key','signature'],['JWT','header.payload.signature'],['Resource','local validation']],['Issuer creates bounded claims including audience and expiry.','Signing key protects the encoded header and payload.','Client transports the compact JWT to the resource.','Resource verifies signature and claims before trusting content.']],
    ['JWKS',[['Issuer','rotate key'],['JWKS endpoint','public keys + kid'],['Validator cache','refresh'],['Token','signature verified']],['Issuer signs tokens with a key identified by kid.','JWKS endpoint publishes current and overlapping public keys.','Validator refreshes safely when a key is unknown or cache ages.','Matching public key verifies the token without exposing private material.']],
    ['Token introspection',[['Opaque token','reference'],['Resource server','introspection call'],['Authorization server','active + claims'],['Policy','allow or deny']],['Resource receives an opaque token it cannot decode.','Resource authenticates to the introspection endpoint.','Authorization server returns current active state and bounded claims.','Resource applies local authorization or denies inactive tokens.']],
    ['Access-token validation',[['Access token','untrusted input'],['Crypto validation','signature + algorithm'],['Claim validation','iss + aud + exp'],['Authorization','scope + resource']],['Resource treats the presented token as untrusted bytes.','Cryptographic validation anchors the token to a trusted issuer key.','Issuer, audience, lifetime, and required claims are checked.','Only then does resource policy authorize the concrete action.']],
    ['Edge token validation',[['Client token','external'],['Edge validator','reject invalid'],['Internal request','verified context'],['Service','revalidate policy']],['External client presents a token at the edge.','Edge blocks malformed, expired, or wrongly targeted tokens early.','Validated identity context is forwarded over a protected channel.','Service verifies trustworthy context and enforces resource authorization.']],
    ['Token caching',[['Token request','resource + scopes'],['Cache key','identity + audience'],['Cached token','valid lifetime'],['Issuer','refresh on miss']],['Caller derives a cache key from principal, resource, scopes, and tenant.','Cache returns a token only with enough safe lifetime remaining.','Caller uses the cached token for the intended audience.','Miss or near-expiry triggers one coalesced refresh from the issuer.']],
    ['Key rotation',[['Old key','currently trusted'],['New key','published'],['Issuer','switch signing'],['Validators','retire old']],['New public key is published before first use.','Validators refresh and trust old plus new keys during overlap.','Issuer begins signing new tokens with the new key ID.','Old key retires only after all tokens it signed can no longer be valid.']],
    ['Credential rotation',[['Credential v1','active'],['Credential v2','provisioned'],['Consumers','switch safely'],['Retired credential v1','revoked']],['A second credential is provisioned without removing the first.','Consumers receive and test v2 through staged rollout.','Issuers or callers switch normal use to v2.','v1 is revoked after usage telemetry confirms migration.']],
    ['Revocation',[['Credential/token','compromised'],['Revocation authority','record deny'],['Caches','refresh or push'],['Resource','reject']],['Security signal identifies authority that must end early.','Revocation authority records the token, session, key, or principal state.','Enforcement caches receive or refresh the new state.','Subsequent use is rejected despite the original expiry time.']],
    ['Workload identity',[['Workload','runtime attributes'],['Attestor','verify origin'],['Issuer','short-lived credential'],['Peer service','authenticate']],['Workload presents platform-verifiable runtime evidence.','Attestor maps evidence to one approved workload identity.','Issuer returns a short-lived credential without a stored shared secret.','Peer validates that identity before accepting the connection.']],
    ['Workload identity federation',[['External workload','signed assertion'],['Trust policy','issuer + subject'],['Token exchange','local credential'],['Cloud resource','authorized']],['External platform issues a signed workload assertion.','Local trust policy matches exact issuer, subject, and audience.','Federation endpoint exchanges it for a short-lived local token.','Cloud resource validates and authorizes the federated identity.']],
    ['SPIFFE',[['Workload','attestation evidence'],['SPIFFE ID','trust-domain identity'],['Workload API','credential delivery'],['Peer','identity policy']],['Workload is attested from platform attributes.','Identity maps to a SPIFFE ID within a trust domain.','Workload API delivers a short-lived identity document.','Peer authorizes the SPIFFE ID rather than network location.']],
    ['SPIRE',[['Node agent','node attestation'],['Workload selector','process attributes'],['SPIRE server','issue identity'],['Workload API','rotate SVID']],['SPIRE agent proves the node identity to the server.','Agent matches a workload process to registered selectors.','SPIRE server authorizes and signs the workload identity.','Agent delivers and rotates the SVID through the Workload API.']],
    ['SVID',[['SPIFFE ID','named workload'],['X.509/JWT SVID','short lived'],['Trust bundle','verify issuer'],['Peer','authorize ID']],['Issuer binds a SPIFFE ID into a short-lived SVID.','Workload receives the credential without handling a long-lived key.','Peer validates the SVID against the trust-domain bundle.','Peer policy authorizes the authenticated SPIFFE ID.']],
    ['mTLS',[['Client workload','certificate'],['TLS handshake','mutual proof'],['Encrypted channel','session keys'],['Server policy','peer identity']],['Client and server present certificates during the handshake.','Each validates chain, name, lifetime, and proof of private-key possession.','Handshake derives session keys for encrypted transport.','Application maps the authenticated peer identity to authorization policy.']],
    ['PKI',[['Root CA','trust anchor'],['Intermediate CA','delegated issuance'],['Certificate','identity + public key'],['Relying party','chain validation']],['Root trust anchor delegates bounded issuance to an intermediate.','Intermediate verifies enrollment and signs an identity certificate.','Subject presents the certificate and proves key possession.','Relying party validates chain, lifetime, usage, and revocation.']],
    ['Certificate rotation',[['Current certificate','near expiry'],['New keypair','generated'],['CA','issue replacement'],['Fleet','swap + retire']],['Workload generates or receives fresh key material before expiry.','CA verifies identity and issues the replacement certificate.','Fleet loads the new certificate while old sessions remain valid.','Old certificate and key retire after overlap and usage checks.']],
    ['Service-to-service authentication',[['Service A','workload credential'],['Protected channel','present identity'],['Service B','verify issuer'],['Principal','authenticated']],['Service A obtains a workload-bound credential.','It presents proof over a protected service connection.','Service B validates issuer, audience, lifetime, and key possession.','The verified workload principal enters authorization.']],
    ['Service-to-service authorization',[['Caller principal','Service A'],['Action','requested operation'],['Resource','Service B object'],['Policy decision','allow or deny']],['Service B authenticates the calling workload.','It constructs actor, action, resource, tenant, and context input.','Policy evaluates least-privilege grants and constraints.','Service B enforces and audits the decision locally.']],
    ['RBAC',[['Principal','role assignment'],['Role','permission set'],['Request','action + resource'],['Enforcer','role check']],['Administrator assigns a principal to a governed role.','Role expands to a stable set of allowed actions.','Request arrives for a specific protected resource.','Enforcer permits only when an active role grants that action.']],
    ['ABAC',[['Subject attributes','team + clearance'],['Resource attributes','owner + class'],['Context','action + environment'],['Policy','boolean decision']],['Enforcer gathers trusted subject attributes.','It loads resource and requested-action attributes.','Environmental context such as tenant or risk is added.','Policy evaluates the complete attribute expression and returns a decision.']],
    ['Policy engines',[['Request context','actor/action/resource'],['Policy bundle','versioned rules'],['Engine','evaluate'],['Enforcement point','apply + audit']],['Enforcement point builds structured decision input.','Engine selects an immutable policy bundle version.','Rules evaluate input and produce decision plus reasons.','Enforcement point applies the result and records the policy version.']],
    ['Policy propagation',[['Policy author','new rule'],['Control plane','validate + version'],['Enforcement caches','staged update'],['Requests','new policy']],['Author submits a policy change with intended scope.','Control plane validates, orders, and signs a version.','Version propagates through staged enforcement cohorts.','Requests use an explicit version, with rollback on unsafe results.']],
    ['Distributed authorization',[['Gateway','coarse check'],['Service A','domain check'],['Service B','resource check'],['Audit stream','decision chain']],['Gateway authenticates and applies coarse boundary policy.','Service A authorizes its own domain operation.','Downstream Service B independently checks its resource and delegation.','Audit links every decision without assuming upstream authority is sufficient.']],
    ['Zero Trust',[['Request','untrusted location'],['Identity','user + workload'],['Context','device + risk'],['Resource policy','least privilege']],['Every request begins without implicit network trust.','User and workload identities are continuously verified.','Current device, tenant, and risk context is evaluated.','Resource grants only the least privilege for that operation.']],
    ['Trust boundaries',[['Lower-trust input','external data'],['Boundary','validate + authenticate'],['Higher-trust component','bounded context'],['Output boundary','sanitize']],['Data approaches a boundary from a lower-assurance zone.','Boundary validates identity, integrity, schema, and authorization.','Higher-trust component receives only normalized bounded input.','Results are minimized and sanitized before crossing outward.']],
    ['Auditability',[['Security action','who did what'],['Audit event','resource + policy'],['Immutable store','ordered retention'],['Investigator','reconstruct']],['Sensitive operation captures user, workload, action, resource, and result.','Event includes policy version, trace, and trustworthy time context.','Append-only storage protects integrity and retention controls access.','Investigator reconstructs the decision chain without relying on mutable logs.']],
    ['Delegated identity',[['User','original authority'],['Delegating service','bounded intent'],['Exchanged token','narrow audience'],['Downstream','user + caller']],['User authorizes the first service for a bounded operation.','Service proves its own identity and requested delegation.','Issuer returns a narrower token for the downstream audience.','Downstream validates both delegated user authority and calling workload.']],
    ['OBO',[['User token','audience Service A'],['Service A','token exchange'],['OBO token','audience Service B'],['Service B','scoped action']],['User presents a token intended for Service A.','Service A authenticates itself and exchanges the user assertion.','Issuer creates a scoped token intended only for Service B.','Service B validates it and authorizes the delegated user action.']],
    ['Confused deputy',[['Caller','untrusted intent'],['Privileged service','ambient authority'],['Target resource','victim scope'],['Bound token','caller + target']],['Caller asks a privileged service to access a resource.','Service refuses to rely on its ambient authority alone.','Authorization binds caller identity, action, and exact target.','A narrowed token prevents redirecting privilege to another resource.']],
    ['Credential blast radius',[['Credential','scope + lifetime'],['Reachable services','trust set'],['Compromise','attacker use'],['Containment','revoke + isolate']],['Credential design defines audience, permissions, lifetime, and tenant scope.','Only explicitly trusting services accept it.','Compromise is detected through anomalous use or disclosure.','Narrow scope, rotation, and isolation cap affected resources and time.']]
  ],
  'observability-distributed-debugging':[
    ['Metrics',[['Service events','measurements'],['Aggregator','time series'],['Dimensions','bounded labels'],['Dashboard/alert','trend']],['Service records counters, gauges, and latency distributions.','Aggregator rolls measurements into time series.','Bounded dimensions preserve useful slices without explosion.','Queries reveal trends and trigger threshold or burn-rate alerts.']],
    ['Logs',[['Code path','structured event'],['Log pipeline','buffer + redact'],['Indexed store','retention'],['Investigator','query context']],['Code emits a typed event with severity and stable fields.','Pipeline batches, redacts, and survives temporary export failure.','Store indexes selected fields under retention policy.','Investigator correlates events by service, tenant, and request.']],
    ['Distributed tracing',[['Client span','trace root'],['Service A span','child'],['Dependency span','remote call'],['Service B span','causal continuation']],['Client or edge creates a trace and root span.','Service A accepts context and records its child work.','Outbound dependency span injects trace context into the call.','Service B continues the trace so latency and errors form one causal path.']],
    ['OpenTelemetry',[['Instrumentation','API events'],['SDK','processors + sampling'],['Collector','batch + enrich'],['Backend','metrics/logs/traces']],['Application instrumentation emits signals through standard APIs.','SDK attaches resource context and applies local processing.','Collector receives, batches, redacts, and routes telemetry.','Vendor-neutral export sends each signal to an appropriate backend.']],
    ['Correlation IDs',[['Entry request','new correlation ID'],['Service calls','propagate header'],['Logs','record ID'],['Search','join events']],['Boundary accepts or creates a safe correlation ID.','Every synchronous and asynchronous hop propagates it.','Services include it in structured events and responses.','Operator searches the ID to gather related events across systems.']],
    ['Trace IDs',[['Trace root','generate 128-bit ID'],['Context carrier','propagate'],['Spans','same trace ID'],['Trace store','assemble']],['Root operation creates a globally unique trace ID.','Standard context carries it across each boundary.','Every descendant span records the same trace ID.','Backend groups spans into one distributed execution.']],
    ['Span IDs',[['Parent span','current work'],['Child operation','new span ID'],['Parent link','causal edge'],['Trace tree','ordered path']],['Current operation owns one span ID.','Nested or remote work receives a new unique span ID.','Child records the parent span ID or an explicit link.','Backend reconstructs causal branches and critical path.']],
    ['Sampling',[['All telemetry','high volume'],['Sampler','policy decision'],['Selected records','retained'],['Dropped records','aggregate only']],['Instrumentation observes every candidate record.','Sampler applies probability, route, tenant, or error policy.','Selected records receive full processing and export.','Dropped detail is represented only through unbiased aggregate metrics.']],
    ['Tail-based sampling',[['Trace fragments','buffered'],['Collector','wait for outcome'],['Policy','error/latency decision'],['Export','whole selected trace']],['Collectors buffer spans sharing a trace ID.','They wait until completion or a bounded timeout reveals outcome.','Policy favors errors, slow traces, or rare attributes.','All available spans for selected traces are exported together.']],
    ['RED metrics',[['Requests','rate'],['Responses','errors'],['Latency histogram','duration'],['Service view','RED dashboard']],['Count requests by stable service and route dimensions.','Classify failures from user-visible outcomes.','Record complete latency distributions, not averages alone.','Rate, errors, and duration expose request-service health.']],
    ['USE metrics',[['Resource','capacity'],['Utilization','busy fraction'],['Saturation','queued work'],['Errors','resource faults']],['Identify each finite resource such as CPU, pool, or disk.','Measure the fraction of capacity actively used.','Measure waiting work that cannot run immediately.','Track resource errors to separate pressure from failure.']],
    ['SLI / SLO / SLA',[['User events','good/total'],['SLI','measured ratio'],['SLO','target window'],['SLA','external consequence']],['Define which user events count as valid and good.','SLI computes the observed performance over a window.','SLO sets the internal reliability target for that indicator.','SLA codifies an external commitment and consequence.']],
    ['Error budgets',[['SLO','allowed failure'],['Observed errors','budget spend'],['Burn rate','pace'],['Delivery policy','ship or stabilize']],['SLO determines allowable bad events in its window.','Production failures consume that finite allowance.','Burn rate shows whether current pace will exhaust the budget.','Teams slow risky change or invest in reliability when budget is threatened.']],
    ['Cardinality management',[['Telemetry field','candidate label'],['Schema policy','bounded values'],['Metric index','finite series'],['Detail store','logs/traces']],['Instrumentation proposes dimensions needed for diagnosis.','Schema policy rejects user IDs and other unbounded labels.','Metrics retain only bounded, aggregation-friendly dimensions.','Unique request detail moves to sampled logs or traces.']],
    ['Dependency graphs',[['Trace spans','observed calls'],['Graph builder','service edges'],['Critical path','latency chain'],['Operator','impact analysis']],['Traces record caller and dependency relationships.','Graph builder aggregates calls into nodes and weighted edges.','Latency and failure overlays reveal critical paths and fan-out.','Operator uses the graph to locate affected upstreams and owners.']],
    ['Distributed profiling',[['Runtime samples','CPU + wall time'],['Trace context','request attribution'],['Profile aggregator','stack merge'],['Flame graph','hot path']],['Runtimes periodically sample stacks and resource states.','Samples capture trace or service context when available.','Aggregator merges equivalent stacks across instances.','Profiles reveal expensive code on slow distributed paths.']],
    ['Anomaly detection',[['Historical signal','seasonal baseline'],['Current window','observations'],['Detector','deviation score'],['Alert','context + threshold']],['Model learns normal ranges by time, service, and bounded dimension.','Current measurements enter the same feature pipeline.','Detector scores statistically meaningful deviations.','Sustained high scores alert with baseline and affected scope.']]
  ],
  'distributed-system-migration-patterns':[
    ['Strangler pattern',[['Client traffic','legacy route'],['Strangler facade','capability routing'],['Legacy system','shrinking scope'],['New service','migrated scope']],['Facade first routes every capability to the legacy system.','One bounded capability is implemented and verified in the new service.','Routing moves only that capability while legacy handles the rest.','More slices migrate until legacy dependencies and traffic reach zero.']],
    ['Dual writes',[['Command','one intent'],['Primary store','authoritative write'],['Secondary store','mirrored write'],['Repair log','partial failure']],['Command receives one stable operation identity.','Authoritative store commits and records replication intent.','Secondary write applies idempotently using the same identity.','Any partial failure is retained and retried or reconciled.']],
    ['Dual reads',[['Read request','migration key'],['Old store','result A'],['New store','result B'],['Resolver','compare + answer']],['Migration path issues bounded reads to both stores.','Old store supplies the currently authoritative value.','New store supplies the candidate migrated value.','Resolver records differences and returns the declared authority.']],
    ['Shadow reads',[['Production read','live key'],['Primary store','served value'],['Shadow store','candidate value'],['Comparator','offline diff']],['Production read goes to the authoritative store.','Its value returns immediately to the user.','A sampled asynchronous copy queries the shadow store.','Comparator records semantic differences without affecting the response.']],
    ['Compatibility layers',[['Legacy client','old contract'],['Compatibility layer','translate'],['New model','canonical contract'],['Response adapter','old shape']],['Legacy client sends the old request shape.','Layer validates and translates old semantics into the canonical model.','New system processes one internal representation.','Adapter maps the result back until the legacy client migrates.']],
    ['Backfill',[['Source snapshot','historical rows'],['Partition plan','stable ranges'],['Backfill workers','checkpointed copy'],['Target store','validated data']],['Capture a source boundary and divide history into stable ranges.','Workers copy ranges using idempotent writes and bounded load.','Each range records durable progress for restart.','Counts, hashes, and invariants validate target completeness.']],
    ['CDC migration',[['Source database','committed changes'],['Change log','ordered position'],['CDC pipeline','transform + retry'],['Target','applied checkpoint']],['Source commits normal production mutations.','CDC reads durable changes after a known snapshot position.','Pipeline transforms and retries events with stable identities.','Target applies in order and advances its checkpoint atomically.']],
    ['Online migration',[['Live traffic','continues'],['Compatibility phase','old + new'],['Background move','bounded batches'],['Authority switch','no downtime']],['Deploy compatibility that supports both representations.','Move historical state in throttled restartable batches.','Keep live mutations synchronized and continuously validate.','Switch authority only after lag and divergence reach safe bounds.']],
    ['Data reconciliation',[['Source data','expected'],['Target data','actual'],['Comparator','hash + invariant'],['Repair worker','idempotent fix']],['Select matching source and target scopes at a stable boundary.','Compare counts, range hashes, and domain invariants.','Drill mismatched ranges down to exact records.','Repair deterministically and rerun checks until clean.']],
    ['Expand-and-contract',[['Old schema','currently used'],['Expanded schema','old + new'],['Migrated clients','new form'],['Contracted schema','old removed']],['Add optional fields or tables while preserving old behavior.','Writers populate both forms and backfill existing data.','Readers move to the new form across all versions.','Remove old fields only after usage and rollback windows close.']],
    ['Versioned schemas',[['Producer','schema v2'],['Registry','compatibility check'],['Message','version marker'],['Consumer','v1/v2 reader']],['Producer proposes a schema revision.','Registry verifies declared backward or forward compatibility.','Published data carries resolvable schema identity.','Mixed consumers decode supported versions and ignore safe additions.']],
    ['Rolling migration',[['Fleet v1','all instances'],['Mixed fleet','v1 + v2'],['Compatibility checks','shared protocol'],['Fleet v2','complete']],['Deploy v2 to one bounded subset while v1 remains live.','Both versions exchange only compatible data and requests.','Health and semantic checks gate each successive batch.','Migration completes after all instances and rollback windows advance.']],
    ['Incremental rollout',[['Candidate','disabled'],['Ring 1','small cohort'],['Ring N','wider cohorts'],['General availability','all eligible']],['Candidate deploys without broad exposure.','First ring receives traffic under strict guardrails.','Success expands through increasingly representative cohorts.','Final rollout occurs only after cumulative health and business validation.']],
    ['Canary migration',[['Selected tenants','canary cohort'],['Old authority','baseline'],['New system','canary authority'],['Guardrails','expand or revert']],['Choose a representative, isolated migration cohort.','Copy and reconcile its state while old remains baseline.','Route cohort reads and writes to the new authority.','Compare outcomes, then expand or revert only that cohort.']],
    ['Cutover strategies',[['Old system','current authority'],['Readiness gate','lag = safe'],['Traffic switch','new authority'],['Drain window','old standby']],['Freeze the cutover boundary and verify target readiness.','Drain or synchronize in-flight writes to a known position.','Atomically switch routing and write authority.','Keep old system read-only until validation and rollback window complete.']],
    ['Rollback strategies',[['New path','degraded'],['Rollback gate','compatible state'],['Router','restore old path'],['Reconciliation','capture new writes']],['Guardrail detects unsafe behavior after rollout.','Rollback gate verifies old code can interpret current data.','Router returns traffic to the known-good path.','Writes made during exposure are preserved, reconciled, or explicitly compensated.']]
  ],
  'consistency-conflict-patterns':[
    ['Last-write-wins',[['Replica A','value A @ t1'],['Replica B','value B @ t2'],['Resolver','compare timestamp'],['Merged state','value B']],['Replicas accept concurrent candidate values with ordering metadata.','Values meet during read or anti-entropy.','Resolver applies one deterministic timestamp and tie-break rule.','Winning value propagates while the losing write is discarded.']],
    ['First-write-wins',[['Create request A','first candidate'],['Authority','reserve key'],['Create request B','later candidate'],['Stored value','A']],['First candidate attempts an atomic reservation for the business key.','Authority commits the reservation and associated value.','Later concurrent candidate encounters the existing reservation.','Later write is rejected or returned the already-created result.']],
    ['Version numbers',[['Client read','version 7'],['Update','if version = 7'],['Store','CAS to version 8'],['Stale writer','version conflict']],['Client reads state together with version 7.','Client submits a conditional update expecting version 7.','Store atomically writes new state and increments to version 8.','Any other writer holding version 7 receives a conflict.']],
    ['Vector clocks',[['Replica A','clock {A:1}'],['Replica B','clock {B:1}'],['Exchange','compare vectors'],['Conflict','concurrent siblings']],['Each replica increments its own counter when writing.','No communication makes the two versions incomparable.','Replicas exchange values and compare every vector component.','Neither vector dominates, so both siblings are preserved for merge.']],
    ['Conflict-free replicated data types',[['Replica A','local CRDT update'],['Replica B','concurrent update'],['Merge','join/commute'],['Replicas','converged state']],['Each replica applies an operation allowed by the CRDT algebra.','Concurrent updates proceed without coordination.','Replicas exchange state or operations in any order, including duplicates.','Associative, commutative, and idempotent merge yields convergence.']],
    ['Application-level conflict resolution',[['Version A','domain change'],['Version B','concurrent change'],['Domain resolver','merge/reject'],['Resolved version','new causal state']],['System detects versions that are causally concurrent.','Both full values and metadata reach domain resolution.','Business rules merge independent fields or escalate incompatible intent.','Resolved value descends from both versions and replicates normally.']],
    ['Read repair',[['Reader','quorum read'],['Replica A','new version'],['Replica B','stale version'],['Repair write','update B']],['Reader requests the same key from multiple replicas.','Responses expose a newer and a stale version.','Resolver selects or merges the authoritative response for the caller.','Background repair writes that version to stale replicas.']],
    ['Anti-entropy',[['Replica A','range summary'],['Replica B','range summary'],['Difference walk','narrow keys'],['Repair stream','exchange versions']],['Replicas periodically compare summaries for corresponding ranges.','Equal hashes end comparison for matching ranges.','Different hashes recurse until divergent keys are located.','Replicas exchange and resolve missing or conflicting versions.']],
    ['Merkle trees',[['Key ranges','leaf hashes'],['Tree A','root hash'],['Tree B','different root'],['Divergent leaf','repair range']],['Each replica hashes records into deterministic range leaves.','Parent hashes summarize increasingly broad ranges to one root.','Different roots trigger comparison only down mismatching branches.','Exact divergent range is transferred and rehashed after repair.']],
    ['Quorum reconciliation',[['Coordinator','read N replicas'],['Quorum responses','versions'],['Resolver','dominance/merge'],['Repair','write chosen version']],['Coordinator requests enough replicas to satisfy the read quorum.','Responses carry values and version metadata.','Resolver selects a dominating version or preserves concurrent siblings.','Chosen result returns and stale replicas receive repair.']],
    ['Causal consistency',[['Event A','original write'],['Message','carries dependency'],['Event B','dependent write'],['Reader','A before B']],['Event A receives causal metadata at its origin.','A message carrying that context reaches another writer.','Event B records a dependency on A.','Any replica exposing B first ensures A is already visible.']],
    ['Strong consistency',[['Client write','proposed value'],['Authority/quorum','ordered commit'],['Replicas','commit index'],['Client read','latest committed']],['Write reaches the current authority or consensus group.','Required replicas agree on one order before success.','Commit position advances and state machines apply the write.','Subsequent strong reads use an authority that includes that commit.']],
    ['Eventual consistency',[['Replica A','accept update'],['Replication','asynchronous'],['Replica B','temporarily stale'],['Anti-entropy','converged']],['One replica accepts and versions an update.','Update propagates asynchronously without blocking success.','Other replicas may temporarily serve older state.','Reliable propagation and deterministic merge eventually converge all replicas.']]
  ],
  'distributed-deduplication-idempotency':[
    ['Idempotency keys',[['Client','stable key K'],['Idempotency store','claim K'],['Business effect','commit once'],['Retry','replay result']],['Client assigns key K to one logical command and preserves it on retry.','Server atomically claims K and records request fingerprint.','Business effect and completion state commit under that claim.','A retry finds K and returns the stored result without repeating the effect.']],
    ['Request fingerprints',[['Request','canonical fields'],['Hasher','digest H'],['Key record','K + H'],['Duplicate','match or reject']],['Server canonicalizes the fields that define request intent.','Hasher computes a stable digest without volatile transport fields.','Digest is stored with the first idempotency-key claim.','Reuse with matching H replays; mismatching H is rejected as key misuse.']],
    ['Deduplication tables',[['Message','event ID E'],['Dedup table','unique E'],['Transaction','effect + E'],['Replay','constraint hit']],['Consumer receives an event with stable ID E.','Transaction attempts to insert E into a uniquely constrained table.','First insert commits together with the business effect.','Replay hits the existing row and skips the effect safely.']],
    ['Sequence numbers',[['Producer epoch','identity P'],['Message','sequence n'],['Consumer state','last accepted n'],['Duplicate/gap','reject or recover']],['Producer emits monotonically increasing sequence numbers within epoch P.','Consumer compares n with durable progress for P.','Next expected n applies and advances progress atomically.','Old n is a duplicate; a gap triggers buffering or recovery.']],
    ['Event IDs',[['Event creator','generate E'],['Outbox','persist E'],['Broker retries','preserve E'],['Consumer','dedupe E']],['Event receives one stable ID at creation.','Outbox stores E with the business transaction.','Relays and broker retries preserve E unchanged.','Every consumer uses E to recognize replay independently.']],
    ['Exactly-once illusion',[['Producer','send attempt'],['Broker','transactional append'],['Consumer','local commit'],['External effect','may repeat']],['A retryable producer can hide duplicate appends within broker scope.','Broker transaction can atomically publish records and offsets.','Consumer can atomically update one participating store.','An external side effect outside that boundary remains ambiguous after failure.']],
    ['At-least-once + idempotency',[['Delivery','message E'],['Consumer','attempt effect'],['Acknowledgment','may be lost'],['Redelivery','safe no-op']],['Broker delivers event E and expects acknowledgment.','Consumer commits an idempotent effect keyed by E.','Crash or lost acknowledgment causes the broker to retain E.','Redelivery finds completed E and acknowledges without another effect.']],
    ['Idempotent consumers',[['Broker record','stable ID'],['Inbox','atomic insert'],['Business state','single mutation'],['Offset','advance']],['Consumer receives a record and begins a local transaction.','Inbox insert claims the stable message ID.','First claim applies the business mutation in the same transaction.','Consumer acknowledges or advances offset only after commit.']],
    ['Transactional deduplication',[['Command','dedup key K'],['Database transaction','insert K'],['Domain rows','apply effect'],['Commit','one outcome']],['Transaction starts and attempts a unique insert for K.','Existing K identifies a duplicate and returns prior state.','New K permits domain mutations within that same transaction.','One atomic commit makes both dedup evidence and effect durable.']],
    ['Distributed dedup caches',[['Request','key K'],['Cache shard','atomic add'],['Owner','perform effect'],['TTL/replay','cache hit or expiry']],['Request routes K to a deterministic cache shard.','Atomic add elects one short-lived owner for K.','Owner performs or coordinates the protected operation.','Concurrent replay hits cached state; replay after TTL needs durable protection.']]
  ],
  'time-based-distributed-patterns':[
    ['TTL',[['Record','created at t0'],['TTL policy','duration d'],['Read path','t < t0+d'],['Cleanup','physical delete']],['Write records creation or expiry time under one clock policy.','TTL policy computes the logical validity boundary.','Reads hide the record once that boundary passes.','Background cleanup eventually reclaims storage independently.']],
    ['Expiration',[['Active state','valid until T'],['Clock check','now vs T'],['Expired state','not usable'],['Reaper','remove/archive']],['System stores an explicit expiration boundary T.','Access or scheduler compares trustworthy current time with T.','At or after T, state transitions to logically expired.','A reaper later deletes, archives, or compacts the physical data.']],
    ['Time buckets',[['Events','timestamps'],['Bucket function','floor to interval'],['Bucket storage','aggregate'],['Query','combine buckets']],['Each event receives a timestamp under a defined timezone policy.','Bucket function maps it to one fixed interval boundary.','Writes update that interval aggregate or partition.','Queries combine complete buckets and handle the partial current bucket.']],
    ['Time-based partitioning',[['Incoming record','event date'],['Partition map','time range'],['Hot partition','current window'],['Retention','drop old range']],['Record timestamp maps to a deterministic time-range partition.','Current writes concentrate in the active range.','Queries prune unrelated ranges using time predicates.','Retention removes whole old partitions after the policy window.']],
    ['Sliding windows',[['Event stream','timestamped events'],['Window','last W'],['Slide','advance by S'],['Aggregates','overlapping results']],['Timestamped events enter ordered or buffered processing.','Each event contributes to every overlapping window it belongs to.','Evaluation advances by slide S while old contributions expire.','Processor emits updated aggregates for the last W duration.']],
    ['Tumbling windows',[['Event stream','timestamped events'],['Boundary','fixed interval'],['Window state','non-overlapping'],['Window emission','close + emit']],['Window boundaries divide time into fixed adjacent intervals.','Each event maps to exactly one interval by event time.','Processor accumulates state until the completion policy fires.','Closed window emits once or later corrections under lateness policy.']],
    ['Watermarks',[['Partitions','out-of-order events'],['Progress tracker','per-partition time'],['Watermark','minimum safe estimate'],['Window','emit/correct']],['Each partition reports event-time progress while events arrive out of order.','Tracker accounts for idle or delayed partitions.','Combined watermark advances as an estimate that earlier events are mostly complete.','Windows behind it emit, while later arrivals follow correction policy.']],
    ['Event time',[['Source','real-world event'],['Timestamp','source clock'],['Transport','delay/reorder'],['Processor','event-time order']],['Event occurs in the source domain.','Source attaches the time the event actually happened.','Network may delay or reorder arrival independently.','Processor uses the attached timestamp for windows and lateness.']],
    ['Processing time',[['Event','arrives now'],['Processor clock','local time'],['Window','arrival-based'],['Replay','different placement']],['Event reaches the processing operator.','Operator reads its local clock at observation time.','Arrival time assigns the event to a processing-time window.','Delay or replay can place the same logical event in a different window.']],
    ['Leases',[['Lease service','grant epoch E until T'],['Holder','renew'],['Protected resource','check E'],['Expiry/failover','new epoch']],['Lease service grants holder an expiry and monotonically increasing epoch E.','Holder renews before T while it remains healthy.','Every protected operation carries E and the resource rejects older epochs.','After expiry, a new holder receives a higher epoch without accepting stale writes.']],
    ['Heartbeats',[['Member','periodic heartbeat'],['Monitor','arrival history'],['Suspicion','timeout/score'],['Membership','retain or evict']],['Healthy member emits heartbeats with identity and progress.','Monitor records arrival intervals rather than assuming perfect clocks.','Late arrivals increase suspicion under a chosen threshold.','Membership retains, probes, or evicts the member while accepting false suspicion risk.']],
    ['Delayed queues',[['Producer','message + due T'],['Delay index','ordered by T'],['Visibility','hidden before T'],['Worker','claim after T']],['Producer enqueues an idempotent message with not-before time T.','Queue indexes it durably by due time.','Consumers cannot claim it before T.','After T, one worker obtains visibility, executes, and acknowledges or retries.']],
    ['Scheduled execution',[['Schedule','job + due time'],['Scheduler','durable trigger'],['Worker lease','attempt ID'],['Job result','complete/reschedule']],['A durable schedule records job identity, due time, and recurrence rules.','Scheduler detects due work and creates a stable attempt.','Worker claims a lease and executes idempotently.','Result commits completion, retry, or next occurrence before releasing ownership.']],
    ['Clock skew',[['Node A clock','T'],['Node B clock','T + delta'],['Protocol','time comparison'],['Time-safety policy','bounds + logical order']],['Independent clocks drift despite synchronization.','The same instant appears as different timestamps on two nodes.','Protocol that assumes exact order can expire leases or choose winners incorrectly.','The time-safety policy uses uncertainty bounds, monotonic duration, or logical ordering instead.']],
    ['Logical clocks',[['Process A','counter 1'],['Message','carry counter'],['Process B','max + 1'],['Order','happened-before']],['A process increments its counter for a local event.','Sent message carries the current logical value.','Receiver advances beyond both local and received values.','Increasing timestamps preserve causal precedence without claiming wall time.']]
  ],
  'advanced-senior-staff-level-concepts':[
    ['Cell-based architecture',[['Tenant mapper','cell assignment'],['Cell A','compute + data'],['Cell B','independent copy'],['Global layer','thin routing']],['Tenant is assigned to one stable cell.','Request routing sends its work to that self-contained compute and data slice.','A failure in Cell A does not consume Cell B resources.','Global layer manages placement without joining every data-plane operation.']],
    ['Shuffle sharding',[['Tenant ID','stable input'],['Shard chooser','random subset'],['Worker subset','tenant pool'],['Failure','bounded overlap']],['Stable tenant identity seeds selection.','Chooser assigns a small pseudo-random subset from the fleet.','Tenant requests use only that subset.','One bad tenant or worker set overlaps with few other tenants, bounding impact.']],
    ['Consistent hashing',[['Key','hash position'],['Hash ring','ordered tokens'],['Owner node','next token'],['Membership change','limited movement']],['Key hashes to a point on a shared ring.','Clockwise token ownership selects its node and replicas.','Reads and writes route through the current ring epoch.','Adding or removing a node moves only adjacent token ranges.']],
    ['Rendezvous hashing',[['Key','stable bytes'],['Candidate nodes','membership set'],['Hash scores','key + node'],['Owners','top scores']],['Router obtains one versioned candidate-node set.','It hashes the key with every eligible node identity.','Scores form a deterministic ranking for that key.','Highest-scoring nodes own the key; membership changes affect limited winners.']],
    ['Gossip protocols',[['Node A','local membership'],['Peer sample','random nodes'],['Gossip exchange','merge versions'],['Cluster','eventual convergence']],['Node updates its local membership or state version.','Periodically it selects a small random peer sample.','Peers exchange and merge newer information.','Repeated fan-out spreads updates cluster-wide despite individual message loss.']],
    ['Merkle trees',[['Replica keys','range leaves'],['Merkle root','summary'],['Peer comparison','walk mismatch'],['Repair','sync divergent range']],['Each replica deterministically hashes key ranges into leaves.','Parent hashes summarize the complete dataset.','Peers skip matching branches and descend only through mismatches.','They transfer exact divergent ranges and rebuild affected hashes.']],
    ['CRDTs',[['Replica A','operation A'],['Replica B','operation B'],['Network heal','exchange'],['Merge law','converged value']],['Replicas apply locally valid CRDT operations while disconnected.','Concurrent updates retain algebraic metadata needed for merge.','After communication resumes, states or operations exchange in any order.','Merge laws make duplicates and order irrelevant, yielding convergence.']],
    ['Vector clocks',[['Writer A','{A:1}'],['Writer B','{B:1}'],['Comparator','component order'],['Merge','{A:1,B:1}']],['Each writer increments its own vector component.','Independent writes create incomparable vectors.','Comparator detects concurrency because neither vector dominates.','Resolver merges values and records a vector descending from both.']],
    ['Hybrid logical clocks',[['Physical clock','wall time p'],['Logical counter','c'],['Message receive','merge p,c'],['HLC timestamp','causal + readable']],['Local event starts from current physical time.','Logical counter breaks ties when physical time does not advance.','Receiver merges local, physical, and received timestamp components.','Result preserves causality while staying close to wall time.']],
    ['Quorum systems',[['Replica set','N members'],['Write quorum','W acknowledgments'],['Read quorum','R responses'],['Intersection','shared evidence']],['Coordinator selects replica subsets under one quorum configuration.','Write completes only after W durable acknowledgments.','Read gathers R versions and reconciles them.','When required, quorum intersection ensures a read meets evidence of prior writes.']],
    ['Consensus',[['Replicas','different proposals'],['Leader/round','order candidate'],['Quorum','accept'],['Committed log','single history']],['Replicas begin with potentially different proposed commands.','A protocol round establishes one eligible proposal and order.','Intersecting quorum durably accepts the decision.','All healthy replicas eventually apply the same committed history.']],
    ['Paxos',[['Proposer','prepare ballot n'],['Acceptors','promise'],['Proposal','accepted value'],['Learners','chosen value']],['Proposer sends prepare with a new ballot number.','Quorum promises not to accept older ballots and reports prior accepted values.','Proposer must carry the highest prior value, then requests acceptance.','Quorum acceptance chooses the value and learners apply it.']],
    ['Raft',[['Followers','current term'],['Candidate','request votes'],['Leader','append log'],['Quorum','commit index']],['Election timeout makes a follower campaign in a higher term.','Majority grants votes only to an up-to-date candidate.','Leader appends commands and replicates ordered entries.','Majority acknowledgment advances commit index and state machines apply.']],
    ['Fencing tokens',[['Lock service','issue token 41'],['Old holder','paused with 41'],['New holder','token 42'],['Resource','reject 41']],['First holder obtains monotonically increasing token 41.','It pauses long enough for ownership to expire.','New holder obtains token 42 and begins protected work.','Resource remembers 42 and rejects delayed writes carrying stale token 41.']],
    ['Leases',[['Coordinator','lease epoch 7'],['Holder','renew before expiry'],['Pause/partition','renewal lost'],['Successor','epoch 8 fenced']],['Coordinator grants bounded ownership with epoch 7.','Healthy holder renews while using epoch 7 on every write.','Pause or partition prevents renewal, so authority expires.','Successor receives epoch 8 and resources reject any returning epoch 7 work.']],
    ['Idempotency',[['Command','stable intent ID'],['State machine','current state'],['First execution','transition'],['Retry','same final state']],['Caller labels one logical intent consistently across attempts.','Handler checks current state and prior completion evidence.','First execution performs the allowed state transition.','Repeated execution returns the same outcome without another semantic effect.']],
    ['Exactly-once semantics',[['Input log','record E'],['Transaction','state + output'],['Checkpoint record','offset E'],['Replay guard','already committed']],['Processor reads record E without yet advancing durable progress.','One transaction writes state and any participating output.','The same commit records that E is consumed.','After failure, the replay guard sees committed progress and prevents a duplicate bounded effect.']],
    ['Transactional outbox',[['Business command','domain mutation'],['Database transaction','state + outbox'],['Relay','publish event E'],['Consumer','dedupe E']],['Service begins one local transaction for the business command.','Domain rows and outbox event E commit atomically.','Relay repeatedly publishes unmarked outbox rows until acknowledged.','Consumers deduplicate E, after which the outbox can be marked delivered.']],
    ['Sagas',[['Coordinator','saga state'],['Service A','local commit'],['Service B','failure'],['Compensation A','semantic undo']],['Coordinator durably records the saga and next command.','Service A commits its idempotent local transaction.','Service B cannot complete, and the failure is recorded.','Coordinator invokes A compensation and records the final saga outcome.']],
    ['Event sourcing',[['Command','validated intent'],['Event store','append fact'],['Projection','fold events'],['Read model','current view']],['Command handler loads prior events and checks domain invariants.','A new immutable fact appends with expected stream version.','Projectors consume events in order and update derived state.','Reads use the projection, which can be rebuilt by replay.']],
    ['CQRS',[['Command API','write intent'],['Write model','invariants'],['Event/projection','asynchronous update'],['Read model','query optimized']],['Command enters a model designed around domain invariants.','Successful transition persists state and publishes durable change.','Projection transforms changes into query-oriented representations.','Query API serves the read model while exposing or tolerating projection lag.']],
    ['Backpressure',[['Producer','incoming rate'],['Queue','growing depth'],['Consumer','finite capacity'],['Feedback','slow/reject']],['Producer sends work faster than consumers can sustain.','Queue depth or latency crosses a configured pressure threshold.','Consumer or intermediary exposes reduced demand upstream.','Producer slows, buffers within bounds, or rejects instead of growing without limit.']],
    ['Load shedding',[['Incoming work','over capacity'],['Admission policy','priority + cost'],['Rejected work','fast failure'],['Protected path','critical traffic']],['System detects saturation before accepting more expensive work.','Admission policy ranks requests by priority, tenant, and estimated cost.','Excess lower-value requests fail quickly with retry guidance.','Reserved capacity continues serving critical traffic and recovery operations.']],
    ['Hedged requests',[['Primary request','start at t0'],['Hedge timer','tail threshold'],['Replica B','duplicate attempt'],['Winner','cancel loser']],['Primary attempt starts against one eligible replica.','If it exceeds a delay threshold, a hedge budget permits another attempt.','Duplicate goes to an independent replica with the same idempotent intent.','First valid response wins and remaining work is cancelled or ignored.']],
    ['Adaptive throttling',[['Signals','latency + errors'],['Controller','capacity estimate'],['Limiter','dynamic permits'],['Traffic','admit or reject']],['System continuously measures latency, failures, and saturation.','Controller updates a smoothed estimate of safe concurrency or rate.','Limiter raises capacity cautiously and cuts it quickly under overload.','Requests are admitted, queued, or rejected using the current limit.']],
    ['Cache stampede prevention',[['Hot key','near expiry'],['Requests','concurrent miss'],['Single-flight owner','one refresh'],['Cache','versioned refill']],['A hot entry approaches expiry with many concurrent readers.','Jitter or early refresh avoids synchronized hard expiration.','Single-flight elects one loader while peers wait or use bounded stale data.','Loader writes a versioned result so an older refill cannot overwrite newer data.']],
    ['Hot-key mitigation',[['Hot key','skewed demand'],['Detector','rate + saturation'],['Mitigation','replicate/salt/coalesce'],['Backend','balanced load']],['Telemetry identifies one key dominating a shard or dependency.','System classifies whether reads, writes, or fan-out cause the heat.','Chosen mitigation spreads reads, batches work, or splits associative state.','Routing and merge logic preserve correctness while load becomes bounded.']],
    ['Approximate data structures',[['Large stream','many items'],['Hash functions','compact update'],['Sketch/filter','bounded memory'],['Estimate','error bound']],['Each item is transformed by deterministic hash functions.','Compact counters or bits update instead of storing every item.','Queries infer membership, count, or frequency from the structure.','Caller interprets the result with known false-positive or error bounds.']],
    ['Stream processing',[['Partitioned log','ordered records'],['Operators','transform + state'],['Checkpoint record','state + offsets'],['Sink','materialized results']],['Sources append records to ordered partitions.','Parallel operators transform records and update keyed state.','The checkpoint record captures recoverable state aligned with source progress.','Sink receives idempotent or transactional updates and processing resumes after failure.']],
    ['Watermarks',[['Input partitions','event-time progress'],['Coordinator','minimum estimate'],['Window state','await completeness'],['Window results','emit + revise']],['Each partition reports progress despite out-of-order arrival.','Coordinator derives a global or keyed watermark with idle handling.','Windows retain state until the watermark passes their boundary.','Results emit, while permitted late events update or retract them.']],
    ['Distributed snapshots',[['Processes','local state'],['Marker','snapshot boundary'],['Channels','in-flight messages'],['Global snapshot','consistent cut']],['Initiator records local state and sends marker messages.','A process records state when it sees its first marker.','It records messages on other channels until their markers arrive.','Combined process and channel records form a consistent global cut.']],
    ['Multi-region active-active',[['Region A','local reads/writes'],['Region B','local reads/writes'],['Replication','cross-region async'],['Resolver','converged global state']],['Users route to a nearby healthy region.','Both regions accept writes under explicitly mergeable invariants.','Updates replicate across the high-latency inter-region link.','Concurrent versions resolve deterministically and regional failure shifts traffic.']],
    ['Conflict resolution',[['Concurrent version A','intent A'],['Concurrent version B','intent B'],['Resolver','domain rule'],['Merged version','descends from both']],['Version metadata detects that neither update causally follows the other.','Resolver receives complete competing values and context.','Domain rule chooses, merges, or escalates without relying on arrival order.','Resolved version records ancestry from both and replicates.']],
    ['Disaster recovery',[['Primary region','failed'],['Durable backup/replica','RPO point'],['Recovery environment','restore dependencies'],['Traffic','resume by RTO']],['Failure declaration stops unsafe writes and chooses the recovery point.','Data restores or promotes to the latest point allowed by RPO.','Identity, configuration, dependencies, and capacity bootstrap in tested order.','Validation gates traffic resumption within RTO and later failback.']],
    ['Cell isolation',[['Tenant','cell mapping'],['Cell boundary','local data + compute'],['Cell failure','contained'],['Other cells','healthy']],['Stable mapping sends each tenant to one cell.','Cell owns its quotas, queues, compute, and data dependencies.','Overload or failure consumes only that cell allocation.','Other cells continue independently while routing quarantines the failed cell.']],
    ['Blast-radius management',[['Change/failure','initial scope'],['Boundary','cell/ring/quota'],['Guardrail','detect impact'],['Containment','pause + isolate']],['A change or fault begins within the smallest practical cohort.','Resource and trust boundaries prevent uncontrolled spread.','Guardrails detect technical or business impact quickly.','Automation pauses rollout, sheds work, or isolates the affected scope.']],
    ['Control plane / data plane separation',[['Operator/API','desired state'],['Control plane','validate + order'],['Data plane','cached version'],['Requests','local serving']],['Management request proposes a desired-state change.','Control plane validates, persists, and publishes an ordered version.','Data plane adopts it asynchronously while retaining last-known-good state.','Serving remains local and available during control-plane interruption.']],
    ['Data plane scalability',[['Traffic','partition key'],['Router','local ownership'],['Data shards','parallel service'],['Hotspot control','split/replicate']],['Request maps to an ownership partition without global coordination.','Router sends it to the responsible shard or cell.','Independent shards scale throughput horizontally.','Skew detection splits, replicates, or isolates hotspots before saturation.']],
    ['Control plane consistency',[['Admin change','proposed config'],['Consensus store','ordered commit'],['Distribution','versioned rollout'],['Agents','acknowledged state']],['Admin submits a validated and authenticated change.','Strongly consistent store assigns one durable order and version.','Distributor fans out that immutable version with staged policy.','Agents apply idempotently and report version, errors, or rollback state.']]
  ]
};

for (const chapter of window.SYSTEM_DESIGN_CHAPTERS) {
  const chapterSpecs = SYSTEM_DESIGN_VISUAL_SPECS_3[chapter.id];
  if (!chapterSpecs) continue;
  const specsByName = new Map(chapterSpecs.map(([name,nodes,stepTexts])=>[name,{nodes,stepTexts}]));
  for (const group of chapter.groups) {
    for (const concept of group.concepts) {
      const spec = specsByName.get(concept.name);
      if (!spec) throw new Error(`Missing visual for ${chapter.id}: ${concept.name}`);
      concept.visual = {
        nodes:spec.nodes,
        steps:spec.stepTexts.map((text,index)=>[index,[...Array(index).keys()],text])
      };
    }
  }
}

const SYSTEM_DESIGN_DIAGRAM_KIND_3 = name => {
    if (name === 'L4 vs L7 load balancing') return 'comparison';
    if (/migration|deploy|rollout|rotation|Backfill|Expand-and-contract|Cutover|Rollback|TTL|Expiration|windows|Scheduled|Lease|Watermark|Event time|Processing time|Clock skew/.test(name)) return 'timeline';
    if (/balanc|discovery|mesh|Sidecars|traffic|routing|Cell|shard|hash|Gossip|region|isolation|blast-radius|data plane|control plane/i.test(name)) return 'topology';
    if (/OAuth|OIDC|JWT|token|identity|authentication|authorization|OBO|deputy|Idempot|dedup|Sequence|Event IDs|outbox|Sagas|polling|SSE|WebSockets/i.test(name)) return 'sequence';
    if (/Metrics|Logs|Trace IDs|Span IDs|graphs|profiling|Vector|CRDT|Merkle|Quorum|clock|data structures|snapshots/i.test(name)) return 'structure';
    return 'architecture';
  };

  const SYSTEM_DESIGN_COMPONENT_TYPE_3 = (label,detail) => {
    const value = `${label} ${detail}`.toLowerCase();
    if (/client|browser|user|caller|request|producer|admin|operator/.test(value)) return 'client';
    if (/gateway|proxy|router|balancer|edge|facade|mesh/.test(value)) return 'gateway';
    if (/cache/.test(value)) return 'cache';
    if (/queue|pub\/sub|broker|stream|channel|log/.test(value)) return 'queue';
    if (/replica|region|cell|shard|instance|member|fleet/.test(value)) return 'replica';
    if (/database|store|table|domain rows|read model|record/.test(value)) return 'database';
    if (/storage|snapshot|certificate|credential|token|policy bundle/.test(value)) return 'storage';
    if (/index|tree|hash|ring|vector|bucket|partition map|registry/.test(value)) return 'index';
    if (/clock|time|watermark|lease|heartbeat|expiry|deadline/.test(value)) return 'clock';
    if (/bit|sketch|filter|approximate/.test(value)) return 'bitset';
    if (/worker|processor|operator|consumer|relay|reaper|projector|scheduler|loader/.test(value)) return 'worker';
    if (/control|policy|issuer|authorization server|identity provider|validator|resolver|coordinator|monitor|engine| ca|authority|attestor/.test(value)) return 'control';
    if (/service|api|backend|application|workload|server/.test(value)) return 'service';
    return 'node';
  };

  const SYSTEM_DESIGN_LAYOUTS_3 = {
    architecture:[[10,50],[36,25],[64,75],[90,50],[50,10],[50,90]],
    topology:[[50,10],[12,42],[88,42],[30,88],[70,88],[50,55]],
    sequence:[[8,50],[29,50],[50,50],[71,50],[92,50],[50,82]],
    timeline:[[8,50],[29,50],[50,50],[71,50],[92,50],[50,82]],
    structure:[[12,18],[72,18],[12,82],[72,82],[42,50],[92,50]],
    comparison:[[8,50],[38,20],[38,80],[92,50],[65,20],[65,80]]
  };

  const SYSTEM_DESIGN_LINK_LABEL_3 = (from,to) => {
    const actions = {
      client:'Return to',
      gateway:'Send to',
      service:'Call',
      database:'Commit at',
      replica:'Replicate to',
      cache:'Cache in',
      queue:'Publish through',
      worker:'Dispatch to',
      control:'Coordinate via',
      storage:'Persist in',
      index:'Resolve through',
      node:'Advance to',
      clock:'Wait on',
      bitset:'Update'
    };
    const base = `${actions[to[3]]} ${to[1]}`;
    const detailed = `${base}: ${to[2]}`;
    return detailed.length <= 55 ? detailed : base;
  };

  const SYSTEM_DESIGN_DIAGRAM_3 = (concept,chapterId) => {
    const kind = SYSTEM_DESIGN_DIAGRAM_KIND_3(concept.name);
    const layout = SYSTEM_DESIGN_LAYOUTS_3[kind];
    const components = concept.visual.nodes.map(([label,detail],index)=>[
      `c${index}`,
      label,
      detail,
      SYSTEM_DESIGN_COMPONENT_TYPE_3(label,detail),
      layout[index][0],
      layout[index][1]
    ]);
    const links = components.slice(1).map((component,index)=>[
      components[index][0],
      component[0],
      SYSTEM_DESIGN_LINK_LABEL_3(components[index],component)
    ]);
    const riskPattern = /fail|reject|stale|expired|comprom|diverg|overload|lost|timeout|gap|conflict|late|pause|partition|unsafe|risk/i;
    const frames = concept.visual.steps.map((step,index)=>{
      const states = {};
      for (let i=0;i<components.length;i++) {
        if (i < Math.min(index,components.length)) states[`c${i}`] = 'done';
      }
      const active = Math.min(step[0],components.length-1);
      states[`c${active}`] = riskPattern.test(step[2]) ? 'risk' : 'active';
      return [index === 0 ? -1 : Math.min(index-1,links.length-1),states];
    });
    return {kind,components,links,frames};
  };

  for (const chapter of window.SYSTEM_DESIGN_CHAPTERS) {
    if (!SYSTEM_DESIGN_VISUAL_SPECS_3[chapter.id]) continue;
    for (const group of chapter.groups) {
      for (const concept of group.concepts) {
        concept.diagram = SYSTEM_DESIGN_DIAGRAM_3(concept,chapter.id);
      }
    }
  }

  const SYSTEM_DESIGN_REALTIME_DIAGRAMS_3 = {
    'Long polling':{
      kind:'sequence',
      components:[
        ['client','Browser / mobile client','reconnect loop','client',8,50],
        ['gateway','API gateway','holds HTTP connection','gateway',28,50],
        ['api','Long-poll API','waiter per request','service',50,50],
        ['events','Event queue','next matching event','queue',72,24],
        ['timer','Request deadline','timeout release','clock',72,76]
      ],
      links:[
        ['client','gateway','GET /events'],
        ['gateway','api','forward and hold request'],
        ['events','api','event completes waiter'],
        ['timer','api','timeout completes waiter'],
        ['api','client','event or timeout response'],
        ['client','gateway','immediate reconnect']
      ],
      frames:[
        [0,{client:'active'}],
        [1,{client:'done',gateway:'active',api:'active'}],
        [2,{client:'done',gateway:'done',api:'active',events:'active',timer:'active'}],
        [4,{api:'done',events:'done',timer:'done',client:'active'}],
        [5,{client:'active',gateway:'active'}]
      ]
    },
    'Server-Sent Events (SSE)':{
      kind:'architecture',
      components:[
        ['client','Browser EventSource','automatic reconnect','client',8,50],
        ['proxy','Streaming proxy','buffering disabled','gateway',28,50],
        ['service','SSE service','one-way HTTP stream','service',50,50],
        ['pubsub','Pub/sub topic','fan-out events','queue',72,24],
        ['cursor','Resume cursor','Last-Event-ID position','storage',72,76]
      ],
      links:[
        ['client','proxy','GET Accept: text/event-stream'],
        ['proxy','service','open streaming response'],
        ['pubsub','service','publish event'],
        ['service','client','id + event + data frames'],
        ['client','proxy','reconnect with Last-Event-ID'],
        ['cursor','service','resume after cursor']
      ],
      frames:[
        [0,{client:'active',proxy:'active'}],
        [1,{proxy:'done',service:'active'}],
        [3,{pubsub:'done',service:'active',client:'active'}],
        [4,{client:'risk',proxy:'active',cursor:'active'}],
        [5,{cursor:'done',service:'active',client:'active'}]
      ]
    },
    'WebSockets':{
      kind:'topology',
      components:[
        ['client','WebSocket client','persistent duplex socket','client',8,50],
        ['gateway','WebSocket gateway','Upgrade + sticky route','gateway',30,50],
        ['nodeA','WebSocket node A','owns live connection','service',54,24],
        ['nodeB','WebSocket node B','horizontal peer','service',54,76],
        ['registry','Connection registry','client -> owner node','index',78,24],
        ['pubsub','Pub/sub backbone','cross-node messages','queue',78,76]
      ],
      links:[
        ['client','gateway','HTTP Upgrade'],
        ['gateway','nodeA','101 Switching Protocols'],
        ['nodeA','client','full-duplex frames'],
        ['nodeA','registry','register connection owner'],
        ['nodeB','registry','lookup destination owner'],
        ['nodeB','pubsub','publish cross-node frame'],
        ['pubsub','nodeA','fan-out to owning node'],
        ['nodeA','client','ping/pong + bounded send queue']
      ],
      frames:[
        [0,{client:'active',gateway:'active'}],
        [3,{gateway:'done',nodeA:'active',registry:'active'}],
        [2,{client:'active',nodeA:'active'}],
        [6,{nodeB:'active',registry:'done',pubsub:'active',nodeA:'active'}],
        [7,{nodeA:'active',client:'active'}],
        [-1,{client:'risk',nodeA:'done',registry:'active'}]
      ]
    }
  };

  const realtimeConcepts = window.SYSTEM_DESIGN_CHAPTERS
    .find(chapter=>chapter.id === 'realtime-connections')
    .groups.flatMap(group=>group.concepts);
  for (const concept of realtimeConcepts) {
    if (SYSTEM_DESIGN_REALTIME_DIAGRAMS_3[concept.name]) {
      concept.diagram = SYSTEM_DESIGN_REALTIME_DIAGRAMS_3[concept.name];
    }
  }

const SYSTEM_DESIGN_IDENTITY_DIAGRAM_SPECS_3 = {
  'OAuth 2.0':['architecture',[
    ['user','User agent','resource owner session','client',14,22],
    ['client','OAuth client','redirect URI + PKCE','service',38,22],
    ['authorize','Authorization endpoint','login and consent','control',62,18],
    ['token','Token endpoint','code exchange','control',62,52],
    ['api','Resource server','scope enforcement','service',86,52],
    ['keys','Signing keys','issuer key material','storage',38,78]
  ],[
    ['user','client','start protected action'],
    ['client','authorize','authorize + PKCE challenge'],
    ['authorize','user','authenticate and consent'],
    ['authorize','client','redirect with code'],
    ['client','token','exchange code + verifier'],
    ['keys','token','sign access token'],
    ['client','api','Bearer access token']
  ],[1,3,4,6]],
  'OIDC':['architecture',[
    ['browser','User agent','interactive login','client',14,20],
    ['rp','OIDC client','relying party','service',38,20],
    ['idp','Identity provider','authorize endpoint','control',62,18],
    ['token','Token endpoint','ID/access tokens','control',62,52],
    ['userinfo','UserInfo endpoint','profile claims','service',86,52],
    ['session','Client session','secure cookie','storage',38,80]
  ],[
    ['browser','rp','request sign-in'],
    ['rp','idp','authorize + nonce + PKCE'],
    ['idp','browser','authenticate user'],
    ['idp','rp','redirect authorization code'],
    ['rp','token','exchange code'],
    ['rp','userinfo','access token'],
    ['rp','session','create local session']
  ],[1,3,4,6]],
  'JWT':['structure',[
    ['client','API client','presents bearer token','client',14,50],
    ['auth','Authorization server','claims issuer','control',38,18],
    ['vault','Key vault','private signing key','storage',62,18],
    ['jwt','Signed JWT','header + claims + signature','storage',50,50],
    ['jwks','JWKS endpoint','public verification keys','service',62,80],
    ['api','Resource server','claim validation','service',86,50]
  ],[
    ['auth','vault','request signing operation'],
    ['vault','auth','return JWT signature'],
    ['auth','jwt','issue signed claims'],
    ['client','api','send JWT'],
    ['api','jwks','fetch key by kid'],
    ['jwks','api','return public key'],
    ['jwt','api','verify signature and claims']
  ],[0,2,3,6]],
  'JWKS':['architecture',[
    ['vault','Key vault / HSM','active public keys','storage',14,20],
    ['issuer','Token issuer','signs with key ID','control',38,20],
    ['endpoint','JWKS endpoint','published JWK set','service',62,20],
    ['cache','Validator JWKS cache','TTL + refresh','cache',62,78],
    ['api','Protected API','token validator','service',86,50],
    ['token','Access token','header contains kid','storage',38,72]
  ],[
    ['vault','issuer','provide signing handle'],
    ['issuer','endpoint','publish public JWK'],
    ['issuer','token','sign token with kid'],
    ['token','api','present signed token'],
    ['api','cache','resolve key by kid'],
    ['cache','endpoint','refresh JWK set'],
    ['cache','api','return verification key']
  ],[0,1,3,6]],
  'Token introspection':['sequence',[
    ['client','API client','opaque access token','client',14,22],
    ['api','Resource server','token enforcement','service',38,22],
    ['cache','Introspection cache','short active TTL','cache',62,18],
    ['introspect','Introspection endpoint','active token state','control',62,60],
    ['registry','Token registry','claims + revocation','database',38,82],
    ['resource','Protected resource','authorized data','storage',86,60]
  ],[
    ['client','api','send opaque token'],
    ['api','cache','check active token'],
    ['cache','introspect','cache miss lookup'],
    ['introspect','registry','read current token state'],
    ['registry','introspect','return claims + active'],
    ['introspect','api','introspection response'],
    ['api','resource','allow scoped operation']
  ],[0,2,5,6]],
  'Access-token validation':['architecture',[
    ['client','API client','access token holder','client',14,50],
    ['api','Resource server','validation pipeline','service',38,50],
    ['metadata','Issuer metadata','trusted issuer + JWKS URI','control',38,18],
    ['jwks','JWKS cache','key selected by kid','cache',62,18],
    ['claims','Claims policy','aud + exp + scopes','control',62,80],
    ['resource','Protected resource','domain operation','storage',86,50]
  ],[
    ['client','api','Authorization: Bearer token'],
    ['api','metadata','verify trusted issuer'],
    ['api','jwks','verify token signature'],
    ['jwks','metadata','refresh public keys'],
    ['api','claims','validate audience and lifetime'],
    ['claims','api','return scope decision'],
    ['api','resource','execute authorized action']
  ],[0,2,4,6]],
  'Edge token validation':['topology',[
    ['client','External client','untrusted token','client',14,50],
    ['edge','API gateway','edge validator','gateway',38,50],
    ['jwks','Edge JWKS cache','issuer keys','cache',38,18],
    ['channel','Protected service channel','mTLS context','gateway',62,50],
    ['service','Internal service','resource authorization','service',86,50],
    ['policy','Service policy','action + resource rules','control',62,82]
  ],[
    ['client','edge','send bearer token'],
    ['edge','jwks','verify issuer signature'],
    ['edge','channel','forward verified identity'],
    ['channel','service','deliver over mTLS'],
    ['service','policy','check resource permission'],
    ['policy','service','allow or deny action']
  ],[0,1,3,5]],
  'Token caching':['architecture',[
    ['app','Calling application','needs API token','client',14,24],
    ['library','Token acquisition library','cache key builder','service',38,24],
    ['cache','Encrypted token cache','token + expiry','cache',62,18],
    ['lock','Single-flight lock','one refresh owner','control',62,80],
    ['issuer','Token endpoint','new access token','control',38,80],
    ['api','Downstream API','target audience','service',86,50]
  ],[
    ['app','library','request audience + scopes'],
    ['library','cache','lookup valid token'],
    ['library','lock','claim refresh on miss'],
    ['lock','issuer','acquire fresh token'],
    ['issuer','cache','store encrypted token'],
    ['library','api','call with cached token']
  ],[0,1,3,5]],
  'Key rotation':['timeline',[
    ['hsm','Key vault / HSM','old + new private keys','storage',14,22],
    ['issuer','Token issuer','active signing key','control',38,22],
    ['jwks','JWKS endpoint','overlapping public keys','service',62,18],
    ['cache','Validator cache','old + new keys','cache',62,80],
    ['api','Resource server','signature validator','service',86,50],
    ['old','Old tokens','valid until expiry','storage',38,80]
  ],[
    ['hsm','jwks','publish new public key'],
    ['cache','jwks','refresh overlapping set'],
    ['issuer','hsm','sign with new key'],
    ['issuer','api','send newly signed token'],
    ['old','api','validate old token'],
    ['jwks','cache','remove retired key']
  ],[0,1,2,5]],
  'Credential rotation':['timeline',[
    ['vault','Secret vault','v1 + v2 credentials','storage',14,20],
    ['issuer','Credential issuer','provisions v2','control',38,20],
    ['service','Calling service','staged credential client','service',38,78],
    ['target','Target service','accepts overlap','service',86,50],
    ['telemetry','Usage telemetry','v1/v2 observations','storage',62,80],
    ['revoke','Revocation control','disable v1','control',62,18]
  ],[
    ['issuer','vault','store credential v2'],
    ['vault','service','deliver v2 securely'],
    ['service','target','authenticate with v2'],
    ['target','telemetry','record credential version'],
    ['telemetry','revoke','confirm no v1 use'],
    ['revoke','target','remove v1 trust']
  ],[0,1,2,5]],
  'Revocation':['architecture',[
    ['signal','Security signal','logout or compromise','client',14,20],
    ['authority','Revocation authority','records invalidation','control',38,20],
    ['store','Revocation store','session/key/token status','database',62,18],
    ['push','Revocation feed','cache invalidations','queue',62,80],
    ['cache','Enforcement cache','current deny state','cache',38,80],
    ['api','Protected API','rejects revoked use','service',86,50]
  ],[
    ['signal','authority','request early invalidation'],
    ['authority','store','persist revoked state'],
    ['store','push','publish revocation event'],
    ['push','cache','invalidate active entry'],
    ['api','cache','check current deny state'],
    ['cache','api','return revoked decision']
  ],[0,1,3,5]],
  'Workload identity':['topology',[
    ['workload','Service workload','runtime process','service',14,52],
    ['platform','Platform attestor','pod/VM evidence','control',38,18],
    ['issuer','Identity issuer','short-lived credential','control',62,18],
    ['agent','Local identity agent','credential delivery','service',38,82],
    ['peer','Peer service','trusts workload issuer','service',86,52],
    ['policy','Peer authorization','workload permissions','control',62,82]
  ],[
    ['workload','agent','request local identity'],
    ['agent','platform','submit runtime evidence'],
    ['platform','issuer','attest workload subject'],
    ['issuer','agent','issue short-lived credential'],
    ['workload','peer','present workload identity'],
    ['peer','policy','authorize service action']
  ],[0,2,4,5]],
  'Workload identity federation':['architecture',[
    ['workload','External workload','platform identity','service',14,22],
    ['external','External issuer','signed assertion','control',38,18],
    ['exchange','Federation endpoint','token exchange','control',62,18],
    ['trust','Federation policy','issuer + subject mapping','storage',62,80],
    ['token','Local access token','short-lived scope','storage',38,82],
    ['resource','Cloud resource','local authorization','service',86,50]
  ],[
    ['workload','external','request signed assertion'],
    ['external','workload','return audience assertion'],
    ['workload','exchange','exchange external assertion'],
    ['exchange','trust','match issuer and subject'],
    ['exchange','token','issue local token'],
    ['token','resource','call with federated identity']
  ],[0,2,3,5]],
  'SPIFFE':['topology',[
    ['workload','Workload A','process identity request','service',14,52],
    ['agent','SPIFFE Workload API','local credential socket','service',38,78],
    ['attestor','Workload attestor','selectors + node evidence','control',38,18],
    ['issuer','SPIFFE issuer','trust-domain CA','control',62,18],
    ['bundle','Trust bundle','CA public roots','storage',62,82],
    ['peer','Peer workload B','SPIFFE policy + mTLS','service',86,52]
  ],[
    ['workload','agent','request SPIFFE identity'],
    ['agent','attestor','verify workload selectors'],
    ['attestor','issuer','authorize SPIFFE ID'],
    ['issuer','agent','issue short-lived SVID'],
    ['bundle','peer','supply trust-domain roots'],
    ['workload','peer','mTLS with SPIFFE IDs']
  ],[0,2,3,5]],
  'SPIRE':['topology',[
    ['node','Compute node','attestable platform','node',14,20],
    ['agent','SPIRE agent','node + workload attestor','service',38,50],
    ['server','SPIRE server','registration entries','control',62,18],
    ['ca','SPIRE CA','signing authority','storage',86,18],
    ['workload','Local workload','Workload API client','service',14,80],
    ['peer','Peer workload','validates SVID','service',86,80]
  ],[
    ['agent','server','attest node identity'],
    ['workload','agent','present workload selectors'],
    ['agent','server','request registered SPIFFE ID'],
    ['server','ca','sign SVID'],
    ['agent','workload','deliver rotated SVID'],
    ['workload','peer','establish SPIFFE mTLS']
  ],[0,2,3,5]],
  'SVID':['structure',[
    ['workload','Workload process','SPIFFE ID subject','service',14,52],
    ['agent','Workload API','SVID delivery','service',38,78],
    ['issuer','Trust-domain CA','short-lived signer','control',38,18],
    ['svid','X.509 or JWT SVID','identity document','storage',62,18],
    ['bundle','Trust bundle','verification roots','storage',62,82],
    ['peer','Peer workload','identity authorization','service',86,52]
  ],[
    ['workload','agent','request identity document'],
    ['agent','issuer','request SPIFFE ID SVID'],
    ['issuer','svid','sign short-lived SVID'],
    ['agent','workload','deliver SVID + bundle'],
    ['workload','peer','present SVID'],
    ['bundle','peer','verify trust-domain issuer']
  ],[0,2,3,5]],
  'mTLS':['architecture',[
    ['client','Client workload','client certificate','service',14,52],
    ['clientKey','Client key store','private key','storage',38,18],
    ['server','Server workload','server certificate','service',86,52],
    ['serverKey','Server key store','private key','storage',62,18],
    ['ca','Trusted CA bundle','chain roots','storage',50,82],
    ['policy','Peer identity policy','authorized subject','control',62,82]
  ],[
    ['client','server','ClientHello + certificate'],
    ['server','client','server certificate + proof'],
    ['clientKey','client','sign handshake proof'],
    ['serverKey','server','sign handshake proof'],
    ['ca','client','validate server chain'],
    ['ca','server','validate client chain'],
    ['server','policy','authorize peer identity']
  ],[0,1,5,6]],
  'PKI':['structure',[
    ['root','Offline root CA','trust anchor','storage',50,16],
    ['intermediate','Intermediate CA','bounded issuer','control',50,42],
    ['ra','Registration authority','identity proofing','control',20,42],
    ['subject','Workload / user','key pair holder','client',20,80],
    ['cert','Identity certificate','subject + public key','storage',72,42],
    ['relying','Relying service','chain validator','service',84,80]
  ],[
    ['root','intermediate','sign issuer certificate'],
    ['subject','ra','submit enrollment proof'],
    ['ra','intermediate','approve certificate request'],
    ['intermediate','cert','sign identity certificate'],
    ['cert','subject','deliver certificate'],
    ['subject','relying','present certificate + proof'],
    ['root','relying','validate certificate chain']
  ],[0,2,3,6]],
  'Certificate rotation':['timeline',[
    ['workload','Service workload','current certificate','service',14,52],
    ['agent','Certificate agent','renewal controller','worker',38,78],
    ['ca','Certificate authority','identity validation','control',38,18],
    ['old','Old certificate','valid during overlap','storage',62,18],
    ['new','New certificate','fresh key + lifetime','storage',62,82],
    ['peer','Peer validator','trusts overlap','service',86,52]
  ],[
    ['agent','ca','request renewal'],
    ['ca','new','issue replacement certificate'],
    ['agent','workload','install new certificate'],
    ['workload','peer','handshake with new cert'],
    ['old','peer','accept old during overlap'],
    ['agent','old','retire expired certificate']
  ],[0,1,3,5]],
  'Service-to-service authentication':['topology',[
    ['serviceA','Service A','calling workload','service',14,52],
    ['agent','Identity agent','short-lived credential','service',38,18],
    ['issuer','Workload issuer','trusted authority','control',62,18],
    ['channel','mTLS / token channel','proof in transit','gateway',38,82],
    ['serviceB','Service B','authenticator','service',86,52],
    ['trust','Trust metadata','issuer keys + roots','storage',62,82]
  ],[
    ['serviceA','agent','request workload credential'],
    ['agent','issuer','attest caller identity'],
    ['issuer','serviceA','issue bounded credential'],
    ['serviceA','channel','open authenticated call'],
    ['channel','serviceB','present caller proof'],
    ['trust','serviceB','validate trusted issuer']
  ],[0,2,4,5]],
  'Service-to-service authorization':['architecture',[
    ['caller','Service A principal','authenticated caller','service',14,52],
    ['pep','Service B PEP','enforcement point','gateway',38,52],
    ['pdp','Policy decision point','authorization engine','control',62,18],
    ['pip','Attribute provider','tenant + resource data','service',38,18],
    ['store','Policy store','service permissions','storage',62,82],
    ['resource','Service B resource','protected operation','service',86,52]
  ],[
    ['caller','pep','request action on resource'],
    ['pep','pip','load caller + resource facts'],
    ['pep','pdp','submit authorization query'],
    ['store','pdp','load policy version'],
    ['pdp','pep','return allow or deny'],
    ['pep','resource','enforce allowed action']
  ],[0,1,2,5]],
  'RBAC':['architecture',[
    ['principal','User / service principal','authenticated subject','client',14,52],
    ['pep','Policy enforcement point','request interceptor','gateway',38,52],
    ['pdp','RBAC decision point','role evaluation','control',62,18],
    ['roles','Role assignments','principal to role','database',38,18],
    ['perms','Permission catalog','role to actions','storage',62,82],
    ['resource','Protected resource','requested object','service',86,52]
  ],[
    ['principal','pep','request resource action'],
    ['pep','roles','load active role assignments'],
    ['roles','pdp','supply principal roles'],
    ['perms','pdp','map roles to permissions'],
    ['pdp','pep','return role decision'],
    ['pep','resource','enforce permitted action']
  ],[0,1,3,5]],
  'ABAC':['architecture',[
    ['subject','Authenticated subject','subject attributes','client',14,52],
    ['pep','Policy enforcement point','request context','gateway',38,52],
    ['pdp','ABAC decision point','expression evaluator','control',62,18],
    ['pip','Attribute providers','subject + environment','service',38,18],
    ['catalog','Resource catalog','owner + classification','database',62,82],
    ['resource','Protected resource','requested object','service',86,52]
  ],[
    ['subject','pep','request action'],
    ['pep','pip','fetch trusted attributes'],
    ['pep','catalog','fetch resource attributes'],
    ['pep','pdp','evaluate attribute policy'],
    ['pdp','pep','return contextual decision'],
    ['pep','resource','enforce decision']
  ],[0,1,3,5]],
  'Policy engines':['architecture',[
    ['caller','Application caller','actor + request','client',14,52],
    ['pep','Policy enforcement point','builds decision input','gateway',38,52],
    ['pdp','Policy engine','evaluates rules','control',62,18],
    ['bundle','Policy bundle store','versioned rules','storage',38,18],
    ['pip','Context provider','attributes + risk','service',62,82],
    ['resource','Protected service','enforced operation','service',86,52]
  ],[
    ['caller','pep','submit protected request'],
    ['pep','pip','gather decision context'],
    ['bundle','pdp','load signed policy bundle'],
    ['pep','pdp','query actor action resource'],
    ['pdp','pep','return decision + reason'],
    ['pep','resource','apply policy result']
  ],[0,1,3,5]],
  'Policy propagation':['topology',[
    ['author','Policy author','proposed rules','client',14,18],
    ['control','Policy control plane','validate + version','control',38,18],
    ['store','Policy repository','immutable bundles','storage',62,18],
    ['dist','Distribution service','staged fan-out','service',50,50],
    ['pepA','PEP cohort A','active version','gateway',30,82],
    ['pepB','PEP cohort B','next cohort','gateway',70,82]
  ],[
    ['author','control','submit policy change'],
    ['control','store','commit signed version'],
    ['store','dist','publish immutable bundle'],
    ['dist','pepA','roll out to canary PEPs'],
    ['pepA','control','report decision metrics'],
    ['dist','pepB','expand or roll back']
  ],[0,1,3,5]],
  'Distributed authorization':['topology',[
    ['user','User / workload','request principal','client',14,52],
    ['gateway','Gateway PEP','coarse boundary policy','gateway',34,20],
    ['serviceA','Service A PEP','domain authorization','service',54,20],
    ['serviceB','Service B PEP','resource authorization','service',86,52],
    ['pdp','Shared policy service','versioned decisions','control',54,82],
    ['audit','Decision audit log','linked policy trail','storage',34,82]
  ],[
    ['user','gateway','present identity + request'],
    ['gateway','serviceA','forward bounded context'],
    ['serviceA','pdp','authorize domain action'],
    ['serviceA','serviceB','call with delegation'],
    ['serviceB','pdp','authorize target resource'],
    ['pdp','audit','record decision chain']
  ],[0,1,3,5]],
  'Zero Trust':['topology',[
    ['subject','User + workload','explicit identity','client',14,52],
    ['edge','Access proxy','continuous enforcement','gateway',38,52],
    ['identity','Identity provider','authentication strength','control',38,18],
    ['context','Risk / device service','current posture','service',62,18],
    ['policy','Policy decision point','least privilege','control',62,82],
    ['resource','Protected resource','micro-segmented service','service',86,52]
  ],[
    ['subject','edge','request without network trust'],
    ['edge','identity','verify user + workload'],
    ['edge','context','fetch current risk posture'],
    ['edge','policy','evaluate contextual access'],
    ['policy','edge','return least-privilege grant'],
    ['edge','resource','open bounded session']
  ],[0,1,3,5]],
  'Trust boundaries':['topology',[
    ['external','External caller','lower assurance zone','client',14,52],
    ['edge','Public boundary','TLS + input validation','gateway',36,20],
    ['service','Trusted service zone','normalized request','service',62,20],
    ['data','Sensitive data zone','restricted records','database',86,52],
    ['egress','Egress boundary','destination control','gateway',62,82],
    ['audit','Boundary audit','crossing evidence','storage',36,82]
  ],[
    ['external','edge','cross public trust boundary'],
    ['edge','service','forward validated request'],
    ['service','data','authorize sensitive access'],
    ['service','egress','request outbound call'],
    ['egress','external','send sanitized response'],
    ['edge','audit','record boundary crossing']
  ],[0,1,2,5]],
  'Auditability':['architecture',[
    ['actor','User / workload','attributed principal','client',14,52],
    ['service','Protected service','sensitive action','service',38,52],
    ['policy','Policy engine','decision + version','control',38,18],
    ['collector','Audit collector','schema + redaction','worker',62,18],
    ['ledger','Immutable audit ledger','ordered retention','storage',62,82],
    ['investigator','Security investigator','authorized query','client',86,52]
  ],[
    ['actor','service','perform sensitive action'],
    ['service','policy','obtain policy decision'],
    ['service','collector','emit attributed audit event'],
    ['policy','collector','attach policy version'],
    ['collector','ledger','append tamper-evident record'],
    ['investigator','ledger','query decision history']
  ],[0,1,2,5]],
  'Delegated identity':['architecture',[
    ['user','User agent','original principal','client',14,20],
    ['client','Front-end client','user session','service',38,20],
    ['apiA','API A','delegating workload','service',38,80],
    ['sts','Security token service','delegation exchange','control',62,18],
    ['token','Delegated token','user + caller + scope','storage',62,80],
    ['apiB','API B','target resource','service',86,52]
  ],[
    ['user','client','start delegated operation'],
    ['client','apiA','send user access token'],
    ['apiA','sts','exchange user assertion'],
    ['sts','token','issue audience-bound token'],
    ['token','apiA','return delegated authority'],
    ['apiA','apiB','call with delegated token']
  ],[0,1,2,5]],
  'OBO':['architecture',[
    ['user','User','delegated principal','client',14,18],
    ['client','Client application','interactive token','service',38,18],
    ['apiA','API A','middle-tier caller','service',38,80],
    ['token','Token endpoint','OBO exchange','control',62,18],
    ['cache','OBO token cache','user + API B scope','cache',62,80],
    ['apiB','API B','downstream resource','service',86,52]
  ],[
    ['user','client','authenticate and consent'],
    ['client','apiA','token for API A'],
    ['apiA','token','assert user token + client'],
    ['token','cache','store API B token'],
    ['cache','apiA','return scoped OBO token'],
    ['apiA','apiB','call with user delegation']
  ],[0,1,2,5]],
  'Confused deputy':['architecture',[
    ['caller','Untrusted caller','supplied target','client',14,52],
    ['deputy','Privileged service','ambient authority','service',38,52],
    ['authz','Authorization service','caller + target policy','control',38,18],
    ['exchange','Token exchange','narrow target token','control',62,18],
    ['victim','Protected resource','potential victim','service',86,52],
    ['audit','Security audit','bound intent evidence','storage',62,82]
  ],[
    ['caller','deputy','request target operation'],
    ['deputy','authz','bind caller action target'],
    ['authz','exchange','approve narrow delegation'],
    ['exchange','deputy','issue target-bound token'],
    ['deputy','victim','call only approved resource'],
    ['deputy','audit','record bound delegation']
  ],[0,1,3,5]],
  'Credential blast radius':['topology',[
    ['credential','Compromised credential','scope + lifetime','storage',14,52],
    ['serviceA','Trusted service A','accepted audience','service',38,18],
    ['serviceB','Trusted service B','separate audience','service',38,82],
    ['boundary','Tenant / cell boundary','isolation policy','gateway',62,52],
    ['detector','Threat detector','anomalous use','control',62,18],
    ['revoke','Revocation service','disable credential','control',86,18],
    ['resource','Sensitive resource','bounded exposure','database',86,82]
  ],[
    ['credential','serviceA','attempt authorized scope'],
    ['credential','serviceB','reject wrong audience'],
    ['serviceA','boundary','enforce tenant boundary'],
    ['boundary','resource','allow bounded resource'],
    ['serviceA','detector','report anomalous use'],
    ['detector','revoke','trigger containment']
  ],[0,1,3,5]]
};

const SYSTEM_DESIGN_AUTHORED_DIAGRAM_3 = ([kind,components,links,routes],stepCount) => {
  const completed = new Set();
  const frames = routes.slice(0,stepCount).map((linkIndex,index)=>{
    const [from,to] = links[linkIndex];
    const states = {};
    for (const id of completed) states[id] = 'done';
    states[from] = 'active';
    states[to] = 'active';
    completed.add(from);
    completed.add(to);
    return [linkIndex,states];
  });
  return {kind,components,links,frames};
};

const identityChapter = window.SYSTEM_DESIGN_CHAPTERS
  .find(chapter=>chapter.id === 'distributed-identity-security');
for (const concept of identityChapter.groups.flatMap(group=>group.concepts)) {
  const spec = SYSTEM_DESIGN_IDENTITY_DIAGRAM_SPECS_3[concept.name];
  if (!spec) throw new Error(`Missing authored identity diagram: ${concept.name}`);
  concept.diagram = SYSTEM_DESIGN_AUTHORED_DIAGRAM_3(spec,concept.visual.steps.length);
}

const SYSTEM_DESIGN_DOMAIN_CONTEXT_3 = {
  'api-service-architecture/Edge and routing':[
    ['requester','Client fleet','public service requests','client'],
    ['registry','Health registry','endpoints + route health','control']
  ],
  'api-service-architecture/Service networking':[
    ['caller','Calling service','internal workload traffic','service'],
    ['networkControl','Network control plane','identity + route policy','control']
  ],
  'api-service-architecture/Progressive delivery':[
    ['users','User cohorts','stable traffic assignment','client'],
    ['deliveryControl','Delivery controller','guardrails + rollback','control']
  ],
  'observability-distributed-debugging/Telemetry signals':[
    ['workload','Instrumented workload','production operations','service'],
    ['telemetryStore','Telemetry backend','indexed signal storage','storage']
  ],
  'observability-distributed-debugging/Sampling and measurement':[
    ['serviceTraffic','Service traffic','measured user events','client'],
    ['sloBackend','SLO analytics store','windows + objectives','database']
  ],
  'observability-distributed-debugging/Distributed diagnosis':[
    ['fleet','Service fleet','distributed runtime','service'],
    ['diagnostics','Diagnostics backend','profiles + dependency data','storage']
  ],
  'distributed-system-migration-patterns/Coexistence patterns':[
    ['traffic','Production traffic','live migration requests','client'],
    ['migrationControl','Migration controller','authority + routing phase','control']
  ],
  'distributed-system-migration-patterns/Data movement':[
    ['sourceDb','Source database','authoritative records','database'],
    ['reconcile','Reconciliation ledger','checkpoints + differences','storage']
  ],
  'distributed-system-migration-patterns/Compatibility and rollout':[
    ['mixedClients','Mixed-version clients','old + new contracts','client'],
    ['rolloutControl','Rollout controller','cohorts + compatibility','control']
  ],
  'distributed-system-migration-patterns/Authority transition':[
    ['production','Production router','current authority route','gateway'],
    ['cutoverControl','Cutover controller','gates + recovery plan','control']
  ],
  'consistency-conflict-patterns/Conflict selection':[
    ['coordinator','Replica coordinator','collects concurrent versions','service'],
    ['versionStore','Version metadata store','causal + ordering data','storage']
  ],
  'consistency-conflict-patterns/Replica repair':[
    ['repairControl','Repair coordinator','range comparison schedule','worker'],
    ['replicaSet','Replica membership','owners + repair epochs','control']
  ],
  'consistency-conflict-patterns/Consistency contracts':[
    ['sessionClient','Session client','read/write consistency need','client'],
    ['replicaControl','Replica coordinator','quorum + session progress','control']
  ],
  'distributed-deduplication-idempotency/Request identity':[
    ['commandSource','Command source','stable operation identity','client'],
    ['dedupLedger','Deduplication ledger','keys + completion records','database']
  ],
  'distributed-deduplication-idempotency/Delivery semantics':[
    ['broker','Message broker','at-least-once delivery','queue'],
    ['inbox','Consumer inbox','processed event identities','database']
  ],
  'distributed-deduplication-idempotency/Distributed state':[
    ['requestFleet','Request fleet','concurrent duplicate attempts','client'],
    ['durableLedger','Durable dedup ledger','authoritative outcomes','database']
  ],
  'time-based-distributed-patterns/Retention and partitioning':[
    ['writer','Data writer','timestamped records','client'],
    ['timerStore','Retention metadata','expiry + partition bounds','storage']
  ],
  'time-based-distributed-patterns/Windows and stream time':[
    ['eventLog','Partitioned event log','timestamped source events','queue'],
    ['checkpoint','Window checkpoint store','watermarks + aggregates','storage']
  ],
  'time-based-distributed-patterns/Coordination and scheduling':[
    ['schedulerControl','Scheduler control plane','ownership + due work','control'],
    ['timerDb','Durable timer store','deadlines + lease epochs','database']
  ],
  'advanced-senior-staff-level-concepts/Topology and placement':[
    ['globalRouter','Global request router','membership-aware placement','gateway'],
    ['membership','Membership control','nodes + ownership epochs','control']
  ],
  'advanced-senior-staff-level-concepts/Convergence and ordering':[
    ['distributedClient','Distributed client','ordered operation request','client'],
    ['coordinationLog','Coordination log','terms + committed metadata','storage']
  ],
  'advanced-senior-staff-level-concepts/Transactions and state models':[
    ['commandGateway','Command gateway','stable workflow identity','gateway'],
    ['recoveryLog','Recovery log','progress + compensation','storage']
  ],
  'advanced-senior-staff-level-concepts/Overload and latency':[
    ['incomingTraffic','Incoming traffic','bursty production load','client'],
    ['capacityControl','Capacity controller','limits + saturation signals','control']
  ],
  'advanced-senior-staff-level-concepts/Streaming and snapshots':[
    ['durableLog','Durable event log','partition offsets','queue'],
    ['stateBackend','State backend','checkpoints + snapshots','storage']
  ],
  'advanced-senior-staff-level-concepts/Global resilience and architecture':[
    ['globalTraffic','Global traffic manager','region + cell routing','gateway'],
    ['operations','Operations control plane','health + failover policy','control']
  ]
};

const SYSTEM_DESIGN_RICH_LAYOUTS_3 = {
  6:[[14,50],[34,18],[66,18],[86,50],[66,82],[34,82]],
  7:[[14,50],[30,18],[58,18],[86,40],[78,82],[42,82],[50,50]],
  8:[[14,50],[28,18],[54,18],[80,28],[86,66],[62,82],[34,82],[50,52]]
};

const SYSTEM_DESIGN_FLOW_LABEL_3 = type => ({
  client:'return response',
  gateway:'route request',
  service:'invoke service operation',
  database:'commit records',
  replica:'replicate version',
  cache:'lookup cached value',
  queue:'publish durable event',
  worker:'dispatch background work',
  control:'apply control decision',
  storage:'persist durable metadata',
  index:'resolve indexed owner',
  node:'exchange node metadata',
  clock:'evaluate time boundary',
  bitset:'update compact estimate'
})[type] || 'exchange protocol data';

const SYSTEM_DESIGN_UNIQUE_COMPONENTS_3 = entries => {
  const labels = new Set();
  return entries.map(entry=>{
    const copy = [...entry];
    if (labels.has(copy[1])) copy[1] = `${copy[1]} peer`;
    labels.add(copy[1]);
    return copy;
  });
};

const SYSTEM_DESIGN_RICH_DIAGRAM_3 = (concept,context) => {
  const raw = [
    context[0],
    ...concept.visual.nodes.map(([label,detail],index)=>[
      `mechanism${index}`,
      label,
      detail,
      SYSTEM_DESIGN_COMPONENT_TYPE_3(label,detail)
    ]),
    context[1]
  ];
  const layout = SYSTEM_DESIGN_RICH_LAYOUTS_3[raw.length];
  const components = SYSTEM_DESIGN_UNIQUE_COMPONENTS_3(raw).map((entry,index)=>[
    ...entry,
    layout[index][0],
    layout[index][1]
  ]);
  const lastCore = components.length-2;
  const support = components.length-1;
  const links = [];
  for (let index=0;index<lastCore;index++) {
    links.push([
      components[index][0],
      components[index+1][0],
      SYSTEM_DESIGN_FLOW_LABEL_3(components[index+1][3])
    ]);
  }
  links.push([
    components[support][0],
    components[2][0],
    SYSTEM_DESIGN_FLOW_LABEL_3(components[2][3])
  ]);
  links.push([
    components[lastCore][0],
    components[support][0],
    SYSTEM_DESIGN_FLOW_LABEL_3(components[support][3])
  ]);
  links.push([
    components[lastCore][0],
    components[0][0],
    SYSTEM_DESIGN_FLOW_LABEL_3(components[0][3])
  ]);
  const supportLink = lastCore;
  const completionLink = links.length-1;
  const route = [0,Math.min(1,lastCore-1),supportLink,completionLink];
  const completed = new Set();
  const frames = concept.visual.steps.map((step,index)=>{
    const linkIndex = route[Math.min(index,route.length-1)];
    const [from,to] = links[linkIndex];
    const states = {};
    for (const id of completed) states[id] = 'done';
    states[from] = 'active';
    states[to] = 'active';
    completed.add(from);
    completed.add(to);
    return [linkIndex,states];
  });
  return {
    kind:concept.diagram.kind,
    components,
    links,
    frames
  };
};

for (const chapter of window.SYSTEM_DESIGN_CHAPTERS) {
  if (chapter.id === 'distributed-identity-security' || chapter.id === 'realtime-connections') continue;
  if (!Object.keys(SYSTEM_DESIGN_DOMAIN_CONTEXT_3).some(key=>key.startsWith(`${chapter.id}/`))) continue;
  for (const group of chapter.groups) {
    const context = SYSTEM_DESIGN_DOMAIN_CONTEXT_3[`${chapter.id}/${group.title}`];
    if (!context) throw new Error(`Missing diagram context: ${chapter.id}/${group.title}`);
    for (const concept of group.concepts) {
      concept.diagram = SYSTEM_DESIGN_RICH_DIAGRAM_3(concept,context);
    }
  }
}

const realtimeChapter = window.SYSTEM_DESIGN_CHAPTERS
  .find(chapter=>chapter.id === 'realtime-connections');
const realtimeRoutes = {
  'Long polling':[0,1,2,4,5],
  'Server-Sent Events (SSE)':[0,1,3,4,5],
  'WebSockets':[0,1,2,6,7,0]
};
for (const concept of realtimeChapter.groups.flatMap(group=>group.concepts)) {
  const diagram = concept.diagram;
  const remappedX = {
    'Long polling':[14,34,54,80,80],
    'Server-Sent Events (SSE)':[14,34,54,80,80],
    'WebSockets':[14,34,58,58,82,82]
  }[concept.name];
  diagram.components.forEach((component,index)=>{
    component[4] = remappedX[index];
    component[5] = Math.max(16,Math.min(84,component[5]));
  });
  const completed = new Set();
  diagram.frames = realtimeRoutes[concept.name].map(linkIndex=>{
    const [from,to] = diagram.links[linkIndex];
    const states = {};
    for (const id of completed) states[id] = 'done';
    states[from] = 'active';
    states[to] = 'active';
    completed.add(from);
    completed.add(to);
    return [linkIndex,states];
  });
}

const SYSTEM_DESIGN_COMPONENT_PATCHES_3 = {
  'api-service-architecture::Traffic shadowing':{
    'Primary path':['Primary Service Path','authoritative production path','service'],
    'Shadow path':['Shadow Validation Service','non-authoritative comparison path','service']
  },
  'api-service-architecture::Blue-green deployments':{
    Blue:['Blue Environment','current live deployment','service'],
    Green:['Green Environment','staged deployment environment','service'],
    Validation:['Validation Probe','smoke + readiness checks','worker'],
    'Traffic switch':['Traffic Switch Router','routes live traffic to the active environment','gateway']
  },
  'api-service-architecture::A/B routing':{
    Assignment:['Cohort Assignment Store','stable cohort hash','database'],
    'Variant A':['Control Variant Service','control experience','service'],
    'Variant B':['Treatment Variant Service','treatment experience','service']
  },
  'api-service-architecture::Feature flags':{
    'Code deploy':['Flagged Application','deployed code with dormant flag path','service'],
    Evaluator:['Flag Evaluation Service','evaluates context against flag rules','control'],
    Behavior:['Selected Serving Path','old or new behavior selection','service']
  },
  'api-service-architecture::Request routing':{
    Policy:['Routing Policy','version + locality','control']
  },
  'observability-distributed-debugging::Correlation IDs':{
    Search:['Correlation Index','join events','index']
  },
  'observability-distributed-debugging::Tail-based sampling':{
    Export:['Selected Trace Export','whole selected trace','storage']
  },
  'observability-distributed-debugging::Anomaly detection':{
    Detector:['Anomaly Detector','deviation score','control'],
    Alert:['Incident Alert','context + threshold','storage']
  },
  'observability-distributed-debugging::Metrics':{
    'Dashboard/alert':['Metrics Dashboard','trend','storage']
  },
  'distributed-system-migration-patterns::Online migration':{
    'Background move':['Background Migration Worker','bounded batches','worker'],
    'Authority switch':['Authority Router','no downtime','gateway']
  },
  'distributed-system-migration-patterns::Incremental rollout':{
    Candidate:['Candidate Release','disabled candidate version','service']
  },
  'distributed-system-migration-patterns::Cutover strategies':{
    'Traffic switch':['Cutover Router','new authority route','gateway']
  },
  'distributed-system-migration-patterns::Rollback strategies':{
    'New path':['Replacement Service Path','degraded candidate path','service'],
    Reconciliation:['Reconciliation Worker','capture new writes','worker']
  },
  'consistency-conflict-patterns::Version numbers':{
    Update:['Conditional Update Request','if version = 7','client']
  },
  'consistency-conflict-patterns::Vector clocks':{
    Exchange:['Vector Comparison Service','compare vectors','control'],
    Conflict:['Concurrent Version Set','concurrent siblings','storage']
  },
  'consistency-conflict-patterns::Conflict-free replicated data types':{
    Merge:['CRDT Merge Service','join/commute','control']
  },
  'consistency-conflict-patterns::Anti-entropy':{
    'Difference walk':['Difference Scanner','narrow keys','worker']
  },
  'consistency-conflict-patterns::Read repair':{
    'Repair write':['Repair Mutation','update B','storage']
  },
  'consistency-conflict-patterns::Quorum reconciliation':{
    Resolver:['Quorum Resolution Service','dominance/merge','control'],
    Repair:['Repair Writer','write chosen version','worker']
  },
  'consistency-conflict-patterns::Eventual consistency':{
    Replication:['Async Replicator','asynchronous','service'],
    'Anti-entropy':['Anti-entropy Repair','converged replicas after repair','worker']
  },
  'distributed-deduplication-idempotency::Idempotency keys':{
    'Business effect':['Committed Effect Record','commit once','storage'],
    Retry:['Retried Request','replay stored result','client']
  },
  'distributed-deduplication-idempotency::Request fingerprints':{
    Duplicate:['Duplicate Request Record','match or reject','storage']
  },
  'distributed-deduplication-idempotency::Deduplication tables':{
    Replay:['Replay Attempt','constraint hit','client']
  },
  'distributed-deduplication-idempotency::Sequence numbers':{
    'Duplicate/gap':['Sequence Validator','reject or recover','control']
  },
  'distributed-deduplication-idempotency::Exactly-once illusion':{
    'External effect':['External Side-effect Target','may repeat','service']
  },
  'distributed-deduplication-idempotency::At-least-once + idempotency':{
    Delivery:['Delivery Attempt','message E','queue'],
    Acknowledgment:['Acknowledgment Record','may be lost','storage'],
    Redelivery:['Redelivery Attempt','safe no-op','queue']
  },
  'distributed-deduplication-idempotency::Transactional deduplication':{
    Commit:['Committed Transaction Record','one outcome','storage']
  },
  'distributed-deduplication-idempotency::Distributed dedup caches':{
    'TTL/replay':['Replay Cache Entry','cache hit or expiry','cache']
  },
  'time-based-distributed-patterns::TTL':{
    Cleanup:['Cleanup Worker','physical delete','worker']
  },
  'time-based-distributed-patterns::Expiration':{
    'Clock check':['Expiry Check Service','now vs T','control']
  },
  'time-based-distributed-patterns::Sliding windows':{
    Slide:['Slide Interval','advance by S','clock']
  },
  'time-based-distributed-patterns::Tumbling windows':{
    Boundary:['Window Boundary','fixed interval','clock'],
    'Window emission':['Window Emitter','close + emit','worker']
  },
  'time-based-distributed-patterns::Processing time':{
    Replay:['Replayed Event','different placement','queue']
  },
  'time-based-distributed-patterns::Leases':{
    Holder:['Lease Holder','renew','service'],
    'Protected resource':['Fenced Resource','check E','service'],
    'Expiry/failover':['Successor Lease Grant','new epoch','storage']
  },
  'time-based-distributed-patterns::Heartbeats':{
    Suspicion:['Suspicion Score','timeout/score','control']
  },
  'distributed-identity-security::Revocation':{
    'Security signal':['Revocation Administrator','initiates logout or compromise response','client']
  },
  'distributed-identity-security::Workload identity':{
    'Peer authorization':['Peer Authorization Policy','workload permissions','control']
  },
  'distributed-identity-security::Trust boundaries':{
    'Public boundary':['Edge Gateway','TLS + input validation','gateway'],
    'Trusted service zone':['Internal Service Tier','normalized request handling','service'],
    'Sensitive data zone':['Sensitive Data Store','restricted records','database'],
    'Egress boundary':['Egress Gateway','destination control','gateway'],
    'Boundary audit':['Boundary Audit Log','crossing evidence','storage']
  },
  'distributed-identity-security::Confused deputy':{
    'Token exchange':['Delegation Token Service','issue narrow target token','control'],
    'Security audit':['Delegation Audit Log','bound intent evidence','storage']
  },
  'distributed-identity-security::Credential rotation':{
    'Revocation control':['Credential Retirement Controller','disable v1','control']
  },
  'advanced-senior-staff-level-concepts::Cell-based architecture':{
    'Global layer':['Global Routing Layer','thin routing','gateway']
  },
  'advanced-senior-staff-level-concepts::Gossip protocols':{
    'Gossip exchange':['Membership Gossip Channel','merge versions','queue'],
    Cluster:['Cluster Membership View','eventual convergence','storage']
  },
  'advanced-senior-staff-level-concepts::Merkle trees':{
    Repair:['Repair Worker','sync divergent range','worker']
  },
  'advanced-senior-staff-level-concepts::CRDTs':{
    'Network heal':['Replica Sync Service','exchange after reconnection','service'],
    'Merge law':['Converged CRDT State','converged value','storage']
  },
  'advanced-senior-staff-level-concepts::Vector clocks':{
    Comparator:['Vector Clock Comparator','component order','control'],
    Merge:['Resolved Version Vector','descends from both writers','storage']
  },
  'advanced-senior-staff-level-concepts::Hybrid logical clocks':{
    'Message receive':['Receive-side Clock Service','merge p,c','control']
  },
  'advanced-senior-staff-level-concepts::Leases':{
    'Pause/partition':['Lease Expiry Record','renewal lost','storage']
  },
  'advanced-senior-staff-level-concepts::Idempotency':{
    'First execution':['Initial Execution Record','first transition','storage'],
    Retry:['Retried Command','same final state','client']
  },
  'advanced-senior-staff-level-concepts::Exactly-once semantics':{
    Replay:['Replay Guard Record','already committed','storage']
  },
  'advanced-senior-staff-level-concepts::Sagas':{
    'Compensation A':['Compensation Worker A','semantic undo','worker']
  },
  'advanced-senior-staff-level-concepts::Event sourcing':{
    Projection:['Projection Worker','fold events','worker']
  },
  'advanced-senior-staff-level-concepts::CQRS':{
    'Event/projection':['Projection Stream','asynchronous update','queue']
  },
  'advanced-senior-staff-level-concepts::Backpressure':{
    Feedback:['Backpressure Signal','slow/reject','control']
  },
  'advanced-senior-staff-level-concepts::Hot-key mitigation':{
    Detector:['Hot-key Detector','rate + saturation','control'],
    Mitigation:['Mitigation Controller','replicate/salt/coalesce','control']
  },
  'advanced-senior-staff-level-concepts::Adaptive throttling':{
    Traffic:['Admission Result','admit or reject','storage']
  },
  'advanced-senior-staff-level-concepts::Multi-region active-active':{
    Replication:['Cross-region Replicator','cross-region async','service'],
    Resolver:['Global Conflict Resolver','converged global state','control']
  },
  'advanced-senior-staff-level-concepts::Conflict resolution':{
    Resolver:['Conflict Resolver','domain rule','control'],
    'Merged version':['Resolved Version Record','descends from both','storage']
  },
  'advanced-senior-staff-level-concepts::Disaster recovery':{
    'Recovery environment':['Recovery Service Stack','restore dependencies','service'],
    Traffic:['Recovery Traffic Router','resume by RTO','gateway']
  },
  'advanced-senior-staff-level-concepts::Blast-radius management':{
    Boundary:['Isolation Boundary','cell/ring/quota','replica'],
    Guardrail:['Blast-Radius Guardrail','detect impact','control'],
    Containment:['Containment Controller','pause + isolate','control']
  },
  'advanced-senior-staff-level-concepts::Cell isolation':{
    'Cell boundary':['Cell Boundary Router','local data + compute','gateway']
  },
  'advanced-senior-staff-level-concepts::Control plane consistency':{
    Distribution:['Config Distribution Service','versioned rollout','service']
  },
  'advanced-senior-staff-level-concepts::Data plane scalability':{
    Traffic:['Partitioned Request','partition key','client'],
    'Hotspot control':['Hotspot Controller','split/replicate','control']
  }
};

const SYSTEM_DESIGN_APPLY_COMPONENT_PATCHES_3 = () => {
  for (const chapter of window.SYSTEM_DESIGN_CHAPTERS) {
    for (const group of chapter.groups) {
      for (const concept of group.concepts) {
        const patchSet = SYSTEM_DESIGN_COMPONENT_PATCHES_3[`${chapter.id}::${concept.name}`];
        if (!patchSet) continue;
        if (concept.visual?.nodes) {
          concept.visual.nodes = concept.visual.nodes.map(([label,detail])=>{
            const patch = patchSet[label];
            return patch ? [patch[0], patch[1] || detail] : [label,detail];
          });
        }
        if (!concept.diagram?.components) continue;
        for (const component of concept.diagram.components) {
          const patch = patchSet[component[1]];
          if (!patch) continue;
          component[1] = patch[0];
          if (patch[1]) component[2] = patch[1];
          if (patch[2]) component[3] = patch[2];
        }
      }
    }
  }
};

SYSTEM_DESIGN_APPLY_COMPONENT_PATCHES_3();

const SYSTEM_DESIGN_TEACHING_GROUPS_3 = {
  'api-service-architecture/Edge and routing':{family:'fanout',role:'gateway',components:[
    ['client','Client fleet','public API callers','client'],
    ['edge','Edge proxy','TLS and request boundary','gateway'],
    ['serviceA','Service instance A','healthy serving target','service'],
    ['serviceB','Service instance B','alternate serving target','service'],
    ['registry','Service registry','routes and endpoint health','control'],
    ['concept','Routing controller','traffic selection policy','control']
  ]},
  'api-service-architecture/Service networking':{family:'controlData',role:'network policy',components:[
    ['caller','Calling workload','east-west traffic source','service'],
    ['proxyA','Source network proxy','outbound policy point','gateway'],
    ['proxyB','Destination network proxy','inbound policy point','gateway'],
    ['callee','Destination workload','protected service endpoint','service'],
    ['control','Mesh control plane','routes identity and policy','control'],
    ['concept','Network policy controller','concept-specific network behavior','control']
  ]},
  'api-service-architecture/Progressive delivery':{family:'splitCompare',role:'rollout policy',components:[
    ['users','User cohorts','stable traffic population','client'],
    ['router','Release traffic router','cohort assignment','gateway'],
    ['baseline','Baseline service','current production version','service'],
    ['candidate','Candidate service','new deployment version','service'],
    ['metrics','Guardrail metrics store','business and reliability signals','database'],
    ['concept','Rollout controller','exposure and rollback policy','control']
  ]},
  'observability-distributed-debugging/Telemetry signals':{family:'pipeline',role:'telemetry processor',components:[
    ['workload','Instrumented services','production operations','service'],
    ['agent','Telemetry agents','local batching and context','worker'],
    ['collector','Telemetry collector','receive and transform signals','service'],
    ['store','Signal backend','indexed telemetry storage','storage'],
    ['query','Query and alert service','operational analysis','service'],
    ['concept','Signal processor','concept-specific signal handling','control']
  ]},
  'observability-distributed-debugging/Sampling and measurement':{family:'feedback',role:'measurement policy',components:[
    ['traffic','Service clients','measured user operations','client'],
    ['instrumentation','Instrumentation SDK','records observations','service'],
    ['processor','Telemetry processor','aggregation and sampling','worker'],
    ['store','Metrics and trace store','windowed measurements','database'],
    ['alerts','SLO alert evaluator','budget and threshold checks','control'],
    ['concept','Measurement controller','concept-specific measurement policy','control']
  ]},
  'observability-distributed-debugging/Distributed diagnosis':{family:'pipeline',role:'diagnostic analyzer',components:[
    ['fleet','Service fleet','distributed runtime targets','service'],
    ['agents','Diagnostic agents','profiles traces and metadata','worker'],
    ['collector','Diagnostic collector','cross-node correlation','service'],
    ['store','Diagnostic data store','profiles and dependency records','storage'],
    ['console','Investigation console','operator analysis surface','client'],
    ['concept','Diagnostic analyzer','concept-specific detection logic','control']
  ]},
  'distributed-system-migration-patterns/Coexistence patterns':{family:'splitCompare',role:'migration adapter',components:[
    ['clients','Production clients','live requests during migration','client'],
    ['router','Migration router','authority-aware routing','gateway'],
    ['legacy','Legacy system','current implementation','service'],
    ['target','Replacement system','candidate implementation','service'],
    ['compare','Comparison and repair store','differences and replay','database'],
    ['concept','Migration adapter','concept-specific coexistence policy','control']
  ]},
  'distributed-system-migration-patterns/Data movement':{family:'pipeline',role:'transfer worker',components:[
    ['source','Source database','authoritative source records','database'],
    ['log','Change and snapshot log','ordered migration input','queue'],
    ['workers','Migration workers','checkpointed transfer','worker'],
    ['target','Target database','migrated records','database'],
    ['reconcile','Reconciliation store','checksums and differences','storage'],
    ['concept','Transfer controller','concept-specific movement policy','control']
  ]},
  'distributed-system-migration-patterns/Compatibility and rollout':{family:'controlData',role:'rollout controller',components:[
    ['oldClient','Old-version clients','legacy contract consumers','client'],
    ['newClient','New-version clients','new contract consumers','client'],
    ['compat','Compatibility gateway','schema and protocol adapter','gateway'],
    ['service','Migrating service','mixed-version implementation','service'],
    ['schema','Schema registry','compatibility metadata','storage'],
    ['concept','Rollout controller','concept-specific version policy','control']
  ]},
  'distributed-system-migration-patterns/Authority transition':{family:'splitCompare',role:'cutover controller',components:[
    ['traffic','Production clients','live authority requests','client'],
    ['router','Authority router','old or new owner','gateway'],
    ['old','Old authority','rollback-capable system','service'],
    ['new','New authority','cutover target system','service'],
    ['journal','Cutover journal','writes and checkpoints','storage'],
    ['concept','Cutover controller','concept-specific transition gates','control']
  ]},
  'consistency-conflict-patterns/Conflict selection':{family:'replica',role:'conflict resolver',components:[
    ['client','Data client','concurrent mutations','client'],
    ['replicaA','Replica A','versioned value A','replica'],
    ['replicaB','Replica B','versioned value B','replica'],
    ['resolver','Conflict resolver','domain merge execution','service'],
    ['metadata','Version metadata store','causal and ordering data','storage'],
    ['concept','Resolution policy','concept-specific winner rules','control']
  ]},
  'consistency-conflict-patterns/Replica repair':{family:'replica',role:'repair coordinator',components:[
    ['reader','Read and repair client','detects divergence','client'],
    ['replicaA','Replica A','newer or source range','replica'],
    ['replicaB','Replica B','stale or divergent range','replica'],
    ['repair','Repair workers','range synchronization','worker'],
    ['metadata','Repair metadata store','hashes versions and epochs','storage'],
    ['concept','Repair coordinator','concept-specific repair policy','control']
  ]},
  'consistency-conflict-patterns/Consistency contracts':{family:'replica',role:'consistency coordinator',components:[
    ['client','Session client','consistency-bound operation','client'],
    ['replicaA','Replica A','regional data copy','replica'],
    ['replicaB','Replica B','independent data copy','replica'],
    ['coordinator','Replica coordinator','read and write ordering','service'],
    ['progress','Session progress store','versions and causal context','storage'],
    ['concept','Consistency policy','concept-specific visibility contract','control']
  ]},
  'distributed-deduplication-idempotency/Request identity':{family:'dedup',role:'dedup guard',components:[
    ['caller','API caller','stable operation identity','client'],
    ['api','Command API','request boundary','service'],
    ['dedup','Deduplication store','keys fingerprints and results','database'],
    ['domain','Domain database','business state','database'],
    ['effects','Side-effect dispatcher','external effect delivery','worker'],
    ['concept','Identity guard','concept-specific duplicate policy','control']
  ]},
  'distributed-deduplication-idempotency/Delivery semantics':{family:'dedup',role:'idempotent consumer',components:[
    ['producer','Event producer','stable event identity','service'],
    ['broker','Message broker','at-least-once delivery','queue'],
    ['consumer','Message consumer','effect handler','worker'],
    ['inbox','Consumer inbox','processed event IDs','database'],
    ['domain','Domain database','committed business effect','database'],
    ['concept','Delivery guard','concept-specific commit boundary','control']
  ]},
  'distributed-deduplication-idempotency/Distributed state':{family:'dedup',role:'cache coordinator',components:[
    ['clients','Request fleet','concurrent duplicate attempts','client'],
    ['router','Key router','dedup shard selection','gateway'],
    ['cacheA','Dedup cache shard A','recent operation keys','cache'],
    ['cacheB','Dedup cache shard B','replicated key state','cache'],
    ['ledger','Durable dedup ledger','authoritative outcomes','database'],
    ['concept','Cache coordinator','concept-specific retention policy','control']
  ]},
  'time-based-distributed-patterns/Retention and partitioning':{family:'scheduler',role:'retention policy',components:[
    ['writer','Data writer','timestamped records','client'],
    ['store','Partitioned data store','time-ranged records','database'],
    ['index','Time partition index','range ownership','index'],
    ['reaper','Cleanup workers','expiry and compaction','worker'],
    ['clock','Trusted clock service','time boundary source','clock'],
    ['concept','Retention controller','concept-specific expiry policy','control']
  ]},
  'time-based-distributed-patterns/Windows and stream time':{family:'stream',role:'window operator',components:[
    ['producer','Event producers','source timestamps','service'],
    ['log','Partitioned event log','ordered event streams','queue'],
    ['operator','Window processors','event-time aggregation','worker'],
    ['state','Window state store','partial aggregates','storage'],
    ['sink','Result sink','emitted window updates','database'],
    ['concept','Time coordinator','concept-specific time policy','control']
  ]},
  'time-based-distributed-patterns/Coordination and scheduling':{family:'scheduler',role:'scheduler',components:[
    ['submitter','Job submitter','schedule or ownership request','client'],
    ['control','Scheduler control plane','due work and membership','control'],
    ['timers','Durable timer store','deadlines and lease epochs','database'],
    ['workers','Worker fleet','claimed scheduled work','worker'],
    ['resource','Fenced resource','protected side effects','service'],
    ['concept','Timing controller','concept-specific clock policy','control']
  ]},
  'advanced-senior-staff-level-concepts/Topology and placement':{family:'fanout',role:'placement policy',components:[
    ['clients','Global clients','partitioned requests','client'],
    ['router','Placement router','key and membership routing','gateway'],
    ['nodeA','Node or shard A','owned key ranges','replica'],
    ['nodeB','Node or shard B','independent ranges','replica'],
    ['membership','Membership store','nodes tokens and epochs','storage'],
    ['concept','Placement controller','concept-specific ownership policy','control']
  ]},
  'advanced-senior-staff-level-concepts/Convergence and ordering':{family:'replica',role:'coordination protocol',components:[
    ['client','Distributed client','ordered operation request','client'],
    ['nodeA','Protocol node A','proposal or replica state','replica'],
    ['nodeB','Protocol node B','independent protocol state','replica'],
    ['coordinator','Protocol coordinator','rounds ordering and merge','service'],
    ['log','Coordination log','terms ballots and versions','storage'],
    ['concept','Protocol policy','concept-specific safety rules','control']
  ]},
  'advanced-senior-staff-level-concepts/Transactions and state models':{family:'workflow',role:'workflow coordinator',components:[
    ['client','Command client','stable workflow request','client'],
    ['coordinator','Workflow coordinator','durable progress','service'],
    ['participantA','Participant service A','local transaction','service'],
    ['participantB','Participant service B','local transaction','service'],
    ['log','Workflow log','events offsets and outcomes','storage'],
    ['concept','Recovery controller','concept-specific recovery policy','control']
  ]},
  'advanced-senior-staff-level-concepts/Overload and latency':{family:'feedback',role:'admission policy',components:[
    ['traffic','Caller fleet','sends bursty production workload','client'],
    ['admission','Admission gateway','rate and concurrency limits','gateway'],
    ['workers','Worker pool','bounded in-flight work','worker'],
    ['dependency','Downstream dependency','finite service capacity','service'],
    ['signals','Capacity telemetry','latency errors saturation','storage'],
    ['concept','Capacity controller','concept-specific overload policy','control']
  ]},
  'advanced-senior-staff-level-concepts/Streaming and snapshots':{family:'stream',role:'stream operator',components:[
    ['producer','Stream producers','partitioned records','service'],
    ['log','Durable stream log','ordered offsets','queue'],
    ['operators','Stateful operators','distributed processing','worker'],
    ['state','State backend','operator snapshots','storage'],
    ['sink','Materialized sink','committed output','database'],
    ['concept','Checkpoint coordinator','concept-specific progress policy','control']
  ]},
  'advanced-senior-staff-level-concepts/Global resilience and architecture':{family:'controlData',role:'resilience controller',components:[
    ['clients','Global clients','regional requests','client'],
    ['router','Global traffic manager','region and cell selection','gateway'],
    ['regionA','Region or cell A','active serving stack','replica'],
    ['regionB','Region or cell B','isolated serving stack','replica'],
    ['control','Operations control plane','health failover and rollout','control'],
    ['concept','Resilience controller','concept-specific global policy','control']
  ]}
};

const SYSTEM_DESIGN_SEMANTIC_LAYOUTS_3 = [
  [[14,50],[34,18],[66,18],[86,50],[66,82],[34,82]],
  [[14,22],[50,16],[86,24],[82,76],[50,84],[18,74]],
  [[50,16],[18,40],[82,40],[18,80],[82,80],[50,54]],
  [[14,50],[38,20],[72,18],[86,56],[66,84],[32,80]],
  [[18,18],[62,16],[86,48],[72,82],[30,84],[14,54]],
  [[14,28],[44,16],[82,24],[86,70],[50,84],[20,72]],
  [[14,54],[30,18],[70,18],[86,54],[68,84],[32,82]],
  [[22,16],[68,16],[86,50],[68,84],[22,84],[14,50]]
];

const SYSTEM_DESIGN_SEMANTIC_LINKS_3 = {
  fanout:[
    [0,1,'route by membership'],
    [1,2,'send to selected owner'],
    [1,3,'fail over or fan out'],
    [4,1,'publish healthy membership'],
    [5,1,'apply placement policy'],
    [2,4,'report health and ownership'],
    [3,4,'report health and ownership']
  ],
  controlData:[
    [0,1,'enter data plane'],
    [1,2,'route protected traffic'],
    [2,3,'invoke destination service'],
    [4,1,'publish route configuration'],
    [4,2,'publish identity policy'],
    [5,4,'apply control policy'],
    [3,0,'return service response']
  ],
  splitCompare:[
    [0,1,'enter controlled router'],
    [1,2,'send baseline traffic'],
    [1,3,'send candidate traffic'],
    [2,4,'record baseline signals'],
    [3,4,'record candidate signals'],
    [4,5,'evaluate differences'],
    [5,1,'advance or roll back']
  ],
  pipeline:[
    [0,1,'emit source data'],
    [1,2,'batch and forward'],
    [2,3,'persist transformed data'],
    [3,4,'query stored evidence'],
    [5,2,'apply processing policy'],
    [4,5,'report analysis feedback'],
    [2,4,'stream urgent findings']
  ],
  feedback:[
    [0,1,'record measured operation'],
    [1,2,'emit observations'],
    [2,3,'aggregate measurements'],
    [3,4,'evaluate service objective'],
    [4,5,'report threshold pressure'],
    [5,2,'adjust processing policy'],
    [5,1,'adjust admission policy']
  ],
  replica:[
    [0,1,'send versioned operation'],
    [0,2,'contact peer replica'],
    [1,3,'return replica version'],
    [2,3,'return replica version'],
    [4,3,'supply ordering metadata'],
    [3,5,'apply resolution policy'],
    [5,1,'repair selected version'],
    [5,2,'repair selected version']
  ],
  dedup:[
    [0,1,'submit stable identity'],
    [1,2,'claim duplicate key'],
    [2,5,'check duplicate policy'],
    [5,3,'commit business effect'],
    [3,4,'dispatch external effect'],
    [4,2,'record completion'],
    [2,0,'replay stored outcome']
  ],
  scheduler:[
    [0,1,'submit timed work'],
    [1,2,'persist time boundary'],
    [2,5,'evaluate due ownership'],
    [5,3,'dispatch due work'],
    [3,4,'execute fenced effect'],
    [4,2,'record completion epoch'],
    [5,1,'publish next deadline']
  ],
  stream:[
    [0,1,'append timestamped records'],
    [1,2,'deliver partition records'],
    [2,3,'update keyed state'],
    [3,5,'checkpoint progress'],
    [5,2,'restore processing state'],
    [2,4,'emit materialized update'],
    [4,5,'acknowledge committed output']
  ],
  workflow:[
    [0,1,'start durable workflow'],
    [1,2,'invoke local transaction'],
    [2,4,'record participant outcome'],
    [1,3,'invoke next participant'],
    [3,4,'record participant outcome'],
    [4,5,'select recovery action'],
    [5,2,'compensate or replay']
  ]
};

const SYSTEM_DESIGN_SEMANTIC_ROUTES_3 = {
  fanout:[0,1,3,4],
  controlData:[0,1,3,5],
  splitCompare:[0,1,4,6],
  pipeline:[0,1,2,4],
  feedback:[0,1,3,5],
  replica:[0,2,4,6],
  dedup:[0,1,3,6],
  scheduler:[0,1,3,5],
  stream:[0,1,2,5],
  workflow:[0,1,3,5]
};

const SYSTEM_DESIGN_CONCEPT_HASH_3 = value => {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash;
};

const SYSTEM_DESIGN_SEMANTIC_DIAGRAM_3 = (concept,definition) => {
  const components = definition.components.map(component=>[...component]);
  components[5][1] = `${concept.name} ${definition.role}`;
  const variant = SYSTEM_DESIGN_CONCEPT_HASH_3(concept.name) % SYSTEM_DESIGN_SEMANTIC_LAYOUTS_3.length;
  const layout = SYSTEM_DESIGN_SEMANTIC_LAYOUTS_3[variant];
  components.forEach((component,index)=>{
    component.push(layout[index][0],layout[index][1]);
  });
  const links = SYSTEM_DESIGN_SEMANTIC_LINKS_3[definition.family].map(([from,to,label])=>[
    components[from][0],
    components[to][0],
    label
  ]);
  if (variant % 2 === 1) {
    const feedback = [links[links.length-1][1],links[0][0],'report protocol feedback'];
    if (!links.some(link=>link[0]===feedback[0]&&link[1]===feedback[1])) links.push(feedback);
  }
  const route = SYSTEM_DESIGN_SEMANTIC_ROUTES_3[definition.family];
  const completed = new Set();
  const frames = concept.visual.steps.map((step,index)=>{
    const linkIndex = route[Math.min(index,route.length-1)];
    const [from,to] = links[linkIndex];
    const status = {};
    for (const id of completed) status[id] = 'done';
    status[from] = 'active';
    status[to] = 'active';
    completed.add(from);
    completed.add(to);
    return [linkIndex,status];
  });
  return {kind:concept.diagram.kind,components,links,frames};
};

for (const chapter of window.SYSTEM_DESIGN_CHAPTERS) {
  if (chapter.id === 'distributed-identity-security' || chapter.id === 'realtime-connections') continue;
  for (const group of chapter.groups) {
    const definition = SYSTEM_DESIGN_TEACHING_GROUPS_3[`${chapter.id}/${group.title}`];
    if (!definition) continue;
    for (const concept of group.concepts) {
      concept.diagram = SYSTEM_DESIGN_SEMANTIC_DIAGRAM_3(concept,definition);
    }
  }
}

const SYSTEM_DESIGN_DISTRIBUTED_ALGORITHM_OVERRIDES_3 = {
  'Conflict-free replicated data types':['topology',[
    ['appA','Application A','local CRDT operations','client',14,22],
    ['replicaA','CRDT replica A','mergeable local state','replica',38,22],
    ['deltaA','Delta log A','unsent CRDT deltas','storage',38,80],
    ['replicaB','CRDT replica B','independent local state','replica',86,22],
    ['deltaB','Delta log B','unsent CRDT deltas','storage',62,80],
    ['appB','Application B','converged local reads','client',86,80]
  ],[
    ['appA','replicaA','apply local CRDT operation'],
    ['replicaA','deltaA','append mergeable delta'],
    ['deltaA','replicaB','exchange unseen deltas'],
    ['replicaB','deltaB','append local delta'],
    ['deltaB','replicaA','exchange unseen deltas'],
    ['replicaA','replicaB','anti-entropy state merge'],
    ['replicaB','appB','serve converged value']
  ],[0,2,4,6]],
  'Application-level conflict resolution':['architecture',[
    ['writerA','Writer A','concurrent domain update','client',14,22],
    ['writerB','Writer B','concurrent domain update','client',14,80],
    ['replicaA','Replica A','version A','replica',38,22],
    ['replicaB','Replica B','version B','replica',38,80],
    ['resolver','Domain conflict resolver','business merge logic','service',66,50],
    ['policy','Domain policy store','merge and escalation rules','storage',66,18],
    ['store','Resolved version store','write-back to replicas','database',86,72]
  ],[
    ['writerA','replicaA','write version A'],
    ['writerB','replicaB','write version B'],
    ['replicaA','resolver','submit concurrent version A'],
    ['replicaB','resolver','submit concurrent version B'],
    ['policy','resolver','load domain merge policy'],
    ['resolver','store','commit resolved version'],
    ['store','replicaA','write back resolution'],
    ['store','replicaB','write back resolution']
  ],[0,1,4,5]],
  'Read repair':['topology',[
    ['client','Read client','consistency-aware read','client',14,50],
    ['coordinator','Read coordinator','quorum response collector','service',38,50],
    ['replicaA','Replica A','version 12','replica',62,18],
    ['replicaB','Replica B','version 12','replica',86,50],
    ['replicaC','Replica C','stale version 10','replica',62,82],
    ['repair','Async repair queue','stale replica updates','queue',38,82]
  ],[
    ['client','coordinator','request quorum read'],
    ['coordinator','replicaA','read version from A'],
    ['coordinator','replicaB','read version from B'],
    ['coordinator','replicaC','read version from C'],
    ['replicaA','coordinator','return newest version'],
    ['coordinator','client','return selected value'],
    ['coordinator','repair','enqueue stale replica repair'],
    ['repair','replicaC','write version 12 asynchronously']
  ],[0,1,4,7]],
  'Causal consistency':['topology',[
    ['session','Client session','causal dependency context','client',14,50],
    ['router','Causal read router','dependency-aware routing','gateway',38,50],
    ['replicaA','Replica A','progress includes dependency','replica',66,18],
    ['replicaB','Replica B','progress behind dependency','replica',66,82],
    ['log','Replication log','ordered causal updates','queue',38,18],
    ['progress','Replica progress index','applied dependency versions','index',86,50]
  ],[
    ['session','router','send dependency token'],
    ['router','progress','check replica progress'],
    ['progress','router','identify caught-up replica'],
    ['router','replicaA','route causal read'],
    ['log','replicaB','deliver missing dependency'],
    ['replicaB','progress','advance applied progress'],
    ['replicaA','session','return causally valid value']
  ],[0,1,3,6]],
  'Strong consistency':['topology',[
    ['client','Strong-consistency client','linearizable operation','client',14,50],
    ['leader','Leader log','orders writes and reads','replica',38,50],
    ['followerA','Follower A','replicated log','replica',66,18],
    ['followerB','Follower B','replicated log','replica',66,82],
    ['commit','Quorum commit index','majority-confirmed position','storage',86,50],
    ['machine','Replicated state machine','applied committed state','service',38,82]
  ],[
    ['client','leader','submit write'],
    ['leader','followerA','replicate ordered entry'],
    ['leader','followerB','replicate ordered entry'],
    ['followerA','commit','acknowledge majority entry'],
    ['commit','leader','advance commit index'],
    ['leader','machine','apply committed entry'],
    ['machine','client','serve read after barrier']
  ],[0,1,3,6]],
  'Consensus':['architecture',[
    ['proposer','Consensus proposer','candidate command','client',14,50],
    ['acceptorA','Acceptor A','durable vote','replica',42,18],
    ['acceptorB','Acceptor B','durable vote','replica',68,18],
    ['acceptorC','Acceptor C','durable vote','replica',86,50],
    ['learner','Consensus learner','chosen command observer','service',68,82],
    ['machine','Replicated state machine','deterministic application','service',32,82]
  ],[
    ['proposer','acceptorA','propose command'],
    ['proposer','acceptorB','propose command'],
    ['proposer','acceptorC','propose command'],
    ['acceptorA','learner','report accepted vote'],
    ['acceptorB','learner','complete acceptor quorum'],
    ['learner','machine','apply chosen command']
  ],[0,1,4,5]],
  'Paxos':['sequence',[
    ['proposer','Paxos proposer','ballot coordinator','client',14,50],
    ['acceptorA','Acceptor A','promised ballot state','replica',42,18],
    ['acceptorB','Acceptor B','promised ballot state','replica',68,18],
    ['acceptorC','Acceptor C','promised ballot state','replica',86,50],
    ['learner','Paxos learner','chosen value observer','service',68,82],
    ['log','Chosen value log','durable learned value','storage',32,82]
  ],[
    ['proposer','acceptorA','Prepare ballot n'],
    ['proposer','acceptorB','Prepare ballot n'],
    ['acceptorA','proposer','Promise with accepted value'],
    ['acceptorB','proposer','Promise completes quorum'],
    ['proposer','acceptorC','Accept value at ballot n'],
    ['acceptorA','learner','Accepted notification'],
    ['acceptorB','learner','Accepted quorum reached'],
    ['learner','log','persist chosen value']
  ],[0,2,4,7]],
  'Raft':['topology',[
    ['client','Raft client','state-machine command','client',14,50],
    ['leader','Leader log','current-term authority','replica',38,50],
    ['followerA','Follower log A','AppendEntries target','replica',66,18],
    ['followerB','Follower log B','AppendEntries target','replica',66,82],
    ['commit','Majority commit index','quorum-confirmed offset','storage',86,50],
    ['machine','Raft state machine','applies committed entries','service',38,82]
  ],[
    ['client','leader','append client command'],
    ['leader','followerA','AppendEntries with log entry'],
    ['leader','followerB','AppendEntries with log entry'],
    ['followerA','leader','ack replicated entry'],
    ['followerB','commit','majority advances commit'],
    ['commit','leader','publish committed index'],
    ['leader','machine','apply committed command'],
    ['machine','client','return command result']
  ],[0,1,4,7]]
};

for (const chapter of window.SYSTEM_DESIGN_CHAPTERS) {
  for (const concept of chapter.groups.flatMap(group=>group.concepts)) {
    const spec = SYSTEM_DESIGN_DISTRIBUTED_ALGORITHM_OVERRIDES_3[concept.name];
    if (!spec) continue;
    concept.diagram = SYSTEM_DESIGN_AUTHORED_DIAGRAM_3(spec,concept.visual.steps.length);
  }
}
