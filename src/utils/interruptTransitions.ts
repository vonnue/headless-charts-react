import { type BaseType } from 'd3-selection';
import { interrupt } from 'd3-transition';

type ScheduleMap = Record<string, { name: string | null }>;

function transitionNames(node: Element): Array<string | undefined> {
  const schedules = (node as unknown as { __transition?: ScheduleMap }).__transition;
  if (!schedules) return [];
  const names = new Set<string | undefined>();
  for (const schedule of Object.values(schedules)) {
    names.add(schedule.name == null ? undefined : String(schedule.name));
  }
  return [...names];
}

function interruptNode(node: Element): void {
  for (const name of transitionNames(node)) {
    interrupt(node, name);
  }
}

/**
 * Interrupt every running D3 transition on `node` and its descendants,
 * including named transitions.
 *
 * Call from a drawing effect's cleanup after capturing the node — a later
 * `#id` lookup would find nothing, because cleanup runs after the svg has
 * left the document.
 */
export function interruptTransitions(node: BaseType | null | undefined): void {
  if (!(node instanceof Element)) return;
  interruptNode(node);
  for (const child of node.querySelectorAll('*')) {
    interruptNode(child);
  }
}
