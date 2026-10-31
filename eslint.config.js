// Flat-config equivalent of the former .eslintrc.cjs (ESLint 9).
import js from '@eslint/js';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import storybook from 'eslint-plugin-storybook';

export default [
  // The old `--ext ts,tsx` linted only TypeScript sources.
  { ignores: ['dist', '**/*.{js,cjs,mjs}'] },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parser: tsParser,
    },
  },
  { ...js.configs.recommended, files: ['**/*.{ts,tsx}'] },
  ...tseslint.configs['flat/recommended'].map((c) => ({ ...c, files: ['**/*.{ts,tsx}'] })),
  { ...reactHooks.configs.flat.recommended, files: ['**/*.{ts,tsx}'] },
  ...storybook.configs['flat/recommended'],
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // Library entry point: it re-exports utils/constants alongside
    // components by design, so the fast-refresh rule does not apply.
    files: ['src/index.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // `yarn lint` uses --max-warnings 0, so a warning already fails lint.
    // Making it an error keeps that behaviour and lets the existing
    // violations live in eslint-suppressions.json (which only holds errors).
    files: ['**/*.{ts,tsx}'],
    rules: { 'react-hooks/exhaustive-deps': 'error' },
  },
];
