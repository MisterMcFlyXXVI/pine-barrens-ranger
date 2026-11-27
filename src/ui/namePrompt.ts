/**
 * Small "what will you call them?" box: a real text field over the canvas
 * (phones get their own keyboard) with a few suggested names to tap.
 */
import type { Game } from '../engine/game';
import type { Overlay } from './overlay';
import { panel, inRect } from './panel';
import type { Rect } from './panel';
import { drawText, drawTextCentered, wrapText } from '../graphics/font';
import { P, hex } from '../graphics/palette';
import { sfx } from '../audio/sfx';
import { cleanName, NAME_MAX } from '../data/appearance';

const LIVE = new Set<NamePrompt>();

export class NamePrompt implements Overlay {
  /** Remove fields whose prompt is no longer on screen. */
  static sweep(overlays: readonly Overlay[]): void {
    for (const p of LIVE) if (p.closed || !overlays.includes(p)) p.closeField();
  }

  closed = false;
  private name: string;
  private field: HTMLInputElement | null = null;
  private row = 0;
  private rects: Rect[] = [];

  constructor(private readonly title: string, private readonly suggestions: string[], private readonly onDone: (name: string) => void) {
    this.name = suggestions[0] ?? '';
  }

  private openField(): void {
    const f = document.createElement('input');
    f.type = 'text'; f.maxLength = NAME_MAX; f.value = this.name; f.autocomplete = 'off'; f.spellcheck = false;
    f.setAttribute('autocapitalize', 'characters'); f.setAttribute('aria-label', 'Name');
    Object.assign(f.style, {
      position: 'fixed', zIndex: '20', boxSizing: 'border-box', padding: '0 4px', margin: '0', border: `2px solid ${hex(P.AMBER)}`,
      borderRadius: '2px', background: hex(P.VOID), color: hex(P.LANTERN), fontFamily: 'monospace', fontWeight: 'bold',
      textTransform: 'uppercase', outline: 'none',
    } as Partial<CSSStyleDeclaration>);
    f.addEventListener('input', () => { const c = cleanName(f.value); if (c !== f.value.toUpperCase()) f.value = c; this.name = c; });
    f.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); f.blur(); this.finish(); } e.stopPropagation(); });
    document.body.appendChild(f);
    this.field = f;
    LIVE.add(this);
  }

  private closeField(): void { this.field?.remove(); this.field = null; LIVE.delete(this); }

  private finish(): void {
    const n = cleanName(this.name).trim();
    if (!n) { sfx.error(); return; }
    this.closeField();
    this.closed = true;
    sfx.confirm();
    // Title Case for display in dialogue.
    this.onDone(n.toLowerCase().replace(/(^|[\s'-])([a-z])/g, (_m, a: string, b: string) => a + b.toUpperCase()));
  }

  update(game: Game): void {
    if (!this.field) this.openField();
    const inp = game.input;
    for (const t of inp.taps) {
      const i = this.rects.findIndex((r) => inRect(r, t.x, t.y));
      if (i < 0) continue;
      if (i < this.suggestions.length) { this.name = this.suggestions[i].toUpperCase(); if (this.field) this.field.value = this.name; sfx.blip(); this.row = i; }
      else { this.finish(); return; }
    }
    if (this.field && document.activeElement === this.field) return;
    const n = this.suggestions.length + 1;
    if (inp.repeat('left') || inp.repeat('up')) { this.row = (this.row + n - 1) % n; sfx.blip(); }
    if (inp.repeat('right') || inp.repeat('down')) { this.row = (this.row + 1) % n; sfx.blip(); }
    if (inp.pressed('a')) {
      if (this.row < this.suggestions.length) { this.name = this.suggestions[this.row].toUpperCase(); if (this.field) this.field.value = this.name; sfx.blip(); this.row = n - 1; }
      else this.finish();
    }
  }

  draw(game: Game, g: CanvasRenderingContext2D): void {
    const w = Math.min(game.w - 8, 210), h = 62;
    const x = Math.floor((game.w - w) / 2), y = Math.max(4, Math.floor(game.h / 2) - 50);
    panel(g, x, y, w, h);
    wrapText(this.title, w - 12).slice(0, 2).forEach((l, k) => drawTextCentered(g, l, x + w / 2, y + 5 + k * 7, P.LANTERN));
    // Name field position
    const fy = y + 21, fx = x + 10, fw = w - 20;
    const f = this.field;
    if (f) {
      const r = game.canvas.getBoundingClientRect(), s = r.width / game.w;
      f.style.left = `${r.left + fx * s}px`; f.style.top = `${r.top + fy * s}px`; f.style.width = `${fw * s}px`;
      f.style.height = `${10 * s}px`; f.style.fontSize = `${Math.max(12, Math.round(7 * s))}px`;
    } else { g.fillStyle = hex(P.VOID); g.fillRect(fx, fy, fw, 10); drawText(g, this.name, fx + 3, fy + 2, P.LANTERN); }
    // Suggestions + OK
    this.rects = [];
    const labels = [...this.suggestions.map((s) => s.toUpperCase()), 'OK'];
    const cw = Math.floor((w - 12) / labels.length);
    labels.forEach((l, i) => {
      const r = { x: x + 6 + i * cw, y: y + 36, w: cw - 2, h: 11 };
      this.rects.push(r);
      const sel = this.row === i;
      g.fillStyle = hex(i === labels.length - 1 ? P.FOREST : sel ? P.SHADOW : P.PINE); g.fillRect(r.x, r.y, r.w, r.h);
      drawTextCentered(g, l, r.x + r.w / 2, r.y + 2, sel ? P.LANTERN : P.FOG);
    });
    drawTextCentered(g, 'TYPE A NAME OR TAP ONE', x + w / 2, y + h - 10, P.MIST);
  }
}
