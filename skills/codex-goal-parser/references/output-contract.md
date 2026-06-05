# Output contract

`codex-goal-parser --output json` emits a stable plan object for downstream tools.

## Contract version

- `contract_version`: `1.0.0`
- `plan_format`: `codex-goal-plan`

## Top-level fields

- `contract_version` — version of this JSON contract
- `plan_format` — fixed discriminator for this plan shape
- `final_objective` — normalized final objective sentence
- `repo_context_summary` — compact summary used to keep generated `/goal` commands readable
- `objective_type` — one of `migration`, `refactor`, `release`, `stabilization`, `documentation`, `generic`
- `broad_objective` — whether the planner narrowed the goal into a first slice/checkpoint first
- `input_sources` — file paths supplied with `--issue-file` / `--context-file`
- `sub_goals` — ordered list of executable planning checkpoints
- `execution_order` — human-readable ordered list derived from `sub_goals`
- `notes` — additional planning guidance and source disclosure

## `sub_goals[]`

Each sub-goal contains:

- `title`
- `why`
- `scope`
- `done_when`
- `validate_with`
- `goal_command`

## Stability notes

- New fields may be added in future minor releases, but existing fields in `1.x` should remain compatible.
- Consumers should key off `contract_version` and `plan_format` before assuming exact behavior.
- Markdown output is human-oriented; JSON output is the supported integration format.

## Example

```json
{
  "contract_version": "1.0.0",
  "plan_format": "codex-goal-plan",
  "final_objective": "Prepare this project for a safe public release.",
  "repo_context_summary": "README summary: ...",
  "objective_type": "release",
  "broad_objective": false,
  "input_sources": [],
  "sub_goals": [
    {
      "title": "Audit release readiness",
      "why": "identify the real blockers across build, packaging, docs, and delivery before trying to ship",
      "scope": "inspect release-critical scripts, metadata, docs, and distribution assumptions only",
      "done_when": "the exact release blockers and the first shippable checkpoint are clearly listed",
      "validate_with": "reviewing the build path, package metadata, release docs, and distribution steps end to end",
      "goal_command": "/goal Audit release readiness for this repository ..."
    }
  ],
  "execution_order": [
    "1. Audit release readiness"
  ],
  "notes": [
    "Prefer sequential execution; later goals assume the earlier checkpoint is complete."
  ]
}
```
