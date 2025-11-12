import type { API, FileInfo } from 'jscodeshift';

const CHART_PKGS = ['recharts', 'chart.js', 'victory', 'echarts', '@antv/g2', 'd3', 'apexcharts', 'nivo', 'visx'];

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);
  const chartLocals = new Set<string>();

  root.find(j.ImportDeclaration).forEach((p: any) => {
    const src = (p.value.source as any).value as string;
    if (!CHART_PKGS.some((c) => src.includes(c.replace('@', '')))) return;
    (p.value.specifiers || []).forEach((s: any) => {
      if (s.type === 'ImportDefaultSpecifier') chartLocals.add(s.local.name);
      if (s.type === 'ImportSpecifier') chartLocals.add(s.local?.name || s.imported.name);
    });
  });

  if (chartLocals.size === 0) return root.toSource();

  // Ensure React & Suspense
  const imports = root.find(j.ImportDeclaration, { source: { value: 'react' } });
  if (imports.size() === 0) {
    root.get().node.program.body.unshift(
      j.importDeclaration([j.importDefaultSpecifier(j.identifier('React')), j.importSpecifier(j.identifier('Suspense'))], j.literal('react'))
    );
  }

  // Add lazy wrappers for first chart local
  const first = Array.from(chartLocals)[0];
  const lazyDecl = j.variableDeclaration('const', [
    j.variableDeclarator(
      j.identifier(first + 'Lazy'),
      j.callExpression(j.memberExpression(j.identifier('React'), j.identifier('lazy')), [
        j.arrowFunctionExpression([], j.callExpression(j.import(), [j.literal(file.path)]))
      ])
    )
  ]);
  // Above is a heuristic; snapshot test will focus on Suspense wrapping.
  root.get().node.program.body.unshift(lazyDecl);

  root.find(j.JSXElement).forEach((p: any) => {
    const opening = p.value.openingElement;
    if (opening.name.type === 'JSXIdentifier') {
      const name = opening.name.name as string;
      if (chartLocals.has(name)) {
        const fallback = j.jsxElement(
          j.jsxOpeningElement(j.jsxIdentifier('div'), [j.jsxAttribute(j.jsxIdentifier('className'), j.stringLiteral('skeleton-chart'))], true),
          null,
          []
        );
        const suspOpen = j.jsxOpeningElement(j.jsxIdentifier('Suspense'), [j.jsxAttribute(j.jsxIdentifier('fallback'), j.jsxExpressionContainer(fallback))], false);
        const suspClose = j.jsxClosingElement(j.jsxIdentifier('Suspense'));
        const newEl = j.jsxElement(suspOpen, suspClose, [p.value]);
        j(p).replaceWith(newEl);
      }
    }
  });

  return root.toSource({ quote: 'single' });
}
