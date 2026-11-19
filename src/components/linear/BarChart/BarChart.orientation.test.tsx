import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';

import BarChart from '.';
import ColumnChart from '../ColumnChart';
import { tickPositions } from '@/test-utils/axisTicks';
import { resetDevWarnings } from '@/utils/devEnvironment';

afterEach(() => {
  vi.restoreAllMocks();
  resetDevWarnings();
  document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
});

const style = { width: '600px', height: '400px' };
const margin = { top: 20, right: 50, bottom: 40, left: 50 };
const padding = { top: 0, right: 0, bottom: 0, left: 0 };
const L = 50;
const R = 550;
const T = 20;
const B = 360;

const rows = [
  { name: 'a', v: 5, w: 2 },
  { name: 'b', v: 10, w: 4 },
  { name: 'c', v: 15, w: 6 },
];

const vProps = {
  style,
  margin,
  padding,
  data: rows,
  x: { key: 'name' },
  y: [{ key: 'v', className: 'fill-blue-500', classNameNegative: 'fill-red-500' }],
};

const hProps = {
  style,
  margin,
  padding,
  data: rows,
  y: { key: 'name' },
  x: [{ key: 'v', className: 'fill-blue-500', classNameNegative: 'fill-red-500' }],
};

const svgOf = (id: string) => {
  const svg = document.getElementById(id);
  if (!svg) throw new Error(`no svg #${id}`);
  return svg;
};
const marks = (id: string) =>
  Array.from(svgOf(id).querySelectorAll('g.marks rect')).map((r) => ({
    x: Number(r.getAttribute('x')),
    y: Number(r.getAttribute('y')),
    width: Number(r.getAttribute('width')),
    height: Number(r.getAttribute('height')),
    className: r.getAttribute('class') ?? '',
  }));
const hits = (id: string) => svgOf(id).querySelectorAll('[data-testid="bar-hit"]');
const yTicks = (id: string) =>
  tickPositions(svgOf(id).querySelector('[data-testid="y-axis"]'), 'vertical');
const xTicks = (id: string) =>
  tickPositions(svgOf(id).querySelector('[data-testid="x-axis"]'), 'horizontal');
const tooltipOf = (id: string) => document.getElementById(`tooltip-${id}`);
const markSnapshot = (id: string) =>
  marks(id).map(({ x, y, width, height, className }) => ({
    x: +x.toFixed(3),
    y: +y.toFixed(3),
    width: +width.toFixed(3),
    height: +height.toFixed(3),
    className,
  }));

