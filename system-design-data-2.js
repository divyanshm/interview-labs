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

window.applySystemDesignDiagrams2 = () => {
    const chapters = window.SYSTEM_DESIGN_CHAPTERS.slice(-9);
    const kindGroups = {
      comparison:new Set([
        'Active-active','Active-passive','Hot standby','Warm standby','Cold standby',
        'Event time vs processing time','Read/write consistency'
      ]),
      timeline:new Set([
        'Heartbeats','RPO','RTO','Point-in-time recovery','Fixed window','Sliding window',
        'Sliding window counter','Delayed execution','Retry scheduling','Cron/distributed cron',
        'Online schema migration','Online reindexing','Backfills','Windowing','Tumbling windows',
        'Sliding windows','Session windows','Late events','Out-of-order events',
        'Near-real-time indexing'
      ]),
      topology:new Set([
        'Active-active','Primary/replica','Leaderless databases','Sharding','Replication',
        'Consistent hashing','Quorum','Hot partitions','Global indexes','Local indexes',
        'Distributed rate limiting','Global rate limiting','Hierarchical rate limiting',
        'Sharded schedulers','Scheduler partitioning','Distributed filesystems',
        'Sharded search','Scatter-gather search','Query fan-out','Query routing',
        'Search index replication','Gossip','Leader election','Distributed consensus',
        'Distributed snapshots','Distributed sorting','Distributed aggregation'
      ]),
      structure:new Set([
        'LSM trees','B-trees','SSTables','Write-ahead logs','Memtables','Compaction',
        'Bloom filters','Indexing','Secondary indexes','Inverted indexes','Sparse indexes',
        'Covering indexes','Partition indexes','Columnar storage','Row-oriented storage',
        'Log-structured storage','Inverted index','Forward index','TF-IDF','BM25',
        'Top-K retrieval','Approximate nearest neighbor (ANN)','HNSW','IVF','Vector indexes',
        'BFS / DFS','Dijkstra','Bellman-Ford','Minimum spanning tree','Kruskal','Prim',
        'Topological sort','Union-Find'
      ])
    };
    const validTypes = new Set([
      'client','gateway','service','database','replica','cache','queue','worker',
      'control','storage','index','node','clock','bitset'
    ]);
    const positions = {
      architecture:[[8,24],[36,24],[64,24],[92,24],[22,72],[50,72],[78,72]],
      sequence:[[8,30],[29,70],[50,30],[71,70],[92,30],[50,88],[50,12]],
      timeline:[[8,50],[29,50],[50,50],[71,50],[92,50],[50,78],[50,22]],
      structure:[[50,8],[25,36],[75,36],[8,72],[36,72],[64,72],[92,72]],
      comparison:[[18,18],[82,18],[18,50],[82,50],[18,82],[82,82],[50,92]]
    };
    const topologyPositions = count => Array.from({length:count},(_,index)=>{
      const angle = -Math.PI / 2 + index * Math.PI * 2 / count;
      return [Math.round(50 + 40 * Math.cos(angle)),Math.round(50 + 40 * Math.sin(angle))];
    });
    const riskWords = /\b(fail|failure|unhealthy|reject|overflow|late|expired|disaster|corrupt|slow|stale|missed|negative cycle|overload|skew|straggler|split brain)\b/i;
    const componentType = (label,detail) => {
      const value = `${label} ${detail}`.toLowerCase();
      if (/\b(bloom|bit array|bitset)\b/.test(value)) return 'bitset';
      if (/\b(index|postings|dictionary|trie|heap|tree|union-find|hash table|graph layer|centroid)\b/.test(value)) return 'index';
      if (/\b(replica|standby|follower|primary|leader)\b/.test(value)) return 'replica';
      if (/\b(queue|shuffle|frontier|buffer|bucket)\b/.test(value)) return 'queue';
      if (/\b(wal|log|file|block|object|snapshot|backup|segment|sstable|vault|volume|chunk)\b/.test(value)) return 'storage';
      if (/\b(database|record|table|state backend|accumulator|deduplication store|job store|manifest)\b/.test(value)) return 'database';
      if (/\b(cache|cached)\b/.test(value)) return 'cache';
      if (/\b(worker|mapper|reducer|operator|task|combiner|activity)\b/.test(value)) return 'worker';
      if (/\b(clock|timer|time|watermark|deadline|window boundary|schedule)\b/.test(value)) return 'clock';
      if (/\b(router|gateway|load balancer|traffic director|coordinator|frontend)\b/.test(value)) return 'gateway';
      if (/\b(client|user|request|query|producer|source event|incoming burst)\b/.test(value)) return 'client';
      if (/\b(controller|monitor|detector|policy|quorum|election|scheduler|admission|limiter|allocator)\b/.test(value)) return 'control';
      if (/\b(service|sink|processor|engine|pipeline)\b/.test(value)) return 'service';
      return 'node';
    };
    const conceptKind = concept => {
      for (const kind of ['comparison','timeline','structure','topology']) {
        if (kindGroups[kind].has(concept.name)) return kind;
      }
      if (/\b(execution|processing|transaction|failover|recovery|restore|replay|join|aggregation|scheduling)\b/i.test(concept.name)) return 'sequence';
      return 'architecture';
    };
    const makeComponents = (kind,visualNodes) => {
      const layout = kind === 'topology' ? topologyPositions(visualNodes.length) : positions[kind];
      return visualNodes.map(([label,detail],index)=>{
        const [x,y] = layout[index];
        return [`c${index}`,label,detail,componentType(label,detail),x,y];
      });
    };
    const linkLabel = (from,to) => {
      const source = `${from[1]} ${from[2]}`.toLowerCase();
      const target = `${to[1]} ${to[2]}`.toLowerCase();
      const path = `${source} ${target}`;
      if (/\b(reject|overflow|throttle response)\b/.test(target)) return 'reject excess traffic';
      if (/\b(late event|late update|late path)\b/.test(target)) return 'apply late event policy';
      if (/\b(failover|promotion|promote|new leader)\b/.test(target)) return 'promote new owner';
      if (/\b(failure|unhealthy|suspected|missed deadline|disaster)\b/.test(target)) return 'report failure';
      if (/\b(health|heartbeat|probe)\b/.test(target)) return 'health probe';
      if (/\b(traffic|route|router|load balancer)\b/.test(target)) return 'publish route epoch';
      if (/\b(replica|standby|follower)\b/.test(target)) return 'replicate state';
      if (/\b(quorum|majority|vote|candidate|election)\b/.test(target)) return 'collect quorum';
      if (/\b(refill|tokens accumulate)\b/.test(target)) return 'refill tokens';
      if (/\b(token|bucket)\b/.test(target)) return 'consume token';
      if (/\b(admission|limit check|decision|throttl)\b/.test(target)) return 'admit or reject';
      if (/\b(retry)\b/.test(target)) return 'schedule retry';
      if (/\b(lease renewal|renew)\b/.test(target)) return 'renew lease';
      if (/\b(lease|claim|ownership)\b/.test(target)) return 'claim ownership';
      if (/\b(queue|enqueue|ready set|frontier)\b/.test(target)) return 'enqueue work';
      if (/\b(timer|clock|due instant|activation|window boundary)\b/.test(target)) return 'advance timer';
      if (/\b(watermark)\b/.test(target)) return 'advance watermark';
      if (/\b(window state|window aggregate|session state)\b/.test(target)) return 'update window state';
      if (/\b(checkpoint)\b/.test(target)) return 'commit checkpoint';
      if (/\b(write-ahead|wal|log record|durable append)\b/.test(target)) return 'append WAL';
      if (/\b(memtable)\b/.test(target)) return 'update memtable';
      if (/\b(sstable|flush)\b/.test(target)) return 'flush SSTable';
      if (/\b(compaction|merge iterator|merged run)\b/.test(target)) return 'compact sorted runs';
      if (/\b(bloom|membership test|bit array)\b/.test(target)) return 'test membership';
      if (/\b(index|postings|dictionary)\b/.test(target)) return 'update index';
      if (/\b(mapper|map task|map input)\b/.test(target)) return 'dispatch map task';
      if (/\b(shuffle)\b/.test(target)) return 'shuffle by key';
      if (/\b(reducer|reduce task|reduce function)\b/.test(target)) return 'dispatch reduce task';
      if (/\b(join)\b/.test(target)) return 'join matching keys';
      if (/\b(aggregate|accumulator|summary|combiner)\b/.test(target)) return 'merge partial aggregate';
      if (/\b(sort|ordered output)\b/.test(target)) return 'sort partition';
      if (/\b(relax|distance)\b/.test(target)) return 'relax edge';
      if (/\b(cycle)\b/.test(target)) return 'detect cycle';
      if (/\b(union|component)\b/.test(target)) return 'union components';
      if (/\b(embedding)\b/.test(target)) return 'compute embedding';
      if (/\b(vector|nearest)\b/.test(target)) return 'search vector index';
      if (/\b(rank|score|top k|top-k)\b/.test(target)) return 'rank candidates';
      if (/\b(candidate)\b/.test(target)) return 'retrieve candidates';
      if (/\b(sink|result|output|response)\b/.test(target)) return 'emit result';
      if (/\b(restore|recovery|recovered)\b/.test(target)) return 'restore service';
      if (/\b(validate|verification|integrity check)\b/.test(target)) return 'verify integrity';
      if (/\b(delete|cleanup|eviction|garbage collection)\b/.test(target)) return 'reclaim obsolete state';
      if (/\b(replication)\b/.test(path)) return 'replicate commit log';
      switch (to[3]) {
        case 'client': return 'deliver response';
        case 'gateway': return 'route request';
        case 'service': return 'invoke service';
        case 'database': return 'persist state';
        case 'replica': return 'replicate state';
        case 'cache': return 'update cache';
        case 'queue': return 'enqueue work';
        case 'worker': return 'dispatch work';
        case 'control': return 'publish control decision';
        case 'storage': return 'persist data';
        case 'index': return 'query index';
        case 'clock': return 'advance logical time';
        case 'bitset': return 'test membership';
        default: return 'advance computation';
      }
    };
    const makeLinks = (kind,components) => {
      if (kind === 'structure') {
        return components.slice(1).map((component,index)=>[
          components[Math.floor(index / 2)][0],component[0],
          linkLabel(components[Math.floor(index / 2)],component)
        ]);
      }
      if (kind === 'comparison') {
        return components.slice(1).map(component=>[
          components[0][0],component[0],linkLabel(components[0],component)
        ]);
      }
      return components.slice(1).map((component,index)=>[
        components[index][0],component[0],linkLabel(components[index],component)
      ]);
    };
    const makeFrames = (concept,components,links,focusIds) => concept.visual.steps.map((step,index)=>{
      const focusIndex = Math.min(index,(focusIds || components.map(component=>component[0])).length - 1);
      const focusId = (focusIds || components.map(component=>component[0]))[focusIndex];
      const states = {};
      for (let prior = 0; prior < focusIndex; prior++) {
        states[(focusIds || components.map(component=>component[0]))[prior]] = 'done';
      }
      states[focusId] = riskWords.test(step[2]) ? 'risk' : 'active';
      return [index === 0 ? -1 : Math.min(index - 1,links.length - 1),states];
    });
    const overrides = new Map([
      ['Resilience Patterns::Active-passive',{
        kind:'architecture',
        components:[
          ['client','Checkout clients','Send production requests','client'],
          ['lb','Global load balancer','Routes only to the active site','gateway'],
          ['primary','Active primary','Serves traffic and orders writes','replica'],
          ['replica','Passive replica','Continuously applies replicated changes','replica'],
          ['monitor','Health monitor','Confirms primary failure across several probes','control'],
          ['promoter','Failover controller','Fences the old epoch and promotes the replica','control']
        ],
        links:[
          ['client','lb','HTTPS requests'],
          ['lb','primary','route active traffic'],
          ['primary','replica','replicate commit log'],
          ['monitor','primary','probe health'],
          ['monitor','promoter','declare failure'],
          ['promoter','replica','promote with new epoch'],
          ['promoter','lb','switch route']
        ],
        focus:['primary','replica','monitor','promoter','lb']
      }],
      ['Resilience Patterns::Automatic failover',{
        kind:'sequence',
        components:[
          ['client','API clients','Continue sending requests through one stable endpoint','client'],
          ['router','Traffic router','Routes to the currently preferred service cell','gateway'],
          ['primary','Preferred cell','Serves requests before the outage','service'],
          ['standby','Recovery cell','Replicates data and reserves failover capacity','replica'],
          ['health','Failover health policy','Combines probes, lag, and capacity signals','control'],
          ['control','Failover automation','Changes ownership and routing by epoch','control']
        ],
        links:[
          ['client','router','request'],
          ['router','primary','normal route'],
          ['primary','standby','replicate'],
          ['health','primary','probe'],
          ['health','control','trigger after threshold'],
          ['control','standby','promote'],
          ['control','router','publish new route']
        ],
        focus:['primary','health','standby','control','router']
      }],
      ['Rate Limiting & Traffic Management::Token bucket',{
        kind:'architecture',
        components:[
          ['client','Mobile clients','Generate bursty API requests','client'],
          ['ingress','API gateway','Extracts the tenant and operation cost','gateway'],
          ['limiter','Distributed token limiter','Atomically checks and consumes allowance','control'],
          ['tokens','Token store','Refills to burst capacity at the steady rate','database'],
          ['service','Orders service','Receives only admitted requests','service'],
          ['reject','Throttle response','Returns retry guidance when tokens are insufficient','queue']
        ],
        links:[
          ['client','ingress','API request'],
          ['ingress','limiter','check tenant bucket'],
          ['tokens','limiter','refill and current balance'],
          ['limiter','tokens','consume token'],
          ['limiter','service','admit'],
          ['limiter','reject','reject'],
          ['reject','client','429 with retry-after']
        ],
        focus:['tokens','limiter','ingress','service','reject']
      }],
      ['Storage Systems::LSM trees',{
        kind:'structure',
        components:[
          ['writer','Write client','Submits a key-value mutation','client'],
          ['wal','Write-ahead log','Durably appends the mutation before acknowledgment','storage'],
          ['mem','Sorted memtable','Holds recent versions in memory','database'],
          ['l0','Level-0 SSTables','Receive immutable memtable flushes','storage'],
          ['levels','Sorted SSTable levels','Store non-overlapping durable key ranges','storage'],
          ['compact','Compaction workers','Merge files and discard obsolete versions','worker'],
          ['reader','Read path','Checks memory, filters, indexes, and candidate files','service']
        ],
        links:[
          ['writer','wal','append'],
          ['wal','mem','apply'],
          ['mem','l0','flush immutable table'],
          ['l0','compact','select overlapping files'],
          ['levels','compact','merge older levels'],
          ['compact','levels','write compacted files'],
          ['reader','mem','check newest version'],
          ['reader','levels','probe Bloom filters and indexes']
        ],
        focus:['writer','wal','mem','l0','compact']
      }],
      ['Streaming & Real-Time Processing::Watermarks',{
        kind:'timeline',
        components:[
          ['p0','Orders partition A','Emits event times 10:01 then 10:04','queue'],
          ['p1','Orders partition B','Delays an event timestamped 10:02','queue'],
          ['operator','Event-time operator','Tracks progress for each input partition','worker'],
          ['watermark','Global watermark','Uses safe partition progress to advance event time','clock'],
          ['window','10:00-10:05 window state','Retains the keyed aggregate until closure','database'],
          ['sink','Revenue dashboard','Receives initial results and late corrections','service']
        ],
        links:[
          ['p0','operator','ordered events'],
          ['p1','operator','out-of-order event'],
          ['operator','watermark','partition progress'],
          ['operator','window','update aggregate'],
          ['watermark','window','close when end is passed'],
          ['window','sink','emit result'],
          ['p1','window','late update by policy']
        ],
        focus:['p0','p1','watermark','window','sink']
      }],
      ['Distributed Data Processing::MapReduce',{
        kind:'architecture',
        components:[
          ['files','Web log files','Partitioned input blocks in distributed storage','storage'],
          ['mapA','Mapper A','Emits URL and local count pairs','worker'],
          ['mapB','Mapper B','Emits URL and local count pairs','worker'],
          ['shuffle','Shuffle service','Partitions and transfers pairs by URL','queue'],
          ['reduceA','Reducer A','Sums all counts for its URL range','worker'],
          ['reduceB','Reducer B','Sums all counts for its URL range','worker'],
          ['results','Count files','Commit partitioned global URL totals','storage']
        ],
        links:[
          ['files','mapA','input split A'],
          ['files','mapB','input split B'],
          ['mapA','shuffle','intermediate pairs'],
          ['mapB','shuffle','intermediate pairs'],
          ['shuffle','reduceA','partition A'],
          ['shuffle','reduceB','partition B'],
          ['reduceA','results','commit totals'],
          ['reduceB','results','commit totals']
        ],
        focus:['files','mapA','shuffle','reduceA','results']
      }],
      ['Search & Retrieval::HNSW',{
        kind:'structure',
        components:[
          ['query','Query embedding','Starts at the graph entry point','client'],
          ['top','Sparse top layer','Provides long-range greedy navigation','index'],
          ['middle','Middle proximity layer','Refines the candidate neighborhood','index'],
          ['baseA','Base node cluster A','Dense local vector neighbors','node'],
          ['baseB','Base node cluster B','Adjacent dense vector neighborhood','node'],
          ['frontier','Candidate frontier','Keeps the best efSearch nodes to expand','queue'],
          ['nearest','Nearest vectors','Returns the best distance-ranked neighbors','index']
        ],
        links:[
          ['query','top','enter graph'],
          ['top','middle','greedy descent'],
          ['middle','baseA','descend near query'],
          ['baseA','baseB','proximity edge'],
          ['baseA','frontier','enqueue candidate'],
          ['baseB','frontier','enqueue candidate'],
          ['frontier','nearest','select top neighbors']
        ],
        focus:['query','top','middle','frontier','nearest']
      }],
      ['Distributed Algorithms::Topological sort',{
        kind:'structure',
        components:[
          ['ready','Ready queue','Contains vertices with zero unresolved dependencies','queue'],
          ['compile','Compile schema','Dependency-free build task','node'],
          ['generate','Generate client','Depends on compiled schema','node'],
          ['test','Run tests','Depends on generated client','node'],
          ['package','Package release','Depends on passing tests','node'],
          ['indegree','In-degree table','Tracks each vertex unresolved prerequisites','index']
        ],
        links:[
          ['compile','generate','must precede'],
          ['generate','test','must precede'],
          ['test','package','must precede'],
          ['indegree','ready','enqueue zero in-degree'],
          ['ready','compile','dequeue'],
          ['compile','indegree','decrement dependents'],
          ['generate','indegree','decrement dependents']
        ],
        focus:['indegree','ready','compile','generate','package']
      }]
    ]);
    const materializeOverride = override => {
      const layout = override.kind === 'topology'
        ? topologyPositions(override.components.length)
        : positions[override.kind];
      return {
        kind:override.kind,
        components:override.components.map((component,index)=>[
          ...component,...layout[index]
        ]),
        links:override.links.map(link=>[...link]),
        focus:override.focus
      };
    };
    for (const chapter of chapters) {
      for (const concept of chapter.groups.flatMap(group=>group.concepts)) {
        const key = `${chapter.title}::${concept.name}`;
        const override = overrides.get(key);
        const base = override
          ? materializeOverride(override)
          : (() => {
              const kind = conceptKind(concept);
              const components = makeComponents(kind,concept.visual.nodes);
              return {kind,components,links:makeLinks(kind,components)};
            })();
        concept.diagram = {
          kind:base.kind,
          components:base.components,
          links:base.links,
          frames:makeFrames(concept,base.components,base.links,base.focus)
        };
      }
    }
};

