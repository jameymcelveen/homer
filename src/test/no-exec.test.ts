import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '..');

const FORBIDDEN = [
  /child_process/,
  /\bexec\s*\(/,
  /\bexecSync\s*\(/,
  /\bspawn\s*\(/,
  /\bspawnSync\s*\(/,
  /\beval\s*\(/,
  /new\s+Function\s*\(/,
];

function collectTsFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'test') {
      files.push(...collectTsFiles(full));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      files.push(full);
    }
  }
  return files;
}

describe('no-exec guarantee', () => {
  it('source contains no shell/exec APIs', () => {
    const files = collectTsFiles(srcDir);
    const violations: string[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      for (const pattern of FORBIDDEN) {
        if (pattern.test(content)) {
          violations.push(`${path.relative(srcDir, file)}: ${pattern}`);
        }
      }
    }

    assert.equal(violations.length, 0, violations.join('\n'));
  });
});
