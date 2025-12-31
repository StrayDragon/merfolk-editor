/**
 * Unified logging utility for Merfolk Editor
 * Provides consistent log formatting with component prefixes
 */

const LOG_PREFIX = '[MerfolkEditor]';
const globalProcess =
  typeof globalThis !== 'undefined'
    ? (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process
    : undefined;
const isDev =
  (typeof import.meta !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV) ??
  (globalProcess?.env?.NODE_ENV !== 'production');

interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  createPrefix: (prefix: string) => Logger;
}

// Create a logger with a specific component prefix
function createLogger(componentPrefix: string): Logger {
  const prefix = `${LOG_PREFIX} [${componentPrefix}]`;

  return {
    debug: (...args: unknown[]) => {
      if (isDev) {
        console.debug(prefix, ...args);
      }
    },
    info: (...args: unknown[]) => {
      console.info(prefix, ...args);
    },
    warn: (...args: unknown[]) => {
      console.warn(prefix, ...args);
    },
    error: (...args: unknown[]) => {
      console.error(prefix, ...args);
    },
    createPrefix: (subPrefix: string) => createLogger(`${componentPrefix}/${subPrefix}`),
  };
}

// Default logger for Merfolk Editor core
export const logger: Logger = createLogger('Merfolk');

// Component-specific loggers
export const interactiveCanvasLogger = logger.createPrefix('InteractiveCanvas');
export const parserLogger = logger.createPrefix('Parser');
export const serializerLogger = logger.createPrefix('Serializer');
export const syncEngineLogger = logger.createPrefix('SyncEngine');
