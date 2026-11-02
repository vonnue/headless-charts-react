import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import ColumnChart from '.';
import { tickPositions } from '@/test-utils/axisTicks';
import { resetDevWarnings } from '@/utils/devEnvironment';

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
  afterEach(() => {
    vi.restoreAllMocks();
    resetDevWarnings();
  });

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

  it('end = 0 on all-positive data: no negative heights, and a dev warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(
      <ColumnChart
        {...layout}
        id='column-inverted'
        data={[
          { name: 'a', v: 5 },
          { name: 'b', v: 10 },
        ]}
        x={{ key: 'name' }}
        y={[{ key: 'v', end: 0 }]}
      />
    );
    // Start falls back to the data min (5), so the domain is [5, 0].
    const heights = Array.from(container.querySelectorAll('rect')).map((r) =>
      Number(r.getAttribute('height'))
    );
    expect(heights.length).toBeGreaterThan(0);
    heights.forEach((h) => expect(h).toBeGreaterThanOrEqual(0));
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain(
      'ColumnChart "column-inverted": y start (5) > end (0)'
    );
  });

  it('draws no y ticks for empty data', () => {
    const { container } = render(
      <ColumnChart
        {...layout}
        id='column-empty'
        data={[]}
        x={{ key: 'name' }}
        y={[{ key: 'v' }]}
      />
    );
    const axis = container.querySelector('[data-testid="y-axis"]');
    expect(axis?.textContent ?? '').not.toContain('0.000000');
    expect(yTicks(container).size).toBe(0);
  });
});
