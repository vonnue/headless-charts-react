import type { Locator, Page } from '@playwright/test';

export interface StructuralIssue {
  check: string;
  message: string;
}

const NUMERIC_ATTRS = [
  'x',
  'y',
  'width',
  'height',
  'cx',
  'cy',
  'r',
  'x1',
  'x2',
  'y1',
  'y2',
];

/**
 * Every numeric geometry attribute on every SVG element must parse to a
 * finite number, and every `transform="translate(...)"` must not contain
 * NaN/Infinity. Catches parse failures (e.g. a date format mismatch feeding
 * NaN through a scale) that a "does it render at all" check would miss,
 * since the element still exists in the DOM — it's just positioned nowhere
 * sensible.
 */
async function checkNoInvalidNumbers(svg: Locator): Promise<StructuralIssue[]> {
  return svg.evaluate((svgEl, attrs) => {
    const issues: { check: string; message: string }[] = [];
    const elements = svgEl.querySelectorAll('*');
    elements.forEach((el) => {
      for (const attr of attrs) {
        if (!el.hasAttribute(attr)) continue;
        const raw = el.getAttribute(attr);
        const value = Number(raw);
        if (!Number.isFinite(value)) {
          issues.push({
            check: 'no-invalid-numbers',
            message: `<${el.tagName.toLowerCase()} class="${el.getAttribute('class') ?? ''}"> has ${attr}="${raw}" (not a finite number)`,
          });
        }
      }
      const transform = el.getAttribute('transform');
      if (transform && /NaN|Infinity/.test(transform)) {
        issues.push({
          check: 'no-invalid-numbers',
          message: `<${el.tagName.toLowerCase()} class="${el.getAttribute('class') ?? ''}"> has transform="${transform}"`,
        });
      }
      // <path d="..."> (area/line fills, D3-drawn shapes) embeds its
      // coordinates in the `d` string rather than discrete attributes —
      // NaN there doesn't throw synchronously the way it might elsewhere,
      // though a real browser does reject the resulting invalid path data
      // as a console error (which the caller also checks for separately).
      if (el.tagName.toLowerCase() === 'path') {
        const d = el.getAttribute('d');
        if (d && /NaN|Infinity/.test(d)) {
          issues.push({
            check: 'no-invalid-numbers',
            message: `<path class="${el.getAttribute('class') ?? ''}"> has NaN/Infinity in its d attribute`,
          });
        }
      }
    });
    return issues;
  }, NUMERIC_ATTRS);
}

/**
 * d3-axis renders each axis as a `<g>` with a `<path class="domain">` whose
 * `d` attribute traces the axis line. An empty/degenerate `d` (or a missing
 * domain path entirely, on a chart that has an axis at all) means the axis
 * failed to render — catches gross breaks like a scale with an invalid
 * range or domain. Does NOT catch subtler geometry bugs (e.g. an axis that
 * renders but is shorter than it should be) — that needs chart-specific
 * expected-length knowledge this generic check doesn't have.
 */
async function checkAxesRendered(svg: Locator): Promise<StructuralIssue[]> {
  return svg.evaluate((svgEl) => {
    const issues: { check: string; message: string }[] = [];
    const domainPaths = svgEl.querySelectorAll('path.domain');
    domainPaths.forEach((path, i) => {
      const d = path.getAttribute('d');
      if (!d || d.trim().length < 4) {
        issues.push({
          check: 'axes-rendered',
          message: `axis domain path #${i} has degenerate d="${d}"`,
        });
      }
    });
    return issues;
  });
}

/**
 * Rendered shapes shouldn't sit wildly outside the SVG's own viewport — a
 * generous tolerance (half the SVG's own size) allows for intentional
 * partial overhang (see #16) without flagging it, while still catching
 * gross mispositioning (a coordinate off by orders of magnitude).
 */
async function checkNoGrossOverflow(svg: Locator): Promise<StructuralIssue[]> {
  return svg.evaluate((svgEl) => {
    const issues: { check: string; message: string }[] = [];
    const box = svgEl.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) {
      // Nothing to check against — a zero-size SVG is caught separately by
      // the "renders visible content" check.
      return issues;
    }
    const toleranceX = box.width * 0.5;
    const toleranceY = box.height * 0.5;
    const bounds = {
      left: box.left - toleranceX,
      right: box.right + toleranceX,
      top: box.top - toleranceY,
      bottom: box.bottom + toleranceY,
    };
    const shapes = svgEl.querySelectorAll('rect, circle, line, path:not(.domain)');
    shapes.forEach((shape) => {
      const shapeBox = (shape as SVGGraphicsElement).getBoundingClientRect();
      if (shapeBox.width === 0 && shapeBox.height === 0) return; // no geometry to check
      const outOfBounds =
        shapeBox.right < bounds.left ||
        shapeBox.left > bounds.right ||
        shapeBox.bottom < bounds.top ||
        shapeBox.top > bounds.bottom;
      if (outOfBounds) {
        issues.push({
          check: 'no-gross-overflow',
          message: `<${shape.tagName.toLowerCase()} class="${shape.getAttribute('class') ?? ''}"> renders far outside the SVG viewport (shape at [${shapeBox.left.toFixed(0)},${shapeBox.top.toFixed(0)}], svg is [${box.left.toFixed(0)},${box.top.toFixed(0)}]..[${box.right.toFixed(0)},${box.bottom.toFixed(0)}])`,
        });
      }
    });
    return issues;
  });
}

/** Every story should render *something* visible — an empty/blank story is a break. */
async function checkRendersVisibleContent(svg: Locator): Promise<StructuralIssue[]> {
  return svg.evaluate((svgEl) => {
    const issues: { check: string; message: string }[] = [];
    const box = svgEl.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) {
      issues.push({
        check: 'renders-visible-content',
        message: `svg has zero-size bounding box (${box.width}x${box.height})`,
      });
      return issues;
    }
    const shapes = svgEl.querySelectorAll('rect, circle, line, path');
    if (shapes.length === 0) {
      issues.push({
        check: 'renders-visible-content',
        message: 'svg contains no shape elements at all',
      });
    }
    return issues;
  });
}

/**
 * Runs every generic structural check against a rendered story's SVG.
 * These are deliberately chart-agnostic — they know nothing about a
 * specific chart's expected margins/padding/inset, only about invariants
 * true of any correctly-rendered SVG chart. They catch gross breaks (NaN
 * positions, a chart that renders nothing, wildly mispositioned marks) but
 * not subtler geometry regressions that need chart-specific expected values
 * — those stay the job of each chart's own test suite.
 */
export async function runStructuralChecks(page: Page): Promise<StructuralIssue[]> {
  const svg = page.locator('svg').first();
  const count = await page.locator('svg').count();
  if (count === 0) {
    return [{ check: 'renders-visible-content', message: 'no <svg> element found on the page' }];
  }

  const results = await Promise.all([
    checkNoInvalidNumbers(svg),
    checkAxesRendered(svg),
    checkNoGrossOverflow(svg),
    checkRendersVisibleContent(svg),
  ]);
  return results.flat();
}

/**
 * Every chart in this repo uses `.transition().duration(1000)` for at least
 * some marks (see feedback_jsdom_zero_size_makes_chart_tests_vacuous.md and
 * sibling memory on D3 transition timing). Wait past that before checking or
 * screenshotting, so structural checks and baselines see the settled state,
 * not an arbitrary mid-transition frame that would make every screenshot
 * flaky.
 */
export async function waitForTransitionsToSettle(page: Page): Promise<void> {
  await page.waitForTimeout(1200);
}
