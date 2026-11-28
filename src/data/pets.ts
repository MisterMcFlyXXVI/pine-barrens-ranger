/**
 * Cabin companions. In the first week (or any later morning if you said "not
 * yet"), Barney and Mabel come by the porch with a basket: one of Buster's pups,
 * a tuxedo kitten from Mabel's barn, and a raven Dr. Okafor found on the ridge
 * with a mended wing. You take one home.
 */
export type PetKind = 'pup' | 'cat' | 'raven';
export const PET_KINDS: readonly PetKind[] = ['pup', 'cat', 'raven'];

export interface PetState {
  kind: PetKind;
  name: string;
  /** 0-100, grows a little with every day you pet them. */
  bond: number;
  /** Last day petted. */
  petDay: number;
  adoptDay: number;
  /** Coming with you today (chosen at their house); otherwise they stay around the cabin. */
  along?: boolean;
}

export interface PetDef {
  kind: PetKind;
  title: string;
  /** Default name, and two more suggestions. */
  names: [string, string, string];
  pitch: string;
  /** Shown when you pet them. */
  pet: string[];
  /** What they're good at (Journal). */
  perk: string;
  /** Comes along into the wilds (the cat stays home: cats don't hike). */
  hikes: boolean;
  /** Their place in the yard. */
  house: string;
  /** Share of the day spent lounging inside the cabin (vs. the yard). */
  indoors: number;
}

export const PETS: Record<PetKind, PetDef> = {
  pup: {
    kind: 'pup', title: 'Buster\'s Hound Pup', names: ['Biscuit', 'Rusty', 'Pepper'], hikes: true, house: 'Dog House', indoors: 0.3,
    pitch: 'One of Buster\'s pups, all ears and paws. Barney swears she can already smell a jackalope across the county.',
    pet: ['The pup flops over for a belly rub, ears everywhere.', 'The pup leans her whole weight against your leg and sighs.', 'Sniff, sniff, lick. You have been inspected and approved.'],
    perk: 'Sniffs out nearby cryptid clues in the wilds and barks toward them.',
  },
  cat: {
    kind: 'cat', title: 'Tuxedo Barn Cat', names: ['Socks', 'Domino', 'Mittens'], hikes: false, house: 'Cat Tower', indoors: 0.5,
    pitch: 'A tuxedo kitten from Mabel\'s porch: white boots, white bib, opinions. "Keeps the mice honest," Mabel says.',
    pet: ['The cat permits exactly three strokes, then headbutts your hand for a fourth.', 'A rumbling purr, like a tiny truck idling.', 'The cat blinks slowly at you. In cat, that\'s a love letter.'],
    perk: 'Some mornings, leaves a gift on the cabin doormat: a feather, clover or a little fish.',
  },
  raven: {
    kind: 'raven', title: 'Tame Ridge Raven', names: ['Morse', 'Inky', 'Signal'], hikes: true, house: 'Raven Perch', indoors: 0,
    pitch: 'A raven Dr. Okafor found on Radio Ridge with a hurt wing, mended now. It mimics the porch radio\'s static perfectly.',
    pet: ['The raven fluffs up and makes a soft clicking sound.', 'It tugs your sleeve, then pretends it didn\'t.', 'The raven nibbles your hair, very gently. Grooming. You are part of the flock.'],
    perk: 'Perches on fence posts when you stop, and caws softly when Rare Variant odds are up.',
  },
};

/** The cat's morning gifts. */
export const CAT_GIFTS: readonly string[] = ['jay_feather', 'wild_clover', 'creek_chub', 'jay_feather'];
