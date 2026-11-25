/** Smooth-follow camera with map-edge clamping and integer snapping for crisp pixels. */
export class Camera {
  x = 0;
  y = 0;
  viewW = 240;
  viewH = 160;

  private clampAxis(v: number, view: number, world: number): number {
    if (world <= view) return Math.round((world - view) / 2);
    return Math.max(0, Math.min(world - view, v));
  }

  /** Extra scroll room below the map so the bottom row isn't hidden behind the hotbar. */
  hudMargin = 24;

  /** Ease toward the target centre. `snap` jumps immediately (map transitions). */
  follow(tx: number, ty: number, worldW: number, worldH: number, dt: number, snap = false): void {
    const goalX = this.clampAxis(tx - this.viewW / 2, this.viewW, worldW);
    const goalY = this.clampAxis(ty - this.viewH / 2, this.viewH, worldH + this.hudMargin);
    if (snap) { this.x = goalX; this.y = goalY; return; }
    const k = 1 - Math.exp(-dt * 9);
    this.x += (goalX - this.x) * k;
    this.y += (goalY - this.y) * k;
    if (Math.abs(goalX - this.x) < 0.05) this.x = goalX;
    if (Math.abs(goalY - this.y) < 0.05) this.y = goalY;
  }

  get ix(): number { return Math.round(this.x); }
  get iy(): number { return Math.round(this.y); }
}
