#!/usr/bin/env node

import fs from 'node:fs';

function parseArgs(argv) {
  const args = {
    format: 'markdown',
    objective: '',
    repoContext: '',
    constraints: '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--objective':
      case '-o':
        args.objective = argv[++i] ?? '';
        break;
      case '--repo-context':
      case '-r':
        args.repoContext = argv[++i] ?? '';
        break;
      case '--constraints':
      case '-c':
        args.constraints = argv[++i] ?? '';
        break;
      case '--format':
      case '-f':
        args.format = argv[++i] ?? 'markdown';
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        break;
    }
  }

  return args;
}

function printHelp() {
  console.log(`codex-goal-parser

Usage:
  codex-goal-parser --objective "..." [options]

Options:
  -o, --objective      Large objective to decompose
  -r, --repo-context   Short repo summary or context
  -c, --constraints    Constraints, boundaries, or validation notes
  -f, --format         markdown (default) or json
  -h, --help           Show help
`);
}

function cleanSentence(text) {
  return text.trim().replace(/\s+/g, ' ').replace(/[.\s]+$/, '');
}

function classifyObjective(objective) {
  const lower = objective.toLowerCase();

  if (/(migrat|port|upgrade|move)/.test(lower)) return 'migration';
  if (/(refactor|rewrite|restructur|clean up)/.test(lower)) return 'refactor';
  if (/(deploy|release|publish|ship)/.test(lower)) return 'release';
  if (/(fix|stabil|repair|debug)/.test(lower)) return 'stabilization';
  if (/(document|readme|docs)/.test(lower)) return 'documentation';

  return 'generic';
}

function buildPhaseTemplates(kind) {
  const templates = {
    migration: [
      ['Audit the current system', 'establish the current architecture, entry points, and migration risks before changing code'],
      ['Define the target structure', 'set the destination layout, boundaries, and success criteria for the migration'],
      ['Migrate the core path', 'move the most important runtime or product path first without losing expected behavior'],
      ['Validate and harden the result', 'prove the migrated path works and document remaining risks or rollout notes'],
    ],
    refactor: [
      ['Audit the current implementation', 'understand the current boundaries, pain points, and risk areas before refactoring'],
      ['Define the target refactor shape', 'decide the desired structure and keep the refactor bounded'],
      ['Refactor the critical path', 'make the highest-value structural change while keeping behavior stable'],
      ['Validate and finish the refactor', 'run checks and clean up the remaining rough edges relevant to the goal'],
    ],
    release: [
      ['Audit release readiness', 'identify the current build, deploy, and documentation state'],
      ['Close release gaps', 'address the missing pieces that block a safe release'],
      ['Verify the release path', 'prove the build, validation, and release flow work end to end'],
      ['Document and finalize release readiness', 'leave the project in a clearly releasable state'],
    ],
    stabilization: [
      ['Reproduce and bound the problem', 'make sure the failure mode and scope are understood before changing code'],
      ['Identify the likely fix path', 'pin down the area most likely to solve the issue with minimal collateral changes'],
      ['Implement the fix on the critical path', 'apply the fix where it matters most and avoid unrelated edits'],
      ['Validate stability and document remaining risk', 'confirm the issue is addressed and record anything still uncertain'],
    ],
    documentation: [
      ['Audit the current docs state', 'understand what already exists and what is missing or misleading'],
      ['Define the target documentation shape', 'decide the sections and level of detail needed'],
      ['Write the most important docs path', 'cover the setup, usage, or maintenance path the user needs most'],
      ['Validate and polish the docs', 'make sure the docs match the repo and are safe to follow'],
    ],
    generic: [
      ['Audit the current state', 'understand the current repository and the parts that matter for the objective'],
      ['Define the target checkpoint', 'turn the vague objective into a bounded intermediate target'],
      ['Implement the critical path', 'make the main change needed to move the objective forward'],
      ['Validate and finalize the checkpoint', 'prove the result and leave a clear next state'],
    ],
  };

  return templates[kind] ?? templates.generic;
}

function sentenceOrFallback(text, fallback) {
  const value = cleanSentence(text || '');
  return value ? `${value}.` : fallback;
}

