import preview from '../../../../.storybook/preview';
import { ResizableBox } from '../../../../.storybook/ResizableContainer';
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

/**
 * Charts follow the size of their container, not only `style.width`/`style.height`.
 * Drag the bottom-right corner of the box to resize it: the chart is sized with
 * `width: 100%; height: 100%` and redraws at the new size, once per animation frame.
 */
export const ResizableContainer = meta.story({
  args: {
    ...Default.input.args,
    id: 'range-plot-resizable',
    style: { width: '100%', height: '100%' },
  },
  render: (args) => (
    <ResizableBox>
      <RangePlot {...args} />
    </ResizableBox>
  ),
});
