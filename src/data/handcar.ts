/**
 * Barney's handcar stops: one per outdoor region, on a short vertical spur of
 * rail beside a trail. Each stop (except Town, which is the train station)
 * starts broken and must be repaired before the handcar can run there.
 *
 * Stops are placed automatically when a region's map is built: the clear spot
 * beside a trail nearest the region's main entrance. Deterministic, so the same
 * spot every time.
 */
import type { MapDef, MapId } from './mapgen';
import { O, T, objProps } from './tiles';

export interface StopDef {
  map: MapId;
  /** Handcar (on the rails) and the HANDCAR STOP sign (on the platform; Town has none). */
  car: { x: number; y: number };
  sign: { x: number; y: number } | null;
  /** Where you stand when dropped off (on the platform, facing the handcar). */
  arrive: { x: number; y: number; dir: 'left' | 'right' | 'up' | 'down' };
  /** The old line's route through the region: tile index -> 0 horizontal / 1 vertical. */
  route: Map<number, 0 | 1>;
  /** Route tiles over water: drawn as a wooden trestle (never walkable). */
  trestle: Set<number>;
  /** Which neighbours each route tile's track actually joins: bits N=1, E=2, S=4, W=8 (for corners & junctions). */
  links: Map<number, number>;
}

export const LINK = { N: 1, E: 2, S: 4, W: 8 } as const;

/** Growth that sits on the old line until its stop is repaired (then cleared off the rails). */
export const LINE_CLEARABLE: ReadonlySet<number> = new Set<number>([O.PINE, O.OAK, O.BRUSH, O.ROCK, O.STUMP, O.LOG, O.BOULDER, O.TALLGRASS,
  O.FERN, O.FLOWERS, O.MUSHROOMS, O.RED_SPRUCE, O.SKUNK_CABBAGE, O.DEAD_TREE, O.HEMLOCK_TREE, O.REEDS, O.CRAN_BUSH, O.WILLOW, O.BRIAR]);

/**
 * The C&O spur through the valley: Town <-> Cabin <-> Pine Trail, branching to the
 * Old Growth, Radio Ridge and the Cranberry Glades. Each region's line heads from
 * its stop toward the edge facing these neighbours.
 */
export const RAIL_LINKS: ReadonlyArray<[MapId, MapId]> = [
  ['PINE_HOLLOW_TOWN', 'CABIN_YARD'], ['CABIN_YARD', 'PINE_TRAIL_AND_ORCHARD'],
  ['PINE_TRAIL_AND_ORCHARD', 'OLD_GROWTH_AND_SAWMILL'], ['PINE_TRAIL_AND_ORCHARD', 'RADIO_RIDGE_AND_CROSSROADS'],
  ['PINE_TRAIL_AND_ORCHARD', 'CRANBERRY_BOG_AND_SPRINGS'],
];

/** Which edge of a region faces each rail neighbour (matches the valley map layout). */
const EDGE: Partial<Record<MapId, Partial<Record<MapId, 'n' | 's' | 'e' | 'w'>>>> = {
  CABIN_YARD: { PINE_HOLLOW_TOWN: 'e', PINE_TRAIL_AND_ORCHARD: 'n' },
  PINE_TRAIL_AND_ORCHARD: { CABIN_YARD: 's', OLD_GROWTH_AND_SAWMILL: 'n', RADIO_RIDGE_AND_CROSSROADS: 'w', CRANBERRY_BOG_AND_SPRINGS: 'e' },
  OLD_GROWTH_AND_SAWMILL: { PINE_TRAIL_AND_ORCHARD: 's' },
  RADIO_RIDGE_AND_CROSSROADS: { PINE_TRAIL_AND_ORCHARD: 'e' },
  CRANBERRY_BOG_AND_SPRINGS: { PINE_TRAIL_AND_ORCHARD: 'w' },
};

