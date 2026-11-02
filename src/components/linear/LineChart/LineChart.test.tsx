import { StrictMode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render } from '@testing-library/react';

import LineChart from '.';

const data = [
  { year: 2020, revenue: 100, profit: 40 },
  { year: 2021, revenue: 150, profit: 60 },
  { year: 2022, revenue: 200, profit: 80 },
  { year: 2023, revenue: 250, profit: 100 },
];

describe('LineChart', () => {
  const defaultArgs = {
    id: 'line-chart',
    data,
    x: { key: 'year' },
    y: [{ key: 'revenue' }, { key: 'profit' }],
  };

  it('renders an SVG element', () => {
    render(<LineChart {...defaultArgs} />);

    const svg = document.getElementById('line-chart');
    expect(svg).toBeTruthy();
    expect(svg?.tagName).toBe('svg');
  });

  it('renders line paths for each Y series', () => {
    render(<LineChart {...defaultArgs} />);

    const svg = document.getElementById('line-chart');
    const paths = svg?.querySelectorAll('.left-series');
    expect(paths?.length).toBeGreaterThanOrEqual(1);
  });

  it('renders with custom className on series', () => {
    render(
      <LineChart
        {...defaultArgs}
        id='line-chart-styled'
        y={[
          { key: 'revenue', className: 'text-blue-500' },
          { key: 'profit', className: 'text-red-500' },
        ]}
      />
    );

    const svg = document.getElementById('line-chart-styled');
    expect(svg).toBeTruthy();
  });

  it('renders with custom padding and margin', () => {
    render(
      <LineChart
        {...defaultArgs}
        id='line-chart-padded'
        padding={{ top: 10, right: 10, bottom: 10, left: 10 }}
        margin={{ top: 30, right: 30, bottom: 30, left: 30 }}
      />
    );

    const svg = document.getElementById('line-chart-padded');
    expect(svg).toBeTruthy();
  });

  it('renders with symbol markers', () => {
    render(
      <LineChart
        {...defaultArgs}
        id='line-chart-symbols'
        y={[
          { key: 'revenue', symbol: 'circle' },
          { key: 'profit', symbol: 'diamond' },
        ]}
      />
    );

    const svg = document.getElementById('line-chart-symbols');
    const circles = svg?.querySelectorAll('.left-circles');
    expect(circles?.length).toBeGreaterThanOrEqual(1);
  });

  it('renders with a single Y series', () => {
    render(
      <LineChart
        {...defaultArgs}
        id='line-chart-single'
        y={[{ key: 'revenue' }]}
      />
    );

    const svg = document.getElementById('line-chart-single');
    expect(svg).toBeTruthy();
  });

  it('renders with showGuideLines enabled', () => {
    render(
      <LineChart {...defaultArgs} id='line-chart-guides' showGuideLines />
    );

    const svg = document.getElementById('line-chart-guides');
    expect(svg).toBeTruthy();
  });

  it('renders with reference lines', () => {
    render(
      <LineChart
        {...defaultArgs}
        id='line-chart-refs'
        referenceLines={[{ yLeft: 150, className: 'text-red-500' }]}
      />
    );

    const svg = document.getElementById('line-chart-refs');
    expect(svg).toBeTruthy();
  });

  describe('non-time x domain', () => {
    // Read only M/L x-coordinates so the test doesn't depend on the curve type.
    const pathXs = (container: HTMLElement, id: string) => {
      const d =
        container.querySelector(`#${id} .left-series`)?.getAttribute('d') ?? '';
      return Array.from(d.matchAll(/[ML]([-\d.e]+),/g), (m) => Number(m[1]));
    };
    const layout = {
      style: { width: '600px', height: '400px' },
      // Explicit margin.left = 40, margin.right = 20, padding = 0 → range [40, 580].
      margin: { top: 40, right: 20, bottom: 40, left: 40 },
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
    };

    it('uses x.end alone (without x.start) as the domain end', () => {
      const { container } = render(
        <LineChart
          {...defaultArgs}
          {...layout}
          id='line-chart-x-end-only'
          x={{ key: 'year', end: 2025 }}
          y={[{ key: 'revenue', symbol: 'none' }]}
        />
      );

      const xs = pathXs(container, 'line-chart-x-end-only');
      // Domain [2020, 2025]: 2020 → 40, 2023 → 40 + 540 * 3/5 = 364.
      // Ignoring x.end would map 2023 to the right edge (580).
      expect(xs).toHaveLength(4);
      expect(xs[0]).toBeCloseTo(40, 6);
      expect(xs[3]).toBeCloseTo(364, 6);
    });

    it('treats x.end = 0 as a real bound, not as unset', () => {
      const { container } = render(
        <LineChart
          {...defaultArgs}
          {...layout}
          id='line-chart-x-end-zero'
          x={{ key: 'year', end: 0 }}
          y={[{ key: 'revenue', symbol: 'none' }]}
        />
      );

      const xs = pathXs(container, 'line-chart-x-end-zero');
      // Domain [2020, 0]: 2020 -> 40, 2023 -> 40 + 540 * 3 / (0 - 2020).
      // An `x.end || max` style check would ignore 0 and map 2023 to 580.
      expect(xs).toHaveLength(4);
      expect(xs[0]).toBeCloseTo(40, 6);
      // The path is rounded to 3 decimals, so compare to 2.
      expect(xs[3]).toBeCloseTo(40 + (540 * 3) / (0 - 2020), 2);
    });

    it('falls back to the data max when only x.start is set', () => {
      const { container } = render(
        <LineChart
          {...defaultArgs}
          {...layout}
          id='line-chart-x-start-only'
          x={{ key: 'year', start: 2019 }}
          y={[{ key: 'revenue', symbol: 'none' }]}
        />
      );

      const xs = pathXs(container, 'line-chart-x-start-only');
      // Domain [2019, 2023]: 2020 → 40 + 540 / 4 = 175, 2023 → 580.
      expect(xs).toHaveLength(4);
      expect(xs.every(Number.isFinite)).toBe(true);
      expect(xs[0]).toBeCloseTo(175, 6);
      expect(xs[3]).toBeCloseTo(580, 6);
    });
  });

  it('handles empty data', () => {
    render(<LineChart {...defaultArgs} id='line-chart-empty' data={[]} />);

    const svg = document.getElementById('line-chart-empty');
    expect(svg).toBeTruthy();
  });

  it('renders with different curve types', () => {
    render(
      <LineChart
        {...defaultArgs}
        id='line-chart-curves'
        y={[
          { key: 'revenue', curve: 'step' },
          { key: 'profit', curve: 'rounded' },
        ]}
      />
    );

    const svg = document.getElementById('line-chart-curves');
    expect(svg).toBeTruthy();
  });
});

