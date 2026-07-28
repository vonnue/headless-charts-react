import preview from '../../../../.storybook/preview';
import { interpolateBlues, interpolateYlOrRd } from 'd3-scale-chromatic';

import WaffleChart from '.';
import data from './sample-continuous.json';

/**
 * Binning mode allows raw continuous data to be grouped into discrete ranges
 * on one or both axes. Each cell shows the **count** of data points that fall
 * into the corresponding (xBin, yBin) pair, with color encoding the count.
 */
const meta = preview.meta({
  title: 'Distribution/WaffleChart/Binning',
  component: WaffleChart,
  tags: ['autodocs'],
});

/**
 * Bin both axes — height into 5 bins, weight into 5 bins.
 * Color encodes the count of data points per cell.
 */
export const BinBothAxes = meta.story({
  args: {
    data,
    id: 'bin-both-waffle',
    x: {
      key: 'height',
      bin: { count: 5 },
      axis: { location: 'bottom', label: 'Height (cm)' },
    },
    y: {
      key: 'weight',
      bin: { count: 5 },
      axis: { location: 'left', label: 'Weight (kg)' },
    },
    color: {
      key: 'count',
      scale: interpolateBlues,
    },
    rx: 4,
  },
});

/**
 * Bin only the x-axis (height). The y-axis uses raw categorical weight values.
 */
export const BinXOnly = meta.story({
  args: {
    data,
    id: 'bin-x-only-waffle',
    x: {
      key: 'height',
      bin: { count: 6 },
      axis: { location: 'bottom', label: 'Height (cm)' },
    },
    y: {
      key: 'weight',
      axis: { location: 'left', label: 'Weight (kg)' },
    },
    color: {
      key: 'count',
      scale: interpolateYlOrRd,
    },
  },
});

/**
 * Bin only the y-axis (weight). The x-axis uses raw categorical height values.
 */
export const BinYOnly = meta.story({
  args: {
    data,
    id: 'bin-y-only-waffle',
    x: {
      key: 'height',
      axis: { location: 'bottom', label: 'Height (cm)' },
    },
    y: {
      key: 'weight',
      bin: { count: 6 },
      axis: { location: 'left', label: 'Weight (kg)' },
    },
    color: {
      key: 'count',
      scale: interpolateBlues,
    },
  },
});

/**
 * Use explicit thresholds instead of an automatic bin count.
 */
export const CustomThresholds = meta.story({
  args: {
    data,
    id: 'custom-thresholds-waffle',
    x: {
      key: 'height',
      bin: { count: 4, thresholds: [160, 170, 180, 190] },
      axis: { location: 'bottom', label: 'Height (cm)' },
    },
    y: {
      key: 'weight',
      bin: { count: 4, thresholds: [60, 70, 80, 90] },
      axis: { location: 'left', label: 'Weight (kg)' },
    },
    color: {
      key: 'count',
      scale: interpolateYlOrRd,
    },
    rx: 4,
  },
});

/**
 * Custom label format showing integer ranges.
 */
export const CustomLabelFormat = meta.story({
  args: {
    data,
    id: 'custom-label-waffle',
    x: {
      key: 'height',
      bin: {
        count: 5,
        labelFormat: (low: number, high: number) =>
          `${Math.round(low)}–${Math.round(high)} cm`,
      },
      axis: { location: 'bottom', label: 'Height' },
    },
    y: {
      key: 'weight',
      bin: {
        count: 5,
        labelFormat: (low: number, high: number) =>
          `${Math.round(low)}–${Math.round(high)} kg`,
      },
      axis: { location: 'left', label: 'Weight' },
    },
    color: {
      key: 'count',
      scale: interpolateBlues,
    },
    rx: 999,
    gap: 4,
  },
});
