import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { decisionTree, resolveChartRequest } from '@/catalog';
import { resetDevWarnings } from '@/utils/devEnvironment';

import SankeyChart, { SankeyLinkDatum, SankeyNodeDatum } from '.';
import { computeSankeyLayout, findCycle } from './layout';
import sample from './sample.json';

// 600×400 with the default 20px margins → plot (20,20)–(580,380).
const STYLE = { width: '600px', height: '400px' } as const;
const PLOT = { x0: 20, y0: 20, x1: 580, y1: 380 };

type L = { source: string; target: string; value: number };
const link = (source: string, target: string, value: number): L => ({ source, target, value });

const all = (testid: string) =>
  Array.from(document.querySelectorAll<SVGElement>(`[data-testid="${testid}"]`));
const nodeEl = (id: string) =>
  document.querySelector<SVGElement>(`[data-testid="sankey-node"][data-id="${id}"]`)!;
const nodeHit = (id: string) =>
  document.querySelector<SVGElement>(`[data-testid="sankey-node-hit"][data-id="${id}"]`)!;
const linkEl = (s: string, t: string) =>
  document.querySelector<SVGElement>(
    `[data-testid="sankey-link"][data-source="${s}"][data-target="${t}"]`
  )!;
const linkHit = (s: string, t: string) =>
  document.querySelector<SVGElement>(
    `[data-testid="sankey-link-hit"][data-source="${s}"][data-target="${t}"]`
  )!;
const num = (el: Element | null, attr: string) => Number(el?.getAttribute(attr) ?? NaN);
const ky = () => num(document.querySelector('g.sankey'), 'data-ky');
const tooltipOf = (id: string) => document.getElementById(`tooltip-${id}`);
const noNaN = () =>
  expect(document.querySelector('svg')!.outerHTML).not.toMatch(/NaN|Infinity/);

// The "cross" fixture, laid out by d3-sankey 0.12.3 with its defaults
// (justify, 6 iterations, nodeWidth 12, nodePadding 12) in PLOT.
// [layer, x0, y0, y1] per node and [y0, y1] per link, rounded to 4 dp.
const CROSS: L[] = [
  link('A', 'E', 5),
  link('A', 'D', 2),
  link('B', 'D', 4),
  link('C', 'E', 1),
  link('C', 'F', 7),
  link('B', 'F', 3),
  link('D', 'F', 2),
];
const D3_SANKEY_NODES: Record<string, [number, number, number, number]> = {
  A: [0, 20, 20, 126.9091],
  B: [0, 20, 138.9091, 245.8182],
  C: [0, 20, 257.8182, 380],
  D: [1, 294, 145.9155, 237.5518],
  E: [2, 568, 42.4261, 134.0625],
  F: [2, 568, 194.6088, 377.8815],
};
const D3_SANKEY_LINKS: Record<string, [number, number]> = {
  'A>E': [58.1818, 80.608],
  'A>D': [111.6364, 161.1882],
  'B>D': [169.4545, 207.0064],
  'C>E': [265.4545, 126.4261],
  'C>F': [326.5455, 324.4269],
  'B>F': [222.9091, 217.5179],
  'D>F': [161.1882, 255.6997],
};

const layoutOf = (links: L[], opts: Partial<Parameters<typeof computeSankeyLayout>[1]> = {}) => {
  const ids: string[] = [];
  links.forEach((l) => [l.source, l.target].forEach((id) => ids.includes(id) || ids.push(id)));
  return computeSankeyLayout(
    { ids, links },
    { ...PLOT, nodeWidth: 12, nodePadding: 12, align: 'justify', nodeSort: 'auto', iterations: 6, ...opts }
  );
};

/** Pairs of links between the same columns whose ends swap order. */
const crossings = (r: ReturnType<typeof layoutOf>) => {
  let c = 0;
  r.links.forEach((a, i) =>
    r.links.slice(i + 1).forEach((b) => {
      if (a.source.layer !== b.source.layer || a.target.layer !== b.target.layer) return;
      if (a.source === b.source || a.target === b.target) return;
      if ((a.y0 - b.y0) * (a.y1 - b.y1) < 0) c++;
    })
  );
  return c;
};

