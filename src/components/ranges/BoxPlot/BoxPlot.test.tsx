/**
 * Tests for the unified BoxPlot (#76), numbered after the 27 tests in
 * specs/boxplot-orientation-merge.md. Test 25 (types) lives in
 * BoxPlot.test-d.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { StrictMode, useState, type ComponentProps, type ReactElement } from 'react';

import BoxPlot from '.';
import BoxPlotH from '../BoxPlotH';
import BoxPlotV from '../BoxPlotV';
import { boxPlotEvidence } from '../boxPlotConfig';
import { binDataStats } from '@/utils';
import { resetDevWarnings } from '@/utils/devEnvironment';
import { resolveOrientation } from '@/utils/orientation';
import * as pkg from '@/index';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A square chart with equal margins, so the two orientations mirror exactly. */
const SQUARE = { width: '400px', height: '400px' };
const EVEN_MARGIN = { top: 40, right: 40, bottom: 40, left: 40 };
const PLOT_LO = 40;
const PLOT_HI = 360;
/** Default margins (40/20/40/40) on 600x400: x range [40, 580], y range [360, 40]. */
const STYLE = { width: '600px', height: '400px' };

const ROWS = [
  { name: 'A', min: 10, q1: 20, mid: 30, q3: 40, max: 50 },
  { name: 'B', min: 15, q1: 25, mid: 35, q3: 45, max: 70 },
  { name: 'C', min: 5, q1: 30, mid: 40, q3: 60, max: 90 },
];
const STATS = {
  minKey: 'min',
  maxKey: 'max',
  boxStart: 'q1',
  boxEnd: 'q3',
  midKey: 'mid',
};
const CAT = { key: 'name' };
const vProps = { data: ROWS, x: CAT, y: STATS };
const hProps = { data: ROWS, y: CAT, x: STATS };

const RAW = [
  { age: 22, salary: 30000 },
  { age: 25, salary: 32000 },
  { age: 27, salary: 40000 },
  { age: 35, salary: 55000 },
  { age: 38, salary: 60000 },
  { age: 50, salary: 80000 },
  { age: 55, salary: 78000 },
];

