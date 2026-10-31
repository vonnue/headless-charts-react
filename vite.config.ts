/// <reference types="vitest" />
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Storybook story tests run in a real browser (Playwright/Chromium), so they
// are opt-in via STORYBOOK_TESTS=1 (`yarn test:storybook`; run
// `yarn playwright install chromium` once first). Plain `vitest run` only
// runs the jsdom unit project.
const storybookProject = process.env.STORYBOOK_TESTS === '1'
  ? [
      {
        extends: true,
        plugins: [
          (await import('@storybook/addon-vitest/vitest-plugin')).storybookTest({
            configDir: path.join(dirname, '.storybook'),
          }),
        ],
        // Pre-bundle the CJS deps of storybook/test so they load in the browser.
        optimizeDeps: { include: ['storybook/test', '@testing-library/dom'] },
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: (await import('@vitest/browser-playwright')).playwright(),
            instances: [{ browser: 'chromium' as const }],
          },
        },
      },
    ]
  : [];

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tsconfigPaths(),
    react(),
    dts({
      rollupTypes: true,
      copyDtsFiles: true,
      // Ensure Next.js compatibility
      compilerOptions: {
        declarationMap: true,
      },
    }),
  ],
  test: {
    globals: true,
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          exclude: ['**/node_modules/**', '**/dist/**'],
          setupFiles: ['/src/setupTests.tsx'],
        },
      },
      ...storybookProject,
    ],
  },
  build: {
    lib: {
      entry: 'src/index.tsx',
      name: '@headless-charts/react',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format}.js`,
    },
    minify: true,
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'next',
        '**/*/*.stories.tsx',
        '**/*/*.test.tsx',
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
        preserveModules: true,
      },
    },
  },
});
