/**
 * Fishing and hunting mini-games. Both are a GBC-style timing bar:
 * press A (or tap) while the marker is inside the sweet spot.
 */
import type { Game } from '../engine/game';
import type { Overlay } from './overlay';
import type { Deer } from '../engine/wildlife';
import { drawText, drawTextCentered } from '../graphics/font';
import { hex, P } from '../graphics/palette';
import { ICON, MISC } from '../graphics/sprites';
import { deerKey } from '../graphics/outdoorSprites';
import { sfx } from '../audio/sfx';
import { ITEMS } from '../data/items';
import { panel } from './panel';
import { FishDef, pickFish, Water, WeaponDef } from '../engine/outdoors';
import { timeTags } from '../data/weather';

/** Bouncing marker on a 0..1 bar. */
function bounce(t: number, speed: number): number {
  const u = (t * speed) % 2;
  return u < 1 ? u : 2 - u;
}

function drawBar(g: CanvasRenderingContext2D, x: number, y: number, w: number, center: number, zone: number, marker: number, zoneColor: number): void {
  g.fillStyle = hex(P.VOID); g.fillRect(x - 1, y - 1, w + 2, 9);
  g.fillStyle = hex(P.SHADOW); g.fillRect(x, y, w, 7);
  g.fillStyle = hex(zoneColor); g.fillRect(Math.round(x + (center - zone / 2) * w), y, Math.max(2, Math.round(zone * w)), 7);
  const mx = Math.round(x + marker * (w - 2));
  g.fillStyle = hex(P.LANTERN); g.fillRect(mx, y - 2, 2, 11);
}

/* ------------------------------------------------------------------ */
/* Fishing                                                             */
/* ------------------------------------------------------------------ */

export class FishingGame implements Overlay {
  closed = false;
  private phase: 'cast' | 'wait' | 'bite' | 'reel' | 'done' = 'cast';
  private t = 0;
  private waitFor: number;
  private fish: FishDef;
  private center = 0.5;
  private hits = 0;
  private misses = 0;
  private msg = 'Casting...';
  private doneT = 0;

  constructor(game: Game, private readonly water: Water, private readonly bx: number, private readonly by: number) {
    const tags = timeTags(game.clock.minutes);
    this.fish = pickFish(water, tags.includes('NIGHT') || tags.includes('DUSK'));
    // Barney's fishing secrets (4 hearts): bites come twice as fast.
    this.waitFor = (1.5 + Math.random() * 3) * (game.progress.flags.has('barney_fishing') ? 0.5 : 1);
    sfx.swing();
  }

  private end(msg: string): void { this.phase = 'done'; this.msg = msg; this.doneT = 0; }

  update(game: Game, dt: number): void {
    const inp = game.input;
    this.t += dt;
    const press = inp.pressed('a') || inp.taps.length > 0;
    if (this.phase === 'done') { this.doneT += dt; if (this.doneT > 0.4 && (press || inp.pressed('b') || this.doneT > 2.2)) this.closed = true; return; }
    if (inp.pressed('b')) { sfx.cancel(); this.end('You reel in your line.'); return; }
    switch (this.phase) {
      case 'cast':
        if (this.t > 0.5) { this.phase = 'wait'; this.t = 0; this.msg = `Waiting for a bite... (${this.water === 'creek' ? 'creek' : this.water === 'deep' ? 'deep pool' : 'lake'})`; }
        return;
      case 'wait':
        if (press) { sfx.error(); this.end('Too soon! Whatever was nosing the bait spooked.'); return; }
        if (this.t > this.waitFor) { this.phase = 'bite'; this.t = 0; this.msg = '! A BITE! Press A!'; sfx.alert(); }
        return;
      case 'bite':
        if (press) { this.phase = 'reel'; this.t = 0; this.center = 0.25 + Math.random() * 0.5; this.msg = 'Reel when the marker is in the green!'; sfx.blip(); return; }
        if (this.t > 0.8) { sfx.error(); this.end('It stole the bait and got away.'); }
        return;
      case 'reel': {
        if (!press) return;
        const pos = bounce(this.t, this.fish.speed);
        if (Math.abs(pos - this.center) <= this.fish.zone / 2) {
          this.hits++; sfx.plant();
          this.center = 0.2 + Math.random() * 0.6;
          if (this.hits >= this.fish.hits) {
            const name = ITEMS[this.fish.id].name;
            if (!game.inv.canFit(this.fish.id)) { sfx.error(); this.end(`A ${name}! But your bag is full, so you let it go.`); return; }
            game.inv.add(this.fish.id, 1);
            sfx.harvest();
            game.stats.foraged++;
            this.end(this.fish.id === 'muskie' ? `A MUSKIE! The fish of ten thousand casts!` : `Caught a ${name}!`);
          }
        } else {
          this.misses++; sfx.error();
          if (this.misses >= 3) this.end('The line goes slack. It got away.');
        }
      }
    }
  }

