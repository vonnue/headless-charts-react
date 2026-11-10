import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { resolveChartRequest } from '@/catalog';
import { resetDevWarnings } from '@/utils/devEnvironment';

import ParallelCoordinatesChart from '.';

// 400×300 with default vertical margins → plot x 32..368, y 24..284.
const STYLE = { width: '400px', height: '300px' } as const;
const rows = [
  { name: 'a', x: 1, y: 10, c: 'P' },
  { name: 'b', x: 2, y: 20, c: 'Q' },
  { name: 'c', x: 3, y: 30, c: 'P' },
];

const q = (testid: string) =>
  Array.from(document.querySelectorAll<SVGElement>(`[data-testid="${testid}"]`));
/** Points "x,y" from a linear path's M/L commands. */
const pts = (d: string | null) =>
  [...(d ?? '').matchAll(/[ML]([-\d.e]+),([-\d.e]+)/g)].map((m) => [
    Number(m[1]),
    Number(m[2]),
  ]);

/** A real MouseEvent with `view` set, which d3-brush needs for its window listeners. */
const mouse = (target: EventTarget, type: string, clientX: number, clientY: number) =>
  act(() => {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY });
    // jsdom rejects vitest's window proxy as `view`, so set it after construction.
    Object.defineProperty(event, 'view', { value: window });
    target.dispatchEvent(event);
  });

