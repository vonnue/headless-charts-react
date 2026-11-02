import { max, min } from 'd3-array';
import { scaleTime, scaleUtc, type ScaleTime } from 'd3-scale';
import {
  isoParse,
  timeFormat,
  timeParse,
  utcFormat,
  utcParse,
} from 'd3-time-format';
import { useEffect, useMemo } from 'react';

import type { AxisConfig } from '@/types';
import { isDevEnvironment } from '@/utils/devEnvironment';

/**
 * Shared time-axis helpers for charts whose x axis is normally a category
 * (`scaleBand`) axis but can switch to `scalingFunction: 'time'` (#7):
 * ColumnChart, ColumnChartStacked, LollipopVChart and BoxPlotV.
 */

export const DEFAULT_TIME_FORMAT = '%Y-%m-%d';

type TimeAxis = Pick<AxisConfig, 'key' | 'time' | 'start' | 'end'>;

const isValidDate = (d: Date | null | undefined): d is Date =>
  d instanceof Date && !isNaN(d.getTime());

/**
 * Returns a function that turns one raw x value into a `Date`, or `null` when
 * it can't be read:
 * - `Date` values are used as-is (invalid dates give `null`);
 * - finite numbers are read as epoch milliseconds;
 * - strings go through `isoParse` when `x.time.isISO` is set, otherwise
 *   `timeParse(x.time.format)` (default `%Y-%m-%d`), or `utcParse` when
 *   `x.time.utc` is set.
 */
export const makeDateParser = (x: TimeAxis) => {
  const parseString: (value: string) => Date | null = x.time?.isISO
    ? isoParse
    : (x.time?.utc ? utcParse : timeParse)(x.time?.format || DEFAULT_TIME_FORMAT);
  return (value: unknown): Date | null => {
    if (value instanceof Date) return isValidDate(value) ? value : null;
    if (typeof value === 'number') {
      return Number.isFinite(value) ? new Date(value) : null;
    }
    if (typeof value === 'string') {
      const parsed = parseString(value);
      return isValidDate(parsed) ? parsed : null;
    }
    return null;
  };
};

/** `makeDateParser` applied to `row[x.key]`. */
export const makeDateAccessor = <TData,>(x: TimeAxis) => {
  const parse = makeDateParser(x);
  return (d: TData): Date | null =>
    parse((d as Record<string, unknown>)[x.key]);
};

/**
 * Formats a date for the default tooltip: `x.time.tooltipFormat`, else
 * `x.time.format`, else `%Y-%m-%d`; in UTC when `x.time.utc` is set, local
 * time otherwise.
 */
export const makeDateFormatter = (x: TimeAxis) =>
  (x.time?.utc ? utcFormat : timeFormat)(
    x.time?.tooltipFormat || x.time?.format || DEFAULT_TIME_FORMAT
  );

/**
 * A `scaleTime` (or `scaleUtc` with `x.time.utc`) over
 * `[x.start ?? earliest date, x.end ?? latest date]` mapped onto `range`.
 * Rows whose date is `null` are skipped. No `.nice()`: niced ends would add
 * empty space the bar layout doesn't account for.
 */
export const createTimeXScale = <TData,>(
  data: TData[],
  x: TimeAxis,
  toDate: (d: TData) => Date | null,
  range: [number, number]
): ScaleTime<number, number> => {
  const dates = data.map(toDate).filter(isValidDate);
  const start = Number.isFinite(x.start) ? (x.start as number) : (min(dates) ?? NaN);
  const end = Number.isFinite(x.end) ? (x.end as number) : (max(dates) ?? NaN);
  return (x.time?.utc ? scaleUtc() : scaleTime()).domain([start, end]).range(range);
};

/**
 * Median gap, in ms, between the distinct valid dates. `NaN` when there are
 * fewer than two distinct dates. Median, not mean or min: one large gap (a
 * missing period) doesn't widen the marks, and one duplicate/near-duplicate
 * timestamp doesn't collapse them to ~0.
 */
