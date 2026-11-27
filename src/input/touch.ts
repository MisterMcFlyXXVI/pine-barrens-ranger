/**
 * Mobile handheld shell: Pointer-Event D-pad (thumb-slide + deadzone),
 * angled A/B buttons, DEX/BAG pills, PAD toggle, and canvas tap support.
 */
import type { Action, Input } from './input';
import type { Dir } from '../util';

const PREF_KEY = 'pbr_touch';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, parent: HTMLElement, text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  if (text) e.textContent = text;
  parent.appendChild(e);
  return e;
}

function buzz(ms = 8): void {
  try { navigator.vibrate?.(ms); } catch { /* unsupported */ }
}

export class TouchControls {
  enabled = false;
  private dpadDirs = new Map<number, Dir | null>();
  private arms = new Map<Dir, HTMLElement>();
  private dpad!: HTMLElement;

  constructor(
    private readonly deck: HTMLElement,
    private readonly toggleBtn: HTMLElement,
    private readonly input: Input,
    private readonly onGesture: () => void,
    private readonly onLayout: () => void,
  ) {
    this.build();
    let pref: string | null = null;
    try { pref = localStorage.getItem(PREF_KEY); } catch { /* ignore */ }
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    this.setEnabled(pref === null ? coarse : pref === '1', false);

    const toggle = (e: Event) => {
      e.preventDefault();
      this.onGesture();
      this.setEnabled(!this.enabled, true);
    };
    this.toggleBtn.addEventListener('pointerdown', toggle);

    // Block iOS pinch-zoom, double-tap zoom, pull-to-refresh, long-press callouts.
    const stop = (e: Event) => { if (e.cancelable) e.preventDefault(); };
    document.addEventListener('gesturestart', stop);
    document.addEventListener('gesturechange', stop);
    document.addEventListener('dblclick', stop);
    document.addEventListener('contextmenu', stop);
    // ...but let the account panel scroll.
    document.addEventListener('touchmove', (e) => { if (!(e.target instanceof Element && e.target.closest('.acct'))) stop(e); }, { passive: false });
    this.deck.addEventListener('touchstart', stop, { passive: false });
  }

  setEnabled(on: boolean, remember: boolean): void {
    this.enabled = on;
    document.body.classList.toggle('touch-on', on);
    this.toggleBtn.classList.toggle('on', on);
    this.deck.setAttribute('aria-hidden', on ? 'false' : 'true');
    if (!on) this.releaseAll();
    if (remember) { try { localStorage.setItem(PREF_KEY, on ? '1' : '0'); } catch { /* ignore */ } }
    this.onLayout();
  }

  private releaseAll(): void {
    for (const id of [...this.dpadDirs.keys()]) this.setDpad(id, null);
    this.dpadDirs.clear();
    this.dpad.classList.remove('engaged');
    for (const arm of this.arms.values()) arm.classList.remove('active');
    this.input.releaseAll();
  }

  private build(): void {
    const d = this.deck;
    el('div', 'deck-label', d, 'PINE HOLLER RANGER');
    el('div', 'grille', d);

    // ---- D-pad ----
    const dpad = el('div', 'ctl dpad', d);
    this.dpad = dpad;
    const arms: Array<[Dir, string, string]> = [['up', 'v up', '▲'], ['down', 'v down', '▼'], ['left', 'h left', '◀'], ['right', 'h right', '▶']];
    for (const [dir, cls, glyph] of arms) this.arms.set(dir, el('div', `arm ${cls}`, dpad, glyph));
    el('div', 'hub', dpad);

    const dirFrom = (e: PointerEvent, prev: Dir | null): Dir | null => {
      const r = dpad.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy);
      if (dist < r.width * 0.12) return null; // centre deadzone
      const horiz = Math.abs(dx) > Math.abs(dy);
      // Hysteresis near diagonals so the thumb doesn't flicker between directions.
      if (prev) {
        const ang = Math.atan2(Math.abs(dy), Math.abs(dx)) * (180 / Math.PI);
        const prevHoriz = prev === 'left' || prev === 'right';
        if (prevHoriz && ang < 55 && Math.sign(dx) === (prev === 'right' ? 1 : -1)) return prev;
        if (!prevHoriz && ang > 35 && Math.sign(dy) === (prev === 'down' ? 1 : -1)) return prev;
      }
      if (horiz) return dx > 0 ? 'right' : 'left';
      return dy > 0 ? 'down' : 'up';
    };

