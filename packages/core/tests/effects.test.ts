import { describe, it, expect } from 'vitest';
import { analyzeFile } from '../src/analyzers/fileAnalyzer.js';

describe('effectHeaviness', () => {
  it('counts effect statements', () => {
    const src = `
      import { useEffect } from 'react';
      function App(){
        useEffect(() => {
          const x = 1;
          console.log(x);
        }, []);
        return <div/>;
      }
    `;
    const r = analyzeFile(src, 'App.tsx');
    const sig = r.signals.effectHeaviness;
    expect(sig).toBeTruthy();
    expect(sig?.score).toBeGreaterThan(0);
    expect(sig?.detail[0]).toContain('useEffect');
  });
});

