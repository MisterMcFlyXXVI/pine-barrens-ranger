/** World renderer: ground autotiles → y-sorted objects/actors → particles → lighting. */
import type { Game } from './game';
import type { MapRuntime } from './world';
import { GROUND, OVER, OBJ, STRUCT, CROP, ICON, MISC } from '../graphics/sprites';
import type { Canv } from '../graphics/canvas';
import { Pen } from '../graphics/canvas';
import { playerFrame, handPivot } from '../graphics/playerSprite';
import type { Light } from '../graphics/lighting';
import { hex, P } from '../graphics/palette';
import { O, T, objProps } from '../data/tiles';
import { CROP_BY_ID } from '../data/items';
import type { ToolKind } from '../data/items';
import { hash2 } from '../util';
import type { Dir } from '../util';

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
        if (n !== T.WATER && n !== T.BRIDGE) g.drawImage(OVER[`bank${side}`], sx, sy);
      }
      return;
    }
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
function objSprite(m: MapRuntime, o: number, x: number, y: number, time: number, night: boolean, rustling: boolean): Canv | null {
  const h = hash2(x, y, 3);
  switch (o) {
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
    default: return null;
  }
}

/** Flat decals drawn with the ground layer (never occlude actors). */
const FLAT: ReadonlySet<number> = new Set<number>([O.WINDOW, O.LILYPAD]);

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
  const cam = game.cam;
  const cx = cam.ix, cy = cam.iy;
  const time = game.time;
  const phase = game.clock.phase();
  const night = phase === 'night' || phase === 'witching' || (phase === 'dusk' && game.clock.minutes > 1140);
  const x0 = Math.max(0, Math.floor(cx / 16) - 1), x1 = Math.min(m.w - 1, Math.floor((cx + game.w) / 16) + 1);
  const y0 = Math.max(0, Math.floor(cy / 16) - 1), y1 = Math.min(m.h - 1, Math.floor((cy + game.h) / 16) + 3);
  const lights: Light[] = [];

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

  // ---- Y-sorted world ----
  const list: Drawable[] = [];
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
          list.push({ y: (y + 1) * 16, fn: () => g.drawImage(img, dx, dy) });
        }
        if (o === O.LAMP && night) lights.push({ x: x * 16 + 8 - cx, y: y * 16 - 10 - cy, r: 46, flicker: true });
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
    const img = STRUCT[s.kind][night && STRUCT[s.kind].length > 1 ? 1 : 0];
    const dx = s.x * 16 - cx, dy = (s.y + s.h) * 16 - img.height - cy;
    if (dx > game.w || dy > game.h || dx + img.width < 0 || dy + img.height < 0) continue;
    list.push({ y: (s.y + s.h) * 16, fn: () => g.drawImage(img, dx, dy) });
    if (night) for (const [wx, wy] of s.windows) lights.push({ x: s.x * 16 + wx - cx, y: s.y * 16 + wy - cy, r: 26 });
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

  // ---- Lighting ----
  const ph = game.clock.phase();
  if (ph !== 'day') {
    const lr = m.def.indoor ? 30 : ph === 'dusk' ? 34 : ph === 'witching' ? 40 : 50;
    lights.push({ x: px + 12, y: py + 12, r: lr, flicker: true });
  }
  game.lighting.render(g, game.w, game.h, game.clock.minutes, m.def.indoor, lights, time);
}
