import { describe, expect, it } from 'vitest';

import { tooltipRows } from './tooltipRows';

describe('tooltipRows', () => {
  it('joins [label, value] pairs with ": " and <br/> by default', () => {
    expect(
      tooltipRows([
        ['name', 'Apples'],
        ['value', 42],
      ])
    ).toBe('name: Apples<br/>value: 42');
  });

  it('emits a bare string row as-is (label-only or preformatted)', () => {
    expect(tooltipRows(['Alpha', ['0', 1]])).toBe('Alpha<br/>0: 1');
    expect(tooltipRows(['Root › A', '40', ['of parent', '100%']])).toBe(
      'Root › A<br/>40<br/>of parent: 100%'
    );
  });

  it('skips undefined, null and false rows, but keeps empty strings', () => {
    expect(
      tooltipRows([
        ['keep', 1],
        undefined,
        null,
        false,
        '',
        ['also', 2],
      ])
    ).toBe('keep: 1<br/><br/>also: 2');
    expect(tooltipRows([undefined, null, false])).toBe('');
    expect(tooltipRows([])).toBe('');
  });

  it('does not drop a row whose value is undefined, null, 0, or an empty string', () => {
    expect(tooltipRows([['missing', undefined]])).toBe('missing: undefined');
    expect(tooltipRows([['empty', '']])).toBe('empty: ');
    expect(tooltipRows([['none', null]])).toBe('none: null');
    expect(tooltipRows([['zero', 0]])).toBe('zero: 0');
  });

  it('accepts a fmt function as the second argument or as options.fmt', () => {
    const fmt = (v: unknown) => String(v).toUpperCase();
    expect(tooltipRows([['n', 'ab']], fmt)).toBe('n: AB');
    expect(tooltipRows([['n', 'ab']], { fmt })).toBe('n: AB');
    // fmt does not rewrite pre-built string rows
    expect(tooltipRows(['raw', ['n', 'ab']], fmt)).toBe('raw<br/>n: AB');
  });

  it('uses a custom sep and join', () => {
    expect(
      tooltipRows(
        [
          ['x', 1],
          ['y', 2],
        ],
        { sep: ' ', join: '<br/>' }
      )
    ).toBe('x 1<br/>y 2');
    expect(
      tooltipRows(
        [
          ['Data', 3],
          ['Error', 0],
        ],
        { join: ' <br/> ' }
      )
    ).toBe('Data: 3 <br/> Error: 0');
    expect(tooltipRows(['Alpha', '1/2'], { join: ' <br/>' })).toBe(
      'Alpha <br/>1/2'
    );
  });

  it('matches Object.entries interpolation used by the useTooltip fallback', () => {
    const d = { name: 'Apples', value: 42 };
    const previous = Object.entries(d)
      .map(([key, value]) => `${key}: ${value}`)
      .join('<br/>');
    expect(tooltipRows(Object.entries(d))).toBe(previous);
  });
});

