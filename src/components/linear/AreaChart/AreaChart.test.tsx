import { StrictMode } from 'react';
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

/**
 * AreaChart redraw with current props (spec: specs/issue-9.md, A1–A10)
 *
 * Happy path:  a data change redraws every `.area path` to match a fresh mount
 *              of the same props (the "oracle", rendered as `<id>-oracle-N`).
 * Props:       y series count, stacking type and x scale changes after mount.
 * Structure:   repeated redraws keep one root `g`, one `.area`, one clipPath
 *              and one path per series.
 * Edge cases:  shrinking data, empty -> data, StrictMode.
 * Tooltip:     after a data change the tooltip shows the new nearest x (A6).
 * Guards:      className-only rerender keeps the same area node (A7).
 */
const AS = { width: '400px', height: '200px' };
const AX = { key: 'year' };
const AX_TIME = { key: 'date', scalingFunction: 'time' as const, time: { isISO: true } };
const ad1 = [
  { year: 2020, a: 1, b: 2 },
  { year: 2021, a: 3, b: 4 },
  { year: 2022, a: 5, b: 1 },
];
const ad2 = [
  { year: 2020, a: 10, b: 2 },
  { year: 2021, a: 30, b: 4 },
  { year: 2022, a: 5, b: 1 },
  { year: 2023, a: 50, b: 9 },
  { year: 2024, a: 7, b: 9 },
];
const ad3 = [
  { year: 2020, a: 2, b: 3 },
  { year: 2021, a: 4, b: 1 },
];
const AD_EMPTY: typeof ad1 = [];
// A2 needs a third key; d1 from the spec only has `a` and `b`.
const AD_ABC = [
  { year: 2020, a: 1, b: 2, c: 3 },
  { year: 2021, a: 3, b: 4, c: 1 },
  { year: 2022, a: 5, b: 1, c: 2 },
];
const AD_DATES = [
  { year: 2020, date: '2020-01-01', a: 1, b: 2 },
  { year: 2021, date: '2021-01-01', a: 3, b: 4 },
  { year: 2022, date: '2022-01-01', a: 5, b: 1 },
];
const AY_A = [{ key: 'a' }];
const AY_AB = [{ key: 'a' }, { key: 'b' }];
const AY_ABC = [{ key: 'a' }, { key: 'b' }, { key: 'c' }];
const STACK_NORMAL = { type: 'normal' as const };
const STACK_100 = { type: '100%' as const };
const STACK_STREAM = { type: 'streamgraph' as const };
const STACK_DIVERGING = { type: 'diverging' as const };
const ATIP = {};

type AreaProps = Parameters<typeof AreaChart>[0];

const areaDs = (id: string): Array<string | null> =>
  Array.from(document.querySelectorAll(`#${id} .area path`)).map((el) => el.getAttribute('d'));

let oracleSeq = 0;
const areaOracle = (props: AreaProps): Array<string | null> => {
  const id = `${props.id}-oracle-${oracleSeq++}`;
  render(<AreaChart {...props} id={id} />);
  return areaDs(id);
};

