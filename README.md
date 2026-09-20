# Inside Nature

An explorable 3D ecosystem inspired by a flat woodland illustration. The world is reconstructed as three connected biomes: freshwater, woodland, and open sky.

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
- Mouse: look around while pointer lock is active
- `E`: meet the focused animal and open its field dialogue
- Biome buttons: jump between water, woodland, and sky

All geometry and animation are generated in the browser with Three.js; no external 3D model files are required.
