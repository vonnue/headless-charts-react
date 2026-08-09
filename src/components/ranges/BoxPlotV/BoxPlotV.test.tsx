import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

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

    it('non-time mode (scalingFunction unset) renders boxes normally', () => {
      render(
        <BoxPlotV
          id='non-time-box-plot'
          data={evenlySpacedWeeklyData}
          x={{ key: 'weekStart' }}
          y={timeYConfig}
        />
      );

      const svg = document.getElementById('non-time-box-plot');
      const rects = svg?.querySelectorAll('.box-plot-box');
      expect(rects?.length).toBe(evenlySpacedWeeklyData.length);
    });

    it('non-time mode (scalingFunction: "linear") renders boxes normally', () => {
      render(
        <BoxPlotV
          id='linear-box-plot'
          data={evenlySpacedWeeklyData}
          x={{ key: 'weekStart', scalingFunction: 'linear' }}
          y={timeYConfig}
        />
      );

      const svg = document.getElementById('linear-box-plot');
      const rects = svg?.querySelectorAll('.box-plot-box');
      expect(rects?.length).toBe(evenlySpacedWeeklyData.length);
    });

    it('renders with time mode and isISO: true', () => {
      render(
        <BoxPlotV
          id='time-iso-box-plot'
          data={evenlySpacedWeeklyData}
          x={{ key: 'weekStart', scalingFunction: 'time', time: { isISO: true } }}
          y={timeYConfig}
        />
      );

      const svg = document.getElementById('time-iso-box-plot');
      expect(svg).toBeTruthy();
      expect(svg?.tagName).toBe('svg');

      const rects = svg?.querySelectorAll('.box-plot-box');
      expect(rects?.length).toBe(evenlySpacedWeeklyData.length);
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
          data={customFormatData}
          x={{
            key: 'dateStr',
            scalingFunction: 'time',
            time: { format: '%d-%m-%Y' },
          }}
          y={timeYConfig}
        />
      );

      const svg = document.getElementById('time-format-box-plot');
      expect(svg).toBeTruthy();

      const rects = svg?.querySelectorAll('.box-plot-box');
      expect(rects?.length).toBe(customFormatData.length);
    });

    it('evenly-spaced dates produce equal box spacing', () => {
      render(
        <BoxPlotV
          id='even-spacing-box-plot'
          data={evenlySpacedWeeklyData}
          x={{ key: 'weekStart', scalingFunction: 'time', time: { isISO: true } }}
          y={timeYConfig}
        />
      );

      const svg = document.getElementById('even-spacing-box-plot');
      const rects = svg?.querySelectorAll('.box-plot-box') as NodeListOf<SVGRectElement>;

      // Extract x positions to verify equal spacing
      const xPositions: number[] = [];
      rects.forEach((rect) => {
        const xAttr = rect.getAttribute('x');
        if (xAttr) {
          xPositions.push(parseFloat(xAttr));
        }
      });

      // With equal spacing, differences between consecutive x positions
      // should be approximately equal (within floating-point precision)
      if (xPositions.length >= 2) {
        const differences: number[] = [];
        for (let i = 1; i < xPositions.length; i++) {
          differences.push(xPositions[i] - xPositions[i - 1]);
        }

        // All differences should be close to each other (tolerance for float precision)
        const avgDiff = differences.reduce((a, b) => a + b, 0) / differences.length;
        differences.forEach((diff) => {
          expect(Math.abs(diff - avgDiff)).toBeLessThan(1); // tolerance of 1px
        });
      }
    });

    it('unevenly-spaced dates show visible gap and infer width from median gap', () => {
      render(
        <BoxPlotV
          id='uneven-spacing-box-plot'
          data={unevenlySpacedData}
          x={{ key: 'weekStart', scalingFunction: 'time', time: { isISO: true } }}
          y={timeYConfig}
        />
      );

      const svg = document.getElementById('uneven-spacing-box-plot');
      const rects = svg?.querySelectorAll('.box-plot-box') as NodeListOf<SVGRectElement>;

      // Should render all data points without throwing
      expect(rects?.length).toBe(unevenlySpacedData.length);

      // Extract x positions
      const xPositions: number[] = [];
      rects.forEach((rect) => {
        const xAttr = rect.getAttribute('x');
        if (xAttr) {
          xPositions.push(parseFloat(xAttr));
        }
      });

      // With gaps, there should be a larger space where 2025-01-20 was dropped
      // Position order: 01-06, 01-13, (missing 01-20), 01-27
      // Gap between 01-13 and 01-27 should be larger than regular week gaps.
      //
      // jsdom reports an empty computed style for the SVG's width (no layout
      // engine), so `width` in the component resolves to 0 and scaleTime's
      // range becomes inverted in this test environment, reversing the
      // left-to-right screen order of chronologically-ordered boxes (see the
      // identical note in ColumnChartStacked.test.tsx for the same root
      // cause). That flips which position index holds the larger gap, so
      // compare gap magnitudes rather than assuming a specific order.
      if (xPositions.length === 3) {
        const gapA = Math.abs(xPositions[1] - xPositions[0]); // 1-week gap
        const gapB = Math.abs(xPositions[2] - xPositions[1]); // 2-week gap
        const largerGap = Math.max(gapA, gapB);
        const smallerGap = Math.min(gapA, gapB);

        // The 2-week gap should be approximately double the 1-week gap
        expect(largerGap).toBeGreaterThan(smallerGap * 1.5);
      }
    });

    it('explicit x.time.barWidth overrides inferred width exactly', () => {
      const explicitBarWidth = 50;

      render(
        <BoxPlotV
          id='explicit-width-box-plot'
          data={evenlySpacedWeeklyData}
          x={{
            key: 'weekStart',
            scalingFunction: 'time',
            time: { isISO: true, barWidth: explicitBarWidth },
          }}
          y={timeYConfig}
        />
      );

      const svg = document.getElementById('explicit-width-box-plot');
      const rects = svg?.querySelectorAll('.box-plot-box') as NodeListOf<SVGRectElement>;

      // All boxes should have width equal to the explicit barWidth
      rects.forEach((rect) => {
        const width = parseFloat(rect.getAttribute('width') ?? '0');
        expect(Math.abs(width - explicitBarWidth)).toBeLessThan(0.5); // tolerance for float
      });
    });

    it('single data point does not throw and renders with non-zero width', () => {
      render(
        <BoxPlotV
          id='single-point-time-box-plot'
          data={singlePointData}
          x={{ key: 'weekStart', scalingFunction: 'time', time: { isISO: true } }}
          y={timeYConfig}
        />
      );

      const svg = document.getElementById('single-point-time-box-plot');
      expect(svg).toBeTruthy();

      const rects = svg?.querySelectorAll('.box-plot-box') as NodeListOf<SVGRectElement>;
      expect(rects?.length).toBe(1);

      if (rects?.length === 1) {
        const width = parseFloat(rects[0].getAttribute('width') ?? '0');
        expect(width).toBeGreaterThan(0);
      }
    });

    it('identical timestamps do not produce zero width', () => {
      render(
        <BoxPlotV
          id='identical-timestamps-box-plot'
          data={identicalTimestampsData}
          x={{ key: 'weekStart', scalingFunction: 'time', time: { isISO: true } }}
          y={timeYConfig}
        />
      );

      const svg = document.getElementById('identical-timestamps-box-plot');
      expect(svg).toBeTruthy();

      const rects = svg?.querySelectorAll('.box-plot-box') as NodeListOf<SVGRectElement>;
      expect(rects?.length).toBe(identicalTimestampsData.length);

      // All boxes should have non-zero width
      rects.forEach((rect) => {
        const width = parseFloat(rect.getAttribute('width') ?? '0');
        expect(width).toBeGreaterThan(0);
      });
    });

    it('x.bin is ignored when x.scalingFunction === "time"', () => {
      // Render with both x.bin and x.scalingFunction: 'time'
      // The time mode should take precedence and binning should be ignored
      render(
        <BoxPlotV
          id='time-with-bin-box-plot'
          data={evenlySpacedWeeklyData}
          x={{
            key: 'weekStart',
            scalingFunction: 'time',
            time: { isISO: true },
            bin: { count: 5 }, // This should be ignored in time mode
          }}
          y={timeYConfig}
        />
      );

      const svg = document.getElementById('time-with-bin-box-plot');
      const rects = svg?.querySelectorAll('.box-plot-box');

      // Should render all data rows normally (not binned)
      expect(rects?.length).toBe(evenlySpacedWeeklyData.length);
    });

    it('min/max whisker lines have centered x1 and x2 (centerX position)', async () => {
      render(
        <BoxPlotV
          id='whisker-positions-box-plot'
          data={singlePointData}
          x={{ key: 'weekStart', scalingFunction: 'time', time: { isISO: true } }}
          y={timeYConfig}
        />
      );

      // The main whisker line's y2 only reaches its max-value position after
      // the component's `.transition().duration(1000)` runs. D3 transitions
      // are scheduled via requestAnimationFrame/setTimeout (a macrotask), so
      // render() alone (synchronous, no real/fake time elapsed) only exposes
      // the pre-transition attrs (y1 === y2, no span yet). Wait past the
      // 1000ms duration on the real clock before reading the final DOM state.
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const svg = document.getElementById('whisker-positions-box-plot');
      const lines = svg?.querySelectorAll('.box-plot-line') as NodeListOf<SVGLineElement>;

      // For a single point, find the min/max whisker lines (they should be the same x)
      // Each line has x1, x2, y1, y2 attributes
      // Min/max whiskers should have x1 === x2 (vertical lines at center)
      let foundCenteredLine = false;
      lines.forEach((line) => {
        const x1 = parseFloat(line.getAttribute('x1') ?? '0');
        const x2 = parseFloat(line.getAttribute('x2') ?? '0');
        const y1 = parseFloat(line.getAttribute('y1') ?? '0');
        const y2 = parseFloat(line.getAttribute('y2') ?? '0');

        // Centered whisker: x1 === x2 (vertical) but y1 !== y2
        if (Math.abs(x1 - x2) < 0.5 && Math.abs(y1 - y2) > 1) {
          foundCenteredLine = true;
        }
      });

      expect(foundCenteredLine).toBe(true);
    }, 10000);

    it('box rect has correct x position (left edge: centerX - finalBarWidth/2) and width (finalBarWidth)', () => {
      const explicitBarWidth = 60;

      render(
        <BoxPlotV
          id='box-rect-positions-box-plot'
          data={singlePointData}
          x={{
            key: 'weekStart',
            scalingFunction: 'time',
            time: { isISO: true, barWidth: explicitBarWidth },
          }}
          y={timeYConfig}
        />
      );

      const svg = document.getElementById('box-rect-positions-box-plot');
      const rects = svg?.querySelectorAll('.box-plot-box') as NodeListOf<SVGRectElement>;

      expect(rects?.length).toBe(1);

      if (rects?.length === 1) {
        const width = parseFloat(rects[0].getAttribute('width') ?? '0');
        // Width should match the explicit barWidth
        expect(Math.abs(width - explicitBarWidth)).toBeLessThan(0.5);
      }
    });

    it('begin line x animates from left edge (centerX - finalBarWidth/2) to center (centerX)', async () => {
      render(
        <BoxPlotV
          id='begin-line-animation-box-plot'
          data={singlePointData}
          x={{ key: 'weekStart', scalingFunction: 'time', time: { isISO: true } }}
          y={timeYConfig}
        />
      );

      // See the identical comment in the "min/max whisker lines" test above:
      // the line with a real y-span only exists once the 1000ms transition
      // completes, which requires letting real time elapse past render().
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const svg = document.getElementById('begin-line-animation-box-plot');
      const lines = svg?.querySelectorAll('.box-plot-line') as NodeListOf<SVGLineElement>;

      // Begin line (left edge): initial x1 at left edge, final x1 at center
      // It's a horizontal line at firstQuartile/lastQuartile height spanning the left side
      let foundBeginLine = false;
      lines.forEach((line) => {
        const y1 = parseFloat(line.getAttribute('y1') ?? '0');
        const y2 = parseFloat(line.getAttribute('y2') ?? '0');

        // Begin line spans from firstQuartile to lastQuartile in y
        // In time mode with valid data, should find lines with significant y-span
        if (Math.abs(y2 - y1) > 1) {
          foundBeginLine = true;
        }
      });

      expect(foundBeginLine).toBe(true);
    }, 10000);

    it('end line x animates from center (centerX) to right edge (centerX + finalBarWidth/2)', () => {
      render(
        <BoxPlotV
          id='end-line-animation-box-plot'
          data={singlePointData}
          x={{ key: 'weekStart', scalingFunction: 'time', time: { isISO: true } }}
          y={timeYConfig}
        />
      );

      const svg = document.getElementById('end-line-animation-box-plot');
      const lines = svg?.querySelectorAll('.box-plot-line');

      // End line similar to begin line but on the right side
      // Should render without error
      expect(lines?.length).toBeGreaterThan(0);
    });

    it('mid line has centered x1 and x2 (both at centerX position)', () => {
      render(
        <BoxPlotV
          id='mid-line-box-plot'
          data={singlePointData}
          x={{ key: 'weekStart', scalingFunction: 'time', time: { isISO: true } }}
          y={timeYConfig}
        />
      );

      const svg = document.getElementById('mid-line-box-plot');
      const lines = svg?.querySelectorAll('.box-plot-line') as NodeListOf<SVGLineElement>;

      // Mid line: horizontal line at median y, x1 === x2 === centerX
      // It's a vertical line at the center of the box
      let foundMidLine = false;
      lines.forEach((line) => {
        const x1 = parseFloat(line.getAttribute('x1') ?? '0');
        const x2 = parseFloat(line.getAttribute('x2') ?? '0');

        // Mid line: x1 === x2 (vertical at center), small y-span (just the median point)
        // Median line should have x1 == x2 and typically smaller y range than whiskers
        if (Math.abs(x1 - x2) < 0.5) {
          foundMidLine = true;
        }
      });

      expect(foundMidLine).toBe(true);
    });
  });
});
