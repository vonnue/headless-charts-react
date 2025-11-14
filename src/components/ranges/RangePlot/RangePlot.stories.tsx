import preview from '../../../../.storybook/preview';
import RangePlot from '.';
import data from './sample.json';

const meta = preview.meta({
  title: 'Ranges/RangePlot',
  component: RangePlot,
  tags: ['autodocs'],
});

export const Default = meta.story({
  args: {
    id: 'dot-plot-default',
    data,

    y: {
      key: 'label',
      axis: 'left',
    },
    x: {
      minKey: 'minTemp',
      maxKey: 'maxTemp',
    },
  },
});

export const CustomShape = meta.story({
  args: {
    ...Default.input.args,
    id: 'dot-plot-custom-shape',
    shape: 'star',
  },
});

export const CustomTooltip = meta.story({
  args: {
    ...Default.input.args,
    id: 'dot-plot-custom-tooltip',
    tooltip: {
      keys: ['minTemp', 'maxTemp'],
    },
  },
});

export const CustomTooltipHtml = meta.story({
  args: {
    ...Default.input.args,
    id: 'dot-plot-custom-tooltip-html',
    tooltip: {
      html: (d: any) => {
        return `
          <div>
            <div>${d.label}</div>
            <div>Min: ${d.minTemp}</div>
            <div>Max: ${d.maxTemp}</div>
          </div>
        `;
      },
    },
  },
});
