import mermaid from 'mermaid';
import type { MermaidConfig } from 'mermaid';

export type MermaidAPI = typeof mermaid;

const initializedMermaidInstances = new WeakSet<object>();

const DEFAULT_MERMAID_CONFIG: MermaidConfig = {
  startOnLoad: false,
  theme: 'default',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: false,
    curve: 'basis',
  },
  securityLevel: 'loose',
};

export function resolveMermaidApi(instance?: MermaidAPI): MermaidAPI {
  if (instance) return instance;
  if (typeof window !== 'undefined') {
    const globalMermaid = (window as typeof window & { mermaid?: MermaidAPI }).mermaid;
    if (globalMermaid) return globalMermaid;
  }
  return mermaid;
}

export function ensureMermaidInitialized(
  api: MermaidAPI,
  config?: MermaidConfig,
  shouldInitialize: boolean = true
): void {
  if (!shouldInitialize) return;

  const key = api as unknown as object;
  if (initializedMermaidInstances.has(key)) return;

  const mergedFlowchart = {
    ...(DEFAULT_MERMAID_CONFIG.flowchart ?? {}),
    ...(config?.flowchart ?? {}),
  };

  const mergedConfig: MermaidConfig = {
    ...DEFAULT_MERMAID_CONFIG,
    ...config,
    flowchart: mergedFlowchart,
    startOnLoad: false,
  };

  api.initialize(mergedConfig);
  initializedMermaidInstances.add(key);
}
