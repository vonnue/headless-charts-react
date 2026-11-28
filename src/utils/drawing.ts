import { isFiniteNumber } from './domain';

/** Optional duration/delay taken from a chart's `drawing` prop. */
export type DrawingTiming = {
  duration?: unknown;
  delay?: unknown;
};

/** Positive finite fallbacks when a field is missing, non-finite, or `<= 0`. */
export type ResolveDrawingDefaults = {
  duration?: number;
  delay?: number;
};

const resolveTimingValue = (value: unknown, fallback = 0): number => {
  if (isFiniteNumber(value) && value > 0) return value;
  return isFiniteNumber(fallback) && fallback > 0 ? fallback : 0;
};

/**
 * Clamp `drawing.duration` and `drawing.delay` to a finite number `>= 0`.
 * Missing, non-finite, or `<= 0` values become `0`, unless a positive
 * default is passed (RadarChart and RingGauge use `{ duration: 1000 }`).
 */
export const resolveDrawing = (
  drawing?: DrawingTiming | null,
  defaults?: ResolveDrawingDefaults
): { duration: number; delay: number } => ({
  duration: resolveTimingValue(drawing?.duration, defaults?.duration ?? 0),
  delay: resolveTimingValue(drawing?.delay, defaults?.delay ?? 0),
});
