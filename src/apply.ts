import fs from 'node:fs';
import path from 'node:path';
import type { Journal, Op, UndoRecord } from './types.js';
import { buildPlan, opAbsolutePath } from './plan.js';
import { hashScript, recordApplied } from './once.js';

const JOURNAL_DIR = '.cobble';
const JOURNAL_FILE = 'journal.json';

/** Options for apply. */
export interface ApplyOptions {
  once?: boolean;
  cwd?: string;
}

/** Result of an apply operation. */
export interface ApplyResult {
  root: string;
  recordCount: number;
  skipped: boolean;
}

/** Path to the journal file under a jail root. */
export function journalPath(root: string): string {
  return path.join(root, JOURNAL_DIR, JOURNAL_FILE);
}

/** Read the journal from disk; null if none exists. */
export function readJournal(root: string): Journal | null {
  const jp = journalPath(root);
  if (!fs.existsSync(jp)) {
    return null;
  }
  const raw = fs.readFileSync(jp, 'utf8');
  return JSON.parse(raw) as Journal;
}

/** Write journal after a successful apply. */
export function writeJournal(root: string, journal: Journal): void {
  const dir = path.join(root, JOURNAL_DIR);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(journalPath(root), JSON.stringify(journal, null, 2) + '\n', 'utf8');
}

function capturePrior(abs: string): { existed: boolean; content: string | null } {
  if (!fs.existsSync(abs)) {
    return { existed: false, content: null };
  }
  const stat = fs.statSync(abs);
  if (stat.isDirectory()) {
    return { existed: true, content: null };
  }
  return { existed: true, content: fs.readFileSync(abs, 'utf8') };
}

/**
 * Execute planned ops against disk and return undo records.
 */
export function executeOps(root: string, ops: Op[]): UndoRecord[] {
  const records: UndoRecord[] = [];

  for (const op of ops) {
    const abs = opAbsolutePath(root, op);

    switch (op.kind) {
      case 'mkdir': {
        const prior = capturePrior(abs);
        if (prior.existed) {
          break;
        }
        records.push({
          kind: op.kind,
          path: op.path,
          priorContent: prior.content,
          priorExisted: prior.existed,
        });
        fs.mkdirSync(abs, { recursive: true });
        break;
      }
      case 'write': {
        const prior = capturePrior(abs);
        if (prior.content === op.content) {
          break;
        }
        records.push({
          kind: op.kind,
          path: op.path,
          priorContent: prior.content,
          priorExisted: prior.existed,
        });
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, op.content, 'utf8');
        break;
      }
      case 'append': {
        const prior = capturePrior(abs);
        const priorContent = prior.content ?? '';
        if (priorContent.includes(op.content)) {
          break;
        }
        records.push({
          kind: op.kind,
          path: op.path,
          priorContent: prior.content,
          priorExisted: prior.existed,
        });
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.appendFileSync(abs, op.content, 'utf8');
        break;
      }
      case 'replace': {
        const prior = capturePrior(abs);
        if (prior.content === op.resultContent) {
          break;
        }
        records.push({
          kind: op.kind,
          path: op.path,
          priorContent: prior.content,
          priorExisted: prior.existed,
        });
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, op.resultContent, 'utf8');
        break;
      }
      case 'delete': {
        const prior = capturePrior(abs);
        if (!prior.existed || prior.content === null) {
          break;
        }
        records.push({
          kind: op.kind,
          path: op.path,
          priorContent: prior.content,
          priorExisted: prior.existed,
        });
        fs.unlinkSync(abs);
        break;
      }
    }
  }

  return records;
}

/** Apply a .cobble file: execute ops and write journal. */
export function applyFile(
  cobblePath: string,
  options: ApplyOptions = {},
): ApplyResult {
  const cwd = options.cwd ?? process.cwd();
  const source = fs.readFileSync(cobblePath, 'utf8');
  const { root, ops } = buildPlan(source, cwd);
  const records = executeOps(root, ops);

  if (records.length === 0) {
    return { root, recordCount: 0, skipped: true };
  }

  const journal: Journal = {
    timestamp: new Date().toISOString(),
    root,
    records,
  };
  writeJournal(root, journal);

  if (options.once) {
    recordApplied(root, {
      hash: hashScript(source),
      scriptPath: cobblePath,
      appliedAt: new Date().toISOString(),
      root,
    });
  }

  return { root, recordCount: records.length, skipped: false };
}
