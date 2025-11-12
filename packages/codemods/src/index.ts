import type { FileInfo, API } from 'jscodeshift';
export type Codemod = (file: FileInfo, api: API, options?: Record<string, unknown>) => string | null | undefined;

export { default as replaceHydrateCall } from './transforms/replace-hydrate-call.js';
export { default as tsmRenameProp } from './transforms/tsm-rename-prop.js';
export { default as lazyImport } from './transforms/lazy-import.js';
export { default as wrapIsland, generateIsland } from './transforms/wrap-island.js';
export { default as splitChart } from './transforms/split-chart.js';
export { default as deferEffect, generateUseVisible } from './transforms/defer-effect.js';
export { default as clientGate } from './transforms/client-gate.js';

export { runFixes } from './runFixes.js';

export async function runTransform(
  transform: Codemod,
  source: string,
  filePath = 'file.tsx',
  api: API
) {
  return transform({ path: filePath, source }, api, {});
}
