import { StrictMode, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import {
  symbol,
  symbolCircle,
  symbolCross,
  symbolDiamond,
  symbolSquare,
  symbolStar,
  symbolTriangle,
  symbolWye,
} from 'd3-shape';

import LollipopChart from '.';
import LollipopHChart from '../LollipopHChart';
import LollipopVChart from '../LollipopVChart';
import * as pkg from '@/index';
import { tickPositions } from '@/test-utils/axisTicks';
import { resetDevWarnings } from '@/utils/devEnvironment';

const STYLE = { width: '500px', height: '300px' };
// Vertical default margin 40: plot x [40, 460], y [40, 260].
const V_LEFT = 40;
const V_RIGHT = 460;
const V_TOP = 40;
const V_BOTTOM = 260;
// Horizontal default margin left 80: plot x [80, 460], y [40, 260].
const H_LEFT = 80;
const H_RIGHT = 460;
const H_TOP = 40;
const H_BOTTOM = 260;
const SYMBOL_INSET = 10;

const ROWS = [
  { name: 'a', v: 10 },
  { name: 'b', v: 20 },
  { name: 'c', v: 30 },
];

const X_CAT = { key: 'name', axis: { location: 'bottom' as const } };
const Y_VAL = { key: 'v', start: 0, axis: { location: 'left' as const, ticks: 5 } };
const Y_CAT = { key: 'name', axis: { location: 'left' as const } };
const X_VAL = { key: 'v', start: 0, axis: { location: 'bottom' as const, ticks: 5 } };

const vProps = { style: STYLE, data: ROWS, x: X_CAT, y: Y_VAL };
const hProps = { style: STYLE, data: ROWS, y: Y_CAT, x: X_VAL };

const svgOf = (id: string) => document.getElementById(id) as unknown as SVGSVGElement;
const stemsOf = (id: string) =>
  Array.from(svgOf(id).querySelectorAll<SVGLineElement>('g.marks line.line'));
const symbolsOf = (id: string) =>
  Array.from(svgOf(id).querySelectorAll<SVGPathElement>('g.marks path.symbols'));
const hitsOf = (id: string) =>
  Array.from(svgOf(id).querySelectorAll<SVGRectElement>('[data-testid="lollipop-hit"]'));
const rowGroupsOf = (id: string) =>
  Array.from(svgOf(id).querySelectorAll('g.marks > g[data-category]'));
const hasNaN = (node: Element) => /NaN/.test(node.innerHTML);
const tooltipOf = (id: string) => document.getElementById(`tooltip-${id}`);
const num = (el: Element, attr: string) => Number(el.getAttribute(attr));
const yTicks = (id: string) =>
  tickPositions(svgOf(id).querySelector('[data-testid="y-axis"]'), 'vertical');
const xTicks = (id: string) =>
  tickPositions(svgOf(id).querySelector('[data-testid="x-axis"]'), 'horizontal');

const SHAPES = {
  circle: symbolCircle,
  diamond: symbolDiamond,
  triangle: symbolTriangle,
  square: symbolSquare,
  cross: symbolCross,
  star: symbolStar,
  wye: symbolWye,
} as const;

const xForDate = (
  iso: string,
  [domainStart, domainEnd]: [string, string],
  [rangeStart, rangeEnd]: [number, number] = [
    V_LEFT + SYMBOL_INSET,
    V_RIGHT - SYMBOL_INSET,
  ],
) => {
  const t0 = Date.parse(domainStart);
  const t1 = Date.parse(domainEnd);
  if (t1 === t0) return (rangeStart + rangeEnd) / 2;
  return rangeStart + ((Date.parse(iso) - t0) / (t1 - t0)) * (rangeEnd - rangeStart);
};

const TIME_ROWS = [
  { date: '2025-01-06', v: 12 },
  { date: '2025-01-13', v: 18 },
  { date: '2025-01-20', v: 9 },
  { date: '2025-01-27', v: 22 },
];
const TIME_DOMAIN: [string, string] = ['2025-01-06', '2025-01-27'];
const TIME_X = {
  key: 'date',
  scalingFunction: 'time' as const,
  time: { isISO: true, utc: true },
};

afterEach(() => {
  vi.restoreAllMocks();
  resetDevWarnings();
});

describe('1: default is vertical', () => {
  it('renders vertically with stems on band centres along x, the lollipop-chart root, and the circle shape', () => {
    render(<LollipopChart id='lp1' {...vProps} />);
    const svg = svgOf('lp1');
    expect(svg.getAttribute('data-testid')).toBe('lollipop-chart');
    const stems = stemsOf('lp1');
    const symbols = symbolsOf('lp1');
    expect(stems).toHaveLength(3);
    expect(symbols).toHaveLength(3);
    const expectedD = symbol(symbolCircle, 100)();
    symbols.forEach((s) => expect(s.getAttribute('d')).toBe(expectedD));
    // Value-descending drawing order is also the band domain, so c, b, a
    // sit left → right in the first, second and third bands.
    const band = (V_RIGHT - V_LEFT) / 3;
    const centres = [V_LEFT + 0.5 * band, V_LEFT + 1.5 * band, V_LEFT + 2.5 * band];
    stems.forEach((stem, i) => {
      expect(num(stem, 'x1')).toBeCloseTo(centres[i], 6);
      expect(num(stem, 'x2')).toBeCloseTo(centres[i], 6);
      expect(num(stem, 'y2')).toBeCloseTo(V_BOTTOM, 6);
    });
  });
});

describe('2: orientation="horizontal"', () => {
  it('draws stems along x on band centres down y, with the Geometry table attribute roles', () => {
    render(<LollipopChart id='lp2' orientation='horizontal' {...hProps} />);
    const stems = stemsOf('lp2');
    expect(stems).toHaveLength(3);
    const band = (H_BOTTOM - H_TOP) / 3;
    const centres = [H_TOP + 0.5 * band, H_TOP + 1.5 * band, H_TOP + 2.5 * band];
    // Value-descending: c, b, a down the category axis.
    stems.forEach((stem, i) => {
      expect(num(stem, 'y1')).toBeCloseTo(centres[i], 6);
      expect(num(stem, 'y2')).toBeCloseTo(centres[i], 6);
      expect(num(stem, 'x1')).toBeCloseTo(H_LEFT, 6); // baseline (0)
      expect(num(stem, 'x2')).toBeGreaterThan(H_LEFT); // value end
    });
    // The longest stem (30) reaches the right of the plot.
    expect(num(stems[0], 'x2')).toBeCloseTo(H_RIGHT, 6);
  });
});

describe('3: omitted orientation is always vertical', () => {
  it('stays vertical with a numeric category key and does not fire orientation-mismatch', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const years = [
      { year: 2022, v: 10 },
      { year: 2023, v: 20 },
      { year: 2024, v: 30 },
    ];
    render(
      <LollipopChart
        id='lp3'
        style={STYLE}
        data={years}
        x={{ key: 'year' }}
        y={{ key: 'v', start: 0 }}
      />,
    );
    const stems = stemsOf('lp3');
    expect(stems).toHaveLength(3);
    stems.forEach((stem) => {
      expect(num(stem, 'x1')).toBe(num(stem, 'x2'));
      expect(num(stem, 'y2')).toBeCloseTo(V_BOTTOM, 6);
    });
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('4: wrappers equal the pinned unified chart', () => {
  const markSnapshot = (id: string) =>
    rowGroupsOf(id).map((g) => ({
      category: g.getAttribute('data-category'),
      line: g.querySelector('line')?.getAttribute('x1')
        + ',' + g.querySelector('line')?.getAttribute('x2')
        + ',' + g.querySelector('line')?.getAttribute('y1')
        + ',' + g.querySelector('line')?.getAttribute('y2'),
      transform: g.querySelector('path')?.getAttribute('transform'),
    }));

  it('LollipopVChart equals <LollipopChart orientation="vertical">, node for node', () => {
    const shared = { ...vProps, drawing: { duration: 0 } };
    render(<LollipopVChart id='lp4v-w' {...shared} />);
    render(<LollipopChart id='lp4v-u' orientation='vertical' {...shared} />);
    expect(markSnapshot('lp4v-w')).toEqual(markSnapshot('lp4v-u'));
    expect(stemsOf('lp4v-w')).toHaveLength(stemsOf('lp4v-u').length);
  });

  it('LollipopHChart equals <LollipopChart orientation="horizontal">, node for node', () => {
    const shared = { ...hProps, drawing: { duration: 0 } };
    render(<LollipopHChart id='lp4h-w' {...shared} />);
    render(<LollipopChart id='lp4h-u' orientation='horizontal' {...shared} />);
    expect(markSnapshot('lp4h-w')).toEqual(markSnapshot('lp4h-u'));
  });
});

describe('5: wrapper orientation-ignored', () => {
  it('LollipopHChart orientation="vertical" warns once and stays horizontal', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      // Types reject this; the runtime pin wins.
      <LollipopHChart
        id='lp5'
        {...hProps}
        orientation={'vertical' as 'horizontal'}
      />,
    );
    const stems = stemsOf('lp5');
    stems.forEach((stem) => {
      expect(num(stem, 'y1')).toBe(num(stem, 'y2'));
      expect(num(stem, 'x1')).toBeCloseTo(H_LEFT, 6);
    });
    const messages = warn.mock.calls.map((c) => String(c[0]));
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('LollipopHChart#lp5:');
    expect(messages[0]).toContain(
      'LollipopHChart is always horizontal; orientation="vertical" is ignored. Use LollipopChart with orientation="vertical" instead.',
    );
  });
});

describe('6: shape', () => {
  it("defaults to circle on all three, and each of the 7 shapes gives that d3 symbol path", () => {
    render(<LollipopChart id='lp6-def' {...vProps} />);
    render(<LollipopVChart id='lp6-v' {...vProps} drawing={{ duration: 0 }} />);
    render(<LollipopHChart id='lp6-h' {...hProps} drawing={{ duration: 0 }} />);
    const circle = symbol(symbolCircle, 100)();
    expect(symbolsOf('lp6-def')[0].getAttribute('d')).toBe(circle);
    expect(symbolsOf('lp6-v')[0].getAttribute('d')).toBe(circle);
    expect(symbolsOf('lp6-h')[0].getAttribute('d')).toBe(circle);

    (Object.keys(SHAPES) as (keyof typeof SHAPES)[]).forEach((shape) => {
      const id = `lp6-${shape}`;
      render(<LollipopChart id={id} {...vProps} shape={shape} />);
      expect(symbolsOf(id)[0].getAttribute('d')).toBe(symbol(SHAPES[shape], 100)());
    });
  });

  it('LollipopVChart without shape renders circles', () => {
    render(<LollipopVChart id='lp6-v-noshape' {...vProps} drawing={{ duration: 0 }} />);
    expect(symbolsOf('lp6-v-noshape')[0].getAttribute('d')).toBe(symbol(symbolCircle, 100)());
  });
});

describe('7: value axis', () => {
  const cases = [
    {
      name: 'all-positive → [0, max]',
      data: [
        { name: 'a', v: 10 },
        { name: 'b', v: 30 },
      ],
      config: {},
      expectZeroAtOrigin: true,
      expectMax: 30,
    },
    {
      name: 'all-negative → [min, 0], stems from 0',
      data: [
        { name: 'a', v: -30 },
        { name: 'b', v: -10 },
      ],
      config: {},
      expectZeroAtOrigin: false, // 0 is the far end
      expectMax: 0,
      expectMin: -30,
    },
    {
      name: 'mixed → the extent',
      data: [
        { name: 'a', v: -10 },
        { name: 'b', v: 20 },
      ],
      config: {},
      expectMin: -10,
      expectMax: 20,
    },
    {
      name: 'start: 40 → baseline at 40',
      data: ROWS,
      config: { start: 40, end: 50 },
      expectMin: 40,
      expectMax: 50,
    },
    {
      name: 'start: 0 / end: 0 are honoured',
      data: [
        { name: 'a', v: -30 },
        { name: 'b', v: -10 },
      ],
      config: { start: 0, end: 0 },
      degenerate: true,
    },
    {
      name: 'non-finite pins → default',
      data: [
        { name: 'a', v: 10 },
        { name: 'b', v: 30 },
      ],
      config: { start: Number.POSITIVE_INFINITY, end: Number.NaN },
      expectZeroAtOrigin: true,
      expectMax: 30,
    },
  ];

  it.each(['vertical', 'horizontal'] as const)('%s', (orientation) => {
    const isV = orientation === 'vertical';
    cases.forEach((c, i) => {
      const id = `lp7-${orientation}-${i}`;
      const value = { key: 'v', axis: { ticks: 5 }, ...c.config };
      render(
        isV ? (
          <LollipopChart
            id={id}
            style={STYLE}
            data={[...c.data]}
            orientation='vertical'
            x={X_CAT}
            y={value}
          />
        ) : (
          <LollipopChart
            id={id}
            style={STYLE}
            data={[...c.data]}
            orientation='horizontal'
            y={Y_CAT}
            x={{ ...value, axis: { location: 'bottom', ticks: 5 } }}
          />
        ),
      );
      const ticks = isV ? yTicks(id) : xTicks(id);
      const origin = isV ? V_BOTTOM : H_LEFT;
      const far = isV ? V_TOP : H_RIGHT;
      if ('expectZeroAtOrigin' in c && c.expectZeroAtOrigin) {
        expect(ticks.get('0'), c.name).toBeCloseTo(origin, 2);
      }
      if ('expectMax' in c && c.expectMax !== undefined) {
        const at = 'expectZeroAtOrigin' in c && c.expectZeroAtOrigin ? far : ticks.get(String(c.expectMax));
        if ('expectZeroAtOrigin' in c && c.expectZeroAtOrigin) {
          expect(ticks.get(String(c.expectMax)), c.name).toBeCloseTo(far, 2);
        } else if (c.expectMax === 0) {
          expect(ticks.get('0'), c.name).toBeCloseTo(far, 2);
        } else {
          expect(at, c.name).toBeDefined();
        }
      }
      if ('expectMin' in c && c.expectMin !== undefined && !('expectZeroAtOrigin' in c && c.expectZeroAtOrigin)) {
        expect(ticks.get(String(c.expectMin)), c.name).toBeCloseTo(origin, 2);
      }
      if ('degenerate' in c && c.degenerate) {
        stemsOf(id).forEach((stem) => {
          if (isV) expect(num(stem, 'y1')).toBe(num(stem, 'y2'));
          else expect(num(stem, 'x1')).toBe(num(stem, 'x2'));
        });
      }
    });

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const id = `lp7-${orientation}-inverted`;
    render(
      isV ? (
        <LollipopChart
          id={id}
          style={STYLE}
          data={ROWS}
          x={X_CAT}
          y={{ key: 'v', start: 40, end: 10 }}
        />
      ) : (
        <LollipopChart
          id={id}
          style={STYLE}
          data={ROWS}
          orientation='horizontal'
          y={Y_CAT}
          x={{ key: 'v', start: 40, end: 10 }}
        />
      ),
    );
    stemsOf(id).forEach((stem) => {
      if (isV) expect(num(stem, 'y1')).toBe(num(stem, 'y2'));
      else expect(num(stem, 'x1')).toBe(num(stem, 'x2'));
    });
    const axis = isV ? 'y' : 'x';
    expect(warn.mock.calls.map((c) => String(c[0])).join('\n')).toContain(
      `${axis}.start (40) > ${axis}.end (10); stems have zero length.`,
    );
    warn.mockRestore();
    resetDevWarnings();
  });
});

describe('8: stems are clamped', () => {
  it('a value beyond a pinned end stops at the plot edge, and a value below start is a zero-length stem at the axis', () => {
    render(
      <LollipopChart
        id='lp8'
        style={STYLE}
        data={[
          { name: 'low', v: 5 },
          { name: 'in', v: 20 },
          { name: 'high', v: 50 },
        ]}
        x={{ key: 'name' }}
        y={{ key: 'v', start: 10, end: 30, axis: { ticks: 5 } }}
      />,
    );
    // Drawing order is value-desc: high, in, low
    const stems = stemsOf('lp8');
    expect(stems).toHaveLength(3);
    // high: clamped to end → zero? no, clamped to 30, stem from 10 to 30, full plot
    expect(num(stems[0], 'y1')).toBeCloseTo(V_TOP, 6);
    expect(num(stems[0], 'y2')).toBeCloseTo(V_BOTTOM, 6);
    // low: 5 below start 10 → zero-length at the axis (start)
    expect(num(stems[2], 'y1')).toBeCloseTo(V_BOTTOM, 6);
    expect(num(stems[2], 'y2')).toBeCloseTo(V_BOTTOM, 6);
  });
});

describe('9: clip', () => {
  it('uses a per-chart {id}-plot-clip grown by 10 px; two charts are distinct; a redraw does not duplicate it', () => {
    const { rerender } = render(<LollipopChart id='lp9a' {...vProps} />);
    render(<LollipopChart id='lp9b' {...vProps} />);
    const clipA = svgOf('lp9a').querySelector('clipPath');
    const clipB = svgOf('lp9b').querySelector('clipPath');
    expect(clipA?.getAttribute('id')).toBe('lp9a-plot-clip');
    expect(clipB?.getAttribute('id')).toBe('lp9b-plot-clip');
    const rect = clipA!.querySelector('rect')!;
    expect(num(rect, 'x')).toBeCloseTo(V_LEFT - SYMBOL_INSET, 6);
    expect(num(rect, 'y')).toBeCloseTo(V_TOP - SYMBOL_INSET, 6);
    expect(num(rect, 'width')).toBeCloseTo(V_RIGHT - V_LEFT + 2 * SYMBOL_INSET, 6);
    expect(num(rect, 'height')).toBeCloseTo(V_BOTTOM - V_TOP + 2 * SYMBOL_INSET, 6);
    expect(svgOf('lp9a').querySelector('g.marks')?.getAttribute('clip-path')).toBe(
      'url(#lp9a-plot-clip)',
    );
    rerender(<LollipopChart id='lp9a' {...vProps} data={ROWS.slice(0, 2)} />);
    expect(svgOf('lp9a').querySelectorAll('clipPath')).toHaveLength(1);
  });
});

describe('10: sorting', () => {
  it('draws value-descending and never mutates the caller\'s data, including a frozen array', () => {
    const data = [
      { name: 'a', v: 10 },
      { name: 'b', v: 30 },
      { name: 'c', v: 20 },
    ];
    const frozen = Object.freeze(data.map((d) => Object.freeze({ ...d })));
    const before = structuredClone(frozen);
    expect(() => render(<LollipopChart id='lp10' style={STYLE} data={[...frozen]} x={X_CAT} y={Y_VAL} />)).not.toThrow();
    // The frozen original is unchanged even if we pass it directly.
    render(<LollipopChart id='lp10f' style={STYLE} data={frozen as typeof ROWS} x={X_CAT} y={Y_VAL} />);
    expect(frozen).toEqual(before);
    const categories = rowGroupsOf('lp10f').map((g) => g.getAttribute('data-category'));
    expect(categories).toEqual(['b', 'c', 'a']);
  });
});

describe('11: vertical time', () => {
  it('positions stems at their dates, matching the LollipopVChart time inset scale', () => {
    render(
      <LollipopChart
        id='lp11'
        style={STYLE}
        data={TIME_ROWS}
        x={TIME_X}
        y={{ key: 'v', start: 0 }}
      />,
    );
    const stems = stemsOf('lp11');
    expect(stems).toHaveLength(4);
    const expected = TIME_ROWS.map((d) => xForDate(d.date, TIME_DOMAIN));
    const xs = stems.map((s) => num(s, 'x1')).sort((a, b) => a - b);
    expected.sort((a, b) => a - b);
    xs.forEach((x, i) => expect(x).toBeCloseTo(expected[i], 6));
    expect(xs[0]).toBeCloseTo(V_LEFT + SYMBOL_INSET, 6);
    expect(xs[xs.length - 1]).toBeCloseTo(V_RIGHT - SYMBOL_INSET, 6);
  });
});

describe('12: horizontal time', () => {
  it('warns once with time-ignored, uses band positions, and does not throw', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() =>
      render(
        <LollipopChart
          id='lp12'
          style={STYLE}
          orientation='horizontal'
          data={TIME_ROWS}
          y={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
          x={{ key: 'v', start: 0 }}
        />,
      ),
    ).not.toThrow();
    const stems = stemsOf('lp12');
    expect(stems).toHaveLength(4);
    const band = (H_BOTTOM - H_TOP) / 4;
    const ys = stems.map((s) => num(s, 'y1')).sort((a, b) => a - b);
    ys.forEach((y, i) => expect(y).toBeCloseTo(H_TOP + (i + 0.5) * band, 6));
    const messages = warn.mock.calls.map((c) => String(c[0]));
    expect(messages.some((m) => m.includes('time-ignored') || m.includes('y.scalingFunction "time"'))).toBe(
      true,
    );
    expect(messages.filter((m) => m.includes('y.scalingFunction "time"'))).toHaveLength(1);
  });
});

describe('13: non-finite value', () => {
  it('draws no stem or symbol for that row, one warning, no NaN attributes, and keeps the hit rect', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <LollipopChart
        id='lp13'
        style={STYLE}
        data={[
          { name: 'a', v: 10 },
          { name: 'b', v: Number.NaN },
          { name: 'c', v: 30 },
        ]}
        x={X_CAT}
        y={Y_VAL}
      />,
    );
    expect(stemsOf('lp13')).toHaveLength(2);
    expect(symbolsOf('lp13')).toHaveLength(2);
    expect(hitsOf('lp13')).toHaveLength(3);
    expect(rowGroupsOf('lp13')).toHaveLength(3);
    expect(hasNaN(svgOf('lp13'))).toBe(false);
    const messages = warn.mock.calls.map((c) => String(c[0]));
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain(
      'non-numeric value for y.key "v"; that row is not drawn.',
    );
  });
});

