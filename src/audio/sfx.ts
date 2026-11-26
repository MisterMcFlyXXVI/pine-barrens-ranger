/**
 * Procedural chiptune SFX — pure Web Audio API (square / triangle / filtered
 * noise). No audio files. Call `unlock()` from a user gesture first.
 */
export type Surface = 'grass' | 'wood' | 'bog' | 'sand';

const MUTE_KEY = 'pbr_muted';

type Wave = OscillatorType;

class Sfx {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  muted: boolean;
  private stepFlip = false;

  constructor() {
    let m = false;
    try { m = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* storage may be blocked */ }
    this.muted = m;
  }

  /** Must be called from a user gesture (key / pointer) to satisfy autoplay rules. */
  unlock(): void {
    if (!this.ac) {
      const w = window as unknown as { webkitAudioContext?: typeof AudioContext };
      const Ctor = window.AudioContext ?? w.webkitAudioContext;
      if (!Ctor) return;
      this.ac = new Ctor();
      this.master = this.ac.createGain();
      this.master.gain.value = this.muted ? 0 : 0.42;
      this.master.connect(this.ac.destination);
      const len = this.ac.sampleRate;
      this.noiseBuf = this.ac.createBuffer(1, len, this.ac.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ac.state === 'suspended') void this.ac.resume();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    try { localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0'); } catch { /* ignore */ }
    if (this.master && this.ac) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.42, this.ac.currentTime, 0.02);
    return this.muted;
  }

  /** Shared output for the music engine (muting the master silences both). */
  output(): { ac: AudioContext; dest: AudioNode } | null {
    return this.ac && this.master ? { ac: this.ac, dest: this.master } : null;
  }

  private ready(): AudioContext | null {
    if (!this.ac || !this.master || this.muted) return null;
    return this.ac;
  }

  private tone(type: Wave, f0: number, f1: number, dur: number, vol: number, delay = 0): void {
    const ac = this.ready();
    if (!ac || !this.master) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol: number, type: BiquadFilterType, f0: number, f1 = f0, q = 1, delay = 0): void {
    const ac = this.ready();
    if (!ac || !this.master || !this.noiseBuf) return;
    const t = ac.currentTime + delay;
    const src = ac.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ac.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  /* ---- movement ---- */
  step(surface: Surface): void {
    this.stepFlip = !this.stepFlip;
    const v = this.stepFlip ? 1 : 0.85;
    switch (surface) {
      case 'grass':
        this.noise(0.05, 0.09 * v, 'bandpass', 2400 * v, 1400, 1.2);
        break;
      case 'sand':
        this.noise(0.06, 0.08 * v, 'highpass', 3200, 2000, 0.8);
        break;
      case 'wood':
        this.tone('triangle', 190 * v, 120, 0.05, 0.12);
        this.noise(0.025, 0.05, 'highpass', 3000);
        break;
      case 'bog':
        this.noise(0.12, 0.12, 'lowpass', 900, 220, 4);
        this.tone('sine', 110 * v, 60, 0.1, 0.1, 0.02);
        break;
    }
  }

  /** Knock knock. */
  knock(): void { this.noise(0.05, 0.12, 'lowpass', 400, 200, 3); this.noise(0.05, 0.12, 'lowpass', 400, 200, 3, 0.16); }
  /** A frog hopping into the water. */
  plop(): void { this.tone('triangle', 620, 180, 0.09, 0.07); this.noise(0.08, 0.05, 'bandpass', 900, 400, 2, 0.03); }
  /** Porch wind chimes. */
  chimes(): void { for (const [k, f] of [[0, 1568], [1, 1976], [2, 1760], [3, 2349]] as const) this.tone('triangle', f, f, 0.5, 0.025, k * 0.11 + Math.random() * 0.05); }
  bump(): void { this.tone('square', 90, 70, 0.06, 0.05); }

  rustle(): void {
    this.noise(0.18, 0.08, 'bandpass', 3800, 1800, 2);
    this.noise(0.12, 0.05, 'bandpass', 2600, 4200, 2, 0.06);
  }

  /* ---- tools ---- */
  swing(): void { this.noise(0.12, 0.08, 'bandpass', 600, 2600, 1.5); }

  till(): void {
    this.tone('square', 120, 60, 0.08, 0.1);
    this.noise(0.14, 0.14, 'lowpass', 700, 200, 1);
  }

  water(): void {
    this.noise(0.28, 0.09, 'highpass', 2500, 5000, 0.7);
    for (let i = 0; i < 4; i++) this.tone('triangle', 900 + Math.random() * 700, 600, 0.05, 0.05, 0.03 + i * 0.05);
  }

  refill(): void {
    for (let i = 0; i < 5; i++) this.tone('sine', 220 + i * 70, 330 + i * 90, 0.09, 0.1, i * 0.07);
    this.noise(0.4, 0.05, 'lowpass', 600, 1400, 2);
  }

  chop(): void {
    this.tone('square', 320, 140, 0.06, 0.1);
    this.noise(0.08, 0.12, 'bandpass', 2600, 1200, 2);
  }

  rockHit(): void {
    this.tone('square', 560, 500, 0.04, 0.08);
    this.tone('triangle', 1400, 1200, 0.12, 0.06, 0.01);
    this.noise(0.05, 0.08, 'highpass', 4000);
  }

  crumble(): void {
    this.noise(0.3, 0.16, 'lowpass', 1400, 200, 1);
    this.tone('square', 140, 50, 0.2, 0.08);
  }

  plant(): void {
    this.tone('triangle', 420, 640, 0.06, 0.12);
    this.tone('triangle', 640, 860, 0.06, 0.1, 0.06);
    this.noise(0.06, 0.05, 'lowpass', 800);
  }

  harvest(): void {
    this.tone('sine', 220, 880, 0.08, 0.14);
    [523, 659, 784].forEach((f, i) => this.tone('square', f, f, 0.06, 0.06, 0.06 + i * 0.05));
  }

  coin(): void {
    this.tone('square', 988, 988, 0.06, 0.07);
    this.tone('square', 1319, 1319, 0.14, 0.07, 0.06);
  }

  eat(): void {
    for (let i = 0; i < 3; i++) this.noise(0.05, 0.1, 'bandpass', 1200 + i * 200, 800, 3, i * 0.11);
    this.tone('triangle', 520, 780, 0.1, 0.08, 0.36);
  }

  /* ---- UI ---- */
  blip(): void { this.tone('square', 880, 880, 0.03, 0.05); }
  type(): void { this.tone('square', 1200 + Math.random() * 120, 1200, 0.015, 0.025); }
  confirm(): void { this.tone('square', 660, 660, 0.05, 0.07); this.tone('square', 990, 990, 0.08, 0.07, 0.05); }
  cancel(): void { this.tone('square', 520, 520, 0.05, 0.06); this.tone('square', 350, 350, 0.08, 0.06, 0.05); }
  error(): void { this.tone('square', 140, 120, 0.16, 0.08); this.tone('square', 147, 125, 0.16, 0.05); }
  open(): void { this.tone('triangle', 330, 660, 0.08, 0.1); }
  door(): void { this.noise(0.18, 0.1, 'lowpass', 500, 180, 2); this.tone('triangle', 160, 110, 0.12, 0.1, 0.04); }

  sleep(): void {
    [392, 330, 262, 196].forEach((f, i) => this.tone('triangle', f, f, 0.32, 0.1, i * 0.24));
  }

  morning(): void {
    [262, 330, 392, 523, 659].forEach((f, i) => this.tone('triangle', f, f, 0.22, 0.09, i * 0.12));
    this.tone('square', 784, 784, 0.3, 0.04, 0.62);
  }

  /* ---- ambience ---- */
  cricket(): void {
    for (let i = 0; i < 3; i++) this.tone('sine', 4200, 4100, 0.025, 0.02, i * 0.05);
  }

  bird(): void {
    const b = 1800 + Math.random() * 900;
    this.tone('sine', b, b * 1.4, 0.07, 0.03);
    this.tone('sine', b * 1.2, b * 0.9, 0.09, 0.025, 0.1);
  }

  thunder(): void {
    this.noise(1.6, 0.3, 'lowpass', 420, 60, 0.7);
    this.noise(0.9, 0.18, 'lowpass', 900, 120, 1, 0.08);
  }

  rain(): void {
    for (let i = 0; i < 4; i++) this.noise(0.05, 0.03, 'highpass', 4000 + Math.random() * 2000, 3000, 1, Math.random() * 0.4);
  }

  wade(): void {
    this.noise(0.18, 0.1, 'bandpass', 900, 300, 2);
    this.tone('sine', 300, 180, 0.08, 0.05, 0.04);
  }

  shake(): void {
    this.noise(0.3, 0.1, 'bandpass', 2600, 1200, 1.5);
    this.tone('triangle', 200, 120, 0.1, 0.06, 0.18);
  }

  summon(): void {
    [196, 233, 185, 147].forEach((f, i) => this.tone('triangle', f, f * 0.98, 0.4, 0.09, i * 0.22));
    this.noise(1.2, 0.06, 'bandpass', 300, 900, 4, 0.2);
  }

  /* ---- encounter cues ---- */
  alert(): void { this.tone('square', 880, 1760, 0.06, 0.09); this.tone('square', 1760, 1760, 0.1, 0.07, 0.07); }
  shutter(): void { this.noise(0.04, 0.2, 'highpass', 5000); this.tone('square', 2000, 400, 0.05, 0.06, 0.04); }
  trustChime(): void { [784, 988, 1175].forEach((f, i) => this.tone('triangle', f, f, 0.2, 0.08, i * 0.07)); }
  fanfare(): void {
    [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone('square', f, f, i === 7 ? 0.5 : 0.11, 0.07, i * 0.11));
  }
}

export const sfx = new Sfx();
