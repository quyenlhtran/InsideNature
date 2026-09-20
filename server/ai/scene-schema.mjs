const vector = {
  type: 'array',
  minItems: 3,
  maxItems: 3,
  items: {type: 'number'},
};

export const SCENE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'summary', 'presentation', 'environment', 'camera', 'objects', 'labels'],
  properties: {
    title: {type: 'string'},
    summary: {type: 'string'},
    presentation: {type: 'string', enum: ['cutaway', 'landscape', 'model']},
    environment: {
      type: 'object',
      additionalProperties: false,
      required: ['background', 'ground'],
      properties: {
        background: {type: 'string', pattern: '^#[0-9A-Fa-f]{6}$'},
        ground: {type: 'string', pattern: '^#[0-9A-Fa-f]{6}$'},
      },
    },
    camera: {
      type: 'object',
      additionalProperties: false,
      required: ['position', 'target'],
      properties: {position: vector, target: vector},
    },
    objects: {
      type: 'array',
      minItems: 1,
      maxItems: 36,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'name', 'description', 'shape', 'position', 'scale', 'rotation', 'color', 'opacity', 'animation'],
        properties: {
          id: {type: 'string'},
          name: {type: 'string'},
          description: {type: 'string'},
          shape: {type: 'string', enum: ['box', 'sphere', 'cone', 'half-cone', 'cylinder', 'torus', 'plane', 'stratum', 'root', 'rock']},
          position: vector,
          scale: vector,
          rotation: vector,
          color: {type: 'string', pattern: '^#[0-9A-Fa-f]{6}$'},
          opacity: {type: 'number', minimum: 0.15, maximum: 1},
          animation: {type: 'string', enum: ['none', 'spin', 'float', 'pulse', 'flow']},
        },
      },
    },
    labels: {
      type: 'array',
      maxItems: 16,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'objectId', 'position'],
        properties: {
          text: {type: 'string'},
          objectId: {type: 'string'},
          position: vector,
        },
      },
    },
  },
};

// Gemini structured output supports a JSON Schema subset. Color validity is
// still enforced by validateScene, so omit regex patterns for this provider.
const forGemini = value => {
  if (Array.isArray(value)) return value.map(forGemini);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => key !== 'pattern')
    .map(([key, item]) => [key, forGemini(item)]));
};

export const GEMINI_SCENE_JSON_SCHEMA = forGemini(SCENE_JSON_SCHEMA);
