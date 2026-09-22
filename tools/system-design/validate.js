const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const sourceRoot = path.join(root, 'source', 'system-design');
const dataFiles = [
  'system-design-data-1.js',
  'system-design-data-2.js',
  'system-design-data-3.js'
];
const lessonFiles = [
  'system-design-lessons-transactions.js',
  'system-design-lessons-distributed.js',
  'system-design-lessons-data.js',
  'system-design-lessons-platform.js'
];
const productionContextFiles = [
  'system-design-production-contexts-core.js',
  'system-design-production-contexts-data.js',
  'system-design-production-contexts-platform.js',
  'system-design-production-contexts-compute.js',
  'system-design-production-contexts-advanced.js'
];
const context = { window: {} };
vm.createContext(context);

for (const file of [...dataFiles, ...productionContextFiles, ...lessonFiles]) {
  const filePath = path.join(sourceRoot, file);
  if (!fs.existsSync(filePath)) throw new Error(`Missing required script: ${file}`);
  vm.runInContext(fs.readFileSync(filePath, 'utf8'), context, { filename: file });
}

const rendererSource = fs.readFileSync(path.join(root, 'assets', 'js', 'system-design.js'), 'utf8');
const visualContract = require(path.join(root, 'assets', 'js', 'system-design-visual-contract.js'));
const portableModels = JSON.parse(
  fs.readFileSync(path.join(root, 'artifacts', 'system-design-visual-models.json'), 'utf8')
);
const catalogContext = { window: {} };
vm.createContext(catalogContext);
vm.runInContext(
  fs.readFileSync(path.join(root, 'assets', 'js', 'system-design-catalog.js'), 'utf8'),
  catalogContext,
  { filename: 'system-design-catalog.js' }
);

const registry = new Set(
  context.window.SYSTEM_DESIGN_CHAPTERS.flatMap(chapter =>
    chapter.groups.flatMap(group =>
      group.concepts.map(concept => `${chapter.id}::${concept.name}`)
    )
  )
);
const lessons = context.window.SYSTEM_DESIGN_LESSONS || {};
const productionContexts = context.window.SYSTEM_DESIGN_PRODUCTION_CONTEXTS || {};
const concepts = context.window.SYSTEM_DESIGN_CHAPTERS.flatMap(chapter =>
  chapter.groups.flatMap(group =>
    group.concepts.map(concept => ({ key: `${chapter.id}::${concept.name}`, concept }))
  )
);
const allowedFamilies = new Set([
  'workflow', 'sequence', 'transaction', 'storage', 'replicas', 'consensus',
  'topology', 'cache', 'log', 'capacity', 'timeline', 'bits', 'counters',
  'tree', 'stream', 'mapreduce', 'search', 'graph', 'gateway', 'identity',
  'trust', 'trace', 'migration', 'dedup', 'connection', 'cells', 'shard-merge'
]);
const genericEntity = /^(service [a-z]|component|processor|state transition)$/i;
const abstractEntity = /^(failover|failure|recovery|retry|retries|rebalance|rebalancing|replication|commit|abort|election|decision|detection|validation|cutover|migration|merge|rebuild|rollback|compensation|admission|rejection|refresh|invalidation|handoff|repair|resolution|conflict|shuffle|compaction|checkpoint|timeout|cancellation|fallback|degradation|mitigation)$/i;
const transientArchitectureNode = /\b(request|response|timestamp|outcome|attempt|ack|acknowledgement|signal|plan|result|record|phase|cursor|event|command|mutation|operation|effect|estimate|deadline|traffic|failure|success|commit|retry|replay|proposal|message|batch|input|output)$/i;
const genericConnection = /\b(invoke service operation|route request|exchange node metadata|apply control decision|persist durable metadata|return response)\b/i;
const errors = [];
const layoutSignatures = new Set();
const graphTopologySignatures = new Map();
let stepCount = 0;
let storyboardCount = 0;
let productionContextCount = 0;

function fail(key, message) {
  errors.push(`${key}: ${message}`);
}

