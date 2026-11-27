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
import { rt, glare, lampLit, lightRadius, banked as bankedCount, torchesHere, TORCH_RADIUS, LISTEN, hazeOn, hazeLevel, carried, banked, lampedProps, spiritsShown, respirator } from './mine';

type Draw = { y: number; fn: () => void };

/** Coal-Chewers, the Foreman, crosscut spirits and dropped tags, depth-sorted with everything else. */
export function mineDrawables(game: Game, g: CanvasRenderingContext2D, cx: number, cy: number, time: number, list: Draw[]): void {
  if (!isMineMap(game.cur.id)) return;
  const shutView = !glare(game);
  for (const e of rt.ents) {
    const sleeping = e.mode === 'sleep';
    const f = Math.floor(e.anim * (e.kind === 'foreman' ? 2 : sleeping ? 1 : 4)) % 2;
    const img = e.kind === 'foreman' ? MO.foreman[f] : MO.chewer[f];
    const dx = Math.round(e.x * 16) + 8 - Math.floor(img.width / 2) - cx, dy = Math.round(e.y * 16) + 16 - img.height - cy;
    list.push({ y: e.y * 16 + 16.2, fn: () => {
      g.globalAlpha = 0.4; g.fillStyle = hex(P.VOID); g.fillRect(dx + 3, dy + img.height - 2, img.width - 6, 2); g.globalAlpha = 1;
      // With the shutter closed you only make them out as shapes.
      if (shutView || sleeping) { g.globalAlpha = sleeping ? 0.7 : 0.55; g.drawImage(img, dx, dy + (sleeping ? 2 : 0)); g.globalAlpha = 1; } else g.drawImage(img, dx, dy);
    } });
  }
  // The ore car under you while you ride it.
  if (rt.ride) {
    const p = game.player, img = MO.rideCart[0];
    list.push({ y: p.y + 16.6, fn: () => g.drawImage(img, Math.round(p.x) - cx, Math.round(p.y) + 6 - cy) });
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
  // Six stepped rings: a soft falloff that still reads as pixel art.
  for (let k = 0; k < 6; k++) {
    g.fillStyle = `rgba(0,0,0,${(0.19 * strength).toFixed(3)})`;
    g.beginPath(); g.arc(Math.round(x), Math.round(y), Math.max(1, Math.round(r * (1 - k * 0.13))), 0, Math.PI * 2); g.fill();
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
  // The headlamp throws forward: a beam where you're facing.
  const [fx, fy] = game.player.dir === 'up' ? [0, -1] : game.player.dir === 'down' ? [0, 1] : game.player.dir === 'left' ? [-1, 0] : [1, 0];
  if (glare(game)) { hole(o, px + fx * R * 0.6, py + fy * R * 0.6, R * 0.78, 0.9); hole(o, px + fx * R * 1.15, py + fy * R * 1.15, R * 0.5, 0.7); }
  // Cave fungus, the man-trip lamp somebody keeps lit.
  const glows: Array<[number, number]> = [];
  for (let ty = Math.max(0, Math.floor(cy / 16) - 2); ty < Math.min(game.cur.h, Math.floor((cy + h) / 16) + 3); ty++)
    for (let tx = Math.max(0, Math.floor(cx / 16) - 2); tx < Math.min(game.cur.w, Math.floor((cx + w) / 16) + 3); tx++)
      if (game.cur.obj(tx, ty) === O.GLOW_FUNGUS) glows.push([tx, ty]);
  for (const [gx, gy] of glows) hole(o, gx * 16 + 8 - cx, gy * 16 + 8 - cy, 26 + Math.sin(time * 1.5 + gx) * 2, 0.75);
  const tripLamp = game.cur.id === 'MINE_L1' && bankedCount(game) >= 1 && !game.progress.mine.sealed;
  if (tripLamp) hole(o, 7 * 16 + 8 - cx, 31 * 16 - 2 - cy, 20 + Math.sin(time * 8) * 1.5, 0.85);
  // The lift lamp, and the little blue flame of the safety lamp at your belt.
  if (L) hole(o, (L.lift[0] + 0.5) * 16 - cx, L.lift[1] * 16 + 2 - cy, 18, 0.7);
  const torches = torchesHere(game);
  for (const [tx, ty] of torches) hole(o, tx * 16 + 8 - cx, ty * 16 - cy, TORCH_RADIUS + Math.sin(time * 9 + tx) * 1.5 + Math.sin(time * 23 + ty), 1);
  hole(o, px + 5, py + 8, 7, 0.6);
  o.globalCompositeOperation = 'source-over';
  g.drawImage(layer!, 0, 0);

  // Tint inside your light: sulfur amber open, phosphor green shut; coal-dust haze over everything.
  const open = glare(game);
  for (const [gx, gy] of glows) { const [r, gg, b] = rgbOf(P.FERN); g.fillStyle = `rgba(${r},${gg},${b},0.08)`; g.beginPath(); g.arc(gx * 16 + 8 - cx, gy * 16 + 8 - cy, 22, 0, Math.PI * 2); g.fill(); }
  if (tripLamp) { g.fillStyle = hex(P.LANTERN); g.fillRect(7 * 16 + 7 - cx, 31 * 16 - 4 - cy, 2, 3); }
  // Dust motes drifting through the beam.
  if (open) {
    g.fillStyle = hex(P.FOG);
    for (let k = 0; k < 18; k++) {
      const a = k * 2.399 + time * 0.07 * (1 + (k % 3)), rr = (R * 0.9) * (((k * 37) % 100) / 100);
      const mx = px + fx * R * 0.5 + Math.cos(a) * rr, my = py + fy * R * 0.5 + Math.sin(a) * rr * 0.8 + Math.sin(time * 0.6 + k) * 3;
      g.globalAlpha = 0.18 + 0.12 * Math.sin(time * 2 + k); g.fillRect(Math.round(mx), Math.round(my), 1, 1);
    }
    g.globalAlpha = 1;
  }
  // Water dripping from the seeps you can see.
  for (let ty = Math.max(0, game.player.ty - 6); ty <= game.player.ty + 6; ty++) for (let tx = game.player.tx - 7; tx <= game.player.tx + 7; tx++) {
    if (game.cur.obj(tx, ty) !== O.SEEP || Math.hypot(tx - game.player.tx, ty - game.player.ty) * 16 > R + 10) continue;
    const ph = (time * 0.9 + tx * 0.37) % 1;
    g.fillStyle = hex(P.MIST); g.fillRect(tx * 16 + 8 - cx, ty * 16 + 2 + Math.floor(ph * 10) - cy, 1, 2);
  }
  // Torchlight: warm and wide, red at the edges.
  const [qr, qg, qb] = rgbOf(P.AMBER);
  for (const [tx, ty] of torches) {
    g.fillStyle = `rgba(${qr},${qg},${qb},${(0.1 + Math.sin(time * 11 + tx) * 0.02).toFixed(3)})`;
    g.beginPath(); g.arc(tx * 16 + 8 - cx, ty * 16 - cy, Math.round(TORCH_RADIUS * 0.75), 0, Math.PI * 2); g.fill();
  }
  // Warm stepped glow from the carbide flame (amber at the edge, lantern-white close in); phosphor green when shut.
  const rings: Array<[number, number, number]> = open ? [[P.AMBER, 0.85, 0.035], [P.AMBER, 0.6, 0.035], [P.LANTERN, 0.35, 0.04]] : [[P.MOSS, 0.9, 0.05], [P.FERN, 0.55, 0.05]];
  for (const [c, f, a] of rings) { const [tr, tg, tb] = rgbOf(c); g.fillStyle = `rgba(${tr},${tg},${tb},${a})`; g.beginPath(); g.arc(Math.round(px), Math.round(py), Math.round(R * f), 0, Math.PI * 2); g.fill(); }
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
    if (e.kind === 'chewer' && e.mode === 'sleep' && d < 7) drawText(g, Math.floor(time * 1.5) % 2 ? 'z' : 'Z', ex + 6, ey - 12 - (Math.floor(time * 3) % 3), P.MIST);
    if (e.kind === 'foreman') {
      // Embers rising off the slag on him.
      for (let k = 0; k < 5; k++) {
        const ph = (time * 0.6 + k * 0.21) % 1;
        g.globalAlpha = (1 - ph) * 0.8; g.fillStyle = hex(k % 2 ? P.RED : P.AMBER);
        g.fillRect(ex - 6 + ((k * 5) % 12), ey + 8 - Math.floor(ph * 24), 1, 1);
      }
      g.globalAlpha = 1;
      // The shape at the edge of sight: there while you look away, gone when you look at him.
      const facing = (e.x - p.tx) * fx + (e.y - p.ty) * fy;
      if (d > R / 16 + 1 && d < 20 && facing < d * 0.4 && Math.sin(time * 0.7 + e.anim) > 0.1) {
        g.globalAlpha = 0.16 + 0.06 * Math.sin(time * 3);
        g.drawImage(MO.foremanShape[0], ex - 12, ey + 16 - 34);
        g.globalAlpha = 1;
      }
    }
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
    rt.nearGas || hazeOn(game) || rt.sulkQuiet ? MHUD.canaryQuiet : MHUD.canary,
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
