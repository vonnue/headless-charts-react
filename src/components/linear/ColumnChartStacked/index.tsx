import { BarRenderer, type BarStacking, type ColumnChartStackedProps } from '../BarChart';

export type {
  BarCategoryConfig,
  BarDataLabel,
  BarReferenceLine,
  BarSeriesConfig,
  BarStacking,
  ColumnChartStackedProps,
} from '../BarChart';

const NORMAL: BarStacking = { type: 'normal' };

/* catalog:start */
/**
 * Wrapper component: {@link BarChart} with `orientation="vertical" stacking={{
 * type: "normal" }}` pinned, rendering the Stacked bar chart.
 *
 * A stable public API. Prefer `<BarChart orientation="vertical" stacking={{
 * type: "normal" }}>` in new code. Selection guidance (use when, avoid when,
 * examples, alternatives) is on {@link BarChart}.
 *
 * @see BarChart
 */
/* catalog:end */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
const ColumnChartStacked = <TData = any,>(props: ColumnChartStackedProps<TData>) => (
  <BarRenderer<TData>
    {...props}
    stacking={props.stacking ?? NORMAL}
    chartName='ColumnChartStacked'
    pinned='vertical'
  />
);

export default ColumnChartStacked;
