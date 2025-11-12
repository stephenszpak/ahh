import { describe, it, expect } from 'vitest';
import jscodeshift from 'jscodeshift';
import transform from '../src/transforms/split-chart.js';

describe('split-chart', () => {
  it('wraps chart usage in Suspense with skeleton', () => {
    const input = `import { LineChart } from 'recharts';\nexport function C(){ return <LineChart/> }`;
    const out = transform({ path: 'file.tsx', source: input }, { jscodeshift } as any);
    expect(out).toContain('Suspense');
    expect(out).toContain('skeleton-chart');
  });
});

