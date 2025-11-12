import { describe, it, expect } from 'vitest';
import jscodeshift from 'jscodeshift';
import transform, { generateIsland } from '../src/transforms/wrap-island.js';

describe('wrap-island', () => {
  it('wraps target component with Island', () => {
    const input = `export default function C(){ return <Chart/> }`;
    const out = transform({ path: 'file.tsx', source: input }, { jscodeshift } as any, { target: 'Chart', mode: 'visible' });
    expect(out).toContain("import Island from '@/components/Island'");
    expect(out).toContain('<Island');
    expect(out).toContain('mode');
    expect(out).toContain('Chart');
    expect(generateIsland()).toContain('IntersectionObserver');
  });
});
