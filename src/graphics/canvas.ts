import { hex, P, rgbOf } from './palette';

export type Canv = HTMLCanvasElement;

export function makeCanvas(w: number, h: number): { c: Canv; g: CanvasRenderingContext2D } {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  const g = c.getContext('2d');
  if (!g) throw new Error('Canvas 2D is not supported on this device.');
  g.imageSmoothingEnabled = false;
  return { c, g };
}

/** Tiny pixel pen that only ever paints palette colours on whole pixels. */
export class Pen {
  constructor(readonly g: CanvasRenderingContext2D) {}

  px(x: number, y: number, c: number): void {
    this.g.fillStyle = hex(c);
    this.g.fillRect(Math.floor(x), Math.floor(y), 1, 1);
  }

  rect(x: number, y: number, w: number, h: number, c: number): void {
    if (w <= 0 || h <= 0) return;
    this.g.fillStyle = hex(c);
    this.g.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
  }

  hline(x0: number, x1: number, y: number, c: number): void {
    const a = Math.min(x0, x1), b = Math.max(x0, x1);
    this.rect(a, y, b - a + 1, 1, c);
  }

  vline(x: number, y0: number, y1: number, c: number): void {
    const a = Math.min(y0, y1), b = Math.max(y0, y1);
    this.rect(x, a, 1, b - a + 1, c);
  }

  line(x0: number, y0: number, x1: number, y1: number, c: number): void {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let guard = 0; guard < 512; guard++) {
      this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: number): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny <= 1) this.px(x, y, c);
      }
    }
  }

  /** Paint a shape given by an inside-test, colouring each pixel (edge = touches outside). */
  blob(
    w: number,
    h: number,
    inside: (x: number, y: number) => boolean,
    color: (x: number, y: number, edge: boolean) => number | null,
  ): void {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!inside(x, y)) continue;
        const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
        const c = color(x, y, edge);
        if (c !== null) this.px(x, y, c);
      }
    }
  }
}

/**
 * Bake ASCII pixel art. Each char is a hex palette index (0-f); '.' or ' ' are transparent.
 * `map` can remap letters (e.g. X/Y placeholders) to palette indices.
 */
export function fromArt(rows: readonly string[], map: Record<string, number> = {}, w?: number, h?: number): Canv {
  const aw = Math.max(...rows.map((r) => r.length));
  const ah = rows.length;
  const W = w ?? aw, H = h ?? ah;
  const ox = Math.floor((W - aw) / 2), oy = Math.floor((H - ah) / 2);
  const { c, g } = makeCanvas(W, H);
  const p = new Pen(g);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const idx = ch in map ? map[ch] : parseInt(ch, 16);
      if (!Number.isNaN(idx)) p.px(x + ox, y + oy, idx);
    }
  });
  return c;
}

export function flipH(src: Canv): Canv {
  const { c, g } = makeCanvas(src.width, src.height);
  g.translate(src.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return c;
}

/** Adds a 1px void-black outline around every opaque region (GBC sprite look). */
export function outline(src: Canv, color: number = P.VOID): Canv {
  const w = src.width, h = src.height;
  const sg = src.getContext('2d');
  if (!sg) return src;
  const data = sg.getImageData(0, 0, w, h);
  const a = data.data;
  const out = sg.createImageData(w, h);
  out.data.set(a);
  const [r, gg, b] = rgbOf(color);
  const opaque = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && a[(y * w + x) * 4 + 3] > 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (opaque(x, y)) continue;
      if (opaque(x - 1, y) || opaque(x + 1, y) || opaque(x, y - 1) || opaque(x, y + 1)) {
        const i = (y * w + x) * 4;
        out.data[i] = r; out.data[i + 1] = gg; out.data[i + 2] = b; out.data[i + 3] = 255;
      }
    }
  }
  sg.putImageData(out, 0, 0);
  return src;
}

/** Replace palette colours in an existing sprite (used for rare-variant swaps & recolours). */
export function recolor(src: Canv, swaps: Array<[number, number]>): Canv {
  const { c, g } = makeCanvas(src.width, src.height);
  g.drawImage(src, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height);
  const pairs = swaps.map(([from, to]) => [rgbOf(from), rgbOf(to)] as const);
  for (let i = 0; i < d.data.length; i += 4) {
    if (d.data[i + 3] === 0) continue;
    for (const [f, t] of pairs) {
      if (d.data[i] === f[0] && d.data[i + 1] === f[1] && d.data[i + 2] === f[2]) {
        d.data[i] = t[0]; d.data[i + 1] = t[1]; d.data[i + 2] = t[2];
        break;
      }
    }
  }
  g.putImageData(d, 0, 0);
  return c;
}
