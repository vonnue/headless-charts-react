/*
 * Type-level tests for HierarchyDatum's nested vs flat `data` typings.
 * Run by Vitest's typecheck mode as part of `vitest run`.
 */
import { describe, expectTypeOf, it } from 'vitest';

import {
  isFlatHierarchyDatum,
  type FlatGroupNode,
  type FlatHierarchyDatum,
  type HierarchyDatum,
  type NestedHierarchyDatum,
} from './hierarchy';

type Row = { region: string; revenue: number };
type Tree = { name: string; amount?: number; children?: Tree[] };

describe('HierarchyDatum typings', () => {
  it('defaults to nested mode so data stays TData for existing Treemap typings', () => {
    expectTypeOf<HierarchyDatum<Tree>>().toEqualTypeOf<NestedHierarchyDatum<Tree>>();
    expectTypeOf<HierarchyDatum<Tree>['data']>().toEqualTypeOf<Tree>();
    expectTypeOf<HierarchyDatum<Tree>>().not.toHaveProperty('level');
    expectTypeOf<HierarchyDatum<Tree>>().not.toHaveProperty('rows');

    const readAmount = (d: HierarchyDatum<Tree>) => d.data.amount;
    expectTypeOf(readAmount).returns.toEqualTypeOf<number | undefined>();
  });

  it('flat mode types data as the built group node, with required level and rows', () => {
    type Flat = HierarchyDatum<Row, 'flat'>;
    expectTypeOf<Flat>().toEqualTypeOf<FlatHierarchyDatum<Row>>();
    expectTypeOf<Flat['data']>().toEqualTypeOf<FlatGroupNode<Row>>();
    expectTypeOf<Flat['level']>().toEqualTypeOf<string>();
    expectTypeOf<Flat['rows']>().toEqualTypeOf<Row[]>();
    expectTypeOf<FlatGroupNode<Row>['rows'][number]>().toEqualTypeOf<Row>();

    const readRevenue = (d: HierarchyDatum<Row, 'flat'>) => d.data.rows[0].revenue;
    expectTypeOf(readRevenue).returns.toEqualTypeOf<number>();
  });

  it("either mode is a union that narrows with isFlatHierarchyDatum", () => {
    expectTypeOf<HierarchyDatum<Row, 'either'>>().toEqualTypeOf<
      NestedHierarchyDatum<Row> | FlatHierarchyDatum<Row>
    >();

    const d = {} as HierarchyDatum<Row, 'either'>;
    if (isFlatHierarchyDatum(d)) {
      expectTypeOf(d).toEqualTypeOf<FlatHierarchyDatum<Row>>();
      expectTypeOf(d.data).toEqualTypeOf<FlatGroupNode<Row>>();
      expectTypeOf(d.rows).toEqualTypeOf<Row[]>();
    } else {
      expectTypeOf(d).toEqualTypeOf<NestedHierarchyDatum<Row>>();
      expectTypeOf(d.data).toEqualTypeOf<Row>();
    }
  });
});
