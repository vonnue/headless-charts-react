import preview from '../../../../.storybook/preview';
import { useCallback, useEffect, useState } from 'react';

import PieChart from '.';
import data from './sample.json';

const years = [
  'Y2012',
  'Y2013',
  'Y2014',
  'Y2015',
  'Y2016',
  'Y2017',
  'Y2018',
  'Y2019',
  'Y2020',
  'Y2021',
  'Y2022',
];
/**
 * Pie charts can be used to show how much each category represents as part of a whole. They are useful for showing the distribution of a dataset.
 *
 * By default PieCharts are not styled. The following styles are passed by default
 *
 * Default styles:
 * - all paddings = 0
 * - all margins = 40px
 * - padding given to each slice = 2 degrees (paddingAngle)
 * - innerRadius set to 0 (Pie and not a donut chart)
 * - cornerRadius set to 0 (no rounded corners)
 * - no animation, labels or tooltips
 * - no donuts (innerRadius is 0, outerRadius is 1)
 * - startAngle = 0 and endAngle = 360 (Chart is drawn clockwise from top)
 * - no title or subtitle
 * - Sorting is enabled by default (highest first)
 */
const meta = preview.meta({
  title: 'Distribution/PieChart/Intro',
  component: PieChart,
  tags: ['autodocs'],
});

const classNameMap = {
  macbook: 'fill-purple-300 dark:fill-purple-100',
  services: 'fill-purple-400 dark:fill-purple-300',
  wearables: 'fill-purple-500 dark:fill-purple-500',
  ipad: 'fill-purple-600 dark:fill-purple-700',
  iphone: 'fill-purple-800 dark:fill-purple-900',
};
/**
 * The default chart will iterate through the `data` prop and takes the `valueKey` prop as the value to be represented, and `nameKey` as the name of the category.
 *
 * `data`, `valueKey` and `nameKey` are required props. If you do not provide them, the chart will not be drawn.
 *
 * Note: the following chart will not be drawn in the docs because it shares the same id as the chart displayed with the Controls at the top
 * */
export const Default = meta.story({
  args: {
    data,
    id: 'default-pie-chart',
    valueKey: 'Y2012',
    nameKey: 'name',
  },
});

/**
 * However, the default chart will not be styled. You can provide a `classNameMap` prop, with a list of possible values for the `nameKey` prop.
 *
 * In the example, nameKey = 'Y2012' has 3 possible values: 'wearables', 'services' and 'wearables'. The `classNameMap` prop takes a map of the possible values and the tailwind classes to be applied to each value.
 */
export const Styled = meta.story({
  args: {
    ...Default.input.args,
    id: 'styled-pie-chart',
    classNameMap,
  },
});

/**
 * Animating the chart can be animated by specifying a `duration` in milliseconds in `drawing` prop.
 */
export const Drawing = meta.story({
  args: {
    ...Styled.input.args,
    id: 'drawing-pie-chart',
    drawing: {
      duration: 1000,
    },
  },
});

/**
 * You can add labels to the chart by specifying a `labels` prop. The `labels` prop takes a `radius` prop, which is the radius of the circle where the labels will be placed. The `key` prop is the name of the category. The `text` prop is a function that takes the data and returns the text to be displayed. The `className` prop is a string of tailwind classes to be applied to the labels (please use `text-` classes to style).
 */

export const Labelled = meta.story({
  args: {
    ...Styled.input.args,
    id: 'labelled-pie-chart',
    labels: {
      radius: 1.2,
      className: 'p-2 rounded',
      classNameMap,
    },
  },
});

/**
 * You can add the `startAngle` prop to rotate the chart.
 */
export const StartAngle90 = meta.story({
  args: {
    ...Styled.input.args,
    id: 'pie-chart-start-angle',
    startAngle: 90,
  },
});

export const PaddingAngle = meta.story({
  args: {
    ...Default.input.args,
    id: 'pie-chart-padding-angle',
    paddingAngle: 1,
  },
});

export const CornerRadius = meta.story({
  args: {
    ...PaddingAngle.input.args,
    id: 'pie-chart-corner-radius',
    cornerRadius: 5,
  },
});

export const CustomStyle = meta.story({
  args: {
    ...Styled.input.args,
    id: 'pie-chart-custom-style',
    style: {
      width: '100%',
      maxWidth: '500px',
      height: '100%',
      backgroundColor: 'var(--color-bg)',
    },
  },
});

export const PieChartRace = meta.story(() => {
  const [currentYearIndex, setCurrentYearIndex] = useState(0);

  const refreshData = useCallback(() => {
    setCurrentYearIndex((prevIndex) => (prevIndex + 1) % years.length);
  }, []);

  useEffect(() => {
    const interval = setInterval(refreshData, 1000);
    return () => clearInterval(interval);
  }, [refreshData]);

  return (
    <div>
      <span>{years[currentYearIndex]}</span>
      <PieChart
        id='pie-chart-detailed'
        data={data}
        valueKey={years[currentYearIndex]}
        nameKey='name'
        classNameMap={classNameMap}
        tooltip={{}}
        drawing={{
          duration: 800,
        }}
        sort={false}
      />
    </div>
  );
});

export const Unsorted = meta.story({
  args: {
    ...Styled.input.args,
    id: 'unsorted-pie-chart',
    sort: false,
  },
});
