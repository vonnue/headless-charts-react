import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import BarChartStacked from '.';
import data from './sample.json';

describe('BarChartStacked', () => {
  const defaultArgs = {
    id: 'bar-stacked',
    data,
    y: { key: 'year' },
    x: [
      { key: 'iphone', className: 'text-blue-500' },
      { key: 'macbook', className: 'text-green-500' },
    ],
  };

  it('renders an SVG element', () => {
    render(<BarChartStacked {...defaultArgs} />);

    const svg = document.getElementById('bar-stacked');
    expect(svg).toBeTruthy();
    expect(svg?.tagName).toBe('svg');
  });

  it('renders stacked horizontal rect elements', () => {
    render(<BarChartStacked {...defaultArgs} />);

    const svg = document.getElementById('bar-stacked');
    const rects = svg?.querySelectorAll('rect');
    expect(rects?.length).toBeGreaterThanOrEqual(data.length);
  });

  it('renders with direction left', () => {
    render(
      <BarChartStacked {...defaultArgs} id='bar-stacked-left' direction='left' />
    );

    const svg = document.getElementById('bar-stacked-left');
    expect(svg).toBeTruthy();
  });

  it('renders with waterfall mode', () => {
    render(
      <BarChartStacked {...defaultArgs} id='bar-stacked-waterfall' waterfall />
    );

    const svg = document.getElementById('bar-stacked-waterfall');
    expect(svg).toBeTruthy();
  });

  it('narrows and staggers bars per series in waterfall mode, instead of sharing one row y', () => {
    // Normal stacking: every series in a category shares the same y and the
    // full band height — segments sit end to end on one row.
    render(<BarChartStacked {...defaultArgs} id='bar-stacked-normal' />);
    const normalRects = Array.from(
      document.querySelectorAll('#bar-stacked-normal rect')
    );
    const normalHeights = new Set(normalRects.map((r) => r.getAttribute('height')));
    const normalYsForFirstCategory = new Set(
      [0, 1].map((i) => normalRects[i * data.length]?.getAttribute('y'))
    );

    expect(normalHeights.size).toBe(1); // one shared bar height
    expect(normalYsForFirstCategory.size).toBe(1); // all series share the same row

    // Waterfall: each series becomes its own floating step — narrower bars
    // (band height / series count) stacked into sub-rows instead of one row.
    render(<BarChartStacked {...defaultArgs} id='bar-stacked-waterfall-scale' waterfall />);
    const waterfallRects = Array.from(
      document.querySelectorAll('#bar-stacked-waterfall-scale rect')
    );
    const waterfallHeight = Number(waterfallRects[0]?.getAttribute('height'));
    const waterfallYsForFirstCategory = [0, 1].map((i) =>
      Number(waterfallRects[i * data.length]?.getAttribute('y'))
    );

    const normalHeight = Number([...normalHeights][0]);
    expect(waterfallHeight).toBeCloseTo(normalHeight / defaultArgs.x.length);
    // Each step's y is offset from the previous by exactly one step height —
    // steps sit in sub-rows rather than sharing a single row.
    expect(waterfallYsForFirstCategory[1] - waterfallYsForFirstCategory[0]).toBeCloseTo(
      waterfallHeight
    );
  });

  it('renders with custom padding and margin', () => {
    render(
      <BarChartStacked
        {...defaultArgs}
        id='bar-stacked-padded'
        padding={{ top: 10, right: 10, bottom: 10, left: 10 }}
        margin={{ top: 20, right: 40, bottom: 20, left: 40 }}
      />
    );

    const svg = document.getElementById('bar-stacked-padded');
    expect(svg).toBeTruthy();
  });

  it('renders with a single X series', () => {
    render(
      <BarChartStacked
        {...defaultArgs}
        id='bar-stacked-single'
        x={[{ key: 'iphone' }]}
      />
    );

    const svg = document.getElementById('bar-stacked-single');
    expect(svg).toBeTruthy();
  });

  it('handles empty data', () => {
    render(
      <BarChartStacked {...defaultArgs} id='bar-stacked-empty' data={[]} />
    );

    const svg = document.getElementById('bar-stacked-empty');
    expect(svg).toBeTruthy();
  });
});
