import { describe, expect, it, afterEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';

import LollipopVChart from '.';

// ============================================================================
// Shared geometry fixtures
//
// JSDOM performs no layout, so `svg.style('width')` reads back as '' and the
// component's `+svg.style('width').split('px')[0]` resolves to 0. With the
// default 40px margins that makes the x range [40, -40] — inverted and
// negative — and every scale-derived assertion collapses to something that
// would keep passing if the positioning code were deleted. The component
// forwards `style` straight onto the <svg>, so passing an explicit pixel size
// gives d3 a real range to work with and lets every test below pin an exact
// expected coordinate.
//
//   width 500, height 300, default margin 40 on all sides, padding 0
//     x range = [40, 460]   (span 420)
//     y range = [260, 40]   (bottom -> top)
// ============================================================================

const CHART_SIZE = { width: '500px', height: '300px' };

const RANGE_START = 40;
const RANGE_END = 460;
const RANGE_SPAN = RANGE_END - RANGE_START;
const Y_BASELINE = 260; // yFn(y.start = 0) with height 300 and margin.bottom 40

// A stem at the domain's min/max centers its symbol exactly on the range
// edge, so — with no inset — half the symbol would render outside the plot.
// The component insets its usable x range by this many px on each side to
// prevent that (see #16); it's the largest bounding radius among this
// component's symbol shapes at their fixed render size (star, ~9.44px).
const SYMBOL_INSET = 10;

/**
 * Pixel position of a date on a scaleTime whose domain is
 * `[domainStart, domainEnd]` and whose range is `[rangeStart, rangeEnd]`.
 * Defaults to the component's actual (inset) usable range at the default
 * chart size/margins — pass an explicit range for other sizes/margins, or
 * to test the raw math independent of the component's inset behavior.
 *
 * Only elapsed-time *ratios* are used, so this is correct for both the
 * `isISO` path (isoParse -> UTC midnight) and the `time.format` path
 * (timeParse -> local midnight): a constant UTC offset cancels out. All
 * fixtures below stay inside a single month, so no DST transition can break
 * that assumption.
 */
const xForDate = (
  iso: string,
  [domainStart, domainEnd]: [string, string],
  [rangeStart, rangeEnd]: [number, number] = [
    RANGE_START + SYMBOL_INSET,
    RANGE_END - SYMBOL_INSET,
  ]
) => {
  const t0 = Date.parse(domainStart);
  const t1 = Date.parse(domainEnd);
  // d3's continuous scales map a degenerate domain to the midpoint of the
  // range (`normalize` returns a constant 0.5 when domain[0] === domain[1]).
  if (t1 === t0) return (rangeStart + rangeEnd) / 2;
  return (
    rangeStart +
    ((Date.parse(iso) - t0) / (t1 - t0)) * (rangeEnd - rangeStart)
  );
};

/**
 * The component sorts `data` in place by *descending y value* before drawing,
 * so DOM/paint order is value-descending and NOT chronological. Derive the
 * expected DOM order the same way rather than sorting the extracted pixel
 * positions — sorting the output first is what let the previous revision of
 * these tests pass while comparing the wrong stems to each other.
 */
const inPaintOrder = <T extends Record<string, unknown>>(
  rows: T[],
  valueKey: string
): T[] => [...rows].sort((a, b) => Number(b[valueKey]) - Number(a[valueKey]));

const stemXsOf = (svgId: string) =>
  // Scope to the chart's own stem lines (class="line") — a bare 'line'
  // selector also matches d3-axis's per-tick <line> elements (axis ticks
  // render as <g class="tick"><line/><text/></g> regardless of scale type),
  // which inflates the count far beyond the data length.
  Array.from(
    document.getElementById(svgId)!.querySelectorAll('line.line')
  ).map((line) => {
    const x1 = Number(line.getAttribute('x1'));
    const x2 = Number(line.getAttribute('x2'));
    // Stems are vertical: both endpoints share one x.
    expect(x1).toBe(x2);
    return x1;
  });

const stemYsOf = (svgId: string) =>
  Array.from(
    document.getElementById(svgId)!.querySelectorAll('line.line')
  ).map((line) => ({
    y1: Number(line.getAttribute('y1')),
    y2: Number(line.getAttribute('y2')),
  }));

/**
 * Symbol heads are positioned with `transform="translate(x,y)"`. Scope to
 * class="symbols" — a bare 'path' selector also matches the d3-axis domain
 * <path>, which carries no transform.
 */
const symbolPointsOf = (svgId: string) =>
  Array.from(
    document.getElementById(svgId)!.querySelectorAll('path.symbols')
  ).map((path) => {
    const transform = path.getAttribute('transform') ?? '';
    const match = transform.match(
      /translate\(\s*([-+0-9.eE]+)\s*,\s*([-+0-9.eE]+)/
    );
    expect(match).toBeTruthy();
    return { x: Number(match![1]), y: Number(match![2]) };
  });

describe('LollipopVChart', () => {
  afterEach(() => {
    vi.clearAllTimers();
  });

  // ==========================================================================
  // Guard the fixture helper itself against hand-computed numbers, so a bug in
  // `xForDate` cannot silently mirror a bug in the component.
  // ==========================================================================

  describe('test fixtures', () => {
    it('xForDate matches hand-computed positions', () => {
      // Tests the helper's raw math against the *un-inset* [40, 460] range
      // explicitly, independent of the component's SYMBOL_INSET default —
      // a bug in that default couldn't then mask a bug here.
      // Jan 6 -> Jan 27 is 21 days across a 420px range => 20px per day,
      // 140px per week.
      const domain: [string, string] = ['2025-01-06', '2025-01-27'];
      const rawRange: [number, number] = [RANGE_START, RANGE_END];
      expect(xForDate('2025-01-06', domain, rawRange)).toBeCloseTo(40, 6);
      expect(xForDate('2025-01-13', domain, rawRange)).toBeCloseTo(180, 6);
      expect(xForDate('2025-01-20', domain, rawRange)).toBeCloseTo(320, 6);
      expect(xForDate('2025-01-27', domain, rawRange)).toBeCloseTo(460, 6);
      // Degenerate (single-instant) domain lands on the range midpoint.
      expect(
        xForDate('2025-01-15', ['2025-01-15', '2025-01-15'], rawRange)
      ).toBeCloseTo(250, 6);
    });
  });

  // ==========================================================================
  // Non-time mode baseline tests (ensure time mode doesn't break existing
  // behavior)
  // ==========================================================================

  describe('non-time mode (scalingFunction unset or "linear")', () => {
    const categoricalData = [
      { category: 'A', value: 10 },
      { category: 'B', value: 20 },
      { category: 'C', value: 15 },
    ];

    // scaleBand over 3 categories across [40, 460] with no band padding:
    // step = bandwidth = 140. Stems sit at band start + bandwidth / 2, in
    // value-descending order: B(20), C(15), A(10).
    const expectedBandStemXs = [110, 250, 390];

    it('renders lollipop stems for categorical x-axis', () => {
      render(
        <LollipopVChart
          id='lollipop-categorical'
          style={CHART_SIZE}
          data={[...categoricalData]}
          shape='circle'
          x={{ key: 'category', axis: { location: 'bottom' } }}
          y={{ key: 'value', start: 0, axis: { location: 'left' } }}
        />
      );

      const stemXs = stemXsOf('lollipop-categorical');
      expect(stemXs).toHaveLength(categoricalData.length);
      // Pin the band-centering arithmetic (`xFn(category) + bandwidth / 2`),
      // not just the element count — dropping the half-bandwidth offset must
      // fail here.
      stemXs.forEach((x, i) =>
        expect(x).toBeCloseTo(expectedBandStemXs[i], 6)
      );
    });

    it('renders one symbol (path) per data point in categorical mode', () => {
      render(
        <LollipopVChart
          id='lollipop-categorical-symbols'
          style={CHART_SIZE}
          data={[...categoricalData]}
          shape='circle'
          x={{ key: 'category' }}
          y={{ key: 'value', start: 0 }}
        />
      );

      const points = symbolPointsOf('lollipop-categorical-symbols');
      expect(points).toHaveLength(categoricalData.length);
      points.forEach((point, i) => {
        expect(point.x).toBeCloseTo(expectedBandStemXs[i], 6);
        // Symbols are anchored on the baseline before the draw-in transition
        // runs (see the y-positioning describe block below).
        expect(point.y).toBeCloseTo(Y_BASELINE, 6);
      });
    });
  });

  // ==========================================================================
  // Time mode: evenly-spaced dates
  // ==========================================================================

  describe('time mode with evenly-spaced dates', () => {
    const evenlySpacedData = [
      { date: '2025-01-06', reading: 12 },
      { date: '2025-01-13', reading: 18 },
      { date: '2025-01-20', reading: 9 },
      { date: '2025-01-27', reading: 22 },
    ];
    const domain: [string, string] = ['2025-01-06', '2025-01-27'];
    const expectedStemXs = inPaintOrder(evenlySpacedData, 'reading').map((d) =>
      xForDate(d.date, domain)
    );

    it('renders an SVG with time-scaled x-axis', () => {
      render(
        <LollipopVChart
          id='lollipop-time-even'
          style={CHART_SIZE}
          data={[...evenlySpacedData]}
          shape='circle'
          x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
          y={{ key: 'reading', start: 0, axis: { location: 'left' } }}
        />
      );

      const svg = document.getElementById('lollipop-time-even');
      expect(svg).toBeTruthy();
      expect(svg?.tagName).toBe('svg');
      expect(svg?.querySelector('[data-testid="x-axis"]')).toBeTruthy();
    });

    it('produces equal spacing between stems for evenly-spaced dates', () => {
      render(
        <LollipopVChart
          id='lollipop-time-even-spacing'
          style={CHART_SIZE}
          data={[...evenlySpacedData]}
          shape='circle'
          x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
          y={{ key: 'reading', start: 0 }}
        />
      );

      const stemXs = stemXsOf('lollipop-time-even-spacing');
      expect(stemXs).toHaveLength(evenlySpacedData.length);

      // Chronological positions, recovered by pairing each rendered stem with
      // the row it was drawn from (paint order is value-descending). The
      // fixture array itself stays chronological because each render gets its
      // own copy — the component sorts `data` in place.
      const xByDate = new Map(
        inPaintOrder(evenlySpacedData, 'reading').map(
          (row, i) => [row.date, stemXs[i]] as const
        )
      );
      const chronologicalXs = evenlySpacedData.map(
        (row) => xByDate.get(row.date)!
      );

      // One week on a 21-day domain across the *inset* range (420px minus
      // SYMBOL_INSET on each side — see #16) is 133.33px. Assert the
      // literal, not "all spacings equal the first spacing" — the latter is
      // satisfied by any affine distortion of the scale, including a broken
      // one.
      const insetWeekPx = (RANGE_SPAN - 2 * SYMBOL_INSET) / 3;
      const spacings = chronologicalXs
        .slice(1)
        .map((x, i) => x - chronologicalXs[i]);
      expect(spacings).toHaveLength(evenlySpacedData.length - 1);
      spacings.forEach((spacing) =>
        expect(spacing).toBeCloseTo(insetWeekPx, 6)
      );
    });

    it('positions each stem at the correct date location on the time scale', () => {
      render(
        <LollipopVChart
          id='lollipop-time-position'
          style={CHART_SIZE}
          data={[...evenlySpacedData]}
          shape='circle'
          x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
          y={{ key: 'reading', start: 0 }}
        />
      );

      const stemXs = stemXsOf('lollipop-time-position');
      expect(stemXs).toHaveLength(evenlySpacedData.length);
      stemXs.forEach((x, i) => expect(x).toBeCloseTo(expectedStemXs[i], 6));

      // The endpoints of the domain land SYMBOL_INSET px in from the range
      // ends, not flush against them: a stem's symbol is a centered mark
      // and would otherwise render half outside the plot bounds (see #16).
      const sorted = [...stemXs].sort((a, b) => a - b);
      expect(sorted[0]).toBeCloseTo(RANGE_START + SYMBOL_INSET, 6);
      expect(sorted[sorted.length - 1]).toBeCloseTo(RANGE_END - SYMBOL_INSET, 6);
    });

    it('places the symbol head on the same x as its stem', () => {
      render(
        <LollipopVChart
          id='lollipop-time-stem-symbol-align'
          style={CHART_SIZE}
          data={[...evenlySpacedData]}
          shape='circle'
          x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
          y={{ key: 'reading', start: 0 }}
        />
      );

      const stemXs = stemXsOf('lollipop-time-stem-symbol-align');
      const points = symbolPointsOf('lollipop-time-stem-symbol-align');
      expect(points).toHaveLength(stemXs.length);
      points.forEach((point, i) => expect(point.x).toBeCloseTo(stemXs[i], 6));
    });
  });

  // ==========================================================================
  // Time mode: unevenly-spaced dates (gap in data)
  // ==========================================================================

  describe('time mode with unevenly-spaced dates', () => {
    const unevenlySpacedData = [
      { date: '2025-01-06', reading: 12 },
      { date: '2025-01-13', reading: 18 },
      // Gap: missing 2025-01-20 and 2025-01-27
      { date: '2025-02-10', reading: 22 },
      { date: '2025-02-17', reading: 25 },
    ];
    // Jan 6 -> Feb 17 is 42 days across the inset range (420px minus
    // SYMBOL_INSET on each side — see #16), which is 400px => ~9.524px/day.
    const domain: [string, string] = ['2025-01-06', '2025-02-17'];
    const PX_PER_DAY = (RANGE_SPAN - 2 * SYMBOL_INSET) / 42;

    const xOf = (date: string) => xForDate(date, domain);

    it('renders stems with whitespace at the gap', () => {
      render(
        <LollipopVChart
          id='lollipop-time-gap'
          style={CHART_SIZE}
          data={[...unevenlySpacedData]}
          shape='circle'
          x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
          y={{ key: 'reading', start: 0 }}
        />
      );

      const stemXs = stemXsOf('lollipop-time-gap');
      expect(stemXs).toHaveLength(unevenlySpacedData.length);

      const paintOrder = inPaintOrder(unevenlySpacedData, 'reading');
      const xByDate = new Map(
        paintOrder.map((row, i) => [row.date, stemXs[i]] as const)
      );

      // Exact positions: 7 days = 70px, 28 days = 280px.
      expect(xByDate.get('2025-01-06')!).toBeCloseTo(xOf('2025-01-06'), 6);
      expect(xByDate.get('2025-01-13')!).toBeCloseTo(xOf('2025-01-13'), 6);
      expect(xByDate.get('2025-02-10')!).toBeCloseTo(xOf('2025-02-10'), 6);
      expect(xByDate.get('2025-02-17')!).toBeCloseTo(xOf('2025-02-17'), 6);

      const spacingBeforeGap =
        xByDate.get('2025-01-13')! - xByDate.get('2025-01-06')!;
      const spacingAcrossGap =
        xByDate.get('2025-02-10')! - xByDate.get('2025-01-13')!;
      const spacingAfterGap =
        xByDate.get('2025-02-17')! - xByDate.get('2025-02-10')!;

      expect(spacingBeforeGap).toBeCloseTo(7 * PX_PER_DAY, 6);
      expect(spacingAfterGap).toBeCloseTo(7 * PX_PER_DAY, 6);
      // The four-week gap renders as exactly four weeks of whitespace: unlike
      // a band scale, elapsed time is honoured rather than slotted.
      expect(spacingAcrossGap).toBeCloseTo(28 * PX_PER_DAY, 6);
      expect(spacingAcrossGap).toBeCloseTo(spacingBeforeGap * 4, 6);
    });

    it('renders distinct stems without overlapping in unevenly-spaced data', () => {
      render(
        <LollipopVChart
          id='lollipop-time-uneven-distinct'
          style={CHART_SIZE}
          data={[...unevenlySpacedData]}
          shape='circle'
          x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
          y={{ key: 'reading', start: 0 }}
        />
      );

      const stemXs = stemXsOf('lollipop-time-uneven-distinct');
      const unique = new Set(stemXs.map((x) => x.toFixed(6)));
      expect(unique.size).toBe(unevenlySpacedData.length);
      // Every stem lies inside the plot area.
      stemXs.forEach((x) => {
        expect(x).toBeGreaterThanOrEqual(RANGE_START);
        expect(x).toBeLessThanOrEqual(RANGE_END);
      });
    });
  });

  // ==========================================================================
  // Time mode: single data point
  // ==========================================================================

  describe('time mode with single data point', () => {
    const singleData = [{ date: '2025-01-15', reading: 10 }];

    it('does not throw with a single data point', () => {
      expect(() => {
        render(
          <LollipopVChart
            id='lollipop-time-single'
            style={CHART_SIZE}
            data={[...singleData]}
            shape='circle'
            x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
            y={{ key: 'reading', start: 0 }}
          />
        );
      }).not.toThrow();
    });

    it('renders a single stem at a valid position', () => {
      render(
        <LollipopVChart
          id='lollipop-time-single-render'
          style={CHART_SIZE}
          data={[...singleData]}
          shape='circle'
          x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
          y={{ key: 'reading', start: 0 }}
        />
      );

      const stemXs = stemXsOf('lollipop-time-single-render');
      expect(stemXs).toHaveLength(1);
      // A single point makes the time domain degenerate ([t, t]); d3 maps a
      // degenerate continuous domain to the midpoint of the range, so the lone
      // stem is centred in the plot area at (40 + 460) / 2.
      expect(stemXs[0]).toBeCloseTo((RANGE_START + RANGE_END) / 2, 6);
    });
  });

  // ==========================================================================
  // Time mode: identical timestamps
  // ==========================================================================

  describe('time mode with identical timestamps', () => {
    const identicalDatesData = [
      { date: '2025-01-15', reading: 10 },
      { date: '2025-01-15', reading: 20 },
      { date: '2025-01-15', reading: 15 },
    ];

    it('does not throw with all-identical timestamps', () => {
      expect(() => {
        render(
          <LollipopVChart
            id='lollipop-time-identical'
            style={CHART_SIZE}
            data={[...identicalDatesData]}
            shape='circle'
            x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
            y={{ key: 'reading', start: 0 }}
          />
        );
      }).not.toThrow();
    });

    it('renders all stems at the same x position when timestamps are identical', () => {
      render(
        <LollipopVChart
          id='lollipop-time-identical-positions'
          style={CHART_SIZE}
          data={[...identicalDatesData]}
          shape='circle'
          x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
          y={{ key: 'reading', start: 0 }}
        />
      );

      const stemXs = stemXsOf('lollipop-time-identical-positions');
      expect(stemXs).toHaveLength(identicalDatesData.length);
      // Documented limitation (see meta.ts `avoidWhen`): rows sharing a
      // timestamp get no automatic separation, and all collapse onto the
      // degenerate domain's midpoint.
      stemXs.forEach((x) =>
        expect(x).toBeCloseTo((RANGE_START + RANGE_END) / 2, 6)
      );
    });
  });

  // ==========================================================================
  // Time mode: date parsing (isISO vs format)
  // ==========================================================================

  const parsingData = [
    { date: '2025-01-06', reading: 12 },
    { date: '2025-01-13', reading: 18 },
    { date: '2025-01-20', reading: 15 },
  ];
  // Jan 6 -> Jan 20 is 14 days across 420px => 30px per day, 210px per week.
  const parsingDomain: [string, string] = ['2025-01-06', '2025-01-20'];
  const parsingExpectedXs = inPaintOrder(parsingData, 'reading').map((d) =>
    xForDate(d.date, parsingDomain)
  );

  describe('time mode with isISO parsing', () => {
    it('parses ISO 8601 dates with isISO: true', () => {
      render(
        <LollipopVChart
          id='lollipop-time-iso'
          style={CHART_SIZE}
          data={[...parsingData]}
          shape='circle'
          x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
          y={{ key: 'reading', start: 0 }}
        />
      );

      const stemXs = stemXsOf('lollipop-time-iso');
      expect(stemXs).toHaveLength(parsingData.length);
      stemXs.forEach((x, i) => expect(x).toBeCloseTo(parsingExpectedXs[i], 6));
    });

    it('parses full ISO timestamps that the default format string cannot', () => {
      // Date-only strings look the same to isoParse and to
      // timeParse('%Y-%m-%d'), so a date-only fixture cannot tell the two
      // branches of `toDateTime` apart. These carry a time component and an
      // explicit zone: only the isISO branch can read them, and sub-day
      // offsets make the expected positions differ from midnight-aligned ones.
      const isoTimestampData = [
        { date: '2025-01-06T00:00:00.000Z', reading: 12 },
        { date: '2025-01-13T06:00:00.000Z', reading: 18 },
        { date: '2025-01-20T00:00:00.000Z', reading: 15 },
      ];
      const domain: [string, string] = [
        '2025-01-06T00:00:00.000Z',
        '2025-01-20T00:00:00.000Z',
      ];

      render(
        <LollipopVChart
          id='lollipop-time-iso-timestamps'
          style={CHART_SIZE}
          data={[...isoTimestampData]}
          shape='circle'
          x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
          y={{ key: 'reading', start: 0 }}
        />
      );

      const paintOrder = inPaintOrder(isoTimestampData, 'reading');
      const expectedXs = paintOrder.map((d) => xForDate(d.date, domain));
      // 14-day domain over the inset range (420px minus SYMBOL_INSET on each
      // side — see #16), so the +6h point sits 0.25 days right of the
      // midpoint it would occupy at midnight.
      const pxPerDay = (RANGE_SPAN - 2 * SYMBOL_INSET) / 14;
      const sixHourOffsetX = RANGE_START + SYMBOL_INSET + 7.25 * pxPerDay;
      const sixHourIndex = paintOrder.findIndex((d) => d.date.includes('T06:00'));
      expect(expectedXs[sixHourIndex]).toBeCloseTo(sixHourOffsetX, 6);

      const stemXs = stemXsOf('lollipop-time-iso-timestamps');
      expect(stemXs).toHaveLength(isoTimestampData.length);
      stemXs.forEach((x, i) => expect(x).toBeCloseTo(expectedXs[i], 6));
    });
  });

  describe('time mode with custom format parsing', () => {
    it('parses dates with custom format string', () => {
      render(
        <LollipopVChart
          id='lollipop-time-format'
          style={CHART_SIZE}
          data={[...parsingData]}
          shape='circle'
          x={{
            key: 'date',
            scalingFunction: 'time',
            time: { format: '%Y-%m-%d' },
          }}
          y={{ key: 'reading', start: 0 }}
        />
      );

      const stemXs = stemXsOf('lollipop-time-format');
      expect(stemXs).toHaveLength(parsingData.length);
      // Identical geometry to the isISO path: timeParse resolves to local
      // midnight rather than UTC midnight, but the scale only sees elapsed
      // time between points, so the constant offset cancels.
      stemXs.forEach((x, i) => expect(x).toBeCloseTo(parsingExpectedXs[i], 6));
    });

    it('falls back to the %Y-%m-%d default when no format is supplied', () => {
      render(
        <LollipopVChart
          id='lollipop-time-default-format'
          style={CHART_SIZE}
          data={[...parsingData]}
          shape='circle'
          x={{ key: 'date', scalingFunction: 'time' }}
          y={{ key: 'reading', start: 0 }}
        />
      );

      const stemXs = stemXsOf('lollipop-time-default-format');
      expect(stemXs).toHaveLength(parsingData.length);
      stemXs.forEach((x, i) => expect(x).toBeCloseTo(parsingExpectedXs[i], 6));
    });
  });

  // ==========================================================================
  // Time mode: symbol positioning via transform
  // ==========================================================================

  describe('time mode: symbol transform positioning', () => {
    const timeData = [
      { date: '2025-01-06', reading: 12 },
      { date: '2025-01-13', reading: 20 },
      { date: '2025-01-20', reading: 15 },
    ];
    const domain: [string, string] = ['2025-01-06', '2025-01-20'];
    const expectedXs = inPaintOrder(timeData, 'reading').map((d) =>
      xForDate(d.date, domain)
    );

    it('renders symbols with transform attribute', () => {
      render(
        <LollipopVChart
          id='lollipop-time-symbols'
          style={CHART_SIZE}
          data={[...timeData]}
          shape='circle'
          x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
          y={{ key: 'reading', start: 0 }}
        />
      );

      const paths = document
        .getElementById('lollipop-time-symbols')!
        .querySelectorAll('path.symbols');
      expect(paths).toHaveLength(timeData.length);
      paths.forEach((path) => {
        expect(path.getAttribute('transform')).toMatch(/translate\(/);
        // A symbol with no path data would still satisfy a transform check.
        expect(path.getAttribute('d')).toBeTruthy();
      });
    });

    it('positions symbols at correct x coordinates in time mode (via transform)', () => {
      render(
        <LollipopVChart
          id='lollipop-time-symbols-x'
          style={CHART_SIZE}
          data={[...timeData]}
          shape='circle'
          x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
          y={{ key: 'reading', start: 0 }}
        />
      );

      const points = symbolPointsOf('lollipop-time-symbols-x');
      expect(points).toHaveLength(timeData.length);
      points.forEach((point, i) => {
        expect(point.x).toBeCloseTo(expectedXs[i], 6);
        expect(point.y).toBeCloseTo(Y_BASELINE, 6);
      });
    });
  });

  // ==========================================================================
  // Edge cases: empty data and various shapes
  // ==========================================================================

  describe('time mode with empty data', () => {
    it('renders without throwing for empty data array', () => {
      expect(() => {
        render(
          <LollipopVChart
            id='lollipop-time-empty'
            style={CHART_SIZE}
            data={[]}
            shape='circle'
            x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
            y={{ key: 'reading', start: 0 }}
          />
        );
      }).not.toThrow();
    });

    it('renders an SVG element even with empty data', () => {
      render(
        <LollipopVChart
          id='lollipop-time-empty-svg'
          style={CHART_SIZE}
          data={[]}
          shape='circle'
          x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
          y={{ key: 'reading', start: 0 }}
        />
      );

      const svg = document.getElementById('lollipop-time-empty-svg');
      expect(svg).toBeTruthy();
      expect(svg?.tagName).toBe('svg');
      expect(svg?.querySelectorAll('line.line')).toHaveLength(0);
      expect(svg?.querySelectorAll('path.symbols')).toHaveLength(0);
    });
  });

  describe('time mode with different shapes', () => {
    const timeData = [
      { date: '2025-01-06', reading: 12 },
      { date: '2025-01-13', reading: 18 },
      { date: '2025-01-20', reading: 15 },
    ];
    const domain: [string, string] = ['2025-01-06', '2025-01-20'];
    const expectedXs = inPaintOrder(timeData, 'reading').map((d) =>
      xForDate(d.date, domain)
    );

    const shapePathsOf = (svgId: string) =>
      Array.from(
        document.getElementById(svgId)!.querySelectorAll('path.symbols')
      ).map((p) => p.getAttribute('d') ?? '');

    it('renders time-scaled lollipops with circle shape', () => {
      render(
        <LollipopVChart
          id='lollipop-time-circle'
          style={CHART_SIZE}
          data={[...timeData]}
          shape='circle'
          x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
          y={{ key: 'reading', start: 0 }}
        />
      );

      const stemXs = stemXsOf('lollipop-time-circle');
      expect(stemXs).toHaveLength(timeData.length);
      stemXs.forEach((x, i) => expect(x).toBeCloseTo(expectedXs[i], 6));
      // symbolCircle emits an arc command; the square/diamond shapes below do
      // not, so the shape prop demonstrably reaches the symbol generator.
      shapePathsOf('lollipop-time-circle').forEach((d) =>
        expect(d).toMatch(/[Aa]/)
      );
    });

    it('renders time-scaled lollipops with diamond shape', () => {
      render(
        <LollipopVChart
          id='lollipop-time-diamond'
          style={CHART_SIZE}
          data={[...timeData]}
          shape='diamond'
          x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
          y={{ key: 'reading', start: 0 }}
        />
      );

      const stemXs = stemXsOf('lollipop-time-diamond');
      expect(stemXs).toHaveLength(timeData.length);
      stemXs.forEach((x, i) => expect(x).toBeCloseTo(expectedXs[i], 6));
      shapePathsOf('lollipop-time-diamond').forEach((d) => {
        expect(d).not.toMatch(/[Aa]/);
        expect(d).toMatch(/^M/);
      });
    });

    it('renders time-scaled lollipops with square shape', () => {
      render(
        <LollipopVChart
          id='lollipop-time-square'
          style={CHART_SIZE}
          data={[...timeData]}
          shape='square'
          x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
          y={{ key: 'reading', start: 0 }}
        />
      );

      const stemXs = stemXsOf('lollipop-time-square');
      expect(stemXs).toHaveLength(timeData.length);
      stemXs.forEach((x, i) => expect(x).toBeCloseTo(expectedXs[i], 6));
      shapePathsOf('lollipop-time-square').forEach((d) => {
        expect(d).not.toMatch(/[Aa]/);
        expect(d).toMatch(/[Hh]/);
      });
    });
  });

  // ==========================================================================
  // Time mode: stem lines y positioning (should not change)
  // ==========================================================================

  describe('time mode: stem line y-axis positioning', () => {
    const timeData = [
      { date: '2025-01-06', reading: 10 },
      { date: '2025-01-13', reading: 30 },
      { date: '2025-01-20', reading: 20 },
    ];

    it('positions stem lines from baseline to data value', () => {
      render(
        <LollipopVChart
          id='lollipop-time-y'
          style={CHART_SIZE}
          data={[...timeData]}
          shape='circle'
          x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
          y={{ key: 'reading', start: 0, axis: { location: 'left' } }}
        />
      );

      // The component draws each stem by first pinning both endpoints to the
      // baseline (y1 = y2 = yFn(minValue)), then animating y1 up to the data
      // value via `.transition().duration(1000)`. That transition is driven by
      // d3-timer's own frame scheduling, which does not advance during a
      // synchronous render() in jsdom — so we observe the pre-transition
      // anchor frame. Pin the anchor to its exact pixel value (height 300,
      // margin.bottom 40, y.start 0 => yFn(0) = 260) rather than asserting it
      // is merely finite.
      const ys = stemYsOf('lollipop-time-y');
      expect(ys).toHaveLength(timeData.length);
      ys.forEach(({ y1, y2 }) => {
        expect(y1).toBeCloseTo(Y_BASELINE, 6);
        expect(y2).toBeCloseTo(Y_BASELINE, 6);
      });
    });

    it('settles stems and symbol heads on their data values once the transition ends', async () => {
      const domain: [string, string] = ['2025-01-06', '2025-01-20'];
      // yFn domain [0, 30] over range [260, 40] => 220px for 30 units.
      const yFor = (reading: number) => Y_BASELINE - (reading / 30) * 220;
      const paintOrder = inPaintOrder(timeData, 'reading');

      render(
        <LollipopVChart
          id='lollipop-time-y-settled'
          style={CHART_SIZE}
          data={[...timeData]}
          shape='circle'
          x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
          y={{ key: 'reading', start: 0, axis: { location: 'left' } }}
        />
      );

      // The anchor-frame assertions above never observe the transition's end
      // state, so the *final* `x1`/`transform` expressions are otherwise
      // untested. Let the 1000ms draw-in transition actually run (d3-timer
      // advances on real time under jsdom) and assert the settled geometry.
      await waitFor(
        () => {
          expect(stemYsOf('lollipop-time-y-settled')[0].y1).toBeCloseTo(
            yFor(paintOrder[0].reading),
            6
          );
        },
        { timeout: 4000, interval: 50 }
      );

      const stemXs = stemXsOf('lollipop-time-y-settled');
      const ys = stemYsOf('lollipop-time-y-settled');
      const points = symbolPointsOf('lollipop-time-y-settled');

      paintOrder.forEach((row, i) => {
        const expectedX = xForDate(row.date, domain);
        expect(stemXs[i]).toBeCloseTo(expectedX, 6);
        // y1 rises to the value; y2 stays pinned to the baseline.
        expect(ys[i].y1).toBeCloseTo(yFor(row.reading), 6);
        expect(ys[i].y2).toBeCloseTo(Y_BASELINE, 6);
        // The head lands on the top of its own stem.
        expect(points[i].x).toBeCloseTo(expectedX, 6);
        expect(points[i].y).toBeCloseTo(yFor(row.reading), 6);
      });
    });
  });

  // ==========================================================================
  // Integration: time mode with custom margin and padding
  // ==========================================================================

  describe('time mode with custom margin and padding', () => {
    const timeData = [
      { date: '2025-01-06', reading: 12 },
      { date: '2025-01-13', reading: 18 },
      { date: '2025-01-20', reading: 15 },
    ];
    const domain: [string, string] = ['2025-01-06', '2025-01-20'];

    it('renders time-scaled lollipops with custom margin', () => {
      render(
        <LollipopVChart
          id='lollipop-time-margin'
          style={CHART_SIZE}
          data={[...timeData]}
          shape='circle'
          x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
          y={{ key: 'reading', start: 0 }}
          margin={{ top: 50, right: 50, bottom: 50, left: 50 }}
        />
      );

      // margin 50 => x range [50, 450], inset by SYMBOL_INSET on each side
      // for the centered symbols (see #16) => [60, 440]. y baseline = 300 -
      // 50 = 250.
      const expectedXs = inPaintOrder(timeData, 'reading').map((d) =>
        xForDate(d.date, domain, [50 + SYMBOL_INSET, 450 - SYMBOL_INSET])
      );
      const stemXs = stemXsOf('lollipop-time-margin');
      expect(stemXs).toHaveLength(timeData.length);
      stemXs.forEach((x, i) => expect(x).toBeCloseTo(expectedXs[i], 6));
      stemYsOf('lollipop-time-margin').forEach(({ y1 }) =>
        expect(y1).toBeCloseTo(250, 6)
      );
    });

    it('renders time-scaled lollipops with custom padding', () => {
      render(
        <LollipopVChart
          id='lollipop-time-padding'
          style={CHART_SIZE}
          data={[...timeData]}
          shape='circle'
          x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
          y={{ key: 'reading', start: 0 }}
          padding={{ top: 20, right: 20, bottom: 20, left: 20 }}
        />
      );

      // Padding is applied inside the default 40px margins:
      // x range [40 + 20, 500 - 40 - 20] = [60, 440], inset by SYMBOL_INSET
      // on each side for the centered symbols (see #16) => [70, 430].
      // y baseline = 300 - 40 - 20 = 240.
      const expectedXs = inPaintOrder(timeData, 'reading').map((d) =>
        xForDate(d.date, domain, [60 + SYMBOL_INSET, 440 - SYMBOL_INSET])
      );
      const stemXs = stemXsOf('lollipop-time-padding');
      expect(stemXs).toHaveLength(timeData.length);
      stemXs.forEach((x, i) => expect(x).toBeCloseTo(expectedXs[i], 6));
      stemYsOf('lollipop-time-padding').forEach(({ y1 }) =>
        expect(y1).toBeCloseTo(240, 6)
      );
    });
  });
});

describe('LollipopVChart time mode keeps edge symbols inside the plot (#16)', () => {

  // d3-axis draws the domain line as `M{start}.5,6V0.5H{end}.5V6`.
  const xAxisSpan = (container: HTMLElement) => {
    const d = container.querySelector('.axis--x path.domain')?.getAttribute('d') ?? '';
    const match = /^M(-?[\d.]+),[\d.-]+V[\d.-]+H(-?[\d.]+)/.exec(d);
    return match ? [Number(match[1]), Number(match[2])] : [NaN, NaN];
  };

  it('edge symbols sit SYMBOL_INSET in from the range ends while the axis spans it fully', () => {
    const { container } = render(
      <LollipopVChart
        id='edge-lollipop'
        style={CHART_SIZE}
        data={[
          { date: '2025-01-06', value: 10 },
          { date: '2025-01-08', value: 20 },
          { date: '2025-01-27', value: 15 },
        ]}
        x={{ key: 'date', scalingFunction: 'time' }}
        y={{ key: 'value' }}
        shape='star'
      />
    );

    const centers = Array.from(container.querySelectorAll('path.symbols')).map((p) =>
      Number(/translate\((-?[\d.]+)/.exec(p.getAttribute('transform') ?? '')?.[1])
    );
    expect(centers).toHaveLength(3);
    // The star is the widest symbol (~9.44px bounding radius at size 100), so
    // a 10px inset keeps every shape's full outline inside [40, 460].
    expect(Math.min(...centers)).toBeCloseTo(RANGE_START + SYMBOL_INSET, 6);
    expect(Math.max(...centers)).toBeCloseTo(RANGE_END - SYMBOL_INSET, 6);

    const [axisStart, axisEnd] = xAxisSpan(container);
    expect(axisStart).toBeCloseTo(RANGE_START + 0.5, 6);
    expect(axisEnd).toBeCloseTo(RANGE_END + 0.5, 6);
  });
});
