/**
 * World map definitions. Maps are generated deterministically at boot from
 * a seeded layout script, so saves only need to store *changes* (cleared
 * brush, crops, forage) rather than whole tile arrays.
 */
import { T, O } from './tiles';
import type { Dir } from '../util';
import { mulberry32, valueNoise, hash2 } from '../util';
import { Builder } from './mapgen';
import type { MapDef, MapId, PlotDef } from './mapgen';
import { P } from '../graphics/palette';
import { buildPineTrail, buildCranberryBog, buildOldGrowth, buildRadioRidge } from './wilds';
import { buildTown, buildDiner, buildStore, buildMuseum, buildBasement } from './town';
import { placeStop } from './handcar';
import { decorate } from './decor';

export type { MapDef, MapId, Portal, Structure, PlotDef, ZoneRect, ForageGroup } from './mapgen';

/** Regions that are fully built in this version. Others are portal stubs. */
export const BUILT_MAPS: ReadonlySet<MapId> = new Set<MapId>([
  'CABIN_YARD', 'CABIN_INTERIOR', 'PINE_TRAIL_AND_ORCHARD', 'CRANBERRY_BOG_AND_SPRINGS', 'OLD_GROWTH_AND_SAWMILL', 'RADIO_RIDGE_AND_CROSSROADS',
  'PINE_HOLLOW_TOWN', 'DINER_INT', 'STORE_INT', 'MUSEUM_INT', 'MUSEUM_BASEMENT',
]);

export const MAP_NAMES: Record<MapId, string> = {
  CABIN_YARD: 'Cabin Yard',
  CABIN_INTERIOR: 'Ranger Cabin',
  PINE_TRAIL_AND_ORCHARD: 'Pine Trail & Orchard',
  PINE_HOLLOW_TOWN: 'Pine Hollow Town',
  CRANBERRY_BOG_AND_SPRINGS: 'Cranberry Glades',
  OLD_GROWTH_AND_SAWMILL: 'Old Growth & Sawmill',
  RADIO_RIDGE_AND_CROSSROADS: 'Radio Ridge & Crossroads',
  COAL_MINE: 'Abandoned Coal Mine',
  DINER_INT: 'Whistle-Stop Diner',
  STORE_INT: 'General Store & Outfitter',
  MUSEUM_INT: 'Pine Hollow Historical Society',
  MUSEUM_BASEMENT: 'Archive Basement',
  EXPANSION_RAIL: 'Rail Line',
};

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
  b.setO(26, 19, O.ROCKER);  // porch rocker
  b.setO(30, 19, O.CHIMES);  // hung from the porch eave
  b.place(42, 20, O.CLOTHESLINE, 3, 1);
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
  b.sign(NX - 2, NY + 2, "RANGER'S NOTE: A secret foraging nook. Resin, acorns, and ramps turn up here every morning.");
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
    id: 'CABIN_YARD', name: MAP_NAMES.CABIN_YARD, w: W, h: H, indoor: false, wild: true,
    ground: b.ground, objects: b.objects, anchors: b.anchors, structAt: b.structAt, structures: b.structures,
    portals: [
      { x: 28, y: 18, w: 1, h: 1, to: 'CABIN_INTERIOR', tx: 10, ty: 14, dir: 'up', closedMsg: '' },
      { x: 28, y: 0, w: 7, h: 1, to: 'PINE_TRAIL_AND_ORCHARD', tx: 39, ty: 78, dir: 'up', closedMsg: '' },
      { x: 63, y: 31, w: 1, h: 7, to: 'PINE_HOLLOW_TOWN', tx: 1, ty: 36, dir: 'right', closedMsg: '' },
    ],
    plots, signs: b.signs, zones: [], battleColors: [P.FOG, P.MOSS],
    forage: [
      { spots: nook, count: 3, table: ['pine_resin', 'wild_acorn', 'wild_onion', 'wild_honeycomb'] },
      { spots: forageSpots, count: 6, table: ['pine_resin', 'pine_resin', 'wild_acorn', 'wild_acorn', 'wild_onion', 'wild_onion', 'wild_honeycomb'] },
    ],
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
    id: 'CABIN_INTERIOR', name: MAP_NAMES.CABIN_INTERIOR, w: W, h: H, indoor: true, wild: false,
    ground: b.ground, objects: b.objects, anchors: b.anchors, structAt: b.structAt, structures: [],
    portals: [{ x: 10, y: 15, w: 1, h: 1, to: 'CABIN_YARD', tx: 28, ty: 19, dir: 'down', closedMsg: '' }],
    plots: [], signs: b.signs, forage: [], zones: [], battleColors: [P.AMBER, P.RUST],
  };
}

const cache = new Map<MapId, MapDef>();

export function getMapDef(id: MapId): MapDef {
  let m = cache.get(id);
  if (!m) {
    if (id === 'CABIN_YARD') m = buildCabinYard();
    else if (id === 'CABIN_INTERIOR') m = buildCabinInterior();
    else if (id === 'PINE_TRAIL_AND_ORCHARD') m = buildPineTrail();
    else if (id === 'CRANBERRY_BOG_AND_SPRINGS') m = buildCranberryBog();
    else if (id === 'OLD_GROWTH_AND_SAWMILL') m = buildOldGrowth();
    else if (id === 'RADIO_RIDGE_AND_CROSSROADS') m = buildRadioRidge();
    else if (id === 'PINE_HOLLOW_TOWN') m = buildTown();
    else if (id === 'DINER_INT') m = buildDiner();
    else if (id === 'STORE_INT') m = buildStore();
    else if (id === 'MUSEUM_INT') m = buildMuseum();
    else if (id === 'MUSEUM_BASEMENT') m = buildBasement();
    else throw new Error(`Region ${id} is not built yet`);
    decorate(m);
    placeStop(m);
    cache.set(id, m);
  }
  return m;
}

/** Bed tile where the player wakes up. */
export const BED_SPAWN = { map: 'CABIN_INTERIOR' as MapId, x: 3, y: 4, dir: 'down' as Dir };
