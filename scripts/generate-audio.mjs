#!/usr/bin/env node
/**
 * Generate static SFX/music MP3s into public/audio/.
 *
 * Usage:
 *   npm run generate-audio
 *   npm run generate-audio -- --force
 *
 * Loads ELEVEN_LABS_API_KEY from the environment. The package.json script
 * runs `node --env-file=.env` so a local .env file is picked up.
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'audio');
const force = process.argv.includes('--force');
const apiKey = String(process.env.ELEVEN_LABS_API_KEY || process.env.ELEVENLABS_API_KEY || '').trim().replace(/^['"]|['"]$/g, '');

const SOUND_URL = 'https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128';
const MUSIC_URL = 'https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128';

const assets = [
  {
    file: 'deer.mp3',
    duration: 2.4,
    prompt: 'A close-up white-tailed deer snort and short guttural grunt in a quiet woodland, natural field recording, no music, no speech.',
  },
  {
    file: 'fox.mp3',
    duration: 2.2,
    prompt: 'A red fox yip-bark and short high growl in dry leaves, close wildlife recording, no music, no speech.',
  },
  {
    file: 'rabbit.mp3',
    duration: 1.6,
    prompt: 'A startled wild rabbit thump and brief squeak in grass, close field recording, no music, no speech.',
  },
  {
    file: 'trout.mp3',
    duration: 2.0,
    prompt: 'A trout splash and water slap as a fish breaks a freshwater stream surface, wet and close, no music, no speech.',
  },
  {
    file: 'turtle.mp3',
    duration: 2.0,
    prompt: 'A freshwater turtle hiss and shell scrape on wet stones at a pond edge, close recording, no music, no speech.',
  },
  {
    file: 'ray.mp3',
    duration: 2.4,
    prompt: 'A stingray wing whoosh through shallow water with a low watery pulse, underwater-close, no music, no speech.',
  },
  {
    file: 'eagle.mp3',
    duration: 2.2,
    prompt: 'A bald eagle piercing kee-kee scream high above open sky, distant then close, no music, no speech.',
  },
  {
    file: 'swallow.mp3',
    duration: 1.8,
    prompt: 'Barn swallow twitter-chatter and wing flutter in open air, lively bird calls, no music, no speech.',
  },
  {
    file: 'butterfly.mp3',
    duration: 1.8,
    prompt: 'Delicate insect wing flutter of a large butterfly close to the microphone, airy and light, no music, no speech.',
  },
  {
    file: 'tiger.mp3',
    duration: 2.6,
    prompt: 'A tiger low rumbling growl then short roar in dense foliage, powerful and close, no music, no speech.',
  },
  {
    file: 'frog.mp3',
    duration: 2.0,
    prompt: 'A single American bullfrog croak by a pond at dusk, wet and resonant, no music, no speech.',
  },
  {
    file: 'owl.mp3',
    duration: 2.4,
    prompt: 'A barred owl hoo-hoo call in a quiet night woodland, natural and close, no music, no speech.',
  },
  {
    file: 'otter.mp3',
    duration: 2.0,
    prompt: 'A river otter chirp-whistle and splash in a stream, playful wildlife recording, no music, no speech.',
  },
  {
    file: 'hemlock.mp3',
    duration: 2.2,
    prompt: 'Eastern hemlock needles and small branches rustling as someone walks close through a damp conifer grove, leafy fabric of needles, no music, no speech.',
  },
  {
    file: 'pine.mp3',
    duration: 2.2,
    prompt: 'Tall pine boughs rustling in a breeze as a walker brushes past, dry needles and wood creak, no music, no speech.',
  },
  {
    file: 'splash.mp3',
    duration: 5,
    prompt: 'Huge loud freshwater river splash as a person plunges through the surface then bursts back up: massive water crash, heavy droplets, booming spray for the full five seconds, extremely close and dramatic, no music, no speech.',
  },
  {
    file: 'wind.mp3',
    duration: 3,
    prompt: 'Open empty sky wind: loud rushing whoosh-whoosh (vù vù), a strong gale of air past the ears as if flying through open sky, aerodynamic roar of wind only, no trees, no leaves, no branches, no needle rustle, no forest, no birds, no music, no speech.',
  },
];

const musicPrompt =
  'An upbeat instrumental nature-exploration game bed: bright acoustic guitar, light percussion, warm bass, optimistic woodland adventure, seamless loop, no vocals, no lyrics, no speech.';

if (!apiKey) {
  console.error('ELEVEN_LABS_API_KEY is not set. Add it to .env and run: npm run generate-audio');
  process.exit(1);
}

await mkdir(outDir, { recursive: true });

async function postAudio(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    throw new Error(`${response.status}: ${detail}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function generateSound({ prompt, duration, loop = false }) {
  return postAudio(SOUND_URL, {
    text: prompt,
    duration_seconds: duration,
    prompt_influence: 0.55,
    model_id: 'eleven_text_to_sound_v2',
    loop,
  });
}

async function generateMusic() {
  try {
    return await postAudio(MUSIC_URL, {
      prompt: musicPrompt,
      music_length_ms: 20000,
      model_id: 'music_v2',
      force_instrumental: true,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`Music API failed (${reason}); falling back to looping sound-generation bed.`);
    return generateSound({
      prompt: `${musicPrompt} Loopable 20-second game soundtrack bed with a clean loop point.`,
      duration: 20,
      loop: true,
    });
  }
}

async function writeIfNeeded(file, producer) {
  const path = join(outDir, file);
  if (!force) {
    try {
      await access(path);
      console.log(`skip ${file} (exists; pass --force to regenerate)`);
      return;
    } catch {
      // missing — generate
    }
  }
  console.log(`generate ${file}`);
  const bytes = await producer();
  await writeFile(path, bytes);
}

try {
  await writeIfNeeded('music.mp3', generateMusic);
  for (const asset of assets) {
    await writeIfNeeded(asset.file, () => generateSound(asset));
  }
  console.log(`Audio assets ready in ${outDir}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
