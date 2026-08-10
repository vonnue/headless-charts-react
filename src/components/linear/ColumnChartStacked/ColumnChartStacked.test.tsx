import { describe, expect, it } from 'vitest';
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

    /** Bar width the spec's algorithm should produce for a given cadence. */
    const expectedBarWidth = (
      cadenceMs: number,
      domainSpanMs: number,
      paddingBar = DEFAULT_PADDING_BAR
    ) => (PLOT_WIDTH * (cadenceMs / domainSpanMs)) * (1 - paddingBar);

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

      // Bars are centered marks, so a bar at the domain's min/max would
      // overhang the range edge by half its width; the component insets the
      // usable range by half a bar width on each side to prevent that (see
      // #16), which is why the slot spacing is computed from the *inset*
      // plot width, not the raw one.
      const slot = (PLOT_WIDTH - barWidth) * (cadence / domainSpan);
      const deltas = xPositions.slice(1).map((x, i) => x - xPositions[i]);
      for (const delta of deltas) {
        expect(delta).toBeCloseTo(slot, 6);
      }
      // With the inset applied, the first/last bar's centre lands exactly
      // half a bar width in from the original range edge — confirms the
      // #16 fix rather than the old (buggy) "centre lands on the edge"
      // behaviour that let bars overhang.
      expect(xPositions[0] + barWidth / 2).toBeCloseTo(
        RANGE_START + barWidth / 2,
        6
      );
      expect(
        xPositions[xPositions.length - 1] + barWidth / 2
      ).toBeCloseTo(RANGE_END - barWidth / 2, 6);
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
      // time, and must be proportional to the number of years skipped. The
      // component insets the usable range by half a bar width on each side
      // (see #16), so elapsed time maps to the *inset* plot width, not the
      // raw one.
      const domainSpan = spanMs(unevenlySpacedTimeData);
      const barWidth = positions[0].width;
      const insetPlotWidth = PLOT_WIDTH - barWidth;
      const yearPx = (rows: number) =>
        insetPlotWidth *
        ((new Date(unevenlySpacedTimeData[rows].date).getTime() -
          new Date(unevenlySpacedTimeData[rows - 1].date).getTime()) /
          domainSpan);

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
      // Two equal one-year gaps -> one even step. The component insets the
      // usable range by half a bar width on each side (see #16), so the
      // outer bars' centres land half a bar width in from the range ends,
      // not flush against them.
      expect(xs[1] - xs[0]).toBeCloseTo(xs[2] - xs[1], 6);
      expect(xs[0] + width / 2).toBeCloseTo(RANGE_START + width / 2, 6);
      expect(xs[2] + width / 2).toBeCloseTo(RANGE_END - width / 2, 6);
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

      // The domain is wider than the data, so the first bar is no longer
      // flush against the range start the way it is when the domain is
      // inferred — its centre sits proportionally inside the custom domain.
      // The component also insets the usable range by half a bar width on
      // each side (see #16), so the mapping uses the inset sub-range, not
      // the raw [RANGE_START, RANGE_END].
      const first = rects[0];
      const width = Number(first.getAttribute('width'));
      const centre = Number(first.getAttribute('x')) + width / 2;
      const t0 = new Date(evenlySpacedTimeData[0].date).getTime();
      const insetPlotWidth = PLOT_WIDTH - width;
      expect(centre).toBeCloseTo(
        RANGE_START +
          width / 2 +
          insetPlotWidth * ((t0 - customStart) / (customEnd - customStart)),
        6
      );
      expect(centre).toBeGreaterThan(RANGE_START);
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
