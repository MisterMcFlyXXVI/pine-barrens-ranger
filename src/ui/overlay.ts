import type { Game } from '../engine/game';

/** A modal UI layer (dialog, menu) that pauses the world while open. */
export interface Overlay {
  closed: boolean;
  update(game: Game, dt: number): void;
  draw(game: Game, g: CanvasRenderingContext2D): void;
}
