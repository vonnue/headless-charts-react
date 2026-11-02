/**
 * Reads the tick positions d3-axis drew into an axis group, keyed by tick
 * label. d3 writes each tick as `<g class="tick" transform="translate(x,y)">`;
 * horizontal axes move ticks along x, vertical axes along y. d3-axis adds
 * a 0.5px offset for crisp lines when `devicePixelRatio <= 1` (always in
 * jsdom); it is removed here so positions equal `scale(value)`. Labels use
 * d3-format's minus sign (U+2212), normalised here to '-'.
 */
export const tickPositions = (
  axis: Element | null | undefined,
  orientation: 'horizontal' | 'vertical'
): Map<string, number> => {
  const positions = new Map<string, number>();
  const offset =
    typeof window !== 'undefined' && window.devicePixelRatio > 1 ? 0 : 0.5;
  axis?.querySelectorAll('.tick').forEach((tick) => {
    const match = /translate\(\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*\)/.exec(
      tick.getAttribute('transform') ?? ''
    );
    const label = (tick.textContent ?? '').replace(/\u2212/g, '-').trim();
    if (match) {
      positions.set(
        label,
        Number(orientation === 'horizontal' ? match[1] : match[2]) - offset
      );
    }
  });
  return positions;
};
