/*
 * Type-level tests for TreemapChart's levels-keyed callback typings.
 * Run by Vitest's typecheck mode as part of `vitest run`.
 */
import { assertType, describe, it } from 'vitest';

import TreemapChart from '.';
import type { FlatTreemapChartProps, NestedTreemapChartProps } from '.';

type Tree = { name: string; amount?: number; children?: Tree[] };
type Row = { region: string; country: string; revenue: number };

describe('TreemapChart levels-keyed callback typings', () => {
  it('nested mode: a typed formatter can read d.data.amount', () => {
    assertType<NestedTreemapChartProps<Tree>>({
      id: 't',
      data: { name: 'Root', amount: 1 },
      value: { key: 'amount' },
      labels: { name: { format: (n, d) => `${n} ${d.data.amount}` } },
    });
    void TreemapChart<Tree>({
      id: 't',
      data: { name: 'Root', amount: 1 },
      value: { key: 'amount' },
      labels: { name: { format: (n, d) => `${n} ${d.data.amount}` } },
    });
  });

  it('flat mode: a typed formatter can read d.data.rows', () => {
    assertType<FlatTreemapChartProps<Row>>({
      id: 't',
      data: [{ region: 'EU', country: 'France', revenue: 40 }],
      levels: ['region', 'country'],
      value: { key: 'revenue' },
      labels: { name: { format: (n, d) => `${n} ${d.data.rows.length}` } },
    });
    void TreemapChart<Row>({
      id: 't',
      data: [{ region: 'EU', country: 'France', revenue: 40 }],
      levels: ['region', 'country'],
      value: { key: 'revenue' },
      labels: { name: { format: (n, d) => `${n} ${d.data.rows.length}` } },
    });
  });
});
