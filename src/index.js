#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = {
    format: 'markdown',
    objective: '',
    repoContext: '',
    constraints: '',
    repoPath: '',
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
      case '--repo-path':
      case '-p':
        args.repoPath = argv[++i] ?? '';
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
  -p, --repo-path      Repository path to inspect for common context files
  -f, --format         markdown (default) or json
  -h, --help           Show help
`);
}

function readFileIfExists(filePath, maxLength = 1200) {
  try {
    if (!fs.existsSync(filePath)) return '';
    const value = fs.readFileSync(filePath, 'utf8').trim();
    return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
  } catch {
    return '';
  }
}

function summarizePackageJson(pkgRaw) {
  if (!pkgRaw) return '';

  try {
    const pkg = JSON.parse(pkgRaw);
    const parts = [];
    if (pkg.name) parts.push(`package ${pkg.name}`);
    if (pkg.description) parts.push(`description: ${cleanSentence(pkg.description)}`);
    if (pkg.type) parts.push(`module type: ${pkg.type}`);
    const scripts = pkg.scripts ? Object.keys(pkg.scripts) : [];
    if (scripts.length) parts.push(`scripts: ${scripts.slice(0, 6).join(', ')}`);
    const deps = pkg.dependencies ? Object.keys(pkg.dependencies) : [];
    if (deps.length) parts.push(`dependencies: ${deps.slice(0, 6).join(', ')}`);
    return parts.join('; ');
  } catch {
    return '';
  }
}

function buildShallowTree(rootPath, maxDepth = 2, maxEntries = 24) {
  const lines = [];
  let count = 0;
  const ignore = new Set(['.git', 'node_modules', 'dist', 'build', '.next', '.turbo', 'coverage']);

  function walk(currentPath, depth, prefix = '') {
    if (depth > maxDepth || count >= maxEntries) return;

    let entries = [];
    try {
      entries = fs.readdirSync(currentPath, { withFileTypes: true })
        .filter((entry) => !entry.name.startsWith('.') && !ignore.has(entry.name))
        .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));
    } catch {
      return;
    }

    for (const entry of entries) {
      if (count >= maxEntries) break;
      const marker = entry.isDirectory() ? '/' : '';
      lines.push(`${prefix}${entry.name}${marker}`);
      count += 1;
      if (entry.isDirectory()) {
        walk(path.join(currentPath, entry.name), depth + 1, `${prefix}${entry.name}/`);
      }
    }
  }

  walk(rootPath, 1);
  return lines;
}

function summarizeFileExtensions(rootPath, maxFiles = 120) {
  const counts = new Map();
  const ignore = new Set(['.git', 'node_modules', 'dist', 'build', '.next', '.turbo', 'coverage']);
  let seen = 0;

  function walk(currentPath, depth = 0) {
    if (depth > 3 || seen >= maxFiles) return;
    let entries = [];
    try {
      entries = fs.readdirSync(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (seen >= maxFiles) break;
      if (entry.name.startsWith('.') || ignore.has(entry.name)) continue;
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
      } else {
        const ext = path.extname(entry.name) || '[no-ext]';
        counts.set(ext, (counts.get(ext) ?? 0) + 1);
        seen += 1;
      }
    }
  }

  walk(rootPath);

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([ext, count]) => `${ext}:${count}`)
    .join(', ');
}

function detectTestHints(rootPath) {
  const hints = [];
  const candidates = [
    'test',
    'tests',
    '__tests__',
    'vitest.config.ts',
    'jest.config.js',
    'pytest.ini',
    'playwright.config.ts',
    'cypress.config.ts',
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(rootPath, candidate))) hints.push(candidate);
  }

  return hints.join(', ');
}

function buildRepoContextFromPath(repoPath) {
  if (!repoPath) return '';

  const resolved = path.resolve(repoPath);
  if (!fs.existsSync(resolved)) return '';

  const summaries = [];
  summaries.push(`repo path: ${resolved}`);

  const readme = readFileIfExists(path.join(resolved, 'README.md'));
  if (readme) {
    const firstParagraph = readme.split('\n').filter(Boolean).slice(0, 3).join(' ');
    summaries.push(`README summary: ${cleanSentence(firstParagraph)}`);
  }

  const pkgSummary = summarizePackageJson(readFileIfExists(path.join(resolved, 'package.json'), 4000));
  if (pkgSummary) summaries.push(pkgSummary);

  const pyproject = readFileIfExists(path.join(resolved, 'pyproject.toml'));
  if (pyproject) {
    const preview = pyproject.split('\n').filter(Boolean).slice(0, 8).join(' ');
    summaries.push(`pyproject: ${cleanSentence(preview)}`);
  }

  const makefile = readFileIfExists(path.join(resolved, 'Makefile'));
  if (makefile) {
    const targets = makefile
      .split('\n')
      .filter((line) => /^[A-Za-z0-9_-]+:/.test(line))
      .map((line) => line.split(':')[0])
      .slice(0, 8);
    if (targets.length) summaries.push(`make targets: ${targets.join(', ')}`);
  }

  const files = fs.readdirSync(resolved).filter((entry) => !entry.startsWith('.')).slice(0, 20);
  if (files.length) summaries.push(`top-level files: ${files.join(', ')}`);

  const tree = buildShallowTree(resolved);
  if (tree.length) summaries.push(`shallow tree: ${tree.join(', ')}`);

  const extensions = summarizeFileExtensions(resolved);
  if (extensions) summaries.push(`file types: ${extensions}`);

  const testHints = detectTestHints(resolved);
  if (testHints) summaries.push(`test hints: ${testHints}`);

  return summaries.join('. ');
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

function compactRepoContext(repoContext, maxChars = 320) {
  if (!repoContext) return '';

  const segments = repoContext
    .split('. ')
    .map((segment) => cleanSentence(segment))
    .filter(Boolean);

  const priorities = ['README summary', 'package ', 'scripts:', 'pyproject:', 'make targets:', 'test hints:', 'file types:', 'top-level files:', 'shallow tree:'];
  const picked = [];

  for (const priority of priorities) {
    const match = segments.find((segment) => segment.startsWith(priority));
    if (match && !picked.includes(match)) picked.push(match);
  }

  for (const segment of segments) {
    if (picked.length >= 4) break;
    if (!picked.includes(segment)) picked.push(segment);
  }

  const accepted = [];
  let total = 0;

  for (const segment of picked) {
    const nextLength = total === 0 ? segment.length : total + 2 + segment.length;
    if (nextLength > maxChars) break;
    accepted.push(segment);
    total = nextLength;
  }

  if (!accepted.length && picked.length) {
    return `${picked[0].slice(0, Math.max(40, maxChars - 3)).replace(/[\s,;:.]+$/, '')}...`;
  }

  return accepted.join('. ');
}

function buildGoalCommand(goal, objective, repoContext, constraints) {
  const compactContext = compactRepoContext(repoContext);
  const contextPart = compactContext
    ? ` Read this repo context first: ${sentenceOrFallback(compactContext, '')}`
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

  const compactContext = compactRepoContext(repoContext);

  return {
    final_objective: cleanObjective ? `${cleanObjective}.` : 'Define a clear final objective before running goal mode.',
    repo_context_summary: compactContext,
    sub_goals: subGoals,
    execution_order: subGoals.map((goal, index) => `${index + 1}. ${goal.title}`),
    notes: [
      'Split any sub-goal again if its done condition still feels vague in practice.',
      'Prefer sequential execution; later goals assume the earlier checkpoint is complete.',
      compactContext ? `Repo context summary: ${sentenceOrFallback(compactContext, '')}` : 'No repo context summary was available.',
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

const fileDerivedContext = buildRepoContextFromPath(args.repoPath);
const mergedRepoContext = [args.repoContext, fileDerivedContext].filter(Boolean).join('. ');
const plan = buildPlan(args.objective, mergedRepoContext, args.constraints);

if (args.format === 'json') {
  console.log(JSON.stringify(plan, null, 2));
} else {
  console.log(toMarkdown(plan));
}
