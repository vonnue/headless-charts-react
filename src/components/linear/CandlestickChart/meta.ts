import { ChartMeta } from '@/catalog/types';

// Placeholder wording — Chart Catalog Editor refines.
const meta: ChartMeta = {
  name: 'CandlestickChart',
  aliases: [
    'candlestick',
    'candlestick chart',
    'japanese candlestick chart',
    'stock chart',
    'financial chart',
  ],
  category: 'linear',
  summary:
    "Draws each period's open, high, low and close as a wick and a body, coloured by direction, to show price movement and intraperiod range over time.",
  intents: ['trend', 'range'],
  data: {
    form: 'records',
    encodings: [
      {
        prop: 'x',
        role: 'temporal',
        required: true,
        description:
          'Date key (`time.isISO` or `time.format`; Date objects and epoch ms also work). ISO dates are UTC by default; `time.utc: false` keeps local time. Default axis is a gap-free band over the dates present; `scalingFunction: "time"` gives elapsed-time spacing.',
      },
      { prop: 'open', role: 'quantitative', required: true, description: 'Opening value key, `{ key }`.' },
      { prop: 'high', role: 'quantitative', required: true, description: 'High value key, `{ key }`.' },
      { prop: 'low', role: 'quantitative', required: true, description: 'Low value key, `{ key }`.' },
      { prop: 'close', role: 'quantitative', required: true, description: 'Closing value key, `{ key }`.' },
      {
        prop: 'volume.key',
        role: 'quantitative',
        required: false,
        description: 'Optional volume key; draws a zero-based volume panel below the prices.',
      },
      {
        prop: 'classNames',
        role: 'color',
        required: false,
        description:
          '`up` / `down` / `flat` classes. Colour names the direction only; nothing is coloured by default.',
      },
    ],
    rowCount: { ideal: [20, 250], max: 1000, note: 'Periods. Beyond a few hundred, bodies get thinner than a pixel.' },
  },
  useWhen: [
    'The open/close direction and the intraperiod range both matter for each period, as in prices, rates or sensor min/max with start and end values',
  ],
  avoidWhen: [
    'Only the closing value matters — use LineChart',
    'Each category has a plain min–max interval — use RangePlot',
    'The data is a distribution summary — use BoxPlotV',
    "Colour would be the only cue for direction — use `shape: 'ohlc'` or hollow up bodies (`fill-transparent`)",
  ],
  alternatives: [
    { name: 'LineChart', when: 'only the closing value over time matters' },
    { name: 'RangePlot', when: 'a plain min–max interval per category' },
    { name: 'BoxPlotV', when: 'a distribution summary per period' },
  ],
  requiredProps: ['id', 'data', 'x', 'open', 'high', 'low', 'close'],
  example: `<CandlestickChart
  id="btc"
  className="w-full h-96"
  data={bars}
  x={{ key: 'date', time: { isISO: true } }}
  open={{ key: 'o' }}
  high={{ key: 'h' }}
  low={{ key: 'l' }}
  close={{ key: 'c' }}
  classNames={{ up: 'fill-sky-500 stroke-sky-500', down: 'fill-orange-500 stroke-orange-500' }}
/>`,
  storybook: 'Linear/CandlestickChart/Intro',
  variants: [
    {
      kind: 'chart-type',
      name: 'OHLC chart',
      aliases: ['ohlc', 'ohlc bar chart', 'open-high-low-close chart'],
      summary:
        'Draws each period as a high–low stem with a left tick at the open and a right tick at the close, so direction reads without colour.',
      how: "Set `shape: 'ohlc'`.",
      useWhen: [
        'Direction must be readable without colour (print, colour-blind readers)',
        'Many periods are shown and filled bodies would be too heavy',
      ],
      example: `<CandlestickChart
  id="ohlc"
  className="w-full h-96"
  data={bars}
  x={{ key: 'date', time: { isISO: true } }}
  open={{ key: 'o' }}
  high={{ key: 'h' }}
  low={{ key: 'l' }}
  close={{ key: 'c' }}
  shape="ohlc"
/>`,
    },
    {
      kind: 'option',
      name: 'Continuous time axis',
      how: "Set `x.scalingFunction: 'time'` for elapsed-time spacing: weekends and holidays show as gaps and ticks fall on calendar boundaries. Body width comes from the median gap between dates; `x.time.barWidth` overrides it, capped at one slot.",
    },
    {
      kind: 'option',
      name: 'Volume panel',
      how: "Set `volume={{ key: 'v', className: 'fill-slate-300' }}` for zero-based volume bars below the prices (`height` 0.1–0.5 of the plot, default 0.2). Bars carry `data-direction` for colouring by direction.",
    },
    { kind: 'option', name: 'Crosshair', how: 'Set `crosshair` (or `{ className }`) for a crosshair that snaps to the hovered candle.' },
    {
      kind: 'option',
      name: 'Local time',
      how: 'Set `x.time.utc: false` to place and label ISO dates in the viewer’s local time zone instead of UTC.',
    },
  ],
};

export default meta;
