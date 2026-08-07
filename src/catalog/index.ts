import {
  ChartIntent,
  ChartMeta,
  NamedChartType,
  isNamedChartType,
} from './types';

import AreaChart from '@/components/linear/AreaChart/meta';
import BarChart from '@/components/linear/BarChart/meta';
import BarChartStacked from '@/components/linear/BarChartStacked/meta';
import BoxPlotH from '@/components/ranges/BoxPlotH/meta';
import BoxPlotV from '@/components/ranges/BoxPlotV/meta';
import BulletChart from '@/components/gauges/BulletChart/meta';
import ColumnChart from '@/components/linear/ColumnChart/meta';
import ColumnChartStacked from '@/components/linear/ColumnChartStacked/meta';
import CometPlot from '@/components/ranges/CometPlot/meta';
import LineChart from '@/components/linear/LineChart/meta';
import LinearGauge from '@/components/gauges/LinearGauge/meta';
import LollipopHChart from '@/components/linear/LollipopHChart/meta';
import LollipopVChart from '@/components/linear/LollipopVChart/meta';
import Network from '@/components/flow/Network/meta';
import PieChart from '@/components/distribution/PieChart/meta';
import PizzaChart from '@/components/gauges/PizzaChart/meta';
import RadarChart from '@/components/gauges/RadarChart/meta';
import RangePlot from '@/components/ranges/RangePlot/meta';
import RingGauge from '@/components/gauges/RingGauge/meta';
import ScatterPlot from '@/components/distribution/ScatterPlot/meta';
import SpeedometerChart from '@/components/gauges/SpeedometerChart/meta';
import SpineChart from '@/components/linear/SpineChart/meta';
import TimeLineChart from '@/components/linear/TimeLineChart/meta';
import WaffleChart from '@/components/distribution/WaffleChart/meta';

export * from './types';
export { decisionTree, globalRules } from './decisions';

/**
 * Every chart in the library, described in machine-readable form.
 *
 * Ordered by category then name so the generated `AGENTS.md` and `catalog.json`
 * are stable across runs.
 */
export const chartCatalog: ChartMeta[] = [
  // linear
  AreaChart,
  BarChart,
  BarChartStacked,
  ColumnChart,
  ColumnChartStacked,
  LineChart,
  LollipopHChart,
  LollipopVChart,
  SpineChart,
  TimeLineChart,
  // distribution
  PieChart,
  ScatterPlot,
  WaffleChart,
  // ranges
  BoxPlotH,
  BoxPlotV,
  CometPlot,
  RangePlot,
  // gauges
  BulletChart,
  LinearGauge,
  PizzaChart,
  RadarChart,
  RingGauge,
  SpeedometerChart,
  // flow
  Network,
];

/** A specialised chart type together with the component that produces it. */
export interface ChartTypeEntry {
  /** The specialised type, e.g. Streamgraph. */
  variant: NamedChartType;
  /** The component to render, e.g. AreaChart. */
  chart: ChartMeta;
}

/**
 * Every specialised chart type this library can produce — a streamgraph, a
 * waterfall, a histogram, a donut — paired with the component that produces it.
 *
 * Requests name these types far more often than they name components, so this
 * is the index to search when someone asks for "a waterfall chart".
 */
export const chartTypeIndex: ChartTypeEntry[] = chartCatalog.flatMap((chart) =>
  (chart.variants ?? [])
    .filter(isNamedChartType)
    .map((variant) => ({ variant, chart })),
);

const normalise = (value: string) => value.trim().toLowerCase();

/** Look up one chart's metadata by its exported component name. */
export const getChartMeta = (name: string): ChartMeta | undefined =>
  chartCatalog.find((chart) => chart.name === name);

/** All charts that answer a given analytical question. */
export const getChartsByIntent = (intent: ChartIntent): ChartMeta[] =>
  chartCatalog.filter((chart) => chart.intents.includes(intent));

/**
 * Resolve any name a chart might be asked for — a component name, a chart-level
 * alias ("dumbbell chart"), or a specialised type ("streamgraph") — to the
 * component that renders it.
 *
 * Returns the base chart plus, when the name referred to a specialised type,
 * the variant carrying the props needed to produce it.
 */
export const resolveChartRequest = (
  request: string,
): { chart: ChartMeta; variant?: NamedChartType } | undefined => {
  const query = normalise(request);

  const byName = chartCatalog.find((chart) => normalise(chart.name) === query);
  if (byName) return { chart: byName };

  const byType = chartTypeIndex.find(
    (entry) =>
      normalise(entry.variant.name) === query ||
      entry.variant.aliases.some((alias) => normalise(alias) === query),
  );
  if (byType) return { chart: byType.chart, variant: byType.variant };

  const byAlias = chartCatalog.find((chart) =>
    chart.aliases.some((alias) => normalise(alias) === query),
  );
  if (byAlias) return { chart: byAlias };

  return undefined;
};
