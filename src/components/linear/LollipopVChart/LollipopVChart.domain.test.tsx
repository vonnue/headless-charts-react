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

  it('uses valueMin/valueMax only when y.start/y.end are not finite', () => {
    const { container } = render(
      <LollipopVChart
        style={style}
        id='lollipop-v-legacy'
        data={data}
        shape='circle'
        valueMin={0}
        valueMax={100}
        x={x}
        y={{ key: 'v', start: NaN, end: 50, axis: yAxis }}
      />
    );
    // start: NaN → valueMin 0; end: 50 beats valueMax 100.
    const ticks = yTicks(container);
    expect(ticks.get('0')).toBeCloseTo(BOTTOM, 2);
    expect(ticks.get('50')).toBeCloseTo(TOP, 2);
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

  it('warns once in dev when y bounds override the deprecated valueMin/valueMax', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const props = {
      style,
      id: 'lollipop-v-deprecated',
      data,
      shape: 'circle' as const,
      valueMin: 0,
      valueMax: 100,
      x,
      y: { key: 'v', start: 5, end: 50, axis: yAxis },
    };
    const { rerender } = render(<LollipopVChart {...props} />);
    rerender(<LollipopVChart {...props} data={[...data]} />);

    const messages = warn.mock.calls.map(([m]) => String(m));
    expect(messages).toHaveLength(2);
    expect(messages[0]).toContain('y.start (5) overrides valueMin (0)');
    expect(messages[1]).toContain('y.end (50) overrides valueMax (100)');
  });

  it('does not warn when only the deprecated props are set, or they match', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <LollipopVChart
        style={style}
        id='lollipop-v-legacy-only'
        data={data}
        shape='circle'
        valueMin={0}
        valueMax={100}
        x={x}
        y={{ key: 'v', end: 100, axis: yAxis }}
      />
    );
    expect(warn).not.toHaveBeenCalled();
  });
});
