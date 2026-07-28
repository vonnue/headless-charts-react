import preview from '../../../../.storybook/preview';
import { interpolateBlues, interpolateYlOrRd } from 'd3-scale-chromatic';
import ScatterPlot from '.';
import data from './sample.json';

/**
 * When `x.bin` or `y.bin` is set, the ScatterPlot renders a 2D density heatmap.
 * Each cell shows the count of data points in that bin, with color encoding density.
 */
const meta = preview.meta({
  title: 'Distribution/ScatterPlot/Binning',
  component: ScatterPlot,
  tags: ['autodocs'],
});

/**
 * 2D density heatmap — bin both GDP and purchasing power into a grid.
 * Color intensity shows how many countries fall in each cell.
 */
export const DensityHeatmap = meta.story({
  args: {
    data,
    id: 'scatter-binned-both',
    x: {
      key: 'gdp',
      bin: { count: 5 },
      axis: { location: 'bottom', label: 'GDP' },
    },
    y: {
      key: 'purchasing_power',
      bin: { count: 5 },
      axis: { location: 'left', label: 'Purchasing Power' },
    },
    binColor: {
      scale: interpolateBlues,
    },
  },
});

/**
 * Density heatmap with a warm color scale.
 */
export const WarmColorScale = meta.story({
  args: {
    ...DensityHeatmap.input.args,
    id: 'scatter-binned-warm',
    binColor: {
      scale: interpolateYlOrRd,
    },
  },
});

/**
 * Bin only the x-axis (GDP). Y-axis stays continuous.
 */
export const BinXOnly = meta.story({
  args: {
    data,
    id: 'scatter-binned-x',
    x: {
      key: 'gdp',
      bin: { count: 6 },
      axis: { location: 'bottom', label: 'GDP' },
    },
    y: {
      key: 'purchasing_power',
      axis: { location: 'left', label: 'Purchasing Power' },
    },
    binColor: {
      scale: interpolateBlues,
    },
  },
});
