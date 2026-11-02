import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import BoxPlotH from '.';
import { tickPositions } from '@/test-utils/axisTicks';

// 600px wide, margin left/right 50, padding 0 → x range [50, 550].
const layout = {
  style: { width: '600px', height: '300px' },
  margin: { top: 20, right: 50, bottom: 40, left: 50 },
  padding: { top: 0, right: 0, bottom: 0, left: 0 },
};
const LEFT = 50;
const RIGHT = 550;

const data = [
  { name: 'a', min: -40, q1: -30, mid: -20, q3: -15, max: -10 },
  { name: 'b', min: -35, q1: -25, mid: -22, q3: -18, max: -12 },
];

const baseX = {
  key: 'mid',
  minKey: 'min',
  maxKey: 'max',
  boxStart: 'q1',
  boxEnd: 'q3',
  midKey: 'mid',
  axis: { location: 'bottom' as const, ticks: 5 },
};

const xTicks = (container: HTMLElement) =>
  tickPositions(container.querySelector('[data-testid="x-axis"]'), 'horizontal');

describe('BoxPlotH x min/max domain (F4)', () => {
  it('treats x.max = 0 as a real bound', () => {
    const { container } = render(
      <BoxPlotH
        {...layout}
        id='box-h-max-zero'
        data={data}
        y={{ key: 'name' }}
        x={{ ...baseX, max: 0 }}
      />
    );
    const ticks = xTicks(container);
    expect(ticks.get('-40')).toBeCloseTo(LEFT, 2);
    expect(ticks.get('0')).toBeCloseTo(RIGHT, 2);
  });

  it('falls back to the data for a non-finite x.max', () => {
    const { container } = render(
      <BoxPlotH
        {...layout}
        id='box-h-max-inf'
        data={data}
        y={{ key: 'name' }}
        x={{ ...baseX, min: -50, max: Infinity }}
      />
    );
    const ticks = xTicks(container);
    expect(ticks.get('-50')).toBeCloseTo(LEFT, 2);
    expect(ticks.get('-10')).toBeCloseTo(RIGHT, 2);
  });
});
