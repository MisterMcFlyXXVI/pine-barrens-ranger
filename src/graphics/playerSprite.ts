/**
 * Modular 24x24 player renderer: body layer + outfit layer + hat layer,
 * baked lazily per (outfit, hat, direction, frame, pose) and cached.
 */
import { makeCanvas, Pen, flipH, outline, Canv } from './canvas';
import { P } from './palette';
import type { Dir } from '../util';
import { outfitById, hatById, OutfitDef, HatDef } from '../data/outfits';
import type { Legs } from '../data/outfits';

export interface Look {
  outfit: string;
  hat: string;
}

/** 'walk' = idle/walk cycle, 'act' = arms forward for tool use. */
export type Pose = 'walk' | 'act';

export type HairStyle = 'short' | 'long' | 'bun' | 'pigtails' | 'bald' | 'beard' | 'curly' | 'ponytail';
export type Facial = 'none' | 'stubble' | 'moustache' | 'beard';
export type Build = 'a' | 'b';

/** Skin / hair / trouser palette — lets townsfolk reuse the player renderer. */
export interface Body {
  id: string;
  skin: number;
  skinSh: number;
  hair: number;
  hairSh: number;
  pants: number;
  pantsSh: number;
  boot: number;
  hairStyle: HairStyle;
  /** Facial hair, drawn in the hair colour (player only). */
  facial?: Facial;
  /** 'b' is a little narrower at the waist. */
  build?: Build;
}

export const PLAYER_BODY: Body = {
  id: 'player', skin: P.LANTERN, skinSh: P.AMBER, hair: P.RUST, hairSh: P.CRAN,
  pants: P.TWILIGHT, pantsSh: P.SHADOW, boot: P.CRAN, hairStyle: 'short',
};

// Active palette for the bake in progress (set by bake()).
let SKIN: number = P.LANTERN, SKIN_SH: number = P.AMBER;
let HAIR: number = P.RUST, HAIR_SH: number = P.CRAN;
let PANTS: number = P.TWILIGHT, PANTS_SH: number = P.SHADOW;
let BOOT: number = P.CRAN;
let STYLE: HairStyle = 'short';
let FACIAL: Facial = 'none';
let BUILD: Build = 'a';
let LEGS: Legs['kind'] = 'pants';
const SOLE = P.SHADOW;

const cache = new Map<string, Canv>();

/** The player's body, from the character creator (its id encodes every choice, for the cache). */
let playerBody: Body = PLAYER_BODY;
export function setPlayerBody(b: Body): void { playerBody = b; }

export function playerFrame(look: Look, dir: Dir, frame: number, pose: Pose): Canv {
  return personFrame(playerBody, look, dir, frame, pose);
}

export function personFrame(body: Body, look: Look, dir: Dir, frame: number, pose: Pose): Canv {
  const key = `${body.id}|${look.outfit}|${look.hat}|${dir}|${frame}|${pose}`;
  let c = cache.get(key);
  if (!c) {
    c = dir === 'right' ? flipH(personFrame(body, look, 'left', frame, pose)) : bake(body, look, dir, frame, pose);
    cache.set(key, c);
  }
  return c;
}

/** Where the active hand / tool pivot sits inside the 24x24 sprite. */
export function handPivot(dir: Dir): [number, number] {
  switch (dir) {
    case 'down': return [12, 16];
    case 'up': return [12, 11];
    case 'left': return [6, 14];
    case 'right': return [17, 14];
  }
}

function bake(body: Body, look: Look, dir: Dir, frame: number, pose: Pose): Canv {
  SKIN = body.skin; SKIN_SH = body.skinSh; HAIR = body.hair; HAIR_SH = body.hairSh;
  PANTS = body.pants; PANTS_SH = body.pantsSh; BOOT = body.boot; STYLE = body.hairStyle;
  FACIAL = body.facial ?? 'none'; BUILD = body.build ?? 'a';
  const { c, g } = makeCanvas(24, 24);
  const p = new Pen(g);
  const o = outfitById(look.outfit);
  const h = hatById(look.hat);
  LEGS = o.legs?.kind ?? 'pants';
  if (o.legs) {
    PANTS = o.legs.main; PANTS_SH = o.legs.shade; BOOT = o.legs.boot ?? BOOT;
    // A knee-length skirt shows bare legs below the hem.
    if (LEGS === 'skirt') { PANTS = SKIN; PANTS_SH = SKIN_SH; }
  }
  if (dir === 'left') drawSide(p, o, h, frame, pose);
  else drawFrontBack(p, o, h, dir === 'up', frame, pose);
  return outline(c);
}

type Part = 'body' | 'sleeve';

