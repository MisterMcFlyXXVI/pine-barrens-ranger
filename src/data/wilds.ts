/**
 * Phase 2 wilderness regions. Every map is generated deterministically from a
 * seed. Trails are carved last-but-one so every exit and point of interest is
 * always reachable; briars and wader water gate the optional shortcuts.
 *
 * Connections (portal → arrival tile):
 *   CABIN_YARD  N ↔ PINE_TRAIL S          PINE_TRAIL N ↔ OLD_GROWTH S
 *   PINE_TRAIL  E ↔ CRANBERRY_BOG W       PINE_TRAIL W ↔ RADIO_RIDGE E
 *   OLD_GROWTH  W ↔ RADIO_RIDGE N         OLD_GROWTH E ↔ CRANBERRY_BOG N
 */
import { T, O } from './tiles';
import { Builder, MapDef } from './mapgen';
import { hash2, mulberry32, valueNoise } from '../util';
import { P } from '../graphics/palette';

const TREEISH: ReadonlySet<number> = new Set<number>([O.PINE, O.OAK, O.HEMLOCK_TREE, O.WILLOW, O.APPLE_TREE, O.DEAD_TREE, O.BOULDER]);

/** Turn a few tiles of a carved shortcut into machete-clearable briars. */
function briarsAt(b: Builder, pts: Array<[number, number]>, tile: number): void {
  for (const [x, y] of pts) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (b.g(x + dx, y + dy) === tile && b.o(x + dx, y + dy) === O.NONE) b.setO(x + dx, y + dy, O.BRIAR);
      }
    }
  }
}

function nearTree(b: Builder, x: number, y: number): boolean {
  return b.neighbors4(x, y, (_g, o) => TREEISH.has(o));
}

function finish(
  b: Builder,
  base: Omit<MapDef, 'ground' | 'objects' | 'anchors' | 'structAt' | 'structures' | 'signs' | 'zones' | 'indoor' | 'wild' | 'plots' | 'w' | 'h'>,
): MapDef {
  return {
    ...base,
    w: b.w, h: b.h, indoor: false, wild: true, plots: [],
    ground: b.ground, objects: b.objects, anchors: b.anchors, structAt: b.structAt,
    structures: b.structures, signs: b.signs, zones: b.zones,
  };
}

/* ================================================================== */
/* PINE_TRAIL_AND_ORCHARD — 80x80                                     */
/* ================================================================== */

