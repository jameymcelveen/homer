import fs from 'node:fs';
import path from 'node:path';
import type { Op, UndoRecord } from './types.js';
import { readJournal, journalPath } from './apply.js';
import { opAbsolutePath } from './plan.js';

/**
 * Revert the last apply using the journal. Returns number of records undone.
 */
export function undoLast(root?: string): number {
  const resolvedRoot = root ?? findJournalRoot();
  if (!resolvedRoot) {
    throw new Error('No journal found to undo');
  }

  const journal = readJournal(resolvedRoot);
  if (!journal) {
    throw new Error(`No journal at ${journalPath(resolvedRoot)}`);
  }

  const records = [...journal.records].reverse();
  for (const record of records) {
    revertRecord(journal.root, record);
  }

  fs.unlinkSync(journalPath(journal.root));
  const journalDir = path.dirname(journalPath(journal.root));
  if (fs.readdirSync(journalDir).length === 0) {
    fs.rmdirSync(journalDir);
  }

  return records.length;
}

function revertRecord(root: string, record: UndoRecord): void {
  const abs = opAbsolutePath(root, { kind: record.kind, path: record.path } as Op);

  switch (record.kind) {
    case 'mkdir': {
      if (!record.priorExisted && fs.existsSync(abs)) {
        try {
          fs.rmdirSync(abs);
        } catch {
          // Directory may not be empty if later ops added files; leave it
        }
      }
      break;
    }
    case 'write':
    case 'append':
    case 'replace': {
      if (!record.priorExisted) {
        if (fs.existsSync(abs)) {
          fs.unlinkSync(abs);
        }
      } else if (record.priorContent !== null) {
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, record.priorContent, 'utf8');
      }
      break;
    }
    case 'delete': {
      if (record.priorExisted && record.priorContent !== null) {
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, record.priorContent, 'utf8');
      }
      break;
    }
  }
}

/** Walk up from cwd looking for .cobble/journal.json. */
function findJournalRoot(): string | null {
  let dir = process.cwd();
  for (;;) {
    const jp = journalPath(dir);
    if (fs.existsSync(jp)) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
}
