# Codex goal decomposition prompt

```text
Break this large objective into a short sequence of Codex `/goal` tasks.

Requirements:
- restate the final objective in one sentence
- produce 3-7 smaller goals
- preserve dependency order
- every goal must have a clear done condition
- every goal must include a validation method
- every goal must end with a concrete stopping condition
- generate a ready-to-run `/goal ...` command for each goal
- if a goal is still too vague, split it further before finishing
- if the whole task is too small for goal mode, say so

Output format:
1. Final objective
2. Recommended sub-goals
3. Suggested execution order
4. Notes / risks
```
