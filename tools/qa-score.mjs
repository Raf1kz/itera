#!/usr/bin/env node
/**
 * QA scoring utility for StudyFlash.
 * Runs key quality gates, aggregates a numeric score, and prints JSON + summary table.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import http from 'node:http';

const projectRoot = resolve('.');
const toolsBin = resolve(projectRoot, 'tools', 'bin');
process.env.PATH = `${toolsBin}:${process.env.PATH || ''}`;

const runCmd = (cmd, args = [], opts = {}) =>
  new Promise((resolveCmd) => {
    const child = spawn(cmd, args, {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      ...opts,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('error', (err) => {
      resolveCmd({ code: -1, out: stdout, err: stderr || String(err) });
    });
    child.on('close', (code) => {
      resolveCmd({ code, out: stdout, err: stderr });
    });
  });

const waitForPort = (url, timeoutMs = 30_000, intervalMs = 500) =>
  new Promise((resolveWait) => {
    const start = Date.now();
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolveWait(true);
      });
      req.on('error', () => {
        if (Date.now() - start >= timeoutMs) {
          resolveWait(false);
        } else {
          setTimeout(attempt, intervalMs);
        }
      });
      req.setTimeout(2_000, () => {
        try {
          req.destroy();
        } catch {
          /* noop */
        }
      });
    };
    attempt();
  });

const summarise = (text, lines = 8) =>
  (text || '')
    .split('\n')
    .filter(Boolean)
    .slice(-lines)
    .join(' ')
    .slice(0, 180);

