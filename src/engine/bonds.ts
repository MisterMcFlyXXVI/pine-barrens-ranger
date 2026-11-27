/**
 * Cryptid bonds.
 *
 * Homestead visits: once you've mastered a cryptid (3 stars), now and then it
 * drops by the cabin yard. Never more than one visitor a day, each only at its
 * hour and in its weather, and each leaves something behind:
 *
 *   Jackalope        dawn, nibbling clover by the garden     -> Lucky Clover
 *   Albatwitch       dusk, apple on the porch rail            -> Silver Silk
 *   Mothman          foggy night, on the shed roof            -> Foresight
 *   Fresno Nightcrawler  midnight, striding the garden rows   -> crops it steps over grow
 *   Loveland Frog    rain, sitting on the rain barrel         -> waters every tilled plot
 *
 * Warden arcs: each mythic Warden on Radio Ridge and in the Old Growth has a
 * two-step errand in the world that makes the next meeting gentler (+25 Trust
 * at the start of its encounter).
 */
import type { Game } from './game';
import type { MapId } from '../data/mapgen';
import { O } from '../data/tiles';
import { CROP_BY_ID } from '../data/items';
import { stars } from './dex';
import { hash2 } from '../util';
import { Dialog } from '../ui/menus';
import { sfx } from '../audio/sfx';
import { P } from '../graphics/palette';

/* ================= Homestead visits ================= */

export type VisitorId = 'jackalope' | 'albatwitch' | 'mothman' | 'nightcrawler' | 'loveland_frog';

interface Visitor {
  id: VisitorId;
  /** Tile it sits on (the Nightcrawler strolls from here). */
  at: [number, number];
  /** Can it come today, given the day's forecast? */
  today: (game: Game) => boolean;
  /** Is it here right now? */
  now: (game: Game) => boolean;
  /** Pixel nudge for drawing (e.g. up on the roof). */
  lift?: number;
}

const wetDay = (game: Game) => ['RAIN', 'STORM'].includes(game.dayWeather.morning) || ['RAIN', 'STORM'].includes(game.dayWeather.evening);
const mins = (game: Game) => game.clock.minutes;

const VISITORS: readonly Visitor[] = [
  { id: 'jackalope', at: [20, 26], today: (g) => !['RAIN', 'STORM'].includes(g.dayWeather.morning), now: (g) => mins(g) < 8 * 60 + 30 && !wetNow(g) },
  { id: 'albatwitch', at: [29, 19], today: () => true, now: (g) => g.clock.phase() === 'dusk' && !wetNow(g) },
  { id: 'mothman', at: [38, 14], lift: 14, today: (g) => g.dayWeather.evening === 'FOG', now: (g) => (g.clock.phase() === 'night' || g.clock.phase() === 'witching') && g.weatherNow() === 'FOG' },
  { id: 'nightcrawler', at: [21, 27], today: (g) => g.dayWeather.evening === 'CLEAR' || g.dayWeather.evening === 'FOG', now: (g) => mins(g) >= 24 * 60 && mins(g) < 25 * 60 + 30 },
  { id: 'loveland_frog', at: [25, 18], lift: 7, today: wetDay, now: wetNow },
];

function wetNow(game: Game): boolean { const w = game.weatherNow(); return w === 'RAIN' || w === 'STORM'; }

const visitorLines: Record<VisitorId, string[]> = {
  jackalope: [
    'The Jackalope is sitting up in the clover by your garden fence, antlers wet with dew, chewing very seriously.',
    'It looks at you, decides you\'re fine, and goes on chewing. When it finally bounds off, it leaves a four-leaf clover behind, nibbled neatly round the edges.',
    '(You got a Lucky Clover. Eat it for a LUCKY day.)',
  ],
  albatwitch: [
    'Thunk. An Albatwitch is perched on your porch rail with one of your apples, eating it the way a person eats an ear of corn.',
    'When it\'s done it sets the core down on the rail, very precisely, and something silvery beside it: a skein of silk, the kind the old-growth spiders spin. A trade.',
    '(You got Silver Silk.)',
  ],
  mothman: [
    'Two red lights on your shed roof. The Mothman sits hunched against the fog, wings folded like an umbrella.',
    'It turns its head toward the hills and holds very still, and for a moment you see what it sees: one valley shimmering, like heat over a road.',
  ],
  nightcrawler: [
    'At midnight the Fresno Nightcrawler walks through your garden. Two long white legs, no arms, no hurry. It steps between the rows without touching a leaf.',
    'Where it has walked, the seedlings stand a little taller in the morning.',
  ],
  loveland_frog: [
    'The Loveland Frog is sitting on your rain barrel in its little vest, holding its wand up to the rain as if conducting it.',
    'It taps the wand twice on the barrel hoops. Every furrow in the garden fills, neat as a ruled line.',
  ],
};

