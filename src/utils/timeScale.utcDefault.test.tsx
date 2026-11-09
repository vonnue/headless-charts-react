import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

import AreaChart from '@/components/linear/AreaChart';
import ColumnChart from '@/components/linear/ColumnChart';
import ColumnChartStacked from '@/components/linear/ColumnChartStacked';
import LineChart from '@/components/linear/LineChart';
import LollipopVChart from '@/components/linear/LollipopVChart';
import BoxPlotV from '@/components/ranges/BoxPlotV';
import type { AxisConfig } from '@/types';
import { resetDevWarnings } from '@/utils/devEnvironment';

// #25: with x.time.isISO and no x.time.utc, all six time-capable charts read
// and label dates in UTC, so date-only / UTC-midnight ISO data lands on its
// own day west of UTC. utc: false and non-ISO format strings stay local.

// Module-local declaration so this compiles without @types/node.
declare const process: { env: Record<string, string | undefined> };

const originalTZ = process.env.TZ;
beforeAll(() => {
  process.env.TZ = 'America/New_York';
});
afterAll(() => {
  process.env.TZ = originalTZ;
});
afterEach(() => {
  cleanup();
  resetDevWarnings();
  vi.restoreAllMocks();
});

type Time = NonNullable<AxisConfig['time']>;
const STYLE = { width: '600px', height: '300px' };
const DAYS = [2, 3, 4, 5, 6]; // 2–6 Jan 2025, clear of month/year boundaries
const JAN_3_UTC = Date.UTC(2025, 0, 3);

const rowsFor = (date: (day: number) => string) =>
  DAYS.map((day, i) => ({
    date: date(day),
    a: 10 + i,
    b: 5,
    min: 1,
    q1: 4,
    mid: 6 + i,
    q3: 8 + i,
    max: 20,
  }));

const dateOnly = (day: number) => `2025-01-0${day}`;
const utcMidnight = (day: number) => new Date(Date.UTC(2025, 0, day)).toISOString();

type Row = ReturnType<typeof rowsFor>[number];
type Draw = (id: string, data: Row[], time: Time) => void;

const charts: [string, Draw][] = [
  [
    'ColumnChart',
    (id, data, time) =>
      render(
        <ColumnChart
          id={id}
          style={STYLE}
          data={data}
          x={{ key: 'date', scalingFunction: 'time', time }}
          y={[{ key: 'a' }]}
        />
      ),
  ],
  [
    'ColumnChartStacked',
    (id, data, time) =>
      render(
        <ColumnChartStacked
          id={id}
          style={STYLE}
          data={data}
          x={{ key: 'date', scalingFunction: 'time', time }}
          y={[{ key: 'a' }, { key: 'b' }]}
        />
      ),
  ],
  [
    'LollipopVChart',
    (id, data, time) =>
      render(
        <LollipopVChart
          id={id}
          shape='circle'
          style={STYLE}
          data={data}
          x={{ key: 'date', scalingFunction: 'time', time }}
          y={{ key: 'a' }}
        />
      ),
  ],
  [
    'BoxPlotV',
    (id, data, time) =>
      render(
        <BoxPlotV
          id={id}
          style={STYLE}
          data={data}
          x={{ key: 'date', scalingFunction: 'time', time }}
          y={{
            key: 'mid',
            minKey: 'min',
            maxKey: 'max',
            midKey: 'mid',
            boxStart: 'q1',
            boxEnd: 'q3',
            min: 0,
          }}
        />
      ),
  ],
  [
    'AreaChart',
    (id, data, time) =>
      render(
        <AreaChart
          id={id}
          style={STYLE}
          data={data}
          x={{ key: 'date', scalingFunction: 'time', time }}
          y={[{ key: 'a' }]}
        />
      ),
  ],
  [
    'LineChart',
    (id, data, time) =>
      render(
        <LineChart
          id={id}
          style={STYLE}
          data={data}
          x={{ key: 'date', scalingFunction: 'time', time }}
          y={[{ key: 'a', symbol: 'none' }]}
        />
      ),
  ],
];