if (rendererSource.includes('SYSTEM_DESIGN_MECHANISMS') ||
    /kind\s*===?\s*['"]mechanism['"]/.test(rendererSource)) {
  fail('system-design.js', 'must not render the generic four-card mechanism fallback');
}

if (portableModels.schemaVersion !== visualContract.SCHEMA_VERSION) {
  fail('system-design-visual-models.json', 'uses an unsupported schema version');
}
if (Object.keys(portableModels.concepts || {}).length !== registry.size) {
  fail('system-design-visual-models.json', 'does not contain every catalog concept');
}
const deliveryConcepts = catalogContext.window.SYSTEM_DESIGN_CHAPTERS.flatMap(chapter =>
  chapter.groups.flatMap(group =>
    group.concepts.map(concept => ({ key: `${chapter.id}::${concept.name}`, concept }))
  )
);
if (deliveryConcepts.length !== registry.size) {
  fail('system-design-catalog.js', 'does not contain every catalog concept');
}
const sourceConcepts = new Map(concepts.map(item => [item.key, item.concept]));
for (const { key, concept } of deliveryConcepts) {
  const source = sourceConcepts.get(key);
  if (!source) {
    fail(key, 'lazy catalog invents an unknown concept');
    continue;
  }
  if (!concept.visualPath || concept.diagram || concept.visual) {
    fail(key, 'lazy catalog must contain a shard path but no eager visual payload');
    continue;
  }
  const shardPath = path.resolve(root, 'tracks', concept.visualPath);
  if (!fs.existsSync(shardPath)) {
    fail(key, `visual shard is missing at ${concept.visualPath}`);
    continue;
  }
  const shard = JSON.parse(fs.readFileSync(shardPath, 'utf8'));
  if (shard.id !== key) fail(key, 'visual shard has the wrong identity');
  if (JSON.stringify(shard.diagram) !== JSON.stringify(source.diagram) ||
      JSON.stringify(shard.visual) !== JSON.stringify(source.visual || null) ||
      JSON.stringify(shard.lesson) !== JSON.stringify(lessons[key] || null) ||
      JSON.stringify(shard.production) !== JSON.stringify(productionContexts[key] || null)) {
    fail(key, 'visual shard differs from its authoritative source data');
  }
}
const htmlSource = fs.readFileSync(path.join(root, 'tracks', 'system-design.html'), 'utf8');
for (const sourceFile of [...dataFiles, ...productionContextFiles, ...lessonFiles]) {
  if (htmlSource.includes(`src="${sourceFile}"`)) {
    fail('system-design.html', `eagerly loads ${sourceFile} instead of a visual shard`);
  }
}
for (const { key, concept } of concepts) {
  const portable = portableModels.concepts?.[key];
  if (!portable) {
    fail(key, 'is missing from the portable visual export');
    continue;
  }
  if (portable.title !== concept.name ||
      portable.summary !== concept.summary ||
      portable.tradeoff !== concept.tradeoff) {
    fail(key, 'portable visual export changes catalog teaching copy');
  }
  visualContract.validateDocument(portable.mechanism)
    .forEach(message => fail(key, `exported mechanism: ${message}`));
  const expectedProduction = Boolean(productionContexts[key]);
  if (Boolean(portable.production) !== expectedProduction) {
    fail(key, 'portable visual export loses or invents a production view');
  } else if (portable.production) {
    visualContract.validateDocument(portable.production)
      .forEach(message => fail(key, `exported production view: ${message}`));
  }
}

function isTransientArchitectureNode(label, type) {
  const value = String(label).trim();
  if (!transientArchitectureNode.test(value)) return false;
  const durableTypes = new Set(['database', 'storage', 'index', 'cache', 'queue']);
  if (durableTypes.has(type) && /\b(record|state|checkpoint|offset|log|table|index|queue|store|ledger|journal)\b/i.test(value)) {
    return false;
  }
  if (type === 'clock' && /\b(timestamp|deadline|window|interval|boundary)\b/i.test(value)) return false;
  return true;
}

function isSyntheticConceptNode(component) {
  const [id,, role] = component;
  if (id === 'concept') return true;
  if (/\bconcept-specific\b/i.test(String(role))) return true;
  return false;
}

for (const [key, lesson] of Object.entries(lessons)) {
  if (!registry.has(key)) fail(key, 'does not match a catalog concept');
  if (!allowedFamilies.has(lesson.family)) fail(key, `unknown family "${lesson.family}"`);
  if (!lesson.scenario || lesson.scenario.length < 20) fail(key, 'scenario is too vague');
  if (!Array.isArray(lesson.entities) || lesson.entities.length < 4 || lesson.entities.length > 9) {
    fail(key, 'must contain 4-9 concrete entities');
    continue;
  }

  if (!Array.isArray(lesson.steps) || lesson.steps.length < 5 || lesson.steps.length > 8) {
    fail(key, 'must contain 5-8 teaching steps');
    continue;
  }

  const ids = new Set();
  for (const entity of lesson.entities) {
    if (!Array.isArray(entity) || entity.length < 5) {
      fail(key, 'has an invalid entity');
      continue;
    }
    const [id, label, role, x, y, z = 2] = entity;
    if (ids.has(id)) fail(key, `duplicates entity ID "${id}"`);
    ids.add(id);
    if (genericEntity.test(label.trim())) fail(key, `uses generic entity "${label}"`);
    if (abstractEntity.test(label.trim())) fail(key, `uses action/event "${label}" as an entity`);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 5 || x > 95 || y < 5 || y > 95) {
      fail(key, `entity "${id}" has invalid coordinates`);
    }
    if (!Number.isFinite(z) || z < 0 || z > 20) fail(key, `entity "${id}" has invalid z-order`);
  }
  layoutSignatures.add(lesson.entities.map(entity => `${entity[3]},${entity[4]}`).join('|'));

  for (const connection of lesson.connections || []) {
    if (!ids.has(connection[0]) || !ids.has(connection[1])) fail(key, 'has a connection with an unknown endpoint');
    if (!connection[2] || genericConnection.test(connection[2])) fail(key, `uses generic connection label "${connection[2]}"`);
    const via=connection[3]?.via;
    if (via && (!Array.isArray(via) || via.some(point =>
      !Array.isArray(point) || point.length !== 2 ||
      !Number.isFinite(point[0]) || !Number.isFinite(point[1]) ||
      point[0] < 0 || point[0] > 100 || point[1] < 0 || point[1] > 100
    ))) fail(key, 'has invalid connection waypoints');
  }

  lesson.steps.forEach((step, index) => {
    stepCount += 1;
    if (!step.title || !step.narration || !step.outcome || !step.invariant) {
      fail(key, `step ${index + 1} is missing teaching copy`);
    }
    if (step.action && (!ids.has(step.action[0]) || !ids.has(step.action[1]) || !step.action[2])) {
      fail(key, `step ${index + 1} has an invalid action`);
    }
    if (!step.states || typeof step.states !== 'object') {
      fail(key, `step ${index + 1} has no state snapshot`);
      return;
    }
    for (const id of ids) {
      if (!step.states[id]) fail(key, `step ${index + 1} omits state for "${id}"`);
    }
    if (index === 0) return;
    const previous = lesson.steps[index - 1].states || {};
    const changed = [...ids].some(id => {
      const before = previous[id] || {};
      const after = step.states[id] || {};
      const fields = new Set([...Object.keys(before), ...Object.keys(after)]);
      return [...fields].some(field => String(before[field]) !== String(after[field]));
    });
    if (!changed) fail(key, `step ${index + 1} changes highlighting but no system state`);
  });

  const document = visualContract.compileLesson(key, lesson);
  visualContract.validateDocument(document).forEach(message => fail(key, `portable visual contract: ${message}`));
  if (document.scene.entities.length !== lesson.entities.length ||
      document.scene.relations.length !== (lesson.connections || []).length ||
      document.frames.length !== lesson.steps.length) {
    fail(key, 'portable visual contract loses lesson entities, relations, or frames');
  }
  lesson.steps.forEach((step, index) => {
    if (JSON.stringify(document.frames[index].state) !== JSON.stringify(step.states)) {
      fail(key, `portable visual contract changes step ${index + 1} state`);
    }
  });
}