/** Which mastered cryptid (if any) is visiting today. Decided once a day. */
export function todaysVisitor(game: Game): Visitor | null {
  const day = game.clock.day;
  const able = VISITORS.filter((v) => game.dex[v.id] && stars(game.dex[v.id]) >= 3 && v.today(game));
  if (!able.length) return null;
  // About a third of days, and a little more often the more of them you've befriended.
  if (hash2(day, 7, 401) > 0.25 + able.length * 0.04) return null;
  return able[Math.floor(hash2(day, 9, 402) * able.length)];
}

/** The visitor in the yard right now (not yet met today). */
export function visitorHere(game: Game): Visitor | null {
  if (game.cur.id !== 'CABIN_YARD') return null;
  const v = todaysVisitor(game);
  if (!v || game.progress.days[`visit_${v.id}`] === game.clock.day || !v.now(game)) return null;
  return v;
}

/** Where the visitor is drawn this frame (the Nightcrawler paces the garden). */
export function visitorPos(game: Game, v: Visitor): [number, number] {
  if (v.id !== 'nightcrawler') return v.at;
  const t = (game.time * 0.12) % 2;
  const k = t < 1 ? t : 2 - t;
  return [v.at[0] + Math.round(k * 7), v.at[1]];
}

/** Tick: proximity visits (Mothman) and the Loveland Frog watering on arrival. */
export function bondsTick(game: Game): void {
  if (game.mode !== 'play' || game.overlays.length || game.fading) return;
  const v = visitorHere(game);
  if (!v) return;
  const p = game.player;
  const [vx, vy] = visitorPos(game, v);
  const d = Math.abs(p.tx - vx) + Math.abs(p.ty - vy);
  if ((v.id === 'mothman' && d <= 7) || (v.id === 'nightcrawler' && d <= 2)) meet(game, v);
  if (v.id === 'loveland_frog' && game.progress.days.frogWater !== game.clock.day) {
    game.progress.days.frogWater = game.clock.day;
    let n = 0;
    for (const plot of game.cur.plots) if (plot.tilled && !plot.watered) { plot.watered = true; n++; }
    if (n) game.toast('Something on the rain barrel croaks. The whole garden is watered.');
  }
}

/** Walk up and press A. */
export function visitorAt(game: Game, x: number, y: number): boolean {
  const v = visitorHere(game);
  if (!v) return false;
  const [vx, vy] = visitorPos(game, v);
  const roof = v.id === 'mothman' ? Math.abs(x - vx) <= 2 && y >= vy && y <= vy + 4 : false;
  if (!(roof || (Math.abs(x - vx) <= (v.id === 'nightcrawler' ? 1 : 0) && y === vy))) return false;
  meet(game, v);
  return true;
}

function meet(game: Game, v: Visitor): void {
  const p = game.progress;
  p.days[`visit_${v.id}`] = game.clock.day;
  p.flags.add(`bond_${v.id}`);
  sfx.trustChime();
  const lines = [...visitorLines[v.id]];
  const [vx, vy] = visitorPos(game, v);
  const px = vx * 16 + 8, py = vy * 16 + 8 - (v.lift ?? 0);
  if (v.id === 'jackalope') game.give('lucky_clover', 1, px, py);
  if (v.id === 'albatwitch') game.give('silver_silk', 1, px, py);
  if (v.id === 'mothman') {
    p.days.foresight = game.clock.day;
    const b = rareBiome(game.clock.day);
    lines.push(`(FORESIGHT: tonight, Rare Variants stir ${BIOME_NAME[b]}. Twice the usual odds there until you sleep.)`);
  }
  if (v.id === 'nightcrawler') {
    let n = 0;
    for (const plot of game.cur.plots) {
      const crop = plot.crop ? CROP_BY_ID[plot.crop] : null;
      if (crop && plot.days < crop.days && n < 4) { plot.days++; n++; }
    }
    lines.push(n ? `(${n} crop${n === 1 ? '' : 's'} grew a day.)` : '(Nothing is planted. It seems a little disappointed.)');
  }
  if (v.id === 'loveland_frog') lines.push('(The garden is watered.)');
  for (let k = 0; k < 6; k++) game.particles.sparkle(px + (Math.random() - 0.5) * 16, py - 6 + Math.random() * 8, P.MOON);
  game.openOverlay(new Dialog(lines));
}

