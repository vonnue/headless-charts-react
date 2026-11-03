import { axisBottom, axisLeft, axisRight, axisTop } from 'd3-axis';
import { defaultChartClassNames } from '@/utils';
import { twMerge } from 'tailwind-merge';
import { extent, max, min } from 'd3-array';
import {
  Simulation,
  SimulationLinkDatum,
  SimulationNodeDatum,
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from 'd3-force';
import {
  SymbolType,
  symbol,
  symbolCircle,
  symbolCross,
  symbolDiamond,
  symbolSquare,
  symbolStar,
  symbolTriangle,
  symbolWye,
} from 'd3-shape';
import useTooltip from '@/hooks/useTooltip';

import { ChartProps, TooltipConfig } from '@/types';
import { D3DragEvent, drag } from 'd3';
import { ScaleLinear, scaleLinear } from 'd3-scale';
import { Selection, select } from 'd3-selection';
import { D3ZoomEvent, ZoomBehavior, zoom } from 'd3-zoom';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

interface EdgeType {
  source?: string; // default endpoint keys; see edgeDef.sourceKey/targetKey
  target?: string;
  [key: string]: unknown;
}

interface SizeType<TData = any> {
  key?: Extract<keyof TData, string> | string;
  min?: number;
  max?: number;
  default?: number;
}

export type NetworkShape =
  | 'circle'
  | 'diamond'
  | 'triangle'
  | 'square'
  | 'cross'
  | 'star'
  | 'wye';

interface ShapeType<TData = any> {
  key?: Extract<keyof TData, string> | string;
  map?: Record<string, NetworkShape>;
  default?: string;
}

/**
 * Props for Network.
 *
 * Performance: the graph redraws (and restarts its simulation) whenever `id`,
 * `nodes`, `edges`, `nodeDef`, `edgeDef`, `padding`, `margin`, `dragging` or
 * `zooming` change by reference. Hoist them to module scope or wrap them in
 * `useMemo`; inline literals are new on every parent render.
 */
export interface NetworkProps<TData = any> extends ChartProps<TData> {
  id: string;
  className?: string;
  nodes: TData[]; // Data of actual nodes
  edges: Array<EdgeType>; // Data of edges connecting the nodes
  dragging?: {
    enabled?: boolean;
    snapToNewPosition?: boolean;
  };
  zooming?: {
    enabled?: boolean;
    min?: number;
    max?: number;
  };
  nodeDef: {
    idKey: Extract<keyof TData, string> | string;
    weightKey?: Extract<keyof TData, string> | string;
    className?: string; // tailwindClass, Applies to all nodes
    classNameKey?: Extract<keyof TData, string> | string; // Style by this key
    classNameMap?: Record<string, string>; // Provide mapping for styling by this key
    x?: {
      key: Extract<keyof TData, string> | string;
      ticks?: number;
      axis?: 'top' | 'bottom';
      className?: string;
    };
    y?: {
      key: Extract<keyof TData, string> | string;
      ticks?: number;
      axis?: 'left' | 'right';
    };
    size?: SizeType<TData>;
    tooltip?: TooltipConfig;
    shape?: ShapeType<TData>;
  };
  edgeDef: {
    sourceKey?: string; // default 'source'
    targetKey?: string; // default 'target'
    size?: SizeType<EdgeType>;
    curve?: number;
    className?: string; // tailwindClass, Applies to all edges
    classNameKey?: string; // style by this key
    classNameMap?: Record<string, string>; // Provide mapping to style by this key
    tooltip?: TooltipConfig;
  };
}

// Module-level defaults keep the refresh deps stable when a prop is omitted;
// inline default literals would be new on every render and force a redraw.
const DEFAULT_DRAGGING: NonNullable<NetworkProps['dragging']> = {
  enabled: false,
  snapToNewPosition: false,
};
const DEFAULT_SPACING = { top: 30, right: 30, bottom: 30, left: 30 };
const DEFAULT_NODE_DEF: NetworkProps['nodeDef'] = { idKey: 'id' };
const DEFAULT_EDGE_DEF: NetworkProps['edgeDef'] = {
  sourceKey: 'source',
  targetKey: 'target',
};
const DEFAULT_ZOOMING: NonNullable<NetworkProps['zooming']> = {};

const SHAPES: Record<NetworkShape, SymbolType> = {
  circle: symbolCircle,
  diamond: symbolDiamond,
  triangle: symbolTriangle,
  square: symbolSquare,
  cross: symbolCross,
  star: symbolStar,
  wye: symbolWye,
};

type TooltipHandler = (event: unknown, d: unknown) => void;
interface TooltipHandlers {
  overNode: TooltipHandler;
  moveNode: TooltipHandler;
  leaveNode: () => void;
  overEdge: TooltipHandler;
  moveEdge: TooltipHandler;
  leaveEdge: () => void;
}

interface NodeDatum extends SimulationNodeDatum {
  className?: string;
  [key: string]: unknown;
}

interface LinkDatum extends SimulationLinkDatum<NodeDatum> {
  className?: string;
  [key: string]: unknown;
}

type Spacing = NonNullable<NetworkProps['padding']>;
type NodeDef = NetworkProps['nodeDef'];
type EdgeDef = NetworkProps['edgeDef'];
type Scale = ScaleLinear<number, number>;
type RootSelection = Selection<SVGGElement, unknown, HTMLElement, unknown>;
type SvgSelection = Selection<SVGSVGElement, unknown, HTMLElement, unknown>;
type NodeSelection = Selection<SVGPathElement, NodeDatum, SVGGElement, unknown>;
type LinkSelection = Selection<SVGPathElement, LinkDatum, SVGGElement, unknown>;

/**
 * Reads a numeric field from a datum. The assertion only informs the type
 * checker: values pass to d3 as-is, which coerces them like before. A missing
 * key reads `d['undefined']`, as the untyped code did.
 */
const field = (d: Record<string, unknown>, key?: string): number =>
  d[key as string] as number;

/** forceLink replaces each link's source/target id with its node on init. */
const endpoint = (n: LinkDatum['source']): NodeDatum => n as NodeDatum;

const buildScales = (
  nodes: NodeDatum[],
  nodeDef: NodeDef,
  width: number,
  height: number,
  padding: Spacing,
  margin: Spacing
): { xScale?: Scale; yScale?: Scale } => {
  const xKey = nodeDef?.x?.key;
  const yKey = nodeDef?.y?.key;
  const [x0 = NaN, x1 = NaN] = xKey ? extent(nodes, (d) => field(d, xKey)) : [];
  const [y0 = NaN, y1 = NaN] = yKey ? extent(nodes, (d) => field(d, yKey)) : [];

  const xScale = xKey
    ? scaleLinear()
        .range([
          (padding?.left || 0) + (margin?.left || 0),
          width - (margin?.right || 0) - (padding.right || 0),
        ])
        .domain([x0, x1])
    : undefined;

  const yScale = yKey
    ? scaleLinear()
        .range([
          height - (padding?.bottom || 0) - (margin?.bottom || 0),
          (padding?.top || 0) + (margin?.top || 0),
        ])
        .domain([y0, y1])
    : undefined;

  return { xScale, yScale };
};

const drawAxes = (
  g: RootSelection,
  { xScale, yScale }: { xScale?: Scale; yScale?: Scale },
  nodeDef: NodeDef,
  width: number,
  height: number,
  margin: Spacing
) => {
  if (xScale && nodeDef?.x?.axis) {
    const ticks = nodeDef?.x?.ticks || 5;
    const xAxisFn =
      nodeDef.x.axis === 'top'
        ? axisTop(xScale).ticks(ticks)
        : axisBottom(xScale).ticks(ticks);

    g.append('g')
      .attr(
        'transform',
        `translate(0,${
          nodeDef.x.axis === 'top'
            ? margin.top ?? 0
            : height - (margin?.bottom || 0)
        })`
      )
      .attr('class', twMerge(nodeDef?.x?.className))
      .call(xAxisFn);
  }

  if (yScale && nodeDef?.y?.axis) {
    const ticks = nodeDef?.y?.ticks || 5;
    const yAxisFn =
      nodeDef.y.axis === 'right'
        ? axisRight(yScale).ticks(ticks)
        : axisLeft(yScale).ticks(ticks);

    g.append('g')
      .attr(
        'transform',
        `translate(${
          nodeDef.y.axis === 'right'
            ? width - (margin.right || 0)
            : margin?.left || 0
        },0)`
      )
      .call(yAxisFn);
  }
};

/**
 * Copies edges with source/target read from the configured keys, so the
 * caller's edges (and their objects) are never mutated by forceLink.
 */
const toLinks = (edges: EdgeType[], edgeDef: EdgeDef): LinkDatum[] => {
  const sourceKey = edgeDef?.sourceKey || 'source';
  const targetKey = edgeDef?.targetKey || 'target';
  return edges.map((e) => ({
    ...e,
    source: e[sourceKey] as string,
    target: e[targetKey] as string,
  }));
};

const createSimulation = (
  nodes: NodeDatum[],
  links: LinkDatum[],
  idKey: string,
  width: number,
  height: number
): Simulation<NodeDatum, LinkDatum> =>
  forceSimulation<NodeDatum, LinkDatum>(nodes)
    // Need to force links as edges
    .force(
      'link',
      forceLink<NodeDatum, LinkDatum>(links).id((d) => d[idKey] as string)
    )
    // Need to force x so that disjointed nodes don't go out of screen
    .force('x', forceX())
    // Need to force y so that disjointed nodes don't go out of screen
    .force('y', forceY())
    .force(`center`, forceCenter(width / 2, height / 2))
    .force('charge', forceManyBody().strength(-400));

const drawEdges = (
  g: RootSelection,
  links: LinkDatum[],
  edges: EdgeType[],
  edgeDef: EdgeDef
): LinkSelection => {
  const size = edgeDef?.size;
  const strokeWidthScale =
    size?.min && size?.max
      ? scaleLinear()
          .domain([
            min(edges, (d) => (size.key ? field(d, size.key) : 1)) ?? NaN,
            max(edges, (d) => (size.key ? field(d, size.key) : 1)) ?? NaN,
          ])
          .range([size.min, size.max])
      : undefined;

  return g
    .append('g')
    .selectAll<SVGPathElement, LinkDatum>('line')
    .data(links)
    .join('path')
    .attr('class', (d) =>
      twMerge(
        'stroke-black fill-none',
        edgeDef?.className,
        edgeDef?.classNameKey &&
          edgeDef?.classNameMap?.[String(d[edgeDef.classNameKey])],
        d.className
      )
    )
    .attr('stroke-width', (d) =>
      strokeWidthScale
        ? strokeWidthScale(field(d, size?.key))
        : size?.default || 1
    );
};

const drawNodes = (
  g: RootSelection,
  nodes: NodeDatum[],
  nodeDef: NodeDef
): NodeSelection =>
  g
    .append('g')
    .selectAll<SVGPathElement, NodeDatum>('circle')
    .data(nodes)
    .join('path')
    .attr('class', (d) =>
      twMerge(
        'fill-black stroke-none',
        d.className,
        nodeDef?.className,
        nodeDef?.classNameKey &&
          nodeDef?.classNameMap?.[String(d[nodeDef.classNameKey])]
      )
    );

/** Returns the tick handler that positions edges and nodes. */
const makeTicked = (
  link: LinkSelection,
  node: NodeSelection,
  nodes: NodeDatum[],
  { xScale, yScale }: { xScale?: Scale; yScale?: Scale },
  nodeDef: NodeDef,
  edgeDef: EdgeDef
) => {
  const xKey = nodeDef?.x?.key;
  const yKey = nodeDef?.y?.key;
  const posX = (n: NodeDatum) => (xKey && xScale ? xScale(field(n, xKey)) : n.x);
  const posY = (n: NodeDatum) => (yKey && yScale ? yScale(field(n, yKey)) : n.y);

  const size = nodeDef?.size;
  const sizeScale =
    size && size.min && size.max
      ? scaleLinear()
          .domain([
            min(nodes, (d) => (size.key ? field(d, size.key) : 1)) ?? NaN,
            max(nodes, (d) => (size.key ? field(d, size.key) : 1)) ?? NaN,
          ])
          .range([size.min, size.max])
      : undefined;
  const shape = nodeDef?.shape;

  return () => {
    link.attr('d', (d) => {
      const x1 = posX(endpoint(d.source));
      const y1 = posY(endpoint(d.source));
      const x2 = posX(endpoint(d.target));
      const y2 = posY(endpoint(d.target));

      // x/y are always set once the simulation has initialised the nodes
      const dx = (x2 as number) - (x1 as number);
      const dy = (y2 as number) - (y1 as number);
      const distance = Math.sqrt(dx * dx + dy * dy);

      const dr = distance * (edgeDef?.curve || 0);

      return `M${x1},${y1}A${dr},${dr} 0 0,1 ${x2},${y2}`;
    });

    node
      .attr('d', (d) =>
        symbol(
          // An unmapped value falls back to a circle, as d3's symbol() does.
          shape?.map
            ? SHAPES[shape.map[String(d[shape.key as string])]] ?? symbolCircle
            : symbolCircle,
          sizeScale ? sizeScale(field(d, size?.key)) : size?.default || 75
        )()
      )
      .attr('transform', (d) => `translate(${posX(d)},${posY(d)})`);
  };
};

const attachDrag = (
  node: NodeSelection,
  simulation: Simulation<NodeDatum, LinkDatum>,
  snapToNewPosition?: boolean
) => {
  type DragEvent = D3DragEvent<SVGPathElement, NodeDatum, NodeDatum>;

  node.call(
    drag<SVGPathElement, NodeDatum>()
      // Reheat the simulation when drag starts, and fix the subject position.
      .on('start', (event: DragEvent) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      })
      // Update the subject (dragged node) position during drag.
      .on('drag', (event: DragEvent) => {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      })
      // Restore the target alpha so the simulation cools after dragging ends.
      // Unfix the subject position now that it’s no longer being dragged.
      .on('end', (event: DragEvent) => {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = snapToNewPosition ? event.x : null;
        event.subject.fy = snapToNewPosition ? event.y : null;
      })
  );
};

