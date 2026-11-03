---
name: feedback_deliverable_must_survive_memory_save_turn
description: A Stop-hook-triggered memory-save turn must not be the only content of a final response when a substantive deliverable was already produced — the coordinator reads the LAST message as the result
type: feedback
---

**Mistake:** After delivering the full spec document for issue #7 (Shared
Contract + 4 per-chart sections) in one turn, a `Stop hook feedback` prompt
fired asking me to save agent memory. I responded to that hook with a turn
containing *only* a description of the memory files I wrote — no restatement
or reference to the deliverable itself. The coordinator's next message was a
correction: "Your last response only described memory entries... didn't
include the actual spec document." I had to re-output the entire spec in
full in the following turn.

**Why this happened:** I treated the Stop-hook memory-save nudge as a small
side-task appended after the "real" work was already done and visible. But
the coordinator/orchestrator only reads the agent's *final* message as the
result of the invocation — it does not reach back into earlier turns to
recover a deliverable. A turn that only contains memory bookkeeping reads,
from the outside, as if the deliverable was never produced at all.

**How to apply going forward:** whenever a Stop/SubagentStop hook asks for a
memory save (or any other trailing housekeeping step) *after* a deliverable
has already been produced in this session:
- Do the memory save, but do not let it stand alone as the final message.
- Either re-include the deliverable in that same final response, or
  explicitly and clearly reference that it was already delivered in full
  above in a way that makes it unambiguous the coordinator already has it —
  when in doubt (as here, where the deliverable is long and the coordinator
  explicitly asked for it "in full, as markdown text"), just repeat it in
  full rather than gesturing at a prior turn.
- Treat "save memory" and "deliver the requested artifact" as two separate
  obligations that both need to be visibly satisfied in whatever message is
  actually last, since only the last message is assumed to represent the
  outcome of the task.
