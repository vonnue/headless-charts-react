/**
 * Pure statistics for ViolinChart: grouping, quantiles, bandwidth rules,
 * kernels, KDE and deterministic jitter. No d3-selection or React, so each
 * rule can be unit-tested and changed in one place.
 */
import { deviation, mean as d3mean, quantile } from 'd3-array';
import { isFiniteNumber } from '@/utils/domain';

export type BandwidthRule = 'silverman' | 'scott';
export type KernelType = 'gaussian' | 'epanechnikov';

export const RESOLUTION_DEFAULT = 100;
export const RESOLUTION_MIN = 16;
export const RESOLUTION_MAX = 512;
/** `extent: 'tails'` reaches this many bandwidths past min / max. */
export const TAIL_BANDWIDTHS = 3;
/** Below this n (and n >= 2) the KDE is drawn with a reliability warning. */
export const SMALL_N = 5;

export interface GroupedRows<TRow> {
  /** Ordered group labels (first appearance, then `order` override). */
  order: string[];
  /** Valid rows per group (finite value only). */
  rows: Map<string, TRow[]>;
  /** Count of rows whose value was not finite (excluded). */
  invalidValues: number;
  /** Count of rows skipped for a null/undefined category. */
  missingCategory: number;
}

/**
 * Groups rows by `String(row[categoryKey])`. Groups appear in first-appearance
 * order; `order` moves listed groups first (absent ones dropped). A group whose
 * rows all have non-finite values still exists, with zero rows.
 */
export const groupRows = <TRow,>(
  data: readonly TRow[],
  categoryKey: string,
  valueKey: string,
  order?: readonly string[]
): GroupedRows<TRow> => {
  const rows = new Map<string, TRow[]>();
  let invalidValues = 0,
    missingCategory = 0;
  data.forEach((row) => {
    const r = row as Record<string, unknown> | null | undefined;
    const c = r?.[categoryKey];
    if (c === null || c === undefined) {
      missingCategory++;
      return;
    }
    const key = String(c);
    if (!rows.has(key)) rows.set(key, []);
    if (isFiniteNumber(r?.[valueKey])) rows.get(key)!.push(row);
    else invalidValues++;
  });
  const seen = [...rows.keys()];
  const listed = (order ?? []).filter((k, i, a) => rows.has(k) && a.indexOf(k) === i);
  const ordered = [...listed, ...seen.filter((k) => !listed.includes(k))];
  return { order: ordered, rows, invalidValues, missingCategory };
};

export interface GroupStats {
  n: number;
  /** Sorted ascending. */
  values: number[];
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean: number;
  /** Sample standard deviation (n − 1), 0 when n < 2. */
  sd: number;
}

/** Summary stats; quantiles are d3 type-7, the same as BoxPlot `binDataStats`. NaN when n = 0. */
export const groupStats = (raw: readonly number[]): GroupStats => {
  const values = [...raw].sort((a, b) => a - b);
  const n = values.length;
  if (n === 0)
    return { n, values, min: NaN, q1: NaN, median: NaN, q3: NaN, max: NaN, mean: NaN, sd: NaN };
  return {
    n,
    values,
    min: values[0],
    q1: quantile(values, 0.25)!,
    median: quantile(values, 0.5)!,
    q3: quantile(values, 0.75)!,
    max: values[n - 1],
    mean: d3mean(values)!,
    sd: n > 1 ? deviation(values)! : 0,
  };
};

/** True when no KDE can be drawn: n < 2 or every value equal. */
export const isDegenerate = (s: GroupStats): boolean => s.n < 2 || s.max === s.min;

/**
 * Silverman's rule of thumb (R `bw.nrd0`): `0.9 · min(sd, IQR/1.34) · n^-1/5`,
 * using `sd` when IQR is 0. Scott: `1.06 · sd · n^-1/5`.
 */
