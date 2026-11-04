/**
 * useTooltip: test-case analysis (spec: specs/issue-8.md, H1–H17)
 *
 * Lifecycle (#8):  one element per mounted hook; nothing written during render;
 *                  removed on unmount; StrictMode safe; `id` change swaps the
 *                  element; self-heals after external removal; two hooks with
 *                  one id share one element; handlers are no-ops after unmount.
 * Happy path:      onMouseOver shows, positions (+10/+20 from the page pointer)
 *                  and fills content; onMouseMove repositions from the event it
 *                  is given; onMouseLeave hides and moves off-screen.
 * Content:         precedence html > keys > defaultHtml > Object.entries; keys
 *                  support dot paths and fall back to `d.data` (pie/stack data).
 * Edge cases:      missing keys, empty datum, d3 `sourceEvent` unwrapping, the
 *                  legacy global `#tooltip` node, onMouseMove without an event.
 * Opt-in:          without `tooltip` config the element exists but never shows.
 * State:           hidden -> shown -> moved -> hidden -> shown again.
 *
 * The H-numbered cases come from the locked spec and are expected to be red on
 * the pre-fix implementation; they are NOT marked `it.fails`. The one
 * out-of-scope bug (falsy key values rendered blank) stays an `it.fails`.
 */
import { StrictMode, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook } from '@testing-library/react';

import { TooltipConfig } from '@/types';
import useTooltip from './useTooltip';

type HookProps = Parameters<typeof useTooltip>[0];
type MoveFn = (event?: unknown, d?: unknown) => void;

interface PointerLike {
  pageX: number;
  pageY: number;
  sourceEvent?: PointerLike;
}

const at = (pageX: number, pageY: number): PointerLike => ({ pageX, pageY });

const count = (id: string): number => document.querySelectorAll(`[id="tooltip-${id}"]`).length;

const tooltipEl = (id: string): HTMLDivElement => {
  const el = document.getElementById(`tooltip-${id}`);
  if (!(el instanceof HTMLDivElement)) {
    throw new Error(`tooltip-${id} not found`);
  }
  return el;
};

// Class order is not part of the contract, so compare sorted class lists.
const classesOf = (el: Element): string[] => el.className.split(/\s+/).filter(Boolean).sort();

const mount = (props: HookProps) =>
  renderHook((p: HookProps) => useTooltip(p), { initialProps: props });

const strictWrapper = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;

