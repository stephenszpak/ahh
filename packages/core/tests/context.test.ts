import { describe, it, expect } from 'vitest';
import { analyzeFile } from '../src/analyzers/fileAnalyzer.js';

describe('contextAtRoot', () => {
  it('detects createContext/useContext and Provider usage', () => {
    const src = `
      import { createContext, useContext } from 'react';
      const Ctx = createContext(null);
      export function Comp(){
        const v = useContext(Ctx);
        return <Ctx.Provider value={v}><span/></Ctx.Provider>;
      }
    `;
    const r = analyzeFile(src, 'c.tsx');
    expect((r.signals.contextAtRoot?.score || 0)).toBeGreaterThanOrEqual(1);
  });
});

