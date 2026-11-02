import { describe, expect, it } from 'vitest';
import { scaleTime } from 'd3-scale';

import type { AxisConfig } from '@/types';
import {
  createTimeXScale,
  insetTimeScale,
  makeDateAccessor,
  medianCadenceMs,
  timeMarkWidth,
} from './timeScale';

type Row = { date: string };

const DAY_MS = 24 * 60 * 60 * 1000;
const utcDay = (day: number) => new Date(Date.UTC(2025, 0, day));

describe('makeDateAccessor', () => {
  it('parses ISO timestamps when x.time.isISO is set', () => {
    const toDate = makeDateAccessor<Row>({ key: 'date', time: { isISO: true } });

    expect(toDate({ date: '2025-01-06T08:30:00.000Z' }).getTime()).toBe(
      Date.UTC(2025, 0, 6, 8, 30)
    );
  });

  it('uses x.time.format when isISO is not set', () => {
    const toDate = makeDateAccessor<Row>({ key: 'date', time: { format: '%d/%m/%Y' } });

    const parsed = toDate({ date: '06/01/2025' });
    expect([parsed.getFullYear(), parsed.getMonth(), parsed.getDate()]).toStrictEqual([
      2025, 0, 6,
    ]);
  });

  it("defaults to '%Y-%m-%d' when no time config is given", () => {
    const toDate = makeDateAccessor<Row>({ key: 'date' });

    const parsed = toDate({ date: '2025-01-06' });
    expect([parsed.getFullYear(), parsed.getMonth(), parsed.getDate()]).toStrictEqual([
      2025, 0, 6,
    ]);
  });

  it('returns null for a value the configured format cannot parse', () => {
    // The #15 failure mode: ISO strings read with the default format.
    const toDate = makeDateAccessor<Row>({ key: 'date' });

    expect(toDate({ date: '2025-01-06T08:30:00.000Z' })).toBeNull();
  });
});

describe('createTimeXScale', () => {
  const rows: Row[] = [
    { date: '2025-01-13T00:00:00.000Z' },
    { date: '2025-01-06T00:00:00.000Z' },
    { date: '2025-01-27T00:00:00.000Z' },
  ];
  const x: AxisConfig<Row> = { key: 'date', scalingFunction: 'time', time: { isISO: true } };
  const toDate = makeDateAccessor(x);

  it('spans the earliest to the latest date, regardless of row order', () => {
    const scale = createTimeXScale(rows, x, toDate, [40, 460]);

    expect(scale.domain().map((d) => d.getTime())).toStrictEqual([
      utcDay(6).getTime(),
      utcDay(27).getTime(),
    ]);
    expect(scale.range()).toStrictEqual([40, 460]);
  });

  it('maps the domain ends exactly onto the range ends (no .nice(), see #16)', () => {
    // Off-boundary instants: .nice() would round these out to whole days
    // and move the first/last dates inward from the range ends.
    const offBoundary: Row[] = [
      { date: '2025-01-06T07:13:00.000Z' },
      { date: '2025-01-09T19:47:00.000Z' },
    ];
    const scale = createTimeXScale(offBoundary, x, toDate, [40, 460]);

    expect(scale(toDate(offBoundary[0]))).toBeCloseTo(40, 6);
    expect(scale(toDate(offBoundary[1]))).toBeCloseTo(460, 6);
  });

  it('uses x.start and x.end over the data extent when given', () => {
    const start = utcDay(1).getTime();
    const end = utcDay(31).getTime();
    const scale = createTimeXScale(rows, { ...x, start, end }, toDate, [0, 300]);

    expect(scale.domain().map((d) => d.getTime())).toStrictEqual([start, end]);
  });

  it('has an invalid domain, rather than throwing, for empty data', () => {
    const scale = createTimeXScale([], x, toDate, [0, 100]);

    expect(scale.domain().every((d) => Number.isNaN(d.getTime()))).toBe(true);
  });
});