describe('14: tooltip', () => {
  const hover = (id: string, row = 0) => {
    fireEvent.mouseEnter(hitsOf(id)[row]);
    return tooltipOf(id)?.innerHTML;
  };

  it('shows {category}: {value} in both orientations, a formatted date in time mode, and tooltip.html overrides it', () => {
    render(<LollipopChart id='lp14v' tooltip={{}} {...vProps} />);
    render(<LollipopChart id='lp14h' tooltip={{}} orientation='horizontal' {...hProps} />);
    // Value-descending: first row is c / 30
    expect(hover('lp14v')).toBe('c: 30');
    expect(hover('lp14h')).toBe('c: 30');

    render(
      <LollipopChart
        id='lp14t'
        style={STYLE}
        tooltip={{}}
        data={TIME_ROWS}
        x={{ ...TIME_X, time: { isISO: true, utc: true, tooltipFormat: '%Y-%m-%d' } }}
        y={{ key: 'v', start: 0 }}
      />,
    );
    // Highest value is 22 on 2025-01-27
    expect(hover('lp14t')).toBe('2025-01-27: 22');

    render(
      <LollipopChart
        id='lp14c'
        tooltip={{ html: (d: { name: string; v: number }) => `custom ${d.name}` }}
        {...vProps}
      />,
    );
    expect(hover('lp14c')).toBe('custom c');
  });
});

