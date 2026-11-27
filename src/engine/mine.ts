/**
 * The Deep Seam: rules for the post-epilogue mine (design: MINE_EXPANSION.md).
 *
 * Kit (headlamp + shutter, canary, sounding bar, safety lamp), gas and breath,
 * the Foreman's coal-dust haze, Coal-Chewers and the Foreman himself, carrying
 * and banking the twelve brass tags, passing out, and the blasting-box finale.
 * Saved state is `progress.mine`; everything here that isn't saved is
 * rebuilt when you enter a level.
 */
import type { Game } from './game';
import type { MapId } from '../data/mapgen';
import type { MineSave, MinerId, MineLevel, Pt, Crosscut } from '../data/mine';
import { MINERS, MINER_BY_ID, MINE_LEVELS, LEDGER, LAMP_HOUSE, isMineMap, isDeepSeam } from '../data/mine';
import { O, T } from '../data/tiles';
import { ITEMS } from '../data/items';
import { Dialog } from '../ui/menus';
import type { Choice } from '../ui/menus';
import { sfx } from '../audio/sfx';
import { markMilestone } from './barks';

/* ------------------------------------------------------------------ */
/* Tuning                                                              */
/* ------------------------------------------------------------------ */

const FUEL_OPEN = 0.33;      // per second with the shutter open (~5 minutes a fill)
const FUEL_SHUT = 0.1;
const CHOKE_DRAIN = 14, CHOKE_DRAIN_MASK = 2.5;
const FIRE_DRAIN = 4;
const BREATH_REGEN = 28;
const SEE_FOREMAN = 8, HEAR_TAP = 7, HEAR_CLINK = 5;
const SEE_CHEWER = 5;
const HAZE_PERIOD = 45, HAZE_ON = 15;
export const LIGHT_OPEN = 60, LIGHT_SHUT = 12, LISTEN = 80;

export type EntKind = 'chewer' | 'foreman';
export interface Ent {
  kind: EntKind;
  tag?: MinerId;
  /** Position in tiles (fractional while moving). */
  x: number; y: number;
  /** Tile it's standing on / heading to. */
  tx: number; ty: number; gx: number; gy: number;
  route: Pt[]; idx: number; step: 1 | -1; loop: boolean;
  mode: 'patrol' | 'hunt' | 'search';
  target: Pt | null;
  lost: number;
  anim: number;
}

/** Runtime state (not saved). */
class MineRT {
  map: MapId | null = null;
  ents: Ent[] = [];
  breath = 100;
  hazeClock = 0;
  passing = false;
  drip = 2; creak = 6; pick = 10; clink = 0; chirp = 2; chewSnd = 3; damp = 20;
  whistleCd = 0;
  /** Hit-rect of the headlamp slot on the HUD (tap = refill). */
  lampRect: { x: number; y: number; w: number; h: number } | null = null;
  /** Something nearby is gas (for the canary and the safety lamp). */
  nearGas: 'choke' | 'fire' | null = null;
  inGas: 'choke' | 'fire' | null = null;
}
export const rt = new MineRT();

export function mineState(game: Game): MineSave { return game.progress.mine; }
const key = (map: MapId, x: number, y: number) => `${map}:${x},${y}`;

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

export function tagState(game: Game, id: MinerId): 'in' | 'carried' | 'dropped' | 'out' { return game.progress.mine.tags[id] ?? 'in'; }
export function carried(game: Game): MinerId[] { return MINERS.filter((m) => tagState(game, m.id) === 'carried').map((m) => m.id); }
export function banked(game: Game): number { return MINERS.filter((m) => tagState(game, m.id) === 'out').length; }
/** The Foreman's coal-dust storm: 4 at full strength, weaker every 3 tags banked, gone when the seam is sealed. */
export function hazeLevel(game: Game): number { return game.progress.mine.sealed ? 0 : Math.max(0, 4 - Math.floor(banked(game) / 3)); }
export function hazeOn(game: Game): boolean { return hazeLevel(game) > 0 && isMineMap(game.cur.id) && rt.hazeClock % HAZE_PERIOD >= HAZE_PERIOD - HAZE_ON; }
export function lampLit(game: Game): boolean { const s = game.progress.mine; return s.kit && s.fuel > 0; }
/** Open carbide glare: what the husks and the Foreman are drawn to. */
export function glare(game: Game): boolean { const s = game.progress.mine; return lampLit(game) && !s.shut; }
export function inAlcove(game: Game): boolean { return game.cur.ground(game.player.tx, game.player.ty) === T.ALCOVE; }
export function respirator(game: Game): boolean { return game.look.hat === 'brattice_respirator'; }
export function levelOf(game: Game): MineLevel | null { return MINE_LEVELS[game.cur.id] ?? null; }

/** Light radius in pixels right now. */
export function lightRadius(game: Game): number {
  if (!lampLit(game)) return 9;
  if (game.progress.mine.shut) return LIGHT_SHUT;
  return LIGHT_OPEN - (hazeOn(game) ? hazeLevel(game) * 7 : 0);
}

function gasAt(L: MineLevel | null, x: number, y: number, pad = 0): 'choke' | 'fire' | null {
  if (!L) return null;
  for (const z of L.gas) if (x >= z.x - pad && y >= z.y - pad && x < z.x + z.w + pad && y < z.y + z.h + pad) return z.kind;
  return null;
}

/** Calcified props the safety lamp is picking out (within 4 tiles). */
export function lampedProps(game: Game): Pt[] {
  const L = levelOf(game); if (!L) return [];
  const p = game.player;
  return L.props.filter((pr) => tagState(game, pr.tag) === 'in' && game.cur.obj(pr.at[0], pr.at[1]) === O.CALCIFIED && Math.hypot(pr.at[0] - p.tx, pr.at[1] - p.ty) <= 4).map((pr) => pr.at);
}

/** A crosscut's spirit is visible once its wall is down and his tag is still in the bucket. */
export function spiritsShown(game: Game): Array<{ c: Crosscut }> {
  const L = levelOf(game); if (!L) return [];
  return L.crosscuts.filter((c) => tagState(game, c.tag) === 'in' && game.cur.obj(c.keystone[0], c.keystone[1]) !== O.RUBBLE).map((c) => ({ c }));
}

/* ------------------------------------------------------------------ */
/* Entities                                                            */
/* ------------------------------------------------------------------ */

function ent(kind: EntKind, route: Pt[], loop: boolean, tag?: MinerId): Ent {
  const [x, y] = route[0];
  return { kind, tag, x, y, tx: x, ty: y, gx: x, gy: y, route, idx: 0, step: 1, loop, mode: 'patrol', target: null, lost: 0, anim: Math.random() * 3 };
}

