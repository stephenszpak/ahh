import { describe, it, expect } from 'vitest';
import transform from '../src/transforms/defer-effect.js';

describe('defer-effect', () => {
  it('wraps heavy effect bodies with idle wrapper', () => {
    const input = `import { useEffect } from 'react';\nexport function C(){ useEffect(()=>{ let a=1; a++; a++; a++; a++; console.log(a); },[]); return null }`;
    const out = transform(input, 'file.tsx', 5);
    expect(out).toContain('requestIdleCallback');
  });
});

