/**
 * Cabin companion runtime. Your pet follows a tile behind you around the cabin
 * yard and town (the hound and the raven come into the wilds too; the cat stays
 * home), waits outside doors and through encounters, and sleeps by the stove at
 * night. Pet them once a day for a little stamina and bond.
 */
import type { Game } from './game';
import type { MapId } from '../data/mapgen';
import { PETS, CAT_GIFTS } from '../data/pets';
import type { PetKind } from '../data/pets';
import { O } from '../data/tiles';
import { DIR_VEC } from '../util';
import { Dialog } from '../ui/menus';
import { NamePrompt } from '../ui/namePrompt';
import { sfx } from '../audio/sfx';
import { hash2 } from '../util';

const HOME_SPOT: [number, number] = [30, 20];          // cabin porch steps
const BED_SPOT: [number, number] = [2, 9];             // by the woodstove inside
const DOORMAT: [number, number] = [27, 20];            // the cat's gift spot
const SPEED = 70;                                       // px per second
const PERCHES = new Set<number>([O.FENCE, O.SIGN, O.LAMP, O.MAILBOX, O.WOODPILE]);

export type PetMode = 'follow' | 'wait' | 'home' | 'sleep';

export class Companion {
  map: MapId | null = null;
  x = 0;
  y = 0;
  tx = 0;
  ty = 0;
  right = false;
  moving = false;
  mode: PetMode = 'home';
  /** Raven: sitting up on a fence post (pixel lift). */
  perched = false;
  private trail: Array<[number, number]> = [];
  private idleT = 0;
  emote: { kind: 'heart' | 'bark' | 'caw'; t: number } | null = null;
  /** Direction the pup is pointing its nose (bark icon). */
  barkDir: [number, number] = [0, 0];
  private barkT = 4;
  private cawT = 8;
  private cawToastMap = '';

  private place(map: MapId, tx: number, ty: number): void {
    this.map = map; this.tx = tx; this.ty = ty; this.x = tx * 16; this.y = ty * 16; this.trail = []; this.perched = false;
  }

  update(game: Game, dt: number): void {
    const pet = game.progress.pet;
    if (!pet) { this.map = null; return; }
    const def = PETS[pet.kind];
    if (this.emote) { this.emote.t -= dt; if (this.emote.t <= 0) this.emote = null; }
    const m = game.cur, p = game.player;
    const mins = game.clock.minutes;
    // Bedtime: curled up by the woodstove.
    if (mins >= 22 * 60 || mins < 6 * 60) {
      if (this.mode !== 'sleep') { this.mode = 'sleep'; this.place('CABIN_INTERIOR', BED_SPOT[0], BED_SPOT[1]); }
      return;
    }
    const followable = !m.def.indoor && (m.id === 'CABIN_YARD' || m.id === 'PINE_HOLLOW_TOWN' || (def.hikes && m.def.wild));
    if (followable) {
      if (this.mode !== 'follow' || this.map !== m.id) {
        // Trot in behind you.
        const [dx, dy] = DIR_VEC[p.dir];
        const bx = p.tx - dx, by = p.ty - dy;
        if (m.inBounds(bx, by) && !m.blocked(bx, by)) this.place(m.id, bx, by); else this.place(m.id, p.tx, p.ty);
        this.mode = 'follow';
      }
      this.follow(game, dt);
      this.perks(game, dt);
      return;
    }
    if (m.def.indoor) {
      // Waiting politely by the door you went through (or at home if they weren't with you).
      if (this.mode === 'follow') this.mode = 'wait';
      if (this.mode === 'sleep' || this.map === null) { this.mode = 'home'; this.place('CABIN_YARD', HOME_SPOT[0], HOME_SPOT[1]); }
      this.moving = false;
      return;
    }
    // Somewhere they don't go: back home on the porch.
    if (this.mode !== 'home' || this.map !== 'CABIN_YARD') { this.mode = 'home'; this.place('CABIN_YARD', HOME_SPOT[0], HOME_SPOT[1]); }
  }

