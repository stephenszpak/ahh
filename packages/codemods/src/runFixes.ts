import { promises as fs } from 'fs';
import path from 'path';
import j from 'jscodeshift';
import lazyImport from './transforms/lazy-import.js';
import wrapIsland, { generateIsland } from './transforms/wrap-island.js';
import splitChart from './transforms/split-chart.js';
import deferEffect, { generateUseVisible } from './transforms/defer-effect.js';
import clientGate from './transforms/client-gate.js';

type RunFixesOptions = { reportPath: string; fixes: string[]; dryRun?: boolean; projectRoot?: string };

export async function runFixes(opts: RunFixesOptions) {
  const reportRaw = await fs.readFile(opts.reportPath, 'utf8');
  const report = JSON.parse(reportRaw);
  const files: string[] = (report.files || []).map((f: any) => f.file || f.path).filter(Boolean);
  const applied: Record<string, string[]> = {};
  const projectRoot = opts.projectRoot || process.cwd();

  let preferJs = false;
  for (const filePath of files) {
    const abs = path.isAbsolute(filePath) ? filePath : path.join(projectRoot, filePath);
    let src: string;
    try { src = await fs.readFile(abs, 'utf8'); } catch { continue; }
    let code = src;
    const api = { jscodeshift: j } as any;
    if (/\.jsx?$/.test(abs)) preferJs = true;

    if (opts.fixes.includes('lazy-import') || opts.fixes.includes('all')) {
      code = lazyImport({ path: abs, source: code }, api, {}) || code;
      (applied[abs] ||= []).push('lazy-import');
    }
    if (opts.fixes.includes('wrap-island') || opts.fixes.includes('all')) {
      code = wrapIsland({ path: abs, source: code }, api, { target: undefined }) || code; // requires target provided usually
    }
    if (opts.fixes.includes('split-chart') || opts.fixes.includes('all')) {
      code = splitChart({ path: abs, source: code }, api) || code;
      (applied[abs] ||= []).push('split-chart');
    }
    if (opts.fixes.includes('defer-effect') || opts.fixes.includes('all')) {
      code = deferEffect(code, abs) || code;
      (applied[abs] ||= []).push('defer-effect');
    }
    if (opts.fixes.includes('client-gate') || opts.fixes.includes('all')) {
      code = clientGate({ path: abs, source: code }, api) || code;
      (applied[abs] ||= []).push('client-gate');
    }

    if (!opts.dryRun && code !== src) {
      await fs.writeFile(abs, code, 'utf8');
    }
  }

  // Generate helper files if certain fixes are requested
  if (!opts.dryRun && (opts.fixes.includes('wrap-island') || opts.fixes.includes('all'))) {
    const islandPath = path.join(projectRoot, 'components', preferJs ? 'Island.jsx' : 'Island.tsx');
    await fs.mkdir(path.dirname(islandPath), { recursive: true });
    await fs.writeFile(islandPath, generateIsland(preferJs), 'utf8');
  }
  if (!opts.dryRun && (opts.fixes.includes('defer-effect') || opts.fixes.includes('all'))) {
    const hookPath = path.join(projectRoot, 'hooks', preferJs ? 'useVisible.js' : 'useVisible.ts');
    await fs.mkdir(path.dirname(hookPath), { recursive: true });
    await fs.writeFile(hookPath, generateUseVisible(preferJs), 'utf8');
  }

  return { applied };
}

export default runFixes;