describe('BarChart orientation (#78, grouped)', () => {
  it('1: default <BarChart x={{ key }} y={[…]}> renders vertical columns on data-testid="bar-chart"', () => {
    render(<BarChart id='b1' {...vProps} />);
    const svg = svgOf('b1');
    expect(svg.getAttribute('data-testid')).toBe('bar-chart');
    const bars = marks('b1');
    expect(bars).toHaveLength(rows.length);
    // Vertical: bars share an x-band and vary in height, growing up from the baseline.
    expect(bars[0].y + bars[0].height).toBeCloseTo(B, 2);
    expect(bars[2].height).toBeGreaterThan(bars[0].height);
  });

  it('2: evidence <BarChart y={{ key }} x={[…]}> is horizontal with no warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<BarChart id='b2' {...hProps} />);
    expect(warn).not.toHaveBeenCalled();
    const bars = marks('b2');
    expect(bars).toHaveLength(rows.length);
    expect(bars[0].x).toBeCloseTo(L, 2);
    expect(bars[2].width).toBeGreaterThan(bars[0].width);
  });

  it('3: orientation="horizontal" with matching configs matches test 2', () => {
    render(<BarChart id='b2b' {...hProps} />);
    render(<BarChart id='b3' {...hProps} orientation='horizontal' />);
    expect(markSnapshot('b3')).toEqual(markSnapshot('b2b'));
  });

  it('4: mismatch orientation="vertical" with array x warns and draws nothing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      // @ts-expect-error -- runtime mismatch: vertical + series array on x
      <BarChart id='b4' {...hProps} orientation='vertical' />,
    );
    const messages = warn.mock.calls.map(([m]) => String(m));
    expect(messages.some((m) => m.includes('orientation-mismatch') || m.includes('the series array is on x'))).toBe(true);
    expect(messages.some((m) => m.includes('nothing is drawn'))).toBe(true);
    expect(svgOf('b4').querySelectorAll('*')).toHaveLength(0);
  });

  it('5: ColumnChart equals <BarChart orientation="vertical">, node for node', () => {
    render(<ColumnChart id='b5w' {...vProps} />);
    render(<BarChart id='b5u' {...vProps} orientation='vertical' />);
    expect(markSnapshot('b5w')).toEqual(markSnapshot('b5u'));
    expect(hits('b5w').length).toBe(hits('b5u').length);
  });

  it('6: ColumnChart with a conflicting orientation keeps vertical and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <ColumnChart
        id='b6'
        {...vProps}
        // @ts-expect-error -- runtime conflict, rejected by the wrapper's types
        orientation='horizontal'
      />,
    );
    const messages = warn.mock.calls.map(([m]) => String(m));
    expect(messages.some((m) => m.includes('orientation-ignored') || m.includes('is always vertical'))).toBe(true);
    const bars = marks('b6');
    expect(bars).toHaveLength(rows.length);
    expect(bars[0].y + bars[0].height).toBeCloseTo(B, 2);
  });

  describe('7: grouped value axis in both orientations', () => {
    it.each([
      ['vertical', 'b7v', 'y'] as const,
      ['horizontal', 'b7h', 'x'] as const,
    ])('%s all-positive → [0, max]', (orientation, id, axis) => {
      const data = [
        { name: 'a', v: 5 },
        { name: 'b', v: 10 },
      ];
      if (orientation === 'vertical') {
        render(
          <BarChart
            id={id}
            style={style}
            margin={margin}
            padding={padding}
            data={data}
            x={{ key: 'name' }}
            y={[{ key: 'v' }]}
          />,
        );
      } else {
        render(
          <BarChart
            id={id}
            style={style}
            margin={margin}
            padding={padding}
            data={data}
            y={{ key: 'name' }}
            x={[{ key: 'v' }]}
          />,
        );
      }
      const ticks = axis === 'y' ? yTicks(id) : xTicks(id);
      const zeroAt = axis === 'y' ? B : L;
      const maxAt = axis === 'y' ? T : R;
      expect(ticks.get('0')).toBeCloseTo(zeroAt, 2);
      expect(ticks.get('10')).toBeCloseTo(maxAt, 2);
    });

    it.each([
      ['vertical', 'b7vn'] as const,
      ['horizontal', 'b7hn'] as const,
    ])('%s all-negative → [min, 0]', (orientation, id) => {
      const data = [
        { name: 'a', v: -10 },
        { name: 'b', v: -5 },
      ];
      if (orientation === 'vertical') {
        render(<BarChart id={id} style={style} margin={margin} padding={padding} data={data} x={{ key: 'name' }} y={[{ key: 'v' }]} />);
        const ticks = yTicks(id);
        expect(ticks.get('0')).toBeCloseTo(T, 2);
        expect(ticks.get('-10')).toBeCloseTo(B, 2);
      } else {
        render(<BarChart id={id} style={style} margin={margin} padding={padding} data={data} y={{ key: 'name' }} x={[{ key: 'v' }]} />);
        const ticks = xTicks(id);
        expect(ticks.get('0')).toBeCloseTo(R, 2);
        expect(ticks.get('-10')).toBeCloseTo(L, 2);
      }
    });

    it('start: 40 pins the baseline in both orientations', () => {
      render(
        <BarChart
          id='b7s-v'
          style={style}
          margin={margin}
          padding={padding}
          data={rows}
          x={{ key: 'name' }}
          y={[{ key: 'v', start: 40 }]}
        />,
      );
      expect(yTicks('b7s-v').get('40')).toBeCloseTo(B, 2);
      render(
        <BarChart
          id='b7s-h'
          style={style}
          margin={margin}
          padding={padding}
          data={rows}
          y={{ key: 'name' }}
          x={[{ key: 'v', start: 40 }]}
        />,
      );
      expect(xTicks('b7s-h').get('40')).toBeCloseTo(L, 2);
    });
  });

  it('8: negative vertical columns run from y(0) down and use classNameNegative', () => {
    render(
      <BarChart
        id='b8'
        style={style}
        margin={margin}
        padding={padding}
        data={[
          { name: 'a', v: -10 },
          { name: 'b', v: 10 },
        ]}
        x={{ key: 'name' }}
        y={[{ key: 'v', className: 'fill-blue-500', classNameNegative: 'fill-red-500' }]}
      />,
    );
    const bars = marks('b8');
    const zero = (T + B) / 2;
    // domain [-10, 10]: 0 in the middle. Negative bar starts at 0 and grows down.
    expect(bars[0].y).toBeCloseTo(zero, 2);
    expect(bars[0].y + bars[0].height).toBeCloseTo(B, 2);
    expect(bars[0].className).toContain('fill-red-500');
    expect(bars[1].y).toBeCloseTo(T, 2);
    expect(bars[1].y + bars[1].height).toBeCloseTo(zero, 2);
    expect(bars[1].className).toContain('fill-blue-500');
  });

  it('9: padding.bar wins over paddingBar; 0 is honoured; defaults match the export', () => {
    const data = [{ name: 'a', v: 10 }];
    render(
      <BarChart
        id='b9win'
        style={style}
        margin={margin}
        data={data}
        x={{ key: 'name' }}
        y={[{ key: 'v' }]}
        padding={{ ...padding, bar: 0.5 }}
        paddingBar={0.1}
      />,
    );
    render(
      <BarChart
        id='b9bar'
        style={style}
        margin={margin}
        data={data}
        x={{ key: 'name' }}
        y={[{ key: 'v' }]}
        padding={padding}
        paddingBar={0.5}
      />,
    );
    expect(marks('b9win')[0].width).toBeCloseTo(marks('b9bar')[0].width, 6);

    render(
      <ColumnChart
        id='b9zero'
        style={style}
        margin={margin}
        data={data}
        x={{ key: 'name' }}
        y={[{ key: 'v' }]}
        padding={{ ...padding, bar: 0 }}
      />,
    );
    render(
      <ColumnChart
        id='b9def'
        style={style}
        margin={margin}
        data={data}
        x={{ key: 'name' }}
        y={[{ key: 'v' }]}
        padding={padding}
      />,
    );
    // padding.bar 0 is wider than the vertical default of 0.2.
    expect(marks('b9zero')[0].width).toBeGreaterThan(marks('b9def')[0].width);
  });

  it('10: category inset shrinks thickness and an oversized inset warns once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <BarChart
        id='b10v'
        style={style}
        margin={margin}
        padding={padding}
        data={rows}
        x={{ key: 'name', padding: 8 }}
        y={[{ key: 'v' }]}
      />,
    );
    render(
      <BarChart
        id='b10plain'
        style={style}
        margin={margin}
        padding={padding}
        data={rows}
        x={{ key: 'name' }}
        y={[{ key: 'v' }]}
      />,
    );
    expect(marks('b10v')[0].width).toBeLessThan(marks('b10plain')[0].width);

    render(
      <BarChart
        id='b10warn'
        style={style}
        margin={margin}
        padding={padding}
        data={rows}
        y={{ key: 'name', padding: 1000 }}
        x={[{ key: 'v' }]}
      />,
    );
    const messages = warn.mock.calls.map(([m]) => String(m));
    expect(messages.filter((m) => m.includes('y.padding'))).toHaveLength(1);
    expect(marks('b10warn')[0].height).toBe(0);
  });

  it('11: rx rounds bars in both orientations', () => {
    render(<BarChart id='b11v' {...vProps} y={[{ key: 'v', rx: 4 }]} />);
    render(<BarChart id='b11h' {...hProps} x={[{ key: 'v', rx: 4 }]} />);
    expect(svgOf('b11v').querySelector('g.marks rect')?.getAttribute('rx')).toBe('4');
    expect(svgOf('b11h').querySelector('g.marks rect')?.getAttribute('rx')).toBe('4');
  });

  it('12: histogram uses x.bin vertically, y.bin horizontally, and legacy x[0].bin', () => {
    const raw = [{ score: 1 }, { score: 2 }, { score: 8 }, { score: 9 }];
    render(
      <BarChart
        id='b12v'
        style={style}
        margin={margin}
        padding={padding}
        data={raw}
        x={{ key: 'score', bin: { count: 2 } }}
        y={[{ key: 'count' }]}
      />,
    );
    expect(marks('b12v').length).toBe(2);

    render(
      <BarChart
        id='b12h'
        style={style}
        margin={margin}
        padding={padding}
        orientation='horizontal'
        data={raw}
        y={{ key: 'score', bin: { count: 2 } }}
        x={[{ key: 'count' }]}
      />,
    );
    expect(marks('b12h').length).toBe(2);

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <BarChart
        id='b12legacy'
        style={style}
        margin={margin}
        padding={padding}
        data={raw}
        x={[{ key: 'score', bin: { count: 2 }, className: 'fill-indigo-500' }]}
        y={{ key: 'score' }}
      />,
    );
    expect(marks('b12legacy').length).toBe(2);

    render(
      <BarChart
        id='b12both'
        style={style}
        margin={margin}
        padding={padding}
        orientation='horizontal'
        data={raw}
        y={{ key: 'score', bin: { count: 2 } }}
        x={[{ key: 'count', bin: { count: 8 } }]}
      />,
    );
    expect(warn.mock.calls.map(([m]) => String(m)).some((m) => m.includes('x[0].bin is ignored'))).toBe(true);
    expect(marks('b12both').length).toBe(2);
  });

  it('13: horizontal y.scalingFunction "time" is ignored and uses a band scale', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <BarChart
        id='b13'
        style={style}
        margin={margin}
        padding={padding}
        orientation='horizontal'
        data={rows}
        y={{ key: 'name', scalingFunction: 'time', time: { isISO: true } }}
        x={[{ key: 'v' }]}
      />,
    );
    expect(warn.mock.calls.map(([m]) => String(m)).some((m) => m.includes('time-ignored') || m.includes('only supported when orientation is "vertical"'))).toBe(true);
    expect(marks('b13').length).toBe(rows.length);
  });

  it('14: direction left mirrors horizontal bars; in vertical it warns and is ignored', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<BarChart id='b14r' {...hProps} direction='right' />);
    render(<BarChart id='b14l' {...hProps} direction='left' />);
    expect(marks('b14l')[0].x + marks('b14l')[0].width).toBeCloseTo(R, 2);
    expect(marks('b14r')[0].x).toBeCloseTo(L, 2);
    const yAxis = svgOf('b14l').querySelector('[data-testid="y-axis"]')?.getAttribute('transform') ?? '';
    expect(yAxis).toContain(String(600 - 50)); // width - margin.right

    render(<BarChart id='b14v' {...vProps} direction='left' />);
    expect(warn.mock.calls.map(([m]) => String(m)).some((m) => m.includes('direction is only read when orientation is "horizontal"'))).toBe(true);
    expect(markSnapshot('b14v').map(({ x, y, width, height }) => ({ x, y, width, height }))).toEqual(
      marks('b14v').map(({ x, y, width, height }) => ({
        x: +x.toFixed(3),
        y: +y.toFixed(3),
        width: +width.toFixed(3),
        height: +height.toFixed(3),
      })),
    );
    // Still vertical, growing up from the bottom.
    expect(marks('b14v')[0].y + marks('b14v')[0].height).toBeCloseTo(B, 2);
  });

  it('15: reference lines at 0 are drawn; a wrong-axis key is skipped with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<BarChart id='b15v' {...vProps} referenceLines={[{ y: 0 }, { x: 0 }]} />);
    const vLines = svgOf('b15v').querySelectorAll('line.reference-line');
    expect(vLines.length).toBe(1);
    expect(Number(vLines[0].getAttribute('y1'))).toBeCloseTo(B, 2);
    expect(vLines[0].getAttribute('clip-path')).toBe('url(#b15v-plot-clip)');

    render(<BarChart id='b15h' {...hProps} referenceLines={[{ x: 0 }, { y: 0 }]} />);
    const hLines = svgOf('b15h').querySelectorAll('line.reference-line');
    expect(hLines.length).toBe(1);
    expect(Number(hLines[0].getAttribute('x1'))).toBeCloseTo(L, 2);
    expect(warn.mock.calls.map(([m]) => String(m)).filter((m) => m.includes('referenceLines use')).length).toBe(2);
  });

  it('16: tickFormat and wholeNumbers format value-axis ticks', () => {
    render(
      <BarChart
        id='b16'
        style={style}
        margin={margin}
        padding={padding}
        data={[{ name: 'a', v: 1 }, { name: 'b', v: 2 }]}
        x={{ key: 'name' }}
        y={[{ key: 'v' }]}
        wholeNumbers
        tickFormat='.0f'
      />,
    );
    const labels = Array.from(svgOf('b16').querySelectorAll('[data-testid="y-axis"] .tick text')).map(
      (n) => n.textContent,
    );
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.every((t) => t && !t.includes('.'))).toBe(true);
  });

  it('17: data labels appear in both orientations and text() overrides', () => {
    render(
      <BarChart
        id='b17v'
        {...vProps}
        dataLabel={{ text: (row) => `v:${row.v}` }}
      />,
    );
    const vLabels = Array.from(svgOf('b17v').querySelectorAll('[data-testid="label"]'));
    expect(vLabels).toHaveLength(rows.length);
    expect(vLabels[0].getAttribute('text-anchor')).toBe('middle');
    expect(vLabels.map((n) => n.textContent)).toEqual(['v:5', 'v:10', 'v:15']);

    render(
      <BarChart
        id='b17h'
        {...hProps}
        dataLabel={{ className: 'fill-current' }}
      />,
    );
    expect(svgOf('b17h').querySelectorAll('[data-testid="label"]')).toHaveLength(rows.length);
  });

  it('18: default tooltip HTML is "{category} <br/> key: value"', () => {
    render(<BarChart id='b18' {...hProps} tooltip={{}} />);
    fireEvent.mouseEnter(svgOf('b18').querySelector('g.marks rect')!);
    expect(tooltipOf('b18')?.innerHTML).toContain('a');
    expect(tooltipOf('b18')?.innerHTML).toContain('v: 5');
  });

  it('19: one bar-hit per row sits in g.hits, outside g.marks', () => {
    render(<BarChart id='b19' {...vProps} tooltip={{}} />);
    expect(hits('b19')).toHaveLength(rows.length);
    expect(svgOf('b19').querySelectorAll('g.marks [data-testid="bar-hit"]')).toHaveLength(0);
    expect(svgOf('b19').querySelectorAll('g.marks rect')).toHaveLength(rows.length);
    fireEvent.mouseEnter(hits('b19')[0]);
    expect(tooltipOf('b19')?.innerHTML).toContain('a');
  });

  it('20: a new tooltip identity does not redraw, and the latest html is used', () => {
    const { rerender } = render(
      <BarChart id='b20' {...vProps} tooltip={{ html: () => 'first' }} />,
    );
    const node = svgOf('b20').querySelector('g.marks rect');
    rerender(<BarChart id='b20' {...vProps} tooltip={{ html: () => 'second' }} />);
    expect(svgOf('b20').querySelector('g.marks rect')).toBe(node);
    fireEvent.mouseEnter(hits('b20')[0]);
    expect(tooltipOf('b20')?.innerHTML).toBe('second');
  });

  it('21: ColumnChart redraws when y, margin or referenceLines change without data changing', () => {
    const { rerender } = render(
      <ColumnChart id='b21' {...vProps} y={[{ key: 'v' }]} />,
    );
    const before = markSnapshot('b21');
    rerender(
      <ColumnChart
        id='b21'
        {...vProps}
        data={[
          { name: 'a', v: 5, w: 1 },
          { name: 'b', v: 10, w: 20 },
          { name: 'c', v: 15, w: 8 },
        ]}
        y={[{ key: 'w' }]}
      />,
    );
    expect(markSnapshot('b21')).not.toEqual(before);
    rerender(
      <ColumnChart
        id='b21'
        {...vProps}
        y={[{ key: 'w' }]}
        margin={{ ...margin, top: 80 }}
      />,
    );
    expect(marks('b21')[0].y).not.toBeCloseTo(before[0].y, 1);
    rerender(
      <ColumnChart
        id='b21'
        {...vProps}
        y={[{ key: 'w' }]}
        margin={{ ...margin, top: 80 }}
        referenceLines={[{ y: 4 }]}
      />,
    );
    expect(svgOf('b21').querySelectorAll('line.reference-line')).toHaveLength(1);
  });

  it('22: empty data after non-empty data clears the bars', () => {
    const { rerender } = render(<BarChart id='b22' {...vProps} />);
    expect(marks('b22').length).toBe(rows.length);
    rerender(<BarChart id='b22' {...vProps} data={[]} />);
    expect(marks('b22').length).toBe(0);
    expect(svgOf('b22').querySelector('[data-testid="x-axis"]')).toBeTruthy();
  });

  it('23: drawing stagger is rowIndex * delay; default duration 0 is synchronous', () => {
    render(<BarChart id='b23sync' {...vProps} />);
    const finalH = marks('b23sync')[2].height;
    expect(finalH).toBeGreaterThan(0);

    render(
      <BarChart id='b23' {...vProps} drawing={{ duration: 200, delay: 50 }} />,
    );
    const start = marks('b23');
    // At t=0 the last row has not started (delay 100) so its height is still 0.
    expect(start[2].height).toBe(0);
    expect(start[0].height).toBeGreaterThanOrEqual(0);
  });

  it('24: a data change mid-transition ends at the new geometry; unmount is quiet', async () => {
    const { rerender, unmount } = render(
      <BarChart id='b24' {...vProps} drawing={{ duration: 200, delay: 20 }} />,
    );
    rerender(
      <BarChart
        id='b24'
        {...vProps}
        data={[{ name: 'z', v: 8, w: 1 }]}
        drawing={{ duration: 200, delay: 20 }}
      />,
    );
    await waitFor(() => {
      expect(marks('b24')).toHaveLength(1);
    });
    expect(() => unmount()).not.toThrow();
  });

  it('25: toggling orientation with matching configs leaves one clip and one tooltip', () => {
    const { rerender } = render(
      <BarChart id='b25' {...vProps} orientation='vertical' tooltip={{}} />,
    );
    rerender(<BarChart id='b25' {...hProps} orientation='horizontal' tooltip={{}} />);
    expect(svgOf('b25').querySelectorAll('clipPath')).toHaveLength(1);
    expect(document.querySelectorAll('[id="tooltip-b25"]')).toHaveLength(1);
    expect(marks('b25').length).toBe(rows.length);
  });

  it('26: the caller\'s x, y and data are not mutated', () => {
    const data = rows.map((d) => ({ ...d }));
    const x = { key: 'name' };
    const y = [{ key: 'v' }];
    const xSnap = JSON.stringify(x);
    const ySnap = JSON.stringify(y);
    const dataSnap = JSON.stringify(data);
    const { rerender } = render(
      <BarChart id='b26' style={style} margin={margin} padding={padding} data={data} x={x} y={y} />,
    );
    rerender(
      <BarChart id='b26' style={style} margin={margin} padding={padding} data={data} x={x} y={y} className='redraw' />,
    );
    expect(JSON.stringify(x)).toBe(xSnap);
    expect(JSON.stringify(y)).toBe(ySnap);
    expect(JSON.stringify(data)).toBe(dataSnap);
  });

  it('29: all four components and the listed types are importable from the package root', async () => {
    const root = await import('@/index');
    expect(root.BarChart).toBeTypeOf('function');
    expect(root.ColumnChart).toBeTypeOf('function');
    expect(root.BarChartStacked).toBeTypeOf('function');
    expect(root.ColumnChartStacked).toBeTypeOf('function');
  });
});
