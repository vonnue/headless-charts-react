import { format as d3format } from 'd3-format';
import { ScaleTime, scaleBand, scaleLinear } from 'd3-scale';
import { pointer, select } from 'd3-selection';
import { timeFormat, utcFormat } from 'd3-time-format';
import 'd3-transition';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { twMerge } from 'tailwind-merge';

import { drawAxis } from '@/hooks/useAxis';
import useTooltip from '@/hooks/useTooltip';
import { AxisConfig, ChartProps, TooltipConfig } from '@/types';
import { defaultChartClassNames } from '@/utils';
import { isFiniteNumber } from '@/utils/domain';
import measureSvg from '@/utils/measureSvg';
import { warnOnceInDev } from '@/utils/devEnvironment';
import {
  DEFAULT_TIME_FORMAT,
  createTimeBarLayout,
  makeDateFormatter,
  useTimeAxisWarnings,
  warnIfBarWidthCapped,
} from '@/utils/timeScale';
import {
  Candle,
  CandleDatum,
  isUtcTime,
  prepareCandles,
  withResolvedUtc,
} from './ohlc';

export type { CandleDatum } from './ohlc';

type FieldKey<TData> = { key: Extract<keyof TData, string> | string };

// `any` default matches ChartProps<TData = any> and the other charts' props.
export interface CandlestickChartProps<TData = any> extends Omit<ChartProps<TData>, 'zooming' | 'drawing'> { // eslint-disable-line @typescript-eslint/no-explicit-any
  /** One row per period. Unsorted input is sorted by date. */
  data: TData[];
  /**
   * Date key, using the standard `AxisConfig`. Dates are parsed with
   * `x.time.isISO` / `x.time.format` (default `%Y-%m-%d`); `Date` objects and
   * epoch ms are also accepted.
   *
   * Time zone: `x.time.utc` defaults to `true` for `isISO` data and `false`
   * otherwise (the PR #57 rule). `utc: false` keeps local time.
   *
   * The default x axis is a gap-free band over the dates present (one slot per
   * session; weekends and holidays leave no gap). `x.scalingFunction: 'time'`
   * switches to a continuous time axis with elapsed-time spacing and calendar
   * ticks. `x.bin` is ignored.
   */
  x: AxisConfig<TData>;
  /** Open price key. */
  open: FieldKey<TData>;
  /** High price key. */
  high: FieldKey<TData>;
  /** Low price key. */
  low: FieldKey<TData>;
  /** Close price key. */
  close: FieldKey<TData>;
  /** Price axis. `start`/`end` pin it (finite only). There is no forced zero. */
  y?: {
    start?: number;
    end?: number;
    /** Default `d3.format(',~f')`. Used for ticks and tooltips. */
    format?: (v: number) => string;
    axis?: { label?: string; ticks?: number; location?: 'left' | 'right' };
    className?: string;
  };
  /** Default `'candle'`. `'ohlc'` draws a stem with an open tick (left) and a close tick (right). */
  shape?: 'candle' | 'ohlc';
  /** Direction classes. Colour names direction; nothing is coloured by default. */
  classNames?: {
    /** close > open */
    up?: string;
    /** close < open */
    down?: string;
    /** close === open */
    flat?: string;
    /** Extra class on wicks / OHLC stems. */
    wick?: string;
  };
  /** Body width as a fraction of the band or slot, in `(0, 1]`. Default `0.7`. OHLC tick length is half of it. */
  bodyWidth?: number;
  /** Snapped crosshair. Default `false`. */
  crosshair?: boolean | { className?: string };
  tooltip?: TooltipConfig;
  /** Accessible name → SVG `<title>` + `aria-labelledby`. */
  title?: string;
  /** Longer accessible description → SVG `<desc>` + `aria-describedby`. */
  description?: string;
  /** Used only when `title` is omitted. Default `"Candlestick chart"`. */
  ariaLabel?: string;
  /**
   * Enter animation. `duration` and `delay` are the shared ChartProps fields
   * (component default `{ duration: 0 }`); candle `i` starts at `i * delay`.
   *
   * `motion` is Candlestick-specific and is not on shared `ChartProps`.
   * Default `'grow'`: wick and body grow from the open level (the OHLC stem
   * from its midpoint) over `duration`. `'wick-reveal'` is candle-only: the
   * body expands from open out to high and low over `duration / 2`, then
   * shrinks to the open–close rectangle over the other half, leaving the
   * tails. The wick extends with the body in the first half and stays at
   * the range. With `shape: 'ohlc'` it warns and uses `'grow'`.
   * Unknown values warn and use `'grow'`.
   */
  drawing?: {
    duration?: number;
    delay?: number;
    motion?: 'grow' | 'wick-reveal';
  };
}