/** Is the Foreman on this level right now? (Level 3 always; Level 2 while you carry tags.) */
function foremanHere(game: Game): boolean {
  const s = game.progress.mine, id = game.cur.id;
  if (s.sealed) return false;
  if (id === 'MINE_L3') return true;
  return id === 'MINE_L2' && carried(game).length > 0;
}

function enterLevel(game: Game): void {
  rt.map = game.cur.id;
  rt.ents = [];
  rt.breath = 100;
  const L = levelOf(game);
  if (!L) return;
  for (const c of L.chewers) if (tagState(game, c.tag) === 'in') rt.ents.push(ent('chewer', c.path, false, c.tag));
  if (foremanHere(game) && L.foreman) rt.ents.push(ent('foreman', L.foreman, true));
}

/** First step of the shortest walkable path from (fx,fy) toward (tx,ty) (null = stay). */
function nextStep(game: Game, fx: number, fy: number, tx: number, ty: number): Pt | null {
  if (fx === tx && fy === ty) return null;
  const m = game.cur, W = m.w;
  const ok = (x: number, y: number) => m.inBounds(x, y) && ((x === tx && y === ty) || !m.blocked(x, y, true));
  const prev = new Map<number, number>();
  const start = fy * W + fx, goal = ty * W + tx;
  prev.set(start, -1);
  const q = [start];
  for (let h = 0; h < q.length && h < 3500; h++) {
    const c = q[h];
    if (c === goal) break;
    const cx = c % W, cy = Math.floor(c / W);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy, ni = ny * W + nx;
      if (!prev.has(ni) && ok(nx, ny)) { prev.set(ni, c); q.push(ni); }
    }
  }
  if (!prev.has(goal)) return null;
  let c = goal;
  while (prev.get(c) !== start && prev.get(c) !== -1) c = prev.get(c)!;
  return [c % W, Math.floor(c / W)];
}

/** Clear line of sight between two tiles (coal ribs and gob block it). */
function sight(game: Game, ax: number, ay: number, bx: number, by: number): boolean {
  const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
  for (let k = 1; k < n; k++) {
    const x = Math.round(ax + ((bx - ax) * k) / n), y = Math.round(ay + ((by - ay) * k) / n);
    const g = game.cur.ground(x, y);
    if (g === T.COAL_RIB || g === T.GOB || game.cur.obj(x, y) === O.RUBBLE) return false;
  }
  return true;
}

function moveEnt(game: Game, e: Ent, dt: number, speed: number): void {
  let goal: Pt;
  if (e.mode === 'patrol') goal = e.route[e.idx];
  else goal = e.target ?? e.route[e.idx];
  // Arrived at the tile we were walking to: choose the next one.
  if (e.x === e.gx && e.y === e.gy) {
    e.tx = e.gx; e.ty = e.gy;
    if (e.mode === 'patrol' && e.tx === goal[0] && e.ty === goal[1]) {
      if (e.loop) e.idx = (e.idx + 1) % e.route.length;
      else { if (e.idx + e.step < 0 || e.idx + e.step >= e.route.length) e.step = e.step === 1 ? -1 : 1; e.idx += e.step; }
      goal = e.route[e.idx];
    }
    const n = nextStep(game, e.tx, e.ty, goal[0], goal[1]);
    if (!n) return;
    [e.gx, e.gy] = n;
  }
  const dx = e.gx - e.x, dy = e.gy - e.y, d = Math.hypot(dx, dy), s = speed * dt;
  if (d <= s) { e.x = e.gx; e.y = e.gy; } else { e.x += (dx / d) * s; e.y += (dy / d) * s; }
}

/** The Foreman hears something (a tap, a falling kettle-bottom, tags clinking): he goes to look. */
function alert(game: Game, x: number, y: number, radius: number, loud: boolean): void {
  for (const e of rt.ents) {
    if (e.kind !== 'foreman' || e.mode === 'hunt') continue;
    if (Math.hypot(e.x - x, e.y - y) > radius) continue;
    e.mode = 'search'; e.target = [x, y]; e.lost = 0;
    if (loud && rt.whistleCd <= 0) { rt.whistleCd = 6; sfx.whistle(); game.shake(0.3); game.toast('A brass whistle shrieks in the dark. The Foreman heard that.'); }
  }
}

