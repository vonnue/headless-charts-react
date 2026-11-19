import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type CSSProperties,
} from 'react';
import { max, min } from 'd3-array';
import { format as d3format } from 'd3-format';
import {
  scaleBand,
  scaleLinear,
  type ScaleBand,
  type ScaleTime,
} from 'd3-scale';
import { select } from 'd3-selection';
import 'd3-transition';
import { twMerge } from 'tailwind-merge';

import { drawAxis } from '@/hooks/useAxis';
import useTooltip, { type UseTooltipResult } from '@/hooks/useTooltip';
import type {
  AxisConfig,
  ChartOrientation,
  ChartProps,
  TooltipConfig,
} from '@/types';
import { defaultChartClassNames, bin1D } from '@/utils';
import { clampToDomain, isFiniteNumber, pinnedEnd, pinnedStart } from '@/utils/domain';
import { warnOnceInDev } from '@/utils/devEnvironment';
import { interruptTransitions } from '@/utils/interruptTransitions';
import measureSvg from '@/utils/measureSvg';
import {
  orientationMessages,
  resolveOrientation,
  type OrientationEvidence,
  warnOrientation,
  warnOrientationResolution,
} from '@/utils/orientation';
import {
  createTimeBarLayout,
  makeDateAccessor,
  makeDateFormatter,
  timePosition,
  useTimeAxisWarnings,
  warnIfBarWidthCapped,
} from '@/utils/timeScale';

/** A value series: one bar (or segment) per row. */
export interface BarSeriesConfig<TData = any> extends AxisConfig<TData> {
  /** Corner radius in px. Default 0. */
  rx?: number;
}

/** The category axis. */
export interface BarCategoryConfig<TData = any> extends AxisConfig<TData> {
  /** Px removed from each bar's thickness (BarChart's `y.padding` today). Default 0. */
  padding?: number;
}

/** @deprecated Use {@link BarSeriesConfig}. */
export type BarAxisConfig<TData = any> = BarSeriesConfig<TData>;

/** A line across the plot at a value. Use `y` in vertical and `x` in horizontal. */
export interface BarReferenceLine {
  x?: number;
  y?: number;
  className?: string;
}

export interface BarDataLabel<TData = any> {
  className?: string;
  /** Label text. Default: the value. */
  text?: (row: TData, series: BarSeriesConfig<TData>) => string;
}

interface BarChartBaseProps<TData> extends ChartProps<TData> {
  data: TData[];
  /** Horizontal only: bars grow to the right (default) or to the left. */
  direction?: 'left' | 'right';
  referenceLines?: BarReferenceLine[];
  dataLabel?: BarDataLabel<TData>;
  /** d3-format specifier for value-axis ticks. */
  tickFormat?: string;
  /** Integer value-axis ticks. */
  wholeNumbers?: boolean;
  /** @deprecated Use `padding.bar`. Read only when `padding.bar` is not set. */
  paddingBar?: number;
  tooltip?: TooltipConfig;
}

/** Vertical (default): categories on x, series on y. */
export interface BarChartVerticalProps<TData = any> extends BarChartBaseProps<TData> {
  orientation?: 'vertical';
  x: BarCategoryConfig<TData>;
  y: BarSeriesConfig<TData>[];
}

/** Horizontal: categories on y, series on x. */
export interface BarChartHorizontalProps<TData = any> extends BarChartBaseProps<TData> {
  orientation?: 'horizontal';
  y: BarCategoryConfig<TData>;
  x: BarSeriesConfig<TData>[];
}

export type BarChartProps<TData = any> =
  | BarChartVerticalProps<TData>
  | BarChartHorizontalProps<TData>;

export type ColumnChartProps<TData = any> = BarChartVerticalProps<TData>;
/** @deprecated Use {@link ColumnChartProps}. */
export type ColumnChartGroupedProps<TData = any> = ColumnChartProps<TData>;

export type BarChartName = 'BarChart' | 'ColumnChart';

/** Set by the public component or a wrapper; not part of the public props. */
export interface BarRendererProps {
  /** The component the caller rendered, for warnings */
  chartName: BarChartName;
  /** Orientation a wrapper pins */
  pinned?: ChartOrientation;
}

