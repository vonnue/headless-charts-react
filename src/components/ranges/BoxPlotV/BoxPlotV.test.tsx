import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import BoxPlotV from '.';
import data from '../sample.json';

describe('BoxPlotV', () => {
  const defaultArgs = {
    id: 'box-plot-v',
    data,
    x: { key: 'name' },
    y: {
      key: 'value',
      minKey: 'min',
      maxKey: 'max',
      boxStart: 'firstQuartile',
      boxEnd: 'lastQuartile',
      midKey: 'mid',
    },
  };

  it('renders an SVG element', () => {
    render(<BoxPlotV {...defaultArgs} />);

    const svg = document.getElementById('box-plot-v');
    expect(svg).toBeTruthy();
    expect(svg?.tagName).toBe('svg');
  });

  it('renders box rects for each data row', () => {
    render(<BoxPlotV {...defaultArgs} />);

    const svg = document.getElementById('box-plot-v');
    const rects = svg?.querySelectorAll('.box-plot-box');
    expect(rects?.length).toBe(data.length);
  });

  it('renders line elements for whiskers and medians', () => {
    render(<BoxPlotV {...defaultArgs} />);

    const svg = document.getElementById('box-plot-v');
    const lines = svg?.querySelectorAll('.box-plot-line');
    // Each data point: main line + min cap + max cap + median cap = 4 lines
    expect(lines?.length).toBe(data.length * 4);
  });

  it('renders with custom classNames', () => {
    render(
      <BoxPlotV
        {...defaultArgs}
        id='box-v-styled'
        classNames={{
          boxes: 'fill-green-200',
          lines: 'stroke-green-700',
          data: 'stroke-orange-500',
        }}
      />
    );

    const svg = document.getElementById('box-v-styled');
    expect(svg).toBeTruthy();
  });

  it('renders axes', () => {
    render(
      <BoxPlotV
        {...defaultArgs}
        id='box-v-axes'
        y={{
          ...defaultArgs.y,
          axis: { location: 'left', ticks: 5 },
        }}
      />
    );

    const svg = document.getElementById('box-v-axes');
    const yAxis = svg?.querySelector('[data-testid="y-axis"]');
    expect(yAxis).toBeTruthy();
  });

  it('renders with custom padding and margin', () => {
    render(
      <BoxPlotV
        {...defaultArgs}
        id='box-v-padded'
        padding={{ top: 10, right: 10, bottom: 10, left: 10 }}
        margin={{ top: 20, right: 20, bottom: 30, left: 40 }}
      />
    );

    const svg = document.getElementById('box-v-padded');
    expect(svg).toBeTruthy();
  });

  it('handles single data point', () => {
    render(
      <BoxPlotV {...defaultArgs} id='box-v-single' data={[data[0]]} />
    );

    const svg = document.getElementById('box-v-single');
    const rects = svg?.querySelectorAll('.box-plot-box');
    expect(rects?.length).toBe(1);
  });
});
