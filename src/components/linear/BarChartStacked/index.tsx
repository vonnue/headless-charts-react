import { BarRenderer, type BarChartStackedProps, type BarStacking } from '../BarChart';

export type {
  BarCategoryConfig,
  BarChartStackedProps,
  BarDataLabel,
  BarReferenceLine,
  BarSeriesConfig,
  BarStacking,
} from '../BarChart';

const NORMAL: BarStacking = { type: 'normal' };
const STACKED_MARGIN = { left: 60, right: 20, top: 20, bottom: 40 };

/* catalog:start */
/* catalog:end */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
const BarChartStacked = <TData = any,>(props: BarChartStackedProps<TData>) => (
  <BarRenderer<TData>
    {...props}
    stacking={props.stacking ?? NORMAL}
    chartName='BarChartStacked'
    pinned='horizontal'
    defaultMargin={STACKED_MARGIN}
    defaultBandPadding={0.3}
  />
);

export default BarChartStacked;
