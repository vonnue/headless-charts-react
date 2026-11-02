import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

// #16: the time scale must use the raw data extent, not a niced one.
describe('AreaChart time scale domain (#16)', () => {
  const timeData = [
    { date: '2020-01-15', value: 10 },
    { date: '2020-02-10', value: 20 },
    { date: '2020-03-17', value: 15 },
  ];

  it('maps the first and last dates to the edges of the x range (not niced)', () => {
    const { container } = render(
      <AreaChart
        id='area-chart-time-domain'
        data={timeData}
        style={{ width: '600px', height: '400px' }}
        margin={{ top: 40, right: 20, bottom: 40, left: 40 }}
        padding={{ top: 0, right: 0, bottom: 0, left: 0 }}
        x={{
          key: 'date',
          scalingFunction: 'time',
          time: { format: '%Y-%m-%d' },
        }}
        y={[{ key: 'value' }]}
      />
    );

    const svg = container.querySelector('#area-chart-time-domain');
    const d = svg?.querySelector('.area path')?.getAttribute('d') ?? '';
    const xs = Array.from(d.matchAll(/[ML]([-\d.e]+),/g), (m) => Number(m[1]));

    // Explicit margin.left = 40, margin.right = 20, padding = 0 → range [40, 580].
    // A niced domain would round the dates out to month boundaries and pull
    // the area's edges inwards.
    expect(xs.length).toBeGreaterThan(0);
    expect(Math.min(...xs)).toBeCloseTo(40, 6);
    expect(Math.max(...xs)).toBeCloseTo(580, 6);
  });
});

/**
 * Tooltip lifecycle inside AreaChart (spec: specs/issue-8.md, C5–C6)
 *
 * Re-render:   className-only rerenders with the same data keep one tooltip.
 * Data change: the tooltip survives and is populated on the next mousemove
 *              (which data it shows is #9's concern, see A6).
 */
const TIP_S = { width: '400px', height: '200px' };
const TIP_DATA = [
  { year: 2020, a: 1, b: 2 },
  { year: 2021, a: 3, b: 4 },
  { year: 2022, a: 5, b: 1 },
];
const TIP_DATA_2 = [...TIP_DATA, { year: 2023, a: 50, b: 9 }, { year: 2024, a: 7, b: 9 }];
const TIP_X = { key: 'year' };
const TIP_Y = [{ key: 'a' }, { key: 'b' }];
const TIP = {};
const count = (id: string): number => document.querySelectorAll(`[id="tooltip-${id}"]`).length;

describe('AreaChart tooltip lifecycle', () => {
  beforeEach(() => {
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
  });

  it('C5: keeps one tooltip after 5 className-only rerenders with the same data', () => {
    const props = { id: 'c5', data: TIP_DATA, x: TIP_X, y: TIP_Y, tooltip: TIP, style: TIP_S };
    const { rerender } = render(<AreaChart {...props} />);

    for (let i = 0; i < 5; i++) rerender(<AreaChart {...props} className={`c${i}`} />);

    expect(count('c5')).toBe(1);
  });

  it('C6: keeps a connected, populated tooltip after a data change', () => {
    const props = { id: 'c6', x: TIP_X, y: TIP_Y, tooltip: TIP, style: TIP_S };
    const { rerender } = render(<AreaChart {...props} data={TIP_DATA} />);
    rerender(<AreaChart {...props} data={TIP_DATA_2} />);
    const firstArea = document.querySelector('#c6 .area path');
    if (!firstArea) throw new Error('no area path');

    fireEvent.mouseMove(firstArea, { clientX: 379, clientY: 50 });

    const el = document.getElementById('tooltip-c6');
    expect(count('c6')).toBe(1);
    expect(el?.isConnected).toBe(true);
    expect(el?.innerHTML).not.toBe('');
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
