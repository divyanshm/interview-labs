(function () {
  'use strict';

  const lessons = {};

  function add(key, family, scenario, entities, connections, steps) {
    const ids = entities.map(entity => entity[0]);
    lessons[key] = {
      family,
      scenario,
      entities,
      connections,
      steps: steps.map(step => {
        const states = {};
        ids.forEach((id, index) => {
          states[id] = step[3][index];
        });
        return {
          title: step[0],
          narration: step[1],
          action: step[2],
          states,
          outcome: step[4],
          invariant: step[5]
        };
      })
    };
  }

  add(
    'distributed-systems-fundamentals::CAP theorem',
    'replicas',
    'A checkout preference is replicated across two regions when the inter-region link partitions.',
    [
      ['client', 'Checkout client', 'Issues preference writes and reads', 10, 50],
      ['west', 'West replica', 'Accepts traffic in the west region', 38, 22],
      ['link', 'Inter-region link', 'Carries replication acknowledgements', 52, 50],
      ['east', 'East replica', 'Accepts traffic in the east region', 78, 78]
    ],
    [
      ['client', 'west', 'PUT preference v8'],
      ['west', 'link', 'replicate v8 with acknowledgement'],
      ['link', 'east', 'deliver committed preference v8'],
      ['client', 'east', 'GET preference after partition']
    ],
    [
      ['Replicas agree', 'Both regions expose version 7 before the partition.', ['west', 'east', 'replicate committed v7'], [
        {request:'idle',observedVersion:'7'}, {version:'7',value:'email',availability:'serving'}, {status:'healthy',lastDelivery:'v7@10:00:00'}, {version:'7',value:'email',availability:'serving'}
      ], 'The system starts consistent and available.', 'CAP constrains behavior only when communication needed for an operation is partitioned.'],
      ['Link partitions', 'The inter-region path drops replication and acknowledgements.', ['west', 'link', 'replication timeout at 10:00:05'], [
        {request:'PUT sms',observedVersion:'7'}, {version:'7',value:'email',availability:'serving'}, {status:'partitioned',lastDelivery:'v7@10:00:00'}, {version:'7',value:'email',availability:'serving'}
      ], 'Each side can still receive local requests but cannot coordinate.', 'A partition prevents simultaneously guaranteeing one history and success from both sides.'],
      ['CP choice rejects', 'West requires cross-region agreement and refuses the write.', ['west', 'client', '503 quorum unavailable'], [
        {request:'PUT sms',result:'503'}, {version:'7',value:'email',availability:'write-rejected'}, {status:'partitioned',timeouts:'1'}, {version:'7',value:'email',availability:'read-only'}
      ], 'Consistency is preserved by sacrificing write availability.', 'No acknowledged write may exist on only one side under the CP policy.'],
      ['AP choice accepts', 'With the policy switched to availability, west accepts a local version 8.', ['client', 'west', 'PUT sms accepted as west:8'], [
        {request:'PUT sms',result:'202 west:8'}, {version:'west:8',value:'sms',availability:'serving'}, {status:'partitioned',timeouts:'2'}, {version:'7',value:'email',availability:'serving'}
      ], 'Both sides remain available but expose divergent values.', 'An AP response cannot promise linearizable cross-partition reads.'],
      ['Partition heals', 'Replication resumes and the conflict rule selects west version 8.', ['link', 'east', 'repair east from west:8'], [
        {request:'GET east',result:'sms west:8'}, {version:'west:8',value:'sms',availability:'serving'}, {status:'healthy',lastDelivery:'west:8@10:00:19'}, {version:'west:8',value:'sms',availability:'serving'}
      ], 'The replicas converge after connectivity returns.', 'CAP does not prescribe the reconciliation rule; the application must define it.']
    ]
  );

  add(
    'distributed-systems-fundamentals::Linearizability',
    'timeline',
    'Two clients update and read one inventory register while a primary orders operations.',
    [
      ['writer', 'Writer A', 'Issues a compare-and-set inventory update', 8, 20],
      ['primary', 'Inventory primary', 'Defines the single register order', 42, 36],
      ['reader', 'Reader B', 'Reads after the write response', 86, 20],
      ['clock', 'Operation timeline', 'Tracks invocation and response boundaries', 50, 84]
    ],
    [
      ['writer', 'primary', 'CAS stock 5 to 4'],
      ['primary', 'writer', 'commit response at t=14'],
      ['reader', 'primary', 'GET invoked at t=16'],
      ['primary', 'reader', 'return stock 4 at t=18']
    ],
    [
      ['Initial register', 'The primary stores stock 5 at version 21.', null, [
        {operation:'none',time:'t=10'}, {stock:'5',version:'21',appliedAt:'t=9'}, {operation:'none',time:'t=10'}, {now:'t=10',order:'empty'}
      ], 'All participants begin from version 21.', 'A linearizable register has one legal sequential history.'],
      ['Write begins', 'Writer A invokes a conditional decrement.', ['writer', 'primary', 'CAS expected v21 at t=11'], [
        {operation:'CAS v21->v22',time:'t=11'}, {stock:'5',version:'21',pending:'v22'}, {operation:'none',time:'t=11'}, {now:'t=11',order:'CAS invoked'}
      ], 'The operation is in flight and has not yet taken effect.', 'The linearization point must lie between invocation and response.'],
      ['Write linearizes', 'The primary atomically installs version 22.', ['primary', 'clock', 'linearize v22 at t=13'], [
        {operation:'CAS v21->v22',time:'t=13'}, {stock:'4',version:'22',appliedAt:'t=13'}, {operation:'none',time:'t=13'}, {now:'t=13',order:'CAS linearized'}
      ], 'Stock 4 becomes the only current value.', 'No reader may observe a partial atomic update.'],
      ['Response precedes read', 'The write completes before Reader B starts.', ['primary', 'writer', 'acknowledge v22 at t=14'], [
        {operation:'complete v22',time:'t=14'}, {stock:'4',version:'22',appliedAt:'t=13'}, {operation:'GET pending',time:'t=16'}, {now:'t=16',order:'write response before read invocation'}
      ], 'Real-time order constrains the later read.', 'If A completes before B begins, B must be ordered after A.'],
      ['Read sees latest', 'Reader B receives stock 4 from version 22.', ['primary', 'reader', 'return stock 4 v22 at t=18'], [
        {operation:'complete v22',time:'t=18'}, {stock:'4',version:'22',lastRead:'t=18'}, {operation:'complete stock 4',time:'t=18'}, {now:'t=18',order:'CAS then GET'}
      ], 'The observed result matches the real-time sequential history.', 'A completed write cannot be hidden from a later linearizable read.']
    ]
  );

  add(
    'distributed-systems-fundamentals::Eventual consistency',
    'replicas',
    'A profile display name propagates asynchronously from a home replica to two remote replicas.',
    [
      ['home', 'Home replica', 'Accepts the authoritative local update', 16, 48],
      ['queue', 'Replication queue', 'Buffers versioned mutations', 40, 18],
      ['eu', 'EU replica', 'Applies updates after short delay', 68, 30],
      ['apac', 'APAC replica', 'Applies updates after longer delay', 82, 72]
    ],
    [
      ['home', 'queue', 'enqueue profile v43'],
      ['queue', 'eu', 'deliver v43 after 2 seconds'],
      ['queue', 'apac', 'deliver v43 after 8 seconds'],
      ['apac', 'home', 'anti-entropy confirms v43']
    ],
    [
      ['Common baseline', 'Every replica stores display name Ana at version 42.', null, [
        {version:'42',name:'Ana',updatedAt:'09:00:00'}, {depth:'0',oldestAge:'0s'}, {version:'42',name:'Ana',lag:'0s'}, {version:'42',name:'Ana',lag:'0s'}
      ], 'Reads agree before the update.', 'Convergence is defined relative to a quiescent update stream and successful delivery.'],
      ['Local write', 'The home replica commits display name Anika as version 43.', ['home', 'queue', 'append profile v43'], [
        {version:'43',name:'Anika',updatedAt:'09:00:01'}, {depth:'2 deliveries',oldestAge:'0s'}, {version:'42',name:'Ana',lag:'1s'}, {version:'42',name:'Ana',lag:'1s'}
      ], 'Remote reads may now return stale version 42.', 'Eventual consistency permits temporary divergence.'],
      ['First propagation', 'The EU consumer applies version 43.', ['queue', 'eu', 'apply profile v43'], [
        {version:'43',name:'Anika',updatedAt:'09:00:01'}, {depth:'1 delivery',oldestAge:'2s'}, {version:'43',name:'Anika',lag:'0s'}, {version:'42',name:'Ana',lag:'3s'}
      ], 'EU converges while APAC remains stale.', 'A newer version must not be overwritten by an older delivery.'],
      ['Delayed replica catches up', 'APAC receives the queued mutation after a transient delay.', ['queue', 'apac', 'apply profile v43'], [
        {version:'43',name:'Anika',updatedAt:'09:00:01'}, {depth:'0',oldestAge:'0s'}, {version:'43',name:'Anika',lag:'0s'}, {version:'43',name:'Anika',lag:'0s'}
      ], 'All replicas expose the same value.', 'If updates stop and messages arrive, replicas must converge.'],
      ['Anti-entropy verifies', 'A digest exchange confirms no replica is missing version 43.', ['apac', 'home', 'compare profile digest 43'], [
        {version:'43',name:'Anika',digest:'9f43'}, {depth:'0',oldestAge:'0s'}, {version:'43',name:'Anika',digest:'9f43'}, {version:'43',name:'Anika',digest:'9f43'}
      ], 'Convergence is detected rather than assumed.', 'Eventual consistency alone provides no maximum staleness duration.']
    ]
  );

  add(
    'distributed-systems-fundamentals::Quorum reads/writes',
    'replicas',
    'A three-replica cart store uses W=2 writes and R=2 reads to intersect on the newest version.',
    [
      ['coordinator', 'Cart coordinator', 'Fans out versioned reads and writes', 50, 10],
      ['r1', 'Replica R1', 'Stores cart versions in zone 1', 14, 72],
      ['r2', 'Replica R2', 'Stores cart versions in zone 2', 50, 82],
      ['r3', 'Replica R3', 'Stores cart versions in zone 3', 86, 72]
    ],
    [
      ['coordinator', 'r1', 'WRITE cart v12'],
      ['coordinator', 'r2', 'WRITE cart v12'],
      ['coordinator', 'r3', 'WRITE cart v12 delayed'],
      ['r2', 'coordinator', 'READ reply cart v12']
    ],
    [
      ['Baseline N=3', 'All three replicas hold cart version 11.', null, [
        {policy:'N3 W2 R2',phase:'idle'}, {version:'11',items:'2',status:'ready'}, {version:'11',items:'2',status:'ready'}, {version:'11',items:'2',status:'ready'}
      ], 'The replica set starts synchronized.', 'For strict quorum intersection, R + W must exceed N.'],
      ['Write fan-out', 'The coordinator sends version 12 to every replica.', ['coordinator', 'r1', 'store cart v12'], [
        {policy:'N3 W2 R2',phase:'write v12'}, {version:'12',items:'3',status:'acknowledged'}, {version:'11',items:'2',status:'writing'}, {version:'11',items:'2',status:'delayed'}
      ], 'One durable acknowledgement is not enough for W=2.', 'The coordinator must not report success before W replicas persist the version.'],
      ['Write quorum', 'R2 persists version 12, satisfying W=2.', ['r2', 'coordinator', 'ACK durable v12'], [
        {policy:'N3 W2 R2',phase:'write committed v12'}, {version:'12',items:'3',status:'acknowledged'}, {version:'12',items:'3',status:'acknowledged'}, {version:'11',items:'2',status:'delayed'}
      ], 'The client can receive a successful write response.', 'Any read quorum of two intersects the two-replica write quorum.'],
      ['Read quorum', 'A read contacts stale R3 and current R2.', ['r2', 'coordinator', 'reply v12 alongside r3 v11'], [
        {policy:'N3 W2 R2',phase:'read selected v12'}, {version:'12',items:'3',status:'ready'}, {version:'12',items:'3',status:'read-winner'}, {version:'11',items:'2',status:'read-stale'}
      ], 'The coordinator selects version 12 by version order.', 'Quorum intersection exposes at least one acknowledged latest version, assuming replicas preserve it.'],
      ['Read repair', 'The coordinator repairs stale R3 with version 12.', ['coordinator', 'r3', 'read-repair cart v12'], [
        {policy:'N3 W2 R2',phase:'repair complete'}, {version:'12',items:'3',status:'ready'}, {version:'12',items:'3',status:'ready'}, {version:'12',items:'3',status:'repaired'}
      ], 'All replicas converge without blocking the original write.', 'Version comparison must reject repair with an older value.']
    ]
  );

  add(
    'distributed-systems-fundamentals::Gossip protocols',
    'topology',
    'Five membership agents disseminate that node E is unhealthy through randomized peer exchanges.',
    [
      ['a', 'Agent A', 'Detects missed heartbeats from E', 50, 8],
      ['b', 'Agent B', 'Exchanges membership digests', 88, 34],
      ['c', 'Agent C', 'Exchanges membership digests', 74, 82],
      ['d', 'Agent D', 'Exchanges membership digests', 26, 82],
      ['e', 'Agent E', 'Suspected failed member', 12, 34]
    ],
    [
      ['a', 'c', 'gossip E suspect incarnation 19'],
      ['c', 'd', 'forward E suspect incarnation 19'],
      ['d', 'b', 'merge membership digest 8c19'],
      ['b', 'a', 'confirm converged digest 8c19']
    ],
    [
      ['Healthy view', 'Every live agent records E alive at incarnation 18.', null, [
        {round:'40',eStatus:'alive@18'}, {round:'40',eStatus:'alive@18'}, {round:'40',eStatus:'alive@18'}, {round:'40',eStatus:'alive@18'}, {heartbeat:'18',status:'alive'}
      ], 'Membership views initially match.', 'Incarnation numbers prevent older rumors from replacing newer membership state.'],
      ['Local suspicion', 'A misses E heartbeats and records a suspicion at incarnation 19.', ['a', 'e', 'heartbeat timeout 3 intervals'], [
        {round:'41',eStatus:'suspect@19'}, {round:'41',eStatus:'alive@18'}, {round:'41',eStatus:'alive@18'}, {round:'41',eStatus:'alive@18'}, {heartbeat:'18',status:'unreachable'}
      ], 'Only A knows the new status.', 'Gossip begins with local evidence and does not require a central broadcaster.'],
      ['Random fan-out', 'A randomly selects C and transmits its delta.', ['a', 'c', 'send E suspect@19'], [
        {round:'42',eStatus:'suspect@19'}, {round:'42',eStatus:'alive@18'}, {round:'42',eStatus:'suspect@19'}, {round:'42',eStatus:'alive@18'}, {heartbeat:'18',status:'unreachable'}
      ], 'Two agents now carry the rumor.', 'A merge keeps the greatest incarnation for each member.'],
      ['Epidemic spread', 'C tells D while D independently tells B.', ['d', 'b', 'send digest containing suspect@19'], [
        {round:'43',eStatus:'suspect@19'}, {round:'43',eStatus:'suspect@19'}, {round:'43',eStatus:'suspect@19'}, {round:'43',eStatus:'suspect@19'}, {heartbeat:'18',status:'unreachable'}
      ], 'All reachable agents converge after several rounds.', 'Convergence is probabilistic; redundant exchanges improve dissemination probability.'],
      ['Stable digest', 'Agents exchange equal digests and retain the newest rumor.', ['b', 'a', 'digest 8c19 matches'], [
        {round:'44',eStatus:'suspect@19'}, {round:'44',eStatus:'suspect@19'}, {round:'44',eStatus:'suspect@19'}, {round:'44',eStatus:'suspect@19'}, {heartbeat:'18',status:'unreachable'}
      ], 'No coordinator was needed to spread the failure view.', 'A recovered E must refute suspicion with an incarnation greater than 19.']
    ]
  );

  add(
    'distributed-systems-fundamentals::Lamport clocks',
    'timeline',
    'Two order workers timestamp local and message events without synchronized wall clocks.',
    [
      ['a', 'Worker A', 'Maintains Lamport counter A', 12, 25],
      ['wire', 'Message channel', 'Carries logical timestamps', 50, 50],
      ['b', 'Worker B', 'Maintains Lamport counter B', 88, 25],
      ['order', 'Event ledger', 'Sorts timestamp and node-id pairs', 50, 88]
    ],
    [
      ['a', 'wire', 'send reserve with L=6'],
      ['wire', 'b', 'receive reserve L=6'],
      ['b', 'wire', 'send confirm with L=9'],
      ['wire', 'order', 'append ordered timestamp pair']
    ],
    [
      ['Independent counters', 'A is at 5 and B is at 7 after unrelated local work.', null, [
        {counter:'5',lastEvent:'A-local'}, {message:'none',stamp:'none'}, {counter:'7',lastEvent:'B-local'}, {entries:'0',maxStamp:'0'}
      ], 'The counters need not match physical time.', 'Each process increments its counter before every event.'],
      ['Send event', 'A increments to 6 and stamps a reservation message.', ['a', 'wire', 'reserve order-9 L=6'], [
        {counter:'6',lastEvent:'send reserve'}, {message:'reserve order-9',stamp:'6'}, {counter:'7',lastEvent:'B-local'}, {entries:'1',maxStamp:'6/A'}
      ], 'The message carries A logical time 6.', 'A send timestamp is greater than A preceding events.'],
      ['Receive merge', 'B receives stamp 6 and advances to max(7,6)+1=8.', ['wire', 'b', 'merge received L=6'], [
        {counter:'6',lastEvent:'send reserve'}, {message:'delivered reserve',stamp:'6'}, {counter:'8',lastEvent:'receive reserve'}, {entries:'2',maxStamp:'8/B'}
      ], 'The receive event is ordered after the send.', 'If event x happens before y, Lamport(x) is less than Lamport(y).'],
      ['Reply event', 'B increments to 9 before sending confirmation.', ['b', 'wire', 'confirm order-9 L=9'], [
        {counter:'6',lastEvent:'send reserve'}, {message:'confirm order-9',stamp:'9'}, {counter:'9',lastEvent:'send confirm'}, {entries:'3',maxStamp:'9/B'}
      ], 'The causal chain has increasing timestamps 6, 8, 9.', 'Equal counters require a deterministic node-id tie-breaker for total sorting.'],
      ['A merges reply', 'A receives stamp 9 and advances from 6 to 10.', ['wire', 'a', 'merge received L=9'], [
        {counter:'10',lastEvent:'receive confirm'}, {message:'delivered confirm',stamp:'9'}, {counter:'9',lastEvent:'send confirm'}, {entries:'4',maxStamp:'10/A'}
      ], 'The ledger can produce a total order consistent with causality.', 'Lamport clocks cannot prove that two differently stamped events were concurrent.']
    ]
  );

  add(
    'distributed-systems-fundamentals::Vector clocks',
    'timeline',
    'Two offline editors update the same document and a merger detects concurrent versions.',
    [
      ['a', 'Editor A', 'Advances vector component A', 10, 18],
      ['base', 'Shared baseline', 'Stores the last common document version', 50, 12],
      ['b', 'Editor B', 'Advances vector component B', 90, 18],
      ['merge', 'Version merger', 'Compares and joins version vectors', 50, 80]
    ],
    [
      ['base', 'a', 'sync draft vector [2,1]'],
      ['base', 'b', 'sync draft vector [2,1]'],
      ['a', 'merge', 'submit title edit [3,1]'],
      ['b', 'merge', 'submit body edit [2,2]']
    ],
    [
      ['Common ancestor', 'Both editors synchronize document vector [2,1].', null, [
        {vector:'[2,1]',edit:'none'}, {vector:'[2,1]',revision:'base-7'}, {vector:'[2,1]',edit:'none'}, {decision:'idle',vector:'[2,1]'}
      ], 'Both copies descend from the same baseline.', 'A vector component records knowledge of that participant’s events.'],
      ['A edits offline', 'Editor A increments its own component to [3,1].', ['a', 'merge', 'queue title edit [3,1]'], [
        {vector:'[3,1]',edit:'title=Q3'}, {vector:'[2,1]',revision:'base-7'}, {vector:'[2,1]',edit:'none'}, {decision:'waiting',vector:'[2,1]'}
      ], 'A version causally descends from the baseline.', 'A writer increments only its own component before creating a version.'],
      ['B edits offline', 'Editor B independently increments to [2,2].', ['b', 'merge', 'queue body edit [2,2]'], [
        {vector:'[3,1]',edit:'title=Q3'}, {vector:'[2,1]',revision:'base-7'}, {vector:'[2,2]',edit:'body=forecast'}, {decision:'waiting',vector:'[2,1]'}
      ], 'Neither offline version includes the other edit.', 'Vectors x and y are concurrent when neither is component-wise less than or equal to the other.'],
      ['Concurrency detected', 'The merger compares [3,1] and [2,2] and finds incomparable components.', ['a', 'merge', 'compare [3,1] with [2,2]'], [
        {vector:'[3,1]',edit:'title=Q3'}, {vector:'[2,1]',revision:'base-7'}, {vector:'[2,2]',edit:'body=forecast'}, {decision:'concurrent',vector:'max=[3,2]'}
      ], 'The system preserves both siblings for resolution.', 'Concurrent versions must not be mistaken for a causal overwrite.'],
      ['Merged descendant', 'The application merges both fields and emits vector [3,3].', ['merge', 'base', 'store merged revision [3,3]'], [
        {vector:'[3,3]',edit:'synced'}, {vector:'[3,3]',revision:'merged-8'}, {vector:'[3,3]',edit:'synced'}, {decision:'merged',vector:'[3,3]'}
      ], 'The merged document causally dominates both inputs.', 'A merged vector takes component maxima and advances the merger’s writer component.']
    ]
  );

  add(
    'consensus-coordination::Paxos',
    'consensus',
    'A proposer chooses one configuration value through three durable Paxos acceptors.',
    [
      ['proposer', 'Proposer P', 'Runs ballot 7 for configuration blue', 8, 48],
      ['a1', 'Acceptor A1', 'Persists promises and accepted values', 42, 16],
      ['a2', 'Acceptor A2', 'Persists promises and accepted values', 62, 48],
      ['a3', 'Acceptor A3', 'Persists promises and accepted values', 42, 82],
      ['learner', 'Learner L', 'Observes the chosen value', 90, 48]
    ],
    [
      ['proposer', 'a1', 'PREPARE ballot 7'],
      ['proposer', 'a2', 'PREPARE ballot 7'],
      ['proposer', 'a3', 'PREPARE ballot 7'],
      ['a2', 'learner', 'ACCEPTED ballot 7 value blue']
    ],
    [
      ['Empty slot', 'No acceptor has promised or accepted a value for slot 12.', null, [
        {ballot:'7',proposal:'blue'}, {promise:'0',accepted:'none'}, {promise:'0',accepted:'none'}, {promise:'0',accepted:'none'}, {slot:'12',chosen:'none'}
      ], 'The slot has no chosen value.', 'A value is chosen only after acceptance by a quorum.'],
      ['Prepare quorum', 'P sends prepare 7 and receives promises from A1 and A2.', ['proposer', 'a2', 'PREPARE 7 then PROMISE 7'], [
        {ballot:'7',phase:'prepare quorum'}, {promise:'7',accepted:'none'}, {promise:'7',accepted:'none'}, {promise:'0',accepted:'none'}, {slot:'12',chosen:'none'}
      ], 'A majority promises not to accept lower ballots.', 'An acceptor persists its promise before replying.'],
      ['Safe value selected', 'No promise reports an earlier accepted value, so P may propose blue.', ['proposer', 'a1', 'ACCEPT ballot 7 blue'], [
        {ballot:'7',phase:'accept blue'}, {promise:'7',accepted:'7/blue'}, {promise:'7',accepted:'none'}, {promise:'0',accepted:'none'}, {slot:'12',chosen:'none'}
      ], 'The proposed value obeys the phase-one selection rule.', 'If promises include accepted values, the proposer must use the value from the highest accepted ballot.'],
      ['Majority acceptance', 'A2 durably accepts ballot 7 value blue.', ['proposer', 'a2', 'ACCEPT ballot 7 blue'], [
        {ballot:'7',phase:'majority accepted'}, {promise:'7',accepted:'7/blue'}, {promise:'7',accepted:'7/blue'}, {promise:'0',accepted:'none'}, {slot:'12',chosen:'blue@7'}
      ], 'Blue is chosen by the intersecting quorum A1,A2.', 'Once chosen, every later successful ballot must preserve blue.'],
      ['Learner notified', 'Accepted messages allow L to learn blue while A3 remains behind.', ['a2', 'learner', 'LEARN slot12 blue'], [
        {ballot:'7',phase:'complete'}, {promise:'7',accepted:'7/blue'}, {promise:'7',accepted:'7/blue'}, {promise:'0',accepted:'none'}, {slot:'12',chosen:'blue@7'}
      ], 'The decision survives one acceptor failure.', 'Learner notification may lag without changing the chosen value.']
    ]
  );

  add(
    'consensus-coordination::Raft',
    'log',
    'A three-node Raft group elects a leader and commits a payment command at log index 9.',
    [
      ['n1', 'Node N1', 'Candidate then leader for term 4', 50, 10],
      ['n2', 'Node N2', 'Follower with replicated log', 16, 72],
      ['n3', 'Node N3', 'Follower with replicated log', 84, 72],
      ['log', 'Committed log view', 'Shows term-index and commit boundary', 50, 92]
    ],
    [
      ['n1', 'n2', 'RequestVote term 4 lastIndex 8'],
      ['n2', 'n1', 'VoteGranted term 4'],
      ['n1', 'n3', 'AppendEntries term4 index9'],
      ['n1', 'log', 'advance commitIndex to 9']
    ],
    [
      ['Follower timeout', 'N1 times out with all logs committed through index 8.', null, [
        {role:'follower',term:'3',lastIndex:'8'}, {role:'follower',term:'3',lastIndex:'8'}, {role:'follower',term:'3',lastIndex:'8'}, {commitIndex:'8',entry9:'empty'}
      ], 'The cluster has no active leader after the timeout.', 'Terms increase monotonically and identify election epochs.'],
      ['Election starts', 'N1 increments to term 4, votes for itself, and requests votes.', ['n1', 'n2', 'RequestVote term4 index8'], [
        {role:'candidate',term:'4',votes:'1'}, {role:'follower',term:'4',votedFor:'N1'}, {role:'follower',term:'3',votedFor:'none'}, {commitIndex:'8',entry9:'empty'}
      ], 'N1 has two votes including N2.', 'A voter grants at most one vote per term and requires an up-to-date candidate log.'],
      ['Leader appends', 'N1 becomes leader and appends charge(42) at term 4 index 9.', ['n1', 'n3', 'AppendEntries t4 i9 charge42'], [
        {role:'leader',term:'4',lastIndex:'9'}, {role:'follower',term:'4',lastIndex:'8'}, {role:'follower',term:'4',lastIndex:'9'}, {commitIndex:'8',entry9:'t4 charge42 uncommitted'}
      ], 'The command exists on the leader and N3.', 'The leader assigns one term-index position to each new command.'],
      ['Majority replication', 'N3 acknowledges index 9, giving the leader a majority.', ['n3', 'n1', 'AppendResponse matchIndex9'], [
        {role:'leader',term:'4',matchQuorum:'9'}, {role:'follower',term:'4',lastIndex:'8'}, {role:'follower',term:'4',lastIndex:'9'}, {commitIndex:'9',entry9:'t4 charge42 committed'}
      ], 'The current-term entry is committed.', 'A leader commits a current-term entry after replication on a majority.'],
      ['Commit propagated', 'N1 sends the new commit index and N2 catches up.', ['n1', 'n2', 'AppendEntries i9 leaderCommit9'], [
        {role:'leader',term:'4',lastApplied:'9'}, {role:'follower',term:'4',lastApplied:'9'}, {role:'follower',term:'4',lastApplied:'9'}, {commitIndex:'9',entry9:'t4 charge42 applied'}
      ], 'All state machines apply the same command at index 9.', 'Committed log entries remain in the same position on future leaders.']
    ]
  );

  add(
    'consensus-coordination::Leader election',
    'consensus',
    'Three scheduler nodes elect one job dispatcher for epoch 12.',
    [
      ['timeout', 'Election timer', 'Triggers a randomized candidacy timeout', 10, 12],
      ['a', 'Scheduler A', 'Candidate with log position 31', 25, 72],
      ['b', 'Scheduler B', 'Voting peer with log position 31', 58, 28],
      ['c', 'Scheduler C', 'Voting peer with log position 30', 86, 76],
      ['epoch', 'Epoch register', 'Publishes the winning authority epoch', 52, 90]
    ],
    [
      ['timeout', 'a', 'expire timer at 12:00:03.400'],
      ['a', 'b', 'request vote epoch12 lastIndex31'],
      ['a', 'c', 'request vote epoch12 lastIndex31'],
      ['a', 'epoch', 'publish leader A epoch12']
    ],
    [
      ['No heartbeat', 'The prior epoch 11 leader stops sending heartbeats.', null, [
        {deadline:'12:00:03.400',status:'armed'}, {role:'follower',epoch:'11'}, {role:'follower',epoch:'11'}, {role:'follower',epoch:'11'}, {leader:'none',epoch:'11'}
      ], 'Followers wait for independent randomized deadlines.', 'Election timeouts should be randomized to reduce repeated split votes.'],
      ['A becomes candidate', 'A times out first, advances to epoch 12, and self-votes.', ['timeout', 'a', 'deadline reached'], [
        {deadline:'expired',status:'fired'}, {role:'candidate',epoch:'12',votes:'1'}, {role:'follower',epoch:'11'}, {role:'follower',epoch:'11'}, {leader:'none',epoch:'12'}
      ], 'A begins the election in a newer epoch.', 'Messages from epochs below 12 can no longer establish authority.'],
      ['Fresh voter grants', 'B verifies A is at least as up to date and grants its epoch-12 vote.', ['b', 'a', 'grant vote epoch12'], [
        {deadline:'reset 12:00:06.900',status:'armed'}, {role:'candidate',epoch:'12',votes:'2'}, {role:'follower',epoch:'12',votedFor:'A'}, {role:'follower',epoch:'11'}, {leader:'none',epoch:'12'}
      ], 'A has a majority of the three voters.', 'A voter may grant only one vote in an epoch.'],
      ['Authority published', 'A assumes leadership and publishes epoch 12.', ['a', 'epoch', 'write leader=A epoch=12'], [
        {deadline:'heartbeat-driven',status:'reset'}, {role:'leader',epoch:'12',votes:'2'}, {role:'follower',epoch:'12',votedFor:'A'}, {role:'follower',epoch:'12',votedFor:'none'}, {leader:'A',epoch:'12'}
      ], 'Schedulers agree on A as the current leader.', 'Leadership is scoped to an epoch, not merely a node identity.'],
      ['Heartbeats stabilize', 'A sends epoch-12 heartbeats and all timers reset.', ['a', 'c', 'heartbeat epoch12 commit31'], [
        {deadline:'12:00:07.200',status:'armed'}, {role:'leader',epoch:'12',lastIndex:'31'}, {role:'follower',epoch:'12',lastIndex:'31'}, {role:'follower',epoch:'12',lastIndex:'31'}, {leader:'A',epoch:'12'}
      ], 'A remains leader while it can reach followers.', 'A quorum and fencing are required to prevent an isolated old leader from acting.']
    ]
  );

  add(
    'consensus-coordination::Leases',
    'timeline',
    'A metadata worker holds a renewable 10-second lease to compact one shard.',
    [
      ['store', 'Lease store', 'Atomically records owner, expiry, and generation', 12, 52],
      ['a', 'Worker A', 'Current lease holder', 42, 16],
      ['clock', 'Authoritative clock', 'Evaluates lease expiry boundaries', 55, 82],
      ['b', 'Worker B', 'Contending worker after expiry', 88, 46]
    ],
    [
      ['a', 'store', 'acquire shard7 until 10:00:10 gen34'],
      ['a', 'store', 'renew until 10:00:18 gen34'],
      ['clock', 'store', 'mark gen34 expired at 10:00:18'],
      ['b', 'store', 'acquire shard7 until 10:00:29 gen35']
    ],
    [
      ['Lease absent', 'Shard 7 has no current owner at 10:00:00.', null, [
        {owner:'none',expiry:'10:00:00',generation:'33'}, {status:'requesting',localTime:'10:00:00'}, {now:'10:00:00',skewBound:'100ms'}, {status:'waiting',localTime:'10:00:00'}
      ], 'Either worker may attempt an atomic acquisition.', 'The lease record must be changed conditionally.'],
      ['A acquires', 'A receives generation 34 until 10:00:10.', ['store', 'a', 'grant gen34 expiry10:00:10'], [
        {owner:'A',expiry:'10:00:10',generation:'34'}, {status:'holder gen34',localTime:'10:00:01'}, {now:'10:00:01',skewBound:'100ms'}, {status:'waiting',localTime:'10:00:01'}
      ], 'A may compact within the bounded lease interval.', 'The holder must stop before expiry minus the safety margin.'],
      ['A renews', 'A renews before the safety margin and keeps generation 34.', ['a', 'store', 'renew gen34 expiry10:00:18'], [
        {owner:'A',expiry:'10:00:18',generation:'34'}, {status:'holder gen34',localTime:'10:00:08'}, {now:'10:00:08',skewBound:'100ms'}, {status:'waiting',localTime:'10:00:08'}
      ], 'Authority is extended without changing owners.', 'Renewal succeeds only if owner and generation still match.'],
      ['Lease expires', 'A pauses beyond expiry and must consider its authority lost.', ['clock', 'a', 'expiry plus safety margin passed'], [
        {owner:'A-expired',expiry:'10:00:18',generation:'34'}, {status:'stale gen34',localTime:'10:00:20'}, {now:'10:00:20',skewBound:'100ms'}, {status:'requesting',localTime:'10:00:20'}
      ], 'Time bounds permit a new owner to contend.', 'An expired holder cannot infer continued ownership from local memory.'],
      ['B acquires next generation', 'B atomically replaces the expired record with generation 35.', ['store', 'b', 'grant gen35 expiry10:00:29'], [
        {owner:'B',expiry:'10:00:29',generation:'35'}, {status:'stale gen34',localTime:'10:00:21'}, {now:'10:00:21',skewBound:'100ms'}, {status:'holder gen35',localTime:'10:00:21'}
      ], 'B is the new lease holder.', 'Leases should be paired with fencing because A may resume and attempt stale side effects.']
    ]
  );

  add(
    'consensus-coordination::Fencing tokens',
    'consensus',
    'A storage writer rejects work from a paused lease holder after ownership moves to a newer token.',
    [
      ['lock', 'Lock service', 'Issues monotonically increasing ownership tokens', 10, 18],
      ['a', 'Writer A', 'Paused holder of token 91', 28, 72],
      ['b', 'Writer B', 'New holder of token 92', 72, 18],
      ['disk', 'Protected volume', 'Remembers the greatest accepted token', 90, 72]
    ],
    [
      ['lock', 'a', 'grant token 91'],
      ['lock', 'b', 'grant token 92'],
      ['b', 'disk', 'WRITE block8 token92'],
      ['a', 'disk', 'WRITE block9 token91 rejected']
    ],
    [
      ['First ownership', 'The lock service grants A token 91.', ['lock', 'a', 'lease grant token91'], [
        {nextToken:'92',owner:'A'}, {token:'91',status:'active'}, {token:'none',status:'waiting'}, {maxToken:'90',version:'v30'}
      ], 'A can write only by presenting token 91.', 'Each ownership grant must carry a token greater than every prior grant.'],
      ['A pauses', 'A stops renewing but retains stale in-memory authority.', null, [
        {nextToken:'92',owner:'none'}, {token:'91',status:'paused'}, {token:'none',status:'requesting'}, {maxToken:'90',version:'v30'}
      ], 'The lock is available while A is unaware.', 'Process pauses can outlive a lease and invalidate local ownership beliefs.'],
      ['B gets newer token', 'The lock service grants B token 92.', ['lock', 'b', 'lease grant token92'], [
        {nextToken:'93',owner:'B'}, {token:'91',status:'paused'}, {token:'92',status:'active'}, {maxToken:'90',version:'v30'}
      ], 'B has a newer ownership generation.', 'Token order, not arrival time at the client, defines freshness.'],
      ['Resource advances fence', 'The volume accepts B’s write and records max token 92.', ['b', 'disk', 'write v31 with token92'], [
        {nextToken:'93',owner:'B'}, {token:'91',status:'resuming'}, {token:'92',status:'active'}, {maxToken:'92',version:'v31'}
      ], 'The protected resource advances its durable fence.', 'The resource must atomically compare the token with the side effect.'],
      ['Stale holder rejected', 'A resumes, but its token 91 is lower than the stored fence.', ['disk', 'a', 'reject token91 lower than92'], [
        {nextToken:'93',owner:'B'}, {token:'91',status:'rejected'}, {token:'92',status:'active'}, {maxToken:'92',version:'v31'}
      ], 'A cannot overwrite B despite resuming late.', 'Every side-effecting path must enforce the fencing token.']
    ]
  );

  add(
    'replication::Leader/follower replication',
    'replicas',
    'A database leader appends an account update and two followers replay its ordered log.',
    [
      ['client', 'Account client', 'Sends the authoritative write', 8, 44],
      ['leader', 'Leader L', 'Orders writes in the replication log', 34, 44],
      ['f1', 'Follower F1', 'Acknowledges synchronous replication', 72, 20],
      ['f2', 'Follower F2', 'Replays asynchronously', 82, 76],
      ['cursor', 'Commit cursor', 'Marks the acknowledged log prefix', 44, 88]
    ],
    [
      ['client', 'leader', 'UPDATE balance append index 105'],
      ['leader', 'f1', 'replicate index105 term8'],
      ['leader', 'f2', 'stream index105 term8'],
      ['leader', 'cursor', 'advance commit index105']
    ],
    [
      ['Replicated baseline', 'All replicas have applied log index 104.', null, [
        {request:'none',result:'idle'}, {lastIndex:'104',balance:'80'}, {lastIndex:'104',balance:'80'}, {lastIndex:'104',balance:'80'}, {commitIndex:'104',term:'8'}
      ], 'The group exposes the same committed state.', 'Only the leader assigns positions to new writes.'],
      ['Leader appends', 'The leader appends balance=65 at index 105.', ['client', 'leader', 'update balance65'], [
        {request:'set balance65',result:'pending'}, {lastIndex:'105',balance:'80 pending65'}, {lastIndex:'104',balance:'80'}, {lastIndex:'104',balance:'80'}, {commitIndex:'104',term:'8'}
      ], 'The update is not yet acknowledged as committed.', 'Followers replay the leader’s log order.'],
      ['Synchronous follower persists', 'F1 writes index 105 and returns a durable acknowledgement.', ['f1', 'leader', 'ACK index105 durable'], [
        {request:'set balance65',result:'pending'}, {lastIndex:'105',balance:'65'}, {lastIndex:'105',balance:'65'}, {lastIndex:'104',balance:'80'}, {commitIndex:'104',term:'8'}
      ], 'A configured acknowledgement quorum is reached.', 'The leader must wait for the promised durability policy before success.'],
      ['Commit acknowledged', 'The leader advances commit index and responds to the client.', ['leader', 'client', 'success committed index105'], [
        {request:'set balance65',result:'success index105'}, {lastIndex:'105',balance:'65'}, {lastIndex:'105',balance:'65'}, {lastIndex:'104',balance:'80'}, {commitIndex:'105',term:'8'}
      ], 'Leader and F1 can serve committed version 105.', 'A lagging follower must not present its state as current.'],
      ['Async follower catches up', 'F2 replays index 105 from the leader stream.', ['leader', 'f2', 'apply index105 balance65'], [
        {request:'read',result:'balance65'}, {lastIndex:'105',balance:'65'}, {lastIndex:'105',balance:'65'}, {lastIndex:'105',balance:'65'}, {commitIndex:'105',term:'8'}
      ], 'All followers converge on the committed prefix.', 'Failover may choose only a sufficiently up-to-date follower.']
    ]
  );

  add(
    'replication::Leaderless replication',
    'replicas',
    'A coordinator writes a session value directly to three replicas and reconciles divergent versions.',
    [
      ['client', 'Session client', 'Requests quorum reads and writes', 50, 8],
      ['r1', 'Replica A', 'Accepts versioned siblings', 10, 68],
      ['r2', 'Replica B', 'Accepts versioned siblings', 50, 90],
      ['r3', 'Replica C', 'Accepts versioned siblings', 90, 68],
      ['resolver', 'Sibling resolver', 'Merges concurrent session fields', 50, 48]
    ],
    [
      ['client', 'r1', 'PUT session vector [4,2]'],
      ['client', 'r2', 'PUT session vector [4,2]'],
      ['r3', 'resolver', 'READ sibling [3,3]'],
      ['resolver', 'client', 'return merged [4,3]']
    ],
    [
      ['Divergent baseline', 'A and B hold [4,2], while C contains concurrent [3,3].', null, [
        {operation:'GET session',status:'pending'}, {vector:'[4,2]',cart:'x'}, {vector:'[4,2]',cart:'x'}, {vector:'[3,3]',coupon:'y'}, {inputs:'0',decision:'idle'}
      ], 'No permanent leader owns the key.', 'Each version needs metadata sufficient to detect causality or concurrency.'],
      ['Parallel read', 'The client-side coordinator reads all three replicas.', ['client', 'r1', 'GET session quorum'], [
        {operation:'GET session',status:'collecting'}, {vector:'[4,2]',reply:'cart=x'}, {vector:'[4,2]',reply:'cart=x'}, {vector:'[3,3]',reply:'coupon=y'}, {inputs:'2 vectors',decision:'compare'}
      ], 'The quorum exposes both concurrent siblings.', 'A response cannot select a winner solely by arrival order.'],
      ['Sibling detection', 'The resolver finds [4,2] and [3,3] incomparable.', ['r3', 'resolver', 'submit sibling [3,3]'], [
        {operation:'GET session',status:'resolving'}, {vector:'[4,2]',reply:'cart=x'}, {vector:'[4,2]',reply:'cart=x'}, {vector:'[3,3]',reply:'coupon=y'}, {inputs:'[4,2]|[3,3]',decision:'concurrent'}
      ], 'Both application changes must be considered.', 'Concurrent versions are retained until a deterministic or application merge resolves them.'],
      ['Application merge', 'The resolver combines cart and coupon into descendant [4,3].', ['resolver', 'client', 'merged session [4,3]'], [
        {operation:'GET session',status:'merged [4,3]'}, {vector:'[4,2]',reply:'cart=x'}, {vector:'[4,2]',reply:'cart=x'}, {vector:'[3,3]',reply:'coupon=y'}, {inputs:'2 siblings',decision:'cart=x coupon=y [4,3]'}
      ], 'The client receives a value preserving both edits.', 'The merged version must dominate every resolved sibling.'],
      ['Read repair', 'The merged descendant is written back to stale replicas.', ['resolver', 'r3', 'repair session [4,3]'], [
        {operation:'GET session',status:'complete'}, {vector:'[4,3]',reply:'merged'}, {vector:'[4,3]',reply:'merged'}, {vector:'[4,3]',reply:'merged'}, {inputs:'0',decision:'converged'}
      ], 'The leaderless replicas converge after repair.', 'Repair must not erase a version that is newer than the repair payload.']
    ]
  );

  add(
    'replication::Replication lag',
    'timeline',
    'A read replica falls behind a primary while a reporting client requires a bounded-staleness read.',
    [
      ['primary', 'Orders primary', 'Commits the authoritative log', 12, 22],
      ['stream', 'Replication stream', 'Carries WAL positions and bytes', 44, 48],
      ['replica', 'Reporting replica', 'Replays WAL behind the primary', 74, 22],
      ['meter', 'Lag monitor', 'Measures time, bytes, and log positions', 52, 88],
      ['client', 'Report client', 'Requires lag below two seconds', 90, 72]
    ],
    [
      ['primary', 'stream', 'publish LSN 900'],
      ['stream', 'replica', 'deliver through LSN 860'],
      ['replica', 'meter', 'report replay LSN 860'],
      ['meter', 'client', 'reject replica lag 4.2s']
    ],
    [
      ['Caught up', 'Primary and replica are both at LSN 850.', null, [
        {lsn:'850',commitTime:'14:00:00'}, {headLSN:'850',queuedBytes:'0'}, {replayLSN:'850',dataVersion:'850'}, {lagTime:'0.0s',lagBytes:'0'}, {route:'replica',maxLag:'2.0s'}
      ], 'The reporting replica can satisfy the freshness bound.', 'Lag must be measured against an authoritative progress marker.'],
      ['Write burst', 'The primary commits fifty new log records through LSN 900.', ['primary', 'stream', 'enqueue LSN851-900'], [
        {lsn:'900',commitTime:'14:00:01'}, {headLSN:'900',queuedBytes:'20MB'}, {replayLSN:'850',dataVersion:'850'}, {lagTime:'1.0s',lagBytes:'20MB'}, {route:'evaluating',maxLag:'2.0s'}
      ], 'Replica lag grows while writes continue.', 'Lag can be expressed in time, bytes, or log positions; each answers a different question.'],
      ['Apply bottleneck', 'The stream delivers records, but replay reaches only LSN 860.', ['stream', 'replica', 'replay through LSN860'], [
        {lsn:'900',commitTime:'14:00:01'}, {headLSN:'900',queuedBytes:'16MB'}, {replayLSN:'860',dataVersion:'860'}, {lagTime:'4.2s',lagBytes:'16MB'}, {route:'evaluating',maxLag:'2.0s'}
      ], 'Transport progress does not imply apply progress.', 'A freshness check should use replayed state, not merely received bytes.'],
      ['Bound enforced', 'The monitor routes the report to the primary because lag exceeds two seconds.', ['meter', 'client', 'route primary lag4.2s'], [
        {lsn:'900',commitTime:'14:00:01'}, {headLSN:'900',queuedBytes:'16MB'}, {replayLSN:'860',dataVersion:'860'}, {lagTime:'4.2s',lagBytes:'16MB'}, {route:'primary',maxLag:'2.0s'}
      ], 'The client avoids an unexpectedly stale replica read.', 'A bounded-staleness policy must fail over or reject when its bound cannot be met.'],
      ['Replica recovers', 'Replay catches up through LSN 900 and the monitor restores replica routing.', ['replica', 'meter', 'report replay LSN900'], [
        {lsn:'900',commitTime:'14:00:01'}, {headLSN:'900',queuedBytes:'0'}, {replayLSN:'900',dataVersion:'900'}, {lagTime:'0.0s',lagBytes:'0'}, {route:'replica',maxLag:'2.0s'}
      ], 'Read scaling resumes after measured recovery.', 'Low current lag does not guarantee a future maximum without capacity headroom.']
    ]
  );

  add(
    'partitioning-sharding::Shard merging',
    'shard-merge',
    'Two adjacent, underutilized customer-ID ranges are merged online while requests continue and ownership changes atomically.',
    [
      ['router', 'Range router', 'Resolves customer IDs using a versioned routing epoch', 10, 50],
      ['a', 'Shard A', 'Owns customer IDs 000-499', 35, 20],
      ['b', 'Shard B', 'Owns customer IDs 500-999', 35, 80],
      ['merged', 'Merged shard C', 'Receives the combined range before cutover', 72, 50],
      ['controller', 'Merge controller', 'Copies, validates, fences, and publishes ownership', 50, 50]
    ],
    [
      ['router', 'a', 'route customer 218 under epoch 41'],
      ['router', 'b', 'route customer 742 under epoch 41'],
      ['a', 'merged', 'snapshot rows 000-499 through LSN 840'],
      ['b', 'merged', 'snapshot rows 500-999 through LSN 615'],
      ['controller', 'merged', 'replay deltas and verify checksum'],
      ['controller', 'router', 'publish epoch 42: 000-999 → C'],
      ['router', 'merged', 'route customer 742 under epoch 42']
    ],
    [
      ['Two small owners', 'The directory maps two adjacent ranges to separate shards; customer 742 resolves to Shard B.', null, [
        {epoch:'41',map:'000-499→A | 500-999→B',lookup742:'Shard B'},
        {range:'000-499',rows:'1.2M',writes:'authoritative',status:'serving'},
        {range:'500-999',rows:'0.8M',writes:'authoritative',status:'serving'},
        {range:'000-999',copy:'0%',deltaLag:'—',status:'empty'},
        {phase:'select',fence:'off',validation:'pending'}
      ], 'The merge candidate is adjacent and lightly loaded, but both sources still own writes.', 'Every key has exactly one authoritative owner in routing epoch 41.'],
      ['Bulk copy', 'The controller takes consistent snapshots and streams both key ranges into the new combined shard.', ['a', 'merged', 'copy snapshots A@840 and B@615'], [
        {epoch:'41',map:'000-499→A | 500-999→B',lookup742:'Shard B'},
        {range:'000-499',rows:'1.2M',writes:'authoritative',status:'copying @ LSN840'},
        {range:'500-999',rows:'0.8M',writes:'authoritative',status:'copying @ LSN615'},
        {range:'000-999',copy:'76%',deltaLag:'18,420 writes',status:'building'},
        {phase:'snapshot copy',fence:'off',validation:'pending'}
      ], 'Foreground traffic remains on A and B while C receives a stable baseline.', 'A snapshot alone is insufficient because writes continue after its LSN.'],
      ['Catch up and verify', 'Change streams replay post-snapshot writes until C matches both source logs and checksums.', ['controller', 'merged', 'replay to A@917, B@688; verify 2.0M rows'], [
        {epoch:'41',map:'000-499→A | 500-999→B',lookup742:'Shard B'},
        {range:'000-499',rows:'1.2M',writes:'authoritative',status:'head LSN917'},
        {range:'500-999',rows:'0.8M',writes:'authoritative',status:'head LSN688'},
        {range:'000-999',copy:'100%',deltaLag:'0 writes',status:'checksum matched'},
        {phase:'catch-up',fence:'off',validation:'2.0M rows match'}
      ], 'C now contains the union of both ranges at the same log positions as its sources.', 'Do not cut over until row counts, checksums, and change-stream lag meet the safety gate.'],
      ['Fence and cut over', 'Writes are briefly fenced, final deltas apply, and the directory atomically publishes one combined owner.', ['controller', 'router', 'CAS epoch 41→42; map 000-999 to C'], [
        {epoch:'42',map:'000-999→C',lookup742:'Shard C'},
        {range:'000-499',rows:'1.2M',writes:'fenced',status:'read drain'},
        {range:'500-999',rows:'0.8M',writes:'fenced',status:'read drain'},
        {range:'000-999',copy:'100%',deltaLag:'0 writes',status:'authoritative'},
        {phase:'cutover',fence:'token 42',validation:'passed'}
      ], 'New requests, including customer 742, resolve directly to C under epoch 42.', 'The routing update must be atomic: overlapping or missing ownership would duplicate or lose writes.'],
      ['Retire old shards', 'After old-epoch requests drain and rollback time expires, A and B release their storage.', ['router', 'merged', 'serve customer 742 from C under epoch 42'], [
        {epoch:'42',map:'000-999→C',lookup742:'Shard C'},
        {range:'released',rows:'0',writes:'blocked',status:'retired'},
        {range:'released',rows:'0',writes:'blocked',status:'retired'},
        {range:'000-999',copy:'100%',deltaLag:'0 writes',status:'serving 2.0M rows'},
        {phase:'complete',fence:'token 42',validation:'rollback window closed'}
      ], 'One shard now owns the contiguous range, reducing per-shard overhead without downtime.', 'Retire sources only after stale routers and in-flight epoch-41 requests can no longer write.']
    ]
  );

  add(
    'partitioning-sharding::Consistent hashing',
    'topology',
    'A cache ring assigns one key clockwise and moves only an adjacent range when a node joins.',
    [
      ['n1', 'Cache node N1', 'Owns token 10 on the ring', 50, 7],
      ['n2', 'Cache node N2', 'Owns token 42 on the ring', 90, 52],
      ['n3', 'Cache node N3', 'Owns token 78 on the ring', 50, 93],
      ['key', 'Key invoice:7', 'Hashes to ring token 35', 12, 52],
      ['join', 'Cache node N4', 'Joins at token 38', 50, 52]
    ],
    [
      ['key', 'n2', 'clockwise owner lookup 35→42'],
      ['join', 'n2', 'claim interval (10,38]'],
      ['n2', 'join', 'transfer keys tokens 11-38'],
      ['key', 'join', 'new owner lookup 35→38']
    ],
    [
      ['Three-node ring', 'Tokens 10, 42, and 78 divide the circular hash space.', null, [
        {token:'10',range:'(78,10]'}, {token:'42',range:'(10,42]'}, {token:'78',range:'(42,78]'}, {hash:'35',owner:'N2'}, {token:'none',range:'none'}
      ], 'Key token 35 maps clockwise to N2 at token 42.', 'Every key is owned by the first eligible token clockwise on the ring.'],
      ['Lookup follows ring', 'The router walks clockwise from 35 to token 42.', ['key', 'n2', 'route hash35 to token42'], [
        {token:'10',range:'(78,10]'}, {token:'42',range:'(10,42]',keys:'240'}, {token:'78',range:'(42,78]'}, {hash:'35',owner:'N2'}, {token:'none',range:'none'}
      ], 'The key is stored on N2.', 'All routers need a consistent membership and token view.'],
      ['N4 joins', 'N4 inserts token 38 immediately before N2.', ['join', 'n2', 'insert token38 before42'], [
        {token:'10',range:'(78,10]'}, {token:'42',range:'(38,42]',keys:'31'}, {token:'78',range:'(42,78]'}, {hash:'35',owner:'moving'}, {token:'38',range:'(10,38]',keys:'0'}
      ], 'Only N2’s former interval is split.', 'Membership changes should not remap unrelated ring intervals.'],
      ['Adjacent range moves', 'N2 transfers keys hashing from 11 through 38 to N4.', ['n2', 'join', 'stream 209 keys in (10,38]'], [
        {token:'10',range:'(78,10]'}, {token:'42',range:'(38,42]',keys:'31'}, {token:'78',range:'(42,78]'}, {hash:'35',owner:'N4'}, {token:'38',range:'(10,38]',keys:'209'}
      ], 'Key invoice:7 moves to N4; other owners keep their ranges.', 'Consistent hashing minimizes movement but does not by itself guarantee even load.'],
      ['New ring stable', 'Routers publish the token-38 membership epoch.', ['key', 'join', 'route hash35 to token38'], [
        {token:'10',range:'(78,10]',epoch:'6'}, {token:'42',range:'(38,42]',epoch:'6'}, {token:'78',range:'(42,78]',epoch:'6'}, {hash:'35',owner:'N4 epoch6'}, {token:'38',range:'(10,38]',epoch:'6'}
      ], 'The key resolves directly to N4 under epoch 6.', 'Virtual nodes or weights are normally required to smooth physical-node imbalance.']
    ]
  );

  add(
    'partitioning-sharding::Rendezvous hashing',
    'topology',
    'A router scores a tenant key against four storage nodes and preserves ownership when an unrelated node leaves.',
    [
      ['key', 'Tenant key T9', 'Seeds deterministic key-node scores', 50, 50],
      ['a', 'Storage A', 'Candidate weighted at 1.0', 50, 6],
      ['b', 'Storage B', 'Candidate weighted at 1.0', 92, 50],
      ['c', 'Storage C', 'Candidate weighted at 1.0', 50, 94],
      ['d', 'Storage D', 'Candidate weighted at 0.5', 8, 50]
    ],
    [
      ['key', 'a', 'score H(T9,A)=0.62'],
      ['key', 'b', 'score H(T9,B)=0.91'],
      ['key', 'c', 'score H(T9,C)=0.44'],
      ['key', 'd', 'weighted score H(T9,D)=0.38']
    ],
    [
      ['Candidates listed', 'The router evaluates the same eligible node set for tenant T9.', null, [
        {membership:'epoch14',winner:'unknown'}, {status:'eligible',score:'pending'}, {status:'eligible',score:'pending'}, {status:'eligible',score:'pending'}, {status:'eligible',score:'pending'}
      ], 'No ring traversal or shared token placement is needed.', 'Every router must use the same hash, weights, and membership epoch.'],
      ['Scores computed', 'The key-node hash yields deterministic weighted scores.', ['key', 'b', 'compute score0.91'], [
        {membership:'epoch14',winner:'B'}, {status:'eligible',score:'0.62'}, {status:'eligible',score:'0.91'}, {status:'eligible',score:'0.44'}, {status:'eligible',score:'0.38'}
      ], 'B ranks first for T9.', 'The highest score wins; identical inputs must produce identical rankings.'],
      ['Replicas ranked', 'A is selected as the second owner for redundancy.', ['key', 'a', 'select rank2 score0.62'], [
        {membership:'epoch14',winner:'B,A'}, {status:'rank2',score:'0.62'}, {status:'rank1',score:'0.91'}, {status:'rank3',score:'0.44'}, {status:'rank4',score:'0.38'}
      ], 'The top two deterministic scores define the replica set.', 'Selecting multiple owners uses score order without a separate placement structure.'],
      ['Unrelated node leaves', 'C leaves, but C was not an owner for T9.', ['c', 'key', 'remove C in epoch15'], [
        {membership:'epoch15',winner:'B,A'}, {status:'rank2',score:'0.62'}, {status:'rank1',score:'0.91'}, {status:'removed',score:'0.44'}, {status:'rank3',score:'0.38'}
      ], 'T9 remains on B and A with no movement.', 'A membership change affects only keys for which the changed node alters the top ranks.'],
      ['Primary leaves', 'When B leaves, A becomes primary and D becomes the second owner.', ['b', 'key', 'remove B in epoch16'], [
        {membership:'epoch16',winner:'A,D'}, {status:'rank1',score:'0.62'}, {status:'removed',score:'0.91'}, {status:'removed',score:'0.44'}, {status:'rank2',score:'0.38'}
      ], 'Only keys owned by B need reassignment.', 'Naive rendezvous routing evaluates every candidate, so large fleets need hierarchical or indexed variants.']
    ]
  );

  add(
    'distributed-caching::Cache-aside',
    'cache',
    'A product API loads a missing catalog record from the database and explicitly fills Redis.',
    [
      ['client', 'Product client', 'Requests product 42', 8, 50],
      ['api', 'Catalog API', 'Owns cache-aside read logic', 32, 50],
      ['cache', 'Redis cache', 'Stores disposable product copies', 62, 18],
      ['db', 'Catalog database', 'Stores authoritative product rows', 82, 74]
    ],
    [
      ['client', 'api', 'GET /products/42'],
      ['api', 'cache', 'GET product:42'],
      ['api', 'db', 'SELECT product 42 version 7'],
      ['api', 'cache', 'SET product:42 v7 TTL300']
    ],
    [
      ['Cold cache', 'The database has product version 7 while Redis has no entry.', null, [
        {request:'product42',result:'waiting'}, {phase:'start',observedVersion:'none'}, {key:'product:42',value:'miss'}, {row:'product42',version:'7',price:'25'}
      ], 'The cache is treated as a disposable copy.', 'The database remains the source of truth.'],
      ['Cache lookup misses', 'The API checks Redis before querying the database.', ['api', 'cache', 'GET product:42 miss'], [
        {request:'product42',result:'waiting'}, {phase:'cache miss',observedVersion:'none'}, {key:'product:42',value:'miss',gets:'1'}, {row:'product42',version:'7',price:'25'}
      ], 'The miss transfers refill responsibility to the API.', 'A cache miss must not be interpreted as missing source data.'],
      ['Source read', 'The API reads authoritative version 7 from the catalog database.', ['db', 'api', 'return product42 v7 price25'], [
        {request:'product42',result:'waiting'}, {phase:'source loaded',observedVersion:'7'}, {key:'product:42',value:'miss',gets:'1'}, {row:'product42',version:'7',reads:'1'}
      ], 'The API now has the response and cache payload.', 'Refill data should carry a version or freshness boundary.'],
      ['Cache filled', 'The API stores version 7 with a five-minute TTL.', ['api', 'cache', 'SET product:42 v7 EX300'], [
        {request:'product42',result:'waiting'}, {phase:'cache filled',observedVersion:'7'}, {key:'product:42',value:'v7 price25',ttl:'300s'}, {row:'product42',version:'7',reads:'1'}
      ], 'Subsequent requests can avoid the database.', 'Cache fill failure must not turn a successful source read into false data.'],
      ['Warm hit', 'A later request reads version 7 directly from Redis.', ['cache', 'api', 'HIT product:42 v7'], [
        {request:'product42',result:'v7 price25'}, {phase:'complete cache hit',observedVersion:'7'}, {key:'product:42',value:'v7 price25',ttl:'294s'}, {row:'product42',version:'7',reads:'1'}
      ], 'The second request is served with lower source load.', 'Write paths must invalidate or refresh the cached copy to bound staleness.']
    ]
  );

  add(
    'distributed-caching::Write-through cache',
    'cache',
    'A pricing API writes a new price through a cache tier that synchronously updates durable storage.',
    [
      ['client', 'Pricing client', 'Submits price version 18', 8, 20],
      ['api', 'Pricing API', 'Waits for the write-through contract', 30, 50],
      ['cache', 'Write-through cache', 'Coordinates cache and source mutation', 60, 24],
      ['db', 'Pricing database', 'Durably commits the authoritative price', 88, 72],
      ['reader', 'Price reader', 'Reads the newly cached version', 42, 90]
    ],
    [
      ['client', 'api', 'PUT price=29 v18'],
      ['api', 'cache', 'write product42 v18'],
      ['cache', 'db', 'commit product42 v18'],
      ['cache', 'reader', 'serve product42 v18']
    ],
    [
      ['Version 17', 'Cache and database both store price 25 at version 17.', null, [
        {request:'none',result:'idle'}, {phase:'idle',version:'17'}, {value:'25',version:'17',status:'clean'}, {value:'25',version:'17',status:'durable'}, {request:'none',observed:'17'}
      ], 'Reads are aligned before the write.', 'The source remains authoritative even when writes enter through the cache.'],
      ['Write enters cache', 'The API sends version 18 and waits for synchronous completion.', ['api', 'cache', 'WRITE price29 v18'], [
        {request:'price29 v18',result:'pending'}, {phase:'write pending',version:'18'}, {value:'29',version:'18',status:'uncommitted'}, {value:'25',version:'17',status:'durable'}, {request:'none',observed:'17'}
      ], 'The cache must not acknowledge an unpersisted value.', 'Write-through success requires the configured durable source write.'],
      ['Database commits', 'The cache persists version 18 in the pricing database.', ['cache', 'db', 'UPSERT price29 v18'], [
        {request:'price29 v18',result:'pending'}, {phase:'source committed',version:'18'}, {value:'29',version:'18',status:'awaiting commit ack'}, {value:'29',version:'18',status:'durable'}, {request:'none',observed:'17'}
      ], 'The authoritative row now contains version 18.', 'Source and cache writes need an explicit failure and retry policy.'],
      ['Cache publishes', 'After the durable acknowledgement, version 18 becomes readable.', ['cache', 'api', 'ACK write-through v18'], [
        {request:'price29 v18',result:'success'}, {phase:'complete',version:'18'}, {value:'29',version:'18',status:'clean'}, {value:'29',version:'18',status:'durable'}, {request:'GET product42',observed:'pending'}
      ], 'The client receives success only after both tiers agree.', 'Readers must not observe the new cache value before the source commit when that is the promised contract.'],
      ['Reader hits new value', 'A reader obtains price 29 version 18 from the cache.', ['cache', 'reader', 'HIT price29 v18'], [
        {request:'price29 v18',result:'success'}, {phase:'idle',version:'18'}, {value:'29',version:'18',status:'clean'}, {value:'29',version:'18',status:'durable'}, {request:'GET product42',observed:'29 v18'}
      ], 'The write cost buys an immediately warm cache.', 'Every write pays cache coordination and source latency.']
    ]
  );

  add(
    'distributed-caching::Cache stampede',
    'cache',
    'Hundreds of requests hit an expired recommendation key and a single-flight lock limits source refill.',
    [
      ['clients', 'Request cohort', 'Represents 500 simultaneous readers', 8, 52],
      ['cache', 'Recommendation cache', 'Holds a popular expiring key', 38, 18],
      ['lock', 'Single-flight gate', 'Allows one refill owner per key', 54, 72],
      ['db', 'Recommendation store', 'Computes the expensive source result', 84, 30],
      ['stale', 'Stale-value slot', 'Serves bounded stale data to waiters', 86, 82]
    ],
    [
      ['clients', 'cache', '500 GET recs:user7'],
      ['cache', 'lock', 'acquire refill key user7'],
      ['lock', 'db', 'one source query for version 32'],
      ['stale', 'clients', 'serve stale v31 during refill']
    ],
    [
      ['Popular key valid', 'Version 31 has ten seconds left on its TTL.', null, [
        {arrivals:'40/s',responses:'v31'}, {key:'user7',version:'31',ttl:'10s'}, {owner:'none',waiters:'0'}, {queries:'2/s',version:'31'}, {version:'31',maxStale:'60s'}
      ], 'Normal traffic is absorbed by the cache.', 'A hot key concentrates refill risk at one expiry boundary.'],
      ['Simultaneous expiry', 'The key expires as 500 requests arrive together.', ['clients', 'cache', '500 misses at ttl0'], [
        {arrivals:'500 burst',responses:'pending'}, {key:'user7',version:'expired31',ttl:'0s'}, {owner:'none',waiters:'0'}, {queries:'2/s',version:'31'}, {version:'31',maxStale:'60s'}
      ], 'Without coordination, every miss could query the source.', 'Expiry jitter reduces synchronization but does not eliminate refill races.'],
      ['One refill owner', 'One requester acquires the single-flight gate; 499 become waiters.', ['cache', 'lock', 'grant refill owner request1'], [
        {arrivals:'500 burst',responses:'499 waiting'}, {key:'user7',version:'expired31',ttl:'0s'}, {owner:'request1',waiters:'499'}, {queries:'3/s',version:'31'}, {version:'31',maxStale:'60s'}
      ], 'Source fan-out is bounded to one query.', 'The refill lock needs a timeout so a failed owner cannot block the key indefinitely.'],
      ['Stale while revalidate', 'Waiters receive bounded-stale version 31 while version 32 is computed.', ['stale', 'clients', 'serve stale v31 to 499'], [
        {arrivals:'500 burst',responses:'499 stale31'}, {key:'user7',version:'refilling',ttl:'0s'}, {owner:'request1',waiters:'0'}, {queries:'3/s',version:'computing32'}, {version:'31',maxStale:'60s'}
      ], 'Latency and source load remain bounded during refill.', 'Stale serving is safe only for data with an explicit acceptable-staleness policy.'],
      ['Fresh value published', 'The owner stores version 32 and releases the gate.', ['db', 'cache', 'SET user7 v32 TTL300+jitter'], [
        {arrivals:'45/s',responses:'v32'}, {key:'user7',version:'32',ttl:'327s'}, {owner:'none',waiters:'0'}, {queries:'2/s',version:'32'}, {version:'32',maxStale:'60s'}
      ], 'Traffic returns to cache hits with a jittered expiry.', 'Only a successfully published fresh value completes the refill generation.']
    ]
  );

  add(
    'distributed-caching::Thundering herd',
    'capacity',
    'Ten thousand clients reconnect after a shared outage and would overwhelm an authentication dependency without jitter and admission control.',
    [
      ['clients', 'Client fleet', '10,000 clients sharing one retry boundary', 10, 50],
      ['timers', 'Retry timers', 'Schedules each client retry attempt', 34, 18],
      ['gate', 'Admission gate', 'Limits concurrent authentication work', 52, 72],
      ['auth', 'Authentication API', 'Can sustainably process 800 requests per second', 78, 24],
      ['queue', 'Bounded wait queue', 'Holds admitted retries without unbounded growth', 86, 78]
    ],
    [
      ['timers', 'clients', 'all retry at t+5s'],
      ['clients', 'auth', '10,000 simultaneous reconnects'],
      ['clients', 'gate', 'retryAfter + random jitter'],
      ['gate', 'queue', 'admit 800/s; reject overflow'],
      ['queue', 'auth', 'drain at sustainable capacity']
    ],
    [
      ['Healthy baseline', 'Clients are connected and authentication traffic remains below sustainable capacity.', null, [
        {connected:'10,000',retrying:'0'}, {policy:'none',nextWake:'none'}, {permits:'800/s',admitted:'300/s'}, {capacity:'800/s',arrival:'300/s',p99:'90ms'}, {depth:'0',oldest:'0ms'}
      ], 'Normal traffic leaves recovery headroom.', 'Recovery capacity must be reserved before an outage occurs.'],
      ['Shared wake-up', 'A five-second retry timer expires for every disconnected client at once.', ['timers', 'clients', 'wake 10,000 clients at t+5s'], [
        {connected:'0',retrying:'10,000'}, {policy:'fixed 5s',nextWake:'same instant'}, {permits:'800/s',admitted:'300/s'}, {capacity:'800/s',arrival:'300/s',p99:'90ms'}, {depth:'0',oldest:'0ms'}
      ], 'A synchronized retry boundary creates the herd.', 'Independent clients can become one correlated failure source.'],
      ['Dependency overloads', 'The unshaped reconnect burst exceeds authentication capacity by more than twelve times.', ['clients', 'auth', '10,000 Authenticate requests'], [
        {connected:'0',retrying:'10,000'}, {policy:'fixed 5s',nextWake:'same instant'}, {permits:'800/s',admitted:'unbounded'}, {capacity:'800/s',arrival:'10,000 burst',p99:'timeout'}, {depth:'9,200',oldest:'12s'}
      ], 'Latency and timeouts trigger more retries, sustaining collapse.', 'Retries are additional load and must consume a bounded budget.'],
      ['Jitter and admission', 'Clients receive randomized retry times while the gate admits only sustainable work.', ['clients', 'gate', 'retry in 0-20s with token budget'], [
        {connected:'2,400',retrying:'7,600 spread'}, {policy:'full jitter 0-20s',nextWake:'distributed'}, {permits:'800/s',admitted:'800/s'}, {capacity:'800/s',arrival:'800/s',p99:'180ms'}, {depth:'800',oldest:'1s'}
      ], 'The burst becomes a controlled arrival curve.', 'Jitter removes synchronization; admission control protects finite capacity.'],
      ['Fleet recovers', 'The bounded queue drains and clients reconnect without another synchronized wave.', ['queue', 'auth', 'drain 800 retries per second'], [
        {connected:'10,000',retrying:'0'}, {policy:'full jitter',nextWake:'none'}, {permits:'800/s',admitted:'300/s'}, {capacity:'800/s',arrival:'300/s',p99:'95ms'}, {depth:'0',oldest:'0ms'}
      ], 'Service returns to its healthy operating point.', 'A successful recovery keeps offered load below dependency capacity.']
    ]
  );

  add(
    'distributed-messaging-eventing::Kafka-style logs',
    'log',
    'An order producer appends to one replicated partition while a consumer group advances an offset.',
    [
      ['producer', 'Order producer', 'Publishes keyed order events', 8, 28],
      ['leader', 'Partition leader P3', 'Assigns monotonically increasing offsets', 36, 24],
      ['follower', 'Partition follower P3', 'Replicates the ordered log', 68, 24],
      ['consumer', 'Billing consumer', 'Processes records in partition order', 86, 68],
      ['offset', 'Group offset store', 'Persists the next billing position', 44, 88]
    ],
    [
      ['producer', 'leader', 'append OrderPaid key=O7'],
      ['leader', 'follower', 'replicate offset 1052'],
      ['leader', 'consumer', 'fetch offsets 1051-1052'],
      ['consumer', 'offset', 'commit nextOffset 1053']
    ],
    [
      ['Stable partition', 'The replicated log ends at offset 1050 and billing has committed 1051.', null, [
        {sequence:'77',pending:'none'}, {endOffset:'1050',highWatermark:'1050'}, {endOffset:'1050',inSync:'yes'}, {nextFetch:'1051',processedThrough:'1050'}, {group:'billing',nextOffset:'1051'}
      ], 'The consumer resumes from the stored next offset.', 'Ordering is guaranteed within a partition, not across all partitions.'],
      ['Leader appends', 'The producer sends OrderPaid and the leader assigns offset 1051.', ['producer', 'leader', 'append O7 at offset1051'], [
        {sequence:'78',pending:'O7'}, {endOffset:'1051',highWatermark:'1050'}, {endOffset:'1050',inSync:'yes'}, {nextFetch:'1051',processedThrough:'1050'}, {group:'billing',nextOffset:'1051'}
      ], 'The record has a durable position but is not yet committed.', 'Only the partition leader assigns offsets in its epoch.'],
      ['Replication commits', 'The follower copies offsets 1051 and 1052; the high watermark advances.', ['leader', 'follower', 'replicate through offset1052'], [
        {sequence:'79',pending:'none'}, {endOffset:'1052',highWatermark:'1052'}, {endOffset:'1052',inSync:'yes'}, {nextFetch:'1051',processedThrough:'1050'}, {group:'billing',nextOffset:'1051'}
      ], 'Consumers may fetch the committed prefix through 1052.', 'Acknowledgement policy determines how many replicas must persist an append.'],
      ['Consumer processes batch', 'Billing fetches offsets 1051 and 1052 and applies their side effects.', ['leader', 'consumer', 'fetch batch [1051,1052]'], [
        {sequence:'79',pending:'none'}, {endOffset:'1052',highWatermark:'1052'}, {endOffset:'1052',inSync:'yes'}, {nextFetch:'1053',processedThrough:'1052'}, {group:'billing',nextOffset:'1051'}
      ], 'Processing is ahead of the stored group offset.', 'A crash before offset commit may cause replay, so effects must tolerate duplicates.'],
      ['Offset committed', 'Billing commits next offset 1053 after successful processing.', ['consumer', 'offset', 'commit billing P3=1053'], [
        {sequence:'79',pending:'none'}, {endOffset:'1052',highWatermark:'1052'}, {endOffset:'1052',inSync:'yes'}, {nextFetch:'1053',processedThrough:'1052'}, {group:'billing',nextOffset:'1053'}
      ], 'A restart resumes after the processed batch.', 'Retention is independent of consumption; committed offsets are cursors, not deletions.']
    ]
  );

  add(
    'reliability-fault-tolerance::Circuit breakers',
    'capacity',
    'A checkout client opens a circuit after repeated tax-service timeouts and probes recovery.',
    [
      ['client', 'Checkout client', 'Classifies dependency outcomes', 8, 48],
      ['breaker', 'Tax circuit breaker', 'Tracks rolling failures and state', 38, 48],
      ['meter', 'Failure window', 'Counts the last 20 calls', 54, 84],
      ['tax', 'Tax service', 'Dependency experiencing high latency', 84, 26],
      ['clock', 'Probe timer', 'Schedules the half-open trial', 84, 82]
    ],
    [
      ['client', 'breaker', 'request tax quote'],
      ['breaker', 'tax', 'forward while closed'],
      ['tax', 'meter', 'record timeout outcome'],
      ['clock', 'breaker', 'enter half-open after 30s']
    ],
    [
      ['Closed circuit', 'The recent window has one timeout in twenty calls.', null, [
        {request:'quote',result:'pending'}, {state:'closed',openedAt:'none'}, {failures:'1/20',threshold:'10/20'}, {latency:'120ms',health:'degraded'}, {now:'15:00:00',probeAt:'none'}
      ], 'Requests continue to the dependency.', 'Only configured failure classes should count toward opening.'],
      ['Failures accumulate', 'Nine more tax calls time out inside the rolling window.', ['tax', 'meter', 'record timeout 10/20'], [
        {request:'quote',result:'timeout'}, {state:'closed',openedAt:'none'}, {failures:'10/20',threshold:'10/20'}, {latency:'>2s',health:'timing-out'}, {now:'15:00:05',probeAt:'none'}
      ], 'The opening threshold is reached.', 'The window needs enough volume to avoid opening on one isolated failure.'],
      ['Circuit opens', 'The breaker stops forwarding and schedules a probe in thirty seconds.', ['breaker', 'client', 'fail fast circuit-open'], [
        {request:'quote',result:'fallback'}, {state:'open',openedAt:'15:00:05'}, {failures:'10/20',threshold:'10/20'}, {latency:'>2s',health:'timing-out'}, {now:'15:00:06',probeAt:'15:00:35'}
      ], 'Checkout avoids spending capacity on doomed calls.', 'Open circuits fail fast but do not prove the dependency is still unhealthy.'],
      ['Half-open probe', 'At the deadline, exactly one trial request is admitted.', ['clock', 'breaker', 'allow probe at15:00:35'], [
        {request:'probe quote',result:'pending'}, {state:'half-open',probe:'1 in-flight'}, {failures:'10/20',threshold:'10/20'}, {latency:'80ms',health:'recovering'}, {now:'15:00:35',probeAt:'in-flight'}
      ], 'The dependency is tested without releasing the full load.', 'Half-open concurrency must be bounded.'],
      ['Circuit closes', 'The successful probe resets the breaker and normal traffic resumes.', ['tax', 'breaker', 'probe success 80ms'], [
        {request:'quote',result:'tax=4.20'}, {state:'closed',openedAt:'none'}, {failures:'0/20',threshold:'10/20'}, {latency:'80ms',health:'healthy'}, {now:'15:00:36',probeAt:'none'}
      ], 'Recovered capacity is reintroduced deliberately.', 'A failed probe would reopen the circuit and start a new delay.']
    ]
  );

  add(
    'reliability-fault-tolerance::Backpressure',
    'capacity',
    'A streaming pipeline slows producers when the indexing consumer cannot drain its bounded queue.',
    [
      ['producer', 'Event producer', 'Emits records at an adjustable rate', 8, 30],
      ['queue', 'Bounded queue', 'Buffers at most 1000 records', 36, 48],
      ['signal', 'Demand signal', 'Advertises remaining consumer credits', 56, 84],
      ['consumer', 'Indexing consumer', 'Drains records at current capacity', 84, 30],
      ['meter', 'Queue-depth meter', 'Triggers high and low watermarks', 82, 82]
    ],
    [
      ['producer', 'queue', 'enqueue at 400 records/s'],
      ['queue', 'consumer', 'deliver at 250 records/s'],
      ['meter', 'signal', 'reduce credits at depth800'],
      ['signal', 'producer', 'set production rate 200/s']
    ],
    [
      ['Balanced flow', 'Producer and consumer both run at 250 records per second.', null, [
        {rate:'250/s',credits:'500'}, {depth:'200',capacity:'1000'}, {availableCredits:'500',mode:'normal'}, {rate:'250/s',latency:'0.8s'}, {depth:'200',watermark:'low<300 high>800'}
      ], 'Queue depth remains stable.', 'The buffer is bounded; it cannot be the long-term capacity plan.'],
      ['Consumer slows', 'Indexing capacity falls to 100 per second while production remains 250.', ['queue', 'consumer', 'drain only 100/s'], [
        {rate:'250/s',credits:'350'}, {depth:'500',capacity:'1000'}, {availableCredits:'350',mode:'normal'}, {rate:'100/s',latency:'5.0s'}, {depth:'500',watermark:'low<300 high>800'}
      ], 'Queue depth and latency rise.', 'Backpressure should react before the queue is exhausted.'],
      ['High watermark', 'Depth reaches 820 and the meter withdraws most credits.', ['meter', 'signal', 'high watermark depth820'], [
        {rate:'250/s',credits:'30'}, {depth:'820',capacity:'1000'}, {availableCredits:'30',mode:'constrained'}, {rate:'100/s',latency:'8.2s'}, {depth:'820',watermark:'high crossed'}
      ], 'Upstream receives an explicit saturation signal.', 'Pressure must propagate to the producer rather than create unbounded memory growth.'],
      ['Producer slows', 'The producer reduces its rate below consumer recovery capacity.', ['signal', 'producer', 'limit producer to80/s'], [
        {rate:'80/s',credits:'30'}, {depth:'620',capacity:'1000'}, {availableCredits:'30',mode:'constrained'}, {rate:'120/s',latency:'5.2s'}, {depth:'620',watermark:'recovering'}
      ], 'The consumer begins draining the backlog.', 'When slowing is impossible, the system needs explicit rejection, shedding, or durable spillover.'],
      ['Low watermark recovery', 'Depth falls below 300 and credits gradually increase.', ['signal', 'producer', 'raise rate to200/s credits400'], [
        {rate:'200/s',credits:'400'}, {depth:'280',capacity:'1000'}, {availableCredits:'400',mode:'recovering'}, {rate:'220/s',latency:'1.3s'}, {depth:'280',watermark:'low crossed'}
      ], 'Throughput returns without immediately recreating overload.', 'Credit recovery should be gradual enough to avoid oscillation.']
    ]
  );

  add(
    'resilience-patterns::Active-passive',
    'topology',
    'A payments deployment fails over from an active region to a warm passive region using a replicated journal.',
    [
      ['dns', 'Traffic director', 'Routes clients to the promoted region', 50, 8],
      ['active', 'West active region', 'Serves writes before the failure', 14, 48],
      ['journal', 'Payment journal', 'Replicates committed positions cross-region', 50, 52],
      ['passive', 'East passive region', 'Replays state while not serving writes', 86, 48],
      ['monitor', 'Regional health monitor', 'Confirms failure and initiates promotion', 50, 90]
    ],
    [
      ['active', 'journal', 'replicate committed position 540'],
      ['journal', 'passive', 'replay through position 540'],
      ['monitor', 'passive', 'promote east generation 22'],
      ['dns', 'passive', 'route payment traffic to east']
    ],
    [
      ['West active', 'West serves generation 21 while east is warm through journal position 538.', null, [
        {target:'west',ttl:'30s'}, {role:'active',generation:'21',position:'540'}, {westPosition:'540',eastPosition:'538'}, {role:'passive',generation:'21',position:'538'}, {westHealth:'healthy',decision:'none'}
      ], 'Only west accepts payment writes.', 'The passive region must not independently become active without authoritative promotion.'],
      ['Replication catches up', 'East replays journal positions 539 and 540.', ['journal', 'passive', 'apply positions539-540'], [
        {target:'west',ttl:'30s'}, {role:'active',generation:'21',position:'540'}, {westPosition:'540',eastPosition:'540'}, {role:'passive',generation:'21',position:'540'}, {westHealth:'healthy',decision:'none'}
      ], 'The warm standby reaches recovery point zero for this moment.', 'RPO depends on acknowledged cross-region replication, not standby existence alone.'],
      ['West fails', 'The health monitor confirms west is unreachable across independent probes.', ['active', 'monitor', 'three probe failures over45s'], [
        {target:'west',ttl:'30s'}, {role:'unreachable',generation:'21',position:'540'}, {westPosition:'540',eastPosition:'540'}, {role:'passive',generation:'21',position:'540'}, {westHealth:'failed',decision:'promote east'}
      ], 'Traffic remains paused during the failover decision.', 'Promotion criteria must avoid reacting to a single ambiguous network failure.'],
      ['East promoted', 'The control plane grants east generation 22 and enables writes.', ['monitor', 'passive', 'promote generation22'], [
        {target:'east pending',ttl:'30s'}, {role:'fenced',generation:'21',position:'540'}, {westPosition:'540',eastPosition:'540'}, {role:'active',generation:'22',position:'540'}, {westHealth:'failed',decision:'east promoted'}
      ], 'East becomes the sole valid writer.', 'The old active generation must be fenced before or with promotion.'],
      ['Traffic shifts', 'The director routes new payment sessions to east.', ['dns', 'passive', 'publish east endpoint generation22'], [
        {target:'east',ttl:'30s'}, {role:'fenced',generation:'21',position:'540'}, {westPosition:'540',eastPosition:'542'}, {role:'active',generation:'22',position:'542'}, {westHealth:'failed',decision:'complete'}
      ], 'Service resumes in the passive region after bounded downtime.', 'Failback requires reconciliation and is a separate controlled transition.']
    ]
  );

  add(
    'rate-limiting-traffic-management::Token bucket',
    'capacity',
    'An API gateway allows bounded bursts using a bucket of ten tokens refilling at two tokens per second.',
    [
      ['client', 'API client', 'Generates a burst of requests', 8, 46],
      ['bucket', 'Token bucket', 'Stores up to ten admission tokens', 42, 46],
      ['clock', 'Refill clock', 'Adds two tokens per elapsed second', 42, 86],
      ['gateway', 'Admission gate', 'Consumes one token per request', 74, 24],
      ['meter', 'Rate meter', 'Reports admits and rejects', 90, 76]
    ],
    [
      ['clock', 'bucket', 'refill 2 tokens each second'],
      ['client', 'bucket', 'request 8 token withdrawals'],
      ['bucket', 'gateway', 'grant 8 admissions'],
      ['gateway', 'meter', 'record 8 admits 4 rejects']
    ],
    [
      ['Full bucket', 'After idle time, the bucket is capped at ten tokens.', null, [
        {burst:'none',requests:'0'}, {balance:'10',capacity:'10'}, {now:'12.0s',refillRate:'2/s'}, {decision:'idle',cost:'1'}, {admits:'0',rejects:'0'}
      ], 'Ten immediate requests can be absorbed.', 'Refill never raises the balance above capacity.'],
      ['Eight-request burst', 'Eight requests arrive together and reserve eight tokens atomically.', ['client', 'bucket', 'withdraw 8 tokens'], [
        {burst:'8',requests:'8'}, {balance:'2',capacity:'10'}, {now:'12.1s',refillRate:'2/s'}, {decision:'8 admitted',cost:'1'}, {admits:'8',rejects:'0'}
      ], 'The burst passes despite exceeding the steady two-per-second rate.', 'Each admitted unit must decrement the shared balance exactly once.'],
      ['Four more arrive', 'Only two of four requests find tokens; two are rejected.', ['bucket', 'gateway', 'grant 2 deny 2'], [
        {burst:'4',requests:'12'}, {balance:'0',capacity:'10'}, {now:'12.2s',refillRate:'2/s'}, {decision:'2 admitted 2 rejected',cost:'1'}, {admits:'10',rejects:'2'}
      ], 'Burst size is bounded by stored tokens.', 'An empty bucket cannot admit work until refill creates balance.'],
      ['Time refills', 'After 1.5 seconds, three tokens accrue.', ['clock', 'bucket', 'add floor(1.5*2)=3'], [
        {burst:'none',requests:'12'}, {balance:'3',capacity:'10'}, {now:'13.7s',refillRate:'2/s'}, {decision:'idle',cost:'1'}, {admits:'10',rejects:'2'}
      ], 'The limiter recovers according to elapsed time.', 'Refill calculations should use monotonic elapsed time and be atomic with withdrawal.'],
      ['Steady traffic', 'Two requests consume two of the three available tokens.', ['client', 'gateway', 'admit 2 using token balance'], [
        {burst:'2',requests:'14'}, {balance:'1',capacity:'10'}, {now:'13.8s',refillRate:'2/s'}, {decision:'2 admitted',cost:'1'}, {admits:'12',rejects:'2'}
      ], 'The bucket permits steady traffic while retaining one burst token.', 'Distributed buckets require coordinated state or an explicitly approximate allocation scheme.']
    ]
  );

  add(
    'rate-limiting-traffic-management::Sliding window',
    'timeline',
    'An authentication endpoint permits five attempts in the exact trailing ten-second interval.',
    [
      ['client', 'Login client', 'Submits timestamped authentication attempts', 8, 26],
      ['log', 'Attempt timestamp log', 'Stores admitted attempt times', 38, 26],
      ['clock', 'Window clock', 'Defines the trailing ten-second cutoff', 52, 84],
      ['trim', 'Expiry cursor', 'Removes timestamps at or before the cutoff', 72, 48],
      ['gate', 'Login admission gate', 'Compares retained count with limit five', 92, 24]
    ],
    [
      ['client', 'log', 'append attempt at 20.0s'],
      ['clock', 'trim', 'set cutoff now-10s'],
      ['trim', 'log', 'evict timestamps at or before cutoff'],
      ['log', 'gate', 'count retained attempts']
    ],
    [
      ['Four retained attempts', 'At 20.0 seconds, timestamps 11.0, 13.0, 17.0, and 19.0 are inside the window.', null, [
        {attempt:'pending@20.0',result:'none'}, {timestamps:'11.0,13.0,17.0,19.0',count:'4'}, {now:'20.0s',cutoff:'10.0s'}, {expired:'0',cursor:'10.0s'}, {limit:'5/10s',decision:'pending'}
      ], 'One additional attempt can be admitted.', 'Only timestamps greater than the exact cutoff count.'],
      ['Fifth admitted', 'The gate appends the attempt at 20.0 seconds.', ['client', 'log', 'append timestamp20.0'], [
        {attempt:'20.0',result:'admitted'}, {timestamps:'11.0,13.0,17.0,19.0,20.0',count:'5'}, {now:'20.0s',cutoff:'10.0s'}, {expired:'0',cursor:'10.0s'}, {limit:'5/10s',decision:'admit fifth'}
      ], 'The exact trailing window is now full.', 'Check and append must be atomic for one limiter key.'],
      ['Sixth rejected', 'At 20.1 seconds, all five prior timestamps remain in the window.', ['log', 'gate', 'retained count5 equals limit'], [
        {attempt:'20.1',result:'rejected retryAfter0.9s'}, {timestamps:'11.0,13.0,17.0,19.0,20.0',count:'5'}, {now:'20.1s',cutoff:'10.1s'}, {expired:'0',cursor:'10.1s'}, {limit:'5/10s',decision:'reject sixth'}
      ], 'The limiter rejects without recording an admitted timestamp.', 'Rejected attempts are counted only if the product policy explicitly requires it.'],
      ['Oldest expires', 'At 21.1 seconds, timestamp 11.0 is outside the trailing window.', ['trim', 'log', 'evict timestamp11.0'], [
        {attempt:'pending@21.1',result:'none'}, {timestamps:'13.0,17.0,19.0,20.0',count:'4'}, {now:'21.1s',cutoff:'11.1s'}, {expired:'1',cursor:'11.1s'}, {limit:'5/10s',decision:'pending'}
      ], 'Capacity opens exactly when the oldest admitted attempt expires.', 'Boundary semantics must be consistent: this policy retains timestamps strictly newer than the cutoff.'],
      ['Next attempt admitted', 'The 21.1-second attempt is appended as the new fifth record.', ['client', 'log', 'append timestamp21.1'], [
        {attempt:'21.1',result:'admitted'}, {timestamps:'13.0,17.0,19.0,20.0,21.1',count:'5'}, {now:'21.1s',cutoff:'11.1s'}, {expired:'1',cursor:'11.1s'}, {limit:'5/10s',decision:'admit fifth'}
      ], 'The rolling log enforces the exact interval without fixed-window boundary bursts.', 'Exact sliding logs cost memory and ordered timestamp operations proportional to admitted traffic.']
    ]
  );

  add(
    'time-based-distributed-patterns::Heartbeats',
    'topology',
    'A service discovery system uses periodic heartbeats, arrival history, and an active probe before removing an API instance from routing.',
    [
      ['instance', 'API instance', 'Emits identity, epoch, and progress every two seconds', 8, 48],
      ['receiver', 'Heartbeat receiver', 'Accepts and timestamps liveness reports', 28, 48],
      ['arrivals', 'Liveness state store', 'Persists last-seen time and consecutive misses', 48, 18],
      ['detector', 'Failure detector', 'Computes suspicion from elapsed time and miss threshold', 48, 78],
      ['probe', 'Active probe worker', 'Checks whether the process is reachable', 70, 78],
      ['registry', 'Service registry', 'Publishes healthy instances to request routers', 70, 18],
      ['router', 'Request router', 'Stops selecting instances removed from membership', 92, 48]
    ],
    [
      ['instance', 'receiver', 'heartbeat instance-7 epoch 12 progress 431'],
      ['receiver', 'arrivals', 'record last seen at 10:00:04'],
      ['arrivals', 'detector', 'evaluate elapsed time and missed intervals'],
      ['detector', 'probe', 'probe instance-7 after three misses'],
      ['probe', 'registry', 'remove instance-7 after probe timeout'],
      ['registry', 'router', 'publish membership epoch 88 without instance-7'],
      ['instance', 'receiver', 'resume with newer process epoch 13']
    ],
    [
      ['Healthy baseline', 'Instance 7 reports every two seconds and remains eligible for requests.', ['instance', 'receiver', 'heartbeat at 10:00:04'], [
        {processEpoch:'12',progress:'431',nextHeartbeat:'10:00:06'},
        {lastAccepted:'10:00:04',queueDepth:'0'},
        {lastSeen:'10:00:04',misses:'0'},
        {status:'healthy',elapsed:'0s'},
        {status:'idle',attempts:'0'},
        {membershipEpoch:'87',instance7:'healthy'},
        {membershipEpoch:'87',routeTo7:'enabled'}
      ], 'A recent heartbeat is evidence that the process was alive when it sent the report.', 'A heartbeat proves recent progress, not future availability.'],
      ['First interval missed', 'No report arrives at 10:00:06, so the detector records delay without changing membership.', ['arrivals', 'detector', 'one interval late'], [
        {processEpoch:'12',progress:'431',nextHeartbeat:'late'},
        {lastAccepted:'10:00:04',queueDepth:'0'},
        {lastSeen:'10:00:04',misses:'1'},
        {status:'healthy',elapsed:'2s'},
        {status:'idle',attempts:'0'},
        {membershipEpoch:'87',instance7:'healthy'},
        {membershipEpoch:'87',routeTo7:'enabled'}
      ], 'The service remains routable during the configured grace period.', 'One late heartbeat is not proof of failure in an asynchronous network.'],
      ['Suspicion threshold reached', 'Three intervals pass without a heartbeat, so the detector marks the instance suspect.', ['detector', 'probe', 'start active probe at 10:00:10'], [
        {processEpoch:'12',progress:'431',nextHeartbeat:'missing'},
        {lastAccepted:'10:00:04',queueDepth:'0'},
        {lastSeen:'10:00:04',misses:'3'},
        {status:'suspect',elapsed:'6s'},
        {status:'probing',attempts:'1'},
        {membershipEpoch:'87',instance7:'healthy'},
        {membershipEpoch:'87',routeTo7:'enabled'}
      ], 'Suspicion triggers corroboration before the control plane removes capacity.', 'Detection thresholds trade recovery speed for false-positive risk.'],
      ['Probe also times out', 'The active probe cannot reach instance 7 before its deadline.', ['probe', 'registry', 'declare unreachable for epoch 12'], [
        {processEpoch:'12',progress:'431',nextHeartbeat:'missing'},
        {lastAccepted:'10:00:04',queueDepth:'0'},
        {lastSeen:'10:00:04',misses:'3'},
        {status:'unreachable',elapsed:'7s'},
        {status:'timed out',attempts:'2'},
        {membershipEpoch:'88 pending',instance7:'remove'},
        {membershipEpoch:'87',routeTo7:'enabled'}
      ], 'Missing passive evidence is corroborated by a failed active check.', 'Failure detectors produce suspicion; they cannot prove why a process is unreachable.'],
      ['Membership and routing update', 'The registry publishes epoch 88 and routers stop sending new requests to instance 7.', ['registry', 'router', 'membership epoch 88'], [
        {processEpoch:'12',progress:'431',nextHeartbeat:'missing'},
        {lastAccepted:'10:00:04',queueDepth:'0'},
        {lastSeen:'10:00:04',misses:'3'},
        {status:'unreachable',elapsed:'8s'},
        {status:'complete',attempts:'2'},
        {membershipEpoch:'88',instance7:'removed'},
        {membershipEpoch:'88',routeTo7:'disabled'}
      ], 'New traffic avoids the suspected instance.', 'Routers consume a versioned membership update rather than infer health independently.'],
      ['Restart rejoins safely', 'The process restarts with epoch 13, proves readiness, and is admitted as a new incarnation.', ['instance', 'receiver', 'heartbeat epoch 13 progress 0 ready'], [
        {processEpoch:'13',progress:'0',nextHeartbeat:'10:00:16'},
        {lastAccepted:'10:00:14',queueDepth:'0'},
        {lastSeen:'10:00:14',misses:'0'},
        {status:'healthy-new-epoch',elapsed:'0s'},
        {status:'idle',attempts:'0'},
        {membershipEpoch:'89',instance7:'healthy epoch13'},
        {membershipEpoch:'89',routeTo7:'enabled'}
      ], 'The replacement incarnation rejoins without reviving stale epoch-12 authority.', 'Process epochs prevent delayed heartbeats from restoring stale membership.']
    ]
  );

  add(
    'partitioning-sharding::Hash partitioning',
    'topology',
    'A router computes hash(key) modulo the shard count and migrates changed owners during a three-to-four shard resize.',
    [
      ['keys', 'Partition-key probes', 'Carries account42, order9, user8, and cart17', 8, 48],
      ['hash', 'Stable hash function', 'Maps each key to an unsigned integer', 28, 14],
      ['map', 'Modulo partition map', 'Computes hash modulo N under a routing epoch', 46, 50],
      ['s0', 'Shard 0', 'Owns remainders equal to zero', 66, 10],
      ['s1', 'Shard 1', 'Owns remainders equal to one', 88, 30],
      ['s2', 'Shard 2', 'Owns remainders equal to two', 84, 74],
      ['s3', 'Shard 3', 'New owner for remainder three', 60, 90]
    ],
    [
      ['keys', 'hash', 'compute deterministic key hash'],
      ['hash', 'map', 'apply hash mod active shard count'],
      ['map', 's0', 'route remainder 0'],
      ['map', 's1', 'route remainder 1'],
      ['map', 's2', 'route remainder 2'],
      ['map', 's3', 'route remainder 3 after resize']
    ],
    [
      ['Three-shard map routes deterministic hashes', 'The router hashes account42=14, order9=7, user8=8, and cart17=17 under N=3.', ['hash', 'map', 'map [14,7,8,17] mod 3 → [2,1,2,2]'], [
        {hashes:'account42=14,order9=7,user8=8,cart17=17',lookup:'account42'}, {algorithm:'H64-v4',output:'14,7,8,17'}, {epoch:'12',N:'3',owners:'2,1,2,2'}, {rangeRule:'h%3=0',keys:'none'}, {rangeRule:'h%3=1',keys:'order9'}, {rangeRule:'h%3=2',keys:'account42,user8,cart17'}, {rangeRule:'inactive',keys:'none'}
      ], 'Every router selects the same owners without a range directory per key.', 'The hash function, shard count, and routing epoch must match across routers.'],
      ['Writes land on computed owners', 'The router stores order9 on S1 and the three remainder-two keys on S2.', ['map', 's2', 'write account42,user8,cart17 under epoch12'], [
        {hashes:'14,7,8,17',lookup:'all four stored'}, {algorithm:'H64-v4',output:'stable'}, {epoch:'12',N:'3',writes:'4 committed'}, {rangeRule:'h%3=0',rows:'0 probe rows'}, {rangeRule:'h%3=1',rows:'order9@v1'}, {rangeRule:'h%3=2',rows:'account42,user8,cart17@v1'}, {rangeRule:'inactive',rows:'0'}
      ], 'Placement follows the remainder rather than key ranges or load.', 'A write has exactly one authoritative remainder owner in epoch 12.'],
      ['Adding a shard changes the modulo map', 'A planned N=4 map recalculates owners as [2,3,0,1], moving three of the four probe keys.', ['hash', 'map', 'plan epoch13: [14,7,8,17] mod 4 → [2,3,0,1]'], [
        {hashes:'14,7,8,17',lookup:'resize plan'}, {algorithm:'H64-v4',output:'unchanged hashes'}, {epoch:'12 active / 13 planned',N:'3→4',moves:'order9,user8,cart17'}, {rangeRule:'h%4=0 planned',incoming:'user8 from S2'}, {rangeRule:'h%4=1 planned',incoming:'cart17 from S2',outgoing:'order9'}, {rangeRule:'h%4=2 planned',retains:'account42',outgoing:'user8,cart17'}, {rangeRule:'h%4=3 planned',incoming:'order9 from S1'}
      ], 'Changing N remaps keys even though their hashes are stable.', 'Modulo resizing can move roughly (N-1)/N keys and therefore requires an explicit migration phase.'],
      ['Changed keys copy under dual epochs', 'The controller copies each remapped row to its epoch-13 owner while epoch 12 remains authoritative.', ['map', 's3', 'copy order9→S3; user8→S0; cart17→S1'], [
        {hashes:'14,7,8,17',lookup:'reads still epoch12'}, {algorithm:'H64-v4',output:'stable'}, {epoch:'12 active / 13 shadow',N:'3 and 4',moves:'3 copied, delta log active'}, {rangeRule:'h%4=0 shadow',rows:'user8@v1'}, {rangeRule:'h%4=1 shadow',rows:'order9 old,cart17@v1 shadow'}, {rangeRule:'h%4=2 active',rows:'account42,user8,cart17@v1'}, {rangeRule:'h%4=3 shadow',rows:'order9@v1'}
      ], 'New owners are populated without exposing a partially migrated map.', 'The old epoch remains authoritative until copies and concurrent-write deltas are complete.'],
      ['Epoch 13 becomes authoritative', 'After checksums and deltas match, routers atomically switch to N=4 and old owners fence moved keys.', ['map', 's0', 'publish epoch13 N=4 and fence epoch12 moves'], [
        {hashes:'14,7,8,17',lookup:'owners S2,S3,S0,S1'}, {algorithm:'H64-v4',output:'stable'}, {epoch:'13',N:'4',owners:'2,3,0,1'}, {rangeRule:'h%4=0',rows:'user8@v1 authoritative'}, {rangeRule:'h%4=1',rows:'cart17@v1 authoritative'}, {rangeRule:'h%4=2',rows:'account42@v1 authoritative'}, {rangeRule:'h%4=3',rows:'order9@v1 authoritative'}
      ], 'All requests now use the four-way modulo map.', 'An atomic epoch cutover prevents two shards from accepting authoritative writes for one key.']
    ]
  );

  add(
    'partitioning-sharding::Virtual nodes',
    'topology',
    'Physical cache nodes own multiple ring tokens so a joining node takes several small intervals instead of one large range.',
    [
      ['router', 'Ring directory', 'Publishes sorted token ownership by membership epoch', 50, 48],
      ['keys', 'Key probes', 'Hashes invoice55 to 55 and invoice75 to 75', 8, 52],
      ['a10', 'VNode A:10', 'Physical node A token at 10', 48, 6],
      ['a70', 'VNode A:70', 'Physical node A token at 70', 88, 58],
      ['b30', 'VNode B:30', 'Physical node B token at 30', 78, 16],
      ['b90', 'VNode B:90', 'Physical node B token at 90', 42, 94],
      ['c20', 'VNode C:20', 'Joining physical node C token at 20', 20, 18],
      ['c60', 'VNode C:60', 'Joining physical node C token at 60', 18, 84]
    ],
    [
      ['keys', 'router', 'clockwise lookup from key hash'],
      ['router', 'a10', 'route interval (90,10] to physical A'],
      ['router', 'b30', 'route interval (10,30] to physical B'],
      ['router', 'a70', 'route interval (30,70] to physical A'],
      ['router', 'b90', 'route interval (70,90] to physical B'],
      ['b30', 'c20', 'transfer split interval (10,20]'],
      ['a70', 'c60', 'transfer split interval (30,60]']
    ],
    [
      ['Two nodes publish four virtual tokens', 'Epoch 5 sorts A:10, B:30, A:70, B:90 around the ring, giving each physical node two disjoint intervals.', ['router', 'a10', 'publish epoch5 tokens [A10,B30,A70,B90]'], [
        {epoch:'5',tokens:'10:A,30:B,70:A,90:B'}, {hashes:'invoice55=55,invoice75=75',owners:'pending'}, {interval:'(90,10]',physical:'A',status:'active'}, {interval:'(30,70]',physical:'A',status:'active'}, {interval:'(10,30]',physical:'B',status:'active'}, {interval:'(70,90]',physical:'B',status:'active'}, {interval:'none',physical:'C',status:'inactive'}, {interval:'none',physical:'C',status:'inactive'}
      ], 'Token ownership alternates across the ring instead of assigning one contiguous half to each machine.', 'A key belongs to the first virtual token clockwise from its hash.'],
      ['Clockwise lookups select virtual owners', 'Hash 55 walks to A:70, while hash 75 walks to B:90.', ['keys', 'router', 'lookup 55→A70 and 75→B90'], [
        {epoch:'5',tokens:'10:A,30:B,70:A,90:B',lookups:'55→70,75→90'}, {hashes:'55,75',owners:'A via A70; B via B90'}, {interval:'(90,10]',physical:'A',keys:'120'}, {interval:'(30,70]',physical:'A',keys:'390 incl 55'}, {interval:'(10,30]',physical:'B',keys:'205'}, {interval:'(70,90]',physical:'B',keys:'210 incl 75'}, {interval:'none',physical:'C',status:'inactive'}, {interval:'none',physical:'C',status:'inactive'}
      ], 'Routers return physical owners through their virtual-token entries.', 'All virtual tokens for one physical node share its failure domain even though their ranges are separate.'],
      ['Node C stages two virtual tokens', 'C inserts tokens 20 and 60, splitting B:30 and A:70 while unrelated intervals remain unchanged.', ['router', 'c60', 'stage epoch6 tokens C20 and C60'], [
        {epoch:'5 active / 6 staged',tokens:'10:A,20:C,30:B,60:C,70:A,90:B'}, {hashes:'55,75',owners:'55 moving to C60;75 stays B90'}, {interval:'(90,10]',physical:'A',status:'unchanged'}, {interval:'(60,70]',physical:'A',status:'split pending'}, {interval:'(20,30]',physical:'B',status:'split pending'}, {interval:'(70,90]',physical:'B',status:'unchanged'}, {interval:'(10,20]',physical:'C',status:'staged'}, {interval:'(30,60]',physical:'C',status:'staged'}
      ], 'One physical join claims multiple bounded portions of the ring.', 'Adding virtual tokens changes only each token’s successor interval.'],
      ['Successors transfer split intervals', 'B:30 streams keys in (10,20] to C:20 and A:70 streams keys in (30,60] to C:60.', ['a70', 'c60', 'transfer (30,60]; B30 transfers (10,20]'], [
        {epoch:'5 active / 6 staged',tokens:'six',migration:'2 ranges copying'}, {hashes:'55,75',owners:'reads use epoch5'}, {interval:'(90,10]',physical:'A',keys:'120'}, {interval:'(60,70]',physical:'A',keys:'95',outgoing:'295 copied'}, {interval:'(20,30]',physical:'B',keys:'102',outgoing:'103 copied'}, {interval:'(70,90]',physical:'B',keys:'210 incl 75'}, {interval:'(10,20]',physical:'C',keys:'103 shadow'}, {interval:'(30,60]',physical:'C',keys:'295 shadow incl 55'}
      ], 'C receives load from two different physical-node intervals.', 'A staged vnode cannot serve authoritative writes until its copied range and deltas are complete.'],
      ['Epoch 6 activates all virtual owners', 'The directory publishes the six-token ring; hash 55 moves to C:60 while hash 75 remains on B:90.', ['router', 'c20', 'activate epoch6 after range checksums match'], [
        {epoch:'6',tokens:'10:A,20:C,30:B,60:C,70:A,90:B'}, {hashes:'55,75',owners:'C via C60; B via B90'}, {interval:'(90,10]',physical:'A',keys:'120'}, {interval:'(60,70]',physical:'A',keys:'95'}, {interval:'(20,30]',physical:'B',keys:'102'}, {interval:'(70,90]',physical:'B',keys:'210 incl 75'}, {interval:'(10,20]',physical:'C',keys:'103'}, {interval:'(30,60]',physical:'C',keys:'295 incl 55'}
      ], 'Only keys in the two claimed intervals move, and C receives two samples of ring load.', 'Virtual-node count and placement control balance; more tokens smooth variance but enlarge routing metadata.']
    ]
  );

  add(
    'consensus-coordination::Quorum consensus',
    'replicas',
    'Two proposers use intersecting majorities of five acceptors, forcing a later ballot to preserve the chosen value.',
    [
      ['p1', 'Proposer P1', 'Runs ballot 7 for value blue', 8, 20],
      ['p2', 'Proposer P2', 'Runs later ballot 8 initially preferring red', 8, 82],
      ['a', 'Acceptor A', 'Persists promised ballot and accepted pair', 42, 10],
      ['b', 'Acceptor B', 'Persists promised ballot and accepted pair', 62, 22],
      ['c', 'Acceptor C', 'Intersects both three-node quorums', 76, 50],
      ['d', 'Acceptor D', 'Persists promised ballot and accepted pair', 62, 80],
      ['e', 'Acceptor E', 'Persists promised ballot and accepted pair', 42, 92]
    ],
    [
      ['p1', 'a', 'prepare/accept ballot 7'],
      ['p1', 'b', 'prepare/accept ballot 7'],
      ['p1', 'c', 'prepare/accept ballot 7'],
      ['p2', 'c', 'prepare/accept ballot 8'],
      ['p2', 'd', 'prepare/accept ballot 8'],
      ['p2', 'e', 'prepare/accept ballot 8']
    ],
    [
      ['P1 obtains promises', 'A, B, and C persist promises for ballot 7 and report no prior accepted value.', ['p1', 'c', 'prepare b7 reaches quorum A,B,C'], [
        {ballot:'7',candidate:'blue',phase:'prepare quorum'}, {ballot:'none',candidate:'red',phase:'idle'}, {promised:'7',accepted:'none'}, {promised:'7',accepted:'none'}, {promised:'7',accepted:'none'}, {promised:'0',accepted:'none'}, {promised:'0',accepted:'none'}
      ], 'P1 may enter the accept phase with blue.', 'An acceptor rejects ballots lower than its durable promised ballot.'],
      ['Blue is chosen by a majority', 'A, B, and C accept blue at ballot 7, forming a three-of-five quorum.', ['p1', 'a', 'accept blue@7 on A,B,C'], [
        {ballot:'7',candidate:'blue',phase:'chosen by ABC'}, {ballot:'none',candidate:'red',phase:'idle'}, {promised:'7',accepted:'blue@7'}, {promised:'7',accepted:'blue@7'}, {promised:'7',accepted:'blue@7'}, {promised:'0',accepted:'none'}, {promised:'0',accepted:'none'}
      ], 'Blue has been chosen even if P1 fails before announcing it.', 'A value is chosen only after one quorum accepts the same ballot-value pair.'],
      ['P2 preempts with ballot 8', 'P2 prepares C, D, and E; all promise ballot 8, and intersecting acceptor C reports blue@7.', ['p2', 'c', 'prepare b8 quorum C,D,E'], [
        {ballot:'7',candidate:'blue',phase:'chosen'}, {ballot:'8',candidate:'red',phase:'collecting promises'}, {promised:'7',accepted:'blue@7'}, {promised:'7',accepted:'blue@7'}, {promised:'8',accepted:'blue@7'}, {promised:'8',accepted:'none'}, {promised:'8',accepted:'none'}
      ], 'The new quorum discovers the previously accepted chosen value.', 'Any two majorities intersect in at least one acceptor.'],
      ['Later proposer adopts blue', 'The phase-one rule replaces P2’s red preference with the value from the highest accepted ballot it observed.', ['c', 'p2', 'return highest accepted blue@7; adopt blue'], [
        {ballot:'7',candidate:'blue',phase:'chosen'}, {ballot:'8',candidate:'blue',phase:'value adopted'}, {promised:'7',accepted:'blue@7'}, {promised:'7',accepted:'blue@7'}, {promised:'8',accepted:'blue@7'}, {promised:'8',accepted:'none'}, {promised:'8',accepted:'none'}
      ], 'Ballot 8 is constrained to propose blue rather than red.', 'A proposer with promises must use the value from the highest accepted ballot returned, if any.'],
      ['Second quorum confirms the same value', 'C, D, and E accept blue at ballot 8, creating a different quorum without changing the decision.', ['p2', 'e', 'accept blue@8 on C,D,E'], [
        {ballot:'7',candidate:'blue',phase:'chosen ABC'}, {ballot:'8',candidate:'blue',phase:'chosen CDE'}, {promised:'7',accepted:'blue@7'}, {promised:'7',accepted:'blue@7'}, {promised:'8',accepted:'blue@8'}, {promised:'8',accepted:'blue@8'}, {promised:'8',accepted:'blue@8'}
      ], 'Both successful quorums choose blue across leadership change.', 'No two quorums can choose different values for the same consensus instance.']
    ]
  );

  add(
    'consensus-coordination::Compare-and-swap',
    'timeline',
    'Two workers decrement one versioned balance using a hardware-style atomic compare-and-swap loop.',
    [
      ['a', 'Worker A', 'Attempts to subtract ten using an expected snapshot', 8, 18],
      ['b', 'Worker B', 'Attempts to subtract twenty concurrently', 8, 82],
      ['register', 'Atomic balance word', 'Stores balance and version as one comparable value', 48, 50],
      ['cas', 'CAS primitive', 'Atomically compares expected word and installs replacement', 72, 18],
      ['audit', 'Successful-update ledger', 'Records only committed version transitions', 90, 76]
    ],
    [
      ['a', 'register', 'load atomic word'],
      ['b', 'register', 'load atomic word'],
      ['a', 'cas', 'CAS(expected,replacement)'],
      ['b', 'cas', 'CAS(expected,replacement)'],
      ['cas', 'register', 'single atomic compare and conditional write'],
      ['register', 'audit', 'append successful transition']
    ],
    [
      ['A loads version 12', 'A reads the indivisible word balance 100, version 12 and computes replacement 90,13.', ['register', 'a', 'load (100,v12)'], [
        {expected:'(100,v12)',replacement:'(90,v13)',result:'pending'}, {expected:'none',replacement:'none',result:'idle'}, {word:'(100,v12)',lastWriter:'seed'}, {operation:'none',comparison:'none'}, {entries:'seed (100,v12)',successes:'0'}
      ], 'A’s calculation is tied to the exact observed version.', 'The expected value must include every field whose change invalidates the update.'],
      ['B loads the same version', 'Before A swaps, B reads version 12 and computes replacement 80,13.', ['register', 'b', 'load (100,v12)'], [
        {expected:'(100,v12)',replacement:'(90,v13)',result:'pending'}, {expected:'(100,v12)',replacement:'(80,v13)',result:'pending'}, {word:'(100,v12)',lastWriter:'seed'}, {operation:'none',comparison:'none'}, {entries:'seed (100,v12)',successes:'0'}
      ], 'Both workers optimistically prepare from one snapshot.', 'A load does not reserve the register or exclude competing writers.'],
      ['B wins the atomic swap', 'B’s expected word equals the current word, so CAS installs balance 80 at version 13.', ['b', 'cas', 'CAS (100,v12)→(80,v13) succeeds'], [
        {expected:'(100,v12)',replacement:'(90,v13)',result:'pending'}, {expected:'(100,v12)',replacement:'(80,v13)',result:'success'}, {word:'(80,v13)',lastWriter:'B'}, {operation:'B CAS',comparison:'equal',swapped:'yes'}, {entries:'v12→v13 by B, delta -20',successes:'1'}
      ], 'B commits without locking A.', 'Comparison and replacement occur as one indivisible operation.'],
      ['A stale swap fails', 'A compares expected version 12 against current version 13; CAS returns failure and writes nothing.', ['a', 'cas', 'CAS (100,v12)→(90,v13) fails'], [
        {expected:'(100,v12)',replacement:'(90,v13)',result:'failed current=(80,v13)'}, {expected:'(100,v12)',replacement:'(80,v13)',result:'success'}, {word:'(80,v13)',lastWriter:'B'}, {operation:'A CAS',comparison:'not equal',swapped:'no'}, {entries:'v12→v13 by B, delta -20',successes:'1'}
      ], 'The lost-update race is detected instead of overwriting B.', 'A failed CAS leaves the shared word bit-for-bit unchanged.'],
      ['A reloads and retries', 'A reads version 13, recomputes from balance 80, and successfully installs balance 70 at version 14.', ['a', 'cas', 'reload then CAS (80,v13)→(70,v14)'], [
        {expected:'(80,v13)',replacement:'(70,v14)',result:'success on retry'}, {expected:'(100,v12)',replacement:'(80,v13)',result:'success'}, {word:'(70,v14)',lastWriter:'A'}, {operation:'A retry CAS',comparison:'equal',swapped:'yes'}, {entries:'v12→v13 by B; v13→v14 by A',successes:'2'}
      ], 'Both decrements are serialized as 100 to 80 to 70.', 'Retry logic must recompute from the newly loaded value, not reuse a stale replacement.']
    ]
  );

  add(
    'replication::Version vectors',
    'replicas',
    'Two writable replicas detect concurrent document edits with version-vector dominance and retain siblings until resolution.',
    [
      ['a', 'Replica A', 'Stores document value and vector {A,B}', 8, 20],
      ['b', 'Replica B', 'Stores document value and vector {A,B}', 8, 82],
      ['wire', 'Anti-entropy channel', 'Exchanges values with their complete vectors', 38, 48],
      ['compare', 'Vector comparator', 'Tests dominance or incomparability component-wise', 60, 18],
      ['siblings', 'Sibling set', 'Retains concurrent versions instead of dropping one', 78, 76],
      ['reader', 'Conflict resolver', 'Merges siblings and writes a causally newer value', 94, 34]
    ],
    [
      ['a', 'wire', 'replicate red with vector {1,0}'],
      ['b', 'wire', 'replicate blue with vector {0,1}'],
      ['wire', 'compare', 'compare every vector component'],
      ['compare', 'siblings', 'retain incomparable values'],
      ['siblings', 'reader', 'return all live siblings'],
      ['reader', 'a', 'write merged value after join-and-increment']
    ],
    [
      ['A writes independently', 'A changes the document to red and increments only its own component from {0,0} to {1,0}.', ['a', 'wire', 'publish red@{A:1,B:0}'], [
        {value:'red',vector:'{A:1,B:0}',versions:'1'}, {value:'base',vector:'{A:0,B:0}',versions:'1'}, {inFlight:'red@{1,0}',delivered:'none'}, {left:'none',right:'none',relation:'pending'}, {members:'{}',status:'empty'}, {observed:'none',resolution:'none'}
      ], 'A’s version causally descends from the common base.', 'A local write increments A and preserves every observed remote component.'],
      ['B writes concurrently', 'Without seeing A, B changes the document to blue and increments {0,0} to {0,1}.', ['b', 'wire', 'publish blue@{A:0,B:1}'], [
        {value:'red',vector:'{A:1,B:0}',versions:'1'}, {value:'blue',vector:'{A:0,B:1}',versions:'1'}, {inFlight:'red@{1,0},blue@{0,1}',delivered:'none'}, {left:'none',right:'none',relation:'pending'}, {members:'{}',status:'empty'}, {observed:'none',resolution:'none'}
      ], 'Neither edit contains the other in its causal history.', 'Independent writers cannot infer an order from wall-clock arrival time.'],
      ['Vectors compare as concurrent', 'Anti-entropy presents {1,0} and {0,1}; each is greater in one component and smaller in another.', ['wire', 'compare', 'compare {1,0} versus {0,1}'], [
        {value:'red',vector:'{A:1,B:0}',versions:'2 siblings'}, {value:'blue',vector:'{A:0,B:1}',versions:'2 siblings'}, {inFlight:'none',delivered:'both replicas'}, {left:'{1,0}',right:'{0,1}',relation:'incomparable'}, {members:'{red@{1,0},blue@{0,1}}',status:'conflict'}, {observed:'red and blue',resolution:'needed'}
      ], 'Both replicas retain two siblings rather than apply last arrival wins.', 'Vector x dominates y only when every component is at least y and one component is greater.'],
      ['Resolver joins causal histories', 'A reader merges the content to purple, joins vectors to {1,1}, then writes at A by incrementing A to {2,1}.', ['reader', 'a', 'write purple@join({1,0},{0,1}) then A++'], [
        {value:'purple',vector:'{A:2,B:1}',versions:'1 resolved'}, {value:'red|blue',vector:'{1,0}|{0,1}',versions:'2 siblings'}, {inFlight:'purple@{2,1}',delivered:'A only'}, {left:'{2,1}',right:'siblings',relation:'dominates both'}, {members:'{red@{1,0},blue@{0,1}}',status:'superseded pending sync'}, {observed:'red and blue',resolution:'purple'}
      ], 'The resolution explicitly descends from both concurrent edits.', 'A resolving write must join all sibling vectors before incrementing its writer component.'],
      ['Dominating resolution prunes siblings', 'B receives purple {2,1}; the comparator proves it dominates {1,0} and {0,1}, so both old siblings are removed.', ['wire', 'b', 'replicate purple@{2,1}; prune dominated siblings'], [
        {value:'purple',vector:'{A:2,B:1}',versions:'1'}, {value:'purple',vector:'{A:2,B:1}',versions:'1'}, {inFlight:'none',delivered:'purple to B'}, {left:'{2,1}',right:'{1,0},{0,1}',relation:'dominates'}, {members:'{}',status:'conflict resolved'}, {observed:'purple@{2,1}',resolution:'complete'}
      ], 'Both replicas converge without erasing an unobserved concurrent update.', 'Only a dominating vector may replace all versions it causally includes.']
    ]
  );

  add(
    'replication::CRDTs',
    'replicas',
    'Two replicas implement an observed-remove set where unique add tags and tombstones merge by set union.',
    [
      ['aAdds', 'Replica A add-set', 'Stores element-tag pairs created or learned by A', 8, 18],
      ['aRemoves', 'Replica A tombstones', 'Stores tags A has observed and removed', 24, 78],
      ['bAdds', 'Replica B add-set', 'Stores element-tag pairs created or learned by B', 58, 16],
      ['bRemoves', 'Replica B tombstones', 'Stores tags B has observed and removed', 72, 78],
      ['merge', 'State merge', 'Computes component-wise set union', 50, 50],
      ['view', 'Materialized OR-Set view', 'Shows an element when any add tag lacks a tombstone', 94, 46]
    ],
    [
      ['aAdds', 'merge', 'send A add tags'],
      ['aRemoves', 'merge', 'send A tombstones'],
      ['bAdds', 'merge', 'send B add tags'],
      ['bRemoves', 'merge', 'send B tombstones'],
      ['merge', 'aAdds', 'union merged add-set into A'],
      ['merge', 'bAdds', 'union merged add-set into B'],
      ['merge', 'view', 'materialize adds minus tombstoned tags']
    ],
    [
      ['A adds milk with a unique tag', 'A creates tag a1, so milk is present because a1 is not tombstoned.', ['view', 'aAdds', 'add (milk,a1)'], [
        {pairs:'{milk:a1}',cardinality:'1'}, {tags:'{}',cardinality:'0'}, {pairs:'{}',cardinality:'0'}, {tags:'{}',cardinality:'0'}, {lastJoin:'none',status:'divergent'}, {aView:'{milk}',bView:'{}',liveTags:'a1'}
      ], 'The add is locally visible without coordinating with B.', 'Every add uses a globally unique tag so concurrent instances remain distinguishable.'],
      ['B concurrently adds the same element', 'B has not seen a1 and independently creates tag b1 for milk.', ['view', 'bAdds', 'add (milk,b1)'], [
        {pairs:'{milk:a1}',cardinality:'1'}, {tags:'{}',cardinality:'0'}, {pairs:'{milk:b1}',cardinality:'1'}, {tags:'{}',cardinality:'0'}, {lastJoin:'none',status:'divergent'}, {aView:'{milk}',bView:'{milk}',liveTags:'a1|b1 local'}
      ], 'Both replicas contain milk through different causal adds.', 'Concurrent adds do not overwrite or deduplicate each other’s tags.'],
      ['A removes only what it observed', 'A removes milk by tombstoning its known tag a1; it cannot remove unseen b1.', ['aAdds', 'aRemoves', 'remove milk: tombstone observed tag a1'], [
        {pairs:'{milk:a1}',cardinality:'1'}, {tags:'{a1}',cardinality:'1'}, {pairs:'{milk:b1}',cardinality:'1'}, {tags:'{}',cardinality:'0'}, {lastJoin:'none',status:'divergent'}, {aView:'{}',bView:'{milk}',liveTags:'b1 remote'}
      ], 'A’s local view is empty while B’s concurrent add remains live.', 'Remove records exactly the add tags visible in its causal context.'],
      ['Union merge preserves concurrent add', 'The replicas union add-sets and tombstones: adds become {a1,b1}, removes contain only a1.', ['merge', 'view', 'union adds and tombstones at both replicas'], [
        {pairs:'{milk:a1,milk:b1}',cardinality:'2'}, {tags:'{a1}',cardinality:'1'}, {pairs:'{milk:a1,milk:b1}',cardinality:'2'}, {tags:'{a1}',cardinality:'1'}, {lastJoin:'adds={a1,b1}; removes={a1}',status:'converged'}, {aView:'{milk}',bView:'{milk}',liveTags:'b1'}
      ], 'Milk remains present because concurrent tag b1 was not observed by A’s remove.', 'Merge is associative, commutative, and idempotent set union.'],
      ['B removes the now-observed live tag', 'After convergence B removes milk and tombstones b1 in addition to retained a1.', ['bAdds', 'bRemoves', 'remove milk: tombstone live tag b1'], [
        {pairs:'{milk:a1,milk:b1}',cardinality:'2'}, {tags:'{a1}',cardinality:'1'}, {pairs:'{milk:a1,milk:b1}',cardinality:'2'}, {tags:'{a1,b1}',cardinality:'2'}, {lastJoin:'pending B tombstone',status:'divergent'}, {aView:'{milk}',bView:'{}',liveTags:'none at B'}
      ], 'B can remove the concurrent add only after observing its tag.', 'A remove cannot erase an add outside the remover’s observed context.'],
      ['Tombstone merge converges to empty', 'Unioning B’s tombstones gives both replicas removes {a1,b1}; no live add tag remains.', ['merge', 'view', 'union tombstones {a1,b1} to both replicas'], [
        {pairs:'{milk:a1,milk:b1}',cardinality:'2'}, {tags:'{a1,b1}',cardinality:'2'}, {pairs:'{milk:a1,milk:b1}',cardinality:'2'}, {tags:'{a1,b1}',cardinality:'2'}, {lastJoin:'adds={a1,b1}; removes={a1,b1}',status:'converged'}, {aView:'{}',bView:'{}',liveTags:'none'}
      ], 'Both replicas deterministically materialize the empty set.', 'Tombstones require causal garbage collection; deleting them before all replicas observe them can resurrect removed tags.']
    ]
  );

  add(
    'distributed-systems-fundamentals::Hybrid logical clocks',
    'timeline',
    'Two database nodes preserve causality with (physical, logical) timestamps despite clock skew and regression.',
    [
      ['aClock', 'Node A wall clock', 'Provides a fallible physical millisecond reading', 8, 14],
      ['a', 'Node A HLC', 'Stores A tuple (physical, logical)', 28, 58],
      ['wire', 'Replication message', 'Carries the sender HLC tuple', 50, 26],
      ['bClock', 'Node B wall clock', 'Provides B physical millisecond readings', 72, 86],
      ['b', 'Node B HLC', 'Stores B tuple (physical, logical)', 88, 42],
      ['ledger', 'Timestamped ledger', 'Orders committed events by HLC then node id', 48, 90]
    ],
    [
      ['aClock', 'a', 'read physical time for local event'],
      ['a', 'wire', 'stamp replication message with HLC'],
      ['wire', 'b', 'merge remote tuple on receive'],
      ['bClock', 'b', 'read physical time for local event'],
      ['b', 'wire', 'stamp reply with HLC'],
      ['a', 'ledger', 'append event ordered by tuple and node id'],
      ['b', 'ledger', 'append event ordered by tuple and node id']
    ],
    [
      ['A records a physical-time event', 'A reads millisecond 1000, which exceeds its prior physical component 995.', ['aClock', 'a', 'local event: HLC max(995,1000)=(1000,0)'], [
        {reading:'1000ms',status:'advancing'}, {hlc:'(1000,0)',event:'A:update1'}, {payload:'none',stamp:'none'}, {reading:'996ms',status:'skewed -4ms'}, {hlc:'(996,0)',event:'idle'}, {entries:'A:update1@(1000,0)',max:'(1000,0)/A'}
      ], 'A anchors the tuple to its advancing wall clock and resets the logical component.', 'An HLC physical component never decreases.'],
      ['Clock regression increments logical time', 'A wall time regresses to 997, so a second local event retains physical 1000 and increments logical to one.', ['aClock', 'a', 'local event: max(1000,997)=(1000,1)'], [
        {reading:'997ms',status:'regressed'}, {hlc:'(1000,1)',event:'A:update2'}, {payload:'none',stamp:'none'}, {reading:'997ms',status:'skewed'}, {hlc:'(996,0)',event:'idle'}, {entries:'A:update1@(1000,0), A:update2@(1000,1)',max:'(1000,1)/A'}
      ], 'The second event remains ordered after the first without moving backward in physical time.', 'When wall time does not exceed stored physical time, a local event increments the logical component.'],
      ['A sends a stamped mutation', 'The send is an event, so A increments its logical component and attaches (1000,2).', ['a', 'wire', 'send replicate update2 HLC(1000,2)'], [
        {reading:'998ms',status:'behind HLC'}, {hlc:'(1000,2)',event:'send update2'}, {payload:'update2',stamp:'(1000,2)',status:'in flight'}, {reading:'998ms',status:'skewed'}, {hlc:'(996,0)',event:'idle'}, {entries:'through A:send@(1000,2)',max:'(1000,2)/A'}
      ], 'The message carries a timestamp later than both A updates.', 'Every send advances the sender HLC before publishing its tuple.'],
      ['B merges a future remote tuple', 'B receives at physical 998 and chooses physical max 1000, then advances beyond the remote logical value to three.', ['wire', 'b', 'receive: max physical=1000; logical=max(0,2)+1=3'], [
        {reading:'998ms',status:'behind HLC'}, {hlc:'(1000,2)',event:'send complete'}, {payload:'update2',stamp:'(1000,2)',status:'delivered'}, {reading:'998ms',status:'behind remote'}, {hlc:'(1000,3)',event:'receive update2'}, {entries:'through B:receive@(1000,3)',max:'(1000,3)/B'}
      ], 'B is causally after A even though B wall time is behind.', 'A receive timestamp must compare greater than the message timestamp.'],
      ['B wall clock catches up', 'At physical 1005, B records a local event and resets the logical component.', ['bClock', 'b', 'local event: max(1000,1005)=(1005,0)'], [
        {reading:'1002ms',status:'advancing'}, {hlc:'(1000,2)',event:'idle'}, {payload:'none',stamp:'none'}, {reading:'1005ms',status:'ahead'}, {hlc:'(1005,0)',event:'B:commit'}, {entries:'through B:commit@(1005,0)',max:'(1005,0)/B'}
      ], 'Physical time resumes carrying the ordering once it exceeds the stored component.', 'Logical time resets to zero only when the chosen physical component strictly advances.'],
      ['A merges B reply', 'B sends at (1005,1); A receives it at wall time 1002 and advances to (1005,2).', ['wire', 'a', 'receive B reply: remote(1005,1)→A(1005,2)'], [
        {reading:'1002ms',status:'behind remote'}, {hlc:'(1005,2)',event:'receive B commit'}, {payload:'commit ack',stamp:'(1005,1)',status:'delivered'}, {reading:'1005ms',status:'current'}, {hlc:'(1005,1)',event:'send commit ack'}, {entries:'through A:receive@(1005,2)',max:'(1005,2)/A'}
      ], 'The ledger has a causality-compatible order with timestamps close to wall time.', 'HLC ties still require a deterministic node-id tie-breaker; HLC does not make physical clocks exact.']
    ]
  );

  add(
    'distributed-systems-fundamentals::FIFO ordering',
    'timeline',
    'A receiver uses per-sender sequence numbers and a holdback buffer when one sender’s messages arrive out of order.',
    [
      ['producer', 'Sender P', 'Assigns monotonically increasing sequence numbers', 8, 18],
      ['wire', 'Unordered channel', 'May delay, duplicate, or reorder packets', 36, 42],
      ['buffer', 'Per-sender holdback', 'Indexes early packets by sequence number', 56, 82],
      ['next', 'Next-expected register', 'Stores the next deliverable P sequence', 70, 22],
      ['consumer', 'Receiver application', 'Consumes P messages in send order', 92, 58]
    ],
    [
      ['producer', 'wire', 'send message with sender sequence'],
      ['wire', 'buffer', 'store packet when seq > nextExpected'],
      ['wire', 'consumer', 'deliver packet when seq = nextExpected'],
      ['buffer', 'consumer', 'drain contiguous buffered successors'],
      ['consumer', 'next', 'advance nextExpected after delivery']
    ],
    [
      ['Sender emits sequence 41', 'P assigns sequence 41 to debit before placing it on the channel.', ['producer', 'wire', 'send debit seq=41'], [
        {nextSeq:'42',sent:'debit#41'}, {inFlight:'#41 delay=80ms',delivered:'none'}, {entries:'{}',duplicates:'0'}, {sender:'P',nextExpected:'41'}, {delivered:'[]',lastSeq:'40'}
      ], 'The packet carries enough metadata to recover P send order.', 'One sender never reuses or decreases its sequence number within an epoch.'],
      ['Sender emits sequence 42', 'P sends receipt 42 after debit 41, but the channel gives it a shorter delay.', ['producer', 'wire', 'send receipt seq=42 delay=10ms'], [
        {nextSeq:'43',sent:'debit#41,receipt#42'}, {inFlight:'#41@80ms,#42@10ms',delivered:'none'}, {entries:'{}',duplicates:'0'}, {sender:'P',nextExpected:'41'}, {delivered:'[]',lastSeq:'40'}
      ], 'Send order is 41 then 42 even though arrival order will differ.', 'FIFO is scoped per sender; it does not compare unrelated senders.'],
      ['Early successor is held', 'Receipt 42 arrives first and cannot pass missing sequence 41.', ['wire', 'buffer', 'store receipt#42 awaiting #41'], [
        {nextSeq:'43',sent:'2 messages'}, {inFlight:'#41',delivered:'#42'}, {entries:'{42:receipt}',duplicates:'0'}, {sender:'P',nextExpected:'41'}, {delivered:'[]',lastSeq:'40'}
      ], 'The application sees neither packet yet.', 'A packet with sequence greater than nextExpected is buffered, never delivered early.'],
      ['Gap arrival drains contiguous order', 'Debit 41 arrives, is delivered, advances nextExpected to 42, and releases buffered receipt 42.', ['buffer', 'consumer', 'deliver debit#41 then receipt#42'], [
        {nextSeq:'43',sent:'2 messages'}, {inFlight:'none',delivered:'#41,#42'}, {entries:'{}',duplicates:'0'}, {sender:'P',nextExpected:'43'}, {delivered:'[debit#41,receipt#42]',lastSeq:'42'}
      ], 'Arrival order 42,41 becomes application order 41,42.', 'Delivery advances only through a contiguous sequence prefix.'],
      ['Duplicate is discarded', 'A retransmitted receipt 42 arrives after nextExpected has advanced to 43.', ['wire', 'buffer', 'discard duplicate seq42 < nextExpected43'], [
        {nextSeq:'43',sent:'retransmit #42'}, {inFlight:'none',delivered:'duplicate#42'}, {entries:'{}',duplicates:'1'}, {sender:'P',nextExpected:'43'}, {delivered:'[debit#41,receipt#42]',lastSeq:'42'}
      ], 'Retry traffic does not duplicate the application event.', 'A sequence below nextExpected is stale or duplicate and cannot be redelivered under exactly-once FIFO delivery state.']
    ]
  );

  add(
    'distributed-systems-fundamentals::Causal ordering',
    'timeline',
    'A profile update and its dependent notification are delivered using vector dependencies despite network reordering.',
    [
      ['a', 'Writer A', 'Creates the profile update with vector component A', 8, 20],
      ['b', 'Worker B', 'Observes A then creates a dependent notification', 34, 72],
      ['wire', 'Reordering network', 'Carries both vector-stamped messages to C', 50, 24],
      ['hold', 'C causal holdback', 'Stores messages whose dependencies are missing', 68, 82],
      ['frontier', 'C delivered frontier', 'Tracks delivered counts [A,B]', 78, 24],
      ['app', 'C application', 'Applies causally ready operations', 94, 56]
    ],
    [
      ['a', 'b', 'deliver profile m1 with vector [1,0]'],
      ['a', 'wire', 'send m1 [1,0] toward C'],
      ['b', 'wire', 'send dependent m2 [1,1] toward C'],
      ['wire', 'hold', 'buffer message with unsatisfied vector'],
      ['wire', 'frontier', 'deliver causally ready message'],
      ['hold', 'app', 'drain messages after dependency advances']
    ],
    [
      ['A creates the cause', 'A increments its vector and publishes profile version m1 at [1,0].', ['a', 'wire', 'send m1 profile=gold vc[1,0]'], [
        {vector:'[1,0]',event:'m1 profile=gold'}, {vector:'[0,0]',observed:'none'}, {inFlight:'m1→B,m1→C slow',arrivalAtC:'pending'}, {messages:'{}',blockedOn:'none'}, {delivered:'[0,0]',ready:'A1'}, {applied:'[]',profile:'silver'}
      ], 'm1 names its own A event and has no B dependency.', 'A increments only its own vector component before sending.'],
      ['B observes then responds', 'B delivers m1, merges [1,0], increments B, and creates notification m2 at [1,1].', ['b', 'wire', 'send m2 notify-gold vc[1,1]'], [
        {vector:'[1,0]',event:'m1 sent'}, {vector:'[1,1]',observed:'m1',event:'m2 notify-gold'}, {inFlight:'m1→C slow,m2→C fast',arrivalAtC:'m2 first'}, {messages:'{}',blockedOn:'none'}, {delivered:'[0,0]',ready:'A1'}, {applied:'[]',profile:'silver'}
      ], 'm2 explicitly depends on A1 through its vector.', 'A process merges delivered dependencies before incrementing its own component.'],
      ['Dependent message arrives first', 'C receives m2 while its delivered frontier is still [0,0].', ['wire', 'hold', 'buffer m2; missing dependency A1'], [
        {vector:'[1,0]',event:'m1 in flight'}, {vector:'[1,1]',event:'m2 sent'}, {inFlight:'m1→C',arrivalAtC:'m2 delivered'}, {messages:'{m2:[1,1]}',blockedOn:'A>=1'}, {delivered:'[0,0]',ready:'none'}, {applied:'[]',profile:'silver'}
      ], 'C withholds the notification rather than exposing an effect before its cause.', 'For sender B, m2 is ready only when B is next and every non-B component dependency is already delivered.'],
      ['Cause becomes deliverable', 'm1 arrives with A=1 and no unsatisfied remote dependency, so C applies it and advances to [1,0].', ['wire', 'frontier', 'deliver m1; frontier [0,0]→[1,0]'], [
        {vector:'[1,0]',event:'m1 delivered C'}, {vector:'[1,1]',event:'m2 buffered C'}, {inFlight:'none',arrivalAtC:'m1 delivered'}, {messages:'{m2:[1,1]}',blockedOn:'cleared'}, {delivered:'[1,0]',ready:'m2'}, {applied:'[m1 profile=gold]',profile:'gold'}
      ], 'The missing causal predecessor is now visible at C.', 'A delivered frontier advances monotonically one sender event at a time.'],
      ['Holdback drains dependent work', 'The frontier now satisfies m2, so C applies the notification and advances B to one.', ['hold', 'app', 'release m2 and advance frontier to [1,1]'], [
        {vector:'[1,0]',event:'m1 complete'}, {vector:'[1,1]',event:'m2 complete'}, {inFlight:'none',arrivalAtC:'complete'}, {messages:'{}',blockedOn:'none'}, {delivered:'[1,1]',ready:'none'}, {applied:'[m1 profile=gold,m2 notify-gold]',profile:'gold'}
      ], 'Network order m2,m1 becomes causal application order m1,m2.', 'Concurrent messages may be ordered either way, but a dependency must never follow its effect.']
    ]
  );

  add(
    'distributed-systems-fundamentals::Total ordering',
    'log',
    'A sequencer assigns global slots to concurrent commands so replicas apply one identical total order.',
    [
      ['a', 'Proposer A', 'Submits command X without coordinating with B', 8, 20],
      ['b', 'Proposer B', 'Submits command Y concurrently', 8, 80],
      ['sequencer', 'Global sequencer', 'Assigns the next unique monotonically increasing slot', 44, 48],
      ['log', 'Ordered log', 'Stores commands by global slot', 66, 14],
      ['r1', 'Replica R1', 'Applies only the next contiguous slot', 88, 32],
      ['r2', 'Replica R2', 'Buffers gaps before applying', 82, 84]
    ],
    [
      ['a', 'sequencer', 'propose command X'],
      ['b', 'sequencer', 'propose command Y'],
      ['sequencer', 'log', 'append command at assigned global slot'],
      ['log', 'r1', 'replicate ordered slots'],
      ['log', 'r2', 'replicate slots over reordering channel']
    ],
    [
      ['A submits concurrent X', 'A sends X while the sequencer next slot is 81.', ['a', 'sequencer', 'enqueue proposal X request=a17'], [
        {proposal:'X',requestId:'a17',status:'in flight'}, {proposal:'none',requestId:'none',status:'idle'}, {nextSlot:'81',pending:'X'}, {entries:'through 80',commitIndex:'80'}, {nextApply:'81',applied:'through80'}, {nextApply:'81',buffer:'{}'}
      ], 'X is proposed but has no globally visible position yet.', 'Proposal arrival alone does not define total order; only a unique assigned slot does.'],
      ['B wins the next slot', 'B proposal Y reaches the sequencer before queued X and receives slot 81.', ['b', 'sequencer', 'assign Y→slot81'], [
        {proposal:'X',requestId:'a17',status:'queued'}, {proposal:'Y',requestId:'b44',status:'slot81'}, {nextSlot:'82',pending:'X'}, {entries:'81:Y',commitIndex:'81'}, {nextApply:'81',applied:'through80'}, {nextApply:'81',buffer:'{}'}
      ], 'Concurrent real-time proposals are deterministically ordered Y before X.', 'Each slot is assigned to at most one command.'],
      ['X receives the following slot', 'The sequencer assigns X slot 82 and appends it after Y.', ['sequencer', 'log', 'append X at slot82'], [
        {proposal:'X',requestId:'a17',status:'slot82'}, {proposal:'Y',requestId:'b44',status:'slot81'}, {nextSlot:'83',pending:'none'}, {entries:'81:Y,82:X',commitIndex:'82'}, {nextApply:'81',applied:'through80'}, {nextApply:'81',buffer:'{}'}
      ], 'The authoritative total order is now [Y, X].', 'The log order is a strict sequence even for commands that were concurrent.'],
      ['Replica buffers an out-of-order slot', 'R2 receives slot 82 before 81 and holds X; R1 receives and applies slot 81.', ['log', 'r2', 'receive slot82; buffer gap81'], [
        {proposal:'X',requestId:'a17',status:'committed'}, {proposal:'Y',requestId:'b44',status:'committed'}, {nextSlot:'83',pending:'none'}, {entries:'81:Y,82:X',commitIndex:'82'}, {nextApply:'82',applied:'81:Y'}, {nextApply:'81',buffer:'{82:X}'}
      ], 'R2 does not let transport reordering change the sequenced order.', 'A replica applies only its next expected global slot.'],
      ['Replicas converge on one order', 'R2 receives slot 81, applies Y, drains buffered X, and matches R1 after R1 applies 82.', ['log', 'r2', 'deliver slot81 then drain slot82'], [
        {proposal:'X',requestId:'a17',status:'applied'}, {proposal:'Y',requestId:'b44',status:'applied'}, {nextSlot:'83',pending:'none'}, {entries:'81:Y,82:X',commitIndex:'82'}, {nextApply:'83',applied:'81:Y,82:X'}, {nextApply:'83',buffer:'{}',applied:'81:Y,82:X'}
      ], 'Both replicas expose the identical sequence Y then X.', 'Total order requires all correct replicas to place every delivered command in the same relative position.']
    ]
  );

  add(
    'rate-limiting-traffic-management::Leaky bucket',
    'capacity',
    'A gateway shapes a burst through a bounded FIFO bucket that leaks exactly two requests per second.',
    [
      ['client', 'Request burst', 'Produces timestamped API requests', 8, 22],
      ['bucket', 'FIFO bucket', 'Buffers at most five admitted requests', 34, 48],
      ['clock', 'Leak clock', 'Emits one drain tick every 500 milliseconds', 48, 88],
      ['outlet', 'Constant-rate outlet', 'Dequeues only on leak ticks', 72, 32],
      ['meter', 'Overflow meter', 'Records queue drops and shaped throughput', 92, 76]
    ],
    [
      ['client', 'bucket', 'enqueue at tail if depth < 5'],
      ['clock', 'bucket', 'tick every 500ms'],
      ['bucket', 'outlet', 'dequeue head on tick'],
      ['bucket', 'meter', 'record overflow when full'],
      ['outlet', 'meter', 'record shaped completion']
    ],
    [
      ['First arrivals queue', 'Three simultaneous requests enter an empty FIFO bucket.', ['client', 'bucket', 'enqueue r1,r2,r3 at t=0.0'], [
        {arrivals:'r1,r2,r3@0.0',accepted:'3'}, {queue:'[r1,r2,r3]',depth:'3/5',head:'r1'}, {now:'0.0s',nextTick:'0.5s'}, {lastDequeued:'none',rate:'2/s'}, {admitted:'3',dropped:'0',completed:'0'}
      ], 'The burst is absorbed without changing the configured outlet rate.', 'Accepted requests retain FIFO order inside the bucket.'],
      ['Bucket reaches capacity', 'Three more requests arrive before a leak tick; two fit and the sixth overflows.', ['client', 'bucket', 'enqueue r4,r5; reject r6 at t=0.1'], [
        {arrivals:'r4,r5,r6@0.1',accepted:'r4,r5',rejected:'r6'}, {queue:'[r1,r2,r3,r4,r5]',depth:'5/5',head:'r1'}, {now:'0.1s',nextTick:'0.5s'}, {lastDequeued:'none',rate:'2/s'}, {admitted:'5',dropped:'1',completed:'0'}
      ], 'The bounded bucket converts excess burst load into an explicit rejection.', 'Queue depth never exceeds five; overflow is rejected rather than hidden in unbounded memory.'],
      ['First leak tick', 'At 0.5 seconds the clock releases exactly the oldest request.', ['clock', 'bucket', 'tick t=0.5; dequeue r1'], [
        {arrivals:'none',accepted:'5 total'}, {queue:'[r2,r3,r4,r5]',depth:'4/5',head:'r2'}, {now:'0.5s',nextTick:'1.0s'}, {lastDequeued:'r1',rate:'2/s'}, {admitted:'5',dropped:'1',completed:'1'}
      ], 'One unit of queue capacity opens while output remains evenly spaced.', 'A tick removes at most one request regardless of how many are waiting.'],
      ['New work joins the tail', 'A later request uses the newly opened slot behind all older work.', ['client', 'bucket', 'enqueue r7 at t=0.7'], [
        {arrivals:'r7@0.7',accepted:'r7'}, {queue:'[r2,r3,r4,r5,r7]',depth:'5/5',head:'r2'}, {now:'0.7s',nextTick:'1.0s'}, {lastDequeued:'r1',rate:'2/s'}, {admitted:'6',dropped:'1',completed:'1'}
      ], 'The limiter admits new work only when a prior tick creates capacity.', 'Later arrivals cannot bypass requests already buffered.'],
      ['Constant drain continues', 'Ticks at 1.0 and 1.5 seconds release r2 and r3, independent of arrival burst size.', ['bucket', 'outlet', 'dequeue r2@1.0 then r3@1.5'], [
        {arrivals:'none',accepted:'6 total'}, {queue:'[r4,r5,r7]',depth:'3/5',head:'r4'}, {now:'1.5s',nextTick:'2.0s'}, {lastDequeued:'r3',rate:'2/s'}, {admitted:'6',dropped:'1',completed:'3'}
      ], 'The outlet observes a smooth two-request-per-second stream.', 'The leaky bucket enforces a constant service cadence and does not preserve burst throughput.']
    ]
  );

  add(
    'rate-limiting-traffic-management::Fixed window',
    'capacity',
    'A per-tenant limiter admits five requests in each wall-clock-aligned 60-second window.',
    [
      ['client', 'Tenant client', 'Issues requests around a minute boundary', 8, 54],
      ['clock', 'Window clock', 'Computes floor(epochSeconds / 60)', 30, 14],
      ['counter', 'Counter tenant:T:window', 'Stores the active window id and count', 50, 54],
      ['gate', 'Atomic admission gate', 'Increments only when count is below five', 74, 20],
      ['response', 'Decision stream', 'Returns allow or retry-after', 92, 70]
    ],
    [
      ['client', 'clock', 'request carries current epoch second'],
      ['clock', 'counter', 'select counter by window id'],
      ['counter', 'gate', 'atomic increment-if-below-limit'],
      ['gate', 'response', 'allow with remaining quota'],
      ['gate', 'response', 'reject with next boundary']
    ],
    [
      ['Window 120 opens', 'The first request at second 7201 selects minute window 120 and creates its counter.', ['clock', 'counter', 'initialize tenant:T:120 count=0'], [
        {request:'q1@7201',result:'pending'}, {epochSecond:'7201',windowId:'120',endsAt:'7260'}, {key:'T:120',count:'0',ttl:'59s'}, {limit:'5',decision:'pending'}, {last:'none',retryAfter:'none'}
      ], 'A fresh key isolates this minute from the preceding window.', 'All requests with window id 120 contend on the same atomic counter.'],
      ['First three admitted', 'Three requests atomically increment the active counter from zero to three.', ['client', 'gate', 'increment T:120 for q1-q3'], [
        {request:'q1,q2,q3',result:'allowed'}, {epochSecond:'7210',windowId:'120',endsAt:'7260'}, {key:'T:120',count:'3',ttl:'50s'}, {limit:'5',decision:'allow',remaining:'2'}, {last:'allow q3',retryAfter:'none'}
      ], 'Two admissions remain in the current fixed interval.', 'The count and admission decision are one atomic operation.'],
      ['Quota is consumed', 'Requests four and five advance the counter exactly to its limit.', ['counter', 'gate', 'CAS count 3→5 for q4,q5'], [
        {request:'q4,q5@7258',result:'allowed'}, {epochSecond:'7258',windowId:'120',endsAt:'7260'}, {key:'T:120',count:'5',ttl:'2s'}, {limit:'5',decision:'allow',remaining:'0'}, {last:'allow q5',retryAfter:'none'}
      ], 'Five requests have been admitted in window 120.', 'An admitted count may equal but never exceed the configured limit.'],
      ['Same-window excess rejected', 'A sixth request at 7259 sees count five and does not mutate it.', ['gate', 'response', 'reject q6; retry after 1s'], [
        {request:'q6@7259',result:'rejected'}, {epochSecond:'7259',windowId:'120',endsAt:'7260'}, {key:'T:120',count:'5',ttl:'1s'}, {limit:'5',decision:'reject',remaining:'0'}, {last:'reject q6',retryAfter:'1s'}
      ], 'The old window remains capped at five.', 'Rejected requests do not consume quota unless that policy is explicitly chosen.'],
      ['Boundary creates new quota', 'At second 7260 the next request maps to window 121 and increments a different counter.', ['clock', 'counter', 'create T:121 and admit q7'], [
        {request:'q7@7260',result:'allowed'}, {epochSecond:'7260',windowId:'121',endsAt:'7320'}, {key:'T:121',count:'1',previous:'T:120=5'}, {limit:'5',decision:'allow',remaining:'4'}, {last:'allow q7',retryAfter:'none'}
      ], 'Quota resets abruptly at the aligned boundary.', 'Fixed windows can admit up to twice the nominal limit across two adjacent boundary instants.']
    ]
  );

  add(
    'rate-limiting-traffic-management::Sliding window counter',
    'capacity',
    'A limiter estimates a trailing 60-second count from the previous and current fixed-window counters.',
    [
      ['client', 'Tenant client', 'Generates requests during adjacent windows', 8, 62],
      ['clock', 'Fractional window clock', 'Reports window id and elapsed fraction', 28, 14],
      ['previous', 'Previous counter', 'Stores the completed prior-window count', 46, 76],
      ['current', 'Current counter', 'Stores admissions in the active window', 54, 24],
      ['estimator', 'Weighted estimator', 'Computes previous × remaining fraction + current', 76, 48],
      ['gate', 'Admission gate', 'Compares the estimate with limit seven', 94, 18]
    ],
    [
      ['clock', 'previous', 'rotate completed current into previous'],
      ['clock', 'current', 'open zeroed active counter'],
      ['previous', 'estimator', 'supply weighted historical count'],
      ['current', 'estimator', 'supply active count'],
      ['estimator', 'gate', 'admit only when estimate + candidate <= 7'],
      ['client', 'current', 'increment after admission']
    ],
    [
      ['Prior window closes', 'Window 200 ends with eight admitted requests recorded for interpolation.', ['current', 'previous', 'rotate window200 count8'], [
        {request:'none',result:'idle'}, {now:'12060.0',windowId:'201',elapsed:'0s'}, {windowId:'200',count:'8',weight:'1.00'}, {windowId:'201',count:'0'}, {estimate:'8.00',formula:'8×1.00+0'}, {limit:'7',decision:'not evaluated'}
      ], 'The exact prior total becomes the decaying history term.', 'Rotation must atomically preserve the completed count and clear the new current bucket.'],
      ['History begins decaying', 'At four seconds into window 201, the prior count has weight 56/60.', ['clock', 'estimator', 'set elapsed=4s weight=0.933'], [
        {request:'q9@12064',result:'pending'}, {now:'12064.0',windowId:'201',elapsed:'4s'}, {windowId:'200',count:'8',weight:'0.933'}, {windowId:'201',count:'0'}, {estimate:'7.47',formula:'8×56/60+0'}, {limit:'7',decision:'reject q9'}
      ], 'The recent burst still fills the estimated trailing window.', 'The historical contribution decreases continuously rather than resetting at a boundary.'],
      ['Decay permits an admission', 'At sixteen seconds, weighted history is 5.87, so the projected count 6.87 admits one request.', ['client', 'current', 'admit q10; increment current 0→1'], [
        {request:'q10@12076',result:'allowed'}, {now:'12076.0',windowId:'201',elapsed:'16s'}, {windowId:'200',count:'8',weight:'0.733'}, {windowId:'201',count:'1'}, {estimate:'5.87 pre-add; 6.87 projected',formula:'8×44/60+0+1'}, {limit:'7',decision:'allow q10'}
      ], 'Time decay opens capacity gradually.', 'The estimator uses the count before the candidate request, then increments only on admission.'],
      ['Current traffic fills estimate', 'At thirty seconds, two more requests project counts six and seven, raising the current counter to three.', ['client', 'current', 'admit q11,q12; current 1→3'], [
        {request:'q11,q12@12090',result:'allowed'}, {now:'12090.0',windowId:'201',elapsed:'30s'}, {windowId:'200',count:'8',weight:'0.500'}, {windowId:'201',count:'3'}, {estimate:'7.00 after adds',formula:'8×30/60+3'}, {limit:'7',decision:'allow through q12'}
      ], 'The combined weighted history and active count reaches the limit.', 'Both counters for one key must be read and updated under a consistent rotation epoch.'],
      ['At-limit request rejected', 'A request one tenth of a second later projects 7.99 and leaves the current count unchanged.', ['estimator', 'gate', 'reject q13 at projected count 7.99'], [
        {request:'q13@12090.1',result:'rejected'}, {now:'12090.1',windowId:'201',elapsed:'30.1s'}, {windowId:'200',count:'8',weight:'0.498'}, {windowId:'201',count:'3'}, {estimate:'6.99 pre-add; 7.99 projected',formula:'8×29.9/60+3+1'}, {limit:'7',decision:'reject q13'}
      ], 'The candidate would push the estimate above seven.', 'Admission compares the projected count, not merely the stored current counter.'],
      ['Further decay reopens capacity', 'At thirty-eight seconds, the projected count falls to 6.93 and one more request is admitted.', ['client', 'current', 'admit q14; current 3→4'], [
        {request:'q14@12098',result:'allowed'}, {now:'12098.0',windowId:'201',elapsed:'38s'}, {windowId:'200',count:'8',weight:'0.367'}, {windowId:'201',count:'4'}, {estimate:'5.93 pre-add; 6.93 projected',formula:'8×22/60+3+1'}, {limit:'7',decision:'allow q14'}
      ], 'Admission capacity changes smoothly as historical traffic ages out.', 'The two-counter approximation bounds storage but is not an exact timestamp log.']
    ]
  );

  window.SYSTEM_DESIGN_LESSONS = {
    ...(window.SYSTEM_DESIGN_LESSONS || {}),
    ...lessons
  };
}());
