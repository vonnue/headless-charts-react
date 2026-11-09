import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { decisionTree, resolveChartRequest } from '@/catalog';
import { resetDevWarnings } from '@/utils/devEnvironment';

import TreemapChart from '.';
import sample from './sample.json';

const STYLE = { width: '400px', height: '300px' } as const;
const VALUE = { key: 'amount' } as const;

type Node = {
  name: string;
  amount?: number;
  children?: Node[];
  [k: string]: unknown;
};

const cellsOf = (container: HTMLElement = document.body) =>
  Array.from(
    container.querySelectorAll<SVGElement>('[data-testid="treemap-cell"]')
  );
const hitsOf = (container: HTMLElement = document.body) =>
  Array.from(
    container.querySelectorAll<SVGElement>('[data-testid="treemap-hit"]')
  );
const labelsOf = (testid: string, container: HTMLElement = document.body) =>
  Array.from(
    container.querySelectorAll<SVGElement>(`[data-testid="${testid}"]`)
  );
const tooltipOf = (id: string): HTMLElement | null =>
  document.getElementById(`tooltip-${id}`);
const num = (el: Element | null, attr: string): number =>
  Number(el?.getAttribute(attr) ?? NaN);
const area = (el: Element) => num(el, 'width') * num(el, 'height');
const cellByName = (name: string) =>
  cellsOf().find((c) => c.getAttribute('data-name') === name)!;
const leaves = () => cellsOf().filter((c) => c.getAttribute('data-leaf') === 'true');
const internals = () =>
  cellsOf().filter((c) => c.getAttribute('data-leaf') === 'false');

const tinyTree: Node = {
  name: 'Root',
  children: [
    {
      name: 'A',
      children: [
        { name: 'a1', amount: 40 },
        { name: 'a2', amount: 20 },
      ],
    },
    {
      name: 'B',
      children: [
        { name: 'b1', amount: 30 },
        { name: 'b2', amount: 10 },
      ],
    },
  ],
};

