# Spec

## Goal

Convert a high-level software objective into a chain of smaller Codex `/goal` tasks.

## Inputs

- `objective`: the big thing the user wants
- `repo_context`: repository files, docs, metadata, or summaries
- `constraints` (optional): things not to change, time limits, required validation, etc.

## Outputs

A plan with:

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

## Rules

- Produce 3-7 sub-goals by default
- Split again if a sub-goal has no clear done condition
- Prefer goals that fit one focused session
- Every sub-goal must have a validation method
- The generated `/goal` command must include a stop condition
- If the input is too vague, ask for one missing decision
- If the task is too small, recommend not using goal mode

## Repository context sources

Possible future inputs:

- `README.md`
- `package.json`
- `pyproject.toml`
- issue text
- architecture notes
- test commands
- file tree summaries

## First implementation options

### Option A — Prompt-first

Just generate high-quality decomposition prompts and examples.

Pros:
- fast to ship
- useful immediately

Cons:
- less deterministic
- weaker structured output guarantees

### Option B — Structured parser

Build a small tool that accepts objective + repo summary and emits a typed plan.

Pros:
- easier to integrate later
- more consistent outputs

Cons:
- more design work upfront

## Current direction

Start with prompt-first artifacts and examples, then layer structured parsing if needed.
