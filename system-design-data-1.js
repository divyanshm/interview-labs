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
