/**
 * Shared hierarchy input, value and label rules for TreemapChart (#58) and
 * SunburstChart (#63). Layout-free: no d3 selection, no React, no tiling, so
 * each hierarchical chart adds only its own geometry.
 *
 * Input is a nested root or forest (children under `children.key`, default
 * `'children'`), or flat rows grouped by `levels` (category keys, outer to
 * inner) with `value.key` summed per group. Parent/id (adjacency) input is
 * not supported.
 */
import { HierarchyNode, hierarchy } from 'd3-hierarchy';
import { format } from 'd3-format';
import { TooltipConfig } from '@/types';
import { isFiniteNumber } from '@/utils/domain';
import { tooltipRows } from '@/utils/tooltipRows';

/** Category keys used in flat mode, outer to inner. */
export type HierarchyLevelKey<TData> = Extract<keyof TData, string> | string;

/** Label / percent formatters, parameterised by the input mode. */
export interface HierarchyLabels<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TData = any,
  TMode extends 'nested' | 'flat' | 'either' = 'nested',
> {
  name?:
    | boolean
    | {
        className?: string;
        format?: (name: string, d: HierarchyDatum<TData, TMode>, i: number) => string;
      };
  value?:
    | boolean
    | {
        className?: string;
        format?: (value: number, d: HierarchyDatum<TData, TMode>, i: number) => string;
      };
  /**
   * Default `false`. `'ofParent'` | `'ofRoot'` | `'both'`, or an object.
   * Ratios in `[0, +∞)`; `null` when the divisor is 0 / missing.
   */
  percent?:
    | false
    | 'ofParent'
    | 'ofRoot'
    | 'both'
    | {
        of: 'parent' | 'root' | 'both';
        className?: string;
        format?: (
          pct: number | null,
          kind: HierarchyPercentKind,
          d: HierarchyDatum<TData, TMode>,
          i: number
        ) => string;
      };
  /** Hide label text on cells narrower than this. Default `40`. */
  minWidth?: number;
  /** Hide label text on cells shorter than this. Default `18`. */
  minHeight?: number;
}

/**
 * Fields shared by both input modes. Chart-specific props extend the
 * {@link HierarchyFields} union, which is keyed on `levels`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface HierarchyFieldsBase<TData = any> {
  /**
   * Either one nested root object or a forest (children under `children.key`,
   * default `"children"`), or flat rows grouped by `levels` (category keys,
   * outer to inner) with `value.key` summed per group.
   */
  data?: TData | TData[];
  /** Nested children key. Default `{ key: 'children' }`. Ignored in flat mode. */
  children?: { key?: Extract<keyof TData, string> | string };
  /** Leaf size. Internal nodes = sum of descendant leaves (their own value is ignored). */
  value: {
    key: Extract<keyof TData, string> | string;
    /** Default mark class, used when `classNameMap` has no match. */
    className?: string;
  };
  /**
   * Display name. Default key `'name'`; a missing name shows as `''`.
   * Unused for naming in flat mode (names come from the level values);
   * `className` still applies.
   */
  name?: { key: Extract<keyof TData, string> | string; className?: string };
  /** Default `true` → value desc, name asc. `false` keeps input order. */
  sort?: boolean;
  /** Max depth (root = 0). Deeper mass rolls into the depth-cap ancestor. */
  maxDepth?: number;
  /** Mark class by group (see `colorBy`). Colour names the group, not magnitude. */
  classNameMap?: Record<string, string>;
  /**
   * What `classNameMap` is keyed by. Default `'top'` (top-level group name).
   * `'depth'` keys by `String(depth)`, `'name'` by the node's own name.
   * `'value'` is reserved — ignored (treated as `'top'`) with a dev warning.
   */
  colorBy?: 'top' | 'depth' | 'name' | 'value';
  tooltip?: TooltipConfig;
  /** Accessible name → SVG `<title>` + `aria-labelledby`. */
  title?: string;
  /** Longer accessible description → SVG `<desc>` + `aria-describedby`. */
  description?: string;
  /** Used only when `title` is omitted. Each chart supplies its own default. */
  ariaLabel?: string;
}

