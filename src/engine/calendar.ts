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
import type { Look } from '../graphics/playerSprite';
import { befriend } from './friends';
import { isFriend } from '../data/friends';

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
  ['liesl', 2, 0], ['walter', -2, 0], ['matthias', 3, 2],
];

/** Townsfolk come to the gathering (Elias too, once he's home). */
export function eventStop(game: Game, id: string): Stop | null {
  const e = eventNow(game);
  if (!e) return null;
  const g = GATHER.find(([n]) => n === id);
  if (!g) return null;
  if (id === 'vance' && !game.progress.flags.has('finale')) return null;
  // Toby only joins town life once he's home from the bog.
  if (id === 'toby' && !(game.progress.done('toby') || game.progress.stage('toby') === 2)) return null;
  // Gideon minds the Outfitter till noon on Stir-Off day, so you can still shop.
  if (id === 'gideon' && e.id === 'apple_butter' && game.clock.minutes < 12 * 60) return null;
  // Egg-hunt day: the kids are out in the orchard, not standing by the basket.
  if ((id === 'pippa' || id === 'sam') && e.id === 'osterhase') return null;
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
  // The egg basket takes eggs all day; everything else is once a day.
  const done = e.effect !== 'eggs' && game.progress.days[key] === game.clock.day;
  sfx.open();
  game.openOverlay(new Dialog([`${e.name.toUpperCase()}. ${e.blurb}`], [
    ...(done ? [] : [{ label: e.activity.label, fn: () => {
      if (e.effect === 'eggs') { turnInEggs(game); return; }
      game.progress.days[key] = game.clock.day;
      eventEffect(game, e);
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

/** What an activity does beyond its gift. */
function eventEffect(game: Game, e: TownEvent): void {
  if (e.effect === 'lanterns') {
    // Everybody walking the lane with you.
    for (const [id] of GATHER) if (isFriend(id) && eventStop(game, id)) befriend(game, id, 15);
  }
  if (e.effect === 'burn') game.progress.days.fasnacht_burn = game.clock.day;
}

/** Old Man Winter burned this winter: the rest of it is mild (spring weather). */
export function winterBeaten(game: Game): boolean {
  const b = game.progress.days.fasnacht_burn;
  return b !== undefined && seasonIndex(b) === 3 && game.clock.day > b && game.clock.day - b < DAYS_PER_SEASON && seasonIndex(game.clock.day) === 3;
}

/** The egg-hunt basket: every painted egg you bring back. */
function turnInEggs(game: Game): void {
  const n = game.inv.count('painted_egg');
  const p = game.progress;
  if (!n) {
    game.openOverlay(new Dialog(['Omi Liesl shows you the basket, lined with moss. "Empty hands? The Osterhase hid them all through the Pine Trail orchard. Under the apple trees, in the clover, by the old walls. Go, go!"']));
    return;
  }
  game.inv.remove('painted_egg', n);
  const total = (p.days.eggs_day === game.clock.day ? p.days.eggs_found ?? 0 : 0) + n;
  p.days.eggs_day = game.clock.day;
  p.days.eggs_found = total;
  game.gold += n * 15;
  const pages = [`You lay ${n} painted egg${n > 1 ? 's' : ''} in the moss. Omi Liesl counts them out loud in German. "${n > 1 ? 'Wunderbar!' : 'One! It is a start.'}" (+${n * 15}g.)`];
  // A prize for the best hunter of the day, once.
  if (total >= 6 && p.days.event_osterhase !== game.clock.day) {
    p.days.event_osterhase = game.clock.day;
    const left = game.inv.add('lucky_clover', 1);
    if (left) game.storage.add('lucky_clover', left);
    pages.push(`That makes ${total} today, the most anybody's found. Pippa, outraged, has to admit it. Omi presses something into your palm: a four-leaf clover, pressed in wax paper. "From the Osterhase. Or a Jackalope. Who can say."`);
  } else if (total < 6) pages.push(`(${total} so far today. Find 6 for the hunter's prize.)`);
  sfx.harvest();
  game.openOverlay(new Dialog(pages));
}

/** Townsfolk in costume for tonight's gathering (Belsnickel furs, Krampus, Fasnacht masks). */
export function eventLook(game: Game, id: string, base: Look): Look {
  const e = eventNow(game);
  const c = e?.costumes?.[id];
  if (!c || !eventStop(game, id)) return base;
  return { outfit: c[0] || base.outfit, hat: c[1] || base.hat };
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
  liesl: 'Omi Liesl', matthias: 'Matthias', walter: 'Opa Walter',
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
