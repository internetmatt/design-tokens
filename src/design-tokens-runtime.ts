/**
 * Re-exports from the declarative-ui design-tokens runtime.
 * Kept here so consumers only need @internetmatt/design-tokens.
 */
export type { DesignTokens, TokenValue } from '../../declarative-ui/src/runtime/design-tokens';
export {
  loadDesignTokens,
  applyDesignTokens,
  designTokensToCSS,
  getTokenValue,
  getTokenVariable,
  validateDesignTokens,
} from '../../declarative-ui/src/runtime/design-tokens';