/** Nested `children` input: `levels` is omitted, and callbacks receive `data: TData`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type NestedHierarchyFields<TData = any> = HierarchyFieldsBase<TData> & {
  levels?: undefined;
  labels?: HierarchyLabels<TData, 'nested'>;
};

/**
 * Flat-row input: a `levels` array (category keys, outer to inner) switches
 * the mode. Callbacks receive a {@link FlatHierarchyDatum}.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FlatHierarchyFields<TData = any> = HierarchyFieldsBase<TData> & {
  /**
   * Flat mode: category keys from outer to inner. A non-empty array switches
   * the input mode. Rows sharing a path are summed; rows with a missing
   * category are grouped under `'(missing)'`.
   */
  levels: HierarchyLevelKey<TData>[];
  labels?: HierarchyLabels<TData, 'flat'>;
};

/**
 * Props shared by hierarchical charts. A union keyed on `levels`, so label
 * (and other) callbacks infer the matching {@link HierarchyDatum} variant:
 * nested (`data: TData`) when `levels` is omitted, flat (`data` is a
 * {@link FlatGroupNode}) when `levels` is set.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HierarchyFields<TData = any> =
  | NestedHierarchyFields<TData>
  | FlatHierarchyFields<TData>;

/** Shared fields on every hierarchy datum, in both input modes. */
export interface HierarchyDatumBase {
  /** Root = 0. For a forest the synthetic root is 0 and top-level groups are 1. */
  depth: number;
  /** Sanitised value: leaf value, or sum of descendant leaves. */
  value: number;
  name: string;
  /** Names from the top-most real node to this one (synthetic root excluded). */
  path: string[];
  /**
   * Parent's value; `null` only for a real (single-object) root. Top-level
   * groups of a forest use the synthetic root's total, so ofParent = ofRoot.
   */
  parentValue: number | null;
  /** Value of the (possibly synthetic) root. */
  rootValue: number;
}

/**
 * Node built from flat rows. Source rows live on `rows`; this object is not
 * one of the input rows.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface FlatGroupNode<TRow = any> {
  name: string;
  value: number;
  /** Level key of this node, e.g. `'country'`. */
  level: string;
  /** Source rows under this node, in input order. */
  rows: TRow[];
  /** Present on internal nodes. Leaves omit it. */
  children?: FlatGroupNode<TRow>[];
}

/** Datum for nested `children` input. `data` is the original node object. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface NestedHierarchyDatum<TData = any> extends HierarchyDatumBase {
  /** The original node object (children included). */
  data: TData;
}

/** Datum for flat `levels` input. `data` is the built group, not a source row. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface FlatHierarchyDatum<TRow = any> extends HierarchyDatumBase {
  data: FlatGroupNode<TRow>;
  /** Level key of the node, e.g. `'country'`. */
  level: string;
  /** Source rows under the node, in input order. */
  rows: TRow[];
}

/**
 * What labels, tooltips and callbacks receive for one node.
 *
 * Defaults to nested mode so existing Treemap typings keep `data: TData`.
 * Pass `'flat'` when the chart was given `levels` (`data` is a
 * {@link FlatGroupNode}, and `level` / `rows` are required). Pass `'either'`
 * for a callback that may see both; narrow with {@link isFlatHierarchyDatum}.
 */
export type HierarchyDatum<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TData = any,
  TMode extends 'nested' | 'flat' | 'either' = 'nested',
> = [TMode] extends ['either']
  ? NestedHierarchyDatum<TData> | FlatHierarchyDatum<TData>
  : [TMode] extends ['flat']
    ? FlatHierarchyDatum<TData>
    : NestedHierarchyDatum<TData>;

export type HierarchyPercentKind = 'ofParent' | 'ofRoot';

/** A warning raised while building a hierarchy. Charts prefix the chart id. */
export type HierarchyIssue =
  | { issue: 'flat-non-array' }
  | { issue: 'children-ignored' }
  | { issue: 'empty-level-keys'; detail: string };

/** Marker on the synthetic root that wraps a forest. Never painted. */
export const SYNTHETIC_ROOT = Symbol('headless-charts.syntheticRoot');

/** Marker on nodes built from flat rows. */
export const FLAT_NODE = Symbol('headless-charts.flatNode');

