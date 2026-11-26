/** Title screen: New Game, Continue, Export / Import Save JSON, Cloud Backup. */
import type { Game } from '../engine/game';
import { drawText, drawTextCentered, wrapText } from '../graphics/font';
import { hex, P } from '../graphics/palette';
import { OBJ } from '../graphics/sprites';
import { sfx } from '../audio/sfx';
import { loadSave, SaveData } from '../engine/save';
import { exportSave, importSave, validateSave } from './saveio';
import { adoptCode, cloudBackup, cloudCode, cloudDisable, cloudEnable, cloudFetch, formatCode, parseCode } from '../engine/cloud';
import { SAVE_KEY } from '../engine/save';
import { hash2, touchOn } from '../util';
import { inRect, panel, Rect } from './panel';

type Opt = 'continue' | 'new' | 'export' | 'import' | 'cloud' | 'c_now' | 'c_on' | 'c_copy' | 'c_restore' | 'c_off' | 'back';
const LABEL: Record<Opt, string> = {
  continue: 'CONTINUE', new: 'NEW GAME', export: 'EXPORT SAVE', import: 'IMPORT SAVE', cloud: 'CLOUD BACKUP',
  c_now: 'BACK UP NOW', c_on: 'TURN ON CLOUD BACKUP', c_copy: 'COPY MY CODE', c_restore: 'RESTORE FROM CODE', c_off: 'TURN OFF', back: 'BACK',
};

export class TitleScreen {
  private sel = 0;
  private save: SaveData | null = loadSave();
  private msg = '';
  private msgT = 0;
  private confirmNew = false;
  private menu: 'main' | 'cloud' = 'main';
  /** True while waiting on the cloud; input is ignored. */
  private busy = false;

  private options(): Opt[] {
    if (this.menu === 'cloud') return cloudCode() ? ['c_now', 'c_copy', 'c_restore', 'c_off', 'back'] : ['c_on', 'c_restore', 'back'];
    return this.save ? ['continue', 'new', 'export', 'import', 'cloud'] : ['new', 'import', 'cloud'];
  }

  private optionRects(game: Game): Rect[] {
    const opts = this.options();
    const n = opts.length;
    const w = Math.max(84, ...opts.map((o) => LABEL[o].length * 4 + 16));
    const titleBottom = Math.max(8, Math.floor(game.h * 0.14)) + 48; // keep clear of the logo & subtitle
    const y0 = Math.max(titleBottom, Math.min(Math.floor(game.h * 0.5), game.h - 44 - n * 12));
    return Array.from({ length: n }, (_, i) => ({ x: Math.floor((game.w - w) / 2), y: y0 + i * 12, w, h: 11 }));
  }

  private say(m: string, secs = 5): void { this.msg = m; this.msgT = secs; }

  private run(task: Promise<void>): void {
    this.busy = true;
    task.finally(() => { this.busy = false; });
  }