type Row = Record<string, unknown>;
type TooltipHandlers = Pick<
  UseTooltipResult,
  'onMouseOver' | 'onMouseMove' | 'onMouseLeave'
>;

const VERTICAL_MARGIN = { top: 40, bottom: 40, left: 40, right: 40 };
const DEFAULT_PADDING: NonNullable<ChartProps['padding']> = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_DRAWING: NonNullable<ChartProps['drawing']> = { duration: 0 };
const DEFAULT_STYLE: CSSProperties = {};
const DEFAULT_REFERENCE_LINES: BarReferenceLine[] = [];
const EMPTY_DATA: never[] = [];
const NO_TIME_AXIS: AxisConfig = { key: '' };
const COUNT_KEY = 'count';

const num = (d: Row, key: string): number => {
  const v = d[key];
  // null/'' would coerce to 0; treat them as missing so the non-finite rule applies.
  return v == null || v === '' ? Number.NaN : Number(v);
};

const isSeriesArray = (value: unknown): value is BarSeriesConfig[] =>
  Array.isArray(value);

const barEvidence = (x: unknown, y: unknown): OrientationEvidence | null => {
  const xArr = isSeriesArray(x);
  const yArr = isSeriesArray(y);
  if (xArr && !yArr) return { orientation: 'horizontal', clause: 'the series array is on x' };
  if (yArr && !xArr) return { orientation: 'vertical', clause: 'the series array is on y' };
  return null;
};

const horizontalMargin = (
  series: BarSeriesConfig[] | undefined,
  direction: 'left' | 'right',
) => ({
  top: series?.some((column) => column.axis?.location === 'top') ? 60 : 40,
  bottom: series?.some((column) => column.axis?.location === 'bottom') ? 60 : 40,
  left: 60,
  right: direction === 'right' ? 20 : 40,
});

const resolveBandPadding = (
  paddingBarProp: number | undefined,
  paddingBarKey: number | undefined,
  fallback: number,
): number => {
  if (isFiniteNumber(paddingBarKey)) return paddingBarKey;
  if (isFiniteNumber(paddingBarProp)) return paddingBarProp;
  return fallback;
};


/**
 * The shared renderer behind `BarChart` and `ColumnChart`.
 * @internal Use one of the exported components.
 */
