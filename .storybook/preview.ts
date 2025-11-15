import addonDocs from '@storybook/addon-docs';
import addonLinks from '@storybook/addon-links';
import { definePreview } from '@storybook/react-vite';
import '../src/index.css';
import './styles.css';

import { withThemeByClassName } from '@storybook/addon-themes';

const decorators = [
  withThemeByClassName({
    themes: {
      light: 'light',
      dark: 'dark',
    },
    defaultTheme: 'light',
  }),
];

export default definePreview({
  decorators,
  tags: ['autodocs'],
  parameters: {
    controls: {
      expanded: true,
    },
    options: {
      storySort: {
        order: [
          'Getting Started',
          'Distribution',
          [
            'ScatterPlot',
            'PieChart',
            ['Intro', 'Tooltips', 'Donuts', 'SemiCircle'],
          ],
          'Linear',
        ],
      },
    },
  },

  addons: [addonLinks(), addonDocs()],
});
