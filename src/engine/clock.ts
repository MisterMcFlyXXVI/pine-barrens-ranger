/** Day / Dusk / Night / Witching-Hour clock (6:00 AM → 2:00 AM). */
export type Phase = 'day' | 'dusk' | 'night' | 'witching';

export const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'] as const;
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const DAYS_PER_SEASON = 28;
export const DAY_START = 360; // 6:00 AM
export const DAY_END = 1560; // 2:00 AM (next day)
/** Real seconds per in-game minute. A full day lasts ~14 real minutes. */
export const SEC_PER_MIN = 0.7;

export class Clock {
  /** Absolute day number, starting at 1. */
  day = 1;
  minutes = DAY_START;
  private acc = 0;

  get season(): string { return SEASONS[Math.floor((this.day - 1) / DAYS_PER_SEASON) % 4]; }
  get dayOfSeason(): number { return ((this.day - 1) % DAYS_PER_SEASON) + 1; }
  get year(): number { return Math.floor((this.day - 1) / (DAYS_PER_SEASON * 4)) + 1; }
  get weekday(): string { return WEEKDAYS[(this.day - 1) % 7]; }

  phase(): Phase {
    const m = this.minutes;
    if (m < 1080) return 'day';
    if (m < 1200) return 'dusk';
    if (m < 1440) return 'night';
    return 'witching';
  }

  phaseLabel(): string {
    switch (this.phase()) {
      case 'day': return 'DAY';
      case 'dusk': return 'DUSK';
      case 'night': return 'NIGHT';
      case 'witching': return 'WITCHING HR';
    }
  }

  /** Stardew-style display in 10-minute steps, e.g. "6:40 AM". */
  timeLabel(): string {
    const m = Math.floor(this.minutes / 10) * 10;
    const hh24 = Math.floor(m / 60) % 24;
    const mm = m % 60;
    const ampm = hh24 < 12 ? 'AM' : 'PM';
    const hh = hh24 % 12 === 0 ? 12 : hh24 % 12;
    return `${hh}:${mm.toString().padStart(2, '0')} ${ampm}`;
  }

  /** Advance time. Returns true when the player hits 2:00 AM and passes out. */
  tick(dt: number): boolean {
    this.acc += dt;
    while (this.acc >= SEC_PER_MIN) {
      this.acc -= SEC_PER_MIN;
      this.minutes++;
      if (this.minutes >= DAY_END) { this.minutes = DAY_END; return true; }
    }
    return false;
  }

  newDay(): void {
    this.day++;
    this.minutes = DAY_START;
    this.acc = 0;
  }
}