// #16: the time scale must use the raw data extent, not a niced one.
describe('LineChart time scale domain (#16)', () => {
  const timeData = [
    { date: '2020-01-15', value: 10 },
    { date: '2020-02-10', value: 20 },
    { date: '2020-03-17', value: 15 },
  ];

  it('maps the first and last dates to the edges of the x range (not niced)', () => {
    const { container } = render(
      <LineChart
        id='line-chart-time-domain'
        data={timeData}
        style={{ width: '600px', height: '400px' }}
        margin={{ top: 40, right: 20, bottom: 40, left: 40 }}
        padding={{ top: 0, right: 0, bottom: 0, left: 0 }}
        x={{
          key: 'date',
          scalingFunction: 'time',
          time: { format: '%Y-%m-%d' },
        }}
        y={[{ key: 'value', symbol: 'none' }]}
      />
    );

    const svg = container.querySelector('#line-chart-time-domain');
    const d = svg?.querySelector('.left-series')?.getAttribute('d') ?? '';
    // Read only M/L coordinates so the test doesn't depend on the curve type.
    const xs = Array.from(d.matchAll(/[ML]([-\d.e]+),/g), (m) => Number(m[1]));

    // Explicit margin.left = 40, margin.right = 20, padding = 0 → range [40, 580].
    // A niced domain would round 2020-01-15 / 2020-03-17 out to month
    // boundaries and pull the end points inwards.
    expect(xs.length).toBeGreaterThan(0);
    expect(Math.min(...xs)).toBeCloseTo(40, 6);
    expect(Math.max(...xs)).toBeCloseTo(580, 6);
  });
});

/**
 * LineChart redraw with current props (spec: specs/issue-9.md, L1–L15)
 *
 * Happy path:  a data change redraws series and circles to match a fresh mount
 *              of the same props (the "oracle", rendered as `<id>-oracle`).
 * Props:       series count, right-axis series, margin, reverse, reference
 *              lines and `id` changes are honoured after mount.
 * Structure:   repeated redraws leave exactly one root `g`, one `.left-g`, one
 *              `.group` per series and one clipPath (no stacking).
 * Edge cases:  empty <-> non-empty data, shrinking data, StrictMode.
 * Tooltip:     after a data change the tooltip shows the new data (L10) and
 *              exactly one tooltip element survives (L11).
 * Guards:      className-only rerender keeps the same series node (L9).
 */
