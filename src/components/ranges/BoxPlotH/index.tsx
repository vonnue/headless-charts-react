import {
  BoxPlotRenderer,
  type BoxPlotHorizontalBinnedProps,
  type BoxPlotHorizontalSummaryProps,
  type BoxPlotHProps,
} from '../BoxPlot';

import { WRAPPER_DRAWING } from '../boxPlotConfig';

export type { BoxPlotClassNames } from '../boxPlotConfig';
export type { BoxPlotHProps } from '../BoxPlot';
/**
 * Summary mode: each row already carries the statistics named on the value axis.
 * @deprecated Use {@link BoxPlotProps} with `orientation="horizontal"`. Will be removed in the next breaking release.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
export type BoxPlotHSummaryProps<TData = any> = BoxPlotHorizontalSummaryProps<TData>;
/**
 * Binned mode: the category axis has `bin` and `valueKey` names the field to summarise.
 * @deprecated Use {@link BoxPlotProps} with `orientation="horizontal"`. Will be removed in the next breaking release.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
export type BoxPlotHBinnedProps<TData = any> = BoxPlotHorizontalBinnedProps<TData>;

/* catalog:start */
/**
 * Wrapper component: {@link BoxPlot} with `orientation="horizontal"` pinned,
 * rendering the Horizontal box plot. Accepts the props it always has, and
 * draws in over 1 s unless `drawing` is given.
 *
 * @deprecated Use `<BoxPlot orientation="horizontal">`. Will be removed in the
 * next breaking release.
 *
 * Selection guidance (use when, avoid when, examples, alternatives) is on
 * {@link BoxPlot}.
 *
 * @see BoxPlot
 */
/* catalog:end */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
const BoxPlotH = <TData = any,>(props: BoxPlotHProps<TData>) => (
  <BoxPlotRenderer<TData>
    {...props}
    drawing={props.drawing ?? WRAPPER_DRAWING}
    chartName='BoxPlotH'
    pinned='horizontal'
  />
);

export default BoxPlotH;
