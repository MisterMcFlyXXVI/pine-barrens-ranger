/**
 * Drawing the Deep Seam: figures in the draw list, the near-black overlay with
 * the carbide headlamp cut out of it (sulfur-amber open, a phosphor-green
 * listening circle shut), and the Mine Kit HUD.
 */
import type { Game } from './game';
import { makeCanvas, Canv } from '../graphics/canvas';
import { P, hex, rgbOf } from '../graphics/palette';
import { MO, MHUD } from '../graphics/mineSprites';
import { drawText } from '../graphics/font';
import { panel, bar } from '../ui/panel';
import { MINE_LEVELS, isMineMap, MINERS } from '../data/mine';
import { O } from '../data/tiles';
import { rt, glare, lampLit, lightRadius, LISTEN, hazeOn, hazeLevel, carried, banked, lampedProps, spiritsShown, respirator } from './mine';

type Draw = { y: number; fn: () => void };

/** Coal-Chewers, the Foreman, crosscut spirits and dropped tags, depth-sorted with everything else. */
export function mineDrawables(game: Game, g: CanvasRenderingContext2D, cx: number, cy: number, time: number, list: Draw[]): void {
  if (!isMineMap(game.cur.id)) return;
  const shutView = !glare(game);
  for (const e of rt.ents) {
    const f = Math.floor(e.anim * (e.kind === 'foreman' ? 2 : 4)) % 2;
    const img = e.kind === 'foreman' ? MO.foreman[f] : MO.chewer[f];
    const dx = Math.round(e.x * 16) + 8 - Math.floor(img.width / 2) - cx, dy = Math.round(e.y * 16) + 16 - img.height - cy;
    list.push({ y: e.y * 16 + 16.2, fn: () => {
      g.globalAlpha = 0.4; g.fillStyle = hex(P.VOID); g.fillRect(dx + 3, dy + img.height - 2, img.width - 6, 2); g.globalAlpha = 1;
      // With the shutter closed you only make them out as shapes.
      if (shutView) { g.globalAlpha = 0.55; g.drawImage(img, dx, dy); g.globalAlpha = 1; } else g.drawImage(img, dx, dy);
    } });
  }
  for (const { c } of spiritsShown(game)) {
    const img = MO.spirit[Math.floor(time * 1.2) % 2];
    const dx = c.spirit[0] * 16 - cx, dy = (c.spirit[1] + 1) * 16 - img.height - cy;
    list.push({ y: (c.spirit[1] + 1) * 16 - 0.3, fn: () => { g.globalAlpha = 0.35 + Math.sin(time * 2) * 0.12; g.drawImage(img, dx, dy); g.globalAlpha = 1; } });
  }
}

/* ------------------------------------------------------------------ */
/* Overlay                                                             */
/* ------------------------------------------------------------------ */

let layer: Canv | null = null;
let lg: CanvasRenderingContext2D | null = null;

function ensure(w: number, h: number): CanvasRenderingContext2D {
  if (!layer || layer.width !== w || layer.height !== h) {
    const { c, g } = makeCanvas(w, h);
    layer = c; lg = g;
  }
  return lg!;
}

function hole(g: CanvasRenderingContext2D, x: number, y: number, r: number, strength: number): void {
  for (let k = 0; k < 4; k++) {
    g.fillStyle = `rgba(0,0,0,${(0.26 * strength).toFixed(3)})`;
    g.beginPath(); g.arc(Math.round(x), Math.round(y), Math.max(1, Math.round(r * (1 - k * 0.18))), 0, Math.PI * 2); g.fill();
  }
}

/** The Lamp House: lantern-lit boards in an old photograph's colours. */
export function drawLampHouseTint(game: Game, g: CanvasRenderingContext2D, time: number): void {
  const [r, gg, b] = rgbOf(P.SHADOW);
  g.fillStyle = `rgba(${r},${gg},${b},0.32)`;
  g.fillRect(0, 0, game.w, game.h);
  const [ar, ag, ab] = rgbOf(P.AMBER);
  g.fillStyle = `rgba(${ar},${ag},${ab},${(0.07 + Math.sin(time * 7) * 0.01).toFixed(3)})`;
  g.fillRect(0, 0, game.w, game.h);
}

