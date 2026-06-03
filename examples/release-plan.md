# Sample: release-readiness planning

## Input objective

Prepare this project for a safe public release without changing runtime behavior unless necessary.

## Example repo context

- README exists but may be incomplete
- package.json has runnable scripts
- the repo has a small CLI entrypoint
- release metadata and validation flow need review

## Example decomposition

### Final objective

Prepare the project for a safe public release with clear validation and minimal release risk.

### Recommended sub-goals

1. **Audit release readiness**
   - Why: identify the current build, validation, documentation, and metadata state before making release changes
   - Scope: inspect README, package metadata, scripts, and release-critical files only
   - Done when: release blockers, missing metadata, and validation gaps are clearly listed
   - Validate with: repo structure review plus package/script inspection
   - Command: `/goal Audit release readiness for this repository. Read README.md, package.json, and release-critical files first. Do not change runtime behavior yet. Validate by summarizing release blockers, metadata gaps, and the available verification commands. Stop when the release-readiness picture is clear enough to plan the next checkpoint.`

2. **Close the highest-priority release gaps**
   - Why: remove the most important blockers before doing final verification
   - Scope: address release metadata, docs, and other directly relevant gaps; avoid unrelated cleanup
   - Done when: the main release blockers are resolved or intentionally deferred with notes
   - Validate with: direct file inspection and targeted command checks
   - Command: `/goal Close the highest-priority release gaps for this project. Use the release-readiness audit first. Limit changes to metadata, docs, and directly relevant release blockers unless a small code fix is necessary. Validate by checking that the biggest blockers are resolved or explicitly documented. Stop when the project is ready for final release verification.`

3. **Verify the release path end to end**
   - Why: a project is not really release-ready until the important checks pass
   - Scope: run the most relevant verification path for build, usage, and release confidence
   - Done when: the final verification path passes and the release state is credible
   - Validate with: build/test/smoke-check commands plus README sanity review
   - Command: `/goal Verify the release path end to end for this project. Read the updated README and package scripts first. Do not add unrelated improvements. Validate by running the most relevant build, smoke-test, or usage checks and checking that the documented release flow matches reality. Stop when the release verification passes and the final release state is trustworthy.`
