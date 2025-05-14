import { Meta, StoryObj } from '@storybook/react';

import PieChart from '.';
import data from './sample.json';

/**
 * SemiCircle charts are specifically useful for certain representations like political polls or seat shares, since they look like the seating arrangement in a parliament.
 */
const meta: Meta<typeof PieChart> = {
  title: 'Distribution/PieChart/SemiCircle',
  component: PieChart,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof PieChart>;

const classNameMap = {
  macbook: 'fill-purple-700 dark:fill-purple-100',
  services: 'fill-purple-500 dark:fill-purple-300',
  wearables: 'fill-purple-300 dark:fill-purple-500',
};

/**
 * SemiCircle charts are a variant of pie charts. Simply specify `startAngle` and `endAngle` props and set it to -90 and 90.
 */
export const SemiCircle: Story = {
  args: {
    id: 'tooltip',
    data,
    valueKey: 'Y2012',
    classNameMap,
    startAngle: -90,
    endAngle: 90,
  },
};

/**
 * Drawing the chart can be animated by specifying a `duration` in milliseconds.
 */

export const Drawing: Story = {
  args: {
    ...SemiCircle.args,
    id: 'drawing-pie-chart',
    drawing: {
      duration: 1000,
    },
  },
};
