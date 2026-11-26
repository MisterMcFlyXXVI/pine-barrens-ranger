/** Modal menus: dialog boxes, bag, seed catalog, wardrobe, journal/dex, sleep summary. */
import type { Game } from '../engine/game';
import { CRYPTIDS } from '../data/cryptids';
import type { Overlay } from './overlay';
import { drawText, drawTextCentered, drawTextRight, textWidth, wrapText } from '../graphics/font';
import { hex, P } from '../graphics/palette';
import { ICON } from '../graphics/sprites';
import { playerFrame } from '../graphics/playerSprite';
import { sfx } from '../audio/sfx';
import { ITEMS, CATALOG, CROP_BY_ID } from '../data/items';
import { moonPhase, WEATHER_LABEL } from '../data/weather';
import { dexTotals } from '../engine/dex';
import { moveName } from '../engine/encounter';
import { QUESTS } from '../data/quests';
import { ACT_TITLES, JOURNAL_PAGES } from '../data/campaign';
import { objectives } from '../engine/campaign';
import { OUTFIT_PERKS } from '../data/outfits';
import { OUTFITS, HATS, outfitById, hatById } from '../data/outfits';
import { HOTBAR_SIZE } from '../engine/inventory';
import { panel, slotBox, inRect, Rect } from './panel';
import { drawItemSlot } from './hud';
import type { Dir } from '../util';
import { touchOn } from '../util';
import { accountEmail } from '../engine/account';
import { drawClipped, More, tapMore } from './readMore';
import { listStatus } from '../engine/materials';

function anyConfirm(game: Game): boolean {
  return game.input.pressed('a') || game.input.taps.length > 0;
}

/* ------------------------------------------------------------------ */
/* Dialog                                                              */
/* ------------------------------------------------------------------ */

export interface Choice {
  label: string;
  fn: () => void;
}

export class Dialog implements Overlay {
  closed = false;
  private page = 0;
  private shown = 0;
  private choice = 0;
  private blipAcc = 0;

  constructor(private readonly pages: string[], private readonly choices?: Choice[]) {}

  update(game: Game, dt: number): void {
    const inp = game.input;
    const text = this.pages[this.page];
    if (this.shown < text.length) {
      this.shown = Math.min(text.length, this.shown + dt * 70);
      this.blipAcc += dt;
      if (this.blipAcc > 0.05) { this.blipAcc = 0; sfx.type(); }
      if (anyConfirm(game) || inp.pressed('b')) this.shown = text.length;
      return;
    }
    const last = this.page === this.pages.length - 1;
    if (last && this.choices?.length) {
      const n = this.choices.length;
      if (inp.repeat('up') || inp.repeat('left')) { this.choice = (this.choice + n - 1) % n; sfx.blip(); }
      if (inp.repeat('down') || inp.repeat('right')) { this.choice = (this.choice + 1) % n; sfx.blip(); }
      let pick = -1;
      if (inp.pressed('a')) pick = this.choice;
      if (inp.pressed('b')) pick = n - 1;
      for (const t of inp.taps) {
        const hit = this.choiceRects(game).findIndex((r) => inRect(r, t.x, t.y));
        if (hit >= 0) pick = hit;
      }
      if (pick >= 0) {
        this.closed = true;
        if (pick === n - 1) sfx.cancel(); else sfx.confirm();
        this.choices[pick].fn();
      }
      return;
    }
    if (anyConfirm(game) || inp.pressed('b')) {
      sfx.blip();
      if (last) this.closed = true;
      else { this.page++; this.shown = 0; }
    }
  }

  private box(game: Game): Rect & { lines: string[] } {
    const w = Math.min(game.w - 8, 236);
    const lines = wrapText(this.pages[this.page], w - 12);
    const h = Math.max(3, lines.length) * 7 + 10;
    return { x: Math.floor((game.w - w) / 2), y: game.h - h - 26, w, h, lines };
  }

