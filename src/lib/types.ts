import type { MermaidConfig } from 'mermaid';
import type { SyncEngineOptions } from '../core/sync/SyncEngine';
import type { MermaidAPI } from '../core/utils/mermaid';

export type { MermaidAPI };

export type CodeChangeSource = 'external' | 'canvas' | 'code';

export interface CodeChangeMeta {
  source: CodeChangeSource;
  silent?: boolean;
}

export interface SetCodeOptions {
  notify?: boolean;
  silent?: boolean;
  source?: CodeChangeSource;
}

export interface EditorStrings {
  toolbar?: {
    title?: string;
    code?: string;
    shapes?: string;
    clearDraft?: string;
    zoomIn?: string;
    zoomOut?: string;
    fitToView?: string;
  };
  codePanel?: {
    title?: string;
    placeholder?: string;
    errorLabel?: string;
  };
  overlay?: {
    editingTitle?: string;
    editingText?: string;
    editingHint?: string;
  };
  helpPanel?: {
    title?: string;
    nodeSection?: string;
    edgeSection?: string;
    viewSection?: string;
    readonlyHintTitle?: string;
    readonlyHintText?: string;
  };
}

export interface EditorOptions {
  /** Initial Mermaid code */
  initialCode?: string;
  /** Code change callback */
  onCodeChange?: (code: string, meta: CodeChangeMeta) => void;
  /** Clear draft callback */
  onClearDraft?: () => void;
  /** Debounced sync delay after canvas edits (ms) */
  syncDelay?: number;
  /** Sync engine options */
  sync?: SyncEngineOptions;
  /** Read-only mode */
  readOnly?: boolean;
  /** Initial code panel visibility */
  showCodePanel?: boolean;
  /** UI string overrides */
  strings?: EditorStrings;
  /** Mermaid instance to reuse external config */
  mermaid?: MermaidAPI;
  /** Mermaid initialization config */
  mermaidConfig?: MermaidConfig;
  /** Initialize Mermaid when no external instance is provided */
  initializeMermaid?: boolean;
  /** Auto fit when the container resizes */
  autoFitOnResize?: boolean;
}