const attachZoom = (
  svg: SvgSelection,
  g: RootSelection,
  zooming: NonNullable<NetworkProps['zooming']>,
  width: number,
  height: number
) => {
  // Kept as before: without both bounds zoomFn is falsy, and svg.call() throws
  // on it. The cast only narrows the type; the value passes through unchanged.
  const zoomFn =
    zooming.min &&
    zooming.max &&
    zoom<SVGSVGElement, unknown>()
      .scaleExtent([zooming.min, zooming.max])
      .translateExtent([
        [0, 0],
        [width, height],
      ])
      .on('zoom', ({ transform }: D3ZoomEvent<SVGSVGElement, unknown>) => {
        g.attr('transform', transform.toString());
      });
  svg.call(zoomFn as ZoomBehavior<SVGSVGElement, unknown>);
};

/* catalog:start */
/**
 * Draws nodes and the edges between them, laid out by force simulation or
 * pinned to x/y scales.
 *
 * @remarks
 *
 * **Use when**
 * - The relationships between entities are the subject, not the entities’
 *   values
 * - Clusters, hubs or isolated nodes should emerge from the layout
 * - Nodes should be positioned by real measures rather than the simulation —
 *   set `nodeDef.x` and `nodeDef.y`
 * - The graph is small enough to be explored interactively — enable
 *   `dragging` and `zooming`
 *
 * **Avoid when**
 * - The relationships are strictly hierarchical — a tree layout communicates
 *   depth better than a force graph
 * - The data has no explicit edges; a network cannot be inferred from
 *   records alone
 * - Node values are the real question — use BarChart or ScatterPlot
 * - The graph is dense enough to become a hairball — aggregate or filter
 *   first
 *
 * Also called: network graph, node-link diagram, force-directed graph, graph chart, relationship map.
 *
 * Answers: connection. Required props: `id`, `nodes`, `edges`, `nodeDef`, `edgeDef`.
 *
 * @example
 * ```tsx
 * <Network
 *   id="team-graph"
 *   className="w-full h-96"
 *   nodes={nodes}
 *   edges={edges}
 *   nodeDef={{ idKey: 'name' }}
 *   edgeDef={{ sourceKey: 'from', targetKey: 'to' }}
 * />
 * ```
 *
 * @see ScatterPlot — entities have two measures and no meaningful links
 * @see WaffleChart — the relationships form a matrix better read as a
 *   heatmap
 */
