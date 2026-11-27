/**
 * GBC-style turn-based pacification encounter.
 *
 * Flow: "!" alert → the camcorder powers on → you watch the cryptid through the
 * ranger's viewfinder (REC dot, tape counter, battery, focus reticle, and
 * region-matched foreground framing) → 4-slot Field Kit turns → Trust 100% logs
 * the cryptid (specimen + Dex) / Startle 100% ends it → the camcorder powers off.
 * The rules are unchanged from the GBC split-screen original; only the framing is new.
 */
import type { Game } from './game';
import type { Overlay } from '../ui/overlay';
import { CryptidDef, STANCE_COUNTERS, Stance, Trait, Variant } from '../data/cryptids';
import { ITEMS, BAIT_KINDS } from '../data/items';
import { cryptidFrame } from '../graphics/cryptidSprites';
import { ICON } from '../graphics/sprites';
import { drawText, drawTextRight, textWidth, wrapText } from '../graphics/font';
import { hex, P } from '../graphics/palette';
import { panel, bar, inRect, Rect } from '../ui/panel';
import { sfx } from '../audio/sfx';
import { DOCUMENTS, Kit, MOVE_DESC, MOVE_NAMES, SIGNALS, SIGNAL_GEAR, STEALTHS, stars } from './dex';
import { clamp } from '../util';
import { drawClipped, More, tapMore } from '../ui/readMore';

export interface EncounterSetup {
  def: CryptidDef;
  variant: Variant;
  /** Encounter began on a steep slope tile (Wampahoofus bonus). */
  slope: boolean;
  summoned: boolean;
  /** How you came upon it: crept up quietly (calmer) or stumbled into it (startled). */
  approach?: 'quiet' | 'bumped';
}

type Phase = 'alert' | 'wipeIn' | 'msg' | 'menu' | 'kitCat' | 'kitPick' | 'wipeOut';
type Category = keyof Kit;
type Outcome = 'logged' | 'bolted' | 'retreat' | 'fled' | 'forced';

interface Msg {
  text: string;
  trust: number;
  startle: number;
  fx?: () => void;
}

const CATS: Category[] = ['bait', 'signal', 'document', 'stealth'];
const CAT_LABEL: Record<Category, string> = { bait: 'BAIT', signal: 'SIGNAL', document: 'DOC', stealth: 'STEALTH' };
const LOUD = new Set(['brass_bell', 'silver_bell', 'static_radio', 'mimic_call']);
const PASSIVE: Record<string, number> = { skittish: 5, neutral: 2, predator: 4, territorial: 3, spectral: 2 };

export function availableBaits(game: Game): string[] {
  const out: string[] = [];
  for (const s of game.inv.slots) if (s && BAIT_KINDS.has(ITEMS[s.id].kind) && !out.includes(s.id)) out.push(s.id);
  return out;
}

export function availableSignals(game: Game): string[] {
  return SIGNALS.filter((s) => !SIGNAL_GEAR[s] || game.inv.count(SIGNAL_GEAR[s]) > 0);
}

function options(game: Game, cat: Category): string[] {
  if (cat === 'bait') return availableBaits(game);
  if (cat === 'signal') return availableSignals(game);
  if (cat === 'document') return [...DOCUMENTS];
  return [...STEALTHS];
}

export function moveName(id: string): string {
  return MOVE_NAMES[id] ?? ITEMS[id]?.name ?? id;
}

export class Encounter implements Overlay {
  closed = false;
  private phase: Phase = 'alert';
  private t = 0;
  private trust = 0;
  private startle: number;
  private shownTrust = 0;
  private shownStartle: number;
  private turn = 0;
  private stance: Stance;
  private stanceKnown = false;
  private queue: Msg[] = [];
  private cur: Msg | null = null;
  private shown = 0;
  private menuIdx = 0;
  private kitCat = 0;
  private kitIdx = 0;
  private kitScroll = 0;
  /** Clipped move descriptions in the Field Kit screens (tap to read all). */
  private mores: Array<More | null> = [];
  private flash = 0;
  private shake = 0;
  private outcome: Outcome | null = null;
  private rnd = Math.random;
  // per-encounter state
  private fedBait = false;
  private mimicUsed = false;
  private breathLast = false;
  private howlSuppressed = false;
  private honeyFed = false;
  private surfaced = true;
  private eyesRed = false;
  private crouchCount = 0;
  private incenseTurns = 0;
  private gainThisTurn = 0;
  private obs = { sketch: false, cast: false, behavior: false, photo: false };
  /** Snarly Yow Shadow Cloak worn at night: initial Startle halved, early turns calmer. */
  private nightCloak = false;
  private readonly def: CryptidDef;
  private readonly name: string;
  /** Tape counter: where the tape was when you hit record, and when that was. */
  private readonly tapeBase: number;
  private readonly startT: number;
  /** Next creature call over the camcorder mic. */
  private callT = 3;

  constructor(private readonly game: Game, private readonly setup: EncounterSetup) {
    this.def = setup.def;
    const prefix = setup.variant === 'albino' ? 'Albino ' : setup.variant === 'static' ? 'Static ' : '';
    this.name = prefix + this.def.name;
    this.startle = this.def.startStartle ?? 0;
    const ph = game.clock.phase();
    this.nightCloak = game.look.outfit === 'yow_cloak' && (ph === 'night' || ph === 'witching');
    if (this.nightCloak) this.startle = Math.round(this.startle * 0.5);
    if (setup.approach === 'quiet') this.startle = Math.max(0, this.startle - 12);
    if (setup.approach === 'bumped') this.startle = Math.min(60, this.startle + 12);
    this.shownStartle = this.startle;
    this.startT = game.time;
    this.tapeBase = 600 + (game.stats.daysPlayed * 137 + Object.values(game.dex).reduce((a, e) => a + e.encounters, 0) * 211) % 9000;
    this.stance = this.def.stances[Math.floor(this.rnd() * this.def.stances.length)];
    sfx.alert();
    game.input.releaseAll();
  }

  private has(t: Trait): boolean { return this.def.traits.includes(t); }
  private gear(id: string): boolean { return this.game.inv.count(id) > 0; }

  /* ------------------------------------------------------------ */
  /* Message queue                                                 */
  /* ------------------------------------------------------------ */

  private say(text: string, fx?: () => void): void {
    this.queue.push({ text, trust: this.trust, startle: this.startle, fx });
  }

  private nextMsg(): void {
    this.cur = this.queue.shift() ?? null;
    this.shown = 0;
    if (this.cur) { this.phase = 'msg'; this.cur.fx?.(); return; }
    if (this.outcome) { this.phase = 'wipeOut'; this.t = 0; this.finish(); }
    else this.phase = 'menu';
  }

  private addTrust(n: number): void {
    if (n > 0) {
      if (this.game.progress.buffs.calm === this.game.clock.day) n = Math.round(n * 1.2);
      if (this.has('mistShield') && !this.gear('thermal_lens') && this.game.look.hat !== 'mothman_goggles') n = Math.round(n / 2);
      this.gainThisTurn += n;
      if (this.has('crouch3') && this.crouchCount < 3) { this.trust = Math.min(this.trust + n, Math.max(this.trust, 60)); return; }
    }
    this.trust = clamp(this.trust + n, 0, 100);
  }

