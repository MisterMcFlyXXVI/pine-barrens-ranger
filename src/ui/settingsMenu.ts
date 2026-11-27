/** Settings screen (title screen and Journal): text speed, music & sound volume, screen shake. */
import type { Game } from '../engine/game';
import type { Overlay } from './overlay';
import { panel, inRect } from './panel';
import type { Rect } from './panel';
import { drawText, drawTextCentered, drawTextRight } from '../graphics/font';
import { P, hex } from '../graphics/palette';
import { sfx } from '../audio/sfx';
import { settings, setSettings, TEXT_SPEEDS } from '../engine/settings';

type Row = 'text' | 'music' | 'sfx' | 'shake' | 'done';
const ROWS: Row[] = ['text', 'music', 'sfx', 'shake', 'done'];
const LABEL: Record<Row, string> = { text: 'TEXT SPEED', music: 'MUSIC', sfx: 'SOUND FX', shake: 'SCREEN SHAKE', done: 'DONE' };
const ROW_H = 14;

export class SettingsMenu implements Overlay {
  closed = false;
  private row = 0;
  private rects: Array<{ row: Row; r: Rect; track?: Rect }> = [];

  constructor(private readonly onClose: () => void = () => undefined) {}

  private adjust(row: Row, d: number): void {
    const s = settings();
    if (row === 'text') {
      const i = TEXT_SPEEDS.indexOf(s.textSpeed);
      setSettings({ textSpeed: TEXT_SPEEDS[Math.max(0, Math.min(TEXT_SPEEDS.length - 1, i + d))] });
    } else if (row === 'music') setSettings({ music: s.music + d * 10 });
    else if (row === 'sfx') setSettings({ sfx: s.sfx + d * 10 });
    else if (row === 'shake') setSettings({ shake: !s.shake });
    else return;
    sfx.blip();
  }

  private close(): void { this.closed = true; sfx.cancel(); this.onClose(); }

  update(game: Game): void {
    const inp = game.input;
    // Taps: sliders set directly; other rows step left/right by which half you touched.
    for (const t of inp.taps) {
      const hit = this.rects.find((h) => inRect(h.r, t.x, t.y));
      if (!hit) continue;
      this.row = ROWS.indexOf(hit.row);
      if (hit.row === 'done') { this.close(); return; }
      if (hit.track && t.x >= hit.track.x - 4) {
        const v = Math.round(((t.x - hit.track.x) / hit.track.w) * 10) * 10;
        setSettings(hit.row === 'music' ? { music: v } : { sfx: v });
        sfx.blip();
      } else this.adjust(hit.row, t.x < hit.r.x + hit.r.w / 2 ? -1 : 1);
    }
    if (inp.repeat('up')) { this.row = (this.row + ROWS.length - 1) % ROWS.length; sfx.blip(); }
    if (inp.repeat('down')) { this.row = (this.row + 1) % ROWS.length; sfx.blip(); }
    const row = ROWS[this.row];
    if (inp.repeat('left')) this.adjust(row, -1);
    if (inp.repeat('right')) this.adjust(row, 1);
    if (inp.pressed('a')) { if (row === 'done') { this.close(); return; } this.adjust(row, row === 'shake' ? 1 : 1); }
    if (inp.pressed('b')) this.close();
  }

  draw(game: Game, g: CanvasRenderingContext2D): void {
    const w = Math.min(game.w - 8, 224), h = 26 + ROWS.length * ROW_H + 10;
    const x = Math.floor((game.w - w) / 2), y = Math.max(2, Math.floor((game.h - h) / 2) - 8);
    panel(g, x, y, w, h);
    drawTextCentered(g, 'SETTINGS', x + w / 2, y + 6, P.LANTERN);
    const s = settings();
    this.rects = [];
    ROWS.forEach((row, i) => {
      const ry = y + 20 + i * ROW_H;
      const sel = this.row === i;
      const r: Rect = { x: x + 4, y: ry - 3, w: w - 8, h: ROW_H - 1 };
      if (sel) { g.fillStyle = hex(P.SHADOW); g.fillRect(r.x, r.y, r.w, r.h); }
      if (row === 'done') { drawTextCentered(g, 'DONE', x + w / 2, ry, sel ? P.LANTERN : P.FERN); this.rects.push({ row, r }); return; }
      drawText(g, LABEL[row], x + 8, ry, sel ? P.FERN : P.MIST);
      const vx = x + 74, vw = w - 74 - 10;
      if (row === 'music' || row === 'sfx') {
        const v = row === 'music' ? s.music : s.sfx;
        const track: Rect = { x: vx + 2, y: ry, w: vw - 26, h: 5 };
        g.fillStyle = hex(P.VOID); g.fillRect(track.x - 1, track.y - 1, track.w + 2, track.h + 2);
        g.fillStyle = hex(P.PINE); g.fillRect(track.x, track.y, track.w, track.h);
        g.fillStyle = hex(sel ? P.AMBER : P.MOSS); g.fillRect(track.x, track.y, Math.round((track.w * v) / 100), track.h);
        for (let k = 1; k < 10; k++) { g.fillStyle = hex(P.SHADOW); g.fillRect(track.x + Math.round((track.w * k) / 10), track.y + 4, 1, 1); }
        const kx = track.x + Math.round((track.w * v) / 100);
        g.fillStyle = hex(P.LANTERN); g.fillRect(kx - 1, track.y - 2, 3, track.h + 4);
        drawTextRight(g, `${v}%`, x + w - 8, ry, sel ? P.LANTERN : P.FOG);
        this.rects.push({ row, r, track });
        return;
      }
      const val = row === 'text' ? s.textSpeed.toUpperCase() : s.shake ? 'ON' : 'OFF';
      drawText(g, '<', vx, ry, sel ? P.AMBER : P.SHADOW);
      drawTextCentered(g, val, vx + vw / 2, ry, sel ? P.LANTERN : P.FOG);
      drawTextRight(g, '>', x + w - 8, ry, sel ? P.AMBER : P.SHADOW);
      this.rects.push({ row, r });
    });
    drawTextCentered(g, 'U/D: CHOOSE  L/R OR TAP: CHANGE  B: BACK', x + w / 2, y + h - 9, P.MIST);
  }
}
