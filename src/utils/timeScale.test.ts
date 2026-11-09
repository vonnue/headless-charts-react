import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { scaleTime } from 'd3-scale';

import type { AxisConfig } from '@/types';
import {
  createTimeBarLayout,
  createTimeXScale,
  getTimeAxisIssues,
  isUtcTime,
  makeDateAccessor,
  makeDateFormatter,
  makeDateParser,
  medianCadenceMs,
  padTimeDomain,
  timePosition,
  useTimeAxisWarnings,
  utcSuggestionSample,
  validBarWidth,
} from './timeScale';
import { resetDevWarnings } from '@/utils/devEnvironment';

// warnOnceInDev remembers keys for the page's lifetime; start each test clean.
afterEach(() => {
  resetDevWarnings();
});

// Module-local declaration so this compiles without @types/node.
declare const process: { env: Record<string, string | undefined> };

type Row = { date: string };

const DAY_MS = 24 * 60 * 60 * 1000;
const utcDay = (day: number) => new Date(Date.UTC(2025, 0, day));

describe('makeDateAccessor', () => {
  it('parses ISO timestamps when x.time.isISO is set', () => {
    const toDate = makeDateAccessor<Row>({ key: 'date', time: { isISO: true } });

    expect(toDate({ date: '2025-01-06T08:30:00.000Z' })!.getTime()).toBe(
      Date.UTC(2025, 0, 6, 8, 30)
    );
  });

  it('uses x.time.format when isISO is not set', () => {
    const toDate = makeDateAccessor<Row>({ key: 'date', time: { format: '%d/%m/%Y' } });

    const parsed = toDate({ date: '06/01/2025' })!;
    expect([parsed.getFullYear(), parsed.getMonth(), parsed.getDate()]).toStrictEqual([
      2025, 0, 6,
    ]);
  });

  it("defaults to '%Y-%m-%d' when no time config is given", () => {
    const toDate = makeDateAccessor<Row>({ key: 'date' });

    const parsed = toDate({ date: '2025-01-06' })!;
    expect([parsed.getFullYear(), parsed.getMonth(), parsed.getDate()]).toStrictEqual([
      2025, 0, 6,
    ]);
  });

  it('parses x.time.format in UTC when x.time.utc is set', () => {
    const toDate = makeDateAccessor<Row>({ key: 'date', time: { utc: true } });

    expect(toDate({ date: '2025-01-06' })!.getTime()).toBe(Date.UTC(2025, 0, 6));
  });

  it('returns null for a value the configured format cannot parse', () => {
    // The #15 failure mode: ISO strings read with the default format.
    const toDate = makeDateAccessor<Row>({ key: 'date' });

    expect(toDate({ date: '2025-01-06T08:30:00.000Z' })).toBeNull();
  });
});

describe('makeDateParser (F6: Date and number inputs)', () => {
  const parse = makeDateParser({ key: 'date', time: { isISO: true } });

  it('passes valid Date objects through', () => {
    const d = utcDay(6);
    expect(parse(d)).toBe(d);
  });

  it('reads finite numbers as epoch milliseconds', () => {
    expect(parse(Date.UTC(2025, 0, 6))!.getTime()).toBe(Date.UTC(2025, 0, 6));
  });

  it.each([
    ['an invalid Date', new Date(NaN)],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['null', null],
    ['undefined', undefined],
    ['an object', {}],
    ['a boolean', true],
    ['an unparseable string', 'not a date'],
  ])('returns null for %s', (_label, value) => {
    expect(parse(value)).toBeNull();
  });
});

describe('makeDateFormatter', () => {
  const d = new Date(2025, 0, 6, 9, 30);

  it('prefers tooltipFormat, then format, then %Y-%m-%d', () => {
    expect(makeDateFormatter({ key: 'k' })(d)).toBe('2025-01-06');
    expect(makeDateFormatter({ key: 'k', time: { format: '%d/%m' } })(d)).toBe('06/01');
    expect(
      makeDateFormatter({ key: 'k', time: { format: '%d/%m', tooltipFormat: '%b %d %H:%M' } })(d)
    ).toBe('Jan 06 09:30');
  });
});

