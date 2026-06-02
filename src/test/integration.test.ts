import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildPlan, computeDiff } from '../plan.js';
import { applyFile } from '../apply.js';
import { undoLast } from '../undo.js';
import { registeredVerbs } from '../verbs/registry.js';
import { withTempDir } from './helpers.js';

describe('verbs registry', () => {
  it('registers all v1 verbs', () => {
    const verbs = registeredVerbs().sort();
    assert.deepEqual(verbs, [
      'APPEND',
      'DELETE-FILE',
      'ENSURE-DIR',
      'REPLACE',
      'WRITE-FILE',
    ]);
  });
});

describe('plan', () => {
  it('writes nothing to disk', () => {
    withTempDir((tmp) => {
      const cobble = path.join(tmp, 'test.cobble');
      fs.writeFileSync(
        cobble,
        `[ROOT]
path=${tmp}/sandbox

[WRITE-FILE]
name=out.txt
<%
planned content
%>
`,
      );

      const before = fs.readdirSync(tmp);
      buildPlan(fs.readFileSync(cobble, 'utf8'), tmp);
      const after = fs.readdirSync(tmp);
      assert.deepEqual(before, after);
      assert.equal(fs.existsSync(path.join(tmp, 'sandbox')), false);
    });
  });
});

describe('apply and undo', () => {
  it('round-trips tree to original state', () => {
    withTempDir((tmp) => {
      const sandbox = path.join(tmp, 'sandbox');
      const cobble = path.join(tmp, 'test.cobble');

      fs.writeFileSync(
        cobble,
        `[ROOT]
path=${sandbox}

[ENSURE-DIR]
path=src

[WRITE-FILE]
name=src/hello.txt
<%
initial
%>

[APPEND]
name=src/hello.txt
id=tail
<%
 appended
%>
`,
      );

      applyFile(cobble, { cwd: tmp });

      const helloPath = path.join(sandbox, 'src', 'hello.txt');
      assert.equal(fs.existsSync(helloPath), true);
      assert.ok(fs.readFileSync(helloPath, 'utf8').includes('initial'));
      assert.ok(fs.readFileSync(helloPath, 'utf8').includes('appended'));

      undoLast(sandbox);

      assert.equal(fs.existsSync(helloPath), false);
      assert.equal(fs.existsSync(path.join(sandbox, 'src')), false);
    });
  });
});

describe('replace verb', () => {
  it('supports find/replace literal mode', () => {
    withTempDir((tmp) => {
      const sandbox = path.join(tmp, 'sandbox');
      fs.mkdirSync(sandbox, { recursive: true });
      fs.writeFileSync(path.join(sandbox, 'file.txt'), 'foo bar foo');

      const cobble = path.join(tmp, 'test.cobble');
      fs.writeFileSync(
        cobble,
        `[ROOT]
path=${sandbox}

[REPLACE]
name=file.txt
find=bar
<%
baz
%>
`,
      );

      applyFile(cobble, { cwd: tmp });
      assert.equal(fs.readFileSync(path.join(sandbox, 'file.txt'), 'utf8'), 'foo baz foo');
      undoLast(sandbox);
      assert.equal(fs.readFileSync(path.join(sandbox, 'file.txt'), 'utf8'), 'foo bar foo');
    });
  });
});

describe('delete verb', () => {
  it('deletes file and undo restores it', () => {
    withTempDir((tmp) => {
      const sandbox = path.join(tmp, 'sandbox');
      fs.mkdirSync(sandbox, { recursive: true });
      fs.writeFileSync(path.join(sandbox, 'gone.txt'), 'keep me');

      const cobble = path.join(tmp, 'test.cobble');
      fs.writeFileSync(
        cobble,
        `[ROOT]
path=${sandbox}

[DELETE-FILE]
name=gone.txt
`,
      );

      applyFile(cobble, { cwd: tmp });
      assert.equal(fs.existsSync(path.join(sandbox, 'gone.txt')), false);

      undoLast(sandbox);
      assert.equal(fs.readFileSync(path.join(sandbox, 'gone.txt'), 'utf8'), 'keep me');
    });
  });
});

describe('jail rejection at plan time', () => {
  it('rejects escape attempt during buildPlan', () => {
    const source = `[ROOT]
path=/tmp/sandbox

[WRITE-FILE]
name=../../etc/passwd
<%
bad
%>
`;
    assert.throws(() => buildPlan(source));
  });
});

describe('computeDiff', () => {
  it('reports no changes when disk matches plan', () => {
    withTempDir((tmp) => {
      const sandbox = path.join(tmp, 'sandbox');
      fs.mkdirSync(path.join(sandbox, 'src'), { recursive: true });
      fs.writeFileSync(path.join(sandbox, 'src', 'a.txt'), 'same');

      const { root, ops } = buildPlan(
        `[ROOT]
path=${sandbox}

[WRITE-FILE]
name=src/a.txt
<%
same
%>
`,
        tmp,
      );

      const diff = computeDiff(root, ops);
      assert.equal(diff.length, 0);
    });
  });
});
