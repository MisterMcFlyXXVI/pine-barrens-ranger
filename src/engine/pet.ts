/**
 * Cabin companion runtime. Your pet lives at the cabin: by day they potter
 * around their house in the yard (dog house, cat tower or raven perch) or
 * lounge inside the cabin, and they sleep by the stove (or in their pet bed) at
 * night. Press A on their house to take them along: then they follow a tile
 * behind you around the yard and town (the hound and the raven come into the
 * wilds too; cats don't hike), and wait outside doors. Each morning they start
 * at home again. Pet them once a day for a little stamina and bond.
 */
import type { Game } from './game';
import type { MapId } from '../data/mapgen';
import { PETS, CAT_GIFTS } from '../data/pets';
import type { PetKind } from '../data/pets';
import { O, T } from '../data/tiles';
import { DIR_VEC } from '../util';
import { Dialog } from '../ui/menus';
import { NamePrompt } from '../ui/namePrompt';
import { sfx } from '../audio/sfx';
import { hash2 } from '../util';

const HOME_SPOT: [number, number] = [30, 20];          // cabin porch steps
const BED_SPOT: [number, number] = [2, 6];             // by the woodstove inside

/** A Pet Bed you've set out in the cabin (homestead decoration), if any. */
function petBedSpot(game: Game): [number, number] | null {
  const c = game.getMap('CABIN_INTERIOR');
  for (const [i, o] of c.placed) if (o === O.PET_BED) return [i % c.w, Math.floor(i / c.w)];
  return null;
}
const DOORMAT: [number, number] = [27, 20];            // the cat's gift spot
const SPEED = 70;                                       // px per second
const PERCHES = new Set<number>([O.FENCE, O.SIGN, O.LAMP, O.MAILBOX, O.WOODPILE, O.PET_HOUSE]);
const HOME_SPEED = 26;                                  // an unhurried amble around the yard
/** Where the pet's house goes, in order of preference (beside the porch, off the paths). */
const HOUSE_SPOTS: ReadonlyArray<[number, number]> = [[35, 20], [35, 21], [36, 21], [22, 20], [23, 21], [33, 21], [37, 20]];
/** Inside the cabin, they lounge on or around the rug. */
const INSIDE_ANCHOR: [number, number] = [6, 7];