describe('medianCadenceMs', () => {
  it('returns the single gap for evenly spaced dates', () => {
    expect(medianCadenceMs([utcDay(1), utcDay(8), utcDay(15)])).toBe(7 * DAY_MS);
  });

  it('ignores one large missing-period gap (median, not mean)', () => {
    const dates = [utcDay(1), utcDay(2), utcDay(3), utcDay(4), utcDay(20)];

    expect(medianCadenceMs(dates)).toBe(DAY_MS);
  });

  it('averages the two middle gaps for an even number of gaps', () => {
    // Four gaps of 1, 2, 3 and 10 days: median is (2 + 3) / 2.
    const dates = [utcDay(1), utcDay(2), utcDay(4), utcDay(7), utcDay(17)];

    expect(medianCadenceMs(dates)).toBe(2.5 * DAY_MS);
  });

  it('deduplicates repeated timestamps and sorts unordered input', () => {
    const dates = [utcDay(15), utcDay(1), utcDay(8), utcDay(8), utcDay(1)];

    expect(medianCadenceMs(dates)).toBe(7 * DAY_MS);
  });

  it('skips null, undefined and invalid dates', () => {
    const dates = [utcDay(1), null, undefined, new Date(NaN), utcDay(3)];

    expect(medianCadenceMs(dates)).toBe(2 * DAY_MS);
  });

  it.each([
    ['no dates', []],
    ['one date', [utcDay(1)]],
    ['identical dates', [utcDay(1), utcDay(1), utcDay(1)]],
  ])('returns NaN for %s', (_label, dates: Date[]) => {
    expect(medianCadenceMs(dates)).toBeNaN();
  });
});

describe('timeMarkWidth', () => {
  // 4 days over 400px -> 100px per day.
  const scale = scaleTime().domain([utcDay(1), utcDay(5)]).range([0, 400]);
  const dailyDates = [utcDay(1), utcDay(2), utcDay(3), utcDay(4), utcDay(5)];

  it('is one cadence step in px, shrunk by paddingRatio', () => {
    expect(
      timeMarkWidth({ scale, dates: dailyDates, rowCount: 5, paddingRatio: 0.2 })
    ).toBeCloseTo(80, 6);
  });

  it('uses the explicit width as-is, without padding', () => {
    expect(
      timeMarkWidth({
        scale,
        dates: dailyDates,
        rowCount: 5,
        paddingRatio: 0.5,
        explicitWidth: 13,
      })
    ).toBe(13);
  });

  it('falls back to range / rowCount when there is no cadence', () => {
    const sameDay = [utcDay(1), utcDay(1), utcDay(1), utcDay(1)];

    expect(
      timeMarkWidth({ scale, dates: sameDay, rowCount: 4, paddingRatio: 0.2 })
    ).toBeCloseTo(80, 6);
  });

  it('treats rowCount 0 as 1 in the fallback', () => {
    expect(timeMarkWidth({ scale, dates: [], rowCount: 0, paddingRatio: 0 })).toBe(400);
  });

  it('never goes below 1px', () => {
    expect(
      timeMarkWidth({ scale, dates: dailyDates, rowCount: 5, paddingRatio: 1 })
    ).toBe(1);
  });

  it('ignores a non-finite explicit width', () => {
    expect(
      timeMarkWidth({
        scale,
        dates: dailyDates,
        rowCount: 5,
        paddingRatio: 0,
        explicitWidth: NaN,
      })
    ).toBeCloseTo(100, 6);
  });
});

describe('insetTimeScale', () => {
  const scale = scaleTime().domain([utcDay(1), utcDay(5)]).range([40, 460]);

  it('pulls the range in by insetPx on each side and keeps the domain', () => {
    const inset = insetTimeScale(scale, 10);

    expect(inset.range()).toStrictEqual([50, 450]);
    expect(inset.domain()).toStrictEqual(scale.domain());
    expect(inset(utcDay(1))).toBeCloseTo(50, 6);
    expect(inset(utcDay(5))).toBeCloseTo(450, 6);
  });

  it('returns a copy and leaves the original (axis) scale untouched', () => {
    insetTimeScale(scale, 10);

    expect(scale.range()).toStrictEqual([40, 460]);
  });

  it('clamps so the two ends never cross on a tiny range', () => {
    const tiny = scaleTime().domain([utcDay(1), utcDay(5)]).range([0, 10]);
    const [start, end] = insetTimeScale(tiny, 50).range();

    expect(start).toBeLessThan(end);
    expect(start).toBeCloseTo(4.5, 6);
    expect(end).toBeCloseTo(5.5, 6);
  });

  it('is a no-op copy for a zero inset', () => {
    expect(insetTimeScale(scale, 0).range()).toStrictEqual([40, 460]);
  });
});
