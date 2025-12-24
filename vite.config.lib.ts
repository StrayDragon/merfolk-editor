import { defineConfig } from 'vite';
import baseConfig, { pathAliases, sveltePlugin } from './vite.config.base';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  ...baseConfig,
  plugins: [
    sveltePlugin(),
    dts({
      include: ['src/lib/**/*.ts', 'src/core/**/*.ts'],
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
      fileName: (format) => `lib/index.${format}.js`,
      formats: ['es']
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
