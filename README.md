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
    { x: 0, y: 10 },
    { x: 1, y: 20 },
    { x: 2, y: 15 },
    // ... more data points
  ];

  return (
    <LineChart
      data={data}
      width={600}
      height={400}
      className='bg-white rounded-lg shadow-lg'
    />
  );
}
```

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
