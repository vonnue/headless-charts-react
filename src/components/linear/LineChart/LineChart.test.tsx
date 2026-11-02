import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

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
