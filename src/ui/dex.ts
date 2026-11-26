/** Cryptid-Dex (Tab): list with silhouettes + mastery stars, detail page with Rare Variant toggles. */
import type { Game } from '../engine/game';
import type { Overlay } from './overlay';
import { CRYPTIDS, CryptidDef, Variant } from '../data/cryptids';
import { MAP_NAMES } from '../data/maps';
import { ITEMS } from '../data/items';
import { cryptidFrame, cryptidSilhouette } from '../graphics/cryptidSprites';
import { drawText, drawTextCentered, drawTextRight, wrapText } from '../graphics/font';
import { hex, P } from '../graphics/palette';
import { sfx } from '../audio/sfx';
import { dexTotals, stars } from '../engine/dex';
import { drawStar } from '../engine/encounter';
import { panel, inRect, Rect } from './panel';
import { JournalMenu } from './menus';
import { touchOn } from '../util';

const VARIANTS: Variant[] = ['normal', 'albino', 'static'];
const SHORT_MAP: Record<string, string> = {
  CABIN_YARD: 'Cabin Yard', PINE_TRAIL_AND_ORCHARD: 'Pine Trail', CRANBERRY_BOG_AND_SPRINGS: 'Cranberry Glades',
  OLD_GROWTH_AND_SAWMILL: 'Old Growth', RADIO_RIDGE_AND_CROSSROADS: 'Radio Ridge',
};

function habitat(c: CryptidDef): string {
  const maps = c.maps.map((m) => SHORT_MAP[m] ?? MAP_NAMES[m]).join(' / ');
  return c.zones ? `${maps} (${c.zones.join(', ')})` : maps;
}

function when(c: CryptidDef): string {
  const t = c.times === 'ANY' ? 'Any time' : c.times.map((x) => (x === 'WITCHING' ? 'Witching Hr' : x[0] + x.slice(1).toLowerCase())).join(', ');
  const w = c.weather === 'ANY' ? 'any weather' : c.weather.map((x) => x.toLowerCase()).join('/');
  let s = `${t}; ${w}`;
  if (c.stormAnyTime) s += ' (or any storm)';
  if (c.fullMoon) s += '; FULL MOON only';
  return s;
}

export class DexMenu implements Overlay {
  closed = false;
  private idx = 0;
  private scroll = 0;
  private mode: 'list' | 'detail' = 'list';
  private variant = 0;

  private box(game: Game): Rect {
    const w = Math.min(game.w - 6, 300), h = Math.min(game.h - 30, 200);
    return { x: Math.floor((game.w - w) / 2), y: Math.max(2, Math.floor((game.h - h) / 2) - 10), w, h };
  }

  private rows(game: Game): number {
    return Math.max(4, Math.floor((this.box(game).h - 30) / 13));
  }

  update(game: Game): void {
    const inp = game.input;
    const n = CRYPTIDS.length;
    if (inp.pressed('dex')) { this.closed = true; sfx.open(); game.openOverlay(new JournalMenu()); return; }
    if (this.mode === 'list') {
      const prev = this.idx;
      if (inp.repeat('up')) this.idx = (this.idx + n - 1) % n;
      if (inp.repeat('down')) this.idx = (this.idx + 1) % n;
      if (inp.repeat('left')) this.idx = Math.max(0, this.idx - this.rows(game));
      if (inp.repeat('right')) this.idx = Math.min(n - 1, this.idx + this.rows(game));
      if (prev !== this.idx) sfx.blip();
      let open = inp.pressed('a');
      const B = this.box(game);
      for (const t of inp.taps) {
        if (!inRect(B, t.x, t.y)) { this.closed = true; sfx.cancel(); return; }
        const row = Math.floor((t.y - (B.y + 16)) / 13);
        if (row >= 0 && row < this.rows(game)) { const i = this.scroll + row; if (i < n) { if (i === this.idx) open = true; this.idx = i; } }
      }
      if (open) { this.mode = 'detail'; this.variant = 0; sfx.confirm(); }
      if (inp.pressed('b')) { this.closed = true; sfx.cancel(); }
    } else {
      if (inp.repeat('up')) { this.idx = (this.idx + n - 1) % n; this.variant = 0; sfx.blip(); }
      if (inp.repeat('down')) { this.idx = (this.idx + 1) % n; this.variant = 0; sfx.blip(); }
      if (inp.repeat('left')) { this.variant = (this.variant + 2) % 3; sfx.blip(); }
      if (inp.repeat('right') || inp.pressed('a') || inp.taps.length) { this.variant = (this.variant + 1) % 3; sfx.blip(); }
      if (inp.pressed('b')) { this.mode = 'list'; sfx.cancel(); }
    }
    const rows = this.rows(game);
    if (this.idx < this.scroll) this.scroll = this.idx;
    if (this.idx >= this.scroll + rows) this.scroll = this.idx - rows + 1;
  }