function buildGoalCommand(goal, objective, repoContext, constraints) {
  const contextPart = repoContext
    ? ` Read the repo context first: ${sentenceOrFallback(repoContext, '')}`
    : '';
  const constraintsPart = constraints
    ? ` Respect these constraints: ${sentenceOrFallback(constraints, '')}`
    : '';

  return `/goal ${goal.commandLead}. Work toward this larger objective: ${sentenceOrFallback(objective, 'Complete the requested project goal.')}${contextPart}${constraintsPart} Validate by ${goal.validate}. Stop when ${goal.doneWhen}.`;
}

function buildPlan(objective, repoContext, constraints) {
  const cleanObjective = cleanSentence(objective);
  const kind = classifyObjective(cleanObjective);
  const phases = buildPhaseTemplates(kind);

  const subGoals = phases.map(([title, why], index) => {
    const order = index + 1;
    const scope = [
      order === 1 ? 'inspect the existing repo state and relevant docs/config' : 'focus only on the files and checks needed for this checkpoint',
      order < phases.length ? 'avoid unrelated polish outside this checkpoint' : 'capture only final polish directly tied to the goal',
    ].join('; ');

    const doneWhen = [
      order === 1
        ? 'the current state, risks, and next migration/refactor path are clearly summarized'
        : order === 2
          ? 'the target checkpoint is concrete enough to execute without major ambiguity'
          : order === 3
            ? 'the main change is implemented and the critical path works'
            : 'the relevant checks pass and the checkpoint is clearly complete',
    ][0];

    const validate = [
      order === 1
        ? 'reviewing the repo structure, scripts, configs, and any key docs'
        : order === 2
          ? 'checking that the target structure, boundaries, and success criteria are explicit'
          : order === 3
            ? 'running the most relevant build, test, or smoke-check path for the changed area'
            : 'running the final verification path and checking that the result matches the stated objective',
    ][0];

    const commandLead = [
      order === 1
        ? `${title} for this repository`
        : order === 2
          ? `${title} for this objective`
          : order === 3
            ? `${title} without breaking the expected behavior`
            : `${title} and leave the project in a verified state`,
    ][0];

    return {
      title,
      why,
      scope,
      doneWhen,
      validate,
      commandLead,
    };
  }).map((goal) => ({
    title: goal.title,
    why: goal.why,
    scope: goal.scope,
    done_when: goal.doneWhen,
    validate_with: goal.validate,
    goal_command: buildGoalCommand(goal, cleanObjective, repoContext, constraints),
  }));

  return {
    final_objective: cleanObjective ? `${cleanObjective}.` : 'Define a clear final objective before running goal mode.',
    sub_goals: subGoals,
    execution_order: subGoals.map((goal, index) => `${index + 1}. ${goal.title}`),
    notes: [
      'Split any sub-goal again if its done condition still feels vague in practice.',
      'Prefer sequential execution; later goals assume the earlier checkpoint is complete.',
      constraints ? `Applied constraints: ${sentenceOrFallback(constraints, '')}` : 'No extra constraints were provided.',
    ],
  };
}

function toMarkdown(plan) {
  const lines = [];
  lines.push('# Goal Plan', '');
  lines.push('## Final objective', '', plan.final_objective, '');
  lines.push('## Recommended sub-goals', '');

  plan.sub_goals.forEach((goal, index) => {
    lines.push(`${index + 1}. **${goal.title}**`);
    lines.push(`   - Why: ${goal.why}`);
    lines.push(`   - Scope: ${goal.scope}`);
    lines.push(`   - Done when: ${goal.done_when}`);
    lines.push(`   - Validate with: ${goal.validate_with}`);
    lines.push(`   - Command: \`${goal.goal_command}\``);
    lines.push('');
  });

  lines.push('## Suggested execution order', '');
  plan.execution_order.forEach((item) => lines.push(`- ${item}`));
  lines.push('', '## Notes', '');
  plan.notes.forEach((note) => lines.push(`- ${note}`));

  return lines.join('\n');
}

const args = parseArgs(process.argv.slice(2));

if (!args.objective) {
  printHelp();
  process.exit(1);
}

const plan = buildPlan(args.objective, args.repoContext, args.constraints);

if (args.format === 'json') {
  console.log(JSON.stringify(plan, null, 2));
} else {
  console.log(toMarkdown(plan));
}
