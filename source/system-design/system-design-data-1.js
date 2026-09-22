window.SYSTEM_DESIGN_CHAPTERS = [...(window.SYSTEM_DESIGN_CHAPTERS || []),
{id:'distributed-systems-fundamentals', title:'Distributed Systems Fundamentals', intro:'Reason explicitly about consistency, availability, failure, time, delivery, and ordering.', groups:[
  {title:'Consistency and availability', concepts:[
    {name:'CAP theorem', summary:'During a network partition, a replicated system must choose per operation between one consistent history and a successful response from every side.', tradeoff:'Partition tolerance makes the consistency-versus-availability choice unavoidable.'},
    {name:'PACELC', summary:'PACELC extends CAP: during partitions choose availability or consistency; otherwise choose latency or consistency.', tradeoff:'Replica coordination costs latency even without failures.'},
    {name:'Consistency models', summary:'A consistency model defines which values operations may observe under concurrency and failure.', tradeoff:'Stronger guarantees require more coordination.'},
    {name:'Strong consistency', summary:'Strong consistency presents completed updates through one authoritative view, commonly with real-time ordering.', tradeoff:'Coordination raises latency and can reduce partition availability.'},
    {name:'Linearizability', summary:'Each operation appears atomic between invocation and response while respecting real-time order.', tradeoff:'Requires critical-path coordination.'},
    {name:'Sequential consistency', summary:'All operations appear in one order that preserves each participant program order, but not necessarily wall-clock order.', tradeoff:'Weaker than linearizability and still requires global ordering.'},
    {name:'Causal consistency', summary:'Causally related operations are observed in order while concurrent operations may be observed differently.', tradeoff:'Needs causal metadata and session propagation.'},
    {name:'Eventual consistency', summary:'Replicas may diverge temporarily but converge when updates stop and messages are delivered.', tradeoff:'Clients must tolerate stale reads and conflicts.'},
    {name:'Session consistency', summary:'A client session receives guarantees such as monotonic reads and read-your-writes without imposing them globally.', tradeoff:'Constrains routing or requires session tokens.'},
    {name:'Read-your-writes', summary:'A session never reads a version older than its own acknowledged write.', tradeoff:'May require sticky routing or waiting for replica catch-up.'},
    {name:'Availability', summary:'Availability is the fraction of valid operations that complete successfully within the promised time.', tradeoff:'Higher availability needs redundancy and may weaken coordination.'},
    {name:'Partition tolerance', summary:'Partition tolerance means the system has defined behavior when communication between healthy nodes is lost.', tradeoff:'Continuing on both sides risks divergence.'},
    {name:'Quorum reads/writes', summary:'Reads contact R replicas and writes contact W of N; intersecting quorums can expose the latest accepted version.', tradeoff:'Larger quorums increase latency and reduce availability.'},
    {name:'Read repair', summary:'A read compares replica versions and asynchronously or synchronously updates stale copies.', tradeoff:'Repairs hot data but adds read cost and misses cold keys.'},
    {name:'Anti-entropy', summary:'Background comparison and synchronization repairs divergent replicas independently of foreground reads.', tradeoff:'Consumes network, CPU, and storage bandwidth.'}
  ]},
  {title:'Failure, time, and semantics', concepts:[
    {name:'Gossip protocols', summary:'Nodes repeatedly exchange partial membership or state until information converges probabilistically.', tradeoff:'Scales well but propagation is delayed and approximate.'},
    {name:'Failure detectors', summary:'Heartbeats and timeouts produce suspicions because delay is indistinguishable from failure in an asynchronous network.', tradeoff:'Fast detection increases false positives.'},
    {name:'FLP impossibility', summary:'Deterministic consensus cannot guarantee termination in a fully asynchronous system with even one crash failure.', tradeoff:'Practical liveness relies on timing assumptions or randomness.'},
    {name:'Split brain', summary:'Multiple nodes simultaneously believe they are authoritative and may accept conflicting work.', tradeoff:'Preventing it intentionally stops minority-side progress.'},
    {name:'Byzantine vs crash failures', summary:'Crash failures stop a participant; Byzantine failures allow arbitrary or contradictory behavior and need stronger protocols.', tradeoff:'Byzantine tolerance requires more replicas and messages.'},
    {name:'Time and clocks', summary:'Distributed time is uncertain, so systems separate human time, duration measurement, causality, and ordering.', tradeoff:'No single clock mechanism serves every purpose.'},
    {name:'Physical clocks', summary:'Physical clocks approximate wall time and are synchronized within an error bound.', tradeoff:'Skew and clock adjustments make them unsafe as sole ordering evidence.'},
    {name:'Logical clocks', summary:'Logical clocks derive ordering from events and messages rather than wall time.', tradeoff:'They express order but not real elapsed time.'},
    {name:'Lamport clocks', summary:'Counters ensure that causal precedence implies increasing timestamps, with tie-breakers providing a total order.', tradeoff:'They cannot distinguish concurrency.'},
    {name:'Vector clocks', summary:'Per-participant counters identify whether versions are ordered or concurrent.', tradeoff:'Metadata grows with the writer set.'},
    {name:'Hybrid logical clocks', summary:'Hybrid logical clocks combine bounded physical time with logical counters while preserving causality.', tradeoff:'Time-based claims still depend on a clock-skew bound.'},
    {name:'Idempotency', summary:'Repeating an operation with the same identity produces the same durable effect.', tradeoff:'Requires stable keys and retained outcome state.'},
    {name:'Delivery semantics', summary:'Delivery semantics define whether messages may be lost or repeated and where the guarantee ends.', tradeoff:'Stronger semantics require durable state and coordination.'},
    {name:'At-most-once', summary:'A message is attempted no more than once, avoiding duplicates but allowing loss.', tradeoff:'Suitable only when loss is acceptable.'},
    {name:'At-least-once', summary:'A message is retried until acknowledged, preventing intentional loss but allowing duplicates.', tradeoff:'Consumers must be idempotent.'},
    {name:'Exactly-once', summary:'One logical effect occurs once within a precisely defined transactional or deduplicated boundary.', tradeoff:'External side effects remain difficult and coordination is expensive.'},
    {name:'Ordering', summary:'Ordering defines which observers must agree on the relative position of operations or messages.', tradeoff:'Broader ordering reduces parallelism.'},
    {name:'FIFO ordering', summary:'Messages from one producer or partition are observed in send order.', tradeoff:'Does not order independent producers.'},
    {name:'Causal ordering', summary:'Messages related by happened-before are delivered in causal order while concurrent messages may vary.', tradeoff:'Requires dependency metadata.'},
    {name:'Total ordering', summary:'All participants observe all ordered items in the same sequence.', tradeoff:'Global agreement limits throughput and availability.'}
  ]}
]},
{id:'consensus-coordination', title:'Consensus & Coordination', intro:'Coordinate only the decisions that require one durable order or exclusive owner.', groups:[
  {title:'Consensus and leadership', concepts:[
    {name:'Paxos', summary:'Numbered proposals and intersecting acceptor quorums ensure only one value is chosen for a slot.', tradeoff:'Correct but subtle to implement and operate.'},
    {name:'Raft', summary:'An elected leader replicates an ordered log and commits entries after majority acknowledgement.', tradeoff:'Leader dependence and quorum loss pause progress.'},
    {name:'Leader election', summary:'Participants choose one leader for a term after verifying candidate freshness and quorum support.', tradeoff:'Elections pause work and can thrash under instability.'},
    {name:'Quorum consensus', summary:'Intersecting quorums preserve chosen decisions across failures and leadership changes.', tradeoff:'Cannot progress safely without enough reachable voters.'},
    {name:'Distributed locks', summary:'A linearizable coordinator grants exclusive ownership of a named resource for bounded or explicit tenure.', tradeoff:'Serializes work and can become a bottleneck.'},
    {name:'Leases', summary:'A lease grants time-bounded ownership that must be renewed and fenced after expiry.', tradeoff:'Short leases improve failover but amplify renewal load and pause sensitivity.'},
    {name:'Fencing tokens', summary:'Each ownership grant carries a monotonically increasing token that protected resources use to reject stale holders.', tradeoff:'Every side-effecting resource must enforce the token.'},
    {name:'Compare-and-swap', summary:'Compare-and-swap updates a value only if its current version matches an expected version.', tradeoff:'Contention causes retries and possible starvation.'}
  ]},
  {title:'Coordination services and membership', concepts:[
    {name:'Distributed coordination', summary:'Distributed coordination manages shared metadata, membership, ownership, or ordered configuration through a consistent control plane.', tradeoff:'Adds a critical dependency and coordination latency.'},
    {name:'Zookeeper-style coordination', summary:'A hierarchical, strongly ordered namespace supports ephemeral membership, watches, locks, and leader election.', tradeoff:'Watch and session semantics require careful client handling.'},
    {name:'etcd-style coordination', summary:'A replicated key-value store exposes linearizable operations, revisions, watches, and leases for control-plane state.', tradeoff:'Keep values and write volume small to protect consensus throughput.'},
    {name:'Membership protocols', summary:'Membership tracks participating nodes and generations through consensus or gossip.', tradeoff:'Fast membership changes can destabilize placement and failover.'},
    {name:'Leader/follower', summary:'One leader orders control operations while followers replicate state and stand ready for election.', tradeoff:'Simple authority model with leader bottlenecks.'},
    {name:'Primary/backup', summary:'A primary performs work while backups receive enough state to take over after fencing.', tradeoff:'Standby capacity and promotion correctness cost resources.'},
    {name:'Term/epoch management', summary:'Monotonic generations distinguish current authority from delayed messages and stale leaders.', tradeoff:'Epoch state must be durably persisted and propagated.'},
    {name:'Split-brain prevention', summary:'Quorums, epochs, and fencing ensure at most one side can commit authoritative work.', tradeoff:'Minority partitions become unavailable.'}
  ]}
]},
{id:'replication', title:'Replication', intro:'Select replica topology by write authority, acknowledgement point, lag, and conflict semantics.', groups:[
  {title:'Replication topologies', concepts:[
    {name:'Leader/follower replication', summary:'A leader orders writes and followers replay its log, optionally serving lag-tolerant reads.', tradeoff:'The leader is a bottleneck and failover pauses writes.'},
    {name:'Multi-leader replication', summary:'Multiple leaders accept local writes and exchange updates asynchronously.', tradeoff:'Concurrent updates require conflict resolution.'},
    {name:'Leaderless replication', summary:'Clients read and write multiple replicas without a permanent write leader.', tradeoff:'Version reconciliation and tail latency move to the request path.'},
    {name:'Synchronous replication', summary:'Success waits until required replicas durably accept the write.', tradeoff:'Remote latency and failures affect write availability.'},
    {name:'Asynchronous replication', summary:'The authority acknowledges before remote replicas persist the update.', tradeoff:'Failover may lose acknowledged writes and serve stale data.'},
    {name:'Semi-synchronous replication', summary:'Success waits for limited replica acknowledgement while remaining copies catch up asynchronously.', tradeoff:'The exact acknowledgement stage may not imply remote durability.'},
    {name:'Quorum replication', summary:'Reads and writes contact configurable replica subsets whose overlap carries recent state.', tradeoff:'Quorum size trades latency against consistency and availability.'},
    {name:'Chain replication', summary:'Writes flow through an ordered replica chain and reads commonly use the tail, separating update propagation from read authority.', tradeoff:'Chain repair and tail latency matter during failures.'},
    {name:'Read replicas', summary:'Replicas serve read traffic to improve scale and locality under an explicit staleness policy.', tradeoff:'Replica lag causes stale and non-monotonic reads.'},
    {name:'Write replicas', summary:'Write replicas durably accept updates as leaders, quorum members, or multi-writer peers.', tradeoff:'More write authorities increase coordination or conflict cost.'}
  ]},
  {title:'Lag, conflicts, and geography', concepts:[
    {name:'Replication lag', summary:'Lag measures how far a replica trails authoritative state in time, bytes, or versions.', tradeoff:'Lower lag consumes more bandwidth and apply capacity.'},
    {name:'Conflict resolution', summary:'Concurrent replica updates are detected and merged by deterministic technical or domain rules.', tradeoff:'Automatic convergence may discard user intent.'},
    {name:'Last-write-wins', summary:'The update with the greatest timestamp or version wins and all replicas converge on it.', tradeoff:'Simple but can silently lose concurrent writes.'},
    {name:'Version vectors', summary:'Per-writer version components distinguish causal descendants from concurrent siblings.', tradeoff:'Metadata grows and needs compaction.'},
    {name:'CRDTs', summary:'Conflict-free replicated data types merge state or operations so replicas converge independent of delivery order.', tradeoff:'Only fits data with suitable merge semantics.'},
    {name:'Active-active replication', summary:'Multiple sites serve traffic simultaneously and partition, coordinate, or reconcile writes.', tradeoff:'Best locality and utilization with hardest consistency model.'},
    {name:'Active-passive replication', summary:'One site serves traffic while a synchronized standby is promoted after failure.', tradeoff:'Simpler conflicts but idle capacity and failover delay.'},
    {name:'Cross-region replication', summary:'Copies span cloud regions to improve locality and regional disaster recovery.', tradeoff:'Distance increases latency, cost, and failover complexity.'},
    {name:'Cross-datacenter replication', summary:'Copies cross independent datacenters to survive facility-level faults.', tradeoff:'Network variability and correlated control planes must be considered.'}
  ]}
]},
{id:'partitioning-sharding', title:'Partitioning / Sharding', intro:'Partition for locality and balance while planning for skew, movement, and fan-out.', groups:[
  {title:'Placement strategies', concepts:[
    {name:'Hash partitioning', summary:'A key hash maps data to buckets and usually distributes high-cardinality keys evenly.', tradeoff:'Loses range locality and complicates membership changes.'},
    {name:'Consistent hashing', summary:'Keys and nodes share a ring so membership changes move only nearby ranges.', tradeoff:'Balance is approximate and ownership metadata grows.'},
    {name:'Rendezvous hashing', summary:'Each key scores candidate nodes and selects the highest-ranked owners with minimal movement.', tradeoff:'Naive routing evaluates every candidate.'},
    {name:'Range partitioning', summary:'Contiguous key intervals map to shards, enabling efficient ordered scans.', tradeoff:'Monotonic or skewed keys create hotspots.'},
    {name:'Directory-based partitioning', summary:'A versioned directory explicitly maps keys or ranges to shard owners.', tradeoff:'Flexible placement adds a metadata dependency.'},
    {name:'Virtual nodes', summary:'Many logical tokens per physical node smooth distribution and capacity weighting.', tradeoff:'More fragmented ownership and transfer metadata.'}
  ]},
  {title:'Movement and skew', concepts:[
    {name:'Rebalancing', summary:'Ownership moves between nodes using copy, catch-up, versioned cutover, and source retirement.', tradeoff:'Movement competes with foreground traffic.'},
    {name:'Hot partitions', summary:'A partition saturates because its traffic or data grows faster than peers.', tradeoff:'Splitting or isolating it can reduce locality.'},
    {name:'Hot keys', summary:'One logical key dominates a partition despite otherwise balanced placement.', tradeoff:'Salting or replication complicates ordering and reads.'},
    {name:'Shard splitting', summary:'An oversized or hot shard divides into independently owned children.', tradeoff:'Splits add routing changes and migration I/O.'},
    {name:'Shard merging', summary:'Small adjacent shards combine to reduce overhead and fragmentation.', tradeoff:'Merge work consumes I/O and can recreate hotspots.'},
    {name:'Dynamic partitioning', summary:'The system adjusts partition boundaries or ownership from observed size and load.', tradeoff:'Automation can oscillate without hysteresis and movement budgets.'}
  ]},
  {title:'Query and tenancy behavior', concepts:[
    {name:'Scatter-gather', summary:'A query fans out to relevant shards and merges their responses.', tradeoff:'Latency follows stragglers and cost grows with shard count.'},
    {name:'Fan-out', summary:'One request expands into many downstream operations or messages.', tradeoff:'Amplifies load and tail-failure probability.'},
    {name:'Partition affinity', summary:'Related work is routed to the same partition to preserve locality, order, or cache reuse.', tradeoff:'Affinity can cause skew and constrain failover.'},
    {name:'Tenant-based partitioning', summary:'Tenant identity drives placement to improve isolation, locality, or compliance.', tradeoff:'Large tenants require subpartitioning and migration support.'}
  ]}
]},
{id:'distributed-caching', title:'Distributed Caching', intro:'Design cached data as a disposable copy with explicit freshness and refill behavior.', groups:[
  {title:'Access patterns', concepts:[
    {name:'Cache-aside', summary:'The application loads misses from the source and explicitly fills or invalidates the cache.', tradeoff:'Simple but exposes refill and invalidation races.'},
    {name:'Read-through cache', summary:'The cache invokes a loader on misses and presents one read interface.', tradeoff:'Couples cache infrastructure to the source and serialization.'},
    {name:'Write-through cache', summary:'Writes synchronously update both cache and source before success.', tradeoff:'Every write pays both paths.'},
    {name:'Write-behind cache', summary:'Writes land in cache and are asynchronously persisted, often with batching.', tradeoff:'Cache failure can lose acknowledged data.'},
    {name:'Refresh-ahead', summary:'Popular entries are refreshed before expiry to avoid user-visible misses.', tradeoff:'May refresh data that is never reused.'},
    {name:'Cache warming', summary:'Likely hot entries are preloaded before traffic or after fleet changes.', tradeoff:'Consumes source capacity and can predict poorly.'}
  ]},
  {title:'Freshness and misses', concepts:[
    {name:'Cache invalidation', summary:'Changed source data removes, updates, or versions cached copies through an ordered policy.', tradeoff:'Precise invalidation increases write-path coupling.'},
    {name:'TTL', summary:'A time to live bounds entry freshness and should include jitter to avoid synchronized expiry.', tradeoff:'Short TTLs increase misses and source load.'},
    {name:'Negative caching', summary:'Not-found or failed lookups are cached briefly to prevent repeated expensive misses.', tradeoff:'Can hide newly created data or prolong transient errors.'},
    {name:'Cache stampede', summary:'Many requests simultaneously reload the same expired or evicted value.', tradeoff:'Prevention adds coordination or permits stale reads.'},
    {name:'Thundering herd', summary:'A large client population wakes or retries together and overwhelms a dependency.', tradeoff:'Jitter and admission control delay some clients.'},
    {name:'Request coalescing', summary:'Concurrent requests for the same resource share one in-flight load.', tradeoff:'One slow load delays every waiter.'},
    {name:'Single-flight', summary:'Exactly one loader per key performs a miss refill while peers await its result.', tradeoff:'Requires cleanup and bounded waiting when the loader fails.'},
    {name:'Probabilistic early expiration', summary:'Requests randomly refresh near expiry so popular keys renew before a synchronized miss.', tradeoff:'Some entries refresh earlier than necessary.'}
  ]},
  {title:'Topology and correctness', concepts:[
    {name:'Distributed cache', summary:'Cached entries are partitioned and optionally replicated across multiple cache nodes.', tradeoff:'Node loss remaps keys and can trigger miss storms.'},
    {name:'Local + distributed cache', summary:'A process-local near-cache fronts a shared distributed cache to remove network latency for hot values.', tradeoff:'Two cache layers multiply invalidation and staleness paths.'},
    {name:'Cache consistency', summary:'The cache contract defines how cached versions relate to authoritative source updates.', tradeoff:'Stronger consistency reduces latency and availability benefits.'},
    {name:'Cache versioning', summary:'Keys or values carry generations so stale fills cannot replace newer data.', tradeoff:'Requires version propagation and temporary duplication.'},
    {name:'Hot-key mitigation', summary:'Replicate, near-cache, coalesce, or split work for keys that saturate one cache owner.', tradeoff:'More copies and routing rules complicate invalidation.'}
  ]}
]},
{id:'probabilistic-data-structures', title:'Probabilistic / Approximate Data Structures', intro:'Use explicit error guarantees to exchange exactness for bounded memory and computation.', groups:[
  {title:'Membership', concepts:[
    {name:'Bloom filter', summary:'Multiple hashes set bits to test membership with no false negatives and configurable false positives.', tradeoff:'Standard filters cannot safely delete.'},
    {name:'Counting Bloom filter', summary:'Counters replace bits so insertions can be removed while preserving membership tests.', tradeoff:'Deletion support costs substantially more memory.'},
    {name:'Cuckoo filter', summary:'Short fingerprints occupy alternative buckets and relocate on collision, supporting lookup and deletion.', tradeoff:'Insertion can fail near high occupancy.'},
    {name:'Quotient filter', summary:'Compact hash quotients and remainders support membership, deletion, and locality-friendly scans.', tradeoff:'Performance degrades at high load factors.'}
  ]},
  {title:'Cardinality and frequency', concepts:[
    {name:'HyperLogLog', summary:'Register maxima from hashed leading-zero counts estimate distinct cardinality in fixed memory.', tradeoff:'Returns a statistical estimate, not members.'},
    {name:'Count-Min Sketch', summary:'Hashed counter rows estimate frequency by taking the minimum counter for an item.', tradeoff:'Collisions cause overestimation.'},
    {name:'Heavy hitters', summary:'Bounded algorithms identify items above a meaningful stream-frequency threshold.', tradeoff:'Candidates near the threshold may be approximate.'},
    {name:'Top-K sketches', summary:'Frequency sketches plus bounded candidate tracking estimate the most frequent items.', tradeoff:'Close-ranked items may be omitted or reordered.'},
    {name:'HyperLogLog++', summary:'HyperLogLog++ improves small-cardinality bias, sparse representation, and estimator accuracy.', tradeoff:'More implementation complexity than basic HyperLogLog.'},
    {name:'Approximate distinct counting', summary:'A compact sketch estimates unique items and can often merge summaries from many partitions.', tradeoff:'Accuracy depends on memory and estimator assumptions.'},
    {name:'Probabilistic counters', summary:'Counters update with decreasing probability as values grow, representing large counts in few bits.', tradeoff:'Relative error replaces exact increments.'}
  ]},
  {title:'Similarity and sampling', concepts:[
    {name:'MinHash', summary:'Minimum hash signatures estimate Jaccard similarity between sets.', tradeoff:'More signature components improve accuracy at memory cost.'},
    {name:'SimHash', summary:'A weighted bit signature preserves angular similarity and supports near-duplicate detection by Hamming distance.', tradeoff:'Best for cosine-like similarity, not arbitrary distance metrics.'},
    {name:'Locality-sensitive hashing', summary:'A metric-specific hash family places similar items together with higher probability.', tradeoff:'Approximate search can miss true neighbors.'},
    {name:'Reservoir sampling', summary:'A fixed-size uniform sample is maintained from a stream of unknown length.', tradeoff:'Rare subgroups may be absent.'},
    {name:'Sampling algorithms', summary:'Uniform, weighted, stratified, or adaptive sampling reduces data while preserving defined statistical properties.', tradeoff:'Incorrect sampling frames create biased conclusions.'}
  ]}
]},
{id:'distributed-messaging-eventing', title:'Distributed Messaging & Eventing', intro:'Separate durable history, delivery attempts, consumer progress, and committed side effects.', groups:[
  {title:'Messaging models', concepts:[
    {name:'Message queues', summary:'Queues buffer work and distribute each message to one competing consumer.', tradeoff:'Decoupling introduces retries, duplicates, and queue delay.'},
    {name:'Pub/Sub', summary:'Publishers emit once while independent subscriptions each receive and track the event.', tradeoff:'Fan-out multiplies delivery and compatibility costs.'},
    {name:'Event streaming', summary:'Durable ordered event sequences support continuous processing and replay.', tradeoff:'Retention and stateful consumers increase operational complexity.'},
    {name:'Kafka-style logs', summary:'Replicated partition logs append records at offsets and let consumers manage replayable progress.', tradeoff:'Ordering is normally partition-scoped.'},
    {name:'Consumer groups', summary:'Group members divide partitions so one active member processes each partition for that group.', tradeoff:'Parallelism is bounded by partition count and rebalances pause work.'},
    {name:'Partitioning', summary:'A routing key maps messages to ordered, independently scalable log or queue partitions.', tradeoff:'Bad keys create hotspots or break required ordering.'}
  ]},
  {title:'Progress and retention', concepts:[
    {name:'Offsets', summary:'An offset identifies a stable position within an ordered partition.', tradeoff:'It names broker position, not committed business effects.'},
    {name:'Consumer offsets', summary:'A consumer offset records group progress and must be coordinated with side effects.', tradeoff:'Early commits lose work; late commits duplicate it.'},
    {name:'Replay', summary:'Consumers reset progress and reprocess retained history to recover or rebuild state.', tradeoff:'Side effects and old schemas must remain replay-safe.'},
    {name:'Retention', summary:'Time- or size-based policy determines how long messages remain replayable.', tradeoff:'Long retention costs storage and extends compatibility obligations.'},
    {name:'Compaction', summary:'Log compaction retains the latest value or tombstone per key while preserving an update stream.', tradeoff:'Removes intermediate history and needs safe tombstone retention.'}
  ]},
  {title:'Delivery control', concepts:[
    {name:'Dead-letter queues', summary:'Messages exceeding retry or validation policy are isolated for diagnosis and controlled replay.', tradeoff:'Without ownership and alerts, a DLQ becomes silent data loss.'},
    {name:'Retry queues', summary:'Transient failures are rescheduled with attempt metadata and backoff outside the main flow.', tradeoff:'Retries reorder messages and extend latency.'},
    {name:'Delayed queues', summary:'Messages become eligible only after a scheduled time, supporting retry and workflow timers.', tradeoff:'Scheduling precision and cancellation add state.'},
    {name:'Priority queues', summary:'Higher-priority messages are selected before lower-priority work within fairness constraints.', tradeoff:'Low-priority traffic can starve.'},
    {name:'Message ordering', summary:'A broker and consumer preserve a declared order scope, usually one partition key.', tradeoff:'Ordering constrains parallel consumption.'},
    {name:'Exactly-once processing', summary:'Input progress and output state commit atomically inside a supported processing boundary.', tradeoff:'External effects still require idempotency or transactions.'},
    {name:'Idempotent consumers', summary:'Repeated delivery produces one durable business outcome using natural semantics or deduplication state.', tradeoff:'Requires stable message identities and retention.'},
    {name:'Transactional messaging', summary:'Message production or consumption participates in an atomic transaction with supported state changes.', tradeoff:'Broker coupling and coordination reduce throughput.'}
  ]},
  {title:'Integration patterns', concepts:[
    {name:'Outbox pattern', summary:'Business state and an outgoing message record commit together, then a relay publishes the record.', tradeoff:'Publication is delayed and may duplicate.'},
    {name:'Inbox pattern', summary:'A consumed message identity and local effect commit together to suppress duplicate effects.', tradeoff:'Inbox state needs cleanup and retention rules.'},
    {name:'Change Data Capture', summary:'Committed database log changes are emitted for replication, events, or projections.', tradeoff:'Schema changes and downstream lag require careful operations.'},
    {name:'Event sourcing', summary:'Immutable domain events are authoritative and current state is reconstructed by replay or snapshots.', tradeoff:'Event evolution and projection repair are complex.'}
  ]}
]},
{id:'distributed-transactions', title:'Distributed Transactions', intro:'Keep invariants local when possible and make every multi-step outcome durable and recoverable.', groups:[
  {title:'Atomic commit', concepts:[
    {name:'Two-phase commit (2PC)', summary:'Participants durably prepare before a coordinator records and broadcasts commit or abort.', tradeoff:'Prepared resources can block during coordinator failure.'},
    {name:'Three-phase commit', summary:'An added pre-commit phase reduces blocking only under restrictive timing and partition assumptions.', tradeoff:'More messages without practical partition safety in common systems.'},
    {name:'XA transactions', summary:'XA standardizes transaction-manager coordination of resource managers using prepare and commit phases.', tradeoff:'Tight coupling, blocking, and difficult cross-resource operations.'},
    {name:'Atomic commit', summary:'All participating resources reach one durable commit or abort decision.', tradeoff:'Agreement adds latency and can block progress.'}
  ]},
  {title:'Long-running workflows', concepts:[
    {name:'Saga pattern', summary:'A durable sequence of local transactions uses compensations when a later step fails.', tradeoff:'Intermediate states are visible and rollback is semantic.'},
    {name:'Choreography', summary:'Services advance a workflow by reacting to one another through events.', tradeoff:'Loose coupling obscures the global state machine.'},
    {name:'Orchestration', summary:'A durable coordinator commands steps and tracks replies, retries, timeouts, and compensation.', tradeoff:'Clear control creates coordinator coupling.'},
    {name:'Compensating transactions', summary:'Business actions counteract previously committed steps and must be idempotent and recoverable.', tradeoff:'Compensation may not restore the exact prior state.'},
    {name:'Transactional outbox', summary:'A local transaction atomically stores business changes and a pending integration event.', tradeoff:'Needs an asynchronous relay, deduplication, and cleanup.'}
  ]},
  {title:'Concurrency control', concepts:[
    {name:'Distributed locking', summary:'Exclusive ownership spans processes through a consistent lock service and fencing.', tradeoff:'Locks reduce availability and can hold remote resources.'},
    {name:'Optimistic concurrency', summary:'Operations proceed without long locks and validate expected versions before commit.', tradeoff:'High contention causes retries and wasted work.'},
    {name:'Pessimistic concurrency', summary:'Locks prevent conflicting work before it executes.', tradeoff:'Waiting and deadlocks reduce concurrency.'},
    {name:'MVCC', summary:'Multiple versions let readers use stable snapshots while writers create new committed versions.', tradeoff:'Long snapshots increase storage and cleanup pressure.'},
    {name:'Snapshot isolation', summary:'Transactions read a consistent snapshot and typically reject concurrent writes to the same item.', tradeoff:'Write skew can violate cross-item invariants.'},
    {name:'Serializable transactions', summary:'Concurrent transactions produce an outcome equivalent to some serial execution.', tradeoff:'Contention causes blocking or aborts.'},
    {name:'Idempotent operations', summary:'A stable operation identity makes retries converge on one recorded transaction outcome.', tradeoff:'Deduplication state needs scope and expiry.'}
  ]}
]},
{id:'reliability-fault-tolerance', title:'Reliability & Fault Tolerance', intro:'Bound resource use, isolate dependency failures, and recover within explicit objectives.', groups:[
  {title:'Remote-call resilience', concepts:[
    {name:'Timeouts', summary:'Timeouts bound individual waits using the remaining end-to-end deadline and expected latency.', tradeoff:'Too short creates false failures; too long retains resources.'},
    {name:'Retries', summary:'Retries repeat classified transient failures only when operations are safe and budget remains.', tradeoff:'They amplify load and can duplicate side effects.'},
    {name:'Exponential backoff', summary:'Delay grows between attempts so a recovering dependency is not continuously hammered.', tradeoff:'Recovery takes longer for individual requests.'},
    {name:'Jitter', summary:'Randomized timing prevents synchronized retries, refreshes, and reconnects.', tradeoff:'Adds variability to client latency.'},
    {name:'Retry budgets', summary:'A bounded fraction of capacity or traffic may be spent on retries.', tradeoff:'Some recoverable work is abandoned to protect the system.'},
    {name:'Circuit breakers', summary:'Repeated classified failures open a circuit that fails fast before probing recovery.', tradeoff:'Bad thresholds reject healthy traffic or flap.'},
    {name:'Hedged requests', summary:'A delayed duplicate goes to another replica and the first valid response wins.', tradeoff:'Consumes extra capacity and requires safe cancellation.'},
    {name:'Request cancellation', summary:'Callers propagate that a result is no longer needed so downstream work can stop safely.', tradeoff:'Committed effects may still complete after cancellation.'}
  ]},
  {title:'Overload and isolation', concepts:[
    {name:'Bulkheads', summary:'Separate resource pools prevent one dependency, tenant, or workload from exhausting all capacity.', tradeoff:'Reserved capacity can sit idle.'},
    {name:'Load shedding', summary:'Excess or low-priority work is rejected before queues and dependencies collapse.', tradeoff:'Intentional rejection preserves successful traffic.'},
    {name:'Backpressure', summary:'Downstream saturation signals upstream stages to slow, block, or reject production.', tradeoff:'Pressure can propagate into visible unavailability.'},
    {name:'Rate limiting', summary:'Admission is bounded over time for a defined user, tenant, endpoint, or dependency scope.', tradeoff:'Global precision requires coordination.'},
    {name:'Adaptive throttling', summary:'Admission limits adjust from latency, errors, queueing, or available concurrency.', tradeoff:'Unstable feedback can oscillate or overreact.'},
    {name:'Admission control', summary:'Work is accepted only when capacity, priority, and deadline make success plausible.', tradeoff:'Requires trustworthy load signals and fairness policy.'},
    {name:'Dependency isolation', summary:'Dedicated pools, queues, quotas, and failure policies stop one dependency from consuming shared resources.', tradeoff:'Isolation reduces pooling efficiency.'},
    {name:'Cell-based architecture', summary:'Self-contained cells serve bounded traffic subsets so failures and deployments remain local.', tradeoff:'Multiplies capacity planning and operations.'},
    {name:'Blast-radius reduction', summary:'Cells, staged rollout, quotas, and separate credentials limit how much one fault can affect.', tradeoff:'More boundaries increase management overhead.'}
  ]},
  {title:'Failure policy and domains', concepts:[
    {name:'Fail-fast', summary:'Invalid or unlikely-to-succeed work is rejected immediately before consuming scarce resources.', tradeoff:'Transiently recoverable requests may fail sooner.'},
    {name:'Fail-open', summary:'When a control dependency fails, the operation proceeds to preserve availability.', tradeoff:'Can weaken security, policy, or consistency.'},
    {name:'Fail-closed', summary:'When a control dependency fails, the operation is denied to preserve safety or security.', tradeoff:'Dependency failure becomes user-visible unavailability.'},
    {name:'Graceful degradation', summary:'Core functions continue while optional, expensive, or stale-tolerant features are reduced.', tradeoff:'Users receive limited functionality.'},
    {name:'Fault domains', summary:'Fault domains identify components likely to fail together, such as a rack, zone, power source, or control plane.', tradeoff:'Spreading across domains raises latency and cost.'},
    {name:'Failure domains', summary:'Failure domains define operational containment and recovery boundaries for correlated faults.', tradeoff:'More independent domains require more capacity and coordination.'}
  ]}
]}
];

