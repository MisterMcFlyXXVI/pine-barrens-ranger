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
import { MINERS, MINER_BY_ID, MINE_LEVELS, LEDGER, LAMP_HOUSE, ALMANAC, isMineMap, isDeepSeam } from '../data/mine';
import { settings } from './settings';
import { NamePrompt } from '../ui/namePrompt';
import { BankingScene } from '../ui/bankingScene';
import { O, T } from '../data/tiles';
import { ITEMS } from '../data/items';
import { Dialog } from '../ui/menus';
import type { Choice } from '../ui/menus';
import { sfx } from '../audio/sfx';
import { P } from '../graphics/palette';
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
  mode: 'patrol' | 'hunt' | 'search' | 'sleep';
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
  /** Atmosphere timers: your breathing, his chain, the uneasy little things, a sputtering lamp. */
  breathT = 3; chainT = 1; uneaseT = 30; hissT = 2;
  /** Seconds left of a lamp flicker (he's close, or something else is). */
  flicker = 0;
  /** Riding the ore car: from/to tile x on row y, progress 0..1. */
  ride: { x0: number; x1: number; y: number; t: number } | null = null;
  /** Last empty A press (double-tap A sounds the bar on touch). */
  lastA = -9;
  /** The alcove you're standing in (to count each hiding once). */
  lastAlcove = '';
  /** Kettle-bottoms the tempered bar already warned you about. */
  warned = new Set<string>();
  /** The canary sulking right now (unfed): sometimes it lies. */
  sulkQuiet = false;
}
export const rt = new MineRT();

export function mineState(game: Game): MineSave { return game.progress.mine; }

/** Difficulty (Settings: THE MINE): Lantern-lit is gentler, Night shift harsher. */
function tune(): { fuel: number; gas: number; speed: number; haze: number } {
  const m = settings().mineMode;
  return m === 'lantern' ? { fuel: 0.5, gas: 0.6, speed: 0.85, haze: 0.5 } : m === 'night' ? { fuel: 1.3, gas: 1.15, speed: 1.1, haze: 1.2 } : { fuel: 1, gas: 1, speed: 1, haze: 1 };
}

/** Write a Miner's Almanac entry the first time you meet something. */
export function note(game: Game, k: keyof typeof ALMANAC): void {
  const s = game.progress.mine;
  if (s.seen.includes(k)) return;
  s.seen.push(k);
  game.toast(`MINER'S ALMANAC: ${ALMANAC[k].title}. (Journal)`);
}
const key = (map: MapId, x: number, y: number) => `${map}:${x},${y}`;

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

export function tagState(game: Game, id: MinerId): 'in' | 'carried' | 'dropped' | 'out' { return game.progress.mine.tags[id] ?? 'in'; }
export function carried(game: Game): MinerId[] { return MINERS.filter((m) => tagState(game, m.id) === 'carried').map((m) => m.id); }
export function banked(game: Game): number { return MINERS.filter((m) => tagState(game, m.id) === 'out').length; }
/** The Foreman's coal-dust storm: 4 at full strength, weaker every 3 tags banked, gone when the seam is sealed. */
export function hazeLevel(game: Game): number {
  // Your first time down, Level 1 is just dark: learn the tools before anything rolls in.
  if (game.progress.mine.sealed || game.cur.id === 'MINE_L4' || (game.cur.id === 'MINE_L1' && banked(game) === 0)) return 0;
  return Math.max(0, 4 - Math.floor(banked(game) / 3));
}
export function hazeOn(game: Game): boolean { return hazeLevel(game) > 0 && isMineMap(game.cur.id) && rt.hazeClock % HAZE_PERIOD >= HAZE_PERIOD - HAZE_ON; }
export function lampLit(game: Game): boolean { const s = game.progress.mine; return s.kit && s.fuel > 0; }
/** Open carbide glare: what the husks and the Foreman are drawn to. */
export function glare(game: Game): boolean { const s = game.progress.mine; return lampLit(game) && !s.shut; }
export function inAlcove(game: Game): boolean { return game.cur.ground(game.player.tx, game.player.ty) === T.ALCOVE; }
/** An alcove he's learned (you hid there three times while he was looking): no longer safe. */
export function knownAlcove(game: Game): boolean { return (game.progress.mine.alcoves[key(game.cur.id, game.player.tx, game.player.ty)] ?? 0) >= 3; }
/** Hidden from him: in an alcove he hasn't learned yet. */
function hiddenNow(game: Game): boolean { return inAlcove(game) && !knownAlcove(game); }
export function respirator(game: Game): boolean { return game.look.hat === 'brattice_respirator'; }
export function levelOf(game: Game): MineLevel | null { return MINE_LEVELS[game.cur.id] ?? null; }

/** Pitch torches set down on this level. */
export function torchesHere(game: Game): Pt[] {
  const m = game.cur, out: Pt[] = [];
  for (const [i, o] of m.placed) if (o === O.TORCH) out.push([i % m.w, Math.floor(i / m.w)]);
  return out;
}
export const TORCH_RADIUS = 56;
/** Standing in torchlight: they can see you, shutter or no. */
export function inTorchLight(game: Game): boolean {
  const p = game.player;
  return torchesHere(game).some(([x, y]) => Math.hypot(x - p.tx, y - p.ty) <= TORCH_RADIUS / 16 - 0.5);
}
/** Can the husks and the Foreman see you? (Open carbide glare, or a torch's light.) */
export function visible(game: Game): boolean { return glare(game) || inTorchLight(game); }

