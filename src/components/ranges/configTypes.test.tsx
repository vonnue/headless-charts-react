import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import type { ComponentProps } from 'react';

import BoxPlotH from './BoxPlotH';
import BoxPlotV from './BoxPlotV';
import CometPlot from './CometPlot';
import RangePlot from './RangePlot';

type BoxPlotHProps = ComponentProps<typeof BoxPlotH>;
type BoxPlotVProps = ComponentProps<typeof BoxPlotV>;
type CometPlotProps = ComponentProps<typeof CometPlot>;
type RangePlotProps = ComponentProps<typeof RangePlot>;

const statKeys = {
  minKey: 'min',
  maxKey: 'max',
  boxStart: 'q1',
  boxEnd: 'q3',
  midKey: 'mid',
};

const rawRows = [
  { age: 22, salary: 30000 },
  { age: 25, salary: 32000 },
  { age: 27, salary: 40000 },
  { age: 35, salary: 55000 },
  { age: 38, salary: 60000 },
  { age: 50, salary: 80000 },
  { age: 55, salary: 78000 },
];

/*
 * Type-level checks: these are verified by `tsc --noEmit` (tests are part of
 * the tsconfig include). A wrong `@ts-expect-error` fails the type check.
 */

// Value-axis `key` is optional (it is never read for these axes)
export const hSummaryNoKey: BoxPlotHProps = {
  id: 'a',
  data: [],
  y: { key: 'name' },
  x: { ...statKeys, min: 0 },
};
export const vSummaryNoKey: BoxPlotVProps = {
  id: 'a',
  data: [],
  x: { key: 'name' },
  y: { ...statKeys },
};
export const rangeNoKey: RangePlotProps = {
  id: 'a',
  data: [],
  shape: 'circle',
  y: { key: 'label' },
  x: { minKey: 'minTemp', maxKey: 'maxTemp' },
};
export const cometNoKey: CometPlotProps = {
  id: 'a',
  data: [],
  y: { key: 'label' },
  x: { fromKey: 'from', toKey: 'to' },
};

// Binned mode: stat keys may be omitted when bin + valueKey are set
export const hBinned: BoxPlotHProps = {
  id: 'a',
  data: [],
  valueKey: 'salary',
  y: { key: 'age', bin: { count: 5 } },
  x: { min: 0 },
};
export const vBinned: BoxPlotVProps = {
  id: 'a',
  data: [],
  valueKey: 'salary',
  x: { key: 'age', bin: { count: 5 } },
  y: {},
};

// Summary mode still requires every stat key...
// @ts-expect-error -- missing stat keys without bin + valueKey
export const hMissingKeys: BoxPlotHProps = { id: 'a', data: [], y: { key: 'name' }, x: { min: 0 } };
// ...including when only one of bin / valueKey is given
// @ts-expect-error -- valueKey without y.bin is not binned mode
export const hValueKeyOnly: BoxPlotHProps = { id: 'a', data: [], valueKey: 'salary', y: { key: 'age' }, x: {} };
// @ts-expect-error -- x.bin without valueKey is not binned mode
export const vBinOnly: BoxPlotVProps = { id: 'a', data: [], x: { key: 'age', bin: { count: 5 } }, y: {} };
// The category axis key is still required
// @ts-expect-error -- y.key is the category key and is read at runtime
export const hNoCategoryKey: BoxPlotHProps = { id: 'a', data: [], y: {}, x: { ...statKeys } };

describe('range chart config types', () => {
  it('renders binned BoxPlotH without stat keys', () => {
    render(
      <BoxPlotH
        id='bp-h-binned'
        data={rawRows}
        valueKey='salary'
        y={{ key: 'age', bin: { count: 3 } }}
        x={{ min: 0 }}
      />
    );
    const rects = document.querySelectorAll('#bp-h-binned .box-plot-box');
    expect(rects.length).toBeGreaterThan(0);
  });

  it('renders binned BoxPlotV without stat keys', () => {
    render(
      <BoxPlotV
        id='bp-v-binned'
        data={rawRows}
        valueKey='salary'
        x={{ key: 'age', bin: { count: 3 } }}
        y={{}}
      />
    );
    const rects = document.querySelectorAll('#bp-v-binned .box-plot-box');
    expect(rects.length).toBeGreaterThan(0);
  });

  it('renders RangePlot without x.key', () => {
    render(
      <RangePlot
        id='range-no-key'
        shape='circle'
        data={[
          { label: 'Jan', minTemp: 25, maxTemp: 31 },
          { label: 'Feb', minTemp: 26, maxTemp: 32 },
        ]}
        y={{ key: 'label' }}
        x={{ minKey: 'minTemp', maxKey: 'maxTemp' }}
      />
    );
    expect(document.getElementById('range-no-key')).toBeTruthy();
  });
});