export function buildPineTrail(): MapDef {
  const W = 80, H = 80;
  const b = new Builder(W, H, T.GRASS);
  const r = mulberry32(2001);
  const exit = (x: number, y: number) =>
    (y > 71 && x >= 36 && x <= 44) || (y < 8 && x >= 36 && x <= 44) || (x > 71 && y >= 36 && y <= 45) || (x < 8 && y >= 36 && y <= 45)
    || (x > 71 && y >= 60 && y <= 69);
  b.border(0, 3, T.FOREST, (x, y) => (hash2(x, y, 5) < 0.8 ? O.PINE : O.OAK), exit, (x, y) => valueNoise(x, y, 31));

  // Clover meadows
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (b.g(x, y) === T.GRASS && valueNoise(x / 7, y / 7, 33) > 0.6) b.setG(x, y, T.CLOVER);
  }
  // Stream down the east side + a small pond
  for (let y = 33; y < H; y++) {
    const cx = Math.round(61 + 2 * Math.sin(y * 0.15));
    for (let x = cx; x < cx + 2; x++) { b.setG(x, y, T.WATER); b.setO(x, y, O.NONE); }
  }
  b.ellipseG(22, 61, 4.5, 3.2, T.WATER);

  // Heirloom Golden Delicious grove (NE), ringed by stone walls
  const OX = 49, OY = 7, OW = 27, OH = 25;
  for (let y = OY; y < OY + OH; y++) for (let x = OX; x < OX + OW; x++) { b.setG(x, y, T.GRASS); b.setO(x, y, O.NONE); }
  for (let x = OX; x < OX + OW; x++) { b.setO(x, OY, O.STONE_WALL); b.setO(x, OY + OH - 1, O.STONE_WALL); }
  for (let y = OY; y < OY + OH; y++) { b.setO(OX, y, O.STONE_WALL); b.setO(OX + OW - 1, y, O.STONE_WALL); }
  for (let y = OY + 3, row = 0; y < OY + OH - 2; y += 4, row++) {
    for (let x = OX + 3 + (row % 2) * 2; x < OX + OW - 2; x += 4) b.setO(x, y, O.APPLE_TREE);
  }
  for (let y = OY + 1; y < OY + OH - 1; y++) for (let x = OX + 1; x < OX + OW - 1; x++) {
    if (b.o(x, y) === O.NONE && valueNoise(x / 3, y / 3, 34) > 0.5) b.setO(x, y, O.TALLGRASS);
  }
  b.zone('orchard', OX, OY, OW, OH);

  // Trails (hub at 40,40)
  b.trail([[39, 80], [40, 70], [36, 58], [39, 48], [40, 41]]);
  b.trail([[40, 40], [44, 30], [38, 19], [41, 8], [40, -1]]);
  b.trail([[40, 40], [50, 43], [58, 38], [66, 41], [74, 40], [80, 40]]);
  b.trail([[40, 40], [30, 43], [20, 38], [10, 42], [-1, 41]]);
  b.trail([[43, 31], [48, 26], [52, 22], [58, 20], [66, 19], [71, 19]]);
  // South-east road to Pine Hollow Town
  b.trail([[40, 68], [50, 67], [60, 64], [70, 64], [80, 64]]);
  b.trail([[66, 19], [64, 12]], 1);
  // Shortcut from the west trail toward the north trail, gated by briars
  b.trail([[15, 40], [16, 31], [24, 23], [33, 18], [39, 15]], 1);
  briarsAt(b, [[16, 31], [33, 18]], T.PATH);

  // Clutter, meadows & reeds
  const inOrchard = (x: number, y: number) => x >= OX && x < OX + OW && y >= OY && y < OY + OH;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const g = b.g(x, y);
    if ((g !== T.GRASS && g !== T.CLOVER) || b.o(x, y) !== O.NONE || inOrchard(x, y)) continue;
    if (b.neighbors4(x, y, (gg) => gg === T.WATER)) { if (r() < 0.4) b.setO(x, y, O.REEDS); continue; }
    const meadow = valueNoise(x / 6, y / 6, 35) > 0.56;
    const roll = r();
    if (meadow && roll < 0.68) b.setO(x, y, O.TALLGRASS);
    else if (roll < 0.06) b.setO(x, y, O.PINE);
    else if (roll < 0.08) b.setO(x, y, O.OAK);
    else if (roll < 0.11) b.setO(x, y, O.BRUSH);
    else if (roll < 0.125) b.setO(x, y, O.ROCK);
    else if (roll < 0.132) b.setO(x, y, O.STUMP);
    else if (roll < 0.136) b.setO(x, y, O.LOG);
    else if (roll < 0.166) b.setO(x, y, O.FERN);
    else if (roll < 0.176) b.setO(x, y, O.FLOWERS);
    else if (roll < 0.179) b.setO(x, y, O.BOULDER);
  }
  // Old stone walls snaking through the meadows
  for (let x = 6; x < 30; x++) {
    const y = Math.round(26 + Math.sin(x * 0.3) * 1.5);
    if (b.g(x, y) !== T.PATH && b.o(x, y) !== O.BRIAR && hash2(x, y, 9) > 0.15) { b.setO(x, y, O.STONE_WALL); }
  }

  b.sign(42, 37, 'CROSSROADS. N: Old Growth & Sawmill   E: Cranberry Glades   W: Radio Ridge   S: Your cabin.');
  b.sign(37, 74, 'PINE TRAIL. Rustling clover hides Jackalopes by day. Keep Wild Clover handy.');
  b.sign(72, 62, 'EAST: Pine Hollow Town. Diner, Outfitter & the Historical Society.');
  b.sign(46, 31, "APPLE GROVE. Shake a tree for heirloom apples. Something small steals them at dusk...");
  b.sign(14, 39, 'SHORTCUT (OVERGROWN). Clear the briars with a Machete.');

  const forage = b.collect((x, y) => (b.g(x, y) === T.GRASS || b.g(x, y) === T.CLOVER) && b.free(x, y) && !inOrchard(x, y) && nearTree(b, x, y));
  const appleSpots = b.collect((x, y) => inOrchard(x, y) && b.free(x, y) && b.neighbors4(x, y, (_g, o) => o === O.APPLE_TREE));
  const eggSpots = b.collect((x, y) => (inOrchard(x, y) || (x > 40 && x < 72 && y > 18 && y < 40)) && b.free(x, y) && (b.g(x, y) === T.GRASS || b.g(x, y) === T.CLOVER));
  return finish(b, {
    id: 'PINE_TRAIL_AND_ORCHARD', name: 'Pine Trail & Orchard',
    portals: [
      { x: 36, y: 79, w: 9, h: 1, to: 'CABIN_YARD', tx: 31, ty: 1, dir: 'down', closedMsg: '' },
      { x: 36, y: 0, w: 9, h: 1, to: 'OLD_GROWTH_AND_SAWMILL', tx: 45, ty: 83, dir: 'up', closedMsg: '' },
      { x: 79, y: 36, w: 1, h: 10, to: 'CRANBERRY_BOG_AND_SPRINGS', tx: 1, ty: 40, dir: 'right', closedMsg: '' },
      { x: 0, y: 36, w: 1, h: 10, to: 'RADIO_RIDGE_AND_CROSSROADS', tx: 78, ty: 42, dir: 'left', closedMsg: '' },
      { x: 79, y: 60, w: 1, h: 10, to: 'PINE_HOLLOW_TOWN', tx: 1, ty: 16, dir: 'right', closedMsg: '' },
    ],
    forage: [
      { spots: forage, count: 8, table: ['wild_acorn', 'wild_onion', 'pine_resin', 'sweet_sap', 'sweet_sap', 'foraged_egg', 'wild_honeycomb', 'pawpaw'] },
      { spots: appleSpots, count: 4, table: ['wild_apple'] },
      // Osterhase morning: the hare has hidden painted eggs all over the orchard.
      { spots: eggSpots, count: 14, table: ['painted_egg'], only: 'event:osterhase' },
    ],
    battleColors: [P.FOG, P.MOSS],
  });
}

