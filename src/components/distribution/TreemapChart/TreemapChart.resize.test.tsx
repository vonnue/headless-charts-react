import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import Chart from '.';
import { installResizeMocks } from '@/test-utils/resizeObserver';

// #53: treemap redraws when its svg's layout box changes, not only when
// style.width/height do.
describe('treemap resize (useChartSize)', () => {
  const args = {
    data: { name: 'Root', children: [{ name: 'A', amount: 40 }, { name: 'B', amount: 20 }] },
    value: { key: 'amount' },
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
    render(<Chart {...args} id='treemap-resize' style={{ width: '100%', height: '100%' }} />);
    const el = document.getElementById('treemap-resize');
    const before = el?.innerHTML;
    expect(before).toBeTruthy();
    expect(before).not.toContain('NaN');

    mocks.resize(800, 400);

    const after = document.getElementById('treemap-resize')?.innerHTML;
    expect(after).not.toBe(before);
    expect(after).not.toContain('NaN');
  });

  it('does not redraw for an unchanged or sub-pixel size', () => {
    render(<Chart {...args} id='treemap-same-size' style={{ width: '100%', height: '100%' }} />);
    const g = document.querySelector('#treemap-same-size g');
    mocks.resize(400, 200);
    mocks.resize(400.4, 200.5);
    expect(document.querySelector('#treemap-same-size g')).toBe(g);
  });
});
