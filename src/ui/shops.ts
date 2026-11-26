/**
 * Phase 3 list-style menus built on one scrolling, tabbed ListMenu:
 * shops, Outfitter upgrades, Workbench crafting, merchants, donations,
 * the Bulletin Board and cabin display pedestals.
 */
import type { Game } from '../engine/game';
import type { Overlay } from './overlay';
import { drawText, drawTextCentered, drawTextRight, wrapText } from '../graphics/font';
import { hex, P } from '../graphics/palette';
import { ICON } from '../graphics/sprites';
import { sfx } from '../audio/sfx';
import { ITEMS, CATALOG_SEEDS, CROP_BY_ID } from '../data/items';
import { BLUEPRINTS, MERCHANT_GOODS, MILESTONES, RECIPES, ShopEntry, TOOL_LINES, UPGRADES, Recipe } from '../data/economy';
import { CRYPTIDS } from '../data/cryptids';
import { inRect, panel, Rect } from './panel';

export interface Row {
  icon?: string;
  label: string;
  sub?: string;
  right?: string;
  dim?: boolean;
  desc?: string;
  act?: () => void;
}

export abstract class ListMenu implements Overlay {
  closed = false;
  protected cursor = 0;
  protected scroll = 0;
  protected tab = 0;

  abstract title(game: Game): string;
  abstract rows(game: Game): Row[];
  tabs(): string[] { return []; }
  footer(): string { return 'A: SELECT  B: CLOSE'; }
  showGold(): boolean { return true; }

  private layout(game: Game): Rect & { rows: Rect[]; tabs: Rect[]; visible: number; rowH: number } {
    const w = Math.min(game.w - 8, 250);
    const rowH = 18;
    const hasTabs = this.tabs().length > 0;
    const top = hasTabs ? 26 : 14;
    const visible = Math.max(3, Math.min(7, Math.floor((game.h - top - 60) / rowH)));
    const h = top + visible * rowH + 34;
    const x = Math.floor((game.w - w) / 2), y = Math.max(2, Math.floor((game.h - h) / 2) - 10);
    const rows = Array.from({ length: visible }, (_, i) => ({ x: x + 4, y: y + top + i * rowH, w: w - 8, h: rowH - 1 }));
    const tl = this.tabs();
    const tw = tl.length ? Math.floor((w - 8) / tl.length) : 0;
    const tabs = tl.map((_, i) => ({ x: x + 4 + i * tw, y: y + 13, w: tw - 2, h: 10 }));
    return { x, y, w, h, rows, tabs, visible, rowH };
  }

  update(game: Game): void {
    const inp = game.input;
    const rows = this.rows(game);
    const n = Math.max(1, rows.length);
    const tl = this.tabs();
    if (tl.length && inp.repeat('left')) { this.tab = (this.tab + tl.length - 1) % tl.length; this.cursor = 0; this.scroll = 0; sfx.blip(); return; }
    if (tl.length && inp.repeat('right')) { this.tab = (this.tab + 1) % tl.length; this.cursor = 0; this.scroll = 0; sfx.blip(); return; }
    if (inp.repeat('up')) { this.cursor = (this.cursor + n - 1) % n; sfx.blip(); }
    if (inp.repeat('down')) { this.cursor = (this.cursor + 1) % n; sfx.blip(); }
    let go = inp.pressed('a');
    const L = this.layout(game);
    for (const t of inp.taps) {
      const th = L.tabs.findIndex((r) => inRect(r, t.x, t.y));
      if (th >= 0) { this.tab = th; this.cursor = 0; this.scroll = 0; sfx.blip(); return; }
      const hit = L.rows.findIndex((r) => inRect(r, t.x, t.y));
      if (hit >= 0 && hit + this.scroll < rows.length) { const i = hit + this.scroll; if (i === this.cursor) go = true; this.cursor = i; sfx.blip(); }
      else if (!inRect(L, t.x, t.y)) { this.close(); return; }
    }
    if (this.cursor >= rows.length) this.cursor = Math.max(0, rows.length - 1);
    if (this.cursor < this.scroll) this.scroll = this.cursor;
    if (this.cursor >= this.scroll + L.visible) this.scroll = this.cursor - L.visible + 1;
    if (go) {
      const r = rows[this.cursor];
      if (r?.act) r.act(); else sfx.error();
    }
    if (inp.pressed('b')) this.close();
  }

