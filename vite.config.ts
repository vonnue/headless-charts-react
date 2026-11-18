/// <reference types="vitest" />
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// The storybook project is always registered (no STORYBOOK_TESTS gate) so
// `vitest --project=storybook` / `yarn test:storybook` work as the docs
// describe. Plain `vitest run` would also launch this Playwright project,
// so unit scripts and CI pin `--project unit` to keep jsdom runs fast.
// See package.json (`test`, `test:unit`, `test:storybook`).
//
// storybookScript starts Storybook in Vitest watch mode so failing tests
// can link to the running UI. storybookUrl is localhost:6006 by default;
// set SB_URL in CI to a published Storybook if failure links should point
// there (https://storybook.js.org/docs/writing-tests/in-ci).
const storybookTestOptions = {
  configDir: path.join(dirname, '.storybook'),
  storybookScript: 'yarn storybook --no-open',
  ...(process.env.SB_URL ? { storybookUrl: process.env.SB_URL } : {}),
};

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
          exclude: [
            '**/node_modules/**',
            '**/dist/**',
            // Playwright's own test runner (real-browser render audit), not
            // vitest's — see playwright.config.ts.
            'tests/storybook-render-audit/**',
          ],
          setupFiles: ['/src/setupTests.tsx'],
          // Type-level tests (*.test-d.ts) run under `vitest run` in the unit
          // project only (the storybook project doesn't inherit them). Type
          // errors in source files they import also fail the run.
          typecheck: {
            enabled: true,
            include: ['src/**/*.test-d.ts'],
            tsconfig: './tsconfig.json',
          },
        },
      },
      {
        extends: true,
        plugins: [storybookTest(storybookTestOptions)],
        // Pre-bundle the CJS deps of storybook/test so they load in the browser.
        optimizeDeps: { include: ['storybook/test', '@testing-library/dom'] },
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' as const }],
          },
        },
      },
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
