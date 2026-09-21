(function () {
  'use strict';

  const lessons = {
    'distributed-transactions::Two-phase commit (2PC)': {
      family: 'transaction',
      scenario: 'A travel desk atomically books the last seat and a hotel room for trip TX-42.',
      entities: [
        ['coordinator', 'Trip coordinator', 'records the durable global decision for TX-42', 18, 18],
        ['flight', 'Flight inventory', 'holds seat 12A while prepared', 75, 18],
        ['hotel', 'Hotel inventory', 'holds room 504 while prepared', 75, 76],
        ['decisionLog', 'Decision log', 'survives coordinator restart', 18, 76]
      ],
      connections: [
        ['coordinator', 'flight', 'PREPARE TX-42'],
        ['coordinator', 'hotel', 'PREPARE TX-42'],
        ['coordinator', 'decisionLog', 'append COMMIT TX-42'],
        ['decisionLog', 'flight', 'replay COMMIT TX-42'],
        ['decisionLog', 'hotel', 'replay COMMIT TX-42']
      ],
      steps: [
        {
          title: 'Begin one global booking',
          narration: 'The coordinator assigns TX-42 before either supplier changes visible availability.',
          action: null,
          states: {
            coordinator: {tx: 'TX-42', phase: 'BEGIN', votes: '0/2'},
            flight: {seat12A: 'AVAILABLE', tx42: 'NONE'},
            hotel: {room504: 'AVAILABLE', tx42: 'NONE'},
            decisionLog: {tx42: 'ABSENT', durableRecords: '0'}
          },
          outcome: 'Both resources remain sellable until prepare requests arrive.',
          invariant: 'No participant may commit TX-42 without a durable global decision.'
        },
        {
          title: 'Prepare the flight',
          narration: 'Flight inventory durably reserves seat 12A and promises not to give it to another transaction.',
          action: ['coordinator', 'flight', 'PREPARE TX-42'],
          states: {
            coordinator: {tx: 'TX-42', phase: 'PREPARING', votes: '1/2 YES'},
            flight: {seat12A: 'HELD', tx42: 'PREPARED'},
            hotel: {room504: 'AVAILABLE', tx42: 'NONE'},
            decisionLog: {tx42: 'ABSENT', durableRecords: '0'}
          },
          outcome: 'Seat 12A is locked even though the trip is not committed.',
          invariant: 'A YES vote means the participant can later commit despite a restart.'
        },
        {
          title: 'Prepare the hotel',
          narration: 'Hotel inventory writes its prepared record and holds room 504.',
          action: ['coordinator', 'hotel', 'PREPARE TX-42'],
          states: {
            coordinator: {tx: 'TX-42', phase: 'PREPARED', votes: '2/2 YES'},
            flight: {seat12A: 'HELD', tx42: 'PREPARED'},
            hotel: {room504: 'HELD', tx42: 'PREPARED'},
            decisionLog: {tx42: 'ABSENT', durableRecords: '0'}
          },
          outcome: 'Every participant has voted YES, but prepared locks still block competing buyers.',
          invariant: 'The coordinator chooses COMMIT only after every required YES vote.'
        },
        {
          title: 'Make commit durable',
          narration: 'The coordinator appends COMMIT before telling suppliers, so recovery cannot choose a different answer.',
          action: ['coordinator', 'decisionLog', 'append COMMIT TX-42'],
          states: {
            coordinator: {tx: 'TX-42', phase: 'DECIDED_COMMIT', votes: '2/2 YES'},
            flight: {seat12A: 'HELD', tx42: 'PREPARED'},
            hotel: {room504: 'HELD', tx42: 'PREPARED'},
            decisionLog: {tx42: 'COMMIT', durableRecords: '1'}
          },
          outcome: 'TX-42 is committed logically even before all acknowledgements arrive.',
          invariant: 'Once logged, the global decision is immutable and replayable.'
        },
        {
          title: 'Finish after a lost message',
          narration: 'The flight learns COMMIT immediately; the hotel learns the same decision from recovery replay.',
          action: ['decisionLog', 'hotel', 'replay COMMIT TX-42'],
          states: {
            coordinator: {tx: 'TX-42', phase: 'COMPLETE', votes: '2/2 YES'},
            flight: {seat12A: 'SOLD', tx42: 'COMMITTED'},
            hotel: {room504: 'BOOKED', tx42: 'COMMITTED'},
            decisionLog: {tx42: 'COMMIT_ACKED_2', durableRecords: '1'}
          },
          outcome: 'The traveler owns both reservations; retries cannot split the decision.',
          invariant: 'All prepared participants eventually apply the same logged outcome.'
        }
      ]
    },

    'distributed-transactions::Three-phase commit': {
      family: 'transaction',
      scenario: 'A warehouse fleet switches two loading robots to a new route under bounded-delay assumptions.',
      entities: [
        ['controller', 'Fleet controller', 'coordinates route change RC-7', 18, 20],
        ['robotA', 'Robot Atlas', 'carries aisle-4 pallets', 78, 15],
        ['robotB', 'Robot Beacon', 'carries aisle-9 pallets', 78, 78],
        ['watchdog', 'Timing watchdog', 'enforces the assumed message deadline', 20, 78]
      ],
      connections: [
        ['controller', 'robotA', 'CAN_COMMIT RC-7'],
        ['controller', 'robotB', 'CAN_COMMIT RC-7'],
        ['controller', 'robotA', 'PRE_COMMIT RC-7'],
        ['controller', 'robotB', 'PRE_COMMIT RC-7'],
        ['watchdog', 'robotB', 'bounded timeout'],
        ['controller', 'robotB', 'DO_COMMIT RC-7']
      ],
      steps: [
        {
          title: 'Propose the route',
          narration: 'The controller asks whether both robots can safely adopt route R2.',
          action: ['controller', 'robotA', 'CAN_COMMIT RC-7'],
          states: {
            controller: {change: 'RC-7', phase: 'CAN_COMMIT', replies: '0/2'},
            robotA: {route: 'R1', rc7: 'CHECKING'},
            robotB: {route: 'R1', rc7: 'CHECKING'},
            watchdog: {deadlineMs: '200', elapsedMs: '20'}
          },
          outcome: 'No robot has crossed the point where it expects a commit.',
          invariant: 'A NO reply or expired first-phase deadline causes ABORT.'
        },
        {
          title: 'Collect unanimous readiness',
          narration: 'Both robots report that route R2 is feasible and reserve their next movement slot.',
          action: ['controller', 'robotB', 'CAN_COMMIT RC-7'],
          states: {
            controller: {change: 'RC-7', phase: 'READY', replies: '2/2 YES'},
            robotA: {route: 'R1', rc7: 'READY'},
            robotB: {route: 'R1', rc7: 'READY'},
            watchdog: {deadlineMs: '200', elapsedMs: '80'}
          },
          outcome: 'The controller may enter the extra pre-commit phase.',
          invariant: 'PRE_COMMIT is sent only after unanimous YES replies.'
        },
        {
          title: 'Enter pre-commit',
          narration: 'Each robot acknowledges PRE_COMMIT, learning that every participant was ready.',
          action: ['controller', 'robotA', 'PRE_COMMIT RC-7'],
          states: {
            controller: {change: 'RC-7', phase: 'PRE_COMMIT', replies: '2/2 ACK'},
            robotA: {route: 'R1', rc7: 'PRE_COMMITTED'},
            robotB: {route: 'R1', rc7: 'PRE_COMMITTED'},
            watchdog: {deadlineMs: '200', elapsedMs: '130'}
          },
          outcome: 'Participants now distinguish unanimous readiness from an uncertain prepare.',
          invariant: 'A pre-committed participant must not independently abort.'
        },
        {
          title: 'Use the timeout assumption',
          narration: 'The controller pauses, but the watchdog confirms the modeled bounded delay rather than a partition.',
          action: ['watchdog', 'robotB', 'bounded timeout'],
          states: {
            controller: {change: 'RC-7', phase: 'RECOVERING', replies: '2/2 ACK'},
            robotA: {route: 'R1', rc7: 'PRE_COMMITTED'},
            robotB: {route: 'R1', rc7: 'PRE_COMMITTED_TIMEOUT'},
            watchdog: {deadlineMs: '200', elapsedMs: '205'}
          },
          outcome: 'Robot Beacon can seek peers and progress only because timing and failure assumptions hold.',
          invariant: 'Non-blocking progress is unsafe if a network partition can mimic controller failure.'
        },
        {
          title: 'Commit the route change',
          narration: 'Recovery establishes that PRE_COMMIT was reached, and both robots activate R2.',
          action: ['controller', 'robotB', 'DO_COMMIT RC-7'],
          states: {
            controller: {change: 'RC-7', phase: 'COMPLETE', replies: '2/2 COMMITTED'},
            robotA: {route: 'R2', rc7: 'COMMITTED'},
            robotB: {route: 'R2', rc7: 'COMMITTED'},
            watchdog: {deadlineMs: '200', elapsedMs: '240'}
          },
          outcome: 'Both robots follow R2; the lesson exposes why real partitions undermine 3PC guarantees.',
          invariant: 'Commit safety depends on the stated bounded-delay and no-partition model.'
        }
      ]
    },

    'distributed-transactions::Saga pattern': {
      family: 'workflow',
      scenario: 'A concert package reserves a ticket, books a train, then compensates both when the hotel sells out.',
      entities: [
        ['saga', 'Package saga log', 'durably records package PKG-8 progress', 15, 50],
        ['ticket', 'Concert box office', 'reserves ticket T-19', 48, 15],
        ['train', 'Rail booking', 'books seat C7', 82, 50],
        ['hotel', 'Hotel booking', 'tries room H-3', 48, 85]
      ],
      connections: [
        ['saga', 'ticket', 'reserve T-19'],
        ['saga', 'train', 'book seat C7'],
        ['saga', 'hotel', 'book room H-3'],
        ['saga', 'train', 'cancel seat C7'],
        ['saga', 'ticket', 'release T-19']
      ],
      steps: [
        {
          title: 'Open the package saga',
          narration: 'PKG-8 starts with a durable pointer to the first local transaction.',
          action: null,
          states: {
            saga: {package: 'PKG-8', next: 'RESERVE_TICKET', completed: '0'},
            ticket: {ticketT19: 'AVAILABLE', pkg8: 'NONE'},
            train: {seatC7: 'AVAILABLE', pkg8: 'NONE'},
            hotel: {roomH3: 'AVAILABLE', pkg8: 'NONE'}
          },
          outcome: 'Recovery can resume PKG-8 without a global database transaction.',
          invariant: 'Progress is durable before a command may be retried.'
        },
        {
          title: 'Reserve the concert ticket',
          narration: 'The box office commits its own transaction; the reservation is now externally visible.',
          action: ['saga', 'ticket', 'reserve T-19'],
          states: {
            saga: {package: 'PKG-8', next: 'BOOK_TRAIN', completed: 'TICKET'},
            ticket: {ticketT19: 'HELD_PKG8', pkg8: 'COMMITTED'},
            train: {seatC7: 'AVAILABLE', pkg8: 'NONE'},
            hotel: {roomH3: 'AVAILABLE', pkg8: 'NONE'}
          },
          outcome: 'Ticket success does not imply package success.',
          invariant: 'Every committed forward step has a defined semantic compensation.'
        },
        {
          title: 'Book the train',
          narration: 'Rail booking commits seat C7 and the saga advances to the hotel.',
          action: ['saga', 'train', 'book seat C7'],
          states: {
            saga: {package: 'PKG-8', next: 'BOOK_HOTEL', completed: 'TICKET,TRAIN'},
            ticket: {ticketT19: 'HELD_PKG8', pkg8: 'COMMITTED'},
            train: {seatC7: 'BOOKED_PKG8', pkg8: 'COMMITTED'},
            hotel: {roomH3: 'AVAILABLE', pkg8: 'NONE'}
          },
          outcome: 'Two independent local commits exist at once.',
          invariant: 'Forward steps execute in saga order and are idempotent.'
        },
        {
          title: 'Detect the sold-out hotel',
          narration: 'Room H-3 is sold before the command arrives, so PKG-8 records failure and switches direction.',
          action: ['saga', 'hotel', 'book room H-3'],
          states: {
            saga: {package: 'PKG-8', next: 'COMPENSATE_TRAIN', completed: 'TICKET,TRAIN;HOTEL_FAILED'},
            ticket: {ticketT19: 'HELD_PKG8', pkg8: 'COMMITTED'},
            train: {seatC7: 'BOOKED_PKG8', pkg8: 'COMMITTED'},
            hotel: {roomH3: 'SOLD_OTHER', pkg8: 'REJECTED'}
          },
          outcome: 'The saga cannot roll back databases; it must issue business cancellations.',
          invariant: 'A failed later step never erases earlier committed facts.'
        },
        {
          title: 'Compensate in reverse order',
          narration: 'The train is canceled first and the ticket is then released, with each result recorded.',
          action: ['saga', 'ticket', 'release T-19'],
          states: {
            saga: {package: 'PKG-8', next: 'NONE', completed: 'COMPENSATED'},
            ticket: {ticketT19: 'AVAILABLE', pkg8: 'RELEASED'},
            train: {seatC7: 'AVAILABLE', pkg8: 'CANCELED'},
            hotel: {roomH3: 'SOLD_OTHER', pkg8: 'REJECTED'}
          },
          outcome: 'PKG-8 ends consistently, although its intermediate reservations were visible.',
          invariant: 'Compensations are durable, idempotent, and applied in reverse dependency order.'
        }
      ]
    },

    'distributed-transactions::Choreography': {
      family: 'workflow',
      scenario: 'A farm-box subscription activates through domain events without a central workflow owner.',
      entities: [
        ['subscription', 'Subscription ledger', 'commits subscription SUB-31', 15, 18],
        ['eventBus', 'Farm event stream', 'delivers keyed domain events', 50, 50],
        ['harvest', 'Harvest allocator', 'assigns weekly crate C-88', 84, 18],
        ['courier', 'Courier schedule', 'creates Friday stop D-14', 84, 82],
        ['billing', 'Billing ledger', 'charges invoice INV-31', 15, 82]
      ],
      connections: [
        ['subscription', 'eventBus', 'SubscriptionStarted'],
        ['eventBus', 'harvest', 'SubscriptionStarted'],
        ['harvest', 'eventBus', 'CrateAllocated'],
        ['eventBus', 'courier', 'CrateAllocated'],
        ['courier', 'eventBus', 'DeliveryScheduled'],
        ['eventBus', 'billing', 'DeliveryScheduled']
      ],
      steps: [
        {
          title: 'Commit the subscription',
          narration: 'The subscription ledger creates SUB-31 and emits a fact after its local commit.',
          action: ['subscription', 'eventBus', 'SubscriptionStarted'],
          states: {
            subscription: {sub31: 'ACTIVE', weeklyBoxes: '1'},
            eventBus: {offset: '501', lastEvent: 'SubscriptionStarted'},
            harvest: {crateC88: 'UNASSIGNED', sub31: 'NONE'},
            courier: {stopD14: 'EMPTY', sub31: 'NONE'},
            billing: {invoice31: 'ABSENT', balance: '$0'}
          },
          outcome: 'No coordinator tells downstream owners what to do.',
          invariant: 'An event describes a committed fact, not a request for an uncommitted change.'
        },
        {
          title: 'Allocate produce reactively',
          narration: 'Harvest consumes SubscriptionStarted and commits crate C-88 for SUB-31.',
          action: ['eventBus', 'harvest', 'SubscriptionStarted'],
          states: {
            subscription: {sub31: 'ACTIVE', weeklyBoxes: '1'},
            eventBus: {offset: '502', lastEvent: 'CrateAllocated'},
            harvest: {crateC88: 'ALLOCATED_SUB31', sub31: 'READY'},
            courier: {stopD14: 'EMPTY', sub31: 'NONE'},
            billing: {invoice31: 'ABSENT', balance: '$0'}
          },
          outcome: 'Harvest advances the workflow using only the event contract.',
          invariant: 'Consumers deduplicate by event identity before committing local effects.'
        },
        {
          title: 'Schedule delivery',
          narration: 'Courier reacts to CrateAllocated and reserves stop D-14.',
          action: ['eventBus', 'courier', 'CrateAllocated'],
          states: {
            subscription: {sub31: 'ACTIVE', weeklyBoxes: '1'},
            eventBus: {offset: '503', lastEvent: 'DeliveryScheduled'},
            harvest: {crateC88: 'ALLOCATED_SUB31', sub31: 'READY'},
            courier: {stopD14: 'FRI_14:00_SUB31', sub31: 'SCHEDULED'},
            billing: {invoice31: 'ABSENT', balance: '$0'}
          },
          outcome: 'The global path emerges from subscriptions rather than one visible state machine.',
          invariant: 'Every event handler commits locally before publishing its successor fact.'
        },
        {
          title: 'Charge after scheduling',
          narration: 'Billing consumes DeliveryScheduled and captures the weekly fee.',
          action: ['eventBus', 'billing', 'DeliveryScheduled'],
          states: {
            subscription: {sub31: 'ACTIVE', weeklyBoxes: '1'},
            eventBus: {offset: '503', lastEvent: 'DeliveryScheduled'},
            harvest: {crateC88: 'ALLOCATED_SUB31', sub31: 'READY'},
            courier: {stopD14: 'FRI_14:00_SUB31', sub31: 'SCHEDULED'},
            billing: {invoice31: 'PAID', balance: '$24'}
          },
          outcome: 'SUB-31 is operational across four autonomous owners.',
          invariant: 'Event ordering for SUB-31 is preserved by its stream key.'
        },
        {
          title: 'Ignore duplicate delivery',
          narration: 'A redelivered DeliveryScheduled event is recognized by its event ID and does not charge twice.',
          action: ['eventBus', 'billing', 'DeliveryScheduled duplicate'],
          states: {
            subscription: {sub31: 'ACTIVE', weeklyBoxes: '1'},
            eventBus: {offset: '504', lastEvent: 'DeliveryScheduled_DUPLICATE'},
            harvest: {crateC88: 'ALLOCATED_SUB31', sub31: 'READY'},
            courier: {stopD14: 'FRI_14:00_SUB31', sub31: 'SCHEDULED'},
            billing: {invoice31: 'PAID_DEDUPED', balance: '$24'}
          },
          outcome: 'At-least-once delivery does not create a second $24 charge.',
          invariant: 'Each subscriber owns durable idempotency for the events it consumes.'
        }
      ]
    },

    'distributed-transactions::Orchestration': {
      family: 'workflow',
      scenario: 'A passport renewal coordinator orders photo review, fee capture, printing, and recovery.',
      entities: [
        ['orchestrator', 'Renewal workflow', 'owns durable state for APP-73', 15, 50],
        ['photo', 'Photo review desk', 'validates portrait P-73', 48, 15],
        ['payment', 'Fee ledger', 'captures charge CH-73', 82, 50],
        ['printer', 'Passport printer', 'prints booklet B-73', 48, 85]
      ],
      connections: [
        ['orchestrator', 'photo', 'ReviewPhoto APP-73'],
        ['photo', 'orchestrator', 'PhotoAccepted'],
        ['orchestrator', 'payment', 'CaptureFee CH-73'],
        ['payment', 'orchestrator', 'FeeCaptured'],
        ['orchestrator', 'printer', 'PrintBooklet B-73'],
        ['printer', 'orchestrator', 'BookletPrinted']
      ],
      steps: [
        {
          title: 'Persist the workflow',
          narration: 'The coordinator stores APP-73 and its first command before dispatch.',
          action: null,
          states: {
            orchestrator: {application: 'APP-73', phase: 'PHOTO_PENDING', attempt: '1'},
            photo: {portraitP73: 'UPLOADED', review: 'NONE'},
            payment: {chargeCH73: 'ABSENT', amount: '$130'},
            printer: {bookletB73: 'NOT_QUEUED', pages: '0'}
          },
          outcome: 'A crash cannot lose which command must run next.',
          invariant: 'Workflow state and command identity are durable before delivery.'
        },
        {
          title: 'Accept the portrait',
          narration: 'Photo review handles a correlated command and returns PhotoAccepted.',
          action: ['photo', 'orchestrator', 'PhotoAccepted'],
          states: {
            orchestrator: {application: 'APP-73', phase: 'FEE_PENDING', attempt: '1'},
            photo: {portraitP73: 'ACCEPTED', review: 'RV-900'},
            payment: {chargeCH73: 'ABSENT', amount: '$130'},
            printer: {bookletB73: 'NOT_QUEUED', pages: '0'}
          },
          outcome: 'The coordinator makes the global next step explicit.',
          invariant: 'Replies advance only the matching application and command.'
        },
        {
          title: 'Capture the renewal fee',
          narration: 'The fee ledger captures exactly $130 under stable charge ID CH-73.',
          action: ['orchestrator', 'payment', 'CaptureFee CH-73'],
          states: {
            orchestrator: {application: 'APP-73', phase: 'PRINT_PENDING', attempt: '1'},
            photo: {portraitP73: 'ACCEPTED', review: 'RV-900'},
            payment: {chargeCH73: 'CAPTURED', amount: '$130'},
            printer: {bookletB73: 'NOT_QUEUED', pages: '0'}
          },
          outcome: 'Payment success is recorded before printing is commanded.',
          invariant: 'Command handlers are idempotent under their stable business IDs.'
        },
        {
          title: 'Recover a printing timeout',
          narration: 'No reply arrives, so the coordinator reloads PRINT_PENDING and retries B-73.',
          action: ['orchestrator', 'printer', 'PrintBooklet B-73 retry'],
          states: {
            orchestrator: {application: 'APP-73', phase: 'PRINT_PENDING', attempt: '2'},
            photo: {portraitP73: 'ACCEPTED', review: 'RV-900'},
            payment: {chargeCH73: 'CAPTURED', amount: '$130'},
            printer: {bookletB73: 'PRINTING', pages: '12'}
          },
          outcome: 'Recovery resumes the pending transition instead of restarting the renewal.',
          invariant: 'A timeout means outcome unknown, not operation failed.'
        },
        {
          title: 'Complete once',
          narration: 'The printer returns BookletPrinted; a duplicate reply cannot advance APP-73 again.',
          action: ['printer', 'orchestrator', 'BookletPrinted'],
          states: {
            orchestrator: {application: 'APP-73', phase: 'COMPLETE', attempt: '2'},
            photo: {portraitP73: 'ACCEPTED', review: 'RV-900'},
            payment: {chargeCH73: 'CAPTURED', amount: '$130'},
            printer: {bookletB73: 'PRINTED', pages: '24'}
          },
          outcome: 'APP-73 finishes with one fee and one booklet.',
          invariant: 'Terminal workflow state is durable and duplicate replies are harmless.'
        }
      ]
    },

    'distributed-transactions::Compensating transactions': {
      family: 'transaction',
      scenario: 'A bakery cancels a wedding order after flour was allocated and a courier deposit was paid.',
      entities: [
        ['ledger', 'Wedding order ledger', 'tracks WO-55 and reverse actions', 15, 50],
        ['pantry', 'Bakery pantry', 'allocates 20 kg flour', 48, 15],
        ['courier', 'Courier account', 'holds a $60 delivery deposit', 82, 50],
        ['refunds', 'Refund journal', 'proves each compensation once', 48, 85]
      ],
      connections: [
        ['ledger', 'pantry', 'allocate 20 kg'],
        ['ledger', 'courier', 'pay deposit DEP-55'],
        ['ledger', 'courier', 'refund DEP-55'],
        ['ledger', 'pantry', 'return usable flour'],
        ['refunds', 'ledger', 'record compensation result']
      ],
      steps: [
        {
          title: 'Commit the ingredient allocation',
          narration: 'The pantry removes 20 kg from free stock for WO-55.',
          action: ['ledger', 'pantry', 'allocate 20 kg'],
          states: {
            ledger: {order: 'WO-55', phase: 'BAKING_PLANNED', compensations: '0/2'},
            pantry: {freeFlourKg: '80', wo55FlourKg: '20'},
            courier: {depositDEP55: 'ABSENT', accountBalance: '$0'},
            refunds: {dep55: 'NONE', flourReturn: 'NONE'}
          },
          outcome: 'The allocation is a committed business fact, not an open database transaction.',
          invariant: 'Compensation must respect current business reality rather than erase history.'
        },
        {
          title: 'Pay the courier deposit',
          narration: 'A second local transaction transfers the nonzero delivery deposit.',
          action: ['ledger', 'courier', 'pay deposit DEP-55'],
          states: {
            ledger: {order: 'WO-55', phase: 'DELIVERY_BOOKED', compensations: '0/2'},
            pantry: {freeFlourKg: '80', wo55FlourKg: '20'},
            courier: {depositDEP55: 'PAID', accountBalance: '$60'},
            refunds: {dep55: 'NONE', flourReturn: 'NONE'}
          },
          outcome: 'Two effects must be counteracted if the order is canceled.',
          invariant: 'Every reverse action has a stable idempotency key.'
        },
        {
          title: 'Record customer cancellation',
          narration: 'The customer cancels after 5 kg was already mixed, changing what restoration is possible.',
          action: null,
          states: {
            ledger: {order: 'WO-55', phase: 'COMPENSATING', compensations: '0/2'},
            pantry: {freeFlourKg: '80', wo55FlourKg: '15_USABLE_5_MIXED'},
            courier: {depositDEP55: 'PAID', accountBalance: '$60'},
            refunds: {dep55: 'PENDING', flourReturn: 'PENDING'}
          },
          outcome: 'Exact rollback is impossible because consumed flour cannot be un-mixed.',
          invariant: 'The compensating plan is based on present state and domain policy.'
        },
        {
          title: 'Refund the deposit idempotently',
          narration: 'Refund key REF-DEP-55 returns $60; a retry observes the existing journal row.',
          action: ['ledger', 'courier', 'refund DEP-55'],
          states: {
            ledger: {order: 'WO-55', phase: 'COMPENSATING', compensations: '1/2'},
            pantry: {freeFlourKg: '80', wo55FlourKg: '15_USABLE_5_MIXED'},
            courier: {depositDEP55: 'REFUNDED', accountBalance: '$0'},
            refunds: {dep55: 'REF-DEP-55_$60', flourReturn: 'PENDING'}
          },
          outcome: 'The courier balance is restored without a double refund.',
          invariant: 'Repeating REF-DEP-55 produces the same single financial effect.'
        },
        {
          title: 'Return what remains',
          narration: 'The pantry returns 15 usable kilograms and records 5 kilograms as cancellation waste.',
          action: ['ledger', 'pantry', 'return usable flour'],
          states: {
            ledger: {order: 'WO-55', phase: 'CANCELED', compensations: '2/2'},
            pantry: {freeFlourKg: '95', wo55FlourKg: '0;WASTE_5'},
            courier: {depositDEP55: 'REFUNDED', accountBalance: '$0'},
            refunds: {dep55: 'REF-DEP-55_$60', flourReturn: 'RET-55_15KG'}
          },
          outcome: 'The order resolves honestly: money restored, reusable stock returned, waste retained.',
          invariant: 'Completion records both successful compensation and irrecoverable residual effects.'
        }
      ]
    },

    'distributed-transactions::Transactional outbox': {
      family: 'transaction',
      scenario: 'A bike shop commits sale S-91 and its BikeSold event without a database-message dual write.',
      entities: [
        ['sales', 'Sales database', 'stores sale S-91', 15, 20],
        ['outbox', 'Outbox table', 'stores event EVT-91 in the same transaction', 48, 20],
        ['relay', 'Outbox relay', 'publishes pending rows with retries', 82, 50],
        ['broker', 'Retail event stream', 'retains BikeSold events', 48, 82],
        ['loyalty', 'Loyalty ledger', 'awards points once per event ID', 15, 82]
      ],
      connections: [
        ['sales', 'outbox', 'commit sale + EVT-91'],
        ['outbox', 'relay', 'claim EVT-91'],
        ['relay', 'broker', 'publish BikeSold EVT-91'],
        ['broker', 'loyalty', 'deliver EVT-91'],
        ['relay', 'outbox', 'mark EVT-91 published']
      ],
      steps: [
        {
          title: 'Open one local transaction',
          narration: 'The checkout begins a database transaction for bicycle B-17.',
          action: null,
          states: {
            sales: {saleS91: 'UNCOMMITTED', bikeB17: 'IN_STOCK'},
            outbox: {eventEVT91: 'ABSENT', pendingRows: '0'},
            relay: {cursor: '900', attempt: '0'},
            broker: {eventEVT91: 'ABSENT', offset: '1200'},
            loyalty: {customerC4Points: '200', evt91: 'UNSEEN'}
          },
          outcome: 'No externally visible fact exists yet.',
          invariant: 'Business state and publication intent share one atomic database commit.'
        },
        {
          title: 'Commit sale and event intent',
          narration: 'Sale S-91 and outbox row EVT-91 become durable in the same commit.',
          action: ['sales', 'outbox', 'commit sale + EVT-91'],
          states: {
            sales: {saleS91: 'COMMITTED_$900', bikeB17: 'SOLD'},
            outbox: {eventEVT91: 'PENDING_BikeSold', pendingRows: '1'},
            relay: {cursor: '900', attempt: '0'},
            broker: {eventEVT91: 'ABSENT', offset: '1200'},
            loyalty: {customerC4Points: '200', evt91: 'UNSEEN'}
          },
          outcome: 'A crash cannot leave a sold bike with no durable event intent.',
          invariant: 'Every committed sale has exactly one stable outbox event identity.'
        },
        {
          title: 'Publish after commit',
          narration: 'The relay claims EVT-91 and sends BikeSold to the event stream.',
          action: ['relay', 'broker', 'publish BikeSold EVT-91'],
          states: {
            sales: {saleS91: 'COMMITTED_$900', bikeB17: 'SOLD'},
            outbox: {eventEVT91: 'IN_FLIGHT', pendingRows: '1'},
            relay: {cursor: '901', attempt: '1'},
            broker: {eventEVT91: 'STORED', offset: '1201'},
            loyalty: {customerC4Points: '200', evt91: 'UNSEEN'}
          },
          outcome: 'Publication is asynchronous and can be at least once.',
          invariant: 'The relay never publishes an outbox row before its enclosing commit.'
        },
        {
          title: 'Survive a lost acknowledgement',
          narration: 'The relay retries EVT-91 because the broker acknowledgement was lost.',
          action: ['relay', 'broker', 'publish BikeSold EVT-91 retry'],
          states: {
            sales: {saleS91: 'COMMITTED_$900', bikeB17: 'SOLD'},
            outbox: {eventEVT91: 'IN_FLIGHT_RETRY', pendingRows: '1'},
            relay: {cursor: '901', attempt: '2'},
            broker: {eventEVT91: 'STORED_DUPLICATE_DELIVERY', offset: '1202'},
            loyalty: {customerC4Points: '290', evt91: 'APPLIED_ONCE'}
          },
          outcome: 'The consumer awards 90 points once despite redelivery.',
          invariant: 'Consumers deduplicate stable event IDs; the outbox does not promise exactly-once delivery.'
        },
        {
          title: 'Mark publication complete',
          narration: 'After acknowledgement, the relay marks EVT-91 published for retention cleanup.',
          action: ['relay', 'outbox', 'mark EVT-91 published'],
          states: {
            sales: {saleS91: 'COMMITTED_$900', bikeB17: 'SOLD'},
            outbox: {eventEVT91: 'PUBLISHED', pendingRows: '0'},
            relay: {cursor: '902', attempt: '2'},
            broker: {eventEVT91: 'STORED', offset: '1202'},
            loyalty: {customerC4Points: '290', evt91: 'APPLIED_ONCE'}
          },
          outcome: 'The pipeline converges without a distributed transaction with the broker.',
          invariant: 'Published marking is retryable and never changes the committed sale.'
        }
      ]
    },

    'distributed-transactions::MVCC': {
      family: 'storage',
      scenario: 'A library catalog lets a long report read book availability while a checkout creates a newer row version.',
      entities: [
        ['versions', 'Book version chain', 'stores committed versions of BK-10', 18, 50],
        ['report', 'Morning circulation report', 'reads snapshot timestamp 40', 50, 15],
        ['checkout', 'Checkout transaction', 'creates the timestamp-43 version', 82, 50],
        ['vacuum', 'Version vacuum', 'reclaims versions no snapshot needs', 50, 85]
      ],
      connections: [
        ['report', 'versions', 'read BK-10 at ts=40'],
        ['checkout', 'versions', 'append BK-10 v43'],
        ['versions', 'report', 'return visible v38'],
        ['vacuum', 'versions', 'reclaim obsolete v38']
      ],
      steps: [
        {
          title: 'Pin a read snapshot',
          narration: 'The report starts at timestamp 40 and sees BK-10 version 38 as available.',
          action: ['report', 'versions', 'read BK-10 at ts=40'],
          states: {
            versions: {bk10Versions: 'v38:AVAILABLE', newestCommit: '38'},
            report: {snapshotTs: '40', bk10Seen: 'AVAILABLE'},
            checkout: {txTs: '42', bk10Write: 'NONE'},
            vacuum: {oldestSnapshotTs: '40', reclaimable: '0'}
          },
          outcome: 'The report has a stable visibility boundary.',
          invariant: 'A reader sees the newest committed version not newer than its snapshot.'
        },
        {
          title: 'Create instead of overwrite',
          narration: 'Checkout transaction 42 writes a private BK-10 version while v38 remains intact.',
          action: ['checkout', 'versions', 'append BK-10 v43'],
          states: {
            versions: {bk10Versions: 'v38:AVAILABLE,v43:UNCOMMITTED', newestCommit: '38'},
            report: {snapshotTs: '40', bk10Seen: 'AVAILABLE'},
            checkout: {txTs: '42', bk10Write: 'CHECKED_OUT_BY_MAYA'},
            vacuum: {oldestSnapshotTs: '40', reclaimable: '0'}
          },
          outcome: 'Readers and the writer coexist without in-place overwrite.',
          invariant: 'Uncommitted versions are invisible to other transactions.'
        },
        {
          title: 'Commit the new version',
          narration: 'The checkout commits version 43 with borrower Maya.',
          action: ['checkout', 'versions', 'append BK-10 v43 commit'],
          states: {
            versions: {bk10Versions: 'v38:AVAILABLE,v43:CHECKED_OUT_MAYA', newestCommit: '43'},
            report: {snapshotTs: '40', bk10Seen: 'AVAILABLE'},
            checkout: {txTs: '42', bk10Write: 'COMMITTED_AT_43'},
            vacuum: {oldestSnapshotTs: '40', reclaimable: '0'}
          },
          outcome: 'New transactions see v43 while the report still sees v38.',
          invariant: 'Commit adds a visibility interval; it does not rewrite an older snapshot.'
        },
        {
          title: 'Preserve repeatable reading',
          narration: 'The report rereads BK-10 and still receives v38 because timestamp 43 is in its future.',
          action: ['versions', 'report', 'return visible v38'],
          states: {
            versions: {bk10Versions: 'v38:AVAILABLE,v43:CHECKED_OUT_MAYA', newestCommit: '43'},
            report: {snapshotTs: '40', bk10Seen: 'AVAILABLE_AGAIN'},
            checkout: {txTs: '42', bk10Write: 'COMMITTED_AT_43'},
            vacuum: {oldestSnapshotTs: '40', reclaimable: '0'}
          },
          outcome: 'The long report is internally consistent without blocking checkout.',
          invariant: 'Visibility is determined by version timestamps and transaction ownership.'
        },
        {
          title: 'Reclaim after snapshot release',
          narration: 'When the report ends, no active snapshot needs v38 and vacuum removes it.',
          action: ['vacuum', 'versions', 'reclaim obsolete v38'],
          states: {
            versions: {bk10Versions: 'v43:CHECKED_OUT_MAYA', newestCommit: '43'},
            report: {snapshotTs: 'RELEASED', bk10Seen: 'AVAILABLE_FINAL'},
            checkout: {txTs: '42', bk10Write: 'COMMITTED_AT_43'},
            vacuum: {oldestSnapshotTs: '44', reclaimable: '0'}
          },
          outcome: 'Storage is recovered only after visibility safety permits it.',
          invariant: 'Vacuum never removes a version visible to any active snapshot.'
        }
      ]
    },

    'distributed-transactions::Snapshot isolation': {
      family: 'transaction',
      scenario: 'Two veterinarians independently take the last two surgeons off call, demonstrating write skew.',
      entities: [
        ['roster', 'Surgery roster', 'stores Alice and Ben on-call flags', 18, 50],
        ['txAlice', 'Alice leave transaction', 'reads snapshot S=70 and updates Alice', 50, 15],
        ['txBen', 'Ben leave transaction', 'reads snapshot S=70 and updates Ben', 82, 50],
        ['constraint', 'Coverage rule', 'requires at least one surgeon on call', 50, 85]
      ],
      connections: [
        ['txAlice', 'roster', 'read roster at S=70'],
        ['txBen', 'roster', 'read roster at S=70'],
        ['txAlice', 'roster', 'write Alice=OFF'],
        ['txBen', 'roster', 'write Ben=OFF'],
        ['roster', 'constraint', 'evaluate coverage']
      ],
      steps: [
        {
          title: 'Start from valid coverage',
          narration: 'Both surgeons are on call when snapshot 70 is established.',
          action: null,
          states: {
            roster: {alice: 'ON', ben: 'ON', commitTs: '70'},
            txAlice: {snapshot: '70', seesOnCall: '2', write: 'NONE'},
            txBen: {snapshot: '70', seesOnCall: '2', write: 'NONE'},
            constraint: {minimum: '1', actual: '2'}
          },
          outcome: 'The coverage invariant initially holds.',
          invariant: 'Each transaction reads one stable committed snapshot.'
        },
        {
          title: 'Alice approves leave',
          narration: 'Alice sees Ben on call and prepares to set only her own row to OFF.',
          action: ['txAlice', 'roster', 'read roster at S=70'],
          states: {
            roster: {alice: 'ON', ben: 'ON', commitTs: '70'},
            txAlice: {snapshot: '70', seesOnCall: '2', write: 'ALICE_OFF'},
            txBen: {snapshot: '70', seesOnCall: '2', write: 'NONE'},
            constraint: {minimum: '1', actual: '2'}
          },
          outcome: 'Alice reasons correctly within snapshot 70.',
          invariant: 'Reads do not change when concurrent transactions later commit.'
        },
        {
          title: 'Ben approves leave',
          narration: 'Ben sees Alice on call in the same snapshot and writes a different row.',
          action: ['txBen', 'roster', 'read roster at S=70'],
          states: {
            roster: {alice: 'ON', ben: 'ON', commitTs: '70'},
            txAlice: {snapshot: '70', seesOnCall: '2', write: 'ALICE_OFF'},
            txBen: {snapshot: '70', seesOnCall: '2', write: 'BEN_OFF'},
            constraint: {minimum: '1', actual: '2'}
          },
          outcome: 'The transactions do not have a direct write-write conflict.',
          invariant: 'Snapshot isolation commonly rejects concurrent writes to the same item, not disjoint items.'
        },
        {
          title: 'Commit both disjoint writes',
          narration: 'Alice commits at 71 and Ben commits at 72 because their write sets do not overlap.',
          action: ['txBen', 'roster', 'write Ben=OFF'],
          states: {
            roster: {alice: 'OFF@71', ben: 'OFF@72', commitTs: '72'},
            txAlice: {snapshot: '70', seesOnCall: '2', write: 'COMMITTED_71'},
            txBen: {snapshot: '70', seesOnCall: '2', write: 'COMMITTED_72'},
            constraint: {minimum: '1', actual: '0'}
          },
          outcome: 'Write skew violates coverage despite repeatable reads and no dirty data.',
          invariant: 'Snapshot isolation alone does not guarantee arbitrary cross-row invariants.'
        },
        {
          title: 'Make the conflict explicit',
          narration: 'A repair transaction restores Ben and future leave requests lock a shared coverage row.',
          action: ['constraint', 'roster', 'restore Ben + lock coverage'],
          states: {
            roster: {alice: 'OFF@71', ben: 'ON@73', commitTs: '73'},
            txAlice: {snapshot: '70', seesOnCall: '2', write: 'COMMITTED_71'},
            txBen: {snapshot: '70', seesOnCall: '2', write: 'REPAIRED_73'},
            constraint: {minimum: '1', actual: '1;LOCK_ROW_ENABLED'}
          },
          outcome: 'Materializing the invariant creates a write conflict that snapshot isolation can detect.',
          invariant: 'Critical predicates require explicit locking, constraint design, or serializable isolation.'
        }
      ]
    },

    'distributed-transactions::Serializable transactions': {
      family: 'transaction',
      scenario: 'Two bidders concurrently try to buy the final numbered charity print for different prices.',
      entities: [
        ['print', 'Print inventory row', 'stores ownership of print #1', 18, 50],
        ['bidA', 'Nora purchase transaction', 'offers $500', 50, 15],
        ['bidB', 'Omar purchase transaction', 'offers $550', 82, 50],
        ['serialGuard', 'Serialization guard', 'tracks read-write conflicts', 50, 85]
      ],
      connections: [
        ['bidA', 'print', 'read owner=NULL'],
        ['bidB', 'print', 'read owner=NULL'],
        ['bidA', 'serialGuard', 'register predicate read'],
        ['bidB', 'serialGuard', 'validate write'],
        ['serialGuard', 'bidB', 'abort serialization failure']
      ],
      steps: [
        {
          title: 'Begin concurrent purchases',
          narration: 'Nora and Omar start while print #1 is unsold.',
          action: null,
          states: {
            print: {print1Owner: 'NONE', salePrice: '$0', version: '10'},
            bidA: {buyer: 'NORA', offer: '$500', phase: 'ACTIVE'},
            bidB: {buyer: 'OMAR', offer: '$550', phase: 'ACTIVE'},
            serialGuard: {edges: 'NONE', serialOrder: 'UNDECIDED'}
          },
          outcome: 'Concurrency is allowed until conflicts require ordering.',
          invariant: 'Committed behavior must equal some one-at-a-time execution.'
        },
        {
          title: 'Track Nora read',
          narration: 'Nora reads owner=NULL and the engine records the read dependency.',
          action: ['bidA', 'serialGuard', 'register predicate read'],
          states: {
            print: {print1Owner: 'NONE', salePrice: '$0', version: '10'},
            bidA: {buyer: 'NORA', offer: '$500', phase: 'READ_AVAILABLE'},
            bidB: {buyer: 'OMAR', offer: '$550', phase: 'ACTIVE'},
            serialGuard: {edges: 'NORA_READ_PRINT1', serialOrder: 'UNDECIDED'}
          },
          outcome: 'The read is evidence used during commit validation.',
          invariant: 'Relevant reads and writes participate in concurrency control.'
        },
        {
          title: 'Commit Omar first',
          narration: 'Omar writes ownership and commits version 11 before Nora validates.',
          action: ['bidB', 'print', 'write owner=OMAR'],
          states: {
            print: {print1Owner: 'OMAR', salePrice: '$550', version: '11'},
            bidA: {buyer: 'NORA', offer: '$500', phase: 'VALIDATING'},
            bidB: {buyer: 'OMAR', offer: '$550', phase: 'COMMITTED'},
            serialGuard: {edges: 'NORA_READ_PRINT1->OMAR_WRITE', serialOrder: 'OMAR_FIRST'}
          },
          outcome: 'Omar establishes the candidate serial order.',
          invariant: 'Only one committed transaction may consume the final print.'
        },
        {
          title: 'Abort the incompatible commit',
          narration: 'Nora validation detects that her decision depended on the pre-Omar version and aborts.',
          action: ['serialGuard', 'bidA', 'abort serialization failure'],
          states: {
            print: {print1Owner: 'OMAR', salePrice: '$550', version: '11'},
            bidA: {buyer: 'NORA', offer: '$500', phase: 'ABORTED_SERIALIZATION'},
            bidB: {buyer: 'OMAR', offer: '$550', phase: 'COMMITTED'},
            serialGuard: {edges: 'RESOLVED_BY_ABORT_NORA', serialOrder: 'OMAR_FIRST'}
          },
          outcome: 'The engine sacrifices one transaction rather than commit a nonserializable history.',
          invariant: 'Serialization failures are expected control flow and must be retried as whole transactions.'
        },
        {
          title: 'Retry against the winner',
          narration: 'Nora retries, now reads owner=OMAR, and records a clean sold-out result.',
          action: ['bidA', 'print', 'retry read owner=OMAR'],
          states: {
            print: {print1Owner: 'OMAR', salePrice: '$550', version: '11'},
            bidA: {buyer: 'NORA', offer: '$500', phase: 'COMMITTED_SOLD_OUT'},
            bidB: {buyer: 'OMAR', offer: '$550', phase: 'COMMITTED'},
            serialGuard: {edges: 'ACYCLIC', serialOrder: 'OMAR_THEN_NORA'}
          },
          outcome: 'The final state matches Omar followed by Nora.',
          invariant: 'Retries re-execute all reads under a fresh serializable transaction.'
        }
      ]
    },

    'advanced-senior-staff-level-concepts::Sagas': {
      family: 'workflow',
      scenario: 'Checkout CO-204 coordinates Order, Inventory, and Payment through a durable saga log.',
      entities: [
        ['sagaLog', 'Checkout saga log', 'stores commands, replies, and compensation for CO-204', 14, 50],
        ['order', 'Order ledger', 'owns order O-204', 45, 15],
        ['inventory', 'Inventory ledger', 'owns stock for SKU-RED', 82, 50],
        ['payment', 'Payment ledger', 'owns charge PAY-204', 45, 85]
      ],
      connections: [
        ['sagaLog', 'order', 'CreateOrder O-204'],
        ['sagaLog', 'inventory', 'Reserve SKU-RED x1'],
        ['sagaLog', 'payment', 'Charge PAY-204'],
        ['sagaLog', 'inventory', 'Release reservation R-204'],
        ['sagaLog', 'order', 'CancelOrder O-204'],
        ['payment', 'sagaLog', 'PaymentDeclined PAY-204']
      ],
      steps: [
        {
          title: 'Start durable checkout',
          narration: 'The saga log records CO-204 and command CreateOrder before sending it.',
          action: ['sagaLog', 'order', 'CreateOrder O-204'],
          states: {
            sagaLog: {saga: 'CO-204', phase: 'CREATE_ORDER_SENT', commandSeq: '1'},
            order: {orderO204: 'PENDING', total: '$75'},
            inventory: {skuRedAvailable: '9', reservationR204: 'NONE'},
            payment: {chargePAY204: 'NONE', amount: '$75'}
          },
          outcome: 'The order is visibly PENDING while the checkout continues.',
          invariant: 'The saga log persists intent before each externally retried command.'
        },
        {
          title: 'Reserve inventory',
          narration: 'Inventory commits reservation R-204, reducing available units from 9 to 8.',
          action: ['sagaLog', 'inventory', 'Reserve SKU-RED x1'],
          states: {
            sagaLog: {saga: 'CO-204', phase: 'INVENTORY_RESERVED', commandSeq: '2'},
            order: {orderO204: 'PENDING', total: '$75'},
            inventory: {skuRedAvailable: '8', reservationR204: 'HELD_1'},
            payment: {chargePAY204: 'NONE', amount: '$75'}
          },
          outcome: 'A real intermediate hold is visible before payment succeeds.',
          invariant: 'Reservation R-204 is idempotent and has a matching release command.'
        },
        {
          title: 'Record failed payment',
          narration: 'Payment rejects the card and stores DECLINED for stable charge ID PAY-204.',
          action: ['payment', 'sagaLog', 'PaymentDeclined PAY-204'],
          states: {
            sagaLog: {saga: 'CO-204', phase: 'COMPENSATE_INVENTORY', commandSeq: '3;PAYMENT_FAILED'},
            order: {orderO204: 'PENDING', total: '$75'},
            inventory: {skuRedAvailable: '8', reservationR204: 'HELD_1'},
            payment: {chargePAY204: 'DECLINED', amount: '$75'}
          },
          outcome: 'The failed charge becomes durable before compensation starts.',
          invariant: 'A DECLINED charge is never treated as an unknown timeout.'
        },
        {
          title: 'Compensate visible effects',
          narration: 'The saga releases R-204 and cancels O-204, recording each reverse result.',
          action: ['sagaLog', 'inventory', 'Release reservation R-204'],
          states: {
            sagaLog: {saga: 'CO-204', phase: 'COMPENSATED', commandSeq: '5;RELEASED,CANCELED'},
            order: {orderO204: 'CANCELED_PAYMENT_DECLINED', total: '$75'},
            inventory: {skuRedAvailable: '9', reservationR204: 'RELEASED'},
            payment: {chargePAY204: 'DECLINED', amount: '$75'}
          },
          outcome: 'Stock returns to 9 and the pending order reaches a truthful terminal state.',
          invariant: 'Compensation completes in reverse dependency order and never deletes audit facts.'
        },
        {
          title: 'Retry compensation idempotently',
          narration: 'After a lost acknowledgement, Release R-204 is retried; inventory returns the prior result without adding stock.',
          action: ['sagaLog', 'inventory', 'Release reservation R-204 retry'],
          states: {
            sagaLog: {saga: 'CO-204', phase: 'COMPENSATED_ACKED', commandSeq: '5;RETRY_DEDUPED'},
            order: {orderO204: 'CANCELED_PAYMENT_DECLINED', total: '$75'},
            inventory: {skuRedAvailable: '9', reservationR204: 'RELEASED_DEDUPED'},
            payment: {chargePAY204: 'DECLINED', amount: '$75'}
          },
          outcome: 'The retry proves idempotency: available inventory remains 9, not 10.',
          invariant: 'Every forward and compensating command is keyed so retries preserve exactly one business effect.'
        }
      ]
    },

    'advanced-senior-staff-level-concepts::Transactional outbox': {
      family: 'transaction',
      scenario: 'A payroll platform emits SalaryAdjusted while preserving tenant order, lease ownership, and relay observability.',
      entities: [
        ['payroll', 'Payroll database', 'stores employee E-77 salary', 12, 20],
        ['outbox', 'Payroll outbox', 'stores tenant-sequenced event EVT-700', 42, 20],
        ['relay', 'Partitioned relay', 'leases tenant ACME rows', 75, 20],
        ['stream', 'Payroll event stream', 'retains ACME events in sequence', 75, 80],
        ['analytics', 'Compensation projection', 'deduplicates and advances per-tenant offset', 20, 80]
      ],
      connections: [
        ['payroll', 'outbox', 'commit salary + tenantSeq=44'],
        ['outbox', 'relay', 'lease ACME batch'],
        ['relay', 'stream', 'publish EVT-700 seq=44'],
        ['stream', 'analytics', 'deliver EVT-700'],
        ['relay', 'outbox', 'record publish attempt']
      ],
      steps: [
        {
          title: 'Commit ordered intent',
          narration: 'One transaction raises E-77 to $142,000 and inserts ACME event sequence 44.',
          action: ['payroll', 'outbox', 'commit salary + tenantSeq=44'],
          states: {
            payroll: {employeeE77Salary: '$142000', revision: '18'},
            outbox: {evt700: 'PENDING', tenantSeq: 'ACME:44'},
            relay: {lease: 'NONE', attempts: '0'},
            stream: {acmeHighWater: '43', evt700: 'ABSENT'},
            analytics: {employeeE77Salary: '$138000', acmeOffset: '43'}
          },
          outcome: 'The integration fact cannot be lost independently of payroll revision 18.',
          invariant: 'The outbox row contains stable identity, aggregate revision, tenant sequence, and payload.'
        },
        {
          title: 'Lease without double ownership',
          narration: 'Relay shard R3 leases ACME sequence 44 until 13:05:30.',
          action: ['outbox', 'relay', 'lease ACME batch'],
          states: {
            payroll: {employeeE77Salary: '$142000', revision: '18'},
            outbox: {evt700: 'LEASED_R3_UNTIL_13:05:30', tenantSeq: 'ACME:44'},
            relay: {lease: 'R3:EVT-700', attempts: '1'},
            stream: {acmeHighWater: '43', evt700: 'ABSENT'},
            analytics: {employeeE77Salary: '$138000', acmeOffset: '43'}
          },
          outcome: 'Horizontal relays avoid racing on the same pending row.',
          invariant: 'An expired lease permits takeover; a live lease has one owner.'
        },
        {
          title: 'Publish with ordering key',
          narration: 'R3 publishes EVT-700 keyed by ACME and includes sequence 44.',
          action: ['relay', 'stream', 'publish EVT-700 seq=44'],
          states: {
            payroll: {employeeE77Salary: '$142000', revision: '18'},
            outbox: {evt700: 'LEASED_R3_UNTIL_13:05:30', tenantSeq: 'ACME:44'},
            relay: {lease: 'R3:EVT-700', attempts: '1'},
            stream: {acmeHighWater: '44', evt700: 'STORED_PARTITION_6'},
            analytics: {employeeE77Salary: '$138000', acmeOffset: '43'}
          },
          outcome: 'Tenant ordering survives relay parallelism.',
          invariant: 'Events for one ordering scope use the same partition key and monotonic sequence.'
        },
        {
          title: 'Measure a lost acknowledgement',
          narration: 'The acknowledgement is lost, so the lease expires and R8 republishes with attempt telemetry.',
          action: ['relay', 'stream', 'republish EVT-700 attempt=2'],
          states: {
            payroll: {employeeE77Salary: '$142000', revision: '18'},
            outbox: {evt700: 'LEASED_R8_UNTIL_13:06:10', tenantSeq: 'ACME:44'},
            relay: {lease: 'R8:EVT-700', attempts: '2'},
            stream: {acmeHighWater: '44', evt700: 'DELIVERED_TWICE'},
            analytics: {employeeE77Salary: '$142000', acmeOffset: '44;DEDUP_EVT700'}
          },
          outcome: 'Analytics advances once while operators can see retry age and attempt count.',
          invariant: 'Delivery is at least once; consumers deduplicate by event ID and reject sequence regressions.'
        },
        {
          title: 'Close and retain evidence',
          narration: 'R8 marks EVT-700 published but retains its timestamps for lag and audit reporting.',
          action: ['relay', 'outbox', 'record publish attempt'],
          states: {
            payroll: {employeeE77Salary: '$142000', revision: '18'},
            outbox: {evt700: 'PUBLISHED_13:05:42', tenantSeq: 'ACME:44'},
            relay: {lease: 'RELEASED', attempts: '2'},
            stream: {acmeHighWater: '44', evt700: 'STORED_PARTITION_6'},
            analytics: {employeeE77Salary: '$142000', acmeOffset: '44;DEDUP_EVT700'}
          },
          outcome: 'The design is operable: backlog, oldest age, retries, and sequence gaps are measurable.',
          invariant: 'Cleanup occurs only after publish evidence meets the retention policy.'
        }
      ]
    },

    'distributed-messaging-eventing::Event sourcing': {
      family: 'storage',
      scenario: 'A community bank reconstructs account A-12 from immutable deposits, withdrawals, and a snapshot.',
      entities: [
        ['command', 'Account command handler', 'validates withdrawal W-9', 15, 20],
        ['eventStore', 'Account event stream', 'is authoritative for A-12', 50, 20],
        ['projection', 'Balance projector', 'folds events in stream order', 82, 50],
        ['readModel', 'Balance read model', 'serves the current customer view', 50, 82],
        ['snapshot', 'Aggregate snapshot', 'accelerates replay at version 20', 15, 82]
      ],
      connections: [
        ['snapshot', 'command', 'load A-12 at v20'],
        ['eventStore', 'command', 'replay events 21-22'],
        ['command', 'eventStore', 'append MoneyWithdrawn v23'],
        ['eventStore', 'projection', 'project v23'],
        ['projection', 'readModel', 'set balance $640']
      ],
      steps: [
        {
          title: 'Load snapshot and tail',
          narration: 'The handler loads snapshot v20 at $800, then replays a $100 deposit and $60 withdrawal.',
          action: ['eventStore', 'command', 'replay events 21-22'],
          states: {
            command: {account: 'A-12', aggregateVersion: '22', balance: '$840'},
            eventStore: {a12Tail: 'v21:+$100,v22:-$60', streamVersion: '22'},
            projection: {checkpoint: '22', computedBalance: '$840'},
            readModel: {accountA12Balance: '$840', version: '22'},
            snapshot: {version: '20', balance: '$800'}
          },
          outcome: 'Current aggregate state is derived, not read from a mutable authoritative row.',
          invariant: 'Replaying the same ordered facts produces the same account state.'
        },
        {
          title: 'Validate the command',
          narration: 'Withdrawal W-9 requests $200; the reconstructed $840 balance satisfies the no-overdraft rule.',
          action: ['snapshot', 'command', 'load A-12 at v20'],
          states: {
            command: {account: 'A-12', aggregateVersion: '22', balance: '$840;W9_VALID'},
            eventStore: {a12Tail: 'v21:+$100,v22:-$60', streamVersion: '22'},
            projection: {checkpoint: '22', computedBalance: '$840'},
            readModel: {accountA12Balance: '$840', version: '22'},
            snapshot: {version: '20', balance: '$800'}
          },
          outcome: 'Business validation uses reconstructed aggregate state.',
          invariant: 'Commands express intent; only accepted outcomes become immutable events.'
        },
        {
          title: 'Append with expected version',
          narration: 'MoneyWithdrawn $200 appends as v23 only if the stream is still at expected version 22.',
          action: ['command', 'eventStore', 'append MoneyWithdrawn v23'],
          states: {
            command: {account: 'A-12', aggregateVersion: '23', balance: '$640'},
            eventStore: {a12Tail: 'v21:+$100,v22:-$60,v23:-$200', streamVersion: '23'},
            projection: {checkpoint: '22', computedBalance: '$840'},
            readModel: {accountA12Balance: '$840', version: '22'},
            snapshot: {version: '20', balance: '$800'}
          },
          outcome: 'Optimistic concurrency prevents two writers from silently forking A-12.',
          invariant: 'Events append; previously committed account facts are never updated in place.'
        },
        {
          title: 'Update the projection asynchronously',
          narration: 'The projector consumes v23 and writes the query-optimized balance.',
          action: ['eventStore', 'projection', 'project v23'],
          states: {
            command: {account: 'A-12', aggregateVersion: '23', balance: '$640'},
            eventStore: {a12Tail: 'v21:+$100,v22:-$60,v23:-$200', streamVersion: '23'},
            projection: {checkpoint: '23', computedBalance: '$640'},
            readModel: {accountA12Balance: '$640', version: '23'},
            snapshot: {version: '20', balance: '$800'}
          },
          outcome: 'The read model catches up from $840 to $640 and can be rebuilt if corrupted.',
          invariant: 'Projection handlers are idempotent and checkpoint only after applying an event.'
        },
        {
          title: 'Rebuild from history',
          narration: 'A repair clears the projection and replays through v23, reproducing $640.',
          action: ['projection', 'readModel', 'set balance $640 after replay'],
          states: {
            command: {account: 'A-12', aggregateVersion: '23', balance: '$640'},
            eventStore: {a12Tail: 'v21:+$100,v22:-$60,v23:-$200', streamVersion: '23'},
            projection: {checkpoint: '23_REBUILT', computedBalance: '$640'},
            readModel: {accountA12Balance: '$640_REBUILT', version: '23'},
            snapshot: {version: '20', balance: '$800'}
          },
          outcome: 'Immutable history repairs the derived view and supports new projections.',
          invariant: 'Snapshots optimize replay but never replace the authoritative event stream.'
        }
      ]
    }
  };

  window.SYSTEM_DESIGN_LESSONS = Object.assign(
    window.SYSTEM_DESIGN_LESSONS || {},
    lessons
  );
}());
