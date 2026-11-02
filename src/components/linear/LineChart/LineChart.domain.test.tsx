import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import LineChart from '.';
import { tickPositions } from '@/test-utils/axisTicks';

// 400px tall, margin top 20 / bottom 40, padding 0 → y range [360, 20].
const layout = {
  style: { width: '600px', height: '400px' },
  margin: { top: 20, right: 50, bottom: 40, left: 50 },
  padding: { top: 0, right: 0, bottom: 0, left: 0 },
};
const BOTTOM = 360;
const TOP = 20;

const data = [
  { t: 1, a: 5, b: 0 },
  { t: 2, a: 6, b: 15 },
  { t: 3, a: 7, b: 30 },
];

const ticks = (container: HTMLElement, side: 'left' | 'right') =>
  tickPositions(container.querySelector(`.axis--${side}-y`), 'vertical');

describe('LineChart y start/end domain (F4)', () => {
  it('a pinned start/end on a right-axis series narrows the right axis', () => {
    const { container } = render(
      <LineChart
        {...layout}
        id='line-right-narrow'
        data={data}
        x={{ key: 't' }}
        y={[
          { key: 'a', symbol: 'none' },
          { key: 'b', symbol: 'none', start: 10, end: 20, axis: { location: 'right' } },
        ]}
      />
    );
    // Domain [10, 20]. Merging with the data extent gave [0, 30].
    const right = ticks(container, 'right');
    expect(right.get('10')).toBeCloseTo(BOTTOM, 2);
    expect(right.get('20')).toBeCloseTo(TOP, 2);
  });

  it('treats a right-axis end = 0 as a real bound', () => {
    const { container } = render(
      <LineChart
        {...layout}
        id='line-right-end-zero'
        data={[
          { t: 1, a: 1, b: -10 },
          { t: 2, a: 2, b: -5 },
        ]}
        x={{ key: 't' }}
        y={[
          { key: 'a', symbol: 'none' },
          { key: 'b', symbol: 'none', end: 0, axis: { location: 'right' } },
        ]}
      />
    );
    const right = ticks(container, 'right');
    expect(right.get('0')).toBeCloseTo(TOP, 2);
    expect(right.get('-10')).toBeCloseTo(BOTTOM, 2);
  });

  it('falls back to the data for a non-finite right-axis start/end', () => {
    const { container } = render(
      <LineChart
        {...layout}
        id='line-right-nan'
        data={data}
        x={{ key: 't' }}
        y={[
          { key: 'a', symbol: 'none' },
          { key: 'b', symbol: 'none', start: NaN, end: Infinity, axis: { location: 'right' } },
        ]}
      />
    );
    const right = ticks(container, 'right');
    expect(right.get('0')).toBeCloseTo(BOTTOM, 2);
    expect(right.get('30')).toBeCloseTo(TOP, 2);
  });

  it('left axis: a finite start wins even when another series has -Infinity', () => {
    const { container } = render(
      <LineChart
        {...layout}
        id='line-left-mixed'
        data={data}
        x={{ key: 't' }}
        y={[
          { key: 'a', symbol: 'none', start: 2, end: 10 },
          { key: 'b', symbol: 'none', start: -Infinity },
        ]}
      />
    );
    // Domain [2, 10]. min(2, -Infinity) used to be non-finite, so the pinned
    // 2 was dropped for the data min (0).
    const left = ticks(container, 'left');
    expect(left.get('2')).toBeCloseTo(BOTTOM, 2);
    expect(left.get('10')).toBeCloseTo(TOP, 2);
  });
});
