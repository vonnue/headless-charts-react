import { scaleLinear, scaleLog, scalePoint } from 'd3-scale';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { decisionTree, resolveChartRequest } from '@/catalog';
import { resetDevWarnings } from '@/utils/devEnvironment';

import ParallelCoordinatesChart, {
  type PCBrushSelection,
  type PCDatum,
} from '.';

// 400×300 with default vertical margins → plot x 32..368, y 24..284.
const STYLE = { width: '400px', height: '300px' } as const;
const V_MARGIN = { top: 24, right: 32, bottom: 16, left: 32 } as const;
const H_MARGIN = { top: 24, right: 16, bottom: 24, left: 16 } as const;
const WIDTH = 400;
const HEIGHT = 300;

const rows = [
  { name: 'a', x: 1, y: 10, c: 'P' },
  { name: 'b', x: 2, y: 20, c: 'Q' },
  { name: 'c', x: 3, y: 30, c: 'P' },
];

const q = (testid: string, root: ParentNode = document.body) =>
  Array.from(root.querySelectorAll<SVGElement>(`[data-testid="${testid}"]`));

/** Points "x,y" from a linear path's M/L commands. */
const pts = (d: string | null) =>
  [...(d ?? '').matchAll(/[ML]([-\d.e]+),([-\d.e]+)/g)].map((m) => [
    Number(m[1]),
    Number(m[2]),
  ]);

const d3On = (node: Element | null): unknown =>
  node !== null && '__on' in node
    ? (node as unknown as { __on: unknown }).__on
    : undefined;

const ticksOf = (axis: Element) =>
  Array.from(axis.querySelectorAll('.tick text')).map((t) => t.textContent);

const tickPos = (axis: Element) =>
  Array.from(axis.querySelectorAll('.tick')).map((t) => {
    const m = t.getAttribute('transform')?.match(/translate\(([^,]+),([^)]+)\)/);
    return {
      text: t.textContent ?? '',
      x: Number(m?.[1]),
      y: Number(m?.[2]),
    };
  });

const plotBox = (
  margin: { top: number; right: number; bottom: number; left: number } = V_MARGIN,
  padding: { top?: number; right?: number; bottom?: number; left?: number } = {}
) => {
  const p = { top: 0, right: 0, bottom: 0, left: 0, ...padding };
  return {
    left: margin.left + p.left,
    top: margin.top + p.top,
    right: WIDTH - margin.right - p.right,
    bottom: HEIGHT - margin.bottom - p.bottom,
  };
};

const linearY = (values: number[], v: number, reverse = false) => {
  const { top, bottom } = plotBox();
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const domain = (
    lo === hi
      ? [lo - 1, lo + 1]
      : (scaleLinear().domain([lo, hi]).nice().domain() as [number, number])
  );
  const range: [number, number] = reverse ? [top, bottom] : [bottom, top];
  return scaleLinear().domain(domain).range(range)(v);
};

const axisXs = (keys: string[]) => {
  const { left, right } = plotBox();
  const scale = scalePoint<string>().domain(keys).range([left, right]).padding(0);
  return keys.map((k) => scale(k)!);
};

/** A real MouseEvent with `view` set, which d3-brush needs for its window listeners. */
const mouse = (target: EventTarget, type: string, clientX: number, clientY: number) =>
  act(() => {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY });
    // jsdom rejects vitest's window proxy as `view`, so set it after construction.
    Object.defineProperty(event, 'view', { value: window });
    target.dispatchEvent(event);
  });

const warnings = (spy: MockInstance<typeof console.warn>) =>
  spy.mock.calls.map((c) => String(c[0]));

