/** World renderer: ground autotiles → y-sorted objects/actors → particles → lighting. */
import { eventNow, eventSpot, eventLook } from './calendar';
import { CANDLE_TREES, candleSeason } from '../data/calendar';
import { MG, MO } from '../graphics/mineSprites';
import { isMineMap } from '../data/mine';
import { mineDrawables, drawMineOverlay, drawMineHud, drawLampHouseTint, cribWired } from './mineRender';
import { petFrame, heartIcon } from '../graphics/petSprites';
import { settings } from './settings';
import { decoSprite, decoLight, henDrawables, eaveLights, eaveLightSources } from './homestead';
import { FLAT_DECOS } from '../data/homestead';
import { HS } from '../graphics/homeSprites';
import { rescueTracks } from './heartScenes';
import { visitorHere, visitorPos } from './bonds';
import type { Game } from './game';
import type { MapRuntime } from './world';
import { GROUND, OVER, OBJ, STRUCT, CROP, ICON, MISC } from '../graphics/sprites';
import type { Canv } from '../graphics/canvas';
import { Pen } from '../graphics/canvas';
import { playerFrame, handPivot, personFrame } from '../graphics/playerSprite';
import { cryptidFrame } from '../graphics/cryptidSprites';
import { CRYPTIDS } from '../data/cryptids';
import { TOWN_SQUARE, FESTIVAL_SPOTS, FESTIVAL_STALLS } from '../data/town';
import { carvingSprite } from '../ui/intro';
import type { Light } from '../graphics/lighting';
import { hex, P } from '../graphics/palette';
import { O, T, objProps } from '../data/tiles';
import { CROP_BY_ID } from '../data/items';
import type { ToolKind } from '../data/items';
import { hash2, valueNoise } from '../util';
import { cryptidSilhouette } from '../graphics/cryptidSprites';
import type { Dir } from '../util';
import { deerKey } from '../graphics/outdoorSprites';
import { STOPS } from '../data/handcar';
import { NPCS_BY_ID } from '../data/npcs';
import { DECOR, PROP, DECAL } from '../graphics/decorSprites';
import { TOWN_ART } from '../graphics/townSprites';
import type { MapId, Structure } from '../data/mapgen';
import { drawAmbient, drawFireflies } from '../graphics/ambient';
import type { View } from '../graphics/ambient';
import { SEASONS } from './clock';
import { makeCanvas, recolor } from '../graphics/canvas';
import { rgbOf } from '../graphics/palette';

interface Drawable {
  y: number;
  fn: () => void;
}

const NEIGH: Array<[string, number, number]> = [['N', 0, -1], ['S', 0, 1], ['W', -1, 0], ['E', 1, 0]];

function pick(arr: Canv[], h: number): Canv {
  return arr[Math.floor(h * arr.length) % arr.length];
}

function drawGround(g: CanvasRenderingContext2D, m: MapRuntime, x: number, y: number, sx: number, sy: number, time: number): void {
  const t = m.ground(x, y);
  const h = hash2(x, y, 1);
  const h2 = hash2(x, y, 2);
  switch (t) {
    case T.GRASS:
      g.drawImage(h2 < 0.06 ? pick(GROUND.flowers, h) : pick(GROUND.grass, h), sx, sy);
      return;
    case T.FOREST:
      g.drawImage(pick(GROUND.forest, h), sx, sy);
      return;
    case T.PATH: {
      g.drawImage(pick(GROUND.path, h), sx, sy);
      for (const [side, dx, dy] of NEIGH) {
        const n = m.ground(x + dx, y + dy);
        if (n === T.GRASS || n === T.FOREST) g.drawImage(OVER[`path${side}`], sx, sy);
      }
      return;
    }
    case T.SOIL: {
      const pi = m.plotIndex(x, y);
      const bog = pi >= 0 && m.def.plots[pi].bog;
      const st = pi >= 0 ? m.plots[pi] : null;
      let key = bog ? 'bog' : 'soil';
      if (st?.tilled) key = bog ? (st.watered ? 'bogWet' : 'bogTilled') : st.watered ? 'tilledWet' : 'tilled';
      g.drawImage(GROUND[key][0], sx, sy);
      return;
    }
    case T.WATER: {
      const f = Math.floor(time * 1.4 + h * 2) % 2;
      g.drawImage(GROUND.water[f], sx, sy);
      for (const [side, dx, dy] of NEIGH) {
        if (!m.inBounds(x + dx, y + dy)) continue;
        const n = m.ground(x + dx, y + dy);
        if (n !== T.WATER && n !== T.BRIDGE && n !== T.SHALLOW && n !== T.SPRING && n !== T.BOARDWALK) g.drawImage(OVER[`bank${side}`], sx, sy);
      }
      return;
    }
    case T.BOG: g.drawImage(pick(GROUND.bog, h), sx, sy); return;
    case T.SHALLOW:
    case T.SPRING: {
      const arr = t === T.SHALLOW ? GROUND.shallow : GROUND.spring;
      g.drawImage(arr[Math.floor(time * 1.2 + h * 2) % 2], sx, sy);
      for (const [side, dx, dy] of NEIGH) {
        const n = m.ground(x + dx, y + dy);
        if (m.inBounds(x + dx, y + dy) && n !== T.SHALLOW && n !== T.SPRING && n !== T.WATER && n !== T.BOARDWALK) g.drawImage(OVER[`shallow${side}`], sx, sy);
      }
      return;
    }
    case T.BOARDWALK: g.drawImage(GROUND.boardwalk[0], sx, sy); return;
    case T.HEMLOCK: g.drawImage(pick(GROUND.hemlock, h), sx, sy); return;
    case T.ROCKY: g.drawImage(pick(GROUND.rocky, h), sx, sy); return;
    case T.SLOPE: g.drawImage(pick(GROUND.slope, h), sx, sy); return;
    case T.CLIFF:
      g.drawImage(pick(GROUND.cliff, h), sx, sy);
      if (m.ground(x, y - 1) !== T.CLIFF) g.drawImage(OVER.cliffLip, sx, sy);
      if (m.ground(x, y + 1) !== T.CLIFF) g.drawImage(OVER.cliffEdgeS, sx, sy);
      return;
    case T.RUIN_FLOOR: g.drawImage(pick(GROUND.ruin, h), sx, sy); return;
    case T.CLOVER: g.drawImage(pick(GROUND.clover, h), sx, sy); return;
    case T.PLAZA: g.drawImage(pick(GROUND.plaza, h), sx, sy); return;
    case T.PLATFORM: g.drawImage(GROUND.platform[0], sx, sy); return;
    case T.RAIL: g.drawImage(GROUND.rail[0], sx, sy); return;
    case T.CHECKER: g.drawImage(GROUND.checker[0], sx, sy); return;
    case T.MARBLE: g.drawImage(pick(GROUND.marble, h), sx, sy); return;
    case T.STAIRS: g.drawImage(GROUND.stairs[0], sx, sy); return;
    case T.BRIDGE:
      g.drawImage(GROUND.water[0], sx, sy);
      g.drawImage(GROUND.bridge[0], sx, sy);
      if (m.ground(x, y - 1) !== T.BRIDGE) g.drawImage(OVER.railN, sx, sy);
      if (m.ground(x, y + 1) !== T.BRIDGE) g.drawImage(OVER.railS, sx, sy);
      return;
    case T.PORCH: g.drawImage(GROUND.porch[0], sx, sy); return;
    case T.FLOOR: g.drawImage(pick(GROUND.floor, h), sx, sy); return;
    case T.WALL_TOP: g.drawImage(GROUND.wallTop[0], sx, sy); return;
    case T.WALL_FACE: g.drawImage(GROUND.wallFace[0], sx, sy); return;
    case T.WALL_BASE: g.drawImage(GROUND.wallBase[0], sx, sy); return;
    case T.WALL_SIDE: g.drawImage(GROUND.wallSide[0], sx, sy); return;
    case T.RUG:
      g.drawImage(GROUND.rug[0], sx, sy);
      for (const [side, dx, dy] of NEIGH) if (m.ground(x + dx, y + dy) !== T.RUG) g.drawImage(OVER[`rug${side}`], sx, sy);
      return;
    case T.DOORMAT: g.drawImage(GROUND.doormat[0], sx, sy); return;
    case T.DOOR: g.drawImage(GROUND.door[0], sx, sy); return;
    case T.HEARTH: g.drawImage(GROUND.hearth[0], sx, sy); return;
    // ---- The Deep Seam ----
    case T.COAL_FLOOR:
      g.drawImage(pick(MG.floor, h), sx, sy);
      // Seep water pools on the floor around the drips.
      if (h2 < 0.5 && [[0, -1], [1, 0], [-1, 0], [0, 1], [0, -2]].some(([dx, dy]) => m.obj(x + dx, y + dy) === O.SEEP)) g.drawImage(pick(MG.puddle, h2 * 2), sx, sy);
      return;
    case T.COAL_RIB: {
      const below = m.ground(x, y + 1);
      const face = below === T.COAL_FLOOR || below === T.MINE_RAIL || below === T.ALCOVE;
      g.drawImage(face ? pick(MG.ribFace, h) : pick(MG.ribTop, h), sx, sy);
      return;
    }
    case T.MINE_RAIL: g.drawImage(m.ground(x - 1, y) === T.MINE_RAIL || m.ground(x + 1, y) === T.MINE_RAIL ? MG.railH[0] : MG.railV[0], sx, sy); return;
    case T.ALCOVE: g.drawImage(MG.alcove[0], sx, sy); return;
    case T.GOB: g.drawImage(pick(MG.gob, h), sx, sy); return;
    case T.LAMP_FLOOR: g.drawImage(pick(MG.lampFloor, h), sx, sy); return;
    case T.CRAWL: g.drawImage(m.ground(x - 1, y) === T.CRAWL || m.ground(x + 1, y) === T.CRAWL ? MG.crawlH[0] : MG.crawlV[0], sx, sy); return;
    default: g.drawImage(GROUND.void[0], sx, sy);
  }
}

