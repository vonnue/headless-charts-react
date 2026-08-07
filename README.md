# Headless Charts for React

A modern, headless charting library built with React, D3, and TypeScript. This library provides a flexible and customizable way to create beautiful charts while maintaining full control over styling and behavior.

## Features

- 🎯 **Headless by Design**: Complete control over styling and behavior
- 📦 **Modern Stack**: Built with TypeScript, React, D3, and TailwindCSS
- 🎨 **Fully Customizable**: Style your charts with TailwindCSS or any CSS framework
- 📱 **Responsive**: Charts that adapt to any screen size
- 🧪 **Well Tested**: Comprehensive test coverage
- 📚 **Storybook Documentation**: Interactive examples and documentation

## Installation

```bash
# Using npm
npm install @headless-charts/react

# Using yarn
yarn add @headless-charts/react

# Using pnpm
pnpm add @headless-charts/react
```

## Quick Start

```tsx
import { LineChart } from '@headless-charts/react';

function MyChart() {
  const data = [
    { month: 0, sales: 10 },
    { month: 1, sales: 20 },
    { month: 2, sales: 15 },
    // ... more data points
  ];

  return (
    <LineChart
      id='my-line-chart'
      data={data}
      x={{ key: 'month' }}
      y={[{ key: 'sales', className: 'text-blue-500' }]}
      className='w-full h-64 bg-white rounded-lg shadow-lg'
    />
  );
}
```

Every chart takes a required `id` and reads its dimensions from the rendered
element, so size it with CSS (`className` or `style`) rather than `width` /
`height` props — that's what makes the charts responsive. Use `margin` and
`padding` props to control the space around and inside the plot area.

## Choosing a chart

[AGENTS.md](./AGENTS.md) maps the question you are answering — comparison,
composition, trend, correlation, distribution, range, progress — to the chart
that fits, and says for each chart when it is the wrong choice. It ships with the
package, so tools and coding agents can read it from `node_modules`.

It also resolves named chart types that are not components of their own — a
streamgraph is an `AreaChart` with `stacking.type`, a waterfall is a
`ColumnChartStacked` with `waterfall`, a histogram is a `ColumnChart` with
`x.bin`, a donut is a `PieChart` with `innerRadius`.

The same information is available as data:

```ts
import {
  chartCatalog,
  decisionTree,
  getChartsByIntent,
  resolveChartRequest,
} from '@headless-charts/react';

getChartsByIntent('composition'); // → AreaChart, BarChartStacked, PieChart, …
resolveChartRequest('streamgraph'); // → { chart: AreaChart, variant: Streamgraph }
```

or as JSON at `@headless-charts/react/catalog.json`.

## Documentation

For detailed documentation and examples, visit our [Storybook](https://headless-charts-react.netlify.app).

## Development

```bash
# Install dependencies
yarn install

# Start development server
yarn start

# Run tests
yarn test

# Start Storybook
yarn storybook

# Build the library
yarn build
```

## Contributing

We welcome contributions! Please feel free to submit a Pull Request.

## License

MIT © [Vonnue dev team](https://github.com/hacklehub/headless-charts)
