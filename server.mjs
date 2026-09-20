import {createServer as createHttpServer} from 'node:http';
import {createServer as createViteServer} from 'vite';
import {APP_HOST, APP_PORT, NVIDIA_MODEL, NVIDIA_VISION_MODEL, ELEVENLABS_VOICE_ID} from './app.config.mjs';
import {createGuideHandler} from './server/ai/guide.mjs';
import {createSceneHandler} from './server/ai/scene.mjs';
import {createSpeechHandler} from './server/ai/speech.mjs';

const cleanSecret = value => String(value || '').trim().replace(/^['"]|['"]$/g, '');
const nvidiaKey = cleanSecret(process.env.NVIDIA_API_KEY);
const elevenLabsKey = cleanSecret(process.env.ELEVEN_LABS_API_KEY || process.env.ELEVENLABS_API_KEY);

const handleGuide = createGuideHandler({apiKey: nvidiaKey, model: NVIDIA_MODEL});
const handleScene = createSceneHandler({apiKey: nvidiaKey, visionModel: NVIDIA_VISION_MODEL, textModel: NVIDIA_MODEL});
const handleSpeech = createSpeechHandler({apiKey: elevenLabsKey, voiceId: ELEVENLABS_VOICE_ID});
const vite = await createViteServer({server: {middlewareMode: true}, appType: 'spa'});

createHttpServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/personalize') {
    await handleGuide(req, res);
    return;
  }
  if (req.method === 'POST' && req.url === '/api/speak') {
    await handleSpeech(req, res);
    return;
  }
  if (req.method === 'POST' && req.url === '/api/scene') {
    await handleScene(req, res);
    return;
  }
  vite.middlewares(req, res, () => {
    res.statusCode = 404;
    res.end('Not found');
  });
}).listen(APP_PORT, APP_HOST, () => {
  console.log(`Inside Nature: http://localhost:${APP_PORT}`);
  console.log(nvidiaKey ? `NVIDIA NIM enabled (${NVIDIA_MODEL})` : 'NVIDIA_API_KEY not set; using local fallback copy');
  console.log(nvidiaKey ? `Image-to-scene enabled (${NVIDIA_VISION_MODEL})` : 'NVIDIA_API_KEY not set; using fallback scenes');
  console.log(elevenLabsKey ? `ElevenLabs speak enabled (${ELEVENLABS_VOICE_ID})` : 'ELEVEN_LABS_API_KEY not set; /api/speak disabled');
});
