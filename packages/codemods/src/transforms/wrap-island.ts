import type { API, FileInfo } from 'jscodeshift';

type Options = { target?: string; mode?: 'visible' | 'idle' };

export function generateIsland() {
  return `import React, { useEffect, useRef, useState } from 'react';
type Mode = 'visible' | 'idle';
export default function Island({ children, mode = 'visible' as Mode }: { children: React.ReactNode; mode?: Mode }){
  const [hydrated, setHydrated] = useState(mode === 'idle' ? false : false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (mode === 'idle') {
      const cb = () => setHydrated(true);
      if ('requestIdleCallback' in window) (window as any).requestIdleCallback(cb); else setTimeout(cb, 0);
      return;
    }
    if (mode === 'visible' && ref.current) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some(e => e.isIntersecting)) { setHydrated(true); io.disconnect(); }
      });
      io.observe(ref.current);
      return () => io.disconnect();
    }
  }, [mode]);
  return <div ref={ref}>{hydrated ? children : null}</div>;
}
`;
}

export default function transform(file: FileInfo, api: API, options?: Options) {
  const j = api.jscodeshift;
  const root = j(file.source);
  const target = options?.target; // if unspecified, no-op
  if (!target) return root.toSource();

  // ensure Island import
  const imp = j.importDeclaration([j.importDefaultSpecifier(j.identifier('Island'))], j.literal('@/components/Island'));
  const firstImport = root.find(j.ImportDeclaration).at(0);
  if (firstImport.size() > 0) firstImport.insertBefore(imp); else root.get().node.program.body.unshift(imp);

  root.find(j.JSXElement, { openingElement: { name: { type: 'JSXIdentifier', name: target } } }).forEach((p: any) => {
    const islandOpen = j.jsxOpeningElement(j.jsxIdentifier('Island'), [j.jsxAttribute(j.jsxIdentifier('mode'), j.stringLiteral(options?.mode || 'visible'))]);
    const islandClose = j.jsxClosingElement(j.jsxIdentifier('Island'));
    const wrapped = j.jsxElement(islandOpen, islandClose, [p.value]);
    j(p).replaceWith(wrapped);
  });

  return root.toSource({ quote: 'single' });
}
