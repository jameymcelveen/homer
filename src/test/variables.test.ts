import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { resolveVariables, VariableError } from '../variables.js';

describe('variables', () => {
  it('resolves %HOME% and %CWD%', () => {
    const cwd = '/some/cwd';
    assert.equal(resolveVariables('%HOME%/docs', cwd), path.join(os.homedir(), 'docs'));
    assert.equal(resolveVariables('%CWD%/sandbox', cwd), '/some/cwd/sandbox');
  });

  it('resolves %ENV:NAME%', () => {
    process.env['COBBLE_TEST_VAR'] = 'hello';
    assert.equal(resolveVariables('%ENV:COBBLE_TEST_VAR%/x', '/'), 'hello/x');
    delete process.env['COBBLE_TEST_VAR'];
  });

  it('throws when env var is unset', () => {
    assert.throws(
      () => resolveVariables('%ENV:COBBLE_MISSING_XYZ%', '/'),
      VariableError,
    );
  });
});
