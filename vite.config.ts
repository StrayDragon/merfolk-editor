import { defineConfig } from 'vite';
import baseConfig, { pathAliases, sveltePlugin } from './vite.config.base';

export default defineConfig({
  ...baseConfig,
  plugins: [sveltePlugin()],
  resolve: {
    alias: pathAliases
  },
  build: {
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
