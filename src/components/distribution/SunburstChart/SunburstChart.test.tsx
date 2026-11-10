import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { decisionTree, resolveChartRequest } from '@/catalog';
import { resetDevWarnings } from '@/utils/devEnvironment';
import {
  buildHierarchy,
  defaultHierarchyTooltipHtml,
  toHierarchyDatum,
  type HierarchyDatum,
} from '@/utils/hierarchy';

import SunburstChart from '.';
import sample from './sample.json';

const STYLE = { width: '400px', height: '400px' } as const;
const VALUE = { key: 'size' } as const;
const NO_PAD = { padAngle: 0, ringGap: 0, cornerRadius: 0 } as const;
const INSTANT = { duration: 0 } as const;
const TAU = 2 * Math.PI;
const SIZE = 400;
const R = SIZE / 2;

type Node = {
  name: string;
  size?: number;
  children?: Node[] | unknown;
};

/** Two levels under the root: A=60, B=40. Default sort puts A first. */
const tiny: Node = {
  name: 'Root',
  children: [
    {
      name: 'A',
      children: [
        { name: 'a1', size: 40 },
        { name: 'a2', size: 20 },
      ],
    },
    {
      name: 'B',
      children: [
        { name: 'b1', size: 30 },
        { name: 'b2', size: 10 },
      ],
    },
  ],
};

/** Three levels under the root, for rings / highlight / zoom tests. */
const deep: Node = {
  name: 'Root',
  children: [
    {
      name: 'A',
      children: [
        {
          name: 'A1',
          children: [
            { name: 'A1a', size: 40 },
            { name: 'A1b', size: 20 },
          ],
        },
        { name: 'A2', size: 20 },
      ],
    },
    { name: 'B', children: [{ name: 'B1', size: 20 }] },
  ],
};

const svgOf = () => screen.getByTestId('sunburst-chart');
const arcsOf = (root: ParentNode = svgOf()) =>
  Array.from(root.querySelectorAll<SVGElement>('[data-testid="sunburst-arc"]'));
const hitsOf = (root: ParentNode = svgOf()) =>
  Array.from(root.querySelectorAll<SVGElement>('[data-testid="sunburst-hit"]'));
const labelsOf = (root: ParentNode = svgOf()) =>
  Array.from(root.querySelectorAll<SVGElement>('[data-testid="sunburst-label"]'));
const centreOf = (root: ParentNode = svgOf()) =>
  root.querySelector<SVGCircleElement>('[data-testid="sunburst-centre"]');
const holeOf = (root: ParentNode = svgOf()) =>
  root.querySelector<SVGCircleElement>('[data-testid="sunburst-hole"]');
const plotOf = () => svgOf().querySelector('.sunburst-plot');
const arcByPath = (path: string) =>
  arcsOf().find((a) => a.getAttribute('data-path') === path);
const hitByPath = (path: string) =>
  hitsOf().find((h) => h.getAttribute('data-path') === path);
const labelByPath = (path: string) =>
  labelsOf().find((l) => l.getAttribute('data-path') === path);
const tooltipOf = (id: string) => document.getElementById(`tooltip-${id}`);
const num = (el: Element | null, attr: string) =>
  Number(el?.getAttribute(attr) ?? NaN);
const hasTransition = (node: Element | null) =>
  node !== null && '__transition' in node;
const d3On = (node: Element | null): unknown =>
  node !== null && '__on' in node
    ? (node as unknown as { __on: unknown }).__on
    : undefined;

type ArcGeom = { r0: number; r1: number; a0: number; a1: number };

const angleOf = (x: number, y: number) => Math.atan2(x, -y);
const normAngle = (a: number) => ((a % TAU) + TAU) % TAU;

const parseArc = (d: string | null): ArcGeom => {
  if (!d) return { r0: NaN, r1: NaN, a0: NaN, a1: NaN };
  const num = '-?\\d*\\.?\\d+(?:e[-+]?\\d+)?';
  const re = new RegExp(
    `([ML])(${num}),(${num})|A(${num}),(${num}),(${num}),([01]),([01]),(${num}),(${num})`,
    'gi'
  );
  type Cmd =
    | { type: 'M' | 'L'; x: number; y: number }
    | { type: 'A'; rx: number; large: boolean; x: number; y: number };
  const cmds: Cmd[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    if (m[1]) cmds.push({ type: m[1].toUpperCase() as 'M' | 'L', x: +m[2], y: +m[3] });
    else
      cmds.push({
        type: 'A',
        rx: +m[4],
        large: m[7] === '1',
        x: +m[9],
        y: +m[10],
      });
  }
  const radii = cmds.filter((c): c is Extract<Cmd, { type: 'A' }> => c.type === 'A').map((c) => c.rx);
  const r1 = radii.length ? Math.max(...radii) : 0;
  const r0 = radii.length ? Math.min(...radii) : 0;
  const firstM = cmds.find((c): c is Extract<Cmd, { type: 'M' | 'L' }> => c.type === 'M');
  const outer = cmds.filter(
    (c): c is Extract<Cmd, { type: 'A' }> => c.type === 'A' && Math.abs(c.rx - r1) < 1e-6
  );
  if (!firstM || !outer.length) return { r0, r1, a0: NaN, a1: NaN };
  if (outer.length >= 2 && outer[0].large)
    return { r0, r1, a0: 0, a1: TAU };
  const a0 = normAngle(angleOf(firstM.x, firstM.y));
  let a1 = normAngle(angleOf(outer[0].x, outer[0].y));
  if (a1 <= a0 + 1e-9) a1 += TAU;
  return { r0, r1, a0, a1 };
};

const spanOf = (g: ArcGeom) => g.a1 - g.a0;
const midAngle = (g: ArcGeom) => (g.a0 + g.a1) / 2;
/** Path radii are rounded to 3 decimals in the SVG `d` attribute. */
const closePx = (received: number, expected: number) =>
  expect(received).toBeCloseTo(expected, 2);
const tooltipHtml = (id: string) =>
  (tooltipOf(id)?.innerHTML ?? '').replace(/<br\s*\/?>/gi, '<br>');
const normalizeBr = (html: string) => html.replace(/<br\s*\/?>/gi, '<br>');

const renderChart = (
  props: Partial<ComponentProps<typeof SunburstChart>> & { id: string }
) =>
  render(
    <SunburstChart
      data={tiny}
      value={VALUE}
      style={STYLE}
      arc={NO_PAD}
      {...props}
    />
  );

