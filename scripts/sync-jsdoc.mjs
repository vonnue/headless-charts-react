#!/usr/bin/env node
/**
 * Projects the chart catalog into JSDoc above each component declaration, so the
 * selection guidance survives into `dist/index.d.ts` and shows up wherever the
 * component is used — which is the only surface an agent is guaranteed to read.
 *
 * The block is delimited by markers and rewritten in place; anything outside the
 * markers is left alone.
 *
 *   node scripts/sync-jsdoc.mjs           rewrite the blocks
 *   node scripts/sync-jsdoc.mjs --check   exit 1 if any block is stale
 *
 * Reads the generated catalog.json rather than the TypeScript sources, so this
 * stays a dependency-free node script. Run `yarn docs` first if meta.ts changed.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const START = '/* catalog:start */';
const END = '/* catalog:end */';

const check = process.argv.includes('--check');

const catalogPath = path.join(repoRoot, 'catalog.json');
let catalog;
try {
  catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
} catch {
  console.error(
    `Could not read ${catalogPath}. Run \`yarn docs\` to generate it first.`,
  );
  process.exit(1);
}

/** Wrap prose so the generated JSDoc stays readable in an editor. */
const wrap = (text, width = 76) => {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line && `${line} ${word}`.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
};

const buildBlock = (chart) => {
  const out = [START, '/**'];
  const push = (text) => out.push(text ? ` * ${text}` : ' *');

  wrap(chart.summary).forEach((line) => push(line));
  push('');

  push('@remarks');
  push('');
  push('**Use when**');
  chart.useWhen.forEach((item) => {
    const [first, ...rest] = wrap(item, 72);
    push(`- ${first}`);
    rest.forEach((line) => push(`  ${line}`));
  });
  push('');
  push('**Avoid when**');
  chart.avoidWhen.forEach((item) => {
    const [first, ...rest] = wrap(item, 72);
    push(`- ${first}`);
    rest.forEach((line) => push(`  ${line}`));
  });
  push('');

  const namedTypes = (chart.variants ?? []).filter((v) => v.kind === 'chart-type');
  if (namedTypes.length) {
    push('**Specialised types**');
    namedTypes.forEach((variant) => {
      const [first, ...rest] = wrap(`${variant.name} — ${variant.how}`, 72);
      push(`- ${first}`);
      rest.forEach((line) => push(`  ${line}`));
    });
    push('');
  }

  if (chart.aliases?.length) {
    push(`Also called: ${chart.aliases.join(', ')}.`);
    push('');
  }

  push(
    `Answers: ${chart.intents.join(', ')}. Required props: ${chart.requiredProps
      .map((p) => `\`${p}\``)
      .join(', ')}.`,
  );
  push('');
  push('@example');
  push('```tsx');
  chart.example.split('\n').forEach((line) => push(line));
  push('```');
  push('');
  chart.alternatives.forEach((alternative) => {
    const [first, ...rest] = wrap(`${alternative.name} — ${alternative.when}`, 66);
    push(`@see ${first}`);
    rest.forEach((line) => push(`  ${line}`));
  });
  out.push(' */');
  out.push(END);
  return out.join('\n');
};

/** Where each chart's implementation lives, derived from its category. */
const componentPath = (chart) =>
  path.join(repoRoot, 'src/components', chart.category, chart.name, 'index.tsx');

const stale = [];
let rewritten = 0;

for (const chart of catalog.charts) {
  const file = componentPath(chart);
  let source;
  try {
    source = readFileSync(file, 'utf8');
  } catch {
    console.error(`✗ ${chart.name}: no component at ${path.relative(repoRoot, file)}`);
    process.exitCode = 1;
    continue;
  }

  const block = buildBlock(chart);

  // Anchor on the identifier that is actually default-exported rather than on
  // the chart name: a couple of components declare a local name that differs
  // from the name they are exported under (ColumnChart declares
  // ColumnChartGrouped, CometPlot declares RangePlot).
  const exported = /^export default (\w+);/m.exec(source);
  if (!exported) {
    console.error(`✗ ${chart.name}: no default export found in ${path.relative(repoRoot, file)}`);
    process.exitCode = 1;
    continue;
  }

  const declaration = new RegExp(`^const ${exported[1]} = `, 'm');
  if (!declaration.test(source)) {
    console.error(
      `✗ ${chart.name}: could not find \`const ${exported[1]} = \` to anchor the JSDoc block`,
    );
    process.exitCode = 1;
    continue;
  }

  const existing = new RegExp(
    `${START.replace(/[*/]/g, '\\$&')}[\\s\\S]*?${END.replace(/[*/]/g, '\\$&')}\\n`,
  );
  const stripped = source.replace(existing, '');
  const anchor = declaration.exec(stripped);
  const next = `${stripped.slice(0, anchor.index)}${block}\n${stripped.slice(anchor.index)}`;

  if (next === source) continue;

  if (check) {
    stale.push(chart.name);
  } else {
    writeFileSync(file, next);
    rewritten += 1;
  }
}

if (check) {
  if (stale.length) {
    console.error(
      `JSDoc is stale for: ${stale.join(', ')}\nRun \`yarn docs\` to regenerate.`,
    );
    process.exit(1);
  }
  console.log(`✓ JSDoc in sync for ${catalog.charts.length} charts`);
} else {
  console.log(
    `✓ Synced JSDoc for ${rewritten} of ${catalog.charts.length} charts`,
  );
}
