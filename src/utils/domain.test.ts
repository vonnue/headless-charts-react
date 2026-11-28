import { describe, expect, it } from 'vitest';

import {
  clampToDomain,
  isFiniteNumber,
  niceDomain,
  pinnedEnd,
  pinnedStart,
  resolveBound,
  zeroSpread,
} from './domain';

describe('domain bound helpers', () => {
  it('isFiniteNumber accepts finite numbers only', () => {
    expect(isFiniteNumber(0)).toBe(true);
    expect(isFiniteNumber(-3.5)).toBe(true);
    for (const v of [NaN, Infinity, -Infinity, undefined, null, '5']) {
      expect(isFiniteNumber(v)).toBe(false);
    }
  });

  it('resolveBound keeps 0 and falls back for non-finite values', () => {
    expect(resolveBound(0, 10)).toBe(0);
    expect(resolveBound(-2, 10)).toBe(-2);
    expect(resolveBound(undefined, 10)).toBe(10);
    expect(resolveBound(NaN, 10)).toBe(10);
    expect(resolveBound(Infinity, 10)).toBe(10);
    expect(resolveBound(null, undefined)).toBeUndefined();
  });

  it('pinnedStart / pinnedEnd ignore series without a finite bound', () => {
    expect(pinnedStart([undefined, 5, NaN, 2])).toBe(2);
    expect(pinnedEnd([undefined, 5, NaN, 2])).toBe(5);
    expect(pinnedStart([0, 3])).toBe(0);
    expect(pinnedEnd([0, -3])).toBe(0);
    expect(pinnedStart([undefined, NaN])).toBeUndefined();
    expect(pinnedEnd([])).toBeUndefined();
  });
});

describe('clampToDomain', () => {
  it('clamps into the domain in either order and keeps in-range values', () => {
    expect(clampToDomain(5, [10, 20])).toBe(10);
    expect(clampToDomain(25, [10, 20])).toBe(20);
    expect(clampToDomain(15, [10, 20])).toBe(15);
    expect(clampToDomain(25, [20, 10])).toBe(20);
    expect(clampToDomain(0, [-5, 5])).toBe(0);
  });

  it('returns a non-finite value unchanged', () => {
    expect(clampToDomain(NaN, [0, 1])).toBeNaN();
  });
});

describe('zeroSpread', () => {
  it('pads a single value: linear v ± 1, log v / 10 .. v * 10', () => {
    expect(zeroSpread(5)).toEqual([4, 6]);
    expect(zeroSpread(0)).toEqual([-1, 1]);
    expect(zeroSpread(100, 'log')).toEqual([10, 1000]);
  });
});

describe('niceDomain', () => {
  it('nices a linear extent', () => {
    expect(niceDomain(0.3, 9.4)).toEqual([0, 10]);
    expect(niceDomain(0.3, 9.4, { scale: 'linear' })).toEqual([0, 10]);
  });

  it('nices a log extent on a log scale', () => {
    expect(niceDomain(2, 80, { scale: 'log' })).toEqual([1, 100]);
  });

  it('pads a flat data extent without niceing it (linear and log)', () => {
    expect(niceDomain(2.5, 2.5)).toEqual([1.5, 3.5]);
    expect(niceDomain(100, 100, { scale: 'log' })).toEqual([10, 1000]);
  });

  it('pins override the niced ends; 0 is a real pin', () => {
    expect(niceDomain(0.3, 9.4, { start: 2 })).toEqual([2, 10]);
    expect(niceDomain(0.3, 9.4, { end: 7 })).toEqual([0, 7]);
    expect(niceDomain(0.3, 9.4, { start: 0, end: 5 })).toEqual([0, 5]);
    expect(niceDomain(5, 9, { start: 0 })).toEqual([0, 9]);
  });

  it('ignores non-finite pins', () => {
    expect(
      niceDomain(0.3, 9.4, { start: NaN, end: Infinity })
    ).toEqual([0, 10]);
    expect(niceDomain(0.3, 9.4, { start: null, end: '5' })).toEqual([0, 10]);
  });

  it('pads a domain the pins collapse to one value (equal pins)', () => {
    expect(niceDomain(0.3, 9.4, { start: 5, end: 5 })).toEqual([4, 6]);
    expect(niceDomain(10, 1000, { start: 100, end: 100, scale: 'log' })).toEqual([
      10, 1000,
    ]);
  });

  it('pads a single pin that collides with the other niced end', () => {
    expect(niceDomain(0.3, 9.4, { start: 10 })).toEqual([9, 11]);
    expect(niceDomain(0.3, 9.4, { end: 0 })).toEqual([-1, 1]);
  });

  it('returns an inverted domain unchanged (callers decide what to do)', () => {
    expect(niceDomain(0.3, 9.4, { start: 20 })).toEqual([20, 10]);
  });
});
