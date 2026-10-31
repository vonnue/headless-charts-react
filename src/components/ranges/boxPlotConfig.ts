// Shared configuration types and helpers for BoxPlotH and BoxPlotV.
import { AxisConfig, ValueAxisConfig } from '@/types';
import type { BinStatsResult } from '@/utils';

/** Row fields holding the pre-computed box statistics (summary mode) */
export interface BoxPlotStatKeys<TData = any> {
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
export interface BoxPlotValueAxisBase<TData = any>
  extends ValueAxisConfig<TData> {
  min?: number;
  max?: number;
  /** Class names keyed by category value */
  classNameMap?: Record<string, string>;
}

/** Value-axis config in summary mode: every stat key is required */
export type BoxPlotValueConfig<TData = any> = BoxPlotValueAxisBase<TData> &
  BoxPlotStatKeys<TData>;

/** Value-axis config in binned mode: stat keys are computed, so optional */
export type BoxPlotBinnedValueConfig<TData = any> =
  BoxPlotValueAxisBase<TData> & Partial<BoxPlotStatKeys<TData>>;

/** Category-axis config in binned mode: `bin` is required */
export type BoxPlotBinnedCategoryConfig<TData = any> = AxisConfig<TData> & {
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
  valueKey: string | undefined
): string | undefined =>
  categoryConfig.bin != null && typeof valueKey === 'string'
    ? valueKey
    : undefined;

/** Type guard: does the value-axis config carry every stat key? */
export const hasStatKeys = <TData = any>(
  config: BoxPlotBinnedValueConfig<TData>
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
export const resolveValueConfig = <TData = any>(
  config: BoxPlotBinnedValueConfig<TData>,
  binned: boolean
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
