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

  const pathXs = (d: string | null) =>
    (d ?? '')
      .split(/[ML]/)
      .filter(Boolean)
      .map((point) => Number(point.split(',')[0]));

  it('maps the first and last dates to the edges of the x range (not niced)', () => {
    render(
      <LineChart
        id='line-chart-time-domain'
        data={timeData}
        style={{ width: '600px', height: '400px' }}
        x={{
          key: 'date',
          scalingFunction: 'time',
          time: { format: '%Y-%m-%d' },
        }}
        y={[{ key: 'value', symbol: 'none' }]}
      />
    );

    const svg = document.getElementById('line-chart-time-domain');
    const path = svg?.querySelector('.left-series');
    const xs = pathXs(path?.getAttribute('d') ?? null);

    // margin.left = 40, margin.right = 20, padding = 0 → range [40, 580].
    // A niced domain would round 2020-01-15 / 2020-03-17 out to month
    // boundaries and pull the end points inwards.
    expect(xs.length).toBe(timeData.length);
    expect(xs[0]).toBeCloseTo(40, 6);
    expect(xs[xs.length - 1]).toBeCloseTo(580, 6);
  });
});
