import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';

import AreaChart from '.';
import data from './data.json';
import { TimeScaledAreaChart, TypedTimeSeries } from './AreaChart.time.stories';

describe('AreaChart', () => {
  const defaultArgs = {
    id: 'area-chart',
    data,
    x: {
      key: 'year',
    },
    y: [
      {
        key: 'iphone',
      },
      {
        key: 'macbook',
      },
      {
        key: 'ipad',
      },
      {
        key: 'wearables',
      },
      {
        key: 'services',
      },
    ],
  };

  it('renders Default area chart', () => {
    render(<AreaChart {...defaultArgs} />);

    const svg = screen.getByTestId('area-chart');
    expect(svg).toBeTruthy();
    expect(svg.tagName).toBe('svg');
  });

  it('renders one area path per Y series', () => {
    render(<AreaChart {...defaultArgs} />);

    const svg = screen.getByTestId('area-chart');
    const areaPaths = svg.querySelectorAll('path');
    // Should have at least one path per series
    expect(areaPaths.length).toBeGreaterThanOrEqual(defaultArgs.y.length);
  });

  it('renders with custom className', () => {
    const styledArgs = {
      ...defaultArgs,
      id: 'area-chart-styled',
      y: [
        {
          key: 'iphone',
          className: 'text-purple-900',
        },
        {
          key: 'macbook',
          className: 'text-purple-700',
        },
      ],
    };

    render(<AreaChart {...styledArgs} />);

    const svg = screen.getByTestId('area-chart-styled');
    expect(svg).toBeTruthy();
  });

  it('renders with padding', () => {
    const padding = {
      top: 20,
      right: 20,
      bottom: 20,
      left: 20,
    };

    render(
      <AreaChart {...defaultArgs} id='area-chart-padding' padding={padding} />
    );

    const svg = screen.getByTestId('area-chart-padding');
    expect(svg).toBeTruthy();
  });

  it('renders with zooming enabled', () => {
    render(
      <AreaChart
        {...defaultArgs}
        id='area-chart-zooming'
        zooming={{
          enabled: true,
        }}
      />
    );

    const svg = screen.getByTestId('area-chart-zooming');
    expect(svg).toBeTruthy();
  });

  it('renders with 100% stacking', () => {
    render(
      <AreaChart
        {...defaultArgs}
        id='stacked-area-100'
        stacking={{
          type: '100%',
        }}
      />
    );

    const svg = screen.getByTestId('stacked-area-100');
    expect(svg).toBeTruthy();
  });

  it('renders streamgraph', () => {
    render(
      <AreaChart
        {...defaultArgs}
        id='stacked-area-streamgraph'
        stacking={{
          type: 'streamgraph',
        }}
      />
    );

    const svg = screen.getByTestId('stacked-area-streamgraph');
    expect(svg).toBeTruthy();
  });

  it('renders diverging area chart', () => {
    render(
      <AreaChart
        {...defaultArgs}
        id='area-chart-diverging'
        stacking={{
          type: 'diverging',
        }}
      />
    );

    const svg = screen.getByTestId('area-chart-diverging');
    expect(svg).toBeTruthy();
  });

  it('keeps the shared y-scale true to value when diverging series have different magnitudes', () => {
    const flowsData = [
      { year: 2012, inflow: 120, outflow: -50 },
      { year: 2013, inflow: 140, outflow: -60 },
      { year: 2014, inflow: 160, outflow: -70 },
    ];

    render(
      <AreaChart
        id='area-chart-diverging-scale'
        data={flowsData}
        x={{ key: 'year' }}
        y={[{ key: 'inflow' }, { key: 'outflow' }]}
        stacking={{ type: 'diverging' }}
      />
    );

    const svg = screen.getByTestId('area-chart-diverging-scale');
    const yAxis = svg.querySelector('[data-testid="y-axis"]');
    const tickValues = Array.from(yAxis?.querySelectorAll('.tick text') ?? []).map(
      // d3 renders the minus sign as U+2212, not ASCII "-"
      (tick) => Number(tick.textContent?.replace('−', '-'))
    );

    // The scale must span both the large positive (inflow) and the small
    // negative (outflow) extents unmodified — diverging is not normalised
    // like `100%` or `streamgraph`, so bands stay proportional to real value.
    expect(Math.max(...tickValues)).toBeGreaterThan(100);
    expect(Math.min(...tickValues)).toBeLessThan(0);
  });

  it('renders axes', () => {
    render(
      <AreaChart
        {...defaultArgs}
        id='area-chart-axes'
        x={{
          key: 'year',
          axis: { location: 'bottom', ticks: 5 },
        }}
      />
    );

    const svg = screen.getByTestId('area-chart-axes');
    const xAxis = svg.querySelector('[data-testid="x-axis"]');
    expect(xAxis).toBeTruthy();
  });

  it('handles empty data gracefully', () => {
    render(<AreaChart {...defaultArgs} id='area-chart-empty' data={[]} />);

    const svg = screen.getByTestId('area-chart-empty');
    expect(svg).toBeTruthy();
  });
});

describe('AreaChart time scaling stories (#15)', () => {
  // Regression for #15: the time stories set `isISO` directly on `x` instead
  // of `x.time`, so the ISO strings were parsed with the default
  // '%Y-%m-%d' format, every date came back null and the chart drew NaN.
  const timeStories = [
    ['TimeScaledAreaChart', TimeScaledAreaChart.input.args],
    ['TypedTimeSeries', TypedTimeSeries.input.args],
  ] as const;

  const areaPathData = (id: string) =>
    Array.from(screen.getByTestId(id).querySelectorAll('path'))
      .map((path) => path.getAttribute('d'))
      .filter((d): d is string => !!d);

  it.each(timeStories)('%s nests isISO under x.time', (_name, args) => {
    expect(args?.x?.time?.isISO).toBe(true);
    expect(args?.x).not.toHaveProperty('isISO');
  });

  it.each(timeStories)('%s renders area paths without NaN coordinates', (_name, args) => {
    render(<AreaChart {...(args as ComponentProps<typeof AreaChart>)} />);

    const paths = areaPathData(args?.id as string);
    expect(paths.length).toBeGreaterThan(0);
    paths.forEach((d) => expect(d).not.toContain('NaN'));
  });

  it('draws NaN when isISO is misplaced on x (the #15 bug), so the check above can fail', () => {
    const args = TimeScaledAreaChart.input.args;
    const buggyX = { key: 'date', scalingFunction: 'time', isISO: true };
    render(
      <AreaChart
        {...(args as ComponentProps<typeof AreaChart>)}
        id='buggy-time-area-chart'
        x={buggyX as ComponentProps<typeof AreaChart>['x']}
      />
    );

    const paths = areaPathData('buggy-time-area-chart');
    expect(paths.some((d) => d.includes('NaN'))).toBe(true);
  });
});