/** Light radius in pixels right now. */
export function lightRadius(game: Game): number {
  if (!lampLit(game)) return 9;
  if (game.progress.mine.shut) return LIGHT_SHUT;
  const fl = rt.flicker > 0 ? Math.random() * 22 : 0;
  const low = game.progress.mine.fuel < 20 ? Math.random() * 10 : 0;
  return Math.max(14, LIGHT_OPEN - (hazeOn(game) ? hazeLevel(game) * 7 * tune().haze : 0) - fl - low);
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
  const asleep = game.cur.id === 'MINE_L1' && banked(game) === 0;
  for (const c of L.chewers) if (tagState(game, c.tag) === 'in') { const e = ent('chewer', c.path, false, c.tag); if (asleep) e.mode = 'sleep'; rt.ents.push(e); }
  if (foremanHere(game) && L.foreman) rt.ents.push(ent('foreman', L.foreman, true));
  const s = game.progress.mine;
  // The canary pecks its seed on the way down (once a day).
  if (s.kit && s.canary.fed !== game.clock.day && game.inv.count('bird_seed') > 0) {
    game.inv.remove('bird_seed', 1); s.canary.fed = game.clock.day;
    game.toast(`${canaryName(game)} pecks at the seed and fluffs up. Good bird.`);
  }
  if (game.cur.id === 'MINE_L4') note(game, 'oldworks');
  // After the seam is sealed: Walter comes down to Level 1 with you, once.
  if (game.cur.id === 'MINE_L1' && s.sealed && !game.progress.flags.has('walter_down')) {
    game.progress.flags.add('walter_down');
    holdNpc(game, 'walter', L.arrive[0] + 1, L.arrive[1], 120);
    game.openOverlay(new Dialog([
      'Opa Walter is standing by the lift cage, one hand on the cold rail, the other on his walking stick. He came down behind you.',
      'OPA WALTER: "Nineteen years. I said I would never again go where I could not see the sky." He looks up into the dark. "But it is a good dark now, ja? Quiet. The kind you can sleep in."',
      'OPA WALTER: "Danny would have laughed at me. Standing here shaking like a leaf. Ach. Let him laugh." He pats the rib, gently, the way you pat a horse. "Gut. That is enough for today. Take me up?"',
    ]));
  }
}

/** The canary's name (or "the canary" until you name it). */
export function canaryName(game: Game): string { return game.progress.mine.canary.name || 'The canary'; }
/** Fed today or yesterday: otherwise it sulks. */
function canarySulks(game: Game): boolean { const s = game.progress.mine; return s.kit && s.canary.fed < game.clock.day - 1; }

/** Bring a townsperson over for a scene (on foot, unless you've just arrived and they were already here). */
function holdNpc(game: Game, id: string, x: number, y: number, secs: number): void {
  const npc = game.townsfolk.npcs.find((n) => n.def.id === id);
  if (npc) game.townsfolk.walkIn(game, npc, x, y, secs);
}

