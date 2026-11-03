import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { select } from 'd3-selection';

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

  describe('redraw lifecycle (#12)', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    const dataArcs = (id: string) =>
      Array.from(
        document.querySelectorAll<SVGPathElement>(`#${id} .data path`)
      );

    it('draws the new data when rerendered with new data', () => {
      const { rerender } = render(<RingGauge {...defaultArgs} id='ring-new' />);
      const next = data.slice(0, 2).map((d) => ({ ...d, score: d.target / 2 }));
      rerender(<RingGauge {...defaultArgs} id='ring-new' data={next} />);

      const arcs = dataArcs('ring-new');
      expect(arcs).toHaveLength(2);
      expect(arcs.map((a) => select(a).datum())).toEqual(next);
    });

    it('starts the next animation from the last drawn data, even mid-animation', () => {
      // jsdom has no layout, so give the svg a size through inline style.
      const sized = { width: '300px', height: '300px' };
      const { rerender } = render(
        <RingGauge {...defaultArgs} id='ring-prev' style={sized} />
      );
      const fromEmpty = dataArcs('ring-prev').map((a) => a.getAttribute('d'));
      const next = data.map((d) => ({ ...d, score: d.target / 4 }));
      rerender(
        <RingGauge {...defaultArgs} id='ring-prev' data={next} style={sized} />
      );

      // The arcs are first drawn at their previous value, then tweened.
      const fromPrevious = dataArcs('ring-prev').map((a) => a.getAttribute('d'));
      expect(fromEmpty[0]).not.toBe('M0,0Z');
      expect(fromPrevious).not.toEqual(fromEmpty);
    });

    it('leaves no pending timers after unmount', () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const { unmount } = render(
        <RingGauge {...defaultArgs} id='ring-timers' />
      );
      unmount();
      expect(vi.getTimerCount()).toBe(0);
    });

    it('does not redraw when rerendered with the same props', () => {
      const { rerender } = render(<RingGauge {...defaultArgs} id='ring-same' />);
      const before = document.querySelector('#ring-same > g');
      rerender(<RingGauge {...defaultArgs} id='ring-same' />);
      expect(document.querySelector('#ring-same > g')).toBe(before);
    });

    it('interrupts running transitions on unmount', () => {
      const { unmount } = render(
        <RingGauge {...defaultArgs} id='ring-interrupt' />
      );
      const arcs = dataArcs('ring-interrupt');
      expect(arcs.some((a) => Reflect.has(a, '__transition'))).toBe(true);
      unmount();
      expect(arcs.some((a) => Reflect.has(a, '__transition'))).toBe(false);
    });
  });
});
