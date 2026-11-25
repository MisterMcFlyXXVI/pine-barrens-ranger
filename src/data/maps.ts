/**
 * World map definitions. Maps are generated deterministically at boot from
 * a seeded layout script, so saves only need to store *changes* (cleared
 * brush, crops, forage) rather than whole tile arrays.
 */
import { T, O } from './tiles';
import type { Dir } from '../util';
import { mulberry32, valueNoise, hash2 } from '../util';

export type MapId =
  | 'CABIN_YARD'
  | 'CABIN_INTERIOR'
  | 'PINE_TRAIL_AND_ORCHARD'
  | 'PINE_HOLLOW_TOWN'
  | 'CRANBERRY_BOG_AND_SPRINGS'
  | 'OLD_GROWTH_AND_SAWMILL'
  | 'RADIO_RIDGE_AND_CROSSROADS';

export interface Portal {
  x: number; y: number; w: number; h: number;
  to: MapId;
  tx: number; ty: number;
  dir: Dir;
  /** Shown when the destination region isn't open yet. */
  closedMsg: string;
}

export interface Structure {
  kind: 'cabin' | 'shed';
  x: number; y: number; w: number; h: number;
  door: { x: number; y: number };
  /** Door leads somewhere via a portal (else it is locked). */
  open: boolean;
  lockedMsg?: string;
  /** Night light sources, pixel offsets from the footprint's top-left corner. */
  windows: Array<[number, number]>;
  chimney?: [number, number];
}

export interface PlotDef {
  x: number;
  y: number;
  bog: boolean;
  /** Cleared at the start of a new game. */
  starter: boolean;
}

export interface MapDef {
  id: MapId;
  name: string;
  w: number;
  h: number;
  indoor: boolean;
  ground: Uint8Array;
  objects: Uint8Array;
  /** Filler tile index -> anchor tile index for multi-tile objects. */
  anchors: Map<number, number>;
  /** Tile index -> structure index for building footprints. */
  structAt: Map<number, number>;
  structures: Structure[];
  portals: Portal[];
  plots: PlotDef[];
  signs: Map<number, string>;
  forageSpots: number[];
  /** Guaranteed daily forage nook spots. */
  nookSpots: number[];
  forageTable: string[];
}

/** Regions that are fully built in this version. Others are portal stubs. */
export const BUILT_MAPS: ReadonlySet<MapId> = new Set<MapId>(['CABIN_YARD', 'CABIN_INTERIOR']);

export const MAP_NAMES: Record<MapId, string> = {
  CABIN_YARD: 'Cabin Yard',
  CABIN_INTERIOR: 'Ranger Cabin',
  PINE_TRAIL_AND_ORCHARD: 'Pine Trail & Orchard',
  PINE_HOLLOW_TOWN: 'Pine Hollow Town',
  CRANBERRY_BOG_AND_SPRINGS: 'Cranberry Bog & Springs',
  OLD_GROWTH_AND_SAWMILL: 'Old Growth & Sawmill',
  RADIO_RIDGE_AND_CROSSROADS: 'Radio Ridge & Crossroads',
};

class Builder {
  ground: Uint8Array;
  objects: Uint8Array;
  anchors = new Map<number, number>();
  structAt = new Map<number, number>();
  structures: Structure[] = [];
  signs = new Map<number, string>();

  constructor(readonly w: number, readonly h: number, fill: number) {
    this.ground = new Uint8Array(w * h).fill(fill);
    this.objects = new Uint8Array(w * h);
  }

  in(x: number, y: number): boolean { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  i(x: number, y: number): number { return y * this.w + x; }
  g(x: number, y: number): number { return this.in(x, y) ? this.ground[this.i(x, y)] : T.VOID; }
  o(x: number, y: number): number { return this.in(x, y) ? this.objects[this.i(x, y)] : O.NONE; }
  setG(x: number, y: number, t: number): void { if (this.in(x, y)) this.ground[this.i(x, y)] = t; }
  setO(x: number, y: number, o: number): void { if (this.in(x, y)) this.objects[this.i(x, y)] = o; }

  rectG(x: number, y: number, w: number, h: number, t: number): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.setG(xx, yy, t);
  }