describe('ParallelCoordinatesChart', () => {
  beforeEach(() => {
    resetDevWarnings();
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
  });
  afterEach(() => {
    vi.restoreAllMocks();
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
  });

  it('renders the root svg, one axis per dimension and one line per record', () => {
    render(
      <ParallelCoordinatesChart
        id='pc1'
        data={rows}
        dimensions={['x', { key: 'y', label: 'Why' }]}
        style={STYLE}
      />
    );
    const svg = screen.getByTestId('parallel-coordinates-chart');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Parallel coordinates chart');
    expect(q('pc-axis').map((a) => a.getAttribute('data-key'))).toEqual(['x', 'y']);
    expect(q('pc-axis-label').map((t) => t.textContent)).toEqual(['x', 'Why']);
    expect(q('pc-line')).toHaveLength(3);
    expect(q('pc-line-hit')).toHaveLength(3);
    // Each line crosses the two axes (x = 32 and 368); the lowest value sits lowest.
    const first = pts(q('pc-line')[0].getAttribute('d'));
    expect(first.map((p) => p[0])).toEqual([32, 368]);
    expect(first[0][1]).toBeGreaterThan(pts(q('pc-line')[2].getAttribute('d'))[0][1]);
    expect(document.body.innerHTML).not.toMatch(/NaN/);
  });

  it('does not force zero; infers point axes from strings', () => {
    render(
      <ParallelCoordinatesChart
        id='pc2'
        data={[
          { w: 1500, o: 'US' },
          { w: 4500, o: 'EU' },
        ]}
        dimensions={['w', { key: 'o', order: ['EU'] }]}
        style={STYLE}
      />
    );
    const ticks = Array.from(
      q('pc-axis')[0].querySelectorAll('.tick text')
    ).map((t) => t.textContent);
    expect(ticks).not.toContain('0');
    const cats = Array.from(q('pc-axis')[1].querySelectorAll('.tick text')).map(
      (t) => t.textContent
    );
    expect(cats).toEqual(['EU', 'US']);
  });

  it('gap mode splits a line around a missing middle value and draws isolated dots', () => {
    render(
      <ParallelCoordinatesChart
        id='pc3'
        data={[
          { a: 1, b: null, c: 3 },
          { a: 2, b: 5, c: 4 },
        ]}
        dimensions={['a', 'b', 'c']}
        style={STYLE}
      />
    );
    expect(q('pc-line')).toHaveLength(2);
    // Record 0: both remaining values are isolated (neighbour b is missing).
    expect(q('pc-isolated')).toHaveLength(2);
    expect(q('pc-isolated-hit')).toHaveLength(2);
  });

  it("drop mode removes records with a missing value and warns once", () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <ParallelCoordinatesChart
        id='pc4'
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
    expect(warn.mock.calls.filter((c) => /dropped/.test(String(c[0])))).toHaveLength(1);
  });

  it('sets auto stroke-opacity as an attribute', () => {
    const many = Array.from({ length: 200 }, (_, i) => ({ a: i, b: i % 7 }));
    render(<ParallelCoordinatesChart id='pc5' data={many} dimensions={['a', 'b']} style={STYLE} />);
    const l = q('pc-line')[0];
    expect(l.getAttribute('stroke-opacity')).toBe('0.25');
    expect(l.getAttribute('style')).toBeNull();
    expect(l.getAttribute('stroke')).toBeNull();
  });

  it('colours by category with a fallback to line.className', () => {
    render(
      <ParallelCoordinatesChart
        id='pc6'
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
  });

  it('hover on the hit path shows the tooltip and highlights; leave clears', () => {
    render(
      <ParallelCoordinatesChart
        id='pc7'
        data={rows}
        label={{ key: 'name' }}
        dimensions={['x', { key: 'y', format: (v) => `${v} u` }]}
        tooltip={{}}
        style={STYLE}
      />
    );
    const hit = q('pc-line-hit')[1];
    fireEvent.mouseEnter(hit);
    const tip = document.getElementById('tooltip-pc7')!;
    expect(tip.innerHTML).toBe('b<br>x: 2<br>y: 20 u');
    expect(q('pc-line')[1].getAttribute('data-highlighted')).toBe('true');
    expect(q('pc-line')[0].getAttribute('data-dimmed')).toBe('true');
    expect(q('pc-line-highlight')).toHaveLength(1);
    fireEvent.mouseLeave(hit);
    expect(q('pc-line-highlight')).toHaveLength(0);
    expect(q('pc-line')[0].getAttribute('data-dimmed')).toBeNull();
  });

  it('keeps lines when only the tooltip identity changes', () => {
    const dims = ['x', 'y'];
    const { rerender } = render(
      <ParallelCoordinatesChart id='pc8' data={rows} dimensions={dims} tooltip={{}} style={STYLE} />
    );
    const before = q('pc-line')[0];
    rerender(
      <ParallelCoordinatesChart
        id='pc8'
        data={rows}
        dimensions={dims}
        tooltip={{ html: () => 'latest' }}
        style={STYLE}
      />
    );
    expect(q('pc-line')[0]).toBe(before);
    fireEvent.mouseEnter(q('pc-line-hit')[0]);
    expect(document.getElementById('tooltip-pc8')!.innerHTML).toBe('latest');
  });

  it('brushing: drag filters lines and fires onChange on end only; persists across rerender', () => {
    const onChange = vi.fn();
    const dims = ['x', 'y'];
    const brushing = { onChange };
    const { rerender } = render(
      <ParallelCoordinatesChart id='pc9' data={rows} dimensions={dims} brushing={brushing} style={STYLE} />
    );
    const brushes = q('pc-brush');
    expect(brushes).toHaveLength(2);
    const overlay = brushes[0].querySelector('.overlay')!;
    // x axis domain 1..3 over y 284..24: value 2 → y 154, value 3 → y 24.
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
    expect(sel.active.x[0]).toBeLessThan(sel.active.x[1]);

    // Same data, new object identities: brush kept, no extra onChange.
    rerender(
      <ParallelCoordinatesChart id='pc9' data={[...rows]} dimensions={[...dims]} brushing={{ onChange }} style={STYLE} />
    );
    expect(q('pc-line')[2].getAttribute('data-filtered')).toBeNull();
    expect(q('pc-line')[0].getAttribute('data-filtered')).toBe('true');
    expect(onChange).toHaveBeenCalledTimes(1);

    // Removing the brushed dimension drops its brush and fires once.
    rerender(
      <ParallelCoordinatesChart id='pc9' data={rows} dimensions={['y']} brushing={{ onChange }} style={STYLE} />
    );
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange.mock.calls[1][0].indices).toEqual([0, 1, 2]);
  });

  it('empty data and zero dimensions render an empty shell', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<ParallelCoordinatesChart id='pc10' data={[]} dimensions={['x', 'y']} style={STYLE} />);
    render(<ParallelCoordinatesChart id='pc11' data={rows} dimensions={[]} style={STYLE} />);
    expect(q('pc-axis')).toHaveLength(0);
    expect(q('pc-line')).toHaveLength(0);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('interrupts transitions on data change and unmount without leftovers', async () => {
    const { rerender, unmount } = render(
      <ParallelCoordinatesChart id='pc12' data={rows} dimensions={['x', 'y']} drawing={{ duration: 200 }} style={STYLE} />
    );
    rerender(
      <ParallelCoordinatesChart id='pc12' data={rows.slice(0, 2)} dimensions={['x', 'y']} drawing={{ duration: 200 }} style={STYLE} />
    );
    expect(q('pc-line')).toHaveLength(2);
    await act(() => new Promise((r) => setTimeout(r, 300)));
    expect(pts(q('pc-line')[0].getAttribute('d'))[0][0]).toBe(32);
    unmount();
    expect(q('pc-line')).toHaveLength(0);
  });

  it('catalog aliases resolve to ParallelCoordinatesChart', () => {
    for (const alias of [
      'parallel coordinates',
      'parallel coordinates plot',
      'parallel coordinates chart',
      'parallel plot',
    ])
      expect(resolveChartRequest(alias)?.chart.name).toBe('ParallelCoordinatesChart');
  });
  it('pins, start > end, out-of-domain and log warnings', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <ParallelCoordinatesChart
        id='pc13'
        data={[
          { a: 1, b: 5, c: -1, d: 4 },
          { a: 2, b: 50, c: 100, d: 5 },
        ]}
        dimensions={[
          { key: 'a', start: 0 },
          { key: 'b', start: 0, end: 10 },
          { key: 'c', type: 'log' },
          { key: 'd', start: 9, end: 1 },
        ]}
        style={STYLE}
      />
    );
    const msgs = warn.mock.calls.map((c) => String(c[0]));
    expect(msgs.some((m) => /"b" has values outside/.test(m))).toBe(true);
    expect(msgs.some((m) => /log axis "c"/.test(m))).toBe(true);
    expect(msgs.some((m) => /"d" has start > end/.test(m))).toBe(true);
    const aTicks = Array.from(q('pc-axis')[0].querySelectorAll('.tick text')).map((t) => t.textContent);
    expect(aTicks[0]).toBe('0');
    expect(document.body.innerHTML).not.toMatch(/NaN/);
  });

  it('horizontal: axes stacked top to bottom; zero spread crosses at the midpoint', () => {
    render(
      <ParallelCoordinatesChart
        id='pc14'
        data={[
          { a: 1, b: 7 },
          { a: 3, b: 7 },
        ]}
        dimensions={['a', 'b']}
        orientation='horizontal'
        style={STYLE}
      />
    );
    // margins 24/16/24/16 → x 16..384, y 24..276.
    const p = pts(q('pc-line')[0].getAttribute('d'));
    expect(p.map((pt) => pt[1])).toEqual([24, 276]);
    expect(p[1][0]).toBe(200);
  });

  it('point-axis brush selects the categories under the span', () => {
    const onChange = vi.fn();
    render(
      <ParallelCoordinatesChart
        id='pc15'
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
    // Click outside the brush clears it.
    mouse(overlay, 'mousedown', 32, 250);
    mouse(window, 'mouseup', 32, 250);
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange.mock.calls[1][0].active).toEqual({});
    expect(q('pc-line').every((l) => l.getAttribute('data-filtered') === null)).toBe(true);
  });

  it('one dimension: isolated dots and a warning; unknown key warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<ParallelCoordinatesChart id='pc16' data={rows} dimensions={['x']} style={STYLE} />);
    expect(q('pc-isolated')).toHaveLength(3);
    render(<ParallelCoordinatesChart id='pc17' data={rows} dimensions={['x', 'zz']} style={STYLE} />);
    const msgs = warn.mock.calls.map((c) => String(c[0]));
    expect(msgs.some((m) => /only one dimension/.test(m))).toBe(true);
    expect(msgs.some((m) => /"zz" is absent/.test(m))).toBe(true);
  });

  it('bump curve still passes through each axis value', () => {
    render(
      <ParallelCoordinatesChart id='pc18' data={rows} dimensions={['x', 'y']} line={{ curve: 'bump' }} style={STYLE} />
    );
    const d = q('pc-line')[0].getAttribute('d')!;
    expect(d).toMatch(/C/);
    expect(d.startsWith('M32,284')).toBe(true);
    expect(d.endsWith('368,284')).toBe(true);
  });
});
