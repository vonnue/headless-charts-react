import { quantile } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { decisionTree, resolveChartRequest } from '@/catalog';
import { resetDevWarnings } from '@/utils/devEnvironment';

import ViolinChart, { type ViolinDatum } from '.';
import {
  clampResolution,
  groupStats,
  kde,
  resolveBandwidth,
  ruleBandwidth,
} from './stats';

const STYLE = { width: '400px', height: '300px' } as const;
const CAT = { key: 'cat' } as const;
const VAL = { key: 'v' } as const;
const MARGIN = { top: 20, right: 20, bottom: 40, left: 50 } as const;
type Row = { cat: string; v: number };

const rows = (...groups: [string, number[]][]): Row[] =>
  groups.flatMap(([cat, vs]) => vs.map((v) => ({ cat, v })));

const svgOf = () => screen.getByTestId('violin-chart');
const shapesOf = (root: ParentNode = document.body) =>
  Array.from(root.querySelectorAll<SVGElement>('[data-testid="violin-shape"]'));
const hitsOf = (root: ParentNode = document.body) =>
  Array.from(root.querySelectorAll<SVGElement>('[data-testid="violin-hit"]'));
const pointsOf = (root: ParentNode = document.body) =>
  Array.from(root.querySelectorAll<SVGElement>('[data-testid="violin-point"]'));
const degeneratesOf = (root: ParentNode = document.body) =>
  Array.from(
    root.querySelectorAll<SVGElement>('[data-testid="violin-degenerate"]')
  );
const innersOf = (part?: string, root: ParentNode = document.body) =>
  Array.from(
    root.querySelectorAll<SVGElement>(
      part
        ? `[data-testid="violin-inner"][data-part="${part}"]`
        : '[data-testid="violin-inner"]'
    )
  );
const tooltipOf = (id: string): HTMLElement | null =>
  document.getElementById(`tooltip-${id}`);
const num = (el: Element | null, attr: string): number =>
  Number(el?.getAttribute(attr) ?? NaN);
const hasTransition = (node: Element | null): boolean =>
  node !== null && '__transition' in node;
const d3On = (node: Element | null): unknown =>
  node !== null && '__on' in node
    ? (node as unknown as { __on: unknown }).__on
    : undefined;

const pathCoords = (d: string | null): { x: number; y: number }[] => {
  if (!d) return [];
  const nums = [...d.matchAll(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)].map((m) =>
    Number(m[0])
  );
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    pts.push({ x: nums[i], y: nums[i + 1] });
  }
  return pts;
};

const pathExtent = (el: Element, axis: 'x' | 'y') => {
  const vs = pathCoords(el.getAttribute('d')).map((p) => p[axis]);
  const min = Math.min(...vs);
  const max = Math.max(...vs);
  return { min, max, mid: (min + max) / 2, span: max - min };
};

const hitMid = (hit: Element, orientation: 'vertical' | 'horizontal') =>
  orientation === 'vertical'
    ? num(hit, 'x') + num(hit, 'width') / 2
    : num(hit, 'y') + num(hit, 'height') / 2;

const axisTicks = (testId: string) =>
  Array.from(document.querySelectorAll(`[data-testid="${testId}"] .tick`)).map(
    (tick) => {
      const transform = tick.getAttribute('transform') ?? '';
      const m = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
      const text = Number(
        tick.querySelector('text')?.textContent?.replace(/,/g, '')
      );
      return {
        x: m ? Number(m[1]) : NaN,
        y: m ? Number(m[2]) : NaN,
        value: text,
      };
    }
  );

const plotOf = (
  margin: { top: number; right: number; bottom: number; left: number } = MARGIN,
  width = 400,
  height = 300
) => ({
  left: margin.left,
  right: width - margin.right,
  top: margin.top,
  bottom: height - margin.bottom,
});

/**
 * Value domain the chart uses: union of drawn extents, ±1 if zero-width,
 * then .nice(), then optional pins (ignored when start > end).
 */
const chartDomain = (
  extents: [number, number][],
  pins?: { start?: number; end?: number }
): [number, number] => {
  let lo = Math.min(...extents.map((e) => e[0]));
  let hi = Math.max(...extents.map((e) => e[1]));
  if (hi === lo) {
    lo -= 1;
    hi += 1;
  }
  const niced = scaleLinear().domain([lo, hi]).nice().domain();
  let start = pins?.start;
  let end = pins?.end;
  if (start !== undefined && end !== undefined && start > end) {
    start = undefined;
    end = undefined;
  }
  return [start ?? niced[0], end ?? niced[1]];
};

const valueScale = (
  domain: [number, number],
  orientation: 'vertical' | 'horizontal' = 'vertical',
  margin: { top: number; right: number; bottom: number; left: number } = MARGIN
) => {
  const p = plotOf(margin);
  return scaleLinear()
    .domain(domain)
    .range(orientation === 'vertical' ? [p.bottom, p.top] : [p.left, p.right]);
};

const invertPx = (
  scale: ReturnType<typeof scaleLinear>,
  px: number
): number => scale.invert(px);

const type7 = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: sorted[0],
    q1: quantile(sorted, 0.25)!,
    median: quantile(sorted, 0.5)!,
    q3: quantile(sorted, 0.75)!,
    max: sorted[sorted.length - 1],
  };
};

const hover = (el: Element) =>
  fireEvent.mouseEnter(el, { clientX: 20, clientY: 20 });

const TEN = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const BASE = rows(['A', TEN], ['B', TEN.map((v) => v + 20)]);
const defaultProps = {
  category: CAT,
  value: VAL,
  style: STYLE,
} as const;

