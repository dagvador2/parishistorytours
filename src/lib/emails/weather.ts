/**
 * Tomorrow's weather over the hours of the walk, for the day-before reminder.
 *
 * Open-Meteo: no API key, no account, and it answers in Paris local time when
 * asked to. The reminder treats a forecast as a bonus — any failure here
 * returns null and the email goes out without the block rather than not at
 * all. A missing weather line costs nothing; a missing meeting point would
 * leave someone on a pavement.
 */

const PARIS = { lat: 48.8534, lon: 2.3488 };

export interface Forecast {
  /** °C, rounded, at the hour the walk starts. */
  tempStart: number;
  /** °C, rounded, highest over the hours of the walk. */
  tempHigh: number;
  /** 0–100, highest chance of precipitation over those hours. */
  rainChance: number;
}

export async function parisForecast(
  dateKey: string,
  startTime: string,
  durationMinutes: number,
  fetchImpl: typeof fetch = fetch,
): Promise<Forecast | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${PARIS.lat}&longitude=${PARIS.lon}` +
    `&hourly=temperature_2m,precipitation_probability&timezone=Europe%2FParis` +
    `&start_date=${dateKey}&end_date=${dateKey}`;

  try {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      hourly?: { time?: string[]; temperature_2m?: number[]; precipitation_probability?: number[] };
    };
    const times = data.hourly?.time;
    const temps = data.hourly?.temperature_2m;
    const rain = data.hourly?.precipitation_probability;
    if (!times?.length || !temps?.length) return null;

    const startHour = Number(startTime.split(':')[0]);
    const endHour = Math.min(23, startHour + Math.ceil(durationMinutes / 60));
    const window: number[] = [];
    for (let i = 0; i < times.length; i++) {
      const h = Number(times[i].slice(11, 13));
      if (h >= startHour && h <= endHour) window.push(i);
    }
    if (!window.length) return null;

    return {
      tempStart: Math.round(temps[window[0]]),
      tempHigh: Math.round(Math.max(...window.map((i) => temps[i]))),
      rainChance: rain ? Math.round(Math.max(...window.map((i) => rain[i] ?? 0))) : 0,
    };
  } catch {
    return null;
  }
}
