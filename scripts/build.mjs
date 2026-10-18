import { cpSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] });
  if (result.stdout?.length) process.stderr.write(result.stdout);
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Build failed (${result.status})`);
}
rmSync(new URL('../dist', import.meta.url), { recursive: true, force: true });
run(['build-tokens.mjs']);
run(['node_modules/typescript/bin/tsc', '-p', 'tsconfig.build.json']);
cpSync(new URL('../src/tokens.css', import.meta.url), new URL('../dist/tokens.css', import.meta.url));