/** Old branches deeper into a region (fractions of the map): the coal spur, the tower road, the lake landing. */
const DEEP: Partial<Record<MapId, Array<[number, number]>>> = {
  OLD_GROWTH_AND_SAWMILL: [[0.84, 0.12]],
  RADIO_RIDGE_AND_CROSSROADS: [[0.28, 0.14]],
  CRANBERRY_BOG_AND_SPRINGS: [[0.72, 0.55]],
  CABIN_YARD: [[0.15, 0.85]],
};

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const WATERY = new Set<number>([T.WATER, T.SHALLOW, T.SPRING]);
const TRAILISH = new Set<number>([T.PATH, T.BOARDWALK, T.BRIDGE]);
const NO_GO_GROUND = new Set<number>([T.VOID, T.CLIFF, T.WALL_TOP, T.WALL_FACE, T.WALL_BASE, T.WALL_SIDE, T.SOIL, T.PLAZA, T.MARBLE, T.RAIL, T.PLATFORM, T.PORCH]);
const NO_GO_OBJ = new Set<number>([O.BLOCK, O.SIGN, O.FENCE, O.STONE_WALL, O.RUIN_WALL, O.HEDGE, O.HANDCAR, O.STOP_SIGN, O.MAILBOX, O.WORKBENCH, O.SHIP_BIN, O.RAIN_BARREL, O.LAMP]);

/** Tiny binary heap for the route search. */
class Heap {
  private a: Array<[number, number]> = [];
  get size(): number { return this.a.length; }
  push(k: number, v: number): void {
    const a = this.a; a.push([k, v]);
    let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; }
  }
  pop(): [number, number] {
    const a = this.a, top = a[0], last = a.pop()!;
    if (a.length) {
      a[0] = last; let i = 0;
      for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; }
    }
    return top;
  }
}

/**
 * Lay the old line: a cheapest-path search from the stop to each target, with
 * gentle noise and a turning penalty so it curves like a railroad. It may cross
 * trails (but not follow them), bridges water on trestles, and goes around
 * buildings, gardens, walls and cliffs.
 */
