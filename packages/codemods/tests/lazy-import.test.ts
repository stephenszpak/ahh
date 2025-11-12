import { describe, it, expect } from 'vitest';
import jscodeshift from 'jscodeshift';
import transform from '../src/transforms/lazy-import.js';

describe('lazy-import', () => {
  it('wraps heavy imports with React.lazy and Suspense', () => {
    const input = "import { LineChart } from 'recharts';\nexport default function C(){ return <LineChart data={[]} /> }";
    const out = transform({ path: 'file.tsx', source: input }, { jscodeshift } as any, { heavyPackages: ['recharts'] });
    expect(out).toContain("import React, { Suspense } from 'react'");
    expect(out).toContain('React.lazy');
    expect(out).toContain('<Suspense');
    expect(out).toContain('LineChart');
  });
});
