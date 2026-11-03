import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import BarChartStacked from '.';
import { tickPositions } from '@/test-utils/axisTicks';

// 600px wide, margin left/right 50, padding 0 → x range [50, 550] (span 500).
const layout = {
  style: { width: '600px', height: '400px' },
  margin: { top: 20, right: 50, bottom: 40, left: 50 },
  padding: { top: 0, right: 0, bottom: 0, left: 0, bar: 0.1 },
};
const L = 50;
const R = 550;

// Stacked totals: a = 30, b = 15.
const data = [
  { name: 'a', p: 10, q: 20 },
  { name: 'b', p: 5, q: 10 },
];

const xTicks = (container: HTMLElement) =>
  tickPositions(container.querySelector('[data-testid="x-axis"]'), 'horizontal');

describe('BarChartStacked start/end domain (F4)', () => {
  it('a pinned end narrows the axis below the stacked total', () => {
    const { container } = render(
      <BarChartStacked
        {...layout}
        id='bar-stacked-end-narrow'
        data={data}
        x={[{ key: 'p', end: 20 }, { key: 'q' }]}
        y={{ key: 'name' }}
      />
    );
    // Domain [0, 20]; the stacked total 30 used to win.
    const ticks = xTicks(container);
    expect(ticks.get('20')).toBeCloseTo(R, 2);
    expect(ticks.get('10')).toBeCloseTo((L + R) / 2, 2);
  });

  it('a pinned end widens the axis', () => {
    const { container } = render(
      <BarChartStacked
        {...layout}
        id='bar-stacked-end-wide'
        data={data}
        x={[{ key: 'p' }, { key: 'q', end: 100 }]}
        y={{ key: 'name' }}
      />
    );
    const ticks = xTicks(container);
    expect(ticks.get('100')).toBeCloseTo(R, 2);
    expect(ticks.get('40')).toBeCloseTo(L + 0.4 * (R - L), 2);
  });

  it('a pinned start overrides the 0 baseline', () => {
    const { container } = render(
      <BarChartStacked
        {...layout}
        id='bar-stacked-start'
        data={data}
        x={[{ key: 'p', start: 10 }, { key: 'q' }]}
        y={{ key: 'name' }}
      />
    );
    // Domain [10, 30].
    const ticks = xTicks(container);
    expect(ticks.get('10')).toBeCloseTo(L, 2);
    expect(ticks.get('30')).toBeCloseTo(R, 2);
  });

  it('treats end = 0 as a real bound, not as unset', () => {
    const { container } = render(
      <BarChartStacked
        {...layout}
        id='bar-stacked-end-zero'
        data={data}
        x={[{ key: 'p', start: -20, end: 0 }, { key: 'q' }]}
        y={{ key: 'name' }}
      />
    );
    const ticks = xTicks(container);
    expect(ticks.get('0')).toBeCloseTo(R, 2);
    expect(ticks.get('-20')).toBeCloseTo(L, 2);
  });

  it('uses the smallest start and the largest end among the series', () => {
    const { container } = render(
      <BarChartStacked
        {...layout}
        id='bar-stacked-extremes'
        data={data}
        x={[
          { key: 'p', start: 5, end: 40 },
          { key: 'q', start: 2, end: 60 },
        ]}
        y={{ key: 'name' }}
      />
    );
    // Domain [2, 60].
    const ticks = xTicks(container);
    expect(ticks.get('60')).toBeCloseTo(R, 2);
    expect(ticks.get('10')).toBeCloseTo(L + ((10 - 2) / 58) * 500, 2);
  });

  it('falls back to the data for a non-finite start/end', () => {
    const { container } = render(
      <BarChartStacked
        {...layout}
        id='bar-stacked-nan'
        data={data}
        x={[{ key: 'p', start: NaN, end: Infinity }, { key: 'q' }]}
        y={{ key: 'name' }}
      />
    );
    // Domain [0, 30]: the 0 baseline and the stacked total.
    const ticks = xTicks(container);
    expect(ticks.get('0')).toBeCloseTo(L, 2);
    expect(ticks.get('30')).toBeCloseTo(R, 2);
  });
});
