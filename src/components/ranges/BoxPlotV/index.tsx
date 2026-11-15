import {
  BoxPlotRenderer,
  type BoxPlotVerticalBinnedProps,
  type BoxPlotVerticalSummaryProps,
  type BoxPlotVProps,
} from '../BoxPlot';

import { WRAPPER_DRAWING } from '../boxPlotConfig';

export type { BoxPlotClassNames } from '../boxPlotConfig';
export type { BoxPlotVProps } from '../BoxPlot';
/** Summary mode: each row already carries the statistics named on the value axis. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
export type BoxPlotVSummaryProps<TData = any> = BoxPlotVerticalSummaryProps<TData>;
/** Binned mode: the category axis has `bin` and `valueKey` names the field to summarise. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
export type BoxPlotVBinnedProps<TData = any> = BoxPlotVerticalBinnedProps<TData>;

/* catalog:start */
/**
 * Wrapper component: {@link BoxPlot} with `orientation="vertical"` pinned.
 * Accepts the props it always has, and draws in over 1 s unless `drawing` is
 * given.
 *
 * A stable public API. Prefer `<BoxPlot orientation="vertical">` in new code.
 * Selection guidance (use when, avoid when, examples, alternatives) is on
 * {@link BoxPlot}.
 *
 * @see BoxPlot
 */
/* catalog:end */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
const BoxPlotV = <TData = any,>(props: BoxPlotVProps<TData>) => (
  <BoxPlotRenderer<TData>
    {...props}
    drawing={props.drawing ?? WRAPPER_DRAWING}
    chartName='BoxPlotV'
    pinned='vertical'
  />
);

export default BoxPlotV;
