import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRef } from 'react';
import { renderToString } from 'react-dom/server';
import useChartSize, { ChartSize } from './useChartSize';
import { MockResizeObserver, installResizeMocks } from '@/test-utils/resizeObserver';

let mocks: ReturnType<typeof installResizeMocks>;
const setBox = (w: number, h: number) => mocks.setBox(w, h);
const flushFrames = () => mocks.flushFrames();

const seen: (ChartSize | null)[] = [];
const Probe = ({ style }: { style?: React.CSSProperties }) => {
  const ref = useRef<SVGSVGElement>(null);
  const size = useChartSize(ref);
  seen.push(size);
  return <svg ref={ref} style={style} data-testid='probe' />;
};
const last = () => seen[seen.length - 1];

beforeEach(() => {
  seen.length = 0;
  mocks = installResizeMocks({ width: 400, height: 200 });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useChartSize', () => {
  it('returns the measured svg size after mount and observes the svg', () => {
    const { getByTestId } = render(<Probe />);
    expect(last()).toEqual({ width: 400, height: 200 });
    expect(MockResizeObserver.instances).toHaveLength(1);
    expect(MockResizeObserver.instances[0].observe).toHaveBeenCalledWith(getByTestId('probe'));
  });

  it('is null on the first render, before measurement', () => {
    render(<Probe />);
    expect(seen[0]).toBeNull();
  });

  it('updates on an observer callback, after the next animation frame', () => {
    render(<Probe />);
    setBox(600, 300);
    act(() => MockResizeObserver.instances[0].trigger());
    // Not measured until the frame runs.
    expect(last()).toEqual({ width: 400, height: 200 });
    flushFrames();
    expect(last()).toEqual({ width: 600, height: 300 });
  });

  it('coalesces several callbacks into one frame and one measurement', () => {
    render(<Probe />);
    const ro = MockResizeObserver.instances[0];
    const rect = mocks.rect;
    const rendersBefore = seen.length;
    const measuresBefore = rect.mock.calls.length;
    setBox(500, 250);
    act(() => {
      ro.trigger();
      ro.trigger();
      ro.trigger();
    });
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    flushFrames();
    expect(last()).toEqual({ width: 500, height: 250 });
    // One measurement in the frame, plus one per resulting commit.
    expect(seen.length - rendersBefore).toBe(1);
    expect(rect.mock.calls.length - measuresBefore).toBe(2);
  });

  it('does not re-render for an unchanged or sub-pixel size', () => {
    render(<Probe />);
    const ro = MockResizeObserver.instances[0];
    const rendersBefore = seen.length;
    act(() => ro.trigger());
    flushFrames();
    setBox(400.4, 200.6);
    act(() => ro.trigger());
    flushFrames();
    expect(seen.length).toBe(rendersBefore);
    expect(last()).toEqual({ width: 400, height: 200 });
  });

  it('disconnects the observer and cancels a pending frame on unmount', () => {
    const { unmount } = render(<Probe />);
    const ro = MockResizeObserver.instances[0];
    act(() => ro.trigger());
    expect(mocks.frames.size).toBe(1);
    unmount();
    expect(ro.disconnect).toHaveBeenCalledTimes(1);
    expect(cancelAnimationFrame).toHaveBeenCalledTimes(1);
    expect(mocks.frames.size).toBe(0);
  });

  it('measures once and picks up style changes when ResizeObserver is undefined', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    setBox(0, 0);
    const { rerender } = render(<Probe style={{ width: '320px', height: '160px' }} />);
    expect(last()).toEqual({ width: 320, height: 160 });
    rerender(<Probe style={{ width: '480px', height: '240px' }} />);
    expect(last()).toEqual({ width: 480, height: 240 });
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('measures directly in the observer callback when requestAnimationFrame is undefined', () => {
    vi.stubGlobal('requestAnimationFrame', undefined);
    render(<Probe />);
    setBox(640, 320);
    act(() => MockResizeObserver.instances[0].trigger());
    expect(last()).toEqual({ width: 640, height: 320 });
  });

  it('renders on the server without measuring or observing', () => {
    const html = renderToString(<Probe />);
    expect(html).toContain('<svg');
    expect(seen).toEqual([null]);
    expect(MockResizeObserver.instances).toHaveLength(0);
    expect(SVGElement.prototype.getBoundingClientRect).not.toHaveBeenCalled();
  });
});
