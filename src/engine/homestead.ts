/**
 * Homestead decorations at work (data: src/data/homestead.ts): setting them
 * down from the hotbar, pressing A on them (and taking them back up), the fire
 * pit's rest, the hens and their eggs, the cuckoo clock, and the bits the
 * renderer needs (sprites, lights, the hens wandering by the coop).
 */
import type { Game } from './game';
import type { MapRuntime } from './world';
import type { Canv } from '../graphics/canvas';
import type { Light } from '../graphics/lighting';
import { O, T } from '../data/tiles';
import { DECO_BY_ITEM, DECO_BY_OBJ, HENS, WALL_DECOS } from '../data/homestead';
import type { DecoDef } from '../data/homestead';
import { HS } from '../graphics/homeSprites';
import { Dialog } from '../ui/menus';
import { WorldMap } from '../ui/worldmap';
import { sfx } from '../audio/sfx';
import { DAY_END } from './clock';

const YARD = 'CABIN_YARD', CABIN = 'CABIN_INTERIOR';

/** Is this tile a fire pit's neighbour (for the bench bonus)? */
function besideFire(m: MapRuntime, x: number, y: number): boolean {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && m.obj(x + dx, y + dy) === O.FIRE_PIT) return true;
  return false;
}

const lit = (game: Game) => game.clock.phase() !== 'day';

/** Where a decoration would go if set down facing (tx, ty), or a reason it can't. */
function spotFor(game: Game, d: DecoDef, tx: number, ty: number): [number, number] | string {
  const m = game.cur;
  if (d.where === 'yard') {
    if (m.id !== YARD) return 'That goes outside, in your cabin yard.';
    const ok = m.inBounds(tx, ty) && m.obj(tx, ty) === O.NONE && !m.blocked(tx, ty) && !m.portalAt(tx, ty) && m.plotIndex(tx, ty) < 0
      && m.ground(tx, ty) !== T.PATH && !m.forage.has(m.idx(tx, ty));
    return ok ? [tx, ty] : 'Set it on open ground in the yard (off the path and the garden).';
  }
  if (m.id !== CABIN) return d.where === 'wall' ? 'That hangs on your cabin wall.' : 'That goes inside your cabin.';
  if (d.where === 'wall') {
    // Facing the back wall from the floor: hang it on the wall face above the baseboard.
    const wy = m.ground(tx, ty) === T.WALL_BASE ? ty - 1 : ty;
    const ok = m.inBounds(tx, wy) && m.ground(tx, wy) === T.WALL_FACE && m.obj(tx, wy) === O.NONE;
    return ok ? [tx, wy] : 'Stand under a bare stretch of the back wall and face it to hang this.';
  }
  const ok = m.inBounds(tx, ty) && m.obj(tx, ty) === O.NONE && !m.blocked(tx, ty) && m.ground(tx, ty) !== T.DOORMAT && !m.portalAt(tx, ty);
  return ok ? [tx, ty] : 'Set it on open floor inside the cabin (not in the doorway).';
}

/** For the action hint: would PLACE work here? */
export function canPlaceDeco(game: Game, item: string, tx: number, ty: number): boolean {
  const d = DECO_BY_ITEM[item];
  return !!d && typeof spotFor(game, d, tx, ty) !== 'string';
}

/** Set a decoration down from the hotbar. Returns false if the item isn't a decoration. */
export function placeDeco(game: Game, item: string, tx: number, ty: number): boolean {
  const d = DECO_BY_ITEM[item];
  if (!d) return false;
  const spot = spotFor(game, d, tx, ty);
  if (typeof spot === 'string') { sfx.error(); game.notice(spot); return true; }
  const m = game.cur;
  if (d.max && m.countPlaced(d.obj) >= d.max) { sfx.error(); game.notice(`${d.max} of those is plenty for one homestead.`); return true; }
  m.placeObject(m.idx(spot[0], spot[1]), d.obj);
  game.inv.removeAt(game.sel, 1);
  if (d.where === 'yard') { sfx.till(); game.particles.clods(spot[0] * 16 + 8, spot[1] * 16 + 12, [8, 9, 7]); }
  else sfx.knock();
  let msg = `${d.name} set out.`;
  if (d.obj === O.CHICKEN_COOP && !game.progress.flags.has('hens')) msg = 'Chicken coop built! Word gets around town fast: somebody will see you get hens.';
  else if (d.obj === O.LOG_BENCH && besideFire(m, spot[0], spot[1])) msg = 'A bench by the fire. Now that\'s a homestead.';
  else if (d.where === 'wall') msg = `You hang the ${d.name.toLowerCase()} on the wall.`;
  game.toast(msg);
  return true;
}

