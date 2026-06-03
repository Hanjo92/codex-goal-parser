# codex-goal-parser

A small project for turning a large coding objective into a sequence of Codex-friendly `/goal` tasks.

## Why

Codex goal mode works best when the target is clear, bounded, and verifiable.
Big goals often fail because they are too vague, too broad, or missing a stopping condition.

This project is meant to help with that.

## Core idea

Given a large objective and a repository context, generate:

- a one-sentence final objective
- 3-7 smaller sequential goals
- done conditions for each goal
- validation steps for each goal
- ready-to-run `/goal ...` commands

## First version scope

The initial version should focus on planning, not execution.

Inputs:
- a large user objective
- repository context
- optional constraints

Outputs:
- a structured goal plan
- compact `/goal` commands that Codex can execute one by one

## Project structure

- `docs/` — design notes and spec
- `examples/` — sample inputs and outputs
- `prompts/` — reusable prompts for Codex or Claude
- `src/` — future parser/orchestrator code

## Design principles

- Prefer small verifiable goals over ambitious vague ones
- Preserve dependency order
- Keep each goal bounded to one checkpoint
- Treat validation as mandatory
- Avoid producing an oversized backlog

## Early use cases

- break a refactor into goal mode checkpoints
- plan a migration as a chain of `/goal` runs
- turn a repo cleanup effort into testable phases
- derive goal mode commands from a README, issue, or repo structure

## Next steps

1. define the planning schema
2. create prompt templates
3. create example transformations
4. decide whether the first implementation is prompt-only or code-assisted
