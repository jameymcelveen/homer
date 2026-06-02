import path from 'node:path';
import type { CobbleBlock } from './types.js';
import { resolveVariables } from './variables.js';

/** Error thrown when a path violates the jail root. */
export class JailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JailError';
  }
}

/**
 * Determine the jail root from blocks: explicit [ROOT] or first ENSURE-DIR path.
 */
export function resolveRoot(blocks: CobbleBlock[], cwd: string = process.cwd()): string {
  const rootBlock = blocks.find((b) => b.verb === 'ROOT');
  if (rootBlock) {
    const raw = rootBlock.params['path'];
    if (!raw) {
      throw new JailError('[ROOT] block requires path= parameter');
    }
    const resolved = path.resolve(resolveVariables(raw, cwd));
    validateAbsolutePath(resolved);
    return resolved;
  }

  const firstDir = blocks.find((b) => b.verb === 'ENSURE-DIR');
  if (firstDir) {
    const raw = firstDir.params['path'] ?? firstDir.params['name'];
    if (!raw) {
      throw new JailError('[ENSURE-DIR] block requires path= parameter');
    }
    const resolved = path.resolve(resolveVariables(raw, cwd));
    validateAbsolutePath(resolved);
    return resolved;
  }

  throw new JailError('No [ROOT] block and no [ENSURE-DIR] to infer jail root');
}

/**
 * Resolve a relative path under the jail root after variable substitution.
 * Rejects `..` segments and paths escaping the root.
 */
export function resolveJailedPath(
  root: string,
  relative: string,
  cwd: string = process.cwd(),
): string {
  const resolved = resolveVariables(relative, cwd);

  if (path.isAbsolute(resolved)) {
    const abs = path.resolve(resolved);
    validateAbsolutePath(abs);
    assertUnderRoot(root, abs);
    return abs;
  }

  if (hasParentTraversal(resolved)) {
    throw new JailError(`Path traversal rejected: ${relative}`);
  }

  const joined = path.resolve(root, resolved);
  assertUnderRoot(root, joined);
  return joined;
}

/** Normalize a jailed absolute path to a root-relative posix path. */
export function toRelativePath(root: string, absolute: string): string {
  const rel = path.relative(root, absolute);
  return rel.split(path.sep).join('/');
}

function hasParentTraversal(p: string): boolean {
  const segments = p.split(/[/\\]/);
  return segments.some((s) => s === '..');
}

function validateAbsolutePath(p: string): void {
  if (hasParentTraversal(p)) {
    throw new JailError(`Path traversal rejected in absolute path: ${p}`);
  }
}

function assertUnderRoot(root: string, target: string): void {
  const normalizedRoot = path.resolve(root);
  const normalizedTarget = path.resolve(target);
  const rel = path.relative(normalizedRoot, normalizedTarget);

  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new JailError(`Path escapes jail root: ${target} (root: ${root})`);
  }
}

/** Build a plan-time path resolver bound to a jail root. */
export function createPathResolver(
  root: string,
  cwd: string = process.cwd(),
): (relative: string) => string {
  return (relative: string) => resolveJailedPath(root, relative, cwd);
}
