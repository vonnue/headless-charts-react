import { select, selectAll } from 'd3-selection';
import { useCallback, useEffect } from 'react';
import useTooltip from '@/hooks/useTooltip';

import { AxisConfig, ChartProps, TooltipConfig } from '@/types';
import { deepValue } from '@/utils';
import { defaultChartClassNames } from '@/utils';
import { twMerge } from 'tailwind-merge';

interface DrawingOptions {
  duration: number;
}

export interface WaffleChartProps<TData = any> extends ChartProps<TData> {
  data: TData[];
  id: string;
  className?: string;
  classNameCell?: string;
  color?: {
    key: Extract<keyof TData, string> | string;
    classNameMap?: {
      [key: string]: string;
    };
  };
  x: AxisConfig<TData>;
  y?: AxisConfig<TData>;
  gap?: number;
  drawing?: DrawingOptions;
  tooltip?: TooltipConfig;
}

interface CellDatum {
  name: string;
  value: number;
  cellCount: number;
  row: number;
  col: number;
  index: number;
  data: any;
}

const WaffleChart = <TData = any,>({
  data,
  id,
  className = '',
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
  color,
  x,
  y = { key: 'y', end: 10 },
  gap = 2,
  classNameCell = '',
  drawing,
  tooltip,
  style = {},
}: WaffleChartProps<TData>) => {
  const columns = x.end ?? 10;
  const rows = y.end ?? 10;

  const { onMouseOver, onMouseMove, onMouseLeave } = useTooltip({
    id,
    tooltip,
    defaultHtml: (d: any) => {
      const totalCells = rows * columns;
      const percentage = ((d.cellCount / totalCells) * 100).toFixed(1);
      return `${d.name}: ${d.value} (${percentage}%)`;
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

    const totalCells = rows * columns;

    // Cell allocation using largest remainder method
    const total = data.reduce(
      (sum, d) => sum + (Number(deepValue(d, x.key)) || 0),
      0
    );

    if (total === 0) return;

    const categories = data.map((d, i) => {
      const value = Number(deepValue(d, x.key)) || 0;
      const exact = (value / total) * totalCells;
      return {
        name: color?.key ? String(deepValue(d, color.key)) : String(i),
        value,
        exact,
        floor: Math.floor(exact),
        remainder: exact - Math.floor(exact),
        originalIndex: i,
        data: d,
      };
    });

    let allocated = categories.reduce((sum, c) => sum + c.floor, 0);
    let remaining = totalCells - allocated;

    // Distribute remaining cells to highest-remainder categories
    const sorted = [...categories].sort(
      (a, b) => b.remainder - a.remainder
    );
    for (let i = 0; i < remaining && i < sorted.length; i++) {
      sorted[i].floor += 1;
    }

    // Build flat cell array
    const cellData: CellDatum[] = [];
    for (const cat of categories) {
      for (let c = 0; c < cat.floor; c++) {
        const idx = cellData.length;
        const col = idx % columns;
        const row = Math.floor(idx / columns);
        cellData.push({
          name: cat.name,
          value: cat.value,
          cellCount: cat.floor,
          row,
          col,
          index: idx,
          data: cat.data,
        });
      }
    }

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
      .attr('class', (d) =>
        twMerge('fill-black', classNameCell, color?.classNameMap?.[d.name])
      )
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
    color,
    x,
    y,
    columns,
    rows,
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
