import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import Chart from '.';
import { installResizeMocks } from '@/test-utils/resizeObserver';

// #53: candlestick redraws when its svg's layout box changes, not only when
// style.width/height do.
describe('candlestick resize (useChartSize)', () => {
  const args = {
    data: [
      { date: '2025-01-06', o: 100, h: 110, l: 95, c: 105 },
      { date: '2025-01-07', o: 105, h: 108, l: 101, c: 105 },
    ],
    x: { key: 'date', time: { isISO: true } },
    open: { key: 'o' },
    high: { key: 'h' },
    low: { key: 'l' },
    close: { key: 'c' },
  };
  let mocks: ReturnType<typeof installResizeMocks>;

  beforeEach(() => {
    mocks = installResizeMocks({ width: 400, height: 200 });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('redraws at the new size when the container resizes', () => {
    render(<Chart {...args} id='candlestick-resize' style={{ width: '100%', height: '100%' }} />);
    const el = document.getElementById('candlestick-resize');
    const before = el?.innerHTML;
    expect(before).toBeTruthy();
    expect(before).not.toContain('NaN');

    mocks.resize(800, 400);

    const after = document.getElementById('candlestick-resize')?.innerHTML;
    expect(after).not.toBe(before);
    expect(after).not.toContain('NaN');
  });

  it('does not redraw for an unchanged or sub-pixel size', () => {
    render(<Chart {...args} id='candlestick-same-size' style={{ width: '100%', height: '100%' }} />);
    const g = document.querySelector('#candlestick-same-size g');
    mocks.resize(400, 200);
    mocks.resize(400.4, 200.5);
    expect(document.querySelector('#candlestick-same-size g')).toBe(g);
  });
});
