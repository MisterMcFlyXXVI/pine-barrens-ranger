import type { Action, Input } from './input';

const KEYMAP: Record<string, Action> = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  Space: 'a', KeyE: 'a', Enter: 'a', KeyZ: 'a', NumpadEnter: 'a',
  ShiftLeft: 'b', ShiftRight: 'b', Escape: 'b', KeyX: 'b', Backspace: 'b', KeyQ: 'b',
  Tab: 'dex', KeyJ: 'dex',
  KeyI: 'bag', KeyB: 'bag',
  KeyM: 'mute',
};

/** Binds WASD/Arrows, Space/E interact, Shift/Esc cancel+sprint, 1-9 hotbar, Tab dex, M mute. */
export function bindKeyboard(input: Input, onGesture: () => void): void {
  // Let text fields (the account sign-in form) receive their keys untouched.
  const typing = (e: KeyboardEvent) => e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
  window.addEventListener('keydown', (e) => {
    if (typing(e)) return;
    onGesture();
    if (e.code.startsWith('Digit') && e.code.length === 6) {
      const n = Number(e.code.slice(5));
      if (n >= 1 && n <= 9) { if (!e.repeat) input.hotbar.push(n - 1); e.preventDefault(); return; }
    }
    const a = KEYMAP[e.code];
    if (!a) return;
    e.preventDefault();
    input.press(a, `k:${e.code}`);
  });
  window.addEventListener('keyup', (e) => {
    if (typing(e)) return;
    const a = KEYMAP[e.code];
    if (a) input.release(a, `k:${e.code}`);
  });
  window.addEventListener('blur', () => input.releaseAll());
  document.addEventListener('visibilitychange', () => { if (document.hidden) input.releaseAll(); });
}
