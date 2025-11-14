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
  title: 'Linear/BarChart/Tooltips',
  component: BarChart,
  tags: ['autodocs'],
});

export const Tooltip = meta.story({
  args: {
    data,
    id: 'tooltip-default',
    className: 'h-screen',
    x: [
      {
        key: 'macbook',
        className: 'fill-purple-500 dark:fill-purple-100 rounded',
      },
      { key: 'services', className: 'fill-purple-400 dark:fill-purple-100' },
      { key: 'ipad', className: 'fill-green-500 dark:fill-green-100' },
      { key: 'iphone', className: 'fill-purple-500 dark:fill-purple-100' },
      { key: 'wearables', className: 'fill-purple-900 dark:fill-purple-100' },
    ],
    y: { key: 'year' },
    tooltip: {},
  },
});

export const Styled = meta.story({
  args: {
    ...Tooltip.input.args,
    id: 'tooltip-styled',
    tooltip: {
      className: 'bg-gray-100 rounded p-2 shadow-lg',
    },
  },
});

export const TooltipCustomKeys = meta.story({
  args: {
    ...Styled.input.args,
    id: 'tooltip-custom-keys',
    tooltip: {
      ...Styled.input.args.tooltip,
      keys: ['year', 'macbook'],
    },
  },
});

export const TooltipCustomHTML = meta.story({
  args: {
    ...TooltipCustomKeys.input.args,
    id: 'tooltip-custom-html',
    tooltip: {
      ...TooltipCustomKeys.input.args.tooltip,
      html: (d: any) => {
        return `<h3 class="text-xl font-semibold">${d.year}</h3><p class="text-lg">${d.macbook} macbook and ${d.services} reading</p>`;
      },
    },
  },
});
