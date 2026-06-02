import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildPlan, computeDiff } from '../plan.js';
import { applyFile } from '../apply.js';
import { checkOnce } from '../once.js';
import { appendStart } from '../markers.js';
import { withTempDir, loadFixture, writeScript } from './helpers.js';

describe('convergent idempotency', () => {
  it('second plan on applied fixture shows no changes', () => {
    withTempDir((tmp) => {
      const sandbox = path.join(tmp, 'sandbox');
      const source = loadFixture('idempotent.cobble', tmp);
      const cobble = writeScript(tmp, 'run.cobble', source);

      applyFile(cobble, { cwd: tmp });
      const { root, ops } = buildPlan(source, tmp);
      assert.equal(computeDiff(root, ops).length, 0);
    });
  });

  it('applying twice yields identical file content', () => {
    withTempDir((tmp) => {
      const source = loadFixture('idempotent.cobble', tmp);
      const cobble = writeScript(tmp, 'run.cobble', source);
      const target = path.join(tmp, 'sandbox', 'stable.txt');

      applyFile(cobble, { cwd: tmp });
      const afterFirst = fs.readFileSync(target, 'utf8');
      applyFile(cobble, { cwd: tmp });
      const afterSecond = fs.readFileSync(target, 'utf8');

      assert.equal(afterFirst, afterSecond);
    });
  });
});

describe('guarded append', () => {
  it('does not duplicate content on re-apply', () => {
    withTempDir((tmp) => {
      const source = loadFixture('guarded-append.cobble', tmp);
      const cobble = writeScript(tmp, 'run.cobble', source);
      const target = path.join(tmp, 'sandbox', 'notes.txt');

      applyFile(cobble, { cwd: tmp });
      const afterFirst = fs.readFileSync(target, 'utf8');
      assert.ok(afterFirst.includes(appendStart('extra')));

      applyFile(cobble, { cwd: tmp });
      const afterSecond = fs.readFileSync(target, 'utf8');
      assert.equal(afterFirst, afterSecond);
    });
  });
});

describe('apply --once', () => {
  it('skips re-apply when hash matches and tree is convergent', () => {
    withTempDir((tmp) => {
      const source = loadFixture('idempotent.cobble', tmp);
      const cobble = writeScript(tmp, 'run.cobble', source);

      applyFile(cobble, { once: true, cwd: tmp });
      const { root, ops } = buildPlan(source, tmp);
      const check = checkOnce(root, source, cobble, ops);
      assert.equal(check.skip, true);
      assert.equal(check.drift, false);
    });
  });

  it('warns on drift instead of silently skipping', () => {
    withTempDir((tmp) => {
      const source = loadFixture('idempotent.cobble', tmp);
      const cobble = writeScript(tmp, 'run.cobble', source);

      applyFile(cobble, { once: true, cwd: tmp });
      fs.writeFileSync(path.join(tmp, 'sandbox', 'stable.txt'), 'drifted', 'utf8');

      const { root, ops } = buildPlan(source, tmp);
      const check = checkOnce(root, source, cobble, ops);
      assert.equal(check.skip, false);
      assert.equal(check.drift, true);
      assert.match(check.message ?? '', /drifted/i);
    });
  });
});

describe('sample fixture tape', () => {
  it('runs plan → apply → empty plan with cleanup', () => {
    withTempDir((tmp) => {
      const sandbox = path.join(tmp, 'examples', 'sandbox');
      const source = fs
        .readFileSync(path.resolve(import.meta.dirname, '../../examples/sample.cobble'), 'utf8')
        .replace(/%CWD%/g, tmp);
      const cobble = writeScript(tmp, 'sample.cobble', source);

      const { root, ops } = buildPlan(source, tmp);
      assert.ok(computeDiff(root, ops).length > 0);

      applyFile(cobble, { cwd: tmp });
      assert.ok(fs.existsSync(path.join(sandbox, 'src', 'hello.txt')));

      const second = buildPlan(source, tmp);
      assert.equal(computeDiff(second.root, second.ops).length, 0);

      fs.rmSync(path.join(sandbox, '.cobble'), { recursive: true, force: true });
    });
  });
});
