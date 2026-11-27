/**
 * Player settings: text speed, music and sound-effect volume, screen shake.
 * Kept in localStorage (per device) and copied into saves, so a save loaded on a
 * fresh device brings its settings along.
 */
export type TextSpeed = 'slow' | 'normal' | 'fast' | 'instant';

export interface Settings {
  textSpeed: TextSpeed;
  /** 0-100 */
  music: number;
  /** 0-100 */
  sfx: number;
  shake: boolean;
}

const KEY = 'pbr_settings';
export const DEFAULT_SETTINGS: Settings = { textSpeed: 'normal', music: 80, sfx: 80, shake: true };
export const TEXT_SPEEDS: readonly TextSpeed[] = ['slow', 'normal', 'fast', 'instant'];

let current: Settings = load();
let hadLocal = current !== DEFAULT_SETTINGS;
const listeners: Array<(s: Settings) => void> = [];

function clamp(n: unknown, d: number): number {
  return typeof n === 'number' && isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : d;
}

function sanitize(s: Partial<Settings> | null | undefined): Settings {
  const d = DEFAULT_SETTINGS;
  return {
    textSpeed: TEXT_SPEEDS.includes(s?.textSpeed as TextSpeed) ? (s!.textSpeed as TextSpeed) : d.textSpeed,
    music: clamp(s?.music, d.music),
    sfx: clamp(s?.sfx, d.sfx),
    shake: typeof s?.shake === 'boolean' ? s.shake : d.shake,
  };
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return sanitize(JSON.parse(raw) as Partial<Settings>);
  } catch { /* storage blocked or bad JSON */ }
  return DEFAULT_SETTINGS;
}

export function settings(): Settings { return current; }

export function setSettings(next: Partial<Settings>): void {
  current = sanitize({ ...current, ...next });
  hadLocal = true;
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* ignore */ }
  for (const f of listeners) f(current);
}

/** A save brought settings from another device: use them only if this device has none yet. */
export function adoptSaveSettings(s: Partial<Settings> | undefined): void {
  if (s && !hadLocal) setSettings(s);
}

export function onSettings(f: (s: Settings) => void): void { listeners.push(f); f(current); }

/** Characters per second for typewriter text (Infinity = instant). */
export function textRate(base: number): number {
  switch (current.textSpeed) {
    case 'slow': return base * 0.55;
    case 'fast': return base * 1.9;
    case 'instant': return Infinity;
    default: return base;
  }
}
