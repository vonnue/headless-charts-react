import preview from '../../../../.storybook/preview';
import ScatterPlot from '.';
import data from './sample.json';

/**
 * Scatterplots show how much one variable is affected by another. The relationship between two variables is called their correlation. You can additionally encode more attributes. Color, size, and shape can be used to encode additional attributes. Color is the most common, but size and shape can be useful for making your plot more accessible.
 *
 * Essentially you can encode 2 categorical values(shape & color) & 3 numerical values(x,y & size).
 */
const meta = preview.meta({
  title: 'Distribution/ScatterPlot/Tooltip',
  component: ScatterPlot,
  tags: ['autodocs'],
});

/**
 * This is the default rendering of the scatterplot with no additional attributes. The x & y axis are automatically generated based on the data provided.
 */

export const Default = meta.story({
  args: {
    id: 'scatterplot-tooltip',
    data,
    x: {
      key: 'gdp',
    },
    y: {
      key: 'purchasing_power',
    },
    tooltip: {},
  },
});

/**
 * Style tooltip
 */

export const Styled = meta.story({
  args: {
    ...Default.input.args,
    id: 'scatterplot-tooltip-styled',
    tooltip: {
      className: 'bg-gray-100 text-gray-900 p-2 rounded',
    },
  },
});

/**
 * Change keys to be shown in tooltip
 */

export const ChangeKeys = meta.story({
  args: {
    ...Styled.input.args,
    id: 'scatterplot-tooltip-keys',
    tooltip: {
      ...Styled.input.args.tooltip,
      keys: ['country', 'continent', 'gdp', 'purchasing_power'],
    },
  },
});

/**
 * Customize the html inside the tooltip
 */

export const CustomHtml = meta.story({
  args: {
    ...ChangeKeys.input.args,
    id: 'scatterplot-tooltip-html',
    tooltip: {
      ...ChangeKeys.input.args.tooltip,
      html: (d: any) => {
        return `<div class="flex flex-col">
          <div class="text-lg font-bold">${d.country}</div>
          <div>${d.continent}</div>
          <div>GDP: ${d.gdp}</div>
          <div>Purchasing Power: ${d.purchasing_power}</div>
        </div>`;
      },
    },
  },
});
