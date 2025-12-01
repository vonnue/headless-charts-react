import preview from '../../../../.storybook/preview';
import BarChart, { BarChartProps } from '.';
import data from './sample.json';

/**
 * Bar charts are used to compare values across categories by using horizontal bars.  Bar charts are useful for showing data changes over a period of time or for comparing data among items.
 *
 * To create a bar chart, use the `<BarChart />` component.
 *
 * */
const meta = preview.meta({
  title: 'Linear/BarChart/Intro',
  component: BarChart,
  tags: ['autodocs'],
});

/** Default Bar Chart (Grouped). */
export const Default = meta.story({
  args: {
    data,
    id: 'bar-chart-default',
    x: [
      { key: 'macbook' },
      { key: 'services' },
      { key: 'ipad' },
      { key: 'iphone' },
      { key: 'wearables' },
    ],
    y: { key: 'year' },
  } as any,
});

/** Styled bar charts (padding, margin, classNames) */
export const Styled = meta.story({
  args: {
    ...Default.input.args,
    id: 'bar-chart-styled',
    className: 'bg-gray-100 rounded',
    padding: {
      top: 20,
      right: 20,
      bottom: 20,
      left: 5,
      bar: 0.1,
    },
    margin: {
      top: 0,
      right: 40,
      bottom: 40,
      left: 60,
    },
    x: [
      {
        key: 'macbook',
        className: 'fill-amber-500 dark:fill-amber-100 rounded',
      },
      { key: 'services', className: 'fill-purple-400 dark:fill-purple-100' },
      { key: 'ipad', className: 'fill-green-500 dark:fill-green-100' },
      { key: 'iphone', className: 'fill-blue-500 dark:fill-blue-100' },
      { key: 'wearables', className: 'fill-red-500 dark:fill-red-100' },
    ],
    y: { key: 'year', className: 'text-red-500 dark:text-red-50', padding: 10 },
  } as any,
});

/**
 * You can specially style the bars by using the `className` and `classNameNegative` props. classNameNegative is used when the value is negative.
 */
export const NegativeStyling = meta.story({
  args: {
    ...Default.input.args,
    id: 'bar-chart-negative-styling',
    x: [
      {
        key: 'deltaMacbook',
        className: 'text-green-500 dark:text-green-400 rounded',
        classNameNegative: 'text-red-500 rounded dark:text-red-200',
        start: -10,
        end: 10,
      },
      { key: 'value', className: 'text-blue-500 dark:text-blue-400' },
    ],
  } as any,
});

/**
 * You can animate the bars by using the `drawing` prop.
 */
export const Drawing = meta.story({
  args: {
    ...Default.input.args,
    id: 'bar-chart-drawing',
    drawing: {
      duration: 1000,
      delay: 100,
    },
  } as any,
});

/**
 * You can add a data label to the bars by using the `dataLabel` prop. You can style the data label by using the `className` prop.
 */
export const DataLabel = meta.story({
  args: {
    ...Default.input.args,
    id: 'bar-chart-data-label',
    dataLabel: {
      className: 'text-white dark:text-gray-900',
    },
  } as any,
});

/** Styled Y Axis with custom className */
export const StyledYAxis = meta.story({
  args: {
    ...Default.input.args,
    id: 'bar-chart-styled-y-axis',
    y: {
      key: 'year',
      className: 'text-red-500',
    },
  } as any,
});

/** Add border radius to bars using the `rx` prop */
export const BorderRadius = meta.story({
  args: {
    ...Default.input.args,
    id: 'bar-chart-border-radius',
    x: [
      { key: 'macbook', className: 'text-red-500 rounded-full', rx: 3 },
      { key: 'services', className: 'text-blue-500', rx: 3 },
      { key: 'ipad', className: 'text-green-500', rx: 3 },
      { key: 'iphone', className: 'text-blue-500', rx: 3 },
      { key: 'wearables', className: 'text-red-500', rx: 3 },
    ],
  } as any,
});

/** Bar chart with left direction */
export const LeftDirection = meta.story({
  args: {
    ...Default.input.args,
    id: 'bar-chart-left-direction',
    direction: 'left',
  } as any,
});

/** Left direction with drawing animation */
export const LeftDrawing = meta.story({
  args: {
    ...LeftDirection.input.args,
    id: 'bar-chart-left-drawing',
    drawing: {
      duration: 1000,
      delay: 100,
    },
  } as any,
});

/** Different axis locations for different series */
export const DifferentAxis = meta.story({
  args: {
    ...Default.input.args,
    id: 'bar-chart-different-axis',
    x: [
      { key: 'macbook', axis: { location: 'top' } },
      { key: 'services', axis: { location: 'top' } },
      { key: 'ipad', axis: { location: 'bottom' } },
      { key: 'iphone', axis: { location: 'bottom' } },
      { key: 'wearables', axis: { location: 'bottom' } },
    ],
  } as BarChartProps<any>,
});

/** Custom axis labels */
export const CustomAxisLabel = meta.story({
  args: {
    ...Default.input.args,
    id: 'bar-chart-custom-axis-label',
    x: [
      { key: 'macbook', axis: { location: 'top', label: 'Macbook' } },
      { key: 'services', axis: { label: 'Services' } },
    ],
  } as any,
});
