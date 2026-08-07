/**
 * Types for the chart catalog — the machine-readable description of which chart
 * in this library suits which analytical question and data shape.
 *
 * The catalog exists so that an agent (or a human) picking a chart does not have
 * to infer intent from 22 component names. Every chart ships a `meta.ts` next to
 * its implementation; those entries are aggregated in `src/catalog/index.ts` and
 * projected into three surfaces: JSDoc in the emitted `.d.ts`, the generated
 * `AGENTS.md` decision table, and the published `catalog.json`.
 */

/** Directory grouping a chart belongs to. Mirrors `src/components/<category>/`. */
export type ChartCategory =
  | 'linear'
  | 'distribution'
  | 'ranges'
  | 'gauges'
  | 'flow';

/**
 * The analytical question a chart answers. This is the primary selection key:
 * start from the question being asked, not from the chart name.
 */
export type ChartIntent =
  /** Compare a measure across named categories. */
  | 'comparison'
  /** Show parts of a whole, or proportions within categories. */
  | 'composition'
  /** Show how a measure moves over an ordered or time axis. */
  | 'trend'
  /** Show how two measures relate to each other. */
  | 'correlation'
  /** Show how values of one measure are spread. */
  | 'distribution'
  /** Show an interval, a spread, or movement between two states. */
  | 'range'
  /** Show a single value against a target or threshold. */
  | 'progress'
  /** Compare entities across several metrics on a shared scale. */
  | 'profile'
  /** Show ordering or change in ordering. */
  | 'ranking'
  /** Place events or durations on a time axis. */
  | 'schedule'
  /** Show links between entities. */
  | 'connection';

/** What a given prop encodes, so an agent can map data columns to props. */
export type EncodingRole =
  | 'category'
  | 'quantitative'
  | 'temporal'
  | 'series'
  | 'value'
  | 'color'
  | 'size'
  | 'shape'
  | 'label'
  | 'link';

export interface ChartEncoding {
  /** Prop name on the component, e.g. `x`, `y`, `color`, `metrics`. */
  prop: string;
  /** What kind of data column belongs here. */
  role: EncodingRole;
  required: boolean;
  /** Human-readable note on what to pass. */
  description: string;
}

/**
 * A soft guideline on cardinality. `ideal` is where the chart reads well;
 * beyond `max` the chart stops communicating and an alternative should be used.
 */
export interface Cardinality {
  min?: number;
  ideal?: [number, number];
  max?: number;
  note?: string;
}

export interface ChartDataSpec {
  /**
   * Shape of the value passed to `data`:
   * - `records` — an array of objects, one per row
   * - `scalar`  — a single number (gauges)
   * - `graph`   — nodes plus edges (passed as separate props)
   */
  form: 'records' | 'scalar' | 'graph';
  encodings: ChartEncoding[];
  /** How many series/measures the chart can carry at once. */
  seriesCount?: Cardinality;
  /** How many rows/categories the chart can carry at once. */
  rowCount?: Cardinality;
}

/** A related chart and the condition under which it is the better pick. */
export interface ChartAlternative {
  /** Component name — must resolve to another entry in the catalog. */
  name: string;
  when: string;
}

/**
 * A specialised chart type produced by configuring a base component — a
 * streamgraph is an AreaChart with `stacking.type`, a waterfall is a
 * ColumnChartStacked with `waterfall`. These are the names people ask for
 * ("build me a donut chart"), so they carry their own aliases and are routable
 * in their own right.
 */
export interface NamedChartType {
  kind: 'chart-type';
  /** Canonical name, e.g. "Streamgraph". */
  name: string;
  /** Other names the same type is asked for by, lowercase. */
  aliases: string[];
  /** One sentence: what this type shows. */
  summary: string;
  /** The exact props that turn the base chart into this type. */
  how: string;
  /** Conditions that make this type the right choice over the plain chart. */
  useWhen: string[];
  /** Conditions under which this type misleads. */
  avoidWhen?: string[];
  /** Minimal working JSX for the type. */
  example: string;
}

/** A configuration that tunes a chart without making it a different type. */
export interface ChartOption {
  kind: 'option';
  name: string;
  how: string;
}

export type ChartVariant = NamedChartType | ChartOption;

/** Narrows a variant to the specialised chart types. */
export const isNamedChartType = (
  variant: ChartVariant,
): variant is NamedChartType => variant.kind === 'chart-type';

export interface ChartMeta {
  /** Exported component name, exactly as importable from the package root. */
  name: string;
  /**
   * Other names this chart is commonly asked for by, lowercase — a RangePlot is
   * a "dumbbell chart", a WaffleChart is a "heatmap". Requests arrive in these
   * words far more often than in component names.
   */
  aliases: string[];
  category: ChartCategory;
  /** One sentence: what this chart shows. */
  summary: string;
  /** Questions this chart answers, most characteristic first. */
  intents: ChartIntent[];
  data: ChartDataSpec;
  /** Conditions that make this the right choice. */
  useWhen: string[];
  /**
   * Conditions that make this the wrong choice. Each entry should name the
   * chart to use instead — negative guidance is what actually narrows a
   * selection down from "any of 22" to one.
   */
  avoidWhen: string[];
  alternatives: ChartAlternative[];
  /** Props with no default; omitting any of these will not render. */
  requiredProps: string[];
  /** Minimal working JSX, copy-pasteable. */
  example: string;
  /** Storybook path for the introductory story. */
  storybook: string;
  variants?: ChartVariant[];
}

/** A routing question in the decision tree, mapping an intent to candidates. */
export interface DecisionBranch {
  /** The question a user's request maps onto. */
  question: string;
  intent: ChartIntent;
  /** Candidate charts in preference order, each with its distinguishing test. */
  options: { name: string; when: string }[];
}
