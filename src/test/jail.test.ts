import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { resolveJailedPath, resolveRoot, JailError } from '../jail.js';
import type { CobbleBlock } from '../types.js';

describe('jail', () => {
  const root = path.resolve('/tmp/cobble-jail-test');
  const cwd = '/tmp/cobble-jail-test';

  it('resolves root from [ROOT] block', () => {
    const blocks: CobbleBlock[] = [{ verb: 'ROOT', params: { path: '/tmp/myroot' } }];
    assert.equal(resolveRoot(blocks, cwd), path.resolve('/tmp/myroot'));
  });

  it('rejects .. traversal in relative paths', () => {
    assert.throws(
      () => resolveJailedPath(root, '../etc/passwd', cwd),
      JailError,
    );
  });

  it('rejects absolute paths outside root', () => {
    assert.throws(
      () => resolveJailedPath(root, '/etc/passwd', cwd),
      JailError,
    );
  });

  it('allows paths under root', () => {
    const resolved = resolveJailedPath(root, 'src/foo.txt', cwd);
    assert.equal(resolved, path.resolve(root, 'src/foo.txt'));
  });
});