function updateEnts(game: Game, dt: number): void {
  const p = game.player, px = p.tx, py = p.ty;
  const hidden = inAlcove(game);
  const lit = glare(game);
  for (const e of rt.ents) {
    e.anim += dt;
    const dist = Math.hypot(e.x - px, e.y - py);
    if (e.kind === 'chewer') {
      // Drawn to open carbide light; lose interest once it's shuttered.
      if (lit && !hidden && dist <= SEE_CHEWER && sight(game, Math.round(e.x), Math.round(e.y), px, py)) { e.mode = 'hunt'; e.target = [px, py]; e.lost = 0; }
      else if (e.mode === 'hunt') { e.lost += dt; if (e.lost > 2) { e.mode = 'patrol'; e.target = null; } }
      moveEnt(game, e, dt, e.mode === 'hunt' ? 3.0 : 1.0);
      if (lit && !hidden && dist < 0.75) { passOut(game, 'chewer'); return; }
    } else {
      const sees = lit && !hidden && dist <= SEE_FOREMAN && sight(game, Math.round(e.x), Math.round(e.y), px, py);
      if (sees) {
        if (e.mode !== 'hunt' && rt.whistleCd <= 0) { rt.whistleCd = 5; sfx.whistle(); game.shake(0.4); game.toast('THE FOREMAN\'S WHISTLE. He has seen your light. Shutter it and hide!'); }
        e.mode = 'hunt'; e.target = [px, py]; e.lost = 0;
      } else if (e.mode === 'hunt') {
        e.lost += dt;
        if (hidden || e.lost > 3) { e.mode = 'search'; e.lost = 0; }
      } else if (e.mode === 'search') {
        e.lost += dt;
        if (e.lost > 6 || (e.target && e.tx === e.target[0] && e.ty === e.target[1])) { e.mode = 'patrol'; e.target = null; }
      }
      const wired = game.progress.mine.wired.length === 4;
      moveEnt(game, e, dt, e.mode === 'hunt' ? (wired ? 4.2 : 3.6) : e.mode === 'search' ? 2.2 : 1.4);
      if (!hidden && dist < 0.75) { passOut(game, 'foreman'); return; }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Per-frame                                                           */
/* ------------------------------------------------------------------ */

let regen = 0;
export function mineTick(game: Game, dt: number): void {
  // Walter's lapel tag: calm breathing, anywhere.
  if (game.look.outfit === 'lapel_tag') { regen += dt; if (regen >= 3) { regen = 0; game.stamina = Math.min(game.maxStamina, game.stamina + 1); } }
  const id = game.cur.id;
  document.body.classList.toggle('in-mine', isDeepSeam(id) && game.progress.mine.kit);
  if (!isMineMap(id)) { rt.map = null; rt.ents = []; return; }
  if (rt.map !== id) enterLevel(game);
  if (rt.passing) return;
  const s = game.progress.mine, inp = game.input;
  const p = game.player;
  rt.whistleCd = Math.max(0, rt.whistleCd - dt);
  rt.hazeClock += dt;

  // Controls: shutter, sounding bar, refill (keys, touch pills, the HUD lamp).
  if (inp.pressed('shutter')) toggleShutter(game);
  if (inp.pressed('tap')) soundTap(game);
  if (inp.pressed('refill')) refill(game);
  for (const t of inp.taps) { const r = rt.lampRect; if (r && t.x >= r.x && t.y >= r.y && t.x < r.x + r.w && t.y < r.y + r.h) refill(game); }

  // Carbide.
  if (s.kit && s.fuel > 0) {
    const before = s.fuel;
    s.fuel = Math.max(0, s.fuel - (s.shut ? FUEL_SHUT : FUEL_OPEN) * dt);
    if (before > 20 && s.fuel <= 20) game.toast('Your headlamp is sputtering. Refill it: Carbide Pellets + Drip-Seep Water (R).');
    if (before > 0 && s.fuel === 0) { sfx.cancel(); game.toast('The carbide is spent. Your headlamp gutters out.'); }
  }

  // Gas, haze and breath.
  const L = levelOf(game);
  rt.inGas = gasAt(L, p.tx, p.ty);
  rt.nearGas = rt.inGas ?? gasAt(L, p.tx, p.ty, 2);
  const haze = hazeOn(game) ? hazeLevel(game) : 0;
  let drain = 0;
  if (rt.inGas === 'fire' && glare(game)) { passOut(game, 'firedamp'); return; }
  if (rt.inGas === 'choke') drain += respirator(game) ? CHOKE_DRAIN_MASK : CHOKE_DRAIN;
  if (rt.inGas === 'fire') drain += respirator(game) ? 1 : FIRE_DRAIN;
  if (haze) drain += haze * 1.4 * (respirator(game) ? 0.2 : 1) * (game.look.outfit === 'fireboss_slicker' ? 0.7 : 1);
  if (drain > 0) rt.breath -= drain * dt; else rt.breath = Math.min(100, rt.breath + BREATH_REGEN * dt);
  if (rt.breath <= 0) { passOut(game, haze && !rt.inGas ? 'haze' : 'gas'); return; }

  // Cold and damp below (the oilskin keeps it off).
  rt.damp -= dt;
  if (rt.damp <= 0) { rt.damp = 20; if (game.look.outfit !== 'fireboss_slicker') game.stamina = Math.max(0, game.stamina - 1); }

  updateEnts(game, dt);
  if (rt.passing) return;

  // Sound: the canary, the mine breathing, tags in your pocket.
  rt.chirp -= dt;
  if (s.kit && rt.chirp <= 0) {
    const quiet = rt.nearGas || haze;
    if (quiet) { sfx.cageRattle(); rt.chirp = 1.6; } else { sfx.canary(); rt.chirp = 3.5 + Math.random() * 3; }
  }
  rt.drip -= dt; if (rt.drip <= 0) { sfx.drip(); rt.drip = 1.5 + Math.random() * 4; }
  rt.creak -= dt; if (rt.creak <= 0) { sfx.creak(); rt.creak = 7 + Math.random() * 9; }
  rt.pick -= dt; if (rt.pick <= 0) { sfx.pickClink(); rt.pick = 11 + Math.random() * 14; }
  rt.chewSnd -= dt;
  if (rt.chewSnd <= 0) { rt.chewSnd = 2.5; if (rt.ents.some((e) => e.kind === 'chewer' && Math.hypot(e.x - p.tx, e.y - p.ty) < 7)) sfx.chew(); }
  rt.clink -= dt;
  if (p.moving && carried(game).length && rt.clink <= 0) {
    rt.clink = 0.6;
    sfx.tagClink();
    alert(game, p.tx, p.ty, HEAR_CLINK, false);
  }
  // A carried tag pulls the Foreman up to Level 2.
  if (game.cur.id === 'MINE_L2' && foremanHere(game) && !rt.ents.some((e) => e.kind === 'foreman')) {
    const f = ent('foreman', MINE_LEVELS.MINE_L2.foreman!, true);
    rt.ents.push(f);
    sfx.whistle();
    game.toast('Far off, down the slope from Level 3: a whistle. He can hear your tags clinking.');
  }
}

/** Stepped onto a tile: dropped tags, kettle-bottoms. */
export function mineArrive(game: Game, x: number, y: number): void {
  const s = game.progress.mine, id = game.cur.id;
  if (!isMineMap(id)) return;
  const d = s.dropped.findIndex((t) => t.map === id && t.x === x && t.y === y);
  if (d >= 0) {
    const t = s.dropped[d];
    s.dropped.splice(d, 1);
    s.tags[t.id] = 'carried';
    sfx.tagClink();
    game.toast(`Picked up check ${MINER_BY_ID[t.id].check} (${MINER_BY_ID[t.id].name}) where you fell.`);
  }
  const L = levelOf(game);
  if (L && L.kettles.some(([kx, ky]) => kx === x && ky === y) && !s.kettles.includes(key(id, x, y))) {
    s.kettles.push(key(id, x, y));
    sfx.caveIn(); game.shake(0.5);
    game.stamina = Math.max(0, game.stamina - 15);
    game.notice('A kettle-bottom drops out of the roof and glances off your shoulder! (-15 energy. Tap ahead with the Sounding Bar to find them first.)');
    alert(game, x, y, 9, true);
  }
}

/* ------------------------------------------------------------------ */
/* Kit actions                                                         */
/* ------------------------------------------------------------------ */

export function toggleShutter(game: Game): void {
  const s = game.progress.mine;
  if (!s.kit) return;
  s.shut = !s.shut;
  sfx.blip();
  game.toast(s.shut ? 'Shutter closed. Listening by phosphor-green dark.' : 'Shutter open. Carbide glare.');
}

export function refill(game: Game): void {
  const s = game.progress.mine;
  if (!s.kit) return;
  if (s.fuel >= 95) { game.toast('Your headlamp is full.'); return; }
  if (game.inv.count('carbide_pellets') < 1 || game.inv.count('seep_water') < 1) { sfx.error(); game.toast('Refilling needs 1 Carbide Pellets and 1 Drip-Seep Water.'); return; }
  game.inv.remove('carbide_pellets', 1); game.inv.remove('seep_water', 1);
  s.fuel = 100;
  sfx.refill();
  game.toast('Pellet in, water in, a hiss of acetylene: the headlamp burns bright.');
}

/** Fire-Boss Sounding Bar on the tile you face. */
export function soundTap(game: Game): void {
  const s = game.progress.mine;
  if (!s.kit) return;
  const [x, y] = game.player.facing();
  const m = game.cur, o = m.obj(x, y), id = m.id;
  const L = levelOf(game);
  alert(game, game.player.tx, game.player.ty, HEAR_TAP, true);
  const thud = (msg: string) => { sfx.tapThud(); game.notice(`HOLLOW THUD. ${msg}`); };
  const ring = (msg: string) => { sfx.tapRing(); game.notice(`RING. ${msg}`); };
  if (o === O.CALCIFIED) { thud(shored(game, x, y) ? 'A false support, but the hemlock beside it takes the weight now. Press A to pry the tag loose.' : 'Not slate: a false, petrified support holding the roof. Shore it with a Hemlock Prop on the floor beside it before you pry.'); return; }
  if (o === O.RUBBLE && L) {
    const c = L.crosscuts.find((cc) => cc.keystone[0] === x && cc.keystone[1] === y);
    if (c) { if (!s.keystones.includes(key(id, x, y))) s.keystones.push(key(id, x, y)); thud('The keystone! Everything else is wedged against it. Press A to pry it out.'); }
    else ring('Solid rubble, packed tight. Try the other stones.');
    return;
  }
  if (L && L.kettles.some(([kx, ky]) => kx === x && ky === y) && !s.kettles.includes(key(id, x, y))) {
    s.kettles.push(key(id, x, y));
    sfx.tapThud(); sfx.caveIn(); game.shake(0.3);
    game.notice('HOLLOW THUD overhead: a kettle-bottom! You knock it down with the bar and step back as it smashes. Safe now.');
    alert(game, x, y, 9, true);
    return;
  }
  if (o === O.CRIB) { ring('Solid as the day Josef notched it.'); return; }
  if (o === O.HEMLOCK_PROP) { ring('Green hemlock, tight and true.'); return; }
  ring('Solid slate.');
}

function shored(game: Game, x: number, y: number): boolean {
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => game.cur.obj(x + dx, y + dy) === O.HEMLOCK_PROP);
}

/** Wedge a hemlock prop (from the hotbar) on open floor. */
export function placeHemlock(game: Game, x: number, y: number): void {
  const m = game.cur;
  if (!isMineMap(m.id)) { sfx.error(); game.notice('Hemlock props are for the mine, underground.'); return; }
  if (!m.inBounds(x, y) || m.obj(x, y) !== O.NONE || m.blocked(x, y, true) || m.portalAt(x, y) || m.ground(x, y) === T.MINE_RAIL || m.ground(x, y) === T.ALCOVE) {
    sfx.error(); game.notice('Wedge the prop on open floor (not on the rails or in an alcove).'); return;
  }
  m.placeObject(m.idx(x, y), O.HEMLOCK_PROP);
  game.inv.removeAt(game.sel, 1);
  sfx.chop();
  const by = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => m.obj(x + dx, y + dy) === O.CALCIFIED);
  game.toast(by ? 'You hammer the hemlock prop in tight beside the calcified man. The roof settles onto it with a groan.' : 'Hemlock prop wedged in. (Props only help right beside a Calcified Prop.)');
}

/* ------------------------------------------------------------------ */
/* Passing out                                                         */
/* ------------------------------------------------------------------ */

const WAKE: Record<string, string> = {
  gas: 'The air went thin and sweet and you went down with it. The canary was trying to tell you.',
  haze: 'The coal-dust haze closed over you like a hand. You couldn\'t breathe, and then you couldn\'t see.',
  firedamp: 'Your open carbide flame touched the firedamp. A blue WHUMP, a wall of heat, and nothing.',
  chewer: 'Your light drew it. Ember throat, coal-black teeth, then a weight on your chest and the dark.',
  foreman: 'A shape too tall for the drift, slag grinding on slag, a tally chain dragging. A hand closes on your collar.',
  cavein: 'The roof came in. You remember the sound most of all, like a ship\'s timbers going.',
};

export function passOut(game: Game, cause: keyof typeof WAKE): void {
  if (rt.passing) return;
  rt.passing = true;
  const s = game.progress.mine, map = game.cur.id, p = game.player;
  const dropped = carried(game);
  for (const id of dropped) { s.tags[id] = 'dropped'; s.dropped.push({ id, map, x: p.tx, y: p.ty }); }
  sfx.caveIn(); game.shake(0.8);
  game.transition(() => {
    game.overlays.length = 0;
    game.enterMap('LAMP_HOUSE', LAMP_HOUSE.wake[0], LAMP_HOUSE.wake[1], 'down');
    game.stamina = Math.max(game.stamina, Math.floor(game.maxStamina / 2));
    game.clock.minutes += 60;
    rt.breath = 100;
    rt.passing = false;
    rt.map = null;
    const pages = [WAKE[cause], 'You come to on the lamp-house bench, coughing. Somebody hauled you up in the cage. Nobody will say who. There is a sooty handprint on your sleeve, and it is too small to be a man\'s.'];
    if (dropped.length) pages.push(`Your pockets are lighter: ${dropped.length} brass tag${dropped.length > 1 ? 's' : ''} fell where you went down. They\'re still there, glinting. Go back for ${dropped.length > 1 ? 'them' : 'it'}.`);
    game.openOverlay(new Dialog(pages));
  });
}

/* ------------------------------------------------------------------ */
/* Interactions                                                        */
/* ------------------------------------------------------------------ */

function once(game: Game, map: MapId, x: number, y: number): boolean {
  const s = game.progress.mine, k = key(map, x, y);
  if (s.stock[k] === game.clock.day) return false;
  s.stock[k] = game.clock.day;
  return true;
}

function give(game: Game, id: string, n: number): void {
  const left = game.inv.add(id, n);
  if (left) game.storage.add(id, left);
}

function takeTag(game: Game, id: MinerId, lines: string[]): void {
  game.progress.mine.tags[id] = 'carried';
  sfx.tagClink(); sfx.trustChime();
  const m = MINER_BY_ID[id];
  game.openOverlay(new Dialog([...lines, `You have check ${m.check}: ${m.name.toUpperCase()}, ${m.age}, ${m.job}. Carry it up to the In-and-Out Board. (It clinks. Something below can hear it.)`]));
}

/** Coal-Chewer on the tile you face? */
export function chewerAt(x: number, y: number): Ent | null {
  return rt.ents.find((e) => e.kind === 'chewer' && Math.round(e.x) === x && Math.round(e.y) === y) ?? null;
}

/** A in the Lamp House or below (or at the Lamp House in town). Returns true if handled. */
export function mineInteract(game: Game, tx: number, ty: number): boolean {
  const m = game.cur, id = m.id;
  // The Lamp House on the hill above town.
  if (id === 'PINE_HOLLOW_TOWN') {
    if (!m.inBounds(tx, ty) || m.objects[m.anchorIdx(m.idx(tx, ty))] !== O.LAMP_HOUSE) return false;
    return enterLampHouse(game, tx, ty);
  }
  if (!isDeepSeam(id)) return false;
  const s = game.progress.mine;
  const ch = chewerAt(tx, ty);
  if (ch) { offerChewer(game, ch); return true; }
  const i = m.idx(tx, ty);
  const ai = m.anchorIdx(i);
  const o = m.objects[ai];
  const ax = ai % m.w, ay = Math.floor(ai / m.w);
  const sign = m.def.signs.get(ai);
  const L = levelOf(game);
  const say = (...pages: string[]) => { sfx.blip(); game.openOverlay(new Dialog(pages)); };
  switch (o) {
    case O.LOCKER: locker(game); return true;
    case O.INOUT_BOARD: board(game); return true;
    case O.LIFT: lift(game); return true;
    case O.CARBIDE:
      if (!once(game, id, ax, ay)) { say(sign ?? 'The carbide tin is empty for today. It refills by morning (somebody keeps it filled).'); return true; }
      give(game, 'carbide_pellets', 3); sfx.harvest(); game.toast('Took 3 Carbide Pellets.'); return true;
    case O.SEEP:
      give(game, 'seep_water', 1); sfx.water(); game.toast('You fill a flask from the seep: Drip-Seep Water. Cold as January.'); return true;
    case O.CUPBOARD:
      if (!once(game, id, ax, ay)) { say('The biscuit tin is empty. Liesl brings a fresh batch up the hill every morning, now.'); return true; }
      give(game, 'miner_biscuit', 3); sfx.harvest(); game.toast("Took 3 Miner's Biscuits, still warm. (Omi Liesl's, by the look of them.)"); return true;
    case O.TIMBER_RACK:
      if (id === 'LAMP_HOUSE') {
        if (game.inv.count('timber') < 1) { say('The timber rack: fresh hemlock, cut to roof height. Gideon will saw you a prop for every 1 Timber you bring. (You have none.)'); return true; }
        game.openOverlay(new Dialog(['The timber rack: fresh hemlock, cut to roof height. Trade Timber for Hemlock Props?'], [
          { label: 'Cut 1 prop (1 Timber)', fn: () => { game.inv.remove('timber', 1); give(game, 'hemlock_prop', 1); sfx.chop(); game.toast('1 Fresh Hemlock Prop.'); } },
          ...(game.inv.count('timber') >= 3 ? [{ label: 'Cut 3 props (3 Timber)', fn: () => { game.inv.remove('timber', 3); give(game, 'hemlock_prop', 3); sfx.chop(); game.toast('3 Fresh Hemlock Props.'); } }] : []),
          { label: 'Leave', fn: () => undefined },
        ]));
        return true;
      }
      if (!once(game, id, ax, ay)) { say('A salvage stack of timber. Nothing sound left in it today.'); return true; }
      give(game, 'hemlock_prop', 1); sfx.chop(); game.toast('Salvaged a sound Hemlock Prop from the stack.'); return true;
    case O.FIRST_AID:
      if (!game.wardrobe.has('brattice_respirator')) {
        game.wardrobe.add('brattice_respirator'); sfx.fanfare();
        say(sign ?? '', 'You take the WET-WOOL BRATTICE RESPIRATOR & GOGGLES. (Wardrobe: wear it as your hat. Breath lasts far longer in chokedamp and haze, and you\'ll need it to reach the crosscut buckets.)');
        return true;
      }
      say('The first-aid box: bandages, iodine, and a faded card: "IN BAD AIR, WET THE WOOL AND BREATHE SLOW."'); return true;
    case O.LEDGER_PAGE: {
      const n = Number((m.def.meta?.get(ai) ?? '').split(':')[1]);
      const pg = LEDGER.find((x) => x.id === n);
      if (!pg) return false;
      if (!s.pages.includes(n)) s.pages.push(n);
      m.removeObject(ai);
      sfx.harvest();
      say(pg.found, `(Ledger page ${s.pages.length}/${LEDGER.length}. It's in German script. Opa Walter can read it to you.)`);
      return true;
    }
    case O.CALCIFIED: calcified(game, ax, ay); return true;
    case O.RUBBLE: rubble(game, ax, ay); return true;
    case O.BUCKET: {
      const c = L?.crosscuts.find((cc) => cc.bucket[0] === ax && cc.bucket[1] === ay);
      if (c && tagState(game, c.tag) === 'in') { spiritBucket(game, c); return true; }
      say(sign ?? 'A tin dinner bucket, empty now. The lid is scratched with initials.'); return true;
    }
    case O.CRIB: crib(game, ax, ay); return true;
    case O.HEMLOCK_PROP: say('Your hemlock prop, wedged tight. It smells like Christmas down here, which is strange.'); return true;
    case O.MINE_POST: say('An old timber set: two legs and a collar beam, black with a century of damp. (Tap things with the Sounding Bar, T, to hear what\'s sound.)'); return true;
    default:
      if (sign) { say(sign); return true; }
      return false;
  }
}

function enterLampHouse(game: Game, tx: number, ty: number): boolean {
  const s = game.progress.mine;
  if (!game.progress.flags.has('mine_open')) {
    sfx.blip();
    game.openOverlay(new Dialog([game.cur.def.signs.get(game.cur.anchorIdx(game.cur.idx(tx, ty))) ?? 'The lamp house is padlocked.']));
    return true;
  }
  sfx.door();
  const first = !game.progress.flags.has('lamphouse_in');
  game.transition(() => {
    game.enterMap('LAMP_HOUSE', LAMP_HOUSE.arrive[0], LAMP_HOUSE.arrive[1], 'up');
    if (first) {
      game.progress.flags.add('lamphouse_in');
      game.openOverlay(new Dialog([
        'Inside, the warm town falls away behind you. Bare boards, lamp hooks, the smell of carbide and cold stone. The light in here is the colour of an old photograph.',
        'Opa Walter is sitting on the bench, his walking stick across his knees. He doesn\'t usually come up this hill.',
        'OPA WALTER: "When Gideon opened the lamp house, he found a second board behind the panel. Older. 1914. Twelve checks still on IN. Nobody ever brought them out."',
        'OPA WALTER: "My Onkel Josef built the cribs down there. He left warnings in the company ledger, in the old script. I have heard that mountain humming for forty years. I think it is waiting for somebody to finish the shift."',
        ...(s.kit ? [] : ['OPA WALTER: "The locker, there. Everything a man needed in 1914. Take it all. And Ranger: take only your share. Bring every man out."']),
      ]));
    }
  });
  return true;
}

function locker(game: Game): void {
  const s = game.progress.mine;
  if (!s.kit) {
    s.kit = true; s.fuel = 100; s.shut = false;
    game.wardrobe.add('miner_coveralls'); game.wardrobe.add('miner_cap');
    give(game, 'carbide_pellets', 4); give(game, 'seep_water', 2); give(game, 'miner_biscuit', 2); give(game, 'mine_ledger', 1);
    sfx.fanfare();
    game.openOverlay(new Dialog([
      'THE MINE KIT. You take down, one by one:',
      'A JUSTRITE BRASS CARBIDE HEADLAMP with a hinged SHUTTER HOOD. (F or SHUT: close it and they can\'t see you, but your world shrinks to a phosphor-green circle you mostly hear. R refills it: 1 Carbide Pellets + 1 Drip-Seep Water.)',
      'A CANARY in a wire cage. (It sings in good air. When it goes quiet and rattles the bars, there\'s gas or haze. Get out of it.)',
      'A FIRE-BOSS SOUNDING BAR. (T or TAP: RING is solid slate, HOLLOW THUD is trouble, or a keystone. It\'s loud. He hears it.)',
      'A DAVY SAFETY LAMP for your belt. (It burns blue-green near firedamp: shutter your carbide there or it ignites. It picks out the calcified props that are holding up the roof.)',
      'Also: Canvas Miner\'s Coveralls and a Hard-Boiled Leather Cap (wardrobe), carbide, water, biscuits, and the BLACK-EDGED MINE LEDGER for any pages you find.',
      'The lift cage is in the corner. Twelve checks on the board say IN. Bring them OUT.',
    ]));
    return;
  }
  if (banked(game) === 12 && !s.sealed && game.inv.count('blasting_box') + game.storage.count('blasting_box') === 0) {
    give(game, 'blasting_box', 1); give(game, 'black_powder', 4);
    sfx.fanfare();
    game.openOverlay(new Dialog([
      'At the back of the locker, where there was nothing yesterday: a HAND-CRANK BLASTING BOX, a coil of copper wire, and four BLACK POWDER CHARGES wrapped in oilcloth. A note in Gideon\'s block capitals: "FOR THE CRIBS. ALL FOUR. THEN CRANK IT AT THE LIFT AND DON\'T LOOK BACK."',
      'Under it, in Walter\'s shaky hand, one line of German and its English: "Und wenn die Schuld bezahlt ist, schliess die Hand." And when the debt is paid, close the hand.',
    ]));
    return;
  }
  sfx.blip();
  game.openOverlay(new Dialog([`The locker. Carbide ${Math.round(s.fuel)}%. Tags banked: ${banked(game)}/12. ${s.sealed ? 'The Deep Seam is sealed.' : banked(game) === 12 ? 'Everything you need is in your pack.' : 'The board still says IN for the rest.'}`]));
}

/** The 1914 In-and-Out Board: hang carried tags on OUT. */
function board(game: Game): void {
  const s = game.progress.mine;
  const mine = carried(game);
  if (!mine.length) {
    const rows = MINERS.map((m) => `${String(m.check).padStart(3)} ${m.name.split(' ').slice(-1)[0].toUpperCase()}: ${tagState(game, m.id) === 'out' ? 'OUT' : tagState(game, m.id) === 'dropped' ? 'DROPPED' : 'IN'}`);
    sfx.blip();
    game.openOverlay(new Dialog([
      `THE IN-AND-OUT BOARD, NIGHT SHIFT, 11 MARCH 1914. ${banked(game)}/12 OUT.`,
      rows.slice(0, 6).join(' / '),
      rows.slice(6).join(' / '),
      s.sealed ? 'Every peg says OUT. Somebody has hung a sprig of mountain mint over the board.' : 'Carry their brass checks up from below and hang them here.',
    ]));
    return;
  }
  const pages: string[][] = [];
  for (const id of mine) {
    s.tags[id] = 'out';
    pages.push([`You hang check ${MINER_BY_ID[id].check} on the OUT peg.`, ...MINER_BY_ID[id].memory]);
  }
  const n = banked(game);
  const notes: string[] = [];
  const before = n - mine.length;
  if (Math.floor(n / 3) > Math.floor(before / 3)) notes.push(n === 12 ? 'Far below, the haze is gone. For the first time in eighty years the Deep Seam is just dark, not angry.' : `Below, the Foreman's coal-dust storm weakens (${hazeLevel(game)}/4). The mountain breathes a little easier.`);
  if (before < 6 && n >= 6) { game.wardrobe.add('fireboss_slicker'); notes.push('A peg by the board holds a FIRE-BOSS HEAVY OILSKIN SLICKER that wasn\'t there before, C.V. inked inside the collar. (Wardrobe.)'); }
  if (n === 12) notes.push('All twelve. The board is quiet. There is one more thing in the locker now: Gideon left it.');
  markMilestone(game, 'mine_tags');
  sfx.trustChime();
  if (notes.length) game.openOverlay(new Dialog(notes));
  for (const p of pages.reverse()) game.openOverlay(new Dialog(p));
}

function lift(game: Game): void {
  const s = game.progress.mine, here = game.cur.id;
  if (!s.kit) { sfx.error(); game.openOverlay(new Dialog(['The lift cage. A sign on the gate: "NO MAN GOES DOWN WITHOUT HIS KIT." (Open the locker first.)'])); return; }
  const go = (map: MapId) => () => {
    sfx.door(); sfx.creak();
    game.transition(() => {
      if (map === 'LAMP_HOUSE') game.enterMap('LAMP_HOUSE', LAMP_HOUSE.lift[0] - 1, LAMP_HOUSE.lift[1] + 1, 'down');
      else { const L = MINE_LEVELS[map]; game.enterMap(map, L.lift[0] + 1, L.lift[1] + 1, 'down'); }
    });
  };
  // The finale: everything wired, crank it here.
  if (here === 'MINE_L3' && s.wired.length === 4 && !s.sealed) {
    game.openOverlay(new Dialog(['The C&O ore-cart lift, the wires from all four cribs run to the box in your hands. The Foreman is coming. You can hear the chain.'], [
      { label: 'Crank the blasting box', fn: () => finale(game) },
      { label: 'Not yet', fn: () => undefined },
    ]));
    return;
  }
  const choices: Choice[] = [];
  if (here !== 'LAMP_HOUSE') choices.push({ label: 'Up to the Lamp House', fn: go('LAMP_HOUSE') });
  if (here !== 'MINE_L1') choices.push({ label: 'Level 1: Main Haulageway', fn: go('MINE_L1') });
  if (here !== 'MINE_L2') choices.push({ label: 'Level 2: Room & Pillar', fn: go('MINE_L2') });
  if (here !== 'MINE_L3' && !s.sealed) choices.push({ label: 'Level 3: The Deep Face', fn: go('MINE_L3') });
  choices.push({ label: 'Stay', fn: () => undefined });
  sfx.blip();
  game.openOverlay(new Dialog([here === 'LAMP_HOUSE' ? 'The lift cage, iron and oak, hanging over the dark. Ring the bell for a level.' : `The lift cage. ${s.sealed ? 'Level 3\'s gate is chained: below it, solid rock.' : 'The bell rope is wet.'}`], choices));
}

function calcified(game: Game, x: number, y: number): void {
  const L = levelOf(game);
  const pr = L?.props.find((p) => p.at[0] === x && p.at[1] === y);
  if (!pr) return;
  const m = MINER_BY_ID[pr.tag];
  const pages = [`A man, or the shape of one, turned to anthracite from the boots up, his shoulders braced against a sagging roof. Glinting at his collar: a brass check, number ${m.check}, fused into the coal.`];
  if (!shored(game, x, y)) {
    game.openOverlay(new Dialog([...pages, 'The roof bellies down around him. He\'s holding it. Pry the tag out now and he\'ll crumble and the roof with him. (Wedge a Hemlock Prop on the floor beside him first.)'], [
      { label: 'Pry it anyway', fn: () => { sfx.caveIn(); game.shake(1); game.afterOverlays(() => passOut(game, 'cavein')); } },
      { label: 'Leave it', fn: () => undefined },
    ]));
    return;
  }
  game.openOverlay(new Dialog([...pages, 'Your hemlock prop is tight beside him, taking the weight.'], [
    { label: 'Pry the tag loose', fn: () => {
      game.cur.removeObject(game.cur.idx(x, y));
      sfx.crumble(); sfx.creak();
      game.particles.dust(x * 16 + 8, y * 16 + 12, 'down');
      takeTag(game, pr.tag, ['You set the Sounding Bar behind the check and lean. It comes free with a sound like a sigh. The man crumbles, gently, into a heap of fine black dust, and the hemlock takes the roof without a murmur.']);
    } },
    { label: 'Leave it', fn: () => undefined },
  ]));
}

function rubble(game: Game, x: number, y: number): void {
  const L = levelOf(game), s = game.progress.mine, id = game.cur.id;
  const c = L?.crosscuts.find((cc) => cc.rubble.some(([rx, ry]) => rx === x && ry === y));
  if (!c) return;
  const isKey = c.keystone[0] === x && c.keystone[1] === y;
  if (!isKey || !s.keystones.includes(key(id, x, y))) {
    sfx.blip();
    game.openOverlay(new Dialog(['A wall of rubble and broken brick, packed into a crosscut. Chalked across it, faded: "SEALED BY ORDER -- 12/3/14." Faintly, from behind it, a tapping. Three slow knocks.', '(Tap the stones with the Sounding Bar, T. One of them won\'t ring: the keystone.)']));
    return;
  }
  game.openOverlay(new Dialog(['The keystone. You get the bar behind it.'], [
    { label: 'Pry it out', fn: () => {
      for (const [rx, ry] of c.rubble) game.cur.removeObject(game.cur.idx(rx, ry));
      sfx.caveIn(); game.shake(0.6);
      alert(game, x, y, 10, true);
      game.openOverlay(new Dialog(['The keystone comes out and the wall slumps in on itself in a long rattle of brick. Stale, heavy air rolls out over your boots: chokedamp, trapped for eighty years. The canary goes quiet.', 'In the dark beyond, a faint figure sits beside a dented tin dinner bucket, as if waiting for the shift whistle. (Wear the Wet-Wool Respirator to reach the bucket.)']));
    } },
    { label: 'Not yet', fn: () => undefined },
  ]));
}

function spiritBucket(game: Game, c: Crosscut): void {
  const m = MINER_BY_ID[c.tag];
  if (!respirator(game)) {
    sfx.error();
    game.openOverlay(new Dialog(['The chokedamp is thick at the bucket, sweet and heavy. Your eyes stream. You\'d go down before you got the lid off. (Put on the Wet-Wool Brattice Respirator from your wardrobe.)']));
    return;
  }
  const lines: Record<string, string> = {
    kessler: 'Inside the bucket: a carpenter\'s pencil, a folded drawing of a dovetail joint, and brass check 90. The figure beside it looks up, a skinny boy in a canvas apron. He says something in German, softly. Then he isn\'t there.',
    vance: 'Inside the bucket: a fire boss\'s chalk, a slate marked "C.V. -- 3-12-14 -- NOT CLEAR," and brass check 97. The figure is a broad man with Agnes\'s eyes. He nods to you, the way you nod to the relief shift. Then he\'s gone.',
    lusk: 'Inside the bucket: half a biscuit, a marble, a trapper boy\'s little brass bell, and check 103. The figure is very small. He was holding the door, the way he was told. You tell him he can stop now. He does.',
  };
  takeTag(game, c.tag, [lines[c.tag] ?? `Inside the bucket: brass check ${m.check}.`]);
}

function crib(game: Game, x: number, y: number): void {
  const s = game.progress.mine;
  const L = MINE_LEVELS.MINE_L3;
  const n = (L.cribs ?? []).findIndex(([cx, cy]) => cx === x && cy === y);
  if (n < 0) return;
  if (s.wired.includes(n)) { sfx.blip(); game.openOverlay(new Dialog(['A black powder charge is lashed into the crib, its copper lead running back toward the lift.'])); return; }
  if (game.inv.count('blasting_box') < 1 || game.inv.count('black_powder') < 1) {
    sfx.blip();
    game.openOverlay(new Dialog(['A MASTER TIMBER CRIB: notched hemlock logs laid log-cabin style, floor to roof, black with age. Carved in one log: "J.M. 1911." Four of these hold up the whole Tally Chamber.', banked(game) === 12 ? '(The blasting box and charges are in the Lamp House locker.)' : '(Josef\'s ledger: take out all four, and the mountain closes its hand.)']));
    return;
  }
  game.openOverlay(new Dialog(['Josef\'s crib. You could wire a charge into it.'], [
    { label: 'Wire a charge', fn: () => {
      game.inv.remove('black_powder', 1);
      s.wired.push(n);
      sfx.till();
      alert(game, x, y, 12, true);
      const left = 4 - s.wired.length;
      game.toast(left ? `Charge wired. ${left} crib${left > 1 ? 's' : ''} left.` : 'All four cribs wired. Get to the ore-cart lift and crank the box!');
      if (!left) { sfx.whistle(); game.shake(0.6); }
    } },
    { label: 'Not yet', fn: () => undefined },
  ]));
}

/** Coal-Chewer: shutter closed, then offer water or something warm. */
function offerChewer(game: Game, e: Ent): void {
  if (glare(game)) {
    sfx.chew();
    game.openOverlay(new Dialog(['It turns into your light, ember throat glowing, and lunges.']));
    game.afterOverlays(() => passOut(game, 'chewer'));
    return;
  }
  const held = game.selected;
  const ok = held && (held.id === 'seep_water' || held.id === 'pepperoni_roll' || held.id === 'miner_biscuit');
  if (!ok || !e.tag) {
    sfx.chew();
    game.openOverlay(new Dialog(['In the green dark you can make it out: a husk of a man, coal-black, chewing and chewing on a lump of coal, an ember glowing in its throat. It doesn\'t know you\'re there.', '(Hold Drip-Seep Water, a Pepperoni Roll or a Miner\'s Biscuit and press A.)']));
    return;
  }
  game.inv.removeAt(game.sel, 1);
  const tag = e.tag;
  rt.ents = rt.ents.filter((x) => x !== e);
  const what = held.id === 'seep_water' ? 'You tip cold seep water into its cupped hands. It drinks, and drinks, and the ember in its throat hisses out.'
    : `You hold out the ${ITEMS[held.id].name}. It stops chewing. It takes it, the way a man takes his supper from his wife\'s hands, and bites, and the coal falls out of its mouth.`;
  takeTag(game, tag, [what, 'For a moment you see who it was: a face, tired and young, coal dust in the creases of a smile. He presses something into your palm, and then there is only a little heap of soot on the rail.']);
}

/* ------------------------------------------------------------------ */
/* The finale                                                          */
/* ------------------------------------------------------------------ */

function finale(game: Game): void {
  const s = game.progress.mine;
  sfx.crank();
  game.shake(1.5);
  setTimeout(() => { sfx.caveIn(); sfx.whistle(); }, 600);
  s.sealed = true;
  s.wired = [];
  game.progress.flags.add('seam_sealed');
  markMilestone(game, 'seam_sealed');
  for (const id of ['blasting_box', 'black_powder']) { const n = game.inv.count(id); if (n) game.inv.remove(id, n); }
  rt.ents = [];
  game.openOverlay(new Dialog([
    'You crank the handle round, once, twice, three times, and slam it home.',
    'The four cribs go one after another, WHUMP WHUMP WHUMP WHUMP, Josef\'s logs flying apart like matchsticks, and the roof of the Tally Chamber comes down with a sound like the whole mountain clearing its throat.',
    'Somewhere in the dust the Foreman\'s whistle blows, and blows, and is cut off in the middle of a note.',
    'You throw yourself into the ore cart and pull the brake, and the C&O lift hauls you up through the roaring dark, past Level 2, past Level 1, past the drift mouth, into lamplight.',
  ]));
  game.afterOverlays(() => game.transition(() => {
    game.enterMap('LAMP_HOUSE', LAMP_HOUSE.wake[0], LAMP_HOUSE.wake[1], 'down');
    game.wardrobe.add('lapel_tag');
    sfx.fanfare();
    game.openOverlay(new Dialog([
      'Dust is still sifting from the lamp-house rafters. Opa Walter is there, and Gideon with his hand on the lift rope, and behind them, in the doorway, Elias Vance with his hat in his hands.',
      'OPA WALTER: "Gut. Gut gemacht. Josef wrote it, the last page: when the debt is paid, close the hand. You closed it."',
      'GIDEON: "The hum\'s stopped. I put my hand on the boards out there. Nothing. Just a hill."',
      'ELIAS: "Clement Vance was my great-uncle. My mother used to say he went back in for his men. Thank you for bringing him out."',
      'Opa Walter pins something to your collar: his own brass check, 312, polished bright and soldered onto a lapel pin. "I turned this in a long time ago. Now I give it to somebody who came out. Wear it. Breathe slow."',
      '(Walter\'s Restored Brass Lapel Tag is in your wardrobe. The Deep Seam is sealed. Levels 1 and 2 stay open, and quiet now.)',
    ]));
  }));
}

/** Ledger pages Walter hasn't read to you yet. */
export function untranslated(game: Game): number[] {
  const s = game.progress.mine;
  return s.pages.filter((n) => !s.translated.includes(n)).sort((a, b) => a - b);
}

/** Opa Walter reads the ledger pages to you. */
export function translatePages(game: Game): void {
  const s = game.progress.mine;
  const ns = untranslated(game);
  const pages: string[] = ['Opa Walter puts on his reading glasses and turns the black-edged pages to the light, running a finger under the old Kurrent script.'];
  for (const n of ns) {
    const pg = LEDGER.find((p) => p.id === n)!;
    pages.push(`PAGE ${n}. ${pg.text[0]}`);
    for (const t of pg.text.slice(1)) pages.push(t);
    s.translated.push(n);
  }
  pages.push(s.translated.length === LEDGER.length
    ? 'OPA WALTER: "That is all of it. All of Josef. I never read the last page before. I could not." He closes the ledger gently. "Now I have."'
    : 'OPA WALTER: "Bring me the rest when you find them. Josef wrote small. He always did."');
  sfx.trustChime();
  game.openOverlay(new Dialog(pages));
}
