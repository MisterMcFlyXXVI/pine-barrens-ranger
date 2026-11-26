/**
 * "Tap to read more": wherever a box has to cut text short, it draws a MORE tag
 * and remembers the full text; tapping the cut-off text (or the tag) opens a
 * TextPopup with everything, scrollable with the D-pad.
 */
import type { Game } from '../engine/game';
import type { Overlay } from './overlay';
import { drawText, drawTextRight, wrapText, GLYPH_W } from '../graphics/font';
import { hex, P } from '../graphics/palette';
import { sfx } from '../audio/sfx';
import { inRect, panel, Rect } from './panel';

export interface Para { text: string; color?: number }

/** A tappable region whose full text didn't fit. */
export interface More { rect: Rect; title: string; body: Para[] }

/** Full-text popup. Tap / A / B closes; Up/Down scroll long text. */
export class TextPopup implements Overlay {
  closed = false;
  private scroll = 0;
  private t = 0;

  constructor(private readonly title: string, private readonly body: Para[]) {}

  private box(game: Game): Rect & { lines: Array<{ text: string; color: number }>; rows: number } {
    const w = Math.min(game.w - 12, 240);
    const lines: Array<{ text: string; color: number }> = [];
    this.body.forEach((p, i) => {
      if (i > 0) lines.push({ text: '', color: P.RUST });
      for (const l of wrapText(p.text, w - 12)) lines.push({ text: l, color: p.color ?? P.SHADOW });
    });
    const rows = Math.max(1, Math.min(lines.length, Math.floor((game.h - 40) / 8)));
    const h = rows * 8 + 30;
    return { x: Math.floor((game.w - w) / 2), y: Math.floor((game.h - h) / 2), w, h, lines, rows };
  }

  update(game: Game, dt: number): void {
    this.t += dt;
    const inp = game.input;
    const B = this.box(game);
    const maxScroll = Math.max(0, B.lines.length - B.rows);
    if (inp.repeat('down')) this.scroll = Math.min(maxScroll, this.scroll + 1);
    if (inp.repeat('up')) this.scroll = Math.max(0, this.scroll - 1);
    for (const t of inp.taps) {
      // Long text: tapping the top / bottom quarter of the box scrolls; anywhere else closes.
      if (maxScroll && inRect(B, t.x, t.y) && t.y < B.y + B.h * 0.25 && this.scroll > 0) { this.scroll = Math.max(0, this.scroll - B.rows + 1); sfx.blip(); continue; }
      if (maxScroll && inRect(B, t.x, t.y) && t.y > B.y + B.h * 0.75 && this.scroll < maxScroll) { this.scroll = Math.min(maxScroll, this.scroll + B.rows - 1); sfx.blip(); continue; }
      if (this.t > 0.15) { this.closed = true; sfx.cancel(); }
    }
    if ((inp.pressed('a') || inp.pressed('b')) && this.t > 0.15) { this.closed = true; sfx.cancel(); }
  }

  draw(game: Game, g: CanvasRenderingContext2D): void {
    g.globalAlpha = 0.55;
    g.fillStyle = hex(P.VOID);
    g.fillRect(0, 0, game.w, game.h);
    g.globalAlpha = 1;
    const B = this.box(game);
    panel(g, B.x, B.y, B.w, B.h, 'paper');
    drawText(g, this.title.toUpperCase().slice(0, Math.floor((B.w - 10) / GLYPH_W)), B.x + 5, B.y + 5, P.CRAN);
    g.fillStyle = hex(P.AMBER); g.fillRect(B.x + 4, B.y + 12, B.w - 8, 1);
    B.lines.slice(this.scroll, this.scroll + B.rows).forEach((l, k) => drawText(g, l.text, B.x + 6, B.y + 16 + k * 8, l.color));
    const maxScroll = Math.max(0, B.lines.length - B.rows);
    const foot = maxScroll ? `U/D: SCROLL ${this.scroll + 1}-${Math.min(B.lines.length, this.scroll + B.rows)}/${B.lines.length}` : '';
    if (foot) drawText(g, foot, B.x + 5, B.y + B.h - 10, P.RUST);
    drawTextRight(g, 'TAP OR B: CLOSE', B.x + B.w - 5, B.y + B.h - 10, P.RUST);
  }
}

/** Small "MORE" tag (drawn bottom-right of a clipped block). Returns its rect. */
export function drawMoreTag(g: CanvasRenderingContext2D, right: number, y: number, bg: number = P.CRAN, fg: number = P.LANTERN): Rect {
  const w = 4 * GLYPH_W + 3;
  const r = { x: right - w, y: y - 1, w, h: 7 };
  g.fillStyle = hex(bg); g.fillRect(r.x, r.y, r.w, r.h);
  drawText(g, 'MORE', r.x + 2, y, fg);
  return r;
}

/**
 * Draw `text` wrapped into at most `maxLines` lines. If it doesn't fit, the last
 * line is shortened, a MORE tag is drawn, and a More (tap target over the whole
 * block) is returned; otherwise null.
 */
export function drawClipped(
  g: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, maxLines: number, lineH: number,
  color: number, title: string, tagColors?: [number, number], tagOnly = false,
): More | null {
  const lines = wrapText(text, w);
  const fits = lines.length <= maxLines;
  const shown = lines.slice(0, Math.max(1, maxLines));
  if (!fits) {
    const room = Math.floor((w - (4 * GLYPH_W + 5)) / GLYPH_W);
    const last = shown.length - 1;
    shown[last] = shown[last].slice(0, Math.max(1, room - 2)) + '..';
  }
  shown.forEach((l, k) => drawText(g, l, x, y + k * lineH, color));
  if (fits) return null;
  const tag = drawMoreTag(g, x + w, y + (shown.length - 1) * lineH, ...(tagColors ?? []));
  // tagOnly: where taps on the text already mean something else, only the (finger-padded) tag opens it.
  const rect = tagOnly ? { x: tag.x - 8, y: tag.y - 8, w: tag.w + 16, h: tag.h + 16 } : { x: x - 2, y: y - 2, w: w + 4, h: shown.length * lineH + 3 };
  return { rect, title, body: [{ text }] };
}

/** If a tap landed on one of `mores`, open its popup and return true. */
export function tapMore(game: Game, mores: ReadonlyArray<More | null>, t: { x: number; y: number }): boolean {
  for (const m of mores) {
    if (m && inRect(m.rect, t.x, t.y)) {
      sfx.open();
      game.openOverlay(new TextPopup(m.title, m.body));
      return true;
    }
  }
  return false;
}
