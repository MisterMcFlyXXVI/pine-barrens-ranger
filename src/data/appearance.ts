/**
 * Character creator choices: name, body, skin, hair, facial hair, and the outfit
 * you arrive in. Everything stays inside the 16-colour palette, so tones come in
 * shade pairs (main + shadow). Nothing in the game depends on these choices:
 * townsfolk call you "Ranger", and by name once they know you.
 */
import { P } from '../graphics/palette';
import type { Body, Build, Facial, HairStyle } from '../graphics/playerSprite';

export interface Appearance {
  name: string;
  build: Build;
  skin: number;
  hair: number;
  hairStyle: HairStyle;
  facial: Facial;
}

/** Skin tones (main, shadow). */
export const SKINS: ReadonlyArray<[number, number]> = [
  [P.LANTERN, P.AMBER], [P.FOG, P.LANTERN], [P.AMBER, P.RUST], [P.RUST, P.CRAN],
];
/** Hair colours (main, shadow). */
export const HAIRS: ReadonlyArray<[number, number]> = [
  [P.RUST, P.CRAN], [P.SHADOW, P.VOID], [P.AMBER, P.RUST], [P.LANTERN, P.AMBER], [P.FOG, P.MIST], [P.CRAN, P.SHADOW],
];
export const HAIR_NAMES = ['AUBURN', 'BLACK', 'BROWN', 'BLOND', 'SILVER', 'DARK RED'];
export const SKIN_NAMES = ['LIGHT', 'FAIR', 'TAN', 'DEEP'];

export const HAIR_STYLES: ReadonlyArray<[HairStyle, string]> = [
  ['short', 'SHORT'], ['long', 'LONG'], ['ponytail', 'PONYTAIL'], ['curly', 'CURLY'], ['bun', 'BUN'], ['pigtails', 'BRAIDS'], ['bald', 'SHAVED'],
];
export const FACIALS: ReadonlyArray<[Facial, string]> = [
  ['none', 'NONE'], ['stubble', 'STUBBLE'], ['moustache', 'MOUSTACHE'], ['beard', 'BEARD'],
];
export const BUILDS: ReadonlyArray<[Build, string]> = [['a', 'BODY A'], ['b', 'BODY B']];
/** What you can arrive in (both stay in your wardrobe). */
export const START_OUTFITS: ReadonlyArray<[string, string]> = [['ranger_jacket', 'RANGER UNIFORM'], ['chore_coat', 'CHORE COAT']];

export const DEFAULT_LOOK: Appearance = { name: '', build: 'a', skin: 0, hair: 0, hairStyle: 'short', facial: 'none' };

export const NAME_MAX = 10;

/** Letters, spaces, hyphens and apostrophes the pixel font can draw. */
export function cleanName(s: string): string {
  return s.toUpperCase().replace(/[^A-Z' -]/g, '').replace(/\s+/g, ' ').replace(/^[ '-]+/, '').slice(0, NAME_MAX);
}

/** One shade darker, staying inside the palette. */
const DARKER: Partial<Record<number, number>> = {
  [P.LANTERN]: P.AMBER, [P.AMBER]: P.RUST, [P.RUST]: P.CRAN, [P.CRAN]: P.SHADOW, [P.SHADOW]: P.VOID, [P.FOG]: P.MIST, [P.MIST]: P.TWILIGHT,
};

export function bodyFor(a: Appearance): Body {
  const [skin, skinSh] = SKINS[a.skin % SKINS.length];
  let [hair, hairSh] = HAIRS[a.hair % HAIRS.length];
  // Hair the same colour as the face would vanish: take it one shade darker.
  if (hair === skin) { hair = DARKER[hair] ?? hair; hairSh = DARKER[hairSh] ?? hairSh; }
  return {
    id: `player:${a.build}${a.skin}${a.hair}${a.hairStyle}${a.facial}`,
    skin, skinSh, hair, hairSh, pants: P.TWILIGHT, pantsSh: P.SHADOW, boot: P.CRAN,
    hairStyle: a.hairStyle, facial: a.facial, build: a.build,
  };
}

/* ---------------- The name townsfolk call you ---------------- */

let playerName = '';
export function setPlayerName(n: string): void { playerName = n.trim(); }
/** Your name in Title Case (dialogue is drawn in capitals anyway). */
export function nameOrRanger(): string {
  if (!playerName) return 'Ranger';
  return playerName.toLowerCase().replace(/(^|[\s'-])([a-z])/g, (_m, a: string, b: string) => a + b.toUpperCase());
}
/** Fill `{name}` in dialogue (falls back to "Ranger" if no name was given). */
export function fillName(s: string): string { return s.includes('{name}') ? s.replace(/\{name\}/g, nameOrRanger()) : s; }
