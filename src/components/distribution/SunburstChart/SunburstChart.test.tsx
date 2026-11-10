import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import SunburstChart from '.';
import data from './sample.json';

// Smoke test only; the spec suite comes from vitest-test-writer.
describe('SunburstChart', () => {
  it('renders a centre disc and one arc + hit area per positive node', () => {
    render(
      <SunburstChart
        id='sunburst-smoke'
        data={data}
        value={{ key: 'size' }}
        style={{ width: '400px', height: '400px' }}
      />
    );
    const svg = screen.getByTestId('sunburst-chart');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Sunburst chart');
    expect(svg.querySelectorAll('[data-testid="sunburst-centre"]')).toHaveLength(1);
    // 3 groups + 7 depth-2 + 7 depth-3 nodes with positive value (docs/drafts is 0).
    const arcs = svg.querySelectorAll('[data-testid="sunburst-arc"]');
    expect(arcs).toHaveLength(17);
    // One hit per arc plus the disc.
    expect(svg.querySelectorAll('[data-testid="sunburst-hit"]')).toHaveLength(18);
    expect(svg.innerHTML).not.toMatch(/NaN|Infinity/);
  });
});
