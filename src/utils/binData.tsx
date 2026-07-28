import { bin as d3bin, extent, quantile, sum } from 'd3-array';
import { AxisConfig } from '@/types';
import deepValue from './deepValue';

export interface BinResult {
  binnedData: Record<string, any>[];
  xValues: string[];
  yValues: string[];
}

export interface Bin1DResult {
  label: string;
  count: number;
  sum: number;
  mean: number;
}

export interface BinStatsResult {
  label: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  count: number;
}

const defaultLabelFormat = (low: number, high: number) => `${low}–${high}`;

export function binAxis(
  data: any[],
  axisConfig: AxisConfig,
): { labels: string[]; assignments: string[] } {
  const binConfig = axisConfig.bin!;
  const values = data.map((d) => Number(deepValue(d, axisConfig.key)));

  const generator = d3bin<number, number>().value((d) => d);

  if (binConfig.thresholds) {
    generator.thresholds(binConfig.thresholds);
  } else {
    generator.thresholds(binConfig.count);
  }

  const [domainMin, domainMax] = extent(values) as [number, number];
  generator.domain([domainMin, domainMax]);

  const bins = generator(values);

  const labelFn = binConfig.labelFormat ?? defaultLabelFormat;

  // Map each original value to its bin label
  const binEdges = bins.map((b) => ({
    x0: b.x0!,
    x1: b.x1!,
    label: labelFn(b.x0!, b.x1!),
  }));

  const labels = binEdges.map((e) => e.label);

  const assignments = values.map((v) => {
    // Find the bin this value belongs to
    for (let i = 0; i < binEdges.length; i++) {
      const { x0, x1, label } = binEdges[i];
      // Last bin is inclusive on both ends
      if (i === binEdges.length - 1) {
        if (v >= x0 && v <= x1) return label;
      } else {
        if (v >= x0 && v < x1) return label;
      }
    }
    // Fallback: assign to last bin
    return binEdges[binEdges.length - 1].label;
  });

  return { labels, assignments };
}

export function binData(
  data: any[],
  xConfig: AxisConfig,
  yConfig: AxisConfig,
): BinResult {
  if (!data || data.length === 0) {
    return { binnedData: [], xValues: [], yValues: [] };
  }

  const xBinned = xConfig.bin != null;
  const yBinned = yConfig.bin != null;

  // Get assignments for each axis
  let xAssignments: string[];
  let xLabels: string[];
  if (xBinned) {
    const result = binAxis(data, xConfig);
    xAssignments = result.assignments;
    xLabels = result.labels;
  } else {
    xAssignments = data.map((d) => String(deepValue(d, xConfig.key)));
    // Preserve unique order
    const seen = new Set<string>();
    xLabels = [];
    xAssignments.forEach((v) => {
      if (!seen.has(v)) {
        seen.add(v);
        xLabels.push(v);
      }
    });
  }

  let yAssignments: string[];
  let yLabels: string[];
  if (yBinned) {
    const result = binAxis(data, yConfig);
    yAssignments = result.assignments;
    yLabels = result.labels;
  } else {
    yAssignments = data.map((d) => String(deepValue(d, yConfig.key)));
    const seen = new Set<string>();
    yLabels = [];
    yAssignments.forEach((v) => {
      if (!seen.has(v)) {
        seen.add(v);
        yLabels.push(v);
      }
    });
  }

  // Count occurrences per (xLabel, yLabel) pair
  const countMap = new Map<string, number>();
  for (let i = 0; i < data.length; i++) {
    const key = `${xAssignments[i]}__${yAssignments[i]}`;
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }

  // Build output rows
  const binnedData: Record<string, any>[] = [];
  yLabels.forEach((yLabel) => {
    xLabels.forEach((xLabel) => {
      const key = `${xLabel}__${yLabel}`;
      const count = countMap.get(key);
      if (count != null && count > 0) {
        binnedData.push({
          [xConfig.key]: xLabel,
          [yConfig.key]: yLabel,
          count,
        });
      }
    });
  });

  return { binnedData, xValues: xLabels, yValues: yLabels };
}

/**
 * 1D binning: bins a single continuous field and returns count/sum/mean per bin.
 * Used by ColumnChart and BarChart for histogram mode.
 */
export function bin1D(
  data: any[],
  axisConfig: AxisConfig,
  valueKey?: string,
): Bin1DResult[] {
  if (!data || data.length === 0) return [];

  const { labels, assignments } = binAxis(data, axisConfig);

  // Group data by bin label
  const groups = new Map<string, number[]>();
  labels.forEach((l) => groups.set(l, []));

  for (let i = 0; i < data.length; i++) {
    const label = assignments[i];
    const value = valueKey ? Number(deepValue(data[i], valueKey)) || 0 : 1;
    groups.get(label)!.push(value);
  }

  return labels.map((label) => {
    const values = groups.get(label)!;
    const s = sum(values);
    return {
      label,
      count: values.length,
      sum: s,
      mean: values.length > 0 ? s / values.length : 0,
    };
  });
}

/**
 * Bins a grouping field and computes box-plot statistics (min, Q1, median, Q3, max)
 * from a value field per bin. Used by BoxPlotV and BoxPlotH.
 */
export function binDataStats(
  data: any[],
  groupConfig: AxisConfig,
  valueKey: string,
): BinStatsResult[] {
  if (!data || data.length === 0) return [];

  const { labels, assignments } = binAxis(data, groupConfig);

  // Group values by bin label
  const groups = new Map<string, number[]>();
  labels.forEach((l) => groups.set(l, []));

  for (let i = 0; i < data.length; i++) {
    const label = assignments[i];
    const value = Number(deepValue(data[i], valueKey));
    if (!isNaN(value)) {
      groups.get(label)!.push(value);
    }
  }

  return labels
    .map((label) => {
      const values = groups.get(label)!.sort((a, b) => a - b);
      if (values.length === 0) return null;
      return {
        label,
        min: values[0],
        q1: quantile(values, 0.25)!,
        median: quantile(values, 0.5)!,
        q3: quantile(values, 0.75)!,
        max: values[values.length - 1],
        count: values.length,
      };
    })
    .filter((r): r is BinStatsResult => r !== null);
}

export default binData;
