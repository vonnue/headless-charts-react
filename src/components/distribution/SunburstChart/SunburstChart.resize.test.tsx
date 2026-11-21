import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import Chart from '.';
import { installResizeMocks } from '@/test-utils/resizeObserver';

// #53: sunburst redraws when its svg's layout box changes, not only when
// style.width/height do.
describe('sunburst resize (useChartSize)', () => {
  const args = {
    data: { name: 'Root', children: [{ name: 'A', size: 40 }, { name: 'B', size: 20 }] },
    value: { key: 'size' },
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
    render(<Chart {...args} id='sunburst-resize' style={{ width: '100%', height: '100%' }} />);
    const el = document.getElementById('sunburst-resize');
    const before = el?.innerHTML;
    expect(before).toBeTruthy();
    expect(before).not.toContain('NaN');

    mocks.resize(800, 400);

    const after = document.getElementById('sunburst-resize')?.innerHTML;
    expect(after).not.toBe(before);
    expect(after).not.toContain('NaN');
  });

  it('does not redraw for an unchanged or sub-pixel size', () => {
    render(<Chart {...args} id='sunburst-same-size' style={{ width: '100%', height: '100%' }} />);
    const g = document.querySelector('#sunburst-same-size g');
    mocks.resize(400, 200);
    mocks.resize(400.4, 200.5);
    expect(document.querySelector('#sunburst-same-size g')).toBe(g);
  });
});
