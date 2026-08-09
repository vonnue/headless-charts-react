import { afterEach, vi, beforeAll, afterAll } from 'vitest';
import '@testing-library/jest-dom/vitest';

import preview from '../.storybook/preview';
import { cleanup } from '@testing-library/react';

// jsdom does not implement SVGElement.transform (SVGAnimatedTransformList),
// which d3-interpolate reads to get the current matrix when tweening the
// "transform" attribute. Parse the attribute ourselves so consolidate()
// returns the real matrix, not just a crash-avoiding identity stub — this
// keeps transform tweens (rotate/translate/scale/skew/matrix) numerically
// correct in tests, so a test can assert on the post-transition value.
type Matrix2D = [number, number, number, number, number, number];

const IDENTITY: Matrix2D = [1, 0, 0, 1, 0, 0];

function multiply(m1: Matrix2D, m2: Matrix2D): Matrix2D {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

function parseSvgTransformList(value: string): Matrix2D {
  let matrix = IDENTITY;
  const re = /(\w+)\(([^)]*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value))) {
    const args = m[2]
      .split(/[,\s]+/)
      .filter(Boolean)
      .map(Number);
    switch (m[1]) {
      case 'translate': {
        const [tx, ty = 0] = args;
        matrix = multiply(matrix, [1, 0, 0, 1, tx, ty]);
        break;
      }
      case 'rotate': {
        const [angle, cx = 0, cy = 0] = args;
        const rad = (angle * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        if (cx || cy) {
          matrix = multiply(matrix, [1, 0, 0, 1, cx, cy]);
          matrix = multiply(matrix, [cos, sin, -sin, cos, 0, 0]);
          matrix = multiply(matrix, [1, 0, 0, 1, -cx, -cy]);
        } else {
          matrix = multiply(matrix, [cos, sin, -sin, cos, 0, 0]);
        }
        break;
      }
      case 'scale': {
        const [sx, sy = sx] = args;
        matrix = multiply(matrix, [sx, 0, 0, sy, 0, 0]);
        break;
      }
      case 'skewX': {
        const [angle] = args;
        matrix = multiply(matrix, [
          1,
          0,
          Math.tan((angle * Math.PI) / 180),
          1,
          0,
          0,
        ]);
        break;
      }
      case 'skewY': {
        const [angle] = args;
        matrix = multiply(matrix, [
          1,
          Math.tan((angle * Math.PI) / 180),
          0,
          1,
          0,
          0,
        ]);
        break;
      }
      case 'matrix': {
        matrix = multiply(matrix, args as Matrix2D);
        break;
      }
      default:
        break;
    }
  }
  return matrix;
}

if (!('transform' in SVGElement.prototype)) {
  Object.defineProperty(SVGElement.prototype, 'transform', {
    configurable: true,
    get() {
      const raw = this.getAttribute('transform');
      return {
        baseVal: {
          consolidate: () => {
            if (!raw) return null;
            const [a, b, c, d, e, f] = parseSvgTransformList(raw);
            return { matrix: { a, b, c, d, e, f } };
          },
        },
      };
    },
  });
}

beforeAll(preview.composed.beforeAll);
afterEach(() => {
  cleanup();
});

afterAll(() => {
  vi.resetAllMocks();
});
