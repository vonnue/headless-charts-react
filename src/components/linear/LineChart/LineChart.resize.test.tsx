import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import Chart from '.';
import { installResizeMocks } from '@/test-utils/resizeObserver';

// #53: line redraws when its svg's layout box changes, not only when
// style.width/height do.
describe('line resize (useChartSize)', () => {
  const args = { data: [{ year: 2020, a: 10, b: 4 }, { year: 2021, a: 12, b: 6 }, { year: 2022, a: 9, b: 8 }], x: { key: 'year' }, y: [{ key: 'a' }, { key: 'b' }] };
  let mocks: ReturnType<typeof installResizeMocks>;

  beforeEach(() => {
    mocks = installResizeMocks({ width: 400, height: 200 });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('redraws at the new size when the container resizes', () => {
    render(<Chart {...args} id='line-resize' style={{ width: '100%', height: '100%' }} />);
    const el = document.getElementById('line-resize');
    const before = el?.innerHTML;
    expect(before).toBeTruthy();
    expect(before).not.toContain('NaN');

    mocks.resize(800, 400);

    const after = document.getElementById('line-resize')?.innerHTML;
    expect(after).not.toBe(before);
    expect(after).not.toContain('NaN');
  });

  it('does not redraw for an unchanged or sub-pixel size', () => {
    render(<Chart {...args} id='line-same-size' style={{ width: '100%', height: '100%' }} />);
    const g = document.querySelector('#line-same-size g');
    mocks.resize(400, 200);
    mocks.resize(400.4, 200.5);
    expect(document.querySelector('#line-same-size g')).toBe(g);
  });
});
