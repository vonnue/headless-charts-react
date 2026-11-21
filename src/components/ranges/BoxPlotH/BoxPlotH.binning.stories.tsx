import preview from '../../../../.storybook/preview';
import BoxPlotH from '.';

const meta = preview.meta({
  title: 'Ranges/BoxPlotH/Binning',
  component: BoxPlotH,
  tags: ['autodocs'],
});

// Raw data: height and weight for many individuals
const rawData = [
  { height: 152, weight: 50 }, { height: 155, weight: 53 }, { height: 158, weight: 55 },
  { height: 160, weight: 58 }, { height: 162, weight: 60 }, { height: 163, weight: 62 },
  { height: 165, weight: 55 }, { height: 165, weight: 63 }, { height: 167, weight: 65 },
  { height: 168, weight: 68 }, { height: 170, weight: 70 }, { height: 170, weight: 65 },
  { height: 172, weight: 68 }, { height: 175, weight: 72 }, { height: 175, weight: 75 },
  { height: 178, weight: 76 }, { height: 180, weight: 78 }, { height: 180, weight: 82 },
  { height: 182, weight: 80 }, { height: 185, weight: 85 }, { height: 185, weight: 88 },
  { height: 188, weight: 85 }, { height: 190, weight: 92 }, { height: 192, weight: 95 },
  { height: 195, weight: 98 }, { height: 198, weight: 100 },
];

/**
 * Bin the height field and show weight distribution per height group as horizontal box plots.
 */
export const WeightByHeightGroup = meta.story({
  args: {
    data: rawData,
    id: 'boxploth-binned',
    y: {
      key: 'height',
      bin: { count: 5 },
      axis: { location: 'left', label: 'Height Group (cm)' },
    },
    x: {
      minKey: '_min',
      maxKey: '_max',
      midKey: '_median',
      boxStart: '_q1',
      boxEnd: '_q3',
      min: 0,
      axis: { location: 'bottom', label: 'Weight (kg)' },
    },
    valueKey: 'weight',
  },
});
