import type { API, FileInfo } from 'jscodeshift';

type Options = { heavyPackages?: string[] };

function ensureReactImports(j: any, root: any) {
  const imports = root.find(j.ImportDeclaration, { source: { value: 'react' } });
  if (imports.size() === 0) {
    root.get().node.program.body.unshift(
      j.importDeclaration([j.importDefaultSpecifier(j.identifier('React')), j.importSpecifier(j.identifier('Suspense'))], j.literal('react'))
    );
  } else {
    imports.forEach((p: any) => {
      const hasDefault = p.value.specifiers?.some((s: any) => s.type === 'ImportDefaultSpecifier');
      const hasSuspense = p.value.specifiers?.some((s: any) => s.imported?.name === 'Suspense');
      if (!hasDefault) p.value.specifiers.unshift(j.importDefaultSpecifier(j.identifier('React')));
      if (!hasSuspense) p.value.specifiers.push(j.importSpecifier(j.identifier('Suspense')));
    });
  }
}

export default function transform(file: FileInfo, api: API, options?: Options) {
  const j = api.jscodeshift;
  const root = j(file.source);
  const heavy = new Set((options?.heavyPackages || ['recharts', 'chart.js', 'echarts']).map((s) => s));

  const lazyMap: Record<string, { local: string; source: string; isDefault: boolean }[]> = {};

  root.find(j.ImportDeclaration).forEach((p: any) => {
    const src = (p.value.source as any).value as string;
    if (!heavy.has(src)) return;
    const specs = p.value.specifiers || [];
    specs.forEach((s: any) => {
      if (!lazyMap[src]) lazyMap[src] = [];
      if (s.type === 'ImportDefaultSpecifier') {
        lazyMap[src].push({ local: s.local.name, source: src, isDefault: true });
      } else if (s.type === 'ImportSpecifier') {
        lazyMap[src].push({ local: s.local?.name || s.imported.name, source: src, isDefault: false });
      }
    });
    // remove the static import; we'll lazily import usages
    j(p).remove();
  });

  if (Object.keys(lazyMap).length === 0) return root.toSource();

  ensureReactImports(j, root);

  // Insert lazy declarations after the last import for stable ordering
  const body = root.get().node.program.body as any[];
  const lastImportIdx = body.reduce((idx, n, i) => (n.type === 'ImportDeclaration' ? i : idx), -1);
  Object.values(lazyMap).forEach((arr) => {
    arr.forEach(({ local, source, isDefault }) => {
      const factory = isDefault
        ? j.arrowFunctionExpression([], j.callExpression(j.import(), [j.literal(source)]))
        : j.arrowFunctionExpression(
            [],
            j.callExpression(j.memberExpression(j.callExpression(j.import(), [j.literal(source)]), j.identifier('then')), [
              j.arrowFunctionExpression([j.identifier('m')], j.objectExpression([j.property('init', j.identifier('default'), j.memberExpression(j.identifier('m'), j.identifier(local)))]))
            ])
          );
      const decl = j.variableDeclaration('const', [
        j.variableDeclarator(
          j.identifier(local),
          j.callExpression(j.memberExpression(j.identifier('React'), j.identifier('lazy')), [factory])
        )
      ]);
      if (lastImportIdx >= 0) {
        body.splice(lastImportIdx + 1, 0, decl);
      } else {
        body.unshift(decl);
      }
    });
  });

  // Wrap JSX usages with Suspense fallback
  root.find(j.JSXElement).forEach((p: any) => {
    const opening = p.value.openingElement;
    if (opening.name.type === 'JSXIdentifier') {
      const name = opening.name.name as string;
      const isLazy = Object.values(lazyMap).some((arr) => arr.some((e) => e.local === name));
      if (isLazy) {
        const fallback = j.jsxExpressionContainer(j.nullLiteral());
        const suspOpen = j.jsxOpeningElement(j.jsxIdentifier('Suspense'), [j.jsxAttribute(j.jsxIdentifier('fallback'), fallback)], false);
        const suspClose = j.jsxClosingElement(j.jsxIdentifier('Suspense'));
        const newEl = j.jsxElement(suspOpen, suspClose, [p.value]);
        j(p).replaceWith(newEl);
      }
    }
  });

  return root.toSource({ quote: 'single' });
}
