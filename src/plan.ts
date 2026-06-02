import fs from 'node:fs';
import path from 'node:path';
import type { DiffEntry, Op, PlanContext } from './types.js';
import { parse } from './parser.js';
import { resolveRoot, createPathResolver, toRelativePath } from './jail.js';
import { getVerbHandler } from './verbs/registry.js';
import { VirtualFs } from './virtual-fs.js';
import { formatDiff } from './format.js';

export { formatDiff };

/**
 * Parse a .cobble file and expand all blocks into a flat list of ops.
 */
export function buildPlan(
  source: string,
  cwd: string = process.cwd(),
): { root: string; ops: Op[]; version: number } {
  const { version, blocks } = parse(source);
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
    if (block.verb === 'ROOT' || block.verb === 'COBBLE') {
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

  return { root, ops, version };
}

/**
 * Compute human-readable diff entries comparing desired end-state to current disk.
 */
export function computeDiff(root: string, ops: Op[]): DiffEntry[] {
  const baseline = new VirtualFs(root);
  const final = new VirtualFs(root);
  const touchedDirs = new Set<string>();
  const touchedFiles = new Set<string>();

  for (const op of ops) {
    if (op.kind === 'mkdir') {
      touchedDirs.add(op.path);
    } else {
      touchedFiles.add(op.path);
    }
    final.apply(op);
  }

  const entries: DiffEntry[] = [];

  for (const dir of touchedDirs) {
    if (!baseline.dirExists(dir)) {
      entries.push({ action: '+', description: `mkdir ${dir}` });
    }
  }

  for (const file of touchedFiles) {
    const before = baseline.readFile(file);
    const after = final.readFile(file);
    if (before === after) {
      continue;
    }
    if (after === null) {
      entries.push({ action: '-', description: `delete ${file}` });
      continue;
    }
    if (before === null) {
      entries.push({ action: '+', description: `write ${file} (${after.length} bytes)` });
      continue;
    }
    entries.push({
      action: '~',
      description: `update ${file} (${before.length} → ${after.length} bytes)`,
    });
  }

  return entries;
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
