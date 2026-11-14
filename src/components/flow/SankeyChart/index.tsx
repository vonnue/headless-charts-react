import { format as d3Format } from 'd3-format';
import { select } from 'd3-selection';
import { linkHorizontal, linkVertical } from 'd3-shape';
import 'd3-transition';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { twMerge } from 'tailwind-merge';

import useTooltip from '@/hooks/useTooltip';
import { ChartProps, TooltipConfig } from '@/types';
import { defaultChartClassNames } from '@/utils';
import measureSvg from '@/utils/measureSvg';
import { warnOnceInDev } from '@/utils/devEnvironment';
import { interruptTransitions } from '@/utils/interruptTransitions';
import {
  LayoutLink,
  LayoutNode,
  SankeyAlign,
  computeSankeyLayout,
} from './layout';
import { prepareGraph } from './prepare';

export type { SankeyAlign } from './layout';

export interface SankeyNodeDatum<TNode = any> { // eslint-disable-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
  kind: 'node';
  id: string;
  label: string;
  /** The `nodes` record; `null` when the node was inferred from links. */
  data: TNode | null;
  /** max(inValue, outValue). */
  value: number;
  inValue: number;
  outValue: number;
  /** 0-based column after alignment. */
  column: number;
}

export interface SankeyLinkDatum<TLink = any> { // eslint-disable-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
  kind: 'link';
  source: SankeyNodeDatum;
  target: SankeyNodeDatum;
  value: number;
  /** value / source.outValue; null when the divisor is 0. */
  ofSource: number | null;
  /** value / target.inValue; null when the divisor is 0. */
  ofTarget: number | null;
  /** Original rows merged into this link (more than one when duplicates are summed). */
  rows: TLink[];
}

export interface SankeyChartProps<TNode = any, TLink = any> // eslint-disable-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
  extends Omit<ChartProps<TLink>, 'data' | 'zooming'> {
  /** Flow records. Required. */
  links: TLink[];
  /**
   * Optional node records. When omitted, nodes are inferred from link
   * endpoints (id = label). When given, they are authoritative: links to an
   * unknown id are dropped with a dev warning.
   */
  nodes?: TNode[];
  nodeDef?: {
    /** Default `'id'`. */
    idKey?: Extract<keyof TNode, string> | string;
    /** Display label. Default: the id. */
    labelKey?: Extract<keyof TNode, string> | string;
    /** Default node rect class. */
    className?: string;
    /** Node rect class keyed by node id. Overrides `className`. Colour names the node. */
    classNameMap?: Record<string, string>;
    /** Node thickness along the flow axis, in px. Default `12`. */
    width?: number;
    /** Gap between nodes in a column, in px. Default `12`. Shrinks automatically if a column would overflow. */
    padding?: number;
  };
  linkDef?: {
    /** Default `'source'`. */
    sourceKey?: Extract<keyof TLink, string> | string;
    /** Default `'target'`. */
    targetKey?: Extract<keyof TLink, string> | string;
    /** Default `'value'`. */
    valueKey?: Extract<keyof TLink, string> | string;
    /** Default link path class (styled through stroke). */
    className?: string;
    /**
     * Link class keyed by **node id**, taken from the endpoint that
     * `colorBy` selects. Overrides `className`.
     */
    classNameMap?: Record<string, string>;
    /** Default `'source'`. `'none'` uses `className` only. */
    colorBy?: 'source' | 'target' | 'none';
  };
  /** Column alignment. Default `'justify'` (sinks in the last column). */
  align?: SankeyAlign;
  /** Default `'auto'` (relaxation). `'input'` keeps node input order within each column. */
  nodeSort?: 'auto' | 'input';
  /** Relaxation passes for `nodeSort: 'auto'`. Default `6`. */
  iterations?: number;
  /** Default `'horizontal'` (flows left → right). `'vertical'` flows top → bottom. */
  orientation?: 'horizontal' | 'vertical';
  labels?: {
    /** Default `true`. */
    name?:
      | boolean
      | {
          className?: string;
          format?: (label: string, n: SankeyNodeDatum<TNode>) => string;
        };
    /** Default `false`. Appends the node value. */
    value?:
      | boolean
      | {
          className?: string;
          format?: (v: number, n: SankeyNodeDatum<TNode>) => string;
        };
    /**
     * Default `'auto'`: nodes in the first half of the columns are labelled
     * on the far side (toward the next column), the rest on the near side,
     * so labels point inward. `'start'` / `'end'` force one side.
     */
    side?: 'auto' | 'start' | 'end';
  };
  /**
   * Number formatter for default tooltips and value labels. Default
   * `d3.format(',')`: grouped thousands, up to ~12 significant digits,
   * trailing zeros trimmed (1234567 → "1,234,567", 0.5 → "0.5").
   */
  format?: (v: number) => string;
  /**
   * Hover highlighting through `data-highlighted` / `data-dimmed`
   * attributes (no built-in styling). Default `'adjacent'`. `'path'`
   * highlights every upstream and downstream node and link. `false` turns
   * it off.
   */
  highlight?: false | 'adjacent' | 'path';
  /** Shared by nodes and links. The datum's `kind` tells them apart. */
  tooltip?: TooltipConfig;
  /** Accessible name → SVG `<title>` + `aria-labelledby`. */
  title?: string;
  /** Longer accessible description → SVG `<desc>` + `aria-describedby`. */
  description?: string;
  /** Used only when `title` is omitted. Default `"Sankey chart"`. */
  ariaLabel?: string;
}

