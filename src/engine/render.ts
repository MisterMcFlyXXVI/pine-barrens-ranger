/** World renderer: ground autotiles → y-sorted objects/actors → particles → lighting. */
import type { Game } from './game';
import type { MapRuntime } from './world';
import { GROUND, OVER, OBJ, STRUCT, CROP, ICON, MISC } from '../graphics/sprites';
import type { Canv } from '../graphics/canvas';
import { Pen } from '../graphics/canvas';
import { playerFrame, handPivot, personFrame } from '../graphics/playerSprite';
import { cryptidFrame } from '../graphics/cryptidSprites';
import { CRYPTIDS } from '../data/cryptids';
import { TOWN_SQUARE, FESTIVAL_SPOTS } from '../data/town';
import type { Light } from '../graphics/lighting';
import { hex, P } from '../graphics/palette';
import { O, T, objProps } from '../data/tiles';
import { CROP_BY_ID } from '../data/items';
import type { ToolKind } from '../data/items';
import { hash2 } from '../util';
import { cryptidSilhouette } from '../graphics/cryptidSprites';
import type { Dir } from '../util';
import { deerKey } from '../graphics/outdoorSprites';
import { STOPS } from '../data/handcar';
import { NPCS_BY_ID } from '../data/npcs';

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
    default: g.drawImage(GROUND.void[0], sx, sy);
  }
}

function fenceMask(m: MapRuntime, x: number, y: number): number {
  const f = (dx: number, dy: number) => m.obj(x + dx, y + dy) === O.FENCE;
  return (f(0, -1) ? 1 : 0) | (f(1, 0) ? 2 : 0) | (f(0, 1) ? 4 : 0) | (f(-1, 0) ? 8 : 0);
}

/** Pick the sprite for an object tile, honouring variants & animation frames. */
/** Progress-dependent visuals, set once per frame by renderWorld. */
const flags = { grant: false, gift: false };

/** Set each frame: is this map's handcar stop repaired? (objSprite has no game handle.) */
let stopFixed = false;

function objSprite(m: MapRuntime, o: number, x: number, y: number, time: number, night: boolean, rustling: boolean): Canv | null {
  const h = hash2(x, y, 3);
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
    case O.SIGNAL_LANTERN: return OBJ.signal[flags.grant ? 1 : Math.floor(time * 7 + h * 5) % 5 === 0 ? 1 : 0];
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
    case O.TOTEM: return OBJ.totem[0];
    case O.ROD: return OBJ.rod[Math.floor(time * 3) % 2];
    case O.CHIME: return OBJ.chime[Math.floor(time * 1.5 + h) % 2];
    case O.PYLON: return OBJ.pylon[Math.floor(time * 6) % 2];
    case O.ROD_BASE: return OBJ.rodbase[0];
    default: return null;
  }
}

