import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Create a temp directory removed automatically after the callback. */
export function withTempDir<T>(fn: (tmp: string) => T): T {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cobble-test-'));
  try {
    return fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/** Resolve a fixture path from repo root (works in src and dist test runs). */
export function fixturePath(name: string): string {
  const here = import.meta.dirname;
  const fromDist = path.resolve(here, '../../test/fixtures', name);
  if (fs.existsSync(fromDist)) {
    return fromDist;
  }
  return path.resolve(here, '../../../test/fixtures', name);
}

/** Substitute %CWD% in fixture source with an absolute sandbox path. */
export function loadFixture(name: string, sandbox: string): string {
  const raw = fs.readFileSync(fixturePath(name), 'utf8');
  return raw.replace(/%CWD%/g, sandbox);
}

/** Write a cobble script into a temp dir, returning its path. */
export function writeScript(tmp: string, name: string, source: string): string {
  const file = path.join(tmp, name);
  fs.writeFileSync(file, source, 'utf8');
  return file;
}
