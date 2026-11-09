import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import TreemapChart from '.';
import data from './sample.json';

// Smoke test only; the spec suite comes from vitest-test-writer.
describe('TreemapChart', () => {
  it('renders nested cells with role="img" and no NaN attributes', () => {
    render(
      <TreemapChart
        id='treemap-smoke'
        data={data}
        value={{ key: 'amount' }}
        style={{ width: '400px', height: '300px' }}
      />
    );
    const svg = screen.getByTestId('treemap-chart');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Treemap chart');
    const cells = svg.querySelectorAll('[data-testid="treemap-cell"]');
    // Root + 3 groups + 10 positive leaves (Partnerships is 0 → omitted).
    expect(cells).toHaveLength(14);
    expect(svg.querySelectorAll('[data-testid="treemap-hit"]')).toHaveLength(14);
    cells.forEach((cell) =>
      ['x', 'y', 'width', 'height'].forEach((attr) =>
        expect(cell.getAttribute(attr)).not.toContain('NaN')
      )
    );
  });
});
