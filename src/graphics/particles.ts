/**
 * Stardew-style "juice": parabolic pixel particles living on a ground plane
 * (x, y) with height z, so soil clods arc up and bounce where they land.
 */
import { hex, P } from './palette';
import type { Canv } from './canvas';
import type { Dir } from '../util';
import { DIR_VEC } from '../util';

type Kind = 'pixel' | 'puff' | 'sprite' | 'smoke' | 'spark';

interface Particle {
  kind: Kind;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  g: number;
  life: number; max: number;
  color: number;
  size: number;
  bounce: number;
  sprite?: Canv;
  spin?: number;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export class Particles {
  private list: Particle[] = [];

  private add(p: Partial<Particle> & { x: number; y: number }): void {
    if (this.list.length > 600) this.list.shift();
    this.list.push({
      kind: 'pixel', z: 0, vx: 0, vy: 0, vz: 0, g: 260, life: 0, max: 0.6,
      color: P.FOG, size: 1, bounce: 0.35, ...p,
    });
  }

  clear(): void { this.list.length = 0; }

  /** Boot dust puffs behind the player on each step. */
  dust(x: number, y: number, dir: Dir): void {
    const [dx, dy] = DIR_VEC[dir];
    for (let i = 0; i < 2; i++) {
      this.add({
        kind: 'puff', x: x + rnd(-3, 3), y: y + rnd(-1, 1), z: 1,
        vx: -dx * rnd(6, 14) + rnd(-6, 6), vy: -dy * rnd(4, 10), vz: rnd(4, 10), g: 0,
        max: rnd(0.28, 0.42), color: P.FOG, size: 1,
      });
    }
  }

  clods(x: number, y: number, colors: number[] = [P.RUST, P.CRAN, P.AMBER]): void {
    for (let i = 0; i < 9; i++) {
      this.add({
        x: x + rnd(-4, 4), y: y + rnd(-3, 3), z: 2,
        vx: rnd(-36, 36), vy: rnd(-22, 22), vz: rnd(60, 120),
        max: rnd(0.5, 0.9), color: colors[i % colors.length], size: i % 3 === 0 ? 2 : 1,
      });
    }
  }

  droplets(x: number, y: number): void {
    for (let i = 0; i < 12; i++) {
      this.add({
        x: x + rnd(-5, 5), y: y + rnd(-4, 4), z: rnd(6, 14),
        vx: rnd(-26, 26), vy: rnd(-16, 16), vz: rnd(10, 70),
        max: rnd(0.35, 0.7), color: i % 3 ? P.MIST : P.MOON, bounce: 0,
      });
    }
  }

  splash(x: number, y: number): void {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      this.add({ x, y, z: 1, vx: Math.cos(a) * 30, vy: Math.sin(a) * 18, vz: rnd(40, 80), max: 0.5, color: i % 2 ? P.MIST : P.FOG, bounce: 0 });
    }
  }

  leaves(x: number, y: number, colors: number[] = [P.FERN, P.MOSS, P.FOREST]): void {
    for (let i = 0; i < 10; i++) {
      this.add({
        x: x + rnd(-5, 5), y: y + rnd(-4, 4), z: rnd(2, 10),
        vx: rnd(-40, 40), vy: rnd(-20, 20), vz: rnd(40, 90), g: 160,
        max: rnd(0.6, 1.1), color: colors[i % colors.length], size: i % 4 === 0 ? 2 : 1, bounce: 0.1, spin: rnd(4, 9),
      });
    }
  }

