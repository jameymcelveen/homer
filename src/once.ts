import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Op } from './types.js';
import { computeDiff } from './plan.js';

const COBBLE_DIR = '.cobble';
const APPLIED_FILE = 'applied.json';

/** A recorded apply from --once mode. */
export interface AppliedEntry {
  hash: string;
  scriptPath: string;
  appliedAt: string;
  root: string;
}

/** Migration ledger stored under the jail root. */
export interface AppliedLedger {
  entries: AppliedEntry[];
}

/** Result of checking whether --once should skip apply. */
export interface OnceCheckResult {
  skip: boolean;
  drift: boolean;
  message?: string;
}

/** Path to the applied ledger under a jail root. */
export function appliedPath(root: string): string {
  return path.join(root, COBBLE_DIR, APPLIED_FILE);
}

/** SHA-256 hash of script source for the migration ledger. */
export function hashScript(source: string): string {
  return crypto.createHash('sha256').update(source).digest('hex');
}

/** Read the applied ledger; empty if missing. */
export function readApplied(root: string): AppliedLedger {
  const ap = appliedPath(root);
  if (!fs.existsSync(ap)) {
    return { entries: [] };
  }
  return JSON.parse(fs.readFileSync(ap, 'utf8')) as AppliedLedger;
}

/** Append an entry to the applied ledger. */
export function recordApplied(root: string, entry: AppliedEntry): void {
  const ledger = readApplied(root);
  const withoutDup = ledger.entries.filter((e) => e.hash !== entry.hash);
  withoutDup.push(entry);
  const dir = path.join(root, COBBLE_DIR);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    appliedPath(root),
    JSON.stringify({ entries: withoutDup }, null, 2) + '\n',
    'utf8',
  );
}

/**
 * Decide whether --once should skip apply.
 * Never skips when the tree has drifted from the desired end-state.
 */
export function checkOnce(
  root: string,
  source: string,
  scriptPath: string,
  ops: Op[],
): OnceCheckResult {
  const hash = hashScript(source);
  const ledger = readApplied(root);
  const prior = ledger.entries.find((e) => e.hash === hash);

  if (!prior) {
    return { skip: false, drift: false };
  }

  const diff = computeDiff(root, ops);
  if (diff.length > 0) {
    return {
      skip: false,
      drift: true,
      message:
        `Script was already applied (${hash.slice(0, 12)}…) but the tree has drifted ` +
        `(${diff.length} pending change(s)). Will not silently skip — review plan and apply manually.`,
    };
  }

  return {
    skip: true,
    drift: false,
    message: 'Script already applied and tree matches desired state. Nothing to do.',
  };
}
