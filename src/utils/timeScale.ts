import { max, min } from 'd3-array';
import { scaleTime, type ScaleTime } from 'd3-scale';
import { isoParse, timeParse } from 'd3-time-format';

import type { AxisConfig } from '@/types';

/**
 * Shared time-axis helpers for charts whose x axis is normally a category
 * (`scaleBand`) axis but can switch to `scalingFunction: 'time'` (#7):
 * ColumnChart, ColumnChartStacked, LollipopVChart and BoxPlotV.
 */

export const DEFAULT_TIME_FORMAT = '%Y-%m-%d';

/**
 * Returns a function that parses `row[x.key]` into a `Date`, using
 * `isoParse` when `x.time.isISO` is set and `timeParse(x.time.format)`
 * (default `%Y-%m-%d`) otherwise. Unparseable values come back as `null`
 * at runtime, as with the d3 parsers; callers treat them like `Date`.
 */
export const makeDateAccessor = <TData,>(x: AxisConfig<TData>) => {
  const parse: (value: string) => Date | null = x.time?.isISO
    ? isoParse
    : timeParse(x.time?.format || DEFAULT_TIME_FORMAT);
  return (d: TData): Date => parse((d as Record<string, string>)[x.key]) as Date;
};

/**
 * A `scaleTime` over `[x.start ?? earliest date, x.end ?? latest date]`
 * mapped onto `range`.
 *
 * No `.nice()`: the old code called `scaleTime().nice()` *before* setting the
 * domain, which made it a no-op (#16). Keeping the domain un-niced is the
 * current behaviour; edge marks are kept inside the plot by `insetTimeScale`.
 */
export const createTimeXScale = <TData,>(
  data: TData[],
  x: AxisConfig<TData>,
  toDate: (d: TData) => Date,
  range: [number, number]
): ScaleTime<number, number> => {
  const dates = data.map(toDate);
  const start = Number.isFinite(x.start) ? (x.start as number) : (min(dates) ?? NaN);
  const end = Number.isFinite(x.end) ? (x.end as number) : (max(dates) ?? NaN);
  return scaleTime().domain([start, end]).range(range);
};

/**
 * Median gap, in ms, between the distinct valid dates. `NaN` when there are
 * fewer than two distinct dates. Median, not mean or min: one large gap (a
 * missing period) doesn't widen the marks, and one duplicate/near-duplicate
 * timestamp doesn't collapse them to ~0.
 */
export const medianCadenceMs = (dates: (Date | null | undefined)[]): number => {
  const timestamps = Array.from(
    new Set(
      dates
        .map((date) => date?.getTime())
        .filter((t): t is number => typeof t === 'number' && Number.isFinite(t))
    )
  ).sort((a, b) => a - b);

  if (timestamps.length < 2) return NaN;

  const gaps: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    gaps.push(timestamps[i] - timestamps[i - 1]);
  }
  gaps.sort((a, b) => a - b);
  const mid = Math.floor(gaps.length / 2);
  return gaps.length % 2 === 0 ? (gaps[mid - 1] + gaps[mid]) / 2 : gaps[mid];
};

/**
 * Rendered width, in px, of each bar/box when the x axis is a time scale.
 *
 * 1. `explicitWidth` (from `x.time.barWidth`) wins and is used as-is;
 *    `paddingRatio` is not applied on top of it.
 * 2. Otherwise one cadence step (see `medianCadenceMs`) in px, shrunk by
 *    `paddingRatio`.
 * 3. With fewer than two distinct dates, the plot width split evenly across
 *    `rowCount` rows, shrunk by `paddingRatio`.
 *
 * Never less than 1px in cases 2 and 3.
 */
export const timeMarkWidth = ({
  scale,
  dates,
  rowCount,
  paddingRatio,
  explicitWidth,
}: {
  scale: ScaleTime<number, number>;
  dates: (Date | null | undefined)[];
  rowCount: number;
  paddingRatio: number;
  explicitWidth?: number;
}): number => {
  if (Number.isFinite(explicitWidth)) return explicitWidth as number;

  const [rangeStart, rangeEnd] = scale.range();
  const cadenceMs = medianCadenceMs(dates);

  let slotWidthPx: number;
  if (Number.isFinite(cadenceMs) && cadenceMs > 0) {
    // scaleTime is affine in ms, so the pixel delta for a fixed ms interval
    // is the same everywhere on the scale — any anchor works.
    const anchor = scale.domain()[0].getTime();
    slotWidthPx = scale(new Date(anchor + cadenceMs)) - scale(new Date(anchor));
  } else {
    slotWidthPx = (rangeEnd - rangeStart) / Math.max(rowCount, 1);
  }

  return Math.max(1, slotWidthPx * (1 - paddingRatio));
};

/**
 * A copy of `scale` whose range is pulled in by `insetPx` on each side (#16).
 *
 * The axis keeps the full margin-to-margin scale, but marks centered on a
 * date at the domain's min/max would otherwise render half outside the plot.
 * The inset is clamped so the two sides can never cross on a tiny chart.
 */
export const insetTimeScale = (
  scale: ScaleTime<number, number>,
  insetPx: number
): ScaleTime<number, number> => {
  const [rangeStart, rangeEnd] = scale.range();
  const inset = Math.min(insetPx, Math.max(0, (rangeEnd - rangeStart) / 2 - 0.5));
  return scale.copy().range([rangeStart + inset, rangeEnd - inset]);
};
