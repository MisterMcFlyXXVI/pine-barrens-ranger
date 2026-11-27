/**
 * Procedural chiptune background music (no audio files). Each track is a short
 * loop composed in code from a scale, a chord progression and a seeded melody,
 * then played by a small look-ahead Web Audio scheduler. Tracks crossfade as
 * you move between regions, times of day and encounters.
 */
import { sfx } from './sfx';

export type TrackId = 'title' | 'cabin' | 'town' | 'woods' | 'bog' | 'ridge' | 'night' | 'interior' | 'encounter' | 'festival' | 'mine' | 'mine_warm' | 'mine_hymn';

interface Note { s: number; m: number; l: number; v?: number }
interface Voice { wave: OscillatorType; gain: number; notes: Note[]; pluck?: boolean; detune?: number; pad?: boolean }
type Drum = 'kick' | 'snare' | 'hat' | 'static' | 'drip' | 'heart' | 'cricket' | 'wind' | 'hiss' | 'brush' | 'thump' | 'crackle';
interface Loop { bpm: number; steps: number; voices: Voice[]; drums: Array<{ s: number; k: Drum; v?: number }>; swing: number }

const MUSIC_KEY = 'pbr_music';
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const MIXO = [0, 2, 4, 5, 7, 9, 10];

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Scale-degree -> MIDI note (degrees can run past an octave either way). */
function scaleFn(root: number, mode: number[]): (deg: number) => number {
  return (d) => { const o = Math.floor(d / 7); const i = ((d % 7) + 7) % 7; return root + o * 12 + mode[i]; };
}

interface Spec {
  seed: number; bpm: number; root: number; mode: number[]; prog: number[];
  bass: 'boomchick' | 'drone' | 'walk' | 'pulse' | 'none';
  arp: 'roll' | 'up' | 'sparse' | 'none';
  melody: 'busy' | 'lyric' | 'sparse' | 'none';
  drums: 'reel' | 'march' | 'drive' | 'none' | 'drips' | 'static' | 'ambient' | 'lofi';
  /** Lazy swing on the off-beat sixteenths, 0..0.5 of a step (lo-fi feel). */
  swing?: number;
  melodyWave?: OscillatorType; arpWave?: OscillatorType; melodyGain?: number;
  /** A slow, soft chord pad under everything (default on). */
  pad?: boolean;
}

/*
 * The sound of the holler is low and mellow: nothing in the score climbs above these.
 * (The old title theme peaked at F5, ~700 Hz; the melody now tops out a sixth lower.)
 */
const MELODY_CEIL = 67; // G4, ~392 Hz
const ARP_CEIL = 62;    // D4, ~294 Hz
const PAD_CEIL = 60;    // C4
const fold = (m: number, ceil: number) => { while (m > ceil) m -= 12; return m; };

