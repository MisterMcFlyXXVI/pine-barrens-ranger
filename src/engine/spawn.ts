/** Cryptid spawn rules: which cryptids can appear on a given tile right now. */
import { CRYPTIDS, CryptidDef, TIER_WEIGHT, Variant, Zone } from '../data/cryptids';
import type { MapId } from '../data/mapgen';
import { timeTags, Weather } from '../data/weather';
import { O, T } from '../data/tiles';
import { stars, Dex } from './dex';

export interface SpawnCtx {
  map: MapId;
  zones: Zone[];
  minutes: number;
  weather: Weather;
  fullMoon: boolean;
  dex: Dex;
  has: (item: string) => boolean;
  pylonHere: boolean;
  /** Telegraph sighting-report cryptid (3x weight today). */
  boost?: string;
  /** Loveland Frog Slicker worn: +20% water cryptids. */
  waterBonus?: boolean;
}

export function eligible(c: CryptidDef, ctx: SpawnCtx, ignoreSummon = false): boolean {
  if (!c.maps.includes(ctx.map)) return false;
  // Lightning-rod summons also roam storms naturally; totem/chime mythics are ritual-only.
  if (c.summon && c.summon !== 'rod' && !ignoreSummon) return false;
  if (c.zones && !c.zones.some((z) => ctx.zones.includes(z))) return false;
  if (c.fullMoon && !ctx.fullMoon) return false;
  if (c.requires && !c.requires.every((id) => stars(ctx.dex[id]) >= 3)) return false;
  const storm = ctx.weather === 'STORM';
  const pylonClearNight = ctx.pylonHere && ctx.weather === 'CLEAR' && ctx.minutes >= 1200;
  if (c.weather !== 'ANY' && !c.weather.includes(ctx.weather)) {
    if (!(c.id === 'thunderbird' && pylonClearNight)) return false;
  }
  if (c.times !== 'ANY' && !(c.stormAnyTime && storm)) {
    const tags = timeTags(ctx.minutes);
    if (!c.times.some((t) => tags.includes(t))) return false;
  }
  return true;
}

export function spawnWeight(c: CryptidDef, ctx: SpawnCtx): number {
  let w = TIER_WEIGHT[c.tier];
  if (c.traits.includes('scentDraw') && (ctx.has('moth_scale') || ctx.has('snally_beak'))) w *= 4;
  if (ctx.pylonHere && ['thunderbird', 'mothman', 'hopkinsville_goblin'].includes(c.id)) w *= 4;
  if (c.zones) w *= 1.8; // zone specialists dominate their haunts
  if (ctx.boost === c.id) w *= 3;
  if (ctx.waterBonus && c.maps.includes('CRANBERRY_BOG_AND_SPRINGS')) w *= 1.2;
  return w;
}

export function pickCryptid(ctx: SpawnCtx, rnd: () => number): CryptidDef | null {
  const pool = CRYPTIDS.filter((c) => eligible(c, ctx)).map((c) => ({ c, w: spawnWeight(c, ctx) }));
  const total = pool.reduce((a, p) => a + p.w, 0);
  if (total <= 0) return null;
  let x = rnd() * total;
  for (const p of pool) { x -= p.w; if (x <= 0) return p.c; }
  return pool[pool.length - 1].c;
}

/** 1-in-32 base x multiplier (Lunar Dew, festival, Shimmer Suit); a Tesla Pylon forces Static-Charged variants. */
export function rollVariant(rnd: () => number, mult: number, pylon: boolean): Variant {
  let odds = Math.min(0.5, (1 / 32) * mult);
  if (pylon) odds = Math.max(odds, 0.25);
  if (rnd() >= odds) return 'normal';
  if (pylon) return 'static';
  return rnd() < 0.5 ? 'albino' : 'static';
}

/** Per-step encounter chance for the tile just entered. */
export function encounterChance(ground: number, obj: number, weather: Weather, nearDeepWater: boolean): number {
  if (obj === O.TALLGRASS || obj === O.REEDS) return 0.085;
  if (obj === O.FERN || obj === O.CRAN_BUSH) return 0.06;
  if (ground === T.SHALLOW || ground === T.SPRING) return 0.07;
  if (nearDeepWater && (ground === T.BOARDWALK || ground === T.BOG)) return 0.045;
  if (ground === T.SLOPE || ground === T.RUIN_FLOOR || ground === T.BOG) return 0.03;
  if (weather === 'FOG' && (ground === T.GRASS || ground === T.FOREST || ground === T.HEMLOCK || ground === T.ROCKY || ground === T.CLOVER || ground === T.PATH)) return 0.018;
  return 0;
}
