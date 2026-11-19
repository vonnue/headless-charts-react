/*
 * Type-level tests for the unified BarChart (#78).
 * Run by Vitest's typecheck mode as part of `vitest run`.
 */
import { assertType, describe, expectTypeOf, test } from 'vitest';
import type { ComponentProps } from 'react';

import type {
  BarStacking,
  BarAxisConfig,
  BarCategoryConfig,
  BarChart,
  BarChartProps,
  BarDataLabel,
  BarReferenceLine,
  BarSeriesConfig,
  ChartOrientation,
  ColumnChart,
  ColumnChartGroupedProps,
  ColumnChartProps,
} from '@/index';

type B = ComponentProps<typeof BarChart>;
type C = ComponentProps<typeof ColumnChart>;

describe('27: BarChart types', () => {
  test('orientation: "vertical" with array x is an error', () => {
    expectTypeOf({
      id: 'a',
      data: [] as { name: string; v: number }[],
      orientation: 'vertical' as const,
      x: [{ key: 'v' }],
      y: { key: 'name' },
    }).not.toExtend<B>();
  });

  test('ColumnChart rejects orientation: "horizontal"', () => {
    expectTypeOf({
      id: 'a',
      data: [] as { name: string; v: number }[],
      orientation: 'horizontal' as const,
      x: { key: 'name' },
      y: [{ key: 'v' }],
    }).not.toExtend<C>();
    assertType<C>({
      id: 'a',
      data: [],
      orientation: 'vertical',
      x: { key: 'name' },
      y: [{ key: 'v' }],
    });
  });

  test("ColumnChart accepts today's props", () => {
    assertType<C>({
      id: 'a',
      data: [{ name: 'a', v: 1 }],
      className: 'w-full',
      margin: { top: 1 },
      padding: { left: 0, bar: 0.2 },
      paddingBar: 0.2,
      tooltip: {},
      style: {},
      wholeNumbers: true,
      tickFormat: '.0f',
      referenceLines: [{ y: 0 }],
      x: { key: 'name', axis: { location: 'bottom' } },
      y: [{ key: 'v', rx: 3, className: 'fill-blue-500' }],
    });
    expectTypeOf<C>().toEqualTypeOf<ColumnChartProps<unknown>>();
  });

  test('existing horizontal BarChart call sites type-check', () => {
    assertType<B>({
      id: 'a',
      data: [{ name: 'a', v: 1 }],
      y: { key: 'name', padding: 4 },
      x: [{ key: 'v', rx: 2 }],
      direction: 'left',
      dataLabel: { className: 'text-xs' },
    });
  });

  test('paddingBar is accepted and the legacy aliases still compile', () => {
    assertType<B>({
      id: 'a',
      data: [],
      x: { key: 'name' },
      y: [{ key: 'v' }],
      paddingBar: 0.2,
    });
    expectTypeOf<BarAxisConfig>().toEqualTypeOf<BarSeriesConfig>();
    expectTypeOf<ColumnChartGroupedProps>().toEqualTypeOf<ColumnChartProps>();
    expectTypeOf<ChartOrientation>().toEqualTypeOf<'vertical' | 'horizontal'>();
    expectTypeOf<BarChartProps<unknown>>().toEqualTypeOf<B>();
    expectTypeOf<BarCategoryConfig>().toMatchTypeOf<{ padding?: number }>();
    expectTypeOf<BarReferenceLine>().toMatchTypeOf<{ x?: number; y?: number; className?: string }>();
    expectTypeOf<BarDataLabel<{ v: number }>>().toMatchTypeOf<{ className?: string; text?: (row: { v: number }, series: BarSeriesConfig<{ v: number }>) => string }>();
  });
});

describe('BarStacking (#41 test 22)', () => {
  test('negative is required for diverging and rejected on the other types', () => {
    assertType<BarStacking>({ type: 'diverging', negative: ['a'] });
    // @ts-expect-error negative is required
    assertType<BarStacking>({ type: 'diverging' });
    // @ts-expect-error negative only exists on diverging
    assertType<BarStacking>({ type: 'normal', negative: ['a'] });
    // @ts-expect-error negative only exists on diverging
    assertType<BarStacking>({ type: '100%', negative: ['a'] });
  });
});
