#!/usr/bin/env node
// Static check: every Redirect href / router.push|replace target must point to
// a real Expo Router route. Catches stale references after files are renamed
// or deleted (e.g. /generate → /settings/tokens after settings/tokens.tsx was
// removed). Also re-asserts that every documented deep link target still exists.

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(ROOT, 'app');
const SCAN_DIRS = ['app', 'components', 'contexts', 'hooks', 'lib'];

const DEEP_LINKS = [
  { url: 'mtm:///', route: '/' },
  { url: 'mtm:///generate', route: '/generate' },
  { url: 'mtm:///auth', route: '/auth' },
  { url: 'mtm:///assistant', route: '/assistant' },
  { url: 'mtm:///connect', route: '/connect' },
];

function collectRoutes(dir, prefix = '') {
  const routes = new Set();
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = entry.name;
    const full = path.join(dir, name);
    if (entry.isDirectory()) {
      // (group) segments are transparent in Expo Router.
      const segment = name.startsWith('(') && name.endsWith(')') ? '' : name;
      const next = segment ? `${prefix}/${segment}` : prefix;
      for (const r of collectRoutes(full, next)) routes.add(r);
    } else if (entry.isFile() && /\.(tsx|ts|jsx|js)$/.test(name)) {
      const base = name.replace(/\.(tsx|ts|jsx|js)$/, '');
      if (base === '_layout' || base.startsWith('+')) continue;
      if (base === 'index') routes.add(prefix || '/');
      else routes.add(`${prefix}/${base}`);
    }
  }
  return routes;
}

function walkFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else if (entry.isFile() && /\.(tsx|ts|jsx|js)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function extractTargets(content, file) {
  const targets = [];
  const patterns = [
    { kind: '<Redirect href>', re: /<Redirect[^>]*\shref=["']([^"']+)["']/g },
    { kind: 'router.{push,replace,navigate}(string)', re: /\brouter\.(?:push|replace|navigate)\(\s*["']([^"']+)["']\s*[,)]/g },
    { kind: 'router.{push,replace,navigate}({pathname})', re: /\brouter\.(?:push|replace|navigate)\(\s*\{[^}]*pathname:\s*["']([^"']+)["']/g },
  ];
  for (const { kind, re } of patterns) {
    let m;
    while ((m = re.exec(content)) !== null) {
      targets.push({ href: m[1], file, kind });
    }
  }
  return targets;
}

function normalize(href) {
  // Strip query/fragment.
  const p = href.split('?')[0].split('#')[0];
  if (!p) return null;
  // External / mailto / tel / etc.
  if (/^[a-z]+:/i.test(p)) return null;
  // Relative — can't statically resolve.
  if (!p.startsWith('/')) return null;
  // Drop trailing slash except for root.
  return p === '/' ? '/' : p.replace(/\/+$/, '');
}

function main() {
  const routes = collectRoutes(APP_DIR);
  routes.add('/');

  const allTargets = [];
  for (const dir of SCAN_DIRS) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const file of walkFiles(abs)) {
      const content = fs.readFileSync(file, 'utf8');
      allTargets.push(...extractTargets(content, file));
    }
  }

  const errors = [];
  let checked = 0;
  for (const t of allTargets) {
    const norm = normalize(t.href);
    if (norm == null) continue;
    checked++;
    if (!routes.has(norm)) errors.push({ ...t, normalized: norm });
  }

  for (const dl of DEEP_LINKS) {
    if (!routes.has(dl.route)) {
      errors.push({
        href: dl.route,
        file: '(documented deep link)',
        kind: dl.url,
        normalized: dl.route,
      });
    }
  }

  if (errors.length) {
    console.error(`\n${errors.length} broken route reference(s):\n`);
    for (const e of errors) {
      console.error(`  [${e.kind}] ${e.href}`);
      console.error(`    in ${path.relative(ROOT, e.file)}\n`);
    }
    console.error(`Known routes (${routes.size}):`);
    for (const r of [...routes].sort()) console.error(`  ${r}`);
    process.exit(1);
  }

  console.log(`OK — ${checked} literal route reference(s) checked across ${SCAN_DIRS.join(', ')}; ${DEEP_LINKS.length} documented deep links validated against ${routes.size} routes.`);
}

main();
