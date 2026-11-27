/** Field Photo Album (from the Journal): a grid of all 37 slots, then a framed print card per photo. */
import type { Game } from '../engine/game';
import type { Overlay } from './overlay';
import { panel, inRect } from './panel';
import type { Rect } from './panel';
import { drawText, drawTextCentered, drawTextRight, wrapText } from '../graphics/font';
import { P, hex } from '../graphics/palette';
import { sfx } from '../audio/sfx';
import { CRYPTIDS } from '../data/cryptids';
import { cryptidFrame } from '../graphics/cryptidSprites';
import { goldCount, stampOf, captionOf } from '../engine/album';
import type { Print } from '../engine/album';
import type { MapId } from '../data/mapgen';

const ORDER = ['normal', 'albino', 'static'];
/** Sky / ground for the viewfinder backdrop, by where the shot was taken. */
const BACKDROP: Partial<Record<MapId, [number, number]>> = {
  PINE_TRAIL_AND_ORCHARD: [P.FERN, P.MOSS], CRANBERRY_BOG_AND_SPRINGS: [P.MIST, P.CRAN], OLD_GROWTH_AND_SAWMILL: [P.FOREST, P.PINE],
  RADIO_RIDGE_AND_CROSSROADS: [P.TWILIGHT, P.SHADOW], CABIN_YARD: [P.FERN, P.FOREST], PINE_HOLLOW_TOWN: [P.LANTERN, P.AMBER],
};

export class PhotoAlbum implements Overlay {
  closed = false;
  private idx = 0;
  private mode: 'grid' | 'card' = 'grid';
  private sub = 0;
  private cells: Rect[] = [];

  private prints(game: Game, id: string): Print[] {
    return game.progress.album.filter((p) => p.id === id).sort((a, b) => ORDER.indexOf(a.variant) - ORDER.indexOf(b.variant));
  }

  private cols(game: Game): number { return Math.max(7, Math.min(10, Math.floor((Math.min(game.w - 6, 300) - 12) / 25))); }

  update(game: Game): void {
    const inp = game.input, n = CRYPTIDS.length;
    if (this.mode === 'grid') {
      const cols = this.cols(game);
      const prev = this.idx;
      if (inp.repeat('left')) this.idx = (this.idx + n - 1) % n;
      if (inp.repeat('right')) this.idx = (this.idx + 1) % n;
      if (inp.repeat('up')) this.idx = (this.idx - cols + n * 2) % n;
      if (inp.repeat('down')) this.idx = Math.min(n - 1, this.idx + cols) === this.idx ? 0 : Math.min(n - 1, this.idx + cols);
      if (prev !== this.idx) sfx.blip();
      let open = inp.pressed('a');
      for (const t of inp.taps) {
        const hit = this.cells.findIndex((r) => inRect(r, t.x, t.y));
        if (hit >= 0) { if (hit === this.idx) open = true; this.idx = hit; sfx.blip(); }
      }
      if (open) {
        if (this.prints(game, CRYPTIDS[this.idx].id).length) { this.mode = 'card'; this.sub = 0; sfx.open(); } else sfx.error();
      }
      if (inp.pressed('b')) { this.closed = true; sfx.cancel(); }
      return;
    }
    const prints = this.prints(game, CRYPTIDS[this.idx].id);
    if (inp.repeat('left')) { this.sub = (this.sub + prints.length - 1) % prints.length; sfx.blip(); }
    if (inp.repeat('right') || inp.taps.length) { this.sub = (this.sub + 1) % prints.length; sfx.blip(); }
    const step = (d: number) => {
      for (let k = 1; k <= n; k++) { const j = (this.idx + d * k + n * 2) % n; if (this.prints(game, CRYPTIDS[j].id).length) { this.idx = j; this.sub = 0; sfx.blip(); return; } }
    };
    if (inp.repeat('up')) step(-1);
    if (inp.repeat('down')) step(1);
    if (inp.pressed('b') || inp.pressed('a')) { this.mode = 'grid'; sfx.cancel(); }
  }

  private box(game: Game): Rect {
    const w = Math.min(game.w - 6, 300), h = Math.min(game.h - 30, 200);
    return { x: Math.floor((game.w - w) / 2), y: Math.max(2, Math.floor((game.h - h) / 2) - 10), w, h };
  }

  draw(game: Game, g: CanvasRenderingContext2D): void {
    const B = this.box(game);
    panel(g, B.x, B.y, B.w, B.h, 'paper');
    drawText(g, 'FIELD PHOTO ALBUM', B.x + 5, B.y + 5, P.CRAN);
    const rare = game.progress.album.filter((p) => p.variant !== 'normal').length;
    drawTextRight(g, `${goldCount(game)}/${CRYPTIDS.length} GOLD PRINTS  RARE ${rare}`, B.x + B.w - 5, B.y + 5, P.RUST);
    if (this.mode === 'grid') this.drawGrid(game, g, B); else this.drawCard(game, g, B);
  }