function outfitColor(o: OutfitDef, x: number, y: number, back: boolean, part: Part, cx: number): number {
  const center = Math.abs(x + 0.5 - cx) < 1.1;
  switch (o.style) {
    case 'jacket':
      if (part === 'sleeve') return o.shade;
      if (!back && center) return y <= 11 ? o.trim : o.accent;
      if (!back && y <= 11 && Math.abs(x + 0.5 - cx) < 2.2) return o.trim;
      if (!back && y === 14 && Math.abs(x + 0.5 - cx) > 2.5) return o.shade;
      if (y >= 16) return o.shade;
      return o.main;
    case 'flannel':
      if (x % 3 === 0 && y % 3 === 0) return o.trim;
      if (x % 3 === 0 || y % 3 === 0) return o.shade;
      if (!back && center && y <= 12) return o.accent;
      return o.main;
    case 'slicker':
      if (part === 'sleeve') return o.shade;
      if (!back && center && (y === 12 || y === 14 || y === 16)) return o.trim;
      if (!back && center) return o.shade;
      return o.main;
    case 'cloak':
      if (!back && center && y <= 12) return o.accent;
      if (part === 'sleeve') return o.shade;
      if (!back && center) return o.trim;
      return o.main;
    case 'mantle':
      if (y <= 12) return (x + y) % 2 ? o.trim : o.shade;
      if (part === 'body' && (y === 13 || y === 15) && !center) return o.trim;
      return o.main;
    case 'apron':
      if (part === 'sleeve') return o.main;
      if (Math.abs(x + 0.5 - cx) < 3 && y >= 12) return y === 12 ? o.trim : o.accent;
      return y >= 16 ? o.shade : o.main;
    case 'tee':
      if (part === 'sleeve') return o.main;
      if (!back && y >= 12 && y <= 14 && Math.abs(x + 0.5 - cx) < 2.5) return (x + y) % 2 ? o.trim : o.accent; // the print
      return y >= 16 ? o.shade : o.main;
    case 'dress':
      if (part === 'sleeve') return SKIN;
      if (y === 11) return Math.abs(x + 0.5 - cx) > 2.5 && Math.abs(x + 0.5 - cx) < 3.6 ? o.main : SKIN; // straps
      if ((x * 5 + y * 3) % 7 === 0) return o.trim; // little flowers
      if ((x * 5 + y * 3) % 7 === 3) return o.accent;
      return y === 14 ? o.shade : o.main;
    case 'gown':
      if (part === 'sleeve') return o.main;
      if (!back && y <= 12 && center) return y === 11 ? SKIN : o.shade; // the neckline
      if (y === 14) return o.shade; // a sash
      if ((x * 7 + y * 5) % 11 === 0) return o.trim; // a few beads
      return o.main;
    case 'stripes':
      if (!back && part === 'body' && y === 13 && x >= 9 && x <= 10) return o.trim; // the number patch
      return y % 2 ? o.shade : o.main;
    case 'union':
      if (part === 'sleeve') return o.main;
      if (!back && center && (y === 12 || y === 14 || y === 16)) return o.trim; // buttons
      if (back && y >= 15 && Math.abs(x + 0.5 - cx) < 3) return y === 15 ? o.shade : o.main; // the flap
      return y === 11 ? o.shade : o.main;
    case 'blazer':
      if (part === 'sleeve') return o.main;
      if (!back && center && y <= 15) return y === 11 ? o.trim : o.accent; // the tie
      if (!back && Math.abs(x + 0.5 - cx) < 2.2 && y <= 13) return o.trim; // shirt front
      if (!back && y === 15 && Math.abs(x + 0.5 - cx) > 3) return o.shade; // pockets
      return o.main;
    case 'overalls': {
      const bib = Math.abs(x + 0.5 - cx) < 3;
      if (part === 'sleeve') return o.trim;
      if (y === 11 || y === 12) return Math.abs(Math.abs(x + 0.5 - cx) - 2.5) < 0.6 ? (y === 12 && !back ? o.accent : o.main) : o.trim; // straps + buckles
      if (y >= 15) return y === 16 ? o.shade : o.main;
      return bib ? (y === 13 && !back && center ? o.shade : o.main) : o.trim;
    }
    case 'camo': {
      const blob = ((x * 13 + y * 7) % 9);
      if (part === 'body' && (x <= 9 || x >= 14) && y <= 15 && !back) return y === 13 ? o.trim : o.accent; // blaze vest panels
      if (part === 'body' && back && y <= 15 && Math.abs(x + 0.5 - cx) < 3.5) return y === 13 ? o.trim : o.accent;
      return blob < 2 ? o.shade : blob === 4 ? o.trim : o.main;
    }
    case 'suit':
      if (part === 'body' && ((x * 7 + y * 3) % 5 === 0)) return o.accent;
      if (!back && center && y <= 13) return P.VOID;
      if (!back && Math.abs(x + 0.5 - cx) < 2.2 && y <= 12) return o.trim;
      return o.main;
  }
}

