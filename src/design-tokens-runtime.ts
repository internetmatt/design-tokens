/**
 * Re-exports the design-tokens runtime (source of truth lives here).
 * Kept here so consumers only need @internetmatt/design-tokens.
 */
export type { DesignTokens, TokenValue } from './runtime';
export {
  loadDesignTokens,
  applyDesignTokens,
  designTokensToCSS,
  getTokenValue,
  getTokenVariable,
  validateDesignTokens,
} from './runtime';
