import preview from '../../../../.storybook/preview';
import ColumnChartGrouped from '.';

const meta = preview.meta({
  title: 'Linear/ColumnChartGrouped/Binning',
  component: ColumnChartGrouped,
  tags: ['autodocs'],
});

const continuousData = [
  { score: 12 }, { score: 15 }, { score: 18 }, { score: 22 },
  { score: 25 }, { score: 28 }, { score: 30 }, { score: 33 },
  { score: 35 }, { score: 38 }, { score: 40 }, { score: 42 },
  { score: 45 }, { score: 48 }, { score: 50 }, { score: 52 },
  { score: 55 }, { score: 58 }, { score: 60 }, { score: 62 },
  { score: 65 }, { score: 68 }, { score: 70 }, { score: 72 },
  { score: 75 }, { score: 78 }, { score: 80 }, { score: 82 },
  { score: 85 }, { score: 88 }, { score: 90 }, { score: 92 },
  { score: 55 }, { score: 58 }, { score: 60 }, { score: 63 },
  { score: 65 }, { score: 67 }, { score: 70 }, { score: 72 },
];

/**
 * When `x.bin` is set, the ColumnChart becomes a histogram.
 * Raw continuous data is binned and bar heights show the count per bin.
 */
export const Histogram = meta.story({
  args: {
    data: continuousData,
    id: 'column-histogram',
    x: {
      key: 'score',
      bin: { count: 8 },
      axis: { location: 'bottom', label: 'Score' },
    },
    y: [
      {
        key: 'count',
        className: 'text-blue-500',
      },
    ],
  },
});

/**
 * Histogram with custom thresholds.
 */
export const CustomThresholds = meta.story({
  args: {
    data: continuousData,
    id: 'column-histogram-thresholds',
    x: {
      key: 'score',
      bin: { count: 5, thresholds: [20, 40, 60, 80] },
      axis: { location: 'bottom', label: 'Score Range' },
    },
    y: [
      {
        key: 'count',
        className: 'text-green-500',
      },
    ],
  },
});
