// Standardized Axis Configuration Types

/**
 * Flexible axis configuration that works for both categorical and continuous data
 */
export interface AxisConfig<TData = any> {
  /** Data key to map to this axis */
  key: Extract<keyof TData, string> | string;

  /** Starting value for the axis domain (for continuous/value axes) */
  start?: number;

  /** Ending value for the axis domain (for continuous/value axes) */
  end?: number;

  /** Scaling function type (for continuous axes) */
  scalingFunction?: 'linear' | 'time';

  /** Time series configuration (when scalingFunction='time') */
  time?: {
    /** Date format string */
    format?: string;
    /** Whether the date is in ISO format */
    isISO?: boolean;
  };

  /** Custom conversion function */
  convert?: (d: any) => any;

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
