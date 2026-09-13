const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],sleep=ms=>new Promise(r=>setTimeout(r,ms));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const chapters=(window.SYSTEM_DESIGN_CHAPTERS||[]);
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
let currentVisual='cap',visualStep=0,visualPlaying=false;
function drawVisual(){
  const v=visuals[currentVisual],s=v.steps[visualStep];
  $('#visualTitle').textContent=v.title;$('#visualMental').textContent=v.mental;$('#visualInvariant').textContent=v.invariant;$('#visualTradeoff').textContent=v.tradeoff;$('#visualStatus').innerHTML=`<b>Step ${visualStep+1}/${v.steps.length}</b><br>${s[2]}`;
  $('#systemFlow').innerHTML=v.nodes.map((n,i)=>`<div class="system-node ${i===s[0]?'active':s[1].includes(i)?'done':''}"><b>${n[0]}</b><small>${n[1]}</small></div>${i<v.nodes.length-1?'<span class="system-arrow">→</span>':''}`).join('');
  $('#visualStep').disabled=visualStep===v.steps.length-1;
}
function resetVisual(){visualPlaying=false;$('#visualPlay').textContent='▶ Play';visualStep=0;drawVisual()}
Object.entries(visuals).forEach(([key,v])=>$('#visualType').add(new Option(v.title,key)));
$('#visualType').onchange=e=>{currentVisual=e.target.value;resetVisual()};$('#visualReset').onclick=resetVisual;$('#visualStep').onclick=()=>{if(visualStep<visuals[currentVisual].steps.length-1){visualStep++;drawVisual()}};
$('#visualPlay').onclick=async()=>{visualPlaying=!visualPlaying;$('#visualPlay').textContent=visualPlaying?'❚❚ Pause':'▶ Play';while(visualPlaying&&visualStep<visuals[currentVisual].steps.length-1){await sleep(800);if(visualPlaying){visualStep++;drawVisual()}}visualPlaying=false;$('#visualPlay').textContent='▶ Play'};

