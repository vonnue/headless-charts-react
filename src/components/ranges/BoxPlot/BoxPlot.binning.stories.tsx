import preview from '../../../../.storybook/preview';
import BoxPlot from '.';

/**
 * Set `bin` on the category axis (`x` vertical, `y` horizontal) and
 * pass `valueKey`: the statistics are computed from the raw rows, so the
 * stat keys can be omitted.
 */
const meta = preview.meta({
  title: 'Ranges/BoxPlot/Binning',
  component: BoxPlot,
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

const base = { className: 'w-full h-80', data: rawData, valueKey: 'weight' };

/** Weight distribution per height band, vertically. */
export const BinnedVertical = meta.story({
  args: {
    ...base,
    id: 'box-plot-binned-vertical',
    x: { key: 'height', bin: { count: 5 }, axis: { label: 'Height group (cm)' } },
    y: { start: 0, axis: { label: 'Weight (kg)' } },
  },
});

/** The same bins horizontally, with explicit band edges. */
export const BinnedHorizontal = meta.story({
  args: {
    ...base,
    id: 'box-plot-binned-horizontal',
    orientation: 'horizontal',
    y: { key: 'height', bin: { count: 4, thresholds: [150, 165, 180, 200] } },
    x: { start: 0, axis: { label: 'Weight (kg)' } },
  },
});
