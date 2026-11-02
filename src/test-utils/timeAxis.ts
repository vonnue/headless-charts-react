// Test-only helpers for time-axis chart tests (not exported from the package).
import { expect } from 'vitest';

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Five consecutive UTC days, 1-5 Jan 2025, as epoch ms. */
export const PINNED_DAYS = [1, 2, 3, 4, 5].map((d) => Date.UTC(2025, 0, d));

/** `YYYY-MM-DD` for an epoch-ms day. */
export const isoDay = (t: number) => new Date(t).toISOString().slice(0, 10);

/**
 * Pixel x of each rendered x-axis tick, keyed by the tick's date (epoch ms).
 * Read from the tick `<g>` transform and d3's bound datum; d3-axis adds a
 * 0.5px crisp-edge offset, which is removed.
 */
export const tickXsByDate = (container: HTMLElement): Map<number, number> =>
  new Map(
    Array.from(container.querySelectorAll('.axis--x .tick')).map((t) => [
      (t as unknown as { __data__: Date }).__data__.getTime(),
      Number(/translate\(([-\d.]+)/.exec(t.getAttribute('transform') || '')![1]) - 0.5,
    ])
  );

export interface Mark {
  left: number;
  width: number;
}

/** Left edge and width of every element matching `selector`. */
export const marksOf = (container: HTMLElement, selector = 'rect'): Mark[] =>
  Array.from(container.querySelectorAll(selector)).map((r) => ({
    left: Number(r.getAttribute('x')),
    width: Number(r.getAttribute('width')),
  }));

/**
 * `x.start`/`x.end` pinned half a day outside PINNED_DAYS: five 1-day slots
 * across the range, each mark 80% of a slot, centred on its own tick, with
 * nothing outside the plot.
 */
export const expectPinnedHalfStepOutside = (
  container: HTMLElement,
  selector: string,
  [rangeStart, rangeEnd]: [number, number]
): void => {
  const slot = (rangeEnd - rangeStart) / PINNED_DAYS.length;
  const marks = marksOf(container, selector);
  expect(marks).toHaveLength(PINNED_DAYS.length);
  const ticks = tickXsByDate(container);
  marks.forEach((m, i) => {
    expect(m.width).toBeCloseTo(slot * 0.8, 6);
    const centre = m.left + m.width / 2;
    expect(centre).toBeCloseTo(rangeStart + slot / 2 + slot * i, 6);
    const tick = ticks.get(PINNED_DAYS[i]);
    expect(tick).toBeDefined();
    expect(Math.abs(centre - tick!)).toBeLessThanOrEqual(1);
  });
  expect(Math.min(...marks.map((m) => m.left))).toBeGreaterThanOrEqual(rangeStart - 1e-6);
  expect(Math.max(...marks.map((m) => m.left + m.width))).toBeLessThanOrEqual(rangeEnd + 1e-6);
};

/**
 * `x.start`/`x.end` pinned on the first and last of PINNED_DAYS: four steps
 * span the range, marks are 80% of a step and centred on their dates (so the
 * edge marks overhang by half a mark, as documented).
 */
export const expectPinnedOnDataEnds = (
  container: HTMLElement,
  selector: string,
  [rangeStart, rangeEnd]: [number, number]
): void => {
  const spacing = (rangeEnd - rangeStart) / (PINNED_DAYS.length - 1);
  const marks = marksOf(container, selector);
  expect(marks).toHaveLength(PINNED_DAYS.length);
  marks.forEach((m, i) => {
    expect(m.width).toBeCloseTo(spacing * 0.8, 6);
    expect(m.left + m.width / 2).toBeCloseTo(rangeStart + spacing * i, 6);
  });
};
