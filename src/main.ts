/** Bootstrap: crisp integer-scaled canvas, input wiring, fixed-step-ish game loop. */
import './style.css';
import { bakeAll } from './graphics/sprites';
import { Game } from './engine/game';
import { bindKeyboard } from './input/keyboard';
import { TouchControls, bindCanvasTaps } from './input/touch';
import { sfx } from './audio/sfx';

function must<T extends HTMLElement>(id: string): T {
  const e = document.getElementById(id);
  if (!e) throw new Error(`Missing #${id}`);
  return e as T;
}

const screen = must<HTMLDivElement>('screen');
const canvas = must<HTMLCanvasElement>('game');
const deck = must<HTMLDivElement>('deck');
const padBtn = must<HTMLButtonElement>('pad-toggle');
const muteBtn = must<HTMLButtonElement>('mute-toggle');

const ctx = canvas.getContext('2d', { alpha: false });
if (!ctx) throw new Error('Canvas 2D not supported');

bakeAll();
const game = new Game(canvas, ctx);
const gesture = () => sfx.unlock();

/** Pick the largest integer scale that keeps at least ~15x10 tiles visible. */
function layout(): void {
  const box = screen.getBoundingClientRect();
  if (box.width < 2 || box.height < 2) return;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const devW = Math.floor(box.width * dpr), devH = Math.floor(box.height * dpr);
  const portrait = box.height > box.width;
  const minW = portrait ? 184 : 240;
  const minH = portrait ? 176 : 168;
  const scale = Math.max(1, Math.floor(Math.min(devW / minW, devH / minH)));
  const w = Math.floor(devW / scale), h = Math.floor(devH / scale);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  canvas.style.width = `${(w * scale) / dpr}px`;
  canvas.style.height = `${(h * scale) / dpr}px`;
  ctx!.imageSmoothingEnabled = false;
  game.resize(w, h);
}

bindKeyboard(game.input, gesture);
bindCanvasTaps(canvas, game.input, gesture);
new TouchControls(deck, padBtn, game.input, gesture, () => requestAnimationFrame(layout));
muteBtn.classList.toggle('on', !sfx.muted);
muteBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  sfx.unlock();
  game.toggleMute();
});

new ResizeObserver(() => layout()).observe(screen);
window.addEventListener('orientationchange', () => setTimeout(layout, 150));
layout();

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  game.update(dt);
  game.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