function familyPhoto(game: Game): string {
  switch (game.progress.reason) {
    case 'loss': return 'Your family on the porch back home, everyone squinting into the sun. One of them isn\'t with you anymore. You hung it where the morning light finds it first.';
    case 'burnout': return 'Your family at the lake, the last summer before everything got so busy. Everybody is laughing at something just out of frame. You can\'t remember what. You\'d like to.';
    default: return 'The people you come from: a porch, a dog, three squinting faces. You\'re still working out where you fit. Having them on the wall helps.';
  }
}

function eggsToday(game: Game): number {
  const coops = game.getMap(YARD).countPlaced(O.CHICKEN_COOP);
  const arrived = game.progress.days.hens;
  if (!coops || arrived === undefined || game.clock.day <= arrived || game.progress.days.eggs === game.clock.day) return 0;
  const winter = game.clock.season === 'Winter';
  const base = winter ? 1 : 2 + (game.clock.day % 3 === 0 ? 1 : 0);
  return Math.min(6, base * coops);
}

/** Press A on a decoration (or, in the cabin, on the wall above you). */
export function decoInteract(game: Game, tx: number, ty: number): boolean {
  const m = game.cur;
  let x = tx, y = ty, d = DECO_BY_OBJ[m.obj(x, y)];
  if (!d && m.id === CABIN && m.ground(tx, ty) === T.WALL_BASE && WALL_DECOS.has(m.obj(tx, ty - 1))) { y = ty - 1; d = DECO_BY_OBJ[m.obj(x, y)]; }
  if (!d || !m.placed.has(m.idx(x, y))) return false;
  const day = game.clock.day, days = game.progress.days;
  const pick = { label: d.where === 'wall' ? 'Take it down' : 'Pick it up', fn: () => {
    if (!game.inv.canFit(d.item)) { sfx.error(); game.toast('Your bag is full.'); return; }
    m.removeObject(m.idx(x, y)); game.inv.add(d.item, 1); sfx.confirm();
    game.toast(`${d.name} back in your bag.`);
  } };
  const leave = { label: 'Leave it', fn: () => undefined };
  const lines: string[] = [];
  const opts: Array<{ label: string; fn: () => void }> = [];
  switch (d.obj) {
    case O.FIRE_PIT: {
      lines.push(lit(game) ? 'The fire pit is going: pine knots and a little hickory. Sparks climb into the dark.' : d.look);
      opts.push({ label: 'Sit by the fire', fn: () => restByFire(game, x, y) });
      break;
    }
    case O.CHICKEN_COOP: {
      if (!game.progress.flags.has('hens')) { lines.push('An empty coop, smelling of new pine. Somebody in town said they\'d bring you hens. (They come the morning after you build it.)'); break; }
      const n = eggsToday(game);
      if (n) {
        if (!game.inv.canFit('foraged_egg')) { sfx.error(); game.notice('Your bag is full. Make room for the eggs.'); return true; }
        days.eggs = day; game.inv.add('foraged_egg', n); sfx.cluck(); sfx.harvest();
        game.particles.pop(x * 16 + 8, y * 16 + 4, HS.egg[0]);
        game.toast(`${n} warm egg${n === 1 ? '' : 's'} from ${HENS.slice(0, Math.min(3, n)).join(', ').replace(/, ([^,]*)$/, ' and $1')}.`);
        return true;
      }
      sfx.cluck();
      lines.push(days.eggs === day ? `${HENS.join(', ').replace(/, ([^,]*)$/, ' and $1')} have nothing more for you today. Come back in the morning.` : 'The hens are settling in. Eggs in the morning.');
      break;
    }
    case O.WALL_PHOTO: lines.push(familyPhoto(game)); break;
    case O.WALL_MAP:
      lines.push(d.look);
      opts.push({ label: 'Study the map', fn: () => { sfx.open(); game.openOverlay(new WorldMap(game)); } });
      break;
    case O.WALL_BANJO:
      lines.push(d.look);
      opts.push({ label: 'Pick a tune', fn: () => { sfx.banjo(); game.toast('You pick out the first bars of "Shady Grove." Close enough.'); } });
      break;
    case O.WALL_CLOCK: lines.push(`Tick, tock. It says ${game.clock.timeLabel()}, and on the hour it will say so again, loudly.`); break;
    case O.ARMCHAIR:
      lines.push(d.look);
      opts.push({ label: 'Put your feet up', fn: () => {
        if (days.armchair === day) { game.toast('You\'ve had your sit today. Any longer and you\'d never get up.'); return; }
        days.armchair = day; game.stamina = Math.min(game.maxStamina, game.stamina + 20); game.clock.minutes = Math.min(DAY_END - 10, game.clock.minutes + 20);
        sfx.sleep(); game.toast('You sink in and close your eyes for twenty minutes. (+20 energy)');
      } });
      break;
    case O.PLANTER: {
      const s = ['crocuses and bleeding heart', 'zinnias, black-eyed Susans and bee balm', 'mums and asters, a little frost-bitten', 'a bit of holly and winterberry'][Math.max(0, ['Spring', 'Summer', 'Fall', 'Winter'].indexOf(game.clock.season))];
      lines.push(`This season it's ${s}.`);
      break;
    }
    case O.SCARECROW: lines.push(lit(game) ? 'Straw stuffed in an old flannel. It looks a little too much like someone standing very still, watching the treeline.' : 'Straw stuffed in an old flannel. The crows aren\'t impressed, but the garden looks finished.'); break;
    default: lines.push(d.look || d.desc);
  }
  opts.push(leave, pick);
  sfx.blip();
  game.openOverlay(new Dialog(lines, opts));
  return true;
}

