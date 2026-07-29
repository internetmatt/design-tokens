/* Auto-generated from .projecto/config/design-tokens.yaml — do not edit directly */

/** Import 'tokens.css' in your app entry to apply CSS variables globally. */
export const TOKEN_CSS_PATH = '@internetmatt/design-tokens/tokens.css';

/** Typed token paths for getToken() lookups */
export type ColorToken = 'primary' | 'secondary' | 'accent' | 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'background' | 'border' | 'interactive' | 'disabled';

/** Get a CSS variable reference string, e.g. var(--colors-primary-default) */
export function token(path: string): string {
  const name = '--' + path.replace(/\./g, '-').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  return `var(${name})`;
}

export { applyDesignTokens, loadDesignTokens } from '../../../declarative-ui/src/runtime/design-tokens';
