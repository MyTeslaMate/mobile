import type { DateRangeValue } from '@/contexts/DateRangeContext';

export type RecommendationsScreen = 'now' | 'charges' | 'drives';

// Format guidance shared by every screen. The output is rendered inside a
// narrow modal on a phone (~6 inch screen), so we steer the model away from
// wide tables and verbose intros.
const MOBILE_FORMAT = [
  'Format for a narrow mobile screen:',
  '- short paragraphs, no preamble, no recap of the question;',
  '- prefer compact bullet lists over tables;',
  '- if a table is unavoidable, keep it to at most 3 short columns;',
  '- bold the key numbers, keep section headings short (### at most);',
  '- aim for ~120-180 words total.',
].join(' ');

export function buildRecommendationsPrompt(
  screen: RecommendationsScreen,
  carId: number | null,
  range: DateRangeValue | undefined,
  language: string
): string {
  const carRef = carId != null ? `car_id ${carId}` : 'my Tesla';
  const period = formatPeriod(range);
  const langInstruction = `Reply in ${language}.`;

  switch (screen) {
    case 'now':
      return [
        `Act as my driving efficiency coach for ${carRef}.`,
        `Call skill_drive_efficiency_coach to pull the latest data and tailored tips,`,
        `then complement with teslamate_get_car_status and teslamate_get_car_battery_health if you need the current snapshot.`,
        `Deliver 3 concrete actions I can apply on my next drive or charge to improve efficiency,`,
        `plus one quick read on battery health (degradation, capacity kept).`,
        `Speak in the second person, no fluff.`,
        MOBILE_FORMAT,
        langInstruction,
      ].join(' ');

    case 'charges':
      return [
        `I'm reviewing my charging sessions for ${carRef} over ${period}.`,
        `Use teslamate_get_car_charges${formatRangeArgs(range)} to pull every session in the window.`,
        `Focus the analysis on where my money goes:`,
        `breakdown home vs Supercharger vs other, total spent and total energy,`,
        `cheapest vs most expensive €/kWh, suspicious sessions (very slow, very expensive, very short),`,
        `and one or two clear money-saving moves.`,
        `Skip the obvious; surface what I would not spot by scrolling the list myself.`,
        MOBILE_FORMAT,
        langInstruction,
      ].join(' ');

    case 'drives':
      return [
        `I'm reviewing my driving over ${period} for ${carRef}.`,
        `Use teslamate_get_car_drives${formatRangeArgs(range)} to load the trips.`,
        `Tell me how I drove: total distance, consumption vs rated (Wh/km gap),`,
        `where I'm losing the most range (highway, cold, heavy load, aggressive trips),`,
        `recurring routes (commute, weekend drives), and standout trips (longest, most efficient, worst).`,
        `End with 2-3 driving-habit changes that would move the average Wh/km down on my actual routes.`,
        MOBILE_FORMAT,
        langInstruction,
      ].join(' ');
  }
}

function formatPeriod(range: DateRangeValue | undefined): string {
  if (!range || (!range.start && !range.end)) return 'all available history';
  const start = range.start ? formatDateOnly(range.start) : null;
  const end = range.end ? formatDateOnly(range.end) : null;
  if (start && end) return `the period from ${start} to ${end}`;
  if (start) return `the period since ${start}`;
  if (end) return `the period up to ${end}`;
  return 'all available history';
}

function formatRangeArgs(range: DateRangeValue | undefined): string {
  if (!range || (!range.start && !range.end)) return '';
  const parts: string[] = [];
  if (range.start) parts.push(`start_date=${range.start.toISOString()}`);
  if (range.end) parts.push(`end_date=${range.end.toISOString()}`);
  return ` (${parts.join(', ')})`;
}

function formatDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}
