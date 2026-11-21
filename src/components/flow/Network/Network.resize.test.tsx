import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import Chart from '.';
import { installResizeMocks } from '@/test-utils/resizeObserver';

// #53: network redraws when its svg's layout box changes, not only when
// style.width/height do.
describe('network resize (useChartSize)', () => {
  const args = {
    nodes: [{ name: 'a', vx: 0, vy: 0 }, { name: 'b', vx: 10, vy: 8 }],
    edges: [{ source: 'a', target: 'b' }],
    nodeDef: {
      idKey: 'name',
      x: { key: 'vx', axis: 'bottom' as const },
      y: { key: 'vy', axis: 'left' as const },
    },
    edgeDef: { sourceKey: 'source', targetKey: 'target' },
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
    render(<Chart {...args} id='network-resize' style={{ width: '100%', height: '100%' }} />);
    const el = document.getElementById('network-resize');
    const before = el?.innerHTML;
    expect(before).toBeTruthy();
    expect(before).not.toContain('NaN');

    mocks.resize(800, 400);

    const after = document.getElementById('network-resize')?.innerHTML;
    expect(after).not.toBe(before);
    expect(after).not.toContain('NaN');
  });

  it('does not redraw for an unchanged or sub-pixel size', () => {
    render(<Chart {...args} id='network-same-size' style={{ width: '100%', height: '100%' }} />);
    const g = document.querySelector('#network-same-size g');
    mocks.resize(400, 200);
    mocks.resize(400.4, 200.5);
    expect(document.querySelector('#network-same-size g')).toBe(g);
  });
});
