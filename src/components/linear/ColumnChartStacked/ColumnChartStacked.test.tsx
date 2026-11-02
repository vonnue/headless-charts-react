import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import ColumnChartStacked from '.';
import data from './sample.json';

describe('ColumnChartStacked', () => {
  const defaultArgs = {
    id: 'column-stacked',
    data,
    x: { key: 'year' },
    y: [
      { key: 'iphone', className: 'text-blue-500' },
      { key: 'macbook', className: 'text-green-500' },
      { key: 'services', className: 'text-purple-500' },
    ],
  };

  it('renders an SVG element', () => {
    render(<ColumnChartStacked {...defaultArgs} />);

    const svg = document.getElementById('column-stacked');
    expect(svg).toBeTruthy();
    expect(svg?.tagName).toBe('svg');
  });

  it('renders stacked rect elements', () => {
    render(<ColumnChartStacked {...defaultArgs} />);

    const svg = document.getElementById('column-stacked');
    const rects = svg?.querySelectorAll('rect');
    // Stacked bars: at least data.length * y.length rects
    expect(rects?.length).toBeGreaterThanOrEqual(data.length);
  });

  it('renders with waterfall mode', () => {
    render(
      <ColumnChartStacked {...defaultArgs} id='column-waterfall' waterfall />
    );

    const svg = document.getElementById('column-waterfall');
    expect(svg).toBeTruthy();
  });

  it('narrows and staggers bars per series in waterfall mode, instead of sharing one column x', () => {
    // Normal stacking: every series in a category shares the same x and the
    // full band width — bars sit on top of each other, reading as one column.
    render(<ColumnChartStacked {...defaultArgs} id='column-stacked-normal' />);
    const normalRects = Array.from(
      document.querySelectorAll('#column-stacked-normal rect')
    );
    const normalWidths = new Set(normalRects.map((r) => r.getAttribute('width')));
    const normalXsForFirstCategory = new Set(
      [0, 1, 2].map((i) => normalRects[i * data.length]?.getAttribute('x'))
    );

    expect(normalWidths.size).toBe(1); // one shared bar width
    expect(normalXsForFirstCategory.size).toBe(1); // all series stack at the same x

    // Waterfall: each series becomes its own floating step — narrower bars
    // (band width / series count) offset side by side instead of stacked.
    render(<ColumnChartStacked {...defaultArgs} id='column-waterfall-scale' waterfall />);
    const waterfallRects = Array.from(
      document.querySelectorAll('#column-waterfall-scale rect')
    );
    const waterfallWidth = Number(waterfallRects[0]?.getAttribute('width'));
    const waterfallXsForFirstCategory = [0, 1, 2].map((i) =>
      Number(waterfallRects[i * data.length]?.getAttribute('x'))
    );

    const normalWidth = Number([...normalWidths][0]);
    expect(waterfallWidth).toBeCloseTo(normalWidth / defaultArgs.y.length);
    // Each step's x is offset from the previous by exactly one step width —
    // steps sit side by side rather than stacked at a single x.
    expect(waterfallXsForFirstCategory[1] - waterfallXsForFirstCategory[0]).toBeCloseTo(
      waterfallWidth
    );
    expect(waterfallXsForFirstCategory[2] - waterfallXsForFirstCategory[1]).toBeCloseTo(
      waterfallWidth
    );
  });

  it('renders with reference lines', () => {
    render(
      <ColumnChartStacked
        {...defaultArgs}
        id='column-stacked-refs'
        referenceLines={[{ y: 200, className: 'text-red-500' }]}
      />
    );

    const svg = document.getElementById('column-stacked-refs');
    expect(svg).toBeTruthy();
  });

  it('renders with custom padding', () => {
    render(
      <ColumnChartStacked
        {...defaultArgs}
        id='column-stacked-padded'
        padding={{ top: 10, right: 10, bottom: 10, left: 10 }}
        paddingBar={0.3}
      />
    );

    const svg = document.getElementById('column-stacked-padded');
    expect(svg).toBeTruthy();
  });

  it('renders with drawing animation config', () => {
    render(
      <ColumnChartStacked
        {...defaultArgs}
        id='column-stacked-animated'
        drawing={{ duration: 500, delay: 100 }}
      />
    );

    const svg = document.getElementById('column-stacked-animated');
    expect(svg).toBeTruthy();
  });

  it('handles empty data', () => {
    render(
      <ColumnChartStacked {...defaultArgs} id='column-stacked-empty' data={[]} />
    );

    const svg = document.getElementById('column-stacked-empty');
    expect(svg).toBeTruthy();
  });

  describe('Time scaling (x.scalingFunction: "time")', () => {
    // Test data with evenly-spaced ISO dates (one year apart)
    const evenlySpacedTimeData = [
      { date: '2020-12-31T23:59:59.000Z', iphone: 100, macbook: 50, services: 30 },
      { date: '2021-12-31T23:59:59.000Z', iphone: 120, macbook: 60, services: 40 },
      { date: '2022-12-31T23:59:59.000Z', iphone: 140, macbook: 70, services: 50 },
      { date: '2023-12-31T23:59:59.000Z', iphone: 160, macbook: 80, services: 60 },
    ];

    // Test data with unevenly-spaced dates (missing 2015, 2016, 2019)
    const unevenlySpacedTimeData = [
      { date: '2012-12-31T23:59:59.000Z', iphone: 100, macbook: 50, services: 30 },
      { date: '2013-12-31T23:59:59.000Z', iphone: 110, macbook: 55, services: 35 },
      { date: '2014-12-31T23:59:59.000Z', iphone: 120, macbook: 60, services: 40 },
      // 2015, 2016 missing
      { date: '2017-12-31T23:59:59.000Z', iphone: 130, macbook: 65, services: 45 },
      { date: '2018-12-31T23:59:59.000Z', iphone: 140, macbook: 70, services: 50 },
      // 2019 missing
      { date: '2020-12-31T23:59:59.000Z', iphone: 150, macbook: 75, services: 55 },
    ];

    // Single data point
    const singlePointTimeData = [
      { date: '2022-12-31T23:59:59.000Z', iphone: 100, macbook: 50, services: 30 },
    ];

    // All identical timestamps
    const identicalTimestampsData = [
      { date: '2022-12-31T23:59:59.000Z', iphone: 100, macbook: 50, services: 30 },
      { date: '2022-12-31T23:59:59.000Z', iphone: 120, macbook: 60, services: 40 },
      { date: '2022-12-31T23:59:59.000Z', iphone: 140, macbook: 70, services: 50 },
    ];

    const timeSeriesArgs = {
      x: { key: 'date', scalingFunction: 'time' as const, time: { isISO: true } },
      y: [
        { key: 'iphone', className: 'text-blue-500' },
        { key: 'macbook', className: 'text-green-500' },
        { key: 'services', className: 'text-purple-500' },
      ],
    };

    // The component reads its own size off the rendered SVG's *computed*
    // style (`svg.style('width')`). jsdom has no layout engine, so a CSS
    // class alone computes to "" -> width 0 -> the scale's range comes out
    // inverted ([40, -40]) and every inferred bar width collapses onto the
    // `Math.max(1, ...)` floor, which silently makes the cadence-inference
    // assertions below vacuous. An *inline* style is the one thing jsdom's
    // getComputedStyle does report, so size the SVG that way to exercise the
    // real geometry.
    const chartStyle = { width: '600px', height: '400px' };

    // Derived from chartStyle plus the component's default margins
    // (left/right 40) and zero default padding.
    const RANGE_START = 40;
    const RANGE_END = 560;
    const PLOT_WIDTH = RANGE_END - RANGE_START; // 520
    const DEFAULT_PADDING_BAR = 0.2;
    const DAY_MS = 24 * 60 * 60 * 1000;

    // The span is laid out as (span / cadence) steps plus half a slot for
    // each unpinned end, so the first and last dates get a full slot each
    // (half on each side of the mark). That is what keeps the edge bars
    // inside the plot. Pinned ends (x.start / x.end) get no padding slot.
    const slotPx = (cadenceMs: number, domainSpanMs: number, padSlots = 1) =>
      PLOT_WIDTH / (domainSpanMs / cadenceMs + padSlots);

    /** Bar width the spec's algorithm should produce for a given cadence. */
    const expectedBarWidth = (
      cadenceMs: number,
      domainSpanMs: number,
      paddingBar = DEFAULT_PADDING_BAR,
      padSlots = 1
    ) => slotPx(cadenceMs, domainSpanMs, padSlots) * (1 - paddingBar);


    const spanMs = (rows: { date: string }[]) =>
      new Date(rows[rows.length - 1].date).getTime() -
      new Date(rows[0].date).getTime();

    it('renders SVG with time-scaled x axis', () => {
      render(
        <ColumnChartStacked
          id='time-stacked'
          data={evenlySpacedTimeData}
          {...timeSeriesArgs}
        />
      );

      const svg = document.getElementById('time-stacked');
      expect(svg).toBeTruthy();
      expect(svg?.tagName).toBe('svg');
    });

    it('renders stacked rect elements in time mode', () => {
      render(
        <ColumnChartStacked
          id='time-stacked-rects'
          data={evenlySpacedTimeData}
          {...timeSeriesArgs}
        />
      );

      const svg = document.getElementById('time-stacked-rects');
      const rects = svg?.querySelectorAll('rect');
      expect(rects?.length).toBeGreaterThanOrEqual(evenlySpacedTimeData.length);
    });

    it('maintains non-time mode behavior when scalingFunction is unset', () => {
      // Render with time mode explicitly disabled
      render(
        <ColumnChartStacked
          id='non-time-stacked-default'
          data={evenlySpacedTimeData}
          x={{ key: 'date' }}
          y={timeSeriesArgs.y}
        />
      );

      const svg = document.getElementById('non-time-stacked-default');
      expect(svg).toBeTruthy();
      expect(svg?.querySelectorAll('rect').length).toBeGreaterThan(0);
    });

    it('maintains non-time mode behavior when scalingFunction is "linear"', () => {
      render(
        <ColumnChartStacked
          id='non-time-stacked-linear'
          data={evenlySpacedTimeData}
          x={{ key: 'date', scalingFunction: 'linear' }}
          y={timeSeriesArgs.y}
        />
      );

      const svg = document.getElementById('non-time-stacked-linear');
      expect(svg).toBeTruthy();
      expect(svg?.querySelectorAll('rect').length).toBeGreaterThan(0);
    });

    it('positions bars proportionally to elapsed time with evenly-spaced dates', () => {
      // With evenly-spaced dates, bars should have equal spacing and width
      render(
        <ColumnChartStacked
          id='time-evenly-spaced'
          data={evenlySpacedTimeData}
          style={chartStyle}
          {...timeSeriesArgs}
        />
      );

      const svg = document.getElementById('time-evenly-spaced');
      const rects = Array.from(svg?.querySelectorAll('rect') ?? []);
      expect(rects.length).toBe(
        evenlySpacedTimeData.length * timeSeriesArgs.y.length
      );

      // Rects are appended series-major (all rows for series 0, then all rows
      // for series 1, ...) — see the `y.map((column, i) => ...)` loop in the
      // implementation. So the first series' rects, one per time period in
      // data order, are simply the first `data.length` rects, not every
      // Nth rect (that would interleave rows across series).
      const firstSeriesRects = rects.slice(0, evenlySpacedTimeData.length);

      const xPositions = firstSeriesRects.map((r) => Number(r.getAttribute('x')));
      const widths = firstSeriesRects.map((r) => Number(r.getAttribute('width')));

      // Non-waterfall stacking uses a single shared bar width.
      const domainSpan = spanMs(evenlySpacedTimeData);
      const cadence = domainSpan / (evenlySpacedTimeData.length - 1);
      const barWidth = expectedBarWidth(cadence, domainSpan);
      for (const width of widths) {
        expect(width).toBeCloseTo(barWidth, 6);
      }

      // 3 one-year steps -> 4 slots of 130px; bars are 104px, centres one
      // slot apart starting half a slot in, so the edge bars keep half the
      // padding gap (13px) to the plot edge.
      const slot = slotPx(cadence, domainSpan);
      expect(slot).toBeCloseTo(130, 6);
      const deltas = xPositions.slice(1).map((x, i) => x - xPositions[i]);
      for (const delta of deltas) {
        expect(delta).toBeCloseTo(slot, 6);
      }
      expect(xPositions[0]).toBeCloseTo(RANGE_START + 13, 6);
      expect(xPositions[xPositions.length - 1] + barWidth).toBeCloseTo(RANGE_END - 13, 6);
    });

    it('creates visible whitespace at gaps between unevenly-spaced dates', () => {
      // With gaps in time data, there should be visible spacing
      render(
        <ColumnChartStacked
          id='time-uneven-gaps'
          data={unevenlySpacedTimeData}
          style={chartStyle}
          {...timeSeriesArgs}
        />
      );

      const svg = document.getElementById('time-uneven-gaps');
      const rects = Array.from(svg?.querySelectorAll('rect') ?? []);

      // Same series-major DOM order as above: first series' rects are the
      // first `data.length` rects, in data order.
      const firstSeriesRects = rects.slice(0, unevenlySpacedTimeData.length);

      const positions = firstSeriesRects.map((r) => ({
        x: Number(r.getAttribute('x')),
        width: Number(r.getAttribute('width')),
      }));

      // All bars share one width (the median cadence, one year); the
      // whitespace between them is therefore purely a function of elapsed
      // time, and must be proportional to the number of years skipped.
      // Elapsed time maps at one slot per cadence.
      const domainSpan = spanMs(unevenlySpacedTimeData);
      const cadence = 365 * DAY_MS;
      const barWidth = positions[0].width;
      expect(barWidth).toBeCloseTo(expectedBarWidth(cadence, domainSpan), 6);
      const yearPx = (rows: number) =>
        slotPx(cadence, domainSpan) *
        ((new Date(unevenlySpacedTimeData[rows].date).getTime() -
          new Date(unevenlySpacedTimeData[rows - 1].date).getTime()) /
          cadence);

      const gaps = positions
        .slice(1)
        .map((p, i) => p.x - (positions[i].x + positions[i].width));

      // Every consecutive pair is separated, and the two skipped stretches
      // (2014->2017 and 2018->2020) read as proportionally wider whitespace.
      gaps.forEach((gap, i) => {
        expect(gap).toBeCloseTo(yearPx(i + 1) - barWidth, 6);
        expect(gap).toBeGreaterThan(0);
      });
      // index 2 is the three-year skip, index 4 the two-year skip.
      expect(gaps[2]).toBeGreaterThan(gaps[4]);
      expect(gaps[4]).toBeGreaterThan(gaps[0] * 2);
    });

    it('infers bar width from the median gap, not the mean or the smallest gap', () => {
      // Gaps, in days: [1, 1, 1, 0.25, 30].
      //   median = 1    (what the spec requires)
      //   min    = 0.25 (would collapse the bars to a sliver)
      //   mean   = 6.65 (one outlier gap would fatten every bar)
      // Picking three separable candidates is the whole point of this
      // fixture — asserting only "all widths are equal" cannot tell them
      // apart, since all three produce equal widths.
      const skewedCadenceData = [
        { date: '2021-01-01T00:00:00.000Z', iphone: 100, macbook: 50, services: 30 },
        { date: '2021-01-02T00:00:00.000Z', iphone: 110, macbook: 55, services: 35 },
        { date: '2021-01-03T00:00:00.000Z', iphone: 120, macbook: 60, services: 40 },
        { date: '2021-01-04T00:00:00.000Z', iphone: 130, macbook: 65, services: 45 },
        // near-duplicate timestamp: the smallest gap, six hours
        { date: '2021-01-04T06:00:00.000Z', iphone: 135, macbook: 67, services: 47 },
        // one long stretch: the outlier that would skew a mean
        { date: '2021-02-03T06:00:00.000Z', iphone: 140, macbook: 70, services: 50 },
      ];

      render(
        <ColumnChartStacked
          id='time-median-width'
          data={skewedCadenceData}
          style={chartStyle}
          {...timeSeriesArgs}
        />
      );

      const svg = document.getElementById('time-median-width');
      const rects = Array.from(svg?.querySelectorAll('rect') ?? []);
      expect(rects.length).toBe(
        skewedCadenceData.length * timeSeriesArgs.y.length
      );

      const domainSpan = spanMs(skewedCadenceData);
      const fromMedian = expectedBarWidth(1 * DAY_MS, domainSpan);
      const fromMin = expectedBarWidth(0.25 * DAY_MS, domainSpan);
      const fromMean = expectedBarWidth(domainSpan / 5, domainSpan);

      // All bars in non-waterfall mode share the one inferred width.
      const widths = rects.map((r) => Number(r.getAttribute('width')));
      for (const width of widths) {
        expect(width).toBeCloseTo(fromMedian, 6);
      }
      // Guard the fixture itself: the three candidates must stay distinct,
      // otherwise the assertion above proves nothing.
      expect(Math.abs(fromMedian - fromMin)).toBeGreaterThan(1);
      expect(Math.abs(fromMedian - fromMean)).toBeGreaterThan(1);
    });

    it('uses explicit x.time.barWidth exactly, without padding applied', () => {
      const explicitBarWidth = 30;
      render(
        <ColumnChartStacked
          id='time-explicit-width'
          data={evenlySpacedTimeData}
          style={chartStyle}
          {...timeSeriesArgs}
          x={{
            ...timeSeriesArgs.x,
            time: { isISO: true, barWidth: explicitBarWidth },
          }}
        />
      );

      const svg = document.getElementById('time-explicit-width');
      const rects = Array.from(svg?.querySelectorAll('rect') ?? []);
      expect(rects.length).toBe(
        evenlySpacedTimeData.length * timeSeriesArgs.y.length
      );

      // In non-waterfall stacking, every bar is exactly barWidth wide — the
      // default paddingBar of 0.2 is not applied on top of an explicit value.
      const domainSpan = spanMs(evenlySpacedTimeData);
      const cadence = domainSpan / (evenlySpacedTimeData.length - 1);
      expect(expectedBarWidth(cadence, domainSpan)).not.toBeCloseTo(
        explicitBarWidth,
        1
      );
      for (const rect of rects) {
        expect(Number(rect.getAttribute('width'))).toBeCloseTo(
          explicitBarWidth,
          6
        );
      }
    });

    it('does not crash and produces positive width with single data point', () => {
      render(
        <ColumnChartStacked
          id='time-single-point'
          data={singlePointTimeData}
          style={chartStyle}
          {...timeSeriesArgs}
        />
      );

      const svg = document.getElementById('time-single-point');
      expect(svg).toBeTruthy();

      const rects = Array.from(svg?.querySelectorAll('rect') ?? []);
      expect(rects.length).toBe(timeSeriesArgs.y.length);

      // No cadence to infer, so the algorithm falls back to an even split of
      // the plot width across the rows (one row here), minus bar padding.
      const fallbackWidth = PLOT_WIDTH * (1 - DEFAULT_PADDING_BAR);
      for (const rect of rects) {
        const width = Number(rect.getAttribute('width'));
        expect(width).toBeCloseTo(fallbackWidth, 6);
        expect(width).toBeGreaterThan(0);
        expect(Number.isFinite(Number(rect.getAttribute('x')))).toBe(true);
      }
    });

    it('does not crash and produces positive width with all identical timestamps', () => {
      render(
        <ColumnChartStacked
          id='time-identical-dates'
          data={identicalTimestampsData}
          style={chartStyle}
          {...timeSeriesArgs}
        />
      );

      const svg = document.getElementById('time-identical-dates');
      expect(svg).toBeTruthy();

      const rects = Array.from(svg?.querySelectorAll('rect') ?? []);
      expect(rects.length).toBe(
        identicalTimestampsData.length * timeSeriesArgs.y.length
      );

      // De-duplicating timestamps leaves one unique value, so there is again
      // no cadence — even split across the three rows, minus bar padding.
      const fallbackWidth =
        (PLOT_WIDTH / identicalTimestampsData.length) *
        (1 - DEFAULT_PADDING_BAR);
      for (const rect of rects) {
        const width = Number(rect.getAttribute('width'));
        expect(width).toBeCloseTo(fallbackWidth, 6);
        expect(width).toBeGreaterThan(0);
        expect(Number.isFinite(Number(rect.getAttribute('x')))).toBe(true);
      }
    });

    it('parses ISO format dates (x.time.isISO: true)', () => {
      render(
        <ColumnChartStacked
          id='time-iso-format'
          data={evenlySpacedTimeData}
          style={chartStyle}
          {...timeSeriesArgs}
          x={{
            key: 'date',
            scalingFunction: 'time',
            time: { isISO: true },
          }}
        />
      );

      const svg = document.getElementById('time-iso-format');
      expect(svg).toBeTruthy();

      // A failed parse would leave every position NaN while still emitting
      // the same number of rects, so assert the geometry, not just the count.
      const rects = Array.from(svg?.querySelectorAll('rect') ?? []);
      const domainSpan = spanMs(evenlySpacedTimeData);
      const cadence = domainSpan / (evenlySpacedTimeData.length - 1);
      for (const rect of rects) {
        expect(Number(rect.getAttribute('x'))).not.toBeNaN();
        expect(Number(rect.getAttribute('width'))).toBeCloseTo(
          expectedBarWidth(cadence, domainSpan),
          6
        );
      }
    });

    it('parses custom format dates (x.time.format)', () => {
      const customFormatData = [
        { date: '31-12-2020 23:59:59', iphone: 100, macbook: 50, services: 30 },
        { date: '31-12-2021 23:59:59', iphone: 120, macbook: 60, services: 40 },
        { date: '31-12-2022 23:59:59', iphone: 140, macbook: 70, services: 50 },
      ];

      render(
        <ColumnChartStacked
          id='time-custom-format'
          data={customFormatData}
          style={chartStyle}
          x={{
            key: 'date',
            scalingFunction: 'time',
            time: { format: '%d-%m-%Y %H:%M:%S' },
          }}
          y={timeSeriesArgs.y}
        />
      );

      const svg = document.getElementById('time-custom-format');
      expect(svg).toBeTruthy();

      // Same reasoning as the ISO case: an unparsed date yields NaN
      // positions, which a bare "rects exist" assertion would not catch.
      const rects = Array.from(svg?.querySelectorAll('rect') ?? []);
      expect(rects.length).toBe(customFormatData.length * timeSeriesArgs.y.length);
      const firstSeries = rects.slice(0, customFormatData.length);
      const xs = firstSeries.map((r) => Number(r.getAttribute('x')));
      const width = Number(firstSeries[0].getAttribute('width'));
      for (const value of xs) expect(value).not.toBeNaN();
      // Two equal one-year gaps -> 3 slots; centres one slot apart starting
      // half a slot in from the range start.
      const slot = PLOT_WIDTH / 3;
      expect(width).toBeCloseTo(slot * (1 - DEFAULT_PADDING_BAR), 6);
      expect(xs[1] - xs[0]).toBeCloseTo(slot, 6);
      expect(xs[2] - xs[1]).toBeCloseTo(slot, 6);
      expect(xs[0] + width / 2).toBeCloseTo(RANGE_START + slot / 2, 6);
      expect(xs[2] + width / 2).toBeCloseTo(RANGE_END - slot / 2, 6);
    });

    it('respects x.start and x.end for axis domain in time mode', () => {
      // Set explicit start and end dates
      const customStart = new Date('2020-06-30T00:00:00Z').getTime();
      const customEnd = new Date('2023-06-30T00:00:00Z').getTime();

      render(
        <ColumnChartStacked
          id='time-custom-domain'
          data={evenlySpacedTimeData}
          style={chartStyle}
          {...timeSeriesArgs}
          x={{
            ...timeSeriesArgs.x,
            start: customStart,
            end: customEnd,
          }}
        />
      );

      const svg = document.getElementById('time-custom-domain');
      expect(svg).toBeTruthy();

      const rects = Array.from(svg?.querySelectorAll('rect') ?? []);
      expect(rects.length).toBe(
        evenlySpacedTimeData.length * timeSeriesArgs.y.length
      );

      // Both ends are pinned, so the domain is used as given (no padding):
      // the centre sits proportionally inside [start, end] on the full range.
      const first = rects[0];
      const width = Number(first.getAttribute('width'));
      const centre = Number(first.getAttribute('x')) + width / 2;
      const t0 = new Date(evenlySpacedTimeData[0].date).getTime();
      expect(centre).toBeCloseTo(
        RANGE_START + PLOT_WIDTH * ((t0 - customStart) / (customEnd - customStart)),
        6
      );
      expect(centre).toBeGreaterThan(RANGE_START);
      // The slot still comes from the cadence over the pinned span, with no
      // padding slot at either pinned end (review-2 N2).
      const cadence = spanMs(evenlySpacedTimeData) / 3;
      expect(width).toBeCloseTo(
        expectedBarWidth(cadence, customEnd - customStart, DEFAULT_PADDING_BAR, 0),
        6
      );
    });

    it('renders time mode with waterfall enabled', () => {
      render(
        <ColumnChartStacked
          id='time-waterfall'
          data={evenlySpacedTimeData}
          {...timeSeriesArgs}
          waterfall
        />
      );

      const svg = document.getElementById('time-waterfall');
      expect(svg).toBeTruthy();
      expect(svg?.querySelectorAll('rect').length).toBeGreaterThan(0);
    });

    it('staggers and narrows bars in waterfall + time mode interaction', () => {
      // Render normal time stacking
      render(
        <ColumnChartStacked
          id='time-normal-stacking'
          data={evenlySpacedTimeData}
          style={chartStyle}
          {...timeSeriesArgs}
        />
      );
      const normalRects = Array.from(
        document.querySelectorAll('#time-normal-stacking rect')
      );
      const normalWidths = new Set(normalRects.map((r) => r.getAttribute('width')));
      // Without waterfall every series shares one x and the full bar width.
      expect(normalWidths.size).toBe(1);
      const normalXsForFirstRow = new Set(
        [0, 1, 2].map((i) =>
          normalRects[i * evenlySpacedTimeData.length]?.getAttribute('x')
        )
      );
      expect(normalXsForFirstRow.size).toBe(1);

      // Render waterfall + time mode
      render(
        <ColumnChartStacked
          id='time-waterfall-staggered'
          data={evenlySpacedTimeData}
          style={chartStyle}
          {...timeSeriesArgs}
          waterfall
        />
      );
      const waterfallRects = Array.from(
        document.querySelectorAll('#time-waterfall-staggered rect')
      );
      const waterfallWidths = new Set(waterfallRects.map((r) => r.getAttribute('width')));

      // In waterfall mode, bars are narrowed by the series count...
      const normalWidth = Number([...normalWidths][0]);
      const waterfallWidth = Number([...waterfallWidths][0]);
      expect(waterfallWidth).toBeCloseTo(normalWidth / timeSeriesArgs.y.length, 6);

      // ...and each series steps one sub-bar to the right within the slot,
      // starting from the same left edge the un-staggered bar would have.
      const firstRowXs = [0, 1, 2].map((i) =>
        Number(
          waterfallRects[i * evenlySpacedTimeData.length]?.getAttribute('x')
        )
      );
      expect(firstRowXs[0]).toBeCloseTo(
        Number([...normalXsForFirstRow][0]),
        6
      );
      expect(firstRowXs[1] - firstRowXs[0]).toBeCloseTo(waterfallWidth, 6);
      expect(firstRowXs[2] - firstRowXs[1]).toBeCloseTo(waterfallWidth, 6);
    });

    it('uses explicit barWidth in waterfall + time mode', () => {
      const explicitBarWidth = 25;
      render(
        <ColumnChartStacked
          id='time-waterfall-explicit-width'
          data={evenlySpacedTimeData}
          style={chartStyle}
          {...timeSeriesArgs}
          waterfall
          x={{
            ...timeSeriesArgs.x,
            time: { isISO: true, barWidth: explicitBarWidth },
          }}
        />
      );

      const svg = document.getElementById('time-waterfall-explicit-width');
      const rects = Array.from(svg?.querySelectorAll('rect') ?? []);
      expect(rects.length).toBe(
        evenlySpacedTimeData.length * timeSeriesArgs.y.length
      );

      // Waterfall subdivides the explicit width by the series count; with no
      // `waterfall.padding` configured the division is exact.
      const expectedWaterfallWidth = explicitBarWidth / timeSeriesArgs.y.length;
      for (const rect of rects) {
        expect(Number(rect.getAttribute('width'))).toBeCloseTo(
          expectedWaterfallWidth,
          6
        );
      }
    });

    it('maintains waterfall staggering in non-time mode', () => {
      // Verify waterfall still staggers properly in non-time mode
      render(
        <ColumnChartStacked
          id='waterfall-non-time'
          data={evenlySpacedTimeData}
          style={chartStyle}
          x={{ key: 'date' }}
          y={timeSeriesArgs.y}
          waterfall
        />
      );

      const svg = document.getElementById('waterfall-non-time');
      expect(svg).toBeTruthy();

      const rects = Array.from(svg?.querySelectorAll('rect') ?? []);
      expect(rects.length).toBe(
        evenlySpacedTimeData.length * timeSeriesArgs.y.length
      );

      // The scaleBand path is untouched by the time-mode change: bars stay
      // inside the plot area and each series still steps one sub-band right.
      for (const rect of rects) {
        const x = Number(rect.getAttribute('x'));
        const width = Number(rect.getAttribute('width'));
        expect(x).toBeGreaterThanOrEqual(RANGE_START);
        expect(x + width).toBeLessThanOrEqual(RANGE_END + 1e-6);
        expect(width).toBeGreaterThan(0);
      }

      const firstRowXs = [0, 1, 2].map((i) =>
        Number(rects[i * evenlySpacedTimeData.length]?.getAttribute('x'))
      );
      const subBandWidth = Number(rects[0].getAttribute('width'));
      expect(firstRowXs[1] - firstRowXs[0]).toBeCloseTo(subBandWidth, 6);
      expect(firstRowXs[2] - firstRowXs[1]).toBeCloseTo(subBandWidth, 6);
    });

    it('integrates with custom paddingBar in time mode', () => {
      const paddingBar = 0.4;
      render(
        <ColumnChartStacked
          id='time-custom-padding'
          data={evenlySpacedTimeData}
          style={chartStyle}
          {...timeSeriesArgs}
          paddingBar={paddingBar}
        />
      );

      const svg = document.getElementById('time-custom-padding');
      expect(svg).toBeTruthy();

      // paddingBar thins the inferred width; it is the only thing that
      // changes, so assert the narrowed width rather than mere presence.
      const rects = Array.from(svg?.querySelectorAll('rect') ?? []);
      expect(rects.length).toBe(
        evenlySpacedTimeData.length * timeSeriesArgs.y.length
      );
      const domainSpan = spanMs(evenlySpacedTimeData);
      const cadence = domainSpan / (evenlySpacedTimeData.length - 1);
      const narrowed = expectedBarWidth(cadence, domainSpan, paddingBar);
      expect(narrowed).toBeLessThan(expectedBarWidth(cadence, domainSpan));
      for (const rect of rects) {
        expect(Number(rect.getAttribute('width'))).toBeCloseTo(narrowed, 6);
      }
    });

    it('bars are centred on their axis ticks within 1px', () => {
      const utcDaily = [1, 2, 3, 4, 5].map((d) => ({
        date: new Date(Date.UTC(2025, 0, d)).toISOString(),
        iphone: 10 * d,
        macbook: 5,
        services: 2,
      }));
      render(
        <ColumnChartStacked
          id='time-stacked-ticks'
          data={utcDaily}
          style={chartStyle}
          {...timeSeriesArgs}
          x={{ key: 'date', scalingFunction: 'time', time: { isISO: true, utc: true } }}
        />
      );

      const svg = document.getElementById('time-stacked-ticks')!;
      const ticks = new Map(
        Array.from(svg.querySelectorAll('.axis--x .tick')).map((t) => [
          (t as unknown as { __data__: Date }).__data__.getTime(),
          Number(/translate\(([-\d.]+)/.exec(t.getAttribute('transform') || '')![1]) - 0.5,
        ])
      );
      const rects = Array.from(svg.querySelectorAll('rect')).slice(0, utcDaily.length);
      let matched = 0;
      utcDaily.forEach((row, i) => {
        const tickX = ticks.get(Date.parse(row.date));
        if (tickX === undefined) return;
        matched++;
        const centre =
          Number(rects[i].getAttribute('x')) + Number(rects[i].getAttribute('width')) / 2;
        expect(Math.abs(centre - tickX)).toBeLessThanOrEqual(1);
      });
      expect(matched).toBeGreaterThanOrEqual(2);
    });

    it.each([2, 3, 4, 5])(
      'N=%i evenly spaced dates: stacks do not overlap and stay inside the plot',
      (n) => {
        const rows = evenlySpacedTimeData
          .concat([{ date: '2024-12-31T23:59:59.000Z', iphone: 1, macbook: 1, services: 1 }])
          .slice(0, n);
        render(
          <ColumnChartStacked
            id={`time-stacked-overlap-${n}`}
            data={rows}
            style={chartStyle}
            {...timeSeriesArgs}
          />
        );

        // Years are 365 or 366 days, so the slot is the plot over (steps + 1)
        // with steps = span / median gap — about n, not exactly.
        const first = Array.from(
          document.getElementById(`time-stacked-overlap-${n}`)!.querySelectorAll('rect')
        ).slice(0, n);
        const lefts = first.map((r) => Number(r.getAttribute('x')));
        const widths = first.map((r) => Number(r.getAttribute('width')));
        const slot = widths[0] / (1 - DEFAULT_PADDING_BAR);
        for (let i = 1; i < n; i++) {
          const gap = lefts[i] - (lefts[i - 1] + widths[i - 1]);
          expect(gap).toBeGreaterThanOrEqual(slot * DEFAULT_PADDING_BAR - 1e-6);
        }
        expect(lefts[0]).toBeGreaterThanOrEqual(RANGE_START - 1e-6);
        expect(lefts[n - 1] + widths[n - 1]).toBeLessThanOrEqual(RANGE_END + 1e-6);
      }
    );

    it('caps an explicit barWidth at one slot', () => {
      render(
        <ColumnChartStacked
          id='time-stacked-wide'
          data={evenlySpacedTimeData}
          style={chartStyle}
          {...timeSeriesArgs}
          x={{ ...timeSeriesArgs.x, time: { isISO: true, barWidth: 10_000 } }}
        />
      );

      // 4 yearly dates -> 4 slots of 130px.
      document
        .querySelectorAll('#time-stacked-wide rect')
        .forEach((r) => expect(Number(r.getAttribute('width'))).toBeCloseTo(130, 6));
    });

    it('clamps waterfall bar width at 0 when waterfall.padding exceeds it (F4)', () => {
      render(
        <ColumnChartStacked
          id='time-stacked-waterfall-clamp'
          data={evenlySpacedTimeData}
          style={chartStyle}
          {...timeSeriesArgs}
          // The prop is typed boolean, but the component also reads an object's
          // `padding` (pre-existing, @ts-ignore'd in the component).
          waterfall={{ padding: 500 } as unknown as boolean}
        />
      );

      const widths = Array.from(
        document.querySelectorAll('#time-stacked-waterfall-clamp rect')
      ).map((r) => Number(r.getAttribute('width')));
      expect(widths.length).toBeGreaterThan(0);
      widths.forEach((w) => expect(w).toBe(0));
    });

    it('drops rows whose date cannot be read, with a dev warning (F6)', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      render(
        <ColumnChartStacked
          id='time-stacked-dropped'
          data={[
            ...evenlySpacedTimeData,
            { date: 'garbage', iphone: 1e6, macbook: 1, services: 1 },
          ]}
          style={chartStyle}
          {...timeSeriesArgs}
        />
      );

      const rects = Array.from(document.querySelectorAll('#time-stacked-dropped rect'));
      expect(rects).toHaveLength(evenlySpacedTimeData.length * timeSeriesArgs.y.length);
      rects.forEach((r) => expect(Number.isFinite(Number(r.getAttribute('x')))).toBe(true));
      expect(
        warn.mock.calls.some(([m]) =>
          String(m).includes('ColumnChartStacked#time-stacked-dropped: 1 row(s)')
        )
      ).toBe(true);
      warn.mockRestore();
    });

    it('renders with both explicit barWidth and custom paddingBar (barWidth takes precedence)', () => {
      const explicitBarWidth = 35;
      render(
        <ColumnChartStacked
          id='time-bar-width-priority'
          data={evenlySpacedTimeData}
          style={chartStyle}
          {...timeSeriesArgs}
          paddingBar={0.5}
          x={{
            ...timeSeriesArgs.x,
            time: { isISO: true, barWidth: explicitBarWidth },
          }}
        />
      );

      const svg = document.getElementById('time-bar-width-priority');
      const rects = Array.from(svg?.querySelectorAll('rect') ?? []);
      expect(rects.length).toBe(
        evenlySpacedTimeData.length * timeSeriesArgs.y.length
      );

      // Explicit barWidth is used verbatim — paddingBar 0.5 would otherwise
      // have halved it, so an exact match proves the override short-circuits
      // the inference path entirely.
      for (const rect of rects) {
        expect(Number(rect.getAttribute('width'))).toBeCloseTo(
          explicitBarWidth,
          6
        );
      }
    });
  });
});

