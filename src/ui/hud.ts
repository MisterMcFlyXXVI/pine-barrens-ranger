/** Overworld HUD: hotbar, clock/gold panel, energy bar, prompts, toasts, banners. */
import type { Game } from '../engine/game';
import { drawText, drawTextCentered, drawTextRight, textWidth, wrapText } from '../graphics/font';
import { hex, P } from '../graphics/palette';
import { ICON } from '../graphics/sprites';
import { ITEMS } from '../data/items';
import { HOTBAR_SIZE } from '../engine/inventory';
import { panel, slotBox, bar, inRect, Rect } from './panel';

export const SLOT = 18;

export function hotbarRects(game: Game): Rect[] {
  const total = HOTBAR_SIZE * SLOT + (HOTBAR_SIZE - 1);
  const x0 = Math.floor((game.w - total) / 2);
  const y0 = game.h - SLOT - 3;
  return Array.from({ length: HOTBAR_SIZE }, (_, i) => ({ x: x0 + i * (SLOT + 1), y: y0, w: SLOT, h: SLOT }));
}

export function hotbarHit(game: Game, x: number, y: number): number {
  const rects = hotbarRects(game);
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (inRect({ x: r.x - 1, y: r.y - 3, w: r.w + 2, h: r.h + 6 }, x, y)) return i;
  }
  return -1;
}

export function drawItemSlot(game: Game, g: CanvasRenderingContext2D, r: Rect, idx: number, selected: boolean, label?: string): void {
  slotBox(g, r.x, r.y, r.w, selected, game.time);
  const st = game.inv.slots[idx];
  if (st) {
    const icon = ICON[st.id];
    const bob = selected ? Math.round(Math.sin(game.time * 6) * 0.6) : 0;
    if (icon) g.drawImage(icon, r.x + 1, r.y + 1 + bob);
    if (st.n > 1) drawTextRight(g, String(st.n), r.x + r.w - 1, r.y + r.h - 6, P.FOG, P.VOID);
    if (ITEMS[st.id].tool === 'can') bar(g, r.x + 2, r.y + r.h - 4, r.w - 4, 3, game.water / game.maxWater, P.MIST);
  }
  if (label) drawText(g, label, r.x + 1, r.y + 1, P.MIST);
}

export function drawHud(game: Game, g: CanvasRenderingContext2D): void {
  const W = game.w;

  // ---- Hotbar ----
  const rects = hotbarRects(game);
  const bx = rects[0].x - 2, by = rects[0].y - 2;
  panel(g, bx, by, rects[8].x + SLOT + 2 - bx, SLOT + 4);
  rects.forEach((r, i) => drawItemSlot(game, g, r, i, i === game.sel, String(i + 1)));

  // ---- Clock / gold panel (top-right) ----
  const pw = 62, ph = 32;
  const px = W - pw - 3, py = 3;
  panel(g, px, py, pw, ph);
  const c = game.clock;
  drawText(g, `${c.season.slice(0, 3)} ${c.dayOfSeason} ${c.weekday}`, px + 4, py + 4, P.FOG);
  const phase = c.phase();
  const iconC = phase === 'day' ? P.LANTERN : phase === 'dusk' ? P.AMBER : phase === 'night' ? P.MOON : P.RED;
  g.fillStyle = hex(iconC);
  g.fillRect(px + 4, py + 12, 4, 4);
  if (phase !== 'day') { g.fillStyle = hex(P.SHADOW); g.fillRect(px + 6, py + 12, 2, 2); }
  drawText(g, c.timeLabel(), px + 11, py + 12, P.LANTERN);
  drawText(g, '}', px + 4, py + 21, P.AMBER);
  drawText(g, `${game.gold}G`, px + 10, py + 21, P.LANTERN);

  // Energy bar
  const ey = py + ph + 2;
  panel(g, px, ey, pw, 11);
  drawText(g, '{', px + 4, ey + 3, P.RED);
  const frac = game.stamina / game.maxStamina;
  bar(g, px + 10, ey + 3, pw - 14, 5, frac, frac > 0.5 ? P.FERN : frac > 0.25 ? P.AMBER : P.RED);
  drawText(g, c.phaseLabel(), px, ey + 13, phase === 'witching' ? P.RED : P.MIST, P.VOID);

  // ---- Location banner ----
  if (game.banner.t > 0) {
    const a = Math.min(1, game.banner.t);
    g.globalAlpha = a;
    const tw = textWidth(game.banner.text) + 12;
    const bx2 = Math.floor((W - tw) / 2);
    panel(g, bx2, 30, tw, 12);
    drawTextCentered(g, game.banner.text, W / 2, 34, P.LANTERN);
    g.globalAlpha = 1;
  }

  // ---- Selected item name / prompt ----
  const above = by - 10;
  const st = game.selected;
  if (game.selFlash > 0 && st) {
    g.globalAlpha = Math.min(1, game.selFlash * 2);
    drawTextCentered(g, ITEMS[st.id].name, W / 2, above, P.LANTERN, P.VOID);
    g.globalAlpha = 1;
  } else if (game.prompt) {
    const label = `A: ${game.prompt}`;
    const tw = textWidth(label) + 8;
    panel(g, Math.floor((W - tw) / 2), above - 3, tw, 11);
    drawTextCentered(g, label, W / 2, above, P.FERN);
  }

  // ---- Toasts ----
  let ty = above - 14;
  for (let i = game.toasts.length - 1; i >= 0; i--) {
    const t = game.toasts[i];
    const lines = wrapText(t.text, Math.min(W - 20, 220));
    const tw = Math.max(...lines.map((l) => textWidth(l))) + 10;
    const th = lines.length * 7 + 5;
    ty -= th;
    g.globalAlpha = Math.min(1, t.t * 2);
    panel(g, Math.floor((W - tw) / 2), ty, tw, th);
    lines.forEach((l, k) => drawTextCentered(g, l, W / 2, ty + 3 + k * 7, P.FOG));
    g.globalAlpha = 1;
    ty -= 2;
  }
}