function fenceMask(m: MapRuntime, x: number, y: number): number {
  const f = (dx: number, dy: number) => m.obj(x + dx, y + dy) === O.FENCE;
  return (f(0, -1) ? 1 : 0) | (f(1, 0) ? 2 : 0) | (f(0, 1) ? 4 : 0) | (f(-1, 0) ? 8 : 0);
}

/** Pick the sprite for an object tile, honouring variants & animation frames. */
/** Progress-dependent visuals, set once per frame by renderWorld. */
const flags = { grant: false, gift: false, station: false, mine: false, neon: false };

/** Set each frame: is this map's handcar stop repaired? (objSprite has no game handle.) */
let stopFixed = false;
/** Set each frame: 0 Spring, 1 Summer, 2 Fall, 3 Winter (outdoors only for seasonal looks). */
let season = 0;
/** The game being drawn (homestead pieces read the clock and flags). */
let homeGame: Game | null = null;
/** The game being drawn (for the few object sprites that depend on progress). */
let mineGame: Game | null = null;
/** Set each frame: someone is calling on the porch radio tonight. */
let radioCalling = false;

/** Things that wear a cap of snow in winter. */
const SNOWCAP: ReadonlySet<number> = new Set<number>([O.PINE, O.OAK, O.ROCK, O.BOULDER, O.STUMP, O.LOG, O.HEMLOCK_TREE, O.RED_SPRUCE, O.DEAD_TREE,
  O.WILLOW, O.APPLE_TREE, O.RHODODENDRON, O.BRUSH, O.FENCE, O.STONE_WALL, O.SLAG, O.HOLLOW_LOG, O.LUMBER, O.MAILBOX, O.WOODPILE, O.SHIP_BIN,
  O.STOP_SIGN, O.HANDCAR, O.CROSSBUCK, O.TRAILHEAD, O.HEDGE, O.BENCH, O.TRASH_CAN, O.NEWS_BOX, O.MILK_CANS, O.FLOWERBED, O.FOUNTAIN, O.STATUE, O.WATER_TOWER, O.TIPPLE, O.MINE_CART, O.LAMP_HOUSE, O.GUMBALL]);
const snowCache = new WeakMap<Canv, Canv>();
/** A copy of a sprite with snow settled on every upward-facing edge. */
function snowy(src: Canv): Canv {
  const hit = snowCache.get(src);
  if (hit) return hit;
  const { c, g } = makeCanvas(src.width, src.height);
  g.drawImage(src, 0, 0);
  const img = g.getImageData(0, 0, c.width, c.height);
  const d = img.data, W = c.width;
  const [fr, fg, fb] = rgbOf(P.FOG), [mr, mg, mb] = rgbOf(P.MOON);
  const solid = (x: number, y: number) => y >= 0 && d[(y * W + x) * 4 + 3] > 0;
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < c.height; y++) {
      if (!solid(x, y) || solid(x, y - 1)) continue;
      // Settle 3px of snow just under the dark outline of every upward-facing surface.
      for (let k = 1; k < 4; k++) {
        const yy = y + k;
        if (yy >= c.height || !solid(x, yy)) break;
        const o = (yy * W + x) * 4;
        const shade = k === 3 || (x + y) % 5 === 0;
        d[o] = shade ? mr : fr; d[o + 1] = shade ? mg : fg; d[o + 2] = shade ? mb : fb;
      }
    }
  }
  g.putImageData(img, 0, 0);
  snowCache.set(src, c);
  return c;
}

/** Broadleaf things that turn in the fall (pines, hemlock and spruce stay green). */
const AUTUMN: ReadonlySet<number> = new Set<number>([O.OAK, O.BRUSH, O.WILLOW, O.APPLE_TREE, O.BRIAR]);
const autumnCache = [new WeakMap<Canv, Canv>(), new WeakMap<Canv, Canv>()];
/** Fall colours: some trees go amber-gold, others rust-red. */
function autumn(src: Canv, h: number): Canv {
  const k = h < 0.5 ? 0 : 1;
  const hit = autumnCache[k].get(src);
  if (hit) return hit;
  const c = recolor(src, k === 0
    ? [[P.FOREST, P.RUST], [P.MOSS, P.AMBER], [P.FERN, P.LANTERN]]
    : [[P.FOREST, P.CRAN], [P.MOSS, P.RUST], [P.FERN, P.AMBER]]);
  autumnCache[k].set(src, c);
  return c;
}

/** Trail-blaze colours per region (painted on trees beside the trails). */
const BLAZE: Partial<Record<string, number>> = {
  PINE_TRAIL_AND_ORCHARD: P.LANTERN, OLD_GROWTH_AND_SAWMILL: P.FOG, RADIO_RIDGE_AND_CROSSROADS: P.RED, CABIN_YARD: P.MIST,
};
const BLAZE_TREES: ReadonlySet<number> = new Set<number>([O.PINE, O.OAK, O.HEMLOCK_TREE, O.RED_SPRUCE]);