/** Underground: near-black, with your headlamp cut out of it. */
export function drawMineOverlay(game: Game, g: CanvasRenderingContext2D, cx: number, cy: number, time: number): void {
  const w = game.w, h = game.h;
  const L = MINE_LEVELS[game.cur.id];
  const p = game.player;
  const px = p.x + 8 - cx, py = p.y + 6 - cy;
  const o = ensure(w, h);
  const haze = hazeOn(game) ? hazeLevel(game) : 0;
  o.globalCompositeOperation = 'source-over';
  o.clearRect(0, 0, w, h);
  o.fillStyle = hex(P.VOID);
  o.globalAlpha = 0.95;
  o.fillRect(0, 0, w, h);
  o.globalAlpha = 1;
  o.globalCompositeOperation = 'destination-out';
  const fl = Math.sin(time * 11) * 1.2 + Math.sin(time * 27) * 0.6;
  const R = lightRadius(game) + (glare(game) ? fl : 0);
  hole(o, px, py, R, 1);
  // The lift lamp, and the little blue flame of the safety lamp at your belt.
  if (L) hole(o, (L.lift[0] + 0.5) * 16 - cx, L.lift[1] * 16 + 2 - cy, 18, 0.7);
  hole(o, px + 5, py + 8, 7, 0.6);
  o.globalCompositeOperation = 'source-over';
  g.drawImage(layer!, 0, 0);

  // Tint inside your light: sulfur amber open, phosphor green shut; coal-dust haze over everything.
  const open = glare(game);
  const [tr, tg, tb] = rgbOf(open ? P.LANTERN : P.FERN);
  g.fillStyle = `rgba(${tr},${tg},${tb},${open ? 0.08 : 0.1})`;
  g.beginPath(); g.arc(Math.round(px), Math.round(py), Math.round(R * 0.7), 0, Math.PI * 2); g.fill();
  if (haze) {
    const [hr, hg, hb] = rgbOf(P.SHADOW);
    g.fillStyle = `rgba(${hr},${hg},${hb},${(0.12 + haze * 0.06 + Math.sin(time * 1.3) * 0.03).toFixed(3)})`;
    g.fillRect(0, 0, w, h);
    g.fillStyle = hex(P.MIST);
    for (let k = 0; k < 40 * haze; k++) {
      const x = (k * 97.3 + time * (14 + (k % 5) * 3)) % w, y = (k * 53.7 + Math.sin(time + k) * 6) % h;
      g.globalAlpha = 0.25; g.fillRect(Math.floor(x), Math.floor(y), 1, 1);
    }
    g.globalAlpha = 1;
  }

  // Shutter closed: the phosphor-green listening circle, and what you can hear inside it.
  if (lampLit(game) && !open) {
    g.strokeStyle = hex(P.MOSS); g.globalAlpha = 0.5 + Math.sin(time * 3) * 0.15; g.lineWidth = 1;
    g.setLineDash([2, 3]); g.beginPath(); g.arc(Math.round(px), Math.round(py), LISTEN, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    g.globalAlpha = 1;
  }
  const listen = LISTEN / 16;
  for (const e of rt.ents) {
    const d = Math.hypot(e.x - p.tx, e.y - p.ty);
    const ex = Math.round(e.x * 16) + 8 - cx, ey = Math.round(e.y * 16) - cy;
    // You hear them: a green outline when they're inside the circle.
    if (!open && d <= listen) {
      g.globalAlpha = 0.6; g.fillStyle = hex(P.FERN);
      const tall = e.kind === 'foreman' ? 30 : 20;
      g.fillRect(ex - 1, ey + 16 - tall, 2, tall); g.fillRect(ex - 4, ey + 16 - tall + 6, 8, 2);
      g.globalAlpha = 1;
    }
    // Ember throats and ember eyes show through the dark from further off.
    if (d < 14) {
      g.fillStyle = hex(P.RED);
      if (e.kind === 'foreman') { const by = ey + 16 - 34 + 5; g.fillRect(ex - 2, by, 1, 1); g.fillRect(ex + 1, by, 1, 1); g.fillStyle = hex(P.CRAN); g.fillRect(ex - 3, by + 8, 1, 1); g.fillRect(ex + 3, by + 11, 1, 1); }
      else { g.fillRect(ex - 1, ey + 16 - 24 + 8 + (Math.floor(time * 4) % 2), 2, 2); }
    }
  }
  // Dropped tags glint when you're close.
  const s = game.progress.mine;
  for (const t of s.dropped) {
    if (t.map !== game.cur.id || Math.hypot(t.x - p.tx, t.y - p.ty) > 4) continue;
    g.drawImage(MO.tag[Math.floor(time * 3) % 2], t.x * 16 - cx, t.y * 16 - cy);
  }
  // The safety lamp picks out load-bearing calcified props.
  for (const [x, y] of lampedProps(game)) {
    g.strokeStyle = hex(P.FERN); g.globalAlpha = 0.45 + Math.sin(time * 4) * 0.2;
    g.strokeRect(x * 16 - cx + 1.5, y * 16 - 10 - cy + 0.5, 13, 25);
    g.globalAlpha = 1;
  }
  // Firedamp shimmer near the safety lamp.
  if (L && rt.nearGas === 'fire') for (const z of L.gas) if (z.kind === 'fire') {
    for (let yy = z.y; yy < z.y + z.h; yy++) for (let xx = z.x; xx < z.x + z.w; xx++) {
      if (Math.hypot(xx - p.tx, yy - p.ty) > 4) continue;
      g.globalAlpha = 0.12 + 0.08 * Math.sin(time * 5 + xx + yy); g.fillStyle = hex(P.FERN); g.fillRect(xx * 16 - cx, yy * 16 - cy, 16, 16);
    }
    g.globalAlpha = 1;
  }
}

/* ------------------------------------------------------------------ */
/* HUD                                                                 */
/* ------------------------------------------------------------------ */

export function drawMineHud(game: Game, g: CanvasRenderingContext2D): void {
  const s = game.progress.mine;
  if (!s.kit) { rt.lampRect = null; return; }
  const x = 3, y = 34, w = 84, h = 40;
  panel(g, x, y, w, h);
  const open = !s.shut, lit = lampLit(game);
  const icons = [
    MHUD[`lamp_${open ? 'open' : 'shut'}_${lit ? 'lit' : 'out'}`],
    rt.nearGas || hazeOn(game) ? MHUD.canaryQuiet : MHUD.canary,
    MHUD.bar,
    MHUD[`safety_${rt.nearGas === 'fire' ? 'fire' : rt.nearGas === 'choke' ? 'choke' : 'clear'}`],
  ];
  if (game.inv.count('blasting_box')) icons.push(MHUD.box);
  icons.forEach((ic, k) => {
    const ix = x + 4 + k * 15, iy = y + 4;
    g.fillStyle = hex(P.SHADOW); g.fillRect(ix - 1, iy - 1, 14, 14);
    g.drawImage(ic, ix, iy);
  });
  rt.lampRect = { x: x + 2, y: y + 2, w: 16, h: 16 };
  drawText(g, lit ? (open ? 'OPEN' : 'SHUT') : 'OUT', x + 4, y + 20, lit ? (open ? P.LANTERN : P.FERN) : P.RED);
  bar(g, x + 26, y + 21, w - 30, 4, s.fuel / 100, s.fuel > 20 ? P.AMBER : P.RED);
  if (rt.breath < 99 || rt.nearGas) {
    drawText(g, 'AIR', x + 4, y + 28, respirator(game) ? P.MIST : P.FOG);
    bar(g, x + 26, y + 29, w - 30, 4, Math.max(0, rt.breath) / 100, rt.breath > 40 ? P.MIST : P.RED);
  } else {
    const c = carried(game).length;
    drawText(g, `TAGS ${c}  OUT ${banked(game)}/${MINERS.length}`, x + 4, y + 28, c ? P.AMBER : P.MIST);
  }
  if (hazeOn(game)) drawText(g, 'COAL-DUST HAZE', x, y + h + 2, P.RED, P.VOID);
  else if (game.cur.id === 'MINE_L3' && s.wired.length) drawText(g, `CRIBS WIRED ${s.wired.length}/4`, x, y + h + 2, P.AMBER, P.VOID);
}

/** Wired cribs draw with their charge lashed on. */
export function cribWired(game: Game, x: number, y: number): boolean {
  const L = MINE_LEVELS.MINE_L3;
  if (game.cur.id !== 'MINE_L3' || !L.cribs) return false;
  const n = L.cribs.findIndex(([cx, cy]) => cx === x && cy === y);
  return n >= 0 && game.progress.mine.wired.includes(n) && game.cur.obj(x, y) === O.CRIB;
}
