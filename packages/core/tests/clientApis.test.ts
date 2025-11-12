import { describe, it, expect } from 'vitest';
import { analyzeFile } from '../src/analyzers/fileAnalyzer.js';

describe('clientOnlyAPIs', () => {
  it('detects window/document/navigator usage', () => {
    const src = `
      export const Foo = () => {
        console.log(window.location.href, document.title, navigator.userAgent);
        return <span/>;
      };
    `;
    const r = analyzeFile(src, 'foo.tsx');
    const sig = r.signals.clientOnlyAPIs;
    expect(sig).toBeTruthy();
    expect((sig?.score || 0)).toBeGreaterThanOrEqual(3);
  });
});