/* ================================================================== */
/* CRANBERRY_BOG_AND_SPRINGS — 88x80 (Cranberry Glades & Sulphur Springs) */
/* ================================================================== */

/** valueNoise cut for cranberry beds: tuned so beds cover roughly a third of the open bog. */
const CRAN_BED_CUT = 0.6;

export function buildCranberryBog(): MapDef {
  const W = 88, H = 80;
  const b = new Builder(W, H, T.BOG);
  const r = mulberry32(4001);
  const exit = (x: number, y: number) => (x < 8 && y >= 36 && y <= 45) || (y < 8 && x >= 58 && x <= 67);
  b.border(2, 3, T.BOG, (x, y) => (hash2(x, y, 6) < 0.6 ? O.RED_SPRUCE : O.PINE), exit, (x, y) => valueNoise(x, y, 41));

  // Marsh water by noise (interior only)
  for (let y = 6; y < H - 6; y++) for (let x = 6; x < W - 6; x++) {
    const n = valueNoise(x / 9, y / 9, 51);
    if (n > 0.72) { b.setG(x, y, T.WATER); b.setO(x, y, O.NONE); }
    else if (n > 0.57) { b.setG(x, y, T.SHALLOW); b.setO(x, y, O.NONE); }
  }
  // Central lake & the deep pool
  b.ellipseG(46, 48, 16, 11.5, T.SHALLOW);
  b.ellipseG(46, 48, 12.5, 8.5, T.WATER);
  b.zone('lake', 28, 34, 37, 28);
  b.ellipseG(74, 62, 10, 9, T.SHALLOW);
  b.ellipseG(74, 62, 7.5, 6.5, T.WATER);
  b.zone('deep', 62, 51, 24, 22);
  // Old canal
  for (let x = 28; x < W - 3; x++) for (const y of [18, 19]) { b.setG(x, y, T.WATER); b.setO(x, y, O.NONE); }
  b.zone('canal', 26, 14, 60, 10);
  // Sulphur Springs (NW)
  for (let y = 3; y < 24; y++) for (let x = 3; x < 26; x++) { b.setG(x, y, T.ROCKY); b.setO(x, y, O.NONE); }
  for (const [cx, cy, rx, ry] of [[9, 8, 3, 2.5], [17, 12, 4, 3], [8, 17, 3, 2], [21, 6, 2.5, 2], [20, 19, 2.5, 2]]) b.ellipseG(cx, cy, rx, ry, T.SPRING);
  b.zone('springs', 2, 2, 25, 23);
  // Red spruce islands
  for (const [cx, cy] of [[24, 60], [58, 30], [32, 70], [70, 40], [14, 52]]) {
    b.ellipseG(cx, cy, 3.2, 2.4, T.GRASS);
    b.setO(cx, cy - 1, O.RED_SPRUCE);
    b.setO(cx - 2, cy, O.TALLGRASS); b.setO(cx + 2, cy, O.TALLGRASS); b.setO(cx, cy + 1, O.TALLGRASS);
  }

  // Boardwalk network
  const BW = T.BOARDWALK;
  b.trail([[-1, 40], [10, 40], [20, 37], [28, 32]], 2, BW, BW);
  b.trail([[28, 32], [24, 26], [18, 22], [14, 19]], 2, BW, BW);
  b.trail([[28, 32], [36, 26], [46, 23], [56, 17], [62, 8], [62, -1]], 2, BW, BW);
  b.trail([[28, 32], [30, 41], [31, 52], [37, 61], [48, 63], [60, 58], [63, 48], [59, 38], [48, 35], [36, 36], [30, 41]], 2, BW, BW);
  b.trail([[60, 58], [65, 62]], 2, BW, BW);
  b.trail([[46, 23], [60, 21], [74, 21], [84, 21]], 2, BW, BW);

  // About a third of the bog is cranberry beds; the rest is open sphagnum glade
  // with skunk cabbage, cattails and the odd red spruce (like the real Cranberry Glades).
  const bed = (x: number, y: number) => valueNoise(x / 13, y / 13, 73) > CRAN_BED_CUT;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (b.g(x, y) !== T.BOG || b.o(x, y) !== O.NONE) continue;
    const wet = b.neighbors4(x, y, (g) => g === T.WATER || g === T.SHALLOW);
    const roll = r();
    if (bed(x, y)) {
      if (roll < 0.62) b.setO(x, y, O.CRAN_BUSH);
      else if (wet && roll < 0.75) b.setO(x, y, O.REEDS);
      continue;
    }
    if (wet && roll < 0.5) b.setO(x, y, O.REEDS);
    else if (valueNoise(x / 4, y / 4, 59) > 0.58 && roll < 0.4) b.setO(x, y, O.SKUNK_CABBAGE);
    else if (roll < 0.06) b.setO(x, y, O.REEDS);
    else if (roll < 0.09) b.setO(x, y, O.SKUNK_CABBAGE);
    else if (roll < 0.105) b.setO(x, y, O.RED_SPRUCE);
    else if (roll < 0.112) b.setO(x, y, O.DEAD_TREE);
    else if (roll < 0.125) b.setO(x, y, O.MUSHROOMS);
  }
  for (let y = 3; y < 24; y++) for (let x = 3; x < 26; x++) {
    if (b.g(x, y) === T.ROCKY && b.o(x, y) === O.NONE && r() < 0.07) b.setO(x, y, r() < 0.5 ? O.BOULDER : O.ROCK);
  }

  b.sign(11, 38, 'CRANBERRY GLADES. Wild cranberry beds and sphagnum bog. Stay on the boardwalks unless you own Bog Waders. Listen for frogs in the rain.');
  b.sign(26, 24, 'SULPHUR SPRINGS. Fumes ahead. Something oily bathes here on foggy nights... and something woolly drinks here at dusk.');
  b.sign(48, 25, 'OLD CANAL. Something big and friendly swims here on clear days.');

  const cran = b.collect((x, y) => b.g(x, y) === T.BOG && b.free(x, y) && b.neighbors4(x, y, (_g, o) => o === O.CRAN_BUSH));
  const springs = b.collect((x, y) => b.g(x, y) === T.ROCKY && b.free(x, y) && b.neighbors4(x, y, (g) => g === T.SPRING));
  const general = b.collect((x, y) => (b.g(x, y) === T.BOG || b.g(x, y) === T.GRASS) && b.free(x, y) && nearTree(b, x, y));
  const glade = b.collect((x, y) => b.g(x, y) === T.BOG && b.free(x, y) && b.neighbors4(x, y, (_g, o) => o === O.SKUNK_CABBAGE));
  return finish(b, {
    id: 'CRANBERRY_BOG_AND_SPRINGS', name: 'Cranberry Glades',
    portals: [
      { x: 0, y: 36, w: 1, h: 10, to: 'PINE_TRAIL_AND_ORCHARD', tx: 78, ty: 40, dir: 'left', closedMsg: '' },
      { x: 58, y: 0, w: 10, h: 1, to: 'OLD_GROWTH_AND_SAWMILL', tx: 88, ty: 70, dir: 'left', closedMsg: '' },
    ],
    forage: [
      { spots: cran, count: 6, table: ['cranberries', 'cranberries', 'cranberries', 'cranberries', 'foraged_egg'] },
      { spots: glade, count: 3, table: ['wild_onion', 'wild_onion', 'foraged_egg'] },
      { spots: springs, count: 4, table: ['sulfur_crust', 'sulfur_crust', 'mineral_salt', 'crushed_quartz'] },
      { spots: general, count: 3, table: ['foraged_egg', 'pine_resin', 'wild_honeycomb'] },
    ],
    battleColors: [P.MIST, P.FOREST],
  });
}

