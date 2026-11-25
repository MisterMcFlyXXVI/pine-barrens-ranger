/** The strict 16-colour GBC Pine-Barrens palette. */
export const PALETTE = [
  '#0b1316', // 0 void black
  '#16262e', // 1 deep shadow
  '#1f3a3d', // 2 pine dark
  '#2d5a4c', // 3 forest mid
  '#4e8c68', // 4 moss light
  '#8ec488', // 5 fern highlight
  '#d8e8c8', // 6 fog white
  '#f4e4b8', // 7 lantern warm
  '#d99b52', // 8 amber / wood
  '#a65538', // 9 rust / earth
  '#6e3438', // a cranberry dark
  '#c44545', // b moth-eye red
  '#3b4d7a', // c twilight blue
  '#6b82b8', // d mist blue
  '#8c6d9c', // e eerie violet
  '#d4b4e3', // f moonlight
] as const;

export const P = {
  VOID: 0,
  SHADOW: 1,
  PINE: 2,
  FOREST: 3,
  MOSS: 4,
  FERN: 5,
  FOG: 6,
  LANTERN: 7,
  AMBER: 8,
  RUST: 9,
  CRAN: 10,
  RED: 11,
  TWILIGHT: 12,
  MIST: 13,
  VIOLET: 14,
  MOON: 15,
} as const;

export function hex(i: number): string {
  return PALETTE[i & 15];
}

const RGB_CACHE: Array<[number, number, number]> = PALETTE.map((h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
]);

export function rgbOf(i: number): [number, number, number] {
  return RGB_CACHE[i & 15];
}
