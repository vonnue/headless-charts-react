import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import RingGauge from '.';
import data from './sample.json';

describe('RingGauge', () => {
  const defaultArgs = {
    id: 'ring-gauge',
    data,
    labelKey: 'name',
    targetKey: 'target',
    dataKey: 'score',
  };

  it('renders an SVG element', () => {
    render(<RingGauge {...defaultArgs} />);

    const svg = document.getElementById('ring-gauge');
    expect(svg).toBeTruthy();
    expect(svg?.tagName).toBe('svg');
  });

  it('renders background arcs for each data item', () => {
    render(<RingGauge {...defaultArgs} />);

    const svg = document.getElementById('ring-gauge');
    const bgArcs = svg?.querySelector('.background-arcs');
    expect(bgArcs).toBeTruthy();
    const paths = bgArcs?.querySelectorAll('path');
    expect(paths?.length).toBe(data.length);
  });

  it('renders data arcs', () => {
    render(<RingGauge {...defaultArgs} />);

    const svg = document.getElementById('ring-gauge');
    const dataGroup = svg?.querySelector('.data');
    expect(dataGroup).toBeTruthy();
  });

  it('renders with custom classNameGauge and classNameGaugeBg', () => {
    render(
      <RingGauge
        {...defaultArgs}
        id='ring-styled'
        classNameGauge='text-blue-500'
        classNameGaugeBg='text-gray-100'
      />
    );

    const svg = document.getElementById('ring-styled');
    expect(svg).toBeTruthy();
  });

  it('renders with labels', () => {
    render(
      <RingGauge
        {...defaultArgs}
        id='ring-labels'
        labels={{ position: 'bottom', className: 'text-sm' }}
      />
    );

    const svg = document.getElementById('ring-labels');
    const texts = svg?.querySelectorAll('text');
    expect(texts?.length).toBeGreaterThanOrEqual(data.length);
  });

  it('renders with custom start and end angles', () => {
    render(
      <RingGauge
        {...defaultArgs}
        id='ring-angles'
        startAngle={-Math.PI / 2}
        endAngle={Math.PI / 2}
      />
    );

    const svg = document.getElementById('ring-angles');
    expect(svg).toBeTruthy();
  });

  it('renders with custom margin', () => {
    render(
      <RingGauge
        {...defaultArgs}
        id='ring-margin'
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      />
    );

    const svg = document.getElementById('ring-margin');
    expect(svg).toBeTruthy();
  });

  it('renders with custom padding', () => {
    render(
      <RingGauge
        {...defaultArgs}
        id='ring-padded'
        padding={{ arc: 10 }}
      />
    );

    const svg = document.getElementById('ring-padded');
    expect(svg).toBeTruthy();
  });

  it('renders with a single data item', () => {
    render(
      <RingGauge
        {...defaultArgs}
        id='ring-single'
        data={[data[0]]}
      />
    );

    const svg = document.getElementById('ring-single');
    expect(svg).toBeTruthy();
  });
});
