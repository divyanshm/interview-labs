(function () {
  "use strict";

  var lessons = {};

  function entityTuple(entity) {
    if (Array.isArray(entity)) {
      return [entity[0], entity[1], entity[2], entity[3], entity[4]];
    }
    return [entity.id, entity.label, entity.role, entity.x, entity.y];
  }

  function connectionTuple(connection) {
    if (Array.isArray(connection)) {
      return [connection[0], connection[1], connection[2]];
    }
    return [connection.from, connection.to, connection.relation];
  }

  function selectEntities(entities) {
    var tuples = entities.map(entityTuple);
    if (tuples.length <= 9) return tuples;

    // Keep both the structural head and the semantic controls at the tail.
    return tuples.slice(0, 5).concat(tuples.slice(tuples.length - 4));
  }

  function stateValue(snapshot, id, index) {
    var match;
    if (Object.prototype.hasOwnProperty.call(snapshot, id)) return JSON.stringify(snapshot[id]);
    if (snapshot.pages && Object.prototype.hasOwnProperty.call(snapshot.pages, id)) return JSON.stringify(snapshot.pages[id]);
    if (snapshot.replicas && Object.prototype.hasOwnProperty.call(snapshot.replicas, id)) return JSON.stringify(snapshot.replicas[id]);
    if (snapshot.distances && Object.prototype.hasOwnProperty.call(snapshot.distances, id)) return String(snapshot.distances[id]);
    if (snapshot.parent && Object.prototype.hasOwnProperty.call(snapshot.parent, id)) return String(snapshot.parent[id]);
    match = /^b(\d+)$/.exec(id);
    if (match && snapshot.bits) return String(snapshot.bits[Number(match[1])]);
    if (match && snapshot.counters) return String(snapshot.counters[Number(match[1])]);
    if (match && snapshot.buckets) return JSON.stringify(snapshot.buckets[Number(match[1])]);
    match = /^r(\d+)$/.exec(id);
    if (match && snapshot.registers) return String(snapshot.registers[Number(match[1])]);
    if (snapshot.windows && snapshot.windows[index]) return JSON.stringify(snapshot.windows[index]);
    if (snapshot.sessions && snapshot.sessions[index]) return JSON.stringify(snapshot.sessions[index]);
    if (snapshot.levels && snapshot.levels[index]) return JSON.stringify(snapshot.levels[index]);
    return JSON.stringify(snapshot);
  }

  function actionTuple(action, entities, index) {
    var from;
    var to;
    var label;
    var ids = entities.map(function (entity) { return entity[0]; });
    if (action === null) return null;
    if (Array.isArray(action)) return [action[0], action[1], action[2]];

    from = ids.indexOf(action.from) >= 0 ? action.from : ids[0];
    to = ids.indexOf(action.to) >= 0 ? action.to : ids[(index % (ids.length - 1)) + 1];
    label = action.type || "advance";
    Object.keys(action).forEach(function (key) {
      if (key !== "type" && key !== "from" && key !== "to") {
        label += " " + key + "=" + JSON.stringify(action[key]);
      }
    });
    return [from, to, label];
  }

  function add(chapter, concept, family, scenario, entities, connections, steps) {
    var entityTuples = selectEntities(entities);
    var ids = new Set(entityTuples.map(function (entity) { return entity[0]; }));
    var connectionTuples = connections.map(connectionTuple).filter(function (connection) {
      return ids.has(connection[0]) && ids.has(connection[1]);
    });

    lessons[chapter + "::" + concept] = {
      family: family,
      scenario: scenario,
      entities: entityTuples,
      connections: connectionTuples,
      steps: steps.map(function (currentStep, stepIndex) {
        var sourceSnapshot = currentStep.states;
        var states = {};
        entityTuples.forEach(function (entity, entityIndex) {
          states[entity[0]] = {
            phase: stepIndex + 1,
            value: stateValue(sourceSnapshot, entity[0], entityIndex),
            snapshot: JSON.stringify(sourceSnapshot)
          };
        });
        return {
          title: currentStep.title,
          narration: currentStep.narration,
          action: actionTuple(currentStep.action, entityTuples, stepIndex),
          states: states,
          outcome: currentStep.outcome,
          invariant: currentStep.invariant
        };
      })
    };
  }

  function step(title, narration, action, states, outcome, invariant) {
    return {
      title: title,
      narration: narration,
      action: action,
      states: states,
      outcome: outcome,
      invariant: invariant
    };
  }

  function bits(n) {
    var result = [];
    for (var i = 0; i < n; i += 1) {
      result.push({ id: "b" + i, label: String(i), role: "bit", x: 7 + i * 7.7, y: 52 });
    }
    return result;
  }

  function lineConnections(prefix, n, relation) {
    var result = [];
    for (var i = 0; i < n - 1; i += 1) {
      result.push({ from: prefix + i, to: prefix + (i + 1), relation: relation });
    }
    return result;
  }

  var bloomEntities = bits(12).concat([
    { id: "input", label: "key", role: "input", x: 8, y: 15 },
    { id: "h1", label: "h1", role: "hash", x: 36, y: 25 },
    { id: "h2", label: "h2", role: "hash", x: 52, y: 25 },
    { id: "h3", label: "h3", role: "hash", x: 68, y: 25 }
  ]);
  var bloomConnections = lineConnections("b", 12, "adjacent-bit").concat([
    { from: "input", to: "h1", relation: "hash" },
    { from: "input", to: "h2", relation: "hash" },
    { from: "input", to: "h3", relation: "hash" },
    { from: "h1", to: "b2", relation: "index" },
    { from: "h2", to: "b5", relation: "index" },
    { from: "h3", to: "b9", relation: "index" }
  ]);

  lessons["probabilistic-data-structures::Bloom filter"] = {
    family: "cache",
    scenario: "A session service uses one Bloom filter per tenant partition to reject definitely absent session IDs before reading its authoritative database.",
    entities: [
      ["client", "API client", "Requests a session by tenant and session ID", 8, 50],
      ["api", "Session service", "Owns the read path and treats the filter as a negative cache", 30, 50],
      ["directory", "Partition directory", "Maps tenant IDs to filter and database partitions", 52, 18],
      ["filter", "Bloom filter shard", "Answers definitely absent or maybe present for one partition", 52, 78],
      ["db", "Session database", "Authoritative source for session existence and payload", 78, 50],
      ["builder", "Filter builder", "Builds new generations from snapshots and committed inserts", 90, 82]
    ],
    connections: [
      ["client", "api", "GET tenant-7/session/s77"],
      ["api", "directory", "resolve tenant-7 to partition P3"],
      ["directory", "filter", "select Bloom generation P3-g18"],
      ["api", "filter", "mightContain(session ID)"],
      ["api", "db", "read only when filter says maybe"],
      ["db", "builder", "snapshot and committed insert stream"],
      ["builder", "filter", "publish rebuilt generation atomically"]
    ],
    steps: [
      {
        title: "Partitioned filters are ready",
        narration: "The service keeps a small Bloom filter for each database partition rather than one globally contended filter.",
        action: null,
        states: {
          client: { request: "idle", response: "—" },
          api: { route: "idle", databaseReads: "0" },
          directory: { tenant7: "partition P3", generation: "18" },
          filter: { partition: "P3", occupancy: "31%", estimatedFPR: "1.2%" },
          db: { partition: "P3", sessions: "8.4M" },
          builder: { source: "snapshot + inserts", checkpoint: "LSN 920" }
        },
        outcome: "Filter memory and rebuild work are isolated by partition.",
        invariant: "The directory must route a request to the filter generation built from the same logical database partition."
      },
      {
        title: "Route the request",
        narration: "A request for tenant-7 session s77 resolves to partition P3 before the service probes the filter.",
        action: ["api", "directory", "resolve tenant-7 → P3 / generation 18"],
        states: {
          client: { request: "GET s77", response: "waiting" },
          api: { route: "resolving tenant-7", databaseReads: "0" },
          directory: { tenant7: "partition P3", generation: "18" },
          filter: { partition: "P3", occupancy: "31%", estimatedFPR: "1.2%" },
          db: { partition: "P3", sessions: "8.4M" },
          builder: { source: "snapshot + inserts", checkpoint: "LSN 920" }
        },
        outcome: "The service selects P3-g18 without broadcasting to every filter.",
        invariant: "Partitioning reduces memory and rebuild blast radius but requires consistent routing metadata."
      },
      {
        title: "Definite miss skips the database",
        narration: "The P3 filter finds at least one zero bit for s77, proving that s77 was not inserted into this generation.",
        action: ["api", "filter", "mightContain(s77) → definitely absent"],
        states: {
          client: { request: "GET s77", response: "404 session not found" },
          api: { route: "short-circuit negative", databaseReads: "0" },
          directory: { tenant7: "partition P3", generation: "18" },
          filter: { partition: "P3", verdict: "definitely absent", estimatedFPR: "1.2%" },
          db: { partition: "P3", reads: "0" },
          builder: { source: "snapshot + inserts", checkpoint: "LSN 920" }
        },
        outcome: "The service returns without spending a database read.",
        invariant: "A Bloom filter is useful here only if the system prevents false negatives."
      },
      {
        title: "Maybe present requires verification",
        narration: "Session ghost42 maps only to set bits. That is not proof of existence, so the service reads the authoritative database.",
        action: ["api", "db", "SELECT ghost42 after maybe-present verdict"],
        states: {
          client: { request: "GET ghost42", response: "waiting" },
          api: { route: "verify maybe", databaseReads: "1" },
          directory: { tenant7: "partition P3", generation: "18" },
          filter: { partition: "P3", verdict: "maybe present", estimatedFPR: "1.2%" },
          db: { partition: "P3", result: "not found" },
          builder: { source: "snapshot + inserts", checkpoint: "LSN 920" }
        },
        outcome: "The database exposes a harmless false positive; the client still receives a correct 404.",
        invariant: "Never treat maybe present as an authoritative positive."
      },
      {
        title: "Real positive reaches the database",
        narration: "Session s42 also produces maybe present, and the database confirms the row and returns its payload.",
        action: ["api", "db", "SELECT s42 → active session"],
        states: {
          client: { request: "GET s42", response: "200 active session" },
          api: { route: "verified positive", databaseReads: "2 total" },
          directory: { tenant7: "partition P3", generation: "18" },
          filter: { partition: "P3", verdict: "maybe present", estimatedFPR: "1.2%" },
          db: { partition: "P3", result: "s42 active" },
          builder: { source: "snapshot + inserts", checkpoint: "LSN 920" }
        },
        outcome: "The filter saves negative reads while preserving database authority for positive answers.",
        invariant: "Bloom filters optimize absence-heavy workloads; they do not replace the source of truth."
      },
      {
        title: "Rebuild instead of clearing bits",
        narration: "Deletes and rising occupancy trigger a background rebuild because clearing a shared bit could create a false negative for another key.",
        action: ["db", "builder", "build P3 generation 19 from snapshot @ LSN 1040"],
        states: {
          client: { request: "normal traffic", response: "served via g18" },
          api: { route: "continue on generation 18", databaseReads: "metered" },
          directory: { tenant7: "partition P3", generation: "18 active / 19 building" },
          filter: { partition: "P3", occupancy: "67%", estimatedFPR: "30.1%" },
          db: { partition: "P3", snapshot: "LSN 1040" },
          builder: { source: "snapshot + insert catch-up", checkpoint: "LSN 1032" }
        },
        outcome: "Generation 18 remains readable while generation 19 catches up.",
        invariant: "Standard Bloom filters cannot safely delete individual keys by clearing shared bits."
      },
      {
        title: "Publish a healthier generation",
        narration: "After replay reaches the database checkpoint, the directory atomically switches P3 to a larger, lower-occupancy filter.",
        action: ["builder", "filter", "publish P3-g19 and retire g18"],
        states: {
          client: { request: "normal traffic", response: "served via g19" },
          api: { route: "generation 19", databaseReads: "reduced" },
          directory: { tenant7: "partition P3", generation: "19" },
          filter: { partition: "P3", occupancy: "29%", estimatedFPR: "0.9%" },
          db: { partition: "P3", snapshot: "authoritative" },
          builder: { source: "complete", checkpoint: "LSN 1040" }
        },
        outcome: "False-positive pressure falls without interrupting the request path.",
        invariant: "Publish a rebuilt filter only after it includes every committed insert through its cutover checkpoint."
      }
    ]
  };

  add("probabilistic-data-structures", "Counting Bloom filter", "counters",
    "A cache tracks membership while allowing session IDs to be removed.",
    bits(8).map(function (e) { e.role = "counter"; return e; }).concat([
      { id: "a", label: "A", role: "key", x: 18, y: 15 },
      { id: "b", label: "B", role: "key", x: 72, y: 15 }
    ]),
    lineConnections("b", 8, "adjacent-counter").concat([
      { from: "a", to: "b1", relation: "hash" }, { from: "a", to: "b4", relation: "hash" },
      { from: "a", to: "b6", relation: "hash" }, { from: "b", to: "b1", relation: "hash" },
      { from: "b", to: "b3", relation: "hash" }, { from: "b", to: "b6", relation: "hash" }
    ]), [
      step("Zero counters", "Each position stores a small integer rather than one bit.", null,
        { counters: [0,0,0,0,0,0,0,0], key: null, hashes: [], operation: "idle", verdict: "empty" },
        "The multiset is empty.", "No counter is negative."),
      step("Insert A", "A increments counters 1, 4, and 6.", { type: "increment", key: "A" },
        { counters: [0,1,0,0,1,0,1,0], key: "A", hashes: [1,4,6], operation: "insert", verdict: "present" },
        "A is represented.", "Insertion increments every hashed counter once."),
      step("Insert B", "B overlaps A at positions 1 and 6 and also increments position 3.", { type: "increment", key: "B" },
        { counters: [0,2,0,1,1,0,2,0], key: "B", hashes: [1,3,6], operation: "insert", verdict: "present" },
        "Shared positions record multiplicity two.", "Counters preserve overlap information."),
      step("Delete A", "Removing A decrements only its three counters.", { type: "decrement", key: "A" },
        { counters: [0,1,0,1,0,0,1,0], key: "A", hashes: [1,4,6], operation: "delete", verdict: "removed" },
        "A disappears without erasing B's shared evidence.", "Deletion never clears another key's positive contribution."),
      step("Query B", "All of B's counters remain positive after A is removed.", { type: "query", key: "B" },
        { counters: [0,1,0,1,0,0,1,0], key: "B", hashes: [1,3,6], operation: "query", verdict: "possibly-present" },
        "B remains possibly present.", "A zero counter is definitive absence; positives remain probabilistic.")
    ]);

  add("probabilistic-data-structures", "Cuckoo filter", "bits",
    "A CDN keeps compact fingerprints and supports deletion.",
    [
      { id: "k", label: "asset-17", role: "input", x: 8, y: 12 },
      { id: "b0", label: "bucket 0", role: "bucket", x: 12, y: 48 },
      { id: "b1", label: "bucket 1", role: "bucket", x: 36, y: 48 },
      { id: "b2", label: "bucket 2", role: "bucket", x: 60, y: 48 },
      { id: "b3", label: "bucket 3", role: "bucket", x: 84, y: 48 }
    ], [
      { from: "k", to: "b1", relation: "primary-index" },
      { from: "k", to: "b3", relation: "alternate-index" },
      { from: "b1", to: "b3", relation: "fingerprint-xor-alternate" }
    ], [
      step("Existing table", "Each bucket has two fingerprint slots; bucket 1 is full.", null,
        { buckets: [["3a",null],["91","2c"],["e4",null],[null,null]], key: null, fingerprint: null, candidates: [], evicted: null, verdict: "ready" },
        "Three fingerprints occupy the table.", "Every stored fingerprint resides in one of its two candidate buckets."),
      step("Fingerprint key", "asset-17 becomes fingerprint 7f with candidates bucket 1 and bucket 3.", { type: "fingerprint", key: "asset-17" },
        { buckets: [["3a",null],["91","2c"],["e4",null],[null,null]], key: "asset-17", fingerprint: "7f", candidates: [1,3], evicted: null, verdict: "pending" },
        "Two legal locations are known.", "The alternate index is primary XOR hash(fingerprint)."),
      step("Use alternate", "The primary bucket is full, so 7f enters empty slot 0 of bucket 3.", { type: "insert", bucket: 3, slot: 0 },
        { buckets: [["3a",null],["91","2c"],["e4",null],["7f",null]], key: "asset-17", fingerprint: "7f", candidates: [1,3], evicted: null, verdict: "inserted" },
        "Insertion succeeds without relocation.", "A fingerprint is written only to a candidate bucket."),
      step("Relocate on collision", "A later fingerprint d2 evicts 2c from bucket 1; 2c moves to its alternate bucket 2.", { type: "kick", from: 1, to: 2 },
        { buckets: [["3a",null],["91","d2"],["e4","2c"],["7f",null]], key: "asset-22", fingerprint: "d2", candidates: [1,0], evicted: "2c", verdict: "relocated" },
        "The cuckoo path frees a legal slot.", "After each kick, the evicted fingerprint moves to its alternate bucket."),
      step("Delete fingerprint", "Deleting asset-17 removes only fingerprint 7f from bucket 3.", { type: "delete", bucket: 3, fingerprint: "7f" },
        { buckets: [["3a",null],["91","d2"],["e4","2c"],[null,null]], key: "asset-17", fingerprint: "7f", candidates: [1,3], evicted: null, verdict: "absent" },
        "The filter supports deletion without counters.", "Deletion checks only the two candidate buckets.")
    ]);

  var registerEntities = [];
  for (var r = 0; r < 8; r += 1) {
    registerEntities.push({ id: "r" + r, label: "R" + r, role: "register", x: 8 + r * 12, y: 52 });
  }
  add("probabilistic-data-structures", "HyperLogLog", "counters",
    "An analytics service estimates unique visitors without retaining IDs.",
    registerEntities.concat([{ id: "hash", label: "64-bit hash", role: "hash", x: 42, y: 15 }]),
    registerEntities.map(function (e) { return { from: "hash", to: e.id, relation: "prefix-selects-register" }; }), [
      step("Empty registers", "Eight registers begin at zero.", null,
        { registers: [0,0,0,0,0,0,0,0], item: null, prefix: null, rank: null, rawEstimate: 0, estimate: 0 },
        "No cardinality is observed.", "Registers store maxima, never individual IDs."),
      step("Observe u17", "The hash prefix 010 selects R2; the suffix has rank 3.", { type: "observe", item: "u17" },
        { registers: [0,0,3,0,0,0,0,0], item: "u17", prefix: 2, rank: 3, rawEstimate: 6.2, estimate: 1 },
        "R2 records rank 3.", "A register is max(previous rank, observed rank)."),
      step("Observe more IDs", "Independent hashes spread visitors and raise several maxima.", { type: "observe-batch", items: ["u4","u9","u31","u52"] },
        { registers: [1,2,3,0,1,4,0,2], item: "u52", prefix: 5, rank: 4, rawEstimate: 9.7, estimate: 5 },
        "Five distinct observations shape the register vector.", "Repeated IDs produce the same register/rank pair."),
      step("Ignore a duplicate", "u17 hashes exactly as before, leaving R2 at 3.", { type: "observe", item: "u17" },
        { registers: [1,2,3,0,1,4,0,2], item: "u17", prefix: 2, rank: 3, rawEstimate: 9.7, estimate: 5 },
        "The estimate is unchanged.", "Duplicate observations are idempotent."),
      step("Harmonic estimate", "The harmonic mean of 2^-register produces the corrected cardinality estimate.", { type: "estimate" },
        { registers: [1,2,3,0,1,4,0,2], item: null, prefix: null, rank: null, rawEstimate: 9.7, estimate: 7 },
        "The sketch reports about seven unique visitors.", "Estimation depends only on the complete register vector.")
    ]);

  add("probabilistic-data-structures", "Count-Min Sketch", "counters",
    "A telemetry pipeline estimates request frequency for hot keys.",
    [
      { id: "row0", label: "h0: 0 0 0 0 0", role: "counter-row", x: 50, y: 30 },
      { id: "row1", label: "h1: 0 0 0 0 0", role: "counter-row", x: 50, y: 50 },
      { id: "row2", label: "h2: 0 0 0 0 0", role: "counter-row", x: 50, y: 70 },
      { id: "key", label: "GET /feed", role: "input", x: 10, y: 15 }
    ], [
      { from: "key", to: "row0", relation: "hash-column" },
      { from: "key", to: "row1", relation: "hash-column" },
      { from: "key", to: "row2", relation: "hash-column" }
    ], [
      step("Zero matrix", "Three hash rows and five columns begin at zero.", null,
        { matrix: [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]], key: null, columns: [], increments: 0, rowValues: [], estimate: 0 },
        "The sketch has no traffic.", "All counters are nonnegative."),
      step("Count feed", "GET /feed maps to columns 1, 3, and 0 and increments each.", { type: "increment", key: "GET /feed" },
        { matrix: [[0,1,0,0,0],[0,0,0,1,0],[1,0,0,0,0]], key: "GET /feed", columns: [1,3,0], increments: 1, rowValues: [1,1,1], estimate: 1 },
        "The estimated frequency is one.", "Each update touches one counter per row."),
      step("Accumulate traffic", "Four more feed requests raise the same three counters to five.", { type: "increment", key: "GET /feed", amount: 4 },
        { matrix: [[0,5,0,0,0],[0,0,0,5,0],[5,0,0,0,0]], key: "GET /feed", columns: [1,3,0], increments: 5, rowValues: [5,5,5], estimate: 5 },
        "The sketch reports five.", "Counters never decrease in the standard sketch."),
      step("Collision adds noise", "GET /home collides in row 0 column 1 but uses other columns in rows 1 and 2.", { type: "increment", key: "GET /home", amount: 2 },
        { matrix: [[0,7,0,0,0],[0,0,2,5,0],[5,0,0,0,2]], key: "GET /home", columns: [1,2,4], increments: 2, rowValues: [7,2,2], estimate: 2 },
        "Only one feed counter is polluted.", "Collisions can overcount but never undercount."),
      step("Take row minimum", "Querying feed reads 7, 5, and 5; the minimum limits collision error.", { type: "query", key: "GET /feed" },
        { matrix: [[0,7,0,0,0],[0,0,2,5,0],[5,0,0,0,2]], key: "GET /feed", columns: [1,3,0], increments: 0, rowValues: [7,5,5], estimate: 5 },
        "The correct estimate remains five.", "The estimate is the minimum of the selected row counters.")
    ]);

  add("probabilistic-data-structures", "Reservoir sampling", "counters",
    "A log service keeps a uniform sample of three events from an unbounded stream.",
    [
      { id: "stream", label: "e1 e2 e3 e4 e5 e6", role: "stream", x: 40, y: 15 },
      { id: "s0", label: "slot 0", role: "reservoir-slot", x: 25, y: 58 },
      { id: "s1", label: "slot 1", role: "reservoir-slot", x: 50, y: 58 },
      { id: "s2", label: "slot 2", role: "reservoir-slot", x: 75, y: 58 }
    ], [
      { from: "stream", to: "s0", relation: "candidate" },
      { from: "stream", to: "s1", relation: "candidate" },
      { from: "stream", to: "s2", relation: "candidate" }
    ], [
      step("Fill slot zero", "The first event occupies the first of k=3 slots.", { type: "accept", event: "e1" },
        { seen: 1, capacity: 3, reservoir: ["e1",null,null], candidate: "e1", draw: null, probability: 1, replaced: null },
        "e1 is retained.", "The first k events are admitted directly."),
      step("Fill reservoir", "Events e2 and e3 complete the initial sample.", { type: "accept", events: ["e2","e3"] },
        { seen: 3, capacity: 3, reservoir: ["e1","e2","e3"], candidate: "e3", draw: null, probability: 1, replaced: null },
        "All three slots are occupied.", "After k arrivals, every seen item is represented."),
      step("Replace for e4", "For item 4, draw j=1 from [0,3]; because j<3, slot 1 is replaced.", { type: "draw", event: "e4", draw: 1 },
        { seen: 4, capacity: 3, reservoir: ["e1","e4","e3"], candidate: "e4", draw: 1, probability: 0.75, replaced: "e2" },
        "e4 replaces e2.", "Each of four seen items has retention probability 3/4."),
      step("Skip e5", "For item 5, draw j=4; j is outside the reservoir, so no slot changes.", { type: "draw", event: "e5", draw: 4 },
        { seen: 5, capacity: 3, reservoir: ["e1","e4","e3"], candidate: "e5", draw: 4, probability: 0.6, replaced: null },
        "The sample stays unchanged.", "Acceptance probability at item i is k/i."),
      step("Replace for e6", "For item 6, draw j=0 and replace slot zero.", { type: "draw", event: "e6", draw: 0 },
        { seen: 6, capacity: 3, reservoir: ["e6","e4","e3"], candidate: "e6", draw: 0, probability: 0.5, replaced: "e1" },
        "The final sample is e6, e4, e3.", "Every one of six events has equal probability 3/6 of retention.")
    ]);

  add("probabilistic-data-structures", "Quotient filter", "bits",
    "A cache admission index stores hash remainders in quotient-clustered slots while preserving enough metadata for lookup and deletion.",
    [
      ["hash","h(key)=q|r","hash split",8,12],
      ["s0","slot0 q0","quotient slot",20,62],
      ["s1","slot1 q1","quotient slot",36,78],
      ["s2","slot2 q2","quotient slot",52,62],
      ["s3","slot3 q3","quotient slot",68,78],
      ["s4","slot4 q4","quotient slot",84,62]
    ], [
      ["hash","s0","quotient 0 home"],["hash","s1","quotient 1 home"],
      ["hash","s2","quotient 2 home"],["s1","s2","shifted cluster"],
      ["s2","s3","run continuation"],["s3","s4","shifted cluster"]
    ], [
      step("Empty quotient table", "Five slots begin with empty remainder fields and metadata bits occupied, continuation, and shifted all clear.", null,
        { slots:[null,null,null,null,null],meta:[[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]],key:null,quotient:null,remainder:null,run:[],verdict:"empty" },
        "No quotient has an occupied run.", "An empty slot has no remainder and no metadata bits."),
      step("Insert first fingerprint", "Hash 01|101 has quotient 1 and remainder 5, so remainder 5 occupies its home slot 1.", ["hash","s1","insert q1 remainder 5"],
        { slots:[null,5,null,null,null],meta:[[0,0,0],[1,0,0],[0,0,0],[0,0,0],[0,0,0]],key:"A",quotient:1,remainder:5,run:[1],verdict:"inserted at home" },
        "Quotient 1 now owns a one-element run.", "The first remainder in a run has continuation=0."),
      step("Extend the same run", "Hash 01|010 shares quotient 1; remainder 2 sorts before 5 and shifts remainder 5 to slot 2.", ["s1","s2","shift remainder 5 right"],
        { slots:[null,2,5,null,null],meta:[[0,0,0],[1,0,0],[0,1,1],[0,0,0],[0,0,0]],key:"B",quotient:1,remainder:2,run:[1,2],verdict:"run sorted" },
        "The q1 run is [2,5], with the displaced element marked shifted and continuation.", "Remainders inside one quotient run remain sorted."),
      step("Create an adjacent run", "Hash 10|011 has quotient 2; its home slot is occupied, so remainder 3 shifts to slot 3 and starts q2's run.", ["s2","s3","insert shifted q2 remainder 3"],
        { slots:[null,2,5,3,null],meta:[[0,0,0],[1,0,0],[1,1,1],[0,0,1],[0,0,0]],key:"C",quotient:2,remainder:3,run:[3],verdict:"cluster extended" },
        "One cluster now contains the q1 and q2 runs.", "Occupied marks a quotient home even when that quotient's first remainder is shifted elsewhere."),
      step("Lookup by run scan", "Lookup B splits to q1,r2, finds q1's run boundary, and matches remainder 2 before entering q2.", ["hash","s1","scan q1 run for remainder 2"],
        { slots:[null,2,5,3,null],meta:[[0,0,0],[1,0,0],[1,1,1],[0,0,1],[0,0,0]],key:"B",quotient:1,remainder:2,run:[1,2],verdict:"possibly present" },
        "The compact fingerprint is found without storing the original key.", "Lookup scans only the target quotient's sorted run; fingerprint collisions remain possible.")
    ]);

  add("probabilistic-data-structures", "Heavy hitters", "counters",
    "A telemetry stream uses four Space-Saving counters to retain likely high-frequency endpoint keys under bounded memory.",
    [
      ["stream","A B A C A D E A","key stream",8,14],
      ["c0","slot0 key/count/error","tracked counter",24,66],
      ["c1","slot1 key/count/error","tracked counter",44,82],
      ["c2","slot2 key/count/error","tracked counter",64,66],
      ["c3","slot3 key/count/error","tracked counter",84,82],
      ["min","minimum slot","replacement pointer",50,38]
    ], [
      ["stream","c0","observe key"],["stream","c1","observe key"],
      ["stream","c2","observe key"],["stream","c3","observe key"],
      ["min","c0","replace minimum"],["min","c3","replace minimum"]
    ], [
      step("Fill bounded counters", "The first distinct keys A, B, C, and D occupy the four available slots.", ["stream","c0","admit A,B,C,D"],
        { seen:4,slots:[["A",1,0],["B",1,0],["C",1,0],["D",1,0]],minimum:1,key:"D",truth:{A:1,B:1,C:1,D:1},reported:[] },
        "All observed keys are represented while capacity remains.", "Each slot stores key, estimated count, and insertion error."),
      step("Increment tracked keys", "Two more A events update A in place from one to three.", ["stream","c0","increment A twice"],
        { seen:6,slots:[["A",3,0],["B",1,0],["C",1,0],["D",1,0]],minimum:1,key:"A",truth:{A:3,B:1,C:1,D:1},reported:[] },
        "A separates from the one-count tail.", "A tracked key increments without changing its error bound."),
      step("Replace a minimum", "Untracked E replaces minimum slot B; E receives estimate 2 and error 1.", ["min","c1","replace B with E at count 2"],
        { seen:7,slots:[["A",3,0],["E",2,1],["C",1,0],["D",1,0]],minimum:1,key:"E",truth:{A:3,B:1,C:1,D:1,E:1},reported:[] },
        "E is tracked without growing memory.", "A replacement estimate is old minimum plus one, and its error is the old minimum."),
      step("Survive stream pressure", "F, G, and another A replace low slots while A rises to four.", ["stream","c3","replace tail keys and increment A"],
        { seen:10,slots:[["A",4,0],["E",2,1],["F",2,1],["G",2,1]],minimum:2,key:"A",truth:{A:4,B:1,C:1,D:1,E:1,F:1,G:1},reported:[] },
        "The dominant key remains stable while one-off keys churn.", "Any omitted key has true frequency no greater than the current minimum estimate."),
      step("Report threshold candidates", "For threshold 30% of ten events, only A's lower bound 4 exceeds three.", ["c0","stream","emit A as heavy hitter"],
        { seen:10,slots:[["A",4,0],["E",2,1],["F",2,1],["G",2,1]],minimum:2,key:null,truth:{A:4,B:1,C:1,D:1,E:1,F:1,G:1},reported:[["A",4,4]] },
        "A is emitted with estimate and lower bound four.", "A candidate is guaranteed heavy only when estimate minus error exceeds the threshold.")
    ]);

  add("probabilistic-data-structures", "Top-K sketches", "counters",
    "A request monitor combines a Count-Min frequency sketch with a size-three candidate min-heap.",
    [
      ["stream","feed search feed home","key stream",8,12],
      ["r0","CMS row0 [0..4]","counter row",28,34],
      ["r1","CMS row1 [0..4]","counter row",28,70],
      ["heap","min-heap k=3","candidate heap",62,48],
      ["top","ranked top three","query output",86,20],
      ["pressure","tail keys x,y,z","stream pressure",86,78]
    ], [
      ["stream","r0","hash row0"],["stream","r1","hash row1"],
      ["r0","heap","estimated count"],["r1","heap","minimum estimate"],
      ["pressure","heap","challenge threshold"],["heap","top","sort candidates"]
    ], [
      step("Initialize sketch and heap", "Two five-column rows are zero and the candidate heap is empty.", null,
        { matrix:[[0,0,0,0,0],[0,0,0,0,0]],candidates:[],threshold:0,key:null,columns:[],estimate:0,ranking:[] },
        "The structure uses fixed sketch memory plus three candidate slots.", "Frequency estimates are row minima."),
      step("Track early leaders", "feed, search, and home update two counters each and fill the heap.", ["stream","r0","count feed,search,home"],
        { matrix:[[0,1,1,1,0],[1,0,1,0,1]],candidates:[["feed",1],["search",1],["home",1]],threshold:1,key:"home",columns:[3,4],estimate:1,ranking:[] },
        "Three one-count candidates are retained.", "The heap contains at most k distinct keys."),
      step("Raise feed's estimate", "Three additional feed events raise its selected counters and heap score to four.", ["r1","heap","update feed estimate to 4"],
        { matrix:[[0,4,1,1,0],[4,0,1,0,1]],candidates:[["search",1],["home",1],["feed",4]],threshold:1,key:"feed",columns:[1,0],estimate:4,ranking:[] },
        "feed is protected from tail churn.", "Candidate scores are refreshed from the current sketch estimate."),
      step("Apply tail pressure", "Keys x, y, and z collide in some counters; x reaches estimate two and replaces one-count search.", ["pressure","heap","replace search with x"],
        { matrix:[[1,4,2,2,0],[4,1,2,0,2]],candidates:[["home",1],["x",2],["feed",4]],threshold:1,key:"x",columns:[2,2],estimate:2,ranking:[] },
        "The heap adapts while CMS collisions may overestimate tail keys.", "A full heap admits only candidates whose estimate exceeds its minimum."),
      step("Return approximate top K", "A final home event raises it to two; sorting yields feed=4, home=2, x=2.", ["heap","top","sort descending by estimate"],
        { matrix:[[1,4,2,3,0],[4,1,2,0,3]],candidates:[["x",2],["home",2],["feed",4]],threshold:2,key:null,columns:[],estimate:0,ranking:[["feed",4],["home",2],["x",2]] },
        "The monitor returns a bounded approximate top three.", "Returned counts never understate true counts, but collisions can alter borderline membership.")
    ]);

  add("probabilistic-data-structures", "HyperLogLog++", "counters",
    "A cardinality sketch starts with sparse encoded registers, converts to dense storage, and applies small-range and bias corrections.",
    [
      ["hash","64-bit hash","register/rank source",8,12],
      ["sparse","{r2:3,r7:1}","sparse register map",30,30],
      ["r0","R0","dense register",24,76],
      ["r1","R1","dense register",42,62],
      ["r2","R2","dense register",60,76],
      ["r3","R3","dense register",78,62],
      ["estimate","raw→corrected N","estimator",88,24]
    ], [
      ["hash","sparse","update encoded register"],["sparse","r0","convert to dense"],
      ["sparse","r2","convert to dense"],["r0","estimate","harmonic sum"],
      ["r3","estimate","harmonic sum"]
    ], [
      step("Begin in sparse mode", "Only nonzero register/rank pairs are encoded while cardinality is tiny.", ["hash","sparse","record r2=3 and r7=1"],
        { mode:"sparse",sparse:{2:3,7:1},registers:[0,0,3,0,0,0,0,1],zeros:6,raw:2.6,bias:null,corrected:2.3,method:"linear counting" },
        "Two occupied registers consume less space than a dense array.", "A register stores the maximum observed rank for its index."),
      step("Ignore duplicate evidence", "A repeated element hashes to r2 with rank 3 and leaves the sparse map unchanged.", ["hash","sparse","max r2 with rank 3"],
        { mode:"sparse",sparse:{2:3,7:1},registers:[0,0,3,0,0,0,0,1],zeros:6,raw:2.6,bias:null,corrected:2.3,method:"duplicate ignored" },
        "Duplicate input does not increase the estimate.", "Register updates are idempotent maxima."),
      step("Cross the sparse threshold", "New occupied registers make sparse encoding larger than eight dense registers, triggering conversion.", ["sparse","r0","materialize dense registers"],
        { mode:"dense",sparse:null,registers:[1,2,3,0,1,2,1,1],zeros:1,raw:7.8,bias:0.7,corrected:7.1,method:"sparse-to-dense" },
        "All maxima survive in a fixed dense vector.", "Mode conversion changes representation, not register values."),
      step("Apply small-range correction", "With one zero register and a small raw estimate, linear counting m·ln(m/V) gives 16.6 rather than raw 7.8.", ["r0","estimate","use zero-register correction"],
        { mode:"dense",sparse:null,registers:[1,2,3,0,1,2,1,1],zeros:1,raw:7.8,bias:0.7,corrected:16.6,method:"small-range correction" },
        "The estimator selects the calibrated small-cardinality regime.", "Correction choice depends on range and zero-register count, not event order."),
      step("Use bias-corrected dense estimate", "After more observations remove all zeros, raw 31.4 minus empirical bias 1.8 yields 29.6.", ["r3","estimate","subtract empirical bias"],
        { mode:"dense",sparse:null,registers:[3,2,4,3,2,3,2,4],zeros:0,raw:31.4,bias:1.8,corrected:29.6,method:"bias-corrected HLL" },
        "The sketch reports about thirty unique values.", "Dense estimation uses the full register vector and a bias table calibrated for its precision.")
    ]);

  add("probabilistic-data-structures", "Approximate distinct counting", "bits",
    "A linear-counting bitmap estimates unique device IDs from the fraction of zero bits and exposes collision error.",
    [
      ["stream","u1 u2 u3 u1 u4","device stream",8,12],
      ["hash","h(id) mod 16","bit selector",30,30],
      ["bitmap","bits 0..15","linear-count bitmap",52,58],
      ["zeros","zero-bit count V","estimator input",76,30],
      ["estimate","-m ln(V/m)","cardinality estimate",88,78]
    ], [
      ["stream","hash","hash device ID"],["hash","bitmap","set selected bit"],
      ["bitmap","zeros","count zero bits"],["zeros","estimate","apply estimator"]
    ], [
      step("Start with sixteen zeros", "The bitmap has m=16 available positions and estimate zero.", null,
        { seen:0,bits:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],selected:null,zeros:16,estimate:0,exact:0,error:0 },
        "No distinct devices are represented.", "Bits only transition from zero to one."),
      step("Set three distinct positions", "u1, u2, and u3 hash to positions 2, 7, and 11.", ["hash","bitmap","set bits 2,7,11"],
        { seen:3,bits:[0,0,1,0,0,0,0,1,0,0,0,1,0,0,0,0],selected:[2,7,11],zeros:13,estimate:3.32,exact:3,error:0.32 },
        "The estimate is close to the exact distinct count three.", "Estimator state depends on occupied positions, not total events."),
      step("Ignore a duplicate", "A repeated u1 selects already-set bit 2 and changes neither zeros nor estimate.", ["stream","bitmap","repeat u1 at bit 2"],
        { seen:4,bits:[0,0,1,0,0,0,0,1,0,0,0,1,0,0,0,0],selected:[2],zeros:13,estimate:3.32,exact:3,error:0.32 },
        "Duplicate traffic is idempotent.", "Setting a one bit again cannot increase distinct evidence."),
      step("Expose a hash collision", "New device u4 also hashes to bit 7, so exact distinct count rises while the bitmap does not.", ["hash","bitmap","u4 collides at bit 7"],
        { seen:5,bits:[0,0,1,0,0,0,0,1,0,0,0,1,0,0,0,0],selected:[7],zeros:13,estimate:3.32,exact:4,error:-0.68 },
        "Collision causes underestimation in this sample.", "The bitmap cannot distinguish IDs sharing a position."),
      step("Estimate after more occupancy", "Four more unique IDs set bits 0, 5, 9, and 14; V=9 yields estimate 9.21 for exact eight.", ["zeros","estimate","compute -16 ln(9/16)"],
        { seen:9,bits:[1,0,1,0,0,1,0,1,0,1,0,1,0,0,1,0],selected:[0,5,9,14],zeros:9,estimate:9.21,exact:8,error:1.21 },
        "The displayed error quantifies this sketch realization.", "Linear counting is valid while enough zero bits remain; saturation requires a larger bitmap.")
    ]);

  add("probabilistic-data-structures", "Probabilistic counters", "counters",
    "A Morris counter represents a large event count with one small exponent and randomized increment probability.",
    [
      ["stream","events e1..e12","event stream",8,12],
      ["rng","uniform draw U","random gate",30,32],
      ["exp","exponent c","Morris register",54,62],
      ["estimate","2^c-1","count estimate",78,32],
      ["truth","exact diagnostic count","error reference",88,78]
    ], [
      ["stream","rng","draw per event"],["rng","exp","increment with probability 2^-c"],
      ["exp","estimate","decode exponent"],["estimate","truth","measure relative error"]
    ], [
      step("Initialize exponent zero", "Register c=0 decodes to estimate zero before any event.", null,
        { exact:0,c:0,probability:1,draw:null,increment:false,estimate:0,error:0 },
        "One tiny register represents the count state.", "Decoded estimate is 2^c minus one."),
      step("First event always increments", "At c=0 the increment probability is one, so e1 raises c to one.", ["rng","exp","U below 1; c becomes 1"],
        { exact:1,c:1,probability:1,draw:0.63,increment:true,estimate:1,error:0 },
        "The estimate exactly matches one.", "The gate probability before increment is 2^-c."),
      step("Randomly skip at c=1", "For e2, U=0.72 exceeds probability one-half, so c stays one.", ["rng","exp","U .72 rejects increment"],
        { exact:2,c:1,probability:0.5,draw:0.72,increment:false,estimate:1,error:-0.5 },
        "The compact estimate temporarily trails the exact count.", "A skipped event changes exact truth but not the register."),
      step("Advance to exponent three", "Accepted draws at later events raise c from one to two and then three.", ["stream","exp","accepted draws raise c to 3"],
        { exact:7,c:3,probability:0.25,draw:0.11,increment:true,estimate:7,error:0 },
        "At seven events the decoded estimate is seven.", "Increment probability halves each time the exponent rises."),
      step("Show error at twelve events", "Five more events produce no accepted 1/8 draw, leaving estimate seven for exact twelve.", ["estimate","truth","compare 7 with exact 12"],
        { exact:12,c:3,probability:0.125,draw:0.44,increment:false,estimate:7,error:-0.417 },
        "The single run has relative error -41.7%; averaging counters can reduce variance.", "The estimator is unbiased over randomness even though individual trajectories vary.")
    ]);

  add("probabilistic-data-structures", "MinHash", "counters",
    "A near-duplicate detector compares two document shingle sets using four shared hash permutations and their row minima.",
    [
      ["setA","A={ab,bc,cd,de}","shingle set A",8,18],
      ["setB","B={ab,bc,xy,de}","shingle set B",8,76],
      ["h1","h1 minima","hash row 1",34,24],
      ["h2","h2 minima","hash row 2",50,66],
      ["h3","h3 minima","hash row 3",66,24],
      ["h4","h4 minima","hash row 4",82,66],
      ["compare","signature match fraction","similarity estimate",90,14]
    ], [
      ["setA","h1","hash all A shingles"],["setB","h1","hash all B shingles"],
      ["setA","h2","hash all A shingles"],["setB","h2","hash all B shingles"],
      ["h1","compare","compare minima"],["h2","compare","compare minima"],
      ["h3","compare","compare minima"],["h4","compare","compare minima"]
    ], [
      step("Expose the two sets", "A and B share ab, bc, and de; their union also contains cd and xy.", null,
        { A:["ab","bc","cd","de"],B:["ab","bc","xy","de"],intersection:["ab","bc","de"],union:["ab","bc","cd","de","xy"],rows:{},sigA:[],sigB:[],matches:0,estimate:0,jaccard:0.6 },
        "Actual Jaccard similarity is 3/5 or 0.60.", "MinHash uses identical hash functions for both sets."),
      step("Retain h1 minima", "Under h1, ab is minimum for both sets, producing matching first signature entries.", ["setA","h1","min A=ab:2; min B=ab:2"],
        { A:["ab","bc","cd","de"],B:["ab","bc","xy","de"],intersection:["ab","bc","de"],union:["ab","bc","cd","de","xy"],rows:{ h1:{ A:[2,7,9,5],B:[2,7,8,5],minA:2,minB:2 } },sigA:[2],sigB:[2],matches:1,estimate:1,jaccard:0.6 },
        "Row h1 contributes one signature match.", "A row stores only the minimum hash value per set."),
      step("Add h2 and h3 minima", "h2 minima differ because cd wins A while xy wins B; h3 minima match on bc.", ["setB","h3","retain h2 mismatch and h3 match"],
        { A:["ab","bc","cd","de"],B:["ab","bc","xy","de"],intersection:["ab","bc","de"],union:["ab","bc","cd","de","xy"],rows:{ h1:{minA:2,minB:2},h2:{minA:1,minB:3},h3:{minA:4,minB:4} },sigA:[2,1,4],sigB:[2,3,4],matches:2,estimate:0.667,jaccard:0.6 },
        "Two of three signature rows match.", "Each row minimum is independent evidence that a shared shingle wins the permutation."),
      step("Complete four-row signatures", "h4 chooses de for both sets, yielding A=[2,1,4,0] and B=[2,3,4,0].", ["h4","compare","append matching minimum 0"],
        { A:["ab","bc","cd","de"],B:["ab","bc","xy","de"],intersection:["ab","bc","de"],union:["ab","bc","cd","de","xy"],rows:{ h1:{minA:2,minB:2},h2:{minA:1,minB:3},h3:{minA:4,minB:4},h4:{minA:0,minB:0} },sigA:[2,1,4,0],sigB:[2,3,4,0],matches:3,estimate:0.75,jaccard:0.6 },
        "Three of four minima match.", "Signature coordinates compare only corresponding hash rows."),
      step("Compare estimate with intuition", "The matching-signature fraction is 3/4=0.75 versus actual Jaccard 3/5=0.60.", ["compare","setA","report sampling error +0.15"],
        { A:["ab","bc","cd","de"],B:["ab","bc","xy","de"],intersection:["ab","bc","de"],union:["ab","bc","cd","de","xy"],rows:{ h1:{minA:2,minB:2},h2:{minA:1,minB:3},h3:{minA:4,minB:4},h4:{minA:0,minB:0} },sigA:[2,1,4,0],sigB:[2,3,4,0],matches:3,estimate:0.75,jaccard:0.6,error:0.15 },
        "Four rows give a noisy but compact similarity estimate.", "Expected signature agreement equals Jaccard; more independent rows reduce variance.")
    ]);

  add("probabilistic-data-structures", "SimHash", "bits",
    "A document deduplicator projects weighted features into signed bit accumulators and compares fingerprints by Hamming distance.",
    [
      ["features","cat:+3 sat:+2 mat:+1","weighted features",8,16],
      ["hashes","feature bit vectors","feature hashes",30,34],
      ["acc","[+2,-4,+6,-2]","signed accumulators",54,62],
      ["fpA","A fingerprint 1010","fingerprint A",78,28],
      ["fpB","B fingerprint 1110","fingerprint B",86,72],
      ["xor","XOR 0100 popcount=1","Hamming comparator",48,88]
    ], [
      ["features","hashes","hash each feature"],["hashes","acc","add signed weights"],
      ["acc","fpA","threshold signs"],["fpA","xor","xor fingerprints"],
      ["fpB","xor","xor fingerprints"]
    ], [
      step("Assign weighted features", "Document A contributes cat weight 3, sat weight 2, and mat weight 1.", null,
        { features:[["cat",3],["sat",2],["mat",1]],hashBits:{ cat:"1010",sat:"1001",mat:"0110" },acc:[0,0,0,0],fingerprintA:null,fingerprintB:null,xor:null,distance:null },
        "Feature importance is explicit before bit projection.", "The same feature always has the same hash bits."),
      step("Accumulate cat signs", "cat=1010 adds +3,-3,+3,-3 to the four signed accumulators.", ["hashes","acc","add cat signs weighted 3"],
        { features:[["cat",3],["sat",2],["mat",1]],hashBits:{ cat:"1010",sat:"1001",mat:"0110" },acc:[3,-3,3,-3],fingerprintA:null,fingerprintB:null,xor:null,distance:null },
        "Each hash bit votes with the feature's weight.", "Bit one adds weight and bit zero subtracts weight."),
      step("Add remaining features", "sat and mat update the final accumulator vector to [+4,-4,+2,0].", ["features","acc","add sat and mat signed weights"],
        { features:[["cat",3],["sat",2],["mat",1]],hashBits:{ cat:"1010",sat:"1001",mat:"0110" },acc:[4,-4,2,0],fingerprintA:null,fingerprintB:null,xor:null,distance:null },
        "All weighted feature evidence is compressed into four sums.", "Feature order does not affect accumulator totals."),
      step("Threshold the fingerprint", "Positive accumulators become one; nonpositive values become zero, producing A=1010.", ["acc","fpA","threshold accumulator signs"],
        { features:[["cat",3],["sat",2],["mat",1]],hashBits:{ cat:"1010",sat:"1001",mat:"0110" },acc:[4,-4,2,0],fingerprintA:"1010",fingerprintB:"1110",xor:null,distance:null },
        "Document A has a four-bit SimHash.", "Each fingerprint bit records only the accumulator sign."),
      step("Measure near-duplicate distance", "A=1010 XOR B=1110 gives 0100 with popcount one.", ["fpA","xor","xor A with B and popcount"],
        { features:[["cat",3],["sat",2],["mat",1]],hashBits:{ cat:"1010",sat:"1001",mat:"0110" },acc:[4,-4,2,0],fingerprintA:"1010",fingerprintB:"1110",xor:"0100",distance:1 },
        "At threshold one, B is a near-duplicate candidate.", "Hamming distance counts differing fingerprint positions, not differing raw features.")
    ]);

  add("probabilistic-data-structures", "Locality-sensitive hashing", "search",
    "A cosine LSH index unions bucket candidates from two random-hyperplane tables before exact vector reranking.",
    [
      ["query","q=(0.8,0.6)","query vector",8,14],
      ["vectors","A(.9,.5) B(.1,.9) C(.7,.7)","indexed vectors",24,78],
      ["t1","table1 sign bits","LSH table one",46,24],
      ["t2","table2 sign bits","LSH table two",58,70],
      ["buckets","T1:11 T2:10","selected buckets",76,42],
      ["union","{A,C,B}","candidate union",88,72],
      ["rank","exact cosine top-2","reranker",90,16]
    ], [
      ["query","t1","hash with hyperplanes"],["query","t2","hash with hyperplanes"],
      ["t1","buckets","probe signature 11"],["t2","buckets","probe signature 10"],
      ["buckets","union","deduplicate candidates"],["union","rank","exact cosine score"]
    ], [
      step("Index vectors into two tables", "A, B, and C are assigned signatures from two independent hyperplane sets.", null,
        { query:[0.8,0.6],tables:{ T1:{ "11":["A","C"],"01":["B"] },T2:{ "10":["B","C"],"11":["A"] } },queryHashes:{},probes:[],candidates:[],scores:{},ranking:[] },
        "Nearby vectors have elevated probability of sharing a bucket.", "Each table uses a fixed independent hash family."),
      step("Hash the query in table one", "q has T1 signature 11 and retrieves A and C.", ["query","t1","compute T1 signature 11"],
        { query:[0.8,0.6],tables:{ T1:{ "11":["A","C"],"01":["B"] },T2:{ "10":["B","C"],"11":["A"] } },queryHashes:{ T1:"11" },probes:[["T1","11"]],candidates:["A","C"],scores:{},ranking:[] },
        "One table supplies two candidates without scanning all vectors.", "Only the query's selected bucket is read in this probe."),
      step("Probe the second table", "q has T2 signature 10 and retrieves B and C.", ["query","t2","compute T2 signature 10"],
        { query:[0.8,0.6],tables:{ T1:{ "11":["A","C"],"01":["B"] },T2:{ "10":["B","C"],"11":["A"] } },queryHashes:{ T1:"11",T2:"10" },probes:[["T1","11"],["T2","10"]],candidates:["A","C","B","C"],scores:{},ranking:[] },
        "Independent collisions improve recall.", "A vector may appear through multiple tables."),
      step("Union and deduplicate", "Candidate C is deduplicated, leaving A, C, and B for exact scoring.", ["buckets","union","union A,C with B,C"],
        { query:[0.8,0.6],tables:{ T1:{ "11":["A","C"],"01":["B"] },T2:{ "10":["B","C"],"11":["A"] } },queryHashes:{ T1:"11",T2:"10" },probes:[["T1","11"],["T2","10"]],candidates:["A","C","B"],scores:{},ranking:[] },
        "The candidate set is smaller than the full corpus and contains no duplicates.", "Candidate union is set-valued across table probes."),
      step("Rerank by exact cosine", "Exact cosine scores A=.998, C=.990, and B=.707, returning A then C.", ["union","rank","score exact cosine and take top 2"],
        { query:[0.8,0.6],tables:{ T1:{ "11":["A","C"],"01":["B"] },T2:{ "10":["B","C"],"11":["A"] } },queryHashes:{ T1:"11",T2:"10" },probes:[["T1","11"],["T2","10"]],candidates:["A","C","B"],scores:{ A:0.998,C:0.990,B:0.707 },ranking:[["A",0.998],["C",0.990]] },
        "Approximate candidate generation feeds an exact final order.", "Reranking never returns a vector outside the candidate union.")
    ]);

  add("probabilistic-data-structures", "Sampling algorithms", "counters",
    "A uniform reservoir sampler of size three contrasts deterministic initial fill with randomized replacement and rejection decisions.",
    [
      ["stream","e1 e2 e3 e4 e5 e6","unbounded stream",8,14],
      ["rng","draw j in [0,i)","uniform random draw",30,30],
      ["s0","sample slot 0","reservoir slot",28,76],
      ["s1","sample slot 1","reservoir slot",52,62],
      ["s2","sample slot 2","reservoir slot",76,76],
      ["odds","acceptance k/i","selection probability",88,28]
    ], [
      ["stream","s0","initial fill"],["stream","s1","initial fill"],
      ["stream","s2","initial fill"],["stream","rng","draw replacement index"],
      ["rng","s0","replace selected slot"],["rng","odds","compare draw with k"]
    ], [
      step("Admit the first item", "With capacity k=3, e1 deterministically occupies slot zero.", ["stream","s0","place e1"],
        { seen:1,k:3,reservoir:["e1",null,null],candidate:"e1",draw:null,acceptance:1,decision:"fill slot 0",replaced:null },
        "The sample contains every item seen so far.", "The first k stream items are selected with probability one."),
      step("Complete deterministic fill", "e2 and e3 occupy the remaining slots without random draws.", ["stream","s2","place e2 and e3"],
        { seen:3,k:3,reservoir:["e1","e2","e3"],candidate:"e3",draw:null,acceptance:1,decision:"fill complete",replaced:null },
        "The reservoir is full with three uniformly retained items.", "Before item k+1, no item has been excluded."),
      step("Replace uniformly for e4", "For i=4, draw j=1 from [0,4); because j<3, e4 replaces slot one.", ["rng","s1","draw 1; replace e2 with e4"],
        { seen:4,k:3,reservoir:["e1","e4","e3"],candidate:"e4",draw:1,acceptance:0.75,decision:"replace slot 1",replaced:"e2" },
        "Each of four items now has retention probability 3/4.", "A selected replacement slot is uniform among k slots."),
      step("Reject e5", "For i=5, draw j=4; because j is not a reservoir index, e5 is discarded.", ["rng","odds","draw 4 rejects e5"],
        { seen:5,k:3,reservoir:["e1","e4","e3"],candidate:"e5",draw:4,acceptance:0.6,decision:"reject",replaced:null },
        "Random rejection leaves all slots unchanged.", "Item i is accepted with probability k/i."),
      step("Replace again for e6", "For i=6, draw j=0 and replace e1, yielding [e6,e4,e3].", ["rng","s0","draw 0; replace e1 with e6"],
        { seen:6,k:3,reservoir:["e6","e4","e3"],candidate:"e6",draw:0,acceptance:0.5,decision:"replace slot 0",replaced:"e1" },
        "Every one of six events has equal final inclusion probability one-half.", "Uniformity follows from admission k/i and uniform eviction among current slots.")
    ]);

  function storageEntities(labels, role) {
    return labels.map(function (label, i) {
      return { id: "n" + i, label: label, role: role, x: 12 + (i % 4) * 25, y: 22 + Math.floor(i / 4) * 28 };
    });
  }

  add("storage-systems", "LSM trees", "storage",
    "A write-heavy metrics store buffers writes and merges immutable sorted runs.",
    storageEntities(["memtable","L0:A","L0:B","L1:C","L2:D"], "level-run"),
    [
      { from: "n0", to: "n1", relation: "flush" }, { from: "n0", to: "n2", relation: "flush" },
      { from: "n1", to: "n3", relation: "compact" }, { from: "n2", to: "n3", relation: "compact" },
      { from: "n3", to: "n4", relation: "compact" }
    ], [
      step("Buffer writes", "Sorted keys enter the mutable in-memory table.", { type: "put", entries: [["b",2],["d",4]] },
        { memtable: [["b",2],["d",4]], immutable: [], levels: [[],[["a",1],["c",3]],[["f",6]]], lookupKey: null, probes: [], value: null },
        "Recent writes are memory-resident.", "Each run is sorted by key."),
      step("Flush immutable run", "A full memtable freezes and flushes as sorted L0 run R2.", { type: "flush", run: "R2" },
        { memtable: [], immutable: [], levels: [[["b",2],["d",4]],[["a",1],["c",3]],[["f",6]]], lookupKey: null, probes: [], value: null },
        "Writes become durable in a new L0 run.", "Flush preserves key order."),
      step("Read newest first", "Lookup d checks memory, then L0 newest-to-oldest, and finds value 4.", { type: "get", key: "d" },
        { memtable: [], immutable: [], levels: [[["b",2],["d",4]],[["a",1],["c",3]],[["f",6]]], lookupKey: "d", probes: ["memtable","L0:R2"], value: 4 },
        "The newest visible version wins.", "Search order follows recency before deeper levels."),
      step("Merge overlapping runs", "Compaction merges L0 R2 with overlapping L1 keys into one sorted run.", { type: "compact", inputs: ["R2","R1"] },
        { memtable: [], immutable: [], levels: [[],[["a",1],["b",2],["c",3],["d",4]],[["f",6]]], lookupKey: null, probes: [], value: null },
        "Read amplification falls.", "Compaction emits sorted output and keeps newest duplicate versions."),
      step("Serve range scan", "The merged L1 run yields b through d sequentially.", { type: "range", from: "b", to: "d" },
        { memtable: [], immutable: [], levels: [[],[["a",1],["b",2],["c",3],["d",4]],[["f",6]]], lookupKey: "[b,d]", probes: ["L1"], value: [["b",2],["c",3],["d",4]] },
        "The range scan reads one contiguous run.", "Returned keys are globally ordered and respect newest versions.")
    ]);

  add("storage-systems", "B-trees", "tree",
    "A relational index locates account rows with a shallow page tree.",
    [
      { id: "root", label: "[20|40]", role: "internal-page", x: 50, y: 12 },
      { id: "l0", label: "[5,10,15]", role: "leaf-page", x: 18, y: 60 },
      { id: "l1", label: "[20,25,35]", role: "leaf-page", x: 50, y: 60 },
      { id: "l2", label: "[40,50,60]", role: "leaf-page", x: 82, y: 60 },
      { id: "leafchain", label: "ordered leaf chain", role: "range-scan structure", x: 50, y: 88 }
    ], [
      { from: "root", to: "l0", relation: "keys<20" },
      { from: "root", to: "l1", relation: "20<=keys<40" },
      { from: "root", to: "l2", relation: "keys>=40" },
      { from: "l0", to: "l1", relation: "next-leaf" },
      { from: "l1", to: "l2", relation: "next-leaf" },
      { from: "l0", to: "leafchain", relation: "range-scan-start" },
      { from: "leafchain", to: "l2", relation: "range-scan-end" }
    ], [
      step("Root partitions keys", "Separator keys 20 and 40 divide three leaf pages.", null,
        { pages: { root: [20,40], l0: [5,10,15], l1: [20,25,35], l2: [40,50,60] }, searchKey: null, path: [], split: null, result: null },
        "Nine keys fit in two tree levels.", "Keys and child ranges are sorted."),
      step("Descend for 35", "35 falls between separators 20 and 40, selecting the middle leaf.", { type: "search", key: 35 },
        { pages: { root: [20,40], l0: [5,10,15], l1: [20,25,35], l2: [40,50,60] }, searchKey: 35, path: ["root","l1"], split: null, result: 35 },
        "The key is found in two page reads.", "Each separator directs search to exactly one child range."),
      step("Insert into full leaf", "Inserting 30 overflows the middle page's capacity of three.", { type: "insert", key: 30 },
        { pages: { root: [20,40], l0: [5,10,15], l1: [20,25,30,35], l2: [40,50,60] }, searchKey: 30, path: ["root","l1"], split: "l1-overflow", result: null },
        "A split is required.", "Insertion preserves sorted order before splitting."),
      step("Split and promote", "The middle leaf splits at 30; separator 30 is added to the root.", { type: "split", page: "l1", separator: 30 },
        { pages: { root: [20,30,40], l0: [5,10,15], l1: [20,25], l1b: [30,35], l2: [40,50,60] }, searchKey: null, path: [], split: ["l1","l1b"], result: null },
        "The tree gains one leaf but not another level.", "All leaves remain at equal depth."),
      step("Scan linked leaves", "A range scan 25..50 walks l1, l1b, then l2.", { type: "range", from: 25, to: 50 },
        { pages: { root: [20,30,40], l0: [5,10,15], l1: [20,25], l1b: [30,35], l2: [40,50,60] }, searchKey: "[25,50]", path: ["root","l1","l1b","l2"], split: null, result: [25,30,35,40,50] },
        "Ordered leaves make the range scan sequential.", "Leaf links preserve ascending key order.")
    ]);

  add("storage-systems", "SSTables", "storage",
    "An immutable table serves point and range reads from sorted blocks.",
    storageEntities(["index a→B0","B0 a,b","index d→B1","B1 d,f","index k→B2","B2 k,m"], "sorted-block"),
    [
      { from: "n0", to: "n1", relation: "block-offset" }, { from: "n2", to: "n3", relation: "block-offset" },
      { from: "n4", to: "n5", relation: "block-offset" }, { from: "n1", to: "n3", relation: "next-block" },
      { from: "n3", to: "n5", relation: "next-block" }
    ], [
      step("Immutable blocks", "Six sorted records are grouped into three immutable data blocks.", null,
        { index: [["a","B0"],["d","B1"],["k","B2"]], blocks: { B0: [["a",1],["b",2]], B1: [["d",4],["f",6]], B2: [["k",11],["m",13]] }, key: null, indexProbe: null, blockProbe: null, result: null },
        "The file is ordered from a through m.", "Records and block first-keys are sorted."),
      step("Use sparse index", "Lookup f chooses the greatest index key not exceeding f: d→B1.", { type: "index-search", key: "f" },
        { index: [["a","B0"],["d","B1"],["k","B2"]], blocks: { B0: [["a",1],["b",2]], B1: [["d",4],["f",6]], B2: [["k",11],["m",13]] }, key: "f", indexProbe: ["a","d","k"], blockProbe: "B1", result: null },
        "Only B1 needs decoding.", "The sparse index points to a block whose range may contain the key."),
      step("Decode target block", "Binary search inside B1 finds f→6.", { type: "block-search", block: "B1", key: "f" },
        { index: [["a","B0"],["d","B1"],["k","B2"]], blocks: { B0: [["a",1],["b",2]], B1: [["d",4],["f",6]], B2: [["k",11],["m",13]] }, key: "f", indexProbe: ["d"], blockProbe: "B1", result: ["f",6] },
        "The point read returns value 6.", "An SSTable never changes after publication."),
      step("Rule out absence", "Lookup h selects B1; h lies after f and before B2's first key k, so it is absent.", { type: "block-search", block: "B1", key: "h" },
        { index: [["a","B0"],["d","B1"],["k","B2"]], blocks: { B0: [["a",1],["b",2]], B1: [["d",4],["f",6]], B2: [["k",11],["m",13]] }, key: "h", indexProbe: ["d","k"], blockProbe: "B1", result: "absent" },
        "No later block can contain h.", "Block ranges do not overlap within one SSTable."),
      step("Sequential range read", "Range b..k starts in B0 and continues through B2.", { type: "range", from: "b", to: "k" },
        { index: [["a","B0"],["d","B1"],["k","B2"]], blocks: { B0: [["a",1],["b",2]], B1: [["d",4],["f",6]], B2: [["k",11],["m",13]] }, key: "[b,k]", indexProbe: ["a"], blockProbe: ["B0","B1","B2"], result: [["b",2],["d",4],["f",6],["k",11]] },
        "Contiguous blocks produce an ordered range.", "Range output follows file key order.")
    ]);

  add("storage-systems", "Write-ahead logs", "storage",
    "A database recovers committed balances after a process crash.",
    storageEntities(["LSN 40 BEGIN","LSN 41 A=90","LSN 42 B=60","LSN 43 COMMIT","data pages"], "log-record"),
    [
      { from: "n0", to: "n1", relation: "next-lsn" }, { from: "n1", to: "n2", relation: "next-lsn" },
      { from: "n2", to: "n3", relation: "next-lsn" }, { from: "n3", to: "n4", relation: "flush-before-data" }
    ], [
      step("Begin transaction", "Transaction T8 receives LSN 40 before changing pages.", { type: "append", record: "BEGIN T8" },
        { durableLog: [["40","BEGIN T8"]], volatileLog: [], pages: { A: 100, B: 50 }, dirtyPages: [], flushedPageLSN: { A: 39, B: 39 }, tx: "active" },
        "Recovery can identify T8.", "Log sequence numbers strictly increase."),
      step("Log updates", "Redo/undo records capture A:100→90 and B:50→60 before dirtying memory pages.", { type: "append-updates" },
        { durableLog: [["40","BEGIN T8"]], volatileLog: [["41","A 100→90"],["42","B 50→60"]], pages: { A: 90, B: 60 }, dirtyPages: ["A","B"], flushedPageLSN: { A: 39, B: 39 }, tx: "active" },
        "Memory reflects the transfer.", "The update log record exists before its page may flush."),
      step("Force commit record", "LSNs 41 through 43, including COMMIT, are flushed atomically to stable storage.", { type: "fsync", through: 43 },
        { durableLog: [["40","BEGIN T8"],["41","A 100→90"],["42","B 50→60"],["43","COMMIT T8"]], volatileLog: [], pages: { A: 90, B: 60 }, dirtyPages: ["A","B"], flushedPageLSN: { A: 39, B: 39 }, tx: "committed" },
        "The client may receive success.", "Commit is acknowledged only after its log record is durable."),
      step("Crash before page flush", "The process loses dirty memory pages; disk still contains old balances.", { type: "crash" },
        { durableLog: [["40","BEGIN T8"],["41","A 100→90"],["42","B 50→60"],["43","COMMIT T8"]], volatileLog: [], pages: { A: 100, B: 50 }, dirtyPages: [], flushedPageLSN: { A: 39, B: 39 }, tx: "recovery" },
        "Committed data pages lag the durable log.", "Stable WAL survives process failure."),
      step("Redo committed updates", "Recovery replays LSNs 41 and 42 because page LSNs are older.", { type: "redo", from: 41, to: 42 },
        { durableLog: [["40","BEGIN T8"],["41","A 100→90"],["42","B 50→60"],["43","COMMIT T8"]], volatileLog: [], pages: { A: 90, B: 60 }, dirtyPages: [], flushedPageLSN: { A: 41, B: 42 }, tx: "recovered" },
        "Committed balances are restored.", "Redo is idempotent when guarded by page LSN.")
    ]);

  add("storage-systems", "Memtables", "tree",
    "An LSM engine orders recent writes in a skip-list memtable.",
    [
      { id: "h2", label: "head L2", role: "skip-head", x: 8, y: 20 },
      { id: "a2", label: "a", role: "skip-node", x: 30, y: 20 },
      { id: "d2", label: "d", role: "skip-node", x: 70, y: 20 },
      { id: "h1", label: "head L1", role: "skip-head", x: 8, y: 45 },
      { id: "a1", label: "a", role: "skip-node", x: 30, y: 45 },
      { id: "c1", label: "c", role: "skip-node", x: 50, y: 45 },
      { id: "d1", label: "d", role: "skip-node", x: 70, y: 45 }
    ], [
      { from: "h2", to: "a2", relation: "next" }, { from: "a2", to: "d2", relation: "next" },
      { from: "h1", to: "a1", relation: "next" }, { from: "a1", to: "c1", relation: "next" },
      { from: "c1", to: "d1", relation: "next" }, { from: "a2", to: "a1", relation: "down" },
      { from: "d2", to: "d1", relation: "down" }
    ], [
      step("Ordered writes", "The mutable skip list contains a, c, and d in key order.", null,
        { mutable: [["a",1,2],["c",3,1],["d",4,2]], immutable: null, bytes: 72, threshold: 100, key: null, path: [], result: null },
        "Recent values are searchable in memory.", "Level zero contains every key in sorted order."),
      step("Search towers", "Lookup c advances on level 2 to a, drops, then advances to c.", { type: "get", key: "c" },
        { mutable: [["a",1,2],["c",3,1],["d",4,2]], immutable: null, bytes: 72, threshold: 100, key: "c", path: ["head:L2","a:L2","a:L1","c:L1"], result: 3 },
        "c is found without scanning every key.", "Traversal never moves past the target key."),
      step("Overwrite in place", "A newer write c→8 replaces the visible value for c.", { type: "put", key: "c", value: 8 },
        { mutable: [["a",1,2],["c",8,1],["d",4,2]], immutable: null, bytes: 72, threshold: 100, key: "c", path: ["head:L2","a:L2","c:L1"], result: 8 },
        "Reads now return 8.", "At most one current entry per key is visible in this memtable."),
      step("Reach size threshold", "Adding e and f pushes estimated memory beyond 100 bytes.", { type: "put-batch", entries: [["e",5],["f",6]] },
        { mutable: [["a",1,2],["c",8,1],["d",4,2],["e",5,1],["f",6,2]], immutable: null, bytes: 120, threshold: 100, key: null, path: [], result: null },
        "The active memtable must rotate.", "Writes remain ordered while mutable."),
      step("Freeze and rotate", "The full table becomes immutable and a new empty mutable table accepts writes.", { type: "freeze" },
        { mutable: [], immutable: [["a",1],["c",8],["d",4],["e",5],["f",6]], bytes: 0, threshold: 100, key: null, path: [], result: null },
        "The immutable table is ready to flush.", "Frozen entries never mutate; new writes use a fresh table.")
    ]);

  add("storage-systems", "Compaction", "storage",
    "An LSM store merges versions and tombstones to control read amplification.",
    storageEntities(["L0 R3","L0 R2","L1 R1","merge heap","L1 output run"], "sorted-run"),
    [
      { from: "n0", to: "n3", relation: "newest-input" }, { from: "n1", to: "n3", relation: "input" },
      { from: "n2", to: "n3", relation: "oldest-input" }, { from: "n3", to: "n4", relation: "sorted-output" }
    ], [
      step("Choose overlap", "Runs R3, R2, and R1 overlap key range a..f.", { type: "select", runs: ["R3","R2","R1"] },
        { inputs: { R3: [["b",9],["d","DEL"]], R2: [["a",1],["d",4]], R1: [["b",2],["c",3],["f",6]] }, cursors: { R3:0,R2:0,R1:0 }, output: [], currentKey: null, dropped: [], complete: false },
        "All versions in the overlap enter one merge.", "Inputs are individually sorted."),
      step("Merge smallest keys", "The heap emits a from R2, then sees two versions of b.", { type: "merge", through: "b" },
        { inputs: { R3: [["b",9],["d","DEL"]], R2: [["a",1],["d",4]], R1: [["b",2],["c",3],["f",6]] }, cursors: { R3:1,R2:1,R1:1 }, output: [["a",1],["b",9]], currentKey: "b", dropped: [["b",2]], complete: false },
        "Newest b→9 replaces b→2.", "Only the newest visible version of a key is emitted."),
      step("Continue ordered merge", "c is emitted; d's tombstone supersedes older d→4.", { type: "merge", through: "d" },
        { inputs: { R3: [["b",9],["d","DEL"]], R2: [["a",1],["d",4]], R1: [["b",2],["c",3],["f",6]] }, cursors: { R3:2,R2:2,R1:2 }, output: [["a",1],["b",9],["c",3],["d","DEL"]], currentKey: "d", dropped: [["b",2],["d",4]], complete: false },
        "The delete marker remains authoritative.", "A tombstone participates as the newest version."),
      step("Drop safe tombstone", "Because this is the bottom level, no older d can exist below; the tombstone is discarded.", { type: "garbage-collect", key: "d" },
        { inputs: { R3: [["b",9],["d","DEL"]], R2: [["a",1],["d",4]], R1: [["b",2],["c",3],["f",6]] }, cursors: { R3:2,R2:2,R1:2 }, output: [["a",1],["b",9],["c",3]], currentKey: "d", dropped: [["b",2],["d",4],["d","DEL"]], complete: false },
        "Deleted key d consumes no output space.", "A tombstone is dropped only when no older version can reappear."),
      step("Install output", "f completes the sorted run and input files become obsolete.", { type: "install" },
        { inputs: {}, cursors: {}, output: [["a",1],["b",9],["c",3],["f",6]], currentKey: null, dropped: [["b",2],["d",4],["d","DEL"]], complete: true },
        "Three overlapping runs become one compact run.", "Output is sorted, nonduplicated, and preserves newest visibility.")
    ]);

  add("storage-systems", "Bloom filters", "bits",
    "An SSTable reader uses a three-hash Bloom filter to avoid disk probes while tracking false-positive pressure.",
    [
      ["key","candidate key","lookup input",8,12],
      ["h1","h1 mod 12","first hash",28,28],
      ["h2","h2 mod 12","second hash",50,16],
      ["h3","h3 mod 12","third hash",72,28],
      ["array","bits 0..11","bit array",50,55],
      ["sst","SSTable block","disk verification",82,78]
    ], [
      ["key","h1","hash key"],["key","h2","hash key"],["key","h3","hash key"],
      ["h1","array","select bit"],["h2","array","select bit"],["h3","array","select bit"],
      ["array","sst","verify possible match"]
    ], [
      step("Seed the filter", "Inserted keys set positions 1, 3, 5, 7, and 10 in the twelve-bit array.", null,
        { key:null,hashes:[],bits:[0,1,0,1,0,1,0,1,0,0,1,0],setBits:5,fillRatio:0.42,verdict:"ready",diskReads:0 },
        "The filter summarizes keys already written to the SSTable.", "Insertion only sets bits; it never clears them."),
      step("Hash a definite miss", "Key kiwi maps to positions 1, 4, and 10.", ["key","h1","hash kiwi to 1,4,10"],
        { key:"kiwi",hashes:[1,4,10],bits:[0,1,0,1,0,1,0,1,0,0,1,0],setBits:5,fillRatio:0.42,verdict:"hashing",diskReads:0 },
        "The reader has three concrete positions to test.", "A query uses the same hash functions as insertion."),
      step("Reject on a zero", "Position 4 is zero, proving kiwi is absent without reading the SSTable.", ["h2","array","observe bit 4 = 0"],
        { key:"kiwi",hashes:[1,4,10],bits:[0,1,0,1,0,1,0,1,0,0,1,0],setBits:5,fillRatio:0.42,verdict:"definitely absent",diskReads:0 },
        "One disk probe is avoided.", "Any queried zero forbids a false negative."),
      step("Verify a possible match", "Key lime maps to 1, 5, and 10; all are one, so the SSTable must verify it.", ["array","sst","probe lime after all-one result"],
        { key:"lime",hashes:[1,5,10],bits:[0,1,0,1,0,1,0,1,0,0,1,0],setBits:5,fillRatio:0.42,verdict:"possibly present",diskReads:1,result:"lime found" },
        "The positive filter answer becomes an exact disk lookup.", "Bloom positives are candidates, never proof."),
      step("Expose false-positive pressure", "After more inserts set nine of twelve bits, pear finds three ones but is absent on disk.", ["array","sst","verify pear false positive"],
        { key:"pear",hashes:[2,7,11],bits:[1,1,1,1,0,1,1,1,1,0,1,1],setBits:9,fillRatio:0.75,verdict:"false positive",diskReads:2,result:"pear absent" },
        "High occupancy causes an unnecessary read and signals filter rotation or resizing.", "False-positive probability rises as the bit array fills.")
    ]);

  add("storage-systems", "Indexing", "tree",
    "A primary-key index maps account IDs to exact heap-row locations and verifies the base row after lookup.",
    [
      ["query","id=42","search key",8,15],
      ["root","[20|50]","index root",45,12],
      ["leaf","20→p2 42→p7","index leaf",45,48],
      ["page","heap page p7","base page",76,65],
      ["row","row id=42 Ada","base row",88,86]
    ], [
      ["query","root","compare separators"],["root","leaf","choose key range"],
      ["leaf","page","follow row pointer"],["page","row","verify base row"]
    ], [
      step("Separate index and heap", "The index stores ordered key-to-location entries while heap page p7 stores the complete account row.", null,
        { search:null,root:[20,50],leaf:[[20,"p2:3"],[42,"p7:1"]],page:[["p7:0",41],["p7:1",42]],row:["42","Ada","active"],path:[],verified:false },
        "Keys are smaller than full rows and can be searched independently.", "Each live index pointer resolves to one base-row slot."),
      step("Descend by key", "ID 42 falls between root separators 20 and 50.", ["query","root","compare id 42"],
        { search:42,root:[20,50],leaf:[[20,"p2:3"],[42,"p7:1"]],page:[["p7:0",41],["p7:1",42]],row:["42","Ada","active"],path:["root"],verified:false },
        "The middle leaf is selected.", "Traversal follows the only child range that can contain the key."),
      step("Resolve the pointer", "The leaf entry 42→p7:1 supplies the physical heap location.", ["root","leaf","find 42 to p7:1"],
        { search:42,root:[20,50],leaf:[[20,"p2:3"],[42,"p7:1"]],page:[["p7:0",41],["p7:1",42]],row:["42","Ada","active"],path:["root","leaf","p7:1"],verified:false },
        "The engine avoids scanning unrelated heap pages.", "Index order determines location, not row truth."),
      step("Fetch and verify", "Heap page p7 slot 1 is read and its row ID is checked against 42.", ["leaf","page","read p7 slot 1"],
        { search:42,root:[20,50],leaf:[[20,"p2:3"],[42,"p7:1"]],page:[["p7:0",41],["p7:1",42]],row:["42","Ada","active"],path:["root","leaf","p7:1","row42"],verified:true },
        "The complete Ada row is returned.", "A lookup verifies the base-row key before returning data."),
      step("Maintain on movement", "Vacuum moves row 42 to p9:0 and atomically updates its leaf pointer.", ["page","leaf","replace p7:1 with p9:0"],
        { search:42,root:[20,50],leaf:[[20,"p2:3"],[42,"p9:0"]],page:[["p9:0",42]],row:["42","Ada","active"],path:["root","leaf","p9:0","row42"],verified:true },
        "Future lookups follow the new location.", "An index entry and its referenced row must not remain durably inconsistent.")
    ]);

  add("storage-systems", "Secondary indexes", "tree",
    "An email secondary index finds customer rows by a non-primary attribute and verifies stale entries against base data.",
    [
      ["email","ada@example","secondary key",8,16],
      ["index","email→[17,42]","secondary leaf",42,18],
      ["row17","PK17 email=ada","base row",70,48],
      ["row42","PK42 email=ada","base row",88,70],
      ["row51","PK51 email=bo","base row",58,84]
    ], [
      ["email","index","seek secondary key"],["index","row17","fetch PK17"],
      ["index","row42","fetch PK42"],["index","row51","maintain changed key"]
    ], [
      step("Index duplicate values", "The non-unique email entry stores primary keys 17 and 42 rather than complete rows.", null,
        { lookup:null,index:{ "ada@example":[17,42],"bo@example":[51] },rows:{ 17:"ada@example",42:"ada@example",51:"bo@example" },candidates:[],verified:[],stale:[] },
        "One secondary key can fan out to multiple base records.", "Posting primary keys keeps the secondary structure compact."),
      step("Seek the email", "The B-tree seek for ada@example returns candidate primary keys 17 and 42.", ["email","index","seek ada@example"],
        { lookup:"ada@example",index:{ "ada@example":[17,42],"bo@example":[51] },rows:{ 17:"ada@example",42:"ada@example",51:"bo@example" },candidates:[17,42],verified:[],stale:[] },
        "Two exact base-row reads are planned.", "Candidates come only from the matching secondary entry."),
      step("Verify base rows", "Rows 17 and 42 still contain ada@example, so both satisfy the predicate.", ["index","row17","verify candidate emails"],
        { lookup:"ada@example",index:{ "ada@example":[17,42],"bo@example":[51] },rows:{ 17:"ada@example",42:"ada@example",51:"bo@example" },candidates:[17,42],verified:[17,42],stale:[] },
        "Both customer rows are returned.", "Base-row verification protects reads during asynchronous maintenance."),
      step("Change one attribute", "Customer 42 changes to dee@example before the old secondary entry is removed.", ["row42","index","queue email index update"],
        { lookup:"ada@example",index:{ "ada@example":[17,42],"bo@example":[51] },rows:{ 17:"ada@example",42:"dee@example",51:"bo@example" },candidates:[17,42],verified:[17],stale:[42] },
        "Verification suppresses stale candidate 42.", "A stale index may add false candidates but must not create false query results."),
      step("Apply index maintenance", "The updater removes 42 from ada@example and adds it under dee@example.", ["row42","index","move PK42 posting"],
        { lookup:"ada@example",index:{ "ada@example":[17],"bo@example":[51],"dee@example":[42] },rows:{ 17:"ada@example",42:"dee@example",51:"bo@example" },candidates:[17],verified:[17],stale:[] },
        "The secondary index converges with base rows.", "Every committed attribute eventually has exactly one corresponding posting per row.")
    ]);

  add("storage-systems", "Inverted indexes", "tree",
    "A document store builds term postings with document IDs, frequencies, and positions, then intersects them for an AND query.",
    [
      ["terms","distributed + storage","query terms",8,12],
      ["dict","term dictionary","lexicon",35,18],
      ["pd","distributed: d1,d4,d7","posting list",55,42],
      ["ps","storage: d2,d4,d7","posting list",55,76],
      ["docs","base docs d1..d7","document rows",86,58]
    ], [
      ["terms","dict","resolve posting offsets"],["dict","pd","load distributed postings"],
      ["dict","ps","load storage postings"],["pd","ps","intersect doc IDs"],
      ["ps","docs","verify positions and fields"]
    ], [
      step("Publish postings", "The lexicon points to sorted postings that carry term frequency and token positions.", null,
        { query:[],dictionary:{ distributed:120,storage:188 },distributed:[[1,2,[0,3]],[4,1,[2]],[7,1,[1]]],storage:[[2,1,[0]],[4,2,[0,4]],[7,1,[2]]],cursors:[0,0],matches:[],verified:[] },
        "Each term can be retrieved without scanning documents.", "Every posting list is strictly ordered by document ID."),
      step("Resolve both terms", "The dictionary maps distributed to offset 120 and storage to offset 188.", ["terms","dict","lookup two term offsets"],
        { query:["distributed","storage"],dictionary:{ distributed:120,storage:188 },distributed:[[1,2,[0,3]],[4,1,[2]],[7,1,[1]]],storage:[[2,1,[0]],[4,2,[0,4]],[7,1,[2]]],cursors:[0,0],matches:[],verified:[] },
        "Two posting streams are opened.", "Dictionary document frequency matches each posting-list length."),
      step("Advance smaller doc IDs", "d1 is below d2, then d2 is below d4, so cursors advance without base reads.", ["pd","ps","merge by ascending doc ID"],
        { query:["distributed","storage"],dictionary:{ distributed:120,storage:188 },distributed:[[1,2,[0,3]],[4,1,[2]],[7,1,[1]]],storage:[[2,1,[0]],[4,2,[0,4]],[7,1,[2]]],cursors:[1,1],matches:[],verified:[] },
        "Both cursors arrive at d4.", "Advancing the smaller ID cannot skip an intersection."),
      step("Intersect equal postings", "Equal IDs d4 and d7 enter the candidate result.", ["pd","ps","emit d4 and d7"],
        { query:["distributed","storage"],dictionary:{ distributed:120,storage:188 },distributed:[[1,2,[0,3]],[4,1,[2]],[7,1,[1]]],storage:[[2,1,[0]],[4,2,[0,4]],[7,1,[2]]],cursors:[3,3],matches:[4,7],verified:[] },
        "The AND query has two candidates.", "A document matches only if it appears in every required posting list."),
      step("Verify document constraints", "Base documents confirm d4 and d7 are live and satisfy any non-indexed filters.", ["ps","docs","verify d4 and d7"],
        { query:["distributed","storage"],dictionary:{ distributed:120,storage:188 },distributed:[[1,2,[0,3]],[4,1,[2]],[7,1,[1]]],storage:[[2,1,[0]],[4,2,[0,4]],[7,1,[2]]],cursors:[3,3],matches:[4,7],verified:[4,7] },
        "The store returns two exact documents with ranking features.", "Posting candidates are checked against document liveness and residual predicates.")
    ]);

  add("storage-systems", "Sparse indexes", "tree",
    "A sorted file uses one index entry per data block, then scans inside the selected block for an exact key.",
    [
      ["query","key=37","lookup key",8,14],
      ["sparse","1→B0 21→B1 41→B2","sparse index",42,16],
      ["b0","B0 keys 1..20","data block",25,68],
      ["b1","B1 keys 21..40","data block",52,78],
      ["b2","B2 keys 41..60","data block",82,62]
    ], [
      ["query","sparse","floor search"],["sparse","b0","block offset"],
      ["sparse","b1","block offset"],["sparse","b2","block offset"]
    ], [
      step("Index block boundaries", "Only first keys 1, 21, and 41 are stored for three sorted blocks.", null,
        { key:null,index:[[1,"B0"],[21,"B1"],[41,"B2"]],selected:null,scan:[],result:null,entriesPerBlock:20 },
        "Three entries cover sixty records.", "Each entry names the first key of one non-overlapping sorted block."),
      step("Floor-search the index", "For key 37, the greatest boundary not exceeding it is 21.", ["query","sparse","floor key 37 to boundary 21"],
        { key:37,index:[[1,"B0"],[21,"B1"],[41,"B2"]],selected:"B1",scan:[],result:null,entriesPerBlock:20 },
        "The lookup selects B1.", "The predecessor boundary identifies the only possible block."),
      step("Scan within B1", "The reader checks keys 21 through 37 inside the block.", ["sparse","b1","scan sorted records to 37"],
        { key:37,index:[[1,"B0"],[21,"B1"],[41,"B2"]],selected:"B1",scan:[21,25,30,35,37],result:37,entriesPerBlock:20 },
        "Key 37 is found after a bounded local scan.", "Sparse indexing trades index size for within-block work."),
      step("Stop an absent lookup", "For key 39, B1 reaches key 40 without equality and stops before B2.", ["b1","query","report key 39 absent"],
        { key:39,index:[[1,"B0"],[21,"B1"],[41,"B2"]],selected:"B1",scan:[35,37,40],result:"absent",entriesPerBlock:20 },
        "No other block can contain 39.", "Sorted, disjoint ranges make the absence conclusion exact."),
      step("Handle a new block", "Appending B3 for keys 61..80 adds only boundary entry 61→B3.", ["b2","sparse","append boundary 61 to B3"],
        { key:null,index:[[1,"B0"],[21,"B1"],[41,"B2"],[61,"B3"]],selected:"B3",scan:[],result:null,entriesPerBlock:20 },
        "Index growth follows block count, not row count.", "Every published block has one ordered boundary entry.")
    ]);

  add("storage-systems", "Covering indexes", "tree",
    "A covering index answers an active-user projection from indexed columns and visits the base table only for an uncovered field.",
    [
      ["query","status=active","predicate",8,14],
      ["cover","active→(17,Ada),(42,Bo)","covering leaf",42,22],
      ["base17","row17 city=SEA","base row",72,46],
      ["base42","row42 city=DAL","base row",86,72],
      ["result","id,name projection","query output",45,84]
    ], [
      ["query","cover","seek active"],["cover","result","emit included columns"],
      ["cover","base17","fetch uncovered city"],["cover","base42","fetch uncovered city"]
    ], [
      step("Store included columns", "The index key status includes projected columns id and name in each leaf entry.", null,
        { predicate:null,index:{ active:[[17,"Ada"],[42,"Bo"]],disabled:[[51,"Cy"]] },baseReads:[],projection:[],requested:["id","name"],covered:true },
        "The leaf can satisfy status, id, and name without heap data.", "A query is covered only when every required column exists in the index."),
      step("Seek active entries", "The engine reads the contiguous active range from the leaf.", ["query","cover","seek status active"],
        { predicate:"active",index:{ active:[[17,"Ada"],[42,"Bo"]],disabled:[[51,"Cy"]] },baseReads:[],projection:[],requested:["id","name"],covered:true },
        "Two qualifying entries are available.", "Index key order groups equal status values."),
      step("Return index-only rows", "Included values directly produce (17,Ada) and (42,Bo).", ["cover","result","emit covered projection"],
        { predicate:"active",index:{ active:[[17,"Ada"],[42,"Bo"]],disabled:[[51,"Cy"]] },baseReads:[],projection:[[17,"Ada"],[42,"Bo"]],requested:["id","name"],covered:true },
        "The query completes with zero base-page reads.", "Index-only output must come from a visibility-valid entry."),
      step("Request an uncovered field", "Adding city to the projection makes the index non-covering.", ["query","cover","request city not in leaf"],
        { predicate:"active",index:{ active:[[17,"Ada"],[42,"Bo"]],disabled:[[51,"Cy"]] },baseReads:[17,42],projection:[],requested:["id","name","city"],covered:false },
        "Primary-key pointers schedule two heap fetches.", "Missing projected columns require base-row access."),
      step("Join base values", "Rows 17 and 42 supply SEA and DAL and are rechecked as active.", ["base17","result","assemble full projection"],
        { predicate:"active",index:{ active:[[17,"Ada"],[42,"Bo"]],disabled:[[51,"Cy"]] },baseReads:[17,42],projection:[[17,"Ada","SEA"],[42,"Bo","DAL"]],requested:["id","name","city"],covered:false },
        "The expanded projection is exact but costs two reads.", "Base verification remains authoritative for uncovered data.")
    ]);

  add("storage-systems", "Partition indexes", "topology",
    "A routing index maps tenant hash ranges to versioned shard owners during an online partition move.",
    [
      ["key","tenant hash=62","routing key",8,14],
      ["map","v8 range directory","partition index",42,16],
      ["s1","S1 [0,49]","shard owner",20,72],
      ["s2","S2 [50,74]","shard owner",55,82],
      ["s3","S3 [75,99]","shard owner",86,62],
      ["copy","S4 shadow [50,74]","migration target",82,30]
    ], [
      ["key","map","lookup range"],["map","s1","route low range"],["map","s2","route middle range"],
      ["map","s3","route high range"],["s2","copy","copy range"],["map","copy","publish new owner"]
    ], [
      step("Publish routing epoch", "Directory v8 assigns three disjoint hash ranges to S1, S2, and S3.", null,
        { epoch:8,ranges:[[0,49,"S1"],[50,74,"S2"],[75,99,"S3"]],key:null,owner:null,shadow:null,cutover:false },
        "Every hash has one active owner.", "Ranges cover the keyspace exactly once within an epoch."),
      step("Route hash 62", "The partition index finds range [50,74] and returns S2.", ["key","map","find containing range for 62"],
        { epoch:8,ranges:[[0,49,"S1"],[50,74,"S2"],[75,99,"S3"]],key:62,owner:"S2",shadow:null,cutover:false },
        "The request reaches one shard instead of broadcasting.", "Clients route using one internally consistent directory epoch."),
      step("Start online copy", "S4 receives a snapshot of S2's range while v8 still routes reads and writes to S2.", ["s2","copy","copy [50,74] at LSN 900"],
        { epoch:8,ranges:[[0,49,"S1"],[50,74,"S2"],[75,99,"S3"]],key:62,owner:"S2",shadow:{ owner:"S4",range:[50,74],lsn:900 },cutover:false },
        "Foreground ownership remains stable during bulk movement.", "A shadow copy cannot serve authoritative writes before cutover."),
      step("Catch up and cut over", "After S4 replays through LSN 944, directory v9 changes [50,74] to S4.", ["map","copy","publish epoch 9 owner S4"],
        { epoch:9,ranges:[[0,49,"S1"],[50,74,"S4"],[75,99,"S3"]],key:62,owner:"S4",shadow:{ owner:"S4",range:[50,74],lsn:944 },cutover:true },
        "New requests route to S4.", "An epoch change atomically selects one write owner per range."),
      step("Reject stale routing", "A v8 client sent to S2 receives epoch 9 and retries against S4.", ["s2","map","redirect stale epoch 8"],
        { epoch:9,ranges:[[0,49,"S1"],[50,74,"S4"],[75,99,"S3"]],key:62,owner:"S4",shadow:null,cutover:true,retry:"v8 rejected" },
        "The moved range has no split write authority.", "Owners reject requests carrying an obsolete routing epoch.")
    ]);

  add("storage-systems", "Columnar storage", "storage",
    "An analytical scan reads only region and revenue columns from compressed row groups.",
    [
      ["query","SUM revenue WHERE region=EU","scan request",8,12],
      ["ids","id: 1 2 3 4","id column",24,54],
      ["regions","region: EU US EU AP","region column",46,72],
      ["revenue","revenue: 8 5 7 9","revenue column",68,54],
      ["names","name: A B C D","name column",88,76]
    ], [
      ["query","regions","predicate scan"],["regions","revenue","select matching positions"],
      ["revenue","query","aggregate values"],["ids","names","row reconstruction"]
    ], [
      step("Group values by column", "One row group stores each field contiguously instead of storing complete rows together.", null,
        { rowGroup:"RG0",columns:{ id:[1,2,3,4],region:["EU","US","EU","AP"],revenue:[8,5,7,9],name:["A","B","C","D"] },readColumns:[],positions:[],sum:0,bytesRead:0 },
        "Similar values share pages and compression context.", "All columns preserve the same row-position ordering."),
      step("Prune unused columns", "The projection and predicate require only region and revenue; id and name pages stay unread.", ["query","regions","open region page only"],
        { rowGroup:"RG0",columns:{ id:[1,2,3,4],region:["EU","US","EU","AP"],revenue:[8,5,7,9],name:["A","B","C","D"] },readColumns:["region"],positions:[],sum:0,bytesRead:16 },
        "Three quarters of the logical fields are initially skipped.", "Column pruning must retain every predicate and output dependency."),
      step("Build a selection vector", "Scanning the region column marks row positions 0 and 2 as EU.", ["regions","revenue","select positions 0 and 2"],
        { rowGroup:"RG0",columns:{ id:[1,2,3,4],region:["EU","US","EU","AP"],revenue:[8,5,7,9],name:["A","B","C","D"] },readColumns:["region"],positions:[0,2],sum:0,bytesRead:16 },
        "The selection vector avoids materializing nonmatching rows.", "A position refers to the same logical row across every column."),
      step("Read selected measures", "The revenue page contributes values 8 and 7 at selected positions.", ["revenue","query","aggregate positions 0 and 2"],
        { rowGroup:"RG0",columns:{ id:[1,2,3,4],region:["EU","US","EU","AP"],revenue:[8,5,7,9],name:["A","B","C","D"] },readColumns:["region","revenue"],positions:[0,2],sum:15,bytesRead:32 },
        "The aggregate equals 15 without reading names or IDs.", "Aggregation consumes only values selected by the predicate vector."),
      step("Contrast row reconstruction", "A point request for row 3 must gather position 2 from all four columns.", ["ids","names","gather row position 2"],
        { rowGroup:"RG0",columns:{ id:[1,2,3,4],region:["EU","US","EU","AP"],revenue:[8,5,7,9],name:["A","B","C","D"] },readColumns:["id","region","revenue","name"],positions:[2],sum:7,bytesRead:64,row:[3,"EU",7,"C"] },
        "Columnar analytics are efficient while full-row reconstruction touches more pages.", "A reconstructed row uses one identical ordinal from every required column.")
    ]);

  add("storage-systems", "Row-oriented storage", "storage",
    "An OLTP heap co-locates each customer's fields so a primary-key point read and update touch one row page.",
    [
      ["query","GET id=42","point request",8,14],
      ["directory","42→page P7","page directory",36,22],
      ["p7r0","row 41|Cy|US|5","row slot",30,70],
      ["p7r1","row 42|Ada|EU|8","row slot",58,82],
      ["p7r2","row 43|Bo|AP|9","row slot",86,66]
    ], [
      ["query","directory","resolve page"],["directory","p7r1","read row slot"],
      ["p7r0","p7r1","adjacent row"],["p7r1","p7r2","adjacent row"]
    ], [
      step("Co-locate complete rows", "Page P7 stores each customer's ID, name, region, and revenue together by row slot.", null,
        { page:"P7",slots:{ 0:[41,"Cy","US",5],1:[42,"Ada","EU",8],2:[43,"Bo","AP",9] },lookup:null,slot:null,row:null,dirty:false,scanFields:[] },
        "A complete tuple occupies one contiguous record.", "Each slot is independently addressable within its page."),
      step("Resolve row location", "The primary directory maps ID 42 to P7 slot 1.", ["query","directory","lookup id 42"],
        { page:"P7",slots:{ 0:[41,"Cy","US",5],1:[42,"Ada","EU",8],2:[43,"Bo","AP",9] },lookup:42,slot:1,row:null,dirty:false,scanFields:[] },
        "Only page P7 must be fetched.", "The directory pointer identifies one current row slot."),
      step("Read the complete tuple", "One slot read returns 42, Ada, EU, and revenue 8.", ["directory","p7r1","read P7 slot 1"],
        { page:"P7",slots:{ 0:[41,"Cy","US",5],1:[42,"Ada","EU",8],2:[43,"Bo","AP",9] },lookup:42,slot:1,row:[42,"Ada","EU",8],dirty:false,scanFields:["id","name","region","revenue"] },
        "The point query needs no cross-page reconstruction.", "All fields in a row share one record version."),
      step("Update one field in place", "Revenue changes from 8 to 10 inside row 42 and marks P7 dirty.", ["query","p7r1","set revenue 10"],
        { page:"P7",slots:{ 0:[41,"Cy","US",5],1:[42,"Ada","EU",10],2:[43,"Bo","AP",9] },lookup:42,slot:1,row:[42,"Ada","EU",10],dirty:true,scanFields:["revenue"] },
        "The updated tuple remains co-located.", "A row update publishes one consistent record image."),
      step("Expose analytical cost", "SUM(revenue) scans revenue fields embedded in all three row records.", ["p7r0","p7r2","scan revenue across rows"],
        { page:"P7",slots:{ 0:[41,"Cy","US",5],1:[42,"Ada","EU",10],2:[43,"Bo","AP",9] },lookup:"SUM revenue",slot:null,row:null,dirty:true,scanFields:["slot0.revenue","slot1.revenue","slot2.revenue"],sum:24 },
        "The aggregate reads unrelated name and region bytes from the same page.", "Row layout optimizes tuple locality, not single-column scans.")
    ]);

  add("storage-systems", "Log-structured storage", "storage",
    "A key-value store appends new versions, resolves reads through a location index, and cleans segments by copying live records.",
    [
      ["write","PUT b=9","mutation",8,12],
      ["active","segment S3 append tail","active segment",34,24],
      ["old","segment S1 sealed","old segment",22,76],
      ["index","a→S1:0 b→S3:1","location index",62,44],
      ["clean","segment S4 output","cleaned segment",84,78]
    ], [
      ["write","active","append record"],["active","index","publish new location"],
      ["index","old","read older location"],["old","clean","copy live records"],
      ["clean","index","rewrite locations"]
    ], [
      step("Start with sealed records", "S1 contains a=1 and b=2; the location index points both keys into S1.", null,
        { segments:{ S1:[["a",1,true],["b",2,true]],S3:[] },tail:["S3",0],locations:{ a:"S1:0",b:"S1:1" },lookup:null,liveBytes:2,deadBytes:0 },
        "Reads find current records indirectly through the index.", "A location index points to the newest appended version."),
      step("Append a new version", "PUT b=9 writes a complete record at the S3 tail rather than overwriting S1.", ["write","active","append b=9 at S3:0"],
        { segments:{ S1:[["a",1,true],["b",2,false]],S3:[["b",9,true]] },tail:["S3",1],locations:{ a:"S1:0",b:"S1:1" },lookup:null,liveBytes:2,deadBytes:1 },
        "The old b=2 becomes reclaimable dead data.", "Foreground writes advance the append tail monotonically."),
      step("Publish the new location", "The index atomically changes b from S1:1 to S3:0.", ["active","index","set b location S3:0"],
        { segments:{ S1:[["a",1,true],["b",2,false]],S3:[["b",9,true]] },tail:["S3",1],locations:{ a:"S1:0",b:"S3:0" },lookup:"b",result:9,liveBytes:2,deadBytes:1 },
        "Reads of b now return 9.", "Index publication follows durable append and exposes only a complete record."),
      step("Select a dirty segment", "Cleaner chooses S1 because half its records are dead and copies only live a=1 to S4.", ["old","clean","copy live a=1"],
        { segments:{ S1:[["a",1,true],["b",2,false]],S3:[["b",9,true]],S4:[["a",1,true]] },tail:["S3",1],locations:{ a:"S1:0",b:"S3:0" },lookup:null,cleaning:"S1",liveBytes:2,deadBytes:1 },
        "Dead b=2 is omitted from cleaner output.", "Cleaning copies a record only if the index still names its old location."),
      step("Swap locations and reclaim", "The index moves a to S4:0, then S1 is deleted.", ["clean","index","publish a S4:0 and retire S1"],
        { segments:{ S3:[["b",9,true]],S4:[["a",1,true]] },tail:["S3",1],locations:{ a:"S4:0",b:"S3:0" },lookup:"a",result:1,liveBytes:2,deadBytes:0 },
        "Space is reclaimed without blocking append-only writes.", "A segment is removed only after every live copied record has a published new location.")
    ]);

  add("storage-systems", "Object storage", "storage",
    "An object store resolves a key to immutable metadata and a version manifest whose chunks are distributed across storage nodes.",
    [
      ["key","photos/cat.jpg","object key",8,14],
      ["meta","metadata v17","metadata record",36,20],
      ["manifest","manifest m17","chunk manifest",55,50],
      ["c1","chunk a8f 4MiB","data chunk",28,82],
      ["c2","chunk b31 4MiB","data chunk",58,86],
      ["c3","chunk c09 1MiB","data chunk",86,72]
    ], [
      ["key","meta","namespace lookup"],["meta","manifest","version pointer"],
      ["manifest","c1","chunk 0"],["manifest","c2","chunk 1"],["manifest","c3","chunk 2"]
    ], [
      step("Resolve immutable metadata", "The key maps to version 17, content length 9 MiB, checksum 71de, and manifest m17.", null,
        { key:"photos/cat.jpg",version:17,etag:"71de",length:"9MiB",manifest:null,chunks:[],verified:[],result:null },
        "Namespace metadata describes one immutable object version.", "A version's length, checksum, and manifest pointer do not mutate."),
      step("Load the manifest", "Manifest m17 orders chunk hashes a8f, b31, and c09 with exact lengths.", ["meta","manifest","read m17"],
        { key:"photos/cat.jpg",version:17,etag:"71de",length:"9MiB",manifest:[["a8f",4],["b31",4],["c09",1]],chunks:[],verified:[],result:null },
        "The reader knows which byte ranges to fetch.", "Manifest order defines object byte order."),
      step("Fetch chunks in parallel", "The client requests all three content-addressed chunks from their storage nodes.", ["manifest","c1","fetch a8f,b31,c09"],
        { key:"photos/cat.jpg",version:17,etag:"71de",length:"9MiB",manifest:[["a8f",4],["b31",4],["c09",1]],chunks:["a8f","b31","c09"],verified:[],result:null },
        "Nine MiB of chunk payload is available for assembly.", "Each returned chunk must match its manifest hash."),
      step("Verify and assemble", "Hashes verify all chunks before concatenation in manifest order.", ["c1","manifest","verify chunk hashes"],
        { key:"photos/cat.jpg",version:17,etag:"71de",length:"9MiB",manifest:[["a8f",4],["b31",4],["c09",1]],chunks:["a8f","b31","c09"],verified:["a8f","b31","c09"],result:"9MiB object" },
        "The complete cat.jpg bytes are returned.", "Assembly never mixes chunks from different manifests."),
      step("Publish a replacement version", "A PUT creates manifest m18 and atomically advances only the key's metadata pointer.", ["key","meta","commit version 18 manifest m18"],
        { key:"photos/cat.jpg",version:18,etag:"8a20",length:"10MiB",manifest:[["a8f",4],["d44",4],["e10",2]],chunks:["a8f","d44","e10"],verified:["a8f","d44","e10"],result:"10MiB object" },
        "Readers choose either complete v17 or complete v18.", "Object replacement publishes a new immutable version rather than patching chunks in place.")
    ]);

  add("storage-systems", "Block storage", "topology",
    "A virtual disk controller maps logical blocks to mirrored physical extents and repairs a failed replica.",
    [
      ["host","write LBA 12","block client",8,14],
      ["ctl","volume controller","mapping authority",38,22],
      ["map","LBA12→extent E7","block map",55,48],
      ["r1","node A E7","primary extent",28,82],
      ["r2","node B E7","mirror extent",60,86],
      ["r3","node C spare","repair target",88,68]
    ], [
      ["host","ctl","read/write LBA"],["ctl","map","resolve extent"],
      ["map","r1","write replica A"],["map","r2","write replica B"],["r1","r3","repair extent"]
    ], [
      step("Map the logical block", "Volume v3 maps LBA 12 to mirrored extent E7 on nodes A and B.", null,
        { volume:"v3",lba:12,generation:4,mapping:{ extent:"E7",replicas:["A","B"] },writes:[],acks:[],failed:[],repair:null },
        "The host sees a stable block number independent of physical placement.", "One mapping generation identifies the authoritative replica set."),
      step("Issue a block write", "The host sends 4 KiB payload checksum 9c1 to the controller for LBA 12.", ["host","ctl","WRITE LBA12 checksum 9c1"],
        { volume:"v3",lba:12,generation:4,mapping:{ extent:"E7",replicas:["A","B"] },writes:[["A","9c1"],["B","9c1"]],acks:[],failed:[],repair:null },
        "The controller fans the write to both extents.", "Replicas receive identical block generation and checksum."),
      step("Acknowledge durable mirrors", "Nodes A and B fsync generation 44 and return acknowledgements.", ["r1","ctl","ack A and B generation 44"],
        { volume:"v3",lba:12,generation:4,mapping:{ extent:"E7",replicas:["A","B"] },writes:[["A","9c1"],["B","9c1"]],acks:[["A",44],["B",44]],failed:[],repair:null },
        "The controller safely acknowledges the host write.", "Success requires the configured number of durable replica acknowledgements."),
      step("Detect one failed extent", "Node B stops responding; reads continue from A while C is allocated as a repair target.", ["ctl","r3","allocate replacement for B"],
        { volume:"v3",lba:12,generation:4,mapping:{ extent:"E7",replicas:["A","B"] },writes:[],acks:[["A",44]],failed:["B"],repair:{ source:"A",target:"C",generation:44,status:"copying" } },
        "The volume remains readable but degraded.", "Repair copies from a replica whose generation and checksum are current."),
      step("Complete repair and remap", "C verifies checksum 9c1, then mapping generation 5 replaces B with C.", ["r3","map","publish replicas A,C generation 5"],
        { volume:"v3",lba:12,generation:5,mapping:{ extent:"E7",replicas:["A","C"] },writes:[],acks:[["A",44],["C",44]],failed:["B"],repair:{ source:"A",target:"C",generation:44,status:"complete" } },
        "The block returns to two healthy copies.", "A replacement joins the active map only after complete verified synchronization.")
    ]);

  add("storage-systems", "Distributed filesystems", "topology",
    "A distributed filesystem resolves a pathname through namespace metadata, reads replicated chunks, and repairs a lost copy.",
    [
      ["client","open /logs/app","filesystem client",8,12],
      ["namespace","/logs/app→f81","namespace metadata",38,18],
      ["manifest","f81: C10,C11","file chunk map",55,46],
      ["cs1","chunk server A","chunk replica host",22,82],
      ["cs2","chunk server B","chunk replica host",55,86],
      ["cs3","chunk server C","chunk replica host",86,72]
    ], [
      ["client","namespace","resolve pathname"],["namespace","manifest","load file metadata"],
      ["manifest","cs1","locate C10 replicas"],["manifest","cs2","locate C11 replicas"],
      ["cs1","cs3","repair missing replica"]
    ], [
      step("Resolve the namespace", "The metadata authority maps /logs/app to file ID f81 and generation 12.", null,
        { path:"/logs/app",fileId:"f81",generation:12,chunks:null,locations:{},reads:[],failed:[],repair:null },
        "The hierarchical name resolves independently of data placement.", "One namespace generation identifies the current file manifest."),
      step("Load chunk metadata", "File f81 consists of ordered chunks C10 and C11 with replication factor two.", ["namespace","manifest","read f81 generation 12"],
        { path:"/logs/app",fileId:"f81",generation:12,chunks:["C10","C11"],locations:{ C10:["A","B"],C11:["B","C"] },reads:[],failed:[],repair:null },
        "The client receives chunk order and replica locations.", "Every published chunk has the configured number of distinct hosts."),
      step("Read nearby replicas", "The client reads C10 from A and C11 from C and concatenates them by chunk ordinal.", ["manifest","cs1","read C10 from A and C11 from C"],
        { path:"/logs/app",fileId:"f81",generation:12,chunks:["C10","C11"],locations:{ C10:["A","B"],C11:["B","C"] },reads:[["C10","A"],["C11","C"]],failed:[],repair:null },
        "The file stream is reconstructed without routing data through the namespace authority.", "Chunk bytes are ordered by the file manifest, not response time."),
      step("Detect under-replication", "Server B fails, leaving C10 only on A and C11 only on C.", ["cs2","namespace","report B unavailable"],
        { path:"/logs/app",fileId:"f81",generation:12,chunks:["C10","C11"],locations:{ C10:["A"],C11:["C"] },reads:[["C10","A"],["C11","C"]],failed:["B"],repair:{ C10:["A","C"],C11:["C","A"],status:"scheduled" } },
        "Metadata marks both chunks under-replicated and chooses nonfailed targets.", "Failure detection changes placement metadata only after a host lease expires."),
      step("Repair and publish locations", "A copies C10 to C, C copies C11 to A, and verified replicas restore factor two.", ["cs1","cs3","copy and verify C10/C11"],
        { path:"/logs/app",fileId:"f81",generation:13,chunks:["C10","C11"],locations:{ C10:["A","C"],C11:["C","A"] },reads:[["C10","A"],["C11","C"]],failed:["B"],repair:{ C10:["A","C"],C11:["C","A"],status:"complete" } },
        "The file is healthy despite losing one chunk server.", "New locations publish only after chunk identity and checksum verification.")
    ]);

  function timelineEntities(labels) {
    return labels.map(function (label, i) {
      return { id: "e" + i, label: label, role: "timestamped-event", x: 10 + i * (80 / Math.max(1, labels.length - 1)), y: 48 };
    });
  }

  add("streaming-real-time-processing", "Tumbling windows", "stream",
    "A dashboard counts orders in disjoint one-minute event-time windows.",
    timelineEntities(["o1@12","o2@48","o3@61","o4@119"]).concat([
      { id: "w0", label: "[0,60)", role: "window", x: 28, y: 72 },
      { id: "w1", label: "[60,120)", role: "window", x: 72, y: 72 }
    ]), [
      { from: "e0", to: "w0", relation: "belongs-to" }, { from: "e1", to: "w0", relation: "belongs-to" },
      { from: "e2", to: "w1", relation: "belongs-to" }, { from: "e3", to: "w1", relation: "belongs-to" }
    ], [
      step("Open first minute", "Order o1 at t=12 opens window [0,60).", { type: "event", id: "o1", time: 12 },
        { events: [["o1",12]], windows: [{ start:0,end:60,count:1,status:"open" }], watermark: 12, emitted: [] },
        "The first window count is one.", "Each event maps to exactly one aligned window."),
      step("Aggregate same window", "o2 at t=48 increments the existing [0,60) bucket.", { type: "event", id: "o2", time: 48 },
        { events: [["o1",12],["o2",48]], windows: [{ start:0,end:60,count:2,status:"open" }], watermark: 48, emitted: [] },
        "The first-minute count reaches two.", "Window boundaries are fixed multiples of 60."),
      step("Open next minute", "o3 at t=61 belongs only to [60,120).", { type: "event", id: "o3", time: 61 },
        { events: [["o1",12],["o2",48],["o3",61]], windows: [{ start:0,end:60,count:2,status:"open" },{ start:60,end:120,count:1,status:"open" }], watermark: 61, emitted: [] },
        "A second disjoint bucket appears.", "Tumbling windows never overlap."),
      step("Close first window", "The watermark passing 60 finalizes count 2 for [0,60).", { type: "watermark", time: 70 },
        { events: [["o1",12],["o2",48],["o3",61]], windows: [{ start:0,end:60,count:2,status:"closed" },{ start:60,end:120,count:1,status:"open" }], watermark: 70, emitted: [[0,60,2]] },
        "The first result is emitted once.", "A window closes when watermark is at least its end."),
      step("Finish second window", "o4 at 119 increments the second bucket before watermark 125 closes it.", { type: "watermark", time: 125 },
        { events: [["o1",12],["o2",48],["o3",61],["o4",119]], windows: [{ start:0,end:60,count:2,status:"closed" },{ start:60,end:120,count:2,status:"closed" }], watermark: 125, emitted: [[0,60,2],[60,120,2]] },
        "Both minute counts equal two.", "Every accepted event contributes to one and only one result.")
    ]);

  add("streaming-real-time-processing", "Sliding windows", "stream",
    "A fraud detector computes ten-second counts every five seconds.",
    timelineEntities(["a@2","b@7","c@11","d@14"]).concat([
      { id: "w0", label: "[0,10)", role: "window", x: 24, y: 72 },
      { id: "w1", label: "[5,15)", role: "window", x: 50, y: 78 },
      { id: "w2", label: "[10,20)", role: "window", x: 76, y: 72 }
    ]), [
      { from: "e0", to: "w0", relation: "belongs-to" },
      { from: "e1", to: "w0", relation: "belongs-to" }, { from: "e1", to: "w1", relation: "belongs-to" },
      { from: "e2", to: "w1", relation: "belongs-to" }, { from: "e2", to: "w2", relation: "belongs-to" },
      { from: "e3", to: "w1", relation: "belongs-to" }, { from: "e3", to: "w2", relation: "belongs-to" }
    ], [
      step("First pane", "a@2 contributes to [0,10) only.", { type: "event", id: "a", time: 2 },
        { events: [["a",2]], windows: [{ start:0,end:10,count:1,status:"open" }], watermark: 2, emitted: [] },
        "One window is active.", "Windows start every slide=5 seconds."),
      step("Overlap begins", "b@7 lies in [0,10) and [5,15).", { type: "event", id: "b", time: 7 },
        { events: [["a",2],["b",7]], windows: [{ start:0,end:10,count:2,status:"open" },{ start:5,end:15,count:1,status:"open" }], watermark: 7, emitted: [] },
        "One event updates two overlapping windows.", "Membership follows start <= timestamp < end."),
      step("Advance windows", "c@11 contributes to [5,15) and [10,20), not the expired first interval.", { type: "event", id: "c", time: 11 },
        { events: [["a",2],["b",7],["c",11]], windows: [{ start:0,end:10,count:2,status:"open" },{ start:5,end:15,count:2,status:"open" },{ start:10,end:20,count:1,status:"open" }], watermark: 11, emitted: [] },
        "Three logical windows hold counts.", "A ten-second width with five-second slide gives at most two memberships per event."),
      step("Update both active windows", "d@14 raises [5,15) to three and [10,20) to two.", { type: "event", id: "d", time: 14 },
        { events: [["a",2],["b",7],["c",11],["d",14]], windows: [{ start:0,end:10,count:2,status:"open" },{ start:5,end:15,count:3,status:"open" },{ start:10,end:20,count:2,status:"open" }], watermark: 14, emitted: [] },
        "Overlapping counts diverge correctly.", "Each window aggregates its own timestamp range."),
      step("Emit by watermark", "Watermark 16 finalizes windows ending at 10 and 15.", { type: "watermark", time: 16 },
        { events: [["a",2],["b",7],["c",11],["d",14]], windows: [{ start:0,end:10,count:2,status:"closed" },{ start:5,end:15,count:3,status:"closed" },{ start:10,end:20,count:2,status:"open" }], watermark: 16, emitted: [[0,10,2],[5,15,3]] },
        "Two periodic fraud metrics are published.", "Only windows whose end is behind the watermark are final.")
    ]);

  add("streaming-real-time-processing", "Session windows", "stream",
    "A product groups clicks into sessions separated by more than 30 seconds.",
    timelineEntities(["c1@5","c2@20","c3@44","c4@90"]).concat([
      { id: "s0", label: "session A", role: "session-window", x: 32, y: 74 },
      { id: "s1", label: "session B", role: "session-window", x: 78, y: 74 }
    ]), [
      { from: "e0", to: "s0", relation: "session-member" }, { from: "e1", to: "s0", relation: "session-member" },
      { from: "e2", to: "s0", relation: "session-member" }, { from: "e3", to: "s1", relation: "session-member" }
    ], [
      step("Start a session", "c1@5 opens session [5,35] with a 30-second inactivity gap.", { type: "event", id: "c1", time: 5 },
        { events: [["c1",5]], sessions: [{ id:"A",start:5,last:5,closeAfter:35,count:1,status:"open" }], watermark: 5, emitted: [] },
        "Session A is active.", "A session remains open until last-event time plus gap."),
      step("Extend on activity", "c2@20 arrives before 35 and extends closeAfter to 50.", { type: "event", id: "c2", time: 20 },
        { events: [["c1",5],["c2",20]], sessions: [{ id:"A",start:5,last:20,closeAfter:50,count:2,status:"open" }], watermark: 20, emitted: [] },
        "The same session now has two clicks.", "An in-gap event extends, rather than duplicates, the session."),
      step("Extend again", "c3@44 is within 30 seconds of c2, extending session A through 74.", { type: "event", id: "c3", time: 44 },
        { events: [["c1",5],["c2",20],["c3",44]], sessions: [{ id:"A",start:5,last:44,closeAfter:74,count:3,status:"open" }], watermark: 44, emitted: [] },
        "Session A spans 5 through 44.", "Consecutive gaps, not total duration, determine membership."),
      step("Close after inactivity", "Watermark 80 passes closeAfter 74 and emits session A.", { type: "watermark", time: 80 },
        { events: [["c1",5],["c2",20],["c3",44]], sessions: [{ id:"A",start:5,last:44,closeAfter:74,count:3,status:"closed" }], watermark: 80, emitted: [["A",5,44,3]] },
        "The first session is final.", "Closed sessions have no accepted on-time event within their inactivity gap."),
      step("Open a new session", "c4@90 arrives after the gap and starts session B.", { type: "event", id: "c4", time: 90 },
        { events: [["c1",5],["c2",20],["c3",44],["c4",90]], sessions: [{ id:"A",start:5,last:44,closeAfter:74,count:3,status:"closed" },{ id:"B",start:90,last:90,closeAfter:120,count:1,status:"open" }], watermark: 90, emitted: [["A",5,44,3]] },
        "Two user sessions are distinguished.", "A gap greater than 30 seconds creates a new window.")
    ]);

  add("streaming-real-time-processing", "Watermarks", "stream",
    "Two partitions report event-time progress despite out-of-order arrivals.",
    [
      { id: "p0", label: "P0 max=105", role: "partition-timeline", x: 25, y: 30 },
      { id: "p1", label: "P1 max=101", role: "partition-timeline", x: 75, y: 30 },
      { id: "wm", label: "WM=min(max-5)", role: "watermark", x: 50, y: 68 },
      { id: "late", label: "event@94", role: "late-event", x: 20, y: 82 }
    ], [
      { from: "p0", to: "wm", relation: "candidate-watermark" },
      { from: "p1", to: "wm", relation: "candidate-watermark" },
      { from: "late", to: "wm", relation: "compare-event-time" }
    ], [
      step("Observe partition zero", "P0 sees event time 100; five seconds of allowed disorder gives candidate 95.", { type: "event", partition: 0, time: 100 },
        { partitions: [{ id:0,maxEventTime:100,candidate:95,idle:false },{ id:1,maxEventTime:null,candidate:null,idle:false }], watermark: null, event: [0,100], late: false, closedWindows: [] },
        "Global progress waits for P1.", "A watermark cannot exceed any active partition's candidate."),
      step("Observe partition one", "P1 sees time 98, producing candidate 93 and global watermark 93.", { type: "event", partition: 1, time: 98 },
        { partitions: [{ id:0,maxEventTime:100,candidate:95,idle:false },{ id:1,maxEventTime:98,candidate:93,idle:false }], watermark: 93, event: [1,98], late: false, closedWindows: [] },
        "Event times through 93 are considered complete.", "The global watermark is the minimum active candidate."),
      step("Accept out of order", "P0 receives time 97 after 100; it is newer than watermark 93 and remains on time.", { type: "event", partition: 0, time: 97 },
        { partitions: [{ id:0,maxEventTime:100,candidate:95,idle:false },{ id:1,maxEventTime:98,candidate:93,idle:false }], watermark: 93, event: [0,97], late: false, closedWindows: [] },
        "Out-of-order does not automatically mean late.", "Partition maxima and watermarks never move backward."),
      step("Advance both partitions", "P0 reaches 105 and P1 reaches 101, moving the global watermark to 96.", { type: "event-batch", events: [[0,105],[1,101]] },
        { partitions: [{ id:0,maxEventTime:105,candidate:100,idle:false },{ id:1,maxEventTime:101,candidate:96,idle:false }], watermark: 96, event: [1,101], late: false, closedWindows: [[0,95]] },
        "Windows ending at or before 96 may close.", "Global event-time progress is monotonic."),
      step("Classify a late event", "An event at time 94 arrives behind watermark 96 and follows the late-data policy.", { type: "event", partition: 1, time: 94 },
        { partitions: [{ id:0,maxEventTime:105,candidate:100,idle:false },{ id:1,maxEventTime:101,candidate:96,idle:false }], watermark: 96, event: [1,94], late: true, closedWindows: [[0,95]] },
        "The record is routed to late handling.", "An event is late when event time is less than the current watermark.")
    ]);

  add("streaming-real-time-processing", "Checkpointing", "stream",
    "A stateful stream processor restores exactly-once counts after failure.",
    storageEntities(["source offsets","operator count","checkpoint barrier","state store","sink txn"], "checkpoint-participant"),
    [
      { from: "n0", to: "n1", relation: "records" }, { from: "n0", to: "n2", relation: "barrier" },
      { from: "n2", to: "n3", relation: "snapshot" }, { from: "n1", to: "n4", relation: "results" }
    ], [
      step("Process records", "The operator consumes offsets 0..7 and counts key A three times.", { type: "consume", through: 7 },
        { sourceOffset: 8, state: { A:3,B:2 }, barrier: null, checkpoint: null, sinkPending: [["A",3],["B",2]], sinkCommitted: [], status: "running" },
        "In-memory state reflects eight consumed offsets.", "State transitions follow source offset order."),
      step("Inject barrier", "Checkpoint barrier C1 enters after source offset 7.", { type: "barrier", id: "C1", offset: 8 },
        { sourceOffset: 8, state: { A:3,B:2 }, barrier: { id:"C1",offset:8,status:"aligning" }, checkpoint: null, sinkPending: [["A",3],["B",2]], sinkCommitted: [], status: "aligning" },
        "C1 defines a consistent stream cut.", "No post-barrier record is included in C1."),
      step("Persist state and offset", "The processor snapshots A=3, B=2 together with next offset 8.", { type: "snapshot", id: "C1" },
        { sourceOffset: 8, state: { A:3,B:2 }, barrier: { id:"C1",offset:8,status:"complete" }, checkpoint: { id:"C1",offset:8,state:{ A:3,B:2 } }, sinkPending: [], sinkCommitted: [["C1","A",3],["C1","B",2]], status: "running" },
        "Checkpoint C1 and sink transaction commit together.", "A completed checkpoint binds source position, operator state, and sink commit."),
      step("Fail after more work", "Offsets 8..10 raise A to five, but a crash loses uncheckpointed changes.", { type: "crash", afterOffset: 10 },
        { sourceOffset: 11, state: null, barrier: null, checkpoint: { id:"C1",offset:8,state:{ A:3,B:2 } }, sinkPending: [["A",5]], sinkCommitted: [["C1","A",3],["C1","B",2]], status: "failed" },
        "Only post-C1 volatile work is lost.", "Committed sink output remains associated with C1."),
      step("Restore and replay", "The job restores C1 at offset 8, then replays 8..10 to reconstruct A=5 once.", { type: "restore", checkpoint: "C1" },
        { sourceOffset: 11, state: { A:5,B:2 }, barrier: null, checkpoint: { id:"C1",offset:8,state:{ A:3,B:2 } }, sinkPending: [["A",5]], sinkCommitted: [["C1","A",3],["C1","B",2]], status: "running" },
        "Processing resumes without double-committing output.", "Replay starts exactly at the checkpointed next offset.")
    ]);

  add("distributed-data-processing", "MapReduce", "mapreduce",
    "A batch job counts words across three documents.",
    storageEntities(["doc0: cat dog","doc1: cat owl","doc2: dog cat","Mapper 0","Mapper 1","Mapper 2","Reducer 0"], "mapreduce-stage"),
    [
      { from: "n0", to: "n3", relation: "input-split" }, { from: "n1", to: "n4", relation: "input-split" },
      { from: "n2", to: "n5", relation: "input-split" }, { from: "n3", to: "n6", relation: "group-by-key" },
      { from: "n4", to: "n6", relation: "group-by-key" }, { from: "n5", to: "n6", relation: "group-by-key" }
    ], [
      step("Split input", "Three documents become independent map splits.", { type: "split" },
        { splits: [["cat","dog"],["cat","owl"],["dog","cat"]], mapOutputs: [[],[],[]], partitions: {}, reduceInputs: {}, output: {} },
        "Each mapper owns one document.", "Every input record belongs to exactly one split."),
      step("Map pairs", "Mappers emit one (word,1) pair per token.", { type: "map" },
        { splits: [["cat","dog"],["cat","owl"],["dog","cat"]], mapOutputs: [[["cat",1],["dog",1]],[["cat",1],["owl",1]],[["dog",1],["cat",1]]], partitions: {}, reduceInputs: {}, output: {} },
        "Six intermediate pairs are produced.", "Map is deterministic for each input token."),
      step("Partition keys", "Hash partitioning routes identical words to the same reducer partition.", { type: "partition" },
        { splits: [["cat","dog"],["cat","owl"],["dog","cat"]], mapOutputs: [[["cat",1],["dog",1]],[["cat",1],["owl",1]],[["dog",1],["cat",1]]], partitions: { p0:["cat","cat","cat"],p1:["dog","owl","dog"] }, reduceInputs: {}, output: {} },
        "All cat values meet in p0.", "Equal keys always select the same partition."),
      step("Group values", "Shuffle sorts and groups values by key.", { type: "group" },
        { splits: [["cat","dog"],["cat","owl"],["dog","cat"]], mapOutputs: [[["cat",1],["dog",1]],[["cat",1],["owl",1]],[["dog",1],["cat",1]]], partitions: { p0:["cat","cat","cat"],p1:["dog","dog","owl"] }, reduceInputs: { cat:[1,1,1],dog:[1,1],owl:[1] }, output: {} },
        "Reducers receive complete value lists.", "A key is reduced only after all mapper outputs arrive."),
      step("Reduce totals", "Reducers sum each grouped list.", { type: "reduce" },
        { splits: [["cat","dog"],["cat","owl"],["dog","cat"]], mapOutputs: [[["cat",1],["dog",1]],[["cat",1],["owl",1]],[["dog",1],["cat",1]]], partitions: { p0:["cat","cat","cat"],p1:["dog","dog","owl"] }, reduceInputs: { cat:[1,1,1],dog:[1,1],owl:[1] }, output: { cat:3,dog:2,owl:1 } },
        "The final word counts are materialized.", "Each output count equals the sum of all mapped values for its key.")
    ]);

  add("distributed-data-processing", "Shuffle", "mapreduce",
    "Workers repartition click records by user before aggregation.",
    storageEntities(["M0","M1","M2","P0","P1","R0","R1"], "shuffle-node"),
    [
      { from: "n0", to: "n3", relation: "hash-even" }, { from: "n0", to: "n4", relation: "hash-odd" },
      { from: "n1", to: "n3", relation: "hash-even" }, { from: "n1", to: "n4", relation: "hash-odd" },
      { from: "n2", to: "n3", relation: "hash-even" }, { from: "n2", to: "n4", relation: "hash-odd" },
      { from: "n3", to: "n5", relation: "fetch" }, { from: "n4", to: "n6", relation: "fetch" }
    ], [
      step("Map-side records", "Three mappers hold records for users 10, 11, and 12.", null,
        { mapperBuffers: { M0:[[10,"a"],[11,"b"]],M1:[[12,"c"],[10,"d"]],M2:[[11,"e"]] }, partitionRuns: {}, transfers: [], reducerInputs: { R0:[],R1:[] }, bytesMoved: 0 },
        "Records are local to input workers.", "Every record retains its partition key."),
      step("Partition buffers", "hash(user)%2 sends even users to P0 and odd users to P1.", { type: "partition", expression: "user%2" },
        { mapperBuffers: { M0:[],M1:[],M2:[] }, partitionRuns: { M0P0:[[10,"a"]],M0P1:[[11,"b"]],M1P0:[[10,"d"],[12,"c"]],M1P1:[],M2P0:[],M2P1:[[11,"e"]] }, transfers: [], reducerInputs: { R0:[],R1:[] }, bytesMoved: 0 },
        "Each mapper creates one run per reducer.", "Equal user IDs choose the same partition on every mapper."),
      step("Sort local runs", "Runs sort by user so reducers can merge streams.", { type: "sort-runs" },
        { mapperBuffers: { M0:[],M1:[],M2:[] }, partitionRuns: { M0P0:[[10,"a"]],M0P1:[[11,"b"]],M1P0:[[10,"d"],[12,"c"]],M1P1:[],M2P0:[],M2P1:[[11,"e"]] }, transfers: [], reducerInputs: { R0:[],R1:[] }, bytesMoved: 0 },
        "All six runs are ordered.", "Each run is nondecreasing by partition key."),
      step("Transfer partitions", "R0 fetches all P0 runs and R1 fetches all P1 runs across the network.", { type: "transfer" },
        { mapperBuffers: { M0:[],M1:[],M2:[] }, partitionRuns: { M0P0:[[10,"a"]],M0P1:[[11,"b"]],M1P0:[[10,"d"],[12,"c"]],M1P1:[],M2P0:[],M2P1:[[11,"e"]] }, transfers: [["M0P0","R0"],["M1P0","R0"],["M0P1","R1"],["M2P1","R1"]], reducerInputs: { R0:[[10,"a"],[10,"d"],[12,"c"]],R1:[[11,"b"],[11,"e"]] }, bytesMoved: 5 },
        "Five records cross mapper/reducer boundaries.", "A reducer receives every run for its partition."),
      step("Merge reducer streams", "Reducers merge sorted runs into grouped user sequences.", { type: "merge" },
        { mapperBuffers: { M0:[],M1:[],M2:[] }, partitionRuns: {}, transfers: [["M0P0","R0"],["M1P0","R0"],["M0P1","R1"],["M2P1","R1"]], reducerInputs: { R0:[[10,["a","d"]],[12,["c"]]],R1:[[11,["b","e"]]] }, bytesMoved: 5 },
        "Each user's records are contiguous at one reducer.", "No key is split across reducers.")
    ]);

  add("distributed-data-processing", "Hash joins", "mapreduce",
    "A worker joins a small users table to a large orders partition.",
    storageEntities(["users input run","hash buckets","orders input run","join result buffer"], "join-stage"),
    [
      { from: "n0", to: "n1", relation: "build" }, { from: "n2", to: "n1", relation: "probe" },
      { from: "n1", to: "n3", relation: "emit-match" }
    ], [
      step("Choose build side", "The smaller users relation is selected for the in-memory hash table.", { type: "choose-build", relation: "users" },
        { buildRows: [[1,"Ana"],[2,"Bo"],[4,"Di"]], buckets: { 0:[],1:[],2:[] }, probeRows: [[101,2],[102,1],[103,3],[104,2]], probe: null, matches: [] },
        "Memory cost follows the smaller input.", "Join key equality determines matches."),
      step("Build hash buckets", "User IDs hash into buckets while retaining full rows.", { type: "build" },
        { buildRows: [[1,"Ana"],[2,"Bo"],[4,"Di"]], buckets: { 0:[[4,"Di"]],1:[[1,"Ana"]],2:[[2,"Bo"]] }, probeRows: [[101,2],[102,1],[103,3],[104,2]], probe: null, matches: [] },
        "Every build row is indexed by user ID.", "Hash collisions retain all candidate rows."),
      step("Probe first orders", "Orders 101 and 102 find users Bo and Ana.", { type: "probe", orders: [101,102] },
        { buildRows: [[1,"Ana"],[2,"Bo"],[4,"Di"]], buckets: { 0:[[4,"Di"]],1:[[1,"Ana"]],2:[[2,"Bo"]] }, probeRows: [[103,3],[104,2]], probe: [102,1], matches: [[101,2,"Bo"],[102,1,"Ana"]] },
        "Two joined rows are emitted.", "Candidates are verified by exact key after hashing."),
      step("Handle no match", "Order 103 probes an empty candidate set for user 3.", { type: "probe", order: 103 },
        { buildRows: [[1,"Ana"],[2,"Bo"],[4,"Di"]], buckets: { 0:[[4,"Di"]],1:[[1,"Ana"]],2:[[2,"Bo"]] }, probeRows: [[104,2]], probe: [103,3], matches: [[101,2,"Bo"],[102,1,"Ana"]] },
        "An inner join emits nothing for order 103.", "Unmatched probe rows do not alter the hash table."),
      step("Reuse bucket", "Order 104 reuses user 2's bucket and emits another Bo match.", { type: "probe", order: 104 },
        { buildRows: [[1,"Ana"],[2,"Bo"],[4,"Di"]], buckets: { 0:[[4,"Di"]],1:[[1,"Ana"]],2:[[2,"Bo"]] }, probeRows: [], probe: [104,2], matches: [[101,2,"Bo"],[102,1,"Ana"],[104,2,"Bo"]] },
        "The join produces three rows.", "Each probe row emits once per equal build row.")
    ]);

  add("distributed-data-processing", "Sort-merge joins", "mapreduce",
    "Two large relations already sorted by customer ID are joined sequentially.",
    storageEntities(["customers sorted","orders sorted","left cursor","right cursor","joined output buffer"], "join-stage"),
    [
      { from: "n0", to: "n2", relation: "scan" }, { from: "n1", to: "n3", relation: "scan" },
      { from: "n2", to: "n4", relation: "equal-key" }, { from: "n3", to: "n4", relation: "equal-key" }
    ], [
      step("Sorted inputs", "Customers and orders are ordered by customer ID.", null,
        { left: [[1,"Ana"],[2,"Bo"],[4,"Di"]], right: [[10,1],[11,2],[12,2],[13,3]], leftIndex: 0, rightIndex: 0, equalGroup: null, output: [] },
        "Both cursors start at their smallest keys.", "Each input is nondecreasing by join key."),
      step("Match key one", "Customer 1 equals order customer 1, producing Ana's row.", { type: "compare" },
        { left: [[1,"Ana"],[2,"Bo"],[4,"Di"]], right: [[10,1],[11,2],[12,2],[13,3]], leftIndex: 1, rightIndex: 1, equalGroup: { key:1,left:[[1,"Ana"]],right:[[10,1]] }, output: [[1,"Ana",10]] },
        "The cursors advance beyond key 1.", "Equal-key groups produce their Cartesian product."),
      step("Collect duplicate group", "Customer 2 matches two consecutive orders, so both are buffered as one group.", { type: "collect-group", key: 2 },
        { left: [[1,"Ana"],[2,"Bo"],[4,"Di"]], right: [[10,1],[11,2],[12,2],[13,3]], leftIndex: 2, rightIndex: 3, equalGroup: { key:2,left:[[2,"Bo"]],right:[[11,2],[12,2]] }, output: [[1,"Ana",10],[2,"Bo",11],[2,"Bo",12]] },
        "Bo produces two joined rows.", "All duplicates of an equal key are consumed together."),
      step("Advance smaller side", "Right key 3 is less than left key 4, so only the right cursor advances.", { type: "advance-right" },
        { left: [[1,"Ana"],[2,"Bo"],[4,"Di"]], right: [[10,1],[11,2],[12,2],[13,3]], leftIndex: 2, rightIndex: 4, equalGroup: null, output: [[1,"Ana",10],[2,"Bo",11],[2,"Bo",12]] },
        "Unmatched order 13 is skipped for an inner join.", "When keys differ, advancing the smaller key cannot miss a future match."),
      step("Finish scan", "The exhausted right input ends the inner join.", { type: "finish" },
        { left: [[1,"Ana"],[2,"Bo"],[4,"Di"]], right: [[10,1],[11,2],[12,2],[13,3]], leftIndex: 2, rightIndex: 4, equalGroup: null, output: [[1,"Ana",10],[2,"Bo",11],[2,"Bo",12]] },
        "Three joined rows are returned.", "Output is ordered by join key.")
    ]);

  var postingEntities = [
    { id: "term", label: "distributed", role: "term", x: 10, y: 18 },
    { id: "p1", label: "d1 tf=2", role: "posting", x: 28, y: 58 },
    { id: "p2", label: "d4 tf=1", role: "posting", x: 52, y: 58 },
    { id: "p3", label: "d7 tf=3", role: "posting", x: 76, y: 58 }
  ];
  var postingConnections = [
    { from: "term", to: "p1", relation: "posting-head" },
    { from: "p1", to: "p2", relation: "next-doc" },
    { from: "p2", to: "p3", relation: "next-doc" }
  ];
  add("search-retrieval", "Inverted index", "search",
    "A search engine maps terms to sorted document postings.",
    postingEntities, postingConnections, [
      step("Tokenize documents", "Three documents yield normalized terms and positions.", { type: "tokenize" },
        { documents: { d1:["distributed","systems","distributed"],d4:["search","distributed"],d7:["distributed","data","distributed","distributed"] }, dictionary: {}, postings: {}, term: null, cursor: null, resultDocs: [] },
        "Tokens are ready for indexing.", "Positions preserve each term occurrence."),
      step("Build postings", "The term distributed receives sorted postings d1, d4, d7 with term frequencies.", { type: "index", term: "distributed" },
        { documents: { d1:["distributed","systems","distributed"],d4:["search","distributed"],d7:["distributed","data","distributed","distributed"] }, dictionary: { distributed:{ df:3,offset:120 } }, postings: { distributed:[["d1",2,[0,2]],["d4",1,[1]],["d7",3,[0,2,3]]] }, term: "distributed", cursor: 0, resultDocs: [] },
        "A term lookup avoids scanning documents.", "Postings are strictly ordered by document ID."),
      step("Seek dictionary", "Query parsing finds distributed's posting-list offset.", { type: "dictionary-lookup", term: "distributed" },
        { documents: { d1:["distributed","systems","distributed"],d4:["search","distributed"],d7:["distributed","data","distributed","distributed"] }, dictionary: { distributed:{ df:3,offset:120 } }, postings: { distributed:[["d1",2,[0,2]],["d4",1,[1]],["d7",3,[0,2,3]]] }, term: "distributed", cursor: 0, resultDocs: [] },
        "The engine jumps directly to byte offset 120.", "Dictionary document frequency equals posting count."),
      step("Traverse postings", "The cursor decodes gaps and visits d1, d4, then d7.", { type: "scan-postings" },
        { documents: { d1:["distributed","systems","distributed"],d4:["search","distributed"],d7:["distributed","data","distributed","distributed"] }, dictionary: { distributed:{ df:3,offset:120 } }, postings: { distributed:[["d1",2,[0,2]],["d4",1,[1]],["d7",3,[0,2,3]]] }, term: "distributed", cursor: 3, resultDocs: ["d1","d4","d7"] },
        "All matching documents are collected.", "Decoded doc IDs remain ascending."),
      step("Expose frequencies", "Ranking receives tf values 2, 1, and 3 plus df=3.", { type: "emit-features" },
        { documents: { d1:["distributed","systems","distributed"],d4:["search","distributed"],d7:["distributed","data","distributed","distributed"] }, dictionary: { distributed:{ df:3,offset:120 } }, postings: { distributed:[["d1",2,[0,2]],["d4",1,[1]],["d7",3,[0,2,3]]] }, term: "distributed", cursor: 3, resultDocs: [["d1",2],["d4",1],["d7",3]] },
        "The index supplies exact candidates and rank features.", "Ranking never introduces a document absent from the posting list.")
    ]);

  add("search-retrieval", "TF-IDF", "search",
    "A small corpus ranks documents for the query distributed search.",
    storageEntities(["q: distributed search","d1 tf 2,0","d2 tf 1,1","d3 tf 0,2","ranking scorecard"], "term-vector"),
    [
      { from: "n0", to: "n1", relation: "dot-product" }, { from: "n0", to: "n2", relation: "dot-product" },
      { from: "n0", to: "n3", relation: "dot-product" }, { from: "n1", to: "n4", relation: "rank" },
      { from: "n2", to: "n4", relation: "rank" }, { from: "n3", to: "n4", relation: "rank" }
    ], [
      step("Count term frequencies", "Document vectors record raw frequencies for distributed and search.", { type: "tf" },
        { N: 10, df: { distributed:2,search:5 }, idf: {}, query: { distributed:1,search:1 }, docs: { d1:{ distributed:2,search:0 },d2:{ distributed:1,search:1 },d3:{ distributed:0,search:2 } }, scores: {}, ranking: [] },
        "Three sparse term vectors are available.", "A missing term has frequency zero."),
      step("Compute inverse frequency", "idf(distributed)=ln(10/2)=1.609 and idf(search)=ln(10/5)=0.693.", { type: "idf" },
        { N: 10, df: { distributed:2,search:5 }, idf: { distributed:1.609,search:0.693 }, query: { distributed:1,search:1 }, docs: { d1:{ distributed:2,search:0 },d2:{ distributed:1,search:1 },d3:{ distributed:0,search:2 } }, scores: {}, ranking: [] },
        "Rarer distributed receives more weight.", "idf decreases as document frequency increases."),
      step("Weight documents", "TF multiplied by IDF yields weighted document vectors.", { type: "weight" },
        { N: 10, df: { distributed:2,search:5 }, idf: { distributed:1.609,search:0.693 }, query: { distributed:1.609,search:0.693 }, docs: { d1:{ distributed:3.218,search:0 },d2:{ distributed:1.609,search:0.693 },d3:{ distributed:0,search:1.386 } }, scores: {}, ranking: [] },
        "Each coordinate combines local and corpus evidence.", "Every weight equals tf times the same corpus-wide idf."),
      step("Score dot products", "Query/document dot products are 5.178, 3.070, and 0.961.", { type: "score" },
        { N: 10, df: { distributed:2,search:5 }, idf: { distributed:1.609,search:0.693 }, query: { distributed:1.609,search:0.693 }, docs: { d1:{ distributed:3.218,search:0 },d2:{ distributed:1.609,search:0.693 },d3:{ distributed:0,search:1.386 } }, scores: { d1:5.178,d2:3.070,d3:0.961 }, ranking: [] },
        "d1 leads because the rarer term appears twice.", "Only shared nonzero dimensions contribute."),
      step("Rank descending", "Sorting scores returns d1, d2, d3.", { type: "rank" },
        { N: 10, df: { distributed:2,search:5 }, idf: { distributed:1.609,search:0.693 }, query: { distributed:1.609,search:0.693 }, docs: { d1:{ distributed:3.218,search:0 },d2:{ distributed:1.609,search:0.693 },d3:{ distributed:0,search:1.386 } }, scores: { d1:5.178,d2:3.070,d3:0.961 }, ranking: [["d1",5.178],["d2",3.070],["d3",0.961]] },
        "The result list reflects TF-IDF relevance.", "Ranking order is nonincreasing by score.")
    ]);

  add("search-retrieval", "BM25", "search",
    "A search engine scores distributed across short and long documents.",
    storageEntities(["query term","d1 tf=3 len=100","d2 tf=2 len=300","d3 tf=1 len=80","BM25 ranking board"], "score-factor"),
    [
      { from: "n0", to: "n1", relation: "score" }, { from: "n0", to: "n2", relation: "score" },
      { from: "n0", to: "n3", relation: "score" }, { from: "n1", to: "n4", relation: "rank" },
      { from: "n2", to: "n4", relation: "rank" }, { from: "n3", to: "n4", relation: "rank" }
    ], [
      step("Corpus statistics", "The corpus has N=1000, df=100, average length 150.", null,
        { N:1000,df:100,avgdl:150,k1:1.2,b:0.75,idf:null,docs:{ d1:{tf:3,len:100},d2:{tf:2,len:300},d3:{tf:1,len:80} },normalizers:{},scores:{},ranking:[] },
        "Global inputs for BM25 are fixed.", "The same IDF and tuning parameters apply to every candidate."),
      step("Compute IDF", "BM25 IDF ln(1+(900.5/100.5)) equals 2.299.", { type: "idf" },
        { N:1000,df:100,avgdl:150,k1:1.2,b:0.75,idf:2.299,docs:{ d1:{tf:3,len:100},d2:{tf:2,len:300},d3:{tf:1,len:80} },normalizers:{},scores:{},ranking:[] },
        "The term contributes positive discriminative weight.", "IDF is corpus-wide, not document-specific."),
      step("Normalize lengths", "Length factors are 0.8 for d1, 1.75 for d2, and 0.65 for d3.", { type: "length-normalize" },
        { N:1000,df:100,avgdl:150,k1:1.2,b:0.75,idf:2.299,docs:{ d1:{tf:3,len:100},d2:{tf:2,len:300},d3:{tf:1,len:80} },normalizers:{ d1:0.8,d2:1.75,d3:0.65 },scores:{},ranking:[] },
        "Long d2 receives the strongest penalty.", "Normalization rises with document length when b>0."),
      step("Saturate term frequency", "BM25 combines IDF, bounded TF gain, and length normalization.", { type: "score" },
        { N:1000,df:100,avgdl:150,k1:1.2,b:0.75,idf:2.299,docs:{ d1:{tf:3,len:100},d2:{tf:2,len:300},d3:{tf:1,len:80} },normalizers:{ d1:0.8,d2:1.75,d3:0.65 },scores:{ d1:4.029,d2:3.108,d3:2.841 },ranking:[] },
        "d1 beats d2 despite only one extra occurrence.", "Additional TF has diminishing returns."),
      step("Rank BM25 scores", "Descending order is d1, d2, d3.", { type: "rank" },
        { N:1000,df:100,avgdl:150,k1:1.2,b:0.75,idf:2.299,docs:{ d1:{tf:3,len:100},d2:{tf:2,len:300},d3:{tf:1,len:80} },normalizers:{ d1:0.8,d2:1.75,d3:0.65 },scores:{ d1:4.029,d2:3.108,d3:2.841 },ranking:[["d1",4.029],["d2",3.108],["d3",2.841]] },
        "The compact result list balances frequency and verbosity.", "Scores are sorted nonincreasingly.")
    ]);

  add("search-retrieval", "Top-K retrieval", "search",
    "A coordinator keeps the best three results while scanning shard scores.",
    storageEntities(["score stream","min-heap root","heap slot 1","heap slot 2","Top-3 result set"], "heap-position"),
    [
      { from: "n0", to: "n1", relation: "candidate" }, { from: "n1", to: "n2", relation: "heap-child" },
      { from: "n1", to: "n3", relation: "heap-child" }, { from: "n1", to: "n4", relation: "final-sort" }
    ], [
      step("Accept first candidates", "Scores A=0.42, B=0.81, C=0.33 fill the size-three min-heap.", { type: "offer-batch", candidates: [["A",0.42],["B",0.81],["C",0.33]] },
        { k:3,seen:[["A",0.42],["B",0.81],["C",0.33]],heap:[["C",0.33],["B",0.81],["A",0.42]],threshold:0.33,candidate:null,decision:null,ranking:[] },
        "C is the current eviction threshold.", "The heap root is the smallest retained score."),
      step("Replace root", "D=0.76 exceeds 0.33, so C is evicted and the heap rebalances.", { type: "offer", candidate: ["D",0.76] },
        { k:3,seen:[["A",0.42],["B",0.81],["C",0.33],["D",0.76]],heap:[["A",0.42],["B",0.81],["D",0.76]],threshold:0.42,candidate:["D",0.76],decision:"replace C",ranking:[] },
        "The threshold rises to 0.42.", "Only scores above the full heap's root can enter."),
      step("Prune weak score", "E=0.20 cannot beat threshold 0.42 and is discarded.", { type: "offer", candidate: ["E",0.20] },
        { k:3,seen:[["A",0.42],["B",0.81],["C",0.33],["D",0.76],["E",0.20]],heap:[["A",0.42],["B",0.81],["D",0.76]],threshold:0.42,candidate:["E",0.20],decision:"discard",ranking:[] },
        "No heap write is needed.", "Discarded candidates cannot belong to current top K."),
      step("Raise threshold again", "F=0.91 replaces A and leaves D as the minimum retained result.", { type: "offer", candidate: ["F",0.91] },
        { k:3,seen:[["A",0.42],["B",0.81],["C",0.33],["D",0.76],["E",0.20],["F",0.91]],heap:[["D",0.76],["B",0.81],["F",0.91]],threshold:0.76,candidate:["F",0.91],decision:"replace A",ranking:[] },
        "All retained scores are at least 0.76.", "Heap size never exceeds K."),
      step("Sort retained results", "The final heap is sorted descending for presentation.", { type: "final-sort" },
        { k:3,seen:[["A",0.42],["B",0.81],["C",0.33],["D",0.76],["E",0.20],["F",0.91]],heap:[["D",0.76],["B",0.81],["F",0.91]],threshold:0.76,candidate:null,decision:"complete",ranking:[["F",0.91],["B",0.81],["D",0.76]] },
        "The exact top three are F, B, and D.", "Every omitted score is at most the final threshold.")
    ]);

  add("search-retrieval", "Approximate nearest neighbor (ANN)", "search",
    "A vector index retrieves approximate neighbors for query q=(0.8,0.7).",
    [
      { id: "q", label: "q(.8,.7)", role: "query-vector", x: 76, y: 28 },
      { id: "a", label: "A(.1,.2)", role: "vector-point", x: 15, y: 72 },
      { id: "b", label: "B(.7,.6)", role: "vector-point", x: 68, y: 42 },
      { id: "c", label: "C(.9,.8)", role: "vector-point", x: 86, y: 22 },
      { id: "d", label: "D(.4,.9)", role: "vector-point", x: 42, y: 16 },
      { id: "e", label: "E(.8,.1)", role: "vector-point", x: 78, y: 80 }
    ], [
      { from: "a", to: "b", relation: "coarse-cell-0" }, { from: "b", to: "c", relation: "coarse-cell-1" },
      { from: "c", to: "q", relation: "distance" }, { from: "b", to: "q", relation: "distance" },
      { from: "d", to: "q", relation: "distance" }, { from: "e", to: "q", relation: "distance" }
    ], [
      step("Partition vector space", "Centroids C0=(.2,.3) and C1=(.75,.65) divide the vectors.", { type: "train-centroids" },
        { query:[0.8,0.7],centroids:{ C0:[0.2,0.3],C1:[0.75,0.65] },cells:{ C0:["A"],C1:["B","C","D","E"] },probedCells:[],candidates:[],distances:{},ranking:[] },
        "Each indexed vector belongs to its nearest coarse cell.", "Candidate generation uses geometric proximity, not document labels."),
      step("Probe nearest centroid", "q is distance 0.071 from C1, so only C1 is probed.", { type: "probe-cell", cell: "C1" },
        { query:[0.8,0.7],centroids:{ C0:[0.2,0.3],C1:[0.75,0.65] },cells:{ C0:["A"],C1:["B","C","D","E"] },probedCells:["C1"],candidates:["B","C","D","E"],distances:{},ranking:[] },
        "A is skipped without an exact distance calculation.", "Approximation is confined to candidate selection."),
      step("Measure candidates", "Exact Euclidean distances are B=.141, C=.141, D=.447, E=.600.", { type: "distance" },
        { query:[0.8,0.7],centroids:{ C0:[0.2,0.3],C1:[0.75,0.65] },cells:{ C0:["A"],C1:["B","C","D","E"] },probedCells:["C1"],candidates:["B","C","D","E"],distances:{ B:0.141,C:0.141,D:0.447,E:0.600 },ranking:[] },
        "B and C are nearest among probed vectors.", "All candidates use the same distance metric."),
      step("Return approximate top two", "Distance order returns B and C, with stable ID tie-breaking.", { type: "top-k", k: 2 },
        { query:[0.8,0.7],centroids:{ C0:[0.2,0.3],C1:[0.75,0.65] },cells:{ C0:["A"],C1:["B","C","D","E"] },probedCells:["C1"],candidates:["B","C","D","E"],distances:{ B:0.141,C:0.141,D:0.447,E:0.600 },ranking:[["B",0.141],["C",0.141]] },
        "Two close vectors are returned with four distance checks.", "Result order is nondecreasing by measured distance."),
      step("Expose recall tradeoff", "Probing C0 too confirms A distance .860 and leaves the same top two.", { type: "probe-cell", cell: "C0" },
        { query:[0.8,0.7],centroids:{ C0:[0.2,0.3],C1:[0.75,0.65] },cells:{ C0:["A"],C1:["B","C","D","E"] },probedCells:["C1","C0"],candidates:["B","C","D","E","A"],distances:{ B:0.141,C:0.141,D:0.447,E:0.600,A:0.860 },ranking:[["B",0.141],["C",0.141]] },
        "More probes improve confidence at extra cost.", "Increasing probed cells cannot remove an already measured candidate.")
    ]);

  add("search-retrieval", "HNSW", "graph",
    "A hierarchical proximity graph finds neighbors for q near vector C.",
    [
      { id: "a2", label: "A L2", role: "vector-node", x: 12, y: 12 },
      { id: "d2", label: "D L2", role: "vector-node", x: 70, y: 12 },
      { id: "a1", label: "A L1", role: "vector-node", x: 12, y: 38 },
      { id: "b1", label: "B L1", role: "vector-node", x: 42, y: 38 },
      { id: "d1", label: "D L1", role: "vector-node", x: 70, y: 38 },
      { id: "a0", label: "A L0", role: "vector-node", x: 12, y: 72 },
      { id: "b0", label: "B L0", role: "vector-node", x: 35, y: 72 },
      { id: "c0", label: "C L0", role: "vector-node", x: 58, y: 72 },
      { id: "d0", label: "D L0", role: "vector-node", x: 81, y: 72 },
      { id: "q", label: "q", role: "query-vector", x: 62, y: 90 }
    ], [
      { from:"a2",to:"d2",relation:"L2-neighbor" }, { from:"a1",to:"b1",relation:"L1-neighbor" },
      { from:"b1",to:"d1",relation:"L1-neighbor" }, { from:"a0",to:"b0",relation:"L0-neighbor" },
      { from:"b0",to:"c0",relation:"L0-neighbor" }, { from:"c0",to:"d0",relation:"L0-neighbor" },
      { from:"a2",to:"a1",relation:"down" }, { from:"a1",to:"a0",relation:"down" },
      { from:"d2",to:"d1",relation:"down" }, { from:"d1",to:"d0",relation:"down" }
    ], [
      step("Enter top layer", "Search starts at entry A on sparse layer 2; distance to q is .82.", { type:"enter",node:"A",layer:2 },
        { query:"q",layer:2,entry:"A",visited:[["A",0.82]],frontier:[["D",0.31]],best:["A",0.82],ef:3,results:[] },
        "D is a promising top-layer neighbor.", "Search state records measured graph nodes only."),
      step("Greedy top hop", "D at .31 improves on A, becoming the entry point for layer 1.", { type:"hop",from:"A",to:"D",layer:2 },
        { query:"q",layer:1,entry:"D",visited:[["A",0.82],["D",0.31]],frontier:[["B",0.22]],best:["D",0.31],ef:3,results:[] },
        "The search descends near the query.", "Upper layers greedily retain the closest visited entry."),
      step("Refine at layer one", "D's neighbor B measures .22 and becomes the layer-zero entry.", { type:"hop",from:"D",to:"B",layer:1 },
        { query:"q",layer:0,entry:"B",visited:[["A",0.82],["D",0.31],["B",0.22]],frontier:[["C",0.05],["A",0.82]],best:["B",0.22],ef:3,results:[] },
        "The candidate frontier now includes C.", "Descending preserves the best node found so far."),
      step("Best-first base search", "At L0, C=.05 is expanded before farther A and D.", { type:"expand",node:"C",layer:0 },
        { query:"q",layer:0,entry:"B",visited:[["A",0.82],["D",0.31],["B",0.22],["C",0.05]],frontier:[["B",0.22],["D",0.31]],best:["C",0.05],ef:3,results:[["C",0.05]] },
        "C becomes the nearest observed vector.", "The frontier is ordered by query distance."),
      step("Return nearest neighbors", "With ef=3 exhausted, C, B, and D are returned in distance order.", { type:"finish",k:3 },
        { query:"q",layer:0,entry:"B",visited:[["A",0.82],["D",0.31],["B",0.22],["C",0.05]],frontier:[],best:["C",0.05],ef:3,results:[["C",0.05],["B",0.22],["D",0.31]] },
        "Hierarchical routing avoided a full vector scan.", "Returned nodes are measured and sorted by distance.")
    ]);

  var graphEntities = [
    { id:"A",label:"A",role:"graph-node",x:10,y:45 },
    { id:"B",label:"B",role:"graph-node",x:32,y:18 },
    { id:"C",label:"C",role:"graph-node",x:32,y:72 },
    { id:"D",label:"D",role:"graph-node",x:62,y:18 },
    { id:"E",label:"E",role:"graph-node",x:62,y:72 },
    { id:"F",label:"F",role:"graph-node",x:90,y:45 }
  ];
  var graphConnections = [
    { from:"A",to:"B",relation:"edge:2" }, { from:"A",to:"C",relation:"edge:5" },
    { from:"B",to:"D",relation:"edge:1" }, { from:"B",to:"E",relation:"edge:4" },
    { from:"C",to:"E",relation:"edge:1" }, { from:"D",to:"F",relation:"edge:3" },
    { from:"E",to:"F",relation:"edge:1" }
  ];

  add("distributed-algorithms", "BFS / DFS", "graph",
    "A dependency explorer contrasts breadth-first shortest hops with depth-first traversal.",
    graphEntities, graphConnections, [
      step("Seed at A", "Both traversals mark A and set its parent to null.", { type:"start",node:"A" },
        { mode:"BFS",visited:["A"],frontier:["A"],stack:["A"],parent:{ A:null },depth:{ A:0 },order:["A"],current:"A" },
        "Traversal begins from one source.", "A node is discovered once."),
      step("BFS expands A", "BFS dequeues A and enqueues B then C at depth one.", { type:"bfs-expand",node:"A" },
        { mode:"BFS",visited:["A","B","C"],frontier:["B","C"],stack:[],parent:{ A:null,B:"A",C:"A" },depth:{ A:0,B:1,C:1 },order:["A"],current:"A" },
        "The frontier contains the entire next layer.", "Queue order is nondecreasing by hop depth."),
      step("BFS reaches F", "Expanding B, C, D, and E discovers F with parent D at depth three.", { type:"bfs-run",through:"F" },
        { mode:"BFS",visited:["A","B","C","D","E","F"],frontier:["F"],stack:[],parent:{ A:null,B:"A",C:"A",D:"B",E:"B",F:"D" },depth:{ A:0,B:1,C:1,D:2,E:2,F:3 },order:["A","B","C","D","E"],current:"E" },
        "BFS finds a three-edge path A-B-D-F.", "First discovery gives minimum hop count in an unweighted graph."),
      step("Reset for DFS", "DFS uses a stack and follows A-B-D-F before backtracking.", { type:"dfs-run",path:["A","B","D","F"] },
        { mode:"DFS",visited:["A","B","D","F"],frontier:[],stack:["A","B","D","F"],parent:{ A:null,B:"A",D:"B",F:"D" },depth:{ A:0,B:1,D:2,F:3 },order:["A","B","D","F"],current:"F" },
        "DFS reaches deep before exploring siblings.", "The stack represents the active recursion path."),
      step("Backtrack and finish", "DFS pops to B, explores E, then returns to A for C.", { type:"dfs-finish" },
        { mode:"DFS",visited:["A","B","D","F","E","C"],frontier:[],stack:[],parent:{ A:null,B:"A",D:"B",F:"D",E:"B",C:"A" },depth:{ A:0,B:1,D:2,F:3,E:2,C:1 },order:["A","B","D","F","E","C"],current:null },
        "All reachable nodes are visited in depth-first order.", "Every non-root node has one DFS-tree parent.")
    ]);

  add("distributed-algorithms", "Dijkstra", "graph",
    "A router computes nonnegative shortest paths from A.",
    graphEntities, graphConnections, [
      step("Initialize distances", "A starts at zero; all other distances are infinity.", { type:"initialize",source:"A" },
        { distances:{ A:0,B:"∞",C:"∞",D:"∞",E:"∞",F:"∞" },frontier:[["A",0]],settled:[],parent:{ A:null },current:null,relaxed:[] },
        "The source is the only frontier node.", "Unreached vertices have infinite tentative distance."),
      step("Settle A", "Relaxing A→B and A→C yields distances 2 and 5.", { type:"settle",node:"A" },
        { distances:{ A:0,B:2,C:5,D:"∞",E:"∞",F:"∞" },frontier:[["B",2],["C",5]],settled:["A"],parent:{ A:null,B:"A",C:"A" },current:"A",relaxed:[["A","B",2],["A","C",5]] },
        "B becomes the nearest tentative node.", "Relaxation uses dist[u]+nonnegative edge weight."),
      step("Settle B", "B improves D to 3 and E to 6.", { type:"settle",node:"B" },
        { distances:{ A:0,B:2,C:5,D:3,E:6,F:"∞" },frontier:[["D",3],["C",5],["E",6]],settled:["A","B"],parent:{ A:null,B:"A",C:"A",D:"B",E:"B" },current:"B",relaxed:[["B","D",3],["B","E",6]] },
        "D moves ahead of C in the priority queue.", "A settled vertex never needs a smaller distance."),
      step("Settle D then C", "D gives F=6; C improves E from 6 to 6 via an equal path, retaining the first parent.", { type:"settle-batch",nodes:["D","C"] },
        { distances:{ A:0,B:2,C:5,D:3,E:6,F:6 },frontier:[["E",6],["F",6]],settled:["A","B","D","C"],parent:{ A:null,B:"A",C:"A",D:"B",E:"B",F:"D" },current:"C",relaxed:[["D","F",6],["C","E",6]] },
        "All remaining tentative distances are six.", "Priority order is by smallest tentative distance."),
      step("Finish shortest paths", "Settling E and F completes distances and parent paths.", { type:"finish" },
        { distances:{ A:0,B:2,C:5,D:3,E:6,F:6 },frontier:[],settled:["A","B","D","C","E","F"],parent:{ A:null,B:"A",C:"A",D:"B",E:"B",F:"D" },current:"F",relaxed:[] },
        "Shortest route to F is A-B-D-F with cost 6.", "Every settled distance is final because all edge weights are nonnegative.")
    ]);

  add("distributed-algorithms", "Bellman-Ford", "graph",
    "A routing table handles a negative edge and detects negative cycles.",
    graphEntities.slice(0,5), [
      { from:"A",to:"B",relation:"edge:4" }, { from:"A",to:"C",relation:"edge:5" },
      { from:"B",to:"C",relation:"edge:-2" }, { from:"C",to:"D",relation:"edge:3" },
      { from:"B",to:"E",relation:"edge:4" }, { from:"D",to:"E",relation:"edge:-1" }
    ], [
      step("Initialize source", "A is zero and all other distances are infinity.", { type:"initialize",source:"A" },
        { pass:0,distances:{ A:0,B:"∞",C:"∞",D:"∞",E:"∞" },parent:{ A:null },edgeCursor:null,updated:[],negativeCycle:false },
        "Only A is reachable initially.", "Distances are upper bounds on shortest paths."),
      step("First full pass", "Relaxing every edge yields B=4, C=2 through B, D=5, E=4.", { type:"relax-pass",pass:1 },
        { pass:1,distances:{ A:0,B:4,C:2,D:5,E:4 },parent:{ A:null,B:"A",C:"B",D:"C",E:"D" },edgeCursor:["D","E",-1],updated:["B","C","D","E"],negativeCycle:false },
        "Paths using several edges propagate within the pass order.", "Each relaxation only lowers a distance."),
      step("Second pass stable", "A second pass finds no shorter candidate.", { type:"relax-pass",pass:2 },
        { pass:2,distances:{ A:0,B:4,C:2,D:5,E:4 },parent:{ A:null,B:"A",C:"B",D:"C",E:"D" },edgeCursor:["D","E",-1],updated:[],negativeCycle:false },
        "The solution converges early.", "No update means all edge inequalities hold."),
      step("Verify remaining passes", "Passes three and four remain unchanged for five vertices.", { type:"relax-pass",pass:4 },
        { pass:4,distances:{ A:0,B:4,C:2,D:5,E:4 },parent:{ A:null,B:"A",C:"B",D:"C",E:"D" },edgeCursor:["D","E",-1],updated:[],negativeCycle:false },
        "Shortest distances are final.", "At most |V|-1 edges are needed by any simple shortest path."),
      step("Negative-cycle check", "A final edge scan cannot lower any distance, proving no reachable negative cycle.", { type:"cycle-check" },
        { pass:5,distances:{ A:0,B:4,C:2,D:5,E:4 },parent:{ A:null,B:"A",C:"B",D:"C",E:"D" },edgeCursor:null,updated:[],negativeCycle:false },
        "Routes are safe to publish.", "Any update on pass |V| would prove a reachable negative cycle.")
    ]);

  var mstConnections = [
    { from:"A",to:"B",relation:"edge:1" }, { from:"A",to:"C",relation:"edge:4" },
    { from:"B",to:"C",relation:"edge:2" }, { from:"B",to:"D",relation:"edge:5" },
    { from:"C",to:"D",relation:"edge:1" }, { from:"C",to:"E",relation:"edge:3" },
    { from:"D",to:"F",relation:"edge:2" }, { from:"E",to:"F",relation:"edge:4" }
  ];
  add("distributed-algorithms", "Kruskal", "graph",
    "A network planner builds a minimum spanning tree by globally sorted links.",
    graphEntities, mstConnections, [
      step("Sort all edges", "Edges order as AB1, CD1, BC2, DF2, CE3, AC4, EF4, BD5.", { type:"sort-edges" },
        { sorted:[["A","B",1],["C","D",1],["B","C",2],["D","F",2],["C","E",3],["A","C",4],["E","F",4],["B","D",5]],cursor:0,components:{ A:"A",B:"B",C:"C",D:"D",E:"E",F:"F" },selected:[],rejected:[],weight:0 },
        "Cheapest links will be considered first.", "Edge order is nondecreasing by weight."),
      step("Select weight-one edges", "AB and CD join disjoint components.", { type:"consider",through:1 },
        { sorted:[["A","B",1],["C","D",1],["B","C",2],["D","F",2],["C","E",3],["A","C",4],["E","F",4],["B","D",5]],cursor:2,components:{ A:"AB",B:"AB",C:"CD",D:"CD",E:"E",F:"F" },selected:[["A","B",1],["C","D",1]],rejected:[],weight:2 },
        "Four components remain.", "Selected edges never connect vertices already in one component."),
      step("Join with weight two", "BC merges AB with CD; DF adds F to that component.", { type:"consider",through:2 },
        { sorted:[["A","B",1],["C","D",1],["B","C",2],["D","F",2],["C","E",3],["A","C",4],["E","F",4],["B","D",5]],cursor:4,components:{ A:"ABCDF",B:"ABCDF",C:"ABCDF",D:"ABCDF",E:"E",F:"ABCDF" },selected:[["A","B",1],["C","D",1],["B","C",2],["D","F",2]],rejected:[],weight:6 },
        "Only E remains separate.", "Union operations merge entire components."),
      step("Add final component", "CE with weight 3 joins E and completes five selected edges.", { type:"consider",edge:["C","E",3] },
        { sorted:[["A","B",1],["C","D",1],["B","C",2],["D","F",2],["C","E",3],["A","C",4],["E","F",4],["B","D",5]],cursor:5,components:{ A:"ABCDEF",B:"ABCDEF",C:"ABCDEF",D:"ABCDEF",E:"ABCDEF",F:"ABCDEF" },selected:[["A","B",1],["C","D",1],["B","C",2],["D","F",2],["C","E",3]],rejected:[],weight:9 },
        "The spanning tree is complete at total weight 9.", "A tree on six vertices has exactly five selected edges."),
      step("Reject cycle edges", "Remaining AC, EF, and BD connect vertices already unified and are rejected.", { type:"finish" },
        { sorted:[["A","B",1],["C","D",1],["B","C",2],["D","F",2],["C","E",3],["A","C",4],["E","F",4],["B","D",5]],cursor:8,components:{ A:"ABCDEF",B:"ABCDEF",C:"ABCDEF",D:"ABCDEF",E:"ABCDEF",F:"ABCDEF" },selected:[["A","B",1],["C","D",1],["B","C",2],["D","F",2],["C","E",3]],rejected:[["A","C",4],["E","F",4],["B","D",5]],weight:9 },
        "No selected edge creates a cycle.", "Kruskal accepts an edge iff its endpoints are in different components.")
    ]);

  add("distributed-algorithms", "Prim", "graph",
    "A network planner grows a minimum spanning tree outward from A.",
    graphEntities, mstConnections, [
      step("Seed vertex A", "A enters the tree and exposes AB1 and AC4.", { type:"start",node:"A" },
        { inTree:["A"],frontier:[["A","B",1],["A","C",4]],selected:[],parent:{ A:null },key:{ A:0,B:1,C:4,D:"∞",E:"∞",F:"∞" },weight:0 },
        "AB is the cheapest crossing edge.", "The frontier contains only edges with one endpoint in the tree."),
      step("Attach B", "AB1 adds B and introduces BC2 and BD5.", { type:"select",edge:["A","B",1] },
        { inTree:["A","B"],frontier:[["B","C",2],["A","C",4],["B","D",5]],selected:[["A","B",1]],parent:{ A:null,B:"A",C:"B",D:"B" },key:{ A:0,B:1,C:2,D:5,E:"∞",F:"∞" },weight:1 },
        "C's best connection improves from four to two.", "Each outside vertex tracks its cheapest crossing edge."),
      step("Attach C", "BC2 adds C; CD1 becomes the cheapest frontier edge and CE3 appears.", { type:"select",edge:["B","C",2] },
        { inTree:["A","B","C"],frontier:[["C","D",1],["C","E",3],["B","D",5]],selected:[["A","B",1],["B","C",2]],parent:{ A:null,B:"A",C:"B",D:"C",E:"C" },key:{ A:0,B:1,C:2,D:1,E:3,F:"∞" },weight:3 },
        "D now has key one.", "Keys decrease when a cheaper crossing edge is discovered."),
      step("Attach D and F", "CD1 adds D, then DF2 adds F.", { type:"select-batch",edges:[["C","D",1],["D","F",2]] },
        { inTree:["A","B","C","D","F"],frontier:[["C","E",3],["F","E",4]],selected:[["A","B",1],["B","C",2],["C","D",1],["D","F",2]],parent:{ A:null,B:"A",C:"B",D:"C",E:"C",F:"D" },key:{ A:0,B:1,C:2,D:1,E:3,F:2 },weight:6 },
        "Only E remains outside.", "Each selected edge adds exactly one new vertex."),
      step("Attach E", "CE3 beats FE4 and completes the tree at weight 9.", { type:"select",edge:["C","E",3] },
        { inTree:["A","B","C","D","F","E"],frontier:[],selected:[["A","B",1],["B","C",2],["C","D",1],["D","F",2],["C","E",3]],parent:{ A:null,B:"A",C:"B",D:"C",E:"C",F:"D" },key:{ A:0,B:1,C:2,D:1,E:3,F:2 },weight:9 },
        "All vertices are connected by a minimum spanning tree.", "The chosen edge is always the lightest edge crossing the current cut.")
    ]);

  add("distributed-algorithms", "Topological sort", "graph",
    "A deployment scheduler orders services subject to directed dependencies.",
    graphEntities, [
      { from:"A",to:"C",relation:"must-precede" }, { from:"B",to:"C",relation:"must-precede" },
      { from:"B",to:"D",relation:"must-precede" }, { from:"C",to:"E",relation:"must-precede" },
      { from:"D",to:"E",relation:"must-precede" }, { from:"E",to:"F",relation:"must-precede" }
    ], [
      step("Count indegrees", "A and B have zero prerequisites; C has two, D one, E two, F one.", { type:"count-indegree" },
        { indegree:{ A:0,B:0,C:2,D:1,E:2,F:1 },ready:["A","B"],order:[],current:null,removedEdges:[],cycle:false },
        "The ready queue contains A and B.", "Indegree equals the number of unremoved incoming edges."),
      step("Schedule A", "Removing A emits it and decrements C from two to one.", { type:"emit",node:"A" },
        { indegree:{ A:0,B:0,C:1,D:1,E:2,F:1 },ready:["B"],order:["A"],current:"A",removedEdges:[["A","C"]],cycle:false },
        "C still waits for B.", "Only zero-indegree nodes may be emitted."),
      step("Schedule B", "Removing B makes C and D ready.", { type:"emit",node:"B" },
        { indegree:{ A:0,B:0,C:0,D:0,E:2,F:1 },ready:["C","D"],order:["A","B"],current:"B",removedEdges:[["A","C"],["B","C"],["B","D"]],cycle:false },
        "Both immediate dependents can now run.", "Removing a node decrements each outgoing neighbor once."),
      step("Schedule C and D", "C then D remove both incoming edges to E, making E ready.", { type:"emit-batch",nodes:["C","D"] },
        { indegree:{ A:0,B:0,C:0,D:0,E:0,F:1 },ready:["E"],order:["A","B","C","D"],current:"D",removedEdges:[["A","C"],["B","C"],["B","D"],["C","E"],["D","E"]],cycle:false },
        "E is released only after both prerequisites.", "Every emitted prefix respects all edges within the prefix."),
      step("Finish E then F", "E releases F; all six nodes are emitted without a cycle.", { type:"emit-batch",nodes:["E","F"] },
        { indegree:{ A:0,B:0,C:0,D:0,E:0,F:0 },ready:[],order:["A","B","C","D","E","F"],current:"F",removedEdges:[["A","C"],["B","C"],["B","D"],["C","E"],["D","E"],["E","F"]],cycle:false },
        "A valid deployment order is A,B,C,D,E,F.", "For every directed edge u→v, u appears before v.")
    ]);

  add("distributed-algorithms", "Union-Find", "graph",
    "A connectivity service incrementally groups hosts and answers reachability.",
    graphEntities, [
      { from:"A",to:"B",relation:"union-edge" }, { from:"B",to:"C",relation:"union-edge" },
      { from:"D",to:"E",relation:"union-edge" }, { from:"C",to:"D",relation:"union-edge" }
    ], [
      step("Singleton sets", "Every host begins as its own parent with rank zero.", { type:"make-set" },
        { parent:{ A:"A",B:"B",C:"C",D:"D",E:"E",F:"F" },rank:{ A:0,B:0,C:0,D:0,E:0,F:0 },components:6,operation:null,findPath:[],connected:null },
        "Six disjoint components exist.", "A root is a node whose parent is itself."),
      step("Union A and B", "Equal ranks choose A as root and raise A's rank to one.", { type:"union",a:"A",b:"B" },
        { parent:{ A:"A",B:"A",C:"C",D:"D",E:"E",F:"F" },rank:{ A:1,B:0,C:0,D:0,E:0,F:0 },components:5,operation:["union","A","B"],findPath:["A","B"],connected:true },
        "A and B share root A.", "Union decreases component count only for distinct roots."),
      step("Build two components", "Union B-C attaches C under A; union D-E chooses D as root.", { type:"union-batch",pairs:[["B","C"],["D","E"]] },
        { parent:{ A:"A",B:"A",C:"A",D:"D",E:"D",F:"F" },rank:{ A:1,B:0,C:0,D:1,E:0,F:0 },components:3,operation:["union","D","E"],findPath:["D","E"],connected:true },
        "Components are ABC, DE, and F.", "Trees represent sets without changing member identity."),
      step("Union by rank", "Union C-D joins equal-rank roots A and D; D becomes child of A and A rank becomes two.", { type:"union",a:"C",b:"D" },
        { parent:{ A:"A",B:"A",C:"A",D:"A",E:"D",F:"F" },rank:{ A:2,B:0,C:0,D:1,E:0,F:0 },components:2,operation:["union","C","D"],findPath:["C","A","D"],connected:true },
        "ABCDE now form one component.", "The lower-rank root attaches below the higher-rank root; ties raise one rank."),
      step("Compress find path", "find(E) follows E→D→A and rewrites E directly to A.", { type:"find",node:"E" },
        { parent:{ A:"A",B:"A",C:"A",D:"A",E:"A",F:"F" },rank:{ A:2,B:0,C:0,D:1,E:0,F:0 },components:2,operation:["find","E"],findPath:["E","D","A"],connected:true },
        "Future finds for E take one hop.", "Path compression changes parents but never component membership.")
    ]);

  add("database-distributed-system-concepts", "Consistent hashing", "storage",
    "A cache cluster moves a small key range when node N3 joins the ring.",
    [
      { id:"n1",label:"N1@10",role:"ring-node",x:50,y:8 },
      { id:"n2",label:"N2@40",role:"ring-node",x:88,y:48 },
      { id:"n3",label:"N3@70",role:"ring-node",x:50,y:88 },
      { id:"n4",label:"N4@90",role:"ring-node",x:12,y:48 },
      { id:"k1",label:"alpha@35",role:"ring-key",x:78,y:28 },
      { id:"k2",label:"beta@65",role:"ring-key",x:72,y:76 },
      { id:"k3",label:"gamma@85",role:"ring-key",x:25,y:75 }
    ], [
      { from:"n1",to:"n2",relation:"clockwise-successor" },
      { from:"n2",to:"n3",relation:"clockwise-successor" },
      { from:"n3",to:"n4",relation:"clockwise-successor" },
      { from:"n4",to:"n1",relation:"clockwise-wrap" },
      { from:"k1",to:"n2",relation:"owned-by-successor" },
      { from:"k2",to:"n3",relation:"owned-by-successor" },
      { from:"k3",to:"n4",relation:"owned-by-successor" }
    ], [
      step("Place initial nodes", "N1@10, N2@40, and N4@90 partition the hash ring.", { type:"place-nodes",tokens:[10,40,90] },
        { ringSize:100,nodes:[["N1",10],["N2",40],["N4",90]],keys:[],owners:{},lookup:null,moved:[],replicas:{} },
        "Three clockwise ownership ranges exist.", "A key belongs to the first node token at or after its hash, wrapping at 100."),
      step("Assign keys clockwise", "alpha@35 maps to N2, while beta@65 and gamma@85 map to N4.", { type:"assign-keys" },
        { ringSize:100,nodes:[["N1",10],["N2",40],["N4",90]],keys:[["alpha",35],["beta",65],["gamma",85]],owners:{ alpha:"N2",beta:"N4",gamma:"N4" },lookup:["beta",65,"N4"],moved:[],replicas:{} },
        "Every key has one primary successor.", "Ownership ranges are open on the predecessor and closed on the owner."),
      step("Join N3 at token 70", "N3 inserts between N2 and N4 and takes responsibility for hashes (40,70].", { type:"join",node:["N3",70] },
        { ringSize:100,nodes:[["N1",10],["N2",40],["N3",70],["N4",90]],keys:[["alpha",35],["beta",65],["gamma",85]],owners:{ alpha:"N2",beta:"N3",gamma:"N4" },lookup:["beta",65,"N3"],moved:[["beta","N4","N3"]],replicas:{} },
        "Only beta moves to the joining node.", "A join changes ownership only in the new node's predecessor range."),
      step("Add clockwise replicas", "Replication factor two stores each key on its primary and next distinct node.", { type:"replicate",factor:2 },
        { ringSize:100,nodes:[["N1",10],["N2",40],["N3",70],["N4",90]],keys:[["alpha",35],["beta",65],["gamma",85]],owners:{ alpha:"N2",beta:"N3",gamma:"N4" },lookup:null,moved:[["beta","N4","N3"]],replicas:{ alpha:["N2","N3"],beta:["N3","N4"],gamma:["N4","N1"] } },
        "Each key survives one node failure.", "Replica owners are the next distinct clockwise nodes."),
      step("Route a lookup", "A lookup for beta@65 walks clockwise to N3 and reads its primary copy.", { type:"lookup",key:"beta" },
        { ringSize:100,nodes:[["N1",10],["N2",40],["N3",70],["N4",90]],keys:[["alpha",35],["beta",65],["gamma",85]],owners:{ alpha:"N2",beta:"N3",gamma:"N4" },lookup:["beta",65,"N3"],moved:[["beta","N4","N3"]],replicas:{ alpha:["N2","N3"],beta:["N3","N4"],gamma:["N4","N1"] } },
        "The coordinator deterministically selects N3.", "All clients using the same ring view compute the same owner.")
    ]);

  add("database-distributed-system-concepts", "Quorum", "counters",
    "A three-replica profile store uses versioned quorum reads and writes.",
    [
      { id:"client",label:"client",role:"coordinator",x:50,y:8 },
      { id:"r1",label:"R1 v4",role:"replica",x:18,y:66 },
      { id:"r2",label:"R2 v4",role:"replica",x:50,y:82 },
      { id:"r3",label:"R3 v3",role:"replica",x:82,y:66 }
    ], [
      { from:"client",to:"r1",relation:"read/write-request" },
      { from:"client",to:"r2",relation:"read/write-request" },
      { from:"client",to:"r3",relation:"read/write-request" },
      { from:"r1",to:"r2",relation:"replica-set" },
      { from:"r2",to:"r3",relation:"replica-set" }
    ], [
      step("Replica set", "N=3 replicas hold profile x; R1 and R2 have v4 while lagging R3 has v3.", null,
        { N:3,R:2,W:2,replicas:{ R1:["v4","blue"],R2:["v4","blue"],R3:["v3","green"] },responses:[],acks:[],chosen:null,repair:[],status:"ready" },
        "A majority contains the latest acknowledged version.", "R+W>N gives read/write quorum overlap."),
      step("Read two replicas", "The coordinator requests R1 and R3 and receives versions v4 and v3.", { type:"read",replicas:["R1","R3"] },
        { N:3,R:2,W:2,replicas:{ R1:["v4","blue"],R2:["v4","blue"],R3:["v3","green"] },responses:[["R1","v4","blue"],["R3","v3","green"]],acks:[],chosen:["v4","blue"],repair:[],status:"read-quorum" },
        "The highest version v4 wins.", "A quorum read compares version metadata, not response arrival order."),
      step("Repair stale replica", "Read repair sends v4 blue to R3 after returning the selected value.", { type:"read-repair",replica:"R3" },
        { N:3,R:2,W:2,replicas:{ R1:["v4","blue"],R2:["v4","blue"],R3:["v4","blue"] },responses:[["R1","v4","blue"],["R3","v3","green"]],acks:[],chosen:["v4","blue"],repair:[["R3","v3","v4"]],status:"repaired" },
        "All replicas converge to v4.", "Repair never replaces a higher version with a lower one."),
      step("Write version five", "The client writes red at v5; R1 and R2 acknowledge while R3 is temporarily unavailable.", { type:"write",version:"v5",value:"red" },
        { N:3,R:2,W:2,replicas:{ R1:["v5","red"],R2:["v5","red"],R3:["v4","blue"] },responses:[],acks:["R1","R2"],chosen:["v5","red"],repair:[],status:"write-committed" },
        "W=2 acknowledges the write despite one failed replica.", "A write succeeds only after W distinct acknowledgements."),
      step("Read after write", "A later quorum read from R2 and R3 sees v5 and v4, returns red, and schedules R3 repair.", { type:"read",replicas:["R2","R3"] },
        { N:3,R:2,W:2,replicas:{ R1:["v5","red"],R2:["v5","red"],R3:["v4","blue"] },responses:[["R2","v5","red"],["R3","v4","blue"]],acks:[],chosen:["v5","red"],repair:[["R3","v4","v5"]],status:"read-quorum" },
        "The acknowledged write is visible through quorum overlap.", "With R+W>N, every read quorum intersects the successful write quorum.")
    ]);

  add("distributed-data-processing", "Combiners", "mapreduce",
    "Two word-count mappers use local combiners to collapse repeated keys before the network shuffle.",
    [
      ["m0","Mapper 0 pairs","map output buffer",8,18],
      ["c0","Combiner 0","local aggregate table",27,42],
      ["m1","Mapper 1 pairs","map output buffer",8,78],
      ["c1","Combiner 1","local aggregate table",27,68],
      ["shuffle","Shuffle partitions","network transfer",52,50],
      ["reducer","Reducer grouped keys","reduce input",76,34],
      ["output","Global counts","materialized output",91,72]
    ], [
      ["m0","c0","combine mapper-0 pairs"],["m1","c1","combine mapper-1 pairs"],
      ["c0","shuffle","emit one pair per local key"],["c1","shuffle","emit one pair per local key"],
      ["shuffle","reducer","group equal keys"],["reducer","output","sum partial counts"]
    ], [
      step("Emit raw map pairs", "Mapper 0 emits cat three times and dog once; mapper 1 emits cat once and dog twice.", null,
        { inputs:{ M0:["cat","cat","dog","cat"],M1:["dog","cat","dog"] },rawPairs:{ M0:[["cat",1],["cat",1],["dog",1],["cat",1]],M1:[["dog",1],["cat",1],["dog",1]] },combined:{ M0:{},M1:{} },shuffle:[],groups:{},output:{},pairsBefore:7,pairsAfter:0 },
        "Seven intermediate pairs are buffered on their producing workers.", "A combiner may inspect only one mapper's output partition."),
      step("Combine mapper zero locally", "Combiner 0 folds four mapper-0 pairs into cat=3 and dog=1 without crossing the network.", ["m0","c0","fold cat=3 dog=1"],
        { inputs:{ M0:["cat","cat","dog","cat"],M1:["dog","cat","dog"] },rawPairs:{ M0:[],M1:[["dog",1],["cat",1],["dog",1]] },combined:{ M0:{ cat:3,dog:1 },M1:{} },shuffle:[],groups:{},output:{},pairsBefore:7,pairsAfter:2 },
        "Mapper 0 now has two partial aggregates instead of four pairs.", "Combining preserves each key's local sum."),
      step("Combine mapper one locally", "Combiner 1 independently produces cat=1 and dog=2.", ["m1","c1","fold cat=1 dog=2"],
        { inputs:{ M0:["cat","cat","dog","cat"],M1:["dog","cat","dog"] },rawPairs:{ M0:[],M1:[] },combined:{ M0:{ cat:3,dog:1 },M1:{ cat:1,dog:2 } },shuffle:[],groups:{},output:{},pairsBefore:7,pairsAfter:4 },
        "Only four partial pairs remain across both workers.", "The combine function must be associative and commutative with the reducer operation."),
      step("Shuffle partial aggregates", "Each combiner emits its two partials; partitioning sends both cat partials together and both dog partials together.", ["c0","shuffle","send (cat,3),(dog,1) and peer partials"],
        { inputs:{ M0:["cat","cat","dog","cat"],M1:["dog","cat","dog"] },rawPairs:{ M0:[],M1:[] },combined:{ M0:{ cat:3,dog:1 },M1:{ cat:1,dog:2 } },shuffle:[["M0","cat",3],["M0","dog",1],["M1","cat",1],["M1","dog",2]],groups:{},output:{},pairsBefore:7,pairsAfter:4 },
        "The shuffle moves four records rather than seven.", "All partials for an equal key select the same reducer partition."),
      step("Group reducer inputs", "The reducer groups cat values [3,1] and dog values [1,2].", ["shuffle","reducer","group cat:[3,1] dog:[1,2]"],
        { inputs:{ M0:["cat","cat","dog","cat"],M1:["dog","cat","dog"] },rawPairs:{ M0:[],M1:[] },combined:{ M0:{ cat:3,dog:1 },M1:{ cat:1,dog:2 } },shuffle:[],groups:{ cat:[3,1],dog:[1,2] },output:{},pairsBefore:7,pairsAfter:4 },
        "Every mapper contributes at most one value per key.", "Grouping retains every emitted partial exactly once."),
      step("Reduce global counts", "The reducer sums partials to cat=4 and dog=3.", ["reducer","output","publish cat=4 dog=3"],
        { inputs:{ M0:["cat","cat","dog","cat"],M1:["dog","cat","dog"] },rawPairs:{ M0:[],M1:[] },combined:{ M0:{ cat:3,dog:1 },M1:{ cat:1,dog:2 } },shuffle:[],groups:{ cat:[3,1],dog:[1,2] },output:{ cat:4,dog:3 },pairsBefore:7,pairsAfter:4 },
        "The final counts equal the uncombined computation with fewer network records.", "A combiner may change transfer volume but never the reducer's mathematical result.")
    ]);

  add("distributed-data-processing", "Distributed aggregation", "mapreduce",
    "A sales job computes per-region averages with mapper-local sum/count pairs, a key shuffle, and reducer merges.",
    [
      ["p0","Partition P0","sales input",7,18],
      ["a0","Local aggregate A0","sum/count table",28,28],
      ["p1","Partition P1","sales input",7,80],
      ["a1","Local aggregate A1","sum/count table",28,68],
      ["shuffle","Region shuffle","key partitioner",50,50],
      ["r0","Reducer east","regional merger",72,24],
      ["r1","Reducer west","regional merger",72,76],
      ["result","Average table","final aggregate",93,50]
    ], [
      ["p0","a0","scan rows"],["p1","a1","scan rows"],
      ["a0","shuffle","emit region partials"],["a1","shuffle","emit region partials"],
      ["shuffle","r0","east partials"],["shuffle","r1","west partials"],
      ["r0","result","east average"],["r1","result","west average"]
    ], [
      step("Read disjoint partitions", "P0 owns east 10, west 7, east 14; P1 owns west 9, east 6, west 8.", null,
        { rows:{ P0:[["east",10],["west",7],["east",14]],P1:[["west",9],["east",6],["west",8]] },partials:{ P0:{},P1:{} },shuffle:[],reduceInputs:{ east:[],west:[] },merged:{},averages:{},attempts:{ P0:1,P1:1 } },
        "Each source row belongs to one input partition and one task attempt.", "Aggregation must account for every committed partition exactly once."),
      step("Build local sum/count states", "A0 produces east=(24,2), west=(7,1); A1 produces east=(6,1), west=(17,2).", ["p0","a0","accumulate sum,count on both workers"],
        { rows:{ P0:[],P1:[] },partials:{ P0:{ east:[24,2],west:[7,1] },P1:{ east:[6,1],west:[17,2] } },shuffle:[],reduceInputs:{ east:[],west:[] },merged:{},averages:{},attempts:{ P0:1,P1:1 } },
        "Six rows collapse to four mergeable partial states.", "A partial average is represented as sum and count, never as an unweighted average."),
      step("Partition partials by region", "The shuffle routes both east states to R0 and both west states to R1.", ["a0","shuffle","hash region and transfer four partials"],
        { rows:{ P0:[],P1:[] },partials:{ P0:{ east:[24,2],west:[7,1] },P1:{ east:[6,1],west:[17,2] } },shuffle:[["P0","east",24,2],["P1","east",6,1],["P0","west",7,1],["P1","west",17,2]],reduceInputs:{ east:[],west:[] },merged:{},averages:{},attempts:{ P0:1,P1:1 } },
        "Only four fixed-size states cross the network.", "Equal group keys are delivered to exactly one reducer."),
      step("Deduplicate task attempts", "Reducer input accepts committed attempt P1#1 and rejects a speculative duplicate P1#2 with the same partition epoch.", ["shuffle","r0","accept committed partition attempts once"],
        { rows:{ P0:[],P1:[] },partials:{ P0:{ east:[24,2],west:[7,1] },P1:{ east:[6,1],west:[17,2] } },shuffle:[],reduceInputs:{ east:[["P0#1",24,2],["P1#1",6,1]],west:[["P0#1",7,1],["P1#1",17,2]] },merged:{},averages:{},attempts:{ P0:1,P1:1,rejected:["P1#2"] } },
        "Speculation cannot double-count a source partition.", "At most one committed attempt ID contributes for each partition epoch."),
      step("Merge regional states", "R0 merges east to (30,3); R1 merges west to (24,3).", ["r0","result","merge east and west sum,count states"],
        { rows:{ P0:[],P1:[] },partials:{ P0:{ east:[24,2],west:[7,1] },P1:{ east:[6,1],west:[17,2] } },shuffle:[],reduceInputs:{ east:[["P0#1",24,2],["P1#1",6,1]],west:[["P0#1",7,1],["P1#1",17,2]] },merged:{ east:[30,3],west:[24,3] },averages:{},attempts:{ P0:1,P1:1,rejected:["P1#2"] } },
        "Reducer states contain complete regional totals.", "Merging sum/count pairs is associative and preserves total sum and cardinality."),
      step("Finalize averages", "The finalizer divides only after the global merge, publishing east=10 and west=8.", ["r1","result","finalize east=10 west=8"],
        { rows:{ P0:[],P1:[] },partials:{ P0:{ east:[24,2],west:[7,1] },P1:{ east:[6,1],west:[17,2] } },shuffle:[],reduceInputs:{ east:[["P0#1",24,2],["P1#1",6,1]],west:[["P0#1",7,1],["P1#1",17,2]] },merged:{ east:[30,3],west:[24,3] },averages:{ east:10,west:8 },attempts:{ P0:1,P1:1,rejected:["P1#2"] } },
        "The output contains exact per-region averages.", "Finalization occurs after all accepted partial states for a key are merged.")
    ]);

  add("distributed-data-processing", "Broadcast joins", "mapreduce",
    "A query broadcasts a versioned product dimension to three workers so each can join its local order partition without shuffling facts.",
    [
      ["dim","Products v42","dimension snapshot",9,16],
      ["broadcast","Broadcast exchange","replication channel",34,38],
      ["f0","Orders P0","fact partition",20,78],
      ["f1","Orders P1","fact partition",50,84],
      ["f2","Orders P2","fact partition",80,78],
      ["cache","Worker hash tables","dimension replicas",58,36],
      ["output","Joined orders","partitioned output",91,18]
    ], [
      ["dim","broadcast","publish immutable v42"],["broadcast","cache","replicate bytes to workers"],
      ["f0","cache","local probe"],["f1","cache","local probe"],["f2","cache","local probe"],
      ["cache","output","emit joined rows"]
    ], [
      step("Freeze a dimension snapshot", "The coordinator selects products version 42 containing p1=Book, p2=Pen, and p3=Bag.", null,
        { dimension:{ version:42,rows:[["p1","Book"],["p2","Pen"],["p3","Bag"]],bytes:96 },copies:{ W0:null,W1:null,W2:null },facts:{ P0:[["o1","p1"],["o2","p2"]],P1:[["o3","p3"]],P2:[["o4","p2"],["o5","p9"]] },tables:{},joined:{ P0:[],P1:[],P2:[] },unmatched:[],status:"frozen" },
        "All workers will join against one immutable dimension version.", "A broadcast join cannot mix dimension versions within one query attempt."),
      step("Broadcast snapshot bytes", "The exchange sends the 96-byte v42 payload once along each worker channel.", ["dim","broadcast","fan out products v42 to W0,W1,W2"],
        { dimension:{ version:42,rows:[["p1","Book"],["p2","Pen"],["p3","Bag"]],bytes:96 },copies:{ W0:42,W1:42,W2:42 },facts:{ P0:[["o1","p1"],["o2","p2"]],P1:[["o3","p3"]],P2:[["o4","p2"],["o5","p9"]] },tables:{},joined:{ P0:[],P1:[],P2:[] },unmatched:[],status:"broadcast-complete" },
        "Every fact worker has a complete local dimension copy.", "A worker probes facts only after validating the broadcast checksum and version."),
      step("Build local hash tables", "Each worker indexes its copy by product ID, producing identical three-entry lookup tables.", ["broadcast","cache","build productId hash tables"],
        { dimension:{ version:42,rows:[["p1","Book"],["p2","Pen"],["p3","Bag"]],bytes:96 },copies:{ W0:42,W1:42,W2:42 },facts:{ P0:[["o1","p1"],["o2","p2"]],P1:[["o3","p3"]],P2:[["o4","p2"],["o5","p9"]] },tables:{ W0:{ p1:"Book",p2:"Pen",p3:"Bag" },W1:{ p1:"Book",p2:"Pen",p3:"Bag" },W2:{ p1:"Book",p2:"Pen",p3:"Bag" } },joined:{ P0:[],P1:[],P2:[] },unmatched:[],status:"ready" },
        "Dimension probes are memory-local on all workers.", "Each hash entry is derived from the same verified snapshot."),
      step("Join fact partitions locally", "P0 emits o1-Book and o2-Pen; P1 emits o3-Bag without moving order rows.", ["f0","cache","probe P0 and P1 against local v42"],
        { dimension:{ version:42,rows:[["p1","Book"],["p2","Pen"],["p3","Bag"]],bytes:96 },copies:{ W0:42,W1:42,W2:42 },facts:{ P0:[],P1:[],P2:[["o4","p2"],["o5","p9"]] },tables:{ W0:{ p1:"Book",p2:"Pen",p3:"Bag" },W1:{ p1:"Book",p2:"Pen",p3:"Bag" },W2:{ p1:"Book",p2:"Pen",p3:"Bag" } },joined:{ P0:[["o1","p1","Book"],["o2","p2","Pen"]],P1:[["o3","p3","Bag"]],P2:[] },unmatched:[],status:"joining" },
        "Three joined rows remain partition-local.", "Broadcasting the small side avoids a network shuffle of the large fact side."),
      step("Apply join semantics to misses", "P2 emits o4-Pen and drops unmatched p9 under inner-join semantics.", ["f2","cache","probe p2 hit and p9 miss"],
        { dimension:{ version:42,rows:[["p1","Book"],["p2","Pen"],["p3","Bag"]],bytes:96 },copies:{ W0:42,W1:42,W2:42 },facts:{ P0:[],P1:[],P2:[] },tables:{ W0:{ p1:"Book",p2:"Pen",p3:"Bag" },W1:{ p1:"Book",p2:"Pen",p3:"Bag" },W2:{ p1:"Book",p2:"Pen",p3:"Bag" } },joined:{ P0:[["o1","p1","Book"],["o2","p2","Pen"]],P1:[["o3","p3","Bag"]],P2:[["o4","p2","Pen"]] },unmatched:[["o5","p9"]],status:"joining" },
        "Four matches and one explicit miss are accounted for.", "Every fact row is either emitted according to join type or recorded as unmatched."),
      step("Commit partitioned outputs", "Workers atomically publish their output manifests and release cached v42 after the query barrier.", ["cache","output","commit P0,P1,P2 manifests for v42"],
        { dimension:{ version:42,rows:[["p1","Book"],["p2","Pen"],["p3","Bag"]],bytes:96 },copies:{ W0:null,W1:null,W2:null },facts:{ P0:[],P1:[],P2:[] },tables:{},joined:{ P0:[["o1","p1","Book"],["o2","p2","Pen"]],P1:[["o3","p3","Bag"]],P2:[["o4","p2","Pen"]] },unmatched:[["o5","p9"]],status:"committed-v42" },
        "The query publishes one consistent four-row join result.", "Output manifests identify the dimension version used by every partition.")
    ]);

  add("distributed-data-processing", "Checkpointing", "stream",
    "A long-running batch pipeline checkpoints input positions, operator state, and output manifests so failed tasks resume without duplicating files.",
    [
      ["source","Input splits","offset authority",8,18],
      ["w0","Worker W0","stateful task",28,30],
      ["w1","Worker W1","stateful task",28,76],
      ["coord","Checkpoint coordinator","barrier controller",51,14],
      ["store","Checkpoint store","durable snapshots",63,52],
      ["manifest","Output manifest","committed file set",84,28],
      ["sink","Result table","visible output",92,78]
    ], [
      ["source","w0","records and positions"],["source","w1","records and positions"],
      ["coord","w0","checkpoint barrier"],["coord","w1","checkpoint barrier"],
      ["w0","store","state snapshot"],["w1","store","state snapshot"],
      ["store","manifest","completed checkpoint"],["manifest","sink","atomic publish"]
    ], [
      step("Process before the barrier", "W0 consumes P0 offsets 0-4 and W1 consumes P1 offsets 0-3, producing temporary files t0 and t1.", null,
        { positions:{ P0:5,P1:4 },workerState:{ W0:{ sum:21,temp:"t0" },W1:{ sum:13,temp:"t1" } },barrier:null,snapshots:{},checkpoint:null,files:{ temp:["t0","t1"],committed:[] },manifest:[],status:"running" },
        "Volatile progress and temporary output exist on both workers.", "Source positions advance only with deterministic state transitions."),
      step("Inject checkpoint C7", "The coordinator asks each worker to stop at its next record boundary and report a consistent cut.", ["coord","w0","barrier C7 to W0 and W1"],
        { positions:{ P0:5,P1:4 },workerState:{ W0:{ sum:21,temp:"t0",blocked:true },W1:{ sum:13,temp:"t1",blocked:true } },barrier:{ id:"C7",acks:[] },snapshots:{},checkpoint:null,files:{ temp:["t0","t1"],committed:[] },manifest:[],status:"aligning" },
        "No worker processes beyond its captured source position during alignment.", "A checkpoint cut records one position for every input partition."),
      step("Persist worker snapshots", "W0 stores sum=21 at P0:5 and W1 stores sum=13 at P1:4, each referencing immutable temporary output.", ["w0","store","write C7 worker snapshots"],
        { positions:{ P0:5,P1:4 },workerState:{ W0:{ sum:21,temp:"t0",blocked:true },W1:{ sum:13,temp:"t1",blocked:true } },barrier:{ id:"C7",acks:["W0","W1"] },snapshots:{ W0:{ position:["P0",5],sum:21,temp:"t0",checksum:"a7" },W1:{ position:["P1",4],sum:13,temp:"t1",checksum:"b9" } },checkpoint:null,files:{ temp:["t0","t1"],committed:[] },manifest:[],status:"persisted" },
        "Durable state now identifies exact replay positions and output files.", "A worker acknowledgement follows durable snapshot and checksum completion."),
      step("Commit the checkpoint manifest", "After both acknowledgements, C7 atomically lists both snapshots and promotes t0 and t1 as output generation g7.", ["store","manifest","commit C7 generation g7"],
        { positions:{ P0:5,P1:4 },workerState:{ W0:{ sum:21,temp:"t0" },W1:{ sum:13,temp:"t1" } },barrier:null,snapshots:{ W0:{ position:["P0",5],sum:21,temp:"t0",checksum:"a7" },W1:{ position:["P1",4],sum:13,temp:"t1",checksum:"b9" } },checkpoint:{ id:"C7",positions:{ P0:5,P1:4 },generation:"g7" },files:{ temp:[],committed:["g7/t0","g7/t1"] },manifest:["g7/t0","g7/t1"],status:"committed" },
        "Source cut, operator state, and visible files become one recovery point.", "A completed checkpoint is published only after every required worker snapshot is durable."),
      step("Lose post-checkpoint work", "W1 processes offsets 4-6 into temporary t2 and then crashes; t2 is uncommitted and discarded.", ["w1","store","crash after P1 offset 7"],
        { positions:{ P0:8,P1:7 },workerState:{ W0:{ sum:30,temp:"t3" },W1:null },barrier:null,snapshots:{ W0:{ position:["P0",5],sum:21,temp:"t0",checksum:"a7" },W1:{ position:["P1",4],sum:13,temp:"t1",checksum:"b9" } },checkpoint:{ id:"C7",positions:{ P0:5,P1:4 },generation:"g7" },files:{ temp:["t3"],orphaned:["t2"],committed:["g7/t0","g7/t1"] },manifest:["g7/t0","g7/t1"],status:"failed" },
        "Only work after C7 is lost; generation g7 remains visible.", "Files absent from a committed manifest are never exposed as final output."),
      step("Restore and replay", "Replacement W1 loads C7 sum=13, seeks P1 to offset 4, and replays offsets 4-6 into a new temporary file.", ["store","w1","restore C7 and replay P1:4-6"],
        { positions:{ P0:8,P1:7 },workerState:{ W0:{ sum:30,temp:"t3" },W1:{ sum:25,temp:"t2r",restoredFrom:"C7" } },barrier:null,snapshots:{ W0:{ position:["P0",5],sum:21,temp:"t0",checksum:"a7" },W1:{ position:["P1",4],sum:13,temp:"t1",checksum:"b9" } },checkpoint:{ id:"C7",positions:{ P0:5,P1:4 },generation:"g7" },files:{ temp:["t3","t2r"],committed:["g7/t0","g7/t1"] },manifest:["g7/t0","g7/t1"],status:"running" },
        "W1 reconstructs the same state without republishing C7 files.", "Recovery begins at each checkpointed next offset and writes a fresh uncommitted attempt.")
    ]);

  add("search-retrieval", "IVF", "search",
    "An IVF index assigns vectors to coarse centroids, probes the two nearest posting lists, and exactly reranks their candidates.",
    [
      ["q","Query q=(0.82,0.72)","query vector",82,12],
      ["quant","Coarse quantizer","centroid table",48,16],
      ["l0","List C0 left","inverted vector list",14,58],
      ["l1","List C1 center","inverted vector list",48,78],
      ["l2","List C2 right","inverted vector list",82,58],
      ["heap","Candidate heap","approximate top-k",61,46],
      ["store","Full vectors","exact vector store",30,92],
      ["results","Reranked top-2","search result",92,88]
    ], [
      ["q","quant","centroid distances"],["quant","l0","list assignment C0"],
      ["quant","l1","list assignment C1"],["quant","l2","list assignment C2"],
      ["l1","heap","probe candidates"],["l2","heap","probe candidates"],
      ["heap","store","fetch full vectors"],["store","results","exact rerank"]
    ], [
      step("Train coarse centroids", "The quantizer stores C0=(.15,.20), C1=(.50,.65), and C2=(.85,.75); vectors are assigned to their nearest centroid.", null,
        { centroids:{ C0:[0.15,0.20],C1:[0.50,0.65],C2:[0.85,0.75] },lists:{ C0:[["A",[0.10,0.18]],["B",[0.22,0.25]]],C1:[["C",[0.48,0.62]],["D",[0.60,0.70]]],C2:[["E",[0.80,0.69]],["F",[0.90,0.78]],["G",[0.75,0.88]]] },query:null,centroidDistances:{},probes:[],candidates:[],exactDistances:{},ranking:[] },
        "Each indexed vector appears in one coarse posting list.", "List assignment minimizes distance to the selected centroid."),
      step("Measure query to centroids", "q measures .672 to C0, .328 to C1, and .042 to C2.", ["q","quant","compute three centroid distances"],
        { centroids:{ C0:[0.15,0.20],C1:[0.50,0.65],C2:[0.85,0.75] },lists:{ C0:["A","B"],C1:["C","D"],C2:["E","F","G"] },query:[0.82,0.72],centroidDistances:{ C0:0.672,C1:0.328,C2:0.042 },probes:[],candidates:[],exactDistances:{},ranking:[] },
        "C2 is the nearest coarse region and C1 is second.", "Probe order is nondecreasing by query-to-centroid distance."),
      step("Choose nprobe two", "The search probes C2 and C1 while skipping distant list C0.", ["quant","l2","select C2 then C1 with nprobe=2"],
        { centroids:{ C0:[0.15,0.20],C1:[0.50,0.65],C2:[0.85,0.75] },lists:{ C0:["A","B"],C1:["C","D"],C2:["E","F","G"] },query:[0.82,0.72],centroidDistances:{ C0:0.672,C1:0.328,C2:0.042 },probes:["C2","C1"],candidates:[],exactDistances:{},ranking:[] },
        "Five of seven vectors become candidates.", "Only vectors in the selected posting lists are scanned."),
      step("Scan probed posting lists", "C2 yields approximate residual scores E=.04, F=.10, G=.18; C1 yields D=.23 and C=.35.", ["l2","heap","offer E,F,G,D,C residual scores"],
        { centroids:{ C0:[0.15,0.20],C1:[0.50,0.65],C2:[0.85,0.75] },lists:{ C0:["A","B"],C1:["C","D"],C2:["E","F","G"] },query:[0.82,0.72],centroidDistances:{ C0:0.672,C1:0.328,C2:0.042 },probes:["C2","C1"],candidates:[["E",0.04],["F",0.10],["G",0.18],["D",0.23],["C",0.35]],exactDistances:{},ranking:[] },
        "The candidate heap retains the best approximate vectors from both lists.", "Candidate generation never examines skipped-list payloads."),
      step("Fetch and exactly rerank", "The top four candidate IDs fetch full vectors; exact distances are E=.036, F=.100, D=.224, and G=.180.", ["heap","store","fetch E,F,G,D and compute exact distance"],
        { centroids:{ C0:[0.15,0.20],C1:[0.50,0.65],C2:[0.85,0.75] },lists:{ C0:["A","B"],C1:["C","D"],C2:["E","F","G"] },query:[0.82,0.72],centroidDistances:{ C0:0.672,C1:0.328,C2:0.042 },probes:["C2","C1"],candidates:[["E",0.04],["F",0.10],["G",0.18],["D",0.23]],exactDistances:{ E:0.036,F:0.100,G:0.180,D:0.224 },ranking:[] },
        "Exact scoring corrects approximate residual ordering before return.", "Reranking uses the original query, full vectors, and one consistent metric."),
      step("Return exact top two candidates", "E and F are emitted in exact-distance order; A and B were never scanned because C0 was not probed.", ["store","results","publish E=.036 F=.100"],
        { centroids:{ C0:[0.15,0.20],C1:[0.50,0.65],C2:[0.85,0.75] },lists:{ C0:["A","B"],C1:["C","D"],C2:["E","F","G"] },query:[0.82,0.72],centroidDistances:{ C0:0.672,C1:0.328,C2:0.042 },probes:["C2","C1"],candidates:[["E",0.04],["F",0.10],["G",0.18],["D",0.23]],exactDistances:{ E:0.036,F:0.100,G:0.180,D:0.224 },ranking:[["E",0.036],["F",0.100]] },
        "The result trades a five-vector candidate scan for possible recall loss in C0.", "Every returned vector was exactly scored, but unprobed lists can contain missed neighbors.")
    ]);

  add("search-retrieval", "Vector indexes", "search",
    "A distributed vector service fans a query to three index partitions, merges shard candidates, and reranks against full vectors.",
    [
      ["client","Query q","search client",7,16],
      ["router","Index router epoch 9","partition directory",31,18],
      ["p0","Partition P0","local ANN index",18,68],
      ["p1","Partition P1","local ANN index",48,84],
      ["p2","Partition P2","local ANN index",78,68],
      ["merge","Global candidate heap","top-k merger",58,42],
      ["vectors","Vector store","full precision payloads",83,22],
      ["results","Top-3 results","ranked response",94,84]
    ], [
      ["client","router","query vector plus k"],["router","p0","fan-out epoch 9"],
      ["router","p1","fan-out epoch 9"],["router","p2","fan-out epoch 9"],
      ["p0","merge","shard candidates"],["p1","merge","shard candidates"],["p2","merge","shard candidates"],
      ["merge","vectors","fetch candidate vectors"],["vectors","results","exact scores"]
    ], [
      step("Resolve the partition map", "Epoch 9 maps vector ID ranges [0,99], [100,199], and [200,299] to P0, P1, and P2.", null,
        { epoch:9,query:[0.4,0.9],k:3,partitions:{ P0:"0-99",P1:"100-199",P2:"200-299" },requests:[],localCandidates:{ P0:[],P1:[],P2:[] },heap:[],fetched:{},ranking:[],timeouts:[] },
        "The coordinator pins one partition epoch for the entire search.", "Every live vector ID is owned by exactly one partition in the pinned epoch."),
      step("Fan out the query", "The router sends q, k=3, and search budget ef=20 to all three partitions in parallel.", ["router","p0","fan out q to P0,P1,P2"],
        { epoch:9,query:[0.4,0.9],k:3,partitions:{ P0:"0-99",P1:"100-199",P2:"200-299" },requests:[["P0",20],["P1",20],["P2",20]],localCandidates:{ P0:[],P1:[],P2:[] },heap:[],fetched:{},ranking:[],timeouts:[] },
        "All index partitions search concurrently.", "Fan-out uses identical query bytes, metric, and index epoch."),
      step("Search local ANN structures", "P0 returns 17=.18, 42=.31; P1 returns 133=.12, 151=.27; P2 returns 208=.16, 244=.45.", ["p1","merge","return two local candidates per shard"],
        { epoch:9,query:[0.4,0.9],k:3,partitions:{ P0:"0-99",P1:"100-199",P2:"200-299" },requests:[["P0",20],["P1",20],["P2",20]],localCandidates:{ P0:[[17,0.18],[42,0.31]],P1:[[133,0.12],[151,0.27]],P2:[[208,0.16],[244,0.45]] },heap:[],fetched:{},ranking:[],timeouts:[] },
        "Six bounded shard candidates reach the coordinator instead of all vectors.", "Each shard candidate list is sorted by its local approximate distance."),
      step("Merge shard candidates", "A size-five heap keeps IDs 133, 208, 17, 151, and 42; ID 244 is pruned at threshold .31.", ["p2","merge","merge six lists into global top five"],
        { epoch:9,query:[0.4,0.9],k:3,partitions:{ P0:"0-99",P1:"100-199",P2:"200-299" },requests:[["P0",20],["P1",20],["P2",20]],localCandidates:{ P0:[[17,0.18],[42,0.31]],P1:[[133,0.12],[151,0.27]],P2:[[208,0.16],[244,0.45]] },heap:[[133,0.12],[208,0.16],[17,0.18],[151,0.27],[42,0.31]],fetched:{},ranking:[],timeouts:[] },
        "Cross-partition competition produces one candidate set.", "The merge compares scores produced by the same metric and normalization."),
      step("Fetch full vectors and rerank", "The coordinator fetches five full-precision vectors and obtains exact distances 133=.14, 208=.15, 17=.21, 42=.25, 151=.29.", ["merge","vectors","batch fetch IDs 133,208,17,151,42"],
        { epoch:9,query:[0.4,0.9],k:3,partitions:{ P0:"0-99",P1:"100-199",P2:"200-299" },requests:[["P0",20],["P1",20],["P2",20]],localCandidates:{ P0:[[17,0.18],[42,0.31]],P1:[[133,0.12],[151,0.27]],P2:[[208,0.16],[244,0.45]] },heap:[[133,0.12],[208,0.16],[17,0.18],[151,0.27],[42,0.31]],fetched:{ 133:0.14,208:0.15,17:0.21,151:0.29,42:0.25 },ranking:[],timeouts:[] },
        "Exact distance changes the order of IDs 42 and 151.", "Reranking never trusts quantized or graph-navigation scores as final scores."),
      step("Return the global top three", "The service returns 133, 208, and 17 with their exact distances and source partitions.", ["vectors","results","return 133,208,17"],
        { epoch:9,query:[0.4,0.9],k:3,partitions:{ P0:"0-99",P1:"100-199",P2:"200-299" },requests:[["P0",20],["P1",20],["P2",20]],localCandidates:{ P0:[[17,0.18],[42,0.31]],P1:[[133,0.12],[151,0.27]],P2:[[208,0.16],[244,0.45]] },heap:[[133,0.12],[208,0.16],[17,0.18],[151,0.27],[42,0.31]],fetched:{ 133:0.14,208:0.15,17:0.21,151:0.29,42:0.25 },ranking:[[133,0.14,"P1"],[208,0.15,"P2"],[17,0.21,"P0"]],timeouts:[] },
        "One ranked response combines candidates from all three partitions.", "Every returned item belongs to the pinned epoch and has a full-precision score.")
    ]);

  add("distributed-algorithms", "Minimum spanning tree", "graph",
    "Prim's algorithm grows a minimum spanning tree by repeatedly selecting the cheapest edge crossing from the tree to an outside vertex.",
    [
      ["A","A","graph vertex",8,48],
      ["B","B","graph vertex",31,16],
      ["C","C","graph vertex",34,76],
      ["D","D","graph vertex",64,18],
      ["E","E","graph vertex",67,78],
      ["frontier","Min frontier","crossing-edge heap",52,48],
      ["tree","MST edges","selected forest",88,36],
      ["coord","Prim coordinator","selection state",90,78]
    ], [
      ["A","B","edge weight 1"],["A","C","edge weight 4"],["B","C","edge weight 2"],
      ["B","D","edge weight 5"],["C","D","edge weight 1"],["C","E","edge weight 3"],
      ["D","E","edge weight 2"],["A","frontier","expose crossing edges"],
      ["frontier","tree","select minimum"],["coord","frontier","discard stale edges"]
    ], [
      step("Seed the tree at A", "A enters the tree and exposes AB=1 and AC=4 to the frontier.", ["A","frontier","push AB1 and AC4"],
        { inTree:["A"],frontier:[["A","B",1],["A","C",4]],selected:[],rejected:[],keys:{ A:0,B:1,C:4,D:"inf",E:"inf" },parent:{ A:null,B:"A",C:"A" },weight:0,current:"A" },
        "AB is the minimum crossing edge.", "Every frontier edge has exactly one endpoint in the current tree when inserted."),
      step("Select AB", "AB=1 adds B and exposes BC=2 and BD=5.", ["frontier","tree","select AB weight 1"],
        { inTree:["A","B"],frontier:[["B","C",2],["A","C",4],["B","D",5]],selected:[["A","B",1]],rejected:[],keys:{ A:0,B:1,C:2,D:5,E:"inf" },parent:{ A:null,B:"A",C:"B",D:"B" },weight:1,current:"B" },
        "C's best attachment improves from AC=4 to BC=2.", "Selecting an edge adds exactly one previously outside vertex."),
      step("Select BC", "BC=2 adds C; CD=1 and CE=3 enter the heap while stale AC=4 remains removable.", ["frontier","tree","select BC weight 2"],
        { inTree:["A","B","C"],frontier:[["C","D",1],["C","E",3],["A","C",4],["B","D",5]],selected:[["A","B",1],["B","C",2]],rejected:[],keys:{ A:0,B:1,C:2,D:1,E:3 },parent:{ A:null,B:"A",C:"B",D:"C",E:"C" },weight:3,current:"C" },
        "CD becomes the cheapest edge across the cut.", "For each outside vertex, its key is the cheapest discovered connection to the tree."),
      step("Discard an internal edge", "AC=4 now has both endpoints in the tree, so lazy heap cleanup rejects it without changing the MST.", ["coord","frontier","discard stale AC4"],
        { inTree:["A","B","C"],frontier:[["C","D",1],["C","E",3],["B","D",5]],selected:[["A","B",1],["B","C",2]],rejected:[["A","C",4]],keys:{ A:0,B:1,C:2,D:1,E:3 },parent:{ A:null,B:"A",C:"B",D:"C",E:"C" },weight:3,current:null },
        "The frontier again contains only useful crossing candidates.", "An edge whose outside endpoint already joined cannot be selected."),
      step("Select CD then DE", "CD=1 adds D, which exposes DE=2; DE then beats CE=3 and adds E.", ["frontier","tree","select CD1 then DE2"],
        { inTree:["A","B","C","D","E"],frontier:[["C","E",3],["B","D",5]],selected:[["A","B",1],["B","C",2],["C","D",1],["D","E",2]],rejected:[["A","C",4]],keys:{ A:0,B:1,C:2,D:1,E:2 },parent:{ A:null,B:"A",C:"B",D:"C",E:"D" },weight:6,current:"E" },
        "Four edges span all five vertices at total weight six.", "The selected edge is the lightest edge crossing the current cut."),
      step("Finalize the spanning tree", "Remaining CE=3 and BD=5 are internal edges and are rejected.", ["coord","tree","publish AB,BC,CD,DE weight 6"],
        { inTree:["A","B","C","D","E"],frontier:[],selected:[["A","B",1],["B","C",2],["C","D",1],["D","E",2]],rejected:[["A","C",4],["C","E",3],["B","D",5]],keys:{ A:0,B:1,C:2,D:1,E:2 },parent:{ A:null,B:"A",C:"B",D:"C",E:"D" },weight:6,current:null },
        "The result is connected, acyclic, and has minimum total weight.", "A spanning tree over five vertices contains exactly four selected edges.")
    ]);

  add("distributed-algorithms", "Consistent hashing", "storage",
    "A partition router adds node N3 to a versioned hash ring and migrates only the newly owned clockwise range.",
    [
      ["router","Ring router e12","metadata authority",50,8],
      ["n1","N1 token 10","ring owner",14,38],
      ["n2","N2 token 40","ring owner",35,84],
      ["n3","N3 token 70","joining owner",70,84],
      ["n4","N4 token 90","ring owner",88,38],
      ["k1","alpha hash 35","key position",29,42],
      ["k2","beta hash 65","key position",62,66],
      ["mover","Range mover","streaming transfer",82,60]
    ], [
      ["n1","n2","clockwise successor"],["n2","n3","clockwise successor"],
      ["n3","n4","clockwise successor"],["n4","n1","clockwise wrap"],
      ["router","k1","hash and locate"],["router","k2","hash and locate"],
      ["n4","mover","stream range (40,70]"],["mover","n3","install beta"]
    ], [
      step("Publish the initial ring", "Epoch 11 contains N1@10, N2@40, and N4@90; ranges wrap clockwise.", null,
        { epoch:11,nodes:[["N1",10],["N2",40],["N4",90]],ranges:{ N1:"(90,10]",N2:"(10,40]",N4:"(40,90]" },keys:{ alpha:35,beta:65 },owners:{ alpha:"N2",beta:"N4" },routing:{},transfer:null,replicas:{ alpha:["N2","N4"],beta:["N4","N1"] } },
        "Each hash position has exactly one primary clockwise successor.", "All routers use an immutable ring epoch for a request."),
      step("Route existing keys", "alpha@35 resolves to N2 and beta@65 resolves to N4 under epoch 11.", ["router","k2","lookup beta at successor N4"],
        { epoch:11,nodes:[["N1",10],["N2",40],["N4",90]],ranges:{ N1:"(90,10]",N2:"(10,40]",N4:"(40,90]" },keys:{ alpha:35,beta:65 },owners:{ alpha:"N2",beta:"N4" },routing:{ alpha:["e11","N2"],beta:["e11","N4"] },transfer:null,replicas:{ alpha:["N2","N4"],beta:["N4","N1"] } },
        "Routing requires one hash and a clockwise token lookup.", "The owner is the first token greater than or equal to the key hash, with wraparound."),
      step("Insert joining token", "The controller prepares epoch 12 with N3@70 between N2 and N4.", ["router","n3","stage N3 token 70 in epoch 12"],
        { epoch:11,stagedEpoch:12,nodes:[["N1",10],["N2",40],["N3",70],["N4",90]],ranges:{ N1:"(90,10]",N2:"(10,40]",N3:"(40,70]",N4:"(70,90]" },keys:{ alpha:35,beta:65 },owners:{ alpha:"N2",beta:"N4" },routing:{ alpha:["e11","N2"],beta:["e11","N4"] },transfer:{ range:"(40,70]",source:"N4",target:"N3",cursor:40,status:"planned" },replicas:{ alpha:["N2","N4"],beta:["N4","N1"] } },
        "Only N4's former subrange (40,70] changes ownership in the staged ring.", "The active epoch does not change before required range data is copied."),
      step("Stream the affected range", "The mover copies beta@65 and its version while writes in (40,70] are dual-recorded to N4 and N3.", ["n4","mover","copy beta and catch up range log"],
        { epoch:11,stagedEpoch:12,nodes:[["N1",10],["N2",40],["N3",70],["N4",90]],ranges:{ N1:"(90,10]",N2:"(10,40]",N3:"(40,70]",N4:"(70,90]" },keys:{ alpha:35,beta:65 },owners:{ alpha:"N2",beta:"N4" },routing:{ alpha:["e11","N2"],beta:["e11","N4"] },transfer:{ range:"(40,70]",source:"N4",target:"N3",cursor:70,copied:[["beta",65,"v8"]],deltaLSN:144,status:"caught-up" },replicas:{ alpha:["N2","N4"],beta:["N4","N1"] } },
        "N3 has a complete copy through the cutover log position.", "Migration copies only keys whose hashes fall in the joining node's predecessor range."),
      step("Atomically publish epoch 12", "Routers switch to epoch 12, making N3 primary for beta while alpha remains on N2.", ["router","n3","activate epoch 12 ownership"],
        { epoch:12,nodes:[["N1",10],["N2",40],["N3",70],["N4",90]],ranges:{ N1:"(90,10]",N2:"(10,40]",N3:"(40,70]",N4:"(70,90]" },keys:{ alpha:35,beta:65 },owners:{ alpha:"N2",beta:"N3" },routing:{ alpha:["e12","N2"],beta:["e12","N3"] },transfer:{ range:"(40,70]",source:"N4",target:"N3",deltaLSN:144,status:"cutover" },replicas:{ alpha:["N2","N3"],beta:["N3","N4"] } },
        "Only beta changes primary owner, and replica successors are recomputed.", "A request routes entirely with either epoch 11 or epoch 12, never a mixed view."),
      step("Retire the old primary copy", "After epoch-11 requests drain, N4 retains beta only as N3's clockwise replica and range migration completes.", ["mover","n3","finish handoff and retire epoch 11"],
        { epoch:12,nodes:[["N1",10],["N2",40],["N3",70],["N4",90]],ranges:{ N1:"(90,10]",N2:"(10,40]",N3:"(40,70]",N4:"(70,90]" },keys:{ alpha:35,beta:65 },owners:{ alpha:"N2",beta:"N3" },routing:{ alpha:["e12","N2"],beta:["e12","N3"] },transfer:{ range:"(40,70]",source:"N4",target:"N3",deltaLSN:144,status:"complete" },replicas:{ alpha:["N2","N3"],beta:["N3","N4"] } },
        "The ring is balanced without moving alpha or unrelated ranges.", "Old ownership is removed only after new ownership is durable and old-epoch traffic has drained.")
    ]);

  add("distributed-algorithms", "Leader election", "topology",
    "Three Raft replicas elect N2 in term 8, establish authority with heartbeats, and step down on a higher term.",
    [
      ["n1","N1 follower","replica",12,68],
      ["n2","N2 candidate","replica",50,84],
      ["n3","N3 follower","replica",88,68],
      ["timer","Election timers","failure detector",22,18],
      ["votes","Vote quorum","term-scoped ballots",50,42],
      ["log","Replicated log","up-to-date check",78,18],
      ["client","Client writes","leader-only traffic",92,42]
    ], [
      ["timer","n2","timeout"],["n2","votes","request vote term 8"],
      ["n1","votes","grant N2"],["n3","votes","grant N2"],
      ["votes","n2","majority"],["n2","log","append heartbeat"],
      ["client","n2","redirect to leader"],["n2","n1","AppendEntries"],["n2","n3","AppendEntries"]
    ], [
      step("Followers await heartbeats", "All replicas are followers in term 7; N2 has the earliest randomized election deadline.", null,
        { term:7,roles:{ N1:"follower",N2:"follower",N3:"follower" },deadlines:{ N1:230,N2:180,N3:260 },votedFor:{ N1:null,N2:null,N3:null },logs:{ N1:[12,7],N2:[12,7],N3:[11,7] },votes:[],leader:null,heartbeats:[],clientRoute:null },
        "No leader is known after the previous heartbeat lease expires.", "A replica grants at most one vote per term."),
      step("N2 starts term eight", "At 180 ms N2 increments its term, votes for itself, and requests votes with lastLog=(12,7).", ["timer","n2","timeout; become candidate term 8"],
        { term:8,roles:{ N1:"follower",N2:"candidate",N3:"follower" },deadlines:{ N1:230,N2:360,N3:260 },votedFor:{ N1:null,N2:"N2",N3:null },logs:{ N1:[12,7],N2:[12,7],N3:[11,7] },votes:["N2"],requests:[["N2","N1",8,12,7],["N2","N3",8,12,7]],leader:null,heartbeats:[],clientRoute:null },
        "N2 is a candidate with one self-vote.", "Election requests carry the candidate term and last-log position."),
      step("Followers evaluate the candidate", "N1 and N3 update to term 8; N2's log is at least as up-to-date, so both grant their term-8 vote.", ["n2","votes","collect N1 and N3 grants"],
        { term:8,roles:{ N1:"follower",N2:"candidate",N3:"follower" },deadlines:{ N1:410,N2:360,N3:430 },votedFor:{ N1:"N2",N2:"N2",N3:"N2" },logs:{ N1:[12,7],N2:[12,7],N3:[11,7] },votes:["N2","N1","N3"],requests:[],leader:null,heartbeats:[],clientRoute:null },
        "N2 has three votes, exceeding the two-node majority.", "A vote is granted only once per term and only to a candidate with an up-to-date log."),
      step("Become leader and assert authority", "N2 becomes leader and immediately sends empty AppendEntries heartbeats carrying term 8 and prevLogIndex 12.", ["votes","n2","majority reached; become leader"],
        { term:8,roles:{ N1:"follower",N2:"leader",N3:"follower" },deadlines:{ N1:410,N2:null,N3:430 },votedFor:{ N1:"N2",N2:"N2",N3:"N2" },logs:{ N1:[12,7],N2:[12,7],N3:[11,7] },votes:["N2","N1","N3"],leader:"N2",heartbeats:[["N2","N1",8,12],["N2","N3",8,12]],clientRoute:"N2" },
        "Followers reset their timers and clients can discover N2.", "Leadership is valid only within the elected term and maintained by periodic AppendEntries."),
      step("Replicate a leader entry", "N2 appends command x at index 13 term 8 and commits after N1 acknowledges, a majority of two.", ["client","n2","append x at index 13 and replicate"],
        { term:8,roles:{ N1:"follower",N2:"leader",N3:"follower" },deadlines:{ N1:470,N2:null,N3:430 },votedFor:{ N1:"N2",N2:"N2",N3:"N2" },logs:{ N1:[13,8],N2:[13,8],N3:[11,7] },votes:["N2","N1","N3"],leader:"N2",heartbeats:[["N2","N3",8,13]],commitIndex:13,clientRoute:"N2" },
        "Command x is committed despite N3 lagging.", "Only the current leader advances commit after a majority stores the entry."),
      step("Step down on a higher term", "N3 later presents term 9; N2 updates its term, clears leadership, and rejects leader-only client writes.", ["n3","n2","higher term 9 forces step-down"],
        { term:9,roles:{ N1:"follower",N2:"follower",N3:"candidate" },deadlines:{ N1:470,N2:510,N3:520 },votedFor:{ N1:null,N2:null,N3:"N3" },logs:{ N1:[13,8],N2:[13,8],N3:[11,7] },votes:["N3"],leader:null,heartbeats:[],commitIndex:13,clientRoute:"retry election" },
        "No term-8 leader continues accepting writes.", "Any message with a higher term immediately invalidates lower-term candidacy or leadership.")
    ]);

  add("distributed-algorithms", "Distributed snapshots", "stream",
    "Three processes run Chandy-Lamport over FIFO channels and capture a consistent snapshot containing one in-flight transfer.",
    [
      ["p1","P1 balance","process state",12,24],
      ["c12","C12 P1->P2","FIFO channel",38,18],
      ["p2","P2 balance","process state",68,24],
      ["c23","C23 P2->P3","FIFO channel",78,52],
      ["p3","P3 balance","process state",58,84],
      ["c31","C31 P3->P1","FIFO channel",25,70],
      ["collector","Snapshot S1","global cut",92,82]
    ], [
      ["p1","c12","send transfer or marker"],["c12","p2","deliver FIFO"],
      ["p2","c23","send marker"],["c23","p3","deliver FIFO"],
      ["p3","c31","send transfer or marker"],["c31","p1","record in-transit messages"],
      ["p1","collector","local plus C31"],["p2","collector","local plus C12"],["p3","collector","local plus C23"]
    ], [
      step("Place a transfer in C12", "Before snapshot S1, P1 sends m12=$2: P1 falls from 5 to 3 while the undelivered message sits in C12.", ["p1","c12","send m12 amount 2"],
        { liveBalances:{ P1:3,P2:4,P3:6 },channels:{ C12:[["m12",2]],C23:[],C31:[] },localSnapshot:{},channelSnapshot:{},recording:{ P1:[],P2:[],P3:[] },markers:[],complete:[],totalLive:15 },
        "Money is conserved across process balances and channel contents.", "A send atomically debits the sender before the FIFO message enters its channel."),
      step("P1 initiates snapshot S1", "P1 records local balance 3, starts recording incoming C31, and appends marker S1 after m12 on outgoing C12.", ["p1","c12","record P1=3 and send marker S1"],
        { liveBalances:{ P1:3,P2:4,P3:6 },channels:{ C12:[["m12",2],["marker","S1"]],C23:[],C31:[] },localSnapshot:{ P1:3 },channelSnapshot:{ C31:[] },recording:{ P1:["C31"],P2:[],P3:[] },markers:[["P1","C12"]],complete:[],totalLive:15 },
        "P1's local cut is fixed while its incoming channel remains open.", "An initiator records local state before sending a marker on every outgoing channel."),
      step("P2 receives data before the marker", "FIFO delivery applies m12 first, raising P2 from 4 to 6; the following marker then records P2=6 and an empty C12 snapshot.", ["c12","p2","deliver m12 then marker S1"],
        { liveBalances:{ P1:3,P2:6,P3:6 },channels:{ C12:[],C23:[["marker","S1"]],C31:[] },localSnapshot:{ P1:3,P2:6 },channelSnapshot:{ C31:[],C12:[] },recording:{ P1:["C31"],P2:[],P3:[] },markers:[["P1","C12"],["P2","C23"]],complete:["P2"],totalLive:15 },
        "P2's snapshot includes the transfer in local state, not in C12.", "On the first marker, a process records local state and treats that incoming channel as empty."),
      step("Create an in-flight C31 transfer", "After P1's cut but before P3's cut, P3 sends m31=$1; P3 falls to 5 and P1 records the arriving message on open channel C31.", ["p3","c31","send m31 amount 1 during recording"],
        { liveBalances:{ P1:4,P2:6,P3:5 },channels:{ C12:[],C23:[["marker","S1"]],C31:[] },localSnapshot:{ P1:3,P2:6 },channelSnapshot:{ C31:[["m31",1]],C12:[] },recording:{ P1:["C31"],P2:[],P3:[] },markers:[["P1","C12"],["P2","C23"]],complete:["P2"],totalLive:15 },
        "P1 applies m31 to live balance 4 but keeps snapshot-local balance 3.", "Messages arriving on an open incoming channel are recorded until that channel's marker arrives."),
      step("P3 receives its first marker", "Marker S1 on C23 makes P3 record local balance 5, mark C23 empty, and send its marker on C31 after m31.", ["c23","p3","record P3=5 and send marker on C31"],
        { liveBalances:{ P1:4,P2:6,P3:5 },channels:{ C12:[],C23:[],C31:[["marker","S1"]] },localSnapshot:{ P1:3,P2:6,P3:5 },channelSnapshot:{ C31:[["m31",1]],C12:[],C23:[] },recording:{ P1:["C31"],P2:[],P3:[] },markers:[["P1","C12"],["P2","C23"],["P3","C31"]],complete:["P2","P3"],totalLive:15 },
        "All three local states are now captured.", "FIFO ordering places P3's marker after every earlier message it sent on C31."),
      step("Close P1's incoming channel", "P1 receives the C31 marker and stops recording; C31's snapshot contains exactly m31=$1.", ["c31","p1","receive marker and close C31 recording"],
        { liveBalances:{ P1:4,P2:6,P3:5 },channels:{ C12:[],C23:[],C31:[] },localSnapshot:{ P1:3,P2:6,P3:5 },channelSnapshot:{ C31:[["m31",1]],C12:[],C23:[] },recording:{ P1:[],P2:[],P3:[] },markers:[["P1","C12"],["P2","C23"],["P3","C31"]],complete:["P1","P2","P3"],totalLive:15 },
        "Every process has received a marker on every incoming channel.", "A channel snapshot contains messages sent before the sender's cut and received after the receiver's cut."),
      step("Assemble the global snapshot", "The collector combines local balances 3+6+5 with C31's in-flight $1 for a conserved total of $15.", ["p1","collector","publish locals and channel records for S1"],
        { liveBalances:{ P1:4,P2:6,P3:5 },channels:{ C12:[],C23:[],C31:[] },localSnapshot:{ P1:3,P2:6,P3:5 },channelSnapshot:{ C12:[],C23:[],C31:[["m31",1]] },recording:{ P1:[],P2:[],P3:[] },markers:[["P1","C12"],["P2","C23"],["P3","C31"]],complete:["P1","P2","P3"],snapshotTotal:15,status:"complete" },
        "S1 is a consistent global cut even though live execution never stopped.", "Local snapshot value plus recorded channel value preserves the system-wide conservation invariant.")
    ]);

  add("distributed-algorithms", "Distributed sorting", "mapreduce",
    "Sample sort chooses global splitters, shuffles records into ordered range partitions, sorts locally, and concatenates outputs.",
    [
      ["i0","Input P0","unsorted partition",8,18],
      ["i1","Input P1","unsorted partition",8,80],
      ["sample","Sample coordinator","splitter selection",34,18],
      ["buffers","Range buffers","local partitioning",35,62],
      ["r0","Reducer R0 <=4","range sorter",63,24],
      ["r1","Reducer R1 5..8","range sorter",63,54],
      ["r2","Reducer R2 >8","range sorter",63,84],
      ["output","Global sorted run","ordered partitions",92,50]
    ], [
      ["i0","sample","regular samples"],["i1","sample","regular samples"],
      ["sample","buffers","broadcast splitters 4,8"],["i0","buffers","partition rows"],
      ["i1","buffers","partition rows"],["buffers","r0","shuffle low range"],
      ["buffers","r1","shuffle middle range"],["buffers","r2","shuffle high range"],
      ["r0","output","partition 0"],["r1","output","partition 1"],["r2","output","partition 2"]
    ], [
      step("Start with unsorted partitions", "P0 contains [9,1,7,3,12] and P1 contains [6,2,11,5,4,8,10].", null,
        { inputs:{ P0:[9,1,7,3,12],P1:[6,2,11,5,4,8,10] },samples:{},splitters:[],buffers:{ P0:[[],[],[]],P1:[[],[],[]] },transfers:[],reducers:{ R0:[],R1:[],R2:[] },outputs:[],global:[] },
        "Twelve records are distributed without global order.", "Every input record has one source partition identity."),
      step("Collect regular samples", "Workers locally sort for sampling: P0 contributes [3,7,9], P1 contributes [2,6,10].", ["i0","sample","send regular samples from P0 and P1"],
        { inputs:{ P0:[1,3,7,9,12],P1:[2,4,5,6,8,10,11] },samples:{ P0:[3,7,9],P1:[2,6,10] },splitters:[],buffers:{ P0:[[],[],[]],P1:[[],[],[]] },transfers:[],reducers:{ R0:[],R1:[],R2:[] },outputs:[],global:[] },
        "The coordinator receives a compact approximation of the key distribution.", "Sampling does not remove or duplicate source records."),
      step("Choose and broadcast splitters", "Sorted samples [2,3,6,7,9,10] yield splitters 4 and 8 for three target ranges.", ["sample","buffers","broadcast boundaries <=4, <=8, >8"],
        { inputs:{ P0:[1,3,7,9,12],P1:[2,4,5,6,8,10,11] },samples:{ P0:[3,7,9],P1:[2,6,10] },splitters:[4,8],buffers:{ P0:[[],[],[]],P1:[[],[],[]] },transfers:[],reducers:{ R0:[],R1:[],R2:[] },outputs:[],global:[] },
        "All workers share identical nonoverlapping range boundaries.", "Every key maps to exactly one ordered interval."),
      step("Partition locally by range", "P0 buffers [1,3] [7] [9,12]; P1 buffers [2,4] [5,6,8] [10,11].", ["i1","buffers","partition both inputs with splitters"],
        { inputs:{ P0:[],P1:[] },samples:{ P0:[3,7,9],P1:[2,6,10] },splitters:[4,8],buffers:{ P0:[[1,3],[7],[9,12]],P1:[[2,4],[5,6,8],[10,11]] },transfers:[],reducers:{ R0:[],R1:[],R2:[] },outputs:[],global:[] },
        "Each source worker has one buffer per destination range.", "Local partitioning preserves the multiset of input records."),
      step("Shuffle range buffers", "R0 receives all keys <=4, R1 receives 5..8, and R2 receives keys >8.", ["buffers","r1","transfer six source-range buffers"],
        { inputs:{ P0:[],P1:[] },samples:{ P0:[3,7,9],P1:[2,6,10] },splitters:[4,8],buffers:{ P0:[[],[],[]],P1:[[],[],[]] },transfers:[["P0.0","R0"],["P1.0","R0"],["P0.1","R1"],["P1.1","R1"],["P0.2","R2"],["P1.2","R2"]],reducers:{ R0:[1,3,2,4],R1:[7,5,6,8],R2:[9,12,10,11] },outputs:[],global:[] },
        "All records for a global key range meet at one reducer.", "For reducer indexes i<j, every key at Ri is <= every key at Rj."),
      step("Sort each reducer partition", "Reducers independently sort to [1,2,3,4], [5,6,7,8], and [9,10,11,12].", ["r1","output","local sort all three range partitions"],
        { inputs:{ P0:[],P1:[] },samples:{ P0:[3,7,9],P1:[2,6,10] },splitters:[4,8],buffers:{ P0:[[],[],[]],P1:[[],[],[]] },transfers:[],reducers:{ R0:[1,2,3,4],R1:[5,6,7,8],R2:[9,10,11,12] },outputs:[[0,[1,2,3,4]],[1,[5,6,7,8]],[2,[9,10,11,12]]],global:[] },
        "Each output partition is internally sorted.", "A reducer emits keys in nondecreasing order within its assigned interval."),
      step("Concatenate partition manifests", "Reading reducer outputs by partition ID yields the global order 1 through 12 without another merge.", ["r2","output","publish ordered R0,R1,R2 manifests"],
        { inputs:{ P0:[],P1:[] },samples:{ P0:[3,7,9],P1:[2,6,10] },splitters:[4,8],buffers:{ P0:[[],[],[]],P1:[[],[],[]] },transfers:[],reducers:{ R0:[1,2,3,4],R1:[5,6,7,8],R2:[9,10,11,12] },outputs:[[0,[1,2,3,4]],[1,[5,6,7,8]],[2,[9,10,11,12]]],global:[1,2,3,4,5,6,7,8,9,10,11,12] },
        "The distributed result is globally sorted and contains every input record once.", "Sorted partitions plus ordered, nonoverlapping ranges imply global sorted order.")
    ]);

  add("distributed-algorithms", "Distributed aggregation", "topology",
    "A binary aggregation tree computes a cluster-wide sum with sequence-numbered partials, then broadcasts the result to every leaf.",
    [
      ["w0","W0 value 3","leaf worker",8,82],
      ["w1","W1 value 5","leaf worker",28,82],
      ["w2","W2 value 4","leaf worker",68,82],
      ["w3","W3 value 8","leaf worker",90,82],
      ["a0","Aggregator A0","left subtree",22,46],
      ["a1","Aggregator A1","right subtree",76,46],
      ["root","Root R","global reducer",50,14],
      ["result","All-reduce result","broadcast value",50,70]
    ], [
      ["w0","a0","partial seq 27"],["w1","a0","partial seq 27"],
      ["w2","a1","partial seq 27"],["w3","a1","partial seq 27"],
      ["a0","root","subtree sum"],["a1","root","subtree sum"],
      ["root","result","global sum"],["result","w0","broadcast 20"],
      ["result","w1","broadcast 20"],["result","w2","broadcast 20"],["result","w3","broadcast 20"]
    ], [
      step("Open aggregation round 27", "Four leaves freeze local contributions W0=3, W1=5, W2=4, and W3=8 under sequence 27.", null,
        { sequence:27,leafValues:{ W0:3,W1:5,W2:4,W3:8 },sent:{},received:{ A0:{},A1:{},R:{} },subtotals:{},global:null,broadcast:{},status:"open" },
        "Every leaf has one immutable contribution for this round.", "A worker contributes at most once for an aggregation sequence."),
      step("Send leaf partials upward", "W0 and W1 send to A0; W2 and W3 send to A1 with sender IDs and sequence 27.", ["w0","a0","send W0=3,W1=5 for seq 27"],
        { sequence:27,leafValues:{ W0:3,W1:5,W2:4,W3:8 },sent:{ W0:["A0",3],W1:["A0",5],W2:["A1",4],W3:["A1",8] },received:{ A0:{ W0:3,W1:5 },A1:{ W2:4,W3:8 },R:{} },subtotals:{},global:null,broadcast:{},status:"collecting" },
        "Both internal aggregators have their complete child sets.", "A receiver keys partials by sequence and child ID to make retries idempotent."),
      step("Ignore a duplicate retry", "A delayed retry of W1=5 is recognized as the same sequence-child pair and does not change A0.", ["w1","a0","retry W1=5; deduplicate"],
        { sequence:27,leafValues:{ W0:3,W1:5,W2:4,W3:8 },sent:{ W0:["A0",3],W1:["A0",5],W2:["A1",4],W3:["A1",8] },received:{ A0:{ W0:3,W1:5 },A1:{ W2:4,W3:8 },R:{} },duplicates:[["W1",27]],subtotals:{},global:null,broadcast:{},status:"collecting" },
        "A0 still represents exactly two leaves.", "Duplicate delivery cannot alter an aggregation round."),
      step("Reduce each subtree", "A0 emits 3+5=8 and A1 emits 4+8=12 to the root.", ["a0","root","send subtree sums A0=8 A1=12"],
        { sequence:27,leafValues:{ W0:3,W1:5,W2:4,W3:8 },sent:{ W0:["A0",3],W1:["A0",5],W2:["A1",4],W3:["A1",8],A0:["R",8],A1:["R",12] },received:{ A0:{ W0:3,W1:5 },A1:{ W2:4,W3:8 },R:{ A0:8,A1:12 } },duplicates:[["W1",27]],subtotals:{ A0:8,A1:12 },global:null,broadcast:{},status:"reducing" },
        "Two subtree partials replace four leaf messages at the root.", "Each internal subtotal equals the sum of its disjoint descendant leaves."),
      step("Compute the global aggregate", "R waits for both configured children, then commits global sum 20 for sequence 27.", ["root","result","commit seq 27 sum 20"],
        { sequence:27,leafValues:{ W0:3,W1:5,W2:4,W3:8 },sent:{ W0:["A0",3],W1:["A0",5],W2:["A1",4],W3:["A1",8],A0:["R",8],A1:["R",12] },received:{ A0:{ W0:3,W1:5 },A1:{ W2:4,W3:8 },R:{ A0:8,A1:12 } },duplicates:[["W1",27]],subtotals:{ A0:8,A1:12 },global:20,broadcast:{},status:"committed" },
        "The tree root has the exact cluster-wide sum.", "The root finalizes only after one partial from every expected child subtree."),
      step("Broadcast the all-reduce result", "The committed value flows down the tree until all four workers install result 20 for round 27.", ["result","w2","broadcast sum 20 to all leaves"],
        { sequence:27,leafValues:{ W0:3,W1:5,W2:4,W3:8 },sent:{ W0:["A0",3],W1:["A0",5],W2:["A1",4],W3:["A1",8],A0:["R",8],A1:["R",12] },received:{ A0:{ W0:3,W1:5 },A1:{ W2:4,W3:8 },R:{ A0:8,A1:12 } },duplicates:[["W1",27]],subtotals:{ A0:8,A1:12 },global:20,broadcast:{ W0:20,W1:20,W2:20,W3:20 },status:"complete" },
        "Every participant observes the same aggregate without all-to-all traffic.", "A worker installs a result only when its sequence matches the active aggregation round.")
    ]);

  window.SYSTEM_DESIGN_LESSONS = Object.assign(
    {},
    window.SYSTEM_DESIGN_LESSONS || {},
    lessons
  );
}());