type TooltipHandlers = Pick<
  ReturnType<typeof useTooltip>,
  'onMouseOver' | 'onMouseMove' | 'onMouseLeave'
>;

const CHART = 'CandlestickChart';
const DEFAULT_STYLE = {};
const DEFAULT_DRAWING = { duration: 0 };
const DEFAULT_MARGIN = { top: 20, right: 20, bottom: 40, left: 50 };
const DEFAULT_BAND_PADDING = 0.2;
const DEFAULT_BODY_WIDTH = 0.7;
const DEFAULT_X_TICKS = 6;
const MIN_BODY_PX = 1;
const defaultPriceFormat = d3format(',~f');
const pctFormat = d3format('+.2~%');

/** Formats a number, `'n/a'` for non-finite values (never NaN / Infinity). */
const safe = (fmt: (v: number) => string, v: number | null | undefined) =>
  typeof v === 'number' && Number.isFinite(v) ? fmt(v) : 'n/a';

const makeDefaultHtml =
  (formatDate: (d: Date) => string, priceFmt: (v: number) => string) =>
  (datum: unknown): string => {
    const d = datum as CandleDatum;
    const f = (v: number) => safe(priceFmt, v);
    const sign = d.change > 0 ? '+' : '';
    const pct = d.changePct === null ? 'n/a' : safe(pctFormat, d.changePct);
    return (
      `${formatDate(d.date)}<br/>` +
      `O ${f(d.open)}&nbsp; H ${f(d.high)}&nbsp; L ${f(d.low)}&nbsp; C ${f(d.close)}<br/>` +
      `chg ${sign}${f(d.change)} (${pct})`
    );
  };

/* catalog:start */
/**
 * Draws each period's open, high, low and close as a wick and a body, coloured
 * by direction, to show price movement and intraperiod range over time.
 *
 * @remarks
 *
 * **Use when**
 * - Each period has an open, high, low and close, and both the open/close
 *   direction and the intraperiod range matter
 * - The series is prices, rates, or a sensor min/max with start and end
 *   values over time
 *
 * **Avoid when**
 * - Only the closing value matters — use LineChart
 * - Each category has a plain min–max interval — use RangePlot
 * - The data is a distribution summary — use BoxPlotV
 * - Colour would be the only cue for direction — use `shape: 'ohlc'` or
 *   hollow up bodies (`fill-transparent`)
 *
 * **Specialised types**
 * - OHLC chart — Set `shape: 'ohlc'`.
 *
 * Also called: candlestick, candlestick chart, japanese candlestick chart, stock chart, financial chart.
 *
 * Answers: range, trend. Required props: `id`, `data`, `x`, `open`, `high`, `low`, `close`.
 *
 * @example
 * ```tsx
 * <CandlestickChart
 *   id="btc"
 *   className="w-full h-96"
 *   data={data}
 *   x={{ key: 'date', time: { isISO: true } }}
 *   open={{ key: 'o' }}
 *   high={{ key: 'h' }}
 *   low={{ key: 'l' }}
 *   close={{ key: 'c' }}
 *   classNames={{ up: 'fill-sky-500 stroke-sky-500', down: 'fill-orange-500 stroke-orange-500' }}
 * />
 * ```
 *
 * @example OHLC chart
 * ```tsx
 * <CandlestickChart
 *   id="ohlc"
 *   className="w-full h-96"
 *   data={data}
 *   x={{ key: 'date', time: { isISO: true } }}
 *   open={{ key: 'o' }}
 *   high={{ key: 'h' }}
 *   low={{ key: 'l' }}
 *   close={{ key: 'c' }}
 *   shape="ohlc"
 * />
 * ```
 *
 * @see LineChart — only the closing value over time matters
 * @see RangePlot — a plain min–max interval per category
 * @see BoxPlotV — a distribution summary per period
 */
