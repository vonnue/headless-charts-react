import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import BarChart from '.';
import { tickPositions } from '@/test-utils/axisTicks';

// 600px wide, margin left/right 50, padding 0 → x range [50, 550] (span 500).
const layout = {
  style: { width: '600px', height: '400px' },
  margin: { top: 20, right: 50, bottom: 40, left: 50 },
  padding: { top: 0, right: 0, bottom: 0, left: 0, bar: 0.1 },
};
const L = 50;
const R = 550;

const xTicks = (container: HTMLElement) =>
  tickPositions(container.querySelector('[data-testid="x-axis"]'), 'horizontal');

describe('BarChart start/end domain (F4)', () => {
  it('treats x end = 0 as a real bound, not as unset', () => {
    const { container } = render(
      <BarChart
        {...layout}
        id='bar-end-zero'
        data={[
          { name: 'a', v: -10 },
          { name: 'b', v: -5 },
        ]}
        x={[{ key: 'v', end: 0 }]}
        y={{ key: 'name' }}
      />
    );
    // Domain [-10, 0]: 0 sits on the right edge. `end || max` gave [-10, -5].
    const ticks = xTicks(container);
    expect(ticks.get('0')).toBeCloseTo(R, 2);
    expect(ticks.get('-10')).toBeCloseTo(L, 2);
  });

  it('a pinned end narrows the axis even when another series has no end', () => {
    const { container } = render(
      <BarChart
        {...layout}
        id='bar-end-narrow'
        data={[
          { name: 'a', p: 10, q: 30 },
          { name: 'b', p: 20, q: 5 },
        ]}
        x={[{ key: 'p', end: 20 }, { key: 'q' }]}
        y={{ key: 'name' }}
      />
    );
    // Domain [0, 20]: 20 on the right edge, 10 in the middle. Merging the
    // unpinned series' data max gave [0, 30].
    const ticks = xTicks(container);
    expect(ticks.get('20')).toBeCloseTo(R, 2);
    expect(ticks.get('10')).toBeCloseTo((L + R) / 2, 2);
  });

  it('uses the largest finite end among the series', () => {
    const { container } = render(
      <BarChart
        {...layout}
        id='bar-end-max'
        data={[{ name: 'a', p: 1, q: 2 }]}
        x={[
          { key: 'p', end: 20 },
          { key: 'q', end: 40 },
        ]}
        y={{ key: 'name' }}
      />
    );
    expect(xTicks(container).get('40')).toBeCloseTo(R, 2);
  });

  it('falls back to the data for a non-finite start/end', () => {
    const { container } = render(
      <BarChart
        {...layout}
        id='bar-nan'
        data={[
          { name: 'a', v: 5 },
          { name: 'b', v: 10 },
        ]}
        x={[{ key: 'v', start: NaN, end: Infinity }]}
        y={{ key: 'name' }}
      />
    );
    // All-positive data keeps the 0 baseline; end falls back to max 10.
    const ticks = xTicks(container);
    expect(ticks.get('0')).toBeCloseTo(L, 2);
    expect(ticks.get('10')).toBeCloseTo(R, 2);
  });

  it('a pinned start overrides the 0 baseline', () => {
    const { container } = render(
      <BarChart
        {...layout}
        id='bar-start'
        data={[
          { name: 'a', v: 5 },
          { name: 'b', v: 10 },
        ]}
        x={[{ key: 'v', start: 4 }]}
        y={{ key: 'name' }}
      />
    );
    const ticks = xTicks(container);
    expect(ticks.get('4')).toBeCloseTo(L, 2);
    expect(ticks.get('10')).toBeCloseTo(R, 2);
  });
});
