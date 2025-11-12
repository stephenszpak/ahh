import { describe, it, expect } from 'vitest';
import { runRuntimeAudit } from '../src/runtime/collector.js';
import { spawn } from 'node:child_process';
import http from 'node:http';

function waitForServer(url: string, timeoutMs = 30000): Promise<void> {
  const end = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode >= 200) {
          resolve();
        } else {
          if (Date.now() > end) reject(new Error('Server did not start'));
          else setTimeout(tryOnce, 500);
        }
      });
      req.on('error', () => {
        if (Date.now() > end) reject(new Error('Server did not start'));
        else setTimeout(tryOnce, 500);
      });
    };
    tryOnce();
  });
}

describe('runtime collector', () => {
  const enabled = process.env.AHX_E2E === '1';
  (enabled ? it : it.skip)('collects metrics from Next fixture', async () => {
    const proc = spawn('pnpm', ['-C', 'fixtures/next-basic', 'dev'], {
      stdio: 'ignore'
    });
    try {
      await waitForServer('http://localhost:3100');
      const reports = await runRuntimeAudit({
        baseUrl: 'http://localhost:3100',
        routes: ['/', '/heavy'],
        headless: true
      });
      expect(Array.isArray(reports)).toBe(true);
      expect(reports.length).toBe(2);
      for (const r of reports) {
        expect(r.route).toBeTypeOf('string');
        expect(r.url).toBeTypeOf('string');
        expect(r.metrics).toBeTypeOf('object');
        expect(typeof r.metrics.jsBytes === 'number').toBe(true);
        expect(Array.isArray(r.metrics.hydrationMarks || [])).toBe(true);
        expect(r.artifactsPath).toBeTypeOf('string');
      }
    } finally {
      proc.kill();
    }
  });
});

