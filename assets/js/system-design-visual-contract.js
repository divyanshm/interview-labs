(function (root, factory) {
  const contract = factory();
  if (typeof module === 'object' && module.exports) module.exports = contract;
  if (root) root.SYSTEM_DESIGN_VISUAL_CONTRACT = contract;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const SCHEMA_VERSION = 1;

  function entityFrom(value) {
    if (!Array.isArray(value)) return value;
    const [id, label, description, x, y, z = 2, options = {}] = value;
    return {
      id,
      label,
      description,
      kind: options.kind || 'entity',
      group: options.group || null,
      placement: { x, y, z }
    };
  }

  function relationFrom(value, index) {
    if (!Array.isArray(value)) return value;
    const [from, to, label, options = {}] = value;
    return {
      id: options.id || `relation-${index}`,
      from,
      to,
      label,
      kind: options.kind || 'flow',
      route: options.via ? { via: options.via } : null
    };
  }

  function actionFrom(value) {
    if (!value) return null;
    if (!Array.isArray(value)) return value;
    return { from: value[0], to: value[1], label: value[2] };
  }

  function compileLesson(id, lesson) {
    return {
      schemaVersion: SCHEMA_VERSION,
      id,
      mode: 'lesson',
      primitive: lesson.family,
      scenario: lesson.scenario,
      layout: lesson.layout || { strategy: 'manual', direction: 'free' },
      scene: {
        entities: lesson.entities.map(entityFrom),
        relations: (lesson.connections || []).map(relationFrom)
      },
      frames: lesson.steps.map((step, index) => ({
        id: `step-${index + 1}`,
        title: step.title,
        narration: step.narration,
        action: actionFrom(step.action),
        state: step.states,
        outcome: step.outcome,
        invariant: step.invariant
      }))
    };
  }

  function componentFrom(value) {
    const [id, label, description, kind = 'entity', x, y, z = 2] = value;
    return { id, label, description, kind, group: null, placement: { x, y, z } };
  }

  function compileStoryboard(id, concept) {
    const diagram = concept.diagram;
    const relations = (diagram.links || []).map(relationFrom);
    return {
      schemaVersion: SCHEMA_VERSION,
      id,
      mode: 'storyboard',
      primitive: diagram.kind,
      scenario: concept.summary,
      layout: diagram.layout || { strategy: 'directed', direction: 'left-to-right' },
      scene: {
        entities: diagram.components.map(componentFrom),
        relations
      },
      frames: (diagram.frames || []).map((frame, index) => ({
        id: `step-${index + 1}`,
        title: `Step ${index + 1}`,
        narration: concept.visual?.steps?.[index]?.[2] || concept.summary,
        activeRelation: frame[0] >= 0 ? relations[frame[0]]?.id || null : null,
        action: null,
        state: frame[1],
        outcome: null,
        invariant: null
      }))
    };
  }

  function compileProduction(id, context) {
    const relations = context.flows.map((flow, index) =>
      relationFrom([flow[0], flow[1], flow[2], { id: `flow-${index + 1}` }], index)
    );
    const completed = new Set();
    return {
      schemaVersion: SCHEMA_VERSION,
      id,
      mode: 'production',
      primitive: 'architecture',
      scenario: context.scenario,
      layout: context.layout || { strategy: 'directed', direction: 'left-to-right' },
      scene: {
        entities: context.components.map(componentFrom),
        relations
      },
      frames: context.flows.map((flow, index) => {
        const state = Object.fromEntries(context.components.map(component => [
          component[0],
          component[0] === flow[0] || component[0] === flow[1]
            ? 'active'
            : completed.has(component[0]) ? 'done' : ''
        ]));
        completed.add(flow[0]);
        completed.add(flow[1]);
        return {
          id: `step-${index + 1}`,
          title: flow[2],
          narration: flow[3],
          activeRelation: relations[index].id,
          action: { from: flow[0], to: flow[1], label: flow[2] },
          state,
          outcome: null,
          invariant: null
        };
      })
    };
  }

  function validateDocument(document) {
    const errors = [];
    const entityIds = new Set();
    if (document.schemaVersion !== SCHEMA_VERSION) errors.push('unsupported schema version');
    if (!document.id) errors.push('missing document id');
    if (!document.primitive) errors.push('missing visual primitive');
    for (const entity of document.scene?.entities || []) {
      if (!entity.id || entityIds.has(entity.id)) errors.push(`invalid or duplicate entity "${entity.id}"`);
      entityIds.add(entity.id);
      if (!entity.label || !entity.description || !entity.kind) errors.push(`entity "${entity.id}" is incomplete`);
      const placement = entity.placement;
      if (!placement || !Number.isFinite(placement.x) || !Number.isFinite(placement.y) || !Number.isFinite(placement.z)) {
        errors.push(`entity "${entity.id}" has invalid placement`);
      }
    }
    for (const relation of document.scene?.relations || []) {
      if (!entityIds.has(relation.from) || !entityIds.has(relation.to)) {
        errors.push(`relation "${relation.id}" has an unknown endpoint`);
      }
      if (!relation.label || !relation.kind) errors.push(`relation "${relation.id}" is incomplete`);
    }
    for (const frame of document.frames || []) {
      if (!frame.title || !frame.narration ||
          (document.mode === 'lesson' && (!frame.outcome || !frame.invariant))) {
        errors.push(`frame "${frame.id}" is incomplete`);
      }
      for (const entityId of entityIds) {
        if (document.mode !== 'storyboard' &&
            !Object.prototype.hasOwnProperty.call(frame.state || {}, entityId)) {
          errors.push(`frame "${frame.id}" omits "${entityId}" state`);
        }
      }
    }
    return errors;
  }

  function serializeRegistry(lessons) {
    return Object.fromEntries(
      Object.entries(lessons).map(([id, lesson]) => [id, compileLesson(id, lesson)])
    );
  }

  return {
    SCHEMA_VERSION,
    compileLesson,
    compileStoryboard,
    compileProduction,
    validateDocument,
    serializeRegistry
  };
}));