/** Visible name used when a flat-row category is null, undefined or `''`. */
export const MISSING_CATEGORY = '(missing)';

type Node = Record<PropertyKey, unknown>;

/** A leaf value as laid out: finite and >= 0, otherwise 0. */
export const sanitizeLeafValue = (raw: unknown): number =>
  isFiniteNumber(raw) && raw >= 0 ? raw : 0;

const childrenOf = (d: unknown, key: string): Node[] | undefined => {
  const c = (d as Node | null | undefined)?.[key];
  return Array.isArray(c) && c.length > 0 ? (c as Node[]) : undefined;
};

export interface BuiltHierarchy {
  root: HierarchyNode<Node>;
  /** True when `data` was a forest and `root` is synthetic. */
  synthetic: boolean;
  /** True when at least one leaf value was negative / non-finite. */
  invalidLeaf: boolean;
  /** True when a non-empty `levels` list selected flat mode. */
  flat: boolean;
}

/**
 * Builds, sums, caps and sorts the hierarchy. Returns `null` for empty input
 * (`undefined`, `null`, `[]`). Leaves define size; internal values are ignored.
 *
 * A non-empty `levels` array selects flat mode: `data` must be an array of
 * rows, which are grouped by the level keys. Pass `onIssue` to hear about
 * invalid combinations (non-array data, ignored `children`, empty keys).
 */
export const buildHierarchy = ({
  data,
  childrenKey = 'children',
  valueKey,
  nameKey = 'name',
  sort = true,
  maxDepth,
  levels,
  childrenSpecified = false,
  onIssue,
}: {
  data: unknown;
  childrenKey?: string;
  valueKey: string;
  nameKey?: string;
  sort?: boolean;
  maxDepth?: number;
  levels?: unknown;
  /** True when the caller passed an explicit `children` prop. */
  childrenSpecified?: boolean;
  onIssue?: (issue: HierarchyIssue) => void;
}): BuiltHierarchy | null => {
  const { keys, dropped } = normalizeLevelKeys(levels);
  if (dropped > 0) onIssue?.({ issue: 'empty-level-keys', detail: String(dropped) });
  const flat = keys.length > 0;

  if (flat) {
    if (childrenSpecified) onIssue?.({ issue: 'children-ignored' });
    if (!Array.isArray(data)) {
      if (data != null) onIssue?.({ issue: 'flat-non-array' });
      return null;
    }
    if (data.length === 0) return null;
    const built = rowsToForest(data, keys, valueKey);
    // Built nodes store the sanitised leaf total on `value`, not the source key.
    return finishHierarchy({
      data: built.forest,
      forest: true,
      childrenKey: 'children',
      valueKey: 'value',
      nameKey: 'name',
      sort,
      maxDepth,
      invalidLeaf: built.invalidLeaf,
      flat: true,
    });
  }

  if (data == null) return null;
  const forest = Array.isArray(data);
  if (forest && data.length === 0) return null;
  return finishHierarchy({
    data,
    forest,
    childrenKey,
    valueKey,
    nameKey,
    sort,
    maxDepth,
    invalidLeaf: false,
    flat: false,
  });
};

const finishHierarchy = ({
  data,
  forest,
  childrenKey,
  valueKey,
  nameKey,
  sort,
  maxDepth,
  invalidLeaf,
  flat,
}: {
  data: unknown;
  forest: boolean;
  childrenKey: string;
  valueKey: string;
  nameKey: string;
  sort: boolean;
  maxDepth?: number;
  invalidLeaf: boolean;
  flat: boolean;
}): BuiltHierarchy => {
  const rootDatum: Node = forest
    ? { [SYNTHETIC_ROOT]: true, [childrenKey]: data }
    : (data as Node);

  let invalid = invalidLeaf;
  const root = hierarchy<Node>(rootDatum, (d) => childrenOf(d, childrenKey));
  root.sum((d) => {
    if (childrenOf(d, childrenKey)) return 0;
    const raw = d[valueKey];
    if (!(isFiniteNumber(raw) && raw >= 0)) invalid = true;
    return sanitizeLeafValue(raw);
  });

  // Cap depth after summing, so the capped node keeps its descendants' mass.
  if (isFiniteNumber(maxDepth) && maxDepth >= 0)
    root.each((node) => {
      if (node.depth >= maxDepth && node.children) delete node.children;
    });

  if (sort)
    root.sort(
      (a, b) =>
        (b.value ?? 0) - (a.value ?? 0) ||
        nameOf(a.data, nameKey).localeCompare(nameOf(b.data, nameKey))
    );

  // Keep the built node's `value` in sync with the laid-out sum (after cap).
  if (flat)
    root.each((node) => {
      if (isFlatNode(node.data)) (node.data as Node).value = node.value ?? 0;
    });

  return { root, synthetic: forest, invalidLeaf: invalid, flat };
};