export const BarRenderer = <TData,>(
  props: BarChartProps<TData> & BarRendererProps,
) => {
  const {
    chartName,
    pinned,
    className,
    data: dataProp,
    id,
    direction: givenDirection,
    referenceLines = DEFAULT_REFERENCE_LINES,
    dataLabel,
    tickFormat,
    wholeNumbers = false,
    paddingBar,
    tooltip,
    drawing = DEFAULT_DRAWING,
    style = DEFAULT_STYLE,
    orientation: givenOrientation,
  } = props;
  const data = (dataProp ?? EMPTY_DATA) as TData[];
  const svgRef = useRef<SVGSVGElement>(null);

  const evidence = barEvidence(props.x, props.y);
  const resolution = resolveOrientation({
    pinned,
    given: givenOrientation,
    evidence,
  });
  const orientation = resolution.orientation;
  const isVertical = orientation === 'vertical';
  const mismatch = resolution.mismatch;
  const direction: 'left' | 'right' =
    isVertical ? 'right' : givenDirection === 'left' ? 'left' : 'right';

  const series = (isVertical ? props.y : props.x) as BarSeriesConfig<TData>[] | undefined;
  const category = (isVertical ? props.x : props.y) as BarCategoryConfig<TData> | undefined;

  const padding = props.padding ?? DEFAULT_PADDING;
  const margin = useMemo(
    () => props.margin ?? (isVertical ? VERTICAL_MARGIN : horizontalMargin(series, direction)),
    [props.margin, isVertical, series, direction],
  );
  const bandPadding = resolveBandPadding(
    paddingBar,
    padding.bar,
    isVertical ? 0.2 : 0.1,
  );

  const valueAxis = isVertical ? 'y' : 'x';
  const categoryAxis = isVertical ? 'x' : 'y';
  const otherAxis = isVertical ? 'x' : 'y';

  const categoryBin = category?.bin;
  const legacySeriesBin =
    !isVertical && isSeriesArray(props.x) ? props.x[0]?.bin : undefined;
  const timeRequested = category?.scalingFunction === 'time';
  const isTime = isVertical && timeRequested;
  const binConfig = isTime ? undefined : (categoryBin ?? legacySeriesBin);
  const isBinned = binConfig != null;

  useEffect(() => {
    warnOrientationResolution(chartName, 'BarChart', id, resolution);
    if (!isVertical && timeRequested) {
      warnOrientation(
        chartName,
        id,
        'time-ignored',
        orientationMessages.timeIgnored(),
      );
    }
    if (isVertical && givenDirection) {
      warnOnceInDev(
        `${chartName}#${id}:direction-ignored`,
        `[headless-charts] ${chartName}#${id}: direction is only read when orientation is "horizontal".`,
      );
    }
    if (!isVertical && categoryBin && legacySeriesBin) {
      warnOnceInDev(
        `${chartName}#${id}:bin-both`,
        `[headless-charts] ${chartName}#${id}: bin is set on both y and x[0]; x[0].bin is ignored.`,
      );
    }
  }, [
    chartName,
    id,
    resolution,
    isVertical,
    timeRequested,
    givenDirection,
    categoryBin,
    legacySeriesBin,
  ]);

  const categoryKey = category?.key ?? '';
  const timeAxis = (isVertical ? props.x : undefined) as AxisConfig<TData> | undefined;
  const xKey = timeAxis?.key;
  const xTimeFormat = timeAxis?.time?.format;
  const xTimeIsISO = timeAxis?.time?.isISO;
  const xTimeUtc = timeAxis?.time?.utc;
  const toDateTime = useMemo(
    () =>
      makeDateAccessor<Row>({
        key: xKey ?? '',
        time: { format: xTimeFormat, isISO: xTimeIsISO, utc: xTimeUtc },
      }),
    [xKey, xTimeFormat, xTimeIsISO, xTimeUtc],
  );
  const formatDate = makeDateFormatter(timeAxis ?? NO_TIME_AXIS);
  useTimeAxisWarnings(chartName, id, data, isTime && timeAxis ? timeAxis : NO_TIME_AXIS);

  const seriesKeys = isSeriesArray(series) ? series.map((column) => column.key) : [];

  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: (d: Row) => {
      const row = d ?? {};
      const date = isTime ? toDateTime(row) : null;
      const categoryValue = date
        ? formatDate(date)
        : String(row[categoryKey] ?? '');
      const keys = isBinned ? [COUNT_KEY] : seriesKeys;
      return `${categoryValue} <br/> ${keys.map((key) => `${key}: ${row[key]}`).join('<br/>')}`;
    },
  });

  const tooltipHandlers = useRef<TooltipHandlers | null>(null);
  useLayoutEffect(() => {
    tooltipHandlers.current = { onMouseOver, onMouseMove, onMouseLeave };
  });

  const refreshChart = useCallback(() => {
    const svgNode = svgRef.current;
    if (!svgNode) return;
    const svg = select(svgNode);
    interruptTransitions(svgNode);
    svg.selectAll('*').remove();
    if (mismatch) return;

    const { width, height } = measureSvg(svgNode);
    const m = {
      top: margin.top ?? 0,
      right: margin.right ?? 0,
      bottom: margin.bottom ?? 0,
      left: margin.left ?? 0,
    };
    const p = {
      top: padding.top ?? 0,
      right: padding.right ?? 0,
      bottom: padding.bottom ?? 0,
      left: padding.left ?? 0,
    };
    const plotLeft = m.left + p.left;
    const plotRight = width - m.right - p.right;
    const plotTop = m.top + p.top;
    const plotBottom = height - m.bottom - p.bottom;
    const horizontalRange: [number, number] =
      !isVertical && direction === 'left'
        ? [plotRight, plotLeft]
        : [plotLeft, plotRight];
    const verticalValueRange: [number, number] = [plotBottom, plotTop];
    const verticalCategoryRange: [number, number] = [plotTop, plotBottom];

    const rawCategory = category ?? { key: categoryKey };
    const rawSeries = isSeriesArray(series) ? series : [];

    let effectiveData: Row[];
    let effectiveSeries: BarSeriesConfig[];
    let effectiveCategory: BarCategoryConfig;
    let binSource: BarSeriesConfig | BarCategoryConfig | undefined;

    if (isBinned && binConfig) {
      binSource = isVertical
        ? rawCategory
        : categoryBin
          ? rawCategory
          : isSeriesArray(props.x)
            ? props.x[0]
            : rawCategory;
      const binAxis = { ...binSource, bin: binConfig };
      const bins = bin1D(data as Row[], binAxis);
      const labelKey = rawCategory.key || binSource.key || '_binLabel';
      effectiveData = bins.map((b) => ({ [labelKey]: b.label, [COUNT_KEY]: b.count }));
      effectiveCategory = { ...rawCategory, key: labelKey, bin: undefined };
      const styleSource = rawSeries[0] ?? binSource;
      effectiveSeries = [
        {
          key: COUNT_KEY,
          className: styleSource?.className,
          rx: (styleSource as BarSeriesConfig | undefined)?.rx,
        },
      ];
    } else {
      effectiveData = isTime
        ? (data as Row[]).filter((d) => toDateTime(d) != null)
        : (data as Row[]);
      effectiveCategory = rawCategory;
      effectiveSeries = rawSeries;
    }

    const g = svg.append('g');
    const clipId = `${id}-plot-clip`;
    svg
      .append('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('x', plotLeft)
      .attr('y', plotTop)
      .attr('width', Math.max(0, plotRight - plotLeft))
      .attr('height', Math.max(0, plotBottom - plotTop));

    const categoryRange = isVertical ? horizontalRange : verticalCategoryRange;
    const valueRange = isVertical ? verticalValueRange : horizontalRange;

    let categoryScale: ScaleBand<string> | ScaleTime<number, number>;
    let bandStart: (d: Row) => number;
    let bandSize: number;
    let slotSize: number;
    if (isTime && timeAxis) {
      const layout = createTimeBarLayout(
        effectiveData,
        timeAxis,
        toDateTime,
        categoryRange,
        bandPadding,
        timeAxis.time?.barWidth,
      );
      warnIfBarWidthCapped(chartName, id, layout);
      const timeXFn = layout.scale;
      categoryScale = timeXFn;
      bandSize = layout.width;
      slotSize = layout.slotPx;
      const timeX = timePosition(timeXFn, toDateTime);
      bandStart = (d) => timeX(d) - bandSize / 2;
    } else {
      const band = scaleBand<string>()
        .domain(effectiveData.map((d) => String(d[effectiveCategory.key] ?? '')))
        .range(categoryRange)
        .padding(bandPadding);
      categoryScale = band;
      bandSize = band.bandwidth();
      slotSize = bandSize;
      bandStart = (d) => band(String(d[effectiveCategory.key] ?? '')) ?? 0;
    }

    const valueOf = (d: Row, key: string) => {
      const v = num(d, key);
      return Number.isFinite(v) ? v : undefined;
    };
    const dataMin = min(effectiveSeries, (column) =>
      min(effectiveData, (d) => valueOf(d, column.key)),
    );
    const dataMax = max(effectiveSeries, (column) =>
      max(effectiveData, (d) => valueOf(d, column.key)),
    );
    const start = pinnedStart(effectiveSeries.map((column) => column.start))
      ?? (dataMin === undefined ? 0 : Math.min(dataMin, 0));
    const end = pinnedEnd(effectiveSeries.map((column) => column.end))
      ?? (dataMax === undefined
        // No finite values: keep a finite [start, start+1] domain so nothing renders NaN.
        ? Math.max(isFiniteNumber(start) ? start : 0, 0) + 1
        : Math.max(dataMax, 0));
    const inverted = isFiniteNumber(start) && isFiniteNumber(end) && start > end;
    if (inverted) {
      warnOnceInDev(
        `${chartName}#${id}:inverted-domain`,
        `${chartName} "${id}": ${valueAxis} start (${start}) > end (${end}); bars cannot render on an inverted axis.`,
      );
    }

    const valueScale = scaleLinear().domain([start, end]).range(valueRange);
    const domain = valueScale.domain() as [number, number];
    const baselineValue = clampToDomain(0, domain);
    const baseline = valueScale(baselineValue);
    const valueEnd = (value: number) =>
      inverted || !Number.isFinite(value)
        ? baseline
        : valueScale(clampToDomain(value, domain));

    const seriesCount = Math.max(1, effectiveSeries.length);
    const slot = bandSize / seriesCount;
    const inset = effectiveCategory.padding ?? 0;
    const rawThickness = slot - inset;
    if (rawThickness <= 0 && inset) {
      const thicknessName = isVertical ? 'width' : 'height';
      warnOnceInDev(
        `${chartName}#${id}:${categoryAxis}.padding`,
        `${chartName}#${id}: ${categoryAxis}.padding (${inset}) >= bar band (${slot.toFixed(1)}px); bars have no ${thicknessName}.`,
      );
    }
    const thickness = Math.max(0, rawThickness);

    const duration = drawing.duration ?? 0;
    const delay = drawing.delay ?? 0;

    const handlers = {
      over: (event: MouseEvent, d: Row) =>
        tooltipHandlers.current?.onMouseOver(event, d),
      move: (event: MouseEvent, d: Row) =>
        tooltipHandlers.current?.onMouseMove(event, d),
      leave: () => tooltipHandlers.current?.onMouseLeave(),
    };

    const barAlong = (value: number) => {
      const endAt = valueEnd(value);
      const lo = Math.min(baseline, endAt);
      const len =
        Number.isFinite(value) && !inverted ? Math.max(0, Math.abs(endAt - baseline)) : 0;
      return { lo, len, endAt };
    };

    const marksG = g
      .append('g')
      .attr('class', 'marks')
      .attr('clip-path', `url(#${clipId})`);

    effectiveSeries.forEach((column, seriesIndex) => {
      if (effectiveData.some((d) => !Number.isFinite(num(d, column.key)))) {
        warnOnceInDev(
          `${chartName}#${id}:${valueAxis}.key:${column.key}`,
          `${chartName}#${id}: non-numeric value for ${valueAxis}.key "${column.key}"; those bars are drawn empty.`,
        );
      }
      const barsG = marksG.append('g');
      const bars = barsG
        .selectAll('rect')
        .data(effectiveData)
        .enter()
        .append('rect')
        .attr('class', (d) =>
          twMerge(
            'fill-current',
            column.classNameNegative && num(d, column.key) < 0
              ? column.classNameNegative
              : column.className,
          ),
        )
        .attr('rx', column.rx || 0)
        .on('mouseenter', handlers.over)
        .on('mousemove', handlers.move)
        .on('mouseleave', handlers.leave);

      if (isVertical) {
        bars
          .attr('x', (d) => bandStart(d) + seriesIndex * slot)
          .attr('width', thickness)
          .attr('y', (d) => (duration ? baseline : barAlong(num(d, column.key)).lo))
          .attr('height', (d) => (duration ? 0 : barAlong(num(d, column.key)).len));
        if (duration) {
          bars
            .transition()
            .duration(duration)
            .delay((_, rowIndex) => rowIndex * delay)
            .attr('y', (d) => barAlong(num(d, column.key)).lo)
            .attr('height', (d) => barAlong(num(d, column.key)).len);
        }
      } else {
        bars
          .attr('y', (d) => bandStart(d) + seriesIndex * slot)
          .attr('height', thickness)
          .attr('x', (d) => (duration ? baseline : barAlong(num(d, column.key)).lo))
          .attr('width', (d) => (duration ? 0 : barAlong(num(d, column.key)).len));
        if (duration) {
          bars
            .transition()
            .duration(duration)
            .delay((_, rowIndex) => rowIndex * delay)
            .attr('x', (d) => barAlong(num(d, column.key)).lo)
            .attr('width', (d) => barAlong(num(d, column.key)).len);
        }
      }

      if (dataLabel) {
        barsG
          .selectAll('text')
          .data(effectiveData)
          .enter()
          .append('text')
          .text((d) =>
            dataLabel.text
              ? dataLabel.text(d as TData, column as BarSeriesConfig<TData>)
              : String(d[column.key] ?? ''),
          )
          .attr('class', twMerge('fill-current', dataLabel.className || ''))
          .attr('data-testid', 'label')
          .attr('font-size', '0.5em')
          .attr('text-anchor', () => {
            if (isVertical) return 'middle';
            return direction === 'left' ? 'start' : 'end';
          })
          .attr('x', (d) => {
            const { endAt } = barAlong(num(d, column.key));
            if (isVertical) return bandStart(d) + seriesIndex * slot + thickness / 2;
            return direction === 'left' ? endAt + 5 : endAt - 2;
          })
          .attr('y', (d) => {
            const value = num(d, column.key);
            const { endAt } = barAlong(value);
            if (!isVertical) {
              return bandStart(d) + (seriesIndex + 1) * slot - slot / 4;
            }
            const inside = value < 0 ? 4 : 12;
            return value < 0 ? endAt - inside : endAt + inside;
          });
      }
    });

    const hitsG = g.append('g').attr('class', 'hits');
    hitsG
      .selectAll('rect')
      .data(effectiveData)
      .enter()
      .append('rect')
      .attr('data-testid', 'bar-hit')
      .attr('fill', 'transparent')
      .attr('x', (d) => {
        if (!isVertical) return plotLeft;
        if (isTime) return bandStart(d) + bandSize / 2 - slotSize / 2;
        return bandStart(d);
      })
      .attr('y', (d) => (isVertical ? plotTop : bandStart(d)))
      .attr('width', isVertical ? slotSize : Math.max(0, plotRight - plotLeft))
      .attr('height', isVertical ? Math.max(0, plotBottom - plotTop) : slotSize)
      .on('mouseenter', handlers.over)
      .on('mousemove', handlers.move)
      .on('mouseleave', handlers.leave);

    referenceLines.forEach((line) => {
      const pos = isVertical ? line.y : line.x;
      const wrong = isVertical ? line.x : line.y;
      if (wrong != null && pos == null) {
        warnOnceInDev(
          `${chartName}#${id}:reference-axis`,
          `[headless-charts] ${chartName}#${id}: referenceLines use ${valueAxis} when orientation is "${orientation}"; ${otherAxis} is ignored.`,
        );
        return;
      }
      if (!isFiniteNumber(pos)) return;
      const along = valueScale(pos);
      const ref = g
        .append('line')
        .attr(
          'class',
          twMerge('reference-line line stroke-current', line.className),
        )
        .attr('stroke', '#dddddd')
        .attr('clip-path', `url(#${clipId})`);
      if (isVertical) {
        ref
          .attr('x1', plotLeft)
          .attr('x2', plotRight)
          .attr('y1', along)
          .attr('y2', along);
      } else {
        ref
          .attr('x1', along)
          .attr('x2', along)
          .attr('y1', plotTop)
          .attr('y2', plotBottom);
      }
    });

    const valueLocation =
      effectiveSeries.find((col) => col.axis?.location)?.axis?.location
      ?? (isVertical ? 'left' : 'bottom');
    // No finite values and no pinned end: the domain is a placeholder, so draw no value ticks.
    const placeholderDomain = dataMax === undefined
      && pinnedEnd(effectiveSeries.map((column) => column.end)) === undefined;
    const valueTicks =
      effectiveSeries[0]?.axis?.ticks
      ?? (wholeNumbers && isFiniteNumber(dataMax) && dataMax < 10 ? dataMax : 5);
    const valueLabel = isBinned
      ? 'Count'
      : effectiveSeries.map((column) => column.axis?.label || column.key || '').join(', ');
    const valueAxisConfig: AxisConfig = {
      key: effectiveSeries[0]?.key || '',
      axis: {
        location: valueLocation as 'top' | 'bottom' | 'left' | 'right',
        ticks: valueTicks,
        label: valueLabel,
      },
    };

    const categoryLocation = isVertical
      ? 'bottom'
      : direction === 'left'
        ? 'right'
        : 'left';
    const categoryAxisConfig: AxisConfig = {
      ...effectiveCategory,
      axis: {
        ...effectiveCategory.axis,
        location: (effectiveCategory.axis?.location ?? categoryLocation) as 'top' | 'bottom' | 'left' | 'right',
      },
    };
    if (isVertical) {
      categoryAxisConfig.axis = {
        ...categoryAxisConfig.axis,
        location: 'bottom',
      };
    } else {
      categoryAxisConfig.axis = {
        ...categoryAxisConfig.axis,
        location: categoryLocation,
      };
    }

    const xScale = isVertical ? categoryScale : valueScale;
    const yScale = isVertical ? valueScale : categoryScale;
    const xConfig = isVertical ? categoryAxisConfig : valueAxisConfig;
    const yConfig = isVertical ? valueAxisConfig : categoryAxisConfig;

    const xAxis = drawAxis({
      g,
      scale: xScale,
      config: xConfig,
      dimensions: { width, height },
      margin,
      padding,
      orientation: 'horizontal',
    });
    const yAxis = drawAxis({
      g,
      scale: yScale,
      config: yConfig,
      dimensions: { width, height },
      margin,
      padding,
      orientation: 'vertical',
    });
    if (tickFormat) {
      const formatted = d3format(tickFormat);
      const valueDrawn = isVertical ? yAxis : xAxis;
      valueDrawn.axisG.call(valueDrawn.axis.tickFormat(formatted));
    }
    if (placeholderDomain) {
      const valueDrawn = isVertical ? yAxis : xAxis;
      valueDrawn.axisG.call(valueDrawn.axis.tickValues([]));
    }
  }, [
    bandPadding,
    binConfig,
    category,
    categoryBin,
    categoryKey,
    chartName,
    data,
    dataLabel,
    direction,
    drawing.delay,
    drawing.duration,
    id,
    isBinned,
    isTime,
    isVertical,
    margin,
    mismatch,
    orientation,
    otherAxis,
    padding,
    props.x,
    referenceLines,
    series,
    tickFormat,
    timeAxis,
    toDateTime,
    valueAxis,
    wholeNumbers,
  ]);

  useEffect(() => {
    refreshChart();
    const node = svgRef.current;
    return () => {
      interruptTransitions(node);
    };
  }, [refreshChart, style?.width, style?.height]);

  return (
    <svg
      ref={svgRef}
      id={id}
      style={style}
      className={twMerge(defaultChartClassNames, className)}
      data-testid='bar-chart'
    />
  );
};