describe('15: LollipopVChart tooltip is opt-in', () => {
  it('shows a tooltip only when tooltip is passed, and unmounting removes its tooltip div', () => {
    const { unmount: unmountPlain } = render(
      <LollipopVChart id='lp15a' {...vProps} drawing={{ duration: 0 }} />,
    );
    fireEvent.mouseEnter(hitsOf('lp15a')[0]);
    // useTooltip still mounts a div, but it stays hidden unless `tooltip` is set.
    const hidden = tooltipOf('lp15a');
    expect(hidden?.className).toContain('opacity-0');
    expect(hidden?.className).not.toContain('opacity-100');
    unmountPlain();
    expect(tooltipOf('lp15a')).toBeNull();

    const { unmount } = render(
      <LollipopVChart id='lp15b' tooltip={{}} {...vProps} drawing={{ duration: 0 }} />,
    );
    fireEvent.mouseEnter(hitsOf('lp15b')[0]);
    const shown = tooltipOf('lp15b');
    expect(shown).toBeTruthy();
    expect(shown?.className).toContain('opacity-100');
    expect(shown?.innerHTML).toBe('c: 30');
    unmount();
    expect(tooltipOf('lp15b')).toBeNull();
  });
});

describe('16: hit areas', () => {
  it('has one lollipop-hit per row in g.hits, covering the full value span', () => {
    render(<LollipopChart id='lp16' {...vProps} />);
    const hits = hitsOf('lp16');
    expect(hits).toHaveLength(3);
    expect(svgOf('lp16').querySelectorAll('g.hits [data-testid="lollipop-hit"]')).toHaveLength(3);
    hits.forEach((hit) => {
      expect(hit.getAttribute('fill')).toBe('transparent');
      expect(num(hit, 'y')).toBeCloseTo(V_TOP, 6);
      expect(num(hit, 'height')).toBeCloseTo(V_BOTTOM - V_TOP, 6);
    });
  });

  it('in time mode, neighbouring hit rects meet at the midpoint between dates', () => {
    render(
      <LollipopChart
        id='lp16t'
        style={STYLE}
        data={TIME_ROWS}
        x={TIME_X}
        y={{ key: 'v', start: 0 }}
      />,
    );
    const hits = hitsOf('lp16t');
    expect(hits).toHaveLength(4);
    const positions = TIME_ROWS.map((d) => xForDate(d.date, TIME_DOMAIN));
    // Hits are in drawing (value-desc) order, not date order. Pair each hit
    // to its stem's date via the corresponding row group? Easier: sort hits by x.
    const byX = [...hits].sort((a, b) => num(a, 'x') - num(b, 'x'));
    const mid01 = (positions[0] + positions[1]) / 2;
    const mid12 = (positions[1] + positions[2]) / 2;
    const mid23 = (positions[2] + positions[3]) / 2;
    expect(num(byX[0], 'x')).toBeCloseTo(V_LEFT, 6);
    expect(num(byX[0], 'x') + num(byX[0], 'width')).toBeCloseTo(mid01, 6);
    expect(num(byX[1], 'x')).toBeCloseTo(mid01, 6);
    expect(num(byX[1], 'x') + num(byX[1], 'width')).toBeCloseTo(mid12, 6);
    expect(num(byX[2], 'x')).toBeCloseTo(mid12, 6);
    expect(num(byX[2], 'x') + num(byX[2], 'width')).toBeCloseTo(mid23, 6);
    expect(num(byX[3], 'x')).toBeCloseTo(mid23, 6);
    expect(num(byX[3], 'x') + num(byX[3], 'width')).toBeCloseTo(V_RIGHT, 6);
  });
});

