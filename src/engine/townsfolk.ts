/**
 * NPC runtime: follows each townsperson's schedule. On the player's current
 * map NPCs walk tile-by-tile (BFS) and idle-wander; elsewhere they simply
 * appear at their scheduled spot. NPCs occupy tiles and block the player.
 */
import type { Game } from './game';
import type { MapRuntime } from './world';
import type { MapId } from '../data/mapgen';
import { NPCS, NpcDef, ScheduleCtx, Stop } from '../data/npcs';
import { moonPhase } from '../data/weather';
import type { Dir } from '../util';
import { DIR_VEC } from '../util';

const STEP = 0.3;

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

  ctx(game: Game): ScheduleCtx {
    const c = game.clock;
    return {
      minutes: c.minutes,
      weekday: c.weekday,
      festival: game.isFestival(),
      foggyNight: game.dayWeather.evening === 'FOG' && c.minutes >= 1080,
      questStage: (id) => game.progress.stage(id),
      questDone: (id) => game.progress.done(id),
    };
  }

  private whereFor(game: Game, npc: NpcRT, ctx: ScheduleCtx): Stop | null {
    const id = npc.def.id;
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

  update(game: Game, dt: number): void {
    const ctx = this.ctx(game);
    const curId = game.cur.id;
    for (const npc of this.npcs) {
      const stop = this.whereFor(game, npc, ctx);
      npc.stop = stop;
      npc.talkT = Math.max(0, npc.talkT - dt);
      if (!stop) { npc.map = null; continue; }
      const m = game.getMap(stop.map);
      const [gx, gy] = this.resolve(m, stop);
      if (npc.map !== stop.map) { npc.place(stop.map, gx, gy, stop.dir); continue; }
      if (npc.map !== curId) { if (npc.tx !== gx || npc.ty !== gy) npc.place(stop.map, gx, gy, stop.dir); continue; }
      npc.advance(dt);
      if (npc.moving || npc.talkT > 0) continue;
      const dist = Math.abs(npc.tx - gx) + Math.abs(npc.ty - gy);
      const wander = stop.wander ?? 0;
      if (dist > wander) {
        const next = this.nextStep(game, m, npc, gx, gy);
        if (next) npc.step(next[0], next[1]);
        else if (dist > 12) npc.place(stop.map, gx, gy, stop.dir);
      } else if (wander > 0 && npc.tickWander(dt)) {
        const dirs: Dir[] = ['up', 'down', 'left', 'right'];
        const d = dirs[Math.floor(Math.random() * 4)];
        const [dx, dy] = DIR_VEC[d];
        const nx = npc.tx + dx, ny = npc.ty + dy;
        if (Math.abs(nx - gx) + Math.abs(ny - gy) <= wander && this.free(game, m, nx, ny, npc)) npc.step(nx, ny);
        else npc.dir = d;
      } else if (dist === 0 && wander === 0) npc.dir = stop.dir;
    }
  }

  private free(game: Game, m: MapRuntime, x: number, y: number, self: NpcRT): boolean {
    if (m.blocked(x, y, true) || m.portalAt(x, y)) return false;
    if (game.player.tx === x && game.player.ty === y) return false;
    return !this.npcs.some((o) => o !== self && o.map === m.id && o.tx === x && o.ty === y);
  }

  /** First step of a BFS path toward (gx, gy), within a 40-tile radius. */
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
        if (prev.has(ni) || Math.abs(nx - npc.tx) > 40 || Math.abs(ny - npc.ty) > 40) continue;
        if (ni !== goal && !this.free(game, m, nx, ny, npc)) continue;
        if (ni === goal && m.blocked(nx, ny, true)) continue;
        prev.set(ni, cur); q.push(ni);
      }
    }
    if (!prev.has(goal)) return null;
    let c = goal;
    while (prev.get(c) !== start && prev.get(c) !== -1) c = prev.get(c)!;
    const nx = c % W, ny = Math.floor(c / W);
    return this.free(game, m, nx, ny, npc) ? [nx, ny] : null;
  }

  at(map: MapId, x: number, y: number): NpcRT | null {
    return this.npcs.find((n) => n.map === map && n.tx === x && n.ty === y) ?? null;
  }

  on(map: MapId): NpcRT[] {
    return this.npcs.filter((n) => n.map === map);
  }
}

/** Helper for HUD/journal: is it a full-moon festival night etc. */
export function festivalLabel(game: Game): string {
  return game.isFestival() ? `Folklore Festival${moonPhase(game.clock.day).full ? ' under a full moon' : ''}` : '';
}
