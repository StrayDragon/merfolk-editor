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
