/**
 * Small-detail pass run on every outdoor map after it is built: regional
 * wildflowers (forget-me-nots by water, thistle and asters in the meadows,
 * rhododendron, trillium, mayapple, ramps and Indian pipe in the woods, pitcher
 * plants in the Glades, chicory and Queen Anne's lace along roadsides), creek
 * stones in the shallows and trailhead boards at region entrances.
 * Deterministic, so the same tiles every time.
 */
import type { MapDef, MapId } from './mapgen';
import { O, T, SOLID_GROUND, objProps } from './tiles';
import { hash2, valueNoise } from '../util';

const WATERY = new Set<number>([T.WATER, T.SHALLOW, T.SPRING]);
const WOODS = new Set<number>([T.FOREST, T.HEMLOCK]);
const TREES = new Set<number>([O.PINE, O.OAK, O.HEMLOCK_TREE, O.RED_SPRUCE]);
const WOODLAND_MAPS = new Set<MapId>(['OLD_GROWTH_AND_SAWMILL', 'PINE_TRAIL_AND_ORCHARD', 'CABIN_YARD', 'RADIO_RIDGE_AND_CROSSROADS']);
const ROADSIDE_MAPS = new Set<MapId>(['PINE_HOLLOW_TOWN', 'CABIN_YARD', 'PINE_TRAIL_AND_ORCHARD', 'RADIO_RIDGE_AND_CROSSROADS']);
const MEADOW_MAPS = new Set<MapId>(['PINE_TRAIL_AND_ORCHARD', 'RADIO_RIDGE_AND_CROSSROADS', 'CABIN_YARD']);

/** Plain wildflower objects (all walk-through except rhododendron thickets). */
export const DECOR_PLANTS: ReadonlySet<number> = new Set<number>([
  O.FORGET_ME_NOT, O.THISTLE, O.RHODODENDRON, O.TRILLIUM, O.MAYAPPLE, O.INDIAN_PIPE, O.PITCHER_PLANT,
  O.CHICORY, O.QUEEN_ANNE, O.RAMP_PATCH, O.ASTER,
]);

const TRAILHEAD_TEXT: Partial<Record<MapId, string>> = {
  PINE_TRAIL_AND_ORCHARD: 'PINE TRAIL & ORCHARD -- Monongahela Forest trail system. Heirloom Golden Delicious grove ahead. Stay on blazed trails. Pack it in, pack it out.',
  CRANBERRY_BOG_AND_SPRINGS: 'CRANBERRY GLADES BOTANICAL AREA -- Stay on the boardwalk: sphagnum bog is deeper than it looks. Waders required beyond the rails. Sulphur Springs, northwest.',
  OLD_GROWTH_AND_SAWMILL: 'OLD GROWTH HEMLOCK STAND -- Some of these trees were saplings before the Revolution. Abandoned sawmill and coal works ahead: KEEP OUT (nobody does).',
  RADIO_RIDGE_AND_CROSSROADS: 'RADIO RIDGE -- National Radio Quiet Zone. Please switch off phones and radios. Steep switchbacks. Lightning hazard on the summit.',
};