const systemDesignVisual = (a, b, c, d, s1, s2, s3, s4) => ({
  nodes:[[a[0],a[1]],[b[0],b[1]],[c[0],c[1]],[d[0],d[1]]],
  steps:[[0,[],s1],[1,[0],s2],[2,[0,1],s3],[3,[0,1,2],s4]]
});
const systemDesignVisuals = {
  'CAP theorem':systemDesignVisual(['Client','write v2'],['Replica A','reachable'],['Network partition','link down'],['Replica B','isolated'],'A client writes while both replicas initially hold v1.','The write reaches Replica A as communication to B fails.','The partition forces A to reject for consistency or accept for availability.','After healing, the system resumes one history or reconciles divergent versions.'),
  'PACELC':systemDesignVisual(['Request','operation'],['Partition policy','P: A or C'],['Steady-state policy','E: L or C'],['Consistency policy','chosen guarantee'],'Classify whether replicas can currently communicate.','Under partition, choose availability or coordinated consistency.','Without partition, choose lower latency or stronger replica agreement.','Apply the selected policy per operation and document both choices.'),
  'Consistency models':systemDesignVisual(['Write','v2'],['Replica set','visibility'],['Reader','observation'],['Consistency contract','allowed history'],'A write creates a new version under concurrent access.','The replication protocol controls when each copy exposes v2.','A reader may observe v1, v2, or an ordered sequence.','The model declares exactly which observed histories are legal.'),
  'Strong consistency':systemDesignVisual(['Writer','put v2'],['Serialization coordinator','serialize'],['Replicas','acknowledge'],['Reader','gets v2'],'The writer submits v2 to the authoritative path.','The authority orders v2 after prior operations.','Required replicas acknowledge before success is returned.','A subsequent read is routed or delayed until it can return v2.'),
  'Linearizability':systemDesignVisual(['Write request','write begins'],['Register state','v1 -> v2'],['Write response','write returns'],['Read request','read v2'],'A write is invoked while the object contains v1.','At one instant between invocation and response, the object becomes v2.','The completed write establishes a real-time boundary.','Any later read must observe v2 or a newer value.'),
  'Sequential consistency':systemDesignVisual(['Client A','A1 then A2'],['Client B','B1 then B2'],['Sequencer','single interleaving'],['Observers','same order'],'Each client emits operations in its own program order.','Operations may arrive without preserving wall-clock order across clients.','A sequencer chooses one interleaving that preserves A and B order.','Every observer sees that same interleaving, even if not real-time ordered.'),
  'Causal consistency':systemDesignVisual(['Post event','event A'],['Reply event','event B depends on A'],['Concurrent event','event C'],['Readers','causal view'],'A user publishes event A.','A reply B carries a dependency on A.','Independent event C occurs concurrently without that dependency.','Readers must see A before B, but may place C on either side.'),
  'Eventual consistency':systemDesignVisual(['Primary replica','v1 -> v2'],['Replica A','v1 at T0'],['Replica B','v1 at T0'],['Converged replica set','all v2 at Tn'],'The primary accepts v2 while replicas still expose v1.','Replica A receives and applies v2 after propagation delay.','Replica B remains stale briefly, then receives the update.','With no new writes, every replica converges to v2 at Tn.'),
  'Session consistency':systemDesignVisual(['Session token','version token 7'],['Router','minimum version'],['Replica A','version 6'],['Replica B','version 7'],'A session records the version returned by a successful operation.','The next request carries version token 7 to the router.','Replica A is rejected or awaited because it only has version 6.','Replica B serves the request while satisfying the session guarantee.'),
  'Read-your-writes':systemDesignVisual(['Client','write v2'],['Leader','commit index 12'],['Session token','min index 12'],['Read replica','wait then v2'],'The client writes v2 and the leader commits it at index 12.','The response returns a session token requiring index 12.','A later read presents that minimum version to a replica.','The replica catches up to index 12 before returning v2.'),
  'Availability':systemDesignVisual(['Requests','valid traffic'],['Service replicas','some failed'],['Load balancer','healthy routes'],['Responses','within SLO'],'Valid requests arrive during a component failure.','Redundant replicas continue serving while failed instances are removed.','The load balancer routes only to ready capacity.','Availability counts successful responses completed inside the promised time.'),
  'Partition tolerance':systemDesignVisual(['Node A','healthy'],['Network link','partitioned'],['Node B','healthy'],['Degradation policy','degrade safely'],'Both nodes operate normally while exchanging state.','The link fails although both processes remain healthy.','Each side follows quorum or ownership rules instead of guessing peer death.','The service preserves its declared safety or availability behavior until healing.'),
  'Quorum reads/writes':systemDesignVisual(['Coordinator','N=3'],['Write quorum','W=2'],['Read quorum','R=2'],['Read reconciler','latest version'],'A coordinator maps the key to three replicas.','A write succeeds after two replicas store the version.','A later read collects two replica responses.','Because R+W>N, the resolver can encounter and select the written version.'),
  'Read repair':systemDesignVisual(['Read coordinator','get key'],['Replica A','v3'],['Replica B','v2'],['Repair worker','write v3'],'A read queries multiple replicas for the same key.','Replica A returns the newer version v3.','Replica B reveals that it still stores v2.','The coordinator returns v3 and repairs Replica B in the background.'),
  'Anti-entropy':systemDesignVisual(['Replica A','Merkle root X'],['Replica B','Merkle root Y'],['Range-diff digest','keys 40-63'],['Repair stream','missing versions'],'Replicas periodically compare compact state summaries.','Different roots prove that their contents diverge.','They descend matching trees to isolate the differing key range.','Only missing or stale versions are exchanged until summaries agree.'),
  'Gossip protocols':systemDesignVisual(['Node A','membership v5'],['Node B','membership v4'],['Node C','membership v3'],['Cluster','converged v5'],'Node A learns a new membership state.','A exchanges a digest and update with randomly selected B.','B later spreads the newer state to C and other peers.','Repeated rounds probabilistically converge the cluster on version 5.'),
  'Failure detectors':systemDesignVisual(['Peer','heartbeat'],['Detector','last seen T0'],['Suspicion timer','suspicion rises'],['Membership','suspect not proof'],'A peer periodically emits heartbeats.','The detector records the last successful evidence of liveness.','Missing heartbeats increase suspicion after a configured delay.','Membership treats failure as a suspicion and uses quorum or epochs before acting.'),
  'FLP impossibility':systemDesignVisual(['Proposer A','value X'],['Proposer B','value Y'],['Network','unbounded delay'],['Decision slot','cannot be guaranteed'],'Two correct participants propose different values.','Messages are delayed so neither can distinguish delay from a crash.','An adversarial schedule can keep the protocol in an undecided configuration.','Practical consensus adds eventual timing assumptions or randomness for liveness.'),
  'Split brain':systemDesignVisual(['Leader A','accepts v2'],['Network partition','no contact'],['Leader B','accepts v3'],['Conflict resolver','conflict'],'A healthy cluster starts with one authority.','A partition causes both sides to believe the other failed.','Without fencing, A and B each accept conflicting writes.','Recovery must reject a stale leader or reconcile two divergent histories.'),
  'Byzantine vs crash failures':systemDesignVisual(['Crash node','silent'],['Byzantine node','conflicting replies'],['Voting quorum','authenticated votes'],['Decision certificate','fault model met'],'A crash-failed node simply stops responding.','A Byzantine node can send different false values to different peers.','The protocol gathers authenticated votes sized for the assumed fault type.','A decision is safe only when replica count and quorum match that model.'),
  'Time and clocks':systemDesignVisual(['Wall clock','human time'],['Monotonic clock','duration'],['Logical clock','causality'],['Operation','right clock chosen'],'An operation needs timestamps, elapsed time, or causal order.','Wall time labels events but may jump or skew.','Monotonic and logical clocks measure duration and happened-before safely.','The design chooses the clock whose guarantee matches the decision.'),
  'Physical clocks':systemDesignVisual(['Clock A','10:00:00.010'],['Clock B','09:59:59.990'],['NTP sample','offset estimate'],['Bound','20 ms uncertainty'],'Two machines report slightly different wall times.','A synchronization exchange estimates offset using network timing.','Each clock slews or steps toward the reference.','Applications compare timestamps only while accounting for the remaining error bound.'),
  'Logical clocks':systemDesignVisual(['Process A','counter 1'],['Message','timestamp 1'],['Process B','max+1 = 2'],['Causal order','A before B'],'Process A increments its counter for a local event.','A message carries that logical timestamp to B.','B sets its clock above both local and received values.','The timestamps preserve causal order without claiming wall time.'),
  'Lamport clocks':systemDesignVisual(['Local event','L=1'],['Message send','carries L=1'],['Receiver clock','L=2'],['Tie-break rule','total order'],'A local event increments the Lamport counter.','A sent message carries the current counter.','The receiver uses max(local, received)+1.','A node identifier breaks equal timestamps when deterministic total order is needed.'),
  'Vector clocks':systemDesignVisual(['Writer A','[1,0]'],['Writer B','[0,1]'],['Merged vector','[1,1]'],['Version comparison','concurrent/ordered'],'Independent writers increment their own vector components.','Neither [1,0] nor [0,1] dominates, so the updates are concurrent.','A merge takes component-wise maxima.','Future comparisons distinguish ancestors from concurrent siblings.'),
  'Hybrid logical clocks':systemDesignVisual(['Physical time','P'],['Logical counter','L'],['Remote HLC','P2,L2'],['Merged HLC','causal + near wall'],'A local event samples physical time P.','If physical time does not advance, the logical counter increments.','A received timestamp contributes both physical and logical components.','The merged timestamp stays near wall time while ordering the causal receive after send.'),
  'Idempotency':systemDesignVisual(['Client','operation key K'],['Service','dedupe lookup'],['State store','result R'],['Retry request','returns R'],'A client submits an operation with stable key K.','The service atomically checks whether K already has an outcome.','The first execution commits the effect and stores result R under K.','A retry finds K and returns R without repeating the effect.'),
  'Delivery semantics':systemDesignVisual(['Producer','message M'],['Broker','durable handoff'],['Consumer','processing'],['Ack boundary','guarantee defined'],'A producer sends message M to the broker.','Broker persistence determines whether producer success survives failure.','Consumer processing may fail before or after its side effect.','The acknowledgement boundary determines loss and duplication behavior.'),
  'At-most-once':systemDesignVisual(['Producer','send once'],['Broker','single attempt'],['Consumer','may receive'],['No-retry policy','message lost'],'The producer or broker makes one delivery attempt.','No retry is scheduled after timeout or failure.','The consumer processes the message only if that attempt arrives.','A lost attempt remains lost, but no duplicate is introduced.'),
  'At-least-once':systemDesignVisual(['Broker','message M'],['Consumer','effect commits'],['Ack response','lost'],['Redelivery attempt','deduplicated'],'The broker delivers message M and starts an acknowledgement timer.','The consumer commits the business effect.','Its acknowledgement is lost before the broker records it.','The broker redelivers M, so the consumer must suppress a duplicate effect.'),
  'Exactly-once':systemDesignVisual(['Input','message M'],['Transaction','effect + progress'],['Atomic commit record','one outcome'],['Recovery processor','observes commit'],'A processor begins work for stable input identity M.','The output effect and input progress join one atomic boundary.','Commit makes both visible together or neither visible.','Recovery sees committed progress and does not repeat the logical effect.'),
  'Ordering':systemDesignVisual(['Events','A,B,C'],['Order scope','key K'],['Sequencer','positions 7,8,9'],['Consumer','A then B then C'],'The design identifies events whose relative order matters.','Those events share an ordering scope such as one aggregate key.','A sequencer or partition assigns increasing positions.','Consumers apply them in that order and buffer or reject gaps.'),
  'FIFO ordering':systemDesignVisual(['Producer P','M1 then M2'],['Ordered partition log','append 10,11'],['Consumer','offset 10'],['Consumer','offset 11'],'Producer P sends M1 before M2.','Both messages enter the same ordered partition at consecutive offsets.','The consumer processes and commits M1 first.','Only then does it advance to M2, preserving producer order.'),
  'Causal ordering':systemDesignVisual(['Event A','created'],['Event B','depends on A'],['Dependency metadata','A included'],['Delivery buffer','A before B'],'Event A occurs and receives a causal identifier.','A handler creates B while observing A.','B carries dependency metadata proving the relationship.','A receiver delays B until A is present, while concurrent events remain flexible.'),
  'Total ordering':systemDesignVisual(['Producers','concurrent A,B'],['Consensus log','slots 20,21'],['Replicas','same prefix'],['Consumers','A then B'],'Concurrent producers submit A and B.','Consensus assigns each event one unique log slot.','Replicas commit the identical ordered prefix.','All consumers observe A then B according to those slots.'),
  'Paxos':systemDesignVisual(['Proposer','prepare n=7'],['Acceptors','promise >=7'],['Proposer','accept(n=7,v)'],['Quorum','value chosen'],'A proposer sends Prepare with a unique ballot 7.','A quorum promises not to accept lower ballots and returns prior accepted values.','The proposer selects the required value and sends Accept for ballot 7.','A quorum accepts it, making that value chosen for the slot.'),
  'Raft':systemDesignVisual(['Candidate','term 8 vote request'],['Leader','term 8'],['Followers','append entry'],['Commit index','majority stored'],'A timed-out follower increments its term and requests votes.','A majority elects it leader for term 8.','The leader appends a client command and replicates it to followers.','After majority storage, the commit index advances and state machines apply the entry.'),
  'Leader election':systemDesignVisual(['Follower','election timeout'],['Candidate','new term'],['Voters','freshness check'],['Leader','majority won'],'A follower stops receiving valid leader heartbeats.','It increments the term, votes for itself, and requests votes.','Peers grant at most one vote after checking the candidate log is current.','The candidate becomes leader only after winning a quorum.'),
  'Quorum consensus':systemDesignVisual(['Proposal','value X'],['Voters','quorum Q1'],['Decision record','X committed'],['Future voter quorum','Q2 intersects Q1'],'A value is proposed for a consensus slot.','Enough voters accept it to form decision quorum Q1.','The protocol records X as chosen.','Any future quorum intersects Q1 and must preserve knowledge of X.'),
  'Distributed locks':systemDesignVisual(['Client A','acquire lock'],['Lock service','owner A'],['Client B','waits'],['Next lock generation','B may acquire'],'Client A requests exclusive ownership from a linearizable lock service.','The service records A as owner and returns a lock generation.','Client B cannot acquire while that ownership remains valid.','After release or expiry, a new generation permits B to acquire.'),
  'Leases':systemDesignVisual(['Lease holder A','lease until T'],['Coordinator','renewal'],['Renewal gap','lease expires'],['Lease holder B','new lease'],'A coordinator grants A ownership until bounded expiry T.','A renews before T while communication remains healthy.','A pause or partition prevents renewal, so the lease expires.','The coordinator grants B a newer lease and A must stop acting.'),
  'Fencing tokens':systemDesignVisual(['Lease holder A','token 41'],['Lease record','A paused'],['Lease holder B','token 42'],['Fenced storage','rejects 41'],'A receives lease token 41 and writes to storage.','A pauses long enough for its lease to expire.','B acquires ownership with higher token 42.','Storage accepts 42 and rejects delayed operations carrying stale token 41.'),
  'Compare-and-swap':systemDesignVisual(['CAS client','version 5'],['Concurrent writer','sets version 6'],['CAS request','expect 5'],['Conflict response','conflict/retry'],'A client reads a value with version 5.','Another client updates it and advances the version to 6.','The first client submits a change conditioned on version 5.','CAS fails without overwriting version 6, so the client can reread and retry.'),
  'Distributed coordination':systemDesignVisual(['Participants','shared task'],['Coordinator','ordered metadata'],['Ownership record','epoch 12'],['Workers','follow decision'],'Participants need one owner or configuration decision.','A consistent coordinator serializes updates to shared metadata.','It assigns an owner and monotonic epoch 12.','Workers watch the decision and reject stale epochs while doing data-plane work.'),
  'Zookeeper-style coordination':systemDesignVisual(['Election path','ephemeral sequential nodes'],['Watch subscription','lowest child'],['Leader znode','smallest sequence'],['Session lease','node removed'],'Candidates create ephemeral sequential children under an election path.','Each candidate watches the next-lower child rather than the whole set.','The smallest sequence owns leadership.','Session loss removes its node and wakes the next candidate.'),
  'etcd-style coordination':systemDesignVisual(['Config key','config/current'],['Compare-and-swap transaction','compare revision'],['Lease record','key attached'],['Watch stream','revision stream'],'A client reads a key and its global revision.','A transaction compares that revision before atomically updating the key.','Ephemeral ownership attaches the key to a renewable lease.','Watchers consume ordered revisions and observe deletion when the lease expires.'),
  'Membership protocols':systemDesignVisual(['Joiner','node D'],['Members','current view 9'],['Membership service','join at view 10'],['Placement map','new owners'],'Node D requests admission to the current cluster view.','Existing members validate identity and health.','Consensus or gossip installs a new generation containing D.','Placement changes only after participants recognize view 10.'),
  'Leader/follower':systemDesignVisual(['Client','command'],['Leader','orders command'],['Followers','replicate'],['Election term','new leader if needed'],'A client directs a control command to the current leader.','The leader assigns its order and appends it.','Followers replicate and acknowledge the ordered state.','If the leader fails, an up-to-date follower is elected for a newer term.'),
  'Primary/backup':systemDesignVisual(['Primary server','serves requests'],['Backup server','receives state'],['Failure detector','primary lost'],['Promotion controller','backup fenced in'],'The primary executes operations and emits recovery state.','The backup applies that state but does not accept ownership.','Failure evidence triggers a controlled promotion decision.','The old primary is fenced before the backup begins serving.'),
  'Term/epoch management':systemDesignVisual(['Epoch store','11'],['Candidate','requests 12'],['Epoch-tagged commands','tagged 12'],['Protected resource','epoch 11 rejected'],'Current leadership operates under durable epoch 11.','A new election atomically allocates higher epoch 12.','All new commands carry epoch 12 to protected resources.','Delayed epoch-11 commands are rejected even if the old process resumes.'),
  'Split-brain prevention':systemDesignVisual(['Majority voter set','2 voters'],['Minority voter set','1 voter'],['Quorum rule','2 of 3'],['Fencing token check','one writer'],'A three-voter cluster is divided by a network failure.','Partition A retains two voters and can elect a current leader.','Partition B lacks quorum and stops authoritative writes.','Epoch fencing ensures only the quorum-side leader can mutate storage.'),
  'Leader/follower replication':systemDesignVisual(['Client','write v4'],['Leader','log index 30'],['Followers','replay index 30'],['Read path','freshness selected'],'The client submits v4 to the current leader.','The leader orders it at log index 30.','Followers receive and apply the entry in log order.','Reads use the leader or a follower that meets the requested freshness.'),
  'Multi-leader replication':systemDesignVisual(['Region A','write X'],['Region B','write Y'],['Replication links','exchange'],['Resolver','merge conflict'],'Regional leaders accept X and Y concurrently during delay.','Each local write commits without waiting for the other region.','Asynchronous links exchange both versions.','Causality metadata detects the conflict and a domain rule merges or selects it.'),
  'Leaderless replication':systemDesignVisual(['Coordinator','write v7'],['Replicas','N=3,W=2'],['Reader','R=2'],['Resolver','latest sibling set'],'A coordinator sends v7 directly to all key replicas.','Two acknowledgements satisfy the configured write quorum.','A later reader gathers two replica versions.','The resolver selects a causal descendant or returns concurrent siblings for merge.'),
  'Synchronous replication':systemDesignVisual(['Leader','append v9'],['Replica A','durable ack'],['Replica B','durable ack'],['Client','success'],'The leader appends v9 locally.','Required replica A persists and acknowledges it.','Required replica B also reaches the configured durability point.','Only then does the leader report success to the client.'),
  'Asynchronous replication':systemDesignVisual(['Leader','commit v9'],['Client','early success'],['Replica','still v8'],['Log shipping stream','replica reaches v9'],'The leader commits v9 locally.','The client receives success without waiting for a remote copy.','A follower may temporarily serve stale v8.','Background log shipping eventually applies v9 unless the leader fails first.'),
  'Semi-synchronous replication':systemDesignVisual(['Leader','write v9'],['Replica A','ack required'],['Client','success'],['Replica B','async catch-up'],'The leader records v9 and sends it to followers.','One configured follower reaches the required acknowledgement stage.','The client receives success after that limited synchronous guarantee.','Other replicas catch up asynchronously.'),
  'Quorum replication':systemDesignVisual(['Replica set','A,B,C'],['Writer','acks A,B'],['Reader','queries B,C'],['Read reconciler','newest version'],'A key is assigned to three replicas.','A write completes after A and B accept the new version.','A read later queries intersecting set B and C.','B carries the write, allowing the reader to choose and repair the newest version.'),
  'Chain replication':systemDesignVisual(['Head','accept write'],['Middle','forward update'],['Tail','commit/ack'],['Reader','reads tail'],'The head receives and orders a write.','Each replica applies and forwards it down the chain.','The tail applies the write and sends acknowledgement back.','Reads from the tail observe the completed chain order.'),
  'Read replicas':systemDesignVisual(['Primary database','commit v5'],['Replication log','shipping'],['Read replica','apply v5'],['Router','freshness check'],'The primary commits v5 to its log.','Replication transports the entry to a read replica.','The replica applies v5 and advances its replay position.','The router sends a read only if that position meets the client requirement.'),
  'Write replicas':systemDesignVisual(['Client','mutation'],['Write replica A','accepts'],['Write replica B','accepts'],['Ack policy','success threshold'],'A client mutation reaches the configured write owners.','Replica A validates, versions, and stores it.','Replica B independently reaches the required persistence point.','The coordinator responds when the write-replica acknowledgement policy is satisfied.'),
  'Replication lag':systemDesignVisual(['Leader','log position 500'],['Replica','position 470'],['Lag monitor','30 entries'],['Catch-up','position 500'],'The leader advances its replication log to position 500.','A busy replica has applied only through 470.','Monitoring reports the gap in versions, bytes, and elapsed time.','Additional apply capacity drains the backlog until positions match.'),
  'Conflict resolution':systemDesignVisual(['Version X','clock [2,1]'],['Version Y','clock [1,2]'],['Resolver','domain merge'],['Replicas','version Z'],'Replicas produce X and Y without a causal order.','Metadata identifies them as concurrent siblings.','A deterministic domain rule merges fields or requests user resolution.','The merged version Z descends from both and converges across replicas.'),
  'Last-write-wins':systemDesignVisual(['Write X','timestamp 100'],['Write Y','timestamp 105'],['Resolver','max timestamp'],['Replicas','retain Y'],'Concurrent writes carry comparable timestamps or versions.','The resolver compares their deterministic ordering keys.','Y wins because 105 is greater than 100.','Every replica discards or tombstones X and converges on Y.'),
  'Version vectors':systemDesignVisual(['Replica A','{A:2,B:1}'],['Replica B','{A:1,B:2}'],['Comparison','concurrent'],['Merged version','{A:2,B:2}'],'Each replica increments its own component on update.','Neither vector dominates the other, revealing concurrency.','Both sibling values are retained for resolution.','A merged write records the component-wise maximum and dominates both.'),
  'CRDTs':systemDesignVisual(['Replica A','add x'],['Replica B','add y'],['State join','join states'],['Converged state','{x,y}'],'Replica A updates its local CRDT without coordination.','Replica B concurrently performs another valid update.','Replicas exchange states or commutative operations.','Associative, commutative, idempotent merge makes both converge on the same value.'),
  'Active-active replication':systemDesignVisual(['Region A','serves traffic'],['Region B','serves traffic'],['Replication link','bidirectional'],['Conflict policy','converged state'],'Both regions accept local reads and writes.','Each region commits against its local authority or partition.','Changes replicate bidirectionally across the long-distance link.','Conflicts are prevented by key ownership or resolved to one converged state.'),
  'Active-passive replication':systemDesignVisual(['Active region','serves writes'],['Passive region','replays log'],['Outage detector','active unavailable'],['Promotion controller','passive becomes active'],'The active region handles traffic and emits a replication stream.','The passive region continuously replays state and measures lag.','A declared outage triggers fencing and recovery checks.','Traffic moves after the passive is promoted under a new epoch.'),
  'Cross-region replication':systemDesignVisual(['Region A','authoritative write'],['WAN link','high latency link'],['Region B','replica lag'],['Failover controller','RPO evaluated'],'Region A commits an authoritative update.','The update crosses a variable-latency regional link.','Region B applies it and reports a recovery position.','A failover decision compares that position with the promised RPO.'),
  'Cross-datacenter replication':systemDesignVisual(['Datacenter 1','primary copy'],['Independent link','replication'],['Datacenter 2','standby copy'],['Facility loss','standby serves'],'A write is persisted in the primary datacenter.','Replication crosses independent network and power boundaries.','The second datacenter durably stores and validates the copy.','After facility loss, routing moves to the fenced and sufficiently current standby.'),
  'Hash partitioning':systemDesignVisual(['Key','customer-42'],['Hash','h(key)=731'],['Bucket','731 mod 16 = 11'],['Shard 11','owner'],'The router extracts the partition key.','A stable hash converts it to a uniform integer.','Modulo or a bucket map selects logical bucket 11.','The membership map routes the request to the shard owning that bucket.'),
  'Consistent hashing':systemDesignVisual(['Key hash','token 62'],['Ring','ordered tokens'],['Node B','next clockwise'],['Node joins','limited remap'],'The key hashes to token 62 on a ring.','Walking clockwise identifies Node B as owner.','Replicas use subsequent distinct owners on the ring.','When a node joins, only token intervals whose successor changes move.'),
  'Rendezvous hashing':systemDesignVisual(['Key K','routing input'],['Nodes A/B/C','score h(K,node)'],['Node B','highest score'],['Membership change','re-score owners'],'The router combines key K with every eligible node identity.','A stable hash produces a score for each pair.','The highest score selects Node B, with next scores as replicas.','On membership change, only keys won by the changed node move.'),
  'Range partitioning':systemDesignVisual(['Key 275','ordered value'],['Range map','200-299'],['Shard B','range owner'],['Split point','250'],'The router compares key 275 against ordered boundaries.','Range 200-299 resolves to Shard B.','Shard B serves efficient neighboring scans.','When it grows, a split at 250 moves the upper subrange to a new owner.'),
  'Directory-based partitioning':systemDesignVisual(['Key K','lookup'],['Directory','K -> shard C, epoch 9'],['Shard C','serve'],['Migration redirect','epoch 10 redirect'],'The router asks a directory for key K placement.','The directory returns Shard C with mapping epoch 9.','Shard C validates the epoch and serves the operation.','A migration publishes epoch 10 and stale routers follow a redirect.'),
  'Virtual nodes':systemDesignVisual(['Physical node A','tokens 10,90'],['Physical node B','tokens 40,130'],['Keyspace intervals','many intervals'],['Rebalance controller','selected tokens move'],'Each physical node owns several virtual tokens.','Keys distribute across token intervals rather than one contiguous node range.','Capacity weights assign more tokens to larger nodes.','Rebalancing moves selected token ranges across many peers instead of one huge range.'),
  'Rebalancing':systemDesignVisual(['Source shard','owns range R'],['Target shard','bulk copy'],['Change stream','catch-up'],['Router','epoch cutover'],'The controller selects range R for movement.','The target bulk-copies a consistent source snapshot.','A change stream closes the gap while the source still serves.','A versioned routing cutover makes the target owner before source cleanup.'),
  'Hot partitions':systemDesignVisual(['Metrics','shard 7 saturated'],['Router','key distribution'],['Split plan','7a/7b'],['Balanced traffic','balanced'],'Per-shard metrics identify shard 7 as the bottleneck.','Key-level analysis distinguishes traffic skew from total data size.','The system splits, replicates, or isolates the hot range.','A versioned route shifts load while preserving ownership correctness.'),
  'Hot keys':systemDesignVisual(['Key K','40% traffic'],['Owner shard','CPU saturated'],['Hot-key controller','replicas/coalescing'],['Clients','distributed load'],'Metrics identify one key rather than the whole shard as hot.','Its single owner saturates under repeated reads or writes.','The hot-key controller selects read copies, request coalescing, salting, or aggregation for the exact access pattern.','Routing distributes safe work while retaining required ordering.'),
  'Shard splitting':systemDesignVisual(['Shard A','range 0-999'],['Snapshot','copy upper half'],['Shard B','range 500-999'],['Routing map','two owners'],'A threshold marks Shard A for splitting.','A consistent snapshot copies keys 500-999 to Shard B.','Incremental updates catch B up while A remains authoritative.','The router atomically publishes two non-overlapping ranges.'),
  'Shard merging':systemDesignVisual(['Shard A','small range'],['Shard B','adjacent small range'],['Merged shard','combined data'],['Routing map','one owner'],'The controller finds adjacent underutilized shards.','One target copies the other range and catches up changes.','Ownership is fenced so no update is lost during consolidation.','The directory publishes one combined range and retires the old shard.'),
  'Dynamic partitioning':systemDesignVisual(['Telemetry','size + QPS'],['Controller','threshold + hysteresis'],['Placement plan','split/move/merge'],['Cluster','new epoch'],'Telemetry reports sustained imbalance rather than a transient spike.','A controller applies thresholds, cooldowns, and movement budgets.','It chooses a split, merge, or relocation plan.','Data migration completes before the new ownership epoch becomes active.'),
  'Scatter-gather':systemDesignVisual(['Coordinator','query Q'],['Shards A/B/C','parallel search'],['Partial results','top candidates'],['Merger','global result'],'A coordinator determines that query Q spans several shards.','It dispatches bounded parallel subqueries with one deadline.','Each shard returns a partial aggregate or top candidates.','The coordinator merges them and applies explicit partial-failure rules.'),
  'Fan-out':systemDesignVisual(['Request','one logical call'],['Dispatcher','N targets'],['Workers','parallel operations'],['Aggregator','combined outcome'],'One request expands into a known target set.','The dispatcher enforces concurrency and deadline budgets.','Targets run independently and return successes or failures.','The aggregator combines results without allowing one straggler to consume the whole deadline.'),
  'Partition affinity':systemDesignVisual(['Order mutation','aggregate key order-17'],['Affinity router','owner epoch 42'],['Shard C','state + cache'],['Ownership controller','health + routing epochs'],'Each order mutation carries the same aggregate key.','The affinity router sends every mutation to the owner recorded for epoch 42.','Shard C keeps order state, sequencing, and hot cache entries together.','After detecting owner loss, the ownership controller advances the epoch and reassigns the key before routing resumes.'),
  'Tenant-based partitioning':systemDesignVisual(['Tenant ID','tenant-8'],['Tenant map','cell B/shard 4'],['Quota policy','tenant scoped'],['Tenant migration plan','tenant remapped'],'Every request is authenticated to a tenant identity.','A directory maps that tenant to an isolation cell and shard.','Storage, quota, and noisy-neighbor controls apply within that boundary.','Migration copies and cuts over the tenant as one governed unit.'),
  'Cache-aside':systemDesignVisual(['Application','get K'],['Cache','miss'],['Database','value v3'],['Cache','fill v3 + TTL'],'The application checks the cache for K.','A miss leaves the source of truth authoritative.','The application reads v3 from the database.','It fills v3 with a TTL, then returns it; writes invalidate or version this entry.'),
  'Read-through cache':systemDesignVisual(['Caller','get K'],['Cache','miss'],['Loader','source read'],['Cache','stores and returns'],'The caller requests K only from the cache interface.','The cache detects that no valid entry exists.','Its configured loader obtains the value from the source.','The cache stores the loaded value and returns it to the caller.'),
  'Write-through cache':systemDesignVisual(['Caller','put v4'],['Cache','update v4'],['Database','persist v4'],['Write acknowledgement','both complete'],'A caller submits v4 through the cache interface.','The cache records or reserves the new version.','The backing store synchronously persists v4.','Success is returned only after the write-through policy completes both paths.'),
  'Write-behind cache':systemDesignVisual(['Caller','put v4'],['Cache','durable queue'],['Batch writer','coalesces updates'],['Database','eventual v4'],'The cache accepts v4 and records pending persistence.','The caller receives success before the source changes.','A background writer batches or coalesces queued updates in order.','The database reaches v4; queue durability determines the loss risk.'),
  'Refresh-ahead':systemDesignVisual(['Entry K','near expiry'],['Popularity signal','still hot'],['Background refresh','load v4'],['Cache','swap v3 -> v4'],'A hot entry approaches its refresh threshold while still valid.','Access history predicts that it will be needed after expiry.','One background task loads the newest value.','The cache atomically swaps in v4 without forcing callers through a miss.'),
  'Cache warming':systemDesignVisual(['Hot-set plan','keys K1..Kn'],['Source','bounded preload'],['Cache population job','population'],['Production traffic','warm hits'],'Historical or declared critical keys form a bounded warm set.','A rate-limited job reads those values from the source.','Entries are populated with normal versions and TTLs.','Traffic is admitted after hit rate and source load reach safe levels.'),
  'Cache invalidation':systemDesignVisual(['Database','commit v5'],['Invalidation event','K,version 5'],['Caches','evict old K'],['Reader','miss then v5'],'The source commits version 5 for K.','An ordered invalidation carrying K and version 5 is emitted.','Caches remove values older than version 5.','The next reader misses and refills v5, while delayed stale fills are rejected.'),
  'TTL':systemDesignVisual(['Entry','stored at T0'],['TTL policy','expires T0+60s'],['Reader','checks freshness'],['Reload path','reload + jitter'],'An entry is stored with an absolute or relative expiry.','Time advances while reads can use the still-valid value.','A read after expiry treats the entry as absent.','The loader refreshes it with a jittered next TTL to avoid synchronized expiry.'),
  'Negative caching':systemDesignVisual(['Request','missing K'],['Source','404'],['Cache','negative entry 5s'],['Later request','short-circuited'],'A request misses both positive cache and source data.','The authoritative source confirms K is absent.','The cache stores a scoped not-found marker with a short TTL.','Repeated requests avoid the source until expiry allows newly created data to appear.'),
  'Cache stampede':systemDesignVisual(['Hot key','expires'],['Requests','100 misses'],['Single loader','source query'],['Cache','refilled'],'A popular key expires while many clients are active.','Concurrent requests all observe the miss.','A per-key lock or shared promise elects one loader while peers wait or use stale data.','One source result refills the cache and releases all waiters.'),
  'Thundering herd':systemDesignVisual(['Clients','same wake time'],['Dependency','capacity exceeded'],['Jitter/admission','spread requests'],['Service','stable throughput'],'A common expiry, outage, or timer wakes many clients together.','Their simultaneous calls exceed dependency concurrency and queue capacity.','Random delay, token admission, and backoff spread or reject work.','Arrival rate returns below service capacity instead of sustaining collapse.'),
  'Request coalescing':systemDesignVisual(['Caller A','miss K'],['In-flight map','K -> promise'],['Callers B/C','join promise'],['Loader result','shared'],'Caller A misses K and registers one in-flight load.','The loader starts one source request.','Later callers find K in the in-flight map and wait on the same promise.','The result or explicit error is delivered to all callers and the entry is cleared.'),
  'Single-flight':systemDesignVisual(['Key K','work requested'],['Leader caller','owns flight'],['Follower callers','wait'],['Shared result','one result'],'The first caller atomically creates a flight for K.','Only that caller performs the expensive operation.','Concurrent callers subscribe to the existing flight.','Completion publishes one result and removes the flight so future work can start.'),
  'Probabilistic early expiration':systemDesignVisual(['Entry','TTL remaining'],['Random draw','refresh threshold'],['One request','early refresh'],['Cache','new expiry'],'As an entry nears expiry, each request computes a randomized refresh decision.','Most requests continue using the valid cached value.','One request crosses the probabilistic threshold and refreshes early.','The renewed entry prevents a synchronized hard-expiry miss burst.'),
  'Distributed cache':systemDesignVisual(['Client','hash key K'],['Cache node B','owner'],['Replica C','backup'],['Membership map','K remapped'],'A client hashes K through the current membership map.','Node B serves or stores the entry.','Optional replica C supports hot reads or node failure.','When membership changes, bounded remapping and warmup protect the source from misses.'),
  'Local + distributed cache':systemDesignVisual(['Process cache','L1'],['Distributed cache','L2'],['Database','source'],['Invalidation stream','both layers'],'A request checks the process-local L1 cache first.','An L1 miss checks shared L2 before touching the database.','A total miss loads the source and fills L2 then L1.','Versioned invalidation prevents stale L1 entries from outliving shared updates.'),
  'Cache consistency':systemDesignVisual(['Source','v4 committed'],['Cache','still v3'],['Freshness policy','bounded/session'],['Reader','v4 or allowed v3'],'The source advances from v3 to v4.','Propagation delay leaves a cached v3 temporarily visible.','The API applies its declared TTL, version, or session guarantee.','The reader either accepts bounded-stale v3 or waits, invalidates, and obtains v4.'),
  'Cache versioning':systemDesignVisual(['Source','generation 8'],['Key','profile:8:K'],['Old fill','generation 7'],['Cache','reject/ignore old'],'A source or schema change advances the cache generation to 8.','Readers and writers address the generation-8 key.','A delayed loader attempts to fill generation 7.','The old generation cannot overwrite generation 8 and expires independently.'),
  'Hot-key mitigation':systemDesignVisual(['Hot key K','owner saturated'],['Near-caches','many readers'],['Single-flight','one refill'],['Replicas','load spread'],'Metrics identify K as the concentrated load source.','Local near-caches absorb repeated safe reads.','Misses are coalesced so only one source refill occurs per location.','Additional read copies or salted subkeys spread remaining work.'),
  'Bloom filter':systemDesignVisual(['Item X','hash h1,h2'],['Bit array','set positions 2,7'],['Query Y','check its hashes'],['Membership result','absent or maybe'],'Inserting X computes multiple independent bit positions.','Bits 2 and 7 are set in the shared array.','A query computes the same positions for candidate Y.','Any zero proves absence; all ones mean possibly present and can be a false positive.'),
  'Counting Bloom filter':systemDesignVisual(['Item X','hash positions'],['Counter array','increment'],['Delete request','decrement'],['Membership query','zero or maybe'],'Insertion hashes X and increments each selected counter.','Overlapping items can increase the same counters above one.','Deleting X decrements only its hashed counters.','A zero counter proves absence; positive counters still permit false positives.'),
  'Cuckoo filter':systemDesignVisual(['Item X','fingerprint f'],['Buckets','i1 and i2'],['Eviction chain','relocate f2'],['Lookup request','find f'],'The filter computes a short fingerprint and two candidate buckets.','If both are occupied, insertion evicts one resident fingerprint.','The evicted fingerprint moves to its alternate bucket until space is found.','Lookup or deletion checks only the two candidate buckets for the fingerprint.'),
  'Quotient filter':systemDesignVisual(['Hash','quotient q + remainder r'],['Table','home slot q'],['Remainder run','ordered remainders'],['Lookup request','scan run for r'],'The item hash splits into a bucket quotient and stored remainder.','The quotient identifies the logical home slot.','Occupied runs shift compact remainders while metadata preserves boundaries.','Lookup finds the quotient run and searches it for the remainder.'),
  'HyperLogLog':systemDesignVisual(['Element','64-bit hash'],['Register index','prefix'],['Rank','leading zeros + 1'],['Estimator','harmonic mean'],'Each distinct element is uniformly hashed.','Prefix bits select one register.','Remaining leading zeros produce a rank that raises the register maximum.','A bias-corrected harmonic estimate across registers yields approximate cardinality.'),
  'Count-Min Sketch':systemDesignVisual(['Item K','d hashes'],['Counter rows','increment one per row'],['Query K','read d counters'],['Frequency estimate','minimum'],'Each stream occurrence hashes K once per counter row.','The selected counter in every row increments.','A query reads the same d positions.','Their minimum is the frequency estimate, limiting collision overcount.'),
  'Heavy hitters':systemDesignVisual(['Stream','items arrive'],['Candidate table','bounded counters'],['Threshold','frequency > phi*N'],['Output','dominant keys'],'Items update a bounded candidate algorithm or frequency sketch.','Frequent items survive replacement while low-frequency noise is discarded.','Candidates are compared with the heavy-hitter threshold.','Qualified keys are reported, optionally with exact verification.'),
  'Top-K sketches':systemDesignVisual(['Stream','key events'],['Frequency sketch','estimates'],['Candidate heap','size K'],['Ranked result set','ranked heavy keys'],'Events update compact per-key frequency estimates.','A bounded candidate set tracks keys likely to rank highly.','The heap evicts candidates below the current Kth estimate.','Final candidates are ranked or verified to produce approximate top K.'),
  'HyperLogLog++':systemDesignVisual(['Hash stream','elements'],['Sparse register map','small cardinality'],['Dense registers','large cardinality'],['Cardinality estimator','bias corrected'],'Hashed values begin in a compact sparse representation.','Small-cardinality estimation uses sparse data to reduce bias.','The structure converts to dense HLL registers as cardinality grows.','Corrected estimation and merge rules produce the final distinct count.'),
  'Approximate distinct counting':systemDesignVisual(['Partitions','local elements'],['Local sketches','compact state'],['Sketch merger','register-wise combine'],['Cardinality estimate','global uniques'],'Each partition hashes its local identifiers into a mergeable sketch.','Duplicate identifiers affect compatible positions rather than creating stored entries.','The coordinator merges sketches without transferring raw identifiers.','The combined sketch estimates global distinct cardinality with a stated error.'),
  'Probabilistic counters':systemDesignVisual(['Events','increments'],['Counter exponent','state c'],['Random trial','probability 2^-c'],['Count estimate','inverse transform'],'Each event attempts to update a compact counter.','As the stored exponent grows, increment probability decreases.','A random trial occasionally advances the stored state.','An inverse formula converts state into an unbiased or calibrated count estimate.'),
  'MinHash':systemDesignVisual(['Set A','hashed members'],['Set B','hashed members'],['Signatures','minimums per hash'],['Similarity','matching fraction'],'Each hash permutation records the minimum value for Set A.','The same permutations build a signature for Set B.','Equal signature positions indicate matching minima.','Their matching fraction estimates Jaccard similarity.'),
  'SimHash':systemDesignVisual(['Features','weighted tokens'],['Bit accumulators','signed votes'],['Fingerprint','sign per bit'],['Distance','Hamming bits'],'Features are hashed into bit vectors and weighted.','Each bit adds or subtracts its feature weight in an accumulator.','Accumulator signs form one compact fingerprint.','Hamming distance between fingerprints identifies near-duplicate vectors.'),
  'Locality-sensitive hashing':systemDesignVisual(['Vector','query/item'],['LSH family','multiple hashes'],['Buckets','candidate collisions'],['Verifier','exact distance'],'Items are hashed by families aligned to the desired similarity metric.','Similar items collide in one or more bucket tables with high probability.','A query collects only colliding candidates instead of scanning all items.','Exact distance ranks candidates and removes false matches.'),
  'Reservoir sampling':systemDesignVisual(['Stream','item i'],['Reservoir','size k'],['Random index','1..i'],['Sample','replace if <=k'],'The first k stream items fill the reservoir.','For item i greater than k, draw a uniform integer from 1 through i.','If the draw is at most k, replace that reservoir slot.','After the stream, every item has equal probability k/N of inclusion.'),
  'Sampling algorithms':systemDesignVisual(['Population','target data'],['Sampler','uniform/weighted/stratified'],['Sample','selected rows'],['Estimator','weighted result'],'Define the population and statistic before sampling.','Choose probabilities that preserve uniformity or intentionally represent strata and weights.','Record inclusion probability with each selected observation.','Use those probabilities to produce an estimate and confidence bound without bias.'),
  'Message queues':systemDesignVisual(['Producer','enqueue job'],['Queue','durable buffer'],['Consumer','lease job'],['Ack record','remove or redeliver'],'A producer places a job into a durable queue.','The queue buffers it independently of consumer speed.','One consumer claims the job for a visibility period.','Success acknowledges removal; timeout makes the job eligible for redelivery.'),
  'Pub/Sub':systemDesignVisual(['Publisher','event E'],['Topic','fan-out'],['Subscription A','own cursor'],['Subscription B','own cursor'],'A publisher emits event E once to a topic.','The broker durably fans E into independent subscription views.','Subscriber A consumes and advances its own progress.','Subscriber B receives the same event independently and may lag or retry.'),
  'Event streaming':systemDesignVisual(['Producer','append event'],['Partition log','ordered record'],['Processor','state update'],['Checkpoint record','offset + state'],'A producer appends an immutable event to a keyed partition.','The log assigns an ordered position and retains the event.','A stream processor updates keyed state in position order.','The checkpoint record binds source progress to recoverable processor state.'),
  'Kafka-style logs':systemDesignVisual(['Producer','keyed record'],['Partition leader','append offset 42'],['Followers','replicate'],['Consumer','fetch from 42'],'The record key selects a log partition.','Its leader appends the record at offset 42.','Followers replicate the ordered log according to acknowledgement policy.','Consumers fetch sequentially and persist their own progress.'),
  'Consumer groups':systemDesignVisual(['Partitions','P0,P1,P2'],['Group members','C1,C2'],['Coordinator','assignment'],['Rebalance plan','ownership moves'],'Consumers join one logical group.','The coordinator assigns each partition to at most one active member.','Members process their assigned offsets in parallel.','Join, leave, or failure triggers a rebalance with revoked and reassigned ownership.'),
  'Partitioning':systemDesignVisual(['Message key','account-7'],['Partitioner','hash key'],['Partition 3','ordered log'],['Consumer','key-local state'],'The producer extracts the key that defines ordering and locality.','A stable partitioner maps it to partition 3.','All records for that key append to the same ordered log.','The owning consumer updates key-local state without cross-partition coordination.'),
  'Offsets':systemDesignVisual(['Log partition','records 20..23'],['Offset 21','stable position'],['Fetch request','start 21'],['Next offset pointer','next 22'],'The broker appends records at monotonically increasing partition positions.','Offset 21 uniquely names one record within that partition.','A consumer requests data beginning at 21.','After handling it, progress advances to the next required offset.'),
  'Consumer offsets':systemDesignVisual(['Consumer','process offset 50'],['Business store','effect commits'],['Offset store','commit 51'],['Recovery cursor','resume 51'],'The consumer receives the record at offset 50.','It commits the intended business effect.','It records 51 as the next position only after the effect is durable.','After restart, consumption resumes at 51; a crash between commits may safely duplicate 50.'),
  'Replay':systemDesignVisual(['Retained log','offset 0..N'],['Consumer','reset cursor'],['Projection','rebuild state'],['Cutover checkpoint','caught up'],'A retained immutable log remains available after original processing.','The consumer resets to a chosen historical offset.','Replay applies version-aware, idempotent logic into a new projection.','After catching the live tail, the rebuilt projection becomes active.'),
  'Retention':systemDesignVisual(['Log segments','dated records'],['Retention policy','7 days/size cap'],['Segment cleaner','eligible segments'],['Storage tier','old data removed'],'The broker rolls appended records into immutable segments.','Time and size policy marks old segments as no longer replayable.','The cleaner waits for required safety or compliance conditions.','Eligible segments are deleted and storage usage falls.'),
  'Compaction':systemDesignVisual(['Log','K:v1,K:v2,K:v3'],['Compaction cleaner','group by key'],['Latest record','K:v3'],['Compacted segment','history reduced'],'The append log accumulates several versions for key K.','A background cleaner identifies superseded records by key.','The latest value or retained tombstone remains authoritative.','A compacted segment preserves recoverable current state while dropping intermediate versions.'),
  'Dead-letter queues':systemDesignVisual(['Consumer','message fails'],['Retry policy','attempts exhausted'],['DLQ','message + diagnostics'],['Operator','fix and replay'],'A consumer classifies a message failure.','Bounded retries confirm it is poison or persistently incompatible.','The broker moves it with error and attempt metadata to a DLQ.','An owner diagnoses, corrects, and explicitly replays or disposes it.'),
  'Retry queues':systemDesignVisual(['Consumer','transient failure'],['Retry topic','attempt 2 + due time'],['Backoff timer','backoff'],['Main consumer','redelivery'],'A consumer recognizes a retryable failure.','It republishes the message with attempt count and scheduled eligibility.','The retry path holds it through exponential backoff.','When due, the message returns for another idempotent processing attempt.'),
  'Delayed queues':systemDesignVisual(['Producer','message + due T'],['Scheduler','time index'],['Scheduler clock','reaches T'],['Ready queue','message visible'],'A producer submits a message with a future delivery time T.','The scheduler persists it in a time-ordered structure.','As a monotonic clock reaches T, the item becomes eligible.','The message moves to the ready queue for normal claiming and acknowledgement.'),
  'Priority queues':systemDesignVisual(['High job','priority 9'],['Low job','priority 2'],['Scheduler','weighted selection'],['Workers','bounded fairness'],'Jobs enter separate levels or a priority heap.','The scheduler prefers higher priority work.','Aging or weighted quotas reserve progress for lower levels.','Workers execute selected jobs without allowing indefinite starvation.'),
  'Message ordering':systemDesignVisual(['Producer','events A,B'],['Log partition','offsets 8,9'],['Consumer','expected 8'],['Consumer state','apply A then B'],'Related events share the same ordering key.','The broker appends A at 8 and B at 9.','The consumer tracks the next expected offset and handles gaps or retries.','State changes apply A before B even across consumer recovery.'),
  'Exactly-once processing':systemDesignVisual(['Input offset','37'],['Processor state','update S'],['Output log','event O'],['Atomic transaction','commit all'],'The processor reads input offset 37.','It computes state update S and output O.','State, output, and next input offset join one atomic broker or state-store transaction.','Recovery sees either all committed or none and retries without a second logical result.'),
  'Idempotent consumers':systemDesignVisual(['Message','ID M7'],['Inbox table','lookup M7'],['Business effect','commit once'],['Duplicate response','returns prior outcome'],'The consumer receives stable identity M7.','It checks an inbox record inside the effect transaction.','The first delivery writes the business effect and M7 marker atomically.','A duplicate finds the marker and skips the effect while acknowledging safely.'),
  'Transactional messaging':systemDesignVisual(['Broker transaction','begin'],['Input progress','stage'],['Output batch','stage messages'],['Commit record','atomic visibility'],'The processor begins a transaction supported by the broker boundary.','Consumed progress is staged but not yet visible.','Produced messages and state changes join the same transaction.','Commit exposes outputs and progress together; abort exposes neither.'),
  'Outbox pattern':systemDesignVisual(['Service','business update'],['Outbox table','event row'],['Relay','publish + retry'],['Broker','event durable'],'The service begins one local database transaction.','It writes business state and an outbox event row together.','A relay reads committed rows and publishes with retry and stable IDs.','The broker stores the event; the relay marks or checkpoints delivery.'),
  'Inbox pattern':systemDesignVisual(['Broker','deliver M'],['Inbox table','insert M ID'],['Business state','effect'],['Commit record','dedupe + effect'],'The consumer receives message identity M.','It attempts a unique inbox insert within a local transaction.','If new, it applies the business effect in that transaction.','Commit makes marker and effect durable together; duplicates violate the insert and skip work.'),
  'Change Data Capture':systemDesignVisual(['Database','commit row v4'],['Transaction log','change record'],['CDC connector','checkpoint'],['Downstream','apply event'],'A database transaction commits row version 4.','The durable transaction log records the exact change order.','A CDC reader converts log entries and advances a restartable checkpoint.','Downstream consumers apply versioned events and tolerate replay.'),
  'Event sourcing':systemDesignVisual(['Command','validated intent'],['Event store','append E12'],['Projector','apply E12'],['Snapshot/read model','new state'],'A command is validated against current aggregate state.','The resulting domain event E12 appends immutably with expected stream version.','Projectors consume E12 to update derived views.','Replay from events or a snapshot reconstructs the same aggregate state.'),
  'Two-phase commit (2PC)':systemDesignVisual(['Coordinator','begin TX'],['Participants','prepare yes'],['Decision log','commit'],['Participants','commit effects'],'The coordinator asks every participant to prepare transaction TX.','Each yes-voter durably reserves resources and promises it can commit.','After all yes votes, the coordinator durably records commit; otherwise abort.','Participants repeatedly receive and apply that final decision during recovery.'),
  'Three-phase commit':systemDesignVisual(['Coordinator','canCommit?'],['Participants','preCommit'],['Timeout model','bounded network'],['Commit record','final decision'],'The coordinator gathers willingness to commit.','A pre-commit phase tells participants that unanimous readiness was reached.','Under bounded-delay and failure assumptions, participants use timeout state to progress.','The final commit completes, but partitions can invalidate those non-blocking assumptions.'),
  'XA transactions':systemDesignVisual(['Transaction manager','XID'],['Resource managers','XA prepare'],['Decision log','commit/rollback'],['Recovery worker','resolve XID'],'A transaction manager assigns a global XID across resources.','Each XA resource durably prepares its local branch.','The manager records one commit or rollback decision.','On restart, in-doubt branches query or replay that XID decision.'),
  'Saga pattern':systemDesignVisual(['Step A','local commit'],['Step B','local commit'],['Step C','fails'],['Compensation worker','undo B then A'],'The saga durably records and executes local step A.','It advances to committed step B without a global transaction.','Step C fails after earlier effects are visible.','The saga resumes compensating actions in reverse semantic order until resolved.'),
  'Choreography':systemDesignVisual(['Service A','emits A-done'],['Event bus','routes event'],['Service B','reacts + emits'],['Service C','completes flow'],'Service A commits local state and publishes an outcome event.','The event bus delivers it to interested services.','Service B reacts, commits its own step, and emits the next event.','Service C completes or emits failure that triggers compensating reactions.'),
  'Orchestration':systemDesignVisual(['Orchestrator','workflow state'],['Service A','command/reply'],['Service B','command/reply'],['Recovery worker','resume next step'],'The orchestrator durably records the workflow and sends a command to A.','A executes idempotently and returns a correlated result.','The orchestrator advances state and commands B or chooses compensation.','After failure, it reloads state and resumes the exact pending transition.'),
  'Compensating transactions':systemDesignVisual(['Original step','reserve inventory'],['Failure record','payment rejected'],['Compensation worker','release inventory'],['Workflow ledger','resolved'],'An earlier local transaction reserves inventory.','A later step fails after the reservation is visible.','An idempotent compensation releases the reservation under current business rules.','The workflow ledger records success or escalates an irreconcilable compensation.'),
  'Transactional outbox':systemDesignVisual(['DB transaction','begin'],['Domain row','update'],['Outbox row','insert event'],['Relay','publish after commit'],'A service opens a local database transaction.','It updates the domain row.','It inserts the corresponding outbox event with a stable identity.','Commit makes both durable; only afterward can a retrying relay publish the event.'),
  'Distributed locking':systemDesignVisual(['Worker A','lock resource R'],['Lock service','lease + token 9'],['Worker B','blocked'],['Resource','fences stale owner'],'Worker A acquires R with lease and token 9.','The coordinator records A as current owner.','Worker B waits or fails while that lease remains current.','On ownership change, the resource accepts only the newer fencing token.'),
  'Optimistic concurrency':systemDesignVisual(['Reader A','version 4'],['Reader B','version 4'],['Writer A','CAS -> version 5'],['Writer B','conflict/retry'],'Two transactions read the same version 4 without locks.','Each computes a prospective update independently.','A commits conditionally and advances the version to 5.','B fails validation against version 4 and rereads or aborts.'),
  'Pessimistic concurrency':systemDesignVisual(['Transaction A','lock row R'],['Transaction B','waits'],['Transaction A','update + commit'],['Transaction B','acquires next'],'Transaction A acquires an exclusive lock before changing R.','Transaction B requests the conflicting lock and waits.','A updates R and releases the lock at commit.','B then acquires the lock and reads the committed value.'),
  'MVCC':systemDesignVisual(['Row','versions v3,v4'],['Reader','snapshot at v3'],['Writer','creates v4'],['Vacuum worker','remove obsolete v3'],'A reader begins with a snapshot that sees version 3.','A concurrent writer creates and commits version 4 rather than overwriting v3 in place.','New readers see v4 while the original reader still sees v3.','Garbage collection removes v3 only after no active snapshot needs it.'),
  'Snapshot isolation':systemDesignVisual(['Transaction A','snapshot S'],['Transaction B','commits row Y'],['Transaction A','writes row X'],['Conflict validator','write conflicts checked'],'A begins against a stable committed snapshot S.','B commits changes after S without altering what A reads.','A writes based on its snapshot while reading repeatably.','Commit rejects direct write conflicts, though disjoint writes can still create write skew.'),
  'Serializable transactions':systemDesignVisual(['Transactions A/B','concurrent'],['Concurrency control','locks/validation'],['Conflict graph','cycle checked'],['Commit order','equivalent serial run'],'Transactions execute concurrently for performance.','The engine tracks conflicting reads and writes.','Blocking or validation prevents a cycle that has no serial equivalent.','Committed outcomes match some one-at-a-time transaction order.'),
  'Atomic commit':systemDesignVisual(['Coordinator','transaction T'],['Participants','durable votes'],['Decision record','commit or abort'],['Recovery worker','same outcome everywhere'],'A multi-resource transaction receives one global identity.','Participants durably report whether they can commit.','The coordinator records one final outcome before announcing it.','Retries and recovery drive every participant to that same outcome.'),
  'Idempotent operations':systemDesignVisual(['Caller','operation ID 88'],['Service','conditional create'],['Operation ledger','outcome stored'],['Retry request','same response'],'The caller assigns stable operation ID 88 before the first attempt.','The service conditionally creates the operation record.','Effect and outcome are committed against that identity.','Any retry reads the ledger and returns the existing result.'),
  'Timeouts':systemDesignVisual(['Caller','deadline T'],['Dependency','request running'],['Timeout timer','expires'],['Cancellation path','cancel/fail'],'The caller computes a per-attempt timeout within its end-to-end deadline.','The dependency begins work while the timer runs.','No response arrives before expiry, leaving the remote outcome potentially unknown.','The caller cancels if possible and applies a safe retry or failure policy.'),
  'Retries':systemDesignVisual(['Attempt 1','transient failure'],['Classifier','retryable + safe'],['Attempt 2','same idempotency key'],['Retry outcome','success or budget exhausted'],'The first remote attempt fails or times out.','A classifier confirms the failure is transient and repetition is safe.','A later attempt uses the same logical operation identity.','Processing stops on success, permanent failure, deadline, or retry-budget exhaustion.'),
  'Exponential backoff':systemDesignVisual(['Retryable failure','attempt 1'],['Backoff delay','base*2^n'],['Delay cap','maximum wait'],['Retry request','after delay'],'A retryable failure increments the attempt number.','The next delay grows exponentially instead of retrying immediately.','A cap keeps delay and total deadline bounded.','The operation retries after waiting, reducing pressure on recovery.'),
  'Jitter':systemDesignVisual(['Clients','same failure time'],['Backoff range','0..D'],['Random delays','different times'],['Dependency','smoothed arrivals'],'Many clients fail together and compute the same base delay.','Each draws a random wait from the configured jitter distribution.','Their retries spread across the interval.','The dependency receives a smoother recovery load instead of a synchronized spike.'),
  'Retry budgets':systemDesignVisual(['Normal traffic','100 requests'],['Retry budget','10 retry tokens'],['Failed attempts','consume tokens'],['Retry limiter','stop retries'],'Normal traffic earns or defines a bounded retry allowance.','Each additional attempt consumes one retry token.','Transient failures spend the budget while capacity remains safe.','When exhausted, requests fail without adding more retry load.'),
  'Circuit breakers':systemDesignVisual(['Closed-state circuit','calls flow'],['Open-state circuit','failure threshold crossed'],['Half-open probe window','limited probes'],['Circuit state machine','probe outcome'],'Calls flow normally while classified outcomes remain healthy.','A rolling failure threshold opens the circuit and calls fail fast.','After a cool-down, a few half-open probes test recovery.','Successful probes close the circuit; failures reopen it.'),
  'Hedged requests':systemDesignVisual(['Primary request','replica A'],['Hedge timer','p95 delay'],['Duplicate request','replica B'],['Winning response','first valid response'],'A read starts against replica A.','If it exceeds a chosen delay without finishing, the hedge timer fires.','The same safe request goes to independent replica B.','The first valid response wins and the slower attempt is cancelled or discarded.'),
  'Request cancellation':systemDesignVisual(['Client','disconnect/deadline'],['Gateway','cancel token'],['Service','stop subwork'],['Resources','released'],'The client disconnects or its deadline expires.','The gateway propagates a cancellation signal downstream.','Services stop uncommitted queries, fan-out, and queued work where safe.','Resources are released while already committed effects retain truthful outcomes.'),
  'Bulkheads':systemDesignVisual(['Dependency A','pool A'],['Dependency B','pool B'],['A failure','pool A exhausted'],['Service','B still healthy'],'Calls to separate dependencies use distinct bounded pools.','Normal traffic consumes capacity only from its assigned pool.','Dependency A stalls and exhausts pool A.','Pool B remains available, containing the failure instead of exhausting all workers.'),
  'Load shedding':systemDesignVisual(['Incoming load','above capacity'],['Admission gate','priority/deadline'],['Rejected work','fast 429/503'],['Admitted work','meets SLO'],'Measured demand exceeds safe service capacity.','An admission gate ranks work by cost, priority, and remaining deadline.','Excess requests are rejected before allocating expensive resources.','The bounded admitted set continues completing within its objective.'),
  'Backpressure':systemDesignVisual(['Consumer','queue filling'],['Signal','demand reduced'],['Producer','slows/blocks'],['Queue','returns safe level'],'A downstream consumer falls behind and its bounded queue approaches capacity.','It reduces credits, pauses reads, or returns overload.','Upstream producers slow, buffer within limits, or reject new work.','Queue depth stabilizes instead of growing until collapse.'),
  'Rate limiting':systemDesignVisual(['Request','tenant A'],['Limiter','tenant bucket'],['Admission decision','token available?'],['Service','admit or reject'],'A request arrives with an authenticated policy dimension.','The limiter loads the matching tenant or endpoint state.','Available budget is atomically consumed or the request is denied.','Only admitted work reaches the protected service, with retry guidance on rejection.'),
  'Adaptive throttling':systemDesignVisual(['Telemetry','latency/errors'],['Controller','target utilization'],['Admission limit','increase/decrease'],['Traffic workload','new admission rate'],'The controller observes latency, queueing, errors, and concurrency.','It compares those signals with a stable operating target.','The admission limit rises cautiously or falls quickly with hysteresis.','Subsequent traffic uses the new limit while the controller watches for oscillation.'),
  'Admission control':systemDesignVisual(['Request','cost + priority'],['Capacity','current permits'],['Admission gate','deadline feasible'],['Admission outcome','admit/defer/reject'],'A request declares or receives an estimated resource cost.','The gate checks current concurrency and downstream capacity.','Priority and remaining deadline determine whether timely completion is plausible.','The request is admitted, delayed within bounds, or rejected before expensive work.'),
  'Dependency isolation':systemDesignVisual(['Dependency A','connections/queue A'],['Dependency B','connections/queue B'],['A outage','A limits reached'],['Main service','B path survives'],'Each dependency receives dedicated concurrency, connection, and queue limits.','Calls cannot borrow unbounded resources across isolation boundaries.','An outage fills only Dependency A allocations.','The service continues paths using B and sheds A-dependent features truthfully.'),
  'Cell-based architecture':systemDesignVisual(['Router','tenant -> cell'],['Cell A','full stack'],['Cell B','full stack'],['Cell A failure','B unaffected'],'A directory maps each tenant or shard to one cell.','Cell A contains the compute, storage, and dependencies for its bounded slice.','Cell B operates independently with a different slice.','A fault or deployment in A affects only its routed population.'),
  'Blast-radius reduction':systemDesignVisual(['Change','new version'],['Canary','1% scope'],['Cells','staged waves'],['Rollback controller','damage bounded'],'A potentially risky change starts in a tiny isolated scope.','Health and correctness signals are evaluated against abort thresholds.','Promotion proceeds through independent cells or tenant cohorts.','A bad signal stops and rolls back before reaching the remaining population.'),
  'Fail-fast':systemDesignVisual(['Request','arrives'],['Precondition check','invalid/unavailable'],['Admission gate','immediate error'],['Capacity reserve','preserved'],'A request reaches a boundary with explicit prerequisites.','Validation or dependency state proves useful completion is unlikely.','The service returns a clear error without queueing or retries.','Scarce capacity remains available for work that can succeed.'),
  'Fail-open':systemDesignVisual(['Request','policy check'],['Policy service','unavailable'],['Fallback rule','allow'],['Audit log','degraded decision'],'A request requires a control-plane policy decision.','The policy service cannot respond before the deadline.','A predeclared fail-open rule permits the operation to preserve availability.','The degraded decision is bounded, audited, and reconciled after recovery.'),
  'Fail-closed':systemDesignVisual(['Request','authorization check'],['Authorization service','unavailable'],['Fallback rule','deny'],['Error response','safe failure'],'A request requires proof of authorization or safety.','The authoritative dependency cannot provide that proof.','A fail-closed rule refuses to infer permission from absence.','The operation is denied until the dependency or an approved cached proof is available.'),
  'Graceful degradation':systemDesignVisual(['Request','full experience'],['Optional dependency','optional feature fails'],['Feature gate','disable enrichment'],['Core response','core result'],'A request begins with core and optional work planned.','An optional dependency exceeds its error or latency threshold.','The service disables that bounded feature rather than retrying into overload.','It returns an accurate core response marked with degraded behavior.'),
  'Fault domains':systemDesignVisual(['Replica A','zone 1/rack 2'],['Replica B','zone 2/rack 5'],['Zone 1 fault','A lost'],['Quorum','B + C survive'],'Placement metadata identifies shared power, rack, zone, and control-plane risks.','Replicas are spread so one physical fault cannot remove a quorum.','A zone-level event removes all components in its domain.','Replicas in independent domains preserve the required service guarantee.'),
  'Failure domains':systemDesignVisual(['Service cell','bounded ownership'],['Shared dependency','domain boundary'],['Contained fault','domain isolated'],['Recovery plan','domain rebuilt'],'Architecture defines which components and traffic fail together.','Dependencies crossing the boundary are minimized or independently redundant.','A fault is contained within the declared domain.','Recovery rebuilds or reroutes that domain without destabilizing unaffected domains.')
};

