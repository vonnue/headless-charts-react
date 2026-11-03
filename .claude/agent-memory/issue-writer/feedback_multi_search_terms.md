---
name: multi-search-duplicate-detection
description: Use multiple search terms to catch paraphrased duplicates; single keyword misses rewording
metadata:
  type: feedback
---

When searching for duplicate issues, use multiple search term angles to catch the same issue described with different wording.

**Why:** A single search ("isISO") will miss issues that describe the same bug using different vocabulary (e.g., "prop shape", "AxisConfig", "story file", "nested config"). With paraphrased rewording common in issue titles, narrow searches produce false negatives.

**How to apply:** For each bug finding, search at least 2–3 distinct angles:
- Symptom or component name ("AreaChart time")
- Technical term or error message ("isISO")
- Broader category if applicable ("AxisConfig", "story")
- File or region if it's a narrow issue ("AreaChart.time.stories")

Example from this session: searching only "isISO" found nothing relevant, but combined with "AreaChart time", "story", and "AxisConfig" confirmed no duplicate existed before filing #15.
