import { describe, expect, it } from 'vitest';
import { render, waitFor } from '@testing-library/react';

import BarChart from './BarChart';
import ColumnChart from './ColumnChart';
import LollipopVChart from './LollipopVChart';

// #32: with a pinned start > 0 (and an end below some values), bars and stems
// start on the axis at the visible domain minimum and stay inside the plot,
// instead of starting at the off-plot 0 or running past the plot edge.

// 600x400, margin 50/50 left/right, 20/40 top/bottom, padding 0:
// plot x [50, 550], plot y [20, 360].
const style = { width: '600px', height: '400px' };
const margin = { top: 20, right: 50, bottom: 40, left: 50 };
const L = 50;
const R = 550;
const T = 20;
const B = 360;
const rows = [
  { name: 'a', v: 5 },
  { name: 'b', v: 40 },
  { name: 'c', v: 60 },
  { name: 'd', v: 120 },
];
const EPS = 1e-6;

const bars = (id: string) =>
  Array.from(document.querySelectorAll(`#${id} .marks rect`)).map((r) => ({
    x: Number(r.getAttribute('x')),
    y: Number(r.getAttribute('y')),
    width: Number(r.getAttribute('width')),
    height: Number(r.getAttribute('height')),
  }));

describe('bar and stem baselines with start > 0 (#32)', () => {
  it('BarChart bars start at the axis and stay inside the plot', () => {
    render(
      <BarChart
        id='baseline-bar'
        style={style}
        margin={margin}
        padding={{ top: 0, right: 0, bottom: 0, left: 0, bar: 0.1 }}
        data={rows}
        x={[{ key: 'v', start: 20, end: 100 }]}
        y={{ key: 'name' }}
      />
    );
    const rects = bars('baseline-bar');
    expect(rects).toHaveLength(rows.length);
    rects.forEach(({ x, width }) => {
      expect(width).toBeGreaterThanOrEqual(0);
      expect(x).toBeGreaterThanOrEqual(L - EPS);
      expect(x + width).toBeLessThanOrEqual(R + EPS);
    });
    // In-range bars start exactly on the axis: x = xFn(20) = L.
    expect(rects[1].x).toBeCloseTo(L, 6);
    expect(rects[1].width).toBeCloseTo(((40 - 20) / 80) * (R - L), 6);
    // Below start: no bar. Above end: clipped to the right edge.
    expect(rects[0].width).toBe(0);
    expect(rects[3].x + rects[3].width).toBeCloseTo(R, 6);
  });

  it('BarChart with an animated draw settles inside the plot', async () => {
    render(
      <BarChart
        id='baseline-bar-anim'
        style={style}
        margin={margin}
        padding={{ top: 0, right: 0, bottom: 0, left: 0, bar: 0.1 }}
        data={rows}
        drawing={{ duration: 10, delay: 1 }}
        x={[{ key: 'v', start: 20, end: 100 }]}
        y={{ key: 'name' }}
      />
    );
    bars('baseline-bar-anim').forEach(({ x }) => expect(x).toBeCloseTo(L, 6));
    await waitFor(
      () => {
        const rects = bars('baseline-bar-anim');
        expect(rects[3].x + rects[3].width).toBeCloseTo(R, 6);
        rects.forEach(({ x, width }) => {
          expect(x).toBeGreaterThanOrEqual(L - EPS);
          expect(x + width).toBeLessThanOrEqual(R + EPS);
        });
      },
      { timeout: 2000, interval: 25 }
    );
  });

  it('ColumnChart columns stay inside the plot', () => {
    render(
      <ColumnChart
        id='baseline-col'
        style={style}
        margin={margin}
        padding={{ top: 0, right: 0, bottom: 0, left: 0 }}
        data={rows}
        x={{ key: 'name' }}
        y={[{ key: 'v', start: 20, end: 100 }]}
      />
    );
    const rects = bars('baseline-col');
    expect(rects).toHaveLength(rows.length);
    rects.forEach(({ y, height }) => {
      expect(height).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(T - EPS);
      expect(y + height).toBeLessThanOrEqual(B + EPS);
    });
    // Above end: the column is cut at the top of the plot, not at y < 0.
    expect(rects[3].y).toBeCloseTo(T, 6);
    expect(rects[3].y + rects[3].height).toBeCloseTo(B, 6);
  });

  it('LollipopVChart stems run from the axis and never below it', async () => {
    render(
      <LollipopVChart
        id='baseline-lollipop'
        style={style}
        margin={margin}
        data={rows.map((d) => ({ ...d }))}
        shape='circle'
        x={{ key: 'name' }}
        y={{ key: 'v', start: 20, end: 100 }}
      />
    );
    const stems = () =>
      Array.from(document.querySelectorAll('#baseline-lollipop line.line')).map((l) => ({
        y1: Number(l.getAttribute('y1')),
        y2: Number(l.getAttribute('y2')),
      }));
    expect(stems()).toHaveLength(rows.length);
    await waitFor(
      () => {
        // Sorted descending: v=120 first, v=5 last. Wait for the draw-in.
        expect(stems()[0].y1).toBeCloseTo(T, 6);
      },
      { timeout: 4000, interval: 50 }
    );
    stems().forEach(({ y1, y2 }) => {
      expect(y2).toBeCloseTo(B, 6);
      expect(y1).toBeGreaterThanOrEqual(T - EPS);
      expect(y1).toBeLessThanOrEqual(B + EPS);
    });
  });
});
