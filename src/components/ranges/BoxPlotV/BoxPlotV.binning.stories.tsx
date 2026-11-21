import preview from '../../../../.storybook/preview';
import BoxPlotV from '.';

const meta = preview.meta({
  title: 'Ranges/BoxPlotV/Binning',
  component: BoxPlotV,
  tags: ['autodocs'],
});

// Raw data: age and salary for many individuals
const rawData = [
  { age: 22, salary: 30000 }, { age: 24, salary: 35000 }, { age: 25, salary: 32000 },
  { age: 27, salary: 40000 }, { age: 28, salary: 38000 }, { age: 29, salary: 42000 },
  { age: 30, salary: 45000 }, { age: 31, salary: 48000 }, { age: 32, salary: 50000 },
  { age: 33, salary: 47000 }, { age: 34, salary: 52000 }, { age: 35, salary: 55000 },
  { age: 36, salary: 53000 }, { age: 37, salary: 58000 }, { age: 38, salary: 60000 },
  { age: 39, salary: 57000 }, { age: 40, salary: 62000 }, { age: 41, salary: 65000 },
  { age: 42, salary: 63000 }, { age: 43, salary: 68000 }, { age: 44, salary: 70000 },
  { age: 45, salary: 72000 }, { age: 46, salary: 68000 }, { age: 47, salary: 75000 },
  { age: 48, salary: 78000 }, { age: 49, salary: 74000 }, { age: 50, salary: 80000 },
  { age: 52, salary: 82000 }, { age: 54, salary: 85000 }, { age: 55, salary: 78000 },
  { age: 57, salary: 88000 }, { age: 58, salary: 90000 }, { age: 60, salary: 92000 },
];

/**
 * Bin the age field into groups and show salary distribution per age group.
 * Box plot statistics (min, Q1, median, Q3, max) are computed automatically from raw data.
 */
export const SalaryByAgeGroup = meta.story({
  args: {
    data: rawData,
    id: 'boxplotv-binned',
    x: {
      key: 'age',
      bin: { count: 5 },
      axis: { location: 'bottom', label: 'Age Group' },
    },
    y: {
      minKey: '_min',
      maxKey: '_max',
      midKey: '_median',
      boxStart: '_q1',
      boxEnd: '_q3',
      min: 0,
      axis: { location: 'left', label: 'Salary' },
    },
    valueKey: 'salary',
  },
});

/**
 * Custom thresholds for age grouping.
 */
export const CustomAgeThresholds = meta.story({
  args: {
    ...SalaryByAgeGroup.input.args,
    id: 'boxplotv-binned-thresholds',
    x: {
      key: 'age',
      bin: { count: 4, thresholds: [30, 40, 50] },
      axis: { location: 'bottom', label: 'Age Group' },
    },
  },
});
