import {readJson, sendJson} from '../http.mjs';
import {
  NEMOTRON_VISUAL_PLANNER_SYSTEM_PROMPT,
  SCENE_SYSTEM_PROMPT,
  buildSceneAnalysisPrompt,
  buildSceneFromAnalysisPrompt,
} from './prompts.mjs';

const SHAPES = new Set(['box', 'sphere', 'cone', 'half-cone', 'cylinder', 'torus', 'plane', 'stratum', 'root', 'rock']);
const PRESENTATIONS = new Set(['cutaway', 'landscape', 'model']);
const ANIMATIONS = new Set(['none', 'spin', 'float', 'pulse', 'flow']);
const colorPattern = /^#[0-9a-f]{6}$/i;

const numberIn = (value, min, max, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};
const vector = (value, min, max, fallback) => Array.from({length: 3}, (_, index) =>
  numberIn(Array.isArray(value) ? value[index] : undefined, min, max, fallback[index]));
const text = (value, max, fallback = '') => String(value || fallback).trim().slice(0, max);
const color = (value, fallback) => colorPattern.test(String(value)) ? String(value) : fallback;

function parseJson(content) {
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Scene compiler returned invalid JSON');
  return JSON.parse(content.slice(start, end + 1));
}

function chooseRenderStrategy(analysis) {
  const declared = String(analysis).match(/RENDER_STRATEGY\s*:\s*(cutaway|landscape|labeled-model)/i)?.[1]?.toLowerCase();
  if (declared) return declared;
  if (/cross[- ]?section|cutaway|internal|inside|layer|chamber|vent/i.test(analysis)) return 'cutaway';
  if (/ecosystem|habitat|landscape|forest|ocean|river|pond|mountain|environment/i.test(analysis)) return 'landscape';
  return 'labeled-model';
}

function validateScene(input, defaultPresentation = 'landscape') {
  const ids = new Set();
  const objects = (Array.isArray(input.objects) ? input.objects : []).slice(0, 36).map((item, index) => {
    let id = text(item?.id, 48, `object-${index + 1}`).replace(/[^a-z0-9_-]/gi, '-');
    while (ids.has(id)) id = `${id}-${index + 1}`;
    ids.add(id);
    return {
      id,
      name: text(item?.name, 60, `Scene object ${index + 1}`),
      description: text(item?.description, 180, 'Explore this part of the scene.'),
      shape: SHAPES.has(item?.shape) ? item.shape : 'box',
      position: vector(item?.position, -15, 15, [0, 0, 0]),
      scale: vector(item?.scale, 0.1, 15, [1, 1, 1]),
      rotation: vector(item?.rotation, -6.29, 6.29, [0, 0, 0]),
      color: color(item?.color, '#72a98f'),
      opacity: numberIn(item?.opacity, 0.15, 1, 1),
      animation: ANIMATIONS.has(item?.animation) ? item.animation : 'none',
    };
  });
  if (!objects.length) throw new Error('Vision model returned an empty scene');

  const labels = (Array.isArray(input.labels) ? input.labels : []).slice(0, 16)
    .filter(label => ids.has(String(label?.objectId)))
    .map(label => ({
      text: text(label.text, 48, 'Explore'),
      objectId: String(label.objectId),
      position: vector(label.position, -15, 15, [0, 0, 0]),
    }));

  return {
    title: text(input.title, 80, 'My 3D Discovery'),
    summary: text(input.summary, 240, 'Explore the scene and select its parts to learn more.'),
    presentation: PRESENTATIONS.has(input.presentation) ? input.presentation : defaultPresentation,
    environment: {
      background: color(input.environment?.background, '#9fd5e1'),
      ground: color(input.environment?.ground, '#426b4c'),
    },
    camera: {
      position: vector(input.camera?.position, -25, 25, [0, 7, 18]),
      target: vector(input.camera?.target, -15, 15, [0, 3, 0]),
    },
    objects,
    labels,
  };
}

