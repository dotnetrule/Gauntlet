/**
 * sfx.js — procedural WebAudio sound effects. Leaf module: imports nothing
 * from the game, so it can be hooked from anywhere without cycle risk.
 *
 * Usage: initSfx() once at boot (arms a pointerdown resume for autoplay
 * policy), then sfx('name') anywhere. Calls are silently dropped until the
 * AudioContext is running, and throttled per-name so 3x speed doesn't spam.
 */

let ctx    = null;
let master = null;
const lastPlayed = {};
const THROTTLE   = 0.04;   // seconds between plays of the same sound
const MASTER_GAIN = 0.25;

export function initSfx() {
  const resume = () => {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx    = new AC();
      master = ctx.createGain();
      master.gain.value = MASTER_GAIN;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  };
  // Any click/tap unlocks audio (browser autoplay policy)
  document.addEventListener('pointerdown', resume, { passive: true });
}

/** Play a named sound. No-op until the context is unlocked. */
export function sfx(name) {
  if (!ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  if (now - (lastPlayed[name] ?? -1) < THROTTLE) return;
  lastPlayed[name] = now;
  (VOICES[name] ?? (() => {}))();
}

// ─── Synth primitives ─────────────────────────────────────────────────────────

/** Oscillator blip: freq → freq*bend over dur seconds with decay envelope. */
function tone(freq, dur, { type = 'square', vol = 0.5, bend = 1, delay = 0 } = {}) {
  const t0  = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (bend !== 1) osc.frequency.exponentialRampToValueAtTime(freq * bend, t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Filtered white-noise burst — hits, thumps, flames. */
function noise(dur, { vol = 0.4, freq = 2000, type = 'lowpass', delay = 0 } = {}) {
  const t0  = ctx.currentTime + delay;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d   = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0);
}

// ─── Voice bank ───────────────────────────────────────────────────────────────

const VOICES = {
  // Tower shots — one voice per tower id
  shot_basic:        () => tone(880, 0.07, { type: 'square',   vol: 0.25, bend: 0.7 }),
  shot_sniper:       () => { tone(220, 0.15, { type: 'square', vol: 0.5, bend: 0.4 }); noise(0.08, { vol: 0.3, freq: 3000, type: 'highpass' }); },
  shot_cannon:       () => { tone(110, 0.2,  { type: 'sine',   vol: 0.7, bend: 0.5 }); noise(0.12, { vol: 0.5, freq: 500 }); },
  shot_frost:        () => tone(1200, 0.09, { type: 'sine',     vol: 0.3, bend: 1.4 }),
  shot_flamethrower: () => noise(0.09, { vol: 0.25, freq: 1200 }),
  shot_lightning:    () => tone(1600, 0.12, { type: 'sawtooth', vol: 0.35, bend: 0.15 }),

  hit:     () => noise(0.03, { vol: 0.15, freq: 2500, type: 'highpass' }),
  death:   () => tone(300, 0.18, { type: 'sawtooth', vol: 0.3, bend: 0.25 }),
  leak:    () => { tone(880, 0.15, { type: 'square', vol: 0.5 }); tone(440, 0.25, { type: 'square', vol: 0.5, delay: 0.13 }); },
  send:    () => tone(200, 0.15, { type: 'square', vol: 0.35, bend: 4 }),
  income:  () => tone(1320, 0.12, { type: 'sine', vol: 0.35 }),
  wave:    () => { tone(110, 0.4, { type: 'sawtooth', vol: 0.4 }); tone(165, 0.4, { type: 'sawtooth', vol: 0.3 }); },
  place:   () => tone(600, 0.05, { type: 'square', vol: 0.3, bend: 1.3 }),
  click:   () => tone(950, 0.03, { type: 'square', vol: 0.15, bend: 0.9 }),
  warn:    () => { tone(150, 0.3, { type: 'sawtooth', vol: 0.35 }); tone(120, 0.35, { type: 'sawtooth', vol: 0.3, delay: 0.18 }); },
  sell:    () => tone(400, 0.08, { type: 'square', vol: 0.3, bend: 0.5 }),
  upgrade: () => [523, 659, 784].forEach((f, i) => tone(f, 0.1, { type: 'square', vol: 0.3, delay: i * 0.06 })),
  win:     () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.25, { type: 'square', vol: 0.35, delay: i * 0.12 })),
  lose:    () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3,  { type: 'sawtooth', vol: 0.3, delay: i * 0.15 })),
};
