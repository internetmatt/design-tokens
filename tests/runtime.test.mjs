import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  designTokensToCSS,
  getTokenValue,
  loadDesignTokens,
} from '../src/runtime.ts';

const canonicalYAML = await readFile(new URL('../tokens.yaml', import.meta.url), 'utf8');

function mockResponse(t, content) {
  return t.mock.method(globalThis, 'fetch', async () => new Response(content));
}

for (const extension of ['yaml', 'yml']) {
  test(`loads canonical nested tokens from .${extension}`, async (t) => {
    const source = `https://example.test/tokens.${extension}`;
    const fetchMock = mockResponse(t, canonicalYAML);
    const tokens = await loadDesignTokens(source);

    assert.equal(fetchMock.mock.calls.length, 1);
    assert.equal(fetchMock.mock.calls[0].arguments[0], source);
    assert.equal(getTokenValue(tokens, 'colors.primary.default'), '#0078D4');
    assert.equal(getTokenValue(tokens, 'typography.heading.h1.mobile.fontSize'), 28);
    assert.equal(getTokenValue(tokens, 'spacing.button.paddingX'), 16);
    assert.equal(getTokenValue(tokens, 'themes.dark.colors.primary'), '#50E6FF');
    assert.equal(getTokenValue(tokens, 'components.button.primary.hover.background'), '#106EBE');
    assert.deepEqual(getTokenValue(tokens, 'metadata.surfaces'), ['web', 'mobile', 'electron']);
    assert.match(designTokensToCSS(tokens), /--color-primary-default: #0078D4;/);
  });
}

test('returns object inputs unchanged without fetching', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', () => {
    assert.fail('object inputs must not fetch');
  });
  const tokens = { colors: { primary: { default: '#0078D4' } }, spacing: { md: 16 } };

  assert.strictEqual(await loadDesignTokens(tokens), tokens);
  assert.equal(fetchMock.mock.calls.length, 0);
});

test('preserves nested JSON inputs', async (t) => {
  const tokens = { colors: { primary: { default: '#0078D4' } }, spacing: { md: 16 } };
  mockResponse(t, JSON.stringify(tokens));

  assert.deepEqual(await loadDesignTokens('https://example.test/tokens.json'), tokens);
});

test('continues accepting JSON served from a YAML URL', async (t) => {
  const tokens = { colors: { primary: { default: '#0078D4' } } };
  mockResponse(t, JSON.stringify(tokens));

  assert.deepEqual(await loadDesignTokens('https://example.test/tokens.yaml'), tokens);
});

test('keeps YAML scalars and sequences as plain token data', async (t) => {
  mockResponse(t, `metadata:
  lastUpdated: 2026-03-29
  enabled: true
  surfaces: [web, mobile, electron]
spacing:
  md: 16
  mdPx: '16px'
`);

  assert.deepEqual(await loadDesignTokens('https://example.test/tokens.yaml'), {
    metadata: {
      lastUpdated: '2026-03-29',
      enabled: true,
      surfaces: ['web', 'mobile', 'electron'],
    },
    spacing: { md: 16, mdPx: '16px' },
  });
});

for (const [name, content, reason] of [
  ['unclosed sequence', 'colors:\n  primary: [blue\n', /unexpected end/],
  ['invalid indentation', "colors:\n  primary:\n    default: '#0078D4'\n   hover: '#106EBE'\n", /bad indentation/],
  ['duplicate keys', "colors:\n  primary: blue\n  primary: cyan\n", /duplicated mapping key/],
  ['multiple documents', 'colors: {}\n---\nspacing: {}\n', /expected a single document/],
]) {
  test(`rejects malformed YAML: ${name}`, async (t) => {
    const source = 'https://example.test/broken.yaml';
    mockResponse(t, content);

    await assert.rejects(loadDesignTokens(source), (error) => {
      assert.equal(error.cause.name, 'YAMLException');
      assert.ok(error.message.includes(source), 'error identifies the source');
      assert.match(error.message, reason, 'error explains the parser failure');
      if (name !== 'multiple documents') {
        assert.match(error.message, /\(\d+:\d+\)/, 'error includes line and column');
      }
      return true;
    });
  });
}

for (const content of ['', 'null', 'blue', '42', '- blue\n- cyan\n']) {
  test(`rejects YAML without a token mapping: ${JSON.stringify(content)}`, async (t) => {
    mockResponse(t, content);

    await assert.rejects(
      loadDesignTokens('https://example.test/tokens.yaml'),
      /Invalid design tokens YAML from https:\/\/example\.test\/tokens\.yaml: expected a mapping/,
    );
  });
}

test('preserves JSON parse failures', async (t) => {
  mockResponse(t, '{"colors":');

  await assert.rejects(loadDesignTokens('https://example.test/tokens.json'), SyntaxError);
});

test('preserves failed-fetch errors', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('', {
    status: 404,
    statusText: 'Not Found',
  }));

  await assert.rejects(
    loadDesignTokens('https://example.test/tokens.yaml'),
    /Failed to load design tokens from https:\/\/example\.test\/tokens\.yaml: Not Found/,
  );
});
