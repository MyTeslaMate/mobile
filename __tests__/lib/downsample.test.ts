import { rdp, strideDownsample } from '@/lib/downsample';

describe('strideDownsample', () => {
  it('returns the input unchanged when it is shorter than the target', () => {
    const input = [1, 2, 3];
    expect(strideDownsample(input, 10)).toBe(input);
  });

  it('returns the input unchanged when it matches the target length', () => {
    const input = [1, 2, 3];
    expect(strideDownsample(input, 3)).toBe(input);
  });

  it('downsamples a large input to exactly `target` items', () => {
    const input = Array.from({ length: 5000 }, (_, i) => i);
    const out = strideDownsample(input, 150);
    expect(out).toHaveLength(150);
  });

  it('always preserves the first and last samples', () => {
    const input = Array.from({ length: 1000 }, (_, i) => i);
    const out = strideDownsample(input, 50);
    expect(out[0]).toBe(0);
    expect(out[out.length - 1]).toBe(999);
  });

  it('preserves monotonic order', () => {
    const input = Array.from({ length: 1000 }, (_, i) => i);
    const out = strideDownsample(input, 100);
    for (let i = 1; i < out.length; i++) {
      expect(out[i]).toBeGreaterThan(out[i - 1]);
    }
  });
});

describe('rdp', () => {
  it('returns the input unchanged when it has fewer than 3 points', () => {
    const a = [{ latitude: 0, longitude: 0 }];
    const b = [
      { latitude: 0, longitude: 0 },
      { latitude: 1, longitude: 1 },
    ];
    expect(rdp(a, 0.001)).toBe(a);
    expect(rdp(b, 0.001)).toBe(b);
  });

  it('reduces a perfectly straight polyline to its endpoints', () => {
    const line = Array.from({ length: 50 }, (_, i) => ({
      latitude: i,
      longitude: i,
    }));
    const out = rdp(line, 0.0001);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ latitude: 0, longitude: 0 });
    expect(out[1]).toEqual({ latitude: 49, longitude: 49 });
  });

  it('keeps inflection points in a zig-zag', () => {
    const zigzag = [
      { latitude: 0, longitude: 0 },
      { latitude: 1, longitude: 0 },
      { latitude: 1, longitude: 1 },
      { latitude: 2, longitude: 1 },
      { latitude: 2, longitude: 2 },
    ];
    const out = rdp(zigzag, 0.0001);
    expect(out.length).toBeGreaterThanOrEqual(4);
    // First and last must always be present.
    expect(out[0]).toEqual(zigzag[0]);
    expect(out[out.length - 1]).toEqual(zigzag[zigzag.length - 1]);
  });

  it('removes more points as epsilon grows', () => {
    const noisyLine = Array.from({ length: 200 }, (_, i) => ({
      latitude: i + Math.sin(i) * 0.001,
      longitude: i,
    }));
    const tight = rdp(noisyLine, 0.0001);
    const loose = rdp(noisyLine, 0.01);
    expect(loose.length).toBeLessThan(tight.length);
  });
});
