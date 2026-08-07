# Choosing a chart in @headless-charts/react

<!-- Generated from src/components/**/meta.ts. Do not edit by hand — run `yarn docs` to regenerate. -->

This file exists so that picking a chart is a lookup, not a guess. Start from the question the data is being used to answer, narrow with the decision table, then read that chart’s entry for its data shape and its limits.

The same information is available programmatically: `import { chartCatalog, decisionTree } from "@headless-charts/react"`, or read `catalog.json` from the package root.

## Rules that apply to every chart

- `id` is required on every chart and must be unique in the document — it is the DOM id D3 selects on. Two charts sharing an id will render into the same node.
- Charts read their size from the rendered element. Size them with `className` or `style` (e.g. `className="w-full h-64"`); there are no `width` or `height` props. A container with no height renders an empty chart.
- Styling is headless: pass Tailwind (or any CSS) classes via `className` on the chart and via `className` on each series config. Nothing is coloured by default.
- Use `margin` for space outside the plot area (axis labels live here) and `padding` for space inside it.
- Tooltips are opt-in: pass `tooltip={{}}` for defaults, `tooltip={{ keys: [...] }}` to choose fields, or `tooltip={{ html: (d) => string }}` to take over rendering.
- Animation is opt-in via `drawing={{ duration, delay }}`; charts render instantly by default.
- Axis keys support dot paths into nested objects (e.g. `{ key: "user.score" }`).

## If a chart type was named

Requests usually name a chart type ("a waterfall chart", "a streamgraph") rather than a component. Several of these are a base component plus a prop, not a component of their own — look the name up here before reaching for the decision table.