  private addStartle(n: number): void {
    if (n > 0) {
      if (this.has('fastStartle')) n *= 1.5;
      if (this.has('slowStartle')) n *= 0.5;
      if (this.incenseTurns > 0 && (this.def.temperament === 'predator' || this.def.temperament === 'territorial')) n *= 0.5;
      if (this.game.progress.buffs.stealth === this.game.clock.day) n *= 0.75;
      n = Math.round(n);
    }
    this.startle = clamp(this.startle + n, 0, 100);
  }

  /* ------------------------------------------------------------ */
  /* Turn resolution                                               */
  /* ------------------------------------------------------------ */

  private intro(): void {
    const d = this.def;
    const entry = this.game.dex[d.id];
    const firstTime = !entry.seen;
    entry.seen = true;
    entry.encounters++;
    const art = /^[AEIOU]/i.test(this.name) ? 'An' : 'A';
    const variantTag = this.setup.variant === 'albino' ? 'An ALBINO' : this.setup.variant === 'static' ? 'A STATIC-CHARGED' : art;
    const shownName = this.setup.variant === 'normal' ? this.name : d.name;
    this.say(this.setup.summoned ? `${variantTag} ${shownName} answers the call!` : `${variantTag} ${shownName} appears!`);
    if (this.setup.approach === 'quiet') this.say('You crept close without a sound. It hasn\'t noticed the camera yet.');
    if (this.setup.approach === 'bumped') this.say('You stumbled right into it! It\'s rattled.');
    if (this.setup.variant !== 'normal') this.say('A Rare Variant! Log it for a separate Dex entry.');
    if (firstTime) this.say(`New Cryptid-Dex sighting: No.${String(d.num).padStart(2, '0')} ${d.name}.`);
    if (this.has('squonk')) this.say('It is already weeping and half-startled...');
    if (this.has('odor') && !this.gear('scent_mask')) this.say('A wall of stench rolls over you.');
    if (this.has('sulfur') && !this.gear('scent_mask')) this.say('Sulfur fumes sting your eyes.');
    if (this.has('mistShield') && !this.gear('thermal_lens') && this.game.look.hat !== 'mothman_goggles') this.say('A shimmering mist shield surrounds it. Trust gains are halved.');
    if (this.has('timer4')) this.say('Its tail hook is slipping. You have 4 turns!');
    if (this.gear('parabolic_dish')) { this.stanceKnown = true; this.say(`Your Parabolic Dish reads its stance: ${this.stance}.`); }
    this.nextMsg();
  }

  private doMove(cat: Category, id: string): void {
    this.turn++;
    this.gainThisTurn = 0;
    const breathPrev = this.breathLast;
    this.breathLast = false;
    let used = true;
    if (cat === 'bait') used = this.doBait(id);
    else if (cat === 'signal') this.doSignal(id, breathPrev);
    else if (cat === 'document') this.doDocument(id);
    else this.doStealth(id);
    if (!used) { this.turn--; this.nextMsg(); return; }
    if (!this.checkEnd()) {
      this.react();
      this.checkEnd();
    }
    this.nextMsg();
  }

  private doBait(id: string): boolean {
    const n = this.def.name;
    const it = ITEMS[id];
    if (!it || this.game.inv.count(id) <= 0) { this.say(`You're out of ${it?.name ?? 'bait'}! Pick another with KIT.`); return false; }
    this.game.inv.remove(id, 1);
    this.say(`You toss the ${it.name}.`);
    if (id === 'brimstone_incense') {
      this.incenseTurns = 5;
      this.say('Cedar smoke curls around you. Predator Startle spikes are halved for 5 turns.');
      if (this.has('beast')) { this.addTrust(25); this.addStartle(-20); this.obs.behavior = true; this.say(`The ${n} breathes the smoke and calms!`); }
      return true;
    }
    if (id === 'wisp_oil') this.game.wispNight = this.game.clock.day;
    if (id === 'lunar_dew') this.game.lunarNight = this.game.clock.day;
    if (this.has('foodImmune') && id !== 'wisp_oil' && id !== 'lunar_dew') { this.addStartle(3); this.say(`The ${n} ignores physical food.`); return true; }
    if (this.has('dodgeBait') && !this.mimicUsed) { this.addStartle(6); this.say(`The ${n} bats the ${it.name} away! (Try Mimic Call first.)`); return true; }
    if (this.has('wendigo') && this.eyesRed) { this.addStartle(20); this.say('Its eyes blaze -- it lunges at the movement!'); return true; }
    if (this.has('pukwudgie') && this.turn === 1 && id === 'wild_honeycomb') this.honeyFed = true;
    const lunar = id === 'lunar_dew' && this.def.tier >= 3;
    if (this.def.lures.includes(id) || lunar) {
      this.addTrust(lunar ? 45 : 30);
      this.fedBait = true;
      this.obs.behavior = true;
      sfx.trustChime();
      this.say(`The ${n} LOVES the ${it.name}! Trust soars.`);
    } else if (this.def.dislikes?.includes(id)) {
      this.addStartle(15);
      this.say(`The ${n} recoils from the ${it.name}!`);
    } else {
      this.addTrust(6);
      this.addStartle(2);
      this.fedBait = true;
      this.say(`The ${n} sniffs the ${it.name} warily.`);
    }
    return true;
  }

  private doSignal(id: string, breathPrev: boolean): void {
    const n = this.def.name;
    this.say(`You use the ${moveName(id)}.`);
    if (id === 'mimic_call') this.mimicUsed = true;
    if (id === 'parabolic_dish') this.stanceKnown = true;
    const win = (trust: number, msg: string, calm = 0) => {
      this.addTrust(trust); if (calm) this.addStartle(-calm);
      this.obs.behavior = true; sfx.trustChime(); this.say(msg);
    };
    if (this.def.id === 'mothman' && id === 'dim_lantern' && this.game.progress.tools.lantern >= 2) return win(30, 'The High-Beam Lantern blazes -- the Mothman glides toward the light, transfixed!');
    if (this.has('loudSpook') && LOUD.has(id)) { this.addStartle(30); this.say(`The noise shrieks through the rafters! The ${n} recoils.`); return; }
    if (this.has('lanternMesmer') && id === 'dim_lantern') return win(35, `Mesmerized, the ${n} sways toward the lantern light.`);
    if (this.has('radioCalm') && id === 'static_radio') return win(30, `Static hums... the ${n} visibly relaxes.`, 15);
    if (this.has('radioTune') && id === 'static_radio') return win(35, 'You tune the dial... a calm voice answers between stations.');
    if (this.has('acoustic') && id === 'mimic_call') return win(35, `The ${n} answers your call with a gentle bellow!`);
    if (this.has('mimicLove') && id === 'mimic_call') return win(20, `The ${n} chatters back, delighted!`);
    if (this.has('bellWeak') && (id === 'brass_bell' || id === 'static_radio')) return win(30, `The ${n} flinches, then cocks its head, entranced.`, 10);
    if (this.has('bellBreath') && id === 'brass_bell' && breathPrev) return win(35, 'Holding steady, you ring the bell. Its shadowy form solidifies!');
    if (this.has('beast') && id === 'silver_bell' && breathPrev) return win(30, 'The silver tone rings out over your stillness. The beast lowers its hackles.', 15);
    if (this.has('stillness') && id === 'dim_lantern' && breathPrev) return win(30, `Perfectly still, you raise the lantern. The ${n} steps closer.`);
    if (this.has('proud') && (id === 'brass_bell' || id === 'parabolic_dish')) return win(25, `You stand your ground. The ${n} respects that.`);
    if (this.has('vocal') && id === 'parabolic_dish') return win(30, `The dish catches its calls perfectly. The ${n} seems flattered.`);
    if (this.has('howl') && (id === 'static_radio' || id === 'parabolic_dish')) { this.howlSuppressed = true; this.say('Your signal drowns out its howling!'); }
    if (STANCE_COUNTERS[this.stance].includes(id)) {
      this.addTrust(20); this.addStartle(-10); this.obs.behavior = true; sfx.trustChime();
      this.say(`It works! The ${this.stance} ${n} settles down.`);
    } else {
      this.addTrust(3); this.addStartle(6);
      this.say(`The ${n} doesn't respond well to that.`);
    }
  }