/** Flat decals drawn with the ground layer (never occlude actors). */
const FLAT: ReadonlySet<number> = new Set<number>([O.WINDOW, O.LILYPAD, O.POSTER]);

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
  stopFixed = game.stopRepaired(m.id);
  const cam = game.cam;
  const cx = cam.ix, cy = cam.iy;
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
      const o = m.obj(x, y);
      if (FLAT.has(o)) {
        const img = objSprite(m, o, x, y, time, night, false);
        if (img) g.drawImage(img, sx, sy);
      }
    }
  }

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
        const img = objSprite(m, o, x, y, time, night, shaking);
        if (img) {
          const fw = objProps(o).fw ?? 1;
          let dx = x * 16 + Math.floor((fw * 16 - img.width) / 2) - cx;
          const dy = (y + 1) * 16 - img.height - cy;
          if (shaking && o !== O.TALLGRASS) dx += Math.round(Math.sin(time * 70));
          let extra: Canv | null = null;
          let ex = 0, ey = 0, es = 16;
          if (o === O.CASE) {
            const cid = m.def.meta?.get(i);
            if (cid && game.progress.donated.has(cid)) { extra = cryptidFrame(cid, 'normal', Math.floor(time * 2 + x) % 2); ex = dx + 2; ey = dy + 4; es = 12; }
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
          list.push({ y: (y + 1) * 16, fn: () => { g.drawImage(img, dx, dy); if (ext) g.drawImage(ext, ex, ey, es, es); } });
        }
        if (o === O.LAMP && night) lights.push({ x: x * 16 + 8 - cx, y: y * 16 - 10 - cy, r: 46, flicker: true });
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
    const frames = s.kind === 'mine' ? (flags.grant ? STRUCT.mineOpen : m.id === 'PINE_HOLLOW_TOWN' ? STRUCT.mineBoarded : STRUCT.mine) : STRUCT[s.kind];
    const n = night ? 1 : 0;
    const img = s.kind === 'tower' ? frames[Math.floor(time * 1.2) % 2]
      : s.kind === 'house' ? frames[((s.x + s.y) % 3) * 2 + n]
        : s.kind === 'station' ? frames[(flags.grant ? 2 : 0) + n]
          : frames[night && frames.length > 1 ? 1 : 0];
    const dx = s.x * 16 - cx, dy = (s.y + s.h) * 16 - img.height - cy;
    if (dx > game.w || dy > game.h || dx + img.width < 0 || dy + img.height < 0) continue;
    list.push({ y: (s.y + s.h) * 16, fn: () => g.drawImage(img, dx, dy) });
    if (night) for (const [wx, wy] of s.windows) lights.push({ x: s.x * 16 + wx - cx, y: s.y * 16 + wy - cy, r: s.kind === 'tower' ? 18 : 26 });
  }
  // Townsfolk
  for (const npc of game.townsfolk.on(m.id)) {
    const nx = Math.round(npc.x) - 4 - cx, ny = Math.round(npc.y) - 7 - cy;
    if (nx < -30 || ny < -30 || nx > game.w + 30 || ny > game.h + 30) continue;
    if (npc.def.kind === 'dog') {
      const left = npc.dir === 'left';
      const f = (npc.moving ? Math.floor(time * 8) : Math.floor(time * 2)) % 2;
      const img = left ? (f ? MISC.busterL1 : MISC.busterL) : f ? MISC.busterR1 : MISC.busterR;
      list.push({ y: npc.y + 16.4, fn: () => g.drawImage(img, Math.round(npc.x) - 2 - cx, Math.round(npc.y) + 2 - cy) });
      continue;
    }
    const img = personFrame(npc.def.body, npc.def.look, npc.dir, npc.frame, 'walk');
    list.push({
      y: npc.y + 16.4,
      fn: () => {
        g.globalAlpha = 0.35; g.fillStyle = hex(P.VOID); g.fillRect(nx + 7, ny + 21, 10, 2); g.globalAlpha = 1;
        g.drawImage(img, nx, ny);
        if (npc.talkT > 0) { g.fillStyle = hex(P.LANTERN); g.fillRect(nx + 11, ny - 3, 2, 2); }
      },
    });
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

  list.sort((a, b) => a.y - b.y);
  for (const d of list) d.fn();

  game.particles.draw(g, cx, cy);
  if (festival) {
    const S = TOWN_SQUARE;
    for (const yy of [S.y, S.y + S.h - 1]) for (let xx = S.x; xx < S.x + S.w; xx++) g.drawImage(MISC.bunting, xx * 16 - cx, yy * 16 - 14 - cy);
  }

  // ---- Weather tint (outdoors) ----
  const wthr = game.weatherNow();
  const outdoors = !m.def.indoor;
  if (outdoors) game.weatherFx.drawTint(g, game.w, game.h, wthr);

  // ---- Lighting ----
  const ph = game.clock.phase();
  if (ph !== 'day') {
    const lr = (m.def.indoor ? 30 : ph === 'dusk' ? 34 : ph === 'witching' ? 40 : 50) + (m.def.indoor ? 0 : game.lanternBonus());
    lights.push({ x: px + 12, y: py + 12, r: lr, flicker: true });
  }
  game.lighting.render(g, game.w, game.h, game.clock.minutes, m.def.indoor, lights, time);
  if (outdoors) {
    game.weatherFx.drawParticles(g, game.w, game.h, wthr, time, cx, cy);
    game.weatherFx.drawFlash(g, game.w, game.h);
  }
}
