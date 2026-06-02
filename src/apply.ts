import fs from 'node:fs';
import path from 'node:path';
import type { Journal, Op, UndoRecord } from './types.js';
import { buildPlan, opAbsolutePath } from './plan.js';

const JOURNAL_DIR = '.cobble';
const JOURNAL_FILE = 'journal.json';

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
        records.push({
          kind: op.kind,
          path: op.path,
          priorContent: prior.content,
          priorExisted: prior.existed,
        });
        if (prior.existed && prior.content !== null) {
          fs.unlinkSync(abs);
        }
        break;
      }
    }
  }

  return records;
}

/** Apply a .cobble file: execute ops and write journal. */
export function applyFile(
  cobblePath: string,
  cwd: string = process.cwd(),
): { root: string; recordCount: number } {
  const source = fs.readFileSync(cobblePath, 'utf8');
  const { root, ops } = buildPlan(source, cwd);
  const records = executeOps(root, ops);

  const journal: Journal = {
    timestamp: new Date().toISOString(),
    root,
    records,
  };
  writeJournal(root, journal);

  return { root, recordCount: records.length };
}