  draw(game: Game, g: CanvasRenderingContext2D): void {
    const B = this.box(game);
    panel(g, B.x, B.y, B.w, B.h, 'paper');
    const tot = dexTotals(game.dex);
    if (this.mode === 'list') this.drawList(game, g, B, tot);
    else this.drawDetail(game, g, B);
  }

  private drawList(game: Game, g: CanvasRenderingContext2D, B: Rect, tot: ReturnType<typeof dexTotals>): void {
    drawText(g, 'CRYPTID-DEX', B.x + 5, B.y + 5, P.CRAN);
    drawTextRight(g, `LOGGED ${tot.logged}/${CRYPTIDS.length}  RARE ${tot.rare}/${CRYPTIDS.length}  ${tot.entries}/${CRYPTIDS.length * 2}`, B.x + B.w - 5, B.y + 5, P.RUST);
    const rows = this.rows(game);
    for (let r = 0; r < rows; r++) {
      const i = this.scroll + r;
      if (i >= CRYPTIDS.length) break;
      const c = CRYPTIDS[i];
      const e = game.dex[c.id];
      const y = B.y + 16 + r * 13;
      const sel = i === this.idx;
      if (sel) { g.fillStyle = hex(P.AMBER); g.fillRect(B.x + 3, y - 1, B.w - 6, 13); }
      const spr = e.logged ? cryptidFrame(c.id, 'normal', Math.floor(game.time * 2) % 2) : e.seen ? cryptidSilhouette(c.id) : null;
      if (spr) g.drawImage(spr, B.x + 5, y - 1, 12, 12);
      else { g.fillStyle = hex(P.RUST); g.fillRect(B.x + 7, y + 1, 8, 8); drawText(g, '?', B.x + 10, y + 2, P.LANTERN); }
      drawText(g, `${String(c.num).padStart(2, '0')}`, B.x + 20, y + 3, sel ? P.VOID : P.RUST);
      drawText(g, e.seen ? c.name : e.rumor ? '(RUMORED)' : '?????', B.x + 32, y + 3, sel ? P.VOID : e.logged ? P.CRAN : P.RUST);
      const st = stars(e);
      for (let k = 0; k < 3; k++) drawStar(g, B.x + B.w - 46 + k * 7, y + 3, k < st, P.RED, sel ? P.LANTERN : P.AMBER);
      if (e.albino) { g.fillStyle = hex(P.FOG); g.fillRect(B.x + B.w - 22, y + 3, 4, 5); }
      if (e.static) { g.fillStyle = hex(P.MIST); g.fillRect(B.x + B.w - 16, y + 3, 4, 5); }
      drawText(g, `T${c.tier}`, B.x + B.w - 11, y + 3, P.VIOLET);
    }
    // scrollbar
    const track = rows * 13, th = Math.max(6, Math.floor((track * rows) / CRYPTIDS.length));
    g.fillStyle = hex(P.RUST);
    g.fillRect(B.x + B.w - 3, B.y + 16 + Math.floor(((track - th) * this.scroll) / Math.max(1, CRYPTIDS.length - rows)), 1, th);
    drawText(g, touchOn() ? 'A: DETAILS  L/R: PAGE  DEX: JOURNAL  B: CLOSE' : 'A: DETAILS  L/R: PAGE  TAB: JOURNAL  B: CLOSE', B.x + 5, B.y + B.h - 9, P.RUST);
  }