describe('tooltipRows byte-identical chart patterns', () => {
  it('LinearGauge: spaces around <br/>', () => {
    const data = 12;
    const error = undefined as { data?: number } | undefined;
    const previous = `Data: ${data} <br/> Error: ${error?.data || 0}`;
    expect(
      tooltipRows(
        [
          ['Data', data],
          ['Error', error?.data || 0],
        ],
        { join: ' <br/> ' }
      )
    ).toBe(previous);
  });

  it('RingGauge: space before <br/>, none after', () => {
    const d = { name: 'CPU', value: 7, target: 10 };
    const previous = `${d.name} <br/>${d.value}/${d.target}`;
    expect(
      tooltipRows([d.name, `${d.value}/${d.target}`], { join: ' <br/>' })
    ).toBe(previous);
  });

  it('BarChart / SpineChart: spaces around the first <br/> only', () => {
    const categoryValue = 'Q1';
    const keys = ['a', 'b'];
    const row: Record<string, number> = { a: 1, b: 2 };
    const previous = `${categoryValue} <br/> ${keys
      .map((key) => `${key}: ${row[key]}`)
      .join('<br/>')}`;
    expect(
      `${categoryValue} <br/> ${tooltipRows(keys.map((key) => [key, row[key]]))}`
    ).toBe(previous);
  });

  it('BoxPlot: optional date prefix and spaces around every <br/>', () => {
    const literal = (date?: string) =>
      `${date ? `${date} <br/> ` : ''}min: 10 <br/> range: 20 to 40 <br/> mid: 30 <br/> max: 50`;
    const next = (date?: string) =>
      tooltipRows(
        [
          date,
          ['min', 10],
          ['range', '20 to 40'],
          ['mid', 30],
          ['max', 50],
        ],
        { join: ' <br/> ' }
      );
    expect(next('2025-01-06')).toBe(literal('2025-01-06'));
    expect(next()).toBe(literal());
  });

  it("Candlestick: date, OHLC with &nbsp;, and a change line", () => {
    const previous =
      `2025-01-06<br/>` +
      `O 1&nbsp; H 2&nbsp; L 0&nbsp; C 1.5<br/>` +
      `chg +0.5 (+50%)`;
    expect(
      tooltipRows([
        '2025-01-06',
        'O 1&nbsp; H 2&nbsp; L 0&nbsp; C 1.5',
        'chg +0.5 (+50%)',
      ])
    ).toBe(previous);
  });

  it('Sankey node: omitted in/out rows when the value is 0', () => {
    const node = { label: 'A', inValue: 0, outValue: 7 };
    const previousLines = [node.label];
    if (node.inValue > 0) previousLines.push(`in: ${node.inValue}`);
    if (node.outValue > 0) previousLines.push(`out: ${node.outValue}`);
    const previous = previousLines.join('<br/>');
    expect(
      tooltipRows([
        node.label,
        node.inValue > 0 ? (['in', node.inValue] as const) : undefined,
        node.outValue > 0 ? (['out', node.outValue] as const) : undefined,
      ])
    ).toBe(previous);
    expect(previous).toBe('A<br/>out: 7');
  });

  it("ScatterPlot unbinned: space sep, then <br/> + newline + 4 spaces, including empty optional slots", () => {
    const x = { key: 'x' };
    const y = { key: 'y' };
    const d = { x: 1, y: 2, color: 'red', size: 4, shape: 'circle' };

    // Indentation after each <br/> must match ScatterPlot's template literal.
    const previous = (
      color?: { key: string },
      size?: { key: string },
      shape?: { key: string }
    ) =>
      `${x.key} ${d[x.key as 'x']}<br/>${y.key} ${d[y.key as 'y']}<br/>
    ${color?.key ? `${color.key} ${d[color.key as 'color']}<br/>` : ''}
    ${size?.key ? `${size.key} ${d[size.key as 'size']}<br/>` : ''}
    ${shape?.key ? `${shape.key} ${d[shape.key as 'shape']}<br/>` : ''}`;

    const next = (
      color?: { key: string },
      size?: { key: string },
      shape?: { key: string }
    ) =>
      tooltipRows(
        [
          [x.key, d[x.key as 'x']],
          [y.key, d[y.key as 'y']],
        ],
        { sep: ' ' }
      ) +
      '<br/>\n    ' +
      tooltipRows(
        [
          color?.key ? `${color.key} ${d[color.key as 'color']}<br/>` : '',
          size?.key ? `${size.key} ${d[size.key as 'size']}<br/>` : '',
          shape?.key ? `${shape.key} ${d[shape.key as 'shape']}<br/>` : '',
        ],
        { join: '\n    ' }
      );

    expect(next()).toBe(previous());
    expect(next({ key: 'color' })).toBe(previous({ key: 'color' }));
    expect(next({ key: 'color' }, { key: 'size' }, { key: 'shape' })).toBe(
      previous({ key: 'color' }, { key: 'size' }, { key: 'shape' })
    );
    // Lock the empty-optional whitespace so a later skip of '' would fail.
    expect(next()).toBe('x 1<br/>y 2<br/>\n    \n    \n    ');
  });
});