  private drawGrid(game: Game, g: CanvasRenderingContext2D, B: Rect): void {
    const cols = this.cols(game), gap = 3, rowsN = Math.ceil(CRYPTIDS.length / cols);
    // Cells shrink to fit small (phone) screens: room for the grid plus two lines of info.
    const size = Math.max(12, Math.min(22, Math.floor((B.w - 12) / cols) - gap, Math.floor((B.h - 52) / rowsN) - gap));
    const gw = cols * (size + gap) - gap, x0 = B.x + Math.floor((B.w - gw) / 2), y0 = B.y + 16;
    this.cells = [];
    CRYPTIDS.forEach((c, i) => {
      const x = x0 + (i % cols) * (size + gap), y = y0 + Math.floor(i / cols) * (size + gap);
      const r = { x, y, w: size, h: size };
      this.cells.push(r);
      const prints = this.prints(game, c.id);
      const gold = prints.some((p) => p.variant === 'normal');
      const sel = i === this.idx;
      g.fillStyle = hex(sel ? P.RED : gold ? P.AMBER : P.RUST); g.fillRect(x - 1, y - 1, size + 2, size + 2);
      g.fillStyle = hex(prints.length ? P.FOG : P.LANTERN); g.fillRect(x, y, size, size);
      if (prints.length) {
        const v = gold ? 'normal' : prints[0].variant;
        g.drawImage(cryptidFrame(c.id, v, Math.floor(game.time * 2) % 2), x + 1, y + 1, size - 2, size - 2);
        if (prints.some((p) => p.variant === 'albino')) { g.fillStyle = hex(P.MOON); g.fillRect(x + size - 4, y + 1, 3, 3); }
        if (prints.some((p) => p.variant === 'static')) { g.fillStyle = hex(P.MIST); g.fillRect(x + size - 4, y + 5, 3, 3); }
      } else drawTextCentered(g, String(c.num).padStart(2, '0'), x + size / 2, y + Math.floor(size / 2) - 3, P.AMBER);
    });
    const c = CRYPTIDS[this.idx];
    const seen = game.dex[c.id].seen;
    const has = this.prints(game, c.id).length;
    const iy = Math.min(B.y + B.h - 26, y0 + rowsN * (size + gap) + 2);
    drawText(g, `NO.${String(c.num).padStart(2, '0')} ${seen ? c.name.toUpperCase() : '?????'}`, B.x + 6, iy, P.CRAN);
    drawText(g, has ? 'A: VIEW PRINT' : 'NO PRINT YET: EARN 3-STAR GOLD (OR LOG A RARE VARIANT)', B.x + 6, iy + 8, P.RUST);
    drawText(g, 'ARROWS: MOVE  A: VIEW  B: CLOSE', B.x + 5, B.y + B.h - 9, P.RUST);
  }

  private drawCard(game: Game, g: CanvasRenderingContext2D, B: Rect): void {
    const c = CRYPTIDS[this.idx];
    const prints = this.prints(game, c.id);
    const pr = prints[Math.min(this.sub, prints.length - 1)];
    // The print: a white-bordered photo with a viewfinder frame.
    const pw = Math.min(B.w - 20, 150), ph = Math.min(Math.floor(pw * 0.72), B.h - 86);
    const px = B.x + Math.floor((B.w - pw) / 2), py = B.y + 16;
    g.fillStyle = hex(P.VOID); g.fillRect(px - 5, py - 5, pw + 10, ph + 10);
    g.fillStyle = hex(P.FOG); g.fillRect(px - 4, py - 4, pw + 8, ph + 8);
    const [sky, ground] = BACKDROP[pr.map as MapId] ?? [P.AMBER, P.RUST];
    g.fillStyle = hex(sky); g.fillRect(px, py, pw, ph);
    g.fillStyle = hex(ground); g.fillRect(px, py + Math.floor(ph * 0.68), pw, ph - Math.floor(ph * 0.68));
    const s = ph >= 96 ? 3 : 2;
    g.drawImage(cryptidFrame(c.id, pr.variant, Math.floor(game.time * 2) % 2), px + Math.floor(pw / 2 - 12 * s), py + ph - 24 * s - 2, 24 * s, 24 * s);
    // Viewfinder marks: corner brackets, REC, date stamp.
    g.fillStyle = hex(P.FOG);
    for (const [bx, by, dx, dy] of [[px + 3, py + 3, 1, 1], [px + pw - 4, py + 3, -1, 1], [px + 3, py + ph - 4, 1, -1], [px + pw - 4, py + ph - 4, -1, -1]]) {
      g.fillRect(Math.min(bx, bx + dx * 6), by, 7, 1); g.fillRect(bx, Math.min(by, by + dy * 6), 1, 7);
    }
    g.fillStyle = hex(P.RED); g.fillRect(px + 8, py + 8, 3, 3);
    drawText(g, 'REC', px + 13, py + 7, P.FOG);
    // Rarity badge.
    const badge = pr.variant === 'albino' ? ['ALBINO', P.MOON] : pr.variant === 'static' ? ['STATIC', P.MIST] : ['GOLD', P.AMBER];
    const bw = (badge[0] as string).length * 4 + 6;
    g.fillStyle = hex(P.VOID); g.fillRect(px + pw - bw - 5, py + 5, bw + 2, 9);
    g.fillStyle = hex(badge[1] as number); g.fillRect(px + pw - bw - 4, py + 6, bw, 7);
    drawText(g, badge[0] as string, px + pw - bw - 1, py + 7, P.VOID);
    // Stamp and caption.
    let ty = py + ph + 8;
    drawText(g, `NO.${String(c.num).padStart(2, '0')} ${c.name.toUpperCase()}`, B.x + 6, ty, P.CRAN); ty += 8;
    for (const l of stampOf(pr)) { drawText(g, l.toUpperCase(), B.x + 6, ty, P.RUST); ty += 7; }
    for (const l of wrapText(`"${captionOf(pr)}"`, B.w - 12)) { if (ty > B.y + B.h - 17) break; drawText(g, l, B.x + 6, ty, P.SHADOW); ty += 7; }
    drawText(g, prints.length > 1 ? `L/R: PRINT ${this.sub + 1}/${prints.length}  U/D: NEXT  B: BACK` : 'U/D: NEXT PRINT  A/B: BACK', B.x + 5, B.y + B.h - 9, P.RUST);
  }
}
