import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import LinearGauge from '.';

describe('LinearGauge', () => {
  const defaultArgs = {
    id: 'linear-gauge',
    data: 75,
    label: 'Progress',
    max: 100,
  };

  it('renders an SVG element', () => {
    render(<LinearGauge {...defaultArgs} />);

    const svg = document.getElementById('linear-gauge');
    expect(svg).toBeTruthy();
    expect(svg?.tagName).toBe('svg');
  });

  it('renders background and data rects', () => {
    render(<LinearGauge {...defaultArgs} />);

    const svg = document.getElementById('linear-gauge');
    const rects = svg?.querySelectorAll('rect');
    // At least 2: background + data bar
    expect(rects?.length).toBeGreaterThanOrEqual(2);
  });

  it('renders the label text', () => {
    render(<LinearGauge {...defaultArgs} />);

    const svg = document.getElementById('linear-gauge');
    const texts = svg?.querySelectorAll('text');
    expect(texts?.length).toBeGreaterThanOrEqual(1);
  });

  it('renders with custom classNameGauge and classNameGaugeBg', () => {
    render(
      <LinearGauge
        {...defaultArgs}
        id='linear-styled'
        classNameGauge='fill-blue-500'
        classNameGaugeBg='fill-gray-200'
      />
    );

    const svg = document.getElementById('linear-styled');
    expect(svg).toBeTruthy();
  });

  it('renders with error margin bar', () => {
    render(
      <LinearGauge
        {...defaultArgs}
        id='linear-error'
        error={{ data: 10, className: 'fill-red-500' }}
      />
    );

    const svg = document.getElementById('linear-error');
    const rects = svg?.querySelectorAll('rect');
    // background + data + error = 3
    expect(rects?.length).toBeGreaterThanOrEqual(3);
  });

  it('renders with custom margin', () => {
    render(
      <LinearGauge
        {...defaultArgs}
        id='linear-margin'
        margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
      />
    );

    const svg = document.getElementById('linear-margin');
    expect(svg).toBeTruthy();
  });

  it('renders with drawing animation config', () => {
    render(
      <LinearGauge
        {...defaultArgs}
        id='linear-animated'
        drawing={{ duration: 500 }}
      />
    );

    const svg = document.getElementById('linear-animated');
    expect(svg).toBeTruthy();
  });

  it('handles zero data value', () => {
    render(<LinearGauge {...defaultArgs} id='linear-zero' data={0} />);

    const svg = document.getElementById('linear-zero');
    expect(svg).toBeTruthy();
  });

  it('handles data at max', () => {
    render(<LinearGauge {...defaultArgs} id='linear-full' data={100} />);

    const svg = document.getElementById('linear-full');
    expect(svg).toBeTruthy();
  });
});
