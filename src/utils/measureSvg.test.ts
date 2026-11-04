import { afterEach, describe, expect, it, vi } from 'vitest';
import measureSvg from './measureSvg';

const NO_SIZE = { width: 0, height: 0 };

const svgNode = (style: Partial<CSSStyleDeclaration> = {}) => {
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  Object.assign(node.style, style);
  document.body.appendChild(node);
  return node;
};

describe('measureSvg', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('uses the layout box when there is one', () => {
    const node = svgNode({ width: '100%', height: '100%' });
    vi.spyOn(node, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 420, 210),
    );
    expect(measureSvg(node)).toEqual({ width: 420, height: 210 });
  });

  it('falls back to a px inline style without layout', () => {
    expect(measureSvg(svgNode({ width: '400px', height: '250px' }))).toEqual({
      width: 400,
      height: 250,
    });
  });

  it('falls back to 0 for percentages or no style without layout', () => {
    expect(measureSvg(svgNode({ width: '100%', height: '100%' }))).toEqual(
      NO_SIZE,
    );
    expect(measureSvg(svgNode())).toEqual(NO_SIZE);
    expect(measureSvg(null)).toEqual(NO_SIZE);
  });
});
