#!/usr/bin/env node
/**
 * Live + GitHub security smoke check for intelgenv2.com
 * Usage: node scripts/audit-live.mjs
 */
'use strict';

const LIVE = 'https://www.intelgenv2.com';
const RAW = 'https://raw.githubusercontent.com/IntelGenV2/Website/main';
const TREE =
  'https://api.github.com/repos/IntelGenV2/Website/git/trees/main?recursive=1';

const LIVE_PATHS = [
  '/',
  '/js/main.js',
  '/js/boot.js',
  '/js/page.js',
  '/js/matrix-rain.js',
];

const FORBIDDEN_IN_REPO = [
  /^\.env(\.|$)/i,
  /^node_modules\//i,
  /(^|\/)secrets?\./i,
  /(^|\/)credentials?\./i,
  /\.pem$/i,
  /\.p12$/i,
];

const SECRETISH = [
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /Bearer\s+/i,
  /\bsk-[a-zA-Z0-9]{10,}/,
  /\bAIza[0-9A-Za-z\-_]{20,}/,
  /supabase/i,
  /firebase/i,
  /mongodb(\+srv)?:\/\//i,
  /Authorization\s*:/i,
  /\bfetch\s*\(/i,
  /XMLHttpRequest/i,
  /\beval\s*\(/i,
  /admin/i,
  /webhook/i,
];

async function get(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'intelgen-audit-live/1.0' },
    redirect: 'follow',
  });
  const text = await res.text();
  return {
    url,
    ok: res.ok,
    status: res.status,
    cors: res.headers.get('access-control-allow-origin'),
    server: res.headers.get('server'),
    text,
  };
}

function hits(text, patterns) {
  return patterns
    .map((re) => ({ re: String(re), count: (text.match(re) || []).length }))
    .filter((h) => h.count > 0);
}

function storageKeys(text) {
  const keys = new Set();
  const re = /(?:local|session)Storage\.(?:get|set)Item\(\s*['"]([^'"]+)/g;
  let m;
  while ((m = re.exec(text))) keys.add(m[1]);
  return [...keys].sort();
}

async function main() {
  const report = {
    checkedAt: new Date().toISOString(),
    live: LIVE,
    github: 'https://github.com/IntelGenV2/Website',
    findings: [],
  };

  console.log('Auditing live site + GitHub tree…\n');

  let jsBlob = '';
  for (const path of LIVE_PATHS) {
    const r = await get(LIVE + path);
    const line = `${r.ok ? 'OK' : 'FAIL'} ${r.status} ${path} cors=${r.cors || '-'} server=${r.server || '-'}`;
    console.log(line);
    if (!r.ok) report.findings.push({ severity: 'error', msg: line });
    if (path.endsWith('.js')) jsBlob += `\n/* ${path} */\n` + r.text;
    if (r.cors === '*' && path === '/') {
      report.findings.push({
        severity: 'info',
        msg: 'CORS * on GitHub Pages is hosting default — OK for a static site with no auth API.',
      });
    }
  }

  const secretHits = hits(jsBlob, SECRETISH).filter((h) => {
    // allowlisted noise from this site
    if (h.re.includes('password') && !/password/i.test(jsBlob.replace(/Boot password/gi, ''))) {
      /* keep */
    }
    return true;
  });

  // Re-scan with context: only flag real risks
  const risky = [];
  if (/\bfetch\s*\(/.test(jsBlob)) risky.push('fetch() present — review destinations');
  if (/XMLHttpRequest/.test(jsBlob)) risky.push('XMLHttpRequest present');
  if (/\beval\s*\(/.test(jsBlob)) risky.push('eval() present');
  if (/api[_-]?key|Bearer\s+|sk-[a-zA-Z0-9]{10,}|AIza[0-9A-Za-z\-_]{20,}/i.test(jsBlob)) {
    risky.push('Possible API key / bearer token in frontend JS');
  }
  if (/innerHTML\s*=\s*[^'"\s]/.test(jsBlob) || /innerHTML\s*=\s*[^;]*\+/.test(jsBlob)) {
    risky.push('innerHTML assignment may include dynamic/untrusted content');
  }
  const innerClearOnly = /innerHTML\s*=\s*['"]{2}/.test(jsBlob) && !/innerHTML\s*=\s*[^'"]/.test(
    jsBlob.replace(/innerHTML\s*=\s*['"]{2}/g, '')
  );
  if (!innerClearOnly && /innerHTML/.test(jsBlob)) {
    // already covered above if dynamic
  }

  console.log('\nlocalStorage/sessionStorage keys:', storageKeys(jsBlob).join(', ') || '(none)');
  if (risky.length) {
    console.log('\nRISKS:');
    risky.forEach((m) => {
      console.log(' -', m);
      report.findings.push({ severity: 'warn', msg: m });
    });
  } else {
    console.log('\nNo high-risk frontend secret/API patterns in live JS.');
  }

  const treeRes = await get(TREE);
  if (!treeRes.ok) {
    console.log('\nFAIL GitHub tree', treeRes.status);
    report.findings.push({ severity: 'error', msg: 'Could not load GitHub tree' });
  } else {
    const tree = JSON.parse(treeRes.text);
    const paths = (tree.tree || []).filter((t) => t.type === 'blob').map((t) => t.path);
    console.log('\nGitHub main blobs:', paths.length);
    const bad = paths.filter((p) => FORBIDDEN_IN_REPO.some((re) => re.test(p)));
    if (bad.length) {
      console.log('FORBIDDEN PATHS IN REPO:');
      bad.forEach((p) => {
        console.log(' -', p);
        report.findings.push({ severity: 'error', msg: 'Forbidden path in repo: ' + p });
      });
    } else {
      console.log('No .env / node_modules / credential files on main.');
    }
    const hasGitignore = paths.includes('.gitignore');
    if (!hasGitignore) {
      console.log('NOTE: .gitignore not on main yet — push the local one.');
      report.findings.push({
        severity: 'warn',
        msg: '.gitignore missing on GitHub main — push local hygiene files.',
      });
    }
  }

  // Compare one live file to raw GitHub
  const liveMain = await get(LIVE + '/js/main.js');
  const rawMain = await get(RAW + '/js/main.js');
  if (liveMain.ok && rawMain.ok) {
    const match = liveMain.text === rawMain.text;
    console.log(
      match
        ? '\nLive js/main.js matches GitHub main.'
        : '\nWARN: Live js/main.js differs from GitHub main (Pages may be lagging or branch mismatch).'
    );
    if (!match) {
      report.findings.push({
        severity: 'warn',
        msg: 'Live js/main.js !== GitHub main raw content',
      });
    }
  }

  const errors = report.findings.filter((f) => f.severity === 'error');
  const warns = report.findings.filter((f) => f.severity === 'warn');
  console.log(`\nDone. errors=${errors.length} warns=${warns.length}`);
  if (errors.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