| Asked for | Render | Configuration |
| --- | --- | --- |
| 100% stacked area chart, percentage area chart, normalised area chart, share of total area chart | [`AreaChart`](#areachart) | Set `stacking={{ type: "100%" }}`. The y axis becomes 0–100% of the period total. |
| AreaChart, area graph, stacked area chart, mountain chart | [`AreaChart`](#areachart) | Base component, no extra configuration |
| BarChart, horizontal bar chart, grouped bar chart, ranked bar chart | [`BarChart`](#barchart) | Base component, no extra configuration |
| BarChartStacked, stacked bar chart, horizontal stacked bar chart | [`BarChartStacked`](#barchartstacked) | Base component, no extra configuration |
| Binned 2D histogram, binned heatmap, two-dimensional histogram | [`WaffleChart`](#wafflechart) | Set `bin` on `x` and/or `y`; each cell then shows the count for that (xBin, yBin) pair rather than a value from the data. |
| Binned box plot (vertical), vertical box plot from raw data, distribution by band | [`BoxPlotV`](#boxplotv) | Set `bin` on the `x` (category) config and pass `valueKey` naming the field to summarise. The statistic keys on `y` are then computed internally and can be omitted. Use `bin.thresholds` for explicit band edges. |
| Binned box plot, box plot from raw data, grouped distribution plot | [`BoxPlotH`](#boxploth) | Set `bin` on the `y` (category) config and pass `valueKey` naming the field to summarise. The statistic keys on `x` are then computed internally and can be omitted. |
| BoxPlotH, horizontal box plot, box and whisker plot, quartile plot | [`BoxPlotH`](#boxploth) | Base component, no extra configuration |
| BoxPlotV, vertical box plot, box and whisker chart, box chart | [`BoxPlotV`](#boxplotv) | Base component, no extra configuration |
| Bubble chart, bubble plot, proportional symbol chart | [`ScatterPlot`](#scatterplot) | Add `size={{ key: "population", min: 2, max: 20 }}`. Radius is scaled between `min` and `max` pixels. |
| BulletChart, bullet graph, kpi bar, target vs actual chart | [`BulletChart`](#bulletchart) | Base component, no extra configuration |
| Bump chart, rank chart, ranking chart, bump plot, rank over time | [`LineChart`](#linechart) | Convert values to ranks with `utils.convertToRanks(data, y, x)` — it takes the same `y` array and `x` object you pass to the chart — then set `curve: "bumpX"` and `label: { show: true }` on each series, and `reverse` so rank 1 sits at the top. |
| Calendar heatmap, month-year heatmap, seasonality chart, activity heatmap | [`WaffleChart`](#wafflechart) | Map the finer time unit to `y` and the coarser to `x`, then colour by the measure. Use a diverging scale such as `interpolateRdYlGn` for values with a meaningful middle. |
| ColumnChart, vertical bar chart, grouped column chart, clustered column chart | [`ColumnChart`](#columnchart) | Base component, no extra configuration |
| ColumnChartStacked, stacked column chart, stacked bar chart (vertical) | [`ColumnChartStacked`](#columnchartstacked) | Base component, no extra configuration |
| CometPlot, comet chart, change plot, movement plot, slope chart | [`CometPlot`](#cometplot) | Base component, no extra configuration |
| Connected scatterplot, connected scatter, path plot, trajectory plot | [`ScatterPlot`](#scatterplot) | Set `connect={{ enabled: true, className: "stroke-gray-400" }}`. Points join in the order the data is given, so sort it first. |
| Density heatmap, 2d histogram, binned scatter plot, density plot | [`ScatterPlot`](#scatterplot) | Set `x.bin` and/or `y.bin`. Cells show counts, coloured via `binColor.scale` with an optional `binColor.domain`. |
| Diverging area chart, diverging stacked area chart, bidirectional area chart | [`AreaChart`](#areachart) | Set `stacking={{ type: "diverging" }}`. Series order is reversed so positive and negative stacks mirror each other. |
| Diverging bar chart, tornado chart, bidirectional bar chart, deviation chart | [`BarChart`](#barchart) | Supply negative values in the data, set `start`/`end` on the series to pin a symmetric axis, and style with `className` plus `classNameNegative`. |
| Donut chart, doughnut chart, ring chart | [`PieChart`](#piechart) | Set `innerRadius` above 0. Values are a fraction of `outerRadius`, so `innerRadius={0.5}` hollows half the radius. |
| Dual-axis line chart, two axis chart, secondary axis chart, combo chart | [`LineChart`](#linechart) | Give the second series `axis: { location: "right" }` and widen `margin.right`. Label the scales with `yLeftLabel` and `yRightLabel`. |
| Gantt chart, gantt, schedule chart, project timeline, swimlane chart | [`TimeLineChart`](#timelinechart) | Pass both `events.startKey` and `events.endKey` with `events.isTime: true`, and set `y` to the lane key. Spans render as rects; overlapping work in a lane is visible as stacked bars. |
| Histogram, frequency distribution, binned column chart, frequency chart | [`ColumnChart`](#columnchart) | Set `x={{ key: "score", bin: { count: 8 } }}` and `y={[{ key: "count" }]}`. Pass the raw rows as `data` — binning and counting happen internally. Use `bin.thresholds` for explicit edges. |
| Horizontal histogram, binned bar chart, horizontal frequency distribution | [`BarChart`](#barchart) | Set `bin` on the first `x` entry: `x={[{ key: "score", bin: { count: 8 } }]}`. Bin labels move to the y axis automatically. |
| Horizontal waterfall chart, horizontal bridge chart, horizontal cascade chart | [`BarChartStacked`](#barchartstacked) | Set `waterfall` on a BarChartStacked. Each `x` series becomes a step rather than a segment stacked from the baseline. |
| LinearGauge, progress bar chart, linear progress gauge, meter | [`LinearGauge`](#lineargauge) | Base component, no extra configuration |
| LineChart, line graph, multi-line chart, trend line chart | [`LineChart`](#linechart) | Base component, no extra configuration |
| LollipopHChart, horizontal lollipop chart, lollipop chart, stem plot | [`LollipopHChart`](#lollipophchart) | Base component, no extra configuration |
| LollipopVChart, vertical lollipop chart, stem and dot chart | [`LollipopVChart`](#lollipopvchart) | Base component, no extra configuration |
| Network, network graph, node-link diagram, force-directed graph, graph chart, relationship map | [`Network`](#network) | Base component, no extra configuration |
| PieChart, circle chart, part-to-whole chart | [`PieChart`](#piechart) | Base component, no extra configuration |
| PizzaChart, radial bar chart, polar bar chart, sunburst-style profile | [`PizzaChart`](#pizzachart) | Base component, no extra configuration |
| RadarChart, spider chart, web chart, star chart, polar chart, kiviat diagram | [`RadarChart`](#radarchart) | Base component, no extra configuration |
| RangePlot, dumbbell chart, dumbbell plot, barbell chart, dot plot, DNA chart, range chart | [`RangePlot`](#rangeplot) | Base component, no extra configuration |
| RingGauge, activity rings, radial progress chart, concentric gauge, donut gauge | [`RingGauge`](#ringgauge) | Base component, no extra configuration |
| ScatterPlot, scatter chart, scatter graph, xy plot, correlation plot | [`ScatterPlot`](#scatterplot) | Base component, no extra configuration |
| Semicircle chart, half donut chart, parliament chart, hemicycle chart, seat chart, gauge donut | [`PieChart`](#piechart) | Set `startAngle={-90}` and `endAngle={90}`. Combine with `innerRadius` for a half donut. |
| SpeedometerChart, gauge chart, dial chart, speedometer, needle gauge | [`SpeedometerChart`](#speedometerchart) | Base component, no extra configuration |
| SpineChart, population pyramid, age-sex pyramid, butterfly chart, back-to-back bar chart | [`SpineChart`](#spinechart) | Base component, no extra configuration |
| Step chart, step line chart, staircase chart | [`LineChart`](#linechart) | Set `curve: "step"` on each series. |
| Streamgraph, stream graph, theme river, stream chart | [`AreaChart`](#areachart) | Set `stacking={{ type: "streamgraph" }}`. Bands are ordered inside-out and offset by wiggle. |
| Time-scaled area chart, time series area chart | [`AreaChart`](#areachart) | Set `x.scalingFunction: "time"` with `x.time.format`, or `x.time.isISO` for ISO strings. |
| Time-scaled line chart, time series chart, time series line chart | [`LineChart`](#linechart) | Set `x.scalingFunction: "time"` and `x.time.format` (or `x.time.isISO`) to parse date strings. |
| TimeLineChart, timeline, event plot, activity timeline | [`TimeLineChart`](#timelinechart) | Base component, no extra configuration |
| WaffleChart, heatmap, categorical heatmap, matrix chart, grid chart, tile chart | [`WaffleChart`](#wafflechart) | Base component, no extra configuration |
| Waterfall chart, waterfall, bridge chart, cascade chart, flying bricks chart | [`ColumnChartStacked`](#columnchartstacked) | Set `waterfall` on a ColumnChartStacked. Each `y` series becomes a step in the sequence rather than a segment stacked from the baseline. |

## Decision table

Find the question being asked, then pick among the candidates.

### How does a measure compare across named categories?

| Chart | Choose it when |
| --- | --- |
| [`ColumnChart`](#columnchart) | Up to ~12 categories with short labels — vertical bars, grouped when several measures are passed |
| [`BarChart`](#barchart) | Long category labels, or more than ~12 categories — horizontal bars give labels room |
| [`LollipopVChart`](#lollipopvchart) | Values matter more than magnitude-as-area, and bars would look heavy; vertical orientation |
| [`LollipopHChart`](#lollipophchart) | Same as LollipopVChart but with long category labels |
| [`SpineChart`](#spinechart) | Two opposing measures per category read outward from a shared centre axis, e.g. male/female |
| [`RadarChart`](#radarchart) | Five or more metrics compared across a handful of entities on one shared 0–max scale |

### What is this made of — how do parts add to a whole?

| Chart | Choose it when |
| --- | --- |
| [`PieChart`](#piechart) | One whole split into ~6 or fewer slices at a single point in time |
| [`ColumnChartStacked`](#columnchartstacked) | Composition compared across several categories or periods, vertical |
| [`BarChartStacked`](#barchartstacked) | Same as ColumnChartStacked but with long category labels; also does waterfall |
| [`AreaChart`](#areachart) | Composition changing over a continuous axis; supports 100% and streamgraph stacking |
| [`PizzaChart`](#pizzachart) | Several metrics as radial segments of one entity, each against its own max |

### How does a measure change over time or an ordered axis?

| Chart | Choose it when |
| --- | --- |
| [`LineChart`](#linechart) | Trend of one or more series; the default choice for time on x |
| [`AreaChart`](#areachart) | Trend where the volume under the line or the split of a total matters |
| [`ColumnChart`](#columnchart) | Few discrete periods where individual values matter more than the trend line |
| [`TimeLineChart`](#timelinechart) | Discrete events or durations on a date axis rather than a continuous measure |

### How do two measures relate to each other?

| Chart | Choose it when |
| --- | --- |
| [`ScatterPlot`](#scatterplot) | One point per record; encodes up to two more categorical and one more numeric dimension via color, shape and size |
| [`WaffleChart`](#wafflechart) | Both axes are categorical (or binned) and a third value is encoded as cell colour — a heatmap |

### How are the values of one measure spread out?

| Chart | Choose it when |
| --- | --- |
| [`ColumnChart`](#columnchart) | Histogram of raw continuous values — set `x.bin` and bar heights become counts |
| [`BarChart`](#barchart) | Same histogram horizontally — set `x[0].bin`; better for many bins |
| [`BoxPlotV`](#boxplotv) | Compare the spread, median and quartiles of several groups, vertically |
| [`BoxPlotH`](#boxploth) | Same as BoxPlotV with long group labels |
| [`ScatterPlot`](#scatterplot) | Two-dimensional density — set `x.bin` or `y.bin` for a binned heatmap |

### What is the interval, or the movement between two states?

| Chart | Choose it when |
| --- | --- |
| [`RangePlot`](#rangeplot) | A static min–max interval per category, drawn as a dumbbell |
| [`CometPlot`](#cometplot) | Movement from one value to another per category, with direction shown by a tapered tail |
| [`BoxPlotH`](#boxploth) | The interval is a statistical summary (quartiles and median), not a plain min–max |

### How does a single value stand against its target?

| Chart | Choose it when |
| --- | --- |
| [`BulletChart`](#bulletchart) | One metric against base, target, threshold and max — the most information-dense option |
| [`LinearGauge`](#lineargauge) | One value on a plain linear scale, optionally with an error value; compact enough for a table cell |
| [`RingGauge`](#ringgauge) | Several metrics each against their own target, as concentric rings |
| [`SpeedometerChart`](#speedometerchart) | One value where a dial metaphor and coloured regions aid reading |
| [`PizzaChart`](#pizzachart) | Several metrics of one entity against a shared max, as radial slices |

### How do entities compare across many metrics at once?

| Chart | Choose it when |
| --- | --- |
| [`RadarChart`](#radarchart) | Five or more metrics on a shared scale, comparing a few entities by shape |
| [`PizzaChart`](#pizzachart) | A single entity profiled across metrics, no entity-to-entity comparison |
| [`RingGauge`](#ringgauge) | Metrics have individual targets rather than one shared scale |

### How has ordering changed?

| Chart | Choose it when |
| --- | --- |
| [`LineChart`](#linechart) | Rank over time as a bump chart — convert values with `utils.convertToRanks` and use `curve: "bumpX"` |
| [`BarChart`](#barchart) | A single ranked snapshot, sorted by value |

### When did events happen, and for how long?

| Chart | Choose it when |
| --- | --- |
| [`TimeLineChart`](#timelinechart) | Events or durations per row on a shared time axis, e.g. call logs or Gantt-style spans |

### What is connected to what?

| Chart | Choose it when |
| --- | --- |
| [`Network`](#network) | Nodes and edges, force-directed by default and optionally pinned to x/y scales |

## Chart reference

### AreaChart

Plots series as filled bands over a shared axis, showing a trend and the composition of a total at the same time.

**Category:** `linear` · **Answers:** `trend`, `composition` · **Storybook:** Linear/AreaChart/Intro

**Also called:** area graph, stacked area chart, mountain chart

**Use when**

- Both the overall trend and each series’ share of it need to be visible at once
- Series are stacked parts of a meaningful total, e.g. revenue by product line
- Relative share matters more than absolute values — set `stacking.type: "100%"`
- A single series should read as volume or magnitude rather than a bare line

**Do not use when**

- Series need to be compared precisely against each other — stacked bands make all but the bottom one hard to read; use LineChart
- Series can be negative and would overlap confusingly — use LineChart, or `stacking.type: "diverging"`
- The x axis is categorical rather than continuous — use ColumnChartStacked
- There is a single series and no notion of a total — use LineChart

**Data**

- `data` shape: records
- Series: ideal 2–6, min 1, max 10
- Rows: ideal 4–100, min 2

| Prop | Role | Required | Notes |
| --- | --- | --- | --- |
| `x` | temporal | yes | Single key for the shared axis, typically time or period. |
| `y` | series | yes | Array of series configs, one per band, drawn bottom-up in the order given. |

**Required props:** `id`, `data`, `x`, `y`

```tsx
<AreaChart
  id="revenue-by-product"
  className="w-full h-64"
  data={data}
  x={{ key: 'year' }}
  y={[
    { key: 'iphone', className: 'text-purple-900' },
    { key: 'macbook', className: 'text-purple-700' },
    { key: 'ipad', className: 'text-purple-500' },
  ]}
/>
```

#### Streamgraph (AreaChart)

A stacked area chart with a centred, flowing baseline instead of a flat one, emphasising the shape of each band over its exact value.

**Also called:** stream graph, theme river, stream chart

**Configuration:** Set `stacking={{ type: "streamgraph" }}`. Bands are ordered inside-out and offset by wiggle.

**Use when**

- Many series need showing over a long span and the rise and fall of each is the story
- Relative movement matters more than reading any single value
- The total is large and volatile, so a flat baseline would waste vertical space

**Do not use when**

- Any value must be read off the chart — no band sits on a fixed baseline; use a plain stacked AreaChart
- There are only two or three series — the organic shape adds nothing over a normal stack
- The audience needs the total, which a wiggle baseline obscures

```tsx
<AreaChart
  id="genre-streamgraph"
  className="w-full h-64"
  data={data}
  x={{ key: 'year' }}
  y={[
    { key: 'iphone', className: 'text-purple-900' },
    { key: 'macbook', className: 'text-purple-700' },
    { key: 'ipad', className: 'text-purple-500' },
  ]}
  stacking={{ type: 'streamgraph' }}
/>
```

#### 100% stacked area chart (AreaChart)

A stacked area chart normalised so every period fills the full height, showing share rather than absolute value.

**Also called:** percentage area chart, normalised area chart, share of total area chart

**Configuration:** Set `stacking={{ type: "100%" }}`. The y axis becomes 0–100% of the period total.

**Use when**

- The mix matters and the absolute total does not
- Totals differ so much between periods that a plain stack would hide the smaller ones
- Showing how composition shifted over time, e.g. market share

**Do not use when**

- The total is part of the story — normalising deletes it; use a plain stacked AreaChart
- A shrinking absolute value could be mistaken for a growing one because its share rose

```tsx
<AreaChart
  id="market-share"
  className="w-full h-64"
  data={data}
  x={{ key: 'year' }}
  y={[
    { key: 'iphone', className: 'text-purple-900' },
    { key: 'macbook', className: 'text-purple-700' },
  ]}
  stacking={{ type: '100%' }}
/>
```

#### Diverging area chart (AreaChart)

A stacked area chart that splits around a zero baseline, stacking positive series upward and negative ones downward.

**Also called:** diverging stacked area chart, bidirectional area chart

**Configuration:** Set `stacking={{ type: "diverging" }}`. Series order is reversed so positive and negative stacks mirror each other.

**Use when**

- Series contain both gains and losses that should stack away from zero
- Net position against zero is the message, e.g. inflows against outflows

**Do not use when**

- All values share a sign — the diverging offset then behaves as a plain stack with confusing ordering

```tsx
<AreaChart
  id="flows"
  className="w-full h-64"
  data={data}
  x={{ key: 'year' }}
  y={[
    { key: 'inflow', className: 'text-green-700' },
    { key: 'outflow', className: 'text-red-700' },
  ]}
  stacking={{ type: 'diverging' }}
/>
```

#### Time-scaled area chart (AreaChart)

An area chart whose x axis parses real dates rather than treating the key as a plain number.

**Also called:** time series area chart

**Configuration:** Set `x.scalingFunction: "time"` with `x.time.format`, or `x.time.isISO` for ISO strings.

**Use when**

- The x values are dates and the spacing between them is uneven
- Axis ticks should fall on real date boundaries

```tsx
<AreaChart
  id="daily-volume"
  className="w-full h-64"
  data={data}
  x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
  y={[{ key: 'volume', className: 'text-blue-500' }]}
/>
```

**Consider instead**

- [`LineChart`](#linechart) — series must be compared precisely, or there is no meaningful total
- [`ColumnChartStacked`](#columnchartstacked) — the x axis is categorical rather than continuous
- [`PieChart`](#piechart) — showing composition at one point in time only

### BarChart

Horizontal bars comparing one or more measures across categories, with room for long category labels.

**Category:** `linear` · **Answers:** `comparison`, `distribution`, `ranking` · **Storybook:** Linear/BarChart/Intro

**Also called:** horizontal bar chart, grouped bar chart, ranked bar chart

**Use when**

- Category labels are long enough that vertical bars would truncate or rotate them
- There are more categories than vertical bars can hold (roughly 12 or more)
- Presenting a ranked list, sorted by value
- Showing a histogram horizontally — set `bin` on the first `x` entry and bar lengths become counts
- Bars should grow leftward from the right edge — set `direction: "left"`

**Do not use when**

- The x axis is time — a horizontal bar per period breaks the reading order; use LineChart or ColumnChart
- Measures are parts of a whole — use BarChartStacked so the total is readable
- Labels are short and there are few categories — ColumnChart is the more conventional read
- Two measures should read outward from a shared centre — use SpineChart

**Data**

- `data` shape: records
- Series: ideal 1–4, min 1, max 6
- Rows: ideal 2–25, max 40 — Past ~40 rows the chart needs scrolling — bin the values instead.

| Prop | Role | Required | Notes |
| --- | --- | --- | --- |
| `y` | category | yes | Single key holding the category label for each row; becomes the vertical axis. |
| `x` | series | yes | Array of numeric keys; one bar per key per category. Each entry also takes `rx` for rounded ends. |

**Required props:** `id`, `data`, `x`, `y`

```tsx
<BarChart
  id="sales-by-region"
  className="w-full h-64"
  data={data}
  y={{ key: 'region' }}
  x={[{ key: 'revenue', className: 'fill-blue-500' }]}
/>
```

#### Horizontal histogram (BarChart)

Bins raw continuous values and draws the count per bin as horizontal bars, with bin ranges as labels down the y axis.

**Also called:** binned bar chart, horizontal frequency distribution

**Configuration:** Set `bin` on the first `x` entry: `x={[{ key: "score", bin: { count: 8 } }]}`. Bin labels move to the y axis automatically.

**Use when**

- A distribution has many bins, which fit better stacked vertically than squeezed across
- Bin range labels are long, e.g. "10,000–20,000"

**Do not use when**

- The conventional histogram orientation is expected — use ColumnChart with `x.bin`
- The x values are already categorical rather than continuous

```tsx
<BarChart
  id="score-histogram"
  className="w-full h-64"
  data={rawRows}
  x={[{ key: 'score', bin: { count: 8 }, className: 'fill-blue-500' }]}
  y={{ key: 'count' }}
/>
```

#### Diverging bar chart (BarChart)

Bars growing left and right of a zero baseline, with negative values styled separately to show direction of change.

**Also called:** tornado chart, bidirectional bar chart, deviation chart

**Configuration:** Supply negative values in the data, set `start`/`end` on the series to pin a symmetric axis, and style with `className` plus `classNameNegative`.

**Use when**

- Values are changes against a baseline and the sign is the message, e.g. year-on-year delta
- Gains and losses should be distinguishable at a glance by colour and direction

**Do not use when**

- All values share a sign — nothing diverges, so use a plain BarChart
- The two directions are separate measures rather than one signed measure — use SpineChart

```tsx
<BarChart
  id="yoy-change"
  className="w-full h-64"
  data={data}
  x={[{
    key: 'delta',
    className: 'text-green-500',
    classNameNegative: 'text-red-500',
    start: -10,
    end: 10,
    axis: { location: 'top' },
  }]}
  y={{ key: 'year', padding: 10 }}
/>
```

**Options**

- **Data labels** — Pass `dataLabel={{ className: "fill-white text-xs" }}` to print values on the bars.
- **Right-to-left** — Set `direction="left"` to anchor bars at the right edge.

**Consider instead**

- [`ColumnChart`](#columnchart) — few categories with short labels
- [`BarChartStacked`](#barchartstacked) — measures are parts of a whole
- [`LollipopHChart`](#lollipophchart) — bars look heavy and the value point is the focus
- [`SpineChart`](#spinechart) — two opposing measures per category

### BarChartStacked

Horizontal bars where measures stack end to end, showing the total per category and its breakdown.

**Category:** `linear` · **Answers:** `composition`, `comparison` · **Storybook:** Linear/BarChartStacked/Intro

**Also called:** stacked bar chart, horizontal stacked bar chart

**Use when**

- Composition needs comparing across categories whose labels are long
- Both the total and the proportions within each bar matter
- Showing a waterfall of running gains and losses — set `waterfall`

**Do not use when**

- Segments need precise comparison across categories — only the first segment shares a baseline; use BarChart grouped
- Labels are short and few — ColumnChartStacked reads more conventionally
- There is one category only — use PieChart

**Data**

- `data` shape: records
- Series: ideal 2–6, min 2, max 8
- Rows: ideal 2–25, max 40

| Prop | Role | Required | Notes |
| --- | --- | --- | --- |
| `y` | category | yes | Single key holding the category label for each row. |
| `x` | series | yes | Array of numeric keys, stacked left to right in the order given. |

**Required props:** `id`, `data`, `x`, `y`

```tsx
<BarChartStacked
  id="revenue-by-region"
  className="w-full h-64"
  data={data}
  y={{ key: 'year' }}
  x={[
    { key: 'macbook', className: 'fill-purple-800' },
    { key: 'iphone', className: 'fill-purple-600' },
  ]}
/>
```

#### Horizontal waterfall chart (BarChartStacked)

Floating horizontal bars where each segment continues from the previous total, showing how a figure is built up step by step.

**Also called:** horizontal bridge chart, horizontal cascade chart

**Configuration:** Set `waterfall` on a BarChartStacked. Each `x` series becomes a step rather than a segment stacked from the baseline.

**Use when**

- Explaining a running total through successive gains and losses, where step labels are long
- The sequence reads better vertically down the page than across it

**Do not use when**

- The series are independent categories with no running total — use a plain BarChart
- Labels are short, in which case ColumnChartStacked in waterfall mode is the conventional read

```tsx
<BarChartStacked
  id="profit-walk"
  className="w-full h-64"
  data={data}
  waterfall
  y={{ key: 'year' }}
  x={[
    { key: 'macbook', className: 'fill-green-600' },
    { key: 'iphone', className: 'fill-red-500' },
  ]}
/>
```

**Options**

- **Reference lines** — Pass `referenceLines` to mark targets across the value axis.
- **Data labels** — Pass `dataLabel` to print segment values inside the bars.

**Consider instead**

- [`BarChart`](#barchart) — segments must be compared precisely rather than summed
- [`ColumnChartStacked`](#columnchartstacked) — short labels and few categories
- [`PieChart`](#piechart) — a single whole at one point in time

### ColumnChart

Vertical bars comparing one or more measures across categories; grouped side by side when several measures are passed.

**Category:** `linear` · **Answers:** `comparison`, `distribution` · **Storybook:** Linear/ColumnChartGrouped

**Also called:** vertical bar chart, grouped column chart, clustered column chart

**Use when**

- Comparing a numeric measure across a modest number of categories with short labels
- Several measures need comparing within each category, side by side
- The categories are periods (years, quarters) and individual values matter more than the trend line
- Showing a histogram of raw continuous values — set `x.bin` and pass `y={[{ key: "count" }]}`

**Do not use when**

- Category labels are long or there are more than ~20 categories — use BarChart, where horizontal bars give labels room
- The measures are parts of one whole — use ColumnChartStacked so the total is readable
- The x axis is continuous time with many points — use LineChart
- The bars would be nearly equal in height, making differences invisible — use LollipopVChart or a dot-based chart

**Data**

- `data` shape: records
- Series: ideal 1–4, min 1, max 6 — Groups wider than ~4 bars get hard to scan.
- Rows: ideal 2–12, max 20 — Past ~20 categories the labels collide — switch to BarChart.

| Prop | Role | Required | Notes |
| --- | --- | --- | --- |
| `x` | category | yes | Single key holding the category label for each row. |
| `y` | series | yes | Array of numeric keys; one bar per key per category, drawn as a group. |

**Required props:** `id`, `data`, `x`, `y`

```tsx
<ColumnChart
  id="sales-by-year"
  className="w-full h-64"
  data={data}
  x={{ key: 'year' }}
  y={[
    { key: 'macbook', className: 'fill-purple-800' },
    { key: 'iphone', className: 'fill-purple-600' },
  ]}
/>
```

#### Histogram (ColumnChart)

Bins raw continuous values into ranges and plots how many records fall into each, showing the shape of a distribution.

**Also called:** frequency distribution, binned column chart, frequency chart

**Configuration:** Set `x={{ key: "score", bin: { count: 8 } }}` and `y={[{ key: "count" }]}`. Pass the raw rows as `data` — binning and counting happen internally. Use `bin.thresholds` for explicit edges.

**Use when**

- The data is raw measurements and the question is how they are spread, not what each one is
- Skew, spread, gaps or multiple peaks need to be visible
- Bin width should be tuned to reveal structure — adjust `bin.count`

**Do not use when**

- The x values are already categories — a histogram bins continuous data; use a plain ColumnChart
- Groups need comparing by their summary statistics rather than their full shape — use BoxPlotV
- There are too few records for bin heights to mean anything

```tsx
<ColumnChart
  id="score-histogram"
  className="w-full h-64"
  data={rawRows}
  x={{ key: 'score', bin: { count: 8 }, axis: { label: 'Score' } }}
  y={[{ key: 'count', className: 'text-blue-500' }]}
/>
```

**Options**

- **Reference lines** — Pass `referenceLines={[{ y: 50, className: "stroke-red-500" }]}`.
- **Whole numbers** — Set `wholeNumbers` to force integer ticks on the value axis.

**Consider instead**

- [`BarChart`](#barchart) — long labels or many categories
- [`ColumnChartStacked`](#columnchartstacked) — measures are parts of a whole
- [`LollipopVChart`](#lollipopvchart) — bars look heavy and values are the focus
- [`LineChart`](#linechart) — the axis is continuous time with many points

### ColumnChartStacked

Vertical bars where each measure stacks on the previous one, showing both the total per category and its composition.

**Category:** `linear` · **Answers:** `composition`, `comparison` · **Storybook:** Linear/ColumnChartStacked

**Also called:** stacked column chart, stacked bar chart (vertical)

**Use when**

- The total per category matters as much as its breakdown
- Segments are genuinely parts of one whole, not independent measures
- Showing a waterfall of running gains and losses — set `waterfall`

**Do not use when**

- Individual segments need precise comparison across categories — only the bottom segment shares a baseline; use ColumnChart grouped
- Category labels are long or numerous — use BarChartStacked
- There is one category only — use PieChart
- The axis is continuous time — use AreaChart, which reads as a flow rather than discrete totals

**Data**

- `data` shape: records
- Series: ideal 2–6, min 2, max 8
- Rows: ideal 2–12, max 20

| Prop | Role | Required | Notes |
| --- | --- | --- | --- |
| `x` | category | yes | Single key holding the category label for each row. |
| `y` | series | yes | Array of numeric keys, stacked bottom-up in the order given. |

**Required props:** `id`, `data`, `x`, `y`

```tsx
<ColumnChartStacked
  id="revenue-split"
  className="w-full h-64"
  data={data}
  x={{ key: 'year' }}
  y={[
    { key: 'macbook', className: 'fill-purple-800' },
    { key: 'iphone', className: 'fill-purple-600' },
    { key: 'ipad', className: 'fill-purple-400' },
  ]}
/>
```

#### Waterfall chart (ColumnChartStacked)

Floating columns where each segment starts where the previous one ended, showing how a running total is built up from successive gains and losses.

**Also called:** waterfall, bridge chart, cascade chart, flying bricks chart

**Configuration:** Set `waterfall` on a ColumnChartStacked. Each `y` series becomes a step in the sequence rather than a segment stacked from the baseline.

**Use when**

- Explaining how a starting figure becomes an ending figure through a sequence of contributions
- Each step is a gain or a loss against a running total, e.g. revenue bridge or profit walk
- The order of the steps carries meaning and should be read left to right

**Do not use when**

- The series are independent categories with no running total — use a plain grouped ColumnChart
- The order of steps is arbitrary, which makes the bridge metaphor meaningless
- Category labels are long — use BarChartStacked in waterfall mode instead

```tsx
<ColumnChartStacked
  id="revenue-bridge"
  className="w-full h-64"
  data={data}
  waterfall
  x={{ key: 'year' }}
  y={[
    { key: 'macbook', className: 'fill-green-600' },
    { key: 'iphone', className: 'fill-green-500' },
    { key: 'ipad', className: 'fill-red-500' },
  ]}
/>
```

**Options**

- **Reference lines** — Pass `referenceLines={[{ y: 100, className: "stroke-red-500" }]}`.

**Consider instead**

- [`ColumnChart`](#columnchart) — segments must be compared precisely across categories
- [`BarChartStacked`](#barchartstacked) — long category labels
- [`AreaChart`](#areachart) — the axis is continuous time
- [`PieChart`](#piechart) — a single whole at one point in time

### LineChart

Plots one or more numeric series against a shared ordered or time axis to show how values move.

**Category:** `linear` · **Answers:** `trend`, `ranking` · **Storybook:** Linear/LineChart/Intro

**Also called:** line graph, multi-line chart, trend line chart

**Use when**

- The x axis is time or another continuous ordered dimension and the shape of the movement is the point
- Several series must be compared against each other over the same axis
- Two measures on different scales need separate left and right axes (set `axis.location: "right"` on the second series)
- Gaps in the data should break the line — missing keys are skipped rather than zeroed

**Do not use when**

- The x axis is categorical with no inherent order — use ColumnChart or BarChart, since a line implies continuity that is not there
- The split of a total matters as much as the trend — use AreaChart
- There are only two or three points per series — use ColumnChart, where individual values are easier to read
- The data is discrete events or durations rather than a measured value — use TimeLineChart

**Data**

- `data` shape: records
- Series: ideal 1–5, min 1, max 8 — Beyond ~8 lines the chart becomes a hairball; facet instead.
- Rows: ideal 5–200, min 2, max 1000

| Prop | Role | Required | Notes |
| --- | --- | --- | --- |
| `x` | temporal | yes | Single key for the shared axis. Set `scalingFunction: "time"` with `time.format` for dates; otherwise treated as linear. |
| `y` | series | yes | Array of series configs, one per line. Each takes `className`, `curve`, `symbol` and an optional `axis.location: "right"` for a second scale. |

**Required props:** `id`, `data`, `x`, `y`

```tsx
<LineChart
  id="revenue-trend"
  className="w-full h-64"
  data={data}
  x={{ key: 'month' }}
  y={[
    { key: 'revenue', className: 'text-blue-500' },
    { key: 'forecast', className: 'text-gray-400', curve: 'step' },
  ]}
/>
```

#### Bump chart (LineChart)

Plots rank rather than value over time, so lines cross when entities overtake one another.

**Also called:** rank chart, ranking chart, bump plot, rank over time

**Configuration:** Convert values to ranks with `utils.convertToRanks(data, y, x)` — it takes the same `y` array and `x` object you pass to the chart — then set `curve: "bumpX"` and `label: { show: true }` on each series, and `reverse` so rank 1 sits at the top.

**Use when**

- Changes in ordering are the story, not the size of the underlying values
- Entities are closely bunched, so a value chart would be an unreadable tangle
- Overtaking events should be visible as line crossings

**Do not use when**

- The size of the gap between entities matters — ranking discards magnitude entirely; use a plain LineChart
- There are too many entities for the crossings to be followable

```tsx
import { utils } from '@headless-charts/react';

const x = { key: 'year' };
const y = [
  { key: 'macbook', curve: 'bumpX', label: { show: true } },
  { key: 'iphone', curve: 'bumpX', label: { show: true } },
];

<LineChart
  id="rank-over-time"
  className="w-full h-64"
  data={utils.convertToRanks(data, y, x)}
  x={x}
  y={y}
  reverse
  yLeftLabel="rank"
/>
```

#### Step chart (LineChart)

Joins points with horizontal and vertical segments rather than diagonals, showing a value that holds constant then jumps.

**Also called:** step line chart, staircase chart

**Configuration:** Set `curve: "step"` on each series.

**Use when**

- The value genuinely holds constant between readings, e.g. a price or a rate that changes at discrete moments
- Interpolating between points would imply change that did not happen

**Do not use when**

- The underlying quantity varies continuously — a step then misrepresents it; use the default line

```tsx
<LineChart
  id="rate-changes"
  className="w-full h-64"
  data={data}
  x={{ key: 'date' }}
  y={[{ key: 'rate', curve: 'step', className: 'text-blue-500' }]}
/>
```

#### Dual-axis line chart (LineChart)

Plots two series against independent left and right scales so measures in different units can share one plot.

**Also called:** two axis chart, secondary axis chart, combo chart

**Configuration:** Give the second series `axis: { location: "right" }` and widen `margin.right`. Label the scales with `yLeftLabel` and `yRightLabel`.

**Use when**

- Two related measures use different units or magnitudes, e.g. revenue and conversion rate
- The correlation in shape between the two is the point

**Do not use when**

- The two scales could be made comparable — independent axes let any two series be made to look correlated by choosing scales
- More than two measures are involved; a third scale is unreadable

```tsx
<LineChart
  id="revenue-vs-rate"
  className="w-full h-64"
  data={data}
  margin={{ right: 40 }}
  yLeftLabel="Revenue"
  yRightLabel="Conversion"
  x={{ key: 'month' }}
  y={[
    { key: 'revenue', className: 'text-green-500' },
    { key: 'conversion', className: 'text-blue-500', axis: { location: 'right' } },
  ]}
/>
```

#### Time-scaled line chart (LineChart)

A line chart whose x axis parses real dates rather than treating the key as a plain number.

**Also called:** time series chart, time series line chart

**Configuration:** Set `x.scalingFunction: "time"` and `x.time.format` (or `x.time.isISO`) to parse date strings.

**Use when**

- The x values are dates and the gaps between them are uneven
- Ticks should land on real date boundaries rather than arbitrary numbers

```tsx
<LineChart
  id="daily-signups"
  className="w-full h-64"
  data={data}
  x={{ key: 'date', scalingFunction: 'time', time: { isISO: true } }}
  y={[{ key: 'signups', className: 'text-blue-500' }]}
/>
```

**Options**

- **Curved lines** — Set `curve: "rounded"` for Catmull-Rom smoothing, or `"line"` for plain straight segments.
- **Reference lines** — Pass `referenceLines={[{ yLeft: 100, className: "stroke-red-500" }]}`.

**Consider instead**

- [`AreaChart`](#areachart) — volume under the curve or composition of a total matters
- [`ColumnChart`](#columnchart) — few discrete periods, individual values matter more than the trend
- [`TimeLineChart`](#timelinechart) — plotting events and durations rather than a continuous measure
- [`ScatterPlot`](#scatterplot) — the x axis is a measure rather than time, and points should not be joined

### LollipopHChart

Horizontal stems ending in a symbol, marking one value per category with far less ink than a bar.

**Category:** `linear` · **Answers:** `comparison`, `ranking` · **Storybook:** Linear/LollipopHChart

**Also called:** horizontal lollipop chart, lollipop chart, stem plot

**Use when**

- There are many categories and a wall of bars would look heavy
- The exact value point matters more than the magnitude-as-area a bar implies
- Category labels are long enough to need horizontal orientation
- Values are clustered in a narrow band where bar lengths would look nearly identical

**Do not use when**

- Several measures need comparing per category — a lollipop carries one value; use BarChart
- The magnitude should read as accumulated quantity — bars encode that better
- The axis is time — use LineChart
- A vertical layout is wanted — use LollipopVChart

**Data**

- `data` shape: records
- Series: min 1, max 1 — One value per category; use BarChart for multiple measures.
- Rows: ideal 5–30, max 50 — Lollipops stay legible where bars would look like a solid block.

| Prop | Role | Required | Notes |
| --- | --- | --- | --- |
| `y` | category | yes | Single key holding the category label for each row. |
| `x` | quantitative | yes | Single numeric key. Set `start: 0` to anchor stems at zero. |
| `shape` | shape | no | Symbol at the end of each stem: circle (default), diamond, triangle, square, cross, star or wye. |

**Required props:** `id`, `data`, `x`, `y`

```tsx
<LollipopHChart
  id="scores-by-team"
  className="w-full h-64"
  data={data}
  y={{ key: 'name' }}
  x={{ key: 'value', start: 0 }}
/>
```

**Options**

- **Custom symbol** — Pass `shape="diamond"` (or star, triangle, square, cross, wye).
- **Axis labels** — Set `x.axis.label` and `y.axis.label` to title each axis.
- **Styling** — Use `classNames.classNameLines` and `classNames.classNameSymbols` to style stems and heads separately.

**Consider instead**

- [`BarChart`](#barchart) — multiple measures per category, or magnitude should read as area
- [`LollipopVChart`](#lollipopvchart) — a vertical layout fits the space better
- [`RangePlot`](#rangeplot) — each category has an interval rather than a single value

### LollipopVChart

Vertical stems ending in a symbol, marking one value per category with far less ink than a column.

**Category:** `linear` · **Answers:** `comparison`, `ranking` · **Storybook:** Linear/LollipopVChart

**Also called:** vertical lollipop chart, stem and dot chart

**Use when**

- A column chart would look heavy but the vertical orientation should be kept
- The value point matters more than magnitude-as-area
- Category labels are short enough to sit under vertical stems

**Do not use when**

- Several measures need comparing per category — use ColumnChart
- Category labels are long — use LollipopHChart
- The axis is continuous time — use LineChart

**Data**

- `data` shape: records
- Series: min 1, max 1
- Rows: ideal 5–20, max 30

| Prop | Role | Required | Notes |
| --- | --- | --- | --- |
| `x` | category | yes | Single key holding the category label for each row. |
| `y` | quantitative | yes | Single numeric key. Set `start: 0` to anchor stems at zero. |
| `shape` | shape | yes | Symbol at the end of each stem: circle, diamond, triangle, square, cross, star or wye. Unlike LollipopHChart this prop has no default. |

**Required props:** `id`, `data`, `x`, `y`, `shape`

```tsx
<LollipopVChart
  id="readings-by-name"
  className="w-full h-64"
  data={data}
  shape="circle"
  x={{ key: 'name', axis: { location: 'bottom' } }}
  y={{ key: 'reading', start: 0, axis: { location: 'left' } }}
/>
```

**Options**

- **Custom symbol** — Pass `shape="star"` (or diamond, triangle, square, cross, wye).
- **Styling** — Use `classNames.classNameLines` and `classNames.classNameSymbols` to style stems and heads separately.
- **Fixed value range** — Pass `valueMin` and `valueMax` to pin the value axis.

**Consider instead**

- [`ColumnChart`](#columnchart) — multiple measures per category, or magnitude should read as area
- [`LollipopHChart`](#lollipophchart) — category labels are long
- [`ScatterPlot`](#scatterplot) — both axes are numeric rather than one being categorical

### SpineChart

Bars growing outward in both directions from a shared centre axis, comparing opposing measures per category.

**Category:** `linear` · **Answers:** `comparison`, `composition` · **Storybook:** Linear/SpineChart

**Also called:** population pyramid, age-sex pyramid, butterfly chart, back-to-back bar chart

**Use when**

- Two groups are being contrasted on the same measure, e.g. a population pyramid by sex or this year against last
- The symmetry of the split is itself the message
- Categories share a scale and both sides should be read against the same axis

**Do not use when**

- There is no natural opposition between the measures — the mirrored layout implies one; use BarChart
- More than a few measures per side are needed — the spine gets crowded; use BarChart grouped
- The measures are parts of one whole rather than two sides — use BarChartStacked

**Data**

- `data` shape: records
- Series: ideal 2–4, min 2, max 6
- Rows: ideal 3–20, max 30

| Prop | Role | Required | Notes |
| --- | --- | --- | --- |
| `y` | category | yes | Single key for the category label. Set `axis.location: "middle"` to put labels on the spine itself, or "left"/"right" to move them aside. |
| `x` | series | yes | Array of numeric keys, each with `direction: "left" | "right"` deciding which side of the spine it grows toward. |

**Required props:** `id`, `data`, `x`, `y`

```tsx
<SpineChart
  id="population-pyramid"
  className="w-full h-64"
  data={data}
  y={{ key: 'ageGroup', axis: { location: 'middle' } }}
  x={[
    { key: 'male', direction: 'left', className: 'fill-blue-700' },
    { key: 'female', direction: 'right', className: 'fill-pink-500' },
  ]}
/>
```

**Options**

- **Labels aside** — Set `y.axis.location` to "left" or "right" to move category labels off the spine.
- **Centre gap** — Use `margin.middle` to widen the gap between the two sides.
- **Axis on top** — Set `xAxis="top"` to move the value axis above the plot.

**Consider instead**

- [`BarChart`](#barchart) — the measures are not naturally opposed
- [`BarChartStacked`](#barchartstacked) — the measures are parts of one whole
- [`CometPlot`](#cometplot) — showing movement between two states rather than two independent measures

### TimeLineChart

Places discrete events and durations on a shared time axis, one lane per category.

**Category:** `linear` · **Answers:** `schedule`, `trend` · **Storybook:** Linear/TimeLineChart/Intro

**Also called:** timeline, event plot, activity timeline

**Use when**

- The data is events with timestamps rather than a measured value sampled over time
- Durations need to be visible as spans — pass both `startKey` and `endKey`
- Activity should be compared across lanes, e.g. calls per line, jobs per worker
- Building a Gantt-style view of overlapping work

**Do not use when**

- A continuous quantity is being tracked over time — use LineChart or AreaChart
- Only counts per period matter, not individual events — aggregate and use ColumnChart
- There is no time dimension at all — this chart has no meaning without one

**Data**

- `data` shape: records
- Rows: ideal 1–30, max 60 — One lane per distinct y value.

| Prop | Role | Required | Notes |
| --- | --- | --- | --- |
| `y` | category | no | Key whose values become the lanes (rows) of the timeline. |
| `events.startKey` | temporal | yes | Key holding the event start. Set `events.isTime` when the values are dates. |
| `events.endKey` | temporal | no | Key holding the event end. Omit for point events rather than spans. |
| `events.shapeKey` | shape | no | Key selecting the mark per event via `shapeMapping` — circle, rect or line. |

**Required props:** `id`, `data`, `events`

```tsx
<TimeLineChart
  id="call-timeline"
  className="w-full h-64"
  data={data}
  y={{ key: 'agent' }}
  events={{
    startKey: 'callStartTime',
    endKey: 'callEndTime',
    isTime: true,
  }}
/>
```

#### Gantt chart (TimeLineChart)

Draws each row’s work as a horizontal bar spanning its start and end dates, one lane per resource or task.

**Also called:** gantt, schedule chart, project timeline, swimlane chart

**Configuration:** Pass both `events.startKey` and `events.endKey` with `events.isTime: true`, and set `y` to the lane key. Spans render as rects; overlapping work in a lane is visible as stacked bars.

**Use when**

- Work has a start and an end and the overlap between items is the question
- Scheduling, capacity or utilisation needs to be read per lane
- Durations differ enough that their relative length carries meaning

**Do not use when**

- Items are instants rather than spans — omit `endKey` for a point-event timeline instead
- Dependencies between tasks are the real subject; this chart draws no links between bars

```tsx
<TimeLineChart
  id="project-gantt"
  className="w-full h-64"
  data={tasks}
  y={{ key: 'owner' }}
  events={{
    startKey: 'start',
    endKey: 'end',
    isTime: true,
    classNameKey: 'status',
    classNameMapping: { done: 'fill-green-500', active: 'fill-blue-500' },
  }}
/>
```

**Options**

- **Point events** — Omit `events.endKey` and set `events.sizeKey` to size circular markers.
- **Mixed marks** — Set `events.shapeKey` with `events.shapeMapping` to draw circle, rect or line per event type.
- **Colour by type** — Set `events.classNameKey` with `events.classNameMapping`.

**Consider instead**

- [`LineChart`](#linechart) — tracking a measured value over time rather than discrete events
- [`ColumnChart`](#columnchart) — event counts per period are enough
- [`RangePlot`](#rangeplot) — intervals are numeric ranges rather than moments in time

### PieChart

Divides a circle into slices sized by value, showing how much each category contributes to one whole.

**Category:** `distribution` · **Answers:** `composition` · **Storybook:** Distribution/PieChart/Intro

**Also called:** circle chart, part-to-whole chart

**Use when**

- The values are parts of a single whole and sum to something meaningful
- There are roughly six or fewer categories
- The rough share of one or two dominant slices is the message, not precise comparison
- A seating or parliament metaphor fits — set `startAngle`/`endAngle` for a semicircle

**Do not use when**

- Slices need precise comparison — angles are read far less accurately than lengths; use BarChart or ColumnChart
- The values do not sum to a meaningful whole, e.g. independent metrics or averages
- Composition must be compared across categories or over time — use ColumnChartStacked or AreaChart
- Any value is negative — a slice cannot represent it

**Data**

- `data` shape: records
- Rows: ideal 2–6, max 8 — Beyond ~8 slices, angles stop being distinguishable.

| Prop | Role | Required | Notes |
| --- | --- | --- | --- |
| `nameKey` | category | yes | Key holding the slice label. |
| `valueKey` | quantitative | yes | Key holding the slice size. Values are summed to form the whole. |
| `classNameMap` | color | no | Maps each name value to a fill class; nothing is coloured by default. |

**Required props:** `id`, `data`, `nameKey`, `valueKey`

```tsx
<PieChart
  id="revenue-share"
  className="w-full h-64"
  data={data}
  nameKey="product"
  valueKey="revenue"
  classNameMap={{ macbook: 'fill-purple-300', iphone: 'fill-purple-800' }}
/>
```

#### Donut chart (PieChart)

A pie chart with a hollow centre, which reads share by arc length rather than by wedge area and frees the middle for a total.

**Also called:** doughnut chart, ring chart

**Configuration:** Set `innerRadius` above 0. Values are a fraction of `outerRadius`, so `innerRadius={0.5}` hollows half the radius.

**Use when**

- The same part-to-whole story as a pie, but the centre should carry a headline figure or label
- Slices are thin and the reduced centre clutter helps

**Do not use when**

- Precise comparison is needed — a donut is no more accurate than a pie; use BarChart
- There are many slices, which a donut makes harder to read rather than easier

```tsx
<PieChart
  id="revenue-donut"
  className="w-full h-64"
  data={data}
  nameKey="product"
  valueKey="revenue"
  innerRadius={0.5}
  cornerRadius={4}
  paddingAngle={2}
/>
```

#### Semicircle chart (PieChart)

A pie swept through 180° rather than 360°, echoing a parliamentary seating plan.

**Also called:** half donut chart, parliament chart, hemicycle chart, seat chart, gauge donut

**Configuration:** Set `startAngle={-90}` and `endAngle={90}`. Combine with `innerRadius` for a half donut.

**Use when**

- Showing seat shares, poll results or any split with a parliamentary metaphor
- The chart must sit in a wide, short space where a full circle would not fit

**Do not use when**

- There is no seating or directional metaphor — the half circle then just halves the resolution for no reason

```tsx
<PieChart
  id="seat-share"
  className="w-full h-64"
  data={data}
  nameKey="party"
  valueKey="seats"
  startAngle={-90}
  endAngle={90}
/>
```

**Options**

- **Rounded slices** — Set `cornerRadius` and `paddingAngle` to separate and round the slices.
- **Unsorted** — Set `sort={false}` to keep data order instead of sorting by value descending.

**Consider instead**

- [`ColumnChartStacked`](#columnchartstacked) — composition compared across several categories or periods
- [`BarChart`](#barchart) — slices need precise comparison
- [`WaffleChart`](#wafflechart) — part-to-whole shown as countable cells rather than angles

### ScatterPlot

One point per record positioned by two measures, revealing correlation, clusters and outliers.

**Category:** `distribution` · **Answers:** `correlation`, `distribution` · **Storybook:** Distribution/ScatterPlot/Intro

**Also called:** scatter chart, scatter graph, xy plot, correlation plot

**Use when**

- The question is whether and how two measures move together
- Outliers or clusters need to be visible as individual records
- Up to five dimensions must share one plot — x, y, size, colour and shape
- Points should be joined in data order to show a path over time — set `connect.enabled`
- Point density matters more than individual records — set `x.bin` or `y.bin` for a binned heatmap

**Do not use when**

- One axis is categorical rather than numeric — use ColumnChart or a lollipop chart
- There are only a handful of records — a table or bar chart communicates more directly
- Overplotting hides the pattern — switch to the binned heatmap mode or use WaffleChart
- The x axis is time and the sequence is the point — use LineChart

**Data**

- `data` shape: records
- Rows: ideal 20–2000, max 10000 — Past a few thousand points, bin into a heatmap.

| Prop | Role | Required | Notes |
| --- | --- | --- | --- |
| `x` | quantitative | yes | Numeric key for the horizontal position. |
| `y` | quantitative | yes | Numeric key for the vertical position. |
| `color` | color | no | Categorical key plus a `classNameMap` to colour points by group. |
| `size` | size | no | Numeric key plus `min`/`max` radius to encode a third measure as bubble size. |
| `shape` | shape | no | Second categorical key plus a `shapeMap`, useful for accessibility alongside colour. |

**Required props:** `id`, `data`, `x`, `y`

```tsx
<ScatterPlot
  id="gdp-vs-power"
  className="w-full h-64"
  data={data}
  x={{ key: 'gdp' }}
  y={{ key: 'purchasing_power' }}
  color={{ key: 'continent', classNameMap: { Asia: 'fill-red-600', Europe: 'fill-blue-600' } }}
/>
```

#### Bubble chart (ScatterPlot)

A scatter plot whose point radius encodes a third measure, showing three quantities at once.

**Also called:** bubble plot, proportional symbol chart

**Configuration:** Add `size={{ key: "population", min: 2, max: 20 }}`. Radius is scaled between `min` and `max` pixels.

**Use when**

- A third numeric dimension matters — classically GDP against life expectancy sized by population
- The relative weight of each point should temper how the x/y pattern is read

**Do not use when**

- The third measure needs reading precisely — area is judged poorly; use colour or a second chart
- Points are dense enough that large bubbles would occlude each other

```tsx
<ScatterPlot
  id="gdp-bubbles"
  className="w-full h-64"
  data={data}
  x={{ key: 'gdp' }}
  y={{ key: 'life_expectancy' }}
  size={{ key: 'population', min: 3, max: 24 }}
  color={{ key: 'continent', classNameMap: { Asia: 'fill-red-600' } }}
/>
```

#### Connected scatterplot (ScatterPlot)

A scatter plot whose points are joined in data order, tracing the path two measures took together.

**Also called:** connected scatter, path plot, trajectory plot

**Configuration:** Set `connect={{ enabled: true, className: "stroke-gray-400" }}`. Points join in the order the data is given, so sort it first.

**Use when**

- Two measures evolve together over time and the trajectory is the story
- Loops or reversals in the relationship should be visible, which a plain scatter hides

**Do not use when**

- The data has no meaningful order — the connecting line invents a sequence that does not exist
- Only one measure changes over time; use LineChart

```tsx
<ScatterPlot
  id="phillips-curve"
  className="w-full h-64"
  data={sortedByYear}
  x={{ key: 'unemployment' }}
  y={{ key: 'inflation' }}
  connect={{ enabled: true, className: 'stroke-gray-400' }}
/>
```

#### Density heatmap (ScatterPlot)

Bins points into a grid and colours each cell by how many fell into it, revealing density where individual points would overplot.

**Also called:** 2d histogram, binned scatter plot, density plot

**Configuration:** Set `x.bin` and/or `y.bin`. Cells show counts, coloured via `binColor.scale` with an optional `binColor.domain`.

**Use when**

- There are too many points to plot individually without them merging into a solid mass
- Where the data concentrates matters more than any individual record

**Do not use when**

- Outliers are the point — binning buries a single distant record in a pale cell; use a plain ScatterPlot
- There are few enough points to show individually

```tsx
<ScatterPlot
  id="density"
  className="w-full h-64"
  data={data}
  x={{ key: 'gdp', bin: { count: 12 } }}
  y={{ key: 'purchasing_power', bin: { count: 12 } }}
  binColor={{ scale: interpolateBlues }}
/>
```

**Options**

- **Zooming** — Set `zooming={{ enabled: true, min: 1, max: 8 }}` for scroll-to-zoom.
- **Click handling** — Pass `onClick={(event, d) => …}` to react to point selection.

**Consider instead**

- [`WaffleChart`](#wafflechart) — both axes are categorical or binned and density is the message
- [`LineChart`](#linechart) — x is time and the sequence matters
- [`BoxPlotV`](#boxplotv) — comparing the spread of a measure across groups rather than two measures

### WaffleChart

A grid of cells indexed by two categorical axes, with a third value encoded as cell colour — a heatmap.

**Category:** `distribution` · **Answers:** `correlation`, `distribution`, `composition` · **Storybook:** Distribution/WaffleChart/Intro

**Also called:** heatmap, categorical heatmap, matrix chart, grid chart, tile chart

**Use when**

- Two categorical dimensions cross and a magnitude sits at each intersection, e.g. month by year
- The pattern across the whole grid matters more than any single value
- Cyclical structure should be visible, such as seasonality down rows and drift across columns
- Raw continuous data needs binning on one or both axes — set `x.bin`/`y.bin` and cells show counts

**Do not use when**

- Precise values must be read off — colour is the least precise encoding; use a table or BarChart
- One axis is continuous and unbinned — use ScatterPlot
- There are only a few categories, where a grid is overkill — use ColumnChart
- The grid would be mostly empty — sparse heatmaps read as noise

**Data**

- `data` shape: records
- Rows: ideal 20–500, max 2000 — One record per (x, y) cell.

| Prop | Role | Required | Notes |
| --- | --- | --- | --- |
| `x` | category | yes | Key whose unique values become columns. Set `bin` to group a continuous field instead. |
| `y` | category | yes | Key whose unique values become rows. Set `bin` to group a continuous field instead. |
| `color` | color | yes | Key holding the cell value, plus a D3 sequential `scale` (e.g. `interpolateBlues`) or a `classNameMap` for discrete colours. |

**Required props:** `id`, `data`, `x`, `y`, `color`

```tsx
<WaffleChart
  id="temps-by-month"
  className="w-full h-64"
  data={data}
  x={{ key: 'year', axis: { location: 'bottom', label: 'Year' } }}
  y={{ key: 'month', axis: { location: 'left', label: 'Month' } }}
  color={{ key: 'temperature', scale: interpolateRdYlGn }}
/>
```

#### Calendar heatmap (WaffleChart)

A heatmap with time units on both axes — months down, years across — so seasonal cycles and long-run drift are visible at once.

**Also called:** month-year heatmap, seasonality chart, activity heatmap

**Configuration:** Map the finer time unit to `y` and the coarser to `x`, then colour by the measure. Use a diverging scale such as `interpolateRdYlGn` for values with a meaningful middle.

**Use when**

- The data is one value per period over several cycles, e.g. monthly temperature across years
- Both the within-year pattern and the across-year trend need to be readable in one view

**Do not use when**

- Only the trend matters, with no cyclical structure — use LineChart
- Periods are missing, which leaves holes that read as data rather than absence

```tsx
<WaffleChart
  id="temps-calendar"
  className="w-full h-64"
  data={data}
  x={{ key: 'year', axis: { location: 'bottom', label: 'Year' } }}
  y={{ key: 'month', axis: { location: 'left', label: 'Month' } }}
  color={{ key: 'temperature', scale: interpolateRdYlGn }}
/>
```

#### Binned 2D histogram (WaffleChart)

Groups raw continuous values into ranges on both axes and colours each cell by how many records fall in it.

**Also called:** binned heatmap, two-dimensional histogram

**Configuration:** Set `bin` on `x` and/or `y`; each cell then shows the count for that (xBin, yBin) pair rather than a value from the data.

**Use when**

- Both axes are continuous and the joint distribution is the question
- Point-level detail is unnecessary or would overplot

**Do not use when**

- Individual records must stay identifiable — use ScatterPlot
- One axis is already categorical, in which case bin only the other

```tsx
<WaffleChart
  id="joint-distribution"
  className="w-full h-64"
  data={rawRows}
  x={{ key: 'height', bin: { count: 8 } }}
  y={{ key: 'weight', bin: { count: 8 } }}
  color={{ key: 'count', scale: interpolateBlues }}
/>
```

**Options**

- **Discrete colours** — Use `color.classNameMap` instead of `color.scale` to map values to CSS classes.
- **Rounded cells** — Set `rx` for rounded corners and `gap` for spacing between cells.

**Consider instead**

- [`ScatterPlot`](#scatterplot) — axes are continuous measures rather than categories
- [`ColumnChart`](#columnchart) — only one categorical dimension is involved
- [`PieChart`](#piechart) — showing part-to-whole for a single set of categories

### BoxPlotH

Horizontal box-and-whisker marks summarising the spread of a measure per group: min, quartiles, median and max.

**Category:** `ranges` · **Answers:** `distribution`, `range` · **Storybook:** Ranges/BoxPlotH

**Also called:** horizontal box plot, box and whisker plot, quartile plot

**Use when**

- The spread of a measure needs comparing across groups, not just its average
- Median and quartiles matter — an average alone would hide skew
- Group labels are long enough to need horizontal orientation
- Statistics should be derived from raw rows — set `y.bin` with `valueKey` and they are computed automatically

**Do not use when**

- Every underlying point should be visible — use ScatterPlot
- The interval is a plain min–max rather than a statistical summary — use RangePlot
- The audience will not read quartiles; a histogram via ColumnChart with `x.bin` is more intuitive
- A vertical layout fits better — use BoxPlotV

**Data**

- `data` shape: records
- Rows: ideal 2–20, max 30

| Prop | Role | Required | Notes |
| --- | --- | --- | --- |
| `y` | category | yes | Key holding the group label; one box per group. Set `bin` here to group a continuous field into bands instead. |
| `x` | value | yes | Config naming the statistic keys: `minKey`, `maxKey`, `midKey`, `boxStart` and `boxEnd`. When `y.bin` is set these are computed internally and can be omitted. |
| `valueKey` | quantitative | no | With `y.bin` set, names the raw continuous field the box statistics are computed from. |

**Required props:** `id`, `data`, `x`, `y`

```tsx
<BoxPlotH
  id="scores-by-team"
  className="w-full h-64"
  data={data}
  y={{ key: 'name' }}
  x={{
    minKey: 'min',
    maxKey: 'max',
    midKey: 'mid',
    boxStart: 'firstQuartile',
    boxEnd: 'lastQuartile',
    min: 0,
  }}
/>
```

#### Binned box plot (BoxPlotH)

Bins a continuous field into groups and computes each group’s min, quartiles and median from the raw rows, rather than taking pre-aggregated statistics.

**Also called:** box plot from raw data, grouped distribution plot

**Configuration:** Set `bin` on the `y` (category) config and pass `valueKey` naming the field to summarise. The statistic keys on `x` are then computed internally and can be omitted.

**Use when**

- The data is raw observations and the statistics have not been computed upstream
- The grouping field is continuous, e.g. distribution of salary by age band
- Bin boundaries need tuning to see how the distribution shifts across groups

**Do not use when**

- Groups are already categorical — pass them directly with a plain `y` key instead of binning
- The statistics are already computed, in which case name the keys directly

```tsx
<BoxPlotH
  id="salary-by-age"
  className="w-full h-64"
  data={rawRows}
  valueKey="salary"
  y={{ key: 'age', bin: { count: 5 } }}
  x={{ min: 0 }}
/>
```

**Options**

- **Per-row colours** — Put a `className` field on each row to colour boxes individually.

**Consider instead**

- [`BoxPlotV`](#boxplotv) — a vertical layout fits the space better
- [`RangePlot`](#rangeplot) — showing a plain min–max interval rather than quartiles
- [`ColumnChart`](#columnchart) — a histogram of one group is enough — set `x.bin`

### BoxPlotV

Vertical box-and-whisker marks summarising the spread of a measure per group: min, quartiles, median and max.

**Category:** `ranges` · **Answers:** `distribution`, `range` · **Storybook:** Ranges/BoxPlotV

**Also called:** vertical box plot, box and whisker chart, box chart

**Use when**

- The spread of a measure needs comparing across a few groups with short labels
- Skew and outliers matter, so a mean alone would mislead
- Groups are ordered periods and the change in spread over them is the message
- Statistics should be derived from raw rows — set `x.bin` with `valueKey`

**Do not use when**

- Every underlying point should be visible — use ScatterPlot
- The interval is a plain min–max — use RangePlot
- Group labels are long — use BoxPlotH
- Only the central value matters — use ColumnChart

**Data**

- `data` shape: records
- Rows: ideal 2–15, max 25

| Prop | Role | Required | Notes |
| --- | --- | --- | --- |
| `x` | category | yes | Key holding the group label; one box per group. Set `bin` here to group a continuous field into bands instead. |
| `y` | value | yes | Config naming the statistic keys: `minKey`, `maxKey`, `midKey`, `boxStart` and `boxEnd`. When `x.bin` is set these are computed internally and can be omitted. |
| `valueKey` | quantitative | no | With `x.bin` set, names the raw continuous field the box statistics are computed from. |

**Required props:** `id`, `data`, `x`, `y`

```tsx
<BoxPlotV
  id="salary-by-band"
  className="w-full h-64"
  data={data}
  x={{ key: 'name' }}
  y={{
    minKey: 'min',
    maxKey: 'max',
    midKey: 'mid',
    boxStart: 'firstQuartile',
    boxEnd: 'lastQuartile',
    min: 0,
  }}
/>
```

#### Binned box plot (vertical) (BoxPlotV)

Bins a continuous field into groups along the x axis and computes each group’s quartiles from the raw rows.

**Also called:** vertical box plot from raw data, distribution by band

**Configuration:** Set `bin` on the `x` (category) config and pass `valueKey` naming the field to summarise. The statistic keys on `y` are then computed internally and can be omitted. Use `bin.thresholds` for explicit band edges.

**Use when**

- The data is raw observations and no statistics have been computed upstream
- The grouping field is continuous, e.g. salary distribution by age band

**Do not use when**

- Groups are already categorical — pass them directly rather than binning
- The statistics are already computed, in which case name the keys directly

```tsx
<BoxPlotV
  id="salary-by-age"
  className="w-full h-64"
  data={rawRows}
  valueKey="salary"
  x={{ key: 'age', bin: { count: 5 }, axis: { label: 'Age Group' } }}
  y={{ min: 0, axis: { label: 'Salary' } }}
/>
```

**Options**

- **Per-row colours** — Put a `className` field on each row to colour boxes individually.

**Consider instead**

- [`BoxPlotH`](#boxploth) — group labels are long
- [`RangePlot`](#rangeplot) — showing a plain min–max interval rather than quartiles
- [`ScatterPlot`](#scatterplot) — individual records should stay visible

### CometPlot

A tapered mark per category running from one value to another, where the widening head shows the direction of movement.

**Category:** `ranges` · **Answers:** `range`, `comparison` · **Storybook:** Ranges/CometPlot

**Also called:** comet chart, change plot, movement plot, slope chart

**Use when**

- A value moved between two states and the direction of that move matters
- Comparing before-and-after across categories, e.g. score with and without a change
- The magnitude of change should read at a glance from the shape rather than from a computed delta

**Do not use when**

- The two values are an unordered interval with no direction — use RangePlot
- The interval is a quartile summary — use BoxPlotH
- More than two states are involved — use LineChart with one line per category

**Data**

- `data` shape: records
- Rows: ideal 3–20, max 30

| Prop | Role | Required | Notes |
| --- | --- | --- | --- |
| `y` | category | yes | Key holding the category label; one comet per row. |
| `x` | value | yes | Config naming the endpoints: `fromKey` (tail) and `toKey` (head). The taper runs from tail to head. |

**Required props:** `id`, `data`, `x`, `y`

```tsx
<CometPlot
  id="score-change"
  className="w-full h-56"
  data={data}
  y={{ key: 'name' }}
  x={{ fromKey: 'before', toKey: 'after', className: 'fill-green-800 stroke-green-800' }}
/>
```

**Options**

- **Custom head** — Set `shape` to diamond, triangle, square, cross, star or wye, and `size` to scale it.
- **Tail styling** — Use `x.classNameTail` to style the tail separately from the head.

**Consider instead**

- [`RangePlot`](#rangeplot) — the interval has no direction
- [`LineChart`](#linechart) — more than two points in the sequence
- [`SpineChart`](#spinechart) — contrasting two independent measures rather than a movement

### RangePlot

A dumbbell per category: two endpoints joined by a bar, showing the interval between a low and a high value.

**Category:** `ranges` · **Answers:** `range`, `comparison` · **Storybook:** Ranges/RangePlot

**Also called:** dumbbell chart, dumbbell plot, barbell chart, dot plot, DNA chart, range chart

**Use when**

- Each category has a low and a high value and the gap between them is the message
- Comparing spans across categories, e.g. min and max temperature per city
- Showing a before-and-after pair where direction does not need emphasis
- A box plot would overstate the statistical rigour of the data

**Do not use when**

- Direction of movement matters — use CometPlot, whose tapered tail shows which way the value moved
- The interval is a statistical summary with quartiles — use BoxPlotH
- Only one value per category exists — use LollipopHChart
- The endpoints are times rather than numbers — use TimeLineChart

**Data**

- `data` shape: records
- Rows: ideal 3–25, max 40

| Prop | Role | Required | Notes |
| --- | --- | --- | --- |
| `y` | category | yes | Key holding the category label; one range per row. |
| `x` | value | yes | Config naming the interval endpoints: `minKey` and `maxKey`. Pin the axis with `start` and `end`. |

**Required props:** `id`, `data`, `x`, `y`, `shape`

```tsx
<RangePlot
  id="temp-range"
  className="w-full h-64"
  data={data}
  shape="circle"
  y={{ key: 'label', axis: { location: 'left' } }}
  x={{ minKey: 'minTemp', maxKey: 'maxTemp', start: 0, end: 100 }}
/>
```

**Options**

- **Styling** — Use `classNameData` to style the connecting bar and endpoints.
- **Fixed axis** — Set `x.start` and `x.end` to keep the scale stable across renders.

**Consider instead**

- [`CometPlot`](#cometplot) — the direction of movement between the two values matters
- [`BoxPlotH`](#boxploth) — the interval is a quartile summary
- [`LollipopHChart`](#lollipophchart) — there is a single value per category

### BulletChart

A compact linear gauge showing one measure against a base, a target, a threshold and a maximum.

**Category:** `gauges` · **Answers:** `progress` · **Storybook:** Gauge/BulletChart/Intro

**Also called:** bullet graph, kpi bar, target vs actual chart

**Use when**

- One KPI needs showing against a goal plus qualitative bands, in little vertical space
- Several KPIs will be stacked in a dashboard column and must align on a common layout
- A speedometer would waste space for the same information

**Do not use when**

- There is no target or threshold to compare against — use LinearGauge
- Several metrics each have their own target and should read as one unit — use RingGauge
- The value changes over time and the history matters — use LineChart
- The data is an array of records rather than a single number — gauges take one value

**Data**

- `data` shape: scalar

| Prop | Role | Required | Notes |
| --- | --- | --- | --- |
| `data` | value | yes | The single measured value. |
| `base` | value | yes | Lower qualitative band, e.g. last period’s result. |
| `target` | value | yes | The goal, drawn as a marker. |
| `threshold` | value | yes | The point past which performance counts as good. |
| `max` | value | yes | Top of the scale. |
| `label` | label | no | Text naming the metric. |

**Required props:** `id`, `data`, `base`, `target`, `threshold`, `max`

```tsx
<BulletChart
  id="sales-vs-target"
  className="w-full h-24"
  data={85}
  label="Sales"
  min={0}
  base={50}
  target={80}
  threshold={90}
  max={100}
/>
```

**Options**

- **Styled bands** — Style each element with `classNameData`, `classNameTarget`, `classNameThreshold`, `classNameBase` and `classNameMax`.
- **Live updates** — Change `data` on an interval; the bar animates when `drawing.duration` is set.

**Consider instead**

- [`LinearGauge`](#lineargauge) — there is no target or threshold, just a value on a scale
- [`RingGauge`](#ringgauge) — several metrics each against their own target
- [`SpeedometerChart`](#speedometerchart) — a dial metaphor suits the audience better

### LinearGauge

A single value drawn as a filled bar on a linear scale, with an optional error band.

**Category:** `gauges` · **Answers:** `progress` · **Storybook:** Gauge/LinearGauge/Intro

**Also called:** progress bar chart, linear progress gauge, meter

**Use when**

- A single value needs showing as a share of a total, with no target to compare against
- The gauge must fit in a table cell, list row or card — it is the most compact chart here
- An error or shortfall portion should be visible alongside the value

**Do not use when**

- There is a target, threshold or qualitative band to compare against — use BulletChart, which encodes all of them
- Several related metrics should read as one unit — use RingGauge
- History or trend matters — use LineChart

**Data**

- `data` shape: scalar

| Prop | Role | Required | Notes |
| --- | --- | --- | --- |
| `data` | value | yes | The value to display. The scale runs 0 to `max`, which defaults to 1 — so pass a fraction unless `max` is set. |
| `label` | label | yes | Text naming the metric; also accepts a D3 value function. |
| `max` | value | no | Top of the scale. Defaults to 1. |
| `error` | value | no | `{ data, className }` drawing an error or shortfall band at the top of the scale. |

**Required props:** `id`, `data`, `label`

```tsx
<LinearGauge
  id="disk-usage"
  className="h-12"
  label="Disk usage"
  data={0.47}
/>
```

**Options**

- **Absolute scale** — Set `max={100}` and pass the raw value instead of a fraction.
- **Error band** — Pass `error={{ data: 0.1, className: "fill-red-500" }}`.
- **Styling** — Use `classNameGauge` for the fill and `classNameGaugeBg` for the track.

**Consider instead**

- [`BulletChart`](#bulletchart) — there is a target and threshold to show
- [`RingGauge`](#ringgauge) — several metrics each with their own target
- [`SpeedometerChart`](#speedometerchart) — a dial metaphor with coloured regions suits better

### PizzaChart

Equal-angle radial slices, one per metric, each extending from the centre in proportion to its value.

**Category:** `gauges` · **Answers:** `profile`, `progress` · **Storybook:** Gauge/PizzaChart

**Also called:** radial bar chart, polar bar chart, sunburst-style profile

**Use when**

- One entity is being profiled across several metrics that share a scale
- The overall silhouette matters more than reading individual values
- Slices have a natural order, so the shape is comparable between renders

**Do not use when**

- Several entities need comparing — a pizza shows one; use RadarChart, which overlays many
- The metrics are parts of one whole — use PieChart, where angle encodes share
- Precise values matter — radius is read poorly; use ColumnChart
- Each metric has its own target rather than a shared max — use RingGauge

**Data**

- `data` shape: records
- Series: ideal 5–10, min 3, max 12

| Prop | Role | Required | Notes |
| --- | --- | --- | --- |
| `data` | value | yes | A single record — one object, not an array — holding every metric as a field. |
| `metrics` | series | yes | Array of `{ key, className, classNameBackground }`, one slice per entry, in the order given. |

**Required props:** `id`, `data`, `metrics`

```tsx
<PizzaChart
  id="quality-profile"
  className="w-full h-64"
  data={record}
  max={100}
  metrics={[
    { key: 'metric1', className: 'fill-purple-900' },
    { key: 'metric2', className: 'fill-purple-700' },
    { key: 'metric3', className: 'fill-purple-500' },
  ]}
/>
```

**Options**

- **Scale bounds** — Set `min` and `max` so slice radius is comparable across renders.
- **Slice shaping** — Set `paddingAngle` and `cornerRadius` to separate and round slices.
- **Backdrop** — Use `classNameBackground` per metric to show the unfilled remainder.

**Consider instead**

- [`RadarChart`](#radarchart) — several entities must be compared across the same metrics
- [`RingGauge`](#ringgauge) — each metric has its own target
- [`PieChart`](#piechart) — the values are parts of one whole

### RadarChart

Plots several metrics on spokes radiating from a centre and joins them into a polygon per entity, comparing profiles by shape.

**Category:** `gauges` · **Answers:** `profile`, `comparison` · **Storybook:** Gauge/RadarChart/Intro

**Also called:** spider chart, web chart, star chart, polar chart, kiviat diagram

**Use when**

- Five or more metrics are compared across a few entities on one shared scale, such as 0–100
- The profile shape is the message — which entity is strong or weak where
- Metrics have a natural cyclical or grouped order that makes the shape meaningful

**Do not use when**

- Metrics use different units or ranges — one shared radial scale would misrepresent them; use ColumnChart grouped
- More than about five entities need overlaying — the polygons become unreadable
- Precise values must be compared — radial position is read poorly; use BarChart
- Only one entity is being shown — use PizzaChart

**Data**

- `data` shape: records
- Series: ideal 5–8, min 3, max 12 — Spokes; fewer than 5 makes a shape too crude to compare.
- Rows: ideal 2–4, min 1, max 5 — Overlapping polygons; past ~5 entities they obscure each other.

| Prop | Role | Required | Notes |
| --- | --- | --- | --- |
| `label` | label | yes | `{ key }` naming the entity each polygon represents. |
| `metrics` | series | yes | Array of `{ key }`, one spoke per entry. All metrics must share the `min`–`max` scale. |
| `classNameMap` | color | no | Maps each entity label to stroke and fill classes. |

**Required props:** `id`, `data`, `label`, `metrics`

```tsx
<RadarChart
  id="team-profile"
  className="w-full h-64"
  data={data}
  label={{ key: 'name' }}
  min={0}
  max={100}
  metrics={[
    { key: 'attack' },
    { key: 'defense' },
    { key: 'midfield' },
    { key: 'goalkeeper' },
    { key: 'overall' },
  ]}
/>
```

**Options**

- **Per-entity colours** — Pass `classNameMap={{ Arsenal: "stroke-red-500 fill-red-500" }}`.
- **Fixed scale** — Always set `min` and `max` so shapes stay comparable across renders.

**Consider instead**

- [`PizzaChart`](#pizzachart) — profiling a single entity
- [`ColumnChart`](#columnchart) — metrics have different units, or values must be read precisely
- [`RingGauge`](#ringgauge) — each metric has its own target rather than a shared scale

### RingGauge

Concentric arcs, one per metric, each filled to its own target — the Apple Watch activity rings pattern.

**Category:** `gauges` · **Answers:** `progress`, `profile` · **Storybook:** Gauge/RingGauge/Intro

**Also called:** activity rings, radial progress chart, concentric gauge, donut gauge

**Use when**

- Several metrics each have their own target and should read as a single glanceable unit
- Completion against goal is the message rather than absolute values
- The set of metrics is stable and small, so ring order can be learned

**Do not use when**

- Metrics share one scale and their shape should be compared — use RadarChart
- There is only one metric — use BulletChart or LinearGauge
- Absolute values must be compared across metrics — arc lengths at different radii are not comparable; use ColumnChart
- Metrics have no target, only a raw value — use PizzaChart

**Data**

- `data` shape: records
- Rows: ideal 2–5, min 1, max 6 — One ring per row; inner rings get short quickly past ~6.

| Prop | Role | Required | Notes |
| --- | --- | --- | --- |
| `labelKey` | label | yes | Key naming each metric. |
| `dataKey` | value | yes | Key holding the achieved value for each metric. |
| `targetKey` | value | yes | Key holding each metric’s own target; the ring fills to data ÷ target. |
| `errorKey` | value | no | Key holding an error or shortfall value drawn on the ring. |

**Required props:** `id`, `data`, `labelKey`, `dataKey`, `targetKey`

```tsx
<RingGauge
  id="activity-rings"
  className="w-full h-64"
  data={metrics}
  labelKey="name"
  dataKey="score"
  targetKey="target"
/>
```

**Options**

- **Per-ring colours** — Put a `className` field on each row of `data`.
- **Label placement** — Set `labels={{ position: "bottom" }}`.
- **Arc geometry** — Tune `startAngle`, `endAngle`, `cornerRadius`, `minRadius` and `padding.arc`.

**Consider instead**

- [`BulletChart`](#bulletchart) — a single metric, with qualitative bands
- [`RadarChart`](#radarchart) — metrics share one scale and profile shape matters
- [`PizzaChart`](#pizzachart) — metrics have a shared maximum rather than individual targets

### SpeedometerChart

A dial with a needle showing one value against a scale that can be split into coloured regions.

**Category:** `gauges` · **Answers:** `progress` · **Storybook:** Gauge/Speedometer/Intro

**Also called:** gauge chart, dial chart, speedometer, needle gauge

**Use when**

- The audience expects a dial metaphor, e.g. an operational or health readout
- The scale divides into qualitative bands — good, warning, critical — that should be visible at a glance
- One value stands alone on a card and the layout has room for a wide mark

**Do not use when**

- Space is tight or several gauges will be stacked — use LinearGauge or BulletChart, which pack far denser
- Precise reading matters — needle angle is read less accurately than a bar length
- Several metrics need comparing — use RingGauge or RadarChart
- The trend over time is the real question — use LineChart

**Data**

- `data` shape: scalar

| Prop | Role | Required | Notes |
| --- | --- | --- | --- |
| `data` | value | yes | The value the needle points to. The scale runs 0 to the largest `regions` limit, or 0 to 1 when no regions are given. |
| `label` | label | no | `{ text, className }` naming the metric under the dial. |
| `regions` | color | no | Bands of the arc as `{ limit, className }`; the largest limit also sets the top of the scale. |

**Required props:** `id`, `data`

```tsx
<SpeedometerChart
  id="coverage"
  className="w-full h-48"
  data={0.7}
  label={{ text: 'Coverage' }}
/>
```

**Options**

- **Coloured regions** — Pass `regions={[{ limit: 50, className: "fill-red-500" }, { limit: 100, className: "fill-green-500" }]}`; the largest limit becomes the scale maximum.
- **Axis ticks** — Set `axisTicks={10}` to print values around the arc.
- **Needle length** — Set `needleRadius` to change how far the needle reaches.

**Consider instead**

- [`BulletChart`](#bulletchart) — the same information is needed in a fraction of the space
- [`LinearGauge`](#lineargauge) — a plain value on a scale, no bands
- [`RingGauge`](#ringgauge) — several metrics each against their own target

### Network

Draws nodes and the edges between them, laid out by force simulation or pinned to x/y scales.

**Category:** `flow` · **Answers:** `connection` · **Storybook:** Flow/Network/Intro

**Also called:** network graph, node-link diagram, force-directed graph, graph chart, relationship map

**Use when**

- The relationships between entities are the subject, not the entities’ values
- Clusters, hubs or isolated nodes should emerge from the layout
- Nodes should be positioned by real measures rather than the simulation — set `nodeDef.x` and `nodeDef.y`
- The graph is small enough to be explored interactively — enable `dragging` and `zooming`

**Do not use when**

- The relationships are strictly hierarchical — a tree layout communicates depth better than a force graph
- The data has no explicit edges; a network cannot be inferred from records alone
- Node values are the real question — use BarChart or ScatterPlot
- The graph is dense enough to become a hairball — aggregate or filter first

**Data**

- `data` shape: graph
- Rows: ideal 10–300, max 1000 — Nodes. Large graphs need filtering or aggregation first.

| Prop | Role | Required | Notes |
| --- | --- | --- | --- |
| `nodes` | category | yes | Array of node records. Passed separately from `data`. |
| `edges` | link | yes | Array of edge records referencing nodes by id. |
| `nodeDef.idKey` | label | yes | Field on each node holding its unique id; edges reference this value. |
| `edgeDef.sourceKey` | link | yes | Field on each edge holding the source node id. |
| `edgeDef.targetKey` | link | yes | Field on each edge holding the target node id. |

**Required props:** `id`, `nodes`, `edges`, `nodeDef`, `edgeDef`

```tsx
<Network
  id="team-graph"
  className="w-full h-96"
  nodes={nodes}
  edges={edges}
  nodeDef={{ idKey: 'name' }}
  edgeDef={{ sourceKey: 'from', targetKey: 'to' }}
/>
```

**Options**

- **Fixed positions** — Set `nodeDef.x` and `nodeDef.y` to place nodes on real scales instead of by simulation.
- **Dragging** — Set `dragging={{ enabled: true, snapToNewPosition: true }}` to let nodes be repositioned and pinned.
- **Encoding** — Use `nodeDef.size`, `nodeDef.shape` and `nodeDef.classNameKey` with `classNameMap` to encode node attributes.
- **Curved edges** — Set `edgeDef.curve` and size edges with `edgeDef.size`.

**Consider instead**

- [`ScatterPlot`](#scatterplot) — entities have two measures and no meaningful links
- [`WaffleChart`](#wafflechart) — the relationships form a matrix better read as a heatmap
