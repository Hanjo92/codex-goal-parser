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

## Status

`codex-goal-parser` has now completed its first reliability roadmap and is ready for broader real-world use as a planning helper.

Highlights in the current release line:

- automatic repo detection when running inside a project
- clearer output controls with `--output` and `--output-file`
- richer repo-context ingestion for validation, structure, and framework hints
- stronger goal-type heuristics with broad-objective narrowing
- file-based planning inputs via `--issue-file` and `--context-file`
- documented JSON output contract and fixture-based automated tests

**Inputs**
- a large user objective
- repository context
- optional constraints

**Outputs**
- a structured goal plan
- compact `/goal` commands that Codex can execute one by one

## Install

From npm after publish:

```bash
npm install -g codex-goal-parser
```

From source while developing:

```bash
git clone https://github.com/Hanjo92/codex-goal-parser.git
cd codex-goal-parser
npm install
npm link
```

## Quick start

Run the basic example:

```bash
npm run example
```

Run the repo-aware release example:

```bash
npm run example:release
```

Run the automated tests:

```bash
npm test
```

Run the CLI directly with your own objective:

```bash
node ./src/index.js \
  --objective "Migrate this old Node service to a cleaner TypeScript structure and make it safe to deploy." \
  --repo-context "Node service with package.json, README, and deployment scripts." \
  --constraints "Do not rewrite unrelated modules. Keep validation explicit." \
  --output markdown
```

If you're already inside a project repo, it can inspect the current directory automatically:

```bash
node ./src/index.js \
  --objective "Prepare this project for a safe public release." \
  --constraints "Do not change runtime behavior unless needed." \
  --output markdown
```

You can still point at a specific repo explicitly:

```bash
node ./src/index.js \
  --objective "Prepare this project for a safe public release." \
  --repo-path . \
  --constraints "Do not change runtime behavior unless needed." \
  --output markdown
```

For JSON output:

```bash
node ./src/index.js \
  --objective "Refactor this service safely." \
  --repo-path . \
  --output json
```

To write the generated plan directly to disk:

```bash
node ./src/index.js \
  --objective "Prepare this project for a safe public release." \
  --output markdown \
  --output-file ./plans/release-plan.md
```

You can also drive planning from an issue/spec workflow:

```bash
node ./src/index.js \
  --issue-file ./docs/issue-notes.md \
  --context-file ./docs/architecture.md \
  --context-file ./docs/release-spec.md \
  --repo-path . \
  --output markdown
```

If `--objective` is omitted, the CLI will try to derive it from the first issue/context document.

After `npm link`, you can use it like a normal command:

```bash
codex-goal-parser --objective "Refactor this service safely." --output markdown
```

## Example output

A shortened real example for a release-readiness objective:

```md
## Final objective
Prepare this project for a safe public release.

## Recommended sub-goals
1. Audit release readiness
2. Close release gaps
3. Verify the release path
4. Document and finalize release readiness
```

The full generated output also includes done conditions, validation steps, and ready-to-run `/goal` commands for each step.

For machine-readable integrations, use `--output json` and see [`docs/output-contract.md`](docs/output-contract.md).

## Repo-aware context ingest

When `--repo-path` is provided — or when you run the CLI inside a repo without passing repo context explicitly — the CLI currently looks at:

- `README.md`
- `package.json`
- `pyproject.toml`
- `Makefile`
- top-level file names
- highlighted source / test / docs / deploy directories
- a shallow directory tree
- common file extension counts
- test/config hints
- likely validation commands from scripts or Make targets
- lightweight language/framework signals from repo structure
- external issue/spec/architecture notes passed with `--issue-file` / `--context-file`

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
- `tests/` — fixture-based CLI tests

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

## Roadmap status

The first reliability roadmap is complete:

- [x] CLI ergonomics and output handling
- [x] Better repo-context ingestion
- [x] Better heuristic quality and splitting behavior
- [x] Richer input sources like issues/specs/docs
- [x] Structured output contract and tests

## Next steps

1. add more representative planning examples and fixtures
2. expand repo ingestion to more languages and deployment layouts
3. keep refining heuristics with real-world planning transcripts
4. decide whether to add a more explicit typed planning core over time
