import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import Chart from '.';
import { installResizeMocks } from '@/test-utils/resizeObserver';

// #53: pc redraws when its svg's layout box changes, not only when
// style.width/height do.
describe('pc resize (useChartSize)', () => {
  const args = { data: [{ name: 'a', x: 1, y: 10 }, { name: 'b', x: 2, y: 20 }, { name: 'c', x: 3, y: 30 }], dimensions: ['x', 'y'] };
  let mocks: ReturnType<typeof installResizeMocks>;

  beforeEach(() => {
    mocks = installResizeMocks({ width: 400, height: 200 });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('redraws at the new size when the container resizes', () => {
    render(<Chart {...args} id='pc-resize' style={{ width: '100%', height: '100%' }} />);
    const el = document.getElementById('pc-resize');
    const before = el?.innerHTML;
    expect(before).toBeTruthy();
    expect(before).not.toContain('NaN');

    mocks.resize(800, 400);

    const after = document.getElementById('pc-resize')?.innerHTML;
    expect(after).not.toBe(before);
    expect(after).not.toContain('NaN');
  });

  it('does not redraw for an unchanged or sub-pixel size', () => {
    render(<Chart {...args} id='pc-same-size' style={{ width: '100%', height: '100%' }} />);
    const g = document.querySelector('#pc-same-size g');
    mocks.resize(400, 200);
    mocks.resize(400.4, 200.5);
    expect(document.querySelector('#pc-same-size g')).toBe(g);
  });
});
