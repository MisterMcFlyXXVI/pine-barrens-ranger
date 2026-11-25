import { hex, P } from '../graphics/palette';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** GBC-style framed panel. */
export function panel(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, style: 'dark' | 'paper' = 'dark'): void {
  x = Math.round(x); y = Math.round(y);
  const [outer, inner, fill, hi] = style === 'dark'
    ? [P.VOID, P.PINE, P.SHADOW, P.FOREST]
    : [P.VOID, P.RUST, P.LANTERN, P.AMBER];
  g.fillStyle = hex(outer);
  g.fillRect(x + 1, y, w - 2, h);
  g.fillRect(x, y + 1, w, h - 2);
  g.fillStyle = hex(inner);
  g.fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle = hex(fill);
  g.fillRect(x + 2, y + 2, w - 4, h - 4);
  g.fillStyle = hex(hi);
  g.fillRect(x + 2, y + 2, w - 4, 1);
}

export function slotBox(g: CanvasRenderingContext2D, x: number, y: number, s: number, selected: boolean, t: number): void {
  g.fillStyle = hex(P.VOID);
  g.fillRect(x, y, s, s);
  g.fillStyle = hex(selected ? P.FOREST : P.PINE);
  g.fillRect(x + 1, y + 1, s - 2, s - 2);
  if (selected) {
    const c = Math.floor(t * 4) % 2 ? P.LANTERN : P.AMBER;
    g.fillStyle = hex(c);
    g.fillRect(x, y, s, 1); g.fillRect(x, y + s - 1, s, 1);
    g.fillRect(x, y, 1, s); g.fillRect(x + s - 1, y, 1, s);
  }
}

export function bar(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frac: number, color: number, back: number = P.VOID): void {
  g.fillStyle = hex(back);
  g.fillRect(x, y, w, h);
  g.fillStyle = hex(color);
  g.fillRect(x + 1, y + 1, Math.max(0, Math.round((w - 2) * Math.max(0, Math.min(1, frac)))), h - 2);
}

export function inRect(r: Rect, x: number, y: number): boolean {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}