  private follow(game: Game, dt: number): void {
    const p = game.player, m = game.cur;
    const last = this.trail[this.trail.length - 1];
    if (!last || last[0] !== p.tx || last[1] !== p.ty) { this.trail.push([p.tx, p.ty]); if (this.trail.length > 12) this.trail.shift(); this.idleT = 0; }
    else this.idleT += dt;
    let target: [number, number] = this.trail.length >= 2 ? this.trail[this.trail.length - 2] : [this.tx, this.ty];
    // Raven: when you stand still, it hops up onto a nearby fence post or sign.
    if (game.progress.pet?.kind === 'raven' && this.idleT > 1.5) {
      let best: [number, number] | null = null, bd = 99;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const x = p.tx + dx, y = p.ty + dy;
        if (!m.inBounds(x, y) || !PERCHES.has(m.obj(x, y))) continue;
        const d = Math.abs(dx) + Math.abs(dy);
        if (d < bd) { bd = d; best = [x, y]; }
      }
      if (best) target = best;
      this.perched = !!best;
    } else this.perched = false;
    const gx = target[0] * 16, gy = target[1] * 16;
    const dx = gx - this.x, dy = gy - this.y, dist = Math.hypot(dx, dy);
    if (dist > 16 * 7) { this.x = gx; this.y = gy; }
    else if (dist > 0.5) {
      const step = Math.min(dist, SPEED * (p.running ? 1.6 : 1) * dt);
      this.x += (dx / dist) * step; this.y += (dy / dist) * step;
      if (Math.abs(dx) > 0.5) this.right = dx > 0;
    }
    this.moving = dist > 0.5;
    this.tx = Math.round(this.x / 16); this.ty = Math.round(this.y / 16);
  }

  /** The pup sniffs out clues; the raven caws when rare odds are up. */
  private perks(game: Game, dt: number): void {
    const kind = game.progress.pet!.kind;
    const name = game.progress.pet!.name;
    if (kind === 'pup' && game.cur.def.wild) {
      this.barkT -= dt;
      if (this.barkT <= 0) {
        this.barkT = 5 + Math.random() * 3;
        const sign = game.sightings.signs.filter((s) => s.live && Math.abs(s.x - this.tx) + Math.abs(s.y - this.ty) <= 10)
          .sort((a, b) => (Math.abs(a.x - this.tx) + Math.abs(a.y - this.ty)) - (Math.abs(b.x - this.tx) + Math.abs(b.y - this.ty)))[0];
        if (sign) {
          this.barkDir = [Math.sign(sign.x - this.tx), Math.sign(sign.y - this.ty)];
          this.right = sign.x > this.tx;
          this.emote = { kind: 'bark', t: 1.6 };
          sfx.bark();
        }
      }
    }
    if (kind === 'raven') {
      this.cawT -= dt;
      if (this.cawT <= 0) {
        this.cawT = 18 + Math.random() * 10;
        if (rareOddsUp(game)) {
          this.emote = { kind: 'caw', t: 1.6 };
          sfx.caw();
          const key = `${game.cur.id}:${game.clock.day}`;
          if (this.cawToastMap !== key) { this.cawToastMap = key; game.toast(`${name} caws softly. Rare variants are stirring tonight.`); }
        }
      }
    }
  }

  /** Is the pet standing on this tile on the current map? */
  at(game: Game, x: number, y: number): boolean {
    return this.map === game.cur.id && this.tx === x && this.ty === y;
  }
}

/** Rare Variant odds are up right now (ignoring Agnes's permanent brooch), or a storm is charging the air. */
export function rareOddsUp(game: Game): boolean {
  const base = game.progress.flags.has('agnes_brooch') ? 1.5 : 1;
  return game.rareMult() / base > 1.01 || game.weatherNow() === 'STORM';
}

/** Pet them: once a day it helps (stamina + bond); after that it's just nice. */
export function petPet(game: Game): void {
  const pet = game.progress.pet;
  if (!pet) return;
  const def = PETS[pet.kind];
  const c = game.companion;
  c.emote = { kind: 'heart', t: 1.8 };
  sfx.trustChime();
  const line = def.pet[(game.clock.day + pet.bond) % def.pet.length].replace(/^The (pup|cat|raven)/, pet.name);
  if (pet.petDay !== game.clock.day) {
    pet.petDay = game.clock.day;
    pet.bond = Math.min(100, pet.bond + 4);
    game.stamina = Math.min(game.maxStamina, game.stamina + 15);
    game.openOverlay(new Dialog([line, `(+15 stamina. Bond with ${pet.name}: ${bondWord(pet.bond)}.)`]));
  } else game.openOverlay(new Dialog([line]));
}

