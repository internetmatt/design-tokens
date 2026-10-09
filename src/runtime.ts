/**
 * Design Tokens Runtime - Apply and manage design tokens at runtime
 * 
 * Loads design-tokens.yaml and applies to DOM/React components
 */

import { JSON_SCHEMA, load } from 'js-yaml';

export interface DesignTokens {
  colors?: Record<string, any>;
  typography?: Record<string, any>;
  spacing?: Record<string, any>;
  shadows?: Record<string, any>;
  borderRadius?: Record<string, any>;
  breakpoints?: Record<string, any>;
  transitions?: Record<string, any>;
  themes?: Record<string, Record<string, any>>;
  components?: Record<string, any>;
  metadata?: {
    name?: string;
    version?: string;
    description?: string;
  };
}

export type TokenValue = string | number | Record<string, any>;

/**
 * Load design tokens from YAML file or URL
 */
export async function loadDesignTokens(source: string | DesignTokens): Promise<DesignTokens> {
  if (typeof source === 'object') {
    return source;
  }

  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(`Failed to load design tokens from ${source}: ${response.statusText}`);
  }

  // If it's YAML, we need to parse it
  const content = await response.text();
  if (source.endsWith('.yaml') || source.endsWith('.yml')) {
    return parseYAML(content, source);
  }

  return JSON.parse(content);
}

/**
 * Parse one YAML token mapping with JSON-compatible scalar types.
 */
function parseYAML(yaml: string, source: string): DesignTokens {
  // Avoid implicit Date/binary values while preserving nested mappings and sequences.
  let tokens: unknown;
  try {
    tokens = load(yaml, { schema: JSON_SCHEMA, filename: source });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse design tokens YAML from ${source}: ${reason}`, { cause: error });
  }

  if (tokens === null || typeof tokens !== 'object' || Array.isArray(tokens)) {
    throw new Error(`Invalid design tokens YAML from ${source}: expected a mapping`);
  }

  return tokens as DesignTokens;
}

/**
 * Apply design tokens to DOM as CSS variables
 */
export function applyDesignTokens(
  tokens: DesignTokens,
  theme: 'light' | 'dark' | 'highContrast' = 'light'
): void {
  const root = document.documentElement;

  // Apply theme-specific colors
  if (tokens.themes && tokens.themes[theme]) {
    const themeTokens = tokens.themes[theme];
    setTokensAsCSSVariables(themeTokens, '--theme', root);
  }

  // Apply global tokens
  setTokensAsCSSVariables(tokens.colors || {}, '--color', root);
  setTokensAsCSSVariables(tokens.typography || {}, '--font', root);
  setTokensAsCSSVariables(tokens.spacing || {}, '--spacing', root);
  setTokensAsCSSVariables(tokens.shadows || {}, '--shadow', root);
  setTokensAsCSSVariables(tokens.borderRadius || {}, '--radius', root);
  setTokensAsCSSVariables(tokens.transitions || {}, '--transition', root);
}

/**
 * Convert tokens object to CSS variables and set on element
 */
function setTokensAsCSSVariables(
  tokens: Record<string, any>,
  prefix: string,
  element: HTMLElement
): void {
  Object.entries(tokens).forEach(([key, value]) => {
    const varName = `${prefix}-${kebabCase(key)}`;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Nested object - recurse
      setTokensAsCSSVariables(value, varName, element);
    } else if (typeof value === 'string' || typeof value === 'number') {
      // Primitive value - set as CSS variable
      element.style.setProperty(varName, String(value));
    }
  });
}

/**
 * Convert camelCase to kebab-case
 */
function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * Get a token value by path (e.g., 'colors.primary.default')
 */
export function getTokenValue(tokens: DesignTokens, path: string): TokenValue | undefined {
  const parts = path.split('.');
  let current: any = tokens;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Get CSS variable name for a token
 */
export function getTokenVariable(path: string): string {
  const parts = path.split('.');
  return `--${parts.map(kebabCase).join('-')}`;
}

/**
 * Apply tokens to a specific component
 */
export function applyComponentTokens(
  element: HTMLElement,
  componentType: string,
  tokens: DesignTokens
): void {
  const componentTokens = tokens.components?.[componentType];
  if (!componentTokens) return;

  // Apply component-specific styles
  Object.entries(componentTokens).forEach(([key, value]) => {
    if (typeof value === 'string' || typeof value === 'number') {
      element.style.setProperty(`--component-${kebabCase(key)}`, String(value));
    }
  });
}

/**
 * Watch for theme changes and reapply tokens
 */
export function watchDesignTokens(
  tokens: DesignTokens,
  onThemeChange: (theme: string) => void
): () => void {
  // Listen for theme preference changes
  const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

  function handleThemeChange(e: MediaQueryListEvent) {
    const theme = e.matches ? 'dark' : 'light';
    onThemeChange(theme);
    applyDesignTokens(tokens, theme as any);
  }

  darkModeQuery.addEventListener('change', handleThemeChange);

  // Return cleanup function
  return () => {
    darkModeQuery.removeEventListener('change', handleThemeChange);
  };
}

/**
 * Validate design tokens object
 */
export function validateDesignTokens(tokens: DesignTokens): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required sections
  const requiredSections = ['colors', 'typography', 'spacing', 'breakpoints'];
  for (const section of requiredSections) {
    if (!tokens[section as keyof DesignTokens]) {
      errors.push(`Missing required section: ${section}`);
    }
  }

  // Validate color tokens
  if (tokens.colors) {
    const validateColor = (color: any, path: string) => {
      if (typeof color !== 'string') {
        errors.push(`Invalid color at ${path}: expected string, got ${typeof color}`);
      }
    };

    Object.entries(tokens.colors).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        Object.entries(value).forEach(([subKey, subValue]) => {
          validateColor(subValue, `colors.${key}.${subKey}`);
        });
      } else {
        validateColor(value, `colors.${key}`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Convert design tokens to CSS string (for style tags)
 */
export function designTokensToCSS(
  tokens: DesignTokens,
  theme: 'light' | 'dark' | 'highContrast' = 'light'
): string {
  let css = ':root {\n';

  const addTokensToCSS = (obj: Record<string, any>, prefix: string = ''): void => {
    Object.entries(obj).forEach(([key, value]) => {
      const varName = prefix ? `${prefix}-${kebabCase(key)}` : `--${kebabCase(key)}`;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        addTokensToCSS(value, varName);
      } else if (typeof value === 'string' || typeof value === 'number') {
        css += `  ${varName}: ${value};\n`;
      }
    });
  };

  // Apply theme-specific colors first
  if (tokens.themes?.[theme]) {
    addTokensToCSS(tokens.themes[theme], '--theme');
  }

  // Apply global tokens
  if (tokens.colors) addTokensToCSS(tokens.colors, '--color');
  if (tokens.typography) addTokensToCSS(tokens.typography, '--font');
  if (tokens.spacing) addTokensToCSS(tokens.spacing, '--spacing');
  if (tokens.shadows) addTokensToCSS(tokens.shadows, '--shadow');
  if (tokens.borderRadius) addTokensToCSS(tokens.borderRadius, '--radius');
  if (tokens.transitions) addTokensToCSS(tokens.transitions, '--transition');

  css += '}\n';
  return css;
}