  chips(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      this.add({
        x: x + rnd(-3, 3), y: y + rnd(-2, 2), z: 4,
        vx: rnd(-50, 50), vy: rnd(-25, 25), vz: rnd(50, 110),
        max: rnd(0.4, 0.8), color: [P.MIST, P.FOG, P.TWILIGHT][i % 3], size: i % 3 === 0 ? 2 : 1,
      });
    }
    this.add({ kind: 'spark', x, y, z: 6, g: 0, max: 0.12, color: P.LANTERN, size: 3 });
  }

  wood(x: number, y: number): void {
    this.clods(x, y, [P.AMBER, P.RUST, P.LANTERN]);
  }

  /** Harvested item hops out of the ground in an arc. */
  pop(x: number, y: number, sprite: Canv): void {
    this.add({ kind: 'sprite', x, y, z: 2, vx: rnd(-10, 10), vy: rnd(-4, 4), vz: 120, g: 300, max: 0.75, bounce: 0.4, sprite });
    for (let i = 0; i < 6; i++) {
      this.add({ kind: 'spark', x: x + rnd(-6, 6), y: y + rnd(-4, 4), z: rnd(4, 14), vz: rnd(10, 30), g: 0, max: rnd(0.3, 0.5), color: i % 2 ? P.LANTERN : P.FOG, size: 1 });
    }
  }

  sparkle(x: number, y: number, color: number = P.LANTERN): void {
    this.add({ kind: 'spark', x: x + rnd(-6, 6), y: y + rnd(-5, 5), z: rnd(2, 12), vz: rnd(6, 16), g: 0, max: rnd(0.4, 0.7), color, size: 1 });
  }

  smoke(x: number, y: number): void {
    this.add({ kind: 'smoke', x: x + rnd(-1, 1), y, z: 0, vx: rnd(2, 8), vz: rnd(10, 16), g: -2, max: rnd(1.8, 2.6), color: P.FOG, size: 2 });
  }

  update(dt: number): void {
    for (const p of this.list) {
      p.life += dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.vz -= p.g * dt;
      if (p.kind === 'puff' || p.kind === 'smoke') { p.vx *= 1 - dt * 2; p.vy *= 1 - dt * 2; }
      if (p.z < 0 && p.g > 0) {
        p.z = 0;
        if (p.bounce > 0 && Math.abs(p.vz) > 20) { p.vz = -p.vz * p.bounce; p.vx *= 0.5; p.vy *= 0.5; }
        else { p.vz = 0; p.vx *= 0.2; p.vy *= 0.2; }
      }
    }
    this.list = this.list.filter((p) => p.life < p.max);
  }

  draw(g: CanvasRenderingContext2D, camX: number, camY: number): void {
    for (const p of this.list) {
      const t = p.life / p.max;
      const sx = Math.round(p.x - camX), sy = Math.round(p.y - p.z - camY);
      switch (p.kind) {
        case 'sprite':
          if (p.sprite) {
            g.globalAlpha = t > 0.75 ? (1 - t) * 4 : 1;
            g.drawImage(p.sprite, sx - (p.sprite.width >> 1), sy - p.sprite.height + 4);
          }
          break;
        case 'puff': {
          g.globalAlpha = 0.75 * (1 - t);
          g.fillStyle = hex(p.color);
          const s = 1 + Math.floor(t * 3);
          g.fillRect(sx - (s >> 1), sy - (s >> 1), s, s);
          break;
        }
        case 'smoke': {
          g.globalAlpha = 0.45 * (1 - t);
          g.fillStyle = hex(t < 0.3 ? P.FOG : P.MIST);
          const s = 2 + Math.floor(t * 4);
          g.fillRect(sx - (s >> 1), sy - (s >> 1), s, s);
          break;
        }
        case 'spark':
          g.globalAlpha = 1 - t;
          g.fillStyle = hex(p.color);
          if (p.size >= 3) { g.fillRect(sx - 2, sy, 5, 1); g.fillRect(sx, sy - 2, 1, 5); }
          else g.fillRect(sx, sy, 1, 1);
          break;
        default: {
          g.globalAlpha = t > 0.8 ? (1 - t) * 5 : 1;
          g.fillStyle = hex(p.color);
          const flutter = p.spin ? Math.round(Math.sin(p.life * p.spin) * 1.5) : 0;
          g.fillRect(sx + flutter, sy, p.size, p.size);
        }
      }
    }
    g.globalAlpha = 1;
  }
}