describe('ColumnChartStacked time mode keeps edge marks inside the plot (#16)', () => {
  // Explicit size so JSDOM gives d3 a real range: [margin.left, width -
  // margin.right] = [40, 460] with the default margins.
  const CHART_SIZE = { width: '500px', height: '300px' };
  const RANGE_START = 40;
  const RANGE_END = 460;
  // Uneven gaps, and the first/last rows sit exactly on the domain ends,
  // which is where an un-inset centered mark would overhang the axis.
  const edgeData = [
    { date: '2025-01-01', a: 10, b: 5 },
    { date: '2025-01-02', a: 20, b: 6 },
    { date: '2025-01-05', a: 15, b: 7 },
    { date: '2025-01-06', a: 12, b: 8 },
  ];

  // d3-axis draws the domain line as `M{start}.5,6V0.5H{end}.5V6`.
  const xAxisSpan = (container: HTMLElement) => {
    const d = container.querySelector('.axis--x path.domain')?.getAttribute('d') ?? '';
    const match = /^M(-?[\d.]+),[\d.-]+V[\d.-]+H(-?[\d.]+)/.exec(d);
    return match ? [Number(match[1]), Number(match[2])] : [NaN, NaN];
  };

  it('every bar lies within the x range while the axis still spans it fully', () => {
    const { container } = render(<ColumnChartStacked id='edge-stacked' style={CHART_SIZE} data={edgeData} x={{ key: 'date', scalingFunction: 'time' }} y={[{ key: 'a' }, { key: 'b' }]} />);

    const rects = Array.from(container.querySelectorAll('rect'));
    expect(rects.length).toBeGreaterThan(0);
    const lefts = rects.map((r) => Number(r.getAttribute('x')));
    const rights = rects.map(
      (r) => Number(r.getAttribute('x')) + Number(r.getAttribute('width'))
    );
    expect(Math.min(...lefts)).toBeGreaterThanOrEqual(RANGE_START - 1e-6);
    expect(Math.max(...rights)).toBeLessThanOrEqual(RANGE_END + 1e-6);
    // Jan 1 -> Jan 6 at a 1-day cadence is 5 steps = 6 slots of 70px; bars
    // are 56px, so each edge bar keeps half the 14px padding gap (7px).
    expect(Math.min(...lefts)).toBeCloseTo(RANGE_START + 7, 6);
    expect(Math.max(...rights)).toBeCloseTo(RANGE_END - 7, 6);

    const [axisStart, axisEnd] = xAxisSpan(container);
    expect(axisStart).toBeCloseTo(RANGE_START + 0.5, 6);
    expect(axisEnd).toBeCloseTo(RANGE_END + 0.5, 6);
  });
});

