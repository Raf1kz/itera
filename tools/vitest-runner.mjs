#!/usr/bin/env node
import { rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import { promises as fsp } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const args = process.argv.slice(2);

if (args.length === 0 || args[0] !== 'run') {
  console.error('Supported usage: vitest run [--coverage]');
  process.exit(1);
}

const buildDir = resolve('.tests-build');

if (existsSync(buildDir)) {
  rmSync(buildDir, { recursive: true, force: true });
}

const filesToTranspile = new Set();

async function collect(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await collect(full);
      continue;
    }

    if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      filesToTranspile.add(resolve(full));
    }
  }
}

await collect('tests');
await collect('supabase/functions');

['src/fsrs.ts', 'src/schemas.ts', 'src/utils/semanticMatch.ts'].forEach((file) => {
  filesToTranspile.add(resolve(file));
});

for (const filePath of filesToTranspile) {
  const source = await fsp.readFile(filePath, 'utf8');
  const isTsx = filePath.endsWith('.tsx');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      jsx: isTsx ? ts.JsxEmit.ReactJSX : undefined,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true
    },
    fileName: filePath
  });

  const relative = filePath.replace(`${process.cwd()}/`, '');
  const outFile = resolve(buildDir, relative).replace(/\.tsx?$/, '.js');
  await fsp.mkdir(dirname(outFile), { recursive: true });
  const rewritten = outputText
    .replace(/from\s+(['"])(\..*?)(['"])/g, (match, quote, specifier, endQuote) => {
      if (/\.(js|json|node)$/.test(specifier)) {
        return match;
      }
      if (/\.(ts|tsx)$/.test(specifier)) {
        return `from ${quote}${specifier.replace(/\.(ts|tsx)$/, '.js')}${endQuote}`;
      }
      if (specifier.startsWith('.')) {
        return `from ${quote}${specifier}.js${endQuote}`;
      }
      return match;
    })
    .replace(/^import\s+.*['"]jsr:.*['"];?\n?/gm, '')
    .replace(/from\s+['"]https:\/\/deno\.land\/x\/zod@[^'"]+['"]/g, 'from "zod"');
  await fsp.writeFile(outFile, rewritten, 'utf8');
}

const vitestModule = await import('vitest');
const { clearRegistrations, runRegisteredTests } = vitestModule;

clearRegistrations();

async function loadTests(dir) {
  if (!existsSync(dir)) {
    return;
  }

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      await loadTests(fullPath);
    } else if (stats.isFile() && fullPath.endsWith('.test.js')) {
      await import(pathToFileURL(fullPath).href);
    }
  }
}

await loadTests(join(buildDir, 'tests'));

const success = await runRegisteredTests();
process.exit(success ? 0 : 1);
