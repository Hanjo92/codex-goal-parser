import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const cliPath = path.join(repoRoot, 'src', 'index.js');
const fixturesRoot = path.join(repoRoot, 'tests', 'fixtures');

function runCli(args, options = {}) {
  const stdout = execFileSync('node', [cliPath, ...args], {
    cwd: options.cwd || repoRoot,
    encoding: 'utf8',
  });
  return stdout.trim();
}

function runJson(args, options = {}) {
  return JSON.parse(runCli([...args, '--output', 'json'], options));
}

function runCliResult(args, options = {}) {
  return spawnSync('node', [cliPath, ...args], {
    cwd: options.cwd || repoRoot,
    encoding: 'utf8',
  });
}

test('json output follows the documented contract', () => {
  const plan = runJson(['--objective', 'Prepare this project for a safe public release.', '--repo-path', '.']);

  assert.equal(plan.contract_version, '1.0.0');
  assert.equal(plan.plan_format, 'codex-goal-plan');
  assert.equal(plan.objective_type, 'release');
  assert.equal(typeof plan.broad_objective, 'boolean');
  assert.ok(Array.isArray(plan.sub_goals));
  assert.ok(plan.sub_goals.length >= 4);
  assert.deepEqual(Object.keys(plan.sub_goals[0]), ['title', 'why', 'scope', 'done_when', 'validate_with', 'goal_command']);
});

test('broad objectives narrow to a first slice/checkpoint', () => {
  const plan = runJson(['--objective', 'Refactor the frontend and backend, migrate the database layer, and prepare the entire platform for release.']);

  assert.equal(plan.broad_objective, true);
  assert.match(plan.sub_goals[1].title, /(Choose|Pick) the first/);
});

test('repo ingest surfaces validation and framework hints', () => {
  const fixtureRepo = path.join(fixturesRoot, 'sample-repo');
  const plan = runJson(['--objective', 'Refactor this service safely.', '--repo-path', fixtureRepo]);

  assert.match(plan.repo_context_summary, /validation commands:/);
  assert.match(plan.repo_context_summary, /language\/framework hints:/);
  assert.match(plan.repo_context_summary, /(source dirs:|project signals:)/);
});

test('file-based planning inputs influence the plan and source metadata', () => {
  const plan = runJson([
    '--issue-file', path.join(fixturesRoot, 'release-issue.md'),
    '--context-file', path.join(fixturesRoot, 'architecture.md'),
    '--repo-path', path.join(fixturesRoot, 'sample-repo'),
  ]);

  assert.equal(plan.final_objective, 'Release prep issue.');
  assert.equal(plan.input_sources.length, 2);
  assert.match(plan.repo_context_summary, /issue release-issue\.md:/);
  assert.match(plan.repo_context_summary, /context architecture\.md:/);
  assert.match(plan.notes.at(-1), /Planning sources:/);
});

test('markdown output keeps the expected human-readable sections', () => {
  const output = runCli(['--objective', 'Fix the flaky production sync bug that causes timeouts and failed retries.', '--repo-path', '.']);

  assert.match(output, /# Goal Plan/);
  assert.match(output, /## Final objective/);
  assert.match(output, /## Recommended sub-goals/);
  assert.match(output, /Command: `\/goal/);
});

test('options that require values reject a following flag as missing input', () => {
  const result = runCliResult(['--objective', '--output', 'json']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing value for --objective/);
  assert.equal(result.stdout, '');
});

test('repo path must be a directory', () => {
  const result = runCliResult(['--objective', 'Check invalid repo path', '--repo-path', 'package.json', '--output', 'json']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Repository path must be a directory/);
  assert.doesNotMatch(result.stderr, /ENOTDIR/);
});
