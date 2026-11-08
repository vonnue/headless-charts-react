import {
  Dispatch,
  MutableRefObject,
  RefObject,
  SetStateAction,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import measureSvg from '@/utils/measureSvg';

export interface ChartSize {
  width: number;
  height: number;
}

/** Size changes smaller than this (in px) are ignored, so sub-pixel layout jitter cannot redraw. */
export const SIZE_EPSILON = 1;

// useLayoutEffect warns during server rendering on React 18; neither effect
// runs on the server, so the server render touches no `window`.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const sameSize = (a: ChartSize | null, b: ChartSize) =>
  a !== null &&
  Math.abs(a.width - b.width) < SIZE_EPSILON &&
  Math.abs(a.height - b.height) < SIZE_EPSILON;

// Compares against the last size set, not inside a state updater, so an
// unchanged measurement schedules no render at all (an updater that returns
// the previous state still costs React one bail-out render).
const measureInto = (
  node: SVGSVGElement | null,
  last: MutableRefObject<ChartSize | null>,
  setSize: Dispatch<SetStateAction<ChartSize | null>>
) => {
  if (!node) return;
  const next = measureSvg(node);
  if (sameSize(last.current, next)) return;
  last.current = next;
  setSize(next);
};

/**
 * The rendered size of a chart's svg, kept current as its layout changes (#53).
 *
 * Returns `null` until the svg has been measured (the server render and the
 * first client render), so a chart can skip drawing at a placeholder size and
 * draw once, at the measured size.
 *
 * - Measures with `measureSvg` after every commit, so a `style`/`className`
 *   change is picked up even where there is no `ResizeObserver` (jsdom, old
 *   browsers). The measurement is a layout read; state only changes when the
 *   size does.
 * - Where `ResizeObserver` exists, observes the svg so container-driven
 *   changes (CSS %, flex, grid) are picked up too. Callbacks are coalesced
 *   into one measurement per animation frame.
 * - Changes under `SIZE_EPSILON` px are ignored. An svg's box is set by CSS,
 *   not by its children, so drawing into it does not resize it, and the
 *   epsilon guards against rounding jitter turning a redraw into a loop.
 * - Disconnects the observer and cancels a pending frame on unmount.
 */
const useChartSize = (
  ref: RefObject<SVGSVGElement | null>
): ChartSize | null => {
  const [size, setSize] = useState<ChartSize | null>(null);
  const last = useRef<ChartSize | null>(null);

  // Every commit: picks up the initial size and style/className changes.
  useIsomorphicLayoutEffect(() => {
    measureInto(ref.current, last, setSize);
  });

  useIsomorphicLayoutEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return;

    const hasRaf = typeof requestAnimationFrame === 'function';
    let frame: number | null = null;

    const observer = new ResizeObserver(() => {
      if (!hasRaf) {
        measureInto(node, last, setSize);
        return;
      }
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        measureInto(node, last, setSize);
      });
    });
    observer.observe(node);

    return () => {
      observer.disconnect();
      if (frame !== null && hasRaf) cancelAnimationFrame(frame);
      frame = null;
    };
  }, [ref]);

  return size;
};

export default useChartSize;
