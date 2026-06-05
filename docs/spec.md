# Spec

## Goal

Convert a high-level software objective into a short chain of smaller Codex `/goal` tasks that are clear, ordered, and verifiable.

## Inputs

- `--objective`: the large objective to decompose
- `--repo-context`: optional human-written repository context
- `--constraints`: optional boundaries, non-goals, or validation requirements
- `--repo-path`: optional repository path to inspect for context
- `--issue-file`: repeatable issue or task note file
- `--context-file`: repeatable supporting spec, architecture, or planning file
- `--output` / `--format`: `markdown` or `json`
- `--output-file`: optional file path for the generated plan

If `--objective` is omitted, the CLI tries to derive one from the first issue or context file.

## Repository Context

When a repository path is available, the CLI summarizes lightweight project signals:

- `README.md`
- `package.json`
- `pyproject.toml`
- `Makefile`
- top-level files
- source, test, docs, and deployment directories
- shallow directory tree
- common file extensions
- validation commands and test/config hints
- language and framework signals
- issue and context files supplied by the user

The generated `/goal` commands use a compressed context summary so the command remains readable.

## Outputs

Markdown output is intended for humans. JSON output is intended for tools and follows the contract in `docs/output-contract.md`.

Each generated plan includes:

1. `final_objective`
2. `sub_goals[]`
   - `title`
   - `why`
   - `scope`
   - `done_when`
   - `validate_with`
   - `goal_command`
3. `execution_order[]`
4. `notes[]`

## Planning Rules

- Produce 3-7 sub-goals by default.
- Preserve dependency order.
- Prefer one focused checkpoint per sub-goal.
- Include a done condition for every sub-goal.
- Include a validation method for every sub-goal.
- Include a stop condition in every generated `/goal` command.
- Narrow broad objectives to a first bounded slice before implementation.
- Keep unrelated follow-up work out of the current checkpoint.

## Objective Types

The current implementation uses lightweight heuristics to choose one of these plan families:

- `migration`
- `refactor`
- `release`
- `stabilization`
- `documentation`
- `generic`

The type affects the sub-goal templates and validation language. It does not execute code or call an LLM.

## Error Handling

The CLI should fail with a concise user-facing error when:

- an option that requires a value is missing that value
- `--output` / `--format` is not `markdown` or `json`
- an explicit `--repo-path` does not exist
- an explicit `--repo-path` is not a directory

## Current Scope

`codex-goal-parser` is a deterministic planning helper. It does not execute the generated goals, modify repositories, or call remote services.
