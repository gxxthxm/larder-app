import { describe, expect, it } from 'vitest';
import { parseBulk, readQuantity, splitBulk } from './parseBulk';

describe('splitBulk', () => {
  it('splits on commas, newlines and "and"', () => {
    expect(splitBulk('2 milk, spinach\n6 eggs and chicken thighs')).toEqual([
      '2 milk',
      'spinach',
      '6 eggs',
      'chicken thighs',
    ]);
  });

  it('drops blanks and bullet markers', () => {
    expect(splitBulk('- bread\n\n• curd,, ')).toEqual(['bread', 'curd']);
  });
});

describe('readQuantity', () => {
  it.each([
    ['2 milk', 2, undefined, 'milk'],
    ['500g paneer', 500, 'g', 'paneer'],
    ['1.5 kg rice', 1.5, 'kg', 'rice'],
    ['2x bread', 2, undefined, 'bread'],
    ['a dozen eggs', 12, undefined, 'eggs'],
    ['two packs of spinach', 2, 'pack', 'spinach'],
    ['spinach', undefined, undefined, 'spinach'],
  ])('%s', (input, q, unit, rest) => {
    const r = readQuantity(input);
    expect(r.quantity).toBe(q);
    expect(r.unit).toBe(unit);
    expect(r.rest).toBe(rest);
  });
});

describe('parseBulk', () => {
  it('parses the brief example', () => {
    const rows = parseBulk('2 milk, spinach, 6 eggs, chicken thighs');
    expect(rows.map((r) => r.match?.id)).toEqual(['milk', 'spinach', 'eggs', 'chicken-thighs']);
    expect(rows.map((r) => r.quantity)).toEqual([2, 1, 6, 1]);
    expect(rows[0].unit).toBe('l');
    expect(rows[2].unit).toBe('pcs');
    expect(rows.every((r) => r.confidence >= 0.9)).toBe(true);
  });

  it('keeps explicit units', () => {
    const [row] = parseBulk('500g paneer');
    expect(row.match?.id).toBe('paneer');
    expect(row.quantity).toBe(500);
    expect(row.unit).toBe('g');
  });

  it('matches aliases, plurals and small typos', () => {
    const rows = parseBulk('dahi, tomatoes, corriander, aloo');
    expect(rows.map((r) => r.match?.id)).toEqual(['curd', 'tomato', 'coriander', 'potato']);
    expect(rows[2].confidence).toBeLessThan(1);
  });

  it('turns unknown names into custom items', () => {
    const [row] = parseBulk('3 dragonfruit smoothie packs');
    expect(row.match).toBeUndefined();
    expect(row.confidence).toBe(0);
    expect(row.quantity).toBe(3);
    expect(row.name.toLowerCase()).toContain('dragonfruit');
  });

  it('flags a quantity with no name', () => {
    const [row] = parseBulk('12');
    expect(row.error).toBeTruthy();
  });

  it('parses ten items quickly', () => {
    const t = performance.now();
    const rows = parseBulk(
      '2 milk\n6 eggs\nspinach\n500g paneer\n1 kg tomatoes\ncoriander\nbread\n2 curd\nchicken thighs\n3 bananas',
    );
    expect(rows).toHaveLength(10);
    expect(rows.every((r) => r.match)).toBe(true);
    expect(performance.now() - t).toBeLessThan(100);
  });
});
