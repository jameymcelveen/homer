import fs from 'node:fs';
import path from 'node:path';
import type { CobbleBlock, DiffEntry, Op, PlanContext } from './types.js';
import { parse } from './parser.js';
import { resolveRoot, createPathResolver, toRelativePath } from './jail.js';
import { getVerbHandler } from './verbs/registry.js';
import { VirtualFs } from './virtual-fs.js';

/**
 * Parse a .cobble file and expand all blocks into a flat list of ops.
 */
export function buildPlan(
  source: string,
  cwd: string = process.cwd(),
): { root: string; ops: Op[] } {
  const blocks = parse(source);
  const root = resolveRoot(blocks, cwd);
  const resolvePath = createPathResolver(root, cwd);
  const vfs = new VirtualFs(root);
  const ctx: PlanContext = {
    root,
    resolvePath,
    readFile: (rel) => vfs.readFile(rel),
  };
  const ops: Op[] = [];

  for (const block of blocks) {
    if (block.verb === 'ROOT') {
      continue;
    }

    const handler = getVerbHandler(block.verb);
    if (!handler) {
      throw new Error(`Unknown verb: ${block.verb}`);
    }

    const blockOps = handler(ctx, block.params, block.body);
    for (const op of blockOps) {
      vfs.apply(op);
    }
    ops.push(...blockOps);
  }

  return { root, ops };
}

/**
 * Compute human-readable diff entries by simulating ops against current disk.
 */
export function computeDiff(root: string, ops: Op[]): DiffEntry[] {
  const entries: DiffEntry[] = [];
  const vfs = new VirtualFs(root);

  for (const op of ops) {
    const entry = diffOp(vfs, op);
    if (entry) {
      entries.push(entry);
    }
    vfs.apply(op);
  }

  return entries;
}

function diffOp(baseline: VirtualFs, op: Op): DiffEntry | null {
  switch (op.kind) {
    case 'mkdir': {
      if (!baseline.dirExists(op.path)) {
        return { action: '+', description: `mkdir ${op.path}` };
      }
      return null;
    }
    case 'write': {
      const prior = baseline.readFile(op.path);
      if (prior === op.content) {
        return null;
      }
      if (prior === null) {
        return { action: '+', description: `write ${op.path} (${op.content.length} bytes)` };
      }
      return {
        action: '~',
        description: `overwrite ${op.path} (${prior.length} → ${op.content.length} bytes)`,
      };
    }
    case 'append': {
      const prior = baseline.readFile(op.path);
      if (prior === null) {
        return { action: '+', description: `append ${op.content.length} bytes to ${op.path}` };
      }
      return { action: '~', description: `append ${op.content.length} bytes to ${op.path}` };
    }
    case 'replace': {
      const prior = baseline.readFile(op.path) ?? '';
      if (prior === op.resultContent) {
        return null;
      }
      return {
        action: '~',
        description: `replace content in ${op.path} (${prior.length} → ${op.resultContent.length} bytes)`,
      };
    }
    case 'delete': {
      if (baseline.readFile(op.path) !== null) {
        return { action: '-', description: `delete ${op.path}` };
      }
      return null;
    }
  }
}

/** Format diff entries for console output. */
export function formatDiff(root: string, entries: DiffEntry[]): string {
  if (entries.length === 0) {
    return `Plan: no changes (root: ${root})`;
  }

  const lines = [`Plan (${entries.length} change${entries.length === 1 ? '' : 's'}, root: ${root}):`];
  for (const e of entries) {
    lines.push(`  ${e.action} ${e.description}`);
  }
  return lines.join('\n');
}

/** Plan from a .cobble file path — side-effect free. */
export function planFile(cobblePath: string, cwd: string = process.cwd()): string {
  const source = fs.readFileSync(cobblePath, 'utf8');
  const { root, ops } = buildPlan(source, cwd);
  const diff = computeDiff(root, ops);
  return formatDiff(root, diff);
}

/** Export for apply: resolve absolute path from op. */
export function opAbsolutePath(root: string, op: Op): string {
  return path.join(root, ...op.path.split('/'));
}

export { toRelativePath };