const S = { width: '400px', height: '200px' };
const X = { key: 'year' };
const d1 = [
  { year: 2020, a: 1, b: 2 },
  { year: 2021, a: 3, b: 4 },
  { year: 2022, a: 5, b: 1 },
];
const d2 = [
  { year: 2020, a: 10, b: 2 },
  { year: 2021, a: 30, b: 4 },
  { year: 2022, a: 5, b: 1 },
  { year: 2023, a: 50, b: 9 },
  { year: 2024, a: 7, b: 9 },
];
const d3 = [
  { year: 2020, a: 2, b: 3 },
  { year: 2021, a: 4, b: 1 },
];
const EMPTY: typeof d1 = [];
const Y_A = [{ key: 'a' }];
const Y_AB = [{ key: 'a' }, { key: 'b' }];
const Y_A_CIRCLE = [{ key: 'a', symbol: 'circle' as const }];
const Y_A_RIGHT_B = [{ key: 'a' }, { key: 'b', axis: { location: 'right' as const } }];
const M1 = { top: 40, bottom: 40, left: 40, right: 20 };
const M2 = { top: 10, bottom: 30, left: 60, right: 10 };
const NO_REFS: Array<{ yLeft?: number; className?: string }> = [];
const REFS = [{ yLeft: 3, className: 'ref' }];
const TIP = {};

type LineProps = Parameters<typeof LineChart>[0];

const ds = (id: string, selector: string): Array<string | null> =>
  Array.from(document.querySelectorAll(`#${id} ${selector}`)).map((el) => el.getAttribute('d'));

const oracle = (props: LineProps): Array<string | null> => {
  const id = `${props.id}-oracle`;
  render(<LineChart {...props} id={id} />);
  return ds(id, '.left-series');
};