const MARKS = [
  'box-plot-whisker',
  'box-plot-cap-min',
  'box-plot-box',
  'box-plot-median',
  'box-plot-cap-max',
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const svgOf = (id: string) => document.getElementById(id) as unknown as SVGSVGElement;
const rowsOf = (id: string) =>
  Array.from(svgOf(id).querySelectorAll('g.data > g')) as SVGGElement[];
const mark = (id: string, row: number, testId: (typeof MARKS)[number]) =>
  rowsOf(id)[row].querySelector(`[data-testid="${testId}"]`) as SVGElement;
const marksOf = (id: string, testId: (typeof MARKS)[number]) =>
  Array.from(svgOf(id).querySelectorAll(`[data-testid="${testId}"]`)) as SVGElement[];
const num = (el: Element | null | undefined, name: string) =>
  Number(el?.getAttribute(name));
const tooltipOf = (id: string) => document.getElementById(`tooltip-${id}`);
const spyWarn = () => vi.spyOn(console, 'warn').mockImplementation(() => {});
const hasNaN = (root: Element) =>
  Array.from(root.querySelectorAll('*')).some((el) =>
    Array.from(el.attributes).some((a) => a.value.includes('NaN')),
  );

/** Final geometry of a mark, keyed by attribute. */
const geom = (el: Element, attrs: string[]) =>
  Object.fromEntries(attrs.map((a) => [a, num(el, a)]));
const LINE = ['x1', 'x2', 'y1', 'y2'];
const RECT = ['x', 'y', 'width', 'height'];

beforeEach(() => {
  document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
});
afterEach(() => {
  resetDevWarnings();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------

describe('BoxPlot (#76)', () => {
  it('1: with no orientation, groups on x and stats on y render vertically', () => {
    render(<BoxPlot id='bp1' style={STYLE} {...vProps} />);
    const svg = svgOf('bp1');
    expect(svg.getAttribute('data-testid')).toBe('box-plot');
    const boxes = marksOf('bp1', 'box-plot-box');
    expect(boxes).toHaveLength(3);
    const xs = boxes.map((b) => num(b, 'x'));
    expect(xs[1]).toBeGreaterThan(xs[0]);
    expect(xs[2]).toBeGreaterThan(xs[1]);
    // equal widths along x: the band
    boxes.forEach((b) => expect(num(b, 'width')).toBeCloseTo(num(boxes[0], 'width'), 6));
  });

  it.each(MARKS)(
    '2: horizontal %s is the vertical geometry with x and y swapped',
    (testId) => {
      render(<BoxPlot id='bp2v' style={SQUARE} margin={EVEN_MARGIN} {...vProps} />);
      render(
        <BoxPlot
          id='bp2h'
          orientation='horizontal'
          style={SQUARE}
          margin={EVEN_MARGIN}
          {...hProps}
        />,
      );
      // The value axis runs up in vertical and right in horizontal, so a value
      // position v (vertical, from the top) is PLOT_LO + PLOT_HI - v across.
      const mirror = (v: number) => PLOT_LO + PLOT_HI - v;
      ROWS.forEach((_, i) => {
        const vEl = mark('bp2v', i, testId);
        const hEl = mark('bp2h', i, testId);
        if (testId === 'box-plot-box') {
          const v = geom(vEl, RECT);
          const h = geom(hEl, RECT);
          expect(h.y).toBeCloseTo(v.x, 6);
          expect(h.height).toBeCloseTo(v.width, 6);
          expect(h.width).toBeCloseTo(v.height, 6);
          expect(h.x).toBeCloseTo(mirror(v.y + v.height), 6);
        } else {
          const v = geom(vEl, LINE);
          const h = geom(hEl, LINE);
          expect(h.y1).toBeCloseTo(v.x1, 6);
          expect(h.y2).toBeCloseTo(v.x2, 6);
          expect(h.x1).toBeCloseTo(mirror(v.y1), 6);
          expect(h.x2).toBeCloseTo(mirror(v.y2), 6);
        }
      });
      // spread along y
      const ys = marksOf('bp2h', 'box-plot-box').map((b) => num(b, 'y'));
      expect(ys[1]).toBeGreaterThan(ys[0]);
      expect(ys[2]).toBeGreaterThan(ys[1]);
    },
  );

  it('3: evidence resolves an omitted orientation, without warnings', () => {
    const warn = spyWarn();
    render(<BoxPlot id='bp3a' style={STYLE} {...(hProps as unknown as typeof vProps)} />);
    render(
      <BoxPlot
        id='bp3b'
        style={STYLE}
        data={RAW}
        valueKey='salary'
        y={{ key: 'age', bin: { count: 3 } }}
        x={{}}
      />,
    );
    for (const id of ['bp3a', 'bp3b']) {
      const boxes = marksOf(id, 'box-plot-box');
      expect(boxes.length).toBeGreaterThan(1);
      // horizontal: boxes spread along y with a shared band height
      expect(num(boxes[1], 'y')).toBeGreaterThan(num(boxes[0], 'y'));
      expect(num(boxes[1], 'height')).toBeCloseTo(num(boxes[0], 'height'), 6);
    }
    expect(warn).not.toHaveBeenCalled();

    // Neither side has evidence: the default, vertical.
    expect(boxPlotEvidence({ key: 'name' }, { key: 'v' })).toBeNull();
    expect(resolveOrientation({ evidence: null }).orientation).toBe('vertical');
    // Both sides: no evidence either.
    expect(boxPlotEvidence(STATS, { key: 'name', bin: { count: 2 } })).not.toBeNull();
    expect(boxPlotEvidence({ ...STATS, bin: { count: 2 } }, STATS)).toBeNull();
  });

  it('4: an explicit orientation that contradicts the configs warns once and draws nothing', () => {
    const warn = spyWarn();
    const props = {
      id: 'bp4',
      style: STYLE,
      orientation: 'vertical',
      ...hProps,
    } as unknown as ComponentProps<typeof BoxPlot>;
    expect(() => render(<BoxPlot {...props} />)).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      '[headless-charts] BoxPlot#bp4: orientation is "vertical" but the statistic keys are on x; nothing is drawn. Set orientation="horizontal".',
    );
    const svg = svgOf('bp4');
    expect(svg.childElementCount).toBe(0);
    expect(svg.querySelectorAll('[data-testid="box-plot-hit"], .axis, line, rect')).toHaveLength(0);
  });

  it('5: wrappers render the same DOM as BoxPlot with that orientation', () => {
    const html = (el: ReactElement) => {
      const { container, unmount } = render(el);
      const out = container.innerHTML;
      unmount();
      return out;
    };
    const instant = { duration: 0 };
    expect(html(<BoxPlotH id='bp5' style={STYLE} drawing={instant} {...hProps} />)).toBe(
      html(<BoxPlot id='bp5' style={STYLE} drawing={instant} orientation='horizontal' {...hProps} />),
    );
    expect(html(<BoxPlotV id='bp5' style={STYLE} drawing={instant} {...vProps} />)).toBe(
      html(<BoxPlot id='bp5' style={STYLE} drawing={instant} orientation='vertical' {...vProps} />),
    );
    // Without `drawing`, a wrapper matches BoxPlot given the legacy 1 s draw-in.
    expect(html(<BoxPlotV id='bp5' style={STYLE} {...vProps} />)).toBe(
      html(<BoxPlot id='bp5' style={STYLE} drawing={{ duration: 1000, delay: 0 }} {...vProps} />),
    );
  });

  it('6: a conflicting orientation on a wrapper warns once and is ignored', () => {
    const warn = spyWarn();
    const props = {
      id: 'bp6',
      style: STYLE,
      orientation: 'vertical',
      drawing: { duration: 0 },
      ...hProps,
    } as unknown as ComponentProps<typeof BoxPlotH>;
    render(<BoxPlotH {...props} />);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      '[headless-charts] BoxPlotH#bp6: BoxPlotH is always horizontal; orientation="vertical" is ignored. Use BoxPlot with orientation="vertical" instead.',
    );
    const boxes = marksOf('bp6', 'box-plot-box');
    expect(boxes).toHaveLength(3);
    expect(num(boxes[1], 'y')).toBeGreaterThan(num(boxes[0], 'y'));
  });

  it('7: warnings name the component the caller rendered', () => {
    const warn = spyWarn();
    const noStats = { min: 0 } as unknown as typeof STATS;
    render(<BoxPlotH id='bp7' data={ROWS} y={CAT} x={noStats} />);
    render(<BoxPlot id='bp7' data={ROWS} x={CAT} y={noStats} />);
    const messages = warn.mock.calls.map(([m]) => String(m));
    expect(messages.some((m) => m.startsWith('[headless-charts] BoxPlotH#bp7: value axis needs'))).toBe(true);
    expect(messages.some((m) => m.startsWith('[headless-charts] BoxPlot#bp7: value axis needs'))).toBe(true);
  });

  it.each(['vertical', 'horizontal'] as const)(
    '8: %s draws the five marks in order with the classNames mapping',
    (orientation) => {
      const props = orientation === 'vertical' ? vProps : hProps;
      render(
        <BoxPlot
          id={`bp8-${orientation}`}
          style={STYLE}
          orientation={orientation as 'vertical'}
          classNames={{ lines: 'stroke-lines', data: 'stroke-data', boxes: 'fill-boxes' }}
          {...(props as typeof vProps)}
        />,
      );
      rowsOf(`bp8-${orientation}`).forEach((row) => {
        const children = Array.from(row.children);
        expect(children.map((c) => c.getAttribute('data-testid'))).toEqual([...MARKS]);
        expect(children.map((c) => c.tagName)).toEqual(['line', 'line', 'rect', 'line', 'line']);
        const cls = (i: number) => children[i].getAttribute('class') ?? '';
        for (const i of [0, 1, 4]) {
          expect(cls(i)).toContain('stroke-lines');
          expect(cls(i)).not.toContain('stroke-data');
        }
        expect(cls(3)).toContain('stroke-data');
        expect(cls(3)).not.toContain('stroke-lines');
        expect(cls(2)).toContain('fill-boxes');
      });
    },
  );

  it.each(['vertical', 'horizontal'] as const)(
    '9: %s puts a row className on the box and classNameMap on the row group',
    (orientation) => {
      const data = ROWS.map((r, i) => ({ ...r, className: i === 0 ? 'text-red-500' : undefined }));
      const value = { ...STATS, classNameMap: { B: 'text-blue-500' } };
      const props =
        orientation === 'vertical'
          ? { x: CAT, y: value }
          : { y: CAT, x: value };
      render(
        <BoxPlot
          id={`bp9-${orientation}`}
          style={STYLE}
          orientation={orientation as 'vertical'}
          data={data}
          {...(props as { x: typeof CAT; y: typeof value })}
        />,
      );
      const id = `bp9-${orientation}`;
      expect(mark(id, 0, 'box-plot-box').getAttribute('class')).toContain('text-red-500');
      expect(mark(id, 0, 'box-plot-cap-min').getAttribute('class')).not.toContain('text-red-500');
      const groups = rowsOf(id);
      expect(groups[1].getAttribute('class')).toContain('text-blue-500');
      expect(groups[1].getAttribute('data-category')).toBe('B');
      expect(groups[0].getAttribute('class')).not.toContain('text-blue-500');
    },
  );

  it.each(['vertical', 'horizontal'] as const)(
    '10: %s box is opacity-50 by default, overridable with classNames.boxes',
    (orientation) => {
      const props = (orientation === 'vertical' ? vProps : hProps) as typeof vProps;
      render(<BoxPlot id={`bp10a-${orientation}`} orientation={orientation as 'vertical'} {...props} />);
      render(
        <BoxPlot
          id={`bp10b-${orientation}`}
          orientation={orientation as 'vertical'}
          classNames={{ boxes: 'opacity-100' }}
          {...props}
        />,
      );
      const a = mark(`bp10a-${orientation}`, 0, 'box-plot-box').getAttribute('class')!;
      const b = mark(`bp10b-${orientation}`, 0, 'box-plot-box').getAttribute('class')!;
      expect(a.split(' ')).toContain('opacity-50');
      expect(b.split(' ')).toContain('opacity-100');
      expect(b.split(' ')).not.toContain('opacity-50');
    },
  );

  it.each(['vertical', 'horizontal'] as const)(
    '11: %s binned mode computes the quartiles with binDataStats',
    (orientation) => {
      const bin = { key: 'age', bin: { count: 3 } };
      const props = orientation === 'vertical' ? { x: bin, y: {} } : { y: bin, x: {} };
      const warn = spyWarn();
      render(
        <BoxPlot
          id={`bp11-${orientation}`}
          style={STYLE}
          data={RAW}
          valueKey='salary'
          {...(props as { x: typeof bin; y: object })}
        />,
      );
      const expected = binDataStats(RAW, bin, 'salary');
      const groups = rowsOf(`bp11-${orientation}`);
      expect(groups).toHaveLength(expected.length);
      groups.forEach((g, i) => {
        const d = (g as unknown as { __data__: Record<string, number> }).__data__;
        expect(d._min).toBe(expected[i].min);
        expect(d._q1).toBe(expected[i].q1);
        expect(d._median).toBe(expected[i].median);
        expect(d._q3).toBe(expected[i].q3);
        expect(d._max).toBe(expected[i].max);
        expect(g.querySelector('[data-testid="box-plot-box"]')).toBeTruthy();
      });
      expect(hasNaN(svgOf(`bp11-${orientation}`))).toBe(false);
      expect(warn).not.toHaveBeenCalled();
    },
  );

  it('12: vertical time scale positions boxes on their dates', () => {
    const weekly = ['2025-01-06', '2025-01-13', '2025-01-20', '2025-01-27'].map((week, i) => ({
      week,
      ...ROWS[i % 3],
    }));
    render(
      <BoxPlot
        id='bp12'
        style={STYLE}
        data={weekly}
        x={{ key: 'week', scalingFunction: 'time', time: { isISO: true } }}
        y={STATS}
      />,
    );
    const boxes = marksOf('bp12', 'box-plot-box');
    // 3 weekly steps -> 4 slots of 135px over [40, 580]; boxes are 80% of a slot.
    const slot = 540 / 4;
    boxes.forEach((b, i) => {
      expect(num(b, 'width')).toBeCloseTo(slot * 0.8, 6);
      expect(num(b, 'x')).toBeCloseTo(40 + slot * 0.1 + i * slot, 6);
    });
  });

  it('13: horizontal with y.scalingFunction "time" warns once and uses a band scale', () => {
    const warn = spyWarn();
    const data = ROWS.map((r, i) => ({ ...r, week: `2025-01-0${i + 1}` }));
    expect(() =>
      render(
        <BoxPlot
          id='bp13'
          style={STYLE}
          orientation='horizontal'
          data={data}
          y={{ key: 'week', scalingFunction: 'time' }}
          x={STATS}
        />,
      ),
    ).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      '[headless-charts] BoxPlot#bp13: y.scalingFunction "time" is only supported when orientation is "vertical" (dates on x); the category axis uses a band scale.',
    );
    const boxes = marksOf('bp13', 'box-plot-box');
    expect(boxes).toHaveLength(3);
    const ys = boxes.map((b) => num(b, 'y'));
    expect(ys[1] - ys[0]).toBeCloseTo(ys[2] - ys[1], 6);
    expect(num(boxes[0], 'height')).toBeCloseTo(num(boxes[2], 'height'), 6);
  });

  describe('14: value-axis pins', () => {
    // Vertical on 600x400: the value range is [360, 40].
    const yOf = (lo: number, hi: number, v: number) => 360 - ((v - lo) / (hi - lo)) * 320;
    const whiskerBottom = (id: string, row = 0) => num(mark(id, row, 'box-plot-whisker'), 'y1');
    const pinned = (id: string, pins: object) =>
      render(<BoxPlot id={id} style={STYLE} data={ROWS} x={CAT} y={{ ...STATS, ...pins }} />);

    it('start/end pin the domain, and 0 is honoured', () => {
      pinned('bp14a', { start: 0, end: 100 });
      expect(whiskerBottom('bp14a')).toBeCloseTo(yOf(0, 100, 10), 6);
    });
    it('min/max still pin', () => {
      pinned('bp14b', { min: 0, max: 200 });
      expect(whiskerBottom('bp14b')).toBeCloseTo(yOf(0, 200, 10), 6);
    });
    it('start beats min and end beats max', () => {
      pinned('bp14c', { start: 0, min: -100, end: 100, max: 500 });
      expect(whiskerBottom('bp14c')).toBeCloseTo(yOf(0, 100, 10), 6);
    });
    it('zero is not forced for all-positive data', () => {
      pinned('bp14d', {});
      // domain is the data extent [5, 90]: row C's min sits on the bottom
      expect(whiskerBottom('bp14d', 2)).toBeCloseTo(360, 6);
      expect(whiskerBottom('bp14d', 0)).toBeCloseTo(yOf(5, 90, 10), 6);
    });
  });

  it('15: padding.bar 0 leaves no gap; padding without bar falls back to 0.2', () => {
    render(<BoxPlot id='bp15a' style={STYLE} padding={{ bar: 0 }} {...vProps} />);
    render(<BoxPlot id='bp15b' style={STYLE} padding={{ left: 0 }} {...vProps} />);
    const a = marksOf('bp15a', 'box-plot-box');
    expect(num(a[0], 'width')).toBeCloseTo(540 / 3, 6);
    expect(num(a[1], 'x')).toBeCloseTo(num(a[0], 'x') + num(a[0], 'width'), 6);
    const b = marksOf('bp15b', 'box-plot-box');
    // scaleBand with padding 0.2 inner and outer: step = 540 / 3.2
    expect(num(b[0], 'width')).toBeCloseTo((540 / 3.2) * 0.8, 6);
  });

  it('16: one per-chart clip path, never url(#clip), not duplicated on redraw', () => {
    const { rerender } = render(
      <>
        <BoxPlot id='bp16a' style={STYLE} {...vProps} />
        <BoxPlot id='bp16b' style={STYLE} {...vProps} />
      </>,
    );
    rerender(
      <>
        <BoxPlot id='bp16a' style={STYLE} {...vProps} data={ROWS.slice(0, 2)} />
        <BoxPlot id='bp16b' style={STYLE} {...vProps} />
      </>,
    );
    for (const id of ['bp16a', 'bp16b']) {
      const clips = svgOf(id).querySelectorAll('clipPath');
      expect(clips).toHaveLength(1);
      expect(clips[0].id).toBe(`${id}-plot-clip`);
      expect(svgOf(id).querySelector('g.data')?.getAttribute('clip-path')).toBe(
        `url(#${id}-plot-clip)`,
      );
    }
    expect(document.querySelectorAll('[clip-path="url(#clip)"]')).toHaveLength(0);
  });

  it('17: one hit rect per row above the marks, hoverable even when the box is clipped', () => {
    render(
      <BoxPlot
        id='bp17'
        style={STYLE}
        tooltip={{}}
        data={ROWS}
        x={CAT}
        // pinned far above the data: every box is clipped away
        y={{ ...STATS, start: 200, end: 300 }}
      />,
    );
    const hits = Array.from(svgOf('bp17').querySelectorAll('[data-testid="box-plot-hit"]'));
    expect(hits).toHaveLength(3);
    hits.forEach((h) => {
      expect(h.parentElement?.getAttribute('class')).toBe('hits');
      expect(h.closest('g.data')).toBeNull();
      expect(h.getAttribute('fill')).toBe('transparent');
      expect(h.getAttribute('class')).toBeNull();
    });
    // the hit layer sits after (above) the data layer
    const data = svgOf('bp17').querySelector('g.data')!;
    expect(data.compareDocumentPosition(hits[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.mouseEnter(hits[1]);
    expect(tooltipOf('bp17')?.innerHTML).toContain('min: 15');
  });

  it('18: a new tooltip object neither redraws nor rebinds, and the latest html is used', () => {
    const { rerender } = render(
      <BoxPlot id='bp18' style={STYLE} tooltip={{ html: () => 'first' }} {...vProps} />,
    );
    const box = mark('bp18', 0, 'box-plot-box');
    rerender(<BoxPlot id='bp18' style={STYLE} tooltip={{ html: () => 'second' }} {...vProps} />);
    expect(mark('bp18', 0, 'box-plot-box')).toBe(box);
    fireEvent.mouseEnter(svgOf('bp18').querySelector('[data-testid="box-plot-hit"]')!);
    expect(tooltipOf('bp18')?.innerHTML).toBe('second');
  });

  describe('19: default tooltip HTML', () => {
    const hover = (id: string, row = 0) => {
      fireEvent.mouseEnter(svgOf(id).querySelectorAll('[data-testid="box-plot-hit"]')[row]);
      return tooltipOf(id)?.innerHTML;
    };
    const LITERAL = 'min: 10 <br> range: 20 to 40 <br> mid: 30 <br> max: 50';

    it('vertical and horizontal', () => {
      render(<BoxPlot id='bp19v' tooltip={{}} {...vProps} />);
      render(<BoxPlot id='bp19h' tooltip={{}} orientation='horizontal' {...hProps} />);
      expect(hover('bp19v')).toBe(LITERAL);
      expect(hover('bp19h')).toBe(LITERAL);
    });

    it('time-prefixed in vertical time mode', () => {
      render(
        <BoxPlot
          id='bp19t'
          tooltip={{}}
          data={[{ ...ROWS[0], week: '2025-01-06' }, { ...ROWS[1], week: '2025-01-13' }]}
          x={{ key: 'week', scalingFunction: 'time', time: { isISO: true } }}
          y={STATS}
        />,
      );
      expect(hover('bp19t')).toBe(`2025-01-06 <br> ${LITERAL}`);
    });

    it('a non-finite statistic prints n/a and draws no marks for that row', () => {
      const data = [ROWS[0], { ...ROWS[1], mid: Number.NaN }];
      render(<BoxPlot id='bp19n' style={STYLE} tooltip={{}} data={data} x={CAT} y={STATS} />);
      expect(hover('bp19n', 1)).toBe('min: 15 <br> range: 25 to 45 <br> mid: n/a <br> max: 70');
      expect(rowsOf('bp19n')[1].childElementCount).toBe(0);
      expect(rowsOf('bp19n')[0].childElementCount).toBe(5);
      expect(hasNaN(svgOf('bp19n'))).toBe(false);
    });
  });

  describe('20: drawing', () => {
    it('defaults to the final geometry, synchronously', () => {
      render(<BoxPlot id='bp20a' style={STYLE} {...vProps} />);
      const whisker = mark('bp20a', 0, 'box-plot-whisker');
      expect(num(whisker, 'y2')).toBeLessThan(num(whisker, 'y1'));
      expect(num(mark('bp20a', 0, 'box-plot-box'), 'height')).toBeGreaterThan(0);
      expect('__transition' in whisker).toBe(false);
    });

    it.each(['vertical', 'horizontal'] as const)(
      '%s: staggered start states and delays, then the final geometry',
      async (orientation) => {
        const id = `bp20-${orientation}`;
        const props = (orientation === 'vertical' ? vProps : hProps) as typeof vProps;
        render(
          <BoxPlot
            id={id}
            style={SQUARE}
            margin={EVEN_MARGIN}
            orientation={orientation as 'vertical'}
            drawing={{ duration: 200, delay: 50 }}
            {...props}
          />,
        );
        const [c1, c2, v1, v2] =
          orientation === 'vertical' ? ['x1', 'x2', 'y1', 'y2'] : ['y1', 'y2', 'x1', 'x2'];
        const [cPos, cSize, vPos, vSize] =
          orientation === 'vertical' ? ['x', 'width', 'y', 'height'] : ['y', 'height', 'x', 'width'];
        ROWS.forEach((_, i) => {
          const whisker = mark(id, i, 'box-plot-whisker');
          const capMin = mark(id, i, 'box-plot-cap-min');
          const box = mark(id, i, 'box-plot-box');
          const median = mark(id, i, 'box-plot-median');
          const capMax = mark(id, i, 'box-plot-cap-max');
          const start = num(box, cPos);
          const centre = start + num(box, cSize) / 2;
          // whisker collapsed at min, on the band centre
          expect(num(whisker, v1)).toBeCloseTo(num(whisker, v2), 6);
          expect(num(whisker, c1)).toBeCloseTo(centre, 6);
          // min cap collapsed on the band's start edge
          expect(num(capMin, c1)).toBeCloseTo(start, 6);
          expect(num(capMin, c2)).toBeCloseTo(start, 6);
          expect(num(capMin, v1)).toBeCloseTo(num(whisker, v1), 6);
          // median and max cap collapsed on the band centre
          for (const el of [median, capMax]) {
            expect(num(el, c1)).toBeCloseTo(centre, 6);
            expect(num(el, c2)).toBeCloseTo(centre, 6);
          }
          // box: band final, value extent collapsed at the median
          expect(num(box, cSize)).toBeGreaterThan(0);
          expect(num(box, vSize)).toBe(0);
          expect(num(box, vPos)).toBeCloseTo(num(median, v1), 6);
          // row i starts at i * 50 ms
          const schedules = Object.values(
            (whisker as unknown as { __transition: Record<string, { delay: number; duration: number }> })
              .__transition,
          );
          expect(schedules[0].delay).toBe(i * 50);
          expect(schedules[0].duration).toBe(200);
        });
        await waitFor(
          () => {
            const box = mark(id, 2, 'box-plot-box');
            expect(num(box, vSize)).toBeGreaterThan(0);
            const capMin = mark(id, 2, 'box-plot-cap-min');
            expect(num(capMin, c2) - num(capMin, c1)).toBeCloseTo(num(box, cSize), 3);
          },
          { timeout: 2000, interval: 25 },
        );
      },
    );
  });

  describe('21: interrupts', () => {
    it('changing data mid-transition ends on the new data with no leftover nodes', async () => {
      const drawing = { duration: 200 };
      const { rerender } = render(<BoxPlot id='bp21' style={STYLE} drawing={drawing} {...vProps} />);
      const old = mark('bp21', 0, 'box-plot-whisker');
      const next = ROWS.slice(0, 2).map((r) => ({ ...r, max: r.max + 10 }));
      rerender(<BoxPlot id='bp21' style={STYLE} drawing={drawing} {...vProps} data={next} />);
      expect('__transition' in old).toBe(false);
      expect(old.isConnected).toBe(false);
      expect(rowsOf('bp21')).toHaveLength(2);
      expect(svgOf('bp21').querySelectorAll('clipPath')).toHaveLength(1);
      expect(svgOf('bp21').querySelectorAll('[data-testid="box-plot-hit"]')).toHaveLength(2);
      // final geometry for the new data: row B's whisker reaches 80 (the domain max)
      await waitFor(() => expect(num(mark('bp21', 1, 'box-plot-whisker'), 'y2')).toBeCloseTo(40, 3), {
        timeout: 2000,
        interval: 25,
      });
    });

    it('unmounting mid-transition leaves no timers or errors', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { unmount } = render(
        <StrictMode>
          <BoxPlot id='bp21u' style={STYLE} drawing={{ duration: 200, delay: 20 }} {...vProps} />
        </StrictMode>,
      );
      const nodes = Array.from(svgOf('bp21u').querySelectorAll('line, rect'));
      expect(nodes.some((n) => '__transition' in n)).toBe(true);
      unmount();
      expect(nodes.some((n) => '__transition' in n)).toBe(false);
      await new Promise((r) => setTimeout(r, 300));
      expect(error).not.toHaveBeenCalled();
    });
  });

  it('22: toggling orientation redraws with no leftovers, one clip and one tooltip div', () => {
    const Toggle = () => {
      const [horizontal, setHorizontal] = useState(false);
      return (
        <>
          <button onClick={() => setHorizontal((h) => !h)}>toggle</button>
          {horizontal ? (
            <BoxPlot id='bp22' style={STYLE} tooltip={{}} orientation='horizontal' {...hProps} />
          ) : (
            <BoxPlot id='bp22' style={STYLE} tooltip={{}} orientation='vertical' {...vProps} />
          )}
        </>
      );
    };
    const { getByText } = render(<Toggle />);
    const before = num(marksOf('bp22', 'box-plot-box')[0], 'height');
    fireEvent.click(getByText('toggle'));
    const svg = svgOf('bp22');
    expect(rowsOf('bp22')).toHaveLength(3);
    expect(svg.querySelectorAll('[data-testid="box-plot-box"]')).toHaveLength(3);
    expect(svg.querySelectorAll('[data-testid="box-plot-hit"]')).toHaveLength(3);
    expect(svg.querySelectorAll('clipPath')).toHaveLength(1);
    expect(document.querySelectorAll('#tooltip-bp22')).toHaveLength(1);
    // now horizontal: boxes share a band height
    const boxes = marksOf('bp22', 'box-plot-box');
    expect(num(boxes[0], 'height')).toBeCloseTo(num(boxes[1], 'height'), 6);
    expect(num(boxes[0], 'height')).not.toBeCloseTo(before, 6);
  });

  it.each(['vertical', 'horizontal'] as const)(
    '23: %s zoom scales marks and hits along the value axis and rescales only it',
    (orientation) => {
      const id = `bp23-${orientation}`;
      const props = (orientation === 'vertical' ? vProps : hProps) as typeof vProps;
      render(
        <BoxPlot
          id={id}
          style={STYLE}
          orientation={orientation as 'vertical'}
          zooming={{ enabled: true, min: 1, max: 4 }}
          {...props}
        />,
      );
      const svg = svgOf(id);
      const valueAxis = svg.querySelector(orientation === 'vertical' ? '.yAxis' : '.axis--x')!;
      const categoryAxis = svg.querySelector(orientation === 'vertical' ? '.axis--x' : '.yAxis')!;
      const valueTicks = valueAxis.innerHTML;
      const categoryTicks = categoryAxis.innerHTML;
      svg.dispatchEvent(
        new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -200, clientX: 300, clientY: 200 }),
      );
      const pattern =
        orientation === 'vertical'
          ? /^translate\(0, [-\d.e]+\) scale\(1, ([\d.]+)\)$/
          : /^translate\([-\d.e]+, 0\) scale\(([\d.]+), 1\)$/;
      const t = rowsOf(id)[0].getAttribute('transform') ?? '';
      expect(t).toMatch(pattern);
      expect(Number(pattern.exec(t)![1])).toBeGreaterThan(1);
      expect(svg.querySelector('g.hits')?.getAttribute('transform')).toBe(t);
      expect(valueAxis.innerHTML).not.toBe(valueTicks);
      expect(categoryAxis.innerHTML).toBe(categoryTicks);
    },
  );

  it.each(['vertical', 'horizontal'] as const)(
    '24: %s empty data does not throw or produce NaN',
    (orientation) => {
      const props = (orientation === 'vertical' ? vProps : hProps) as typeof vProps;
      expect(() =>
        render(
          <BoxPlot id={`bp24-${orientation}`} style={STYLE} orientation={orientation as 'vertical'} {...props} data={[]} />,
        ),
      ).not.toThrow();
      const svg = svgOf(`bp24-${orientation}`);
      expect(svg.querySelectorAll('[data-testid="box-plot-box"]')).toHaveLength(0);
      expect(svg.querySelectorAll('.axis')).toHaveLength(2);
      expect(hasNaN(svg)).toBe(false);
    },
  );
});

