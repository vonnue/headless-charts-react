# Test Coverage Analysis

## Current State

**4 test files, ~40 test cases total**

| Category       | Total | Tested   | Coverage |
|----------------|-------|----------|----------|
| Components     | 23    | 3 (13%)  | Very low |
| Hooks          | 2     | 0 (0%)   | None     |
| Utilities      | 3     | 3 (100%) | Complete |

### Tested Files

| File | Test Cases | Quality |
|------|-----------|---------|
| `src/utils/utils.test.tsx` | 13+ | Good, but has assertions outside `it()` blocks |
| `src/components/linear/AreaChart/AreaChart.test.tsx` | 6 | Shallow — only checks `toBeTruthy()` |
| `src/components/linear/BarChart/BarChart.test.tsx` | 4 | Better — checks classes, transforms, labels |
| `src/components/gauges/SpeedometerChart/speedometer.test.tsx` | 16 | Best — covers props, re-render, edge cases |

### Untested Files

#### Components (20 untested)

**Linear Charts:**
- `src/components/linear/BarChartStacked/index.tsx`
- `src/components/linear/ColumnChart/index.tsx`
- `src/components/linear/ColumnChartStacked/index.tsx`
- `src/components/linear/LineChart/index.tsx`
- `src/components/linear/LollipopHChart/index.tsx`
- `src/components/linear/LollipopVChart/index.tsx`
- `src/components/linear/SpineChart/index.tsx`
- `src/components/linear/TimeLineChart/index.tsx`

**Gauge Charts:**
- `src/components/gauges/BulletChart/index.tsx`
- `src/components/gauges/LinearGauge/index.tsx`
- `src/components/gauges/PizzaChart/index.tsx`
- `src/components/gauges/RadarChart/index.tsx`
- `src/components/gauges/RingGauge/index.tsx`

**Distribution Charts:**
- `src/components/distribution/PieChart/index.tsx`
- `src/components/distribution/ScatterPlot/index.tsx`

**Range Plots:**
- `src/components/ranges/BoxPlotH/index.tsx`
- `src/components/ranges/BoxPlotV/index.tsx`
- `src/components/ranges/CometPlot/index.tsx`
- `src/components/ranges/RangePlot/index.tsx`

**Flow/Network:**
- `src/components/flow/Network/index.tsx`

#### Hooks (2 untested)
- `src/hooks/useAxis.tsx`
- `src/hooks/useTooltip.tsx`

---

## Existing Test Quality Issues

1. **Shallow assertions** — Most AreaChart tests only verify `toBeTruthy()`. They don't check rendered paths, data points, or SVG structure.

2. **No interaction testing** — Zero tests for mouse events, tooltips, zooming, or hover effects (despite `@testing-library/user-event` being installed).

3. **Assertions outside `it()` blocks** — In `utils.test.tsx` (lines 52–58), `convertToRanks` assertions run at module load time instead of inside a test case.

4. **Duplicate test** — `deepValue` has two identical test cases ("Get the value of a nested object" at lines 207 and 212).

---

## Priority Recommendations

### P0 — Shared Infrastructure (highest impact)

**`useAxis` / `drawAxis`** — Used by every linear chart component.

Tests should verify:
- Correct axis positioning for all 4 locations (top/bottom/left/right)
- Tick count configuration
- Axis label rendering and positioning
- Padding line generation (left/right/top/bottom)
- Transform calculations for margin offsets

**`useTooltip`** — Used across all chart types for hover interactions.

Tests should verify:
- Tooltip div creation and DOM cleanup
- `onMouseOver` shows tooltip with correct HTML content
- `onMouseMove` repositions the tooltip
- `onMouseLeave` hides tooltip
- All 4 HTML rendering paths: custom `html` function, `keys` array, `defaultHtml`, and fallback `Object.entries`

### P1 — Core Chart Components (most user-facing value)

- **LineChart** — Most common chart type, entirely untested
- **ColumnChart / ColumnChartStacked** — Core charting primitives
- **PieChart** — Common distribution chart
- **BarChartStacked** — Complex stacking logic

Tests should go beyond "renders without crashing":
- Correct number of rendered data elements (bars, slices, paths)
- Data-driven attributes (widths, heights, positions)
- Stacking calculations produce correct layouts
- Negative value handling (`classNameNegative` prop support)
- Axis rendering when configured

### P2 — Gauge & Specialized Charts

- **RingGauge, LinearGauge, BulletChart** — Single-value gauge rendering
- **RadarChart** — Complex polar coordinate geometry
- **BoxPlotH / BoxPlotV** — Statistical visualizations (quartiles, outliers)
- **ScatterPlot** — Distribution with x/y positioning
- **Network** — Graph/force layout visualization

### P3 — Strengthen Existing Tests

- **AreaChart**: Verify `<path>` elements per series, check `d` attributes, test stacking math
- **BarChart**: Test negative values, verify bar dimensions scale with data
- **SpeedometerChart**: Good coverage already; add tooltip interaction tests

### P4 — Cross-Cutting Concerns

- **Responsive behavior** — Components use `ResizeObserver`; no resize handling tests
- **Accessibility** — No tests for ARIA attributes, keyboard navigation, or screen reader support
- **Edge cases** — Empty data arrays, single data points, very large datasets, missing keys
- **Cleanup** — Verify D3 DOM manipulation is cleaned up on unmount (tooltip divs, listeners)

---

## Suggested Test Template

For new component tests, improve on the existing pattern:

```tsx
describe('LineChart', () => {
  const defaultArgs = { id: 'line-chart', data: sampleData, x: {...}, y: [...] };

  it('renders an SVG with correct test ID', () => { ... });
  it('renders one path per Y series', () => { ... });
  it('applies className to each series path', () => { ... });
  it('renders X and Y axes when configured', () => { ... });
  it('handles empty data gracefully', () => { ... });
  it('shows tooltip on mouse hover', () => { ... });
  it('cleans up tooltip div on unmount', () => { ... });
});
```

---

## Summary

The biggest ROI improvements, in order:

1. **Test the hooks** (`useAxis`, `useTooltip`) — shared infrastructure used by nearly all charts
2. **Add tests for LineChart, ColumnChart, PieChart** — most commonly used untested components
3. **Add interaction tests** — tooltip, hover, and zoom behavior is completely untested
4. **Fix existing test smells** — assertions outside `it()` blocks, duplicate tests
