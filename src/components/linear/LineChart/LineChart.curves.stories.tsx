import preview from '../../../../.storybook/preview';
import './index.css';

import LineChart from '.';

const meta = preview.meta({
  title: 'Linear/LineChart/Curves',
  component: LineChart,
  tags: ['autodocs'],
});

const data = [
  { id: 1, value: 1311, reading: 1500 },
  { id: 2, reading: 1912 },
  { id: 3, value: 1000 },
  { id: 4, value: 1513 },
  { id: 5, value: 1351, reading: 1000 },
  { id: 6, value: 1451, reading: 1200 },
];

export const DefaultLine = meta.story({
  args: {
    data,
    x: { key: 'id' },
    y: [{ key: 'value' }, { key: 'reading' }],
    id: 'default-line-chart',
  },
});

export const CurvedLine = meta.story({
  args: {
    ...DefaultLine.input.args,
    id: 'curved-line-chart',
    y: [
      { key: 'value', className: 'text-green-500', curve: 'rounded' },
      { key: 'reading', className: 'text-blue-500', curve: 'rounded' },
    ],
  },
});

export const Step = meta.story({
  args: {
    ...DefaultLine.input.args,
    id: 'step-line-chart',
    y: [
      { key: 'value', className: 'text-green-500', curve: 'step' },
      { key: 'reading', className: 'text-blue-500', curve: 'step' },
    ],
  },
});

export const BumpX = meta.story({
  args: {
    ...DefaultLine.input.args,
    id: 'bump-x-line-chart',
    y: [
      { key: 'value', className: 'text-green-500', curve: 'bumpX' },
      { key: 'reading', className: 'text-blue-500', curve: 'bumpX' },
    ],
  },
});
