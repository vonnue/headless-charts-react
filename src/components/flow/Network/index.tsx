import { axisBottom, axisLeft, axisRight, axisTop } from 'd3-axis';
import { defaultChartClassNames } from '@/utils';
import { twMerge } from 'tailwind-merge';
import { extent, max, min } from 'd3-array';
import {
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from 'd3-force';
import {
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
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { drag } from 'd3';
import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { zoom } from 'd3-zoom';

interface EdgeType {
  source?: string; // default endpoint keys; see edgeDef.sourceKey/targetKey
  target?: string;
  [key: string]: any;
}

interface SizeType<TData = any> {
  key?: Extract<keyof TData, string> | string;
  min?: number;
  max?: number;
  default?: number;
}

interface ShapeType<TData = any> {
  key?: Extract<keyof TData, string> | string;
  map?: {
    [key: string]:
      | 'circle'
      | 'diamond'
      | 'triangle'
      | 'square'
      | 'cross'
      | 'star'
      | 'wye';
  };
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
    classNameMap?: object; // Provide mapping for styling by this key
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
    size?: SizeType<any>;
    curve?: number;
    className?: string; // tailwindClass, Applies to all edges
    classNameKey?: string; // style by this key
    classNameMap?: object; // Provide mapping to style by this key
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

type TooltipHandler = (event: unknown, d: unknown) => void;
interface TooltipHandlers {
  overNode: TooltipHandler;
  moveNode: TooltipHandler;
  leaveNode: () => void;
  overEdge: TooltipHandler;
  moveEdge: TooltipHandler;
  leaveEdge: () => void;
}

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
    defaultHtml: (d: any) => `${d[nodeDef?.idKey]}`,
    id,
  });

  const {
    onMouseLeave: onMouseLeaveEdge,
    onMouseMove: onMouseMoveEdge,
    onMouseOver: onMouseOverEdge,
  } = useTooltip({
    tooltip: edgeDef?.tooltip,
    defaultHtml: (d: any) => {
      return `${d.source[nodeDef.idKey]} -> ${d.target[nodeDef.idKey]}`;
    },
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
    const svg = select(`#${id}`);

    svg.selectAll('*').remove();

    const g = svg.append('g');

    const width = +svg.style('width').split('px')[0],
      height = +svg.style('height').split('px')[0];

    const xScale =
      nodeDef?.x?.key &&
      scaleLinear()
        .range([
          (padding?.left || 0) + (margin?.left || 0),
          width - (margin?.right || 0) - (padding.right || 0),
        ])
        .domain(
          // @ts-ignore
          extent(nodes, (d: any) => d[nodeDef?.x?.key])
        );

    if (xScale && nodeDef?.x?.axis) {
      const xAxisFn =
        nodeDef?.x?.axis === 'top'
          ? axisTop(xScale).ticks(nodeDef?.x?.ticks || 5)
          : // @ts-ignore
            axisBottom(xScale).ticks(nodeDef?.x?.ticks || 5);

      g.append('g')
        .attr(
          'transform',
          `translate(0,${
            nodeDef?.x?.axis === 'top'
              ? margin.top ?? 0
              : height - (margin?.bottom || 0)
          })`
        )
        .attr('class', twMerge(nodeDef?.x?.className))
        .call(xAxisFn);
    }

    const yScale =
      nodeDef?.y?.key &&
      scaleLinear()
        .range([
          height - (padding?.bottom || 0) - (margin?.bottom || 0),
          (padding?.top || 0) + (margin?.top || 0),
        ])
        .domain(
          // @ts-ignore
          extent(nodes, (d: any) => d[nodeDef?.y?.key])
        );

    if (yScale && nodeDef?.y?.axis) {
      const yAxisFn =
        nodeDef?.y?.axis === 'right'
          ? axisRight(yScale).ticks(nodeDef?.y?.ticks || 5)
          : // @ts-ignore
            axisLeft(yScale).ticks(nodeDef?.y?.ticks || 5);

      // @ts-ignore

      g.append('g')
        .attr(
          'transform',
          `translate(${
            nodeDef?.y?.axis === 'right'
              ? width - (margin.right || 0)
              : margin?.left || 0
          },0)`
        )
        .call(yAxisFn);
    }
    // Do similar for x

    const ticked = () => {
      link.attr('d', (d: any) => {
        const x1 =
          nodeDef?.x?.key && xScale
            ? xScale(d.source[nodeDef?.x?.key])
            : d.source.x;
        const y1 =
          nodeDef?.y?.key && yScale
            ? yScale(d.source[nodeDef?.y?.key])
            : d.source.y;
        const x2 =
          nodeDef?.x?.key && xScale
            ? xScale(d.target[nodeDef?.x?.key])
            : d.target.x;
        const y2 =
          nodeDef?.y?.key && yScale
            ? yScale(d.target[nodeDef?.y?.key])
            : d.target.y;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const dr = distance * (edgeDef?.curve || 0);

        return `M${x1},${y1}A${dr},${dr} 0 0,1 ${x2},${y2}`;
      });

      node
        .attr('d', (d: any) => {
          return symbol(
            nodeDef?.shape?.map
              ? // @ts-ignore
                shapeMapping[nodeDef?.shape?.map[d[nodeDef?.shape.key]]]
              : symbolCircle,
            sizeScale
              ? // @ts-ignore
                sizeScale(d[nodeDef?.size?.key])
              : nodeDef?.size?.default || 75
          )();
        })
        .attr(
          'transform',
          (d: any) =>
            `translate(${
              nodeDef?.x?.key && xScale ? xScale(d[nodeDef?.x?.key]) : d.x
            },${nodeDef?.y?.key && yScale ? yScale(d[nodeDef?.y?.key]) : d.y})`
        );
    };

    // Copy edges with source/target read from the configured keys, so the
    // caller's edges (and their objects) are never mutated by forceLink.
    const sourceKey = edgeDef?.sourceKey || 'source';
    const targetKey = edgeDef?.targetKey || 'target';
    const links = edges.map((e: EdgeType) => ({
      ...e,
      source: e[sourceKey],
      target: e[targetKey],
    }));

    // @ts-ignore
    const simulation = forceSimulation(nodes)
      // Need to force links as edges
      .force(
        'link',
        // @ts-ignore
        forceLink(links).id((d) => d[nodeDef?.idKey])
      )
      // Need to force x so that disjointed nodes don't go out of screen
      .force('x', forceX())
      // Need to force y so that disjointed nodes don't go out of screen
      .force('y', forceY())
      // @ts-ignore
      .tick(ticked);

    simulation
      .force(`center`, forceCenter(width / 2, height / 2))
      .force('charge', forceManyBody().strength(-400));

    const strokeWidthScale =
      edgeDef?.size?.min &&
      edgeDef?.size?.max &&
      scaleLinear()
        .domain([
          min(edges, (d: any) =>
            edgeDef?.size?.key ? d[edgeDef?.size?.key] : 1
          ),
          max(edges, (d: any) =>
            edgeDef?.size?.key ? d[edgeDef?.size.key] : 1
          ),
        ])
        .range([edgeDef?.size.min, edgeDef?.size.max]);

    const link = g
      .append('g')
      .selectAll('line')
      .data(links)
      .join('path')
      .attr('class', (d: any) =>
        twMerge(
          'stroke-black fill-none',
          edgeDef?.className,
          edgeDef?.classNameKey &&
            edgeDef?.classNameMap && // @ts-ignore
            edgeDef?.classNameMap[d[edgeDef?.classNameKey]],
          d.className
        )
      )
      .attr('stroke-width', (d: any) =>
        strokeWidthScale
          ? // @ts-ignore
            strokeWidthScale(d[edgeDef?.size?.key])
          : edgeDef?.size?.default || 1
      );

    const sizeScale =
      nodeDef?.size &&
      nodeDef?.size.min &&
      nodeDef?.size.max &&
      scaleLinear()
        .domain([
          min(nodes, (d: any) =>
            nodeDef?.size?.key ? d[nodeDef?.size?.key] : 1
          ),
          max(nodes, (d: any) =>
            nodeDef?.size?.key ? d[nodeDef?.size.key] : 1
          ),
        ])
        .range([nodeDef?.size.min, nodeDef?.size.max]);

    const shapeMapping: any = {
      circle: symbolCircle,
      diamond: symbolDiamond,
      triangle: symbolTriangle,
      square: symbolSquare,
      cross: symbolCross,
      star: symbolStar,
      wye: symbolWye,
    };

    const node = g
      .append('g')
      .selectAll('circle')
      .data(nodes)
      .join('path')
      .attr('class', (d: any) =>
        twMerge(
          'fill-black stroke-none',
          d.className,
          nodeDef?.className,
          nodeDef?.classNameKey &&
            nodeDef?.classNameMap && // @ts-ignore
            nodeDef?.classNameMap[d[nodeDef?.classNameKey]]
        )
      );

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
      node.call(
        // @ts-ignore
        drag().on('start', dragstarted).on('drag', dragged).on('end', dragended)
      );
    }

    simulation.on('tick', ticked);

    // Reheat the simulation when drag starts, and fix the subject position.
    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    // Update the subject (dragged node) position during drag.
    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    // Restore the target alpha so the simulation cools after dragging ends.
    // Unfix the subject position now that it’s no longer being dragged.
    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = dragging.snapToNewPosition ? event.x : null;
      event.subject.fy = dragging.snapToNewPosition ? event.y : null;
    }

    if (zooming?.enabled) {
      const zoomed = ({ transform }: any) => {
        g.attr('transform', transform);
      };

      const zoomFn =
        zooming?.min &&
        zooming?.max &&
        zoom()
          .scaleExtent([zooming.min, zooming.max])
          .translateExtent([
            [0, 0],
            [width, height],
          ])
          .on('zoom', zoomed);
      // @ts-ignore
      svg.call(zoomFn);
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
