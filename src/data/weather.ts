/** Weather cycles, moon phases, and time-of-day tags used by spawn rules. */
import { hash2 } from '../util';

export type Weather = 'CLEAR' | 'FOG' | 'RAIN' | 'STORM' | 'SNOW';
export type TimeTag = 'DAWN' | 'DAY' | 'DUSK' | 'NIGHT' | 'WITCHING';

export const WEATHER_LABEL: Record<Weather, string> = {
  CLEAR: 'Clear', FOG: 'Fog', RAIN: 'Rain', STORM: 'Thunderstorm', SNOW: 'Snow',
};

/** Two weather slots per day: morning (6 AM-6 PM) and evening (6 PM-2 AM). */
export interface DayWeather {
  morning: Weather;
  evening: Weather;
}

/**
 * Deterministic daily weather. Spring/Summer/Fall share one table; Winter
 * swaps rain for snow. Evenings often roll fog in off the bog.
 */
export function rollWeather(day: number, seasonIdx: number): DayWeather {
  const r = hash2(day, 7, 4242);
  const r2 = hash2(day, 13, 4242);
  const winter = seasonIdx === 3;
  let morning: Weather;
  if (day === 1) morning = 'CLEAR';
  else if (r < 0.5) morning = 'CLEAR';
  else if (r < 0.66) morning = 'FOG';
  else if (r < 0.88) morning = winter ? 'SNOW' : 'RAIN';
  else morning = winter ? 'SNOW' : 'STORM';
  let evening: Weather = morning;
  if (morning === 'CLEAR' && r2 < 0.32) evening = 'FOG';
  else if (morning === 'FOG' && r2 < 0.35) evening = 'CLEAR';
  else if (morning === 'RAIN' && r2 < 0.3) evening = 'STORM';
  else if (morning === 'STORM' && r2 < 0.4) evening = 'RAIN';
  else if (!winter && morning === 'CLEAR' && r2 > 0.92) evening = 'STORM';
  return { morning, evening };
}

export function weatherAt(w: DayWeather, minutes: number): Weather {
  return minutes >= 1080 ? w.evening : w.morning;
}

/** 8-day lunar cycle; the moon is full on days divisible by 8. */
export function moonPhase(day: number): { full: boolean; label: string } {
  const k = ((day % 8) + 8) % 8;
  const labels = ['Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent', 'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous'];
  return { full: k === 0, label: labels[k] };
}

export function timeTags(minutes: number): TimeTag[] {
  if (minutes < 480) return ['DAWN', 'DAY'];
  if (minutes < 1080) return ['DAY'];
  if (minutes < 1200) return ['DUSK'];
  if (minutes < 1440) return ['NIGHT'];
  return ['NIGHT', 'WITCHING'];
}
