/**
 * Network: test-case analysis (spec: specs/issue-8.md, C10)
 *
 * Tooltip hooks:  node and edge tooltips share one `#tooltip-<id>` element
 *                 (both hooks are called with the same id at the top level);
 *                 it is removed on unmount and mounting does not throw.
 * Redraw lifecycle (#10) is covered in Network.effects.test.tsx.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import Network from '.';
import edges from './edges.json';
import nodes from './nodes.json';

const S = { width: '400px', height: '200px' };
const NODE_DEF = { idKey: 'name', tooltip: {} };
const EDGE_DEF = { sourceKey: 'source', targetKey: 'target', tooltip: {} };
const count = (id: string): number => document.querySelectorAll(`[id="tooltip-${id}"]`).length;

describe('Network tooltip lifecycle', () => {
  beforeEach(() => {
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
  });

  it('C10: node and edge tooltips share one element that is removed on unmount', () => {
    let unmount = () => {};
    const mount = () => {
      ({ unmount } = render(<Network id='net' nodes={nodes} edges={edges} nodeDef={NODE_DEF} edgeDef={EDGE_DEF} style={S} />));
    };

    expect(mount).not.toThrow();
    const mounted = count('net');
    unmount();

    expect({ mounted, unmounted: count('net') }).toStrictEqual({ mounted: 1, unmounted: 0 });
  });
});

describe('Network edge keys (#20)', () => {
  const NODES = [{ name: 'a' }, { name: 'b' }, { name: 'c' }];
  const lines = () => document.querySelectorAll('svg g path.fill-none').length;

  it('custom sourceKey/targetKey link nodes without throwing', () => {
    const custom = [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }];
    expect(() =>
      render(<Network id='ek1' nodes={NODES} edges={custom} nodeDef={{ idKey: 'name' }} edgeDef={{ sourceKey: 'from', targetKey: 'to' }} style={S} />)
    ).not.toThrow();
    expect(lines()).toBe(2);
  });

  it("does not mutate the caller's edges array or objects", () => {
    const custom = [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }];
    const snapshot = structuredClone(custom);
    const ref0 = custom[0];
    render(<Network id='ek2' nodes={NODES} edges={custom} nodeDef={{ idKey: 'name' }} edgeDef={{ sourceKey: 'from', targetKey: 'to' }} style={S} />);
    expect(custom).toStrictEqual(snapshot);
    expect(custom[0]).toBe(ref0);
  });

  it('defaults to source/target with idKey id', () => {
    const idNodes = [{ id: '1' }, { id: '2' }];
    expect(() =>
      render(<Network id='ek3' nodes={idNodes} edges={[{ source: '1', target: '2' }]} nodeDef={{ idKey: 'id' }} edgeDef={{}} style={S} />)
    ).not.toThrow();
    expect(lines()).toBe(1);
  });
});