describe('ViolinChart', () => {
  let warn: MockInstance<typeof console.warn>;

  beforeEach(() => {
    resetDevWarnings();
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warn.mockRestore();
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
  });

  it('1: renders data-testid="violin-chart" with role="img"', () => {
    render(<ViolinChart id='v1' data={BASE} {...defaultProps} />);
    const svg = svgOf();
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('role')).toBe('img');
  });

  it('2: one violin-shape per group, in first-appearance order; category.order reorders, unlisted follow, absent listed dropped', () => {
    const data = rows(['C', TEN], ['A', TEN], ['B', TEN]);
    const { unmount } = render(
      <ViolinChart id='v2a' data={data} {...defaultProps} />
    );
    expect(shapesOf().map((s) => s.getAttribute('data-category'))).toStrictEqual(
      ['C', 'A', 'B']
    );
    unmount();

    render(
      <ViolinChart
        id='v2b'
        data={data}
        category={{ key: 'cat', order: ['B', 'Missing', 'A'] }}
        value={VAL}
        style={STYLE}
      />
    );
    expect(shapesOf().map((s) => s.getAttribute('data-category'))).toStrictEqual(
      ['B', 'A', 'C']
    );
  });

  it('3: vertical default — groups left→right, values bottom→top, path symmetric about the band midline', () => {
    const data = rows(['A', TEN], ['B', TEN.map((v) => v + 5)]);
    render(<ViolinChart id='v3' data={data} {...defaultProps} />);
    const hits = hitsOf();
    expect(num(hits[0], 'x')).toBeLessThan(num(hits[1], 'x'));
    expect(hits.map((h) => h.getAttribute('data-category'))).toStrictEqual([
      'A',
      'B',
    ]);

    const shape = shapesOf()[0];
    const yExt = pathExtent(shape, 'y');
    const yFor = valueScale(chartDomain([[1, 10], [6, 15]]));
    expect(yFor(10)).toBeLessThan(yFor(1));
    expect(yExt.min).toBeCloseTo(yFor(10), 0);
    expect(yExt.max).toBeCloseTo(yFor(1), 0);
    expect(pathExtent(shape, 'x').mid).toBeCloseTo(
      hitMid(hits[0], 'vertical'),
      1
    );
  });

  it('4: orientation="horizontal" — groups top→bottom, values left→right, path mirrored about the horizontal midline', () => {
    const data = rows(['A', TEN], ['B', TEN]);
    render(
      <ViolinChart
        id='v4'
        data={data}
        {...defaultProps}
        orientation='horizontal'
      />
    );
    const hits = hitsOf();
    expect(num(hits[0], 'y')).toBeLessThan(num(hits[1], 'y'));

    const shape = shapesOf()[0];
    const xFor = valueScale(chartDomain([[1, 10]]), 'horizontal');
    expect(xFor(10)).toBeGreaterThan(xFor(1));
    const xExt = pathExtent(shape, 'x');
    expect(xExt.min).toBeCloseTo(xFor(1), 0);
    expect(xExt.max).toBeCloseTo(xFor(10), 0);
    expect(pathExtent(shape, 'y').mid).toBeCloseTo(
      hitMid(hits[0], 'horizontal'),
      1
    );
  });

  it('5: value domain is the niced data extent; zero is not included when all values are > 0', () => {
    render(
      <ViolinChart
        id='v5'
        data={rows(['A', [50, 60, 70, 80, 90]])}
        {...defaultProps}
      />
    );
    const niced = scaleLinear().domain([50, 90]).nice().domain();
    expect(niced[0]).toBeGreaterThan(0);
    const ticks = axisTicks('y-axis')
      .map((t) => t.value)
      .filter(Number.isFinite);
    expect(ticks.some((v) => v === 0)).toBe(false);
    expect(Math.min(...ticks)).toBeGreaterThan(0);
    expect(Math.min(...ticks)).toBeGreaterThanOrEqual(niced[0]);
    expect(Math.max(...ticks)).toBeLessThanOrEqual(niced[1]);
    // Tick values span the niced data extent, not a zero-based domain.
    expect(Math.min(...ticks)).toBe(niced[0]);
    expect(Math.max(...ticks)).toBe(niced[1]);
  });

  it('6: finite value.start/end pin the domain (0 honoured); marks outside are clipped; start > end is ignored with one warning', () => {
    const data = rows(['A', [50, 60, 70, 80, 90]]);
    const { unmount } = render(
      <ViolinChart
        id='v6a'
        data={data}
        category={CAT}
        value={{ key: 'v', start: 0, end: 80 }}
        style={STYLE}
      />
    );
    const ticksPinned = axisTicks('y-axis')
      .map((t) => t.value)
      .filter(Number.isFinite);
    expect(Math.min(...ticksPinned)).toBe(0);
    expect(Math.max(...ticksPinned)).toBe(80);
    const clip = document.getElementById('v6a-plot-clip');
    expect(clip).toBeTruthy();
    expect(clip?.querySelector('rect')).toBeTruthy();
    expect(document.querySelector('#v6a .marks')?.getAttribute('clip-path')).toBe(
      'url(#v6a-plot-clip)'
    );
    unmount();
    resetDevWarnings();
    warn.mockClear();

    render(
      <ViolinChart
        id='v6b'
        data={data}
        category={CAT}
        value={{ key: 'v', start: 90, end: 50 }}
        style={STYLE}
      />
    );
    const niced = scaleLinear().domain([50, 90]).nice().domain();
    const ticksIgnored = axisTicks('y-axis')
      .map((t) => t.value)
      .filter(Number.isFinite);
    expect(Math.min(...ticksIgnored)).toBe(niced[0]);
    expect(Math.max(...ticksIgnored)).toBe(niced[1]);
    expect(
      warn.mock.calls
        .map(([m]) => String(m))
        .filter((m) => m.includes('value.start'))
    ).toHaveLength(1);
  });

  it('7: Silverman bandwidth equals 0.9·min(sd, IQR/1.34)·n^-0.2; scott equals 1.06·sd·n^-0.2', () => {
    const data = rows(['A', TEN]);
    const stats = groupStats(TEN);
    const silverman =
      0.9 *
      Math.min(stats.sd, (stats.q3 - stats.q1) / 1.34) *
      Math.pow(stats.n, -0.2);
    const scott = 1.06 * stats.sd * Math.pow(stats.n, -0.2);
    expect(Math.abs(ruleBandwidth(stats, 'silverman') - silverman)).toBeLessThan(
      1e-9
    );
    expect(Math.abs(ruleBandwidth(stats, 'scott') - scott)).toBeLessThan(1e-9);

    const htmlS = vi.fn((d: unknown) => {
      expect(
        Math.abs((d as ViolinDatum).bandwidth! - silverman)
      ).toBeLessThan(1e-9);
      return 's';
    });
    const { unmount } = render(
      <ViolinChart
        id='v7a'
        data={data}
        {...defaultProps}
        tooltip={{ html: htmlS }}
      />
    );
    hover(hitsOf()[0]);
    expect(htmlS).toHaveBeenCalledOnce();
    unmount();

    const htmlC = vi.fn((d: unknown) => {
      expect(Math.abs((d as ViolinDatum).bandwidth! - scott)).toBeLessThan(1e-9);
      return 'c';
    });
    render(
      <ViolinChart
        id='v7b'
        data={data}
        {...defaultProps}
        density={{ bandwidth: 'scott' }}
        tooltip={{ html: htmlC }}
      />
    );
    hover(hitsOf()[0]);
    expect(htmlC).toHaveBeenCalledOnce();
  });

  it('8: numeric bandwidth and adjust change the curve (larger h → wider tails extent); invalid values fall back to the rule with one warning', () => {
    const data = rows(['A', TEN]);
    const { unmount } = render(
      <ViolinChart
        id='v8a'
        data={data}
        {...defaultProps}
        density={{ bandwidth: 1, extent: 'tails' }}
      />
    );
    const valueSpan = (bandwidth: number, el: Element) => {
      const domain = chartDomain([[1 - 3 * bandwidth, 10 + 3 * bandwidth]]);
      const scale = valueScale(domain);
      const ext = pathExtent(el, 'y');
      return Math.abs(invertPx(scale, ext.min) - invertPx(scale, ext.max));
    };
    const narrow = valueSpan(1, shapesOf()[0]);
    unmount();

    const r2 = render(
      <ViolinChart
        id='v8b'
        data={data}
        {...defaultProps}
        density={{ bandwidth: 4, extent: 'tails' }}
      />
    );
    const wide = valueSpan(4, shapesOf()[0]);
    expect(wide).toBeGreaterThan(narrow);
    expect(wide).toBeCloseTo(10 - 1 + 2 * 3 * 4, 0);
    r2.unmount();

    const fallback = resolveBandwidth(groupStats(TEN), undefined, undefined).h!;
    const html = vi.fn((d: unknown) => {
      expect((d as ViolinDatum).bandwidth).toBeCloseTo(fallback, 9);
      return 'ok';
    });
    resetDevWarnings();
    warn.mockClear();
    render(
      <ViolinChart
        id='v8c'
        data={data}
        {...defaultProps}
        density={{ bandwidth: -1, adjust: 0 }}
        tooltip={{ html }}
      />
    );
    hover(hitsOf()[0]);
    expect(html).toHaveBeenCalledOnce();
    expect(
      warn.mock.calls
        .map(([m]) => String(m))
        .filter((m) => /bandwidth|adjust/.test(m))
    ).toHaveLength(1);
  });

  it("9: kernel: 'epanechnikov' gives a different path from gaussian; density stays ≥ 0", () => {
    const data = rows(['A', TEN]);
    const stats = groupStats(TEN);
    const h = ruleBandwidth(stats, 'silverman');
    const gauss = kde(stats, h, { kernel: 'gaussian' });
    const epan = kde(stats, h, { kernel: 'epanechnikov' });
    expect(epan.every((p) => p.f >= 0)).toBe(true);
    expect(gauss.every((p) => p.f >= 0)).toBe(true);
    expect(epan.some((p, i) => p.f !== gauss[i].f)).toBe(true);

    const { unmount } = render(
      <ViolinChart id='v9a' data={data} {...defaultProps} />
    );
    const gaussianPath = shapesOf()[0].getAttribute('d');
    unmount();
    render(
      <ViolinChart
        id='v9b'
        data={data}
        {...defaultProps}
        density={{ kernel: 'epanechnikov' }}
      />
    );
    expect(shapesOf()[0].getAttribute('d')).not.toBe(gaussianPath);
  });

  it("10: extent: 'data' (default) path value-extent equals [min, max]; 'tails' extends to min−3h and max+3h and the domain grows", () => {
    const data = rows(['A', TEN]);
    const stats = groupStats(TEN);
    const { unmount } = render(
      <ViolinChart id='v10a' data={data} {...defaultProps} />
    );
    const dataDomain = chartDomain([[stats.min, stats.max]]);
    const yFor = valueScale(dataDomain);
    const dataExt = pathExtent(shapesOf()[0], 'y');
    expect(dataExt.max).toBeCloseTo(yFor(stats.min), 5);
    expect(dataExt.min).toBeCloseTo(yFor(stats.max), 5);
    const dataTickSpan = (() => {
      const vals = axisTicks('y-axis').map((t) => t.value).filter(Number.isFinite);
      return Math.max(...vals) - Math.min(...vals);
    })();
    unmount();

    const html = vi.fn((d: unknown) => String((d as ViolinDatum).bandwidth));
    render(
      <ViolinChart
        id='v10b'
        data={data}
        {...defaultProps}
        density={{ extent: 'tails' }}
        tooltip={{ html }}
      />
    );
    hover(hitsOf()[0]);
    const h = (html.mock.calls[0][0] as ViolinDatum).bandwidth!;
    const tailsLo = stats.min - 3 * h;
    const tailsHi = stats.max + 3 * h;
    const tailsDomain = chartDomain([[tailsLo, tailsHi]]);
    const yTails = valueScale(tailsDomain);
    const tailsExt = pathExtent(shapesOf()[0], 'y');
    expect(tailsExt.max).toBeCloseTo(yTails(tailsLo), 2);
    expect(tailsExt.min).toBeCloseTo(yTails(tailsHi), 2);
    const tickVals = axisTicks('y-axis')
      .map((t) => t.value)
      .filter(Number.isFinite);
    // Domain (after nice) includes the tails and is wider than the data-only domain.
    expect(tailsDomain[0]).toBeLessThanOrEqual(tailsLo + 1e-9);
    expect(tailsDomain[1]).toBeGreaterThanOrEqual(tailsHi - 1e-9);
    expect(Math.min(...tickVals)).toBeGreaterThanOrEqual(tailsDomain[0] - 1e-6);
    expect(Math.max(...tickVals)).toBeLessThanOrEqual(tailsDomain[1] + 1e-6);
    expect(Math.max(...tickVals) - Math.min(...tickVals)).toBeGreaterThan(
      dataTickSpan
    );
  });

  it("11: density.scale: 'area' (default) — the highest-density peak spans the half-band; other groups are narrower in proportion to their peak density", () => {
    const tight = [50, 50.2, 49.8, 50.1, 49.9, 50, 50.3, 49.7, 50.05, 49.95];
    const wide = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const data = rows(['Tight', tight], ['Wide', wide]);
    render(
      <ViolinChart
        id='v11'
        data={data}
        {...defaultProps}
        density={{ resolution: 512 }}
      />
    );
    const shapeOf = (name: string) =>
      shapesOf().find((s) => s.getAttribute('data-category') === name)!;
    const hitOf = (name: string) =>
      hitsOf().find((h) => h.getAttribute('data-category') === name)!;
    const halfWidth = (name: string) => {
      const mid = hitMid(hitOf(name), 'vertical');
      const xs = pathCoords(shapeOf(name).getAttribute('d')).map((p) => p.x);
      return Math.max(...xs.map((x) => Math.abs(x - mid)));
    };
    const tightW = halfWidth('Tight');
    const wideW = halfWidth('Wide');
    const halfBand = num(hitOf('Tight'), 'width') / 2 - 1;
    expect(tightW).toBeGreaterThan(wideW);
    expect(tightW).toBeCloseTo(halfBand, 0);

    const peak = (values: number[]) => {
      const s = groupStats(values);
      const h = ruleBandwidth(s, 'silverman');
      return Math.max(...kde(s, h, { resolution: 512 }).map((p) => p.f));
    };
    expect(tightW / wideW).toBeCloseTo(peak(tight) / peak(wide), 0);
  });

  it("12: scale: 'width' — every group's max width is equal; scale: 'count' — equal shapes n=10 vs n=40 have max widths in a 1:4 ratio", () => {
    const data = rows(['A', TEN], ['B', TEN.map((v) => v + 40)]);
    const { unmount } = render(
      <ViolinChart
        id='v12a'
        data={data}
        {...defaultProps}
        density={{ scale: 'width', resolution: 256 }}
      />
    );
    const halfWidth = (name: string) => {
      const hit = hitsOf().find((h) => h.getAttribute('data-category') === name)!;
      const shape = shapesOf().find(
        (s) => s.getAttribute('data-category') === name
      )!;
      const mid = hitMid(hit, 'vertical');
      const xs = pathCoords(shape.getAttribute('d')).map((p) => p.x);
      return Math.max(...xs.map((x) => Math.abs(x - mid)));
    };
    expect(halfWidth('A')).toBeCloseTo(halfWidth('B'), 1);
    unmount();

    const copies = Array.from({ length: 4 }, () => TEN).flat();
    render(
      <ViolinChart
        id='v12b'
        data={rows(['Small', TEN], ['Large', copies])}
        {...defaultProps}
        density={{ scale: 'count', bandwidth: 1.5, resolution: 256 }}
      />
    );
    expect(halfWidth('Large') / halfWidth('Small')).toBeCloseTo(4, 1);
  });

  it('13: resolution sets the number of evaluation points, clamped to [16, 512]', () => {
    const stats = groupStats(TEN);
    const h = ruleBandwidth(stats, 'silverman');
    expect(kde(stats, h, { resolution: 50 })).toHaveLength(50);
    expect(kde(stats, h, { resolution: 4 })).toHaveLength(16);
    expect(kde(stats, h, { resolution: 10000 })).toHaveLength(512);
    expect(kde(stats, h, {})).toHaveLength(100);
    expect(clampResolution(50)).toBe(50);
    expect(clampResolution(4)).toBe(16);
    expect(clampResolution(10000)).toBe(512);
    expect(clampResolution(undefined)).toBe(100);
  });

  it("14: side: 'start' / 'end' draws only the matching half, with the flat edge on the midline", () => {
    const data = rows(['A', TEN]);
    const { unmount } = render(
      <ViolinChart id='v14a' data={data} {...defaultProps} side='start' />
    );
    const mid = hitMid(hitsOf()[0], 'vertical');
    const startExt = pathExtent(shapesOf()[0], 'x');
    expect(startExt.max).toBeCloseTo(mid, 1);
    expect(startExt.min).toBeLessThan(mid - 2);
    unmount();

    render(<ViolinChart id='v14b' data={data} {...defaultProps} side='end' />);
    const mid2 = hitMid(hitsOf()[0], 'vertical');
    const endExt = pathExtent(shapesOf()[0], 'x');
    expect(endExt.min).toBeCloseTo(mid2, 1);
    expect(endExt.max).toBeGreaterThan(mid2 + 2);
  });

  it("15: inner default 'box' — Q1–Q3 rect, median mark and min–max whisker, positioned by d3 type-7 quantiles (same as binDataStats)", () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const data = rows(['A', values]);
    const q = type7(values);
    render(<ViolinChart id='v15' data={data} {...defaultProps} />);
    expect(innersOf('whisker')).toHaveLength(1);
    expect(innersOf('box')).toHaveLength(1);
    expect(innersOf('median')).toHaveLength(1);
    expect(innersOf('box')[0].tagName.toLowerCase()).toBe('rect');

    const yFor = valueScale(chartDomain([[q.min, q.max]]));
    const whisker = innersOf('whisker')[0];
    const ys = [num(whisker, 'y1'), num(whisker, 'y2')].sort((a, b) => a - b);
    expect(ys[0]).toBeCloseTo(yFor(q.max), 5);
    expect(ys[1]).toBeCloseTo(yFor(q.min), 5);

    const box = innersOf('box')[0];
    expect(num(box, 'y')).toBeCloseTo(Math.min(yFor(q.q1), yFor(q.q3)), 5);
    expect(num(box, 'height')).toBeCloseTo(Math.abs(yFor(q.q3) - yFor(q.q1)), 5);

    const median = innersOf('median')[0];
    expect(num(median, 'y1')).toBeCloseTo(yFor(q.median), 5);
    expect(num(median, 'y2')).toBeCloseTo(yFor(q.median), 5);
  });

  it("16: inner: 'quartiles' draws three lines across the violin width; 'median' draws one; 'none' draws no violin-inner; object form applies className and width", () => {
    const data = rows(['A', TEN]);
    const { unmount } = render(
      <ViolinChart id='v16a' data={data} {...defaultProps} inner='quartiles' />
    );
    expect(innersOf()).toHaveLength(3);
    expect(innersOf('q1')[0].getAttribute('stroke-dasharray')).toBe('4 2');
    expect(innersOf('q3')[0].getAttribute('stroke-dasharray')).toBe('4 2');
    expect(innersOf('median')[0].getAttribute('stroke-dasharray')).toBeNull();
    unmount();

    const r2 = render(
      <ViolinChart id='v16b' data={data} {...defaultProps} inner='median' />
    );
    expect(innersOf()).toHaveLength(1);
    expect(innersOf()[0].getAttribute('data-part')).toBe('median');
    r2.unmount();

    const r3 = render(
      <ViolinChart id='v16c' data={data} {...defaultProps} inner='none' />
    );
    expect(innersOf()).toHaveLength(0);
    r3.unmount();

    render(
      <ViolinChart
        id='v16d'
        data={data}
        {...defaultProps}
        inner={{ type: 'box', className: 'inner-custom', width: 0.4 }}
      />
    );
    innersOf().forEach((el) =>
      expect(el.getAttribute('class')).toContain('inner-custom')
    );
    const box = innersOf('box')[0];
    const band = num(hitsOf()[0], 'width');
    expect(num(box, 'width')).toBeCloseTo(0.4 * band, 1);
  });

  it('17: points is off by default; true draws one violin-point per valid sample; jitter is deterministic; jitter: 0 sits on the midline; side: start puts points on the empty half', () => {
    const data = rows(['A', TEN]);
    const { unmount } = render(
      <ViolinChart id='v17a' data={data} {...defaultProps} />
    );
    expect(pointsOf()).toHaveLength(0);
    unmount();

    const r2 = render(
      <ViolinChart id='v17b' data={data} {...defaultProps} points />
    );
    const first = pointsOf().map((p) => [num(p, 'cx'), num(p, 'cy')]);
    expect(first).toHaveLength(TEN.length);
    r2.rerender(<ViolinChart id='v17b' data={data} {...defaultProps} points />);
    const second = pointsOf().map((p) => [num(p, 'cx'), num(p, 'cy')]);
    expect(second).toStrictEqual(first);
    r2.unmount();

    const r3 = render(
      <ViolinChart
        id='v17c'
        data={data}
        {...defaultProps}
        points={{ jitter: 0 }}
      />
    );
    const mid = hitMid(hitsOf()[0], 'vertical');
    pointsOf().forEach((p) => expect(num(p, 'cx')).toBeCloseTo(mid, 5));
    r3.unmount();

    render(
      <ViolinChart
        id='v17d'
        data={data}
        {...defaultProps}
        side='start'
        points
      />
    );
    const midStart = hitMid(hitsOf()[0], 'vertical');
    pointsOf().forEach((p) => expect(num(p, 'cx')).toBeGreaterThan(midStart));
  });

  it('18: non-finite values are excluded (not drawn at 0); n counts only valid samples; one dev warning per id', () => {
    const data: Row[] = [
      { cat: 'A', v: 10 },
      { cat: 'A', v: Number.NaN },
      { cat: 'A', v: Infinity },
      { cat: 'A', v: -Infinity },
      { cat: 'A', v: 20 },
      // @ts-expect-error — runtime null value
      { cat: 'A', v: null },
    ];
    const html = vi.fn((d: unknown) => String((d as ViolinDatum).n));
    render(
      <ViolinChart
        id='v18'
        data={data}
        {...defaultProps}
        points
        tooltip={{ html }}
      />
    );
    hover(hitsOf()[0]);
    expect((html.mock.calls[0][0] as ViolinDatum).n).toBe(2);
    expect(pointsOf()).toHaveLength(2);
    const yFor = valueScale(chartDomain([[10, 20]]));
    const ys = pointsOf().map((p) => num(p, 'cy')).sort((a, b) => a - b);
    expect(ys[0]).toBeCloseTo(yFor(20), 5);
    expect(ys[1]).toBeCloseTo(yFor(10), 5);
    expect(ys.every((y) => Math.abs(y - yFor(0)) > 2)).toBe(true);
    expect(
      warn.mock.calls
        .map(([m]) => String(m))
        .filter((m) => m.includes('non-finite'))
    ).toHaveLength(1);
  });

  it('19: null/undefined category rows are skipped, with one warning', () => {
    const data = [
      { cat: 'A', v: 1 },
      { cat: 'A', v: 2 },
      { cat: 'A', v: 3 },
      { cat: 'A', v: 4 },
      { cat: 'A', v: 5 },
      { cat: null, v: 50 },
      { cat: undefined, v: 60 },
    ] as unknown as Row[];
    render(<ViolinChart id='v19' data={data} {...defaultProps} />);
    expect(shapesOf().map((s) => s.getAttribute('data-category'))).toStrictEqual(
      ['A']
    );
    expect(hitsOf().map((h) => h.getAttribute('data-category'))).toStrictEqual([
      'A',
    ]);
    expect(
      warn.mock.calls
        .map(([m]) => String(m))
        .filter((m) => m.includes('category'))
    ).toHaveLength(1);
  });

  it('20: n = 0 group — the band and tick remain, no shape is drawn, the hit area shows n: 0 and n/a stats, and no NaN/Infinity appears in the DOM or tooltip', () => {
    const data: Row[] = [
      ...rows(['A', TEN]),
      { cat: 'Empty', v: Number.NaN },
      { cat: 'Empty', v: Infinity },
    ];
    render(
      <ViolinChart
        id='v20'
        data={data}
        {...defaultProps}
        tooltip={{}}
      />
    );
    expect(
      shapesOf().map((s) => s.getAttribute('data-category'))
    ).toStrictEqual(['A']);
    const ticks = Array.from(
      document.querySelectorAll('[data-testid="x-axis"] .tick text')
    ).map((t) => t.textContent);
    expect(ticks).toContain('Empty');
    const hit = hitsOf().find((h) => h.getAttribute('data-category') === 'Empty')!;
    expect(hit).toBeTruthy();
    hover(hit);
    const tip = tooltipOf('v20');
    expect(tip?.innerHTML).toContain('Empty');
    expect(tip?.innerHTML).toMatch(/n:\s*0/);
    expect(tip?.innerHTML).toMatch(/n\/a/);
    expect(tip?.innerHTML).not.toMatch(/NaN|Infinity/);
    expect(svgOf().innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it('21: n = 1 and zero-spread groups — a violin-degenerate tick at the value, bandwidth: null, one warning, and no NaN attributes', () => {
    const html = vi.fn((d: unknown) => {
      expect((d as ViolinDatum).bandwidth).toBeNull();
      return 'ok';
    });
    const { unmount } = render(
      <ViolinChart
        id='v21a'
        data={rows(['One', [42]])}
        {...defaultProps}
        tooltip={{ html }}
      />
    );
    const tick = degeneratesOf()[0];
    expect(tick).toBeTruthy();
    expect(tick.getAttribute('class')).toContain('violin-degenerate');
    expect(shapesOf()).toHaveLength(0);
    hover(hitsOf()[0]);
    expect((html.mock.calls[0][0] as ViolinDatum).bandwidth).toBeNull();
    expect((html.mock.calls[0][0] as ViolinDatum).n).toBe(1);
    expect(svgOf().innerHTML).not.toMatch(/NaN|Infinity/);
    expect(
      warn.mock.calls
        .map(([m]) => String(m))
        .filter((m) => /one sample|zero spread|degenerate/.test(m))
    ).toHaveLength(1);
    unmount();

    resetDevWarnings();
    warn.mockClear();
    html.mockClear();
    render(
      <ViolinChart
        id='v21b'
        data={rows(['Flat', [7, 7, 7, 7]])}
        {...defaultProps}
        tooltip={{ html }}
      />
    );
    expect(degeneratesOf()).toHaveLength(1);
    hover(hitsOf()[0]);
    expect((html.mock.calls[0][0] as ViolinDatum).bandwidth).toBeNull();
    expect((html.mock.calls[0][0] as ViolinDatum).n).toBe(4);
    expect(
      warn.mock.calls
        .map(([m]) => String(m))
        .filter((m) => /one sample|zero spread|degenerate/.test(m))
    ).toHaveLength(1);
    expect(svgOf().innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it('22: 2 ≤ n < 5 — the KDE is drawn, with one small-n warning', () => {
    render(
      <ViolinChart
        id='v22'
        data={rows(['A', [1, 2, 3]])}
        {...defaultProps}
      />
    );
    expect(shapesOf()).toHaveLength(1);
    expect(degeneratesOf()).toHaveLength(0);
    expect(
      warn.mock.calls
        .map(([m]) => String(m))
        .filter((m) => /unreliable|only 3 samples|points/.test(m))
    ).toHaveLength(1);
  });

  it('23: all groups degenerate — the value domain is non-zero-width (value ± 1)', () => {
    render(
      <ViolinChart
        id='v23'
        data={rows(['A', [50]], ['B', [50, 50]])}
        {...defaultProps}
      />
    );
    const ticks = axisTicks('y-axis')
      .map((t) => t.value)
      .filter(Number.isFinite);
    expect(Math.max(...ticks) - Math.min(...ticks)).toBeGreaterThan(0);
    expect(Math.min(...ticks)).toBeCloseTo(49, 5);
    expect(Math.max(...ticks)).toBeCloseTo(51, 5);
  });

  it('24: empty data — no marks, the shell remains, and nothing throws', () => {
    expect(() =>
      render(<ViolinChart id='v24' data={[]} {...defaultProps} />)
    ).not.toThrow();
    const svg = svgOf();
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('role')).toBe('img');
    expect(shapesOf()).toHaveLength(0);
    expect(hitsOf()).toHaveLength(0);
    expect(innersOf()).toHaveLength(0);
    expect(pointsOf()).toHaveLength(0);
    expect(svg.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it('25: classNameMap applies per group; missing groups fall back to value.className; no fill is set by default', () => {
    const { unmount } = render(
      <ViolinChart id='v25a' data={BASE} {...defaultProps} />
    );
    shapesOf().forEach((s) => {
      expect(s.getAttribute('fill')).toBeNull();
      expect(s.getAttribute('class')).toContain('fill-current');
      expect(s.getAttribute('class')).not.toMatch(/fill-(slate|red|blue)/);
    });
    unmount();

    render(
      <ViolinChart
        id='v25b'
        data={BASE}
        category={CAT}
        value={{ key: 'v', className: 'fill-fallback' }}
        classNameMap={{ A: 'fill-mapped' }}
        style={STYLE}
      />
    );
    const byCat = Object.fromEntries(
      shapesOf().map((s) => [s.getAttribute('data-category')!, s.getAttribute('class')!])
    );
    expect(byCat.A).toContain('fill-mapped');
    expect(byCat.A).not.toContain('fill-fallback');
    expect(byCat.B).toContain('fill-fallback');
  });

  it('26: tooltip default HTML has category, n, median, IQR and range, formatted with value.format; tooltip.html overrides and receives a ViolinDatum', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const data = rows(['Sales', values]);
    const q = type7(values);
    const fmt = (v: number) => `F${v.toFixed(1)}`;
    const { unmount } = render(
      <ViolinChart
        id='v26a'
        data={data}
        category={CAT}
        value={{ key: 'v', format: fmt }}
        tooltip={{}}
        style={STYLE}
      />
    );
    hover(hitsOf()[0]);
    const tip = tooltipOf('v26a');
    expect(tip?.innerHTML).toContain('Sales');
    expect(tip?.innerHTML).toMatch(/n:\s*10/);
    expect(tip?.innerHTML).toContain(`median: ${fmt(q.median)}`);
    expect(tip?.innerHTML).toContain(`IQR: ${fmt(q.q1)}–${fmt(q.q3)}`);
    expect(tip?.innerHTML).toContain(`range: ${fmt(q.min)}–${fmt(q.max)}`);
    unmount();
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());

    const html = vi.fn((d: unknown) => {
      const datum = d as ViolinDatum<Row>;
      expect(datum.category).toBe('Sales');
      expect(datum.n).toBe(10);
      expect(datum.rows).toHaveLength(10);
      expect(datum.median).toBeCloseTo(q.median, 9);
      expect(datum).toHaveProperty('bandwidth');
      expect(datum).toHaveProperty('mean');
      return `custom:${datum.category}:${datum.n}`;
    });
    render(
      <ViolinChart
        id='v26b'
        data={data}
        {...defaultProps}
        tooltip={{ html }}
      />
    );
    hover(hitsOf()[0]);
    expect(html).toHaveBeenCalledOnce();
    expect(tooltipOf('v26b')?.innerHTML).toBe('custom:Sales:10');
  });

  it("27: hit area — hovering inside a group's band but outside its painted shape shows that group's tooltip; points and shapes have no listeners; each hover fires once", () => {
    const data = [
      ...rows(['A', TEN]),
      ...rows(['Thin', [1, 1.1, 0.9, 1.05, 0.95, 1, 1.2, 0.8, 1, 1]]),
      { cat: 'Tick', v: 5 },
    ];
    const html = vi.fn((d: unknown) => `tip:${(d as ViolinDatum).category}`);
    render(
      <ViolinChart
        id='v27'
        data={data}
        {...defaultProps}
        side='start'
        points
        tooltip={{ html }}
      />
    );
    const half = shapesOf().find((s) => s.getAttribute('data-category') === 'A')!;
    const mid = hitMid(
      hitsOf().find((h) => h.getAttribute('data-category') === 'A')!,
      'vertical'
    );
    expect(pathExtent(half, 'x').max).toBeCloseTo(mid, 1);
    const hitA = hitsOf().find((h) => h.getAttribute('data-category') === 'A')!;
    expect(num(hitA, 'width')).toBeGreaterThan(pathExtent(half, 'x').span);

    shapesOf().forEach((s) => expect(d3On(s)).toBeUndefined());
    pointsOf().forEach((p) => expect(d3On(p)).toBeUndefined());
    degeneratesOf().forEach((t) => expect(d3On(t)).toBeUndefined());

    fireEvent.mouseEnter(half, { clientX: 20, clientY: 20 });
    expect(html).not.toHaveBeenCalled();

    hover(hitA);
    expect(html).toHaveBeenCalledOnce();
    expect(tooltipOf('v27')?.innerHTML).toBe('tip:A');

    html.mockClear();
    const hitTick = hitsOf().find((h) => h.getAttribute('data-category') === 'Tick')!;
    hover(hitTick);
    expect(html).toHaveBeenCalledOnce();
    expect(tooltipOf('v27')?.innerHTML).toBe('tip:Tick');
  });

  it('28: tooltip stability — re-rendering with a new tooltip object identity does not redraw marks or rebind listeners; the latest tooltip.html is used on the next hover', () => {
    const data = rows(['A', TEN]);
    const category = { key: 'cat' };
    const value = { key: 'v' };
    const first = vi.fn(() => 'first');
    const second = vi.fn(() => 'second');
    const { rerender } = render(
      <ViolinChart
        id='v28'
        data={data}
        category={category}
        value={value}
        tooltip={{ html: first }}
        style={STYLE}
      />
    );
    const shape = shapesOf()[0];
    const hit = hitsOf()[0];
    const listeners = d3On(hit);
    expect(listeners).toBeTruthy();

    rerender(
      <ViolinChart
        id='v28'
        data={data}
        category={category}
        value={value}
        tooltip={{ html: second }}
        style={STYLE}
      />
    );
    expect(shapesOf()[0]).toBe(shape);
    expect(hitsOf()[0]).toBe(hit);
    expect(d3On(hit)).toBe(listeners);

    hover(hit);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    expect(tooltipOf('v28')?.innerHTML).toBe('second');
  });

  it('29: transitions — a data change mid-transition interrupts the old transition; final geometry matches the new data with no leftover nodes; unmount mid-transition interrupts with no errors', () => {
    const firstData = rows(['A', TEN], ['B', TEN]);
    const nextData = rows(['C', [20, 30, 40, 50, 60, 70, 80, 90, 25, 35]]);
    const drawing = { duration: 400 };
    const { rerender, unmount } = render(
      <ViolinChart
        id='v29'
        data={firstData}
        {...defaultProps}
        drawing={drawing}
      />
    );
    const firstShapes = shapesOf();
    expect(firstShapes).toHaveLength(2);
    expect(firstShapes.some(hasTransition)).toBe(true);

    rerender(
      <ViolinChart
        id='v29'
        data={nextData}
        {...defaultProps}
        drawing={drawing}
      />
    );
    firstShapes.forEach((s) => expect(hasTransition(s)).toBe(false));
    expect(shapesOf().map((s) => s.getAttribute('data-category'))).toStrictEqual(
      ['C']
    );
    expect(document.querySelectorAll('#v29 .violin-group')).toHaveLength(1);

    rerender(
      <ViolinChart
        id='v29'
        data={nextData}
        {...defaultProps}
        drawing={{ duration: 0 }}
      />
    );
    expect(shapesOf()).toHaveLength(1);
    expect(shapesOf()[0].getAttribute('data-category')).toBe('C');
    const yFor = valueScale(chartDomain([[20, 90]]));
    const ext = pathExtent(shapesOf()[0], 'y');
    expect(ext.min).toBeCloseTo(yFor(90), 5);
    expect(ext.max).toBeCloseTo(yFor(20), 5);

    rerender(
      <ViolinChart
        id='v29'
        data={nextData}
        {...defaultProps}
        drawing={drawing}
      />
    );
    const live = shapesOf()[0];
    expect(hasTransition(live)).toBe(true);
    const errors: unknown[] = [];
    const err = vi.spyOn(console, 'error').mockImplementation((...a) => {
      errors.push(a);
    });
    expect(() => unmount()).not.toThrow();
    expect(hasTransition(live)).toBe(false);
    expect(errors).toHaveLength(0);
    err.mockRestore();
  });

  it('30: title/description → <title>/<desc> + aria-*; otherwise aria-label is "Violin chart" or ariaLabel', () => {
    const { unmount } = render(
      <ViolinChart
        id='v30a'
        data={BASE}
        {...defaultProps}
        title='Salary distribution'
        description='By department'
      />
    );
    const svg = svgOf();
    const title = svg.querySelector('title');
    const desc = svg.querySelector('desc');
    expect(title?.textContent).toBe('Salary distribution');
    expect(title?.id).toBe('v30a-title');
    expect(desc?.textContent).toBe('By department');
    expect(desc?.id).toBe('v30a-desc');
    expect(svg.getAttribute('aria-labelledby')).toBe('v30a-title');
    expect(svg.getAttribute('aria-describedby')).toBe('v30a-desc');
    expect(svg.getAttribute('aria-label')).toBeNull();
    unmount();

    const r2 = render(<ViolinChart id='v30b' data={BASE} {...defaultProps} />);
    expect(svgOf().getAttribute('aria-label')).toBe('Violin chart');
    r2.unmount();

    render(
      <ViolinChart
        id='v30c'
        data={BASE}
        {...defaultProps}
        ariaLabel='Pay violins'
      />
    );
    expect(document.getElementById('v30c')?.getAttribute('aria-label')).toBe(
      'Pay violins'
    );
  });

  it('31: padding.bar widens gaps between bands, and margin insets the plot', () => {
    const data = rows(['A', TEN], ['B', TEN], ['C', TEN]);
    const { unmount } = render(
      <ViolinChart
        id='v31a'
        data={data}
        {...defaultProps}
        padding={{ bar: 0 }}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      />
    );
    const tight = hitsOf();
    expect(num(tight[0], 'x')).toBeCloseTo(0, 5);
    expect(num(tight[0], 'width') + num(tight[1], 'width') + num(tight[2], 'width')).toBeCloseTo(
      400,
      5
    );
    expect(num(tight[1], 'x')).toBeCloseTo(
      num(tight[0], 'x') + num(tight[0], 'width'),
      5
    );
    expect(num(tight[0], 'y')).toBeCloseTo(0, 5);
    expect(num(tight[0], 'height')).toBeCloseTo(300, 5);
    unmount();

    render(
      <ViolinChart
        id='v31b'
        data={data}
        {...defaultProps}
        padding={{ bar: 0.5 }}
        margin={{ top: 40, right: 40, bottom: 40, left: 40 }}
      />
    );
    const loose = hitsOf();
    expect(num(loose[0], 'x')).toBeGreaterThan(40);
    expect(num(loose[0], 'y')).toBeCloseTo(40, 5);
    expect(num(loose[0], 'height')).toBeCloseTo(220, 5);
    const gap = num(loose[1], 'x') - (num(loose[0], 'x') + num(loose[0], 'width'));
    expect(gap).toBeGreaterThan(10);
    expect(num(loose[0], 'width')).toBeLessThan(num(tight[0], 'width'));
  });

  it('32: changing orientation, side, inner, points or data at runtime redraws with no leftover nodes', () => {
    const data = rows(['A', TEN], ['B', TEN]);
    const { rerender } = render(
      <ViolinChart id='v32' data={data} {...defaultProps} />
    );
    expect(document.querySelector('#v32 [data-testid="y-axis"].axis--value')).toBeTruthy();

    rerender(
      <ViolinChart
        id='v32'
        data={data}
        {...defaultProps}
        orientation='horizontal'
      />
    );
    expect(document.querySelector('#v32 [data-testid="x-axis"].axis--value')).toBeTruthy();
    expect(document.querySelectorAll('#v32 [data-testid="y-axis"].axis--value')).toHaveLength(0);
    expect(shapesOf()).toHaveLength(2);

    rerender(
      <ViolinChart
        id='v32'
        data={data}
        {...defaultProps}
        orientation='horizontal'
        side='start'
      />
    );
    expect(pathExtent(shapesOf()[0], 'y').max).toBeCloseTo(
      hitMid(hitsOf()[0], 'horizontal'),
      1
    );

    rerender(
      <ViolinChart
        id='v32'
        data={data}
        {...defaultProps}
        side='start'
        inner='none'
        points
      />
    );
    expect(innersOf()).toHaveLength(0);
    expect(pointsOf()).toHaveLength(TEN.length * 2);
    expect(shapesOf()).toHaveLength(2);

    rerender(
      <ViolinChart
        id='v32'
        data={rows(['Solo', TEN])}
        {...defaultProps}
        inner='box'
      />
    );
    expect(shapesOf().map((s) => s.getAttribute('data-category'))).toStrictEqual(
      ['Solo']
    );
    expect(hitsOf()).toHaveLength(1);
    expect(pointsOf()).toHaveLength(0);
    expect(document.querySelectorAll('#v32 .violin-group')).toHaveLength(1);
  });

  it("33: catalog — violin / violin plot / violin chart resolve to ViolinChart; raincloud plot resolves to the Raincloud variant; reserved aliases do not collide; meta.category is 'ranges' and distribution is the primary intent on that decisionTree branch", () => {
    expect(resolveChartRequest('violin')?.chart.name).toBe('ViolinChart');
    expect(resolveChartRequest('violin plot')?.chart.name).toBe('ViolinChart');
    expect(resolveChartRequest('violin chart')?.chart.name).toBe('ViolinChart');

    const rain = resolveChartRequest('raincloud plot');
    expect(rain?.chart.name).toBe('ViolinChart');
    expect(rain?.variant?.name).toBe('Raincloud plot');

    expect(resolveChartRequest('density plot')?.chart.name).toBe('ScatterPlot');
    expect(resolveChartRequest('grouped distribution plot')?.chart.name).toBe(
      'BoxPlotH'
    );
    expect(resolveChartRequest('heatmap')?.chart.name).toBe('WaffleChart');
    expect(resolveChartRequest('slope chart')?.chart.name).toBe('CometPlot');
    expect(resolveChartRequest('combo chart')?.chart.name).toBe('LineChart');
    for (const alias of [
      'density plot',
      'grouped distribution plot',
      'heatmap',
      'slope chart',
      'combo chart',
    ]) {
      expect(resolveChartRequest(alias)?.chart.name).not.toBe('ViolinChart');
    }

    const meta = resolveChartRequest('ViolinChart')?.chart;
    expect(meta?.category).toBe('ranges');
    expect(meta?.intents[0]).toBe('distribution');

    const distribution = decisionTree.find((b) => b.intent === 'distribution');
    expect(distribution?.options.some((o) => o.name === 'ViolinChart')).toBe(
      true
    );
  });
});
