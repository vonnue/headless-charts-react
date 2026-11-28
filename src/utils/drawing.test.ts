import { describe, expect, it } from 'vitest';

import { resolveDrawing } from './drawing';

describe('resolveDrawing', () => {
  it('treats missing, null, non-finite, negative and 0 duration/delay as 0', () => {
    expect(resolveDrawing()).toEqual({ duration: 0, delay: 0 });
    expect(resolveDrawing(undefined)).toEqual({ duration: 0, delay: 0 });
    expect(resolveDrawing(null)).toEqual({ duration: 0, delay: 0 });
    expect(resolveDrawing({})).toEqual({ duration: 0, delay: 0 });
    expect(resolveDrawing({ duration: undefined, delay: undefined })).toEqual({
      duration: 0,
      delay: 0,
    });
    expect(resolveDrawing({ duration: null, delay: null })).toEqual({
      duration: 0,
      delay: 0,
    });
    expect(resolveDrawing({ duration: NaN, delay: NaN })).toEqual({
      duration: 0,
      delay: 0,
    });
    expect(resolveDrawing({ duration: Infinity, delay: Infinity })).toEqual({
      duration: 0,
      delay: 0,
    });
    expect(resolveDrawing({ duration: -Infinity, delay: -Infinity })).toEqual({
      duration: 0,
      delay: 0,
    });
    expect(resolveDrawing({ duration: -200, delay: -10 })).toEqual({
      duration: 0,
      delay: 0,
    });
    expect(resolveDrawing({ duration: 0, delay: 0 })).toEqual({
      duration: 0,
      delay: 0,
    });
  });

  it('keeps a positive finite duration and delay unchanged', () => {
    expect(resolveDrawing({ duration: 1000, delay: 25 })).toEqual({
      duration: 1000,
      delay: 25,
    });
    expect(resolveDrawing({ duration: 0.5, delay: 0.25 })).toEqual({
      duration: 0.5,
      delay: 0.25,
    });
  });

  it('uses an optional positive default when the field would otherwise be 0', () => {
    const fallback = { duration: 1000 };
    expect(resolveDrawing(undefined, fallback)).toEqual({
      duration: 1000,
      delay: 0,
    });
    expect(resolveDrawing({}, fallback)).toEqual({ duration: 1000, delay: 0 });
    expect(resolveDrawing({ duration: 0, delay: 0 }, fallback)).toEqual({
      duration: 1000,
      delay: 0,
    });
    expect(resolveDrawing({ duration: NaN, delay: NaN }, fallback)).toEqual({
      duration: 1000,
      delay: 0,
    });
    expect(resolveDrawing({ duration: -200, delay: -10 }, fallback)).toEqual({
      duration: 1000,
      delay: 0,
    });
    expect(resolveDrawing({ duration: Infinity }, fallback)).toEqual({
      duration: 1000,
      delay: 0,
    });
    expect(resolveDrawing({ duration: 250, delay: 40 }, fallback)).toEqual({
      duration: 250,
      delay: 40,
    });
    expect(
      resolveDrawing({ delay: 40 }, { duration: 1000, delay: 5 })
    ).toEqual({ duration: 1000, delay: 40 });
  });

  it('ignores a non-positive default', () => {
    expect(resolveDrawing({}, { duration: 0, delay: -1 })).toEqual({
      duration: 0,
      delay: 0,
    });
    expect(resolveDrawing({}, { duration: NaN })).toEqual({
      duration: 0,
      delay: 0,
    });
  });
});
