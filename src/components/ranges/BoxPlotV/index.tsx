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

/**
 * A {@link BoxPlot} pinned to `orientation="vertical"`. It accepts the same
 * props it always has, and draws in over 1 s unless `drawing` is given.
 * Permanent public API; for the other orientation use `BoxPlotH` or
 * `<BoxPlot orientation=…>`.
 */
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