describe('useTooltip', () => {
  beforeEach(() => {
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
  });

  describe('element lifecycle', () => {
    it('H1: creates exactly one tooltip div on mount, hidden, with the configured class', () => {
      mount({ id: 'h1', tooltip: { className: 'tip' } });

      expect(count('h1')).toBe(1);
      expect(classesOf(tooltipEl('h1'))).toEqual(expect.arrayContaining(['tip', 'absolute', 'opacity-0']));
    });

    it('H2: does not add a div on re-render', () => {
      const { rerender } = mount({ id: 'h2', tooltip: {} });

      for (let i = 0; i < 5; i++) rerender({ id: 'h2', tooltip: {} });

      expect(count('h2')).toBe(1);
    });

    it('H3: removes the div on unmount', () => {
      const { unmount } = mount({ id: 'h3', tooltip: {} });

      unmount();

      expect(count('h3')).toBe(0);
    });

    it('H4: under StrictMode keeps exactly one div after mount and zero after unmount', () => {
      const { unmount } = renderHook(() => useTooltip({ id: 'h4', tooltip: {} }), { wrapper: strictWrapper });
      const mounted = count('h4');

      unmount();

      expect({ mounted, unmounted: count('h4') }).toStrictEqual({ mounted: 1, unmounted: 0 });
    });

    it('H5: does not write to the DOM during render', () => {
      const seen: number[] = [];
      function C() {
        useTooltip({ id: 'h5', tooltip: {} });
        seen.push(count('h5'));
        return null;
      }

      render(<C />);

      expect(seen[0]).toBe(0);
    });

    it('H6: swaps the element when the id changes', () => {
      const { rerender } = mount({ id: 'h6a' });

      rerender({ id: 'h6b' });

      expect({ a: count('h6a'), b: count('h6b') }).toStrictEqual({ a: 0, b: 1 });
    });

    it('H12: self-heals when the element was removed externally', () => {
      const { result } = mount({ id: 'h12', tooltip: {} });
      document.getElementById('tooltip-h12')?.remove();

      act(() => result.current.onMouseOver(new MouseEvent('mouseover', { clientX: 1, clientY: 1 }), { a: 1 }));

      expect(count('h12')).toBe(1);
      expect(tooltipEl('h12').isConnected).toBe(true);
      expect(tooltipEl('h12').innerHTML).toContain('a: 1');
    });

    it('H13: two hooks with the same id share one element, removed on unmount', () => {
      function C() {
        useTooltip({ id: 'h13' });
        useTooltip({ id: 'h13' });
        return null;
      }

      const { unmount } = render(<C />);
      const mounted = count('h13');
      unmount();

      expect({ mounted, unmounted: count('h13') }).toStrictEqual({ mounted: 1, unmounted: 0 });
    });

    it('H14: uses the legacy global #tooltip when tooltip is set and leaves it in place on unmount', () => {
      const legacy = document.createElement('div');
      legacy.id = 'tooltip';
      document.body.prepend(legacy);
      const { result, unmount } = mount({ id: 'h14', tooltip: {} });

      act(() => result.current.onMouseOver(new MouseEvent('mouseover', { clientX: 1, clientY: 1 }), { a: 1 }));
      unmount();

      expect(count('h14')).toBe(0);
      expect(legacy.innerHTML).toBe('a: 1');
      expect(legacy.isConnected).toBe(true);
    });

    it('H15: still creates the element without tooltip config', () => {
      mount({ id: 'h15' });

      expect(count('h15')).toBe(1);
    });

    it('H16: applies an updated className on the next hover', () => {
      const { result, rerender } = mount({ id: 'h16', tooltip: { className: 'old-cls' } });

      rerender({ id: 'h16', tooltip: { className: 'new-cls' } });
      act(() => result.current.onMouseOver(at(0, 0), { a: 1 }));

      expect(classesOf(tooltipEl('h16'))).toContain('new-cls');
    });

    it('H17: a handler captured before unmount is a no-op afterwards', () => {
      const { result, unmount } = mount({ id: 'h17', tooltip: {} });
      const { onMouseOver } = result.current;
      unmount();

      expect(() => onMouseOver(new MouseEvent('mouseover', { clientX: 1, clientY: 1 }), { a: 1 })).not.toThrow();
      expect(count('h17')).toBe(0);
    });

    it('#48: does not adopt a chart svg whose id is "tooltip"', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'tooltip';
      svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
      document.body.appendChild(svg);
      const { result, unmount } = mount({ id: 'tooltip', tooltip: {} });

      act(() => result.current.onMouseOver(at(0, 0), { a: 1 }));

      expect(svg.querySelectorAll('path')).toHaveLength(1);
      expect(svg.getAttribute('class')).toBeNull();
      expect(tooltipEl('tooltip').innerHTML).toBe('a: 1');
      unmount();
      expect(count('tooltip')).toBe(0);
      svg.remove();
    });

    it('#48: still adopts a legacy div#tooltip next to a chart svg', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'h48';
      document.body.appendChild(svg);
      const legacy = document.createElement('div');
      legacy.id = 'tooltip';
      document.body.appendChild(legacy);
      const { result } = mount({ id: 'h48', tooltip: {} });

      act(() => result.current.onMouseOver(at(0, 0), { a: 1 }));

      expect(count('h48')).toBe(0);
      expect(legacy.innerHTML).toBe('a: 1');
      expect(result.current.getTooltipDiv().node()).toBe(legacy);
      svg.remove();
    });

    it('#48: does not adopt a div#tooltip inside the chart svg', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'h48b';
      const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
      const inner = document.createElement('div');
      inner.id = 'tooltip';
      fo.appendChild(inner);
      svg.appendChild(fo);
      document.body.appendChild(svg);
      const { result } = mount({ id: 'h48b', tooltip: {} });

      act(() => result.current.onMouseOver(at(0, 0), { a: 1 }));

      expect(inner.innerHTML).toBe('');
      expect(tooltipEl('h48b').innerHTML).toBe('a: 1');
      svg.remove();
    });

    it('should not create a #tooltip-<id> when the legacy #tooltip exists but tooltip is not configured', () => {
      const legacy = document.createElement('div');
      legacy.id = 'tooltip';
      document.body.appendChild(legacy);

      mount({ id: 'unconfigured' });

      expect(count('unconfigured')).toBe(1);
      expect(legacy.innerHTML).toBe('');
    });

    it.each([
      { name: 'merges the configured className', className: 'bg-white p-2', expected: ['absolute', 'bg-white', 'opacity-0', 'p-2', 'tooltip'] },
      { name: 'lets a conflicting className override opacity via tailwind-merge', className: 'opacity-50', expected: ['absolute', 'opacity-50', 'tooltip'] },
      { name: 'uses only the base classes without a className', className: undefined, expected: ['absolute', 'opacity-0', 'tooltip'] },
    ])('should start with the base classes and $name', ({ className, expected }) => {
      mount({ id: 'classes', tooltip: { className } });

      expect(classesOf(tooltipEl('classes'))).toStrictEqual(expected);
    });
  });

  describe('onMouseOver', () => {
    it('H9: shows, fills and positions the tooltip', () => {
      const { result } = mount({ id: 'h9', tooltip: { keys: ['name'] } });

      act(() =>
        result.current.onMouseOver(new MouseEvent('mouseover', { clientX: 5, clientY: 5 }), { name: 'A', value: 3 })
      );

      const el = tooltipEl('h9');
      expect(count('h9')).toBe(1);
      expect(classesOf(el)).toContain('opacity-100');
      expect(el.innerHTML).toBe('name: A');
      expect({ left: el.style.left, top: el.style.top }).toStrictEqual({ left: '15px', top: '25px' });
    });

    it('should make the tooltip visible and keep the configured className', () => {
      const { result } = mount({ id: 'show', tooltip: { className: 'bg-white' } });

      act(() => result.current.onMouseOver(at(0, 0), { a: 1 }));

      expect(classesOf(tooltipEl('show'))).toStrictEqual(['absolute', 'bg-white', 'opacity-100']);
    });

    it.each([
      { pageX: 0, pageY: 0, left: '10px', top: '20px' },
      { pageX: 100, pageY: 50, left: '110px', top: '70px' },
      { pageX: -5, pageY: -15, left: '5px', top: '5px' },
    ])('should position the tooltip at ($pageX + 10, $pageY + 20) of the page pointer', ({ pageX, pageY, left, top }) => {
      const { result } = mount({ id: 'pos', tooltip: {} });

      act(() => result.current.onMouseOver(at(pageX, pageY), { a: 1 }));

      const el = tooltipEl('pos');
      expect({ left: el.style.left, top: el.style.top }).toStrictEqual({ left, top });
    });

    it('should unwrap a d3 sourceEvent to find the pointer position', () => {
      const { result } = mount({ id: 'source', tooltip: {} });

      act(() => result.current.onMouseOver({ ...at(0, 0), sourceEvent: at(30, 40) }, { a: 1 }));

      const el = tooltipEl('source');
      expect({ left: el.style.left, top: el.style.top }).toStrictEqual({ left: '40px', top: '60px' });
    });

    it('should position from a real MouseEvent dispatched on an element', () => {
      const { result } = mount({ id: 'real', tooltip: {} });
      const target = document.createElement('div');
      document.body.appendChild(target);
      target.addEventListener('mouseover', (event) => result.current.onMouseOver(event, { a: 1 }));

      fireEvent.mouseOver(target, { clientX: 12, clientY: 34 });

      const el = tooltipEl('real');
      expect({ left: el.style.left, top: el.style.top }).toStrictEqual({ left: '22px', top: '54px' });
      target.remove();
    });
  });

  describe('tooltip content', () => {
    const datum = { name: 'Apples', value: 42, meta: { origin: 'Kerala' } };

    const flat = { name: 'Apples', value: 42 };
    const cases: Array<{ name: string; props: Omit<HookProps, 'id'>; html: string }> = [
      { name: 'tooltip.html beats keys', props: { tooltip: { html: (d) => `<b>${d.name}</b>`, keys: ['value'] }, defaultHtml: () => 'default' }, html: '<b>Apples</b>' },
      { name: 'keys beat defaultHtml', props: { tooltip: { keys: ['name'] }, defaultHtml: () => 'default' }, html: 'name: Apples' },
      { name: 'defaultHtml beats the entries fallback', props: { tooltip: {}, defaultHtml: (d) => `chart default ${d.value}` }, html: 'chart default 42' },
      { name: 'the entries fallback lists every own entry', props: { tooltip: {} }, html: 'name: Apples<br>value: 42' },
    ];

    it.each(cases)('H10: html precedence: $name', ({ props, html }) => {
      const { result } = mount({ id: 'h10', ...props });

      act(() => result.current.onMouseOver(at(0, 0), flat));

      expect(tooltipEl('h10').innerHTML).toBe(html);
    });

    it('should call tooltip.html with the datum and skip defaultHtml', () => {
      const config: TooltipConfig = { html: (d) => `custom ${d.name}` };
      const htmlSpy = vi.spyOn(config, 'html');
      const defaultHtml = vi.fn(() => 'default');
      const { result } = mount({ id: 'html-wins', tooltip: config, defaultHtml });

      act(() => result.current.onMouseOver(at(0, 0), datum));

      expect(htmlSpy).toHaveBeenCalledWith(datum);
      expect(defaultHtml).not.toHaveBeenCalled();
    });

    it.each([
      { name: 'one "key: value" line per key joined by <br>', keys: ['name', 'value'], d: datum, html: 'name: Apples<br>value: 42' },
      { name: 'dot-path keys into nested objects', keys: ['meta.origin'], d: datum, html: 'meta.origin: Kerala' },
      { name: 'a d.data fallback for pie / stack layouts', keys: ['name'], d: { startAngle: 0, data: { name: 'Slice' } }, html: 'name: Slice' },
      { name: 'an empty value for a key that exists nowhere', keys: ['missing'], d: { name: 'x' }, html: 'missing: ' },
    ])('should render keys with $name', ({ keys, d, html }) => {
      const { result } = mount({ id: 'keys', tooltip: { keys } });

      act(() => result.current.onMouseOver(at(0, 0), d));

      expect(tooltipEl('keys').innerHTML).toBe(html);
    });

    it('should render empty content for an empty datum', () => {
      const { result } = mount({ id: 'empty', tooltip: {} });

      act(() => result.current.onMouseOver(at(0, 0), {}));

      expect(tooltipEl('empty').innerHTML).toBe('');
    });

    // BUG (out of scope for #8, spec §3.7 keeps HTML generation unchanged):
    // the keys path uses `deepValue(d, key) || deepValue(d.data, key) || ''`,
    // so falsy values (0, false, '') render blank. Should use `??`.
    it.fails('should render a zero value for a configured key', () => {
      const { result } = mount({ id: 'zero', tooltip: { keys: ['value'] } });

      act(() => result.current.onMouseOver(at(0, 0), { value: 0 }));

      expect(tooltipEl('zero').innerHTML).toBe('value: 0');
    });
  });

  describe('onMouseMove', () => {
    it('H7: positions the tooltip from the event passed as its argument', () => {
      const { result } = mount({ id: 'h7', tooltip: {} });
      const move = result.current.onMouseMove as MoveFn;

      act(() => move(new MouseEvent('mousemove', { clientX: 50, clientY: 60 })));

      const el = tooltipEl('h7');
      expect({ left: el.style.left, top: el.style.top }).toStrictEqual({ left: '60px', top: '80px' });
    });

    it('H8: is a no-op when called without an event', () => {
      const { result } = mount({ id: 'h8', tooltip: {} });
      act(() => result.current.onMouseOver(at(0, 0), { a: 1 }));
      const leftBefore = tooltipEl('h8').style.left;

      expect(() => result.current.onMouseMove()).not.toThrow();
      expect(tooltipEl('h8').style.left).toBe(leftBefore);
    });

    it('should reposition from an event dispatched by the DOM and leave visibility and content alone', () => {
      const { result } = mount({ id: 'move', tooltip: { keys: ['a'] } });
      const target = document.createElement('div');
      document.body.appendChild(target);
      const move = result.current.onMouseMove as MoveFn;
      target.addEventListener('mousemove', (event) => move(event));
      act(() => result.current.onMouseOver(at(0, 0), { a: 1 }));
      const before = { className: tooltipEl('move').className, html: tooltipEl('move').innerHTML };

      fireEvent.mouseMove(target, { clientX: 30, clientY: 40 });

      const el = tooltipEl('move');
      expect({ left: el.style.left, top: el.style.top }).toStrictEqual({ left: '40px', top: '60px' });
      expect({ className: el.className, html: el.innerHTML }).toStrictEqual(before);
      target.remove();
    });
  });

  describe('onMouseLeave', () => {
    it('H11: hides the tooltip and moves it off-screen', () => {
      const { result } = mount({ id: 'h11', tooltip: { className: 'bg-white' } });
      act(() => result.current.onMouseOver(at(100, 100), { a: 1 }));

      act(() => result.current.onMouseLeave());

      const el = tooltipEl('h11');
      expect(classesOf(el)).toStrictEqual(['absolute', 'bg-white', 'opacity-0']);
      expect(el.style.left).toBe('-1000px');
    });

    it('should be safe to call before any mouseover', () => {
      const { result } = mount({ id: 'leave-first', tooltip: {} });

      act(() => result.current.onMouseLeave());

      expect(classesOf(tooltipEl('leave-first'))).toStrictEqual(['absolute', 'opacity-0']);
    });
  });

  describe('show / hide state transitions', () => {
    it('should cycle hidden -> visible -> hidden -> visible with updated content', () => {
      const { result } = mount({ id: 'cycle', tooltip: { keys: ['n'] } });
      const el = tooltipEl('cycle');
      const states: Array<{ visible: boolean; html: string; left: string }> = [];
      const snap = () =>
        states.push({ visible: classesOf(el).includes('opacity-100'), html: el.innerHTML, left: el.style.left });

      snap();
      act(() => result.current.onMouseOver(at(0, 0), { n: 'first' }));
      snap();
      act(() => result.current.onMouseLeave());
      snap();
      act(() => result.current.onMouseOver(at(5, 5), { n: 'second' }));
      snap();

      expect(states).toStrictEqual([
        { visible: false, html: '', left: '' },
        { visible: true, html: 'n: first', left: '10px' },
        { visible: false, html: 'n: first', left: '-1000px' },
        { visible: true, html: 'n: second', left: '15px' },
      ]);
    });
  });

  describe('opt-in when tooltip config is absent', () => {
    it('should never become visible on mouseover', () => {
      const { result } = mount({ id: 'absent-over' });

      act(() => result.current.onMouseOver(at(0, 0), { a: 1 }));

      expect(classesOf(tooltipEl('absent-over'))).not.toContain('opacity-100');
    });

    it('should still compute content into the hidden div through a mouseover / mouseleave cycle', () => {
      const defaultHtml = vi.fn(() => 'default');
      const { result } = mount({ id: 'absent-cycle', defaultHtml });

      act(() => result.current.onMouseOver(at(0, 0), { a: 1 }));
      act(() => result.current.onMouseLeave());

      expect(defaultHtml).toHaveBeenCalledTimes(1);
      expect(tooltipEl('absent-cycle').innerHTML).toBe('default');
      expect(classesOf(tooltipEl('absent-cycle'))).toStrictEqual(['absolute', 'opacity-0']);
    });
  });
});
