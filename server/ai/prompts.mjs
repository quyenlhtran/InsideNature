/**
 * Every text-generation instruction used by Inside Nature lives here.
 * Edit this file to change the guide's voice, reading level, or output rules.
 */

export const GUIDE_SYSTEM_PROMPT =
  'You are Inside Nature, a fun, warm, and accurate guide for school-age students. Keep all language easy to understand. Return plain text only.';

export const QUIZ_SYSTEM_PROMPT =
  'You are Inside Nature, a fun and accurate guide for school-age students. Keep all language easy to understand. Return valid JSON only.';

export const SCENE_SYSTEM_PROMPT =
  'You compile a visual plan into a safe interactive 3D scene for students. Return only the complete JSON object required by the supplied schema. Do not include markdown, commentary, or visible reasoning. Prefer fewer meaningful objects over repetitive decoration. Finish every object and array.';

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
  return `Compile the visual plan for ${filename} into the supplied SceneSpec schema. Preserve the important parts, spatial order, relative size, colors, and learning labels. Coordinates stay between -15 and 15; scale values stay between 0.1 and 15. Every important part is a separate clickable object with one short student-friendly description. For stacked cross-sections, use presentation cutaway and one stratum per visible layer, sharing width and depth and following the true top-to-bottom order. Use root and rock for soil details. For volcanoes, use a small number of half-cone rock layers plus separate vent, crater, magma chamber, and lava objects. Keep internal structures visible from the starting camera. Return only one complete schema-matching JSON object.`;
}

export function buildSceneAnalysisPrompt(filename = 'uploaded image') {
  return `Inspect the uploaded educational image (${filename}) and plan how it should become an interactive 3D learning scene. Start with exactly one of these routing decisions: RENDER_STRATEGY: cutaway, RENDER_STRATEGY: landscape, or RENDER_STRATEGY: labeled-model. Use cutaway for cross-sections and diagrams with important inner parts, landscape for environments and ecosystems, and labeled-model for one subject viewed from outside. Explicitly identify every visible layer or horizon in top-to-bottom or outside-to-inside order. For each layer, record its label, color, relative thickness, what it contains, and a short student-friendly learning fact. Also identify roots, rocks, vents, chambers, flows, and other structures that cross or sit inside layers. Your analysis controls procedural geometry and object interactions in the next stage, so preserve spatial relationships, do not chat with the user, and do not omit the routing decision.`;
}

export function buildSceneFromAnalysisPrompt(filename, analysis, renderStrategy) {
  return `${buildScenePrompt(filename)}\n\nNVIDIA Nemotron inspected the image and selected the ${renderStrategy} rendering strategy. Follow that strategy closely. Its complete visual plan is below:\n\n${String(analysis)}\n\nCompile the plan into the required JSON now. Use a different, meaningful id for every object, and make every label objectId match one of those ids. Preserve the important spatial relationships identified by Nemotron.`;
}

export function buildGeminiScenePrompt(filename = 'uploaded image') {
  return `Inspect ${filename} and convert it directly into the supplied interactive SceneSpec. ${buildScenePrompt(filename)} Use the image itself as the source of truth. Do not describe your work and do not add parts that are not supported by the image.`;
}