function objSprite(m: MapRuntime, o: number, x: number, y: number, time: number, night: boolean, rustling: boolean): Canv | null {
  const h = hash2(x, y, 3);
  if (o >= O.FIRE_PIT && o <= O.PET_BED && homeGame) return decoSprite(homeGame, o, x, y, time, night, season);
  if (o === O.PET_HOUSE) return HS[`pethouse_${homeGame?.progress.pet?.kind ?? 'pup'}`]?.[0] ?? null;
  switch (o) {
    case O.FOUNTAIN: return OBJ.fountain[Math.floor(time * 3) % 2];
    case O.BOARD: return OBJ.board[0];
    case O.BENCH: return OBJ.bench[0];
    case O.FLOWERBED: return OBJ.flowerbed[0];
    case O.COUNTER: return OBJ.counter[0];
    case O.STOOL: return OBJ.stool[0];
    case O.GRILL: return OBJ.grill[0];
    case O.JUKEBOX: return OBJ.jukebox[Math.floor(time * 2) % 2];
    case O.SHELF: return pick(OBJ.shelf, h);
    case O.ANVIL: return OBJ.anvil[0];
    case O.FORGE: return OBJ.forge[Math.floor(time * 5) % 2];
    case O.CASE: return OBJ.case[0];
    case O.KIOSK: return OBJ.kiosk[flags.gift ? 1 : 0];
    case O.MAP_TABLE: return OBJ.maptable[0];
    case O.RAILCAR: return OBJ.railcar[flags.grant ? 1 : 0];
    case O.TICKET_BOOTH: return OBJ.booth[0];
    case O.SIGNAL_LANTERN: return OBJ.signal[flags.station ? 1 : Math.floor(time * 7 + h * 5) % 5 === 0 ? 1 : 0];
    case O.REGISTER: return OBJ.register[0];
    case O.POSTER: return OBJ.poster[0];
    case O.HEDGE: return OBJ.hedge[0];
    case O.BOOTH_SEAT: return OBJ.boothseat[0];
    case O.PINE: return pick(OBJ.pine, h);
    case O.OAK: return pick(OBJ.oak, h);
    case O.BRUSH: return pick(OBJ.brush, h);
    case O.ROCK: return pick(OBJ.rock, h);
    case O.STUMP: return OBJ.stump[0];
    case O.LOG: return OBJ.log[0];
    case O.BOULDER: return OBJ.boulder[0];
    case O.FENCE: return OBJ.fence[fenceMask(m, x, y)];
    case O.TALLGRASS: return OBJ.tallgrass[rustling ? Math.floor(time * 16) % 2 : Math.floor(time * 1.2 + h * 3) % 2];
    case O.FERN: return OBJ.fern[0];
    case O.FLOWERS: return OBJ.flowers[0];
    case O.BRIAR: return OBJ.briar[0];
    case O.REEDS: return OBJ.reeds[Math.floor(time * 0.9 + h * 4) % 2];
    case O.MUSHROOMS: return OBJ.mushrooms[0];
    case O.SIGN: return OBJ.sign[0];
    case O.MAILBOX: return OBJ.mailbox[0];
    case O.WORKBENCH: return OBJ.workbench[0];
    case O.SHIP_BIN: return OBJ.shipbin[0];
    case O.RAIN_BARREL: return OBJ.barrel[0];
    case O.LAMP: return OBJ.lamp[0];
    case O.BED: return OBJ.bed[0];
    case O.DESK: return OBJ.desk[0];
    case O.DRESSER: return OBJ.dresser[0];
    case O.FIREPLACE: return OBJ.fireplace[Math.floor(time * 6) % 2];
    case O.PEDESTAL: return OBJ.pedestal[0];
    case O.TABLE: return OBJ.table[0];
    case O.CHAIR: return OBJ.chair[0];
    case O.BOOKSHELF: return OBJ.bookshelf[0];
    case O.STOVE: return OBJ.stove[0];
    case O.PLANT: return OBJ.plant[0];
    case O.CRATE: return OBJ.crate[0];
    case O.WOODPILE: return OBJ.woodpile[0];
    case O.WINDOW: return OBJ.window[night ? 1 : 0];
    case O.LILYPAD: return OBJ.lilypad[h < 0.2 ? 1 : 0];
    case O.APPLE_TREE: return pick(OBJ.apple, h);
    case O.STONE_WALL: return OBJ.stonewall[0];
    case O.WILLOW: return pick(OBJ.willow, h);
    case O.HEMLOCK_TREE: return pick(OBJ.hemlock, h);
    case O.HOLLOW_LOG: return OBJ.hollowlog[0];
    case O.RUIN_WALL: return pick(OBJ.ruinwall, h);
    case O.LUMBER: return OBJ.lumber[0];
    case O.SAW_BLADE: return OBJ.sawblade[0];
    case O.SLAG: return OBJ.slag[0];
    case O.DEAD_TREE: return pick(OBJ.deadtree, h);
    case O.CRAN_BUSH: return OBJ.cranbush[0];
    case O.RED_SPRUCE: return pick(OBJ.spruce, h);
    case O.SKUNK_CABBAGE: return OBJ.skunkcabbage[0];
    case O.SNARE: return OBJ.snare[m.snares.get(m.idx(x, y)) ? 1 : 0];
    case O.HANDCAR: return OBJ.handcar[stopFixed ? 0 : 1];
    case O.STOP_SIGN: return OBJ.stopsign[0];
    case O.FORGET_ME_NOT: return DECOR.forgetmenot[season];
    case O.THISTLE: return DECOR.thistle[season];
    case O.RHODODENDRON: return DECOR.rhododendron[season];
    case O.TRILLIUM: return DECOR.trillium[season];
    case O.MAYAPPLE: return DECOR.mayapple[season];
    case O.INDIAN_PIPE: return DECOR.indianpipe[season];
    case O.PITCHER_PLANT: return DECOR.pitcher[season];
    case O.CHICORY: return DECOR.chicory[season];
    case O.QUEEN_ANNE: return DECOR.queenanne[season];
    case O.RAMP_PATCH: return DECOR.ramps[season];
    case O.ASTER: return DECOR.aster[season];
    case O.CROSSBUCK: return PROP.crossbuck[0];
    case O.MILEPOST: return PROP.milepost[0];
    case O.WHISTLE_POST: return PROP.whistle[0];
    case O.TRAILHEAD: return PROP.trailhead[0];
    case O.ROCKER: return PROP.rocker[Math.floor(time * 0.9 + h) % 4 === 0 ? 1 : 0];
    case O.CHIMES: return PROP.chimes[Math.floor(time * 2 + h) % 2];
    case O.CLOTHESLINE: return PROP.clothesline[Math.floor(time * 1.1) % 2];
    case O.CREEK_STONE: return PROP.creekstones[0];
    case O.TRASH_CAN: return PROP.trashcan[0];
    case O.BIKE: return PROP.bike[0];
    case O.CAT: { const t = (time * 0.8 + h * 9) % 6; return PROP.cat[t > 5.4 ? 2 : Math.floor(time * 0.9) % 2]; }
    case O.NEWS_BOX: return PROP.newsbox[0];
    case O.FLOWER_POT: return pick(PROP.flowerpot, h);
    case O.MILK_CANS: return PROP.milkcans[0];
    case O.STATUE: return PROP.statue[0];
    case O.FLAGPOLE: return PROP.flagpole[Math.floor(time * 2.5) % 2];
    case O.GUMBALL: return PROP.gumball[0];
    case O.WATER_TOWER: return PROP.watertower[0];
    case O.TIPPLE: return PROP.tipple[0];
    case O.MINE_CART: return PROP.minecart[0];
    case O.LAMP_HOUSE: return PROP.lamphouse[night && flags.mine ? 1 : 0];
    case O.GAZEBO: return PROP.gazebo[night ? 1 : 0];
    case O.LEDGER: return PROP.ledger[0];
    case O.BARN_STAR: return PROP.barnstar[0];
    case O.DOG: return PROP.dog[Math.floor(time * 0.7 + h * 3) % 2];
    case O.WALL_FRAME: return (PROP[`frame_${m.def.meta?.get(m.idx(x, y)) ?? 'photo'}`] ?? PROP.frame_photo)[0];
    case O.MODEL_TRAIN: return PROP.modeltrain[Math.floor(time * 3) % 8];
    case O.RADIO_RIG: return PROP.radiorig[Math.floor(time * 2 + h) % 2];
    case O.OLD_TRAP: return PROP.oldtrap[0];
    case O.PORCH_RADIO: return PROP.porchradio[radioCalling && Math.floor(time * 2) % 2 === 0 ? 1 : 0];
    case O.TOTEM: return OBJ.totem[0];
    case O.ROD: return OBJ.rod[Math.floor(time * 3) % 2];
    case O.CHIME: return OBJ.chime[Math.floor(time * 1.5 + h) % 2];
    case O.PYLON: return OBJ.pylon[Math.floor(time * 6) % 2];
    case O.ROD_BASE: return OBJ.rodbase[0];
    // ---- The Deep Seam ----
    case O.CALCIFIED: return MO.calcified[Math.floor(time * 1.5 + h * 2) % 2];
    case O.HEMLOCK_PROP: return MO.hemlock[0];
    case O.MINE_POST: return MO.post[0];
    case O.RUBBLE: return pick(MO.rubble, h);
    case O.BUCKET: return MO.bucket[0];
    case O.CHALK: return MO.chalk[0];
    case O.LEDGER_PAGE: return MO.page[0];
    case O.SEEP: return MO.seep[Math.floor(time * 2 + h * 3) % 2];
    case O.CARBIDE: return MO.carbide[0];
    case O.CRIB: return MO.crib[mineGame && cribWired(mineGame, x, y) ? 1 : 0];
    case O.LIFT: return MO.lift[0];
    case O.INOUT_BOARD: return MO.board[0];
    case O.LOCKER: return MO.locker[0];
    case O.TIMBER_RACK: return MO.rack[0];
    case O.ORE_CART: return MO.cart[0];
    case O.BRATTICE: return MO.brattice[Math.floor(time * 1.2) % 2];
    case O.FIRST_AID: return MO.firstAid[0];
    case O.CUPBOARD: return MO.cupboard[0];
    case O.TORCH: return MO.torch[Math.floor(time * 6 + h * 4) % 2];
    case O.COAL_SEAM: return MO.seam[Math.floor(time * 1.3 + h * 5) % 2];
    case O.RIDE_CART: return MO.rideCart[0];
    case O.CANARY_CAGE: return MO.canaryCage[Math.floor(time * 2) % 2];
    case O.GLOW_FUNGUS: return MO.fungus[Math.floor(time * 0.8 + h * 3) % 2];
    default: return null;
  }
}

/** Flat decals drawn with the ground layer (never occlude actors). */
const SNOW_GROUND: ReadonlySet<number> = new Set<number>([T.GRASS, T.FOREST, T.CLOVER, T.HEMLOCK, T.ROCKY, T.SLOPE, T.PATH, T.BOG, T.RUIN_FLOOR, T.PLAZA, T.SOIL]);
/** How deep the winter snow lies on a tile (0..1): open ground deepest, trails and gardens trampled. */
function snowDepth(m: MapRuntime, x: number, y: number): number {
  const gt = m.ground(x, y);
  if (!SNOW_GROUND.has(gt)) return 0;
  if (gt === T.PATH || gt === T.PLAZA || gt === T.SOIL) return 0.2;
  return valueNoise(x / 5, y / 5, 61) + (gt === T.FOREST || gt === T.HEMLOCK ? -0.05 : 0.1);
}
const LITTER_GROUND: ReadonlySet<number> = new Set<number>([T.GRASS, T.FOREST, T.CLOVER, T.HEMLOCK, T.PATH, T.PLAZA]);

