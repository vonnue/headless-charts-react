import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import BoxPlotH from '.';
import data from '../sample.json';

describe('BoxPlotH', () => {
  const defaultArgs = {
    id: 'box-plot-h',
    data,
    y: { key: 'name' },
    x: {
      key: 'value',
      minKey: 'min',
      maxKey: 'max',
      boxStart: 'firstQuartile',
      boxEnd: 'lastQuartile',
      midKey: 'mid',
    },
  };

  it('renders an SVG element', () => {
    render(<BoxPlotH {...defaultArgs} />);

    const svg = document.getElementById('box-plot-h');
    expect(svg).toBeTruthy();
    expect(svg?.tagName).toBe('svg');
  });

  it('renders box rects for each data row', () => {
    render(<BoxPlotH {...defaultArgs} />);

    const svg = document.getElementById('box-plot-h');
    const rects = svg?.querySelectorAll('.box-plot-box');
    expect(rects?.length).toBe(data.length);
  });

  it('renders line elements for whiskers', () => {
    render(<BoxPlotH {...defaultArgs} />);

    const svg = document.getElementById('box-plot-h');
    const lines = svg?.querySelectorAll('.box-plot-line');
    // Each data point: range line + min cap + max cap + median line = 4 lines
    expect(lines?.length).toBe(data.length * 4);
  });

  it('renders axes', () => {
    render(
      <BoxPlotH
        {...defaultArgs}
        id='box-h-axes'
        x={{
          ...defaultArgs.x,
          axis: { location: 'bottom', ticks: 5 },
        }}
      />
    );

    const svg = document.getElementById('box-h-axes');
    const xAxis = svg?.querySelector('[data-testid="x-axis"]');
    expect(xAxis).toBeTruthy();
  });

  it('renders with custom classNames', () => {
    render(
      <BoxPlotH
        {...defaultArgs}
        id='box-h-styled'
        classNames={{
          boxes: 'fill-blue-200',
          lines: 'stroke-blue-700',
          data: 'stroke-red-500',
        }}
      />
    );

    const svg = document.getElementById('box-h-styled');
    expect(svg).toBeTruthy();
  });

  it('renders with custom padding and margin', () => {
    render(
      <BoxPlotH
        {...defaultArgs}
        id='box-h-padded'
        padding={{ top: 10, right: 10, bottom: 10, left: 10 }}
        margin={{ top: 20, right: 20, bottom: 30, left: 40 }}
      />
    );

    const svg = document.getElementById('box-h-padded');
    expect(svg).toBeTruthy();
  });

  it('handles single data point', () => {
    render(
      <BoxPlotH {...defaultArgs} id='box-h-single' data={[data[0]]} />
    );

    const svg = document.getElementById('box-h-single');
    const rects = svg?.querySelectorAll('.box-plot-box');
    expect(rects?.length).toBe(1);
  });
});