/** x-axis ticks of the chart `id`: their date, label and x pixel. */
const xTicks = (id: string) =>
  Array.from(document.querySelectorAll(`#${id} .axis--x .tick`)).map((t) => ({
    date: (t as unknown as { __data__: Date }).__data__,
    label: t.textContent,
    x: Number(/translate\(([-\d.]+)/.exec(t.getAttribute('transform') || '')![1]) - 0.5,
  }));

const safeId = (chart: string, label: string) =>
  `utc25-${chart}-${label}`.replace(/[^\w-]/g, '-').toLowerCase();

describe.each(charts)('%s time axis under America/New_York (#25)', (chart, draw) => {
  it('precondition: the zone is behind UTC', () => {
    expect(new Date(utcMidnight(3)).getDate()).toBe(2);
  });

  it.each([
    ['date-only', dateOnly],
    ['UTC-midnight', utcMidnight],
  ])('isISO %s data defaults to UTC: ticks on UTC midnights, labelled with the data day', (label, date) => {
    const id = safeId(chart, `default-${label}`);
    draw(id, rowsFor(date), { isISO: true });

    const ticks = xTicks(id);
    expect(ticks.length).toBeGreaterThanOrEqual(2);
    ticks.forEach((t) => expect(t.date.getUTCHours()).toBe(0));
    const jan3 = ticks.find((t) => t.date.getTime() === JAN_3_UTC);
    expect(jan3?.label).toBe('Fri 03');
  });

  it('explicit utc: false keeps local time: ticks on New York midnights', () => {
    const id = safeId(chart, 'utc-false');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    draw(id, rowsFor(dateOnly), { isISO: true, utc: false });

    const ticks = xTicks(id);
    expect(ticks.length).toBeGreaterThanOrEqual(2);
    // local midnight in New York (EST) is 05:00 UTC, so a UTC-midnight datum
    // sits 5h before its day's tick: the documented local-time caveat
    ticks.forEach((t) => expect(t.date.getUTCHours()).toBe(5));
  });

  it('non-ISO x.time.format data is unchanged: parsed and labelled in local time', () => {
    const id = safeId(chart, 'format');
    draw(id, rowsFor(dateOnly), { format: '%Y-%m-%d' });

    const ticks = xTicks(id);
    expect(ticks.length).toBeGreaterThanOrEqual(2);
    ticks.forEach((t) => expect(t.date.getHours()).toBe(0));
    const jan3 = ticks.find((t) => t.date.getTime() === new Date(2025, 0, 3).getTime());
    expect(jan3?.label).toBe('Fri 03');
  });
});

describe.each([
  ['ColumnChart', charts[0][1], '.marks rect'],
  ['ColumnChartStacked', charts[1][1], 'rect'],
] as const)('%s bars sit on their own day tick by default (#25)', (chart, draw, selector) => {
  it.each([
    ['date-only', dateOnly],
    ['UTC-midnight', utcMidnight],
  ])('%s ISO data', (label, date) => {
    const id = safeId(chart, `bars-${label}`);
    const rows = rowsFor(date);
    draw(id, rows, { isISO: true });

    const tickX = new Map(xTicks(id).map((t) => [t.date.getTime(), t.x]));
    const rects = Array.from(document.querySelectorAll(`#${id} ${selector}`)).slice(0, rows.length);
    let matched = 0;
    DAYS.forEach((day, i) => {
      const x = tickX.get(Date.UTC(2025, 0, day));
      if (x === undefined) return;
      matched++;
      const centre =
        Number(rects[i].getAttribute('x')) + Number(rects[i].getAttribute('width')) / 2;
      expect(Math.abs(centre - x)).toBeLessThanOrEqual(1);
    });
    expect(matched).toBeGreaterThanOrEqual(2);
  });
});
