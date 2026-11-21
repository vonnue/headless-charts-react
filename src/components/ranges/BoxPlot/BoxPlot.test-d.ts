/*
 * Type-level tests for the unified BoxPlot (#76, spec test 25 and the type
 * half of test 27). Run by Vitest's typecheck mode as part of `vitest run`.
 */
import { assertType, describe, expectTypeOf, test } from 'vitest';
import type { ComponentProps } from 'react';

import type {
  BoxPlot,
  BoxPlotClassNames,
  BoxPlotH,
  BoxPlotHProps,
  BoxPlotProps,
  BoxPlotV,
  BoxPlotVProps,
  ChartOrientation,
} from '@/index';

type U = ComponentProps<typeof BoxPlot>;
type H = ComponentProps<typeof BoxPlotH>;
type V = ComponentProps<typeof BoxPlotV>;

const statKeys = {
  minKey: 'min',
  maxKey: 'max',
  boxStart: 'q1',
  boxEnd: 'q3',
  midKey: 'mid',
};

describe('25: BoxPlot types', () => {
  test('orientation "horizontal" with stat keys on y is an error', () => {
    expectTypeOf({
      id: 'a',
      data: [],
      orientation: 'horizontal' as const,
      x: { key: 'name' },
      y: statKeys,
    }).not.toExtend<U>();
    // ...while each orientation with its own layout is fine
    assertType<U>({ id: 'a', data: [], orientation: 'horizontal', y: { key: 'name' }, x: statKeys });
    assertType<U>({ id: 'a', data: [], orientation: 'vertical', x: { key: 'name' }, y: statKeys });
    assertType<U>({ id: 'a', data: [], x: { key: 'name' }, y: statKeys });
  });

  test('BoxPlotH rejects orientation "vertical"', () => {
    expectTypeOf({
      id: 'a',
      data: [],
      orientation: 'vertical' as const,
      y: { key: 'name' },
      x: statKeys,
    }).not.toExtend<H>();
    assertType<H>({ id: 'a', data: [], orientation: 'horizontal', y: { key: 'name' }, x: statKeys });
  });

  test('BoxPlotV accepts its existing props unchanged', () => {
    assertType<V>({
      id: 'a',
      data: [],
      className: 'w-full',
      classNames: { boxes: 'a', lines: 'b', data: 'c' },
      margin: { top: 1 },
      padding: { bar: 0.3 },
      zooming: { enabled: true },
      tooltip: {},
      style: {},
      x: { key: 'week', scalingFunction: 'time', time: { isISO: true } },
      y: { ...statKeys, min: 0, max: 10, classNameMap: { a: 'b' } },
    });
    expectTypeOf<V>().toEqualTypeOf<BoxPlotVProps<unknown>>();
    expectTypeOf<H>().toEqualTypeOf<BoxPlotHProps<unknown>>();
  });

  test('binned branches need bin + valueKey', () => {
    assertType<U>({ id: 'a', data: [], valueKey: 'v', x: { key: 'age', bin: { count: 3 } }, y: {} });
    assertType<U>({
      id: 'a',
      data: [],
      orientation: 'horizontal',
      valueKey: 'v',
      y: { key: 'age', bin: { count: 3 } },
      x: {},
    });
    expectTypeOf({ id: 'a', data: [], x: { key: 'age', bin: { count: 3 } }, y: {} }).not.toExtend<U>();
    expectTypeOf({ id: 'a', data: [], valueKey: 'v', x: { key: 'age' }, y: {} }).not.toExtend<U>();
  });

  test('min/max are still assignable', () => {
    assertType<U>({ id: 'a', data: [], x: { key: 'n' }, y: { ...statKeys, min: 0, max: 1 } });
    assertType<U>({ id: 'a', data: [], x: { key: 'n' }, y: { ...statKeys, start: 0, end: 1 } });
  });

  test('27: the exported types', () => {
    expectTypeOf<ChartOrientation>().toEqualTypeOf<'vertical' | 'horizontal'>();
    expectTypeOf<BoxPlotProps<unknown>>().toEqualTypeOf<U>();
    expectTypeOf<BoxPlotClassNames>().toEqualTypeOf<{ boxes?: string; lines?: string; data?: string }>();
  });
});
