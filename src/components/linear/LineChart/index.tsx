import {
  curveBumpX,
  curveCatmullRom,
  curveLinear,
  curveStep,
  line,
  symbol,
  symbolCircle,
  symbolCross,
  symbolDiamond,
  symbolSquare,
  symbolStar,
  symbolTriangle,
  symbolWye,
} from 'd3-shape';
import { max, min, minIndex } from 'd3-array';
import { pointer, select, selectAll } from 'd3-selection';
import { scaleLinear, scaleTime } from 'd3';
import { useCallback, useEffect } from 'react';

import { timeParse, isoParse } from 'd3-time-format';
import { AxisConfig, ChartProps, SeriesAxisConfig, TooltipConfig } from '@/types';
import { defaultChartClassNames } from '@/utils';
import { easeLinear } from 'd3';
import { twMerge } from 'tailwind-merge';
import { zoom } from 'd3-zoom';
import { drawAxis } from '@/hooks/useAxis';

export interface LineChartProps<TData = any> extends ChartProps<TData> {
  x: AxisConfig<TData>;
  y: Array<SeriesAxisConfig<TData>>;
  tooltip?: TooltipConfig;
  yLeftLabel?: string;
  yRightLabel?: string;
  showGuideLines?: boolean;
  reverse?: boolean;
  referenceLines?: Array<{
    x?: number | string;
    yLeft?: number;
    yRight?: number;
    className?: string;
    showText?: boolean;
  }>;
}