describe('17: tooltip ref', () => {
  it('a new tooltip object neither redraws nor rebinds, and the latest html is used', () => {
    const { rerender } = render(
      <LollipopChart id='lp17' tooltip={{ html: () => 'first' }} {...vProps} />,
    );
    const stem = stemsOf('lp17')[0];
    rerender(<LollipopChart id='lp17' tooltip={{ html: () => 'second' }} {...vProps} />);
    expect(stemsOf('lp17')[0]).toBe(stem);
    fireEvent.mouseEnter(hitsOf('lp17')[0]);
    expect(tooltipOf('lp17')?.innerHTML).toBe('second');
  });
});

describe('18: drawing', () => {
  it('defaults to the final geometry, synchronously', () => {
    render(<LollipopChart id='lp18a' {...vProps} />);
    const stem = stemsOf('lp18a')[0];
    expect(num(stem, 'y1')).toBeCloseTo(V_TOP, 6); // value 30
    expect(num(stem, 'y2')).toBeCloseTo(V_BOTTOM, 6);
    expect('__transition' in stem).toBe(false);
  });

  it('with { duration: 200, delay: 50 }, stems and symbols start at the baseline and row i starts at i·50 ms', async () => {
    render(
      <LollipopChart id='lp18b' {...vProps} drawing={{ duration: 200, delay: 50 }} />,
    );
    stemsOf('lp18b').forEach((stem, i) => {
      expect(num(stem, 'y1')).toBeCloseTo(V_BOTTOM, 6);
      expect(num(stem, 'y2')).toBeCloseTo(V_BOTTOM, 6);
      const schedules = Object.values(
        (stem as unknown as { __transition: Record<string, { delay: number; duration: number }> })
          .__transition,
      );
      expect(schedules[0].delay).toBe(i * 50);
      expect(schedules[0].duration).toBe(200);
    });
    symbolsOf('lp18b').forEach((s) => {
      expect(s.getAttribute('transform')).toMatch(new RegExp(`[, ]${V_BOTTOM}\\)`));
    });
    await waitFor(
      () => {
        expect(num(stemsOf('lp18b')[0], 'y1')).toBeCloseTo(V_TOP, 3);
      },
      { timeout: 2000, interval: 25 },
    );
  });
});

