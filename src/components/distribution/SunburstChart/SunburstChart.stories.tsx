import preview from '../../../../.storybook/preview';
import { buildHierarchy, nameOf } from '@/utils/hierarchy';
import SunburstChart from '.';
import data from './sample.json';
import flatData from './sample-flat.json';

/**
 * Sunburst charts show a hierarchical part-to-whole as concentric rings:
 * each depth is a ring and each node's angle encodes its value.
 *
 * To create a sunburst, use the `<SunburstChart />` component. Hover sets
 * `data-highlighted` / `data-dimmed`; style them with attribute selectors.
 */
const meta = preview.meta({
  title: 'Distribution/SunburstChart/Intro',
  component: SunburstChart,
  tags: ['autodocs'],
});

const classNameMap = {
  src: 'fill-sky-400 stroke-white',
  docs: 'fill-amber-300 stroke-white',
  test: 'fill-emerald-400 stroke-white',
};
const highlightClass =
  'w-full h-96 [&_[data-dimmed]]:opacity-30 [&_[data-highlighted]]:opacity-100';

/**
 * One hue family for a depth-1 slice: a mid parent fill, then distinct
 * light / medium / deep fills for its children. Full class strings are
 * written out so Tailwind's scanner can emit them.
 */
const HUE_FAMILIES = [
  { parent: 'fill-purple-600', children: ['fill-purple-300', 'fill-purple-500', 'fill-purple-700'] },
  { parent: 'fill-amber-600', children: ['fill-amber-300', 'fill-amber-500', 'fill-amber-700'] },
  { parent: 'fill-emerald-600', children: ['fill-emerald-300', 'fill-emerald-500', 'fill-emerald-700'] },
] as const;

const stroke = 'stroke-white';
const hasValue = (n: { value?: number }) => (n.value ?? 0) > 0;

/** Spread light / medium / deep across `count` siblings of one parent. */
const siblingFills = (fills: readonly string[], count: number): string[] => {
  if (count <= 0) return [];
  if (count === 1) return [fills[1]];
  if (count === 2) return [fills[0], fills[2]];
  if (count === 3) return [...fills];
  return Array.from({ length: count }, (_, i) => fills[i % fills.length]);
};

/**
 * `colorBy="name"` map: each depth-1 group gets a hue, and its children
 * get distinct shades of that hue, in the chart's sort order (value desc,
 * name asc). Deeper descendants reuse their depth-2 parent's shade. Names
 * must be unique — a clash keeps the last entry.
 */
const shadeClassNameMap = (input: unknown, valueKey: string): Record<string, string> => {
  const built = buildHierarchy({ data: input, valueKey });
  if (!built) return {};
  const map: Record<string, string> = {};
  (built.root.children ?? []).filter(hasValue).forEach((top, i) => {
    const family = HUE_FAMILIES[i % HUE_FAMILIES.length];
    map[nameOf(top.data)] = `${family.parent} ${stroke}`;
    const siblings = (top.children ?? []).filter(hasValue);
    const fills = siblingFills(family.children, siblings.length);
    siblings.forEach((child, j) => {
      const cls = `${fills[j]} ${stroke}`;
      child.each((n) => {
        if (hasValue(n)) map[nameOf(n.data)] = cls;
      });
    });
  });
  return map;
};

/** Default: centre disc, colour by top-level group, hover highlight. */
export const Default = meta.story({
  args: {
    id: 'sunburst-default',
    className: highlightClass,
    data,
    value: { key: 'size', className: 'fill-slate-300 stroke-white' },
    classNameMap,
    labels: { name: true },
    tooltip: { className: 'bg-white text-xs p-2 shadow' },
  },
});

/** Donut hole: `innerRadius > 0` drops the centre disc. */
export const Donut = meta.story({
  args: {
    ...Default.input.args,
    id: 'sunburst-donut',
    innerRadius: 0.35,
  },
});

/** Half sunburst via startAngle / endAngle. */
export const HalfCircle = meta.story({
  args: {
    ...Default.input.args,
    id: 'sunburst-half',
    startAngle: -Math.PI / 2,
    endAngle: Math.PI / 2,
  },
});

/** Forest input: no real root, so the centre stays empty. */
export const Forest = meta.story({
  args: {
    ...Default.input.args,
    id: 'sunburst-forest',
    data: data.children,
  },
});

/** Empty data: an empty SVG shell. */
export const Empty = meta.story({
  args: {
    ...Default.input.args,
    id: 'sunburst-empty',
    data: [],
  },
});

const flatClassNameMap = {
  src: 'fill-sky-400 stroke-white',
  docs: 'fill-amber-300 stroke-white',
  test: 'fill-emerald-400 stroke-white',
  scripts: 'fill-violet-400 stroke-white',
};

/** Flat rows: `levels` groups category columns from outer to inner. */
export const FlatRows = meta.story({
  args: {
    id: 'sunburst-flat-rows',
    className: highlightClass,
    data: flatData,
    levels: ['area', 'folder', 'file'],
    value: { key: 'size', className: 'fill-slate-300 stroke-white' },
    classNameMap: flatClassNameMap,
    labels: { name: true },
    tooltip: { className: 'bg-white text-xs p-2 shadow' },
  },
});

/**
 * Sibling shades of each parent hue. `colorBy="name"` plus a generated
 * `classNameMap`: each depth-1 group keeps a mid shade (`fill-purple-600`
 * for the first), and its children are assigned distinct light / medium /
 * deep fills of that same hue (`fill-purple-300` / `500` / `700`), in the
 * chart's sort order. Deeper descendants reuse their depth-2 parent's
 * shade. Node names must be unique for this technique.
 */
export const SiblingShades = meta.story({
  args: {
    ...Default.input.args,
    id: 'sunburst-sibling-shades',
    colorBy: 'name',
    classNameMap: shadeClassNameMap(data, 'size'),
  },
});