/** Compose an 8-bar (128-step) loop from a spec. */
function compose(sp: Spec): Loop {
  const r = rng(sp.seed);
  const deg = scaleFn(sp.root, sp.mode);
  // Bass one octave down, but never below G2 (~98 Hz): phone speakers can't play much lower.
  const low = (d: number) => { let m = deg(d - 7); while (m < 43) m += 12; return m; };
  const bars = sp.prog.length, steps = bars * 16;
  const bass: Note[] = [], arp: Note[] = [], mel: Note[] = [], pad: Note[] = [];
  const drums: Loop['drums'] = [];
  sp.prog.forEach((c, b) => {
    const s0 = b * 16;
    const chord = [c, c + 2, c + 4];
    // Bass
    if (sp.bass === 'boomchick') for (let k = 0; k < 4; k++) bass.push({ s: s0 + k * 4, m: low(chord[k % 2 === 0 ? 0 : 2]), l: 3 });
    if (sp.bass === 'drone') bass.push({ s: s0, m: low(c), l: 16, v: 0.8 });
    if (sp.bass === 'walk') for (let k = 0; k < 4; k++) bass.push({ s: s0 + k * 4, m: low(c + [0, 2, 4, 2][k]), l: 4 });
    if (sp.bass === 'pulse') for (let k = 0; k < 8; k++) bass.push({ s: s0 + k * 2, m: low(c + (k === 7 ? 4 : 0)), l: 1 });
    // Arpeggio / "banjo roll"
    if (sp.arp === 'roll') for (let k = 0; k < 16; k++) arp.push({ s: s0 + k, m: fold(deg(chord[[0, 1, 2, 1, 0, 2, 1, 2][k % 8]]), ARP_CEIL), l: 2, v: k % 4 === 0 ? 1 : 0.65 });
    if (sp.arp === 'up') for (let k = 0; k < 8; k++) arp.push({ s: s0 + k * 2, m: fold(deg(chord[k % 3]), ARP_CEIL), l: 3 });
    if (sp.arp === 'sparse') for (const k of [0, 6, 10]) arp.push({ s: s0 + k, m: fold(deg(chord[Math.floor(r() * 3)] + 7), ARP_CEIL), l: 8, v: 0.6 });
    // Pad: root and fifth (plus the third, softly), held the whole bar.
    if (sp.pad !== false) for (const [d, v] of [[c, 0.9], [c + 4, 0.65], [c + 2, 0.45], [c + 6, 0.35]] as const) pad.push({ s: s0, m: fold(deg(d), PAD_CEIL), l: 16, v });
    // Drums
    if (sp.drums === 'reel') for (let k = 0; k < 8; k++) drums.push({ s: s0 + k * 2, k: k % 2 ? 'hat' : k % 4 === 0 ? 'kick' : 'snare', v: k % 2 ? 0.5 : 1 });
    if (sp.drums === 'march') { drums.push({ s: s0, k: 'kick' }, { s: s0 + 8, k: 'snare' }); for (let k = 0; k < 4; k++) drums.push({ s: s0 + k * 4 + 2, k: 'hat', v: 0.5 }); }
    if (sp.drums === 'drive') for (let k = 0; k < 16; k += 2) drums.push({ s: s0 + k, k: k % 8 === 0 ? 'kick' : k % 8 === 4 ? 'snare' : 'hat', v: k % 4 ? 0.5 : 1 });
    // Lo-fi: a soft thump on 1 and the and-of-3, a brushed snare on 2 and 4, a few lazy ghost brushes.
    if (sp.drums === 'lofi') {
      drums.push({ s: s0, k: 'thump' }, { s: s0 + 10, k: 'thump', v: 0.7 }, { s: s0 + 4, k: 'brush' }, { s: s0 + 12, k: 'brush' });
      for (const k of [2, 6, 14]) if (r() < 0.6) drums.push({ s: s0 + k, k: 'brush', v: 0.3 });
      if (b % 4 === 3 && r() < 0.6) drums.push({ s: s0 + 15, k: 'thump', v: 0.5 });
    }
    // The record's own sound: a few soft crackles every bar, on every track.
    for (let k = 0; k < 3; k++) if (r() < 0.8) drums.push({ s: s0 + Math.floor(r() * 16), k: 'crackle', v: 0.4 + r() * 0.6 });
    if (sp.drums === 'drips' && r() < 0.7) drums.push({ s: s0 + Math.floor(r() * 16), k: 'drip' });
    if (sp.drums === 'static' && b % 2 === 0) drums.push({ s: s0 + 8, k: 'static' });
    // Held-breath ambience: a slow heartbeat, tape hiss, crickets and the wind.
    if (sp.drums === 'ambient') {
      drums.push({ s: s0, k: 'heart' }, { s: s0 + 3, k: 'heart', v: 0.6 }, { s: s0, k: 'hiss' });
      if (b % 2 === 1) drums.push({ s: s0 + 6, k: 'wind' });
      for (let k = 0; k < 3; k++) if (r() < 0.55) drums.push({ s: s0 + Math.floor(r() * 16), k: 'cricket', v: 0.5 + r() * 0.5 });
    }
  });
  // Melody: an A A' B A phrase over 8 bars, chord tones on strong beats, stepwise in between.
  if (sp.melody !== 'none') {
    const rhythms = sp.melody === 'busy'
      ? [[0, 2, 4, 6, 8, 10, 12, 14], [0, 3, 4, 6, 8, 11, 12], [0, 2, 3, 4, 8, 10, 12]]
      : sp.melody === 'lyric' ? [[0, 4, 6, 8, 12], [0, 6, 8, 12], [0, 2, 4, 8]] : [[0, 8], [4, 12], [0]];
    const phrase = (bar: number, seed: number): Note[] => {
      const pr = rng(seed);
      const out: Note[] = [];
      const c = sp.prog[bar];
      const rh = rhythms[Math.floor(pr() * rhythms.length)];
      let cur = c + 7 + [0, 2, 4][Math.floor(pr() * 3)];
      rh.forEach((s, i) => {
        const next = rh[i + 1] ?? 16;
        if (s % 4 === 0) { const tones = [c + 7, c + 9, c + 11]; cur = tones.reduce((a, t) => (Math.abs(t - cur) < Math.abs(a - cur) ? t : a), tones[0]); }
        else cur += pr() < 0.5 ? 1 : -1;
        out.push({ s: bar * 16 + s, m: fold(deg(cur), MELODY_CEIL), l: Math.max(1, next - s - (sp.melody === 'busy' ? 0 : 1)) });
      });
      return out;
    };
    const motif = [sp.seed * 7 + 1, sp.seed * 7 + 2];
    for (let b = 0; b < bars; b++) {
      const half = b % 4;
      const section = Math.floor(b / 4);
      // Bars 0-1 state the motif, 4-5 repeat it, 2-3 / 6-7 answer.
      const seed = half < 2 ? motif[half] : sp.seed * 13 + b * 3 + section;
      mel.push(...phrase(b, seed));
    }
  }
  const voices: Voice[] = [];
  if (pad.length) voices.push({ wave: 'sine', gain: 0.07, notes: pad, pad: true, detune: 6 });
  if (bass.length) voices.push({ wave: 'triangle', gain: 0.5, notes: bass, pluck: sp.bass === 'boomchick' || sp.bass === 'pulse' });
  if (arp.length) voices.push({ wave: sp.arpWave ?? 'triangle', gain: sp.arp === 'roll' ? 0.13 : 0.14, notes: arp, pluck: true });
  if (mel.length) voices.push({ wave: sp.melodyWave ?? 'triangle', gain: sp.melodyGain ?? 0.18, notes: mel, pluck: sp.melody === 'busy', detune: 4 });
  return { bpm: sp.bpm, steps, voices, drums, swing: sp.swing ?? 0.18 };
}

