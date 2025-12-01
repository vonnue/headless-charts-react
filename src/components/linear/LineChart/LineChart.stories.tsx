import preview from '../../../../.storybook/preview';
import './index.css';

import LineChart from '.';

const meta = preview.meta({
  title: 'Linear/LineChart/Intro',
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

export const Default = meta.story({
  args: {
    data,
    x: { key: 'id' },
    y: [{ key: 'value' }, { key: 'reading' }],
    id: 'default-line-chart',
  },
});

export const WithStyleChart = Default.extend({
  args: {
    id: 'with-style-chart',
    y: [
      { key: 'value', className: 'text-green-500' },
      { key: 'reading', className: 'text-blue-500' },
    ],
    className:
      'bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900 dark:to-blue-900',
  },
});

export const WithInsidePadding = Default.extend({
  args: {
    id: 'padding-for-line-chart',
    y: [
      { key: 'value', className: 'text-green-500' },
      { key: 'reading', className: 'text-blue-500' },
    ],
    className: '',
    paddingLeft: 15,
  },
});

export const TwoAxes = Default.extend({
  args: {
    id: 'two-axes-for-line-chart',
    y: [
      { key: 'value', className: 'text-green-500' },
      { key: 'reading', className: 'text-blue-500', axis: { location: 'right' } },
    ],
    marginRight: 40,
  },
});

export const Drawing = Default.extend({
  args: {
    id: 'drawing-line-chart',
    y: [
      { key: 'value', className: 'text-green-500' },
      { key: 'reading', className: 'text-blue-500', axis: { location: 'right' } },
    ],
    className: '',
    drawing: { duration: 2000 },
  },
});

export const Zooming = Default.extend({
  args: {
    id: 'line-chart-with-zooming',
    y: [
      { key: 'value', className: 'text-green-500' },
      { key: 'reading', className: 'text-blue-500', axis: { location: 'right' } },
    ],
    className: '',
    zooming: {
      min: 1,
      max: 4,
    },
  },
});

export const WithTooltip = Default.extend({
  args: {
    id: 'line-chart-with-tooltip',
    y: [
      { key: 'value', className: 'text-green-500' },
      { key: 'reading', className: 'text-blue-500' },
    ],
    tooltip: {
      keys: ['value', 'reading', 'id'],
      className: 'text-green-500',
      html: (row: any) => `${row.id} - ${row.value || ''}/${row.reading || ''}`,
    },
    showGuideLines: true,
  },
});

export const XAxisLabel = Default.extend({
  args: {
    id: 'line-chart-with-x-axis-label',
    x: { key: 'id', axis: { label: 'Some Index' } },
    y: [
      { key: 'value', className: 'text-green-500' },
      { key: 'reading', className: 'text-blue-500' },
    ],
    className: '',
  },
});

export const WithXAxisCustomStart = Default.extend({
  args: {
    id: 'line-chart-with-x-axis-custom-start',
    x: { key: 'id', axis: { label: 'Some Index' }, start: 0, end: 7 },
    y: [
      { key: 'value', className: 'text-green-500' },
      { key: 'reading', axis: { location: 'right' }, className: 'text-blue-500' },
    ],
    className: '',
  },
});

export const WithXAxisAtTop = Default.extend({
  args: {
    id: 'x-axis-at-top',
    x: { key: 'id', axis: { label: 'Some Index', location: 'top' } },
    y: [
      { key: 'value', className: 'text-green-500' },
      { key: 'reading', axis: { location: 'right' }, className: 'text-blue-500' },
    ],
    className: '',
  },
});

export const WithXAxisTicks = Default.extend({
  args: {
    id: 'x-axis-ticks',
    x: { key: 'id', axis: { label: 'Some Index', ticks: 15 } },
    y: [
      { key: 'value', className: 'text-green-500' },
      { key: 'reading', className: 'text-blue-500' },
    ],
    className: '',
  },
});

export const YAxisCustomStart = Default.extend({
  args: {
    id: 'y-axis-custom-start',
    x: { key: 'id', axis: { label: 'Some Index' } },
    y: [
      { key: 'value', className: 'text-green-500', start: 0 },
      {
        key: 'reading',
        className: 'text-blue-500',
        axis: { location: 'right', ticks: 3 },
        start: 0,
      },
    ],
    className: '',
  },
});

export const YAxisCustomSymbolChart = Default.extend({
  args: {
    id: 'y-axis-custom-label-chart',
    x: { key: 'id', axis: { label: 'Some Index' } },
    y: [
      {
        key: 'value',
        className: 'text-green-500',
        start: 0,
        symbol: 'diamond',
      },
      {
        key: 'reading',
        symbol: 'circle',
        className: 'text-blue-500',
        axis: { location: 'right', ticks: 3 },
        start: 0,
      },
    ],
    className: '',
  },
});

export const YAxisUnknown = Default.extend({
  args: {
    id: 'y-axis-unknown-chart',
    x: { key: 'id', axis: { label: 'Some Index' } },
    y: [
      {
        key: 'value',
        className: 'text-green-500',
        start: 0,
        symbol: 'diamond',
        unknown: 'zero',
      },
      {
        key: 'reading',
        symbol: 'circle',
        className: 'text-blue-500',
        axis: { location: 'right', ticks: 3 },
        unknown: 'zero',
        start: 0,
      },
    ],
    className: '',
  },
});

export const YAxisLabel = Default.extend({
  args: {
    id: 'y-axis-custom-label-chart',
    x: { key: 'id', axis: { label: 'Some Index' } },
    y: [
      {
        key: 'value',
        className: 'text-green-500',
        start: 0,
        symbol: 'diamond',
        axis: { label: 'Volume' },
      },
      {
        key: 'value',
        symbol: 'circle',
        className: 'text-blue-500',
        axis: { location: 'right', label: 'Pressure', ticks: 3 },
        start: 0,
      },
    ],
    className: '',
  },
});

export const YAxisCurve = Default.extend({
  args: {
    id: 'y-axis-custom-curve-chart',
    x: { key: 'id', axis: { label: 'Some Index' } },
    y: [
      {
        key: 'value',
        className: 'text-green-500',
        start: 0,
        symbol: 'diamond',
        curve: 'step',
      },
      {
        key: 'reading',
        symbol: 'circle',
        className: 'text-blue-500',
        axis: { location: 'right', ticks: 3 },
        start: 0,
      },
    ],
    className: '',
  },
});

export const LineChartVertical = Default.extend({
  args: {
    id: 'horizontal-line-chart',
    y: [
      { key: 'value', className: 'text-green-500' },
      { key: 'reading', className: 'text-blue-500' },
    ],
    tooltip: { keys: ['id', 'value', 'reading'] },
    referenceLines: [
      { x: 4, className: 'stroke-current text-blue-200 stroke-2 dashed' },
    ],
  },
});

export const LineChartHorizontal = Default.extend({
  args: {
    id: 'vertical-line-chart',
    y: [
      { key: 'value', className: 'text-green-500' },
      { key: 'reading', className: 'text-blue-500' },
    ],
    tooltip: { keys: ['id', 'value', 'reading'] },
    referenceLines: [
      {
        yLeft: 1600,
        className: 'stroke-current text-blue-200, stroke-1 dashed',
      },
    ],
  },
});

export const SeriesLabel = Default.extend({
  args: {
    id: 'line-chart-with-series-label',
    padding: { top: 10, right: 50, bottom: 10, left: 10 },
    y: [
      {
        key: 'value',
        className: 'text-green-500',
        label: {
          show: true,
          className: 'fill-green-500 text-xs group-hover:font-bold',
        },
      },
      {
        key: 'reading',
        className: 'text-blue-500',
        label: {
          show: true,
          className: 'fill-blue-500 text-xs group-hover:font-bold',
        },
      },
    ],
    className: '',
  },
});
