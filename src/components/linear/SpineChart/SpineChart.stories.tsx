import preview from '../../../../.storybook/preview';
import SpineChart from '.';

const meta = preview.meta({
  title: 'Linear/SpineChart',
  component: SpineChart,
  tags: ['autodocs'],
});

/**
 * There are cases where you want to split a normal bar chart into two different bars, but share the same axes.
 * For example, you want to show the distribution of a product in two different categories.
 * In this case, you can use the SpineChart component.
 *
 */

export const Default = meta.story({
  args: {
    data: [
      {
        name: 'wearables',
        value2: 6,
        value3: 7,
        value4: 8,
      },
      {
        name: 'services',
        value2: 4,
        value3: 6,
        value4: 8,
      },
      {
        name: 'wearables',
        value2: 1,
        value3: 2,
        value4: 3,
      },
    ],
    id: 'spine-chart-default',
    y: {
      key: 'name',
    },
    x: [
      { key: 'value2', direction: 'left' },
      { key: 'value3', direction: 'right' },
      { key: 'value4', direction: 'left' },
    ],
  },
});

export const WithStyle = meta.story({
  args: {
    ...Default.input.args,
    id: 'spine-chart-with-style',
    x: [
      { key: 'value2', direction: 'left', className: 'fill-purple-700' },
      { key: 'value3', direction: 'right', className: 'fill-red-700' },
      { key: 'value4', direction: 'left', className: 'fill-orange-300' },
    ],
  },
});

export const WithYAxisToLeft = meta.story({
  args: {
    ...WithStyle.input.args,
    id: 'spine-chart-y-direction-left',
    y: {
      key: 'name',
      axis: 'left',
    },
    margin: {
      top: 20,
      bottom: 20,
      left: 70,
      right: 40,
      middle: 0,
    },
  },
});

export const YAxisRight = meta.story({
  args: {
    ...WithStyle.input.args,
    id: 'spine-chart-y-axis-middle',
    margin: {
      top: 20,
      bottom: 20,
      left: 40,
      right: 70,
      middle: 0,
    },
    y: {
      key: 'name',
      axis: 'right',
    },
  },
});

export const WithCustomPaddingBar = meta.story({
  args: {
    ...Default.input.args,
    id: 'spine-chart-with-padding-bar',
    paddingBar: 0.1,
  },
});

export const XAxisTop = meta.story({
  args: {
    ...Default.input.args,
    id: 'spine-chart-x-axis-top',
    x: [
      {
        key: 'value2',
        direction: 'left',
        className: 'fill-purple-700',
      },
      { key: 'value3', direction: 'right', className: 'fill-red-700' },
      { key: 'value4', direction: 'left', className: 'fill-orange-300' },
    ],
    xAxis: 'top',
  },
});

export const WithTooltip = meta.story({
  args: {
    ...Default.input.args,
    id: 'spine-chart-with-tooltip',
    tooltip: {
      keys: ['value2', 'value3', 'value4'],
      className: 'bg-gray-800 text-white p-2 rounded-md shadow-md',
    },
  },
});

export const WithCustomTooltip = meta.story({
  args: {
    ...Default.input.args,
    id: 'spine-chart-with-custom-tooltip',
    tooltip: {
      html: (d: any) => `
        <div class="bg-gray-800 text-white p-2 rounded-md shadow-md">
          <div class="font-bold">${d.name}</div>
          <div>${d.value2}</div>
          <div>${d.value3}</div>
          <div>${d.value4}</div>
        </div>
      `,
    },
  },
});

export const WithCustomStyleAttribute = meta.story({
  args: {
    ...WithStyle.input.args,
    id: 'spine-chart-with-custom-style-attribute',
    style: {
      width: 2048,
    },
  },
});
