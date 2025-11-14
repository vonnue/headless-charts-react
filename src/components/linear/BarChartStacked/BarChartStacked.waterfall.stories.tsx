import preview from '../../../../.storybook/preview';
import BarChartStacked from '.';
import data from './sample.json';

/**
 * Stacked bar charts are used to compare values across categories by using horizontal bars, with some grouping. Stacked bar charts additionally show proportions within categories.
 *
 *
 * */

const meta = preview.meta({
  title: 'Linear/BarChartStacked/Waterfall',
  component: BarChartStacked,
  tags: ['autodocs'],
});

export const Waterfall = meta.story({
  args: {
    data: data.filter((d) => d.year >= 2020),
    id: 'bar-chart-stacked-default',
    x: [
      {
        key: 'macbook',
      },
      {
        key: 'iphone',
      },
      {
        key: 'ipad',
      },
      {
        key: 'wearables',
      },
      {
        key: 'services',
      },
    ],
    y: { key: 'year' },
    waterfall: true,
  },
});

export const Styled = meta.story({
  args: {
    ...Waterfall.input.args,
    id: 'bar-chart-stacked-styled',
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
        className: 'fill-purple-800',
      },
      {
        key: 'iphone',
        className: 'fill-purple-600',
      },
      {
        key: 'ipad',
        className: 'fill-purple-400',
      },
      {
        key: 'wearables',
        className: 'fill-purple-300',
      },
      {
        key: 'services',
        className: 'fill-purple-200',
      },
    ],
    y: { key: 'year', className: 'text-red-500', padding: 10 },
  },
});

export const WithDrawing = meta.story({
  args: {
    ...Styled.input.args,
    id: 'waterfall-drawing-styled',
    drawing: {
      duration: 1000,
    },
  },
});

export const DrawingWithDelay = meta.story({
  args: {
    ...Styled.input.args,
    id: 'waterfall-drawing-delay',
    drawing: {
      duration: 1000,
      delay: 200,
    },
  },
});