/** Barn-quilt height on the shed's gable (px from the sprite top). */
const QUILT_Y = 14;

const FLAT: ReadonlySet<number> = new Set<number>([O.WINDOW, O.LILYPAD, O.POSTER, O.CREEK_STONE, O.WALL_FRAME, ...FLAT_DECOS]);

const SWING: Record<Dir, Array<[number, number]>> = {
  right: [[-120, 1], [-55, 1], [25, 1]],
  left: [[-60, 1], [-125, 1], [155, 1]],
  down: [[-90, 1], [-90, 0.45], [90, 1]],
  up: [[-90, 0.45], [-90, 0.85], [-90, 1.25]],
};

function drawTool(g: CanvasRenderingContext2D, tool: ToolKind, dir: Dir, f: number, x: number, y: number): void {
  const pen = new Pen(g);
  if (tool === 'can') {
    const left = dir === 'left';
    const tilt = f === 2;
    const img = tilt ? (left ? MISC.canTiltL : MISC.canTilt) : left ? MISC.canUpL : MISC.canUp;
    const lift = f === 1 ? -1 : 0;
    if (dir === 'down') g.drawImage(img, x - 6, y - 4 + lift);
    else if (dir === 'up') g.drawImage(img, x - 6, y - 9 + lift);
    else g.drawImage(img, left ? x - 10 : x - 2, y - 7 + lift);
    if (tilt) {
      const sx = dir === 'left' ? x - 11 : dir === 'right' ? x + 9 : x + 5;
      for (let k = 0; k < 3; k++) pen.px(sx + (dir === 'left' ? -k : k) * 0.5, y + 1 + k * 2, k % 2 ? P.MOON : P.MIST);
    }
    return;
  }
  const [deg, lf] = SWING[dir][f];
  const len = (tool === 'hoe' ? 10 : 11) * lf;
  const rad = (deg * Math.PI) / 180;
  const cx = Math.cos(rad), cy = Math.sin(rad);
  const ex = x + cx * len, ey = y + cy * len;
  if (tool === 'hoe') {
    pen.line(x, y, ex, ey, P.RUST);
    pen.line(x + 1, y, ex + 1, ey, P.AMBER);
    pen.rect(ex - 2, ey - 2, 4, 4, P.SHADOW);
    pen.rect(ex - 1, ey - 1, 3, 2, P.MIST);
    pen.px(ex - 1, ey - 1, P.FOG);
  } else {
    const hx = x + cx * 3, hy = y + cy * 3;
    pen.line(x, y, hx, hy, P.RUST);
    pen.line(hx, hy, ex, ey, P.FOG);
    pen.line(hx + 1, hy + 1, ex + 1, ey + 1, P.MIST);
    pen.px(ex, ey, P.MOON);
  }
  if (f === 2 && dir !== 'up') {
    // swing smear arc
    const [d0] = SWING[dir][1];
    const a0 = (d0 * Math.PI) / 180, a1 = rad;
    g.globalAlpha = 0.55;
    for (let k = 0; k <= 8; k++) {
      const a = a0 + ((a1 - a0) * k) / 8;
      pen.px(x + Math.cos(a) * (len + 1), y + Math.sin(a) * (len + 1), P.FOG);
    }
    g.globalAlpha = 1;
  }
}

