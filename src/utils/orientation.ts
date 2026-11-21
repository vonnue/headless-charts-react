/**
 * Shared orientation contract for unified charts that also ship pinned
 * wrappers (BoxPlot with BoxPlotH/BoxPlotV today; the Lollipop and Bar/Column
 * merges reuse it). See the "Orientation contract (shared)" section of the
 * orientation-merge specs.
 *
 * Resolution order, first match wins:
 *   1. the wrapper's pin, 2. the `orientation` prop, 3. config evidence,
 *   4. `'vertical'`.
 */
import type { ChartOrientation } from '@/types';
import { warnOnceInDev } from './devEnvironment';

export type OrientationIssue =
  | 'orientation-ignored'
  | 'orientation-mismatch'
  | 'time-ignored';

/** Evidence from the configs: the orientation they describe, and why. */
export interface OrientationEvidence {
  orientation: ChartOrientation;
  /** Clause for the mismatch message, e.g. `the statistic keys are on x` */
  clause: string;
}

export interface ResolveOrientationInput {
  /** Orientation pinned by a wrapper (step 1). */
  pinned?: ChartOrientation;
  /** The `orientation` prop as given (types may have been bypassed). */
  given?: unknown;
  /** What the configs describe, or null when they describe both or neither. */
  evidence: OrientationEvidence | null;
}

export interface OrientationResolution {
  orientation: ChartOrientation;
  /** Where the orientation came from. */
  source: 'pinned' | 'prop' | 'evidence' | 'default';
  /** A wrapper was given a different `orientation`; it was ignored. */
  ignoredGiven?: ChartOrientation;
  /**
   * The orientation came from a pin or the prop, but the configs only
   * describe the other one: nothing should be drawn.
   */
  mismatch?: OrientationEvidence;
}

const isOrientation = (value: unknown): value is ChartOrientation =>
  value === 'vertical' || value === 'horizontal';

export const otherOrientation = (o: ChartOrientation): ChartOrientation =>
  o === 'vertical' ? 'horizontal' : 'vertical';

/** Pure resolution of the shared orientation contract. */
export const resolveOrientation = ({
  pinned,
  given,
  evidence,
}: ResolveOrientationInput): OrientationResolution => {
  let orientation: ChartOrientation;
  let source: OrientationResolution['source'];
  if (pinned) {
    orientation = pinned;
    source = 'pinned';
  } else if (isOrientation(given)) {
    orientation = given;
    source = 'prop';
  } else if (evidence) {
    orientation = evidence.orientation;
    source = 'evidence';
  } else {
    orientation = 'vertical';
    source = 'default';
  }
  const result: OrientationResolution = { orientation, source };
  if (pinned && isOrientation(given) && given !== pinned) result.ignoredGiven = given;
  if (
    (source === 'pinned' || source === 'prop') &&
    evidence &&
    evidence.orientation !== orientation
  ) {
    result.mismatch = evidence;
  }
  return result;
};

/** Literal message bodies from the shared contract. */
export const orientationMessages = {
  ignored: (rendered: string, pinned: ChartOrientation, given: ChartOrientation, unified: string) =>
    `${rendered} is always ${pinned}; orientation="${given}" is ignored. Use ${unified} with orientation="${given}" instead.`,
  mismatch: (resolved: ChartOrientation, clause: string) =>
    `orientation is "${resolved}" but ${clause}; nothing is drawn. Set orientation="${otherOrientation(resolved)}".`,
  timeIgnored: () =>
    'y.scalingFunction "time" is only supported when orientation is "vertical" (dates on x); the category axis uses a band scale.',
} as const;

/**
 * One dev warning per chart, id and issue. Key `${rendered}#${id}:${issue}`,
 * message prefix `[headless-charts] ${rendered}#${id}: `.
 */
export const warnOrientation = (
  rendered: string,
  id: string,
  issue: OrientationIssue,
  body: string,
): void =>
  warnOnceInDev(
    `${rendered}#${id}:${issue}`,
    `[headless-charts] ${rendered}#${id}: ${body}`,
  );

/** The parts of an {@link OrientationResolution} that drive its warnings. */
export type OrientationWarningInput = Pick<
  OrientationResolution,
  'orientation' | 'ignoredGiven' | 'mismatch'
>;

/**
 * Logs the `orientation-ignored` / `orientation-mismatch` warnings that apply.
 * Takes only the fields it reads, so a full resolution or a chart's own
 * derived state can be passed without inventing a `source`.
 */
export const warnOrientationResolution = (
  rendered: string,
  unified: string,
  id: string,
  resolution: OrientationWarningInput,
): void => {
  if (resolution.ignoredGiven) {
    warnOrientation(
      rendered,
      id,
      'orientation-ignored',
      orientationMessages.ignored(
        rendered,
        resolution.orientation,
        resolution.ignoredGiven,
        unified,
      ),
    );
  }
  if (resolution.mismatch) {
    warnOrientation(
      rendered,
      id,
      'orientation-mismatch',
      orientationMessages.mismatch(resolution.orientation, resolution.mismatch.clause),
    );
  }
};