function drawFrontBack(p: Pen, o: OutfitDef, h: HatDef, back: boolean, frame: number, pose: Pose): void {
  const oy = frame === 0 ? 0 : 1;
  const cx = 12;
  // Cloak drapes behind on the front view
  if (o.style === 'cloak' && !back) { p.rect(6, 11 + oy, 12, 10, o.shade); p.vline(6, 12 + oy, 20, o.trim); p.vline(17, 12 + oy, 20, o.trim); }

  // Legs + boots (body layer)
  const liftL = frame === 1 ? 1 : 0, liftR = frame === 2 ? 1 : 0;
  leg(p, 9, 17, 3, 3 - liftL); p.vline(11, 17, 19 - liftL, legShade(17));
  leg(p, 12, 17, 3, 3 - liftR); p.vline(12, 17, 19 - liftR, legShade(17));
  if (LEGS === 'stripes') { p.px(11, 18, PANTS_SH); p.px(12, 18, PANTS_SH); }
  p.rect(9, 20 - liftL, 3, 2, BOOT); p.hline(9, 11, 21 - liftL, SOLE);
  p.rect(12, 20 - liftR, 3, 2, BOOT); p.hline(12, 14, 21 - liftR, SOLE);
  if (LEGS === 'ripped') { p.px(10, 18 - liftL, SKIN); p.px(13, 18 - liftR, SKIN); p.px(9, 18 - liftL, P.FOG); p.px(14, 18 - liftR, P.FOG); }

  // Torso (outfit layer)
  const torsoBottom = o.style === 'slicker' ? 18 : 16;
  for (let y = 11; y <= torsoBottom; y++) {
    for (let x = 8; x <= 15; x++) {
      if (BUILD === 'b' && (x === 8 || x === 15) && y >= 13 && y <= 15 && o.style !== 'cloak' && o.style !== 'mantle') continue;
      p.px(x, y + (y <= 16 ? oy : 0), outfitColor(o, x, y, back, 'body', cx));
    }
  }
  skirtFront(p, o, frame, oy);
  if (o.style === 'cloak' && back) { p.rect(7, 11 + oy, 10, 10, o.main); p.vline(7, 11 + oy, 20, o.trim); p.vline(16, 11 + oy, 20, o.trim); }
  if (o.style === 'mantle') { p.hline(7, 16, 11 + oy, o.shade); p.hline(6, 17, 12 + oy, o.trim); }

  // Arms
  if (pose === 'act') {
    if (back) {
      arm(p, o, 7, 11 + oy, 3, back, cx);
      arm(p, o, 16, 11 + oy, 3, back, cx);
    } else {
      arm(p, o, 8, 12 + oy, 3, back, cx);
      arm(p, o, 15, 12 + oy, 3, back, cx);
      p.rect(9, 15 + oy, 2, 1, SKIN); p.rect(13, 15 + oy, 2, 1, SKIN);
    }
  } else {
    const swL = frame === 1 ? 1 : frame === 2 ? -1 : 0;
    const swR = -swL;
    arm(p, o, 7, 11 + oy, 5 + swL, back, cx);
    p.px(7, 16 + oy + swL, SKIN);
    arm(p, o, 16, 11 + oy, 5 + swR, back, cx);
    p.px(16, 16 + oy + swR, SKIN);
  }

  // Head
  const hy = 3 + oy;
  if (!back) {
    p.rect(8, hy, 8, 8, SKIN);
    p.rect(8, hy, 8, 2, HAIR);
    p.vline(8, hy + 2, hy + 4, HAIR); p.vline(15, hy + 2, hy + 4, HAIR);
    p.px(10, hy + 2, HAIR); p.px(13, hy + 2, HAIR); p.px(9, hy + 2, HAIR_SH);
    p.vline(15, hy + 5, hy + 6, SKIN_SH); p.hline(9, 14, hy + 7, SKIN_SH);
    p.px(10, hy + 4, P.VOID); p.px(13, hy + 4, P.VOID);
    p.px(10, hy + 5, P.FOG);
  } else {
    p.rect(8, hy, 8, 8, HAIR);
    p.hline(9, 14, hy + 7, HAIR_SH); p.vline(15, hy + 1, hy + 7, HAIR_SH);
    p.px(9, hy + 1, P.AMBER); p.px(10, hy + 1, P.AMBER);
  }
  hairExtras(p, back ? 'up' : 'down', hy);
  if (!back) facialHair(p, 'down', hy);
  drawHat(p, h, back ? 'up' : 'down', hy);
}