/** First step of the shortest walkable path from (fx,fy) toward (tx,ty) (null = stay). */
function nextStep(game: Game, fx: number, fy: number, tx: number, ty: number): Pt | null {
  if (fx === tx && fy === ty) return null;
  const m = game.cur, W = m.w;
  const ok = (x: number, y: number) => m.inBounds(x, y) && m.ground(x, y) !== T.CRAWL && ((x === tx && y === ty) || !m.blocked(x, y, true));
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
function alert(game: Game, x: number, y: number, radius: number, loud: boolean, chewers = false): void {
  for (const e of rt.ents) {
    if (chewers && e.kind === 'chewer' && e.mode !== 'hunt' && Math.hypot(e.x - x, e.y - y) <= 8) { e.mode = 'search'; e.target = [x, y]; e.lost = 0; continue; }
    if (e.kind !== 'foreman' || e.mode === 'hunt') continue;
    if (Math.hypot(e.x - x, e.y - y) > radius) continue;
    e.mode = 'search'; e.target = [x, y]; e.lost = 0;
    if (loud && rt.whistleCd <= 0) { rt.whistleCd = 6; sfx.whistle(); game.shake(0.3); game.toast('A brass whistle shrieks in the dark. The Foreman heard that.'); }
  }
}

function updateEnts(game: Game, dt: number): void {
  const p = game.player, px = p.tx, py = p.ty;
  const hidden = hiddenNow(game);
  const lit = visible(game);
  const sp = tune().speed;
  for (const e of rt.ents) {
    e.anim += dt;
    const dist = Math.hypot(e.x - px, e.y - py);
    if (e.kind === 'chewer') {
      if (e.mode === 'sleep') {
        // Asleep on its feet, chewing slow. Light right in its face wakes it.
        if (lit && dist <= 1.5) { e.mode = 'hunt'; e.target = [px, py]; sfx.chew(); game.toast('It wakes into your light!'); }
        continue;
      }
      // Drawn to open carbide light; lose interest once it's shuttered.
      if (lit && !hidden && dist <= SEE_CHEWER && sight(game, Math.round(e.x), Math.round(e.y), px, py)) { if (e.mode !== 'hunt') note(game, 'chewer'); e.mode = 'hunt'; e.target = [px, py]; e.lost = 0; }
      else if (e.mode === 'hunt') { e.lost += dt; if (e.lost > 2) { e.mode = 'patrol'; e.target = null; } }
      else if (e.mode === 'search') { e.lost += dt; if (e.lost > 5 || (e.target && e.tx === e.target[0] && e.ty === e.target[1] && e.lost > 2)) { e.mode = 'patrol'; e.target = null; } }
      moveEnt(game, e, dt, (e.mode === 'hunt' ? 3.0 : e.mode === 'search' ? 1.8 : 1.0) * sp);
      if (lit && !hidden && dist < 0.75) { passOut(game, 'chewer'); return; }
    } else {
      const sees = lit && !hidden && dist <= SEE_FOREMAN && sight(game, Math.round(e.x), Math.round(e.y), px, py);
      if (sees) {
        if (e.mode !== 'hunt' && rt.whistleCd <= 0) { rt.whistleCd = 5; sfx.whistle(); game.shake(0.4); game.toast('THE FOREMAN\'S WHISTLE. He has seen your light. Shutter it and hide!'); note(game, 'foreman'); }
        e.mode = 'hunt'; e.target = [px, py]; e.lost = 0;
      } else if (e.mode === 'hunt') {
        e.lost += dt;
        if (hidden || e.lost > 3) { e.mode = 'search'; e.lost = 0; }
      } else if (e.mode === 'search') {
        e.lost += dt;
        if (e.lost > 6 || (e.target && e.tx === e.target[0] && e.ty === e.target[1])) { e.mode = 'patrol'; e.target = null; }
      }
      // He learns your hiding places: an alcove you've used three times while he hunted, he checks.
      if (inAlcove(game) && e.mode !== 'patrol' && dist < 12) {
        const k = key(game.cur.id, px, py);
        if (rt.lastAlcove !== k) {
          rt.lastAlcove = k;
          const n = (game.progress.mine.alcoves[k] ?? 0) + 1;
          game.progress.mine.alcoves[k] = n;
          if (n === 3) game.toast('A fresh chalk tally on this alcove\'s timber. He has been checking it. Find another.');
        }
      }
      if (!inAlcove(game)) rt.lastAlcove = '';
      // The drag of his tally chain, from wherever he is.
      rt.chainT -= dt;
      if (rt.chainT <= 0 && dist < 16) { rt.chainT = e.mode === 'hunt' ? 0.5 : 1.1; sfx.spatial((e.x - px) / 8, 1 - dist / 16, () => sfx.chain()); }
      if (dist < 14 && rt.flicker <= 0 && Math.random() < dt * 0.25) rt.flicker = 0.6;
      const wired = game.progress.mine.wired.length === 4;
      moveEnt(game, e, dt, (e.mode === 'hunt' ? (wired ? 4.2 : 3.6) : e.mode === 'search' ? 2.2 : 1.4) * sp);
      if (!hidden && dist < 0.75) { passOut(game, 'foreman'); return; }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Per-frame                                                           */
/* ------------------------------------------------------------------ */

let regen = 0;
/** Something in the mine has hold of the player (riding the ore car): no walking. */
export function mineBusy(): boolean { return rt.ride !== null; }

/** A sound from a tile, panned and faded by where it is relative to you. */
function soundAt(game: Game, x: number, y: number, range: number, fn: () => void): void {
  const p = game.player, d = Math.hypot(x - p.tx, y - p.ty);
  sfx.spatial((x - p.tx) / 9, 1 - d / range, fn);
}

export function mineTick(game: Game, dt: number): void {
  // Walter's lapel tag: calm breathing, anywhere.
  if (game.look.outfit === 'lapel_tag') { regen += dt; if (regen >= 3) { regen = 0; game.stamina = Math.min(game.maxStamina, game.stamina + 1); } }
  const id = game.cur.id;
  document.body.classList.toggle('in-mine', isDeepSeam(id) && game.progress.mine.kit);
  if (id === 'LAMP_HOUSE') lampHouseTick(game);
  if (!isMineMap(id)) { rt.map = null; rt.ents = []; rt.ride = null; return; }
  if (rt.map !== id) enterLevel(game);
  if (rt.passing) return;
  const s = game.progress.mine, inp = game.input;
  const p = game.player;
  const tn = tune();
  rt.whistleCd = Math.max(0, rt.whistleCd - dt);
  rt.flicker = Math.max(0, rt.flicker - dt);
  rt.hazeClock += dt;

  if (rt.ride) { rideTick(game, dt); return; }

  // Controls: shutter, sounding bar, refill (keys, touch pills, the HUD lamp).
  if (inp.pressed('shutter')) toggleShutter(game);
  if (inp.pressed('tap')) soundTap(game);
  if (inp.pressed('refill')) refill(game);
  for (const t of inp.taps) { const r = rt.lampRect; if (r && t.x >= r.x && t.y >= r.y && t.x < r.x + r.w && t.y < r.y + r.h) refill(game); }

  // Carbide.
  if (s.kit && s.fuel > 0) {
    const before = s.fuel;
    s.fuel = Math.max(0, s.fuel - (s.shut ? FUEL_SHUT : FUEL_OPEN) * tn.fuel * dt);
    if (before > 20 && s.fuel <= 20) game.toast('Your headlamp is sputtering. Refill it: Carbide Pellets + Drip-Seep Water (R).');
    if (before > 0 && s.fuel === 0) { sfx.cancel(); game.toast('The carbide is spent. Your headlamp gutters out.'); }
    rt.hissT -= dt;
    if (s.fuel < 20 && rt.hissT <= 0) { rt.hissT = 2 + Math.random() * 2; sfx.hiss(); rt.flicker = Math.max(rt.flicker, 0.25); }
  }

  // Gas, haze and breath.
  const L = levelOf(game);
  rt.inGas = gasAt(L, p.tx, p.ty);
  rt.nearGas = rt.inGas ?? gasAt(L, p.tx, p.ty, 2);
  if (rt.inGas) note(game, rt.inGas);
  if (rt.nearGas === 'fire') note(game, 'safety');
  const haze = hazeOn(game) ? hazeLevel(game) : 0;
  if (haze) note(game, 'haze');
  let drain = 0;
  if (rt.inGas === 'fire' && glare(game)) { passOut(game, 'firedamp'); return; }
  if (rt.inGas === 'choke') drain += respirator(game) ? CHOKE_DRAIN_MASK : CHOKE_DRAIN;
  if (rt.inGas === 'fire') drain += respirator(game) ? 1 : FIRE_DRAIN;
  if (haze) drain += haze * 1.4 * tn.haze * (respirator(game) ? 0.2 : 1) * (game.look.outfit === 'fireboss_slicker' ? 0.7 : 1);
  drain *= tn.gas * (game.inv.count('club_badge') ? 0.9 : 1);
  if (drain > 0) rt.breath -= drain * dt; else rt.breath = Math.min(100, rt.breath + BREATH_REGEN * dt);
  if (rt.breath <= 0) { passOut(game, haze && !rt.inGas ? 'haze' : 'gas'); return; }

  // Cold and damp below (the oilskin keeps it off).
  rt.damp -= dt;
  if (rt.damp <= 0) { rt.damp = 20; if (game.look.outfit !== 'fireboss_slicker') game.stamina = Math.max(0, game.stamina - 1); }

  updateEnts(game, dt);
  if (rt.passing) return;

  // Your breathing: slow and steady, quick and ragged when he's close or the air is going.
  const foreman = rt.ents.find((e) => e.kind === 'foreman');
  const fd = foreman ? Math.hypot(foreman.x - p.tx, foreman.y - p.ty) : 99;
  const tight = rt.breath < 50 || fd < 8 || rt.inGas !== null;
  rt.breathT -= dt;
  if (s.kit && rt.breathT <= 0) { rt.breathT = tight ? 0.9 + Math.max(0, fd - 3) * 0.06 : 3.4; sfx.breath(tight); }

  // The canary: chirps in good air, rattles in bad. Unfed, it sulks, and a sulking canary lies.
  rt.chirp -= dt;
  if (s.kit && rt.chirp <= 0) {
    const quiet = rt.nearGas || haze;
    const sulk = canarySulks(game) && Math.random() < 0.35;
    rt.sulkQuiet = sulk;
    if (quiet && !sulk) { sfx.cageRattle(); rt.chirp = 1.6; } else if (!quiet && !sulk) { sfx.canary(); rt.chirp = 3.5 + Math.random() * 3; } else rt.chirp = 2.5;
  }
  // The mine breathing: drips from the seeps, timbers working, picks somewhere far off. Quieter as the tags come out.
  const calm = 1 + banked(game) / 6 + (s.sealed ? 1 : 0);
  rt.drip -= dt;
  if (rt.drip <= 0) {
    rt.drip = (1.5 + Math.random() * 4) * calm;
    const seep = nearestObj(game, O.SEEP);
    if (seep) soundAt(game, seep[0], seep[1], 16, () => sfx.drip()); else sfx.spatial(Math.random() * 2 - 1, 0.5, () => sfx.drip());
  }
  rt.creak -= dt; if (rt.creak <= 0) { sfx.spatial(Math.random() * 2 - 1, 0.7, () => sfx.creak()); rt.creak = (7 + Math.random() * 9) * calm; }
  rt.pick -= dt; if (rt.pick <= 0) { if (!s.sealed) sfx.spatial(Math.random() * 2 - 1, 0.45, () => sfx.pickClink()); rt.pick = 11 + Math.random() * 14; }
  rt.chewSnd -= dt;
  if (rt.chewSnd <= 0) {
    rt.chewSnd = 2.5;
    const c = rt.ents.filter((e) => e.kind === 'chewer').sort((a, b) => Math.hypot(a.x - p.tx, a.y - p.ty) - Math.hypot(b.x - p.tx, b.y - p.ty))[0];
    if (c) soundAt(game, c.x, c.y, 9, () => sfx.chew());
  }
  rt.clink -= dt;
  if (p.moving && carried(game).length && rt.clink <= 0) {
    rt.clink = 0.6;
    sfx.tagClink();
    alert(game, p.tx, p.ty, HEAR_CLINK, false);
  }
  uneaseTick(game, dt);
  // The tempered bar hums near a kettle-bottom you haven't found.
  if (game.progress.flags.has('bar_tempered') && L) {
    for (const [kx, ky] of L.kettles) {
      const k = key(id, kx, ky);
      if (s.kettles.includes(k) || rt.warned.has(k) || Math.abs(kx - p.tx) + Math.abs(ky - p.ty) > 2) continue;
      rt.warned.add(k);
      sfx.tapThud();
      game.toast('Gideon\'s tempered bar hums in your hand: a kettle-bottom, close. Tap it down.');
    }
  }
  // A carried tag pulls the Foreman up to Level 2.
  if (game.cur.id === 'MINE_L2' && foremanHere(game) && !rt.ents.some((e) => e.kind === 'foreman')) {
    const f = ent('foreman', MINE_LEVELS.MINE_L2.foreman!, true);
    rt.ents.push(f);
    sfx.whistle();
    game.toast('Far off, down the slope from Level 3: a whistle. He can hear your tags clinking.');
  }
}

/** The nearest object of a kind on this level (for placing sounds). */
function nearestObj(game: Game, o: number): Pt | null {
  const m = game.cur, p = game.player;
  let best: Pt | null = null, bd = 1e9;
  for (let y = Math.max(0, p.ty - 14); y < Math.min(m.h, p.ty + 15); y++) for (let x = Math.max(0, p.tx - 14); x < Math.min(m.w, p.tx + 15); x++) {
    if (m.obj(x, y) !== o) continue;
    const d = Math.abs(x - p.tx) + Math.abs(y - p.ty);
    if (d < bd) { bd = d; best = [x, y]; }
  }
  return best;
}

/** Small wrong things, now and then, while the seam is still open. */
function uneaseTick(game: Game, dt: number): void {
  const s = game.progress.mine;
  if (s.sealed || game.cur.id === 'MINE_L4') return;
  rt.uneaseT -= dt;
  if (rt.uneaseT > 0) return;
  rt.uneaseT = 25 + Math.random() * 30;
  const p = game.player, m = game.cur;
  const roll = Math.random();
  if (roll < 0.35) {
    // A whistle, a long way off. Nothing comes.
    sfx.spatial(Math.random() < 0.5 ? -0.9 : 0.9, 0.25, () => sfx.whistle());
  } else if (roll < 0.6) {
    rt.flicker = 0.8;
  } else if (roll < 0.85) {
    // Fresh chalk on a rib you just passed.
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1], [0, -2]]) {
      const x = p.tx + dx, y = p.ty + dy;
      if (m.ground(x, y) !== T.COAL_RIB || m.obj(x, y) !== O.NONE) continue;
      let near = 0;
      for (const [, o] of m.placed) if (o === O.CHALK) near++;
      if (near >= 6) break;
      m.placeObject(m.idx(x, y), O.CHALK);
      game.toast('Chalk dust is still falling from the rib beside you: a new row of tally marks. You did not hear anyone.');
      break;
    }
  } else {
    sfx.spatial(Math.random() * 2 - 1, 0.35, () => sfx.chain());
  }
}

/** The Lamp House: Walter on your first visit and when the board is full; Barney's Sunday tours after. */
function lampHouseTick(game: Game): void {
  const s = game.progress.mine, f = game.progress.flags;
  const here = (id: string) => game.townsfolk.npcs.find((n) => n.def.id === id && n.map === 'LAMP_HOUSE');
  if (!f.has('walter_lamphouse')) { f.add('walter_lamphouse'); holdNpc(game, 'walter', 4, 6, 150); }
  if (banked(game) === 12 && !s.sealed && !here('walter')) holdNpc(game, 'walter', 4, 6, 600);
  const c = game.clock;
  if (s.sealed && c.weekday === 'Sun' && c.minutes >= 13 * 60 && c.minutes < 16 * 60 && !here('barnaby')) holdNpc(game, 'barnaby', 8, 5, (16 * 60 - c.minutes) * 0.7);
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
  const g = game.cur.ground(x, y);
  if (g === T.ALCOVE) note(game, 'alcove');
  if (g === T.CRAWL) note(game, 'crawl');
  if (g === T.SHALLOW) note(game, 'flood');
  const L = levelOf(game);
  if (L && L.kettles.some(([kx, ky]) => kx === x && ky === y) && !s.kettles.includes(key(id, x, y))) {
    s.kettles.push(key(id, x, y));
    note(game, 'kettle');
    sfx.caveIn(); game.shake(0.5);
    game.stamina = Math.max(0, game.stamina - 15);
    game.notice('A kettle-bottom drops out of the roof and glances off your shoulder! (-15 energy. Tap ahead with the Sounding Bar to find them first.)');
    alert(game, x, y, 9, true);
  }
}

/** A crawlway is too low for a lit cap lamp: shutter it first. Returns true if the step is blocked. */
export function crawlBlocked(game: Game, x: number, y: number): boolean {
  if (game.cur.ground(x, y) !== T.CRAWL) return false;
  const s = game.progress.mine;
  if (s.kit && s.shut) return false;
  game.notice('A crawlway, barely knee-high. Your lit cap lamp won\'t clear the roof: shutter it (F) and crawl.');
  return true;
}

/** Footsteps underfoot: coal crunch, a ring off the rail, a splash. Running is loud enough for him to hear. */
export function mineStep(game: Game, x: number, y: number, run: boolean): void {
  const g = game.cur.ground(x, y);
  const kind = g === T.MINE_RAIL ? 'rail' : g === T.SHALLOW || nearSeep(game, x, y) ? 'splash' : 'coal';
  sfx.mineStep(kind, run);
  if (run && !game.progress.mine.sealed) alert(game, x, y, 6, false);
}
function nearSeep(game: Game, x: number, y: number): boolean {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (game.cur.obj(x + dx, y + dy) === O.SEEP) return true;
  return false;
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
  alert(game, game.player.tx, game.player.ty, game.progress.flags.has('bar_tempered') ? HEAR_TAP - 2 : HEAR_TAP, true);
  note(game, 'bar');
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
    note(game, 'kettle');
    sfx.tapThud(); sfx.caveIn(); game.shake(0.3);
    alert(game, x, y, 9, true);
    // Sometimes the slab was hiding something.
    const r = Math.random();
    const [it, n, what] = r < 0.45 ? ['coal_lump', 2, 'two good lumps of coal'] : r < 0.75 ? ['carbide_pellets', 2, 'a rusted tin with two carbide pellets in it'] : ['brass_button', 1, 'a brass company-store button'];
    give(game, it as string, n as number);
    game.notice(`HOLLOW THUD overhead: a kettle-bottom! You knock it down with the bar and step back as it smashes. In the rubble: ${what}.`);
    return;
  }
  if (o === O.CRIB) { ring('Solid as the day Josef notched it.'); return; }
  if (o === O.COAL_SEAM) { ring('A good bright seam. Press A to work a few lumps loose.'); return; }
  if (o === O.HEMLOCK_PROP) { ring('Green hemlock, tight and true.'); return; }
  ring('Solid slate.');
}

