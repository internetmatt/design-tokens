/* Auto-generated — do not edit directly. Run: node libs/design-tokens/build-tokens.mjs */

/** Import tokens.css at your app entry point to load all CSS custom properties */
export const TOKENS_CSS_IMPORT = '@internetmatt/design-tokens/tokens.css';

/**
 * Build a CSS var() reference from a dot-path.
 * token('colors.primary.default') → 'var(--colors-primary-default)'
 */
export function token(path: string): string {
  const name = '--' + path
    .replace(/\./g, '-')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
  return `var(${name})`;
}

/** Spacing shorthand — token('spacing.md') */
export const t = token;

export * from './design-tokens-runtime';
