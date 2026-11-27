/**
 * Fishing, trapping & hunting rules (the mini-game overlays live in src/ui/outdoors.ts).
 */
import type { MapRuntime } from './world';
import type { MapId } from '../data/maps';
import { O, T } from '../data/tiles';

/* ------------------------------------------------------------------ */
/* Snares                                                              */
/* ------------------------------------------------------------------ */

/** Overnight: each empty snare may catch something. Grouse only in the deep woods. */
export function checkSnares(m: MapRuntime): void {
  for (const [i, caught] of m.snares) {
    if (caught || m.objects[i] !== O.SNARE) continue;
    if (Math.random() > 0.55) continue;
    const r = Math.random();
    const woods = m.id === 'OLD_GROWTH_AND_SAWMILL' || m.id === 'RADIO_RIDGE_AND_CROSSROADS';
    m.snares.set(i, woods && r < 0.15 ? 'grouse' : r < 0.6 ? 'cottontail' : 'squirrel');
  }
}

/* ------------------------------------------------------------------ */
/* Fishing                                                             */
/* ------------------------------------------------------------------ */

export type Water = 'creek' | 'lake' | 'deep' | 'cave';

export interface FishDef { id: string; weight: number; hits: number; speed: number; zone: number; night?: boolean }

/** What bites where. `hits` = good reels needed, `zone` = sweet-spot width (0..1), `speed` = marker speed. */
export const FISH: Record<Water, FishDef[]> = {
  creek: [
    { id: 'brook_trout', weight: 5, hits: 2, speed: 1.2, zone: 0.26 },
    { id: 'creek_chub', weight: 6, hits: 1, speed: 0.9, zone: 0.34 },
  ],
  lake: [
    { id: 'smallmouth_bass', weight: 5, hits: 2, speed: 1.3, zone: 0.24 },
    { id: 'creek_chub', weight: 3, hits: 1, speed: 0.9, zone: 0.34 },
    { id: 'channel_catfish', weight: 5, hits: 3, speed: 1.0, zone: 0.26, night: true },
  ],
  deep: [
    { id: 'smallmouth_bass', weight: 4, hits: 2, speed: 1.3, zone: 0.24 },
    { id: 'channel_catfish', weight: 4, hits: 3, speed: 1.0, zone: 0.26, night: true },
    { id: 'muskie', weight: 1, hits: 4, speed: 1.7, zone: 0.17 },
  ],
  // The black lake of the Old Works, under the Deep Seam.
  cave: [
    { id: 'cave_crayfish', weight: 5, hits: 1, speed: 1.0, zone: 0.3 },
    { id: 'blind_cavefish', weight: 2, hits: 3, speed: 1.5, zone: 0.2 },
    { id: 'creek_chub', weight: 2, hits: 1, speed: 0.9, zone: 0.34 },
  ],
};

/** Which water the player is casting into, or null if it isn't fishable. */
export function waterAt(m: MapRuntime, x: number, y: number): Water | null {
  const g = m.ground(x, y);
  if (g !== T.WATER && g !== T.SHALLOW) return null;
  if ((m.id as string) === 'MINE_L4') return 'cave';
  const zones = m.zonesAt(x, y);
  if (zones.includes('deep')) return 'deep';
  if (zones.includes('lake') || zones.includes('canal')) return 'lake';
  if (m.id === 'CRANBERRY_BOG_AND_SPRINGS') return g === T.WATER ? 'lake' : 'creek';
  return 'creek';
}

export function pickFish(water: Water, night: boolean): FishDef {
  const pool = FISH[water].filter((f) => !f.night || night);
  const total = pool.reduce((a, f) => a + f.weight, 0);
  let r = Math.random() * total;
  for (const f of pool) { r -= f.weight; if (r <= 0) return f; }
  return pool[0];
}

/* ------------------------------------------------------------------ */
/* Hunting                                                             */
/* ------------------------------------------------------------------ */

export const DEER_MAPS: ReadonlySet<MapId> = new Set<MapId>(['PINE_TRAIL_AND_ORCHARD', 'OLD_GROWTH_AND_SAWMILL', 'RADIO_RIDGE_AND_CROSSROADS']);

export interface WeaponDef { range: number; zone: number; ammo: string; recover: number; loud: boolean; name: string }

export const WEAPONS: Record<'bow' | 'rifle', WeaponDef> = {
  bow: { name: 'Hunting Bow', range: 3, zone: 0.2, ammo: 'arrow', recover: 0.7, loud: false },
  rifle: { name: 'Deer Rifle', range: 6, zone: 0.34, ammo: 'rifle_cartridge', recover: 0, loud: true },
};
