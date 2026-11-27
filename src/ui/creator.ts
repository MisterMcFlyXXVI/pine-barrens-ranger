/**
 * Character creator: name, body, skin, hair, facial hair and the outfit you
 * arrive in. Opened before the drive up (new game), once for older saves, and
 * from the cabin mirror any time after (look only: name and outfit stay put).
 *
 * The name is typed into a real text field laid over the canvas, so phones get
 * their own keyboard (a tap on the field is what lets iOS open it).
 */
import type { Game } from '../engine/game';
import type { Overlay } from './overlay';
import { panel, slotBox, inRect } from './panel';
import type { Rect } from './panel';
import { drawText, drawTextCentered, drawTextRight } from '../graphics/font';
import { P, hex } from '../graphics/palette';
import { playerFrame } from '../graphics/playerSprite';
import type { Dir } from '../util';
import { sfx } from '../audio/sfx';
import {
  Appearance, BUILDS, FACIALS, HAIRS, HAIR_NAMES, HAIR_STYLES, NAME_MAX, SKINS, SKIN_NAMES, START_OUTFITS, cleanName,
} from '../data/appearance';

export type CreatorMode = 'new' | 'returning' | 'mirror';

type Row = 'name' | 'build' | 'skin' | 'style' | 'hair' | 'facial' | 'outfit' | 'done';

const ROW_H = 11;

/** Creators with a name field on the page (so a field never outlives its screen). */
const LIVE = new Set<CharacterCreator>();

export class CharacterCreator implements Overlay {
  /** Remove the name field of any creator that's no longer on screen (e.g. the menus were cleared). */
  static sweep(overlays: readonly Overlay[]): void {
    for (const c of LIVE) if (c.closed || !overlays.includes(c)) c.closeField();
  }

  closed = false;
  private row = 0;
  private rows: Row[];
  private a: Appearance;
  private outfit: number;
  private field: HTMLInputElement | null = null;
  private rects: Array<{ row: number; r: Rect }> = [];
  private warn = 0;

  constructor(private readonly game: Game, private readonly mode: CreatorMode, private readonly onDone: () => void) {
    this.a = { ...game.appearance };
    this.outfit = Math.max(0, START_OUTFITS.findIndex(([id]) => id === game.look.outfit));
    this.rows = mode === 'mirror' ? ['build', 'skin', 'style', 'hair', 'facial', 'done'] : ['name', 'build', 'skin', 'style', 'hair', 'facial', 'outfit', 'done'];
    if (mode !== 'mirror') this.openField();
  }

  /* ---------------- name field ---------------- */