export function renderWorld(game: Game, g: CanvasRenderingContext2D): void {
  const m = game.cur;
  mineGame = game;
  stopFixed = game.stopRepaired(m.id);
  const railBits = STOPS.get(m.id) ?? null;
  homeGame = game;
  season = m.def.indoor ? 1 : Math.max(0, SEASONS.indexOf(game.clock.season as typeof SEASONS[number]));
  const winter = season === 3, fall = season === 2;
  const wNow = game.weatherNow();
  const rainy = (w: string) => w === 'RAIN' || w === 'STORM';
  const wet = !m.def.indoor && !winter && (rainy(wNow) || (rainy(game.dayWeather.morning) && game.clock.minutes >= 720));
  const blaze = BLAZE[m.id];
  radioCalling = m.id === 'CABIN_YARD' && game.clock.phase() !== 'day' && game.progress.radioDay !== game.clock.day;
  const cam = game.cam;
  // Screen shake (thunder, a train whistle), if the player hasn't turned it off.
  const sk = settings().shake && game.shakeT > game.time ? Math.min(1, game.shakeT - game.time) * 2 : 0;
  const cx = cam.ix + Math.round(Math.sin(game.time * 61) * sk), cy = cam.iy + Math.round(Math.cos(game.time * 53) * sk);
  const time = game.time;
  const phase = game.clock.phase();
  const night = phase === 'night' || phase === 'witching' || (phase === 'dusk' && game.clock.minutes > 1140);
  const x0 = Math.max(0, Math.floor(cx / 16) - 1), x1 = Math.min(m.w - 1, Math.floor((cx + game.w) / 16) + 1);
  const y0 = Math.max(0, Math.floor(cy / 16) - 1), y1 = Math.min(m.h - 1, Math.floor((cy + game.h) / 16) + 3);
  const lights: Light[] = [];
  const shadowsDrawn = new Set<string>();

  // ---- Ground + flat decals ----
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const sx = x * 16 - cx, sy = y * 16 - cy;
      drawGround(g, m, x, y, sx, sy, time);
      if (!m.def.indoor) {
        const gt = m.ground(x, y);
        if (winter && SNOW_GROUND.has(gt)) {
          // Deep snow in the open, drifts at its edges, a dusting on trails.
          const depth = snowDepth(m, x, y);
          const hs = hash2(x, y, 31);
          if (depth > 0.55) g.drawImage(pick(DECAL.snowFull, hs), sx, sy);
          else if (depth > 0.38) {
            let side = 0, best = -1;
            NEIGH.forEach(([, ddx, ddy], k) => { const dd = snowDepth(m, x + ddx, y + ddy); if (dd > best) { best = dd; side = [0, 2, 3, 1][k]; } });
            g.drawImage(pick(DECAL[`snowDrift${side}`], hs), sx, sy);
            g.drawImage(pick(DECAL.snowLight, hs), sx, sy);
          } else g.drawImage(pick(DECAL.snowLight, hs), sx, sy);
        }
        else if (fall && LITTER_GROUND.has(gt) && hash2(x, y, 9) < 0.6) g.drawImage(pick(DECAL.leaves, hash2(x, y, 10)), sx, sy);
        if (wet && gt === T.PATH && hash2(x, y, 13) < 0.13) g.drawImage(pick(DECAL.puddle, hash2(x, y, 14)), sx, sy);
      }
      // Bits of the old C&O spur peeking through the woods (drawn under trees and objects).
      if (railBits) {
        const ri = m.idx(x, y);
        const dir = railBits.route.get(ri);
        if (dir !== undefined) {
          const lk = railBits.links.get(ri) ?? 0;
          const vert = (lk & 5) !== 0, horiz = (lk & 10) !== 0;
          const nBits = (lk & 1) + ((lk >> 1) & 1) + ((lk >> 2) & 1) + ((lk >> 3) & 1);
          const straightV = (x + y) % 2 ? MISC.oldRailV0 : MISC.oldRailV1, straightH = (x + y) % 2 ? MISC.oldRailH0 : MISC.oldRailH1;
          if (railBits.trestle.has(ri)) g.drawImage(vert && !horiz ? MISC.trestleV : MISC.trestleH, sx, sy);
          else if (nBits === 2 && vert && horiz) g.drawImage(MISC[`oldRail${lk & 1 ? 'N' : 'S'}${lk & 2 ? 'E' : 'W'}`], sx, sy); // curve
          else if (nBits >= 3) { g.drawImage(straightH, sx, sy); g.drawImage(straightV, sx, sy); } // junction / crossing
          else g.drawImage(vert || (!horiz && dir === 1) ? straightV : straightH, sx, sy);
        }
      }
      const o = m.obj(x, y);
      if (FLAT.has(o)) {
        const img = objSprite(m, o, x, y, time, night, false);
        if (img) g.drawImage(img, sx, sy);
      }
    }
  }

  // ---- Cryptid clues on the ground: prints and ripples ----
  drawSignsGround(game, g, cx, cy, time);

  // ---- Facing-tile cursor (when holding a tool or seed) ----
  const p = game.player;
  const st = game.selected;
  if (st && !p.moving && !game.overlays.length) {
    const [fx, fy] = p.facing();
    if (m.inBounds(fx, fy)) {
      const sx = fx * 16 - cx, sy = fy * 16 - cy;
      const blink = Math.floor(time * 3) % 2 === 0;
      g.fillStyle = hex(blink ? P.FOG : P.LANTERN);
      g.globalAlpha = 0.85;
      for (const [ox, oy, w, hh] of [[0, 0, 3, 1], [0, 0, 1, 3], [13, 0, 3, 1], [15, 0, 1, 3], [0, 15, 3, 1], [0, 13, 1, 3], [13, 15, 3, 1], [15, 13, 1, 3]]) {
        g.fillRect(sx + ox, sy + oy, w, hh);
      }
      g.globalAlpha = 1;
    }
  }

  flags.grant = game.progress.has('grant');
  flags.station = game.progress.flags.has('proj_station');
  flags.mine = game.progress.flags.has('mine_open');
  flags.neon = game.progress.flags.has('proj_neon');
  flags.gift = game.progress.has('giftshop');

  // ---- Quest tracks / pages (flat decals) ----
  for (const { spec, tracks } of game.progress.tracksOn(m.id)) {
    const found = game.progress.quests[spec.quest].found;
    tracks.forEach((t, k) => {
      if (t.x < x0 || t.x > x1 || t.y < y0 || t.y > y1) return;
      if ((t.kind === 'page' || t.kind === 'book') && found.includes(k)) return;
      const img = t.kind === 'paw' ? MISC.paw : t.kind === 'boot' ? MISC.boot : t.kind === 'page' ? MISC.page : MISC.sketchbook;
      const bob = t.kind === 'page' || t.kind === 'book' ? Math.round(Math.sin(time * 3 + k)) : 0;
      g.drawImage(img, t.x * 16 - cx, t.y * 16 - cy + bob);
    });
  }

  // The kids' boot prints, heading off toward the sawmill.
  for (const t of rescueTracks(game)) {
    if (t.x < x0 || t.x > x1 || t.y < y0 || t.y > y1) continue;
    g.drawImage(MISC.boot, t.x * 16 - cx, t.y * 16 - cy);
  }

  // ---- Torn Vance journal pages (fluttering) ----
  for (const pg of game.journalPagesOn(m.id)) {
    if (pg.x < x0 || pg.x > x1 || pg.y < y0 || pg.y > y1) continue;
    const flutter = Math.round(Math.sin(time * 4 + pg.id) * 1.5);
    g.drawImage(MISC.page, pg.x * 16 - cx + flutter, pg.y * 16 - cy - 2 + Math.round(Math.sin(time * 2 + pg.id)));
    if (Math.floor(time * 2 + pg.id) % 3 === 0) { g.fillStyle = hex(P.LANTERN); g.fillRect(pg.x * 16 + 12 - cx, pg.y * 16 + 1 - cy, 1, 1); }
  }

  // ---- Y-sorted world ----
  const list: Drawable[] = [];
  const festival = m.id === 'PINE_HOLLOW_TOWN' && game.isFestival();
  for (let y = y0; y <= Math.min(m.h - 1, y1 + 2); y++) {
    for (let x = x0; x <= x1; x++) {
      const i = m.idx(x, y);
      const o = m.objects[i];
      if (o !== O.NONE && o !== O.BLOCK && !FLAT.has(o)) {
        const shakeUntil = m.shake.get(i) ?? 0;
        const shaking = shakeUntil > time;
        const base = objSprite(m, o, x, y, time, night, shaking);
        const img = base && winter && SNOWCAP.has(o) ? snowy(base) : base && fall && AUTUMN.has(o) ? autumn(base, hash2(x, y, 41)) : base;
        if (img) {
          const fw = objProps(o).fw ?? 1;
          let dx = x * 16 + Math.floor((fw * 16 - img.width) / 2) - cx;
          const dy = (y + 1) * 16 - img.height - cy - (o === O.CHIMES ? 11 : 0);
          if (shaking && o !== O.TALLGRASS) dx += Math.round(Math.sin(time * 70));
          let extra: Canv | null = null;
          let ex = 0, ey = 0, es = 16;
          if (o === O.CASE) {
            const cid = m.def.meta?.get(i);
            if (cid === 'sheepsquatch' && game.progress.flags.has('carving')) { extra = carvingSprite(); ex = dx + 2; ey = dy + 4; es = 12; }
            else if (cid && game.progress.donated.has(cid)) { extra = cryptidFrame(cid, 'normal', Math.floor(time * 2 + x) % 2); ex = dx + 2; ey = dy + 4; es = 12; }
          } else if (o === O.TABLE && m.id === 'CABIN_INTERIOR') {
            extra = MISC.vanceBook; ex = dx + 2; ey = dy - 1; es = 12;
          } else if (o === O.PEDESTAL) {
            const item = game.progress.displays[`${m.id}:${i}`];
            if (item) {
              const c = CRYPTIDS.find((cc) => cc.drop.id === item);
              extra = c ? cryptidFrame(c.id, 'normal', Math.floor(time * 2) % 2) : ICON[item] ?? null;
              ex = dx + 2; ey = dy + 1; es = 12;
            }
          }
          const ext = extra;
          // Paint blazes on trailside trees.
          const bl = blaze !== undefined && BLAZE_TREES.has(o) && hash2(x, y, 21) < 0.3
            && NEIGH.some(([, ddx, ddy]) => m.ground(x + ddx, y + ddy) === T.PATH) ? blaze : -1;
          const bx = x * 16 + 7 - cx, by = (y + 1) * 16 - 11 - cy;
          list.push({ y: (y + 1) * 16, fn: () => {
            g.drawImage(img, dx, dy);
            if (ext) g.drawImage(ext, ex, ey, es, es);
            if (bl >= 0) { g.fillStyle = hex(P.VOID); g.fillRect(bx - 1, by - 1, 4, 5); g.fillStyle = hex(bl); g.fillRect(bx, by, 2, 3); }
          } });
        }
        if (o === O.LAMP && night) lights.push({ x: x * 16 + 8 - cx, y: y * 16 - 10 - cy, r: 46, flicker: true });
        if (o === O.GAZEBO && night) for (const lx of [6, 24, 42]) lights.push({ x: x * 16 + lx - cx, y: (y + 1) * 16 - 30 - cy, r: 22, flicker: true });
        if (o === O.LAMP_HOUSE && night && flags.mine) lights.push({ x: x * 16 + 9 - cx, y: (y + 1) * 16 - 15 - cy, r: 13 });
        if (o === O.PYLON && night) lights.push({ x: x * 16 + 8 - cx, y: y * 16 - 12 - cy, r: 30, flicker: true });
        if (o === O.TOTEM || o === O.CHIME || o === O.ROD || o === O.PYLON) {
          const c = game.summonAt(o);
          if (c && !shadowsDrawn.has(c.id)) {
            shadowsDrawn.add(c.id);
            const sil = cryptidSilhouette(c.id, P.VOID, true);
            const flick = 0.55 + Math.sin(time * 5) * 0.25;
            list.push({ y: (y + 1) * 16 - 0.5, fn: () => { g.globalAlpha = flick; g.drawImage(sil, (x + 1) * 16 - 4 - cx, (y + 1) * 16 - 24 - cy); g.globalAlpha = 1; } });
          }
        }
        const dl = o >= O.FIRE_PIT && o <= O.PET_BED ? decoLight(game, o, x, y, cx, cy, night) : null;
        if (dl) lights.push(dl);
        if (o === O.FIREPLACE) lights.push({ x: x * 16 + 16 - cx, y: y * 16 + 4 - cy, r: 68, flicker: true });
      }
      const fi = m.forage.get(i);
      if (fi) {
        const icon = ICON[fi];
        const bob = Math.round(Math.sin(time * 3 + x + y) * 1);
        list.push({
          y: (y + 1) * 16 - 2,
          fn: () => {
            g.globalAlpha = 0.45;
            g.fillStyle = hex(P.SHADOW);
            g.fillRect(x * 16 + 4 - cx, y * 16 + 13 - cy, 8, 2);
            g.globalAlpha = 1;
            if (icon) g.drawImage(icon, x * 16 - cx, y * 16 - 2 + bob - cy);
          },
        });
      }
    }
  }
  // Crops
  m.def.plots.forEach((pd, i) => {
    if (pd.x < x0 || pd.x > x1 || pd.y < y0 || pd.y > y1) return;
    const plot = m.plots[i];
    if (!plot.crop) return;
    const crop = CROP_BY_ID[plot.crop];
    const stage = plot.days >= crop.days ? 3 : plot.days === 0 ? 0 : plot.days / crop.days < 0.5 ? 1 : 2;
    const img = CROP[crop.id][stage];
    const sway = stage === 3 && Math.floor(time * 1.5 + pd.x) % 4 === 0 ? 1 : 0;
    list.push({ y: (pd.y + 1) * 16 - 1, fn: () => g.drawImage(img, pd.x * 16 - cx + sway, pd.y * 16 - 3 - cy) });
  });
  // Structures
  for (const s of m.def.structures) {
    const artKey = s.kind === 'house' ? `house${s.variant ?? (s.x + s.y) % 3}` : s.kind === 'station' ? `station${flags.station ? 1 : 0}` : s.kind;
    const art = TOWN_ART[artKey];
    let img: Canv;
    let layers: Canv[] = [];
    if (art) {
      img = night ? art.night : art.day;
      if (night) {
        const groups = litGroups(game, s, m.def.portals.find((p) => p.x === s.door.x && p.y === s.door.y)?.to);
        layers = groups.map((k) => art.layers[k]).filter((c) => !!c);
        for (const k of ['lamp', ...groups]) for (const [wx, wy] of art.lights[k] ?? []) lights.push({ x: s.x * 16 + wx - cx, y: (s.y + s.h) * 16 - img.height + wy - cy, r: k === 'lamp' ? 11 : 13 });
      }
    } else {
      const frames = s.kind === 'mine' ? (flags.mine ? STRUCT.mineOpen : m.id === 'PINE_HOLLOW_TOWN' ? STRUCT.mineBoarded : STRUCT.mine) : STRUCT[s.kind];
      img = s.kind === 'tower' ? frames[Math.floor(time * 1.2) % 2] : frames[night && frames.length > 1 ? 1 : 0];
      if (night) for (const [wx, wy] of s.windows) lights.push({ x: s.x * 16 + wx - cx, y: s.y * 16 + wy - cy, r: s.kind === 'tower' ? 18 : 26 });
    }
    const dx = s.x * 16 - cx, dy = (s.y + s.h) * 16 - img.height - cy;
    if (dx > game.w || dy > game.h || dx + img.width < 0 || dy + img.height < 0) continue;
    const simg = winter && !m.def.indoor ? snowy(img) : img;
    const quilt = s.kind === 'shed' ? PROP.barnquilt[0] : null;
    const over = layers;
    list.push({ y: (s.y + s.h) * 16, fn: () => { g.drawImage(simg, dx, dy); for (const l of over) g.drawImage(l, dx, dy); if (quilt) g.drawImage(quilt, dx + Math.floor(simg.width / 2) - 6, dy + QUILT_Y); } });
  }
  // Candlelit Christmas trees, Fall 22 through Old Christmas.
  const cday = ((game.clock.day - 1) % 28) + 1, cseason = Math.floor((game.clock.day - 1) / 28) % 4;
  if (candleSeason(cseason, cday)) for (const [tx, ty] of CANDLE_TREES[m.id] ?? []) {
    const img = PROP.candletree[Math.floor(time * 3 + tx) % 2];
    const dx = tx * 16 - cx, dy = (ty + 1) * 16 - 32 - cy;
    list.push({ y: (ty + 1) * 16 - 0.5, fn: () => g.drawImage(img, dx, dy) });
    if (night || m.def.indoor) lights.push({ x: tx * 16 + 8 - cx, y: ty * 16 - cy, r: 30, flicker: true });
  }
  // A town gathering's stall (kettle, skillets, griddle, lanterns).
  const tev = m.id === 'PINE_HOLLOW_TOWN' ? eventNow(game) : null;
  if (tev) {
    const [ex, ey] = eventSpot(game, tev);
    const burnt = tev.id === 'fasnacht' && game.progress.days.fasnacht_burn === game.clock.day;
    const img = PROP[`ev_${burnt ? 'fasnacht_burnt' : tev.id}`][Math.floor(time * 3) % 2];
    const dx = ex * 16 - 8 - cx, dy = (ey + 1) * 16 - 32 - cy;
    list.push({ y: (ey + 1) * 16 - 0.5, fn: () => g.drawImage(img, dx, dy) });
    if (night || tev.id === 'old_christmas' || burnt) lights.push({ x: ex * 16 + 8 - cx, y: ey * 16 - cy, r: tev.id === 'old_christmas' || burnt ? 60 : tev.id === 'st_martin' ? 50 : 36, flicker: true });
  }
  // Your companion
  const pet = game.progress.pet, comp = game.companion;
  if (pet && comp.map === m.id) {
    const sleeping = comp.mode === 'sleep';
    const flying = pet.kind === 'raven' && comp.moving && !sleeping;
    const step = Math.floor(time * 7) % 2;
    const pose = sleeping ? 'sleep' : flying ? (step ? 'fly0' : 'fly1') : comp.moving ? (step ? 'walk1' : 'walk0') : 'sit';
    const lift = flying ? 7 : comp.perched ? 9 : 0;
    const img = petFrame(pet.kind, pose, comp.right);
    const px = Math.round(comp.x) - cx, py = Math.round(comp.y) - cy;
    list.push({ y: comp.y + 16.2 + (comp.perched ? 2 : 0), fn: () => {
      g.globalAlpha = 0.3; g.fillStyle = hex(P.VOID); g.fillRect(px + 4, py + 14, 8, 2); g.globalAlpha = 1;
      g.drawImage(img, px, py - lift);
      if (sleeping) drawZzz(g, px + 10, py + 2, time);
      const e = comp.emote;
      if (e) {
        const ey = py - lift - 8 - Math.round((1.6 - Math.min(1.6, e.t)) * 3);
        if (e.kind === 'heart') g.drawImage(heartIcon(), px + 5, ey);
        else {
          g.fillStyle = hex(P.FOG); g.fillRect(px + 4, ey - 1, 9, 8); g.fillStyle = hex(P.VOID); g.fillRect(px + 7, ey + 7, 2, 1);
          if (e.kind === 'bark') { g.fillStyle = hex(P.RED); g.fillRect(px + 8, ey, 1, 4); g.fillRect(px + 8, ey + 5, 1, 1);
            const [bx, by] = comp.barkDir; g.fillStyle = hex(P.RUST); g.fillRect(px + 8 + bx * 3, ey + 2 + by * 2, 1, 1); g.fillRect(px + 8 + bx * 2, ey + 2 + by, 1, 1); }
          else { g.fillStyle = hex(P.TWILIGHT); g.fillRect(px + 6, ey + 1, 1, 4); g.fillRect(px + 6, ey + 1, 3, 1); g.fillRect(px + 8, ey + 1, 1, 3); g.fillRect(px + 5, ey + 4, 2, 2); g.fillRect(px + 7, ey + 3, 2, 2); }
        }
      }
    } });
  }
  // Townsfolk
  for (const npc of game.townsfolk.on(m.id)) {
    const nx = Math.round(npc.x) - 4 - cx, ny = Math.round(npc.y) - 7 - cy;
    if (nx < -30 || ny < -30 || nx > game.w + 30 || ny > game.h + 30) continue;
    if (npc.inBed) {
      const bx = npc.tx * 16 - cx, by = (npc.ty - 1) * 16 - cy;
      if (npc.def.kind === 'dog') {
        const dimg = PROP.dog[Math.floor(time * 0.7) % 2];
        list.push({ y: (npc.ty + 1) * 16 - 1, fn: () => { g.drawImage(dimg, bx, by + 16); drawZzz(g, bx + 4, by + 14, time); } });
        continue;
      }
      // Tucked in: just the head on the pillow, quilt pulled up to the chin.
      const head = personFrame(npc.def.body, eventLook(game, npc.def.id, npc.def.look), 'down', 0, 'walk');
      const bed = OBJ.bed[0];
      list.push({ y: (npc.ty + 1) * 16 + 0.5, fn: () => {
        g.drawImage(head, 5, 0, 14, 12, bx + 1, by + 1, 14, 12);
        g.drawImage(bed, 0, 11, 16, 10, bx, by + 11, 16, 10);
        drawZzz(g, bx + 10, by, time);
      } });
      continue;
    }
    if (npc.def.kind === 'dog') {
      const left = npc.dir === 'left';
      const f = (npc.moving ? Math.floor(time * 8) : Math.floor(time * 2)) % 2;
      const img = left ? (f ? MISC.busterL1 : MISC.busterL) : f ? MISC.busterR1 : MISC.busterR;
      list.push({ y: npc.y + 16.4, fn: () => g.drawImage(img, Math.round(npc.x) - 2 - cx, Math.round(npc.y) + 2 - cy) });
      continue;
    }
    const img = personFrame(npc.def.body, eventLook(game, npc.def.id, npc.def.look), npc.dir, npc.frame, 'walk');
    const fishing = npc.stop?.tag === 'fishing' && npc.map === npc.stop.map && !npc.moving;
    list.push({
      y: npc.y + 16.4,
      fn: () => {
        g.globalAlpha = 0.35; g.fillStyle = hex(P.VOID); g.fillRect(nx + 7, ny + 21, 10, 2); g.globalAlpha = 1;
        g.drawImage(img, nx, ny);
        if (fishing) {
          // A line out over the pond, bobber riding the ripples.
          const pen = new Pen(g);
          const bob = Math.round(Math.sin(time * 2.2 + nx) * 1);
          pen.line(nx + 17, ny + 13, nx + 22, ny + 2, P.RUST);
          pen.line(nx + 22, ny + 2, nx + 20, ny + 30 + bob, P.MIST);
          pen.px(nx + 20, ny + 30 + bob, P.RED); pen.px(nx + 20, ny + 31 + bob, P.FOG);
        }
        if (npc.talkT > 0) { g.fillStyle = hex(P.LANTERN); g.fillRect(nx + 11, ny - 3, 2, 2); }
      },
    });
  }
  // Festival stalls in the park (going up over three days after Mabel's letter), lit with lanterns on festival nights.
  const prep = m.id === 'PINE_HOLLOW_TOWN' ? game.prepStage() : -1;
  if (prep >= 0) {
    for (const [sx, sy, kind] of FESTIVAL_STALLS) {
      const img = PROP[`stall_${kind}`][prep];
      list.push({ y: (sy + 1) * 16, fn: () => g.drawImage(img, sx * 16 - cx, (sy + 1) * 16 - 32 - cy) });
      if (festival) lights.push({ x: sx * 16 + 8 - cx, y: sy * 16 - 10 - cy, r: 22, flicker: true });
    }
  }
  // A letter waiting: an envelope bobs over the cabin mailbox.
  if (m.id === 'CABIN_YARD' && game.hasMail()) {
    const bob = Math.round(Math.sin(time * 3) * 1.5);
    const ex2 = 34 * 16 + 4 - cx, ey2 = 22 * 16 - 20 + bob - cy;
    list.push({ y: 23 * 16 + 1, fn: () => { g.fillStyle = hex(P.VOID); g.fillRect(ex2 - 1, ey2 - 1, 10, 8); g.fillStyle = hex(P.FOG); g.fillRect(ex2, ey2, 8, 6); g.fillStyle = hex(P.RUST); g.fillRect(ex2 + 1, ey2 + 1, 1, 1); g.fillRect(ex2 + 2, ey2 + 2, 4, 1); g.fillRect(ex2 + 6, ey2 + 1, 1, 1); } });
  }
  if (festival) {
    const [bx, by] = FESTIVAL_SPOTS.bonfire;
    const fire = Math.floor(time * 6) % 2 ? MISC.bonfire1 : MISC.bonfire0;
    list.push({ y: (by + 1) * 16, fn: () => g.drawImage(fire, bx * 16 - 2 - cx, (by + 1) * 16 - 24 - cy) });
    lights.push({ x: bx * 16 + 8 - cx, y: by * 16 - cy, r: 80, flicker: true });
    if (Math.random() < 0.3) game.particles.sparkle(bx * 16 + 8, by * 16 - 4, Math.random() < 0.5 ? P.AMBER : P.LANTERN);
  }
  if (m.id === 'PINE_HOLLOW_TOWN') {
    for (const [who, wagon] of [['ezri', MISC.wagonEzri], ['pike', MISC.wagonPike]] as const) {
      const npc = game.townsfolk.npcs.find((n) => n.def.id === who && n.map === m.id);
      if (!npc) continue;
      const [wx, wy] = FESTIVAL_SPOTS[who];
      list.push({ y: (wy - 1) * 16, fn: () => g.drawImage(wagon, wx * 16 - 12 - cx, (wy - 1) * 16 - 36 + 8 - cy) });
      lights.push({ x: wx * 16 + 8 - cx, y: (wy - 1) * 16 - cy, r: 30, flicker: true });
    }
  }
  // Barney waits on his handcar at any working stop (in town he's at the station himself).
  const stop = STOPS.get(m.id);
  if (stop && m.id !== 'PINE_HOLLOW_TOWN' && game.stopActive(m.id)) {
    const bdef = NPCS_BY_ID.barnaby;
    if (bdef) {
      const img = personFrame(bdef.body, bdef.look, 'down', 0, 'walk');
      const bx = stop.car.x * 16 - 4 - cx, by = stop.car.y * 16 - 12 - cy;
      list.push({ y: (stop.car.y + 1) * 16 + 0.2, fn: () => g.drawImage(img, bx, by) });
    }
  }
  // Deer
  for (const d of game.wildlife.deer) {
    const img = MISC[deerKey(d.buck, d.left, d.state === 'graze', d.frame)];
    const dx = Math.round(d.x) - 4 - cx, dy = Math.round(d.y) + 16 - img.height - cy;
    if (dx < -30 || dy < -30 || dx > game.w + 30 || dy > game.h + 30) continue;
    list.push({ y: d.y + 16.3, fn: () => { g.globalAlpha = 0.35; g.fillStyle = hex(P.VOID); g.fillRect(dx + 6, dy + img.height - 2, 12, 2); g.globalAlpha = 1; g.drawImage(img, dx, dy); } });
  }
  // Player
  const px = Math.round(p.x) - 4 - cx, py = Math.round(p.y) - 7 - cy;
  list.push({
    y: p.y + 16.5,
    fn: () => {
      g.globalAlpha = 0.4;
      g.fillStyle = hex(P.VOID);
      g.fillRect(px + 7, py + 21, 10, 2);
      g.fillRect(px + 8, py + 23, 8, 1);
      g.globalAlpha = 1;
      const act = p.action;
      const pose = act ? 'act' : 'walk';
      const img = playerFrame(game.look, p.dir, act ? 0 : p.frame, pose);
      const af = p.actionFrame;
      const [hx, hy] = handPivot(p.dir);
      const behind = act && (p.dir === 'up' || (af === 0 && act.tool !== 'can'));
      if (act && behind) drawTool(g, act.tool, p.dir, af, px + hx, py + hy);
      g.drawImage(img, px, py);
      if (act && !behind) drawTool(g, act.tool, p.dir, af, px + hx, py + hy);
      // Tall grass hides the boots (Pokémon-style)
      const ftx = Math.floor((p.x + 8) / 16), fty = Math.floor((p.y + 8) / 16);
      if (m.obj(ftx, fty) === O.TALLGRASS) {
        const grass = OBJ.tallgrass[Math.floor(time * 16) % 2];
        g.drawImage(grass, 0, 10, 16, 6, ftx * 16 - cx, fty * 16 + 10 - cy, 16, 6);
      }
    },
  });

  for (const sg of game.sightings.signs) {
    if (sg.kind !== 'rustle' && sg.kind !== 'tracks') continue;
    const k = sg.live ? 1 : Math.max(0, sg.fade);
    const bx = sg.x * 16 - cx, by = sg.y * 16 - cy;
    list.push({ y: (sg.y + 1) * 16 + 0.3, fn: () => drawRustle(g, bx, by, time + sg.seed, k) });
  }
  // A mastered cryptid dropping by the homestead.
  const visitor = visitorHere(game);
  if (visitor) {
    const [vx, vy] = visitorPos(game, visitor);
    const spr = cryptidFrame(visitor.id, 'normal', Math.floor(time * 2) % 2);
    const lift = visitor.lift ?? 0;
    const flip = visitor.id === 'nightcrawler' && (time * 0.12) % 2 > 1;
    list.push({ y: (vy + 1) * 16 + (visitor.id === 'mothman' ? 64 : 0.6), fn: () => {
      const sx = vx * 16 - cx - 4, sy = vy * 16 - cy - 8 - lift;
      g.globalAlpha = 0.3; g.fillStyle = hex(P.VOID); g.fillRect(sx + 6, sy + 22, 12, 2); g.globalAlpha = 1;
      if (flip) { g.save(); g.translate(sx + 24, sy); g.scale(-1, 1); g.drawImage(spr, 0, 0); g.restore(); } else g.drawImage(spr, sx, sy);
    } });
  }
  mineDrawables(game, g, cx, cy, time, list);
  for (const hd of henDrawables(game, time, cx, cy)) list.push({ y: hd.y, fn: () => hd.fn(g) });
  const eaves = eaveLights(game, time, cx, cy);
  if (eaves) { list.push({ y: eaves.y, fn: () => eaves.fn(g) }); lights.push(...eaveLightSources(game, cx, cy)); }
  list.sort((a, b) => a.y - b.y);
  for (const d of list) d.fn();

  const view: View = { x0, x1, y0, y1, cx, cy, season, time };
  drawAmbient(game, g, view);
  game.particles.draw(g, cx, cy);
  if (festival || prep >= 0 || tev) {
    const S = TOWN_SQUARE;
    for (const yy of [S.y, S.y + S.h - 1]) for (let xx = S.x; xx < S.x + S.w; xx++) g.drawImage(MISC.bunting, xx * 16 - cx, yy * 16 - 14 - cy);
  }

  // ---- Weather tint (outdoors) ----
  const wthr = game.weatherNow();
  const outdoors = !m.def.indoor;
  if (outdoors) game.weatherFx.drawTint(g, game.w, game.h, wthr);

  // ---- The Deep Seam: its own darkness instead of the day/night tint ----
  if (isMineMap(m.id)) { drawMineOverlay(game, g, cx, cy, time); drawMineHud(game, g); return; }
  if (m.id === 'LAMP_HOUSE') { drawLampHouseTint(game, g, time); drawMineHud(game, g); return; }
  // ---- Lighting ----
  const ph = game.clock.phase();
  if (ph !== 'day') {
    const lr = (m.def.indoor ? 30 : ph === 'dusk' ? 34 : ph === 'witching' ? 40 : 50) + (m.def.indoor ? 0 : game.lanternBonus());
    lights.push({ x: px + 12, y: py + 12, r: lr, flicker: true });
  }
  game.lighting.render(g, game.w, game.h, game.clock.minutes, m.def.indoor, lights, time);
  drawFireflies(game, g, view);
  drawSignsGlow(game, g, cx, cy, time);
  if (visitor && ph !== 'day') {
    // Their eyes catch the light after dark.
    const [vx, vy] = visitorPos(game, visitor);
    g.drawImage(eyesOf(visitor.id, Math.floor(time * 2) % 2), vx * 16 - cx - 4, vy * 16 - cy - 8 - (visitor.lift ?? 0));
  }
  if (outdoors) {
    game.weatherFx.drawParticles(g, game.w, game.h, wthr, time, cx, cy);
    game.weatherFx.drawFlash(g, game.w, game.h);
  }
}

