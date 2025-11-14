import preview from '../../../../.storybook/preview';

import React from 'react';
import SpeedometerChart from '.';

/**
 * Speedometer charts are used to show the progress towards a goal.
 *
 *
 */

const meta = preview.meta({
  title: 'Gauge/Speedometer/Intro',
  component: SpeedometerChart,
  tags: ['autodocs'],
});

export const Default = meta.story({
  args: {
    data: 0.7,
    label: {
      text: 'Coverage',
    },
    id: 'speedometer-default',
  },
});

export const WithRadius = meta.story({
  args: {
    ...Default.input.args,
    id: 'speedometer-with-radius',
    needleRadius: 0.5,
  },
});

export const WithAxisTicks = meta.story({
  args: {
    ...Default.input.args,
    id: 'speedometer-with-axis-ticks',
    axisTicks: 10,
  },
});

export const UpdatingData = meta.story(() => {
  const [speedometerData, setSpeedometerData] = React.useState(0.7);
  const updatingData = () => {
    setSpeedometerData(Math.random());
  };

  return (
    <>
      <button onClick={updatingData}>Update data</button>
      <SpeedometerChart
        id='speedometer-chart-updating-data'
        data={speedometerData}
        label={{ text: 'Coverage' }}
      />
    </>
  );
});
