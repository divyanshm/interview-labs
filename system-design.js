const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],sleep=ms=>new Promise(r=>setTimeout(r,ms));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const chapters=(window.SYSTEM_DESIGN_CHAPTERS||[]);
const sortedChapters=[...chapters].sort((a,b)=>a.title.localeCompare(b.title,undefined,{sensitivity:'base'}));
const visuals={
  cap:{title:'CAP + PACELC',mental:'A partition forces a choice for each operation: reject/delay it to preserve one-copy correctness, or serve it with potentially divergent state. When there is no partition, replicas still trade latency against consistency.',invariant:'Partition behavior and normal-operation behavior are separate design choices.',tradeoff:'CAP is not “pick two” during normal operation; partition tolerance is unavoidable once communication can fail.',nodes:[['Client','operation'],['Replica A','reachable'],['Network','partition'],['Replica B','isolated'],['Decision','C or A']],steps:[
    [0,[],'A client sends an operation while all replicas initially agree.'],[2,[0,1],'The link between replicas fails; neither side can distinguish a partition from delay.'],[4,[0,1,2,3],'Choose consistency: one side rejects/delays, or availability: both sides serve and may diverge.'],[1,[0,1,2,3,4],'After healing, reconcile divergent versions or resume the single authoritative history.']]},
  clocks:{title:'Logical time and causal order',mental:'Physical time is useful for humans but unreliable for ordering concurrent events. Logical clocks track happened-before relationships; vector clocks can distinguish causality from concurrency.',invariant:'If event A causally precedes B, the logical timestamp of A must be less than B.',tradeoff:'Lamport clocks give a sortable order but cannot identify concurrency; vector clocks do, at metadata cost.',nodes:[['Node A','A1'],['Message','causal edge'],['Node B','B1'],['Concurrent','C1'],['Merge','compare clocks']],steps:[
    [0,[],'Node A performs A1 and increments its logical clock.'],[1,[0],'A sends a message carrying its clock; the message creates a causal edge.'],[2,[0,1],'B receives it, takes max(local, received) + 1, then performs B1.'],[3,[0,1,2],'C1 occurs without communication and is concurrent with A1/B1.'],[4,[0,1,2,3],'Vector clocks expose concurrency; a deterministic tie-break can impose total order if needed.']]},
  raft:{title:'Raft consensus',mental:'A term has at most one elected leader. The leader proposes an ordered log; an entry becomes committed after a quorum stores it, then state machines apply it in order.',invariant:'Committed entries survive leader changes because every winning candidate must contain the quorum-overlapping history.',tradeoff:'Consensus provides one ordered decision history but adds coordination latency and loses availability without a quorum.',nodes:[['Follower A','term 8'],['Leader','append entry'],['Follower B','replicate'],['Quorum','2 of 3'],['Commit','apply']],steps:[
    [1,[],'A leader is elected for a monotonically increasing term/epoch.'],[1,[0],'The leader appends a client command to its local log.'],[2,[0,1],'AppendEntries replicates the command to followers in log order.'],[3,[0,1,2],'A majority acknowledges. Quorum intersection protects the entry across elections.'],[4,[0,1,2,3],'The leader marks the entry committed and tells replicas to apply it.']]},
  replication:{title:'Replication choices',mental:'Replication makes copies for durability, locality, and reads. The write path determines consistency, latency, conflict behavior, and failure mode.',invariant:'Every acknowledged durability/consistency promise must name which replicas have accepted which version.',tradeoff:'Synchronous replication raises write latency; asynchronous replication risks lag and acknowledged-data loss during failover.',nodes:[['Writer','version 42'],['Leader','order write'],['Sync replica','ack'],['Async replica','lag'],['Reader','consistency choice']],steps:[
    [0,[],'A writer sends version 42 to the write authority.'],[1,[0],'The leader orders and durably records the write.'],[2,[0,1],'A synchronous replica acknowledges before the client success response.'],[3,[0,1,2],'An asynchronous cross-region replica catches up later and may serve stale reads.'],[4,[0,1,2,3],'Route reads according to the required consistency: leader, quorum, session, or stale replica.']]},
  sharding:{title:'Consistent hashing and rebalancing',mental:'Partitioning maps keys to owners. A stable hash ring or rendezvous score minimizes movement when membership changes; virtual nodes smooth uneven capacity.',invariant:'Every key has one deterministic owner set for a given membership epoch.',tradeoff:'Hashing balances random keys but destroys range locality; skewed keys still require splitting, salting, replication, or isolation.',nodes:[['Key','hash(k)'],['Router','membership epoch'],['Shard A','range/token'],['Shard B','range/token'],['New shard','limited movement']],steps:[
    [0,[],'Hash or score the partition key, not the whole request.'],[1,[0],'The router uses a versioned membership map.'],[2,[0,1],'The key lands on its deterministic owner and replica set.'],[4,[0,1,2,3],'A shard joins; only keys whose ownership changes move.'],[1,[0,2,3,4],'Publish a new epoch after data is copied, then retire the old mapping safely.']]},
  cache:{title:'Cache-aside with stampede control',mental:'A cache is a fast, disposable copy. On a miss, one request should refill while peers wait or serve controlled stale data.',invariant:'The source of truth remains authoritative; invalidation/versioning prevents an older refill from overwriting newer data.',tradeoff:'Caching trades freshness and complexity for latency and backend load reduction.',nodes:[['Requests','same hot key'],['Cache','miss / TTL'],['Single-flight','one loader'],['Database','source of truth'],['Cache','versioned fill']],steps:[
    [0,[],'Many requests arrive for the same key near expiration.'],[1,[0],'They observe a miss or probabilistic early-expiration window.'],[2,[0,1],'Request coalescing elects one loader; peers await the same promise.'],[3,[0,1,2],'The loader reads the source of truth once.'],[4,[0,1,2,3],'Fill with a version/TTL and release waiters; stale fills must not overwrite newer versions.']]},
  messaging:{title:'Durable log, consumers, and outbox',mental:'A broker decouples producers from consumers. Partitions provide ordered logs; consumer offsets are progress, not proof that side effects committed.',invariant:'A business state change and its outgoing event must become durable atomically, or be reconciled.',tradeoff:'At-least-once delivery plus idempotent consumers is usually simpler and more honest than claiming end-to-end exactly once.',nodes:[['Service','DB transaction'],['Outbox','same commit'],['CDC relay','publish'],['Partition log','ordered offset'],['Consumer','inbox + effect']],steps:[
    [0,[],'The service changes business state. A direct publish here risks a dual-write gap.'],[1,[0],'Write the event to an outbox in the same local database transaction.'],[2,[0,1],'CDC or a relay publishes durable outbox rows and retries safely.'],[3,[0,1,2],'The broker appends to a partition log and assigns an offset.'],[4,[0,1,2,3],'The consumer deduplicates by event ID, commits its effect, then advances progress.']]},
  transactions:{title:'2PC versus Saga',mental:'2PC coordinates one atomic outcome by preparing participants before commit. A saga commits local steps and uses compensations when a later step fails.',invariant:'Never leave an ambiguous outcome without a recovery record and a deterministic way to resume or compensate.',tradeoff:'2PC favors atomicity but can block and couples participants; sagas favor availability but expose intermediate states.',nodes:[['Coordinator','transaction/saga'],['Service A','local commit'],['Service B','local commit'],['Failure','after A'],['Recovery','commit or compensate']],steps:[
    [0,[],'A workflow spans independently owned resources. Choose atomic commit only when participants support it and latency permits.'],[1,[0],'2PC prepares A without exposing a final outcome; a saga commits A as a durable step.'],[2,[0,1],'Proceed to B with a transaction ID and idempotent command.'],[3,[0,1],'B fails. The coordinator must not simply retry forever or forget the partial state.'],[4,[0,1,3],'2PC resolves the prepared decision; a saga executes A’s compensation and records completion.']]},
  resilience:{title:'Timeout, retry, circuit, bulkhead',mental:'Remote calls can be slow, fail, or succeed after the caller gives up. Bound waiting, retry only safe failures, stop hammering unhealthy dependencies, and isolate resources.',invariant:'A retry must fit the caller deadline, budget, and idempotency contract.',tradeoff:'Retries improve transient success but amplify overload; hedging lowers tail latency but spends duplicate capacity.',nodes:[['Caller','deadline'],['Timeout','bounded wait'],['Backoff','jitter + budget'],['Circuit','open/half-open'],['Bulkhead','isolated pool'],['Fallback','degrade']],steps:[
    [0,[],'Propagate an end-to-end deadline and cancellation token.'],[1,[0],'A dependency exceeds its per-attempt timeout; the outcome may still be unknown.'],[2,[0,1],'Retry only classified transient failures with exponential backoff, jitter, and a retry budget.'],[3,[0,1,2],'Repeated failures open the circuit so calls fail fast while the dependency recovers.'],[4,[0,1,2,3],'A bulkhead prevents one dependency from consuming every thread, connection, or queue slot.'],[5,[0,1,2,3,4],'Serve a truthful degraded response, shed load, or fail closed according to risk.']]},
  rate:{title:'Token bucket and admission control',mental:'Rate limits govern work admitted over time; concurrency limits govern work simultaneously in flight. Both protect a finite downstream capacity.',invariant:'The limiter’s state and scope must match the protected resource: user, tenant, endpoint, cell, or global dependency.',tradeoff:'Global precision requires coordination; local approximate limits scale better but can overshoot.',nodes:[['Request','tenant A'],['Bucket','tokens refill'],['Concurrency','in-flight cap'],['Fair queue','weighted share'],['Service','protected capacity']],steps:[
    [0,[],'A request arrives with an identity and policy dimension.'],[1,[0],'Consume a token; bounded burst is allowed while long-term rate follows refill speed.'],[2,[0,1],'Acquire a concurrency permit to cap simultaneous expensive work.'],[3,[0,1,2],'Fair queuing prevents one tenant from monopolizing shared capacity.'],[4,[0,1,2,3],'Admit, delay, or reject before overloading the protected service.']]},
  lsm:{title:'LSM write and compaction path',mental:'An LSM tree turns random writes into sequential appends, then reorganizes immutable sorted files in the background. Reads merge several possible locations.',invariant:'The write-ahead log protects acknowledged writes until immutable storage contains them.',tradeoff:'Fast writes trade for read amplification, space amplification, and compaction cost.',nodes:[['Write','key=value'],['WAL','durable append'],['Memtable','sorted memory'],['SSTable','immutable flush'],['Compaction','merge levels'],['Read','Bloom + indexes']],steps:[
    [0,[],'A write enters the storage engine.'],[1,[0],'Append to the WAL before acknowledging durability.'],[2,[0,1],'Update the in-memory sorted memtable.'],[3,[0,1,2],'When full, flush an immutable sorted SSTable.'],[4,[0,1,2,3],'Background compaction merges files, removes obsolete versions, and restores level invariants.'],[5,[0,1,2,3,4],'Reads use Bloom filters and sparse indexes to avoid unnecessary file probes.']]},
  stream:{title:'Event-time windows and watermarks',mental:'Event time says when reality happened; processing time says when the system saw it. A watermark estimates how complete event time is.',invariant:'Window finalization policy must define what happens to late events and how corrections are emitted.',tradeoff:'Waiting longer improves completeness but increases latency and retained state.',nodes:[['Events','event timestamps'],['Partitions','out of order'],['Watermark','progress estimate'],['Window state','aggregate'],['Late event','drop/update/retract'],['Sink','checkpointed result']],steps:[
    [0,[],'Events carry event time and stable IDs.'],[1,[0],'Network and partition behavior reorder arrivals.'],[2,[0,1],'The watermark advances when the system believes earlier events are mostly complete.'],[3,[0,1,2],'Windows whose end is behind the watermark can emit an initial result.'],[4,[0,1,2,3],'A late event follows explicit allowed-lateness and correction policy.'],[5,[0,1,2,3,4],'Checkpoint state and source offsets atomically enough to recover without corrupting results.']]},
  identity:{title:'Distributed identity and authorization',mental:'Authentication establishes principals; authorization evaluates actor, action, resource, context, and delegation at every trust boundary.',invariant:'A downstream service validates the token and policy itself; authority cannot grow as a request traverses services.',tradeoff:'Short-lived scoped tokens and frequent key rotation improve containment but require robust caching, discovery, and failure handling.',nodes:[['User','OIDC session'],['Edge','token validation'],['Service A','policy'],['OBO token','delegated scope'],['Service B','resource check'],['Audit','actor chain']],steps:[
    [0,[],'A user authenticates; OIDC establishes identity while OAuth authorizes API access.'],[1,[0],'The edge validates signature, issuer, audience, lifetime, and relevant claims using trusted keys.'],[2,[0,1],'Service A evaluates RBAC/ABAC policy for the requested action.'],[3,[0,1,2],'For delegation, exchange rather than forward an over-broad token; bind user and workload identity.'],[4,[0,1,2,3],'Service B independently validates token and resource-level authorization.'],[5,[0,1,2,3,4],'Correlate user, workload, token, policy, action, resource, and result for audit.']]},
  observe:{title:'Trace one distributed request',mental:'Metrics reveal aggregate symptoms, logs explain discrete events, and traces preserve causal request flow across service boundaries.',invariant:'Every hop propagates trace context without placing unbounded or sensitive values into high-cardinality dimensions.',tradeoff:'Head sampling is cheap but may miss rare failures; tail sampling sees outcomes but requires buffering and coordination.',nodes:[['Client','trace ID'],['Gateway','span'],['Service','span + logs'],['Database','dependency span'],['Collector','sample/export'],['SLO','aggregate signal']],steps:[
    [0,[],'Create or accept trace context at the trust boundary.'],[1,[0],'The gateway starts a span and records bounded route/status attributes.'],[2,[0,1],'The service creates a child span and logs with trace/span correlation.'],[3,[0,1,2],'Dependency instrumentation records latency, result, and retries without leaking query secrets.'],[4,[0,1,2,3],'A collector applies sampling, redaction, batching, and export policy.'],[5,[0,1,2,3,4],'RED/USE metrics and SLO burn rates detect impact; traces identify the causal path.']]}
};
const visualConceptNames={cap:'CAP theorem',clocks:'Vector clocks',raft:'Raft',replication:'Leader/follower replication',sharding:'Consistent hashing',cache:'Cache-aside',messaging:'Transactional outbox',transactions:'Two-phase commit (2PC)',resilience:'Circuit breakers',rate:'Token bucket',lsm:'LSM trees',stream:'Watermarks',identity:'OBO',observe:'Distributed tracing'};
let currentVisual='cap',visualStep=0,visualPlaying=false;
function drawVisual(){
  const v=visuals[currentVisual],s=v.steps[visualStep];
  $('#visualTitle').textContent=v.title;$('#visualMental').textContent=v.mental;$('#visualInvariant').textContent=v.invariant;$('#visualTradeoff').textContent=v.tradeoff;$('#visualStatus').innerHTML=`<b>Step ${visualStep+1}/${v.steps.length}</b><br>${s[2]}`;
  const concept=sortedChapters.flatMap(chapter=>chapter.groups.flatMap(group=>group.concepts)).find(item=>item.name===visualConceptNames[currentVisual]);
  if(concept?.diagram){$('#systemFlow').className='system-flow kind-authored';$('#systemFlow').innerHTML=renderArchitecture(sceneFromDiagram(concept.diagram),s,v.steps.length,visualStep)}
  else{$('#systemFlow').className='system-flow';$('#systemFlow').innerHTML=v.nodes.map((n,i)=>`<div class="system-node ${i===s[0]?'active':s[1].includes(i)?'done':''}"><b>${n[0]}</b><small>${n[1]}</small></div>${i<v.nodes.length-1?'<span class="system-arrow">→</span>':''}`).join('')}
  $('#visualStep').disabled=visualStep===v.steps.length-1;
}
function resetVisual(){visualPlaying=false;$('#visualPlay').textContent='▶ Play';visualStep=0;drawVisual()}
Object.entries(visuals).forEach(([key,v])=>$('#visualType').add(new Option(v.title,key)));
$('#visualType').onchange=e=>{currentVisual=e.target.value;resetVisual()};$('#visualReset').onclick=resetVisual;$('#visualStep').onclick=()=>{if(visualStep<visuals[currentVisual].steps.length-1){visualStep++;drawVisual()}};
$('#visualPlay').onclick=async()=>{visualPlaying=!visualPlaying;$('#visualPlay').textContent=visualPlaying?'❚❚ Pause':'▶ Play';while(visualPlaying&&visualStep<visuals[currentVisual].steps.length-1){await sleep(800);if(visualPlaying){visualStep++;drawVisual()}}visualPlaying=false;$('#visualPlay').textContent='▶ Play'};

