import preview from '../../../../.storybook/preview';
import BarChart from '.';

const meta = preview.meta({
  title: 'Linear/BarChart/Binning',
  component: BarChart,
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
 * When `x[0].bin` is set, the BarChart becomes a horizontal histogram.
 * Bin labels appear on the y-axis and bar lengths show the count per bin.
 */
export const HorizontalHistogram = meta.story({
  args: {
    data: continuousData,
    id: 'bar-histogram',
    x: [
      {
        key: 'score',
        bin: { count: 8 },
        className: 'text-indigo-500',
      },
    ],
    y: { key: 'score', axis: { label: 'Score Range' } },
  },
});

/**
 * Horizontal histogram with custom thresholds.
 */
export const CustomThresholds = meta.story({
  args: {
    data: continuousData,
    id: 'bar-histogram-thresholds',
    x: [
      {
        key: 'score',
        bin: { count: 5, thresholds: [20, 40, 60, 80] },
        className: 'text-emerald-500',
      },
    ],
    y: { key: 'score', axis: { label: 'Score Range' } },
  },
});
