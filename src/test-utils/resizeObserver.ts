// Test-only ResizeObserver, requestAnimationFrame and layout-box mocks for
// useChartSize and the charts that adopt it (not exported from the package).
import { act } from '@testing-library/react';
import { vi } from 'vitest';

export class MockResizeObserver {
  static instances: MockResizeObserver[] = [];
  callback: ResizeObserverCallback;
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }
  /** Fire the observer callback, as the browser would on a layout change. */
  trigger() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

/**
 * Stubs `ResizeObserver`, `requestAnimationFrame`/`cancelAnimationFrame` (frames
 * queue until `flushFrames`) and `SVGElement#getBoundingClientRect` (returns the
 * size set with `setBox`). Undo with `vi.restoreAllMocks()` and
 * `vi.unstubAllGlobals()`.
 */
export const installResizeMocks = (initial = { width: 400, height: 200 }) => {
  MockResizeObserver.instances = [];
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 1;
  let box = { ...initial };

  const rect = vi
    .spyOn(SVGElement.prototype, 'getBoundingClientRect')
    .mockImplementation(() => new DOMRect(0, 0, box.width, box.height));
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
  const raf = vi.fn((cb: FrameRequestCallback) => {
    const id = nextFrame++;
    frames.set(id, cb);
    return id;
  });
  const caf = vi.fn((id: number) => {
    frames.delete(id);
  });
  vi.stubGlobal('requestAnimationFrame', raf);
  vi.stubGlobal('cancelAnimationFrame', caf);

  const setBox = (width: number, height: number) => {
    box = { width, height };
  };
  /** Fire every observer, as a container resize would. */
  const triggerAll = () =>
    act(() => MockResizeObserver.instances.forEach((ro) => ro.trigger()));
  /** Run the queued animation frames. */
  const flushFrames = () =>
    act(() => {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((cb) => cb(0));
    });
  /** setBox, fire the observers, then run the frame. */
  const resize = (width: number, height: number) => {
    setBox(width, height);
    triggerAll();
    flushFrames();
  };

  return { rect, raf, caf, frames, setBox, triggerAll, flushFrames, resize };
};
