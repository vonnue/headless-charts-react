import {
  LollipopRenderer,
  type LollipopHChartProps,
} from '../LollipopChart';

import { WRAPPER_DRAWING } from '../lollipopConfig';

export type { LollipopChartClassNames, LollipopHChartProps, LollipopShape } from '../LollipopChart';


/* catalog:start */
/**
 * Wrapper component: {@link LollipopChart} with `orientation="horizontal"`
 * pinned, rendering the Horizontal lollipop chart. Accepts the props it always
 * has, and draws in over 1 s unless `drawing` is given.
 *
 * Selection guidance (use when, avoid when, examples, alternatives) is on
 * {@link LollipopChart}.
 *
 * @deprecated Use `<LollipopChart orientation="horizontal">`. Will be removed
 * in 0.4.0.
 *
 * @see LollipopChart
 */
/* catalog:end */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
const LollipopHChart = <TData = any,>(props: LollipopHChartProps<TData>) => (
  <LollipopRenderer<TData>
    {...props}
    drawing={props.drawing ?? WRAPPER_DRAWING}
    chartName='LollipopHChart'
    pinned='horizontal'
  />
);

export default LollipopHChart;
