import {createGuideHandler} from '../server/ai/guide.mjs';
import {createSceneHandler} from '../server/ai/scene.mjs';
import {createSpeechHandler} from '../server/ai/speech.mjs';
import {
  ELEVENLABS_VOICE_ID,
  GEMINI_MODEL,
  NVIDIA_MODEL,
  NVIDIA_NEMOTRON_VISION_MODEL,
  OPENROUTER_SCENE_MODEL,
} from '../app.config.mjs';

const cleanSecret = value => String(value || '').trim().replace(/^['"]|['"]$/g, '');

const handleGuide = createGuideHandler({
  apiKey: cleanSecret(process.env.NVIDIA_API_KEY),
  model: NVIDIA_MODEL,
});
const handleScene = createSceneHandler({
  apiKey: cleanSecret(process.env.NVIDIA_API_KEY),
  visionModel: NVIDIA_NEMOTRON_VISION_MODEL,
  textModel: NVIDIA_MODEL,
  geminiApiKey: cleanSecret(process.env.GEMINI_API_KEY),
  geminiModel: GEMINI_MODEL,
  openRouterKey: cleanSecret(process.env.OPENROUTER_API_KEY),
  openRouterModel: OPENROUTER_SCENE_MODEL,
});
const handleSpeech = createSpeechHandler({
  apiKey: cleanSecret(process.env.ELEVEN_LABS_API_KEY || process.env.ELEVENLABS_API_KEY),
  voiceId: ELEVENLABS_VOICE_ID,
});

export default async function handler(req, res) {
  const pathname = new URL(req.url || '/', 'http://vercel.local').pathname;

  if (req.method === 'POST' && pathname === '/api/personalize') {
    await handleGuide(req, res);
    return;
  }
  if (req.method === 'POST' && pathname === '/api/speak') {
    await handleSpeech(req, res);
    return;
  }
  if (req.method === 'POST' && pathname === '/api/scene') {
    await handleScene(req, res);
    return;
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({error: 'Not found'}));
}