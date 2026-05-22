import { buildRecommendationsPrompt } from '@/lib/recommendationsPrompt';

const RANGE = {
  start: new Date('2026-01-01T00:00:00Z'),
  end: new Date('2026-02-01T00:00:00Z'),
};

describe('buildRecommendationsPrompt', () => {
  describe('now', () => {
    it('mentions the efficiency-coach skill and the current car', () => {
      const prompt = buildRecommendationsPrompt('now', 42, undefined, 'en');
      expect(prompt).toContain('skill_drive_efficiency_coach');
      expect(prompt).toContain('car_id 42');
      expect(prompt).toContain('Reply in en.');
    });

    it('falls back to a generic car reference when carId is null', () => {
      const prompt = buildRecommendationsPrompt('now', null, undefined, 'fr');
      expect(prompt).toContain('my Tesla');
      expect(prompt).not.toContain('car_id');
      expect(prompt).toContain('Reply in fr.');
    });
  });

  describe('charges', () => {
    it('passes the date range to teslamate_get_car_charges', () => {
      const prompt = buildRecommendationsPrompt('charges', 1, RANGE, 'en');
      expect(prompt).toContain('teslamate_get_car_charges');
      expect(prompt).toContain('start_date=2026-01-01T00:00:00.000Z');
      expect(prompt).toContain('end_date=2026-02-01T00:00:00.000Z');
    });

    it('omits range args when no range is given', () => {
      const prompt = buildRecommendationsPrompt('charges', 1, undefined, 'en');
      expect(prompt).toContain('teslamate_get_car_charges');
      expect(prompt).not.toContain('start_date=');
      expect(prompt).toContain('all available history');
    });
  });

  describe('drives', () => {
    it('calls teslamate_get_car_drives and asks for Wh/km insights', () => {
      const prompt = buildRecommendationsPrompt('drives', 1, RANGE, 'en');
      expect(prompt).toContain('teslamate_get_car_drives');
      expect(prompt).toContain('Wh/km');
    });
  });

  it('always emits the mobile-format guidance', () => {
    for (const screen of ['now', 'charges', 'drives'] as const) {
      const prompt = buildRecommendationsPrompt(screen, 1, RANGE, 'en');
      expect(prompt).toContain('narrow mobile screen');
    }
  });
});
