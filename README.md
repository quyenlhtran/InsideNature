# 🌿 Inside Nature

> **Step inside. Every life connects.**
> A free, browser-based 3D ecosystem that teaches how nature works as a connected system, with an AI field guide that explains everything around *you*, and a creator that turns any nature diagram into an explorable 3D scene.

**Built for STEELHACK XIII** · Track / theme: `<add track or theme>` · Demo: `<add link>` · Video: `<add link>`

---
## Team

| Name | Link |
|---|---|
| Quyen Tran | [@quyenlhtran](https://github.com/quyenlhtran) |
| Quynh Tran | [GitHub](https://github.com/<username>) |
| Quan Tran | [GitHub](https://github.com/<username>) |
| Truong Nguyen Tien Khanh | [GitHub](https://github.com/<username>) |


## The problem

Nature is a web, but we teach it as a list.

A tree cools a stream, the cold water keeps a trout alive, and the river's insects feed the swallows overhead. Most nature education (posters, videos, textbooks) lists what animals *are* and rarely shows why they matter to each other. It gives every learner the same explanation, whatever they care about.

The best alternative is a field trip, a reserve, or a naturalist who can point and say "look". Those cost money, and for many families in poorer communities that door is closed. **A child's chance to understand the living world shouldn't depend on their family's income. Today, it does.**

Four gaps sit behind it:

| Gap | What goes wrong |
|---|---|
| **Access** | No ticket, no transport, no guide |
| **Engagement** | Facts get memorized, not felt, and lose to the screens competing for attention |
| **Personalization** | A child fascinated by big cats and one fascinated by climate get the same text |
| **Perspective** | We love the tiger and forget the frog, the hemlock and the insects holding the forest together |

> **How might we give every child, wherever they live, the experience of standing inside an ecosystem and understanding why every living thing in it matters?**

## Our solution

Inside Nature runs in a web browser with no download, no ticket and no account. It has two modes.

### 1. Beginner game: explore a living world
- Walk through **three biomes** (woodland, river and open sky) and discover **15 animals and plants**.
- Every species is explained by the **role it plays for others** (shade that cools the stream, insects that link water to sky), not just by its traits, and ends with a short question that checks you understood.
- An **AI guide personalizes** the welcome and every field note around your name, interests and preferred explanation style. The notes stream in live.
- A **spoken guide** reads each note aloud, with species sounds (growls, croaks, rustles) and background music.
- If the AI is unavailable, built-in field-guide text takes over, so the game still runs.

### 2. Image-to-scene creator: turn any diagram into 3D
- Upload a **PNG or JPEG** of a nature image or textbook diagram (soil layers, a landscape, a labeled model).
- Choose **NVIDIA Nemotron** or **Google Gemini** to interpret it. You get an **interactive 3D scene** with clickable parts and explanations.
- Layered diagrams (like soil profiles) become real 3D strata, roots and rocks. **Separate layers** pulls the profile apart so you can inspect each horizon.
- It works with the teacher's or student's own material, not just our 15 species.

## Why it's different

- **Grounded, not made up.** Every guide note starts from a fixed, verified fact, and the prompt forbids inventing measurements or conservation status. (This is a prompt-level guardrail, not a guarantee. See [Limitations](#limitations).)
- **The AI never runs code.** In the creator, models return schema-constrained JSON (a `SceneSpec`). The server validates it, and a generic Three.js renderer draws it from a fixed set of shapes, colors and animations. Model-generated code is never executed.
- **Honest failure.** Each creator button makes exactly one conversion attempt. There is no silent retry, provider switch or fallback scene, and on failure the student sees a short, readable message and can try the other model.
- **No model files.** All geometry and animation are generated in the browser with Three.js.
- **Keys stay server-side.** API keys never enter the browser bundle.

## How it works

```
Browser (Vite + TypeScript + Three.js)
  ├─ World runtime ─ biomes, species, quiz, journal, camera
  ├─ Scene renderer ─ SceneSpec → Three.js (safe shape set only)
  └─ Audio mixer ─ music, species SFX, spoken guide, ducking
        │
        ▼  fetch
Node server (server.mjs)
  ├─ POST /api/personalize ─ NVIDIA NIM text guide (streaming)
  ├─ POST /api/scene ─ image → plan → validated SceneSpec
  │      ├─ NVIDIA Nemotron (visual plan) → Nemotron 3.5 Lightning (scene compile)
  │      └─ Google Gemini (direct image → structured scene)
  └─ POST /api/speak ─ ElevenLabs text-to-speech
```

Models are set in [app.config.mjs](app.config.mjs):

| Purpose | Model |
|---|---|
| Guide text and scene compilation | `nvidia/nemotron-3.5-lightning-30b-a3b` |
| Image understanding (NVIDIA path) | `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` |
| Image → scene (independent path) | `gemini-3.1-pro-preview` |
| Voice | ElevenLabs (voice id in config) |

## Tech stack

**TypeScript** · **Three.js** · **Vite** · **Node.js** (plain `http` server, no framework) · **NVIDIA NIM** (Nemotron) · **Google Gemini** · **ElevenLabs**

## Run it locally

Requires **Node 20.6+** (the scripts use `node --env-file`).

```bash
npm install
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
npm run dev
```

Open **http://localhost:3018**.

`npm run dev` fails if `.env` doesn't exist, so create it even if you leave the keys blank.

### API keys (all optional)

Add keys to `.env`. It is git-ignored. The app degrades gracefully without them.

| Variable | Enables | Without it |
|---|---|---|
| `NVIDIA_API_KEY` ([build.nvidia.com](https://build.nvidia.com)) | Personalized notes, Nemotron creator | Built-in guide text; Nemotron button unavailable |
| `GEMINI_API_KEY` ([aistudio.google.com/apikey](https://aistudio.google.com/apikey)) | Gemini creator | Gemini button unavailable |
| `ELEVEN_LABS_API_KEY` ([elevenlabs.io](https://elevenlabs.io)) | Spoken guide, regenerating audio | Silent guide; static SFX and music still play |

Non-secret settings (port, model names, voice id) live in [app.config.mjs](app.config.mjs). The server logs which providers are enabled at startup.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server; restarts on server-side changes |
| `npm run check` | Type-check |
| `npm run build` | Type-check and production build |
| `npm test` | Server tests for the scene pipeline |
| `npm run generate-audio` | Regenerate species SFX and music (needs the ElevenLabs key; `-- --force` overwrites) |

## Controls

| Input | Action |
|---|---|
| `W A S D` | Move |
| `Space` / `Shift` | Rise / descend |
| Click | Select an animal or plant; click empty space to look around |
| `E` | Open the nearby focused animal or plant (or scene object) |
| Biome buttons | Jump between water, woodland and sky |

## Project structure

```
server.mjs              Startup and route wiring
server/ai/
  prompts.mjs           Every system/user prompt and fallback message
  guide.mjs             /api/personalize (NVIDIA, streaming)
  scene.mjs             /api/scene: planning, compilation, validation
  scene-schema.mjs      SceneSpec schema
  speech.mjs            /api/speak (ElevenLabs)
  scene.test.mjs        Pipeline tests
src/
  world/runtime.ts      Game world, UI and creator flow
  world/generated-scene.ts   SceneSpec → Three.js renderer
  ai/                   Browser guide and scene requests
  audio/mixer.ts        Music, SFX, voice, ducking
public/audio/           Static MP3s (species sounds, music)
scripts/generate-audio.mjs
```

To review or change the guide's voice, reading level or output rules, start in [server/ai/prompts.mjs](server/ai/prompts.mjs).

## Limitations

We'd rather be upfront about what this is today:

- **Desktop only.** Movement is WASD with mouse look and there are no touch controls yet, so it isn't usable on phones. This is our biggest gap, because the people who most need free nature education are the most likely to be on a phone.
- **Needs a connection and a running server.** The 3D scene may also run slowly on low-end devices, and there is no "lite" mode yet.
- **Accuracy is guarded, not guaranteed.** Notes start from verified facts and the prompt forbids invention, but the output isn't automatically checked. A generated scene is an educational *interpretation* of the image, not an exact reconstruction.
- **No per-user rate limiting or request timeouts** on the API routes, and the server binds to `0.0.0.0`. Fine for a demo, but it needs hardening before public deployment because it spends API credits.
- Progress isn't saved between sessions. English only.

## What's next

- Touch controls and a lite rendering mode for phones and low-end devices
- Offline-capable install (PWA) with cached field-guide text
- Server-side species lookup (send only an id), rate limits and timeouts
- Shuffled, three-option quizzes and a completion moment
- More languages and a teacher view for uploading class material

## Acknowledgements

Powered by NVIDIA NIM (Nemotron), Google Gemini and ElevenLabs. 3D rendering by [Three.js](https://threejs.org).
