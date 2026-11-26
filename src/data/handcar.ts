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
import { O, T } from './tiles';

export interface StopDef {
  map: MapId;
  /** Handcar (on the rails) and the HANDCAR STOP sign (on the platform; Town has none). */
  car: { x: number; y: number };
  sign: { x: number; y: number } | null;
  /** Where you stand when dropped off (on the platform, facing the handcar). */
  arrive: { x: number; y: number; dir: 'left' | 'right' | 'up' | 'down' };
  /** The old line's route through the region: tile index -> 0 horizontal / 1 vertical. */
  route: Map<number, 0 | 1>;
  /** The scattered bits of that route you can actually see in the woods (subset of route). */
  bits: Set<number>;
}

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

/** Ground where old rails can still show (not trails, water, paving or buildings). */
const RAIL_SHOWS = new Set<number>([T.GRASS, T.FOREST, T.CLOVER, T.HEMLOCK, T.ROCKY, T.BOG, T.SLOPE]);

/** Trace the line from the stop to each facing edge, then pick scattered visible stretches. */
function traceLine(def: MapDef, stop: StopDef, seed: number): void {
  const r = rng(seed);
  const i = (x: number, y: number) => y * def.w + x;
  const legs: Array<{ tx: number; ty: number; horiz: boolean; sx: number; sy: number }> = [];
  for (const [, side] of Object.entries(EDGE[def.id] ?? {}) as Array<[MapId, 'n' | 's' | 'e' | 'w']>) {
    // Leave the spur from its end nearest that edge.
    let sx = stop.car.x, sy = side === 'n' ? stop.car.y - 2 : side === 's' ? stop.car.y + 3 : stop.car.y;
    if (side === 'e' || side === 'w') sx += side === 'e' ? 1 : -1;
    const tx = side === 'e' ? def.w - 1 : side === 'w' ? 0 : Math.max(6, Math.min(def.w - 7, sx + Math.round((r() - 0.5) * 24)));
    const ty = side === 'n' ? 0 : side === 's' ? def.h - 1 : Math.max(6, Math.min(def.h - 7, sy + Math.round((r() - 0.5) * 24)));
    legs.push({ tx, ty, horiz: side === 'e' || side === 'w', sx, sy });
  }
  for (const [fx, fy] of DEEP[def.id] ?? []) {
    const tx = Math.round(fx * (def.w - 1)), ty = Math.round(fy * (def.h - 1));
    const sy = ty < stop.car.y ? stop.car.y - 2 : stop.car.y + 3;
    legs.push({ tx, ty, horiz: Math.abs(tx - stop.car.x) > Math.abs(ty - stop.car.y), sx: stop.car.x, sy });
  }
  for (const { tx, ty, horiz, sx, sy } of legs) {
    let x = sx, y = sy;
    let guard = 0;
    while ((x !== tx || y !== ty) && guard++ < 400) {
      const dx = Math.sign(tx - x), dy = Math.sign(ty - y);
      const horizMain = horiz;
      // Mostly head for the edge, with long gentle bends toward the target line.
      let mx = 0, my = 0;
      if (horizMain) { if (dx && (r() < 0.82 || !dy)) mx = dx; else my = dy; }
      else { if (dy && (r() < 0.82 || !dx)) my = dy; else mx = dx; }
      x += mx; y += my;
      if (x < 0 || y < 0 || x >= def.w || y >= def.h) break;
      stop.route.set(i(x, y), mx ? 0 : 1);
    }
  }
  // Only bits of it show: runs of 3-6 tiles, then 3-9 tiles of nothing.
  let show = r() < 0.5, left = 3 + Math.floor(r() * 4);
  for (const idx of stop.route.keys()) {
    if (show && RAIL_SHOWS.has(def.ground[idx]) && !def.structAt.has(idx) && !def.anchors.has(idx)) stop.bits.add(idx);
    if (--left <= 0) { show = !show; left = show ? 3 + Math.floor(r() * 4) : 3 + Math.floor(r() * 7); }
  }
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
    const fresh = () => ({ route: new Map<number, 0 | 1>(), bits: new Set<number>() });
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
    route: new Map(), bits: new Set(),
  };
  def.objects[i(stop.car.x, stop.car.y)] = O.HANDCAR;
  def.objects[i(stop.sign!.x, stop.sign!.y)] = O.STOP_SIGN;
  traceLine(def, stop, def.w * 131 + def.h * 17 + railX);
  STOPS.set(def.id, stop);
}