export function decorate(def: MapDef): void {
  if (def.indoor) return;
  const W = def.w, H = def.h;
  const i = (x: number, y: number) => y * W + x;
  const g = (x: number, y: number) => (x >= 0 && y >= 0 && x < W && y < H ? def.ground[i(x, y)] : T.VOID);
  const o = (x: number, y: number) => (x >= 0 && y >= 0 && x < W && y < H ? def.objects[i(x, y)] : O.BLOCK);
  const plots = new Set(def.plots.map((p) => i(p.x, p.y)));
  const forage = new Set<number>();
  for (const fg of def.forage) for (const s of fg.spots) forage.add(s);
  const nearPortal = (x: number, y: number, pad: number) => def.portals.some((p) => x >= p.x - pad && x < p.x + p.w + pad && y >= p.y - pad && y < p.y + p.h + pad);
  const homeCore = (x: number, y: number) => def.id === 'CABIN_YARD' && x >= 19 && x <= 44 && y >= 11 && y <= 32;
  const free = (x: number, y: number) => {
    const t = i(x, y);
    return o(x, y) === O.NONE && !plots.has(t) && !forage.has(t) && !def.anchors.has(t) && !def.structAt.has(t) && !def.signs.has(t) && !nearPortal(x, y, 1) && !homeCore(x, y);
  };
  const near = (x: number, y: number, set: ReadonlySet<number>, rad = 1) => {
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) if ((dx || dy) && set.has(g(x + dx, y + dy))) return true;
    return false;
  };
  const seed = W * 7 + H * 13;
  const PATHISH = new Set<number>([T.PATH, T.BOARDWALK, T.BRIDGE, T.PLAZA]);

  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const gr = g(x, y);
    const roll = hash2(x, y, seed + 5);
    // Creek stones peek out of the shallows along the banks.
    if (WATERY.has(gr)) {
      if (o(x, y) === O.NONE && !near(x, y, new Set([T.BRIDGE, T.BOARDWALK])) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !WATERY.has(g(x + dx, y + dy)) && g(x + dx, y + dy) !== T.VOID) && roll < 0.07) def.objects[i(x, y)] = O.CREEK_STONE;
      continue;
    }
    if (!free(x, y)) continue;
    const patch = valueNoise(x / 4, y / 4, seed + 9);
    // Forget-me-nots on wet banks.
    if ((gr === T.GRASS || gr === T.FOREST || gr === T.CLOVER || gr === T.BOG || gr === T.HEMLOCK) && near(x, y, WATERY)) {
      if (roll < 0.14) def.objects[i(x, y)] = O.FORGET_ME_NOT;
      continue;
    }
    // Roadside chicory & Queen Anne's lace.
    if (ROADSIDE_MAPS.has(def.id) && gr === T.GRASS && near(x, y, PATHISH, 1) && !near(x, y, new Set([T.PLATFORM, T.RAIL]), 1)) {
      if (roll < 0.06) def.objects[i(x, y)] = O.CHICORY;
      else if (roll < 0.11) def.objects[i(x, y)] = O.QUEEN_ANNE;
      continue;
    }
    // Meadow thistle & asters.
    if (gr === T.CLOVER || (MEADOW_MAPS.has(def.id) && gr === T.GRASS && patch > 0.6)) {
      const k = gr === T.CLOVER ? 1 : 0.4;
      if (roll < 0.035 * k) def.objects[i(x, y)] = O.THISTLE;
      else if (roll < 0.075 * k) def.objects[i(x, y)] = O.ASTER;
      continue;
    }
    // Pitcher plants on the open glade.
    if (gr === T.BOG && def.id === 'CRANBERRY_BOG_AND_SPRINGS') {
      if (roll < 0.035) def.objects[i(x, y)] = O.PITCHER_PLANT;
      continue;
    }
    // Ridge-top asters and thistle among the rocks.
    if (def.id === 'RADIO_RIDGE_AND_CROSSROADS' && (gr === T.ROCKY || gr === T.SLOPE)) {
      if (patch > 0.55 && roll < 0.05) def.objects[i(x, y)] = roll < 0.02 ? O.THISTLE : O.ASTER;
      continue;
    }
    // Woodland floor: patches of spring ephemerals, rhododendron thickets off the trail, Indian pipe in deep shade.
    const underTrees = gr === T.GRASS && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => TREES.has(o(x + dx, y + dy)));
    if ((WOODS.has(gr) || underTrees) && WOODLAND_MAPS.has(def.id)) {
      const deep = def.id === 'OLD_GROWTH_AND_SAWMILL' || gr === T.HEMLOCK;
      if (patch > 0.68 && !near(x, y, PATHISH, 1) && roll < (deep ? 0.22 : 0.12)) { def.objects[i(x, y)] = O.RHODODENDRON; continue; }
      const kind = hash2(x >> 2, y >> 2, seed + 11);
      if (roll < (deep ? 0.07 : 0.045)) def.objects[i(x, y)] = kind < 0.3 ? O.TRILLIUM : kind < 0.55 ? O.MAYAPPLE : kind < 0.8 ? O.RAMP_PATCH : deep ? O.INDIAN_PIPE : O.TRILLIUM;
    }
  }
  // Rhododendron is solid: never let a thicket close off a tile someone could walk through.
  const passable = (x: number, y: number) => !SOLID_GROUND.has(g(x, y)) && !objProps(o(x, y)).solid;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (o(x, y) !== O.RHODODENDRON) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => passable(x + dx, y + dy)).length < 3) def.objects[i(x, y)] = O.FERN;
  }

  // A trailhead board just inside each region's main entrance.
  const text = TRAILHEAD_TEXT[def.id];
  const entry = def.portals[0];
  if (text && entry) {
    const cx = entry.x + Math.floor(entry.w / 2), cy = entry.y + Math.floor(entry.h / 2);
    let best = -1, bd = Infinity;
    for (let y = Math.max(1, cy - 9); y <= Math.min(H - 2, cy + 9); y++) for (let x = Math.max(1, cx - 9); x <= Math.min(W - 2, cx + 9); x++) {
      const gr = g(x, y);
      if (!(gr === T.GRASS || gr === T.FOREST || gr === T.CLOVER || gr === T.HEMLOCK || gr === T.ROCKY || gr === T.BOG)) continue;
      if (!free(x, y) && !DECOR_PLANTS.has(o(x, y))) continue;
      if (nearPortal(x, y, 2) || !near(x, y, PATHISH, 1)) continue;
      // Keep it out of anyone's way: three open neighbours at least.
      const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => { const oo = o(x + dx, y + dy); return oo === O.NONE || DECOR_PLANTS.has(oo) || oo === O.TALLGRASS || oo === O.FERN; }).length;
      if (open < 3) continue;
      const d = Math.hypot(x - cx, y - cy);
      if (d < bd) { bd = d; best = i(x, y); }
    }
    if (best >= 0) { def.objects[best] = O.TRAILHEAD; def.signs.set(best, text); }
  }
  unblock(def, new Set([O.RHODODENDRON, O.TRAILHEAD, O.TRASH_CAN, O.BIKE, O.CAT, O.NEWS_BOX, O.MILK_CANS]), (ob) => (ob === O.RHODODENDRON ? O.FERN : O.NONE));
}

