import { describe, it, expect } from 'vitest';
import jscodeshift from 'jscodeshift';
import transform from '../src/transforms/replace-hydrate-call.js';

describe('replace-hydrate-call', () => {
  it('renames hydrate to hydrateRoot', () => {
    const input = 'hydrate(App, el);';
    const output = transform({ path: 'file.tsx', source: input }, { jscodeshift } as any);
    expect(output).toContain('hydrateRoot(App, el)');
  });
});

