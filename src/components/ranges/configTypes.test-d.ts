/*
 * Type-level tests for the range charts' axis configs. Run by Vitest's
 * typecheck mode (see `test.typecheck` in vite.config.ts) as part of
 * `vitest run`, so a type regression fails the test run.
 */
import { assertType, describe, expectTypeOf, test } from 'vitest';
import type { ComponentProps } from 'react';

import type BoxPlotH from './BoxPlotH';
import type BoxPlotV from './BoxPlotV';
import type CometPlot from './CometPlot';
import type RangePlot from './RangePlot';

type H = ComponentProps<typeof BoxPlotH>;
type V = ComponentProps<typeof BoxPlotV>;
type Comet = ComponentProps<typeof CometPlot>;
type Range = ComponentProps<typeof RangePlot>;

const statKeys = {
  minKey: 'min',
  maxKey: 'max',
  boxStart: 'q1',
  boxEnd: 'q3',
  midKey: 'mid',
};

describe('value-axis key is optional (never read)', () => {
  test('BoxPlotH x / BoxPlotV y', () => {
    assertType<H>({ id: 'a', data: [], y: { key: 'name' }, x: { ...statKeys, min: 0 } });
    assertType<V>({ id: 'a', data: [], x: { key: 'name' }, y: { ...statKeys } });
  });

  test('RangePlot and CometPlot x', () => {
    assertType<Range>({
      id: 'a',
      data: [],
      shape: 'circle',
      y: { key: 'label' },
      x: { minKey: 'minTemp', maxKey: 'maxTemp' },
    });
    assertType<Comet>({ id: 'a', data: [], y: { key: 'label' }, x: { fromKey: 'from', toKey: 'to' } });
  });

  test('category-axis key is still required', () => {
    expectTypeOf({ id: 'a', data: [], y: {}, x: { ...statKeys } }).not.toExtend<H>();
    expectTypeOf({ id: 'a', data: [], x: {}, y: { ...statKeys } }).not.toExtend<V>();
    expectTypeOf({ id: 'a', data: [], y: {}, x: { fromKey: 'f', toKey: 't' } }).not.toExtend<Comet>();
  });
});

describe('BoxPlot summary vs binned mode', () => {
  test('summary mode with every stat key', () => {
    expectTypeOf({ id: 'a', data: [], y: { key: 'name' }, x: statKeys }).toExtend<H>();
    expectTypeOf({ id: 'a', data: [], x: { key: 'name' }, y: statKeys }).toExtend<V>();
  });

  test('binned mode needs bin + valueKey, not stat keys', () => {
    assertType<H>({ id: 'a', data: [], valueKey: 'salary', y: { key: 'age', bin: { count: 5 } }, x: { min: 0 } });
    assertType<V>({ id: 'a', data: [], valueKey: 'salary', x: { key: 'age', bin: { count: 5 } }, y: {} });
    // '' is still a string, so it is binned mode; the runtime predicate agrees
    assertType<H>({ id: 'a', data: [], valueKey: '', y: { key: 'age', bin: { count: 5 } }, x: {} });
  });

  test('missing stat keys are rejected outside binned mode', () => {
    // no bin, no valueKey
    expectTypeOf({ id: 'a', data: [], y: { key: 'name' }, x: { min: 0 } }).not.toExtend<H>();
    // valueKey without bin
    expectTypeOf({ id: 'a', data: [], valueKey: 'salary', y: { key: 'age' }, x: {} }).not.toExtend<H>();
    // bin without valueKey
    expectTypeOf({ id: 'a', data: [], x: { key: 'age', bin: { count: 5 } }, y: {} }).not.toExtend<V>();
    // bin explicitly undefined
    expectTypeOf({
      id: 'a',
      data: [],
      valueKey: 'salary',
      y: { key: 'age', bin: undefined },
      x: {},
    }).not.toExtend<H>();
  });
});
