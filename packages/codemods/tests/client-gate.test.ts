import { describe, it, expect } from 'vitest';
import jscodeshift from 'jscodeshift';
import transform from '../src/transforms/client-gate.js';

describe('client-gate', () => {
  it('adds use client and guards window/document', () => {
    const input = `console.log(window.location.href); export function C(){ return <div/> }`;
    const out = transform({ path: 'file.tsx', source: input }, { jscodeshift } as any);
    expect(out).toContain("'use client'");
    expect(out).toContain('typeof window !==');
  });
});

