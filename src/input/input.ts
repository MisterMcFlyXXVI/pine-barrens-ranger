/**
 * Unified input state. Keyboard and touch both feed "holders" for each action,
 * so a key and a touch button can hold the same action without conflicting.
 */
import type { Dir } from '../util';

export type Action = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'dex' | 'bag' | 'map' | 'mute' | 'shutter' | 'tap' | 'refill';

const DIR_ACTIONS: readonly Action[] = ['up', 'down', 'left', 'right'];
const REPEAT_DELAY = 0.32;
const REPEAT_RATE = 0.085;

export interface Tap {
  x: number;
  y: number;
}

export class Input {
  private holders = new Map<Action, Set<string>>();
  private queued = new Set<Action>();
  private pressedNow = new Set<Action>();
  private repeatNow = new Set<Action>();
  private heldFor = new Map<Action, number>();
  private repeatAcc = new Map<Action, number>();
  private dirOrder: Action[] = [];

  /** Hotbar slot selections (0-8) queued from number keys / taps. */
  hotbar: number[] = [];
  /** Mouse-wheel hotbar scrolling (+1 / -1 per notch). */
  wheel = 0;
  /** Canvas taps/clicks in logical pixel coordinates. */
  taps: Tap[] = [];

  press(a: Action, src: string): void {
    let s = this.holders.get(a);
    if (!s) { s = new Set(); this.holders.set(a, s); }
    if (s.has(src)) return;
    if (s.size === 0) {
      this.queued.add(a);
      this.heldFor.set(a, 0);
      this.repeatAcc.set(a, 0);
      if (DIR_ACTIONS.includes(a)) {
        this.dirOrder = this.dirOrder.filter((d) => d !== a);
        this.dirOrder.push(a);
      }
    }
    s.add(src);
  }

  release(a: Action, src: string): void {
    const s = this.holders.get(a);
    if (!s) return;
    s.delete(src);
    if (s.size === 0) this.dirOrder = this.dirOrder.filter((d) => d !== a);
  }

  releaseAll(): void {
    this.holders.clear();
    this.dirOrder = [];
  }

  held(a: Action): boolean {
    const s = this.holders.get(a);
    return !!s && s.size > 0;
  }

  /** True on the frame an action went down. */
  pressed(a: Action): boolean {
    return this.pressedNow.has(a);
  }

  /** Pressed, or auto-repeating while held (menus). */
  repeat(a: Action): boolean {
    return this.pressedNow.has(a) || this.repeatNow.has(a);
  }

  /** Mark an action as handled so later systems this frame ignore it. */
  consume(a: Action): void {
    this.pressedNow.delete(a);
    this.repeatNow.delete(a);
  }

  /** Most recently pressed direction that is still held. */
  dir(): Dir | null {
    for (let i = this.dirOrder.length - 1; i >= 0; i--) {
      const a = this.dirOrder[i];
      if (this.held(a)) return a as Dir;
    }
    return null;
  }

  beginFrame(dt: number): void {
    this.pressedNow = new Set(this.queued);
    this.queued.clear();
    this.repeatNow.clear();
    for (const [a, s] of this.holders) {
      if (s.size === 0) continue;
      const t = (this.heldFor.get(a) ?? 0) + dt;
      this.heldFor.set(a, t);
      if (t > REPEAT_DELAY) {
        let acc = (this.repeatAcc.get(a) ?? 0) + dt;
        if (acc >= REPEAT_RATE) { acc -= REPEAT_RATE; this.repeatNow.add(a); }
        this.repeatAcc.set(a, acc);
      }
    }
  }

  endFrame(): void {
    this.hotbar.length = 0;
    this.wheel = 0;
    this.taps.length = 0;
  }
}