  protected close(): void { this.closed = true; sfx.cancel(); }

  draw(game: Game, g: CanvasRenderingContext2D): void {
    const L = this.layout(game);
    panel(g, L.x, L.y, L.w, L.h, 'paper');
    drawText(g, this.title(game), L.x + 5, L.y + 5, P.CRAN);
    if (this.showGold()) drawTextRight(g, `${game.gold}G`, L.x + L.w - 5, L.y + 5, P.RUST);
    this.tabs().forEach((t, i) => {
      const r = L.tabs[i], sel = i === this.tab;
      g.fillStyle = hex(sel ? P.CRAN : P.AMBER); g.fillRect(r.x, r.y, r.w, r.h);
      drawTextCentered(g, t, r.x + r.w / 2, r.y + 3, sel ? P.LANTERN : P.RUST);
    });
    const rows = this.rows(game);
    if (!rows.length) drawText(g, 'NOTHING HERE YET.', L.x + 8, L.rows[0].y + 5, P.RUST);
    L.rows.forEach((r, k) => {
      const i = k + this.scroll;
      const row = rows[i];
      if (!row) return;
      const sel = i === this.cursor;
      if (sel) { g.fillStyle = hex(P.AMBER); g.fillRect(r.x, r.y, r.w, r.h); }
      const icon = row.icon ? ICON[row.icon] : undefined;
      if (icon) g.drawImage(icon, r.x + 1, r.y);
      const tx = r.x + (row.icon ? 19 : 4);
      const maxC = Math.floor((r.w - (tx - r.x) - 44) / 4);
      drawText(g, row.label.slice(0, maxC), tx, r.y + 2, sel ? (row.dim ? P.RUST : P.VOID) : row.dim ? P.AMBER : P.CRAN);
      if (row.sub) drawText(g, row.sub.slice(0, Math.floor((r.w - (tx - r.x) - 4) / 4)), tx, r.y + 9, sel ? P.CRAN : P.RUST);
      if (row.right) drawTextRight(g, row.right, r.x + r.w - 2, r.y + 2, sel ? (row.dim ? P.RUST : P.VOID) : row.dim ? P.AMBER : P.RUST);
    });
    if (rows.length > L.visible) drawTextRight(g, `${this.cursor + 1}/${rows.length}`, L.x + L.w - 5, L.y + L.h - 11, P.RUST);
    const desc = rows[this.cursor]?.desc ?? '';
    wrapText(desc, L.w - 10).slice(0, 2).forEach((l, k) => drawText(g, l, L.x + 5, L.y + L.h - 28 + k * 7, P.CRAN));
    drawText(g, this.footer(), L.x + 5, L.y + L.h - 11, P.RUST);
  }
}

/* ------------------------------------------------------------------ */

function buyRow(game: Game, e: ShopEntry, note = ''): Row {
  const def = ITEMS[e.id];
  const cost = game.priceOf(e.cost);
  const crop = def.crop ? CROP_BY_ID[def.crop] : undefined;
  const sub = crop ? `${crop.days}D${crop.regrow ? ' REGROWS' : ''}${crop.bogOnly ? ' BOG' : ''}  OWNED ${game.inv.count(e.id)}` : `${note}OWNED ${game.inv.count(e.id)}`;
  return {
    icon: e.id, label: crop?.name ?? def.name, sub, right: `${cost}G`, desc: crop?.lore ?? def.desc,
    act: () => game.buy(e.id, cost),
  };
}

/** Generic buy-only shop. */
export class ShopMenu extends ListMenu {
  constructor(private readonly name: string, private readonly stock: () => readonly ShopEntry[]) { super(); }
  title(): string { return this.name; }
  rows(game: Game): Row[] { return this.stock().map((e) => buyRow(game, e)); }
  override footer(): string { return 'A: BUY  B: CLOSE'; }
}

