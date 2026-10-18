# `@internetmatt/design-tokens`

Shared design tokens (CSS custom properties + TypeScript helpers). **Existing package** — not a greenfield Tailwind / design-system invent.

## Source of truth

| Asset | Path |
| --- | --- |
| Canonical YAML | `tokens.yaml` (package-local; TW-1 extract-ready) |
| Generated CSS / TS | `src/tokens.css`, `src/tokens.ts` |

Edit `tokens.yaml`, then:

```bash
npm ci
npm run build
```

## Usage

```ts
import { token, TOKENS_CSS_IMPORT } from '@internetmatt/design-tokens';
// CSS: import '@internetmatt/design-tokens/tokens.css'
token('colors.primary.default'); // → 'var(--colors-primary-default)'
```

### Runtime loading

```ts
import { getTokenValue, loadDesignTokens } from '@internetmatt/design-tokens/runtime';

const tokens = await loadDesignTokens('/tokens.yaml');
getTokenValue(tokens, 'colors.primary.default'); // → '#0078D4'
```

The loader preserves nested mappings and sequences in `.yaml` / `.yml` sources
using `js-yaml` with `JSON_SCHEMA` (dates remain strings). YAML must contain a
single mapping; malformed YAML and duplicate keys reject with the source and
parser error, retained as `error.cause`. Object inputs are returned unchanged,
and other URLs continue to use JSON parsing.

Run the runtime regression tests with `npm test`.

## Standalone artifacts

`npm run build` generates tokens from package-local `tokens.yaml`, then compiles
JavaScript and declarations into `dist/`. Exported root/runtime modules work in
plain Node ESM and browser bundlers without a TypeScript loader. Import CSS
through your app's stylesheet pipeline. The YAML asset is exported as
`@internetmatt/design-tokens/tokens.yaml` for consumer-controlled loading.

```bash
npm ci --ignore-scripts
npm test
npm run test:package
npm pack
# In a different project:
npm install --ignore-scripts /path/to/internetmatt-design-tokens-1.0.0.tgz
```

The package test installs the actual tarball into an isolated temporary consumer,
runs root/runtime JavaScript with production dependencies, validates nested YAML
and malformed input, resolves CSS, and compiles strict NodeNext declarations.
Publication remains a separate authorized action.

## License

MIT