describe('SankeyChart', () => {
  let warn: MockInstance<typeof console.warn>;
  beforeEach(() => {
    resetDevWarnings();
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
  });
  afterEach(() => {
    warn.mockRestore();
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
  });
  const warnings = (): string[] => warn.mock.calls.map((c) => String(c[0]));

  it('1: renders data-testid="sankey-chart" with role="img"', () => {
    render(<SankeyChart id='s1' links={CROSS} style={STYLE} />);
    const svg = screen.getByTestId('sankey-chart');
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('role')).toBe('img');
  });

  it('2: links-only input infers nodes in first-appearance order, labels = ids', () => {
    render(
      <SankeyChart
        id='s2'
        links={[link('b', 'a', 1), link('a', 'c', 1), link('b', 'c', 1)]}
        nodeSort='input'
        style={STYLE}
      />
    );
    expect(all('sankey-node').map((n) => n.getAttribute('data-id'))).toEqual(['b', 'a', 'c']);
    expect(all('sankey-link')).toHaveLength(3);
    expect(all('sankey-label').map((l) => l.textContent)).toEqual(['b', 'a', 'c']);
  });

  it('3: explicit nodes use labelKey; unknown ids drop links; duplicate ids keep the first', () => {
    const nodes = [
      { key: 'a', name: 'Alpha' },
      { key: 'b', name: 'Beta' },
      { key: 'a', name: 'Again' },
    ];
    render(
      <SankeyChart
        id='s3'
        nodes={nodes}
        nodeDef={{ idKey: 'key', labelKey: 'name' }}
        links={[link('a', 'b', 2), link('a', 'zz', 1), link('zz', 'b', 1)]}
        style={STYLE}
      />
    );
    expect(all('sankey-link')).toHaveLength(1);
    expect(all('sankey-label').map((l) => l.textContent)).toEqual(['Alpha', 'Beta']);
    const w = warnings();
    expect(w.filter((m) => m.includes('"zz"'))).toHaveLength(1);
    expect(w.filter((m) => m.includes('duplicate node ids (a)'))).toHaveLength(1);
  });

  it('4: duplicate source/target links are summed; rows keeps every original', () => {
    const html = vi.fn<(d: unknown) => string>(() => '');
    const rows = [link('a', 'b', 2), link('a', 'b', 3), link('a', 'c', 5)];
    render(<SankeyChart id='s4' links={rows} tooltip={{ html }} style={STYLE} />);
    expect(all('sankey-link')).toHaveLength(2);
    expect(num(linkEl('a', 'b'), 'data-value')).toBe(5);
    fireEvent.mouseEnter(linkHit('a', 'b'), { clientX: 1, clientY: 1 });
    const d = html.mock.calls[0][0] as SankeyLinkDatum;
    expect(d.kind).toBe('link');
    expect(d.value).toBe(5);
    expect(d.rows).toEqual([rows[0], rows[1]]);
  });

  it('5: one shared scale for links and nodes; the tallest column fits', () => {
    render(<SankeyChart id='s5' links={CROSS} style={STYLE} />);
    const k = ky();
    expect(k).toBeGreaterThan(0);
    for (const l of CROSS)
      expect(num(linkEl(l.source, l.target), 'stroke-width')).toBeCloseTo(l.value * k, 6);
    for (const n of all('sankey-node'))
      expect(num(n, 'height')).toBeCloseTo(num(n, 'data-value') * k, 6);
    // Column 0 (A 7, B 7, C 8 = 22 units, 2 gaps) fills the plot height exactly.
    expect(22 * k + 2 * 12).toBeCloseTo(PLOT.y1 - PLOT.y0, 6);
    for (const n of all('sankey-node')) {
      expect(num(n, 'y')).toBeGreaterThanOrEqual(PLOT.y0 - 1e-6);
      expect(num(n, 'y') + num(n, 'height')).toBeLessThanOrEqual(PLOT.y1 + 1e-6);
    }
  });

  it('6: node imbalance — in 10, out 6 → height 10·ky; out-links cover 6 units', () => {
    const r = layoutOf([link('X', 'Y', 10), link('Y', 'Z', 6)]);
    const y = r.nodes.find((n) => n.id === 'Y')!;
    expect(y.value).toBe(10);
    expect(y.y1 - y.y0).toBeCloseTo(10 * r.ky, 6);
    const out = y.sourceLinks.reduce((s, l) => s + l.width, 0);
    expect(out).toBeCloseTo(6 * r.ky, 6);
  });

  it('7: align puts nodes in the documented columns', () => {
    const fx = [link('A', 'B', 1), link('B', 'C', 1), link('X', 'C', 1), link('A', 'Y', 1)];
    const cols = (align: 'justify' | 'left' | 'right' | 'center') =>
      Object.fromEntries(layoutOf(fx, { align }).nodes.map((n) => [n.id, n.layer]));
    expect(cols('justify')).toEqual({ A: 0, B: 1, C: 2, X: 0, Y: 2 });
    expect(cols('left')).toEqual({ A: 0, B: 1, C: 2, X: 0, Y: 1 });
    expect(cols('right')).toEqual({ A: 0, B: 1, C: 2, X: 1, Y: 2 });
    expect(cols('center')).toEqual({ A: 0, B: 1, C: 2, X: 1, Y: 1 });
    // default prop is justify
    render(<SankeyChart id='s7' links={fx} style={STYLE} />);
    expect(num(nodeEl('Y'), 'data-column')).toBe(2);
  });

  it('7b: layout matches d3-sankey 0.12.3 exactly on a reference fixture', () => {
    const r = layoutOf(CROSS);
    for (const n of r.nodes) {
      const [layer, x0, y0, y1] = D3_SANKEY_NODES[n.id];
      expect(n.layer).toBe(layer);
      expect(n.x0).toBeCloseTo(x0, 3);
      expect(n.y0).toBeCloseTo(y0, 3);
      expect(n.y1).toBeCloseTo(y1, 3);
    }
    for (const l of r.links) {
      const [y0, y1] = D3_SANKEY_LINKS[`${l.source.id}>${l.target.id}`];
      expect(l.y0).toBeCloseTo(y0, 3);
      expect(l.y1).toBeCloseTo(y1, 3);
    }
  });

  it("8: nodeSort 'auto' has ≤ crossings than 'input'; 'input' keeps order; iterations 0 skips relaxation", () => {
    const fx = [link('A', 'Z', 5), link('B', 'Y', 5), link('C', 'X', 5)];
    const auto = layoutOf(fx);
    const input = layoutOf(fx, { nodeSort: 'input' });
    expect(crossings(auto)).toBeLessThanOrEqual(crossings(input));
    const order = (r: typeof auto, layer: number) =>
      r.nodes.filter((n) => n.layer === layer).sort((a, b) => a.y0 - b.y0).map((n) => n.id);
    expect(order(input, 1)).toEqual(['Z', 'Y', 'X']);
    const zero = layoutOf(fx, { iterations: 0 });
    expect(zero.nodes.map((n) => n.y0)).toEqual(input.nodes.map((n) => n.y0));
  });

  it('9: gaps equal nodeDef.padding; overflowing padding shrinks and ky stays > 0', () => {
    const fx = [link('A', 'X', 1), link('B', 'X', 1), link('C', 'X', 1)];
    const r = layoutOf(fx, { nodePadding: 20 });
    const col = r.nodes.filter((n) => n.layer === 0).sort((a, b) => a.y0 - b.y0);
    expect(col[1].y0 - col[0].y1).toBeCloseTo(20, 6);
    expect(col[2].y0 - col[1].y1).toBeCloseTo(20, 6);
    const tight = layoutOf(fx, { nodePadding: 1000 });
    expect(tight.py).toBeLessThan(1000);
    expect(tight.ky).toBeGreaterThan(0);
  });

  it('10: nodeDef.width sets thickness; invalid width/padding/iterations fall back with a warning', () => {
    const { unmount } = render(
      <SankeyChart id='s10' links={CROSS} nodeDef={{ width: 30 }} style={STYLE} />
    );
    expect(num(nodeEl('A'), 'width')).toBe(30);
    unmount();
    render(
      <SankeyChart
        id='s10b'
        links={CROSS}
        nodeDef={{ width: -1, padding: NaN }}
        iterations={Infinity}
        style={STYLE}
      />
    );
    expect(num(nodeEl('A'), 'width')).toBe(12);
    const w = warnings();
    expect(w.some((m) => m.includes('nodeDef.width'))).toBe(true);
    expect(w.some((m) => m.includes('nodeDef.padding'))).toBe(true);
    expect(w.some((m) => m.includes('iterations'))).toBe(true);
  });

  it('11: vertical orientation runs columns top → bottom with vertical curves', () => {
    render(<SankeyChart id='s11' links={CROSS} orientation='vertical' style={STYLE} />);
    expect(num(nodeEl('A'), 'height')).toBe(12);
    expect(num(nodeEl('A'), 'y')).toBeCloseTo(PLOT.y0, 6);
    expect(num(nodeEl('E'), 'y') + 12).toBeCloseTo(PLOT.y1, 6);
    // linkVertical: M x,y C x,(y+y1)/2 ...
    const d = linkEl('A', 'E').getAttribute('d')!;
    const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
    expect(nums[2]).toBeCloseTo(nums[0], 6); // first control point shares x
    const label = document.querySelector('[data-testid="sankey-label"][data-id="A"]')!;
    expect(label.getAttribute('text-anchor')).toBe('middle');
    expect(num(label, 'y')).toBeGreaterThan(num(nodeEl('A'), 'y') + 12);
    expect(num(nodeHit('A'), 'height')).toBe(12);
    noNaN();
  });

  it('12: zero-value links are excluded silently', () => {
    render(
      <SankeyChart id='s12' links={[link('a', 'b', 3), link('a', 'c', 0)]} style={STYLE} />
    );
    expect(all('sankey-link')).toHaveLength(1);
    expect(all('sankey-node')).toHaveLength(2);
    expect(warn).not.toHaveBeenCalled();
  });

  it('13: negative, NaN and non-numeric values are excluded with one warning', () => {
    render(
      <SankeyChart
        id='s13'
        links={[
          link('a', 'b', 3),
          link('a', 'c', -1),
          link('a', 'd', NaN),
          { source: 'a', target: 'e', value: '4' as unknown as number },
        ]}
        style={STYLE}
      />
    );
    expect(all('sankey-link')).toHaveLength(1);
    expect(warnings().filter((m) => m.includes('non-numeric'))).toHaveLength(1);
    noNaN();
  });

  it('14: self-loops are dropped with a warning; the rest renders', () => {
    render(
      <SankeyChart id='s14' links={[link('a', 'a', 3), link('a', 'b', 2)]} style={STYLE} />
    );
    expect(all('sankey-link')).toHaveLength(1);
    expect(warnings().filter((m) => m.includes('self-loop'))).toHaveLength(1);
  });

  it('15: a cycle rejects the graph and names the cycle', () => {
    render(
      <SankeyChart
        id='s15'
        links={[link('A', 'B', 1), link('B', 'C', 1), link('C', 'A', 1)]}
        style={STYLE}
      />
    );
    expect(screen.getByTestId('sankey-chart')).toBeTruthy();
    expect(all('sankey-node')).toHaveLength(0);
    expect(all('sankey-link')).toHaveLength(0);
    expect(warnings().filter((m) => m.includes('A → B → C → A'))).toHaveLength(1);
    expect(findCycle(['A', 'B'], [link('A', 'B', 1)])).toBeNull();
  });

  it('16: orphan nodes in `nodes` are not painted; one warning with the count', () => {
    render(
      <SankeyChart
        id='s16'
        nodes={[{ id: 'a' }, { id: 'b' }, { id: 'lonely' }, { id: 'zero' }]}
        links={[link('a', 'b', 1), link('a', 'zero', 0)]}
        style={STYLE}
      />
    );
    expect(all('sankey-node')).toHaveLength(2);
    expect(warnings().filter((m) => m.includes('2 node(s)'))).toHaveLength(1);
  });

  it('17: empty or missing links render the shell only', () => {
    render(<SankeyChart id='s17' links={[]} style={STYLE} />);
    expect(screen.getByTestId('sankey-chart')).toBeTruthy();
    expect(all('sankey-node')).toHaveLength(0);
    render(
      <SankeyChart id='s17b' links={undefined as unknown as L[]} style={STYLE} />
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it('18: a single link spans the plot height', () => {
    render(<SankeyChart id='s18' links={[link('a', 'b', 7)]} style={STYLE} />);
    expect(all('sankey-node')).toHaveLength(2);
    expect(num(linkEl('a', 'b'), 'stroke-width')).toBeCloseTo(PLOT.y1 - PLOT.y0, 6);
  });

  it('19: labels — inward by default, forced sides, value text and formatters', () => {
    const { rerender } = render(<SankeyChart id='s19' links={CROSS} style={STYLE} />);
    const label = (id: string) =>
      document.querySelector<SVGElement>(`[data-testid="sankey-label"][data-id="${id}"]`)!;
    expect(label('A').getAttribute('text-anchor')).toBe('start');
    expect(num(label('A'), 'x')).toBeGreaterThan(num(nodeEl('A'), 'x'));
    expect(label('E').getAttribute('text-anchor')).toBe('end');
    expect(num(label('E'), 'x')).toBeLessThan(num(nodeEl('E'), 'x'));
    rerender(<SankeyChart id='s19' links={CROSS} labels={{ side: 'start' }} style={STYLE} />);
    expect(label('A').getAttribute('text-anchor')).toBe('end');
    rerender(<SankeyChart id='s19' links={CROSS} labels={{ side: 'end' }} style={STYLE} />);
    expect(label('E').getAttribute('text-anchor')).toBe('start');
    rerender(
      <SankeyChart id='s19' links={CROSS} labels={{ value: true }} format={(v) => `${v}u`} style={STYLE} />
    );
    expect(label('A').textContent).toBe('A 7u');
    rerender(
      <SankeyChart
        id='s19'
        links={CROSS}
        labels={{
          name: { format: (l, n) => `${l}@${n.column}` },
          value: { format: (v) => `(${v})` },
        }}
        style={STYLE}
      />
    );
    expect(label('D').textContent).toBe('D@1 (6)');
    rerender(<SankeyChart id='s19' links={CROSS} labels={{ name: false }} style={STYLE} />);
    expect(all('sankey-label')).toHaveLength(0);
  });

  it("19b: default format is d3.format(',') — grouped, no exponent, trimmed", () => {
    render(
      <SankeyChart
        id='s19b'
        links={[link('a', 'b', 1234567), link('a', 'c', 0.5)]}
        labels={{ value: true }}
        tooltip={{}}
        style={STYLE}
      />
    );
    const label = (id: string) =>
      document.querySelector(`[data-testid="sankey-label"][data-id="${id}"]`)!.textContent;
    expect(label('a')).toBe('a 1,234,567.5');
    expect(label('b')).toBe('b 1,234,567');
    expect(label('c')).toBe('c 0.5');
    fireEvent.mouseEnter(nodeHit('b'), { clientX: 1, clientY: 1 });
    expect(tooltipOf('s19b')!.innerHTML).toBe('b<br>in: 1,234,567');
    fireEvent.mouseEnter(linkHit('a', 'c'), { clientX: 1, clientY: 1 });
    expect(tooltipOf('s19b')!.innerHTML).toBe('a → c<br>0.5<br>0% of a out');
  });

  it('20: colours from class maps, colorBy source/target/none, nothing by default', () => {
    const { rerender } = render(<SankeyChart id='s20' links={CROSS} style={STYLE} />);
    expect(nodeEl('A').getAttribute('class')).toBe('fill-current');
    expect(linkEl('A', 'E').getAttribute('class')).toBe('stroke-current');
    const nodeDef = { className: 'fill-gray-500', classNameMap: { A: 'fill-red-500' } };
    const map = { A: 'stroke-red-300', E: 'stroke-blue-300' };
    rerender(
      <SankeyChart
        id='s20'
        links={CROSS}
        nodeDef={nodeDef}
        linkDef={{ className: 'stroke-gray-200', classNameMap: map }}
        style={STYLE}
      />
    );
    expect(nodeEl('A').getAttribute('class')).toContain('fill-red-500');
    expect(nodeEl('B').getAttribute('class')).toContain('fill-gray-500');
    expect(linkEl('A', 'E').getAttribute('class')).toContain('stroke-red-300');
    expect(linkEl('B', 'D').getAttribute('class')).toContain('stroke-gray-200');
    rerender(
      <SankeyChart
        id='s20'
        links={CROSS}
        linkDef={{ className: 'stroke-gray-200', classNameMap: map, colorBy: 'target' }}
        style={STYLE}
      />
    );
    expect(linkEl('C', 'E').getAttribute('class')).toContain('stroke-blue-300');
    rerender(
      <SankeyChart
        id='s20'
        links={CROSS}
        linkDef={{ className: 'stroke-gray-200', classNameMap: map, colorBy: 'none' }}
        style={STYLE}
      />
    );
    expect(linkEl('A', 'E').getAttribute('class')).toContain('stroke-gray-200');
  });

  it('21: node tooltip — default HTML and html(datum)', () => {
    const { rerender } = render(<SankeyChart id='s21' links={CROSS} tooltip={{}} style={STYLE} />);
    fireEvent.mouseEnter(nodeHit('A'), { clientX: 1, clientY: 1 });
    expect(tooltipOf('s21')!.innerHTML).toBe('A<br>out: 7');
    fireEvent.mouseEnter(nodeHit('D'), { clientX: 1, clientY: 1 });
    expect(tooltipOf('s21')!.innerHTML).toBe('D<br>in: 6<br>out: 2');
    fireEvent.mouseEnter(nodeHit('F'), { clientX: 1, clientY: 1 });
    expect(tooltipOf('s21')!.innerHTML).toBe('F<br>in: 12');
    const html = vi.fn<(d: unknown) => string>(() => 'x');
    rerender(<SankeyChart id='s21' links={CROSS} tooltip={{ html }} style={STYLE} />);
    fireEvent.mouseEnter(nodeHit('D'), { clientX: 1, clientY: 1 });
    const d = html.mock.calls[0][0] as SankeyNodeDatum;
    expect(d).toMatchObject({ kind: 'node', id: 'D', label: 'D', data: null, value: 6, inValue: 6, outValue: 2, column: 1 });
  });

  it('22: link tooltip — default HTML with share of source out-flow', () => {
    const html = vi.fn<(d: unknown) => string>(() => 'x');
    const { rerender } = render(<SankeyChart id='s22' links={CROSS} tooltip={{}} style={STYLE} />);
    fireEvent.mouseEnter(linkHit('A', 'E'), { clientX: 1, clientY: 1 });
    expect(tooltipOf('s22')!.innerHTML).toBe('A → E<br>5<br>71.4% of A out');
    rerender(<SankeyChart id='s22' links={CROSS} tooltip={{ html }} style={STYLE} />);
    fireEvent.mouseEnter(linkHit('A', 'E'), { clientX: 1, clientY: 1 });
    const d = html.mock.calls[0][0] as SankeyLinkDatum;
    expect(d.kind).toBe('link');
    expect(d.ofSource).toBeCloseTo(5 / 7, 6);
    expect(d.ofTarget).toBeCloseTo(5 / 6, 6);
    expect(d.source.id).toBe('A');
  });

  it('23: hit areas are ≥ 8px, only they carry handlers, one call per hover', () => {
    const html = vi.fn<(d: unknown) => string>(() => 'x');
    render(
      <SankeyChart
        id='s23'
        links={[link('a', 'b', 1000), link('a', 'c', 1), link('d', 'c', 0.01)]}
        tooltip={{ html }}
        style={STYLE}
      />
    );
    expect(num(linkEl('a', 'c'), 'stroke-width')).toBeLessThan(8);
    expect(num(linkHit('a', 'c'), 'stroke-width')).toBe(8);
    expect(linkHit('a', 'c').getAttribute('stroke')).toBe('transparent');
    expect(linkHit('a', 'c').getAttribute('pointer-events')).toBe('stroke');
    expect(num(nodeEl('d'), 'height')).toBeLessThan(8);
    expect(num(nodeHit('d'), 'height')).toBe(8);
    // centred on the node
    expect(num(nodeHit('d'), 'y') + 4).toBeCloseTo(num(nodeEl('d'), 'y') + num(nodeEl('d'), 'height') / 2, 6);
    fireEvent.mouseEnter(linkEl('a', 'c'));
    fireEvent.mouseEnter(nodeEl('d'));
    expect(html).not.toHaveBeenCalled();
    fireEvent.mouseEnter(linkHit('a', 'c'), { clientX: 1, clientY: 1 });
    expect(html).toHaveBeenCalledTimes(1);
    fireEvent.mouseEnter(nodeHit('d'), { clientX: 1, clientY: 1 });
    expect(html).toHaveBeenCalledTimes(2);
    // node hit areas sit above link hit areas
    const hits = document.querySelector('g.hit-areas')!;
    expect(hits.lastElementChild!.getAttribute('class')).toBe('node-hits');
  });

  it("24: highlight 'adjacent' marks neighbours and dims the rest; mouseleave clears", () => {
    render(<SankeyChart id='s24' links={CROSS} style={STYLE} />);
    fireEvent.mouseEnter(nodeHit('D'), { clientX: 1, clientY: 1 });
    const hi = (el: Element) => el.getAttribute('data-highlighted');
    const dim = (el: Element) => el.getAttribute('data-dimmed');
    for (const id of ['D', 'A', 'B', 'F']) expect(hi(nodeEl(id))).toBe('true');
    for (const id of ['C', 'E']) expect(dim(nodeEl(id))).toBe('true');
    expect(hi(linkEl('A', 'D'))).toBe('true');
    expect(hi(linkEl('D', 'F'))).toBe('true');
    expect(dim(linkEl('A', 'E'))).toBe('true');
    const label = document.querySelector('[data-testid="sankey-label"][data-id="C"]')!;
    expect(dim(label)).toBe('true');
    fireEvent.mouseLeave(nodeHit('D'));
    expect(document.querySelectorAll('[data-highlighted], [data-dimmed]')).toHaveLength(0);
    fireEvent.mouseEnter(linkHit('C', 'E'), { clientX: 1, clientY: 1 });
    expect(all('sankey-node').filter((n) => hi(n)).map((n) => n.getAttribute('data-id')).sort()).toEqual(['C', 'E']);
    expect(all('sankey-link').filter((n) => hi(n))).toHaveLength(1);
  });

  it("25: highlight 'path' walks upstream and downstream; false sets nothing", () => {
    const fx = [link('A', 'B', 1), link('B', 'C', 1), link('X', 'B', 1), link('B', 'Y', 1), link('Q', 'Y', 1)];
    const html = vi.fn<(d: unknown) => string>(() => 'x');
    const { rerender } = render(
      <SankeyChart id='s25' links={fx} highlight='path' style={STYLE} />
    );
    fireEvent.mouseEnter(linkHit('A', 'B'), { clientX: 1, clientY: 1 });
    const lit = () =>
      all('sankey-node').filter((n) => n.getAttribute('data-highlighted')).map((n) => n.getAttribute('data-id')).sort();
    expect(lit()).toEqual(['A', 'B', 'C', 'Y']);
    fireEvent.mouseLeave(linkHit('A', 'B'));
    fireEvent.mouseEnter(nodeHit('B'), { clientX: 1, clientY: 1 });
    expect(lit()).toEqual(['A', 'B', 'C', 'X', 'Y']);
    expect(linkEl('Q', 'Y').getAttribute('data-dimmed')).toBe('true');
    fireEvent.mouseLeave(nodeHit('B'));
    rerender(<SankeyChart id='s25' links={fx} highlight={false} tooltip={{ html }} style={STYLE} />);
    fireEvent.mouseEnter(nodeHit('B'), { clientX: 1, clientY: 1 });
    expect(document.querySelectorAll('[data-highlighted], [data-dimmed]')).toHaveLength(0);
    expect(html).toHaveBeenCalledTimes(1);
  });

  it('26: a new tooltip object does not redraw; the latest html is used', () => {
    const first = vi.fn<(d: unknown) => string>(() => 'first');
    const second = vi.fn<(d: unknown) => string>(() => 'second');
    const { rerender } = render(
      <SankeyChart id='s26' links={CROSS} tooltip={{ html: first }} style={STYLE} />
    );
    const before = nodeEl('A');
    const hitBefore = nodeHit('A');
    rerender(<SankeyChart id='s26' links={CROSS} tooltip={{ html: second }} style={STYLE} />);
    expect(nodeEl('A')).toBe(before);
    expect(nodeHit('A')).toBe(hitBefore);
    fireEvent.mouseEnter(nodeHit('A'), { clientX: 1, clientY: 1 });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('27: changing links mid-transition interrupts it; unmount mid-transition is clean', async () => {
    const drawing = { duration: 500 };
    const { rerender, unmount } = render(
      <SankeyChart id='s27' links={CROSS} drawing={drawing} style={STYLE} />
    );
    expect(num(nodeEl('A'), 'height')).toBe(0);
    expect(num(linkEl('A', 'E'), 'stroke-width')).toBe(0);
    const next = [link('p', 'q', 1)];
    rerender(<SankeyChart id='s27' links={next} drawing={drawing} style={STYLE} />);
    expect(all('sankey-node')).toHaveLength(2);
    expect(nodeEl('A')).toBeNull();
    await act(() => new Promise((r) => setTimeout(r, 650)));
    expect(num(linkEl('p', 'q'), 'stroke-width')).toBeCloseTo(PLOT.y1 - PLOT.y0, 3);
    rerender(<SankeyChart id='s27' links={CROSS} drawing={drawing} style={STYLE} />);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    unmount();
    await act(() => new Promise((r) => setTimeout(r, 600)));
    expect(err).not.toHaveBeenCalled();
    err.mockRestore();
  });

  it('28: runtime prop changes redraw with no leftovers and clear highlight', () => {
    const { rerender } = render(<SankeyChart id='s28' links={CROSS} style={STYLE} />);
    fireEvent.mouseEnter(nodeHit('D'), { clientX: 1, clientY: 1 });
    rerender(<SankeyChart id='s28' links={CROSS} orientation='vertical' style={STYLE} />);
    expect(document.querySelectorAll('[data-highlighted], [data-dimmed]')).toHaveLength(0);
    rerender(<SankeyChart id='s28' links={CROSS} align='left' nodeSort='input' style={STYLE} />);
    rerender(<SankeyChart id='s28' links={CROSS} nodes={[...'ABCDEF'].map((id) => ({ id }))} style={STYLE} />);
    expect(all('sankey-node')).toHaveLength(6);
    expect(all('sankey-node-hit')).toHaveLength(6);
    expect(all('sankey-link')).toHaveLength(7);
    expect(document.querySelectorAll('g.sankey')).toHaveLength(1);
  });

  it('29: title / description / aria-label', () => {
    const { rerender } = render(
      <SankeyChart id='s29' links={CROSS} title='Flows' description='Energy' style={STYLE} />
    );
    const svg = screen.getByTestId('sankey-chart');
    expect(svg.querySelector('title')!.textContent).toBe('Flows');
    expect(svg.getAttribute('aria-labelledby')).toBe('s29-title');
    expect(svg.getAttribute('aria-describedby')).toBe('s29-desc');
    expect(svg.getAttribute('aria-label')).toBeNull();
    rerender(<SankeyChart id='s29' links={CROSS} style={STYLE} />);
    expect(svg.getAttribute('aria-label')).toBe('Sankey chart');
    rerender(<SankeyChart id='s29' links={CROSS} ariaLabel='Budget' style={STYLE} />);
    expect(svg.getAttribute('aria-label')).toBe('Budget');
  });

  it('30: margin and padding inset the plot; end-column labels stay inside', () => {
    render(
      <SankeyChart
        id='s30'
        links={CROSS}
        margin={{ left: 50 }}
        padding={{ left: 10, right: 30 }}
        style={STYLE}
      />
    );
    expect(num(nodeEl('A'), 'x')).toBe(60);
    expect(num(nodeEl('E'), 'x') + 12).toBeCloseTo(600 - 20 - 30, 6);
    for (const l of all('sankey-label')) {
      const x = num(l, 'x');
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(600);
    }
  });

  it('31: no d3-sankey dependency', () => {
    const root = path.resolve(__dirname, '../../../..');
    const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(Object.keys(pkg.dependencies)).toEqual(['d3']);
    const files: string[] = [];
    const walk = (dir: string) =>
      readdirSync(dir).forEach((f) => {
        const p = path.join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.tsx?$/.test(f)) files.push(p);
      });
    walk(path.join(root, 'src'));
    const importers = files.filter((f) =>
      /from ['"]d3-sankey['"]|import\(['"]d3-sankey['"]\)/.test(readFileSync(f, 'utf8'))
    );
    expect(importers).toEqual([]);
  });

  it('32: catalog aliases, category, form and decision tree', () => {
    for (const alias of ['sankey', 'sankey diagram', 'sankey chart', 'flow diagram', 'alluvial diagram'])
      expect(resolveChartRequest(alias)?.chart.name).toBe('SankeyChart');
    expect(resolveChartRequest('network graph')?.chart.name).toBe('Network');
    expect(resolveChartRequest('node-link diagram')?.chart.name).toBe('Network');
    for (const other of ['heatmap', 'slope chart', 'combo chart', 'funnel'])
      expect(resolveChartRequest(other)?.chart.name).not.toBe('SankeyChart');
    const meta = resolveChartRequest('SankeyChart')!.chart;
    expect(meta.category).toBe('flow');
    expect(meta.data.form).toBe('graph');
    expect(meta.intents[0]).toBe('connection');
    const branch = decisionTree.find((b) => b.intent === 'connection')!;
    expect(branch.options.map((o) => o.name)).toContain('SankeyChart');
  });

  it('renders the bundled sample with explicit nodes and no warnings', () => {
    render(
      <SankeyChart
        id='sample'
        nodes={sample.nodes}
        links={sample.links}
        nodeDef={{ labelKey: 'name' }}
        linkDef={{ valueKey: 'twh' }}
        labels={{ value: true }}
        style={STYLE}
      />
    );
    expect(all('sankey-node')).toHaveLength(sample.nodes.length);
    expect(all('sankey-link')).toHaveLength(sample.links.length);
    expect(warn).not.toHaveBeenCalled();
    noNaN();
  });
});