export function bondWord(b: number): string {
  return b >= 80 ? 'inseparable' : b >= 50 ? 'devoted' : b >= 20 ? 'friendly' : 'getting to know you';
}

/** Morning: the cat sometimes leaves a gift on the doormat. Returns a summary line. */
export function petOvernight(game: Game): string | null {
  const pet = game.progress.pet;
  if (!pet || pet.kind !== 'cat') return null;
  const day = game.clock.day;
  if (hash2(day, 11, 707) > 0.55) return null;
  const item = CAT_GIFTS[Math.floor(hash2(day, 12, 708) * CAT_GIFTS.length)];
  const yard = game.getMap('CABIN_YARD');
  yard.forage.set(yard.idx(DOORMAT[0], DOORMAT[1]), item);
  return `${pet.name} left something on the doormat.`;
}

/* ---------------- Adoption ---------------- */

/** The porch visit: first week of the game, or any morning after if you said "not yet". */
export function adoptionTick(game: Game): void {
  const p = game.progress;
  if (p.pet || game.mode !== 'play' || game.overlays.length || game.fading) return;
  if (game.cur.id !== 'CABIN_YARD' || game.clock.day < 2 || (p.days.petAsk ?? 0) > game.clock.day) return;
  const mins = game.clock.minutes;
  if (mins < 6 * 60 + 30 || mins > 11 * 60) return;
  const pl = game.player;
  if (Math.abs(pl.tx - 28) > 8 || Math.abs(pl.ty - 20) > 6) return;
  p.days.petAsk = game.clock.day + 1;
  for (const [id, dx] of [['barnaby', 1], ['mabel', -1]] as Array<[string, number]>) {
    const npc = game.townsfolk.npcs.find((n) => n.def.id === id);
    const x = pl.tx + dx, y = pl.ty + 1;
    if (npc && game.cur.inBounds(x, y) && !game.cur.blocked(x, y)) game.townsfolk.hold(npc, 'CABIN_YARD', x, y, 6);
  }
  sfx.open();
  const choose = (k: PetKind) => () => {
    const def = PETS[k];
    game.openOverlay(new NamePrompt(`What will you call your ${def.title.toLowerCase()}?`, def.names, (name) => {
      p.pet = { kind: k, name, bond: 0, petDay: 0, adoptDay: game.clock.day };
      sfx.fanfare();
      game.openOverlay(new Dialog([
        k === 'pup' ? `Barney: "${name}. Good name. She'll find you a jackalope before she finds her own tail."` : k === 'cat' ? `Mabel: "${name}! Keep that one in cream and she\'ll keep your cabin in mice-free bliss."` : `Barney: "${name}. Clara will be tickled. Watch out, it steals bottle caps."`,
        `(${name} has come to live at the cabin. Pet ${k === 'cat' ? 'her' : k === 'pup' ? 'her' : 'it'} once a day. ${def.perk})`,
      ]));
    }));
  };
  game.openOverlay(new Dialog([
    'Barney and Mabel come up the path with a laundry basket between them. The basket is wiggling.',
    'Barney: "Buster\'s had a litter, and this one keeps chewing my timetables." Mabel: "And one of my barn kittens needs a porch to boss around."',
    'Barney: "And Clara found this fella up on the ridge with a hurt wing. Mended now. Won\'t leave her antenna alone." A raven peers out of the basket and says something rude in static.',
    'Mabel: "A fire-watch cabin needs company, hon. Take your pick."',
  ], [
    { label: `${PETS.pup.title}`, fn: choose('pup') },
    { label: `${PETS.cat.title}`, fn: choose('cat') },
    { label: `${PETS.raven.title}`, fn: choose('raven') },
    { label: 'Not just yet', fn: () => { p.days.petAsk = game.clock.day + 3; game.openOverlay(new Dialog(['Mabel: "Suit yourself, hon. We\'ll swing by again."'])); } },
  ]));
}
