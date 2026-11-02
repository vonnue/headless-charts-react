// Render checks for the range-chart config changes. Type-level checks live in
// configTypes.test-d.ts (Vitest typecheck).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { StrictMode } from 'react';

import BoxPlotH from './BoxPlotH';
import type { BoxPlotHSummaryProps } from './BoxPlotH';
import BoxPlotV from './BoxPlotV';
import CometPlot from './CometPlot';
import RangePlot from './RangePlot';
import {
  getBinValueKey,
  getBoxPlotConfigIssues,
  isDevEnvironment,
  resolveValueConfig,
} from './boxPlotConfig';

const rawRows = [
  { age: 22, salary: 30000 },
  { age: 25, salary: 32000 },
  { age: 27, salary: 40000 },
  { age: 35, salary: 55000 },
  { age: 38, salary: 60000 },
  { age: 50, salary: 80000 },
  { age: 55, salary: 78000 },
];

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

type GeometryAttr = 'x' | 'y' | 'width' | 'height' | 'x1' | 'x2' | 'y1' | 'y2';

// D3 setting an attribute to NaN leaves it unset in jsdom, so a missing
// attribute is the NaN-geometry signal and must fail (Number(null) === 0).
const numAttr = (el: Element, name: GeometryAttr): number => {
  const raw = el.getAttribute(name);
  expect(
    raw,
    `${name} attribute missing (NaN dropped by jsdom?)`,
  ).not.toBeNull();
  const n = Number(raw);
  expect(Number.isFinite(n), `${name}="${raw}" is not finite`).toBe(true);
  return n;
};

/**
 * Exactly `count` elements match, and every listed attribute is present and
 * finite. Only list attributes set synchronously: values set inside a d3
 * transition (H box width, V box y/height) are not applied yet in jsdom.
 */
const expectFiniteShapes = (
  selector: string,
  attrs: GeometryAttr[],
  count: number,
) => {
  const els = Array.from(document.querySelectorAll(selector));
  // compare lengths, not the element array (Vitest's diff of DOM arrays crashes)
  expect(els.length, `${selector} count`).toBe(count);
  els.forEach((el) => attrs.forEach((a) => numAttr(el, a)));
  return els;
};

describe('BoxPlot binned mode', () => {
  it('renders binned BoxPlotH without stat keys, with finite geometry', () => {
    render(
      <BoxPlotH
        id='bp-h-binned'
        data={rawRows}
        valueKey='salary'
        y={{ key: 'age', bin: { count: 3 } }}
        x={{ min: 0 }}
      />,
    );
    // x (from the box-start stat), y and height are set synchronously
    expectFiniteShapes('#bp-h-binned .box-plot-box', ['x', 'y', 'height'], 3);
  });

  it('renders binned BoxPlotV without stat keys, with finite geometry', () => {
    render(
      <BoxPlotV
        id='bp-v-binned'
        data={rawRows}
        valueKey='salary'
        x={{ key: 'age', bin: { count: 3 } }}
        y={{}}
      />,
    );
    // V boxes take their value-axis y/height in a transition, so check the
    // box category geometry plus the whisker lines, whose y1/y2 come from
    // the binned stats synchronously.
    expectFiniteShapes('#bp-v-binned .box-plot-box', ['x', 'y', 'width'], 3);
    expectFiniteShapes(
      '#bp-v-binned .box-plot-line',
      ['x1', 'x2', 'y1', 'y2'],
      3 * 4,
    ); // 4 lines per box
  });

  it("treats valueKey '' with bin as binned (same predicate as the types): no NaN boxes", () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(getBinValueKey({ bin: { count: 3 } }, '')).toBe('');
    expect(getBinValueKey({ bin: { count: 3 } }, undefined)).toBeUndefined();
    expect(getBinValueKey({}, 'salary')).toBeUndefined();

    render(
      <BoxPlotH
        id='bp-h-empty-key'
        data={rawRows}
        valueKey=''
        y={{ key: 'age', bin: { count: 3 } }}
        x={{}}
      />,
    );
    // No field named '' -> no stats -> nothing drawn, rather than NaN geometry,
    // and the blank chart is explained in development
    expect(
      document.querySelectorAll('#bp-h-empty-key .box-plot-box'),
    ).toHaveLength(0);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'BoxPlotH#bp-h-empty-key: valueKey "" produced no numeric values',
      ),
    );
  });

  it('resolveValueConfig returns null instead of a config missing stat keys', () => {
    expect(resolveValueConfig({ min: 0 }, false)).toBeNull();
    expect(resolveValueConfig({ min: 0 }, true)).toMatchObject({
      minKey: '_min',
      midKey: '_median',
      min: 0,
    });
  });
});