function fallbackScene(filename, analysis = '') {
  const soil = /soil|horizon|earth|ground|strata|bedrock|subsoil/i.test(`${filename} ${analysis}`);
  if (soil) return validateScene({
    title: 'Explore the Soil Beneath Us',
    summary: 'Separate the layers, walk around the soil profile, and select each horizon to discover how soil changes with depth.',
    presentation: 'cutaway',
    environment: {background: '#c9e5e2', ground: '#58634a'},
    camera: {position: [0, 5, 19], target: [0, 2, 0]},
    objects: [
      {id: 'organic', name: 'O Horizon', description: 'Fresh leaves and other once-living material begin breaking down at the surface.', shape: 'stratum', position: [0, 5.1, 0], scale: [11, 0.55, 7], color: '#302219'},
      {id: 'topsoil', name: 'A Horizon', description: 'Dark topsoil mixes minerals with humus and supports many roots and soil animals.', shape: 'stratum', position: [0, 4.25, 0], scale: [11, 1.15, 7], color: '#5b3025'},
      {id: 'eluviation', name: 'E Horizon', description: 'Water carries some clay and minerals out of this lighter-colored layer.', shape: 'stratum', position: [0, 3.3, 0], scale: [11, 0.75, 7], color: '#c59277'},
      {id: 'subsoil', name: 'Bt Horizon', description: 'Clay and iron carried from above collect in this reddish subsoil.', shape: 'stratum', position: [0, 2.05, 0], scale: [11, 1.7, 7], color: '#8f4332'},
      {id: 'parent', name: 'C Horizon', description: 'Weathered pieces of parent rock slowly provide minerals for the soil above.', shape: 'stratum', position: [0, 0.35, 0], scale: [11, 1.8, 7], color: '#a98765'},
      {id: 'bedrock', name: 'R Horizon', description: 'Solid bedrock lies below the developing soil horizons.', shape: 'stratum', position: [0, -1.25, 0], scale: [11, 1.4, 7], color: '#595765'},
      {id: 'root-one', name: 'Deep root', description: 'Roots hold soil in place and carry water and minerals up to plants.', shape: 'root', position: [-2.3, 4.1, 0.4], scale: [0.22, 3.1, 0.22], rotation: [0, 0, -0.28], color: '#d4b38b'},
      {id: 'root-two', name: 'Branching root', description: 'Fine roots spread through topsoil where water and nutrients are easier to find.', shape: 'root', position: [1.6, 4.25, 0.7], scale: [0.18, 2.6, 0.18], rotation: [0, 0, 0.38], color: '#d4b38b'},
      {id: 'rock-one', name: 'Weathered rock', description: 'Rock fragments break into smaller pieces through weathering.', shape: 'rock', position: [-2.8, 0.35, 0.6], scale: [0.55, 0.38, 0.5], rotation: [0.2, 0.4, 0], color: '#77706c'},
      {id: 'rock-two', name: 'Weathered rock', description: 'These fragments are part of the material from which soil develops.', shape: 'rock', position: [2.1, 0.1, 0.8], scale: [0.7, 0.45, 0.55], rotation: [0.1, 0.8, 0.2], color: '#817970'},
    ],
    labels: [
      {text: 'O · organic', objectId: 'organic', position: [6.5, 5.1, 0]},
      {text: 'A · topsoil', objectId: 'topsoil', position: [6.5, 4.25, 0]},
      {text: 'E · leached layer', objectId: 'eluviation', position: [6.5, 3.3, 0]},
      {text: 'Bt · subsoil', objectId: 'subsoil', position: [6.5, 2.05, 0]},
      {text: 'C · parent material', objectId: 'parent', position: [6.5, 0.35, 0]},
      {text: 'R · bedrock', objectId: 'bedrock', position: [6.5, -1.25, 0]},
    ],
  }, 'cutaway');
  const volcano = /volcano|eruption|magma|lava/i.test(filename);
  if (volcano) return validateScene({
    title: 'Inside a Volcano',
    summary: 'Explore how magma travels from deep underground and erupts as lava.',
    presentation: 'cutaway',
    environment: {background: '#bfe4ee', ground: '#6b332b'},
    camera: {position: [0, 7, 18], target: [0, 3, 0]},
    objects: [
      {id: 'mountain', name: 'Volcano', description: 'Layers of rock build the volcano over many eruptions.', shape: 'half-cone', position: [0, 2.7, -0.6], scale: [10, 6, 6], rotation: [0, 1.57, 0], color: '#67686c'},
      {id: 'magma', name: 'Magma chamber', description: 'A pool of melted rock collects below the volcano.', shape: 'sphere', position: [0, -0.4, 0], scale: [3.2, 1.5, 2.1], color: '#ffb000', animation: 'pulse'},
      {id: 'vent', name: 'Main vent', description: 'Magma rises through this passage toward the crater.', shape: 'cylinder', position: [0, 3, 0], scale: [0.65, 7, 0.65], color: '#ff7a00', animation: 'flow'},
      {id: 'crater', name: 'Crater', description: 'The crater is the opening at the top of the volcano.', shape: 'torus', position: [0, 6.1, 0], scale: [2, 2, 0.7], rotation: [1.57, 0, 0], color: '#332c2b'},
      {id: 'lava', name: 'Flowing lava', description: 'Magma is called lava after it reaches the surface.', shape: 'cylinder', position: [2.4, 4.2, 0.7], scale: [0.35, 4.5, 0.35], rotation: [0, 0, -0.75], color: '#ff4b00', animation: 'flow'},
    ],
    labels: [
      {text: 'Crater', objectId: 'crater', position: [0, 7.6, 0]},
      {text: 'Main vent', objectId: 'vent', position: [0.9, 3.4, 0]},
      {text: 'Magma chamber', objectId: 'magma', position: [0, -2.2, 0]},
      {text: 'Flowing lava', objectId: 'lava', position: [4.2, 4.8, 0]},
    ],
  }, 'cutaway');
  return validateScene({
    title: 'My Nature Scene',
    summary: 'This starter scene appears when image analysis is unavailable. Try exploring each object.',
    environment: {background: '#9fd8e4', ground: '#4c7c55'},
    objects: [
      {id: 'hill', name: 'Hill', description: 'Hills shape how water and animals move across the land.', shape: 'sphere', position: [0, 0, 0], scale: [10, 2.5, 7], color: '#5f965f'},
      {id: 'water', name: 'Pond', description: 'Fresh water gives plants and animals a place to drink and live.', shape: 'cylinder', position: [0, 1.2, 1], scale: [4, 0.15, 4], color: '#4ea9c4', opacity: 0.8},
      {id: 'sun', name: 'Sun', description: 'Sunlight provides energy for plants to grow.', shape: 'sphere', position: [-7, 9, -5], scale: [1.5, 1.5, 1.5], color: '#ffd45c', animation: 'pulse'},
    ],
    labels: [{text: 'Freshwater pond', objectId: 'water', position: [0, 2, 1]}],
  });
}

