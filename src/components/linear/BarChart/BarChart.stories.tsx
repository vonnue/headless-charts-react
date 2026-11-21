import preview from '../../../../.storybook/preview';
import BarChart from '.';
import data from './sample.json';

/**
 * Vertical or horizontal bars comparing one or more measures across
 * categories. The default is vertical; set `orientation="horizontal"`
 * (or pass the series array on `x`) for long category labels.
 * `ColumnChart` is a deprecated alias for the same chart with
 * `orientation="vertical"` pinned, and will be removed in 0.4.0. `BarChartStacked` and `ColumnChartStacked` remain
 * supported wrappers.
 */
const meta = preview.meta({
  title: 'Linear/BarChart/Intro',
  component: BarChart,
  tags: ['autodocs'],
});

const verticalBase = {
  className: 'w-full h-80',
  data,
  x: { key: 'year' },
  y: [
    { key: 'macbook', className: 'fill-amber-500' },
    { key: 'iphone', className: 'fill-blue-500' },
  ],
};

const horizontalBase = {
  data,
  x: [
    { key: 'macbook' },
    { key: 'services' },
    { key: 'ipad' },
    { key: 'iphone' },
    { key: 'wearables' },
  ],
  y: { key: 'year' },
};

/** Vertical (default): categories on `x`, series on `y`. */
export const Vertical = meta.story({
  args: {
    ...verticalBase,
    id: 'bar-chart-intro-vertical',
  },
});

/** Horizontal: categories on `y`, series array on `x`. Existing `<BarChart x={[…]} y={{…}}>` usage is unchanged. */
export const Default = meta.story({
  args: {
    ...horizontalBase,
    id: 'bar-chart-default',
  },
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
    y: { key: 'year', className: 'text-red-500 dark:text-red-50', padding: 0.5 },
  },
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
      {
        key: 'deltaIpad',
        className: 'text-blue-500 dark:text-blue-400',
        classNameNegative: 'text-amber-400 dark:text-amber-200',
      },
    ],
  },
});

/** Bar chart with left direction */
export const LeftDirection = meta.story({
  args: {
    ...Default.input.args,
    id: 'bar-chart-left-direction',
    direction: 'left',
  },
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
  },
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
  },
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
  },
});

/** Negative values in the vertical default: columns grow down from 0. */
export const NegativeVertical = meta.story({
  args: {
    className: 'w-full h-80',
    id: 'bar-chart-intro-negative-vertical',
    data: [
      { name: 'A', value: -12 },
      { name: 'B', value: -4 },
      { name: 'C', value: 8 },
      { name: 'D', value: 15 },
    ],
    x: { key: 'name' },
    y: [{ key: 'value', className: 'fill-blue-500', classNameNegative: 'fill-red-500' }],
  },
});

/** Negative values in the horizontal orientation: bars grow left from 0. */
export const NegativeHorizontal = meta.story({
  args: {
    className: 'w-full h-80',
    id: 'bar-chart-intro-negative-horizontal',
    orientation: 'horizontal',
    data: [
      { name: 'A', value: -12 },
      { name: 'B', value: -4 },
      { name: 'C', value: 8 },
      { name: 'D', value: 15 },
    ],
    y: { key: 'name' },
    x: [{ key: 'value', className: 'fill-blue-500', classNameNegative: 'fill-red-500' }],
  },
});

/** Empty data: axes only, no marks. */
export const Empty = meta.story({
  args: {
    ...verticalBase,
    id: 'bar-chart-intro-empty',
    data: [],
  },
});