describe('SunburstChart', () => {
  beforeEach(() => {
    resetDevWarnings();
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
  });

  afterEach(() => {
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
  });

  it('renders a centre disc and one arc + hit area per positive node', () => {
    render(
      <SunburstChart
        id='sunburst-smoke'
        data={sample}
        value={VALUE}
        style={STYLE}
      />
    );
    const svg = screen.getByTestId('sunburst-chart');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Sunburst chart');
    expect(svg.querySelectorAll('[data-testid="sunburst-centre"]')).toHaveLength(1);
    const arcs = svg.querySelectorAll('[data-testid="sunburst-arc"]');
    expect(arcs).toHaveLength(17);
    expect(svg.querySelectorAll('[data-testid="sunburst-hit"]')).toHaveLength(18);
    expect(svg.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it('1: renders data-testid="sunburst-chart" with role="img", which becomes "group" when zoom is on', () => {
    const { rerender } = renderChart({ id: 's1' });
    const svg = svgOf();
    expect(svg.getAttribute('data-testid')).toBe('sunburst-chart');
    expect(svg.getAttribute('role')).toBe('img');
    rerender(
      <SunburstChart
        id='s1'
        data={tiny}
        value={VALUE}
        style={STYLE}
        zoom
      />
    );
    expect(svgOf().getAttribute('role')).toBe('group');
  });

  it('2: default tooltip HTML and html callback datum match toHierarchyDatum / defaultHierarchyTooltipHtml for the same node', () => {
    const built = buildHierarchy({
      data: tiny,
      valueKey: 'size',
      nameKey: 'name',
    })!;
    const node = built.root
      .descendants()
      .find((n) => toHierarchyDatum(n).path.join('/') === 'Root/A/a1')!;
    const expected = toHierarchyDatum(node);

    const { unmount } = renderChart({ id: 's2a', tooltip: {} });
    fireEvent.mouseEnter(hitByPath('Root/A/a1')!, { clientX: 20, clientY: 20 });
    expect(tooltipHtml('s2a')).toBe(normalizeBr(defaultHierarchyTooltipHtml(expected)));
    unmount();

    let received: HierarchyDatum | undefined;
    renderChart({
      id: 's2b',
      tooltip: {
        html: (d) => {
          received = d as HierarchyDatum;
          return 'custom';
        },
      },
    });
    fireEvent.mouseEnter(hitByPath('Root/A/a1')!, { clientX: 20, clientY: 20 });
    expect(received).toStrictEqual(expected);
    expect(tooltipOf('s2b')?.innerHTML).toBe('custom');
  });

  it('3: nested root — angle spans ∝ values, siblings tile [startAngle, endAngle] with no overlap, and children sit inside their parent', () => {
    renderChart({ id: 's3' });
    const A = parseArc(arcByPath('Root/A')!.getAttribute('d'));
    const B = parseArc(arcByPath('Root/B')!.getAttribute('d'));
    const a1 = parseArc(arcByPath('Root/A/a1')!.getAttribute('d'));
    const a2 = parseArc(arcByPath('Root/A/a2')!.getAttribute('d'));
    const b1 = parseArc(arcByPath('Root/B/b1')!.getAttribute('d'));
    const b2 = parseArc(arcByPath('Root/B/b2')!.getAttribute('d'));

    const top = spanOf(A) + spanOf(B);
    expect(top).toBeCloseTo(TAU, 5);
    expect(spanOf(A) / top).toBeCloseTo(60 / 100, 5);
    expect(spanOf(B) / top).toBeCloseTo(40 / 100, 5);
    // Default sort: A (larger) starts at startAngle = 0, then B, no overlap.
    expect(A.a0).toBeCloseTo(0, 5);
    expect(A.a1).toBeCloseTo(B.a0, 5);
    expect(B.a1).toBeCloseTo(TAU, 5);

    expect(a1.a0).toBeCloseTo(A.a0, 5);
    expect(a2.a1).toBeCloseTo(A.a1, 5);
    expect(a1.a1).toBeCloseTo(a2.a0, 5);
    expect(b1.a0).toBeGreaterThanOrEqual(B.a0 - 1e-6);
    expect(b2.a1).toBeLessThanOrEqual(B.a1 + 1e-6);
  });

  it('4: forest — synthetic root is not painted or targeted; top-level groups form ring 1; centre is empty', () => {
    const forest: Node[] = [
      { name: 'A', children: [{ name: 'a1', size: 40 }] },
      { name: 'B', children: [{ name: 'b1', size: 60 }] },
    ];
    renderChart({ id: 's4', data: forest });
    expect(centreOf()).toBeNull();
    expect(svgOf().querySelector('[data-centre="true"]')).toBeNull();
    expect(arcsOf().map((a) => a.getAttribute('data-path')).sort()).toStrictEqual(
      ['A', 'A/a1', 'B', 'B/b1'].sort()
    );
    expect(arcsOf().some((a) => (a.getAttribute('data-path') ?? '').includes('synthetic'))).toBe(
      false
    );
    const depths = new Set(arcsOf().map((a) => a.getAttribute('data-depth')));
    expect(depths.has('0')).toBe(false);
    expect(arcByPath('A')!.getAttribute('data-depth')).toBe('1');
    expect(hitsOf().some((h) => h.getAttribute('data-centre') === 'true')).toBe(false);
  });

  it('5: missing or non-array children makes a node a leaf; an internal node\'s own value is ignored', () => {
    const data: Node = {
      name: 'Root',
      size: 999,
      children: [
        { name: 'Leaf', size: 70 },
        { name: 'Missing', size: 10 },
        { name: 'BadKids', size: 20, children: 'not-an-array' },
        {
          name: 'Internal',
          size: 500,
          children: [
            { name: 'x', size: 20 },
            { name: 'y', size: 10 },
          ],
        },
      ],
    };
    renderChart({ id: 's5', data });
    expect(arcByPath('Root/Leaf')).toBeTruthy();
    expect(arcByPath('Root/Missing')).toBeTruthy();
    expect(arcByPath('Root/BadKids')).toBeTruthy();
    expect(arcByPath('Root/Internal')).toBeTruthy();
    expect(arcByPath('Root/Internal/x')).toBeTruthy();
    // Internal's 500 is ignored; its span is the leaf sum 30 out of 70+10+20+30=130.
    const total =
      spanOf(parseArc(arcByPath('Root/Leaf')!.getAttribute('d'))) +
      spanOf(parseArc(arcByPath('Root/Missing')!.getAttribute('d'))) +
      spanOf(parseArc(arcByPath('Root/BadKids')!.getAttribute('d'))) +
      spanOf(parseArc(arcByPath('Root/Internal')!.getAttribute('d')));
    expect(
      spanOf(parseArc(arcByPath('Root/Internal')!.getAttribute('d'))) / total
    ).toBeCloseTo(30 / 130, 5);
    expect(
      spanOf(parseArc(arcByPath('Root/Leaf')!.getAttribute('d'))) / total
    ).toBeCloseTo(70 / 130, 5);
  });

  it('6: default sort is value descending then name ascending, clockwise from startAngle; sort: false keeps input order', () => {
    const data: Node = {
      name: 'Root',
      children: [
        { name: 'C', size: 10 },
        { name: 'A', size: 30 },
        { name: 'B', size: 30 },
      ],
    };
    const { unmount } = renderChart({ id: 's6a', data });
    const a = parseArc(arcByPath('Root/A')!.getAttribute('d'));
    const b = parseArc(arcByPath('Root/B')!.getAttribute('d'));
    const c = parseArc(arcByPath('Root/C')!.getAttribute('d'));
    // A and B share value 30; name asc puts A then B, then C. Clockwise from 0.
    expect(a.a0).toBeCloseTo(0, 5);
    expect(a.a1).toBeCloseTo(b.a0, 5);
    expect(b.a1).toBeCloseTo(c.a0, 5);
    expect(c.a1).toBeCloseTo(TAU, 5);
    unmount();

    renderChart({ id: 's6b', data, sort: false });
    const c2 = parseArc(arcByPath('Root/C')!.getAttribute('d'));
    const a2 = parseArc(arcByPath('Root/A')!.getAttribute('d'));
    const b2 = parseArc(arcByPath('Root/B')!.getAttribute('d'));
    expect(c2.a0).toBeCloseTo(0, 5);
    expect(c2.a1).toBeCloseTo(a2.a0, 5);
    expect(a2.a1).toBeCloseTo(b2.a0, 5);
    expect(b2.a1).toBeCloseTo(TAU, 5);
  });

  it('7: innerRadius 0 — disc radius is R/(L+1) and rings have equal thickness; innerRadius 0.4 — no disc, rings start at 0.4R, equal thickness', () => {
    const { unmount } = renderChart({ id: 's7a' });
    // tiny has L = 2 levels below the root.
    const t = R / (2 + 1);
    closePx(num(centreOf(), 'r'), t);
    const A = parseArc(arcByPath('Root/A')!.getAttribute('d'));
    const a1 = parseArc(arcByPath('Root/A/a1')!.getAttribute('d'));
    closePx(A.r0, t);
    closePx(A.r1 - A.r0, t);
    closePx(a1.r0, A.r1);
    closePx(a1.r1 - a1.r0, t);
    closePx(a1.r1, R);
    unmount();

    renderChart({ id: 's7b', innerRadius: 0.4 });
    expect(centreOf()).toBeNull();
    const hole = 0.4 * R;
    const tDonut = (R - hole) / 2;
    const Ad = parseArc(arcByPath('Root/A')!.getAttribute('d'));
    const a1d = parseArc(arcByPath('Root/A/a1')!.getAttribute('d'));
    closePx(Ad.r0, hole);
    closePx(Ad.r1 - Ad.r0, tDonut);
    closePx(a1d.r0, Ad.r1);
    closePx(a1d.r1 - a1d.r0, tDonut);
    closePx(a1d.r1, R);
  });

  it('8: out-of-range or non-finite innerRadius is clamped, with one warning', () => {
    const warn: MockInstance<typeof console.warn> = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { rerender, unmount } = renderChart({ id: 's8hi', innerRadius: 1.5 });
    expect(centreOf()).toBeNull();
    const A = parseArc(arcByPath('Root/A')!.getAttribute('d'));
    closePx(A.r0, 0.9 * R);
    rerender(
      <SunburstChart
        id='s8hi'
        data={tiny}
        value={VALUE}
        style={STYLE}
        arc={NO_PAD}
        innerRadius={1.5}
        className='redraw'
      />
    );
    expect(
      warn.mock.calls
        .map(([m]) => String(m))
        .filter((m) => m.includes('SunburstChart#s8hi') && m.includes('innerRadius'))
    ).toHaveLength(1);
    unmount();
    warn.mockClear();
    resetDevWarnings();

    const r2 = renderChart({ id: 's8nan', innerRadius: Number.NaN });
    expect(centreOf()).toBeTruthy();
    closePx(num(centreOf(), 'r'), R / 3);
    expect(
      warn.mock.calls
        .map(([m]) => String(m))
        .filter((m) => m.includes('SunburstChart#s8nan') && m.includes('innerRadius'))
    ).toHaveLength(1);
    r2.unmount();
    warn.mockRestore();
  });

  it('9: rings: 2 draws only two levels below the focus; maxDepth: 1 rolls deeper mass into depth 1 as a leaf; after zoom, rings reveals deeper nodes and maxDepth does not', () => {
    const { unmount } = renderChart({
      id: 's9a',
      data: deep,
      rings: 2,
    });
    const depths = arcsOf().map((a) => Number(a.getAttribute('data-depth')));
    expect(Math.max(...depths)).toBe(2);
    expect(arcByPath('Root/A/A1')).toBeTruthy();
    expect(arcByPath('Root/A/A1/A1a')).toBeUndefined();
    unmount();

    const r2 = renderChart({ id: 's9b', data: deep, maxDepth: 1 });
    expect(arcByPath('Root/A')).toBeTruthy();
    expect(arcByPath('Root/A/A1')).toBeUndefined();
    expect(arcByPath('Root/B/B1')).toBeUndefined();
    // A is a leaf (mass rolled in), so it should not zoom.
    const Aspan = spanOf(parseArc(arcByPath('Root/A')!.getAttribute('d')));
    const Bspan = spanOf(parseArc(arcByPath('Root/B')!.getAttribute('d')));
    expect(Aspan / (Aspan + Bspan)).toBeCloseTo(80 / 100, 5);
    r2.unmount();

    const onRings = vi.fn<(focus: HierarchyDatum | null) => void>();
    const r3 = renderChart({
      id: 's9c',
      data: deep,
      rings: 2,
      zoom: { onChange: onRings },
      drawing: INSTANT,
    });
    fireEvent.click(hitByPath('Root/A')!);
    expect(arcByPath('Root/A/A1/A1a')).toBeTruthy();
    expect(centreOf()?.getAttribute('data-path')).toBe('Root/A');
    r3.unmount();

    const onCap = vi.fn<(focus: HierarchyDatum | null) => void>();
    renderChart({
      id: 's9d',
      data: deep,
      maxDepth: 2,
      zoom: { onChange: onCap },
      drawing: INSTANT,
    });
    expect(arcByPath('Root/A/A1')).toBeTruthy();
    expect(arcByPath('Root/A/A1/A1a')).toBeUndefined();
    fireEvent.click(hitByPath('Root/A')!);
    expect(onCap).toHaveBeenCalled();
    expect(arcByPath('Root/A/A1')).toBeTruthy();
    expect(arcByPath('Root/A/A1/A1a')).toBeUndefined();
  });

  it('9b: with rings: 1 the outermost visible ring stays zoomable — nodes whose children sit beyond rings get role="button", tabindex, and zoom on click and Enter', () => {
    const onChange = vi.fn<(focus: HierarchyDatum | null) => void>();
    renderChart({
      id: 's9e',
      data: deep,
      rings: 1,
      zoom: { onChange },
      drawing: INSTANT,
    });
    expect(arcByPath('Root/A/A1')).toBeUndefined();
    const A = arcByPath('Root/A')!;
    expect(A.getAttribute('role')).toBe('button');
    expect(A.getAttribute('tabindex')).toBe('0');
    fireEvent.click(hitByPath('Root/A')!);
    expect(onChange).toHaveBeenCalledOnce();
    expect(centreOf()?.getAttribute('data-path')).toBe('Root/A');
    expect(arcByPath('Root/A/A1')).toBeTruthy();
    expect(arcByPath('Root/A/A1/A1a')).toBeUndefined();
    fireEvent.keyDown(svgOf(), { key: 'Escape' });
    const B = arcByPath('Root/B')!;
    B.focus();
    fireEvent.keyDown(B, { key: 'Enter' });
    expect(centreOf()?.getAttribute('data-path')).toBe('Root/B');
  });

  it('10: startAngle/endAngle (half circle) map spans into that range; centre and radius are unchanged; invalid angles fall back to the defaults with one warning', () => {
    const { unmount } = renderChart({ id: 's10a' });
    const discR = num(centreOf(), 'r');
    const outer = parseArc(arcByPath('Root/A/a1')!.getAttribute('d')).r1;
    const body = svgOf().querySelector('.sunburst-body')?.getAttribute('transform');
    unmount();

    const half = renderChart({ id: 's10b', startAngle: 0, endAngle: Math.PI });
    closePx(num(centreOf(), 'r'), discR);
    closePx(parseArc(arcByPath('Root/A/a1')!.getAttribute('d')).r1, outer);
    expect(svgOf().querySelector('.sunburst-body')?.getAttribute('transform')).toBe(body);
    const A = parseArc(arcByPath('Root/A')!.getAttribute('d'));
    const B = parseArc(arcByPath('Root/B')!.getAttribute('d'));
    expect(A.a0).toBeCloseTo(0, 5);
    expect(B.a1).toBeCloseTo(Math.PI, 5);
    expect(spanOf(A) + spanOf(B)).toBeCloseTo(Math.PI, 5);
    half.unmount();

    const warn: MockInstance<typeof console.warn> = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const r3 = renderChart({ id: 's10c', startAngle: 2, endAngle: 1 });
    const A2 = parseArc(arcByPath('Root/A')!.getAttribute('d'));
    const B2 = parseArc(arcByPath('Root/B')!.getAttribute('d'));
    expect(spanOf(A2) + spanOf(B2)).toBeCloseTo(TAU, 5);
    r3.rerender(
      <SunburstChart
        id='s10c'
        data={tiny}
        value={VALUE}
        style={STYLE}
        arc={NO_PAD}
        startAngle={2}
        endAngle={1}
        className='redraw'
      />
    );
    expect(
      warn.mock.calls
        .map(([m]) => String(m))
        .filter((m) => m.includes('SunburstChart#s10c') && m.includes('startAngle'))
    ).toHaveLength(1);
    warn.mockRestore();
  });

  it('11: arc.padAngle, ringGap and cornerRadius change the arc geometry; defaults are 0.005, 1 and 0', () => {
    const { unmount } = render(
      <SunburstChart id='s11a' data={tiny} value={VALUE} style={STYLE} />
    );
    const defD = arcByPath('Root/A')!.getAttribute('d');
    unmount();

    const r2 = render(
      <SunburstChart
        id='s11b'
        data={tiny}
        value={VALUE}
        style={STYLE}
        arc={{ padAngle: 0.005, ringGap: 1, cornerRadius: 0 }}
      />
    );
    expect(arcByPath('Root/A')!.getAttribute('d')).toBe(defD);
    r2.unmount();

    const r3 = render(
      <SunburstChart
        id='s11c'
        data={tiny}
        value={VALUE}
        style={STYLE}
        arc={{ padAngle: 0.2, ringGap: 1, cornerRadius: 0 }}
      />
    );
    const padded = arcByPath('Root/A')!.getAttribute('d');
    expect(padded).not.toBe(defD);
    r3.unmount();

    const r4 = render(
      <SunburstChart
        id='s11d'
        data={tiny}
        value={VALUE}
        style={STYLE}
        arc={{ padAngle: 0.005, ringGap: 8, cornerRadius: 0 }}
      />
    );
    const gapped = parseArc(arcByPath('Root/A')!.getAttribute('d'));
    const defG = parseArc(defD);
    expect(gapped.r1 - gapped.r0).toBeLessThan(defG.r1 - defG.r0 - 1);
    r4.unmount();

    render(
      <SunburstChart
        id='s11e'
        data={tiny}
        value={VALUE}
        style={STYLE}
        arc={{ padAngle: 0.005, ringGap: 1, cornerRadius: 8 }}
      />
    );
    expect(arcByPath('Root/A')!.getAttribute('d')).not.toBe(defD);
  });

  it('12: zero-value leaf has no sunburst-arc and no hit path; siblings fill the parent span', () => {
    const data: Node = {
      name: 'Root',
      children: [
        { name: 'A', size: 60 },
        { name: 'Zero', size: 0 },
        { name: 'B', size: 40 },
      ],
    };
    renderChart({ id: 's12', data });
    expect(arcByPath('Root/Zero')).toBeUndefined();
    expect(hitByPath('Root/Zero')).toBeUndefined();
    const A = parseArc(arcByPath('Root/A')!.getAttribute('d'));
    const B = parseArc(arcByPath('Root/B')!.getAttribute('d'));
    expect(A.a0).toBeCloseTo(0, 5);
    expect(A.a1).toBeCloseTo(B.a0, 5);
    expect(B.a1).toBeCloseTo(TAU, 5);
    expect(spanOf(A) / (spanOf(A) + spanOf(B))).toBeCloseTo(0.6, 5);
  });

  it('13: a negative or NaN leaf counts as 0, is not painted, and triggers one warning; all zeros give an empty shell', () => {
    const warn: MockInstance<typeof console.warn> = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const data: Node = {
      name: 'Root',
      children: [
        { name: 'ok', size: 50 },
        { name: 'neg', size: -10 },
        { name: 'nan', size: Number.NaN },
      ],
    };
    const { rerender, unmount } = renderChart({ id: 's13a', data });
    expect(arcsOf().map((a) => a.getAttribute('data-path'))).toStrictEqual(['Root/ok']);
    expect(hitByPath('Root/neg')).toBeUndefined();
    rerender(
      <SunburstChart
        id='s13a'
        data={data}
        value={VALUE}
        style={STYLE}
        arc={NO_PAD}
        className='redraw'
      />
    );
    expect(
      warn.mock.calls
        .map(([m]) => String(m))
        .filter((m) => m.includes('SunburstChart#s13a') && m.includes('value'))
    ).toHaveLength(1);
    unmount();
    warn.mockClear();
    resetDevWarnings();

    renderChart({
      id: 's13b',
      data: { name: 'Root', children: [{ name: 'z', size: 0 }] },
    });
    expect(arcsOf()).toHaveLength(0);
    expect(hitsOf()).toHaveLength(0);
    expect(centreOf()).toBeNull();
    expect(svgOf()).toBeTruthy();
    expect(svgOf().innerHTML).not.toMatch(/NaN|Infinity/);
    warn.mockRestore();
  });

  it('14: empty data gives no marks, keeps the shell, and does not throw; a single-leaf root gives a disc only, and one full ring in donut mode', () => {
    const empty = renderChart({ id: 's14a', data: [] });
    expect(svgOf()).toBeTruthy();
    expect(arcsOf()).toHaveLength(0);
    expect(hitsOf()).toHaveLength(0);
    expect(centreOf()).toBeNull();
    expect(svgOf().innerHTML).not.toMatch(/NaN/);
    empty.unmount();

    const { unmount } = renderChart({ id: 's14b', data: null as unknown as Node });
    expect(arcsOf()).toHaveLength(0);
    unmount();

    const r3 = renderChart({ id: 's14c', data: { name: 'Solo', size: 42 } });
    expect(centreOf()?.getAttribute('data-path')).toBe('Solo');
    expect(arcsOf()).toHaveLength(0);
    expect(hitsOf().filter((h) => h.getAttribute('data-centre') === 'true')).toHaveLength(1);
    r3.unmount();

    renderChart({
      id: 's14d',
      data: { name: 'Solo', size: 42 },
      innerRadius: 0.4,
    });
    expect(centreOf()).toBeNull();
    expect(arcsOf()).toHaveLength(1);
    const ring = parseArc(arcsOf()[0].getAttribute('d'));
    expect(spanOf(ring)).toBeCloseTo(TAU, 5);
    closePx(ring.r0, 0.4 * R);
  });

  it("15: colorBy 'top' colours the whole wedge by the top-level ancestor; a miss falls back to value.className; 'depth' and 'name' key by depth and name; 'value' is treated as 'top' with one warning; no fill is set by default", () => {
    const { unmount } = renderChart({
      id: 's15a',
      value: { key: 'size', className: 'fill-fallback' },
      classNameMap: { A: 'fill-group-a' },
      colorBy: 'top',
    });
    expect(arcByPath('Root/A')!.getAttribute('class')).toContain('fill-group-a');
    expect(arcByPath('Root/A/a1')!.getAttribute('class')).toContain('fill-group-a');
    expect(arcByPath('Root/B')!.getAttribute('class')).toContain('fill-fallback');
    expect(arcByPath('Root/B/b1')!.getAttribute('class')).toContain('fill-fallback');
    expect(centreOf()!.getAttribute('class')).toContain('fill-fallback');
    expect(arcByPath('Root/A')!.getAttribute('fill')).toBeNull();
    unmount();

    const r2 = renderChart({
      id: 's15b',
      classNameMap: { '1': 'fill-d1', '2': 'fill-d2' },
      colorBy: 'depth',
    });
    expect(arcByPath('Root/A')!.getAttribute('class')).toContain('fill-d1');
    expect(arcByPath('Root/A/a1')!.getAttribute('class')).toContain('fill-d2');
    r2.unmount();

    const r3 = renderChart({
      id: 's15c',
      classNameMap: { a1: 'fill-by-name' },
      colorBy: 'name',
    });
    expect(arcByPath('Root/A/a1')!.getAttribute('class')).toContain('fill-by-name');
    expect(arcByPath('Root/A')!.getAttribute('class')).not.toContain('fill-by-name');
    r3.unmount();

    const warn: MockInstance<typeof console.warn> = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { rerender } = renderChart({
      id: 's15d',
      value: { key: 'size', className: 'fill-fallback' },
      classNameMap: { A: 'fill-group-a' },
      colorBy: 'value',
    });
    expect(arcByPath('Root/A/a1')!.getAttribute('class')).toContain('fill-group-a');
    rerender(
      <SunburstChart
        id='s15d'
        data={tiny}
        value={{ key: 'size', className: 'fill-fallback' }}
        classNameMap={{ A: 'fill-group-a' }}
        colorBy='value'
        style={STYLE}
        className='redraw'
      />
    );
    expect(
      warn.mock.calls
        .map(([m]) => String(m))
        .filter((m) => m.includes('SunburstChart#s15d') && m.includes('colorBy'))
    ).toHaveLength(1);
    warn.mockRestore();
  });

  it("16: labels name, value and percent (ofParent, ofRoot, both) render; zero divisor is 'n/a'; no NaN or Infinity", () => {
    const labelStyle = { width: '800px', height: '800px' } as const;
    const { unmount } = renderChart({
      id: 's16a',
      style: labelStyle,
      labels: { name: true, value: true, percent: 'ofParent', minArcLength: 1, minThickness: 1 },
    });
    const a1 = labelByPath('Root/A/a1')!;
    expect(a1.textContent).toContain('a1');
    expect(a1.textContent).toContain('40');
    // a1 is 40/60 of A ≈ 66.7%
    expect(a1.textContent).toMatch(/66\.7%/);
    expect(svgOf().innerHTML).not.toMatch(/NaN|Infinity/);
    unmount();

    const r2 = renderChart({
      id: 's16b',
      style: labelStyle,
      labels: { percent: 'ofRoot', minArcLength: 1, minThickness: 1 },
    });
    expect(labelByPath('Root/A/a1')!.textContent).toBe('40%');
    r2.unmount();

    const r3 = renderChart({
      id: 's16c',
      style: labelStyle,
      labels: { percent: 'both', minArcLength: 1, minThickness: 1 },
    });
    const both = labelByPath('Root/A/a1')!.textContent ?? '';
    expect(both).toMatch(/66\.7%/);
    expect(both).toMatch(/40%/);
    r3.unmount();

    // Real root has no parent, so ofParent is n/a; ofRoot is 100%.
    renderChart({
      id: 's16d',
      style: labelStyle,
      labels: { percent: 'both', minArcLength: 1, minThickness: 1 },
    });
    const disc = labelsOf().find((l) => l.getAttribute('data-centre') === 'true');
    expect(disc?.textContent).toContain('n/a');
    expect(disc?.textContent).toContain('100%');
    expect(svgOf().innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it('17: fit-or-hide — below minArcLength or minThickness there is no label, but the arc and tooltip stay; long text is truncated with … within the ring thickness', () => {
    const { unmount } = renderChart({
      id: 's17a',
      labels: { name: true, minArcLength: 1e6, minThickness: 1 },
      tooltip: {},
    });
    // Arc labels are gated on minArcLength. The disc label is gated on
    // minThickness only (impl-63 deviation 6).
    expect(labelByPath('Root/A/a1')).toBeUndefined();
    expect(labelByPath('Root/A')).toBeUndefined();
    expect(arcByPath('Root/A/a1')).toBeTruthy();
    fireEvent.mouseEnter(hitByPath('Root/A/a1')!, { clientX: 20, clientY: 20 });
    expect(tooltipOf('s17a')?.className).toContain('opacity-100');
    unmount();

    const r2 = renderChart({
      id: 's17b',
      labels: { name: true, minArcLength: 1, minThickness: 1e6 },
    });
    expect(labelsOf().length).toBe(0);
    expect(arcByPath('Root/A')).toBeTruthy();
    r2.unmount();

    // 200x200, L = 1, t = 50. Available width is t - 4 = 46px ≈ 7 chars
    // at 6px/char, so a 26-character name must truncate with ….
    const longName = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const long: Node = {
      name: 'Root',
      children: [{ name: longName, size: 10 }],
    };
    render(
      <SunburstChart
        id='s17c'
        data={long}
        value={VALUE}
        style={{ width: '200px', height: '200px' }}
        arc={NO_PAD}
        labels={{ name: true, minArcLength: 1, minThickness: 10 }}
      />
    );
    const text = labelByPath(`Root/${longName}`)?.textContent ?? '';
    expect(text.includes('…')).toBe(true);
    expect(text.endsWith('…')).toBe(true);
    expect(text.length).toBeLessThan(longName.length);
    expect(text).not.toBe(longName);
  });

  it('18: label orientation is radial; labels on the left half are flipped so they are never upside-down; the disc label is horizontal', () => {
    const data: Node = {
      name: 'Root',
      children: [
        { name: 'Right', size: 50 },
        { name: 'Left', size: 50 },
      ],
    };
    renderChart({
      id: 's18',
      data,
      sort: false,
      labels: { name: true, minArcLength: 1, minThickness: 1 },
    });
    const right = labelByPath('Root/Right')!;
    const left = labelByPath('Root/Left')!;
    const disc = labelsOf().find((l) => l.getAttribute('data-centre') === 'true')!;
    expect(right.getAttribute('data-flipped')).toBe('false');
    expect(left.getAttribute('data-flipped')).toBe('true');
    const rT = right.getAttribute('transform') ?? '';
    const lT = left.getAttribute('transform') ?? '';
    expect(rT).toMatch(/rotate\(/);
    expect(lT).toMatch(/rotate\(/);
    // Left half adds 180° so the text is not upside-down.
    const rot = (t: string) => Number(/rotate\(([-.\d]+)/.exec(t)?.[1]);
    const midRight = midAngle(parseArc(arcByPath('Root/Right')!.getAttribute('d')));
    const midLeft = midAngle(parseArc(arcByPath('Root/Left')!.getAttribute('d')));
    expect(rot(rT)).toBeCloseTo((midRight * 180) / Math.PI - 90, 3);
    expect(rot(lT)).toBeCloseTo((midLeft * 180) / Math.PI - 90 + 180, 3);
    expect(disc.getAttribute('transform')).toBeNull();
    expect(disc.getAttribute('data-flipped')).toBeNull();
  });

  it('19: tooltip (tooltip={{}}) default HTML shows the path joined with ›, the value, of parent and of root; html overrides it and receives a HierarchyDatum', () => {
    const { unmount } = renderChart({ id: 's19a', tooltip: {} });
    fireEvent.mouseEnter(hitByPath('Root/A/a1')!, { clientX: 20, clientY: 20 });
    const html = tooltipOf('s19a')?.innerHTML ?? '';
    expect(html).toContain('Root › A › a1');
    expect(html).toContain('40');
    expect(html).toMatch(/of parent:/i);
    expect(html).toMatch(/of root:/i);
    expect(html).toContain('66.7%');
    expect(html).toContain('40%');
    unmount();

    const htmlFn = vi.fn<(d: unknown) => string>((d) => {
      const datum = d as HierarchyDatum;
      expect(datum).toMatchObject({
        name: 'b1',
        value: 30,
        depth: 2,
        path: ['Root', 'B', 'b1'],
      });
      return `custom:${datum.name}`;
    });
    renderChart({ id: 's19b', tooltip: { html: htmlFn } });
    fireEvent.mouseEnter(hitByPath('Root/B/b1')!, { clientX: 20, clientY: 20 });
    expect(htmlFn).toHaveBeenCalledOnce();
    expect(tooltipOf('s19b')?.innerHTML).toBe('custom:b1');
  });

  it('20: a leaf spanning less than 1px at mid-radius is hoverable through a hit path at least 8px wide; pad gaps are hoverable; painted arcs have no listeners; each hover fires the handler once', () => {
    const data: Node = {
      name: 'Root',
      children: [
        { name: 'big', size: 100000 },
        { name: 'tiny', size: 1 },
      ],
    };
    const html = vi.fn<() => string>(() => 'tip');
    const { unmount } = renderChart({
      id: 's20a',
      data,
      tooltip: { html },
    });
    const hit = hitByPath('Root/tiny')!;
    const geom = parseArc(hit.getAttribute('d'));
    const midR = (geom.r0 + geom.r1) / 2;
    expect(spanOf(geom) * midR).toBeGreaterThanOrEqual(8 - 1e-3);
    const mark = parseArc(arcByPath('Root/tiny')!.getAttribute('d'));
    expect((mark.a1 - mark.a0) * ((mark.r0 + mark.r1) / 2)).toBeLessThan(1);
    fireEvent.mouseEnter(hit, { clientX: 20, clientY: 20 });
    expect(html).toHaveBeenCalledOnce();
    expect(tooltipOf('s20a')?.innerHTML).toBe('tip');
    arcsOf().forEach((a) => expect(d3On(a)).toBeUndefined());
    unmount();

    const html2 = vi.fn<() => string>(() => 'gap');
    render(
      <SunburstChart
        id='s20b'
        data={tiny}
        value={VALUE}
        style={STYLE}
        arc={{ padAngle: 0.2, ringGap: 0, cornerRadius: 0 }}
        tooltip={{ html: html2 }}
      />
    );
    const markA = parseArc(arcByPath('Root/A')!.getAttribute('d'));
    const markB = parseArc(arcByPath('Root/B')!.getAttribute('d'));
    const hitA = parseArc(hitByPath('Root/A')!.getAttribute('d'));
    const hitB = parseArc(hitByPath('Root/B')!.getAttribute('d'));
    // Hits use padAngle 0, so they cover the gap the painted arcs leave.
    expect(spanOf(hitA)).toBeGreaterThan(spanOf(markA));
    expect(spanOf(hitB)).toBeGreaterThan(spanOf(markB));
    expect(hitA.a1).toBeGreaterThan(markA.a1);
    fireEvent.mouseEnter(hitByPath('Root/A')!, { clientX: 20, clientY: 20 });
    expect(html2).toHaveBeenCalledOnce();
  });

  it('21: highlight (default) — hovering a depth-3 arc sets data-highlighted on it, its ancestors and the disc, and data-dimmed on every other arc; mouseleave clears both; highlight: false sets no attributes', () => {
    const { unmount } = renderChart({ id: 's21a', data: deep });
    fireEvent.mouseEnter(hitByPath('Root/A/A1/A1a')!, { clientX: 20, clientY: 20 });
    const lit = ['Root', 'Root/A', 'Root/A/A1', 'Root/A/A1/A1a'];
    expect(centreOf()?.getAttribute('data-highlighted')).toBe('true');
    expect(centreOf()?.getAttribute('data-dimmed')).toBeNull();
    expect(arcByPath('Root/A')!.getAttribute('data-highlighted')).toBe('true');
    expect(arcByPath('Root/A/A1')!.getAttribute('data-highlighted')).toBe('true');
    expect(arcByPath('Root/A/A1/A1a')!.getAttribute('data-highlighted')).toBe('true');
    const others = [...arcsOf(), centreOf()!].filter(
      (el) => !lit.includes(el.getAttribute('data-path') ?? '')
    );
    others.forEach((el) => {
      expect(el.getAttribute('data-dimmed')).toBe('true');
      expect(el.getAttribute('data-highlighted')).toBeNull();
    });
    fireEvent.mouseLeave(hitByPath('Root/A/A1/A1a')!);
    expect(svgOf().querySelectorAll('[data-highlighted],[data-dimmed]')).toHaveLength(0);
    unmount();

    renderChart({ id: 's21b', data: deep, highlight: false });
    fireEvent.mouseEnter(hitByPath('Root/A/A1/A1a')!, { clientX: 20, clientY: 20 });
    expect(svgOf().querySelectorAll('[data-highlighted],[data-dimmed]')).toHaveLength(0);
  });

  it('22: tooltip stability — re-rendering the parent with a new tooltip object identity keeps the same sunburst-arc elements and does not rebind listeners; the latest tooltip.html is used on the next hover', () => {
    const first = vi.fn<() => string>(() => 'first');
    const second = vi.fn<() => string>(() => 'second');
    const { rerender } = renderChart({ id: 's22', tooltip: { html: first } });
    const arc = arcByPath('Root/A/a1')!;
    const hit = hitByPath('Root/A/a1')!;
    const listeners = d3On(hit);
    expect(listeners).toBeTruthy();

    rerender(
      <SunburstChart
        id='s22'
        data={tiny}
        value={VALUE}
        style={STYLE}
        arc={NO_PAD}
        tooltip={{ html: second }}
      />
    );
    expect(arcByPath('Root/A/a1')).toBe(arc);
    expect(hitByPath('Root/A/a1')).toBe(hit);
    expect(d3On(hit)).toBe(listeners);

    fireEvent.mouseEnter(hit, { clientX: 20, clientY: 20 });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    expect(tooltipOf('s22')?.innerHTML).toBe('second');
  });

  it('23: zoom off (default) — clicking does not change the geometry, and no tabindex or role="button" attributes are added', () => {
    renderChart({ id: 's23' });
    const before = arcByPath('Root/A')!.getAttribute('d');
    fireEvent.click(hitByPath('Root/A')!);
    expect(arcByPath('Root/A')!.getAttribute('d')).toBe(before);
    expect(centreOf()?.getAttribute('data-path')).toBe('Root');
    expect(svgOf().querySelectorAll('[tabindex]')).toHaveLength(0);
    expect(svgOf().querySelectorAll('[role="button"]')).toHaveLength(0);
  });

  it('24: zoom in — clicking an arc with children re-maps it to the full angle range, makes its children ring 1, and fires onChange with its datum; clicking a leaf does nothing', () => {
    const onChange = vi.fn<(focus: HierarchyDatum | null) => void>();
    renderChart({
      id: 's24',
      zoom: { onChange },
      drawing: INSTANT,
    });
    fireEvent.click(hitByPath('Root/A')!);
    expect(onChange).toHaveBeenCalledOnce();
    const focus = onChange.mock.calls[0][0] as HierarchyDatum;
    expect(focus).toMatchObject({ name: 'A', path: ['Root', 'A'], value: 60 });
    expect(centreOf()?.getAttribute('data-path')).toBe('Root/A');
    const a1 = parseArc(arcByPath('Root/A/a1')!.getAttribute('d'));
    const a2 = parseArc(arcByPath('Root/A/a2')!.getAttribute('d'));
    expect(a1.a0).toBeCloseTo(0, 5);
    expect(a2.a1).toBeCloseTo(TAU, 5);
    expect(spanOf(a1) + spanOf(a2)).toBeCloseTo(TAU, 5);
    // a1/a2 are now ring 1 (just outside the disc).
    closePx(a1.r0, num(centreOf(), 'r'));
    expect(arcByPath('Root/B')).toBeUndefined();

    onChange.mockClear();
    const leafD = arcByPath('Root/A/a1')!.getAttribute('d');
    fireEvent.click(hitByPath('Root/A/a1')!);
    expect(onChange).not.toHaveBeenCalled();
    expect(arcByPath('Root/A/a1')!.getAttribute('d')).toBe(leafD);
    expect(centreOf()?.getAttribute('data-path')).toBe('Root/A');
  });

  it('25: zoom out — clicking the disc, or the centre in donut mode, moves to the parent and fires onChange (null at the top level); clicking it at the top level does nothing', () => {
    const onChange = vi.fn<(focus: HierarchyDatum | null) => void>();
    const { unmount } = renderChart({
      id: 's25a',
      zoom: { onChange },
      drawing: INSTANT,
    });
    const discHit = () =>
      svgOf().querySelector<SVGElement>('[data-testid="sunburst-hit"][data-centre="true"]')!;
    fireEvent.click(discHit());
    expect(onChange).not.toHaveBeenCalled();
    expect(centreOf()?.getAttribute('data-path')).toBe('Root');

    fireEvent.click(hitByPath('Root/A')!);
    expect(onChange).toHaveBeenCalledTimes(1);
    onChange.mockClear();
    fireEvent.click(discHit());
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0][0]).toBeNull();
    expect(centreOf()?.getAttribute('data-path')).toBe('Root');
    unmount();

    const onDonut = vi.fn<(focus: HierarchyDatum | null) => void>();
    renderChart({
      id: 's25b',
      innerRadius: 0.4,
      zoom: { onChange: onDonut },
      drawing: INSTANT,
    });
    fireEvent.click(hitByPath('Root/A')!);
    expect(centreOf()).toBeNull();
    expect(holeOf()).toBeTruthy();
    onDonut.mockClear();
    fireEvent.click(holeOf()!);
    expect(onDonut).toHaveBeenCalledOnce();
    expect(onDonut.mock.calls[0][0]).toBeNull();
    expect(arcByPath('Root/B')).toBeTruthy();
  });

  it('26: zoom keyboard — Enter and Space on an arc with children zoom in, Escape zooms out; focusable arcs have role="button" and an aria-label of the path and value; keyboard focus moves to the new centre after keyboard zooms (assumption: a mouse click on an arc does not move focus)', () => {
    const onChange = vi.fn<(focus: HierarchyDatum | null) => void>();
    renderChart({
      id: 's26',
      zoom: { onChange },
      drawing: INSTANT,
    });
    const A = arcByPath('Root/A')!;
    expect(A.getAttribute('role')).toBe('button');
    expect(A.getAttribute('tabindex')).toBe('0');
    expect(A.getAttribute('aria-label')).toBe('Root › A, 60');
    expect(arcByPath('Root/A/a1')!.getAttribute('role')).toBeNull();

    A.focus();
    expect(document.activeElement).toBe(A);
    fireEvent.keyDown(A, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledOnce();
    expect(centreOf()?.getAttribute('data-path')).toBe('Root/A');
    expect(document.activeElement).toBe(centreOf());
    expect(centreOf()?.getAttribute('role')).toBe('button');
    expect(centreOf()?.getAttribute('aria-label')).toBe('Root › A, 60');

    fireEvent.keyDown(svgOf(), { key: 'Escape' });
    expect(centreOf()?.getAttribute('data-path')).toBe('Root');
    expect(document.activeElement).toBe(centreOf());

    const B = arcByPath('Root/B')!;
    B.focus();
    fireEvent.keyDown(B, { key: ' ' });
    expect(centreOf()?.getAttribute('data-path')).toBe('Root/B');
    expect(document.activeElement).toBe(centreOf());

    // Assumption: mouse-click zooms do not move keyboard focus. Clicking A
    // after focusing B's new centre leaves focus where it is (not the new A centre).
    fireEvent.keyDown(svgOf(), { key: 'Escape' });
    const topDisc = centreOf()!;
    topDisc.focus();
    fireEvent.click(hitByPath('Root/A')!);
    expect(centreOf()?.getAttribute('data-path')).toBe('Root/A');
    expect(document.activeElement).not.toBe(centreOf());
  });

  it('27: zoom with a data change — if the focus path still exists the focus is kept; if not, the chart resets to the top level and fires onChange(null)', () => {
    const onChange = vi.fn<(focus: HierarchyDatum | null) => void>();
    const { rerender } = renderChart({
      id: 's27',
      zoom: { onChange },
      drawing: INSTANT,
    });
    fireEvent.click(hitByPath('Root/A')!);
    expect(centreOf()?.getAttribute('data-path')).toBe('Root/A');
    onChange.mockClear();

    const samePath: Node = {
      name: 'Root',
      children: [
        {
          name: 'A',
          children: [
            { name: 'a1', size: 10 },
            { name: 'a2', size: 10 },
          ],
        },
        { name: 'C', size: 5 },
      ],
    };
    rerender(
      <SunburstChart
        id='s27'
        data={samePath}
        value={VALUE}
        style={STYLE}
        arc={NO_PAD}
        zoom={{ onChange }}
        drawing={INSTANT}
      />
    );
    expect(centreOf()?.getAttribute('data-path')).toBe('Root/A');
    expect(arcByPath('Root/A/a1')).toBeTruthy();
    expect(arcByPath('Root/C')).toBeUndefined();
    expect(onChange).not.toHaveBeenCalled();

    const gone: Node = {
      name: 'Root',
      children: [{ name: 'C', size: 5 }],
    };
    rerender(
      <SunburstChart
        id='s27'
        data={gone}
        value={VALUE}
        style={STYLE}
        arc={NO_PAD}
        zoom={{ onChange }}
        drawing={INSTANT}
      />
    );
    expect(onChange).toHaveBeenCalledWith(null);
    expect(centreOf()?.getAttribute('data-path')).toBe('Root');
    expect(arcByPath('Root/C')).toBeTruthy();
    expect(arcByPath('Root/A')).toBeUndefined();
  });

  it('28: transitions — a second zoom during the zoom tween interrupts the first and the final geometry matches the second focus; changing data during the draw-in interrupts it and leaves no stale nodes; unmounting during a tween interrupts it, with no errors or timers afterwards', async () => {
    const onChange = vi.fn<(focus: HierarchyDatum | null) => void>();
    const { unmount: unmountZoom } = renderChart({
      id: 's28a',
      zoom: { onChange },
      drawing: { duration: 200 },
    });
    fireEvent.click(hitByPath('Root/A')!);
    expect(hasTransition(plotOf())).toBe(true);
    expect(hitByPath('Root/B')).toBeTruthy();
    fireEvent.click(hitByPath('Root/B')!);
    await waitFor(
      () => {
        expect(hasTransition(plotOf())).toBe(false);
        expect(centreOf()?.getAttribute('data-path')).toBe('Root/B');
      },
      { timeout: 2000 }
    );
    const b1 = parseArc(arcByPath('Root/B/b1')!.getAttribute('d'));
    const b2 = parseArc(arcByPath('Root/B/b2')!.getAttribute('d'));
    expect(b1.a0).toBeCloseTo(0, 5);
    expect(b2.a1).toBeCloseTo(TAU, 5);
    expect(arcByPath('Root/A')).toBeUndefined();
    expect(onChange.mock.calls.map((c) => (c[0] as HierarchyDatum | null)?.name)).toStrictEqual([
      'A',
      'B',
    ]);
    unmountZoom();

    const { rerender, unmount } = renderChart({
      id: 's28b',
      drawing: { duration: 400 },
    });
    expect(arcsOf().some(hasTransition)).toBe(true);
    const next: Node = { name: 'Root', children: [{ name: 'Solo', size: 9 }] };
    rerender(
      <SunburstChart
        id='s28b'
        data={next}
        value={VALUE}
        style={STYLE}
        arc={NO_PAD}
        drawing={{ duration: 0 }}
      />
    );
    expect(arcsOf().map((a) => a.getAttribute('data-path'))).toStrictEqual(['Root/Solo']);
    expect(arcByPath('Root/A')).toBeUndefined();
    expect(document.querySelectorAll('#s28b [data-testid="sunburst-arc"]')).toHaveLength(1);

    rerender(
      <SunburstChart
        id='s28b'
        data={next}
        value={VALUE}
        style={STYLE}
        arc={NO_PAD}
        drawing={{ duration: 400 }}
      />
    );
    const live = arcsOf()[0];
    expect(hasTransition(live)).toBe(true);
    const errors: unknown[] = [];
    const err: MockInstance<typeof console.error> = vi.spyOn(console, 'error').mockImplementation((...a) => {
      errors.push(a);
    });
    expect(() => unmount()).not.toThrow();
    expect(hasTransition(live)).toBe(false);
    expect(errors).toHaveLength(0);
    err.mockRestore();
  });

  it('29: runtime changes to innerRadius, startAngle, rings, sort or data redraw with no leftover nodes, and highlight attributes are cleared on redraw', () => {
    const { rerender } = renderChart({ id: 's29', data: deep });
    fireEvent.mouseEnter(hitByPath('Root/A/A1/A1a')!, { clientX: 20, clientY: 20 });
    expect(svgOf().querySelectorAll('[data-highlighted]').length).toBeGreaterThan(0);

    rerender(
      <SunburstChart
        id='s29'
        data={deep}
        value={VALUE}
        style={STYLE}
        arc={NO_PAD}
        innerRadius={0.4}
      />
    );
    expect(centreOf()).toBeNull();
    expect(svgOf().querySelectorAll('[data-highlighted],[data-dimmed]')).toHaveLength(0);
    expect(arcByPath('Root/A')).toBeTruthy();

    rerender(
      <SunburstChart
        id='s29'
        data={deep}
        value={VALUE}
        style={STYLE}
        arc={NO_PAD}
        startAngle={0}
        endAngle={Math.PI}
      />
    );
    const A = parseArc(arcByPath('Root/A')!.getAttribute('d'));
    expect(A.a0).toBeGreaterThanOrEqual(-1e-6);
    expect(A.a1).toBeLessThanOrEqual(Math.PI + 1e-6);

    rerender(
      <SunburstChart
        id='s29'
        data={deep}
        value={VALUE}
        style={STYLE}
        arc={NO_PAD}
        rings={1}
      />
    );
    expect(Math.max(...arcsOf().map((a) => Number(a.getAttribute('data-depth'))))).toBe(1);

    rerender(
      <SunburstChart
        id='s29'
        data={deep}
        value={VALUE}
        style={STYLE}
        arc={NO_PAD}
        sort={false}
      />
    );
    expect(arcByPath('Root/A')).toBeTruthy();

    rerender(
      <SunburstChart
        id='s29'
        data={{ name: 'Solo', size: 3 }}
        value={VALUE}
        style={STYLE}
        arc={NO_PAD}
      />
    );
    expect(arcsOf()).toHaveLength(0);
    expect(centreOf()?.getAttribute('data-path')).toBe('Solo');
    expect(document.querySelectorAll('#s29 [data-testid="sunburst-centre"]')).toHaveLength(1);
  });

  it('30: title and description produce <title> and <desc> with the matching aria-* attributes; otherwise aria-label is "Sunburst chart" or ariaLabel', () => {
    const { unmount } = renderChart({
      id: 's30a',
      title: 'Repo size',
      description: 'By folder',
    });
    const svg = svgOf();
    expect(svg.querySelector('title')?.textContent).toBe('Repo size');
    expect(svg.querySelector('title')?.id).toBe('s30a-title');
    expect(svg.querySelector('desc')?.textContent).toBe('By folder');
    expect(svg.querySelector('desc')?.id).toBe('s30a-desc');
    expect(svg.getAttribute('aria-labelledby')).toBe('s30a-title');
    expect(svg.getAttribute('aria-describedby')).toBe('s30a-desc');
    expect(svg.getAttribute('aria-label')).toBeNull();
    unmount();

    const r2 = renderChart({ id: 's30b' });
    expect(svgOf().getAttribute('aria-label')).toBe('Sunburst chart');
    r2.unmount();

    renderChart({ id: 's30c', ariaLabel: 'Folder sunburst' });
    expect(document.getElementById('s30c')?.getAttribute('aria-label')).toBe(
      'Folder sunburst'
    );
  });

  it('32: catalog — sunburst, sunburst chart, sunburst diagram, radial treemap and multi-level pie chart resolve to SunburstChart; sunburst-style profile still resolves to PizzaChart; ring chart still resolves to the PieChart donut; category is distribution, data.form is hierarchy, and composition is the primary intent on that branch', () => {
    for (const alias of [
      'sunburst',
      'sunburst chart',
      'sunburst diagram',
      'radial treemap',
      'multi-level pie chart',
    ]) {
      expect(resolveChartRequest(alias)?.chart.name).toBe('SunburstChart');
    }
    expect(resolveChartRequest('sunburst-style profile')?.chart.name).toBe('PizzaChart');
    const ring = resolveChartRequest('ring chart');
    expect(ring?.chart.name).toBe('PieChart');
    expect(ring?.variant).toBeTruthy();

    const meta = resolveChartRequest('SunburstChart')?.chart;
    expect(meta?.category).toBe('distribution');
    expect(meta?.data.form).toBe('hierarchy');
    expect(meta?.intents[0]).toBe('composition');

    const composition = decisionTree.find((b) => b.intent === 'composition');
    expect(composition?.options.some((o) => o.name === 'SunburstChart')).toBe(true);
  });
});
