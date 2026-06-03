# codex-goal-parser

A small repo-aware CLI for turning a large software objective into a sequence of compact, verifiable Codex `/goal` tasks.

## Why

Codex goal mode works best when the target is clear, bounded, and verifiable.
Big goals often fail because they are too vague, too broad, or missing a stopping condition.

This project helps bridge that gap by converting one large objective into a short chain of smaller goals that are easier for Codex to execute reliably.

## What it generates

Given a large objective and some repository context, it generates:

- a one-sentence final objective
- 3-7 smaller sequential goals
- done conditions for each goal
- validation steps for each goal
- ready-to-run `/goal ...` commands

## Current scope

The current version focuses on planning, not execution.

**Inputs**
- a large user objective
- repository context
- optional constraints

**Outputs**
- a structured goal plan
- compact `/goal` commands that Codex can execute one by one

## Quick start

```bash
npm install
node ./src/index.js \
  --objective "Migrate this old Node service to a cleaner TypeScript structure and make it safe to deploy." \
  --repo-context "Node service with package.json, README, and deployment scripts." \
  --constraints "Do not rewrite unrelated modules. Keep validation explicit." \
  --format markdown
```

Or let it inspect a repo directly:

```bash
node ./src/index.js \
  --objective "Prepare this project for a safe public release." \
  --repo-path . \
  --constraints "Do not change runtime behavior unless needed." \
  --format markdown
```

For JSON output:

```bash
node ./src/index.js \
  --objective "Refactor this service safely." \
  --repo-path . \
  --format json
```

## Repo-aware context ingest

When `--repo-path` is provided, the CLI currently looks at:

- `README.md`
- `package.json`
- `pyproject.toml`
- `Makefile`
- top-level file names
- a shallow directory tree
- common file extension counts
- simple test/config hints

The generated `/goal` commands use a compressed version of that context so they stay readable instead of becoming bloated.

## Example use cases

- break a refactor into goal-mode checkpoints
- plan a migration as a chain of `/goal` runs
- turn a repo cleanup effort into testable phases
- derive goal-mode commands from a README, issue, or repo structure
- prepare a release plan with validation checkpoints

## Project structure

- `docs/` — design notes and spec
- `examples/` — sample inputs and outputs
  - `sample-plan.md` — migration-style decomposition
  - `release-plan.md` — release-readiness decomposition
- `prompts/` — reusable prompts for Codex or Claude
- `src/` — CLI implementation

## Design principles

- Prefer small verifiable goals over ambitious vague ones
- Preserve dependency order
- Keep each goal bounded to one checkpoint
- Treat validation as mandatory
- Avoid producing an oversized backlog
- Compress repo context instead of dumping raw structure into every command

## Related projects

- [`codex-goal-decomposer`](https://clawhub.ai) — ClawHub/OpenClaw skill for turning large goals into smaller goal-mode tasks
- [`lazyGithub`](https://github.com/Hanjo92/lazyGithub) — helper project for publishing GitHub repos with README and About metadata filled properly

## Next steps

1. tighten the phase heuristics by objective type
2. create more example transformations
3. expand repo ingestion to more file types and smarter code/test signal extraction
4. decide whether to keep prompt-first or add typed planning logic