const conceptRegistry=chapters.flatMap((chapter,chapterIndex)=>chapter.groups.flatMap((group,groupIndex)=>group.concepts.map((concept,conceptIndex)=>({chapter,group,concept,chapterIndex,groupIndex,conceptIndex}))));
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
let activeConcept=null,conceptModel=null,conceptStep=0,conceptPlaying=false;
function makeConceptModel(entry){
  if(entry.concept.visual){
    return {
      nodes:entry.concept.visual.nodes.map(node=>[...node]),
      steps:entry.concept.visual.steps.map(step=>[step[0],[...step[1]],step[2]])
    };
  }
  const match=visualMatchers.find(([pattern])=>pattern.test(entry.concept.name));
  if(match){const source=match[1]();return {nodes:source.nodes.map(x=>[...x]),steps:source.steps.map(x=>[x[0],[...x[1]],x[2]])}}
  const nodes=chapterScenes[entry.chapter.id]||chapterScenes['advanced-senior-staff-level-concepts'];
  const name=entry.concept.name,summary=entry.concept.summary;
  return {nodes,steps:[
    [0,[],`Start with the pressure that makes ${name} relevant. Identify the actor, input, and required outcome.`],
    [1,[0],`The input crosses the first system boundary. Ask who owns state and which guarantees apply here.`],
    [2,[0,1],`${name} changes the flow: ${summary}`],
    [3,[0,1,2],`Follow the intermediate state. Look for delay, duplication, partial failure, skew, or competing ownership.`],
    [4,[0,1,2,3],`The system produces an observable outcome. Now test the design against the tradeoff shown on the right.`]
  ]};
}
function drawConcept(){
  const step=conceptModel.steps[conceptStep];
  $('#conceptFlow').innerHTML=conceptModel.nodes.map((node,index)=>`<div class="system-node ${index===step[0]?'active':step[1].includes(index)?'done':''}"><b>${esc(node[0])}</b><small>${esc(node[1])}</small></div>${index<conceptModel.nodes.length-1?'<span class="system-arrow">→</span>':''}`).join('');
  $('#conceptStatus').innerHTML=`<b>Step ${conceptStep+1} of ${conceptModel.steps.length}</b><br>${esc(step[2])}`;
  $('#conceptDots').innerHTML=conceptModel.steps.map((_,index)=>`<button class="concept-dot ${index===conceptStep?'active':index<conceptStep?'done':''}" data-step="${index}" aria-label="Go to step ${index+1}"></button>`).join('');
  $$('.concept-dot').forEach(dot=>dot.onclick=()=>{conceptStep=Number(dot.dataset.step);drawConcept()});
  $('#conceptPrev').disabled=conceptStep===0;$('#conceptNext').disabled=conceptStep===conceptModel.steps.length-1;
}
function stopConceptPlay(){conceptPlaying=false;$('#conceptPlay').textContent='▶ Play'}
function openConcept(index){
  activeConcept=conceptRegistry[index];conceptModel=makeConceptModel(activeConcept);conceptStep=0;stopConceptPlay();
  $('#conceptChapter').textContent=`Chapter ${activeConcept.chapterIndex+1} · ${activeConcept.chapter.title}`;
  $('#conceptTitle').textContent=activeConcept.concept.name;$('#conceptSummary').textContent=activeConcept.concept.summary;$('#conceptTradeoff').textContent=activeConcept.concept.tradeoff;
  $('#conceptRecall').textContent=`Explain what pressure ${activeConcept.concept.name} addresses, trace one request through the visual, then name the failure mode or cost you accept.`;
  const related=conceptRegistry.filter(x=>x.group===activeConcept.group&&x.concept!==activeConcept.concept).slice(0,6);
  $('#conceptRelated').innerHTML=related.map(x=>`<button data-related="${conceptIndexes.get(x.concept)}">${esc(x.concept.name)}</button>`).join('');
  $$('#conceptRelated button').forEach(button=>button.onclick=()=>openConcept(Number(button.dataset.related)));
  drawConcept();if(!$('#conceptDialog').open)$('#conceptDialog').showModal();
}
$('#conceptClose').onclick=()=>$('#conceptDialog').close();$('#conceptReset').onclick=()=>{stopConceptPlay();conceptStep=0;drawConcept()};$('#conceptPrev').onclick=()=>{stopConceptPlay();if(conceptStep>0){conceptStep--;drawConcept()}};$('#conceptNext').onclick=()=>{stopConceptPlay();if(conceptStep<conceptModel.steps.length-1){conceptStep++;drawConcept()}};
$('#conceptPlay').onclick=async()=>{conceptPlaying=!conceptPlaying;$('#conceptPlay').textContent=conceptPlaying?'❚❚ Pause':'▶ Play';while(conceptPlaying&&conceptStep<conceptModel.steps.length-1){await sleep(950);if(conceptPlaying){conceptStep++;drawConcept()}}stopConceptPlay()};
$('#conceptDialog').addEventListener('close',stopConceptPlay);$('#conceptDialog').onclick=e=>{if(e.target===$('#conceptDialog'))$('#conceptDialog').close()};

function renderCatalog(){
  $('#chapterCount').textContent=chapters.length;$('#conceptCount').textContent=chapters.reduce((n,c)=>n+c.groups.reduce((m,g)=>m+g.concepts.length,0),0);
  $('#chapterNav').innerHTML=chapters.map((c,i)=>`<a href="#chapter-${esc(c.id)}" data-chapter="${esc(c.id)}">${String(i+1).padStart(2,'0')} · ${esc(c.title)}</a>`).join('');
  $('#chapters').innerHTML=chapters.map((c,i)=>`<details class="chapter" id="chapter-${esc(c.id)}" ${i===0?'open':''}><summary><span class="chapter-num">${String(i+1).padStart(2,'0')}</span><span class="chapter-title">${esc(c.title)}</span><span class="chapter-intro">${esc(c.intro)}</span></summary><div class="chapter-body">${c.groups.map(g=>`<div class="concept-group"><h3>${esc(g.title)}</h3><div class="concept-grid">${g.concepts.map(x=>`<button type="button" class="concept" data-concept="${conceptIndexes.get(x)}" data-search="${esc((x.name+' '+x.summary+' '+x.tradeoff).toLowerCase())}"><b>${esc(x.name)}</b><p>${esc(x.summary)}</p><span class="tradeoff">Tradeoff: ${esc(x.tradeoff)}</span></button>`).join('')}</div></div>`).join('')}</div></details>`).join('');
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
