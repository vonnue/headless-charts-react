import { describe, expect, it } from 'vitest';

import {
  MISSING_CATEGORY,
  SYNTHETIC_ROOT,
  buildHierarchy,
  categoryName,
  colorKey,
  defaultHierarchyTooltipHtml,
  formatPercent,
  hierarchyIssueMessage,
  isFlatNode,
  isSyntheticRoot,
  labelOption,
  nameOf,
  percentOf,
  percentOption,
  ratio,
  sanitizeLeafValue,
  toHierarchyDatum,
  type HierarchyIssue,
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


const deepFreeze = <T,>(value: T): T => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    if (Array.isArray(value)) value.forEach(deepFreeze);
    else Object.values(value as object).forEach(deepFreeze);
  }
  return value;
};

type Sale = {
  region?: string | number | null;
  country?: string | number | null;
  city?: string | number | null;
  revenue?: number;
  children?: unknown;
};

const sales: Sale[] = [
  { region: 'EU', country: 'France', city: 'Paris', revenue: 40 },
  { region: 'EU', country: 'France', city: 'Lyon', revenue: 20 },
  { region: 'EU', country: 'Germany', city: 'Berlin', revenue: 30 },
  { region: 'US', country: 'USA', city: 'New York', revenue: 50 },
  { region: 'US', country: 'USA', city: 'Austin', revenue: 15 },
];

const LEVELS = ['region', 'country', 'city'] as const;

const collectIssues = (args: Parameters<typeof buildHierarchy>[0]) => {
  const issues: HierarchyIssue[] = [];
  const built = buildHierarchy({ ...args, onIssue: (issue) => issues.push(issue) });
  return { built, issues };
};

const datumAt = (root: NonNullable<ReturnType<typeof buildHierarchy>>['root'], path: string[]) => {
  const node = root
    .descendants()
    .find((n) => toHierarchyDatum(n).path.join('/') === path.join('/'));
  if (!node) throw new Error(`missing node ${path.join('/')}`);
  return { node, datum: toHierarchyDatum(node) };
};

