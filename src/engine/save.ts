/** localStorage save / load. Only deltas from the generated maps are stored. */
import type { Settings } from './settings';
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
  /** Map size when saved: if a room has since been rebuilt to a new size, tile indices no longer line up. */
  w?: number;
  h?: number;
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
  /** Settings travel with the save to a new device. */
  settings?: Partial<Settings>;
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
  /** The yard's Root Cellar (homestead decoration). */
  cellar?: Array<Stack | null>;
  /** Materials list (recipe id + how many wanted). */
  needs?: Array<{ recipe: string; qty: number }>;
  /** When this save was written (ms since epoch). */
  savedAt?: number;
}

export function hasSave(): boolean {
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
}

/**
 * Does this look like a save the game can open? Every save the game has ever
 * written has these; anything missing them is damaged (or not a save at all).
 * Optional fields that older saves lack are filled in by Game.loadGame.
 */
export function isPlayableSave(d: unknown): d is SaveData {
  if (!d || typeof d !== 'object') return false;
  const s = d as Partial<SaveData>;
  return s.v === SAVE_VERSION && typeof s.day === 'number' && typeof s.minutes === 'number' && typeof s.map === 'string'
    && Array.isArray(s.inv) && Array.isArray(s.wardrobe) && !!s.maps && typeof s.maps === 'object'
    && !!s.look && typeof s.look === 'object' && typeof s.dir === 'string';
}

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d: unknown = JSON.parse(raw);
    return isPlayableSave(d) ? d : null;
  } catch {
    return null;
  }
}

/** A save is on this device but can't be opened (kept, never deleted). */
export function damagedSave(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    return !isPlayableSave(JSON.parse(raw));
  } catch {
    return true;
  }
}

export function writeSave(d: SaveData): boolean {
  try {
    // Never write over a damaged save without keeping a copy of it.
    if (damagedSave()) { const old = localStorage.getItem(SAVE_KEY); if (old) localStorage.setItem(`${SAVE_KEY}_damaged`, old); }
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
    const d: unknown = JSON.parse(raw);
    if (!isPlayableSave(d)) return null;
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
