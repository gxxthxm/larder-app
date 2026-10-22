import { describe, expect, it } from 'vitest';
import { bandFor, daysLeft, daysLeftLabel, addDaysISO } from './dates';

const today = new Date(2026, 9, 22, 18, 30);

describe('daysLeft', () => {
  it('counts calendar days regardless of time of day', () => {
    expect(daysLeft({ expiresAt: '2026-10-22' }, today)).toBe(0);
    expect(daysLeft({ expiresAt: '2026-10-23' }, today)).toBe(1);
    expect(daysLeft({ expiresAt: '2026-10-20' }, today)).toBe(-2);
    expect(daysLeft({ expiresAt: '2026-11-01' }, today)).toBe(10);
  });

  it('round-trips with addDaysISO', () => {
    expect(daysLeft({ expiresAt: addDaysISO(5, today) }, today)).toBe(5);
    expect(daysLeft({ expiresAt: addDaysISO(-3, today) }, today)).toBe(-3);
  });
});

describe('bandFor', () => {
  it.each([
    [-5, 'expired'],
    [-1, 'expired'],
    [0, 'today'],
    [1, 'soon'],
    [2, 'soon'],
    [3, 'week'],
    [5, 'week'],
    [6, 'later'],
    [120, 'later'],
  ])('%i days → %s', (days, band) => {
    expect(bandFor(days)).toBe(band);
  });
});

describe('daysLeftLabel', () => {
  it('uses friendly microcopy', () => {
    expect(daysLeftLabel(0)).toBe('Use me today');
    expect(daysLeftLabel(2)).toBe('2 days left');
    expect(daysLeftLabel(7)).toBe('Still good for a week');
    expect(daysLeftLabel(-1)).toBe('Expired yesterday');
    expect(daysLeftLabel(-3)).toBe('Expired 3 days ago');
  });
});
