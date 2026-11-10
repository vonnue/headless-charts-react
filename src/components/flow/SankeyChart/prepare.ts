/**
 * Turns SankeyChart input (`links`, optional `nodes`, key config) into a clean
 * graph for the layout: string ids, positive finite de-duplicated links, no
 * self-loops, no orphans, and a cycle check. Problems are returned as
 * warnings (key + message) for the component to log once in development.
 */
import { findCycle } from './layout';

export interface PreparedLink<TLink = unknown> {
  source: string;
  target: string;
  value: number;
  /** Original rows merged into this link. */
  rows: TLink[];
}

export interface PreparedGraph<TNode = unknown, TLink = unknown> {
  /** Painted node ids, in input order. */
  ids: string[];
  labels: Map<string, string>;
  /** The node record for each id; null when inferred. */
  records: Map<string, TNode | null>;
  links: PreparedLink<TLink>[];
  /** The cycle that rejected the graph, if any (then ids/links are empty). */
  cycle: string[] | null;
}

export interface PrepareConfig {
  idKey: string;
  labelKey?: string;
  sourceKey: string;
  targetKey: string;
  valueKey: string;
}

export interface PrepareWarning {
  /** Suffix for the warnOnceInDev key (the component prefixes the chart id). */
  key: string;
  message: string;
}

type Row = Record<string, unknown>;

const isMissing = (v: unknown) => v === null || v === undefined;

export const prepareGraph = <TNode, TLink>(
  links: TLink[] | undefined | null,
  nodes: TNode[] | undefined | null,
  cfg: PrepareConfig
): { graph: PreparedGraph<TNode, TLink>; warnings: PrepareWarning[] } => {
  const warnings: PrepareWarning[] = [];
  const explicit = Array.isArray(nodes);

  // Nodes: explicit records are authoritative; otherwise infer from links.
  const order: string[] = [];
  const labels = new Map<string, string>();
  const records = new Map<string, TNode | null>();
  if (explicit) {
    const duplicates: string[] = [];
    let missingIds = 0;
    for (const record of nodes as TNode[]) {
      const raw = (record as Row | null)?.[cfg.idKey];
      if (isMissing(raw)) {
        missingIds++;
        continue;
      }
      const id = String(raw);
      if (records.has(id)) {
        if (!duplicates.includes(id)) duplicates.push(id);
        continue;
      }
      order.push(id);
      records.set(id, record);
      const label = cfg.labelKey ? (record as Row)[cfg.labelKey] : undefined;
      labels.set(id, isMissing(label) ? id : String(label));
    }
    if (duplicates.length)
      warnings.push({
        key: 'duplicate-node',
        message: `duplicate node ids (${duplicates.join(', ')}); the first record of each is used.`,
      });
    if (missingIds)
      warnings.push({
        key: 'node-id',
        message: `${missingIds} node record(s) have no "${cfg.idKey}" and are ignored.`,
      });
  }

  // Links: validate, drop, then sum duplicates (first-appearance order).
  const merged = new Map<string, PreparedLink<TLink>>();
  const unknownIds: string[] = [];
  let invalidValues = 0;
  let selfLoops = 0;
  let missingEndpoints = 0;
  for (const row of links ?? []) {
    const r = (row ?? {}) as Row;
    const rawSource = r[cfg.sourceKey];
    const rawTarget = r[cfg.targetKey];
    if (isMissing(rawSource) || isMissing(rawTarget)) {
      missingEndpoints++;
      continue;
    }
    const source = String(rawSource);
    const target = String(rawTarget);
    if (!explicit) {
      // Inferred nodes: first appearance, source before target, from every
      // link row (orphans created by dropped links are removed below).
      for (const id of [source, target])
        if (!records.has(id)) {
          order.push(id);
          records.set(id, null);
          labels.set(id, id);
        }
    } else {
      const missing = [source, target].filter((id) => !records.has(id));
      if (missing.length) {
        missing.forEach((id) => {
          if (!unknownIds.includes(id)) unknownIds.push(id);
        });
        continue;
      }
    }
    const value = r[cfg.valueKey];
    if (value === 0) continue; // a zero flow is valid data: excluded silently
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      invalidValues++;
      continue;
    }
    if (source === target) {
      selfLoops++;
      continue;
    }
    const key = `${source}\u0000${target}`;
    const existing = merged.get(key);
    if (existing) {
      existing.value += value;
      existing.rows.push(row);
    } else merged.set(key, { source, target, value, rows: [row] });
  }

  unknownIds.forEach((id) =>
    warnings.push({
      key: `unknown-node:${id}`,
      message: `links reference node id "${id}", which is not in \`nodes\`; those links are dropped.`,
    })
  );
  if (missingEndpoints)
    warnings.push({
      key: 'endpoint',
      message: `${missingEndpoints} link(s) have no "${cfg.sourceKey}" or "${cfg.targetKey}" and are dropped.`,
    });
  if (invalidValues)
    warnings.push({
      key: 'value',
      message: `${invalidValues} link(s) have a negative, non-finite or non-numeric "${cfg.valueKey}" and are excluded.`,
    });
  if (selfLoops)
    warnings.push({
      key: 'self-loop',
      message: `${selfLoops} self-loop link(s) (source === target) are dropped.`,
    });

  const linkList = Array.from(merged.values());

  // Orphans: nodes with no remaining positive link are not painted.
  const linked = new Set<string>();
  linkList.forEach((l) => {
    linked.add(l.source);
    linked.add(l.target);
  });
  const ids = order.filter((id) => linked.has(id));
  const orphanCount = order.length - ids.length;
  if (explicit && orphanCount)
    warnings.push({
      key: 'orphan',
      message: `${orphanCount} node(s) in \`nodes\` have no positive link and are not drawn.`,
    });

  const cycle = findCycle(ids, linkList);
  if (cycle) {
    warnings.push({
      key: 'cycle',
      message: `the links contain a cycle (${cycle.join(' → ')}); nothing is drawn. Sankey flows must be acyclic.`,
    });
    return {
      graph: { ids: [], labels, records, links: [], cycle },
      warnings,
    };
  }

  return { graph: { ids, labels, records, links: linkList, cycle: null }, warnings };
};
