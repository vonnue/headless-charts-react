import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import Chart from '.';
import { installResizeMocks } from '@/test-utils/resizeObserver';

// #53: sparkline redraws when its svg's layout box changes, not only when
// style.width/height do.
describe('sparkline resize (useChartSize)', () => {
  const args = { data: [{ x: 1, a: 1 }, { x: 2, a: 3 }, { x: 3, a: 2 }], x: { key: 'x' }, y: [{ key: 'a' }] };
  let mocks: ReturnType<typeof installResizeMocks>;

  beforeEach(() => {
    mocks = installResizeMocks({ width: 400, height: 200 });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('redraws at the new size when the container resizes', () => {
    render(<Chart {...args} id='sparkline-resize' style={{ width: '100%', height: '100%' }} />);
    const el = document.getElementById('sparkline-resize');
    const before = el?.innerHTML;
    expect(before).toBeTruthy();
    expect(before).not.toContain('NaN');

    mocks.resize(800, 400);

    const after = document.getElementById('sparkline-resize')?.innerHTML;
    expect(after).not.toBe(before);
    expect(after).not.toContain('NaN');
  });

  it('does not redraw for an unchanged or sub-pixel size', () => {
    render(<Chart {...args} id='sparkline-same-size' style={{ width: '100%', height: '100%' }} />);
    const g = document.querySelector('#sparkline-same-size g');
    mocks.resize(400, 200);
    mocks.resize(400.4, 200.5);
    expect(document.querySelector('#sparkline-same-size g')).toBe(g);
  });
});
