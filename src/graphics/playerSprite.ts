/**
 * Modular 24x24 player renderer: body layer + outfit layer + hat layer,
 * baked lazily per (outfit, hat, direction, frame, pose) and cached.
 */
import { makeCanvas, Pen, flipH, outline, Canv } from './canvas';
import { P } from './palette';
import type { Dir } from '../util';
import { outfitById, hatById, OutfitDef, HatDef } from '../data/outfits';

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
  p.rect(9, 17, 3, 3 - liftL, PANTS); p.vline(11, 17, 19 - liftL, PANTS_SH);
  p.rect(12, 17, 3, 3 - liftR, PANTS); p.vline(12, 17, 19 - liftR, PANTS_SH);
  p.rect(9, 20 - liftL, 3, 2, BOOT); p.hline(9, 11, 21 - liftL, SOLE);
  p.rect(12, 20 - liftR, 3, 2, BOOT); p.hline(12, 14, 21 - liftR, SOLE);

  // Torso (outfit layer)
  const torsoBottom = o.style === 'slicker' ? 18 : 16;
  for (let y = 11; y <= torsoBottom; y++) {
    for (let x = 8; x <= 15; x++) {
      if (BUILD === 'b' && (x === 8 || x === 15) && y >= 13 && y <= 15 && o.style !== 'cloak' && o.style !== 'mantle') continue;
      p.px(x, y + (y <= 16 ? oy : 0), outfitColor(o, x, y, back, 'body', cx));
    }
  }
  if (o.style === 'cloak' && back) { p.rect(7, 11 + oy, 10, 10, o.main); p.vline(7, 11 + oy, 20, o.trim); p.vline(16, 11 + oy, 20, o.trim); }
  if (o.style === 'mantle') { p.hline(7, 16, 11 + oy, o.shade); p.hline(6, 17, 12 + oy, o.trim); }

  // Arms
  if (pose === 'act') {
    if (back) {
      p.rect(7, 11 + oy, 1, 3, outfitColor(o, 7, 12, back, 'sleeve', cx));
      p.rect(16, 11 + oy, 1, 3, outfitColor(o, 16, 12, back, 'sleeve', cx));
    } else {
      p.rect(8, 12 + oy, 1, 3, outfitColor(o, 8, 12, back, 'sleeve', cx));
      p.rect(15, 12 + oy, 1, 3, outfitColor(o, 15, 12, back, 'sleeve', cx));
      p.rect(9, 15 + oy, 2, 1, SKIN); p.rect(13, 15 + oy, 2, 1, SKIN);
    }
  } else {
    const swL = frame === 1 ? 1 : frame === 2 ? -1 : 0;
    const swR = -swL;
    p.rect(7, 11 + oy, 1, 5 + swL, outfitColor(o, 7, 12, back, 'sleeve', cx));
    p.px(7, 16 + oy + swL, SKIN);
    p.rect(16, 11 + oy, 1, 5 + swR, outfitColor(o, 16, 12, back, 'sleeve', cx));
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
    p.rect(10, 17, 4, 3, PANTS); p.vline(12, 17, 19, PANTS_SH);
    p.rect(9, 20, 5, 2, BOOT); p.hline(9, 13, 21, SOLE);
  } else if (frame === 1) {
    p.rect(12, 17, 3, 2, PANTS_SH); p.rect(12, 19, 4, 2, BOOT); p.hline(12, 15, 20, SOLE);
    p.rect(8, 17, 3, 3, PANTS); p.rect(7, 20, 4, 2, BOOT); p.hline(7, 10, 21, SOLE);
  } else {
    p.rect(8, 17, 3, 2, PANTS_SH); p.rect(7, 19, 4, 2, BOOT); p.hline(7, 10, 20, SOLE);
    p.rect(12, 17, 3, 3, PANTS); p.rect(12, 20, 4, 2, BOOT); p.hline(12, 15, 21, SOLE);
  }

  // Torso
  const torsoBottom = o.style === 'slicker' ? 18 : 16;
  for (let y = 11; y <= torsoBottom; y++) {
    for (let x = 9; x <= 14; x++) {
      if (BUILD === 'b' && x === 14 && y >= 13 && y <= 15) continue;
      p.px(x, y + (y <= 16 ? oy : 0), outfitColor(o, x, y, false, 'body', cx));
    }
  }
  if (o.style === 'mantle') { p.hline(8, 15, 11 + oy, o.shade); p.hline(8, 15, 12 + oy, o.trim); }

  // Arm
  const sleeve = outfitColor(o, 11, 12, false, 'sleeve', cx);
  if (pose === 'act') {
    p.rect(7, 13 + oy, 5, 2, sleeve);
    p.rect(6, 13 + oy, 1, 2, SKIN);
  } else {
    const ax = frame === 1 ? 10 : frame === 2 ? 12 : 11;
    p.rect(ax, 11 + oy, 2, 5, sleeve);
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
    case 'mask':
      drawMask(p, h, view, hy);
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
