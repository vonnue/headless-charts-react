import {
  BoxPlotRenderer,
  type BoxPlotHorizontalBinnedProps,
  type BoxPlotHorizontalSummaryProps,
  type BoxPlotHProps,
} from '../BoxPlot';

import { WRAPPER_DRAWING } from '../boxPlotConfig';

export type { BoxPlotClassNames } from '../boxPlotConfig';
export type { BoxPlotHProps } from '../BoxPlot';
/** Summary mode: each row already carries the statistics named on the value axis. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
export type BoxPlotHSummaryProps<TData = any> = BoxPlotHorizontalSummaryProps<TData>;
/** Binned mode: the category axis has `bin` and `valueKey` names the field to summarise. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
export type BoxPlotHBinnedProps<TData = any> = BoxPlotHorizontalBinnedProps<TData>;

/**
 * A {@link BoxPlot} pinned to `orientation="horizontal"`. It accepts the same
 * props it always has, and draws in over 1 s unless `drawing` is given.
 * Permanent public API; for the other orientation use `BoxPlotV` or
 * `<BoxPlot orientation=…>`.
 */
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