  draw(game: Game, g: CanvasRenderingContext2D): void {
    // Bobber on the water
    const cx = game.cam.ix, cy = game.cam.iy;
    const bob = this.phase === 'bite' ? (Math.floor(this.t * 12) % 2) : Math.floor(this.t * 2) % 2;
    if (this.phase !== 'done' && this.phase !== 'cast') g.drawImage(bob ? MISC.bobber1 : MISC.bobber0, this.bx * 16 - cx, this.by * 16 - cy);
    const w = Math.min(game.w - 8, 200), h = this.phase === 'reel' ? 40 : 24;
    const x = Math.floor((game.w - w) / 2), y = game.h - h - 26;
    panel(g, x, y, w, h);
    if (this.phase === 'done' && this.hits >= this.fish.hits && ICON[this.fish.id]) g.drawImage(ICON[this.fish.id], x + 4, y + 4);
    drawText(g, this.msg.toUpperCase().slice(0, Math.floor((w - 26) / 4)), x + (this.phase === 'done' ? 22 : 6), y + 6, this.phase === 'bite' ? P.LANTERN : P.FOG);
    if (this.phase === 'reel') {
      drawBar(g, x + 8, y + 18, w - 16, this.center, this.fish.zone, bounce(this.t, this.fish.speed), P.MOSS);
      drawTextCentered(g, `${'O'.repeat(this.hits)}${'.'.repeat(Math.max(0, this.fish.hits - this.hits))}   MISSES ${this.misses}/3   B: REEL IN`, x + w / 2, y + 30, P.MIST);
    } else if (this.phase !== 'done') drawText(g, 'A: HOOK IT WHEN IT BITES   B: REEL IN', x + 6, y + 14, P.MIST);
  }
}

/* ------------------------------------------------------------------ */
/* Hunting                                                             */
/* ------------------------------------------------------------------ */

export class AimGame implements Overlay {
  closed = false;
  private t = 0;
  private done = false;
  private doneT = 0;
  private msg = '';
  private hit = false;
  private readonly zone: number;
  private readonly center = 0.3 + Math.random() * 0.4;
  private readonly speed: number;

  constructor(private readonly game: Game, private readonly deer: Deer, private readonly weapon: WeaponDef, private readonly weaponKind: 'bow' | 'rifle', dist: number) {
    // Farther = smaller sweet spot. The rifle's is wider and slower.
    this.zone = Math.max(0.09, weapon.zone * (1 - 0.07 * (dist - 1)));
    this.speed = weaponKind === 'rifle' ? 0.9 : 1.25;
  }