  private cloudAction(o: Opt): void {
    if (o === 'back') { this.menu = 'main'; this.sel = this.options().indexOf('cloud'); sfx.cancel(); return; }
    if (o === 'c_on') {
      sfx.confirm(); this.say('Contacting the cloud...');
      this.run(cloudEnable().then((r) => { this.say(r.msg, 12); if (r.ok) { sfx.fanfare(); this.sel = 0; } else sfx.error(); }));
    } else if (o === 'c_now') {
      sfx.confirm(); this.say('Backing up...');
      this.run(cloudBackup().then((r) => { this.say(r.ok ? (r.msg || 'Nothing to back up yet. Sleep in your bed first.') : r.msg); if (!r.ok) sfx.error(); }));
    } else if (o === 'c_copy') {
      const code = cloudCode();
      if (!code) return;
      try { navigator.clipboard?.writeText(formatCode(code)).catch(() => undefined); } catch { /* optional */ }
      sfx.confirm(); this.say(`Copied ${formatCode(code)}. Paste it in Notes or email it to yourself.`, 10);
    } else if (o === 'c_off') {
      if (!window.confirm('Turn off cloud backup on this device? Your last cloud save is kept, and your code can still restore it.')) return;
      cloudDisable(); this.sel = 0; sfx.cancel(); this.say('Cloud backup is off on this device.');
    } else if (o === 'c_restore') {
      const typed = window.prompt('Enter your cloud code (HOLLER-XXXX-XXXX-XXXX):');
      if (typed === null) return;
      const code = parseCode(typed);
      if (!code) { sfx.error(); this.say('That does not look like a cloud code. It has 12 letters and numbers after HOLLER.'); return; }
      sfx.confirm(); this.say('Fetching your cloud save...');
      this.run(cloudFetch(code).then((r) => {
        const d = r.ok && r.save ? validateSave(r.save) : null;
        if (!d) { sfx.error(); this.say(r.ok ? 'The cloud save could not be read.' : r.msg); return; }
        if (this.save && !window.confirm(`Replace the save on this device (day ${this.save.day}) with the cloud save from day ${d.day}?`)) { this.say('Restore cancelled.'); return; }
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(d)); } catch { sfx.error(); this.say('Could not write save (storage blocked).'); return; }
        adoptCode(code);
        this.save = loadSave();
        this.menu = 'main'; this.sel = 0;
        sfx.fanfare(); this.say(`Restored day ${d.day} from the cloud. Choose CONTINUE.`, 8);
      }));
    }
  }

  update(game: Game): void {
    const inp = game.input;
    this.msgT = Math.max(0, this.msgT - 1 / 60);
    if (this.busy) return;
    const opts = this.options();
    if (this.sel >= opts.length) this.sel = 0;
    if (this.confirmNew) {
      if (inp.pressed('a')) { this.confirmNew = false; game.startFromTitle(null); }
      else if (inp.pressed('b') || inp.taps.length) { this.confirmNew = false; sfx.cancel(); }
      return;
    }
    if (inp.repeat('up')) { this.sel = (this.sel + opts.length - 1) % opts.length; sfx.unlock(); sfx.blip(); }
    if (inp.repeat('down')) { this.sel = (this.sel + 1) % opts.length; sfx.unlock(); sfx.blip(); }
    let go = inp.pressed('a');
    for (const t of inp.taps) {
      const hit = this.optionRects(game).findIndex((r) => inRect(r, t.x, t.y));
      if (hit >= 0) { this.sel = hit; go = true; }
    }
    if (!go) return;
    sfx.unlock();
    const o = opts[this.sel];
    if (this.menu === 'cloud') { this.cloudAction(o); return; }
    if (o === 'cloud') { this.menu = 'cloud'; this.sel = 0; sfx.open(); return; }
    if (o === 'continue' && this.save) game.startFromTitle(this.save);
    else if (o === 'new') { if (this.save) { this.confirmNew = true; sfx.alert(); } else game.startFromTitle(null); }
    else if (o === 'export') { sfx.confirm(); exportSave((m) => this.say(m)); }
    else if (o === 'import') {
      sfx.open();
      importSave((m, ok) => { this.say(m); if (ok) { this.save = loadSave(); this.sel = 0; sfx.fanfare(); } else sfx.error(); });
    }
  }

  draw(game: Game, g: CanvasRenderingContext2D): void {
    const W = game.w, H = game.h, t = game.time;
    const bands = [P.VOID, P.SHADOW, P.PINE, P.TWILIGHT];
    const bh = Math.ceil((H * 0.7) / bands.length);
    bands.forEach((c, i) => { g.fillStyle = hex(c); g.fillRect(0, i * bh, W, bh + 1); });
    for (let i = 0; i < 60; i++) {
      const x = Math.floor(hash2(i, 1, 5) * W), y = Math.floor(hash2(i, 2, 5) * H * 0.5);
      if ((Math.floor(t * 2 + i) % 7) === 0) continue;
      g.fillStyle = hex(i % 5 ? P.FOG : P.MOON);
      g.fillRect(x, y, 1, 1);
    }
    const mx = Math.floor(W * 0.78), my = Math.floor(H * 0.16);
    g.fillStyle = hex(P.MOON); g.beginPath(); g.arc(mx, my, 12, 0, Math.PI * 2); g.fill();
    g.fillStyle = hex(P.FOG); g.beginPath(); g.arc(mx - 2, my - 2, 9, 0, Math.PI * 2); g.fill();
    // radio tower on the ridge, blinking
    const tx = Math.floor(W * 0.12), tb = Math.floor(H * 0.62);
    g.fillStyle = hex(P.SHADOW);
    for (let k = 0; k < 40; k++) { const half = Math.round((k / 40) * 6) + 1; g.fillRect(tx - half, tb - 40 + k, 1, 1); g.fillRect(tx + half, tb - 40 + k, 1, 1); }
    if (Math.floor(t * 1.4) % 2 === 0) { g.fillStyle = hex(P.RED); g.fillRect(tx - 1, tb - 43, 3, 3); }
    const ground = Math.floor(H * 0.82);
    g.fillStyle = hex(P.SHADOW); g.fillRect(0, ground, W, H - ground);
    for (let row = 0; row < 2; row++) {
      for (let x = -10; x < W + 10; x += row ? 11 : 15) {
        const img = OBJ.pine[Math.floor(hash2(x, row, 3) * 4)];
        g.drawImage(img, x + (row ? 5 : 0), ground - img.height + 6 + row * 8 + Math.floor(hash2(x, row, 4) * 6));
      }
      g.fillStyle = hex(row ? P.VOID : P.SHADOW);
      g.globalAlpha = row ? 0.35 : 0.55;
      g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
    }
    g.globalAlpha = 0.18; g.fillStyle = hex(P.FOG);
    for (let i = 0; i < 5; i++) { const fx = ((t * (6 + i * 2) + i * 70) % (W + 80)) - 60; g.fillRect(Math.floor(fx), ground - 6 + i * 3, 60, 2); }
    g.globalAlpha = 1;
    if (Math.floor(t * 1.3) % 5 !== 0) { g.fillStyle = hex(P.RED); const ex = Math.floor(W * 0.62), ey = ground - 14; g.fillRect(ex, ey, 2, 1); g.fillRect(ex + 5, ey, 2, 1); }

    const ty = Math.max(8, Math.floor(H * 0.14));
    drawTextCentered(g, 'PINE HOLLER', W / 2, ty, P.FERN, P.VOID, 2);
    drawTextCentered(g, 'RANGER', W / 2, ty + 14, P.LANTERN, P.CRAN, 3);
    drawTextCentered(g, 'THE SIGNAL ON RADIO RIDGE', W / 2, ty + 34, P.MIST, P.VOID);

    const rects = this.optionRects(game);
    const r0 = rects[0];
    panel(g, r0.x - 4, r0.y - 4, r0.w + 8, rects.length * 12 + 6);
    this.options().forEach((o, i) => {
      const r = rects[i];
      const s = i === this.sel;
      drawTextCentered(g, LABEL[o], r.x + r.w / 2, r.y + 2, s ? P.LANTERN : P.MIST);
      if (s && Math.floor(t * 3) % 2 === 0) drawText(g, '>', r.x + 2, r.y + 2, P.LANTERN);
    });
    const below = r0.y + rects.length * 12 + 5;
    if (this.menu === 'cloud') {
      const code = cloudCode();
      drawTextCentered(g, code ? `YOUR CODE: ${formatCode(code)}` : 'CLOUD BACKUP IS OFF', W / 2, below, code ? P.FERN : P.MIST, P.VOID);
    } else if (this.save && this.msgT <= 0) drawTextCentered(g, `SAVE: ${['SPR', 'SUM', 'FAL', 'WIN'][Math.floor((this.save.day - 1) / 28) % 4]} ${((this.save.day - 1) % 28) + 1}, ${this.save.gold}G`, W / 2, below, P.PINE);
    if (this.confirmNew) {
      const w = Math.min(W - 20, 200);
      panel(g, (W - w) / 2, H / 2 - 18, w, 30);
      drawTextCentered(g, 'START OVER? YOUR SAVE WILL BE', W / 2, H / 2 - 12, P.LANTERN);
      drawTextCentered(g, 'REPLACED AT THE FIRST SLEEP.', W / 2, H / 2 - 5, P.LANTERN);
      drawTextCentered(g, 'A: YES   B: NO', W / 2, H / 2 + 3, P.FERN);
    }
    if (this.msgT > 0) wrapText(this.msg, Math.min(W - 20, 180)).forEach((l, i) => drawTextCentered(g, l, W / 2, H - 20 + i * 7 - 7, P.AMBER, P.VOID));
    else drawTextCentered(g, touchOn() ? 'PRESS A' : 'PRESS A / SPACE', W / 2, H - 9, P.MIST, P.VOID);
  }
}
