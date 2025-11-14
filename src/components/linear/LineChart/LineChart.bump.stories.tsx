import preview from '../../../../.storybook/preview';
import './index.css';

import LineChart from '.';
import { convertToRanks } from '../../../utils';

import data from '../AreaChart/data.json';

/**
 * Bump charts are used to compare the rank of a set of data points over time.
 */
const meta = preview.meta({
  title: 'Linear/LineChart/Ranked',
  component: LineChart,
  tags: ['autodocs'],
});

const x = { key: 'year' };

const y = [
  {
    key: 'macbook',
    className:
      'text-slate-200 group-hover:text-red-800 group-hover:stroke-2 group-hover:z-10',
    label: {
      show: true,
      className: 'fill-red-800 text-xs group-hover:font-bold',
    },
  },
  {
    key: 'iphone',
    className:
      'text-slate-200 group-hover:text-blue-500 group-hover:stroke-2 group-hover:font-bold group-hover:z-10',
    label: {
      show: true,
      className: 'fill-blue-500 text-xs group-hover:font-bold',
    },
  },
  {
    key: 'ipad',
    className:
      'text-slate-200 group-hover:text-yellow-600 group-hover:stroke-2 group-hover:font-bold group-hover:z-10',
    label: {
      show: true,
      className: 'fill-yellow-600 text-xs group-hover:font-bold',
    },
  },
  {
    key: 'wearables',
    className:
      'text-slate-200 group-hover:text-red-500 group-hover:stroke-2 group-hover:font-bold group-hover:z-10',
    label: {
      show: true,
      className: 'fill-red-500 text-xs group-hover:font-bold',
    },
  },
  {
    key: 'services',
    className:
      'text-slate-200 group-hover:text-green-600 group-hover:stroke-2 group-hover:font-bold group-hover:z-10',
    label: {
      show: true,
      className: 'fill-green-600 text-xs group-hover:font-bold',
    },
  },
];

/**
 * Rather than using the default data, we convert the data to ranks
 */

export const RankedLine = meta.story({
  args: {
    data: convertToRanks(data, y, x),
    x,
    y,
    id: 'bump-ranked-chart',
    tooltip: {
      className: 'bg-gray-800 text-white',
    },
    padding: {
      top: 10,
      right: 80,
      bottom: 30,
      left: 10,
    },
    yLeftLabel: 'rank',
    reverse: true,
  },
});
/**
 * curve can be set to bumpX to make the lines more horizontal
 */

export const bumpX = meta.story({
  args: {
    ...RankedLine.input.args,
    id: 'bump-ranked-chart',
    x: { key: 'year', axisTicks: 3 },
    y: y.map((d) => ({ ...d, curve: 'bumpX' })),
  },
});
