const MUSIC_SRC = '/audio/music.mp3';
const MUSIC_VOL = 0.32;
const DUCK_VOL = 0.07;
const SFX_VOL = 0.72;
const VOICE_VOL = 1;
const SPEAK_MAX = 800;

const SPECIES_FILE: Record<string, string> = {
  'White-tailed Deer': 'deer',
  'Red Fox': 'fox',
  'Eastern Cottontail': 'rabbit',
  'Brook Trout': 'trout',
  'River Turtle': 'turtle',
  'Freshwater Ray': 'ray',
  'Bald Eagle': 'eagle',
  'Tree Swallow': 'swallow',
  'Monarch Butterfly': 'butterfly',
  'Bengal Tiger': 'tiger',
  'Green Frog': 'frog',
  'Barred Owl': 'owl',
  'River Otter': 'otter',
  'Eastern Hemlock': 'hemlock',
  'Young Pine': 'pine',
};

let music: HTMLAudioElement | null = null;
let musicEnabled = true;
let musicStarted = false;
let duckHold = 0;
let encounterId = 0;
let speakGen = 0;
let plantInRange = -1;
let voiceObjectUrl: string | null = null;
const voice = new Audio();

function applyDuck() {
  if (!music || !musicEnabled) return;
  music.volume = duckHold > 0 ? DUCK_VOL : MUSIC_VOL;
}

function holdDuck() {
  duckHold += 1;
  applyDuck();
}

function releaseDuck() {
  duckHold = Math.max(0, duckHold - 1);
  applyDuck();
}

function revokeVoiceUrl() {
  if (voiceObjectUrl) {
    URL.revokeObjectURL(voiceObjectUrl);
    voiceObjectUrl = null;
  }
}

export function setMusicEnabled(on: boolean) {
  musicEnabled = on;
  if (!music) return;
  if (on) {
    music.volume = duckHold > 0 ? DUCK_VOL : MUSIC_VOL;
    void music.play().catch(() => {});
  } else {
    music.pause();
  }
}

/** Looping bed; call from the Personalize submit gesture so autoplay is allowed. */
export function startMusic() {
  if (musicStarted) {
    setMusicEnabled(musicEnabled);
    return;
  }
  musicStarted = true;
  music = new Audio(MUSIC_SRC);
  music.loop = true;
  music.preload = 'auto';
  music.volume = MUSIC_VOL;
  applyDuck();
  if (musicEnabled) void music.play().catch(() => {});
}

let voiceHeld = false;

function releaseVoiceDuck() {
  if (!voiceHeld) return;
  voiceHeld = false;
  releaseDuck();
}

export function stopVoiceAndUnduck() {
  speakGen += 1;
  voice.pause();
  voice.removeAttribute('src');
  voice.load();
  revokeVoiceUrl();
  releaseVoiceDuck();
}

export function beginEncounter() {
  encounterId += 1;
  stopVoiceAndUnduck();
  return encounterId;
}

export function endEncounter() {
  encounterId += 1;
  stopVoiceAndUnduck();
}

export function isEncounter(id: number) {
  return id === encounterId;
}

export function playSfx(name: string): Promise<void> {
  const file = SPECIES_FILE[name];
  if (!file) return Promise.resolve();
  const el = new Audio(`/audio/${file}.mp3`);
  const plant = file === 'hemlock' || file === 'pine';
  el.volume = plant ? 1 : SFX_VOL;
  holdDuck();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      releaseDuck();
      resolve();
    };
    el.addEventListener('ended', finish, {once: true});
    el.addEventListener('error', finish, {once: true});
    void el.play().catch(finish);
  });
}

export async function speak(text: string) {
  const clipped = text.trim().slice(0, SPEAK_MAX);
  if (!clipped) return;
  const gen = ++speakGen;
  voice.pause();
  revokeVoiceUrl();
  releaseVoiceDuck();
  try {
    const response = await fetch('/api/speak', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({text: clipped}),
    });
    if (!response.ok || gen !== speakGen) return;
    const blob = await response.blob();
    if (gen !== speakGen) return;
    const url = URL.createObjectURL(blob);
    voiceObjectUrl = url;
    voice.volume = VOICE_VOL;
    voice.src = url;
    const finish = () => {
      if (gen !== speakGen) return;
      voice.removeEventListener('ended', finish);
      voice.removeEventListener('error', finish);
      releaseVoiceDuck();
    };
    voice.addEventListener('ended', finish);
    voice.addEventListener('error', finish);
    holdDuck();
    voiceHeld = true;
    await voice.play();
  } catch {
    if (gen === speakGen) releaseVoiceDuck();
  }
}

/** Plant rustle once on entering nearby range; retrigger only after leaving. */
export function notifyNearby(index: number, name: string | null, kind: 'animal' | 'plant' | null) {
  if (kind === 'plant' && index >= 0 && name) {
    if (plantInRange !== index) {
      plantInRange = index;
      void playSfx(name);
    }
    return;
  }
  plantInRange = -1;
}

type Cue = {el: HTMLAudioElement | null; duck: boolean; src: string; volume: number};

function playOneShot(slot: Cue) {
  if (!slot.el) {
    slot.el = new Audio(slot.src);
    slot.el.volume = slot.volume;
    const done = () => {
      if (!slot.duck) return;
      slot.duck = false;
      releaseDuck();
    };
    slot.el.addEventListener('ended', done);
    slot.el.addEventListener('error', done);
  }
  if (!slot.duck) {
    slot.duck = true;
    holdDuck();
  }
  slot.el.currentTime = 0;
  void slot.el.play().catch(() => {
    if (!slot.duck) return;
    slot.duck = false;
    releaseDuck();
  });
}

const splashSlot: Cue = {el: null, duck: false, src: '/audio/splash.mp3', volume: 1};
const windSlot: Cue = {el: null, duck: false, src: '/audio/wind.mp3?v=2', volume: 1};

/** Loud 5s plunge; only call when crossing into or out of the river. */
export function playSplash() {
  playOneShot(splashSlot);
}

/** 3s wind rush; only call when rising into the sky. */
export function playWind() {
  playOneShot(windSlot);
}
