import { afterEach, expect, vi } from 'vitest';

import preview from '../.storybook/preview';
import { cleanup } from '@testing-library/react';
import matchers from '@testing-library/jest-dom/matchers';

// extends Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

beforeAll(preview.composed.beforeAll);
afterEach(() => {
  cleanup();
});

afterAll(() => {
  vi.resetAllMocks();
});
