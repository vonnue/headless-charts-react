import { describe, expect, it } from 'vitest';

// Imported as text rather than read with `fs` so this test needs no node types.
import indexSource from '../index.tsx?raw';
import {
  chartCatalog,
  chartTypeIndex,
  decisionTree,
  globalRules,
  resolveChartRequest,
} from '.';
import { renderAgentsMarkdown, renderCatalogJson } from './render';
import { isNamedChartType } from './types';

/** Component names re-exported from the package entry point. */
const exportedComponents = (): string[] =>
  [
    ...indexSource.matchAll(
      /export \{ default as (\w+) \} from '@\/components\/[^']+'/g,
    ),
  ].map((match) => match[1]);

const catalogNames = chartCatalog.map((chart) => chart.name);

describe('catalog integrity', () => {
  it('covers every chart exported from the package', () => {
    const missing = exportedComponents().filter(
      (name) => !catalogNames.includes(name),
    );
    expect(
      missing,
      `Charts exported from src/index.tsx with no meta.ts: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('does not describe charts that are not exported', () => {
    const exported = exportedComponents();
    const orphans = catalogNames.filter((name) => !exported.includes(name));
    expect(
      orphans,
      `Catalog entries with no matching export: ${orphans.join(', ')}`,
    ).toEqual([]);
  });

  it('has no duplicate entries', () => {
    expect(new Set(catalogNames).size).toBe(catalogNames.length);
  });

  it('only recommends alternatives that exist', () => {
    const broken = chartCatalog.flatMap((chart) =>
      chart.alternatives
        .filter((alternative) => !catalogNames.includes(alternative.name))
        .map((alternative) => `${chart.name} -> ${alternative.name}`),
    );
    expect(broken, `Unresolvable alternatives: ${broken.join(', ')}`).toEqual([]);
  });

  it('never recommends a chart as its own alternative', () => {
    const selfReferences = chartCatalog
      .filter((chart) =>
        chart.alternatives.some((alternative) => alternative.name === chart.name),
      )
      .map((chart) => chart.name);
    expect(selfReferences).toEqual([]);
  });

  it('routes every decision-tree option to a real chart', () => {
    const broken = decisionTree.flatMap((branch) =>
      branch.options
        .filter((option) => !catalogNames.includes(option.name))
        .map((option) => `${branch.intent} -> ${option.name}`),
    );
    expect(broken, `Unresolvable decision options: ${broken.join(', ')}`).toEqual(
      [],
    );
  });

  it('reaches every chart from at least one decision branch', () => {
    const routed = new Set(
      decisionTree.flatMap((branch) => branch.options.map((o) => o.name)),
    );
    const unreachable = catalogNames.filter((name) => !routed.has(name));
    expect(
      unreachable,
      `Charts no decision branch leads to: ${unreachable.join(', ')}`,
    ).toEqual([]);
  });

  // A chart's first intent is the question it is the characteristic answer to,
  // so it must be a candidate in that branch. Later intents are secondary uses
  // and may legitimately be left off that branch's shortlist.
  it('lists each chart as a candidate for its primary intent', () => {
    const mismatched = chartCatalog
      .filter((chart) => {
        const branch = decisionTree.find((b) => b.intent === chart.intents[0]);
        return !branch || !branch.options.some((o) => o.name === chart.name);
      })
      .map((chart) => `${chart.name} claims ${chart.intents[0]}`);
    expect(
      mismatched,
      `Primary intents claimed but not routed: ${mismatched.join(', ')}`,
    ).toEqual([]);
  });

  it.each(chartCatalog.map((chart) => [chart.name, chart] as const))(
    '%s has usable guidance',
    (name, chart) => {
      expect(chart.useWhen.length, `${name} needs useWhen entries`).toBeGreaterThan(0);
      expect(
        chart.avoidWhen.length,
        `${name} needs avoidWhen entries — negative guidance is what narrows a choice`,
      ).toBeGreaterThan(0);
      expect(chart.alternatives.length).toBeGreaterThan(0);
      expect(chart.data.encodings.length).toBeGreaterThan(0);
      expect(chart.requiredProps).toContain('id');
      expect(chart.example).toContain(`<${name}`);
      expect(chart.example, `${name} example must set a unique id`).toMatch(
        /id="[^"]+"/,
      );
      expect(chart.summary.endsWith('.')).toBe(true);
    },
  );
});

// Snapshot paths are resolved relative to this test file.
describe('named chart types', () => {
  const allNames = [
    ...chartCatalog.flatMap((chart) => [chart.name, ...chart.aliases]),
    ...chartTypeIndex.flatMap((entry) => [
      entry.variant.name,
      ...entry.variant.aliases,
    ]),
  ].map((name) => name.toLowerCase());

  it('has no name or alias claimed twice', () => {
    const seen = new Set<string>();
    const duplicates = allNames.filter((name) => {
      if (seen.has(name)) return true;
      seen.add(name);
      return false;
    });
    expect(
      duplicates,
      `A name resolving to two different charts is ambiguous: ${duplicates.join(', ')}`,
    ).toEqual([]);
  });

  it('never aliases a chart to another chart’s component name', () => {
    const componentNames = new Set(
      chartCatalog.map((chart) => chart.name.toLowerCase()),
    );
    const collisions = chartCatalog.flatMap((chart) =>
      chart.aliases
        .filter(
          (alias) =>
            componentNames.has(alias.toLowerCase()) &&
            alias.toLowerCase() !== chart.name.toLowerCase(),
        )
        .map((alias) => `${chart.name} -> ${alias}`),
    );
    expect(collisions).toEqual([]);
  });

  it('keeps aliases lowercase so lookups are predictable', () => {
    const wrongCase = allNames.filter(
      (name, index) =>
        index >= chartCatalog.length && name !== name.toLowerCase(),
    );
    expect(wrongCase).toEqual([]);
  });

  it.each(chartTypeIndex.map((e) => [`${e.variant.name} (${e.chart.name})`, e] as const))(
    '%s is usable',
    (_label, entry) => {
      expect(entry.variant.aliases.length).toBeGreaterThan(0);
      expect(entry.variant.useWhen.length).toBeGreaterThan(0);
      expect(entry.variant.summary.endsWith('.')).toBe(true);
      // The example must render the base component, not some other chart.
      expect(entry.variant.example).toContain(`<${entry.chart.name}`);
      expect(entry.variant.example).toMatch(/id="[^"]+"/);
    },
  );

  it('resolves component names, chart aliases and specialised types alike', () => {
    expect(resolveChartRequest('BarChart')?.chart.name).toBe('BarChart');
    expect(resolveChartRequest('dumbbell chart')?.chart.name).toBe('RangePlot');

    const waterfall = resolveChartRequest('waterfall');
    expect(waterfall?.chart.name).toBe('ColumnChartStacked');
    expect(waterfall?.variant?.name).toBe('Waterfall chart');

    const streamgraph = resolveChartRequest('  Stream Graph  ');
    expect(streamgraph?.chart.name).toBe('AreaChart');
    expect(streamgraph?.variant?.how).toContain('streamgraph');

    expect(resolveChartRequest('not a real chart')).toBeUndefined();
  });

  // The union makes this unrepresentable in TypeScript; the check exists because
  // the same shape ships as catalog.json, which nothing type-checks on the way in.
  it('tags every variant as either a chart type or an option', () => {
    const untagged = chartCatalog.flatMap((chart) =>
      (chart.variants ?? [])
        .map((variant) => variant as { kind: string; name: string })
        .filter((v) => v.kind !== 'chart-type' && v.kind !== 'option')
        .map((v) => `${chart.name} -> ${v.name}`),
    );
    expect(untagged).toEqual([]);
  });

  it('gives every chart at least one alias', () => {
    const bare = chartCatalog
      .filter((chart) => chart.aliases.length === 0)
      .map((chart) => chart.name);
    expect(bare).toEqual([]);
  });

  it('describes the specialised types the user asked about', () => {
    const find = (name: string) =>
      chartTypeIndex.find((e) => e.variant.name.toLowerCase() === name);
    expect(find('streamgraph')?.chart.name).toBe('AreaChart');
    expect(find('waterfall chart')?.chart.name).toBe('ColumnChartStacked');
    expect(
      chartCatalog
        .find((c) => c.name === 'ColumnChart')
        ?.variants?.filter(isNamedChartType)
        .map((v) => v.name),
    ).toContain('Histogram');
  });
});

describe('generated artefacts', () => {
  it('AGENTS.md is up to date', async () => {
    await expect(
      renderAgentsMarkdown(chartCatalog, decisionTree, globalRules),
    ).toMatchFileSnapshot('../../AGENTS.md');
  });

  it('catalog.json is up to date', async () => {
    await expect(
      renderCatalogJson(chartCatalog, decisionTree, globalRules),
    ).toMatchFileSnapshot('../../catalog.json');
  });
});
