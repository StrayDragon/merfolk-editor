import { defineConfig } from 'vite';
import baseConfig, { pathAliases, sveltePlugin } from './vite.config.base';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  ...baseConfig,
  plugins: [
    sveltePlugin(),
    dts({
      include: ['src/lib/**/*.ts', 'src/core/**/*.ts', 'src/**/*.d.ts'],
      exclude: ['**/*.test.ts', '**/*.spec.ts'],
      outDir: 'dist/lib',
      rollupTypes: true,
      insertTypesEntry: true,
    }),
  ],
  resolve: {
    alias: pathAliases
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/lib/index.ts'),
      name: 'MerfolkEditor',
      fileName: (format) => (
        format === 'cjs' ? 'lib/index.cjs' : 'lib/index.es.js'
      ),
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: [
        'svelte',
        'svelte/internal',
        'svelte/store',
        'mermaid',
        'd3',
        '@dagrejs/dagre'
      ],
      output: {
        assetFileNames: 'merfolk-editor[extname]',
        globals: {
          'svelte': 'Svelte',
          'mermaid': 'mermaid',
          'd3': 'd3',
          '@dagrejs/dagre': 'dagre'
        }
      }
    },
    cssCodeSplit: false
  },
});
