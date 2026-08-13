---
name: verify-root-causes-before-filing
description: Always read implementation code to verify root causes before filing issues—catches shared causes and secondary issues that symptom-based triage would miss
metadata:
  type: feedback
---

**Rule:** Always read the actual implementation code to verify root causes before filing issues, don't just transcribe symptoms from findings or error messages.

**Why:** In a 3-bug Storybook render-audit batch, reading the code revealed:
1. Bugs #1 (PieChart NaN) and #2 (BarChart negative/NaN) shared the same root cause (SVG width/height parsing), even though the symptoms looked independent — would have been filed as two separate issues without code inspection
2. Bug #3 (Network "node not found") had a secondary root cause (edgeDef.sourceKey/targetKey defined but never used) that explained the broader API fragility, not just the immediate fixture mismatch
3. Symptoms (e.g. "translate(NaN,NaN)") don't reveal where the NaN originated — tracing through the code did

**How to apply:** After searching for duplicates, before writing the issue body, read the relevant files and trace through the exact code path that produces the reported error. Confirm that your root-cause hypothesis matches what the code actually does. This adds 10–15 minutes per issue but prevents filing stale/incomplete issues that miss the real problem.
