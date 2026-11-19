import {
  LollipopRenderer,
  type LollipopVChartProps,
} from '../LollipopChart';

import { WRAPPER_DRAWING } from '../lollipopConfig';

export type { LollipopChartClassNames, LollipopShape, LollipopVChartProps } from '../LollipopChart';


/* catalog:start */
/**
 * Wrapper component: {@link LollipopChart} with `orientation="vertical"`
 * pinned. Accepts the props it always has, and draws in over 1 s unless
 * `drawing` is given.
 *
 * A stable public API. Prefer `<LollipopChart orientation="vertical">` in new
 * code. Selection guidance (use when, avoid when, examples, alternatives) is
 * on {@link LollipopChart}.
 *
 * @see LollipopChart
 */
/* catalog:end */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
const LollipopVChart = <TData = any,>(props: LollipopVChartProps<TData>) => (
  <LollipopRenderer<TData>
    {...props}
    drawing={props.drawing ?? WRAPPER_DRAWING}
    chartName='LollipopVChart'
    pinned='vertical'
  />
);

export default LollipopVChart;
