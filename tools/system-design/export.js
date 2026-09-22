'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..', '..');
const sourceRoot = path.join(root, 'source', 'system-design');
const contract = require(path.join(root, 'assets', 'js', 'system-design-visual-contract.js'));

const sourceFiles = [
  'system-design-data-1.js',
  'system-design-data-2.js',
  'system-design-data-3.js',
  'system-design-production-contexts-core.js',
  'system-design-production-contexts-data.js',
  'system-design-production-contexts-platform.js',
  'system-design-production-contexts-compute.js',
  'system-design-production-contexts-advanced.js',
  'system-design-lessons-transactions.js',
  'system-design-lessons-distributed.js',
  'system-design-lessons-data.js',
  'system-design-lessons-platform.js'
];
const context = { window: {} };
vm.createContext(context);
for (const file of sourceFiles) {
  vm.runInContext(fs.readFileSync(path.join(sourceRoot, file), 'utf8'), context, { filename: file });
}

const lessons = context.window.SYSTEM_DESIGN_LESSONS || {};
const productionContexts = context.window.SYSTEM_DESIGN_PRODUCTION_CONTEXTS || {};
const concepts = {};
const shardRoot = path.join(root, 'assets', 'data', 'system-design-visuals');
fs.mkdirSync(shardRoot, { recursive: true });
for (const file of fs.readdirSync(shardRoot)) {
  if (file.endsWith('.json')) fs.unlinkSync(path.join(shardRoot, file));
}

for (const chapter of context.window.SYSTEM_DESIGN_CHAPTERS) {
  for (const group of chapter.groups) {
    for (const concept of group.concepts) {
      const id = `${chapter.id}::${concept.name}`;
      const shardName = `${crypto.createHash('sha1').update(id).digest('hex').slice(0, 16)}.json`;
      const shard = {
        id,
        diagram: concept.diagram,
        visual: concept.visual || null,
        lesson: lessons[id] || null,
        production: productionContexts[id] || null
      };
      fs.writeFileSync(path.join(shardRoot, shardName), `${JSON.stringify(shard)}\n`);
      concept.visualPath = `../assets/data/system-design-visuals/${shardName}`;
      concepts[id] = {
        id,
        chapter: { id: chapter.id, title: chapter.title },
        group: group.title,
        title: concept.name,
        summary: concept.summary,
        tradeoff: concept.tradeoff,
        mechanism: lessons[id]
          ? contract.compileLesson(id, lessons[id])
          : contract.compileStoryboard(id, concept),
        production: productionContexts[id]
          ? contract.compileProduction(id, productionContexts[id])
          : null
      };
    }
  }
}

const catalog = context.window.SYSTEM_DESIGN_CHAPTERS.map(chapter => ({
  ...chapter,
  groups: chapter.groups.map(group => ({
    ...group,
    concepts: group.concepts.map(({ diagram, visual, ...concept }) => concept)
  }))
}));
fs.writeFileSync(
  path.join(root, 'assets', 'js', 'system-design-catalog.js'),
  `window.SYSTEM_DESIGN_CHAPTERS=${JSON.stringify(catalog)};\n`
);

const output = {
  schemaVersion: contract.SCHEMA_VERSION,
  concepts
};
fs.writeFileSync(
  path.join(root, 'artifacts', 'system-design-visual-models.json'),
  `${JSON.stringify(output)}\n`
);
console.log(`Exported ${Object.keys(concepts).length} portable models and lazy visual shards.`);