/** Floating Zs over a sleeper. */
function drawZzz(g: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  for (let k = 0; k < 2; k++) {
    const t = (time * 0.5 + k * 0.5) % 1;
    const zx = Math.round(x + t * 6 + k * 2), zy = Math.round(y - t * 10);
    g.globalAlpha = 1 - t;
    g.fillStyle = hex(P.FOG);
    g.fillRect(zx, zy, 3, 1); g.fillRect(zx + 1, zy + 1, 1, 1); g.fillRect(zx, zy + 2, 3, 1);
  }
  g.globalAlpha = 1;
}

/** Which window groups of a town building are lit tonight: only where somebody is home and awake. */
function litGroups(game: Game, s: Structure, home: MapId | undefined): string[] {
  const tf = game.townsfolk;
  const late = game.clock.minutes >= 19 * 60 + 30;
  switch (s.kind) {
    case 'house': return home && tf.awakeIn(home) ? (late ? ['main', 'attic'] : ['main']) : [];
    // The EAT sign only glows once the town has paid to rewire it (Restoration Ledger P1).
    case 'diner': return [...(tf.awakeIn('DINER_INT') ? ['main'] : []), ...(flags.neon && game.clock.phase() !== 'day' ? ['sign'] : [])];
    case 'store': return [...(tf.awakeIn('STORE_INT') ? ['main'] : []), ...(tf.awakeIn('STORE_LOFT') ? ['attic'] : [])];
    case 'museum': return tf.awakeIn('MUSEUM_INT') ? ['main', 'upper'] : [];
    case 'station': return flags.station && game.clock.minutes < 24 * 60 ? ['main'] : [];
    default: return [];
  }
}