/**
 * Make sure solid decor never cuts off ground: flood-fill from every exit with and
 * without the given decor, and swap out any piece that borders a tile lost to it.
 */
export function unblock(def: MapDef, solidDecor: ReadonlySet<number>, replace: (o: number) => number): void {
  const W = def.w, H = def.h;
  const pass = (t: number, ignore: boolean) => {
    if (SOLID_GROUND.has(def.ground[t])) return false;
    const ob = def.objects[t];
    if (ignore && solidDecor.has(ob)) return true;
    return !objProps(ob).solid;
  };
  const fill = (ignore: boolean): Uint8Array => {
    const seen = new Uint8Array(W * H);
    const q: number[] = [];
    for (const p of def.portals) for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) { const t = y * W + x; if (x >= 0 && y >= 0 && x < W && y < H && !seen[t]) { seen[t] = 1; q.push(t); } }
    while (q.length) {
      const t = q.pop()!, x = t % W, y = (t / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const n = ny * W + nx;
        if (seen[n] || !pass(n, ignore)) continue;
        seen[n] = 1; q.push(n);
      }
    }
    return seen;
  };
  for (let round = 0; round < 6; round++) {
    const real = fill(false), ideal = fill(true);
    let changed = false;
    for (let t = 0; t < W * H; t++) {
      if (!ideal[t] || real[t] || solidDecor.has(def.objects[t])) continue;
      const x = t % W, y = (t / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const n = ny * W + nx;
        if (solidDecor.has(def.objects[n])) { def.objects[n] = replace(def.objects[n]); def.signs.delete(n); changed = true; }
      }
    }
    if (!changed) return;
  }
}
