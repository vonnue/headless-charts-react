import { Meta, StoryObj } from '@storybook/react';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useCallback, useEffect, useState } from 'react';

import RingGauge from '.';
import metrics from './sample.json';

/**
 * Ring gauges are used to show progress towards a goal.  Ring gauges are useful for comparing multiple metrics and achievement against a target.
 *
 * eg:- Apple Watch's activity app's Rings.
 */
const meta: Meta<typeof RingGauge> = {
  title: 'Gauge/RingGauge/Intro',
  component: RingGauge,
  tags: ['autodocs'],
};

export default meta;

/** Default RingGauge Chart (Headless and unstyled). */

type Story = StoryObj<typeof RingGauge>;

export const Default: Story = {
  args: {
    data: metrics.map(({ className, ...metric }: any) => metric),
    id: 'ring-chart-default',
    labelKey: 'name',
    dataKey: 'score',
    targetKey: 'target',
  },
};

/** Multiple styles can be applied on the chart background, or on each ring (/metric) */

export const Styled: Story = {
  args: {
    ...Default.args,
    data: metrics,
    id: 'ring-chart-styled',
    className: 'bg-gray-100 rounded',
  },
};

/** With custom start and end angle */

export const UpdatingData = () => {
  const [ringGaugeData, setRingGaugeData] = useState(metrics);

  const refreshData = useCallback(() => {
    setRingGaugeData((prevData) =>
      prevData.map((d) => ({
        ...d,
        score: Math.random() * 100,
      })),
    );
  }, []);

  useEffect(() => {
    const interval = setInterval(refreshData, 1000);
    return () => clearInterval(interval);
  }, [refreshData]);

  return (
    <div>
      <RingGauge
        data={ringGaugeData}
        id='ring-gauge-updating-data'
        labelKey={'name'}
        targetKey={'target'}
        dataKey={'score'}
        drawing={{
          duration: 800,
        }}
      />
    </div>
  );
};
