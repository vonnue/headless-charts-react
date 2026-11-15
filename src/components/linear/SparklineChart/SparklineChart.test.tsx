import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { chartCatalog, resolveChartRequest } from '@/catalog';
import { resetDevWarnings } from '@/utils/devEnvironment';
import { interruptTransitions } from '@/utils/interruptTransitions';

import SparklineChart, { SparklineDatum } from '.';
import meta from './meta';

vi.mock('@/utils/interruptTransitions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/interruptTransitions')>();
  return { interruptTransitions: vi.fn(actual.interruptTransitions) };
});

// Module-local declaration so this compiles without @types/node.
declare const process: { env: Record<string, string | undefined> };

const STYLE = { width: '400px', height: '200px' } as const;
const ZERO = { top: 0, right: 0, bottom: 0, left: 0 } as const;
const X = { key: 'x' } as const;

type Row = Record<string, unknown>;

const rowsOf = (values: Record<string, unknown[]>, xs?: unknown[]): Row[] => {
  const n = Math.max(...Object.values(values).map((v) => v.length));
  return Array.from({ length: n }, (_, i) => {
    const row: Row = { x: xs ? xs[i] : i };
    Object.entries(values).forEach(([k, v]) => {
      if (i < v.length) row[k] = v[i];
    });
    return row;
  });
};

const groups = () =>
  Array.from(document.querySelectorAll<SVGGElement>('[data-testid="sparkline"]'));
const lineOf = (key: string) =>
  document.querySelector<SVGPathElement>(
    `[data-testid="sparkline"][data-series="${key}"] [data-testid="sparkline-line"]`
  );
const hits = () =>
  Array.from(document.querySelectorAll<SVGRectElement>('[data-testid="sparkline-hit"]'));
const num = (el: Element | null | undefined, attr: string) =>
  Number(el?.getAttribute(attr) ?? NaN);

/** [x, y] pairs of the M/L commands in a path. */
const coords = (d: string | null | undefined): [number, number][] =>
  Array.from((d ?? '').matchAll(/[ML]\s*(-?[\d.e+-]+)[ ,](-?[\d.e+-]+)/g)).map(
    (m) => [Number(m[1]), Number(m[2])]
  );
const commands = (d: string | null | undefined) => (d ?? '').replace(/[^A-Za-z]/g, '');
const mCount = (d: string | null | undefined) => (d ?? '').split('M').length - 1;

const hasNaNAttr = (root: Element) =>
  Array.from(root.querySelectorAll('*')).some((el) =>
    Array.from(el.attributes).some((a) => a.value.includes('NaN'))
  );

const hasTransition = (el: Element | null) => !!el && Reflect.has(el, '__transition');
const schedules = (el: Element | null) =>
  Object.values(
    ((el as unknown as { __transition?: Record<string, { delay: number; duration: number }> })
      ?.__transition ?? {})
  );

