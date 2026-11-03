import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import BarChart from './BarChart';
import ColumnChart from './ColumnChart';
import LineChart from './LineChart';
import LollipopVChart from './LollipopVChart';

// #32: each chart clips its marks to its own plot-area clipPath. clipPath ids
// are page-global, so a shared id (LineChart's old 'clip', or ColumnChart's
// dangling url(#clip)) made charts use each other's rect, or nothing at all.

const style = { width: '600px', height: '400px' };
const margin = { top: 20, right: 50, bottom: 40, left: 50 };
const rows = [
  { name: 'a', v: 5 },
  { name: 'b', v: 50 },
  { name: 'c', v: 120 },
];

type Case = {
  name: string;
  // Selector for the clipped group that holds the marks.
  marks: string;
  // Selector for the marks that must sit inside that group.
  mark: string;
  chart: (id: string, data?: typeof rows) => ReactElement;
};

const cases: Case[] = [
  {
    name: 'BarChart',
    marks: 'g.marks',
    mark: 'rect.fill-current',
    chart: (id, data = rows) => (
      <BarChart
        id={id}
        style={style}
        margin={margin}
        data={data}
        x={[{ key: 'v', start: 20, end: 100 }]}
        y={{ key: 'name' }}
      />
    ),
  },
  {
    name: 'ColumnChart',
    marks: 'g.marks',
    mark: 'rect.fill-current',
    chart: (id, data = rows) => (
      <ColumnChart
        id={id}
        style={style}
        margin={margin}
        data={data}
        x={{ key: 'name' }}
        y={[{ key: 'v', start: 20, end: 100 }]}
      />
    ),
  },
  {
    name: 'LollipopVChart',
    marks: 'g.marks',
    mark: 'line.line',
    chart: (id, data = rows) => (
      <LollipopVChart
        id={id}
        style={style}
        margin={margin}
        data={[...data]}
        shape='circle'
        x={{ key: 'name' }}
        y={{ key: 'v', start: 20, end: 100 }}
      />
    ),
  },
  {
    name: 'LineChart',
    marks: 'g.left-g',
    mark: 'path.left-series',
    chart: (id, data = rows) => (
      <LineChart
        id={id}
        style={style}
        margin={margin}
        data={data.map((d, i) => ({ x: i, v: d.v }))}
        x={{ key: 'x' }}
        y={[{ key: 'v', start: 20, end: 100 }]}
      />
    ),
  },
];

const clipIdOf = (svg: Element, marks: string) => {
  const group = svg.querySelector(marks);
  expect(group, `${marks} group`).toBeTruthy();
  const ref = group?.getAttribute('clip-path') ?? '';
  const match = /^url\(#(.+)\)$/.exec(ref);
  expect(match, `clip-path="${ref}"`).toBeTruthy();
  return match?.[1] ?? '';
};

describe.each(cases)('$name plot clip (#32)', ({ marks, mark, chart }) => {
  it('clips the marks group with a clipPath that exists, unique to the chart', () => {
    render(chart('clip-one'));
    const svg = document.getElementById('clip-one') as Element;
    const clipId = clipIdOf(svg, marks);
    expect(clipId).toBe('clip-one-plot-clip');
    const clipPaths = document.querySelectorAll(`clipPath[id="${clipId}"]`);
    expect(clipPaths).toHaveLength(1);
    expect(svg.contains(clipPaths[0])).toBe(true);
    expect(clipPaths[0].querySelector('rect')).toBeTruthy();
    // Every mark is drawn inside the clipped group.
    const group = svg.querySelector(marks) as Element;
    const all = svg.querySelectorAll(mark);
    expect(all.length).toBeGreaterThan(0);
    all.forEach((m) => expect(group.contains(m)).toBe(true));
  });

  it('two charts on one page reference distinct clipPaths', () => {
    render(
      <>
        {chart('clip-left')}
        {chart('clip-right')}
      </>
    );
    const left = clipIdOf(document.getElementById('clip-left') as Element, marks);
    const right = clipIdOf(document.getElementById('clip-right') as Element, marks);
    expect(left).not.toBe(right);
    expect(document.querySelectorAll(`clipPath[id="${left}"]`)).toHaveLength(1);
    expect(document.querySelectorAll(`clipPath[id="${right}"]`)).toHaveLength(1);
  });

  it('does not duplicate its clipPath on redraw', () => {
    const { rerender } = render(chart('clip-redraw'));
    rerender(chart('clip-redraw', rows.map((d) => ({ ...d, v: d.v + 1 }))));
    expect(document.querySelectorAll('clipPath[id="clip-redraw-plot-clip"]')).toHaveLength(1);
  });
});

describe('plot clip rect matches the plot area (#32)', () => {
  it('BarChart clips to margins plus padding', () => {
    render(
      <BarChart
        id='clip-rect-bar'
        style={style}
        margin={margin}
        padding={{ top: 5, right: 10, bottom: 5, left: 10, bar: 0.1 }}
        data={rows}
        x={[{ key: 'v' }]}
        y={{ key: 'name' }}
      />
    );
    const rect = document.querySelector('#clip-rect-bar-plot-clip rect') as Element;
    expect(Number(rect.getAttribute('x'))).toBe(60);
    expect(Number(rect.getAttribute('y'))).toBe(25);
    expect(Number(rect.getAttribute('width'))).toBe(480);
    expect(Number(rect.getAttribute('height'))).toBe(330);
  });

  it('ColumnChart reference lines use the chart clip, not a dangling #clip', () => {
    render(
      <ColumnChart
        id='clip-ref-col'
        style={style}
        margin={margin}
        data={rows}
        x={{ key: 'name' }}
        y={[{ key: 'v' }]}
        referenceLines={[{ y: 60 }]}
      />
    );
    const line = document.querySelector('#clip-ref-col .reference-line') as Element;
    expect(line.getAttribute('clip-path')).toBe('url(#clip-ref-col-plot-clip)');
  });
});
