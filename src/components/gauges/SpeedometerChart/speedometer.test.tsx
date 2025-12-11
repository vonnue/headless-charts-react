import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import SpeedometerChart from '.';

describe('SpeedometerChart', () => {
  it('renders speedometer component', () => {
    render(<SpeedometerChart data={50} id='speedometer-chart' />);
    const speedometer = screen.getByTestId('speedometer');
    expect(speedometer).toMatchSnapshot();
  });

  it('renders with regions', () => {
    const regions = [
      { limit: 0.5, className: 'fill-red-500' },
      { limit: 0.8, className: 'fill-yellow-500' },
      { limit: 1, className: 'fill-green-500' },
    ];
    render(
      <SpeedometerChart data={0.7} id='speedometer-regions' regions={regions} />
    );
    const speedometer = screen.getByTestId('speedometer');
    expect(speedometer).toBeTruthy();
    expect(speedometer.querySelector('.gauge-levels')).toBeTruthy();
  });

  it('renders with label', () => {
    render(
      <SpeedometerChart
        data={0.5}
        id='speedometer-label'
        label={{ text: 'Coverage', className: 'text-lg' }}
      />
    );
    const speedometer = screen.getByTestId('speedometer');
    expect(speedometer).toBeTruthy();
    const labelText = speedometer.querySelector('text');
    expect(labelText).toBeTruthy();
    expect(labelText?.textContent).toBe('Coverage');
  });

  it('renders with custom needleRadius', () => {
    render(
      <SpeedometerChart data={0.5} id='speedometer-radius' needleRadius={0.5} />
    );
    const speedometer = screen.getByTestId('speedometer');
    expect(speedometer).toBeTruthy();
    expect(speedometer.querySelector('.data-group')).toBeTruthy();
  });

  it('renders with custom axisTicks', () => {
    render(
      <SpeedometerChart data={0.5} id='speedometer-ticks' axisTicks={10} />
    );
    const speedometer = screen.getByTestId('speedometer');
    expect(speedometer).toBeTruthy();
  });

  it('handles non-numeric data by defaulting to 0', () => {
    render(
      <SpeedometerChart data={'invalid' as any} id='speedometer-non-numeric' />
    );
    const speedometer = screen.getByTestId('speedometer');
    expect(speedometer).toBeTruthy();
  });

  it('renders with custom margins', () => {
    const margin = { top: 10, bottom: 30, left: 50, right: 50 };
    render(
      <SpeedometerChart data={0.5} id='speedometer-margin' margin={margin} />
    );
    const speedometer = screen.getByTestId('speedometer');
    expect(speedometer).toBeTruthy();
  });

  it('renders with custom className and style', () => {
    render(
      <SpeedometerChart
        data={0.5}
        id='speedometer-styled'
        className='custom-class'
        style={{ backgroundColor: 'red' }}
      />
    );
    const speedometer = screen.getByTestId('speedometer');
    expect(speedometer).toHaveClass('custom-class');
    expect(speedometer).toHaveStyle({ backgroundColor: 'red' });
  });

  it('updates when data changes', async () => {
    const { rerender } = render(
      <SpeedometerChart data={0.3} id='speedometer-update' />
    );
    const speedometer = screen.getByTestId('speedometer');
    expect(speedometer).toBeTruthy();

    rerender(<SpeedometerChart data={0.8} id='speedometer-update' />);
    await waitFor(() => {
      expect(speedometer.querySelector('.data-group')).toBeTruthy();
    });
  });

  it('renders with regions sorted by limit descending', () => {
    const regions = [
      { limit: 0.3, className: 'fill-red-500' },
      { limit: 1, className: 'fill-green-500' },
      { limit: 0.6, className: 'fill-yellow-500' },
    ];
    render(
      <SpeedometerChart
        data={0.5}
        id='speedometer-sorted-regions'
        regions={regions}
      />
    );
    const speedometer = screen.getByTestId('speedometer');
    expect(speedometer.querySelector('.gauge-levels')).toBeTruthy();
  });

  it('renders with tooltip configuration', () => {
    render(
      <SpeedometerChart
        data={0.5}
        id='speedometer-tooltip'
        tooltip={{
          className: 'tooltip-class',
        }}
      />
    );
    const speedometer = screen.getByTestId('speedometer');
    expect(speedometer).toBeTruthy();
  });

  it('renders with partial margin values', () => {
    render(
      <SpeedometerChart
        data={0.5}
        id='speedometer-partial-margin'
        margin={{ top: 10 }}
      />
    );
    const speedometer = screen.getByTestId('speedometer');
    expect(speedometer).toBeTruthy();
  });

  it('handles zero data value', () => {
    render(<SpeedometerChart data={0} id='speedometer-zero' />);
    const speedometer = screen.getByTestId('speedometer');
    expect(speedometer).toBeTruthy();
  });

  it('handles max data value', () => {
    const regions = [{ limit: 100 }];
    render(
      <SpeedometerChart data={100} id='speedometer-max' regions={regions} />
    );
    const speedometer = screen.getByTestId('speedometer');
    expect(speedometer).toBeTruthy();
  });

  it('renders label without className', () => {
    render(
      <SpeedometerChart
        data={0.5}
        id='speedometer-label-no-class'
        label={{ text: 'Test Label' }}
      />
    );
    const speedometer = screen.getByTestId('speedometer');
    const labelText = speedometer.querySelector('text');
    expect(labelText?.textContent).toBe('Test Label');
  });
});