  private doDocument(id: string): void {
    const n = this.def.name;
    if (id === 'quick_sketch') {
      if (this.trust >= 15 || this.has('squonk')) {
        this.obs.sketch = true; this.addTrust(4); this.addStartle(this.has('squonk') ? 0 : 4);
        this.say(`You sketch the ${n} quickly. Field notes recorded!`);
      } else { this.addStartle(3); this.say(`It's too skittish to sketch yet. Build some Trust first.`); }
      return;
    }
    if (id === 'plaster_cast') {
      if (this.trust >= 40) {
        this.obs.cast = true; this.addStartle(8);
        this.say('You press plaster into a fresh track. Physical evidence collected!');
      } else { this.addStartle(12); this.say(`You kneel to cast a track and the ${n} backs away.`); }
      return;
    }
    // Flash Photo
    this.say('You raise the camera...', () => { this.flash = 1; sfx.shutter(); });
    const chronos = this.gear('chronos_shutter');
    if (this.has('surfacing') && !this.surfaced) { this.addStartle(4); this.say('Only bubbles on the film. Wait for it to surface!'); return; }
    if (this.has('flashImmune')) { this.say('The flash passes right through it. Nothing on the film.'); return; }
    if (this.has('feedFirst') && !this.fedBait) { this.addStartle(40); this.say('The flash panics it! You should have offered food first.'); return; }
    if (this.has('flashLove')) { this.addTrust(25); this.obs.photo = true; this.say(`The ${n} basks in the flash! GOLD PHOTO captured!`); return; }
    const camLv = this.game.progress.tools.camera;
    const need = [75, 65, 55][camLv] ?? 75;
    if (chronos || this.trust >= need) {
      this.obs.photo = true; this.addStartle(chronos ? 0 : 5);
      this.say('Click! A crisp, perfectly lit GOLD PHOTO!');
    } else {
      this.addStartle(Math.round((this.has('flashSpook') ? 60 : 35) * (camLv >= 2 ? 0.5 : 1)));
      this.say(this.has('flashSpook') ? `The flash terrifies the ${n}!` : 'Too early -- the flash startles it. Blurry shot.');
    }
  }

  private doStealth(id: string): void {
    const n = this.def.name;
    if (id === 'hold_breath') {
      this.breathLast = true;
      if (this.has('proud')) { this.addTrust(-15); this.say(`You cower... the ${n} sneers at your weakness. Trust drops!`); return; }
      if (this.has('wendigo') && this.eyesRed) {
        this.addTrust(25); this.addStartle(-10); this.obs.behavior = true; sfx.trustChime();
        this.say('You freeze as its eyes blaze. It loses its hunger... and grows curious.');
        return;
      }
      this.addStartle(-25); this.addTrust(2);
      this.say('You hold your breath and go still. Startle drops.');
      return;
    }
    this.crouchCount++;
    if (this.has('stillness')) { this.addTrust(-10); this.addStartle(8); this.say(`The ${n} tracks your movement and tenses. Trust drops.`); return; }
    if (this.has('crouchHate')) { this.addStartle(15); this.say(`Creeping closer only provokes the ${n}!`); return; }
    if (this.has('feedFirst') && !this.fedBait) { this.addStartle(30); this.say('It squeals in alarm at your approach! Feed it first.'); return; }
    let gain = 8;
    let msg = 'You crouch-step closer, low and quiet.';
    if (this.has('slopeCrouch') && this.setup.slope) { gain = 16; this.obs.behavior = true; msg = 'Low on the steep slope, you match its tilted gait. Double Trust!'; }
    if (this.has('surfacing') && !this.surfaced) { gain = 20; this.obs.behavior = true; msg = 'While it is submerged, you slip right up to the bank!'; }
    if (this.has('crouch3')) msg += ` (Crouch ${Math.min(3, this.crouchCount)}/3)`;
    this.addTrust(gain); this.addStartle(2);
    this.say(msg);
  }

  /** The cryptid's half of the turn. */
  private react(): void {
    const d = this.def, n = d.name, inv = this.game.inv;
    if (this.has('pukwudgie') && this.turn === 1 && !this.honeyFed) {
      const idx = inv.slots.findIndex((s) => s && !['tool', 'gear'].includes(ITEMS[s.id].kind));
      if (idx >= 0) { const nm = ITEMS[inv.slots[idx]!.id].name; inv.removeAt(idx, 1); this.say(`The Pukwudgie snatches your ${nm}! (Honeycomb on Turn 1 prevents this.)`); }
    }
    if (this.has('thief') && this.gainThisTurn < 10 && this.rnd() < 0.6) {
      const bait = this.game.kit.bait;
      if (inv.count(bait) > 0) { inv.remove(bait, 1); this.say(`The ${n} snatches a ${ITEMS[bait].name} and scampers back!`); }
    }
    let passive = this.has('squonk') ? 4 : PASSIVE[d.temperament] ?? 3;
    const meadow = ['PINE_TRAIL_AND_ORCHARD', 'RADIO_RIDGE_AND_CROSSROADS', 'CABIN_YARD'].includes(this.game.cur.id);
    if (this.game.look.hat === 'jackalope_cap' && d.temperament === 'skittish' && meadow) passive = Math.max(0, passive - 2);
    if (this.nightCloak && this.turn <= 2) passive = 0;
    this.addStartle(passive);
    if (this.has('squonk')) this.say('The Squonk weeps louder.');
    if (this.has('aggressive') && !this.breathLast) { this.addStartle(8); this.say(`The ${n} hisses and rolls closer! (Hold Breath to calm it.)`); }
    if (this.has('odor') && !this.gear('scent_mask')) { this.addStartle(12); this.say('The stench is overwhelming! (A Scent Mask would help.)'); }
    if (this.has('sulfur') && !this.gear('scent_mask')) { this.addStartle(12); this.say('Sulfur fumes make you cough! (A Scent Mask would help.)'); }
    if (this.has('howl') && !this.howlSuppressed) { this.addStartle(20); this.say('HOOOOWL! The roar rattles your nerves.'); }
    if (this.has('surfacing')) { this.surfaced = !this.surfaced; this.say(this.surfaced ? `${n} surfaces! Now's your photo.` : `${n} slips beneath the water.`); }
    if (this.has('wendigo')) { this.eyesRed = !this.eyesRed; this.say(this.eyesRed ? 'Its eyes flare RED!' : 'Its eyes dim to embers.'); }
    if (this.incenseTurns > 0) this.incenseTurns--;
    if (this.has('timer4') && this.turn >= 4) {
      this.say(`The ${n} lets go and slides away downhill!`);
      this.outcome = 'fled';
      return;
    }
    if (this.turn >= 25) {
      this.say(`The ${n} loses interest and wanders off into the trees.`);
      this.outcome = 'fled';
      return;
    }
    if (this.has('phaseOut') && this.game.wispNight !== this.game.clock.day && this.rnd() < 0.08) {
      this.say(`The ${n} flickers... and phases out of sight. (Wisp-Light Oil prevents this.)`);
      this.outcome = 'fled';
      return;
    }
    if (this.turn % 2 === 0 && d.stances.length > 1) {
      const next = d.stances.filter((s) => s !== this.stance);
      this.stance = next[Math.floor(this.rnd() * next.length)];
      if (this.stanceKnown || this.turn > 1) this.say(`It shifts its stance: now ${this.stance}.`);
    }
    if (!this.stanceKnown) { this.stanceKnown = true; this.say(`You read its body language: ${this.stance}.`); }
  }

