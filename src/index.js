#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.next', '.turbo', 'coverage']);

function parseArgs(argv) {
  const args = {
    format: 'markdown',
    objective: '',
    repoContext: '',
    constraints: '',
    repoPath: '',
    outputFile: '',
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
      case '--output':
        args.format = argv[++i] ?? 'markdown';
        break;
      case '--output-file':
        args.outputFile = argv[++i] ?? '';
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
      --output         Alias for --format
      --output-file    Write the generated plan to a file
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

function listVisibleEntries(rootPath) {
  try {
    return fs.readdirSync(rootPath, { withFileTypes: true })
      .filter((entry) => !entry.name.startsWith('.') && !IGNORED_DIRS.has(entry.name));
  } catch {
    return [];
  }
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function formatList(label, items, maxItems = 6) {
  const picked = unique(items).slice(0, maxItems);
  return picked.length ? `${label}: ${picked.join(', ')}` : '';
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
    const validationScripts = scripts.filter((name) => /^(test|lint|build|check|verify|typecheck|ci|smoke)/.test(name));
    if (validationScripts.length) parts.push(`validation scripts: ${validationScripts.slice(0, 6).join(', ')}`);
    const deps = pkg.dependencies ? Object.keys(pkg.dependencies) : [];
    if (deps.length) parts.push(`dependencies: ${deps.slice(0, 6).join(', ')}`);
    const devDeps = pkg.devDependencies ? Object.keys(pkg.devDependencies) : [];
    const toolHints = [];
    if (deps.includes('react') || devDeps.includes('react')) toolHints.push('react');
    if (deps.includes('next') || devDeps.includes('next')) toolHints.push('nextjs');
    if (deps.includes('express')) toolHints.push('express');
    if (devDeps.includes('typescript') || deps.includes('typescript')) toolHints.push('typescript');
    if (deps.includes('vite') || devDeps.includes('vite')) toolHints.push('vite');
    if (devDeps.includes('vitest')) toolHints.push('vitest');
    if (devDeps.includes('jest')) toolHints.push('jest');
    if (toolHints.length) parts.push(`js stack: ${unique(toolHints).join(', ')}`);
    return parts.join('; ');
  } catch {
    return '';
  }
}

function buildShallowTree(rootPath, maxDepth = 2, maxEntries = 24) {
  const lines = [];
  let count = 0;

  function walk(currentPath, depth, prefix = '') {
    if (depth > maxDepth || count >= maxEntries) return;

    let entries = [];
    try {
      entries = fs.readdirSync(currentPath, { withFileTypes: true })
        .filter((entry) => !entry.name.startsWith('.') && !IGNORED_DIRS.has(entry.name))
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
      if (entry.name.startsWith('.') || IGNORED_DIRS.has(entry.name)) continue;
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
    'vitest.config.js',
    'jest.config.js',
    'jest.config.ts',
    'pytest.ini',
    'playwright.config.ts',
    'playwright.config.js',
    'cypress.config.ts',
    'cypress.config.js',
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(rootPath, candidate))) hints.push(candidate);
  }

  return hints.join(', ');
}

function summarizeImportantDirectories(rootPath) {
  const entries = listVisibleEntries(rootPath).filter((entry) => entry.isDirectory());
  const buckets = {
    source: ['src', 'app', 'lib', 'server', 'client', 'packages'],
    tests: ['test', 'tests', '__tests__', 'e2e', 'spec'],
    docs: ['docs', 'examples'],
    deploy: ['scripts', 'deploy', 'docker'],
  };

  const parts = [];
  for (const [label, names] of Object.entries(buckets)) {
    const found = names.filter((name) => fs.existsSync(path.join(rootPath, name)));
    if (found.length) parts.push(`${label} dirs: ${found.join(', ')}`);
  }

  const grouped = new Set(Object.values(buckets).flat());
  const remaining = entries
    .map((entry) => entry.name)
    .filter((name) => !grouped.has(name))
    .slice(0, 6);
  if (remaining.length) parts.push(`other dirs: ${remaining.join(', ')}`);

  return parts.join('. ');
}

function detectProjectSignals(rootPath) {
  const files = [
    'tsconfig.json', 'jsconfig.json', 'vite.config.ts', 'vite.config.js', 'next.config.js', 'next.config.mjs',
    'docker-compose.yml', 'docker-compose.yaml', 'Dockerfile', 'requirements.txt', 'poetry.lock',
    'tox.ini', 'pytest.ini', 'pyproject.toml', 'go.mod', 'Cargo.toml', 'Gemfile'
  ];

  const found = files.filter((name) => fs.existsSync(path.join(rootPath, name)));
  if (fs.existsSync(path.join(rootPath, '.github', 'workflows'))) found.push('.github/workflows');
  return formatList('project signals', found, 8);
}

function detectLanguageFrameworkHints(rootPath) {
  const hints = [];
  if (fs.existsSync(path.join(rootPath, 'package.json'))) hints.push('node');
  if (fs.existsSync(path.join(rootPath, 'tsconfig.json'))) hints.push('typescript');
  if (fs.existsSync(path.join(rootPath, 'pyproject.toml')) || fs.existsSync(path.join(rootPath, 'requirements.txt'))) hints.push('python');
  if (fs.existsSync(path.join(rootPath, 'go.mod'))) hints.push('go');
  if (fs.existsSync(path.join(rootPath, 'Cargo.toml'))) hints.push('rust');
  if (fs.existsSync(path.join(rootPath, 'next.config.js')) || fs.existsSync(path.join(rootPath, 'next.config.mjs'))) hints.push('nextjs');
  if (fs.existsSync(path.join(rootPath, 'vite.config.ts')) || fs.existsSync(path.join(rootPath, 'vite.config.js'))) hints.push('vite');
  if (fs.existsSync(path.join(rootPath, 'Dockerfile')) || fs.existsSync(path.join(rootPath, 'docker-compose.yml')) || fs.existsSync(path.join(rootPath, 'docker-compose.yaml'))) hints.push('docker');
  return formatList('language/framework hints', hints, 8);
}

function detectValidationSignals(rootPath) {
  const parts = [];
  const pkgRaw = readFileIfExists(path.join(rootPath, 'package.json'), 4000);
  if (pkgRaw) {
    try {
      const pkg = JSON.parse(pkgRaw);
      const scripts = Object.keys(pkg.scripts || {});
      const validation = scripts.filter((name) => /^(test|lint|build|check|verify|typecheck|ci|smoke)/.test(name));
      if (validation.length) parts.push(`validation commands: npm run ${validation.slice(0, 5).join(', npm run ')}`);
    } catch {
      // ignore parse failures
    }
  }

  const makefile = readFileIfExists(path.join(rootPath, 'Makefile'));
  if (makefile) {
    const targets = makefile
      .split('\n')
      .filter((line) => /^(test|lint|build|check|verify|ci|smoke|release)[A-Za-z0-9_-]*:/.test(line))
      .map((line) => line.split(':')[0]);
    if (targets.length) parts.push(`make validation: ${targets.slice(0, 6).join(', ')}`);
  }

  const configHints = [
    'vitest.config.ts', 'vitest.config.js', 'jest.config.js', 'jest.config.ts', 'pytest.ini',
    'playwright.config.ts', 'playwright.config.js', 'cypress.config.ts', 'cypress.config.js'
  ].filter((name) => fs.existsSync(path.join(rootPath, name)));
  if (configHints.length) parts.push(`validation config: ${configHints.slice(0, 6).join(', ')}`);

  return parts.join('. ');
}

function looksLikeProjectRepo(repoPath) {
  const resolved = path.resolve(repoPath);
  if (!fs.existsSync(resolved)) return false;

  const strongSignals = ['.git', 'package.json', 'pyproject.toml'];
  if (strongSignals.some((name) => fs.existsSync(path.join(resolved, name)))) return true;

  const softSignals = ['README.md', 'Makefile', 'src', 'app', 'lib', 'docs', 'examples'];
  const score = softSignals.reduce((count, name) => count + Number(fs.existsSync(path.join(resolved, name))), 0);
  return score >= 2;
}

function resolveRepoPath(args) {
  if (args.repoPath) return args.repoPath;
  if (args.repoContext) return '';
  return looksLikeProjectRepo(process.cwd()) ? process.cwd() : '';
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

  const importantDirs = summarizeImportantDirectories(resolved);
  if (importantDirs) summaries.push(importantDirs);

  const tree = buildShallowTree(resolved);
  if (tree.length) summaries.push(`shallow tree: ${tree.join(', ')}`);

  const extensions = summarizeFileExtensions(resolved);
  if (extensions) summaries.push(`file types: ${extensions}`);

  const testHints = detectTestHints(resolved);
  if (testHints) summaries.push(`test hints: ${testHints}`);

  const validationSignals = detectValidationSignals(resolved);
  if (validationSignals) summaries.push(validationSignals);

  const projectSignals = detectProjectSignals(resolved);
  if (projectSignals) summaries.push(projectSignals);

  const languageHints = detectLanguageFrameworkHints(resolved);
  if (languageHints) summaries.push(languageHints);

  return summaries.join('. ');
}

function cleanSentence(text) {
  return text.trim().replace(/\s+/g, ' ').replace(/[.\s]+$/, '');
}

function classifyObjective(objective) {
  const lower = objective.toLowerCase();
  const rules = {
    migration: [
      [/(migrat|port|upgrade|convert|move to|switch to)/, 3],
      [/(typescript|python 3|new stack|new framework|new runtime|new architecture)/, 2],
    ],
    refactor: [
      [/(refactor|restructur|rewrite|clean up|simplif|modulari|untangle)/, 3],
      [/(maintainab|readab|separat.*concern|tech debt|legacy structure)/, 2],
    ],
    release: [
      [/(deploy|release|publish|ship|launch|distribut)/, 3],
      [/(packag|version|changelog|docs for users|release note|ci|build pipeline)/, 2],
    ],
    stabilization: [
      [/(fix|stabil|repair|debug|regression|incident|broken|failure|bug)/, 3],
      [/(crash|flaky|error|timeout|failing test|production issue)/, 2],
    ],
    documentation: [
      [/(document|readme|docs|guide|tutorial|reference)/, 3],
      [/(onboard|usage note|setup instruction)/, 2],
    ],
  };

  const scores = Object.entries(rules).map(([kind, entries]) => ({
    kind,
    score: entries.reduce((sum, [regex, weight]) => sum + (regex.test(lower) ? weight : 0), 0),
  }));

  scores.sort((a, b) => b.score - a.score);
  return scores[0]?.score > 0 ? scores[0].kind : 'generic';
}

function isBroadObjective(objective) {
  const lower = objective.toLowerCase();
  const broadSignals = [
    /end[- ]to[- ]end/,
    /from scratch/,
    /entire|whole|full platform|complete system/,
    /and .* and .* and /,
    /(migrate|refactor|release|fix).*(and|while also).*(migrate|refactor|release|fix)/,
    /(frontend|backend|api|database)/,
  ];

  const signalCount = broadSignals.reduce((count, regex) => count + Number(regex.test(lower)), 0);
  const wordCount = lower.split(/\s+/).filter(Boolean).length;
  return signalCount >= 2 || wordCount >= 22;
}

function buildPhaseTemplates(kind, broadObjective = false) {
  const templates = {
    migration: [
      {
        title: 'Audit the current system',
        why: 'establish the current runtime, data flow, and migration risks before moving anything',
        scope: 'identify the live entry points, migration seams, and compatibility constraints only',
        doneWhen: 'the current architecture, risky dependencies, and first safe migration slice are named explicitly',
        validate: 'reviewing entry points, configs, interfaces, and the highest-risk runtime paths',
        commandLead: 'Audit the current system for this migration',
      },
      {
        title: broadObjective ? 'Choose the first migration slice' : 'Define the target structure',
        why: broadObjective ? 'shrink the migration to one executable slice before changing code' : 'set the destination layout, boundaries, and success criteria for the migration',
        scope: broadObjective ? 'pick one service, layer, or user path as the first migration checkpoint' : 'define target modules, contracts, and coexistence rules for old vs new structure',
        doneWhen: broadObjective ? 'one migration slice is chosen with clear boundaries and out-of-scope areas' : 'the target structure and cutover rules are concrete enough to execute without drift',
        validate: broadObjective ? 'checking that the chosen slice can be completed without needing the whole migration at once' : 'checking that the target modules, interfaces, and rollback expectations are explicit',
        commandLead: broadObjective ? 'Choose the first migration slice for this objective' : 'Define the target migration structure for this objective',
      },
      {
        title: 'Migrate the first critical path',
        why: 'move the most important or safest vertical slice first without losing expected behavior',
        scope: 'touch only the selected runtime path and the minimum supporting files it requires',
        doneWhen: 'the chosen migration slice works in the new structure and the old/new boundary is still understandable',
        validate: 'running the most relevant build, test, or smoke path that exercises the migrated slice',
        commandLead: 'Migrate the first critical path without breaking expected behavior',
      },
      {
        title: 'Verify the migrated slice and capture next cuts',
        why: 'prove the migrated path works and leave the next safe migration steps obvious',
        scope: 'finish only verification, cleanup directly tied to the migrated slice, and next-step notes',
        doneWhen: 'the migrated slice is verified and the next migration cuts are documented without reopening the whole plan',
        validate: 'running the final verification path and checking for unresolved migration risks around the changed boundary',
        commandLead: 'Verify the migrated slice and leave the next cuts clear',
      },
    ],
    refactor: [
      {
        title: 'Audit the current implementation',
        why: 'understand the tangled boundaries, duplication, and fragile areas before restructuring code',
        scope: 'inspect only the modules, tests, and interfaces most relevant to the refactor target',
        doneWhen: 'the main structural pain points and the safest first refactor boundary are explicit',
        validate: 'reviewing the affected modules, calling paths, and guardrail tests before edits',
        commandLead: 'Audit the current implementation for this refactor',
      },
      {
        title: broadObjective ? 'Choose the first refactor boundary' : 'Define the target refactor shape',
        why: broadObjective ? 'reduce a broad cleanup into one bounded structural checkpoint' : 'decide the target structure and keep the refactor bounded',
        scope: broadObjective ? 'pick one component, layer, or dependency seam to refactor first' : 'define target responsibilities, interfaces, and what will remain unchanged',
        doneWhen: broadObjective ? 'one refactor boundary is selected with explicit non-goals' : 'the target responsibilities and stop conditions are concrete enough to execute safely',
        validate: broadObjective ? 'checking that the boundary can be changed without requiring a repo-wide rewrite' : 'checking that the target interfaces, responsibilities, and preserved behavior are explicit',
        commandLead: broadObjective ? 'Choose the first refactor boundary for this objective' : 'Define the target refactor shape for this objective',
      },
      {
        title: 'Refactor the critical path',
        why: 'make the highest-value structural change while keeping observable behavior stable',
        scope: 'change only the selected module boundary, support code, and tests needed for that checkpoint',
        doneWhen: 'the targeted structure is in place and the critical path still behaves as expected',
        validate: 'running the most relevant test, build, or smoke path for the changed modules',
        commandLead: 'Refactor the critical path without breaking expected behavior',
      },
      {
        title: 'Verify the refactor and trim leftovers',
        why: 'prove the new structure works and remove only the rough edges created by this checkpoint',
        scope: 'finish verification and limited cleanup directly tied to the chosen refactor boundary',
        doneWhen: 'the checkpoint is verified, behavior is preserved, and leftover debt is clearly called out',
        validate: 'running the final verification path and checking the new structure matches the stated refactor goal',
        commandLead: 'Verify the refactor and leave the checkpoint clean',
      },
    ],
    release: [
      {
        title: 'Audit release readiness',
        why: 'identify the real blockers across build, packaging, docs, and delivery before trying to ship',
        scope: 'inspect release-critical scripts, metadata, docs, and distribution assumptions only',
        doneWhen: 'the exact release blockers and the first shippable checkpoint are clearly listed',
        validate: 'reviewing the build path, package metadata, release docs, and distribution steps end to end',
        commandLead: 'Audit release readiness for this repository',
      },
      {
        title: broadObjective ? 'Pick the first shippable release checkpoint' : 'Close release blockers',
        why: broadObjective ? 'reduce a broad launch goal into one releaseable checkpoint' : 'address the missing pieces that actually block a safe release',
        scope: broadObjective ? 'choose one artifact, platform, or packaging path to make shippable first' : 'fix only the build, packaging, docs, or metadata gaps that block release',
        doneWhen: broadObjective ? 'one release checkpoint is chosen with explicit ship criteria and deferred work' : 'the release blockers for this checkpoint are closed without widening scope',
        validate: broadObjective ? 'checking that the checkpoint could ship independently if the rest were deferred' : 'checking that packaging, metadata, docs, and release prerequisites are explicit and complete',
        commandLead: broadObjective ? 'Pick the first shippable release checkpoint for this objective' : 'Close release blockers for this objective',
      },
      {
        title: 'Verify the release path',
        why: 'prove the artifact can actually be built, validated, and prepared for users',
        scope: 'run only the build, packaging, and smoke validation needed for the chosen release checkpoint',
        doneWhen: 'the chosen release path succeeds end to end or the remaining blocker is isolated precisely',
        validate: 'running the build, packaging, and smoke path that most closely matches the real release flow',
        commandLead: 'Verify the release path and keep it production-minded',
      },
      {
        title: 'Document final release readiness',
        why: 'leave the release state obvious to the next human or agent instead of implied',
        scope: 'finish only release-facing notes, versioning details, and directly related polish',
        doneWhen: 'the release checkpoint is documented with any deferred work and known risks called out',
        validate: 'checking that the documented release steps match the validated build and packaging flow',
        commandLead: 'Document final release readiness and remaining risk',
      },
    ],
    stabilization: [
      {
        title: 'Reproduce and bound the problem',
        why: 'make sure the failure mode, impact, and trigger are understood before changing code',
        scope: 'focus on the broken path, logs, tests, and conditions needed to make the issue concrete',
        doneWhen: 'the failure mode, blast radius, and likely trigger are explicit instead of guessed',
        validate: 'reproducing the problem from logs, tests, or a minimal failing path when possible',
        commandLead: 'Reproduce and bound the problem for this issue',
      },
      {
        title: broadObjective ? 'Choose the first fix boundary' : 'Identify the likely fix path',
        why: broadObjective ? 'reduce a messy bugfix into one tractable failing path first' : 'pin down the area most likely to solve the issue with minimal collateral change',
        scope: broadObjective ? 'pick one failing path, root-cause area, or regression boundary to fix first' : 'narrow to the smallest code path that can address the failure safely',
        doneWhen: broadObjective ? 'one failing path is selected with explicit non-goals and suspected root cause' : 'the likely root cause and safest fix boundary are concrete enough to implement',
        validate: broadObjective ? 'checking that the chosen fix boundary is smaller than the total incident surface' : 'checking that the suspected root cause fits the observed failure and affected scope',
        commandLead: broadObjective ? 'Choose the first fix boundary for this objective' : 'Identify the likely fix path for this objective',
      },
      {
        title: 'Implement the fix on the critical path',
        why: 'apply the smallest meaningful fix where it matters most and avoid unrelated cleanup',
        scope: 'change only the failing path, essential guardrails, and directly related tests',
        doneWhen: 'the broken path is fixed and the regression surface has not widened',
        validate: 'running the failing test, targeted smoke path, or the most direct regression check for the issue',
        commandLead: 'Implement the fix on the critical path without unrelated edits',
      },
      {
        title: 'Verify stability and capture residual risk',
        why: 'confirm the issue is addressed and make any remaining uncertainty explicit',
        scope: 'finish targeted verification and note only the risks that still matter after the fix',
        doneWhen: 'the issue is verified closed for the tested path and remaining edge cases are documented',
        validate: 'running the targeted regression checks and reviewing whether adjacent paths need follow-up',
        commandLead: 'Verify stability and capture any residual risk',
      },
    ],
    documentation: [
      {
        title: 'Audit the current docs state',
        why: 'understand what already exists and what is missing or misleading',
        scope: 'inspect the relevant docs, examples, and setup flow only',
        doneWhen: 'the missing or misleading docs path is explicit',
        validate: 'reviewing the existing docs against the real setup or usage path',
        commandLead: 'Audit the current docs state for this repository',
      },
      {
        title: 'Define the target documentation shape',
        why: 'decide the sections and level of detail needed',
        scope: 'set the docs outline, intended reader, and non-goals for this pass',
        doneWhen: 'the target docs shape is concrete enough to write without drift',
        validate: 'checking that the intended reader, sections, and usage path are explicit',
        commandLead: 'Define the target documentation shape for this objective',
      },
      {
        title: 'Write the most important docs path',
        why: 'cover the setup, usage, or maintenance path the user needs most',
        scope: 'write only the highest-value docs path and examples needed for it',
        doneWhen: 'the primary docs path is complete enough for a real reader to follow',
        validate: 'walking the documented path against the repo structure and commands',
        commandLead: 'Write the most important docs path and keep it accurate',
      },
      {
        title: 'Validate and polish the docs',
        why: 'make sure the docs match the repo and are safe to follow',
        scope: 'finish consistency fixes and polish directly tied to the documented path',
        doneWhen: 'the documented path matches the repo and obvious reader confusion is removed',
        validate: 'checking commands, file names, links, and examples against the actual repo',
        commandLead: 'Validate and polish the docs before stopping',
      },
    ],
    generic: [
      {
        title: 'Audit the current state',
        why: 'understand the current repository and the parts that matter for the objective',
        scope: 'inspect only the repo areas directly relevant to the objective',
        doneWhen: 'the current state and first useful checkpoint are clearly summarized',
        validate: 'reviewing the repo structure, scripts, configs, and any key docs',
        commandLead: 'Audit the current state for this repository',
      },
      {
        title: broadObjective ? 'Choose the first bounded checkpoint' : 'Define the target checkpoint',
        why: broadObjective ? 'reduce a vague objective into one tractable checkpoint before implementation' : 'turn the vague objective into a bounded intermediate target',
        scope: broadObjective ? 'pick one milestone, path, or artifact that can stand alone as the first checkpoint' : 'define what this checkpoint will change and what it will not touch',
        doneWhen: broadObjective ? 'one checkpoint is chosen with explicit boundaries, dependencies, and non-goals' : 'the checkpoint is concrete enough to execute without major ambiguity',
        validate: broadObjective ? 'checking that the checkpoint can finish without requiring the whole objective at once' : 'checking that the target structure, boundaries, and success criteria are explicit',
        commandLead: broadObjective ? 'Choose the first bounded checkpoint for this objective' : 'Define the target checkpoint for this objective',
      },
      {
        title: 'Implement the critical path',
        why: 'make the main change needed to move the objective forward',
        scope: 'change only the files and checks needed for the chosen checkpoint',
        doneWhen: 'the main checkpoint change is implemented and its critical path works',
        validate: 'running the most relevant build, test, or smoke path for the changed area',
        commandLead: 'Implement the critical path without widening scope',
      },
      {
        title: 'Validate and finalize the checkpoint',
        why: 'prove the result and leave a clear next state',
        scope: 'finish only final verification and polish directly tied to the checkpoint',
        doneWhen: 'the checkpoint is verified complete and the next state is obvious',
        validate: 'running the final verification path and checking that the result matches the stated objective',
        commandLead: 'Validate and finalize the checkpoint before stopping',
      },
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
    .filter(Boolean)
    .map((segment) => {
      if (segment.startsWith('README summary:') && segment.length > 120) {
        return `${segment.slice(0, 117).replace(/[\s,;:.]+$/, '')}...`;
      }
      if (segment.length > 90) {
        return `${segment.slice(0, 87).replace(/[\s,;:.]+$/, '')}...`;
      }
      return segment;
    });

  const priorities = ['README summary', 'package ', 'validation scripts:', 'validation commands:', 'make validation:', 'js stack:', 'language/framework hints:', 'project signals:', 'source dirs:', 'tests dirs:', 'test hints:', 'pyproject:', 'make targets:', 'file types:', 'top-level files:', 'shallow tree:'];
  const picked = [];

  for (const priority of priorities) {
    const match = segments.find((segment) => segment.startsWith(priority));
    if (match && !picked.includes(match)) picked.push(match);
  }

  for (const segment of segments) {
    if (picked.length >= 6) break;
    if (!picked.includes(segment)) picked.push(segment);
  }

  const accepted = [];
  let total = 0;

  for (const segment of picked) {
    const nextLength = total === 0 ? segment.length : total + 2 + segment.length;
    if (nextLength > maxChars) continue;
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
  const broadObjective = isBroadObjective(cleanObjective);
  const phases = buildPhaseTemplates(kind, broadObjective);

  const subGoals = phases.map((goal) => ({
    title: goal.title,
    why: goal.why,
    scope: goal.scope,
    done_when: goal.doneWhen,
    validate_with: goal.validate,
    goal_command: buildGoalCommand(goal, cleanObjective, repoContext, constraints),
  }));

  const compactContext = compactRepoContext(repoContext);
  const notes = [
    'Prefer sequential execution; later goals assume the earlier checkpoint is complete.',
    broadObjective
      ? 'This objective looked broad, so the plan deliberately narrows to one first checkpoint before wider implementation.'
      : 'If a sub-goal still feels too vague in practice, split it again before execution.',
    compactContext ? `Repo context summary: ${sentenceOrFallback(compactContext, '')}` : 'No repo context summary was available.',
    constraints ? `Applied constraints: ${sentenceOrFallback(constraints, '')}` : 'No extra constraints were provided.',
  ];

  return {
    final_objective: cleanObjective ? `${cleanObjective}.` : 'Define a clear final objective before running goal mode.',
    repo_context_summary: compactContext,
    objective_type: kind,
    broad_objective: broadObjective,
    sub_goals: subGoals,
    execution_order: subGoals.map((goal, index) => `${index + 1}. ${goal.title}`),
    notes,
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

const format = (args.format || 'markdown').toLowerCase();
if (!['markdown', 'json'].includes(format)) {
  console.error(`Unsupported output format: ${args.format}`);
  process.exit(1);
}

const resolvedRepoPath = resolveRepoPath(args);
const fileDerivedContext = buildRepoContextFromPath(resolvedRepoPath);
const mergedRepoContext = [args.repoContext, fileDerivedContext].filter(Boolean).join('. ');
const plan = buildPlan(args.objective, mergedRepoContext, args.constraints);
const rendered = format === 'json' ? JSON.stringify(plan, null, 2) : toMarkdown(plan);

if (args.outputFile) {
  const outputPath = path.resolve(args.outputFile);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, rendered, 'utf8');
  console.log(`Wrote ${format} plan to ${outputPath}`);
} else {
  console.log(rendered);
}