/* catalog:end */
const CandlestickChart = <TData = any,>({ // eslint-disable-line @typescript-eslint/no-explicit-any -- matches ChartProps<TData = any>
  data,
  id,
  className,
  x,
  open,
  high,
  low,
  close,
  y,
  shape = 'candle',
  classNames,
  bodyWidth,
  crosshair = false,
  padding,
  margin,
  drawing = DEFAULT_DRAWING,
  tooltip,
  title,
  description,
  ariaLabel,
  style = DEFAULT_STYLE,
}: CandlestickChartProps<TData>) => {
  const plotRef = useRef<SVGGElement>(null);
  const isTime = x.scalingFunction === 'time';

  // The #57 rule, resolved once: every shared helper below gets an explicit
  // `utc`, so the result is the same with or without #57 merged.
  const xResolved = withResolvedUtc(x);
  // The shared warnings run in band mode too (dropped rows, suggest-utc);
  // `x.time.barWidth` is only read in time mode.
  useTimeAxisWarnings(CHART, id, data, { ...xResolved, scalingFunction: 'time' }, {
    checkBarWidth: isTime,
  });

  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: makeDefaultHtml(makeDateFormatter(xResolved), y?.format ?? defaultPriceFormat),
  });

  // The hook handlers are new each render but read the latest config, so the
  // d3 listeners call them through a ref instead of making them redraw deps.
  const tooltipHandlers = useRef<TooltipHandlers | null>(null);
  useLayoutEffect(() => {
    tooltipHandlers.current = { onMouseOver, onMouseMove, onMouseLeave };
  });

  const refreshChart = useCallback(() => {
    if (!plotRef.current) return;
    const svgNode = plotRef.current.ownerSVGElement;
    const root = select(plotRef.current);
    // Named wick-reveal phases are not stopped by a nameless interrupt().
    root
      .selectAll('*')
      .interrupt()
      .interrupt('wick-reveal-expand')
      .interrupt('wick-reveal-shrink');
    root.selectAll('*').remove();

    const xr = withResolvedUtc(x);
    const warn = (issue: string, message: string) =>
      warnOnceInDev(`${CHART}#${id}:${issue}`, `[headless-charts] ${CHART}#${id}: ${message}`);

    if (x.bin) warn('bin', 'x.bin is not supported and is ignored.');

    let bw = DEFAULT_BODY_WIDTH;
    if (bodyWidth !== undefined) {
      if (isFiniteNumber(bodyWidth) && bodyWidth > 0 && bodyWidth <= 1) bw = bodyWidth;
      else
        warn(
          `body-width:${String(bodyWidth)}`,
          `bodyWidth must be a number in (0, 1], got ${String(bodyWidth)}; using ${DEFAULT_BODY_WIDTH}.`
        );
    }

    const prepared = prepareCandles(data, {
      x: xr,
      open: open.key,
      high: high.key,
      low: low.key,
      close: close.key,
    });
    const { candles } = prepared;
    if (prepared.invalidOhlc > 0)
      warn(
        'invalid-ohlc',
        `${prepared.invalidOhlc} row(s) have a missing or non-finite open/high/low/close value; they are not drawn.`
      );
    if (prepared.highBelowLow > 0)
      warn('high-below-low', `${prepared.highBelowLow} row(s) have high < low; they are not drawn.`);
    if (prepared.outsideRange > 0)
      warn(
        'outside-range',
        `${prepared.outsideRange} row(s) have open or close outside [low, high]; the wick is extended to cover the body.`
      );
    if (prepared.duplicates > 0)
      warn(
        'duplicate-dates',
        `${prepared.duplicates} row(s) repeat an earlier date; the first row for each date is drawn.`
      );
    if (candles.length === 0) return;

    // --- price domain: niced low..high (drawn extent), no forced zero.
    let lo = Math.min(...candles.map((c) => c.drawLow));
    let hi = Math.max(...candles.map((c) => c.drawHigh));
    let niced: number[];
    if (lo === hi) {
      lo -= 1;
      hi += 1;
      niced = [lo, hi];
    } else niced = scaleLinear().domain([lo, hi]).nice().domain();
    let yStart = isFiniteNumber(y?.start) ? y?.start : undefined;
    let yEnd = isFiniteNumber(y?.end) ? y?.end : undefined;
    if (yStart !== undefined && yEnd !== undefined && yStart > yEnd) {
      warn('y-domain', `y.start (${yStart}) > y.end (${yEnd}); both pins are ignored.`);
      yStart = yEnd = undefined;
    }
    const yDomain: [number, number] = [yStart ?? niced[0], yEnd ?? niced[1]];

    // --- plot rect
    const m = { ...DEFAULT_MARGIN, ...margin };
    const p = { top: 0, right: 0, bottom: 0, left: 0, ...padding };
    const { width, height } = measureSvg(svgNode);
    const plotLeft = m.left + p.left,
      plotRight = Math.max(plotLeft, width - m.right - p.right),
      plotTop = m.top + p.top,
      plotBottom = Math.max(plotTop, height - m.bottom - p.bottom);
    const plotH = plotBottom - plotTop;

    const bandPadding =
      isFiniteNumber(p.bar) && p.bar >= 0 && p.bar < 1 ? p.bar : DEFAULT_BAND_PADDING;
    const xRange: [number, number] = [plotLeft, plotRight];

    // --- x: gap-free band (default) or continuous time
    let centre: (c: Candle<TData>) => number;
    let markBand: number; // width the body fraction applies to
    let hitWidth: number;
    let timeScale: ScaleTime<number, number> | undefined;
    const bandFn = scaleBand<string>()
      .domain(candles.map((c) => c.key))
      .range(xRange)
      .padding(bandPadding);
    if (isTime) {
      const layout = createTimeBarLayout(
        candles,
        xr,
        (c) => c.datum.date,
        xRange,
        bandPadding,
        x.time?.barWidth
      );
      warnIfBarWidthCapped(CHART, id, layout);
      timeScale = layout.scale;
      const ts = layout.scale;
      centre = (c) => ts(c.datum.date);
      markBand = layout.width;
      hitWidth = layout.slotPx;
    } else {
      const band = bandFn.bandwidth();
      centre = (c) => (bandFn(c.key) ?? plotLeft) + band / 2;
      markBand = band;
      hitWidth = band;
    }
    const bodyPx = bw * markBand;
    const tickPx = bodyPx / 2;

    const yFn = scaleLinear().domain(yDomain).range([plotBottom, plotTop]);

    // --- axes
    const axesG = root.append('g').attr('class', 'axes');
    const dims = { width, height };
    const xTicks = isFiniteNumber(x.axis?.ticks) && x.axis.ticks > 0 ? x.axis.ticks : DEFAULT_X_TICKS;
    const xAxis = drawAxis({
      g: axesG,
      scale: timeScale ?? bandFn,
      config: { axis: { label: x.axis?.label, ticks: xTicks } },
      dimensions: dims,
      margin: m,
      padding: p,
      orientation: 'horizontal',
      className: twMerge('axis axis--x', x.className),
    });
    if (!isTime) {
      const k = Math.max(1, Math.ceil(candles.length / xTicks));
      const fmt = (isUtcTime(xr) ? utcFormat : timeFormat)(x.time?.format || DEFAULT_TIME_FORMAT);
      const byKey = new Map(candles.map((c) => [c.key, c.datum.date]));
      xAxis.axisG.call(
        xAxis.axis
          .tickValues(candles.filter((_, i) => i % k === 0).map((c) => c.key))
          .tickFormat((key: string) => {
            const date = byKey.get(key);
            return date ? fmt(date) : '';
          })
      );
    }
    const yLocation = y?.axis?.location === 'right' ? 'right' : 'left';
    const priceAxis = drawAxis({
      g: axesG,
      scale: yFn,
      config: { axis: { label: y?.axis?.label, ticks: y?.axis?.ticks ?? 5, location: yLocation } },
      dimensions: dims,
      margin: m,
      padding: p,
      orientation: 'vertical',
      className: twMerge('axis axis--y axis--price', y?.className),
    });
    priceAxis.axisG.call(priceAxis.axis.tickFormat(y?.format ?? defaultPriceFormat));

    // --- price marks, clipped to the plot (pins may be narrower than data)
    const clipId = `${id}-price-clip`;
    root
      .append('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('x', plotLeft)
      .attr('y', plotTop)
      .attr('width', plotRight - plotLeft)
      .attr('height', Math.max(0, plotH));
    const candlesG = root
      .append('g')
      .attr('class', 'candles')
      .attr('data-testid', 'candles')
      .attr('clip-path', `url(#${clipId})`);

    const duration = isFiniteNumber(drawing?.duration) ? drawing.duration : 0;
    const delay = isFiniteNumber(drawing?.delay) && drawing.delay > 0 ? drawing.delay : 0;
    const animate = duration > 0;
    // Motion is resolved once per refresh. Omitted, unknown or invalid → 'grow'.
    const rawMotion: unknown = drawing?.motion;
    if (rawMotion === 'wick-reveal' && shape === 'ohlc')
      warn('wick-reveal-ohlc', "drawing.motion 'wick-reveal' is only for shape 'candle'; using 'grow'.");
    else if (rawMotion !== undefined && rawMotion !== 'grow' && rawMotion !== 'wick-reveal')
      warn('drawing-motion', `unknown drawing.motion '${String(rawMotion)}'; using 'grow'.`);
    const wickReveal = animate && rawMotion === 'wick-reveal' && shape !== 'ohlc';
    const half = duration / 2;
    const dirClass = (c: Candle<TData>) =>
      twMerge('candle fill-current stroke-current', classNames?.[c.datum.direction]);
    const wickClass = twMerge('candle-wick', classNames?.wick);

    // Staggered draw-in: candle i (date order, first date first) starts
    // i * delay after the first, so each candle waits `delay` after the one before.
    candles.forEach((c, i) => {
      const wait = i * delay;
      const d = c.datum;
      const cx = centre(c);
      const g = candlesG
        .append('g')
        .attr('data-testid', 'candle')
        .attr('data-date', d.date.toISOString())
        .attr('data-direction', d.direction)
        .attr('class', dirClass(c));
      const yHigh = yFn(c.drawHigh),
        yLow = yFn(c.drawLow);
      if (shape === 'ohlc') {
        const yMid = (yHigh + yLow) / 2;
        const stem = g
          .append('line')
          .attr('data-testid', 'ohlc-stem')
          .attr('class', twMerge('ohlc-stem', classNames?.wick))
          .attr('x1', cx)
          .attr('x2', cx)
          .attr('y1', animate ? yMid : yHigh)
          .attr('y2', animate ? yMid : yLow);
        if (animate)
          stem.transition().duration(duration).delay(wait).attr('y1', yHigh).attr('y2', yLow);
        const open = g
          .append('line')
          .attr('data-testid', 'ohlc-open')
          .attr('class', 'ohlc-open')
          .attr('x1', cx - tickPx)
          .attr('x2', cx)
          .attr('y1', yFn(d.open))
          .attr('y2', yFn(d.open));
        const close = g
          .append('line')
          .attr('data-testid', 'ohlc-close')
          .attr('class', 'ohlc-close')
          .attr('x1', cx)
          .attr('x2', cx + tickPx)
          .attr('y1', yFn(d.close))
          .attr('y2', yFn(d.close));
        // Ticks stay at their final y; they are hidden until this candle's
        // stem starts growing, then shown (the opacity attribute is removed).
        if (animate)
          [open, close].forEach((tick) =>
            tick.attr('opacity', 0).transition().duration(0).delay(wait).attr('opacity', null)
          );
        return;
      }
      const yOpen = yFn(d.open);
      const wick = g
        .append('line')
        .attr('data-testid', 'candle-wick')
        .attr('class', wickClass)
        .attr('x1', cx)
        .attr('x2', cx)
        .attr('y1', animate ? yOpen : yHigh)
        .attr('y2', animate ? yOpen : yLow);
      // wick-reveal: the wick extends with the body in phase 1, then stays
      // at high–low so the tails are left as the body shrinks in phase 2.
      if (animate)
        wick
          .transition()
          .duration(wickReveal ? half : duration)
          .delay(wait)
          .attr('y1', yHigh)
          .attr('y2', yLow);
      const yTop = yFn(Math.max(d.open, d.close)),
        yBottom = yFn(Math.min(d.open, d.close));
      const rawH = yBottom - yTop;
      // Doji / sub-pixel bodies: at least 1px, centred on the open/close level.
      const bodyH = Math.max(MIN_BODY_PX, rawH);
      const bodyY = rawH >= MIN_BODY_PX ? yTop : (yTop + yBottom) / 2 - MIN_BODY_PX / 2;
      const rangeH = Math.max(0, yLow - yHigh);
      const body = g
        .append('rect')
        .attr('data-testid', 'candle-body')
        .attr('class', 'candle-body')
        .attr('x', cx - bodyPx / 2)
        .attr('width', bodyPx)
        .attr('y', animate ? yOpen : bodyY)
        .attr('height', animate ? 0 : bodyH);
      if (animate) {
        if (wickReveal) {
          // Two named transitions so both can be scheduled up front:
          // phase 2 starts at wait + duration/2, from whatever attrs
          // phase 1 left (d3 creates the interpolator when that delay elapses).
          body
            .transition('wick-reveal-expand')
            .duration(half)
            .delay(wait)
            .attr('y', yHigh)
            .attr('height', rangeH);
          body
            .transition('wick-reveal-shrink')
            .duration(half)
            .delay(wait + half)
            .attr('y', bodyY)
            .attr('height', bodyH);
        } else {
          body
            .transition()
            .duration(duration)
            .delay(wait)
            .attr('y', bodyY)
            .attr('height', bodyH);
        }
      }
    });

    // --- hit areas: full band/slot wide, full plot height, above marks
    const hitG = root.append('g').attr('class', 'hit-areas');
    const crossOpt = crosshair === true ? {} : crosshair || null;
    const crossG = crossOpt
      ? root
          .append('g')
          .attr('class', 'crosshair')
          .attr('data-testid', 'crosshair')
          .attr('pointer-events', 'none')
      : null;
    const crossClass = twMerge('crosshair stroke-current', crossOpt?.className);
    const crossX = crossG
      ?.append('line')
      .attr('data-testid', 'crosshair-x')
      .attr('class', crossClass)
      .attr('pointer-events', 'none')
      .attr('visibility', 'hidden')
      .attr('y1', plotTop)
      .attr('y2', plotBottom);
    const crossY = crossG
      ?.append('line')
      .attr('data-testid', 'crosshair-y')
      .attr('class', crossClass)
      .attr('pointer-events', 'none')
      .attr('visibility', 'hidden')
      .attr('x1', plotLeft)
      .attr('x2', plotRight);
    const moveCrossY = (event: MouseEvent) => {
      if (!crossY || !svgNode) return;
      const [, py] = pointer(event, svgNode);
      if (Number.isFinite(py) && py >= plotTop && py <= plotBottom)
        crossY.attr('y1', py).attr('y2', py).attr('visibility', 'visible');
      else crossY.attr('visibility', 'hidden');
    };

    hitG
      .selectAll('rect')
      .data(candles)
      .enter()
      .append('rect')
      .attr('data-testid', 'candle-hit')
      .attr('data-date', (c) => c.datum.date.toISOString())
      .attr('x', (c) => centre(c) - hitWidth / 2)
      .attr('y', plotTop)
      .attr('width', hitWidth)
      .attr('height', plotH)
      .attr('fill', 'transparent')
      .attr('pointer-events', 'all')
      .on('mouseenter', (event: MouseEvent, c) => {
        if (crossX) {
          const cx = centre(c);
          crossX.attr('x1', cx).attr('x2', cx).attr('visibility', 'visible');
          moveCrossY(event);
        }
        tooltipHandlers.current?.onMouseOver(event, c.datum);
      })
      .on('mousemove', (event: MouseEvent) => {
        moveCrossY(event);
        tooltipHandlers.current?.onMouseMove(event);
      })
      .on('mouseleave', () => {
        crossX?.attr('visibility', 'hidden');
        crossY?.attr('visibility', 'hidden');
        tooltipHandlers.current?.onMouseLeave();
      });
  }, [
    data,
    id,
    x,
    open,
    high,
    low,
    close,
    y,
    shape,
    classNames,
    bodyWidth,
    crosshair,
    padding,
    margin,
    drawing,
    isTime,
  ]);

  useEffect(() => {
    refreshChart();
    // Hold the node: on unmount the cleanup runs after the svg has left the
    // document, so interrupt through this reference, not a lookup by id.
    const plot = plotRef.current;
    return () => {
      if (plot)
        select(plot)
          .selectAll('*')
          .interrupt()
          .interrupt('wick-reveal-expand')
          .interrupt('wick-reveal-shrink');
    };
    // style is not read by refreshChart, but it sets the size refreshChart measures.
  }, [refreshChart, style?.width, style?.height]);

  const titleId = title ? `${id}-title` : undefined;
  const descId = description ? `${id}-desc` : undefined;

  return (
    <svg
      id={id}
      style={style}
      className={twMerge(defaultChartClassNames, className)}
      role='img'
      aria-labelledby={titleId}
      aria-describedby={descId}
      aria-label={title ? undefined : ariaLabel ?? 'Candlestick chart'}
      data-testid='candlestick-chart'
    >
      {title ? <title id={titleId}>{title}</title> : null}
      {description ? <desc id={descId}>{description}</desc> : null}
      <g ref={plotRef} className='candlestick-plot' />
    </svg>
  );
};

export default CandlestickChart;
