import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parse, ParseError } from '../parser.js';

describe('parser', () => {
  it('parses blocks with params and heredoc body', () => {
    const source = `
[ROOT]
path=/tmp/test

[WRITE-FILE]
name=foo.txt
<%
hello
world
%>
`;
    const { version, blocks } = parse(source);
    assert.equal(version, 1);
    assert.equal(blocks.length, 2);
    assert.equal(blocks[0]?.verb, 'ROOT');
    assert.equal(blocks[0]?.params['path'], '/tmp/test');
    assert.equal(blocks[1]?.verb, 'WRITE-FILE');
    assert.equal(blocks[1]?.params['name'], 'foo.txt');
    assert.equal(blocks[1]?.body, 'hello\nworld');
  });

  it('parses [COBBLE v=1] format header', () => {
    const { version, blocks } = parse('[COBBLE v=1]\n\n[ROOT]\npath=/tmp\n');
    assert.equal(version, 1);
    assert.equal(blocks.length, 1);
  });

  it('parses [COBBLE] block with v= param', () => {
    const { version } = parse('[COBBLE]\nv=1\n\n[ROOT]\npath=/tmp\n');
    assert.equal(version, 1);
  });

  it('ignores comments and blank lines', () => {
    const { blocks } = parse('# comment\n\n[ENSURE-DIR]\npath=src\n');
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0]?.verb, 'ENSURE-DIR');
  });

  it('throws on unclosed heredoc', () => {
    assert.throws(() => parse('[WRITE-FILE]\nname=x\n<%\nbody'), ParseError);
  });

  it('throws on unknown line format', () => {
    assert.throws(() => parse('not a block'), ParseError);
  });
});
