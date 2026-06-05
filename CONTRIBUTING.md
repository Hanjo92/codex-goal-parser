# Contributing

Thanks for helping improve `codex-goal-parser`.

## Local setup

```bash
npm install
npm test
npm run smoke
```

## Development guidelines

- Keep CLI behavior deterministic and dependency-light.
- Prefer small, verifiable changes.
- Add or update tests for behavior changes and bug fixes.
- Keep generated `/goal` commands compact enough to paste into Codex.
- Run `npm pack --dry-run` when changing package metadata or published files.

## Pull requests

Include a short summary, verification commands, and any remaining risks or follow-up work.
