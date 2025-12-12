import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      $lib: resolve(__dirname, './src/lib'),
      $core: resolve(__dirname, './src/core'),
      $canvas: resolve(__dirname, './src/canvas'),
      $components: resolve(__dirname, './src/components'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'MerfolkEditor',
      fileName: 'merfolk-editor',
    },
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
