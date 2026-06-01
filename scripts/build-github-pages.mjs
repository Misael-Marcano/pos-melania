#!/usr/bin/env node
/**
 * Export estático del frontend para GitHub Pages.
 * Uso: node scripts/build-github-pages.mjs
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

process.env.GITHUB_PAGES = '1';
process.env.GITHUB_REPOSITORY =
  process.env.GITHUB_REPOSITORY ?? 'Misael-Marcano/pos-melania';

function run(cmd, args, cwd = root) {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: true, env: process.env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run('npm', ['run', 'build', '-w', '@pos/shared']);
run('npm', ['run', 'build', '-w', '@pos/frontend']);

console.log('\n✓ Sitio en apps/frontend/out/ — subir con workflow GitHub Pages o manualmente.\n');
