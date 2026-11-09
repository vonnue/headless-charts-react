import { describe, expect, it } from 'vitest';

import {
  SYNTHETIC_ROOT,
  buildHierarchy,
  colorKey,
  defaultHierarchyTooltipHtml,
  formatPercent,
  isSyntheticRoot,
  labelOption,
  nameOf,
  percentOf,
  percentOption,
  ratio,
  sanitizeLeafValue,
  toHierarchyDatum,
} from './hierarchy';

describe('hierarchy utils', () => {
  it('sanitizeLeafValue: finite ≥0 kept; negative / non-finite → 0', () => {
    expect(sanitizeLeafValue(12)).toBe(12);
    expect(sanitizeLeafValue(0)).toBe(0);
    expect(sanitizeLeafValue(-3)).toBe(0);
    expect(sanitizeLeafValue(Number.NaN)).toBe(0);
    expect(sanitizeLeafValue(Number.POSITIVE_INFINITY)).toBe(0);
    expect(sanitizeLeafValue('9')).toBe(0);
  });

  it('buildHierarchy: empty input → null; forest gets synthetic root', () => {
    expect(buildHierarchy({ data: undefined, valueKey: 'amount' })).toBeNull();
    expect(buildHierarchy({ data: null, valueKey: 'amount' })).toBeNull();
    expect(buildHierarchy({ data: [], valueKey: 'amount' })).toBeNull();

    const forest = buildHierarchy({
      data: [
        { name: 'A', amount: 10 },
        { name: 'B', amount: 20 },
      ],
      valueKey: 'amount',
    });
    expect(forest?.synthetic).toBe(true);
    expect(isSyntheticRoot(forest!.root)).toBe(true);
    expect(forest!.root.value).toBe(30);
    expect(forest!.root.data[SYNTHETIC_ROOT]).toBe(true);
  });

  it('buildHierarchy: ignores internal values; sums leaves; caps maxDepth; sorts', () => {
    const data = {
      name: 'Root',
      amount: 999,
      children: [
        { name: 'b', amount: 10 },
        { name: 'a', amount: 10 },
        {
          name: 'c',
          amount: 999,
          children: [{ name: 'c1', amount: 30 }],
        },
      ],
    };
    const built = buildHierarchy({ data, valueKey: 'amount' });
    expect(built?.root.value).toBe(50);
    expect(built?.invalidLeaf).toBe(false);
    // Default sort: value desc, name asc → c(30), a(10), b(10)
    expect(built!.root.children!.map((n) => nameOf(n.data))).toStrictEqual([
      'c',
      'a',
      'b',
    ]);

    const capped = buildHierarchy({ data, valueKey: 'amount', maxDepth: 1 });
    expect(capped!.root.children!.find((n) => nameOf(n.data) === 'c')!.value).toBe(
      30
    );
    expect(
      capped!.root.children!.find((n) => nameOf(n.data) === 'c')!.children
    ).toBeUndefined();

    const unsorted = buildHierarchy({
      data,
      valueKey: 'amount',
      sort: false,
    });
    expect(unsorted!.root.children!.map((n) => nameOf(n.data))).toStrictEqual([
      'b',
      'a',
      'c',
    ]);
  });

  it('buildHierarchy: missing / non-array children → leaf; flags invalid leaves', () => {
    const built = buildHierarchy({
      data: {
        name: 'Root',
        children: [
          { name: 'ok', amount: 5 },
          { name: 'bad', amount: -1 },
          { name: 'odd', amount: 7, children: 'x' as unknown as unknown[] },
        ],
      },
      valueKey: 'amount',
    });
    expect(built?.invalidLeaf).toBe(true);
    expect(built!.root.value).toBe(12);
    const odd = built!.root.children!.find((n) => nameOf(n.data) === 'odd');
    expect(odd?.children).toBeUndefined();
    expect(odd?.value).toBe(7);
  });

  it('nameOf / ratio / percentOf / formatPercent', () => {
    expect(nameOf({ name: 'X' })).toBe('X');
    expect(nameOf({ label: 'L' }, 'label')).toBe('L');
    expect(nameOf({})).toBe('');

    expect(ratio(10, 40)).toBe(0.25);
    expect(ratio(10, 0)).toBeNull();
    expect(ratio(10, null)).toBeNull();
    expect(ratio(Number.NaN, 10)).toBeNull();

    const d = {
      data: {},
      depth: 1,
      value: 25,
      name: 'n',
      path: ['n'],
      parentValue: 100,
      rootValue: 200,
    };
    expect(percentOf(d, 'ofParent')).toBe(0.25);
    expect(percentOf(d, 'ofRoot')).toBe(0.125);
    expect(formatPercent(0.25)).toBe('25%');
    expect(formatPercent(1)).toBe('100%');
    expect(formatPercent(null)).toBe('n/a');
    expect(formatPercent(Number.POSITIVE_INFINITY)).toBe('n/a');
  });

  it('labelOption / percentOption normalise shorthands', () => {
    expect(labelOption(undefined)).toBeNull();
    expect(labelOption(false)).toBeNull();
    expect(labelOption(true)).toStrictEqual({});
    expect(labelOption({ className: 'x' })).toStrictEqual({ className: 'x' });

    expect(percentOption(undefined)).toBeNull();
    expect(percentOption(false)).toBeNull();
    expect(percentOption('ofParent')).toStrictEqual({ kinds: ['ofParent'] });
    expect(percentOption('ofRoot')).toStrictEqual({ kinds: ['ofRoot'] });
    expect(percentOption('both')).toStrictEqual({
      kinds: ['ofParent', 'ofRoot'],
    });
    expect(percentOption({ of: 'parent', className: 'p' })).toStrictEqual({
      kinds: ['ofParent'],
      className: 'p',
      format: undefined,
    });
    expect(percentOption({ of: 'both' })?.kinds).toStrictEqual([
      'ofParent',
      'ofRoot',
    ]);
  });

  it('colorKey: top / depth / name', () => {
    const built = buildHierarchy({
      data: {
        name: 'Root',
        children: [
          {
            name: 'A',
            children: [{ name: 'a1', amount: 10 }],
          },
        ],
      },
      valueKey: 'amount',
    });
    const root = built!.root;
    const a = root.children![0];
    const a1 = a.children![0];
    expect(colorKey(root, 'top')).toBe('Root');
    expect(colorKey(a, 'top')).toBe('A');
    expect(colorKey(a1, 'top')).toBe('A');
    expect(colorKey(a1, 'depth')).toBe('2');
    expect(colorKey(a1, 'name')).toBe('a1');
  });

  it('toHierarchyDatum + defaultHierarchyTooltipHtml', () => {
    const built = buildHierarchy({
      data: {
        name: 'Root',
        children: [
          {
            name: 'A',
            children: [{ name: 'a1', amount: 40 }],
          },
          { name: 'B', children: [{ name: 'b1', amount: 60 }] },
        ],
      },
      valueKey: 'amount',
    });
    const a = built!.root.children!.find((n) => nameOf(n.data) === 'A')!;
    const a1 = a.children!.find((n) => nameOf(n.data) === 'a1')!;
    const d = toHierarchyDatum(a1);
    expect(d).toMatchObject({
      name: 'a1',
      value: 40,
      depth: 2,
      path: ['Root', 'A', 'a1'],
      parentValue: 40,
      rootValue: 100,
    });
    // Real single-object root has null parentValue.
    const rootD = toHierarchyDatum(built!.root);
    expect(rootD.parentValue).toBeNull();

    expect(defaultHierarchyTooltipHtml(d)).toBe(
      'Root › A › a1<br/>40<br/>of parent: 100%<br/>of root: 40%'
    );
  });
});