describe('ColumnChartStacked time mode with x.start / x.end pinned (review-2 N2)', () => {
  // Explicit size so JSDOM gives d3 a real range: [40, 460].
  const CHART_SIZE = { width: '500px', height: '300px' };
  const RANGE_START = 40;
  const RANGE_END = 460;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const days = [1, 2, 3, 4, 5].map((d) => Date.UTC(2025, 0, d));
  const rows = days.map((t, i) => ({ date: new Date(t).toISOString().slice(0, 10), ...({ a: 10 + i }) }));
// Date-keyed x of each rendered x-axis tick, read from the tick <g> transform
  // and d3's bound datum. d3-axis adds a 0.5px crisp-edge offset.
  const pinnedTickXs = (container: HTMLElement) =>
    new Map(
      Array.from(container.querySelectorAll('.axis--x .tick')).map((t) => [
        (t as unknown as { __data__: Date }).__data__.getTime(),
        Number(/translate\(([-\d.]+)/.exec(t.getAttribute('transform') || '')![1]) - 0.5,
      ])
    );

  const marksOf = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('rect')).map((r) => ({
      left: Number(r.getAttribute('x')),
      width: Number(r.getAttribute('width')),
    }));

  it('pinned half a day outside the data: marks on their ticks, no overhang, correct width', () => {
    const { container } = render(
      <ColumnChartStacked
        id='stacked-pinned-pad'
        style={CHART_SIZE}
        data={rows}
        x={{
          key: 'date',
          scalingFunction: 'time',
          start: days[0] - DAY_MS / 2,
          end: days[4] + DAY_MS / 2,
          time: { isISO: true, utc: true },
        }}
        y={[{ key: 'a' }]}
      />
    );

    // 5 steps between the pins and no padded ends: 5 slots of 84px
    const slot = (RANGE_END - RANGE_START) / 5;
    const marks = marksOf(container);
    expect(marks).toHaveLength(5);
    const ticks = pinnedTickXs(container);
    marks.forEach((m, i) => {
      expect(m.width).toBeCloseTo(slot * 0.8, 6);
      const centre = m.left + m.width / 2;
      expect(centre).toBeCloseTo(RANGE_START + slot / 2 + slot * i, 6);
      const tick = ticks.get(days[i]);
      expect(tick).toBeDefined();
      expect(Math.abs(centre - tick!)).toBeLessThanOrEqual(1);
    });
    expect(Math.min(...marks.map((m) => m.left))).toBeGreaterThanOrEqual(RANGE_START - 1e-6);
    expect(Math.max(...marks.map((m) => m.left + m.width))).toBeLessThanOrEqual(RANGE_END + 1e-6);
  });

  it('pinned at the first/last date: width follows the real tick spacing', () => {
    const { container } = render(
      <ColumnChartStacked
        id='stacked-pinned-ends'
        style={CHART_SIZE}
        data={rows}
        x={{
          key: 'date',
          scalingFunction: 'time',
          start: days[0],
          end: days[4],
          time: { isISO: true, utc: true },
        }}
        y={[{ key: 'a' }]}
      />
    );

    // 4 steps, no padded ends: spacing = range / 4; bars are 80% of it
    const spacing = (RANGE_END - RANGE_START) / 4;
    const marks = marksOf(container);
    expect(marks).toHaveLength(5);
    marks.forEach((m, i) => {
      expect(m.width).toBeCloseTo(spacing * 0.8, 6);
      expect(m.left + m.width / 2).toBeCloseTo(RANGE_START + spacing * i, 6);
    });
  });
});
