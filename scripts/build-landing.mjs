#!/usr/bin/env node
/**
 * Builds the marketing landing (landingpage/) into the app's dist/, so
 * ONE Cloudflare Pages deploy serves both: the landing at `/`, the
 * product SPA everywhere else.
 *
 * Why two builds instead of a route inside the SPA: landingpage's
 * index.css redefines the same shadcn tokens the product paints with and
 * its Tailwind config renames the type scale. Merging them repaints the
 * product. Keeping the landing its own document costs one extra build
 * and collides with nothing.
 *
 * Why a Pages Function and not a `_redirects` rule: on Pages an existing
 * asset is served BEFORE `_redirects` is consulted, and an unknown path
 * falls back to `/index.html` before a `/*` rewrite to any other
 * document gets a chance. Both were measured against `wrangler pages
 * dev`. So `/` cannot be pointed elsewhere by a rule — only by code.
 * `functions/_middleware.ts` does it.
 *
 * The layout this produces:
 *   dist/index.html          the SPA — untouched, still the _redirects target
 *   dist/landing/index.html  the landing document
 *   dist/landing-assets/*    its JS/CSS (the SPA owns dist/assets/*)
 *   dist/{fonts,videos}/…    its public files, at the absolute paths it asks for
 *
 * If the Function is ever missing, `/` simply serves the SPA again —
 * the failure mode is the behaviour we had before, not a broken site.
 *
 * Set SKIP_LANDING_BUILD=1 to opt out during local iteration.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const landingDir = path.join(root, 'landingpage');
const distDir = path.join(root, 'dist');

const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, stdio: 'inherit', env: process.env });

const indexHtml = path.join(distDir, 'index.html');
if (!fs.existsSync(indexHtml)) {
  console.error('[build-landing] dist/index.html is missing — run the app build first.');
  process.exit(1);
}

// Hold the SPA document in memory: the landing build is about to write
// over that exact path, and it has to go back afterwards.
const spaDocument = fs.readFileSync(indexHtml);

// The landing needs its own node_modules — the Pages build only installs
// the root project.
//
// `--include=dev` is load-bearing: Cloudflare builds with NODE_ENV set to
// production, under which npm omits devDependencies — and everything that
// BUILDS this app (vite, @vitejs/plugin-react, tailwind) is a
// devDependency. Without the flag the install reports success with 54
// packages and the build then dies on a missing plugin.
if (!fs.existsSync(path.join(landingDir, 'node_modules'))) {
  console.log('[build-landing] installing landingpage dependencies…');
  run('npm', ['ci', '--include=dev', '--no-audit', '--no-fund'], landingDir);
}
console.log('[build-landing] building the landing into dist/…');
run('npx', ['vite', 'build', '--config', 'vite.embed.config.ts'], landingDir);

const landingDocument = fs.readFileSync(indexHtml);
if (landingDocument.equals(spaDocument)) {
  console.error('[build-landing] the landing build wrote no index.html of its own.');
  process.exit(1);
}

fs.mkdirSync(path.join(distDir, 'landing'), { recursive: true });
fs.writeFileSync(path.join(distDir, 'landing', 'index.html'), landingDocument);
fs.writeFileSync(indexHtml, spaDocument);

console.log('[build-landing] done — dist/landing/index.html is what `/` will serve.');