const authoredMechanismChapters = new Set([
  'probabilistic-data-structures',
  'storage-systems'
]);
for (const { key } of concepts) {
  const chapterId = key.split('::')[0];
  if (authoredMechanismChapters.has(chapterId) && !lessons[key]) {
    fail(key, 'must use an authored data-structure visualization instead of the generic mechanism renderer');
  }
}

const customMechanismKeys = new Set([
  'rate-limiting-traffic-management::Token bucket',
  'probabilistic-data-structures::Bloom filter',
  'probabilistic-data-structures::Count-Min Sketch',
  'storage-systems::B-trees'
]);
const mechanismKeys = new Set(Object.keys(productionContexts));
const workloadPattern = /\b(client|caller|request|traffic|user|tenant|producer|consumer|reader|writer|application|job|event stream)\b/i;
const servicePattern = /\b(service|api|gateway|router|worker|processor|coordinator|scheduler|controller|engine|pipeline|cluster)\b/i;
const authorityPattern = /\b(authoritative|source of truth|database|store|storage|durable|ledger|registry|catalog|table|index|log|warehouse)\b/i;
const operationsPattern = /\b(control|operator|monitor|metric|alert|builder|rebuild|repair|admin|health|recovery|checkpoint|replicator|cdc|backfill|autoscal|compaction|deployment)\b/i;
const lowLevelPattern = /\b(bit array|counter matrix|hash function|clock register|token ring|fingerprint bucket|register array|skip list node|tree node)\b/i;