describe('AreaChart redraw with current props', () => {
  beforeEach(() => {
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
  });

  it('A1: redraws every area for new data to match a fresh mount', () => {
    const base = { id: 'a1', x: AX, y: AY_AB, style: AS };
    const { rerender } = render(<AreaChart {...base} data={ad1} />);
    const before = areaDs('a1');

    rerender(<AreaChart {...base} data={ad2} />);

    const after = areaDs('a1');
    expect(after[0]).not.toBe(before[0]);
    expect(after).toStrictEqual(areaOracle({ ...base, data: ad2 }));
  });

  it('A2: draws one path per series as y changes 2 -> 1 -> 3', () => {
    const base = { id: 'a2', x: AX, data: AD_ABC, style: AS };
    const { rerender } = render(<AreaChart {...base} y={AY_AB} />);
    const counts = [areaDs('a2').length];
    rerender(<AreaChart {...base} y={AY_A} />);
    counts.push(areaDs('a2').length);

    rerender(<AreaChart {...base} y={AY_ABC} />);
    counts.push(areaDs('a2').length);

    expect(counts).toStrictEqual([2, 1, 3]);
  });

  it('A3: follows stacking type changes and normalises the 100% axis', () => {
    const base = { id: 'a3', x: AX, y: AY_AB, data: ad1, style: AS };
    const { rerender } = render(<AreaChart {...base} stacking={STACK_NORMAL} />);
    const results: Array<{ type: string; matches: boolean }> = [];
    let maxTick100 = Number.NaN;

    for (const stacking of [STACK_100, STACK_STREAM, STACK_DIVERGING]) {
      rerender(<AreaChart {...base} stacking={stacking} />);
      if (stacking === STACK_100) {
        const ticks = Array.from(document.querySelectorAll('#a3 [data-testid="y-axis"] .tick text')).map((t) =>
          Number(t.textContent?.replace(/,/g, '').replace('−', '-'))
        );
        maxTick100 = Math.max(...ticks);
      }
      const current = areaDs('a3');
      results.push({ type: stacking.type, matches: JSON.stringify(current) === JSON.stringify(areaOracle({ ...base, stacking })) });
    }

    expect(results).toStrictEqual([
      { type: '100%', matches: true },
      { type: 'streamgraph', matches: true },
      { type: 'diverging', matches: true },
    ]);
    expect(maxTick100).toBeLessThanOrEqual(1);
  });

  it('A4: matches a fresh mount through shrink and regrow', () => {
    const base = { id: 'a4', x: AX, y: AY_AB, style: AS };
    const { rerender } = render(<AreaChart {...base} data={ad2} />);
    rerender(<AreaChart {...base} data={ad3} />);
    const shrunk = areaDs('a4');

    rerender(<AreaChart {...base} data={ad2} />);

    expect(shrunk).toStrictEqual(areaOracle({ ...base, data: ad3 }));
    expect(areaDs('a4')).toStrictEqual(areaOracle({ ...base, data: ad2 }));
  });

  it('A5: keeps a single structure across repeated data changes', () => {
    const base = { id: 'a5', x: AX, y: AY_AB, style: AS };
    const { rerender } = render(<AreaChart {...base} data={ad1} />);
    rerender(<AreaChart {...base} data={ad2} />);

    rerender(<AreaChart {...base} data={ad3} />);

    const svg = document.getElementById('a5');
    expect({
      rootG: svg?.querySelectorAll(':scope > g').length,
      area: svg?.querySelectorAll('.area').length,
      clipPaths: svg?.querySelectorAll('clipPath').length,
      paths: svg?.querySelectorAll('.area path').length,
    }).toStrictEqual({ rootG: 1, area: 1, clipPaths: 1, paths: AY_AB.length });
    expect(areaDs('a5')).toStrictEqual(areaOracle({ ...base, data: ad3 }));
  });

  it('A6: shows the new data in the tooltip after a data change', () => {
    const base = { id: 'a6', x: AX, y: AY_AB, tooltip: ATIP, style: AS };
    const { rerender } = render(<AreaChart {...base} data={ad1} />);
    rerender(<AreaChart {...base} data={ad2} />);
    const firstArea = document.querySelector('#a6 .area path');
    if (!firstArea) throw new Error('no area path');

    fireEvent.mouseMove(firstArea, { clientX: 379, clientY: 50 });

    const tips = document.querySelectorAll('[id="tooltip-a6"]');
    expect(tips).toHaveLength(1);
    expect(tips[0].isConnected).toBe(true);
    expect(tips[0].innerHTML.startsWith('2024')).toBe(true);
  });

  it('A7: keeps the same area node on a className-only rerender', () => {
    const base = { id: 'a7', x: AX, y: AY_AB, data: ad1, style: AS };
    const { rerender } = render(<AreaChart {...base} className='one' />);
    const before = document.querySelector('#a7 .area path');

    rerender(<AreaChart {...base} className='two' />);

    expect(document.querySelector('#a7 .area path')).toBe(before);
  });

  it('A8: switches to a time scale when x changes after mount', () => {
    const base = { id: 'a8', y: AY_AB, data: AD_DATES, style: AS };
    const { rerender } = render(<AreaChart {...base} x={AX} />);

    rerender(<AreaChart {...base} x={AX_TIME} />);

    expect(areaDs('a8')).toStrictEqual(areaOracle({ ...base, x: AX_TIME }));
  });

  it('A9: redraws for new data under StrictMode', () => {
    const base = { id: 'a9', x: AX, y: AY_AB, style: AS };
    const { rerender } = render(
      <StrictMode>
        <AreaChart {...base} data={ad1} />
      </StrictMode>
    );

    rerender(
      <StrictMode>
        <AreaChart {...base} data={ad2} />
      </StrictMode>
    );

    expect(document.querySelectorAll('#a9 .area')).toHaveLength(1);
    expect(areaDs('a9')).toStrictEqual(areaOracle({ ...base, data: ad2 }));
  });

  it('A10: draws areas when data goes from empty to non-empty', () => {
    const base = { id: 'a10', x: AX, y: AY_AB, style: AS };
    const { rerender } = render(<AreaChart {...base} data={AD_EMPTY} />);

    rerender(<AreaChart {...base} data={ad1} />);

    expect(areaDs('a10')).toStrictEqual(areaOracle({ ...base, data: ad1 }));
  });
});
