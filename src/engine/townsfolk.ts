/**
 * NPC runtime: follows each townsperson's schedule.
 *
 * Townsfolk really go places. When their schedule moves them to another map
 * they walk to the right door (or trail exit) and go through it, and come out of
 * the matching door on the other side. While you can't see them they still take
 * a few seconds per map to get anywhere, so someone heading home appears at the
 * end of the street a little later, not instantly at their armchair.
 *
 * At night they walk to their bedside and climb in (drawn tucked up in bed).
 * NPCs occupy tiles and block the player.
 */
import type { Game } from './game';
import type { MapRuntime } from './world';
import type { MapId, Portal } from '../data/mapgen';
import { NPCS, NpcDef, ScheduleCtx, Stop } from '../data/npcs';
import { getMapDef, BUILT_MAPS } from '../data/maps';
import { moonPhase } from '../data/weather';
import type { Dir } from '../util';
import { DIR_VEC } from '../util';
import { sfx } from '../audio/sfx';
import { kidsHiding } from './heartScenes';
import { foggyWeekend } from './restoration';
import { eventStop } from './calendar';
import { P } from '../graphics/palette';

const STEP = 0.3;
/** Seconds an off-screen townsperson takes to cross a map before coming through the next door. */
const HOP_SECONDS = 4;
/** Give up on a blocked path after this long and just slip past. */
const STUCK_SECONDS = 6;
/** Maps nobody passes through on the way somewhere else. */
const NO_THROUGH = new Set<MapId>(['CABIN_INTERIOR', 'MUSEUM_BASEMENT']);

export class NpcRT {
  map: MapId | null = null;
  tx = 0;
  ty = 0;
  x = 0;
  y = 0;
  dir: Dir = 'down';
  moving = false;
  private fx = 0;
  private fy = 0;
  private t = 0;
  private parity = 0;
  stop: Stop | null = null;
  private wanderT = 2;
  /** Seconds remaining facing the player after a chat. */
  talkT = 0;
  /** Tucked up in bed (tx, ty is the bed tile). */
  inBed = false;
  /** The tile they got into bed from (where they climb back out). */
  side: [number, number] | null = null;
  /** Off-screen travel timer, stuck timer, and little-effects timer. */
  hopT = 0;
  stuckT = 0;
  fxT = 0;

  constructor(readonly def: NpcDef) {}

  place(map: MapId, x: number, y: number, dir: Dir): void {
    this.map = map; this.tx = x; this.ty = y; this.x = x * 16; this.y = y * 16; this.dir = dir; this.moving = false;
  }

  get frame(): number {
    if (!this.moving) return 0;
    return this.t < 0.55 ? (this.parity ? 1 : 2) : 0;
  }

  step(nx: number, ny: number): void {
    const dx = nx - this.tx, dy = ny - this.ty;
    this.dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
    this.fx = this.tx * 16; this.fy = this.ty * 16;
    this.tx = nx; this.ty = ny; this.t = 0; this.moving = true; this.parity ^= 1;
  }

  advance(dt: number): void {
    if (!this.moving) return;
    this.t += dt / STEP;
    if (this.t >= 1) { this.t = 1; this.moving = false; }
    this.x = this.fx + (this.tx * 16 - this.fx) * this.t;
    this.y = this.fy + (this.ty * 16 - this.fy) * this.t;
  }

  tickWander(dt: number): boolean {
    this.wanderT -= dt;
    if (this.wanderT > 0) return false;
    this.wanderT = 1.5 + Math.random() * 3.5;
    return true;
  }
}

export class Townsfolk {
  readonly npcs: NpcRT[] = NPCS.map((d) => new NpcRT(d));
  private resolved = new Map<string, [number, number]>();
  private routes = new Map<string, Portal | null>();
  /** Townsfolk stepped into a heart scene: they stay put a few seconds after it ends. */
  private held = new Map<string, { stop: Stop; t: number }>();

  /** Put someone right here for a scene (they go back to their day afterwards). */
  /** Walk on from (fx, fy) to (tx, ty) on the player's map, then stay a while (a visitor arriving). */
  arrive(npc: NpcRT, map: MapId, fx: number, fy: number, tx: number, ty: number, secs: number): void {
    npc.inBed = false;
    npc.place(map, fx, fy, fx > tx ? 'left' : 'right');
    npc.hopT = 0; npc.stuckT = 0;
    this.held.set(npc.def.id, { stop: { map, x: tx, y: ty, dir: npc.dir, wander: 0 }, t: secs });
  }

