/** Procedural weather: rain streaks, drifting fog banks, snow, storm tint + lightning. */
import type { Weather } from '../data/weather';
import { hex, rgbOf, P } from './palette';

export class WeatherFx {
  private flash = 0;
  private boltT = 5;
  private thunderIn = -1;

  /** Returns true on the frame thunder should sound. */
  update(dt: number, w: Weather, outdoors: boolean): boolean {
    this.flash = Math.max(0, this.flash - dt * 2.2);
    let thunder = false;
    if (this.thunderIn > 0) { this.thunderIn -= dt; if (this.thunderIn <= 0) { thunder = true; this.thunderIn = -1; } }
    if (w === 'STORM') {
      this.boltT -= dt;
      if (this.boltT <= 0) {
        this.boltT = 4 + Math.random() * 9;
        if (outdoors) this.flash = 1;
        this.thunderIn = 0.25 + Math.random() * 0.9;
      }
    }
    return thunder;
  }

  get lightning(): number { return this.flash; }

  drawTint(g: CanvasRenderingContext2D, W: number, H: number, w: Weather): void {
    const tint: Partial<Record<Weather, [number, number]>> = {
      RAIN: [P.TWILIGHT, 0.16], STORM: [P.SHADOW, 0.3], FOG: [P.FOG, 0.14], SNOW: [P.FOG, 0.1],
    };
    const t = tint[w];
    if (!t) return;
    const [r, gg, b] = rgbOf(t[0]);
    g.fillStyle = `rgba(${r},${gg},${b},${t[1]})`;
    g.fillRect(0, 0, W, H);
  }

  drawParticles(g: CanvasRenderingContext2D, W: number, H: number, w: Weather, time: number, camX: number, camY: number): void {
    const mod = (a: number, m: number) => ((a % m) + m) % m;
    if (w === 'RAIN' || w === 'STORM') {
      const n = w === 'STORM' ? 190 : 120;
      for (let i = 0; i < n; i++) {
        const x = Math.floor(mod(i * 97 - camX + time * (w === 'STORM' ? 90 : 40), W + 20) - 10);
        const y = Math.floor(mod(i * 61 - camY + time * 320 + i * 13, H + 20) - 10);
        g.globalAlpha = 0.85;
        g.fillStyle = hex(i % 3 ? P.MIST : P.FOG);
        g.fillRect(x, y, 1, 6);
        g.fillRect(x - 1, y + 6, 1, 2);
      }
      g.globalAlpha = 0.6;
      g.fillStyle = hex(P.FOG);
      for (let i = 0; i < n / 5; i++) {
        const x = mod(i * 131 - camX + Math.floor(time * 7) * 17, W), y = mod(i * 89 - camY + Math.floor(time * 7) * 29, H);
        g.fillRect(Math.floor(x) - 1, Math.floor(y), 3, 1);
      }
      g.globalAlpha = 1;
    } else if (w === 'SNOW') {
      g.fillStyle = hex(P.FOG);
      for (let i = 0; i < 70; i++) {
        const x = mod(i * 83 - camX + Math.sin(time * 1.3 + i) * 8, W);
        const y = mod(i * 47 - camY + time * 22 + i * 7, H);
        g.fillRect(Math.floor(x), Math.floor(y), i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
      }
    } else if (w === 'FOG') {
      g.fillStyle = hex(P.FOG);
      for (let i = 0; i < 8; i++) {
        const y = Math.floor(mod(i * 37 - camY * 0.6, H + 30) - 15);
        const x = Math.floor(mod(time * (5 + i * 2) - camX * 0.6 + i * 90, W + 180) - 180);
        // tapered, layered wisp
        const layers: Array<[number, number, number]> = [[0, 170, 4], [16, 138, 8], [36, 98, 12]];
        for (const [inset, len, hgt] of layers) {
          g.globalAlpha = 0.055;
          g.fillRect(x + inset, y - (hgt >> 1), len, hgt);
          g.fillRect(x + inset - W - 180, y - (hgt >> 1), len, hgt);
        }
      }
      g.globalAlpha = 1;
    }
  }

  drawFlash(g: CanvasRenderingContext2D, W: number, H: number): void {
    if (this.flash <= 0) return;
    g.globalAlpha = Math.min(0.75, this.flash * 0.75);
    g.fillStyle = hex(P.FOG);
    g.fillRect(0, 0, W, H);
    g.globalAlpha = 1;
  }
}