const LineChart = <TData = any,>({
  data = [],
  id,
  className,
  x,
  y,
  tooltip,
  drawing = {},
  zooming,
  padding = {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  margin = {
    top: 40,
    bottom: 40,
    left: 40,
    right: 20,
  },
  referenceLines = [],
  yLeftLabel,
  yRightLabel,
  style = {},
  reverse = false,
  showGuideLines = false,
}: LineChartProps<TData>) => {
  const d3Format = x.time?.format || '%Y-%m-%d';
  const parseDate = timeParse(d3Format);

  const refreshChart = useCallback(() => {
    const shapeMapping = {
      circle: symbolCircle,
      diamond: symbolDiamond,
      triangle: symbolTriangle,
      square: symbolSquare,
      cross: symbolCross,
      star: symbolStar,
      wye: symbolWye,
      default: symbolCircle,
    };

    const curveMapping = {
      rounded: curveCatmullRom,
      step: curveStep,
      line: curveLinear,
      bumpX: curveBumpX,
      default: curveLinear,
    };

    const toDateTime = (d: any): Date =>
      x.time?.isISO
        ? (isoParse(d[x.key]) as Date)
        : (parseDate(d[x.key]) as Date);

    /**
     *
     * @param {scaleLinear} xFunction
     */
    const setDefaultXDomain = (xFunction: any) => {
      x.scalingFunction === 'time'
        ? xFunction.domain([
            Number.isFinite(x.start)
              ? x.start
              : min(data.map((d) => toDateTime(d))),
            Number.isFinite(x.end)
              ? x.end
              : max(data.map((d) => toDateTime(d))),
          ])
        : xFunction.domain([
            Number.isFinite(x.start)
              ? x.start
              : !x.convert
              ? min(data.map((d: any) => d[x.key]))
              : // @ts-ignore
                min(data.map((d: any) => x.convert(d))),
            Number.isFinite(x.start)
              ? x.end
              : x.convert
              ? // @ts-ignore
                max(data.map((d) => x.convert(d)))
              : max(data.map((d: any) => d[x.key])),
          ]);
    };

    const allLeftY = y.filter((column) => column.axis?.location !== 'right'),
      allRightY = y.filter((column) => column.axis?.location === 'right');
    const svg = select(`#${id}`);
    // Clear svg

    svg.selectAll('*').remove();

    const width = +svg.style('width').split('px')[0],
      height = +svg.style('height').split('px')[0];

    const xFn =
      x.scalingFunction === 'time' ? scaleTime().nice() : scaleLinear();

    setDefaultXDomain(xFn);
    xFn.range([
      (margin?.left ?? 0) + (padding?.left ?? 0),
      width - (margin?.right ?? 0) - (padding?.right ?? 0),
    ]);

    const g = svg.append('g');

    const minLeftYs =
        allLeftY.length > 0 &&
        Number.isFinite(min(allLeftY.map((column: any) => column.start)))
          ? min(allLeftY.map((column: any) => column.start))
          : min([
              ...allLeftY.map((column) =>
                min(data.map((d: any) => d[column.key]))
              ),
            ]),
      maxLeftYs =
        allLeftY.length > 0 &&
        Number.isFinite(max(allLeftY.map((column: any) => column.end)))
          ? max(allLeftY.map((column: any) => column.end))
          : max([
              ...allLeftY.map((column) =>
                max(data.map((d: any) => d[column.key]))
              ),
            ]),
      minTicksLeft =
        allLeftY.length > 0 &&
        min(allLeftY.map((column: any) => column.axis?.ticks));

    const yRange =
      x.axis?.location === 'top'
        ? [
            (margin?.top ?? 0) + (padding?.top ?? 0),
            height - (margin?.bottom ?? 0) - (padding?.bottom ?? 0),
          ]
        : [
            height - (margin?.bottom ?? 0) - (padding?.bottom ?? 0),
            (margin?.top ?? 0) + (padding?.top ?? 0),
          ];

    const yLeftFn =
      allLeftY.length > 0 &&
      scaleLinear()
        .domain(reverse ? [maxLeftYs, minLeftYs] : [minLeftYs, maxLeftYs])
        .range(yRange);

    const minRightYs =
        allRightY.length > 0 &&
        min([
          ...allRightY.map((column) =>
            min(data.map((d: any) => d[column.key]))
          ),
          ...allRightY.map((column) => column.start),
        ]),
      maxRightYs =
        allRightY.length > 0 &&
        max([
          ...allRightY.map((column) =>
            max(data.map((d: any) => d[column.key]))
          ),
          ...allRightY.map((column) => column.end),
        ]);

    const yRightFn =
        allRightY.length > 0 &&
        scaleLinear().domain([minRightYs, maxRightYs]).range(yRange),
      minTicksRight =
        allRightY.length > 0 &&
        min(allRightY.map((column: any) => column.axis?.ticks));

    const yLeftLabels =
      allLeftY.length > 0 &&
      allLeftY.map((column: any) => column.axis?.label || column.key);

    const yRightLabels =
      allRightY.length > 0 &&
      allRightY.map((column: any) => column.axis?.label || column.key);

    // Calculate Y-axis label position based on X-axis location
    const yAxisLabelY =
      x.axis?.location === 'top'
        ? height - (margin?.bottom ?? 0) + 20
        : (margin?.top ?? 0) - 15;

    // Draw X-axis using shared utility
    const { axisG: xAxisG, axis: xAxis } = drawAxis({
      g,
      scale: xFn,
      config: {
        ...x,
        axis: {
          ...x.axis,
          location: x.axis?.location || 'bottom',
          ticks: x.axis?.ticks || 5,
        },
      },
      dimensions: { width, height },
      margin,
      padding,
      orientation: 'horizontal',
      className: 'axis--x axis',
    });

    // Draw Y-left axis using shared utility
    if (allLeftY.length > 0 && yLeftFn) {
      drawAxis({
        g,
        scale: yLeftFn,
        config: {
          key: allLeftY[0].key,
          axis: {
            location: 'left',
            ticks: minTicksLeft || 5,
          },
        },
        dimensions: { width, height },
        margin,
        padding,
        orientation: 'vertical',
        labelText:
          yLeftLabels && yLeftLabels.length > 0
            ? yLeftLabel || yLeftLabels.join(', ')
            : undefined,
        labelY: yAxisLabelY,
        className: 'axis axis--left-y',
      });
    }

    // Draw Y-right axis using shared utility
    if (allRightY.length > 0 && yRightFn) {
      drawAxis({
        g,
        scale: yRightFn,
        config: {
          key: allRightY[0].key,
          axis: {
            location: 'right',
            ticks: minTicksRight || 5,
          },
        },
        dimensions: { width, height },
        margin,
        padding,
        orientation: 'vertical',
        labelText:
          yRightLabels && yRightLabels.length > 0
            ? yRightLabel || yRightLabels.join(', ')
            : undefined,
        labelY: yAxisLabelY,
        className: 'axis axis--right-y',
      });
    }

    svg
      .append('clipPath')
      .attr('id', 'clip')
      .append('rect')
      .attr('x', margin?.left ?? 0)
      .attr('y', margin?.top ?? 0)
      .attr('width', width - (margin?.right ?? 0) - (margin?.left ?? 0))
      .attr('height', height - (margin?.bottom ?? 0) - (margin?.top ?? 0));

    const leftG = g
      .append('g')
      .attr('class', 'left-g')
      .attr('clip-path', 'url(#clip)');

    const drawLeftSeries = () => {
      zooming &&
        (function () {
          selectAll('.left-series').remove();
          selectAll('.left-circles').remove();
        })();

      // Draw left axis values

      allLeftY.map((column) => {
        const seriesData = data.filter(
          (d: any) =>
            Number.isFinite(d[column.key]) || column.unknown === 'zero'
        );

        const columnG = leftG.append('g').attr('class', 'group');

        const columnCurve =
          //@ts-ignore
          curveMapping[column.curve] || curveMapping['default'];

        const newLine = line()
          .x((d) => {
            return x.scalingFunction === 'time'
              ? xFn(toDateTime(d))
              : // @ts-ignore
                xFn(d[x.key]);
          })
          // @ts-ignore
          .y((d) => yLeftFn(d[column.key] || (column.unknown === 'zero' && 0)))
          .curve(columnCurve || curveLinear);

        const seriesPath = columnG
          .append('path')
          .attr('class', `left-series stroke-current ${column.className || ''}`)
          .datum(seriesData)
          .attr('fill', 'none')
          .attr('clip-path', 'url(#clip)')
          //@ts-ignore
          .attr('d', newLine);

        column.label?.show &&
          columnG
            .append('text')
            .attr('class', `y-line-labels ${column.label.className || ''}`)
            .text(column.key)
            .attr('x', width - (padding?.right ?? 0) - 10)
            .attr(
              'y',
              // @ts-ignore
              yLeftFn(seriesData[seriesData.length - 1][column.key])
            );

        if (drawing && drawing.duration) {
          // @ts-ignore
          const l = seriesPath.node().getTotalLength();

          seriesPath
            .attr('stroke-dasharray', `0,${l}`)
            .transition()
            .ease(easeLinear)
            .duration(drawing.duration)
            .attr('stroke-dasharray', `${l},${l}`);
        }

        column.symbol &&
          column.symbol !== 'none' &&
          leftG
            .selectAll('.left-g')
            .data(seriesData)
            .enter()
            .append('path')
            .attr(
              'd',
              symbol()
                .type(shapeMapping[column.symbol] || symbolCircle)
                .size(column.size || 16)
            )
            .attr('class', `left-circles ${column.className} fill-current`)
            .attr(
              'transform',
              (d: any) =>
                `translate(${
                  x.scalingFunction === 'time'
                    ? xFn(toDateTime(d))
                    : xFn(d[x.key])
                  // @ts-ignore
                },${yLeftFn(
                  d[column.key] || (column.unknown === 'zero' && 0)
                )})`
            );
      });
    };

    const rightG = g
      .append('g')
      .attr('class', 'right-g')
      .attr('clip-path', 'url(#clip)');

    const drawRightSeries = () => {
      zooming &&
        (function () {
          selectAll('.right-series').remove();
          selectAll('.right-circles').remove();
        })();
      allRightY.map((column) => {
        const columnCurve =
          //@ts-ignore
          curveMapping[column.curve] || curveMapping['default'];

        const newLine = line()
          .x((d: any) =>
            x.scalingFunction === 'time' ? xFn(toDateTime(d)) : xFn(d[x.key])
          )
          .y((d: any) =>
            // @ts-ignore
            yRightFn(d[column.key] || (column.unknown === 'zero' && 0))
          )
          .curve(columnCurve || curveLinear);

        const columnG = rightG.append('g').attr('class', 'group');

        const seriesData = data.filter(
          (d: any) =>
            Number.isFinite(d[column.key]) || column.unknown === 'zero'
        );
        const seriesPath = columnG
          .append('path')
          .attr(
            'class',
            `right-series stroke-current ${column.className || ''}`
          )
          .datum(seriesData)
          .attr('fill', 'none')
          .attr('clip-path', 'url(#clip)')
          // @ts-ignore
          .attr('d', newLine);

        column.label?.show &&
          columnG
            .append('text')
            .attr('class', `y-line-labels ${column.label.className || ''}`)
            .text(column.key)
            .attr(
              'x',
              width - (margin?.right ?? 0) - (padding?.right ?? 0) - 10
            )
            .attr(
              'y',
              // @ts-ignore
              yRightFn(seriesData[seriesData.length - 1][column.key])
            );

        if (drawing && drawing.duration) {
          // @ts-ignore
          const l = seriesPath.node().getTotalLength();

          seriesPath
            .attr('stroke-dasharray', `0,${l}`)
            .transition()
            .duration(drawing.duration)
            .attr('stroke-dasharray', `${l},${l}`);
        }

        column.symbol &&
          column.symbol !== 'none' &&
          leftG
            .selectAll('.right-g')
            .data(seriesData)
            .enter()
            .append('path')
            .attr(
              'd',
              symbol()
                .type(shapeMapping[column.symbol] || symbolCircle)
                .size(column.size || 16)
            )
            .attr('class', `left-circles ${column.className} fill-current`)
            .attr(
              'transform',
              (d: any) =>
                `translate(${
                  x.scalingFunction === 'time'
                    ? xFn(toDateTime(d))
                    : xFn(d[x.key])
                  // @ts-ignore
                },${yRightFn(
                  d[column.key] || (column.unknown === 'zero' && 0)
                )})`
            );
      });
    };

    const drawReferenceLines = () => {
      zooming && selectAll('.reference-line').remove();
      referenceLines.map((object) => {
        object.x &&
          //@ts-ignore
          drawVLine({
            x:
              x.scalingFunction === 'time'
                ? xFn(toDateTime({ [x.key]: object.x }))
                : // @ts-ignore
                  xFn(object.x),
            y: margin?.top || 0,
            // @ts-ignore
            className: `${object.className || ''} reference-line`,
          });

        object.yLeft &&
          (function () {
            // @ts-ignore
            drawHLine({
              // @ts-ignore
              y: yLeftFn(object.yLeft),
              x: margin?.left ?? 0,
              className: `stroke-current ${object.className} reference-line`,
              direction: 'right',
            });

            object.showText &&
              g
                .append('text')
                .attr('class', `stroke-current ${object.className}`)
                .attr(
                  'x',
                  (margin?.left ?? 0) + (padding?.left ?? 0) + width - 10
                )
                // @ts-ignore
                .attr('y', yLeftFn(object.yLeft) - 5)
                .attr('font-size', '0.7em')
                .text(`y = ${object.yLeft}`);
          })();

        object.yRight &&
          // @ts-ignore
          drawHLine({
            // @ts-ignore
            y: yRightFn(object.yRight),
            x: margin?.left ?? 0,
            className: `${object.className || ''} reference-line`,
            direction: 'right',
          });
      });
    };

    drawLeftSeries();
    drawRightSeries();
    drawReferenceLines();

    const xValue = (d: any) =>
      x.scalingFunction === 'time' ? xFn(toDateTime(d)) : xFn(d[x.key]);
    // Tooltips

    const tooltipDiv = select('body')
      .append('div')
      .attr('id', `tooltip-${id}`)
      .style('position', 'absolute')
      .style('opacity', '0')
      .attr('class', `tooltip ${(tooltip && tooltip.className) || ''}`);

    tooltip &&
      tooltip.style &&
      Object.entries(tooltip.style).map(([key, value]) =>
        // @ts-ignore
        tooltipDiv.style(key, value)
      );

    function onMouseOverG() {
      tooltip && tooltipDiv.style('opacity', 1);
    }

    function onMouseLeave() {
      selectAll('.axis-point-line').remove();

      tooltip && tooltipDiv.style('opacity', '0').style('-1000px');
    }

    function drawHLine({
      x,
      y,
      direction = 'left',
      className,
      dashed = false,
    }: {
      x: any;
      y: any;
      direction?: 'left' | 'right';
      className?: string;
      dashed: boolean;
    }) {
      const horizontalLine = g
        .append('line')
        .attr('class', className || 'axis-point-line')
        .attr('x1', direction === 'left' ? margin?.left ?? 0 : x)
        .attr('x2', direction === 'left' ? x : width + (margin?.left ?? 0))
        .attr('y1', y)
        .attr('y2', y)
        .attr('clip-path', 'url(#clip)')
        .attr('stroke', '#dddddd');
      dashed && horizontalLine.style('stroke-dasharray', '10,5');
    }
    function drawVLine({
      x,
      y,
      className,
      dashed,
    }: {
      x: any;
      y: any;
      className?: 'string';
      dashed: boolean;
    }) {
      const verticalLine = g
        .append('line')
        .attr('class', className || 'axis-point-line')
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', y)
        .attr('y2', height + (margin?.top ?? 0))
        .attr('stroke', 'currentColor')
        .attr('clip-path', 'url(#clip)')
        .style('stroke-width', 1);
      dashed && verticalLine.style('stroke-dasharray', '10,7');
    }

    function onMouseMove(event: MouseEvent) {
      selectAll('.axis-point-line').remove();
      // @ts-ignore
      const [cX] = pointer(event, this);

      const xDistances = data.map((d) => Math.abs(xValue(d) - cX));
      const closestPoint = minIndex(xDistances);
      const dataClosest = data[closestPoint];
      // @ts-ignore
      const dataLeft = allLeftY.map((column) => dataClosest[column.key]);
      // @ts-ignore
      const dataRight = allRightY.map((column) => dataClosest[column.key]);

      if (showGuideLines) {
        drawVLine({
          x: xValue(dataClosest),
          y: min([
            (yLeftFn && yLeftFn(max(dataLeft))) ||
              height - (margin?.bottom || 0),
            (yRightFn && yRightFn(max(dataRight))) ||
              height - (margin?.bottom || 0),
          ]),
          // @ts-ignore
          className: 'axis-point-line text-gray-200 stroke-current',
          dashed: true,
        });

        dataLeft.map(
          (yValue) =>
            Number.isFinite(yValue) &&
            drawHLine({
              x: xValue(dataClosest),
              // @ts-ignore
              y: yLeftFn(yValue),
              dashed: true,
            })
        );
        dataRight.map(
          (yValue) =>
            Number.isFinite(yValue) &&
            drawHLine({
              x: xValue(dataClosest),
              // @ts-ignore
              y: yRightFn(yValue),
              direction: 'right',
              dashed: true,
            })
        );
      }

      tooltip && moveTooltip(event, dataClosest);
    }
    // @ts-ignore
    const moveTooltip = (event, row) => {
      const [bX, bY] = pointer(event, select('body'));

      tooltipDiv.style('left', `${bX + 10}px`).style('top', `${bY + 10}px`);
      tooltipDiv.html(
        // @ts-ignore
        tooltip.html
          ? // @ts-ignore
            tooltip.html(row)
          : // @ts-ignore
          tooltip.keys
          ? // @ts-ignore
            tooltip.keys.map((key) => `${key}: ${row[key] || ''}`).join('<br/>')
          : Object.entries(row)
              .map(([key, value]) => `${key}: ${value}`)
              .join('<br/>')
      );
    };

    tooltip &&
      svg
        .on('mouseover', onMouseOverG)
        .on('mousemove', onMouseMove)
        .on('mouseleave', onMouseLeave);
    //Todo Zoom

    const extent = [
      [margin?.left ?? 0, margin?.top ?? 0],
      [width, height],
    ];

    if (zooming) {
      const zoomFunc = zoom()
        .scaleExtent([1, 4])
        // @ts-ignore
        .extent(extent)
        // @ts-ignore
        .translateExtent(extent)
        .on('zoom', zoomed);

      function zoomed(event: MouseEvent) {
        xFn.range(
          [
            (margin?.left ?? 0) + (padding?.left ?? 0),
            width - (margin?.right ?? 0) - (padding?.right ?? 0),
          ].map(
            // @ts-ignore
            (d: any) => event.transform.applyX(d)
          )
        );
        xAxisG.call(xAxis);
        drawLeftSeries();
        drawRightSeries();
        drawReferenceLines();
      }
      svg.call(zoomFunc);
    }
  }, []);
  /* eslint-enable */

  useEffect(() => {
    refreshChart();
    return () => {
      selectAll(`#tooltip-${id}`).remove();
    };
  }, [data, refreshChart]);

  return (
    <svg
      id={id}
      style={style}
      className={twMerge(defaultChartClassNames, className)}
    />
  );
};

export default LineChart;
