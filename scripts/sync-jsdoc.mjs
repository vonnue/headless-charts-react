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

  if (chart.wrappers?.length) {
    const list = chart.wrappers
      .map((w) => `\`${w.name}\` (\`${w.pins}\`)`)
      .join(', ');
    wrap(
      `Wrapper components: ${list}. Prefer \`<${chart.name}>\` with the prop set in new code; the wrappers remain a stable public API.`,
    ).forEach((line) => push(line));
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

  namedTypes.forEach((variant) => {
    push(`@example ${variant.name}`);
    push('```tsx');
    variant.example.split('\n').forEach((line) => push(line));
    push('```');
    push('');
  });

  chart.alternatives.forEach((alternative) => {
    const [first, ...rest] = wrap(`${alternative.name} — ${alternative.when}`, 66);
    push(`@see ${first}`);
    rest.forEach((line) => push(`  ${line}`));
  });
  out.push(' */');
  out.push(END);
  return out.join('\n');
};

/**
 * A short pointer for a wrapper component's file: what it pins, and where the
 * selection guidance lives. Wrappers carry no guidance of their own.
 */
const buildWrapperBlock = (chart, wrapper) => {
  const out = [START, '/**'];
  const push = (text) => out.push(text ? ` * ${text}` : ' *');
  wrap(
    `Wrapper component: {@link ${chart.name}} with \`${wrapper.pins}\` pinned${
      wrapper.variant ? `, rendering the ${wrapper.variant}` : ''
    }.${wrapper.note ? ` ${wrapper.note}` : ''}`,
  ).forEach((line) => push(line));
  push('');
  wrap(
    `A stable public API. Prefer \`<${chart.name} ${wrapper.pins}>\` in new code. Selection guidance (use when, avoid when, examples, alternatives) is on {@link ${chart.name}}.`,
  ).forEach((line) => push(line));
  push('');
  push(`@see ${chart.name}`);
  out.push(' */');
  out.push(END);
  return out.join('\n');
};

/** Where each chart's implementation lives, derived from its category. */
const componentPath = (chart, name = chart.name) =>
  path.join(repoRoot, 'src/components', chart.category, name, 'index.tsx');

const stale = [];
let rewritten = 0;

/** Rewrites (or, with --check, compares) the generated block in one file. */
const syncFile = (label, file, block) => {
  let source;
  try {
    source = readFileSync(file, 'utf8');
  } catch {
    console.error(`✗ ${label}: no component at ${path.relative(repoRoot, file)}`);
    process.exitCode = 1;
    return;
  }

  // Anchor on the identifier that is actually default-exported rather than on
  // the chart name: a couple of components declare a local name that differs
  // from the name they are exported under (ColumnChart declares
  // ColumnChartGrouped, CometPlot declares RangePlot).
  const exported = /^export default (\w+);/m.exec(source);
  if (!exported) {
    console.error(`✗ ${label}: no default export found in ${path.relative(repoRoot, file)}`);
    process.exitCode = 1;
    return;
  }

  // The block goes above the declaration and above any `// eslint-disable-next-line`
  // comments directly on it, so those keep applying to the declaration.
  const declaration = new RegExp(
    `^(?:[ \\t]*// eslint-disable-next-line[^\\n]*\\n)*(?:const ${exported[1]} = |function ${exported[1]}\\b)`,
    'm',
  );
  if (!declaration.test(source)) {
    console.error(
      `✗ ${label}: could not find \`const ${exported[1]} = \` or \`function ${exported[1]}\` to anchor the JSDoc block`,
    );
    process.exitCode = 1;
    return;
  }

  const existing = new RegExp(
    `${START.replace(/[*/]/g, '\\$&')}[\\s\\S]*?${END.replace(/[*/]/g, '\\$&')}\\n`,
  );
  const stripped = source.replace(existing, '');
  const anchor = declaration.exec(stripped);
  const next = `${stripped.slice(0, anchor.index)}${block}\n${stripped.slice(anchor.index)}`;

  if (next === source) return;

  if (check) {
    stale.push(label);
  } else {
    writeFileSync(file, next);
    rewritten += 1;
  }
};

let files = 0;
for (const chart of catalog.charts) {
  syncFile(chart.name, componentPath(chart), buildBlock(chart));
  files += 1;
  // Wrapper components live beside the unified chart, in the same category.
  (chart.wrappers ?? []).forEach((wrapper) => {
    syncFile(wrapper.name, componentPath(chart, wrapper.name), buildWrapperBlock(chart, wrapper));
    files += 1;
  });
}

if (check) {
  if (stale.length) {
    console.error(
      `JSDoc is stale for: ${stale.join(', ')}\nRun \`yarn docs\` to regenerate.`,
    );
    process.exit(1);
  }
  console.log(`✓ JSDoc in sync for ${catalog.charts.length} charts (${files} files)`);
} else {
  console.log(
    `✓ Synced JSDoc in ${rewritten} of ${files} files (${catalog.charts.length} charts)`,
  );
}
