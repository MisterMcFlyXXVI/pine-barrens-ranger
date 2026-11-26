/**
 * Phase 3: Pine Hollow Town (84x72) and its interiors.
 *
 * Connections:
 *   TOWN west-upper ↔ PINE_TRAIL south-east road     TOWN west-main ↔ CABIN_YARD east road
 *   Diner / Store / Museum doors ↔ interiors         Museum stairs ↔ Archive Basement (8 donations)
 *   Rail car  → EXPANSION_RAIL_PORTAL (stub)         NE foothills mine → MINE_ENTRANCE_PORTAL (stub)
 */
import { T, O } from './tiles';
import { Builder, MapDef } from './mapgen';
import type { MapId } from './mapgen';
import { CRYPTIDS } from './cryptids';
import { hash2, mulberry32, valueNoise } from '../util';
import { P } from '../graphics/palette';

/** Tile index of each museum display case, in cryptid-number order. */
export const MUSEUM_CASE_COLS = [3, 5, 7, 18, 20, 22];
export const MUSEUM_CASE_ROWS = [4, 6, 8, 10, 12, 14];

function wrap(b: Builder, id: MapId, name: string, extra: Partial<MapDef>): MapDef {
  return {
    id, name, w: b.w, h: b.h, indoor: false, wild: false, plots: [], forage: [], portals: [],
    ground: b.ground, objects: b.objects, anchors: b.anchors, structAt: b.structAt, structures: b.structures,
    signs: b.signs, zones: b.zones, meta: b.meta, battleColors: [P.FOG, P.MOSS],
    ...extra,
  };
}

/* ================================================================== */
/* PINE_HOLLOW_TOWN                                                    */
/* ================================================================== */

export const TOWN_SQUARE = { x: 30, y: 24, w: 17, h: 12 };
export const FESTIVAL_SPOTS = {
  ezri: [33, 33] as [number, number],
  pike: [43, 33] as [number, number],
  bonfire: [38, 32] as [number, number],
};

