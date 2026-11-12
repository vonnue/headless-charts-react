/**
 * Pure helpers for FunnelChart: value sanitising, domain, percents and mark
 * geometry. Kept free of d3-selection/React so they are easy to unit test and
 * so the spec's "for Jayaram to confirm" choices live in one place.
 */
import { format } from 'd3-format';
import { isFiniteNumber, pinnedEnd } from '@/utils/domain';

/**
 * Behaviour switches for the choices the spec flagged for confirmation. Flip a
 * flag here to change the behaviour everywhere (component, tooltip, labels).
 */
export const FUNNEL_POLICY = {
  /**
   * Trapezoid mode: when `true` (Jayaram's decision, 9 Nov 2026; the spec
   * draft had a rectangle) the last stage tapers to a point (far edge 0).
   * Set `false` to keep the last stage a rectangle of its own width.
   */
  taperLastStage: true,
  /**
   * When `false` (spec default) a finite `value.start` is ignored, with a
   * one-time dev warning, so length encoding always starts at 0. When `true`
   * it pins the lower end of the value domain.
   */
  honorValueStart: false,
} as const;

export type PercentKind = 'ofFirst' | 'ofPrevious';

/** A stage value as drawn: finite and >= 0, otherwise 0. */
export const sanitizeValue = (raw: unknown): number =>
  isFiniteNumber(raw) && raw >= 0 ? raw : 0;

/** True when `raw` would be drawn as something other than itself. */
export const isInvalidValue = (raw: unknown): boolean =>
  !(isFiniteNumber(raw) && raw >= 0);

/**
 * Value domain `[start, end]`. `end` is the pinned `value.end` when finite,
 * otherwise the max of the (sanitised) values, otherwise 0. `start` is 0
 * unless `FUNNEL_POLICY.honorValueStart` is on and a finite start is given.
 */
export const valueDomain = (
  values: readonly number[],
  bounds: { start?: number; end?: number },
  policy: { honorValueStart: boolean } = FUNNEL_POLICY
): [number, number] => {
  const end = pinnedEnd([bounds.end]) ?? (values.length ? Math.max(...values) : 0);
  const start =
    policy.honorValueStart && isFiniteNumber(bounds.start) ? bounds.start : 0;
  return [start, end];
};

/**
 * Mark length for `value` over a cross-axis `span` in px. Clamped to
 * `[0, span]`; a degenerate domain (end <= start, e.g. all zeros) gives 0
 * rather than d3's half-range fallback.
 */
export const markLength = (
  value: number,
  domain: readonly [number, number],
  span: number
): number => {
  const [lo, hi] = domain;
  if (!(hi > lo) || !(span > 0)) return 0;
  const t = (value - lo) / (hi - lo);
  return Math.max(0, Math.min(1, t)) * span;
};

/** `a / b`, or `null` when the divisor is 0 or non-finite. */
export const ratio = (a: number, b: number): number | null =>
  isFiniteNumber(b) && b !== 0 && isFiniteNumber(a) ? a / b : null;

/** ofFirst and ofPrevious ratio for every stage (values already sanitised). */
export const stagePercents = (values: readonly number[]) =>
  values.map((v, i) => ({
    ofFirst: ratio(v, values[0]),
    ofPrevious: i === 0 ? null : ratio(v, values[i - 1]),
  }));

// `~` trims trailing zeros: 1 → "100%", 0.425 → "42.5%".
const pctFormat = format('.1~%');

/** Default percent text: `'n/a'` for null, otherwise one-decimal percent. */
export const formatPercent = (pct: number | null): string =>
  pct === null || !Number.isFinite(pct) ? 'n/a' : pctFormat(pct);

export interface StageGeometry {
  /** Polygon points in px, clockwise from the near-left corner. */
  points: [number, number][];
  /** Length of the edge nearest the first stage. */
  near: number;
  /** Length of the edge furthest from the first stage. */
  far: number;
  /** Centre of the mark, for labels. */
  cx: number;
  cy: number;
}

/**
 * Corner points for stage `i`. `bandStart` / `bandSize` are along the stage
 * axis; `centre` is the cross-axis midline. Vertical funnels run top → bottom
 * with lengths as widths; horizontal funnels run left → right with lengths as
 * heights.
 */
export const stageGeometry = ({
  lengths,
  i,
  shape,
  orientation,
  bandStart,
  bandSize,
  centre,
  policy = FUNNEL_POLICY,
}: {
  lengths: readonly number[];
  i: number;
  shape: 'bar' | 'trapezoid';
  orientation: 'vertical' | 'horizontal';
  bandStart: number;
  bandSize: number;
  centre: number;
  policy?: { taperLastStage: boolean };
}): StageGeometry => {
  const near = lengths[i] ?? 0;
  const isLast = i === lengths.length - 1;
  const far =
    shape === 'bar'
      ? near
      : isLast
      ? policy.taperLastStage
        ? 0
        : near
      : lengths[i + 1] ?? 0;
  const b0 = bandStart,
    b1 = bandStart + bandSize;
  // (along, across) pairs, then mapped to (x, y) by orientation.
  const raw: [number, number][] = [
    [b0, centre - near / 2],
    [b0, centre + near / 2],
    [b1, centre + far / 2],
    [b1, centre - far / 2],
  ];
  const points = raw.map(([along, across]) =>
    orientation === 'vertical'
      ? ([across, along] as [number, number])
      : ([along, across] as [number, number])
  );
  const mid = bandStart + bandSize / 2;
  return {
    points,
    near,
    far,
    cx: orientation === 'vertical' ? centre : mid,
    cy: orientation === 'vertical' ? mid : centre,
  };
};

/** SVG path `d` for a closed polygon. */
export const polygonPath = (points: readonly [number, number][]): string =>
  points.length
    ? `M${points.map(([x, y]) => `${x},${y}`).join('L')}Z`
    : '';
