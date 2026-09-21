(function () {
  'use strict';

  const mechanisms = {};
  const specs = {};
  const positions = [[18,22],[72,18],[82,72],[24,80]];
  const ids = ['a','b','c','d'];

  function spec(name, nodes, linkLabels) {
    specs[name] = {nodes, linkLabels};
  }

  function use(chapterId, conceptName, sourceName, context) {
    const source = specs[sourceName || conceptName];
    const components = source.nodes.map((node, index) => {
      const parts = node.split('|');
      const detail = index === 0 && context ? `${parts[1]} for ${context}` : parts[1];
      return [ids[index], parts[0], detail, parts[2], positions[index][0], positions[index][1]];
    });
    const pairs = [[0,1],[1,2],[2,3],[3,1]];
    const links = pairs.map((pair, index) => [
      ids[pair[0]],
      ids[pair[1]],
      index === 3 && context ? `${source.linkLabels[index]} (${context})` : source.linkLabels[index]
    ]);
    const frames = links.map((link, index) => {
      const states = {};
      for (let i = 0; i < index; i += 1) {
        states[links[i][0]] = 'done';
        states[links[i][1]] = 'done';
      }
      states[link[0]] = 'active';
      states[link[1]] = 'active';
      return [index, states];
    });
    const clauses = components.map(component => component[2]);
    const steps = [
      `The mechanism starts at ${components[0][1]}, which ${clauses[0]}.`,
      `It advances to ${components[1][1]}, which ${clauses[1]}.`,
      `Next, ${components[2][1]} ${clauses[2]}.`,
      `Finally, ${components[3][1]} ${clauses[3]}.`
    ];
    mechanisms[`${chapterId}::${conceptName}`] = {
      title:`How ${conceptName} works`,
      diagram:{kind:'mechanism',components,links,frames},
      steps
    };
  }

  spec('Leaky bucket',[
    'Arrival queue|buffers bursts up to a finite capacity|queue',
    'Leak clock|releases one unit at each fixed tick|clock',
    'Drain gate|admits queued work at the configured rate|control',
    'Overflow policy|rejects arrivals when the queue is full|control'
  ],['enqueue burst','tick at fixed rate','release one unit','signal overflow']);
  spec('Fixed window',[
    'Window key|selects the counter for the current interval|clock',
    'Request counter|increments atomically for each arrival|database',
    'Limit check|admits counts no greater than the quota|control',
    'Boundary reset|starts a new counter at the next interval|clock'
  ],['select interval','increment count','compare with limit','rotate counter']);
  spec('Sliding window',[
    'Timestamp log|stores each admitted request time|storage',
    'Expiry cutoff|defines the exact trailing interval|clock',
    'Log trimmer|removes timestamps older than the cutoff|worker',
    'Rolling count|admits only when retained entries stay below quota|control'
  ],['append timestamp','compute cutoff','evict old entries','count retained']);
  spec('Sliding window counter',[
    'Previous counter|holds the completed interval count|database',
    'Elapsed fraction|measures progress through the current interval|clock',
    'Current counter|tracks arrivals in the active interval|database',
    'Weighted estimate|adds current count to the decayed previous count|control'
  ],['read prior count','calculate weight','read current count','estimate rolling load']);

  spec('Lamport clocks',[
    'Local counter|increments before every local or send event|clock',
    'Stamped message|carries the sender logical timestamp|queue',
    'Receive rule|sets the clock to max local and received plus one|control',
    'Node tie-breaker|orders equal timestamps deterministically|node'
  ],['stamp event','send timestamp','merge clocks','break equal values']);
  spec('Vector clocks',[
    'Writer vector|increments its own participant component|clock',
    'Version metadata|travels with the update or message|storage',
    'Component merge|takes the maximum value at every position|control',
    'Partial-order check|detects ancestor, descendant, or concurrency|control'
  ],['increment own slot','attach vector','merge maxima','compare vectors']);
  spec('Hybrid logical clocks',[
    'Physical part|tracks the greatest observed wall-clock time|clock',
    'Logical part|counts events sharing or exceeding that time|clock',
    'Remote timestamp|supplies another physical and logical pair|queue',
    'Merge rule|chooses max physical time and advances causality|control'
  ],['read wall time','advance counter','receive remote pair','merge timestamp']);
  spec('FIFO ordering',[
    'Producer sequence|assigns increasing numbers within one sender scope|node',
    'Ordered channel|retains messages by producer and partition|queue',
    'Next expected|records the next deliverable sequence number|database',
    'Reorder buffer|holds gaps until missing earlier messages arrive|storage'
  ],['number message','append in order','check expected value','release contiguous run']);
  spec('Causal ordering',[
    'Dependency clock|records events that happened before the message|clock',
    'Causal message|carries payload and dependency metadata|queue',
    'Delivery guard|waits until every predecessor is locally visible|control',
    'Pending buffer|rechecks blocked messages as dependencies arrive|storage'
  ],['capture dependencies','send metadata','test readiness','release after predecessors']);
  spec('Total ordering',[
    'Concurrent proposals|arrive from independent producers|queue',
    'Ordering authority|assigns one monotonically increasing position|control',
    'Replicated log|persists the same sequence at all participants|storage',
    'Delivery cursor|exposes entries only in agreed position order|database'
  ],['submit proposals','assign position','replicate sequence','deliver next entry']);

  spec('Paxos',[
    'Proposer ballot|starts a uniquely numbered prepare round|control',
    'Acceptor quorum|promises to reject lower ballot numbers|node',
    'Prior accepted value|forces preservation of an already choosable value|storage',
    'Learner decision|observes majority acceptance of one value|replica'
  ],['send prepare','collect promises','send safe accept','learn chosen value']);
  spec('Raft',[
    'Election term|advances when a follower times out|clock',
    'Candidate votes|require a majority and an up-to-date log|node',
    'Leader log|appends commands in one term-index sequence|storage',
    'Commit index|advances after majority replication|replica'
  ],['start election','grant majority','append entry','commit replicated prefix']);
  spec('Leader election',[
    'Election timeout|causes a participant to enter a newer epoch|clock',
    'Candidate record|contains epoch and freshness evidence|node',
    'Voter quorum|grants at most one vote in the epoch|replica',
    'Leader epoch|authorizes one winner and fences older owners|control'
  ],['timeout expires','request votes','form majority','publish authority']);
  spec('Quorum consensus',[
    'Proposal round|identifies one decision attempt and value|control',
    'Voter set|persists votes before acknowledging them|node',
    'Intersecting quorum|contains a majority that overlaps later rounds|replica',
    'Chosen decision|survives failures through retained quorum evidence|storage'
  ],['open round','persist votes','reach intersection','record decision']);
  spec('Compare-and-swap',[
    'Expected version|states the value or revision the caller observed|client',
    'Atomic comparator|reads and compares without an intervening write|control',
    'Replacement value|becomes visible only when the comparison matches|database',
    'Retry loop|reloads the winner after a failed comparison|worker'
  ],['submit expectation','compare atomically','swap on match','retry on conflict']);
  spec('Fencing tokens',[
    'Lease grant|allocates an increasing ownership generation|control',
    'Token holder|attaches its generation to every protected write|client',
    'Protected resource|remembers the greatest accepted generation|database',
    'Stale rejection|denies writes carrying an older token|control'
  ],['issue generation','attach token','compare maximum','reject old owner']);
  spec('Leases',[
    'Lease record|names the owner, expiry, and generation|database',
    'Renewal clock|refreshes authority before the safety margin|clock',
    'Expiry decision|allows reassignment after bounded time passes|control',
    'Fenced resource|rejects work from an expired generation|storage'
  ],['grant interval','renew before margin','expire ownership','enforce generation']);

  spec('Hash partitioning',[
    'Partition key|provides the stable bytes used for placement|client',
    'Hash function|maps the key uniformly into a numeric space|control',
    'Bucket modulus|reduces the hash to one partition identifier|index',
    'Shard owner|stores every key assigned to that bucket|database'
  ],['hash key','map hash to bucket','resolve bucket owner','store on shard']);
  spec('Consistent hashing',[
    'Hash ring|orders the complete token space circularly|index',
    'Node tokens|mark ownership positions for physical members|node',
    'Key token|maps a key to its clockwise ring position|client',
    'Successor owner|receives the key until a nearer token joins|database'
  ],['place node tokens','hash key on ring','walk clockwise','move adjacent range']);
  spec('Rendezvous hashing',[
    'Candidate nodes|enumerate eligible owners and capacity weights|node',
    'Key-node scores|hash each key together with every candidate|control',
    'Ranked owners|sort candidates by deterministic score|index',
    'Highest winner|owns the key with minimal change on membership updates|database'
  ],['enumerate candidates','compute scores','rank descending','select winner']);
  spec('Virtual nodes',[
    'Physical members|advertise capacity and failure identity|node',
    'Virtual tokens|place many weighted ownership points per member|index',
    'Key ranges|map small ring intervals to individual tokens|storage',
    'Transfer plan|moves selected token ranges during rebalancing|control'
  ],['assign token count','spread tokens','map ranges','move small ranges']);

  spec('Bloom filter',[
    'Key hashes|derive several independent bit positions|control',
    'Bit array|sets every derived position during insertion|bitset',
    'Membership probe|tests all positions for a queried key|client',
    'Decision rule|returns absent on any zero or maybe present otherwise|control'
  ],['hash inserted key','set all bits','probe same positions','classify membership']);
  spec('Counting Bloom filter',[
    'Key hashes|derive counter positions for each item|control',
    'Counter array|increments all selected counters on insertion|bitset',
    'Delete operation|decrements the same counters without crossing zero|worker',
    'Membership probe|requires every selected counter to be positive|client'
  ],['locate counters','increment counters','decrement on delete','test positive counts']);
  spec('Cuckoo filter',[
    'Fingerprint|stores a short hash rather than the full key|bitset',
    'Two buckets|derive alternate candidate locations from the fingerprint|index',
    'Eviction chain|relocates occupants when both buckets are full|worker',
    'Lookup probe|checks both buckets for a matching fingerprint|client'
  ],['make fingerprint','probe two buckets','kick occupant','match fingerprint']);
  spec('Quotient filter',[
    'Hash split|divides each hash into quotient and remainder|control',
    'Quotient slot|chooses the canonical array position|index',
    'Remainder run|stores sorted remainders with cluster metadata|storage',
    'Probe scan|walks the encoded run to test membership|client'
  ],['split hash','locate quotient','insert remainder','scan matching run']);
  spec('HyperLogLog',[
    'Hashed item|yields a register index and trailing bit pattern|control',
    'Leading-zero rank|estimates rarity from the remaining hash bits|bitset',
    'Register bank|keeps the maximum observed rank per index|storage',
    'Harmonic estimator|combines registers into a cardinality estimate|control'
  ],['hash item','measure zero run','update maximum','estimate distinct count']);
  spec('HyperLogLog++',[
    'Sparse encoding|stores exact-like hashed entries at low cardinality|storage',
    'Dense registers|take over after the sparse threshold is crossed|bitset',
    'Bias correction|adjusts systematic error using calibrated estimates|control',
    'Cardinality estimate|selects corrected sparse or dense output|client'
  ],['record sparse hashes','convert to registers','correct raw estimate','emit cardinality']);
  spec('Count-Min Sketch',[
    'Hash rows|map an item to one counter in each row|control',
    'Counter matrix|increments every selected counter|bitset',
    'Frequency query|reads the same positions for the item|client',
    'Minimum estimate|returns the smallest count to bound overestimation|control'
  ],['hash across rows','increment counters','read row values','take minimum']);
  spec('Heavy hitters',[
    'Frequency stream|supplies weighted keys one update at a time|queue',
    'Candidate table|tracks a bounded set of likely frequent keys|storage',
    'Replacement rule|decrements or evicts weak candidates under pressure|control',
    'Verification pass|measures surviving candidates against the threshold|worker'
  ],['observe update','track candidate','replace weak key','verify frequency']);
  spec('Top-K sketches',[
    'Frequency sketch|estimates counts in sublinear memory|bitset',
    'Candidate heap|retains keys near the current Kth estimate|storage',
    'Update rule|refreshes a key estimate and heap position|control',
    'Top-K report|orders retained candidates by estimated frequency|client'
  ],['estimate key count','compare Kth score','update heap','return candidates']);
  spec('MinHash',[
    'Shingle set|represents each object as discrete features|storage',
    'Hash permutations|map every feature through several hash functions|control',
    'Signature minima|keep the minimum hash under each permutation|bitset',
    'Similarity estimate|counts equal signature positions as Jaccard samples|client'
  ],['extract shingles','permute hashes','retain minima','compare signatures']);
  spec('SimHash',[
    'Weighted features|supply tokens and importance values for one object|storage',
    'Feature hashes|produce signed votes for every bit position|control',
    'Accumulator vector|sums positive and negative weighted votes|bitset',
    'Binary fingerprint|uses accumulator signs for Hamming comparison|client'
  ],['weight features','cast bit votes','sum dimensions','take signs']);
  spec('Locality-sensitive hashing',[
    'Vector family|provides points under a chosen similarity metric|storage',
    'LSH functions|increase collision probability for nearby points|control',
    'Bucket tables|index each vector under several compound hashes|index',
    'Candidate union|collects colliding vectors before exact reranking|client'
  ],['choose hash family','hash vectors','store buckets','gather candidates']);
  spec('Reservoir sampling',[
    'Stream position|counts items seen without knowing final length|queue',
    'Reservoir slots|hold a fixed-size uniform sample|storage',
    'Random index|draws uniformly from all positions seen so far|control',
    'Replacement rule|replaces a slot only when the draw falls in the reservoir|worker'
  ],['count next item','fill initial sample','draw random index','replace selected slot']);
  spec('Probabilistic counters',[
    'Event stream|presents increments too numerous for exact storage|queue',
    'Compact exponent|stores a logarithmic counter state|bitset',
    'Random increment|advances with probability inverse to represented magnitude|control',
    'Decoded estimate|maps the exponent back to an approximate count|client'
  ],['observe event','read exponent','sample increment','decode count']);

  spec('Two-phase commit (2PC)',[
    'Transaction coordinator|durably owns the global transaction decision|control',
    'Prepared participants|lock resources and persist a yes or no vote|database',
    'Decision log|records commit only after every required yes vote|storage',
    'Completion replay|redelivers the durable decision until all acknowledge|worker'
  ],['send prepare','collect durable votes','log global decision','repeat completion']);
  spec('Three-phase commit',[
    'Vote phase|asks participants whether they can commit|control',
    'Pre-commit phase|moves all reachable participants to a committable state|database',
    'Commit phase|applies the transaction after acknowledgements|worker',
    'Timeout rule|uses bounded-delay assumptions to choose recovery action|clock'
  ],['collect votes','announce pre-commit','apply commit','recover by phase']);
  spec('MVCC',[
    'Version chain|stores committed row images with visibility metadata|storage',
    'Snapshot timestamp|defines the reader visibility boundary|clock',
    'Writer version|creates a new image instead of overwriting readers|database',
    'Vacuum horizon|removes versions no active snapshot can observe|worker'
  ],['read version chain','select visible image','append new version','reclaim obsolete images']);
  spec('Snapshot isolation',[
    'Start snapshot|fixes the committed versions visible to a transaction|clock',
    'Private writes|buffer new versions outside the starting snapshot|storage',
    'Write-conflict check|rejects concurrent updates to the same item|control',
    'Commit timestamp|publishes all surviving writes atomically|database'
  ],['capture snapshot','stage writes','check write conflicts','publish transaction']);
  spec('Serializable transactions',[
    'Read-write set|records dependencies created by each transaction|storage',
    'Conflict graph|adds edges for incompatible operation order|index',
    'Cycle detector|finds histories that cannot match any serial order|control',
    'Commit policy|blocks or aborts work to keep the graph acyclic|database'
  ],['track dependencies','build precedence edges','detect cycle','abort unsafe transaction']);
  spec('Version vectors',[
    'Replica version|increments the local replica component on each write|clock',
    'Sibling metadata|travels with every replicated value|storage',
    'Dominance test|compares all components to detect causal ancestry|control',
    'Conflict set|retains incomparable concurrent siblings for resolution|database'
  ],['increment replica slot','replicate vector','test dominance','preserve concurrency']);
  spec('CRDTs',[
    'Replica operation|updates state with monotonic or commutative semantics|replica',
    'Causal metadata|prevents missing or double-applying required information|clock',
    'Merge function|is associative, commutative, and idempotent|control',
    'Converged value|becomes equal after every update is exchanged|database'
  ],['apply local update','attach causality','merge remote state','converge replicas']);
  spec('Conflict-free replicated data types',[
    'Replica delta|encodes a local grow-only or observed-remove change|replica',
    'Join lattice|orders states by information content|index',
    'Least upper bound|combines concurrent states without coordination|control',
    'Materialized value|derives the application view from merged state|database'
  ],['create delta','place in lattice','join concurrent states','derive value']);
  spec('Merkle trees',[
    'Leaf hashes|summarize fixed key ranges or data blocks|bitset',
    'Parent hashes|combine child hashes into a hierarchy|index',
    'Root comparison|proves equality or directs a recursive descent|control',
    'Differing range|identifies the minimal data requiring transfer|storage'
  ],['hash leaves','build parent levels','compare roots','descend to mismatch']);

  spec('LSM trees',[
    'Write-ahead log|durably records each mutation before acknowledgement|storage',
    'Memtable|keeps recent keys sorted in memory|cache',
    'SSTable levels|store immutable sorted runs on durable media|database',
    'Compaction workers|merge runs and discard shadowed versions|worker'
  ],['append mutation','update sorted memory','flush immutable run','compact levels']);
  spec('B-trees',[
    'Root page|selects a child range using separator keys|index',
    'Internal page|narrows the search through balanced fan-out|index',
    'Leaf page|stores ordered keys and record pointers|storage',
    'Split propagation|divides a full page and promotes a separator|worker'
  ],['search root','descend internal page','update leaf','split full page']);
  spec('SSTables',[
    'Sorted data blocks|store immutable key-value runs in order|storage',
    'Sparse block index|maps sampled keys to block offsets|index',
    'Bloom metadata|skips files that definitely lack the key|bitset',
    'Footer manifest|locates indexes, filters, and key bounds|storage'
  ],['write sorted blocks','sample block keys','build membership filter','seal metadata']);
  spec('Write-ahead logs',[
    'Log sequence|assigns every mutation an ordered position|storage',
    'Durable append|writes and syncs the record before data pages|database',
    'Checkpoint marker|records which log prefix is reflected in storage|control',
    'Recovery replay|reapplies records after the last safe checkpoint|worker'
  ],['assign sequence','append before pages','mark checkpoint','replay suffix']);
  spec('Memtables',[
    'Mutable table|accepts ordered in-memory writes|cache',
    'Size threshold|freezes the table when memory reaches its budget|control',
    'Immutable table|continues serving reads while awaiting flush|storage',
    'Flush writer|emits one sorted immutable file|worker'
  ],['insert sorted key','reach threshold','freeze table','flush SSTable']);
  spec('Compaction',[
    'Overlapping runs|contain sorted keys and obsolete versions|storage',
    'Merge iterator|advances through runs in global key order|worker',
    'Version filter|keeps visible values and safe tombstones|control',
    'Replacement run|atomically supersedes the selected inputs|database'
  ],['select runs','merge sorted keys','drop obsolete versions','install new run']);
  spec('Sparse indexes',[
    'Boundary keys|sample the first key of each sorted data block|index',
    'Block offsets|point from each boundary to durable storage|storage',
    'Floor lookup|finds the greatest indexed key not above the target|control',
    'Block scan|searches only within the selected block|client'
  ],['sample boundaries','store offsets','find floor entry','scan one block']);
  spec('Covering indexes',[
    'Index key|orders entries by the query predicate columns|index',
    'Included columns|store projected fields beside each key|storage',
    'Range seek|locates matching entries without reading base rows|control',
    'Covered answer|returns all requested fields from index pages|client'
  ],['encode key','include projection','seek matching range','return index-only rows']);
  spec('Inverted indexes',[
    'Analyzer|normalizes a document into searchable terms|worker',
    'Term dictionary|maps each term to its postings location|index',
    'Postings list|stores document IDs, frequencies, and positions|storage',
    'Query iterator|intersects or unions postings for query terms|control'
  ],['analyze document','lookup term','read postings','combine matches']);

  spec('Tumbling windows',[
    'Event timestamp|assigns each record to one fixed interval|clock',
    'Window key|combines grouping key with interval boundaries|index',
    'Window accumulator|updates one non-overlapping aggregate|database',
    'Close trigger|emits when the watermark passes the window end|control'
  ],['read event time','calculate interval','update aggregate','close after watermark']);
  spec('Sliding windows',[
    'Event timestamp|maps one record to every overlapping window it affects|clock',
    'Slide interval|defines how often a new window begins|control',
    'Shared panes|reuse partial aggregates across overlapping windows|storage',
    'Window emitter|combines panes when each window becomes complete|worker'
  ],['read event time','enumerate windows','update shared panes','emit rolling result']);
  spec('Session windows',[
    'Keyed event|extends activity for one entity at its event time|queue',
    'Inactivity gap|defines when separate sessions may exist|clock',
    'Session state|merges intervals bridged by a late event|database',
    'Session close|emits after watermark exceeds end plus gap|control'
  ],['route by key','test time gap','merge intervals','close inactive session']);
  spec('Watermarks',[
    'Partition progress|reports the greatest event time likely complete|clock',
    'Idle detection|excludes stalled partitions under explicit policy|control',
    'Global watermark|takes a safe minimum across active inputs|clock',
    'Late-data policy|emits, revises, or drops records behind progress|worker'
  ],['report progress','mark idle inputs','compute minimum','handle late record']);
  spec('Checkpointing',[
    'Barrier marker|enters every input partition at one logical cut|queue',
    'Operator state|snapshots after barriers align or flow asynchronously|database',
    'Source offsets|record exactly which input prefix the state includes|storage',
    'Checkpoint commit|publishes one recoverable state and progress version|control'
  ],['inject barriers','snapshot operators','capture offsets','commit checkpoint']);
  spec('MapReduce',[
    'Input splits|divide durable data among independent map tasks|storage',
    'Map workers|emit intermediate key-value pairs|worker',
    'Reduce groups|collect all values sharing an intermediate key|queue',
    'Reduce workers|combine each group into final records|worker'
  ],['assign splits','map records','group by key','reduce groups']);
  spec('Shuffle',[
    'Partition function|maps each intermediate key to a destination worker|control',
    'Map buffers|sort and spill partitioned records locally|storage',
    'Network transfer|moves every partition to its assigned reducer|queue',
    'Merge reader|combines sorted spills into grouped key streams|worker'
  ],['choose destination','buffer and spill','transfer partitions','merge by key']);
  spec('Combiners',[
    'Mapper output|contains repeated keys within one local task|worker',
    'Local combiner|merges values using an associative operation|control',
    'Compact pairs|replace many records with partial aggregates|storage',
    'Reducer merge|combines partials exactly like original values|worker'
  ],['collect mapper pairs','combine local values','emit partials','merge at reducer']);
  spec('Distributed aggregation',[
    'Partition accumulators|summarize records independently near the data|worker',
    'Mergeable state|encodes associative partial results|storage',
    'Aggregation tree|combines partials in bounded fan-in levels|control',
    'Global aggregate|finalizes one answer after all partitions contribute|client'
  ],['aggregate locally','serialize partial state','merge through tree','finalize answer']);
  spec('Broadcast joins',[
    'Small relation|fits within each worker memory budget|storage',
    'Broadcast exchange|copies the small side to every large-side partition|queue',
    'Local hash table|indexes broadcast rows by join key|cache',
    'Partition scan|joins local large rows without repartitioning them|worker'
  ],['select small side','broadcast copies','build local hash','probe large rows']);
  spec('Hash joins',[
    'Build relation|supplies rows for a join-key hash table|storage',
    'Hash buckets|group build rows by join-key hash|index',
    'Probe relation|hashes each row to the matching bucket|worker',
    'Equality check|emits pairs whose full join keys match|control'
  ],['read build rows','build buckets','probe buckets','verify and emit']);
  spec('Sort-merge joins',[
    'Left sorted run|orders left records by the join key|storage',
    'Right sorted run|orders right records by the same key|storage',
    'Merge cursors|advance the smaller current key on either side|control',
    'Equal-key groups|produce the cross-product of matching runs|worker'
  ],['sort left input','sort right input','advance cursors','join equal groups']);

  spec('TF-IDF',[
    'Term frequency|counts a query term within each document|index',
    'Document frequency|counts corpus documents containing the term|storage',
    'Inverse frequency|downweights terms common across the corpus|control',
    'Document score|sums term frequency times inverse frequency|client'
  ],['count term uses','count matching documents','compute rarity','sum weighted terms']);
  spec('BM25',[
    'Term postings|provide per-document term frequency|index',
    'Length normalizer|compares each document length with the corpus average|control',
    'Saturation curve|limits gains from repeated occurrences|control',
    'BM25 scorer|sums rarity-weighted normalized term contributions|client'
  ],['read postings','normalize length','saturate frequency','sum term scores']);
  spec('Top-K retrieval',[
    'Scored candidates|arrive without requiring a complete global sort|queue',
    'Bounded min-heap|retains only the best K scores seen so far|storage',
    'Kth threshold|prunes candidates unable to enter the heap|control',
    'Ranked winners|sort the retained heap for final presentation|client'
  ],['score candidate','maintain heap','raise threshold','sort winners']);
  spec('Approximate nearest neighbor (ANN)',[
    'Query vector|defines the point whose neighbors are requested|client',
    'Candidate index|prunes most vectors using graph or partition structure|index',
    'Distance evaluations|measure only the selected candidate subset|control',
    'Recall-latency budget|returns nearest observed vectors within search limits|client'
  ],['encode query','traverse index','measure candidates','return nearest set']);
  spec('HNSW',[
    'Top-layer entry|starts search in a sparse long-range graph|index',
    'Greedy descent|moves to a closer neighbor at each upper layer|control',
    'Base-layer frontier|explores a bounded best-first candidate set|storage',
    'Neighbor result|returns the closest visited vectors after refinement|client'
  ],['enter top layer','walk toward query','expand base frontier','select nearest']);
  spec('IVF',[
    'Coarse centroids|partition vector space into Voronoi cells|index',
    'Posting cells|store vectors assigned to each nearest centroid|storage',
    'Query probes|select the closest nprobe centroids|control',
    'Local distance scan|ranks vectors only inside selected cells|client'
  ],['train centroids','assign vectors','choose probe cells','scan candidates']);
  spec('Vector indexes',[
    'Embedding records|pair vector values with stable document identities|storage',
    'Metric structure|organizes vectors for cosine, dot, or Euclidean search|index',
    'Filtered candidates|apply metadata constraints during or after traversal|control',
    'Exact reranker|recomputes distance for the short candidate list|worker'
  ],['store embeddings','build metric index','retrieve filtered set','rerank exactly']);

  spec('BFS / DFS',[
    'Visited set|prevents revisiting vertices reached through another edge|bitset',
    'BFS queue|expands all vertices at the current distance frontier|queue',
    'DFS stack|follows one branch before backtracking|storage',
    'Traversal tree|records parent edges and discovery order|index'
  ],['mark source','expand breadth frontier','follow depth branch','record parents']);
  spec('Dijkstra',[
    'Distance map|starts source at zero and all other vertices at infinity|database',
    'Min-priority queue|extracts the unsettled vertex with least distance|queue',
    'Edge relaxation|lowers a neighbor distance through the extracted vertex|control',
    'Settled set|finalizes distances after minimum extraction|bitset'
  ],['initialize distances','extract minimum','relax outgoing edges','settle vertex']);
  spec('Bellman-Ford',[
    'Distance vector|holds current best source distance for every vertex|database',
    'Edge passes|scan every directed edge up to vertex count minus one times|worker',
    'Relaxation rule|updates a destination through a cheaper predecessor|control',
    'Cycle check|detects another improvement caused by a negative cycle|control'
  ],['initialize source','scan all edges','repeat relaxations','test extra pass']);
  spec('Minimum spanning tree',[
    'Weighted graph|provides vertices and candidate connecting edges|storage',
    'Safe-edge cut|separates chosen vertices from remaining components|index',
    'Cheapest crossing edge|preserves the possibility of an optimal tree|control',
    'Spanning tree|contains every vertex with no cycle and minimum weight|storage'
  ],['start forest','choose cut','add safe edge','complete tree']);
  spec('Kruskal',[
    'Sorted edges|order all graph edges by nondecreasing weight|storage',
    'Disjoint sets|track the component containing each endpoint|index',
    'Cycle test|accepts an edge only across different components|control',
    'Forest merge|unions components until one spanning tree remains|worker'
  ],['sort by weight','find endpoint roots','reject cycles','union components']);
  spec('Prim',[
    'Growing tree|starts from one arbitrary vertex|storage',
    'Frontier heap|holds edges leaving the current tree by weight|queue',
    'Minimum crossing edge|adds the cheapest unseen endpoint|control',
    'Frontier refresh|inserts edges exposed by the new vertex|worker'
  ],['choose start','populate frontier','take cheapest edge','add new edges']);
  spec('Topological sort',[
    'In-degree table|counts unresolved incoming dependencies per vertex|database',
    'Zero-degree queue|holds vertices whose prerequisites are complete|queue',
    'Edge removal|decrements each dependent after emitting a vertex|control',
    'Ordered sequence|contains every vertex or exposes a remaining cycle|storage'
  ],['count dependencies','enqueue ready vertices','remove outgoing edges','detect cycle or finish']);
  spec('Union-Find',[
    'Parent forest|points each element toward a representative root|index',
    'Find operation|follows parents and compresses the traversed path|control',
    'Rank metadata|estimates tree height or component size|storage',
    'Union operation|attaches the smaller-ranked root below the larger|worker'
  ],['initialize roots','find representatives','compare ranks','link roots']);
  spec('Distributed snapshots',[
    'Initiator marker|records local state before sending markers on channels|control',
    'Process snapshots|capture each participant at its first marker|node',
    'Channel recordings|retain messages received before a channel marker|queue',
    'Consistent cut|combines process state with in-flight channel state|storage'
  ],['send first marker','capture local states','record in-flight messages','assemble global cut']);
  spec('Distributed sorting',[
    'Sample keys|estimate global range boundaries from all partitions|storage',
    'Range partitions|assign each record to its final ordered interval|index',
    'Local sorters|sort records independently within each interval|worker',
    'Ordered concatenation|joins partition outputs by boundary order|control'
  ],['sample distribution','choose boundaries','shuffle and sort','concatenate ranges']);

  [
    ['rate-limiting-traffic-management','Leaky bucket'],
    ['rate-limiting-traffic-management','Fixed window'],
    ['rate-limiting-traffic-management','Sliding window'],
    ['rate-limiting-traffic-management','Sliding window counter'],
    ['distributed-systems-fundamentals','Lamport clocks'],
    ['distributed-systems-fundamentals','Vector clocks'],
    ['distributed-systems-fundamentals','Hybrid logical clocks'],
    ['distributed-systems-fundamentals','FIFO ordering'],
    ['distributed-systems-fundamentals','Causal ordering'],
    ['distributed-systems-fundamentals','Total ordering'],
    ['consensus-coordination','Paxos'],
    ['consensus-coordination','Raft'],
    ['consensus-coordination','Leader election'],
    ['consensus-coordination','Quorum consensus'],
    ['consensus-coordination','Compare-and-swap'],
    ['consensus-coordination','Fencing tokens'],
    ['consensus-coordination','Leases'],
    ['replication','Version vectors'],
    ['replication','CRDTs'],
    ['partitioning-sharding','Hash partitioning'],
    ['partitioning-sharding','Consistent hashing'],
    ['partitioning-sharding','Rendezvous hashing'],
    ['partitioning-sharding','Virtual nodes'],
    ['probabilistic-data-structures','Bloom filter'],
    ['probabilistic-data-structures','Counting Bloom filter'],
    ['probabilistic-data-structures','Cuckoo filter'],
    ['probabilistic-data-structures','Quotient filter'],
    ['probabilistic-data-structures','HyperLogLog'],
    ['probabilistic-data-structures','HyperLogLog++'],
    ['probabilistic-data-structures','Count-Min Sketch'],
    ['probabilistic-data-structures','Heavy hitters'],
    ['probabilistic-data-structures','Top-K sketches'],
    ['probabilistic-data-structures','MinHash'],
    ['probabilistic-data-structures','SimHash'],
    ['probabilistic-data-structures','Locality-sensitive hashing'],
    ['probabilistic-data-structures','Reservoir sampling'],
    ['probabilistic-data-structures','Probabilistic counters'],
    ['distributed-transactions','Two-phase commit (2PC)'],
    ['distributed-transactions','Three-phase commit'],
    ['distributed-transactions','MVCC'],
    ['distributed-transactions','Snapshot isolation'],
    ['distributed-transactions','Serializable transactions'],
    ['storage-systems','LSM trees'],
    ['storage-systems','B-trees'],
    ['storage-systems','SSTables'],
    ['storage-systems','Write-ahead logs'],
    ['storage-systems','Memtables'],
    ['storage-systems','Compaction'],
    ['storage-systems','Sparse indexes'],
    ['storage-systems','Covering indexes'],
    ['storage-systems','Inverted indexes'],
    ['streaming-real-time-processing','Tumbling windows'],
    ['streaming-real-time-processing','Sliding windows'],
    ['streaming-real-time-processing','Session windows'],
    ['streaming-real-time-processing','Watermarks'],
    ['streaming-real-time-processing','Checkpointing'],
    ['distributed-data-processing','MapReduce'],
    ['distributed-data-processing','Shuffle'],
    ['distributed-data-processing','Combiners'],
    ['distributed-data-processing','Distributed aggregation'],
    ['distributed-data-processing','Broadcast joins'],
    ['distributed-data-processing','Hash joins'],
    ['distributed-data-processing','Sort-merge joins'],
    ['distributed-data-processing','Checkpointing',null,'batch recovery'],
    ['search-retrieval','TF-IDF'],
    ['search-retrieval','BM25'],
    ['search-retrieval','Top-K retrieval'],
    ['search-retrieval','Approximate nearest neighbor (ANN)'],
    ['search-retrieval','HNSW'],
    ['search-retrieval','IVF'],
    ['search-retrieval','Vector indexes'],
    ['distributed-algorithms','BFS / DFS'],
    ['distributed-algorithms','Dijkstra'],
    ['distributed-algorithms','Bellman-Ford'],
    ['distributed-algorithms','Minimum spanning tree'],
    ['distributed-algorithms','Kruskal'],
    ['distributed-algorithms','Prim'],
    ['distributed-algorithms','Topological sort'],
    ['distributed-algorithms','Union-Find'],
    ['distributed-algorithms','Consistent hashing',null,'algorithm chapter'],
    ['distributed-algorithms','Leader election',null,'algorithm chapter'],
    ['distributed-algorithms','Distributed snapshots'],
    ['distributed-algorithms','Distributed sorting'],
    ['distributed-algorithms','Distributed aggregation',null,'algorithm chapter'],
    ['database-distributed-system-concepts','Consistent hashing',null,'database placement'],
    ['consistency-conflict-patterns','Vector clocks',null,'conflict detection'],
    ['consistency-conflict-patterns','Conflict-free replicated data types'],
    ['consistency-conflict-patterns','Merkle trees'],
    ['time-based-distributed-patterns','Sliding windows',null,'time patterns'],
    ['time-based-distributed-patterns','Tumbling windows',null,'time patterns'],
    ['time-based-distributed-patterns','Watermarks',null,'time patterns'],
    ['time-based-distributed-patterns','Leases',null,'time patterns'],
    ['advanced-senior-staff-level-concepts','Consistent hashing',null,'advanced placement'],
    ['advanced-senior-staff-level-concepts','Rendezvous hashing',null,'advanced placement'],
    ['advanced-senior-staff-level-concepts','Merkle trees',null,'advanced repair'],
    ['advanced-senior-staff-level-concepts','CRDTs',null,'advanced convergence'],
    ['advanced-senior-staff-level-concepts','Vector clocks',null,'advanced ordering'],
    ['advanced-senior-staff-level-concepts','Hybrid logical clocks',null,'advanced ordering'],
    ['advanced-senior-staff-level-concepts','Paxos',null,'advanced consensus'],
    ['advanced-senior-staff-level-concepts','Raft',null,'senior view'],
    ['advanced-senior-staff-level-concepts','Fencing tokens',null,'advanced ownership'],
    ['advanced-senior-staff-level-concepts','Leases',null,'advanced ownership'],
    ['advanced-senior-staff-level-concepts','Watermarks',null,'advanced streaming'],
    ['advanced-senior-staff-level-concepts','Distributed snapshots',null,'advanced streaming']
  ].forEach(entry => use(entry[0], entry[1], entry[2], entry[3]));

  window.SYSTEM_DESIGN_MECHANISMS = mechanisms;
}());
