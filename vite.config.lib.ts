import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    svelte(),
  ],
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
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});