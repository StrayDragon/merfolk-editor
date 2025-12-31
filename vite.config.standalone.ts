import { defineConfig } from 'vite';
import baseConfig, { pathAliases, sveltePlugin } from './vite.config.base';
import { resolve } from 'path';

export default defineConfig({
  ...baseConfig,
  plugins: [
    sveltePlugin(),
  ],
  resolve: {
    alias: pathAliases
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/lib/standalone.ts'),
      name: 'MerfolkEditor',
      fileName: (format) => (
        format === 'umd' ? 'merfolk-editor.umd.js' : 'merfolk-editor.iife.js'
      ),
      formats: ['iife', 'umd']
    },
    outDir: 'dist/standalone',
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        assetFileNames: 'merfolk-editor.css'
      }
    }
  }
});
