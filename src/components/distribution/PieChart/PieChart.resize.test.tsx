import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import PieChart from '.';
import data from './sample.json';
import { installResizeMocks } from '@/test-utils/resizeObserver';

// #53: PieChart redraws when its svg's layout box changes, not only when
// style.width/height do.
describe('PieChart resize (useChartSize)', () => {
  const args = { data, nameKey: 'name', valueKey: 'Y2022', style: { width: '100%', height: '100%' } };
  let mocks: ReturnType<typeof installResizeMocks>;
  const centre = (id: string) =>
    document.querySelector(`#${id} g[transform]`)?.getAttribute('transform');

  beforeEach(() => {
    mocks = installResizeMocks({ width: 400, height: 200 });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('redraws at the new size when the container resizes', () => {
    render(<PieChart {...args} id='pie-resize' />);
    expect(centre('pie-resize')).toBe('translate(200,100)');
    const before = document.querySelector('#pie-resize path')?.getAttribute('d');

    mocks.resize(800, 400);

    expect(centre('pie-resize')).toBe('translate(400,200)');
    expect(document.querySelector('#pie-resize path')?.getAttribute('d')).not.toBe(before);
    expect(document.getElementById('pie-resize')?.innerHTML).not.toContain('NaN');
  });

  it('does not redraw for an unchanged or sub-pixel size', () => {
    render(<PieChart {...args} id='pie-same-size' />);
    const g = document.querySelector('#pie-same-size g');
    mocks.resize(400, 200);
    mocks.resize(400.5, 199.6);
    expect(document.querySelector('#pie-same-size g')).toBe(g);
  });

  it('draws once on mount, so the entry animation is not restarted', async () => {
    const svgs: Element[] = [];
    const observer = new MutationObserver((records) =>
      records.forEach((r) => r.addedNodes.forEach((n) => n.nodeName === 'g' && svgs.push(n as Element)))
    );
    observer.observe(document.body, { childList: true, subtree: true });
    render(<PieChart {...args} id='pie-once' drawing={{ duration: 500 }} />);
    await Promise.resolve();
    observer.disconnect();
    // A redraw would leave the first top-level g detached and add a second.
    const topLevel = svgs.filter((g) => g.parentElement?.id === 'pie-once' || !g.parentElement);
    expect(topLevel).toHaveLength(1);
  });

  it('coalesces a burst of observer callbacks into one redraw', () => {
    render(<PieChart {...args} id='pie-burst' />);
    mocks.setBox(600, 300);
    mocks.triggerAll();
    mocks.triggerAll();
    mocks.triggerAll();
    expect(mocks.raf).toHaveBeenCalledTimes(1);
    expect(centre('pie-burst')).toBe('translate(200,100)');
    mocks.flushFrames();
    expect(centre('pie-burst')).toBe('translate(300,150)');
  });

  it('still redraws on a data change at the measured size', () => {
    const { rerender } = render(<PieChart {...args} id='pie-data' />);
    mocks.resize(600, 300);
    const next = data.map((d) => ({ ...d, Y2022: d.Y2022 * 2 + 1 }));
    rerender(<PieChart {...args} id='pie-data' data={next} />);
    expect(centre('pie-data')).toBe('translate(300,150)');
  });
});
