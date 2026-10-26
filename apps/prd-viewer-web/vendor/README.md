# Pinned uRK runtime

The homepage uses unmodified build output from `eonhive/urk` main commit
[`8fb03fbb9e09b2cdb432fe51da3f72cda67476ff`](https://github.com/eonhive/urk/commit/8fb03fbb9e09b2cdb432fe51da3f72cda67476ff), inspected October 26, 2026.

These are private web-app dependencies, not dependencies of any PRD format,
validator, packager, CLI, or viewer-core package. The published npm versions
available during implementation (`@urk/core` 0.1.2 and `@urk/adapters` 0.1.4)
do not expose the inspected motion/audio entry points. Local tarballs keep this
checkout installable without absolute paths into a sibling repository or
uncommitted sibling changes.

| Archive | SHA-256 |
| --- | --- |
| `urk-core-0.2.0.tgz` | `3b7f604bd88d7e0edb3d74350de250e03f55b696dc7cd43e297342cd3d12c8ac` |
| `urk-adapters-0.2.0.tgz` | `7c669b670969543ddde2d4f29d811d7eca2a8bd26e975f24ce9819d76ddd40ec` |

To update deliberately, check out an exact upstream commit in a clean directory,
install its declared development dependencies, and compile `packages/core` then
`packages/adapters` with TypeScript. Run `npm pack` in each of those package
directories with this directory as `--pack-destination`. The initial artifacts
were compiled using TypeScript 5.9.3 and packaged using npm on Node 22.22.2.
Record the new commit, versions, and archive hashes here; reinstall the PRD
workspace and run the homepage runtime tests and hosted build. Generated source
maps refer to the corresponding upstream `src/` paths.

Replace these snapshots with official published packages once matching public
exports are released. Do not expand these archives with local uRK development.