  /** Multi-tile object: anchor at bottom-left, fillers become solid BLOCKs. */
  place(x: number, y: number, o: number, fw = 1, fh = 1): void {
    const ax = x, ay = y + fh - 1;
    for (let yy = y; yy < y + fh; yy++) {
      for (let xx = x; xx < x + fw; xx++) {
        if (xx === ax && yy === ay) continue;
        this.setO(xx, yy, O.BLOCK);
        this.anchors.set(this.i(xx, yy), this.i(ax, ay));
      }
    }
    this.setO(ax, ay, o);
  }

  structure(s: Structure): void {
    const idx = this.structures.length;
    this.structures.push(s);
    for (let yy = s.y; yy < s.y + s.h; yy++) {
      for (let xx = s.x; xx < s.x + s.w; xx++) {
        this.structAt.set(this.i(xx, yy), idx);
        if (s.open && xx === s.door.x && yy === s.door.y) { this.setO(xx, yy, O.NONE); continue; }
        this.setO(xx, yy, O.BLOCK);
      }
    }
  }

  sign(x: number, y: number, text: string): void {
    this.setO(x, y, O.SIGN);
    this.signs.set(this.i(x, y), text);
  }

  /** Catmull-Rom spline trail through waypoints. Water becomes bridge. */
  trail(pts: Array<[number, number]>, width = 2): void {
    const P = [pts[0], ...pts, pts[pts.length - 1]];
    for (let s = 1; s < P.length - 2; s++) {
      const [p0, p1, p2, p3] = [P[s - 1], P[s], P[s + 1], P[s + 2]];
      const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const steps = Math.max(2, Math.ceil(len * 3));
      for (let k = 0; k <= steps; k++) {
        const t = k / steps, t2 = t * t, t3 = t2 * t;
        const cr = (a: number, b: number, c: number, d: number) =>
          0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        const x = cr(p0[0], p1[0], p2[0], p3[0]);
        const y = cr(p0[1], p1[1], p2[1], p3[1]);
        for (let oy = 0; oy < width; oy++) {
          for (let ox = 0; ox < width; ox++) {
            const tx = Math.floor(x) + ox, ty = Math.floor(y) + oy;
            if (!this.in(tx, ty) || this.structAt.has(this.i(tx, ty))) continue;
            const cur = this.g(tx, ty);
            if (cur === T.WATER || cur === T.BRIDGE) this.setG(tx, ty, T.BRIDGE);
            else if (cur !== T.PORCH) this.setG(tx, ty, T.PATH);
            const o = this.o(tx, ty);
            if (o !== O.BLOCK) this.setO(tx, ty, O.NONE);
          }
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* CABIN_YARD — 64x64 homestead clearing                               */
/* ------------------------------------------------------------------ */

function buildCabinYard(): MapDef {
  const W = 64, H = 64;
  const b = new Builder(W, H, T.GRASS);
  const r = mulberry32(1337);

  const northExit = (x: number, y: number) => y < 9 && x >= 29 && x <= 33;
  const eastExit = (x: number, y: number) => x > 54 && y >= 32 && y <= 36;

  // 1. Dense pine border (always closed at the outer two tiles except exits)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = Math.min(x, y, W - 1 - x, H - 1 - y);
      const th = 3 + Math.floor(valueNoise(x / 5, y / 5, 9) * 4);
      if (d >= th) continue;
      if (northExit(x, y) || eastExit(x, y)) continue;
      b.setG(x, y, T.FOREST);
      const solidEdge = d < 2;
      const roll = r();
      if (solidEdge || roll < 0.82) b.setO(x, y, r() < 0.85 ? O.PINE : O.OAK);
      else if (roll < 0.9) b.setO(x, y, O.FERN);
      else if (roll < 0.94) b.setO(x, y, O.MUSHROOMS);
    }
  }

  // 2. Winding creek (east side) + lily pond (south)
  for (let y = 0; y < H; y++) {
    const cx = Math.round(47 + 2.2 * Math.sin(y * 0.16) + 1.5 * Math.sin(y * 0.05 + 2));
    const wd = 2 + (Math.sin(y * 0.3) > 0.6 ? 1 : 0);
    for (let x = cx; x < cx + wd; x++) { b.setG(x, y, T.WATER); b.setO(x, y, O.NONE); }
  }
  for (let y = 40; y < 54; y++) {
    for (let x = 30; x < 46; x++) {
      const nx = (x + 0.5 - 37.5) / 5, ny = (y + 0.5 - 47) / 3.4;
      if (nx * nx + ny * ny <= 1) { b.setG(x, y, T.WATER); b.setO(x, y, O.NONE); }
    }
  }

  // 3. Buildings
  b.structure({
    kind: 'cabin', x: 26, y: 14, w: 6, h: 5, door: { x: 28, y: 18 }, open: true,
    windows: [[19, 56], [73, 56]], chimney: [75, -16],
  });
  b.structure({
    kind: 'shed', x: 37, y: 14, w: 4, h: 4, door: { x: 38, y: 17 }, open: false,
    lockedMsg: 'The tool shed is padlocked. Gideon Thorne in town might have a key someday.',
    windows: [],
  });
  b.rectG(25, 19, 8, 1, T.PORCH);

  // 4. Trails
  b.trail([[28, 20], [27, 21], [25, 21], [24, 22]]);                                  // porch -> garden gate
  b.trail([[24, 20], [22, 17], [22, 12], [25, 8], [29, 5], [30, 2], [31, -1]]);     // north trail
  b.trail([[33, 20], [37, 21], [41, 25], [44, 31], [48, 33], [53, 33], [58, 34], [64, 34]]); // east trail + bridge
  b.trail([[37, 22], [36, 30], [35, 37], [36, 42]]);                                  // pond path
  b.trail([[22, 31], [20, 35], [17, 40], [14, 44], [11, 48]]);                        // SW hidden nook trail

  // 5. Garden: 6x6 plots inside a fence, gate at top
  const plots: PlotDef[] = [];
  const GX = 22, GY = 24;
  for (let x = GX - 1; x <= GX + 6; x++) {
    for (const y of [GY - 1, GY + 6]) {
      if (y === GY - 1 && (x === 24 || x === 25)) { b.setG(x, y, T.PATH); b.setO(x, y, O.NONE); continue; }
      b.setG(x, y, T.GRASS); b.setO(x, y, O.FENCE);
    }
  }
  for (let y = GY; y < GY + 6; y++) for (const x of [GX - 1, GX + 6]) { b.setG(x, y, T.GRASS); b.setO(x, y, O.FENCE); }
  for (let y = GY; y < GY + 6; y++) {
    for (let x = GX; x < GX + 6; x++) {
      const starter = y < GY + 2;
      const bog = x === GX + 5;
      b.setG(x, y, T.SOIL);
      b.setO(x, y, starter ? O.NONE : hash2(x, y, 4) < 0.55 ? O.BRUSH : O.ROCK);
      plots.push({ x, y, bog, starter });
    }
  }

  // 6. Homestead fixtures
  b.setO(25, 18, O.RAIN_BARREL);
  b.setO(31, 19, O.WORKBENCH);
  b.setO(33, 19, O.SHIP_BIN);
  b.setO(24, 19, O.LAMP);
  b.setO(34, 22, O.MAILBOX);
  b.setO(36, 18, O.WOODPILE);
  b.setO(41, 17, O.CRATE);
  b.sign(21, 22, 'HOMESTEAD GARDEN. Till plots with the Hoe, plant lure seeds, and water them every day. Rocky and overgrown plots can be cleared with the Hoe or Machete.');
  b.sign(28, 9, 'NORTH TRAIL: Pine Trail & Orchard. Heirloom apples, clover meadows... and something that hops.');
  b.sign(54, 31, 'EAST ROAD: Pine Hollow Town. The Whistle-Stop Diner, Outfitter, and Historical Society.');

  // 7. Hidden foraging nook (SW), ringed by trees with briars across the trail
  const NX = 10, NY = 49;
  const nook: number[] = [];
  for (let y = NY - 8; y <= NY + 8; y++) {
    for (let x = NX - 8; x <= NX + 8; x++) {
      if (!b.in(x, y)) continue;
      const d = Math.hypot(x - NX, y - NY);
      const isTrail = b.g(x, y) === T.PATH;
      if (d < 4.2) {
        b.setG(x, y, T.GRASS);
        b.setO(x, y, hash2(x, y, 7) < 0.25 ? O.FLOWERS : O.NONE);
        if (d < 3.5 && b.o(x, y) === O.NONE) nook.push(b.i(x, y));
      } else if (d < 6.8 && Math.min(x, y, W - 1 - x, H - 1 - y) >= 1) {
        if (isTrail) { if (d < 6) b.setO(x, y, O.BRIAR); }
        else { b.setG(x, y, T.FOREST); b.setO(x, y, hash2(x, y, 8) < 0.8 ? O.PINE : O.OAK); }
      }
    }
  }
  b.setO(NX, NY - 2, O.STUMP);
  b.sign(NX - 2, NY + 2, "RANGER'S NOTE: A secret foraging nook. Resin, acorns, and wild onions turn up here every morning.");
  b.setO(NX + 2, NY + 1, O.LOG);

  // 8. Clutter, meadow patches, reeds & lily pads
  const nearHome = (x: number, y: number) => x >= 19 && x <= 43 && y >= 11 && y <= 32;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (b.g(x, y) !== T.GRASS || b.o(x, y) !== O.NONE) continue;
      if (Math.hypot(x - NX, y - NY) < 7) continue;
      const waterAdj = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => b.g(x + dx, y + dy) === T.WATER);
      if (waterAdj) { if (r() < 0.35) b.setO(x, y, O.REEDS); continue; }
      const meadow = valueNoise(x / 6, y / 6, 21) > 0.62;
      const roll = r();
      if (nearHome(x, y)) {
        if (roll < 0.012) b.setO(x, y, O.TALLGRASS);
        continue;
      }
      if (meadow && roll < 0.6) b.setO(x, y, O.TALLGRASS);
      else if (roll < 0.03) b.setO(x, y, O.BRUSH);
      else if (roll < 0.045) b.setO(x, y, O.ROCK);
      else if (roll < 0.052) b.setO(x, y, O.STUMP);
      else if (roll < 0.056) b.setO(x, y, O.LOG);
      else if (roll < 0.058) b.setO(x, y, O.BOULDER);
      else if (roll < 0.085) b.setO(x, y, r() < 0.7 ? O.PINE : O.OAK);
      else if (roll < 0.1) b.setO(x, y, O.FERN);
      else if (roll < 0.105) b.setO(x, y, O.FLOWERS);
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (b.g(x, y) !== T.WATER) continue;
      const allWater = [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => b.g(x + dx, y + dy) === T.WATER);
      if (allWater && r() < 0.18) b.setO(x, y, O.LILYPAD);
    }
  }

