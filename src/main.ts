import { mount } from 'svelte';
import App from './App.svelte';
import DebugApp from './DebugApp.svelte';

// Check for debug mode via URL parameter
const urlParams = new URLSearchParams(window.location.search);
const isDebugMode = urlParams.get('debug') === 'true';

// Mount the appropriate app
const AppComponent = isDebugMode ? DebugApp : App;
const app = mount(AppComponent, {
  target: document.getElementById('app')!,
});

export default app;

// Export core modules for library usage
export * from './core';
export * from './canvas';
