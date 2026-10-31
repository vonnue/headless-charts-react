// Render checks for the range-chart config changes. Type-level checks live in
// configTypes.test-d.ts (Vitest typecheck).
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import BoxPlotH from './BoxPlotH';
import BoxPlotV from './BoxPlotV';
import CometPlot from './CometPlot';
import RangePlot from './RangePlot';
import { getBinValueKey, resolveValueConfig } from './boxPlotConfig';

const rawRows = [
  { age: 22, salary: 30000 },
  { age: 25, salary: 32000 },
  { age: 27, salary: 40000 },
  { age: 35, salary: 55000 },
  { age: 38, salary: 60000 },
  { age: 50, salary: 80000 },
  { age: 55, salary: 78000 },
];

const expectFiniteBoxes = (selector: string, attr: 'x' | 'y') => {
  const rects = Array.from(document.querySelectorAll(selector));
  expect(rects.length).toBeGreaterThan(0);
  rects.forEach((r) => {
    expect(Number.isFinite(Number(r.getAttribute(attr)))).toBe(true);
  });
  return rects;
};

describe('BoxPlot binned mode', () => {
  it('renders binned BoxPlotH without stat keys, with finite geometry', () => {
    render(
      <BoxPlotH
        id='bp-h-binned'
        data={rawRows}
        valueKey='salary'
        y={{ key: 'age', bin: { count: 3 } }}
        x={{ min: 0 }}
      />
    );
    expectFiniteBoxes('#bp-h-binned .box-plot-box', 'x');
  });

  it('renders binned BoxPlotV without stat keys, with finite geometry', () => {
    render(
      <BoxPlotV
        id='bp-v-binned'
        data={rawRows}
        valueKey='salary'
        x={{ key: 'age', bin: { count: 3 } }}
        y={{}}
      />
    );
    expectFiniteBoxes('#bp-v-binned .box-plot-box', 'y');
  });

  it("treats valueKey '' with bin as binned (same predicate as the types): no NaN boxes", () => {
    expect(getBinValueKey({ bin: { count: 3 } }, '')).toBe('');
    expect(getBinValueKey({ bin: { count: 3 } }, undefined)).toBeUndefined();
    expect(getBinValueKey({}, 'salary')).toBeUndefined();

    render(
      <BoxPlotH
        id='bp-h-empty-key'
        data={rawRows}
        valueKey=''
        y={{ key: 'age', bin: { count: 3 } }}
        x={{}}
      />
    );
    // No field named '' -> no stats -> nothing drawn, rather than NaN geometry
    expect(
      document.querySelectorAll('#bp-h-empty-key .box-plot-box')
    ).toHaveLength(0);
  });

  it('resolveValueConfig returns null instead of a config missing stat keys', () => {
    expect(resolveValueConfig({ min: 0 }, false)).toBeNull();
    expect(resolveValueConfig({ min: 0 }, true)).toMatchObject({
      minKey: '_min',
      midKey: '_median',
      min: 0,
    });
  });
});

describe('range charts without x.key', () => {
  const rows = [
    { label: 'Jan', lo: 25, hi: 31 },
    { label: 'Feb', lo: 26, hi: 32 },
  ];

  it('renders RangePlot start and end dots', () => {
    render(
      <RangePlot
        id='range-no-key'
        shape='circle'
        data={rows}
        y={{ key: 'label' }}
        x={{ minKey: 'lo', maxKey: 'hi' }}
      />
    );
    expect(document.querySelectorAll('#range-no-key .start-dots')).toHaveLength(2);
    expect(document.querySelectorAll('#range-no-key .end-dots')).toHaveLength(2);
  });

  it('renders CometPlot comets', () => {
    render(
      <CometPlot
        id='comet-no-key'
        data={rows}
        y={{ key: 'label' }}
        x={{ fromKey: 'lo', toKey: 'hi' }}
      />
    );
    expect(
      document.querySelectorAll('#comet-no-key .data path').length
    ).toBeGreaterThan(0);
  });
});
