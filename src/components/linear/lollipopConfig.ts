import type { ChartProps } from '@/types';

/** Wrappers keep today's always-on 1 s draw-in when `drawing` is omitted. */
export const WRAPPER_DRAWING: NonNullable<ChartProps['drawing']> = {
  duration: 1000,
  delay: 0,
};
