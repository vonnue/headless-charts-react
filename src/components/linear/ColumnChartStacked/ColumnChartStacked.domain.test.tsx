import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import ColumnChartStacked from '.';
import { tickPositions } from '@/test-utils/axisTicks';

// 400px tall, margin top 20 / bottom 40, padding 0 → y range [360, 20]
// (span 340). L/R name the low/high ends of the value axis.
const layout = {
  style: { width: '600px', height: '400px' },
  margin: { top: 20, right: 40, bottom: 40, left: 50 },
  padding: { top: 0, right: 0, bottom: 0, left: 0 },
};
const L = 360;
const R = 20;

// Stacked totals: a = 30, b = 15.
const data = [
  { name: 'a', p: 10, q: 20 },
  { name: 'b', p: 5, q: 10 },
];

const yTicks = (container: HTMLElement) =>
  tickPositions(container.querySelector('[data-testid="y-axis"]'), 'vertical');

describe('ColumnChartStacked start/end domain (F4)', () => {
  it('a pinned end narrows the axis below the stacked total', () => {
    const { container } = render(
      <ColumnChartStacked
        {...layout}
        id='column-stacked-end-narrow'
        data={data}
        y={[{ key: 'p', end: 20 }, { key: 'q' }]}
        x={{ key: 'name' }}
      />
    );
    // Domain [0, 20]; the stacked total 30 used to win.
    const ticks = yTicks(container);
    expect(ticks.get('20')).toBeCloseTo(R, 2);
    expect(ticks.get('10')).toBeCloseTo((L + R) / 2, 2);
  });

  it('a pinned end widens the axis', () => {
    const { container } = render(
      <ColumnChartStacked
        {...layout}
        id='column-stacked-end-wide'
        data={data}
        y={[{ key: 'p' }, { key: 'q', end: 100 }]}
        x={{ key: 'name' }}
      />
    );
    const ticks = yTicks(container);
    expect(ticks.get('100')).toBeCloseTo(R, 2);
    expect(ticks.get('40')).toBeCloseTo(L + 0.4 * (R - L), 2);
  });

  it('a pinned start overrides the 0 baseline', () => {
    const { container } = render(
      <ColumnChartStacked
        {...layout}
        id='column-stacked-start'
        data={data}
        y={[{ key: 'p', start: 10 }, { key: 'q' }]}
        x={{ key: 'name' }}
      />
    );
    // Domain [10, 30].
    const ticks = yTicks(container);
    expect(ticks.get('10')).toBeCloseTo(L, 2);
    expect(ticks.get('30')).toBeCloseTo(R, 2);
  });

  it('treats end = 0 as a real bound, not as unset', () => {
    const { container } = render(
      <ColumnChartStacked
        {...layout}
        id='column-stacked-end-zero'
        data={data}
        y={[{ key: 'p', start: -20, end: 0 }, { key: 'q' }]}
        x={{ key: 'name' }}
      />
    );
    const ticks = yTicks(container);
    expect(ticks.get('0')).toBeCloseTo(R, 2);
    expect(ticks.get('-20')).toBeCloseTo(L, 2);
  });

  it('uses the smallest start and the largest end among the series', () => {
    const { container } = render(
      <ColumnChartStacked
        {...layout}
        id='column-stacked-extremes'
        data={data}
        y={[
          { key: 'p', start: 5, end: 40 },
          { key: 'q', start: 2, end: 60 },
        ]}
        x={{ key: 'name' }}
      />
    );
    // Domain [2, 60].
    const ticks = yTicks(container);
    expect(ticks.get('60')).toBeCloseTo(R, 2);
    expect(ticks.get('10')).toBeCloseTo(L + ((10 - 2) / 58) * (R - L), 2);
  });

  it('falls back to the data for a non-finite start/end', () => {
    const { container } = render(
      <ColumnChartStacked
        {...layout}
        id='column-stacked-nan'
        data={data}
        y={[{ key: 'p', start: NaN, end: Infinity }, { key: 'q' }]}
        x={{ key: 'name' }}
      />
    );
    // Domain [0, 30]: the 0 baseline and the stacked total.
    const ticks = yTicks(container);
    expect(ticks.get('0')).toBeCloseTo(L, 2);
    expect(ticks.get('30')).toBeCloseTo(R, 2);
  });
});
