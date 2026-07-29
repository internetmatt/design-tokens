/**
 * build-tokens.mjs — generates src/tokens.css (+ tokens.ts) from the package YAML.
 *
 * Canonical source (TW-1 / extract-ready): libs/design-tokens/tokens.yaml
 * Fallback (legacy monorepo path): .projecto/config/design-tokens.yaml
 *
 * Run: node build-tokens.mjs
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { load } from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const PACKAGE_YAML = join(__dirname, 'tokens.yaml');
const MONOREPO_YAML = join(REPO_ROOT, '.projecto', 'config', 'design-tokens.yaml');
const YAML_PATH = existsSync(PACKAGE_YAML) ? PACKAGE_YAML : MONOREPO_YAML;
const OUT_CSS = join(__dirname, 'src', 'tokens.css');
const OUT_TS = join(__dirname, 'src', 'tokens.ts');

if (!existsSync(YAML_PATH)) {
  throw new Error(
    `design-tokens: missing tokens YAML (tried ${PACKAGE_YAML} and ${MONOREPO_YAML})`,
  );
}

if (
  existsSync(PACKAGE_YAML) &&
  existsSync(MONOREPO_YAML) &&
  readFileSync(PACKAGE_YAML, 'utf8') !== readFileSync(MONOREPO_YAML, 'utf8')
) {
  console.warn(
    `[design-tokens] WARNING: ${relative(REPO_ROOT, PACKAGE_YAML)} differs from ` +
      `${relative(REPO_ROOT, MONOREPO_YAML)}. Package-local YAML wins for build; sync them.`,
  );
}

const yaml = readFileSync(YAML_PATH, 'utf8');
const tokens = load(yaml);

// Flatten nested object into CSS variables
function flatten(obj, prefix = '') {
  const vars = [];
  for (const [key, value] of Object.entries(obj)) {
    const name = prefix ? `${prefix}-${kebab(key)}` : `--${kebab(key)}`;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      vars.push(...flatten(value, name));
    } else if (typeof value === 'string' || typeof value === 'number') {
      vars.push([name, String(value)]);
    }
  }
  return vars;
}

function kebab(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

mkdirSync(join(__dirname, 'src'), { recursive: true });

// Build :root CSS
const sections = {
  colors: tokens.colors || {},
  typography: tokens.typography || {},
  spacing: tokens.spacing || {},
  shadows: tokens.shadows || {},
  borderRadius: tokens.borderRadius || {},
  transitions: tokens.transitions || {},
  zIndex: tokens.zIndex || {},
  density: tokens.density || {},
};

let css = `/* Auto-generated from .projecto/config/design-tokens.yaml — do not edit directly */\n\n:root {\n`;
for (const [section, data] of Object.entries(sections)) {
  const prefix = `--${kebab(section)}`;
  const vars = flatten(data, prefix);
  if (vars.length === 0) continue;
  css += `\n  /* ${section} */\n`;
  for (const [name, val] of vars) {
    css += `  ${name}: ${val};\n`;
  }
}
css += `}\n\n`;

// Light theme
if (tokens.themes?.light) {
  css += `/* Light theme (default) */\n:root, [data-theme="light"] {\n`;
  for (const [name, val] of flatten(tokens.themes.light, '--theme')) {
    css += `  ${name}: ${val};\n`;
  }
  css += `}\n\n`;
}

// Dark theme
if (tokens.themes?.dark) {
  css += `[data-theme="dark"] {\n`;
  for (const [name, val] of flatten(tokens.themes.dark, '--theme')) {
    css += `  ${name}: ${val};\n`;
  }
  css += `}\n\n`;
}

// High contrast
if (tokens.themes?.highContrast) {
  css += `[data-theme="high-contrast"] {\n`;
  for (const [name, val] of flatten(tokens.themes.highContrast, '--theme')) {
    css += `  ${name}: ${val};\n`;
  }
  css += `}\n`;
}

writeFileSync(OUT_CSS, css, 'utf8');
console.log('wrote', OUT_CSS);

// Build TypeScript constants
const tsLines = [
  `/* Auto-generated from .projecto/config/design-tokens.yaml — do not edit directly */`,
  ``,
  `/** Import 'tokens.css' in your app entry to apply CSS variables globally. */`,
  `export const TOKEN_CSS_PATH = '@internetmatt/design-tokens/tokens.css';`,
  ``,
  `/** Typed token paths for getToken() lookups */`,
  `export type ColorToken = ${Object.keys(tokens.colors || {}).map(k => `'${k}'`).join(' | ')};`,
  ``,
  `/** Get a CSS variable reference string, e.g. var(--colors-primary-default) */`,
  `export function token(path: string): string {`,
  `  const name = '--' + path.replace(/\\./g, '-').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();`,
  `  return \`var(\${name})\`;`,
  `}`,
  ``,
  `export { applyDesignTokens, loadDesignTokens } from '../../../declarative-ui/src/runtime/design-tokens';`,
];

writeFileSync(OUT_TS, tsLines.join('\n') + '\n', 'utf8');
console.log('wrote', OUT_TS);
