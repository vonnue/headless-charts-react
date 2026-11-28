import {
  HierarchyRectangularNode,
  treemap,
  treemapBinary,
  treemapDice,
  treemapResquarify,
  treemapSlice,
  treemapSliceDice,
  treemapSquarify,
} from 'd3-hierarchy';
import { select } from 'd3-selection';
import 'd3-transition';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { twMerge } from 'tailwind-merge';

import useTooltip from '@/hooks/useTooltip';
import useChartSize from '@/hooks/useChartSize';
import { ChartProps } from '@/types';
import { chartClassName } from '@/utils';
import { isFiniteNumber } from '@/utils/domain';
import { warnOnceInDev } from '@/utils/devEnvironment';
import {
  type FlatHierarchyFields,
  type NestedHierarchyFields,
  HierarchyFieldsBase,
  HierarchyLabels,
  HierarchyLevelKey,
  HierarchyPercentKind,
  buildHierarchy,
  colorKey,
  defaultHierarchyTooltipHtml,
  formatPercent,
  hierarchyIssueMessage,
  isSyntheticRoot,
  labelOption,
  percentOf,
  percentOption,
  toHierarchyDatum,
} from '@/utils/hierarchy';

export type {
  FlatGroupNode,
  FlatHierarchyDatum,
  FlatHierarchyFields,
  HierarchyDatum,
  HierarchyFields,
  HierarchyPercentKind,
  NestedHierarchyDatum,
  NestedHierarchyFields,
} from '@/utils/hierarchy';
import { resolveDrawing } from '@/utils/drawing';

export type TreemapTileType =
  | 'squarify'
  | 'binary'
  | 'slice'
  | 'dice'
  | 'sliceDice'
  | 'resquarify';

type TreemapSpecific = {
  /** Tiling. Default squarify (golden ratio). `ratio` applies to squarify/resquarify only. */
  tile?: {
    type?: TreemapTileType;
    ratio?: number;
    /** Gap between sibling cells. Default `1`. */
    paddingInner?: number;
    /** Inset of children inside their parent. Default `1`. */
    paddingOuter?: number;
    /** Header inset on internal nodes. Default `16`, or `0` when `leavesOnly`. */
    paddingTop?: number;
  };
  /**
   * Default `false`: every positive-area node paints, and internal nodes get a
   * `paddingTop` header for their name. `true`: leaf cells only.
   */
  leavesOnly?: boolean;
};

