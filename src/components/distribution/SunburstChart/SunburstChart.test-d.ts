import { describe, expectTypeOf, it } from 'vitest';

import type { SunburstChartProps } from '.';

describe('SunburstChart types', () => {
  it('31: labels.minWidth and labels.minHeight are type errors on SunburstChart, and labels.minArcLength and labels.minThickness are accepted; flat idKey/parentKey props do not exist', () => {
    type Labels = NonNullable<SunburstChartProps['labels']>;
    expectTypeOf<Labels['minArcLength']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<Labels['minThickness']>().toEqualTypeOf<number | undefined>();

    const accepted: SunburstChartProps = {
      id: 't',
      data: { name: 'r', size: 1 },
      value: { key: 'size' },
      labels: { minArcLength: 14, minThickness: 24, name: true },
    };
    void accepted;

    const badWidth: SunburstChartProps = {
      id: 't',
      data: {},
      value: { key: 'size' },
      // @ts-expect-error Treemap minWidth is not a Sunburst label gate
      labels: { minWidth: 10 },
    };
    void badWidth;

    const badHeight: SunburstChartProps = {
      id: 't',
      data: {},
      value: { key: 'size' },
      // @ts-expect-error Treemap minHeight is not a Sunburst label gate
      labels: { minHeight: 10 },
    };
    void badHeight;

    const badIdKey: SunburstChartProps = {
      id: 't',
      data: {},
      value: { key: 'size' },
      // @ts-expect-error idKey is not a Sunburst prop (nested children only)
      idKey: 'id',
    };
    void badIdKey;

    const badParentKey: SunburstChartProps = {
      id: 't',
      data: {},
      value: { key: 'size' },
      // @ts-expect-error parentKey is not a Sunburst prop (nested children only)
      parentKey: 'parent',
    };
    void badParentKey;
  });
});
