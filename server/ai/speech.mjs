import {readJson, sendJson} from '../http.mjs';

export function createSpeechHandler({apiKey, voiceId}) {
  return async function handleSpeech(req, res) {
    try {
      const body = await readJson(req);
      const text = String(body.text || '').trim().slice(0, 800);
      if (!text) return sendJson(res, 400, {error: 'text is required'});
      if (!apiKey) return sendJson(res, 502, {error: 'ELEVEN_LABS_API_KEY is not set'});

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          body: JSON.stringify({text, model_id: 'eleven_multilingual_v2'}),
        },
      );
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 300);
        throw new Error(`ElevenLabs TTS returned ${response.status}: ${detail}`);
      }

      const audio = Buffer.from(await response.arrayBuffer());
      res.writeHead(200, {'Content-Type': 'audio/mpeg', 'Content-Length': String(audio.length)});
      res.end(audio);
    } catch (error) {
      sendJson(res, 502, {error: error instanceof Error ? error.message : 'Speech failed'});
    }
  };
}
