/**
 * LineChart: extra coverage from review 1 of #9 (F2, F3, F4).
 *
 * - x.key, showGuideLines and y-axis label changes after mount redraw to match
 *   a fresh mount of the same props (oracle: whole svg markup, ids normalised).
 * - Toggling tooltip/zooming off removes the listeners bound to the svg itself,
 *   so wheel events are no longer cancelled.
 * - A drawing change after mount redraws to match a fresh mount, and running
 *   draw transitions are interrupted on redraw and on unmount.
 *   (jsdom has no SVG geometry, so getTotalLength is stubbed for these.)
 * - Inline config literals stay bounded (no render loop) and leave exactly one
 *   tooltip element, removed on unmount.
 */
import { useState } from 'react';
import { select } from 'd3-selection';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import LineChart from '.';

const S = { width: '400px', height: '200px' };
const DATA = [
  { year: 2020, t: 3, a: 1, b: 2 },
  { year: 2021, t: 1, a: 3, b: 4 },
  { year: 2022, t: 2, a: 5, b: 1 },
];
const X_YEAR = { key: 'year' };
const X_T = { key: 't' };
const Y_AB = [{ key: 'a' }, { key: 'b', axis: { location: 'right' as const } }];
const TIP = {};
const ZOOM = { enabled: true };
const DRAW = { duration: 200 };

type LineProps = Parameters<typeof LineChart>[0];

const markup = (id: string): string =>
  (document.getElementById(id)?.innerHTML ?? '').split(id).join('ID');

const oracle = (props: LineProps): string => {
  const id = `${props.id}-oracle`;
  render(<LineChart {...props} id={id} />);
  return markup(id);
};

const svgListener = (id: string, type: string) =>
  select(document.getElementById(id) as Element).on(type);

// d3-zoom cancels a zoom-in wheel event while zoom is bound (deltaY +100 at the
// minimum scale returns early, so it would prove nothing).
const wheelPrevented = (id: string): boolean => {
  const ev = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -100 });
  document.getElementById(id)!.dispatchEvent(ev);
  return ev.defaultPrevented;
};

// d3-transition keeps its schedule on the node; interrupt() deletes it.
const hasTransition = (node: Element | null): boolean =>
  node !== null && '__transition' in node;

type WithLength = { getTotalLength?: () => number };
const svgProto = SVGElement.prototype as unknown as WithLength;

describe('LineChart redraw (review follow-ups)', () => {
  beforeEach(() => {
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
  });

  it('L16: redraws when x.key changes', () => {
    const base = { id: 'l16', data: DATA, y: Y_AB, style: S };
    const { rerender } = render(<LineChart {...base} x={X_YEAR} />);
    const before = markup('l16');
    rerender(<LineChart {...base} x={X_T} />);
    expect(markup('l16')).not.toBe(before);
    expect(markup('l16')).toBe(oracle({ ...base, x: X_T }));
  });

  it('L17: redraws when showGuideLines and the y-axis labels change', () => {
    const base = { id: 'l17', data: DATA, x: X_YEAR, y: Y_AB, style: S };
    const { rerender } = render(<LineChart {...base} />);
    const before = markup('l17');
    const next = { ...base, showGuideLines: true, yLeftLabel: 'Left', yRightLabel: 'Right' };
    rerender(<LineChart {...next} />);
    expect(markup('l17')).not.toBe(before);
    expect(markup('l17')).toBe(oracle(next));
    expect(document.getElementById('l17')?.textContent).toContain('Left');
    expect(document.getElementById('l17')?.textContent).toContain('Right');
  });

  it('L18: removes the svg tooltip and zoom listeners when they are turned off', () => {
    const base = { id: 'l18', data: DATA, x: X_YEAR, y: Y_AB, style: S };
    const { rerender } = render(<LineChart {...base} tooltip={TIP} zooming={ZOOM} />);
    expect(svgListener('l18', 'mousemove')).toBeTypeOf('function');
    expect(svgListener('l18', 'wheel.zoom')).toBeTypeOf('function');
    expect(wheelPrevented('l18')).toBe(true);

    rerender(<LineChart {...base} />);
    expect(svgListener('l18', 'mouseover')).toBeUndefined();
    expect(svgListener('l18', 'mousemove')).toBeUndefined();
    expect(svgListener('l18', 'mouseleave')).toBeUndefined();
    expect(svgListener('l18', 'wheel.zoom')).toBeUndefined();
    expect(wheelPrevented('l18')).toBe(false); // the page scrolls again

    rerender(<LineChart {...base} zooming={ZOOM} />);
    expect(svgListener('l18', 'wheel.zoom')).toBeTypeOf('function');
  });

  describe('with draw animations', () => {
    const original = svgProto.getTotalLength;
    beforeEach(() => {
      svgProto.getTotalLength = () => 100;
    });
    afterEach(() => {
      if (original) svgProto.getTotalLength = original;
      else delete svgProto.getTotalLength;
    });

    it('L19: redraws when drawing changes', () => {
      const base = { id: 'l19', data: DATA, x: X_YEAR, y: Y_AB, style: S };
      const { rerender } = render(<LineChart {...base} />);
      expect(markup('l19')).not.toContain('stroke-dasharray');
      rerender(<LineChart {...base} drawing={DRAW} />);
      expect(markup('l19')).toContain('stroke-dasharray');
      expect(markup('l19')).toBe(oracle({ ...base, drawing: DRAW }));
    });

    it('L21: interrupts running draw transitions on redraw and on unmount', () => {
      const base = { id: 'l21', x: X_YEAR, y: Y_AB, style: S, drawing: DRAW };
      const { rerender, unmount } = render(<LineChart {...base} data={DATA} />);
      const first = document.querySelector('#l21 .left-series');
      expect(hasTransition(first)).toBe(true);

      rerender(<LineChart {...base} data={[...DATA, { year: 2023, t: 4, a: 2, b: 3 }]} />);
      const second = document.querySelector('#l21 .left-series');
      expect(second).not.toBe(first);
      expect(hasTransition(first)).toBe(false);
      expect(hasTransition(second)).toBe(true);

      unmount();
      expect(hasTransition(second)).toBe(false);
    });
  });

  it('L20: inline literals stay bounded and leave one tooltip element', () => {
    let renders = 0;
    const Host = () => {
      const [, bump] = useState(0);
      renders++;
      return (
        <>
          <button onClick={() => bump((n) => n + 1)}>bump</button>
          <LineChart
            id='l20'
            data={DATA}
            x={{ key: 'year' }}
            y={[{ key: 'a' }]}
            tooltip={{}}
            margin={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={S}
          />
        </>
      );
    };
    const { unmount } = render(<Host />);
    for (let i = 0; i < 5; i++) fireEvent.click(screen.getByText('bump'));
    expect(renders).toBe(6);
    expect(document.querySelectorAll('[id="tooltip-l20"]')).toHaveLength(1);
    expect(document.querySelectorAll('#l20 .left-series')).toHaveLength(1);
    unmount();
    expect(document.querySelectorAll('[id="tooltip-l20"]')).toHaveLength(0);
  });
});