describe('19: wrapper default draw-in', () => {
  it("is 1000 ms, and the pre-transition frame has stems collapsed on the baseline", () => {
    render(<LollipopVChart id='lp19' {...vProps} />);
    const stems = stemsOf('lp19');
    stems.forEach((stem) => {
      expect(num(stem, 'y1')).toBeCloseTo(V_BOTTOM, 6);
      expect(num(stem, 'y2')).toBeCloseTo(V_BOTTOM, 6);
      const schedules = Object.values(
        (stem as unknown as { __transition: Record<string, { delay: number; duration: number }> })
          .__transition,
      );
      expect(schedules[0].duration).toBe(1000);
    });
  });
});

describe('20: interrupt', () => {
  it('a data change mid-transition gives the final geometry for the new data, with no leftover nodes', async () => {
    const drawing = { duration: 200 };
    const { rerender } = render(<LollipopChart id='lp20' {...vProps} drawing={drawing} />);
    const old = stemsOf('lp20')[0];
    const next = ROWS.slice(0, 2);
    rerender(<LollipopChart id='lp20' {...vProps} data={next} drawing={drawing} />);
    expect('__transition' in old).toBe(false);
    expect(old.isConnected).toBe(false);
    expect(rowGroupsOf('lp20')).toHaveLength(2);
    expect(svgOf('lp20').querySelectorAll('clipPath')).toHaveLength(1);
    expect(hitsOf('lp20')).toHaveLength(2);
    await waitFor(() => expect(num(stemsOf('lp20')[0], 'y1')).toBeCloseTo(V_TOP, 3), {
      timeout: 2000,
      interval: 25,
    });
    // New max is still 20? next is a=10, b=20, first drawn is b at 20, domain [0,20], y1 at top.
    expect(stemsOf('lp20')).toHaveLength(2);
  });

  it('unmounting mid-transition leaves no timers or errors', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render(
      <StrictMode>
        <LollipopChart id='lp20u' {...vProps} drawing={{ duration: 200, delay: 20 }} />
      </StrictMode>,
    );
    const nodes = Array.from(svgOf('lp20u').querySelectorAll('line, path'));
    expect(nodes.some((n) => '__transition' in n)).toBe(true);
    unmount();
    expect(nodes.some((n) => '__transition' in n)).toBe(false);
    await new Promise((r) => setTimeout(r, 300));
    expect(error).not.toHaveBeenCalled();
  });
});

