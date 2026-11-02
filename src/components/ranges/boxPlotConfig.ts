// Shared configuration types and helpers for BoxPlotH and BoxPlotV.
import { useEffect, useMemo } from 'react';
import { AxisConfig, ValueAxisConfig } from '@/types';
import { deepValue } from '@/utils';
import type { BinStatsResult } from '@/utils';
import { isDevEnvironment, warnOnceInDev } from '@/utils/devEnvironment';

/** Row fields holding the pre-computed box statistics (summary mode) */
export interface BoxPlotStatKeys<TData = unknown> {
  minKey: Extract<keyof TData, string> | string;
  maxKey: Extract<keyof TData, string> | string;
  boxStart: Extract<keyof TData, string> | string;
  boxEnd: Extract<keyof TData, string> | string;
  midKey: Extract<keyof TData, string> | string;
}

/**
 * Value-axis settings shared by both modes. `key` is not read for the value
 * axis (positions come from the statistic keys), so it is optional.
 */
export interface BoxPlotValueAxisBase<
  TData = unknown,
> extends ValueAxisConfig<TData> {
  min?: number;
  max?: number;
  /** Class names keyed by category value */
  classNameMap?: Record<string, string>;
}

/** Value-axis config in summary mode: every stat key is required */
export type BoxPlotValueConfig<TData = unknown> = BoxPlotValueAxisBase<TData> &
  BoxPlotStatKeys<TData>;

/** Value-axis config in binned mode: stat keys are computed, so optional */
export type BoxPlotBinnedValueConfig<TData = unknown> =
  BoxPlotValueAxisBase<TData> & Partial<BoxPlotStatKeys<TData>>;

/** Category-axis config in binned mode: `bin` is required */
export type BoxPlotBinnedCategoryConfig<TData = unknown> = AxisConfig<TData> & {
  bin: NonNullable<AxisConfig<TData>['bin']>;
};

/** Field names the binned rows are written to; the single source of truth */
export const BINNED_STAT_KEYS = {
  minKey: '_min',
  maxKey: '_max',
  boxStart: '_q1',
  boxEnd: '_q3',
  midKey: '_median',
} as const satisfies BoxPlotStatKeys;

/**
 * The binned-mode predicate, mirroring the props types exactly: binned mode is
 * selected when the category axis has `bin` and `valueKey` is a string (any
 * string, including ''). Returns the narrowed value key, or undefined for
 * summary mode.
 */
export const getBinValueKey = (
  categoryConfig: Pick<AxisConfig, 'bin'>,
  valueKey: string | undefined,
): string | undefined =>
  categoryConfig.bin != null && typeof valueKey === 'string'
    ? valueKey
    : undefined;

/** Type guard: does the value-axis config carry every stat key? */
export const hasStatKeys = <TData = unknown>(
  config: BoxPlotBinnedValueConfig<TData>,
): config is BoxPlotValueConfig<TData> =>
  !!(
    config.minKey &&
    config.maxKey &&
    config.boxStart &&
    config.boxEnd &&
    config.midKey
  );

/**
 * Resolves the stat keys to draw with. In binned mode they point at the
 * computed fields; in summary mode they must be present on the config. Returns
 * null when they are missing (only reachable by bypassing the props types), so
 * callers can skip drawing rather than render NaN geometry.
 */
export const resolveValueConfig = <TData = unknown>(
  config: BoxPlotBinnedValueConfig<TData>,
  binned: boolean,
): BoxPlotValueConfig<TData> | null => {
  if (binned) return { ...config, ...BINNED_STAT_KEYS };
  return hasStatKeys(config) ? config : null;
};

/** Maps binDataStats output to rows keyed by BINNED_STAT_KEYS */
export const toBinnedRows = (stats: BinStatsResult[], categoryKey: string) =>
  stats.map((s) => ({
    [categoryKey]: s.label,
    [BINNED_STAT_KEYS.minKey]: s.min,
    [BINNED_STAT_KEYS.boxStart]: s.q1,
    [BINNED_STAT_KEYS.midKey]: s.median,
    [BINNED_STAT_KEYS.boxEnd]: s.q3,
    [BINNED_STAT_KEYS.maxKey]: s.max,
    _count: s.count,
  }));

// ---------------------------------------------------------------------------
// Dev-only configuration warnings
// ---------------------------------------------------------------------------

// Re-exported: tests and callers import the dev gate from here.
export { isDevEnvironment };

