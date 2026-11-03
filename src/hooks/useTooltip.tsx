import { useEffect, useLayoutEffect, useRef } from 'react';
import { deepValue, mergeTailwindClasses } from '@/utils';
import { Selection, pointer, select } from 'd3-selection';
import { TooltipConfig } from '@/types';
import { isDevEnvironment } from '@/utils/devEnvironment';

/** @deprecated Use TooltipConfig from '../types' instead */
export type TooltipObjectType = TooltipConfig;

export interface TooltipProps {
  tooltip?: TooltipObjectType;
  defaultHtml?: (d: any, i?: number) => string;
  id?: string;
}

interface TooltipState {
  /** The element this hook instance writes to, if any. */
  element: HTMLDivElement | null;
  /** True only if this hook instance created `element` (so it removes it). */
  owned: boolean;
  /** False before mount and after unmount: handlers do nothing then. */
  mounted: boolean;
  /** Latest config, so handlers read current props. */
  tooltip?: TooltipObjectType;
  defaultHtml?: TooltipProps['defaultHtml'];
  /** True once the missing-event warning has been logged by this instance. */
  warnedMissingEvent: boolean;
}

/** A d3 selection of the tooltip element (empty if there is none). */
export type TooltipSelection = Selection<HTMLElement | null, unknown, null, undefined>;

export interface UseTooltipResult {
  /**
   * Selection of the tooltip element as it was in the DOM at render time:
   * empty on the first render and on the render where `id` changes.
   * @deprecated Use `getTooltipDiv()`, which returns the live element from
   * mount effects and from callbacks captured on the first render.
   */
  tooltipDiv: TooltipSelection;
  /**
   * Returns a selection of the live tooltip element, creating (or re-creating)
   * it if needed. Empty before mount and after unmount.
   *
   * Safe from passive effects anywhere in the tree (including mount effects and
   * a child component's effects), from layout effects declared after
   * `useTooltip` in the same component, and from event handlers and callbacks.
   * It is still empty when called from a ref callback or from a child
   * component's layout effect on mount, since those run before this hook's
   * own layout effect.
   */
  getTooltipDiv: () => TooltipSelection;
  onMouseOver: (event: unknown, d: unknown) => void;
  /** Must be called with the mouse event; without one it does nothing. */
  onMouseMove: (event?: unknown, d?: unknown) => void;
  onMouseLeave: () => void;
}

