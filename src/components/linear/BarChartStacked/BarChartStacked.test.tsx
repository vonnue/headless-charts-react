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
