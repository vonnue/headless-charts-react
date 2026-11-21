import preview from '../../../../.storybook/preview';
import BarChart from '.';
import data from './sample.json';

/**
 * Stacked layouts: set `stacking` to stack each row's series. `'normal'`
 * stacks from 0 in series order (negative values stack the other way),
 * `'100%'` shows each series' share of its row (absolute totals are lost —
 * use `'normal'` when totals matter), and `'diverging'` draws Likert or
 * sentiment bars around 0. `BarChartStacked` and `ColumnChartStacked` are
 * wrappers for the normal form.
 */
const meta = preview.meta({
  title: 'Linear/BarChart/Stacked',
  component: BarChart,
  tags: ['autodocs'],
});

const products = [
  { key: 'macbook', className: 'fill-purple-800' },
  { key: 'iphone', className: 'fill-purple-600' },
  { key: 'ipad', className: 'fill-purple-400' },
  { key: 'wearables', className: 'fill-purple-300' },
  { key: 'services', className: 'fill-purple-200' },
];

/** Vertical stacked columns (what `ColumnChartStacked` renders). */
export const StackedVertical = meta.story({
  args: {
    className: 'w-full h-80',
    data,
    id: 'bar-chart-stacked-vertical',
    stacking: { type: 'normal' },
    x: { key: 'year' },
    y: products,
  },
});

/** Horizontal stacked bars (what `BarChartStacked` renders). */
export const StackedHorizontal = meta.story({
  args: {
    className: 'w-full h-80',
    data,
    id: 'bar-chart-stacked-horizontal',
    orientation: 'horizontal',
    stacking: { type: 'normal' },
    y: { key: 'year' },
    x: products,
  },
});

/** Styled stack with custom margin and band padding (from the old stacked Intro stories). */
export const StackedStyled = meta.story({
  args: {
    ...StackedVertical.input.args,
    id: 'bar-chart-stacked-styled',
    className: 'w-full h-80 bg-gray-100 rounded',
    padding: { top: 20, right: 20, bottom: 20, left: 5, bar: 0.1 },
    margin: { top: 10, right: 40, bottom: 40, left: 60 },
  },
});

/** Mixed signs: positive values stack up from 0 and negative values stack down. */
export const StackedNegative = meta.story({
  args: {
    className: 'w-full h-80',
    id: 'bar-chart-stacked-negative',
    stacking: { type: 'normal' },
    data: [
      { quarter: 'Q1', gain: 12, loss: -4 },
      { quarter: 'Q2', gain: 8, loss: -9 },
      { quarter: 'Q3', gain: 15, loss: -2 },
    ],
    x: { key: 'quarter' },
    y: [
      { key: 'gain', className: 'fill-green-600' },
      { key: 'loss', className: 'fill-green-600', classNameNegative: 'fill-red-500' },
    ],
  },
});

/** 100% stacked columns: every bar fills the axis; ticks are percentages. */
export const PercentVertical = meta.story({
  args: {
    ...StackedVertical.input.args,
    id: 'bar-chart-stacked-percent-vertical',
    stacking: { type: '100%' },
    tooltip: {},
  },
});

/** 100% stacked bars, horizontal. */
export const PercentHorizontal = meta.story({
  args: {
    ...StackedHorizontal.input.args,
    id: 'bar-chart-stacked-percent-horizontal',
    stacking: { type: '100%' },
    tooltip: {},
  },
});

const survey = [
  { question: 'Easy to use', sd: 5, d: 10, n: 20, a: 40, sa: 25 },
  { question: 'Fast', sd: 10, d: 20, n: 25, a: 30, sa: 15 },
  { question: 'Good value', sd: 20, d: 25, n: 20, a: 25, sa: 10 },
];
// A diverging palette (RdBu) with a grey neutral; avoid red/green-only pairs.
const likert = [
  { key: 'sd', className: 'fill-red-700', axis: { label: 'Strongly disagree' } },
  { key: 'd', className: 'fill-red-400', axis: { label: 'Disagree' } },
  { key: 'n', className: 'fill-gray-300', axis: { label: 'Neutral' } },
  { key: 'a', className: 'fill-blue-400', axis: { label: 'Agree' } },
  { key: 'sa', className: 'fill-blue-700', axis: { label: 'Strongly agree' } },
];

/**
 * Likert chart: the `negative` series sit left of 0 (the last one touches 0),
 * `neutral` is split across 0, and `percent` normalises each row to 100%.
 */
export const DivergingHorizontal = meta.story({
  args: {
    className: 'w-full h-80',
    id: 'bar-chart-stacked-likert',
    data: survey,
    orientation: 'horizontal',
    stacking: { type: 'diverging', negative: ['sd', 'd'], neutral: 'n', percent: true },
    y: { key: 'question' },
    x: likert,
    tooltip: {},
  },
});

/** Diverging stacked columns with raw counts: a symmetric `[-M, M]` axis. */
export const DivergingVertical = meta.story({
  args: {
    className: 'w-full h-80',
    id: 'bar-chart-stacked-diverging-vertical',
    data: survey,
    stacking: { type: 'diverging', negative: ['sd', 'd'], neutral: 'n' },
    x: { key: 'question' },
    y: likert,
  },
});