{
  const visualSpecs = new Map([
    ['Resilience Patterns::Active-active',[
      ['Region A','Region A serves live traffic and commits local writes.'],
      ['Region B','Region B simultaneously serves its share of live traffic.'],
      ['Replication','Changes replicate in both directions with version metadata.'],
      ['Conflict resolver','Concurrent writes are detected and resolved by domain policy.'],
      ['Traffic director','When one region fails, healthy regions absorb its traffic.']
    ]],
    ['Resilience Patterns::Active-passive',[
      ['Active site','The active site owns traffic and the authoritative write path.'],
      ['Passive site','The passive site receives replicated state but serves no traffic.'],
      ['Health monitor','Repeated failed probes declare the active site unavailable.'],
      ['Failover controller','The passive site is promoted with a new ownership epoch.'],
      ['Traffic director','Clients are routed to the newly active site.']
    ]],
    ['Resilience Patterns::Hot standby',[
      ['Primary','The primary serves requests and emits every committed change.'],
      ['Synchronous replica','The hot standby applies changes and stays fully provisioned.'],
      ['Health monitor','The primary crosses the configured failure threshold.'],
      ['Promotion gate','Replication position and fencing are verified before promotion.'],
      ['Hot standby','The standby immediately accepts production traffic.']
    ]],
    ['Resilience Patterns::Warm standby',[
      ['Primary region','The primary region serves full production load.'],
      ['Warm replica','A smaller standby continuously applies replicated state.'],
      ['Failure alarm','Monitoring confirms the primary cannot meet service objectives.'],
      ['Scale controller','Standby compute and worker capacity scale toward production size.'],
      ['Traffic switch','Traffic moves gradually as standby health and capacity are proven.']
    ]],
    ['Resilience Patterns::Cold standby',[
      ['Production site','The production site serves traffic until a disaster stops it.'],
      ['Backup vault','Independent backups preserve data and infrastructure definitions.'],
      ['Recovery environment','Replacement infrastructure is provisioned after declaration.'],
      ['Restore pipeline','The latest valid backup and logs restore application state.'],
      ['Validation gate','Integrity checks pass before users are routed to recovery.']
    ]],
    ['Resilience Patterns::Leader failover',[
      ['Leader','The current leader orders writes for its term.'],
      ['Followers','Followers replicate the leader log and track its heartbeat.'],
      ['Election timeout','Missing heartbeats cause a follower to start a higher term.'],
      ['Quorum','A majority elects the candidate whose log is sufficiently current.'],
      ['New leader','The winner fences the old term and resumes ordered writes.']
    ]],
    ['Resilience Patterns::Automatic failover',[
      ['Serving endpoint','The preferred endpoint handles traffic normally.'],
      ['Health policy','Multiple signals breach the failover threshold and hold-down period.'],
      ['Safety checks','Replication lag, capacity, and dependency health are validated.'],
      ['Failover automation','Ownership and routing records switch atomically or by epoch.'],
      ['Recovery watch','Automation monitors the new path and halts on regressions.']
    ]],
    ['Resilience Patterns::Health checking',[
      ['Probe agent','A probe calls the instance readiness or dependency-aware endpoint.'],
      ['Instance','The instance reports whether it can safely serve new work.'],
      ['Threshold counter','Consecutive successes or failures prevent one noisy probe from deciding.'],
      ['Load balancer','Unhealthy instances are removed from new-request routing.'],
      ['Recovery probe','Passing the recovery threshold returns the instance to service.']
    ]],
    ['Resilience Patterns::Heartbeats',[
      ['Member','A live member emits a heartbeat with its identity and epoch.'],
      ['Heartbeat store','The receiver records the latest observed heartbeat time.'],
      ['Deadline','No heartbeat arrives before the suspicion timeout.'],
      ['Failure detector','The member becomes suspected rather than instantly proven dead.'],
      ['Coordinator','Ownership is reassigned only after the configured confirmation policy.']
    ]],
    ['Resilience Patterns::Failure detection',[
      ['Target service','The target processes requests while exporting liveness signals.'],
      ['Detector','The detector combines probe failures, heartbeats, and timeout evidence.'],
      ['Suspicion state','Uncertain delay moves the target into a suspected state.'],
      ['Quorum evidence','Independent observers confirm the failure condition.'],
      ['Recovery action','Routing or ownership changes with an epoch that rejects stale actors.']
    ]],
    ['Resilience Patterns::Disaster recovery',[
      ['Primary region','A regional disaster makes the primary service unavailable.'],
      ['Recovery plan','The declared scenario selects owners, runbook, RPO, and RTO.'],
      ['Recovery region','Infrastructure, secrets, dependencies, and capacity are activated.'],
      ['Data recovery','Replicas or backups restore to the accepted recovery point.'],
      ['Business validation','Critical journeys pass before traffic and operations resume.']
    ]],
    ['Resilience Patterns::RPO',[
      ['Committed writes','Production continues creating recoverable data.'],
      ['Protection pipeline','Replication or backup captures recovery points over time.'],
      ['Disaster point','A failure interrupts the source and protection stream.'],
      ['Latest recovery point','The newest independently durable point is selected.'],
      ['Data-loss interval','Its age is measured and must remain within the RPO.']
    ]],
    ['Resilience Patterns::RTO',[
      ['Failure start','The service becomes unavailable at the disaster timestamp.'],
      ['Detection and declaration','Operators or automation confirm the recovery scenario.'],
      ['Restore sequence','Infrastructure, data, and dependencies are recovered.'],
      ['Validation','Health and critical business flows prove safe operation.'],
      ['Service restored','Elapsed outage time is compared with the RTO.']
    ]],
    ['Resilience Patterns::Backup/restore',[
      ['Source data','A consistent snapshot boundary is selected from production state.'],
      ['Backup writer','Data and required metadata are encrypted into independent storage.'],
      ['Backup catalog','Checksums, retention, and restore dependencies are recorded.'],
      ['Restore environment','A chosen backup is loaded into an isolated target.'],
      ['Restore test','Integrity and application-level queries prove recoverability.']
    ]],
    ['Resilience Patterns::Point-in-time recovery',[
      ['Base snapshot','A known-consistent full snapshot establishes the replay base.'],
      ['Change log','Every later mutation is durably ordered with timestamps or positions.'],
      ['Target time','Recovery chooses a moment immediately before corruption.'],
      ['Replay engine','Logs apply in order up to, but not beyond, the target.'],
      ['Recovered database','Consistency checks complete before the restored copy is promoted.']
    ]],
    ['Resilience Patterns::Chaos engineering',[
      ['Steady-state hypothesis','A measurable user or system invariant is defined first.'],
      ['Experiment scope','A realistic failure and tightly bounded blast radius are selected.'],
      ['Chaos controller','The fault is introduced while telemetry and abort signals are watched.'],
      ['System response','Fallback, isolation, and recovery behavior are observed.'],
      ['Learning loop','Unexpected results become fixes and a repeatable regression experiment.']
    ]],
    ['Resilience Patterns::Fault injection',[
      ['Injection point','A specific network, process, dependency, or resource boundary is selected.'],
      ['Fault policy','Latency, errors, loss, corruption, or exhaustion is precisely configured.'],
      ['Target path','The controlled fault affects only labeled requests or instances.'],
      ['Protection mechanism','Timeouts, retries, isolation, and alerts respond to the fault.'],
      ['Abort controller','Safety thresholds remove the fault and verify recovery.']
    ]],
    ['Rate Limiting & Traffic Management::Token bucket',[
      ['Refill clock','Elapsed time adds tokens at the configured steady rate.'],
      ['Token bucket','Stored tokens accumulate only up to the burst capacity.'],
      ['Request','An arriving request asks to consume its configured token cost.'],
      ['Admission','A request with enough tokens consumes them and proceeds.'],
      ['Rejection','A request without enough tokens waits or receives retry guidance.']
    ]],
    ['Rate Limiting & Traffic Management::Leaky bucket',[
      ['Incoming burst','Requests arrive faster than the protected service can accept them.'],
      ['Bounded bucket','The limiter queues requests until its finite capacity is full.'],
      ['Leak clock','Work leaves the bucket at a fixed configured rate.'],
      ['Protected service','Smoothed requests reach the service without the original burst.'],
      ['Overflow','New work is rejected when the bounded bucket has no space.']
    ]],
    ['Rate Limiting & Traffic Management::Fixed window',[
      ['Window clock','Time selects the current discrete counting interval.'],
      ['Counter','Each accepted request increments the counter for that interval.'],
      ['Limit check','Counts at or below the limit are admitted.'],
      ['Window boundary','The next interval starts with a fresh counter.'],
      ['Boundary burst','Traffic at both sides of the boundary can exceed the rolling intent.']
    ]],
    ['Rate Limiting & Traffic Management::Sliding window',[
      ['Request log','Each request timestamp is stored in an ordered per-key log.'],
      ['Window start','The current time minus the interval defines the rolling boundary.'],
      ['Eviction','Timestamps older than the boundary are removed.'],
      ['Exact count','The remaining entries give the precise rolling request count.'],
      ['Admission','The next request is accepted only when the count is below the limit.']
    ]],
    ['Rate Limiting & Traffic Management::Sliding window counter',[
      ['Previous counter','The prior fixed window retains its completed request count.'],
      ['Current counter','The active fixed window counts new requests.'],
      ['Time fraction','Elapsed position determines how much prior count still overlaps.'],
      ['Weighted estimate','Prior overlap plus current count approximates the rolling total.'],
      ['Admission','The estimate is compared with the configured limit.']
    ]],
    ['Rate Limiting & Traffic Management::Distributed rate limiting',[
      ['Service instances','Requests for one limit key arrive at different instances.'],
      ['Limit key','Identity and policy scope map every request to shared limiter state.'],
      ['State authority','Atomic counters, token leases, or allocated local budgets track usage.'],
      ['Admission result','Each instance admits or rejects using the authoritative allowance.'],
      ['Partition policy','A network failure chooses fail-open, fail-closed, or bounded local allowance.']
    ]],
    ['Rate Limiting & Traffic Management::Global rate limiting',[
      ['Regions','Traffic enters through multiple geographically separate regions.'],
      ['Global budget','One aggregate policy defines the total permitted rate.'],
      ['Budget allocator','The global budget is divided into regional leases or synchronized state.'],
      ['Regional limiters','Regions spend local allocations without cross-region checks per request.'],
      ['Rebalancer','Allocations shift as demand changes while bounding aggregate overshoot.']
    ]],
    ['Rate Limiting & Traffic Management::Per-user limits',[
      ['Authenticated user','A validated user identity becomes the limiter key.'],
      ['User policy','The product tier selects rate, burst, and operation cost.'],
      ['User bucket','All sessions and devices consume the same user allowance.'],
      ['Decision','Requests within allowance proceed and excess requests are throttled.']
    ]],
    ['Rate Limiting & Traffic Management::Per-tenant limits',[
      ['Tenant identity','Every request is attributed to its owning tenant.'],
      ['Tenant budget','Aggregate rate and concurrency protect shared service capacity.'],
      ['Tenant members','Users and workloads draw from the common allowance.'],
      ['Fairness policy','Optional sub-limits prevent one member from consuming the tenant budget.'],
      ['Decision','Excess tenant traffic is queued, degraded, or rejected.']
    ]],
    ['Rate Limiting & Traffic Management::Per-IP limits',[
      ['Source address','The trusted network boundary determines the effective client IP.'],
      ['IP counter','Requests sharing the address consume one abuse-prevention allowance.'],
      ['Threshold','Normal traffic proceeds until the rate or burst limit is reached.'],
      ['Mitigation','Excess traffic is challenged, delayed, or rejected.'],
      ['NAT exception','Trusted proxies and crowded NAT addresses receive adjusted policy.']
    ]],
    ['Rate Limiting & Traffic Management::Hierarchical rate limiting',[
      ['Global bucket','The request first fits within total service capacity.'],
      ['Tenant bucket','The owning tenant must have remaining aggregate allowance.'],
      ['User bucket','The caller must also satisfy its individual policy.'],
      ['Endpoint bucket','The expensive operation consumes a route-specific cost.'],
      ['Admission','The request proceeds only when every required level grants capacity.']
    ]],
    ['Rate Limiting & Traffic Management::Adaptive rate limiting',[
      ['Telemetry','Latency, errors, queue depth, and saturation describe current health.'],
      ['Controller','A smoothed feedback rule computes a safer admission target.'],
      ['Limiter','Rate or concurrency capacity adjusts gradually toward the target.'],
      ['Protected service','Health recovers as admitted work falls below overload.'],
      ['Recovery ramp','Capacity increases cautiously to avoid oscillation.']
    ]],
    ['Rate Limiting & Traffic Management::Concurrency limiting',[
      ['Permit pool','A bounded pool represents safe simultaneous work.'],
      ['Request','An arriving request attempts to acquire a permit.'],
      ['In-flight operation','A granted request holds the permit for its full expensive lifetime.'],
      ['Release','Completion or cancellation returns the permit.'],
      ['Full pool','Requests without permits queue briefly or fail fast.']
    ]],
    ['Rate Limiting & Traffic Management::Load shedding',[
      ['Overload signal','Queueing, deadlines, or resource saturation cross a safe threshold.'],
      ['Request classifier','Traffic is labeled by criticality, cost, and remaining deadline.'],
      ['Shedding gate','Low-value or hopeless work is rejected before consuming scarce resources.'],
      ['Critical path','Reserved capacity continues serving high-value requests.'],
      ['Recovery','Shedding relaxes only after health remains below the recovery threshold.']
    ]],
    ['Rate Limiting & Traffic Management::Fair queuing',[
      ['Traffic flows','Requests are separated by tenant, user, or workload class.'],
      ['Per-flow queues','Each active flow buffers only its own pending work.'],
      ['Round-robin selector','The scheduler gives each nonempty flow a service turn.'],
      ['Worker pool','Selected work enters the shared finite execution capacity.'],
      ['Isolation','A noisy flow fills or delays its own queue rather than every flow.']
    ]],
    ['Rate Limiting & Traffic Management::Weighted fair queuing',[
      ['Traffic classes','Requests enter queues labeled by service class.'],
      ['Configured weights','Each class receives a proportional share of scheduling credits.'],
      ['Weighted selector','The scheduler spends credits while rotating among active classes.'],
      ['Worker pool','Selected requests consume shared capacity.'],
      ['Aging guard','Waiting work eventually advances despite a low configured weight.']
    ]],
    ['Distributed Scheduling::Distributed job scheduler',[
      ['Job store','Submitted jobs and schedules become durable before acknowledgment.'],
      ['Eligibility scanner','Due jobs with satisfied dependencies become runnable.'],
      ['Assignment coordinator','Runnable tasks are matched to workers with available resources.'],
      ['Workers','Workers claim, execute, and periodically persist progress.'],
      ['Recovery loop','Expired assignments return to the runnable set for safe retry.']
    ]],
    ['Distributed Scheduling::Leader-based scheduling',[
      ['Scheduler replicas','Replicas maintain shared scheduling metadata.'],
      ['Leader election','A quorum grants one replica authority for a term.'],
      ['Leader','The leader orders task assignments and records them durably.'],
      ['Workers','Workers accept assignments carrying the current leader term.'],
      ['Failover','A higher-term leader rejects assignments from the stale leader.']
    ]],
    ['Distributed Scheduling::Work stealing',[
      ['Busy worker','A worker owns a deque with more runnable tasks than it can process.'],
      ['Idle worker','An idle worker samples peers for available work.'],
      ['Steal operation','The idle worker atomically takes tasks from the opposite deque end.'],
      ['Local execution','Both workers process their now-balanced local queues.'],
      ['Locality check','Tasks that cannot move remain pinned to their data or resource.']
    ]],
    ['Distributed Scheduling::Task queues',[
      ['Producer','A producer durably enqueues a task with identity and payload.'],
      ['Task queue','The queue orders or partitions pending tasks and applies visibility rules.'],
      ['Worker','A worker leases or receives one available task.'],
      ['Acknowledgment','Successful execution removes or commits the task.'],
      ['Redelivery','Missing acknowledgment makes the task visible for another attempt.']
    ]],
    ['Distributed Scheduling::Priority scheduling',[
      ['Submitted tasks','Tasks arrive with validated priority, deadline, and resource needs.'],
      ['Priority queues','Runnable tasks are separated or ordered by scheduling priority.'],
      ['Scheduler','Highest eligible priority is chosen subject to quotas and fairness.'],
      ['Workers','Selected tasks consume execution slots.'],
      ['Aging','Long-waiting low-priority work gains priority to prevent starvation.']
    ]],
    ['Distributed Scheduling::Delayed execution',[
      ['Task record','A durable task stores its not-before timestamp.'],
      ['Delay index','Tasks are ordered or bucketed by activation time.'],
      ['Clock advance','The scheduler reaches the task activation boundary.'],
      ['Ready queue','The task moves atomically from delayed to runnable state.'],
      ['Worker','A worker claims and executes the now-eligible task.']
    ]],
    ['Distributed Scheduling::Retry scheduling',[
      ['Failed attempt','A worker records a classified transient failure and attempt count.'],
      ['Retry policy','Backoff, jitter, maximum attempts, and deadline determine the next time.'],
      ['Delayed queue','The retry remains invisible until its scheduled activation.'],
      ['Next attempt','A worker receives the same stable job identity for safe retry.'],
      ['Terminal path','Permanent or exhausted failures move to review or dead-letter state.']
    ]],
    ['Distributed Scheduling::Lease-based workers',[
      ['Ready task','A durable task has no current unexpired owner.'],
      ['Worker claim','A worker atomically acquires a lease with expiry and fencing token.'],
      ['Lease renewal','Progressing work extends ownership before expiry.'],
      ['Protected effect','Side effects present the fencing token so stale workers are rejected.'],
      ['Lease expiry','An abandoned task becomes eligible for reassignment.']
    ]],
    ['Distributed Scheduling::Heartbeat-based ownership',[
      ['Task owner','The assigned worker begins processing a long-running task.'],
      ['Heartbeat record','The worker periodically persists identity, progress, and timestamp.'],
      ['Ownership monitor','Fresh heartbeats preserve the assignment.'],
      ['Missed deadline','Absent heartbeats mark ownership suspected or expired.'],
      ['Reassignment','Another worker resumes from a checkpoint with a new ownership epoch.']
    ]],
    ['Distributed Scheduling::Sharded schedulers',[
      ['Job key','Tenant or workflow identity maps each job to a scheduler shard.'],
      ['Shard map','A versioned map assigns shard ownership to scheduler replicas.'],
      ['Shard scheduler','The owner scans and schedules only its local job subset.'],
      ['Workers','Workers execute tasks without consulting unrelated scheduler shards.'],
      ['Rebalance','Shard state transfers before a new ownership epoch becomes active.']
    ]],
    ['Distributed Scheduling::Scheduler partitioning',[
      ['Partition key','A stable key groups jobs requiring local ordering or coordination.'],
      ['Partition router','The router maps the key through the current membership epoch.'],
      ['Scheduler partition','One partition serializes its scheduling decisions.'],
      ['Worker pool','Assignments fan out to workers while partition state remains local.'],
      ['Hot partition','Heavy keys are split, isolated, or given dedicated capacity.']
    ]],
    ['Distributed Scheduling::Exactly-once job execution',[
      ['Job identity','Every logical job has one stable unique execution key.'],
      ['Atomic claim','A worker records ownership only if no committed outcome exists.'],
      ['Job effect','The business mutation and completion marker commit atomically when possible.'],
      ['Retry worker','A duplicate attempt checks the committed outcome before acting.'],
      ['Single outcome','All attempts return or converge on the same logical result.']
    ]],
    ['Distributed Scheduling::Idempotent jobs',[
      ['Stable job key','Retries carry the same identity and semantically equivalent payload.'],
      ['Deduplication store','The worker checks for an existing in-progress or completed result.'],
      ['Business operation','The effect uses an upsert, compare-and-set, or idempotency key.'],
      ['Result record','The durable outcome is associated with the stable key.'],
      ['Duplicate attempt','Later attempts return the recorded result without repeating the effect.']
    ]],
    ['Distributed Scheduling::Cron/distributed cron',[
      ['Schedule definition','A durable expression and time zone define recurrence.'],
      ['Schedule owner','One epoch-fenced scheduler owns materialization for the schedule.'],
      ['Due instant','The owner creates a uniquely keyed occurrence for the time slot.'],
      ['Task queue','The occurrence is delivered with normal retry semantics.'],
      ['Catch-up policy','After downtime, missed occurrences are skipped, coalesced, or replayed explicitly.']
    ]],
    ['Distributed Scheduling::Workflow engines',[
      ['Workflow definition','A versioned graph defines steps, dependencies, timers, and compensation.'],
      ['Workflow state','The engine durably records the current instance and completed steps.'],
      ['Activity worker','A worker executes one idempotent activity and reports its result.'],
      ['Decision loop','The engine advances newly eligible steps or schedules retries.'],
      ['Terminal state','The workflow completes, fails, or runs compensation with an auditable history.']
    ]],
    ['Storage Systems::LSM trees',[
      ['Write request','A key-value mutation enters the storage engine.'],
      ['Write-ahead log','The mutation is appended durably before acknowledgment.'],
      ['Memtable','The mutation updates an in-memory sorted structure.'],
      ['SSTable','A full memtable flushes as an immutable sorted file.'],
      ['Compaction','Background merges reconcile versions and restore level invariants.']
    ]],
    ['Storage Systems::B-trees',[
      ['Root page','A lookup begins at the root using sorted separator keys.'],
      ['Internal pages','The key range selects one child at each tree level.'],
      ['Leaf page','The leaf contains the record or pointer in sorted order.'],
      ['Page update','An insert modifies the leaf and logs the change.'],
      ['Page split','A full page splits and promotes a separator toward the root.']
    ]],
    ['Storage Systems::SSTables',[
      ['Sorted entries','A frozen memtable provides ordered key-version pairs.'],
      ['Data blocks','Entries are encoded into immutable compressed blocks.'],
      ['Sparse index','Block boundary keys map lookups to likely offsets.'],
      ['Bloom filter','Definitely absent keys avoid unnecessary block reads.'],
      ['Merged run','Compaction later combines this table with overlapping tables.']
    ]],
    ['Storage Systems::Write-ahead logs',[
      ['Mutation','A transaction prepares a storage change.'],
      ['Log record','The intended change and transaction identity are serialized.'],
      ['Durable append','The log record reaches the required stable-storage boundary.'],
      ['Data page','In-memory or on-disk data may update after durability is secured.'],
      ['Crash recovery','Replay reapplies committed records and ignores incomplete work.']
    ]],
    ['Storage Systems::Memtables',[
      ['Incoming write','A logged mutation arrives with its key and sequence number.'],
      ['Mutable memtable','The active sorted in-memory table receives the new version.'],
      ['Read path','Reads merge the memtable with older immutable storage.'],
      ['Freeze threshold','A size limit turns the active table immutable.'],
      ['Flush','The frozen memtable becomes an SSTable while a new one accepts writes.']
    ]],
    ['Storage Systems::Compaction',[
      ['Overlapping SSTables','Several immutable files contain different versions of key ranges.'],
      ['Compaction picker','Level, size, or overlap policy chooses input files.'],
      ['Merge iterator','Keys merge in order and obsolete versions or tombstones are filtered safely.'],
      ['Output SSTables','New immutable files are written with indexes and checksums.'],
      ['Manifest swap','Metadata atomically activates outputs before old files are deleted.']
    ]],
    ['Storage Systems::Bloom filters',[
      ['Key','A lookup key is hashed by several deterministic hash functions.'],
      ['Bit array','Each hash selects a bit that inserts set to one.'],
      ['Membership test','A query checks every selected bit.'],
      ['Definite miss','Any zero bit proves the key is absent.'],
      ['Possible match','All one bits require a real lookup because false positives exist.']
    ]],
    ['Storage Systems::Indexing',[
      ['Source record','A committed record exposes fields selected for indexing.'],
      ['Key extraction','Normalization derives one or more searchable index keys.'],
      ['Index structure','Keys map to record identities or storage locations.'],
      ['Query planner','A predicate selects the index instead of scanning all records.'],
      ['Maintenance','Updates keep source and index synchronized or reconcile lag.']
    ]],
    ['Storage Systems::Secondary indexes',[
      ['Primary record','A record is stored by its primary key.'],
      ['Secondary value','A non-primary attribute produces an index entry.'],
      ['Secondary index','The value maps to one or more primary keys.'],
      ['Index lookup','A query finds candidate primary keys by the alternate attribute.'],
      ['Base fetch','Candidates are fetched and rechecked against the current record.']
    ]],
    ['Storage Systems::Inverted indexes',[
      ['Document','A source document enters the indexing pipeline.'],
      ['Analyzer','Tokenization and normalization produce searchable terms.'],
      ['Term dictionary','Each unique term receives a dictionary entry.'],
      ['Postings lists','Document IDs, positions, and frequencies append under each term.'],
      ['Query intersection','Term postings are combined to retrieve matching documents.']
    ]],
    ['Storage Systems::Sparse indexes',[
      ['Sorted data file','Records are stored in key order across blocks.'],
      ['Boundary entries','The index records only the first key and offset of each block.'],
      ['Index search','A lookup finds the greatest boundary not above the target key.'],
      ['Block read','The selected data block is loaded from storage.'],
      ['Local scan','Records within the block are scanned to find the exact key.']
    ]],
    ['Storage Systems::Covering indexes',[
      ['Query','The query specifies predicates and projected columns.'],
      ['Covering index','Index keys and included columns contain every required value.'],
      ['Index seek','Predicates navigate directly to matching index entries.'],
      ['Index-only result','Projected values return without reading base rows.'],
      ['Write maintenance','Record updates also rewrite the wider index entry.']
    ]],
    ['Storage Systems::Partition indexes',[
      ['Partition key','A logical key or range identifies data placement.'],
      ['Partition index','The key maps to an owner shard and membership epoch.'],
      ['Request router','The router sends the operation to the indexed owner.'],
      ['Shard','The owner performs local storage and index access.'],
      ['Rebalance','Copy then epoch cutover changes ownership without ambiguous routing.']
    ]],
    ['Storage Systems::Columnar storage',[
      ['Row batch','Rows are grouped into a segment for encoding.'],
      ['Column split','Values from each field are stored together.'],
      ['Column encoder','Similar values use compression, dictionaries, or run-length encoding.'],
      ['Predicate scan','Metadata skips segments and reads only referenced columns.'],
      ['Vectorized operator','Batches of column values are processed efficiently by the CPU.']
    ]],
    ['Storage Systems::Row-oriented storage',[
      ['Record','All fields of one entity are encoded together.'],
      ['Data page','Many complete records share a page.'],
      ['Primary lookup','An index locates the page and row slot.'],
      ['Row read','One contiguous read returns the complete record.'],
      ['Row update','Changed fields rewrite the row and associated indexes.']
    ]],
    ['Storage Systems::Log-structured storage',[
      ['Mutation','A new record version arrives instead of modifying old bytes in place.'],
      ['Append log','The version is written sequentially at the log tail.'],
      ['Location index','The key now points to the newest log position.'],
      ['Read','The index resolves the latest version while older versions remain.'],
      ['Garbage collection','Live records move and obsolete log segments are reclaimed.']
    ]],
    ['Storage Systems::Object storage',[
      ['Object key','A bucket and key identify an object in a flat logical namespace.'],
      ['Metadata service','Metadata maps the key and version to storage fragments.'],
      ['Data chunks','The object is replicated or erasure-coded across failure domains.'],
      ['Manifest commit','A complete immutable version becomes visible atomically.'],
      ['Lifecycle policy','Age and access rules tier or delete object versions.']
    ]],
    ['Storage Systems::Block storage',[
      ['Volume','A host attaches a logical array of fixed-size addressable blocks.'],
      ['Block request','The filesystem or database issues a read or write by offset.'],
      ['Storage controller','The logical block maps to physical replicated storage.'],
      ['Durability acknowledgment','The required replicas or stable media confirm the write.'],
      ['Host cache','Ordering and flush barriers preserve higher-level consistency.']
    ]],
    ['Storage Systems::Distributed filesystems',[
      ['Client path','A client resolves a hierarchical file path.'],
      ['Metadata service','Namespace metadata identifies file chunks and versions.'],
      ['Chunk servers','The client reads or writes replicated chunks directly.'],
      ['Consistency protocol','Leases or versions serialize conflicting mutations.'],
      ['Repair loop','Failed or under-replicated chunks are detected and reconstructed.']
    ]],
    ['Database Distributed-System Concepts::Primary/replica',[
      ['Client','A write is routed to the current primary.'],
      ['Primary','The primary orders and durably records the mutation.'],
      ['Replication log','Replicas receive ordered log positions.'],
      ['Replica','Each replica applies changes and may serve consistency-qualified reads.'],
      ['Promotion','A sufficiently current replica becomes primary after failure fencing.']
    ]],
    ['Database Distributed-System Concepts::Leaderless databases',[
      ['Coordinator','Any node accepts the client operation and locates replicas.'],
      ['Replica set','Writes carry versions to multiple independent replicas.'],
      ['Write quorum','Enough acknowledgments complete the client write.'],
      ['Read quorum','Several versions are read and reconciled.'],
      ['Repair','Read repair or anti-entropy updates stale replicas.']
    ]],
    ['Database Distributed-System Concepts::Distributed SQL',[
      ['SQL gateway','The gateway parses SQL and builds a distributed plan.'],
      ['Range metadata','Keys and ranges map plan fragments to storage nodes.'],
      ['Shard operators','Nodes scan, filter, and partially aggregate local data.'],
      ['Transaction coordinator','Cross-range writes agree on one commit timestamp and outcome.'],
      ['Result merger','The gateway merges ordered or aggregated shard results.']
    ]],
    ['Database Distributed-System Concepts::Distributed transactions',[
      ['Coordinator','A transaction coordinator assigns identity and tracks participants.'],
      ['Participants','Each shard executes writes under an isolated provisional state.'],
      ['Prepare phase','Participants durably promise they can commit.'],
      ['Decision record','The coordinator durably records commit or abort.'],
      ['Resolution','Participants apply the decision and recover it after failures.']
    ]],
    ['Database Distributed-System Concepts::Sharding',[
      ['Partition key','A record key determines its logical shard.'],
      ['Shard map','A versioned routing table maps shards to owners.'],
      ['Router','The request reaches the current owner or fans out when unavoidable.'],
      ['Shard','The owner executes locally within its storage and throughput budget.'],
      ['Rebalancer','Data copies before ownership changes to a new epoch.']
    ]],
    ['Database Distributed-System Concepts::Replication',[
      ['Write authority','An accepted mutation receives an order or version.'],
      ['Replication stream','The mutation propagates to copies in other failure domains.'],
      ['Replica acknowledgments','The durability policy waits for required copies.'],
      ['Read routing','Reads choose a replica compatible with their consistency requirement.'],
      ['Repair','Lagging or divergent copies catch up from logs or snapshots.']
    ]],
    ['Database Distributed-System Concepts::Consistent hashing',[
      ['Membership ring','Nodes or virtual nodes occupy deterministic hash positions.'],
      ['Key hash','A key maps to a point in the same hash space.'],
      ['Owner walk','The next eligible ring positions select owner replicas.'],
      ['Membership change','A node joins or leaves the ring.'],
      ['Limited movement','Only keys crossing changed ownership boundaries move.']
    ]],
    ['Database Distributed-System Concepts::Quorum',[
      ['Replica set','A value is stored across N failure-independent replicas.'],
      ['Write quorum','A write waits for W versioned acknowledgments.'],
      ['Read quorum','A read collects R versions from replicas.'],
      ['Intersection','When R plus W exceeds N, read and write sets overlap.'],
      ['Reconciliation','The newest valid version wins and stale copies are repaired.']
    ]],
    ['Database Distributed-System Concepts::Read/write consistency',[
      ['Consistency request','The client selects required freshness and durability.'],
      ['Write path','The chosen write level waits for a defined replica set.'],
      ['Replica progress','Copies apply the version at different times.'],
      ['Read path','The read level chooses leader, quorum, session, or any replica.'],
      ['Observed value','Latency and availability follow from the selected guarantee.']
    ]],
    ['Database Distributed-System Concepts::Hot partitions',[
      ['Partition key','A skewed key maps disproportionate traffic to one shard.'],
      ['Hot shard','CPU, storage, or queue capacity saturates before the cluster.'],
      ['Telemetry','Per-key and per-shard metrics expose concentration.'],
      ['Mitigation','Salting, splitting, caching, or dedicated capacity spreads work.'],
      ['Merge path','Reads or aggregates recombine salted pieces when required.']
    ]],
    ['Database Distributed-System Concepts::Secondary indexes',[
      ['Base shard','A record mutation commits under its primary partition key.'],
      ['Index mutation','The secondary attribute produces an index add or remove.'],
      ['Index shard','The alternate key maps to possibly different index ownership.'],
      ['Lookup','A query retrieves candidate primary keys from the index.'],
      ['Validation','Base records are fetched to remove stale or changed candidates.']
    ]],
    ['Database Distributed-System Concepts::Global indexes',[
      ['Base partitions','Records remain distributed by their primary partition keys.'],
      ['Global index key','An alternate attribute uses its own cross-cluster partitioning.'],
      ['Index update','Each base mutation updates the globally routed index entry.'],
      ['Direct lookup','A query targets only index shards holding the alternate key.'],
      ['Base fetch','Returned primary keys route to their owning data partitions.']
    ]],
    ['Database Distributed-System Concepts::Local indexes',[
      ['Base shard','A shard stores records for its primary key range.'],
      ['Local index','Alternate keys index only records inside that same shard.'],
      ['Atomic update','Base record and local index change in one shard transaction.'],
      ['Fan-out query','A global alternate-key query asks every relevant shard.'],
      ['Merge','The coordinator combines local matches and handles partial results.']
    ]],
    ['Database Distributed-System Concepts::Online schema migration',[
      ['Old readers and writers','Existing application versions continue using the old schema.'],
      ['Expand phase','The database adds backward-compatible fields or structures.'],
      ['Dual-compatible code','New code reads both forms and writes the migration-safe form.'],
      ['Backfill','Historical rows are converted in throttled resumable batches.'],
      ['Contract phase','After validation and rollout completion, obsolete schema is removed.']
    ]],
    ['Database Distributed-System Concepts::Online reindexing',[
      ['Live index','Queries continue using the current index.'],
      ['Shadow index','A replacement index builds from a consistent source snapshot.'],
      ['Change catch-up','Mutations after the snapshot are replayed into the shadow.'],
      ['Validation','Counts, checksums, and sampled queries compare both indexes.'],
      ['Atomic switch','Query metadata selects the new index before the old one retires.']
    ]],
    ['Database Distributed-System Concepts::Backfills',[
      ['Source scan','A resumable cursor reads historical records in bounded batches.'],
      ['Transformation','Each record deterministically computes the missing representation.'],
      ['Conditional write','Version checks avoid overwriting newer concurrent updates.'],
      ['Throttle','Rate and concurrency adapt to production headroom.'],
      ['Verification','Coverage metrics and reconciliation identify omissions or drift.']
    ]],
    ['Database Distributed-System Concepts::Dual writes',[
      ['Logical mutation','One request must update an old and a new representation.'],
      ['Primary commit','The authoritative representation commits first or with an outbox.'],
      ['Secondary write','A relay or application writes the second representation.'],
      ['Partial failure','Retryable state records which side has not converged.'],
      ['Reconciliation','Idempotent replay and comparison repair divergence before cutover.']
    ]],
    ['Database Distributed-System Concepts::Read-after-write consistency',[
      ['Client write','A write commits with a version, log position, or session token.'],
      ['Replication','Followers asynchronously advance toward that committed version.'],
      ['Client read','The client presents its minimum required version.'],
      ['Read router','A caught-up replica is selected or the read waits or goes to the leader.'],
      ['Fresh result','The response reflects at least the client committed write.']
    ]],
    ['Streaming & Real-Time Processing::Stream processing',[
      ['Event source','An unbounded source emits partitioned records continuously.'],
      ['Stream operators','Stateless and stateful operators transform each record.'],
      ['Partitioned state','Keys route related events to the same logical state.'],
      ['Checkpoint barrier','State and source progress become recoverable together.'],
      ['Sink','Results are emitted with the configured delivery semantics.']
    ]],
    ['Streaming & Real-Time Processing::Windowing',[
      ['Timestamped events','Events carry processing or event timestamps.'],
      ['Window assigner','Each event maps to one or more bounded windows.'],
      ['Window state','Per-key values accumulate until a trigger condition.'],
      ['Trigger','Time, count, or watermark causes a result emission.'],
      ['Cleanup','Allowed lateness ends and retained window state is released.']
    ]],
    ['Streaming & Real-Time Processing::Tumbling windows',[
      ['Event time','An event timestamp enters the window function.'],
      ['Fixed boundaries','The timeline is split into equal non-overlapping intervals.'],
      ['Single assignment','Each event belongs to exactly one interval.'],
      ['Window aggregate','State accumulates independently for that interval.'],
      ['Window close','The watermark passes the end and emits the interval result.']
    ]],
    ['Streaming & Real-Time Processing::Sliding windows',[
      ['Event time','An event arrives with a timestamp.'],
      ['Window size','The size defines how far each window spans.'],
      ['Slide interval','The slide creates overlapping window start positions.'],
      ['Multiple assignments','One event updates every overlapping eligible window.'],
      ['Window emissions','Each window closes independently as its end passes the watermark.']
    ]],
    ['Streaming & Real-Time Processing::Session windows',[
      ['Keyed event','An event starts or extends a session for its key.'],
      ['Inactivity gap','Events within the gap remain in the same session.'],
      ['Session state','The aggregate and latest event time advance.'],
      ['Late bridge','A late event may merge two previously separate sessions.'],
      ['Session close','Watermark plus allowed lateness passes the session end.']
    ]],
    ['Streaming & Real-Time Processing::Watermarks',[
      ['Partition events','Partitions deliver timestamps at different and out-of-order rates.'],
      ['Partition watermark','Each source estimates that earlier events are mostly complete.'],
      ['Global watermark','The operator takes a safe minimum across active partitions.'],
      ['Window trigger','Windows ending before the watermark emit or finalize.'],
      ['Late path','Events behind the watermark follow update, side-output, or drop policy.']
    ]],
    ['Streaming & Real-Time Processing::Event time vs processing time',[
      ['Real-world event','A timestamp records when the event occurred.'],
      ['Transport delay','Buffering and retries delay arrival without changing event time.'],
      ['Processing clock','The engine observes a later local processing time.'],
      ['Time choice','Operators select event time for reproducibility or processing time for simplicity.'],
      ['Result behavior','The choice determines windows, latency, and late-data handling.']
    ]],
    ['Streaming & Real-Time Processing::Late events',[
      ['Window result','A watermark causes an initial window result to emit.'],
      ['Late event','A relevant event arrives after that emission.'],
      ['Allowed lateness','Policy determines whether the event remains admissible.'],
      ['Correction','The system drops, side-outputs, updates, or retracts the old result.'],
      ['Final cleanup','After the lateness horizon, window state is removed.']
    ]],
    ['Streaming & Real-Time Processing::Out-of-order events',[
      ['Event A','A logically earlier event is delayed in transport.'],
      ['Event B','A later event arrives and is processed first.'],
      ['Reorder buffer','The operator buffers by key and timestamp within a bounded horizon.'],
      ['Watermark','Progress indicates when waiting longer is no longer justified.'],
      ['Ordered effect','Buffered events emit in order or corrections repair earlier output.']
    ]],
    ['Streaming & Real-Time Processing::Stateful stream processing',[
      ['Key partitioner','Related events route to one logical keyed operator.'],
      ['Operator state','The operator reads and updates durable logical state per event.'],
      ['State backend','Memory and local storage hold working state efficiently.'],
      ['Checkpoint','A consistent snapshot captures state and input offsets.'],
      ['Recovery','A replacement operator restores state and resumes from captured offsets.']
    ]],
    ['Streaming & Real-Time Processing::Checkpointing',[
      ['Source barrier','A checkpoint marker enters every input partition.'],
      ['Operators','Operators align or track barriers while processing records.'],
      ['State snapshot','Each operator persists a consistent state version.'],
      ['Sink coordination','Transactional sinks prepare output for the same checkpoint.'],
      ['Checkpoint commit','The coordinator commits state, source progress, and prepared output.']
    ]],
    ['Streaming & Real-Time Processing::Exactly-once processing',[
      ['Source offsets','The processor reads records after the last committed checkpoint.'],
      ['Operator state','Records deterministically update versioned state.'],
      ['Transactional sink','Outputs remain pending under the checkpoint identity.'],
      ['Checkpoint commit','Offsets, state, and sink transaction commit as one logical boundary.'],
      ['Replay','Failure replays records but replaces or deduplicates the same logical effects.']
    ]],
    ['Streaming & Real-Time Processing::Stream joins',[
      ['Left stream','A keyed left event enters with event time.'],
      ['Left state','The event is retained for the configured join interval.'],
      ['Right stream','A matching right event arrives within the time bounds.'],
      ['Join operator','Key and temporal predicates produce joined records.'],
      ['Eviction','Watermarks expire unmatched state and trigger outer-join behavior.']
    ]],
    ['Streaming & Real-Time Processing::Stream aggregation',[
      ['Keyed event','Partitioning sends the event to its aggregate key.'],
      ['Accumulator','An associative state update incorporates the event.'],
      ['Trigger','Count, time, change, or watermark requests an emission.'],
      ['Aggregate output','The current result emits as append, update, or retraction.'],
      ['Recovery state','Checkpointed accumulator state survives worker failure.']
    ]],
    ['Streaming & Real-Time Processing::Windowed aggregation',[
      ['Timestamped record','The record maps to a key and one or more windows.'],
      ['Window accumulator','Per-key per-window state incorporates the value.'],
      ['Watermark','Event-time progress reaches the window end.'],
      ['Initial result','The aggregate emits with a window identity and version.'],
      ['Late update','Admissible late events revise or retract the prior result.']
    ]],
    ['Streaming & Real-Time Processing::Deduplication',[
      ['Event identity','Each logical event carries a stable unique identifier.'],
      ['Seen-state lookup','The operator checks retained IDs or sequence progress.'],
      ['First arrival','An unseen event updates business state and records its ID atomically.'],
      ['Duplicate arrival','A repeated ID is suppressed without repeating the effect.'],
      ['Retention expiry','Seen-state is removed only after the duplicate horizon.']
    ]],
    ['Streaming & Real-Time Processing::CEP / Complex Event Processing',[
      ['Event sequence','Typed keyed events arrive with timestamps.'],
      ['Pattern automaton','Each event advances or branches partial pattern matches.'],
      ['Temporal constraints','Timers expire paths that exceed the allowed interval.'],
      ['Completed match','A valid sequence emits a complex-event detection.'],
      ['Overlap policy','The engine retains, skips, or consumes events for competing matches.']
    ]],
    ['Streaming & Real-Time Processing::Backpressure',[
      ['Slow sink','Downstream service time increases and output buffers fill.'],
      ['Demand signal','The consumer reduces credits or stops requesting more records.'],
      ['Upstream operators','Operators slow reads and propagate pressure toward sources.'],
      ['Source retention','Durable input accumulates lag instead of overwhelming memory.'],
      ['Recovery','Credits rise gradually as downstream capacity returns.']
    ]],
    ['Streaming & Real-Time Processing::Replay',[
      ['Retained log','Immutable events remain addressable by partition and offset.'],
      ['Replay start','A checkpoint, timestamp, or offset selects the restart position.'],
      ['Versioned processor','Compatible code and schemas deterministically reprocess events.'],
      ['Isolated sink','Outputs are deduplicated, overwritten by version, or written separately.'],
      ['Catch-up','Replay reaches the live head before normal consumption resumes.']
    ]],
    ['Streaming & Real-Time Processing::Event-time processing',[
      ['Event timestamp','The producer records when the domain event actually occurred.'],
      ['Out-of-order transport','Partitions and retries change arrival order.'],
      ['Event-time operator','Windows and timers use event timestamps rather than wall-clock arrival.'],
      ['Watermark','Progress estimates when earlier event time is sufficiently complete.'],
      ['Correction policy','Late events update, retract, side-output, or drop explicitly.']
    ]],
    ['Distributed Data Processing::MapReduce',[
      ['Input splits','Large input is divided into independently readable partitions.'],
      ['Map tasks','Mappers transform records into intermediate key-value pairs.'],
      ['Shuffle','Intermediate pairs move to reducers by key.'],
      ['Reduce tasks','Reducers combine all values for each key.'],
      ['Output files','Partitioned final results commit after successful task attempts.']
    ]],
    ['Distributed Data Processing::Shuffle',[
      ['Producer tasks','Upstream tasks emit records with partitioning keys.'],
      ['Partitioner','A hash or range function chooses the destination task.'],
      ['Shuffle files','Records buffer, sort, spill, and transfer across the network.'],
      ['Consumer tasks','Downstream tasks fetch every partition addressed to them.'],
      ['Merge','Fetched runs merge into grouped or ordered input.']
    ]],
    ['Distributed Data Processing::Partitioning',[
      ['Dataset','Records expose a partition key or input location.'],
      ['Partition function','Hash, range, or round-robin maps records to task partitions.'],
      ['Parallel tasks','Each task processes its disjoint assigned subset.'],
      ['Boundary operation','Cross-partition joins or aggregates trigger movement.'],
      ['Repartition','Skew or changed parallelism creates a new balanced mapping.']
    ]],
    ['Distributed Data Processing::Distributed aggregation',[
      ['Input partitions','Workers independently scan their local records.'],
      ['Partial aggregates','Each worker builds mergeable state per key.'],
      ['Aggregation tree','Partial states move through bounded fan-in stages.'],
      ['Merge function','Associative combination produces larger summaries.'],
      ['Global result','The root or final partitions emit complete aggregates.']
    ]],
    ['Distributed Data Processing::Combiners',[
      ['Mapper output','A mapper emits many intermediate values for repeated keys.'],
      ['Local combiner','A merge-safe function reduces values before transfer.'],
      ['Combined pairs','Smaller partial states retain enough information for final reduction.'],
      ['Shuffle','Only combined key-state pairs cross the network.'],
      ['Reducer','The reducer merges every partial state into the correct final result.']
    ]],
    ['Distributed Data Processing::Map-side aggregation',[
      ['Map input','A mapper reads records from its local split.'],
      ['In-memory table','Values aggregate by key before serialization.'],
      ['Spill threshold','Memory pressure flushes sorted partial aggregates to disk.'],
      ['Shuffle output','Merged partial states transfer instead of raw records.'],
      ['Final reducer','Reducers combine partials across all mappers.']
    ]],
    ['Distributed Data Processing::Reduce-side aggregation',[
      ['Mapped records','All raw or partially combined key-value pairs are emitted.'],
      ['Shuffle partition','The same key routes to the same reducer.'],
      ['Sort and group','Reducer input groups every value for each key.'],
      ['Reduce function','The reducer computes the complete aggregate.'],
      ['Partitioned output','Each reducer commits its key-range results.']
    ]],
    ['Distributed Data Processing::Distributed joins',[
      ['Left dataset','Rows expose a join key across many partitions.'],
      ['Right dataset','Rows from the second input expose the same logical key.'],
      ['Join strategy','Size, ordering, skew, and partitioning select broadcast, hash, or merge.'],
      ['Co-location','Matching keys reach the same worker or local lookup structure.'],
      ['Joined output','Workers emit matches and required unmatched rows.']
    ]],
    ['Distributed Data Processing::Broadcast joins',[
      ['Small relation','The planner verifies one input fits each worker budget.'],
      ['Broadcast','The small relation is serialized and copied to all workers.'],
      ['Local hash table','Each worker indexes its local copy by join key.'],
      ['Large partitions','Large-input records stay local and probe the hash table.'],
      ['Joined rows','Workers emit results without shuffling the large relation.']
    ]],
    ['Distributed Data Processing::Hash joins',[
      ['Build input','The chosen relation is partitioned and hashed by join key.'],
      ['Hash table','Each worker builds key buckets, spilling if memory is exceeded.'],
      ['Probe input','The other relation uses the same partitioning and hash function.'],
      ['Bucket probe','Matching key buckets produce joined rows.'],
      ['Skew path','Heavy keys are split or handled by a specialized plan.']
    ]],
    ['Distributed Data Processing::Sort-merge joins',[
      ['Left input','Left rows are partitioned and sorted by join key.'],
      ['Right input','Right rows receive compatible partitioning and ordering.'],
      ['Merge cursors','Two ordered cursors advance until keys align.'],
      ['Match groups','Equal-key runs produce the required Cartesian matches.'],
      ['Unmatched rows','Outer-join policy emits unmatched runs as cursors advance.']
    ]],
    ['Distributed Data Processing::Data locality',[
      ['Input blocks','Storage metadata records which workers or racks hold each block.'],
      ['Runnable task','A task declares the blocks it must scan.'],
      ['Locality-aware scheduler','The scheduler prefers a worker already holding the data.'],
      ['Local read','The worker reads local disk instead of transferring the full block.'],
      ['Delay fallback','After bounded waiting, rack-local or remote execution preserves progress.']
    ]],
    ['Distributed Data Processing::Skew handling',[
      ['Key histogram','Sampling or runtime metrics reveal disproportionate keys.'],
      ['Heavy-key plan','Large keys are isolated, salted, or replicated separately.'],
      ['Parallel subpartitions','Heavy-key records spread across additional workers.'],
      ['Normal partitions','Non-skewed keys retain the inexpensive default path.'],
      ['Final merge','Partial heavy-key results recombine into one logical result.']
    ]],
    ['Distributed Data Processing::Stragglers',[
      ['Parallel stage','Many equivalent tasks begin processing their partitions.'],
      ['Progress metrics','The coordinator compares duration and throughput among peers.'],
      ['Slow task','One task falls far behind because of skew, contention, or hardware.'],
      ['Mitigation','The scheduler relocates, repartitions, or speculates the task.'],
      ['Stage barrier','The stage completes only after one valid result for every partition.']
    ]],
    ['Distributed Data Processing::Speculative execution',[
      ['Task cohort','Comparable tasks establish an expected progress distribution.'],
      ['Straggler detector','A slow attempt crosses the speculation threshold.'],
      ['Duplicate attempt','The same deterministic task starts on another worker.'],
      ['Race','Both attempts run against the same immutable input.'],
      ['Winner commit','The first valid output commits and the losing attempt is cancelled.']
    ]],
    ['Distributed Data Processing::Checkpointing',[
      ['Long computation','A multi-stage job accumulates expensive intermediate progress.'],
      ['Checkpoint boundary','The engine selects consistent state and completed partitions.'],
      ['Durable checkpoint','State and lineage references persist outside worker-local storage.'],
      ['Worker failure','Volatile task state disappears after a crash.'],
      ['Restart','The job resumes from the checkpoint instead of recomputing all ancestors.']
    ]],
    ['Search & Retrieval::Inverted index',[
      ['Documents','Source documents enter the analysis pipeline.'],
      ['Analyzer','Tokenization, normalization, and filtering produce terms.'],
      ['Term dictionary','Each term maps to its postings location and statistics.'],
      ['Postings lists','Document IDs, frequencies, and positions are stored per term.'],
      ['Query evaluator','Posting intersections and unions produce lexical candidates.']
    ]],
    ['Search & Retrieval::Forward index',[
      ['Document ID','A stable document identity selects one forward-index record.'],
      ['Analyzed fields','The document becomes terms, frequencies, and stored features.'],
      ['Forward entry','All document-associated terms and values are stored together.'],
      ['Document update','The old forward entry identifies terms that must be removed.'],
      ['Downstream use','Ranking, snippets, or inverted-index maintenance reads the entry.']
    ]],
    ['Search & Retrieval::TF-IDF',[
      ['Query term','A query term is matched against candidate documents.'],
      ['Term frequency','Repeated occurrences increase within-document importance.'],
      ['Document frequency','Corpus statistics measure how common the term is.'],
      ['Inverse document frequency','Rare terms receive more global weight than common terms.'],
      ['Document score','Term weights combine across the query to rank candidates.']
    ]],
    ['Search & Retrieval::BM25',[
      ['Query terms','Analyzed query terms retrieve candidate postings.'],
      ['Term frequency saturation','Repeated terms add diminishing score gains.'],
      ['Inverse document frequency','Rare matching terms contribute more score.'],
      ['Length normalization','Document length adjusts raw term-frequency evidence.'],
      ['BM25 score','Weighted term contributions sum into lexical ranking.']
    ]],
    ['Search & Retrieval::Sharded search',[
      ['Document router','Each document maps to one search shard by stable partitioning.'],
      ['Shard indexes','Every shard builds a searchable index for its corpus subset.'],
      ['Query coordinator','A query targets all or selected relevant shards.'],
      ['Shard top results','Each shard returns locally ranked candidates and scores.'],
      ['Global merge','The coordinator merges candidates into one global result page.']
    ]],
    ['Search & Retrieval::Scatter-gather search',[
      ['Coordinator','The frontend parses a query and chooses target shards.'],
      ['Scatter','Parallel subqueries fan out with a shared deadline.'],
      ['Shard search','Each shard retrieves and ranks its local candidates.'],
      ['Gather','Partial top lists and failure metadata return to the coordinator.'],
      ['Merge','Scores, ties, and partial-result policy produce the response.']
    ]],
    ['Search & Retrieval::Query fan-out',[
      ['User query','One request requires data from multiple index partitions.'],
      ['Fan-out planner','Routing metadata creates bounded parallel shard requests.'],
      ['Shard calls','Subqueries run under one propagated deadline and cancellation context.'],
      ['Tail control','Slow or failed shards are hedged, skipped, or reported by policy.'],
      ['Result reduction','Partial responses combine into one answer.']
    ]],
    ['Search & Retrieval::Query routing',[
      ['Query features','Terms, filters, language, tenant, or vector metadata are extracted.'],
      ['Routing index','Metadata identifies shards that may contain matching documents.'],
      ['Shard selection','Only eligible shards receive the query.'],
      ['Fallback','Uncertain routing can broaden search to preserve recall.'],
      ['Feedback','Observed misses and distribution changes update routing metadata.']
    ]],
    ['Search & Retrieval::Search index replication',[
      ['Index primary','One ingest path creates a versioned segment or operation log.'],
      ['Replica transfer','Immutable segments or ordered updates copy to query replicas.'],
      ['Replica activation','Checksums and version metadata make a complete version searchable.'],
      ['Query routing','Traffic spreads across healthy replicas at acceptable freshness.'],
      ['Replica repair','Lagging copies fetch missing segments or rebuild from source.']
    ]],
    ['Search & Retrieval::Index building',[
      ['Source snapshot','A consistent corpus version defines the build input.'],
      ['Document pipeline','Parsing and enrichment produce searchable fields.'],
      ['Analyzer','Text and features become terms, vectors, and statistics.'],
      ['Segment writer','Sorted postings and stored fields form immutable index segments.'],
      ['Publish','Validated segments become visible through a versioned manifest.']
    ]],
    ['Search & Retrieval::Incremental indexing',[
      ['Change feed','Creates, updates, and deletes arrive with durable positions.'],
      ['Document fetch','The indexer obtains the current source version.'],
      ['Small segment','Changed documents produce a newly searchable immutable segment.'],
      ['Delete marker','Old document versions are masked by version or tombstone.'],
      ['Segment merge','Background merging consolidates changes and reclaims obsolete data.']
    ]],
    ['Search & Retrieval::Near-real-time indexing',[
      ['Document update','A source mutation enters the indexing buffer.'],
      ['In-memory buffer','Analysis creates postings not yet visible to searchers.'],
      ['Refresh interval','A frequent refresh writes or opens a small segment.'],
      ['Searcher reopen','Queries atomically see the new index version.'],
      ['Merge policy','Background merges control small-segment query overhead.']
    ]],
    ['Search & Retrieval::Ranking',[
      ['Candidate set','Retrieval produces documents likely to match the query.'],
      ['Feature extraction','Lexical, semantic, quality, freshness, and context signals are computed.'],
      ['Scoring model','A model combines features into comparable scores.'],
      ['Policy layer','Safety, diversity, and business constraints adjust ordering.'],
      ['Ranked results','The highest eligible documents form the response.']
    ]],
    ['Search & Retrieval::Top-K retrieval',[
      ['Candidate scores','A shard or operator produces scored candidates.'],
      ['Bounded heap','Only the best K candidates seen so far are retained.'],
      ['Threshold','The current worst retained score prunes weaker candidates.'],
      ['Shard over-fetch','Distributed shards return more than K to protect global recall.'],
      ['Global top K','The coordinator merges partial heaps into the final K results.']
    ]],
    ['Search & Retrieval::Approximate nearest neighbor (ANN)',[
      ['Query embedding','The query maps to a vector in the indexed metric space.'],
      ['ANN structure','A graph, partition, or quantized index narrows candidate vectors.'],
      ['Approximate traversal','The search explores promising regions under a work budget.'],
      ['Candidate distances','Exact or refined distances score the shortlist.'],
      ['Nearest results','Top candidates return with measured recall-latency tradeoff.']
    ]],
    ['Search & Retrieval::HNSW',[
      ['Query vector','Search begins at an entry point in the top graph layer.'],
      ['Upper layers','Greedy hops move quickly toward the query neighborhood.'],
      ['Layer descent','The best found node seeds search in each denser lower layer.'],
      ['Base-layer frontier','A bounded candidate queue explores nearby graph neighbors.'],
      ['Nearest neighbors','The best distance-ranked visited nodes become results.']
    ]],
    ['Search & Retrieval::IVF',[
      ['Training vectors','Clustering learns coarse centroid partitions.'],
      ['Vector assignment','Each indexed vector joins its nearest centroid list.'],
      ['Query vector','The query computes distances to coarse centroids.'],
      ['Probe lists','The nearest configured centroid lists are scanned.'],
      ['Rerank','Candidate vector distances produce final nearest neighbors.']
    ]],
    ['Search & Retrieval::Vector indexes',[
      ['Embedding pipeline','Documents become versioned vectors from a known model.'],
      ['Vector index','Vectors enter exact or approximate similarity structures.'],
      ['Query embedding','The same compatible model embeds the query.'],
      ['Similarity search','Metric-specific traversal retrieves close candidates.'],
      ['Filtered ranking','Metadata filters and optional reranking produce final results.']
    ]],
    ['Distributed Algorithms::BFS / DFS',[
      ['Start vertex','Traversal initializes the start as discovered.'],
      ['Frontier structure','BFS uses a queue while DFS uses a stack or recursion.'],
      ['Vertex expansion','The next frontier vertex exposes unvisited neighbors.'],
      ['Discovery marks','Neighbors are marked before enqueue or push to prevent repeats.'],
      ['Completion','Traversal ends when the frontier is empty or the target is found.']
    ]],
    ['Distributed Algorithms::Dijkstra',[
      ['Source','The source distance is zero and all others begin infinite.'],
      ['Priority queue','The unsettled vertex with smallest tentative distance is selected.'],
      ['Edge relaxation','Nonnegative outgoing edges propose shorter neighbor distances.'],
      ['Settled set','The selected vertex distance becomes final.'],
      ['Shortest paths','Predecessors reconstruct paths after reachable vertices settle.']
    ]],
    ['Distributed Algorithms::Bellman-Ford',[
      ['Source distances','The source starts at zero and other vertices at infinity.'],
      ['Edge pass','Every edge attempts to relax its destination distance.'],
      ['Repeated passes','Up to vertex-count minus one passes propagate shortest paths.'],
      ['Early stop','A pass with no updates proves convergence.'],
      ['Cycle check','One more relaxation identifies a reachable negative cycle.']
    ]],
    ['Distributed Algorithms::Minimum spanning tree',[
      ['Weighted graph','Connected vertices and weighted edges define the problem.'],
      ['Candidate edges','A cut exposes edges that can safely extend connectivity.'],
      ['Cycle guard','Only edges joining separate components are accepted.'],
      ['Tree growth','Accepted minimum edges merge components.'],
      ['Spanning result','Vertex-count minus one edges connect every vertex at minimum cost.']
    ]],
    ['Distributed Algorithms::Kruskal',[
      ['Edge list','All graph edges are ordered by nondecreasing weight.'],
      ['Union-Find','Each vertex begins in its own component.'],
      ['Next edge','The lightest remaining edge is examined.'],
      ['Cycle test','Edges connecting different components are accepted and unioned.'],
      ['Spanning tree','Processing stops after vertex-count minus one accepted edges.']
    ]],
    ['Distributed Algorithms::Prim',[
      ['Start vertex','One arbitrary vertex seeds the growing tree.'],
      ['Frontier heap','Edges crossing from the tree to outside vertices enter a min-heap.'],
      ['Minimum edge','The cheapest edge to an unvisited vertex is selected.'],
      ['Tree expansion','The new vertex and edge join the tree and add new frontier edges.'],
      ['Completion','Growth continues until every vertex is included.']
    ]],
    ['Distributed Algorithms::Topological sort',[
      ['Directed graph','Dependencies define edges from prerequisites to dependents.'],
      ['In-degree table','Each vertex counts unresolved incoming dependencies.'],
      ['Ready queue','Zero-in-degree vertices are eligible for output.'],
      ['Edge removal','Output vertices decrement their dependents and unlock new work.'],
      ['Cycle detection','Remaining vertices after the queue empties prove a cycle.']
    ]],
    ['Distributed Algorithms::Union-Find',[
      ['Singleton sets','Each element starts as its own parent and component.'],
      ['Find','Parent pointers lead to the representative root.'],
      ['Path compression','Visited elements point directly toward the representative.'],
      ['Union by rank','Two roots merge by attaching the shallower tree.'],
      ['Connectivity query','Equal representatives mean two elements share a component.']
    ]],
    ['Distributed Algorithms::Consistent hashing',[
      ['Hash ring','Members occupy deterministic positions, often through virtual nodes.'],
      ['Key point','The key hashes into the same circular space.'],
      ['Owner selection','Clockwise successors select the owner and replicas.'],
      ['Member change','A member joins, leaves, or changes weight.'],
      ['Key transfer','Only affected ring intervals move to new owners.']
    ]],
    ['Distributed Algorithms::Gossip',[
      ['Local state','Each member holds its current versioned membership or data summary.'],
      ['Random peer','Periodically the member selects another peer.'],
      ['Exchange','Peers send digests and missing newer values.'],
      ['Merge','Version rules incorporate updates and ignore older duplicates.'],
      ['Convergence','Repeated exchanges spread state across healthy members.']
    ]],
    ['Distributed Algorithms::Leader election',[
      ['Followers','Participants begin by observing the current term and leader heartbeat.'],
      ['Election timeout','A follower times out and increments the term.'],
      ['Candidate','The candidate requests votes with its log or priority evidence.'],
      ['Quorum','A majority grants one candidate leadership for the term.'],
      ['Leader','The winner sends heartbeats and stale-term commands are rejected.']
    ]],
    ['Distributed Algorithms::Distributed consensus',[
      ['Proposal','A client value enters a numbered consensus round.'],
      ['Leader or proposer','One proposer orders the value for a log position.'],
      ['Quorum replication','A majority durably accepts compatible round state.'],
      ['Commit','Quorum intersection makes the chosen value survive leader changes.'],
      ['State machines','Replicas apply committed values in the same order.']
    ]],
    ['Distributed Algorithms::Distributed snapshots',[
      ['Initiator','One process records its local state and sends snapshot markers.'],
      ['Incoming channels','A process records messages arriving before each channel marker.'],
      ['Peer processes','First marker receipt triggers local-state recording and marker forwarding.'],
      ['Channel states','Messages between local recording and marker receipt represent in-flight state.'],
      ['Global snapshot','Recorded process and channel states form one consistent cut.']
    ]],
    ['Distributed Algorithms::Distributed sorting',[
      ['Input partitions','Workers sample keys from their local unsorted records.'],
      ['Range boundaries','Aggregated samples choose balanced global key ranges.'],
      ['Shuffle','Records move to the worker owning their key range.'],
      ['Local sort','Each worker sorts its received range independently.'],
      ['Ordered output','Concatenating range partitions yields global order.']
    ]],
    ['Distributed Algorithms::Distributed aggregation',[
      ['Data partitions','Workers hold disjoint portions of the dataset.'],
      ['Local summaries','Each worker computes mergeable aggregate state.'],
      ['Reduction tree','Partial states combine through parallel bounded-fan-in levels.'],
      ['Duplicate guard','Task attempt identities prevent double-counting retried partitions.'],
      ['Final aggregate','The root merge emits the global result.']
    ]],
  ]);
  const makeVisual = stages => ({
    nodes:stages.map(([label,state])=>[label,state]),
    steps:stages.map(([,text],activeIndex)=>[
      activeIndex,
      Array.from({length:activeIndex},(_,completedIndex)=>completedIndex),
      text
    ])
  });
  for (const chapter of window.SYSTEM_DESIGN_CHAPTERS.slice(-9)) {
    for (const concept of chapter.groups.flatMap(group=>group.concepts)) {
      const key = `${chapter.title}::${concept.name}`;
      const stages = visualSpecs.get(key);
      if (!stages) throw new Error(`Missing visual specification: ${key}`);
      concept.visual = makeVisual(stages);
    }
  }
}

window.applySystemDesignDiagrams2();
delete window.applySystemDesignDiagrams2;
