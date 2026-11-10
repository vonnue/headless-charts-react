import { fireEvent, render, screen } from '@testing-library/react';
import { scaleLinear } from 'd3-scale';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { decisionTree, resolveChartRequest } from '@/catalog';
import { resetDevWarnings } from '@/utils/devEnvironment';

import CandlestickChart, { type CandleDatum } from '.';
import { isUtcTime } from './ohlc';

const STYLE = { width: '400px', height: '300px' } as const;
const MARGIN = { top: 20, right: 20, bottom: 40, left: 50 } as const;
const KEYS = {
  open: { key: 'o' },
  high: { key: 'h' },
  low: { key: 'l' },
  close: { key: 'c' },
} as const;
const X = { key: 'date', time: { isISO: true } } as const;

type Row = { date: string | Date | number; o: number; h: number; l: number; c: number; v?: number };

const ROWS: Row[] = [
  { date: '2025-01-06', o: 100, h: 110, l: 95, c: 105, v: 10 }, // Mon up
  { date: '2025-01-03', o: 102, h: 104, l: 98, c: 100, v: 20 }, // Fri down (unsorted)
  { date: '2025-01-07', o: 105, h: 108, l: 101, c: 105, v: 5 }, // Tue flat
];

const SORTED_ISO = [
  '2025-01-03T00:00:00.000Z',
  '2025-01-06T00:00:00.000Z',
  '2025-01-07T00:00:00.000Z',
];

const WIDTH = 400;
const HEIGHT = 300;
const plotOf = (
  margin: { top: number; right: number; bottom: number; left: number } = MARGIN,
  width = WIDTH,
  height = HEIGHT
) => ({
  left: margin.left,
  right: width - margin.right,
  top: margin.top,
  bottom: height - margin.bottom,
  width: width - margin.left - margin.right,
  height: height - margin.top - margin.bottom,
});

const candles = (root: ParentNode = document.body) =>
  Array.from(root.querySelectorAll('[data-testid="candle"]'));
const hits = (root: ParentNode = document.body) =>
  Array.from(root.querySelectorAll('[data-testid="candle-hit"]'));
const bodies = (root: ParentNode = document.body) =>
  Array.from(root.querySelectorAll('[data-testid="candle-body"]'));
const wicks = (root: ParentNode = document.body) =>
  Array.from(root.querySelectorAll('[data-testid="candle-wick"]'));
const volumeBars = (root: ParentNode = document.body) =>
  Array.from(root.querySelectorAll('[data-testid="volume-bar"]'));
const tooltipOf = (id: string): HTMLElement | null => document.getElementById(`tooltip-${id}`);
const num = (el: Element | null | undefined, a: string) => Number(el?.getAttribute(a));
const hasTransition = (node: Element | null): boolean => node !== null && '__transition' in node;
const d3On = (node: Element | null): unknown =>
  node !== null && '__on' in node ? (node as unknown as { __on: unknown }).__on : undefined;

const tickTexts = (testId: string) =>
  Array.from(document.querySelectorAll(`[data-testid="${testId}"] .tick text`)).map(
    (t) => t.textContent ?? ''
  );

const axisTicks = (testId: string) =>
  Array.from(document.querySelectorAll(`[data-testid="${testId}"] .tick`)).map((tick) => {
    const transform = tick.getAttribute('transform') ?? '';
    const m = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
    const text = Number(tick.querySelector('text')?.textContent?.replace(/,/g, ''));
    return {
      x: m ? Number(m[1]) : NaN,
      y: m ? Number(m[2]) : NaN,
      value: text,
      datum: (tick as unknown as { __data__: unknown }).__data__,
      label: tick.querySelector('text')?.textContent ?? '',
    };
  });

const priceDomain = (
  lowsHighs: { low: number; high: number }[],
  pins?: { start?: number; end?: number }
): [number, number] => {
  let lo = Math.min(...lowsHighs.map((d) => d.low));
  let hi = Math.max(...lowsHighs.map((d) => d.high));
  let niced: number[];
  if (lo === hi) niced = [lo - 1, hi + 1];
  else niced = scaleLinear().domain([lo, hi]).nice().domain();
  let start = pins?.start;
  let end = pins?.end;
  if (start !== undefined && end !== undefined && start > end) {
    start = undefined;
    end = undefined;
  }
  return [start ?? niced[0], end ?? niced[1]];
};

const priceScale = (
  domain: [number, number],
  plot = plotOf(),
  priceBottom = plot.bottom
) => scaleLinear().domain(domain).range([priceBottom, plot.top]);

const hover = (el: Element, clientX = 20, clientY = 50) =>
  fireEvent.mouseEnter(el, { clientX, clientY });

const pad2 = (n: number) => String(n).padStart(2, '0');
const localYmd = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const isoDays = (start: string, n: number): string[] => {
  const out: string[] = [];
  const t = Date.parse(`${start}T00:00:00.000Z`);
  for (let i = 0; i < n; i++) out.push(new Date(t + i * 86400000).toISOString().slice(0, 10));
  return out;
};

const rowsFromDays = (days: string[], price = 100): Row[] =>
  days.map((date, i) => ({
    date,
    o: price,
    h: price + 5,
    l: price - 5,
    c: price + (i % 2 === 0 ? 2 : -2),
  }));