describe('21: runtime orientation toggle', () => {
  it('redraws with no leftover nodes, one clip and one tooltip div', () => {
    const Toggle = () => {
      const [horizontal, setHorizontal] = useState(false);
      return (
        <>
          <button onClick={() => setHorizontal((h) => !h)}>toggle</button>
          {horizontal ? (
            <LollipopChart id='lp21' tooltip={{}} orientation='horizontal' {...hProps} />
          ) : (
            <LollipopChart id='lp21' tooltip={{}} orientation='vertical' {...vProps} />
          )}
        </>
      );
    };
    const { getByText } = render(<Toggle />);
    expect(num(stemsOf('lp21')[0], 'x1')).toBe(num(stemsOf('lp21')[0], 'x2'));
    fireEvent.click(getByText('toggle'));
    const svg = svgOf('lp21');
    expect(rowGroupsOf('lp21')).toHaveLength(3);
    expect(stemsOf('lp21')).toHaveLength(3);
    expect(hitsOf('lp21')).toHaveLength(3);
    expect(svg.querySelectorAll('clipPath')).toHaveLength(1);
    expect(document.querySelectorAll('#tooltip-lp21')).toHaveLength(1);
    // Now horizontal: y1 === y2
    expect(num(stemsOf('lp21')[0], 'y1')).toBe(num(stemsOf('lp21')[0], 'y2'));
  });
});