  private openField(): void {
    const f = document.createElement('input');
    f.type = 'text';
    f.maxLength = NAME_MAX;
    f.value = this.a.name;
    f.placeholder = 'YOUR NAME';
    f.autocomplete = 'off';
    f.spellcheck = false;
    f.setAttribute('autocapitalize', 'characters');
    f.setAttribute('aria-label', 'Your name');
    Object.assign(f.style, {
      position: 'fixed', zIndex: '20', boxSizing: 'border-box', padding: '0 4px', margin: '0',
      border: `2px solid ${hex(P.AMBER)}`, borderRadius: '2px', background: hex(P.VOID), color: hex(P.LANTERN),
      fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', outline: 'none',
    } as Partial<CSSStyleDeclaration>);
    f.addEventListener('input', () => {
      const clean = cleanName(f.value);
      if (clean !== f.value.toUpperCase()) f.value = clean;
      this.a.name = clean;
    });
    f.addEventListener('focus', () => { this.row = 0; });
    f.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'ArrowDown') { e.preventDefault(); f.blur(); this.row = 1; sfx.blip(); }
      e.stopPropagation();
    });
    document.body.appendChild(f);
    this.field = f;
    LIVE.add(this);
  }

  private placeField(x: number, y: number, w: number): void {
    const f = this.field;
    if (!f) return;
    const r = this.game.canvas.getBoundingClientRect();
    const s = r.width / this.game.w;
    f.style.left = `${r.left + x * s}px`;
    f.style.top = `${r.top + (y - 2) * s}px`;
    f.style.width = `${w * s}px`;
    f.style.height = `${(ROW_H - 1) * s}px`;
    f.style.fontSize = `${Math.max(12, Math.round(7 * s))}px`;
  }

  private closeField(): void { this.field?.remove(); this.field = null; LIVE.delete(this); }

  /* ---------------- input ---------------- */

  private change(row: Row, d: number): void {
    const cyc = (i: number, n: number) => (i + d + n) % n;
    const a = this.a;
    switch (row) {
      case 'build': a.build = BUILDS[cyc(BUILDS.findIndex(([b]) => b === a.build), BUILDS.length)][0]; break;
      case 'skin': a.skin = cyc(a.skin, SKINS.length); break;
      case 'style': a.hairStyle = HAIR_STYLES[cyc(Math.max(0, HAIR_STYLES.findIndex(([s]) => s === a.hairStyle)), HAIR_STYLES.length)][0]; break;
      case 'hair': a.hair = cyc(a.hair, HAIRS.length); break;
      case 'facial': a.facial = FACIALS[cyc(FACIALS.findIndex(([f]) => f === a.facial), FACIALS.length)][0]; break;
      case 'outfit': this.outfit = cyc(this.outfit, START_OUTFITS.length); break;
      default: return;
    }
    sfx.plant();
    this.preview();
  }

  /** Show the change on the player straight away (the preview draws from it). */
  private preview(): void {
    this.game.setAppearance(this.a);
    if (this.mode !== 'mirror') this.game.look = { ...this.game.look, outfit: START_OUTFITS[this.outfit][0] };
  }

  private finish(): void {
    if (this.mode !== 'mirror' && !this.a.name.trim()) {
      this.warn = 2; this.row = 0; sfx.error();
      this.field?.focus();
      return;
    }
    this.a.name = cleanName(this.a.name).trim();
    this.preview();
    this.closeField();
    this.closed = true;
    sfx.confirm();
    this.onDone();
  }

  update(game: Game, dt: number): void {
    this.warn = Math.max(0, this.warn - dt);
    const typing = this.field && document.activeElement === this.field;
    const inp = game.input;
    for (const t of inp.taps) {
      const hit = this.rects.find((h) => inRect(h.r, t.x, t.y));
      if (!hit) continue;
      this.row = hit.row;
      const row = this.rows[hit.row];
      if (row === 'done') { this.finish(); return; }
      const mid = hit.r.x + hit.r.w / 2;
      this.change(row, t.x < mid ? -1 : 1);
    }
    if (typing) return;
    if (inp.repeat('up')) { this.row = (this.row + this.rows.length - 1) % this.rows.length; sfx.blip(); }
    if (inp.repeat('down')) { this.row = (this.row + 1) % this.rows.length; sfx.blip(); }
    const row = this.rows[this.row];
    if (inp.repeat('left')) this.change(row, -1);
    if (inp.repeat('right')) this.change(row, 1);
    if (inp.pressed('a')) {
      if (row === 'done') { this.finish(); return; }
      if (row === 'name') { this.field?.focus(); return; }
      this.change(row, 1);
    }
    if (inp.pressed('b') && this.mode === 'mirror') { this.closeField(); this.closed = true; sfx.cancel(); this.onDone(); }
  }

  /* ---------------- drawing ---------------- */

  draw(game: Game, g: CanvasRenderingContext2D): void {
    if (this.mode !== 'mirror') { g.fillStyle = hex(P.VOID); g.fillRect(0, 0, game.w, game.h); }
    const w = Math.min(game.w - 8, 236), h = 30 + this.rows.length * ROW_H + 12;
    const x = Math.floor((game.w - w) / 2), y = Math.max(2, Math.floor((game.h - h) / 2) - (this.mode === 'mirror' ? 10 : 0));
    panel(g, x, y, w, h);
    const title = this.mode === 'mirror' ? 'THE CABIN MIRROR' : this.mode === 'returning' ? 'A FRESH LOOK IN THE MIRROR' : 'WHO\'S TAKING THE FIRE-WATCH?';
    drawTextCentered(g, title, x + w / 2, y + 5, P.LANTERN);

    // Turning preview
    const dirs: Dir[] = ['down', 'left', 'up', 'right'];
    const dir = dirs[Math.floor(game.time / 1.1) % 4];
    const frame = [0, 1, 0, 2][Math.floor(game.time * 5) % 4];
    const big = w >= 200 ? 72 : 48;
    slotBox(g, x + 6, y + 16, big + 4, false, 0);
    g.drawImage(playerFrame(game.look, dir, frame, 'walk'), x + 8, y + 18, big, big);
    if (this.a.name) drawTextCentered(g, this.a.name, x + 8 + big / 2, y + 22 + big + 2, P.FERN);

    const lx = x + big + 16, rw = x + w - 6 - lx;
    const value = (row: Row): string => {
      const a = this.a;
      switch (row) {
        case 'name': return a.name;
        case 'build': return BUILDS.find(([b]) => b === a.build)![1];
        case 'skin': return SKIN_NAMES[a.skin % SKIN_NAMES.length];
        case 'style': return (HAIR_STYLES.find(([s]) => s === a.hairStyle) ?? HAIR_STYLES[0])[1];
        case 'hair': return HAIR_NAMES[a.hair % HAIR_NAMES.length];
        case 'facial': return FACIALS.find(([f]) => f === a.facial)![1];
        case 'outfit': return START_OUTFITS[this.outfit][1];
        case 'done': return '';
      }
    };
    const label: Record<Row, string> = { name: 'NAME', build: 'BODY', skin: 'SKIN', style: 'HAIR', hair: 'COLOR', facial: 'FACE', outfit: 'WEAR', done: '' };
    this.rects = [];
    this.rows.forEach((row, i) => {
      const ry = y + 18 + i * ROW_H;
      const sel = this.row === i;
      this.rects.push({ row: i, r: { x: lx - 2, y: ry - 2, w: rw + 2, h: ROW_H } });
      if (sel) { g.fillStyle = hex(P.SHADOW); g.fillRect(lx - 2, ry - 2, rw + 2, ROW_H); }
      if (row === 'done') {
        drawTextCentered(g, this.mode === 'mirror' ? 'LOOKS GOOD' : 'START THE DRIVE UP', lx + rw / 2, ry, sel ? P.LANTERN : P.FERN);
        return;
      }
      drawText(g, label[row], lx, ry, sel ? P.FERN : P.MIST);
      const vx = lx + 26;
      if (row === 'name') {
        this.placeField(vx, ry, rw - 26);
        return;
      }
      if (row === 'skin' || row === 'hair') {
        const [c1, c2] = (row === 'skin' ? SKINS[this.a.skin % SKINS.length] : HAIRS[this.a.hair % HAIRS.length]);
        g.fillStyle = hex(P.VOID); g.fillRect(vx + 8, ry - 1, 9, 7);
        g.fillStyle = hex(c1); g.fillRect(vx + 9, ry, 4, 5); g.fillStyle = hex(c2); g.fillRect(vx + 13, ry, 3, 5);
        drawText(g, value(row), vx + 20, ry, sel ? P.LANTERN : P.FOG);
      } else drawText(g, value(row), vx + 8, ry, sel ? P.LANTERN : P.FOG);
      drawText(g, '<', vx, ry, sel ? P.AMBER : P.SHADOW);
      drawTextRight(g, '>', lx + rw - 2, ry, sel ? P.AMBER : P.SHADOW);
    });
    const hint = this.warn > 0 ? 'TYPE A NAME FIRST (TAP THE NAME BOX)' : this.mode === 'mirror' ? 'L/R: CHANGE  U/D: ROW  B: DONE' : 'L/R OR TAP: CHANGE   A: NEXT';
    drawTextCentered(g, hint, x + w / 2, y + h - 9, this.warn > 0 ? P.RED : P.MIST);
  }
}
