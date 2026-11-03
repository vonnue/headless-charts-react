import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { select } from 'd3-selection';

import ScatterPlot from '.';
import data from './sample.json';

// jsdom has no layout; an inline size gives the chart real dimensions.
const style = { width: '400px', height: '260px' };

const binnedArgs = {
  id: 'scatter-binned',
  data,
  style,
  x: {
    key: 'gdp',
    bin: { count: 5, labelFormat: (lo: number, hi: number) => `x${lo}-${hi}` },
    axis: { location: 'bottom' as const, label: 'GDP' },
  },
  y: {
    key: 'purchasing_power',
    bin: { count: 5, labelFormat: (lo: number, hi: number) => `y${lo}-${hi}` },
    axis: { location: 'left' as const, label: 'Purchasing Power' },
  },
};

const tickTexts = (axis: Element) =>
  Array.from(axis.querySelectorAll('.tick text')).map((t) => t.textContent ?? '');

const tickOffset = (tick: Element, index: 0 | 1) =>
  Number(
    /translate\(([-\d.]+),\s*([-\d.]+)\)/.exec(tick.getAttribute('transform') ?? '')?.[
      index + 1
    ]
  );

const cells = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('g[clip-path] rect'));

const label = (node: Element, key: string) => {
  const d: unknown = select(node).datum();
  return typeof d === 'object' && d !== null ? String(Reflect.get(d, key)) : '';
};

describe('ScatterPlot binned mode', () => {
  it('draws exactly one x axis and one y axis', () => {
    const { container } = render(<ScatterPlot {...binnedArgs} />);
    expect(container.querySelectorAll('[data-testid="x-axis"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-testid="y-axis"]')).toHaveLength(1);
  });

  it('labels the axes with the bin labels only', () => {
    const { container } = render(<ScatterPlot {...binnedArgs} />);
    const xTicks = tickTexts(container.querySelector('[data-testid="x-axis"]')!);
    const yTicks = tickTexts(container.querySelector('[data-testid="y-axis"]')!);
    expect(xTicks.length).toBeGreaterThan(1);
    expect(yTicks.length).toBeGreaterThan(1);
    expect(xTicks.every((t) => t.startsWith('x'))).toBe(true);
    expect(yTicks.every((t) => t.startsWith('y'))).toBe(true);
    // The x labels are wider than their bands here, so they are rotated.
    const xText = container.querySelector('[data-testid="x-axis"] .tick text')!;
    expect(xText.getAttribute('transform')).toBe('rotate(-45)');
    expect(xText.getAttribute('text-anchor')).toBe('end');
  });

  it('places one cell per occupied bin inside the padded plot area', () => {
    const margin = { left: 60, right: 20, top: 40, bottom: 60 };
    const padding = { left: 10, right: 10, top: 10, bottom: 10 };
    const { container } = render(
      <ScatterPlot {...binnedArgs} margin={margin} padding={padding} />
    );
    const xTicks = new Map(
      Array.from(container.querySelectorAll('[data-testid="x-axis"] .tick')).map((t) => [
        t.textContent,
        tickOffset(t, 0),
      ])
    );
    const yTicks = new Map(
      Array.from(container.querySelectorAll('[data-testid="y-axis"] .tick')).map((t) => [
        t.textContent,
        tickOffset(t, 1),
      ])
    );
    const rects = cells(container);
    const occupied = new Set(rects.map((r) => `${label(r, 'gdp')}|${label(r, 'purchasing_power')}`));
    expect(rects.length).toBe(occupied.size);
    expect(rects.length).toBeGreaterThan(1);
    const total = rects.reduce((sum, r) => sum + Number(label(r, 'count')), 0);
    expect(total).toBe(data.length);
    for (const r of rects) {
      const cx = Number(r.getAttribute('x')) + Number(r.getAttribute('width')) / 2;
      const cy = Number(r.getAttribute('y')) + Number(r.getAttribute('height')) / 2;
      expect(cx).toBeCloseTo(xTicks.get(label(r, 'gdp'))!, 0);
      expect(cy).toBeCloseTo(yTicks.get(label(r, 'purchasing_power'))!, 0);
      // Same vertical extent as the continuous y range.
      const bottom = Number(r.getAttribute('y')) + Number(r.getAttribute('height'));
      expect(bottom).toBeLessThanOrEqual(260 - margin.bottom - padding.top - padding.bottom);
      expect(Number(r.getAttribute('y'))).toBeGreaterThanOrEqual(margin.top + padding.top);
      expect(Number(r.getAttribute('x'))).toBeGreaterThanOrEqual(margin.left + padding.left);
    }
  });

  it('bins an unbinned numeric axis into a few rows in numeric order', () => {
    const { container } = render(
      <ScatterPlot
        {...binnedArgs}
        y={{ key: 'purchasing_power', axis: { location: 'left' } }}
      />
    );
    const ticks = Array.from(container.querySelectorAll('[data-testid="y-axis"] .tick'));
    expect(ticks.length).toBeGreaterThan(1);
    expect(ticks.length).toBeLessThan(10);
    // Rows run bottom (low) to top (high).
    const rows = ticks
      .map((t) => ({ low: parseFloat(t.textContent ?? ''), y: tickOffset(t, 1) }))
      .sort((a, b) => b.y - a.y);
    const lows = rows.map((r) => r.low);
    expect(lows).toEqual([...lows].sort((a, b) => a - b));
  });

  it('groups an unbinned non-numeric axis by value in sorted order', () => {
    const { container } = render(
      <ScatterPlot
        {...binnedArgs}
        y={{ key: 'continent', axis: { location: 'left' } }}
      />
    );
    const continents = [...new Set(data.map((d) => d.continent))].sort();
    const rows = Array.from(container.querySelectorAll('[data-testid="y-axis"] .tick'))
      .sort((a, b) => tickOffset(b, 1) - tickOffset(a, 1))
      .map((t) => t.textContent);
    expect(rows).toEqual(continents);
  });

  it('starts the colour domain at 0', () => {
    const scale = (t: number) => `rgb(${Math.round(t * 255)}, 0, 0)`;
    // Two points per bin: equal counts get the full colour, not the midpoint.
    const pairs = [
      { gdp: 1, purchasing_power: 1 },
      { gdp: 1, purchasing_power: 1 },
      { gdp: 9, purchasing_power: 9 },
      { gdp: 9, purchasing_power: 9 },
    ];
    const { container } = render(
      <ScatterPlot
        {...binnedArgs}
        data={pairs}
        x={{ key: 'gdp', bin: { count: 2 } }}
        y={{ key: 'purchasing_power', bin: { count: 2 } }}
        binColor={{ scale }}
      />
    );
    const fills = cells(container).map((r) => r.getAttribute('fill'));
    expect(fills.length).toBe(2);
    expect(fills.every((f) => f === 'rgb(255, 0, 0)')).toBe(true);
  });

  it('uses a per-chart clip path id', () => {
    const { container } = render(
      <>
        <ScatterPlot {...binnedArgs} id="chart-a" />
        <ScatterPlot {...binnedArgs} id="chart-b" />
      </>
    );
    const ids = Array.from(container.querySelectorAll('clipPath')).map((c) => c.id);
    expect(ids).toEqual(['chart-a-plot-clip', 'chart-b-plot-clip']);
    const refs = Array.from(container.querySelectorAll('g[clip-path]')).map((g) =>
      g.getAttribute('clip-path')
    );
    expect(refs).toEqual(['url(#chart-a-plot-clip)', 'url(#chart-b-plot-clip)']);
  });
});
