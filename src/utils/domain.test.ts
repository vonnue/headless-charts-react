import { describe, expect, it } from 'vitest';

import {
  clampToDomain,
  isFiniteNumber,
  pinnedEnd,
  pinnedStart,
  resolveBound,
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
