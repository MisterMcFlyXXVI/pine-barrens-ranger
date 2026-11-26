/** Cryptid-Dex progress model + Field Kit loadout. */
import { CRYPTIDS } from '../data/cryptids';

export interface DexEntry {
  /** 1-Star: sighted in an encounter. */
  seen: boolean;
  /** Reached 100% Trust at least once (specimen earned). */
  logged: boolean;
  sketch: boolean;
  cast: boolean;
  /** Favourite bait or a stance counter observed working. */
  behavior: boolean;
  /** Gold-quality Flash Photo taken. */
  photo: boolean;
  albino: boolean;
  static: boolean;
  encounters: number;
  /** Heard a townsperson's rumor about it (reveals habitat hints). */
  rumor?: boolean;
}

export type Dex = Record<string, DexEntry>;

export const emptyEntry = (): DexEntry => ({
  seen: false, logged: false, sketch: false, cast: false, behavior: false, photo: false, albino: false, static: false, encounters: 0,
});

export function newDex(): Dex {
  return Object.fromEntries(CRYPTIDS.map((c) => [c.id, emptyEntry()]));
}

/** Merge a saved dex over a fresh one (tolerates older saves / new cryptids). */
export function loadDex(saved: Partial<Dex> | undefined): Dex {
  const d = newDex();
  if (saved) for (const id of Object.keys(d)) if (saved[id]) d[id] = { ...emptyEntry(), ...saved[id] };
  return d;
}

/**
 * 1★ Sighting · 2★ Behavior/Bait observed (or Plaster Cast) · 3★ Gold Photo + Specimen.
 */
export function stars(e: DexEntry): number {
  if (!e.seen) return 0;
  if (e.photo && e.logged && (e.behavior || e.cast)) return 3;
  if (e.behavior || e.cast) return 2;
  return 1;
}

export function dexTotals(dex: Dex): { seen: number; logged: number; rare: number; entries: number; gold: number } {
  let seen = 0, logged = 0, rare = 0, gold = 0;
  for (const e of Object.values(dex)) {
    if (e.seen) seen++;
    if (e.logged) logged++;
    if (e.albino || e.static) rare++;
    if (stars(e) === 3) gold++;
  }
  return { seen, logged, rare, entries: logged + rare, gold };
}

export interface Kit {
  bait: string;
  signal: string;
  document: string;
  stealth: string;
}

export const defaultKit = (): Kit => ({ bait: 'wild_clover', signal: 'dim_lantern', document: 'quick_sketch', stealth: 'hold_breath' });

export const SIGNALS = ['dim_lantern', 'mimic_call', 'brass_bell', 'silver_bell', 'static_radio', 'parabolic_dish'] as const;
export const DOCUMENTS = ['quick_sketch', 'flash_photo', 'plaster_cast'] as const;
export const STEALTHS = ['hold_breath', 'crouch_step'] as const;
/** Signals that need gear in the bag; the rest are always available. */
export const SIGNAL_GEAR: Readonly<Record<string, string>> = {
  brass_bell: 'brass_bell', silver_bell: 'silver_bell', static_radio: 'static_radio', parabolic_dish: 'parabolic_dish',
};

export const MOVE_NAMES: Readonly<Record<string, string>> = {
  dim_lantern: 'Dim Lantern', mimic_call: 'Mimic Call', brass_bell: 'Brass Bell', silver_bell: 'Silver Bell',
  static_radio: 'Static Radio', parabolic_dish: 'Parabolic Dish',
  quick_sketch: 'Quick Sketch', flash_photo: 'Flash Photo', plaster_cast: 'Plaster Cast',
  hold_breath: 'Hold Breath', crouch_step: 'Crouch Step',
};

export const MOVE_DESC: Readonly<Record<string, string>> = {
  dim_lantern: 'Soft light. Counters SHY and SPECTRAL.',
  mimic_call: 'Imitate its call. Counters CURIOUS.',
  brass_bell: 'Bold ring. Counters AGITATED and PRIDEFUL.',
  silver_bell: 'Pure tone. Counters SPECTRAL and AGITATED.',
  static_radio: 'Crackling bands. Counters AGITATED and SPECTRAL.',
  parabolic_dish: 'Reveals stance; big Trust on vocal cryptids.',
  quick_sketch: 'Safe field sketch. Needs a little Trust.',
  flash_photo: 'Gold photo at 75% Trust (less with camera upgrades). Risky before that!',
  plaster_cast: 'Cast a track for evidence (2-Star). Needs 40%.',
  hold_breath: 'Freeze. -25% Startle.',
  crouch_step: 'Creep closer. +Trust; needed for stealth cryptids.',
};
