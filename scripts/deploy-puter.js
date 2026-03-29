#!/usr/bin/env node
/**
 * Deploy Grudge Warlords 3D to Puter as a hosted app.
 *
 * Usage:
 *   node scripts/deploy-puter.js          # first deploy (creates app)
 *   node scripts/deploy-puter.js --update # update existing app
 *
 * Prerequisites:
 *   1. npm install -g puter-cli
 *   2. puter login          (one-time auth)
 *   3. npm run build        (produce dist/)
 *
 * Reads PUTER_APP_NAME from .env (default: grudachain)
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = resolve(ROOT, 'dist');

// ── Load .env ──────────────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(ROOT, '.env');
  const vars = {};
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
      if (m) vars[m[1]] = m[2];
    }
  }
  return vars;
}

const env = loadEnv();
const APP_NAME = env.PUTER_APP_NAME || 'grudachain';
const isUpdate = process.argv.includes('--update');

// ── Checks ─────────────────────────────────────────────────────
if (!existsSync(DIST)) {
  console.error('❌ dist/ not found. Run "npm run build" first.');
  process.exit(1);
}

try {
  execSync('puter --version', { stdio: 'pipe' });
} catch {
  console.error('❌ puter-cli not installed. Run "npm install -g puter-cli"');
  process.exit(1);
}

// ── Deploy ─────────────────────────────────────────────────────
console.log(`\n🚀 Deploying "${APP_NAME}" to Puter...`);
console.log(`   Source: ${DIST}`);
console.log(`   Mode:   ${isUpdate ? 'UPDATE' : 'CREATE'}\n`);

try {
  let result;
  if (isUpdate) {
    // Update existing app with new files from dist/
    result = execSync(`puter app:update ${APP_NAME} "${DIST}"`, { encoding: 'utf-8', cwd: ROOT });
  } else {
    // Create new app from dist/ directory
    result = execSync(`puter app:create ${APP_NAME} "${DIST}" --description="Grudge Warlords 3D MMO"`, { encoding: 'utf-8', cwd: ROOT });
  }

  console.log(result);

  // puter-cli may exit 0 even on failure — check output for errors
  if (result && (result.includes('Failed to create') || result.includes('Error:'))) {
    console.error('\n❌ Deploy failed. puter-cli reported an error (see above).');
    console.error('   Make sure you are logged in: puter login');
    if (!isUpdate) {
      console.error('   If the app already exists, use: node scripts/deploy-puter.js --update');
    }
    process.exit(1);
  }

  console.log(`\n✅ Deployed! Your app should be live at:`);
  console.log(`   https://${APP_NAME}.puter.site`);
  console.log(`   (or check "puter apps" for the exact subdomain)\n`);
} catch (err) {
  console.error('\n❌ Deploy failed. Make sure you are logged in (run "puter login").');
  if (!isUpdate) {
    console.error('   If the app already exists, use: node scripts/deploy-puter.js --update');
  }
  process.exit(1);
}
