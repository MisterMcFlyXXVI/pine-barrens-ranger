/** Calendar logic: today's gathering, where townsfolk stand for it, the stall, and birthdays. */
import type { Game } from './game';
import { EVENTS, BIRTHDAYS, BIRTHDAY_LINES } from '../data/calendar';
import type { TownEvent } from '../data/calendar';
import type { Stop } from '../data/npcs';
import { DAYS_PER_SEASON } from './clock';
import { ITEMS } from '../data/items';
import { Dialog } from '../ui/menus';
import { ShopMenu } from '../ui/shops';
import { sfx } from '../audio/sfx';

export function seasonIndex(day: number): number { return Math.floor((day - 1) / DAYS_PER_SEASON) % 4; }
export function dayOfSeason(day: number): number { return ((day - 1) % DAYS_PER_SEASON) + 1; }

export function eventOn(day: number): TownEvent | null {
  const s = seasonIndex(day), d = dayOfSeason(day);
  return EVENTS.find((e) => e.season === s && e.days.includes(d)) ?? null;
}

/** The gathering happening right now (null outside its hours). */
export function eventNow(game: Game): TownEvent | null {
  const e = eventOn(game.clock.day);
  return e && game.clock.minutes >= e.start && game.clock.minutes < e.end ? e : null;
}

/** An evening gathering today (the Folklore Festival stands down for it). */
export function eveningEventToday(game: Game): boolean {
  const e = eventOn(game.clock.day);
  return !!e && e.end > 18 * 60;
}

/** Where the stall stands (Old Christmas moves to the gazebo once it's built). */
export function eventSpot(game: Game, e: TownEvent): [number, number] {
  if (e.id === 'old_christmas' && game.progress.flags.has('proj_gazebo')) return [27, 31];
  return e.spot;
}

const GATHER: ReadonlyArray<[string, number, number]> = [
  ['mabel', 1, 0], ['ruth', -1, 0], ['agnes', -2, 2], ['barnaby', 2, 2], ['gideon', 0, 2], ['clara', 3, 1],
  ['pippa', -3, 1], ['sam', -3, 2], ['toby', 1, 3], ['vance', -1, 3],
];

/** Townsfolk come to the gathering (Elias too, once he's home). */
export function eventStop(game: Game, id: string): Stop | null {
  const e = eventNow(game);
  if (!e) return null;
  const g = GATHER.find(([n]) => n === id);
  if (!g) return null;
  if (id === 'vance' && !game.progress.flags.has('finale')) return null;
  const [sx, sy] = eventSpot(game, e);
  const x = sx + g[1], y = sy + g[2];
  return { map: 'PINE_HOLLOW_TOWN', x, y, dir: g[2] > 0 ? 'up' : g[1] > 0 ? 'left' : 'right', wander: 0, tag: 'event' };
}

/** What a townsperson says at the gathering. */
export function eventLine(game: Game, id: string): string | null {
  const e = eventNow(game);
  const lines = e?.talk[id];
  if (!lines?.length) return null;
  return lines[game.clock.day % lines.length];
}

/** The stall: the once-a-day activity, and things to buy. */
export function eventStallAt(game: Game, x: number, y: number): boolean {
  const e = eventNow(game);
  if (!e || game.cur.id !== 'PINE_HOLLOW_TOWN') return false;
  const [sx, sy] = eventSpot(game, e);
  if (Math.abs(x - sx) > 0 || Math.abs(y - sy) > 0) return false;
  const key = `event_${e.id}`;
  const done = game.progress.days[key] === game.clock.day;
  sfx.open();
  game.openOverlay(new Dialog([`${e.name.toUpperCase()}. ${e.blurb}`], [
    ...(done ? [] : [{ label: e.activity.label, fn: () => {
      game.progress.days[key] = game.clock.day;
      const [it, n] = e.activity.give;
      const left = game.inv.add(it, n);
      if (left) game.storage.add(it, left);
      sfx.harvest();
      game.openOverlay(new Dialog([...e.activity.lines, ...(left ? [`(No room in your bag: ${ITEMS[it].name} went to the Storage Crate.)`] : [])]));
    } }]),
    { label: 'Browse the stall', fn: () => game.openOverlay(new ShopMenu(e.name.toUpperCase(), () => e.stock)) },
    { label: 'Leave', fn: () => undefined },
  ]));
  return true;
}

/** Morning summary: today's / tomorrow's gathering and birthdays. */
export function morningNews(day: number, finale: boolean): string[] {
  const out: string[] = [];
  const e = eventOn(day);
  if (e) out.push(`Today: ${e.blurb}`);
  else { const t = eventOn(day + 1); if (t && !t.days.includes(dayOfSeason(day))) out.push(`Tomorrow: ${t.name} (${t.place}).`); }
  for (const id of birthdaysOn(seasonIndex(day), dayOfSeason(day))) if (id !== 'vance' || finale) out.push(`It's ${NAMES[id]}'s birthday today! A gift counts for a lot more.`);
  return out;
}

const NAMES: Record<string, string> = {
  agnes: 'Agnes', barnaby: 'Barney', mabel: 'Mabel', gideon: 'Gideon', clara: 'Dr. Okafor', pippa: 'Pippa', sam: 'Sam', toby: 'Toby', ruth: 'Ruth', vance: 'Elias',
};
export function friendName(id: string): string { return NAMES[id] ?? id; }

export function birthdaysOn(season: number, d: number): string[] {
  return Object.entries(BIRTHDAYS).filter(([, [s, dd]]) => s === season && dd === d).map(([id]) => id);
}

export function isBirthday(game: Game, id: string): boolean {
  const b = (BIRTHDAYS as Record<string, [number, number]>)[id];
  if (!b) return false;
  if (id === 'vance' && !game.progress.flags.has('finale')) return false;
  return b[0] === seasonIndex(game.clock.day) && b[1] === dayOfSeason(game.clock.day);
}

export function birthdayLine(id: string): string { return (BIRTHDAY_LINES as Record<string, string>)[id] ?? 'You remembered my birthday!'; }
