/**
 * In-repo Sankey layout with the classic d3-sankey (0.12.3) semantics.
 *
 * d3-sankey is not a dependency: its last release pins d3-array 1–2 and
 * d3-shape 1, which would bundle a second, older copy of those modules next to
 * d3 v7. This file reproduces its observable behaviour instead:
 * - depth = longest path from a source, height = longest path to a sink;
 * - `justify` / `left` / `right` / `center` alignment, evenly spaced columns;
 * - one shared `ky` (px per unit) chosen so the densest column fits;
 * - `iterations` passes of relaxation (right→left then left→right, with
 *   alpha = 0.99^i and beta = max(1 − alpha, (i + 1) / iterations)), each
 *   followed by collision resolution from the middle node outwards;
 * - links at a node stacked by the breadth of their other endpoint.
 *
 * The layout is computed in abstract coordinates: `x` runs along the flow
 * (columns), `y` across it (breadth). The component maps them to screen axes
 * for horizontal or vertical orientation.
 *
 * It contains no React or selection code.
 */

export type SankeyAlign = 'justify' | 'left' | 'right' | 'center';

export interface LayoutNode {
  id: string;
  /** Input order: the `nodes` array, or first appearance in `links`. */
  index: number;
  sourceLinks: LayoutLink[];
  targetLinks: LayoutLink[];
  inValue: number;
  outValue: number;
  /** max(inValue, outValue). */
  value: number;
  depth: number;
  height: number;
  /** Column after alignment. */
  layer: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface LayoutLink {
  index: number;
  source: LayoutNode;
  target: LayoutNode;
  value: number;
  /** value × ky. */
  width: number;
  /** Centre of the link's band at the source node (breadth axis). */
  y0: number;
  /** Centre of the link's band at the target node (breadth axis). */
  y1: number;
}

export interface LayoutOptions {
  /** Plot extent in abstract coordinates: x along the flow, y across it. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Node thickness along the flow. */
  nodeWidth: number;
  /** Requested gap between nodes in a column (may shrink to fit). */
  nodePadding: number;
  align: SankeyAlign;
  /** `'input'` keeps input order and skips relaxation. */
  nodeSort: 'auto' | 'input';
  iterations: number;
}

export interface LayoutResult {
  nodes: LayoutNode[];
  links: LayoutLink[];
  columns: LayoutNode[][];
  /** Number of columns. */
  columnCount: number;
  /** Shared px-per-unit scale for node and link breadth. */
  ky: number;
  /** Node padding actually used (after shrinking). */
  py: number;
}

export interface LayoutInput {
  /** Node ids in input order. Every link endpoint must be among them. */
  ids: string[];
  /** Positive, finite, de-duplicated, acyclic links. */
  links: { source: string; target: string; value: number }[];
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

const ascendingBreadth = (a: LayoutNode, b: LayoutNode) => a.y0 - b.y0;
const ascendingSourceBreadth = (a: LayoutLink, b: LayoutLink) =>
  ascendingBreadth(a.source, b.source) || a.index - b.index;
const ascendingTargetBreadth = (a: LayoutLink, b: LayoutLink) =>
  ascendingBreadth(a.target, b.target) || a.index - b.index;

/** Column for a node under each alignment, as in d3-sankey. */
const alignFns: Record<SankeyAlign, (node: LayoutNode, n: number) => number> = {
  left: (node) => node.depth,
  right: (node, n) => n - 1 - node.height,
  justify: (node, n) => (node.sourceLinks.length ? node.depth : n - 1),
  center: (node) =>
    node.targetLinks.length
      ? node.depth
      : node.sourceLinks.length
      ? Math.min(...node.sourceLinks.map((l) => l.target.depth)) - 1
      : 0,
};

export const computeSankeyLayout = (
  input: LayoutInput,
  opts: LayoutOptions
): LayoutResult => {
  const byId = new Map<string, LayoutNode>();
  const nodes: LayoutNode[] = input.ids.map((id, index) => {
    const node: LayoutNode = {
      id,
      index,
      sourceLinks: [],
      targetLinks: [],
      inValue: 0,
      outValue: 0,
      value: 0,
      depth: 0,
      height: 0,
      layer: 0,
      x0: 0,
      x1: 0,
      y0: 0,
      y1: 0,
    };
    byId.set(id, node);
    return node;
  });

  const links: LayoutLink[] = input.links.map((l, index) => {
    const source = byId.get(l.source)!;
    const target = byId.get(l.target)!;
    const link: LayoutLink = {
      index,
      source,
      target,
      value: l.value,
      width: 0,
      y0: 0,
      y1: 0,
    };
    source.sourceLinks.push(link);
    target.targetLinks.push(link);
    return link;
  });

  const empty: LayoutResult = {
    nodes,
    links,
    columns: [],
    columnCount: 0,
    ky: 0,
    py: 0,
  };
  if (nodes.length === 0) return empty;

  // Node values.
  for (const node of nodes) {
    node.outValue = sum(node.sourceLinks.map((l) => l.value));
    node.inValue = sum(node.targetLinks.map((l) => l.value));
    node.value = Math.max(node.inValue, node.outValue);
  }

  // Depths (longest path from a source) and heights (to a sink). The caller
  // guarantees an acyclic graph; the n-bound only stops a runaway loop.
  const sweep = (
    key: 'depth' | 'height',
    next: (n: LayoutNode) => LayoutNode[]
  ) => {
    let current = new Set(nodes);
    let x = 0;
    while (current.size) {
      const following = new Set<LayoutNode>();
      for (const node of current) {
        node[key] = x;
        for (const n of next(node)) following.add(n);
      }
      if (++x > nodes.length) break;
      current = following;
    }
  };
  sweep('depth', (n) => n.sourceLinks.map((l) => l.target));
  sweep('height', (n) => n.targetLinks.map((l) => l.source));

  // Columns.
  const columnCount = Math.max(...nodes.map((n) => n.depth)) + 1;
  const { x0, x1, y0, y1, nodeWidth: dx } = opts;
  const kx = columnCount > 1 ? (x1 - x0 - dx) / (columnCount - 1) : 0;
  const columns: LayoutNode[][] = Array.from({ length: columnCount }, () => []);
  const align = alignFns[opts.align];
  for (const node of nodes) {
    const i = Math.max(
      0,
      Math.min(columnCount - 1, Math.floor(align(node, columnCount)))
    );
    node.layer = i;
    node.x0 = x0 + i * kx;
    node.x1 = node.x0 + dx;
    columns[i].push(node);
  }
  // Columns hold nodes in input order (d3-sankey with no nodeSort comparator).

  // Padding: d3-sankey shrinks it to (y1 − y0) / (maxColumnLength − 1), which
  // leaves exactly zero room (ky = 0) in the limiting case. Capping at
  // (y1 − y0) / maxColumnLength instead keeps ky > 0.
  const H = Math.max(0, y1 - y0);
  const maxLen = Math.max(...columns.map((c) => c.length));
  const py = Math.min(opts.nodePadding, maxLen > 1 ? H / maxLen : Infinity);

  // Initial breadths: stack each column from the top, then spread the slack
  // evenly around the nodes.
  const kys = columns
    .filter((c) => c.length)
    .map((c) => (H - (c.length - 1) * py) / sum(c.map((n) => n.value)));
  const ky = Math.max(0, Math.min(...kys));
  for (const column of columns) {
    let y = y0;
    for (const node of column) {
      node.y0 = y;
      node.y1 = y + node.value * ky;
      y = node.y1 + py;
      for (const link of node.sourceLinks) link.width = link.value * ky;
    }
    const slack = (y1 - y + py) / (column.length + 1);
    column.forEach((node, i) => {
      node.y0 += slack * (i + 1);
      node.y1 += slack * (i + 1);
    });
    // As in d3-sankey, links are reordered column by column while later
    // columns are still unplaced (all at breadth 0), so those ties fall back
    // to input order. Relaxation re-sorts them as nodes move.
    for (const node of column) {
      node.sourceLinks.sort(ascendingTargetBreadth);
      node.targetLinks.sort(ascendingSourceBreadth);
    }
  }

  const reorderNodeLinks = (node: LayoutNode) => {
    for (const l of node.targetLinks) l.source.sourceLinks.sort(ascendingTargetBreadth);
    for (const l of node.sourceLinks) l.target.targetLinks.sort(ascendingSourceBreadth);
  };

  // Where a link would start/end if the endpoints were stacked as now.
  const targetTop = (source: LayoutNode, target: LayoutNode) => {
    let y = source.y0 - ((source.sourceLinks.length - 1) * py) / 2;
    for (const { target: node, width } of source.sourceLinks) {
      if (node === target) break;
      y += width + py;
    }
    for (const { source: node, width } of target.targetLinks) {
      if (node === source) break;
      y -= width;
    }
    return y;
  };
  const sourceTop = (source: LayoutNode, target: LayoutNode) => {
    let y = target.y0 - ((target.targetLinks.length - 1) * py) / 2;
    for (const { source: node, width } of target.targetLinks) {
      if (node === source) break;
      y += width + py;
    }
    for (const { target: node, width } of source.sourceLinks) {
      if (node === target) break;
      y -= width;
    }
    return y;
  };

  const topToBottom = (column: LayoutNode[], y: number, i: number, alpha: number) => {
    for (; i < column.length; ++i) {
      const node = column[i];
      const d = (y - node.y0) * alpha;
      if (d > 1e-6) {
        node.y0 += d;
        node.y1 += d;
      }
      y = node.y1 + py;
    }
  };
  const bottomToTop = (column: LayoutNode[], y: number, i: number, alpha: number) => {
    for (; i >= 0; --i) {
      const node = column[i];
      const d = (node.y1 - y) * alpha;
      if (d > 1e-6) {
        node.y0 -= d;
        node.y1 -= d;
      }
      y = node.y0 - py;
    }
  };
  const resolveCollisions = (column: LayoutNode[], alpha: number) => {
    const i = column.length >> 1;
    const subject = column[i];
    bottomToTop(column, subject.y0 - py, i - 1, alpha);
    topToBottom(column, subject.y1 + py, i + 1, alpha);
    bottomToTop(column, y1, column.length - 1, alpha);
    topToBottom(column, y0, 0, alpha);
  };

  const relaxLeftToRight = (alpha: number, beta: number) => {
    for (let i = 1; i < columns.length; ++i) {
      const column = columns[i];
      for (const target of column) {
        let y = 0;
        let w = 0;
        for (const { source, value } of target.targetLinks) {
          const v = value * (target.layer - source.layer);
          y += targetTop(source, target) * v;
          w += v;
        }
        if (!(w > 0)) continue;
        const d = (y / w - target.y0) * alpha;
        target.y0 += d;
        target.y1 += d;
        reorderNodeLinks(target);
      }
      column.sort(ascendingBreadth);
      if (column.length) resolveCollisions(column, beta);
    }
  };
  const relaxRightToLeft = (alpha: number, beta: number) => {
    for (let i = columns.length - 2; i >= 0; --i) {
      const column = columns[i];
      for (const source of column) {
        let y = 0;
        let w = 0;
        for (const { target, value } of source.sourceLinks) {
          const v = value * (target.layer - source.layer);
          y += sourceTop(source, target) * v;
          w += v;
        }
        if (!(w > 0)) continue;
        const d = (y / w - source.y0) * alpha;
        source.y0 += d;
        source.y1 += d;
        reorderNodeLinks(source);
      }
      column.sort(ascendingBreadth);
      if (column.length) resolveCollisions(column, beta);
    }
  };

  const iterations = opts.nodeSort === 'input' ? 0 : opts.iterations;
  for (let i = 0; i < iterations; ++i) {
    const alpha = Math.pow(0.99, i);
    const beta = Math.max(1 - alpha, (i + 1) / iterations);
    relaxRightToLeft(alpha, beta);
    relaxLeftToRight(alpha, beta);
  }

  // Link breadths: stack each node's links in their sorted order.
  for (const node of nodes) {
    let ys = node.y0;
    let yt = node.y0;
    for (const link of node.sourceLinks) {
      link.y0 = ys + link.width / 2;
      ys += link.width;
    }
    for (const link of node.targetLinks) {
      link.y1 = yt + link.width / 2;
      yt += link.width;
    }
  }

  return { nodes, links, columns, columnCount, ky, py };
};

/**
 * One cycle in a directed graph, as a closed id path (`[A, B, C, A]`), or
 * `null` if the graph is acyclic. Deterministic: nodes are visited in `ids`
 * order and edges in input order.
 */
export const findCycle = (
  ids: string[],
  links: { source: string; target: string }[]
): string[] | null => {
  const adj = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const l of links) adj.get(l.source)?.push(l.target);
  const state = new Map<string, 1 | 2>(); // 1 = on stack, 2 = done
  const stack: string[] = [];
  const visit = (id: string): string[] | null => {
    state.set(id, 1);
    stack.push(id);
    for (const next of adj.get(id) ?? []) {
      const s = state.get(next);
      if (s === 1) return [...stack.slice(stack.indexOf(next)), next];
      if (s === undefined) {
        const found = visit(next);
        if (found) return found;
      }
    }
    stack.pop();
    state.set(id, 2);
    return null;
  };
  for (const id of ids) {
    if (state.has(id)) continue;
    const found = visit(id);
    if (found) return found;
  }
  return null;
};