export function buildTown(): MapDef {
  const W = 84, H = 72;
  const b = new Builder(W, H, T.GRASS);
  const r = mulberry32(6001);
  const exit = (x: number, y: number) => (x < 9 && ((y >= 13 && y <= 19) || (y >= 33 && y <= 39))) || (x >= 70 && x <= 75);
  b.border(9, 3, T.FOREST, (x, y) => (hash2(x, y, 11) < 0.7 ? O.PINE : O.OAK), exit, (x, y) => valueNoise(x, y, 71));

  // Railway along the east edge + platform
  for (let y = 0; y < H; y++) for (const x of [72, 73]) { b.setG(x, y, T.RAIL); b.setO(x, y, O.NONE); }
  for (let y = 0; y < H; y++) for (const x of [70, 71, 74, 75]) { b.setO(x, y, O.NONE); b.setG(x, y, T.GRASS); }
  b.rectG(66, 26, 6, 21, T.PLATFORM);
  b.place(72, 47, O.RAILCAR, 2, 3);
  b.setO(70, 27, O.SIGNAL_LANTERN);
  b.setO(67, 33, O.TICKET_BOOTH);
  b.structure({ kind: 'station', x: 59, y: 27, w: 7, h: 6, door: { x: 62, y: 32 }, open: false, windows: [[20, 44], [92, 44]],
    lockedMsg: 'The waiting room is boarded up. "CLOSED UNTIL FURTHER NOTICE -- Chesapeake & Ohio Railway."' });

  // NE foothills: boarded-up coal mine adit
  for (let y = 2; y < 13; y++) for (let x = 44; x < 70; x++) { b.setG(x, y, T.ROCKY); b.setO(x, y, O.NONE); }
  b.structure({ kind: 'mine', x: 52, y: 3, w: 5, h: 4, door: { x: 54, y: 6 }, open: true, windows: [] });
  for (const [x, y] of [[48, 5], [60, 4], [62, 9], [47, 10], [59, 11]]) b.setO(x, y, O.SLAG);

  // Main street & roads
  b.trail([[-1, 36], [20, 36], [40, 36], [60, 36], [66, 36]]);
  b.trail([[-1, 16], [10, 17], [20, 21], [30, 26]]);
  b.trail([[46, 25], [49, 18], [53, 12], [54, 7]]);
  b.trail([[17, 34], [17, 36]], 1);
  b.trail([[53, 34], [53, 36]], 1);
  b.trail([[62, 33], [62, 36]], 1);
  b.trail([[37, 22], [37, 24]], 2);
  b.trail([[20, 38], [15, 47]], 1); b.trail([[27, 38], [27, 49]], 1); b.trail([[41, 38], [41, 49]], 1);

  // Town Square plaza
  const S = TOWN_SQUARE;
  b.rectG(S.x, S.y, S.w, S.h, T.PLAZA);
  for (let y = S.y; y < S.y + S.h; y++) for (let x = S.x; x < S.x + S.w; x++) b.setO(x, y, O.NONE);
  b.place(37, 28, O.FOUNTAIN, 2, 2);
  b.setO(33, 26, O.BOARD);
  for (const [x, y] of [[32, 30], [44, 30], [33, 34], [43, 34]]) b.setO(x, y, O.BENCH);
  for (const [x, y] of [[30, 24], [46, 24], [30, 35], [46, 35]]) b.setO(x, y, O.LAMP);
  for (const [x, y] of [[35, 25], [41, 25], [31, 28], [45, 28]]) b.setO(x, y, O.FLOWERBED);

  // Buildings
  b.structure({ kind: 'museum', x: 32, y: 14, w: 12, h: 8, door: { x: 37, y: 21 }, open: true, windows: [[28, 98], [164, 98]] });
  b.structure({ kind: 'diner', x: 14, y: 29, w: 8, h: 6, door: { x: 17, y: 34 }, open: true, windows: [[20, 70], [100, 70]] });
  b.structure({ kind: 'store', x: 50, y: 29, w: 8, h: 6, door: { x: 53, y: 34 }, open: true, windows: [[20, 70], [100, 70]] });
  const house = (x: number, y: number, msg: string) =>
    b.structure({ kind: 'house', x, y, w: 6, h: 5, door: { x: x + 2, y: y + 4 }, open: false, windows: [[20, 54]], lockedMsg: msg });
  house(12, 42, "Agnes Vance's cottage. A note on the door: \"At the Historical Society. -A.V.\"");
  house(24, 44, "Barnaby Finch's house. A dog bowl sits by the door, labeled BUSTER.");
  house(38, 44, 'The Miller-Thorne house. You smell pie... and hot iron.');
  for (const [x, y] of [[20, 38], [27, 38], [41, 38], [57, 38], [10, 38], [47, 38]]) if (b.g(x, y) !== T.PATH) b.setO(x, y, O.LAMP);
  b.setO(23, 34, O.LAMP); b.setO(49, 34, O.LAMP);

  // Hedges & greenery
  for (let x = 11; x < 46; x++) if (b.g(x, 40) === T.GRASS && b.o(x, 40) === O.NONE && x % 7 !== 3) b.setO(x, 40, O.HEDGE);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (b.g(x, y) !== T.GRASS || b.o(x, y) !== O.NONE || b.structAt.has(b.i(x, y))) continue;
    if (x >= 65) continue;
    const near = b.neighbors4(x, y, (g) => g === T.PATH || g === T.PLAZA);
    if (near) continue;
    const roll = r();
    if (roll < 0.035) b.setO(x, y, r() < 0.6 ? O.OAK : O.PINE);
    else if (roll < 0.05) b.setO(x, y, O.FLOWERS);
    else if (roll < 0.06) b.setO(x, y, O.BRUSH);
  }

  b.sign(11, 34, 'PINE HOLLOW, W.VA. Pop. 212 (and counting cryptids). Welcome to Pine Holler, Ranger!');
  b.sign(36, 22, 'PINE HOLLOW HISTORICAL SOCIETY. Curator: Agnes Vance. Specimen donations welcome.');
  b.sign(65, 37, 'PINE HOLLOW STATION. C&O branch line. Service suspended since the storm of \'79.');
  b.sign(51, 8, 'DANGER: MINE ENTRANCE SEALED BY ORDER OF THE TOWN COUNCIL.');
  b.sign(6, 18, 'WEST: Pine Trail & Orchard.');

  return wrap(b, 'PINE_HOLLOW_TOWN', 'Pine Hollow Town', {
    portals: [
      { x: 0, y: 13, w: 1, h: 7, to: 'PINE_TRAIL_AND_ORCHARD', tx: 78, ty: 64, dir: 'left', closedMsg: '' },
      { x: 0, y: 33, w: 1, h: 7, to: 'CABIN_YARD', tx: 62, ty: 34, dir: 'left', closedMsg: '' },
      { x: 17, y: 34, w: 1, h: 1, to: 'DINER_INT', tx: 10, ty: 12, dir: 'up', closedMsg: '' },
      { x: 53, y: 34, w: 1, h: 1, to: 'STORE_INT', tx: 10, ty: 12, dir: 'up', closedMsg: '' },
      { x: 37, y: 21, w: 1, h: 1, to: 'MUSEUM_INT', tx: 13, ty: 18, dir: 'up', closedMsg: '' },
      // MINE_ENTRANCE_PORTAL — stub for the future underground dungeon.
      { x: 54, y: 6, w: 1, h: 1, to: 'COAL_MINE', tx: 0, ty: 0, dir: 'up',
        closedMsg: 'Planks are nailed across the mine adit. Gideon says the Restoration Grant could pay to reopen it.',
        grantMsg: 'The boards are down and fresh timbers shore up the adit, but the tunnels are still being surveyed. (The underground expansion opens in a future update!)' },
      // EXPANSION_RAIL_PORTAL — gated rail-car stub for future regional expansions.
      { x: 72, y: 46, w: 2, h: 1, to: 'EXPANSION_RAIL', tx: 0, ty: 0, dir: 'up',
        closedMsg: 'The rail car is rusted to the tracks. Barnaby sighs: "No trains since the storm of \'79."',
        grantMsg: 'The restored rail car gleams. "All aboard... soon!" New lines open in a future expansion.' },
    ],
    battleColors: [P.FOG, P.MOSS],
  });
}

