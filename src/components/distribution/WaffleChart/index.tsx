import { select, selectAll } from 'd3-selection';
import { useCallback, useEffect } from 'react';
import useTooltip from '@/hooks/useTooltip';
import { scaleSequential } from 'd3-scale';
import { min as d3min, max as d3max } from 'd3-array';

import { AxisConfig, ChartProps, TooltipConfig } from '@/types';
import { deepValue } from '@/utils';
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
  drawing,
  tooltip,
  style = {},
}: WaffleChartProps<TData>) => {
  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: (d: any) => {
      const datum = d.data;
      if (!datum) return '';
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

    // Extract unique categorical values preserving data order
    const xValues: any[] = [];
    const yValues: any[] = [];
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

    const columns = xValues.length;
    const rows = yValues.length;

    if (columns === 0 || rows === 0) return;

    // Build lookup map
    const dataMap = new Map<string, TData>();
    data.forEach((d) => {
      const key = `${deepValue(d, x.key)}__${deepValue(d, y.key)}`;
      dataMap.set(key, d);
    });

    // Build color scale
    let colorFn: ((datum: TData) => string) | null = null;
    if (color.scale) {
      const colorValues = data.map(
        (d) => Number(deepValue(d, color.key)) || 0
      );
      const domainMin = color.domain?.[0] ?? d3min(colorValues) ?? 0;
      const domainMax = color.domain?.[1] ?? d3max(colorValues) ?? 1;
      const seq = scaleSequential(color.scale).domain([domainMin, domainMax]);
      colorFn = (d: TData) => seq(Number(deepValue(d, color.key)) || 0);
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