/** Drop missing / empty `levels` entries; valid keys stay in order. */
export const normalizeLevelKeys = (
  levels: unknown
): { keys: string[]; dropped: number } => {
  if (!Array.isArray(levels)) return { keys: [], dropped: 0 };
  const keys: string[] = [];
  let dropped = 0;
  for (const level of levels) {
    if (typeof level === 'string' && level !== '') keys.push(level);
    else dropped += 1;
  }
  return { keys, dropped };
};

/** Category label for one cell: missing values become `'(missing)'`. */
export const categoryName = (value: unknown): string =>
  value == null || value === '' ? MISSING_CATEGORY : String(value);

interface FlatAcc {
  name: string;
  level: string;
  rows: unknown[];
  children: Map<string, FlatAcc>;
  order: string[];
  leafValue: number;
}

const rowsToForest = (
  rows: unknown[],
  keys: string[],
  valueKey: string
): { forest: Node[]; invalidLeaf: boolean } => {
  const top = new Map<string, FlatAcc>();
  const topOrder: string[] = [];
  let invalidLeaf = false;

  for (const row of rows) {
    const rec =
      row != null && typeof row === 'object' ? (row as Node) : ({} as Node);
    const raw = rec[valueKey];
    if (!(isFiniteNumber(raw) && raw >= 0)) invalidLeaf = true;
    const value = sanitizeLeafValue(raw);

    let map = top;
    let order = topOrder;
    let acc: FlatAcc | undefined;
    for (let i = 0; i < keys.length; i += 1) {
      const name = categoryName(rec[keys[i]]);
      acc = map.get(name);
      if (!acc) {
        acc = {
          name,
          level: keys[i],
          rows: [],
          children: new Map(),
          order: [],
          leafValue: 0,
        };
        map.set(name, acc);
        order.push(name);
      }
      acc.rows.push(row);
      if (i === keys.length - 1) acc.leafValue += value;
      else {
        map = acc.children;
        order = acc.order;
      }
    }
  }

  const toNode = (acc: FlatAcc, depth: number): Node => {
    const isLeaf = depth === keys.length;
    const node: Node = {
      [FLAT_NODE]: true,
      name: acc.name,
      value: isLeaf ? acc.leafValue : 0,
      level: acc.level,
      rows: acc.rows,
    };
    if (!isLeaf && acc.order.length > 0)
      node.children = acc.order.map((name) => toNode(acc.children.get(name)!, depth + 1));
    return node;
  };

  return {
    forest: topOrder.map((name) => toNode(top.get(name)!, 1)),
    invalidLeaf,
  };
};

/** True for a node object built from flat rows. */
export const isFlatNode = <TRow = unknown>(d: unknown): d is FlatGroupNode<TRow> =>
  !!d && typeof d === 'object' && (d as Node)[FLAT_NODE] === true;

/** Narrow a datum to {@link FlatHierarchyDatum}. */
export const isFlatHierarchyDatum = <TData,>(
  d: NestedHierarchyDatum<TData> | FlatHierarchyDatum<TData>
): d is FlatHierarchyDatum<TData> => isFlatNode<TData>(d.data);

/** Display name for a node object, `''` when missing. */
export const nameOf = (d: unknown, nameKey = 'name'): string => {
  const key = isFlatNode(d) ? 'name' : nameKey;
  const v = (d as Node | null | undefined)?.[key];
  return v == null ? '' : String(v);
};

