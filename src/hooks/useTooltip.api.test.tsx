/**
 * useTooltip public API additions from review 1 of #8:
 * - getTooltipDiv() returns the live element, including from a mount effect
 *   (where the deprecated render-time `tooltipDiv` is still empty);
 * - onMouseMove() without an event warns once per instance in development
 *   and stays a no-op; with an event it does not warn;
 * - getTooltipDiv() is live in a child component's mount effect and in a
 *   layout effect declared after the hook (the [id] effect is a layout effect);
 * - server rendering logs nothing, and without `window` the hook never calls
 *   useLayoutEffect (React 18 warns about it on the server; 19 does not, so
 *   the no-window test spies on it instead of relying on the warning).
 */
import { useEffect, useLayoutEffect } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, renderHook } from '@testing-library/react';

import useTooltip from './useTooltip';

const ID = 'api-test';
const el = () => document.getElementById(`tooltip-${ID}`);
type GetTooltipDiv = ReturnType<typeof useTooltip>['getTooltipDiv'];

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('useTooltip getTooltipDiv', () => {
  it('returns the live element from a mount effect', () => {
    const seen: { live: number; snapshot: number }[] = [];
    const Probe = () => {
      const { tooltipDiv, getTooltipDiv } = useTooltip({ id: ID, tooltip: {} });
      useEffect(() => {
        seen.push({ live: getTooltipDiv().size(), snapshot: tooltipDiv.size() });
        getTooltipDiv().html('from mount effect');
      }, [getTooltipDiv, tooltipDiv]); // rendered once, so this is the mount run

      return null;
    };
    render(<Probe />);
    expect(seen).toEqual([{ live: 1, snapshot: 0 }]);
    expect(el()?.innerHTML).toBe('from mount effect');
  });

  it("returns the live element from a child component's mount effect", () => {
    const Child = ({ getDiv }: { getDiv: GetTooltipDiv }) => {
      useEffect(() => {
        getDiv().html('from child');
      }, [getDiv]);
      return null;
    };
    const Parent = () => {
      const { getTooltipDiv } = useTooltip({ id: ID, tooltip: {} });
      return <Child getDiv={getTooltipDiv} />;
    };
    render(<Parent />);
    expect(el()?.innerHTML).toBe('from child');
  });

  it('returns the live element from a layout effect declared after the hook', () => {
    const Probe = () => {
      const { getTooltipDiv } = useTooltip({ id: ID, tooltip: {} });
      useLayoutEffect(() => {
        getTooltipDiv().html('from layout effect');
      }, [getTooltipDiv]);
      return null;
    };
    render(<Probe />);
    expect(el()?.innerHTML).toBe('from layout effect');
  });

  it('returns the element it would act on, re-creating it if removed', () => {
    const { result } = renderHook(() => useTooltip({ id: ID, tooltip: {} }));
    expect(result.current.getTooltipDiv().node()).toBe(el());
    el()?.remove();
    const node = result.current.getTooltipDiv().node();
    expect(node).not.toBeNull();
    expect(node).toBe(el());
  });

  it('returns an empty selection after unmount and creates nothing', () => {
    const { result, unmount } = renderHook(() => useTooltip({ id: ID, tooltip: {} }));
    const { getTooltipDiv } = result.current;
    unmount();
    expect(getTooltipDiv().empty()).toBe(true);
    expect(el()).toBeNull();
  });
});

describe('useTooltip onMouseMove without an event', () => {
  it('warns once per instance and does not move the tooltip', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useTooltip({ id: ID, tooltip: {} }));
    const before = el()?.getAttribute('style') ?? null;
    result.current.onMouseMove();
    result.current.onMouseMove();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/onMouseMove must be called with the mouse event/);
    expect(el()?.getAttribute('style') ?? null).toBe(before);
  });

  it('does not warn when called with an event', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useTooltip({ id: ID, tooltip: {} }));
    result.current.onMouseMove({ pageX: 5, pageY: 6 });
    expect(warn).not.toHaveBeenCalled();
    expect(el()?.style.left).toBe('15px');
  });

  it('does not warn after unmount', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result, unmount } = renderHook(() => useTooltip({ id: ID, tooltip: {} }));
    unmount();
    result.current.onMouseMove();
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('useTooltip server rendering', () => {
  it('renders to a string without logging (smoke test)', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Probe = () => {
      useTooltip({ id: ID, tooltip: {} });
      return <span>ok</span>;
    };
    expect(renderToString(<Probe />)).toContain('ok');
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('never calls useLayoutEffect and logs nothing when there is no window', async () => {
    vi.stubGlobal('window', undefined);
    vi.resetModules();
    const layoutEffect = vi.fn();
    vi.doMock('react', async (importOriginal) => {
      const actual = await importOriginal<typeof import('react')>();
      layoutEffect.mockImplementation(actual.useLayoutEffect);
      return { ...actual, useLayoutEffect: layoutEffect };
    });
    try {
      const { default: useServerTooltip } = await import('./useTooltip');
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const Probe = () => {
        useServerTooltip({ id: ID, tooltip: {} });
        return <span>ok</span>;
      };
      expect(renderToString(<Probe />)).toContain('ok');
      expect(error).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
      expect(layoutEffect).not.toHaveBeenCalled();
      expect(el()).toBeNull();
    } finally {
      vi.doUnmock('react');
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });
});
