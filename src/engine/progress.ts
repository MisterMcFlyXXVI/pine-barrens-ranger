/** Phase 3 progression state: quests, donations & milestones, blueprints, tool levels, buffs, displays, board. */
import { MILESTONES, Milestone, ToolLine, TOOL_LINES } from '../data/economy';
import { QUESTS, TRAILS, TrailSpec } from '../data/quests';
import { getMapDef } from '../data/maps';
import { SOLID_GROUND, WADE_GROUND, objProps } from '../data/tiles';
import type { MapId } from '../data/mapgen';
import { CRYPTIDS } from '../data/cryptids';

export interface QuestState {
  stage: number;
  done: boolean;
  /** Collected trail items (sketch pages) by track index. */
  found: number[];
}

export interface ProgressSave {
  quests: Record<string, QuestState>;
  donated: string[];
  claimed: number[];
  blueprints: string[];
  tools: Partial<Record<ToolLine, number>>;
  buffs: { stealth: number; calm: number; haul?: number };
  boardDay: number;
  displays: Record<string, string>;
  archiveRead: boolean;
  // Phase 4 campaign
  act?: number;
  flags?: string[];
  pages?: number[];
  visited?: string[];
}

export interface Track {
  x: number;
  y: number;
  kind: 'paw' | 'boot' | 'page' | 'book';
  /** Direction hint toward the next track. */
  hint: string;
}

export class Progress {
  quests: Record<string, QuestState> = {};
  donated = new Set<string>();
  claimed = new Set<number>();
  blueprints = new Set<string>();
  tools: Record<ToolLine, number> = { machete: 0, waders: 0, lantern: 0, camera: 0, pack: 0, pockets: 0 };
  buffs = { stealth: 0, calm: 0, haul: 0 };
  boardDay = 0;
  /** "MAP:tileIndex" -> displayed specimen item id (cabin pedestals). */
  displays: Record<string, string> = {};
  archiveRead = false;
  /** Campaign act (1-4, 5 = epilogue / post-game). */
  act = 1;
  /** Story flags: journal, agnes, festival, mine, finale... */
  flags = new Set<string>();
  /** Recovered Vance journal pages (0 = the burned journal itself). */
  pages = new Set<number>([0]);
  visited = new Set<string>();
  private trailCache = new Map<string, Track[]>();

  constructor() {
    for (const q of QUESTS) this.quests[q.id] = { stage: 0, done: false, found: [] };
  }

  /* ---- persistence ---- */
  toSave(): ProgressSave {
    return {
      quests: this.quests, donated: [...this.donated], claimed: [...this.claimed], blueprints: [...this.blueprints],
      tools: { ...this.tools }, buffs: { ...this.buffs }, boardDay: this.boardDay, displays: { ...this.displays }, archiveRead: this.archiveRead,
      act: this.act, flags: [...this.flags], pages: [...this.pages], visited: [...this.visited],
    };
  }

  static load(d: Partial<ProgressSave> | undefined): Progress {
    const p = new Progress();
    if (!d) return p;
    for (const [id, q] of Object.entries(d.quests ?? {})) if (p.quests[id]) p.quests[id] = { stage: q.stage ?? 0, done: !!q.done, found: q.found ?? [] };
    p.donated = new Set((d.donated ?? []).filter((id) => CRYPTIDS.some((c) => c.id === id)));
    p.claimed = new Set(d.claimed ?? []);
    p.blueprints = new Set(d.blueprints ?? []);
    for (const t of TOOL_LINES) p.tools[t] = d.tools?.[t] ?? 0;
    p.buffs = { stealth: d.buffs?.stealth ?? 0, calm: d.buffs?.calm ?? 0, haul: d.buffs?.haul ?? 0 };
    p.boardDay = d.boardDay ?? 0;
    p.displays = { ...(d.displays ?? {}) };
    p.archiveRead = !!d.archiveRead;
    p.act = Math.min(5, Math.max(1, d.act ?? 1));
    p.flags = new Set(d.flags ?? []);
    p.pages = new Set([0, ...(d.pages ?? [])]);
    p.visited = new Set(d.visited ?? []);
    return p;
  }

  /* ---- quests ---- */
  stage(id: string): number { return this.quests[id]?.stage ?? 0; }
  done(id: string): boolean { return !!this.quests[id]?.done; }
  active(id: string): boolean { const q = this.quests[id]; return !!q && q.stage > 0 && !q.done; }
  setStage(id: string, stage: number): void { this.quests[id].stage = stage; }
  complete(id: string): void { this.quests[id].done = true; }

