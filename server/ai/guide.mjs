import {readJson, sendJson} from '../http.mjs';
import {
  FALLBACK_QUIZ_QUESTIONS,
  GUIDE_SYSTEM_PROMPT,
  QUIZ_SYSTEM_PROMPT,
  buildQuizPrompt,
  buildSubjectPrompt,
  buildWelcomePrompt,
  fallbackSubject,
  fallbackWelcome,
} from './prompts.mjs';

function fallbackQuiz(quiz) {
  const attempt = Number.isInteger(quiz.attempt) ? quiz.attempt : 1;
  const choices = Array.isArray(quiz.choices) ? quiz.choices.slice(0, 4).map(choice => String(choice).slice(0, 120)) : [];
  const originalAnswer = Number(quiz.answer);
  if (choices.length < 2 || !Number.isInteger(originalAnswer) || originalAnswer < 0 || originalAnswer >= choices.length) {
    throw new Error('Invalid fallback quiz');
  }
  const shift = attempt % choices.length;
  const rotated = [...choices.slice(shift), ...choices.slice(0, shift)];
  return {
    source: 'fallback',
    question: FALLBACK_QUIZ_QUESTIONS[attempt % FALLBACK_QUIZ_QUESTIONS.length](quiz.name),
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
  return {source: 'nvidia', question, choices, answer};
}

export function createGuideHandler({apiKey, model}) {
  return async function handleGuide(req, res) {
    try {
      const body = await readJson(req);
      const name = String(body.name || 'Explorer').slice(0, 40);
      const interests = String(body.interests || 'wildlife and ecosystems').slice(0, 240);
      const style = String(body.style || 'curious').slice(0, 40);
      const subject = body.subject && typeof body.subject === 'object' ? body.subject : null;
      const quiz = body.quiz && typeof body.quiz === 'object' ? body.quiz : null;
      const wantsStream = Boolean(subject) && String(req.headers.accept || '').includes('text/event-stream');

      if (!apiKey) {
        if (quiz) return sendJson(res, 200, fallbackQuiz(quiz));
        return sendJson(res, 200, {
          source: 'fallback',
          text: subject ? fallbackSubject(subject) : fallbackWelcome({name, interests}),
        });
      }

      const previousQuestions = quiz && Array.isArray(quiz.previousQuestions)
        ? quiz.previousQuestions.slice(-8).map(question => String(question).slice(0, 240))
        : [];
      const prompt = quiz
        ? buildQuizPrompt({quiz, previousQuestions})
        : subject
          ? buildSubjectPrompt({name, interests, style, subject})
          : buildWelcomePrompt({name, interests, style});

      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: wantsStream ? 'text/event-stream' : 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {role: 'system', content: quiz ? QUIZ_SYSTEM_PROMPT : GUIDE_SYSTEM_PROMPT},
            {role: 'user', content: prompt},
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
          const {done, value} = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
        res.end();
        return;
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error('NVIDIA API returned no text');
      if (quiz) return sendJson(res, 200, parseQuiz(text));
      sendJson(res, 200, {source: 'nvidia', model, text});
    } catch (error) {
      if (res.headersSent) res.end();
      else sendJson(res, 502, {error: error instanceof Error ? error.message : 'Personalization failed'});
    }
  };
}