for (const key of mechanismKeys) {
  const production = productionContexts[key];
  if (!lessons[key] && !customMechanismKeys.has(key)) {
    fail(key, 'has production architecture but no authored or custom mechanism visualization');
  }
  productionContextCount += 1;
  const productionDocument = visualContract.compileProduction(key, production);
  visualContract.validateDocument(productionDocument)
    .forEach(message => fail(key, `portable production contract: ${message}`));
  if (productionDocument.scene.entities.length !== production.components.length ||
      productionDocument.scene.relations.length !== production.flows.length ||
      productionDocument.frames.length !== production.flows.length) {
    fail(key, 'portable visual contract loses production components, flows, or frames');
  }
  if (!production.scenario || production.scenario.length < 30) fail(key, 'production scenario is too vague');
  if (!Array.isArray(production.components) || production.components.length < 5 || production.components.length > 8) {
    fail(key, 'production architecture must contain 5-8 concrete components');
    continue;
  }
  if (!Array.isArray(production.flows) || production.flows.length < 5 || production.flows.length > 8) {
    fail(key, 'production architecture must contain 5-8 meaningful flows');
    continue;
  }

  const componentIds = new Set();
  const architectureLabels = [];
  for (const component of production.components) {
    if (!Array.isArray(component) || component.length < 6) {
      fail(key, 'has a malformed production component');
      continue;
    }
    const [id, label, role,, x, y] = component;
    if (componentIds.has(id)) fail(key, `duplicates production component ID "${id}"`);
    componentIds.add(id);
    architectureLabels.push(String(label).trim().toLowerCase());
    if (!label || !role || genericEntity.test(String(label).trim())) fail(key, `uses a generic production component "${label}"`);
    if (abstractEntity.test(String(label).trim())) fail(key, `uses action/event "${label}" as a production component`);
    if (isTransientArchitectureNode(label, component[3])) fail(key, `uses transient artifact "${label}" as a production component`);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 5 || x > 95 || y < 5 || y > 95) {
      fail(key, `production component "${id}" has invalid coordinates`);
    }
  }

  for (const [index, flow] of production.flows.entries()) {
    if (!Array.isArray(flow) || flow.length < 4) {
      fail(key, `production flow ${index + 1} is malformed`);
      continue;
    }
    if (!componentIds.has(flow[0]) || !componentIds.has(flow[1])) fail(key, `production flow ${index + 1} has an unknown endpoint`);
    if (!flow[2] || genericConnection.test(flow[2])) fail(key, `production flow ${index + 1} uses a generic label`);
    if (!flow[3] || flow[3].length < 20) fail(key, `production flow ${index + 1} has vague narration`);
  }

  const productionText = production.components.map(component => component.slice(1, 4).join(' ')).join(' ');
  if (!workloadPattern.test(productionText)) fail(key, 'production architecture has no workload or caller');
  if (!servicePattern.test(productionText)) fail(key, 'production architecture has no service boundary');
  if (!authorityPattern.test(productionText)) fail(key, 'production architecture has no authoritative dependency or durable state');
  if (!operationsPattern.test(productionText)) fail(key, 'production architecture has no operational, update, or recovery path');
  const lowLevelCount = production.components.filter(component => lowLevelPattern.test(component.slice(1, 4).join(' '))).length;
  if (lowLevelCount > 1) fail(key, 'production architecture repeats low-level mechanism internals');

}