  private checkEnd(): boolean {
    if (this.outcome) return true;
    const n = this.def.name;
    if (this.trust >= 100) {
      this.outcome = 'logged';
      this.say(`Trust 100%! The ${n} accepts your presence.`, () => sfx.fanfare());
      this.reward();
      return true;
    }
    if (this.startle >= 100) {
      const apex = this.game.look.outfit === 'wendigo_mantle' || this.game.look.hat === 'antler_crown';
      if (this.def.temperament === 'predator' && !apex) {
        this.outcome = 'forced';
        this.say(`The ${n} lunges! You scramble back to the trail. (-15 energy)`, () => { this.shake = 1; });
      } else {
        this.outcome = 'bolted';
        this.say(`The ${n} bolts into the shadows!`);
      }
      return true;
    }
    return false;
  }

  private reward(): void {
    const g = this.game, d = this.def, e = g.dex[d.id];
    const firstLog = !e.logged;
    const firstVariant = this.setup.variant !== 'normal' && !e[this.setup.variant];
    const before = stars({ ...e, ...this.mergedObs(e) });
    this.say(firstLog ? `${d.name} LOGGED in the Cryptid-Dex!` : `${d.name} entry updated.`);
    if (firstVariant) this.say(`${this.setup.variant === 'albino' ? 'Albino' : 'Static-Charged'} Rare Variant logged!`);
    // Specimens are rare: if the bag is full, it goes home to the cabin Storage Crate instead.
    const left = g.inv.add(d.drop.id, 1);
    const crated = left > 0 && g.storage.add(d.drop.id, 1) === 0;
    this.say(!left ? `Received specimen: ${d.drop.name}!`
      : crated ? `Your bag is full, so the ${d.drop.name} goes home to your Storage Crate.`
      : `Your bag AND storage crate are full... the ${d.drop.name} was lost.`);
    if (firstLog) this.say('A Museum Specimen is now available for the Historical Society.');
    const after = stars({ ...e, ...this.mergedObs(e), logged: true });
    if (after === 3 && before < 3) this.say('3-STAR MASTERY: Gold Photo + Specimen!');
    else if (!this.obs.photo && !e.photo) this.say('Tip: a Gold Flash Photo (75%+ Trust) completes 3-Star mastery.');
  }

  private mergedObs(e: { sketch: boolean; cast: boolean; behavior: boolean; photo: boolean }) {
    return {
      sketch: e.sketch || this.obs.sketch, cast: e.cast || this.obs.cast,
      behavior: e.behavior || this.obs.behavior, photo: e.photo || this.obs.photo,
    };
  }

  /** Commit observations and outcome to game state (runs once, as the wipe-out starts). */
  private finish(): void {
    const g = this.game, e = g.dex[this.def.id];
    Object.assign(e, this.mergedObs(e));
    if (this.outcome === 'logged') {
      e.logged = true;
      if (this.setup.variant === 'albino') e.albino = true;
      if (this.setup.variant === 'static') e.static = true;
    }
    if (this.outcome === 'forced') g.stamina = Math.max(0, g.stamina - 15);
    g.encounterEnded();
  }

  /* ------------------------------------------------------------ */
  /* Update                                                        */
  /* ------------------------------------------------------------ */

  private layout(): { boxY: number; boxH: number; arenaH: number; s: number; cells: Rect[] } {
    const W = this.game.w, H = this.game.h;
    const boxH = 46, boxY = H - boxH;
    const arenaH = boxY;
    const s = arenaH >= 190 ? 4 : arenaH >= 125 ? 3 : 2;
    const cw = Math.floor((W - 12) / 2);
    const cells: Rect[] = [];
    for (let i = 0; i < 6; i++) cells.push({ x: 6 + (i % 2) * cw, y: boxY + 5 + Math.floor(i / 2) * 12, w: cw - 2, h: 11 });
    return { boxY, boxH, arenaH, s, cells };
  }

