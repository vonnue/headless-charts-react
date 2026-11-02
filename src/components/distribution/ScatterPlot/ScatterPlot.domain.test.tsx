import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import ScatterPlot from '.';
import { tickPositions } from '@/test-utils/axisTicks';

// 600x400, margins 50/20/40/50, no padding → x [50, 550], y [360, 20].
const layout = {
  style: { width: '600px', height: '400px' },
  margin: { top: 20, right: 50, bottom: 40, left: 50 },
  padding: { top: 0, right: 0, bottom: 0, left: 0 },
};
const LEFT = 50;
const RIGHT = 550;
const BOTTOM = 360;
const TOP = 20;

const data = [
  { a: 10, b: 100 },
  { a: 20, b: 150 },
  { a: 30, b: 200 },
];

const xAxis = { axis: { location: 'bottom' as const, ticks: 5 } };
const yAxis = { axis: { location: 'left' as const, ticks: 5 } };

const ticksOf = (container: HTMLElement) => ({
  x: tickPositions(container.querySelector('[data-testid="x-axis"]'), 'horizontal'),
  y: tickPositions(container.querySelector('[data-testid="y-axis"]'), 'vertical'),
});

describe('ScatterPlot start/end domain (F4)', () => {
  it('falls back to the data for NaN and ±Infinity bounds', () => {
    const { container } = render(
      <ScatterPlot
        {...layout}
        id='scatter-nan'
        data={data}
        x={{ key: 'a', start: NaN, end: Infinity, ...xAxis }}
        y={{ key: 'b', start: -Infinity, end: NaN, ...yAxis }}
      />
    );
    const { x, y } = ticksOf(container);
    expect(x.get('10')).toBeCloseTo(LEFT, 2);
    expect(x.get('30')).toBeCloseTo(RIGHT, 2);
    expect(y.get('100')).toBeCloseTo(BOTTOM, 2);
    expect(y.get('200')).toBeCloseTo(TOP, 2);
  });

  it('respects 0 and finite pins that narrow or widen', () => {
    const { container } = render(
      <ScatterPlot
        {...layout}
        id='scatter-pinned'
        data={data}
        x={{ key: 'a', start: 0, end: 20, ...xAxis }}
        y={{ key: 'b', start: 0, end: 300, ...yAxis }}
      />
    );
    const { x, y } = ticksOf(container);
    expect(x.get('0')).toBeCloseTo(LEFT, 2);
    expect(x.get('20')).toBeCloseTo(RIGHT, 2);
    expect(y.get('0')).toBeCloseTo(BOTTOM, 2);
    expect(y.get('300')).toBeCloseTo(TOP, 2);
  });
});
