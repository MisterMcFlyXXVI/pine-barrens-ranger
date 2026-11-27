/** Ranger Elias Vance's half-burned Field Journal: readable lore that fills in as torn pages are found. */
import type { Game } from '../engine/game';
import type { Overlay } from './overlay';
import { JOURNAL_PAGES, rangerLog } from '../data/campaign';
import type { LogEntry } from '../data/campaign';
import { dexTotals } from '../engine/dex';
import { MAP_NAMES } from '../data/maps';
import { drawText, drawTextCentered, drawTextRight, wrapText } from '../graphics/font';
import { hex, P } from '../graphics/palette';
import { sfx } from '../audio/sfx';
import { panel } from './panel';
import { drawClipped, More, tapMore } from './readMore';

/** Your own log, as far as the story has gone. */
function logFor(game: Game): LogEntry[] {
  const p = game.progress;
  return rangerLog(p.reason, (k) => k === 'logged' ? dexTotals(game.dex).logged > 0
    : k === 'inspector' ? p.flags.has('inspector_done')
      : k === 'festival' ? p.flags.has('ridge_map')
        : k === 'wardens' ? p.act >= 4
          : k === 'finale' ? p.flags.has('finale') : false);
}

/** The cabin journal: your ranger's log first, then Elias Vance's half-burned field journal. */
export class VanceJournal implements Overlay {
  closed = false;
  private page = 0;
  private more: More | null = null;

  update(game: Game): void {
    const inp = game.input;
    const n = logFor(game).length + JOURNAL_PAGES.length;
    let d = 0;
    if (inp.repeat('left') || inp.repeat('up')) d = -1;
    if (inp.repeat('right') || inp.repeat('down') || inp.pressed('a')) d = 1;
    for (const t of inp.taps) { if (tapMore(game, [this.more], t)) return; d = t.x < game.w / 2 ? -1 : 1; }
    if (d) { this.page = (this.page + d + n) % n; sfx.blip(); }
    if (inp.pressed('b') || inp.pressed('dex')) { this.closed = true; sfx.cancel(); }
  }

  draw(game: Game, g: CanvasRenderingContext2D): void {
    const w = Math.min(game.w - 8, 236), h = Math.min(game.h - 30, 150);
    const x = Math.floor((game.w - w) / 2), y = Math.max(2, Math.floor((game.h - h) / 2) - 10);
    panel(g, x, y, w, h, 'paper');
    // burned edges
    g.fillStyle = hex(P.SHADOW);
    for (let i = 0; i < w; i += 3) { const k = (i * 7) % 5; g.fillRect(x + i, y + h - 3 - k, 3, 1 + k); }
    const log = logFor(game);
    const total = log.length + JOURNAL_PAGES.length;
    if (this.page >= total) this.page = 0;
    if (this.page < log.length) {
      // Your own entries, in your handwriting.
      const e = log[this.page];
      drawText(g, 'MY FIRE-WATCH LOG', x + 5, y + 5, P.TWILIGHT);
      drawTextRight(g, `ENTRY ${this.page + 1}/${log.length}`, x + w - 5, y + 5, P.TWILIGHT);
      g.fillStyle = hex(P.TWILIGHT); g.fillRect(x + 4, y + 13, w - 8, 1);
      drawText(g, e.title.toUpperCase().slice(0, Math.floor((w - 10) / 4)), x + 5, y + 17, P.TWILIGHT);
      this.more = drawClipped(g, e.text, x + 6, y + 27, w - 12, Math.floor((h - 44) / 7), 7, P.SHADOW, e.title, undefined, true);
      drawText(g, `< PAGE ${this.page + 1}/${total} >   B: CLOSE`, x + 5, y + h - 12, P.RUST);
      return;
    }
    const pg = JOURNAL_PAGES[this.page - log.length];
    const found = game.progress.pages.has(pg.id);
    const count = [...game.progress.pages].filter((p) => p > 0).length;
    drawText(g, 'FIELD JOURNAL -- E. VANCE', x + 5, y + 5, P.CRAN);
    drawTextRight(g, `${count}/${JOURNAL_PAGES.length - 1} PAGES`, x + w - 5, y + 5, P.RUST);
    g.fillStyle = hex(P.RUST); g.fillRect(x + 4, y + 13, w - 8, 1);
    if (found) {
      drawText(g, pg.title.toUpperCase().slice(0, Math.floor((w - 10) / 4)), x + 5, y + 17, P.CRAN);
      this.more = drawClipped(g, pg.text, x + 6, y + 27, w - 12, Math.floor((h - 44) / 7), 7, P.SHADOW, pg.title, undefined, true);
    } else {
      this.more = null;
      drawTextCentered(g, '[ PAGE TORN OUT ]', x + w / 2, y + h / 2 - 12, P.RUST);
      const hint = pg.map ? `Somewhere in ${MAP_NAMES[pg.map]}. Look for a fluttering scrap of paper.` : '';
      wrapText(hint, w - 20).forEach((l, i) => drawTextCentered(g, l, x + w / 2, y + h / 2 + i * 7, P.AMBER));
    }
    drawText(g, `< PAGE ${this.page + 1}/${total} >   B: CLOSE`, x + 5, y + h - 12, P.RUST);
  }
}
