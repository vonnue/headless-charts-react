import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import Chart from '.';
import { installResizeMocks } from '@/test-utils/resizeObserver';

// #53: violin redraws when its svg's layout box changes, not only when
// style.width/height do.
describe('violin resize (useChartSize)', () => {
  const args = {
    data: [
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => ({ cat: 'A', v })),
      ...[11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((v) => ({ cat: 'B', v })),
    ],
    category: { key: 'cat' },
    value: { key: 'v' },
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
    render(<Chart {...args} id='violin-resize' style={{ width: '100%', height: '100%' }} />);
    const el = document.getElementById('violin-resize');
    const before = el?.innerHTML;
    expect(before).toBeTruthy();
    expect(before).not.toContain('NaN');

    mocks.resize(800, 400);

    const after = document.getElementById('violin-resize')?.innerHTML;
    expect(after).not.toBe(before);
    expect(after).not.toContain('NaN');
  });

  it('does not redraw for an unchanged or sub-pixel size', () => {
    render(<Chart {...args} id='violin-same-size' style={{ width: '100%', height: '100%' }} />);
    const g = document.querySelector('#violin-same-size g');
    mocks.resize(400, 200);
    mocks.resize(400.4, 200.5);
    expect(document.querySelector('#violin-same-size g')).toBe(g);
  });
});
