import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import LollipopVChart from '.';
import { tickPositions } from '@/test-utils/axisTicks';
import { resetDevWarnings } from '@/utils/devEnvironment';

// 500x300, default margin 40, padding 0 → y range [260, 40].
const style = { width: '500px', height: '300px' };
const BOTTOM = 260;
const TOP = 40;

const data = [
  { name: 'a', v: 10 },
  { name: 'b', v: 20 },
  { name: 'c', v: 30 },
];

const x = { key: 'name', axis: { location: 'bottom' as const } };
const yAxis = { location: 'left' as const, ticks: 5 };

const yTicks = (container: HTMLElement) =>
  tickPositions(container.querySelector('[data-testid="y-axis"]'), 'vertical');

describe('LollipopVChart y start/end domain (F4)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetDevWarnings();
  });

  it('honours y.end, including a narrowing one', () => {
    const { container } = render(
      <LollipopVChart
        style={style}
        id='lollipop-v-end'
        data={data}
        shape='circle'
        x={x}
        y={{ key: 'v', start: 0, end: 20, axis: yAxis }}
      />
    );
    const ticks = yTicks(container);
    expect(ticks.get('0')).toBeCloseTo(BOTTOM, 2);
    expect(ticks.get('20')).toBeCloseTo(TOP, 2);
  });

  it('treats y.end = 0 as a real bound', () => {
    const { container } = render(
      <LollipopVChart
        style={style}
        id='lollipop-v-end-zero'
        data={[
          { name: 'a', v: -30 },
          { name: 'b', v: -10 },
        ]}
        shape='circle'
        x={x}
        y={{ key: 'v', end: 0, axis: yAxis }}
      />
    );
    const ticks = yTicks(container);
    expect(ticks.get('-30')).toBeCloseTo(BOTTOM, 2);
    expect(ticks.get('0')).toBeCloseTo(TOP, 2);
  });

  it('pins the axis to y.start/y.end, including 0 and a range narrower than the data', () => {
    const { container: zero } = render(
      <LollipopVChart
        style={style}
        id='lollipop-v-pin-zero'
        data={data}
        shape='circle'
        x={x}
        y={{ key: 'v', start: 0, end: 50, axis: yAxis }}
      />
    );
    const zeroTicks = yTicks(zero);
    expect(zeroTicks.get('0')).toBeCloseTo(BOTTOM, 2);
    expect(zeroTicks.get('50')).toBeCloseTo(TOP, 2);

    const { container: narrow } = render(
      <LollipopVChart
        style={style}
        id='lollipop-v-pin-narrow'
        data={data}
        shape='circle'
        x={x}
        y={{ key: 'v', start: 14, end: 26, axis: yAxis }}
      />
    );
    const narrowTicks = yTicks(narrow);
    expect(narrowTicks.get('14')).toBeCloseTo(BOTTOM, 2);
    expect(narrowTicks.get('26')).toBeCloseTo(TOP, 2);
  });

  it('falls back to the data when neither bound is finite', () => {
    const { container } = render(
      <LollipopVChart
        style={style}
        id='lollipop-v-data'
        data={data}
        shape='circle'
        x={x}
        y={{ key: 'v', start: -Infinity, end: NaN, axis: yAxis }}
      />
    );
    const ticks = yTicks(container);
    expect(ticks.get('10')).toBeCloseTo(BOTTOM, 2);
    expect(ticks.get('30')).toBeCloseTo(TOP, 2);
  });

  it('no longer accepts valueMin/valueMax and uses the data domain', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(
      <LollipopVChart
        style={style}
        id='lollipop-v-removed-props'
        data={data}
        shape='circle'
        // @ts-expect-error valueMin was removed in 0.3.0; use y.start
        valueMin={0}
        x={x}
        y={{ key: 'v', axis: yAxis }}
      />
    );
    const ticks = yTicks(container);
    expect(ticks.get('10')).toBeCloseTo(BOTTOM, 2);
    expect(ticks.get('30')).toBeCloseTo(TOP, 2);
    expect(warn).not.toHaveBeenCalled();
  });
});
