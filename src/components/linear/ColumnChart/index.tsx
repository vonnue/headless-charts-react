import { BarRenderer, type ColumnChartProps } from '../BarChart';

export type {
  BarCategoryConfig,
  BarDataLabel,
  BarReferenceLine,
  BarSeriesConfig,
  ColumnChartGroupedProps,
  ColumnChartProps,
} from '../BarChart';

/* catalog:start */
/**
 * Wrapper component: {@link BarChart} with `orientation="vertical"` pinned.
 *
 * @deprecated Use `<BarChart orientation="vertical">`. Will be removed in the
 * next breaking release.
 *
 * Selection guidance (use when, avoid when, examples, alternatives) is on
 * {@link BarChart}.
 *
 * @see BarChart
 */
/* catalog:end */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
const ColumnChart = <TData = any,>(props: ColumnChartProps<TData>) => (
  <BarRenderer<TData>
    {...props}
    chartName='ColumnChart'
    pinned='vertical'
  />
);

export default ColumnChart;
