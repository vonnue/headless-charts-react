/** One tooltip line, or a skipped slot (`undefined` / `null` / `false`). */
export type TooltipRow =
  | string
  | readonly [label: string, value?: unknown]
  | undefined
  | null
  | false;

/** Separators and an optional value formatter. */
export type TooltipRowsOptions = {
  /** Between a pair's label and value. Default `': '`. */
  sep?: string;
  /** Between rows. Default `'<br/>'`. */
  join?: string;
  /**
   * Formats a pair's value. Default matches template-literal interpolation
   * (`${value}`), including `undefined` → `"undefined"`. Not used for string
   * rows, which are already built.
   */
  fmt?: (value: unknown) => string;
};

/** Same string as a template-literal interpolation of `value`. */
const interpolate = (value: unknown): string => `${value}`;

/**
 * Join tooltip lines into one HTML string.
 *
 * `[label, value]` pairs become `label + sep + fmt(value)`. A bare string is
 * emitted as-is (a label-only or already-formatted line). `undefined`, `null`
 * and `false` entries are skipped; empty strings are kept, including rows
 * whose value is `undefined` or `''`.
 *
 * Values are interpolated raw. HTML escaping is a follow-up, not done here.
 */
export const tooltipRows = (
  rows: readonly TooltipRow[],
  options?: TooltipRowsOptions | ((value: unknown) => string)
): string => {
  const opts: TooltipRowsOptions =
    typeof options === 'function' ? { fmt: options } : options ?? {};
  const sep = opts.sep ?? ': ';
  const joiner = opts.join ?? '<br/>';
  const fmt = opts.fmt ?? interpolate;
  const lines: string[] = [];
  for (const row of rows) {
    if (row === undefined || row === null || row === false) continue;
    if (typeof row === 'string') {
      lines.push(row);
      continue;
    }
    lines.push(`${row[0]}${sep}${fmt(row[1])}`);
  }
  return lines.join(joiner);
};
