import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const temp = mkdtempSync(path.join(tmpdir(), 'design-tokens-consumer-'));
const env = { ...process.env, NODE_PATH: '', npm_config_registry: 'https://registry.npmjs.org/',
  npm_config_userconfig: path.join(temp, 'empty.npmrc'),
  npm_config_globalconfig: path.join(temp, 'empty-global.npmrc') };
for (const file of [env.npm_config_userconfig, env.npm_config_globalconfig]) writeFileSync(file, '');
function run(command, args, cwd = temp) {
  const r = spawnSync(command, args, { cwd, env, encoding: 'utf8' });
  if (r.error || r.status !== 0) throw r.error ?? new Error(`${command} ${args.join(' ')} failed:\n${r.stdout}\n${r.stderr}`);
  return r.stdout;
}
try {
  const [pack] = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', temp], root));
  assert(pack.files.every(f => !f.path.startsWith('src/') && !/\.npmrc|node_modules|\.test\./.test(f.path)));
  writeFileSync(path.join(temp, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  run('npm', ['install', '--ignore-scripts', '--omit=dev', path.join(temp, pack.filename)]);
  const installed = path.join(temp, 'node_modules/@internetmatt/design-tokens');
  const meta = JSON.parse(readFileSync(path.join(installed, 'package.json'), 'utf8'));
  const targets = obj => typeof obj === 'string' ? [obj] : Object.values(obj).flatMap(targets);
  for (const file of targets(meta.exports)) assert(existsSync(path.join(installed, file)), file);
  for (const spec of Object.values(meta.dependencies ?? {})) assert(!/file:|workspace:|link:|catalog:|localhost/.test(spec));
  writeFileSync(path.join(temp, 'verify.mjs'), `import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {token,t,TOKENS_CSS_IMPORT,loadDesignTokens,getTokenValue,designTokensToCSS} from '@internetmatt/design-tokens';
import * as runtime from '@internetmatt/design-tokens/runtime';
assert.equal(token('spacing.md'),'var(--spacing-md)'); assert.equal(t,token);
assert.equal(TOKENS_CSS_IMPORT,'@internetmatt/design-tokens/tokens.css');
const yaml=readFileSync(new URL(import.meta.resolve('@internetmatt/design-tokens/tokens.yaml')),'utf8');
globalThis.fetch=async()=>new Response(yaml);
const tokens=await loadDesignTokens('https://fixture.test/tokens.yaml');
assert.equal(getTokenValue(tokens,'colors.primary.default'),'#0078D4');
assert.equal(getTokenValue(tokens,'typography.heading.h1.mobile.fontSize'),28);
assert.equal(runtime.getTokenVariable('colors.primary.default'),'--colors-primary-default');
assert.match(designTokensToCSS(tokens),/--theme-colors-primary:/);
const css=readFileSync(new URL(import.meta.resolve(TOKENS_CSS_IMPORT)),'utf8');
assert.match(css,/--colors-primary-default: #0078D4;/); assert.match(css,/data-theme="dark"/);
globalThis.fetch=async()=>new Response('colors: [unterminated');
await assert.rejects(loadDesignTokens('https://fixture.test/bad.yaml'),/Failed to parse/);
console.log('production consumer: root/runtime JavaScript, nested YAML, CSS and malformed input passed');`);
  console.log(run(process.execPath, ['verify.mjs']));
  run('npm', ['install', '--ignore-scripts', '--save-dev', 'typescript@5.9.3']);
  writeFileSync(path.join(temp, 'consumer.mts'), `import {token, t, type DesignTokens, loadDesignTokens} from '@internetmatt/design-tokens';
import {getTokenValue} from '@internetmatt/design-tokens/runtime';
const tokens: DesignTokens = await loadDesignTokens({spacing:{md:16}});
const reference: string = token('spacing.md'); const shorthand: string = t('spacing.md'); getTokenValue(tokens,'spacing.md');`);
  run(process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit', '--strict', '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', 'consumer.mts']);
  console.log('strict NodeNext declarations passed');
  console.log(JSON.stringify({ filename: pack.filename, size: pack.size, integrity: pack.integrity }));
} finally {
  rmSync(temp, { recursive: true, force: true });
}
