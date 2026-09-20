# Inside Nature

An educational 3D platform with two modes: a ready-made Inside Nature beginner game and an image-to-scene creator. Students can explore 15 animals and plants or upload a PNG/JPEG diagram or nature image and receive an interactive 3D interpretation.

## Run locally

```bash
npm install
npm run build
npm run dev
```

Open `http://localhost:3018`.

Development mode watches server-side files as well as browser files. Changes to
AI handlers and prompts restart Node automatically, preventing a new frontend
from continuing to call an older in-memory `/api/scene` handler.

Copy `.env.example` to `.env` and add `NVIDIA_API_KEY`, `GEMINI_API_KEY`, or both
(and `ELEVEN_LABS_API_KEY` if you want spoken guide audio). The real `.env` file is ignored by Git.
Non-secret settings such as the server port, model name, and ElevenLabs voice
id live in `app.config.mjs`.

## Controls

- `W A S D`: move
- `Space` / `Shift`: rise and descend
- Click: select an animal or plant directly; click empty space to look around
- `E`: open the nearby focused animal or plant
- Biome buttons: jump between water, woodland, and sky

In a generated scene, click an object or aim at it and press `E` to read its description.

## Image-to-scene creator

The creator resizes the uploaded image in the browser and sends it to the server-only `/api/scene` route. Students explicitly choose **Try NVIDIA Nemotron**, **Try Gemini Pro**, or **Try open-source router**. Nemotron inspects the pixels, chooses `cutaway`, `landscape`, or `labeled-model`, and sends its visual plan to the NVIDIA-hosted structured scene compiler. Gemini is an independent direct image-to-structured-scene option. OpenRouter is a third direct image-to-structured-scene option constrained to the configured open-source vision model. All produce the same declarative `SceneSpec`, which the server validates before the browser sees it. The generic Three.js renderer supports a safe set of reusable shapes, labels, colors, and animations; it never executes model-generated code.

The NVIDIA path uses `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` for visual planning and the NVIDIA-authored `nvidia/nemotron-3.5-lightning-30b-a3b` for structured scene compilation. The independent alternative is `gemini-3.1-pro-preview`. OpenRouter uses `openrouter/auto`, allowing its router to choose an appropriate vision-capable model for this task; it requires `OPENROUTER_API_KEY`. These settings are configured in `app.config.mjs`. The app does not set output-token caps or request timeouts; each provider can still enforce its own service limits. A model button is unavailable at the API level when its server-side key is missing.

A generated scene is an educational interpretation of the visible image, not an exact reconstruction of hidden 3D geometry.

Layered diagrams use dedicated procedural geometry instead of unrelated boxes. The chosen model records the visible horizons and their order and emits one `stratum` object per layer, while the renderer builds irregular solid surfaces with real depth. Soil and rock cutaways can also contain `root` and `rock` objects. Students can click every part for its explanation or use **Separate layers** to pull a profile apart and inspect the horizons individually.

Both paths request schema-constrained JSON rather than relying on prompt-only formatting. The server parses and validates the SceneSpec and checks important visual rules such as requiring real strata for a detected soil profile. Each button makes exactly one conversion attempt: there is no automatic repair, retry, provider switch, or fallback scene. On failure, the original preview remains selected and the student sees a short model-level error so they can manually try the other button; raw JSON parser messages are never shown.

## NVIDIA guide

The server calls NVIDIA's OpenAI-compatible `POST /v1/chat/completions` endpoint. The default text and scene-compilation model is NVIDIA Nemotron 3.5 Lightning; switch `NVIDIA_MODEL` in `app.config.mjs` to another model available to your NVIDIA account. The API key never enters the browser bundle. If the key is missing or the service is unavailable, the ready-made game uses its built-in field-guide copy.

AI code is kept separate from the game runtime:

- `server/ai/prompts.mjs`: every server-side system prompt, user prompt, and fallback message
- `server/ai/guide.mjs`: NVIDIA requests, response parsing, and `/api/personalize` handling
- `server/ai/scene.mjs`: Nemotron planning/routing, scene compilation, `SceneSpec` validation, and `/api/scene` handling
- `server/ai/speech.mjs`: ElevenLabs text-to-speech handling
- `src/ai/guide.ts`: browser requests, stream parsing, quiz validation, and local quiz fallback
- `src/ai/scene.ts`: upload preparation and image-to-scene requests
- `src/world/generated-scene.ts`: generic `SceneSpec`-to-Three.js renderer
- `server.mjs`: server startup and route wiring only

Start in `server/ai/prompts.mjs` when reviewing or changing the AI's voice, reading level, or output rules.

All geometry and animation are generated in the browser with Three.js; no external 3D model files are required.

## Audio

Animal SFX, plant rustles, and background music are static MP3s in `public/audio/`. Generate them locally (not at play time):

```bash
npm run generate-audio
npm run generate-audio -- --force
```

`npm run generate-audio` runs `node --env-file=.env scripts/generate-audio.mjs`, so `ELEVEN_LABS_API_KEY` must be in `.env`. Existing files are skipped unless you pass `--force`.

Production needs `ELEVEN_LABS_API_KEY` only for `POST /api/speak` (spoken NVIDIA/fallback text). SFX and music are committed/served as static files and do not call ElevenLabs at runtime.