type TooltipHandlers = Pick<
  ReturnType<typeof useTooltip>,
  'onMouseOver' | 'onMouseMove' | 'onMouseLeave'
>;

type Highlight = NonNullable<SankeyChartProps['highlight']>;

const DEFAULT_STYLE = {};
const DEFAULT_DRAWING = { duration: 0 };
const DEFAULT_NODE_WIDTH = 12;
const DEFAULT_NODE_PADDING = 12;
const DEFAULT_ITERATIONS = 6;
/** Minimum hit-area size on each axis, in px. */
const MIN_HIT = 8;
/** Gap between a node and its label, in px. */
const LABEL_GAP = 6;

// ',' rather than the spec's ',~g', which prints 1234567 as "1.23457e+6".
const defaultFormat = d3Format(',');
const percentFormat = d3Format('.1~%');

/** A ratio as `'.1~%'`, or `'n/a'` when null or not finite. */
const formatShare = (v: number | null): string =>
  v === null || !Number.isFinite(v) ? 'n/a' : percentFormat(v);

/** Formats `v` with `fmt`, never printing NaN/Infinity. */
const safe = (fmt: (v: number) => string, v: number) =>
  Number.isFinite(v) ? fmt(v) : 'n/a';

type LabelOption<F> = { className?: string; format?: F } | null;

/** `true` → `{}`, object → itself, anything else → `null` (off). */
const labelOption = <F,>(
  opt: boolean | { className?: string; format?: F } | undefined
): LabelOption<F> => (opt === true ? {} : opt ? opt : null);

/** Default tooltip HTML for a node or link datum. */
const defaultSankeyTooltipHtml =
  (fmt: (v: number) => string) =>
  (datum: unknown): string => {
    const d = datum as SankeyNodeDatum | SankeyLinkDatum | null;
    if (!d) return '';
    if (d.kind === 'node') {
      const lines = [d.label];
      if (d.inValue > 0) lines.push(`in: ${safe(fmt, d.inValue)}`);
      if (d.outValue > 0) lines.push(`out: ${safe(fmt, d.outValue)}`);
      return lines.join('<br/>');
    }
    return `${d.source.label} → ${d.target.label}<br/>${safe(
      fmt,
      d.value
    )}<br/>${formatShare(d.ofSource)} of ${d.source.label} out`;
  };

