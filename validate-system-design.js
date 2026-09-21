const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const dataFiles = [
  'system-design-data-1.js',
  'system-design-data-2.js',
  'system-design-data-3.js',
  'system-design-mechanisms.js'
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
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) throw new Error(`Missing required script: ${file}`);
  vm.runInContext(fs.readFileSync(filePath, 'utf8'), context, { filename: file });
}

const registry = new Set(
  context.window.SYSTEM_DESIGN_CHAPTERS.flatMap(chapter =>
    chapter.groups.flatMap(group =>
      group.concepts.map(concept => `${chapter.id}::${concept.name}`)
    )
  )
);
const lessons = context.window.SYSTEM_DESIGN_LESSONS || {};
const mechanisms = context.window.SYSTEM_DESIGN_MECHANISMS || {};
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
    const [id, label, role, x, y] = entity;
    if (ids.has(id)) fail(key, `duplicates entity ID "${id}"`);
    ids.add(id);
    if (genericEntity.test(label.trim())) fail(key, `uses generic entity "${label}"`);
    if (abstractEntity.test(label.trim())) fail(key, `uses action/event "${label}" as an entity`);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 5 || x > 95 || y < 5 || y > 95) {
      fail(key, `entity "${id}" has invalid coordinates`);
    }
  }
  layoutSignatures.add(lesson.entities.map(entity => `${entity[3]},${entity[4]}`).join('|'));

  for (const connection of lesson.connections || []) {
    if (!ids.has(connection[0]) || !ids.has(connection[1])) fail(key, 'has a connection with an unknown endpoint');
    if (!connection[2] || genericConnection.test(connection[2])) fail(key, `uses generic connection label "${connection[2]}"`);
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
}

const customMechanismKeys = new Set([
  'rate-limiting-traffic-management::Token bucket',
  'probabilistic-data-structures::Bloom filter',
  'probabilistic-data-structures::Count-Min Sketch'
]);
const mechanismKeys = new Set([...Object.keys(mechanisms), ...customMechanismKeys]);
const workloadPattern = /\b(client|caller|request|traffic|user|tenant|producer|consumer|reader|writer|application|job|event stream)\b/i;
const servicePattern = /\b(service|api|gateway|router|worker|processor|coordinator|scheduler|controller|engine|pipeline|cluster)\b/i;
const authorityPattern = /\b(authoritative|source of truth|database|store|storage|durable|ledger|registry|catalog|table|index|log|warehouse)\b/i;
const operationsPattern = /\b(control|operator|monitor|metric|alert|builder|rebuild|repair|admin|health|recovery|checkpoint|replicator|cdc|backfill|autoscal|compaction|deployment)\b/i;
const lowLevelPattern = /\b(bit array|counter matrix|hash function|clock register|token ring|fingerprint bucket|register array|skip list node|tree node)\b/i;

for (const key of mechanismKeys) {
  const production = productionContexts[key];
  if (!production) {
    fail(key, 'has a mechanism tab but no explicit production architecture');
    continue;
  }
  productionContextCount += 1;
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

  const mechanismLabels = new Set((mechanisms[key]?.diagram?.components || []).map(component => String(component[1]).trim().toLowerCase()));
  const overlap = architectureLabels.filter(label => mechanismLabels.has(label));
  if (overlap.length > 1) fail(key, `production architecture substantially overlaps mechanism components: ${overlap.join(', ')}`);
}

for (const key of Object.keys(productionContexts)) {
  if (!registry.has(key)) fail(key, 'production context does not match a catalog concept');
  if (!mechanismKeys.has(key)) fail(key, 'production context belongs to a concept without a mechanism tab');
}

for (const { key, concept } of concepts) {
  if (lessons[key]) continue;
  storyboardCount += 1;
  const diagram = concept.diagram;
  if (!diagram) {
    fail(key, 'has neither an authored lesson nor a concrete system diagram');
    continue;
  }
  if (!Array.isArray(diagram.components) || diagram.components.length < 5) {
    fail(key, 'storyboard must contain at least five concrete components');
  } else {
    for (const component of diagram.components) {
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
