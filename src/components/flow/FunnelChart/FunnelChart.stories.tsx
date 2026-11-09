import preview from '../../../../.storybook/preview';
import FunnelChart, { PercentKind } from '.';
import data from './sample.json';

/**
 * Funnel charts show counts moving through ordered stages. Each stage is a
 * centred bar (or a connected trapezoid) whose length encodes its value, so
 * the drop-off between stages is what reads first.
 *
 * To create a funnel chart, use the `<FunnelChart />` component.
 */
const meta = preview.meta({
  title: 'Flow/FunnelChart/Intro',
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

/** Default: vertical centred bars, stages top → bottom. */
export const Default = meta.story({
  args: {
    id: 'funnel-default',
    className: 'w-full h-80',
    data,
    stage: { key: 'name' },
    value: { key: 'count', className: 'fill-slate-400' },
    tooltip: { className: 'bg-white text-xs p-2 shadow' },
  },
});

/** `shape="trapezoid"`: segments connect; the last stage tapers to a point. */
export const Trapezoid = meta.story({
  args: {
    ...Default.input.args,
    id: 'funnel-trapezoid',
    shape: 'trapezoid',
    classNameMap,
    labels: { stage: true },
  },
});

/** `orientation="horizontal"`: stages left → right, lengths are heights. */
export const Horizontal = meta.story({
  args: {
    ...Default.input.args,
    id: 'funnel-horizontal',
    orientation: 'horizontal',
    labels: { stage: true },
  },
});

/** Horizontal trapezoids. */
export const HorizontalTrapezoid = meta.story({
  args: {
    ...Default.input.args,
    id: 'funnel-horizontal-trapezoid',
    orientation: 'horizontal',
    shape: 'trapezoid',
    classNameMap,
    labels: { stage: true, value: { className: 'text-xs' } },
  },
});

/** Stage, value and percent-of-first labels. */
export const Labels = meta.story({
  args: {
    ...Default.input.args,
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

/** `labels.percent: 'both'` with an object form for class and format. */
export const Percent = meta.story({
  args: {
    ...Default.input.args,
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

/** Empty data: an empty SVG shell, no marks. */
export const Empty = meta.story({
  args: {
    ...Default.input.args,
    id: 'funnel-empty',
    data: [],
  },
});

/** One stage: ofFirst is 100%, ofPrevious is n/a. */
export const SingleStage = meta.story({
  args: {
    ...Default.input.args,
    id: 'funnel-single',
    data: [data[0]],
    labels: { stage: true, value: true, percent: 'both' },
  },
});
