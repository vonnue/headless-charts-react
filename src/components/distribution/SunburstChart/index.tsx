import { HierarchyRectangularNode, partition } from 'd3-hierarchy';
import { interpolateNumber } from 'd3-interpolate';
import { Selection, select } from 'd3-selection';
import { arc as d3arc } from 'd3-shape';
import 'd3-transition';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { twMerge } from 'tailwind-merge';

import useTooltip from '@/hooks/useTooltip';
import { ChartProps } from '@/types';
import { defaultChartClassNames } from '@/utils';
import { isFiniteNumber } from '@/utils/domain';
import measureSvg from '@/utils/measureSvg';
import { warnOnceInDev } from '@/utils/devEnvironment';
import {
  HierarchyDatum,
  HierarchyFields,
  buildHierarchy,
  colorKey,
  defaultHierarchyTooltipHtml,
  formatPercent,
  isSyntheticRoot,
  labelOption,
  percentOf,
  percentOption,
  toHierarchyDatum,
} from '@/utils/hierarchy';

export type { HierarchyDatum, HierarchyFields } from '@/utils/hierarchy';

/** Treemap's minWidth/minHeight are rectangular; Sunburst swaps them for arc gates. */
type BaseLabels = Omit<NonNullable<HierarchyFields['labels']>, 'minWidth' | 'minHeight'>;

// `any` default matches ChartProps<TData = any> and the other charts' props.
export interface SunburstChartProps<TData = any> // eslint-disable-line @typescript-eslint/no-explicit-any
  extends Omit<ChartProps<TData>, 'data' | 'zooming'>,
    Omit<HierarchyFields<TData>, 'labels'> {
  labels?: BaseLabels & {
    /** Hide a label when its arc length at mid-radius is below this, in px. Default `14`. */
    minArcLength?: number;
    /** Hide a label when its ring is thinner than this, in px. Default `24`. */
    minThickness?: number;
  };
  /**
   * Donut hole as a fraction of the outer radius, `[0, 0.9]`. Default `0`.
   * `0` paints the focus node as a centre disc; `> 0` has no disc and rings
   * start at this radius.
   */
  innerRadius?: number;
  /**
   * How many ring levels are drawn outward from the focus. Default: all.
   * Deeper nodes still exist and appear when zoomed in (unlike `maxDepth`,
   * which rolls deeper mass into an ancestor).
   */
  rings?: number;
  /** Radians, clockwise from 12 o'clock. Default `0`. */
  startAngle?: number;
  /** Radians, clockwise from 12 o'clock. Default `2π`. */
  endAngle?: number;
  arc?: {
    /** Angular gap between siblings, in radians. Default `0.005`. */
    padAngle?: number;
    /** Radial gap between rings, in px. Default `1`. */
    ringGap?: number;
    /** Default `0`. */
    cornerRadius?: number;
  };
  /** Default `true`. Hover sets `data-highlighted` on the node and its ancestors and `data-dimmed` on the rest. */
  highlight?: boolean;
  /** Click-to-zoom. Default `false`. */
  zoom?:
    | boolean
    | {
        /** Fired after each focus change. `null` = the top level (the real root, or the forest). */
        onChange?: (focus: HierarchyDatum<TData> | null) => void;
      };
}

type TooltipHandlers = Pick<
  ReturnType<typeof useTooltip>,
  'onMouseOver' | 'onMouseMove' | 'onMouseLeave'
>;
type Node = Record<PropertyKey, unknown>;
type PNode = HierarchyRectangularNode<Node>;

const TAU = 2 * Math.PI;
const DEFAULT_STYLE = {};
const DEFAULT_DRAWING = { duration: 0 };
const DEFAULT_ZOOM_DURATION = 750;
const DEFAULT_PAD_ANGLE = 0.005;
const DEFAULT_RING_GAP = 1;
const MAX_INNER_RADIUS = 0.9;
/** Minimum hit-area arc length at mid-radius, in px. */
const MIN_HIT_ARC_PX = 8;
/** Label text width estimate per character (no layout in jsdom/SSR). */
const CHAR_PX = 6;
/** Space kept clear at each end of a radial label. */
const LABEL_PAD_PX = 2;

