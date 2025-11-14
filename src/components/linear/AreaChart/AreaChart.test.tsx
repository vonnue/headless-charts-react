import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import AreaChart from '.';
import data from './data.json';

describe('AreaChart', () => {
  const defaultArgs = {
    id: 'area-chart',
    data,
    x: {
      key: 'year',
    },
    y: [
      {
        key: 'iphone',
      },
      {
        key: 'macbook',
      },
      {
        key: 'ipad',
      },
      {
        key: 'wearables',
      },
      {
        key: 'services',
      },
    ],
  };

  it('renders Default area chart', () => {
    render(<AreaChart {...defaultArgs} />);

    const svg = screen.getByTestId('area-chart');
    expect(svg).toBeTruthy();
    expect(svg.tagName).toBe('svg');
  });

  it('renders with custom className', () => {
    const styledArgs = {
      ...defaultArgs,
      id: 'area-chart-styled',
      y: [
        {
          key: 'iphone',
          className: 'text-purple-900',
        },
        {
          key: 'macbook',
          className: 'text-purple-700',
        },
      ],
    };

    render(<AreaChart {...styledArgs} />);

    const svg = screen.getByTestId('area-chart-styled');
    expect(svg).toBeTruthy();
  });

  it('renders with padding', () => {
    const padding = {
      top: 20,
      right: 20,
      bottom: 20,
      left: 20,
    };

    render(
      <AreaChart {...defaultArgs} id='area-chart-padding' padding={padding} />
    );

    const svg = screen.getByTestId('area-chart-padding');
    expect(svg).toBeTruthy();
  });

  it('renders with zooming enabled', () => {
    render(
      <AreaChart
        {...defaultArgs}
        id='area-chart-zooming'
        zooming={{
          enabled: true,
        }}
      />
    );

    const svg = screen.getByTestId('area-chart-zooming');
    expect(svg).toBeTruthy();
  });

  it('renders with 100% stacking', () => {
    render(
      <AreaChart
        {...defaultArgs}
        id='stacked-area-100'
        stacking={{
          type: '100%',
        }}
      />
    );

    const svg = screen.getByTestId('stacked-area-100');
    expect(svg).toBeTruthy();
  });

  it('renders streamgraph', () => {
    render(
      <AreaChart
        {...defaultArgs}
        id='stacked-area-streamgraph'
        stacking={{
          type: 'streamgraph',
        }}
      />
    );

    const svg = screen.getByTestId('stacked-area-streamgraph');
    expect(svg).toBeTruthy();
  });
});