export type BoxPlotConfigIssue =
  | 'missing-stat-keys'
  | 'no-binned-values'
  | 'bin-without-valuekey'
  | 'bin-ignored-in-time-mode';

const ISSUE_MESSAGES: Record<BoxPlotConfigIssue, (detail: string) => string> = {
  'missing-stat-keys': () =>
    'value axis needs minKey, maxKey, boxStart, boxEnd and midKey (or set bin on the category axis plus valueKey); nothing is drawn',
  'no-binned-values': (detail) =>
    `valueKey "${detail}" produced no numeric values to summarise (empty or misspelled?); nothing is drawn`,
  'bin-without-valuekey': () =>
    'bin is set on the category axis but valueKey is missing, so bin is ignored and summary mode is used',
  'bin-ignored-in-time-mode': () =>
    "bin/valueKey are ignored when x.scalingFunction is 'time' (bin labels aren't dates); summary mode is used, so y needs the stat keys",
};

/**
 * Logs one configuration warning, in development only and once per chart, id,
 * issue and detail (via `warnOnceInDev`), so remounts and StrictMode double
 * effects don't repeat it.
 */
export const warnBoxPlotConfig = (
  chart: 'BoxPlotH' | 'BoxPlotV',
  id: string,
  issue: BoxPlotConfigIssue,
  detail = '',
): void =>
  warnOnceInDev(
    `${chart}#${id}:${issue}:${detail}`,
    `[headless-charts] ${chart}#${id}: ${ISSUE_MESSAGES[issue](detail)}`,
  );

/** Pure check: which misconfigurations apply? Uses the same predicates as rendering. */
export const getBoxPlotConfigIssues = ({
  data,
  hasBin,
  statKeysPresent,
  valueKey,
  timeMode = false,
}: {
  data: unknown[];
  /** `bin` is set on the category axis */
  hasBin: boolean;
  /** hasStatKeys(valueConfig) */
  statKeysPresent: boolean;
  valueKey: string | undefined;
  /**
   * The category axis is a time axis (BoxPlotV `x.scalingFunction: 'time'`),
   * where binning is never applied.
   */
  timeMode?: boolean;
}): BoxPlotConfigIssue[] => {
  if (timeMode) {
    const issues: BoxPlotConfigIssue[] = [];
    if (hasBin || valueKey !== undefined) issues.push('bin-ignored-in-time-mode');
    if (!statKeysPresent) issues.push('missing-stat-keys');
    return issues;
  }
  const binValueKey = getBinValueKey(
    hasBin ? { bin: { count: 0 } } : {},
    valueKey,
  );
  if (binValueKey === undefined) {
    const issues: BoxPlotConfigIssue[] = [];
    if (hasBin) issues.push('bin-without-valuekey');
    if (!statKeysPresent) issues.push('missing-stat-keys');
    return issues;
  }
  // Same test binDataStats uses to keep a value
  const anyNumeric = data.some(
    (d) => !isNaN(Number(deepValue(d, binValueKey))),
  );
  return data.length > 0 && !anyNumeric ? ['no-binned-values'] : [];
};

/**
 * Warns about misconfigured box plot props in development. The check is
 * memoised on primitives and the warning runs in an effect keyed on the set of
 * issues, so each problem is logged once per mount and again only when the
 * config changes, not on every render (inline `x`/`y` objects change identity
 * every render).
 */
export const useBoxPlotConfigWarnings = <TData = unknown>(
  chart: 'BoxPlotH' | 'BoxPlotV',
  id: string,
  {
    data,
    categoryConfig,
    valueConfig,
    valueKey,
    timeMode = false,
  }: {
    data: TData[];
    categoryConfig: Pick<AxisConfig, 'bin'>;
    valueConfig: BoxPlotBinnedValueConfig<TData>;
    valueKey: string | undefined;
    /** See getBoxPlotConfigIssues */
    timeMode?: boolean;
  },
): void => {
  const hasBin = categoryConfig.bin != null;
  const statKeysPresent = hasStatKeys(valueConfig);
  const issuesKey = useMemo(
    () =>
      getBoxPlotConfigIssues({
        data,
        hasBin,
        statKeysPresent,
        valueKey,
        timeMode,
      }).join('|'),
    [data, hasBin, statKeysPresent, valueKey, timeMode],
  );

  useEffect(() => {
    if (!issuesKey) return;
    (issuesKey.split('|') as BoxPlotConfigIssue[]).forEach((issue) =>
      warnBoxPlotConfig(chart, id, issue, valueKey ?? ''),
    );
  }, [chart, id, issuesKey, valueKey]);
};
