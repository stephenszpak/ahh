import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import type { RouteReport, RouteMetrics } from '../types.js';

export interface RuntimeAuditOptions {
  baseUrl: string;
  routes?: string[];
  headless?: boolean;
  outDir?: string;
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

async function collectPageMetrics(page: any): Promise<Pick<RouteMetrics, 'jsBytes' | 'hydrationMarks'>> {
  // Evaluate in page context to grab performance entries
  const perf = await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource') as any[];
    const scripts = resources.filter((r: any) => (r as any).initiatorType === 'script');
    const jsBytes = scripts.reduce((sum: number, r: any) => sum + (r.transferSize || r.encodedBodySize || 0), 0);
    const marks = (performance.getEntriesByType('mark') as any[])
      .concat(performance.getEntriesByType('measure') as any[])
      .map((e: any) => e.name)
      .filter((n) => /hydration/i.test(n) || /react-hydration/i.test(n));
    return { jsBytes, marks };
  });
  return { jsBytes: perf.jsBytes || 0, hydrationMarks: perf.marks || [] };
}

export async function runRuntimeAudit(opts: RuntimeAuditOptions): Promise<RouteReport[]> {
  const { baseUrl, routes = ['/'], headless = true, outDir } = opts;

  // Lazy import heavy deps to keep core light
  // Use dynamic imports to avoid type requirement at build
  const puppeteer = await import('puppeteer');
  const lighthouse = await import('lighthouse');

  const artifactsRoot = outDir || path.join(process.cwd(), '.ahx-artifacts', String(Date.now()));
  ensureDir(artifactsRoot);

  const browser = await puppeteer.launch({ headless });
  const wsEndpoint: string = browser.wsEndpoint();
  const wsUrl = new URL(wsEndpoint);
  const port = Number(wsUrl.port);

  const reports: RouteReport[] = [];

  try {
    for (const route of routes) {
      const url = new URL(route, baseUrl).toString();
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle0' });

      // Collect perf entries and JS bytes
      const basic = await collectPageMetrics(page);

      // Run Lighthouse against the same Chrome instance
      const lhResult: any = await lighthouse.default(url, {
        port,
        output: 'json',
        onlyCategories: ['performance']
      });

      const lhr = lhResult.lhr || lhResult;
      const metrics: RouteMetrics = {
        lcp: lhr.audits?.['largest-contentful-paint']?.numericValue,
        tbt: lhr.audits?.['total-blocking-time']?.numericValue,
        cls: lhr.audits?.['cumulative-layout-shift']?.numericValue,
        jsBytes: basic.jsBytes,
        hydrationMarks: basic.hydrationMarks
      };

      const fileSafe = route.replace(/[^a-z0-9-_]/gi, '_') || 'root';
      const outPath = path.join(artifactsRoot, `${fileSafe}.lhr.json`);
      fs.writeFileSync(outPath, JSON.stringify(lhr, null, 2));

      reports.push({ route, url, metrics, artifactsPath: outPath });
      await page.close();
    }
  } finally {
    await browser.close();
  }

  return reports;
}

export default runRuntimeAudit;