/** True for the synthetic root that wraps a forest. */
export const isSyntheticRoot = (node: HierarchyNode<Node>): boolean =>
  node.data?.[SYNTHETIC_ROOT] === true;

/** The public datum for `node`. */
export const toHierarchyDatum = <TData,>(
  node: HierarchyNode<Node>,
  nameKey = 'name'
): HierarchyDatum<TData, 'either'> => {
  const real = node.ancestors().reverse().filter((n) => !isSyntheticRoot(n));
  const parent = node.parent;
  const root = node.ancestors().pop() ?? node;
  const base: HierarchyDatumBase = {
    depth: node.depth,
    value: node.value ?? 0,
    name: nameOf(node.data, nameKey),
    path: real.map((n) => nameOf(n.data, nameKey)),
    parentValue: parent ? parent.value ?? 0 : null,
    rootValue: root.value ?? 0,
  };
  if (isFlatNode<TData>(node.data))
    return {
      ...base,
      data: node.data,
      level: node.data.level,
      rows: node.data.rows,
    };
  return { ...base, data: node.data as unknown as TData };
};

/** `a / b`, or `null` when the divisor is 0 or non-finite. */
export const ratio = (a: number, b: number | null): number | null =>
  b !== null && isFiniteNumber(b) && b !== 0 && isFiniteNumber(a) ? a / b : null;

export const percentOf = (d: HierarchyDatum<unknown, 'either'>, kind: HierarchyPercentKind) =>
  kind === 'ofParent' ? ratio(d.value, d.parentValue) : ratio(d.value, d.rootValue);

const pctFormat = format('.1~%');
/** Default percent text: `'n/a'` for null, else one decimal, trailing zeros trimmed. */
export const formatPercent = (pct: number | null): string =>
  !isFiniteNumber(pct) ? 'n/a' : pctFormat(pct);

/** `true` → `{}`, object → itself, anything else → `null` (off). */
export const labelOption = <T extends object>(
  opt: boolean | T | undefined
): Partial<T> | null => (opt === true ? {} : opt ? opt : null);

type PercentOpt = NonNullable<HierarchyLabels['percent']>;

/** Normalises `labels.percent` to the kinds to print plus class/format. */
export const percentOption = (opt: PercentOpt | undefined) => {
  if (!opt) return null;
  const of = typeof opt === 'string' ? opt : opt.of;
  const kinds: HierarchyPercentKind[] =
    of === 'both'
      ? ['ofParent', 'ofRoot']
      : of === 'ofParent' || of === 'parent'
      ? ['ofParent']
      : ['ofRoot'];
  return typeof opt === 'string'
    ? { kinds }
    : { kinds, className: opt.className, format: opt.format };
};

/**
 * `classNameMap` key for `node` under `colorBy`. `'top'` is the name of the
 * node's depth-1 ancestor (the top-level group; the node itself at depth 1,
 * and the root's own name at depth 0).
 */
export const colorKey = (
  node: HierarchyNode<Node>,
  colorBy: 'top' | 'depth' | 'name',
  nameKey = 'name'
): string => {
  if (colorBy === 'depth') return String(node.depth);
  if (colorBy === 'name') return nameOf(node.data, nameKey);
  const chain = node.ancestors().reverse(); // root → self
  const top = chain[1] ?? chain[0];
  return nameOf(top.data, nameKey);
};

/** Default tooltip HTML: breadcrumb, value, then both percents. */
export const defaultHierarchyTooltipHtml = (datum: unknown): string => {
  const d = datum as HierarchyDatum<unknown, 'either'>;
  return tooltipRows([
    d.path.join(' › '),
    `${d.value}`,
    ['of parent', formatPercent(percentOf(d, 'ofParent'))],
    ['of root', formatPercent(percentOf(d, 'ofRoot'))],
  ]);
};

/** Human-readable issue text; charts prefix it with `Chart#id: `. */
export const hierarchyIssueMessage = (issue: HierarchyIssue): string => {
  switch (issue.issue) {
    case 'flat-non-array':
      return 'data must be an array when levels is set; nothing is drawn.';
    case 'children-ignored':
      return 'children is ignored when levels is set.';
    case 'empty-level-keys':
      return `${issue.detail} empty levels key(s) were dropped.`;
  }
};