function traceLine(def: MapDef, stop: StopDef, seed: number): void {
  const r = rng(seed);
  const W = def.w, H = def.h;
  const i = (x: number, y: number) => y * W + x;
  const plots = new Set(def.plots.map((p) => i(p.x, p.y)));
  const noise = (x: number, y: number) => { let h = (x * 374761393 + y * 668265263 + seed * 2654435761) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const blocked = (x: number, y: number): boolean => {
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) return x < 0 || y < 0 || x >= W || y >= H;
    const t = i(x, y), gr = def.ground[t];
    // Solid things a repair crew wouldn't clear (lumber piles, slag, hollow logs, apple trees...) are routed around.
    if (objProps(def.objects[t]).solid && !LINE_CLEARABLE.has(def.objects[t])) return true;
    if (NO_GO_GROUND.has(gr) || NO_GO_OBJ.has(def.objects[t]) || def.structAt.has(t) || def.anchors.has(t) || plots.has(t) || def.signs.has(t)) return true;
    return def.portals.some((p) => x >= p.x - 1 && x < p.x + p.w + 1 && y >= p.y - 1 && y < p.y + p.h + 1);
  };
  const stepCost = (x: number, y: number): number => {
    const t = i(x, y), gr = def.ground[t];
    let c = 1 + noise(x >> 2, y >> 2) * 1.4;
    if (TRAILISH.has(gr)) c += 5;          // cross trails, don't follow them
    if (WATERY.has(gr)) c += 4;            // a trestle is a big job
    if (gr === T.BOG || gr === T.SLOPE) c += 0.8;
    if (def.objects[t] !== O.NONE) c += 0.6;
    return c;
  };

  const legs: Array<{ goal: (x: number, y: number) => boolean; sx: number; sy: number }> = [];
  const startN = { x: stop.car.x, y: stop.car.y - 2 }, startS = { x: stop.car.x, y: stop.car.y + 3 };
  for (const [, side] of Object.entries(EDGE[def.id] ?? {}) as Array<[MapId, 'n' | 's' | 'e' | 'w']>) {
    const st = side === 'n' ? startN : side === 's' ? startS : (stop.car.y < H / 2 ? startS : startN);
    const along = side === 'n' || side === 's' ? Math.max(6, Math.min(W - 7, st.x + Math.round((r() - 0.5) * 24))) : Math.max(6, Math.min(H - 7, st.y + Math.round((r() - 0.5) * 24)));
    const goal = side === 'n' ? (x: number, y: number) => y === 0 && Math.abs(x - along) <= 12
      : side === 's' ? (x: number, y: number) => y === H - 1 && Math.abs(x - along) <= 12
      : side === 'e' ? (x: number, y: number) => x === W - 1 && Math.abs(y - along) <= 12
      : (x: number, y: number) => x === 0 && Math.abs(y - along) <= 12;
    legs.push({ goal, sx: st.x, sy: st.y });
  }
  for (const [fx, fy] of DEEP[def.id] ?? []) {
    const tx = Math.round(fx * (W - 1)), ty = Math.round(fy * (H - 1));
    const st = ty < stop.car.y ? startN : startS;
    legs.push({ goal: (x, y) => Math.abs(x - tx) <= 2 && Math.abs(y - ty) <= 2, sx: st.x, sy: st.y });
  }

  const DIRS: Array<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const leg of legs) {
    if (leg.sx < 0 || leg.sy < 0 || leg.sx >= W || leg.sy >= H) continue;
    // State = tile * 4 + arriving direction (for the turning penalty).
    const dist = new Float64Array(W * H * 4).fill(Infinity);
    const prev = new Int32Array(W * H * 4).fill(-1);
    const heap = new Heap();
    for (let d = 0; d < 4; d++) { dist[i(leg.sx, leg.sy) * 4 + d] = 0; heap.push(0, i(leg.sx, leg.sy) * 4 + d); }
    let end = -1;
    while (heap.size) {
      const [c, st] = heap.pop();
      if (c > dist[st]) continue;
      const t = st >> 2, d = st & 3, x = t % W, y = (t / W) | 0;
      if (leg.goal(x, y)) { end = st; break; }
      for (let nd = 0; nd < 4; nd++) {
        const nx = x + DIRS[nd][0], ny = y + DIRS[nd][1];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || blocked(nx, ny)) continue;
        const ns = i(nx, ny) * 4 + nd;
        const nc = c + stepCost(nx, ny) + (nd === d ? 0 : 1.6);
        if (nc < dist[ns]) { dist[ns] = nc; prev[ns] = st; heap.push(nc, ns); }
      }
    }
    if (end < 0) continue;
    const tiles: number[] = [];
    for (let st = end; st >= 0; st = prev[st]) tiles.push(st >> 2);
    tiles.reverse();
    // Record which way each tile's track runs, so corners and junctions can be drawn properly.
    const join = (a: number, b: number) => {
      const ax = a % W, ay = (a / W) | 0, bx = b % W, by = (b / W) | 0;
      const bit = bx > ax ? LINK.E : bx < ax ? LINK.W : by > ay ? LINK.S : LINK.N;
      const back = bit === LINK.E ? LINK.W : bit === LINK.W ? LINK.E : bit === LINK.S ? LINK.N : LINK.S;
      stop.links.set(a, (stop.links.get(a) ?? 0) | bit);
      stop.links.set(b, (stop.links.get(b) ?? 0) | back);
    };
    // The first tile joins the stop's spur.
    if (tiles.length) stop.links.set(tiles[0], (stop.links.get(tiles[0]) ?? 0) | (leg.sy < stop.car.y ? LINK.S : LINK.N));
    for (let k = 1; k < tiles.length; k++) join(tiles[k - 1], tiles[k]);
    tiles.forEach((t, k) => {
      const a = tiles[Math.max(0, k - 1)], b = tiles[Math.min(tiles.length - 1, k + 1)];
      const horiz = Math.abs((b % W) - (a % W)) >= Math.abs(((b / W) | 0) - ((a / W) | 0));
      if (!stop.route.has(t)) stop.route.set(t, horiz ? 0 : 1);
      if (WATERY.has(def.ground[t])) stop.trestle.add(t);
    });
  }
  // Until the stop is repaired the line is overgrown: tall grass and brush creep over it here and there.
  for (const t of stop.route.keys()) {
    if (def.objects[t] !== O.NONE || TRAILISH.has(def.ground[t]) || WATERY.has(def.ground[t])) continue;
    // Only non-solid growth, so overgrowth never walls anything off; trees already on the line stay until repair.
    const roll = r();
    if (roll < 0.22) def.objects[t] = O.TALLGRASS;
    else if (roll < 0.3) def.objects[t] = O.FERN;
  }
  for (const fg of def.forage) fg.spots = fg.spots.filter((t) => !stop.route.has(t));
}