const RARE_BIOMES: MapId[] = ['PINE_TRAIL_AND_ORCHARD', 'CRANBERRY_BOG_AND_SPRINGS', 'OLD_GROWTH_AND_SAWMILL', 'RADIO_RIDGE_AND_CROSSROADS'];
const BIOME_NAME: Partial<Record<MapId, string>> = {
  PINE_TRAIL_AND_ORCHARD: 'on Pine Trail', CRANBERRY_BOG_AND_SPRINGS: 'in the Cranberry Glades', OLD_GROWTH_AND_SAWMILL: 'in the Old Growth', RADIO_RIDGE_AND_CROSSROADS: 'on Radio Ridge',
};

/** The region the Mothman showed you tonight. */
export function rareBiome(day: number): MapId { return RARE_BIOMES[Math.floor(hash2(day, 3, 403) * RARE_BIOMES.length)]; }

/** Foresight's boost to rare-variant odds on this map. */
export function foresightMult(game: Game): number {
  return game.progress.days.foresight === game.clock.day && game.cur.id === rareBiome(game.clock.day) ? 2 : 1;
}

export function foresightText(game: Game): string | null {
  if (game.progress.days.foresight !== game.clock.day) return null;
  return `FORESIGHT: RARE VARIANTS ${(BIOME_NAME[rareBiome(game.clock.day)] ?? '').toUpperCase()}`;
}

/** Bonds made (for the Journal). */
export function bondsMade(game: Game): string[] {
  return VISITORS.filter((v) => game.progress.flags.has(`bond_${v.id}`)).map((v) => v.id);
}

/* ================= Warden arcs ================= */

export type WardenId = 'sasquatch' | 'wendigo' | 'thunderbird' | 'awful';

export function arcDone(game: Game, id: string): boolean { return game.progress.flags.has(`arc_${id}`); }
function arcStarted(game: Game, id: WardenId): boolean { return game.progress.flags.has(`arc_${id}_1`); }

/** Act III objective text for each Warden's errand. */
export function arcStatus(game: Game, id: WardenId): string {
  if (arcDone(game, id)) return 'Peace made';
  const s = arcStarted(game, id);
  switch (id) {
    case 'sasquatch': return s ? `Dismantle Elias's traps on the west trail (${3 - trapsLeft(game)}/3)` : 'Something chained to the hemlocks on the Old Growth west trail...';
    case 'wendigo': return s ? 'Offer Smoked Venison at the Bone Chime (hold it, press A)' : 'Hang a Bone & Antler Chime in the Old Growth and listen';
    case 'thunderbird': return s ? 'Ground the static: hold Scrap Copper at your Lightning Rod' : 'Plant a Copper Lightning Rod on Radio Ridge';
    case 'awful': return s ? 'Stand your ground on the cliffs at dawn or in a storm (hold a Brass Bell or Parabolic Dish, press A)' : 'Walk out onto the Radio Ridge High Cliffs';
  }
}

function finishArc(game: Game, id: WardenId, lines: string[]): void {
  game.progress.flags.add(`arc_${id}`);
  sfx.fanfare();
  game.openOverlay(new Dialog([...lines, '(The Warden will remember this. Your next meeting starts with +25 Trust.)']));
}

function trapsLeft(game: Game): number {
  const m = game.getMap('OLD_GROWTH_AND_SAWMILL');
  let n = 0;
  for (const o of m.objects) if (o === O.OLD_TRAP) n++;
  return n;
}

/** Rusted trap (interact). */
export function dismantleTrap(game: Game, i: number): void {
  const m = game.cur;
  const first = !arcStarted(game, 'sasquatch');
  m.removeObject(i);
  game.progress.flags.add('arc_sasquatch_1');
  const x = i % m.w, y = Math.floor(i / m.w);
  game.particles.leaves(x * 16 + 8, y * 16 + 10);
  sfx.rockHit();
  game.give('iron_nail', 1, x * 16 + 8, y * 16 + 8);
  const left = trapsLeft(game);
  if (left === 0) {
    finishArc(game, 'sasquatch', [
      'You pry the last trap open and drag its chain out of the roots. Somewhere deep in the hemlocks, something very large exhales.',
      'For a long moment the whole Old Growth is quiet. Then the birds start up again, all at once, as if somebody had given them permission.',
    ]);
    return;
  }
  game.openOverlay(new Dialog(first ? [
    'A leg-hold trap, rusted shut on nothing, chained to a hemlock root. Stamped on the plate: G.T. FORGE.',
    'Wired to the chain is a scrap of tarpaper in Elias\'s hand: "For the big one. God forgive me." The bark around it is torn in long strips, higher than your head.',
    `You work the jaws loose and pull it free. (${left} more along the west trail. +1 Iron Nail)`,
  ] : [`You pry another of Elias's traps apart. The metal comes away in rust flakes. (${left} left. +1 Iron Nail)`]));
}

