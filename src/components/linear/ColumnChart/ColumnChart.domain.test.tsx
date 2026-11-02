import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import ColumnChart from '.';
import { tickPositions } from '@/test-utils/axisTicks';

// 400px tall, margin top 20 / bottom 40, padding 0 → y range [360, 20].
const layout = {
  style: { width: '600px', height: '400px' },
  margin: { top: 20, right: 40, bottom: 40, left: 50 },
  padding: { top: 0, right: 0, bottom: 0, left: 0 },
};
const BOTTOM = 360;
const TOP = 20;

const yTicks = (container: HTMLElement) =>
  tickPositions(container.querySelector('[data-testid="y-axis"]'), 'vertical');

describe('ColumnChart start/end domain (F4)', () => {
  it('treats y end = 0 as a real bound, not as unset', () => {
    const { container } = render(
      <ColumnChart
        {...layout}
        id='column-end-zero'
        data={[
          { name: 'a', v: -10 },
          { name: 'b', v: -5 },
        ]}
        x={{ key: 'name' }}
        y={[{ key: 'v', end: 0 }]}
      />
    );
    // Domain [-10, 0]: 0 at the top. `end || max` gave [-10, -5].
    const ticks = yTicks(container);
    expect(ticks.get('0')).toBeCloseTo(TOP, 2);
    expect(ticks.get('-10')).toBeCloseTo(BOTTOM, 2);
  });

  it('a pinned end narrows the axis', () => {
    const { container } = render(
      <ColumnChart
        {...layout}
        id='column-end-narrow'
        data={[
          { name: 'a', v: 0 },
          { name: 'b', v: 30 },
        ]}
        x={{ key: 'name' }}
        y={[{ key: 'v', end: 20 }]}
      />
    );
    const ticks = yTicks(container);
    expect(ticks.get('20')).toBeCloseTo(TOP, 2);
    expect(ticks.get('10')).toBeCloseTo((TOP + BOTTOM) / 2, 2);
  });

  it('falls back to the data for a non-finite start/end', () => {
    const { container } = render(
      <ColumnChart
        {...layout}
        id='column-nan'
        data={[
          { name: 'a', v: 0 },
          { name: 'b', v: 10 },
        ]}
        x={{ key: 'name' }}
        y={[{ key: 'v', start: NaN, end: -Infinity }]}
      />
    );
    const ticks = yTicks(container);
    expect(ticks.get('0')).toBeCloseTo(BOTTOM, 2);
    expect(ticks.get('10')).toBeCloseTo(TOP, 2);
  });

  it('uses the smallest finite start / largest finite end among the series', () => {
    const { container } = render(
      <ColumnChart
        {...layout}
        id='column-multi'
        data={[{ name: 'a', p: 5, q: 6 }]}
        x={{ key: 'name' }}
        y={[
          { key: 'p', start: 2, end: 8 },
          { key: 'q', start: 0, end: 10 },
        ]}
      />
    );
    const ticks = yTicks(container);
    expect(ticks.get('0')).toBeCloseTo(BOTTOM, 2);
    expect(ticks.get('10')).toBeCloseTo(TOP, 2);
  });
});
