import { createServer as createHttpServer } from 'node:http';
import { createServer as createViteServer } from 'vite';
import { APP_HOST, APP_PORT, NVIDIA_MODEL } from './app.config.mjs';

const apiKey = process.env.NVIDIA_API_KEY;

const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: 'spa',
});

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 16_000) reject(new Error('Request too large'));
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function send(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

createHttpServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/personalize') {
    try {
      const body = await readJson(req);
      const name = String(body.name || 'Explorer').slice(0, 40);
      const interests = String(body.interests || 'wildlife and ecosystems').slice(0, 240);
      const style = String(body.style || 'curious').slice(0, 40);
      const subject = body.subject && typeof body.subject === 'object' ? body.subject : null;

      if (!apiKey) {
        return send(res, 200, {
          source: 'fallback',
          text: subject
            ? `${subject.fact} Since you are interested in ${interests}, notice how ${subject.name} connects to the wider food web around you.`
            : `Welcome, ${name}. Your journey will follow ${interests}, with each animal and plant explained in a ${style} way. Look closely—every living thing here leaves a clue.`,
        });
      }

      const prompt = subject
        ? `Explain this field-guide object to ${name}: ${subject.name}. Ground truth: ${subject.fact}. The visitor likes ${interests} and prefers a ${style} explanation. Write 2 vivid, scientifically careful sentences, under 75 words. Do not invent measurements or conservation status.`
        : `Write a welcoming pre-game introduction for ${name}, who likes ${interests} and prefers a ${style} explanation. This is a 3D ecosystem where they click animals and plants to discover their ecological roles. Write 2 inviting sentences, under 60 words.`;

      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          model: NVIDIA_MODEL,
          messages: [
            { role: 'system', content: 'You are Inside Nature, a warm, accurate field guide. Return plain text only.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.55,
          max_tokens: 180,
          stream: false,
          reasoning_effort: 'low',
        }),
      });
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 300);
        throw new Error(`NVIDIA API returned ${response.status}: ${detail}`);
      }
      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error('NVIDIA API returned no text');
      send(res, 200, { source: 'nvidia', model: NVIDIA_MODEL, text });
    } catch (error) {
      send(res, 502, { error: error instanceof Error ? error.message : 'Personalization failed' });
    }
    return;
  }
  vite.middlewares(req, res, () => {
    res.statusCode = 404;
    res.end('Not found');
  });
}).listen(APP_PORT, APP_HOST, () => {
  console.log(`Inside Nature: http://localhost:${APP_PORT}`);
  console.log(apiKey ? `NVIDIA NIM enabled (${NVIDIA_MODEL})` : 'NVIDIA_API_KEY not set; using local fallback copy');
});
