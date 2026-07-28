import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import BulletChart from '.';

describe('BulletChart', () => {
  const defaultArgs = {
    id: 'bullet-chart',
    data: 75,
    base: 50,
    target: 90,
    threshold: 80,
    max: 100,
  };

  it('renders an SVG element', () => {
    render(<BulletChart {...defaultArgs} />);

    const svg = document.getElementById('bullet-chart');
    expect(svg).toBeTruthy();
    expect(svg?.tagName).toBe('svg');
  });

  it('renders rect elements for the layers (max, threshold, base, data)', () => {
    render(<BulletChart {...defaultArgs} />);

    const svg = document.getElementById('bullet-chart');
    const rects = svg?.querySelectorAll('rect');
    // Should have at least 4 rects: max, threshold, base, data
    expect(rects?.length).toBeGreaterThanOrEqual(4);
  });

  it('renders a target line', () => {
    render(<BulletChart {...defaultArgs} />);

    const svg = document.getElementById('bullet-chart');
    const lines = svg?.querySelectorAll('line');
    expect(lines?.length).toBeGreaterThanOrEqual(1);
  });

  it('renders with a label', () => {
    render(
      <BulletChart {...defaultArgs} id='bullet-labeled' label='Performance' />
    );

    const svg = document.getElementById('bullet-labeled');
    const texts = svg?.querySelectorAll('text');
    const labelText = Array.from(texts || []).find(
      (t) => t.textContent === 'Performance'
    );
    expect(labelText).toBeTruthy();
  });

  it('renders with custom classNames', () => {
    render(
      <BulletChart
        {...defaultArgs}
        id='bullet-styled'
        classNames={{
          data: 'fill-green-500',
          base: 'fill-blue-300',
          target: 'fill-black',
          threshold: 'fill-yellow-500',
          max: 'fill-gray-200',
        }}
      />
    );

    const svg = document.getElementById('bullet-styled');
    expect(svg).toBeTruthy();
  });

  it('renders with custom margin', () => {
    render(
      <BulletChart
        {...defaultArgs}
        id='bullet-margin'
        margin={{ top: 10, right: 10, bottom: 30, left: 10 }}
      />
    );

    const svg = document.getElementById('bullet-margin');
    expect(svg).toBeTruthy();
  });

  it('renders with min value set', () => {
    render(
      <BulletChart {...defaultArgs} id='bullet-min' min={20} />
    );

    const svg = document.getElementById('bullet-min');
    expect(svg).toBeTruthy();
  });

  it('handles data value of 0', () => {
    render(<BulletChart {...defaultArgs} id='bullet-zero' data={0} />);

    const svg = document.getElementById('bullet-zero');
    expect(svg).toBeTruthy();
  });

  it('handles data value at max', () => {
    render(<BulletChart {...defaultArgs} id='bullet-max' data={100} />);

    const svg = document.getElementById('bullet-max');
    expect(svg).toBeTruthy();
  });
});