function drawSide(p: Pen, o: OutfitDef, h: HatDef, frame: number, pose: Pose): void {
  const oy = frame === 0 ? 0 : 1;
  const cx = 11.5;
  if (o.style === 'cloak') { p.rect(12, 11 + oy, 4, 10, o.main); p.vline(15, 12 + oy, 20, o.trim); }

  // Legs (facing left)
  if (frame === 0) {
    leg(p, 10, 17, 4, 3); p.vline(12, 17, 19, legShade(17));
    p.rect(9, 20, 5, 2, BOOT); p.hline(9, 13, 21, SOLE);
    if (LEGS === 'ripped') { p.px(10, 18, SKIN); p.px(11, 18, P.FOG); }
  } else if (frame === 1) {
    leg(p, 12, 17, 3, 2, true); p.rect(12, 19, 4, 2, BOOT); p.hline(12, 15, 20, SOLE);
    leg(p, 8, 17, 3, 3); p.rect(7, 20, 4, 2, BOOT); p.hline(7, 10, 21, SOLE);
    if (LEGS === 'ripped') p.px(8, 18, SKIN);
  } else {
    leg(p, 8, 17, 3, 2, true); p.rect(7, 19, 4, 2, BOOT); p.hline(7, 10, 20, SOLE);
    leg(p, 12, 17, 3, 3); p.rect(12, 20, 4, 2, BOOT); p.hline(12, 15, 21, SOLE);
    if (LEGS === 'ripped') p.px(12, 18, SKIN);
  }

  // Torso
  const torsoBottom = o.style === 'slicker' ? 18 : 16;
  for (let y = 11; y <= torsoBottom; y++) {
    for (let x = 9; x <= 14; x++) {
      if (BUILD === 'b' && x === 14 && y >= 13 && y <= 15) continue;
      p.px(x, y + (y <= 16 ? oy : 0), outfitColor(o, x, y, false, 'body', cx));
    }
  }
  skirtSide(p, o, frame, oy);
  if (o.style === 'mantle') { p.hline(8, 15, 11 + oy, o.shade); p.hline(8, 15, 12 + oy, o.trim); }

  // Arm
  const sleeve = outfitColor(o, 11, 12, false, 'sleeve', cx);
  if (pose === 'act') {
    p.rect(7, 13 + oy, 5, 2, sleeve);
    if (o.style === 'tee' || o.style === 'overalls') p.rect(7, 13 + oy, 3, 2, SKIN);
    if (o.style === 'stripes') p.px(9, 13 + oy, o.shade);
    p.rect(6, 13 + oy, 1, 2, SKIN);
  } else {
    const ax = frame === 1 ? 10 : frame === 2 ? 12 : 11;
    arm(p, o, ax, 11 + oy, 5, false, cx); arm(p, o, ax + 1, 11 + oy, 5, false, cx);
    p.rect(ax + (frame === 1 ? -1 : frame === 2 ? 1 : 0), 16 + oy, 2, 1, SKIN);
  }

  // Head (profile)
  const hy = 3 + oy;
  p.rect(8, hy, 7, 8, SKIN);
  p.rect(8, hy, 7, 2, HAIR);
  p.rect(11, hy + 2, 4, 4, HAIR); p.rect(12, hy + 6, 3, 1, HAIR_SH);
  p.px(8, hy + 2, HAIR);
  p.px(12, hy + 4, SKIN_SH);
  p.px(9, hy + 4, P.VOID);
  p.px(7, hy + 5, SKIN);
  p.hline(8, 11, hy + 7, SKIN_SH);
  hairExtras(p, 'left', hy);
  facialHair(p, 'left', hy);
  drawHat(p, h, 'left', hy);
}

/** A leg block in the trouser colours (stripes band them; the shadow side uses the shade). */
function leg(p: Pen, x: number, y: number, w: number, h: number, shadow = false): void {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const c = LEGS === 'stripes' ? (yy % 2 ? PANTS_SH : PANTS) : shadow ? PANTS_SH : PANTS;
    p.px(xx, yy, c);
  }
}
function legShade(y: number): number { return LEGS === 'stripes' ? (y % 2 ? PANTS_SH : PANTS) : PANTS_SH; }

/** One arm, top to bottom: short sleeves end at the elbow, a sundress leaves them bare, stripes band them. */
function arm(p: Pen, o: OutfitDef, x: number, y: number, h: number, back: boolean, cx: number): void {
  for (let k = 0; k < h; k++) {
    let c = outfitColor(o, x, 12, back, 'sleeve', cx);
    if ((o.style === 'tee' || o.style === 'overalls') && k >= 2) c = SKIN;
    else if (o.style === 'stripes') c = (y + k) % 2 ? o.shade : o.main;
    else if (o.style === 'gown' && o.main === P.FOG && k >= 3) c = P.MOON; // lace cuffs
    p.px(x, y + k, c);
  }
}

/** Skirts and gowns, front/back view: a flared hem over the legs. */
function skirtFront(p: Pen, o: OutfitDef, frame: number, oy: number): void {
  if (LEGS !== 'skirt' && LEGS !== 'gown') return;
  const sway = frame === 1 ? -1 : frame === 2 ? 1 : 0;
  const bottom = LEGS === 'gown' ? 21 : 18;
  for (let y = 16; y <= bottom; y++) {
    const flare = Math.floor((y - 15) / 2);
    const x0 = 8 - flare + (y >= bottom - 1 ? sway : 0), x1 = 15 + flare + (y >= bottom - 1 ? sway : 0);
    for (let x = x0; x <= x1; x++) {
      let c = y === bottom ? o.shade : o.main;
      if (o.style === 'dress' && (x * 5 + y * 3) % 7 === 0) c = o.trim;
      if (LEGS === 'gown' && (x - x0) % 3 === 0 && y > 17) c = o.shade; // folds
      if (LEGS === 'gown' && y === bottom && x % 3 === 0) c = o.trim;
      p.px(x, y + (y <= 16 ? oy : 0), c);
    }
  }
  if (LEGS === 'gown') { p.px(10, 22, BOOT); p.px(13, 22, BOOT); } // the toes peek out
}