/** A setting that must be a finite number ≥ 0; otherwise the default, with a warning. */
const checkedSetting = (
  id: string,
  name: string,
  value: number | undefined,
  fallback: number
): number => {
  if (value === undefined) return fallback;
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0)
    return value;
  warnOnceInDev(
    `SankeyChart#${id}:${name}`,
    `SankeyChart#${id}: ${name} (${String(value)}) must be a finite number ≥ 0; using ${fallback}.`
  );
  return fallback;
};

const has = (map: Record<string, string> | undefined, key: string) =>
  !!map && Object.prototype.hasOwnProperty.call(map, key);

/* catalog:start */
/**
 * Weighted flows between nodes arranged in layered columns; node size and link
 * width share one scale, showing how much moves from where to where.
 *
 * @remarks
 *
 * **Use when**
 * - Volume moves between stages or categories and both the totals and the
 *   splits matter — e.g. energy, budget or user-journey flows
 * - Flows pass through intermediate nodes in layered steps (source →
 *   conversion → use)
 * - Imbalance at a node (inflow ≠ outflow) should stay visible — node size
 *   is max(in, out)
 *
 * **Avoid when**
 * - One ordered path with drop-off — use FunnelChart
 * - Relationships without volumes — use Network
 * - Flows that loop back (cycles) — the chart draws nothing; use Network, or
 *   aggregate the data into an acyclic graph first
 * - More than ~30 nodes — aggregate first
 * - Parts of one whole with no flow between them — use TreemapChart or
 *   PieChart
 *
 * Also called: sankey, sankey diagram, sankey chart, flow diagram, alluvial diagram.
 *
 * Answers: connection, composition. Required props: `id`, `links`.
 *
 * @example
 * ```tsx
 * <SankeyChart
 *   id="energy"
 *   className="w-full h-96"
 *   links={data}
 *   nodes={nodes}
 *   nodeDef={{ idKey: 'id', labelKey: 'name', className: 'fill-slate-500',
 *              classNameMap: { Coal: 'fill-stone-600', Solar: 'fill-amber-400' } }}
 *   linkDef={{ valueKey: 'twh', className: 'stroke-slate-300 [stroke-opacity:0.5]',
 *              classNameMap: { Coal: 'stroke-stone-400', Solar: 'stroke-amber-300' } }}
 *   labels={{ name: true, value: true }}
 *   tooltip={{ className: 'bg-white text-xs p-2 shadow' }}
 *   title="Energy flows, 2025 (TWh)"
 * />
 * ```
 *
 * @see Network — topology without volumes, or flows with cycles
 * @see PieChart — parts of one whole with no flow between them
 */