for (const chapter of window.SYSTEM_DESIGN_CHAPTERS) {
  for (const group of chapter.groups) {
    for (const concept of group.concepts) {
      concept.visual = systemDesignVisuals[concept.name];
    }
  }
}

const systemDesignDiagramContext = {
  'Consistency and availability':['consistencyPlane','Consistency policy plane','routes reads by required guarantee','control','enforce consistency policy','report observed version'],
  'Failure, time, and semantics':['operationHistory','Operation history','records clocks, delivery, and failures','storage','record operation evidence','read ordering evidence'],
  'Consensus and leadership':['consensusJournal','Consensus journal','persists ballots, terms, and decisions','storage','persist consensus metadata','recover chosen decision'],
  'Coordination services and membership':['coordinationStore','Coordination metadata store','holds leases, epochs, and membership','database','commit coordination metadata','watch metadata revision'],
  'Replication topologies':['replicationWal','Replication WAL','durable ordered update stream','storage','append replication record','replay replication record'],
  'Lag, conflicts, and geography':['versionStore','Version metadata store','tracks causality and replica progress','database','record version metadata','resolve replica version'],
  'Placement strategies':['shardDirectory','Shard directory','maps keys and ranges to owners','index','resolve shard owner','publish placement epoch'],
  'Movement and skew':['rebalanceControl','Rebalance controller','plans bounded ownership movement','control','schedule ownership change','publish routing cutover'],
  'Query and tenancy behavior':['queryPlanner','Distributed query planner','bounds fan-out and tenant routing','gateway','plan partition requests','merge partition responses'],
  'Access patterns':['productStore','Authoritative product store','source of truth behind cache','database','read authoritative value','persist authoritative value'],
  'Freshness and misses':['freshnessIndex','Freshness metadata index','tracks versions, TTLs, and refill ownership','index','check freshness metadata','commit refill metadata'],
  'Topology and correctness':['cacheRing','Cache routing ring','maps keys to cache owners and replicas','index','resolve cache owner','publish cache membership'],
  'Membership':['exactSet','Exact backing set','verifies positive membership candidates','storage','verify positive candidate','record inserted member'],
  'Cardinality and frequency':['streamVerifier','Stream verification store','checks sampled frequencies and counts','storage','verify sketch estimate','sample exact counter'],
  'Similarity and sampling':['sourcePopulation','Source population','provides vectors, sets, or stream records','storage','sample source records','verify sampled estimate'],
  'Messaging models':['brokerMetadata','Broker metadata quorum','owns topics, partitions, and assignments','control','resolve broker ownership','publish partition assignment'],
  'Progress and retention':['segmentStore','Broker segment store','retains ordered records and offsets','storage','read retained segment','compact broker segment'],
  'Delivery control':['deliveryScheduler','Delivery scheduler','manages attempts, priority, and visibility','control','schedule delivery attempt','record delivery outcome'],
  'Integration patterns':['schemaRegistry','Event schema registry','governs compatible event contracts','control','validate event contract','publish schema version'],
  'Atomic commit':['recoveryJournal','Transaction recovery journal','stores votes and final decisions','storage','persist transaction decision','recover in-doubt participant'],
  'Long-running workflows':['workflowJournal','Workflow journal','stores durable step and compensation state','storage','record workflow transition','resume pending workflow'],
  'Concurrency control':['versionCatalog','Transaction version catalog','tracks locks, snapshots, and versions','database','validate transaction version','publish committed version'],
  'Remote-call resilience':['dependencyTelemetry','Dependency telemetry','measures latency, attempts, and failures','control','record dependency outcome','update resilience policy'],
  'Overload and isolation':['capacityController','Capacity controller','owns queue, rate, and concurrency budgets','control','grant capacity permit','adjust admission budget'],
  'Failure policy and domains':['incidentControl','Incident control plane','tracks health, domains, and degraded mode','control','publish failure-domain health','activate recovery policy']
};
const systemDesignDiagramCoordinates = {
  5:[[14,50],[36,16],[36,84],[66,24],[86,68]],
  6:[[14,50],[34,16],[34,84],[62,16],[62,84],[86,50]],
  7:[[14,50],[32,16],[32,84],[58,16],[58,84],[82,28],[82,72]],
  8:[[14,50],[30,16],[30,84],[52,16],[52,84],[72,16],[72,84],[86,50]]
};
const systemDesignStateLikeLabel = /^(closed|open|half-open|closed\/reopen|decision|recovery|failure|commit|ack|outcome|completion|miss|retry|delay|cap|limit)$/i;
const systemDesignCompactEndpointLabel = component => {
  const label = component[1].split(' - ')[0].replace(/\//g,' or ');
  if (label.length <= 24) return label;
  return label.split(/\s+/).slice(0,3).join(' ');
};
const systemDesignCompactLinkLabel = (source,target) => {
  const targetLabel = systemDesignCompactEndpointLabel(target);
  const action = {
    client:'return response to',
    gateway:'route request through',
    service:'invoke',
    database:'commit record to',
    replica:source[3] === 'client' ? 'query' : 'replicate update to',
    cache:'read or update',
    queue:'publish record to',
    worker:'dispatch work to',
    control:'update',
    storage:'persist record in',
    index:'look up or update',
    node:'exchange state with',
    clock:'advance',
    bitset:'set or test'
  }[target[3]];
  return `${action} ${targetLabel}`;
};
const systemDesignReworkDiagram = (concept,groupTitle) => {
  const diagram = concept.diagram;
  if (diagram.components.length < 5) {
    const [id,label,detail,type,forwardLabel,returnLabel] = systemDesignDiagramContext[groupTitle];
    diagram.components.push([id,label,detail,type,50,50]);
    const branchTarget = diagram.components[1][0];
    const feedbackSource = diagram.components[3][0];
    diagram.links.push([id,branchTarget,forwardLabel]);
    diagram.links.push([feedbackSource,id,returnLabel]);
  }
  for (const component of diagram.components) {
    if (systemDesignStateLikeLabel.test(component[1])) {
      component[1] = `${concept.name} - ${component[1]}`;
    }
  }
  const coordinates = systemDesignDiagramCoordinates[diagram.components.length];
  diagram.components.forEach((component,index) => {
    component[4] = coordinates[index][0];
    component[5] = coordinates[index][1];
  });
  for (const frame of diagram.frames) {
    if (frame[0] < 0) continue;
    const [fromId,toId] = diagram.links[frame[0]];
    frame[1][fromId] = 'active';
    frame[1][toId] = 'active';
  }
  const componentsById = Object.fromEntries(diagram.components.map(component => [component[0],component]));
  for (const link of diagram.links) {
    if (link[2].length > 45) {
      link[2] = systemDesignCompactLinkLabel(componentsById[link[0]],componentsById[link[1]]);
    }
  }
};

const systemDesignDiagramTypes = new Set(['client','gateway','service','database','replica','cache','queue','worker','control','storage','index','node','clock','bitset']);
const systemDesignDiagramLayouts = {
  architecture:[[10,50],[38,20],[65,20],[90,50]],
  topology:[[15,50],[43,15],[76,30],[70,78]],
  sequence:[[8,50],[36,50],[64,50],[92,50]],
  timeline:[[8,50],[36,50],[64,50],[92,50]],
  structure:[[15,50],[43,18],[72,50],[43,82]],
  comparison:[[18,25],[18,75],[78,25],[78,75]]
};
const systemDesignDiagramKinds = {
  comparison:new Set(['CAP theorem','PACELC','Byzantine vs crash failures','Strong consistency','Sequential consistency','Causal consistency','Eventual consistency','At-most-once','At-least-once','Exactly-once','Active-active replication','Active-passive replication','Optimistic concurrency','Pessimistic concurrency','Fail-open','Fail-closed']),
  timeline:new Set(['Time and clocks','Physical clocks','Logical clocks','Lamport clocks','Hybrid logical clocks','Replication lag','TTL','Refresh-ahead','Probabilistic early expiration','Retention','Replay','Delayed queues','Timeouts','Retries','Exponential backoff','Jitter','Retry budgets','Request cancellation']),
  structure:new Set(['Consistency models','Vector clocks','Version vectors','CRDTs','Bloom filter','Counting Bloom filter','Cuckoo filter','Quotient filter','HyperLogLog','Count-Min Sketch','Heavy hitters','Top-K sketches','MinHash','SimHash','Locality-sensitive hashing','Reservoir sampling','HyperLogLog++','Approximate distinct counting','Probabilistic counters','Sampling algorithms','MVCC','Snapshot isolation']),
  topology:new Set(['Availability','Partition tolerance','Quorum reads/writes','Read repair','Anti-entropy','Gossip protocols','Failure detectors','Split brain','Quorum consensus','Distributed locks','Leases','Fencing tokens','Distributed coordination','Zookeeper-style coordination','etcd-style coordination','Membership protocols','Leader/follower','Primary/backup','Split-brain prevention','Leader/follower replication','Multi-leader replication','Leaderless replication','Synchronous replication','Asynchronous replication','Semi-synchronous replication','Quorum replication','Chain replication','Read replicas','Write replicas','Active-active replication','Active-passive replication','Cross-region replication','Cross-datacenter replication','Hash partitioning','Consistent hashing','Rendezvous hashing','Range partitioning','Directory-based partitioning','Virtual nodes','Rebalancing','Hot partitions','Hot keys','Shard splitting','Shard merging','Dynamic partitioning','Scatter-gather','Fan-out','Partition affinity','Tenant-based partitioning','Distributed cache','Local + distributed cache','Hot-key mitigation','Pub/Sub','Kafka-style logs','Consumer groups','Partitioning','Cell-based architecture','Blast-radius reduction','Fault domains','Failure domains'])
};
const systemDesignDiagramLabel = label => ({
  Input:'Source message',
  Output:'Ranked records',
  Process:'Worker operation',
  Mechanism:'Coordination rule',
  Stage:'Workflow phase',
  State:'Materialized view',
  Result:'Final response'
}[label] || label);
const systemDesignDiagramType = (label, detail) => {
  const value = `${label} ${detail}`.toLowerCase();
  if (/(client|caller|reader|writer|producer|publisher|request|session|user)/.test(value)) return 'client';
  if (/(gateway|router|admission|limiter|dispatcher|load balancer)/.test(value)) return 'gateway';
  if (/(bit array|bitset)/.test(value)) return 'bitset';
  if (/(physical clock|logical clock|hybrid logical|wall clock|monotonic clock|timer|time source)/.test(value)) return 'clock';
  if (/(replica|follower|backup|acceptor|voter|region|datacenter|shard)/.test(value)) return 'replica';
  if (/(index|directory|offset store|membership map|range map)/.test(value)) return 'index';
  if (/(storage|segment|snapshot|transaction log|event store|compacted log)/.test(value)) return 'storage';
  if (/(cache|filter|register|counter|sketch|reservoir)/.test(value)) return 'cache';
  if (/(database|table|ledger|metadata|decision log|epoch store)/.test(value)) return 'database';
  if (/(node)/.test(value)) return 'node';
  if (/(queue|topic|broker|partition log|event bus|stream|outbox|inbox|dlq|message)/.test(value)) return 'queue';
  if (/(worker|consumer|operator|subscriber)/.test(value)) return 'worker';
  if (/(leader|primary|service|authority|dependency|resolver|processor|projector|scheduler|controller|sequencer|loader|relay|cleaner)/.test(value)) return 'service';
  return 'control';
};
const systemDesignDiagramKind = name => {
  for (const [kind,names] of Object.entries(systemDesignDiagramKinds)) {
    if (names.has(name)) return kind;
  }
  return 'sequence';
};
const systemDesignDiagramLinkLabel = (text, source, target) => {
  const firstClause = text
    .replace(/[.;].*$/,'')
    .replace(/^(A|An|The)\s+/,'')
    .split(/,\s+|\s+(?:while|after|before|because|although|but|so that|until)\s+/i)[0]
    .replace(/\.$/,'');
  if (firstClause.length <= 55) return firstClause;
  const targetLabel = target[1].split(' - ')[0];
  const action = {
    client:'respond to',
    gateway:'route through',
    service:'invoke',
    database:'access',
    replica:source[3] === 'client' ? 'query' : 'replicate to',
    cache:'update',
    queue:'publish to',
    worker:'dispatch to',
    control:'update',
    storage:'persist in',
    index:'update',
    node:'gossip to',
    clock:'advance',
    bitset:'set or check'
  }[target[3]];
  return `${action} ${targetLabel}`;
};
const systemDesignDiagramFromVisual = concept => {
  const kind = systemDesignDiagramKind(concept.name);
  const positions = systemDesignDiagramLayouts[kind];
  const rawLabels = concept.visual.nodes.map(([label]) => systemDesignDiagramLabel(label));
  const labelCounts = rawLabels.reduce((counts,label) => {
    counts[label] = (counts[label] || 0) + 1;
    return counts;
  },{});
  const components = concept.visual.nodes.map(([label,detail],index) => {
    const rawLabel = rawLabels[index];
    const diagramLabel = labelCounts[rawLabel] > 1 ? `${rawLabel} - ${detail}` : rawLabel;
    const type = systemDesignDiagramType(diagramLabel,detail);
    return [`c${index}`,diagramLabel,detail,systemDesignDiagramTypes.has(type) ? type : 'control',positions[index][0],positions[index][1]];
  });
  const links = kind === 'topology'
    ? components.slice(1).map((component,index) => ['c0',component[0],systemDesignDiagramLinkLabel(concept.visual.steps[index+1]?.[2] || concept.visual.steps[index][2],components[0],component)])
    : components.slice(1).map((component,index) => [`c${index}`,component[0],systemDesignDiagramLinkLabel(concept.visual.steps[index+1]?.[2] || concept.visual.steps[index][2],components[index],component)]);
  const frames = concept.visual.steps.map((step,index) => {
    const states = {};
    for (const completed of step[1]) states[`c${completed}`] = 'done';
    states[`c${step[0]}`] = index === concept.visual.steps.length-1 ? 'done' : 'active';
    return [index === 0 ? -1 : Math.min(index-1,links.length-1),states];
  });
  return {kind,components,links,frames};
};
const systemDesignDiagram = (kind,components,links,frames) => ({kind,components,links,frames});
const systemDesignCachingLinkLabels = {
  'Cache-aside':['cache lookup misses','read authoritative v3','fill cache with v3 and TTL'],
  'Read-through cache':['cache lookup misses','invoke configured loader','store and return loaded value'],
  'Write-through cache':['update cache entry','persist source synchronously','acknowledge both writes'],
  'Write-behind cache':['buffer accepted write','flush coalesced batch','persist source asynchronously'],
  'Refresh-ahead':['detect hot near-expiry key','refresh value in background','atomically replace cached version'],
  'Cache warming':['select bounded hot set','preload from source','admit traffic to warm cache'],
  'Cache invalidation':['commit source version','broadcast invalidate key','refill on next read'],
  'TTL':['age cached entry','expire entry at deadline','reload with jittered TTL'],
  'Negative caching':['confirm authoritative miss','cache short-lived not-found','suppress repeated source reads'],
  'Cache stampede':['observe simultaneous misses','elect one refill owner','release waiters after refill'],
  'Thundering herd':['detect synchronized burst','jitter and limit requests','restore bounded arrival rate'],
  'Request coalescing':['register in-flight request','join shared promise','publish one shared response'],
  'Single-flight':['elect per-key leader','attach follower callers','complete and clear flight'],
  'Probabilistic early expiration':['compute randomized threshold','refresh one request early','install a fresh expiry'],
  'Distributed cache':['route key to cache owner','replicate hot entry','remap after membership change'],
  'Local + distributed cache':['miss local L1','read shared L2 or source','invalidate both cache layers'],
  'Cache consistency':['observe stale cached version','apply freshness contract','return permitted version'],
  'Cache versioning':['address current generation','ignore stale generation fill','serve versioned cache entry'],
  'Hot-key mitigation':['serve from near-caches','coalesce source refill','spread residual hot-key load']
};
const systemDesignDiagramOverrides = {
  'Eventual consistency':systemDesignDiagram('timeline',[
    ['writer','Checkout API','writes inventory v2','client',8,18],
    ['primary','Inventory primary','v1 -> v2 at T0','database',30,18],
    ['replicaA','Read replica A','v1, then v2 at T1','replica',55,18],
    ['replicaB','Read replica B','v1, then v2 at Tn','replica',80,18],
    ['reader','Product page','may read stale v1','client',55,75]
  ],[
    ['writer','primary','PUT stock=v2'],
    ['primary','replicaA','async replicate v2'],
    ['primary','replicaB','async replicate v2'],
    ['reader','replicaA','GET stock'],
    ['reader','replicaB','later GET stock']
  ],[
    [0,{writer:'active',primary:'active',replicaA:'risk',replicaB:'risk'}],
    [1,{writer:'done',primary:'done',replicaA:'active',replicaB:'risk'}],
    [3,{replicaA:'done',reader:'active',replicaB:'risk'}],
    [2,{primary:'done',replicaA:'done',replicaB:'done',reader:'done'}]
  ]),
  'Gossip protocols':systemDesignDiagram('topology',[
    ['nodeA','Node A','membership generation 5','node',15,18],
    ['nodeB','Node B','membership generation 4','node',50,12],
    ['nodeC','Node C','membership generation 3','node',82,28],
    ['nodeD','Node D','joining peer','node',72,78],
    ['nodeE','Node E','membership generation 4','node',25,78]
  ],[
    ['nodeA','nodeB','digest + newer member'],
    ['nodeB','nodeC','gossip generation 5'],
    ['nodeC','nodeD','share membership view'],
    ['nodeD','nodeE','propagate join'],
    ['nodeE','nodeA','anti-entropy round'],
    ['nodeB','nodeE','random peer exchange']
  ],[
    [0,{nodeA:'active',nodeB:'active'}],
    [1,{nodeA:'done',nodeB:'active',nodeC:'active'}],
    [2,{nodeB:'done',nodeC:'active',nodeD:'active'}],
    [4,{nodeA:'done',nodeB:'done',nodeC:'done',nodeD:'done',nodeE:'done'}]
  ]),
  'Quorum reads/writes':systemDesignDiagram('topology',[
    ['client','Cart service','writes cart v7','client',8,50],
    ['coordinator','Quorum coordinator','N=3, W=2, R=2','service',30,50],
    ['replicaA','Replica A','stores v7','replica',66,12],
    ['replicaB','Replica B','stores v7','replica',88,50],
    ['replicaC','Replica C','still v6','replica',66,88],
    ['reader','Cart reader','resolves latest version','client',30,88]
  ],[
    ['client','coordinator','PUT cart v7'],
    ['coordinator','replicaA','write v7'],
    ['coordinator','replicaB','write v7'],
    ['reader','replicaB','read quorum member'],
    ['reader','replicaC','read quorum member'],
    ['replicaB','reader','return newer v7']
  ],[
    [0,{client:'active',coordinator:'active'}],
    [1,{client:'done',coordinator:'active',replicaA:'active',replicaB:'active'}],
    [3,{reader:'active',replicaB:'done',replicaC:'risk'}],
    [5,{replicaA:'done',replicaB:'done',replicaC:'risk',reader:'done'}]
  ]),
  'Bloom filter':systemDesignDiagram('structure',[
    ['item','Username alice','membership candidate','client',8,50],
    ['hash1','Hash function h1','maps alice -> bit 2','service',32,18],
    ['hash2','Hash function h2','maps alice -> bit 7','service',32,82],
    ['bits','Bit array','0 0 1 0 0 0 0 1','bitset',70,50],
    ['lookup','Username bob','checks all mapped bits','client',92,50]
  ],[
    ['item','hash1','hash alice with h1'],
    ['item','hash2','hash alice with h2'],
    ['hash1','bits','set bit 2'],
    ['hash2','bits','set bit 7'],
    ['lookup','bits','test bob positions']
  ],[
    [0,{item:'active',hash1:'active',hash2:'active'}],
    [2,{item:'done',hash1:'done',bits:'active'}],
    [3,{hash2:'done',bits:'active'}],
    [4,{bits:'done',lookup:'active'}]
  ]),
  'Kafka-style logs':systemDesignDiagram('architecture',[
    ['producer','Order producer','key=customer-42','client',8,50],
    ['leader','Broker 1 / partition leader','append offset 42','queue',32,32],
    ['follower','Broker 2 / partition replica','replicate offset 42','replica',58,12],
    ['group','Consumer group','member owns partition','worker',82,42],
    ['offsets','Offset store','next offset 43','database',58,82]
  ],[
    ['producer','leader','produce keyed record'],
    ['leader','follower','replicate log entry'],
    ['leader','group','fetch offset 42'],
    ['group','offsets','commit offset 43']
  ],[
    [0,{producer:'active',leader:'active'}],
    [1,{producer:'done',leader:'active',follower:'active'}],
    [2,{leader:'done',follower:'done',group:'active'}],
    [3,{group:'done',offsets:'done'}]
  ]),
  'Two-phase commit (2PC)':systemDesignDiagram('sequence',[
    ['client','Transfer service','starts transaction TX9','client',8,18],
    ['coordinator','2PC coordinator','durable decision owner','control',28,50],
    ['accountDb','Account database','participant: debit','database',58,18],
    ['ledgerDb','Ledger database','participant: journal','database',58,82],
    ['decisionLog','Coordinator log','commit or abort TX9','database',88,50]
  ],[
    ['client','coordinator','begin TX9'],
    ['coordinator','accountDb','PREPARE debit'],
    ['coordinator','ledgerDb','PREPARE journal'],
    ['accountDb','coordinator','YES, locks held'],
    ['ledgerDb','coordinator','YES, record durable'],
    ['coordinator','decisionLog','persist COMMIT'],
    ['coordinator','accountDb','COMMIT TX9'],
    ['coordinator','ledgerDb','COMMIT TX9']
  ],[
    [0,{client:'active',coordinator:'active'}],
    [1,{client:'done',coordinator:'active',accountDb:'active',ledgerDb:'active'}],
    [5,{accountDb:'done',ledgerDb:'done',decisionLog:'active'}],
    [6,{coordinator:'done',accountDb:'done',ledgerDb:'done',decisionLog:'done'}]
  ]),
  'Paxos':systemDesignDiagram('sequence',[
    ['proposer','Proposer','ballot 7, value X','service',8,50],
    ['acceptorA','Acceptor A','promised ballot 7','replica',42,12],
    ['acceptorB','Acceptor B','promised ballot 7','replica',42,50],
    ['acceptorC','Acceptor C','unavailable','replica',42,88],
    ['learner','Learner','value X chosen','worker',88,50]
  ],[
    ['proposer','acceptorA','PREPARE ballot 7'],
    ['proposer','acceptorB','PREPARE ballot 7'],
    ['acceptorA','proposer','PROMISE + prior accepted'],
    ['acceptorB','proposer','PROMISE + prior accepted'],
    ['proposer','acceptorA','ACCEPT ballot 7, X'],
    ['proposer','acceptorB','ACCEPT ballot 7, X'],
    ['acceptorA','learner','ACCEPTED X'],
    ['acceptorB','learner','quorum chooses X']
  ],[
    [0,{proposer:'active',acceptorA:'active',acceptorB:'active',acceptorC:'risk'}],
    [2,{acceptorA:'done',acceptorB:'done',proposer:'active'}],
    [4,{proposer:'done',acceptorA:'active',acceptorB:'active'}],
    [7,{acceptorA:'done',acceptorB:'done',learner:'done'}]
  ]),
  'Raft':systemDesignDiagram('sequence',[
    ['client','Client','command SET x=5','client',8,50],
    ['leader','Leader','term 8, log index 31','service',34,50],
    ['followerA','Follower A','index 31 replicated','replica',64,18],
    ['followerB','Follower B','index 31 replicated','replica',64,82],
    ['machine','State machine','apply committed command','worker',92,50]
  ],[
    ['client','leader','submit command'],
    ['leader','followerA','AppendEntries term 8'],
    ['leader','followerB','AppendEntries term 8'],
    ['followerA','leader','ack index 31'],
    ['followerB','leader','majority reached'],
    ['leader','machine','advance commit index'],
    ['machine','client','return applied result']
  ],[
    [0,{client:'active',leader:'active'}],
    [1,{client:'done',leader:'active',followerA:'active',followerB:'active'}],
    [4,{followerA:'done',followerB:'done',leader:'active'}],
    [5,{leader:'done',machine:'done',client:'done'}]
  ])
};

systemDesignDiagramOverrides.Bulkheads = systemDesignDiagram('architecture',[
  ['router','Checkout service','routes dependency calls','service',8,50],
  ['poolA','Inventory pool','20 isolated permits','queue',34,18],
  ['inventory','Inventory API','stalled dependency','service',66,18],
  ['poolB','Payment pool','20 isolated permits','queue',34,82],
  ['payment','Payment API','healthy dependency','service',66,82],
  ['storefront','Storefront client','originates the checkout request','client',92,50]
],[
  ['router','poolA','route inventory calls through isolated pool'],
  ['poolA','inventory','invoke inventory with bounded permits'],
  ['router','poolB','route payment calls to pool B'],
  ['poolB','payment','invoke payment with bounded permits'],
  ['inventory','poolA','exhaust only inventory permits'],
  ['payment','storefront','return healthy payment result']
],[
  [0,{router:'active',poolA:'active',poolB:'active'}],
  [1,{poolA:'active',inventory:'risk',poolB:'done',payment:'done'}],
  [4,{inventory:'risk',poolA:'risk',poolB:'done',payment:'done'}],
  [5,{inventory:'risk',poolA:'risk',payment:'done',storefront:'done'}]
]);
const systemDesignLinkLabelOverrides = {
  'Causal consistency':{
    0:'record causal dependency for reply B',
    2:'deliver event A before reply B'
  },
  'Semi-synchronous replication':{
    0:'wait for first follower durability',
    1:'acknowledge after one follower',
    2:'replicate remaining follower asynchronously'
  },
  'Message ordering':{
    0:'append event A at offset 8',
    1:'advance consumer through ordered offsets',
    2:'apply event A before event B'
  },
  'Consistent hashing':{
    0:'locate clockwise token successor',
    1:'select next nodes for replicas',
    2:'remap affected token intervals'
  },
  'Leader/follower replication':{
    0:'append write at leader index 30',
    1:'replay index 30 on followers',
    2:'route read by freshness requirement'
  }
};

for (const chapter of window.SYSTEM_DESIGN_CHAPTERS) {
  for (const group of chapter.groups) {
    for (const concept of group.concepts) {
      concept.diagram = systemDesignDiagramOverrides[concept.name] || systemDesignDiagramFromVisual(concept);
      const cachingLabels = systemDesignCachingLinkLabels[concept.name];
      if (cachingLabels) {
        concept.diagram.links.forEach((link,index) => {
          link[2] = cachingLabels[index];
        });
      }
      const labelOverrides = systemDesignLinkLabelOverrides[concept.name];
      if (labelOverrides) {
        for (const [index,label] of Object.entries(labelOverrides)) {
          concept.diagram.links[Number(index)][2] = label;
        }
      }
    }
  }

}

for (const chapter of window.SYSTEM_DESIGN_CHAPTERS) {
  for (const group of chapter.groups) {
    for (const concept of group.concepts) {
      systemDesignReworkDiagram(concept,group.title);
    }
  }
}

const systemDesignExplicitDiagrams = new Set([
  'Eventual consistency','Gossip protocols','Quorum reads/writes','Bloom filter',
  'Kafka-style logs','Two-phase commit (2PC)','Paxos','Raft','Bulkheads'
]);
const systemDesignActorBlueprints = {
  'Consistency and availability':[
    ['API client','issues consistency-scoped operations','client'],
    ['Request gateway','routes by consistency contract','gateway'],
    ['Primary database','orders authoritative writes','database'],
    ['Read replica A','serves synchronized reads','replica'],
    ['Read replica B','may lag or partition','replica'],
    ['Consistency controller','enforces read and write policy','control']
  ],
  'Failure, time, and semantics':[
    ['API client','submits retryable operations','client'],
    ['Service node A','handles the first attempt','service'],
    ['Service node B','independent peer or failover target','node'],
    ['Durable operation log','records identities and ordering','storage'],
    ['Failure detector','tracks peer evidence and suspicion','control'],
    ['Coordination node','publishes current ownership','control']
  ],
  'Consensus and leadership':[
    ['Command client','submits a replicated command','client'],
    ['Consensus leader','proposes the next log entry','service'],
    ['Voting replica A','persists term and vote','replica'],
    ['Voting replica B','forms a majority with A','replica'],
    ['Voting replica C','survives one voter failure','replica'],
    ['Consensus journal','stores committed log entries','storage']
  ],
  'Coordination services and membership':[
    ['Control-plane client','reads and updates metadata','client'],
    ['Coordination leader','serializes metadata changes','service'],
    ['Coordination follower A','replicates revisions','replica'],
    ['Coordination follower B','provides quorum durability','replica'],
    ['Metadata store','holds leases and membership','database'],
    ['Watch client','reacts to revision changes','worker']
  ],
  'Replication topologies':[
    ['Write client','submits a versioned mutation','client'],
    ['Write authority','orders or coordinates writes','service'],
    ['Replica A','stores a durable copy','replica'],
    ['Replica B','provides fault independence','replica'],
    ['Replication WAL','carries ordered updates','storage'],
    ['Read client','selects a freshness level','client']
  ],
  'Lag, conflicts, and geography':[
    ['Regional writer A','creates version X','client'],
    ['Regional writer B','creates version Y','client'],
    ['Region A replica','stores regional history','replica'],
    ['Region B replica','stores regional history','replica'],
    ['Version metadata store','tracks causality and progress','database'],
    ['Conflict resolver','merges concurrent versions','service']
  ],
  'Placement strategies':[
    ['API gateway','extracts the partition key','gateway'],
    ['Shard router','evaluates the placement rule','service'],
    ['Shard directory','stores ownership epochs','index'],
    ['Shard A','owns one key subset','database'],
    ['Shard B','owns another key subset','database'],
    ['Shard C','supports growth and movement','database']
  ],
  'Movement and skew':[
    ['Traffic router','sends requests by ownership epoch','gateway'],
    ['Source shard','currently owns the hot range','database'],
    ['Target shard','receives copied data','database'],
    ['Change stream','captures writes during movement','queue'],
    ['Rebalance controller','plans bounded movement','control'],
    ['Load telemetry','reports bytes and request rate','control']
  ],
  'Query and tenancy behavior':[
    ['Query client','submits a tenant-scoped query','client'],
    ['Query coordinator','plans bounded fan-out','service'],
    ['Tenant directory','maps tenants to partitions','index'],
    ['Shard A','executes one subquery','database'],
    ['Shard B','executes another subquery','database'],
    ['Result merger','combines partial responses','worker']
  ],
  'Access patterns':[
    ['Web client','requests or updates an item','client'],
    ['Application service','implements cache policy','service'],
    ['Local cache','holds process-local hot data','cache'],
    ['Distributed cache','shares cached values','cache'],
    ['Authoritative database','owns durable values','database'],
    ['Invalidation bus','distributes version changes','queue']
  ],
  'Freshness and misses':[
    ['Web client','requests a cached item','client'],
    ['Cache gateway','routes by key and version','gateway'],
    ['Cache node','stores value and expiry','cache'],
    ['Refill worker','coalesces source loads','worker'],
    ['Authoritative database','answers cache misses','database'],
    ['Freshness index','tracks TTL and refill ownership','index']
  ],
  'Topology and correctness':[
    ['Application client','looks up a cache key','client'],
    ['Cache router','maps keys to owners','gateway'],
    ['Cache node A','serves the primary copy','cache'],
    ['Cache node B','serves a replica copy','cache'],
    ['Source database','owns authoritative data','database'],
    ['Invalidation service','publishes current versions','service']
  ],
  'Messaging models':[
    ['Event producer','publishes a keyed record','client'],
    ['Broker leader','appends to an owned partition','queue'],
    ['Broker replica','copies the partition log','replica'],
    ['Consumer A','processes one assignment','worker'],
    ['Consumer B','processes another assignment','worker'],
    ['Broker controller','owns topics and assignments','control']
  ],
  'Progress and retention':[
    ['Event producer','appends retained records','client'],
    ['Partition leader','assigns ordered offsets','queue'],
    ['Segment store','holds immutable log segments','storage'],
    ['Stream consumer','reads from a cursor','worker'],
    ['Offset database','stores consumer progress','database'],
    ['Retention cleaner','compacts or removes segments','worker']
  ],
  'Delivery control':[
    ['Job producer','submits durable work','client'],
    ['Ready queue','holds eligible messages','queue'],
    ['Delivery scheduler','controls attempts and delay','control'],
    ['Consumer worker','executes the business action','worker'],
    ['Effect database','stores the durable result','database'],
    ['Recovery queue','holds retry or dead-letter work','queue']
  ],
  'Integration patterns':[
    ['Domain service','commits a business change','service'],
    ['Domain database','stores authoritative state','database'],
    ['Change journal','captures integration records','storage'],
    ['Event broker','delivers committed events','queue'],
    ['Projection worker','builds downstream views','worker'],
    ['Read model','serves projected state','database']
  ],
  'Atomic commit':[
    ['Transaction client','starts a multi-resource write','client'],
    ['Commit coordinator','owns the final decision','control'],
    ['Participant database A','prepares local changes','database'],
    ['Participant database B','prepares local changes','database'],
    ['Decision journal','persists commit or abort','storage'],
    ['Recovery worker','resolves in-doubt branches','worker']
  ],
  'Long-running workflows':[
    ['Workflow client','starts a business workflow','client'],
    ['Workflow coordinator','tracks durable progress','control'],
    ['Service A','commits one local step','service'],
    ['Service B','commits the next local step','service'],
    ['Workflow journal','stores step outcomes','storage'],
    ['Compensation worker','reverses completed steps','worker']
  ],
  'Concurrency control':[
    ['Transaction client A','reads and proposes changes','client'],
    ['Transaction client B','runs concurrently','client'],
    ['Transaction manager','checks conflicts and isolation','control'],
    ['Primary database','stores committed rows','database'],
    ['Version catalog','tracks snapshots and versions','index'],
    ['Lock manager','owns conflicting lock state','control']
  ],
  'Remote-call resilience':[
    ['Mobile client','starts a bounded request','client'],
    ['API gateway','propagates deadline and identity','gateway'],
    ['Application service','applies resilience policy','service'],
    ['Dependency A','handles the primary call','service'],
    ['Dependency B','offers an independent path','service'],
    ['Dependency telemetry','feeds latency and failure data','control']
  ],
  'Overload and isolation':[
    ['Client fleet','generates variable demand','client'],
    ['Admission gateway','enforces rate and priority','gateway'],
    ['Bounded work queue','caps waiting operations','queue'],
    ['Application workers','consume admitted work','worker'],
    ['Downstream service','provides finite capacity','service'],
    ['Capacity controller','adjusts permits and limits','control']
  ],
  'Failure policy and domains':[
    ['External client','calls a regional endpoint','client'],
    ['Global gateway','routes around failed domains','gateway'],
    ['Service cell A','serves one bounded population','service'],
    ['Service cell B','serves an independent population','service'],
    ['Health controller','publishes domain health','control'],
    ['Durable data tier','survives cell replacement','storage']
  ]
};
const systemDesignActorPatterns = [
  [[0,1],[1,2],[1,3],[2,4],[3,4],[4,5]],
  [[0,1],[1,2],[1,3],[2,5],[3,5],[5,4],[4,1]],
  [[0,1],[1,2],[2,3],[2,4],[3,5],[4,5],[5,1]],
  [[0,1],[1,2],[1,4],[2,3],[3,5],[4,5],[5,2]],
  [[0,1],[1,3],[1,4],[3,2],[4,2],[2,5],[5,1]],
  [[0,1],[1,2],[2,4],[1,3],[3,4],[4,5],[5,0]],
  [[0,2],[0,1],[1,3],[2,4],[3,5],[4,5],[5,1]],
  [[0,1],[1,4],[4,2],[4,3],[2,5],[3,5],[5,4]],
  [[0,1],[1,2],[2,5],[1,3],[3,5],[5,4],[4,2]],
  [[0,1],[1,5],[5,2],[5,3],[2,4],[3,4],[4,1]],
  [[0,2],[2,1],[1,3],[1,4],[3,5],[4,5],[5,2]],
  [[0,1],[1,2],[2,3],[3,5],[1,4],[4,5],[5,0]],
  [[0,1],[1,2],[1,3],[2,4],[4,5],[5,3],[3,1]],
  [[0,1],[1,2],[2,5],[5,3],[3,4],[4,1],[2,4]],
  [[0,2],[2,1],[1,4],[4,3],[3,5],[5,2],[1,5]],
  [[0,1],[1,3],[3,2],[2,5],[1,4],[4,5],[5,3]],
  [[0,2],[0,1],[2,3],[1,4],[3,5],[4,5],[5,0]],
  [[0,1],[1,4],[4,2],[2,3],[3,5],[5,1],[4,5]]
];
const systemDesignActorLayouts = [
  [[14,50],[32,50],[56,18],[56,82],[78,32],[86,72]],
  [[14,28],[14,72],[42,50],[66,18],[66,82],[86,50]],
  [[14,50],[38,20],[38,80],[66,20],[66,80],[86,50]],
  [[14,18],[14,82],[44,50],[70,16],[70,50],[70,84]]
];
const systemDesignActorLink = (source,target) => {
  const targetName = systemDesignCompactEndpointLabel(target);
  if (target[3] === 'gateway') return `route request through ${targetName}`;
  if (target[3] === 'database') return `commit data to ${targetName}`;
  if (target[3] === 'storage') return `append record to ${targetName}`;
  if (target[3] === 'replica') return `replicate update to ${targetName}`;
  if (target[3] === 'queue') return `publish work to ${targetName}`;
  if (target[3] === 'worker') return `dispatch work to ${targetName}`;
  if (target[3] === 'cache') return `read or update ${targetName}`;
  if (target[3] === 'index') return `look up ownership in ${targetName}`;
  if (target[3] === 'control') return `report control data to ${targetName}`;
  if (target[3] === 'client') return `return response to ${targetName}`;
  return `call ${targetName}`;
};
const systemDesignBuildActorDiagram = (concept,groupTitle,ordinal) => {
  const blueprint = systemDesignActorBlueprints[groupTitle];
  const pattern = systemDesignActorPatterns[ordinal % systemDesignActorPatterns.length];
  const layout = systemDesignActorLayouts[Math.floor(ordinal / systemDesignActorPatterns.length) % systemDesignActorLayouts.length];
  const components = blueprint.map(([label,detail,type],index) => [
    `a${index}`,label,`${concept.name}: ${detail}`,type,layout[index][0],layout[index][1]
  ]);
  const links = pattern.map(([from,to]) => [
    `a${from}`,`a${to}`,systemDesignActorLink(components[from],components[to])
  ]);
  const frames = concept.visual.steps.map((step,index) => {
    const linkIndex = index % links.length;
    const [fromId,toId] = links[linkIndex];
    const states = {[fromId]:'active',[toId]:'active'};
    for (let prior=0;prior<index;prior++) {
      const [priorFrom,priorTo] = links[prior % links.length];
      if (!(priorFrom in states)) states[priorFrom] = 'done';
      if (!(priorTo in states)) states[priorTo] = 'done';
    }
    return [linkIndex,states];
  });
  return {kind:concept.diagram.kind,components,links,frames};
};

let systemDesignGeneratedOrdinal = 0;
for (const chapter of window.SYSTEM_DESIGN_CHAPTERS) {
  for (const group of chapter.groups) {
    for (const concept of group.concepts) {
      if (!systemDesignExplicitDiagrams.has(concept.name) &&
          ['architecture','topology','sequence'].includes(concept.diagram.kind)) {
        concept.diagram = systemDesignBuildActorDiagram(concept,group.title,systemDesignGeneratedOrdinal++);
      }
    }

  }
}

const systemDesignConcreteLabelOverrides = {
  PACELC:{Request:'Replicated API call'},
  'Time and clocks':{Operation:'Timed service call'},
  'Fail-open':{Request:'Protected API call'},
  'Fail-closed':{Request:'Protected API call'}
};
for (const chapter of window.SYSTEM_DESIGN_CHAPTERS) {
  for (const group of chapter.groups) {
    for (const concept of group.concepts) {
      const replacements = systemDesignConcreteLabelOverrides[concept.name];
      if (!replacements) continue;
      for (const component of concept.diagram.components) {
        component[1] = replacements[component[1]] || component[1];
      }
    }
  }
}