describe('22: classNames', () => {
  it.each(['vertical', 'horizontal'] as const)(
    '%s: points on stems and symbols, lines on stems only, symbols on symbols only, with the V base classes',
    (orientation) => {
      const id = `lp22-${orientation}`;
      render(
        orientation === 'vertical' ? (
          <LollipopChart
            id={id}
            {...vProps}
            classNames={{ points: 'p-cls', lines: 'l-cls', symbols: 's-cls' }}
          />
        ) : (
          <LollipopChart
            id={id}
            orientation='horizontal'
            {...hProps}
            classNames={{ points: 'p-cls', lines: 'l-cls', symbols: 's-cls' }}
          />
        ),
      );
      const stem = stemsOf(id)[0].getAttribute('class') ?? '';
      const marker = symbolsOf(id)[0].getAttribute('class') ?? '';
      expect(stem.split(/\s+/)).toEqual(expect.arrayContaining(['line', 'stroke-current', 'p-cls', 'l-cls']));
      expect(stem.split(/\s+/)).not.toContain('s-cls');
      expect(marker.split(/\s+/)).toEqual(
        expect.arrayContaining(['symbols', 'fill-current', 'p-cls', 's-cls']),
      );
      expect(marker.split(/\s+/)).not.toContain('l-cls');
    },
  );
});

