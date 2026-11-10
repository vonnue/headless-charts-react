import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import ViolinChart from '.';
import data from './sample.json';

// Smoke test only; the spec suite comes from vitest-test-writer.
describe('ViolinChart', () => {
  it('renders one violin and one hit area per group with role="img"', () => {
    render(
      <ViolinChart
        id='violin-smoke'
        data={data}
        category={{ key: 'dept' }}
        value={{ key: 'salary' }}
        style={{ width: '400px', height: '300px' }}
      />
    );
    const svg = screen.getByTestId('violin-chart');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Violin chart');
    const shapes = svg.querySelectorAll('[data-testid="violin-shape"]');
    expect(Array.from(shapes, (s) => s.getAttribute('data-category'))).toEqual([
      'Eng',
      'Sales',
      'Ops',
    ]);
    expect(svg.querySelectorAll('[data-testid="violin-hit"]')).toHaveLength(3);
    expect(svg.innerHTML).not.toMatch(/NaN|Infinity/);
  });
});
