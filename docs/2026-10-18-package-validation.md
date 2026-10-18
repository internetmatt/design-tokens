# Standalone artifact validation — 18 October 2026

Baseline: `1add3d3c1196094dd0833807d743aaffbfe67448`.
Public npm package lookup returned HTTP 404; no GitHub releases or open PRs
were returned. This establishes public-registry status only.

The baseline packed root fails in a separate production consumer on Node
24.19.0 with `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`. Source-checkout
runtime tests did not catch installation behavior under node_modules.

The fix compiles ESM JavaScript and declarations, uses explicit `.js` imports,
ships CSS/YAML assets, builds during prepack, and removes fallback reads outside
the package. The lockfile pins the standalone build dependencies.

Validation on Node 24.19.0 / npm 11.9.0:

- `npm test`: 17 runtime tests passed.
- `npm run test:package`: plain Node root/runtime imports, nested YAML,
  malformed YAML, CSS resolution and strict NodeNext declarations passed in a
  clean consumer with production dependencies and empty npm configuration.
- A combined installed consumer with declarative-ui and flow-canvas passed
  browser CSS bundling and strict declarations.
- `git diff --check` passed.

CI is configured for Node 20 and 24; Node 20 was not executed locally.
Version 1.0.0 is an unpublished artifact candidate, not a registry release.
No registry publication or visibility change was performed.
