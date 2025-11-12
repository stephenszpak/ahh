import { describe, it, expect } from 'vitest';
import { analyzeFile } from '../src/analyzers/fileAnalyzer.js';

describe('eventDensity', () => {
  it('counts JSX on* handlers', () => {
    const src = `
      export function Button(){
        return <button onClick={()=>{}} onMouseEnter={()=>{}}/>;
      }
    `;
    const r = analyzeFile(src, 'b.tsx');
    const sig = r.signals.eventDensity;
    expect(sig?.score).toBe(2);
    expect(sig?.detail.length).toBe(2);
  });
});