/* ================================================================== */
/* Interiors                                                           */
/* ================================================================== */

function shell(W: number, H: number, floor: number, doorX: number): Builder {
  const b = new Builder(W, H, T.VOID);
  for (let x = 0; x < W; x++) { b.setG(x, 0, T.WALL_TOP); b.setG(x, 1, T.WALL_FACE); b.setG(x, 2, T.WALL_BASE); }
  for (let y = 0; y < H; y++) { b.setG(0, y, T.WALL_SIDE); b.setG(W - 1, y, T.WALL_SIDE); }
  for (let x = 0; x < W; x++) b.setG(x, H - 1, T.WALL_SIDE);
  b.rectG(1, 3, W - 2, H - 4, floor);
  b.setG(doorX, H - 2, T.DOORMAT);
  b.setG(doorX, H - 1, T.DOOR);
  return b;
}

export function buildDiner(): MapDef {
  const W = 20, H = 14;
  const b = shell(W, H, T.CHECKER, 10);
  for (const x of [5, 14]) b.setO(x, 1, O.WINDOW);
  b.setO(9, 1, O.POSTER);
  for (let x = 3; x <= 12; x++) b.setO(x, 6, O.COUNTER);
  b.setO(12, 6, O.REGISTER);
  b.setO(2, 3, O.GRILL); b.setO(3, 3, O.GRILL); b.setO(5, 3, O.STOVE); b.setO(11, 3, O.SHELF); b.setO(12, 3, O.SHELF);
  for (const x of [4, 6, 8, 10]) b.setO(x, 7, O.STOOL);
  for (const y of [5, 8, 11]) { b.setO(15, y, O.BOOTH_SEAT); b.setO(16, y, O.TABLE); b.setO(17, y, O.BOOTH_SEAT); }
  b.setO(1, 11, O.JUKEBOX); b.setO(18, 3, O.PLANT); b.setO(1, 5, O.PLANT);
  return wrap(b, 'DINER_INT', 'Whistle-Stop Diner', {
    indoor: true, battleColors: [P.AMBER, P.RUST],
    portals: [{ x: 10, y: 13, w: 1, h: 1, to: 'PINE_HOLLOW_TOWN', tx: 17, ty: 35, dir: 'down', closedMsg: '' }],
  });
}