  /* ---- donations & milestones ---- */
  get donations(): number { return this.donated.size; }
  has(flag: NonNullable<Milestone['flag']>): boolean {
    const m = MILESTONES.find((x) => x.flag === flag);
    return !!m && this.donations >= m.count;
  }
  /** Milestones reached but not yet announced. */
  newlyReached(): Milestone[] {
    const out = MILESTONES.filter((m) => this.donations >= m.count && !this.claimed.has(m.count));
    for (const m of out) this.claimed.add(m.count);
    return out;
  }

  /* ---- quest trails ---- */
  trail(spec: TrailSpec): Track[] {
    const key = `${spec.quest}:${spec.stage}`;
    let t = this.trailCache.get(key);
    if (t) return t;
    t = layTrail(spec);
    this.trailCache.set(key, t);
    return t;
  }

  /** Tracks visible on a map right now. */
  tracksOn(map: MapId): Array<{ spec: TrailSpec; tracks: Track[] }> {
    const out: Array<{ spec: TrailSpec; tracks: Track[] }> = [];
    for (const spec of TRAILS) if (spec.map === map && this.stage(spec.quest) === spec.stage && !this.done(spec.quest)) out.push({ spec, tracks: this.trail(spec) });
    return out;
  }

  trailEnd(quest: string): [number, number] | null {
    const spec = TRAILS.find((s) => s.quest === quest);
    if (!spec) return null;
    const t = this.trail(spec);
    const last = t[t.length - 1];
    return last ? [last.x, last.y] : null;
  }
}

/** BFS the generated map (no briars, optional wading) and drop tracks along the path. */
function layTrail(spec: TrailSpec): Track[] {
  const d = getMapDef(spec.map);
  const W = d.w, Hh = d.h;
  const ok = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= W || y >= Hh) return false;
    const i = y * W + x, g = d.ground[i];
    if (SOLID_GROUND.has(g)) return false;
    if (!spec.waders && WADE_GROUND.has(g)) return false;
    return !objProps(d.objects[i]).solid && !d.portals.some((p) => x >= p.x && y >= p.y && x < p.x + p.w && y < p.y + p.h);
  };
  const start = spec.from;
  const prev = new Int32Array(W * Hh).fill(-2);
  const q: number[] = [start[1] * W + start[0]];
  prev[q[0]] = -1;
  let best = q[0], bestD = Infinity;
  for (let h = 0; h < q.length; h++) {
    const cur = q[h], cx = cur % W, cy = Math.floor(cur / W);
    const dd = Math.abs(cx - spec.to[0]) + Math.abs(cy - spec.to[1]);
    if (dd < bestD) { bestD = dd; best = cur; if (dd === 0) break; }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy, ni = ny * W + nx;
      if (ok(nx, ny) && prev[ni] === -2) { prev[ni] = cur; q.push(ni); }
    }
  }
  const path: number[] = [];
  for (let c = best; c !== -1; c = prev[c]) path.push(c);
  path.reverse();
  const pts = path.map((i) => [i % W, Math.floor(i / W)] as [number, number]);
  const dirWord = (a: [number, number], b: [number, number]) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const ns = dy < -1 ? 'north' : dy > 1 ? 'south' : '';
    const ew = dx < -1 ? 'west' : dx > 1 ? 'east' : '';
    return ns && ew ? `${ns}-${ew}` : ns || ew || 'onward';
  };
  const out: Track[] = [];
  if (spec.kind === 'page') {
    const n = pts.length;
    for (const f of [0.3, 0.55, 0.8]) { const p = pts[Math.floor(n * f)]; out.push({ x: p[0], y: p[1], kind: 'page', hint: '' }); }
    const end = pts[n - 1];
    out.push({ x: end[0], y: end[1], kind: 'book', hint: '' });
    return out;
  }
  const step = 4;
  const idx: number[] = [];
  for (let i = 3; i < pts.length - 2; i += step) idx.push(i);
  idx.forEach((pi, k) => {
    const nextI = k + 1 < idx.length ? idx[k + 1] : pts.length - 1;
    out.push({ x: pts[pi][0], y: pts[pi][1], kind: spec.kind as 'paw' | 'boot', hint: dirWord(pts[pi], pts[nextI]) });
  });
  const end = pts[pts.length - 1];
  out.push({ x: end[0], y: end[1], kind: spec.kind as 'paw' | 'boot', hint: 'here' });
  return out;
}