/** Mapping from partition coordinates to the screen for one focus. */
interface View {
  x0: number;
  x1: number;
  /** Depth of the focus node (continuous while tweening). */
  base: number;
  /** Ring thickness. */
  t: number;
  /** Inner radius of ring 1. */
  off: number;
}

const pathKey = (path: readonly string[]) => JSON.stringify(path);

/** Truncates `text` with `…` to fit `px` at `CHAR_PX` per character. */
const fitText = (text: string, px: number): string => {
  const max = Math.floor(px / CHAR_PX);
  if (max <= 0) return '';
  return text.length <= max ? text : max === 1 ? '…' : `${text.slice(0, max - 1)}…`;
};

/* catalog:start */
/**
 * Concentric rings for a hierarchical part-to-whole: each depth is a ring and
 * each node’s angle encodes its value, from the root at the centre to the
 * leaves.
 *
 * @remarks
 *
 * **Use when**
 * - A hierarchical part-to-whole with 2–4 levels, where the path from the
 *   centre outward is the story
 * - Readers should drill down into deeper levels — set `zoom`
 *
 * **Avoid when**
 * - Sizes of many leaves must be compared precisely — use TreemapChart; area
 *   reads better than angle
 * - A flat whole with about 6 or fewer parts — use PieChart
 * - One entity's metrics on a radial profile — use PizzaChart
 * - Composition changes over time — use AreaChart
 *
 * Also called: sunburst, sunburst chart, sunburst diagram, radial treemap, multi-level pie chart.
 *
 * Answers: composition. Required props: `id`, `data`, `value`.
 *
 * @example
 * ```tsx
 * <SunburstChart
 *   id="files"
 *   className="w-full h-96"
 *   data={tree}
 *   value={{ key: 'size', className: 'fill-slate-300 stroke-white' }}
 *   classNameMap={{ src: 'fill-sky-400', docs: 'fill-amber-300' }}
 *   labels={{ name: true }}
 * />
 * ```
 *
 * @see PieChart — a flat part-to-whole with few slices
 */
