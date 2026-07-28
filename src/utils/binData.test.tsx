import { describe, it, expect } from 'vitest';
import { binData, bin1D, binDataStats } from './binData';

describe('binData', () => {
  const data = [
    { x: 1, y: 10 },
    { x: 2, y: 10 },
    { x: 3, y: 20 },
    { x: 4, y: 20 },
    { x: 5, y: 30 },
    { x: 6, y: 30 },
    { x: 7, y: 10 },
    { x: 8, y: 20 },
    { x: 9, y: 30 },
    { x: 10, y: 10 },
  ];

  it('bins both axes', () => {
    const result = binData(
      data,
      { key: 'x', bin: { count: 2 } },
      { key: 'y', bin: { count: 2 } },
    );

    expect(result.xValues.length).toBeGreaterThanOrEqual(2);
    expect(result.yValues.length).toBeGreaterThanOrEqual(2);
    expect(result.binnedData.length).toBeGreaterThan(0);

    // Every binned row should have a count
    result.binnedData.forEach((row) => {
      expect(row.count).toBeGreaterThan(0);
    });

    // Total count should equal original data length
    const totalCount = result.binnedData.reduce((sum, r) => sum + r.count, 0);
    expect(totalCount).toBe(data.length);
  });

  it('bins x only, keeps y categorical', () => {
    const result = binData(
      data,
      { key: 'x', bin: { count: 3 } },
      { key: 'y' },
    );

    expect(result.xValues.length).toBeGreaterThanOrEqual(2);
    // y should be the unique string values of y
    expect(result.yValues).toEqual(
      expect.arrayContaining(['10', '20', '30']),
    );

    const totalCount = result.binnedData.reduce((sum, r) => sum + r.count, 0);
    expect(totalCount).toBe(data.length);
  });

  it('bins y only, keeps x categorical', () => {
    const result = binData(
      data,
      { key: 'x' },
      { key: 'y', bin: { count: 2 } },
    );

    expect(result.yValues.length).toBeGreaterThanOrEqual(2);
    // x should be the unique string values of x
    expect(result.xValues).toContain('1');
    expect(result.xValues).toContain('10');

    const totalCount = result.binnedData.reduce((sum, r) => sum + r.count, 0);
    expect(totalCount).toBe(data.length);
  });

  it('uses custom thresholds', () => {
    const result = binData(
      data,
      { key: 'x', bin: { count: 3, thresholds: [3, 7] } },
      { key: 'y', bin: { count: 2, thresholds: [20] } },
    );

    expect(result.binnedData.length).toBeGreaterThan(0);

    const totalCount = result.binnedData.reduce((sum, r) => sum + r.count, 0);
    expect(totalCount).toBe(data.length);
  });

  it('uses custom labelFormat', () => {
    const result = binData(
      data,
      {
        key: 'x',
        bin: {
          count: 2,
          labelFormat: (low, high) => `[${low} to ${high}]`,
        },
      },
      { key: 'y', bin: { count: 2 } },
    );

    // x labels should use custom format
    result.xValues.forEach((label) => {
      expect(label).toMatch(/^\[.+ to .+\]$/);
    });
  });

  it('returns empty result for empty data', () => {
    const result = binData(
      [],
      { key: 'x', bin: { count: 3 } },
      { key: 'y', bin: { count: 3 } },
    );

    expect(result.binnedData).toEqual([]);
    expect(result.xValues).toEqual([]);
    expect(result.yValues).toEqual([]);
  });

  it('handles single data point', () => {
    const result = binData(
      [{ x: 5, y: 10 }],
      { key: 'x', bin: { count: 3 } },
      { key: 'y', bin: { count: 3 } },
    );

    expect(result.binnedData.length).toBe(1);
    expect(result.binnedData[0].count).toBe(1);
  });
});

describe('bin1D', () => {
  const data = [
    { score: 10 }, { score: 20 }, { score: 30 },
    { score: 40 }, { score: 50 }, { score: 60 },
    { score: 70 }, { score: 80 }, { score: 90 },
    { score: 55 }, { score: 65 }, { score: 75 },
  ];

  it('bins data into count per bin', () => {
    const result = bin1D(data, { key: 'score', bin: { count: 3 } });

    expect(result.length).toBeGreaterThanOrEqual(2);

    const totalCount = result.reduce((sum, r) => sum + r.count, 0);
    expect(totalCount).toBe(data.length);

    result.forEach((r) => {
      expect(r.count).toBeGreaterThan(0);
      expect(r.label).toBeDefined();
    });
  });

  it('computes sum and mean when valueKey is provided', () => {
    const dataWithValue = [
      { score: 10, amount: 100 },
      { score: 10, amount: 200 },
      { score: 90, amount: 500 },
    ];

    const result = bin1D(
      dataWithValue,
      { key: 'score', bin: { count: 2 } },
      'amount',
    );

    expect(result.length).toBeGreaterThanOrEqual(1);
    // Check that sum and mean are computed
    result.forEach((r) => {
      expect(r.sum).toBeGreaterThanOrEqual(0);
      expect(r.mean).toBeGreaterThanOrEqual(0);
    });
  });

  it('returns empty for empty data', () => {
    const result = bin1D([], { key: 'score', bin: { count: 3 } });
    expect(result).toEqual([]);
  });

  it('uses custom thresholds', () => {
    const result = bin1D(data, { key: 'score', bin: { count: 3, thresholds: [30, 60] } });

    const totalCount = result.reduce((sum, r) => sum + r.count, 0);
    expect(totalCount).toBe(data.length);
  });
});

describe('binDataStats', () => {
  const data = [
    { age: 22, salary: 30000 }, { age: 24, salary: 35000 },
    { age: 25, salary: 32000 }, { age: 27, salary: 40000 },
    { age: 35, salary: 55000 }, { age: 36, salary: 53000 },
    { age: 37, salary: 58000 }, { age: 38, salary: 60000 },
    { age: 50, salary: 80000 }, { age: 52, salary: 82000 },
    { age: 54, salary: 85000 }, { age: 55, salary: 78000 },
  ];

  it('computes box stats per bin', () => {
    const result = binDataStats(
      data,
      { key: 'age', bin: { count: 3 } },
      'salary',
    );

    expect(result.length).toBeGreaterThanOrEqual(2);

    result.forEach((r) => {
      expect(r.min).toBeLessThanOrEqual(r.q1);
      expect(r.q1).toBeLessThanOrEqual(r.median);
      expect(r.median).toBeLessThanOrEqual(r.q3);
      expect(r.q3).toBeLessThanOrEqual(r.max);
      expect(r.count).toBeGreaterThan(0);
      expect(r.label).toBeDefined();
    });
  });

  it('returns empty for empty data', () => {
    const result = binDataStats(
      [],
      { key: 'age', bin: { count: 3 } },
      'salary',
    );
    expect(result).toEqual([]);
  });

  it('handles single data point', () => {
    const result = binDataStats(
      [{ age: 30, salary: 50000 }],
      { key: 'age', bin: { count: 3 } },
      'salary',
    );

    expect(result.length).toBe(1);
    expect(result[0].min).toBe(50000);
    expect(result[0].max).toBe(50000);
    expect(result[0].median).toBe(50000);
  });

  it('uses custom thresholds', () => {
    const result = binDataStats(
      data,
      { key: 'age', bin: { count: 3, thresholds: [30, 45] } },
      'salary',
    );

    const totalCount = result.reduce((sum, r) => sum + r.count, 0);
    expect(totalCount).toBe(data.length);
  });
});