const conceptRegistry=sortedChapters.flatMap((chapter,chapterIndex)=>chapter.groups.flatMap((group,groupIndex)=>group.concepts.map((concept,conceptIndex)=>({chapter,group,concept,chapterIndex,groupIndex,conceptIndex}))));
const conceptIndexes=new Map(conceptRegistry.map((entry,index)=>[entry.concept,index]));
const chapterScenes={
  'distributed-systems-fundamentals':[['Client','request'],['Node A','local state'],['Network','delay / partition'],['Node B','remote state'],['Observer','visible outcome']],
  'consensus-coordination':[['Client','proposal'],['Leader','term / epoch'],['Peers','replicated votes'],['Quorum','decision'],['State machine','ordered apply']],
  replication:[['Writer','new version'],['Primary','write authority'],['Replica A','copy'],['Replica B','copy'],['Reader','consistency choice']],
  'partitioning-sharding':[['Key','partition key'],['Router','ownership map'],['Shard A','owner'],['Shard B','neighbor'],['Rebalancer','membership change']],
  'distributed-caching':[['Request','hot key'],['Cache','fast copy'],['Loader','miss control'],['Source','truth'],['Response','fresh / stale']],
  'probabilistic-data-structures':[['Data stream','many items'],['Hashing','compact signal'],['Sketch','bounded memory'],['Estimate','approximation'],['Decision','error-aware']],
  'distributed-messaging-eventing':[['Producer','event'],['Broker','durable log'],['Partition','ordered offsets'],['Consumer','process'],['State','effect + progress']],
  'distributed-transactions':[['Client','workflow'],['Coordinator','decision record'],['Service A','local state'],['Service B','local state'],['Recovery','resume / compensate']],
  'reliability-fault-tolerance':[['Caller','deadline'],['Guard','policy'],['Dependency','remote work'],['Failure','partial / slow'],['Recovery','contain + restore']],
  'resilience-patterns':[['Traffic','live requests'],['Health check','signal'],['Active path','serving'],['Standby','recovery copy'],['Failover','restore service']],
  'rate-limiting-traffic-management':[['Requests','arrival'],['Limiter','budget'],['Queue','fairness'],['Service','finite capacity'],['Result','admit / reject']],
  'distributed-scheduling':[['Job','durable intent'],['Scheduler','assign'],['Lease','ownership'],['Worker','execute'],['Result','record / retry']],
  'storage-systems':[['Write','record'],['Durability','WAL / pages'],['Index','locate'],['Storage','organized bytes'],['Read','result']],
  'database-distributed-system-concepts':[['Query','access pattern'],['Router','partition map'],['Database','authoritative state'],['Replicas','copies'],['Result','consistency level']],
  'streaming-real-time-processing':[['Events','event time'],['Partitions','arrival order'],['Operator','transform'],['State','window / checkpoint'],['Sink','materialized result']],
  'distributed-data-processing':[['Dataset','partitions'],['Workers','map / scan'],['Shuffle','move by key'],['Reducers','aggregate'],['Output','committed result']],
  'search-retrieval':[['Content / query','input'],['Index','terms / vectors'],['Shards','retrieve'],['Ranker','score + merge'],['Top K','results']],
  'distributed-algorithms':[['Input','graph / values'],['Frontier','pending work'],['Current','selected item'],['Update','state change'],['Result','invariant reached']],
  'api-service-architecture':[['Client','request'],['Edge','gateway / proxy'],['Router','discover'],['Service','business logic'],['Dependency','data / service']],
  'distributed-identity-security':[['Principal','user / workload'],['Credential','proof'],['Validator','authenticate'],['Policy','authorize'],['Resource','enforce + audit']],
  'observability-distributed-debugging':[['Request','trace context'],['Services','signals'],['Collector','correlate'],['Analysis','query / alert'],['Operator','diagnose']],
  'distributed-system-migration-patterns':[['Old path','current truth'],['Mirror','copy / shadow'],['New path','candidate'],['Compare','reconcile'],['Cutover','shift safely']],
  'consistency-conflict-patterns':[['Write A','version A'],['Write B','version B'],['Versions','detect relation'],['Resolver','merge / choose'],['Replicas','converged state']],
  'distributed-deduplication-idempotency':[['Attempt','request / event'],['Identity','stable key'],['Dedup store','seen?'],['Effect','once'],['Response','replay result']],
  'time-based-distributed-patterns':[['Event','timestamp'],['Clock','physical / logical'],['Timer / window','wait'],['Trigger','deadline / watermark'],['Outcome','expire / emit']],
  'advanced-senior-staff-level-concepts':[['Traffic','tenant / request'],['Control plane','policy + placement'],['Data plane','serve at scale'],['Fault boundary','contain'],['Recovery','reconcile']]
};
const eventualConsistencyModel={
  nodes:[['Client','write v2'],['Primary','v2'],['Replica A','v1 → v2'],['Replica B','v1 → v2'],['Reader','may see v1'],['All replicas','v2']],
  steps:[
    [0,[],'T0 · Every replica currently stores version v1. The client begins a write of v2.'],
    [1,[0],'T1 · The primary accepts v2 and can acknowledge before every replica has received it.'],
    [2,[0,1],'T2 · Replica A receives v2. Replica B is delayed, so the system temporarily contains two valid observed versions.'],
    [4,[0,1,2],'T3 · A read routed to Replica B can still return v1. This is the inconsistency window.'],
    [3,[0,1,2,4],'T4 · Replication, read repair, or anti-entropy carries v2 to the lagging replica.'],
    [5,[0,1,2,3,4],'T5 · With no new writes and communication restored, all replicas converge on v2.']
  ]
};
const visualMatchers=[
  [/^eventual consistency$/i,()=>eventualConsistencyModel],
  [/\b(raft|paxos|consensus|leader election|quorum consensus)\b/i,()=>visuals.raft],
  [/\b(lamport|vector clock|hybrid logical|logical clock|causal ordering|total ordering|fifo ordering)\b/i,()=>visuals.clocks],
  [/\b(replication|replica|primary\/backup|leader\/follower|active-active|active-passive)\b/i,()=>visuals.replication],
  [/\b(consistent hashing|rendezvous hashing|shard|partitioning|virtual nodes|hot keys?)\b/i,()=>visuals.sharding],
  [/\b(cache|single-flight|thundering herd|request coalescing)\b/i,()=>visuals.cache],
  [/\b(outbox|message|kafka|consumer|event sourcing|change data capture)\b/i,()=>visuals.messaging],
  [/\b(two-phase commit|three-phase commit|2pc|saga|distributed transaction|atomic commit)\b/i,()=>visuals.transactions],
  [/\b(retr|circuit breaker|bulkhead|timeout|hedged request|load shedding|backpressure)\b/i,()=>visuals.resilience],
  [/\b(token bucket|rate limit|admission control|fair queuing|concurrency limit)\b/i,()=>visuals.rate],
  [/\b(lsm|sstable|write-ahead log|memtable|compaction)\b/i,()=>visuals.lsm],
  [/\b(watermark|event time|stream processing|window)\b/i,()=>visuals.stream],
  [/\b(oauth|oidc|jwt|jwks|identity|spiffe|spire|svid|mtls|rbac|abac|authorization|obo|zero trust)\b/i,()=>visuals.identity],
  [/\b(trace|metrics|logs|opentelemetry|sli|slo|sla|error budget|sampling)\b/i,()=>visuals.observe]
];
function inferVisualKind(entry){
  const name=entry.concept.name.toLowerCase(),chapter=entry.chapter.id;
  if(/\b(gossip|membership protocol|service mesh|dependency graph|hnsw|bfs|dfs|minimum spanning tree|kruskal|prim|distributed algorithm)\b/.test(name))return 'network';
  if(/\b(consistent hashing|rendezvous hashing|virtual nodes)\b/.test(name))return 'ring';
  if(/\b(quorum|paxos|raft|consensus|leader election|compare-and-swap|fencing token)\b/.test(name))return 'quorum';
  if(/\b(eventual consistency|replication|replica|read repair|anti-entropy|merkle tree|active-active)\b/.test(name))return 'fanout';
  if(/\b(kafka|message queue|pub\/sub|event streaming|consumer|offset|dead-letter|retry queue|delayed queue|priority queue|event sourcing|change data capture)\b/.test(name))return 'log';
  if(/\b(clocks?|order\w*|ttl|expiration|time buckets?|watermarks?|event time|processing time|windows?|heartbeats?|leases?)\b/.test(name))return 'timeline';
  if(/\b(b-trees?|lsm|sstable|memtable|index|trie|hnsw|ivf)\b/.test(name)||chapter==='search-retrieval')return 'tree';
  if(/\b(two-phase|three-phase|transaction|saga|choreography|orchestration|compensat|outbox|inbox|obo)\b/.test(name))return 'swimlane';
  if(/\b(token bucket|leaky bucket|rate limit|admission control|backpressure|load shedding|fair queuing|concurrency limit|throttl)\b/.test(name))return 'meter';
  if(/\b(bloom|cuckoo filter|quotient filter|hyperloglog|count-min|minhash|simhash|sketch|probabilistic|sampling|heavy hitters|approximate)\b/.test(name)||chapter==='probabilistic-data-structures')return 'bits';
  if(/\b(shard\w*|partition\w*|scatter-gather|fan-out|hot key|rebalanc\w*)\b/.test(name))return 'shards';
  if(/\b(oauth|oidc|jwt|jwks|identity|spiffe|spire|svid|mtls|pki|rbac|abac|authorization|policy|trust boundar|control plane|data plane)\b/.test(name)||chapter==='distributed-identity-security')return 'layers';
  if(/\b(failover|standby|active-passive|disaster recovery|strangler|dual read|dual write|shadow read|migration|cutover|rollback|blue-green|canary)\b/.test(name)||chapter==='distributed-system-migration-patterns')return 'split';
  if(/\b(tree|hierarch|scheduler|workflow)\b/.test(name))return 'tree';
  return {
    'distributed-systems-fundamentals':'split','consensus-coordination':'quorum',replication:'fanout','partitioning-sharding':'shards',
    'distributed-caching':'cache','probabilistic-data-structures':'bits','distributed-messaging-eventing':'log','distributed-transactions':'swimlane',
    'reliability-fault-tolerance':'split','resilience-patterns':'split','rate-limiting-traffic-management':'meter','distributed-scheduling':'tree',
    'storage-systems':'tree','database-distributed-system-concepts':'shards','streaming-real-time-processing':'timeline','distributed-data-processing':'shards',
    'search-retrieval':'tree','distributed-algorithms':'network','api-service-architecture':'layers','distributed-identity-security':'layers',
    'observability-distributed-debugging':'fanout','distributed-system-migration-patterns':'split','consistency-conflict-patterns':'fanout',
    'distributed-deduplication-idempotency':'swimlane','time-based-distributed-patterns':'timeline','advanced-senior-staff-level-concepts':'layers'
  }[chapter]||'pipeline';
}
const mechanismVisuals={
  'Token bucket':{
    kind:'mechanism-token-bucket',
    steps:[
      [0,[],`Start with 3 tokens in a bucket whose burst capacity is 5. Refill rate r = 1 token/second.`,{tokens:3,elapsed:0,cost:0,result:'ready',active:'bucket'}],
      [0,[],`Two seconds pass. Lazily refill on the next request: min(5, 3 + 2 × 1) = 5 tokens.`,{tokens:5,elapsed:2,cost:0,result:'refill',active:'clock'}],
      [0,[],`A request arrives with cost 3. Compare its cost with the 5 currently available tokens.`,{tokens:5,elapsed:2,cost:3,result:'check',active:'request'}],
      [0,[],`Enough tokens exist, so atomically subtract 3. The request is admitted and 2 tokens remain.`,{tokens:2,elapsed:2,cost:3,result:'admit',active:'decision'}],
      [0,[],`A burst request costing 4 arrives while only 2 tokens are available. Do not let the balance go negative.`,{tokens:2,elapsed:2,cost:4,result:'check',active:'request'}],
      [0,[],`Reject or delay that request. Return retry guidance derived from the 2-token deficit and refill rate.`,{tokens:2,elapsed:2,cost:4,result:'reject',active:'decision'}],
      [0,[],`After 3 more seconds, refill to capacity: min(5, 2 + 3 × 1) = 5. Bursts are bounded while average rate stays near r.`,{tokens:5,elapsed:3,cost:0,result:'refill',active:'clock'}]
    ]
  },
  'Bloom filter':{
    kind:'mechanism-bloom-filter',
    steps:[
      [0,[],`Start with a 24-bit filter. Every bit is zero, so no key can be reported as maybe present.`,{bits:[],active:[],key:'—',inserted:0,occupancy:0,fpr:'0.0%',result:'empty'}],
      [0,[],`Insert “alpha”. Three hashes select positions 3, 11, and 18; set all three bits.`,{bits:[3,11,18],active:[3,11,18],key:'alpha',inserted:1,occupancy:13,fpr:'0.2%',result:'insert'}],
      [0,[],`Insert “beta”. Its positions 5, 11, and 20 share bit 11 with alpha, so only two new bits are set.`,{bits:[3,5,11,18,20],active:[5,11,20],key:'beta',inserted:2,occupancy:21,fpr:'0.9%',result:'insert'}],
      [0,[],`Probe “gamma” at positions 2, 11, and 17. Bit 2 is zero, proving gamma is definitely absent.`,{bits:[3,5,11,18,20],active:[2,11,17],key:'gamma',inserted:2,occupancy:21,fpr:'0.9%',result:'absent'}],
      [0,[],`After many inserts, 17 of 24 bits are set. Occupancy rises and unrelated keys increasingly collide with set bits.`,{bits:[0,1,3,4,5,6,8,9,10,11,12,14,15,17,18,20,22],active:[],key:'many keys',inserted:10,occupancy:71,fpr:'35.6%',result:'saturated'}],
      [0,[],`Probe unseen key “omega” at 4, 12, and 20. All are already one, creating a false positive: maybe present.`,{bits:[0,1,3,4,5,6,8,9,10,11,12,14,15,17,18,20,22],active:[4,12,20],key:'omega (never inserted)',inserted:10,occupancy:71,fpr:'35.6%',result:'false-positive'}],
      [0,[],`Rebuild into a 48-bit filter sized for expected cardinality. Lower occupancy restores a useful false-positive rate.`,{size:48,bits:[1,5,9,14,19,23,28,31,36,40,44,47],active:[1,23,47],key:'rebuilt filter',inserted:10,occupancy:25,fpr:'1.6%',result:'rebuilt'}]
    ]
  },
  'Count-Min Sketch':{
    kind:'mechanism-count-min-sketch',
    steps:[
      [0,[],`Start with four hash rows and eight counters per row. A query returns the minimum selected counter.`,{matrix:Array(32).fill(0),active:[],key:'—',truth:0,estimate:0,error:0,result:'empty'}],
      [0,[],`Record “fox”. Each row hashes fox to one column and increments that counter.`,{matrix:[0,0,1,0,0,0,0,0, 0,0,0,0,0,1,0,0, 0,1,0,0,0,0,0,0, 0,0,0,0,1,0,0,0],active:[2,13,17,28],key:'fox +1',truth:1,estimate:1,error:0,result:'update'}],
      [0,[],`Record fox twice more. Reading the same four positions gives [3,3,3,3], so min = 3.`,{matrix:[0,0,3,0,0,0,0,0, 0,0,0,0,0,3,0,0, 0,3,0,0,0,0,0,0, 0,0,0,0,3,0,0,0],active:[2,13,17,28],key:'fox +2',truth:3,estimate:3,error:0,result:'update'}],
      [0,[],`Other keys collide with fox in some rows. The affected counters rise, but at least one row remains collision-free.`,{matrix:[1,0,5,0,0,1,0,0, 0,1,0,0,0,4,1,0, 0,3,0,2,0,0,1,0, 0,0,1,0,6,0,0,1],active:[2,13,17,28],key:'fox query',truth:3,estimate:3,error:0,result:'query'}],
      [0,[],`A narrow sketch under heavy load accumulates collisions in every fox counter: [9,7,6,11].`,{matrix:[4,3,9,5,2,6,3,4, 2,6,3,4,5,7,8,2, 3,6,5,7,2,4,6,3, 4,3,5,2,11,4,3,5],active:[2,13,17,28],key:'fox query under load',truth:3,estimate:6,error:3,result:'overestimate'}],
      [0,[],`The estimate is min(9,7,6,11) = 6. Count-Min never underestimates, but collisions add an error of 3.`,{matrix:[4,3,9,5,2,6,3,4, 2,6,3,4,5,7,8,2, 3,6,5,7,2,4,6,3, 4,3,5,2,11,4,3,5],active:[2,13,17,28],key:'fox',truth:3,estimate:6,error:3,result:'overestimate'}],
      [0,[],`Increase width to reduce collision probability; increase depth to reduce the chance every row collides.`,{matrix:[1,0,4,1,0,2,0,1, 0,2,0,1,0,3,2,0, 1,3,0,2,0,1,2,0, 1,0,2,0,4,1,0,1],active:[2,13,17,28],key:'fox after resize',truth:3,estimate:3,error:0,result:'resized'}]
    ]
  }
};
let activeConcept=null,conceptModel=null,conceptStep=0,conceptPlaying=false,conceptView='architecture',conceptZoom=1;
const conceptZoomLevels=[.6,.75,.9,1,1.15,1.3,1.5];
const authoredLessons=window.SYSTEM_DESIGN_LESSONS||{};
const lessonLayouts={
  sequence:[[10,20],[36,20],[64,20],[90,20],[23,72],[50,72],[77,72],[50,46],[90,72]],
  workflow:[[10,18],[38,18],[66,18],[90,18],[22,72],[50,72],[78,72],[50,45],[90,72]],
  transaction:[[12,18],[40,18],[68,18],[88,18],[20,72],[50,72],[80,72],[50,45],[88,72]],
  replicas:[[50,12],[17,38],[50,48],[83,38],[28,82],[72,82],[50,82],[12,78],[88,78]],
  consensus:[[50,12],[14,46],[50,48],[86,46],[27,82],[73,82],[50,82],[12,80],[88,80]],
  topology:[[50,12],[15,40],[50,48],[85,40],[25,82],[75,82],[50,82],[12,78],[88,78]],
  cache:[[10,48],[38,20],[38,76],[68,76],[90,48],[68,20],[50,48],[15,82],[88,82]],
  log:[[10,22],[35,22],[65,22],[90,22],[20,72],[50,72],[80,72],[50,47],[90,72]],
  capacity:[[10,50],[36,22],[36,78],[66,22],[66,78],[90,50],[50,50],[14,82],[86,82]],
  timeline:[[10,50],[35,50],[65,50],[90,50],[22,78],[50,78],[78,78],[50,22],[90,78]],
  storage:[[12,18],[40,18],[68,18],[88,18],[22,72],[50,72],[78,72],[50,45],[88,72]],
  tree:[[50,12],[25,42],[75,42],[12,78],[38,78],[62,78],[88,78],[50,78],[50,48]],
  bits:[[10,22],[38,22],[68,22],[90,22],[22,74],[50,74],[78,74],[50,48],[90,74]],
  counters:[[10,22],[38,22],[68,22],[90,22],[22,74],[50,74],[78,74],[50,48],[90,74]],
  stream:[[10,20],[36,20],[64,20],[90,20],[22,74],[50,74],[78,74],[50,48],[90,74]],
  mapreduce:[[10,20],[36,20],[64,20],[90,20],[22,74],[50,74],[78,74],[50,48],[90,74]],
  search:[[10,48],[35,20],[35,76],[65,20],[65,76],[90,48],[50,48],[12,82],[88,82]],
  graph:[[50,12],[16,40],[50,48],[84,40],[26,82],[74,82],[50,82],[12,78],[88,78]],
  gateway:[[10,50],[35,20],[35,78],[65,20],[65,78],[90,50],[50,50],[12,82],[88,82]],
  identity:[[10,50],[35,18],[35,80],[65,18],[65,80],[90,50],[50,50],[12,82],[88,82]],
  trust:[[10,50],[35,18],[35,80],[65,18],[65,80],[90,50],[50,50],[12,82],[88,82]],
  trace:[[10,20],[35,20],[65,20],[90,20],[22,74],[50,74],[78,74],[50,47],[90,74]],
  migration:[[12,20],[40,20],[68,20],[88,20],[22,76],[50,76],[78,76],[50,48],[88,76]],
  dedup:[[10,48],[38,20],[38,76],[68,20],[68,76],[90,48],[50,48],[12,82],[88,82]],
  connection:[[10,22],[38,22],[68,22],[90,22],[22,75],[50,75],[78,75],[50,48],[90,75]],
  cells:[[50,12],[16,40],[50,48],[84,40],[25,82],[75,82],[50,82],[12,78],[88,78]]
};
function lessonFor(entry){
  return authoredLessons[`${entry.chapter.id}::${entry.concept.name}`]||null;
}
function modelFromLesson(lesson){
  return {
    kind:'lesson',
    lesson,
    nodes:lesson.entities.map(entity=>[entity[1],entity[2]]),
    steps:lesson.steps.map((step,index)=>[index,[...Array(index).keys()],step.narration])
  };
}
function mechanismFor(entry){
  if(mechanismVisuals[entry.concept.name])return mechanismVisuals[entry.concept.name];
  const mechanism=(window.SYSTEM_DESIGN_MECHANISMS||{})[`${entry.chapter.id}::${entry.concept.name}`];
  if(!mechanism)return null;
  const indexes=new Map(mechanism.diagram.components.map((component,index)=>[component[0],index]));
  return {
    kind:'mechanism',
    diagram:mechanism.diagram,
    nodes:mechanism.diagram.components.map(component=>[component[1],component[2]]),
    steps:mechanism.steps.map((description,index)=>{
      const frame=mechanism.diagram.frames[index];
      const active=frame?.[0]>=0?indexes.get(mechanism.diagram.links[frame[0]][1]):0;
      const done=Object.entries(frame?.[1]||{}).filter(([,state])=>state==='done').map(([id])=>indexes.get(id));
      return [active??0,done,description];
    })
  };
}
function modelFromStoryboard(entry){
  const source=entry.concept.diagram;
  if(!source)throw new Error(`Missing visualization for ${entry.chapter.id}::${entry.concept.name}`);
  const frames=source.frames.map(frame=>[frame[0],{...frame[1]}]);
  const narratives=(entry.concept.visual?.steps||[]).map(step=>step[2]);
  if(frames.length<5){
    frames.unshift([-1,{[source.components[0][0]]:'active'}]);
    narratives.unshift(entry.concept.summary);
  }
  while(frames.length<5)frames.push([-1,{...frames[frames.length-1][1]}]);
  while(narratives.length<frames.length)narratives.push(entry.concept.tradeoff);
  return {
    kind:'storyboard',
    diagram:{...source,frames},
    summary:entry.concept.summary,
    tradeoff:entry.concept.tradeoff,
    nodes:source.components.map(component=>[component[1],component[2]]),
    steps:frames.map((_,index)=>[index,[...Array(index).keys()],narratives[index]])
  };
}
function makeConceptModel(entry){
  const lesson=lessonFor(entry);
  return lesson?modelFromLesson(lesson):modelFromStoryboard(entry);
}
function nodeState(index,step){return index===step[0]?'active':step[1].includes(index)?'done':''}
function nodeCard(node,index,step,className='system-node'){return `<div class="${className} ${nodeState(index,step)}"><b>${esc(node[0])}</b><small>${esc(node[1])}</small></div>`}
function componentIcon(label,type){
  const icons={client:'●',gateway:'◆',service:'▣',database:'▰',replica:'▰',cache:'▤',queue:'≡',worker:'⚙',control:'◆',storage:'▰',index:'⌗',node:'▣',clock:'◷',bitset:'▦'};
  if(type&&icons[type])return icons[type];
  if(/client|user|caller|reader|writer|producer|consumer/i.test(label))return '●';
  if(/database|primary|replica|store|shard|sstable|table/i.test(label))return '▰';
  if(/cache|memory|memtable/i.test(label))return '▤';
  if(/queue|log|broker|stream/i.test(label))return '≡';
  if(/router|gateway|load balancer|coordinator|leader|scheduler/i.test(label))return '◆';
  if(/token|key|credential|identity|policy/i.test(label))return '◇';
  return '▣';
}
function sceneFromDiagram(diagram){
  const indexes=new Map(diagram.components.map((component,index)=>[component[0],index]));
  return {
    components:diagram.components.map(component=>[component[1],component[2],component[3]]),
    points:diagram.components.map(component=>[component[4],component[5]]),
    edges:diagram.links.map(link=>[indexes.get(link[0]),indexes.get(link[1]),link[2]]),
    frames:diagram.frames.map(frame=>({edge:frame[0],states:Object.fromEntries(Object.entries(frame[1]).map(([id,state])=>[indexes.get(id),state]))}))
  };
}
function architectureScene(name){
  if(name==='Gossip protocols')return {
    components:[['Node A','knows update v5'],['Node B','state v4'],['Node C','state v3'],['Node D','state v4'],['Node E','state v3']],
    points:[[50,12],[86,38],[72,82],[28,82],[14,38]],
    edges:[[0,1,'gossip v5'],[1,2,'spread'],[0,4,'random peer'],[4,3,'spread'],[2,3,'digest'],[3,1,'converge']],
    frames:[
      {edge:0,states:{0:'active'}},{edge:1,states:{0:'done',1:'active'}},{edge:3,states:{0:'done',1:'done',4:'active'}},{edge:5,states:{0:'done',1:'done',2:'done',3:'done',4:'done'}}
    ]
  };
  if(name==='Eventual consistency')return {
    components:[['Client','write v2'],['Primary DB','v2 committed'],['Replica A','v1 → v2'],['Replica B','v1 → v2'],['Reader','stale then fresh']],
    points:[[8,50],[34,50],[68,22],[68,78],[92,50]],
    edges:[[0,1,'write v2'],[1,2,'async copy'],[1,3,'delayed copy'],[4,3,'read v1'],[2,3,'repair v2'],[3,4,'read v2']],
    frames:[
      {edge:0,states:{0:'active',1:'active'}},{edge:1,states:{1:'done',2:'active',3:'risk'}},{edge:2,states:{1:'done',2:'done',3:'active'}},{edge:5,states:{1:'done',2:'done',3:'done',4:'done'}}
    ]
  };
  if(/\b(failover|standby|active-passive)\b/i.test(name))return {
    components:[['Client','live traffic'],['Load balancer','health-aware route'],['Primary DB','serving writes'],['Replica A','synchronous standby'],['Replica B','asynchronous copy']],
    points:[[8,50],[32,50],[62,22],[62,76],[90,76]],
    edges:[[0,1,'request'],[1,2,'active route'],[2,3,'replicate'],[2,4,'replicate'],[1,3,'failover route']],
    frames:[
      {edge:1,states:{1:'done',2:'active'}},{edge:2,states:{2:'risk',3:'active'}},{edge:3,states:{2:'risk',3:'active',4:'active'}},{edge:4,states:{2:'risk',3:'active'}},{edge:4,states:{2:'risk',3:'done',1:'done'}}
    ]
  };
  if(/\b(cache-aside|read-through cache|write-through cache|write-behind cache|refresh-ahead|cache invalidation|local \+ distributed cache)\b/i.test(name)){
    const writeBehind=/write-behind/i.test(name),readThrough=/read-through/i.test(name),writeThrough=/write-through/i.test(name),refresh=/refresh-ahead/i.test(name),local=/local \+/i.test(name),invalidation=/invalidation/i.test(name);
    const middle=writeBehind?['Write queue','durable async buffer']:refresh?['Refresher','before expiry']:local?['Distributed cache','shared copy']:invalidation?['Invalidation bus','version event']:['Cache loader','miss path'];
    const edges=writeBehind?[[0,1,'write'],[1,4,'fast ack'],[1,2,'enqueue'],[2,3,'async flush']]:writeThrough?[[0,1,'write'],[1,3,'sync write'],[3,1,'ack'],[1,4,'response']]:readThrough?[[0,1,'read'],[1,2,'miss'],[2,3,'load'],[3,1,'fill'],[1,4,'hit']]:refresh?[[0,1,'hit'],[1,4,'serve'],[2,3,'refresh'],[3,1,'new value']]:local?[[0,1,'local miss'],[1,2,'shared miss'],[2,3,'source read'],[3,2,'fill'],[2,1,'promote']]:invalidation?[[0,3,'write'],[3,2,'publish version'],[2,1,'invalidate'],[0,1,'next read']]:[[0,1,'lookup'],[1,0,'miss'],[0,3,'source read'],[3,0,'value'],[0,1,'fill'],[0,4,'response']];
    return {
      components:[['Application','request owner'],['Cache','fast copy'],middle,['Database','source of truth'],['Client','response']],
      points:[[12,48],[40,20],[66,20],[66,78],[92,48]],
      edges,
      frames:edges.map((_,index)=>({edge:index,states:{[edges[index][0]]:'done',[edges[index][1]]:'active'}}))
    };
  }
  return null;
}
function renderArchitecture(scene,step,stepCount,currentIndex=conceptStep){
  const frameIndex=Math.round(currentIndex*(scene.frames.length-1)/Math.max(1,stepCount-1));
  const frame=scene.frames[frameIndex]||{edge:-1,states:{}};
  const edge=scene.edges[frame.edge],points=scene.points.map(([x,y])=>[Math.max(16,Math.min(84,x)),Math.max(14,Math.min(86,y))]);
  const completedEdges=new Set(scene.frames.slice(0,frameIndex).map(item=>item.edge).filter(index=>index>=0));
  const activeEndpoints=new Set(edge?[edge[0],edge[1]]:[]);
  const defs='<defs><marker id="flowArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"/></marker></defs>';
  const links=scene.edges.map(([from,to,label],index)=>{const a=points[from],b=points[to],state=index===frame.edge?'active':completedEdges.has(index)?'done':'';return `<g class="architecture-link ${state}"><title>${esc(label)}</title><line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" marker-end="url(#flowArrow)"/></g>`}).join('');
  const components=scene.components.map((node,index)=>{const state=activeEndpoints.has(index)?'active':frame.states[index]||'';return `<div class="architecture-component ${state}" style="left:${points[index][0]}%;top:${points[index][1]}%"><i>${componentIcon(node[0],node[2])}</i><b>${esc(node[0])}</b><small>${esc(node[1])}</small></div>`}).join('');
  return `<svg class="architecture-links" viewBox="0 0 100 100" preserveAspectRatio="none">${defs}${links}</svg>${components}`;
}
function renderStoryboard(model,step){
  const scene=sceneFromDiagram(model.diagram);
  const frame=scene.frames[conceptStep]||{edge:-1,states:{}};
  const focused=Object.entries(frame.states||{}).filter(([,state])=>state==='active').map(([index])=>scene.components[index]?.[0]).filter(Boolean);
  const focus=focused.length?focused.join(' ↔ '):'System state';
  const stages=model.diagram.components.map((component,index)=>{
    const state=frame.states?.[index]||'';
    return `<span class="${state}"><i>${componentIcon(component[1],component[3])}</i>${esc(component[1])}</span>`;
  }).join('');
  return `<div class="system-storyboard storyboard-${esc(model.diagram.kind)}">
    <div class="storyboard-head"><span><small>Current interaction</small><b>${esc(focus)}</b></span><p>${esc(step[2])}</p></div>
    <div class="storyboard-canvas">${renderArchitecture(scene,step,model.steps.length)}</div>
    <div class="storyboard-components">${stages}</div>
    <div class="storyboard-tension"><small>Design pressure / cost</small>${esc(model.tradeoff)}</div>
  </div>`;
}
function radialScene(nodes,step,ring=false){
  const points=nodes.map((_,index)=>{const angle=-Math.PI/2+index*2*Math.PI/nodes.length;return [50+36*Math.cos(angle),50+36*Math.sin(angle)]});
  const edges=[];if(ring){points.forEach((point,index)=>edges.push([point,points[(index+1)%points.length],index]))}else{points.forEach((point,index)=>{for(let other=index+1;other<points.length;other++)edges.push([point,points[other],Math.max(index,other)-1])})}
  return `<svg class="scene-lines" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><marker id="sceneArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z"/></marker></defs>${ring?'<circle cx="50" cy="50" r="36" class="ring-track"/>':''}${edges.map(([a,b,index])=>`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" marker-end="url(#sceneArrow)" class="${conceptStep>index?'done':conceptStep===index?'active':''}"/>`).join('')}</svg>${nodes.map((node,index)=>`<div class="diagram-node ${nodeState(index,step)}" style="left:${points[index][0]}%;top:${points[index][1]}%">${ring?`<i>${index}</i>`:''}<b>${esc(node[0])}</b><small>${esc(node[1])}</small></div>`).join('')}`;
}
function positionedScene(nodes,step,kind){
  let points;
  if(kind==='fanout')points=nodes.map((_,i)=>i===0?[50,16]:[12+(i-1)*(76/Math.max(1,nodes.length-2)),74]);
  else if(kind==='quorum')points=nodes.map((_,i)=>i===0?[50,13]:i===nodes.length-1?[50,84]:[12+(i-1)*(76/Math.max(1,nodes.length-2)),54]);
  else if(kind==='cache'){const slots=[[10,50],[36,22],[36,78],[66,78],[90,50],[66,22]];points=nodes.map((_,i)=>slots[i])}
  else points=nodes.map((_,i)=>i===0?[50,12]:i<3?[25+(i-1)*50,47]:[18+(i-3)*(64/Math.max(1,nodes.length-4)),82]);
  const lines=[];for(let i=1;i<nodes.length;i++){const from=kind==='cache'?points[i-1]:kind==='tree'&&i>2?points[i%2?1:2]:points[0];lines.push([from,points[i],i-1])}if(kind==='cache'&&nodes.length>3)lines.push([points[1],points[nodes.length-1],1]);
  return `<svg class="scene-lines" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><marker id="topologyArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z"/></marker></defs>${lines.map(([a,b,index])=>`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" marker-end="url(#topologyArrow)" class="${conceptStep>index?'done':conceptStep===index?'active':''}"/>`).join('')}</svg>${nodes.map((node,index)=>`<div class="diagram-node ${nodeState(index,step)}" style="left:${points[index][0]}%;top:${points[index][1]}%"><i>${componentIcon(node[0])}</i><b>${esc(node[0])}</b><small>${esc(node[1])}</small></div>`).join('')}`;
}
function shardScene(nodes,step){
  const points=nodes.map((_,index)=>index===0?[9,50]:index===1?[35,50]:[76,15+(index-2)*(70/Math.max(1,nodes.length-3))]);
  const edges=nodes.slice(1).map((_,index)=>index===0?[points[0],points[1],0]:[points[1],points[index+1],index]);
  return `<svg class="scene-lines" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><marker id="shardArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z"/></marker></defs>${edges.map(([a,b,index])=>`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" marker-end="url(#shardArrow)" class="${conceptStep>index?'done':conceptStep===index?'active':''}"/>`).join('')}</svg>${nodes.map((node,index)=>`<div class="diagram-node shard-component ${nodeState(index,step)}" style="left:${points[index][0]}%;top:${points[index][1]}%"><i>${componentIcon(node[0])}</i><b>${esc(node[0])}</b><small>${esc(node[1])}</small></div>`).join('')}`;
}
function renderTokenBucketMechanism(step){
  const state=step[3],tokens=Array.from({length:5},(_,index)=>`<i class="token-slot ${index<state.tokens?'full':''}"></i>`).join('');
  const result={ready:'Waiting for a request',refill:`Refilled to ${state.tokens} tokens`,check:`Need ${state.cost}; have ${state.tokens}`,admit:`ADMIT · ${state.tokens} remain`,reject:`REJECT · keep ${state.tokens} tokens`}[state.result];
  return `<div class="token-mechanism"><div class="token-clock ${state.active==='clock'?'active':''}"><b>Refill clock</b><small>elapsed = ${state.elapsed}s<br>rate = 1 token/s</small></div><div class="bucket-wrap"><div class="bucket-formula">tokens = min(B, tokens + elapsed × r)</div><div class="token-bucket-shape"><span class="bucket-capacity">capacity B = 5</span>${tokens}</div><div class="token-result ${state.result}">${result}</div></div><div><div class="token-request ${state.active==='request'?'active':''}"><b>Incoming request</b><small>cost = ${state.cost||'—'} tokens</small></div><div class="token-decision ${state.active==='decision'?'active':''}" style="margin-top:12px"><b>Atomic decision</b><small>consume or reject</small></div></div><div class="token-pseudocode">refill = min(capacity, tokens + elapsed × rate)<br>if refill ≥ cost: tokens = refill - cost; admit<br>else: tokens = refill; reject or delay</div></div>`;
}
function renderBloomFilterMechanism(step){
  const state=step[3],bits=new Set(state.bits),active=new Set(state.active);
  const cells=Array.from({length:state.size||24},(_,index)=>`<i class="${bits.has(index)?'set':''} ${active.has(index)?'active':''}"><small>${index}</small><b>${bits.has(index)?1:0}</b></i>`).join('');
  const resultLabels={empty:'Empty filter',insert:'Set all hash positions',absent:'DEFINITELY ABSENT',saturated:'High false-positive pressure','false-positive':'MAYBE PRESENT · false positive',rebuilt:'Rebuilt with more bits'};
  return `<div class="probability-mechanism bloom-mechanism">
    <div class="prob-input"><small>Current key</small><b>${esc(state.key)}</b><span>h₁ · h₂ · h₃</span></div>
    <div class="bloom-array">${cells}</div>
    <div class="prob-result ${state.result}">${resultLabels[state.result]}</div>
    <div class="prob-metrics"><span><small>Inserted keys</small><b>${state.inserted}</b></span><span><small>Bit occupancy</small><b>${state.occupancy}%</b><i><em style="width:${state.occupancy}%"></em></i></span><span><small>Estimated FPR</small><b>${state.fpr}</b></span></div>
    <div class="prob-rule">Any selected bit = 0 → definitely absent<br>All selected bits = 1 → maybe present</div>
  </div>`;
}
function renderCountMinSketchMechanism(step){
  const state=step[3],active=new Set(state.active),rows=Array.from({length:4},(_,row)=>{
    const cells=state.matrix.slice(row*8,row*8+8).map((value,column)=>{const index=row*8+column;return `<i class="${active.has(index)?'active':''}"><small>${column}</small><b>${value}</b></i>`}).join('');
    return `<div class="cms-row"><strong>h${row+1}</strong>${cells}</div>`;
  }).join('');
  return `<div class="probability-mechanism cms-mechanism">
    <div class="prob-input"><small>Stream item</small><b>${esc(state.key)}</b><span>one counter per hash row</span></div>
    <div class="cms-matrix">${rows}</div>
    <div class="cms-equation">estimate(key) = min(selected counters) = <b>${state.estimate}</b></div>
    <div class="prob-metrics"><span><small>True count</small><b>${state.truth}</b></span><span><small>Estimated count</small><b>${state.estimate}</b></span><span class="${state.error?'warning':''}"><small>Collision error</small><b>+${state.error}</b></span></div>
    <div class="prob-rule">Width controls collision error · Depth controls confidence<br>Counters only increase, so the estimate never falls below the true count.</div>
  </div>`;
}
function teachingStateRows(state,previousState){
  return Object.entries(state||{}).map(([field,value])=>{
    const previous=previousState?.[field],changed=previous!==undefined&&String(previous)!==String(value);
    return `<span class="lesson-state-row ${changed?'changed':''}" title="${esc(`${field}: ${value}`)}"><small>${esc(field)}</small><b>${esc(value)}</b></span>`;
  }).join('');
}
function collisionFreeLessonPoints(count){
  const columns=count<=4?2:3,rows=Math.ceil(count/columns);
  const x=columns===2?[27,73]:[16,50,84];
  const y=rows===1?[50]:rows===2?[27,73]:[17,50,83];
  return Array.from({length:count},(_,index)=>{
    const row=Math.floor(index/columns),itemsInRow=Math.min(columns,count-row*columns);
    const rowX=itemsInRow===1?[50]:itemsInRow===2?[27,73]:x;
    return [rowX[index%columns],y[row]];
  });
}
function renderShardMergeLesson(lesson){
  const step=lesson.steps[conceptStep],states=step.states;
  const sourceA=states.a,sourceB=states.b,target=states.merged,router=states.router,controller=states.controller;
  const copying=controller.phase==='snapshot copy',catching=controller.phase==='catch-up';
  const cutover=['cutover','complete'].includes(controller.phase),retired=controller.phase==='complete';
  const copyValue=parseInt(target.copy,10)||0;
  const source=(id,label,state,range)=>`<article class="merge-shard source ${retired?'retired':''} ${step.action?.[0]===id?'active':''}">
    <header><b>${label}</b><span>${esc(state.status)}</span></header>
    <div class="merge-range">${range}<i>${esc(state.rows)} rows</i></div>
    <footer><span>Writes</span><b>${esc(state.writes)}</b></footer>
  </article>`;
  return `<div class="teaching-lesson shard-merge-lesson">
    <div class="lesson-scenario"><b>Worked example</b>${esc(lesson.scenario)}</div>
    <div class="lesson-action active"><b>${esc(step.title)}</b><span>${esc(step.action?.[2]||'Inspect the original ownership map')}</span></div>
    <div class="merge-stage">
      <section class="merge-routing">
        <header><b>Routing directory</b><span>epoch ${esc(router.epoch)}</span></header>
        <div class="merge-map ${cutover?'combined':''}">
          ${cutover?'<span class="range-c">000–999 → C</span>':'<span class="range-a">000–499 → A</span><span class="range-b">500–999 → B</span>'}
        </div>
        <div class="merge-lookup"><span>lookup(customer_id = 742)</span><b>→ ${esc(router.lookup742)}</b></div>
      </section>
      <section class="merge-sources">
        ${source('a','Shard A',sourceA,'000–499')}
        ${source('b','Shard B',sourceB,'500–999')}
      </section>
      <div class="merge-copy-lanes ${copying?'copying':''} ${catching?'catching':''} ${cutover?'done':''}">
        <span>A snapshot / deltas</span><i>→</i><span>B snapshot / deltas</span><i>→</i>
      </div>
      <article class="merge-shard target ${target.status==='empty'?'empty':''} ${step.action?.[1]==='merged'?'active':''}">
        <header><b>Merged shard C</b><span>${esc(target.status)}</span></header>
        <div class="merge-range combined">000–999<i>${esc(target.copy)} copied</i></div>
        <div class="merge-progress"><i style="width:${copyValue}%"></i></div>
        <footer><span>Delta lag</span><b>${esc(target.deltaLag)}</b></footer>
      </article>
      <section class="merge-controller">
        <header><b>Merge controller</b><span>${esc(controller.phase)}</span></header>
        <div class="merge-checks">
          <span class="${copyValue===100?'done':''}">① snapshot copy</span>
          <span class="${target.deltaLag==='0 writes'?'done':''}">② delta catch-up</span>
          <span class="${controller.validation==='passed'||controller.validation.includes('match')||controller.validation.includes('closed')?'done':''}">③ validate</span>
          <span class="${cutover?'done':''}">④ epoch cutover</span>
          <span class="${retired?'done':''}">⑤ retire sources</span>
        </div>
        <footer><span>Fence</span><b>${esc(controller.fence)}</b><span>Validation</span><b>${esc(controller.validation)}</b></footer>
      </section>
    </div>
  </div>`;
}
function renderTeachingLesson(model){
  const lesson=model.lesson,step=lesson.steps[conceptStep],previous=lesson.steps[Math.max(0,conceptStep-1)];
  if(lesson.family==='shard-merge')return renderShardMergeLesson(lesson);
  if(lesson.family==='explain'){
    return `<div class="lesson-explainer"><div class="lesson-scenario">${esc(lesson.scenario)}</div><div class="lesson-idea-grid">${lesson.entities.map((entity,index)=>{
      const state=step.states?.[entity[0]]||{};
      return `<article class="lesson-idea ${index===step[0]?'active':index<conceptStep?'done':''}"><i>${String(index+1).padStart(2,'0')}</i><b>${esc(entity[1])}</b><p>${esc(entity[2])}</p>${teachingStateRows(state,previous.states?.[entity[0]])}</article>`;
    }).join('')}</div></div>`;
  }
  const rows=Math.ceil(lesson.entities.length/(lesson.entities.length<=4?2:3));
  const points=collisionFreeLessonPoints(lesson.entities.length);
  const indexes=new Map(lesson.entities.map((entity,index)=>[entity[0],index]));
  const action=step.action,active=new Set(action?[action[0],action[1]]:[]);
  const connectionHtml=(lesson.connections||[]).map(connection=>{
    const from=indexes.get(connection[0]),to=indexes.get(connection[1]);if(from===undefined||to===undefined)return '';
    const a=points[from],b=points[to],isActive=action&&connection[0]===action[0]&&connection[1]===action[1];
    return `<g class="lesson-link ${isActive?'active':''}"><line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" marker-end="url(#lessonArrow)"/></g>`;
  }).join('');
  const cards=lesson.entities.map((entity,index)=>{
    const id=entity[0],state=step.states?.[id]||{},previousState=previous.states?.[id]||{};
    return `<article class="lesson-entity ${active.has(id)?'active':''}" style="left:${points[index][0]}%;top:${points[index][1]}%"><header><i>${componentIcon(entity[1])}</i><span><b>${esc(entity[1])}</b><small>${esc(entity[2])}</small></span></header><div>${teachingStateRows(state,previousState)}</div></article>`;
  }).join('');
  const changes=[];
  for(const entity of lesson.entities){
    const now=step.states?.[entity[0]]||{},before=previous.states?.[entity[0]]||{};
    for(const [field,value] of Object.entries(now))if(before[field]!==undefined&&String(before[field])!==String(value))changes.push(`${entity[1]} · ${field}: ${before[field]} → ${value}`);
  }
  return `<div class="teaching-lesson family-${esc(lesson.family)}"><div class="lesson-scenario"><b>Scenario</b>${esc(lesson.scenario)}</div><div class="lesson-action ${action?'active':''}"><b>${esc(step.title)}</b><span>${esc(action?.[2]||'Observe the system state')}</span></div><div class="lesson-map lesson-rows-${rows}" style="--lesson-map-height:${Math.max(500,rows*220)}px"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><defs><marker id="lessonArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z"/></marker></defs>${connectionHtml}</svg>${cards}</div><div class="lesson-changes"><b>What changed</b>${changes.length?changes.map(change=>`<span>${esc(change)}</span>`).join(''):'<span>Initial state—nothing has changed yet.</span>'}</div></div>`;
}
function renderConceptScene(model,step){
  const nodes=model.nodes,kind=model.kind;
  if(kind==='lesson'){ $('#conceptFlow').className=`concept-flow kind-lesson family-${model.lesson.family}`;return renderTeachingLesson(model) }
  if(kind==='storyboard'){ $('#conceptFlow').className=`concept-flow kind-storyboard storyboard-${model.diagram.kind}`;return renderStoryboard(model,step) }
  if(kind==='mechanism-token-bucket'){ $('#conceptFlow').className='concept-flow kind-mechanism';return renderTokenBucketMechanism(step) }
  if(kind==='mechanism-bloom-filter'){ $('#conceptFlow').className='concept-flow kind-mechanism kind-probability';return renderBloomFilterMechanism(step) }
  if(kind==='mechanism-count-min-sketch'){ $('#conceptFlow').className='concept-flow kind-mechanism kind-probability';return renderCountMinSketchMechanism(step) }
  if(model.diagram&&kind==='mechanism'){$('#conceptFlow').className='concept-flow kind-authored kind-mechanism';return renderArchitecture(sceneFromDiagram(model.diagram),step,model.steps.length)}
  const architecture=architectureScene(activeConcept.concept.name);if(architecture){$('#conceptFlow').className='concept-flow kind-architecture';return renderArchitecture(architecture,step,model.steps.length)}
  if(model.diagram){$('#conceptFlow').className=`concept-flow kind-authored kind-${model.diagram.kind}`;return renderArchitecture(sceneFromDiagram(model.diagram),step,model.steps.length)}
  if(kind==='network'||kind==='ring')return radialScene(nodes,step,kind==='ring');
  if(['fanout','quorum','tree','cache'].includes(kind))return positionedScene(nodes,step,kind);
  if(kind==='timeline')return `<div class="timeline-track"></div>${nodes.map((node,index)=>`<div class="timeline-event ${nodeState(index,step)}" style="left:${8+index*(84/Math.max(1,nodes.length-1))}%"><i>T${index}</i><b>${esc(node[0])}</b><small>${esc(node[1])}</small></div>`).join('')}`;
  if(kind==='log')return `<div class="log-rail">${nodes.map((node,index)=>`<div class="log-cell ${nodeState(index,step)}"><i>${index}</i><b>${esc(node[0])}</b><small>${esc(node[1])}</small></div>`).join('')}</div><div class="log-cursor" style="left:${10+step[0]*(80/Math.max(1,nodes.length-1))}%">▲ current</div>`;
  if(kind==='swimlane')return `<div class="swimlanes">${nodes.map((node,index)=>`<div class="swimlane ${nodeState(index,step)}"><i>${String(index+1).padStart(2,'0')}</i><b>${esc(node[0])}</b><span>${esc(node[1])}</span><em>${index===step[0]?'message in flight →':''}</em></div>`).join('')}</div>`;
  if(kind==='meter')return `<div class="meter-gauge"><span style="width:${Math.max(12,(conceptStep+1)/model.steps.length*100)}%"></span></div><div class="token-row">${Array.from({length:10},(_,i)=>`<i class="${i<Math.max(2,8-conceptStep)?'full':''}"></i>`).join('')}</div><div class="meter-nodes">${nodes.map((node,index)=>nodeCard(node,index,step)).join('')}</div>`;
  if(kind==='bits')return `<div class="hash-arrows">hash₁ ↘ &nbsp; hash₂ ↓ &nbsp; hash₃ ↙</div><div class="bit-array">${Array.from({length:16},(_,i)=>`<i class="${(i*3+conceptStep)%7<3?'on':''}">${(i*3+conceptStep)%7<3?1:0}</i>`).join('')}</div><div class="bit-nodes">${nodes.map((node,index)=>nodeCard(node,index,step)).join('')}</div>`;
  if(kind==='shards')return shardScene(nodes,step);
  if(kind==='layers')return `<div class="layer-diagram">${nodes.map((node,index)=>`<div class="semantic-layer ${nodeState(index,step)}"><i>${index+1}</i><b>${esc(node[0])}</b><small>${esc(node[1])}</small></div>`).join('')}</div>`;
  if(kind==='split'){const midpoint=Math.ceil(nodes.length/2);return `<div class="split-scene"><div class="split-zone old"><strong>PATH A</strong>${nodes.slice(0,midpoint).map((node,index)=>nodeCard(node,index,step)).join('')}</div><div class="split-switch ${conceptStep>=midpoint?'moved':''}">traffic ⇢</div><div class="split-zone next"><strong>PATH B</strong>${nodes.slice(midpoint).map((node,index)=>nodeCard(node,index+midpoint,step)).join('')}</div></div>`}
  return nodes.map((node,index)=>`${nodeCard(node,index,step)}${index<nodes.length-1?`<span class="system-arrow ${conceptStep===index?'active':''}">→</span>`:''}`).join('');
}
function drawConcept(){
  const presentation=conceptView==='mechanism'?mechanismFor(activeConcept):conceptModel,step=presentation.steps[conceptStep];
  $('#conceptPanel').classList.toggle('lesson-mode',presentation.kind==='lesson'||presentation.kind==='storyboard');
  $('#conceptViewLabel').textContent=conceptView==='mechanism'?'How the mechanism works':presentation.kind==='storyboard'?'System walkthrough · components, interactions, and guarantees':'Production scenario · data, messages, and invariants';
  $('#conceptFlow').className=`concept-flow kind-${presentation.kind}`;
  $('#conceptFlow').innerHTML=`<div class="concept-zoom-layer" style="--concept-zoom:${conceptZoom}">${renderConceptScene(presentation,step)}</div>`;
  $('#conceptZoomReset').textContent=`${Math.round(conceptZoom*100)}%`;
  $('#conceptZoomOut').disabled=conceptZoom===conceptZoomLevels[0];
  $('#conceptZoomIn').disabled=conceptZoom===conceptZoomLevels[conceptZoomLevels.length-1];
  const lessonStep=presentation.lesson?.steps[conceptStep];
  $('#conceptStatus').innerHTML=lessonStep
    ?`<div class="lesson-status-head"><b>Step ${conceptStep+1}/${presentation.steps.length} · ${esc(lessonStep.title)}</b><span>${esc(lessonStep.narration)}</span></div><div class="lesson-status-grid"><span><small>Observable outcome</small>${esc(lessonStep.outcome)}</span><span><small>Invariant to remember</small>${esc(lessonStep.invariant)}</span></div>`
    :`<b>Step ${conceptStep+1} of ${presentation.steps.length}</b><br>${esc(step[2])}`;
  $('#conceptDots').innerHTML=presentation.steps.map((_,index)=>`<button class="concept-dot ${index===conceptStep?'active':index<conceptStep?'done':''}" data-step="${index}" aria-label="Go to step ${index+1}"></button>`).join('');
  $$('.concept-dot').forEach(dot=>dot.onclick=()=>{conceptStep=Number(dot.dataset.step);drawConcept()});
  $('#conceptPrev').disabled=conceptStep===0;$('#conceptNext').disabled=conceptStep===presentation.steps.length-1;
}
function stopConceptPlay(){conceptPlaying=false;$('#conceptPlay').textContent='▶ Play'}
function setConceptZoom(direction){
  const current=conceptZoomLevels.indexOf(conceptZoom);
  const next=direction===0?conceptZoomLevels.indexOf(1):Math.max(0,Math.min(conceptZoomLevels.length-1,current+direction));
  conceptZoom=conceptZoomLevels[next];
  drawConcept();
}
function openConcept(index){
  activeConcept=conceptRegistry[index];conceptModel=makeConceptModel(activeConcept);conceptStep=0;stopConceptPlay();
  const mechanism=mechanismFor(activeConcept);
  conceptView=mechanism?'mechanism':'architecture';
  $('#conceptViewSwitch').classList.toggle('hidden',!mechanism);
  $$('[data-concept-view]').forEach(button=>button.classList.toggle('active',button.dataset.conceptView===conceptView));
  $('#conceptChapter').textContent=`Chapter ${activeConcept.chapterIndex+1} · ${activeConcept.chapter.title}`;
  $('#conceptTitle').textContent=activeConcept.concept.name;$('#conceptSummary').textContent=activeConcept.concept.summary;$('#conceptTradeoff').textContent=activeConcept.concept.tradeoff;
  $('#conceptRecall').textContent=`Explain what pressure ${activeConcept.concept.name} addresses, trace one request through the visual, then name the failure mode or cost you accept.`;
  const related=conceptRegistry.filter(x=>x.group===activeConcept.group&&x.concept!==activeConcept.concept).slice(0,6);
  $('#conceptRelated').innerHTML=related.map(x=>`<button data-related="${conceptIndexes.get(x.concept)}">${esc(x.concept.name)}</button>`).join('');
  $$('#conceptRelated button').forEach(button=>button.onclick=()=>openConcept(Number(button.dataset.related)));
  drawConcept();if(!$('#conceptDialog').open)$('#conceptDialog').showModal();
}
$('#conceptClose').onclick=()=>$('#conceptDialog').close();$('#conceptReset').onclick=()=>{stopConceptPlay();conceptStep=0;drawConcept()};$('#conceptPrev').onclick=()=>{stopConceptPlay();if(conceptStep>0){conceptStep--;drawConcept()}};
$('#conceptZoomOut').onclick=()=>setConceptZoom(-1);$('#conceptZoomIn').onclick=()=>setConceptZoom(1);$('#conceptZoomReset').onclick=()=>setConceptZoom(0);
$$('[data-concept-view]').forEach(button=>button.onclick=()=>{stopConceptPlay();conceptView=button.dataset.conceptView;conceptStep=0;$$('[data-concept-view]').forEach(item=>item.classList.toggle('active',item===button));drawConcept()});
$('#conceptNext').onclick=()=>{stopConceptPlay();const presentation=conceptView==='mechanism'?mechanismFor(activeConcept):conceptModel;if(conceptStep<presentation.steps.length-1){conceptStep++;drawConcept()}};
$('#conceptPlay').onclick=async()=>{conceptPlaying=!conceptPlaying;$('#conceptPlay').textContent=conceptPlaying?'❚❚ Pause':'▶ Play';const presentation=conceptView==='mechanism'?mechanismFor(activeConcept):conceptModel;while(conceptPlaying&&conceptStep<presentation.steps.length-1){await sleep(950);if(conceptPlaying){conceptStep++;drawConcept()}}stopConceptPlay()};
$('#conceptDialog').addEventListener('close',stopConceptPlay);$('#conceptDialog').onclick=e=>{if(e.target===$('#conceptDialog'))$('#conceptDialog').close()};

function renderCatalog(){
  $('#chapterCount').textContent=sortedChapters.length;$('#conceptCount').textContent=sortedChapters.reduce((n,c)=>n+c.groups.reduce((m,g)=>m+g.concepts.length,0),0);
  $('#chapterNav').innerHTML=sortedChapters.map((c,i)=>`<a href="#chapter-${esc(c.id)}" data-chapter="${esc(c.id)}">${String(i+1).padStart(2,'0')} · ${esc(c.title)}</a>`).join('');
  $('#chapters').innerHTML=sortedChapters.map((c,i)=>`<details class="chapter" id="chapter-${esc(c.id)}" ${i===0?'open':''}><summary><span class="chapter-num">${String(i+1).padStart(2,'0')}</span><span class="chapter-title">${esc(c.title)}</span><span class="chapter-intro">${esc(c.intro)}</span></summary><div class="chapter-body">${c.groups.map(g=>`<div class="concept-group"><h3>${esc(g.title)}</h3><div class="concept-grid">${g.concepts.map(x=>`<button type="button" class="concept" data-concept="${conceptIndexes.get(x)}" data-search="${esc((x.name+' '+x.summary+' '+x.tradeoff).toLowerCase())}"><b>${esc(x.name)}</b><p>${esc(x.summary)}</p><span class="tradeoff">Tradeoff: ${esc(x.tradeoff)}</span></button>`).join('')}</div></div>`).join('')}</div></details>`).join('');
  $$('.chapter-nav a').forEach(a=>a.onclick=()=>{const d=$(`#chapter-${a.dataset.chapter}`);d.open=true});
  $$('.concept').forEach(button=>button.onclick=()=>openConcept(Number(button.dataset.concept)));
}
function searchCatalog(value){
  const q=value.trim().toLowerCase();let total=0;
  $$('.chapter').forEach(ch=>{let matches=0;ch.querySelectorAll('.concept').forEach(c=>{const show=!q||c.dataset.search.includes(q);c.classList.toggle('hidden',!show);if(show)matches++});ch.querySelectorAll('.concept-group').forEach(g=>g.classList.toggle('group-empty',![...g.querySelectorAll('.concept')].some(c=>!c.classList.contains('hidden'))));ch.classList.toggle('no-match',matches===0);if(q&&matches)ch.open=true;total+=matches});
  $('#emptySearch').classList.toggle('show',total===0);if(q)$('#catalog').scrollIntoView({behavior:'smooth'});
  if($('#sideSearch').value!==value)$('#sideSearch').value=value;if($('#heroSearch').value!==value)$('#heroSearch').value=value;
}
renderCatalog();drawVisual();$('#heroSearch').oninput=e=>searchCatalog(e.target.value);$('#sideSearch').oninput=e=>searchCatalog(e.target.value);
$('#present').onclick=()=>{document.body.classList.toggle('presentation');$('#present').textContent=document.body.classList.contains('presentation')?'✕ Exit':'⛶ Presentation'};
const mainSections=$$('main>section');new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)$('#progress').style.width=`${(mainSections.indexOf(e.target)+1)/mainSections.length*100}%`}),{threshold:.35}).observe(mainSections[0]);mainSections.slice(1).forEach(s=>new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)$('#progress').style.width=`${(mainSections.indexOf(e.target)+1)/mainSections.length*100}%`}),{threshold:.35}).observe(s));
document.addEventListener('keydown',e=>{if($('#conceptDialog').open||['INPUT','SELECT'].includes(document.activeElement.tagName))return;if(e.key===' '&&location.hash==='#visuals'){e.preventDefault();$('#visualStep').click()}if(e.key.toLowerCase()==='p')$('#present').click()});
document.addEventListener('keydown',e=>{if(!$('#conceptDialog').open)return;if(e.key==='ArrowRight'){$('#conceptNext').click();e.preventDefault()}else if(e.key==='ArrowLeft'){$('#conceptPrev').click();e.preventDefault()}else if(e.key===' '){$('#conceptPlay').click();e.preventDefault()}});
