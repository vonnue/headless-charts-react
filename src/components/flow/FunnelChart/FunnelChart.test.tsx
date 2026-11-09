import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import FunnelChart from '.';
import data from './sample.json';

// Smoke test only; the full spec suite (22 cases) comes from vitest-test-writer.
describe('FunnelChart', () => {
  it('renders one mark per stage with role="img"', () => {
    render(
      <FunnelChart
        id='funnel-smoke'
        data={data}
        stage={{ key: 'name' }}
        value={{ key: 'count' }}
        style={{ width: '400px', height: '300px' }}
      />
    );
    const svg = screen.getByTestId('funnel-chart');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Funnel chart');
    const marks = svg.querySelectorAll('[data-testid="funnel-stage"]');
    expect(marks).toHaveLength(data.length);
    marks.forEach((mark) => {
      ['x', 'y', 'width', 'height'].forEach((attr) =>
        expect(mark.getAttribute(attr)).not.toContain('NaN')
      );
    });
  });
});