for (const key of Object.keys(productionContexts)) {
  if (!registry.has(key)) fail(key, 'production context does not match a catalog concept');
}

for (const { key, concept } of concepts) {
  if (lessons[key]) continue;
  storyboardCount += 1;
  const diagram = concept.diagram;
  if (!diagram) {
    fail(key, 'has neither an authored lesson nor a concrete system diagram');
    continue;
  }
  const storyboardDocument = visualContract.compileStoryboard(key, concept);
  visualContract.validateDocument(storyboardDocument)
    .forEach(message => fail(key, `portable storyboard contract: ${message}`));
  if (storyboardDocument.scene.entities.length !== diagram.components.length ||
      storyboardDocument.scene.relations.length !== diagram.links.length ||
      storyboardDocument.frames.length !== diagram.frames.length) {
    fail(key, 'portable visual contract loses storyboard components, links, or frames');
  }
  if (!Array.isArray(diagram.components) || diagram.components.length < 5) {
    fail(key, 'storyboard must contain at least five concrete components');
  } else {
    for (const component of diagram.components) {
      if (isSyntheticConceptNode(component)) {
        fail(key, `uses synthetic concept node "${component[1]}" instead of a deployable component`);
      }
      if (abstractEntity.test(String(component[1]).trim())) fail(key, `uses action/event "${component[1]}" as a storyboard component`);
      if (['architecture', 'topology', 'sequence'].includes(diagram.kind) && isTransientArchitectureNode(component[1], component[3])) {
        fail(key, `uses transient artifact "${component[1]}" as a storyboard component`);
      }
    }
  }
  if (!Array.isArray(diagram.links) || diagram.links.length < 3) {
    fail(key, 'storyboard must contain at least three meaningful interactions');
  }
  if (['architecture', 'topology', 'sequence'].includes(diagram.kind) &&
      Array.isArray(diagram.components) &&
      Array.isArray(diagram.links)) {
    const componentIndexes = new Map(diagram.components.map((component, index) => [component[0], index]));
    const edgeSignature = diagram.links
      .map(link => `${componentIndexes.get(link[0])}>${componentIndexes.get(link[1])}`)
      .sort()
      .join(',');
    const signature = `${diagram.kind}:${diagram.components.length}:${edgeSignature}`;
    const matchingConcepts = graphTopologySignatures.get(signature) || new Set();
    matchingConcepts.add(key);
    graphTopologySignatures.set(signature, matchingConcepts);
  }
  const renderedFrames = Math.max(5, diagram.frames?.length || 0);
  if (renderedFrames < 5) fail(key, 'storyboard must expose at least five teaching frames');
  if (!concept.visual?.steps?.every(step => step[2] && step[2].length >= 20)) {
    fail(key, 'storyboard has vague or missing step narration');
  }

}

for (const matchingConceptSet of graphTopologySignatures.values()) {
  const matchingConcepts = [...matchingConceptSet];
  if (matchingConcepts.length > 6) {
    errors.push(
      `Repeated graph template is used by ${matchingConcepts.length} concepts: ` +
      matchingConcepts.slice(0, 8).join(', ')
    );
  }
}

if (Object.keys(lessons).length < 75) errors.push(`Expected at least 75 authored lessons; found ${Object.keys(lessons).length}`);
if (layoutSignatures.size < 12) errors.push(`Expected at least 12 distinct layouts; found ${layoutSignatures.size}`);

if (errors.length) {
  console.error(errors.slice(0, 200).join('\n'));
  console.error(`\n${errors.length} visual quality error(s)`);
  process.exit(1);
}

console.log(JSON.stringify({
  catalogConcepts: registry.size,
  authoredLessons: Object.keys(lessons).length,
  architectureStoryboards: storyboardCount,
  productionArchitectures: productionContextCount,
  genericFallbacks: 0,
  teachingSteps: stepCount,
  distinctLayouts: layoutSignatures.size
}, null, 2));