// useLayoutEffect in the browser so the config is current before any event
// can fire after a commit; useEffect on the server, where React 18 warns about
// useLayoutEffect.
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * `el` if it can serve as this hook's tooltip: a div that is not inside the
 * chart's own svg (`svg#${id}`). Anything else with a matching id, such as a
 * chart whose svg id is literally `tooltip`, is left alone (#48).
 */
const asAdoptable = (
  el: HTMLElement | null,
  id: string | undefined
): HTMLDivElement | null => {
  if (!(el instanceof HTMLDivElement)) return null;
  const chartSvg = id ? document.getElementById(id) : null;
  return chartSvg instanceof SVGSVGElement && chartSvg.contains(el) ? null : el;
};

/** The element a hook with this config would use, if it already exists. */
const findExisting = (id: string | undefined, tooltip?: TooltipObjectType) =>
  (tooltip ? asAdoptable(document.getElementById('tooltip'), id) : null) ??
  asAdoptable(document.getElementById(`tooltip-${id}`), id);

/**
 * Returns the live tooltip element: the current one if still connected, else
 * the legacy global `div#tooltip` (when a tooltip config is set), else an
 * existing `div#tooltip-${id}` (adopted, not owned), else a newly created one.
 * Non-div elements and anything inside the chart's svg are never adopted.
 */
const ensureElement = (state: TooltipState, id?: string): HTMLDivElement => {
  if (state.element && state.element.isConnected) return state.element;

  const existing = findExisting(id, state.tooltip);
  if (existing) {
    state.element = existing;
    state.owned = false;
    return state.element;
  }

  state.element = select('body')
    .append('div')
    .attr('id', `tooltip-${id}`)
    .attr(
      'class',
      mergeTailwindClasses('absolute opacity-0 tooltip', state.tooltip?.className)
    )
    .node() as HTMLDivElement;
  state.owned = true;
  return state.element;
};

/**
 * Owns one `div#tooltip-${id}` on `document.body` per mounted instance.
 *
 * The element is created (or adopted, if one with the same id already exists)
 * in a layout effect, never during render, and is removed on unmount only if this
 * hook created it. Handlers always act on the live element and re-create it if
 * something removed it in the meantime. They are no-ops after unmount.
 *
 * Use `getTooltipDiv()` to reach the element from effects or callbacks (see
 * its doc for the ref-callback and child-layout-effect exceptions). The
 * deprecated `tooltipDiv` reflects the DOM at render time and is an empty
 * selection on the first render, before the element exists.
 */
const useTooltip = ({
  tooltip,
  defaultHtml,
  id,
}: TooltipProps): UseTooltipResult => {
  const stateRef = useRef<TooltipState>({
    element: null,
    owned: false,
    mounted: false,
    tooltip,
    defaultHtml,
    warnedMissingEvent: false,
  });

  // Runs after every render, before the [id] effect (declared below), so the
  // element is created with the current config.
  useIsomorphicLayoutEffect(() => {
    stateRef.current.tooltip = tooltip;
    stateRef.current.defaultHtml = defaultHtml;
  });

  // A layout effect (in the browser) so the element exists before passive
  // effects run anywhere in the tree, and before layout effects declared after
  // this hook in the same component.
  useIsomorphicLayoutEffect(() => {
    const state = stateRef.current;
    state.mounted = true;
    ensureElement(state, id);
    return () => {
      state.mounted = false;
      if (state.owned) state.element?.remove();
      state.element = null;
      state.owned = false;
    };
  }, [id]);

  // A DOM read, not a write; nothing exists during SSR.
  const tooltipDiv: TooltipSelection = select<HTMLElement | null, unknown>(
    typeof document === 'undefined' ? null : findExisting(id, tooltip)
  );

  const getTooltipDiv = (): TooltipSelection => {
    const state = stateRef.current;
    return select<HTMLElement | null, unknown>(
      state.mounted ? ensureElement(state, id) : null
    );
  };

  const onMouseOver = (event: any, d: any) => {
    const state = stateRef.current;
    if (!state.mounted) return;
    const { tooltip: config, defaultHtml: fallbackHtml } = state;
    const div = select(ensureElement(state, id));
    if (config) {
      div.attr(
        'class',
        mergeTailwindClasses('absolute opacity-100 ', config.className)
      );
    }

    const [bX, bY] = pointer(event, select('body'));
    div.style('left', `${bX + 10}px`);
    div.style('top', `${bY + 20}px`);
    div.html(
      config?.html // If tooltip.html exists
        ? config.html(d) // Call it
        : config?.keys // Else if keys exists
        ? config.keys // iterate over the keys and show the data
            .map(
              (key: string) =>
                `${key}: ${deepValue(d, key) || deepValue(d.data, key) || ''}`
            )
            .join('<br/>')
        : fallbackHtml // else if defaultHtml is given for a chart type
        ? fallbackHtml(d) // call it
        : Object.entries(d) // otherwise show all entries of the data object
            .map(([key, value]) => `${key}: ${value}`)
            .join('<br/>')
    );
  };

  // D3 calls this as (event, datum); the datum is unused. Without an event it
  // is a no-op (it no longer reads the deprecated global `window.event`) and
  // warns once per instance in development.
  const onMouseMove: UseTooltipResult['onMouseMove'] = (event) => {
    const state = stateRef.current;
    if (!state.mounted) return;
    if (!event) {
      if (!state.warnedMissingEvent && isDevEnvironment()) {
        state.warnedMissingEvent = true;
        console.warn(
          '[headless-charts] useTooltip: onMouseMove must be called with the mouse event (e.g. `.on("mousemove", onMouseMove)`); without one the tooltip is not moved.'
        );
      }
      return;
    }
    const div = select(ensureElement(state, id));
    const [bX, bY] = pointer(event, select('body'));
    div.style('left', `${bX + 10}px`);
    div.style('top', `${bY + 20}px`);
  };

  const onMouseLeave = () => {
    const state = stateRef.current;
    if (!state.mounted) return;
    const div = select(ensureElement(state, id));
    div.attr(
      'class',
      mergeTailwindClasses('absolute opacity-0', state.tooltip?.className)
    );
    div.style('left', `-1000px`);
  };

  return { tooltipDiv, getTooltipDiv, onMouseOver, onMouseMove, onMouseLeave };
};

export default useTooltip;