const SPECS: Record<TrackId, Spec> = {
  // Moonlit mystery for the title screen: slow, low, a held breath.
  title: { seed: 3, bpm: 58, root: 50, mode: MINOR, prog: [0, 5, 3, 4, 0, 5, 3, 4], bass: 'drone', arp: 'sparse', melody: 'lyric', drums: 'none', melodyWave: 'sine', melodyGain: 0.2 },
  // Homestead in G: an unhurried banjo-ish roll on the porch.
  cabin: { seed: 11, bpm: 76, root: 55, mode: MAJOR, prog: [0, 5, 3, 4, 0, 5, 1, 4], bass: 'walk', arp: 'up', melody: 'lyric', drums: 'lofi', swing: 0.3, melodyWave: 'sine', melodyGain: 0.17 },
  // Town in C: a gentle stroll, brushes on the snare.
  town: { seed: 21, bpm: 82, root: 48, mode: MAJOR, prog: [0, 5, 3, 4, 0, 5, 3, 4], bass: 'walk', arp: 'up', melody: 'lyric', drums: 'lofi', swing: 0.3, melodyGain: 0.15 },
  // Lonely woods in A dorian.
  woods: { seed: 31, bpm: 68, root: 45, mode: DORIAN, prog: [0, 0, 3, 3, 0, 0, 6, 4], bass: 'drone', arp: 'sparse', melody: 'lyric', drums: 'none', melodyWave: 'sine', melodyGain: 0.2 },
  // Damp, dripping glades in E minor.
  bog: { seed: 41, bpm: 60, root: 52, mode: MINOR, prog: [0, 0, 5, 5, 3, 3, 4, 4], bass: 'drone', arp: 'up', melody: 'sparse', drums: 'drips', melodyWave: 'sine', melodyGain: 0.18 },
  // Radio Ridge: mixolydian, with static on the wind.
  ridge: { seed: 51, bpm: 66, root: 51, mode: MIXO, prog: [0, 6, 0, 6, 3, 6, 4, 4], bass: 'drone', arp: 'sparse', melody: 'sparse', drums: 'static', melodyWave: 'sine', melodyGain: 0.16 },
  // Night in the wilds: drone and far-off notes.
  night: { seed: 61, bpm: 52, root: 45, mode: MINOR, prog: [0, 0, 5, 5, 0, 0, 1, 1], bass: 'drone', arp: 'sparse', melody: 'none', drums: 'none', arpWave: 'sine' },
  // Cozy indoors: the stove ticking.
  interior: { seed: 71, bpm: 72, root: 53, mode: MAJOR, prog: [0, 3, 4, 0, 5, 3, 4, 0], bass: 'walk', arp: 'up', melody: 'lyric', drums: 'lofi', swing: 0.28, melodyWave: 'sine', melodyGain: 0.18 },
  // Encounters: not battle music. Through the camcorder you hold your breath: heartbeat, crickets, wind, tape hiss.
  encounter: { seed: 81, bpm: 60, root: 50, mode: MINOR, prog: [0, 0, 5, 5, 3, 3, 1, 1], bass: 'none', arp: 'sparse', melody: 'none', drums: 'ambient', arpWave: 'sine' },
  // The Deep Seam: a low drone, water dripping and a slow heartbeat. No melody.
  mine: { seed: 314, bpm: 50, root: 45, mode: MINOR, prog: [0, 0, 1, 1, 0, 0, 5, 5], bass: 'drone', arp: 'none', melody: 'none', drums: 'drips' },
  // Half the board OUT: the drone gets a slow arpeggio under it, a little warmth.
  mine_warm: { seed: 315, bpm: 54, root: 45, mode: DORIAN, prog: [0, 0, 3, 3, 0, 0, 4, 4], bass: 'drone', arp: 'sparse', melody: 'none', drums: 'drips', arpWave: 'sine' },
  // The seam sealed (and Memorial Night): a slow miners' hymn.
  mine_hymn: { seed: 316, bpm: 60, root: 50, mode: MAJOR, prog: [0, 3, 4, 0, 5, 3, 4, 0], bass: 'drone', arp: 'none', melody: 'lyric', drums: 'none', melodyWave: 'sine', melodyGain: 0.18 },
  // Folklore Festival: still a reel, but a fireside one.
  festival: { seed: 91, bpm: 92, root: 50, mode: MIXO, prog: [0, 0, 6, 6, 0, 0, 3, 4], bass: 'boomchick', arp: 'roll', melody: 'lyric', drums: 'lofi', swing: 0.25, melodyGain: 0.15 },
};

