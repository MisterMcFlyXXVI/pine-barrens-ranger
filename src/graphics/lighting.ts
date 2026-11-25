/**
 * Day / dusk / night / witching-hour tint with stepped light-radius cutouts
 * for the player's lantern, lamp posts, windows and the hearth.
 */
import { makeCanvas, Canv } from './canvas';
import { rgbOf, P } from './palette';

export interface Light {
  x: number;
  y: number;
  r: number;
  flicker?: boolean;
}

interface Key {
  m: number;
  c: [number, number, number];
  a: number;
}

const rgb = (i: number): [number, number, number] => rgbOf(i);

/** Keyframes by minute-of-day (360 = 6:00 AM, 1560 = 2:00 AM next day). */
const KEYS: Key[] = [
  { m: 360, c: rgb(P.TWILIGHT), a: 0.42 },
  { m: 430, c: rgb(P.MOON), a: 0.08 },
  { m: 480, c: rgb(P.LANTERN), a: 0 },
  { m: 1000, c: rgb(P.LANTERN), a: 0 },
  { m: 1080, c: rgb(P.AMBER), a: 0.16 },
  { m: 1150, c: rgb(P.VIOLET), a: 0.3 },
  { m: 1220, c: rgb(P.TWILIGHT), a: 0.6 },
  { m: 1440, c: rgb(P.SHADOW), a: 0.72 },
  { m: 1560, c: rgb(P.VOID), a: 0.82 },
];

export function ambientAt(minutes: number): { c: [number, number, number]; a: number } {
  if (minutes <= KEYS[0].m) return KEYS[0];
  for (let i = 1; i < KEYS.length; i++) {
    const k1 = KEYS[i];
    if (minutes <= k1.m) {
      const k0 = KEYS[i - 1];
      const t = (minutes - k0.m) / (k1.m - k0.m);
      return {
        c: [0, 1, 2].map((j) => Math.round(k0.c[j] + (k1.c[j] - k0.c[j]) * t)) as [number, number, number],
        a: k0.a + (k1.a - k0.a) * t,
      };
    }
  }
  return KEYS[KEYS.length - 1];
}

export class Lighting {
  private layer: Canv;
  private g: CanvasRenderingContext2D;

  constructor() {
    const { c, g } = makeCanvas(16, 16);
    this.layer = c;
    this.g = g;
  }

  render(target: CanvasRenderingContext2D, w: number, h: number, minutes: number, indoor: boolean, lights: Light[], time: number): void {
    const amb = ambientAt(minutes);
    let alpha = amb.a;
    if (indoor) alpha = Math.min(0.5, alpha * 0.6);
    if (alpha < 0.01) return;
    if (this.layer.width !== w || this.layer.height !== h) {
      this.layer.width = w;
      this.layer.height = h;
      this.g.imageSmoothingEnabled = false;
    }
    const g = this.g;
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, w, h);
    g.fillStyle = `rgba(${amb.c[0]},${amb.c[1]},${amb.c[2]},${alpha.toFixed(3)})`;
    g.fillRect(0, 0, w, h);

    // Lights only bite once it is properly dark.
    const strength = Math.min(1, Math.max(0, (alpha - 0.12) / 0.35));
    if (strength > 0) {
      g.globalCompositeOperation = 'destination-out';
      for (const L of lights) {
        const fl = L.flicker ? Math.sin(time * 9 + L.x) * 0.6 + Math.sin(time * 23 + L.y) * 0.4 : 0;
        const r = L.r + fl;
        const rings = 4;
        for (let k = 0; k < rings; k++) {
          const rr = Math.max(1, Math.round(r * (1 - k * 0.2)));
          g.fillStyle = `rgba(0,0,0,${(0.3 * strength).toFixed(3)})`;
          g.beginPath();
          g.arc(Math.round(L.x), Math.round(L.y), rr, 0, Math.PI * 2);
          g.fill();
        }
      }
      // Warm lantern glow tint inside the radius
      g.globalCompositeOperation = 'source-over';
      const [lr, lg, lb] = rgbOf(P.LANTERN);
      for (const L of lights) {
        g.fillStyle = `rgba(${lr},${lg},${lb},${(0.09 * strength).toFixed(3)})`;
        g.beginPath();
        g.arc(Math.round(L.x), Math.round(L.y), Math.round(L.r * 0.55), 0, Math.PI * 2);
        g.fill();
      }
    }
    target.drawImage(this.layer, 0, 0);
  }
}