  // 9. Forage candidate spots: open grass near trees (outside the home clearing)
  const forageSpots: number[] = [];
  for (let y = 2; y < H - 2; y++) {
    for (let x = 2; x < W - 2; x++) {
      if (b.g(x, y) !== T.GRASS || b.o(x, y) !== O.NONE || nearHome(x, y)) continue;
      const treeAdj = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const o = b.o(x + dx, y + dy);
        return o === O.PINE || o === O.OAK;
      });
      if (treeAdj) forageSpots.push(b.i(x, y));
    }
  }

  return {
    id: 'CABIN_YARD', name: MAP_NAMES.CABIN_YARD, w: W, h: H, indoor: false,
    ground: b.ground, objects: b.objects, anchors: b.anchors, structAt: b.structAt, structures: b.structures,
    portals: [
      { x: 28, y: 18, w: 1, h: 1, to: 'CABIN_INTERIOR', tx: 10, ty: 14, dir: 'up', closedMsg: '' },
      { x: 28, y: 0, w: 7, h: 1, to: 'PINE_TRAIL_AND_ORCHARD', tx: 40, ty: 78, dir: 'up', closedMsg: 'A storm-felled hemlock blocks the trail north to Pine Trail & Orchard. Crews are clearing it... (new regions coming soon!)' },
      { x: 63, y: 31, w: 1, h: 7, to: 'PINE_HOLLOW_TOWN', tx: 1, ty: 36, dir: 'right', closedMsg: 'The road to Pine Hollow Town is washed out past the bridge. (Town opens in a future update!)' },
    ],
    plots, signs: b.signs, forageSpots, nookSpots: nook,
    forageTable: ['pine_resin', 'pine_resin', 'wild_acorn', 'wild_acorn', 'wild_onion', 'wild_onion', 'wild_honeycomb'],
  };
}

