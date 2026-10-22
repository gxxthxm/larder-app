import { describe, expect, it } from 'vitest';
import type { ItemEvent } from './types';
import {
  dataSpanDays,
  monthStats,
  moneySaved,
  mostWasted,
  topTossReason,
  wasteRate,
  weeklySeries,
} from './impact';

const now = new Date(2026, 9, 22, 20, 0);

function ev(partial: Partial<ItemEvent> & Pick<ItemEvent, 'type' | 'value' | 'at'>): ItemEvent {
  return { id: Math.random().toString(36), itemName: 'Spinach', quantity: 1, ...partial };
}

describe('moneySaved', () => {
  it('counts used events on or before expiry only', () => {
    const events = [
      ev({
        type: 'used',
        value: 100,
        at: new Date(2026, 9, 10, 12).toISOString(),
        expiresAt: '2026-10-10',
      }),
      ev({
        type: 'used',
        value: 50,
        at: new Date(2026, 9, 12, 12).toISOString(),
        expiresAt: '2026-10-11',
      }),
      ev({ type: 'used', value: 30, at: new Date(2026, 9, 14, 12).toISOString() }),
      ev({ type: 'tossed', value: 80, at: new Date(2026, 9, 15, 12).toISOString() }),
    ];
    expect(moneySaved(events, new Date(2026, 9, 1), now)).toBe(130);
  });
});

describe('monthStats and wasteRate', () => {
  const events = [
    ev({ type: 'used', value: 300, at: new Date(2026, 9, 5).toISOString() }),
    ev({ type: 'tossed', value: 100, at: new Date(2026, 9, 6).toISOString(), reason: 'Forgot' }),
    ev({ type: 'tossed', value: 999, at: new Date(2026, 8, 28).toISOString(), reason: 'TooMuch' }),
  ];

  it('scopes to the current month', () => {
    const s = monthStats(events, now);
    expect(s.saved).toBe(300);
    expect(s.itemsWasted).toBe(1);
    expect(s.wasteRate).toBeCloseTo(0.25);
  });

  it('computes tossed / (used + tossed)', () => {
    expect(wasteRate(events)).toBeCloseTo(1099 / 1399);
    expect(wasteRate([])).toBe(0);
  });
});

describe('weeklySeries', () => {
  it('returns 8 rolling weeks, oldest first, ending today', () => {
    const events = [
      ev({ type: 'used', value: 40, at: new Date(2026, 9, 22, 9).toISOString() }),
      ev({ type: 'tossed', value: 25, at: new Date(2026, 9, 16, 9).toISOString() }),
      ev({ type: 'used', value: 70, at: new Date(2026, 9, 15, 9).toISOString() }),
      ev({ type: 'used', value: 999, at: new Date(2026, 7, 1).toISOString() }),
    ];
    const s = weeklySeries(events, now);
    expect(s).toHaveLength(8);
    expect(s[7]).toMatchObject({ used: 40, tossed: 25 });
    expect(s[6]).toMatchObject({ used: 70, tossed: 0 });
    expect(s.reduce((t, b) => t + b.used, 0)).toBe(110);
  });
});

describe('mostWasted and topTossReason', () => {
  const events = [
    ev({
      type: 'tossed',
      value: 40,
      at: now.toISOString(),
      catalogueId: 'spinach',
      reason: 'Forgot',
    }),
    ev({
      type: 'tossed',
      value: 40,
      at: now.toISOString(),
      catalogueId: 'spinach',
      reason: 'Forgot',
    }),
    ev({
      type: 'tossed',
      value: 20,
      at: now.toISOString(),
      catalogueId: 'coriander',
      itemName: 'Coriander',
      reason: 'TooMuch',
    }),
    ev({
      type: 'used',
      value: 20,
      at: now.toISOString(),
      catalogueId: 'coriander',
      itemName: 'Coriander',
    }),
  ];

  it('ranks by toss count', () => {
    expect(mostWasted(events).map((w) => [w.name, w.count])).toEqual([
      ['Spinach', 2],
      ['Coriander', 1],
    ]);
  });

  it('finds the most common reason', () => {
    expect(topTossReason(events)).toMatchObject({ reason: 'Forgot', count: 2 });
    expect(topTossReason([])).toBeUndefined();
  });

  it('measures how much history exists', () => {
    expect(dataSpanDays([], now)).toBe(0);
    expect(
      dataSpanDays([ev({ type: 'used', value: 1, at: new Date(2026, 9, 1).toISOString() })], now),
    ).toBe(21);
  });
});
