import { describe, it, expect } from 'vitest';
import { analyzeFile } from '../src/analyzers/fileAnalyzer.js';

describe('bundleFootprint and eagerCharts', () => {
  it('collects imports and flags chart libs', () => {
    const src = `
      import x from './local';
      import { Chart } from 'recharts';
      export default function A(){ return <div/> }
    `;
    const r = analyzeFile(src, '/tmp/A.tsx');
    expect(r.signals.bundleFootprint).toBeDefined();
    expect(r.signals.eagerCharts?.score).toBe(1);
  });
});

