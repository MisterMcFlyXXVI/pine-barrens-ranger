/** localStorage save / load. Only deltas from the generated maps are stored. */
import type { Stack } from './inventory';
import type { PlotState } from './world';
import type { MapId } from '../data/maps';
import type { Dir } from '../util';
import type { Look } from '../graphics/playerSprite';

export const SAVE_KEY = 'pbr_save_v1';
export const SAVE_VERSION = 1;

export interface MapSave {
  removed: number[];
  forage: Array<[number, string]>;
  plots: PlotState[];
  hp: Array<[number, number]>;
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
  wardrobe: string[];
  map: MapId;
  px: number;
  py: number;
  dir: Dir;
  maps: Partial<Record<MapId, MapSave>>;
  shipped: Stack[];
  stats: Stats;
  mailRead: number;
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
    localStorage.setItem(SAVE_KEY, JSON.stringify(d));
    return true;
  } catch {
    return false;
  }
}

export function deleteSave(): void {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}