/** Skirts and gowns in profile. */
function skirtSide(p: Pen, o: OutfitDef, frame: number, oy: number): void {
  if (LEGS !== 'skirt' && LEGS !== 'gown') return;
  const sway = frame === 1 ? -1 : frame === 2 ? 1 : 0;
  const bottom = LEGS === 'gown' ? 21 : 18;
  for (let y = 16; y <= bottom; y++) {
    const flare = Math.floor((y - 15) / 2);
    const x0 = 9 - flare + (y >= bottom - 1 ? sway : 0), x1 = 14 + flare + (LEGS === 'gown' ? 1 : 0);
    for (let x = x0; x <= x1; x++) {
      let c = y === bottom || x === x1 ? o.shade : o.main;
      if (o.style === 'dress' && (x * 5 + y * 3) % 7 === 0) c = o.trim;
      p.px(x, y + (y <= 16 ? oy : 0), c);
    }
  }
  if (LEGS === 'gown') p.px(8 + sway, 22, BOOT);
}

/** Hair-style details layered over the base head. */
function hairExtras(p: Pen, view: 'down' | 'up' | 'left', hy: number): void {
  const side = view === 'left';
  switch (STYLE) {
    case 'short': return;
    case 'bald':
      if (view === 'down') { p.hline(9, 14, hy, SKIN); p.hline(9, 14, hy + 1, SKIN); p.px(8, hy + 2, HAIR); p.px(15, hy + 2, HAIR); }
      else if (view === 'up') { p.rect(9, hy, 6, 3, SKIN); p.px(10, hy, SKIN_SH); }
      else { p.rect(8, hy, 5, 2, SKIN); }
      return;
    case 'long':
      if (side) { p.rect(12, hy + 2, 3, 8, HAIR); p.vline(14, hy + 4, hy + 9, HAIR_SH); }
      else { p.rect(7, hy + 1, 1, 8, HAIR); p.rect(16, hy + 1, 1, 8, HAIR); if (view === 'up') p.rect(8, hy + 7, 8, 3, HAIR); }
      return;
    case 'bun':
      p.rect(10, hy - 3, 4, 3, HAIR); p.hline(11, 12, hy - 3, HAIR_SH);
      return;
    case 'pigtails':
      if (side) { p.rect(13, hy + 4, 2, 4, HAIR); }
      else { p.rect(6, hy + 4, 2, 4, HAIR); p.rect(16, hy + 4, 2, 4, HAIR); p.px(6, hy + 7, HAIR_SH); p.px(17, hy + 7, HAIR_SH); }
      return;
    case 'beard':
      if (view === 'down') { p.rect(9, hy + 5, 6, 3, HAIR); p.px(11, hy + 6, SKIN_SH); p.px(12, hy + 6, SKIN_SH); }
      else if (side) { p.rect(8, hy + 5, 4, 3, HAIR); }
      return;
    case 'curly':
      // A full, rounded crown of curls.
      if (side) { p.rect(8, hy - 2, 7, 3, HAIR); p.rect(13, hy + 1, 3, 5, HAIR); p.px(9, hy - 2, HAIR_SH); p.px(12, hy - 1, HAIR_SH); p.px(14, hy + 3, HAIR_SH); }
      else {
        p.rect(7, hy - 2, 10, 3, HAIR); p.rect(6, hy, 2, 5, HAIR); p.rect(16, hy, 2, 5, HAIR);
        for (const x of [8, 11, 14]) p.px(x, hy - 2, HAIR_SH);
        p.px(6, hy + 2, HAIR_SH); p.px(17, hy + 3, HAIR_SH);
        if (view === 'up') { p.rect(8, hy + 1, 8, 7, HAIR); p.px(10, hy + 3, HAIR_SH); p.px(13, hy + 5, HAIR_SH); }
      }
      return;
    case 'ponytail':
      if (side) { p.rect(15, hy + 2, 2, 2, HAIR); p.rect(16, hy + 4, 2, 4, HAIR); p.px(17, hy + 7, HAIR_SH); }
      else if (view === 'up') { p.rect(11, hy + 6, 2, 5, HAIR); p.px(11, hy + 6, HAIR_SH); p.px(12, hy + 10, HAIR_SH); }
      else { p.px(16, hy + 3, HAIR); p.px(16, hy + 4, HAIR_SH); }
      return;
  }
}

/** Facial hair layer (front and profile). */
function facialHair(p: Pen, view: 'down' | 'left', hy: number): void {
  if (FACIAL === 'none' || STYLE === 'beard') return;
  const side = view === 'left';
  switch (FACIAL) {
    case 'stubble':
      if (side) { p.px(8, hy + 6, HAIR_SH); p.px(10, hy + 6, HAIR_SH); p.px(9, hy + 7, HAIR_SH); p.px(11, hy + 5, HAIR_SH); }
      else { for (const [x, y] of [[9, 6], [11, 7], [13, 7], [14, 6], [10, 7], [12, 6]]) p.px(x, hy + y, HAIR_SH); }
      return;
    case 'moustache':
      if (side) { p.hline(7, 9, hy + 5, HAIR); }
      else { p.hline(10, 13, hy + 5, HAIR); p.px(9, hy + 6, HAIR); p.px(14, hy + 6, HAIR); p.px(10, hy + 5, HAIR_SH); }
      return;
    case 'beard':
      if (side) { p.rect(8, hy + 5, 4, 3, HAIR); p.px(8, hy + 8, HAIR_SH); p.px(11, hy + 5, HAIR_SH); }
      else { p.rect(9, hy + 5, 6, 3, HAIR); p.hline(10, 13, hy + 8, HAIR_SH); p.hline(11, 12, hy + 6, SKIN_SH); p.px(8, hy + 4, HAIR); p.px(15, hy + 4, HAIR); }
      return;
  }
}

