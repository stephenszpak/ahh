import { defaultAnalyzer } from './analyzers/index.js';
import type { Analyzer, HydrationMetric, ScanResult, FileReport, Signal, SignalScore, RouteReport, RouteMetrics } from './types.js';

export type { Analyzer, HydrationMetric, ScanResult, FileReport, Signal, SignalScore, RouteReport, RouteMetrics } from './types.js';
export { defaultAnalyzer, analyzeFile } from './analyzers/index.js';
export { runRuntimeAudit } from './runtime/collector.js';
export { computeHotspotScore, suggestFixes } from './scoring/index.js';

export interface ScanFileInput {
  path: string;
  content: string;
}

export function scanFiles(
  files: ScanFileInput[],
  analyzers: Analyzer[] = [defaultAnalyzer]
): ScanResult {
  const totals: HydrationMetric = { components: 0, islands: 0, bytes: 0 };
  const byFile: Array<{ path: string; metrics: Partial<HydrationMetric> }> = [];
  for (const f of files) {
    const merged: Partial<HydrationMetric> = {};
    for (const a of analyzers) {
      const m = a(f.content, f.path) || {};
      Object.assign(merged, m);
    }
    totals.components += merged.components ?? 0;
    totals.islands += merged.islands ?? 0;
    totals.bytes += merged.bytes ?? 0;
    byFile.push({ path: f.path, metrics: merged });
  }
  return { files: files.length, metrics: totals, byFile };
}

export function createScanner(customAnalyzers: Analyzer[] = []) {
  const analyzers = [defaultAnalyzer, ...customAnalyzers];
  return {
    scanFiles: (files: ScanFileInput[]) => scanFiles(files, analyzers)
  };
}
