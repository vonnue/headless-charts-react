import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import Chart from '.';
import { installResizeMocks } from '@/test-utils/resizeObserver';
import data from './sample.json';

// #53: timeline redraws when its svg's layout box changes, not only when
// style.width/height do.
describe('timeline resize (useChartSize)', () => {
  const args = {
    data,
    y: { key: 'exophoneNumber' },
    events: { startKey: 'callStartTime', endKey: 'callEndTime', isTime: true },
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
    render(<Chart {...args} id='timeline-resize' style={{ width: '100%', height: '100%' }} />);
    const el = document.getElementById('timeline-resize');
    const before = el?.innerHTML;
    expect(before).toBeTruthy();
    expect(before).not.toContain('NaN');

    mocks.resize(800, 400);

    const after = document.getElementById('timeline-resize')?.innerHTML;
    expect(after).not.toBe(before);
    expect(after).not.toContain('NaN');
  });

  it('does not redraw for an unchanged or sub-pixel size', () => {
    render(<Chart {...args} id='timeline-same-size' style={{ width: '100%', height: '100%' }} />);
    const g = document.querySelector('#timeline-same-size g');
    mocks.resize(400, 200);
    mocks.resize(400.4, 200.5);
    expect(document.querySelector('#timeline-same-size g')).toBe(g);
  });
});
