import { scaleLinear, scaleLog } from 'd3-scale';

/**
 * Shared rules for an axis's pinned `start` / `end` (F4):
 * - a finite number pins that end of the domain, narrowing or widening it,
 *   and 0 is a real bound;
 * - anything else (`undefined`, `null`, `NaN`, `±Infinity`) is unset, so that
 *   end falls back to the chart's default (usually the data extent).
 */

/** True for a finite number (rejects `NaN`, `±Infinity` and non-numbers). */
export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** `pinned` when it is a finite number, otherwise `fallback`. */
export const resolveBound = <T,>(pinned: unknown, fallback: T): number | T =>
  isFiniteNumber(pinned) ? pinned : fallback;

/**
 * Axis start shared by several series: the smallest finite `start` among
 * them, or `undefined` when none of them pins one.
 */
export const pinnedStart = (bounds: readonly unknown[]): number | undefined => {
  const finite = bounds.filter(isFiniteNumber);
  return finite.length > 0 ? Math.min(...finite) : undefined;
};

/**
 * Axis end shared by several series: the largest finite `end` among them,
 * or `undefined` when none of them pins one.
 */
export const pinnedEnd = (bounds: readonly unknown[]): number | undefined => {
  const finite = bounds.filter(isFiniteNumber);
  return finite.length > 0 ? Math.max(...finite) : undefined;
};

/**
 * `value` clamped into `domain` (either order), so a mark drawn from it stays
 * inside the plot when a pinned start/end narrows the axis (#32). A
 * non-finite value is returned unchanged.
 */
export const clampToDomain = (
  value: number,
  domain: readonly [number, number] | readonly number[]
): number => {
  const lo = Math.min(domain[0], domain[1]);
  const hi = Math.max(domain[0], domain[1]);
  return Number.isFinite(value) ? Math.min(hi, Math.max(lo, value)) : value;
};

/** Axis scale type for {@link niceDomain}. */
export type NiceScale = 'linear' | 'log';

/**
 * Domain around a single value `v`, so an axis is never zero-width:
 * linear `[v - 1, v + 1]`, log `[v / 10, v * 10]`.
 */
export const zeroSpread = (v: number, scale: NiceScale = 'linear'): [number, number] =>
  scale === 'log' ? [v / 10, v * 10] : [v - 1, v + 1];

/**
 * The "nice the data extent, then pin" domain.
 *
 * 1. `lo === hi` -> {@link zeroSpread}; otherwise the extent is niced on a
 *    linear or log scale.
 * 2. Finite `start` / `end` pins replace that end ({@link resolveBound}).
 * 3. If the pins leave `lo === hi`, the result gets {@link zeroSpread} too.
 *
 * Callers still decide what to do with conflicting pins (`start > end`); an
 * inverted result is returned as is.
 */
export const niceDomain = (
  lo: number,
  hi: number,
  options: { start?: unknown; end?: unknown; scale?: NiceScale } = {}
): [number, number] => {
  const { start, end, scale = 'linear' } = options;
  const niced: [number, number] =
    lo === hi
      ? zeroSpread(lo, scale)
      : ((scale === 'log' ? scaleLog() : scaleLinear())
          .domain([lo, hi])
          .nice()
          .domain() as [number, number]);
  const dLo = resolveBound(start, niced[0]);
  const dHi = resolveBound(end, niced[1]);
  return dLo === dHi ? zeroSpread(dLo, scale) : [dLo, dHi];
};
