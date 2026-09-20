/**
 * Every text-generation instruction used by Inside Nature lives here.
 * Edit this file to change the guide's voice, reading level, or output rules.
 */

export const GUIDE_SYSTEM_PROMPT =
  'You are Inside Nature, a fun, warm, and accurate guide for school-age students. Keep all language easy to understand. Return plain text only.';

export const QUIZ_SYSTEM_PROMPT =
  'You are Inside Nature, a fun and accurate guide for school-age students. Keep all language easy to understand. Return valid JSON only.';

export const FALLBACK_QUIZ_QUESTIONS = [
  name => `Which fact about ${name} is true?`,
  name => `How does ${name} help its home?`,
  name => `What is ${name} connected to?`,
  name => `What did you learn about ${name}?`,
];

export function buildWelcomePrompt({name, interests, style}) {
  return `Write a fun welcome for ${name}, who likes ${interests} and prefers a ${style} explanation. This is a 3D world where students explore animals and plants. Write 2 friendly sentences for ages 8 to 16, under 40 words. Use short sentences and common words.`;
}

export function buildSubjectPrompt({name, interests, style, subject}) {
  return `Tell ${name} about ${subject.name}. Use this true fact: ${subject.fact}. The visitor likes ${interests} and prefers a ${style} explanation. Write 2 fun, friendly sentences for students ages 8 to 16, under 45 words total. Use short sentences and common words. If a science word is needed, explain it right away. Do not invent facts, measurements, or conservation status.`;
}

export function buildQuizPrompt({quiz, previousQuestions}) {
  return `Create a fun, clear quiz question about ${String(quiz.name).slice(0, 100)} for students ages 8 to 16. Use this fact: ${String(quiz.fact).slice(0, 600)}. Do not repeat these earlier questions: ${JSON.stringify(previousQuestions)}. Use short sentences and common words. Write one question and 2 short answer choices. Exactly one choice must be correct. Return strict JSON only in this shape: {"question":"...","choices":["...","..."],"answer":0}. The answer is the zero-based index of the correct choice.`;
}

export function fallbackWelcome({name, interests}) {
  return `Welcome, ${name}! Get ready to explore ${interests}. Look closely—every animal and plant has a story to share.`;
}

export function fallbackSubject(subject) {
  return `${subject.fact} Look around and see how ${subject.name} is connected to other living things nearby.`;
}
