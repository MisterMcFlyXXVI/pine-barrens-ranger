/** Grid-based player with smooth tile interpolation (GBC-style) and tool actions. */
import type { Dir } from '../util';
import type { ToolKind } from '../data/items';

export const TOOL_DURATION = 0.33;
export const WALK_STEP = 0.2;
export const RUN_STEP = 0.125;

export interface ToolAction {
  tool: ToolKind;
  t: number;
  applied: boolean;
  tx: number;
  ty: number;
}

export class Player {
  tx = 0;
  ty = 0;
  /** Pixel position of the tile-aligned top-left corner. */
  x = 0;
  y = 0;
  dir: Dir = 'down';
  moving = false;
  private fromX = 0;
  private fromY = 0;
  private toX = 0;
  private toY = 0;
  private t = 0;
  stepTime = WALK_STEP;
  private stepParity = 0;
  /** Time a direction has been held while idle (Pokémon-style turn-in-place). */
  turnHold = 0;
  /** Player was walking last frame (lets held movement continue without a turn pause). */
  chain = false;
  /** Whether the last step was a run (deer hear you coming). */
  running = false;
  action: ToolAction | null = null;
  /** Small "bump into wall" cooldown. */
  bumpCd = 0;

  place(tx: number, ty: number, dir: Dir): void {
    this.tx = tx; this.ty = ty;
    this.x = tx * 16; this.y = ty * 16;
    this.dir = dir;
    this.moving = false;
    this.action = null;
    this.chain = false;
  }

  beginStep(nx: number, ny: number, run: boolean, terrain = 1): void {
    this.fromX = this.tx * 16; this.fromY = this.ty * 16;
    this.toX = nx * 16; this.toY = ny * 16;
    this.tx = nx; this.ty = ny;
    this.t = 0;
    this.moving = true;
    this.stepTime = (run ? RUN_STEP : WALK_STEP) * terrain;
    this.running = run;
    this.stepParity ^= 1;
  }

  /** Advance interpolation. Returns true on the frame the step completes. */
  advance(dt: number): boolean {
    if (!this.moving) return false;
    this.t += dt / this.stepTime;
    if (this.t >= 1) {
      this.t = 1;
      this.x = this.toX; this.y = this.toY;
      this.moving = false;
      return true;
    }
    this.x = this.fromX + (this.toX - this.fromX) * this.t;
    this.y = this.fromY + (this.toY - this.fromY) * this.t;
    return false;
  }

  /** 3-frame walk cycle: 0 stand, 1 left-step, 2 right-step. */
  get frame(): number {
    if (!this.moving) return 0;
    return this.t < 0.55 ? (this.stepParity ? 1 : 2) : 0;
  }

  /** 0..2 swing frame while a tool action plays. */
  get actionFrame(): number {
    if (!this.action) return 0;
    return Math.min(2, Math.floor((this.action.t / TOOL_DURATION) * 3));
  }

  facing(): [number, number] {
    switch (this.dir) {
      case 'down': return [this.tx, this.ty + 1];
      case 'up': return [this.tx, this.ty - 1];
      case 'left': return [this.tx - 1, this.ty];
      case 'right': return [this.tx + 1, this.ty];
    }
  }
}
