import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import BarChart from '.';
import data from './sample.json';

describe('BarChart', () => {
  const x = [
      {
        key: 'reading',
        className: 'text-red-500',
      },
      { key: 'value', className: 'text-blue-500' },
    ],
    y = { key: 'name' };
  it('renders Simple bar chart', () => {
    render(<BarChart id='bar-chart' data={data} x={x} y={y} />);
    //screen.debug();

    expect(screen).toBeTruthy();
  });

  it('renders Styled Grouped bar chart', () => {
    const padding = {
        top: 20,
        right: 20,
        bottom: 20,
        left: 5,
        bar: 0.1,
      },
      margin = {
        top: 0,
        right: 40,
        bottom: 20,
        left: 40,
      };
    render(
      <BarChart
        id='bar-chart'
        data={data}
        x={x}
        y={y}
        className='bg-red-500'
        padding={padding}
        margin={margin}
      />
    );
    // screen.debug();

    const xAxisTransform = parseInt(
      screen
        .getByTestId('x-axis')
        ?.getAttribute('transform')
        ?.split(',')[1]
        .replace(')', '') || '0'
    );

    const svg = screen.getByTestId('bar-chart');

    expect(svg).toHaveClass('bg-red-500');
    expect(xAxisTransform).toEqual(-margin.bottom);
  });
  it('direction left', () => {
    render(
      <BarChart id='bar-chart' data={data} x={x} y={y} direction='left' />
    );

    // yAxisTransform will be of the type translate(40,0). Extract 40 from it and convert to int
    const yAxisTransform = parseInt(
      screen
        .getByTestId('y-axis')
        ?.getAttribute('transform')
        ?.split(',')[0]
        .split('(')[1] || '0'
    );
    expect(yAxisTransform).toEqual(-40);
  });

  it('BUG: a diverging series without explicit start/end should not clip its domain to zero', () => {
    // `column.start || 0` in index.tsx treats "no start given" the same as
    // "start explicitly 0", so the x-domain's lower bound collapses to 0
    // whenever `start` is omitted — clipping negative bars regardless of the
    // real data minimum. `column.end || maxX` does not have this problem
    // because its fallback (`maxX`) is already the correct default; `start`
    // needs the equivalent fallback to `minX` (or a symmetric pin) instead
    // of a hardcoded 0. See BarChart's own catalog docs / diverging story,
    // which only render correctly today because they set `start`/`end`
    // explicitly.
    const divergingX = [
        { key: 'delta', className: 'text-green-500', classNameNegative: 'text-red-500' },
      ],
      divergingY = { key: 'year' },
      divergingData = [
        { year: 2020, delta: -5 },
        { year: 2021, delta: 8 },
      ];

    const { container } = render(
      <BarChart
        id='bar-chart-diverging-domain'
        data={divergingData}
        x={divergingX}
        y={divergingY}
      />
    );

    const tickValues = Array.from(
      container.querySelectorAll('[data-testid="x-axis"] .tick text')
    ).map((node) =>
      Number(node.textContent?.replace(/,/g, '').replace(/−/, '-'))
    );

    expect(tickValues.some((v) => v < 0)).toBe(true);
  });

  it('Expect labels to be rendered', () => {
    render(
      <BarChart
        id='bar-chart'
        data={data}
        x={x}
        y={y}
        dataLabel={{
          className: 'text-red-500',
        }}
      />
    );

    const labels = screen.getAllByTestId('label');
    expect(labels.length).toEqual(data.length * x.length);
  });
});

/**
 * Tooltip lifecycle inside BarChart (spec: specs/issue-8.md, C1–C4, C7–C9)
 *
 * Happy path:  one `#tooltip-<id>` while mounted, populated on hover.
 * Re-render:   stable props (C1) and default, unstable margin (C2) keep one.
 * Hover after re-render (C3) and under StrictMode (C4) still show content.
 * Teardown:    unmount removes it (C7); two charts stay independent (C8).
 * SSR:         renderToString writes nothing to document.body (C9).
 */