function drawHat(p: Pen, h: HatDef, view: 'down' | 'up' | 'left', hy: number): void {
  const side = view === 'left';
  const x0 = 8, x1 = side ? 14 : 15;
  switch (h.style) {
    case 'none':
      return;
    case 'cap':
      p.rect(x0, hy - 1, x1 - x0 + 1, 3, h.main);
      p.hline(x0 + 1, x1 - 2, hy - 1, h.accent === P.AMBER ? P.MOSS : h.main);
      if (view === 'down') { p.hline(x0 - 1, x1 + 1, hy + 2, h.shade); p.px(11, hy, h.accent); p.px(12, hy, h.accent); }
      else if (view === 'up') p.hline(x0, x1, hy + 2, h.shade);
      else { p.hline(5, 10, hy + 2, h.shade); p.px(10, hy, h.accent); }
      return;
    case 'bucket':
      p.rect(x0 + 1, hy - 2, x1 - x0 - 1, 4, h.main);
      p.hline(x0 + 1, x1 - 1, hy + 1, h.accent);
      p.hline(x0 - 2, x1 + 2, hy + 2, h.shade);
      p.hline(x0 + 2, x1 - 2, hy - 2, P.LANTERN);
      return;
    case 'antlers': {
      p.rect(x0, hy - 1, x1 - x0 + 1, 3, h.main);
      p.hline(x0 + 1, x1 - 1, hy - 1, h.shade);
      const a = h.accent;
      if (side) {
        p.vline(12, hy - 5, hy - 2, a); p.px(11, hy - 4, a); p.px(13, hy - 6, a); p.px(10, hy - 5, a);
      } else {
        p.vline(9, hy - 4, hy - 2, a); p.px(8, hy - 3, a); p.px(7, hy - 4, a); p.px(10, hy - 5, a);
        p.vline(14, hy - 4, hy - 2, a); p.px(15, hy - 3, a); p.px(16, hy - 4, a); p.px(13, hy - 5, a);
      }
      if (view === 'down') p.hline(x0 - 1, x1 + 1, hy + 2, h.shade);
      return;
    }
    case 'headphones':
      p.hline(x0, x1, hy - 1, P.SHADOW);
      if (view === 'down' || view === 'up') { p.rect(x0 - 1, hy + 3, 2, 3, P.RED); p.rect(x1, hy + 3, 2, 3, P.RED); }
      else p.rect(11, hy + 3, 2, 3, P.RED);
      return;
    case 'goggles':
      p.hline(x0, x1, hy + 3, P.VOID);
      if (view === 'down') {
        p.rect(9, hy + 3, 2, 2, h.accent); p.rect(13, hy + 3, 2, 2, h.accent);
        p.px(9, hy + 3, P.FOG); p.px(13, hy + 3, P.FOG);
      } else if (side) {
        p.rect(8, hy + 3, 2, 2, h.accent); p.px(8, hy + 3, P.FOG);
      }
      return;
    case 'crown': {
      p.rect(x0, hy - 1, x1 - x0 + 1, 2, h.main);
      const a = h.shade, t = h.accent;
      const branch = (x: number, dir: number) => {
        p.vline(x, hy - 6, hy - 2, a);
        p.px(x + dir, hy - 4, a); p.px(x + dir * 2, hy - 5, a); p.px(x + dir * 2, hy - 6, t);
        p.px(x - dir, hy - 7, t); p.px(x, hy - 7, t);
      };
      if (side) branch(12, 1);
      else { branch(9, -1); branch(14, 1); }
      if (!side && view === 'down') { p.px(10, hy + 4, P.RED); p.px(13, hy + 4, P.RED); }
      return;
    }
    case 'alpine':
      // Green felt with a cord band and a feather tucked in the side.
      p.rect(x0 + 1, hy - 3, x1 - x0 - 1, 4, h.main);
      p.hline(x0 + 2, x1 - 2, hy - 3, h.shade);
      p.hline(x0 + 1, x1 - 1, hy, h.accent);
      p.hline(x0 - 1, x1 + 1, hy + 1, h.shade);
      if (side) { p.px(13, hy - 4, P.FOG); p.px(14, hy - 5, P.FOG); p.px(13, hy - 5, P.MIST); }
      else { p.px(x1 - 1, hy - 4, P.FOG); p.px(x1, hy - 5, P.FOG); p.px(x1 + 1, hy - 6, P.MIST); }
      return;
    case 'kerchief':
      // A headscarf over the hair, knotted under the chin.
      p.rect(x0, hy - 1, x1 - x0 + 1, 3, h.main);
      p.hline(x0 + 1, x1 - 1, hy - 1, h.shade);
      for (let x = x0 + 1; x < x1; x += 3) p.px(x, hy, h.accent);
      if (side) { p.rect(12, hy + 2, 3, 4, h.main); p.px(12, hy + 6, h.shade); }
      else if (view === 'down') { p.vline(x0 - 1, hy + 1, hy + 5, h.main); p.vline(x1 + 1, hy + 1, hy + 5, h.main); p.px(11, hy + 8, h.shade); p.px(12, hy + 8, h.main); }
      else p.rect(x0, hy + 2, x1 - x0 + 1, 5, h.main);
      return;
    case 'beanie':
      p.rect(x0, hy - 2, x1 - x0 + 1, 4, h.main);
      p.hline(x0 - (side ? 0 : 1), x1 + (side ? 0 : 1), hy + 1, h.shade);
      for (let x = x0; x <= x1; x += 2) p.px(x, hy + 1, h.main);
      p.hline(x0 + 1, x1 - 1, hy - 2, h.shade);
      p.rect(side ? 11 : 11, hy - 4, 2, 2, h.accent); p.px(side ? 12 : 12, hy - 4, P.MOON);
      return;
    case 'sunhat':
      p.rect(x0 + 1, hy - 3, x1 - x0 - 1, 4, h.main);
      p.hline(x0 + 2, x1 - 2, hy - 3, P.LANTERN);
      p.hline(x0 + 1, x1 - 1, hy, h.accent);
      if (side) { p.hline(3, 16, hy + 1, h.main); p.hline(4, 15, hy + 2, h.shade); }
      else { p.hline(x0 - 4, x1 + 4, hy + 1, h.main); p.hline(x0 - 3, x1 + 3, hy + 2, h.shade); p.px(x0 - 4, hy + 2, h.shade); }
      if (!side && view === 'up') { p.px(x1 + 1, hy + 3, h.accent); p.px(x1 + 2, hy + 4, h.accent); } // ribbon tails
      return;
    case 'tophat':
      p.rect(x0 + 1, hy - 3, x1 - x0 - 1, 5, h.main);
      p.vline(x0 + 2, hy - 3, hy, h.shade);
      p.hline(x0 + 1, x1 - 1, hy, h.accent);
      p.hline(x0 - 1, x1 + 1, hy + 2, h.main); p.hline(x0, x1, hy + 2, h.shade);
      return;
    case 'cowboy':
      p.rect(x0 + 1, hy - 3, x1 - x0 - 1, 4, h.main);
      p.px(side ? 11 : 11, hy - 3, h.shade); p.px(side ? 12 : 12, hy - 3, h.shade); // the pinch
      p.hline(x0 + 1, x1 - 1, hy, h.accent);
      if (side) { p.hline(4, 16, hy + 1, h.main); p.px(4, hy, h.main); p.px(16, hy, h.main); p.hline(5, 15, hy + 2, h.shade); }
      else { p.hline(x0 - 3, x1 + 3, hy + 1, h.main); p.px(x0 - 3, hy, h.main); p.px(x1 + 3, hy, h.main); p.hline(x0 - 2, x1 + 2, hy + 2, h.shade); }
      return;
    case 'flowers':
    case 'veil': {
      if (h.style === 'veil') {
        if (view === 'up') { p.rect(8, hy + 1, 8, 13, h.main); for (let y = hy + 2; y < hy + 14; y += 3) p.hline(9, 14, y, h.shade); }
        else if (side) { p.rect(13, hy + 1, 3, 12, h.main); p.vline(15, hy + 3, hy + 12, h.shade); }
        else { p.vline(7, hy, hy + 11, h.main); p.vline(16, hy, hy + 11, h.main); p.px(7, hy + 6, h.shade); p.px(16, hy + 8, h.shade); }
      }
      const cols = h.style === 'veil' ? [P.MOON, P.FOG, P.MOON] : [P.RED, P.LANTERN, P.MOON];
      const xs = side ? [8, 10, 12, 14] : [8, 10, 12, 14, 15];
      xs.forEach((x, k) => { p.px(x, hy - 1, cols[k % 3]); p.px(x + 1, hy - 1, k % 2 ? P.FERN : P.MOSS); });
      if (!side) { p.px(x0 - 1, hy, cols[1]); p.px(x1 + 1, hy, cols[0]); }
      return;
    }
    case 'stripecap':
      p.rect(x0, hy - 2, x1 - x0 + 1, 4, h.main);
      for (let y = hy - 2; y <= hy + 1; y++) if (y % 2) p.hline(x0, x1, y, h.shade);
      p.hline(x0 + 1, x1 - 1, hy - 2, h.main);
      if (view === 'down') p.hline(x0 - 1, x1 + 1, hy + 2, h.shade);
      else if (side) p.hline(5, 10, hy + 2, h.shade);
      return;
    case 'mask':
      drawMask(p, h, view, hy);
      return;
    case 'minercap':
      // Hard-boiled leather cap with a brass lamp bracket on the front.
      p.rect(x0, hy - 2, x1 - x0 + 1, 4, h.main);
      p.hline(x0 + 1, x1 - 1, hy - 2, h.shade);
      p.hline(x0 - 1, x1 + 1, hy + 1, h.shade);
      if (view === 'down') { p.rect(11, hy - 1, 2, 2, h.accent); p.px(11, hy - 1, P.LANTERN); }
      else if (side) { p.rect(7, hy - 1, 2, 2, h.accent); p.px(7, hy - 1, P.LANTERN); }
      return;
    case 'respirator':
      // Wet-wool pad over nose and mouth, round goggles, a strap round the back.
      if (view === 'up') { p.hline(8, 15, hy + 3, P.SHADOW); p.hline(8, 15, hy + 5, h.shade); return; }
      if (side) { p.rect(7, hy + 5, 3, 3, h.main); p.px(7, hy + 7, h.shade); p.rect(8, hy + 3, 2, 2, h.accent); p.px(8, hy + 3, P.FOG); p.hline(10, 14, hy + 4, P.SHADOW); return; }
      p.rect(9, hy + 5, 6, 3, h.main); p.hline(9, 14, hy + 7, h.shade); p.px(11, hy + 6, h.shade); p.px(12, hy + 6, h.shade);
      p.hline(8, 15, hy + 4, P.SHADOW);
      p.rect(9, hy + 3, 2, 2, h.accent); p.rect(13, hy + 3, 2, 2, h.accent); p.px(9, hy + 3, P.FOG); p.px(13, hy + 3, P.FOG);
      return;
  }
}

