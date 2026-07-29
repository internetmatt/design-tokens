# `@internetmatt/design-tokens`

Shared design tokens (CSS custom properties + TypeScript helpers). **Existing package** — not a greenfield Tailwind / design-system invent.

## Source of truth

| Asset | Path |
| --- | --- |
| Canonical YAML | `tokens.yaml` (package-local; TW-1 extract-ready) |
| Legacy mirror | `.projecto/config/design-tokens.yaml` (warns if it drifts) |
| Generated CSS / TS | `src/tokens.css`, `src/tokens.ts` |

Edit `tokens.yaml`, then:

```bash
pnpm --filter @internetmatt/design-tokens build
```

## Usage

```ts
import { token, TOKENS_CSS_IMPORT } from '@internetmatt/design-tokens';
// CSS: import '@internetmatt/design-tokens/tokens.css'
token('colors.primary.default'); // → 'var(--colors-primary-default)'
```

## Publish / extract (TW-1)

- **In-monorepo CI:** `.github/workflows/internetmatt-ui-packages-ci.yml`
- **Extract plan:** `docs/superpowers/plans/2026-07-24-tw-1-design-tokens-declarative-ui-publish.md`
- **Standalone scaffold:** `tools/ui-packages-extract/`
- **Host kit stays** `@projecto/ui` in Projecto (`libs/ui`) — this package is consumed by the host kit and Sites.

Dry-run pack (no registry write):

```bash
pnpm --filter @internetmatt/design-tokens pack:dry
```

## License

MIT
