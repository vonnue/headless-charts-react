// #41's stacking/waterfall tests, parametrised over both orientations (#78).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';

import BarChart, { type BarStacking } from '.';
import BarChartStacked from '../BarChartStacked';
import ColumnChartStacked from '../ColumnChartStacked';
import { resolveChartRequest } from '@/catalog';
import { tickPositions } from '@/test-utils/axisTicks';
import { resetDevWarnings } from '@/utils/devEnvironment';

afterEach(() => {
  vi.restoreAllMocks();
  resetDevWarnings();
  document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
});

type O = 'vertical' | 'horizontal';
const style = { width: '600px', height: '400px' };
const margin = { top: 20, right: 50, bottom: 40, left: 50 };
const padding = { top: 0, right: 0, bottom: 0, left: 0 };
// Value range: vertical y 360 → 20 (340px), horizontal x 50 → 550 (500px).
const SPAN = { vertical: 340, horizontal: 500 };
const BASE = { vertical: 360, horizontal: 50 };

type Row = Record<string, string | number | null>;
const rows: Row[] = [
  { name: 'a', p: 10, q: 20 },
  { name: 'b', p: 5, q: 10 },
];

type Series = { key: string; className?: string; classNameNegative?: string; start?: number; end?: number };
const S: Series[] = [
  { key: 'p', className: 'fill-p', classNameNegative: 'fill-neg' },
  { key: 'q', className: 'fill-q', classNameNegative: 'fill-neg' },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- props are assembled per orientation
const chartProps = (o: O, extra: Record<string, unknown> = {}, series: Series[] = S, data: Row[] = rows): any => ({
  style,
  margin,
  padding,
  orientation: o,
  data,
  ...(o === 'vertical' ? { x: { key: 'name' }, y: series } : { y: { key: 'name' }, x: series }),
  ...extra,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- as chartProps
const wrapperProps = (...args: Parameters<typeof chartProps>): any => {
  const props = chartProps(...args);
  delete props.orientation;
  return props;
};

const svgOf = (id: string) => document.getElementById(id)!;
/** Value-axis extent of each mark: [from, to] in px measured from the value-axis start. */
const segs = (id: string, o: O) =>
  Array.from(svgOf(id).querySelectorAll('g.marks rect')).map((r) => {
    const n = (a: string) => Number(r.getAttribute(a));
    const across = o === 'vertical' ? n('x') : n('y');
    const thick = o === 'vertical' ? n('width') : n('height');
    const len = o === 'vertical' ? n('height') : n('width');
    const from = o === 'vertical' ? BASE.vertical - (n('y') + len) : n('x') - BASE.horizontal;
    return { across, thick, len, from, to: from + len, cls: r.getAttribute('class') ?? '' };
  });
const valueTicks = (id: string, o: O) =>
  o === 'vertical'
    ? tickPositions(svgOf(id).querySelector('[data-testid="y-axis"]'), 'vertical')
    : tickPositions(svgOf(id).querySelector('[data-testid="x-axis"]'), 'horizontal');
const attrsHaveNaN = (id: string) =>
  Array.from(svgOf(id).querySelectorAll('*')).some((el) =>
    Array.from(el.attributes).some((a) => a.value.includes('NaN')),
  );
const warnings = () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  return (text: string) => warn.mock.calls.filter(([m]) => String(m).includes(text)).length;
};
const normal: BarStacking = { type: 'normal' };

describe.each<O>(['vertical', 'horizontal'])('BarChart stacking (%s)', (o) => {
  const id = (n: string) => `st-${o[0]}-${n}`;

  it('1: without stacking the grouped layout is unchanged (series side by side)', () => {
    render(<BarChart id={id('1')} {...chartProps(o)} />);
    const [ap, , aq] = segs(id('1'), o);
    expect(aq.across).toBeGreaterThan(ap.across);
    expect(ap.from).toBeCloseTo(0, 6);
    expect(aq.from).toBeCloseTo(0, 6);
  });

  it('2: normal stacking: segments stack, the bar equals the row total, domain [0, maxTotal]', () => {
    render(<BarChart id={id('2')} {...chartProps(o, { stacking: normal })} />);
    const [ap, bp, aq, bq] = segs(id('2'), o);
    expect(ap.across).toBe(aq.across);
    expect(aq.from).toBeCloseTo(ap.to, 6);
    expect(aq.to).toBeCloseTo(SPAN[o], 6); // row a total 30 = max
    expect(bq.to).toBeCloseTo(SPAN[o] / 2, 6);
    expect(bp.from).toBeCloseTo(0, 6);
  });

  it('3 + 8: the stacked wrapper renders the same DOM as BarChart with stacking, without warning or mutation', () => {
    const check = warnings();
    const series = structuredClone(S);
    const Wrapper = o === 'vertical' ? ColumnChartStacked : BarChartStacked;
    const wrapperDefaults = o === 'vertical' ? {} : { margin: { left: 60, right: 20, top: 20, bottom: 40 }, padding: { ...padding, bar: 0.3 } };
    const rest = wrapperProps(o, {}, series);
    const a = render(<Wrapper id={id('3')} {...rest} margin={undefined} padding={undefined} />);
    const wrapperHtml = svgOf(id('3')).innerHTML;
    a.unmount();
    render(<BarChart id={id('3')} {...rest} {...wrapperDefaults} margin={wrapperDefaults.margin} padding={wrapperDefaults.padding} stacking={normal} />);
    expect(svgOf(id('3')).innerHTML).toBe(wrapperHtml);
    expect(series).toEqual(S);
    expect(check('[headless-charts]')).toBe(0);
  });

  it('4: negative values stack below 0 and carry classNameNegative', () => {
    const data = [{ name: 'a', p: -10, q: 20 }, { name: 'b', p: 10, q: -10 }];
    render(<BarChart id={id('4')} {...chartProps(o, { stacking: normal }, S, data)} />);
    const [ap, bp, aq, bq] = segs(id('4'), o);
    const zero = SPAN[o] / 3; // domain [-10, 20]
    expect(ap.to).toBeCloseTo(zero, 6);
    expect(ap.cls).toContain('fill-neg');
    expect(aq.from).toBeCloseTo(zero, 6);
    expect(bq.to).toBeCloseTo(zero, 6);
    expect(bp.from).toBeCloseTo(zero, 6);
  });

  it('5: waterfall: each series is a step in its own sub-band starting where the previous ended', () => {
    render(<BarChart id={id('5')} {...chartProps(o, { waterfall: true })} />);
    const [ap, , aq] = segs(id('5'), o);
    expect(aq.across - ap.across).toBeCloseTo(ap.thick, 6);
    expect(aq.from).toBeCloseTo(ap.to, 6);
    expect(aq.to).toBeCloseTo(SPAN[o], 6);
  });

  it('6: waterfall and stacking together: waterfall wins and warns once', () => {
    const check = warnings();
    const { rerender } = render(<BarChart id={id('6')} {...chartProps(o, { waterfall: true, stacking: normal })} />);
    rerender(<BarChart id={id('6')} {...chartProps(o, { waterfall: true, stacking: normal, data: [...rows] })} />);
    const [ap, , aq] = segs(id('6'), o);
    expect(aq.across).not.toBe(ap.across);
    expect(check('waterfall wins')).toBe(1);
  });

  it.each(['grouped', 'normal'] as const)('7: referenceLines, tickFormat and dataLabel.text work (%s)', (mode) => {
    const extra = {
      ...(mode === 'normal' ? { stacking: normal } : {}),
      referenceLines: [o === 'vertical' ? { y: 0 } : { x: 0 }],
      tickFormat: '.1f',
      dataLabel: { text: (row: Row, s: Series) => `${row.name}-${s.key}` },
    };
    render(<BarChart id={id(`7${mode}`)} {...chartProps(o, extra)} />);
    expect(svgOf(id(`7${mode}`)).querySelectorAll('line.reference-line')).toHaveLength(1);
    expect(valueTicks(id(`7${mode}`), o).has('0.0')).toBe(true);
    const labels = Array.from(svgOf(id(`7${mode}`)).querySelectorAll('[data-testid="label"]')).map((t) => t.textContent);
    expect(labels).toEqual(['a-p', 'b-p', 'a-q', 'b-q']);
  });

  it('9: toggling stacking at runtime redraws without leftovers', () => {
    const { rerender } = render(<BarChart id={id('9')} {...chartProps(o)} />);
    const grouped = svgOf(id('9')).innerHTML;
    rerender(<BarChart id={id('9')} {...chartProps(o, { stacking: normal })} />);
    expect(svgOf(id('9')).querySelectorAll('g.marks rect')).toHaveLength(4);
    expect(svgOf(id('9')).querySelectorAll('clipPath')).toHaveLength(1);
    rerender(<BarChart id={id('9')} {...chartProps(o)} />);
    expect(svgOf(id('9')).innerHTML).toBe(grouped);
  });

  it('11: 100%: every bar spans the axis, segments are shares, domain [0,1], percentage ticks', () => {
    render(<BarChart id={id('11')} {...chartProps(o, { stacking: { type: '100%' } })} />);
    const [ap, bp, aq, bq] = segs(id('11'), o);
    expect(aq.to).toBeCloseTo(SPAN[o], 6);
    expect(bq.to).toBeCloseTo(SPAN[o], 6);
    expect(ap.len).toBeCloseTo(SPAN[o] / 3, 6);
    expect(bp.len).toBeCloseTo(SPAN[o] / 3, 6);
    const ticks = valueTicks(id('11'), o);
    expect(ticks.has('0%')).toBe(true);
    expect(ticks.has('100%')).toBe(true);
  });

  it('12: 100% with a zero-total row: no NaN and zero-length segments', () => {
    const data = [{ name: 'a', p: 0, q: 0 }, { name: 'b', p: null, q: '' }, { name: 'c', p: 1, q: 3 }];
    render(<BarChart id={id('12')} {...chartProps(o, { stacking: { type: '100%' }, dataLabel: {} }, S, data)} />);
    expect(attrsHaveNaN(id('12'))).toBe(false);
    const s = segs(id('12'), o);
    [0, 1, 3, 4].forEach((i) => expect(s[i].len).toBe(0));
  });

  it('13: 100% treats negatives as 0 and ignores pins, each warning once', () => {
    const check = warnings();
    const data = [{ name: 'a', p: -10, q: 20 }];
    const series = [{ ...S[0], start: -50 }, { ...S[1], end: 100 }];
    render(<BarChart id={id('13')} {...chartProps(o, { stacking: { type: '100%' } }, series, data)} />);
    const [ap, aq] = segs(id('13'), o);
    expect(ap.len).toBe(0);
    expect(aq.len).toBeCloseTo(SPAN[o], 6);
    expect(check('treats negative values as 0')).toBe(1);
    expect(check('start/end are ignored')).toBe(1);
  });

  it('14: 100% tooltip and labels show the share; dataLabel.text overrides', () => {
    render(<BarChart id={id('14')} {...chartProps(o, { stacking: { type: '100%' }, dataLabel: {}, tooltip: {} })} />);
    const labels = Array.from(svgOf(id('14')).querySelectorAll('[data-testid="label"]')).map((t) => t.textContent);
    expect(labels).toEqual(['33%', '33%', '67%', '67%']);
    fireEvent.mouseEnter(svgOf(id('14')).querySelector('g.marks rect')!);
    expect(document.getElementById(`tooltip-${id('14')}`)?.innerHTML).toContain('p: 10 (33%)');
    render(<BarChart id={id('14b')} {...chartProps(o, { stacking: { type: '100%' }, dataLabel: { text: () => 'x' } })} />);
    expect(svgOf(id('14b')).querySelector('[data-testid="label"]')?.textContent).toBe('x');
  });

  const likert: Series[] = [
    { key: 'sd' }, { key: 'd' }, { key: 'n' }, { key: 'ag' }, { key: 'sa' },
  ];
  const likertRows = [{ name: 'a', sd: 10, d: 20, n: 10, ag: 30, sa: 10 }];

  it('15: diverging: negative keys before 0 (last one touches 0), the rest after (first one touches 0)', () => {
    render(<BarChart id={id('15')} {...chartProps(o, { stacking: { type: 'diverging', negative: ['sd', 'd'] } }, likert, likertRows)} />);
    const [sd, d, n, ag, sa] = segs(id('15'), o);
    // M = 50 (n + ag + sa); domain [-50, 50], 0 at the centre.
    const mid = SPAN[o] / 2;
    expect(d.to).toBeCloseTo(mid, 6);
    expect(sd.to).toBeCloseTo(d.from, 6);
    expect(n.from).toBeCloseTo(mid, 6);
    expect(ag.from).toBeCloseTo(n.to, 6);
    expect(sa.to).toBeCloseTo(SPAN[o], 6);
  });

  it('16: diverging with neutral: the neutral segment is centred on 0', () => {
    render(<BarChart id={id('16')} {...chartProps(o, { stacking: { type: 'diverging', negative: ['sd', 'd'], neutral: 'n' } }, likert, likertRows)} />);
    const [sd, d, n, ag] = segs(id('16'), o);
    const mid = SPAN[o] / 2;
    expect((n.from + n.to) / 2).toBeCloseTo(mid, 6);
    expect(d.to).toBeCloseTo(n.from, 6);
    expect(ag.from).toBeCloseTo(n.to, 6);
    expect(sd.to).toBeCloseTo(d.from, 6);
  });

  it('17: diverging default domain is symmetric [-M, M]; pins override', () => {
    render(<BarChart id={id('17')} {...chartProps(o, { stacking: { type: 'diverging', negative: ['p'] } })} />);
    const ticks = valueTicks(id('17'), o);
    // M = 20 (q of row a).
    expect(ticks.get('-20')).toBeCloseTo(o === 'vertical' ? 360 : 50, 6);
    expect(ticks.get('20')).toBeCloseTo(o === 'vertical' ? 20 : 550, 6);
    const pinned = [{ ...S[0], start: -40 }, { ...S[1], end: 40 }];
    render(<BarChart id={id('17b')} {...chartProps(o, { stacking: { type: 'diverging', negative: ['p'] } }, pinned)} />);
    expect(valueTicks(id('17b'), o).has('-40')).toBe(true);
  });

  it('18: diverging percent: both sides sum to 100%, domain [-1,1], absolute percentage ticks', () => {
    render(<BarChart id={id('18')} {...chartProps(o, { stacking: { type: 'diverging', negative: ['sd', 'd'], percent: true } }, likert, likertRows)} />);
    const s = segs(id('18'), o);
    const total = s.reduce((acc, seg) => acc + seg.len, 0);
    expect(total).toBeCloseTo(SPAN[o] / 2, 6);
    const ticks = valueTicks(id('18'), o);
    expect(ticks.has('-100%')).toBe(false);
    expect(ticks.get('100%')).toBeCloseTo(o === 'vertical' ? 20 : 550, 6);
  });

  it('19: diverging with unknown keys or neutral also in negative warns once and still renders', () => {
    const check = warnings();
    render(<BarChart id={id('19')} {...chartProps(o, { stacking: { type: 'diverging', negative: ['zz', 'n'], neutral: 'n' } }, likert, likertRows)} />);
    expect(check('"zz" are not series keys')).toBe(1);
    expect(check('treated as neutral')).toBe(1);
    expect(segs(id('19'), o)).toHaveLength(5);
    expect(attrsHaveNaN(id('19'))).toBe(false);
  });

  it('stacked data labels are centred in their segment', () => {
    render(<BarChart id={id('lbl')} {...chartProps(o, { stacking: normal, dataLabel: {} })} />);
    const label = svgOf(id('lbl')).querySelector('[data-testid="label"]')!;
    const rect = svgOf(id('lbl')).querySelector('g.marks rect')!;
    const n = (el: Element, a: string) => Number(el.getAttribute(a));
    expect(n(label, 'x')).toBeCloseTo(n(rect, 'x') + n(rect, 'width') / 2, 6);
    expect(n(label, 'y')).toBeCloseTo(n(rect, 'y') + n(rect, 'height') / 2, 6);
  });

  it('stacked tooltip datum is the row (BarChartStacked too)', () => {
    const html = vi.fn(() => 'tip');
    const Wrapper = o === 'vertical' ? ColumnChartStacked : BarChartStacked;
    const rest = wrapperProps(o, { tooltip: { html } });
    render(<Wrapper id={id('tip')} {...rest} />);
    fireEvent.mouseEnter(svgOf(id('tip')).querySelector('g.marks rect')!);
    expect(html).toHaveBeenCalledWith(rows[0]);
  });
});

describe('stacking edge cases', () => {
  it('bin + stacking draws one count series with a warning', () => {
    const check = warnings();
    render(<BarChart id='st-bin' {...chartProps('vertical', { stacking: normal, x: { key: 'p', bin: { count: 2 } }, y: [{ key: 'count' }] })} />);
    expect(check('stacking/waterfall are ignored')).toBe(1);
  });

  it('BarChartStacked keeps its orientation and accepts another stacking type', () => {
    const check = warnings();
    const rest = wrapperProps('horizontal');
    render(<BarChartStacked id='st-wrap' {...rest} orientation={'vertical' as 'horizontal'} stacking={{ type: '100%' }} />);
    expect(check('orientation-ignored') + check('is always horizontal')).toBeGreaterThan(0);
    const widths = Array.from(svgOf('st-wrap').querySelectorAll('g.marks rect')).map((r) => Number(r.getAttribute('x')) + Number(r.getAttribute('width')));
    expect(Math.max(...widths)).toBeCloseTo(Math.max(...widths.slice(2)), 6);
  });
});

describe('catalog (#41 tests 10 and 21)', () => {
  it.each([
    ['stacked bar chart', 'Stacked bar chart'],
    ['waterfall', 'Waterfall chart'],
    ['100% stacked bar chart', '100% stacked bar chart'],
    ['percentage column chart', '100% stacked bar chart'],
    ['likert chart', 'Diverging stacked bar chart'],
    ['diverging stacked bar chart', 'Diverging stacked bar chart'],
    ['horizontal waterfall chart', 'Horizontal waterfall chart'],
  ])('"%s" resolves to BarChart + %s', (request, variant) => {
    const hit = resolveChartRequest(request);
    expect(hit?.chart.name).toBe('BarChart');
    expect(hit?.variant?.name).toBe(variant);
  });

  it('wrapper names resolve to BarChart with their variant', () => {
    expect(resolveChartRequest('BarChartStacked')?.wrapper).toBe('BarChartStacked');
    expect(resolveChartRequest('BarChartStacked')?.variant?.name).toBe('Horizontal stacked bar chart');
    expect(resolveChartRequest('ColumnChartStacked')?.variant?.name).toBe('Stacked bar chart');
  });
});

describe('diverging axis title (#99)', () => {
  const likert = [
    { key: 'sd', axis: { label: 'Strongly disagree' } },
    { key: 'd', axis: { label: 'Disagree' } },
    { key: 'n', axis: { label: 'Neutral' } },
    { key: 'a', axis: { label: 'Agree' } },
    { key: 'sa', axis: { label: 'Strongly agree' } },
  ];
  const survey = [{ name: 'a', sd: 5, d: 10, n: 20, a: 40, sa: 25 }];
  const stacking = { type: 'diverging' as const, negative: ['sd', 'd'], neutral: 'n' };
  const titleText = 'Strongly disagree, Disagree, Neutral, Agree, Strongly agree';
  const axisTitle = (id: string, axis: 'x-axis' | 'y-axis') =>
    document.querySelector(`#${id} [data-testid="${axis}"] > text`);

  it('places the vertical value-axis title at the plot centre so it stays inside the svg', () => {
    render(
      <BarChart
        id='div-title-v'
        {...chartProps('vertical', { stacking, data: survey }, likert)}
      />,
    );
    const title = axisTitle('div-title-v', 'y-axis');
    expect(title?.textContent).toBe(titleText);
    expect(title?.getAttribute('text-anchor')).toBe('middle');
    // Axis group is at translate(margin.left, 0); svg width is 600.
    expect(Number(title?.getAttribute('x'))).toBe(600 / 2 - margin.left);
    expect(document.querySelectorAll('#div-title-v [data-testid="y-axis"] .tick text').length).toBeGreaterThan(0);
    expect(title?.parentElement?.getAttribute('data-testid')).toBe('y-axis');
  });

  it('keeps the horizontal value-axis title centred on the x-axis', () => {
    render(
      <BarChart
        id='div-title-h'
        {...chartProps('horizontal', { stacking, data: survey }, likert)}
      />,
    );
    const title = axisTitle('div-title-h', 'x-axis');
    expect(title?.textContent).toBe(titleText);
    expect(title?.getAttribute('text-anchor')).toBe('middle');
    expect(Number(title?.getAttribute('x'))).toBe(600 / 2);
  });

  it('does not move the title on a non-diverging vertical stack', () => {
    render(
      <BarChart
        id='stack-title-v'
        {...chartProps('vertical', { stacking: { type: 'normal' }, data: survey }, likert)}
      />,
    );
    const title = axisTitle('stack-title-v', 'y-axis');
    expect(title?.textContent).toBe(titleText);
    expect(title?.getAttribute('text-anchor')).toBe('middle');
    expect(Number(title?.getAttribute('x'))).toBe(0);
  });
});

