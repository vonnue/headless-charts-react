import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import useTooltip from './useTooltip';

describe('useTooltip', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    // Clean up tooltip divs
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
  });

  it('creates a tooltip div in the document body', () => {
    const { tooltipDiv } = useTooltip({
      tooltip: { className: 'test-tooltip' },
      id: 'test',
    });

    expect(tooltipDiv).toBeTruthy();
    const el = document.getElementById('tooltip-test');
    expect(el).toBeTruthy();
  });

  it('applies className to the tooltip div', () => {
    useTooltip({
      tooltip: { className: 'my-tooltip-class' },
      id: 'styled',
    });

    const el = document.getElementById('tooltip-styled');
    expect(el?.className).toContain('my-tooltip-class');
    expect(el?.className).toContain('opacity-0');
  });

  it('creates tooltip with default opacity-0 class', () => {
    useTooltip({
      tooltip: {},
      id: 'opacity-test',
    });

    const el = document.getElementById('tooltip-opacity-test');
    expect(el?.className).toContain('absolute');
    expect(el?.className).toContain('opacity-0');
  });

  it('returns onMouseOver, onMouseMove, and onMouseLeave handlers', () => {
    const result = useTooltip({
      tooltip: { className: 'tip' },
      id: 'handlers',
    });

    expect(typeof result.onMouseOver).toBe('function');
    expect(typeof result.onMouseMove).toBe('function');
    expect(typeof result.onMouseLeave).toBe('function');
  });

  it('onMouseLeave hides the tooltip', () => {
    const { onMouseLeave } = useTooltip({
      tooltip: { className: 'tip' },
      id: 'leave-test',
    });

    onMouseLeave();

    const el = document.getElementById('tooltip-leave-test');
    expect(el?.className).toContain('opacity-0');
    expect(el?.style.left).toBe('-1000px');
  });

  it('creates tooltip div even without tooltip config', () => {
    const { tooltipDiv } = useTooltip({
      id: 'no-config',
    });

    // Should still create a tooltip div
    expect(tooltipDiv).toBeTruthy();
  });

  it('uses custom html function when provided in tooltip config', () => {
    const customHtml = (d: any) => `<b>${d.name}</b>`;
    const { tooltipDiv } = useTooltip({
      tooltip: { className: 'tip', html: customHtml },
      id: 'custom-html',
    });

    expect(tooltipDiv).toBeTruthy();
  });

  it('uses keys array for tooltip content when provided', () => {
    const { tooltipDiv } = useTooltip({
      tooltip: { className: 'tip', keys: ['name', 'value'] },
      id: 'keys-test',
    });

    expect(tooltipDiv).toBeTruthy();
  });
});
