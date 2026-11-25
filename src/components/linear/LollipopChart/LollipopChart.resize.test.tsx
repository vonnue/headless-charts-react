import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import Chart from '.';
import { installResizeMocks } from '@/test-utils/resizeObserver';

// #53: lollipop redraws when its svg's layout box changes, not only when
// style.width/height do.
describe('lollipop resize (useChartSize)', () => {
  const args = {
    data: [
      { name: 'a', v: 10 },
      { name: 'b', v: 20 },
      { name: 'c', v: 30 },
    ],
    x: { key: 'name', axis: { location: 'bottom' as const } },
    y: { key: 'v', start: 0, axis: { location: 'left' as const } },
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
    render(<Chart {...args} id='lollipop-resize' style={{ width: '100%', height: '100%' }} />);
    const el = document.getElementById('lollipop-resize');
    const before = el?.innerHTML;
    expect(before).toBeTruthy();
    expect(before).not.toContain('NaN');

    mocks.resize(800, 400);

    const after = document.getElementById('lollipop-resize')?.innerHTML;
    expect(after).not.toBe(before);
    expect(after).not.toContain('NaN');
  });

  it('does not redraw for an unchanged or sub-pixel size', () => {
    render(<Chart {...args} id='lollipop-same-size' style={{ width: '100%', height: '100%' }} />);
    const g = document.querySelector('#lollipop-same-size g');
    mocks.resize(400, 200);
    mocks.resize(400.4, 200.5);
    expect(document.querySelector('#lollipop-same-size g')).toBe(g);
  });
});