const FIRESIDE = [
  'The fire settles. Somewhere up the ridge, a whip-poor-will starts its one song.',
  'You watch the sparks go up until you lose them among the stars.',
  'Pine pitch pops. The smoke smells like every good night you ever had outdoors.',
  'An owl asks its question from the hemlocks. You don\'t have an answer either.',
  'The coals breathe. For a while, nothing needs doing.',
];

function restByFire(game: Game, x: number, y: number): void {
  const days = game.progress.days, day = game.clock.day;
  if (days.firepit === day) { sfx.blip(); game.toast('You\'ve had your sit by the fire today. It\'ll keep.'); return; }
  const m = game.cur;
  let bench = false;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (m.obj(x + dx, y + dy) === O.LOG_BENCH) bench = true;
  const gain = (lit(game) ? 45 : 25) + (bench ? 25 : 0);
  days.firepit = day;
  game.stamina = Math.min(game.maxStamina, game.stamina + gain);
  game.clock.minutes = Math.min(DAY_END - 10, game.clock.minutes + 30);
  sfx.crackle();
  game.openOverlay(new Dialog([
    `${bench ? 'You settle onto the log bench' : 'You sit on the ground'} by the ${lit(game) ? 'fire' : 'cold fire pit'} for half an hour.`,
    `${FIRESIDE[day % FIRESIDE.length]} (+${gain} energy${bench ? ', the bench helps' : ''})`,
  ]));
}

/** Overnight: hens arrive for a new coop; the morning's eggs. */
export function homesteadOvernight(game: Game): string | null {
  const coops = game.getMap(YARD).countPlaced(O.CHICKEN_COOP);
  if (!coops) return null;
  if (!game.progress.flags.has('hens')) {
    game.progress.flags.add('hens');
    game.progress.days.hens = game.clock.day;
    return `Ruth Haddix came by at first light with three of her laying hens in a crate -- ${HENS.join(', ').replace(/, ([^,]*)$/, ' and $1')} -- and a sack of scratch. "They'll lay tomorrow, if you're nice to them."`;
  }
  const n = eggsToday(game);
  return n ? `The hens are clucking: ${n} egg${n === 1 ? '' : 's'} in the coop.` : null;
}

/** Each frame: the cuckoo clock calls the hour while you're home. */
let lastHour = -1;
export function homesteadTick(game: Game): void {
  const hour = Math.floor(game.clock.minutes / 60);
  if (hour === lastHour) return;
  const first = lastHour < 0;
  lastHour = hour;
  if (first || game.cur.id !== CABIN || !game.cur.countPlaced(O.WALL_CLOCK)) return;
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  sfx.cuckoo(Math.min(4, h12));
}