describe('23: empty data', () => {
  it.each(['vertical', 'horizontal'] as const)('%s: no throw and no NaN', (orientation) => {
    expect(() =>
      render(
        orientation === 'vertical' ? (
          <LollipopChart id={`lp23-${orientation}`} style={STYLE} data={[]} x={X_CAT} y={Y_VAL} />
        ) : (
          <LollipopChart
            id={`lp23-${orientation}`}
            style={STYLE}
            data={[]}
            orientation='horizontal'
            y={Y_CAT}
            x={X_VAL}
          />
        ),
      ),
    ).not.toThrow();
    const svg = svgOf(`lp23-${orientation}`);
    expect(stemsOf(`lp23-${orientation}`)).toHaveLength(0);
    expect(hasNaN(svg)).toBe(false);
  });
});

describe('25: catalog', () => {
  const { resolveChartRequest, getChartMeta, chartCatalog, chartWrapperIndex } = pkg;

  it.each([
    ['LollipopChart', undefined, undefined],
    ['LollipopHChart', 'Horizontal lollipop chart', 'LollipopHChart'],
    ['LollipopVChart', undefined, 'LollipopVChart'],
    ['horizontal lollipop chart', 'Horizontal lollipop chart', undefined],
    ['lollipop chart (horizontal)', 'Horizontal lollipop chart', undefined],
    ['horizontal stem plot', 'Horizontal lollipop chart', undefined],
    ['lollipop chart', undefined, undefined],
    ['stem plot', undefined, undefined],
    ['lollipop', undefined, undefined],
    ['lollipop plot', undefined, undefined],
    ['vertical lollipop chart', undefined, undefined],
    ['stem and dot chart', undefined, undefined],
    ['time-scaled lollipop chart', 'Time-scaled lollipop chart', undefined],
    ['time series lollipop chart', 'Time-scaled lollipop chart', undefined],
  ] as const)('"%s" resolves as stated (variant %s, wrapper %s)', (name, variant, wrapper) => {
    const resolved = resolveChartRequest(name);
    expect(resolved?.chart.name).toBe('LollipopChart');
    expect(resolved?.variant?.name).toBe(variant);
    expect(resolved?.wrapper).toBe(wrapper);
  });

  it("getChartMeta('LollipopHChart') returns the unified meta, and wrapper integrity holds", () => {
    expect(getChartMeta('LollipopHChart')?.name).toBe('LollipopChart');
    expect(getChartMeta('LollipopVChart')?.name).toBe('LollipopChart');
    const names = chartCatalog.map((c) => c.name);
    expect(names).toContain('LollipopChart');
    expect(names).not.toContain('LollipopHChart');
    expect(names).not.toContain('LollipopVChart');
    const wrappers = chartWrapperIndex.filter((e) => e.chart.name === 'LollipopChart');
    expect(wrappers.map((e) => [e.wrapper.name, e.wrapper.pins])).toEqual([
      ['LollipopHChart', 'orientation="horizontal"'],
      ['LollipopVChart', 'orientation="vertical"'],
    ]);
    const exported = pkg as Record<string, unknown>;
    wrappers.forEach(({ wrapper }) => expect(exported[wrapper.name]).toBeTypeOf('function'));
  });
});

it('26: LollipopChart, LollipopHChart and LollipopVChart are importable from the package root', () => {
  expect(pkg.LollipopChart).toBe(LollipopChart);
  expect(pkg.LollipopHChart).toBe(LollipopHChart);
  expect(pkg.LollipopVChart).toBe(LollipopVChart);
});
