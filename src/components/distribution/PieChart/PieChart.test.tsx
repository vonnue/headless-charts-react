import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { select } from 'd3-selection';

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

describe('PieChart tooltip lifecycle (spec: specs/issue-8.md)', () => {
  it('C7: removes its tooltip on unmount', () => {
    const { unmount } = render(
      <PieChart id='c7-pie' data={data} nameKey='name' valueKey='Y2022' tooltip={{}} style={{ width: '400px', height: '200px' }} />
    );

    unmount();

    expect(document.querySelectorAll('[id="tooltip-c7-pie"]')).toHaveLength(0);
  });
});

describe('PieChart redraw lifecycle (#12)', () => {
  const defaultArgs = {
    id: 'pie-chart',
    data,
    nameKey: 'name',
    valueKey: 'Y2022',
  };

  afterEach(() => {
    vi.useRealTimers();
  });

  const slices = (id: string) =>
    Array.from(document.querySelectorAll<SVGPathElement>(`#${id} path`));

  const animated = { duration: 1000 };

  it('draws the new data when rerendered with new data', () => {
    const { rerender } = render(<PieChart {...defaultArgs} id='pie-new' />);
    const next = data.slice(0, 3).map((d) => ({ ...d, Y2022: d.Y2022 * 2 }));
    rerender(<PieChart {...defaultArgs} id='pie-new' data={next} />);

    // jsdom has no layout (radius 0), so check the data bound to the slices.
    const bound = slices('pie-new').map(
      (p) => select<SVGPathElement, { data: unknown }>(p).datum().data
    );
    expect(bound).toHaveLength(3);
    expect(bound).toEqual(expect.arrayContaining(next));
  });

  it('leaves no pending timers after unmount', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { unmount } = render(
      <PieChart {...defaultArgs} id='pie-timers' drawing={animated} />
    );
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not redraw when rerendered with the same props', () => {
    const { rerender } = render(<PieChart {...defaultArgs} id='pie-same' />);
    const before = document.querySelector('#pie-same > g');
    rerender(<PieChart {...defaultArgs} id='pie-same' />);
    expect(document.querySelector('#pie-same > g')).toBe(before);
  });

  it('interrupts running transitions on unmount', () => {
    const { unmount } = render(
      <PieChart {...defaultArgs} id='pie-interrupt' drawing={animated} />
    );
    const paths = slices('pie-interrupt');
    expect(paths.some((p) => Reflect.has(p, '__transition'))).toBe(true);
    unmount();
    expect(paths.some((p) => Reflect.has(p, '__transition'))).toBe(false);
  });

  // #48: the hook used to adopt the chart's own <svg id="tooltip"> as its
  // tooltip element and replace its contents on hover.
  it('keeps its slices on hover when the chart id is "tooltip"', () => {
    const { unmount } = render(<PieChart {...defaultArgs} id='tooltip' tooltip={{}} />);
    const svg = document.getElementById('tooltip');
    expect(svg?.tagName).toBe('svg');
    const first = svg?.querySelector('path');
    expect(first).toBeTruthy();

    fireEvent.mouseEnter(first!);

    expect(svg?.querySelectorAll('path')).toHaveLength(data.length);
    expect(svg?.getAttribute('class') ?? '').not.toContain('opacity-100');
    const tip = document.getElementById('tooltip-tooltip');
    expect(tip).toBeInstanceOf(HTMLDivElement);
    expect(tip?.innerHTML).not.toBe('');
    expect(svg?.contains(tip ?? null)).toBe(false);
    unmount();
    expect(document.getElementById('tooltip-tooltip')).toBeNull();
  });
});
