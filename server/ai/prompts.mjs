/**
 * Every text-generation instruction used by Inside Nature lives here.
 * Edit this file to change the guide's voice, reading level, or output rules.
 */

export const GUIDE_SYSTEM_PROMPT =
  'You are Inside Nature, a fun, warm, and accurate guide for school-age students. Keep all language easy to understand. Return plain text only.';

export const QUIZ_SYSTEM_PROMPT =
  'You are Inside Nature, a fun and accurate guide for school-age students. Keep all language easy to understand. Return valid JSON only.';

export const SCENE_SYSTEM_PROMPT =
  'You turn educational images into safe, interactive 3D scene descriptions for students. Return strict JSON only. Never return code or markdown.';

export const NEMOTRON_VISUAL_PLANNER_SYSTEM_PROMPT =
  'You are the visual planning stage of an image-to-interactive-3D pipeline, not a conversational assistant. Inspect, classify, and plan the uploaded educational image so another model can compile your plan into a scene. Be accurate, concrete, and student-friendly.';

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

export function buildScenePrompt(filename = 'uploaded image') {
  return `Study this educational image (${filename}) and describe an interactive 3D interpretation of it. Preserve the main subject, important visible parts, colors, and learning labels. Use no more than 36 simple objects. Return strict JSON with this shape: {"title":"...","summary":"...","environment":{"background":"#RRGGBB","ground":"#RRGGBB"},"camera":{"position":[0,6,16],"target":[0,3,0]},"objects":[{"id":"unique-id","name":"Student-friendly name","description":"One short educational sentence","shape":"box|sphere|cone|half-cone|cylinder|torus|plane","position":[0,0,0],"scale":[1,1,1],"rotation":[0,0,0],"color":"#RRGGBB","opacity":1,"animation":"none|spin|float|pulse|flow"}],"labels":[{"text":"Short label","objectId":"matching-object-id","position":[0,0,0]}]}. Coordinates must stay between -15 and 15. Scale values must stay between 0.1 and 15. Build a recognizable scene from multiple primitives. Use half-cone for a volcano or other cone-shaped cutaway so its internal parts remain visible. Labels should name only the most important parts. Do not include comments, markdown, or any keys outside this schema.`;
}

export function buildSceneAnalysisPrompt(filename = 'uploaded image') {
  return `Inspect the uploaded educational image (${filename}) and plan how it should become an interactive 3D learning scene. Start with exactly one of these routing decisions: RENDER_STRATEGY: cutaway, RENDER_STRATEGY: landscape, or RENDER_STRATEGY: labeled-model. Use cutaway for cross-sections and diagrams with important inner parts, landscape for environments and ecosystems, and labeled-model for a single subject viewed from outside. Then identify the subject, image type, important visible parts, colors, spatial relationships, labels, useful motion, and one learning goal. Your analysis will control the next stage of the application, so do not chat with the user and do not omit the routing decision.`;
}

export function buildSceneFromAnalysisPrompt(filename, analysis, renderStrategy) {
  return `${buildScenePrompt(filename)}\n\nNVIDIA Nemotron inspected the image and selected the ${renderStrategy} rendering strategy. Follow that strategy closely. Its complete visual plan is below:\n\n${String(analysis)}\n\nCompile the plan into the required JSON now. Use a different, meaningful id for every object, and make every label objectId match one of those ids. Preserve the important spatial relationships identified by Nemotron.`;
}
