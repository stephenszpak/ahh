import type { API, FileInfo } from 'jscodeshift';

// Replaces hydrate(App, el) -> hydrateRoot(App, el)
export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);

  root
    .find(j.CallExpression, {
      callee: { type: 'Identifier', name: 'hydrate' }
    })
    .forEach((p: any) => {
      p.value.callee = j.identifier('hydrateRoot');
    });

  return root.toSource({ quote: 'single' });
}
