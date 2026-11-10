import type { AxisConfig } from '@/types';
import deepValue from '@/utils/deepValue';
import { makeDateAccessor } from '@/utils/timeScale';

/**
 * Whether dates are read and shown in UTC: `x.time.utc` when it is set,
 * otherwise `true` for `x.time.isISO` data and `false` for `x.time.format`
 * data. This is the same rule as PR #57's `isUtcTime` in
 * `src/utils/timeScale.ts`, kept local so CandlestickChart behaves the same
 * whether or not #57 has merged. Once #57 is on main this can import it.
 */
export const isUtcTime = (x: Pick<AxisConfig, 'time'>): boolean =>
  x.time?.utc ?? Boolean(x.time?.isISO);

/**
 * `x` with `time.utc` set explicitly to `isUtcTime(x)`. The shared helpers
 * (`makeDateParser`, `makeDateFormatter`, `createTimeBarLayout`,
 * `useTimeAxisWarnings`) then pick UTC vs local time by the #57 rule on main
 * and on #57 alike, because an explicit `utc` means the same in both.
 */
export const withResolvedUtc = <TData>(x: AxisConfig<TData>): AxisConfig<TData> => ({
  ...x,
  time: { ...x.time, utc: isUtcTime(x) },
});

export type Direction = 'up' | 'down' | 'flat';

/** Datum given to tooltip handlers, `tooltip.html` and `tooltip.keys`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CandleDatum<TData = any> {
  /** The original row. */
  data: TData;
  date: Date;
  /** Raw values from the row (not the extended wick). */
  open: number;
  high: number;
  low: number;
  close: number;
  /** close vs the same period's open; `flat` on exact equality. */
  direction: Direction;
  /** close − open */
  change: number;
  /** change / open; `null` when open is 0. */
  changePct: number | null;
  /** The previous drawn period's close; `null` for the first. */
  prevClose: number | null;
  /** `null` when `volume` is off, or the value is missing, negative or non-finite. */
  volume: number | null;
}

/** A datum plus the drawn wick extent (covers the body when O/C fall outside L..H). */
export interface Candle<TData> {
  datum: CandleDatum<TData>;
  /** Band-scale key: the epoch ms as a string. */
  key: string;
  drawLow: number;
  drawHigh: number;
}

export interface PreparedCandles<TData> {
  candles: Candle<TData>[];
  /** Rows dropped because a date could not be read (warned by the shared time warning). */
  invalidDates: number;
  /** Rows dropped for a missing / NaN / non-finite O, H, L or C. */
  invalidOhlc: number;
  /** Rows dropped because high < low. */
  highBelowLow: number;
  /** Rows kept whose open or close lies outside [low, high]. */
  outsideRange: number;
  /** Later rows dropped because an earlier row had the same instant. */
  duplicates: number;
  /** Kept rows whose volume is present but negative / non-finite / not a number. */
  invalidVolume: number;
  /** True when `volume` is set but no kept row has the key at all. */
  volumeAbsent: boolean;
}

const readNumber = (row: unknown, key: string): number | undefined => {
  const v = deepValue(row, key);
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
};

export interface PrepareOptions<TData> {
  x: AxisConfig<TData>;
  open: string;
  high: string;
  low: string;
  close: string;
  volume?: string;
}

/**
 * Validates, sorts and de-duplicates rows into candles. `x` should already
 * have its `utc` resolved (`withResolvedUtc`). Pure, so it is tested directly.
 */
export const prepareCandles = <TData>(
  data: TData[] | undefined,
  opts: PrepareOptions<TData>
): PreparedCandles<TData> => {
  const toDate = makeDateAccessor<TData>(opts.x);
  let invalidDates = 0,
    invalidOhlc = 0,
    highBelowLow = 0,
    outsideRange = 0,
    duplicates = 0,
    invalidVolume = 0,
    volumePresent = 0;

  type Pending = { row: TData; date: Date; o: number; h: number; l: number; c: number; v: number | null; vPresent: boolean };
  const pending: Pending[] = [];
  (data ?? []).forEach((row) => {
    const date = toDate(row);
    if (!date) {
      invalidDates++;
      return;
    }
    const o = readNumber(row, opts.open);
    const h = readNumber(row, opts.high);
    const l = readNumber(row, opts.low);
    const c = readNumber(row, opts.close);
    if (o === undefined || h === undefined || l === undefined || c === undefined) {
      invalidOhlc++;
      return;
    }
    if (h < l) {
      highBelowLow++;
      return;
    }
    let v: number | null = null;
    let vPresent = false;
    if (opts.volume !== undefined) {
      const raw = deepValue(row, opts.volume);
      vPresent = raw !== undefined && raw !== null;
      if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) v = raw;
    }
    pending.push({ row, date, o, h, l, c, v, vPresent });
  });

  // Stable sort: among equal instants, input order is kept, so "first wins".
  pending.sort((a, b) => a.date.getTime() - b.date.getTime());
  const seen = new Set<number>();
  const kept = pending.filter((p) => {
    const t = p.date.getTime();
    if (seen.has(t)) {
      duplicates++;
      return false;
    }
    seen.add(t);
    return true;
  });

  // Volume issues are counted on kept rows only.
  kept.forEach((p) => {
    if (!p.vPresent) return;
    volumePresent++;
    if (p.v === null) invalidVolume++;
  });

  let prevClose: number | null = null;
  const candles = kept.map((p): Candle<TData> => {
    const change = p.c - p.o;
    const direction: Direction = p.c > p.o ? 'up' : p.c < p.o ? 'down' : 'flat';
    const outside = p.o < p.l || p.o > p.h || p.c < p.l || p.c > p.h;
    if (outside) outsideRange++;
    const datum: CandleDatum<TData> = {
      data: p.row,
      date: p.date,
      open: p.o,
      high: p.h,
      low: p.l,
      close: p.c,
      direction,
      change,
      changePct: p.o === 0 ? null : change / p.o,
      prevClose,
      volume: p.v,
    };
    prevClose = p.c;
    return {
      datum,
      key: String(p.date.getTime()),
      drawLow: Math.min(p.l, p.o, p.c),
      drawHigh: Math.max(p.h, p.o, p.c),
    };
  });

  return {
    candles,
    invalidDates,
    invalidOhlc,
    highBelowLow,
    outsideRange,
    duplicates,
    invalidVolume,
    volumeAbsent: opts.volume !== undefined && candles.length > 0 && volumePresent === 0,
  };
};