/* catalog:end */
const SankeyChart = <TNode = any, TLink = any,>({ // eslint-disable-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
  id,
  className,
  links,
  nodes,
  nodeDef,
  linkDef,
  align = 'justify',
  nodeSort = 'auto',
  iterations,
  orientation = 'horizontal',
  labels,
  format,
  highlight = 'adjacent',
  padding,
  margin,
  drawing = DEFAULT_DRAWING,
  tooltip,
  title,
  description,
  ariaLabel,
  style = DEFAULT_STYLE,
}: SankeyChartProps<TNode, TLink>) => {
  const plotRef = useRef<SVGGElement>(null);
  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: defaultSankeyTooltipHtml(format ?? defaultFormat),
  });

  // The hook handlers are new each render but read the latest config, so the
  // d3 listeners call them through a ref instead of making them redraw deps
  // (otherwise every parent re-render would clear and redraw the layout).
  // `highlight` is read the same way: it only changes hover behaviour.
  const tooltipHandlers = useRef<TooltipHandlers | null>(null);
  const highlightMode = useRef<Highlight>(highlight);
  useLayoutEffect(() => {
    tooltipHandlers.current = { onMouseOver, onMouseMove, onMouseLeave };
    highlightMode.current = highlight;
  });

  const refreshChart = useCallback(() => {
    if (!plotRef.current) return;
    const svgNode = plotRef.current.ownerSVGElement;
    const root = select(plotRef.current);
    root.selectAll('*').interrupt();
    root.selectAll('*').remove();

    const fmt = format ?? defaultFormat;
    const nodeWidth = checkedSetting(id, 'nodeDef.width', nodeDef?.width, DEFAULT_NODE_WIDTH);
    const nodePadding = checkedSetting(id, 'nodeDef.padding', nodeDef?.padding, DEFAULT_NODE_PADDING);
    const passes = Math.floor(
      checkedSetting(id, 'iterations', iterations, DEFAULT_ITERATIONS)
    );

    const { graph, warnings } = prepareGraph<TNode, TLink>(links, nodes, {
      idKey: nodeDef?.idKey ?? 'id',
      labelKey: nodeDef?.labelKey,
      sourceKey: linkDef?.sourceKey ?? 'source',
      targetKey: linkDef?.targetKey ?? 'target',
      valueKey: linkDef?.valueKey ?? 'value',
    });
    warnings.forEach((w) =>
      warnOnceInDev(`SankeyChart#${id}:${w.key}`, `SankeyChart#${id}: ${w.message}`)
    );
    if (graph.ids.length === 0) return;

    const m = { top: 20, right: 20, bottom: 20, left: 20, ...margin };
    const p = { top: 0, right: 0, bottom: 0, left: 0, ...padding };
    const { width, height } = measureSvg(svgNode);
    const plotLeft = m.left + p.left,
      plotRight = Math.max(plotLeft, width - m.right - p.right),
      plotTop = m.top + p.top,
      plotBottom = Math.max(plotTop, height - m.bottom - p.bottom);

    const vertical = orientation === 'vertical';
    // Abstract layout: x along the flow, y across it.
    const layout = computeSankeyLayout(
      { ids: graph.ids, links: graph.links },
      {
        x0: vertical ? plotTop : plotLeft,
        x1: vertical ? plotBottom : plotRight,
        y0: vertical ? plotLeft : plotTop,
        y1: vertical ? plotRight : plotBottom,
        nodeWidth,
        nodePadding,
        align,
        nodeSort,
        iterations: passes,
      }
    );

    // Tooltip datums.
    const nodeDatum = new Map<LayoutNode, SankeyNodeDatum<TNode>>();
    layout.nodes.forEach((n) =>
      nodeDatum.set(n, {
        kind: 'node',
        id: n.id,
        label: graph.labels.get(n.id) ?? n.id,
        data: graph.records.get(n.id) ?? null,
        value: n.value,
        inValue: n.inValue,
        outValue: n.outValue,
        column: n.layer,
      })
    );
    const linkDatum = new Map<LayoutLink, SankeyLinkDatum<TLink>>();
    layout.links.forEach((l) =>
      linkDatum.set(l, {
        kind: 'link',
        source: nodeDatum.get(l.source)!,
        target: nodeDatum.get(l.target)!,
        value: l.value,
        ofSource: l.source.outValue > 0 ? l.value / l.source.outValue : null,
        ofTarget: l.target.inValue > 0 ? l.value / l.target.inValue : null,
        rows: graph.links[l.index].rows,
      })
    );

    // Screen geometry of a node rect (optionally collapsed onto its centre line).
    const nodeRect = (n: LayoutNode, grow = 1) => {
      const mid = (n.y0 + n.y1) / 2;
      const half = ((n.y1 - n.y0) / 2) * grow;
      return vertical
        ? { x: mid - half, y: n.x0, width: half * 2, height: n.x1 - n.x0 }
        : { x: n.x0, y: mid - half, width: n.x1 - n.x0, height: half * 2 };
    };
    const linkPath = vertical
      ? linkVertical<LayoutLink, [number, number]>()
          .source((l) => [l.y0, l.source.x1])
          .target((l) => [l.y1, l.target.x0])
      : linkHorizontal<LayoutLink, [number, number]>()
          .source((l) => [l.source.x1, l.y0])
          .target((l) => [l.target.x0, l.y1]);

    const nodeClass = (n: LayoutNode) =>
      twMerge(
        'fill-current',
        (has(nodeDef?.classNameMap, n.id)
          ? nodeDef!.classNameMap![n.id]
          : nodeDef?.className) || ''
      );
    const colorBy = linkDef?.colorBy ?? 'source';
    const linkClass = (l: LayoutLink) => {
      const key =
        colorBy === 'source' ? l.source.id : colorBy === 'target' ? l.target.id : null;
      return twMerge(
        'stroke-current',
        (key !== null && has(linkDef?.classNameMap, key)
          ? linkDef!.classNameMap![key]
          : linkDef?.className) || ''
      );
    };

    const duration = drawing?.duration ?? 0;
    const delay = drawing?.delay ?? 0;

    const chartG = root
      .append('g')
      .attr('class', 'sankey')
      .attr('data-ky', layout.ky)
      .attr('data-py', layout.py)
      .attr('data-columns', layout.columnCount);

    // Painted marks: links under nodes. No handlers here.
    const linkPaths = chartG
      .append('g')
      .attr('class', 'links')
      .attr('fill', 'none')
      .selectAll('path')
      .data(layout.links)
      .enter()
      .append('path')
      .attr('data-testid', 'sankey-link')
      .attr('data-source', (l) => l.source.id)
      .attr('data-target', (l) => l.target.id)
      .attr('data-value', (l) => l.value)
      .attr('class', linkClass)
      .attr('d', (l) => linkPath(l))
      .attr('fill', 'none')
      .attr('stroke-opacity', 0.5)
      .attr('stroke-width', (l) => (duration ? 0 : l.width));
    if (duration)
      linkPaths
        .transition()
        .duration(duration)
        .delay(delay)
        .attr('stroke-width', (l) => l.width);

    const nodeRects = chartG
      .append('g')
      .attr('class', 'nodes')
      .selectAll('rect')
      .data(layout.nodes)
      .enter()
      .append('rect')
      .attr('data-testid', 'sankey-node')
      .attr('data-id', (n) => n.id)
      .attr('data-column', (n) => n.layer)
      .attr('data-value', (n) => n.value)
      .attr('class', nodeClass)
      .attr('x', (n) => nodeRect(n, duration ? 0 : 1).x)
      .attr('y', (n) => nodeRect(n, duration ? 0 : 1).y)
      .attr('width', (n) => nodeRect(n, duration ? 0 : 1).width)
      .attr('height', (n) => nodeRect(n, duration ? 0 : 1).height);
    if (duration)
      nodeRects
        .transition()
        .duration(duration)
        .delay(delay)
        .attr('x', (n) => nodeRect(n).x)
        .attr('y', (n) => nodeRect(n).y)
        .attr('width', (n) => nodeRect(n).width)
        .attr('height', (n) => nodeRect(n).height);

    // Hit areas sit above the painted marks; labels (pointer-events none)
    // are drawn above both.
    const hitsG = chartG.append('g').attr('class', 'hit-areas');

    // Labels.
    const nameOpt = labelOption(labels?.name ?? true);
    const valueOpt = labelOption(labels?.value);
    const side = labels?.side ?? 'auto';
    let labelTexts: ReturnType<typeof chartG.selectAll<SVGTextElement, LayoutNode>> | null = null;
    if (nameOpt || valueOpt) {
      // "after" = the side toward the next column.
      const after = (n: LayoutNode) =>
        side === 'end' ? true : side === 'start' ? false : n.layer < layout.columnCount / 2;
      labelTexts = chartG
        .append('g')
        .attr('class', 'labels')
        .attr('pointer-events', 'none')
        .selectAll<SVGTextElement, LayoutNode>('text')
        .data(layout.nodes)
        .enter()
        .append('text')
        .attr('data-testid', 'sankey-label')
        .attr('data-id', (n) => n.id)
        .attr('data-side', (n) => (after(n) ? 'end' : 'start'))
        .attr('class', twMerge('fill-current', nameOpt?.className))
        .attr('x', (n) =>
          vertical ? (n.y0 + n.y1) / 2 : after(n) ? n.x1 + LABEL_GAP : n.x0 - LABEL_GAP
        )
        .attr('y', (n) =>
          vertical ? (after(n) ? n.x1 + LABEL_GAP : n.x0 - LABEL_GAP) : (n.y0 + n.y1) / 2
        )
        .attr('text-anchor', (n) => (vertical ? 'middle' : after(n) ? 'start' : 'end'))
        .attr('dominant-baseline', (n) =>
          vertical ? (after(n) ? 'hanging' : 'auto') : 'middle'
        );
      labelTexts.each(function (n) {
        const datum = nodeDatum.get(n)!;
        const text = select(this);
        if (nameOpt)
          text
            .append('tspan')
            .attr('data-part', 'name')
            .text(nameOpt.format ? nameOpt.format(datum.label, datum) : datum.label);
        if (valueOpt)
          text
            .append('tspan')
            .attr('data-part', 'value')
            .attr('class', valueOpt.className ?? null)
            .text(
              `${nameOpt ? ' ' : ''}${
                valueOpt.format ? valueOpt.format(datum.value, datum) : safe(fmt, datum.value)
              }`
            );
      });
    }

    // Hover highlight through data attributes.
    const setHighlight = (hiNodes: Set<LayoutNode> | null, hiLinks: Set<LayoutLink> | null) => {
      const mark = <T,>(set: Set<T> | null) => ({
        hi: (d: T) => (set ? (set.has(d) ? 'true' : null) : null),
        dim: (d: T) => (set ? (set.has(d) ? null : 'true') : null),
      });
      const n = mark(hiNodes);
      const l = mark(hiLinks);
      nodeRects.attr('data-highlighted', n.hi).attr('data-dimmed', n.dim);
      labelTexts?.attr('data-highlighted', n.hi).attr('data-dimmed', n.dim);
      linkPaths.attr('data-highlighted', l.hi).attr('data-dimmed', l.dim);
    };
    const walk = (
      start: LayoutNode,
      dir: 'up' | 'down',
      hiNodes: Set<LayoutNode>,
      hiLinks: Set<LayoutLink>
    ) => {
      const queue = [start];
      const seen = new Set<LayoutNode>([start]);
      while (queue.length) {
        const node = queue.shift()!;
        hiNodes.add(node);
        for (const link of dir === 'down' ? node.sourceLinks : node.targetLinks) {
          hiLinks.add(link);
          const next = dir === 'down' ? link.target : link.source;
          if (!seen.has(next)) {
            seen.add(next);
            queue.push(next);
          }
        }
      }
    };
    const highlightNode = (n: LayoutNode) => {
      const mode = highlightMode.current;
      if (!mode) return;
      const hiNodes = new Set<LayoutNode>([n]);
      const hiLinks = new Set<LayoutLink>();
      if (mode === 'path') {
        walk(n, 'up', hiNodes, hiLinks);
        walk(n, 'down', hiNodes, hiLinks);
      } else
        [...n.sourceLinks, ...n.targetLinks].forEach((l) => {
          hiLinks.add(l);
          hiNodes.add(l.source);
          hiNodes.add(l.target);
        });
      setHighlight(hiNodes, hiLinks);
    };
    const highlightLink = (l: LayoutLink) => {
      const mode = highlightMode.current;
      if (!mode) return;
      const hiNodes = new Set<LayoutNode>([l.source, l.target]);
      const hiLinks = new Set<LayoutLink>([l]);
      if (mode === 'path') {
        walk(l.source, 'up', hiNodes, hiLinks);
        walk(l.target, 'down', hiNodes, hiLinks);
      }
      setHighlight(hiNodes, hiLinks);
    };
    const clearHighlight = () => setHighlight(null, null);

    // Hit areas: links first, nodes on top. Only these carry handlers, so
    // each hover fires once.
    hitsG
      .append('g')
      .attr('class', 'link-hits')
      .selectAll('path')
      .data(layout.links)
      .enter()
      .append('path')
      .attr('data-testid', 'sankey-link-hit')
      .attr('data-source', (l) => l.source.id)
      .attr('data-target', (l) => l.target.id)
      .attr('d', (l) => linkPath(l))
      .attr('fill', 'none')
      .attr('stroke', 'transparent')
      .attr('stroke-width', (l) => Math.max(l.width, MIN_HIT))
      .attr('pointer-events', 'stroke')
      .on('mouseenter', (event, l) => {
        tooltipHandlers.current?.onMouseOver(event, linkDatum.get(l));
        highlightLink(l);
      })
      .on('mousemove', (event) => tooltipHandlers.current?.onMouseMove(event))
      .on('mouseleave', () => {
        tooltipHandlers.current?.onMouseLeave();
        clearHighlight();
      });
    const hitRect = (n: LayoutNode) => {
      const r = nodeRect(n);
      const w = Math.max(r.width, MIN_HIT);
      const h = Math.max(r.height, MIN_HIT);
      return { x: r.x - (w - r.width) / 2, y: r.y - (h - r.height) / 2, width: w, height: h };
    };
    hitsG
      .append('g')
      .attr('class', 'node-hits')
      .selectAll('rect')
      .data(layout.nodes)
      .enter()
      .append('rect')
      .attr('data-testid', 'sankey-node-hit')
      .attr('data-id', (n) => n.id)
      .attr('x', (n) => hitRect(n).x)
      .attr('y', (n) => hitRect(n).y)
      .attr('width', (n) => hitRect(n).width)
      .attr('height', (n) => hitRect(n).height)
      .attr('fill', 'transparent')
      .attr('pointer-events', 'all')
      .on('mouseenter', (event, n) => {
        tooltipHandlers.current?.onMouseOver(event, nodeDatum.get(n));
        highlightNode(n);
      })
      .on('mousemove', (event) => tooltipHandlers.current?.onMouseMove(event))
      .on('mouseleave', () => {
        tooltipHandlers.current?.onMouseLeave();
        clearHighlight();
      });
  }, [
    id,
    links,
    nodes,
    nodeDef,
    linkDef,
    align,
    nodeSort,
    iterations,
    orientation,
    labels,
    format,
    padding,
    margin,
    drawing,
  ]);

  useEffect(() => {
    refreshChart();
    // Hold the node: on unmount the cleanup runs after the svg has left the
    // document, so a lookup by id would find nothing to interrupt.
    const svg = select(`#${id}`).node();
    return () => {
      interruptTransitions(svg);
    };
    // style is not read by refreshChart, but it sets the size refreshChart measures.
  }, [refreshChart, id, style?.width, style?.height]);

  const titleId = title ? `${id}-title` : undefined;
  const descId = description ? `${id}-desc` : undefined;

  return (
    <svg
      id={id}
      style={style}
      className={twMerge(defaultChartClassNames, className)}
      role='img'
      aria-labelledby={titleId}
      aria-describedby={descId}
      aria-label={title ? undefined : ariaLabel ?? 'Sankey chart'}
      data-testid='sankey-chart'
    >
      {title ? <title id={titleId}>{title}</title> : null}
      {description ? <desc id={descId}>{description}</desc> : null}
      <g ref={plotRef} className='sankey-plot' />
    </svg>
  );
};

export default SankeyChart;