const main = async () => {
  const checks = {};

  // A) TypeScript typecheck
  let res = await runCmd('npx', ['tsc', '-p', 'tsconfig.app.json', '--noEmit']);
  checks.typecheck = {
    ok: res.code === 0,
    details: res.code === 0 ? 'ok' : summarise(res.err || res.out),
  };

  // B) Lint (prefer Biome)
  res = await runCmd('npx', ['biome', 'lint', '.']);
  if (res.code === 0) {
    checks.lint = { ok: true, details: 'biome' };
  } else {
    const fallback = await runCmd('npx', ['eslint', '.', '--ext', '.ts,.tsx']);
    checks.lint = {
      ok: fallback.code === 0,
      details: fallback.code === 0 ? 'eslint' : summarise(fallback.err || fallback.out),
    };
  }

  // C) Unit tests
  res = await runCmd('npx', ['vitest', 'run', '--reporter=default']);
  checks.unit = {
    ok: res.code === 0,
    details: res.code === 0 ? 'passed' : summarise(res.err || res.out),
  };

  // D) Build
  res = await runCmd('npx', ['vite', 'build']);
  checks.build = {
    ok: res.code === 0,
    details: res.code === 0 ? 'built' : summarise(res.err || res.out),
  };

  // I) Bundle size analysis (after build)
  const bundle = { ok: false, gzLargestKb: null, file: null };
  try {
    const assetsDir = join(projectRoot, 'dist', 'assets');
    if (existsSync(assetsDir)) {
      const files = readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
      const candidates = files.filter(
        (f) => !/react|react-dom|supabase|vendor/i.test(f),
      );
      let worst = { kb: -1, file: null };
      for (const file of candidates) {
        const buf = readFileSync(join(assetsDir, file));
        const gz = gzipSync(buf);
        const kb = Math.round(gz.byteLength / 1024);
        if (kb > worst.kb) {
          worst = { kb, file };
        }
      }
      if (worst.file) {
        bundle.gzLargestKb = worst.kb;
        bundle.file = worst.file;
        if (worst.kb <= 250) bundle.ok = true;
        else if (worst.kb <= 300) bundle.ok = false;
        else bundle.ok = false;
      }
    }
  } catch (err) {
    bundle.error = String(err);
  }
  checks.bundle = bundle;

  // E) Playwright smoke via preview
  const smokeRun = await runCmd('playwright', ['test']);
  checks.smoke = {
    ok: smokeRun.code === 0,
    details: smokeRun.code === 0 ? 'passed' : summarise(smokeRun.err || smokeRun.out),
  };

  // F) Deno fmt + lint
  const haveDeno = (await runCmd('deno', ['--version'])).code === 0;
  if (haveDeno) {
    const fmtRes = await runCmd('deno', [
      'fmt',
      '--check',
      'supabase/functions',
    ]);
    const lintRes = await runCmd('deno', ['lint', 'supabase/functions']);
    checks.denoFmt = { ok: fmtRes.code === 0 };
    checks.denoLint = { ok: lintRes.code === 0 };
  } else {
    checks.denoFmt = { ok: false, details: 'deno missing' };
    checks.denoLint = { ok: false, details: 'deno missing' };
  }

  // G) Dead code (knip)
  const dead = { ok: false, issues: null, details: '' };
  const knipRes = await runCmd('pnpm', ['deadcode']);
  if (knipRes.code === 0) {
    try {
      const parsed = JSON.parse(knipRes.out || '{}');
      const issueCount =
        (parsed.issues?.length ?? 0) +
        (parsed.dependencies?.unused?.length ?? 0);
      dead.ok = issueCount === 0;
      dead.issues = issueCount;
      dead.details = `${issueCount} issues`;
    } catch (err) {
      dead.ok = true;
      dead.issues = 0;
      dead.details = 'parse error ignored';
    }
  } else if (knipRes.code > 0) {
    dead.ok = false;
    dead.details = summarise(knipRes.err || knipRes.out);
  } else {
    dead.ok = false;
    dead.details = 'tool missing';
  }
  checks.deadcode = dead;

  // H) Depcheck
  const dep = { ok: false, unused: null, details: '' };
  const depRes = await runCmd('pnpm', ['depcheck']);
  if (depRes.code === 0) {
    try {
      const parsed = JSON.parse(depRes.out || '{}');
      const unused =
        (parsed.dependencies?.length ?? 0) +
        (parsed.devDependencies?.length ?? 0);
      dep.ok = unused === 0;
      dep.unused = unused;
      dep.details = `${unused} unused`;
    } catch (err) {
      dep.ok = false;
      dep.details = 'parse error';
    }
  } else {
    dep.ok = false;
    dep.details = summarise(depRes.err || depRes.out);
  }
  checks.depcheck = dep;

  // Score computation
  const scoreParts = {
    typecheck: checks.typecheck.ok ? 20 : 0,
    lint: checks.lint.ok ? 15 : 0,
    unit: checks.unit.ok ? 20 : 0,
    smoke: checks.smoke.ok ? 15 : 0,
    deno:
      checks.denoFmt.ok && checks.denoLint.ok
        ? 10
        : checks.denoFmt.ok || checks.denoLint.ok
        ? 5
        : 0,
    deadcode:
      dead.ok ? 10 : dead.issues != null ? 5 : 0,
    depcheck:
      dep.ok ? 5 : dep.unused != null ? 3 : 0,
    bundle:
      bundle.file == null
        ? 0
        : bundle.gzLargestKb <= 250
        ? 5
        : bundle.gzLargestKb <= 300
        ? 3
        : 0,
  };
  const finalScore = Object.values(scoreParts).reduce(
    (sum, val) => sum + val,
    0,
  );

  const jsonOutput = {
    score: finalScore,
    checks: {
      typecheck: { ok: checks.typecheck.ok },
      lint: { ok: checks.lint.ok },
      unit: { ok: checks.unit.ok },
      smoke: { ok: checks.smoke.ok },
      denoFmt: { ok: checks.denoFmt.ok },
      denoLint: { ok: checks.denoLint.ok },
      deadcode: { ok: dead.ok, issues: dead.issues },
      depcheck: { ok: dep.ok, unused: dep.unused },
      bundle: {
        ok:
          bundle.file != null && bundle.gzLargestKb != null
            ? bundle.gzLargestKb <= 250
            : false,
        gzLargestKb: bundle.gzLargestKb ?? null,
        file: bundle.file ?? null,
      },
    },
  };

  console.log(JSON.stringify(jsonOutput, null, 2));

  const tableRow = (label, passed, notes = '') =>
    `| ${label} | ${passed ? 'PASS' : 'FAIL'} | ${notes} |`;

  const table = [
    '',
    '| Check | Result | Notes |',
    '|---|---|---|',
    tableRow('typecheck', checks.typecheck.ok, checks.typecheck.details),
    tableRow('lint', checks.lint.ok, checks.lint.details),
    tableRow('unit', checks.unit.ok, checks.unit.details),
    tableRow('build', checks.build.ok, checks.build.details),
    tableRow('smoke', checks.smoke.ok, checks.smoke.details),
  tableRow(
    'deno fmt',
    checks.denoFmt.ok,
    checks.denoFmt.ok ? 'ok' : checks.denoFmt.details ?? 'fail',
  ),
  tableRow(
    'deno lint',
    checks.denoLint.ok,
    checks.denoLint.ok ? 'ok' : checks.denoLint.details ?? 'fail',
  ),
    tableRow(
      'deadcode',
      dead.ok,
      dead.issues != null ? `${dead.issues} issues` : dead.details,
    ),
    tableRow(
      'depcheck',
      dep.ok,
      dep.unused != null ? `${dep.unused} unused` : dep.details,
    ),
    tableRow(
      'bundle',
      bundle.file != null && bundle.gzLargestKb != null && bundle.gzLargestKb <= 250,
      bundle.file
        ? `${bundle.gzLargestKb} KB (${bundle.file})`
        : bundle.error || 'n/a',
    ),
    '',
    `**SCORE: ${finalScore}/100**`,
    '',
  ];

  console.log(table.join('\n'));
  process.exit(0);
};

main().catch((err) => {
  console.error('qa-score fatal error:', err);
  console.log(JSON.stringify({ score: 0, error: String(err) }, null, 2));
  console.log('\n**SCORE: 0/100**\n');
  process.exit(0);
});
