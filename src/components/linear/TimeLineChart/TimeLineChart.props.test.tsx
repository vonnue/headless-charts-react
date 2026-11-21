import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import Chart, { TimeLineChartProps } from '.';
import { installResizeMocks } from '@/test-utils/resizeObserver';

// #96: TimeLineChart must redraw when data (or other props) change at a
// fixed size, not only when the container resizes.
describe('TimeLineChart prop changes (#96)', () => {
  const events = {
    startKey: 'start',
    endKey: 'end',
    isTime: false,
    classNameKey: 'name',
    classNameMapping: { A: 'event-a', B: 'event-b', C: 'event-c' },
  } as const;
  const y = { key: 'lane' } as const;
  const first = [
    { name: 'A', lane: 'L1', start: 0, end: 10 },
    { name: 'B', lane: 'L2', start: 5, end: 15 },
  ];
  const second = [{ name: 'C', lane: 'L1', start: 0, end: 20 }];
  const style = { width: '100%', height: '100%' };
  let mocks: ReturnType<typeof installResizeMocks>;

  beforeEach(() => {
    mocks = installResizeMocks({ width: 400, height: 200 });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('redraws with the new rows when data changes at a fixed size', () => {
    const { rerender } = render(
      <Chart id='timeline-data' data={first} y={y} events={events} style={style} />
    );
    expect(document.querySelectorAll('#timeline-data .event-a')).toHaveLength(1);
    expect(document.querySelectorAll('#timeline-data .event-b')).toHaveLength(1);
    expect(document.querySelectorAll('#timeline-data .event-c')).toHaveLength(0);
    const g = document.querySelector('#timeline-data g');

    rerender(
      <Chart id='timeline-data' data={second} y={y} events={events} style={style} />
    );

    expect(document.querySelectorAll('#timeline-data .event-a')).toHaveLength(0);
    expect(document.querySelectorAll('#timeline-data .event-b')).toHaveLength(0);
    expect(document.querySelectorAll('#timeline-data .event-c')).toHaveLength(1);
    // A redraw replaces the plot group; the size is unchanged.
    expect(document.querySelector('#timeline-data g')).not.toBe(g);
    expect(document.getElementById('timeline-data')?.innerHTML).not.toContain('NaN');
  });

  it('redraws at the new size when the container resizes with fixed data', () => {
    render(
      <Chart id='timeline-fixed-data' data={first} y={y} events={events} style={style} />
    );
    expect(document.querySelectorAll('#timeline-fixed-data .event-a')).toHaveLength(1);
    expect(document.querySelectorAll('#timeline-fixed-data .event-b')).toHaveLength(1);
    const before = document.getElementById('timeline-fixed-data')?.innerHTML;

    mocks.resize(800, 400);

    expect(document.querySelectorAll('#timeline-fixed-data .event-a')).toHaveLength(1);
    expect(document.querySelectorAll('#timeline-fixed-data .event-b')).toHaveLength(1);
    const after = document.getElementById('timeline-fixed-data')?.innerHTML;
    expect(after).not.toBe(before);
    expect(after).not.toContain('NaN');
  });

  it('keeps the same plot group when rerendered with the same props and default margin, padding and events', () => {
    // events is required on the public type but defaulted in the component.
    // Omit margin, padding and events so the hoisted module defaults are used.
    const props = {
      id: 'timeline-stable-defaults',
      data: first,
      y,
      style,
    } as TimeLineChartProps<(typeof first)[number]>;
    const { rerender } = render(<Chart {...props} />);
    const g = document.querySelector('#timeline-stable-defaults g');
    expect(g).not.toBeNull();

    rerender(<Chart {...props} />);

    expect(document.querySelector('#timeline-stable-defaults g')).toBe(g);
  });
});