function shored(game: Game, x: number, y: number): boolean {
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => game.cur.obj(x + dx, y + dy) === O.HEMLOCK_PROP);
}

/** Throw a lump of coal ahead: the clatter pulls the Foreman and the Coal-Chewers away to look. */
export function throwCoal(game: Game): void {
  const m = game.cur, p = game.player;
  if (!isMineMap(m.id)) { game.notice('A good lump of coal. (Underground, select it and press A to throw it as a decoy.)'); return; }
  const [dx, dy] = p.dir === 'up' ? [0, -1] : p.dir === 'down' ? [0, 1] : p.dir === 'left' ? [-1, 0] : [1, 0];
  let lx = p.tx, ly = p.ty;
  for (let k = 0; k < 6; k++) {
    const nx = lx + dx, ny = ly + dy;
    if (!m.inBounds(nx, ny) || (m.blocked(nx, ny, true) && m.ground(nx, ny) !== T.SHALLOW)) break;
    lx = nx; ly = ny;
  }
  game.inv.removeAt(game.sel, 1);
  note(game, 'decoy');
  game.particles.clods(lx * 16 + 8, ly * 16 + 10, [P.VOID, P.SHADOW, P.TWILIGHT]);
  soundAt(game, lx, ly, 12, () => sfx.clatter());
  alert(game, lx, ly, 14, false, true);
  if (lx === p.tx && ly === p.ty) game.toast('The lump bounces off the rib at your feet. Loud.');
}

