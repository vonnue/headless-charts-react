import { useEffect, useRef } from 'react';
import { deepValue, mergeTailwindClasses } from '@/utils';
import { pointer, select } from 'd3-selection';
import { TooltipConfig } from '@/types';

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
}

/** The element a hook with this config would use, if it already exists. */
const findExisting = (id: string | undefined, tooltip?: TooltipObjectType) =>
  (tooltip ? document.getElementById('tooltip') : null) ??
  document.getElementById(`tooltip-${id}`);

/**
 * Returns the live tooltip element: the current one if still connected, else
 * the legacy global `#tooltip` (when a tooltip config is set), else an
 * existing `#tooltip-${id}` (adopted, not owned), else a newly created one.
 */
const ensureElement = (state: TooltipState, id?: string): HTMLDivElement => {
  if (state.element && state.element.isConnected) return state.element;

  const existing = findExisting(id, state.tooltip);
  if (existing) {
    state.element = existing as HTMLDivElement;
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
 * in an effect, never during render, and is removed on unmount only if this
 * hook created it. Handlers always act on the live element and re-create it if
 * something removed it in the meantime. They are no-ops after unmount.
 *
 * `tooltipDiv` is read-only and reflects the DOM at render time: it is an
 * empty selection on the first render, before the element exists.
 */
const useTooltip = ({ tooltip, defaultHtml, id }: TooltipProps) => {
  const stateRef = useRef<TooltipState>({
    element: null,
    owned: false,
    mounted: false,
    tooltip,
    defaultHtml,
  });

  // Declared before the [id] effect so the element is created with the
  // current config. Runs after every render.
  useEffect(() => {
    stateRef.current.tooltip = tooltip;
    stateRef.current.defaultHtml = defaultHtml;
  });

  useEffect(() => {
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
  const tooltipDiv = select(
    typeof document === 'undefined' ? null : findExisting(id, tooltip)
  );

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
  // is a no-op (it no longer reads the deprecated global `window.event`).
  const onMouseMove: (event?: unknown, d?: unknown) => void = (event) => {
    const state = stateRef.current;
    if (!state.mounted || !event) return;
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

  return { tooltipDiv, onMouseOver, onMouseMove, onMouseLeave };
};

export default useTooltip;