  private drawDetail(game: Game, g: CanvasRenderingContext2D, B: Rect): void {
    const c = CRYPTIDS[this.idx];
    const e = game.dex[c.id];
    const st = stars(e);
    const v = VARIANTS[this.variant];
    const loggedV = v === 'normal' ? e.logged : e[v];
    drawText(g, `NO.${String(c.num).padStart(2, '0')} ${e.seen ? c.name : '?????'}`, B.x + 5, B.y + 5, P.CRAN);
    drawTextRight(g, `TIER ${c.tier}`, B.x + B.w - 5, B.y + 5, P.VIOLET);
    // Portrait frame
    const s = B.h >= 170 ? 3 : 2;
    const fw = 24 * s + 8;
    g.fillStyle = hex(P.RUST); g.fillRect(B.x + 5, B.y + 15, fw, fw);
    g.fillStyle = hex(v === 'albino' ? P.TWILIGHT : v === 'static' ? P.SHADOW : P.FOG); g.fillRect(B.x + 6, B.y + 16, fw - 2, fw - 2);
    const spr = loggedV ? cryptidFrame(c.id, v, Math.floor(game.time * 2) % 2) : e.seen ? cryptidSilhouette(c.id) : null;
    if (spr) g.drawImage(spr, B.x + 9, B.y + 19, 24 * s, 24 * s);
    else drawTextCentered(g, '?', B.x + 5 + fw / 2, B.y + 15 + fw / 2 - 2, P.RUST, undefined, 2);
    const vy = B.y + 17 + fw;
    ['NORMAL', 'ALBINO', 'STATIC'].forEach((label, i) => {
      const have = i === 0 ? e.logged : i === 1 ? e.albino : e.static;
      const sel = i === this.variant;
      drawText(g, (sel ? '>' : ' ') + label, B.x + 5, vy + i * 8, sel ? P.CRAN : have ? P.RUST : P.AMBER);
      if (have) { g.fillStyle = hex(P.FOREST); g.fillRect(B.x + 35, vy + i * 8 + 1, 3, 3); }
    });
    for (let k = 0; k < 3; k++) drawStar(g, B.x + 5 + k * 7, vy + 26, k < st, P.RED, P.AMBER);
    drawText(g, ['UNSEEN', 'SIGHTING', 'BEHAVIOR', 'GOLD'][st], B.x + 28, vy + 26, P.RUST);

    // Notes column
    const nx = B.x + fw + 10, nw = B.x + B.w - 5 - nx;
    let ny = B.y + 16;
    const para = (label: string, text: string, color: number = P.RUST) => {
      const lines = wrapText(`${label}${text}`, nw);
      for (const l of lines) { if (ny > B.y + B.h - 18) return; drawText(g, l, nx, ny, color); ny += 7; }
      ny += 2;
    };
    const archived = game.progress.archiveRead && c.tier === 4;
    if (!e.seen) {
      if (e.rumor || archived) {
        para('RUMOR: ', `Townsfolk speak of something ${habitat(c).toLowerCase()} way.`, P.CRAN);
        para('ACTIVE: ', when(c));
        if (archived) para('ARCHIVE: ', c.summon ? `Summoned via ${c.summon === 'totems' ? '3 Lure Totems at dusk' : c.summon === 'chime' ? 'a Bone & Antler Chime' : 'a Copper Lightning Rod in storms'}.` : c.notes);
      } else para('', 'No sighting yet. Explore tall grass, bog reeds, ferns, shallow water and fog at different times and weather. Townsfolk rumors help.');
    } else {
      para('', c.look, P.CRAN);
      para('HABITAT: ', habitat(c));
      para('ACTIVE: ', c.summon && st < 2 && !archived ? '??? (a summoning ritual -- see the Archive)' : when(c));
      para('LURE: ', st >= 2 ? c.lures.map((l) => ITEMS[l]?.name ?? l).join(', ') : '??? (observe its behavior)');
      para('STANCES: ', st >= 2 ? c.stances.join(', ') : '???');
      para('NOTES: ', st >= 2 ? c.notes : 'Earn a 2-Star entry (favorite bait, a stance counter, or a Plaster Cast) to learn more.');
      if (e.logged) para('SPECIMEN: ', c.drop.name, P.FOREST);
      para('ENCOUNTERS: ', String(e.encounters), P.AMBER);
    }
    drawText(g, 'L/R: VARIANT  U/D: NEXT  B: LIST', B.x + 5, B.y + B.h - 9, P.RUST);
  }
}