/** General Store counter + Outfitter upgrades (Gideon). */
export class StoreMenu extends ListMenu {
  constructor(private readonly general: readonly ShopEntry[]) { super(); }
  override tabs(): string[] { return ['GENERAL', 'OUTFITTER']; }
  title(): string { return 'GENERAL STORE & OUTFITTER'; }
  override footer(): string { return this.tab === 0 ? 'L/R: TAB  A: BUY  B: CLOSE' : 'L/R: TAB  A: UPGRADE  B: CLOSE'; }
  rows(game: Game): Row[] {
    if (this.tab === 0) return this.general.map((e) => buyRow(game, e));
    return TOOL_LINES.map((line) => {
      const lv = game.progress.tools[line];
      const tiers = UPGRADES[line];
      const cur = tiers[lv];
      const next = tiers[lv + 1];
      if (!next) return { label: cur.name, sub: 'FULLY UPGRADED', right: 'MAX', dim: true, desc: cur.desc };
      const mats = next.mats.map(([id, n]) => `${n} ${ITEMS[id].name} (${game.inv.count(id)})`).join(', ');
      return {
        label: `${cur.name} > ${next.name}`, sub: mats || 'NO MATERIALS', right: `${game.priceOf(next.cost)}G`,
        desc: next.desc, act: () => game.upgradeTool(line),
      };
    });
  }
}

/** Porch Workbench: crafting + mail-order seeds. */
export class CraftMenu extends ListMenu {
  override tabs(): string[] { return ['CRAFT', 'BLUEPRINTS', 'SEEDS']; }
  title(): string { return 'PORCH WORKBENCH'; }
  override footer(): string { return this.tab === 2 ? 'L/R: TAB  A: BUY  B: CLOSE' : 'L/R: TAB  A: CRAFT  B: CLOSE'; }
  private recipeRow(game: Game, r: Recipe): Row {
    const out = ITEMS[r.out];
    const can = r.inputs.every(([id, n]) => game.inv.count(id) >= n);
    const owned = out.kind === 'gear' && game.inv.count(r.out) > 0;
    const sub = r.inputs.map(([id, n]) => `${n} ${ITEMS[id]?.name ?? id} (${game.inv.count(id)})`).join(' + ');
    return {
      icon: r.out, label: out.name, sub, right: owned ? 'OWNED' : can ? 'CRAFT' : '--', dim: !can || owned,
      desc: out.desc, act: () => game.craft(r),
    };
  }
  rows(game: Game): Row[] {
    if (this.tab === 0) return RECIPES.filter((r) => !r.blueprint).map((r) => this.recipeRow(game, r));
    if (this.tab === 1) {
      return RECIPES.filter((r) => r.blueprint).map((r) => {
        if (game.progress.blueprints.has(r.blueprint!)) return this.recipeRow(game, r);
        const bp = BLUEPRINTS.find((b) => b.id === r.blueprint)!;
        return { icon: r.out, label: `??? ${bp.name}`, sub: `BLUEPRINT: ${bp.merchant === 'ezri' ? 'OLD EZRI' : 'PROF. PIKE'}`, right: 'LOCKED', dim: true, desc: 'Traveling Merchants sell this blueprint on foggy nights and during the Folklore Festival.' };
      });
    }
    return CATALOG_SEEDS.map((id) => buyRow(game, { id, cost: CROP_BY_ID[ITEMS[id].crop ?? '']?.seedPrice ?? 0 }, 'MAIL-ORDER '));
  }
}

/** Traveling merchant: exclusive blueprints + rare goods. */
export class MerchantMenu extends ListMenu {
  constructor(private readonly who: 'ezri' | 'pike') { super(); }
  override tabs(): string[] { return ['BLUEPRINTS', 'GOODS']; }
  title(): string { return this.who === 'ezri' ? "OLD EZRI'S APOTHECARY" : "PROF. PIKE'S ANOMALIES"; }
  override footer(): string { return 'L/R: TAB  A: BUY  B: CLOSE'; }
  rows(game: Game): Row[] {
    if (this.tab === 1) return MERCHANT_GOODS[this.who].map((e) => buyRow(game, e));
    return BLUEPRINTS.filter((b) => b.merchant === this.who).map((b) => {
      const owned = game.progress.blueprints.has(b.id);
      const r = RECIPES.find((x) => x.blueprint === b.id)!;
      return {
        icon: r.out, label: `${b.name} Blueprint`, sub: owned ? 'LEARNED' : r.inputs.map(([id, n]) => `${n} ${ITEMS[id].name}`).join(' + '),
        right: owned ? 'OWNED' : `${game.priceOf(b.price)}G`, dim: owned, desc: b.desc,
        act: owned ? undefined : () => game.buyBlueprint(b.id, game.priceOf(b.price)),
      };
    });
  }
}