describe('LineChart redraw with current props', () => {
  beforeEach(() => {
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
  });

  it('L1: redraws the series for new data to match a fresh mount', () => {
    const base = { id: 'l1', x: X, y: Y_A, style: S };
    const { rerender } = render(<LineChart {...base} data={d1} />);
    const before = ds('l1', '.left-series');

    rerender(<LineChart {...base} data={d2} />);

    const after = ds('l1', '.left-series');
    expect(after).not.toStrictEqual(before);
    expect(after).toStrictEqual(oracle({ ...base, data: d2 }));
  });

  it('L2: draws one circle per point after data grows', () => {
    const base = { id: 'l2', x: X, y: Y_A_CIRCLE, style: S };
    const { rerender } = render(<LineChart {...base} data={d1} />);

    rerender(<LineChart {...base} data={d2} />);

    expect(document.querySelectorAll('#l2 .left-circles')).toHaveLength(5);
  });

  it('L3: removes circles and redraws the series when data shrinks', () => {
    const base = { id: 'l3', x: X, y: Y_A_CIRCLE, style: S };
    const { rerender } = render(<LineChart {...base} data={d2} />);

    rerender(<LineChart {...base} data={d3} />);

    expect(document.querySelectorAll('#l3 .left-circles')).toHaveLength(2);
    expect(ds('l3', '.left-series')).toStrictEqual(oracle({ ...base, data: d3 }));
  });

  it('L4: drops a series when y shrinks with the same data', () => {
    const base = { id: 'l4', x: X, data: d1, style: S };
    const { rerender } = render(<LineChart {...base} y={Y_AB} />);

    rerender(<LineChart {...base} y={Y_A} />);

    expect(document.querySelectorAll('#l4 .left-series')).toHaveLength(1);
  });

  it('L5: adds a right-axis series and its axis', () => {
    const base = { id: 'l5', x: X, data: d1, style: S };
    const { rerender } = render(<LineChart {...base} y={Y_A} />);

    rerender(<LineChart {...base} y={Y_A_RIGHT_B} />);

    expect(document.querySelectorAll('#l5 .right-series')).toHaveLength(1);
    expect(document.querySelector('#l5 .axis--right-y')).not.toBeNull();
  });

  it('L6: keeps a single structure across repeated data changes', () => {
    const base = { id: 'l6', x: X, y: Y_AB, style: S };
    const { rerender } = render(<LineChart {...base} data={d1} />);
    rerender(<LineChart {...base} data={d2} />);
    rerender(<LineChart {...base} data={d3} />);

    rerender(<LineChart {...base} data={d2} />);

    const svg = document.getElementById('l6');
    expect({
      rootG: svg?.querySelectorAll(':scope > g').length,
      leftG: svg?.querySelectorAll('.left-g').length,
      groups: svg?.querySelectorAll('.left-g > .group').length,
      clipPaths: svg?.querySelectorAll('clipPath').length,
    }).toStrictEqual({ rootG: 1, leftG: 1, groups: 2, clipPaths: 1 });
    expect(ds('l6', '.left-series')).toStrictEqual(oracle({ ...base, data: d2 }));
  });

  it('L7: honours a margin change after mount', () => {
    const base = { id: 'l7', x: X, y: Y_A, data: d1, style: S };
    const { rerender } = render(<LineChart {...base} margin={M1} />);

    rerender(<LineChart {...base} margin={M2} />);

    expect(ds('l7', '.left-series')).toStrictEqual(oracle({ ...base, margin: M2 }));
  });

  it('L8: honours a reverse change after mount', () => {
    const base = { id: 'l8', x: X, y: Y_A, data: d1, style: S };
    const { rerender } = render(<LineChart {...base} reverse={false} />);

    rerender(<LineChart {...base} reverse />);

    expect(ds('l8', '.left-series')).toStrictEqual(oracle({ ...base, reverse: true }));
  });

  it('L9: keeps the same series node on a className-only rerender', () => {
    const base = { id: 'l9', x: X, y: Y_A, data: d1, style: S };
    const { rerender } = render(<LineChart {...base} className='one' />);
    const before = document.querySelector('#l9 .left-series');

    rerender(<LineChart {...base} className='two' />);

    expect(document.querySelector('#l9 .left-series')).toBe(before);
  });

  it('L10: shows the new data in the tooltip after a data change', () => {
    const base = { id: 'l10', x: X, y: Y_A, tooltip: TIP, style: S };
    const { rerender } = render(<LineChart {...base} data={d1} />);
    rerender(<LineChart {...base} data={d2} />);
    const svg = document.getElementById('l10');
    if (!svg) throw new Error('no svg');

    fireEvent.mouseMove(svg, { clientX: 10000, clientY: 50 });

    expect(document.getElementById('tooltip-l10')?.innerHTML).toContain('year: 2024');
  });

  it('L11: keeps one tooltip element across data changes and removes it on unmount', () => {
    const base = { id: 'l11', x: X, y: Y_A, tooltip: TIP, style: S };
    const count = () => document.querySelectorAll('[id="tooltip-l11"]').length;
    const { rerender, unmount } = render(<LineChart {...base} data={d1} />);
    const counts = [count()];
    rerender(<LineChart {...base} data={d2} />);
    counts.push(count());
    rerender(<LineChart {...base} data={d3} />);
    counts.push(count());

    unmount();

    expect(counts).toStrictEqual([1, 1, 1]);
    expect(count()).toBe(0);
  });

  it('L12: draws reference lines added after mount', () => {
    const base = { id: 'l12', x: X, y: Y_A, data: d1, style: S };
    const { rerender } = render(<LineChart {...base} referenceLines={NO_REFS} />);

    rerender(<LineChart {...base} referenceLines={REFS} />);

    expect(document.querySelector('#l12 .reference-line')).not.toBeNull();
  });

  it('L13: goes from empty to data and back without throwing', () => {
    const base = { id: 'l13', x: X, y: Y_A, style: S };
    const { rerender } = render(<LineChart {...base} data={EMPTY} />);

    expect(() => rerender(<LineChart {...base} data={d1} />)).not.toThrow();
    const withData = ds('l13', '.left-series');
    expect(() => rerender(<LineChart {...base} data={EMPTY} />)).not.toThrow();

    expect(withData).toStrictEqual(oracle({ ...base, data: d1 }));
  });

  it('L14: redraws for new data under StrictMode without duplicating groups', () => {
    const base = { id: 'l14', x: X, y: Y_AB, style: S };
    const { rerender } = render(
      <StrictMode>
        <LineChart {...base} data={d1} />
      </StrictMode>
    );

    rerender(
      <StrictMode>
        <LineChart {...base} data={d2} />
      </StrictMode>
    );

    expect(document.querySelectorAll('#l14 .left-g > .group')).toHaveLength(Y_AB.length);
    expect(ds('l14', '.left-series')).toStrictEqual(oracle({ ...base, data: d2 }));
  });

  it('L15: draws into the new svg when the id changes', () => {
    const base = { x: X, y: Y_A, data: d1, style: S };
    const { rerender } = render(<LineChart {...base} id='l-a' />);

    rerender(<LineChart {...base} id='l-b' />);

    expect(document.querySelector('#l-b .left-series')).not.toBeNull();
    // Beyond the spec's assertion: the svg node is reused, so the old drawing
    // would satisfy the line above; the tooltip id proves a redraw with the new id.
    expect({ a: document.getElementById('tooltip-l-a'), b: document.getElementById('tooltip-l-b') !== null }).toStrictEqual({ a: null, b: true });
  });
});