const tooltipOf = (id: string) => document.getElementById(`tooltip-${id}`);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('SparklineChart', () => {
  beforeEach(() => {
    resetDevWarnings();
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.mocked(interruptTransitions).mockClear();
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
  });

  it('1: renders sparkline-chart with role="img" and no axis elements', () => {
    render(
      <SparklineChart id='s1' data={rowsOf({ a: [1, 2, 3] })} x={X} y={[{ key: 'a' }]} style={STYLE} />
    );
    const svg = screen.getByTestId('sparkline-chart');
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.querySelectorAll('.tick, .domain')).toHaveLength(0);
  });

  it('2: one sparkline group per y entry, top to bottom in y order, with data-series', () => {
    render(
      <SparklineChart
        id='s2'
        data={rowsOf({ a: [1, 2], b: [3, 4], c: [5, 6] })}
        x={X}
        y={[{ key: 'c' }, { key: 'a' }, { key: 'b' }]}
        style={STYLE}
      />
    );
    expect(groups().map((g) => g.getAttribute('data-series'))).toStrictEqual(['c', 'a', 'b']);
    const tops = hits().map((h) => num(h, 'y'));
    expect(tops[0]).toBeLessThan(tops[1]);
    expect(tops[1]).toBeLessThan(tops[2]);
  });

  it('3: shared y — same value at the same relative height; 40–60 spans 20% of 0–100', () => {
    render(
      <SparklineChart
        id='s3'
        data={rowsOf({ a: [0, 50, 100], b: [40, 50, 60] })}
        x={X}
        y={[{ key: 'a' }, { key: 'b' }]}
        margin={ZERO}
        padding={{ bar: 0 }}
        style={STYLE}
      />
    );
    const [h0, h1] = hits();
    const rel = (key: string, hit: SVGRectElement, i: number) =>
      (coords(lineOf(key)?.getAttribute('d'))[i][1] - num(hit, 'y')) / num(hit, 'height');
    // value 50 is point 1 in both series
    expect(rel('a', h0, 1)).toBeCloseTo(rel('b', h1, 1), 6);
    const extent = (key: string) => {
      const ys = coords(lineOf(key)?.getAttribute('d')).map((c) => c[1]);
      return Math.max(...ys) - Math.min(...ys);
    };
    expect(extent('b') / extent('a')).toBeCloseTo(0.2, 6);
  });

  it('4: y domain is the unniced min..max and does not include 0', () => {
    render(
      <SparklineChart
        id='s4'
        data={rowsOf({ a: [101, 110, 119] })}
        x={X}
        y={[{ key: 'a' }]}
        margin={ZERO}
        padding={{ bar: 0 }}
        style={STYLE}
      />
    );
    const ys = coords(lineOf('a')?.getAttribute('d')).map((c) => c[1]);
    expect(ys[0]).toBeCloseTo(200, 6); // 101 → row bottom
    expect(ys[2]).toBeCloseTo(0, 6); // 119 → row top
    expect(ys[1]).toBeCloseTo(100, 6);
  });

  it('5: domain pins (0 counts), start > end ignored with one warning, out-of-domain clipped not clamped', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const props = {
      x: X,
      y: [{ key: 'a' }],
      margin: ZERO,
      padding: { bar: 0 },
      style: STYLE,
    };
    const { rerender } = render(
      <SparklineChart id='s5' data={rowsOf({ a: [50, 100] })} domain={{ start: 0 }} {...props} />
    );
    expect(coords(lineOf('a')?.getAttribute('d'))[0][1]).toBeCloseTo(100, 6);

    rerender(
      <SparklineChart id='s5' data={rowsOf({ a: [50, 100] })} domain={{ start: 10, end: 5 }} {...props} />
    );
    rerender(
      <SparklineChart id='s5' data={rowsOf({ a: [50, 100] })} domain={{ start: 10, end: 5 }} {...props} />
    );
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('domain.start'))).toHaveLength(1);
    // Ignored → data extent 50..100
    const ys = coords(lineOf('a')?.getAttribute('d')).map((c) => c[1]);
    expect(ys[0]).toBeCloseTo(200, 6);
    expect(ys[1]).toBeCloseTo(0, 6);

    rerender(
      <SparklineChart id='s5' data={rowsOf({ a: [0, 100] })} domain={{ start: 0, end: 50 }} {...props} />
    );
    const path = lineOf('a');
    // 100 on a 0..50 domain over a 200px row: y = -200, not clamped to 0.
    expect(coords(path?.getAttribute('d'))[1][1]).toBeCloseTo(-200, 6);
    const clipId = /url\(#(.+)\)/.exec(path?.getAttribute('clip-path') ?? '')?.[1];
    const clipRect = document.getElementById(clipId ?? '')?.querySelector('rect');
    // Band grown by MARKER_RADIUS + 1 (3px) on every side so edge dots aren't halved.
    expect(num(clipRect, 'x')).toBe(-3);
    expect(num(clipRect, 'y')).toBe(-3);
    expect(num(clipRect, 'height')).toBe(206);
    expect(num(clipRect, 'width')).toBe(406);
  });

  it('6: all values equal → v ± 1, line mid-row', () => {
    render(
      <SparklineChart
        id='s6'
        data={rowsOf({ a: [5, 5, 5] })}
        x={X}
        y={[{ key: 'a' }]}
        margin={ZERO}
        padding={{ bar: 0 }}
        style={STYLE}
      />
    );
    coords(lineOf('a')?.getAttribute('d')).forEach(([, y]) => expect(y).toBeCloseTo(100, 6));
  });

  it('7: band rows over [0, innerHeight] with padding.bar (default 0.3)', () => {
    const data = rowsOf({ a: [1, 2], b: [3, 4] });
    const { rerender } = render(
      <SparklineChart id='s7' data={data} x={X} y={[{ key: 'a' }, { key: 'b' }]} margin={ZERO} style={STYLE} />
    );
    // d3 band: step = 200 / (2 - 0.3 + 2 * 0.3), bandwidth = step * 0.7
    const step = 200 / 2.3;
    let [h0, h1] = hits();
    expect(num(h0, 'height')).toBeCloseTo(step * 0.7, 6);
    expect(num(h0, 'y')).toBeCloseTo(step * 0.3, 6);
    expect(num(h1, 'y') - (num(h0, 'y') + num(h0, 'height'))).toBeCloseTo(step * 0.3, 6);

    rerender(
      <SparklineChart
        id='s7'
        data={data}
        x={X}
        y={[{ key: 'a' }, { key: 'b' }]}
        margin={ZERO}
        padding={{ bar: 0 }}
        style={STYLE}
      />
    );
    [h0, h1] = hits();
    expect(num(h0, 'y')).toBe(0);
    expect(num(h0, 'height')).toBe(100);
    expect(num(h1, 'y')).toBe(100);
  });

  describe('8: time x', () => {
    const originalTZ = process.env.TZ;
    beforeAll(() => {
      process.env.TZ = 'America/New_York';
    });
    afterAll(() => {
      process.env.TZ = originalTZ;
    });

    it('draws unsorted input in date order without mutating it; utc ?? isISO holds in the tooltip', () => {
      const data = [
        { date: '2025-01-03', a: 3 },
        { date: '2025-01-01', a: 1 },
        { date: '2025-01-02', a: 2 },
      ];
      const snapshot = JSON.parse(JSON.stringify(data));
      const x = { key: 'date', scalingFunction: 'time' as const, time: { isISO: true } };
      const { unmount } = render(
        <SparklineChart
          id='s8'
          data={data}
          x={x}
          y={[{ key: 'a' }]}
          margin={ZERO}
          tooltip={{}}
          style={STYLE}
        />
      );
      expect(data).toStrictEqual(snapshot);
      const pts = coords(lineOf('a')?.getAttribute('d'));
      expect(pts.map((p) => p[0])).toStrictEqual([0, 200, 400]);
      // Sorted values 1, 2, 3 rise left to right (y decreases).
      expect(pts[0][1]).toBeGreaterThan(pts[1][1]);
      expect(pts[1][1]).toBeGreaterThan(pts[2][1]);

      fireEvent.mouseEnter(hits()[0], { clientX: 0, clientY: 10 });
      expect(tooltipOf('s8')?.innerHTML).toContain('2025-01-01: 1');
      unmount();

      render(
        <SparklineChart
          id='s8b'
          data={data}
          x={{ ...x, time: { isISO: true, utc: false } }}
          y={[{ key: 'a' }]}
          margin={ZERO}
          tooltip={{}}
          style={STYLE}
        />
      );
      fireEvent.mouseEnter(hits()[0], { clientX: 0, clientY: 10 });
      // Local time west of UTC: UTC midnight reads as the previous day.
      expect(tooltipOf('s8b')?.innerHTML).toContain('2024-12-31: 1');
    });
  });

  it('9: numeric x is linear; string x is a point scale in input order', () => {
    const { unmount } = render(
      <SparklineChart
        id='s9'
        data={rowsOf({ a: [1, 2, 3] }, [0, 1, 10])}
        x={X}
        y={[{ key: 'a' }]}
        margin={ZERO}
        style={STYLE}
      />
    );
    expect(coords(lineOf('a')?.getAttribute('d')).map((p) => p[0])).toStrictEqual([0, 40, 400]);
    unmount();

    render(
      <SparklineChart
        id='s9b'
        data={rowsOf({ a: [1, 2, 3] }, ['b', 'a', 'c'])}
        x={X}
        y={[{ key: 'a' }]}
        margin={ZERO}
        padding={{ bar: 0 }}
        style={STYLE}
      />
    );
    const pts = coords(lineOf('a')?.getAttribute('d'));
    expect(pts.map((p) => p[0])).toStrictEqual([0, 200, 400]);
    // Input order kept: first point is value 1 (row bottom).
    expect(pts[0][1]).toBeCloseTo(200, 6);
  });

  it('10: x.start / x.end pin the x domain exactly', () => {
    render(
      <SparklineChart
        id='s10'
        data={rowsOf({ a: [1, 2, 3] }, [0, 5, 10])}
        x={{ key: 'x', start: -10, end: 10 }}
        y={[{ key: 'a' }]}
        margin={ZERO}
        style={STYLE}
      />
    );
    expect(coords(lineOf('a')?.getAttribute('d')).map((p) => p[0])).toStrictEqual([200, 300, 400]);
  });

  it('11: missing/NaN y values break the line, are not drawn as 0, no warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <SparklineChart
        id='s11'
        data={rowsOf({ a: [1, NaN, 3, 4, null, 2] })}
        x={X}
        y={[{ key: 'a' }]}
        margin={ZERO}
        padding={{ bar: 0 }}
        style={STYLE}
      />
    );
    const d = lineOf('a')?.getAttribute('d');
    expect(mCount(d)).toBe(3);
    // Domain 1..4 → 0 would sit below the row (y > 200); nothing does.
    coords(d).forEach(([, y]) => expect(y).toBeLessThanOrEqual(200 + 1e-6));
    expect(coords(d)).toHaveLength(4);
    expect(warn).not.toHaveBeenCalled();
  });

  it('12: unparsable dates in time mode are dropped with the dropped-rows warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <SparklineChart
        id='s12'
        data={[
          { date: '2025-01-01', a: 1 },
          { date: 'not a date', a: 5 },
          { date: '2025-01-03', a: 3 },
        ]}
        x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
        y={[{ key: 'a' }]}
        style={STYLE}
      />
    );
    expect(coords(lineOf('a')?.getAttribute('d'))).toHaveLength(2);
    const dropped = warn.mock.calls.filter((c) => String(c[0]).includes("isn't a valid date"));
    expect(dropped).toHaveLength(1);
    expect(String(dropped[0][0])).toContain('SparklineChart#s12');
  });

  it('13: duplicate series keys — the later entry is dropped with one warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { rerender } = render(
      <SparklineChart
        id='s13'
        data={rowsOf({ a: [1, 2], b: [3, 4] })}
        x={X}
        y={[{ key: 'a', label: 'First' }, { key: 'b' }, { key: 'a', label: 'Second' }]}
        labels={{ name: true }}
        style={STYLE}
      />
    );
    rerender(
      <SparklineChart
        id='s13'
        data={rowsOf({ a: [1, 2], b: [3, 4] })}
        x={X}
        y={[{ key: 'a', label: 'First' }, { key: 'b' }, { key: 'a', label: 'Second' }]}
        labels={{ name: true }}
        style={STYLE}
      />
    );
    expect(groups().map((g) => g.getAttribute('data-series'))).toStrictEqual(['a', 'b']);
    expect(screen.getByText('First')).toBeTruthy();
    expect(screen.queryByText('Second')).toBeNull();
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('"a"'))).toHaveLength(1);
  });

  it('14: a series with no finite values renders an empty group, no NaN attributes', () => {
    render(
      <SparklineChart
        id='s14'
        data={rowsOf({ a: [1, 2, 3], b: [NaN, null, 'x'] })}
        x={X}
        y={[{ key: 'a' }, { key: 'b' }]}
        markers={{ last: true, min: true, max: true }}
        labels={{ name: true, last: true }}
        style={STYLE}
      />
    );
    const g = groups()[1];
    expect(g.getAttribute('data-series')).toBe('b');
    expect(g.querySelector('path')).toBeNull();
    expect(g.querySelectorAll('circle')).toHaveLength(0);
    expect(g.querySelector('[data-testid="sparkline-last-value"]')).toBeNull();
    expect(g.querySelector('[data-testid="sparkline-name"]')?.textContent).toBe('b');
    expect(hasNaNAttr(screen.getByTestId('sparkline-chart'))).toBe(false);
  });

  it("15: curve 'step' and 'rounded' change the path; default is straight segments", () => {
    const data = rowsOf({ a: [1, 3, 2, 4], b: [1, 3, 2, 4], c: [1, 3, 2, 4] });
    render(
      <SparklineChart
        id='s15'
        data={data}
        x={X}
        y={[{ key: 'a' }, { key: 'b', curve: 'step' }, { key: 'c', curve: 'rounded' }]}
        style={STYLE}
      />
    );
    const dA = lineOf('a')?.getAttribute('d');
    expect(commands(dA)).toBe('MLLL');
    const dB = lineOf('b')?.getAttribute('d');
    // Step adds a horizontal-then-vertical pair per segment.
    expect(commands(dB)).not.toBe(commands(dA));
    expect(coords(dB).length).toBeGreaterThan(coords(dA).length);
    expect(commands(lineOf('c')?.getAttribute('d'))).toContain('C');
  });

  it('16: nothing coloured by default; className goes on the row group', () => {
    render(
      <SparklineChart
        id='s16'
        data={rowsOf({ a: [1, 3, 2], b: [2, 1, 3] })}
        x={X}
        y={[{ key: 'a', className: 'text-blue-500' }, { key: 'b' }]}
        markers={{ last: true, min: true, max: true }}
        labels={{ name: true, last: true }}
        style={STYLE}
      />
    );
    const svg = screen.getByTestId('sparkline-chart');
    svg.querySelectorAll('[data-testid="sparkline"] *').forEach((el) => {
      const fill = el.getAttribute('fill');
      const stroke = el.getAttribute('stroke');
      if (fill !== null) expect(['currentColor', 'none']).toContain(fill);
      if (stroke !== null) expect(stroke).toBe('currentColor');
      expect(el.getAttribute('class') ?? '').toBe('');
    });
    hits().forEach((h) => expect(h.getAttribute('fill')).toBe('transparent'));
    expect(groups()[0].getAttribute('class')).toBe('text-blue-500');
    expect(groups()[1].getAttribute('class')).toBeNull();
    expect(lineOf('a')?.getAttribute('vector-effect')).toBe('non-scaling-stroke');
  });

  it('17: markers off by default; last at last finite point; min/max at first occurrence; className added', () => {
    const data = rowsOf({ a: [1, 5, 1, 5, 3, NaN] });
    const props = { x: X, y: [{ key: 'a' }], margin: ZERO, padding: { bar: 0 }, style: STYLE };
    const { rerender } = render(<SparklineChart id='s17' data={data} {...props} />);
    expect(document.querySelectorAll('circle')).toHaveLength(0);

    rerender(
      <SparklineChart
        id='s17'
        data={data}
        {...props}
        markers={{ last: true, min: { className: 'text-red-500' }, max: { className: 'text-blue-700' } }}
      />
    );
    const pts = coords(lineOf('a')?.getAttribute('d'));
    const at = (testid: string) => {
      const els = document.querySelectorAll(`[data-testid="${testid}"]`);
      expect(els).toHaveLength(1);
      return els[0];
    };
    const last = at('sparkline-last');
    expect([num(last, 'cx'), num(last, 'cy')]).toStrictEqual(pts[4]);
    expect(last.getAttribute('r')).toBe('2');
    const min = at('sparkline-min');
    expect([num(min, 'cx'), num(min, 'cy')]).toStrictEqual(pts[0]);
    expect(min.getAttribute('class')).toBe('text-red-500');
    const max = at('sparkline-max');
    expect([num(max, 'cx'), num(max, 'cy')]).toStrictEqual(pts[1]);
    expect(max.getAttribute('class')).toBe('text-blue-700');
  });

  it('18: labels off by default; name (default key) left with anchor end; last value right; custom format', () => {
    const data = rowsOf({ a: [1, 1234.5], b: [2, 3] });
    const props = { x: X, margin: { ...ZERO, left: 50, right: 50 }, style: STYLE };
    const { rerender } = render(
      <SparklineChart id='s18' data={data} y={[{ key: 'a', label: 'Alpha' }, { key: 'b' }]} {...props} />
    );
    expect(document.querySelectorAll('text')).toHaveLength(0);

    rerender(
      <SparklineChart
        id='s18'
        data={data}
        y={[{ key: 'a', label: 'Alpha' }, { key: 'b' }]}
        labels={{ name: true, last: true }}
        {...props}
      />
    );
    const names = Array.from(document.querySelectorAll('[data-testid="sparkline-name"]'));
    expect(names.map((n) => n.textContent)).toStrictEqual(['Alpha', 'b']);
    expect(names[0].getAttribute('text-anchor')).toBe('end');
    expect(num(names[0], 'x')).toBe(-6);
    const lasts = Array.from(document.querySelectorAll('[data-testid="sparkline-last-value"]'));
    expect(lasts.map((n) => n.textContent)).toStrictEqual(['1,234.5', '3']);
    expect(lasts[0].getAttribute('text-anchor')).toBe('start');
    expect(num(lasts[0], 'x')).toBe(300 + 6);
    const lastPt = coords(lineOf('a')?.getAttribute('d'))[1];
    expect(num(lasts[0], "y")).toBeCloseTo(lastPt[1], 2);

    rerender(
      <SparklineChart
        id='s18'
        data={data}
        y={[{ key: 'a', label: 'Alpha' }, { key: 'b' }]}
        labels={{ last: { format: (v) => `${v.toFixed(0)}!` } }}
        {...props}
      />
    );
    expect(
      Array.from(document.querySelectorAll('[data-testid="sparkline-last-value"]')).map((n) => n.textContent)
    ).toStrictEqual(['1235!', '3!']);
  });

  it('19: one full-width hit rect per row; marks have pointer-events none; flat rows are hoverable', () => {
    render(
      <SparklineChart
        id='s19'
        data={rowsOf({ a: [1, 2, 3], flat: [7, 7, 7] })}
        x={X}
        y={[{ key: 'a' }, { key: 'flat', label: 'Flat' }]}
        margin={ZERO}
        padding={{ bar: 0 }}
        markers={{ last: true }}
        tooltip={{}}
        style={STYLE}
      />
    );
    const hs = hits();
    expect(hs).toHaveLength(2);
    hs.forEach((h) => {
      expect(num(h, 'x')).toBe(0);
      expect(num(h, 'width')).toBe(400);
      expect(num(h, 'height')).toBe(100);
      expect(h.getAttribute('pointer-events')).toBe('all');
    });
    groups().forEach((g) => expect(g.getAttribute('pointer-events')).toBe('none'));
    fireEvent.mouseEnter(hs[1], { clientX: 400, clientY: 150 });
    expect(tooltipOf('s19')?.className).toContain('opacity-100');
    expect(tooltipOf('s19')?.innerHTML).toContain('Flat');
  });

  it('20: tooltip snaps to the nearest finite x and passes a SparklineDatum; default HTML; html overrides', () => {
    const data = rowsOf({ a: [1, NaN, 3] });
    const { unmount } = render(
      <SparklineChart
        id='s20'
        data={data}
        x={X}
        y={[{ key: 'a', label: 'Alpha' }]}
        margin={ZERO}
        tooltip={{}}
        style={STYLE}
      />
    );
    // x px 0, (200 missing), 400: pointer at 190 snaps to x=0.
    fireEvent.mouseEnter(hits()[0], { clientX: 190, clientY: 10 });
    const html = tooltipOf('s20')?.innerHTML ?? '';
    expect(html).toBe('Alpha<br>0: 1');
    expect(html).not.toContain('NaN');
    fireEvent.mouseMove(hits()[0], { clientX: 260, clientY: 10 });
    expect(tooltipOf('s20')?.innerHTML).toBe('Alpha<br>2: 3');
    unmount();

    const seen: SparklineDatum[] = [];
    render(
      <SparklineChart
        id='s20b'
        data={data}
        x={X}
        y={[{ key: 'a', label: 'Alpha' }]}
        margin={ZERO}
        tooltip={{
          html: (d: SparklineDatum) => {
            seen.push(d);
            return `custom:${d.value}`;
          },
        }}
        style={STYLE}
      />
    );
    fireEvent.mouseEnter(hits()[0], { clientX: 390, clientY: 10 });
    expect(tooltipOf('s20b')?.innerHTML).toBe('custom:3');
    expect(seen[0]).toStrictEqual({
      data: data[2],
      seriesKey: 'a',
      seriesLabel: 'Alpha',
      x: 2,
      value: 3,
      index: 2,
    });
  });

  it('21: a new tooltip identity keeps row nodes and listeners; latest html used', () => {
    const data = rowsOf({ a: [1, 2] });
    const props = { x: X, y: [{ key: 'a' }], margin: ZERO, style: STYLE };
    const { rerender } = render(
      <SparklineChart id='s21' data={data} {...props} tooltip={{ html: () => 'first' }} />
    );
    const g0 = groups()[0];
    const h0 = hits()[0];
    const on0 = (h0 as unknown as { __on?: unknown[] }).__on?.slice();
    rerender(<SparklineChart id='s21' data={data} {...props} tooltip={{ html: () => 'second' }} />);
    expect(groups()[0]).toBe(g0);
    expect(hits()[0]).toBe(h0);
    expect((h0 as unknown as { __on?: unknown[] }).__on).toStrictEqual(on0);
    fireEvent.mouseEnter(h0, { clientX: 0, clientY: 10 });
    expect(tooltipOf('s21')?.innerHTML).toBe('second');
  });

  describe('22: drawing', () => {
    it('lines start at full dash offset, rows staggered by i × delay, marks hidden until row end', () => {
      render(
        <SparklineChart
          id='s22'
          data={rowsOf({ a: [1, 2, 3], b: [3, 2, 1], c: [2, 2, 3] })}
          x={X}
          y={[{ key: 'a' }, { key: 'b' }, { key: 'c' }]}
          markers={{ last: true }}
          labels={{ name: true, last: true }}
          drawing={{ duration: 1000, delay: 100 }}
          style={STYLE}
        />
      );
      ['a', 'b', 'c'].forEach((key, i) => {
        const path = lineOf(key)!;
        const len = num(path, 'stroke-dashoffset');
        expect(len).toBeGreaterThan(0);
        expect(path.getAttribute('stroke-dasharray')).toBe(`${len} ${len}`);
        const [sched] = schedules(path);
        expect(sched.delay).toBe(i * 100);
        expect(sched.duration).toBe(1000);
        const g = groups()[i];
        g.querySelectorAll('circle, text').forEach((el) => {
          expect(el.getAttribute('opacity')).toBe('0');
          expect(schedules(el)[0].delay).toBe(i * 100 + 1000);
        });
      });
    });

    it('no stagger when delay is missing or ≤ 0', () => {
      render(
        <SparklineChart
          id='s22b'
          data={rowsOf({ a: [1, 2], b: [2, 1] })}
          x={X}
          y={[{ key: 'a' }, { key: 'b' }]}
          drawing={{ duration: 500, delay: -5 }}
          style={STYLE}
        />
      );
      expect(schedules(lineOf('b'))[0].delay).toBe(0);
    });

    it('reaches final state at the end of the reveal', async () => {
      render(
        <SparklineChart
          id='s22c'
          data={rowsOf({ a: [1, 2, 3] })}
          x={X}
          y={[{ key: 'a' }]}
          markers={{ last: true }}
          drawing={{ duration: 20 }}
          style={STYLE}
        />
      );
      await sleep(400);
      const path = lineOf('a');
      expect(path?.getAttribute('stroke-dasharray')).toBeNull();
      expect(path?.getAttribute('stroke-dashoffset')).toBeNull();
      expect(document.querySelector('[data-testid="sparkline-last"]')?.getAttribute('opacity')).toBe('1');
    });

    it('duration 0 draws final geometry with no transitions', () => {
      render(
        <SparklineChart
          id='s22d'
          data={rowsOf({ a: [1, 2, 3] })}
          x={X}
          y={[{ key: 'a' }]}
          markers={{ last: true }}
          labels={{ last: true }}
          style={STYLE}
        />
      );
      const svg = screen.getByTestId('sparkline-chart');
      svg.querySelectorAll('*').forEach((el) => {
        expect(hasTransition(el)).toBe(false);
        expect(el.getAttribute('opacity')).toBeNull();
      });
      expect(lineOf('a')?.getAttribute('stroke-dasharray')).toBeNull();
    });
  });

  it('23: data change and unmount mid-transition interrupt, leaving final geometry and no timers', () => {
    const error = vi.spyOn(console, 'error');
    const props = {
      x: X,
      y: [{ key: 'a' }],
      margin: ZERO,
      padding: { bar: 0 },
      drawing: { duration: 1000 },
      style: STYLE,
    };
    const { rerender, unmount } = render(
      <SparklineChart id='s23' data={rowsOf({ a: [1, 2, 3] })} {...props} />
    );
    const oldPath = lineOf('a')!;
    expect(hasTransition(oldPath)).toBe(true);
    vi.mocked(interruptTransitions).mockClear();

    rerender(<SparklineChart id='s23' data={rowsOf({ a: [3, 2, 1, 0] })} {...props} />);
    expect(interruptTransitions).toHaveBeenCalled();
    expect(hasTransition(oldPath)).toBe(false);
    expect(oldPath.isConnected).toBe(false);
    expect(document.querySelectorAll('[data-testid="sparkline-line"]')).toHaveLength(1);
    const pts = coords(lineOf('a')?.getAttribute('d'));
    expect(pts).toHaveLength(4);
    expect(pts[0]).toStrictEqual([0, 0]);
    expect(pts[3]).toStrictEqual([400, 200]);

    const plot = document.querySelector('.sparkline-plot');
    const newPath = lineOf('a')!;
    expect(hasTransition(newPath)).toBe(true);
    vi.mocked(interruptTransitions).mockClear();
    expect(() => unmount()).not.toThrow();
    const calls = vi.mocked(interruptTransitions).mock.calls;
    expect(calls.some((c) => c[0] === plot)).toBe(true);
    expect(hasTransition(newPath)).toBe(false);
    expect(error).not.toHaveBeenCalled();
  });

  it('24: runtime changes to y, domain, markers, labels, margin redraw with no leftover nodes', () => {
    const data = rowsOf({ a: [1, 2, 3], b: [3, 2, 1], c: [2, 3, 1] });
    const { rerender } = render(
      <SparklineChart
        id='s24'
        data={data}
        x={X}
        y={[{ key: 'a' }, { key: 'b' }, { key: 'c' }]}
        markers={{ last: true, min: true, max: true }}
        labels={{ name: true, last: true }}
        style={STYLE}
      />
    );
    expect(groups()).toHaveLength(3);
    expect(document.querySelectorAll('circle')).toHaveLength(9);

    rerender(
      <SparklineChart
        id='s24'
        data={data}
        x={X}
        y={[{ key: 'b' }]}
        domain={{ start: 0, end: 10 }}
        markers={{ last: true }}
        labels={{ name: true }}
        margin={{ ...ZERO, left: 30 }}
        style={STYLE}
      />
    );
    expect(groups()).toHaveLength(1);
    expect(hits()).toHaveLength(1);
    expect(document.querySelectorAll('[data-testid="sparkline-line"]')).toHaveLength(1);
    expect(document.querySelectorAll('circle')).toHaveLength(1);
    expect(document.querySelectorAll('text')).toHaveLength(1);
    expect(document.querySelectorAll('clipPath')).toHaveLength(1);
    expect(num(hits()[0], 'width')).toBe(370);
    expect(document.querySelector('.sparkline-plot')?.getAttribute('transform')).toBe('translate(30,0)');
  });

  it('25: empty data / empty y render the shell; one data row renders points without segments', () => {
    const { rerender } = render(
      <SparklineChart id='s25' data={[]} x={X} y={[{ key: 'a' }]} style={STYLE} />
    );
    const svg = screen.getByTestId('sparkline-chart');
    expect(groups()).toHaveLength(0);
    expect(hasNaNAttr(svg)).toBe(false);
    rerender(<SparklineChart id='s25' data={rowsOf({ a: [1] })} x={X} y={[]} style={STYLE} />);
    expect(groups()).toHaveLength(0);
    expect(hasNaNAttr(svg)).toBe(false);

    rerender(
      <SparklineChart
        id='s25'
        data={rowsOf({ a: [4], b: [5] })}
        x={X}
        y={[{ key: 'a' }, { key: 'b' }]}
        markers={{ last: true }}
        style={STYLE}
      />
    );
    expect(groups()).toHaveLength(2);
    document.querySelectorAll('[data-testid="sparkline-line"]').forEach((p) =>
      expect(commands(p.getAttribute('d'))).not.toContain('L')
    );
    expect(document.querySelectorAll('[data-testid="sparkline-last"]')).toHaveLength(2);
    expect(hasNaNAttr(svg)).toBe(false);
  });

  it('26: title/description wire aria-*; aria-label default; each row summarises first/last/min/max', () => {
    const data = rowsOf({ a: [2, 1, 5, 3], b: [NaN] });
    const { unmount } = render(
      <SparklineChart
        id='s26'
        data={data}
        x={X}
        y={[{ key: 'a', label: 'Alpha' }, { key: 'b' }]}
        title='KPIs'
        description='Four weeks'
        style={STYLE}
      />
    );
    const svg = screen.getByTestId('sparkline-chart');
    expect(svg.querySelector('title')?.textContent).toBe('KPIs');
    expect(svg.getAttribute('aria-labelledby')).toBe('s26-title');
    expect(svg.querySelector('desc')?.textContent).toBe('Four weeks');
    expect(svg.getAttribute('aria-describedby')).toBe('s26-desc');
    expect(svg.getAttribute('aria-label')).toBeNull();
    expect(groups()[0].getAttribute('aria-label')).toBe('Alpha: first 2, last 3, min 1, max 5');
    expect(groups()[1].getAttribute('aria-label')).toBe('b: first n/a, last n/a, min n/a, max n/a');
    unmount();

    render(<SparklineChart id='s26b' data={data} x={X} y={[{ key: 'a' }]} style={STYLE} />);
    expect(screen.getByTestId('sparkline-chart').getAttribute('aria-label')).toBe('Sparkline chart');
  });

  it('27: catalog — aliases resolve to SparklineChart only; primary intent trend; LineChart lists it', () => {
    const aliases = ['sparkline', 'sparklines', 'sparkline chart', 'tufte sparkline', 'word-sized line chart'];
    expect(meta.aliases).toStrictEqual(aliases);
    aliases.forEach((alias) => {
      expect(resolveChartRequest(alias)?.chart.name).toBe('SparklineChart');
      const claimants = chartCatalog.filter(
        (c) =>
          c.aliases.includes(alias) ||
          (c.variants ?? []).some((v) => v.kind === 'chart-type' && v.aliases.includes(alias))
      );
      expect(claimants.map((c) => c.name)).toStrictEqual(['SparklineChart']);
    });
    expect(meta.intents[0]).toBe('trend');
    const line = chartCatalog.find((c) => c.name === 'LineChart');
    expect(line?.alternatives.map((a) => a.name)).toContain('SparklineChart');
    expect(line?.data.seriesCount?.note).toContain('SparklineChart');
  });
});