export const STOP_MAPS: readonly MapId[] = [
  'CABIN_YARD', 'PINE_TRAIL_AND_ORCHARD', 'CRANBERRY_BOG_AND_SPRINGS', 'OLD_GROWTH_AND_SAWMILL', 'RADIO_RIDGE_AND_CROSSROADS', 'PINE_HOLLOW_TOWN',
];

/** What each stop needs to fix (Town is the station: always open). */
export const REPAIRS: Partial<Record<MapId, { mats: Array<[string, number]>; gold: number }>> = {
  CABIN_YARD: { mats: [['iron_nail', 3], ['charred_wood', 2]], gold: 50 },
  PINE_TRAIL_AND_ORCHARD: { mats: [['iron_nail', 4], ['charred_wood', 3], ['pine_resin', 2]], gold: 100 },
  CRANBERRY_BOG_AND_SPRINGS: { mats: [['iron_nail', 5], ['plant_fiber', 6], ['pine_resin', 2]], gold: 150 },
  OLD_GROWTH_AND_SAWMILL: { mats: [['iron_nail', 6], ['charred_wood', 4], ['scrap_copper', 2]], gold: 200 },
  RADIO_RIDGE_AND_CROSSROADS: { mats: [['iron_nail', 8], ['scrap_copper', 4], ['crushed_quartz', 2]], gold: 250 },
};

export const STOPS = new Map<MapId, StopDef>();

export const stopFlag = (id: MapId) => `stop_${id}`;

const OPEN = new Set<number>([T.GRASS, T.FOREST, T.CLOVER, T.HEMLOCK, T.ROCKY, T.BOG]);
/** Plain vegetation/rocks that may be cleared to make room. */
const CLEARABLE = new Set<number>([O.NONE, O.PINE, O.OAK, O.BRUSH, O.ROCK, O.STUMP, O.LOG, O.TALLGRASS, O.FERN, O.FLOWERS, O.MUSHROOMS,
  O.RED_SPRUCE, O.SKUNK_CABBAGE, O.DEAD_TREE, O.HEMLOCK_TREE, O.REEDS, O.CRAN_BUSH]);

