/** A parsed block from a .cobble file. */
export interface CobbleBlock {
  verb: string;
  params: Record<string, string>;
  body?: string;
}

/** Kinds of filesystem operations Cobble may perform. */
export type OpKind = 'mkdir' | 'write' | 'append' | 'replace' | 'delete';

/** Base fields shared by all operations. */
export interface OpBase {
  kind: OpKind;
  /** Path relative to jail root, normalized with forward slashes. */
  path: string;
}

/** Create a directory (mkdir -p). */
export interface MkdirOp extends OpBase {
  kind: 'mkdir';
}

/** Create or overwrite a file. */
export interface WriteOp extends OpBase {
  kind: 'write';
  content: string;
}

/** Append content to a file. */
export interface AppendOp extends OpBase {
  kind: 'append';
  content: string;
}

/** Replace file content (marker or literal find). */
export interface ReplaceOp extends OpBase {
  kind: 'replace';
  newContent: string;
  /** Full file content after replacement (computed at plan time). */
  resultContent: string;
}

/** Delete a file. */
export interface DeleteOp extends OpBase {
  kind: 'delete';
}

export type Op = MkdirOp | WriteOp | AppendOp | ReplaceOp | DeleteOp;

/** Context passed to verb handlers during planning. */
export interface PlanContext {
  root: string;
  resolvePath: (relative: string) => string;
  /** Read effective file content at plan time (prior ops + disk). */
  readFile: (relativePath: string) => string | null;
}

/** Handler signature for a registered verb. */
export type VerbHandler = (
  ctx: PlanContext,
  params: Record<string, string>,
  body: string | undefined,
) => Op[];

/** A single undo record capturing pre-apply state. */
export interface UndoRecord {
  kind: OpKind;
  path: string;
  /** File content before the op; null if file did not exist. */
  priorContent: string | null;
  /** Whether the path existed before the op (file or directory). */
  priorExisted: boolean;
}

/** Journal written after each successful apply. */
export interface Journal {
  timestamp: string;
  root: string;
  records: UndoRecord[];
}

/** Human-readable plan diff entry. */
export interface DiffEntry {
  action: '+' | '~' | '-';
  description: string;
}
