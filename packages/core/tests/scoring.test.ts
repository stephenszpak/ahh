import { describe, it, expect } from 'vitest';
import { computeHotspotScore, suggestFixes } from '../src/scoring/index.js';
import type { FileReport } from '../src/types.js';

function fr(signals: Partial<FileReport['signals']>): FileReport {
  return { file: 'X.tsx', componentNames: ['X'], signals };
}

describe('computeHotspotScore', () => {
  it('scores based on static signals', () => {
    const r = fr({
      effectHeaviness: { score: 10, max: 10, detail: [] },
      clientOnlyAPIs: { score: 2, max: 2, detail: [] }
    });
    const s = computeHotspotScore(r);
    expect(s).toBeGreaterThan(5);
  });

  it('amplifies with route metrics', () => {
    const r = fr({ bundleFootprint: { score: 200000, max: 200000, detail: [] } });
    const s1 = computeHotspotScore(r, { jsBytes: 50 * 1024 });
    const s2 = computeHotspotScore(r, { jsBytes: 300 * 1024 });
    expect(s2).toBeGreaterThanOrEqual(s1);
  });
});

describe('suggestFixes', () => {
  it('suggests based on thresholds', () => {
    const r = fr({
      largeLiteralProps: { score: 2, max: 10, detail: ['data at 10'] },
      eagerCharts: { score: 1, max: 1, detail: ['recharts'] },
      effectHeaviness: { score: 5, max: 10, detail: ['useEffect at 12: 8 statements'] },
      bundleFootprint: { score: 1, max: 5, detail: ['local:./heavy'] }
    });
    const suggestions = suggestFixes(r);
    const kinds = suggestions.map((s) => s.kind).sort();
    expect(kinds).toEqual(
      ['codeSplitCharts', 'deferEffects', 'memoizeLargeProps', 'splitBundle'].sort()
    );
  });
});