describe('CandlestickChart', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    resetDevWarnings();
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    warn.mockRestore();
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
  });
  const warnings = (part: string) =>
    warn.mock.calls.map(([m]: unknown[]) => String(m)).filter((m: string) => m.includes(part));

  it('1: renders data-testid="candlestick-chart" with role="img"', () => {
    render(<CandlestickChart id='cs1' data={ROWS} x={X} {...KEYS} style={STYLE} />);
    const svg = screen.getByTestId('candlestick-chart');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.id).toBe('cs1');
  });

  it('2: one candle group per valid row, in ascending date order, even when the input is unsorted; no warning for unsorted input', () => {
    render(<CandlestickChart id='cs2' data={ROWS} x={X} {...KEYS} style={STYLE} />);
    expect(candles().map((c) => c.getAttribute('data-date'))).toStrictEqual(SORTED_ISO);
    expect(candles()).toHaveLength(3);
    expect(warn).not.toHaveBeenCalled();
  });

  it('3: wick runs from y(low) to y(high) at the band centre; body runs from y(max(o,c)) to y(min(o,c)), is 0.7 × band wide and centred', () => {
    render(<CandlestickChart id='cs3' data={ROWS} x={X} {...KEYS} style={STYLE} />);
    const plot = plotOf();
    const yFn = priceScale(
      priceDomain(ROWS.map((r) => ({ low: r.l, high: r.h }))),
      plot
    );
    // Sorted first row: Fri down o=102 h=104 l=98 c=100
    const wick = wicks()[0];
    const body = bodies()[0];
    const hit = hits()[0];
    const cx = num(hit, 'x') + num(hit, 'width') / 2;
    expect(num(wick, 'x1')).toBeCloseTo(cx, 6);
    expect(num(wick, 'x2')).toBeCloseTo(cx, 6);
    expect(num(wick, 'y1')).toBeCloseTo(yFn(104), 6);
    expect(num(wick, 'y2')).toBeCloseTo(yFn(98), 6);
    const top = yFn(Math.max(102, 100));
    const bottom = yFn(Math.min(102, 100));
    expect(num(body, 'y')).toBeCloseTo(top, 6);
    expect(num(body, 'height')).toBeCloseTo(bottom - top, 6);
    expect(num(body, 'width')).toBeCloseTo(0.7 * num(hit, 'width'), 6);
    expect(num(body, 'x') + num(body, 'width') / 2).toBeCloseTo(cx, 6);
  });

  it('4: data-direction is up, down or flat by close vs open; classNames.up/down/flat apply; classNames.wick is added to wicks; no fill or stroke is set by default', () => {
    const { unmount } = render(
      <CandlestickChart
        id='cs4'
        data={ROWS}
        x={X}
        {...KEYS}
        classNames={{ up: 'up-c', down: 'down-c', flat: 'flat-c', wick: 'wick-c' }}
        style={STYLE}
      />
    );
    expect(candles().map((c) => c.getAttribute('data-direction'))).toStrictEqual([
      'down',
      'up',
      'flat',
    ]);
    expect(candles()[0].getAttribute('class')).toContain('down-c');
    expect(candles()[1].getAttribute('class')).toContain('up-c');
    expect(candles()[2].getAttribute('class')).toContain('flat-c');
    expect(wicks()[0].getAttribute('class')).toContain('wick-c');
    unmount();

    render(<CandlestickChart id='cs4b' data={ROWS} x={X} {...KEYS} style={STYLE} />);
    const g = candles()[0];
    const wick = wicks()[0];
    const body = bodies()[0];
    for (const el of [g, wick, body]) {
      expect(el.getAttribute('fill')).toBeNull();
      expect(el.getAttribute('stroke')).toBeNull();
      expect(el.getAttribute('style') ?? '').not.toMatch(/red|green|#[0-9a-f]{3,8}/i);
      expect(el.getAttribute('class') ?? '').not.toMatch(/(?:^|\s)(?:fill|stroke)-(?:red|green)/);
    }
  });

  it('5: flat (doji) candles have a body height of exactly 1px', () => {
    render(<CandlestickChart id='cs5' data={ROWS} x={X} {...KEYS} style={STYLE} />);
    expect(candles()[2].getAttribute('data-direction')).toBe('flat');
    expect(num(bodies()[2], 'height')).toBe(1);
  });

  it("6: shape: 'ohlc' draws a stem from low to high, a left tick at open and a right tick at close, each bodyWidth × band / 2 long, and no body rect", () => {
    render(
      <CandlestickChart id='cs6' data={ROWS} x={X} {...KEYS} shape='ohlc' style={STYLE} />
    );
    expect(document.querySelectorAll('[data-testid="candle-body"]')).toHaveLength(0);
    expect(document.querySelectorAll('[data-testid="ohlc-stem"]')).toHaveLength(3);
    const plot = plotOf();
    const yFn = priceScale(
      priceDomain(ROWS.map((r) => ({ low: r.l, high: r.h }))),
      plot
    );
    const hit = hits()[0];
    const cx = num(hit, 'x') + num(hit, 'width') / 2;
    const tickLen = 0.7 * num(hit, 'width') / 2;
    const stem = document.querySelector('[data-testid="ohlc-stem"]');
    const open = document.querySelector('[data-testid="ohlc-open"]');
    const close = document.querySelector('[data-testid="ohlc-close"]');
    expect(num(stem, 'x1')).toBeCloseTo(cx, 6);
    expect(num(stem, 'x2')).toBeCloseTo(cx, 6);
    expect(num(stem, 'y1')).toBeCloseTo(yFn(104), 6);
    expect(num(stem, 'y2')).toBeCloseTo(yFn(98), 6);
    expect(num(open, 'x2') - num(open, 'x1')).toBeCloseTo(tickLen, 6);
    expect(num(open, 'x2')).toBeCloseTo(cx, 6);
    expect(num(open, 'x1')).toBeLessThan(num(open, 'x2'));
    expect(num(open, 'y1')).toBeCloseTo(yFn(102), 6);
    expect(num(close, 'x1')).toBeCloseTo(cx, 6);
    expect(num(close, 'x2') - num(close, 'x1')).toBeCloseTo(tickLen, 6);
    expect(num(close, 'y1')).toBeCloseTo(yFn(100), 6);
  });

  it('7: y domain is the niced [min low, max high] and does not include 0 for prices around 100–120; finite y.start/y.end pin it (0 counts); start > end ignores both with one warning; marks outside the domain are clipped', () => {
    const around: Row[] = [
      { date: '2025-01-06', o: 108, h: 120, l: 100, c: 115 },
      { date: '2025-01-07', o: 115, h: 118, l: 105, c: 110 },
    ];
    const { unmount } = render(
      <CandlestickChart id='cs7a' data={around} x={X} {...KEYS} style={STYLE} />
    );
    const niced = scaleLinear().domain([100, 120]).nice().domain();
    expect(niced[0]).toBeGreaterThan(0);
    const ticks = axisTicks('y-axis').map((t) => t.value).filter(Number.isFinite);
    expect(ticks.some((v) => v === 0)).toBe(false);
    expect(Math.min(...ticks)).toBe(niced[0]);
    expect(Math.max(...ticks)).toBe(niced[1]);
    unmount();
    resetDevWarnings();
    warn.mockClear();

    const r2 = render(
      <CandlestickChart
        id='cs7b'
        data={around}
        x={X}
        {...KEYS}
        y={{ start: 0, end: 110 }}
        style={STYLE}
      />
    );
    const pinned = axisTicks('y-axis').map((t) => t.value).filter(Number.isFinite);
    expect(pinned).toContain(0);
    expect(Math.min(...pinned)).toBe(0);
    // 110 is not a d3-axis nice tick, so confirm the pin via mark positions.
    const yPinned = priceScale([0, 110]);
    expect(num(wicks()[0], 'y1')).toBeLessThan(plotOf().top);
    expect(num(wicks()[0], 'y1')).toBeCloseTo(yPinned(120), 6);
    expect(num(wicks()[0], 'y2')).toBeCloseTo(yPinned(100), 6);
    const clip = document.getElementById('cs7b-price-clip');
    expect(clip).toBeTruthy();
    expect(clip?.querySelector('rect')).toBeTruthy();
    expect(document.querySelector('#cs7b [data-testid="candles"]')?.getAttribute('clip-path')).toBe(
      'url(#cs7b-price-clip)'
    );
    r2.unmount();
    resetDevWarnings();
    warn.mockClear();

    render(
      <CandlestickChart
        id='cs7c'
        data={around}
        x={X}
        {...KEYS}
        y={{ start: 120, end: 100 }}
        style={STYLE}
      />
    );
    const ignored = axisTicks('y-axis').map((t) => t.value).filter(Number.isFinite);
    expect(Math.min(...ignored)).toBe(niced[0]);
    expect(Math.max(...ignored)).toBe(niced[1]);
    expect(warnings('y.start')).toHaveLength(1);
    expect(warnings('both pins are ignored')).toHaveLength(1);
  });

  it('8: band mode (default): Fri and Mon are adjacent with no gap; tick labels appear on every k-th candle with k = ceil(n / ticks)', () => {
    const { unmount } = render(
      <CandlestickChart id='cs8a' data={ROWS} x={X} {...KEYS} style={STYLE} />
    );
    const xs = hits().map((h) => num(h, 'x'));
    expect(xs[1] - xs[0]).toBeCloseTo(xs[2] - xs[1], 6);
    unmount();

    const days = isoDays('2025-01-01', 10);
    const n = days.length;
    const ticks = 4;
    const k = Math.ceil(n / ticks);
    expect(k).toBe(3);
    render(
      <CandlestickChart
        id='cs8b'
        data={rowsFromDays(days)}
        x={{ ...X, axis: { ticks } }}
        {...KEYS}
        style={STYLE}
      />
    );
    const labels = tickTexts('x-axis');
    const expected = days.filter((_, i) => i % k === 0);
    expect(labels).toStrictEqual(expected);
  });

  it("9: time mode spaces Fri→Mon 3× Mon→Tue; ticks fall on calendar boundaries; width comes from the median cadence; x.time.barWidth is capped with the existing warning", () => {
    const { unmount } = render(
      <CandlestickChart
        id='cs9a'
        data={ROWS}
        x={{ ...X, scalingFunction: 'time' }}
        {...KEYS}
        style={STYLE}
      />
    );
    const c = hits().map((h) => num(h, 'x') + num(h, 'width') / 2);
    expect(c[1] - c[0]).toBeCloseTo(3 * (c[2] - c[1]), 6);

    const tickData = axisTicks('x-axis').map((t) => t.datum);
    expect(tickData.length).toBeGreaterThan(0);
    tickData.forEach((d) => {
      expect(d).toBeInstanceOf(Date);
      const date = d as Date;
      expect(date.getUTCHours()).toBe(0);
      expect(date.getUTCMinutes()).toBe(0);
      expect(date.getUTCSeconds()).toBe(0);
      expect(date.getUTCMilliseconds()).toBe(0);
    });

    // Median cadence of [3d, 1d] is 2d; unpinned slot = range / (steps + 1).
    const plot = plotOf();
    const t0 = Date.parse('2025-01-03T00:00:00.000Z');
    const t1 = Date.parse('2025-01-07T00:00:00.000Z');
    const cadence = ((3 + 1) / 2) * 86400000;
    const steps = (t1 - t0) / cadence;
    const slotPx = plot.width / (steps + 1);
    const layoutWidth = slotPx * (1 - 0.2);
    expect(num(bodies()[0], 'width')).toBeCloseTo(0.7 * layoutWidth, 5);
    unmount();
    resetDevWarnings();
    warn.mockClear();

    render(
      <CandlestickChart
        id='cs9b'
        data={ROWS}
        x={{ ...X, scalingFunction: 'time', time: { isISO: true, barWidth: 999 } }}
        {...KEYS}
        style={STYLE}
      />
    );
    expect(warnings('x.time.barWidth')).toHaveLength(1);
    expect(warnings('capped to the slot')).toHaveLength(1);
    const slot = num(hits()[0], 'width');
    expect(num(bodies()[0], 'width')).toBeCloseTo(0.7 * slot, 6);
    expect(num(bodies()[0], 'width')).toBeLessThanOrEqual(slot);
  });

  it("10: UTC default (PR #57): with isISO and utc unset, '2025-01-31' is labelled and tooltip-dated 2025-01-31, and the scale is UTC", () => {
    const one = [{ date: '2025-01-31', o: 1, h: 2, l: 0, c: 1 }];
    render(
      <CandlestickChart id='cs10' data={one} x={X} {...KEYS} tooltip={{}} style={STYLE} />
    );
    expect(tickTexts('x-axis')).toStrictEqual(['2025-01-31']);
    expect(candles()[0].getAttribute('data-date')).toBe('2025-01-31T00:00:00.000Z');
    hover(hits()[0]);
    expect(tooltipOf('cs10')?.innerHTML ?? '').toContain('2025-01-31');
    expect(warnings('utc')).toHaveLength(0);
  });

  it("11: x.time.utc: false puts the same data in local time (Jan 30 in America/New_York) and fires the suggest-utc hint once; utc: true matches the default", () => {
    const one = [{ date: '2025-01-31', o: 1, h: 2, l: 0, c: 1 }];
    const local = new Date('2025-01-31T00:00:00Z');
    const { unmount } = render(
      <CandlestickChart
        id='cs11a'
        data={one}
        x={{ ...X, time: { isISO: true, utc: false } }}
        {...KEYS}
        tooltip={{}}
        style={STYLE}
      />
    );
    expect(tickTexts('x-axis')).toStrictEqual([localYmd(local)]);
    if (Intl.DateTimeFormat().resolvedOptions().timeZone === 'America/New_York') {
      expect(tickTexts('x-axis')).toStrictEqual(['2025-01-30']);
    }
    hover(hits()[0]);
    expect(tooltipOf('cs11a')?.innerHTML ?? '').toContain(localYmd(local));
    expect(warnings('x.time.utc')).toHaveLength(1);
    unmount();
    resetDevWarnings();
    warn.mockClear();

    render(
      <CandlestickChart
        id='cs11b'
        data={one}
        x={{ ...X, time: { isISO: true, utc: true } }}
        {...KEYS}
        style={STYLE}
      />
    );
    expect(tickTexts('x-axis')).toStrictEqual(['2025-01-31']);
    expect(candles()[0].getAttribute('data-date')).toBe('2025-01-31T00:00:00.000Z');
    expect(warnings('utc')).toHaveLength(0);
  });

  it('12: x.time.format without isISO stays in local time unless utc: true is set, which matches isUtcTime', () => {
    expect(isUtcTime({ time: { format: '%Y-%m-%d' } })).toBe(false);
    expect(isUtcTime({ time: { format: '%Y-%m-%d', utc: true } })).toBe(true);
    expect(isUtcTime({ time: { isISO: true } })).toBe(true);

    const one = [{ date: '2025-01-31', o: 1, h: 2, l: 0, c: 1 }];
    const { unmount } = render(
      <CandlestickChart
        id='cs12a'
        data={one}
        x={{ key: 'date', time: { format: '%Y-%m-%d' } }}
        {...KEYS}
        tooltip={{}}
        style={STYLE}
      />
    );
    const localMidnight = new Date(2025, 0, 31);
    expect(candles()[0].getAttribute('data-date')).toBe(localMidnight.toISOString());
    expect(tickTexts('x-axis')).toStrictEqual(['2025-01-31']);
    hover(hits()[0]);
    expect(tooltipOf('cs12a')?.innerHTML ?? '').toContain('2025-01-31');
    unmount();

    render(
      <CandlestickChart
        id='cs12b'
        data={one}
        x={{ key: 'date', time: { format: '%Y-%m-%d', utc: true } }}
        {...KEYS}
        style={STYLE}
      />
    );
    expect(candles()[0].getAttribute('data-date')).toBe('2025-01-31T00:00:00.000Z');
    expect(tickTexts('x-axis')).toStrictEqual(['2025-01-31']);
  });

  it('13: Date objects and epoch ms render the same as their ISO equivalents', () => {
    const iso = [{ date: '2025-01-06', o: 100, h: 110, l: 95, c: 105 }];
    const instant = new Date('2025-01-06T00:00:00.000Z');
    const asDate = [{ date: instant, o: 100, h: 110, l: 95, c: 105 }];
    const asMs = [{ date: instant.getTime(), o: 100, h: 110, l: 95, c: 105 }];

    const { unmount } = render(
      <CandlestickChart id='cs13a' data={iso} x={X} {...KEYS} style={STYLE} />
    );
    const isoDate = candles()[0].getAttribute('data-date');
    const isoGeom = {
      wickY1: num(wicks()[0], 'y1'),
      bodyX: num(bodies()[0], 'x'),
      hitX: num(hits()[0], 'x'),
    };
    expect(isoDate).toBe('2025-01-06T00:00:00.000Z');
    unmount();

    const r2 = render(
      <CandlestickChart id='cs13b' data={asDate} x={X} {...KEYS} style={STYLE} />
    );
    expect(candles()[0].getAttribute('data-date')).toBe(isoDate);
    expect(num(wicks()[0], 'y1')).toBeCloseTo(isoGeom.wickY1, 6);
    expect(num(bodies()[0], 'x')).toBeCloseTo(isoGeom.bodyX, 6);
    expect(num(hits()[0], 'x')).toBeCloseTo(isoGeom.hitX, 6);
    r2.unmount();

    render(<CandlestickChart id='cs13c' data={asMs} x={X} {...KEYS} style={STYLE} />);
    expect(candles()[0].getAttribute('data-date')).toBe(isoDate);
    expect(num(wicks()[0], 'y1')).toBeCloseTo(isoGeom.wickY1, 6);
    expect(num(bodies()[0], 'x')).toBeCloseTo(isoGeom.bodyX, 6);
    expect(num(hits()[0], 'x')).toBeCloseTo(isoGeom.hitX, 6);
  });

  it('14: unparseable dates are dropped with the shared dropped-rows warning', () => {
    render(
      <CandlestickChart
        id='cs14'
        data={[...ROWS, { date: 'nope', o: 1, h: 2, l: 0, c: 1 }]}
        x={X}
        {...KEYS}
        style={STYLE}
      />
    );
    expect(candles()).toHaveLength(3);
    expect(warnings("isn't a valid date")).toHaveLength(1);
  });

  it('15: NaN or missing O/H/L/C drops the row, with one warning and a count', () => {
    const data: Row[] = [
      ...ROWS,
      { date: '2025-01-08', o: Number.NaN, h: 2, l: 0, c: 1 },
      { date: '2025-01-09', o: 1, h: 2, l: 0, c: 1 },
    ];
    (data[data.length - 1] as unknown as { o: unknown }).o = undefined;
    const withString = [...data, { date: '2025-01-10', o: '100', h: 2, l: 0, c: 1 } as unknown as Row];
    render(<CandlestickChart id='cs15' data={withString} x={X} {...KEYS} style={STYLE} />);
    expect(candles()).toHaveLength(3);
    expect(warnings('non-finite open/high/low/close')).toHaveLength(1);
    expect(warnings('3 row(s)')).toHaveLength(1);
  });

  it('16: high < low drops the row, with one warning', () => {
    render(
      <CandlestickChart
        id='cs16'
        data={[...ROWS, { date: '2025-01-09', o: 1, h: 0, l: 2, c: 1 }]}
        x={X}
        {...KEYS}
        style={STYLE}
      />
    );
    expect(candles()).toHaveLength(3);
    expect(warnings('high < low')).toHaveLength(1);
  });

  it('17: open or close outside [low, high] keeps the row, extends the wick to cover the body, shows the raw high and low in the tooltip, and logs one warning', () => {
    const data: Row[] = [
      { date: '2025-01-06', o: 5, h: 4, l: 1, c: 2 },
    ];
    render(
      <CandlestickChart id='cs17' data={data} x={X} {...KEYS} tooltip={{}} style={STYLE} />
    );
    expect(candles()).toHaveLength(1);
    const yFn = priceScale(priceDomain([{ low: 1, high: 5 }]));
    expect(num(wicks()[0], 'y1')).toBeCloseTo(yFn(5), 6);
    expect(num(wicks()[0], 'y2')).toBeCloseTo(yFn(1), 6);
    const top = yFn(Math.max(5, 2));
    const bottom = yFn(Math.min(5, 2));
    expect(num(bodies()[0], 'y')).toBeCloseTo(top, 6);
    expect(num(bodies()[0], 'height')).toBeCloseTo(bottom - top, 6);
    hover(hits()[0]);
    const html = tooltipOf('cs17')?.innerHTML ?? '';
    expect(html).toMatch(/H 4/);
    expect(html).toMatch(/L 1/);
    expect(html).toMatch(/O 5/);
    expect(html).toMatch(/C 2/);
    expect(warnings('outside [low, high]')).toHaveLength(1);
  });

  it('18: duplicate dates: the first row wins, later rows are dropped, and one warning is given', () => {
    const data: Row[] = [
      { date: '2025-01-06', o: 100, h: 110, l: 95, c: 105 },
      { date: '2025-01-06', o: 1, h: 2, l: 0, c: 0 },
      { date: '2025-01-07', o: 105, h: 108, l: 101, c: 105 },
    ];
    render(<CandlestickChart id='cs18' data={data} x={X} {...KEYS} style={STYLE} />);
    expect(candles()).toHaveLength(2);
    expect(candles()[0].getAttribute('data-date')).toBe('2025-01-06T00:00:00.000Z');
    expect(candles()[0].getAttribute('data-direction')).toBe('up');
    expect(warnings('repeat an earlier date')).toHaveLength(1);
  });

  it('19: negative prices render as given, with no warning', () => {
    const data: Row[] = [
      { date: '2025-01-06', o: -10, h: -2, l: -15, c: -4 },
    ];
    render(<CandlestickChart id='cs19' data={data} x={X} {...KEYS} style={STYLE} />);
    expect(candles()).toHaveLength(1);
    expect(candles()[0].getAttribute('data-direction')).toBe('up');
    const domain = priceDomain([{ low: -15, high: -2 }]);
    expect(domain[0]).toBeLessThan(0);
    expect(domain[1]).toBeLessThan(0);
    const yFn = priceScale(domain);
    expect(num(wicks()[0], 'y1')).toBeCloseTo(yFn(-2), 6);
    expect(num(wicks()[0], 'y2')).toBeCloseTo(yFn(-15), 6);
    expect(warn).not.toHaveBeenCalled();
  });

  it('20: invalid bodyWidth falls back to 0.7, with a warning', () => {
    const { unmount } = render(
      <CandlestickChart id='cs20a' data={ROWS} x={X} {...KEYS} style={STYLE} />
    );
    const expected = num(bodies()[0], 'width');
    unmount();
    resetDevWarnings();
    warn.mockClear();

    render(
      <CandlestickChart id='cs20b' data={ROWS} x={X} {...KEYS} bodyWidth={2} style={STYLE} />
    );
    expect(num(bodies()[0], 'width')).toBeCloseTo(expected, 6);
    expect(num(bodies()[0], 'width')).toBeCloseTo(0.7 * num(hits()[0], 'width'), 6);
    expect(warnings('bodyWidth')).toHaveLength(1);
  });

  it('21: volume panel appears only when volume is set; height is 0.2 × plot minus the gap; domain starts at 0; bars carry data-direction and volume.className; negative or NaN volume gives no bar, keeps the candle, and logs one warning; height is clamped to [0.1, 0.5]', () => {
    const { unmount } = render(
      <CandlestickChart id='cs21a' data={ROWS} x={X} {...KEYS} style={STYLE} />
    );
    expect(document.querySelector('[data-testid="volume-panel"]')).toBeNull();
    expect(document.querySelector('[data-testid="volume-axis"]')).toBeNull();
    expect(volumeBars()).toHaveLength(0);
    unmount();

    const r2 = render(
      <CandlestickChart
        id='cs21b'
        data={ROWS}
        x={X}
        {...KEYS}
        volume={{ key: 'v', className: 'vol-c' }}
        style={STYLE}
      />
    );
    expect(document.querySelector('[data-testid="volume-panel"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="volume-axis"]')).toBeTruthy();
    expect(volumeBars()).toHaveLength(3);
    const plot = plotOf();
    const gap = 8;
    const area = 0.2 * plot.height - gap;
    const maxBar = volumeBars().reduce((h, b) => Math.max(h, num(b, 'height')), 0);
    expect(maxBar).toBeCloseTo(area, 6);
    expect(num(volumeBars().find((b) => b.getAttribute('data-date') === SORTED_ISO[1]), 'height')).toBeCloseTo(
      area * (10 / 20),
      6
    );
    const volTicks = axisTicks('volume-axis').map((t) => t.value).filter(Number.isFinite);
    expect(Math.min(...volTicks)).toBe(0);
    expect(volumeBars().map((b) => b.getAttribute('data-direction'))).toStrictEqual([
      'down',
      'up',
      'flat',
    ]);
    volumeBars().forEach((b) => expect(b.getAttribute('class')).toContain('vol-c'));
    r2.unmount();
    resetDevWarnings();
    warn.mockClear();

    const mixed: Row[] = [
      { date: '2025-01-06', o: 100, h: 110, l: 95, c: 105, v: 10 },
      { date: '2025-01-07', o: 105, h: 108, l: 101, c: 105, v: -3 },
      { date: '2025-01-08', o: 105, h: 108, l: 101, c: 106, v: Number.NaN },
    ];
    const r3 = render(
      <CandlestickChart
        id='cs21c'
        data={mixed}
        x={X}
        {...KEYS}
        volume={{ key: 'v' }}
        style={STYLE}
      />
    );
    expect(candles()).toHaveLength(3);
    expect(volumeBars()).toHaveLength(1);
    expect(warnings('negative or non-finite volume')).toHaveLength(1);
    r3.unmount();
    resetDevWarnings();
    warn.mockClear();

    const r4 = render(
      <CandlestickChart
        id='cs21d'
        data={ROWS}
        x={X}
        {...KEYS}
        volume={{ key: 'v', height: 0.01 }}
        style={STYLE}
      />
    );
    const h01 = volumeBars().reduce((h, b) => Math.max(h, num(b, 'height')), 0);
    r4.unmount();
    const r5 = render(
      <CandlestickChart
        id='cs21e'
        data={ROWS}
        x={X}
        {...KEYS}
        volume={{ key: 'v', height: 0.1 }}
        style={STYLE}
      />
    );
    const h10 = volumeBars().reduce((h, b) => Math.max(h, num(b, 'height')), 0);
    expect(h01).toBeCloseTo(h10, 6);
    expect(h01).toBeCloseTo(0.1 * plot.height - gap, 6);
    r5.unmount();

    const r6 = render(
      <CandlestickChart
        id='cs21f'
        data={ROWS}
        x={X}
        {...KEYS}
        volume={{ key: 'v', height: 0.9 }}
        style={STYLE}
      />
    );
    const h90 = volumeBars().reduce((h, b) => Math.max(h, num(b, 'height')), 0);
    r6.unmount();
    render(
      <CandlestickChart
        id='cs21g'
        data={ROWS}
        x={X}
        {...KEYS}
        volume={{ key: 'v', height: 0.5 }}
        style={STYLE}
      />
    );
    const h50 = volumeBars().reduce((h, b) => Math.max(h, num(b, 'height')), 0);
    expect(h90).toBeCloseTo(h50, 6);
    expect(h50).toBeCloseTo(0.5 * plot.height - gap, 6);
  });

  it("22: tooltip default HTML has the formatted date, O/H/L/C, change and change % ('n/a' when open is 0), and volume when set; never shows NaN or Infinity; html overrides and receives a CandleDatum with prevClose", () => {
    const { unmount } = render(
      <CandlestickChart
        id='cs22a'
        data={ROWS}
        x={X}
        {...KEYS}
        volume={{ key: 'v' }}
        tooltip={{}}
        style={STYLE}
      />
    );
    hover(hits()[1]);
    const html = tooltipOf('cs22a')?.innerHTML ?? '';
    expect(html).toContain('2025-01-06');
    expect(html).toMatch(/O 100/);
    expect(html).toMatch(/H 110/);
    expect(html).toMatch(/L 95/);
    expect(html).toMatch(/C 105/);
    expect(html).toContain('chg +5');
    expect(html).toContain('+5%');
    expect(html).toContain('vol 10');
    expect(html).not.toMatch(/NaN|Infinity/);
    unmount();
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());

    const zeroOpen: Row[] = [
      { date: '2025-01-06', o: 100, h: 110, l: 95, c: 105 },
      { date: '2025-01-07', o: 0, h: 2, l: -1, c: 1 },
    ];
    const r2 = render(
      <CandlestickChart id='cs22b' data={zeroOpen} x={X} {...KEYS} tooltip={{}} style={STYLE} />
    );
    hover(hits()[1]);
    const zeroHtml = tooltipOf('cs22b')?.innerHTML ?? '';
    expect(zeroHtml).toContain('n/a');
    expect(zeroHtml).not.toContain('vol');
    expect(zeroHtml).not.toMatch(/NaN|Infinity/);
    r2.unmount();
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());

    let received: CandleDatum<Row> | undefined;
    render(
      <CandlestickChart
        id='cs22c'
        data={ROWS}
        x={X}
        {...KEYS}
        tooltip={{
          html: (d: unknown) => {
            received = d as CandleDatum<Row>;
            return 'custom-tip';
          },
        }}
        style={STYLE}
      />
    );
    hover(hits()[1]);
    expect(tooltipOf('cs22c')?.innerHTML).toBe('custom-tip');
    expect(received?.prevClose).toBe(100);
    expect(received?.change).toBe(5);
    expect(received?.changePct).toBeCloseTo(0.05);
    expect(received?.open).toBe(100);
    expect(received?.direction).toBe('up');
    expect(received?.data).toBe(ROWS[0]);
  });

  it('23: each candle-hit is the full band (or slot) wide and spans the full plot height, including the volume panel; hovering above a 1px doji body, within its band, shows that candle’s tooltip; marks have no listeners and the handler fires once', () => {
    const html = vi.fn(() => 'doji-tip');
    render(
      <CandlestickChart
        id='cs23'
        data={ROWS}
        x={X}
        {...KEYS}
        volume={{ key: 'v' }}
        tooltip={{ html }}
        style={STYLE}
      />
    );
    const plot = plotOf();
    hits().forEach((h) => {
      expect(num(h, 'y')).toBeCloseTo(plot.top, 6);
      expect(num(h, 'height')).toBeCloseTo(plot.height, 6);
      expect(num(h, 'x') + num(h, 'width')).toBeLessThanOrEqual(plot.right + 1e-6);
    });
    // Band mode: hit width equals the band (body is 0.7 of it).
    expect(num(bodies()[0], 'width')).toBeCloseTo(0.7 * num(hits()[0], 'width'), 6);
    expect(num(hits()[2], 'height')).toBeGreaterThan(num(bodies()[2], 'height'));

    wicks().forEach((w) => expect(d3On(w)).toBeUndefined());
    bodies().forEach((b) => expect(d3On(b)).toBeUndefined());
    volumeBars().forEach((b) => expect(d3On(b)).toBeUndefined());
    expect(d3On(hits()[2])).toBeTruthy();

    expect(candles()[2].getAttribute('data-direction')).toBe('flat');
    hover(hits()[2]);
    expect(html).toHaveBeenCalledOnce();
    expect(tooltipOf('cs23')?.innerHTML).toBe('doji-tip');
    expect(html.mock.calls[0][0]).toMatchObject({ direction: 'flat', close: 105, open: 105 });
  });

  it('24: re-rendering the parent with a new tooltip object identity keeps the same candle DOM elements and does not rebind listeners; the latest tooltip.html is used on the next hover', () => {
    const first = vi.fn(() => 'first');
    const second = vi.fn(() => 'second');
    const props = { id: 'cs24', data: ROWS, x: X, ...KEYS, style: STYLE };
    const { rerender } = render(<CandlestickChart {...props} tooltip={{ html: first }} />);
    const candle = candles()[0];
    const hit = hits()[0];
    const listeners = d3On(hit);
    expect(listeners).toBeTruthy();

    rerender(<CandlestickChart {...props} tooltip={{ html: second }} />);
    expect(candles()[0]).toBe(candle);
    expect(hits()[0]).toBe(hit);
    expect(d3On(hit)).toBe(listeners);

    hover(hit);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    expect(tooltipOf('cs24')?.innerHTML).toBe('second');
  });

  it('25: crosshair is off by default and adds no elements; with crosshair: true the vertical line snaps to the hovered band centre and spans both panels, the horizontal line follows the pointer y, both have pointer-events: none, and they hide on mouseleave', () => {
    const { unmount } = render(
      <CandlestickChart id='cs25a' data={ROWS} x={X} {...KEYS} style={STYLE} />
    );
    expect(document.querySelector('[data-testid="crosshair-x"]')).toBeNull();
    expect(document.querySelector('[data-testid="crosshair-y"]')).toBeNull();
    unmount();

    render(
      <CandlestickChart
        id='cs25b'
        data={ROWS}
        x={X}
        {...KEYS}
        volume={{ key: 'v' }}
        crosshair
        style={STYLE}
      />
    );
    const cx = document.querySelector('[data-testid="crosshair-x"]');
    const cy = document.querySelector('[data-testid="crosshair-y"]');
    expect(cx?.getAttribute('visibility')).toBe('hidden');
    expect(cy?.getAttribute('visibility')).toBe('hidden');
    expect(cx?.getAttribute('pointer-events')).toBe('none');
    expect(cy?.getAttribute('pointer-events')).toBe('none');
    const plot = plotOf();
    expect(num(cx, 'y1')).toBeCloseTo(plot.top, 6);
    expect(num(cx, 'y2')).toBeCloseTo(plot.bottom, 6);

    fireEvent.mouseEnter(hits()[0], { clientX: 10, clientY: 50 });
    expect(cx?.getAttribute('visibility')).toBe('visible');
    expect(num(cx, 'x1')).toBeCloseTo(num(hits()[0], 'x') + num(hits()[0], 'width') / 2, 6);
    expect(cy?.getAttribute('visibility')).toBe('visible');
    expect(num(cy, 'y1')).toBeCloseTo(50, 6);
    expect(num(cy, 'y2')).toBeCloseTo(50, 6);

    fireEvent.mouseLeave(hits()[0]);
    expect(cx?.getAttribute('visibility')).toBe('hidden');
    expect(cy?.getAttribute('visibility')).toBe('hidden');
  });

  it('26: when data changes mid-transition, the old transition is interrupted and the final geometry matches the new data, with no leftover nodes; unmounting mid-transition interrupts it, with no errors or leftover timers', () => {
    const drawing = { duration: 400 };
    const { rerender, unmount } = render(
      <CandlestickChart id='cs26' data={ROWS} x={X} {...KEYS} drawing={drawing} style={STYLE} />
    );
    const first = wicks();
    expect(first).toHaveLength(3);
    expect(first.some(hasTransition)).toBe(true);

    const next: Row[] = [{ date: '2025-02-01', o: 50, h: 60, l: 40, c: 55 }];
    rerender(
      <CandlestickChart id='cs26' data={next} x={X} {...KEYS} drawing={drawing} style={STYLE} />
    );
    first.forEach((w) => expect(hasTransition(w)).toBe(false));
    expect(candles().map((c) => c.getAttribute('data-date'))).toStrictEqual([
      '2025-02-01T00:00:00.000Z',
    ]);
    expect(wicks()).toHaveLength(1);
    expect(bodies()).toHaveLength(1);
    expect(document.querySelectorAll('#cs26 [data-testid="candle"]')).toHaveLength(1);

    rerender(
      <CandlestickChart
        id='cs26'
        data={next}
        x={X}
        {...KEYS}
        drawing={{ duration: 0 }}
        style={STYLE}
      />
    );
    const yFn = priceScale(priceDomain([{ low: 40, high: 60 }]));
    expect(num(wicks()[0], 'y1')).toBeCloseTo(yFn(60), 6);
    expect(num(wicks()[0], 'y2')).toBeCloseTo(yFn(40), 6);
    const top = yFn(Math.max(50, 55));
    const bottom = yFn(Math.min(50, 55));
    expect(num(bodies()[0], 'y')).toBeCloseTo(top, 6);
    expect(num(bodies()[0], 'height')).toBeCloseTo(bottom - top, 6);

    rerender(
      <CandlestickChart id='cs26' data={next} x={X} {...KEYS} drawing={drawing} style={STYLE} />
    );
    const live = wicks()[0];
    expect(hasTransition(live)).toBe(true);
    const errors: unknown[] = [];
    const err = vi.spyOn(console, 'error').mockImplementation((...a) => {
      errors.push(a);
    });
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    expect(() => unmount()).not.toThrow();
    expect(hasTransition(live)).toBe(false);
    expect(errors).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
    err.mockRestore();
  });

  it('27: runtime changes to shape, x.scalingFunction, volume or data redraw with no leftover nodes, and the crosshair is cleared', () => {
    const props = { id: 'cs27', data: ROWS, x: X, ...KEYS, style: STYLE, crosshair: true as const };
    const { rerender } = render(<CandlestickChart {...props} />);
    fireEvent.mouseEnter(hits()[0], { clientX: 10, clientY: 50 });
    expect(document.querySelector('[data-testid="crosshair-x"]')?.getAttribute('visibility')).toBe(
      'visible'
    );

    rerender(<CandlestickChart {...props} shape='ohlc' />);
    expect(document.querySelectorAll('[data-testid="candle-body"]')).toHaveLength(0);
    expect(document.querySelectorAll('[data-testid="ohlc-stem"]')).toHaveLength(3);
    expect(document.querySelector('[data-testid="crosshair-x"]')?.getAttribute('visibility')).toBe(
      'hidden'
    );

    rerender(
      <CandlestickChart {...props} shape='ohlc' x={{ ...X, scalingFunction: 'time' }} />
    );
    expect(document.querySelectorAll('[data-testid="ohlc-stem"]')).toHaveLength(3);
    const c = hits().map((h) => num(h, 'x') + num(h, 'width') / 2);
    expect(c[1] - c[0]).toBeCloseTo(3 * (c[2] - c[1]), 6);

    rerender(
      <CandlestickChart
        {...props}
        x={{ ...X, scalingFunction: 'time' }}
        volume={{ key: 'v' }}
      />
    );
    expect(document.querySelectorAll('[data-testid="ohlc-stem"]')).toHaveLength(0);
    expect(volumeBars()).toHaveLength(3);

    rerender(
      <CandlestickChart
        {...props}
        data={ROWS.slice(0, 1)}
        volume={{ key: 'v' }}
      />
    );
    expect(candles()).toHaveLength(1);
    expect(volumeBars()).toHaveLength(1);
    expect(document.querySelectorAll('[data-testid="candle"]')).toHaveLength(1);
    expect(document.querySelector('[data-testid="crosshair-x"]')?.getAttribute('visibility')).toBe(
      'hidden'
    );
    expect(document.querySelector('[data-testid="crosshair-y"]')?.getAttribute('visibility')).toBe(
      'hidden'
    );
  });

  it('28: empty data, or data where every row is invalid, renders the shell with no marks and no NaN attributes, and does not throw; a single row renders one centred candle', () => {
    const { unmount } = render(
      <CandlestickChart id='cs28a' data={[]} x={X} {...KEYS} style={STYLE} />
    );
    expect(screen.getByTestId('candlestick-chart')).toBeTruthy();
    expect(candles()).toHaveLength(0);
    expect(hits()).toHaveLength(0);
    expect(document.getElementById('cs28a')?.innerHTML).not.toMatch(/NaN|Infinity/);
    unmount();

    const allBad: Row[] = [
      { date: 'nope', o: 1, h: 2, l: 0, c: 1 },
      { date: '2025-01-08', o: Number.NaN, h: 2, l: 0, c: 1 },
      { date: '2025-01-09', o: 1, h: 0, l: 2, c: 1 },
    ];
    const r2 = render(
      <CandlestickChart id='cs28b' data={allBad} x={X} {...KEYS} style={STYLE} />
    );
    expect(candles()).toHaveLength(0);
    expect(document.getElementById('cs28b')?.innerHTML).not.toMatch(/NaN|Infinity/);
    r2.unmount();

    render(
      <CandlestickChart
        id='cs28c'
        data={[{ date: '2025-01-06', o: 100, h: 110, l: 95, c: 105 }]}
        x={X}
        {...KEYS}
        style={STYLE}
      />
    );
    expect(candles()).toHaveLength(1);
    const plot = plotOf();
    const cx = num(hits()[0], 'x') + num(hits()[0], 'width') / 2;
    expect(cx).toBeCloseTo((plot.left + plot.right) / 2, 6);
    expect(num(wicks()[0], 'x1')).toBeCloseTo(cx, 6);
  });

  it('29: all prices equal gives a y domain of v ± 1', () => {
    const data: Row[] = [
      { date: '2025-01-06', o: 100, h: 100, l: 100, c: 100 },
      { date: '2025-01-07', o: 100, h: 100, l: 100, c: 100 },
    ];
    render(<CandlestickChart id='cs29' data={data} x={X} {...KEYS} style={STYLE} />);
    const ticks = axisTicks('y-axis').map((t) => t.value).filter(Number.isFinite);
    expect(Math.min(...ticks)).toBe(99);
    expect(Math.max(...ticks)).toBe(101);
    const plot = plotOf();
    const mid = (plot.top + plot.bottom) / 2;
    expect(num(bodies()[0], 'y') + num(bodies()[0], 'height') / 2).toBeCloseTo(mid, 6);
  });

  it('30: title/description produce <title>/<desc> and the matching aria-*; otherwise aria-label is "Candlestick chart" or ariaLabel', () => {
    const { unmount } = render(
      <CandlestickChart
        id='cs30a'
        data={ROWS}
        x={X}
        {...KEYS}
        title='BTC daily OHLC'
        description='January session'
        style={STYLE}
      />
    );
    const svg = screen.getByTestId('candlestick-chart');
    const title = svg.querySelector('title');
    const desc = svg.querySelector('desc');
    expect(title?.textContent).toBe('BTC daily OHLC');
    expect(title?.id).toBe('cs30a-title');
    expect(desc?.textContent).toBe('January session');
    expect(desc?.id).toBe('cs30a-desc');
    expect(svg.getAttribute('aria-labelledby')).toBe('cs30a-title');
    expect(svg.getAttribute('aria-describedby')).toBe('cs30a-desc');
    expect(svg.getAttribute('aria-label')).toBeNull();
    unmount();

    const r2 = render(<CandlestickChart id='cs30b' data={ROWS} x={X} {...KEYS} style={STYLE} />);
    expect(screen.getByTestId('candlestick-chart').getAttribute('aria-label')).toBe(
      'Candlestick chart'
    );
    r2.unmount();

    render(
      <CandlestickChart
        id='cs30c'
        data={ROWS}
        x={X}
        {...KEYS}
        ariaLabel='Price candles'
        style={STYLE}
      />
    );
    expect(document.getElementById('cs30c')?.getAttribute('aria-label')).toBe('Price candles');
  });

  it("31: padding.bar widens the gaps between bands, and margin insets the plot; y.axis.location: 'right' moves the price axis", () => {
    const { unmount } = render(
      <CandlestickChart id='cs31a' data={ROWS} x={X} {...KEYS} padding={{ bar: 0 }} style={STYLE} />
    );
    const tightGap =
      num(hits()[1], 'x') - (num(hits()[0], 'x') + num(hits()[0], 'width'));
    const tightWidth = num(hits()[0], 'width');
    unmount();

    const r2 = render(
      <CandlestickChart id='cs31b' data={ROWS} x={X} {...KEYS} padding={{ bar: 0.5 }} style={STYLE} />
    );
    const wideGap =
      num(hits()[1], 'x') - (num(hits()[0], 'x') + num(hits()[0], 'width'));
    expect(wideGap).toBeGreaterThan(tightGap);
    expect(num(hits()[0], 'width')).toBeLessThan(tightWidth);
    r2.unmount();

    const margin = { top: 30, right: 40, bottom: 50, left: 80 };
    const r3 = render(
      <CandlestickChart id='cs31c' data={ROWS} x={X} {...KEYS} margin={margin} style={STYLE} />
    );
    const plot = plotOf(margin);
    expect(num(hits()[0], 'x')).toBeGreaterThanOrEqual(plot.left - 1e-6);
    expect(num(hits()[0], 'y')).toBeCloseTo(plot.top, 6);
    expect(
      num(hits()[hits().length - 1], 'x') + num(hits()[hits().length - 1], 'width')
    ).toBeLessThanOrEqual(plot.right + 1e-6);
    expect(document.querySelector('[data-testid="y-axis"]')?.getAttribute('transform')).toBe(
      `translate(${margin.left}, 0)`
    );
    r3.unmount();

    render(
      <CandlestickChart
        id='cs31d'
        data={ROWS}
        x={X}
        {...KEYS}
        y={{ axis: { location: 'right' } }}
        style={STYLE}
      />
    );
    expect(document.querySelector('[data-testid="y-axis"]')?.getAttribute('transform')).toBe(
      `translate(${WIDTH - MARGIN.right}, 0)`
    );
  });

  it('32: catalog aliases resolve to CandlestickChart; ohlc aliases resolve to the OHLC chart variant; none collide with RangePlot, BoxPlot, LineChart, Waffle heatmap, Comet slope chart or dual-axis combo chart; meta.category is linear and primary intent trend is on the decisionTree trend branch', () => {
    for (const alias of [
      'candlestick',
      'candlestick chart',
      'japanese candlestick chart',
      'stock chart',
      'financial chart',
    ]) {
      const resolved = resolveChartRequest(alias);
      expect(resolved?.chart.name, alias).toBe('CandlestickChart');
      expect(resolved?.variant, alias).toBeUndefined();
    }
    for (const alias of ['ohlc', 'ohlc chart', 'ohlc bar chart', 'open-high-low-close chart']) {
      const resolved = resolveChartRequest(alias);
      expect(resolved?.chart.name, alias).toBe('CandlestickChart');
      expect(resolved?.variant?.name, alias).toBe('OHLC chart');
    }
    expect(resolveChartRequest('CandlestickChart')?.chart.category).toBe('linear');
    expect(resolveChartRequest('CandlestickChart')?.chart.intents[0]).toBe('trend');

    const reserved: Record<string, string> = {
      'range plot': 'RangePlot',
      'box plot': 'BoxPlotV',
      'time series': 'LineChart',
      heatmap: 'WaffleChart',
      'slope chart': 'CometPlot',
      'combo chart': 'LineChart',
    };
    for (const [name, chart] of Object.entries(reserved)) {
      const resolved = resolveChartRequest(name);
      expect(resolved?.chart.name, name).not.toBe('CandlestickChart');
      if (resolved) expect(resolved.chart.name, name).toBe(chart);
    }

    const trend = decisionTree.find((b) => b.intent === 'trend');
    expect(trend?.options.some((o) => o.name === 'CandlestickChart')).toBe(true);
  });
});
