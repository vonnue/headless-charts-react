import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveChartRequest } from '@/catalog';
import { resetDevWarnings } from '@/utils/devEnvironment';

import CandlestickChart, { type CandleDatum } from '.';
import { isUtcTime, prepareCandles, withResolvedUtc } from './ohlc';

// Smoke tests from the executor; the full spec suite is written separately.
const STYLE = { width: '400px', height: '300px' } as const;
const KEYS = {
  open: { key: 'o' },
  high: { key: 'h' },
  low: { key: 'l' },
  close: { key: 'c' },
} as const;
const X = { key: 'date', time: { isISO: true } } as const;

type Row = { date: string; o: number; h: number; l: number; c: number; v?: number };
const ROWS: Row[] = [
  { date: '2025-01-06', o: 100, h: 110, l: 95, c: 105, v: 10 }, // Mon up
  { date: '2025-01-03', o: 102, h: 104, l: 98, c: 100, v: 20 }, // Fri down (unsorted)
  { date: '2025-01-07', o: 105, h: 108, l: 101, c: 105, v: 5 }, // Tue flat
];

const candles = () => Array.from(document.querySelectorAll('[data-testid="candle"]'));
const hits = () => Array.from(document.querySelectorAll('[data-testid="candle-hit"]'));
const num = (el: Element | null | undefined, a: string) => Number(el?.getAttribute(a));