describe('ParallelCoordinatesChart', () => {
  beforeEach(() => {
    resetDevWarnings();
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
  });
  afterEach(() => {
    vi.restoreAllMocks();
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
  });

  it('1: renders data-testid="parallel-coordinates-chart" with role="img"', () => {
    render(
      <ParallelCoordinatesChart id='pc1' data={rows} dimensions={['x', 'y']} style={STYLE} />
    );
    const svg = screen.getByTestId('parallel-coordinates-chart');
    expect(svg.getAttribute('role')).toBe('img');
  });

  it('2: one pc-axis per dimension, in dimensions order, evenly spaced; label falls back to the key', () => {
    render(
      <ParallelCoordinatesChart
        id='pc2'
        data={rows}
        dimensions={['x', { key: 'y', label: 'Why' }, 'c']}
        style={STYLE}
      />
    );
    const axes = q('pc-axis');
    expect(axes.map((a) => a.getAttribute('data-key'))).toEqual(['x', 'y', 'c']);
    expect(q('pc-axis-label').map((t) => t.textContent)).toEqual(['x', 'Why', 'c']);
    const xs = axes.map((a) => {
      const m = a.getAttribute('transform')?.match(/translate\(([^,]+),/);
      return Number(m?.[1]);
    });
    expect(xs).toEqual(axisXs(['x', 'y', 'c']));
    expect(xs[1] - xs[0]).toBeCloseTo(xs[2] - xs[1]);
  });

  it('3: one pc-line per drawn record, each crossing every axis at scale_k(value)', () => {
    render(
      <ParallelCoordinatesChart id='pc3' data={rows} dimensions={['x', 'y']} style={STYLE} />
    );
    const lines = q('pc-line');
    expect(lines).toHaveLength(3);
    expect(lines.map((l) => l.getAttribute('data-index'))).toEqual(['0', '1', '2']);
    const [x0, x1] = axisXs(['x', 'y']);
    const expected = rows.map((r) => [
      [x0, linearY([1, 2, 3], r.x)],
      [x1, linearY([10, 20, 30], r.y)],
    ]);
    lines.forEach((line, i) => {
      const p = pts(line.getAttribute('d'));
      expect(p).toHaveLength(2);
      expect(p[0][0]).toBeCloseTo(expected[i][0][0]);
      expect(p[0][1]).toBeCloseTo(expected[i][0][1]);
      expect(p[1][0]).toBeCloseTo(expected[i][1][0]);
      expect(p[1][1]).toBeCloseTo(expected[i][1][1]);
    });
    // Lowest x sits lowest on a vertical axis.
    expect(pts(lines[0].getAttribute('d'))[0][1]).toBeGreaterThan(
      pts(lines[2].getAttribute('d'))[0][1]
    );
  });

  it("4: type inference is linear for all-numeric values and point when any value is a string; explicit type overrides, and forced linear treats strings as missing", () => {
    const { unmount } = render(
      <ParallelCoordinatesChart
        id='pc4a'
        data={[
          { n: 1, s: 'US' },
          { n: 2, s: 'EU' },
        ]}
        dimensions={['n', 's']}
        style={STYLE}
      />
    );
    expect(ticksOf(q('pc-axis')[0]).every((t) => t !== null && /^-?\d/.test(t))).toBe(
      true
    );
    expect(ticksOf(q('pc-axis')[1])).toEqual(['US', 'EU']);
    unmount();

    const mixed = [
      { a: 1, b: 'x' },
      { a: 2, b: 3 },
    ];
    const { unmount: unmountB } = render(
      <ParallelCoordinatesChart
        id='pc4b'
        data={mixed}
        dimensions={['a', 'b']}
        style={STYLE}
      />
    );
    // Mixed numbers + strings infer point; both present values become categories.
    expect(ticksOf(q('pc-axis')[1])).toEqual(['x', '3']);
    unmountB();

    render(
      <ParallelCoordinatesChart
        id='pc4c'
        data={mixed}
        dimensions={['a', { key: 'b', type: 'linear' }]}
        style={STYLE}
      />
    );
    // Forced linear: 'x' is missing, so record 0 does not cross axis b.
    const line0 = pts(
      q('pc-line').find((l) => l.getAttribute('data-index') === '0')!.getAttribute('d')
    );
    expect(line0.every((p) => p[0] !== axisXs(['a', 'b'])[1])).toBe(true);
    expect(q('pc-isolated').some((c) => c.getAttribute('data-index') === '0')).toBe(
      true
    );
    const line1 = pts(
      q('pc-line').find((l) => l.getAttribute('data-index') === '1')!.getAttribute('d')
    );
    expect(line1.map((p) => p[0])).toEqual(axisXs(['a', 'b']));
  });

  it('5: numeric domain is the niced data extent and does not include 0 when every value is > 0', () => {
    render(
      <ParallelCoordinatesChart
        id='pc5'
        data={[
          { w: 1500, o: 2 },
          { w: 4500, o: 3 },
        ]}
        dimensions={['w', 'o']}
        style={STYLE}
      />
    );
    const ticks = ticksOf(q('pc-axis')[0]);
    expect(ticks).not.toContain('0');
    expect(ticks.every((t) => Number(t) > 0)).toBe(true);
    const domain = scaleLinear().domain([1500, 4500]).nice().domain();
    expect(domain[0]).toBeGreaterThan(0);
  });

  it('6: finite start/end pin the domain and honour 0; start > end is ignored with one warning; out-of-domain values are missing with one warning per dimension', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <ParallelCoordinatesChart
        id='pc6'
        data={[
          { a: 1, b: 5, d: 4 },
          { a: 2, b: 50, d: 5 },
        ]}
        dimensions={[
          { key: 'a', start: 0 },
          { key: 'b', start: 0, end: 10 },
          { key: 'd', start: 9, end: 1 },
        ]}
        style={STYLE}
      />
    );
    const msgs = warnings(warn);
    expect(msgs.filter((m) => /"b" has values outside/.test(m))).toHaveLength(1);
    expect(msgs.filter((m) => /"d" has start > end/.test(m))).toHaveLength(1);
    expect(ticksOf(q('pc-axis')[0])[0]).toBe('0');
    // b=50 is outside [0, 10], so that record does not cross axis b.
    const out = q('pc-line').find((l) => l.getAttribute('data-index') === '1')!;
    const bX = axisXs(['a', 'b', 'd'])[1];
    expect(pts(out.getAttribute('d')).every((p) => p[0] !== bX)).toBe(true);
    expect(document.body.innerHTML).not.toMatch(/NaN/);
  });

  it('7: type: "log" positions follow a log scale; values ≤ 0 are missing, with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <ParallelCoordinatesChart
        id='pc7'
        data={[
          { a: 1, b: 1 },
          { a: 10, b: 10 },
          { a: 100, b: 100 },
          { a: -1, b: 10 },
        ]}
        dimensions={[
          { key: 'a', type: 'log' },
          { key: 'b', type: 'log' },
        ]}
        style={STYLE}
      />
    );
    const { top, bottom } = plotBox();
    const y = scaleLog().domain([1, 100]).range([bottom, top]);
    const [x0] = axisXs(['a', 'b']);
    const lineAt = (index: string) =>
      pts(
        q('pc-line').find((l) => l.getAttribute('data-index') === index)!.getAttribute('d')
      );
    expect(lineAt('0')[0]).toEqual([x0, y(1)]);
    expect(lineAt('1')[0][1]).toBeCloseTo(y(10));
    expect(lineAt('2')[0][1]).toBeCloseTo(y(100));
    // A linear 10 would sit near 1, not at the log midpoint.
    const linearTen = scaleLinear().domain([1, 100]).range([bottom, top])(10);
    expect(Math.abs(lineAt('1')[0][1] - y(10))).toBeLessThan(
      Math.abs(lineAt('1')[0][1] - linearTen)
    );
    // a ≤ 0 is missing: record 3 is not placed on axis a, and appears as an isolated dot on b.
    const rec3 = q('pc-line').find((l) => l.getAttribute('data-index') === '3');
    if (rec3) expect(pts(rec3.getAttribute('d')).every((p) => p[0] !== x0)).toBe(true);
    const iso3 = q('pc-isolated').filter((c) => c.getAttribute('data-index') === '3');
    expect(iso3.length).toBe(1);
    expect(iso3[0].getAttribute('data-key')).toBe('b');
    expect(warnings(warn).filter((m) => /log axis "a"/.test(m)).length).toBe(1);
  });

  it('8: point axis categories follow order first, then first appearance; reverse flips the order', () => {
    const data = [
      { w: 1, o: 'US' },
      { w: 2, o: 'EU' },
      { w: 3, o: 'JP' },
    ];
    const { rerender } = render(
      <ParallelCoordinatesChart
        id='pc8'
        data={data}
        dimensions={['w', { key: 'o', type: 'point', order: ['EU'] }]}
        style={STYLE}
      />
    );
    expect(ticksOf(q('pc-axis')[1])).toEqual(['EU', 'US', 'JP']);
    const { top, bottom } = plotBox();
    const yOf = (label: string) => tickPos(q('pc-axis')[1]).find((t) => t.text === label)!.y;
    // Categories read top → bottom, so EU (first in order) sits above US.
    expect(yOf('EU')).toBeLessThan(yOf('US'));
    expect(yOf('US')).toBeLessThan(yOf('JP'));

    rerender(
      <ParallelCoordinatesChart
        id='pc8'
        data={data}
        dimensions={['w', { key: 'o', type: 'point', order: ['EU'], reverse: true }]}
        style={STYLE}
      />
    );
    expect(yOf('EU')).toBeGreaterThan(yOf('US'));
    expect(yOf('US')).toBeGreaterThan(yOf('JP'));
    // Line crossings use the raw scale (tick transforms include d3-axis's 0.5px crisp offset).
    const expected = scalePoint<string>()
      .domain(['EU', 'US', 'JP'])
      .range([bottom, top])
      .padding(0.5);
    const oX = axisXs(['w', 'o'])[1];
    const euLine = pts(
      q('pc-line').find((l) => l.getAttribute('data-index') === '1')!.getAttribute('d')
    );
    expect(euLine[1][0]).toBeCloseTo(oX);
    expect(euLine[1][1]).toBeCloseTo(expected('EU')!);
  });

  it('9: reverse on a numeric axis puts high values at the bottom', () => {
    render(
      <ParallelCoordinatesChart
        id='pc9'
        data={rows}
        dimensions={[{ key: 'x', reverse: true }, 'y']}
        style={STYLE}
      />
    );
    const ys = q('pc-line').map((l) => pts(l.getAttribute('d'))[0][1]);
    // Record c (x=3) now sits below record a (x=1).
    expect(ys[2]).toBeGreaterThan(ys[0]);
    expect(ys[0]).toBeCloseTo(linearY([1, 2, 3], 1, true));
    expect(ys[2]).toBeCloseTo(linearY([1, 2, 3], 3, true));
  });

  it('10: orientation="horizontal" stacks axes top → bottom and runs lines top → bottom', () => {
    render(
      <ParallelCoordinatesChart
        id='pc10'
        data={rows}
        dimensions={['x', 'y']}
        orientation='horizontal'
        style={STYLE}
      />
    );
    const { top, bottom, left, right } = plotBox(H_MARGIN);
    const axisYs = q('pc-axis').map((a) => {
      const m = a.getAttribute('transform')?.match(/translate\(0,([^)]+)\)/);
      return Number(m?.[1]);
    });
    expect(axisYs).toEqual([top, bottom]);
    const p = pts(q('pc-line')[0].getAttribute('d'));
    expect(p.map((pt) => pt[1])).toEqual([top, bottom]);
    // Horizontal: low values on the left.
    expect(p[0][0]).toBeLessThan(pts(q('pc-line')[2].getAttribute('d'))[0][0]);
    expect(p[0][0]).toBeGreaterThanOrEqual(left);
    expect(p[0][0]).toBeLessThanOrEqual(right);
  });

  it("11: missing: 'gap' (default) splits a line around a missing middle value, with no segment to that axis; a present value with both neighbours missing renders a pc-isolated circle", () => {
    render(
      <ParallelCoordinatesChart
        id='pc11'
        data={[
          { a: 1, b: null, c: 3 },
          { a: 2, b: 5, c: 4 },
        ]}
        dimensions={['a', 'b', 'c']}
        style={STYLE}
      />
    );
    expect(q('pc-line')).toHaveLength(2);
    const [aX, bX, cX] = axisXs(['a', 'b', 'c']);
    const gap = pts(
      q('pc-line').find((l) => l.getAttribute('data-index') === '0')!.getAttribute('d')
    );
    expect(gap.map((p) => p[0])).toEqual([aX, cX]);
    expect(gap.every((p) => p[0] !== bX)).toBe(true);
    const d = q('pc-line')
      .find((l) => l.getAttribute('data-index') === '0')!
      .getAttribute('d')!;
    expect(d.match(/M/g)?.length).toBe(2);
    expect(d).not.toMatch(/L/);
    // Record 0: both remaining values are isolated (neighbour b is missing).
    expect(q('pc-isolated')).toHaveLength(2);
    expect(q('pc-isolated').every((c) => c.getAttribute('data-index') === '0')).toBe(
      true
    );
    expect(q('pc-isolated-hit')).toHaveLength(2);
    const complete = pts(
      q('pc-line').find((l) => l.getAttribute('data-index') === '1')!.getAttribute('d')
    );
    expect(complete.map((p) => p[0])).toEqual([aX, bX, cX]);
  });

  it("12: missing: 'drop' draws no pc-line for a record with a missing value, and a count warning fires once", () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <ParallelCoordinatesChart
        id='pc12'
        data={[
          { a: 1, b: null },
          { a: 2, b: 5 },
        ]}
        dimensions={['a', 'b']}
        missing='drop'
        style={STYLE}
      />
    );
    expect(q('pc-line').map((l) => l.getAttribute('data-index'))).toEqual(['1']);
    expect(warnings(warn).filter((m) => /dropped/.test(m))).toHaveLength(1);
  });

  it('13: a record whose values are all missing is never drawn', () => {
    render(
      <ParallelCoordinatesChart
        id='pc13'
        data={[
          { a: null, b: undefined },
          { a: NaN, b: Infinity },
          { a: 1, b: 2 },
        ]}
        dimensions={['a', 'b']}
        style={STYLE}
      />
    );
    expect(q('pc-line').map((l) => l.getAttribute('data-index'))).toEqual(['2']);
    expect(q('pc-isolated')).toHaveLength(0);
  });

  it("14: line.curve: 'bump' produces a curved path that still passes through each axis value", () => {
    render(
      <ParallelCoordinatesChart
        id='pc14'
        data={rows}
        dimensions={['x', 'y']}
        line={{ curve: 'bump' }}
        style={STYLE}
      />
    );
    const d = q('pc-line')[0].getAttribute('d')!;
    expect(d).toMatch(/C/);
    const [x0, x1] = axisXs(['x', 'y']);
    const y0 = linearY([1, 2, 3], 1);
    const y1 = linearY([10, 20, 30], 10);
    expect(d.startsWith(`M${x0},${y0}`)).toBe(true);
    expect(d.endsWith(`${x1},${y1}`)).toBe(true);
  });

  it("15: opacity 'auto' is clamp(50/n, 0.1, 1) as a presentation attribute; a numeric line.opacity is used exactly", () => {
    const opacityOf = (n: number, id: string, opacity?: number | 'auto') => {
      const data = Array.from({ length: n }, (_, i) => ({ a: i, b: i % 7 }));
      const { unmount } = render(
        <ParallelCoordinatesChart
          id={id}
          data={data}
          dimensions={['a', 'b']}
          line={opacity !== undefined ? { opacity } : undefined}
          style={STYLE}
        />
      );
      const l = q('pc-line')[0];
      const result = {
        attr: l.getAttribute('stroke-opacity'),
        style: l.getAttribute('style'),
      };
      unmount();
      return result;
    };
    expect(opacityOf(10, 'pc15a')).toEqual({ attr: '1', style: null });
    expect(opacityOf(200, 'pc15b')).toEqual({ attr: '0.25', style: null });
    expect(opacityOf(1000, 'pc15c')).toEqual({ attr: '0.1', style: null });
    expect(opacityOf(10, 'pc15d', 0.8)).toEqual({ attr: '0.8', style: null });
  });

  it('16: color.classNameMap[category] sets the line class, a miss falls back to line.className, and no stroke colour is set by default', () => {
    const { unmount } = render(
      <ParallelCoordinatesChart id='pc16a' data={rows} dimensions={['x', 'y']} style={STYLE} />
    );
    expect(q('pc-line')[0].getAttribute('stroke')).toBeNull();
    unmount();

    render(
      <ParallelCoordinatesChart
        id='pc16b'
        data={rows}
        dimensions={['x', 'y']}
        color={{ key: 'c', classNameMap: { P: 'stroke-red-500' } }}
        line={{ className: 'stroke-gray-400' }}
        style={STYLE}
      />
    );
    const cls = q('pc-line').map((l) => l.getAttribute('class'));
    expect(cls[0]).toContain('stroke-red-500');
    expect(cls[1]).toContain('stroke-gray-400');
    expect(cls[2]).toContain('stroke-red-500');
    expect(q('pc-line')[0].getAttribute('stroke')).toBeNull();
  });

  it('17: a zero-spread dimension uses domain v ± 1, and every line crosses that axis at its midpoint', () => {
    render(
      <ParallelCoordinatesChart
        id='pc17'
        data={[
          { a: 1, b: 7 },
          { a: 3, b: 7 },
        ]}
        dimensions={['a', 'b']}
        style={STYLE}
      />
    );
    const { top, bottom } = plotBox();
    const mid = (top + bottom) / 2;
    const bX = axisXs(['a', 'b'])[1];
    q('pc-line').forEach((line) => {
      const p = pts(line.getAttribute('d'));
      expect(p[1][0]).toBe(bX);
      expect(p[1][1]).toBe(mid);
    });
  });

  it('18: an unknown dimension key still renders an axis, treats all its values as missing, and warns once naming the key; duplicate keys: the first wins, with one warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { unmount } = render(
      <ParallelCoordinatesChart
        id='pc18a'
        data={rows}
        dimensions={['x', 'zz']}
        style={STYLE}
      />
    );
    expect(q('pc-axis').map((a) => a.getAttribute('data-key'))).toEqual(['x', 'zz']);
    expect(ticksOf(q('pc-axis')[1])).toEqual([]);
    // Every zz value is missing, so each record is an isolated dot on x.
    expect(q('pc-isolated')).toHaveLength(3);
    expect(q('pc-line').every((l) => !pts(l.getAttribute('d')).some((p) => p[0] === axisXs(['x', 'zz'])[1]))).toBe(
      true
    );
    expect(warnings(warn).filter((m) => /"zz" is absent/.test(m))).toHaveLength(1);
    unmount();
    warn.mockClear();

    render(
      <ParallelCoordinatesChart
        id='pc18b'
        data={rows}
        dimensions={['x', 'y', 'x']}
        style={STYLE}
      />
    );
    expect(q('pc-axis').map((a) => a.getAttribute('data-key'))).toEqual(['x', 'y']);
    expect(warnings(warn).filter((m) => /"x" is listed more than once/.test(m))).toHaveLength(
      1
    );
  });

  it('19: one dimension draws one axis plus isolated circles and warns once; zero dimensions or empty data render an empty shell, with no NaN attributes and no throw', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { unmount } = render(
      <ParallelCoordinatesChart id='pc19a' data={rows} dimensions={['x']} style={STYLE} />
    );
    expect(q('pc-axis').length).toBe(1);
    expect(q('pc-isolated').length).toBe(3);
    expect(q('pc-isolated').map((c) => c.getAttribute('data-index'))).toEqual([
      '0',
      '1',
      '2',
    ]);
    expect(warnings(warn).filter((m) => /only one dimension/.test(m)).length).toBe(1);
    unmount();
    warn.mockClear();

    render(<ParallelCoordinatesChart id='pc19b' data={[]} dimensions={['x', 'y']} style={STYLE} />);
    render(<ParallelCoordinatesChart id='pc19c' data={rows} dimensions={[]} style={STYLE} />);
    expect(q('pc-axis').length).toBe(0);
    expect(q('pc-line').length).toBe(0);
    expect(q('pc-isolated').length).toBe(0);
    expect(warnings(warn).filter((m) => /no dimensions given/.test(m)).length).toBe(1);
    expect(document.body.innerHTML).not.toMatch(/NaN/);
  });

  it("20: tooltip default HTML lists the label, then each dimension with its format; missing values show 'n/a'; keys restricts the fields, and html receives a PCDatum", () => {
    const data = [
      { name: 'a', x: 1, y: null as number | null },
      { name: 'b', x: 2, y: 20 },
    ];
    const html = vi.fn<(d: PCDatum<(typeof data)[number]>) => string>(
      (d) => `custom:${d.index}`
    );
    const { rerender } = render(
      <ParallelCoordinatesChart
        id='pc20'
        data={data}
        label={{ key: 'name' }}
        dimensions={['x', { key: 'y', format: (v) => `${v} u` }]}
        tooltip={{}}
        style={STYLE}
      />
    );
    fireEvent.mouseEnter(q('pc-line-hit')[1]);
    expect(document.getElementById('tooltip-pc20')!.innerHTML).toBe('b<br>x: 2<br>y: 20 u');
    fireEvent.mouseLeave(q('pc-line-hit')[1]);
    fireEvent.mouseEnter(q('pc-isolated-hit')[0]);
    expect(document.getElementById('tooltip-pc20')!.innerHTML).toBe('a<br>x: 1<br>y: n/a');
    fireEvent.mouseLeave(q('pc-isolated-hit')[0]);

    rerender(
      <ParallelCoordinatesChart
        id='pc20'
        data={data}
        label={{ key: 'name' }}
        dimensions={['x', { key: 'y', format: (v) => `${v} u` }]}
        tooltip={{ keys: ['y'] }}
        style={STYLE}
      />
    );
    const hitB = q('pc-line-hit').find((h) => h.getAttribute('data-index') === '1')!;
    fireEvent.mouseEnter(hitB);
    expect(document.getElementById('tooltip-pc20')!.innerHTML).toBe('y: 20 u');
    fireEvent.mouseLeave(hitB);

    rerender(
      <ParallelCoordinatesChart
        id='pc20'
        data={data}
        label={{ key: 'name' }}
        dimensions={['x', { key: 'y', format: (v) => `${v} u` }]}
        tooltip={{ html }}
        style={STYLE}
      />
    );
    fireEvent.mouseEnter(q('pc-line-hit')[1]);
    expect(html).toHaveBeenCalledTimes(1);
    expect(html.mock.calls[0][0]).toEqual({
      data: data[1],
      index: 1,
      values: { x: 2, y: 20 },
      selected: true,
    });
    expect(document.getElementById('tooltip-pc20')!.innerHTML).toBe('custom:1');
  });

  it('21: hovering the 8px pc-line-hit (including 3px off the painted line) shows that record\'s tooltip; an isolated circle is hoverable through its r=6 hit; painted marks have no listeners, and the handler fires once', () => {
    const html = vi.fn<(d: PCDatum<(typeof rows)[number]>) => string>(
      (d) => `hit:${d.index}`
    );
    render(
      <ParallelCoordinatesChart
        id='pc21'
        data={[
          { name: 'a', x: 1, y: 10, c: 'P' },
          { name: 'gap', x: 2, y: null as unknown as number, c: 'Q' },
        ]}
        dimensions={['x', 'y']}
        tooltip={{ html }}
        highlight={false}
        style={STYLE}
      />
    );
    const hit = q('pc-line-hit')[0];
    expect(hit.getAttribute('stroke')).toBe('transparent');
    expect(hit.getAttribute('stroke-width')).toBe('8');
    expect(hit.getAttribute('pointer-events')).toBe('stroke');
    expect(hit.getAttribute('d')).toBe(q('pc-line')[0].getAttribute('d'));
    const isoHit = q('pc-isolated-hit')[0];
    expect(isoHit.getAttribute('r')).toBe('6');
    expect(q('pc-isolated')[0].getAttribute('r')).toBe('2');

    expect(d3On(q('pc-line')[0])).toBeFalsy();
    expect(d3On(q('pc-isolated')[0])).toBeFalsy();
    expect(document.querySelector('.pc-lines')!.getAttribute('pointer-events')).toBe(
      'none'
    );
    expect(document.querySelector('.pc-isolated')!.getAttribute('pointer-events')).toBe(
      'none'
    );

    fireEvent.mouseEnter(q('pc-line')[0]);
    expect(html).not.toHaveBeenCalled();
    fireEvent.mouseEnter(hit);
    expect(html).toHaveBeenCalledTimes(1);
    expect(document.getElementById('tooltip-pc21')!.innerHTML).toBe('hit:0');
    fireEvent.mouseLeave(hit);

    fireEvent.mouseEnter(isoHit);
    expect(html).toHaveBeenCalledTimes(2);
    expect(document.getElementById('tooltip-pc21')!.innerHTML).toBe('hit:1');
  });

  it('22: highlight (default) sets data-highlighted on the hovered line and data-dimmed on the others, and adds one pc-line-highlight overlay; mouseleave removes all of it; highlight: false adds none', () => {
    const { rerender } = render(
      <ParallelCoordinatesChart
        id='pc22'
        data={rows}
        dimensions={['x', 'y']}
        tooltip={{}}
        style={STYLE}
      />
    );
    const hit = q('pc-line-hit')[1];
    fireEvent.mouseEnter(hit);
    expect(q('pc-line')[1].getAttribute('data-highlighted')).toBe('true');
    expect(q('pc-line')[0].getAttribute('data-dimmed')).toBe('true');
    expect(q('pc-line')[2].getAttribute('data-dimmed')).toBe('true');
    expect(q('pc-line')[1].getAttribute('data-dimmed')).toBeNull();
    expect(q('pc-line-highlight')).toHaveLength(1);
    fireEvent.mouseLeave(hit);
    expect(q('pc-line-highlight')).toHaveLength(0);
    expect(q('pc-line')[0].getAttribute('data-dimmed')).toBeNull();
    expect(q('pc-line')[1].getAttribute('data-highlighted')).toBeNull();

    rerender(
      <ParallelCoordinatesChart
        id='pc22'
        data={rows}
        dimensions={['x', 'y']}
        tooltip={{}}
        highlight={false}
        style={STYLE}
      />
    );
    fireEvent.mouseEnter(q('pc-line-hit')[0]);
    expect(document.getElementById('tooltip-pc22')).toBeTruthy();
    expect(q('pc-line')[0].getAttribute('data-highlighted')).toBeNull();
    expect(q('pc-line').some((l) => l.getAttribute('data-dimmed') === 'true')).toBe(
      false
    );
    expect(q('pc-line-highlight')).toHaveLength(0);
  });

  it('23: re-rendering the parent with a new tooltip object identity keeps the same pc-line elements and does not rebind listeners; the next hover uses the latest tooltip.html', () => {
    const dims = ['x', 'y'];
    const first = vi.fn<() => string>(() => 'first');
    const second = vi.fn<() => string>(() => 'latest');
    const { rerender } = render(
      <ParallelCoordinatesChart
        id='pc23'
        data={rows}
        dimensions={dims}
        tooltip={{ html: first }}
        style={STYLE}
      />
    );
    const before = q('pc-line')[0];
    const hit = q('pc-line-hit')[0];
    const listeners = d3On(hit);
    expect(listeners).toBeTruthy();
    rerender(
      <ParallelCoordinatesChart
        id='pc23'
        data={rows}
        dimensions={dims}
        tooltip={{ html: second }}
        style={STYLE}
      />
    );
    expect(q('pc-line')[0]).toBe(before);
    expect(q('pc-line-hit')[0]).toBe(hit);
    expect(d3On(hit)).toBe(listeners);
    fireEvent.mouseEnter(hit);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(document.getElementById('tooltip-pc23')!.innerHTML).toBe('latest');
  });

  it('24: brushing off (default) renders no brush elements', () => {
    render(
      <ParallelCoordinatesChart id='pc24' data={rows} dimensions={['x', 'y']} style={STYLE} />
    );
    expect(q('pc-brush')).toHaveLength(0);
  });

  it('25: a brush on axis A filters to records inside A; adding a brush on axis B ANDs the filters; a record missing a value on a brushed axis is unselected; unselected lines get data-filtered="true" and no inline colour is changed', () => {
    const { unmount } = render(
      <ParallelCoordinatesChart
        id='pc25a'
        data={rows}
        dimensions={['x', 'y']}
        brushing
        style={STYLE}
      />
    );
    const overlays = q('pc-brush').map((b) => b.querySelector('.overlay')!);
    // x domain 1..3 over y 284..24: value 2 → 154, value 3 → 24. Span 200..20 keeps 2 and 3.
    mouse(overlays[0], 'mousedown', 32, 200);
    mouse(window, 'mousemove', 32, 20);
    expect(q('pc-line').map((l) => l.getAttribute('data-filtered'))).toEqual([
      'true',
      null,
      null,
    ]);
    mouse(window, 'mouseup', 32, 20);
    // y value 30 → 24. Span 100..20 keeps only record c, ANDed with the x brush.
    mouse(overlays[1], 'mousedown', 368, 100);
    mouse(window, 'mousemove', 368, 20);
    mouse(window, 'mouseup', 368, 20);
    expect(q('pc-line').map((l) => l.getAttribute('data-filtered'))).toEqual([
      'true',
      'true',
      null,
    ]);
    q('pc-line').forEach((l) => {
      expect(l.getAttribute('stroke')).toBeNull();
      expect(l.getAttribute('style')).toBeNull();
    });
    unmount();

    render(
      <ParallelCoordinatesChart
        id='pc25b'
        data={[
          { a: 1, b: 10 },
          { a: 2, b: null },
          { a: 3, b: 30 },
        ]}
        dimensions={['a', 'b']}
        brushing
        style={STYLE}
      />
    );
    // Brush b over the full present range; the record missing b is unselected.
    const bOverlay = q('pc-brush')[1].querySelector('.overlay')!;
    // b domain 10..30 over y 284..24; start at the plot end so 10 is included.
    mouse(bOverlay, 'mousedown', 368, 284);
    mouse(window, 'mousemove', 368, 24);
    mouse(window, 'mouseup', 368, 24);
    expect(q('pc-line').map((l) => l.getAttribute('data-filtered'))).toEqual([
      null,
      'true',
      null,
    ]);
  });

  it('26: a point-axis brush selects exactly the categories whose points fall inside the brushed span', () => {
    const onChange = vi.fn<(s: PCBrushSelection<(typeof rows)[number]>) => void>();
    render(
      <ParallelCoordinatesChart
        id='pc26'
        data={rows}
        dimensions={['c', 'x']}
        brushing={{ onChange }}
        style={STYLE}
      />
    );
    // c axis: P, Q with padding 0.5 over y 24..284 → P at 89, Q at 219.
    const overlay = q('pc-brush')[0].querySelector('.overlay')!;
    mouse(overlay, 'mousedown', 32, 60);
    mouse(window, 'mousemove', 32, 120);
    mouse(window, 'mouseup', 32, 120);
    expect(onChange.mock.calls[0][0].active).toEqual({ c: ['P'] });
    expect(onChange.mock.calls[0][0].indices).toEqual([0, 2]);
  });

  it('27: onChange fires on brush end with active intervals in data units (sorted [lo, hi]) plus selected and indices, not during the drag; clearing a brush fires with that axis removed; with no brush active, every drawn record is selected', () => {
    const onChange = vi.fn<(s: PCBrushSelection<(typeof rows)[number]>) => void>();
    render(
      <ParallelCoordinatesChart
        id='pc27'
        data={rows}
        dimensions={['x', 'y']}
        brushing={{ onChange }}
        style={STYLE}
      />
    );
    const overlay = q('pc-brush')[0].querySelector('.overlay')!;
    mouse(overlay, 'mousedown', 32, 100);
    mouse(window, 'mousemove', 32, 20);
    expect(onChange).not.toHaveBeenCalled();
    expect(q('pc-line').map((l) => l.getAttribute('data-filtered'))).toEqual([
      'true',
      'true',
      null,
    ]);
    mouse(window, 'mouseup', 32, 20);
    expect(onChange).toHaveBeenCalledTimes(1);
    const sel = onChange.mock.calls[0][0];
    expect(sel.indices).toEqual([2]);
    expect(sel.selected).toEqual([rows[2]]);
    const xRange = sel.active.x;
    expect(Array.isArray(xRange) && xRange.every((v) => typeof v === 'number')).toBe(
      true
    );
    const [lo, hi] = xRange as [number, number];
    expect(lo).toBeLessThan(hi);
    expect(lo).toBeGreaterThan(1);
    expect(hi).toBeGreaterThan(2);

    mouse(overlay, 'mousedown', 32, 250);
    mouse(window, 'mouseup', 32, 250);
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange.mock.calls[1][0].active).toEqual({});
    expect(onChange.mock.calls[1][0].indices).toEqual([0, 1, 2]);
    expect(onChange.mock.calls[1][0].selected).toEqual(rows);
    expect(q('pc-line').every((l) => l.getAttribute('data-filtered') === null)).toBe(
      true
    );
  });

  it('28: re-rendering with the same dimension keys keeps the brushes; removing a dimension drops its brush; a data change fires onChange only when the selected set changes, and then once', () => {
    const onChange = vi.fn<(s: PCBrushSelection<(typeof rows)[number]>) => void>();
    const dims = ['x', 'y'];
    const { rerender } = render(
      <ParallelCoordinatesChart
        id='pc28'
        data={rows}
        dimensions={dims}
        brushing={{ onChange }}
        style={STYLE}
      />
    );
    const overlay = q('pc-brush')[0].querySelector('.overlay')!;
    mouse(overlay, 'mousedown', 32, 100);
    mouse(window, 'mousemove', 32, 20);
    mouse(window, 'mouseup', 32, 20);
    expect(onChange).toHaveBeenCalledTimes(1);

    // Same selected set (y values change, x stays): brush kept, no extra onChange.
    rerender(
      <ParallelCoordinatesChart
        id='pc28'
        data={rows.map((r) => ({ ...r, y: r.y + 100 }))}
        dimensions={[...dims]}
        brushing={{ onChange }}
        style={STYLE}
      />
    );
    expect(q('pc-line')[2].getAttribute('data-filtered')).toBeNull();
    expect(q('pc-line')[0].getAttribute('data-filtered')).toBe('true');
    expect(onChange).toHaveBeenCalledTimes(1);

    // Record c moves outside the x brush: selected set changes, fires once.
    rerender(
      <ParallelCoordinatesChart
        id='pc28'
        data={rows.map((r) => (r.name === 'c' ? { ...r, x: 1 } : r))}
        dimensions={dims}
        brushing={{ onChange }}
        style={STYLE}
      />
    );
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange.mock.calls[1][0].indices).toEqual([]);

    // Removing the brushed dimension drops its brush and fires once (all selected).
    rerender(
      <ParallelCoordinatesChart
        id='pc28'
        data={rows}
        dimensions={['y']}
        brushing={{ onChange }}
        style={STYLE}
      />
    );
    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onChange.mock.calls[2][0].indices).toEqual([0, 1, 2]);
    expect(onChange.mock.calls[2][0].active).toEqual({});
  });

  it('29: while a brush gesture is active, tooltips and highlight are suspended', () => {
    render(
      <ParallelCoordinatesChart
        id='pc29'
        data={rows}
        dimensions={['x', 'y']}
        brushing
        tooltip={{}}
        style={STYLE}
      />
    );
    const overlay = q('pc-brush')[0].querySelector('.overlay')!;
    const hit = q('pc-line-hit')[2];
    mouse(overlay, 'mousedown', 32, 100);
    mouse(window, 'mousemove', 32, 20);
    fireEvent.mouseEnter(hit);
    expect(q('pc-line-highlight')).toHaveLength(0);
    expect(q('pc-line').every((l) => l.getAttribute('data-highlighted') === null)).toBe(
      true
    );
    const tip = document.getElementById('tooltip-pc29');
    expect(
      !tip || tip.style.display === 'none' || tip.innerHTML === ''
    ).toBe(true);
    mouse(window, 'mouseup', 32, 20);
    fireEvent.mouseEnter(hit);
    expect(q('pc-line-highlight')).toHaveLength(1);
    expect(q('pc-line')[2].getAttribute('data-highlighted')).toBe('true');
    expect(document.getElementById('tooltip-pc29')!.innerHTML).toContain('x: 3');
  });

  it('30: when data changes mid-transition, the old transition is interrupted, the final geometry matches the new data, and no nodes are left over; unmounting mid-transition interrupts with no errors or leftover timers', async () => {
    const { rerender, unmount } = render(
      <ParallelCoordinatesChart
        id='pc30'
        data={rows}
        dimensions={['x', 'y']}
        drawing={{ duration: 200 }}
        style={STYLE}
      />
    );
    rerender(
      <ParallelCoordinatesChart
        id='pc30'
        data={rows.slice(0, 2)}
        dimensions={['x', 'y']}
        drawing={{ duration: 200 }}
        style={STYLE}
      />
    );
    expect(q('pc-line')).toHaveLength(2);
    expect(q('pc-line-hit')).toHaveLength(2);
    await act(() => new Promise((r) => setTimeout(r, 300)));
    expect(q('pc-line')).toHaveLength(2);
    const p = pts(q('pc-line')[0].getAttribute('d'));
    expect(p[0][0]).toBe(axisXs(['x', 'y'])[0]);
    expect(p[0][1]).toBeCloseTo(linearY([1, 2], 1));
    unmount();
    expect(q('pc-line')).toHaveLength(0);
  });

  it('31: reordering the dimensions array at runtime redraws the axes in the new order, with lines following and no leftover nodes; a redraw clears the highlight overlay and attributes', () => {
    const { rerender } = render(
      <ParallelCoordinatesChart
        id='pc31'
        data={rows}
        dimensions={['x', 'y']}
        tooltip={{}}
        style={STYLE}
      />
    );
    fireEvent.mouseEnter(q('pc-line-hit')[0]);
    expect(q('pc-line-highlight')).toHaveLength(1);
    expect(q('pc-line')[0].getAttribute('data-highlighted')).toBe('true');

    rerender(
      <ParallelCoordinatesChart
        id='pc31'
        data={rows}
        dimensions={['y', 'x']}
        tooltip={{}}
        style={STYLE}
      />
    );
    expect(q('pc-axis').map((a) => a.getAttribute('data-key'))).toEqual(['y', 'x']);
    expect(q('pc-axis')).toHaveLength(2);
    expect(q('pc-line')).toHaveLength(3);
    expect(q('pc-line-hit')).toHaveLength(3);
    expect(q('pc-line-highlight')).toHaveLength(0);
    expect(q('pc-line').every((l) => l.getAttribute('data-highlighted') === null)).toBe(
      true
    );
    const [yX, xX] = axisXs(['y', 'x']);
    const p = pts(q('pc-line')[0].getAttribute('d'));
    expect(p[0][0]).toBe(yX);
    expect(p[0][1]).toBeCloseTo(linearY([10, 20, 30], 10));
    expect(p[1][0]).toBe(xX);
    expect(p[1][1]).toBeCloseTo(linearY([1, 2, 3], 1));
  });

  it('32: title/description produce <title>/<desc> and the matching aria-* attributes; otherwise aria-label is "Parallel coordinates chart", or ariaLabel if set', () => {
    const { rerender, unmount } = render(
      <ParallelCoordinatesChart
        id='pc32'
        data={rows}
        dimensions={['x', 'y']}
        title='Cars'
        description='By economy and power'
        style={STYLE}
      />
    );
    const svg = screen.getByTestId('parallel-coordinates-chart');
    expect(svg.querySelector('title')?.textContent).toBe('Cars');
    expect(svg.querySelector('title')?.getAttribute('id')).toBe('pc32-title');
    expect(svg.querySelector('desc')?.textContent).toBe('By economy and power');
    expect(svg.querySelector('desc')?.getAttribute('id')).toBe('pc32-desc');
    expect(svg.getAttribute('aria-labelledby')).toBe('pc32-title');
    expect(svg.getAttribute('aria-describedby')).toBe('pc32-desc');
    expect(svg.getAttribute('aria-label')).toBeNull();

    rerender(
      <ParallelCoordinatesChart id='pc32' data={rows} dimensions={['x', 'y']} style={STYLE} />
    );
    expect(screen.getByTestId('parallel-coordinates-chart').getAttribute('aria-label')).toBe(
      'Parallel coordinates chart'
    );
    unmount();

    render(
      <ParallelCoordinatesChart
        id='pc32b'
        data={rows}
        dimensions={['x', 'y']}
        ariaLabel='Vehicle profiles'
        style={STYLE}
      />
    );
    expect(screen.getByTestId('parallel-coordinates-chart').getAttribute('aria-label')).toBe(
      'Vehicle profiles'
    );
  });

  it("33: margin/padding inset the plot; with the default margins, the end axes' labels and ticks stay inside the SVG", () => {
    const padding = { top: 10, right: 20, bottom: 10, left: 20 };
    const margin = { top: 40, right: 40, bottom: 40, left: 50 };
    const { unmount } = render(
      <ParallelCoordinatesChart
        id='pc33a'
        data={rows}
        dimensions={['x', 'y']}
        margin={margin}
        padding={padding}
        style={STYLE}
      />
    );
    const box = plotBox(margin, padding);
    const xs = q('pc-axis').map((a) => {
      const m = a.getAttribute('transform')?.match(/translate\(([^,]+),/);
      return Number(m?.[1]);
    });
    expect(xs).toEqual([box.left, box.right]);
    unmount();

    render(
      <ParallelCoordinatesChart id='pc33b' data={rows} dimensions={['x', 'y']} style={STYLE} />
    );
    const svg = screen.getByTestId('parallel-coordinates-chart');
    q('pc-axis').forEach((axis) => {
      const t = axis.getAttribute('transform')?.match(/translate\(([^,]+),([^)]+)\)/);
      const ax = Number(t?.[1]);
      const label = axis.querySelector('[data-testid="pc-axis-label"]');
      const lx = ax + Number(label?.getAttribute('x') ?? 0);
      const ly = Number(label?.getAttribute('y') ?? 0);
      expect(lx).toBeGreaterThanOrEqual(0);
      expect(lx).toBeLessThanOrEqual(WIDTH);
      expect(ly).toBeGreaterThanOrEqual(0);
      expect(ly).toBeLessThanOrEqual(HEIGHT);
      tickPos(axis).forEach((tick) => {
        expect(ax + tick.x).toBeGreaterThanOrEqual(0);
        expect(ax + tick.x).toBeLessThanOrEqual(WIDTH);
        expect(tick.y).toBeGreaterThanOrEqual(0);
        expect(tick.y).toBeLessThanOrEqual(HEIGHT);
      });
    });
    expect(svg.querySelectorAll('[data-testid="pc-axis"]')).toHaveLength(2);
  });

  it("34: the four aliases resolve to ParallelCoordinatesChart and do not collide with RadarChart's aliases, Comet's 'slope chart', Waffle's 'heatmap' or the dual-axis 'combo chart'; meta.category is 'distribution', and primary intent profile is on that decisionTree branch", () => {
    for (const alias of [
      'parallel coordinates',
      'parallel coordinates plot',
      'parallel coordinates chart',
      'parallel plot',
    ])
      expect(resolveChartRequest(alias)?.chart.name).toBe('ParallelCoordinatesChart');

    expect(resolveChartRequest('spider chart')?.chart.name).toBe('RadarChart');
    expect(resolveChartRequest('star chart')?.chart.name).toBe('RadarChart');
    expect(resolveChartRequest('kiviat diagram')?.chart.name).toBe('RadarChart');
    expect(resolveChartRequest('polar chart')?.chart.name).toBe('RadarChart');
    expect(resolveChartRequest('slope chart')?.chart.name).toBe('CometPlot');
    expect(resolveChartRequest('heatmap')?.chart.name).toBe('WaffleChart');
    expect(resolveChartRequest('combo chart')?.chart.name).toBe('LineChart');
    for (const alias of [
      'spider chart',
      'star chart',
      'kiviat diagram',
      'polar chart',
      'slope chart',
      'heatmap',
      'combo chart',
    ])
      expect(resolveChartRequest(alias)?.chart.name).not.toBe(
        'ParallelCoordinatesChart'
      );

    const meta = resolveChartRequest('ParallelCoordinatesChart')?.chart;
    expect(meta?.category).toBe('distribution');
    expect(meta?.intents[0]).toBe('profile');
    const profile = decisionTree.find((b) => b.intent === 'profile');
    expect(profile?.options.some((o) => o.name === 'ParallelCoordinatesChart')).toBe(
      true
    );
  });
});

describe('ParallelCoordinatesChart drawing cleanup (#13)', () => {
  it('interrupts running transitions on unmount, with no error', () => {
    const { unmount } = render(
      <ParallelCoordinatesChart
        id='pc-interrupt'
        data={rows}
        dimensions={['x', 'y']}
        drawing={{ duration: 1000 }}
        style={STYLE}
      />
    );
    const lines = q('pc-line');
    expect(lines.some((l) => Reflect.has(l, '__transition'))).toBe(true);

    expect(unmount).not.toThrow();

    expect(lines.some((l) => Reflect.has(l, '__transition'))).toBe(false);
  });
});
