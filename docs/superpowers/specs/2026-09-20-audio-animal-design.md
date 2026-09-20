# Inside Nature audio (animal SFX, plant rustle, music, spoken guide)

Approved product design for branch `quynh/audio-animal`.

## Goals

- Animal collect (click / existing encounter) plays a saved species sound (growl, croak, etc.).
- Walking near a plant plays a saved rustle once, then cooldown until the player leaves and returns.
- Upbeat background music starts after **Personalize my journey**; `♪` mutes music only.
- Music ducks under SFX and spoken guide, then restores.
- ElevenLabs TTS on the server reads NVIDIA (or fallback) field-guide text: welcome + every opened card.
- Growl/rustle are never replaced by voice. Voice waits until the current SFX for that encounter finishes (or starts immediately if SFX already ended).
- Opening another card stops the current voice and starts the new one.
- Failures stay silent for that layer; the game still runs.

## Deploy split

| Layer | How it is produced | Production needs key? |
|---|---|---|
| Music + animal SFX + plant rustle | Local `npm run generate-audio` → `public/audio/*.mp3` | No |
| Spoken NVIDIA/fallback text | `POST /api/speak` at play time | Yes, `ELEVEN_LABS_API_KEY` |

NVIDIA stays `POST /api/personalize`. Keys never go to the browser bundle.

## File map (`public/audio/`)

- `music.mp3` — upbeat loop
- `deer.mp3`, `fox.mp3`, `rabbit.mp3`, `trout.mp3`, `turtle.mp3`, `ray.mp3`, `eagle.mp3`, `swallow.mp3`, `butterfly.mp3`, `tiger.mp3`, `frog.mp3`, `owl.mp3`, `otter.mp3`
- `hemlock.mp3`, `pine.mp3`

## API

`POST /api/speak`

- Body: `{ "text": string }` (max ~800 chars)
- Success: `audio/mpeg` bytes
- Missing key or upstream failure: `502` JSON `{ "error": "..." }`
- Client: if not ok, skip voice; keep SFX/music/text

Use a fixed voice id from `app.config.mjs` (non-secret). Header `xi-api-key`.

## Client mixer

- Replace the sine-hum `AudioContext` with real `HTMLAudioElement` (or Web Audio) tracks: music, sfx, voice.
- Music: start on successful profile submit (same click that personalizes). Loop. `♪` toggles music gain only.
- Animals: on `openDialogue` for `kind !== 'plant'`, play mapped SFX, duck music, then speak NVIDIA text when it arrives (after SFX `ended`).
- Plants: proximity in the existing nearby loop — if `kind === 'plant'` and newly in range, play rustle + duck. Do not collect. Voice only if the plant card actually opens (E or click).
- Plant click may still open the existing flora card (current game). That is when plant voice plays. Proximity rustle is independent.
- Stop voice when closing dialogue or opening a different subject.

## Generate script

`scripts/generate-audio.mjs` + `package.json` script `generate-audio`.

- Reads `ELEVEN_LABS_API_KEY` from env
- Calls ElevenLabs sound-generation (and music if available; otherwise a longer SFX prompt for a loopable bed)
- Writes the MP3s above; skip existing files unless `--force`

## Out of scope

- Browser `speechSynthesis`
- Regenerating SFX in production
- Muting SFX/voice with `♪`