describe('hierarchy flat rows', () => {
  it('2: non-empty levels builds a forest with depth = level index + 1', () => {
    const built = buildHierarchy({
      data: sales,
      valueKey: 'revenue',
      levels: [...LEVELS],
    });
    expect(built?.flat).toBe(true);
    expect(built?.synthetic).toBe(true);
    expect(isSyntheticRoot(built!.root)).toBe(true);
    const depths = new Map<string, number>();
    built!.root.descendants().forEach((n) => {
      const d = toHierarchyDatum(n);
      if (d.path.length) depths.set(d.path.join('/'), d.depth);
    });
    expect(depths.get('EU')).toBe(1);
    expect(depths.get('EU/France')).toBe(2);
    expect(depths.get('EU/France/Paris')).toBe(3);
    expect(depths.get('US/USA/Austin')).toBe(3);
  });

  it('3: duplicate full paths sum into one leaf, and rows holds every source row', () => {
    const rows: Sale[] = [
      { region: 'EU', country: 'France', city: 'Paris', revenue: 10 },
      { region: 'EU', country: 'France', city: 'Paris', revenue: 30 },
      { region: 'EU', country: 'France', city: 'Lyon', revenue: 20 },
    ];
    const built = buildHierarchy({ data: rows, valueKey: 'revenue', levels: [...LEVELS] });
    const paris = datumAt(built!.root, ['EU', 'France', 'Paris']);
    expect(paris.datum.value).toBe(40);
    expect(paris.datum.rows).toHaveLength(2);
    expect(paris.datum.rows).toEqual([rows[0], rows[1]]);
    expect(built!.root.leaves()).toHaveLength(2);
  });

  it('4: internal values are the sum of their leaves; parentValue and rootValue are correct', () => {
    const built = buildHierarchy({
      data: sales,
      valueKey: 'revenue',
      levels: [...LEVELS],
    });
    const paris = datumAt(built!.root, ['EU', 'France', 'Paris']);
    const france = datumAt(built!.root, ['EU', 'France']);
    const eu = datumAt(built!.root, ['EU']);
    expect(france.datum.value).toBe(60);
    expect(eu.datum.value).toBe(90);
    expect(built!.root.value).toBe(155);
    expect(paris.datum.parentValue).toBe(60);
    expect(paris.datum.rootValue).toBe(155);
    expect(eu.datum.parentValue).toBe(155);
  });

  it("5: null, undefined or '' categories are grouped under '(missing)', with no drop warning", () => {
    const rows: Sale[] = [
      { region: 'EU', country: null, city: 'Paris', revenue: 10 },
      { region: 'EU', country: undefined, city: 'Lyon', revenue: 20 },
      { region: 'EU', country: '', city: 'Nice', revenue: 5 },
      { region: 'US', country: 'USA', city: 'Austin', revenue: 15 },
    ];
    const { built, issues } = collectIssues({
      data: rows,
      valueKey: 'revenue',
      levels: [...LEVELS],
    });
    expect(issues).toEqual([]);
    const missing = datumAt(built!.root, ['EU', MISSING_CATEGORY]);
    expect(missing.datum.value).toBe(35);
    expect(missing.datum.rows).toHaveLength(3);
    expect(datumAt(built!.root, ['EU', MISSING_CATEGORY, 'Paris']).datum.value).toBe(10);
    expect(categoryName(null)).toBe(MISSING_CATEGORY);
    expect(categoryName(undefined)).toBe(MISSING_CATEGORY);
    expect(categoryName('')).toBe(MISSING_CATEGORY);
  });

  it("6: category values 1 and '1' merge, and names are not trimmed or case-folded", () => {
    const rows: Sale[] = [
      { region: 1, country: 'A', city: 'x', revenue: 10 },
      { region: '1', country: 'A', city: 'y', revenue: 20 },
      { region: 'eu', country: 'A', city: 'z', revenue: 5 },
      { region: 'EU', country: 'A', city: 'w', revenue: 7 },
      { region: ' France', country: 'A', city: 'v', revenue: 3 },
      { region: 'France', country: 'A', city: 'u', revenue: 4 },
    ];
    const built = buildHierarchy({ data: rows, valueKey: 'revenue', levels: [...LEVELS] });
    expect(datumAt(built!.root, ['1']).datum.value).toBe(30);
    expect(datumAt(built!.root, ['1']).datum.rows).toHaveLength(2);
    expect(datumAt(built!.root, ['eu']).datum.value).toBe(5);
    expect(datumAt(built!.root, ['EU']).datum.value).toBe(7);
    expect(datumAt(built!.root, [' France']).datum.value).toBe(3);
    expect(datumAt(built!.root, ['France']).datum.value).toBe(4);
  });

  it('7: negative, NaN and missing values count as 0, and a 0-only new path still makes a leaf', () => {
    const rows: Sale[] = [
      { region: 'EU', country: 'France', city: 'Paris', revenue: -4 },
      { region: 'EU', country: 'France', city: 'Lyon', revenue: Number.NaN },
      { region: 'EU', country: 'France', city: 'Nice' },
      { region: 'US', country: 'USA', city: 'Zero', revenue: 0 },
    ];
    const built = buildHierarchy({ data: rows, valueKey: 'revenue', levels: [...LEVELS] });
    expect(built?.invalidLeaf).toBe(true);
    expect(datumAt(built!.root, ['EU', 'France']).datum.value).toBe(0);
    const zero = datumAt(built!.root, ['US', 'USA', 'Zero']);
    expect(zero.datum.value).toBe(0);
    expect(zero.node.children).toBeUndefined();
    expect(built!.root.leaves().map((n) => toHierarchyDatum(n).name).sort()).toEqual(
      ['Lyon', 'Nice', 'Paris', 'Zero']
    );
  });

  it('8: leaf name is the innermost value, and path runs outer to inner', () => {
    const built = buildHierarchy({
      data: sales,
      valueKey: 'revenue',
      levels: [...LEVELS],
    });
    const paris = datumAt(built!.root, ['EU', 'France', 'Paris']);
    expect(paris.datum.name).toBe('Paris');
    expect(paris.datum.path).toEqual(['EU', 'France', 'Paris']);
  });

  it('9: datum has level and rows in flat mode and lacks them in nested mode; data is the built node', () => {
    const built = buildHierarchy({
      data: sales,
      valueKey: 'revenue',
      levels: [...LEVELS],
    });
    const france = datumAt(built!.root, ['EU', 'France']);
    expect(france.datum.level).toBe('country');
    expect(france.datum.rows).toEqual([sales[0], sales[1]]);
    expect(isFlatNode(france.datum.data)).toBe(true);
    expect(france.datum.data).toMatchObject({
      name: 'France',
      value: 60,
      level: 'country',
    });

    const nested = buildHierarchy({
      data: { name: 'Root', children: [{ name: 'A', amount: 10 }] },
      valueKey: 'amount',
    });
    const a = toHierarchyDatum(nested!.root.children![0]);
    expect(a).not.toHaveProperty('level');
    expect(a).not.toHaveProperty('rows');
    expect(isFlatNode(a.data)).toBe(false);
    expect(a.data).toMatchObject({ name: 'A', amount: 10 });
  });

  it('10: sort true is value desc then name asc; sort false keeps first-appearance order', () => {
    const rows: Sale[] = [
      { region: 'B', country: 'x', city: 'b1', revenue: 10 },
      { region: 'A', country: 'x', city: 'a1', revenue: 10 },
      { region: 'C', country: 'x', city: 'c1', revenue: 30 },
    ];
    const sorted = buildHierarchy({
      data: rows,
      valueKey: 'revenue',
      levels: [...LEVELS],
    });
    expect(sorted!.root.children!.map((n) => nameOf(n.data))).toEqual(['C', 'A', 'B']);

    const unsorted = buildHierarchy({
      data: rows,
      valueKey: 'revenue',
      levels: [...LEVELS],
      sort: false,
    });
    expect(unsorted!.root.children!.map((n) => nameOf(n.data))).toEqual(['B', 'A', 'C']);
  });

  it('11: maxDepth below levels.length rolls deeper levels into their ancestors', () => {
    const built = buildHierarchy({
      data: sales,
      valueKey: 'revenue',
      levels: [...LEVELS],
      maxDepth: 2,
    });
    const france = datumAt(built!.root, ['EU', 'France']);
    expect(france.datum.value).toBe(60);
    expect(france.node.children).toBeUndefined();
    expect(built!.root.leaves().map((n) => toHierarchyDatum(n).path.join('/')).sort()).toEqual([
      'EU/France',
      'EU/Germany',
      'US/USA',
    ]);
  });

  it("12: classNameMap with colorBy 'top' uses the level 1 value", () => {
    const built = buildHierarchy({
      data: sales,
      valueKey: 'revenue',
      levels: [...LEVELS],
    });
    const paris = datumAt(built!.root, ['EU', 'France', 'Paris']);
    const eu = datumAt(built!.root, ['EU']);
    expect(colorKey(eu.node, 'top')).toBe('EU');
    expect(colorKey(paris.node, 'top')).toBe('EU');
    expect(colorKey(paris.node, 'name')).toBe('Paris');
    expect(colorKey(paris.node, 'depth')).toBe('3');
  });

  it('13: a non-array data in flat mode returns null and warns once', () => {
    const { built, issues } = collectIssues({
      data: { region: 'EU', revenue: 10 },
      valueKey: 'revenue',
      levels: [...LEVELS],
    });
    expect(built).toBeNull();
    expect(issues).toEqual([{ issue: 'flat-non-array' }]);
    expect(hierarchyIssueMessage(issues[0])).toMatch(/must be an array/);
  });

  it('14: explicit children with levels warns once, and child arrays inside rows are ignored', () => {
    const rows: Sale[] = [
      {
        region: 'EU',
        country: 'France',
        city: 'Paris',
        revenue: 40,
        children: [{ name: 'ignored', revenue: 99 }],
      },
    ];
    const { built, issues } = collectIssues({
      data: rows,
      valueKey: 'revenue',
      levels: [...LEVELS],
      childrenSpecified: true,
    });
    expect(issues).toEqual([{ issue: 'children-ignored' }]);
    const paris = datumAt(built!.root, ['EU', 'France', 'Paris']);
    expect(paris.node.children).toBeUndefined();
    expect(paris.datum.value).toBe(40);
    expect(built!.root.leaves()).toHaveLength(1);
  });

  it('15: empty level keys are dropped with a warning; all-invalid falls back to nested mode', () => {
    const dropped = collectIssues({
      data: sales,
      valueKey: 'revenue',
      levels: ['region', '', 'city'],
    });
    expect(dropped.issues).toEqual([{ issue: 'empty-level-keys', detail: '1' }]);
    expect(dropped.built?.flat).toBe(true);
    // region + city only: leaves at depth 2
    expect(datumAt(dropped.built!.root, ['EU', 'Paris']).datum.depth).toBe(2);
    expect(datumAt(dropped.built!.root, ['EU', 'Paris']).datum.level).toBe('city');

    const nestedRoot = {
      name: 'Root',
      children: [{ name: 'A', amount: 10 }],
    };
    const fallback = collectIssues({
      data: nestedRoot,
      valueKey: 'amount',
      levels: ['', null, undefined],
    });
    expect(fallback.issues).toEqual([{ issue: 'empty-level-keys', detail: '3' }]);
    expect(fallback.built?.flat).toBe(false);
    expect(fallback.built?.synthetic).toBe(false);
    expect(toHierarchyDatum(fallback.built!.root).name).toBe('Root');
    expect(toHierarchyDatum(fallback.built!.root.children![0]).name).toBe('A');
  });

  it('16: input rows and the input array are not mutated (deep-frozen fixture)', () => {
    const rows = deepFreeze([
      { region: 'EU', country: 'France', city: 'Paris', revenue: 40 },
      { region: 'US', country: 'USA', city: 'Austin', revenue: 15 },
    ]);
    expect(() =>
      buildHierarchy({ data: rows, valueKey: 'revenue', levels: [...LEVELS] })
    ).not.toThrow();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      region: 'EU',
      country: 'France',
      city: 'Paris',
      revenue: 40,
    });
  });
});
