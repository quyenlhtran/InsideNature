import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import test from 'node:test';
import {createSceneHandler} from './scene.mjs';

const plannerOutput = 'RENDER_STRATEGY: cutaway\nSUBJECT: a soil profile\nLAYERS: O horizon, A horizon, and bedrock.';
const validScene = {
  title: 'Soil Layers',
  summary: 'Explore two soil horizons.',
  presentation: 'cutaway',
  environment: {background: '#c9e5e2', ground: '#58634a'},
  camera: {position: [0, 5, 18], target: [0, 2, 0]},
  objects: [
    {id: 'topsoil', name: 'Topsoil', description: 'The upper soil layer.', shape: 'stratum', position: [0, 2, 0], scale: [8, 1, 5], rotation: [0, 0, 0], color: '#59382a', opacity: 1, animation: 'none'},
    {id: 'bedrock', name: 'Bedrock', description: 'Solid rock below the soil.', shape: 'stratum', position: [0, 0, 0], scale: [8, 2, 5], rotation: [0, 0, 0], color: '#666666', opacity: 1, animation: 'none'},
  ],
  labels: [],
};

const nvidiaCompletion = content => new Response(JSON.stringify({
  choices: [{finish_reason: 'stop', message: {content}}],
}), {status: 200, headers: {'Content-Type': 'application/json'}});
const geminiCompletion = content => new Response(JSON.stringify({output_text: content}), {
  status: 200,
  headers: {'Content-Type': 'application/json'},
});

async function invokeWith({provider = 'nvidia', responses}) {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({url, body: JSON.parse(options.body)});
    const response = responses.shift();
    assert.ok(response, 'Unexpected extra model request');
    return response;
  };
  try {
    const req = Readable.from([JSON.stringify({image: 'data:image/png;base64,AA==', filename: 'soil.png', provider})]);
    req.headers = {};
    let status = 0;
    let payload = '';
    await new Promise(resolve => createSceneHandler({
      apiKey: 'nvidia-key', visionModel: 'vision', textModel: 'compiler',
      geminiApiKey: 'gemini-key', geminiModel: 'gemini-pro',
      openRouterKey: 'openrouter-key', openRouterModel: 'openrouter/auto',
    })(req, {
      writeHead(value) { status = value; },
      end(value) { payload = String(value || ''); resolve(); },
    }));
    assert.equal(responses.length, 0, 'Expected model request was not made');
    return {status, body: JSON.parse(payload), requests};
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test('stops after one malformed NVIDIA compilation without exposing parser details', async () => {
  const result = await invokeWith({responses: [
    nvidiaCompletion(plannerOutput),
    nvidiaCompletion('{"title":"Broken","objects":['),
  ]});
  assert.equal(result.status, 502);
  assert.equal(result.body.provider, 'nvidia');
  assert.equal(result.requests.length, 2);
  assert.doesNotMatch(result.body.error, /JSON|syntax|position|Expected/i);
});

test('stops when NVIDIA returns a visually invalid soil scene instead of retrying', async () => {
  const invalidScene = structuredClone(validScene);
  invalidScene.objects = invalidScene.objects.map(object => ({...object, shape: 'box'}));
  const result = await invokeWith({responses: [
    nvidiaCompletion(plannerOutput),
    nvidiaCompletion(JSON.stringify(invalidScene)),
  ]});
  assert.equal(result.status, 502);
  assert.equal(result.requests.length, 2);
  assert.match(result.body.error, /try Gemini/i);
});

test('uses Gemini as an independent single-call structured-output path', async () => {
  const result = await invokeWith({provider: 'gemini', responses: [geminiCompletion(JSON.stringify(validScene))]});
  assert.equal(result.status, 200);
  assert.equal(result.body.source, 'gemini');
  assert.equal(result.requests.length, 1);
  assert.match(result.requests[0].url, /generativelanguage\.googleapis\.com/);
  assert.equal(result.requests[0].body.response_format.mime_type, 'application/json');
  assert.equal(result.body.scene.objects[0].shape, 'stratum');
});

test('reports a Gemini rate limit as a provider failure rather than a JSON error', async () => {
  const rateLimit = new Response('{"error":{"message":"quota reached"}}', {status: 429});
  const result = await invokeWith({provider: 'gemini', responses: [rateLimit]});
  assert.equal(result.status, 429);
  assert.equal(result.body.code, 'PROVIDER_RATE_LIMIT');
  assert.match(result.body.error, /usage limit/i);
  assert.doesNotMatch(result.body.error, /JSON|syntax|position|Expected/i);
});

test('reports NVIDIA worker capacity separately from a generic outage', async () => {
  const capacity = new Response('{"error":{"message":"ResourceExhausted: Worker local total request limit reached (1256/16)"}}', {status: 503});
  const result = await invokeWith({responses: [capacity]});
  assert.equal(result.status, 503);
  assert.equal(result.body.code, 'PROVIDER_CAPACITY');
  assert.match(result.body.error, /temporarily at capacity|try Gemini/i);
});

test('uses OpenRouter automatic routing for the scene task', async () => {
  const result = await invokeWith({provider: 'openrouter', responses: [nvidiaCompletion(JSON.stringify(validScene))]});
  assert.equal(result.status, 200);
  assert.equal(result.body.source, 'openrouter');
  assert.equal(result.body.model, 'openrouter/auto');
  assert.equal(result.requests.length, 1);
  assert.match(result.requests[0].url, /openrouter\.ai\/api\/v1\/chat\/completions/);
  assert.equal(result.requests[0].body.model, 'openrouter/auto');
  assert.equal(result.requests[0].body.messages[1].content[1].type, 'image_url');
});
