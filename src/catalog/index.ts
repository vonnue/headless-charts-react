import {
  ChartIntent,
  ChartMeta,
  ChartWrapper,
  NamedChartType,
  isNamedChartType,
} from './types';

import AreaChart from '@/components/linear/AreaChart/meta';
import BarChart from '@/components/linear/BarChart/meta';
import BoxPlot from '@/components/ranges/BoxPlot/meta';
import BulletChart from '@/components/gauges/BulletChart/meta';
import CandlestickChart from '@/components/ranges/CandlestickChart/meta';
import CometPlot from '@/components/ranges/CometPlot/meta';
import LineChart from '@/components/linear/LineChart/meta';
import LinearGauge from '@/components/gauges/LinearGauge/meta';
import LollipopChart from '@/components/linear/LollipopChart/meta';
import FunnelChart from '@/components/flow/FunnelChart/meta';
import Network from '@/components/flow/Network/meta';
import SankeyChart from '@/components/flow/SankeyChart/meta';
import ParallelCoordinatesChart from '@/components/distribution/ParallelCoordinatesChart/meta';
import PieChart from '@/components/distribution/PieChart/meta';
import PizzaChart from '@/components/gauges/PizzaChart/meta';
import RadarChart from '@/components/gauges/RadarChart/meta';
import RangePlot from '@/components/ranges/RangePlot/meta';
import RingGauge from '@/components/gauges/RingGauge/meta';
import ScatterPlot from '@/components/distribution/ScatterPlot/meta';
import SpeedometerChart from '@/components/gauges/SpeedometerChart/meta';
import SparklineChart from '@/components/linear/SparklineChart/meta';
import SpineChart from '@/components/linear/SpineChart/meta';
import SunburstChart from '@/components/distribution/SunburstChart/meta';
import TimeLineChart from '@/components/linear/TimeLineChart/meta';
import TreemapChart from '@/components/distribution/TreemapChart/meta';
import ViolinChart from '@/components/ranges/ViolinChart/meta';
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
  LineChart,
  LollipopChart,
  SparklineChart,
  SpineChart,
  TimeLineChart,
  // distribution
  ParallelCoordinatesChart,
  PieChart,
  ScatterPlot,
  SunburstChart,
  TreemapChart,
  WaffleChart,
  // ranges
  BoxPlot,
  CandlestickChart,
  CometPlot,
  RangePlot,
  ViolinChart,
  // gauges
  BulletChart,
  LinearGauge,
  PizzaChart,
  RadarChart,
  RingGauge,
  SpeedometerChart,
  // flow
  FunnelChart,
  Network,
  SankeyChart,
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

/** A wrapper component together with the chart it renders. */
export interface ChartWrapperEntry {
  wrapper: ChartWrapper;
  /** The unified chart the wrapper renders. */
  chart: ChartMeta;
}

/** Every wrapper component (e.g. BoxPlotH), paired with the chart it renders. */
export const chartWrapperIndex: ChartWrapperEntry[] = chartCatalog.flatMap(
  (chart) => (chart.wrappers ?? []).map((wrapper) => ({ wrapper, chart })),
);

/** The named chart-type variant a wrapper renders, if any. */
const wrapperVariant = ({
  wrapper,
  chart,
}: ChartWrapperEntry): NamedChartType | undefined =>
  wrapper.variant === undefined
    ? undefined
    : (chart.variants ?? [])
        .filter(isNamedChartType)
        .find((variant) => variant.name === wrapper.variant);

/**
 * Look up one chart's metadata by its exported component name. A wrapper's
 * name (e.g. `BoxPlotH`) returns the chart it renders.
 */
export const getChartMeta = (name: string): ChartMeta | undefined =>
  chartCatalog.find((chart) => chart.name === name) ??
  chartWrapperIndex.find((entry) => entry.wrapper.name === name)?.chart;

/** All charts that answer a given analytical question. */
export const getChartsByIntent = (intent: ChartIntent): ChartMeta[] =>
  chartCatalog.filter((chart) => chart.intents.includes(intent));

/**
 * Resolve any name a chart might be asked for — a component name, a wrapper
 * component name ("BoxPlotH"), a chart-level alias ("dumbbell chart"), or a
 * specialised type ("streamgraph") — to the component that renders it.
 *
 * Returns the base chart plus, when the name referred to a specialised type,
 * the variant carrying the props needed to produce it. A wrapper match also
 * returns the wrapper's name, and the variant it renders (if any).
 */
export const resolveChartRequest = (
  request: string,
):
  | { chart: ChartMeta; variant?: NamedChartType; wrapper?: string }
  | undefined => {
  const query = normalise(request);

  const byName = chartCatalog.find((chart) => normalise(chart.name) === query);
  if (byName) return { chart: byName };

  const byWrapper = chartWrapperIndex.find(
    (entry) => normalise(entry.wrapper.name) === query,
  );
  if (byWrapper) {
    const variant = wrapperVariant(byWrapper);
    return {
      chart: byWrapper.chart,
      ...(variant ? { variant } : {}),
      wrapper: byWrapper.wrapper.name,
    };
  }

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
