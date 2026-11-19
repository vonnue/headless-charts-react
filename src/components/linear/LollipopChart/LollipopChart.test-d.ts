/*
 * Type-level tests for the unified LollipopChart (#77, spec tests 24 and 26).
 * Run by Vitest's typecheck mode as part of `vitest run`.
 */
import { assertType, describe, expectTypeOf, test } from 'vitest';
import type { ComponentProps } from 'react';

import type {
  ChartOrientation,
  LollipopChart,
  LollipopChartClassNames,
  LollipopChartProps,
  LollipopHChart,
  LollipopHChartProps,
  LollipopShape,
  LollipopVChart,
  LollipopVChartProps,
} from '@/index';

type U = ComponentProps<typeof LollipopChart>;
type H = ComponentProps<typeof LollipopHChart>;
type V = ComponentProps<typeof LollipopVChart>;

describe('24: LollipopChart types', () => {
  test('shape is optional on all three components', () => {
    assertType<U>({ id: 'a', data: [] });
    assertType<U>({ id: 'a', data: [], shape: 'circle' });
    assertType<H>({ id: 'a', data: [] });
    assertType<V>({ id: 'a', data: [] });
    assertType<V>({ id: 'a', data: [], shape: 'star' });
  });

  test('LollipopHChart rejects orientation "vertical"', () => {
    expectTypeOf({
      id: 'a',
      data: [],
      orientation: 'vertical' as const,
    }).not.toExtend<H>();
    assertType<H>({ id: 'a', data: [], orientation: 'horizontal' });
  });

  test("LollipopVChart accepts today's props", () => {
    assertType<V>({
      id: 'a',
      data: [],
      className: 'w-full',
      classNames: { points: 'a', lines: 'b', symbols: 'c' },
      margin: { top: 1 },
      padding: { left: 0 },
      tooltip: {},
      style: {},
      shape: 'circle',
      x: { key: 'name', axis: { location: 'bottom' } },
      y: { key: 'reading', start: 0, axis: { location: 'left' } },
    });
    expectTypeOf<V>().toEqualTypeOf<LollipopVChartProps<unknown>>();
    expectTypeOf<H>().toEqualTypeOf<LollipopHChartProps<unknown>>();
  });

  test('LollipopShape rejects unknown shapes', () => {
    expectTypeOf('hexagon').not.toExtend<LollipopShape>();
    expectTypeOf<'circle'>().toExtend<LollipopShape>();
    expectTypeOf<LollipopShape>().toEqualTypeOf<
      'circle' | 'diamond' | 'triangle' | 'square' | 'cross' | 'star' | 'wye'
    >();
  });
});

describe('26: exported types', () => {
  test('the exported types', () => {
    expectTypeOf<ChartOrientation>().toEqualTypeOf<'vertical' | 'horizontal'>();
    expectTypeOf<LollipopChartProps<unknown>>().toEqualTypeOf<U>();
    expectTypeOf<LollipopChartClassNames>().toEqualTypeOf<{
      points?: string;
      lines?: string;
      symbols?: string;
    }>();
  });
});