/* ------------------------------------------------------------------ */
/* Cryptid clues                                                       */
/* ------------------------------------------------------------------ */

function drawSignsGround(game: Game, g: CanvasRenderingContext2D, cx: number, cy: number, time: number): void {
  for (const sg of game.sightings.signs) {
    const k = sg.live ? 1 : Math.max(0, sg.fade);
    if (sg.kind === 'tracks') {
      g.globalAlpha = 0.85 * k;
      for (const [px, py] of sg.prints) g.drawImage(MISC.paw, px * 16 - cx, py * 16 - cy);
      g.globalAlpha = 1;
    } else if (sg.kind === 'ripple') {
      const bx = sg.x * 16 + 8 - cx, by = sg.y * 16 + 9 - cy;
      for (let ring = 0; ring < 2; ring++) {
        const t = (time * 0.7 + sg.seed + ring * 0.5) % 1;
        const r = 2 + t * 7;
        g.globalAlpha = (1 - t) * 0.9 * k;
        g.fillStyle = hex(P.FOG);
        for (let a = 0; a < 14; a++) { const ang = (a / 14) * Math.PI * 2; g.fillRect(Math.round(bx + Math.cos(ang) * r), Math.round(by + Math.sin(ang) * r * 0.5), 1, 1); }
      }
      // A dark shape just under the surface.
      g.globalAlpha = 0.35 * k; g.fillStyle = hex(P.SHADOW);
      g.fillRect(Math.round(bx - 5 + Math.sin(time + sg.seed) * 2), by - 1, 10, 3);
      g.globalAlpha = 1;
    }
  }
}

