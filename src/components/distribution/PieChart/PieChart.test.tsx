import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import PieChart from '.';
import data from './sample.json';

describe('PieChart', () => {
  const defaultArgs = {
    id: 'pie-chart',
    data,
    nameKey: 'name',
    valueKey: 'Y2022',
  };

  it('renders an SVG element', () => {
    render(<PieChart {...defaultArgs} />);

    const svg = document.getElementById('pie-chart');
    expect(svg).toBeTruthy();
    expect(svg?.tagName).toBe('svg');
  });

  it('renders one path per data slice', () => {
    render(<PieChart {...defaultArgs} />);

    const svg = document.getElementById('pie-chart');
    const paths = svg?.querySelectorAll('path');
    expect(paths?.length).toBe(data.length);
  });

  it('renders as a donut chart with innerRadius', () => {
    render(
      <PieChart {...defaultArgs} id='pie-donut' innerRadius={0.5} />
    );

    const svg = document.getElementById('pie-donut');
    const paths = svg?.querySelectorAll('path');
    expect(paths?.length).toBe(data.length);
  });

  it('renders with custom start and end angles', () => {
    render(
      <PieChart
        {...defaultArgs}
        id='pie-angles'
        startAngle={0}
        endAngle={Math.PI}
      />
    );

    const svg = document.getElementById('pie-angles');
    expect(svg).toBeTruthy();
  });

  it('renders with padding angle and corner radius', () => {
    render(
      <PieChart
        {...defaultArgs}
        id='pie-styled'
        paddingAngle={0.02}
        cornerRadius={4}
      />
    );

    const svg = document.getElementById('pie-styled');
    expect(svg).toBeTruthy();
  });

  it('renders with title and subtitle text elements', () => {
    render(
      <PieChart
        {...defaultArgs}
        id='pie-titled'
        title={{ text: 'Revenue', className: 'text-lg' }}
        subtitle={{ text: '2022', className: 'text-sm' }}
      />
    );

    const svg = document.getElementById('pie-titled');
    // Title and subtitle are rendered as text elements with their className
    const titleEl = svg?.querySelector('text.text-lg');
    const subtitleEl = svg?.querySelector('text.text-sm');
    expect(titleEl).toBeTruthy();
    expect(subtitleEl).toBeTruthy();
  });

  it('renders with classNameMap for slice colors', () => {
    render(
      <PieChart
        {...defaultArgs}
        id='pie-colors'
        classNameMap={{
          macbook: 'text-blue-500',
          services: 'text-green-500',
          ipad: 'text-red-500',
          iphone: 'text-purple-500',
          wearables: 'text-yellow-500',
        }}
      />
    );

    const svg = document.getElementById('pie-colors');
    const paths = svg?.querySelectorAll('path');
    expect(paths?.length).toBe(data.length);
  });

  it('renders with custom className on SVG', () => {
    render(
      <PieChart {...defaultArgs} id='pie-class' className='bg-white rounded' />
    );

    const svg = document.getElementById('pie-class');
    expect(svg).toBeTruthy();
  });

  it('renders with sort disabled', () => {
    render(<PieChart {...defaultArgs} id='pie-unsorted' sort={false} />);

    const svg = document.getElementById('pie-unsorted');
    const paths = svg?.querySelectorAll('path');
    expect(paths?.length).toBe(data.length);
  });

  it('handles empty data', () => {
    render(<PieChart {...defaultArgs} id='pie-empty' data={[]} />);

    const svg = document.getElementById('pie-empty');
    expect(svg).toBeTruthy();
  });
});