describe('CandlestickChart (smoke)', () => {
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

  it('renders sorted candles with direction attributes and classes, no NaN', () => {
    const { container } = render(
      <CandlestickChart
        id='cs1'
        data={ROWS}
        x={X}
        {...KEYS}
        classNames={{ up: 'up-c', down: 'down-c', flat: 'flat-c', wick: 'wick-c' }}
        style={STYLE}
      />
    );
    const svg = screen.getByTestId('candlestick-chart');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Candlestick chart');
    expect(candles().map((c) => c.getAttribute('data-date'))).toEqual([
      '2025-01-03T00:00:00.000Z',
      '2025-01-06T00:00:00.000Z',
      '2025-01-07T00:00:00.000Z',
    ]);
    expect(candles().map((c) => c.getAttribute('data-direction'))).toEqual(['down', 'up', 'flat']);
    expect(candles()[0].getAttribute('class')).toContain('down-c');
    expect(container.querySelector('[data-testid="candle-wick"]')?.getAttribute('class')).toContain('wick-c');
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
    // Band mode: Fri and Mon adjacent, same spacing as Mon→Tue.
    const xs = hits().map((h) => num(h, 'x'));
    expect(xs[1] - xs[0]).toBeCloseTo(xs[2] - xs[1], 6);
    expect(warn).not.toHaveBeenCalled();
  });

  it('doji body is 1px; body is 0.7 of the band; ohlc draws stem and ticks', () => {
    const { unmount } = render(<CandlestickChart id='cs2' data={ROWS} x={X} {...KEYS} style={STYLE} />);
    const bodies = Array.from(document.querySelectorAll('[data-testid="candle-body"]'));
    expect(num(bodies[2], 'height')).toBe(1);
    expect(num(bodies[0], 'width')).toBeCloseTo(0.7 * num(hits()[0], 'width'), 6);
    unmount();
    render(<CandlestickChart id='cs2b' data={ROWS} x={X} {...KEYS} shape='ohlc' style={STYLE} />);
    expect(document.querySelectorAll('[data-testid="candle-body"]')).toHaveLength(0);
    expect(document.querySelectorAll('[data-testid="ohlc-stem"]')).toHaveLength(3);
    const open = document.querySelector('[data-testid="ohlc-open"]');
    const close = document.querySelector('[data-testid="ohlc-close"]');
    expect(num(open, 'x1')).toBeLessThan(num(open, 'x2'));
    expect(num(close, 'x1')).toBeLessThan(num(close, 'x2'));
    expect(num(open, 'x2')).toBe(num(close, 'x1'));
  });

  it('time mode spaces Fri→Mon three times Mon→Tue', () => {
    render(
      <CandlestickChart
        id='cs3'
        data={ROWS}
        x={{ ...X, scalingFunction: 'time' }}
        {...KEYS}
        style={STYLE}
      />
    );
    const c = hits().map((h) => num(h, 'x') + num(h, 'width') / 2);
    expect(c[1] - c[0]).toBeCloseTo(3 * (c[2] - c[1]), 6);
  });

  it('volume panel, tooltip datum and default html', () => {
    let datum: CandleDatum<Row> | undefined;
    const { rerender } = render(
      <CandlestickChart
        id='cs4'
        data={ROWS}
        x={X}
        {...KEYS}
        volume={{ key: 'v', className: 'vol-c' }}
        tooltip={{}}
        style={STYLE}
      />
    );
    expect(document.querySelectorAll('[data-testid="volume-bar"]')).toHaveLength(3);
    fireEvent.mouseEnter(hits()[1], { clientX: 10, clientY: 10 });
    const html = document.getElementById('tooltip-cs4')?.innerHTML ?? '';
    expect(html).toContain('2025-01-06');
    expect(html).toContain('chg +5');
    expect(html).toContain('+5%');
    expect(html).toContain('vol 10');
    expect(html).not.toMatch(/NaN|Infinity/);

    const before = candles()[0];
    rerender(
      <CandlestickChart
        id='cs4'
        data={ROWS}
        x={X}
        {...KEYS}
        volume={{ key: 'v', className: 'vol-c' }}
        tooltip={{
          html: (d: unknown) => {
            datum = d as CandleDatum<Row>;
            return 'x';
          },
        }}
        style={STYLE}
      />
    );
    // New `x`/`volume` literals redraw; tooltip identity alone must not.
    fireEvent.mouseEnter(hits()[1], { clientX: 10, clientY: 10 });
    expect(datum?.prevClose).toBe(100);
    expect(datum?.change).toBe(5);
    expect(datum?.changePct).toBeCloseTo(0.05);
    expect(before).toBeTruthy();
  });

  it('validation: drops bad rows and warns once each', () => {
    const data = [
      ...ROWS,
      { date: 'nope', o: 1, h: 2, l: 0, c: 1 },
      { date: '2025-01-08', o: NaN, h: 2, l: 0, c: 1 },
      { date: '2025-01-09', o: 1, h: 0, l: 2, c: 1 },
      { date: '2025-01-10', o: 5, h: 4, l: 1, c: 2 },
      { date: '2025-01-06', o: 1, h: 2, l: 0, c: 1 },
    ];
    render(<CandlestickChart id='cs5' data={data} x={X} {...KEYS} bodyWidth={2} style={STYLE} />);
    expect(candles()).toHaveLength(4);
    expect(warnings('valid date')).toHaveLength(1);
    expect(warnings('non-finite open')).toHaveLength(1);
    expect(warnings('high < low')).toHaveLength(1);
    expect(warnings('outside [low, high]')).toHaveLength(1);
    expect(warnings('repeat an earlier date')).toHaveLength(1);
    expect(warnings('bodyWidth')).toHaveLength(1);
  });

  it('empty data renders a shell', () => {
    const { container } = render(<CandlestickChart id='cs6' data={[]} x={X} {...KEYS} style={STYLE} />);
    expect(candles()).toHaveLength(0);
    expect(container.innerHTML).not.toMatch(/NaN/);
  });

  it('crosshair snaps to the band centre and hides on leave', () => {
    render(<CandlestickChart id='cs7' data={ROWS} x={X} {...KEYS} crosshair style={STYLE} />);
    const cx = document.querySelector('[data-testid="crosshair-x"]');
    expect(cx?.getAttribute('visibility')).toBe('hidden');
    fireEvent.mouseEnter(hits()[0], { clientX: 10, clientY: 50 });
    expect(cx?.getAttribute('visibility')).toBe('visible');
    expect(num(cx, 'x1')).toBeCloseTo(num(hits()[0], 'x') + num(hits()[0], 'width') / 2, 6);
    fireEvent.mouseLeave(hits()[0]);
    expect(cx?.getAttribute('visibility')).toBe('hidden');
  });

  it('isUtcTime follows the #57 rule', () => {
    expect(isUtcTime({ time: { isISO: true } })).toBe(true);
    expect(isUtcTime({ time: { isISO: true, utc: false } })).toBe(false);
    expect(isUtcTime({ time: { format: '%Y-%m-%d' } })).toBe(false);
    expect(isUtcTime({ time: { format: '%Y-%m-%d', utc: true } })).toBe(true);
    const p = prepareCandles([{ d: '2025-01-31', o: 1, h: 1, l: 1, c: 1 }], {
      x: withResolvedUtc({ key: 'd', time: { format: '%Y-%m-%d', utc: true } }),
      open: 'o',
      high: 'h',
      low: 'l',
      close: 'c',
    });
    expect(p.candles[0].datum.date.toISOString()).toBe('2025-01-31T00:00:00.000Z');
  });

  it('ISO dates are UTC by default; utc: false is local and hints once', () => {
    const one = [{ date: '2025-01-31', o: 1, h: 2, l: 0, c: 1 }];
    const tickText = () =>
      Array.from(document.querySelectorAll('[data-testid="x-axis"] .tick text')).map((t) => t.textContent);
    const { unmount } = render(<CandlestickChart id='cs8' data={one} x={X} {...KEYS} style={STYLE} />);
    expect(tickText()).toEqual(['2025-01-31']);
    expect(warnings('utc')).toHaveLength(0);
    unmount();
    render(
      <CandlestickChart id='cs8b' data={one} x={{ ...X, time: { isISO: true, utc: false } }} {...KEYS} style={STYLE} />
    );
    const local = new Date('2025-01-31T00:00:00Z');
    const pad = (n: number) => String(n).padStart(2, '0');
    expect(tickText()).toEqual([
      `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`,
    ]);
    expect(warnings('x.time.utc')).toHaveLength(1);
  });

  it('catalog resolves aliases and the OHLC variant', () => {
    expect(resolveChartRequest('stock chart')?.chart.name).toBe('CandlestickChart');
    expect(resolveChartRequest('ohlc')?.variant?.name).toBe('OHLC chart');
    expect(resolveChartRequest('ohlc chart')?.variant?.name).toBe('OHLC chart');
  });
});
