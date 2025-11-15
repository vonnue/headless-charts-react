import preview from '../../../../.storybook/preview';

import PieChart from '.';
import data from './sample.json';

/**
 * Donut charts are a variant of pie charts. Simply specify an `innerRadius` prop
 */
const meta = preview.meta({
  title: 'Distribution/PieChart/Donuts',
  component: PieChart,
  tags: ['autodocs'],
});

const classNameMap = {
  macbook: 'fill-purple-700 dark:fill-purple-100',
  services: 'fill-purple-500 dark:fill-purple-300',
  wearables: 'fill-purple-300 dark:fill-purple-500',
};

/**
 * From the normally styled `PieChart` component, simply specify an `innerRadius` prop.
 */
export const Donut = meta.story({
  args: {
    id: 'donut',
    data,
    valueKey: 'Y2012',
    classNameMap,
    innerRadius: 0.65,
    nameKey: 'name',
  },
});

/**
 * With outer radius
 */
export const OuterRadius = Donut.extend({
  args: {
    id: 'outer-radius-donut',
    outerRadius: 0.9,
  },
});

/**
 * The `labels` prop can be used to add labels to the slices.
 * */

export const Labelled = Donut.extend({
  args: {
    id: 'labelled-donut',
    labels: {
      radius: 1.2,
    },
  },
});

/**
 * The `drawing` prop can be used to animate the drawing of the slices.
 */

export const Drawing = Donut.extend({
  args: {
    id: 'drawing-donut',
    drawing: {
      duration: 1000,
    },
  },
});

/**
 * Props like `drawing` and `labels` can be used together.
 */
export const DrawingWithLabels = Labelled.extend({
  args: {
    id: 'drawing-with-labels-donut',
    drawing: {
      duration: 1000,
    },
  },
});

/**
 * The paddingAngle prop is used to add padding between slices (in degrees).
 */
export const PaddingAngle = Drawing.extend({
  args: {
    id: 'padding-angle-donut',
    paddingAngle: 1,
  },
});

/**
 * The cornerRadius prop is used to add rounded corners to the slices.
 */
export const CornerRadius = Drawing.extend({
  args: {
    id: 'corner-radius-donut',
    cornerRadius: 4,
  },
});

/**
 * The `title` prop can be used to add a title to the chart.
 */
export const Title = Drawing.extend({
  args: {
    id: 'title-donut',
    title: {
      text: '10%',
      className: 'text-center text-base font-bold',
    },
    subtitle: {
      text: 'of your property wealth',
      className: 'text-center text-xs font-normal max-w-16',
    },
  },
});

/**
 * Each individual arc can have it's own inner and outer radii.
 */

const innerOuterData = data.map((d, index) => ({
  ...d,
  outerRadius: index === 1 ? 1 : 0.9,
}));

export const ArcRadii = Drawing.extend({
  args: {
    id: 'arc-radii-donut',
    innerRadius: 0.65,
    data: innerOuterData,
  },
});
