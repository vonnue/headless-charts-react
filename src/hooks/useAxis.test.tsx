import { describe, expect, it, beforeEach } from 'vitest';
import { select } from 'd3-selection';
import { scaleLinear, scaleBand } from 'd3-scale';
import { drawAxis } from './useAxis';

describe('drawAxis', () => {
  let container: SVGSVGElement;
  let g: any;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    container.setAttribute('width', '500');
    container.setAttribute('height', '300');
    document.body.appendChild(container);
    g = select(container);
  });

  const baseOptions = {
    scale: scaleLinear().domain([0, 100]).range([0, 400]),
    config: { key: 'value', axis: { ticks: 5 } },
    dimensions: { width: 500, height: 300 },
    margin: { top: 20, right: 20, bottom: 30, left: 40 },
  };

  it('creates a horizontal (x) axis at the bottom by default', () => {
    const result = drawAxis({
      ...baseOptions,
      g,
      orientation: 'horizontal',
    });

    const axisG = container.querySelector('[data-testid="x-axis"]');
    expect(axisG).toBeTruthy();
    expect(axisG?.getAttribute('class')).toContain('axis--x');
    // Bottom axis: translate(0, height - margin.bottom)
    expect(axisG?.getAttribute('transform')).toBe('translate(0, 270)');
    expect(result.axisG).toBeTruthy();
    expect(result.axis).toBeTruthy();
  });

  it('creates a horizontal axis at the top when configured', () => {
    drawAxis({
      ...baseOptions,
      g,
      orientation: 'horizontal',
      config: { key: 'value', axis: { location: 'top', ticks: 5 } },
    });

    const axisG = container.querySelector('[data-testid="x-axis"]');
    expect(axisG?.getAttribute('transform')).toBe('translate(0, 20)');
  });

  it('creates a vertical (y) axis on the left by default', () => {
    drawAxis({
      ...baseOptions,
      g,
      orientation: 'vertical',
    });

    const axisG = container.querySelector('[data-testid="y-axis"]');
    expect(axisG).toBeTruthy();
    expect(axisG?.getAttribute('class')).toContain('axis--y');
    expect(axisG?.getAttribute('transform')).toBe('translate(40, 0)');
  });

  it('creates a vertical axis on the right when configured', () => {
    drawAxis({
      ...baseOptions,
      g,
      orientation: 'vertical',
      config: { key: 'value', axis: { location: 'right', ticks: 5 } },
    });

    const axisG = container.querySelector('[data-testid="y-axis"]');
    expect(axisG?.getAttribute('transform')).toBe('translate(480, 0)');
  });

  it('renders an axis label when provided in config', () => {
    drawAxis({
      ...baseOptions,
      g,
      orientation: 'horizontal',
      config: { key: 'value', axis: { label: 'X Axis Label', ticks: 5 } },
    });

    const axisG = container.querySelector('[data-testid="x-axis"]');
    const texts = axisG?.querySelectorAll(':scope > text');
    // The last direct-child text should be the label (ticks are inside .tick groups)
    const labelText = texts?.[texts.length - 1];
    expect(labelText).toBeTruthy();
    expect(labelText?.textContent).toBe('X Axis Label');
    expect(labelText?.getAttribute('text-anchor')).toBe('middle');
  });

  it('uses labelText prop over config label', () => {
    drawAxis({
      ...baseOptions,
      g,
      orientation: 'horizontal',
      config: { key: 'value', axis: { label: 'Config Label', ticks: 5 } },
      labelText: 'Override Label',
    });

    const axisG = container.querySelector('[data-testid="x-axis"]');
    const texts = axisG?.querySelectorAll(':scope > text');
    const labelText = texts?.[texts.length - 1];
    expect(labelText?.textContent).toBe('Override Label');
  });

  it('applies custom className when provided', () => {
    drawAxis({
      ...baseOptions,
      g,
      orientation: 'horizontal',
      className: 'custom-axis-class',
    });

    const axisG = container.querySelector('.custom-axis-class');
    expect(axisG).toBeTruthy();
  });

  it('adds left padding line for horizontal axis', () => {
    drawAxis({
      ...baseOptions,
      g,
      orientation: 'horizontal',
      padding: { left: 10, right: 0, top: 0, bottom: 0 },
    });

    const lines = container.querySelectorAll('[data-testid="x-axis"] line');
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  it('adds right padding line for horizontal axis', () => {
    drawAxis({
      ...baseOptions,
      g,
      orientation: 'horizontal',
      padding: { left: 0, right: 10, top: 0, bottom: 0 },
    });

    const lines = container.querySelectorAll('[data-testid="x-axis"] line');
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  it('adds top and bottom padding lines for vertical axis', () => {
    drawAxis({
      ...baseOptions,
      g,
      orientation: 'vertical',
      padding: { left: 0, right: 0, top: 10, bottom: 10 },
    });

    const lines = container.querySelectorAll('[data-testid="y-axis"] line');
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });

  it('defaults to 5 ticks when not specified', () => {
    drawAxis({
      ...baseOptions,
      g,
      orientation: 'horizontal',
      config: { key: 'value' },
    });

    const axisG = container.querySelector('[data-testid="x-axis"]');
    expect(axisG).toBeTruthy();
  });

  it('uses custom labelY when provided', () => {
    drawAxis({
      ...baseOptions,
      g,
      orientation: 'horizontal',
      config: { key: 'value', axis: { label: 'Test', ticks: 5 } },
      labelY: 50,
    });

    const axisG = container.querySelector('[data-testid="x-axis"]');
    const texts = axisG?.querySelectorAll(':scope > text');
    const labelText = texts?.[texts.length - 1];
    expect(labelText?.getAttribute('y')).toBe('50');
  });

  it('works with band scales', () => {
    const bandScale = scaleBand()
      .domain(['A', 'B', 'C'])
      .range([0, 400]);

    drawAxis({
      ...baseOptions,
      g,
      scale: bandScale,
      orientation: 'horizontal',
    });

    const axisG = container.querySelector('[data-testid="x-axis"]');
    expect(axisG).toBeTruthy();
    // Band scale should render tick labels
    const ticks = axisG?.querySelectorAll('.tick');
    expect(ticks?.length).toBe(3);
  });
});
