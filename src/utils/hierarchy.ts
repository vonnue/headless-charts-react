/**
 * Shared hierarchy input, value and label rules for TreemapChart (#58) and
 * the future SunburstChart (#63). Layout-free: no d3 selection, no React, no
 * tiling, so each hierarchical chart adds only its own geometry.
 *
 * Input is nested only (Jayaram, 2026-11-09): one root object or a forest,
 * children under `children.key` (default `'children'`). No flat id/parent.
 */
import { HierarchyNode, hierarchy } from 'd3-hierarchy';
import { format } from 'd3-format';
import { TooltipConfig } from '@/types';
import { isFiniteNumber } from '@/utils/domain';

/** Props shared by hierarchical charts. Chart-specific props extend this. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface HierarchyFields<TData = any> {
  /** One nested root object, or a forest (array of roots). */
  data?: TData | TData[];
  /** Nested children key. Default `{ key: 'children' }`. */
  children?: { key?: Extract<keyof TData, string> | string };
  /** Leaf size. Internal nodes = sum of descendant leaves (their own value is ignored). */
  value: {
    key: Extract<keyof TData, string> | string;
    /** Default mark class, used when `classNameMap` has no match. */
    className?: string;
  };
  /** Display name. Default key `'name'`; a missing name shows as `''`. */
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
  labels?: {
    name?:
      | boolean
      | {
          className?: string;
          format?: (name: string, d: HierarchyDatum<TData>, i: number) => string;
        };
    value?:
      | boolean
      | {
          className?: string;
          format?: (value: number, d: HierarchyDatum<TData>, i: number) => string;
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
            d: HierarchyDatum<TData>,
            i: number
          ) => string;
        };
    /** Hide label text on cells narrower than this. Default `40`. */
    minWidth?: number;
    /** Hide label text on cells shorter than this. Default `18`. */
    minHeight?: number;
  };
  tooltip?: TooltipConfig;
  /** Accessible name → SVG `<title>` + `aria-labelledby`. */
  title?: string;
  /** Longer accessible description → SVG `<desc>` + `aria-describedby`. */
  description?: string;
  /** Used only when `title` is omitted. Each chart supplies its own default. */
  ariaLabel?: string;
}

/** What labels, tooltips and callbacks receive for one node. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface HierarchyDatum<TData = any> {
  /** The original node object (children included). */
  data: TData;
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

export type HierarchyPercentKind = 'ofParent' | 'ofRoot';

/** Marker on the synthetic root that wraps a forest. Never painted. */
export const SYNTHETIC_ROOT = Symbol('headless-charts.syntheticRoot');

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
}

/**
 * Builds, sums, caps and sorts the hierarchy. Returns `null` for empty input
 * (`undefined`, `null`, `[]`). Leaves define size; internal values are ignored.
 */
export const buildHierarchy = ({
  data,
  childrenKey = 'children',
  valueKey,
  nameKey = 'name',
  sort = true,
  maxDepth,
}: {
  data: unknown;
  childrenKey?: string;
  valueKey: string;
  nameKey?: string;
  sort?: boolean;
  maxDepth?: number;
}): BuiltHierarchy | null => {
  if (data == null) return null;
  const forest = Array.isArray(data);
  if (forest && data.length === 0) return null;
  const rootDatum: Node = forest
    ? { [SYNTHETIC_ROOT]: true, [childrenKey]: data }
    : (data as Node);

  let invalidLeaf = false;
  const root = hierarchy<Node>(rootDatum, (d) => childrenOf(d, childrenKey));
  root.sum((d) => {
    if (childrenOf(d, childrenKey)) return 0;
    const raw = d[valueKey];
    if (!(isFiniteNumber(raw) && raw >= 0)) invalidLeaf = true;
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

  return { root, synthetic: forest, invalidLeaf };
};

/** Display name for a node object, `''` when missing. */
export const nameOf = (d: unknown, nameKey = 'name'): string => {
  const v = (d as Node | null | undefined)?.[nameKey];
  return v == null ? '' : String(v);
};

/** True for the synthetic root that wraps a forest. */
export const isSyntheticRoot = (node: HierarchyNode<Node>): boolean =>
  node.data?.[SYNTHETIC_ROOT] === true;

/** The public datum for `node`. */
export const toHierarchyDatum = <TData,>(
  node: HierarchyNode<Node>,
  nameKey = 'name'
): HierarchyDatum<TData> => {
  const real = node.ancestors().reverse().filter((n) => !isSyntheticRoot(n));
  const parent = node.parent;
  const root = node.ancestors().pop() ?? node;
  return {
    data: node.data as unknown as TData,
    depth: node.depth,
    value: node.value ?? 0,
    name: nameOf(node.data, nameKey),
    path: real.map((n) => nameOf(n.data, nameKey)),
    parentValue: parent ? parent.value ?? 0 : null,
    rootValue: root.value ?? 0,
  };
};

/** `a / b`, or `null` when the divisor is 0 or non-finite. */
export const ratio = (a: number, b: number | null): number | null =>
  b !== null && isFiniteNumber(b) && b !== 0 && isFiniteNumber(a) ? a / b : null;

export const percentOf = (d: HierarchyDatum, kind: HierarchyPercentKind) =>
  kind === 'ofParent' ? ratio(d.value, d.parentValue) : ratio(d.value, d.rootValue);

const pctFormat = format('.1~%');
/** Default percent text: `'n/a'` for null, else one decimal, trailing zeros trimmed. */
export const formatPercent = (pct: number | null): string =>
  pct === null || !Number.isFinite(pct) ? 'n/a' : pctFormat(pct);

/** `true` → `{}`, object → itself, anything else → `null` (off). */
export const labelOption = <T extends object>(
  opt: boolean | T | undefined
): Partial<T> | null => (opt === true ? {} : opt ? opt : null);

type PercentOpt = NonNullable<NonNullable<HierarchyFields['labels']>['percent']>;

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
  const d = datum as HierarchyDatum;
  return `${d.path.join(' › ')}<br/>${d.value}<br/>of parent: ${formatPercent(
    percentOf(d, 'ofParent')
  )}<br/>of root: ${formatPercent(percentOf(d, 'ofRoot'))}`;
};