export function buildStore(): MapDef {
  const W = 20, H = 14;
  const b = shell(W, H, T.FLOOR, 10);
  for (const x of [4, 15]) b.setO(x, 1, O.WINDOW);
  for (let x = 1; x <= 6; x++) b.setO(x, 3, O.SHELF);
  for (const y of [8, 10]) for (let x = 2; x <= 6; x++) b.setO(x, y, O.SHELF);
  for (let x = 9; x <= 13; x++) b.setO(x, 6, O.COUNTER);
  b.setO(9, 6, O.REGISTER);
  b.setO(16, 4, O.ANVIL); b.setO(17, 3, O.FORGE); b.setO(18, 6, O.CRATE); b.setO(18, 7, O.CRATE); b.setO(15, 9, O.LUMBER);
  b.setO(13, 3, O.POSTER);
  return wrap(b, 'STORE_INT', 'General Store & Outfitter', {
    indoor: true, battleColors: [P.AMBER, P.RUST],
    portals: [{ x: 10, y: 13, w: 1, h: 1, to: 'PINE_HOLLOW_TOWN', tx: 53, ty: 35, dir: 'down', closedMsg: '' }],
  });
}

export function buildMuseum(): MapDef {
  const W = 26, H = 20;
  const b = shell(W, H, T.MARBLE, 13);
  for (const x of [5, 12, 20]) b.setO(x, 1, O.WINDOW);
  b.setO(8, 1, O.POSTER); b.setO(17, 1, O.POSTER);
  CRYPTIDS.forEach((c, i) => {
    // 36 cases in the 6x6 wings; No. 37 (Sheepsquatch) gets the centerpiece between the plants.
    const [x, y] = i < 36 ? [MUSEUM_CASE_COLS[i % 6], MUSEUM_CASE_ROWS[Math.floor(i / 6)]] : [13, 6];
    b.setO(x, y, O.CASE);
    b.meta.set(b.i(x, y), c.id);
  });
  for (let x = 11; x <= 15; x++) b.setO(x, 15, O.COUNTER);
  b.setO(15, 15, O.REGISTER);
  b.setO(22, 17, O.KIOSK);
  b.setG(2, 17, T.STAIRS);
  b.setO(12, 4, O.PLANT); b.setO(14, 4, O.PLANT);
  b.setO(10, 9, O.BENCH); b.setO(15, 9, O.BENCH);
  return wrap(b, 'MUSEUM_INT', 'Pine Hollow Historical Society', {
    indoor: true, battleColors: [P.AMBER, P.RUST],
    portals: [
      { x: 13, y: 19, w: 1, h: 1, to: 'PINE_HOLLOW_TOWN', tx: 37, ty: 22, dir: 'down', closedMsg: '' },
      { x: 2, y: 17, w: 1, h: 1, to: 'MUSEUM_BASEMENT', tx: 3, ty: 8, dir: 'right', closedMsg: '', requires: 'archive' },
    ],
  });
}

export function buildBasement(): MapDef {
  const W = 16, H = 11;
  const b = shell(W, H, T.FLOOR, 8);
  b.setG(8, H - 2, T.FLOOR); b.setG(8, H - 1, T.WALL_SIDE);
  b.setG(2, 8, T.STAIRS);
  const tables: Array<[number, number, string]> = [[4, 4, 'totems'], [8, 4, 'chime'], [12, 4, 'rod'], [6, 7, 'weaver'], [10, 7, 'awful']];
  for (const [x, y, key] of tables) { b.setO(x, y, O.MAP_TABLE); b.meta.set(b.i(x, y), key); }
  for (let x = 1; x <= 14; x += 2) b.setO(x, 3, O.BOOKSHELF);
  b.setO(14, 8, O.CRATE); b.setO(13, 9, O.CRATE); b.setO(1, 9, O.LAMP);
  return wrap(b, 'MUSEUM_BASEMENT', 'Archive Basement', {
    indoor: true, battleColors: [P.AMBER, P.RUST],
    portals: [{ x: 2, y: 8, w: 1, h: 1, to: 'MUSEUM_INT', tx: 3, ty: 17, dir: 'right', closedMsg: '' }],
  });
}
