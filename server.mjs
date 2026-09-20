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

function fallbackQuiz(quiz) {
  const attempt = Number.isInteger(quiz.attempt) ? quiz.attempt : 1;
  const questions = [
    `Which statement about ${quiz.name} matches the field note?`,
    `What is the best explanation of ${quiz.name}'s role here?`,
    `Which ecological connection is true for ${quiz.name}?`,
    `Based on what you learned, which observation about ${quiz.name} is accurate?`,
  ];
  const choices = Array.isArray(quiz.choices) ? quiz.choices.slice(0, 4).map(choice => String(choice).slice(0, 120)) : [];
  const originalAnswer = Number(quiz.answer);
  if (choices.length < 2 || !Number.isInteger(originalAnswer) || originalAnswer < 0 || originalAnswer >= choices.length) {
    throw new Error('Invalid fallback quiz');
  }
  const shift = attempt % choices.length;
  const rotated = [...choices.slice(shift), ...choices.slice(0, shift)];
  return {
    source: 'fallback',
    question: questions[attempt % questions.length],
    choices: rotated,
    answer: (originalAnswer - shift + choices.length) % choices.length,
  };
}

function parseQuiz(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Guide returned invalid quiz JSON');
  const quiz = JSON.parse(text.slice(start, end + 1));
  const question = typeof quiz.question === 'string' ? quiz.question.trim().slice(0, 240) : '';
  const choices = Array.isArray(quiz.choices) ? quiz.choices.map(choice => String(choice).trim().slice(0, 120)).filter(Boolean) : [];
  const answer = Number(quiz.answer);
  if (!question || choices.length < 2 || choices.length > 4 || !Number.isInteger(answer) || answer < 0 || answer >= choices.length) {
    throw new Error('Guide returned an invalid quiz');
  }
  return { source: 'nvidia', question, choices, answer };
}

createHttpServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/personalize') {
    try {
      const body = await readJson(req);
      const name = String(body.name || 'Explorer').slice(0, 40);
      const interests = String(body.interests || 'wildlife and ecosystems').slice(0, 240);
      const style = String(body.style || 'curious').slice(0, 40);
      const subject = body.subject && typeof body.subject === 'object' ? body.subject : null;
      const quiz = body.quiz && typeof body.quiz === 'object' ? body.quiz : null;
      const wantsStream = Boolean(subject) && String(req.headers.accept || '').includes('text/event-stream');

      if (!apiKey) {
        if (quiz) return send(res, 200, fallbackQuiz(quiz));
        return send(res, 200, {
          source: 'fallback',
          text: subject
            ? `${subject.fact} Since you are interested in ${interests}, notice how ${subject.name} connects to the wider food web around you.`
            : `Welcome, ${name}. Your journey will follow ${interests}, with each animal and plant explained in a ${style} way. Look closely—every living thing here leaves a clue.`,
        });
      }

      const previousQuestions = quiz && Array.isArray(quiz.previousQuestions)
        ? quiz.previousQuestions.slice(-8).map(question => String(question).slice(0, 240))
        : [];
      const prompt = quiz
        ? `Create a new quiz question about ${String(quiz.name).slice(0, 100)}. Scientific ground truth: ${String(quiz.fact).slice(0, 600)}. Do not repeat these earlier questions: ${JSON.stringify(previousQuestions)}. Write one clear question and 2 concise answer choices. Exactly one choice must be correct and grounded in the fact. Make the distractor plausible but scientifically false. Return strict JSON only in this shape: {"question":"...","choices":["...","..."],"answer":0}. The answer is the zero-based index of the correct choice.`
        : subject
          ? `Explain this field-guide object to ${name}: ${subject.name}. Ground truth: ${subject.fact}. The visitor likes ${interests} and prefers a ${style} explanation. Write 2 vivid, scientifically careful sentences, under 75 words. Do not invent measurements or conservation status.`
        : `Write a welcoming pre-game introduction for ${name}, who likes ${interests} and prefers a ${style} explanation. This is a 3D ecosystem where they click animals and plants to discover their ecological roles. Write 2 inviting sentences, under 60 words.`;

      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: wantsStream ? 'text/event-stream' : 'application/json',
        },
        body: JSON.stringify({
          model: NVIDIA_MODEL,
          messages: [
            { role: 'system', content: quiz ? 'You are Inside Nature, an accurate educational field guide. Return valid JSON only.' : 'You are Inside Nature, a warm, accurate field guide. Return plain text only.' },
            { role: 'user', content: prompt },
          ],
          temperature: quiz ? 0.75 : 0.55,
          max_tokens: quiz ? 260 : 180,
          stream: wantsStream,
          reasoning_effort: 'low',
        }),
      });
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 300);
        throw new Error(`NVIDIA API returned ${response.status}: ${detail}`);
      }
      if (wantsStream) {
        if (!response.body) throw new Error('NVIDIA API returned no response stream');
        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        });
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
        res.end();
        return;
      }
      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error('NVIDIA API returned no text');
      if (quiz) return send(res, 200, parseQuiz(text));
      send(res, 200, { source: 'nvidia', model: NVIDIA_MODEL, text });
    } catch (error) {
      if (res.headersSent) res.end();
      else send(res, 502, { error: error instanceof Error ? error.message : 'Personalization failed' });
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
