# usequery-server-solidjs

Server-side query management library for SolidJS with caching, invalidation, and reactive state synchronization.

## Verify

`mise run check`: frozen install, Biome, TypeScript, tests, and the ESM/CJS/type builds.

CI uses the same command plus actionlint, zizmor, and strict Renovate validation. The required gate is `check`.

## Stack

Follows https://github.com/BlackDark/agent-presets/blob/main/stack/core.md.

Deviations:
- Existing Solid 1.x stays; do not migrate the library to React or Solid 2 as part of maintenance.
- Bun is the runtime and package manager. This is a library, so dependency ranges stay unpinned by `:pinVersions`.

## Map

- `src/`: library source.
- `tests/`: Bun tests.
- `dist/`: generated ESM, CJS, and declarations; build, never hand-edit.

## Git

- Conventional Commits, one topic per PR.
- Squash unless commits need separate review.
- Force-push only with `--force-with-lease` on own branches.

## Boundaries

- Tools come from `mise.toml`; no global installs.
- Do not publish npm packages or create release tags from a local session.