/** Ride Level 1's ore car the length of the haulage. Fast, and very loud. */
function rideCart(game: Game, x: number, y: number): void {
  const L = levelOf(game);
  if (!L?.cart) return;
  const [a, b] = L.cart;
  const atStart = x === a[0] && y === a[1];
  const to = atStart ? b : a;
  game.openOverlay(new Dialog(['An ore car on the haulage rail, its wheels freshly greased by somebody. It would get you to the other end of the haulageway in seconds. Every husk on the level will hear it.'], [
    { label: 'Ride it', fn: () => {
      game.cur.removeObject(game.cur.idx(x, y));
      rt.ride = { x0: x, x1: to[0], y, t: 0 };
      game.player.place(x, y, to[0] > x ? 'right' : 'left');
      note(game, 'cart');
      sfx.door();
    } },
    { label: 'Leave it', fn: () => undefined },
  ]));
}

function rideTick(game: Game, dt: number): void {
  const r = rt.ride!;
  const len = Math.abs(r.x1 - r.x0);
  r.t = Math.min(1, r.t + (dt * 11) / Math.max(1, len));
  const fx = r.x0 + (r.x1 - r.x0) * r.t;
  const p = game.player;
  p.place(Math.round(fx), r.y, r.x1 > r.x0 ? 'right' : 'left');
  p.x = fx * 16;
  rt.clink -= dt;
  if (rt.clink <= 0) { rt.clink = 0.12; sfx.cartRattle(); }
  if (r.t < 1) return;
  const m = game.cur, step = r.x1 > r.x0 ? -1 : 1;
  m.placeObject(m.idx(r.x1, r.y), O.RIDE_CART);
  p.place(r.x1 + step, r.y, r.x1 > r.x0 ? 'right' : 'left');
  rt.ride = null;
  sfx.rockHit(); game.shake(0.4);
  alert(game, r.x1, r.y, 30, false, true);
  game.toast('The car slams into the stop block. Every husk on the level heard that.');
}