/* ------------------------------------------------------------------ */
/* CABIN_INTERIOR — 20x16                                              */
/* ------------------------------------------------------------------ */

function buildCabinInterior(): MapDef {
  const W = 20, H = 16;
  const b = new Builder(W, H, T.VOID);
  for (let x = 0; x < W; x++) { b.setG(x, 0, T.WALL_TOP); b.setG(x, 1, T.WALL_FACE); b.setG(x, 2, T.WALL_BASE); }
  for (let y = 3; y < H; y++) { b.setG(0, y, T.WALL_SIDE); b.setG(W - 1, y, T.WALL_SIDE); }
  for (let x = 0; x < W; x++) b.setG(x, H - 1, T.WALL_SIDE);
  for (let x = 0; x < W; x++) { b.setG(x, 1, T.WALL_FACE); }
  b.setG(0, 1, T.WALL_SIDE); b.setG(0, 2, T.WALL_SIDE); b.setG(W - 1, 1, T.WALL_SIDE); b.setG(W - 1, 2, T.WALL_SIDE);
  b.rectG(1, 3, W - 2, H - 4, T.FLOOR);
  b.rectG(7, 7, 6, 4, T.RUG);
  b.setG(10, 14, T.DOORMAT);
  b.setG(10, 15, T.DOOR);
  b.rectG(14, 4, 2, 1, T.HEARTH);

  // Windows on the back wall
  for (const x of [4, 11, 17]) b.setO(x, 1, O.WINDOW);
  // Furniture
  b.place(2, 3, O.BED, 1, 2);
  b.setO(5, 3, O.DESK);
  b.setO(8, 3, O.DRESSER);
  b.place(14, 3, O.FIREPLACE, 2, 1);
  b.setO(17, 3, O.BOOKSHELF);
  b.setO(18, 3, O.PLANT);
  b.setO(1, 8, O.STOVE);
  b.setO(1, 9, O.CRATE);
  b.setO(4, 11, O.TABLE);
  b.setO(3, 11, O.CHAIR);
  b.setO(5, 11, O.CHAIR);
  b.setO(13, 10, O.PEDESTAL);
  b.setO(15, 10, O.PEDESTAL);
  b.setO(17, 10, O.PEDESTAL);
  b.setO(18, 13, O.PLANT);
  b.setO(1, 13, O.WOODPILE);

  return {
    id: 'CABIN_INTERIOR', name: MAP_NAMES.CABIN_INTERIOR, w: W, h: H, indoor: true,
    ground: b.ground, objects: b.objects, anchors: b.anchors, structAt: b.structAt, structures: [],
    portals: [{ x: 10, y: 15, w: 1, h: 1, to: 'CABIN_YARD', tx: 28, ty: 19, dir: 'down', closedMsg: '' }],
    plots: [], signs: b.signs, forageSpots: [], nookSpots: [], forageTable: [],
  };
}

const cache = new Map<MapId, MapDef>();

export function getMapDef(id: MapId): MapDef {
  let m = cache.get(id);
  if (!m) {
    if (id === 'CABIN_YARD') m = buildCabinYard();
    else if (id === 'CABIN_INTERIOR') m = buildCabinInterior();
    else throw new Error(`Region ${id} is not built yet`);
    cache.set(id, m);
  }
  return m;
}

/** Bed tile where the player wakes up. */
export const BED_SPAWN = { map: 'CABIN_INTERIOR' as MapId, x: 3, y: 4, dir: 'down' as Dir };