export const medianCadenceMs = (dates: (Date | null | undefined)[]): number => {
  const timestamps = Array.from(
    new Set(dates.filter(isValidDate).map((date) => date.getTime()))
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

/** `x.time.barWidth` if it is a usable width (finite and > 0), else undefined. */
export const validBarWidth = (barWidth: unknown): number | undefined =>
  typeof barWidth === 'number' && Number.isFinite(barWidth) && barWidth > 0
    ? barWidth
    : undefined;

/**
 * A copy of `scale` whose date domain is widened so that `insetPx` pixels are
 * left free at each unpinned end (#16). The range is unchanged, so the same
 * scale positions marks *and* draws the axis: marks stay on their ticks.
 * Ends pinned by `x.start` / `x.end` are left alone. The inset is clamped so
 * the two sides never cross on a tiny chart.
 */
export const padTimeDomain = (
  scale: ScaleTime<number, number>,
  insetPx: number,
  x: Pick<AxisConfig, 'start' | 'end'>
): ScaleTime<number, number> => {
  const [r0, r1] = scale.range();
  const rangePx = Math.abs(r1 - r0);
  const [t0, t1] = scale.domain().map(Number);
  const padStart = !Number.isFinite(x.start);
  const padEnd = !Number.isFinite(x.end);
  const sides = Number(padStart) + Number(padEnd);
  const inset = Math.max(0, Math.min(insetPx, rangePx / 2 - 0.5));
  const spanPx = rangePx - sides * inset;
  if (!(t1 > t0) || !(spanPx > 0) || sides === 0 || inset === 0) {
    return scale.copy();
  }
  const padMs = (inset * (t1 - t0)) / spanPx;
  return scale
    .copy()
    .domain([
      new Date(padStart ? t0 - padMs : t0),
      new Date(padEnd ? t1 + padMs : t1),
    ]);
};

export interface TimeBarLayout {
  /** One scale for both the marks and the x axis */
  scale: ScaleTime<number, number>;
  /** Rendered width, in px, of each bar/box */
  width: number;
  /** Width, in px, of one date slot; `width` never exceeds it */
  slotPx: number;
}

/**
 * Lays out bars/boxes on a time axis (review F1/F2 on #7/#16).
 *
 * The dates are treated as `steps + padSlots` equal slots across the plot,
 * where `steps` is the date span in cadence units (see `medianCadenceMs`) and
 * `padSlots` is half a slot for each end not pinned by `x.start` / `x.end`
 * (so 1 when neither is pinned). A regular series then fills the plot the way
 * a band scale would: `slot = range / (steps + padSlots)` and
 * `width = slot * (1 - paddingRatio)`. The domain is widened by half a slot
 * at each unpinned end, rather than shrinking the range, so each mark is
 * centred on its tick and neighbours are at least `slot * paddingRatio`
 * apart. At a pinned end the first/last mark is centred on the boundary when
 * its date equals the pinned value, so it can overhang by half a mark.
 *
 * `explicitWidth` (`x.time.barWidth`) replaces the cadence width when it is
 * finite and > 0, clamped to the slot so marks never overlap. With fewer
 * than two distinct dates the slot is the range split across the rows.
 */
export const createTimeBarLayout = <TData,>(
  data: TData[],
  x: TimeAxis,
  toDate: (d: TData) => Date | null,
  range: [number, number],
  paddingRatio: number,
  explicitWidth?: number
): TimeBarLayout => {
  const base = createTimeXScale(data, x, toDate, range);
  const rangePx = Math.abs(range[1] - range[0]);
  const [t0, t1] = base.domain().map(Number);
  const cadence = medianCadenceMs(data.map(toDate));
  const steps = (t1 - t0) / cadence;
  const rows = data.filter((d) => toDate(d) != null).length;
  // Half a slot of padding at each unpinned end only: `padTimeDomain` leaves
  // ends pinned by `x.start` / `x.end` alone, so the slot must not reserve
  // room there either, or the width no longer matches the tick spacing
  // (review-2 N2).
  const padSlots =
    (Number.isFinite(x.start) ? 0 : 0.5) + (Number.isFinite(x.end) ? 0 : 0.5);
  const slotPx =
    Number.isFinite(steps) && steps > 0 && steps + padSlots > 0
      ? rangePx / (steps + padSlots)
      : rangePx / Math.max(1, rows);
  const explicit = validBarWidth(explicitWidth);
  const width =
    explicit !== undefined
      ? Math.min(explicit, slotPx)
      : Math.max(1, slotPx * (1 - paddingRatio));
  return {
    scale: padTimeDomain(base, Math.max(slotPx, width) / 2, x),
    width,
    slotPx,
  };
};

export type TimeAxisIssue = 'dropped-rows' | 'invalid-bar-width';

/** Pure check behind `useTimeAxisWarnings`. */
export const getTimeAxisIssues = <TData,>(
  data: TData[],
  x: TimeAxis,
  checkBarWidth: boolean
): { issue: TimeAxisIssue; detail: string }[] => {
  const issues: { issue: TimeAxisIssue; detail: string }[] = [];
  const toDate = makeDateAccessor<TData>(x);
  const dropped = data.filter((d) => toDate(d) == null).length;
  if (dropped > 0) issues.push({ issue: 'dropped-rows', detail: String(dropped) });
  const barWidth = x.time?.barWidth;
  if (checkBarWidth && barWidth !== undefined && validBarWidth(barWidth) === undefined) {
    issues.push({ issue: 'invalid-bar-width', detail: String(barWidth) });
  }
  return issues;
};

const TIME_ISSUE_MESSAGES: Record<TimeAxisIssue, (key: string, detail: string) => string> = {
  'dropped-rows': (key, detail) =>
    `${detail} row(s) have an x.${key} value that isn't a valid date for the time axis (check x.time.format / isISO); they are not drawn`,
  'invalid-bar-width': (_key, detail) =>
    `x.time.barWidth must be a positive number of pixels, got ${detail}; it is ignored and the width is inferred from the date cadence`,
};

/**
 * Dev-only warnings for a time x axis: rows dropped because their date can't
 * be read, and an unusable `x.time.barWidth`. Logged once per distinct
 * problem, not on every render. No-op unless `x.scalingFunction` is 'time'.
 */
export const useTimeAxisWarnings = <TData,>(
  chart: string,
  id: string,
  data: TData[],
  x: AxisConfig<TData>,
  { checkBarWidth = true }: { checkBarWidth?: boolean } = {}
): void => {
  const isTime = x.scalingFunction === 'time';
  const { key, start, end } = x;
  const { format, isISO, utc, barWidth } = x.time ?? {};
  const issuesKey = useMemo(
    () =>
      isTime
        ? JSON.stringify(
            getTimeAxisIssues(
              data,
              { key, start, end, time: { format, isISO, utc, barWidth } },
              checkBarWidth
            )
          )
        : '[]',
    [isTime, data, key, start, end, format, isISO, utc, barWidth, checkBarWidth]
  );

  useEffect(() => {
    if (!isDevEnvironment()) return;
    (JSON.parse(issuesKey) as { issue: TimeAxisIssue; detail: string }[]).forEach(
      ({ issue, detail }) =>
        console.warn(
          `[headless-charts] ${chart}#${id}: ${TIME_ISSUE_MESSAGES[issue](String(key), detail)}`
        )
    );
  }, [chart, id, key, issuesKey]);
};
