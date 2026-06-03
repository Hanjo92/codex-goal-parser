# Sample

## Input objective

Migrate this old Node service to a cleaner TypeScript structure and make it safe to deploy.

## Example decomposition

### Final objective

Migrate the service to a maintainable TypeScript structure that builds cleanly, passes validation, and is ready for deployment.

### Recommended sub-goals

1. **Inventory the current service structure**
   - Why: establish the current moving parts before refactoring
   - Scope: inspect source layout, scripts, runtime assumptions, and build flow
   - Done when: the current architecture, entry points, and deployment-critical files are summarized
   - Validate with: file tree review plus package scripts/config inspection
   - Command: `/goal Audit the current service structure in this repo. Read README.md, package.json, tsconfig files, and the source tree first. Do not change code yet. Validate by producing a concise summary of entry points, scripts, and deployment-critical files. Stop when the architecture and migration risks are clearly documented.`

2. **Create the TypeScript target structure**
   - Why: define the destination before moving logic
   - Scope: add or refine TypeScript config, folders, and build assumptions
   - Done when: the target structure and build path are defined and committed locally
   - Validate with: config inspection and successful dry-run build setup
   - Command: `/goal Define the TypeScript target structure for this repo. Read the current architecture summary and existing config files first. Keep runtime behavior unchanged. Validate by ensuring the repo has a coherent TypeScript structure and a documented build path. Stop when the target layout and config are ready for code migration.`

3. **Migrate core modules without changing behavior**
   - Why: move the main logic into the new structure safely
   - Scope: migrate the most important runtime modules first
   - Done when: the core modules compile under the new structure and behavior-critical paths still work
   - Validate with: build/test commands or equivalent smoke checks
   - Command: `/goal Migrate the core runtime modules into the new TypeScript structure without changing intended behavior. Read the migration plan and existing module boundaries first. Validate by running the relevant build and smoke-test commands. Stop when the migrated modules compile and the core path still works.`

4. **Harden deployment readiness**
   - Why: make the migration releasable instead of merely compilable
   - Scope: deployment config, documentation, and final checks
   - Done when: deployment assumptions are documented and deployment-critical validation passes
   - Validate with: build/test/deploy-prep commands and README review
   - Command: `/goal Prepare this migrated service for deployment. Review deployment configs, scripts, environment assumptions, and README first. Do not introduce unrelated refactors. Validate by passing deployment-critical checks and documenting the release path. Stop when the service is deployment-ready and the final validation checklist passes.`
