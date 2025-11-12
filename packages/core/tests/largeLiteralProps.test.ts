import { describe, it, expect } from 'vitest';
import { analyzeFile } from '../src/analyzers/fileAnalyzer.js';

describe('largeLiteralProps', () => {
  it('flags large object and array literals passed as props', () => {
    const src = `
      export const Thing = () => {
        return <X data={{a:1,b:2,c:3,d:4,e:5,f:6}} items={[0,1,2,3,4,5,6,7,8,9,10,11]} />
      }
    `;
    const r = analyzeFile(src, 'x.tsx');
    const sig = r.signals.largeLiteralProps;
    expect(sig).toBeTruthy();
    expect((sig?.score || 0)).toBeGreaterThan(0);
  });
});
