import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { decisionTree, resolveChartRequest } from '@/catalog';
import { resetDevWarnings } from '@/utils/devEnvironment';

import FunnelChart from '.';
import sample from './sample.json';

const STYLE = { width: '400px', height: '300px' } as const;
const STAGE = { key: 'name' } as const;
const VALUE = { key: 'count' } as const;

type Row = { name: string; count: number };

const stagesOf = (container: HTMLElement = document.body) =>
  Array.from(
    container.querySelectorAll<SVGElement>('[data-testid="funnel-stage"]')
  );
const hitsOf = (container: HTMLElement = document.body) =>
  Array.from(
    container.querySelectorAll<SVGElement>('[data-testid="funnel-hit"]')
  );

const tooltipOf = (id: string): HTMLElement | null =>
  document.getElementById(`tooltip-${id}`);

const num = (el: Element | null, attr: string): number =>
  Number(el?.getAttribute(attr) ?? NaN);

describe('FunnelChart', () => {
  beforeEach(() => {
    resetDevWarnings();
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
  });

  afterEach(() => {
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
  });

  it('1: renders data-testid="funnel-chart" with role="img"', () => {
    render(
      <FunnelChart
        id='f1'
        data={sample}
        stage={STAGE}
        value={VALUE}
        style={STYLE}
      />
    );
    const svg = screen.getByTestId('funnel-chart');
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('role')).toBe('img');
  });

  it('2: vertical default — stage order top→bottom, widths ∝ values, centred on midline', () => {
    const data: Row[] = [
      { name: 'A', count: 100 },
      { name: 'B', count: 50 },
      { name: 'C', count: 25 },
    ];
    render(
      <FunnelChart
        id='f2'
        data={data}
        stage={STAGE}
        value={VALUE}
        style={STYLE}
      />
    );
    const marks = stagesOf();
    expect(marks).toHaveLength(3);
    expect(marks.map((m) => m.getAttribute('data-stage'))).toStrictEqual([
      'A',
      'B',
      'C',
    ]);
    // Top → bottom: y increases with index.
    expect(num(marks[0], 'y')).toBeLessThan(num(marks[1], 'y'));
    expect(num(marks[1], 'y')).toBeLessThan(num(marks[2], 'y'));
    // Widths proportional to values (100:50:25 → 2:1:0.5).
    const w0 = num(marks[0], 'width');
    const w1 = num(marks[1], 'width');
    const w2 = num(marks[2], 'width');
    expect(w0 / w1).toBeCloseTo(2, 5);
    expect(w1 / w2).toBeCloseTo(2, 5);
    // Centred on the vertical midline (default margin 20 → centre = 200).
    const centre = 200;
    marks.forEach((m) => {
      const mid = num(m, 'x') + num(m, 'width') / 2;
      expect(mid).toBeCloseTo(centre, 5);
    });
  });

  it('3: orientation="horizontal" — stages left→right, lengths are heights, centred on midline', () => {
    const data: Row[] = [
      { name: 'A', count: 100 },
      { name: 'B', count: 50 },
      { name: 'C', count: 25 },
    ];
    render(
      <FunnelChart
        id='f3'
        data={data}
        stage={STAGE}
        value={VALUE}
        orientation='horizontal'
        style={STYLE}
      />
    );
    const marks = stagesOf();
    expect(marks).toHaveLength(3);
    // Left → right: x increases with index.
    expect(num(marks[0], 'x')).toBeLessThan(num(marks[1], 'x'));
    expect(num(marks[1], 'x')).toBeLessThan(num(marks[2], 'x'));
    // Lengths are heights, proportional to values.
    const h0 = num(marks[0], 'height');
    const h1 = num(marks[1], 'height');
    const h2 = num(marks[2], 'height');
    expect(h0 / h1).toBeCloseTo(2, 5);
    expect(h1 / h2).toBeCloseTo(2, 5);
    // Centred on the horizontal midline (default margin 20 → centre = 150).
    const centre = 150;
    marks.forEach((m) => {
      const mid = num(m, 'y') + num(m, 'height') / 2;
      expect(mid).toBeCloseTo(centre, 5);
    });
  });

  it('4: value domain is [0, max]; longest stage spans the full cross-axis plot span', () => {
    const data: Row[] = [
      { name: 'A', count: 100 },
      { name: 'B', count: 40 },
    ];
    render(
      <FunnelChart
        id='f4'
        data={data}
        stage={STAGE}
        value={VALUE}
        style={STYLE}
      />
    );
    const marks = stagesOf();
    // Default margin 20 → plot span = 400 - 40 = 360.
    expect(num(marks[0], 'data-near')).toBeCloseTo(360, 5);
    expect(num(marks[0], 'width')).toBeCloseTo(360, 5);
    expect(num(marks[1], 'width')).toBeCloseTo(144, 5);
  });

  it('5: finite value.end pins the upper domain; finite value.start is ignored and warns once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const data: Row[] = [
      { name: 'A', count: 100 },
      { name: 'B', count: 50 },
    ];
    const props = {
      id: 'f5',
      data,
      stage: STAGE,
      value: { key: 'count', end: 200, start: 10 },
      style: STYLE,
    };
    const { rerender } = render(<FunnelChart {...props} />);
    const marks = stagesOf();
    // end=200 pins domain; A length = 100/200 * 360 = 180.
    expect(num(marks[0], 'width')).toBeCloseTo(180, 5);
    expect(num(marks[1], 'width')).toBeCloseTo(90, 5);
    // start ignored: marks still grow from 0 (centred, not offset).
    const centre = 200;
    expect(num(marks[0], 'x') + num(marks[0], 'width') / 2).toBeCloseTo(
      centre,
      5
    );

    rerender(<FunnelChart {...props} className='redraw' />);
    const startWarns = warn.mock.calls
      .map(([m]) => String(m))
      .filter((m) => m.includes('value.start'));
    expect(startWarns).toHaveLength(1);
    warn.mockRestore();
  });

  it('6: shape="bar" — one rect per stage; length = scale(v)', () => {
    const data: Row[] = [
      { name: 'A', count: 80 },
      { name: 'B', count: 40 },
    ];
    render(
      <FunnelChart
        id='f6'
        data={data}
        stage={STAGE}
        value={VALUE}
        shape='bar'
        style={STYLE}
      />
    );
    const marks = stagesOf();
    expect(marks).toHaveLength(2);
    marks.forEach((m) => expect(m.tagName.toLowerCase()).toBe('rect'));
    expect(num(marks[0], 'width')).toBeCloseTo(num(marks[0], 'data-near'), 5);
    expect(num(marks[1], 'width')).toBeCloseTo(num(marks[1], 'data-near'), 5);
    expect(num(marks[0], 'data-near') / num(marks[1], 'data-near')).toBeCloseTo(
      2,
      5
    );
  });

  it('7: shape="trapezoid" — far edge matches next near; last stage data-far="0"; single stage is a triangle', () => {
    const data: Row[] = [
      { name: 'A', count: 100 },
      { name: 'B', count: 60 },
      { name: 'C', count: 20 },
    ];
    const { unmount } = render(
      <FunnelChart
        id='f7'
        data={data}
        stage={STAGE}
        value={VALUE}
        shape='trapezoid'
        style={STYLE}
      />
    );
    const marks = stagesOf();
    expect(marks).toHaveLength(3);
    marks.forEach((m) => expect(m.tagName.toLowerCase()).toBe('path'));
    // Stage i < n-1: far edge matches stage i+1 near width.
    expect(num(marks[0], 'data-far')).toBeCloseTo(num(marks[1], 'data-near'), 5);
    expect(num(marks[1], 'data-far')).toBeCloseTo(num(marks[2], 'data-near'), 5);
    // Last stage tapers to a point.
    expect(marks[2].getAttribute('data-far')).toBe('0');
    expect(num(marks[2], 'data-near')).toBeGreaterThan(0);
    unmount();

    // Single-stage trapezoid is one triangle (far = 0).
    render(
      <FunnelChart
        id='f7b'
        data={[{ name: 'Only', count: 50 }]}
        stage={STAGE}
        value={VALUE}
        shape='trapezoid'
        style={STYLE}
      />
    );
    const one = stagesOf();
    expect(one).toHaveLength(1);
    expect(one[0].tagName.toLowerCase()).toBe('path');
    expect(one[0].getAttribute('data-far')).toBe('0');
    expect(num(one[0], 'data-near')).toBeGreaterThan(0);
  });

  it('8: labels.stage: true prints stage strings; format overrides text', () => {
    const data: Row[] = [
      { name: 'Visit', count: 10 },
      { name: 'Paid', count: 4 },
    ];
    const { unmount } = render(
      <FunnelChart
        id='f8'
        data={data}
        stage={STAGE}
        value={VALUE}
        labels={{ stage: true }}
        style={STYLE}
      />
    );
    const labels = screen.getAllByTestId('funnel-label-stage');
    expect(labels.map((l) => l.textContent)).toStrictEqual(['Visit', 'Paid']);
    unmount();

    render(
      <FunnelChart
        id='f8b'
        data={data}
        stage={STAGE}
        value={VALUE}
        labels={{
          stage: {
            format: (s, _d, i) => `${i}:${s.toUpperCase()}`,
          },
        }}
        style={STYLE}
      />
    );
    expect(
      screen.getAllByTestId('funnel-label-stage').map((l) => l.textContent)
    ).toStrictEqual(['0:VISIT', '1:PAID']);
  });

  it('9: labels.value: true prints values; format overrides', () => {
    const data: Row[] = [
      { name: 'A', count: 12 },
      { name: 'B', count: 7 },
    ];
    const { unmount } = render(
      <FunnelChart
        id='f9'
        data={data}
        stage={STAGE}
        value={VALUE}
        labels={{ value: true }}
        style={STYLE}
      />
    );
    const labels = screen.getAllByTestId('funnel-label-value');
    expect(labels.map((l) => l.textContent)).toStrictEqual(['12', '7']);
    unmount();

    render(
      <FunnelChart
        id='f9b'
        data={data}
        stage={STAGE}
        value={VALUE}
        labels={{
          value: { format: (v) => `n=${v}` },
        }}
        style={STYLE}
      />
    );
    expect(
      screen.getAllByTestId('funnel-label-value').map((l) => l.textContent)
    ).toStrictEqual(['n=12', 'n=7']);
  });

  it("10: labels.percent: 'ofFirst' — first 100%; later v_i/v_0; zero first → every 'n/a'", () => {
    const data: Row[] = [
      { name: 'A', count: 100 },
      { name: 'B', count: 40 },
      { name: 'C', count: 25 },
    ];
    const { unmount } = render(
      <FunnelChart
        id='f10'
        data={data}
        stage={STAGE}
        value={VALUE}
        labels={{ percent: 'ofFirst' }}
        style={STYLE}
      />
    );
    const pcts = screen.getAllByTestId('funnel-label-percent');
    expect(pcts.map((p) => p.getAttribute('data-kind'))).toStrictEqual([
      'ofFirst',
      'ofFirst',
      'ofFirst',
    ]);
    expect(pcts.map((p) => p.textContent)).toStrictEqual([
      '100%',
      '40%',
      '25%',
    ]);
    pcts.forEach((p) => {
      expect(p.textContent).not.toMatch(/NaN|Infinity/);
    });
    unmount();

    render(
      <FunnelChart
        id='f10z'
        data={[
          { name: 'A', count: 0 },
          { name: 'B', count: 5 },
        ]}
        stage={STAGE}
        value={VALUE}
        labels={{ percent: 'ofFirst' }}
        style={STYLE}
      />
    );
    expect(
      screen.getAllByTestId('funnel-label-percent').map((p) => p.textContent)
    ).toStrictEqual(['n/a', 'n/a']);
  });

  it("11: labels.percent: 'ofPrevious' — index 0 is 'n/a'; others v_i/v_{i-1}; mid-zero divisor → 'n/a'", () => {
    const data: Row[] = [
      { name: 'A', count: 100 },
      { name: 'B', count: 50 },
      { name: 'C', count: 25 },
    ];
    const { unmount } = render(
      <FunnelChart
        id='f11'
        data={data}
        stage={STAGE}
        value={VALUE}
        labels={{ percent: 'ofPrevious' }}
        style={STYLE}
      />
    );
    const pcts = screen.getAllByTestId('funnel-label-percent');
    expect(pcts.map((p) => p.textContent)).toStrictEqual([
      'n/a',
      '50%',
      '50%',
    ]);
    unmount();

    render(
      <FunnelChart
        id='f11z'
        data={[
          { name: 'A', count: 10 },
          { name: 'B', count: 0 },
          { name: 'C', count: 5 },
        ]}
        stage={STAGE}
        value={VALUE}
        labels={{ percent: 'ofPrevious' }}
        style={STYLE}
      />
    );
    // C / B with B=0 → n/a
    expect(
      screen.getAllByTestId('funnel-label-percent').map((p) => p.textContent)
    ).toStrictEqual(['n/a', '0%', 'n/a']);
  });

  it("12: labels.percent: 'both' prints both; object form applies className + format", () => {
    const data: Row[] = [
      { name: 'A', count: 100 },
      { name: 'B', count: 50 },
    ];
    const { unmount } = render(
      <FunnelChart
        id='f12'
        data={data}
        stage={STAGE}
        value={VALUE}
        labels={{ percent: 'both' }}
        style={STYLE}
      />
    );
    const pcts = screen.getAllByTestId('funnel-label-percent');
    // 2 stages × 2 kinds
    expect(pcts).toHaveLength(4);
    expect(
      pcts.filter((p) => p.getAttribute('data-kind') === 'ofFirst').map((p) => p.textContent)
    ).toStrictEqual(['100%', '50%']);
    expect(
      pcts
        .filter((p) => p.getAttribute('data-kind') === 'ofPrevious')
        .map((p) => p.textContent)
    ).toStrictEqual(['n/a', '50%']);
    unmount();

    const format = vi.fn(
      (pct: number | null, kind: string) =>
        `${kind}:${pct === null ? 'null' : pct}`
    );
    render(
      <FunnelChart
        id='f12b'
        data={data}
        stage={STAGE}
        value={VALUE}
        labels={{
          percent: {
            of: 'both',
            className: 'pct-cls',
            format,
          },
        }}
        style={STYLE}
      />
    );
    const styled = screen.getAllByTestId('funnel-label-percent');
    styled.forEach((p) => expect(p.getAttribute('class')).toContain('pct-cls'));
    expect(format).toHaveBeenCalled();
    expect(styled.some((p) => p.textContent?.includes('ofFirst:'))).toBe(true);
  });

  it('13: non-monotonic data — larger mid-stage renders wider; ofPrevious text > 100%', () => {
    const data: Row[] = [
      { name: 'A', count: 50 },
      { name: 'B', count: 100 },
      { name: 'C', count: 40 },
    ];
    render(
      <FunnelChart
        id='f13'
        data={data}
        stage={STAGE}
        value={VALUE}
        labels={{ percent: 'ofPrevious' }}
        style={STYLE}
      />
    );
    const marks = stagesOf();
    expect(num(marks[1], 'width')).toBeGreaterThan(num(marks[0], 'width'));
    const prev = screen
      .getAllByTestId('funnel-label-percent')
      .find((p) => p.getAttribute('data-index') === '1');
    expect(prev?.textContent).toBe('200%');
  });

  it('14: negative / non-finite values → drawn as 0; one dev warning; no NaN attrs', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const data = [
      { name: 'A', count: 10 },
      { name: 'B', count: -5 },
      { name: 'C', count: Number.NaN },
      { name: 'D', count: Number.POSITIVE_INFINITY },
    ];
    const props = {
      id: 'f14',
      data,
      stage: STAGE,
      value: VALUE,
      style: STYLE,
    };
    const { rerender } = render(<FunnelChart {...props} />);
    const marks = stagesOf();
    expect(marks).toHaveLength(4);
    expect(num(marks[1], 'data-near')).toBe(0);
    expect(num(marks[2], 'data-near')).toBe(0);
    expect(num(marks[3], 'data-near')).toBe(0);
    marks.forEach((m) => {
      ['x', 'y', 'width', 'height', 'data-near', 'data-far'].forEach((attr) => {
        const v = m.getAttribute(attr);
        if (v != null) expect(v).not.toContain('NaN');
      });
    });

    rerender(<FunnelChart {...props} className='redraw' />);
    const valueWarns = warn.mock.calls
      .map(([m]) => String(m))
      .filter(
        (m) =>
          m.includes('negative or non-numeric') ||
          (m.includes('drawn as 0') && m.includes('f14'))
      );
    expect(valueWarns).toHaveLength(1);
    warn.mockRestore();
  });

  it('15: empty data — no mark elements; SVG shell remains; no throw', () => {
    expect(() =>
      render(
        <FunnelChart
          id='f15'
          data={[]}
          stage={STAGE}
          value={VALUE}
          style={STYLE}
        />
      )
    ).not.toThrow();
    const svg = screen.getByTestId('funnel-chart');
    expect(svg).toBeTruthy();
    expect(stagesOf()).toHaveLength(0);
    expect(svg.querySelector('.funnel-plot')).toBeTruthy();
  });

  it("16: single-stage — one mark; ofFirst 100%; ofPrevious 'n/a'", () => {
    render(
      <FunnelChart
        id='f16'
        data={[{ name: 'Only', count: 42 }]}
        stage={STAGE}
        value={VALUE}
        labels={{ percent: 'both' }}
        style={STYLE}
      />
    );
    expect(stagesOf()).toHaveLength(1);
    const pcts = screen.getAllByTestId('funnel-label-percent');
    const ofFirst = pcts.find((p) => p.getAttribute('data-kind') === 'ofFirst');
    const ofPrev = pcts.find((p) => p.getAttribute('data-kind') === 'ofPrevious');
    expect(ofFirst?.textContent).toBe('100%');
    expect(ofPrev?.textContent).toBe('n/a');
  });

  it('17: classNameMap applies per stage; missing keys fall back to value.className', () => {
    const data: Row[] = [
      { name: 'Visit', count: 10 },
      { name: 'Paid', count: 4 },
      { name: 'Other', count: 2 },
    ];
    render(
      <FunnelChart
        id='f17'
        data={data}
        stage={STAGE}
        value={{ key: 'count', className: 'fill-fallback' }}
        classNameMap={{ Visit: 'fill-visit', Paid: 'fill-paid' }}
        style={STYLE}
      />
    );
    const marks = stagesOf();
    expect(marks[0].getAttribute('class')).toContain('fill-visit');
    expect(marks[1].getAttribute('class')).toContain('fill-paid');
    expect(marks[2].getAttribute('class')).toContain('fill-fallback');
    expect(marks[2].getAttribute('class')).not.toContain('fill-visit');
  });

  it('18: tooltip default HTML includes stage, value, of-first, of-previous; tooltip.html overrides', () => {
    const data: Row[] = [
      { name: 'Visit', count: 100 },
      { name: 'Paid', count: 40 },
    ];
    const { unmount } = render(
      <FunnelChart
        id='f18'
        data={data}
        stage={STAGE}
        value={VALUE}
        tooltip={{}}
        style={STYLE}
      />
    );
    // The band hit rect (drawn over the mark) is the hover target (spec 23).
    fireEvent.mouseEnter(hitsOf()[1], { clientX: 10, clientY: 10 });
    const tip = tooltipOf('f18');
    expect(tip).toBeTruthy();
    expect(tip?.className).toContain('opacity-100');
    expect(tip?.innerHTML).toContain('Paid');
    expect(tip?.innerHTML).toContain('40');
    expect(tip?.innerHTML).toMatch(/of first:\s*40%/);
    expect(tip?.innerHTML).toMatch(/of previous:\s*40%/);
    unmount();
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());

    render(
      <FunnelChart
        id='f18b'
        data={data}
        stage={STAGE}
        value={VALUE}
        tooltip={{ html: (d: unknown) => `custom:${(d as Row).name}` }}
        style={STYLE}
      />
    );
    fireEvent.mouseEnter(hitsOf()[0], { clientX: 10, clientY: 10 });
    expect(tooltipOf('f18b')?.innerHTML).toBe('custom:Visit');
  });

  it('19: title/description create <title>/<desc> and aria-*; without title, aria-label defaults', () => {
    const { unmount } = render(
      <FunnelChart
        id='f19'
        data={sample}
        stage={STAGE}
        value={VALUE}
        title='Signup conversion'
        description='Stages from visit to renew'
        style={STYLE}
      />
    );
    const svg = screen.getByTestId('funnel-chart');
    const title = svg.querySelector('title');
    const desc = svg.querySelector('desc');
    expect(title?.textContent).toBe('Signup conversion');
    expect(title?.id).toBe('f19-title');
    expect(desc?.textContent).toBe('Stages from visit to renew');
    expect(desc?.id).toBe('f19-desc');
    expect(svg.getAttribute('aria-labelledby')).toBe('f19-title');
    expect(svg.getAttribute('aria-describedby')).toBe('f19-desc');
    expect(svg.getAttribute('aria-label')).toBeNull();
    unmount();

    const r2 = render(
      <FunnelChart
        id='f19b'
        data={sample}
        stage={STAGE}
        value={VALUE}
        style={STYLE}
      />
    );
    expect(screen.getByTestId('funnel-chart').getAttribute('aria-label')).toBe(
      'Funnel chart'
    );
    r2.unmount();

    render(
      <FunnelChart
        id='f19c'
        data={sample}
        stage={STAGE}
        value={VALUE}
        ariaLabel='Conversion funnel'
        style={STYLE}
      />
    );
    expect(
      document.getElementById('f19c')?.getAttribute('aria-label')
    ).toBe('Conversion funnel');
  });

  it('20: padding.bar widens gaps between stages; margin insets the plot', () => {
    const data: Row[] = [
      { name: 'A', count: 100 },
      { name: 'B', count: 50 },
      { name: 'C', count: 25 },
    ];
    const { unmount } = render(
      <FunnelChart
        id='f20a'
        data={data}
        stage={STAGE}
        value={VALUE}
        padding={{ bar: 0 }}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        style={STYLE}
      />
    );
    const tight = stagesOf().map((m) => ({
      y: num(m, 'y'),
      h: num(m, 'height'),
      near: num(m, 'data-near'),
    }));
    // No margin → longest spans full 400px width.
    expect(tight[0].near).toBeCloseTo(400, 5);
    // No bar padding → bands abut (gap ≈ 0).
    expect(tight[1].y).toBeCloseTo(tight[0].y + tight[0].h, 5);
    unmount();

    render(
      <FunnelChart
        id='f20b'
        data={data}
        stage={STAGE}
        value={VALUE}
        padding={{ bar: 0.5 }}
        margin={{ top: 40, right: 40, bottom: 40, left: 40 }}
        style={STYLE}
      />
    );
    const loose = stagesOf().map((m) => ({
      y: num(m, 'y'),
      h: num(m, 'height'),
      near: num(m, 'data-near'),
    }));
    // Margin 40 → plot span = 320.
    expect(loose[0].near).toBeCloseTo(320, 5);
    // Larger bar padding → visible gap between bands.
    const gap = loose[1].y - (loose[0].y + loose[0].h);
    expect(gap).toBeGreaterThan(10);
  });

  it('21: changing shape / orientation / data at runtime redraws with no leftover nodes', () => {
    const data: Row[] = [
      { name: 'A', count: 100 },
      { name: 'B', count: 50 },
    ];
    const { rerender } = render(
      <FunnelChart
        id='f21'
        data={data}
        stage={STAGE}
        value={VALUE}
        shape='bar'
        style={STYLE}
      />
    );
    expect(stagesOf().every((m) => m.tagName.toLowerCase() === 'rect')).toBe(
      true
    );

    rerender(
      <FunnelChart
        id='f21'
        data={data}
        stage={STAGE}
        value={VALUE}
        shape='trapezoid'
        style={STYLE}
      />
    );
    const afterShape = stagesOf();
    expect(afterShape).toHaveLength(2);
    expect(afterShape.every((m) => m.tagName.toLowerCase() === 'path')).toBe(
      true
    );
    expect(
      document.querySelectorAll('#f21 [data-testid="funnel-stage"] rect')
    ).toHaveLength(0);

    rerender(
      <FunnelChart
        id='f21'
        data={data}
        stage={STAGE}
        value={VALUE}
        shape='trapezoid'
        orientation='horizontal'
        style={STYLE}
      />
    );
    expect(stagesOf()).toHaveLength(2);

    rerender(
      <FunnelChart
        id='f21'
        data={[{ name: 'Solo', count: 9 }]}
        stage={STAGE}
        value={VALUE}
        shape='bar'
        style={STYLE}
      />
    );
    const afterData = stagesOf();
    expect(afterData).toHaveLength(1);
    expect(afterData[0].getAttribute('data-stage')).toBe('Solo');
    expect(
      document.querySelectorAll('#f21 .marks rect, #f21 .marks path')
    ).toHaveLength(1);
  });

  it('22: catalog — aliases resolve to FunnelChart; no reserved collisions; category flow; composition intent listed', () => {
    expect(resolveChartRequest('funnel')?.chart.name).toBe('FunnelChart');
    expect(resolveChartRequest('funnel chart')?.chart.name).toBe('FunnelChart');
    expect(resolveChartRequest('conversion funnel')?.chart.name).toBe(
      'FunnelChart'
    );

    const meta = resolveChartRequest('FunnelChart')?.chart;
    expect(meta?.category).toBe('flow');
    expect(meta?.intents[0]).toBe('composition');

    // Reserved / colliding names must not resolve to FunnelChart.
    expect(resolveChartRequest('heatmap')?.chart.name).not.toBe('FunnelChart');
    expect(resolveChartRequest('combo chart')?.chart.name).not.toBe(
      'FunnelChart'
    );
    expect(resolveChartRequest('slope chart')?.chart.name).not.toBe(
      'FunnelChart'
    );
    expect(resolveChartRequest('waterfall')?.chart.name).not.toBe(
      'FunnelChart'
    );

    const composition = decisionTree.find((b) => b.intent === 'composition');
    expect(
      composition?.options.some((o) => o.name === 'FunnelChart')
    ).toBe(true);
  });

  it('23: hit area — hovering in a stage band outside its painted mark shows that stage tooltip', () => {
    // Spec: full band (plot length × bandWidth) is the hover target for both
    // shapes, so zero-length and tapered stages stay reachable. Expect an
    // explicit band hit target distinct from the painted mark.
    const data: Row[] = [
      { name: 'A', count: 100 },
      { name: 'B', count: 0 },
      { name: 'C', count: 40 },
    ];
    render(
      <FunnelChart
        id='f23'
        data={data}
        stage={STAGE}
        value={VALUE}
        shape='trapezoid'
        tooltip={{}}
        style={STYLE}
      />
    );
    const marks = stagesOf();
    expect(num(marks[1], 'data-near')).toBe(0);
    expect(marks[2].getAttribute('data-far')).toBe('0');

    // Band hit targets must exist separately from painted marks so a
    // zero-near / tapered stage remains hoverable across the full band.
    const hits = document.querySelectorAll('[data-testid="funnel-hit"]');
    expect(
      hits.length,
      'expected a full-band hit target per stage (data-testid="funnel-hit")'
    ).toBe(data.length);

    fireEvent.mouseEnter(hits[1], { clientX: 50, clientY: 50 });
    const tip = tooltipOf('f23');
    expect(tip?.className).toContain('opacity-100');
    expect(tip?.innerHTML).toContain('B');
    expect(tip?.innerHTML).toMatch(/>0</);
  });

  it('24: trapezoid last-stage labels anchor at band centre, not clipped, independent of mark width', () => {
    const data: Row[] = [
      { name: 'A', count: 100 },
      { name: 'B', count: 10 },
      { name: 'C', count: 80 },
    ];
    render(
      <FunnelChart
        id='f24'
        data={data}
        stage={STAGE}
        value={VALUE}
        shape='trapezoid'
        labels={{ value: true, percent: 'ofFirst' }}
        style={STYLE}
      />
    );
    const marks = stagesOf();
    expect(marks[2].getAttribute('data-far')).toBe('0');

    const valueLabels = screen.getAllByTestId('funnel-label-value');
    expect(valueLabels).toHaveLength(3);
    // Vertical: every label shares the plot midline x (band centre on cross-axis).
    const xs = valueLabels.map((l) => num(l, 'x'));
    expect(xs[0]).toBeCloseTo(xs[1], 5);
    expect(xs[1]).toBeCloseTo(xs[2], 5);
    expect(xs[2]).toBeCloseTo(200, 5);

    // Position does not follow the tapered far edge / near width.
    const lastNear = num(marks[2], 'data-near');
    expect(lastNear).toBeGreaterThan(0);
    expect(xs[2]).not.toBeCloseTo(200 - lastNear / 4, 0);

    valueLabels.forEach((l) => {
      expect(l.getAttribute('clip-path')).toBeNull();
      expect(l.closest('[clip-path]')).toBeNull();
      expect(l.getAttribute('text-anchor')).toBe('middle');
    });
  });

  it('review F1: a parent re-render with unchanged props does not redraw the marks', () => {
    const data: Row[] = [
      { name: 'Visit', count: 100 },
      { name: 'Paid', count: 40 },
    ];
    const tooltip = {};
    const view = (extra: string) => (
      <div data-extra={extra}>
        <FunnelChart
          id='f-rerender'
          data={data}
          stage={STAGE}
          value={VALUE}
          tooltip={tooltip}
          style={STYLE}
        />
      </div>
    );
    const { rerender } = render(view('a'));
    const marksBefore = stagesOf();
    const hitsBefore = hitsOf();
    expect(marksBefore).toHaveLength(2);

    rerender(view('b'));
    const marksAfter = stagesOf();
    const hitsAfter = hitsOf();
    marksAfter.forEach((node, i) => expect(node).toBe(marksBefore[i]));
    hitsAfter.forEach((node, i) => expect(node).toBe(hitsBefore[i]));

    // The surviving listeners still reach the current tooltip handlers.
    fireEvent.mouseEnter(hitsAfter[1], { clientX: 10, clientY: 10 });
    expect(tooltipOf('f-rerender')?.innerHTML).toContain('Paid');

    // A real prop change still redraws.
    rerender(
      <div data-extra='c'>
        <FunnelChart
          id='f-rerender'
          data={[...data]}
          stage={STAGE}
          value={VALUE}
          tooltip={tooltip}
          style={STYLE}
        />
      </div>
    );
    expect(stagesOf()[0]).not.toBe(marksBefore[0]);
  });

  it('review F1: unmounting mid grow-in does not throw', () => {
    const { unmount } = render(
      <FunnelChart
        id='f-unmount'
        data={sample}
        stage={STAGE}
        value={VALUE}
        shape='trapezoid'
        drawing={{ duration: 500 }}
        style={STYLE}
      />
    );
    expect(() => unmount()).not.toThrow();
  });
});
