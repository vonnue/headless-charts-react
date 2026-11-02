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
