import fs from 'node:fs';
import path from 'node:path';
import type { Op } from './types.js';

/**
 * Tracks planned filesystem state overlaying disk during plan/build.
 * Lets later ops in the same plan see effects of earlier ops.
 */
export class VirtualFs {
  private readonly files = new Map<string, string>();
  private readonly deleted = new Set<string>();
  private readonly dirs = new Set<string>();

  constructor(private readonly root: string) {}

  /** Read effective file content (virtual overlay, then disk). */
  readFile(relativePath: string): string | null {
    if (this.deleted.has(relativePath)) {
      return null;
    }
    const virtual = this.files.get(relativePath);
    if (virtual !== undefined) {
      return virtual;
    }
    const abs = this.absolute(relativePath);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      return fs.readFileSync(abs, 'utf8');
    }
    return null;
  }

  /** Whether a directory exists (virtual or disk). */
  dirExists(relativePath: string): boolean {
    if (this.dirs.has(relativePath)) {
      return true;
    }
    const abs = this.absolute(relativePath);
    return fs.existsSync(abs) && fs.statSync(abs).isDirectory();
  }

  /** Apply an op to the virtual overlay. */
  apply(op: Op): void {
    switch (op.kind) {
      case 'mkdir':
        this.dirs.add(op.path);
        break;
      case 'write':
        this.files.set(op.path, op.content);
        this.deleted.delete(op.path);
        break;
      case 'append': {
        const prior = this.readFile(op.path) ?? '';
        this.files.set(op.path, prior + op.content);
        this.deleted.delete(op.path);
        break;
      }
      case 'replace':
        this.files.set(op.path, op.resultContent);
        this.deleted.delete(op.path);
        break;
      case 'delete':
        this.files.delete(op.path);
        this.deleted.add(op.path);
        break;
    }
  }

  private absolute(relativePath: string): string {
    return path.join(this.root, ...relativePath.split('/'));
  }
}
