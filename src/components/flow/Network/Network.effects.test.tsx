/**
 * Network redraw lifecycle (#10): props changes redraw cleanly, the force
 * simulation is stopped before each redraw and on unmount, and tooltips are
 * not duplicated across rerenders.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { Simulation, SimulationNodeDatum } from 'd3-force';

import Network from '.';

const stops = vi.hoisted(() => ({ count: 0 }));

vi.mock('d3-force', async (importOriginal) => {
  const actual = await importOriginal<typeof import('d3-force')>();
  return {
    ...actual,
    forceSimulation: <N extends SimulationNodeDatum>(nodes?: N[]) => {
      const sim: Simulation<N, undefined> = actual.forceSimulation(nodes);
      const stop = sim.stop.bind(sim);
      sim.stop = () => {
        stops.count += 1;
        return stop();
      };
      return sim;
    },
  };
});

const S = { width: '400px', height: '200px' };
const NODE_DEF = { idKey: 'name', tooltip: {} };
const EDGE_DEF = { sourceKey: 'source', targetKey: 'target', tooltip: {} };
const NODES_2 = [{ name: 'a' }, { name: 'b' }];
const EDGES_1 = [{ source: 'a', target: 'b' }];
const NODES_3 = [{ name: 'a' }, { name: 'b' }, { name: 'c' }];
const EDGES_2 = [
  { source: 'a', target: 'b' },
  { source: 'b', target: 'c' },
];

const svg = (id: string) => document.getElementById(id) as Element;
const nodeCount = (id: string) => svg(id).querySelectorAll('path.fill-black').length;
const edgeCount = (id: string) => svg(id).querySelectorAll('path.fill-none').length;

describe('Network redraw lifecycle (#10)', () => {
  beforeEach(() => {
    stops.count = 0;
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
  });
  afterEach(() => {
    document.querySelectorAll('[id^="tooltip"]').forEach((el) => el.remove());
  });

  it('redraws when nodes and edges change', () => {
    const { rerender } = render(
      <Network id='fx1' nodes={NODES_2} edges={EDGES_1} nodeDef={NODE_DEF} edgeDef={EDGE_DEF} style={S} />
    );
    expect([nodeCount('fx1'), edgeCount('fx1')]).toStrictEqual([2, 1]);

    rerender(<Network id='fx1' nodes={NODES_3} edges={EDGES_2} nodeDef={NODE_DEF} edgeDef={EDGE_DEF} style={S} />);
    expect([nodeCount('fx1'), edgeCount('fx1')]).toStrictEqual([3, 2]);
  });

  it('leaves a single top-level group after rerenders', () => {
    const { rerender } = render(
      <Network id='fx2' nodes={NODES_2} edges={EDGES_1} nodeDef={NODE_DEF} edgeDef={EDGE_DEF} style={S} />
    );
    rerender(<Network id='fx2' nodes={NODES_3} edges={EDGES_2} nodeDef={NODE_DEF} edgeDef={EDGE_DEF} style={S} />);
    rerender(<Network id='fx2' nodes={NODES_2} edges={EDGES_1} nodeDef={NODE_DEF} edgeDef={EDGE_DEF} style={S} />);

    const root = svg('fx2');
    expect(root.children.length).toBe(1);
    // the root group holds exactly one edge group and one node group
    expect(root.querySelectorAll(':scope > g > g').length).toBe(2);
    expect([nodeCount('fx2'), edgeCount('fx2')]).toStrictEqual([2, 1]);
  });

  it('does not redraw when the parent rerenders with the same props', () => {
    const { rerender } = render(
      <Network id='fx3' nodes={NODES_2} edges={EDGES_1} nodeDef={NODE_DEF} edgeDef={EDGE_DEF} style={S} />
    );
    const group = svg('fx3').firstElementChild;
    rerender(<Network id='fx3' nodes={NODES_2} edges={EDGES_1} nodeDef={NODE_DEF} edgeDef={EDGE_DEF} style={S} />);
    expect(svg('fx3').firstElementChild).toBe(group);
    expect(stops.count).toBe(0);
  });

  it('stops the simulation before a redraw and on unmount', () => {
    const { rerender, unmount } = render(
      <Network id='fx4' nodes={NODES_2} edges={EDGES_1} nodeDef={NODE_DEF} edgeDef={EDGE_DEF} style={S} />
    );
    expect(stops.count).toBe(0);
    rerender(<Network id='fx4' nodes={NODES_3} edges={EDGES_2} nodeDef={NODE_DEF} edgeDef={EDGE_DEF} style={S} />);
    expect(stops.count).toBe(1);
    unmount();
    expect(stops.count).toBe(2);
  });

  it('keeps one tooltip element across rerenders', () => {
    const { rerender } = render(
      <Network id='fx5' nodes={NODES_2} edges={EDGES_1} nodeDef={NODE_DEF} edgeDef={EDGE_DEF} style={S} />
    );
    rerender(<Network id='fx5' nodes={NODES_3} edges={EDGES_2} nodeDef={NODE_DEF} edgeDef={EDGE_DEF} style={S} />);
    rerender(<Network id='fx5' nodes={NODES_3} edges={EDGES_2} nodeDef={{ ...NODE_DEF }} edgeDef={EDGE_DEF} style={S} />);
    expect(document.querySelectorAll('[id="tooltip-fx5"]').length).toBe(1);
  });
});
