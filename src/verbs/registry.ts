import type { VerbHandler } from '../types.js';
import { ensureDir, writeFile, append, replace, deleteFile } from './handlers.js';

/** Registry mapping verb names to their plan-time handlers. */
const registry = new Map<string, VerbHandler>([
  ['ENSURE-DIR', ensureDir],
  ['WRITE-FILE', writeFile],
  ['APPEND', append],
  ['REPLACE', replace],
  ['DELETE-FILE', deleteFile],
]);

/**
 * Look up a verb handler by name.
 * Returns undefined for meta verbs like ROOT that produce no ops.
 */
export function getVerbHandler(verb: string): VerbHandler | undefined {
  return registry.get(verb);
}

/** Register a new verb handler (extension point for future verbs). */
export function registerVerb(verb: string, handler: VerbHandler): void {
  registry.set(verb, handler);
}

/** All registered verb names. */
export function registeredVerbs(): string[] {
  return [...registry.keys()];
}
