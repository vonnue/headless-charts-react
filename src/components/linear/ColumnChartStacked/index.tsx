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
