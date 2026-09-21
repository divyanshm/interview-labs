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

  add("probabilistic-data-structures", "Bloom filter", "bits",
    "An API gateway avoids disk reads for definitely absent session IDs.",
    bloomEntities, bloomConnections, [
      step("Start empty", "All twelve positions are zero before any session is admitted.", null,
        { bits: [0,0,0,0,0,0,0,0,0,0,0,0], key: null, hashes: [], verdict: "empty" },
        "The filter represents an empty set.", "A zero bit proves no inserted key used that position."),
      step("Hash s42", "Three independent hashes map s42 to positions 2, 5, and 9.", { type: "hash", key: "s42" },
        { bits: [0,0,0,0,0,0,0,0,0,0,0,0], key: "s42", hashes: [2,5,9], verdict: "pending-insert" },
        "The target positions are known.", "Exactly k=3 positions are derived for every key."),
      step("Set positions", "Insertion sets each selected position; existing ones would remain one.", { type: "set-bits", positions: [2,5,9] },
        { bits: [0,0,1,0,0,1,0,0,0,1,0,0], key: "s42", hashes: [2,5,9], verdict: "inserted" },
        "s42 is represented by three one bits.", "Bits only transition from zero to one."),
      step("Reject s77", "s77 maps to 2, 6, and 10; bit 6 is zero, so it is definitely absent.", { type: "query", key: "s77" },
        { bits: [0,0,1,0,0,1,0,0,0,1,0,0], key: "s77", hashes: [2,6,10], verdict: "definitely-absent" },
        "The gateway skips the backing store.", "Any zero among queried positions proves absence."),
      step("Admit a maybe", "s42 finds all three bits set, so the store must confirm membership.", { type: "query", key: "s42" },
        { bits: [0,0,1,0,0,1,0,0,0,1,0,0], key: "s42", hashes: [2,5,9], verdict: "possibly-present" },
        "The filter returns possibly present, not a guarantee.", "False positives are possible; false negatives are not.")
    ]);

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
      { id: "l2", label: "[40,50,60]", role: "leaf-page", x: 82, y: 60 }
    ], [
      { from: "root", to: "l0", relation: "keys<20" },
      { from: "root", to: "l1", relation: "20<=keys<40" },
      { from: "root", to: "l2", relation: "keys>=40" },
      { from: "l0", to: "l1", relation: "next-leaf" },
      { from: "l1", to: "l2", relation: "next-leaf" }
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
    storageEntities(["L0 R3","L0 R2","L1 R1","merge heap","L1 output"], "sorted-run"),
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
    storageEntities(["doc0: cat dog","doc1: cat owl","doc2: dog cat","map 0","map 1","map 2","reduce"], "mapreduce-stage"),
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
    storageEntities(["users build","hash buckets","orders probe","joined rows"], "join-stage"),
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
    storageEntities(["customers sorted","orders sorted","left cursor","right cursor","output"], "join-stage"),
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
    storageEntities(["q: distributed search","d1 tf 2,0","d2 tf 1,1","d3 tf 0,2","score"], "term-vector"),
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
    storageEntities(["query term","d1 tf=3 len=100","d2 tf=2 len=300","d3 tf=1 len=80","ranking"], "score-factor"),
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
    storageEntities(["score stream","min-heap root","heap slot 1","heap slot 2","top-3"], "heap-position"),
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

  window.SYSTEM_DESIGN_LESSONS = Object.assign(
    {},
    window.SYSTEM_DESIGN_LESSONS || {},
    lessons
  );
}());
