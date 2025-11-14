import preview from '../../../../.storybook/preview';
import BarChart from '.';
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
      {
        key: 'macbook',
      },
      { key: 'services' },
      { key: 'ipad' },
      { key: 'iphone' },
      { key: 'wearables' },
    ],
    y: { key: 'year' },
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
    y: { key: 'year', className: 'text-red-500 dark:text-red-50', padding: 10 },
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
      { key: 'value', className: 'text-blue-500 dark:text-blue-400' },
    ],
  },
});

/**
 * You can animate the bars by using the `drawing` prop.
 */
export const Drawing = meta.story({
  args: {
    ...Default.input.args,
    id: 'bar-chart-drawing',
    drawing: {
      enabled: true,
      duration: 1000,
      delay: 100,
    },
  },
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
  },
});

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

export const BorderRadius = meta.story({
  args: {
    ...Default.input.args,
    id: 'bar-chart-border-radius',
    x: [
      {
        key: 'macbook',
        className: 'text-red-500 rounded-full',
        rx: 3,
      },
      { key: 'services', className: 'text-blue-500', rx: 3 },
      { key: 'ipad', className: 'text-green-500', rx: 3 },
      { key: 'iphone', className: 'text-blue-500', rx: 3 },
      { key: 'wearables', className: 'text-red-500', rx: 3 },
    ],
  },
});

export const LeftDirection = meta.story({
  args: {
    ...Default.input.args,
    id: 'bar-chart-left-direction',
    direction: 'left',
  },
});

export const LeftDrawing = meta.story({
  args: {
    ...LeftDirection.input.args,
    ...Drawing.input.args,
    id: 'bar-chart-left-drawing',
  },
});

export const DifferentAxis = meta.story({
  args: {
    ...Default.input.args,
    id: 'bar-chart-different-axis',
    x: [
      {
        key: 'macbook',
        axis: 'top',
      },
      {
        key: 'services',
        axis: 'top',
      },
      {
        key: 'ipad',
        axis: 'bottom',
      },
      {
        key: 'iphone',
        axis: 'bottom',
      },
      {
        key: 'wearables',
        axis: 'bottom',
      },
    ],
  },
});

export const CustomAxisLabel = meta.story({
  args: {
    ...Default.input.args,
    id: 'bar-chart-custom-axis-label',
    x: [
      {
        key: 'macbook',
        axis: 'top',
        axisLabel: 'Macbook',
      },
      {
        key: 'services',
        axisLabel: 'Services',
      },
    ],
  },
});

/**
 * Example demonstrating type-safe key suggestions.
 * Define your data type and TypeScript will provide autocomplete for keys.
 */
type SalesData = {
  product: string;
  revenue: number;
  profit: number;
  expenses: number;
};

const salesData: SalesData[] = [
  { product: 'Product A', revenue: 12000, profit: 3000, expenses: 9000 },
  { product: 'Product B', revenue: 8000, profit: 2000, expenses: 6000 },
  { product: 'Product C', revenue: 15000, profit: 4500, expenses: 10500 },
];

export const TypedBarChart = meta.story({
  args: {
    id: 'typed-bar-chart',
    data: salesData,
    x: [
      {
        key: 'revenue', // TypeScript autocomplete works here!
        className: 'text-green-500',
      },
      {
        key: 'profit', // TypeScript autocomplete works here!
        className: 'text-blue-500',
      },
      {
        key: 'expenses', // TypeScript autocomplete works here!
        className: 'text-red-500',
      },
    ],
    y: { key: 'product' }, // TypeScript autocomplete works here!
  },
});
