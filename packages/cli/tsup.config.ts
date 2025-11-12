import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/ahx.ts'],
  format: ['esm'],
  sourcemap: true,
  clean: true,
  dts: false,
  outDir: 'dist',
  platform: 'node',
  target: 'es2020',
  // No shebang banner: Node ESM loader may not strip it when invoked via file://,
  // and tests call using `node dist/ahx.js` anyway.
});