/** Set a pitch torch down on the floor of a mine level. */
export function placeTorch(game: Game, x: number, y: number): void {
  const m = game.cur;
  if (!isMineMap(m.id)) { sfx.error(); game.notice('Pitch torches are for the dark below. Set them down in the mine.'); return; }
  if (gasAt(levelOf(game), x, y, 1) === 'fire') { sfx.error(); game.notice('The safety lamp burns blue here: firedamp. An open torch would blow the drift apart.'); return; }
  if (!m.inBounds(x, y) || m.obj(x, y) !== O.NONE || m.blocked(x, y, true) || m.portalAt(x, y) || m.ground(x, y) === T.ALCOVE) {
    sfx.error(); game.notice('Set the torch down on open floor (not in an alcove).'); return;
  }
  m.placeObject(m.idx(x, y), O.TORCH);
  game.inv.removeAt(game.sel, 1);
  note(game, 'torch');
  sfx.refill();
  game.toast('You drive the torch into the coal floor. Warm light, a long way out. (In its light, they can see you.)');
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

/** Night shift: a tag lost in the dark goes back to its puzzle (a calcified man stands again). */
function restorePuzzle(game: Game, id: MinerId): void {
  for (const L of Object.values(MINE_LEVELS)) {
    const pr = L.props.find((x) => x.tag === id);
    if (!pr) continue;
    const m = game.getMap(L.id), i = m.idx(pr.at[0], pr.at[1]);
    if (m.objects[i] === O.NONE) m.placeObject(i, O.CALCIFIED);
  }
}

export function passOut(game: Game, cause: keyof typeof WAKE): void {
  if (rt.passing) return;
  rt.passing = true;
  const s = game.progress.mine, map = game.cur.id, p = game.player;
  const mode = settings().mineMode;
  // Lantern-lit: you keep what you carry. Night shift: they go back to the dark, puzzles and all.
  const dropped = mode === 'lantern' ? [] : carried(game);
  if (mode === 'night') for (const id of dropped) { delete s.tags[id]; restorePuzzle(game, id); }
  else for (const id of dropped) { s.tags[id] = 'dropped'; s.dropped.push({ id, map, x: p.tx, y: p.ty }); }
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
    if (dropped.length && mode === 'night') pages.push(`Your pockets are empty. The ${dropped.length > 1 ? 'tags you carried are' : 'tag you carried is'} back where you found ${dropped.length > 1 ? 'them' : 'it'}, in the dark. (Night shift: one life a descent.)`);
    else if (dropped.length) pages.push(`Your pockets are lighter: ${dropped.length} brass tag${dropped.length > 1 ? 's' : ''} fell where you went down. They\'re still there, glinting. Go back for ${dropped.length > 1 ? 'them' : 'it'}.`);
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
  if (id === 'CABIN_INTERIOR' && m.inBounds(tx, ty) && m.obj(tx, ty) === O.CANARY_CAGE) { canaryCage(game); return true; }
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
    case O.TORCH:
      game.openOverlay(new Dialog(['Your pitch torch, spitting and smoking, throwing a warm circle on the coal.'], [
        { label: 'Take it down', fn: () => { m.removeObject(ai); give(game, 'pitch_torch', 1); sfx.blip(); } },
        { label: 'Leave it burning', fn: () => undefined },
      ]));
      return true;
    case O.COAL_SEAM:
      if (!once(game, id, ax, ay)) { say('A coal seam glinting in the rib. You have worked the loose lumps out of it for today.'); return true; }
      give(game, 'coal_lump', 2); sfx.rockHit(); game.particles.clods(ax * 16 + 8, ay * 16 + 12, [P.VOID, P.SHADOW, P.TWILIGHT]);
      note(game, 'decoy');
      game.toast('You work two lumps of coal loose. (Select one and press A to throw it: a decoy.)');
      return true;
    case O.RIDE_CART: rideCart(game, ax, ay); return true;
    case O.GLOW_FUNGUS: say('Pale cave fungus, faintly glowing green, like a handful of moonlight left on the stone. It smells of mushrooms and old pennies.'); return true;
    case O.CHALK: say(sign ?? 'Fresh chalk tally marks, five and five and five. The dust is still on the floor beneath them.'); return true;
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
    give(game, 'carbide_pellets', 4); give(game, 'seep_water', 2); give(game, 'miner_biscuit', 2); give(game, 'mine_ledger', 1); give(game, 'pitch_torch', 3); give(game, 'bird_seed', 5);
    for (const k of ['headlamp', 'canary', 'bar', 'safety'] as const) if (!s.seen.includes(k)) s.seen.push(k);
    sfx.fanfare();
    game.openOverlay(new Dialog([
      'THE MINE KIT. You take down, one by one:',
      'A JUSTRITE BRASS CARBIDE HEADLAMP with a hinged SHUTTER HOOD. (F or SHUT: close it and they can\'t see you, but your world shrinks to a phosphor-green circle you mostly hear. R refills it: 1 Carbide Pellets + 1 Drip-Seep Water.)',
      'A CANARY in a wire cage. (It sings in good air. When it goes quiet and rattles the bars, there\'s gas or haze. Get out of it.)',
      'A FIRE-BOSS SOUNDING BAR. (T or TAP: RING is solid slate, HOLLOW THUD is trouble, or a keystone. It\'s loud. He hears it.)',
      'A DAVY SAFETY LAMP for your belt. (It burns blue-green near firedamp: shutter your carbide there or it ignites. It picks out the calcified props that are holding up the roof.)',
      'Also: Canvas Miner\'s Coveralls and a Hard-Boiled Leather Cap (wardrobe), carbide, water, biscuits, the BLACK-EDGED MINE LEDGER for any pages you find, and three PITCH TORCHES. (Set them down to light a big circle for good. More at the Porch Workbench: 1 Timber, 1 Pine Resin, 2 Plant Fiber. In torchlight, things down there can see you.)',
      'The lift cage is in the corner. Twelve checks on the board say IN. Bring them OUT.',
      'Gideon, from the doorway: "That canary\'s yours now. Feed it every day (seed\'s in your pack; the Outfitter sells more). And give it a name. A bird you\'ve named, you listen to."',
    ]));
    game.afterOverlays(() => game.openOverlay(new NamePrompt('NAME YOUR CANARY', ['JOSIE', 'BUTTONS', 'PIP', 'CLEMENTINE'], (n) => { s.canary.name = n.charAt(0) + n.slice(1).toLowerCase(); s.canary.fed = game.clock.day; game.toast(`${s.canary.name} chirps from the cage.`); })));
    return;
  }
  if (banked(game) === 12 && !s.sealed && game.inv.count('blasting_box') + game.storage.count('blasting_box') === 0) {
    // These have to go down the hole with you: the bag, not the crate.
    if (!game.inv.canFit('blasting_box') || !game.inv.canFit('black_powder')) { sfx.error(); game.openOverlay(new Dialog(['Something new is waiting at the back of the locker, but your bag is too full to carry it. (Make room for two things.)'])); return; }
    game.inv.add('blasting_box', 1); game.inv.add('black_powder', 4);
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
  for (const id of mine) s.tags[id] = 'out';
  const n = banked(game);
  const notes: string[] = [];
  const before = n - mine.length;
  if (Math.floor(n / 3) > Math.floor(before / 3)) notes.push(n === 12 ? 'Far below, the haze is gone. For the first time in eighty years the Deep Seam is just dark, not angry.' : `Below, the Foreman's coal-dust storm weakens (${hazeLevel(game)}/4). The mountain breathes a little easier.`);
  if (before < 6 && n >= 6) { game.wardrobe.add('fireboss_slicker'); notes.push('A peg by the board holds a FIRE-BOSS HEAVY OILSKIN SLICKER that wasn\'t there before, C.V. inked inside the collar. (Wardrobe.)'); }
  if (n === 12) notes.push('All twelve. The board is quiet. There is one more thing in the locker now: Gideon left it.');
  markMilestone(game, 'mine_tags');
  // The ceremony: each check slides across to OUT, one at a time, and his memory plays.
  game.openOverlay(new BankingScene(mine, notes));
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
  if (here !== 'MINE_L4' && s.sealed) choices.push({ label: 'The Old Works (1888)', fn: go('MINE_L4') });
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
    game.openOverlay(new Dialog(['A MASTER TIMBER CRIB: notched hemlock logs laid log-cabin style, floor to roof, black with age. Carved in one log: "J.M. 1911." Four of these hold up the whole Tally Chamber.', banked(game) === 12 ? (game.storage.count('blasting_box') ? '(Your blasting box and charges are in the Storage Crate at the cabin. Bring them down.)' : '(The blasting box and charges are in the Lamp House locker.)') : '(Josef\'s ledger: take out all four, and the mountain closes its hand.)']));
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
  if (visible(game)) {
    sfx.chew();
    game.openOverlay(new Dialog([glare(game) ? 'It turns into your light, ember throat glowing, and lunges.' : 'In the torchlight it sees you plain, and lunges. (Meet them in the dark.)']));
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
  game.progress.days.memorial = game.clock.day + 1;
  game.afterOverlays(() => game.transition(() => {
    game.enterMap('LAMP_HOUSE', LAMP_HOUSE.wake[0], LAMP_HOUSE.wake[1], 'down');
    holdNpc(game, 'walter', 4, 6, 90); holdNpc(game, 'gideon', 8, 5, 90); holdNpc(game, 'vance', 7, 7, 90);
    game.wardrobe.add('lapel_tag');
    // The canary retires to your cabin window.
    const cab = game.getMap('CABIN_INTERIOR');
    if (!cab.countPlaced(O.CANARY_CAGE)) cab.placeObject(cab.idx(3, 8), O.CANARY_CAGE);
    sfx.fanfare();
    game.openOverlay(new Dialog([
      'Dust is still sifting from the lamp-house rafters. Opa Walter is there, and Gideon with his hand on the lift rope, and behind them, in the doorway, Elias Vance with his hat in his hands.',
      'OPA WALTER: "Gut. Gut gemacht. Josef wrote it, the last page: when the debt is paid, close the hand. You closed it."',
      'GIDEON: "The hum\'s stopped. I put my hand on the boards out there. Nothing. Just a hill."',
      'ELIAS: "Clement Vance was my great-uncle. My mother used to say he went back in for his men. Thank you for bringing him out."',
      'Opa Walter pins something to your collar: his own brass check, 312, polished bright and soldered onto a lapel pin. "I turned this in a long time ago. Now I give it to somebody who came out. Wear it. Breathe slow."',
      `GIDEON: "And that bird of yours has earned its rest. I'll hang ${canaryName(game) === 'The canary' ? 'it' : canaryName(game)} in your cabin window. It can sing at the jays."`,
      'OPA WALTER: "Tomorrow night, the town walks up with lanterns. Twelve of them. Come."',
      '(Walter\'s Restored Brass Lapel Tag is in your wardrobe. The Deep Seam is sealed. Levels 1 and 2 stay open, quiet now, and the lift goes somewhere new: the Old Works.)',
    ]));
  }));
}

/** A in the mine with nothing to do with it: a quick second tap sounds the bar (handy on touch). */
export function mineEmptyA(game: Game): boolean {
  if (!isMineMap(game.cur.id) || !game.progress.mine.kit) return false;
  if (game.time - rt.lastA < 0.35) { rt.lastA = -9; soundTap(game); }
  else rt.lastA = game.time;
  return true;
}

/** Your canary's cage, home in the cabin window. */
export function canaryCage(game: Game): void {
  sfx.canary();
  game.openOverlay(new Dialog([`${canaryName(game)} hops along the perch and sings, loud and pleased with itself, at the jays outside the window. It has earned a quiet life.`]));
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