  /** Point an arriving visitor at a new spot (they keep walking). */
  retarget(npc: NpcRT, tx: number, ty: number, secs: number): void {
    const h = this.held.get(npc.def.id);
    if (h) { h.stop = { ...h.stop, x: tx, y: ty }; h.t = Math.max(h.t, secs); }
  }

  hold(npc: NpcRT, map: MapId, x: number, y: number, secs: number): void {
    npc.inBed = false;
    npc.place(map, x, y, npc.dir);
    npc.hopT = 0;
    this.held.set(npc.def.id, { stop: { map, x, y, dir: npc.dir, wander: 0 }, t: secs });
  }

  ctx(game: Game): ScheduleCtx {
    const c = game.clock;
    const w = game.weatherNow();
    return {
      minutes: c.minutes,
      weekday: c.weekday,
      festival: game.isFestival(),
      foggyNight: game.dayWeather.evening === 'FOG' && c.minutes >= 1080,
      foggyWeekend: foggyWeekend(game),
      wet: w === 'RAIN' || w === 'STORM',
      day: c.day,
      flag: (f) => game.progress.flags.has(f),
      mailDay: (id) => game.progress.mail[id] ?? 0,
      questStage: (id) => game.progress.stage(id),
      questDone: (id) => game.progress.done(id),
      campaignDone: game.progress.flags.has('finale'),
    };
  }

  private whereFor(game: Game, npc: NpcRT, ctx: ScheduleCtx): Stop | null {
    const id = npc.def.id;
    const held = this.held.get(id);
    if (held) return { ...held.stop, dir: npc.dir };
    // Lost at the sawmill comes first (they snuck out; they're not at any gathering).
    const hiding = kidsHiding(game, id);
    if (hiding) return { map: 'OLD_GROWTH_AND_SAWMILL', x: hiding[0], y: hiding[1], dir: 'down', wander: 0 };
    // A town gathering: everybody comes.
    const ev = eventStop(game, id);
    if (ev) return ev;
    if ((id === 'buster' || id === 'toby') && game.progress.stage(id) === 1 && !game.progress.done(id)) {
      const end = game.progress.trailEnd(id);
      if (end) return { map: id === 'buster' ? 'PINE_TRAIL_AND_ORCHARD' : 'CRANBERRY_BOG_AND_SPRINGS', x: end[0], y: end[1], dir: 'down', wander: 0 };
    }
    return npc.def.where(ctx);
  }