describe('createTimeXScale', () => {
  const rows: Row[] = [
    { date: '2025-01-13T00:00:00.000Z' },
    { date: '2025-01-06T00:00:00.000Z' },
    { date: '2025-01-27T00:00:00.000Z' },
  ];
  const x: AxisConfig<Row> = { key: 'date', scalingFunction: 'time', time: { isISO: true } };
  const toDate = makeDateAccessor<Row>(x);

  it('spans the earliest to the latest date, regardless of row order', () => {
    const scale = createTimeXScale(rows, x, toDate, [40, 460]);

    expect(scale.domain().map((d) => d.getTime())).toStrictEqual([
      utcDay(6).getTime(),
      utcDay(27).getTime(),
    ]);
    expect(scale.range()).toStrictEqual([40, 460]);
  });

  it('skips rows whose date is null', () => {
    const scale = createTimeXScale(
      [...rows, { date: 'garbage' }],
      x,
      toDate,
      [40, 460]
    );

    expect(scale.domain().map((d) => d.getTime())).toStrictEqual([
      utcDay(6).getTime(),
      utcDay(27).getTime(),
    ]);
  });

  it('maps the domain ends exactly onto the range ends (no .nice())', () => {
    const offBoundary: Row[] = [
      { date: '2025-01-06T07:13:00.000Z' },
      { date: '2025-01-09T19:47:00.000Z' },
    ];
    const scale = createTimeXScale(offBoundary, x, toDate, [40, 460]);

    expect(scale(toDate(offBoundary[0])!)).toBeCloseTo(40, 6);
    expect(scale(toDate(offBoundary[1])!)).toBeCloseTo(460, 6);
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

describe('validBarWidth (F4)', () => {
  it.each([
    [12, 12],
    [0.5, 0.5],
    [0, undefined],
    [-4, undefined],
    [NaN, undefined],
    [Infinity, undefined],
    [undefined, undefined],
    ['12', undefined],
  ])('validBarWidth(%s) -> %s', (input, expected) => {
    expect(validBarWidth(input)).toBe(expected);
  });
});

describe('padTimeDomain', () => {
  const scale = scaleTime().domain([utcDay(1), utcDay(5)]).range([40, 460]);
  const x = { start: undefined, end: undefined };

  it('widens the domain so insetPx is free at each end; range unchanged', () => {
    const padded = padTimeDomain(scale, 10, x);

    expect(padded.range()).toStrictEqual([40, 460]);
    expect(padded(utcDay(1))).toBeCloseTo(50, 6);
    expect(padded(utcDay(5))).toBeCloseTo(450, 6);
    // the original (unpadded) scale is untouched
    expect(scale.domain()).toStrictEqual([utcDay(1), utcDay(5)]);
  });

  it('leaves ends pinned by x.start / x.end alone', () => {
    const padded = padTimeDomain(scale, 10, { start: utcDay(1).getTime(), end: undefined });

    expect(padded(utcDay(1))).toBeCloseTo(40, 6);
    expect(padded(utcDay(5))).toBeCloseTo(450, 6);
  });

  it('clamps so the two ends never cross on a tiny range', () => {
    const tiny = scaleTime().domain([utcDay(1), utcDay(5)]).range([0, 10]);
    const padded = padTimeDomain(tiny, 50, x);

    expect(padded(utcDay(1))).toBeCloseTo(4.5, 6);
    expect(padded(utcDay(5))).toBeCloseTo(5.5, 6);
  });

  it('is a no-op copy for a zero inset or a single-date domain', () => {
    expect(padTimeDomain(scale, 0, x).domain()).toStrictEqual(scale.domain());
    const single = scaleTime().domain([utcDay(1), utcDay(1)]).range([40, 460]);
    expect(padTimeDomain(single, 10, x).domain()).toStrictEqual(single.domain());
  });
});

describe('createTimeBarLayout (F1/F2: one scale, slots, no overlap)', () => {
  const RANGE: [number, number] = [40, 460]; // 420px, as ColumnChart in a 500px svg
  const x: AxisConfig<{ date: Date }> = { key: 'date', scalingFunction: 'time' };
  const toDate = makeDateAccessor<{ date: Date }>(x);
  const daily = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ date: utcDay(1 + i) }));

  it.each([
    [5, 67.2, 16.8],
    [2, 168, 42],
  ])('N=%i over 420px with padding 0.2: width %f, gap %f', (n, width, gap) => {
    const rows = daily(n);
    const layout = createTimeBarLayout(rows, x, toDate, RANGE, 0.2);
    const centers = rows.map((r) => layout.scale(r.date));

    expect(layout.width).toBeCloseTo(width, 6);
    expect(centers[1] - centers[0] - layout.width).toBeCloseTo(gap, 6);
  });

  it.each([2, 3, 4, 5])(
    'N=%i evenly spaced: no overlap, gap >= slot * padding, edges inside the range',
    (n) => {
      const p = 0.2;
      const rows = daily(n);
      const layout = createTimeBarLayout(rows, x, toDate, RANGE, p);
      const lefts = rows.map((r) => layout.scale(r.date) - layout.width / 2);

      for (let i = 1; i < n; i++) {
        expect(lefts[i] - (lefts[i - 1] + layout.width)).toBeGreaterThanOrEqual(
          layout.slotPx * p - 1e-6
        );
      }
      expect(lefts[0]).toBeGreaterThanOrEqual(RANGE[0] - 1e-6);
      expect(lefts[n - 1] + layout.width).toBeLessThanOrEqual(RANGE[1] + 1e-6);
    }
  );

  it('returns the scale the axis draws with: its range is the full plot', () => {
    const layout = createTimeBarLayout(daily(4), x, toDate, RANGE, 0.2);

    expect(layout.scale.range()).toStrictEqual(RANGE);
  });

  it('uses an explicit barWidth, capped at one slot, and reports the cap', () => {
    const rows = daily(5); // slot = 84px
    const fits = createTimeBarLayout(rows, x, toDate, RANGE, 0.2, 30);
    const capped = createTimeBarLayout(rows, x, toDate, RANGE, 0.2, 500);
    expect(fits.width).toBe(30);
    expect(fits.cappedBarWidth).toBeUndefined();
    expect(capped.width).toBeCloseTo(84, 6);
    expect(capped.cappedBarWidth).toBe(500);
  });

  it.each([NaN, Infinity, 0, -10])('ignores an unusable barWidth (%s)', (bad) => {
    expect(createTimeBarLayout(daily(5), x, toDate, RANGE, 0.2, bad).width).toBeCloseTo(
      67.2,
      6
    );
  });

  it('centres a single date in the plot', () => {
    const rows = daily(1);
    const layout = createTimeBarLayout(rows, x, toDate, RANGE, 0.2);

    expect(layout.scale(rows[0].date)).toBeCloseTo(250, 6);
    expect(layout.width).toBeCloseTo(336, 6);
  });

  it('keeps the slot from the cadence when a period is missing', () => {
    // Days 1, 2, 3 and 5: cadence 1 day, span 4 steps -> 5 slots of 84px
    const rows = [1, 2, 3, 5].map((d) => ({ date: utcDay(d) }));
    const layout = createTimeBarLayout(rows, x, toDate, RANGE, 0.2);

    expect(layout.slotPx).toBeCloseTo(84, 6);
    expect(layout.scale(rows[0].date) - layout.width / 2).toBeCloseTo(40 + 8.4, 6);
  });
});

describe('createTimeBarLayout with x.start / x.end pinned (review-2 N2)', () => {
  const RANGE: [number, number] = [40, 460];
  const HALF_DAY = DAY_MS / 2;
  const rows = Array.from({ length: 5 }, (_, i) => ({ date: utcDay(1 + i) }));
  const layoutFor = (start?: number, end?: number) => {
    const x: AxisConfig<{ date: Date }> = { key: 'date', scalingFunction: 'time', start, end };
    return createTimeBarLayout(rows, x, makeDateAccessor<{ date: Date }>(x), RANGE, 0.2);
  };
  const centersOf = (layout: ReturnType<typeof layoutFor>) =>
    rows.map((r) => layout.scale(r.date));

  it('pinned at the first/last date: the slot is the real tick spacing (no padding slots)', () => {
    const layout = layoutFor(utcDay(1).getTime(), utcDay(5).getTime());
    const centers = centersOf(layout);

    // 4 steps, no padded ends: 420 / 4 = 105px, not 420 / 5 = 84px
    expect(layout.slotPx).toBeCloseTo(105, 6);
    expect(layout.width).toBeCloseTo(84, 6);
    centers.forEach((c, i) => expect(c).toBeCloseTo(40 + 105 * i, 6));
    for (let i = 1; i < centers.length; i++) {
      expect(centers[i] - centers[i - 1] - layout.width).toBeCloseTo(105 * 0.2, 6);
    }
    // Documented: a mark on a pinned boundary overhangs by half a bar
    expect(centers[0] - layout.width / 2).toBeCloseTo(40 - 42, 6);
  });

  it('pinned half a cadence outside the data: marks on their ticks, no overhang, correct width', () => {
    const layout = layoutFor(
      utcDay(1).getTime() - HALF_DAY,
      utcDay(5).getTime() + HALF_DAY
    );
    const centers = centersOf(layout);

    // 5 steps between the pins, no padded ends: 5 slots of 84px
    expect(layout.slotPx).toBeCloseTo(84, 6);
    expect(layout.width).toBeCloseTo(67.2, 6);
    expect(layout.scale.domain().map(Number)).toStrictEqual([
      utcDay(1).getTime() - HALF_DAY,
      utcDay(5).getTime() + HALF_DAY,
    ]);
    centers.forEach((c, i) => expect(c).toBeCloseTo(40 + 42 + 84 * i, 6));
    expect(centers[0] - layout.width / 2).toBeGreaterThanOrEqual(40 - 1e-6);
    expect(centers[4] + layout.width / 2).toBeLessThanOrEqual(460 + 1e-6);
  });

  it.each([
    ['start', utcDay(1).getTime() - HALF_DAY, undefined],
    ['end', undefined, utcDay(5).getTime() + HALF_DAY],
  ])('only %s pinned: half a padding slot on the free end', (_side, start, end) => {
    const layout = layoutFor(start, end);
    const centers = centersOf(layout);

    // 4.5 steps + 0.5 padding slot = 5 slots of 84px
    expect(layout.slotPx).toBeCloseTo(84, 6);
    expect(layout.width).toBeCloseTo(67.2, 6);
    for (let i = 1; i < centers.length; i++) {
      expect(centers[i] - centers[i - 1]).toBeCloseTo(84, 6);
    }
    expect(centers[0] - layout.width / 2).toBeGreaterThanOrEqual(40 - 1e-6);
    expect(centers[4] + layout.width / 2).toBeLessThanOrEqual(460 + 1e-6);
  });
});

describe('getTimeAxisIssues (F4/F6 dev warnings)', () => {
  const x: AxisConfig = { key: 'date', scalingFunction: 'time', time: { isISO: true } };

  it('counts rows whose date cannot be read', () => {
    const data = [{ date: '2025-01-01' }, { date: 'nope' }, { date: null }, { date: utcDay(3) }];
    expect(getTimeAxisIssues(data, x, true)).toStrictEqual([
      { issue: 'dropped-rows', detail: '2' },
    ]);
  });

  it('flags an unusable barWidth only when the chart reads it', () => {
    const bad = { ...x, time: { ...x.time, barWidth: -3 } };
    expect(getTimeAxisIssues([], bad, true)).toStrictEqual([
      { issue: 'invalid-bar-width', detail: '-3' },
    ]);
    expect(getTimeAxisIssues([], bad, false)).toStrictEqual([]);
    expect(getTimeAxisIssues([], { ...x, time: { barWidth: 8 } }, true)).toStrictEqual([]);
  });
});

describe('utcSuggestionSample (review-2 N1, #25: date-only ISO with utc: false)', () => {
  const iso: AxisConfig = {
    key: 'date',
    scalingFunction: 'time',
    time: { isISO: true, utc: false },
  };

  it.each([
    [['2025-01-01', '2025-01-02']],
    [['2025-01-01T00:00:00Z', '2025-01-02T00:00:00.000Z']],
    [['2025-01-01T00:00:00+00:00', '2025-01-02T00:00:00-0000']],
    [['2025-01-01T00:00Z', '2025-01-02T00:00+0000']],
    [['2025-01', '2025-02']],
    [['2025', '2026']],
  ])('suggests utc when every value is date-only or UTC midnight: %j', (dates) => {
    const data = dates.map((date) => ({ date }));
    expect(utcSuggestionSample(data, iso)).toBe(dates[0]);
    expect(getTimeAxisIssues(data, iso, true)).toStrictEqual([
      { issue: 'suggest-utc', detail: dates[0] },
    ]);
  });

  it('stays quiet with utc: true or unset, without isISO, for offset datetimes, mixed values or no data', () => {
    const dateOnly = [{ date: '2025-01-01' }, { date: '2025-01-02' }];
    expect(utcSuggestionSample(dateOnly, { ...iso, time: { isISO: true, utc: true } })).toBeUndefined();
    // #25: unset utc means UTC for isISO, so there is nothing to suggest
    expect(utcSuggestionSample(dateOnly, { ...iso, time: { isISO: true } })).toBeUndefined();
    expect(getTimeAxisIssues(dateOnly, { ...iso, time: { isISO: true } }, true)).toStrictEqual([]);
    expect(utcSuggestionSample(dateOnly, { ...iso, time: {} })).toBeUndefined();
    expect(
      utcSuggestionSample([{ date: '2025-01-01T09:00:00+05:30' }], iso)
    ).toBeUndefined();
    expect(utcSuggestionSample([{ date: '2025-01-01T09:00:00' }], iso)).toBeUndefined();
  });

  it.each([
    [['2025-01-01T14:37:00Z', '2025-01-02T14:37:00Z']],
    [['2025-01-01T14:37:00.123Z', '2025-01-02T14:37:00.123Z']],
    [['2025-01-01T09:00:00+00:00', '2025-01-02T09:00:00+00:00']],
    [['2025-01-01T00:00:00.001Z', '2025-01-02T00:00:00.001Z']],
    // one real timestamp among midnights means these are instants, not dates
    [['2025-01-01T00:00:00Z', '2025-01-02T14:37:00Z']],
  ])('stays quiet for real UTC timestamps (review-3 R1): %j', (dates) => {
    const data = dates.map((date) => ({ date }));
    expect(utcSuggestionSample(data, iso)).toBeUndefined();
    expect(getTimeAxisIssues(data, iso, true)).toStrictEqual([]);
    expect(utcSuggestionSample([{ date: '2025-01-01' }, { date: utcDay(2) }], iso)).toBeUndefined();
    expect(utcSuggestionSample([], iso)).toBeUndefined();
  });
});

describe('x.time.utc in a non-UTC time zone (F3)', () => {
  const originalTZ = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = 'America/New_York';
  });
  afterAll(() => {
    process.env.TZ = originalTZ;
  });

  const nye = new Date(Date.UTC(2024, 11, 31)).toISOString(); // 2024-12-31T00:00:00.000Z

  it('precondition: the zone is behind UTC, so local time reads Dec 30', () => {
    expect(new Date(nye).getDate()).toBe(30);
  });

  it('isISO defaults to UTC (#25): UTC midnight and date-only read as Dec 31', () => {
    const x: AxisConfig = { key: 'date', time: { isISO: true } };
    expect(isUtcTime(x)).toBe(true);
    expect(makeDateFormatter(x)(makeDateParser(x)(nye)!)).toBe('2024-12-31');
    expect(makeDateFormatter(x)(makeDateParser(x)('2024-12-31')!)).toBe('2024-12-31');
  });

  it('utc: false keeps local time for ISO data: the documented caveat', () => {
    const x: AxisConfig = { key: 'date', time: { isISO: true, utc: false } };
    expect(isUtcTime(x)).toBe(false);
    expect(makeDateFormatter(x)(makeDateParser(x)(nye)!)).toBe('2024-12-30');
  });

  it('non-ISO format strings stay local by default (#25 only flips isISO)', () => {
    const x: AxisConfig = { key: 'date', time: { format: '%Y-%m-%d' } };
    expect(isUtcTime(x)).toBe(false);
    expect(isUtcTime({ time: undefined })).toBe(false);
    const parsed = makeDateParser(x)('2024-12-31')!;
    expect([parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), parsed.getHours()]).toStrictEqual([
      2024, 11, 31, 0,
    ]);
    expect(makeDateFormatter(x)(parsed)).toBe('2024-12-31');
    expect(
      createTimeXScale([{ date: '2024-12-30' }, { date: '2025-01-02' }], x, makeDateAccessor(x), [0, 300])
        .ticks(4)
        .every((t) => t.getHours() === 0)
    ).toBe(true);
  });

  it('utc: true formats the UTC calendar day', () => {
    const x: AxisConfig = { key: 'date', time: { isISO: true, utc: true } };
    expect(makeDateFormatter(x)(makeDateParser(x)(nye)!)).toBe('2024-12-31');
  });

  it('utc: true parses format strings as UTC midnight', () => {
    const x: AxisConfig = { key: 'date', time: { utc: true } };
    expect(makeDateParser(x)('2024-12-31')!.toISOString()).toBe(nye);
  });

  it('utc: true gives a scaleUtc whose ticks fall on UTC midnights', () => {
    const x: AxisConfig = { key: 'date', time: { isISO: true, utc: true } };
    const toDate = makeDateAccessor<{ date: string }>(x);
    const rows = [0, 1, 2, 3].map((i) => ({
      date: new Date(Date.UTC(2024, 11, 29 + i)).toISOString(),
    }));
    const scale = createTimeXScale(rows, x, toDate, [0, 300]);
    const ticks = scale.ticks(4);

    expect(ticks.length).toBeGreaterThan(0);
    ticks.forEach((t) => expect(t.getUTCHours()).toBe(0));
    // UTC multi-format labels 2025-01-01T00:00Z as the year boundary
    expect(scale.tickFormat()(ticks[ticks.length - 1])).toBe('2025');
    // local scaleTime would put ticks on New York midnights (05:00 UTC)
    const local = createTimeXScale(rows, { ...x, time: { isISO: true, utc: false } }, toDate, [0, 300]);
    local.ticks(4).forEach((t) => expect(t.getUTCHours()).toBe(5));
    // #25: unset utc with isISO is a scaleUtc too
    const byDefault = createTimeXScale(rows, { ...x, time: { isISO: true } }, toDate, [0, 300]);
    byDefault.ticks(4).forEach((t) => expect(t.getUTCHours()).toBe(0));
  });

});

