import { afterEach, describe, expect, it, vi } from 'vitest';
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

describe('LinearGauge update lifecycle (#11)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // jsdom has no layout, so give the svg a size through inline style.
  const sized = { width: '300px', height: '100px' };
  const args = { label: 'Progress', max: 100, style: sized };

  const dataRect = (id: string) =>
    document.querySelector<SVGRectElement>(`#${id} rect.data-rect`);

  // Ids of the transitions scheduled or running on a node.
  const transitionIds = (node: Element | null) =>
    Object.keys(Reflect.get(node ?? {}, '__transition') ?? {});

  it('animates only its own rect when two gauges share a page', () => {
    const gauges = (b: number) => (
      <>
        <LinearGauge {...args} id='gauge-a' data={20} />
        <LinearGauge {...args} id='gauge-b' data={b} />
      </>
    );
    const { rerender } = render(gauges(30));
    const aBefore = transitionIds(dataRect('gauge-a'));
    const bBefore = transitionIds(dataRect('gauge-b'));

    rerender(gauges(90));

    expect(transitionIds(dataRect('gauge-a'))).toEqual(aBefore);
    expect(transitionIds(dataRect('gauge-b'))).not.toEqual(bBefore);
  });

  it('runs one transition on a data change and keeps the svg', () => {
    const { rerender } = render(<LinearGauge {...args} id='gauge-one' data={20} />);
    const g = document.querySelector('#gauge-one > g');
    const rect = dataRect('gauge-one');

    rerender(<LinearGauge {...args} id='gauge-one' data={80} />);

    expect(document.querySelector('#gauge-one > g')).toBe(g);
    expect(dataRect('gauge-one')).toBe(rect);
    // The previous one was interrupted, so only the new transition is left.
    expect(transitionIds(rect)).toHaveLength(1);
  });

  it('interrupts the transition on unmount and leaves no timers', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { unmount } = render(<LinearGauge {...args} id='gauge-unmount' data={50} />);
    const rect = dataRect('gauge-unmount');
    expect(transitionIds(rect)).not.toHaveLength(0);

    unmount();

    expect(transitionIds(rect)).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not redraw when rerendered with the same props', () => {
    const { rerender } = render(<LinearGauge {...args} id='gauge-same' data={50} />);
    const g = document.querySelector('#gauge-same > g');
    const before = transitionIds(dataRect('gauge-same'));

    rerender(<LinearGauge {...args} id='gauge-same' data={50} />);

    expect(document.querySelector('#gauge-same > g')).toBe(g);
    expect(transitionIds(dataRect('gauge-same'))).toEqual(before);
  });
});
