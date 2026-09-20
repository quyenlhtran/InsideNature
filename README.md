# Inside Nature

An explorable 3D ecosystem with 15 discoverable animals and plants across freshwater, woodland, and open-sky biomes. A server-side NVIDIA NIM guide personalizes the welcome and each field note around the visitor's interests and preferred explanation style.

## Run locally

```bash
npm install
npm run build
npm run dev
```

Open `http://localhost:3018`.

Copy `.env.example` to `.env` and add only `NVIDIA_API_KEY`. The real `.env`
file is ignored by Git. Non-secret settings such as the server port and model
name live in `app.config.mjs`.

## Controls

- `W A S D`: move
- `Space` / `Shift`: rise and descend
- Click: select an animal or plant directly; click empty space to look around
- `E`: open the nearby focused animal or plant
- Biome buttons: jump between water, woodland, and sky

## NVIDIA guide

The server calls NVIDIA's OpenAI-compatible `POST /v1/chat/completions` endpoint using `nvidia/nemotron-3.5-lightning-30b-a3b`. The API key never enters the browser bundle. If the key is missing or the service is unavailable, the experience uses its built-in field-guide copy instead.

All geometry and animation are generated in the browser with Three.js; no external 3D model files are required.
