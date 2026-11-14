import { select } from 'd3-selection';
import { afterEach, describe, expect, it } from 'vitest';

import { interruptTransitions } from './interruptTransitions';

const hasTransition = (node: Element | null): boolean =>
  node !== null && '__transition' in node;

const svgTree = () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  svg.appendChild(rect);
  document.body.appendChild(svg);
  return { svg, rect };
};

describe('interruptTransitions', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('is a no-op for null or a node with no transitions', () => {
    expect(() => interruptTransitions(null)).not.toThrow();
    expect(() => interruptTransitions(undefined)).not.toThrow();
    const { svg } = svgTree();
    expect(() => interruptTransitions(svg)).not.toThrow();
  });

  it('interrupts nameless transitions on the node and its descendants', () => {
    const { svg, rect } = svgTree();
    select(svg).transition().duration(1000).attr('opacity', 0);
    select(rect).transition().duration(1000).attr('x', 40);
    expect(hasTransition(svg)).toBe(true);
    expect(hasTransition(rect)).toBe(true);

    interruptTransitions(svg);

    expect(hasTransition(svg)).toBe(false);
    expect(hasTransition(rect)).toBe(false);
  });

  it('interrupts named transitions, which a nameless interrupt() would leave running', () => {
    const { svg, rect } = svgTree();
    select(rect).transition('wick-reveal-expand').duration(1000).attr('y', 10);
    expect(hasTransition(rect)).toBe(true);

    interruptTransitions(svg);

    expect(hasTransition(rect)).toBe(false);
  });
});