describe('timePosition (review-2 N4)', () => {
  const scale = scaleTime()
    .domain([new Date(Date.UTC(2024, 0, 1)), new Date(Date.UTC(2024, 0, 11))])
    .range([0, 100]);
  const toDate = makeDateAccessor<{ date: string }>({
    key: 'date',
    time: { isISO: true },
  });
  const pos = timePosition(scale, toDate);

  it('maps a dated row onto the scale', () => {
    expect(pos({ date: '2024-01-06T00:00:00Z' })).toBeCloseTo(50, 6);
  });

  it('maps an unreadable date to NaN instead of the scale of null', () => {
    expect(pos({ date: 'garbage' })).toBeNaN();
  });
});

describe('useTimeAxisWarnings outside development (review-3 R4)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // Rows whose x value counts how often it is read, to observe the scan.
  const countingRows = () => {
    let reads = 0;
    const rows = ['2025-01-01', '2025-01-02', 'garbage'].map((value) => {
      const row = {} as { date: string };
      Object.defineProperty(row, 'date', {
        enumerable: true,
        get: () => {
          reads += 1;
          return value;
        },
      });
      return row;
    });
    return { rows, reads: () => reads };
  };
  const x: AxisConfig = { key: 'date', scalingFunction: 'time', time: { isISO: true } };

  it('does not scan the rows in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { rows, reads } = countingRows();
    renderHook(() => useTimeAxisWarnings('ColumnChart', 'prod-scan', rows, x));
    expect(reads()).toBe(0);
  });

  it('scans the rows in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { rows, reads } = countingRows();
    renderHook(() => useTimeAxisWarnings('ColumnChart', 'dev-scan', rows, x));
    expect(reads()).toBeGreaterThan(0);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('ColumnChart#dev-scan: 1 row(s)'));
    warn.mockRestore();
  });
});
