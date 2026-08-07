import { ChartMeta, DecisionBranch, isNamedChartType } from './types';

/**
 * Projects the catalog into the two generated artefacts: `AGENTS.md` at the repo
 * root and the published `catalog.json`. Both are written by
 * `catalog.generated.test.ts`, which also fails if they drift from the source
 * metadata — so these functions must stay deterministic.
 */

const GENERATED_NOTICE =
  '<!-- Generated from src/components/**/meta.ts. Do not edit by hand — run `yarn docs` to regenerate. -->';

const cardinality = (c?: {
  min?: number;
  ideal?: [number, number];
  max?: number;
  note?: string;
}): string => {
  if (!c) return '';
  const parts: string[] = [];
  if (c.ideal) parts.push(`ideal ${c.ideal[0]}–${c.ideal[1]}`);
  if (c.min !== undefined) parts.push(`min ${c.min}`);
  if (c.max !== undefined) parts.push(`max ${c.max}`);
  const range = parts.join(', ');
  return c.note ? `${range} — ${c.note}` : range;
};

/** The full agent-facing guide: routing table first, per-chart detail after. */
export const renderAgentsMarkdown = (
  catalog: ChartMeta[],
  decisionTree: DecisionBranch[],
  globalRules: string[],
): string => {
  const lines: string[] = [];

  lines.push('# Choosing a chart in @headless-charts/react');
  lines.push('');
  lines.push(GENERATED_NOTICE);
  lines.push('');
  lines.push(
    'This file exists so that picking a chart is a lookup, not a guess. Start from the question the data is being used to answer, narrow with the decision table, then read that chart’s entry for its data shape and its limits.',
  );
  lines.push('');
  lines.push(
    'The same information is available programmatically: `import { chartCatalog, decisionTree } from "@headless-charts/react"`, or read `catalog.json` from the package root.',
  );
  lines.push('');

  lines.push('## Rules that apply to every chart');
  lines.push('');
  globalRules.forEach((rule) => lines.push(`- ${rule}`));
  lines.push('');

  lines.push('## If a chart type was named');
  lines.push('');
  lines.push(
    'Requests usually name a chart type ("a waterfall chart", "a streamgraph") rather than a component. Several of these are a base component plus a prop, not a component of their own — look the name up here before reaching for the decision table.',
  );
  lines.push('');
  lines.push('| Asked for | Render | Configuration |');
  lines.push('| --- | --- | --- |');

  const rows: { asked: string; render: string; config: string }[] = [];

  catalog.forEach((chart) => {
    rows.push({
      asked: [chart.name, ...chart.aliases].join(', '),
      render: `[\`${chart.name}\`](#${chart.name.toLowerCase()})`,
      config: 'Base component, no extra configuration',
    });
    (chart.variants ?? []).filter(isNamedChartType).forEach((variant) => {
      rows.push({
        asked: [variant.name, ...variant.aliases].join(', '),
        render: `[\`${chart.name}\`](#${chart.name.toLowerCase()})`,
        config: variant.how,
      });
    });
  });

  rows
    .sort((a, b) => a.asked.localeCompare(b.asked))
    .forEach((row) => lines.push(`| ${row.asked} | ${row.render} | ${row.config} |`));
  lines.push('');

  lines.push('## Decision table');
  lines.push('');
  lines.push('Find the question being asked, then pick among the candidates.');
  lines.push('');
  decisionTree.forEach((branch) => {
    lines.push(`### ${branch.question}`);
    lines.push('');
    lines.push('| Chart | Choose it when |');
    lines.push('| --- | --- |');
    branch.options.forEach((option) => {
      lines.push(`| [\`${option.name}\`](#${option.name.toLowerCase()}) | ${option.when} |`);
    });
    lines.push('');
  });

  lines.push('## Chart reference');
  lines.push('');

  catalog.forEach((chart) => {
    lines.push(`### ${chart.name}`);
    lines.push('');
    lines.push(chart.summary);
    lines.push('');
    lines.push(
      `**Category:** \`${chart.category}\` · **Answers:** ${chart.intents
        .map((i) => `\`${i}\``)
        .join(', ')} · **Storybook:** ${chart.storybook}`,
    );
    lines.push('');
    if (chart.aliases.length) {
      lines.push(`**Also called:** ${chart.aliases.join(', ')}`);
      lines.push('');
    }

    lines.push('**Use when**');
    lines.push('');
    chart.useWhen.forEach((item) => lines.push(`- ${item}`));
    lines.push('');

    lines.push('**Do not use when**');
    lines.push('');
    chart.avoidWhen.forEach((item) => lines.push(`- ${item}`));
    lines.push('');

    lines.push('**Data**');
    lines.push('');
    lines.push(`- \`data\` shape: ${chart.data.form}`);
    if (chart.data.seriesCount) {
      lines.push(`- Series: ${cardinality(chart.data.seriesCount)}`);
    }
    if (chart.data.rowCount) {
      lines.push(`- Rows: ${cardinality(chart.data.rowCount)}`);
    }
    lines.push('');
    lines.push('| Prop | Role | Required | Notes |');
    lines.push('| --- | --- | --- | --- |');
    chart.data.encodings.forEach((encoding) => {
      lines.push(
        `| \`${encoding.prop}\` | ${encoding.role} | ${
          encoding.required ? 'yes' : 'no'
        } | ${encoding.description} |`,
      );
    });
    lines.push('');

    lines.push(
      `**Required props:** ${chart.requiredProps.map((p) => `\`${p}\``).join(', ')}`,
    );
    lines.push('');

    lines.push('```tsx');
    lines.push(chart.example);
    lines.push('```');
    lines.push('');

    const namedTypes = (chart.variants ?? []).filter(isNamedChartType);
    const options = (chart.variants ?? []).filter(
      (variant) => !isNamedChartType(variant),
    );

    namedTypes.forEach((variant) => {
      lines.push(`#### ${variant.name} (${chart.name})`);
      lines.push('');
      lines.push(variant.summary);
      lines.push('');
      lines.push(`**Also called:** ${variant.aliases.join(', ')}`);
      lines.push('');
      lines.push(`**Configuration:** ${variant.how}`);
      lines.push('');
      lines.push('**Use when**');
      lines.push('');
      variant.useWhen.forEach((item) => lines.push(`- ${item}`));
      lines.push('');
      if (variant.avoidWhen?.length) {
        lines.push('**Do not use when**');
        lines.push('');
        variant.avoidWhen.forEach((item) => lines.push(`- ${item}`));
        lines.push('');
      }
      lines.push('```tsx');
      lines.push(variant.example);
      lines.push('```');
      lines.push('');
    });

    if (options.length) {
      lines.push('**Options**');
      lines.push('');
      options.forEach((variant) =>
        lines.push(`- **${variant.name}** — ${variant.how}`),
      );
      lines.push('');
    }

    lines.push('**Consider instead**');
    lines.push('');
    chart.alternatives.forEach((alternative) =>
      lines.push(
        `- [\`${alternative.name}\`](#${alternative.name.toLowerCase()}) — ${alternative.when}`,
      ),
    );
    lines.push('');
  });

  return `${lines.join('\n').trimEnd()}\n`;
};

/** The published machine-readable catalog. */
export const renderCatalogJson = (
  catalog: ChartMeta[],
  decisionTree: DecisionBranch[],
  globalRules: string[],
): string =>
  `${JSON.stringify(
    {
      $schema: 'https://github.com/hacklehub/headless-charts/blob/main/src/catalog/types.ts',
      description:
        'Machine-readable guide to which chart in @headless-charts/react suits which question and data shape.',
      globalRules,
      decisionTree,
      charts: catalog,
    },
    null,
    2,
  )}\n`;
