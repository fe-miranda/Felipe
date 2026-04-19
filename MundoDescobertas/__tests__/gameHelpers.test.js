import {
  randomBetween,
  randomFrom,
  rectsOverlap,
  pointInRect,
  distanceBetween,
  shuffleArray,
  clamp,
  formatScore,
  generateBubblePositions,
  lightenHex,
} from '../src/utils/gameHelpers';

// ── randomBetween ────────────────────────────────────────────────────────────
describe('randomBetween', () => {
  it('returns a value between min and max (inclusive)', () => {
    for (let i = 0; i < 200; i++) {
      const v = randomBetween(5, 15);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(15);
    }
  });

  it('returns an integer', () => {
    expect(Number.isInteger(randomBetween(1, 100))).toBe(true);
  });

  it('handles min === max', () => {
    expect(randomBetween(7, 7)).toBe(7);
  });
});

// ── randomFrom ───────────────────────────────────────────────────────────────
describe('randomFrom', () => {
  const arr = ['a', 'b', 'c', 'd'];

  it('returns an element from the array', () => {
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(randomFrom(arr));
    }
  });

  it('works with a single-element array', () => {
    expect(randomFrom(['only'])).toBe('only');
  });

  it('returns undefined for empty array', () => {
    expect(randomFrom([])).toBeUndefined();
  });
});

// ── rectsOverlap ─────────────────────────────────────────────────────────────
describe('rectsOverlap', () => {
  const r1 = { x: 0, y: 0, width: 100, height: 100 };

  it('returns true when rects overlap', () => {
    const r2 = { x: 50, y: 50, width: 100, height: 100 };
    expect(rectsOverlap(r1, r2)).toBe(true);
  });

  it('returns false when rects do not overlap', () => {
    const r2 = { x: 110, y: 110, width: 50, height: 50 };
    expect(rectsOverlap(r1, r2)).toBe(false);
  });

  it('returns true when rects share an edge', () => {
    const r2 = { x: 100, y: 0, width: 100, height: 100 };
    expect(rectsOverlap(r1, r2)).toBe(true);
  });

  it('returns true when one rect is fully inside the other', () => {
    const r2 = { x: 20, y: 20, width: 40, height: 40 };
    expect(rectsOverlap(r1, r2)).toBe(true);
  });
});

// ── pointInRect ──────────────────────────────────────────────────────────────
describe('pointInRect', () => {
  const rect = { x: 10, y: 10, width: 80, height: 80 };

  it('returns true for a point inside', () => {
    expect(pointInRect({ x: 50, y: 50 }, rect)).toBe(true);
  });

  it('returns false for a point outside', () => {
    expect(pointInRect({ x: 5, y: 5 }, rect)).toBe(false);
  });

  it('returns true for a point on the border', () => {
    expect(pointInRect({ x: 10, y: 10 }, rect)).toBe(true);
    expect(pointInRect({ x: 90, y: 90 }, rect)).toBe(true);
  });

  it('returns false for a point just outside the border', () => {
    expect(pointInRect({ x: 9, y: 50 }, rect)).toBe(false);
  });
});

// ── distanceBetween ──────────────────────────────────────────────────────────
describe('distanceBetween', () => {
  it('calculates the classic 3-4-5 triangle distance', () => {
    expect(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5);
  });

  it('returns 0 for the same point', () => {
    expect(distanceBetween({ x: 7, y: 7 }, { x: 7, y: 7 })).toBe(0);
  });

  it('is symmetric', () => {
    const p1 = { x: 1, y: 2 };
    const p2 = { x: 4, y: 6 };
    expect(distanceBetween(p1, p2)).toBeCloseTo(distanceBetween(p2, p1));
  });
});

// ── shuffleArray ─────────────────────────────────────────────────────────────
describe('shuffleArray', () => {
  const arr = [1, 2, 3, 4, 5];

  it('returns an array of the same length', () => {
    expect(shuffleArray(arr)).toHaveLength(arr.length);
  });

  it('contains the same elements', () => {
    expect(shuffleArray(arr).sort()).toEqual([...arr].sort());
  });

  it('does not mutate the original array', () => {
    const copy = [...arr];
    shuffleArray(arr);
    expect(arr).toEqual(copy);
  });
});

// ── clamp ────────────────────────────────────────────────────────────────────
describe('clamp', () => {
  it('clamps to min when value is below', () => expect(clamp(-5,  0, 100)).toBe(0));
  it('clamps to max when value is above', () => expect(clamp(200, 0, 100)).toBe(100));
  it('returns value when within range',   () => expect(clamp(50,  0, 100)).toBe(50));
  it('returns min when value equals min', () => expect(clamp(0,   0, 100)).toBe(0));
  it('returns max when value equals max', () => expect(clamp(100, 0, 100)).toBe(100));
});

// ── formatScore ──────────────────────────────────────────────────────────────
describe('formatScore', () => {
  it('pads a single digit with a leading zero', () => expect(formatScore(5)).toBe('05'));
  it('does not pad a two-digit number',         () => expect(formatScore(15)).toBe('15'));
  it('formats zero as "00"',                    () => expect(formatScore(0)).toBe('00'));
  it('handles three-digit scores',              () => expect(formatScore(123)).toBe('123'));
});

// ── generateBubblePositions ───────────────────────────────────────────────────
describe('generateBubblePositions', () => {
  const SW = 375;

  it('generates the requested number of bubbles', () => {
    expect(generateBubblePositions(8, SW)).toHaveLength(8);
  });

  it('places all bubbles within horizontal bounds', () => {
    generateBubblePositions(20, SW).forEach(({ x }) => {
      expect(x).toBeGreaterThanOrEqual(30);
      expect(x).toBeLessThanOrEqual(SW - 80);
    });
  });

  it('gives each bubble a unique id', () => {
    const positions = generateBubblePositions(5, SW);
    const ids = new Set(positions.map((p) => p.id));
    expect(ids.size).toBe(5);
  });

  it('assigns positive duration values', () => {
    generateBubblePositions(10, SW).forEach(({ duration }) => {
      expect(duration).toBeGreaterThan(0);
    });
  });
});

// ── lightenHex ───────────────────────────────────────────────────────────────
describe('lightenHex', () => {
  it('returns an rgb() string', () => {
    expect(lightenHex('#000000')).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
  });

  it('does not exceed 255 per channel', () => {
    const result = lightenHex('#FFFFFF', 100);
    const parts = result.match(/\d+/g).map(Number);
    parts.forEach((v) => expect(v).toBeLessThanOrEqual(255));
  });

  it('increases channel values for a dark colour', () => {
    // #101010 → each channel = 16; adding 60 → 76
    const result = lightenHex('#101010', 60);
    expect(result).toBe('rgb(76,76,76)');
  });
});
