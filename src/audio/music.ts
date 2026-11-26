/**
 * Procedural chiptune background music (no audio files). Each track is a short
 * loop composed in code from a scale, a chord progression and a seeded melody,
 * then played by a small look-ahead Web Audio scheduler. Tracks crossfade as
 * you move between regions, times of day and encounters.
 */
import { sfx } from './sfx';

export type TrackId = 'title' | 'cabin' | 'town' | 'woods' | 'bog' | 'ridge' | 'night' | 'interior' | 'encounter' | 'festival';

interface Note { s: number; m: number; l: number; v?: number }
interface Voice { wave: OscillatorType; gain: number; notes: Note[]; pluck?: boolean; detune?: number }
type Drum = 'kick' | 'snare' | 'hat' | 'static' | 'drip';
interface Loop { bpm: number; steps: number; voices: Voice[]; drums: Array<{ s: number; k: Drum; v?: number }> }

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
  drums: 'reel' | 'march' | 'drive' | 'none' | 'drips' | 'static';
  melodyWave?: OscillatorType; arpWave?: OscillatorType; melodyGain?: number;
}

/** Compose an 8-bar (128-step) loop from a spec. */
function compose(sp: Spec): Loop {
  const r = rng(sp.seed);
  const deg = scaleFn(sp.root, sp.mode);
  // Bass one octave down, but never below G2 (~98 Hz): phone speakers can't play much lower.
  const low = (d: number) => { let m = deg(d - 7); while (m < 43) m += 12; return m; };
  const bars = sp.prog.length, steps = bars * 16;
  const bass: Note[] = [], arp: Note[] = [], mel: Note[] = [];
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
    if (sp.arp === 'roll') for (let k = 0; k < 16; k++) arp.push({ s: s0 + k, m: deg(chord[[0, 1, 2, 1, 0, 2, 1, 2][k % 8]] + 7), l: 1, v: k % 4 === 0 ? 1 : 0.7 });
    if (sp.arp === 'up') for (let k = 0; k < 8; k++) arp.push({ s: s0 + k * 2, m: deg(chord[k % 3] + 7), l: 2 });
    if (sp.arp === 'sparse') for (const k of [0, 6, 10]) arp.push({ s: s0 + k, m: deg(chord[Math.floor(r() * 3)] + 14), l: 6, v: 0.6 });
    // Drums
    if (sp.drums === 'reel') for (let k = 0; k < 8; k++) drums.push({ s: s0 + k * 2, k: k % 2 ? 'hat' : k % 4 === 0 ? 'kick' : 'snare', v: k % 2 ? 0.5 : 1 });
    if (sp.drums === 'march') { drums.push({ s: s0, k: 'kick' }, { s: s0 + 8, k: 'snare' }); for (let k = 0; k < 4; k++) drums.push({ s: s0 + k * 4 + 2, k: 'hat', v: 0.5 }); }
    if (sp.drums === 'drive') for (let k = 0; k < 16; k += 2) drums.push({ s: s0 + k, k: k % 8 === 0 ? 'kick' : k % 8 === 4 ? 'snare' : 'hat', v: k % 4 ? 0.5 : 1 });
    if (sp.drums === 'drips' && r() < 0.7) drums.push({ s: s0 + Math.floor(r() * 16), k: 'drip' });
    if (sp.drums === 'static' && b % 2 === 0) drums.push({ s: s0 + 8, k: 'static' });
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
        out.push({ s: bar * 16 + s, m: deg(cur), l: Math.max(1, next - s - (sp.melody === 'busy' ? 0 : 1)) });
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
  if (bass.length) voices.push({ wave: 'triangle', gain: 0.5, notes: bass, pluck: sp.bass === 'boomchick' || sp.bass === 'pulse' });
  if (arp.length) voices.push({ wave: sp.arpWave ?? 'square', gain: sp.arp === 'roll' ? 0.09 : 0.1, notes: arp, pluck: true });
  if (mel.length) voices.push({ wave: sp.melodyWave ?? 'square', gain: sp.melodyGain ?? 0.13, notes: mel, pluck: sp.melody === 'busy', detune: 4 });
  return { bpm: sp.bpm, steps, voices, drums };
}

