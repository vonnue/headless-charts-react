import preview from '../../../../.storybook/preview';
import { useEffect, useState } from 'react';

import LinearGauge from '.';

/**
 * Linear Gauges are simple UI elements that display a single value on a linear scale.
 */
const meta = preview.meta({
  title: 'Gauge/LinearGauge/Intro',
  component: LinearGauge,
  tags: ['autodocs'],
});

export const Default = meta.story({
  args: {
    id: 'linear-gauge-default',
    className: 'h-12',
    label: 'Linear Gauge Graph',
    data: 0.47,
  },
});

/**
 * Linear gauges can be styled with different className props
 */

export const Styled = meta.story({
  args: {
    ...Default.input.args,
    id: 'linear-gauge-styled',
    className: 'fill-gray-100 text-white rounded',
    classNameGauge: 'fill-green-800 stroke-green-800',
    classNameGaugeBg: 'fill-green-200 stroke-green-200',
  },
});
/**
 * You can customize how slowly you can draw the gauge.
 */
export const Drawing = meta.story({
  args: {
    ...Default.input.args,
    id: 'linear-gauge-drawing',
    label: 'Linear Gauge Graph With Drawing',
    drawing: { duration: 2000 },
  },
});

/**
 * You can also setup a LinearGauge with an error value. This is useful if we need to show an error value as well as the data.
 */
export const Error = meta.story({
  args: {
    id: 'linear-gauge-with-error',
    label: 'Linear Gauge With Error',
    data: 23,
    max: 25,
    error: { data: 1, className: '' },
  },
});

/**
 * You can also customize the tooltip html
 */

/**
 * You can also customize the tooltip with the html parameter
 */

export const ToolTipWithCustomHtml = meta.story({
  args: {
    ...Error.input.args,
    id: 'linear-gauge-with-tooltip-custom-html',
    error: { data: 2 },
    tooltip: {
      html: () =>
        `<div class='bg-gray-800 text-white p-2 rounded'>67% with 2% error</div>`,
    },
  },
});

export const UpdatingData = meta.story(() => {
  const [data, setData] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setData(Math.random());
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <>
      <LinearGauge
        id='linear-gauge-updating-data'
        label='Linear Gauge Graph With Updating Data'
        data={data}
      />
    </>
  );
});