/* catalog:end */
const Network = <TData = any,>({
  id,
  className,
  nodes,
  edges,
  dragging = DEFAULT_DRAGGING,
  padding = DEFAULT_SPACING,
  margin = DEFAULT_SPACING,
  nodeDef = DEFAULT_NODE_DEF,
  edgeDef = DEFAULT_EDGE_DEF,
  zooming = DEFAULT_ZOOMING,
  ...props
}: NetworkProps<TData>) => {
  // Top-level hook calls (Rules of Hooks). Both share `id`, so the second
  // adopts the element the first creates: one #tooltip-${id} per chart.
  const {
    onMouseLeave: onMouseLeaveNode,
    onMouseMove: onMouseMoveNode,
    onMouseOver: onMouseOverNode,
  } = useTooltip({
    tooltip: nodeDef?.tooltip,
    defaultHtml: (d: NodeDatum) => `${d[nodeDef?.idKey]}`,
    id,
  });

  const {
    onMouseLeave: onMouseLeaveEdge,
    onMouseMove: onMouseMoveEdge,
    onMouseOver: onMouseOverEdge,
  } = useTooltip({
    tooltip: edgeDef?.tooltip,
    defaultHtml: (d: LinkDatum) =>
      `${endpoint(d.source)[nodeDef.idKey]} -> ${endpoint(d.target)[nodeDef.idKey]}`,
    id,
  });

  // The hook handlers are new each render but read the latest config, so the
  // d3 listeners call them through a ref instead of making them redraw deps.
  const tooltipHandlers = useRef<TooltipHandlers | null>(null);
  useLayoutEffect(() => {
    tooltipHandlers.current = {
      overNode: onMouseOverNode,
      moveNode: onMouseMoveNode,
      leaveNode: onMouseLeaveNode,
      overEdge: onMouseOverEdge,
      moveEdge: onMouseMoveEdge,
      leaveEdge: onMouseLeaveEdge,
    };
  });

  // Redraws from scratch whenever a drawing input changes, and returns the
  // simulation so the effect can stop it before the next draw and on unmount.
  const refreshChart = useCallback(() => {
    const svg: SvgSelection = select<SVGSVGElement, unknown>(`#${id}`);
    svg.selectAll('*').remove();
    const g: RootSelection = svg.append('g');

    const width = +svg.style('width').split('px')[0],
      height = +svg.style('height').split('px')[0];

    // d3-force adds x/y/vx/vy to the caller's node objects, as it always has;
    // TData is unconstrained, so the nodes are viewed as simulation nodes.
    const simNodes = nodes as unknown as NodeDatum[];

    const scales = buildScales(simNodes, nodeDef, width, height, padding, margin);
    drawAxes(g, scales, nodeDef, width, height, margin);

    const links = toLinks(edges, edgeDef);
    const simulation = createSimulation(simNodes, links, nodeDef?.idKey, width, height);

    const link = drawEdges(g, links, edges, edgeDef);
    const node = drawNodes(g, simNodes, nodeDef);

    if (nodeDef?.tooltip) {
      node
        .on('mouseover', (e, d) => tooltipHandlers.current?.overNode(e, d))
        .on('mousemove', (e, d) => tooltipHandlers.current?.moveNode(e, d))
        .on('mouseleave', () => tooltipHandlers.current?.leaveNode());
    }

    if (edgeDef?.tooltip) {
      link
        .on('mouseover', (e, d) => tooltipHandlers.current?.overEdge(e, d))
        .on('mousemove', (e, d) => tooltipHandlers.current?.moveEdge(e, d))
        .on('mouseleave', () => tooltipHandlers.current?.leaveEdge());
    }

    if (dragging.enabled) {
      attachDrag(node, simulation, dragging.snapToNewPosition);
    }

    simulation.on(
      'tick',
      makeTicked(link, node, simNodes, scales, nodeDef, edgeDef)
    );

    if (zooming?.enabled) {
      attachZoom(svg, g, zooming, width, height);
    }

    return simulation;
  }, [id, nodes, edges, nodeDef, edgeDef, padding, margin, dragging, zooming]);

  useEffect(() => {
    const simulation = refreshChart();
    return () => {
      simulation.stop();
    };
  }, [refreshChart]);

  return (
    <svg
      className={twMerge(defaultChartClassNames, className)}
      id={id}
      {...props}
    />
  );
};

export default Network;
