import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import ScatterPlot from '.';
import data from './sample.json';

describe('ScatterPlot', () => {
  const defaultArgs = {
    id: 'scatter-plot',
    data: data.slice(0, 10),
    x: { key: 'gdp' },
    y: { key: 'purchasing_power' },
  };

  it('renders an SVG element', () => {
    render(<ScatterPlot {...defaultArgs} />);

    const svg = document.getElementById('scatter-plot');
    expect(svg).toBeTruthy();
    expect(svg?.tagName).toBe('svg');
  });

  it('renders data point symbols', () => {
    render(<ScatterPlot {...defaultArgs} />);

    const svg = document.getElementById('scatter-plot');
    const paths = svg?.querySelectorAll('path');
    expect(paths?.length).toBeGreaterThanOrEqual(1);
  });

  it('renders with color mapping', () => {
    render(
      <ScatterPlot
        {...defaultArgs}
        id='scatter-colors'
        color={{
          key: 'continent',
          classNameMap: {
            Asia: 'text-blue-500',
            'North America': 'text-red-500',
          },
        }}
      />
    );

    const svg = document.getElementById('scatter-colors');
    expect(svg).toBeTruthy();
  });

  it('renders with size mapping', () => {
    render(
      <ScatterPlot
        {...defaultArgs}
        id='scatter-sized'
        size={{
          key: 'population',
          min: 3,
          max: 20,
        }}
      />
    );

    const svg = document.getElementById('scatter-sized');
    expect(svg).toBeTruthy();
  });

  it('renders axes', () => {
    render(
      <ScatterPlot
        {...defaultArgs}
        id='scatter-axes'
        x={{
          key: 'gdp',
          axis: { label: 'GDP', ticks: 5, location: 'bottom' },
        }}
        y={{
          key: 'purchasing_power',
          axis: { label: 'PPP', ticks: 5, location: 'left' },
        }}
      />
    );

    const svg = document.getElementById('scatter-axes');
    const xAxis = svg?.querySelector('[data-testid="x-axis"]');
    const yAxis = svg?.querySelector('[data-testid="y-axis"]');
    expect(xAxis).toBeTruthy();
    expect(yAxis).toBeTruthy();
  });

  it('renders with zoom enabled', () => {
    render(
      <ScatterPlot
        {...defaultArgs}
        id='scatter-zoom'
        zooming={{ enabled: true }}
      />
    );

    const svg = document.getElementById('scatter-zoom');
    expect(svg).toBeTruthy();
  });

  it('renders with connection line', () => {
    render(
      <ScatterPlot
        {...defaultArgs}
        id='scatter-connected'
        connect={{ enabled: true, className: 'text-gray-400' }}
      />
    );

    const svg = document.getElementById('scatter-connected');
    expect(svg).toBeTruthy();
  });

  it('handles empty data', () => {
    render(<ScatterPlot {...defaultArgs} id='scatter-empty' data={[]} />);

    const svg = document.getElementById('scatter-empty');
    expect(svg).toBeTruthy();
  });
});