/* catalog:start */
/**
 * Vertical or horizontal bars comparing one or more measures across
 * categories, grouped side by side when several measures are passed. Set
 * `orientation="horizontal"` for long category labels.
 *
 * @remarks
 *
 * **Use when**
 * - Comparing a numeric measure across a modest number of categories with
 *   short labels
 * - Several measures need comparing within each category, side by side
 * - The categories are periods (years, quarters) and individual values
 *   matter more than the trend line
 * - Category labels are long or there are more than ~12 categories — set
 *   `orientation="horizontal"`
 * - Presenting a ranked list, sorted by value — set
 *   `orientation="horizontal"`
 * - Showing a histogram of raw continuous values — set `bin` on the category
 *   config (`x.bin` in vertical, `y.bin` in horizontal)
 * - Bars should grow leftward from the right edge — set
 *   `orientation="horizontal"` and `direction: "left"`
 *
 * **Avoid when**
 * - The measures are parts of one whole — use BarChartStacked or
 *   ColumnChartStacked so the total is readable
 * - The x axis is continuous time with many points — use LineChart
 * - The bars would be nearly equal in height, making differences invisible —
 *   use LollipopChart or a dot-based chart
 * - Two measures should read outward from a shared centre — use SpineChart
 *
 * **Specialised types**
 * - Horizontal bar chart — Set `orientation="horizontal"`; categories go on
 *   `y` and the series array on `x`.
 * - Histogram — Set `x={{ key: "score", bin: { count: 8 } }}` and `y={[{
 *   key: "count" }]}`. Pass the raw rows as `data` — binning and counting
 *   happen internally. Use `bin.thresholds` for explicit edges.
 * - Horizontal histogram — Set `orientation="horizontal"`, `y={{ key, bin
 *   }}` and `x={[{ key: "count" }]}`. Legacy `x[0].bin` is still read; if
 *   both are set, `y.bin` wins.
 * - Diverging bar chart — Supply negative values in the data, set
 *   `start`/`end` on the series to pin a symmetric axis, and style with
 *   `className` plus `classNameNegative`. The example is horizontal.
 * - Time-scaled column chart — Vertical only. Set `x.scalingFunction:
 *   "time"` with `x.time.format`, or `x.time.isISO` for ISO strings. Bar
 *   width comes from the median gap between dates (one slot per step);
 *   `x.time.barWidth` (positive pixels) overrides it but is capped at one
 *   slot, so it can narrow bars but never widen them past their slot. ISO
 *   dates are read, placed and labelled in UTC by default, so calendar days
 *   (`2025-01-31`) land on the right day in every time zone; set
 *   `x.time.utc: false` for the viewer's local time, or `x.time.utc: true`
 *   to read `x.time.format` strings in UTC. Pinned `x.start`/`x.end` (epoch
 *   ms) get no edge padding, so a bar dated exactly on a pinned end is
 *   centred on the plot edge and overhangs it by half a bar; to keep edge
 *   marks inside, pin half a step outside the data (e.g. `start:
 *   Date.UTC(2025, 0, 1) - 12 * 3600_000` for daily data starting 1 Jan
 *   2025).
 *
 * Also called: bar chart, bar graph, column chart, column graph, vertical bar chart, grouped bar chart, grouped column chart, clustered column chart, clustered bar chart.
 *
 * Wrapper components: `ColumnChart` (`orientation="vertical"`). Prefer
 * `<BarChart>` with the prop set in new code; the wrappers remain a stable
 * public API.
 *
 * Answers: comparison, distribution, ranking. Required props: `id`, `data`, `x`, `y`.
 *
 * @example
 * ```tsx
 * <BarChart
 *   id="sales-by-year"
 *   className="w-full h-64"
 *   data={data}
 *   x={{ key: 'year' }}
 *   y={[
 *     { key: 'macbook', className: 'fill-purple-800' },
 *     { key: 'iphone', className: 'fill-purple-600' },
 *   ]}
 * />
 * ```
 *
 * @example Horizontal bar chart
 * ```tsx
 * <BarChart
 *   id="sales-by-region"
 *   className="w-full h-64"
 *   orientation="horizontal"
 *   data={data}
 *   y={{ key: 'region' }}
 *   x={[{ key: 'revenue', className: 'fill-blue-500' }]}
 * />
 * ```
 *
 * @example Histogram
 * ```tsx
 * <BarChart
 *   id="score-histogram"
 *   className="w-full h-64"
 *   data={rawRows}
 *   x={{ key: 'score', bin: { count: 8 }, axis: { label: 'Score' } }}
 *   y={[{ key: 'count', className: 'text-blue-500' }]}
 * />
 * ```
 *
 * @example Horizontal histogram
 * ```tsx
 * <BarChart
 *   id="score-histogram"
 *   className="w-full h-64"
 *   orientation="horizontal"
 *   data={rawRows}
 *   y={{ key: 'score', bin: { count: 8 } }}
 *   x={[{ key: 'count', className: 'fill-blue-500' }]}
 * />
 * ```
 *
 * @example Diverging bar chart
 * ```tsx
 * <BarChart
 *   id="yoy-change"
 *   className="w-full h-64"
 *   orientation="horizontal"
 *   data={data}
 *   x={[{
 *     key: 'delta',
 *     className: 'text-green-500',
 *     classNameNegative: 'text-red-500',
 *     start: -10,
 *     end: 10,
 *     axis: { location: 'top' },
 *   }]}
 *   y={{ key: 'year', padding: 10 }}
 * />
 * ```
 *
 * @example Time-scaled column chart
 * ```tsx
 * <BarChart
 *   id="daily-signups"
 *   className="w-full h-64"
 *   data={data}
 *   x={{ key: 'date', scalingFunction: 'time', time: { isISO: true, utc: true } }}
 *   y={[{ key: 'signups', className: 'fill-purple-600' }]}
 * />
 * ```
 *
 * @see BarChartStacked — measures are parts of a whole and labels are
 *   long
 * @see ColumnChartStacked — measures are parts of a whole, vertical
 * @see LollipopChart — bars look heavy and the value point is the focus
 * @see SpineChart — two opposing measures per category
 * @see LineChart — the axis is continuous time with many points
 */
/* catalog:end */
const BarChart = <TData = any,>(props: BarChartProps<TData>) => (
  <BarRenderer<TData> {...props} chartName='BarChart' />
);

export default BarChart;