const SPECS: Record<TrackId, Spec> = {
  // Moonlit mystery for the title screen.
  title: { seed: 3, bpm: 78, root: 50, mode: MINOR, prog: [0, 5, 3, 4, 0, 5, 3, 4], bass: 'drone', arp: 'up', melody: 'lyric', drums: 'none', arpWave: 'triangle', melodyWave: 'triangle', melodyGain: 0.22 },
  // Banjo-roll homestead tune in G.
  cabin: { seed: 11, bpm: 112, root: 55, mode: MAJOR, prog: [0, 0, 3, 0, 0, 4, 0, 0], bass: 'boomchick', arp: 'roll', melody: 'lyric', drums: 'none' },
  // Jaunty town in C.
  town: { seed: 21, bpm: 120, root: 60, mode: MAJOR, prog: [0, 5, 3, 4, 0, 5, 3, 4], bass: 'walk', arp: 'up', melody: 'busy', drums: 'march', melodyGain: 0.11 },
  // Lonely woods in A dorian.
  woods: { seed: 31, bpm: 92, root: 57, mode: DORIAN, prog: [0, 0, 3, 3, 0, 0, 6, 4], bass: 'drone', arp: 'sparse', melody: 'lyric', drums: 'none', melodyWave: 'triangle', melodyGain: 0.2 },
  // Damp, dripping bog in E minor.
  bog: { seed: 41, bpm: 80, root: 52, mode: MINOR, prog: [0, 0, 5, 5, 3, 3, 4, 4], bass: 'drone', arp: 'up', melody: 'sparse', drums: 'drips', arpWave: 'triangle', melodyWave: 'triangle', melodyGain: 0.2 },
  // Radio Ridge: mixolydian, with static bursts.
  ridge: { seed: 51, bpm: 88, root: 51, mode: MIXO, prog: [0, 6, 0, 6, 3, 6, 4, 4], bass: 'pulse', arp: 'sparse', melody: 'sparse', drums: 'static', melodyGain: 0.1 },
  // Night in the wilds: drone and far-off notes.
  night: { seed: 61, bpm: 60, root: 45, mode: MINOR, prog: [0, 0, 5, 5, 0, 0, 1, 1], bass: 'drone', arp: 'sparse', melody: 'none', drums: 'none', arpWave: 'triangle' },
  // Cozy indoors.
  interior: { seed: 71, bpm: 96, root: 53, mode: MAJOR, prog: [0, 3, 4, 0, 5, 3, 4, 0], bass: 'walk', arp: 'up', melody: 'lyric', drums: 'none', arpWave: 'triangle', melodyWave: 'triangle', melodyGain: 0.2 },
  // Tense encounter loop.
  encounter: { seed: 81, bpm: 138, root: 50, mode: MINOR, prog: [0, 0, 5, 5, 3, 3, 4, 4], bass: 'pulse', arp: 'up', melody: 'busy', drums: 'drive', melodyGain: 0.1 },
  // Folklore Festival fiddle reel.
  festival: { seed: 91, bpm: 132, root: 62, mode: MIXO, prog: [0, 0, 6, 6, 0, 0, 3, 4], bass: 'boomchick', arp: 'roll', melody: 'busy', drums: 'reel', melodyGain: 0.11 },
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
    this.bus.gain.exponentialRampToValueAtTime(0.55, ac.currentTime + 1.2);
    this.bus.connect(dest);
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
      setTimeout(() => b.disconnect(), 1500);
    }
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
      for (const v of loop.voices) for (const n of v.notes) if (n.s === s) this.note(ac, v, n, this.nextTime, stepDur);
      for (const d of loop.drums) if (d.s === s) this.drum(ac, d.k, d.v ?? 1, this.nextTime);
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
    const peak = v.gain * (n.v ?? 1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + (v.pluck ? 0.005 : 0.03));
    if (v.pluck) g.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(dur, 0.32));
    else { g.gain.setValueAtTime(peak, t + Math.max(0.04, dur - 0.08)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
    o.connect(g).connect(this.bus);
    o.start(t); o.stop(t + dur + 0.05);
  }

  private drum(ac: AudioContext, k: Drum, vol: number, t: number): void {
    if (!this.bus) return;
    if (k === 'kick' || k === 'drip') {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = k === 'kick' ? 'sine' : 'triangle';
      o.frequency.setValueAtTime(k === 'kick' ? 130 : 1400, t);
      o.frequency.exponentialRampToValueAtTime(k === 'kick' ? 45 : 600, t + (k === 'kick' ? 0.12 : 0.08));
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime((k === 'kick' ? 0.5 : 0.12) * vol, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      o.connect(g).connect(this.bus); o.start(t); o.stop(t + 0.16);
      return;
    }
    if (!this.noise) return;
    const src = ac.createBufferSource(); src.buffer = this.noise;
    const f = ac.createBiquadFilter(), g = ac.createGain();
    const len = k === 'hat' ? 0.03 : k === 'snare' ? 0.1 : 0.5;
    f.type = k === 'hat' ? 'highpass' : 'bandpass';
    f.frequency.setValueAtTime(k === 'hat' ? 7000 : k === 'snare' ? 1800 : 2500, t);
    if (k === 'static') f.frequency.exponentialRampToValueAtTime(600, t + len);
    const peak = (k === 'hat' ? 0.06 : k === 'snare' ? 0.12 : 0.05) * vol;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(f).connect(g).connect(this.bus); src.start(t, Math.random() * 0.5); src.stop(t + len + 0.02);
  }
}

export const music = new Music();
