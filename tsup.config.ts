import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      index: 'src/core/index.ts',
    },
    format: ['esm'],
    dts: {
      entry: {
        index: 'src/core/index.ts',
      },
    },
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
    minify: false,
    target: 'node18',
    outDir: 'dist',
  },
  {
    entry: {
      cli: 'src/cli/index.ts',
    },
    format: ['esm'],
    splitting: false,
    sourcemap: true,
    treeshake: true,
    minify: false,
    target: 'node18',
    outDir: 'dist',
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
]);
