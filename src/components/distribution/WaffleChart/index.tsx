import { select, selectAll } from 'd3-selection';
import { useCallback, useEffect } from 'react';
import useTooltip from '@/hooks/useTooltip';
import { scaleSequential } from 'd3-scale';
import { min as d3min, max as d3max } from 'd3-array';

import { AxisConfig, ChartProps, TooltipConfig } from '@/types';
import { deepValue, binData } from '@/utils';
import { defaultChartClassNames } from '@/utils';
import { twMerge } from 'tailwind-merge';

interface DrawingOptions {
  duration: number;
}

export interface WaffleChartColorConfig {
  key: string;
  scale?: (t: number) => string;
  domain?: [number, number];
  classNameMap?: {
    [key: string]: string;
  };
}

export interface WaffleChartProps<TData = any> extends ChartProps<TData> {
  data: TData[];
  id: string;
  className?: string;
  classNameCell?: string;
  x: AxisConfig<TData>;
  y: AxisConfig<TData>;
  color: WaffleChartColorConfig;
  gap?: number;
  rx?: number;
  drawing?: DrawingOptions;
  tooltip?: TooltipConfig;
}

interface CellDatum {
  xValue: any;
  yValue: any;
  row: number;
  col: number;
  data: any;
}

const WaffleChart = <TData = any,>({
  data,
  id,
  className = '',
  classNameCell = '',
  padding = {
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  margin = {
    left: 40,
    right: 40,
    top: 40,
    bottom: 40,
  },
  x,
  y,
  color,
  gap = 2,
  rx = 0,
  drawing,
  tooltip,
  style = {},
}: WaffleChartProps<TData>) => {
  const isBinned = x.bin != null || y.bin != null;

  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: (d: any) => {
      const datum = d.data;
      if (!datum) return '';
      if (isBinned) {
        return `${x.key}: ${deepValue(datum, x.key)}<br/>${y.key}: ${deepValue(datum, y.key)}<br/>count: ${deepValue(datum, 'count')}`;
      }
      return `${x.key}: ${deepValue(datum, x.key)}<br/>${y.key}: ${deepValue(datum, y.key)}<br/>${color.key}: ${deepValue(datum, color.key)}`;
    },
  });

  const refreshChart = useCallback(() => {
    if (!data || data.length === 0) return;

    const svg = select(`#${id}`);
    svg.selectAll('*').remove();

    const width = +svg.style('width').split('px')[0];
    const height = +svg.style('height').split('px')[0];

    const chartWidth =
      width - (margin.left ?? 0) - (margin.right ?? 0);
    const chartHeight =
      height - (margin.top ?? 0) - (margin.bottom ?? 0);

    // When binning is active, transform raw data into binned counts
    let effectiveData: any[];
    let xValues: any[];
    let yValues: any[];
    const effectiveColorKey = isBinned ? 'count' : color.key;

    if (isBinned) {
      const { binnedData, xValues: bx, yValues: by } = binData(data, x, y);
      effectiveData = binnedData;
      xValues = bx;
      yValues = by;
    } else {
      effectiveData = data;
      // Extract unique categorical values preserving data order
      xValues = [];
      yValues = [];
      const xSeen = new Set();
      const ySeen = new Set();
      data.forEach((d) => {
        const xVal = deepValue(d, x.key);
        const yVal = deepValue(d, y.key);
        if (!xSeen.has(xVal)) {
          xSeen.add(xVal);
          xValues.push(xVal);
        }
        if (!ySeen.has(yVal)) {
          ySeen.add(yVal);
          yValues.push(yVal);
        }
      });
    }

    const columns = xValues.length;
    const rows = yValues.length;

    if (columns === 0 || rows === 0) return;

    // Build lookup map
    const dataMap = new Map<string, any>();
    effectiveData.forEach((d) => {
      const key = `${deepValue(d, x.key)}__${deepValue(d, y.key)}`;
      dataMap.set(key, d);
    });

    // Build color scale
    let colorFn: ((datum: any) => string) | null = null;
    if (color.scale) {
      const colorValues = effectiveData.map(
        (d) => Number(deepValue(d, effectiveColorKey)) || 0
      );
      const domainMin = color.domain?.[0] ?? d3min(colorValues) ?? 0;
      const domainMax = color.domain?.[1] ?? d3max(colorValues) ?? 1;
      const seq = scaleSequential(color.scale).domain([domainMin, domainMax]);
      colorFn = (d: any) => seq(Number(deepValue(d, effectiveColorKey)) || 0);
    }

    // Build cell data array
    const cellData: CellDatum[] = [];
    yValues.forEach((yVal, rowIdx) => {
      xValues.forEach((xVal, colIdx) => {
        const key = `${xVal}__${yVal}`;
        const datum = dataMap.get(key);
        if (datum) {
          cellData.push({
            xValue: xVal,
            yValue: yVal,
            row: rowIdx,
            col: colIdx,
            data: datum,
          });
        }
      });
    });

    // Calculate cell size (keep cells square)
    const cellWidth =
      (chartWidth - gap * (columns - 1)) / columns;
    const cellHeight =
      (chartHeight - gap * (rows - 1)) / rows;
    const cellSize = Math.min(cellWidth, cellHeight);

    // Center the grid
    const gridWidth = columns * cellSize + (columns - 1) * gap;
    const gridHeight = rows * cellSize + (rows - 1) * gap;
    const offsetX = (chartWidth - gridWidth) / 2;
    const offsetY = (chartHeight - gridHeight) / 2;

    const g = svg
      .append('g')
      .attr(
        'transform',
        `translate(${(margin.left ?? 0) + offsetX}, ${(margin.top ?? 0) + offsetY})`
      );

    // Scale label font size to cell size, capped to stay readable
    const labelFontSize = Math.min(Math.max(cellSize * 0.45, 8), 13);
    const titleFontSize = labelFontSize + 1;
    const labelGap = Math.max(cellSize * 0.4, 6);

    // Pick evenly-spaced tick indices including first and last
    const pickTickIndices = (count: number, ticks: number): Set<number> => {
      if (ticks <= 0 || count === 0) return new Set();
      if (ticks === 1) return new Set([0]);
      if (ticks >= count) return new Set(Array.from({ length: count }, (_, i) => i));
      const indices = new Set<number>();
      for (let i = 0; i < ticks; i++) {
        indices.add(Math.round((i * (count - 1)) / (ticks - 1)));
      }
      return indices;
    };

    // Draw x-axis labels (column headers) when x.axis is configured
    if (x.axis) {
      const isBottom = x.axis.location !== 'top';
      const xLabelY = isBottom
        ? gridHeight + labelGap
        : -labelGap;
      const xTicks = x.axis.ticks ?? columns;
      const xTickSet = pickTickIndices(columns, xTicks);

      g.append('g')
        .attr('class', 'axis axis--x')
        .attr('data-testid', 'x-axis')
        .selectAll('text')
        .data(xValues)
        .join('text')
        .text((d, i) => xTickSet.has(i) ? String(d) : '')
        .attr('x', (_, i) => i * (cellSize + gap) + cellSize / 2)
        .attr('y', xLabelY)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', isBottom ? 'hanging' : 'auto')
        .attr('fill', 'currentColor')
        .style('font-size', `${labelFontSize}px`)
        .style('opacity', 0.55);

      if (x.axis.label) {
        g.append('text')
          .text(x.axis.label)
          .attr('x', gridWidth / 2)
          .attr('y', isBottom ? gridHeight + labelGap + labelFontSize + titleFontSize : -labelGap - labelFontSize - 4)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', isBottom ? 'hanging' : 'auto')
          .attr('fill', 'currentColor')
          .style('font-size', `${titleFontSize}px`)
          .style('font-weight', '500')
          .style('opacity', 0.7);
      }
    }

    // Draw y-axis labels (row headers) when y.axis is configured
    if (y.axis) {
      const isLeft = y.axis.location !== 'right';
      const yLabelX = isLeft
        ? -labelGap
        : gridWidth + labelGap;
      const yTicks = y.axis.ticks ?? rows;
      const yTickSet = pickTickIndices(rows, yTicks);

      g.append('g')
        .attr('class', 'axis axis--y')
        .attr('data-testid', 'y-axis')
        .selectAll('text')
        .data(yValues)
        .join('text')
        .text((d, i) => yTickSet.has(i) ? String(d) : '')
        .attr('x', yLabelX)
        .attr('y', (_, i) => i * (cellSize + gap) + cellSize / 2)
        .attr('text-anchor', isLeft ? 'end' : 'start')
        .attr('dominant-baseline', 'central')
        .attr('fill', 'currentColor')
        .style('font-size', `${labelFontSize}px`)
        .style('opacity', 0.55);

      if (y.axis.label) {
        const labelX = isLeft ? -labelGap - 28 : gridWidth + labelGap + 28;
        g.append('text')
          .text(y.axis.label)
          .attr('x', labelX)
          .attr('y', gridHeight / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('fill', 'currentColor')
          .attr('transform', `rotate(-90, ${labelX}, ${gridHeight / 2})`)
          .style('font-size', `${titleFontSize}px`)
          .style('font-weight', '500')
          .style('opacity', 0.7);
      }
    }

    g.selectAll('rect')
      .data(cellData)
      .join('rect')
      .attr('x', (d) => d.col * (cellSize + gap))
      .attr('y', (d) => d.row * (cellSize + gap))
      .attr('width', 0)
      .attr('height', 0)
      .attr('class', (d) => {
        const catClass =
          color.classNameMap?.[String(deepValue(d.data, color.key))] ?? '';
        return twMerge(classNameCell, catClass);
      })
      .attr('rx', rx)
      .attr('style', (d) => {
        if (colorFn) {
          return `fill: ${colorFn(d.data)}`;
        }
        return '';
      })
      .on('mouseenter', onMouseOver)
      .on('mousemove', onMouseMove)
      .on('mouseleave', onMouseLeave)
      .transition()
      .duration(drawing?.duration || 0)
      .delay((_, i) =>
        drawing?.duration
          ? (drawing.duration * i) / cellData.length
          : 0
      )
      .attr('width', cellSize)
      .attr('height', cellSize);
  }, [
    id,
    data,
    margin,
    padding,
    x,
    y,
    color,
    gap,
    rx,
    classNameCell,
    drawing,
    onMouseOver,
    onMouseMove,
    onMouseLeave,
  ]);

  useEffect(() => {
    refreshChart();
    return () => {
      selectAll(`#tooltip-${id}`).remove();
    };
  }, [data, refreshChart]);

  return (
    <svg
      data-testid={id}
      style={style}
      id={id}
      className={twMerge(defaultChartClassNames, className)}
    />
  );
};

export default WaffleChart;