export function createSceneHandler({apiKey, nemotronModel, textModel}) {
  return async function handleScene(req, res) {
    let filename = 'uploaded image';
    let analysis = '';
    try {
      const body = await readJson(req, 6_500_000);
      const image = String(body.image || '');
      filename = text(body.filename, 120, 'uploaded image');
      if (!/^data:image\/(png|jpeg);base64,/i.test(image)) {
        return sendJson(res, 400, {error: 'Upload a PNG or JPEG image'});
      }
      if (!apiKey) return sendJson(res, 200, {source: 'fallback', scene: fallbackScene(filename)});

      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json'},
        body: JSON.stringify({
          model: nemotronModel,
          messages: [
            {role: 'system', content: NEMOTRON_VISUAL_PLANNER_SYSTEM_PROMPT},
            {role: 'user', content: [
              {type: 'text', text: buildSceneAnalysisPrompt(filename)},
              {type: 'image_url', image_url: {url: image}},
            ]},
          ],
          temperature: 0.2,
        }),
      });
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 300);
        throw new Error(`NVIDIA Nemotron API returned ${response.status}: ${detail}`);
      }
      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) throw new Error('Nemotron returned no visual plan');
      analysis = content;

      const renderStrategy = chooseRenderStrategy(content);
      const conversion = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json'},
        body: JSON.stringify({
          model: textModel,
          messages: [
            {role: 'system', content: SCENE_SYSTEM_PROMPT},
            {role: 'user', content: buildSceneFromAnalysisPrompt(filename, content, renderStrategy)},
          ],
          temperature: 0.1,
          reasoning_effort: 'low',
          response_format: {type: 'json_object'},
        }),
      });
      if (!conversion.ok) {
        const detail = (await conversion.text()).slice(0, 300);
        throw new Error(`NVIDIA scene compiler returned ${conversion.status}: ${detail}`);
      }
      const conversionData = await conversion.json();
      const converted = conversionData?.choices?.[0]?.message?.content;
      if (typeof converted !== 'string' || !converted.trim()) throw new Error('Scene compiler returned no JSON');
      const scene = validateScene(parseJson(converted), renderStrategy === 'cutaway' ? 'cutaway' : renderStrategy === 'landscape' ? 'landscape' : 'model');
      sendJson(res, 200, {
        source: 'nvidia',
        model: nemotronModel,
        pipeline: {planner: nemotronModel, compiler: textModel, renderStrategy},
        scene,
      });
    } catch (error) {
      if (analysis) return sendJson(res, 200, {
        source: 'fallback',
        warning: error instanceof Error ? error.message : 'Scene compilation failed',
        scene: fallbackScene(filename, analysis),
      });
      sendJson(res, 502, {error: error instanceof Error ? error.message : 'Scene generation failed'});
    }
  };
}