/** A carved Fasnacht mask over the face (strap at the back), with its creature's ears or horns. */
function drawMask(p: Pen, h: HatDef, view: 'down' | 'up' | 'left', hy: number): void {
  const side = view === 'left', face = h.mask ?? 'goat';
  const m = h.main, sh = h.shade, a = h.accent;
  const krampus = face === 'krampus';
  // Ears / horns / antlers (all views).
  const tops = side ? [11] : [9, 14];
  for (const x of tops) {
    const d = x < 11 ? -1 : 1;
    if (face === 'goat') { p.px(x, hy - 1, a); p.px(x + d, hy - 2, a); p.px(x + d * 2, hy - 2, a); p.px(x + d * 2, hy - 1, a); }
    else if (face === 'owl') { p.px(x, hy - 1, m); p.px(x + d, hy - 2, sh); }
    else if (face === 'bear') { p.rect(x + (d < 0 ? -1 : 0), hy - 1, 2, 2, m); p.px(x, hy, sh); }
    else if (face === 'stag') { p.vline(x, hy - 4, hy - 1, a); p.px(x + d, hy - 3, a); p.px(x - d, hy - 5, a); p.px(x + d * 2, hy - 5, a); }
    else { p.vline(x, hy - 3, hy - 1, a); p.px(x + d, hy - 4, a); p.px(x + d, hy - 5, a); p.px(x + d * 2, hy - 6, a); }
  }
  if (view === 'up') { p.hline(8, 15, hy + 4, P.SHADOW); p.hline(8, 15, hy + 5, sh); return; }
  const x0 = side ? 7 : 8, x1 = side ? 11 : 15;
  p.rect(x0, hy + 1, x1 - x0 + 1, 7, m);
  p.hline(x0, x1, hy + 7, sh);
  if (side) p.vline(x1, hy + 2, hy + 6, sh);
  const eye = krampus ? P.RED : P.VOID;
  const eyes = side ? [9] : [10, 13];
  for (const x of eyes) {
    if (face === 'owl') { p.rect(x - 1, hy + 3, 3, 3, a); }
    p.px(x, hy + 4, eye);
  }
  if (face === 'goat') { if (side) p.rect(7, hy + 8, 2, 2, m); else { p.rect(11, hy + 8, 2, 2, m); p.px(11, hy + 6, sh); p.px(12, hy + 6, sh); } }
  else if (face === 'owl') { if (side) p.px(6, hy + 5, P.AMBER); else { p.px(11, hy + 6, P.AMBER); p.px(12, hy + 6, P.AMBER); p.px(11, hy + 7, P.AMBER); } }
  else if (face === 'bear') { if (side) { p.rect(6, hy + 5, 2, 2, sh); p.px(6, hy + 5, P.VOID); } else { p.rect(10, hy + 5, 4, 2, a); p.hline(11, 12, hy + 5, P.VOID); } }
  else if (face === 'stag') { if (side) p.px(7, hy + 6, P.VOID); else { p.hline(11, 12, hy + 6, P.VOID); p.px(9, hy + 2, a); p.px(14, hy + 2, a); } }
  else { if (side) { p.vline(7, hy + 7, hy + 9, P.RED); } else { p.vline(11, hy + 6, hy + 9, P.RED); p.px(12, hy + 9, P.RED); p.px(10, hy + 6, P.FOG); p.px(13, hy + 6, P.FOG); } }
}