/* ================================================================== */
/* OLD_GROWTH_AND_SAWMILL — 90x85 (+ Coal Mine entrance)               */
/* ================================================================== */

export function buildOldGrowth(): MapDef {
  const W = 90, H = 85;
  const b = new Builder(W, H, T.HEMLOCK);
  const exit = (x: number, y: number) => (y > 76 && x >= 41 && x <= 49) || (x < 8 && y >= 18 && y <= 27) || (x > 81 && y >= 66 && y <= 75);
  b.border(4, 3, T.HEMLOCK, (x, y) => (hash2(x, y, 7) < 0.7 ? O.HEMLOCK_TREE : O.PINE), exit, (x, y) => valueNoise(x, y, 43));

  // Dense ancient forest
  for (let y = 4; y < H - 4; y++) for (let x = 4; x < W - 4; x++) {
    if (b.o(x, y) !== O.NONE) continue;
    const n = valueNoise(x / 8, y / 8, 44);
    const h = hash2(x, y, 45);
    if (n > 0.42 && h < 0.3) b.setO(x, y, O.HEMLOCK_TREE);
    else if (h < 0.05) b.setO(x, y, O.PINE);
    else if (n > 0.3 && h > 0.72) b.setO(x, y, O.FERN);
    else if (h > 0.985) b.setO(x, y, O.HOLLOW_LOG);
    else if (h > 0.97) b.setO(x, y, O.MUSHROOMS);
    else if (h > 0.962) b.setO(x, y, O.STUMP);
  }
  // Moonlit clearings
  for (const [cx, cy, rr] of [[20, 62, 5], [70, 26, 5], [22, 32, 4], [68, 60, 4], [52, 70, 3.5]]) {
    b.ellipseG(cx, cy, rr, rr * 0.8, T.GRASS);
    for (let y = cy - rr; y <= cy + rr; y++) for (let x = cx - rr; x <= cx + rr; x++) {
      if (b.g(x, y) !== T.GRASS) continue;
      const h = hash2(x, y, 46);
      if (h < 0.35) b.setO(x, y, O.TALLGRASS); else if (h < 0.45) b.setO(x, y, O.FLOWERS);
    }
  }

  // ---- Abandoned Sawmill ruins ----
  for (let y = 27; y < 53; y++) for (let x = 28; x < 74; x++) { b.setO(x, y, O.NONE); if (b.g(x, y) !== T.HEMLOCK) b.setG(x, y, T.HEMLOCK); }
  const room = (x0: number, y0: number, x1: number, y1: number, doors: Array<[number, number]>) => {
    for (let y = y0 + 1; y < y1; y++) for (let x = x0 + 1; x < x1; x++) b.setG(x, y, T.RUIN_FLOOR);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (x !== x0 && x !== x1 && y !== y0 && y !== y1) continue;
      if (doors.some(([dx, dy]) => dx === x && dy === y)) { b.setG(x, y, T.RUIN_FLOOR); continue; }
      if (hash2(x, y, 47) < 0.14) { b.setG(x, y, T.RUIN_FLOOR); continue; } // broken gaps
      b.setO(x, y, O.RUIN_WALL);
    }
  };
  room(31, 33, 47, 45, [[39, 45], [40, 45], [47, 39], [47, 40], [38, 33], [39, 33], [40, 33]]); // main hall
  room(32, 28, 46, 33, [[38, 33], [39, 33], [40, 33]]); // collapsed roof loft
  room(47, 35, 55, 43, [[47, 39], [47, 40], [55, 39], [55, 40]]); // saw wing
  b.setO(35, 37, O.SAW_BLADE); b.setO(51, 38, O.SAW_BLADE); b.setO(44, 42, O.LUMBER); b.setO(34, 43, O.CRATE); b.setO(42, 36, O.LUMBER);
  b.zone('sawmill', 31, 33, 25, 13);
  b.zone('roof', 32, 28, 15, 6);
  // Timber yard
  for (let y = 31; y < 47; y += 3) for (let x = 59; x < 72; x += 4) {
    const h = hash2(x, y, 48);
    b.setO(x, y, h < 0.5 ? O.LUMBER : h < 0.7 ? O.LOG : h < 0.85 ? O.STUMP : O.SAW_BLADE);
  }
  for (let y = 30; y < 48; y++) for (let x = 57; x < 73; x++) if (b.o(x, y) === O.NONE && hash2(x, y, 49) < 0.18) b.setO(x, y, O.FERN);
  b.zone('timber', 57, 29, 16, 19);

  // ---- Abandoned Coal Mine entrance (NE foothills) ----
  for (let y = 2; y < 16; y++) for (let x = 68; x < 88; x++) { b.setG(x, y, T.ROCKY); if (y > 1) b.setO(x, y, O.NONE); }
  b.structure({ kind: 'mine', x: 75, y: 5, w: 5, h: 4, door: { x: 77, y: 8 }, open: true, windows: [] });
  for (const [x, y] of [[70, 9], [71, 12], [82, 10], [84, 13], [72, 6], [83, 6], [69, 13]]) b.setO(x, y, O.SLAG);

  // Trails
  b.trail([[45, 85], [44, 74], [40, 62], [40, 52], [39, 46]]);
  b.trail([[56, 39], [62, 40], [68, 48], [74, 58], [82, 68], [90, 70]]);
  b.trail([[40, 62], [30, 56], [22, 44], [14, 30], [8, 22], [-1, 22]]);
  b.trail([[62, 40], [64, 30], [70, 20], [76, 12], [77, 9]]);
  // Briar shortcut from the south trail to the east trail
  b.trail([[44, 74], [56, 72], [66, 66], [74, 58]], 1);
  briarsAt(b, [[52, 73], [66, 66]], T.PATH);
  for (const [x, y] of [[73, 10], [81, 9]]) b.setO(x, y, O.SIGN);
  b.signs.set(b.i(73, 10), 'DANGER: ABANDONED COAL MINE. NO TRESPASSING. -- Pine Hollow Mining Co., 1931');
  b.signs.set(b.i(81, 9), 'Scrawled in chalk: "the goblins came up from here. -T."');

  b.sign(43, 49, 'ABANDONED SAWMILL. Floors are rotten. The roof loft collapsed in the storm of \'79. Moths everywhere.');
  b.sign(46, 79, 'OLD GROWTH. These hemlocks are older than the town. Ferns rustle where nothing walks.');

  // Elias's old leg-hold traps, chained to the hemlocks along the west trail (the Sasquatch arc).
  for (const [ax, ay] of [[31, 59], [26, 53], [21, 46]] as Array<[number, number]>) {
    search: for (let r = 1; r < 5; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = ax + dx, y = ay + dy;
      if (b.g(x, y) !== T.HEMLOCK || !b.free(x, y) || b.g(x, y + 1) === T.PATH || b.g(x, y - 1) === T.PATH) continue;
      if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ex, ey]) => b.g(x + ex, y + ey) === T.PATH || b.g(x + ex * 2, y + ey * 2) === T.PATH)) continue;
      b.setO(x, y, O.OLD_TRAP);
      break search;
    }
  }

  const general = b.collect((x, y) => (b.g(x, y) === T.HEMLOCK || b.g(x, y) === T.GRASS) && b.free(x, y) && nearTree(b, x, y));
  const mill = b.collect((x, y) => b.g(x, y) === T.RUIN_FLOOR && b.free(x, y));
  const mine = b.collect((x, y) => b.g(x, y) === T.ROCKY && b.free(x, y) && b.neighbors4(x, y, (_g, o) => o === O.SLAG));
  return finish(b, {
    id: 'OLD_GROWTH_AND_SAWMILL', name: 'Old Growth & Sawmill',
    portals: [
      { x: 41, y: 84, w: 9, h: 1, to: 'PINE_TRAIL_AND_ORCHARD', tx: 40, ty: 1, dir: 'down', closedMsg: '' },
      { x: 0, y: 18, w: 1, h: 10, to: 'RADIO_RIDGE_AND_CROSSROADS', tx: 62, ty: 1, dir: 'down', closedMsg: '' },
      { x: 89, y: 66, w: 1, h: 10, to: 'CRANBERRY_BOG_AND_SPRINGS', tx: 62, ty: 1, dir: 'down', closedMsg: '' },
      // MINE_ENTRANCE_PORTAL — stub for the future underground dungeon expansion.
      { x: 77, y: 8, w: 1, h: 1, to: 'COAL_MINE', tx: 0, ty: 0, dir: 'up', closedMsg: 'The rusted iron gate is chained shut. The town is saving to reopen No. 3 (the Restoration Ledger, at the Historical Society).', grantMsg: 'The chains are off, but the tunnels beyond are still being shored up. (The underground expansion opens in a future update!)' },
    ],
    forage: [
      { spots: general, count: 8, table: ['pine_resin', 'charred_wood', 'foraged_meat', 'foraged_meat', 'wild_honeycomb', 'wild_acorn', 'foraged_egg', 'frost_rim_antler'] },
      { spots: mill, count: 4, table: ['scrap_copper', 'iron_nail', 'iron_nail', 'charred_wood'] },
      { spots: mine, count: 3, table: ['scrap_copper', 'crushed_quartz', 'mineral_salt'] },
    ],
    battleColors: [P.FOREST, P.PINE],
  });
}

