import { Project, SyntaxKind } from 'ts-morph';

export function generateUseVisible(js = false) {
  const header = `import { useEffect, useState, useRef } from 'react';`;
  const refDecl = js ? `const ref = useRef(null);` : `const ref = useRef<HTMLElement | null>(null);`;
  const ret = js ? `return { ref, isVisible: vis };` : `return { ref, isVisible: vis } as const;`;
  return `${header}
export function useVisible(){
  ${refDecl}
  const [vis, setVis] = useState(false);
  useEffect(()=>{ const io = new IntersectionObserver(es=>{ if (es.some(e=>e.isIntersecting)) { setVis(true); io.disconnect(); } }); if (ref.current) io.observe(ref.current as any); return ()=>io.disconnect(); },[]);
  ${ret}
}
`;
}

export default function deferEffect(source: string, fileName = 'file.tsx', minStatements = 5) {
  const project = new Project({ useInMemoryFileSystem: true, skipAddingFilesFromTsConfig: true });
  const file = project.createSourceFile(fileName, source, { overwrite: true });
  const calls = file.getDescendantsOfKind(SyntaxKind.CallExpression);
  let changed = false;
  for (const c of calls.slice()) {
    // Guard against nodes invalidated by previous replacements
    if ((c as any).wasForgotten?.()) continue;
    let expr: any;
    try {
      expr = c.getExpression();
    } catch {
      continue;
    }
    if (expr.getText() !== 'useEffect') continue;
    const first = c.getArguments()[0];
    if (!first) continue;
    if (first.getKind() === SyntaxKind.ArrowFunction || first.getKind() === SyntaxKind.FunctionExpression) {
      const fn: any = first;
      const body = fn.getBody?.();
      if (body && body.getKind() === SyntaxKind.Block) {
        const stmts = (body as any).getStatements();
        if (stmts.length >= minStatements) {
          const original = body.getText();
          body.replaceWithText(`{ const idle = (cb: Function) => ('requestIdleCallback' in window ? (window as any).requestIdleCallback(cb) : setTimeout(cb, 0)); idle(() => ${original}); }`);
          changed = true;
        }
      }
    }
  }
  return changed ? file.getFullText() : source;
}
