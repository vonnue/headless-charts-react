import preview from '../../../../.storybook/preview';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useCallback, useEffect, useState } from 'react';

import RingGauge from '.';
import metrics from './sample.json';

/**
 * Ring gauges are used to show progress towards a goal.  Ring gauges are useful for comparing multiple metrics and achievement against a target.
 *
 * eg:- Apple Watch's activity app's Rings.
 */
const meta = preview.meta({
  title: 'Gauge/RingGauge/Intro',
  component: RingGauge,
  tags: ['autodocs'],
});

export const Default = meta.story({
  args: {
    data: metrics.map(({ className, ...metric }: any) => metric),
    id: 'ring-chart-default',
    labelKey: 'name',
    dataKey: 'score',
    targetKey: 'target',
  },
});

/** Multiple styles can be applied on the chart background, or on each ring (/metric) */

export const Styled = meta.story({
  args: {
    ...Default.input.args,
    data: metrics,
    id: 'ring-chart-styled',
    className: 'bg-gray-100 rounded',
  },
});

export const UpdatingData = meta.story(() => {
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
});
