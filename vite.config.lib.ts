import { defineConfig } from 'vite';
import baseConfig, { pathAliases, sveltePlugin } from './vite.config.base';
import { resolve } from 'path';

export default defineConfig({
  ...baseConfig,
  plugins: [sveltePlugin()],
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