/** The pet's house in the yard (placing one if they don't have it yet). */
export function ensurePetHouse(game: Game): [number, number] | null {
  if (!game.progress.pet) return null;
  const yard = game.getMap('CABIN_YARD');
  for (const [i, o] of yard.placed) if (o === O.PET_HOUSE) return [i % yard.w, Math.floor(i / yard.w)];
  const ok = (x: number, y: number) => yard.inBounds(x, y) && yard.obj(x, y) === O.NONE && !yard.blocked(x, y) && !yard.portalAt(x, y)
    && yard.plotIndex(x, y) < 0 && yard.ground(x, y) !== T.PATH && !yard.blocked(x, y + 1);
  let spot = HOUSE_SPOTS.find(([x, y]) => ok(x, y)) ?? null;
  for (let r = 1; !spot && r < 12; r++) for (let dy = -r; dy <= r && !spot; dy++) for (let dx = -r; dx <= r && !spot; dx++) if (ok(34 + dx, 21 + dy)) spot = [34 + dx, 21 + dy];
  if (!spot) return null;
  yard.placeObject(yard.idx(spot[0], spot[1]), O.PET_HOUSE);
  return spot;
}

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
  /** Home roaming: where they're ambling to, and when they'll pick somewhere new. */
  private goal: [number, number] | null = null;
  private goalT = 0;

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
      if (this.mode !== 'sleep') {
        // Say goodnight rather than vanishing.
        if (this.mode === 'follow' && this.map === m.id && !m.def.indoor) game.toast(`${pet.name} ${pet.kind === 'raven' ? 'flaps off' : 'trots off'} home to the woodstove. Bedtime.`);
        const bed = petBedSpot(game) ?? BED_SPOT;
        this.mode = 'sleep'; this.place('CABIN_INTERIOR', bed[0], bed[1]);
      }
      return;
    }
    if (pet.along) {
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
        // Waiting politely outside the door you went through.
        if (this.mode === 'follow') this.mode = 'wait';
        this.moving = false;
        return;
      }
      // The wilds, with a cat: cats don't hike.
      pet.along = false;
      game.toast(`${pet.name} takes one look at the trail and heads home to the cabin. Cats don't hike.`);
    }
    this.atHome(game, dt);
  }

  /** At home: ambling round the house in the yard, or lounging inside, a few hours at a time. */
  private atHome(game: Game, dt: number): void {
    const pet = game.progress.pet!;
    const def = PETS[pet.kind];
    const house = ensurePetHouse(game);
    const block = Math.floor(game.clock.minutes / 90) + game.clock.day * 17;
    const inside = hash2(block, pet.kind.length, 311) < def.indoors;
    const map: MapId = inside ? 'CABIN_INTERIOR' : 'CABIN_YARD';
    const anchor: [number, number] = inside ? (petBedSpot(game) ?? INSIDE_ANCHOR) : house ? [house[0], house[1] + 1] : HOME_SPOT;
    const hm = game.getMap(map);
    if (this.mode !== 'home' || this.map !== map) {
      this.mode = 'home'; this.goal = null; this.goalT = 0;
      this.place(map, anchor[0], anchor[1]);
    }
    // The raven sits up on its perch most of the time.
    if (pet.kind === 'raven' && house && !this.goal && hash2(block, 3, 9) < 0.7) {
      this.goal = [house[0], house[1]];
    }
    this.goalT -= dt;
    if (!this.goal || this.goalT <= 0) {
      this.goalT = 4 + Math.random() * 5;
      const r = inside ? 2 : 4;
      for (let k = 0; k < 8; k++) {
        const x = anchor[0] + Math.round((Math.random() * 2 - 1) * r), y = anchor[1] + Math.round((Math.random() * 2 - 1) * r);
        if (hm.inBounds(x, y) && !hm.blocked(x, y) && !hm.portalAt(x, y)) { this.goal = [x, y]; break; }
      }
      if (pet.kind === 'raven' && house && Math.random() < 0.5) this.goal = [house[0], house[1]];
    }
    const [gx, gy] = this.goal ? [this.goal[0] * 16, this.goal[1] * 16] : [this.x, this.y];
    const dx = gx - this.x, dy = gy - this.y, dist = Math.hypot(dx, dy);
    if (dist > 0.5) {
      const step = Math.min(dist, HOME_SPEED * (pet.kind === 'raven' ? 2.2 : 1) * dt);
      this.x += (dx / dist) * step; this.y += (dy / dist) * step;
      if (Math.abs(dx) > 0.5) this.right = dx > 0;
    }
    this.moving = dist > 0.5;
    this.tx = Math.round(this.x / 16); this.ty = Math.round(this.y / 16);
    this.perched = pet.kind === 'raven' && !this.moving && !!house && map === 'CABIN_YARD' && this.tx === house[0] && this.ty === house[1];
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
  if (pet) pet.along = false; // a new day starts at home
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
      ensurePetHouse(game);
      sfx.fanfare();
      game.openOverlay(new Dialog([
        k === 'pup' ? `Barney: "${name}. Good name. She'll find you a jackalope before she finds her own tail."` : k === 'cat' ? `Mabel: "${name}! Keep that one in cream and she\'ll keep your cabin in mice-free bliss."` : `Barney: "${name}. Clara will be tickled. Watch out, it steals bottle caps."`,
        `(${name} has come to live at the cabin. Pet ${k === 'cat' ? 'her' : k === 'pup' ? 'her' : 'it'} once a day. ${def.perk})`,
        `Barney sets up a ${def.house.toLowerCase()} by the porch. (${name} stays around the cabin. Press A on the ${def.house.toLowerCase()} to take ${name} along with you, or to send ${pet0(k)} home.)`,
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

const pet0 = (k: PetKind) => (k === 'raven' ? 'it' : 'her');

/** Press A on the pet's house: take them along, or send them home. */
export function petHouseInteract(game: Game): void {
  const pet = game.progress.pet;
  if (!pet) { sfx.blip(); game.openOverlay(new Dialog(['An empty little house. Somebody ought to live in it.'])); return; }
  const def = PETS[pet.kind];
  const c = game.companion;
  const night = game.clock.minutes >= 22 * 60 || game.clock.minutes < 6 * 60;
  sfx.blip();
  if (night) { game.openOverlay(new Dialog([`${pet.name} is asleep inside, by the stove. Let ${pet0(pet.kind)} be till morning.`])); return; }
  const where = pet.along ? `${pet.name} is out with you today.` : c.map === 'CABIN_INTERIOR' ? `${pet.name} is lounging inside the cabin.` : `${pet.name} is pottering around the ${def.house.toLowerCase()}.`;
  const hikeNote = def.hikes ? '' : ' (Cats come to the yard and town, but not the wilds.)';
  game.openOverlay(new Dialog([`Your ${def.house.toLowerCase()}. ${where}${hikeNote}`], pet.along ? [
    { label: `Send ${pet.name} home`, fn: () => { pet.along = false; sfx.confirm(); game.toast(`${pet.name} settles in at home. See you later.`); } },
    { label: 'Leave it', fn: () => undefined },
  ] : [
    { label: `Take ${pet.name} along`, fn: () => {
      pet.along = true; sfx.confirm();
      if (pet.kind === 'pup') sfx.bark(); else if (pet.kind === 'raven') sfx.caw();
      game.toast(`${pet.name} is coming with you${pet.kind === 'pup' ? ', tail going like a metronome' : pet.kind === 'raven' ? ', riding the wind just behind you' : ', tail up'}.`);
    } },
    { label: 'Leave them be', fn: () => undefined },
  ]));
}
