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
    shape: 'circle',
    y: {
      key: 'label',
      axis: { location: 'left' },
    },
    x: {
      minKey: 'minTemp',
      maxKey: 'maxTemp',
      start: 0,
      end: 100,
      axis: { location: 'bottom', ticks: 5 },
    },
  },
});

export const CustomShape = Default.extend({
  args: {
    id: 'dot-plot-custom-shape',
  },
});

export const CustomTooltip = Default.extend({
  args: {
    id: 'dot-plot-custom-tooltip',
    tooltip: {
      keys: ['minTemp', 'maxTemp'],
    },
  },
});

export const CustomTooltipHtml = Default.extend({
  args: {
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
