---
name: codex-goal-parser
description: Turn broad software objectives, issues, specs, or repository cleanup requests into compact, verifiable Codex /goal plans. Use when the user wants to decompose a large coding objective into ordered goal-mode tasks, generate ready-to-run /goal commands, or create a repo-aware implementation plan with done conditions and validation steps.
---

# Codex Goal Parser

Use this skill to convert a large software objective into a short sequence of bounded Codex `/goal` tasks.

## Workflow

1. Decide whether goal decomposition is useful.
   - Use it for broad implementation, migration, refactor, release, stabilization, or documentation objectives.
   - If the task is already small enough for one focused coding pass, say that goal mode is unnecessary unless the user explicitly wants a plan.
2. Gather only the needed inputs.
   - Objective: the user's desired outcome.
   - Constraints: non-goals, validation requirements, risk boundaries, or time limits.
   - Repo path: prefer the current repository path when available.
   - Issue/spec/context files: pass them when the user points to local files.
3. Run the bundled CLI from this skill.
   - Resolve paths relative to this `SKILL.md`.
   - Use markdown output for human-readable plans.
   - Use JSON output only when another tool or script needs structured data.
4. Return the generated plan or a concise summary of it.
   - Do not execute the generated `/goal` commands unless the user asks.
   - Keep the plan sequential; later goals should assume earlier checkpoints are complete.

## Commands

Basic repo-aware markdown plan:

```bash
node scripts/codex-goal-parser.js \
  --objective "Prepare this project for a safe public release." \
  --repo-path . \
  --output markdown
```

With constraints:

```bash
node scripts/codex-goal-parser.js \
  --objective "Refactor this service safely." \
  --repo-path . \
  --constraints "Do not change runtime behavior unless needed." \
  --output markdown
```

From issue/spec files:

```bash
node scripts/codex-goal-parser.js \
  --issue-file ./docs/issue-notes.md \
  --context-file ./docs/architecture.md \
  --repo-path . \
  --output markdown
```

For machine-readable output:

```bash
node scripts/codex-goal-parser.js \
  --objective "Refactor this service safely." \
  --repo-path . \
  --output json
```

## References

- Read `references/output-contract.md` when producing or consuming JSON output.
- Read `references/codex-goal-decompose.md` when the user wants a reusable prompt instead of running the CLI.

## Notes

- The bundled CLI is deterministic and does not call remote services.
- It requires Node.js 18 or newer.
- It plans work only; it does not modify repositories.
