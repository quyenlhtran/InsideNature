export type VisitorProfile = {
  name: string;
  interests: string;
  style: string;
};

export type GuideSubject = {
  name: string;
  fact: string;
  kind: 'animal' | 'plant';
  biome: string;
  choices: string[];
  answer: number;
};

export type QuizQuestion = {
  question: string;
  choices: string[];
  answer: number;
  source: 'nvidia' | 'fallback';
};

export type GuideText = {
  text: string;
  source: 'nvidia' | 'fallback';
  model?: string;
};

export function localWelcome(visitor: VisitorProfile) {
  return `Welcome, ${visitor.name}. We’ll connect every discovery to ${visitor.interests} as you explore.`;
}

function subjectPayload(subject: GuideSubject) {
  return {name: subject.name, fact: subject.fact, kind: subject.kind, biome: subject.biome};
}

async function requestGuide(body: object, accept = 'application/json') {
  const response = await fetch('/api/personalize', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Accept: accept},
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('Guide unavailable');
  return response;
}

export async function getPersonalizedText(visitor: VisitorProfile, subject?: GuideSubject): Promise<GuideText> {
  const response = await requestGuide({...visitor, subject: subject ? subjectPayload(subject) : undefined});
  return response.json() as Promise<GuideText>;
}

export async function streamPersonalizedText(
  visitor: VisitorProfile,
  subject: GuideSubject,
  onText: (text: string) => void,
): Promise<GuideText> {
  const response = await requestGuide({...visitor, subject: subjectPayload(subject)}, 'text/event-stream');
  if (!response.headers.get('content-type')?.includes('text/event-stream')) {
    const answer = await response.json() as GuideText;
    onText(answer.text);
    return answer;
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Guide stream unavailable');
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';

  const readEvents = (final = false) => {
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = final ? '' : events.pop() ?? '';
    for (const event of events) {
      for (const line of event.split(/\r?\n/)) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const data = JSON.parse(payload);
          const token = data?.choices?.[0]?.delta?.content;
          if (typeof token === 'string' && token) {
            text += token;
            onText(text);
          }
        } catch {
          // Provider metadata can arrive in incomplete chunks.
        }
      }
    }
  };

  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, {stream: true});
    readEvents();
  }
  buffer += decoder.decode();
  if (buffer.trim()) {
    buffer += '\n\n';
    readEvents(true);
  }
  text = text.trim();
  if (!text) throw new Error('Guide returned no text');
  return {text, source: 'nvidia'};
}

function randomizeQuiz(quiz: QuizQuestion): QuizQuestion {
  const choices = quiz.choices.map((label, index) => ({label, correct: index === quiz.answer}));
  for (let i = choices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return {...quiz, choices: choices.map(choice => choice.label), answer: choices.findIndex(choice => choice.correct)};
}

export function localRetryQuiz(subject: GuideSubject, attempt: number): QuizQuestion {
  const questions = [
    `Which fact about ${subject.name} is true?`,
    `How does ${subject.name} help its home?`,
    `What is ${subject.name} connected to?`,
    `What did you learn about ${subject.name}?`,
  ];
  return randomizeQuiz({
    question: questions[attempt % questions.length],
    choices: [...subject.choices],
    answer: subject.answer,
    source: 'fallback',
  });
}

export async function getRetryQuiz(
  visitor: VisitorProfile,
  subject: GuideSubject,
  previousQuestions: string[],
  attempt: number,
): Promise<QuizQuestion> {
  const response = await requestGuide({
    ...visitor,
    quiz: {...subjectPayload(subject), choices: subject.choices, answer: subject.answer, previousQuestions, attempt},
  });
  const quiz = await response.json() as QuizQuestion;
  if (
    typeof quiz.question !== 'string'
    || !Array.isArray(quiz.choices)
    || quiz.choices.length < 2
    || !quiz.choices.every(choice => typeof choice === 'string')
    || !Number.isInteger(quiz.answer)
    || quiz.answer < 0
    || quiz.answer >= quiz.choices.length
  ) throw new Error('Invalid quiz');
  return randomizeQuiz(quiz);
}
