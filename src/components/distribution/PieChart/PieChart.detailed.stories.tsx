import { Meta } from '@storybook/react';
import PieChart from '.';
import data from './sample.json';
import { useState } from 'react';
import { twMerge } from 'tailwind-merge';

/**
 * SemiCircle charts are specifically useful for certain representations like political polls or seat shares, since they look like the seating arrangement in a parliament.
 */
const meta: Meta<typeof PieChart> = {
  title: 'Distribution/PieChart/Detailed',
  tags: ['autodocs'],
};

export default meta;

// type Story = StoryObj<typeof PieChart>;

const classNameMap = {
  macbook: 'fill-purple-700 dark:fill-purple-100',
  services: 'fill-purple-500 dark:fill-purple-300',
  wearables: 'fill-purple-300 dark:fill-purple-500',
  ipad: 'fill-purple-400 dark:fill-purple-200',
  iphone: 'fill-purple-600 dark:fill-purple-400',
};

/**
 * SemiCircle charts are a variant of pie charts. Simply specify `startAngle` and `endAngle` props and set it to -90 and 90.
 */

const years = [
  'Y2012',
  'Y2013',
  'Y2014',
  'Y2015',
  'Y2016',
  'Y2017',
  'Y2018',
  'Y2019',
  'Y2020',
  'Y2021',
  'Y2022',
] as const;

type DataPoint = {
  name: string;
  Y2012: number;
  Y2013: number;
  Y2014: number;
  Y2015: number;
  Y2016: number;
  Y2017: number;
  Y2018: number;
  Y2019: number;
  Y2020: number;
  Y2021: number;
  Y2022: number;
};

export const DataRefresh = () => {
  const [pieData] = useState<DataPoint[]>(data);
  const [year, setYear] = useState('Y2012');

  const refreshData = () => {
    const currentIndex = years.indexOf(year as (typeof years)[number]);
    const nextIndex = (currentIndex + 1) % years.length;
    setYear(years[nextIndex]);
  };
  return (
    <div>
      <button onClick={refreshData}>Refresh</button>
      <br />
      <span>{year}</span>
      <PieChart
        id='pie-chart-detailed'
        data={pieData}
        valueKey={year}
        nameKey='name'
        classNameMap={classNameMap}
        tooltip={{}}
      />
    </div>
  );
};

export const DataRefreshWithDrawing = () => {
  const [year, setYear] = useState('Y2012');
  const refreshData = () => {
    const currentIndex = years.indexOf(year as (typeof years)[number]);
    const nextIndex = (currentIndex + 1) % years.length;
    setYear(years[nextIndex]);
  };
  return (
    <div>
      <button onClick={refreshData}>Refresh</button>
      <br />
      <span>{year}</span>
      <PieChart
        id='pie-refresh-with-drawing'
        data={data}
        valueKey={year}
        nameKey='name'
        classNameMap={classNameMap}
        drawing={{
          duration: 1000,
        }}
        tooltip={{}}
        sort={false}
      />
    </div>
  );
};

export const AddOrRemoveNewDataPoint = () => {
  const [pieData, setPieData] = useState(data);
  const [disableAddDataPoint, setDisableAddDataPoint] = useState(false);
  const addDataPoint = () => {
    setPieData([
      ...pieData,
      {
        name: 'airpods',
        Y2012: 0,
        Y2013: 0,
        Y2014: 0,
        Y2015: 0,
        Y2016: 0,
        Y2017: 1.76,
        Y2018: 3.2,
        Y2019: 6.1,
        Y2020: 10.1,
        Y2021: 12.1,
        Y2022: 14.5,
      },
    ]);
    setDisableAddDataPoint(true);
  };

  const removeDataPoint = () => {
    setPieData(data);
    setDisableAddDataPoint(false);
  };

  const classNameMapNew = {
    ...classNameMap,
    ipad: 'fill-purple-800',
    iphone: 'fill-purple-900',
  };
  const [year, setYear] = useState('Y2022');
  const shiftYear = () => {
    const currentIndex = years.indexOf(year as (typeof years)[number]);
    const nextIndex = (currentIndex + 1) % years.length;
    setYear(years[nextIndex]);
  };
  return (
    <div className='flex flex-col gap-4'>
      <div className='flex gap-2'>
        <button
          onClick={disableAddDataPoint ? removeDataPoint : addDataPoint}
          className={twMerge('bg-blue-500 text-white p-2 rounded-md')}>
          {disableAddDataPoint ? 'Remove Airpods Data' : 'Add Airpods Data'}
        </button>
        <button
          onClick={shiftYear}
          className='bg-blue-500 text-white p-2 rounded-md'>
          Shift Year
        </button>
      </div>
      <span>{year}</span>
      <PieChart
        id='pie-chart-add-new-data-point'
        data={pieData}
        valueKey={year}
        nameKey='name'
        classNameMap={classNameMapNew}
        drawing={{
          duration: 1000,
        }}
        tooltip={{}}
        sort={false}
      />
    </div>
  );
};
