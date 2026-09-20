# Inside Nature

An educational 3D platform with two modes: a ready-made Inside Nature beginner game and an image-to-scene creator. Students can explore 15 animals and plants or upload a PNG/JPEG diagram or nature image and receive an interactive 3D interpretation.

## Run locally

```bash
npm install
npm run build
npm run dev
```

Open `http://localhost:3018`.

Copy `.env.example` to `.env` and add `NVIDIA_API_KEY` (and `ELEVEN_LABS_API_KEY`
if you want spoken guide audio). The real `.env` file is ignored by Git.
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

The creator resizes the uploaded image in the browser and sends it to the server-only `/api/scene` route. NVIDIA Nemotron is a required working stage in the creator pipeline: it inspects the pixels, classifies the picture, and chooses `cutaway`, `landscape`, or `labeled-model` as the render strategy. That decision and Nemotron's complete visual plan are passed to the NVIDIA-hosted text model, which compiles them into a declarative `SceneSpec`. The server validates every object before the browser sees it. The generic Three.js renderer supports a safe set of reusable shapes, labels, colors, and animations; it never executes model-generated code.

The visual planner is the current multimodal `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning`, configured as `NVIDIA_NEMOTRON_MODEL` in `app.config.mjs`. The app does not set output-token caps or request timeouts for NVIDIA calls; the selected hosted models and NVIDIA service can still enforce their own context and infrastructure limits. Without an API key, the creator provides a starter scene, including a volcano fallback when the filename mentions a volcano, eruption, magma, or lava.

A generated scene is an educational interpretation of the visible image, not an exact reconstruction of hidden 3D geometry.

## NVIDIA guide

The server calls NVIDIA's OpenAI-compatible `POST /v1/chat/completions` endpoint. The default is the fast `openai/gpt-oss-20b` model hosted by NVIDIA NIM; switch `NVIDIA_MODEL` in `app.config.mjs` to another model available to your NVIDIA account. The API key never enters the browser bundle. If the key is missing or the service is unavailable, the experience uses its built-in field-guide copy instead.

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