  private choiceRects(game: Game): Rect[] {
    const b = this.box(game);
    const cw = Math.max(...(this.choices ?? []).map((c) => textWidth(c.label))) + 16;
    const n = this.choices?.length ?? 0;
    const ch = n * 9 + 6;
    const x = b.x + b.w - cw, y = b.y - ch - 2;
    return Array.from({ length: n }, (_, i) => ({ x, y: y + 3 + i * 9, w: cw, h: 9 }));
  }

  draw(game: Game, g: CanvasRenderingContext2D): void {
    const b = this.box(game);
    panel(g, b.x, b.y, b.w, b.h);
    let left = Math.floor(this.shown);
    b.lines.forEach((line, k) => {
      if (left <= 0) return;
      const vis = line.slice(0, left);
      left -= line.length + 1;
      drawText(g, vis, b.x + 6, b.y + 6 + k * 7, P.FOG);
    });
    const done = this.shown >= this.pages[this.page].length;
    const last = this.page === this.pages.length - 1;
    if (done && !(last && this.choices?.length) && Math.floor(game.time * 3) % 2 === 0) {
      g.fillStyle = hex(P.LANTERN);
      const ax = b.x + b.w - 9, ay = b.y + b.h - 7;
      g.fillRect(ax, ay, 5, 1); g.fillRect(ax + 1, ay + 1, 3, 1); g.fillRect(ax + 2, ay + 2, 1, 1);
    }
    if (done && last && this.choices?.length) {
      const rects = this.choiceRects(game);
      const r0 = rects[0];
      panel(g, r0.x, r0.y - 3, r0.w, rects.length * 9 + 6);
      rects.forEach((r, i) => {
        const sel = i === this.choice;
        drawText(g, this.choices![i].label, r.x + 10, r.y + 2, sel ? P.LANTERN : P.MIST);
        if (sel) drawText(g, '>', r.x + 4, r.y + 2, P.LANTERN);
      });
    }
  }
}

/* ------------------------------------------------------------------ */
/* Bag / inventory                                                     */
/* ------------------------------------------------------------------ */

export class BagMenu implements Overlay {
  closed = false;
  private mores: Array<More | null> = [];
  private cursor = 0;
  private held: number | null = null;

  private layout(game: Game): { x: number; y: number; w: number; h: number; slots: Rect[] } {
    const S = 18, gap = 1, cols = 9;
    const gridW = cols * (S + gap) - gap;
    const w = gridW + 10;
    const rows = Math.ceil(game.inv.slots.length / cols);
    const h = 14 + rows * (S + gap) + 4 + 34;
    const x = Math.floor((game.w - w) / 2);
    const y = Math.max(2, Math.floor((game.h - h) / 2) - 8);
    const slots: Rect[] = [];
    for (let i = 0; i < game.inv.slots.length; i++) {
      const cx = i % cols, cy = Math.floor(i / cols);
      slots.push({ x: x + 5 + cx * (S + gap), y: y + 13 + cy * (S + gap) + (cy > 0 ? 2 : 0), w: S, h: S });
    }
    return { x, y, w, h, slots };
  }

  update(game: Game): void {
    const inp = game.input;
    const cols = 9;
    let moved = false;
    const N = game.inv.slots.length;
    if (inp.repeat('left')) { this.cursor = (this.cursor + N - 1) % N; moved = true; }
    if (inp.repeat('right')) { this.cursor = (this.cursor + 1) % N; moved = true; }
    if (inp.repeat('up')) { this.cursor = (this.cursor + N - cols) % N; moved = true; }
    if (inp.repeat('down')) { this.cursor = (this.cursor + cols) % N; moved = true; }
    if (moved) sfx.blip();
    let act = inp.pressed('a');
    const L = this.layout(game);
    for (const t of inp.taps) {
      if (tapMore(game, this.mores, t)) return;
      const hit = L.slots.findIndex((r) => inRect(r, t.x, t.y));
      if (hit >= 0) { this.cursor = hit; act = true; }
      else if (!inRect(L, t.x, t.y)) { this.close(game); return; }
    }
    if (act) {
      if (this.held === null) {
        if (game.inv.slots[this.cursor]) { this.held = this.cursor; sfx.confirm(); }
        else if (this.cursor < HOTBAR_SIZE) { game.sel = this.cursor; sfx.blip(); }
      } else {
        game.inv.swap(this.held, this.cursor);
        this.held = null;
        sfx.plant();
      }
      if (this.cursor < HOTBAR_SIZE && this.held === null) game.sel = this.cursor;
    }
    if (inp.pressed('b') || inp.pressed('bag')) {
      if (this.held !== null) { this.held = null; sfx.cancel(); }
      else this.close(game);
    }
  }

