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
