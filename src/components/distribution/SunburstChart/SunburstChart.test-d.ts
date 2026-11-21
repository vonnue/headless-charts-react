import { assertType, describe, expectTypeOf, it } from 'vitest';

import SunburstChart from '.';
import type { FlatSunburstChartProps, NestedSunburstChartProps, SunburstChartProps } from '.';

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



type Tree = { name: string; amount?: number; size?: number; children?: Tree[] };
type Row = { region: string; country: string; revenue: number };

describe('SunburstChart levels-keyed callback typings', () => {
  it('nested mode: zoom.onChange and label formatters can read d.data.amount', () => {
    assertType<NestedSunburstChartProps<Tree>>({
      id: 's',
      data: { name: 'Root', amount: 1, size: 1 },
      value: { key: 'size' },
      labels: { name: { format: (n, d) => `${n} ${d.data.amount}` } },
      zoom: { onChange: (focus) => focus?.data.amount },
    });
    void SunburstChart<Tree>({
      id: 's',
      data: { name: 'Root', amount: 1, size: 1 },
      value: { key: 'size' },
      labels: { name: { format: (n, d) => `${n} ${d.data.amount}` } },
      zoom: { onChange: (focus) => focus?.data.amount },
    });
  });

  it('flat mode: zoom.onChange and label formatters can read d.data.rows', () => {
    assertType<FlatSunburstChartProps<Row>>({
      id: 's',
      data: [{ region: 'EU', country: 'France', revenue: 40 }],
      levels: ['region', 'country'],
      value: { key: 'revenue' },
      labels: { name: { format: (n, d) => `${n} ${d.data.rows.length}` } },
      zoom: { onChange: (focus) => focus?.data.rows.length },
    });
    void SunburstChart<Row>({
      id: 's',
      data: [{ region: 'EU', country: 'France', revenue: 40 }],
      levels: ['region', 'country'],
      value: { key: 'revenue' },
      labels: { name: { format: (n, d) => `${n} ${d.data.rows.length}` } },
      zoom: { onChange: (focus) => focus?.data.rows.length },
    });
  });
});