/** Something heavy moving in the cover. */
function drawRustle(g: CanvasRenderingContext2D, bx: number, by: number, t: number, k: number): void {
  const shake = Math.sin(t * 18) * (Math.sin(t * 1.3) > 0.2 ? 2 : 0.5);
  g.globalAlpha = k;
  for (const [ox, oy, c] of [[3, 6, P.FERN], [7, 3, P.MOSS], [11, 6, P.FERN], [5, 10, P.MOSS], [10, 10, P.FOREST], [8, 7, P.FERN]] as Array<[number, number, number]>) {
    g.fillStyle = hex(c);
    g.fillRect(Math.round(bx + ox + shake * (oy < 8 ? 1 : 0.5)), Math.round(by + oy), 1, 4);
  }
  g.globalAlpha = 1;
}

/** Eyes in the brush shine through the dark; Wisp-Light Oil makes every clue glow. */
/** Just the red and lantern-yellow pixels of a cryptid frame (its eyes), to draw over the night tint. */
const eyeCache = new Map<string, HTMLCanvasElement>();
function eyesOf(id: string, f: number): HTMLCanvasElement {
  const key = `${id}:${f}`;
  const hit = eyeCache.get(key);
  if (hit) return hit;
  const src = cryptidFrame(id, 'normal', f);
  const { c, g: cg } = makeCanvas(src.width, src.height);
  cg.drawImage(src, 0, 0);
  const img = cg.getImageData(0, 0, c.width, c.height);
  const [rr, rg, rb] = rgbOf(P.RED), [lr, lg, lb] = rgbOf(P.LANTERN);
  for (let k = 0; k < img.data.length; k += 4) {
    const r = img.data[k], gg = img.data[k + 1], b = img.data[k + 2];
    const eye = (r === rr && gg === rg && b === rb) || (r === lr && gg === lg && b === lb);
    if (!eye) img.data[k + 3] = 0;
  }
  cg.putImageData(img, 0, 0);
  eyeCache.set(key, c);
  return c;
}

function drawSignsGlow(game: Game, g: CanvasRenderingContext2D, cx: number, cy: number, time: number): void {
  const wisp = game.wispNight === game.clock.day;
  for (const sg of game.sightings.signs) {
    const k = sg.live ? 1 : Math.max(0, sg.fade);
    const bx = sg.x * 16 - cx, by = sg.y * 16 - cy;
    if (wisp) {
      g.globalAlpha = (0.18 + Math.sin(time * 3 + sg.seed) * 0.06) * k;
      g.fillStyle = hex(P.VIOLET); g.fillRect(bx - 2, by - 2, 20, 20);
      g.globalAlpha = 1;
    }
    if (sg.kind !== 'eyes') continue;
    const blink = (time * 0.6 + sg.seed) % 3 < 0.12;
    if (blink) continue;
    const col = sg.variant === 'albino' ? P.MOON : sg.variant === 'static' ? P.LANTERN : (Math.floor(sg.seed) % 3 === 0 ? P.LANTERN : P.RED);
    const look = Math.round(Math.sin(time * 0.5 + sg.seed) * 1.5);
    const ex = bx + 3 + look, ey = by + 7;
    g.globalAlpha = 0.18 * k; g.fillStyle = hex(col);
    g.fillRect(ex - 3, ey - 3, 14, 7);
    g.globalAlpha = 0.45 * k;
    g.fillRect(ex - 1, ey - 1, 4, 3); g.fillRect(ex + 5, ey - 1, 4, 3);
    g.globalAlpha = k;
    g.fillRect(ex, ey, 2, 1); g.fillRect(ex + 6, ey, 2, 1);
    if (sg.variant === 'static' && Math.floor(time * 8 + sg.seed) % 5 === 0) { g.fillStyle = hex(P.MIST); g.fillRect(ex + 2, ey - 3, 1, 2); }
    g.globalAlpha = 1;
  }
}
