import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import Chart from '.';
import { installResizeMocks } from '@/test-utils/resizeObserver';
import data from './sample.json';

// #53: waffle redraws when its svg's layout box changes, not only when
// style.width/height do.
describe('waffle resize (useChartSize)', () => {
  const args = { data, x: { key: 'year' }, y: { key: 'month' }, color: { key: 'temperature' } };
  let mocks: ReturnType<typeof installResizeMocks>;

  beforeEach(() => {
    mocks = installResizeMocks({ width: 400, height: 200 });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('redraws at the new size when the container resizes', () => {
    render(<Chart {...args} id='waffle-resize' style={{ width: '100%', height: '100%' }} />);
    const el = document.getElementById('waffle-resize');
    const before = el?.innerHTML;
    expect(before).toBeTruthy();
    expect(before).not.toContain('NaN');

    mocks.resize(800, 400);

    const after = document.getElementById('waffle-resize')?.innerHTML;
    expect(after).not.toBe(before);
    expect(after).not.toContain('NaN');
  });

  it('does not redraw for an unchanged or sub-pixel size', () => {
    render(<Chart {...args} id='waffle-same-size' style={{ width: '100%', height: '100%' }} />);
    const g = document.querySelector('#waffle-same-size g');
    mocks.resize(400, 200);
    mocks.resize(400.4, 200.5);
    expect(document.querySelector('#waffle-same-size g')).toBe(g);
  });
});
