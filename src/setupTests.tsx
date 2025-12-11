import { afterEach, vi, beforeAll, afterAll } from 'vitest';
import '@testing-library/jest-dom/vitest';

import preview from '../.storybook/preview';
import { cleanup } from '@testing-library/react';

beforeAll(preview.composed.beforeAll);
afterEach(() => {
  cleanup();
});

afterAll(() => {
  vi.resetAllMocks();
});