const loops = new Map<TrackId, Loop>();
const loopFor = (id: TrackId): Loop => { let l = loops.get(id); if (!l) { l = compose(SPECS[id]); loops.set(id, l); } return l; };

const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

class Music {
  enabled: boolean;
  private track: TrackId | null = null;
  private bus: GainNode | null = null;
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private noise: AudioBuffer | null = null;
  /** The warm filter and echo nodes of the playing track. */
  private fx: AudioNode[] = [];
  private lfo: OscillatorNode | null = null;
  /** Wow & flutter depth (cents), patched into every note's detune. */
  private wobble: GainNode | null = null;

  constructor() {
    let v: string | null = null;
    try { v = localStorage.getItem(MUSIC_KEY); } catch { /* ignore */ }
    this.enabled = v !== '0';
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    try { localStorage.setItem(MUSIC_KEY, on ? '1' : '0'); } catch { /* ignore */ }
    if (!on) this.stop();
  }

  /** Call every frame with the track that fits the moment; switches with a crossfade. */
  play(id: TrackId): void {
    if (!this.enabled || sfx.muted) { if (this.track) this.stop(); return; }
    const out = sfx.output();
    if (!out || out.ac.state !== 'running') return;
    if (id === this.track) return;
    this.stop();
    const { ac, dest } = out;
    if (!this.noise) {
      this.noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    this.bus = ac.createGain();
    this.bus.gain.setValueAtTime(0.0001, ac.currentTime);
    this.bus.gain.exponentialRampToValueAtTime(0.6, ac.currentTime + 2);
    // Warmth: roll off the top end, then a soft echo that dissolves into the dark.
    const warm = ac.createBiquadFilter();
    warm.type = 'lowpass'; warm.frequency.value = 1150; warm.Q.value = 0.5;
    // Tape: a soft saturation curve.
    const tape = ac.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) { const x = (i / (curve.length - 1)) * 2 - 1; curve[i] = Math.tanh(x * 1.6) / Math.tanh(1.6); }
    tape.curve = curve;
    // Wow & flutter: one slow wobble every note follows.
    const lfo = ac.createOscillator(), depth = ac.createGain();
    lfo.type = 'sine'; lfo.frequency.value = 0.45; depth.gain.value = 9; // cents
    lfo.connect(depth); lfo.start();
    this.wobble = depth;
    const delay = ac.createDelay(1.5), fb = ac.createGain(), wet = ac.createGain(), dark = ac.createBiquadFilter();
    delay.delayTime.value = Math.min(1.2, (60 / loopFor(id).bpm) * 0.75); // a dotted eighth
    fb.gain.value = 0.38; wet.gain.value = 0.32;
    dark.type = 'lowpass'; dark.frequency.value = 900;
    this.bus.connect(tape); tape.connect(warm);
    warm.connect(dest);
    warm.connect(delay); delay.connect(dark); dark.connect(fb); fb.connect(delay); dark.connect(wet); wet.connect(dest);
    this.fx = [warm, delay, fb, wet, dark, tape, depth];
    this.lfo = lfo;
    this.track = id;
    this.step = 0;
    this.nextTime = ac.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 30);
  }

  stop(): void {
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
    const out = sfx.output();
    if (this.bus && out) {
      const b = this.bus;
      b.gain.cancelScheduledValues(out.ac.currentTime);
      b.gain.setTargetAtTime(0.0001, out.ac.currentTime, 0.25);
      const fx = this.fx, lfo = this.lfo;
      setTimeout(() => { b.disconnect(); for (const n of fx) n.disconnect(); lfo?.stop(); lfo?.disconnect(); }, 4000);
    }
    this.fx = []; this.lfo = null; this.wobble = null;
    this.bus = null;
    this.track = null;
  }

  private schedule(): void {
    const out = sfx.output();
    if (!out || !this.bus || !this.track) return;
    const { ac } = out;
    const loop = loopFor(this.track);
    const stepDur = 60 / loop.bpm / 4;
    if (this.nextTime < ac.currentTime - 0.5) this.nextTime = ac.currentTime + 0.05; // tab was asleep
    while (this.nextTime < ac.currentTime + 0.15) {
      const s = this.step % loop.steps;
      // Swing: the off-beat sixteenths land late, lazily.
      const at = this.nextTime + (s % 2 === 1 ? loop.swing * stepDur : 0);
      for (const v of loop.voices) for (const n of v.notes) if (n.s === s) this.note(ac, v, n, at, stepDur);
      for (const d of loop.drums) if (d.s === s) this.drum(ac, d.k, d.v ?? 1, at);
      this.step++;
      this.nextTime += stepDur;
    }
  }

  private note(ac: AudioContext, v: Voice, n: Note, t: number, stepDur: number): void {
    if (!this.bus) return;
    const dur = n.l * stepDur;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = v.wave;
    o.frequency.setValueAtTime(midiHz(n.m), t);
    if (v.detune) o.detune.setValueAtTime(v.detune, t);
    const wob = this.wobble;
    if (wob) { wob.connect(o.detune); o.onended = () => { try { wob.disconnect(o.detune); } catch { /* already gone */ } }; }
    const peak = v.gain * (n.v ?? 1);
    g.gain.setValueAtTime(0.0001, t);
    if (v.pad) {
      // Swell in, hold, and fade out over the next bar's swell.
      g.gain.exponentialRampToValueAtTime(peak, t + Math.min(1.2, dur * 0.4));
      g.gain.setValueAtTime(peak, t + dur * 0.8);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.6);
      o.connect(g).connect(this.bus);
      o.start(t); o.stop(t + dur + 0.7);
      return;
    }
    g.gain.exponentialRampToValueAtTime(peak, t + (v.pluck ? 0.012 : 0.06));
    if (v.pluck) g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.35, Math.min(dur * 1.4, 0.8)));
    else { g.gain.setValueAtTime(peak, t + Math.max(0.08, dur - 0.14)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12); }
    o.connect(g).connect(this.bus);
    o.start(t); o.stop(t + Math.max(dur, 0.8) + 0.2);
  }

  private drum(ac: AudioContext, k: Drum, vol: number, t: number): void {
    if (!this.bus) return;
    if (k === 'heart') {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(104, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.16);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32 * vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g).connect(this.bus); o.start(t); o.stop(t + 0.22);
      return;
    }
    if (k === 'cricket') {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(2900, t);
      g.gain.setValueAtTime(0.0001, t);
      for (let i = 0; i < 3; i++) { const t0 = t + i * 0.055; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.012 * vol, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.035); }
      o.connect(g).connect(this.bus); o.start(t); o.stop(t + 0.2);
      return;
    }
    if (k === 'thump') {
      // A muffled lo-fi kick: low sine, slow fall, no click.
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(92, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.18);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.42 * vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g).connect(this.bus); o.start(t); o.stop(t + 0.32);
      return;
    }
    if (k === 'kick' || k === 'drip') {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = k === 'kick' ? 'sine' : 'triangle';
      o.frequency.setValueAtTime(k === 'kick' ? 110 : 880, t);
      o.frequency.exponentialRampToValueAtTime(k === 'kick' ? 45 : 380, t + (k === 'kick' ? 0.14 : 0.1));
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime((k === 'kick' ? 0.4 : 0.09) * vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      o.connect(g).connect(this.bus); o.start(t); o.stop(t + 0.16);
      return;
    }
    if (!this.noise) return;
    const src = ac.createBufferSource(); src.buffer = this.noise;
    const f = ac.createBiquadFilter(), g = ac.createGain();
    const len = k === 'crackle' ? 0.012 : k === 'brush' ? 0.22 : k === 'hat' ? 0.05 : k === 'snare' ? 0.16 : k === 'wind' ? 2.6 : k === 'hiss' ? 0.95 : 0.5;
    f.type = k === 'hat' || k === 'hiss' ? 'highpass' : k === 'wind' || k === 'brush' || k === 'crackle' ? 'lowpass' : 'bandpass';
    f.frequency.setValueAtTime(k === 'hat' ? 3200 : k === 'hiss' ? 3500 : k === 'wind' ? 320 : k === 'snare' ? 1000 : k === 'brush' ? 1400 : k === 'crackle' ? 1800 : 1600, t);
    if (k === 'static') f.frequency.exponentialRampToValueAtTime(400, t + len);
    if (k === 'wind') f.frequency.exponentialRampToValueAtTime(640, t + len * 0.5);
    const peak = (k === 'crackle' ? 0.03 : k === 'brush' ? 0.045 : k === 'hat' ? 0.025 : k === 'snare' ? 0.06 : k === 'wind' ? 0.08 : k === 'hiss' ? 0.008 : 0.035) * vol;
    const attack = k === 'wind' ? len * 0.45 : k === 'hiss' ? 0.2 : k === 'brush' ? 0.03 : 0.002;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    if (k === 'wind' || k === 'hiss') src.loop = true;
    src.connect(f).connect(g).connect(this.bus); src.start(t, Math.random() * 0.5); src.stop(t + len + 0.02);
  }
}

export const music = new Music();

/** Lowest and highest note (MIDI) a track plays, by voice: for checking the score stays low. */
export function trackRange(id: TrackId): Record<string, [number, number]> {
  const out: Record<string, [number, number]> = {};
  loopFor(id).voices.forEach((v, i) => {
    const ms = v.notes.map((n) => n.m);
    out[v.pad ? 'pad' : i === 0 || v.wave === 'triangle' && v.gain >= 0.5 ? 'bass' : `v${i}`] = [Math.min(...ms), Math.max(...ms)];
  });
  return out;
}