/**
 * Public props. A union keyed on `levels`, so label formatters infer nested
 * (`data: TData`) when `levels` is omitted and flat (`data` is the built
 * group) when it is set.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type NestedTreemapChartProps<TData = any> = Omit<ChartProps<TData>, 'data'> &
  NestedHierarchyFields<TData> &
  TreemapSpecific;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FlatTreemapChartProps<TData = any> = Omit<ChartProps<TData>, 'data'> &
  FlatHierarchyFields<TData> &
  TreemapSpecific;
/**
 * Public props. A union keyed on `levels`. Because this is a union, you cannot
 * write `interface X extends TreemapChartProps`; use
 * `type X = TreemapChartProps & { ... }` instead.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TreemapChartProps<TData = any> =
  | NestedTreemapChartProps<TData>
  | FlatTreemapChartProps<TData>;

/** Implementation props: one function covers both modes. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TreemapChartImplProps<TData = any> = Omit<ChartProps<TData>, 'data'> &
  HierarchyFieldsBase<TData> &
  TreemapSpecific & {
    levels?: HierarchyLevelKey<TData>[];
    labels?: HierarchyLabels<TData, 'either'>;
  };

type TooltipHandlers = Pick<
  ReturnType<typeof useTooltip>,
  'onMouseOver' | 'onMouseMove' | 'onMouseLeave'
>;
type Node = Record<PropertyKey, unknown>;
type Cell = HierarchyRectangularNode<Node>;

const DEFAULT_STYLE = {};
const DEFAULT_DRAWING = { duration: 0 };
const LABEL_INSET = 4;
const LINE_EM = 1.2;

const tileFn = (type: TreemapTileType | undefined, ratio: number | undefined) => {
  switch (type) {
    case 'binary':
      return treemapBinary;
    case 'slice':
      return treemapSlice;
    case 'dice':
      return treemapDice;
    case 'sliceDice':
      return treemapSliceDice;
    case 'resquarify':
      return isFiniteNumber(ratio) ? treemapResquarify.ratio(ratio) : treemapResquarify;
    default:
      return isFiniteNumber(ratio) ? treemapSquarify.ratio(ratio) : treemapSquarify;
  }
};

const TreemapChartImpl = <TData = any,>({ // eslint-disable-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
  data,
  id,
  className,
  children,
  levels,
  value,
  name,
  sort = true,
  maxDepth,
  classNameMap,
  colorBy = 'top',
  labels,
  tile,
  leavesOnly = false,
  padding,
  margin,
  drawing = DEFAULT_DRAWING,
  tooltip,
  title,
  description,
  ariaLabel,
  style = DEFAULT_STYLE,
}: TreemapChartImplProps<TData>) => {
  const plotRef = useRef<SVGGElement>(null);
  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: defaultHierarchyTooltipHtml,
  });

  // The hook handlers are new each render but read the latest config, so the
  // d3 listeners call them through a ref instead of making them redraw deps.
  const tooltipHandlers = useRef<TooltipHandlers | null>(null);
  useLayoutEffect(() => {
    tooltipHandlers.current = { onMouseOver, onMouseMove, onMouseLeave };
  });

  // Redraws when the svg's rendered size changes, including container-driven
  // resizes (#53). null until measured, so the first draw is at the real size.
  const svgRef = useRef<SVGSVGElement>(null);
  const size = useChartSize(svgRef);
  const measured = size !== null;
  const width = size?.width ?? 0;
  const height = size?.height ?? 0;

  const refreshChart = useCallback(() => {
    if (!plotRef.current) return;
    const root = select(plotRef.current);
    root.selectAll('*').interrupt();
    root.selectAll('*').remove();

    const nameKey = name?.key ?? 'name';
    const built = buildHierarchy({
      data,
      childrenKey: children?.key ?? 'children',
      valueKey: value.key,
      nameKey,
      sort,
      maxDepth,
      levels,
      childrenSpecified: children !== undefined,
      onIssue: (issue) =>
        warnOnceInDev(
          `TreemapChart#${id}:${issue.issue}`,
          `TreemapChart#${id}: ${hierarchyIssueMessage(issue)}`
        ),
    });
    if (!built) return;
    if (built.invalidLeaf)
      warnOnceInDev(
        `TreemapChart#${id}:value`,
        `TreemapChart#${id}: negative or non-numeric leaf values for value.key "${value.key}" are laid out as 0 and not painted.`
      );
    if (colorBy === 'value')
      warnOnceInDev(
        `TreemapChart#${id}:colorBy`,
        `TreemapChart#${id}: colorBy "value" is reserved and ignored; colour names groups, area encodes magnitude. Using "top".`
      );
    const colorMode = colorBy === 'value' ? 'top' : colorBy;

    const m = { top: 0, right: 0, bottom: 0, left: 0, ...margin };
    const p = { top: 0, right: 0, bottom: 0, left: 0, ...padding };
    const plotLeft = m.left + p.left,
      plotTop = m.top + p.top,
      plotWidth = Math.max(0, width - plotLeft - m.right - p.right),
      plotHeight = Math.max(0, height - plotTop - m.bottom - p.bottom);

    const paddingInner = tile?.paddingInner ?? 1;
    const paddingOuter = tile?.paddingOuter ?? 1;
    const paddingTop = tile?.paddingTop ?? (leavesOnly ? 0 : 16);

    const layoutRoot = treemap<Node>()
      .size([plotWidth, plotHeight])
      .tile(tileFn(tile?.type, tile?.ratio))
      .paddingInner(paddingInner)
      .paddingOuter(paddingOuter)
      // The synthetic forest root is never painted, so it gets no header.
      .paddingTop((n) => (isSyntheticRoot(n) ? paddingOuter : paddingTop))(
      built.root
    );

    // Painted: real nodes with positive value and area (zero leaves omitted).
    const cells: Cell[] = layoutRoot
      .descendants()
      .filter(
        (n) =>
          !isSyntheticRoot(n) &&
          (n.value ?? 0) > 0 &&
          n.x1 - n.x0 > 0 &&
          n.y1 - n.y0 > 0 &&
          (!leavesOnly || !n.children)
      );
    if (cells.length === 0) return;

    const datums = cells.map((n) => toHierarchyDatum<TData>(n, nameKey));
    const indices = cells.map((_, i) => i);
    const isHeader = (i: number) => !leavesOnly && !!cells[i].children;
    const x = (i: number) => plotLeft + cells[i].x0;
    const y = (i: number) => plotTop + cells[i].y0;
    const w = (i: number) => cells[i].x1 - cells[i].x0;
    const h = (i: number) => cells[i].y1 - cells[i].y0;

    const markClass = (i: number) => {
      const key = colorKey(cells[i], colorMode, nameKey);
      // Layer the map over value.className: the map's fill wins, while
      // value.className's stroke (the visible gap) stays unless overridden.
      return twMerge(
        'fill-current',
        value.className,
        (classNameMap && Object.prototype.hasOwnProperty.call(classNameMap, key)
          ? classNameMap[key]
          : '') || ''
      );
    };

    const { duration, delay } = resolveDrawing(drawing);
    const marks = root
      .append('g')
      .attr('class', 'cells')
      .selectAll('rect')
      .data(indices)
      .enter()
      .append('rect')
      .attr('data-testid', 'treemap-cell')
      .attr('data-index', (i) => i)
      .attr('data-depth', (i) => cells[i].depth)
      .attr('data-leaf', (i) => String(!cells[i].children))
      .attr('data-name', (i) => datums[i].name)
      .attr('data-value', (i) => datums[i].value)
      .attr('class', markClass)
      .attr('x', x)
      .attr('y', y)
      .attr('width', w)
      .attr('height', h)
      .attr('opacity', duration ? 0 : null);
    if (duration)
      marks
        .transition()
        .duration(duration)
        .delay((i) => delay + cells[i].depth * 100)
        .attr('opacity', 1);

    // Hit targets: one transparent rect per painted cell, in the same
    // parent-before-child order, so a child's rect sits above its parent's
    // and the parent is reached through its header and gaps.
    root
      .append('g')
      .attr('class', 'hit-areas')
      .selectAll('rect')
      .data(indices)
      .enter()
      .append('rect')
      .attr('data-testid', 'treemap-hit')
      .attr('data-index', (i) => i)
      .attr('x', x)
      .attr('y', y)
      .attr('width', w)
      .attr('height', h)
      .attr('fill', 'transparent')
      .attr('pointer-events', 'all')
      .on('mouseenter', (event, i) =>
        tooltipHandlers.current?.onMouseOver(event, datums[i])
      )
      .on('mousemove', (event) => tooltipHandlers.current?.onMouseMove(event))
      .on('mouseleave', () => tooltipHandlers.current?.onMouseLeave());

    // Labels: clipped to their cell; hidden below minWidth / minHeight.
    const nameOpt = labelOption(labels?.name);
    const valueOpt = labelOption(labels?.value);
    const pctOpt = percentOption(labels?.percent);
    if (!nameOpt && !valueOpt && !pctOpt) return;
    const minWidth = labels?.minWidth ?? 40;
    const minHeight = labels?.minHeight ?? 18;

    type Line = { text: string; testid: string; className: string; kind?: HierarchyPercentKind };
    const linesFor = (i: number): Line[] => {
      const d = datums[i];
      const out: Line[] = [];
      if (nameOpt)
        out.push({
          testid: 'treemap-label-name',
          className: twMerge(name?.className, nameOpt.className),
          text: nameOpt.format ? nameOpt.format(d.name, d, i) : d.name,
        });
      // Internal nodes print only their name, in the header.
      if (isHeader(i)) return out;
      if (valueOpt)
        out.push({
          testid: 'treemap-label-value',
          className: valueOpt.className ?? '',
          text: valueOpt.format ? valueOpt.format(d.value, d, i) : String(d.value),
        });
      pctOpt?.kinds.forEach((kind) =>
        out.push({
          kind,
          testid: 'treemap-label-percent',
          className: pctOpt.className ?? '',
          text: pctOpt.format
            ? pctOpt.format(percentOf(d, kind), kind, d, i)
            : formatPercent(percentOf(d, kind)),
        })
      );
      return out;
    };

    // Headers are gated on width only (and a non-zero header): the default
    // header (16px) is shorter than the default minHeight (18px), which would
    // otherwise hide every group name by default. The clip keeps text inside.
    const labelled = indices.filter((i) =>
      isHeader(i)
        ? paddingTop > 0 && w(i) >= minWidth
        : w(i) >= minWidth && h(i) >= minHeight
    );
    const defs = root.append('defs');
    const clipId = (i: number) => `${id}-cell-clip-${i}`;
    labelled.forEach((i) =>
      defs
        .append('clipPath')
        .attr('id', clipId(i))
        .append('rect')
        .attr('x', x(i))
        .attr('y', y(i))
        .attr('width', w(i))
        .attr('height', isHeader(i) ? Math.min(paddingTop, h(i)) : h(i))
    );

    const labelGroups = root
      .append('g')
      .attr('class', 'labels')
      .attr('pointer-events', 'none')
      .selectAll('g')
      .data(labelled)
      .enter()
      .append('g')
      .attr('data-testid', 'treemap-label-group')
      .attr('data-index', (i) => i)
      .attr('clip-path', (i) => `url(#${clipId(i)})`);

    labelGroups.each(function (i) {
      const header = isHeader(i);
      select(this)
        .selectAll('text')
        .data(linesFor(i))
        .enter()
        .append('text')
        .attr('data-testid', (l) => l.testid)
        .attr('data-index', i)
        .attr('data-kind', (l) => l.kind ?? null)
        .attr('class', (l) => twMerge('fill-current', l.className))
        .attr('x', x(i) + LABEL_INSET)
        .attr('y', header ? y(i) + paddingTop / 2 : y(i) + LABEL_INSET)
        .attr('dy', (_, k) => `${k * LINE_EM}em`)
        .attr('dominant-baseline', header ? 'middle' : 'hanging')
        .text((l) => l.text);
    });
  }, [
    width,
    height,
    data,
    id,
    children,
    levels,
    value,
    name,
    sort,
    maxDepth,
    classNameMap,
    colorBy,
    labels,
    tile,
    leavesOnly,
    padding,
    margin,
    drawing,
  ]);

  useEffect(() => {
    if (!measured) return;
    refreshChart();
    // Hold the node: on unmount the cleanup runs after the svg has left the
    // document, so interrupt through this reference, not a lookup by id.
    const plot = plotRef.current;
    return () => {
      if (plot) select(plot).selectAll('*').interrupt();
    };
    // A style/className size change reaches refreshChart through useChartSize.
  }, [refreshChart, measured]);

  const titleId = title ? `${id}-title` : undefined;
  const descId = description ? `${id}-desc` : undefined;

  return (
    <svg
      ref={svgRef}
      id={id}
      style={style}
      className={chartClassName(className)}
      role='img'
      aria-labelledby={titleId}
      aria-describedby={descId}
      aria-label={title ? undefined : ariaLabel ?? 'Treemap chart'}
      data-testid='treemap-chart'
    >
      {title ? <title id={titleId}>{title}</title> : null}
      {description ? <desc id={descId}>{description}</desc> : null}
      <g ref={plotRef} className='treemap-plot' />
    </svg>
  );
};

/* eslint-disable @typescript-eslint/no-explicit-any -- generic default matches ChartProps */
/* catalog:start */
/**
 * Nested rectangles whose area encodes value, showing a hierarchical
 * part-to-whole with groups as labelled blocks.
 *
 * @remarks
 *
 * **Use when**
 * - A whole splits into nested groups and both the group totals and their
 *   parts matter
 * - There are too many parts for a pie, and the hierarchy is what explains
 *   them
 * - Leaf areas should be comparable at a glance — set `leavesOnly` if group
 *   headers are noise
 * - The data is a flat table with category columns and one measure
 *
 * **Avoid when**
 * - A flat whole with about 6 or fewer parts — use PieChart
 * - Individual units should be countable cells — use WaffleChart
 * - A flat ranked comparison of leaves with no nesting — use BarChart
 * - Composition changes over time — use AreaChart or BarChart with
 *   `stacking`
 * - Colour is used to encode magnitude — area already encodes value; keep
 *   `classNameMap` as group identity only
 * - Volume moves between categories rather than a static nested split — use
 *   SankeyChart
 * - A radial hierarchy is preferred — use SunburstChart; do not stretch
 *   PizzaChart (`sunburst-style profile`) into that role
 *
 * Also called: treemap, squarified treemap, rectangular tree map.
 *
 * Answers: composition. Required props: `id`, `data`, `value`.
 *
 * @example
 * ```tsx
 * <TreemapChart
 *   id="budget"
 *   className="w-full h-96"
 *   data={data}
 *   value={{ key: 'amount', className: 'fill-slate-300 stroke-white stroke-1' }}
 *   classNameMap={{ Ops: 'fill-slate-500', Growth: 'fill-slate-400' }}
 *   labels={{ name: true, value: true, percent: 'ofParent' }}
 *   title="Budget by group"
 * />
 * ```
 *
 * @see PieChart — a flat part-to-whole with few slices
 * @see WaffleChart — cells should be countable units
 * @see BarChart — a flat ranked comparison of the leaves with no nesting
 * @see SankeyChart — volume moves between categories rather than a static
 *   nested split
 * @see AreaChart — composition changes over time
 * @see SunburstChart — a radial hierarchy is preferred
 * @see PizzaChart — a single-entity radial profile, not a hierarchy
 */
/* catalog:end */
function TreemapChart<TData = any>(
  props: NestedTreemapChartProps<TData>
): ReturnType<typeof TreemapChartImpl>;
function TreemapChart<TData = any>(
  props: FlatTreemapChartProps<TData>
): ReturnType<typeof TreemapChartImpl>;
function TreemapChart<TData = any>(
  props: TreemapChartImplProps<TData>
): ReturnType<typeof TreemapChartImpl>;
function TreemapChart<TData = any>(
  props:
    | NestedTreemapChartProps<TData>
    | FlatTreemapChartProps<TData>
    | TreemapChartImplProps<TData>,
) {
  return TreemapChartImpl(props as TreemapChartImplProps<TData>);
}
/* eslint-enable @typescript-eslint/no-explicit-any */
export default TreemapChart;
