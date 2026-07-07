// One-shot site build: language pages first (writes sitemap), then product
// pages (appends to it). Same env knobs as the individual scripts:
//   SITE_BASE, OUT_DIR, API_BASE
// Usage: node frontend/build-all.mjs
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = dirname(fileURLToPath(import.meta.url));
for (const script of ['build-i18n.mjs', 'build-products.mjs']) {
  execFileSync(process.execPath, [join(DIR, script)], { stdio: 'inherit', env: process.env });
}
console.log('build-all: done');