  update(game: Game, dt: number): void {
    this.t += dt;
    // Now and then the creature calls, close enough for the camcorder mic to pick it up.
    if (this.phase !== 'alert' && this.phase !== 'wipeIn' && this.phase !== 'wipeOut' && !this.outcome) {
      this.callT -= dt;
      if (this.callT <= 0) { this.callT = 6 + this.rnd() * 6; sfx.creature(this.def.temperament); }
    }
    this.flash = Math.max(0, this.flash - dt * 2.5);
    this.shake = Math.max(0, this.shake - dt * 3);
    const k = Math.min(1, dt * 6);
    const tgtT = this.cur?.trust ?? this.trust, tgtS = this.cur?.startle ?? this.startle;
    if (tgtS > this.shownStartle + 0.5 && this.shake <= 0) this.shake = 0.5;
    this.shownTrust += (tgtT - this.shownTrust) * k;
    this.shownStartle += (tgtS - this.shownStartle) * k;
    const inp = game.input;

    switch (this.phase) {
      case 'alert':
        if (this.t > 0.6) { this.phase = 'wipeIn'; this.t = 0; }
        return;
      case 'wipeIn':
        if (this.t > 0.75) { this.t = 0; this.intro(); }
        return;
      case 'wipeOut':
        if (this.t > 0.9) this.closed = true;
        return;
      case 'msg': {
        if (!this.cur) { this.nextMsg(); return; }
        const len = this.cur.text.length;
        if (this.shown < len) {
          this.shown = Math.min(len, this.shown + dt * 75);
          if (inp.pressed('a') || inp.pressed('b') || inp.taps.length) this.shown = len;
          return;
        }
        if (inp.pressed('a') || inp.pressed('b') || inp.taps.length) { sfx.blip(); this.nextMsg(); }
        return;
      }
      case 'menu': {
        const L = this.layout();
        const prev = this.menuIdx;
        if (inp.repeat('left') || inp.repeat('right')) this.menuIdx ^= 1;
        if (inp.repeat('up')) this.menuIdx = (this.menuIdx + 4) % 6;
        if (inp.repeat('down')) this.menuIdx = (this.menuIdx + 2) % 6;
        if (prev !== this.menuIdx) sfx.blip();
        let pick = inp.pressed('a') ? this.menuIdx : -1;
        for (const t of inp.taps) { const hit = L.cells.findIndex((r) => inRect(r, t.x, t.y)); if (hit >= 0) { this.menuIdx = hit; pick = hit; } }
        if (pick < 0) return;
        sfx.confirm();
        if (pick < 4) {
          const cat = CATS[pick];
          const id = this.game.kit[cat];
          if (cat === 'bait' && (!id || this.game.inv.count(id) <= 0)) {
            const alts = availableBaits(this.game);
            if (!alts.length) { this.say('You have no bait! Forage or grow some lures.'); this.nextMsg(); return; }
            this.game.kit.bait = alts[0];
          }
          if (cat === 'signal' && !availableSignals(this.game).includes(id)) this.game.kit.signal = 'dim_lantern';
          this.doMove(cat, this.game.kit[cat]);
        } else if (pick === 4) { this.phase = 'kitCat'; this.kitCat = 0; }
        else {
          this.say('You back away slowly and slip out of sight.');
          this.outcome = 'retreat';
          this.nextMsg();
        }
        return;
      }
      case 'kitCat': {
        if (inp.repeat('up')) { this.kitCat = (this.kitCat + 3) % 4; sfx.blip(); }
        if (inp.repeat('down')) { this.kitCat = (this.kitCat + 1) % 4; sfx.blip(); }
        let go = inp.pressed('a');
        for (const t of inp.taps) {
          if (tapMore(this.game, this.mores, t)) return;
          const r = this.kitRects();
          const hit = r.findIndex((rr) => inRect(rr, t.x, t.y));
          if (hit >= 0) { this.kitCat = hit; go = true; }
        }
        if (go) {
          const opts = options(this.game, CATS[this.kitCat]);
          if (!opts.length) { sfx.error(); return; }
          this.kitIdx = Math.max(0, opts.indexOf(this.game.kit[CATS[this.kitCat]]));
          this.kitScroll = 0;
          this.phase = 'kitPick';
          sfx.confirm();
        }
        if (inp.pressed('b')) { this.phase = 'menu'; sfx.cancel(); }
        return;
      }
      case 'kitPick': {
        const cat = CATS[this.kitCat];
        const opts = options(this.game, cat);
        const n = opts.length;
        if (inp.repeat('up')) { this.kitIdx = (this.kitIdx + n - 1) % n; sfx.blip(); }
        if (inp.repeat('down')) { this.kitIdx = (this.kitIdx + 1) % n; sfx.blip(); }
        let go = inp.pressed('a');
        for (const t of inp.taps) {
          if (tapMore(this.game, this.mores, t)) return;
          const hit = this.pickRects(n).findIndex((rr) => inRect(rr, t.x, t.y));
          if (hit >= 0) { this.kitIdx = hit + this.kitScroll; go = true; }
        }
        if (go && opts[this.kitIdx]) {
          this.game.kit[cat] = opts[this.kitIdx];
          sfx.plant();
          this.phase = 'kitCat';
        }
        if (inp.pressed('b')) { this.phase = 'kitCat'; sfx.cancel(); }
        return;
      }
    }
  }

  private kitRects(): Rect[] {
    const L = this.layout();
    return CATS.map((_, i) => ({ x: 6, y: L.boxY - 52 + i * 11, w: this.game.w - 12, h: 10 }));
  }

  private pickRects(n: number): Rect[] {
    const L = this.layout();
    const rows = Math.min(n, Math.max(3, Math.floor((L.arenaH - 30) / 10)));
    return Array.from({ length: rows }, (_, i) => ({ x: 8, y: L.boxY - 8 - rows * 10 + i * 10, w: this.game.w - 16, h: 10 }));
  }

  /* ------------------------------------------------------------ */
  /* Drawing                                                       */
  /* ------------------------------------------------------------ */