/* catalog:end */
const SunburstChart = <TData = any,>({ // eslint-disable-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
  data,
  id,
  className,
  children,
  value,
  name,
  sort = true,
  maxDepth,
  classNameMap,
  colorBy = 'top',
  labels,
  innerRadius = 0,
  rings,
  startAngle,
  endAngle,
  arc,
  highlight = true,
  zoom = false,
  padding,
  margin,
  drawing = DEFAULT_DRAWING,
  tooltip,
  title,
  description,
  ariaLabel,
  style = DEFAULT_STYLE,
}: SunburstChartProps<TData>) => {
  const plotRef = useRef<SVGGElement>(null);
  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: defaultHierarchyTooltipHtml,
  });

  // The hook handlers are new each render but read the latest config, so the
  // d3 listeners call them through a ref instead of making them redraw deps.
  const tooltipHandlers = useRef<TooltipHandlers | null>(null);
  // Same for zoom.onChange, so an inline `zoom={{ onChange }}` doesn't redraw.
  const onZoomChange = useRef<((f: HierarchyDatum<TData> | null) => void) | undefined>(
    undefined
  );
  useLayoutEffect(() => {
    tooltipHandlers.current = { onMouseOver, onMouseMove, onMouseLeave };
    onZoomChange.current = typeof zoom === 'object' ? zoom.onChange : undefined;
  });

  /** Focus path (names, synthetic root excluded); `null` = top level. Uncontrolled. */
  const focusPath = useRef<string[] | null>(null);
  /** Zoom out one level; set by refreshChart, used by the svg's Escape handler. */
  const zoomOutRef = useRef<(() => void) | null>(null);
  const zoomEnabled = !!zoom;

  const refreshChart = useCallback(() => {
    if (!plotRef.current) return;
    const svgNode = plotRef.current.ownerSVGElement;
    const root = select(plotRef.current);
    root.interrupt('zoom');
    root.selectAll('*').interrupt();
    root.selectAll('*').remove();
    zoomOutRef.current = null;

    const nameKey = name?.key ?? 'name';
    const built = buildHierarchy({
      data,
      childrenKey: children?.key ?? 'children',
      valueKey: value.key,
      nameKey,
      sort,
      maxDepth,
    });
    if (!built) {
      if (focusPath.current !== null) {
        focusPath.current = null;
        onZoomChange.current?.(null);
      }
      return;
    }
    if (built.invalidLeaf)
      warnOnceInDev(
        `SunburstChart#${id}:value`,
        `SunburstChart#${id}: negative or non-numeric leaf values for value.key "${value.key}" are counted as 0 and not painted.`
      );
    if (colorBy === 'value')
      warnOnceInDev(
        `SunburstChart#${id}:colorBy`,
        `SunburstChart#${id}: colorBy "value" is reserved and ignored; colour names groups, angle encodes magnitude. Using "top".`
      );
    const colorMode = colorBy === 'value' ? 'top' : colorBy;

    // --- validated geometry props
    let a0 = 0,
      a1 = TAU;
    if (startAngle !== undefined || endAngle !== undefined) {
      const s = startAngle ?? 0,
        e = endAngle ?? TAU;
      if (!isFiniteNumber(s) || !isFiniteNumber(e) || e <= s)
        warnOnceInDev(
          `SunburstChart#${id}:angles`,
          `SunburstChart#${id}: startAngle/endAngle must be finite with end > start; using 0 and 2π.`
        );
      else {
        a0 = s;
        a1 = s + Math.min(e - s, TAU);
      }
    }
    let hole = 0;
    if (!isFiniteNumber(innerRadius)) {
      warnOnceInDev(
        `SunburstChart#${id}:innerRadius`,
        `SunburstChart#${id}: innerRadius must be a finite fraction in [0, 0.9]; using 0.`
      );
    } else if (innerRadius < 0 || innerRadius > MAX_INNER_RADIUS) {
      hole = Math.min(MAX_INNER_RADIUS, Math.max(0, innerRadius));
      warnOnceInDev(
        `SunburstChart#${id}:innerRadius`,
        `SunburstChart#${id}: innerRadius ${innerRadius} is outside [0, 0.9]; clamped to ${hole}.`
      );
    } else hole = innerRadius;
    const donut = hole > 0;
    let ringLimit = Infinity;
    if (rings !== undefined) {
      if (isFiniteNumber(rings) && rings >= 1) ringLimit = Math.floor(rings);
      else
        warnOnceInDev(
          `SunburstChart#${id}:rings`,
          `SunburstChart#${id}: rings must be a finite number >= 1; showing all levels.`
        );
    }
    const padAngle = isFiniteNumber(arc?.padAngle) && arc.padAngle >= 0 ? arc.padAngle : DEFAULT_PAD_ANGLE;
    const ringGap = isFiniteNumber(arc?.ringGap) && arc.ringGap >= 0 ? arc.ringGap : DEFAULT_RING_GAP;
    const cornerRadius = isFiniteNumber(arc?.cornerRadius) && arc.cornerRadius >= 0 ? arc.cornerRadius : 0;

    // --- plot
    const m = { top: 0, right: 0, bottom: 0, left: 0, ...margin };
    const p = { top: 0, right: 0, bottom: 0, left: 0, ...padding };
    const { width, height } = measureSvg(svgNode);
    const plotW = Math.max(0, width - m.left - m.right - p.left - p.right);
    const plotH = Math.max(0, height - m.top - m.bottom - p.top - p.bottom);
    const cx = m.left + p.left + plotW / 2,
      cy = m.top + p.top + plotH / 2;
    const R = Math.min(plotW, plotH) / 2;

    const layout = partition<Node>().size([1, 1])(built.root) as PNode;
    const all = layout.descendants();
    const datumOf = new Map<PNode, HierarchyDatum<TData>>(
      all.map((n) => [n, toHierarchyDatum<TData>(n, nameKey)])
    );
    const pathOf = (n: PNode) => datumOf.get(n)!.path;
    const positive = (n: PNode) => (n.value ?? 0) > 0 && n.x1 > n.x0;

    // Restore the focus by path (first match with a positive value), else reset.
    let focus: PNode = layout;
    if (focusPath.current !== null) {
      const key = pathKey(focusPath.current);
      const found = all.find((n) => !isSyntheticRoot(n) && positive(n) && pathKey(pathOf(n)) === key);
      if (found) focus = found;
      else {
        focusPath.current = null;
        onZoomChange.current?.(null);
      }
    }
    const isTop = (n: PNode) => n === layout;

    // --- labels config
    const nameOpt = labelOption(labels?.name);
    const valueOpt = labelOption(labels?.value);
    const pctOpt = percentOption(labels?.percent);
    const minArcLength = labels?.minArcLength ?? 14;
    const minThickness = labels?.minThickness ?? 24;
    const labelText = (n: PNode, i: number): string => {
      const d = datumOf.get(n)!;
      const parts: string[] = [];
      if (nameOpt) parts.push(nameOpt.format ? nameOpt.format(d.name, d, i) : d.name);
      if (valueOpt) parts.push(valueOpt.format ? valueOpt.format(d.value, d, i) : String(d.value));
      pctOpt?.kinds.forEach((kind) =>
        parts.push(
          pctOpt.format ? pctOpt.format(percentOf(d, kind), kind, d, i) : formatPercent(percentOf(d, kind))
        )
      );
      return parts.join(' ');
    };

    const markClass = (n: PNode) => {
      const key = colorKey(n, colorMode, nameKey);
      return twMerge(
        'fill-current',
        (classNameMap && Object.prototype.hasOwnProperty.call(classNameMap, key)
          ? classNameMap[key]
          : value.className) || ''
      );
    };

    const body = root.append('g').attr('class', 'sunburst-body').attr('transform', `translate(${cx},${cy})`);

    /** Visible levels below `f` (capped by `rings` and the deepest positive level). */
    const levelsBelow = (f: PNode) => {
      let deepest = f.depth;
      f.each((n) => {
        if (positive(n as PNode)) deepest = Math.max(deepest, n.depth);
      });
      return Math.min(ringLimit, deepest - f.depth);
    };
    const viewFor = (f: PNode): View => {
      const L = levelsBelow(f);
      if (donut) {
        const t = L > 0 ? (R - hole * R) / L : R - hole * R;
        return { x0: f.x0, x1: f.x1, base: L > 0 ? f.depth : f.depth - 1, t, off: hole * R };
      }
      const t = R / (L + 1);
      return { x0: f.x0, x1: f.x1, base: f.depth, t, off: t };
    };
    const angleIn = (x: number, v: View) =>
      a0 + Math.max(0, Math.min(1, (x - v.x0) / (v.x1 - v.x0 || 1))) * (a1 - a0);
    const radii = (n: PNode, v: View) => {
      const k = n.depth - v.base;
      const inner = Math.max(0, v.off + (k - 1) * v.t);
      return { inner, outer: Math.max(inner, inner + v.t) };
    };
    const arcGen = d3arc<{ a0: number; a1: number; r0: number; r1: number; pad: number }>()
      .startAngle((d) => d.a0)
      .endAngle((d) => d.a1)
      .innerRadius((d) => d.r0)
      .outerRadius((d) => d.r1)
      .padAngle((d) => d.pad)
      .cornerRadius(cornerRadius);
    const markPath = (n: PNode, v: View, sweep = 1) => {
      const { inner, outer } = radii(n, v);
      const s = angleIn(n.x0, v),
        e = angleIn(n.x1, v);
      return (
        arcGen({ a0: s, a1: s + (e - s) * sweep, r0: inner, r1: Math.max(inner, outer - ringGap), pad: padAngle }) ?? ''
      );
    };

    const draw = (f: PNode, { initial, moveFocus }: { initial: boolean; moveFocus: boolean }) => {
      body.selectAll('*').interrupt();
      body.selectAll('*').remove();
      const view = viewFor(f);
      const L = levelsBelow(f);
      const showDisc = !donut && !isSyntheticRoot(f) && positive(f);
      const ringNodes: PNode[] = [];
      f.each((nn) => {
        const n = nn as PNode;
        const k = n.depth - f.depth;
        if (n !== f && k >= 1 && k <= L && positive(n) && !isSyntheticRoot(n)) ringNodes.push(n);
      });
      // Donut with nothing below the focus: the focus itself is one full ring.
      if (donut && L === 0 && !isSyntheticRoot(f) && positive(f)) ringNodes.push(f);
      const hasPaintedChildren = (n: PNode) =>
        n !== f && !!n.children?.some((c) => ringNodes.includes(c as PNode));

      const marksG = body.append('g').attr('class', 'marks');
      const elements = new Map<PNode, SVGElement>();

      let disc: Selection<SVGCircleElement, unknown, null, undefined> | null = null;
      if (showDisc) {
        disc = marksG
          .append('circle')
          .attr('data-testid', 'sunburst-centre')
          .attr('data-depth', f.depth)
          .attr('data-path', pathOf(f).join('/'))
          .attr('class', markClass(f))
          .attr('r', view.t);
        elements.set(f, disc.node()!);
      }

      const duration = initial ? drawing?.duration ?? 0 : 0;
      const arcs = marksG
        .selectAll('path')
        .data(ringNodes)
        .enter()
        .append('path')
        .attr('data-testid', 'sunburst-arc')
        .attr('data-index', (_, i) => i)
        .attr('data-depth', (n) => n.depth)
        .attr('data-path', (n) => pathOf(n).join('/'))
        .attr('class', markClass)
        .attr('d', (n) => markPath(n, view, duration ? 0 : 1));
      arcs.each(function (n) {
        elements.set(n, this);
      });
      if (duration)
        arcs
          .transition()
          .duration(duration)
          .delay(drawing?.delay ?? 0)
          .attrTween('d', (n) => (t: number) => markPath(n, view, t));

      // --- zoom wiring (keyboard on the focusable marks; clicks on hit areas)
      const zoomTo = (target: PNode, viaKeyboard: boolean) => {
        if (!zoomEnabled || target === f) return;
        focusPath.current = isTop(target) ? null : pathOf(target);
        onZoomChange.current?.(isTop(target) ? null : datumOf.get(target)!);
        const to = viewFor(target);
        const dur =
          drawing === DEFAULT_DRAWING || drawing?.duration === undefined
            ? DEFAULT_ZOOM_DURATION
            : drawing.duration;
        root.interrupt('zoom');
        body.selectAll('*').interrupt();
        clearHighlight();
        // Labels re-evaluate fit-or-hide at the end of the tween. Hit areas
        // stay, so a second click can interrupt this zoom with a new one.
        body.selectAll('.labels').remove();
        if (!dur) {
          draw(target, { initial: false, moveFocus: viaKeyboard });
          return;
        }
        const from = view;
        const lerp = (k: keyof View) => interpolateNumber(from[k], to[k]);
        const li = { x0: lerp('x0'), x1: lerp('x1'), base: lerp('base'), t: lerp('t'), off: lerp('off') };
        root
          .transition('zoom')
          .duration(dur)
          .tween('zoom', () => (t: number) => {
            const v: View = { x0: li.x0(t), x1: li.x1(t), base: li.base(t), t: li.t(t), off: li.off(t) };
            arcs.attr('d', (n) => markPath(n, v));
            disc?.attr('r', v.t);
          })
          .on('end', () => draw(target, { initial: false, moveFocus: viaKeyboard }));
      };
      const zoomOut = () => {
        if (!zoomEnabled || isTop(f) || !f.parent) return;
        // Skip a synthetic parent only if it is the layout root (it is the top).
        zoomTo(f.parent as PNode, true);
      };
      zoomOutRef.current = zoomOut;

      if (zoomEnabled) {
        const ariaFor = (n: PNode) => {
          const d = datumOf.get(n)!;
          return `${d.path.join(' › ')}, ${d.value}`;
        };
        arcs
          .filter((n) => hasPaintedChildren(n))
          .attr('tabindex', 0)
          .attr('role', 'button')
          .attr('aria-label', ariaFor)
          .on('keydown', (event: KeyboardEvent, n) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              zoomTo(n, true);
            }
          });
        if (disc) {
          if (!isTop(f))
            disc
              .attr('tabindex', 0)
              .attr('role', 'button')
              .attr('aria-label', ariaFor(f))
              .on('keydown', (event: KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  zoomOut();
                }
              });
          // Programmatic focus target at the top level, kept out of the tab order.
          else disc.attr('tabindex', -1);
        }
      }

      // --- hover highlight
      const clearHighlight = () => {
        body.selectAll('[data-highlighted],[data-dimmed]').attr('data-highlighted', null).attr('data-dimmed', null);
      };
      const setHighlight = (n: PNode) => {
        if (!highlight) return;
        const lit = new Set(n.ancestors());
        elements.forEach((el, node) => {
          const on = lit.has(node);
          select(el)
            .attr('data-highlighted', on ? 'true' : null)
            .attr('data-dimmed', on ? null : 'true');
        });
      };

      // --- hit areas: full ring band (no pad, no ring gap), widened to >= 8px.
      const hitG = body.append('g').attr('class', 'hit-areas');
      const hitPath = (n: PNode) => {
        const { inner, outer } = radii(n, view);
        let s = angleIn(n.x0, view),
          e = angleIn(n.x1, view);
        const midR = (inner + outer) / 2;
        const minSpan = midR > 0 ? MIN_HIT_ARC_PX / midR : 0;
        if (e - s < minSpan) {
          const mid = (s + e) / 2;
          s = mid - minSpan / 2;
          e = mid + minSpan / 2;
        }
        return arcGen({ a0: s, a1: e, r0: inner, r1: outer, pad: 0 }) ?? '';
      };
      const bindHover = <E extends SVGElement>(
        sel: Selection<E, unknown, null, undefined>,
        n: PNode
      ) =>
        sel
          .attr('fill', 'transparent')
          .attr('pointer-events', 'all')
          .on('mouseenter', (event) => {
            setHighlight(n);
            tooltipHandlers.current?.onMouseOver(event, datumOf.get(n));
          })
          .on('mousemove', (event) => tooltipHandlers.current?.onMouseMove(event))
          .on('mouseleave', () => {
            clearHighlight();
            tooltipHandlers.current?.onMouseLeave();
          });

      if (showDisc) {
        bindHover(
          hitG
            .append('circle')
            .attr('data-testid', 'sunburst-hit')
            .attr('data-centre', 'true')
            .attr('data-path', pathOf(f).join('/'))
            .attr('r', view.t),
          f
        ).on('click', () => zoomOut());
      } else if (donut && zoomEnabled && !isTop(f)) {
        // Donut hole: a click target for zooming out (not a tooltip target).
        hitG
          .append('circle')
          .attr('data-testid', 'sunburst-hole')
          .attr('r', hole * R)
          .attr('fill', 'transparent')
          .attr('pointer-events', 'all')
          .on('click', () => zoomOut());
      }
      ringNodes.forEach((n) => {
        const hit = hitG
          .append('path')
          .attr('data-testid', 'sunburst-hit')
          .attr('data-depth', n.depth)
          .attr('data-path', pathOf(n).join('/'))
          .attr('d', hitPath(n));
        bindHover(hit, n).on('click', () => {
          if (hasPaintedChildren(n)) zoomTo(n, false);
        });
      });

      // --- labels: radial, flipped on the left half; fit-or-hide; truncated.
      if (nameOpt || valueOpt || pctOpt) {
        const labelsG = body.append('g').attr('class', 'labels').attr('pointer-events', 'none');
        const labelClass = twMerge(
          'fill-current',
          name?.className,
          nameOpt?.className,
          valueOpt?.className,
          pctOpt?.className
        );
        if (showDisc && view.t >= minThickness) {
          const text = fitText(labelText(f, 0), 2 * view.t - 2 * LABEL_PAD_PX);
          if (text)
            labelsG
              .append('text')
              .attr('data-testid', 'sunburst-label')
              .attr('data-path', pathOf(f).join('/'))
              .attr('data-centre', 'true')
              .attr('class', labelClass)
              .attr('text-anchor', 'middle')
              .attr('dominant-baseline', 'middle')
              .text(text);
        }
        ringNodes.forEach((n, i) => {
          const { inner, outer } = radii(n, view);
          const thick = Math.max(0, outer - ringGap - inner);
          const s = angleIn(n.x0, view),
            e = angleIn(n.x1, view);
          const midR = (inner + outer - ringGap) / 2;
          if ((e - s) * midR < minArcLength || thick < minThickness) return;
          const text = fitText(labelText(n, i + 1), thick - 2 * LABEL_PAD_PX);
          if (!text) return;
          const mid = (s + e) / 2;
          // Normalise to [0, 2π) to decide which half the label sits in.
          const norm = ((mid % TAU) + TAU) % TAU;
          const deg = (mid * 180) / Math.PI - 90 + (norm > Math.PI ? 180 : 0);
          labelsG
            .append('text')
            .attr('data-testid', 'sunburst-label')
            .attr('data-path', pathOf(n).join('/'))
            .attr('data-flipped', String(norm > Math.PI))
            .attr('class', labelClass)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('transform', `translate(${Math.sin(mid) * midR},${-Math.cos(mid) * midR}) rotate(${deg})`)
            .text(text);
        });
      }

      if (moveFocus) {
        const target =
          (body.select<SVGElement>('[data-testid="sunburst-centre"][tabindex]').node() ??
            body.select<SVGElement>('[data-testid="sunburst-arc"][tabindex]').node()) as
            | (SVGElement & { focus?: () => void })
            | null;
        target?.focus?.();
      }
    };

    draw(focus, { initial: true, moveFocus: false });
  }, [
    data,
    id,
    children,
    value,
    name,
    sort,
    maxDepth,
    classNameMap,
    colorBy,
    labels,
    innerRadius,
    rings,
    startAngle,
    endAngle,
    arc,
    highlight,
    zoomEnabled,
    padding,
    margin,
    drawing,
  ]);

  useEffect(() => {
    refreshChart();
    // Hold the node: on unmount the cleanup runs after the svg has left the
    // document, so interrupt through this reference, not a lookup by id.
    const plot = plotRef.current;
    return () => {
      if (!plot) return;
      select(plot).interrupt('zoom');
      select(plot).selectAll('*').interrupt();
    };
    // style is not read by refreshChart, but it sets the size refreshChart measures.
  }, [refreshChart, style?.width, style?.height]);

  const titleId = title ? `${id}-title` : undefined;
  const descId = description ? `${id}-desc` : undefined;

  return (
    <svg
      id={id}
      style={style}
      className={twMerge(defaultChartClassNames, className)}
      role={zoomEnabled ? 'group' : 'img'}
      aria-labelledby={titleId}
      aria-describedby={descId}
      aria-label={title ? undefined : ariaLabel ?? 'Sunburst chart'}
      data-testid='sunburst-chart'
      onKeyDown={
        zoomEnabled
          ? (event) => {
              if (event.key === 'Escape') zoomOutRef.current?.();
            }
          : undefined
      }
    >
      {title ? <title id={titleId}>{title}</title> : null}
      {description ? <desc id={descId}>{description}</desc> : null}
      <g ref={plotRef} className='sunburst-plot' />
    </svg>
  );
};

export default SunburstChart;