describe('BoxPlot dev-only config warnings', () => {
  const summaryRows = [
    { label: 'A', lo: 1, q1: 2, med: 3, q3: 4, hi: 5 },
    { label: 'B', lo: 2, q1: 3, med: 4, q3: 5, hi: 6 },
  ];
  const statKeys = {
    minKey: 'lo',
    boxStart: 'q1',
    midKey: 'med',
    boxEnd: 'q3',
    maxKey: 'hi',
  } as const;
  const spyWarn = () => vi.spyOn(console, 'warn').mockImplementation(() => {});

  it('warns on a misspelled valueKey in binned mode (BoxPlotV)', () => {
    const warn = spyWarn();
    render(
      <BoxPlotV
        id='bp-v-typo'
        data={rawRows}
        valueKey='salry'
        x={{ key: 'age', bin: { count: 3 } }}
        y={{}}
      />,
    );
    expect(document.querySelectorAll('#bp-v-typo .box-plot-box')).toHaveLength(
      0,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'BoxPlotV#bp-v-typo: valueKey "salry" produced no numeric values',
      ),
    );
  });

  it('warns when stat keys are missing (types bypassed) and draws nothing', () => {
    // Deliberately bypass the props union: a summary config with no stat keys
    const missingStatKeys = { min: 0 } as unknown as BoxPlotHSummaryProps['x'];
    const warn = spyWarn();
    render(
      <BoxPlotH
        id='bp-h-no-stats'
        data={summaryRows}
        y={{ key: 'label' }}
        x={missingStatKeys}
      />,
    );
    expect(
      document.querySelectorAll('#bp-h-no-stats .box-plot-box'),
    ).toHaveLength(0);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'BoxPlotH#bp-h-no-stats: value axis needs minKey',
      ),
    );
  });

  it('warns when bin is set without valueKey, and falls back to summary mode', () => {
    const warn = spyWarn();
    render(
      <BoxPlotV
        id='bp-v-bin-no-key'
        data={summaryRows}
        x={{ key: 'label', bin: { count: 3 } }}
        y={statKeys}
      />,
    );
    expectFiniteShapes(
      '#bp-v-bin-no-key .box-plot-box',
      ['x', 'y', 'width'],
      2,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'BoxPlotV#bp-v-bin-no-key: bin is set on the category axis but valueKey is missing',
      ),
    );
  });

  it('does not warn for valid summary or binned configs', () => {
    const warn = spyWarn();
    render(
      <BoxPlotH
        id='bp-h-ok-summary'
        data={summaryRows}
        y={{ key: 'label' }}
        x={statKeys}
      />,
    );
    render(
      <BoxPlotV
        id='bp-v-ok-binned'
        data={rawRows}
        valueKey='salary'
        x={{ key: 'age', bin: { count: 3 } }}
        y={{}}
      />,
    );
    // Empty data is "no data", not a misconfiguration
    render(
      <BoxPlotH
        id='bp-h-ok-empty'
        data={[]}
        valueKey='salary'
        y={{ key: 'age', bin: { count: 3 } }}
        x={{}}
      />,
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns once per config, not on every render', () => {
    const warn = spyWarn();
    const el = (valueKey: string) => (
      <BoxPlotH
        id='bp-h-rerender'
        data={rawRows}
        valueKey={valueKey}
        // fresh inline objects every render, as consumers usually write them
        y={{ key: 'age', bin: { count: 3 } }}
        x={{}}
      />
    );
    const { rerender } = render(el(''));
    rerender(el(''));
    rerender(el(''));
    expect(warn).toHaveBeenCalledTimes(1);

    rerender(el('salary')); // fixed: no new warning
    expect(warn).toHaveBeenCalledTimes(1);

    rerender(el('salry')); // a new bad config warns again
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenLastCalledWith(
      expect.stringContaining('valueKey "salry"'),
    );
  });

  it('does not repeat a warning on remount or StrictMode double effects (review-3 R3)', () => {
    const warn = spyWarn();
    const el = (
      <BoxPlotH
        id='bp-h-remount'
        data={rawRows}
        valueKey=''
        y={{ key: 'age', bin: { count: 3 } }}
        x={{}}
      />
    );
    render(<StrictMode>{el}</StrictMode>).unmount();
    render(el);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('BoxPlotH#bp-h-remount'));
  });

  it('is silent when NODE_ENV is production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const warn = spyWarn();
    expect(isDevEnvironment()).toBe(false);
    render(
      <BoxPlotH
        id='bp-h-prod'
        data={rawRows}
        valueKey=''
        y={{ key: 'age', bin: { count: 3 } }}
        x={{}}
      />,
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it('getBoxPlotConfigIssues reports each issue', () => {
    const base = { data: rawRows, hasBin: true, statKeysPresent: false };
    expect(getBoxPlotConfigIssues({ ...base, valueKey: 'salary' })).toEqual([]);
    expect(getBoxPlotConfigIssues({ ...base, valueKey: '' })).toEqual([
      'no-binned-values',
    ]);
    expect(getBoxPlotConfigIssues({ ...base, valueKey: 'nope' })).toEqual([
      'no-binned-values',
    ]);
    expect(getBoxPlotConfigIssues({ ...base, data: [], valueKey: '' })).toEqual(
      [],
    );
    expect(getBoxPlotConfigIssues({ ...base, valueKey: undefined })).toEqual([
      'bin-without-valuekey',
      'missing-stat-keys',
    ]);
    expect(
      getBoxPlotConfigIssues({
        ...base,
        hasBin: false,
        statKeysPresent: true,
        valueKey: 'x',
      }),
    ).toEqual([]);
  });

  it('reports bin-ignored-in-time-mode when bin or valueKey meet a time axis', () => {
    const base = { data: rawRows, statKeysPresent: true, timeMode: true };
    expect(
      getBoxPlotConfigIssues({ ...base, hasBin: true, valueKey: 'salary' }),
    ).toEqual(['bin-ignored-in-time-mode']);
    expect(
      getBoxPlotConfigIssues({ ...base, hasBin: false, valueKey: 'salary' }),
    ).toEqual(['bin-ignored-in-time-mode']);
    expect(
      getBoxPlotConfigIssues({ ...base, hasBin: true, valueKey: undefined }),
    ).toEqual(['bin-ignored-in-time-mode']);
    // Binned-style config with no stat keys draws nothing in time mode: say so
    expect(
      getBoxPlotConfigIssues({
        ...base,
        hasBin: true,
        statKeysPresent: false,
        valueKey: 'salary',
      }),
    ).toEqual(['bin-ignored-in-time-mode', 'missing-stat-keys']);
    expect(
      getBoxPlotConfigIssues({ ...base, hasBin: false, valueKey: undefined }),
    ).toEqual([]);
  });

  it('warns that bin is ignored on a time-scaled BoxPlotV', () => {
    const warn = spyWarn();
    render(
      <BoxPlotV
        id='bp-v-time-bin'
        data={[
          { day: '2024-01-01', ...summaryRows[0] },
          { day: '2024-01-02', ...summaryRows[1] },
        ]}
        valueKey='lo'
        x={{ key: 'day', scalingFunction: 'time', bin: { count: 3 } }}
        y={statKeys}
      />,
    );
    expect(document.querySelectorAll('#bp-v-time-bin .box-plot-box')).toHaveLength(2);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('BoxPlotV#bp-v-time-bin: bin/valueKey are ignored'),
    );
  });
});

describe('range charts without x.key', () => {
  const rows = [
    { label: 'Jan', lo: 25, hi: 31 },
    { label: 'Feb', lo: 26, hi: 32 },
  ];

  it('renders RangePlot start and end dots', () => {
    render(
      <RangePlot
        id='range-no-key'
        shape='circle'
        data={rows}
        y={{ key: 'label' }}
        x={{ minKey: 'lo', maxKey: 'hi' }}
      />,
    );
    expect(document.querySelectorAll('#range-no-key .start-dots')).toHaveLength(
      2,
    );
    expect(document.querySelectorAll('#range-no-key .end-dots')).toHaveLength(
      2,
    );
  });

  it('renders CometPlot comets', () => {
    render(
      <CometPlot
        id='comet-no-key'
        data={rows}
        y={{ key: 'label' }}
        x={{ fromKey: 'lo', toKey: 'hi' }}
      />,
    );
    expect(
      document.querySelectorAll('#comet-no-key .data path').length,
    ).toBeGreaterThan(0);
  });
});