  /** The camcorder switching on: static, then the picture opening out from a bright line. */
  private powerOn(game: Game, g: CanvasRenderingContext2D, p: number): void {
    const W = game.w, H = game.h;
    p = clamp(p, 0, 1);
    if (p > 0.45) {
      this.drawBattle(game, g);
      const open = (p - 0.45) / 0.55;
      const keep = Math.round(H * open / 2);
      g.fillStyle = hex(P.VOID);
      g.fillRect(0, 0, W, Math.max(0, H / 2 - keep)); g.fillRect(0, H / 2 + keep, W, H);
      return;
    }
    g.fillStyle = hex(P.VOID); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 260; i++) { g.fillStyle = hex(i % 3 ? P.SHADOW : P.MIST); g.fillRect(Math.floor(Math.random() * W), Math.floor(Math.random() * H), 2, 1); }
    const lw = Math.round(W * Math.min(1, p / 0.35));
    g.fillStyle = hex(P.FOG); g.fillRect(Math.round((W - lw) / 2), Math.floor(H / 2), lw, 1);
    drawText(g, 'CAM', 6, H - 10, P.MIST);
  }

  /** And off again: the picture squeezes to a line, then a dot. */
  private powerOff(game: Game, g: CanvasRenderingContext2D, p: number): void {
    const W = game.w, H = game.h;
    p = clamp(p, 0, 1);
    const keep = Math.round((H / 2) * (1 - Math.min(1, p / 0.6)));
    g.fillStyle = hex(P.VOID);
    g.fillRect(0, 0, W, Math.max(0, H / 2 - keep)); g.fillRect(0, H / 2 + keep + 1, W, H);
    if (p > 0.6) {
      g.fillRect(0, 0, W, H);
      const lw = Math.round(W * (1 - (p - 0.6) / 0.4));
      g.fillStyle = hex(P.FOG); g.fillRect(Math.round((W - lw) / 2), Math.floor(H / 2), Math.max(1, lw), 1);
    }
  }

  draw(game: Game, g: CanvasRenderingContext2D): void {
    if (this.phase === 'alert') {
      const px = Math.round(game.player.x) - game.cam.ix + 8, py = Math.round(game.player.y) - game.cam.iy - 14;
      const bob = Math.round(Math.sin(this.t * 20) * 1);
      panel(g, px - 4, py - 9 + bob, 9, 11);
      g.fillStyle = hex(P.RED);
      g.fillRect(px, py - 6 + bob, 1, 4); g.fillRect(px, py - 1 + bob, 1, 1);
      return;
    }
    if (this.phase === 'wipeIn') { this.powerOn(game, g, this.t / 0.75); return; }
    if (this.phase === 'wipeOut') {
      if (this.t < 0.5) { this.drawBattle(game, g); this.powerOff(game, g, this.t / 0.5); }
      else { g.fillStyle = hex(P.VOID); g.globalAlpha = 1 - (this.t - 0.5) / 0.4; g.fillRect(0, 0, game.w, game.h); g.globalAlpha = 1; }
      return;
    }
    this.drawBattle(game, g);
  }

  private drawBattle(game: Game, g: CanvasRenderingContext2D): void {
    const W = game.w;
    const L = this.layout();
    const { boxY, arenaH, s } = L;
    const time = game.time;
    const minutes = game.clock.minutes;
    const [skyDay, groundC] = game.cur.def.battleColors;
    const sky = minutes < 1080 ? skyDay : minutes < 1200 ? P.VIOLET : minutes < 1440 ? P.SHADOW : P.VOID;
    const horizon = Math.floor(arenaH * 0.48);
    g.fillStyle = hex(sky); g.fillRect(0, 0, W, horizon);
    g.fillStyle = hex(minutes >= 1200 ? P.PINE : groundC); g.fillRect(0, horizon, W, arenaH - horizon);
    g.fillStyle = hex(P.VOID); g.globalAlpha = 0.15;
    for (let y = horizon; y < arenaH; y += 4) g.fillRect(0, y, W, 1);
    g.globalAlpha = 1;
    if (minutes >= 1200) { g.fillStyle = hex(P.MOON); for (let i = 0; i < 20; i++) g.fillRect((i * 53) % W, (i * 29) % horizon, 1, 1); }

    // Weather in the arena
    const wthr = game.weatherNow();
    if (wthr === 'RAIN' || wthr === 'STORM') {
      g.fillStyle = hex(P.MIST); g.globalAlpha = 0.6;
      for (let i = 0; i < 40; i++) { const x = (i * 37 + time * 140) % W, y = (i * 23 + time * 260) % arenaH; g.fillRect(Math.floor(x), Math.floor(y), 1, 3); }
      g.globalAlpha = 1;
    } else if (wthr === 'SNOW') {
      g.fillStyle = hex(P.FOG);
      for (let i = 0; i < 30; i++) { const x = (i * 41 + Math.sin(time + i) * 6) % W, y = (i * 17 + time * 20) % arenaH; g.fillRect(Math.floor(x), Math.floor(y), 1, 1); }
    }

    // Slide-in
    const intro = Math.min(1, this.t / 0.5);
    const slideC = this.turn === 0 ? Math.round((1 - intro) * W * 0.6) : 0;

    // The cryptid, framed in the viewfinder (we're looking through the camcorder now, so no ranger in shot).
    const cx = Math.round(W * 0.58) + slideC, cy = Math.round(arenaH * 0.58);
    g.fillStyle = hex(P.VOID); g.globalAlpha = 0.3;
    g.beginPath(); g.ellipse(cx, cy + 2, 14 * s, 3.5 * s, 0, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
    const frame = Math.floor(time * 2.2) % 2;
    const spr = cryptidFrame(this.def.id, this.setup.variant, frame);
    const sh = this.shake > 0 ? Math.round(Math.sin(time * 70) * 2 * s * this.shake) : 0;
    const fade = this.outcome === 'bolted' || this.outcome === 'fled' || this.outcome === 'retreat';
    if (fade && !this.queue.length) g.globalAlpha = 0.35;
    g.drawImage(spr, cx - 12 * s + sh, cy - 22 * s, 24 * s, 24 * s);
    g.globalAlpha = 1;
    // Trust sparkles
    if (this.shownTrust < (this.cur?.trust ?? this.trust) - 1) {
      g.fillStyle = hex(P.LANTERN);
      for (let i = 0; i < 6; i++) g.fillRect(cx - 10 * s + ((i * 37 + Math.floor(time * 20)) % (20 * s)), cy - 22 * s + ((i * 23 + Math.floor(time * 30)) % (20 * s)), 1 + (i % 2), 1 + (i % 2));
    }

    // Fog over the arena
    if (wthr === 'FOG') {
      g.fillStyle = hex(P.FOG);
      for (let i = 0; i < 4; i++) { g.globalAlpha = 0.12; g.fillRect(0, horizon - 10 + i * 9 + Math.round(Math.sin(time + i) * 3), W, 6); }
      g.globalAlpha = 1;
    }

    // Region-matched foreground (pine boughs, cattails, rocks), weather on the lens, and the camcorder's OSD.
    this.drawForeground(game, g, W, arenaH, time);
    this.drawOsd(game, g, W, arenaH, cx, cy, s, time);

    // Cryptid status box (top-left)
    // Starts below the DOM corner toggles (SND/PAD) on desktop & landscape.
    const bw = Math.min(124, Math.floor(W * 0.5)), bx = 4, by = 18;
    g.globalAlpha = 0.62; g.fillStyle = hex(P.VOID); g.fillRect(bx, by, bw, 40); g.globalAlpha = 1;
    g.fillStyle = hex(P.FOG); g.fillRect(bx, by, 4, 1); g.fillRect(bx, by, 1, 4); g.fillRect(bx + bw - 4, by + 39, 4, 1); g.fillRect(bx + bw - 1, by + 36, 1, 4);
    const label = this.name.length * 4 > bw - 24 ? this.def.name : this.name;
    drawText(g, label.slice(0, Math.floor((bw - 24) / 4)), bx + 5, by + 5, this.setup.variant === 'normal' ? P.LANTERN : this.setup.variant === 'albino' ? P.FOG : P.MIST);
    drawTextRight(g, `T${this.def.tier}`, bx + bw - 5, by + 5, P.VIOLET);
    drawText(g, 'TRUST', bx + 5, by + 13, P.FERN);
    bar(g, bx + 28, by + 13, bw - 52, 5, this.shownTrust / 100, P.FERN);
    drawTextRight(g, `${Math.round(this.shownTrust)}%`, bx + bw - 5, by + 13, P.FERN);
    drawText(g, 'STARTLE', bx + 5, by + 21, P.RED);
    bar(g, bx + 36, by + 21, bw - 60, 5, this.shownStartle / 100, P.RED);
    drawTextRight(g, `${Math.round(this.shownStartle)}%`, bx + bw - 5, by + 21, P.RED);
    drawText(g, `STANCE: ${this.stanceKnown ? this.stance : '???'}`, bx + 5, by + 30, P.MIST);
    const st = stars(game.dex[this.def.id]);
    for (let i = 0; i < 3; i++) drawStar(g, bx + bw - 24 + i * 7, by + 30, i < st);

    // Text box / menu
    panel(g, 0, boxY, W, L.boxH);
    if (this.phase === 'msg' && this.cur) {
      const lines = wrapText(this.cur.text, W - 14);
      let left = Math.floor(this.shown);
      lines.slice(0, 5).forEach((line, k) => {
        if (left <= 0) return;
        drawText(g, line.slice(0, left), 7, boxY + 6 + k * 8, P.FOG);
        left -= line.length + 1;
      });
      if (this.shown >= this.cur.text.length && Math.floor(time * 3) % 2 === 0) {
        g.fillStyle = hex(P.LANTERN);
        g.fillRect(W - 12, boxY + L.boxH - 8, 5, 1); g.fillRect(W - 11, boxY + L.boxH - 7, 3, 1); g.fillRect(W - 10, boxY + L.boxH - 6, 1, 1);
      }
    } else if (this.phase === 'menu' || this.phase === 'kitCat' || this.phase === 'kitPick') {
      const labels = [...CATS.map((c) => this.cellLabel(c)), ['', 'KIT'], ['', 'RUN']];
      L.cells.forEach((r, i) => {
        const sel = i === this.menuIdx && this.phase === 'menu';
        if (sel) { g.fillStyle = hex(P.FOREST); g.fillRect(r.x, r.y, r.w, r.h); }
        const [cat, val] = labels[i];
        let x = r.x + 7;
        if (sel) drawText(g, '>', r.x + 2, r.y + 3, P.LANTERN);
        if (cat) { drawText(g, cat, x, r.y + 3, P.MIST); x += textWidth(cat) + 4; }
        const maxC = Math.floor((r.x + r.w - x - 2) / 4);
        drawText(g, val.slice(0, maxC), x, r.y + 3, sel ? P.LANTERN : P.FOG);
      });
    }
    if (this.phase === 'kitCat' || this.phase === 'kitPick') this.drawKit(game, g);

    // Flash
    if (this.flash > 0) {
      g.globalAlpha = Math.min(1, this.flash);
      g.fillStyle = hex(P.FOG); g.fillRect(0, 0, W, arenaH);
      g.globalAlpha = 1;
      g.fillStyle = hex(P.VOID);
      const fx = cx - 14 * s, fy = cy - 24 * s, fw = 28 * s, fh = 28 * s;
      for (const [x, y, w, h] of [[fx, fy, 8, 2], [fx, fy, 2, 8], [fx + fw - 8, fy, 8, 2], [fx + fw - 2, fy, 2, 8], [fx, fy + fh - 2, 8, 2], [fx, fy + fh - 8, 2, 8], [fx + fw - 8, fy + fh - 2, 8, 2], [fx + fw - 2, fy + fh - 8, 2, 8]]) g.fillRect(x, y, w, h);
    }
  }

  /** What's in front of the lens: boughs, reeds or rocks for the region, and rain or snow on the glass. */
  private drawForeground(game: Game, g: CanvasRenderingContext2D, W: number, arenaH: number, time: number): void {
    const id = game.cur.id;
    const night = game.clock.minutes >= 1200;
    const dark = night ? P.VOID : P.SHADOW, mid = night ? P.SHADOW : P.PINE;
    const sway = Math.sin(time * 0.8) * 2;
    if (id === 'CRANBERRY_BOG_AND_SPRINGS') {
      // Cattails and sphagnum along the bottom of the frame.
      for (let i = 0; i < 14; i++) {
        const x = (i * 37 + 11) % W, h = 18 + ((i * 13) % 22), lean = Math.sin(time * 1.1 + i) * 1.5;
        g.fillStyle = hex(i % 2 ? dark : mid);
        for (let k = 0; k < h; k++) g.fillRect(Math.round(x + lean * (k / h)), arenaH - k, 2, 1);
        if (i % 3 === 0) { g.fillStyle = hex(night ? P.SHADOW : P.RUST); g.fillRect(Math.round(x + lean - 1), arenaH - h - 6, 4, 7); }
      }
    } else if (id === 'RADIO_RIDGE_AND_CROSSROADS') {
      // Rocks and dry grass at the frame's edge.
      g.fillStyle = hex(dark);
      g.beginPath(); g.ellipse(-6, arenaH + 4, 46, 26, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(W + 10, arenaH + 8, 40, 20, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = hex(night ? P.SHADOW : P.RUST);
      for (let i = 0; i < 24; i++) { const x = (i * 29) % W, h = 6 + (i * 7) % 10; g.fillRect(x + Math.round(Math.sin(time + i) * 1), arenaH - h, 1, h); }
    } else {
      // Pine boughs hanging into the top corners, ferns along the bottom.
      g.fillStyle = hex(dark);
      // (Left side only: the right corner is where REC and the tape counter live.)
      for (const [ox, dir] of [[0, 1]] as Array<[number, number]>) {
        for (let b = 0; b < 3; b++) {
          const y0 = 4 + b * 9 + sway, len = 42 - b * 8;
          for (let k = 0; k < len; k++) {
            const x = ox + dir * k, y = y0 + k * 0.35;
            g.fillRect(Math.round(x), Math.round(y), 1, 2);
            if (k % 3 === 0) { g.fillRect(Math.round(x), Math.round(y - 3), 1, 3); g.fillRect(Math.round(x), Math.round(y + 2), 1, 3); }
          }
        }
      }
      g.fillStyle = hex(mid);
      for (let i = 0; i < 18; i++) {
        const x = (i * 41 + 5) % W, h = 8 + (i * 11) % 12;
        for (let k = 0; k < h; k++) g.fillRect(Math.round(x + (k / h) * (i % 2 ? 4 : -4)), arenaH - k, 2, 1);
      }
    }
    // Weather on the lens.
    const w = game.weatherNow();
    if (w === 'RAIN' || w === 'STORM') {
      for (let i = 0; i < 9; i++) {
        const x = (i * 53 + 17) % W, y = ((i * 37 + 9) % Math.max(1, arenaH - 20)) + 10 + ((time * 6 + i * 3) % 8);
        g.globalAlpha = 0.45; g.fillStyle = hex(P.MIST);
        g.beginPath(); g.arc(x, y, 2 + (i % 3), 0, Math.PI * 2); g.fill();
        g.globalAlpha = 0.8; g.fillStyle = hex(P.FOG); g.fillRect(x - 1, Math.round(y - 1), 1, 1);
      }
      g.globalAlpha = 1;
    } else if (w === 'SNOW') {
      g.fillStyle = hex(P.FOG);
      for (let i = 0; i < 7; i++) { const x = (i * 61 + 23) % W, y = (i * 29 + 13) % arenaH; g.fillRect(x, y, 2, 2); g.fillRect(x - 1, y + 1, 4, 1); }
    }
  }

  /** The camcorder's on-screen display. */
  private drawOsd(game: Game, g: CanvasRenderingContext2D, W: number, arenaH: number, cx: number, cy: number, s: number, time: number): void {
    // Scanlines and a soft vignette.
    g.fillStyle = hex(P.VOID);
    g.globalAlpha = 0.07; for (let y = 0; y < arenaH; y += 2) g.fillRect(0, y, W, 1);
    g.globalAlpha = 0.25; g.fillRect(0, 0, W, 2); g.fillRect(0, arenaH - 2, W, 2); g.fillRect(0, 0, 2, arenaH); g.fillRect(W - 2, 0, 2, arenaH);
    g.globalAlpha = 1;
    // Viewfinder corner brackets.
    const m = 6, L = 10;
    const bracket = (x: number, y: number, dx: number, dy: number, len: number, col: number) => {
      for (const [o, c] of [[1, P.VOID], [0, col]] as Array<[number, number]>) {
        g.fillStyle = hex(c);
        g.fillRect(Math.min(x, x + dx * len) + o, y + o, len, 1); g.fillRect(x + o, Math.min(y, y + dy * len) + o, 1, len);
      }
    };
    for (const [x, y, dx, dy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, arenaH - m, 1, -1], [W - m, arenaH - m, -1, -1]] as Array<[number, number, number, number]>) bracket(x, y, dx, dy, L, P.FOG);
    // REC, tape counter, battery (your stamina).
    const rx = W - 52;
    if (Math.floor(time * 2) % 2 === 0) { g.fillStyle = hex(P.RED); g.beginPath(); g.arc(rx + 3, 15, 2.5, 0, Math.PI * 2); g.fill(); }
    drawText(g, 'REC', rx + 8, 12, P.FOG, P.VOID);
    const secs = Math.floor(time - this.startT) + this.tapeBase;
    const tape = `${String(Math.floor(secs / 3600)).padStart(2, '0')}:${String(Math.floor(secs / 60) % 60).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
    drawTextRight(g, tape, W - 8, 21, P.FOG, P.VOID);
    const bxB = W - 26, byB = 30, frac = game.stamina / game.maxStamina;
    g.fillStyle = hex(P.FOG); g.fillRect(bxB, byB, 16, 7); g.fillRect(bxB + 16, byB + 2, 2, 3);
    g.fillStyle = hex(P.VOID); g.fillRect(bxB + 1, byB + 1, 14, 5);
    const bars = Math.ceil(frac * 4);
    g.fillStyle = hex(frac < 0.25 ? P.RED : P.FOG);
    for (let i = 0; i < bars; i++) g.fillRect(bxB + 2 + i * 3.5, byB + 2, 2, 3);
    drawTextRight(g, `SHOT ${this.turn + 1}`, bxB - 3, byB + 1, P.FOG, P.VOID);
    // Focus reticle on the subject; it tightens (zooms) as Trust grows.
    const zoom = 1 + this.shownTrust / 100;
    // The cryptid is drawn 24*s square from (cx - 12s, cy - 22s): centre the reticle on it.
    const half = Math.round((14 * s) / zoom);
    const fx = cx, fy = cy - 10 * s;
    const lock = this.shownTrust >= 75;
    for (const [x, y, dx, dy] of [[fx - half, fy - half, 1, 1], [fx + half, fy - half, -1, 1], [fx - half, fy + half, 1, -1], [fx + half, fy + half, -1, -1]] as Array<[number, number, number, number]>) bracket(x, y, dx, dy, 5, lock ? P.FERN : P.FOG);
    drawText(g, lock ? 'AF LOCK' : 'AF', fx - half, fy + half + 3, lock ? P.FERN : P.FOG, P.VOID);
    // Zoom bar.
    const zy = arenaH - 12, zx = Math.round(W / 2) - 24;
    drawText(g, 'W', zx - 6, zy - 2, P.FOG, P.VOID); drawText(g, 'T', zx + 50, zy - 2, P.FOG, P.VOID);
    g.fillStyle = hex(P.VOID); g.fillRect(zx + 1, zy + 1, 48, 1);
    g.fillStyle = hex(P.FOG); g.fillRect(zx, zy, 48, 1);
    g.fillRect(zx + Math.round((zoom - 1) * 46), zy - 2, 2, 5);
    // Date stamp.
    const c = game.clock;
    const hh = Math.floor(c.minutes / 60) % 24, mm = c.minutes % 60;
    drawTextRight(g, `${c.season.slice(0, 3).toUpperCase()} ${c.dayOfSeason}  ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, W - 8, arenaH - 10, P.LANTERN, P.VOID);
  }

  private cellLabel(c: Category): [string, string] {
    const id = this.game.kit[c];
    if (c === 'bait') {
      const n = this.game.inv.count(id);
      return [CAT_LABEL[c], n > 0 ? `${moveName(id)} x${n}` : '(choose in KIT)'];
    }
    return [CAT_LABEL[c], moveName(id)];
  }

  private drawKit(game: Game, g: CanvasRenderingContext2D): void {
    const W = game.w;
    const L = this.layout();
    const rects = this.kitRects();
    panel(g, 2, rects[0].y - 12, W - 4, 4 * 11 + 16);
    drawText(g, 'FIELD KIT  (A: CHANGE  B: BACK)', 7, rects[0].y - 8, P.LANTERN);
    rects.forEach((r, i) => {
      const sel = i === this.kitCat;
      if (sel) { g.fillStyle = hex(P.FOREST); g.fillRect(r.x, r.y, r.w, r.h); }
      const [cat, val] = this.cellLabel(CATS[i]);
      drawText(g, `${i + 1}. ${cat}`, r.x + 3, r.y + 2, P.MIST);
      drawText(g, val, r.x + 52, r.y + 2, sel ? P.LANTERN : P.FOG);
    });
    if (this.phase !== 'kitPick') {
      const id = game.kit[CATS[this.kitCat]];
      const desc = MOVE_DESC[id] ?? ITEMS[id]?.desc ?? '';
      this.mores = [drawClipped(g, desc, 7, L.boxY + 6, W - 14, 4, 8, P.MIST, moveName(id), [P.FOREST, P.LANTERN])];
      return;
    }
    const cat = CATS[this.kitCat];
    const opts = options(game, cat);
    const prects = this.pickRects(opts.length);
    const rows = prects.length;
    if (this.kitIdx < this.kitScroll) this.kitScroll = this.kitIdx;
    if (this.kitIdx >= this.kitScroll + rows) this.kitScroll = this.kitIdx - rows + 1;
    panel(g, 4, prects[0].y - 4, W - 8, rows * 10 + 8);
    prects.forEach((r, i) => {
      const idx = i + this.kitScroll;
      const id = opts[idx];
      if (!id) return;
      const sel = idx === this.kitIdx;
      if (sel) { g.fillStyle = hex(P.FOREST); g.fillRect(r.x, r.y, r.w, r.h); }
      const icon = ICON[id];
      if (icon) g.drawImage(icon, 4, 4, 8, 8, r.x + 1, r.y + 1, 8, 8);
      const cnt = cat === 'bait' ? ` x${game.inv.count(id)}` : '';
      drawText(g, `${moveName(id)}${cnt}`, r.x + 12, r.y + 2, sel ? P.LANTERN : P.FOG);
      if (cat === 'bait' && this.game.dex[this.def.id].behavior && this.def.lures.includes(id)) drawTextRight(g, 'FAVORITE', r.x + r.w - 3, r.y + 2, P.FERN);
    });
    const id = opts[this.kitIdx];
    const desc = MOVE_DESC[id] ?? ITEMS[id]?.desc ?? '';
    panel(g, 0, L.boxY, W, L.boxH);
    this.mores = [drawClipped(g, desc, 7, L.boxY + 6, W - 14, 4, 8, P.MIST, moveName(id), [P.FOREST, P.LANTERN])];
  }
}

/** 5x5 pixel star used for Dex mastery. */
export function drawStar(g: CanvasRenderingContext2D, x: number, y: number, filled: boolean, on: number = P.LANTERN, off: number = P.SHADOW): void {
  const rows = ['..x..', '.xxx.', 'xxxxx', '.xxx.', 'x...x'];
  g.fillStyle = hex(filled ? on : off);
  rows.forEach((row, j) => { for (let i = 0; i < 5; i++) if (row[i] === 'x') g.fillRect(x + i, y + j, 1, 1); });
}
