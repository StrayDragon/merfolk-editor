import { resolve } from 'path';
import { type AliasOptions, defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Common path aliases
export const pathAliases: AliasOptions = {
  '$lib': resolve(__dirname, './src/lib'),
  '$core': resolve(__dirname, './src/core'),
  '$canvas': resolve(__dirname, './src/canvas'),
  '$components': resolve(__dirname, './src/components'),
  '@': resolve(__dirname, 'src')
};

// Common Svelte plugin configuration
export const sveltePlugin = () => svelte({
  compilerOptions: {
    runes: true
  }
});

// Base configuration with shared settings
export default defineConfig({
  plugins: [sveltePlugin()],
  resolve: {
    alias: pathAliases
  }
});
