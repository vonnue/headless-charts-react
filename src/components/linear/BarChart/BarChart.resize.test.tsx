import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import BarChart from '.';
import data from './sample.json';
import { installResizeMocks } from '@/test-utils/resizeObserver';

// #53: BarChart redraws when its svg's layout box changes, not only when
// style.width/height do.
describe('BarChart resize (useChartSize)', () => {
  const x = [{ key: 'reading' }];
  const y = { key: 'name' };
  const margin = { top: 40, right: 20, bottom: 40, left: 60 };
  const padding = { top: 0, right: 0, bottom: 0, left: 0, bar: 0.1 };
  let mocks: ReturnType<typeof installResizeMocks>;
  // The clip rect spans the plot area, so its size is the drawn size.
  const plot = (id: string) => {
    const r = document.querySelector(`#${id} clipPath rect`);
    return { width: Number(r?.getAttribute('width')), height: Number(r?.getAttribute('height')) };
  };

  beforeEach(() => {
    mocks = installResizeMocks({ width: 400, height: 200 });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('redraws at the new size when the container resizes', () => {
    render(
      <BarChart id='bar-resize' data={data} x={x} y={y} margin={margin} padding={padding} style={{ width: '100%', height: '100%' }} />
    );
    expect(plot('bar-resize')).toEqual({ width: 320, height: 120 });
    mocks.resize(800, 300);
    expect(plot('bar-resize')).toEqual({ width: 720, height: 220 });
    expect(document.getElementById('bar-resize')?.innerHTML).not.toContain('NaN');
  });

  it('does not redraw for an unchanged or sub-pixel size', () => {
    render(<BarChart id='bar-same-size' data={data} x={x} y={y} margin={margin} padding={padding} />);
    const g = document.querySelector('#bar-same-size g');
    mocks.resize(400, 200);
    mocks.resize(400.4, 200.5);
    expect(document.querySelector('#bar-same-size g')).toBe(g);
  });

  it('redraws on a px style change where there is no ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    mocks.setBox(0, 0);
    const { rerender } = render(
      <BarChart id='bar-style' data={data} x={x} y={y} margin={margin} padding={padding} style={{ width: '400px', height: '200px' }} />
    );
    expect(plot('bar-style')).toEqual({ width: 320, height: 120 });
    rerender(
      <BarChart id='bar-style' data={data} x={x} y={y} margin={margin} padding={padding} style={{ width: '500px', height: '260px' }} />
    );
    expect(plot('bar-style')).toEqual({ width: 420, height: 180 });
  });
});
