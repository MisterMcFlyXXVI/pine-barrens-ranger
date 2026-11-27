/** 16x16 cabin companions: hound pup, tuxedo cat, raven. Frames: walk0, walk1, sit, sleep (+ raven fly). */
import { makeCanvas, Pen, outline, flipH } from './canvas';
import type { Canv } from './canvas';
import { P } from './palette';
import type { PetKind } from '../data/pets';

export type PetPose = 'walk0' | 'walk1' | 'sit' | 'sleep' | 'fly0' | 'fly1';

const cache = new Map<string, Canv>();

function art(draw: (p: Pen) => void): Canv {
  const { c, g } = makeCanvas(16, 16);
  draw(new Pen(g));
  return outline(c);
}

function pup(pose: PetPose): Canv {
  return art((p) => {
    const A = P.AMBER, R = P.RUST, C = P.CRAN, L = P.LANTERN;
    if (pose === 'sleep') {
      p.rect(3, 10, 10, 4, A); p.rect(2, 11, 3, 3, A); p.hline(3, 12, 13, R); p.rect(3, 10, 3, 2, R); // curled body, ear
      p.px(4, 12, P.VOID); p.px(12, 11, R); return;
    }
    if (pose === 'sit') {
      p.rect(6, 7, 5, 7, A); p.rect(5, 12, 7, 2, A); p.vline(10, 8, 13, R); // body
      p.rect(4, 3, 6, 5, A); p.rect(3, 5, 2, 4, R); p.rect(9, 5, 2, 4, R); // head, ears
      p.px(5, 5, P.VOID); p.px(8, 5, P.VOID); p.rect(6, 6, 2, 2, L); p.px(6, 7, P.VOID); // eyes, muzzle, nose
      p.px(11, 12, A); p.px(12, 11, A); return; // tail
    }
    const f = pose === 'walk1' ? 1 : 0;
    p.rect(4, 8, 9, 4, A); p.hline(4, 12, 11, R); // body
    for (const [x, d] of [[5, f], [7, 1 - f], [10, f], [12, 1 - f]] as Array<[number, number]>) p.rect(x, 12, 1, 2 - d, R);
    p.rect(1, 5, 5, 5, A); p.rect(2, 7, 2, 4, R); // head, floppy ear
    p.px(2, 6, P.VOID); p.rect(0, 8, 2, 2, L); p.px(0, 8, P.VOID); // eye, muzzle
    p.px(13, 7 + f, A); p.px(14, 6 + f, A); // wagging tail
    p.px(1, 4, C);
  });
}

function cat(pose: PetPose): Canv {
  return art((p) => {
    const K = P.VOID, S = P.SHADOW, W = P.FOG;
    if (pose === 'sleep') {
      p.rect(4, 10, 9, 4, S); p.rect(4, 12, 4, 2, W); p.rect(3, 10, 3, 3, S); p.px(3, 10, K); p.px(5, 10, K); // loaf
      p.hline(9, 13, 13, S); p.px(13, 12, S); return;
    }
    if (pose === 'sit') {
      p.rect(6, 8, 5, 6, S); p.rect(7, 9, 3, 5, W); // body + white bib
      p.rect(5, 3, 6, 5, S); p.px(5, 2, S); p.px(10, 2, S); // head + ears
      p.rect(7, 6, 2, 2, W); p.px(6, 5, P.FERN); p.px(9, 5, P.FERN); // muzzle, green eyes
      p.rect(6, 13, 2, 1, W); p.rect(9, 13, 2, 1, W); // white boots
      p.vline(12, 9, 13, S); p.px(13, 8, S); return;
    }
    const f = pose === 'walk1' ? 1 : 0;
    p.rect(4, 8, 8, 4, S); p.rect(5, 10, 4, 2, W); // body + belly
    for (const [x, d] of [[5, f], [6, 1 - f], [10, f], [11, 1 - f]] as Array<[number, number]>) { p.rect(x, 12, 1, 2 - d, S); p.px(x, 13 - d, W); }
    p.rect(1, 5, 5, 4, S); p.px(1, 4, S); p.px(4, 4, S); p.rect(1, 7, 3, 2, W); p.px(2, 6, P.FERN); // head
    p.vline(12, 4 + f, 8, S); p.px(13, 4 + f, S); // tail up
  });
}

function raven(pose: PetPose): Canv {
  return art((p) => {
    const K = P.VOID, S = P.SHADOW, T = P.TWILIGHT;
    if (pose === 'sleep') { p.rect(5, 9, 7, 5, K); p.hline(6, 11, 10, S); p.rect(3, 9, 3, 3, K); p.px(2, 10, P.MIST); return; }
    if (pose === 'fly0' || pose === 'fly1') {
      const up = pose === 'fly0';
      p.rect(5, 7, 7, 3, K); p.rect(2, 7, 3, 2, K); p.px(1, 8, P.MIST); p.px(3, 7, P.LANTERN); // body, head, beak, eye
      if (up) { p.line(6, 7, 3, 2, K); p.line(8, 7, 7, 2, K); p.line(9, 7, 12, 3, T); }
      else { p.line(6, 9, 3, 13, K); p.line(8, 9, 8, 14, K); p.line(9, 9, 12, 12, T); }
      p.rect(12, 8, 3, 1, K); return;
    }
    // perched / hopping
    const hop = pose === 'walk1' ? 1 : 0;
    p.rect(6, 6 - hop, 5, 6, K); p.hline(7, 10, 7 - hop, S); p.vline(10, 7 - hop, 11 - hop, T); // body, wing sheen
    p.rect(4, 4 - hop, 4, 3, K); p.px(3, 5 - hop, P.MIST); p.px(2, 5 - hop, P.MIST); p.px(5, 5 - hop, P.LANTERN); // head, beak, eye
    p.rect(11, 10 - hop, 3, 2, K); // tail
    p.px(7, 12 - hop, P.AMBER); p.px(9, 12 - hop, P.AMBER); p.px(7, 13 - hop, P.AMBER); p.px(9, 13 - hop, P.AMBER); // legs
  });
}

/** Sprite facing left by default; `right` mirrors it. */
export function petFrame(kind: PetKind, pose: PetPose, right: boolean): Canv {
  const key = `${kind}:${pose}:${right ? 1 : 0}`;
  let c = cache.get(key);
  if (c) return c;
  const base = kind === 'pup' ? pup(pose) : kind === 'cat' ? cat(pose) : raven(pose);
  c = right ? flipH(base) : base;
  cache.set(key, c);
  return c;
}

/** Little heart emote over a petted companion. */
export function heartIcon(): Canv {
  const k = 'heart';
  let c = cache.get(k);
  if (c) return c;
  const { c: cv, g } = makeCanvas(7, 6);
  const p = new Pen(g);
  p.rect(1, 0, 2, 1, P.RED); p.rect(4, 0, 2, 1, P.RED); p.rect(0, 1, 7, 2, P.RED); p.rect(1, 3, 5, 1, P.RED); p.rect(2, 4, 3, 1, P.RED); p.px(3, 5, P.RED); p.px(1, 1, P.LANTERN);
  c = cv; cache.set(k, c);
  return c;
}
