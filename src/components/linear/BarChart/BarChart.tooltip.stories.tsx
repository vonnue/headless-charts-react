import { expect, userEvent, waitFor } from 'storybook/test';
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
  // First-batch interaction test: jsdom unit tests can fire mouseenter, but
  // this runs the same hover in a real Chromium via @storybook/addon-vitest.
  play: async ({ canvasElement }) => {
    const chartId = 'tooltip-default';
    const bar = await waitFor(() => {
      const el = canvasElement.querySelector(`#${chartId} .marks rect`);
      if (!el) throw new Error(`no bar mark in #${chartId}`);
      return el;
    });
    await userEvent.hover(bar);
    await waitFor(() => {
      const tip = document.getElementById(`tooltip-${chartId}`);
      expect(tip).toBeTruthy();
      expect(tip?.className).toContain('opacity-100');
      expect(tip?.innerHTML.length).toBeGreaterThan(0);
    });
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

/**
 * Stacked tooltip: the default HTML lists every series; the datum passed to
 * `tooltip.html` is the row (BarChartStacked used to pass a stack item).
 */
export const TooltipStacked = meta.story({
  args: {
    ...Tooltip.input.args,
    id: 'tooltip-stacked',
    stacking: { type: 'normal' },
  },
});

/** Stacked custom HTML reading the row directly. */
export const TooltipStackedCustomHTML = meta.story({
  args: {
    ...TooltipStacked.input.args,
    id: 'tooltip-stacked-custom-html',
    tooltip: {
      className: 'bg-gray-100 rounded p-2',
      html: (d: { year: number; macbook: number }) =>
        `<p class="text-xl">${d.year}</p><p class="text-xs">macbooks sold $${d.macbook}B</p>`,
    },
  },
});

/** 100% stacking: each line adds the series' share of the row. */
export const TooltipPercent = meta.story({
  args: {
    ...Tooltip.input.args,
    id: 'tooltip-percent',
    stacking: { type: '100%' },
  },
});

// One UTC instant per year, so the tooltip date matches in every time zone.
const timeData = data.map((d) => ({
  ...d,
  date: new Date(Date.UTC(d.year, 11, 31)).toISOString(),
}));

/** Vertical time mode: the tooltip starts with the formatted date. */
export const TooltipTime = meta.story({
  args: {
    id: 'tooltip-time',
    className: 'w-full h-80',
    data: timeData,
    x: { key: 'date', scalingFunction: 'time', time: { isISO: true, utc: true } },
    y: [
      { key: 'macbook', className: 'fill-purple-800' },
      { key: 'iphone', className: 'fill-purple-600' },
    ],
    tooltip: {},
  },
});