/** Sprite for a decoration object (null for anything else). */
export function decoSprite(game: Game, o: number, x: number, y: number, time: number, night: boolean, season: number): Canv | null {
  if (!DECO_BY_OBJ[o]) return null;
  const h = (x * 31 + y * 17) % 7;
  switch (o) {
    case O.FIRE_PIT: return HS.firepit[lit(game) ? 1 + (Math.floor(time * 6 + h) % 2) : 0];
    case O.LOG_BENCH: return HS.bench[0];
    case O.CHICKEN_COOP: return HS.coop[game.progress.flags.has('hens') && !night && Math.floor(time * 0.5 + h) % 3 === 0 ? 1 : 0];
    case O.PICNIC_TABLE: return HS.picnic[0];
    case O.LANTERN_POST: return HS.lanternpost[night ? 1 : 0];
    case O.BIRDHOUSE: return HS.birdhouse[!night && Math.floor(time * 0.6 + h) % 4 === 0 ? 1 : 0];
    case O.SCARECROW: return HS.scarecrow[0];
    case O.PLANTER: return HS.planter[season];
    case O.WALL_PAINTING: return HS.painting[0];
    case O.WALL_PHOTO: return HS.photo[0];
    case O.WALL_MAP: return HS.parkmap[0];
    case O.WALL_SAMPLER: return HS.sampler[0];
    case O.WALL_QUILT: return HS.quilt[0];
    case O.WALL_BANJO: return HS.banjo[0];
    case O.WALL_ANTLERS: return HS.antlers[0];
    case O.WALL_CLOCK: return HS.cuckoo[game.clock.minutes % 60 < 3 ? 2 : Math.floor(time * 2) % 2];
    case O.ARMCHAIR: return HS.armchair[0];
    case O.FLOOR_LAMP: return HS.floorlamp[night || game.clock.phase() !== 'day' ? 1 : 0];
    case O.POTTED_FERN: return HS.fern[0];
  }
  return null;
}

/** Light from fire pits, lantern posts and floor lamps. */
export function decoLight(game: Game, o: number, x: number, y: number, cx: number, cy: number, night: boolean): Light | null {
  if (o === O.FIRE_PIT && lit(game)) return { x: x * 16 + 8 - cx, y: y * 16 + 6 - cy, r: 58, flicker: true };
  if (o === O.LANTERN_POST && night) return { x: x * 16 + 12 - cx, y: y * 16 - 4 - cy, r: 42, flicker: true };
  if (o === O.FLOOR_LAMP && game.clock.phase() !== 'day') return { x: x * 16 + 8 - cx, y: y * 16 - 4 - cy, r: 36 };
  return null;
}

/** Smoke curling from lit fire pits (the game's ambience loop calls this). */
export function fireSmoke(game: Game): Array<[number, number]> {
  const m = game.cur;
  if (m.id !== YARD || !lit(game)) return [];
  const out: Array<[number, number]> = [];
  for (const [i, o] of m.placed) if (o === O.FIRE_PIT) out.push([(i % m.w) * 16 + 8, Math.floor(i / m.w) * 16 + 4]);
  return out;
}

/** The hens scratching about in front of their coop by day. */
export function henDrawables(game: Game, time: number, cx: number, cy: number): Array<{ y: number; fn: (g: CanvasRenderingContext2D) => void }> {
  const m = game.cur;
  if (m.id !== YARD || !game.progress.flags.has('hens')) return [];
  const mins = game.clock.minutes;
  if (mins < 390 || mins > 1170) return []; // roosting
  const out: Array<{ y: number; fn: (g: CanvasRenderingContext2D) => void }> = [];
  let coopN = 0;
  for (const [i, o] of m.placed) {
    if (o !== O.CHICKEN_COOP) continue;
    const bx = (i % m.w) * 16, by = Math.floor(i / m.w) * 16;
    const n = coopN++ === 0 ? 3 : 1;
    for (let k = 0; k < n; k++) {
      const t = time * 0.25 + k * 2.1 + coopN * 5;
      const hx = bx + 4 + Math.round(Math.sin(t) * 14 + Math.sin(t * 2.3) * 4), hy = by + 18 + Math.round((Math.cos(t * 0.8) + 1) * 7);
      const peck = Math.floor(time * 3 + k) % 5 === 0 ? 1 : 0;
      const flip = Math.cos(t) * 14 + Math.cos(t * 2.3) * 9 < 0;
      const tx = Math.floor((hx + 4) / 16), ty = Math.floor((hy + 6) / 16);
      if (m.blocked(tx, ty) && m.obj(tx, ty) !== O.CHICKEN_COOP) continue;
      out.push({ y: hy + 8, fn: (g) => {
        const img = HS.hen[peck + (flip ? 2 : 0)];
        g.drawImage(img, hx - cx, hy - cy);
      } });
    }
  }
  return out;
}

/** Things set out on a map, for refunds when a room is rebuilt. */
export function decoItemFor(o: number): string | null { return DECO_BY_OBJ[o]?.item ?? null; }