/** Agnes Vance's donation desk + milestone list. */
export class DonateMenu extends ListMenu {
  override tabs(): string[] { return ['DONATE', 'MILESTONES']; }
  title(game: Game): string { return `HISTORICAL SOCIETY  ${game.progress.donations}/36`; }
  override showGold(): boolean { return false; }
  override footer(): string { return this.tab === 0 ? 'L/R: TAB  A: DONATE  B: CLOSE' : 'L/R: TAB  B: CLOSE'; }
  rows(game: Game): Row[] {
    if (this.tab === 1) {
      return MILESTONES.map((m) => {
        const got = game.progress.donations >= m.count;
        return { label: `${m.count}: ${m.title}`, sub: got ? 'UNLOCKED' : `${m.count - game.progress.donations} MORE`, right: got ? 'OK' : '', dim: !got, desc: m.desc };
      });
    }
    const out: Row[] = [];
    for (const c of CRYPTIDS) {
      if (game.progress.donated.has(c.id)) continue;
      const have = game.inv.count(c.drop.id);
      if (have <= 0) continue;
      out.push({ icon: c.drop.id, label: c.drop.name, sub: `NO.${String(c.num).padStart(2, '0')} ${c.name}`, right: `x${have}`, desc: c.drop.desc, act: () => game.donate(c.id) });
    }
    return out;
  }
}

/** Town Square Bulletin Board. */
export class BoardMenu extends ListMenu {
  title(): string { return 'PINE HOLLOW BULLETIN BOARD'; }
  override showGold(): boolean { return true; }
  override footer(): string { return 'A: READ / DELIVER  B: CLOSE'; }
  rows(game: Game): Row[] {
    const out: Row[] = [];
    const req = game.boardRequest();
    const def = ITEMS[req.id];
    const doneToday = game.progress.boardDay === game.clock.day;
    out.push({
      icon: req.id, label: `REQUEST: ${req.qty} ${def.name}`, sub: doneToday ? 'COMPLETED TODAY' : `HAVE ${game.inv.count(req.id)}`, right: doneToday ? 'DONE' : `${req.reward}G`,
      dim: doneToday, desc: `Daily town request. Deliver ${req.qty} ${def.name} for ${req.reward}g. A new request is posted every morning.`,
      act: doneToday ? undefined : () => game.deliverBoard(),
    });
    const report = game.sightingReport();
    if (report) out.push({ label: 'TELEGRAPH: SIGHTING REPORT', sub: report.slice(0, 40), desc: report, act: () => { sfx.blip(); game.toast(report); } });
    for (const n of game.boardNotices()) out.push({ label: n.title, sub: n.sub, desc: n.text, act: () => { sfx.blip(); game.toast(n.text.slice(0, 90)); } });
    return out;
  }
}

/** Cabin display pedestal: show or take back a specimen. */
export class PedestalMenu extends ListMenu {
  constructor(private readonly key: string) { super(); }
  title(): string { return 'DISPLAY PEDESTAL'; }
  override showGold(): boolean { return false; }
  override footer(): string { return 'A: DISPLAY / TAKE  B: CLOSE'; }
  rows(game: Game): Row[] {
    const out: Row[] = [];
    const cur = game.progress.displays[this.key];
    if (cur) out.push({ icon: cur, label: `TAKE BACK ${ITEMS[cur].name}`, sub: 'CURRENTLY ON DISPLAY', act: () => { game.setDisplay(this.key, null); this.closed = true; } });
    const seen = new Set<string>();
    for (const s of game.inv.slots) {
      if (!s || seen.has(s.id) || ITEMS[s.id].kind !== 'specimen') continue;
      seen.add(s.id);
      out.push({ icon: s.id, label: ITEMS[s.id].name, sub: `x${s.n} IN BAG`, desc: ITEMS[s.id].desc, act: () => { game.setDisplay(this.key, s.id); this.closed = true; } });
    }
    return out;
  }
}
