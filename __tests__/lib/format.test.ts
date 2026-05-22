import {
  formatCarName,
  formatCost,
  formatDuration,
  formatKm,
  formatKwh,
} from '@/lib/format';

describe('formatDuration', () => {
  it('returns em-dash for nullish input', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(undefined)).toBe('—');
  });

  it('returns minutes only when below an hour', () => {
    expect(formatDuration(0)).toBe('0 min');
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(59)).toBe('59 min');
  });

  it('formats hours and zero-padded minutes', () => {
    expect(formatDuration(60)).toBe('1h 00');
    expect(formatDuration(65)).toBe('1h 05');
    expect(formatDuration(125)).toBe('2h 05');
  });

  it('clamps negative input to zero', () => {
    expect(formatDuration(-30)).toBe('0 min');
  });
});

describe('formatKm', () => {
  it('returns em-dash for nullish input', () => {
    expect(formatKm(null)).toBe('—');
  });
  it('always uses one decimal', () => {
    expect(formatKm(0)).toBe('0.0 km');
    expect(formatKm(12)).toBe('12.0 km');
    expect(formatKm(12.345)).toBe('12.3 km');
  });
});

describe('formatKwh', () => {
  it('uses one decimal and the kWh unit', () => {
    expect(formatKwh(null)).toBe('—');
    expect(formatKwh(7.23)).toBe('7.2 kWh');
  });
});

describe('formatCost', () => {
  it('returns null when cost is missing', () => {
    expect(formatCost(null, 'EUR')).toBeNull();
    expect(formatCost(undefined, 'EUR')).toBeNull();
  });

  it('appends the currency when provided', () => {
    expect(formatCost(12.5, 'EUR')).toBe('12.50 EUR');
  });

  it('returns the value alone when currency is missing', () => {
    expect(formatCost(12.5, null)).toBe('12.50');
    expect(formatCost(12.5, undefined)).toBe('12.50');
  });
});

describe('formatCarName', () => {
  it('returns em-dash when source is nullish', () => {
    expect(formatCarName(null)).toBe('—');
  });

  it('prefers the user-given name', () => {
    expect(formatCarName({ name: 'Bumblebee', display_name: 'Model Y' })).toBe(
      'Bumblebee'
    );
  });

  it('falls back to display_name when name is blank', () => {
    expect(formatCarName({ name: '  ', display_name: 'Model Y' })).toBe(
      'Model Y'
    );
  });

  it('falls back to the badge when name and display are blank', () => {
    expect(formatCarName({ car_details: { model: 'Y' } })).toBe('Tesla Model Y');
  });

  it('falls back to Car # when no other label is available', () => {
    expect(formatCarName({ car_id: 7 })).toBe('Car #7');
  });

  it('returns em-dash when nothing identifies the car', () => {
    expect(formatCarName({})).toBe('—');
  });
});
