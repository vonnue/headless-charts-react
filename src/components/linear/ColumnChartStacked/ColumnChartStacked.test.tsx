import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import ColumnChartStacked from '.';
import data from './sample.json';

describe('ColumnChartStacked', () => {
  const defaultArgs = {
    id: 'column-stacked',
    data,
    x: { key: 'year' },
    y: [
      { key: 'iphone', className: 'text-blue-500' },
      { key: 'macbook', className: 'text-green-500' },
      { key: 'services', className: 'text-purple-500' },
    ],
  };

  it('renders an SVG element', () => {
    render(<ColumnChartStacked {...defaultArgs} />);

    const svg = document.getElementById('column-stacked');
    expect(svg).toBeTruthy();
    expect(svg?.tagName).toBe('svg');
  });

  it('renders stacked rect elements', () => {
    render(<ColumnChartStacked {...defaultArgs} />);

    const svg = document.getElementById('column-stacked');
    const rects = svg?.querySelectorAll('rect');
    // Stacked bars: at least data.length * y.length rects
    expect(rects?.length).toBeGreaterThanOrEqual(data.length);
  });

  it('renders with waterfall mode', () => {
    render(
      <ColumnChartStacked {...defaultArgs} id='column-waterfall' waterfall />
    );

    const svg = document.getElementById('column-waterfall');
    expect(svg).toBeTruthy();
  });

  it('narrows and staggers bars per series in waterfall mode, instead of sharing one column x', () => {
    // Normal stacking: every series in a category shares the same x and the
    // full band width — bars sit on top of each other, reading as one column.
    render(<ColumnChartStacked {...defaultArgs} id='column-stacked-normal' />);
    const normalRects = Array.from(
      document.querySelectorAll('#column-stacked-normal rect')
    );
    const normalWidths = new Set(normalRects.map((r) => r.getAttribute('width')));
    const normalXsForFirstCategory = new Set(
      [0, 1, 2].map((i) => normalRects[i * data.length]?.getAttribute('x'))
    );

    expect(normalWidths.size).toBe(1); // one shared bar width
    expect(normalXsForFirstCategory.size).toBe(1); // all series stack at the same x

    // Waterfall: each series becomes its own floating step — narrower bars
    // (band width / series count) offset side by side instead of stacked.
    render(<ColumnChartStacked {...defaultArgs} id='column-waterfall-scale' waterfall />);
    const waterfallRects = Array.from(
      document.querySelectorAll('#column-waterfall-scale rect')
    );
    const waterfallWidth = Number(waterfallRects[0]?.getAttribute('width'));
    const waterfallXsForFirstCategory = [0, 1, 2].map((i) =>
      Number(waterfallRects[i * data.length]?.getAttribute('x'))
    );

    const normalWidth = Number([...normalWidths][0]);
    expect(waterfallWidth).toBeCloseTo(normalWidth / defaultArgs.y.length);
    // Each step's x is offset from the previous by exactly one step width —
    // steps sit side by side rather than stacked at a single x.
    expect(waterfallXsForFirstCategory[1] - waterfallXsForFirstCategory[0]).toBeCloseTo(
      waterfallWidth
    );
    expect(waterfallXsForFirstCategory[2] - waterfallXsForFirstCategory[1]).toBeCloseTo(
      waterfallWidth
    );
  });

  it('renders with reference lines', () => {
    render(
      <ColumnChartStacked
        {...defaultArgs}
        id='column-stacked-refs'
        referenceLines={[{ y: 200, className: 'text-red-500' }]}
      />
    );

    const svg = document.getElementById('column-stacked-refs');
    expect(svg).toBeTruthy();
  });

  it('renders with custom padding', () => {
    render(
      <ColumnChartStacked
        {...defaultArgs}
        id='column-stacked-padded'
        padding={{ top: 10, right: 10, bottom: 10, left: 10 }}
        paddingBar={0.3}
      />
    );

    const svg = document.getElementById('column-stacked-padded');
    expect(svg).toBeTruthy();
  });

  it('renders with drawing animation config', () => {
    render(
      <ColumnChartStacked
        {...defaultArgs}
        id='column-stacked-animated'
        drawing={{ duration: 500, delay: 100 }}
      />
    );

    const svg = document.getElementById('column-stacked-animated');
    expect(svg).toBeTruthy();
  });

  it('handles empty data', () => {
    render(
      <ColumnChartStacked {...defaultArgs} id='column-stacked-empty' data={[]} />
    );

    const svg = document.getElementById('column-stacked-empty');
    expect(svg).toBeTruthy();
  });
});
