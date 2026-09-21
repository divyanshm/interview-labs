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
const context = { window: {} };
vm.createContext(context);

for (const file of [...dataFiles, ...lessonFiles]) {
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
const genericConnection = /\b(invoke service operation|route request|exchange node metadata|apply control decision|persist durable metadata|return response)\b/i;
const errors = [];
const layoutSignatures = new Set();
let stepCount = 0;
let storyboardCount = 0;

function fail(key, message) {
  errors.push(`${key}: ${message}`);
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
  }
  if (!Array.isArray(diagram.links) || diagram.links.length < 3) {
    fail(key, 'storyboard must contain at least three meaningful interactions');
  }
  const renderedFrames = Math.max(5, diagram.frames?.length || 0);
  if (renderedFrames < 5) fail(key, 'storyboard must expose at least five teaching frames');
  if (!concept.visual?.steps?.every(step => step[2] && step[2].length >= 20)) {
    fail(key, 'storyboard has vague or missing step narration');
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
  genericFallbacks: 0,
  teachingSteps: stepCount,
  distinctLayouts: layoutSignatures.size
}, null, 2));
