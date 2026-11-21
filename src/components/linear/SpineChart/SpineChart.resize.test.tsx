import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import Chart from '.';
import { installResizeMocks } from '@/test-utils/resizeObserver';

// #53: spine redraws when its svg's layout box changes, not only when
// style.width/height do.
describe('spine resize (useChartSize)', () => {
  const args = {
    data: [{ name: 'wearables', value2: 6, value3: 7 }, { name: 'services', value2: 4, value3: 6 }],
    y: { key: 'name', axis: { location: 'middle' as const } },
    x: [
      { key: 'value2', direction: 'left' as const },
      { key: 'value3', direction: 'right' as const },
    ],
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
    render(<Chart {...args} id='spine-resize' style={{ width: '100%', height: '100%' }} />);
    const el = document.getElementById('spine-resize');
    const before = el?.innerHTML;
    expect(before).toBeTruthy();
    expect(before).not.toContain('NaN');

    mocks.resize(800, 400);

    const after = document.getElementById('spine-resize')?.innerHTML;
    expect(after).not.toBe(before);
    expect(after).not.toContain('NaN');
  });

  it('does not redraw for an unchanged or sub-pixel size', () => {
    render(<Chart {...args} id='spine-same-size' style={{ width: '100%', height: '100%' }} />);
    const g = document.querySelector('#spine-same-size g');
    mocks.resize(400, 200);
    mocks.resize(400.4, 200.5);
    expect(document.querySelector('#spine-same-size g')).toBe(g);
  });
});
