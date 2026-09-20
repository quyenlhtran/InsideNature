# Inside Nature

An explorable 3D ecosystem with 15 discoverable animals and plants across freshwater, woodland, and open-sky biomes. A server-side NVIDIA NIM guide personalizes the welcome and each field note around the visitor's interests and preferred explanation style.

## Run locally

```bash
npm install
npm run build
npm run dev
```

Open `http://localhost:3018`.

Copy `.env.example` to `.env` and add `NVIDIA_API_KEY` (and `ELEVENLABS_API_KEY`
if you want spoken guide audio). The real `.env` file is ignored by Git.
Non-secret settings such as the server port, model name, and ElevenLabs voice
id live in `app.config.mjs`.

## Controls

- `W A S D`: move
- `Space` / `Shift`: rise and descend
- Click: select an animal or plant directly; click empty space to look around
- `E`: open the nearby focused animal or plant
- Biome buttons: jump between water, woodland, and sky

## NVIDIA guide

The server calls NVIDIA's OpenAI-compatible `POST /v1/chat/completions` endpoint. The default is the fast `openai/gpt-oss-20b` model hosted by NVIDIA NIM; switch `NVIDIA_MODEL` in `app.config.mjs` to another model available to your NVIDIA account. The API key never enters the browser bundle. If the key is missing or the service is unavailable, the experience uses its built-in field-guide copy instead.

All geometry and animation are generated in the browser with Three.js; no external 3D model files are required.

## Audio

Animal SFX, plant rustles, and background music are static MP3s in `public/audio/`. Generate them locally (not at play time):

```bash
npm run generate-audio
npm run generate-audio -- --force
```

`npm run generate-audio` runs `node --env-file=.env scripts/generate-audio.mjs`, so `ELEVENLABS_API_KEY` must be in `.env`. Existing files are skipped unless you pass `--force`.

Production needs `ELEVENLABS_API_KEY` only for `POST /api/speak` (spoken NVIDIA/fallback text). SFX and music are committed/served as static files and do not call ElevenLabs at runtime.
