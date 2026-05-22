#!/usr/bin/env node
/*
 * Postinstall script that runs patch-package locally but skips it on Vercel
 * and other build environments where applying patches to node_modules may fail
 * and should not block the build. This makes installs deterministic in CI
 * while preserving the developer workflow where patch-package is still run.
 */
const cp = require('child_process');

const isVercel = !!(
  process.env.VERCEL ||
  process.env.VERCEL_BUILD ||
  process.env.NOW_BUILDER ||
  process.env.NOW
);

if (isVercel) {
  console.log('postinstall: detected Vercel environment — skipping patch-package.');
  process.exit(0);
}

try {
  // Try running the installed patch-package binary. This should be available
  // in npm's lifecycle PATH as a local dependency.
  const res = cp.spawnSync('patch-package', { stdio: 'inherit' });
  if (res.error || res.status !== 0) {
    // Fall back to npx if available
    console.warn('postinstall: patch-package failed, attempting npx fallback...');
    const res2 = cp.spawnSync('npx', ['patch-package'], { stdio: 'inherit' });
    if (res2.error || res2.status !== 0) {
      console.warn('postinstall: npx patch-package also failed — continuing without failing install.');
    }
  }
} catch (err) {
  // Never fail the install from here - this script is best-effort and should
  // not block CI/deploy environments.
  console.warn('postinstall: unexpected error while running patch-package, continuing.', err && err.message ? err.message : err);
}
