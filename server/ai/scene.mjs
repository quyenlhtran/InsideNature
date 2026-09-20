import {readJson, sendJson} from '../http.mjs';
import {SCENE_SYSTEM_PROMPT, buildSceneFromAnalysisPrompt, buildScenePrompt} from './prompts.mjs';

const SHAPES = new Set(['box', 'sphere', 'cone', 'half-cone', 'cylinder', 'torus', 'plane']);
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
  if (start < 0 || end <= start) throw new Error('Vision model returned invalid scene JSON');
  return JSON.parse(content.slice(start, end + 1));
}

function validateScene(input) {
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

function fallbackScene(filename) {
  const volcano = /volcano|eruption|magma|lava/i.test(filename);
  if (volcano) return validateScene({
    title: 'Inside a Volcano',
    summary: 'Explore how magma travels from deep underground and erupts as lava.',
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
  });
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

export function createSceneHandler({apiKey, visionModel, textModel}) {
  return async function handleScene(req, res) {
    try {
      const body = await readJson(req, 6_500_000);
      const image = String(body.image || '');
      const filename = text(body.filename, 120, 'uploaded image');
      if (!/^data:image\/(png|jpeg);base64,/i.test(image)) {
        return sendJson(res, 400, {error: 'Upload a PNG or JPEG image'});
      }
      if (!apiKey) return sendJson(res, 200, {source: 'fallback', scene: fallbackScene(filename)});

      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json'},
        body: JSON.stringify({
          model: visionModel,
          messages: [
            {role: 'system', content: SCENE_SYSTEM_PROMPT},
            {role: 'user', content: [
              {type: 'text', text: buildScenePrompt(filename)},
              {type: 'image_url', image_url: {url: image}},
            ]},
          ],
          temperature: 0.2,
          max_tokens: 2400,
          response_format: {type: 'json_object'},
        }),
      });
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 300);
        throw new Error(`NVIDIA vision API returned ${response.status}: ${detail}`);
      }
      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) throw new Error('Vision model returned no scene');

      let scene;
      try {
        scene = validateScene(parseJson(content));
      } catch {
        const conversion = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: {Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json'},
          body: JSON.stringify({
            model: textModel,
            messages: [
              {role: 'system', content: SCENE_SYSTEM_PROMPT},
              {role: 'user', content: buildSceneFromAnalysisPrompt(filename, content)},
            ],
            temperature: 0.1,
            max_tokens: 3000,
            reasoning_effort: 'low',
            response_format: {type: 'json_object'},
          }),
        });
        if (!conversion.ok) {
          const detail = (await conversion.text()).slice(0, 300);
          throw new Error(`NVIDIA scene conversion returned ${conversion.status}: ${detail}`);
        }
        const conversionData = await conversion.json();
        const converted = conversionData?.choices?.[0]?.message?.content;
        if (typeof converted !== 'string' || !converted.trim()) throw new Error('Scene converter returned no JSON');
        scene = validateScene(parseJson(converted));
      }
      sendJson(res, 200, {source: 'nvidia', model: visionModel, scene});
    } catch (error) {
      sendJson(res, 502, {error: error instanceof Error ? error.message : 'Scene generation failed'});
    }
  };
}
