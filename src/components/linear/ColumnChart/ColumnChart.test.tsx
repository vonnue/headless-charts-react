import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import ColumnChart from '.';
import data from './sample.json';

describe('ColumnChart', () => {
  const defaultArgs = {
    id: 'column-chart',
    data,
    x: { key: 'year' },
    y: [
      { key: 'iphone', className: 'text-blue-500' },
      { key: 'macbook', className: 'text-green-500' },
    ],
  };

  it('renders an SVG element with correct test id', () => {
    render(<ColumnChart {...defaultArgs} />);

    const svg = document.getElementById('column-chart');
    expect(svg).toBeTruthy();
    expect(svg?.tagName).toBe('svg');
  });

  it('renders rect elements for data bars', () => {
    render(<ColumnChart {...defaultArgs} />);

    const svg = document.getElementById('column-chart');
    const rects = svg?.querySelectorAll('rect');
    // Should have bars for each data point * each Y series
    expect(rects?.length).toBeGreaterThanOrEqual(data.length);
  });

  it('renders with a single Y series', () => {
    render(
      <ColumnChart
        {...defaultArgs}
        id='column-single'
        y={[{ key: 'iphone' }]}
      />
    );

    const svg = document.getElementById('column-single');
    expect(svg).toBeTruthy();
  });

  it('renders with custom padding and margin', () => {
    render(
      <ColumnChart
        {...defaultArgs}
        id='column-padded'
        padding={{ top: 10, right: 10, bottom: 10, left: 10, bar: 0.2 }}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      />
    );

    const svg = document.getElementById('column-padded');
    expect(svg).toBeTruthy();
  });

  it('renders with reference lines', () => {
    render(
      <ColumnChart
        {...defaultArgs}
        id='column-refs'
        referenceLines={[{ y: 100, className: 'text-red-500' }]}
      />
    );

    const svg = document.getElementById('column-refs');
    const lines = svg?.querySelectorAll('line');
    expect(lines?.length).toBeGreaterThanOrEqual(1);
  });

  it('renders axes', () => {
    render(
      <ColumnChart
        {...defaultArgs}
        id='column-axes'
        x={{ key: 'year', axis: { location: 'bottom', ticks: 5 } }}
      />
    );

    const svg = document.getElementById('column-axes');
    const xAxis = svg?.querySelector('[data-testid="x-axis"]');
    expect(xAxis).toBeTruthy();
  });

  it('renders with className on the SVG', () => {
    render(
      <ColumnChart {...defaultArgs} id='column-class' className='bg-white' />
    );

    const svg = document.getElementById('column-class');
    expect(svg).toBeTruthy();
  });

  it('handles empty data gracefully', () => {
    render(<ColumnChart {...defaultArgs} id='column-empty' data={[]} />);

    const svg = document.getElementById('column-empty');
    expect(svg).toBeTruthy();
  });

  describe('Time Scaling (x.scalingFunction: "time")', () => {
    // JSDOM performs no layout, so `svg.style('width')` reads '' and the chart
    // computes width/height = 0. That makes the x range [40, -40] — inverted
    // and negative — which drives every inferred bar width negative and lands
    // it on the `Math.max(1, ...)` floor. Every width/position assertion below
    // would then pass against a constant 1px bar and never exercise the
    // cadence-inference algorithm at all. Passing an explicit inline size
    // (the component forwards `style` straight onto the <svg>) gives d3 a real
    // range to work with: [margin.left, width - margin.right] = [40, 460].
    const CHART_SIZE = { width: '500px', height: '300px' };
    const RANGE_START = 40;
    const RANGE_END = 460;
    const RANGE_SPAN = RANGE_END - RANGE_START;
    const DEFAULT_PADDING_BAR = 0.2;

    const timeSeriesData = [
      { date: '2025-01-01', iphone: 100, macbook: 80 },
      { date: '2025-01-02', iphone: 120, macbook: 90 },
      { date: '2025-01-03', iphone: 110, macbook: 85 },
      { date: '2025-01-04', iphone: 130, macbook: 95 },
      { date: '2025-01-05', iphone: 140, macbook: 100 },
    ];

    const timeSeriesDataISO = timeSeriesData.map((d) => ({
      ...d,
      date: d.date + 'T00:00:00.000Z',
    }));

    const sparseTimeSeriesData = [
      { date: '2025-01-01', iphone: 100, macbook: 80 },
      { date: '2025-01-02', iphone: 120, macbook: 90 },
      // Gap: skip 2025-01-03 and 2025-01-04
      { date: '2025-01-05', iphone: 140, macbook: 100 },
      { date: '2025-01-06', iphone: 150, macbook: 105 },
    ];

    // Day gaps: 1, 1, 3, 3, 3. Median = 3d, mean = 2.2d, min = 1d — all three
    // distinct, so a width derived from this data can tell the three apart.
    const medianProbeData = [
      { date: '2025-01-01', iphone: 100 },
      { date: '2025-01-02', iphone: 110 },
      { date: '2025-01-03', iphone: 120 },
      { date: '2025-01-06', iphone: 130 },
      { date: '2025-01-09', iphone: 140 },
      { date: '2025-01-12', iphone: 150 },
    ];

    const widthsOf = (svgId: string) =>
      Array.from(document.getElementById(svgId)!.querySelectorAll('rect')).map(
        (r) => parseFloat(r.getAttribute('width') || '0')
      );

    const centersOf = (svgId: string) =>
      Array.from(document.getElementById(svgId)!.querySelectorAll('rect')).map(
        (r) =>
          parseFloat(r.getAttribute('x') || '0') +
          parseFloat(r.getAttribute('width') || '0') / 2
      );

    it('renders time-scaled chart with ISO date format', () => {
      render(
        <ColumnChart
          id='time-column-iso'
          style={CHART_SIZE}
          data={timeSeriesDataISO}
          x={{
            key: 'date',
            scalingFunction: 'time',
            time: { isISO: true },
          }}
          y={[
            { key: 'iphone', className: 'fill-blue-500' },
            { key: 'macbook', className: 'fill-green-500' },
          ]}
        />
      );

      const svg = document.getElementById('time-column-iso');
      expect(svg).toBeTruthy();
      expect(svg?.tagName).toBe('svg');

      // Should render bars for time series data
      const rects = svg?.querySelectorAll('rect');
      expect(rects?.length).toBeGreaterThan(0);
    });

    it('renders time-scaled chart with custom date format', () => {
      render(
        <ColumnChart
          id='time-column-format'
          style={CHART_SIZE}
          data={timeSeriesData}
          x={{
            key: 'date',
            scalingFunction: 'time',
            time: { format: '%Y-%m-%d' },
          }}
          y={[
            { key: 'iphone', className: 'fill-blue-500' },
            { key: 'macbook', className: 'fill-green-500' },
          ]}
        />
      );

      const svg = document.getElementById('time-column-format');
      expect(svg).toBeTruthy();

      const rects = svg?.querySelectorAll('rect');
      expect(rects?.length).toBeGreaterThan(0);
    });

    it('infers bar width from the data cadence, less paddingBar', () => {
      render(
        <ColumnChart
          id='time-column-widths'
          style={CHART_SIZE}
          data={timeSeriesDataISO}
          x={{
            key: 'date',
            scalingFunction: 'time',
            time: { isISO: true },
          }}
          y={[{ key: 'iphone', className: 'fill-blue-500' }]}
        />
      );

      // 5 points one day apart spanning a 4-day domain across a 420px range
      // => one day is 105px, and a bar takes (1 - paddingBar) of that slot.
      const slotWidthPx = RANGE_SPAN / 4;
      const expectedWidth = slotWidthPx * (1 - DEFAULT_PADDING_BAR);

      const widths = widthsOf('time-column-widths');
      expect(widths).toHaveLength(timeSeriesDataISO.length);
      // Pin the actual value, not just `> 0` — a bare positivity check is
      // satisfied by the `Math.max(1, ...)` floor and would not notice the
      // cadence inference being broken or removed.
      widths.forEach((width) => expect(width).toBeCloseTo(expectedWidth, 6));
      expect(expectedWidth).toBeGreaterThan(1);
    });

    it('positions bars with correct x coordinate based on time scale', () => {
      render(
        <ColumnChart
          id='time-column-positions'
          style={CHART_SIZE}
          data={timeSeriesDataISO}
          x={{
            key: 'date',
            scalingFunction: 'time',
            time: { isISO: true },
          }}
          y={[{ key: 'iphone', className: 'fill-blue-500' }]}
        />
      );

      // Each bar is centered on its own date. Bars are centered marks, so a
      // bar at the domain start/end would overhang the range edge by half
      // its width; the component insets the usable range by half a bar
      // width on each side to prevent that (see #16), which is why the day
      // spacing here is computed from the *inset* span, not the raw one.
      const expectedWidth = (RANGE_SPAN / 4) * (1 - DEFAULT_PADDING_BAR);
      const inset = expectedWidth / 2;
      const insetStart = RANGE_START + inset;
      const dayPx = (RANGE_SPAN - expectedWidth) / 4;

      const centers = centersOf('time-column-positions');
      const expectedCenters = [0, 1, 2, 3, 4].map(
        (i) => insetStart + i * dayPx
      );

      expect(centers).toHaveLength(timeSeriesDataISO.length);
      centers.forEach((center, i) =>
        expect(center).toBeCloseTo(expectedCenters[i], 6)
      );

      // With the inset applied, the first bar's left edge lands exactly on
      // the original range start rather than overhanging it — confirms the
      // #16 fix rather than the old (buggy) "just clamp to >= 0" approach.
      const firstX = parseFloat(
        document
          .getElementById('time-column-positions')!
          .querySelector('rect')!
          .getAttribute('x') || '0'
      );
      expect(firstX).toBeCloseTo(RANGE_START, 6);
    });

    it('evenly-spaced dates produce equal bar widths', () => {
      render(
        <ColumnChart
          id='time-column-even'
          style={CHART_SIZE}
          data={timeSeriesDataISO}
          x={{
            key: 'date',
            scalingFunction: 'time',
            time: { isISO: true },
          }}
          y={[{ key: 'iphone', className: 'fill-blue-500' }]}
        />
      );

      const svg = document.getElementById('time-column-even');
      const rects = svg?.querySelectorAll('rect');

      // With evenly-spaced dates (1 day apart), all bars should have same width
      const widths: number[] = [];
      rects?.forEach((rect) => {
        const width = parseFloat(rect.getAttribute('width') || '0');
        widths.push(width);
      });

      // All widths should be approximately equal (within floating point precision)
      const firstWidth = widths[0];
      widths.forEach((width) => {
        expect(Math.abs(width - firstWidth)).toBeLessThan(0.1);
      });
    });

    it('derives bar width from the median gap, not the mean or the minimum', () => {
      render(
        <ColumnChart
          id='time-column-median'
          style={CHART_SIZE}
          data={medianProbeData}
          x={{
            key: 'date',
            scalingFunction: 'time',
            time: { format: '%Y-%m-%d' },
          }}
          y={[{ key: 'iphone', className: 'fill-blue-500' }]}
        />
      );

      // Domain spans 11 days (Jan 1 -> Jan 12) across a 420px range.
      const dayPx = RANGE_SPAN / 11;
      const widthFor = (gapDays: number) =>
        gapDays * dayPx * (1 - DEFAULT_PADDING_BAR);

      const widths = widthsOf('time-column-median');
      expect(widths).toHaveLength(medianProbeData.length);

      // Gaps are 1,1,3,3,3 days -> median 3d. Mean (2.2d) and min (1d) both
      // give materially different widths, so this distinguishes all three.
      widths.forEach((width) => expect(width).toBeCloseTo(widthFor(3), 6));
      expect(widths[0]).not.toBeCloseTo(widthFor(2.2), 1); // not the mean
      expect(widths[0]).not.toBeCloseTo(widthFor(1), 1); // not the minimum
    });

    it('unevenly-spaced dates produce visible gap', () => {
      render(
        <ColumnChart
          id='time-column-sparse'
          style={CHART_SIZE}
          data={sparseTimeSeriesData}
          x={{
            key: 'date',
            scalingFunction: 'time',
            time: { format: '%Y-%m-%d' },
          }}
          y={[{ key: 'iphone', className: 'fill-blue-500' }]}
        />
      );

      const svg = document.getElementById('time-column-sparse');
      const rects = svg?.querySelectorAll('rect');

      expect(rects?.length).toBeGreaterThan(0);

      // Extract x positions to check spacing
      const xPositions: number[] = [];
      rects?.forEach((rect) => {
        const x = parseFloat(rect.getAttribute('x') || '0');
        const width = parseFloat(rect.getAttribute('width') || '0');
        const centerX = x + width / 2;
        xPositions.push(centerX);
      });

      // Should have 4 bars
      expect(xPositions.length).toBe(4);

      // Gaps between consecutive bars at indices 1-2 should be larger than others
      // (since we skipped 2 days between bar 2 and bar 3)
      const gap01 = Math.abs(xPositions[1] - xPositions[0]);
      const gap12 = Math.abs(xPositions[2] - xPositions[1]);
      const gap23 = Math.abs(xPositions[3] - xPositions[2]);

      // The gap at the sparse point (12) should be larger than adjacent gaps,
      // and specifically 3x — the whitespace is proportional to elapsed time
      // (3 days vs 1), which is the entire point of time scaling.
      expect(gap12).toBeGreaterThan(gap01);
      expect(gap12).toBeGreaterThan(gap23);
      expect(gap12).toBeCloseTo(gap01 * 3, 6);
      expect(gap01).toBeCloseTo(gap23, 6);
    });

    it('explicit barWidth prop overrides inferred width', () => {
      const explicitWidth = 25;

      render(
        <ColumnChart
          id='time-column-explicit-width'
          style={CHART_SIZE}
          data={timeSeriesDataISO}
          x={{
            key: 'date',
            scalingFunction: 'time',
            time: { isISO: true, barWidth: explicitWidth },
          }}
          y={[{ key: 'iphone', className: 'fill-blue-500' }]}
        />
      );

      const svg = document.getElementById('time-column-explicit-width');
      const rects = svg?.querySelectorAll('rect');

      // All bars should have width equal to explicitWidth
      rects?.forEach((rect) => {
        const width = parseFloat(rect.getAttribute('width') || '0');
        expect(Math.abs(width - explicitWidth)).toBeLessThan(0.1);
      });
    });

    it('explicit barWidth ignores paddingBar setting', () => {
      const explicitWidth = 30;
      const paddingBar = 0.5; // Large padding that would normally reduce width

      render(
        <ColumnChart
          id='time-column-width-no-padding'
          style={CHART_SIZE}
          data={timeSeriesDataISO}
          x={{
            key: 'date',
            scalingFunction: 'time',
            time: { isISO: true, barWidth: explicitWidth },
          }}
          y={[{ key: 'iphone', className: 'fill-blue-500' }]}
          paddingBar={paddingBar}
        />
      );

      const svg = document.getElementById('time-column-width-no-padding');
      const rects = svg?.querySelectorAll('rect');

      // Despite high paddingBar, bars should still have the explicit width
      rects?.forEach((rect) => {
        const width = parseFloat(rect.getAttribute('width') || '0');
        expect(Math.abs(width - explicitWidth)).toBeLessThan(0.1);
      });
    });

    it('single data point does not throw and produces positive width', () => {
      const singlePointData = [{ date: '2025-01-01T00:00:00.000Z', iphone: 100, macbook: 80 }];

      render(
        <ColumnChart
          id='time-column-single'
          style={CHART_SIZE}
          data={singlePointData}
          x={{
            key: 'date',
            scalingFunction: 'time',
            time: { isISO: true },
          }}
          y={[{ key: 'iphone', className: 'fill-blue-500' }]}
        />
      );

      expect(document.getElementById('time-column-single')).toBeTruthy();

      // No cadence can be inferred from one timestamp, so the fallback splits
      // the whole plotting width across the rows: 420 / 1, less paddingBar.
      const widths = widthsOf('time-column-single');
      expect(widths).toHaveLength(1);
      expect(widths[0]).toBeCloseTo(RANGE_SPAN * (1 - DEFAULT_PADDING_BAR), 6);
    });

    it('all identical timestamps do not produce zero width', () => {
      const identicalDatesData = [
        { date: '2025-01-01T00:00:00.000Z', iphone: 100, macbook: 80 },
        { date: '2025-01-01T00:00:00.000Z', iphone: 110, macbook: 85 },
        { date: '2025-01-01T00:00:00.000Z', iphone: 120, macbook: 90 },
      ];

      render(
        <ColumnChart
          id='time-column-identical'
          style={CHART_SIZE}
          data={identicalDatesData}
          x={{
            key: 'date',
            scalingFunction: 'time',
            time: { isISO: true },
          }}
          y={[{ key: 'iphone', className: 'fill-blue-500' }]}
        />
      );

      expect(document.getElementById('time-column-identical')).toBeTruthy();

      // Deduplicating the timestamps leaves one unique value, so there is
      // still no cadence: the fallback splits the plotting width across the
      // 3 rows. Asserting the value (not just `> 0`) is what proves the
      // duplicate timestamps did not collapse the cadence to ~0 and land on
      // the `Math.max(1, ...)` floor.
      const widths = widthsOf('time-column-identical');
      expect(widths).toHaveLength(3);
      widths.forEach((width) =>
        expect(width).toBeCloseTo((RANGE_SPAN / 3) * (1 - DEFAULT_PADDING_BAR), 6)
      );
    });

    it('deduplicates repeated timestamps before inferring cadence', () => {
      // Three rows share Jan 1. Without deduplication the gap list would be
      // [0, 0, 1d, 1d] and the median would collapse to half a day, halving
      // every bar. Deduplicating first leaves gaps of [1d, 1d].
      const duplicateDatesData = [
        { date: '2025-01-01T00:00:00.000Z', iphone: 100 },
        { date: '2025-01-01T00:00:00.000Z', iphone: 105 },
        { date: '2025-01-01T00:00:00.000Z', iphone: 110 },
        { date: '2025-01-02T00:00:00.000Z', iphone: 120 },
        { date: '2025-01-03T00:00:00.000Z', iphone: 130 },
      ];

      render(
        <ColumnChart
          id='time-column-dupes'
          style={CHART_SIZE}
          data={duplicateDatesData}
          x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
          y={[{ key: 'iphone', className: 'fill-blue-500' }]}
        />
      );

      // Domain spans 2 days across 420px => one day is 210px.
      const dayPx = RANGE_SPAN / 2;
      const widths = widthsOf('time-column-dupes');
      expect(widths).toHaveLength(duplicateDatesData.length);
      widths.forEach((width) =>
        expect(width).toBeCloseTo(dayPx * (1 - DEFAULT_PADDING_BAR), 6)
      );
    });

    it('non-time mode still works (regression test)', () => {
      render(
        <ColumnChart
          id='column-non-time'
          data={defaultArgs.data}
          x={{ key: 'year' }}
          y={[
            { key: 'iphone', className: 'text-blue-500' },
            { key: 'macbook', className: 'text-green-500' },
          ]}
        />
      );

      const svg = document.getElementById('column-non-time');
      expect(svg).toBeTruthy();

      const rects = svg?.querySelectorAll('rect');
      expect(rects?.length).toBeGreaterThanOrEqual(defaultArgs.data.length);
    });

    it('binning is ignored when x.scalingFunction is time', () => {
      // When x.bin is set but x.scalingFunction is 'time', binning should be disabled
      render(
        <ColumnChart
          id='time-column-no-bin'
          style={CHART_SIZE}
          data={timeSeriesDataISO}
          x={{
            key: 'date',
            scalingFunction: 'time',
            time: { isISO: true },
            bin: { count: 5 }, // Should be ignored in time mode
          }}
          y={[
            { key: 'iphone', className: 'fill-blue-500' },
            { key: 'macbook', className: 'fill-green-500' },
          ]}
        />
      );

      const svg = document.getElementById('time-column-no-bin');
      expect(svg).toBeTruthy();

      // If binning had won, `bin1D` would collapse the rows into `count`
      // bins rendered as a single synthetic `count` series. Asserting the
      // exact bar count (rows x series) is what proves the guard held —
      // `> 0` would pass either way.
      const rects = svg!.querySelectorAll('rect');
      expect(rects.length).toBe(timeSeriesDataISO.length * 2);

      // ...and the bars are still time-positioned, not band-positioned.
      const widths = widthsOf('time-column-no-bin');
      widths.forEach((width) =>
        expect(width).toBeCloseTo(((RANGE_SPAN / 4) * (1 - DEFAULT_PADDING_BAR)) / 2, 6)
      );
    });

    it('multiple y series in time mode spreads bars horizontally', () => {
      render(
        <ColumnChart
          id='time-column-multi-series'
          style={CHART_SIZE}
          data={timeSeriesDataISO}
          x={{
            key: 'date',
            scalingFunction: 'time',
            time: { isISO: true },
          }}
          y={[
            { key: 'iphone', className: 'fill-blue-500' },
            { key: 'macbook', className: 'fill-green-500' },
          ]}
        />
      );

      const rects = Array.from(
        document.getElementById('time-column-multi-series')!.querySelectorAll('rect')
      );
      const xOf = (r: Element) => parseFloat(r.getAttribute('x') || '0');
      const wOf = (r: Element) => parseFloat(r.getAttribute('width') || '0');

      // 5 dates x 2 series = 10 bars. Series are appended one <g> at a time,
      // so rects 0-4 are series 0 and rects 5-9 are series 1.
      expect(rects).toHaveLength(10);

      // Each sub-bar takes 1/n of the group width, and the group is centered
      // on the date. Day spacing is computed from the range as inset by the
      // group's half-width on each side (see #16) — the group width plays
      // the same role here that a single series' bar width does elsewhere.
      const groupWidth = (RANGE_SPAN / 4) * (1 - DEFAULT_PADDING_BAR);
      const subWidth = groupWidth / 2;
      rects.forEach((r) => expect(wOf(r)).toBeCloseTo(subWidth, 6));

      const insetStart = RANGE_START + groupWidth / 2;
      const dayPx = (RANGE_SPAN - groupWidth) / 4;

      for (let i = 0; i < 5; i++) {
        const first = rects[i];
        const second = rects[i + 5];
        const center = insetStart + i * dayPx;

        // Group is centered on the date...
        expect(xOf(first)).toBeCloseTo(center - groupWidth / 2, 6);
        // ...and the second series sits flush beside the first, not on top
        // of it. Asserting the exact offset is what catches the `i * width/n`
        // subdivision term being dropped — bars would then be co-located and
        // a "same rounded x" style check would still pass.
        expect(xOf(second)).toBeCloseTo(xOf(first) + subWidth, 6);
        expect(xOf(second)).not.toBeCloseTo(xOf(first), 1);
      }
    });

    it('default barWidth is undefined when not explicitly set', () => {
      render(
        <ColumnChart
          id='time-column-inferred'
          style={CHART_SIZE}
          data={timeSeriesDataISO}
          x={{
            key: 'date',
            scalingFunction: 'time',
            time: { isISO: true },
            // barWidth not set, should be inferred
          }}
          y={[{ key: 'iphone', className: 'fill-blue-500' }]}
        />
      );

      const svg = document.getElementById('time-column-inferred');
      expect(svg).toBeTruthy();

      // Should still render successfully with inferred width
      const rects = svg?.querySelectorAll('rect');
      expect(rects?.length).toBeGreaterThan(0);

      rects?.forEach((rect) => {
        const width = parseFloat(rect.getAttribute('width') || '0');
        expect(width).toBeGreaterThan(0);
      });
    });

    it('iso and format modes both work for date parsing', () => {
      const formatData = [
        { date: '2025-01-01', iphone: 100, macbook: 80 },
        { date: '2025-01-02', iphone: 120, macbook: 90 },
      ];

      const isoData = [
        { date: '2025-01-01T00:00:00.000Z', iphone: 100, macbook: 80 },
        { date: '2025-01-02T00:00:00.000Z', iphone: 120, macbook: 90 },
      ];

      // Render with format
      render(
        <ColumnChart
          id='time-column-format-mode'
          style={CHART_SIZE}
          data={formatData}
          x={{
            key: 'date',
            scalingFunction: 'time',
            time: { format: '%Y-%m-%d' },
          }}
          y={[{ key: 'iphone', className: 'fill-blue-500' }]}
        />
      );

      const formatSvg = document.getElementById('time-column-format-mode');
      expect(formatSvg).toBeTruthy();
      expect(formatSvg?.querySelectorAll('rect').length).toBeGreaterThan(0);

      // Render with ISO
      render(
        <ColumnChart
          id='time-column-iso-mode'
          style={CHART_SIZE}
          data={isoData}
          x={{
            key: 'date',
            scalingFunction: 'time',
            time: { isISO: true },
          }}
          y={[{ key: 'iphone', className: 'fill-blue-500' }]}
        />
      );

      const isoSvg = document.getElementById('time-column-iso-mode');
      expect(isoSvg).toBeTruthy();
      expect(isoSvg?.querySelectorAll('rect').length).toBeGreaterThan(0);
    });
  });
});

