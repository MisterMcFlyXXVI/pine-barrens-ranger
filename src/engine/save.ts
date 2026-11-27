/** localStorage save / load. Only deltas from the generated maps are stored. */
import type { Appearance } from '../data/appearance';
import type { Stack } from './inventory';
import type { PlotState } from './world';
import type { MapId } from '../data/maps';
import type { Dir } from '../util';
import type { Look } from '../graphics/playerSprite';
import type { Dex, Kit } from './dex';
import type { ProgressSave } from './progress';

export const SAVE_KEY = 'pbr_save_v1';
export const SAVE_VERSION = 1;

export interface MapSave {
  removed: number[];
  forage: Array<[number, string]>;
  plots: PlotState[];
  hp: Array<[number, number]>;
  /** Player-placed lure mounts (Phase 2+). */
  placed?: Array<[number, number]>;
  /** Snare traps and what's in them ('' = empty). */
  snares?: Array<[number, string]>;
  /** Pocket Map fog of war (bit-packed, base64). */
  seen?: string;
}

export interface Stats {
  harvested: number;
  shippedGold: number;
  tilled: number;
  cleared: number;
  foraged: number;
  daysPlayed: number;
}

export interface SaveData {
  v: number;
  day: number;
  minutes: number;
  gold: number;
  stamina: number;
  water: number;
  inv: Array<Stack | null>;
  sel: number;
  look: Look;
  /** Character creator choices (older saves have none: the creator opens once). */
  appearance?: Appearance;
  wardrobe: string[];
  map: MapId;
  px: number;
  py: number;
  dir: Dir;
  maps: Partial<Record<MapId, MapSave>>;
  shipped: Stack[];
  stats: Stats;
  mailRead: number;
  // Phase 2 (optional so Phase 1 saves still load)
  dex?: Partial<Dex>;
  kit?: Partial<Kit>;
  wispNight?: number;
  lunarNight?: number;
  // Phase 3
  progress?: Partial<ProgressSave>;
  /** Cabin Storage Crate contents. */
  storage?: Array<Stack | null>;
  /** Materials list (recipe id + how many wanted). */
  needs?: Array<{ recipe: string; qty: number }>;
  /** When this save was written (ms since epoch). */
  savedAt?: number;
}

export function hasSave(): boolean {
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
}

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as SaveData;
    if (d.v !== SAVE_VERSION) return null;
    return d;
  } catch {
    return null;
  }
}

export function writeSave(d: SaveData): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...d, savedAt: Date.now() }));
    clearResume(); // the real save is now the newest
    return true;
  } catch {
    return false;
  }
}

/* ---- Quick-resume snapshot: taken when the app is hidden/closed, kept separate from the real save ---- */
export const RESUME_KEY = 'pbr_resume_v1';

export function writeResume(d: SaveData): void {
  try { localStorage.setItem(RESUME_KEY, JSON.stringify({ ...d, savedAt: Date.now() })); } catch { /* storage full or blocked */ }
}

/** The snapshot, but only if it's newer than the real save. */
export function loadResume(): SaveData | null {
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as SaveData;
    if (d.v !== SAVE_VERSION || typeof d.day !== 'number') return null;
    const main = loadSave();
    if (main && (main.savedAt ?? 0) >= (d.savedAt ?? 0)) return null;
    return d;
  } catch {
    return null;
  }
}

export function clearResume(): void {
  try { localStorage.removeItem(RESUME_KEY); } catch { /* ignore */ }
}

export function deleteSave(): void {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}
