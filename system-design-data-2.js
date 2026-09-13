window.SYSTEM_DESIGN_CHAPTERS = [...(window.SYSTEM_DESIGN_CHAPTERS || []),
  {
    id:'resilience-patterns',
    title:'Resilience Patterns',
    intro:'Resilience patterns define how systems detect, contain, survive, and recover from failures.',
    groups:[
      {title:'Redundancy modes', concepts:[
        {name:'Active-active', summary:'Multiple sites serve traffic concurrently, providing capacity and rapid failover.', tradeoff:'Requires conflict handling, traffic steering, and enough spare capacity.'},
        {name:'Active-passive', summary:'One site serves while a passive site waits to take over.', tradeoff:'Simpler consistency, but standby capacity is underused and failover is slower.'},
        {name:'Hot standby', summary:'A fully synchronized standby is ready to serve immediately.', tradeoff:'Lowest recovery time at nearly full duplicate cost.'},
        {name:'Warm standby', summary:'A partially provisioned, continuously updated standby scales up during recovery.', tradeoff:'Balances cost and recovery time but needs reliable automation.'},
        {name:'Cold standby', summary:'Infrastructure or data is restored only after a failure.', tradeoff:'Cheapest standby with the longest recovery time and highest restore risk.'}
      ]},
      {title:'Detection and failover', concepts:[
        {name:'Leader failover', summary:'A new leader is elected or promoted when the current leader becomes unavailable.', tradeoff:'Election pauses progress and stale leaders require fencing.'},
        {name:'Automatic failover', summary:'Automation redirects service after health and safety conditions are met.', tradeoff:'Bad detection can trigger unnecessary failover or split brain.'},
        {name:'Health checking', summary:'Synthetic or dependency-aware probes determine whether an instance can safely receive traffic.', tradeoff:'Shallow checks miss failures; deep checks can amplify dependency outages.'},
        {name:'Heartbeats', summary:'Components periodically signal liveness so missed signals can trigger suspicion.', tradeoff:'Intervals trade detection speed against traffic and false positives.'},
        {name:'Failure detection', summary:'A detector infers failed or unreachable members from timeouts, heartbeats, and quorum evidence.', tradeoff:'In asynchronous networks, failure cannot be distinguished perfectly from delay.'}
      ]},
      {title:'Recovery objectives', concepts:[
        {name:'Disaster recovery', summary:'Disaster recovery restores service after region-scale or correlated loss using tested people, data, and infrastructure procedures.', tradeoff:'Cross-region readiness adds cost and operational complexity.'},
        {name:'RPO', summary:'Recovery Point Objective is the maximum acceptable amount of data loss measured in time.', tradeoff:'Lower RPO requires more frequent or synchronous replication.'},
        {name:'RTO', summary:'Recovery Time Objective is the maximum acceptable time to restore service.', tradeoff:'Lower RTO requires pre-provisioning, automation, and frequent drills.'},
        {name:'Backup/restore', summary:'Backups create independent recoverable copies; restore procedures prove they are usable.', tradeoff:'Backup success is meaningless without restore testing and retention controls.'},
        {name:'Point-in-time recovery', summary:'Point-in-time recovery replays logs from a base backup to a chosen moment before corruption or error.', tradeoff:'Needs complete ordered logs and can take substantial replay time.'}
      ]},
      {title:'Resilience validation', concepts:[
        {name:'Chaos engineering', summary:'Controlled experiments test whether the system preserves stated invariants during realistic failures.', tradeoff:'Experiments need blast-radius controls, observability, and abort conditions.'},
        {name:'Fault injection', summary:'Fault injection deliberately introduces latency, errors, loss, or resource exhaustion at a chosen boundary.', tradeoff:'Unrepresentative faults create false confidence; uncontrolled faults cause harm.'}
      ]}
    ]
  },
  {
    id:'rate-limiting-traffic-management',
    title:'Rate Limiting & Traffic Management',
    intro:'Traffic management meters demand, preserves fairness, and protects finite downstream capacity.',
    groups:[
      {title:'Rate algorithms', concepts:[
        {name:'Token bucket', summary:'Tokens refill at a fixed rate and each admitted request consumes one, allowing bounded bursts.', tradeoff:'Distributed buckets need coordinated or approximate state.'},
        {name:'Leaky bucket', summary:'Queued work drains at a steady rate, smoothing bursts into predictable output.', tradeoff:'Queues add latency and overflow still requires rejection.'},
        {name:'Fixed window', summary:'Requests are counted in discrete time windows and rejected after the limit.', tradeoff:'Boundary bursts can allow nearly twice the intended rate.'},
        {name:'Sliding window', summary:'A rolling log counts requests in the exact preceding interval.', tradeoff:'Accurate but expensive in memory and per-request operations.'},
        {name:'Sliding window counter', summary:'Adjacent fixed-window counters are weighted to approximate a rolling window.', tradeoff:'Cheaper than logs but only approximate near boundaries.'}
      ]},
      {title:'Distributed scope', concepts:[
        {name:'Distributed rate limiting', summary:'Limiter state is shared or partitioned across service instances to enforce one policy.', tradeoff:'Coordination raises latency; local approximation can overshoot.'},
        {name:'Global rate limiting', summary:'A global limiter caps aggregate traffic across regions or clusters.', tradeoff:'Strong global precision conflicts with low latency and partition availability.'},
        {name:'Per-user limits', summary:'Usage is metered by authenticated user to contain abuse and ensure fairness.', tradeoff:'Identity fan-out and shared accounts complicate policy.'},
        {name:'Per-tenant limits', summary:'A tenant receives an aggregate budget across its users and workloads.', tradeoff:'Large tenants may need internal fairness and burst allowances.'},
        {name:'Per-IP limits', summary:'Traffic is limited by source IP when stronger identity is absent or as an abuse signal.', tradeoff:'NAT penalizes many users together and attackers can rotate addresses.'},
        {name:'Hierarchical rate limiting', summary:'A request must satisfy nested budgets such as global, tenant, user, and endpoint limits.', tradeoff:'Multiple checks add state and can strand unused capacity at lower levels.'}
      ]},
      {title:'Adaptive overload control', concepts:[
        {name:'Adaptive rate limiting', summary:'Limits change from observed latency, errors, saturation, or downstream capacity.', tradeoff:'Unstable feedback loops can oscillate or overreact to noise.'},
        {name:'Concurrency limiting', summary:'A cap on in-flight work bounds simultaneous pressure independently of request rate.', tradeoff:'A fixed cap underuses fast paths and overloads slow ones unless adaptive.'},
        {name:'Load shedding', summary:'Low-value or excess work is rejected before saturation to protect useful traffic.', tradeoff:'Requires explicit priorities and a truthful rejection contract.'},
        {name:'Fair queuing', summary:'Separate flows receive turns so one source cannot monopolize service capacity.', tradeoff:'Flow classification and queue management add overhead.'},
        {name:'Weighted fair queuing', summary:'Flows receive service proportional to configured weights while retaining isolation.', tradeoff:'Weights encode policy and can starve low-weight traffic if misconfigured.'}
      ]}
    ]
  },
  {
    id:'distributed-scheduling',
    title:'Distributed Scheduling',
    intro:'Distributed schedulers assign durable work across workers while preserving ownership and recovery semantics.',
    groups:[
      {title:'Scheduler architecture', concepts:[
        {name:'Distributed job scheduler', summary:'A distributed job scheduler persists jobs, assigns runnable work, and recovers assignments after failures.', tradeoff:'Coordination and durable state become control-plane bottlenecks.'},
        {name:'Leader-based scheduling', summary:'One elected leader makes placement decisions for a scheduling epoch.', tradeoff:'Simple ordering but leader failure pauses decisions and requires fencing.'},
        {name:'Work stealing', summary:'Idle workers pull tasks from busier workers or partitions to rebalance execution.', tradeoff:'Stealing adds coordination and can hurt data locality.'},
        {name:'Task queues', summary:'Durable queues decouple task submission from worker execution and support retries.', tradeoff:'Delivery is commonly at least once, so effects must tolerate duplicates.'},
        {name:'Priority scheduling', summary:'Runnable work is ordered by business priority, deadline, or resource class.', tradeoff:'Strict priority can starve lower classes without aging or quotas.'}
      ]},
      {title:'Timing and retry', concepts:[
        {name:'Delayed execution', summary:'Tasks remain durable but ineligible until a specified time or condition.', tradeoff:'Clock skew and large timer sets complicate precise wake-up.'},
        {name:'Retry scheduling', summary:'Failed tasks are rescheduled with bounded attempts, backoff, jitter, and error classification.', tradeoff:'Retries amplify persistent failures and delay poison-task handling.'},
        {name:'Cron/distributed cron', summary:'Recurring schedules are materialized once per interval despite replicated scheduler instances.', tradeoff:'Missed ticks, duplicate triggers, time zones, and clock changes need policy.'}
      ]},
      {title:'Ownership and scale', concepts:[
        {name:'Lease-based workers', summary:'Workers hold expiring leases for tasks and renew them while making progress.', tradeoff:'Expired owners may still act, so protected writes need fencing or idempotency.'},
        {name:'Heartbeat-based ownership', summary:'Periodic progress signals keep ownership alive and expose abandoned tasks for reassignment.', tradeoff:'Detection speed trades against heartbeat load and false expiry.'},
        {name:'Sharded schedulers', summary:'Schedulers own disjoint job shards so decision throughput scales horizontally.', tradeoff:'Shard movement and hot shards complicate balancing and failover.'},
        {name:'Scheduler partitioning', summary:'Jobs are mapped to scheduler partitions by tenant, key, or workflow locality.', tradeoff:'The partition key determines skew and cross-partition coordination cost.'}
      ]},
      {title:'Execution semantics', concepts:[
        {name:'Exactly-once job execution', summary:'One logical outcome is achieved through transactional claims or deduplicated side effects despite retries.', tradeoff:'End-to-end exactly once is costly and often impossible across external systems.'},
        {name:'Idempotent jobs', summary:'Repeated execution with the same job identity produces the same logical result.', tradeoff:'Deduplication state and non-idempotent downstream effects still need handling.'},
        {name:'Workflow engines', summary:'Workflow engines persist multi-step state, dependencies, timers, retries, and compensation.', tradeoff:'Durability simplifies recovery but couples applications to workflow semantics.'}
      ]}
    ]
  },
  {
    id:'storage-systems',
    title:'Storage Systems',
    intro:'Storage engines organize durable bytes to balance read, write, space, locality, and recovery costs.',
    groups:[
      {title:'Core structures', concepts:[
        {name:'LSM trees', summary:'LSM trees buffer sorted writes in memory and flush immutable runs that are merged later.', tradeoff:'Fast writes trade for read, space, and compaction amplification.'},
        {name:'B-trees', summary:'B-trees keep sorted keys in balanced, page-sized nodes for logarithmic reads and updates.', tradeoff:'Random in-place writes and page splits can limit write throughput.'},
        {name:'SSTables', summary:'SSTables are immutable sorted key-value files with indexes and metadata for efficient range access.', tradeoff:'Reads may consult multiple files until compaction consolidates them.'},
        {name:'Write-ahead logs', summary:'A write-ahead log durably records mutations before mutable state is acknowledged.', tradeoff:'Log sync adds latency and replay time grows without checkpoints.'},
        {name:'Memtables', summary:'Memtables hold recent sorted writes in memory before immutable flush.', tradeoff:'Memory is bounded, and unflushed data relies on the write-ahead log.'},
        {name:'Compaction', summary:'Compaction merges sorted files, removes obsolete versions, and restores storage-level invariants.', tradeoff:'Consumes I/O and CPU and can create latency spikes.'},
        {name:'Bloom filters', summary:'A Bloom filter probabilistically proves many keys are absent without reading storage.', tradeoff:'False positives remain and filters consume memory; false negatives are forbidden.'}
      ]},
      {title:'Indexes', concepts:[
        {name:'Indexing', summary:'Indexing builds auxiliary structures that map query keys to records or storage locations.', tradeoff:'Improves reads while adding storage, write amplification, and freshness lag.'},
        {name:'Secondary indexes', summary:'Secondary indexes support lookup by non-primary attributes.', tradeoff:'Distributed maintenance and uniqueness require coordination or eventual repair.'},
        {name:'Inverted indexes', summary:'Inverted indexes map terms or features to postings lists of matching documents.', tradeoff:'Text analysis and updates add substantial storage and write cost.'},
        {name:'Sparse indexes', summary:'Sparse indexes store entries for selected block boundaries rather than every row.', tradeoff:'Compact and cache-friendly but require scanning within the located block.'},
        {name:'Covering indexes', summary:'A covering index contains every field needed by a query, avoiding base-record reads.', tradeoff:'Larger indexes increase write and storage costs.'},
        {name:'Partition indexes', summary:'Partition indexes map partition keys or ranges to physical owners and locations.', tradeoff:'Rebalancing requires versioned routing and careful cutover.'}
      ]},
      {title:'Physical layouts', concepts:[
        {name:'Columnar storage', summary:'Columnar storage keeps values by column, enabling compression and scans over selected fields.', tradeoff:'Point updates and full-row reconstruction are comparatively expensive.'},
        {name:'Row-oriented storage', summary:'Row-oriented storage co-locates all fields of a record for efficient point reads and writes.', tradeoff:'Analytical scans read unnecessary columns and compress less effectively.'},
        {name:'Log-structured storage', summary:'Log-structured storage appends new versions sequentially and reorganizes data asynchronously.', tradeoff:'Requires garbage collection or compaction and indirect reads.'}
      ]},
      {title:'Storage services', concepts:[
        {name:'Object storage', summary:'Object storage addresses whole blobs by key with metadata and massive namespace scale.', tradeoff:'Higher latency and whole-object operations make random mutation inefficient.'},
        {name:'Block storage', summary:'Block storage exposes low-level fixed-size blocks for filesystems and databases.', tradeoff:'Shared access and higher-level consistency must be built above it.'},
        {name:'Distributed filesystems', summary:'Distributed filesystems provide shared file semantics across replicated storage nodes.', tradeoff:'Metadata coordination, small files, and cross-node consistency can bottleneck scale.'}
      ]}
    ]
  },
  {
    id:'database-distributed-system-concepts',
    title:'Database Distributed-System Concepts',
    intro:'Distributed databases coordinate data placement, replication, consistency, and online evolution.',
    groups:[
      {title:'Topology and placement', concepts:[
        {name:'Primary/replica', summary:'One primary orders writes while replicas copy its log and often serve reads.', tradeoff:'Primary failure needs promotion; asynchronous replicas can lag or lose acknowledged writes.'},
        {name:'Leaderless databases', summary:'Clients coordinate reads and writes across replicas without one permanent write leader.', tradeoff:'Conflict resolution, repair, and quorum semantics become client-visible complexity.'},
        {name:'Distributed SQL', summary:'Distributed SQL combines relational queries and transactions with partitioned, replicated storage.', tradeoff:'Cross-shard coordination raises latency and query planning complexity.'},
        {name:'Distributed transactions', summary:'Distributed transactions coordinate one atomic outcome across multiple resources or shards.', tradeoff:'Commit protocols add latency, coupling, and failure recovery states.'},
        {name:'Sharding', summary:'Sharding partitions records across nodes by key or range to scale storage and throughput.', tradeoff:'Hot keys and cross-shard operations can dominate performance.'},
        {name:'Replication', summary:'Replication maintains multiple copies for durability, availability, and read locality.', tradeoff:'Copy synchronization trades write latency against staleness and failover loss.'},
        {name:'Consistent hashing', summary:'Consistent hashing maps keys to owners while minimizing movement when membership changes.', tradeoff:'It loses range locality and still needs virtual nodes or weighting for balance.'}
      ]},
      {title:'Consistency and skew', concepts:[
        {name:'Quorum', summary:'A quorum is an intersecting subset of replicas used to make or observe authoritative decisions.', tradeoff:'Larger quorums improve overlap but increase latency and reduce availability.'},
        {name:'Read/write consistency', summary:'Read and write consistency levels define how many replicas participate and what versions may be observed.', tradeoff:'Stronger levels require more coordination and tolerate fewer failures.'},
        {name:'Hot partitions', summary:'Hot partitions receive disproportionate traffic or data and cap system throughput at one shard.', tradeoff:'Salting or splitting improves balance but complicates queries and ordering.'},
        {name:'Read-after-write consistency', summary:'A client is guaranteed to observe its completed write on subsequent reads.', tradeoff:'Requires session routing, version tokens, or waiting for replica catch-up.'}
      ]},
      {title:'Distributed indexes', concepts:[
        {name:'Secondary indexes', summary:'Secondary indexes map non-primary attributes to records across partitioned data.', tradeoff:'Updates can be asynchronous and multi-shard queries require fan-out.'},
        {name:'Global indexes', summary:'A global index spans all data partitions and routes an indexed lookup directly to matching records.', tradeoff:'Central or repartitioned maintenance creates coordination and availability costs.'},
        {name:'Local indexes', summary:'A local index covers only data in its owning shard and is updated with that shard.', tradeoff:'Cheap local maintenance but global queries must fan out to every shard.'}
      ]},
      {title:'Online change', concepts:[
        {name:'Online schema migration', summary:'Schema changes roll out through backward-compatible expand, migrate, and contract phases while traffic continues.', tradeoff:'Mixed-version operation extends complexity and cleanup time.'},
        {name:'Online reindexing', summary:'A replacement index is built beside the live index, caught up, validated, and atomically switched.', tradeoff:'Temporarily doubles storage and write work.'},
        {name:'Backfills', summary:'Backfills populate new fields, indexes, or derived data from historical records in bounded batches.', tradeoff:'Can overload production and race with concurrent writes.'},
        {name:'Dual writes', summary:'Dual writes send one logical change to two representations during migration.', tradeoff:'Without atomicity or reconciliation, partial success causes divergence.'}
      ]}
    ]
  },
  {
    id:'streaming-real-time-processing',
    title:'Streaming & Real-Time Processing',
    intro:'Streaming systems process unbounded, reordered event flows with explicit time, state, and recovery semantics.',
    groups:[
      {title:'Core processing', concepts:[
        {name:'Stream processing', summary:'Stream processing continuously transforms unbounded event sequences as records arrive.', tradeoff:'Low latency requires managing ordering, state, and recovery continuously.'},
        {name:'Windowing', summary:'Windowing bounds an unending stream into finite groups for computation.', tradeoff:'Window choice controls latency, completeness, and retained state.'},
        {name:'Tumbling windows', summary:'Tumbling windows divide time into adjacent non-overlapping intervals.', tradeoff:'Simple and efficient but events near boundaries are separated.'},
        {name:'Sliding windows', summary:'Sliding windows overlap and emit results at a configured slide interval.', tradeoff:'Overlap increases state and repeated computation.'},
        {name:'Session windows', summary:'Session windows group activity separated by less than an inactivity gap.', tradeoff:'Window boundaries can change when late events bridge sessions.'}
      ]},
      {title:'Event time', concepts:[
        {name:'Watermarks', summary:'Watermarks estimate how complete event-time progress is across input partitions.', tradeoff:'Aggressive watermarks drop or revise more late data; conservative ones delay output.'},
        {name:'Event time vs processing time', summary:'Event time describes when an event occurred; processing time describes when the system handled it.', tradeoff:'Event time is reproducible but needs timestamps, watermarks, and late-data policy.'},
        {name:'Late events', summary:'Late events arrive after the system has emitted or finalized their intended result window.', tradeoff:'Updating results improves accuracy but complicates downstream consumers.'},
        {name:'Out-of-order events', summary:'Out-of-order events arrive in a sequence different from their logical or event-time order.', tradeoff:'Reordering requires buffers, versioning, or commutative operations.'},
        {name:'Event-time processing', summary:'Event-time processing computes results from event timestamps rather than arrival time.', tradeoff:'More accurate under delay but increases state and finalization latency.'}
      ]},
      {title:'State and guarantees', concepts:[
        {name:'Stateful stream processing', summary:'Operators retain keyed state across events for aggregates, joins, and patterns.', tradeoff:'State growth, redistribution, and recovery become first-class concerns.'},
        {name:'Checkpointing', summary:'Checkpointing persists operator state and source progress so processing can resume consistently.', tradeoff:'Frequent checkpoints add I/O; infrequent ones increase recovery work.'},
        {name:'Exactly-once processing', summary:'State and input progress commit consistently so replay does not change one logical result.', tradeoff:'External side effects still require transactional or idempotent sinks.'},
        {name:'Deduplication', summary:'Deduplication suppresses repeated events using stable identities and retained seen-state.', tradeoff:'Retention bounds mean very late duplicates may escape detection.'},
        {name:'Backpressure', summary:'Backpressure slows producers or upstream operators when downstream capacity is exhausted.', tradeoff:'Prevents collapse but increases latency and can propagate across the pipeline.'},
        {name:'Replay', summary:'Replay reprocesses retained events to recover, rebuild state, or apply new logic.', tradeoff:'Requires deterministic logic, versioned schemas, and controlled downstream effects.'}
      ]},
      {title:'Streaming operations', concepts:[
        {name:'Stream joins', summary:'Stream joins correlate records from multiple streams within keys and time bounds.', tradeoff:'Unbounded joins require unbounded state; late data affects completeness.'},
        {name:'Stream aggregation', summary:'Stream aggregation incrementally updates summaries as events arrive.', tradeoff:'Non-associative operations and corrections complicate parallel execution.'},
        {name:'Windowed aggregation', summary:'Windowed aggregation computes summaries for bounded event-time or processing-time windows.', tradeoff:'Results depend on watermark and late-event policy.'},
        {name:'CEP / Complex Event Processing', summary:'Complex Event Processing detects temporal patterns across sequences of related events.', tradeoff:'Pattern state can grow rapidly and overlapping matches are hard to reason about.'}
      ]}
    ]
  },
  {
    id:'distributed-data-processing',
    title:'Distributed Data Processing',
    intro:'Distributed processing divides large datasets into parallel stages while controlling movement, skew, and recovery.',
    groups:[
      {title:'Batch model', concepts:[
        {name:'MapReduce', summary:'Map transforms partitions independently and reduce combines values grouped by key.', tradeoff:'Robust stage boundaries incur materialization and shuffle overhead.'},
        {name:'Shuffle', summary:'Shuffle repartitions intermediate records across workers by key.', tradeoff:'Often dominates network, disk, and serialization cost.'},
        {name:'Partitioning', summary:'Partitioning assigns records to parallel tasks by key, range, or input split.', tradeoff:'Poor keys create skew and expensive cross-partition work.'},
        {name:'Distributed aggregation', summary:'Distributed aggregation combines partial summaries from many partitions into a final result.', tradeoff:'Correct parallelization requires associative, mergeable state or extra coordination.'},
        {name:'Combiners', summary:'Combiners perform local partial reduction before shuffle to reduce transferred data.', tradeoff:'Safe only for operations whose partial results can be merged correctly.'},
        {name:'Map-side aggregation', summary:'Map-side aggregation pre-aggregates records within an input task before repartitioning.', tradeoff:'Uses mapper memory and helps little when local keys are unique.'},
        {name:'Reduce-side aggregation', summary:'Reduce-side aggregation combines all values for a key after shuffle.', tradeoff:'Complete grouping is flexible but pays full network movement.'}
      ]},
      {title:'Distributed joins', concepts:[
        {name:'Distributed joins', summary:'Distributed joins correlate partitioned datasets by moving or co-locating matching keys.', tradeoff:'Data movement, skew, and intermediate size dominate cost.'},
        {name:'Broadcast joins', summary:'A small relation is copied to every worker so the large relation stays local.', tradeoff:'Fails when the broadcast side exceeds worker memory or network budget.'},
        {name:'Hash joins', summary:'Inputs are partitioned or indexed by join-key hash and matching buckets are compared.', tradeoff:'Skew causes oversized buckets and spills.'},
        {name:'Sort-merge joins', summary:'Both inputs are sorted by key and scanned together to produce matches.', tradeoff:'Sorting is expensive but supports large inputs and range ordering.'}
      ]},
      {title:'Placement and tails', concepts:[
        {name:'Data locality', summary:'Tasks run near their input blocks to reduce network transfer and improve throughput.', tradeoff:'Waiting for locality can delay scheduling and reduce utilization.'},
        {name:'Skew handling', summary:'Skew handling detects heavy keys or partitions and splits, salts, or isolates their work.', tradeoff:'Extra stages and merge logic complicate execution.'},
        {name:'Stragglers', summary:'Stragglers are unusually slow tasks that determine a stage completion tail.', tradeoff:'Root causes vary across skew, contention, hardware, and retries.'},
        {name:'Speculative execution', summary:'Duplicate copies of slow tasks race and the first valid result wins.', tradeoff:'Consumes extra capacity and does not fix shared bottlenecks.'},
        {name:'Checkpointing', summary:'Checkpointing persists intermediate state or progress to limit recomputation after failure.', tradeoff:'Storage and coordination overhead trade against recovery speed.'}
      ]}
    ]
  },
  {
    id:'search-retrieval',
    title:'Search & Retrieval',
    intro:'Search systems build distributed lexical and vector indexes, retrieve candidates, and rank them within a latency budget.',
    groups:[
      {title:'Lexical retrieval', concepts:[
        {name:'Inverted index', summary:'An inverted index maps each term to postings for documents containing it.', tradeoff:'Fast retrieval costs storage, analysis complexity, and update amplification.'},
        {name:'Forward index', summary:'A forward index maps each document to its terms or features.', tradeoff:'Useful for document processing but inefficient for corpus-wide term lookup.'},
        {name:'TF-IDF', summary:'TF-IDF weights terms by frequency within a document and rarity across the corpus.', tradeoff:'Simple and interpretable but weak on term saturation and document length.'},
        {name:'BM25', summary:'BM25 ranks lexical matches using saturated term frequency, inverse document frequency, and length normalization.', tradeoff:'Requires tuning and cannot directly capture semantic similarity.'}
      ]},
      {title:'Distributed query path', concepts:[
        {name:'Sharded search', summary:'The corpus index is partitioned across shards so storage and query work scale horizontally.', tradeoff:'Global relevance and top results require cross-shard merging.'},
        {name:'Scatter-gather search', summary:'A coordinator scatters a query to shards and gathers partial top results.', tradeoff:'Fan-out amplifies tail latency and partial failures.'},
        {name:'Query fan-out', summary:'One logical query expands into requests to multiple index partitions or services.', tradeoff:'More fan-out improves coverage but multiplies cost and failure probability.'},
        {name:'Query routing', summary:'Query routing selects only shards or replicas likely to contain relevant results.', tradeoff:'Routing metadata can be stale and mistaken pruning reduces recall.'},
        {name:'Search index replication', summary:'Index replicas serve queries and provide availability while ingest keeps versions convergent.', tradeoff:'Replication increases storage and may expose stale index versions.'}
      ]},
      {title:'Index lifecycle', concepts:[
        {name:'Index building', summary:'Index building analyzes source documents and creates searchable postings, features, and segments.', tradeoff:'Full builds consume substantial compute, storage, and cutover coordination.'},
        {name:'Incremental indexing', summary:'Incremental indexing applies document changes without rebuilding the full index.', tradeoff:'Frequent small segments need merging and deletion handling.'},
        {name:'Near-real-time indexing', summary:'Near-real-time indexing exposes recent updates after a short refresh interval.', tradeoff:'Faster refresh increases segment churn and query overhead.'}
      ]},
      {title:'Ranking and top results', concepts:[
        {name:'Ranking', summary:'Ranking scores candidates using lexical, semantic, quality, freshness, and business signals.', tradeoff:'Better models add latency, opacity, and feedback-loop risk.'},
        {name:'Top-K retrieval', summary:'Top-K retrieval finds only the highest-scoring K candidates without fully sorting all matches.', tradeoff:'Distributed merging needs shard over-fetch to preserve global quality.'}
      ]},
      {title:'Vector retrieval', concepts:[
        {name:'Approximate nearest neighbor (ANN)', summary:'ANN searches vector space for close candidates while avoiding an exhaustive scan.', tradeoff:'Trades recall and determinism for latency and memory efficiency.'},
        {name:'HNSW', summary:'HNSW uses a layered navigable proximity graph for high-recall vector search.', tradeoff:'Strong query performance requires substantial memory and expensive updates.'},
        {name:'IVF', summary:'IVF clusters vectors into coarse cells and searches only selected cells at query time.', tradeoff:'Probe count trades latency for recall, and cluster imbalance hurts performance.'},
        {name:'Vector indexes', summary:'Vector indexes organize embeddings for similarity retrieval using exact or approximate structures.', tradeoff:'Embedding drift, filtering, memory, and rebuild cost complicate operation.'}
      ]}
    ]
  },
  {
    id:'distributed-algorithms',
    title:'Distributed Algorithms',
    intro:'Distributed algorithms provide traversal, optimization, coordination, and aggregation primitives at scale.',
    groups:[
      {title:'Graph traversal and paths', concepts:[
        {name:'BFS / DFS', summary:'BFS explores by distance layers while DFS follows a path before backtracking.', tradeoff:'BFS uses more frontier memory; DFS lacks shortest-path guarantees.'},
        {name:'Dijkstra', summary:'Dijkstra finds shortest paths from a source when edge weights are nonnegative.', tradeoff:'Priority-queue coordination is costly to parallelize and negative edges are unsupported.'},
        {name:'Bellman-Ford', summary:'Bellman-Ford repeatedly relaxes edges and supports negative weights while detecting negative cycles.', tradeoff:'More general but much slower than Dijkstra on large graphs.'}
      ]},
      {title:'Trees and ordering', concepts:[
        {name:'Minimum spanning tree', summary:'A minimum spanning tree connects all vertices with minimum total edge weight and no cycles.', tradeoff:'Models connectivity cost, not shortest routes from a source.'},
        {name:'Kruskal', summary:'Kruskal adds edges in weight order when they connect different components.', tradeoff:'Requires global edge ordering but parallel component checks can help.'},
        {name:'Prim', summary:'Prim grows one tree by repeatedly adding the cheapest edge leaving it.', tradeoff:'Efficient on dense graphs but frontier coordination can bottleneck distribution.'},
        {name:'Topological sort', summary:'Topological sort orders a directed acyclic graph so every dependency precedes its dependents.', tradeoff:'Cycles make the ordering impossible and must be detected.'},
        {name:'Union-Find', summary:'Union-Find maintains disjoint sets with near-constant-time union and connectivity checks.', tradeoff:'Excellent for incremental merges but not deletions or rich component queries.'}
      ]},
      {title:'Coordination and dissemination', concepts:[
        {name:'Consistent hashing', summary:'Consistent hashing assigns keys to changing members while minimizing remapping.', tradeoff:'Needs balancing techniques and provides no range locality.'},
        {name:'Gossip', summary:'Gossip disseminates state through randomized peer exchanges until replicas converge.', tradeoff:'Convergence is probabilistic and duplicate traffic is expected.'},
        {name:'Leader election', summary:'Leader election chooses one authority for an epoch among distributed participants.', tradeoff:'Partitions and pauses require quorum rules and fencing of stale leaders.'},
        {name:'Distributed consensus', summary:'Distributed consensus lets a quorum agree on one value or ordered log despite crashes and delay.', tradeoff:'Adds coordination latency and stops making progress without quorum.'},
        {name:'Distributed snapshots', summary:'A distributed snapshot captures a causally consistent global state without stopping all participants.', tradeoff:'In-flight messages and channel recording add protocol and storage cost.'}
      ]},
      {title:'Parallel data algorithms', concepts:[
        {name:'Distributed sorting', summary:'Distributed sorting range-partitions records, sorts partitions locally, and combines ordered outputs.', tradeoff:'Sampling errors create skew and repartitioning requires heavy shuffle.'},
        {name:'Distributed aggregation', summary:'Distributed aggregation merges partition-local summaries into a global result.', tradeoff:'Efficient trees require associative state and careful duplicate handling.'}
      ]}
    ]
  }
];
