import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';

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

    // Date-keyed x of each rendered x-axis tick, read from the tick <g>
    // transform and d3's bound datum. d3-axis adds a 0.5px crisp-edge offset.
    const tickXs = (svgId: string) =>
      new Map(
        Array.from(
          document.getElementById(svgId)!.querySelectorAll('.axis--x .tick')
        ).map((t) => [
          (t as unknown as { __data__: Date }).__data__.getTime(),
          Number(/translate\(([-\d.]+)/.exec(t.getAttribute('transform') || '')![1]) - 0.5,
        ])
      );

    // 5 daily dates over 420px: steps = 4, so 5 slots of 84px.
    const SLOT_5 = RANGE_SPAN / 5;
    const WIDTH_5 = SLOT_5 * (1 - DEFAULT_PADDING_BAR); // 67.2

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

    it('infers bar width from one slot of the cadence, less paddingBar', () => {
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

      // 5 points one day apart = 4 steps, laid out as 5 slots of 84px; a bar
      // takes (1 - paddingBar) of its slot: 67.2px, leaving a 16.8px gap.
      const widths = widthsOf('time-column-widths');
      expect(widths).toHaveLength(timeSeriesDataISO.length);
      widths.forEach((width) => expect(width).toBeCloseTo(67.2, 6));
      expect(WIDTH_5).toBeCloseTo(67.2, 6);
    });

    it('centres every bar on its date in slot-spaced steps, edges inside the plot', () => {
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

      // Half a slot of domain padding at each end: centres at 82, 166, ... 418.
      const centers = centersOf('time-column-positions');
      expect(centers).toHaveLength(5);
      centers.forEach((center, i) =>
        expect(center).toBeCloseTo(RANGE_START + SLOT_5 / 2 + i * SLOT_5, 6)
      );
      // The edge bars keep half the padding gap to the plot edge.
      expect(centers[0] - WIDTH_5 / 2).toBeCloseTo(RANGE_START + 8.4, 6);
      expect(centers[4] + WIDTH_5 / 2).toBeCloseTo(RANGE_END - 8.4, 6);
    });

    it.each([
      ['UTC ISO instants with x.time.utc', { isISO: true, utc: true }, timeSeriesDataISO],
      ['local-time format strings', { format: '%Y-%m-%d' }, timeSeriesData],
    ])('bars are centred on their axis ticks within 1px (%s)', (_label, time, rows) => {
      render(
        <ColumnChart
          id='time-column-ticks'
          style={CHART_SIZE}
          data={rows}
          x={{ key: 'date', scalingFunction: 'time', time }}
          y={[{ key: 'iphone', className: 'fill-blue-500' }]}
        />
      );

      // Axis and bars share one scale, so a tick on a data date sits under
      // that date's bar.
      const ticks = tickXs('time-column-ticks');
      const centers = centersOf('time-column-ticks');
      const parse = (d: string) =>
        'isISO' in time ? new Date(d).getTime() : new Date(`${d}T00:00:00`).getTime();
      let matched = 0;
      rows.forEach((row, i) => {
        const tickX = ticks.get(parse(row.date));
        if (tickX === undefined) return;
        matched++;
        expect(Math.abs(centers[i] - tickX)).toBeLessThanOrEqual(1);
      });
      expect(matched).toBeGreaterThanOrEqual(2);
    });

    it.each([2, 3, 4, 5])(
      'N=%i evenly spaced dates: bars do not overlap and stay inside the plot',
      (n) => {
        const rows = timeSeriesDataISO.slice(0, n);
        render(
          <ColumnChart
            id={`time-column-overlap-${n}`}
            style={CHART_SIZE}
            data={rows}
            x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
            y={[{ key: 'iphone', className: 'fill-blue-500' }]}
          />
        );

        const slot = RANGE_SPAN / n;
        const rects = Array.from(
          document.getElementById(`time-column-overlap-${n}`)!.querySelectorAll('rect')
        );
        const lefts = rects.map((r) => Number(r.getAttribute('x')));
        const widths = rects.map((r) => Number(r.getAttribute('width')));
        for (let i = 1; i < n; i++) {
          const gap = lefts[i] - (lefts[i - 1] + widths[i - 1]);
          expect(gap).toBeGreaterThanOrEqual(slot * DEFAULT_PADDING_BAR - 1e-6);
        }
        expect(lefts[0]).toBeGreaterThanOrEqual(RANGE_START - 1e-6);
        expect(lefts[n - 1] + widths[n - 1]).toBeLessThanOrEqual(RANGE_END + 1e-6);
        if (n === 2) {
          // 2 slots of 210px: 168px bars, 42px between them.
          expect(widths[0]).toBeCloseTo(168, 6);
          expect(lefts[1] - (lefts[0] + widths[0])).toBeCloseTo(42, 6);
        }
      }
    );

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

      // Domain spans 11 days (Jan 1 -> Jan 12). With cadence c days there
      // are 11/c steps, laid out as 11/c + 1 slots across 420px.
      const widthFor = (gapDays: number) =>
        (RANGE_SPAN / (11 / gapDays + 1)) * (1 - DEFAULT_PADDING_BAR);

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

    it('caps an explicit barWidth at one slot so bars cannot overlap', () => {
      render(
        <ColumnChart
          id='time-column-wide'
          style={CHART_SIZE}
          data={timeSeriesDataISO}
          x={{ key: 'date', scalingFunction: 'time', time: { isISO: true, barWidth: 500 } }}
          y={[{ key: 'iphone', className: 'fill-blue-500' }]}
        />
      );

      widthsOf('time-column-wide').forEach((w) => expect(w).toBeCloseTo(SLOT_5, 6));
    });

    it.each([0, -20, NaN, Infinity])(
      'ignores an unusable barWidth (%s) with a dev warning',
      (barWidth) => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        render(
          <ColumnChart
            id='time-column-bad-width'
            style={CHART_SIZE}
            data={timeSeriesDataISO}
            x={{ key: 'date', scalingFunction: 'time', time: { isISO: true, barWidth } }}
            y={[{ key: 'iphone', className: 'fill-blue-500' }]}
          />
        );

        widthsOf('time-column-bad-width').forEach((w) => expect(w).toBeCloseTo(WIDTH_5, 6));
        expect(
          warn.mock.calls.some(([m]) =>
            String(m).includes('ColumnChart#time-column-bad-width') &&
            String(m).includes('barWidth')
          )
        ).toBe(true);
        warn.mockRestore();
      }
    );

    it('accepts Date objects and epoch-ms numbers as x values (F6)', () => {
      const asDates = timeSeriesDataISO.map((d) => ({ ...d, date: new Date(d.date) }));
      const asNumbers = timeSeriesDataISO.map((d) => ({ ...d, date: Date.parse(d.date) }));
      render(
        <ColumnChart
          id='time-column-dates'
          style={CHART_SIZE}
          data={asDates}
          x={{ key: 'date', scalingFunction: 'time' }}
          y={[{ key: 'iphone', className: 'fill-blue-500' }]}
        />
      );
      render(
        <ColumnChart
          id='time-column-numbers'
          style={CHART_SIZE}
          data={asNumbers}
          x={{ key: 'date', scalingFunction: 'time' }}
          y={[{ key: 'iphone', className: 'fill-blue-500' }]}
        />
      );

      const expected = [0, 1, 2, 3, 4].map((i) => RANGE_START + SLOT_5 / 2 + i * SLOT_5);
      [centersOf('time-column-dates'), centersOf('time-column-numbers')].forEach((cs) => {
        expect(cs).toHaveLength(5);
        cs.forEach((c, i) => expect(c).toBeCloseTo(expected[i], 6));
      });
    });

    it('drops rows whose date cannot be read, with one dev warning (F6)', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      render(
        <ColumnChart
          id='time-column-dropped'
          style={CHART_SIZE}
          data={[...timeSeriesDataISO, { date: 'not-a-date', iphone: 999, macbook: 999 }]}
          x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
          y={[{ key: 'iphone', className: 'fill-blue-500' }]}
        />
      );

      const rects = document.getElementById('time-column-dropped')!.querySelectorAll('rect');
      expect(rects).toHaveLength(5);
      rects.forEach((r) => expect(Number.isFinite(Number(r.getAttribute('x')))).toBe(true));
      const msgs = warn.mock.calls
        .map(([m]) => String(m))
        .filter((m) => m.includes('ColumnChart#time-column-dropped'));
      expect(msgs).toHaveLength(1);
      expect(msgs[0]).toMatch(/1 row/);
      warn.mockRestore();
    });

    it('tooltip shows the formatted date, honouring x.time.tooltipFormat (F8)', () => {
      render(
        <ColumnChart
          id='time-column-tooltip'
          style={CHART_SIZE}
          data={timeSeriesData}
          x={{
            key: 'date',
            scalingFunction: 'time',
            time: { format: '%Y-%m-%d', tooltipFormat: '%d %b %Y' },
          }}
          y={[{ key: 'iphone', className: 'fill-blue-500' }]}
          tooltip={{}}
        />
      );

      const rect = document.getElementById('time-column-tooltip')!.querySelector('rect')!;
      fireEvent.mouseEnter(rect);
      const tips = Array.from(document.querySelectorAll('#tooltip-time-column-tooltip'));
      expect(tips.some((t) => t.innerHTML.startsWith('01 Jan 2025'))).toBe(true);
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

      // Domain spans 2 one-day steps => 3 slots of 140px.
      const dayPx = RANGE_SPAN / 3;
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
      widths.forEach((width) => expect(width).toBeCloseTo(WIDTH_5 / 2, 6));
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

      // Each sub-bar takes 1/n of the group width, and the group is centred
      // on the date; the group width is one slot less paddingBar.
      const groupWidth = WIDTH_5;
      const subWidth = groupWidth / 2;
      rects.forEach((r) => expect(wOf(r)).toBeCloseTo(subWidth, 6));

      for (let i = 0; i < 5; i++) {
        const first = rects[i];
        const second = rects[i + 5];
        const center = RANGE_START + SLOT_5 / 2 + i * SLOT_5;

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
    // Jan 1 -> Jan 6 at a 1-day cadence is 5 steps = 6 slots of 70px; bars
    // are 56px, so each edge bar keeps half the 14px padding gap (7px).
    expect(Math.min(...lefts)).toBeCloseTo(RANGE_START + 7, 6);
    expect(Math.max(...rights)).toBeCloseTo(RANGE_END - 7, 6);

    const [axisStart, axisEnd] = xAxisSpan(container);
    expect(axisStart).toBeCloseTo(RANGE_START + 0.5, 6);
    expect(axisEnd).toBeCloseTo(RANGE_END + 0.5, 6);
  });
});

describe('ColumnChart time mode with x.start / x.end pinned (review-2 N2)', () => {
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
      <ColumnChart
        id='column-pinned-pad'
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
      <ColumnChart
        id='column-pinned-ends'
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