export const ruleBandwidth = (s: GroupStats, rule: BandwidthRule): number => {
  const nPow = Math.pow(s.n, -0.2);
  if (rule === 'scott') return 1.06 * s.sd * nPow;
  const iqr = s.q3 - s.q1;
  const spread = iqr > 0 ? Math.min(s.sd, iqr / 1.34) : s.sd;
  return 0.9 * spread * nPow;
};

/**
 * Resolves the bandwidth for one group. `null` for degenerate groups. A
 * numeric `bandwidth` that is non-finite or <= 0 falls back to Silverman, and
 * an invalid `adjust` falls back to 1; `invalid` reports either.
 */
export const resolveBandwidth = (
  s: GroupStats,
  bandwidth: number | BandwidthRule | undefined,
  adjust: number | undefined
): { h: number | null; invalid: boolean } => {
  let invalid = false;
  let rule: BandwidthRule = 'silverman';
  let fixed: number | undefined;
  if (typeof bandwidth === 'number') {
    if (isFiniteNumber(bandwidth) && bandwidth > 0) fixed = bandwidth;
    else invalid = true;
  } else if (bandwidth === 'scott') rule = 'scott';
  let mult = 1;
  if (adjust !== undefined) {
    if (isFiniteNumber(adjust) && adjust > 0) mult = adjust;
    else invalid = true;
  }
  if (isDegenerate(s)) return { h: null, invalid };
  const base = fixed ?? ruleBandwidth(s, rule);
  const h = base * mult;
  return { h: Number.isFinite(h) && h > 0 ? h : null, invalid };
};

const SQRT_2PI = Math.sqrt(2 * Math.PI);
export const kernels: Record<KernelType, (u: number) => number> = {
  gaussian: (u) => Math.exp(-0.5 * u * u) / SQRT_2PI,
  epanechnikov: (u) => (Math.abs(u) <= 1 ? 0.75 * (1 - u * u) : 0),
};

/** `f(x) = (1 / (n·h)) Σ K((x − xi) / h)`. */
export const densityAt = (
  x: number,
  values: readonly number[],
  h: number,
  kernel: KernelType = 'gaussian'
): number => {
  const K = kernels[kernel];
  let sum = 0;
  for (const xi of values) sum += K((x - xi) / h);
  return sum / (values.length * h);
};

/** Clamps `resolution` to `[16, 512]` (rounded); default 100. */
export const clampResolution = (r: number | undefined): number =>
  isFiniteNumber(r)
    ? Math.min(RESOLUTION_MAX, Math.max(RESOLUTION_MIN, Math.round(r)))
    : RESOLUTION_DEFAULT;

export interface DensityPoint {
  /** Position on the value axis. */
  v: number;
  /** Density f(v) (>= 0). */
  f: number;
}

/** Evenly spaced KDE over the group's extent (`'data'` = [min, max], `'tails'` = ±3h). */
export const kde = (
  s: GroupStats,
  h: number,
  {
    kernel = 'gaussian',
    resolution,
    extent = 'data',
  }: { kernel?: KernelType; resolution?: number; extent?: 'data' | 'tails' }
): DensityPoint[] => {
  const pts = clampResolution(resolution);
  const lo = extent === 'tails' ? s.min - TAIL_BANDWIDTHS * h : s.min;
  const hi = extent === 'tails' ? s.max + TAIL_BANDWIDTHS * h : s.max;
  const step = (hi - lo) / (pts - 1);
  return Array.from({ length: pts }, (_, k) => {
    const v = k === pts - 1 ? hi : lo + k * step;
    return { v, f: Math.max(0, densityAt(v, s.values, h, kernel)) };
  });
};

/**
 * Deterministic pseudo-random in [0, 1) from an integer (a 32-bit integer
 * hash), so jitter is stable across renders, SSR and tests.
 */
export const hashUnit = (i: number): number => {
  let x = (i + 0x9e3779b9) | 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
};
