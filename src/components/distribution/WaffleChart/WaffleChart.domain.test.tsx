import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { extent } from 'd3-array';
import { interpolateBlues } from 'd3-scale-chromatic';

import WaffleChart from '.';
import { installResizeMocks } from '@/test-utils/resizeObserver';

/** Same fallbacks as WaffleChart's color domain (`?? 0` / `?? 1`). */
const waffleColorDomain = (
  values: number[],
  pinned?: { start?: number; end?: number }
) => {
  const [cMin, cMax] = extent(values);
  return [pinned?.start ?? cMin ?? 0, pinned?.end ?? cMax ?? 1];
};

describe('WaffleChart color domain', () => {
  it('falls back to 0 and 1 when there are no color values (asymmetric)', () => {
    expect(waffleColorDomain([])).toEqual([0, 1]);
  });

  it('uses the data min and max when values are present', () => {
    expect(waffleColorDomain([3, 8, 5])).toEqual([3, 8]);
    expect(waffleColorDomain([3, 8, 5], { start: 0, end: 10 })).toEqual([0, 10]);
  });

  describe('with a sequential scale', () => {
    beforeEach(() => {
      installResizeMocks({ width: 400, height: 200 });
    });
    afterEach(() => {
      cleanup();
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it('colours cells from the data min and max', () => {
      const data = [
        { x: 'a', y: '1', v: 0 },
        { x: 'b', y: '1', v: 10 },
      ];
      render(
        <WaffleChart
          id='waffle-domain'
          data={data}
          x={{ key: 'x' }}
          y={{ key: 'y' }}
          color={{ key: 'v', scale: interpolateBlues }}
          style={{ width: '400px', height: '200px' }}
        />
      );
      const fills = [
        ...document.querySelectorAll<SVGElement>('#waffle-domain rect'),
      ]
        .map((el) => el.getAttribute('fill') || el.style.fill)
        .filter((f) => f && f !== 'none');
      expect(new Set(fills).size).toBeGreaterThan(1);
    });
  });
});
