/**
 * Phase 3: Pine Hollow Town (84x72) and its interiors.
 *
 * Connections:
 *   TOWN west-upper ↔ PINE_TRAIL south-east road     TOWN west-main ↔ CABIN_YARD east road
 *   Diner / Store / Museum doors ↔ interiors         Museum stairs ↔ Archive Basement (6 donations)
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

export function wrap(b: Builder, id: MapId, name: string, extra: Partial<MapDef>): MapDef {
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

/** Festival stalls in the Town Park lawns (built over three days after Mabel's letter): x, y, kind. */
export const FESTIVAL_STALLS: ReadonlyArray<[number, number, 'pie' | 'lantern' | 'cider' | 'crafts']> = [
  [31, 32, 'pie'], [30, 29, 'lantern'], [46, 30, 'cider'], [45, 33, 'crafts'],
];

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
  // Lawns in the corners with brick walks in from the trails, so it's a park, not a parking lot.
  const segDist = (x: number, y: number, ax: number, ay: number, bx: number, by: number) => {
    const vx = bx - ax, vy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
    return Math.hypot(x - ax - vx * t, y - ay - vy * t);
  };
  for (let y = S.y; y < S.y + S.h - 1; y++) for (let x = S.x; x < S.x + S.w; x++) {
    const ex = (x + 0.5 - 38) / 6.8, ey = (y + 0.5 - 29.5) / 5;
    if (ex * ex + ey * ey <= 1) continue;
    if (segDist(x + 0.5, y + 0.5, 30.5, 26.5, 38, 29.5) < 1.1 || segDist(x + 0.5, y + 0.5, 46.5, 25.5, 38, 29.5) < 1.1) continue;
    b.setG(x, y, T.GRASS);
  }
  // Shade trees, the miners' memorial and the flag.
  for (const [x, y] of [[31, 24], [45, 24], [31, 33], [45, 33]]) if (b.o(x, y) === O.NONE) b.setO(x, y, O.OAK);
  b.setO(38, 25, O.STATUE);
  b.signs.set(b.i(38, 25), "MINERS' MEMORIAL. \"To the men of Pine Hollow No. 3, who went down in the dark so the rest of us could have light. 1927.\" Somebody keeps fresh ramps and a pepperoni roll at the base.");
  if (b.o(36, 24) === O.NONE) b.setO(36, 24, O.FLAGPOLE);

  // Buildings
  b.structure({ kind: 'museum', x: 32, y: 14, w: 12, h: 8, door: { x: 37, y: 21 }, open: true, windows: [[28, 98], [164, 98]] });
  b.structure({ kind: 'diner', x: 14, y: 29, w: 8, h: 6, door: { x: 17, y: 34 }, open: true, windows: [[20, 70], [100, 70]], chimney: [107, -14] });
  b.structure({ kind: 'store', x: 50, y: 29, w: 8, h: 6, door: { x: 53, y: 34 }, open: true, windows: [[20, 70], [100, 70]] });
  // Homes: each front door opens onto its interior (you're invited in at 4 hearts with someone who lives there).
  const house = (x: number, y: number, variant: number, msg: string) =>
    b.structure({ kind: 'house', x, y, w: 6, h: 5, door: { x: x + 2, y: y + 4 }, open: true, windows: [[20, 54]], lockedMsg: msg, variant, chimney: [variant === 1 || variant === 4 ? 21 : 73, -16] });
  house(12, 42, 0, "Agnes Vance's cottage.");
  house(24, 44, 2, "Barnaby Finch's house. A dog bowl sits by the door, labeled BUSTER.");
  house(38, 44, 1, 'The Miller-Thorne house. You smell pie... and hot iron.');
  // Pippa's family, up the east lane; Grandma Ruth and Sam, down the south lane.
  for (let y = 42; y <= 46; y++) for (let x = 49; x <= 54; x++) b.setO(x, y, O.NONE);
  house(49, 42, 3, 'The Calloway house. A sticker on the door: "JUNIOR CRYPTID CLUB -- MEMBERS ONLY."');
  for (let y = 51; y <= 55; y++) for (let x = 31; x <= 36; x++) b.setO(x, y, O.NONE);
  house(31, 51, 4, "Ruth Haddix's house. Chickens complain from somewhere behind it.");
  b.trail([[55, 37], [55, 44], [54, 47], [51, 47]], 1);
  b.trail([[27, 49], [27, 53], [28, 57], [33, 57], [33, 56]], 1);
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
  // Old coal-company signs: the store was the company store, and the mine still has its safety board.
  const oldSign = (spots: Array<[number, number]>, text: string) => {
    const at = spots.find(([x, y]) => b.o(x, y) === O.NONE && b.g(x, y) !== T.PATH && b.g(x, y) !== T.WATER && !b.structAt.has(b.i(x, y)));
    if (at) b.sign(at[0], at[1], text);
  };
  oldSign([[49, 34], [58, 34], [49, 33], [58, 33], [49, 35], [58, 35]], 'PINE HOLLOW COAL & COKE CO. -- COMPANY STORE. (Paint shows through the newer sign. Old-timers still call it "the commissary.") Scrip no longer accepted.');
  oldSign([[57, 7], [51, 7], [58, 7], [50, 7], [57, 8], [53, 8], [55, 8], [56, 8], [58, 6], [50, 6], [57, 9], [50, 8]], 'PINE HOLLOW COAL & COKE CO. -- SAFETY FIRST. This mine has worked ___ days without a lost-time accident. (The number has been scratched out.)');
  // Lived-in clutter by the doors: cats on the steps, pots, bins, a bike, the morning paper.
  const prop = (spots: Array<[number, number]>, o: number, text?: string) => {
    const at = spots.find(([x, y]) => b.o(x, y) === O.NONE && b.g(x, y) !== T.PATH && b.g(x, y) !== T.WATER && b.g(x, y) !== T.RAIL && !b.structAt.has(b.i(x, y)));
    if (!at) return;
    if (text) b.sign(at[0], at[1], text);
    b.setO(at[0], at[1], o);
  };
  // Diner
  prop([[22, 34], [22, 33], [13, 34]], O.TRASH_CAN);
  prop([[19, 35], [20, 35], [15, 35]], O.NEWS_BOX, 'THE PINE HOLLOW GAZETTE: "LIGHTS OVER RADIO RIDGE AGAIN -- COUNCIL SAYS IT\'S WEATHER." Also: buckwheat cakes at the fire hall Saturday. 25 cents.');
  prop([[13, 35], [21, 35]], O.BIKE);
  prop([[16, 35]], O.FLOWER_POT); prop([[18, 35]], O.FLOWER_POT);
  // General Store
  prop([[49, 33], [49, 32], [58, 32]], O.MILK_CANS);
  prop([[55, 35], [56, 35], [51, 35]], O.CAT);
  prop([[52, 35]], O.FLOWER_POT); prop([[54, 35]], O.FLOWER_POT);
  prop([[57, 35], [50, 35]], O.TRASH_CAN);
  // Historical Society
  prop([[36, 22]], O.FLOWER_POT); prop([[38, 22]], O.FLOWER_POT);
  prop([[33, 22], [42, 22]], O.CAT);
  // The houses
  prop([[13, 47]], O.FLOWER_POT); prop([[15, 47]], O.FLOWER_POT);
  prop([[17, 47], [16, 47]], O.CAT);
  prop([[18, 46], [18, 45]], O.BIKE);
  prop([[25, 49]], O.FLOWER_POT); prop([[27, 49]], O.FLOWER_POT);
  prop([[30, 48], [30, 47]], O.TRASH_CAN);
  prop([[23, 48], [23, 47]], O.MILK_CANS);
  prop([[39, 49]], O.FLOWER_POT); prop([[41, 49]], O.FLOWER_POT);
  prop([[37, 48], [36, 48]], O.TRASH_CAN);
  for (const [lx, ly] of [[44, 46], [56, 46], [37, 54], [17, 50]] as Array<[number, number]>) {
    if ([0, 1, 2].every((k) => b.o(lx + k, ly) === O.NONE && b.g(lx + k, ly) === T.GRASS)) { b.place(lx, ly, O.CLOTHESLINE, 3, 1); break; }
  }
  // Gideon's open-air anvil beside the store, where he works late afternoons.
  b.setO(48, 31, O.NONE); b.setO(48, 30, O.ANVIL);
  // Station: Barney's cat keeps him company.
  prop([[58, 33], [58, 32], [66, 34]], O.CAT);
  prop([[42, 48], [42, 49], [37, 49]], O.DOG);
  prop([[20, 35], [21, 34], [21, 35]], O.GUMBALL);
  // Multi-tile railroad & mine works, only where the whole footprint is clear.
  const put = (ax: number, ay: number, o: number, fw: number, fh: number, text: string) => {
    for (let y = ay - fh + 1; y <= ay; y++) for (let x = ax; x < ax + fw; x++) {
      if (b.o(x, y) !== O.NONE || b.g(x, y) === T.PATH || b.g(x, y) === T.RAIL || b.structAt.has(b.i(x, y))) return false;
    }
    b.place(ax, ay - fh + 1, o, fw, fh);
    b.signs.set(b.i(ax, ay), text);
    return true;
  };
  // Cinder yard and the C&O water tower behind the station.
  for (let y = 22; y <= 26; y++) for (let x = 55; x <= 61; x++) if (b.g(x, y) === T.GRASS && hash2(x, y, 31) < 0.85) { b.setG(x, y, T.ROCKY); if (b.o(x, y) === O.NONE && hash2(x, y, 32) < 0.15) b.setO(x, y, O.TALLGRASS); }
  for (const [ax, ay] of [[58, 25], [57, 25], [59, 25], [56, 24]] as Array<[number, number]>) {
    if (b.o(ax, ay) === O.TALLGRASS) b.setO(ax, ay, O.NONE);
    if (b.o(ax + 1, ay) === O.TALLGRASS) b.setO(ax + 1, ay, O.NONE);
    if (put(ax, ay, O.WATER_TOWER, 2, 2, 'C&O WATER TANK. Steam engines topped up here on the climb to the coal camps. The tank still holds a few inches of rainwater and a family of tree frogs.')) break;
  }
  // Coal works: tipple over a short loading track, ore carts, and the lamp house.
  for (const [ax, ay] of [[60, 7], [61, 7], [59, 6]] as Array<[number, number]>) if (put(ax, ay, O.TIPPLE, 3, 2, 'THE TIPPLE. Coal came out of No. 3 in cars, got tipped and screened here, and dropped into hoppers on the C&O. Rust has eaten most of the screens.')) break;
  for (let x = 55; x <= 63; x++) if (b.o(x, 8) === O.NONE && b.g(x, 8) !== T.PATH) b.setG(x, 8, T.RAIL);
  for (const x of [57, 61]) if (b.o(x, 8) === O.NONE && b.g(x, 8) === T.RAIL) { b.setO(x, 8, O.MINE_CART); b.signs.set(b.i(x, 8), 'An ore car, rusted to the rails and still half full of coal. Someone has chalked "PIPPA + SAM CRYPTID CLUB HQ" on the side.'); }
  for (const [ax, ay] of [[47, 8], [45, 8], [46, 11], [50, 11]] as Array<[number, number]>) if (put(ax, ay, O.LAMP_HOUSE, 2, 2, 'LAMP HOUSE. Each miner hung a brass check on the board going in, and took it back coming out. A few checks are still hanging. Gideon won\'t say whose.')) break;

  return wrap(b, 'PINE_HOLLOW_TOWN', 'Pine Hollow Town', {
    portals: [
      { x: 0, y: 13, w: 1, h: 7, to: 'PINE_TRAIL_AND_ORCHARD', tx: 78, ty: 64, dir: 'left', closedMsg: '' },
      { x: 0, y: 33, w: 1, h: 7, to: 'CABIN_YARD', tx: 62, ty: 34, dir: 'left', closedMsg: '' },
      { x: 17, y: 34, w: 1, h: 1, to: 'DINER_INT', tx: 10, ty: 12, dir: 'up', closedMsg: '' },
      { x: 53, y: 34, w: 1, h: 1, to: 'STORE_INT', tx: 10, ty: 12, dir: 'up', closedMsg: '' },
      { x: 37, y: 21, w: 1, h: 1, to: 'MUSEUM_INT', tx: 13, ty: 18, dir: 'up', closedMsg: '' },
      { x: 14, y: 46, w: 1, h: 1, to: 'HOUSE_VANCE', tx: 8, ty: 9, dir: 'up', closedMsg: '', requires: 'home' },
      { x: 26, y: 48, w: 1, h: 1, to: 'HOUSE_FINCH', tx: 8, ty: 9, dir: 'up', closedMsg: '', requires: 'home' },
      { x: 40, y: 48, w: 1, h: 1, to: 'HOUSE_MILLER', tx: 9, ty: 9, dir: 'up', closedMsg: '', requires: 'home' },
      { x: 51, y: 46, w: 1, h: 1, to: 'HOUSE_CALLOWAY', tx: 8, ty: 9, dir: 'up', closedMsg: '', requires: 'home' },
      { x: 33, y: 55, w: 1, h: 1, to: 'HOUSE_RUTH', tx: 8, ty: 9, dir: 'up', closedMsg: '', requires: 'home' },
      // MINE_ENTRANCE_PORTAL — stub for the future underground dungeon.
      { x: 54, y: 6, w: 1, h: 1, to: 'COAL_MINE', tx: 0, ty: 0, dir: 'up',
        closedMsg: 'Planks are nailed across the mine adit. Gideon says the town could pay to reopen it someday (the Restoration Ledger, at the Historical Society).',
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

export function shell(W: number, H: number, floor: number, doorX: number): Builder {
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
  b.setG(18, 12, T.STAIRS); // up to Dr. Okafor's room
  return wrap(b, 'DINER_INT', 'Whistle-Stop Diner', {
    indoor: true, battleColors: [P.AMBER, P.RUST],
    portals: [
      { x: 10, y: 13, w: 1, h: 1, to: 'PINE_HOLLOW_TOWN', tx: 17, ty: 35, dir: 'down', closedMsg: '' },
      { x: 18, y: 12, w: 1, h: 1, to: 'DINER_ROOM', tx: 2, ty: 6, dir: 'right', closedMsg: '', requires: 'home' },
    ],
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
  b.setG(18, 11, T.STAIRS); // up to Toby's loft
  return wrap(b, 'STORE_INT', 'General Store & Outfitter', {
    indoor: true, battleColors: [P.AMBER, P.RUST],
    portals: [
      { x: 10, y: 13, w: 1, h: 1, to: 'PINE_HOLLOW_TOWN', tx: 53, ty: 35, dir: 'down', closedMsg: '' },
      { x: 18, y: 11, w: 1, h: 1, to: 'STORE_LOFT', tx: 2, ty: 6, dir: 'right', closedMsg: '', requires: 'home' },
    ],
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
  b.setO(10, 15, O.LEDGER); // the Town Restoration Ledger, open on a lectern
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
