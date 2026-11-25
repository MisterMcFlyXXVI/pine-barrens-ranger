import { makeCanvas, Canv } from './canvas';
import { hex } from './palette';

/** 3x5 bitmap font, rows top→bottom, 3 bits each. */
const GLYPHS: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111101101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101101111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
  '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010',
  '8': '111101111101111', '9': '111101111001110',
  '.': '000000000000010', ',': '000000000010100', '!': '010010010000010', '?': '110001010000010',
  ':': '000010000010000', ';': '000010000010100', '-': '000000111000000', '+': '000010111010000',
  '/': '001001010100100', "'": '010010000000000', '"': '101101000000000', '(': '001010010010001',
  ')': '100010010010100', '%': '101001010100101', '>': '100010001010100', '<': '001010100010001',
  '#': '101111101111101', '&': '010101010101011', '*': '000101010101000', '=': '000111000111000',
  _: '000000000000111', '[': '011010010010011', ']': '110010010010110', '^': '010101000000000',
  '~': '000011110000000', '$': '011110010011110', '@': '010101111100011',
  // custom pictographs mapped to rarely used chars
  '{': '010111111111010', // heart / stamina
  '}': '011110111011110', // coin
  '|': '010010010010010',
};

const CHARS = Object.keys(GLYPHS);
const INDEX = new Map<string, number>(CHARS.map((c, i) => [c, i]));
const atlases = new Map<number, Canv>();

export const GLYPH_W = 4;
export const LINE_H = 7;

function atlas(color: number): Canv {
  let a = atlases.get(color);
  if (a) return a;
  const { c, g } = makeCanvas(CHARS.length * 3, 5);
  g.fillStyle = hex(color);
  CHARS.forEach((ch, i) => {
    const bits = GLYPHS[ch];
    for (let k = 0; k < 15; k++) if (bits[k] === '1') g.fillRect(i * 3 + (k % 3), Math.floor(k / 3), 1, 1);
  });
  atlases.set(color, c);
  a = c;
  return a;
}

export function textWidth(s: string, scale = 1): number {
  return s.length ? (s.length * GLYPH_W - 1) * scale : 0;
}

export function drawText(
  g: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  color: number,
  shadow?: number,
  scale = 1,
): void {
  if (shadow !== undefined) drawText(g, s, x + scale, y + scale, shadow, undefined, scale);
  const at = atlas(color);
  const up = s.toUpperCase();
  x = Math.round(x); y = Math.round(y);
  for (let i = 0; i < up.length; i++) {
    const ch = up[i];
    if (ch === ' ') continue;
    const idx = INDEX.get(ch) ?? INDEX.get('?')!;
    g.drawImage(at, idx * 3, 0, 3, 5, x + i * GLYPH_W * scale, y, 3 * scale, 5 * scale);
  }
}

export function drawTextCentered(
  g: CanvasRenderingContext2D,
  s: string,
  cx: number,
  y: number,
  color: number,
  shadow?: number,
  scale = 1,
): void {
  drawText(g, s, Math.round(cx - textWidth(s, scale) / 2), y, color, shadow, scale);
}

export function drawTextRight(
  g: CanvasRenderingContext2D,
  s: string,
  rx: number,
  y: number,
  color: number,
  shadow?: number,
): void {
  drawText(g, s, rx - textWidth(s), y, color, shadow);
}

/** Greedy word-wrap to a pixel width. Supports '\n'. */
export function wrapText(s: string, maxW: number): string[] {
  const maxChars = Math.max(4, Math.floor((maxW + 1) / GLYPH_W));
  const out: string[] = [];
  for (const para of s.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      if (!line.length) line = word;
      else if ((line + ' ' + word).length <= maxChars) line += ' ' + word;
      else { out.push(line); line = word; }
      while (line.length > maxChars) { out.push(line.slice(0, maxChars)); line = line.slice(maxChars); }
    }
    out.push(line);
  }
  return out;
}