describe('ColumnChart time mode keeps edge marks inside the plot (#16)', () => {
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
    const { container } = render(<ColumnChart id='edge-column' style={CHART_SIZE} data={edgeData} x={{ key: 'date', scalingFunction: 'time' }} y={[{ key: 'a' }, { key: 'b' }]} />);

    const rects = Array.from(container.querySelectorAll('rect'));
    expect(rects.length).toBeGreaterThan(0);
    const lefts = rects.map((r) => Number(r.getAttribute('x')));
    const rights = rects.map(
      (r) => Number(r.getAttribute('x')) + Number(r.getAttribute('width'))
    );
    expect(Math.min(...lefts)).toBeGreaterThanOrEqual(RANGE_START - 1e-6);
    expect(Math.max(...rights)).toBeLessThanOrEqual(RANGE_END + 1e-6);
    // The edge bars are flush with the range ends, not pulled in further.
    expect(Math.min(...lefts)).toBeCloseTo(RANGE_START, 6);
    expect(Math.max(...rights)).toBeCloseTo(RANGE_END, 6);

    const [axisStart, axisEnd] = xAxisSpan(container);
    expect(axisStart).toBeCloseTo(RANGE_START + 0.5, 6);
    expect(axisEnd).toBeCloseTo(RANGE_END + 0.5, 6);
  });
});
