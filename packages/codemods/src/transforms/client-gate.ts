import type { API, FileInfo } from 'jscodeshift';

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // Add 'use client' if missing and file references window/document
  const hasClientRefs =
    root
      .find(j.Identifier)
      .filter((p: any) => ['window', 'document'].includes((p.value as any).name))
      .size() > 0;
  if (hasClientRefs) {
    const first = root.get().node.program.body[0];
    const isDirective = first && (first as any).expression && (first as any).expression.value === 'use client';
    if (!isDirective) {
      root.get().node.program.body.unshift(j.expressionStatement(j.literal('use client')));
    }
  }

  // Wrap top-level statements accessing window/document
  root.find(j.ExpressionStatement).forEach((p: any) => {
    const txt = (p.value as any).expression && (p.value as any).expression.type ? j(p).toSource() : '';
    if (/\bwindow\b|\bdocument\b/.test(txt)) {
      const wrapped = j.ifStatement(
        j.binaryExpression('!==', j.unaryExpression('typeof', j.identifier('window')), j.literal('undefined')),
        j.blockStatement([p.value as any])
      );
      j(p).replaceWith(wrapped);
    }
  });

  return root.toSource({ quote: 'single' });
}
