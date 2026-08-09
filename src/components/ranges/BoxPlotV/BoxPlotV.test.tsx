import { describe, expect, it } from 'vitest';
import { render, waitFor } from '@testing-library/react';

import BoxPlotV from '.';
import data from '../sample.json';

describe('BoxPlotV', () => {
  const defaultArgs = {
    id: 'box-plot-v',
    data,
    x: { key: 'name' },
    y: {
      key: 'value',
      minKey: 'min',
      maxKey: 'max',
      boxStart: 'firstQuartile',
      boxEnd: 'lastQuartile',
      midKey: 'mid',
    },
  };

  it('renders an SVG element', () => {
    render(<BoxPlotV {...defaultArgs} />);

    const svg = document.getElementById('box-plot-v');
    expect(svg).toBeTruthy();
    expect(svg?.tagName).toBe('svg');
  });

  it('renders box rects for each data row', () => {
    render(<BoxPlotV {...defaultArgs} />);

    const svg = document.getElementById('box-plot-v');
    const rects = svg?.querySelectorAll('.box-plot-box');
    expect(rects?.length).toBe(data.length);
  });

  it('renders line elements for whiskers and medians', () => {
    render(<BoxPlotV {...defaultArgs} />);

    const svg = document.getElementById('box-plot-v');
    const lines = svg?.querySelectorAll('.box-plot-line');
    // Each data point: main line + min cap + max cap + median cap = 4 lines
    expect(lines?.length).toBe(data.length * 4);
  });

  it('renders with custom classNames', () => {
    render(
      <BoxPlotV
        {...defaultArgs}
        id='box-v-styled'
        classNames={{
          boxes: 'fill-green-200',
          lines: 'stroke-green-700',
          data: 'stroke-orange-500',
        }}
      />
    );

    const svg = document.getElementById('box-v-styled');
    expect(svg).toBeTruthy();
  });

  it('renders axes', () => {
    render(
      <BoxPlotV
        {...defaultArgs}
        id='box-v-axes'
        y={{
          ...defaultArgs.y,
          axis: { location: 'left', ticks: 5 },
        }}
      />
    );

    const svg = document.getElementById('box-v-axes');
    const yAxis = svg?.querySelector('[data-testid="y-axis"]');
    expect(yAxis).toBeTruthy();
  });

  it('renders with custom padding and margin', () => {
    render(
      <BoxPlotV
        {...defaultArgs}
        id='box-v-padded'
        padding={{ top: 10, right: 10, bottom: 10, left: 10 }}
        margin={{ top: 20, right: 20, bottom: 30, left: 40 }}
      />
    );

    const svg = document.getElementById('box-v-padded');
    expect(svg).toBeTruthy();
  });

  it('handles single data point', () => {
    render(
      <BoxPlotV {...defaultArgs} id='box-v-single' data={[data[0]]} />
    );

    const svg = document.getElementById('box-v-single');
    const rects = svg?.querySelectorAll('.box-plot-box');
    expect(rects?.length).toBe(1);
  });

  // Time scaling tests
  describe('Time Scaling (x.scalingFunction: "time")', () => {
    // jsdom has no layout engine, so an SVG with no inline width/height
    // reports an empty computed style and the component resolves
    // `width`/`height` to 0. That inverts scaleTime's range (e.g. [40, -20]),
    // makes every derived slot width negative, and silently clamps
    // `finalBarWidth` to the `Math.max(1, ...)` floor — which makes any
    // geometry assertion pass for the wrong reason. Passing an explicit
    // inline `style` (a real prop of the component, not a mock) gives the
    // chart real dimensions so positions and widths can be asserted for real.
    const chartStyle = { width: '600px', height: '400px' };

    // Test data: evenly-spaced weekly dates
    const evenlySpacedWeeklyData = [
      {
        weekStart: '2025-01-06',
        min: 40,
        firstQuartile: 55,
        mid: 65,
        lastQuartile: 78,
        max: 95,
      },
      {
        weekStart: '2025-01-13',
        min: 35,
        firstQuartile: 50,
        mid: 60,
        lastQuartile: 72,
        max: 88,
      },
      {
        weekStart: '2025-01-20',
        min: 45,
        firstQuartile: 58,
        mid: 70,
        lastQuartile: 82,
        max: 100,
      },
      {
        weekStart: '2025-01-27',
        min: 30,
        firstQuartile: 45,
        mid: 55,
        lastQuartile: 68,
        max: 80,
      },
    ];

    // Test data: unevenly-spaced (drops 2025-01-20) to test gap handling
    const unevenlySpacedData = evenlySpacedWeeklyData.filter(
      (d) => d.weekStart !== '2025-01-20'
    );

    // Test data: single data point
    const singlePointData = [evenlySpacedWeeklyData[0]];

    // Test data: identical timestamps
    const identicalTimestampsData = [
      { ...evenlySpacedWeeklyData[0], weekStart: '2025-01-06' },
      { ...evenlySpacedWeeklyData[1], weekStart: '2025-01-06' },
      { ...evenlySpacedWeeklyData[2], weekStart: '2025-01-06' },
    ];

    const timeYConfig = {
      key: 'mid',
      minKey: 'min',
      maxKey: 'max',
      midKey: 'mid',
      boxStart: 'firstQuartile',
      boxEnd: 'lastQuartile',
      min: 0,
    };

    const rectsOf = (svgId: string) =>
      Array.from(
        document
          .getElementById(svgId)
          ?.querySelectorAll('.box-plot-box') ?? []
      ) as SVGRectElement[];

    const numAttr = (el: Element | undefined, name: string) =>
      parseFloat(el?.getAttribute(name) ?? 'NaN');

    /**
     * The four lines of a row are appended in a fixed order inside the row's
     * <g>: min/max whisker, begin line, mid line, end line — followed by the
     * box rect. Return them positionally so each of the six spec'd callbacks
     * can be asserted individually.
     */
    const rowPartsOf = (svgId: string, rowIndex = 0) => {
      const rows = document
        .getElementById(svgId)
        ?.querySelectorAll('g.data > g');
      const row = rows?.[rowIndex];
      const lines = Array.from(
        row?.querySelectorAll('line') ?? []
      ) as SVGLineElement[];
      return {
        whisker: lines[0],
        begin: lines[1],
        midLine: lines[2],
        endLine: lines[3],
        rect: row?.querySelector('rect') as SVGRectElement,
      };
    };

    it('non-time mode (scalingFunction unset) renders boxes normally', () => {
      render(
        <BoxPlotV
          id='non-time-box-plot'
          style={chartStyle}
          data={evenlySpacedWeeklyData}
          x={{ key: 'weekStart' }}
          y={timeYConfig}
        />
      );

      expect(rectsOf('non-time-box-plot').length).toBe(
        evenlySpacedWeeklyData.length
      );
    });

    it('non-time mode (scalingFunction: "linear") renders boxes normally', () => {
      render(
        <BoxPlotV
          id='linear-box-plot'
          style={chartStyle}
          data={evenlySpacedWeeklyData}
          x={{ key: 'weekStart', scalingFunction: 'linear' }}
          y={timeYConfig}
        />
      );

      expect(rectsOf('linear-box-plot').length).toBe(
        evenlySpacedWeeklyData.length
      );
    });

    it('non-time mode still lays boxes out with scaleBand (equal band widths, inside the range)', () => {
      render(
        <BoxPlotV
          id='band-layout-box-plot'
          style={chartStyle}
          data={evenlySpacedWeeklyData}
          x={{ key: 'weekStart' }}
          y={timeYConfig}
        />
      );

      const rects = rectsOf('band-layout-box-plot');
      const widths = rects.map((r) => numAttr(r, 'width'));
      const xs = rects.map((r) => numAttr(r, 'x'));

      // scaleBand keeps every band the same width and inside [40, 580]
      widths.forEach((w) => expect(w).toBeCloseTo(widths[0], 6));
      expect(widths[0]).toBeGreaterThan(0);
      expect(Math.min(...xs)).toBeGreaterThanOrEqual(40);
      expect(Math.max(...xs) + widths[0]).toBeLessThanOrEqual(580.001);
    });

    it('renders with time mode and isISO: true', () => {
      render(
        <BoxPlotV
          id='time-iso-box-plot'
          style={chartStyle}
          data={evenlySpacedWeeklyData}
          x={{ key: 'weekStart', scalingFunction: 'time', time: { isISO: true } }}
          y={timeYConfig}
        />
      );

      const svg = document.getElementById('time-iso-box-plot');
      expect(svg).toBeTruthy();
      expect(svg?.tagName).toBe('svg');
      expect(rectsOf('time-iso-box-plot').length).toBe(
        evenlySpacedWeeklyData.length
      );
    });

    it('renders with time mode and custom format string', () => {
      // Custom format: dates like '06-01-2025' (DD-MM-YYYY)
      const customFormatData = evenlySpacedWeeklyData.map((d) => ({
        ...d,
        dateStr: d.weekStart.split('-').reverse().join('-'),
      }));

      render(
        <BoxPlotV
          id='time-format-box-plot'
          style={chartStyle}
          data={customFormatData}
          x={{
            key: 'dateStr',
            scalingFunction: 'time',
            time: { format: '%d-%m-%Y' },
          }}
          y={timeYConfig}
        />
      );

      expect(rectsOf('time-format-box-plot').length).toBe(
        customFormatData.length
      );
    });

    it('x.time.format and x.time.isISO produce the same layout for the same instants', () => {
      const customFormatData = evenlySpacedWeeklyData.map((d) => ({
        ...d,
        dateStr: d.weekStart.split('-').reverse().join('-'),
      }));

      render(
        <BoxPlotV
          id='parse-iso-box-plot'
          style={chartStyle}
          data={evenlySpacedWeeklyData}
          x={{ key: 'weekStart', scalingFunction: 'time', time: { isISO: true } }}
          y={timeYConfig}
        />
      );
      render(
        <BoxPlotV
          id='parse-format-box-plot'
          style={chartStyle}
          data={customFormatData}
          x={{
            key: 'dateStr',
            scalingFunction: 'time',
            time: { format: '%d-%m-%Y' },
          }}
          y={timeYConfig}
        />
      );

      const isoXs = rectsOf('parse-iso-box-plot').map((r) => numAttr(r, 'x'));
      const fmtXs = rectsOf('parse-format-box-plot').map((r) =>
        numAttr(r, 'x')
      );

      expect(isoXs.length).toBe(fmtXs.length);
      // isoParse reads the date as UTC and timeParse as local time, so the two
      // may be offset by the runner's UTC offset — but the *spacing* between
      // boxes must be identical, since the instants are one week apart either
      // way. Compare gaps rather than absolute positions.
      for (let i = 1; i < isoXs.length; i++) {
        expect(isoXs[i] - isoXs[i - 1]).toBeCloseTo(fmtXs[i] - fmtXs[i - 1], 6);
      }
    });

    it('evenly-spaced dates produce equal box spacing and equal width', () => {
      render(
        <BoxPlotV
          id='even-spacing-box-plot'
          style={chartStyle}
          data={evenlySpacedWeeklyData}
          x={{ key: 'weekStart', scalingFunction: 'time', time: { isISO: true } }}
          y={timeYConfig}
        />
      );

      const rects = rectsOf('even-spacing-box-plot');
      const xPositions = rects.map((r) => numAttr(r, 'x'));
      const widths = rects.map((r) => numAttr(r, 'width'));

      expect(xPositions.length).toBe(4);

      // Chronological order must map to increasing screen x
      for (let i = 1; i < xPositions.length; i++) {
        expect(xPositions[i]).toBeGreaterThan(xPositions[i - 1]);
      }

      const gaps = xPositions
        .slice(1)
        .map((xPos, i) => xPos - xPositions[i]);
      gaps.forEach((gap) => expect(gap).toBeCloseTo(gaps[0], 6));

      // Every box is the same width, and that width is the slot spacing minus
      // the default 0.2 bar padding — i.e. finalBarWidth = slot * (1 - 0.2).
      widths.forEach((w) => expect(w).toBeCloseTo(widths[0], 6));
      expect(widths[0]).toBeCloseTo(gaps[0] * 0.8, 6);
    });

    it('padding.bar is applied to the inferred width', () => {
      render(
        <BoxPlotV
          id='padding-bar-box-plot'
          style={chartStyle}
          data={evenlySpacedWeeklyData}
          padding={{ top: 0, bottom: 0, left: 0, right: 0, bar: 0.5 }}
          x={{ key: 'weekStart', scalingFunction: 'time', time: { isISO: true } }}
          y={timeYConfig}
        />
      );

      const rects = rectsOf('padding-bar-box-plot');
      const xPositions = rects.map((r) => numAttr(r, 'x'));
      const slot = xPositions[1] - xPositions[0];

      expect(numAttr(rects[0], 'width')).toBeCloseTo(slot * 0.5, 6);
    });

    it('unevenly-spaced dates leave a proportionally larger gap where a period is missing', () => {
      render(
        <BoxPlotV
          id='uneven-spacing-box-plot'
          style={chartStyle}
          data={unevenlySpacedData}
          x={{ key: 'weekStart', scalingFunction: 'time', time: { isISO: true } }}
          y={timeYConfig}
        />
      );

      const rects = rectsOf('uneven-spacing-box-plot');
      expect(rects.length).toBe(unevenlySpacedData.length);

      const xPositions = rects.map((r) => numAttr(r, 'x'));

      // Order: 01-06, 01-13, (missing 01-20), 01-27 — so the second gap spans
      // two weeks and must be twice the first, which spans one.
      const oneWeekGap = xPositions[1] - xPositions[0];
      const twoWeekGap = xPositions[2] - xPositions[1];

      expect(oneWeekGap).toBeGreaterThan(0);
      expect(twoWeekGap).toBeCloseTo(oneWeekGap * 2, 6);
    });

    it('infers width from the MEDIAN gap, not the mean or the smallest gap', () => {
      // Gaps here are 7d, 7d, 28d: median = 7d, mean = 14d, max = 28d.
      // Only a median-based inference yields a width tied to the 7d cadence.
      const medianProbeData = [
        { ...evenlySpacedWeeklyData[0], weekStart: '2025-01-06' },
        { ...evenlySpacedWeeklyData[1], weekStart: '2025-01-13' },
        { ...evenlySpacedWeeklyData[2], weekStart: '2025-01-20' },
        { ...evenlySpacedWeeklyData[3], weekStart: '2025-02-17' },
      ];

      render(
        <BoxPlotV
          id='median-gap-box-plot'
          style={chartStyle}
          data={medianProbeData}
          x={{ key: 'weekStart', scalingFunction: 'time', time: { isISO: true } }}
          y={timeYConfig}
        />
      );

      const rects = rectsOf('median-gap-box-plot');
      const xPositions = rects.map((r) => numAttr(r, 'x'));
      const width = numAttr(rects[0], 'width');

      // One week of pixels, measured off the first (7-day) gap.
      const oneWeekPx = xPositions[1] - xPositions[0];

      expect(width).toBeCloseTo(oneWeekPx * 0.8, 6);
      // Guard against a mean-based (14d) or max-based (28d) inference.
      expect(width).toBeLessThan(oneWeekPx * 1.5);
    });

    it('explicit x.time.barWidth overrides inferred width exactly and ignores padding.bar', () => {
      const explicitBarWidth = 50;

      render(
        <BoxPlotV
          id='explicit-width-box-plot'
          style={chartStyle}
          data={evenlySpacedWeeklyData}
          padding={{ top: 0, bottom: 0, left: 0, right: 0, bar: 0.5 }}
          x={{
            key: 'weekStart',
            scalingFunction: 'time',
            time: { isISO: true, barWidth: explicitBarWidth },
          }}
          y={timeYConfig}
        />
      );

      const rects = rectsOf('explicit-width-box-plot');
      expect(rects.length).toBe(evenlySpacedWeeklyData.length);

      // Used as-is: padding.bar of 0.5 must NOT be applied on top of it.
      rects.forEach((rect) => {
        expect(numAttr(rect, 'width')).toBeCloseTo(explicitBarWidth, 6);
      });
    });

    it('single data point does not throw and renders a real (unclamped) width', () => {
      render(
        <BoxPlotV
          id='single-point-time-box-plot'
          style={chartStyle}
          data={singlePointData}
          x={{ key: 'weekStart', scalingFunction: 'time', time: { isISO: true } }}
          y={timeYConfig}
        />
      );

      const rects = rectsOf('single-point-time-box-plot');
      expect(rects.length).toBe(1);

      // With one row the cadence is unknowable, so the fallback splits the
      // plotting width evenly: (580 - 40) / 1 * (1 - 0.2) = 432. Assert well
      // above 1 so the `Math.max(1, ...)` floor can't satisfy this on its own.
      const width = numAttr(rects[0], 'width');
      expect(width).toBeGreaterThan(1);
      expect(width).toBeCloseTo((580 - 40) * 0.8, 6);
    });

    it('identical timestamps do not produce zero or negative width', () => {
      render(
        <BoxPlotV
          id='identical-timestamps-box-plot'
          style={chartStyle}
          data={identicalTimestampsData}
          x={{ key: 'weekStart', scalingFunction: 'time', time: { isISO: true } }}
          y={timeYConfig}
        />
      );

      const rects = rectsOf('identical-timestamps-box-plot');
      expect(rects.length).toBe(identicalTimestampsData.length);

      // One unique timestamp => no cadence => even split across the 3 rows.
      rects.forEach((rect) => {
        const width = numAttr(rect, 'width');
        expect(width).toBeGreaterThan(1);
        expect(width).toBeCloseTo(((580 - 40) / 3) * 0.8, 6);
      });
    });

    it('x.bin is ignored when x.scalingFunction === "time"', () => {
      // `valueKey` is required for BoxPlotV's binning branch to engage at all
      // (`isBinned && valueKey`), so it must be supplied here — without it the
      // assertion would hold whether or not the time guard exists.
      render(
        <BoxPlotV
          id='time-with-bin-box-plot'
          style={chartStyle}
          data={evenlySpacedWeeklyData}
          valueKey='mid'
          x={{
            key: 'weekStart',
            scalingFunction: 'time',
            time: { isISO: true },
            bin: { count: 3 }, // ignored in time mode
          }}
          y={timeYConfig}
        />
      );

      // One box per raw row (4), not one per bin (3).
      expect(rectsOf('time-with-bin-box-plot').length).toBe(
        evenlySpacedWeeklyData.length
      );
    });

    it('x.bin still bins when scalingFunction is not "time" (control for the guard)', () => {
      const numericData = evenlySpacedWeeklyData.map((d, i) => ({
        ...d,
        bucket: i * 10,
      }));

      render(
        <BoxPlotV
          id='bin-control-box-plot'
          style={chartStyle}
          data={numericData}
          valueKey='mid'
          x={{ key: 'bucket', bin: { count: 3 } }}
          y={timeYConfig}
        />
      );

      // Binning collapses the 4 rows into 3 bins — proving the previous test's
      // count of 4 is the guard working, not binning being inert.
      expect(rectsOf('bin-control-box-plot').length).toBe(3);
    });

    it('positions all six band-derived attributes from centerX/finalBarWidth (pre-transition)', () => {
      const explicitBarWidth = 60;

      render(
        <BoxPlotV
          id='geometry-box-plot'
          style={chartStyle}
          data={singlePointData}
          x={{
            key: 'weekStart',
            scalingFunction: 'time',
            time: { isISO: true, barWidth: explicitBarWidth },
          }}
          y={timeYConfig}
        />
      );

      const { whisker, begin, midLine, endLine, rect } =
        rowPartsOf('geometry-box-plot');

      // The min/max whisker sits on centerX and never animates in x, so it is
      // the reference point for every other mark.
      const centerX = numAttr(whisker, 'x1');
      expect(Number.isFinite(centerX)).toBe(true);
      expect(centerX).toBeGreaterThan(40);
      expect(centerX).toBeLessThan(580);
      expect(numAttr(whisker, 'x2')).toBeCloseTo(centerX, 6);

      const left = centerX - explicitBarWidth / 2;
      const right = centerX + explicitBarWidth / 2;

      // Begin line starts collapsed on the left edge.
      expect(numAttr(begin, 'x1')).toBeCloseTo(left, 6);
      expect(numAttr(begin, 'x2')).toBeCloseTo(left, 6);

      // Mid and end lines start collapsed on the center.
      expect(numAttr(midLine, 'x1')).toBeCloseTo(centerX, 6);
      expect(numAttr(midLine, 'x2')).toBeCloseTo(centerX, 6);
      expect(numAttr(endLine, 'x1')).toBeCloseTo(centerX, 6);
      expect(numAttr(endLine, 'x2')).toBeCloseTo(centerX, 6);

      // The rect's x/width are not animated, so they are final immediately.
      expect(numAttr(rect, 'x')).toBeCloseTo(left, 6);
      expect(numAttr(rect, 'width')).toBeCloseTo(explicitBarWidth, 6);
      expect(numAttr(rect, 'x') + numAttr(rect, 'width')).toBeCloseTo(right, 6);
    });

    it('animates begin/mid/end lines out to the full box width (post-transition)', async () => {
      const explicitBarWidth = 60;

      render(
        <BoxPlotV
          id='geometry-transition-box-plot'
          style={chartStyle}
          data={singlePointData}
          x={{
            key: 'weekStart',
            scalingFunction: 'time',
            time: { isISO: true, barWidth: explicitBarWidth },
          }}
          y={timeYConfig}
        />
      );

      const centerX = numAttr(
        rowPartsOf('geometry-transition-box-plot').whisker,
        'x1'
      );
      const left = centerX - explicitBarWidth / 2;
      const right = centerX + explicitBarWidth / 2;

      // The x-spans above are only reached at the end of the component's
      // `.transition().duration(1000)`. d3-transition drives that off
      // requestAnimationFrame/d3-timer, which `render()` (synchronous) never
      // lets run and which `vi.useFakeTimers()` does not advance reliably —
      // so this has to wait on the real clock. `waitFor` polls and resolves as
      // soon as the final state lands, rather than sleeping a fixed 1100ms,
      // and fails with the actual attribute values if it never does.
      await waitFor(
        () => {
          const { begin, midLine, endLine } = rowPartsOf(
            'geometry-transition-box-plot'
          );

          // Begin line: x1 pinned to the left edge, x2 sweeps out to the right.
          expect(numAttr(begin, 'x1')).toBeCloseTo(left, 3);
          expect(numAttr(begin, 'x2')).toBeCloseTo(right, 3);

          // Mid and end lines: expand from the center to span the full width.
          expect(numAttr(midLine, 'x1')).toBeCloseTo(left, 3);
          expect(numAttr(midLine, 'x2')).toBeCloseTo(right, 3);
          expect(numAttr(endLine, 'x1')).toBeCloseTo(left, 3);
          expect(numAttr(endLine, 'x2')).toBeCloseTo(right, 3);
        },
        { timeout: 3000, interval: 50 }
      );

      // The whisker's x never animates — still centered after the transition.
      const { whisker } = rowPartsOf('geometry-transition-box-plot');
      expect(numAttr(whisker, 'x1')).toBeCloseTo(centerX, 6);
      expect(numAttr(whisker, 'x2')).toBeCloseTo(centerX, 6);
    });
  });
});
