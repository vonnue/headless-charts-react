import preview from '../../../../.storybook/preview';

import PieChart from '.';
import data from './sample.json';

const classNameMap = {
  macbook: 'fill-purple-700 dark:fill-purple-100',
  services: 'fill-  purple-500 dark:fill-purple-300',
  wearables: 'fill-purple-300 dark:fill-purple-500',
};

/**
 * Donut charts are a variant of pie charts. Simply specify an `innerRadius` prop
 */
const meta = preview.meta({
  title: 'Distribution/PieChart/Tooltips',
  component: PieChart,
  tags: ['autodocs'],
  args: {
    data,
    valueKey: 'Y2012',
    classNameMap,
    nameKey: 'name',
    tooltip: {},
  },
});

/**
 * Tooltips can be enabled by adding a `tooltip` prop (`{}` will render Styled behaviour).
 */
export const Tooltip = meta.story({
  args: {
    id: 'tooltip',
  },
});

/**
 * Tooltip divs can be styled by passing a `tooltip` prop with a `className` property.
 * */
export const TooltipStyled = meta.story({
  args: {
    id: 'tooltip-styled',
    tooltip: {
      className: 'bg-purple-700 text-white p-2 rounded',
    },
  },
});

/**
 * The `tooltip.keys` prop can be used to specify which keys in the data array to show in the tooltip (Even those not used in creating the pie).
 * */
export const TooltipKeys = meta.story({
  args: {
    ...Tooltip.input.args,
    id: 'tooltip-custom',
    tooltip: {
      ...TooltipStyled.input.args?.tooltip,
      keys: ['name', 'Y2012', 'Europe', 'Africa'],
    },
  },
});

/**
 * The `tooltip.html` prop can be used to specify a custom text to show in the tooltip. The function will be passed the data object.
 * */
export const TooltipCustomHtml = meta.story({
  args: {
    ...Tooltip.input.args,
    id: 'tooltip-custom-html',
    tooltip: {
      ...TooltipStyled.input.args?.tooltip,
      html: (d: any) =>
        `${d.data.name} sold ${d.value || 0} in Y2012 , ${
          d.data['Europe'] || 0
        } in Europe, ${d.data['Africa'] || 0} in Africa and ${
          d.data['APAC'] || 0
        } in Asia/Pacific.`,
    },
  },
});
