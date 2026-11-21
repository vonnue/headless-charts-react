import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import Chart from '.';
import { installResizeMocks } from '@/test-utils/resizeObserver';

// #53: boxplot redraws when its svg's layout box changes, not only when
// style.width/height do.
describe('boxplot resize (useChartSize)', () => {
  const args = {
    data: [
      { name: 'A', min: 10, q1: 20, mid: 30, q3: 40, max: 50 },
      { name: 'B', min: 15, q1: 25, mid: 35, q3: 45, max: 70 },
    ],
    x: { key: 'name' },
    y: { minKey: 'min', maxKey: 'max', boxStart: 'q1', boxEnd: 'q3', midKey: 'mid' },
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
    render(<Chart {...args} id='boxplot-resize' style={{ width: '100%', height: '100%' }} />);
    const el = document.getElementById('boxplot-resize');
    const before = el?.innerHTML;
    expect(before).toBeTruthy();
    expect(before).not.toContain('NaN');

    mocks.resize(800, 400);

    const after = document.getElementById('boxplot-resize')?.innerHTML;
    expect(after).not.toBe(before);
    expect(after).not.toContain('NaN');
  });

  it('does not redraw for an unchanged or sub-pixel size', () => {
    render(<Chart {...args} id='boxplot-same-size' style={{ width: '100%', height: '100%' }} />);
    const g = document.querySelector('#boxplot-same-size g');
    mocks.resize(400, 200);
    mocks.resize(400.4, 200.5);
    expect(document.querySelector('#boxplot-same-size g')).toBe(g);
  });
});