/* ================================================================== */
/* RADIO_RIDGE_AND_CROSSROADS — 80x85                                 */
/* ================================================================== */

export function buildRadioRidge(): MapDef {
  const W = 80, H = 85;
  const b = new Builder(W, H, T.ROCKY);
  const r = mulberry32(5001);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (valueNoise(x / 6, y / 6, 61) > 0.55) b.setG(x, y, T.GRASS);
  const exit = (x: number, y: number) => (x > 71 && y >= 38 && y <= 47) || (y < 8 && x >= 58 && x <= 67);
  b.border(6, 3, T.ROCKY, (x, y) => (hash2(x, y, 8) < 0.75 ? O.PINE : O.DEAD_TREE), exit, (x, y) => valueNoise(x, y, 62));

  // Cliff bands with scree below
  const bands: Array<[number, number, number, number]> = [[17, 2, 0.17, 1], [32, 3, 0.11, 2], [58, 3, 0.13, 3]];
  for (const [by, amp, f, ph] of bands) {
    for (let x = 0; x < W; x++) {
      const yy = Math.round(by + amp * Math.sin(x * f + ph));
      for (const y of [yy, yy + 1]) { b.setG(x, y, T.CLIFF); b.setO(x, y, O.NONE); }
      for (let k = 2; k < 6; k++) {
        if (valueNoise(x / 4, (yy + k) / 4, 67) > 0.55 - k * 0.02) { b.setG(x, yy + k, T.SLOPE); b.setO(x, yy + k, O.NONE); }
      }
    }
  }
  // High Cliffs (west edge)
  for (let y = 19; y < 56; y++) for (let x = 2; x < 14; x++) {
    const n = valueNoise(x / 3, y / 3, 63);
    if (n > 0.64) { b.setG(x, y, T.CLIFF); b.setO(x, y, O.NONE); }
    else if (n > 0.46) { b.setG(x, y, T.SLOPE); b.setO(x, y, O.NONE); }
  }
  b.zone('cliffs', 1, 18, 15, 40);

  // Radio Tower summit compound
  for (let y = 3; y <= 12; y++) for (let x = 8; x <= 24; x++) { b.setG(x, y, T.ROCKY); b.setO(x, y, O.NONE); }
  for (let x = 8; x <= 24; x++) { b.setO(x, 3, O.FENCE); if (x !== 16 && x !== 17) b.setO(x, 12, O.FENCE); }
  for (let y = 3; y <= 12; y++) { b.setO(8, y, O.FENCE); b.setO(24, y, O.FENCE); }
  b.structure({ kind: 'tower', x: 15, y: 5, w: 3, h: 3, door: { x: 16, y: 7 }, open: false, windows: [[24, -60]], lockedMsg: "The radio tower's maintenance hatch is rusted shut. Static crackles from the speaker: \"...is anyone out there?\"" });
  b.setO(11, 6, O.ROD_BASE); b.setO(21, 6, O.ROD_BASE); b.setO(10, 10, O.CRATE); b.setO(22, 10, O.CRATE);
  b.zone('summit', 6, 1, 22, 13);

  // The High Bald: a treeless grassy summit meadow (West Virginia's "balds"), where Opa Walter picks herbs.
  const inBald = (x: number, y: number) => ((x - 32) / 7.5) ** 2 + ((y - 17) / 4.5) ** 2 <= 1;
  for (let y = 12; y <= 22; y++) for (let x = 24; x <= 40; x++) if (inBald(x, y)) { b.setG(x, y, T.GRASS); b.setO(x, y, O.NONE); }

  // Trails (switchbacks become slope stairs where they cut the cliffs)
  b.trail([[80, 42], [68, 44], [56, 41], [46, 44], [40, 46]]);
  b.trail([[40, 46], [36, 52], [42, 57], [40, 64], [40, 72]]);
  b.trail([[40, 72], [40, 81]]); b.trail([[40, 72], [29, 72]]); b.trail([[40, 72], [52, 72]]);
  b.trail([[40, 46], [30, 40], [36, 34], [28, 27], [32, 21], [22, 15], [17, 12]]);
  b.trail([[22, 15], [36, 10], [50, 8], [62, 4], [62, -1]]);
  b.trail([[30, 40], [20, 44], [10, 40]], 1);

  // Four-way Crossroads with a stone circle and a dead snag
  for (let a = 0; a < 16; a++) {
    const x = Math.round(40 + Math.cos((a / 16) * Math.PI * 2) * 6), y = Math.round(72 + Math.sin((a / 16) * Math.PI * 2) * 5);
    if (b.g(x, y) !== T.PATH) { b.setO(x, y, O.BOULDER); }
  }
  b.setO(43, 69, O.DEAD_TREE);
  b.sign(38, 70, 'THE CROSSROADS. All four roads lead back here. Do not wait at 3 AM. Do not answer the man in green.');
  b.zone('crossroads', 30, 63, 21, 19);

  // Clutter & meadows
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const g = b.g(x, y);
    if ((g !== T.ROCKY && g !== T.GRASS) || b.o(x, y) !== O.NONE) continue;
    const roll = r();
    if (g === T.GRASS && valueNoise(x / 5, y / 5, 64) > 0.6 && roll < 0.6) b.setO(x, y, O.TALLGRASS);
    else if (roll < (g === T.GRASS ? 0.08 : 0.04)) b.setO(x, y, O.PINE);
    else if (roll < 0.1) b.setO(x, y, O.BOULDER);
    else if (roll < 0.12) b.setO(x, y, O.ROCK);
    else if (roll < 0.13) b.setO(x, y, O.DEAD_TREE);
    else if (roll < 0.15) b.setO(x, y, O.BRUSH);
  }
  // Keep the bald open: no trees or rubble, a few lichen boulders, and the old grade marker.
  for (let y = 12; y <= 22; y++) for (let x = 24; x <= 40; x++) if (inBald(x, y) && b.g(x, y) !== T.PATH) b.setO(x, y, O.NONE);
  for (const [x, y] of [[27, 15], [37, 19], [33, 21]]) if (inBald(x, y) && b.g(x, y) !== T.PATH) b.setO(x, y, O.BOULDER);
  b.sign(38, 14, 'THE HIGH BALD. A weathered C&O grade post: "SPRUCE KNOB BRANCH -- 11 MI. TO BALD KNOB." Past it, the old roadbed climbs on into dark red spruce and is lost in fog. Opa Walter says the best herbs are up there.');
  b.sign(70, 41, 'RADIO RIDGE. Switchbacks climb to the tower. Slopes are slippery in the rain.');
  b.sign(19, 13, 'WKPB RADIO TOWER. NATIONAL RADIO QUIET ZONE: transmitters prohibited. Dr. Okafor\'s night show broadcasts from here anyway.');

  const general = b.collect((x, y) => (b.g(x, y) === T.ROCKY || b.g(x, y) === T.GRASS) && b.free(x, y) && nearTree(b, x, y));
  const summit = b.collect((x, y) => x > 8 && x < 24 && y > 3 && y < 12 && b.free(x, y) && b.g(x, y) === T.ROCKY);
  const bald = b.collect((x, y) => inBald(x, y) && b.free(x, y) && b.g(x, y) === T.GRASS);
  return finish(b, {
    id: 'RADIO_RIDGE_AND_CROSSROADS', name: 'Radio Ridge & Crossroads',
    portals: [
      { x: 79, y: 38, w: 1, h: 10, to: 'PINE_TRAIL_AND_ORCHARD', tx: 1, ty: 41, dir: 'right', closedMsg: '' },
      { x: 58, y: 0, w: 10, h: 1, to: 'OLD_GROWTH_AND_SAWMILL', tx: 1, ty: 22, dir: 'right', closedMsg: '' },
    ],
    forage: [
      { spots: general, count: 7, table: ['mineral_salt', 'crushed_quartz', 'wild_acorn', 'wild_onion', 'foraged_egg'] },
      { spots: summit, count: 2, table: ['scrap_copper', 'scrap_copper', 'iron_nail'] },
      // High-country herbs and flowers on the bald (Opa Walter's satchel finds two more).
      { spots: bald, count: 3, table: ['mountain_mint', 'mountain_mint', 'mountain_mint', 'bee_balm', 'bee_balm', 'turks_cap'], boost: 'herb_satchel' },
      { spots: general, count: 1, table: ['wild_ginseng', 'wild_onion', 'wild_onion', 'wild_acorn', 'mineral_salt', 'mineral_salt'] },
    ],
    battleColors: [P.MOON, P.RUST],
  });
}
