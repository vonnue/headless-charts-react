/**
 * AreaChart: extra coverage from review 1 of #9 (F2, F4).
 *
 * - An x.key change after mount redraws to match a fresh mount.
 * - Toggling zooming off removes the zoom listeners bound to the svg itself,
 *   so wheel events are no longer cancelled.
 * - Inline config literals stay bounded (no render loop) and leave exactly one
 *   tooltip element, removed on unmount.
 */
import { useState } from 'react';
import { select } from 'd3-selection';
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import AreaChart from '.';

const S = { width: '400px', height: '200px' };
const DATA = [
  { year: 2020, t: 3, a: 1, b: 2 },
  { year: 2021, t: 1, a: 3, b: 4 },
  { year: 2022, t: 2, a: 5, b: 1 },
];
const X_YEAR = { key: 'year' };
const X_T = { key: 't' };
const Y_AB = [{ key: 'a' }, { key: 'b' }];
const ZOOM = { enabled: true };

type AreaProps = Parameters<typeof AreaChart>[0];

const markup = (id: string): string =>
  (document.getElementById(id)?.innerHTML ?? '').split(id).join('ID');

const oracle = (props: AreaProps): string => {
  const id = `${props.id}-oracle`;
  render(<AreaChart {...props} id={id} />);
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

describe('AreaChart redraw (review follow-ups)', () => {
  beforeEach(() => {
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
  });

  it('A11: redraws when x.key changes', () => {
    const base = { id: 'a11', data: DATA, y: Y_AB, style: S };
    const { rerender } = render(<AreaChart {...base} x={X_YEAR} />);
    const before = markup('a11');
    rerender(<AreaChart {...base} x={X_T} />);
    expect(markup('a11')).not.toBe(before);
    expect(markup('a11')).toBe(oracle({ ...base, x: X_T }));
  });

  it('A12: removes the svg zoom listeners when zooming is turned off', () => {
    const base = { id: 'a12', data: DATA, x: X_YEAR, y: Y_AB, style: S };
    const { rerender } = render(<AreaChart {...base} zooming={ZOOM} />);
    expect(svgListener('a12', 'wheel.zoom')).toBeTypeOf('function');
    expect(wheelPrevented('a12')).toBe(true);
    rerender(<AreaChart {...base} />);
    expect(svgListener('a12', 'wheel.zoom')).toBeUndefined();
    expect(svgListener('a12', 'mousedown.zoom')).toBeUndefined();
    expect(wheelPrevented('a12')).toBe(false); // the page scrolls again
  });

  it('A13: inline literals stay bounded and leave one tooltip element', () => {
    let renders = 0;
    const Host = () => {
      const [, bump] = useState(0);
      renders++;
      return (
        <>
          <button onClick={() => bump((n) => n + 1)}>bump</button>
          <AreaChart
            id='a13'
            data={DATA}
            x={{ key: 'year' }}
            y={[{ key: 'a' }, { key: 'b' }]}
            tooltip={{}}
            margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
            style={S}
          />
        </>
      );
    };
    const { unmount } = render(<Host />);
    for (let i = 0; i < 5; i++) fireEvent.click(screen.getByText('bump'));
    expect(renders).toBe(6);
    expect(document.querySelectorAll('[id="tooltip-a13"]')).toHaveLength(1);
    unmount();
    expect(document.querySelectorAll('[id="tooltip-a13"]')).toHaveLength(0);
  });
});
