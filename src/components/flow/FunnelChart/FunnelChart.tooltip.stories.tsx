import preview from '../../../../.storybook/preview';
import FunnelChart, { FunnelDatumInfo } from '.';
import data from './sample.json';

/**
 * Hover a stage's band to see its value and conversion percents.
 * Enable with `tooltip={{}}`; the default HTML is stage, value, of-first
 * and of-previous.
 */
const meta = preview.meta({
  title: 'Flow/FunnelChart/Tooltip',
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
  shape: 'trapezoid' as const,
  classNameMap,
  labels: { stage: true },
};

/** Default tooltip HTML: stage, value, of first, of previous. */
export const Tooltip = meta.story({
  args: {
    ...base,
    id: 'funnel-tooltip',
    tooltip: {},
  },
});

/** Style the tooltip with `tooltip.className`. */
export const TooltipStyled = meta.story({
  args: {
    ...base,
    id: 'funnel-tooltip-styled',
    tooltip: { className: 'bg-white text-xs p-2 shadow' },
  },
});

/** `tooltip.html` replaces the default HTML. The datum includes `__funnel`. */
export const TooltipCustomHtml = meta.story({
  args: {
    ...base,
    id: 'funnel-tooltip-html',
    tooltip: {
      className: 'bg-slate-800 text-white text-xs p-2 rounded',
      html: (datum: { name?: string; count?: number; __funnel?: FunnelDatumInfo }) => {
        const pct = datum.__funnel?.ofFirst;
        const shown =
          pct == null ? 'n/a' : `${Math.round(pct * 100)}% of first`;
        return `<div class="font-medium">${datum.name ?? ''}</div><div>${datum.count ?? ''} · ${shown}</div>`;
      },
    },
  },
});
