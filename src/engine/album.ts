/**
 * Field Photo Album: a framed print for every 3-star Gold mastery and every Rare
 * Variant you log, stamped with the season, day, time, biome and weather of the
 * shot. Older saves get "archival" prints for golds earned before the album.
 */
import type { Game } from './game';
import type { CryptidDef, Variant } from '../data/cryptids';
import { CRYPTIDS, CRYPTID_BY_ID } from '../data/cryptids';
import { MAP_NAMES } from '../data/maps';
import type { MapId } from '../data/mapgen';
import type { Weather } from '../data/weather';
import { WEATHER_LABEL } from '../data/weather';
import { SEASONS, DAYS_PER_SEASON } from './clock';
import { stars } from './dex';

export interface Print {
  id: string;
  variant: Variant;
  /** Absolute day (0 = archival, before the album existed). */
  day: number;
  minutes: number;
  map: MapId | '';
  weather: Weather | '';
}

const BIOME: Partial<Record<MapId, string>> = {
  CABIN_YARD: 'Cabin Yard', PINE_TRAIL_AND_ORCHARD: 'Pine Trail', CRANBERRY_BOG_AND_SPRINGS: 'Cranberry Glades',
  OLD_GROWTH_AND_SAWMILL: 'Old Growth', RADIO_RIDGE_AND_CROSSROADS: 'Radio Ridge', PINE_HOLLOW_TOWN: 'Pine Hollow',
};

export function biomeName(m: MapId | ''): string { return m ? BIOME[m] ?? MAP_NAMES[m] : 'Unknown'; }

export function printFor(game: Game, id: string, variant: Variant): Print | undefined {
  return game.progress.album.find((p) => p.id === id && p.variant === variant);
}

export function goldCount(game: Game): number {
  return new Set(game.progress.album.filter((p) => p.variant === 'normal').map((p) => p.id)).size;
}

/** Called when an encounter logs: a Gold print on first 3-star mastery, a print for each new rare variant. */
export function recordPrints(game: Game, def: CryptidDef, variant: Variant, beforeStars: number, rareNew: boolean): string[] {
  const e = game.dex[def.id];
  const shot = (v: Variant): Print => ({ id: def.id, variant: v, day: game.clock.day, minutes: game.clock.minutes, map: game.cur.id, weather: game.weatherNow() });
  const made: string[] = [];
  if (stars(e) === 3 && beforeStars < 3 && !printFor(game, def.id, 'normal')) { game.progress.album.push(shot('normal')); made.push('Gold'); }
  if (rareNew && variant !== 'normal' && !printFor(game, def.id, variant)) { game.progress.album.push(shot(variant)); made.push(variant === 'albino' ? 'Albino' : 'Static'); }
  return made;
}

/** Saves from before the album: file archival prints for golds and rares already earned. */
export function backfillAlbum(game: Game): void {
  for (const c of CRYPTIDS) {
    const e = game.dex[c.id];
    const arch = (v: Variant): Print => ({ id: c.id, variant: v, day: 0, minutes: 0, map: '', weather: '' });
    if (stars(e) === 3 && !printFor(game, c.id, 'normal')) game.progress.album.push(arch('normal'));
    if (e.albino && !printFor(game, c.id, 'albino')) game.progress.album.push(arch('albino'));
    if (e.static && !printFor(game, c.id, 'static')) game.progress.album.push(arch('static'));
  }
}

/** "Fall 12 · Dusk" style stamp. */
export function stampOf(p: Print): string[] {
  if (!p.day) return ['ARCHIVAL PRINT', 'From before the album was started.'];
  const season = SEASONS[Math.floor((p.day - 1) / DAYS_PER_SEASON) % 4];
  const dos = ((p.day - 1) % DAYS_PER_SEASON) + 1;
  const year = Math.floor((p.day - 1) / (DAYS_PER_SEASON * 4)) + 1;
  const h = Math.floor(p.minutes / 60) % 24, mm = String(p.minutes % 60).padStart(2, '0');
  const time = `${((h + 11) % 12) + 1}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
  return [`${season} ${dos}, Year ${year}, ${time} (${timeOfDay(p.minutes)})`, `${biomeName(p.map)}, ${p.weather ? WEATHER_LABEL[p.weather] : '?'}`];
}

function timeOfDay(m: number): string {
  if (m < 8 * 60 + 30) return 'Dawn';
  if (m < 17 * 60) return 'Day';
  if (m < 20 * 60) return 'Dusk';
  if (m < 24 * 60) return 'Night';
  return 'Witching Hour';
}

/** A short field-note caption for the back of the print. */
export function captionOf(p: Print): string {
  const c = CRYPTID_BY_ID[p.id];
  const w = p.weather;
  const air = w === 'FOG' ? 'through the fog' : w === 'RAIN' ? 'through the rain' : w === 'STORM' ? 'between lightning strikes' : w === 'SNOW' ? 'in falling snow' : 'in clear air';
  const mood: Record<string, string> = {
    skittish: 'It held still for exactly one frame.', neutral: 'It looked right down the lens.', territorial: 'It let me stay. Barely.',
    predator: 'Steady hands. It decided I was no threat.', spectral: 'The print came out stranger than the moment.',
  };
  if (p.variant === 'albino') return `Pale as frost, ${air}. Agnes will want to see this one twice.`;
  if (p.variant === 'static') return `The camcorder hummed the whole time. The print still crackles if you touch it.`;
  return `${c.name}, ${air}. ${mood[c.temperament] ?? 'A good print.'}`;
}
