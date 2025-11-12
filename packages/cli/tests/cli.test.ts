import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

function runCLI(cwd: string, args: string[]) {
  const bin = path.resolve(__dirname, '../dist/ahx.js');
  return new Promise<{ stdout: string; stderr: string; code: number }>((resolve) => {
    const cp = spawn('node', [bin, ...args], { cwd, env: { ...process.env, VITEST: '1' } });
    let out = '', err = '';
    cp.stdout.on('data', (d) => (out += d.toString()));
    cp.stderr.on('data', (d) => (err += d.toString()));
    cp.on('close', (code) => resolve({ stdout: out, stderr: err, code: code ?? 0 }));
  });
}

async function waitForFile(p: string, timeoutMs = 1500) {
  const start = Date.now();
  while (!existsSync(p)) {
    if (Date.now() - start > timeoutMs) break;
    await new Promise((r) => setTimeout(r, 50));
  }
}

describe('ahx CLI', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ahx-cli-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('init detects framework and writes config', async () => {
    writeFileSync(path.join(dir, 'next.config.js'), 'module.exports={}');
    const res = await runCLI(dir, ['init']);
    if (res.code !== 0) {
      // print for debugging on CI
      // eslint-disable-next-line no-console
      console.error('init stderr:\n' + res.stderr);
      // eslint-disable-next-line no-console
      console.error('init stdout:\n' + res.stdout);
    }
    await waitForFile(path.join(dir, 'ahx.config.ts'));
    const cfg = readFileSync(path.join(dir, 'ahx.config.ts'), 'utf8');
    expect(cfg).toContain("framework: 'next'");
  });

  it('scan writes .ahx/scan.json', async () => {
    const srcDir = path.join(dir, 'src');
    mkdirSync(srcDir);
    writeFileSync(path.join(srcDir, 'Comp.tsx'), 'export default function C(){return <div/>}');
    const res = await runCLI(dir, ['scan']);
    if (res.code !== 0) {
      console.error('scan stderr:\n' + res.stderr);
      console.error('scan stdout:\n' + res.stdout);
    }
    await waitForFile(path.join(dir, '.ahx/scan.json'));
    const scan = JSON.parse(readFileSync(path.join(dir, '.ahx/scan.json'), 'utf8'));
    expect(Array.isArray(scan.files)).toBe(true);
  });

  it('report writes .ahx/report.json without runtime', async () => {
    // Seed a fake scan.json
    const ahxDir = path.join(dir, '.ahx');
    mkdirSync(ahxDir);
    writeFileSync(
      path.join(ahxDir, 'scan.json'),
      JSON.stringify({ generatedAt: new Date().toISOString(), files: [], routesMap: { '/': [] } }, null, 2)
    );
    const res = await runCLI(dir, ['report']);
    if (res.code !== 0) {
      console.error('report stderr:\n' + res.stderr);
      console.error('report stdout:\n' + res.stdout);
    }
    await waitForFile(path.join(ahxDir, 'report.json'));
    const report = JSON.parse(readFileSync(path.join(ahxDir, 'report.json'), 'utf8'));
    expect(Array.isArray(report.routes)).toBe(true);
  });
});
