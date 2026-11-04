/** `value` in px if it is a px length (e.g. an inline style), else NaN. */
const parsePx = (value: string) => (value.endsWith('px') ? parseFloat(value) : NaN);

/**
 * The rendered size of a chart's svg, in px.
 *
 * d3's `selection.style(name)` returns the inline value as written, so parsing
 * it as px gave NaN for `style={{ width: '100%' }}` (#18). This uses the layout
 * box instead. Where there is no layout (jsdom, or a detached node), it falls
 * back to a px inline style, then 0, as the old px parsing gave for no style.
 */
const measureSvg = (node: SVGSVGElement | null): { width: number; height: number } => {
  const box = node?.getBoundingClientRect();
  return {
    width: box?.width || parsePx(node?.style.width ?? '') || 0,
    height: box?.height || parsePx(node?.style.height ?? '') || 0,
  };
};

export default measureSvg;