describe('TreemapChart', () => {
  beforeEach(() => {
    resetDevWarnings();
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
  });

  afterEach(() => {
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
  });

  it('1: renders data-testid="treemap-chart" with role="img"', () => {
    render(
      <TreemapChart id='t1' data={tinyTree} value={VALUE} style={STYLE} />
    );
    const svg = screen.getByTestId('treemap-chart');
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('role')).toBe('img');
  });

  it('2: nested root — leaf areas ∝ values; total fills the plot within tile padding', () => {
    render(
      <TreemapChart
        id='t2'
        data={tinyTree}
        value={VALUE}
        tile={{ paddingInner: 0, paddingOuter: 0, paddingTop: 0 }}
        leavesOnly
        style={STYLE}
      />
    );
    const leafCells = leaves();
    expect(leafCells).toHaveLength(4);
    const byName = Object.fromEntries(
      leafCells.map((c) => [c.getAttribute('data-name')!, area(c)])
    );
    expect(byName.a1 / byName.a2).toBeCloseTo(2, 5);
    expect(byName.b1 / byName.b2).toBeCloseTo(3, 5);
    expect(byName.a1 / byName.b1).toBeCloseTo(40 / 30, 5);
    const total = leafCells.reduce((s, c) => s + area(c), 0);
    // padding all 0 → leaves fill the 400×300 plot.
    expect(total).toBeCloseTo(400 * 300, 0);
  });

  it('3: nested forest — synthetic root unpainted; top-level groups fill the plot', () => {
    const forest: Node[] = [
      { name: 'Ops', children: [{ name: 'Payroll', amount: 60 }] },
      { name: 'Growth', children: [{ name: 'Ads', amount: 40 }] },
    ];
    render(
      <TreemapChart
        id='t3'
        data={forest}
        value={VALUE}
        tile={{ paddingInner: 0, paddingOuter: 0, paddingTop: 0 }}
        style={STYLE}
      />
    );
    const cells = cellsOf();
    expect(cells.every((c) => c.getAttribute('data-name') !== '')).toBe(true);
    expect(cells.some((c) => c.getAttribute('data-depth') === '0')).toBe(false);
    const tops = cells.filter((c) => c.getAttribute('data-depth') === '1');
    expect(tops.map((c) => c.getAttribute('data-name')).sort()).toStrictEqual([
      'Growth',
      'Ops',
    ]);
    const total = cells.reduce((s, c) => s + area(c), 0);
    // With padding 0, painted area ≈ plot (groups + leaves share the same rects
    // with nesting; sum of all painted cells exceeds plot because parents
    // contain children). Top-level groups alone fill the plot.
    const topArea = tops.reduce((s, c) => s + area(c), 0);
    expect(topArea).toBeCloseTo(400 * 300, 0);
    expect(total).toBeGreaterThan(topArea);
  });

  it('4: missing / non-array children → node is a leaf', () => {
    const data: Node = {
      name: 'Root',
      children: [
        { name: 'LeafA', amount: 50 },
        { name: 'Odd', amount: 50, children: 'not-an-array' as unknown as Node[] },
      ],
    };
    render(
      <TreemapChart
        id='t4'
        data={data}
        value={VALUE}
        leavesOnly
        style={STYLE}
      />
    );
    const leafCells = leaves();
    expect(leafCells.map((c) => c.getAttribute('data-name')).sort()).toStrictEqual(
      ['LeafA', 'Odd']
    );
    expect(cellByName('Odd').getAttribute('data-leaf')).toBe('true');
    expect(cellByName('Odd').getAttribute('data-value')).toBe('50');
  });

  it('5: internal node with its own value — value ignored; layout = sum of descendant leaves', () => {
    const data: Node = {
      name: 'Root',
      amount: 999,
      children: [
        { name: 'A', amount: 999, children: [{ name: 'a1', amount: 40 }] },
        { name: 'B', children: [{ name: 'b1', amount: 60 }] },
      ],
    };
    render(
      <TreemapChart id='t5' data={data} value={VALUE} style={STYLE} />
    );
    expect(cellByName('Root').getAttribute('data-value')).toBe('100');
    expect(cellByName('A').getAttribute('data-value')).toBe('40');
    expect(cellByName('a1').getAttribute('data-value')).toBe('40');
    expect(cellByName('B').getAttribute('data-value')).toBe('60');
  });

  it('6: duplicate names allowed; colorBy "name" applies classNameMap to every match', () => {
    const data: Node = {
      name: 'Root',
      children: [
        { name: 'Twin', amount: 30 },
        { name: 'Twin', amount: 20 },
        { name: 'Other', amount: 10 },
      ],
    };
    render(
      <TreemapChart
        id='t6'
        data={data}
        value={VALUE}
        colorBy='name'
        classNameMap={{ Twin: 'fill-twin', Other: 'fill-other' }}
        leavesOnly
        style={STYLE}
      />
    );
    const twins = cellsOf().filter((c) => c.getAttribute('data-name') === 'Twin');
    expect(twins).toHaveLength(2);
    twins.forEach((c) => expect(c.getAttribute('class')).toContain('fill-twin'));
    expect(cellByName('Other').getAttribute('class')).toContain('fill-other');
  });

  it('7: default sort value-desc / name-asc; sort: false keeps input order', () => {
    const data: Node = {
      name: 'Root',
      children: [
        { name: 'b', amount: 10 },
        { name: 'a', amount: 10 },
        { name: 'c', amount: 30 },
      ],
    };
    const { unmount } = render(
      <TreemapChart
        id='t7a'
        data={data}
        value={VALUE}
        leavesOnly
        style={STYLE}
      />
    );
    // Default: value desc then name asc → c, a, b (painted parent-before-child;
    // with leavesOnly only leaves, in sorted sibling order).
    expect(leaves().map((c) => c.getAttribute('data-name'))).toStrictEqual([
      'c',
      'a',
      'b',
    ]);
    unmount();

    render(
      <TreemapChart
        id='t7b'
        data={data}
        value={VALUE}
        sort={false}
        leavesOnly
        style={STYLE}
      />
    );
    expect(leaves().map((c) => c.getAttribute('data-name'))).toStrictEqual([
      'b',
      'a',
      'c',
    ]);
  });

  it('8: tile.type switches tiling (squarify default); ratio only for squarify/resquarify', () => {
    const data: Node = {
      name: 'Root',
      children: [
        { name: 'a', amount: 50 },
        { name: 'b', amount: 30 },
        { name: 'c', amount: 20 },
      ],
    };
    const { unmount } = render(
      <TreemapChart
        id='t8a'
        data={data}
        value={VALUE}
        leavesOnly
        tile={{ paddingInner: 0, paddingOuter: 0, paddingTop: 0 }}
        style={STYLE}
      />
    );
    const squarify = leaves().map((c) => ({
      name: c.getAttribute('data-name'),
      x: num(c, 'x'),
      y: num(c, 'y'),
      w: num(c, 'width'),
      h: num(c, 'height'),
    }));
    unmount();

    const { unmount: uSlice } = render(
      <TreemapChart
        id='t8b'
        data={data}
        value={VALUE}
        leavesOnly
        tile={{
          type: 'slice',
          paddingInner: 0,
          paddingOuter: 0,
          paddingTop: 0,
        }}
        style={STYLE}
      />
    );
    const sliced = leaves().map((c) => ({
      name: c.getAttribute('data-name'),
      x: num(c, 'x'),
      y: num(c, 'y'),
      w: num(c, 'width'),
      h: num(c, 'height'),
    }));
    // slice differs from squarify: full-width rows stacked on y.
    expect(sliced).not.toStrictEqual(squarify);
    sliced.forEach((c) => expect(c.w).toBeCloseTo(400, 5));
    expect(sliced[0].y).toBeLessThan(sliced[1].y);
    uSlice();

    // dice: full-height columns stacked on x.
    const { unmount: uDice } = render(
      <TreemapChart
        id='t8b2'
        data={data}
        value={VALUE}
        leavesOnly
        tile={{
          type: 'dice',
          paddingInner: 0,
          paddingOuter: 0,
          paddingTop: 0,
        }}
        style={STYLE}
      />
    );
    const diced = leaves().map((c) => ({
      x: num(c, 'x'),
      y: num(c, 'y'),
      w: num(c, 'width'),
      h: num(c, 'height'),
    }));
    diced.forEach((c) => expect(c.h).toBeCloseTo(300, 5));
    expect(diced[0].x).toBeLessThan(diced[1].x);
    uDice();

    // ratio on non-squarify tile is ignored and must not throw.
    const { unmount: u2 } = render(
      <TreemapChart
        id='t8c'
        data={data}
        value={VALUE}
        leavesOnly
        tile={{ type: 'slice', ratio: 2 }}
        style={STYLE}
      />
    );
    expect(leaves()).toHaveLength(3);
    u2();

    render(
      <TreemapChart
        id='t8d'
        data={data}
        value={VALUE}
        leavesOnly
        tile={{ type: 'squarify', ratio: 1 }}
        style={STYLE}
      />
    );
    expect(leaves()).toHaveLength(3);
  });

  it('9: tile paddings change gaps; ChartProps padding/margin inset the plot', () => {
    const data: Node = {
      name: 'Root',
      children: [
        { name: 'a', amount: 50 },
        { name: 'b', amount: 50 },
      ],
    };
    const { unmount } = render(
      <TreemapChart
        id='t9a'
        data={data}
        value={VALUE}
        leavesOnly
        tile={{ paddingInner: 0, paddingOuter: 0, paddingTop: 0 }}
        style={STYLE}
      />
    );
    const tight = leaves().reduce((s, c) => s + area(c), 0);
    expect(tight).toBeCloseTo(400 * 300, 0);
    unmount();

    render(
      <TreemapChart
        id='t9b'
        data={data}
        value={VALUE}
        leavesOnly
        tile={{ paddingInner: 20, paddingOuter: 10, paddingTop: 0 }}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        padding={{ top: 10, right: 10, bottom: 10, left: 10 }}
        style={STYLE}
      />
    );
    const loose = leaves();
    const looseArea = loose.reduce((s, c) => s + area(c), 0);
    // Plot is 400-60 × 300-60 = 340×240; inner padding further shrinks cells.
    expect(looseArea).toBeLessThan(340 * 240);
    expect(looseArea).toBeLessThan(tight);
    // Cells sit inside the inset plot (margin+padding = 30).
    loose.forEach((c) => {
      expect(num(c, 'x')).toBeGreaterThanOrEqual(30);
      expect(num(c, 'y')).toBeGreaterThanOrEqual(30);
    });
  });

  it('10: default (leavesOnly omitted / false) — internals paint; paddingTop defaults to 16; header hosts labels.name', () => {
    render(
      <TreemapChart
        id='t10'
        data={tinyTree}
        value={VALUE}
        labels={{ name: true, minWidth: 1, minHeight: 1 }}
        style={STYLE}
      />
    );
    expect(internals().length).toBeGreaterThan(0);
    expect(leaves().length).toBeGreaterThan(0);
    // Root is painted as an internal with a header band.
    const root = cellByName('Root');
    expect(root.getAttribute('data-leaf')).toBe('false');
    // Header label for an internal group exists.
    const nameLabels = labelsOf('treemap-label-name');
    expect(nameLabels.some((t) => t.textContent === 'A')).toBe(true);
    expect(nameLabels.some((t) => t.textContent === 'Root')).toBe(true);
    // Default paddingTop 16 → child y starts ~16 below parent y (plus outer).
    const groupA = cellByName('A');
    const child = cellByName('a1');
    expect(num(child, 'y') - num(groupA, 'y')).toBeGreaterThanOrEqual(16);
  });

  it('11: leavesOnly: true — only leaf rects; internals unpainted; paddingTop defaults to 0', () => {
    render(
      <TreemapChart
        id='t11'
        data={tinyTree}
        value={VALUE}
        leavesOnly
        style={STYLE}
      />
    );
    expect(internals()).toHaveLength(0);
    expect(leaves()).toHaveLength(4);
    // No header inset by default → a leaf can start at y≈0 (within outer pad).
    const minY = Math.min(...leaves().map((c) => num(c, 'y')));
    expect(minY).toBeLessThan(5);
  });

  it('12: maxDepth: 1 — deeper mass rolls into depth-1; no deeper rects', () => {
    render(
      <TreemapChart
        id='t12'
        data={tinyTree}
        value={VALUE}
        maxDepth={1}
        style={STYLE}
      />
    );
    const cells = cellsOf();
    expect(cells.every((c) => num(c, 'data-depth') <= 1)).toBe(true);
    // A and B become painted leaves holding descendant totals.
    expect(cellByName('A').getAttribute('data-leaf')).toBe('true');
    expect(cellByName('A').getAttribute('data-value')).toBe('60');
    expect(cellByName('B').getAttribute('data-value')).toBe('40');
    expect(cells.some((c) => c.getAttribute('data-name') === 'a1')).toBe(false);
  });

  it('13: labels name/value/percent (ofParent/ofRoot/both); zero divisor → n/a; no NaN/Infinity', () => {
    const data: Node = {
      name: 'Root',
      children: [
        { name: 'A', amount: 0, children: [{ name: 'z', amount: 0 }] },
        {
          name: 'B',
          children: [
            { name: 'b1', amount: 75 },
            { name: 'b2', amount: 25 },
          ],
        },
      ],
    };
    render(
      <TreemapChart
        id='t13'
        data={data}
        value={VALUE}
        labels={{
          name: true,
          value: true,
          percent: 'both',
          minWidth: 1,
          minHeight: 1,
        }}
        style={STYLE}
      />
    );
    const valueLabels = labelsOf('treemap-label-value');
    expect(valueLabels.some((t) => t.textContent === '75')).toBe(true);
    expect(valueLabels.some((t) => t.textContent === '25')).toBe(true);

    const pcts = labelsOf('treemap-label-percent');
    expect(pcts.length).toBeGreaterThan(0);
    pcts.forEach((t) => {
      expect(t.textContent).not.toMatch(/NaN|Infinity/);
    });
    // b1 is 75% of parent B and of root (root total 100).
    const b1 = cellByName('b1');
    const b1Idx = b1.getAttribute('data-index');
    const b1Pcts = pcts.filter((t) => t.getAttribute('data-index') === b1Idx);
    expect(b1Pcts.map((t) => t.textContent)).toEqual(
      expect.arrayContaining(['75%', '75%'])
    );

    // Real single-object root: ofParent for Root itself is n/a (null parent).
    // Zero-value leaves are not painted, so no label on them.
    expect(cellsOf().some((c) => c.getAttribute('data-name') === 'z')).toBe(
      false
    );
  });

  it('14: below minWidth/minHeight — no label text; mark remains (headers gated on minWidth only)', () => {
    const data: Node = {
      name: 'Root',
      children: [
        { name: 'Big', amount: 90 },
        { name: 'Tiny', amount: 1 },
      ],
    };
    // Leaves: raise min so Tiny's label is suppressed; Big still labelled.
    const { unmount } = render(
      <TreemapChart
        id='t14a'
        data={data}
        value={VALUE}
        leavesOnly
        labels={{ name: true, minWidth: 200, minHeight: 18 }}
        tile={{ paddingInner: 0, paddingOuter: 0, paddingTop: 0 }}
        style={STYLE}
      />
    );
    expect(leaves()).toHaveLength(2);
    const leafNames = labelsOf('treemap-label-name').map((t) => t.textContent);
    expect(leafNames).toContain('Big');
    expect(leafNames).not.toContain('Tiny');
    unmount();

    // Headers: default paddingTop 16 < default minHeight 18, but header labels
    // are gated on minWidth only — so group names still appear.
    render(
      <TreemapChart
        id='t14b'
        data={tinyTree}
        value={VALUE}
        labels={{ name: true }}
        style={STYLE}
      />
    );
    const headerNames = labelsOf('treemap-label-name').map((t) => t.textContent);
    expect(headerNames).toEqual(expect.arrayContaining(['Root', 'A', 'B']));
  });

  it('15: labels never overflow their cell', () => {
    render(
      <TreemapChart
        id='t15'
        data={tinyTree}
        value={VALUE}
        labels={{
          name: true,
          value: true,
          percent: 'ofRoot',
          minWidth: 1,
          minHeight: 1,
        }}
        style={STYLE}
      />
    );
    const groups = labelsOf('treemap-label-group');
    expect(groups.length).toBeGreaterThan(0);
    groups.forEach((g) => {
      const clip = g.getAttribute('clip-path') ?? '';
      expect(clip).toMatch(/^url\(#t15-cell-clip-\d+\)$/);
      const idx = g.getAttribute('data-index');
      const clipRect = document.querySelector(`#t15-cell-clip-${idx} rect`);
      const cell = cellsOf().find((c) => c.getAttribute('data-index') === idx)!;
      expect(clipRect).not.toBeNull();
      expect(num(clipRect, 'width')).toBeLessThanOrEqual(num(cell, 'width') + 0.01);
      expect(num(clipRect, 'height')).toBeLessThanOrEqual(num(cell, 'height') + 0.01);
    });
  });

  it('16: negative / non-finite leaf → 0, not painted, one warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const data: Node = {
      name: 'Root',
      children: [
        { name: 'ok', amount: 50 },
        { name: 'neg', amount: -10 },
        { name: 'nan', amount: Number.NaN },
        { name: 'inf', amount: Number.POSITIVE_INFINITY },
      ],
    };
    const { rerender } = render(
      <TreemapChart
        id='t16'
        data={data}
        value={VALUE}
        leavesOnly
        style={STYLE}
      />
    );
    expect(leaves().map((c) => c.getAttribute('data-name'))).toStrictEqual([
      'ok',
    ]);
    rerender(
      <TreemapChart
        id='t16'
        data={data}
        value={VALUE}
        leavesOnly
        className='redraw'
        style={STYLE}
      />
    );
    const valueWarns = warn.mock.calls
      .map(([m]) => String(m))
      .filter((m) => m.includes('TreemapChart#t16') && m.includes('value'));
    expect(valueWarns).toHaveLength(1);
    warn.mockRestore();
  });

  it('17: zero-value leaf not painted; positive siblings lay out correctly', () => {
    render(
      <TreemapChart
        id='t17'
        data={sample}
        value={VALUE}
        leavesOnly
        tile={{ paddingInner: 0, paddingOuter: 0, paddingTop: 0 }}
        style={STYLE}
      />
    );
    const names = leaves().map((c) => c.getAttribute('data-name'));
    expect(names).not.toContain('Partnerships');
    expect(names).toContain('Payroll');
    expect(names).toContain('Ads');
    const total = leaves().reduce((s, c) => s + area(c), 0);
    expect(total).toBeCloseTo(400 * 300, 0);
  });

  it('18: empty data — no marks; shell remains; no throw', () => {
    expect(() =>
      render(
        <TreemapChart id='t18a' data={[]} value={VALUE} style={STYLE} />
      )
    ).not.toThrow();
    const svg = screen.getByTestId('treemap-chart');
    expect(svg).toBeTruthy();
    expect(cellsOf()).toHaveLength(0);
    expect(hitsOf()).toHaveLength(0);
    expect(svg.innerHTML).not.toMatch(/NaN/);
  });

  it('19: single leaf — one rect; ofRoot 100%', () => {
    render(
      <TreemapChart
        id='t19'
        data={{ name: 'Solo', amount: 42 }}
        value={VALUE}
        labels={{ percent: 'ofRoot', minWidth: 1, minHeight: 1 }}
        tile={{ paddingInner: 0, paddingOuter: 0, paddingTop: 0 }}
        style={STYLE}
      />
    );
    expect(cellsOf()).toHaveLength(1);
    const solo = cellByName('Solo');
    expect(num(solo, 'width')).toBeCloseTo(400, 5);
    expect(num(solo, 'height')).toBeCloseTo(300, 5);
    expect(labelsOf('treemap-label-percent')[0]?.textContent).toBe('100%');
  });

  it('20: classNameMap + colorBy "top" by top-level group; miss → value.className', () => {
    render(
      <TreemapChart
        id='t20'
        data={tinyTree}
        value={{ key: 'amount', className: 'fill-fallback' }}
        classNameMap={{ A: 'fill-group-a' }}
        colorBy='top'
        style={STYLE}
      />
    );
    // Descendants of A pick up A's class.
    expect(cellByName('a1').getAttribute('class')).toContain('fill-group-a');
    expect(cellByName('A').getAttribute('class')).toContain('fill-group-a');
    // B has no map entry → value.className.
    expect(cellByName('b1').getAttribute('class')).toContain('fill-fallback');
    expect(cellByName('B').getAttribute('class')).toContain('fill-fallback');
  });

  it('21: colorBy "value" ignored with one warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { rerender } = render(
      <TreemapChart
        id='t21'
        data={tinyTree}
        value={{ key: 'amount', className: 'fill-fallback' }}
        classNameMap={{ A: 'fill-group-a' }}
        colorBy='value'
        style={STYLE}
      />
    );
    // Falls back to 'top' behaviour.
    expect(cellByName('a1').getAttribute('class')).toContain('fill-group-a');
    rerender(
      <TreemapChart
        id='t21'
        data={tinyTree}
        value={{ key: 'amount', className: 'fill-fallback' }}
        classNameMap={{ A: 'fill-group-a' }}
        colorBy='value'
        className='redraw'
        style={STYLE}
      />
    );
    const colorWarns = warn.mock.calls
      .map(([m]) => String(m))
      .filter((m) => m.includes('TreemapChart#t21') && m.includes('colorBy'));
    expect(colorWarns).toHaveLength(1);
    warn.mockRestore();
  });

  it('22: tooltip default HTML has path, value, of-parent, of-root; whole-cell hit; html overrides', () => {
    const data: Node = {
      name: 'Root',
      children: [
        {
          name: 'A',
          children: [{ name: 'a1', amount: 40 }],
        },
        { name: 'B', children: [{ name: 'b1', amount: 60 }] },
      ],
    };
    const { unmount } = render(
      <TreemapChart
        id='t22a'
        data={data}
        value={VALUE}
        tooltip={{}}
        style={STYLE}
      />
    );
    expect(hitsOf()).toHaveLength(cellsOf().length);
    const a1 = cellByName('a1');
    const hit = hitsOf().find(
      (h) => h.getAttribute('data-index') === a1.getAttribute('data-index')
    )!;
    // Hit geometry matches the cell (whole cell, header included on internals).
    expect(num(hit, 'x')).toBeCloseTo(num(a1, 'x'), 5);
    expect(num(hit, 'y')).toBeCloseTo(num(a1, 'y'), 5);
    expect(num(hit, 'width')).toBeCloseTo(num(a1, 'width'), 5);
    expect(num(hit, 'height')).toBeCloseTo(num(a1, 'height'), 5);

    fireEvent.mouseEnter(hit, { clientX: 20, clientY: 20 });
    const tip = tooltipOf('t22a');
    expect(tip?.className).toContain('opacity-100');
    expect(tip?.innerHTML).toContain('Root › A › a1');
    expect(tip?.innerHTML).toContain('40');
    expect(tip?.innerHTML).toMatch(/of parent:/i);
    expect(tip?.innerHTML).toMatch(/of root:/i);
    // a1 is 100% of A (40/40) and 40% of root.
    expect(tip?.innerHTML).toContain('100%');
    expect(tip?.innerHTML).toContain('40%');
    unmount();

    render(
      <TreemapChart
        id='t22b'
        data={data}
        value={VALUE}
        tooltip={{
          html: (d) => `custom:${(d as { name: string }).name}`,
        }}
        style={STYLE}
      />
    );
    const hitB = hitsOf().find(
      (h) =>
        h.getAttribute('data-index') ===
        cellByName('b1').getAttribute('data-index')
    )!;
    fireEvent.mouseEnter(hitB, { clientX: 20, clientY: 20 });
    expect(tooltipOf('t22b')?.innerHTML).toBe('custom:b1');
  });

  it('23: title/description → <title>/<desc> + aria-*; else aria-label default / ariaLabel', () => {
    const { unmount } = render(
      <TreemapChart
        id='t23a'
        data={tinyTree}
        value={VALUE}
        title='Budget'
        description='By group'
        style={STYLE}
      />
    );
    const svg = screen.getByTestId('treemap-chart');
    expect(svg.querySelector('title')?.textContent).toBe('Budget');
    expect(svg.querySelector('desc')?.textContent).toBe('By group');
    expect(svg.getAttribute('aria-labelledby')).toBe('t23a-title');
    expect(svg.getAttribute('aria-describedby')).toBe('t23a-desc');
    expect(svg.getAttribute('aria-label')).toBeNull();
    unmount();

    const { unmount: u2 } = render(
      <TreemapChart id='t23b' data={tinyTree} value={VALUE} style={STYLE} />
    );
    expect(screen.getByTestId('treemap-chart').getAttribute('aria-label')).toBe(
      'Treemap chart'
    );
    u2();

    render(
      <TreemapChart
        id='t23c'
        data={tinyTree}
        value={VALUE}
        ariaLabel='Custom treemap'
        style={STYLE}
      />
    );
    expect(screen.getByTestId('treemap-chart').getAttribute('aria-label')).toBe(
      'Custom treemap'
    );
  });

  it('24: runtime prop changes redraw with no leftover nodes', () => {
    const { rerender } = render(
      <TreemapChart
        id='t24'
        data={tinyTree}
        value={VALUE}
        leavesOnly
        style={STYLE}
      />
    );
    expect(leaves()).toHaveLength(4);
    expect(internals()).toHaveLength(0);

    rerender(
      <TreemapChart id='t24' data={tinyTree} value={VALUE} style={STYLE} />
    );
    expect(internals().length).toBeGreaterThan(0);
    expect(leaves()).toHaveLength(4);

    rerender(
      <TreemapChart
        id='t24'
        data={{ name: 'Solo', amount: 9 }}
        value={VALUE}
        style={STYLE}
      />
    );
    expect(cellsOf()).toHaveLength(1);
    expect(cellByName('Solo')).toBeTruthy();
    expect(
      document.querySelectorAll('#t24 [data-testid="treemap-cell"]')
    ).toHaveLength(1);
  });

  it('25: catalog — aliases resolve; no reserved collisions; category distribution; form hierarchy; composition intent; Sunburst aliases not claimed', () => {
    expect(resolveChartRequest('treemap')?.chart.name).toBe('TreemapChart');
    expect(resolveChartRequest('squarified treemap')?.chart.name).toBe(
      'TreemapChart'
    );
    expect(resolveChartRequest('rectangular tree map')?.chart.name).toBe(
      'TreemapChart'
    );

    const meta = resolveChartRequest('TreemapChart')?.chart;
    expect(meta?.category).toBe('distribution');
    expect(meta?.data.form).toBe('hierarchy');
    expect(meta?.intents[0]).toBe('composition');

    expect(resolveChartRequest('heatmap')?.chart.name).not.toBe('TreemapChart');
    expect(resolveChartRequest('sunburst-style profile')?.chart.name).not.toBe(
      'TreemapChart'
    );
    expect(resolveChartRequest('sunburst')?.chart.name).not.toBe('TreemapChart');
    expect(resolveChartRequest('sunburst chart')?.chart.name).not.toBe(
      'TreemapChart'
    );
    expect(resolveChartRequest('radial treemap')?.chart.name).not.toBe(
      'TreemapChart'
    );

    const composition = decisionTree.find((b) => b.intent === 'composition');
    expect(composition?.options.some((o) => o.name === 'TreemapChart')).toBe(
      true
    );
  });
});