  private close(game: Game): void {
    this.closed = true;
    sfx.cancel();
    game.input.releaseAll();
  }

  draw(game: Game, g: CanvasRenderingContext2D): void {
    const L = this.layout(game);
    panel(g, L.x, L.y, L.w, L.h);
    drawText(g, 'FIELD PACK', L.x + 5, L.y + 5, P.LANTERN);
    drawTextRight(g, `${game.gold}G`, L.x + L.w - 5, L.y + 5, P.AMBER);
    L.slots.forEach((r, i) => {
      drawItemSlot(game, g, r, i, i === this.cursor, i < HOTBAR_SIZE ? String(i + 1) : undefined);
      if (i === game.sel) { g.fillStyle = hex(P.FERN); g.fillRect(r.x + 6, r.y + r.h, 6, 1); }
      if (this.held === i) {
        g.globalAlpha = 0.5;
        g.fillStyle = hex(P.LANTERN);
        g.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
        g.globalAlpha = 1;
      }
    });
    const iy = L.slots[L.slots.length - 1].y + 22;
    const st = game.inv.slots[this.cursor];
    if (st) {
      const def = ITEMS[st.id];
      drawText(g, def.name, L.x + 5, iy, P.LANTERN);
      if (def.price > 0 && def.kind !== 'tool') drawTextRight(g, `SELLS ${def.price}G`, L.x + L.w - 5, iy, P.AMBER);
      this.mores = [drawClipped(g, def.desc, L.x + 5, iy + 8, L.w - 10, 3, 7, P.MIST, def.name, [P.FOREST, P.LANTERN])];
    } else {
      this.mores = [];
      drawText(g, this.held !== null ? 'A: PLACE  B: CANCEL' : 'A: PICK UP / SWAP  B: CLOSE', L.x + 5, iy, P.MIST);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Porch Workbench — Mail-Order Seed Catalog                           */
/* ------------------------------------------------------------------ */

export class CatalogMenu implements Overlay {
  closed = false;
  private mores: Array<More | null> = [];
  private tab = 0;
  private cursor = 0;
  private scroll = 0;

  private layout(game: Game): Rect & { rows: Rect[]; tabs: Rect[]; visible: number } {
    const w = Math.min(game.w - 8, 236);
    const rowH = 18;
    const visible = Math.max(3, Math.min(6, Math.floor((game.h - 90) / rowH)));
    const h = 28 + visible * rowH + 33;
    const x = Math.floor((game.w - w) / 2);
    const y = Math.max(2, Math.floor((game.h - h) / 2) - 10);
    const rows = Array.from({ length: visible }, (_, i) => ({ x: x + 4, y: y + 26 + i * rowH, w: w - 8, h: rowH - 1 }));
    const tw = Math.floor((w - 8) / CATALOG.length);
    const tabs = CATALOG.map((_, i) => ({ x: x + 4 + i * tw, y: y + 13, w: tw - 2, h: 10 }));
    return { x, y, w, h, rows, tabs, visible };
  }

  update(game: Game): void {
    const inp = game.input;
    const entries = CATALOG[this.tab].entries;
    const n = entries.length;
    if (inp.repeat('left')) { this.tab = (this.tab + CATALOG.length - 1) % CATALOG.length; this.cursor = 0; this.scroll = 0; sfx.blip(); return; }
    if (inp.repeat('right')) { this.tab = (this.tab + 1) % CATALOG.length; this.cursor = 0; this.scroll = 0; sfx.blip(); return; }
    if (inp.repeat('up')) { this.cursor = (this.cursor + n - 1) % n; sfx.blip(); }
    if (inp.repeat('down')) { this.cursor = (this.cursor + 1) % n; sfx.blip(); }
    let buy = inp.repeat('a');
    const L = this.layout(game);
    for (const t of inp.taps) {
      if (tapMore(game, this.mores, t)) return;
      const th = L.tabs.findIndex((r) => inRect(r, t.x, t.y));
      if (th >= 0) { this.tab = th; this.cursor = 0; this.scroll = 0; sfx.blip(); return; }
      const hit = L.rows.findIndex((r) => inRect(r, t.x, t.y));
      if (hit >= 0 && hit + this.scroll < n) { const i = hit + this.scroll; if (i === this.cursor) buy = true; this.cursor = i; sfx.blip(); }
      else if (!inRect(L, t.x, t.y)) { this.closed = true; sfx.cancel(); return; }
    }
    if (this.cursor < this.scroll) this.scroll = this.cursor;
    if (this.cursor >= this.scroll + L.visible) this.scroll = this.cursor - L.visible + 1;
    if (buy) {
      const e = entries[this.cursor];
      const def = ITEMS[e.id];
      if (def.kind === 'gear' && game.inv.count(e.id) > 0) { sfx.error(); game.toast(`You already own the ${def.name}.`); }
      else if (game.gold < e.cost) { sfx.error(); game.toast('Not enough gold.'); }
      else if (!game.inv.canFit(e.id)) { sfx.error(); game.toast('Your bag is full.'); }
      else { game.gold -= e.cost; game.inv.add(e.id, 1); sfx.coin(); if (def.kind === 'gear') game.toast(`${def.name} added to your Field Kit gear!`); }
    }
    if (inp.pressed('b')) { this.closed = true; sfx.cancel(); }
  }

  draw(game: Game, g: CanvasRenderingContext2D): void {
    const L = this.layout(game);
    panel(g, L.x, L.y, L.w, L.h, 'paper');
    drawText(g, 'RANGER SUPPLY CATALOG', L.x + 5, L.y + 5, P.CRAN);
    drawTextRight(g, `${game.gold}G`, L.x + L.w - 5, L.y + 5, P.RUST);
    L.tabs.forEach((r, i) => {
      const sel = i === this.tab;
      g.fillStyle = hex(sel ? P.CRAN : P.AMBER); g.fillRect(r.x, r.y, r.w, r.h);
      drawTextCentered(g, CATALOG[i].name, r.x + r.w / 2, r.y + 3, sel ? P.LANTERN : P.RUST);
    });
    const entries = CATALOG[this.tab].entries;
    L.rows.forEach((r, k) => {
      const i = k + this.scroll;
      const e = entries[i];
      if (!e) return;
      const def = ITEMS[e.id];
      const crop = def.crop ? CROP_BY_ID[def.crop] : undefined;
      const sel = i === this.cursor;
      if (sel) { g.fillStyle = hex(P.AMBER); g.fillRect(r.x, r.y, r.w, r.h); }
      const icon = ICON[e.id];
      if (icon) g.drawImage(icon, r.x + 1, r.y);
      const owned = game.inv.count(e.id);
      drawText(g, crop?.name ?? def.name, r.x + 19, r.y + 2, sel ? P.VOID : P.CRAN);
      const sub = crop ? `${crop.days}D${crop.regrow ? ' REGROWS' : ''}${crop.bogOnly ? ' BOG' : ''}  OWNED ${owned}` : def.kind === 'gear' ? (owned ? 'OWNED' : 'FIELD KIT GEAR') : `OWNED ${owned}`;
      drawText(g, sub, r.x + 19, r.y + 9, sel ? P.CRAN : P.RUST);
      drawTextRight(g, `${e.cost}G`, r.x + r.w - 2, r.y + 5, sel ? P.VOID : P.RUST);
    });
    if (entries.length > L.visible) drawTextRight(g, `${this.cursor + 1}/${entries.length}`, L.x + L.w - 5, L.y + L.h - 11, P.RUST);
    const def = ITEMS[entries[this.cursor].id];
    const desc = def.crop ? CROP_BY_ID[def.crop]?.lore ?? def.desc : def.desc;
    this.mores = [drawClipped(g, desc, L.x + 5, L.y + L.h - 28, L.w - 10, 2, 7, P.CRAN, def.crop ? CROP_BY_ID[def.crop]?.name ?? def.name : def.name)];
    drawText(g, 'L/R: TAB  A: BUY (HOLD)  B: CLOSE', L.x + 5, L.y + L.h - 11, P.RUST);
  }
}

/* ------------------------------------------------------------------ */
/* Wardrobe — modular outfit & hat swapping                            */
/* ------------------------------------------------------------------ */

export class DresserMenu implements Overlay {
  closed = false;
  private mores: Array<More | null> = [];
  private row = 0;
  private outfits: string[];
  private hats: string[];

  constructor(game: Game) {
    this.outfits = OUTFITS.filter((o) => game.wardrobe.has(o.id)).map((o) => o.id);
    this.hats = HATS.filter((h) => game.wardrobe.has(h.id)).map((h) => h.id);
  }

  update(game: Game): void {
    const inp = game.input;
    for (const t of inp.taps) if (tapMore(game, this.mores, t)) return;
    if (inp.repeat('up') || inp.repeat('down')) { this.row ^= 1; sfx.blip(); }
    let delta = 0;
    if (inp.repeat('left')) delta = -1;
    if (inp.repeat('right') || inp.pressed('a') || inp.taps.length) delta = 1;
    if (delta) {
      const list = this.row === 0 ? this.outfits : this.hats;
      const curId = this.row === 0 ? game.look.outfit : game.look.hat;
      const i = Math.max(0, list.indexOf(curId));
      const next = list[(i + delta + list.length) % list.length];
      if (this.row === 0) game.look = { ...game.look, outfit: next };
      else game.look = { ...game.look, hat: next };
      sfx.plant();
    }
    if (inp.pressed('b')) { this.closed = true; sfx.cancel(); }
  }

  draw(game: Game, g: CanvasRenderingContext2D): void {
    const w = Math.min(game.w - 8, 210), h = 96;
    const x = Math.floor((game.w - w) / 2), y = Math.max(2, Math.floor((game.h - h) / 2) - 10);
    panel(g, x, y, w, h);
    drawText(g, 'WARDROBE', x + 5, y + 5, P.LANTERN);
    // Live preview, rotating through directions
    const dirs: Dir[] = ['down', 'left', 'up', 'right'];
    const dir = dirs[Math.floor(game.time / 0.9) % 4];
    const frame = [0, 1, 0, 2][Math.floor(game.time * 6) % 4];
    const img = playerFrame(game.look, dir, frame, 'walk');
    slotBox(g, x + 6, y + 14, 52, false, 0);
    g.drawImage(img, x + 8, y + 16, 48, 48);
    const o = outfitById(game.look.outfit), hh = hatById(game.look.hat);
    const rows: Array<[string, string, number, number]> = [
      ['OUTFIT', o.name, this.outfits.indexOf(o.id) + 1, this.outfits.length],
      ['HAT', hh.name, this.hats.indexOf(hh.id) + 1, this.hats.length],
    ];
    rows.forEach(([label, name, k, n], i) => {
      const ry = y + 16 + i * 22;
      const sel = this.row === i;
      drawText(g, `${label} ${k}/${n}`, x + 64, ry, sel ? P.FERN : P.MIST);
      const lines = wrapText(name, w - 80);
      drawText(g, (sel ? '< ' : '  ') + lines[0] + (sel ? ' >' : ''), x + 64, ry + 8, sel ? P.LANTERN : P.FOG);
    });
    const perk = OUTFIT_PERKS[o.id] ?? OUTFIT_PERKS[hh.id];
    this.mores = perk ? [drawClipped(g, `PERK: ${perk}`, x + 64, y + 56, w - 70, 2, 7, P.FERN, 'Outfit perk', [P.FOREST, P.LANTERN])] : [];
    const lockedO = OUTFITS.length - this.outfits.length, lockedH = HATS.length - this.hats.length;
    const lockNote = lockedO + lockedH > 0 ? `${lockedO + lockedH} LOOKS LOCKED: HISTORICAL SOCIETY REWARDS` : 'ALL LOOKS UNLOCKED!';
    wrapText(lockNote, w - 10).forEach((l, k) => drawText(g, l, x + 5, y + 70 + k * 7, P.VIOLET));
    drawText(g, 'L/R: CHANGE  U/D: ROW  B: DONE', x + 5, y + h - 9, P.MIST);
  }
}

/* ------------------------------------------------------------------ */
/* Journal / Cryptid-Dex (Tab)                                         */
/* ------------------------------------------------------------------ */

export class JournalMenu implements Overlay {
  closed = false;
  private mores: Array<More | null> = [];
  private page = 0;
  private static readonly PAGES = 6;

  update(game: Game): void {
    const inp = game.input;
    const n = JournalMenu.PAGES;
    for (const t of inp.taps) if (tapMore(game, this.mores, t)) return;
    if (inp.repeat('left')) { this.page = (this.page + n - 1) % n; sfx.blip(); }
    if (inp.repeat('right') || inp.pressed('a') || inp.taps.length) { this.page = (this.page + 1) % n; sfx.blip(); }
    if (inp.pressed('b') || inp.pressed('dex')) { this.closed = true; sfx.cancel(); }
  }

  draw(game: Game, g: CanvasRenderingContext2D): void {
    const w = Math.min(game.w - 8, 236), h = Math.min(game.h - 30, 140);
    const x = Math.floor((game.w - w) / 2), y = Math.max(2, Math.floor((game.h - h) / 2) - 12);
    panel(g, x, y, w, h, 'paper');
    this.mores = [];
    const titles = ['CAMPAIGN', 'FIELD JOURNAL', 'QUEST LOG', 'MATERIALS LIST', 'ALMANAC & KIT', 'CONTROLS'];
    drawText(g, titles[this.page], x + 5, y + 5, P.CRAN);
    drawTextRight(g, `< ${this.page + 1}/${JournalMenu.PAGES} >`, x + w - 5, y + 5, P.RUST);
    const lx = x + 6;
    let ly = y + 16;
    const line = (s: string, c: number = P.RUST) => { drawText(g, s, lx, ly, c); ly += 8; };
    const page = this.page - 1;
    if (this.page === 0) {
      const act = game.progress.act;
      const [num, title] = ACT_TITLES[act];
      line(`${num}: ${title.toUpperCase()}`, P.CRAN);
      line(act >= 5 ? 'POST-GAME: THE VALLEY IS YOURS' : '"THE SIGNAL ON RADIO RIDGE"', P.AMBER);
      for (const o of objectives(game, act)) {
        g.fillStyle = hex(o.done ? P.FOREST : P.RUST); g.fillRect(lx, ly, 5, 5);
        if (!o.done) { g.fillStyle = hex(P.LANTERN); g.fillRect(lx + 1, ly + 1, 3, 3); }
        this.mores.push(drawClipped(g, o.text, lx + 9, ly, w - 22, 2, 7, o.done ? P.FOREST : P.RUST, 'Objective'));
        ly += 7 * Math.min(2, wrapText(o.text, w - 22).length) + 1;
      }
      const pages = [...game.progress.pages].filter((x) => x > 0).length;
      drawText(g, `VANCE JOURNAL PAGES: ${pages}/${JOURNAL_PAGES.length - 1}`, lx, y + h - 10, P.CRAN);
    } else if (page === 0) {
      const c = game.clock;
      const yard = game.getMap('CABIN_YARD');
      line(`${c.season.toUpperCase()} ${c.dayOfSeason}, YEAR ${c.year} - ${c.timeLabel()}`, P.CRAN);
      line(`GOLD: ${game.gold}G   PENDING SHIP: ${game.pendingPayout()}G`);
      line(`GARDEN PLOTS CLEARED: ${yard.plotsCleared()}/${yard.def.plots.length}`);
      const growing = yard.plots.filter((p) => p.crop).length;
      line(`CROPS GROWING: ${growing}   HARVESTED: ${game.stats.harvested}`);
      line(`SOIL TILLED: ${game.stats.tilled}   FORAGED: ${game.stats.foraged}`);
      line(`BRUSH & ROCKS CLEARED: ${game.stats.cleared}`);
      line(`TOTAL EARNED: ${game.stats.shippedGold}G   DAYS: ${game.stats.daysPlayed}`);
      ly += 2;
      wrapText('Lure crops draw specific cryptids. Keep a stock of each before venturing past the trails.', w - 12).forEach((l) => line(l, P.CRAN));
    } else if (page === 1) {
      const pr = game.progress;
      const active = QUESTS.filter((q) => pr.active(q.id));
      const done = QUESTS.filter((q) => pr.done(q.id));
      if (!active.length) line('No active quests. Talk to the townsfolk!', P.CRAN);
      for (const q of active) {
        line(q.title.toUpperCase(), P.CRAN);
        const step = `- ${q.steps[Math.max(0, pr.stage(q.id) - 1)]}`;
        this.mores.push(drawClipped(g, step, lx, ly, w - 12, 2, 8, P.RUST, q.title));
        ly += 8 * Math.min(2, wrapText(step, w - 12).length);
      }
      ly += 2;
      line(`COMPLETED: ${done.length}/${QUESTS.length}   DONATIONS: ${pr.donations}/${CRYPTIDS.length}`, P.FOREST);
    } else if (page === 2) {
      // Materials list (read-only here; edit it at the Porch Workbench LIST tab).
      const list = listStatus(game);
      const bottom = y + h - 12;
      if (!list.length) {
        wrapText('Nothing tracked yet. At the Porch Workbench, select a recipe and tap +LIST. Counts include your bag and the cabin Storage Crate.', w - 12).forEach((l) => line(l, P.CRAN));
      }
      let shown = 0;
      for (const st of list) {
        if (ly + 8 > bottom) break;
        drawText(g, `${st.name.toUpperCase()}${st.need.qty > 1 ? ` X${st.need.qty}` : ''}`, lx, ly, P.CRAN);
        drawTextRight(g, st.ready ? 'READY!' : `${st.missing} LEFT`, x + w - 6, ly, st.ready ? P.FOREST : P.RUST);
        ly += 8;
        for (const p of st.parts) {
          if (ly + 7 > bottom) break;
          const ok = p.have >= p.need;
          drawText(g, `${ok ? '+' : '-'} ${p.name} ${Math.min(p.have, p.need)}/${p.need}`, lx + 4, ly, ok ? P.FOREST : P.RUST);
          drawTextRight(g, `BAG ${p.bag} CRATE ${p.crate}`, x + w - 6, ly, P.AMBER);
          ly += 7;
        }
        ly += 2;
        shown++;
      }
      if (shown < list.length) drawText(g, `+${list.length - shown} MORE: SEE THE WORKBENCH LIST TAB`, lx, bottom, P.CRAN);
    } else if (page === 3) {
      const c = game.clock;
      const moon = moonPhase(c.day);
      const tot = dexTotals(game.dex);
      line(`WEATHER: ${WEATHER_LABEL[game.dayWeather.morning].toUpperCase()} / TONIGHT ${WEATHER_LABEL[game.dayWeather.evening].toUpperCase()}`, P.CRAN);
      line(`MOON: ${moon.label.toUpperCase()}${moon.full ? ' (!)' : ''}`);
      line(`DEX: LOGGED ${tot.logged}/${CRYPTIDS.length}  RARE ${tot.rare}/${CRYPTIDS.length}  GOLD ${tot.gold}`);
      line(`KIT: ${moveName(game.kit.bait)} / ${moveName(game.kit.signal)}`);
      line(`     ${moveName(game.kit.document)} / ${moveName(game.kit.stealth)}`);
      const gear = ['bog_waders', 'scent_mask', 'thermal_lens', 'brass_bell', 'silver_bell', 'static_radio', 'parabolic_dish', 'chronos_shutter'].filter((id) => game.inv.count(id) > 0);
      wrapText(`GEAR: ${gear.length ? gear.map((id) => ITEMS[id].name).join(', ') : 'none yet (Porch Workbench catalog)'}`, w - 12).forEach((l) => line(l));
      const email = accountEmail();
      line(email ? `CLOUD SAVES: ON (${email.toUpperCase()})` : 'CLOUD SAVES: OFF (SIGN IN FROM THE TITLE SCREEN)', email ? P.FOREST : P.RUST);
      if (game.wispNight === c.day) line('WISP-LIGHT OIL ACTIVE TONIGHT', P.VIOLET);
      if (game.lunarNight === c.day) line('LUNAR DEW: 3X RARE VARIANTS TONIGHT', P.VIOLET);
    } else {
      const rows = touchOn() ? [
        'MOVE: D-PAD (SLIDE YOUR THUMB TO TURN)', 'A: USE, TALK, PICK   B: CANCEL, HOLD TO RUN',
        'TAP A HOTBAR SLOT TO HOLD THAT ITEM', 'BAG: INVENTORY   DEX: CRYPTID-DEX', 'TAP DEX TWICE: THIS JOURNAL',
        'SND: MUTE   PAD: HIDE TOUCH CONTROLS', 'TAP TEXT BOXES, MENU ROWS & BATTLE MOVES',
        'TAP A DESCRIPTION (OR MORE) TO READ IT ALL',
        'TALL GRASS, REEDS, FERNS, SHALLOWS & FOG HIDE CRYPTIDS',
        'SLEEP IN BED TO SAVE & END THE DAY', 'HOLD A TO KEEP SWINGING A TOOL',
      ] : [
        'MOVE: WASD / ARROWS / D-PAD', 'A: SPACE / E / ENTER - USE, TALK', 'B: SHIFT / ESC - RUN, CANCEL',
        '1-9 / WHEEL / TAP: HOTBAR', 'I or B: BAG   TAB or J: CRYPTID-DEX', 'M: MUTE   PAD: TOUCH CONTROLS',
        'TALL GRASS, REEDS, FERNS, SHALLOWS & FOG HIDE CRYPTIDS',
        'SLEEP IN BED TO SAVE & END THE DAY', 'HOLD A TO KEEP SWINGING A TOOL',
      ];
      rows.forEach((r) => line(r));
    }
  }
}

/* ------------------------------------------------------------------ */
/* Morning summary after sleep                                         */
/* ------------------------------------------------------------------ */

export class SleepSummary implements Overlay {
  closed = false;
  private t = 0;

  constructor(private readonly title: string, private readonly lines: string[]) {}

  update(game: Game, dt: number): void {
    this.t += dt;
    if (this.t > 0.6 && (anyConfirm(game) || game.input.pressed('b'))) { this.closed = true; sfx.blip(); }
  }

  draw(game: Game, g: CanvasRenderingContext2D): void {
    g.fillStyle = hex(P.VOID);
    g.globalAlpha = 0.6;
    g.fillRect(0, 0, game.w, game.h);
    g.globalAlpha = 1;
    const w = Math.min(game.w - 8, 200);
    const body = this.lines.flatMap((l) => wrapText(l, w - 12));
    const h = 24 + body.length * 8 + 12;
    const x = Math.floor((game.w - w) / 2), y = Math.floor((game.h - h) / 2);
    panel(g, x, y, w, h);
    drawTextCentered(g, 'GOOD MORNING, RANGER', game.w / 2, y + 5, P.FERN);
    drawTextCentered(g, this.title.toUpperCase(), game.w / 2, y + 13, P.LANTERN);
    body.forEach((l, i) => drawText(g, l, x + 6, y + 24 + i * 8, P.FOG));
    if (this.t > 0.6 && Math.floor(game.time * 3) % 2 === 0) drawTextCentered(g, 'PRESS A', game.w / 2, y + h - 9, P.MIST);
  }
}
