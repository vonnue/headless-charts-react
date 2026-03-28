import { defineMain } from '@storybook/react-vite/node';

export default defineMain({
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-themes',
    '@chromatic-com/storybook',
    '@storybook/addon-docs',
    '@storybook/addon-vitest'
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {},
  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },
  features: {
    experimentalTestSyntax: true,
  },
});
