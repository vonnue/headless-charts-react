import preview from '../../../../.storybook/preview';
import FunnelChart, { PercentKind } from '.';
import data from './sample.json';

/**
 * Stage, value and conversion-percent labels are off by default.
 * Set `labels.stage`, `labels.value` and `labels.percent`.
 */
const meta = preview.meta({
  title: 'Flow/FunnelChart/Labels',
  component: FunnelChart,
  tags: ['autodocs'],
});

const classNameMap = {
  Visit: 'fill-slate-600',
  Signup: 'fill-slate-500',
  Activate: 'fill-slate-400',
  Subscribe: 'fill-slate-300',
  Renew: 'fill-slate-200',
};

const base = {
  className: 'w-full h-80',
  data,
  stage: { key: 'name' as const },
  value: { key: 'count' as const, className: 'fill-slate-400' },
};

/** Stage, value and percent-of-first labels. */
export const Labels = meta.story({
  args: {
    ...base,
    id: 'funnel-labels',
    shape: 'trapezoid',
    classNameMap,
    labels: {
      stage: { className: 'text-sm' },
      value: {
        className: 'text-xs fill-white',
        format: (v: number) => v.toLocaleString(),
      },
      percent: 'ofFirst',
    },
  },
});

/** `labels.percent: 'ofPrevious'` — each stage as a share of the one above it. */
export const OfPrevious = meta.story({
  args: {
    ...base,
    id: 'funnel-labels-previous',
    labels: {
      stage: true,
      value: true,
      percent: 'ofPrevious',
    },
  },
});

/** `labels.percent: 'both'` with an object form for class and format. */
export const Percent = meta.story({
  args: {
    ...base,
    id: 'funnel-percent',
    labels: {
      stage: true,
      percent: {
        of: 'both',
        className: 'text-xs',
        format: (pct: number | null, kind: PercentKind) =>
          pct === null
            ? `${kind === 'ofFirst' ? 'first' : 'prev'}: n/a`
            : `${kind === 'ofFirst' ? 'first' : 'prev'}: ${Math.round(pct * 100)}%`,
      },
    },
  },
});