  update(game: Game, dt: number): void {
    const inp = game.input;
    this.t += dt;
    const press = inp.pressed('a') || inp.taps.length > 0;
    if (this.done) { this.doneT += dt; if (this.doneT > 0.5 && (press || inp.pressed('b') || this.doneT > 2.5)) this.closed = true; return; }
    if (inp.pressed('b')) { sfx.cancel(); this.finish(false, 'You lower your weapon.', false); return; }
    if (this.t > 5) { this.finish(false, 'The deer catches your scent and bolts!', false); return; }
    if (press) {
      const pos = bounce(this.t, this.speed);
      this.finish(Math.abs(pos - this.center) <= this.zone / 2, '', true);
    }
  }

  private finish(hit: boolean, msg: string, fired: boolean): void {
    const g = this.game;
    this.done = true; this.hit = hit;
    if (fired) {
      g.inv.remove(this.weapon.ammo, 1);
      if (this.weaponKind === 'rifle') { sfx.thunder(); g.gunshot(); }
      else sfx.swing();
      // Arrows can often be recovered.
      if (this.weapon.recover > 0 && Math.random() < (hit ? this.weapon.recover : this.weapon.recover * 0.55)) g.inv.add(this.weapon.ammo, 1);
    }
    if (hit) {
      g.wildlife.remove(this.deer);
      const meat = this.deer.buck ? 3 : 2;
      const cx = this.deer.tx * 16 + 8, cy = this.deer.ty * 16 + 8;
      g.give('raw_venison', meat, cx, cy);
      g.give('deer_hide', 1, cx, cy);
      if (this.deer.buck) g.give('whitetail_antler', 1, cx, cy);
      sfx.harvest();
      this.msg = `Clean shot. ${meat} Raw Venison and a Deer Hide${this.deer.buck ? ', plus the antlers' : ''}.`;
    } else {
      g.wildlife.scatter(g);
      this.msg = msg || 'Missed! The deer bounds off, white tail flagging.';
    }
  }

  draw(game: Game, g: CanvasRenderingContext2D): void {
    const w = Math.min(game.w - 8, 200), h = 74;
    const x = Math.floor((game.w - w) / 2), y = Math.max(4, Math.floor((game.h - h) / 2) - 10);
    panel(g, x, y, w, h);
    drawText(g, this.weapon.name.toUpperCase(), x + 6, y + 5, P.LANTERN);
    const ammo = game.inv.count(this.weapon.ammo);
    drawText(g, `${ammo} ${this.weaponKind === 'rifle' ? 'CARTRIDGES' : 'ARROWS'}`, x + w - 6 - (`${ammo} ${this.weaponKind === 'rifle' ? 'CARTRIDGES' : 'ARROWS'}`.length * 4), y + 5, P.MIST);
    // Scope view
    const vx = x + 6, vy = y + 13, vw = w - 12, vh = 34;
    g.fillStyle = hex(P.FOREST); g.fillRect(vx, vy, vw, vh);
    g.fillStyle = hex(P.MOSS); g.fillRect(vx, vy + vh - 8, vw, 8);
    if (!(this.done && this.hit)) {
      const img = MISC[deerKey(this.deer.buck, false, !this.done, Math.floor(this.t * 2) % 2)];
      const dx = this.done ? vx + vw - 30 + Math.min(40, this.doneT * 60) : vx + vw / 2 - 12;
      g.save(); g.beginPath(); g.rect(vx, vy, vw, vh); g.clip();
      g.drawImage(img, Math.round(dx), vy + vh - 22);
      g.restore();
    }
    if (!this.done) {
      drawBar(g, x + 8, y + 52, w - 16, this.center, this.zone, bounce(this.t, this.speed), P.RED);
      drawText(g, 'A: SHOOT IN THE RED   B: LOWER', x + 6, y + 64, P.MIST);
    } else {
      const lines = this.msg.toUpperCase().match(new RegExp(`.{1,${Math.floor((w - 12) / 4)}}(\\s|$)`, 'g')) ?? [this.msg];
      lines.slice(0, 3).forEach((l, i) => drawText(g, l.trim(), x + 6, y + 50 + i * 7, this.hit ? P.FERN : P.AMBER));
    }
  }
}