const S = { width: '400px', height: '200px' };
const TIP_DATA = [
  { n: 'x', v: 3 },
  { n: 'y', v: 5 },
];
const TIP_X = [{ key: 'v' }];
const TIP_Y = { key: 'n' };
const M = { top: 10, right: 10, bottom: 20, left: 20 };
const P = { top: 0, right: 0, bottom: 0, left: 0, bar: 0.1 };
const DRAWING = {};
const TIP = {};
const count = (id: string): number => document.querySelectorAll(`[id="tooltip-${id}"]`).length;
const tooltipOf = (id: string): HTMLElement | null => document.getElementById(`tooltip-${id}`);
const lastRect = (id: string): Element => {
  const rects = document.querySelectorAll(`#${id} .marks rect`);
  const rect = rects[rects.length - 1];
  if (!rect) throw new Error(`no rect in #${id}`);
  return rect;
};

describe('BarChart tooltip lifecycle', () => {
  beforeEach(() => {
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
  });

  it('C1: keeps one tooltip after 5 className-only rerenders with stable props', () => {
    const props = { id: 'c1', data: TIP_DATA, x: TIP_X, y: TIP_Y, margin: M, padding: P, drawing: DRAWING, tooltip: TIP, style: S };
    const { rerender } = render(<BarChart {...props} />);

    for (let i = 0; i < 5; i++) rerender(<BarChart {...props} className={`c${i}`} />);

    expect(count('c1')).toBe(1);
  });

  it('C2: keeps one tooltip after 3 rerenders with the default (unstable) margin', () => {
    const props = { id: 'c2', data: TIP_DATA, x: TIP_X, y: TIP_Y, tooltip: TIP, style: S };
    const { rerender } = render(<BarChart {...props} />);

    for (let i = 0; i < 3; i++) rerender(<BarChart {...props} className={`c${i}`} />);

    expect(count('c2')).toBe(1);
  });

  it('C3: shows the hovered bar after a rerender', () => {
    const props = { id: 'c3', data: TIP_DATA, x: TIP_X, y: TIP_Y, tooltip: TIP, style: S };
    const { rerender } = render(<BarChart {...props} />);
    for (let i = 0; i < 3; i++) rerender(<BarChart {...props} className={`c${i}`} />);

    fireEvent.mouseEnter(lastRect('c3'), { clientX: 10, clientY: 10 });

    expect(count('c3')).toBe(1);
    expect(tooltipOf('c3')?.className).toContain('opacity-100');
    expect(tooltipOf('c3')?.innerHTML).toContain('n: y');
  });

  it('C4: shows one populated tooltip on hover under StrictMode', () => {
    render(
      <StrictMode>
        <BarChart id='c4' data={TIP_DATA} x={TIP_X} y={TIP_Y} tooltip={TIP} style={S} />
      </StrictMode>
    );

    fireEvent.mouseEnter(lastRect('c4'), { clientX: 10, clientY: 10 });

    expect(count('c4')).toBe(1);
    expect(tooltipOf('c4')?.innerHTML).toContain('n: y');
  });

  it('C7: removes its tooltip on unmount', () => {
    const { unmount } = render(<BarChart id='c7' data={TIP_DATA} x={TIP_X} y={TIP_Y} tooltip={TIP} style={S} />);

    unmount();

    expect(count('c7')).toBe(0);
  });

  it('C8: keeps one tooltip per chart across rerenders and removes only the unmounted one', () => {
    const tree = (withA: boolean, cls: string) => (
      <>
        {withA && <BarChart id='b-a' className={cls} data={TIP_DATA} x={TIP_X} y={TIP_Y} tooltip={TIP} style={S} />}
        <BarChart id='b-b' className={cls} data={TIP_DATA} x={TIP_X} y={TIP_Y} tooltip={TIP} style={S} />
      </>
    );
    const { rerender } = render(tree(true, 'c-1'));
    const counts: Array<{ a: number; b: number }> = [];
    for (let i = 0; i < 3; i++) {
      rerender(tree(true, `c${i}`));
      counts.push({ a: count('b-a'), b: count('b-b') });
    }

    rerender(tree(false, 'c-last'));

    expect(counts).toStrictEqual([{ a: 1, b: 1 }, { a: 1, b: 1 }, { a: 1, b: 1 }]);
    expect({ a: count('b-a'), b: count('b-b') }).toStrictEqual({ a: 0, b: 1 });
  });

  it('C9: writes no tooltip to document.body during a server render', () => {
    const ssr = () => renderToString(<BarChart id='ssr' data={TIP_DATA} x={TIP_X} y={TIP_Y} tooltip={TIP} style={S} />);

    expect(ssr).not.toThrow();
    expect(count('ssr')).toBe(0);
  });
});
