import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import ColumnChart from '.';
import data from './sample.json';

describe('ColumnChart', () => {
  const defaultArgs = {
    id: 'column-chart',
    data,
    x: { key: 'year' },
    y: [
      { key: 'iphone', className: 'text-blue-500' },
      { key: 'macbook', className: 'text-green-500' },
    ],
  };

  it('renders an SVG element with correct test id', () => {
    render(<ColumnChart {...defaultArgs} />);

    const svg = document.getElementById('column-chart');
    expect(svg).toBeTruthy();
    expect(svg?.tagName).toBe('svg');
  });

  it('renders rect elements for data bars', () => {
    render(<ColumnChart {...defaultArgs} />);

    const svg = document.getElementById('column-chart');
    const rects = svg?.querySelectorAll('rect');
    // Should have bars for each data point * each Y series
    expect(rects?.length).toBeGreaterThanOrEqual(data.length);
  });

  it('renders with a single Y series', () => {
    render(
      <ColumnChart
        {...defaultArgs}
        id='column-single'
        y={[{ key: 'iphone' }]}
      />
    );

    const svg = document.getElementById('column-single');
    expect(svg).toBeTruthy();
  });

  it('renders with custom padding and margin', () => {
    render(
      <ColumnChart
        {...defaultArgs}
        id='column-padded'
        padding={{ top: 10, right: 10, bottom: 10, left: 10, bar: 0.2 }}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      />
    );

    const svg = document.getElementById('column-padded');
    expect(svg).toBeTruthy();
  });

  it('renders with reference lines', () => {
    render(
      <ColumnChart
        {...defaultArgs}
        id='column-refs'
        referenceLines={[{ y: 100, className: 'text-red-500' }]}
      />
    );

    const svg = document.getElementById('column-refs');
    const lines = svg?.querySelectorAll('line');
    expect(lines?.length).toBeGreaterThanOrEqual(1);
  });

  it('renders axes', () => {
    render(
      <ColumnChart
        {...defaultArgs}
        id='column-axes'
        x={{ key: 'year', axis: { location: 'bottom', ticks: 5 } }}
      />
    );

    const svg = document.getElementById('column-axes');
    const xAxis = svg?.querySelector('[data-testid="x-axis"]');
    expect(xAxis).toBeTruthy();
  });

  it('renders with className on the SVG', () => {
    render(
      <ColumnChart {...defaultArgs} id='column-class' className='bg-white' />
    );

    const svg = document.getElementById('column-class');
    expect(svg).toBeTruthy();
  });

  it('handles empty data gracefully', () => {
    render(<ColumnChart {...defaultArgs} id='column-empty' data={[]} />);

    const svg = document.getElementById('column-empty');
    expect(svg).toBeTruthy();
  });
});
