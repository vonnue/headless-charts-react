import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import Chart from '.';
import { installResizeMocks } from '@/test-utils/resizeObserver';
import data from './sample.json';

// #53: range redraws when its svg's layout box changes, not only when
// style.width/height do.
describe('range resize (useChartSize)', () => {
  const args = { data, shape: 'circle' as const, y: { key: 'label' }, x: { minKey: 'minTemp', maxKey: 'maxTemp' } };
  let mocks: ReturnType<typeof installResizeMocks>;

  beforeEach(() => {
    mocks = installResizeMocks({ width: 400, height: 200 });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('redraws at the new size when the container resizes', () => {
    render(<Chart {...args} id='range-resize' style={{ width: '100%', height: '100%' }} />);
    const el = document.getElementById('range-resize');
    const before = el?.innerHTML;
    expect(before).toBeTruthy();
    expect(before).not.toContain('NaN');

    mocks.resize(800, 400);

    const after = document.getElementById('range-resize')?.innerHTML;
    expect(after).not.toBe(before);
    expect(after).not.toContain('NaN');
  });

  it('does not redraw for an unchanged or sub-pixel size', () => {
    render(<Chart {...args} id='range-same-size' style={{ width: '100%', height: '100%' }} />);
    const g = document.querySelector('#range-same-size g');
    mocks.resize(400, 200);
    mocks.resize(400.4, 200.5);
    expect(document.querySelector('#range-same-size g')).toBe(g);
  });
});
