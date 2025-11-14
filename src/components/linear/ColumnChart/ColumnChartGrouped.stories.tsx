import preview from '../../../../.storybook/preview';
/* eslint-disable @typescript-eslint/ban-ts-comment */

import ColumnChartGrouped from '.';
import data from './sample.json';

const meta = preview.meta({
  title: 'Linear/ColumnChartGrouped',
  component: ColumnChartGrouped,
  tags: ['autodocs'],
});

export const Default = meta.story({
  args: {
    data,
    id: 'column-chart-group-default',
    x: { key: 'year' },
    y: [
      {
        key: 'macbook',
      },
      {
        key: 'iphone',
      },
      {
        key: 'ipad',
      },
      {
        key: 'wearables',
      },
      {
        key: 'services',
      },
    ],
  },
});

export const Styled = meta.story({
  args: {
    data,
    id: 'column-chart-group-styled',
    className: 'bg-gray-100 rounded',
    padding: {
      top: 20,
      right: 20,
      bottom: 20,
      left: 5,
      bar: 0.1,
    },
    margin: {
      top: 10,
      right: 40,
      bottom: 40,
      left: 60,
    },
    x: { key: 'year', className: 'fill-blue-500' },
    y: [
      {
        key: 'macbook',
        className: 'fill-purple-800',
      },
      {
        key: 'iphone',
        className: 'fill-purple-600',
      },
      {
        key: 'ipad',
        className: 'fill-purple-400',
      },
      {
        key: 'wearables',
        className: 'fill-purple-300',
      },
      {
        key: 'services',
        className: 'fill-purple-200',
      },
    ],
  },
});

export const Animated = meta.story({
  args: {
    ...Styled.input.args,
    drawing: { duration: 1000 },
  },
});

export const WithTooltip = meta.story({
  args: {
    ...Styled.input.args,
    tooltip: {
      className: 'bg-gray-100 rounded p-2',
    },
  },
});

export const WithCustomTooltip = meta.story({
  args: {
    ...Styled.input.args,
    tooltip: {
      html: (data: any) => {
        return `
          <div class="bg-gray-100 rounded p-2">
            <div class="text-sm font-semibold">${data.year}</div>
            <div class="text-xs">${data.macbook}</div>
          </div>
        `;
      },
    },
  },
});

export const EdgeCase = meta.story({
  args: {
    ...Styled.input.args,
    wholeNumbers: true,
    data: [
      {
        year: 2012,
        macbook: 0,
        services: 0,
        wearables: 0,
        ipad: 0,
        iphone: 0,
      },
      {
        year: 2013,
        macbook: 0,
        services: 0,
        wearables: 0,
        ipad: 0,
        iphone: 0,
      },
      {
        year: 2014,
        macbook: 0,
        services: 0,
        wearables: 0,
        ipad: 0,
        iphone: 0,
      },
      {
        year: 2015,
        macbook: 0,
        services: 0,
        wearables: 0,
        ipad: 0,
        iphone: 0,
      },
      {
        year: 2016,
        macbook: 0,
        services: 0,
        wearables: 0,
        ipad: 0,
        iphone: 0,
      },
      {
        year: 2017,
        macbook: 0,
        services: 0,
        wearables: 0,
        ipad: 0,
        iphone: 0,
      },

      {
        year: 2018,
        macbook: 0,
        services: 0,
        wearables: 0,
        ipad: 0,
        iphone: 0,
      },
      {
        year: 2019,
        macbook: 0,
        services: 0,
        wearables: 0,
        ipad: 0,
        iphone: 0,
      },
      {
        year: 2020,
        macbook: 0,
        services: 0,
        wearables: 0,
        ipad: 0,
        iphone: 0,
      },
      {
        year: 2021,
        macbook: 0,
        services: 0,
        wearables: 0,
        ipad: 0,
        iphone: 0,
      },
      {
        year: 2022,
        macbook: 0,
        services: 0,
        wearables: 0,
        ipad: 0,
        iphone: 8,
      },
    ],
  },
});