  /** Snap a scheduled spot to the nearest free tile (cached per stop). */
  private resolve(m: MapRuntime, s: Stop): [number, number] {
    const key = `${s.map}:${s.x}:${s.y}`;
    const hit = this.resolved.get(key);
    if (hit) return hit;
    let best: [number, number] = [s.x, s.y];
    outer: for (let r = 0; r < 8; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = s.x + dx, y = s.y + dy;
        if (!m.blocked(x, y, true) && !m.portalAt(x, y)) { best = [x, y]; break outer; }
      }
    }
    this.resolved.set(key, best);
    return best;
  }

  /** The door (portal) on `from` that leads toward `to`, by the fewest maps. */
  private hop(from: MapId, to: MapId): Portal | null {
    const key = `${from}>${to}`;
    if (this.routes.has(key)) return this.routes.get(key)!;
    const first = new Map<MapId, Portal>();
    const seen = new Set<MapId>([from]);
    const q: MapId[] = [from];
    let found: Portal | null = null;
    search: while (q.length) {
      const cur = q.shift()!;
      if (!BUILT_MAPS.has(cur)) continue;
      for (const p of getMapDef(cur).portals) {
        if (!BUILT_MAPS.has(p.to) || p.requires === 'archive' || seen.has(p.to)) continue;
        if (NO_THROUGH.has(p.to) && p.to !== to) continue;
        seen.add(p.to);
        first.set(p.to, cur === from ? p : first.get(cur)!);
        if (p.to === to) { found = first.get(p.to)!; break search; }
        q.push(p.to);
      }
    }
    this.routes.set(key, found);
    return found;
  }

  update(game: Game, dt: number): void {
    const ctx = this.ctx(game);
    const curId = game.cur.id;
    for (const [id, h] of this.held) { h.t -= dt; if (h.t <= 0 || h.stop.map !== curId) this.held.delete(id); }
    for (const npc of this.npcs) {
      const stop = this.whereFor(game, npc, ctx);
      npc.stop = stop;
      npc.talkT = Math.max(0, npc.talkT - dt);
      if (!stop) { npc.map = null; npc.inBed = false; continue; }
      if (npc.map === null) { this.settle(game, npc, stop); continue; }
      if (npc.map !== stop.map) { this.travel(game, npc, stop, curId, dt); continue; }
      const m = game.getMap(stop.map);
      if (stop.sleep) { this.toBed(game, m, npc, stop, curId, dt); continue; }
      if (npc.inBed) this.wake(npc);
      const [gx, gy] = this.resolve(m, stop);
      if (npc.map !== curId) { if (npc.tx !== gx || npc.ty !== gy) npc.place(stop.map, gx, gy, stop.dir); continue; }
      npc.advance(dt);
      if (npc.moving || npc.talkT > 0) continue;
      const dist = Math.abs(npc.tx - gx) + Math.abs(npc.ty - gy);
      const wander = stop.wander ?? 0;
      if (dist > wander) {
        const next = this.nextStep(game, m, npc, gx, gy);
        if (next) { npc.step(next[0], next[1]); npc.stuckT = 0; }
        else if (dist > 12 || (npc.stuckT += dt) > STUCK_SECONDS) { npc.place(stop.map, gx, gy, stop.dir); npc.stuckT = 0; }
      } else if (wander > 0 && npc.tickWander(dt)) {
        const dirs: Dir[] = ['up', 'down', 'left', 'right'];
        const d = dirs[Math.floor(Math.random() * 4)];
        const [dx, dy] = DIR_VEC[d];
        const nx = npc.tx + dx, ny = npc.ty + dy;
        if (Math.abs(nx - gx) + Math.abs(ny - gy) <= wander && this.free(game, m, nx, ny, npc)) npc.step(nx, ny);
        else npc.dir = d;
      } else if (dist === 0 && wander === 0) npc.dir = stop.dir;
      if (dist <= wander) this.effects(game, npc, stop, dt);
    }
  }

  /** Put someone straight at their spot (first appearance, or out of sight). */
  private settle(game: Game, npc: NpcRT, stop: Stop): void {
    if (stop.sleep && stop.bed) {
      npc.place(stop.map, stop.bed[0], stop.bed[1], 'down');
      npc.inBed = true;
      npc.side = [stop.x, stop.y];
      return;
    }
    npc.inBed = false;
    const [gx, gy] = this.resolve(game.getMap(stop.map), stop);
    npc.place(stop.map, gx, gy, stop.dir);
  }

  private wake(npc: NpcRT): void {
    if (!npc.inBed || !npc.map) return;
    npc.inBed = false;
    const [sx, sy] = npc.side ?? [npc.tx, npc.ty + 1];
    npc.place(npc.map, sx, sy, 'down');
  }

  /** Walk to the bedside, then climb in. */
  private toBed(game: Game, m: MapRuntime, npc: NpcRT, stop: Stop, curId: MapId, dt: number): void {
    if (npc.inBed) return;
    if (npc.map !== curId) { this.settle(game, npc, stop); return; }
    npc.advance(dt);
    if (npc.moving) return;
    if (npc.tx === stop.x && npc.ty === stop.y) { this.settle(game, npc, stop); return; }
    const next = this.nextStep(game, m, npc, stop.x, stop.y);
    if (next) { npc.step(next[0], next[1]); npc.stuckT = 0; }
    else if ((npc.stuckT += dt) > STUCK_SECONDS) { npc.stuckT = 0; this.settle(game, npc, stop); }
  }

  /** Head for the next door toward the scheduled map (walking it if you can see them). */
  private travel(game: Game, npc: NpcRT, stop: Stop, curId: MapId, dt: number): void {
    if (npc.inBed) this.wake(npc);
    const from = npc.map!;
    const hop = this.hop(from, stop.map);
    if (!hop) { this.settle(game, npc, stop); return; }
    if (from === curId) {
      npc.advance(dt);
      if (npc.moving) return;
      const m = game.getMap(from);
      // The tile of the doorway (or wide trail exit) nearest them.
      let best: [number, number] = [hop.x, hop.y], bd = Infinity;
      for (let y = hop.y; y < hop.y + hop.h; y++) for (let x = hop.x; x < hop.x + hop.w; x++) {
        const d = Math.abs(x - npc.tx) + Math.abs(y - npc.ty);
        if (d < bd && m.inBounds(x, y)) { bd = d; best = [x, y]; }
      }
      if (npc.tx === best[0] && npc.ty === best[1]) { this.through(game, npc, hop, curId); return; }
      const next = this.nextStep(game, m, npc, best[0], best[1]);
      if (next) { npc.step(next[0], next[1]); npc.stuckT = 0; }
      else if ((npc.stuckT += dt) > STUCK_SECONDS) this.through(game, npc, hop, curId);
      return;
    }
    npc.hopT += dt;
    if (npc.hopT < HOP_SECONDS) return;
    // Don't pop out of a door right on top of the player; wait a moment.
    if (hop.to === curId && game.player.tx === hop.tx && game.player.ty === hop.ty) return;
    this.through(game, npc, hop, curId);
  }

  private through(game: Game, npc: NpcRT, hop: Portal, curId: MapId): void {
    const seen = npc.map === curId || hop.to === curId;
    npc.place(hop.to, hop.tx, hop.ty, hop.dir);
    npc.hopT = 0; npc.stuckT = 0;
    if (seen && Math.abs(game.player.tx - npc.tx) + Math.abs(game.player.ty - npc.ty) < 14) sfx.door();
  }

  /** Little signs of work: sparks off Gideon's anvil, feed scattered for Ruth's hens. */
  private effects(game: Game, npc: NpcRT, stop: Stop, dt: number): void {
    if (!stop.tag || npc.moving) return;
    npc.fxT -= dt;
    if (npc.fxT > 0) return;
    const near = Math.abs(game.player.tx - npc.tx) + Math.abs(game.player.ty - npc.ty) < 9;
    const cx = npc.tx * 16 + 8, cy = npc.ty * 16;
    if (stop.tag === 'anvil') {
      npc.fxT = 1 + Math.random() * 0.5;
      npc.dir = stop.dir;
      for (let k = 0; k < 3; k++) game.particles.sparkle(cx + (Math.random() - 0.5) * 8, cy - 10 + Math.random() * 4, k % 2 ? P.AMBER : P.LANTERN);
      if (near) sfx.rockHit();
    } else if (stop.tag === 'chickens') {
      npc.fxT = 2 + Math.random() * 2;
      for (let k = 0; k < 4; k++) game.particles.sparkle(cx + (Math.random() - 0.5) * 24, cy + 14 + Math.random() * 8, P.AMBER);
    }
  }

  private free(game: Game, m: MapRuntime, x: number, y: number, self: NpcRT): boolean {
    if (m.blocked(x, y, true) || m.portalAt(x, y)) return false;
    if (game.player.tx === x && game.player.ty === y) return false;
    return !this.npcs.some((o) => o !== self && o.map === m.id && o.tx === x && o.ty === y);
  }

  /** First step of a BFS path toward (gx, gy), within a 40-tile radius. The goal may be a doorway. */
  private nextStep(game: Game, m: MapRuntime, npc: NpcRT, gx: number, gy: number): [number, number] | null {
    const W = m.w;
    const start = npc.ty * W + npc.tx, goal = gy * W + gx;
    const prev = new Map<number, number>([[start, -1]]);
    const q = [start];
    for (let h = 0; h < q.length && q.length < 4000; h++) {
      const cur = q[h];
      if (cur === goal) break;
      const cx = cur % W, cy = Math.floor(cur / W);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy, ni = ny * W + nx;
        if (!m.inBounds(nx, ny) || prev.has(ni) || Math.abs(nx - npc.tx) > 40 || Math.abs(ny - npc.ty) > 40) continue;
        if (ni !== goal && !this.free(game, m, nx, ny, npc)) continue;
        if (ni === goal && m.blocked(nx, ny, true)) continue;
        prev.set(ni, cur); q.push(ni);
      }
    }
    if (!prev.has(goal)) return null;
    let c = goal;
    while (prev.get(c) !== start && prev.get(c) !== -1) c = prev.get(c)!;
    const nx = c % W, ny = Math.floor(c / W);
    if (c === goal) {
      // Stepping into the doorway itself: only if nobody's standing in it.
      if (game.player.tx === nx && game.player.ty === ny) return null;
      return this.npcs.some((o) => o !== npc && o.map === m.id && o.tx === nx && o.ty === ny) ? null : [nx, ny];
    }
    return this.free(game, m, nx, ny, npc) ? [nx, ny] : null;
  }

  /** The townsperson on this tile (someone in bed answers from either half of the bed). */
  at(map: MapId, x: number, y: number): NpcRT | null {
    return this.npcs.find((n) => n.map === map && n.tx === x && (n.ty === y || (n.inBed && n.ty - 1 === y))) ?? null;
  }

  on(map: MapId): NpcRT[] {
    return this.npcs.filter((n) => n.map === map);
  }

  /** Is anyone up and about on this map (lights on)? */
  awakeIn(map: MapId): boolean {
    return this.npcs.some((n) => n.map === map && !n.inBed);
  }
}

/** Helper for HUD/journal: is it a full-moon festival night etc. */
export function festivalLabel(game: Game): string {
  return game.isFestival() ? `Folklore Festival${moonPhase(game.clock.day).full ? ' under a full moon' : ''}` : '';
}