/** Find and build this region's stop (mutates the map). Call once per built map. */
export function placeStop(def: MapDef): void {
  if (!STOP_MAPS.includes(def.id) || STOPS.has(def.id)) return;
  const i = (x: number, y: number) => y * def.w + x;
  const g = (x: number, y: number) => (x >= 0 && y >= 0 && x < def.w && y < def.h ? def.ground[i(x, y)] : T.VOID);
  const o = (x: number, y: number) => def.objects[i(x, y)];

  if (def.id === 'PINE_HOLLOW_TOWN') {
    // The station: a free rail tile with platform beside it.
    let best: StopDef | null = null, bestD = Infinity;
    const fresh = () => ({ route: new Map<number, 0 | 1>(), trestle: new Set<number>(), links: new Map<number, number>() });
    for (let y = 4; y < def.h - 4; y++) for (let x = 1; x < def.w - 1; x++) {
      if (g(x, y) !== T.RAIL || o(x, y) !== O.NONE) continue;
      const side = g(x - 1, y) === T.PLATFORM && o(x - 1, y) === O.NONE ? -1 : g(x + 1, y) === T.PLATFORM && o(x + 1, y) === O.NONE ? 1 : 0;
      if (!side || def.portals.some((p) => x >= p.x && x < p.x + p.w && Math.abs(y - p.y) < 3)) continue;
      const d = Math.abs(y - 38);
      if (d < bestD) { bestD = d; best = { map: def.id, car: { x, y }, sign: null, arrive: { x: x + side, y, dir: side < 0 ? 'right' : 'left' }, ...fresh() }; }
    }
    if (best) { def.objects[i(best.car.x, best.car.y)] = O.HANDCAR; STOPS.set(def.id, best); }
    return; // Town's own tracks are already fully visible.
  }

  // Elsewhere: a 2x4 spur (rails column + platform column) right beside a trail, near the main entrance.
  const entry = def.portals[0];
  const ex = entry ? entry.x + entry.w / 2 : def.w / 2, ey = entry ? entry.y + entry.h / 2 : def.h / 2;
  const plots = new Set(def.plots.map((p) => i(p.x, p.y)));
  const signs = new Set(def.signs.keys());
  let best: { x: number; y: number; railX: number; platX: number; score: number } | null = null;
  for (let y = 4; y < def.h - 8; y++) for (let x = 4; x < def.w - 5; x++) {
    for (const dir of [1, -1]) {
      // Rails at railX, platform at platX = railX + dir, trail at platX + dir.
      const railX = x, platX = x + dir, trailX = x + 2 * dir;
      let ok = true, cleared = 0, trail = 0;
      for (let k = 0; k < 4 && ok; k++) {
        for (const cx of [railX, platX]) {
          const t = i(cx, y + k);
          if (!OPEN.has(g(cx, y + k)) || !CLEARABLE.has(def.objects[t]) || def.anchors.has(t) || def.structAt.has(t) || plots.has(t) || signs.has(t)
            || def.portals.some((p) => cx >= p.x - 1 && cx < p.x + p.w + 1 && y + k >= p.y - 1 && y + k < p.y + p.h + 1)) { ok = false; break; }
          if (def.objects[t] !== O.NONE) cleared++;
        }
        if (g(trailX, y + k) === T.PATH || g(trailX, y + k) === T.BOARDWALK) trail++;
      }
      if (!ok || trail < 2) continue;
      const score = Math.hypot(x - ex, y - ey) + cleared * 1.5;
      if (!best || score < best.score) best = { x, y, railX, platX, score };
    }
  }
  if (!best) return;
  const { y, railX, platX } = best;
  for (let k = 0; k < 4; k++) {
    for (const [cx, gr] of [[railX, T.RAIL], [platX, T.PLATFORM]] as Array<[number, number]>) {
      const t = i(cx, y + k);
      def.ground[t] = gr;
      def.objects[t] = O.NONE;
      for (const fg of def.forage) fg.spots = fg.spots.filter((s) => s !== t);
    }
  }
  const stop: StopDef = {
    map: def.id,
    car: { x: railX, y: y + 1 },
    sign: { x: platX, y: y + 3 },
    arrive: { x: platX, y: y + 1, dir: platX > railX ? 'left' : 'right' },
    route: new Map(), trestle: new Set(), links: new Map(),
  };
  def.objects[i(stop.car.x, stop.car.y)] = O.HANDCAR;
  def.objects[i(stop.sign!.x, stop.sign!.y)] = O.STOP_SIGN;
  traceLine(def, stop, def.w * 131 + def.h * 17 + railX);
  STOPS.set(def.id, stop);
}
