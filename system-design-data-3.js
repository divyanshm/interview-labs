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