/** A placed Chime or Rod, with the right thing in hand. Returns true if it handled the press. */
export function wardenMount(game: Game, o: number): boolean {
  const m = game.cur, held = game.selected?.id;
  if (o === O.CHIME && m.id === 'OLD_GROWTH_AND_SAWMILL' && !arcDone(game, 'wendigo')) {
    if (!arcStarted(game, 'wendigo')) {
      game.progress.flags.add('arc_wendigo_1');
      sfx.chimes();
      game.openOverlay(new Dialog([
        'The bones knock together, though there\'s no wind. Frost feathers out across the antler tines while you watch.',
        'From Elias\'s journal: "It isn\'t evil. It\'s hungry. It has been hungry since the winter they closed the mine and the town stopped putting out food for anything." Maybe something warm would help.',
        '(Hold Smoked Venison and press A at the chime.)',
      ]));
      return true;
    }
    if (held === 'smoked_venison') {
      game.inv.remove('smoked_venison', 1);
      finishArc(game, 'wendigo', [
        'You hold the venison up to the chime. It\'s still warm from the smoker, and the steam curls up through the bones.',
        'The frost on the tines melts, drop by drop. Out in the fog, something tall and thin stops pacing.',
      ]);
      return true;
    }
    return false;
  }
  if (o === O.ROD && m.id === 'RADIO_RIDGE_AND_CROSSROADS' && !arcDone(game, 'thunderbird')) {
    if (!arcStarted(game, 'thunderbird')) {
      game.progress.flags.add('arc_thunderbird_1');
      sfx.radioStatic();
      game.openOverlay(new Dialog([
        'The rod sings. Your hair lifts. The whole ridgetop is so full of static that the grass crackles when you step.',
        'Elias rigged the old tower to draw lightning down on purpose, to call the big bird for photographs. It\'s been storming wrong up here ever since. A copper ground strap would bleed it off.',
        '(Hold Scrap Copper and press A at the rod.)',
      ]));
      return true;
    }
    if (held === 'scrap_copper') {
      game.inv.remove('scrap_copper', 1);
      for (let k = 0; k < 10; k++) game.particles.sparkle(game.player.x + 8 + (Math.random() - 0.5) * 30, game.player.y + Math.random() * 10, P.LANTERN);
      finishArc(game, 'thunderbird', [
        'You twist the copper round the rod\'s foot and drive it into the wet ground. A crack like a whip, a smell like pennies, and the static drains away into the mountain.',
        'Far overhead, past the clouds, something enormous banks once and turns for home.',
      ]);
      return true;
    }
  }
  return false;
}

/** Entering the cliffs (step 1), or standing your ground there (step 2). Called each tick and on A. */
export function awfulTick(game: Game): void {
  if (game.cur.id !== 'RADIO_RIDGE_AND_CROSSROADS' || arcStarted(game, 'awful') || game.overlays.length) return;
  if (!game.cur.zonesAt(game.player.tx, game.player.ty).includes('cliffs')) return;
  game.progress.flags.add('arc_awful_1');
  game.openOverlay(new Dialog([
    'Up on the High Cliffs the wind never stops. In a cleft of rock you find a heap of lantern glass and bent brass hooks: Elias\'s old camera blind, smashed flat.',
    'From Elias\'s journal: "Every time I hid, it took it as an insult. A proud animal. It wants to be looked in the eye." At dawn, or in a storm, it comes to these cliffs.',
    '(Come back at dawn or in a storm, hold a Brass Bell or a Parabolic Dish, and press A.)',
  ]));
}

export function wardenUse(game: Game, held: string): boolean {
  if (held !== 'brass_bell' && held !== 'parabolic_dish') return false;
  if (game.cur.id !== 'RADIO_RIDGE_AND_CROSSROADS' || !arcStarted(game, 'awful') || arcDone(game, 'awful')) return false;
  if (!game.cur.zonesAt(game.player.tx, game.player.ty).includes('cliffs')) return false;
  const dawn = game.clock.minutes < 8 * 60 + 30, storm = game.weatherNow() === 'STORM';
  if (!dawn && !storm) { game.notice('Only wind up here now. The proud one comes at dawn, or in a storm.'); return true; }
  finishArc(game, 'awful', [
    held === 'brass_bell' ? 'You plant your feet on the cliff edge and ring the bell, once, loud and clear, into the wind.' : 'You plant your feet on the cliff edge and raise the dish into the wind, and listen back.',
    'A shriek answers from the crags, and then a shadow, wings wider than the road, passes so close over your head that your hat lifts. It doesn\'t strike. It circles once and is gone.',
  ]);
  return true;
}

/** Shown in an encounter's opening log when you've made peace. */
export function arcBonus(game: Game, id: string): number {
  return ['sasquatch', 'wendigo', 'thunderbird', 'awful'].includes(id) && arcDone(game, id) ? 25 : 0;
}