describe('26: catalog', () => {
  const { resolveChartRequest, getChartMeta, chartCatalog, chartWrapperIndex } = pkg;

  it.each([
    ['BoxPlot', undefined],
    ['horizontal box plot', 'Horizontal box plot'],
    ['box plot (horizontal)', 'Horizontal box plot'],
    ['box plot', undefined],
    ['boxplot', undefined],
    ['box and whisker plot', undefined],
    ['quartile plot', undefined],
    ['vertical box plot', undefined],
    ['box and whisker chart', undefined],
    ['box chart', undefined],
    ['binned box plot', 'Binned box plot'],
    ['binned box plot (vertical)', 'Binned box plot'],
    ['box plot from raw data', 'Binned box plot'],
    ['grouped distribution plot', 'Binned box plot'],
    ['vertical box plot from raw data', 'Binned box plot'],
    ['distribution by band', 'Binned box plot'],
    ['time-scaled box plot', 'Time-scaled box plot'],
    ['time-scaled box plot (vertical)', 'Time-scaled box plot'],
    ['time series box plot', 'Time-scaled box plot'],
  ])('"%s" resolves to BoxPlot (variant %s)', (name, variant) => {
    const resolved = resolveChartRequest(name);
    expect(resolved?.chart.name).toBe('BoxPlot');
    expect(resolved?.variant?.name).toBe(variant);
    expect(resolved?.wrapper).toBeUndefined();
  });

  it('wrapper names resolve to BoxPlot with the wrapper and its variant', () => {
    const h = resolveChartRequest('BoxPlotH');
    expect(h?.chart.name).toBe('BoxPlot');
    expect(h?.wrapper).toBe('BoxPlotH');
    expect(h?.variant?.name).toBe('Horizontal box plot');
    expect(h?.variant?.how).toContain('orientation="horizontal"');
    const v = resolveChartRequest('BoxPlotV');
    expect(v?.chart.name).toBe('BoxPlot');
    expect(v?.wrapper).toBe('BoxPlotV');
    expect(v?.variant).toBeUndefined();
    expect(getChartMeta('BoxPlotV')?.name).toBe('BoxPlot');
    expect(getChartMeta('BoxPlotH')?.name).toBe('BoxPlot');
  });

  it('keeps the wrapper integrity rules', () => {
    const names = chartCatalog.map((c) => c.name);
    expect(names).toContain('BoxPlot');
    expect(names).not.toContain('BoxPlotH');
    expect(names).not.toContain('BoxPlotV');
    const wrappers = chartWrapperIndex.filter((e) => e.chart.name === 'BoxPlot');
    expect(wrappers.map((e) => [e.wrapper.name, e.wrapper.pins])).toEqual([
      ['BoxPlotH', 'orientation="horizontal"'],
      ['BoxPlotV', 'orientation="vertical"'],
    ]);
    const exported = pkg as Record<string, unknown>;
    wrappers.forEach(({ wrapper }) => expect(exported[wrapper.name]).toBeTypeOf('function'));
  });
});

it('27: BoxPlot, BoxPlotH and BoxPlotV are importable from the package root', () => {
  expect(pkg.BoxPlot).toBe(BoxPlot);
  expect(pkg.BoxPlotH).toBe(BoxPlotH);
  expect(pkg.BoxPlotV).toBe(BoxPlotV);
  // The four types (BoxPlotProps, BoxPlotHProps, BoxPlotVProps,
  // BoxPlotClassNames) and ChartOrientation are checked in BoxPlot.test-d.ts.
});