    dpad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.onGesture();
      dpad.setPointerCapture(e.pointerId);
      dpad.classList.add('engaged');
      this.setDpad(e.pointerId, dirFrom(e, null));
    });
    dpad.addEventListener('pointermove', (e) => {
      if (!this.dpadDirs.has(e.pointerId)) return;
      e.preventDefault();
      this.setDpad(e.pointerId, dirFrom(e, this.dpadDirs.get(e.pointerId) ?? null));
    });
    const end = (e: PointerEvent) => {
      if (!this.dpadDirs.has(e.pointerId)) return;
      this.setDpad(e.pointerId, null);
      this.dpadDirs.delete(e.pointerId);
      if (this.dpadDirs.size === 0) dpad.classList.remove('engaged');
    };
    dpad.addEventListener('pointerup', end);
    dpad.addEventListener('pointercancel', end);
    dpad.addEventListener('lostpointercapture', end);

    // ---- A / B ----
    const a = el('div', 'ctl btn a', d, 'A');
    el('small', '', a, 'USE');
    const b = el('div', 'ctl btn b', d, 'B');
    el('small', '', b, 'RUN');
    this.bindButton(a, 'a');
    this.bindButton(b, 'b');

    // ---- Pills ----
    const pills = el('div', 'ctl pills', d);
    this.bindButton(el('div', 'pill', pills, 'DEX'), 'dex');
    this.bindButton(el('div', 'pill', pills, 'BAG'), 'bag');
    this.bindButton(el('div', 'pill', pills, 'MAP'), 'map');
    // Underground only (body.in-mine): headlamp shutter and the Sounding Bar.
    this.bindButton(el('div', 'pill mine-only', pills, 'SHUT'), 'shutter');
    this.bindButton(el('div', 'pill mine-only', pills, 'TAP'), 'tap');
  }

  /** Track a D-pad pointer; `null` = engaged but resting in the centre deadzone. */
  private setDpad(pointerId: number, dir: Dir | null): void {
    const prev = this.dpadDirs.get(pointerId) ?? null;
    if (prev !== dir) {
      if (prev) { this.input.release(prev, `t:dpad:${pointerId}`); this.arms.get(prev)?.classList.remove('active'); }
      if (dir) { this.input.press(dir, `t:dpad:${pointerId}`); this.arms.get(dir)?.classList.add('active'); buzz(5); }
    }
    this.dpadDirs.set(pointerId, dir);
    this.dpad.classList.add('engaged');
  }

  private bindButton(node: HTMLElement, action: Action): void {
    const active = new Set<number>();
    node.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.onGesture();
      node.setPointerCapture(e.pointerId);
      active.add(e.pointerId);
      node.classList.add('down');
      this.input.press(action, `t:${action}:${e.pointerId}`);
      buzz(10);
    });
    const up = (e: PointerEvent) => {
      if (!active.has(e.pointerId)) return;
      active.delete(e.pointerId);
      this.input.release(action, `t:${action}:${e.pointerId}`);
      if (active.size === 0) node.classList.remove('down');
    };
    node.addEventListener('pointerup', up);
    node.addEventListener('pointercancel', up);
    node.addEventListener('lostpointercapture', up);
  }
}

/** Canvas taps (hotbar slots, menu advance) mapped to logical pixels. */
export function bindCanvasTaps(canvas: HTMLCanvasElement, input: Input, onGesture: () => void): void {
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    onGesture();
    const r = canvas.getBoundingClientRect();
    input.taps.push({
      x: ((e.clientX - r.left) / r.width) * canvas.width,
      y: ((e.clientY - r.top) / r.height) * canvas.height,
    });
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    input.wheel += e.deltaY > 0 ? 1 : -1;
  }, { passive: false });
}
