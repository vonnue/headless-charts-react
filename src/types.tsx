// Standardized Axis Configuration Types

/**
 * Flexible axis configuration that works for both categorical and continuous data
 */
export interface AxisConfig<TData = any> {
  /** Data key to map to this axis */
  key: Extract<keyof TData, string> | string;

  /**
   * Starting value for the axis domain (for continuous/value axes). On a
   * time axis (epoch ms) a pinned start gets no edge padding, so a mark whose
   * date equals it is centred on the boundary and overhangs by half a bar.
   * To keep edge marks inside, pin half a step (cadence) earlier, e.g.
   * `start: Date.UTC(2025, 0, 1) - 12 * 3600_000` for daily data starting
   * 1 Jan 2025.
   */
  start?: number;

  /**
   * Ending value for the axis domain (for continuous/value axes). On a time
   * axis (epoch ms) a pinned end gets no edge padding, so a mark whose date
   * equals it is centred on the boundary and overhangs by half a bar. To keep
   * edge marks inside, pin half a step (cadence) later, e.g.
   * `end: Date.UTC(2025, 0, 31) + 12 * 3600_000` for daily data ending
   * 31 Jan 2025.
   */
  end?: number;

  /** Scaling function type (for continuous axes) */
  scalingFunction?: 'linear' | 'time';

  /** Time series configuration (when scalingFunction='time') */
  time?: {
    /** Date format string (d3-time-format specifier, default `%Y-%m-%d`) */
    format?: string;
    /** Whether the date is in ISO format */
    isISO?: boolean;
    /**
     * Read and show dates in UTC instead of the viewer's local time zone:
     * `format` strings are parsed with `utcParse`, the axis uses `scaleUtc`
     * (UTC tick positions and labels) and the default tooltip formats with
     * `utcFormat`. Default `false`.
     *
     * Local-time caveat: without `utc`, ISO instants such as
     * `2024-12-31T00:00:00Z` are drawn and labelled in the viewer's zone, so
     * west of UTC they land on (and read as) Dec 30. Set `utc: true` when the
     * data holds calendar days: date-only values (`2024`, `2024-12`,
     * `2024-12-31`) or UTC-midnight instants. In development, `isISO` data of
     * that shape without `utc` logs a one-time hint. Timestamps at other times
     * of day are usually best left in the viewer's local time.
     *
     * Read by ColumnChart, ColumnChartStacked, LollipopVChart and BoxPlotV.
     */
    utc?: boolean;
    /**
     * Format specifier for the date in the default tooltip. Falls back to
     * `format`, then `%Y-%m-%d`. Read by ColumnChart, ColumnChartStacked and
     * BoxPlotV (LollipopVChart has no tooltip).
     */
    tooltipFormat?: string;
    /**
     * Explicit width of each bar/box, in positive pixels, when
     * scalingFunction is 'time'. Overrides cadence inference and is capped at
     * one date slot so neighbouring marks never overlap (a development
     * warning says when a width was capped). Values that are not
     * finite or not > 0 are ignored (with a development warning). Read by
     * ColumnChart, ColumnChartStacked and BoxPlotV; LollipopVChart has no
     * width to size and ignores it.
     */
    barWidth?: number;
  };

  /** Custom conversion function */
  convert?: (d: any) => any;

  /** Binning configuration for continuous data */
  bin?: {
    /** Number of bins to create */
    count: number;
    /** Explicit bin edge thresholds (overrides count) */
    thresholds?: number[];
    /** Custom label formatter for bin ranges */
    labelFormat?: (low: number, high: number) => string;
  };

  /** Axis display configuration */
  axis?: {
    /** Position of the axis */
    location?: 'top' | 'bottom' | 'left' | 'right';
    /** Number of ticks to display */
    ticks?: number;
    /** Label text for the axis */
    label?: string;
  };

  /** CSS class name for styling */
  className?: string;

  /** CSS class name for negative values */
  classNameNegative?: string;
}

/**
 * Axis configuration for a value axis whose position is driven by other keys
 * (e.g. box-plot statistic keys or range from/to keys), so `key` is not read
 * and may be omitted. Every `AxisConfig` is assignable to this type.
 */
export type ValueAxisConfig<TData = unknown> = Omit<AxisConfig<TData>, 'key'> & {
  /** Data key — not read by charts that use this config; optional */
  key?: Extract<keyof TData, string> | string;
};

/**
 * Extended axis configuration for multi-series charts (line, area)
 */
export interface SeriesAxisConfig<TData = any> extends AxisConfig<TData> {
  /** Curve type for line interpolation */
  curve?: 'rounded' | 'step' | 'line' | 'bumpX';

  /** Symbol shape for data points */
  symbol?: 'none' | 'circle' | 'square' | 'star' | 'triangle' | 'wye' | 'cross' | 'diamond';

  /** Size of the symbol */
  size?: number;

  /** Label configuration for series */
  label?: {
    show?: boolean;
    position?: 'left' | 'right';
    className?: string;
  };

  /** How to handle unknown/missing values */
  unknown?: any;
}

/**
 * Standardized tooltip configuration
 */
export interface TooltipConfig {
  /** CSS class name for tooltip styling */
  className?: string;
  /** Custom HTML generator function */
  html?: (d: any) => string;
  /** Keys to display in tooltip */
  keys?: string[];
  /** Inline styles for tooltip */
  style?: React.CSSProperties;
}

export interface ChartProps<TData = any> {
  id: string;
  data?: TData[];
  className?: string;
  padding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
    bar?: number;
  };
  margin?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  drawing?: {
    duration?: number;
    delay?: number;
  };
  zooming?: {
    enabled?: boolean;
    min?: number;
    max?: number;
  };
  style?: React.CSSProperties;
}

/**
 * Base props for gauge-type charts (single value visualizations)
 * Unlike ChartProps, gauges typically display a single numeric value rather than an array
 */
export interface GaugeProps<TData = any> {
  /** Unique identifier for the chart */
  id: string;
  /** CSS class name for styling */
  className?: string;
  /** Single numeric value to display (gauges show one value, not arrays) */
  data?: TData extends number ? TData : number;
  /** Margin around the gauge */
  margin?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  /** Animation configuration */
  drawing?: {
    duration?: number;
    delay?: number;
  };
  /** Tooltip configuration */
  tooltip?: TooltipConfig;
  /** Inline styles */
  style?: React.CSSProperties;
}
