import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const grammarPath = path.join(repoRoot, 'editors/vscode/syntaxes/cobble.tmLanguage.json');
const jetbrainsLink = path.join(
  repoRoot,
  'editors/jetbrains-textmate/Cobble.tmbundle/Syntaxes/cobble.tmLanguage.json',
);

describe('cobble TextMate grammar', () => {
  it('grammar file parses as valid JSON with expected structure', () => {
    const raw = fs.readFileSync(grammarPath, 'utf8');
    const grammar = JSON.parse(raw) as {
      scopeName: string;
      repository: Record<string, unknown>;
    };

    assert.equal(grammar.scopeName, 'source.cobble');
    assert.ok(grammar.repository['verb-header']);
    assert.ok(grammar.repository['params']);
    assert.ok(grammar.repository['heredoc']);
    assert.ok(grammar.repository['variables']);
    assert.ok(grammar.repository['comments']);
  });

  it('jetbrains bundle symlinks to the same grammar file', () => {
    assert.ok(fs.existsSync(jetbrainsLink), 'jetbrains symlink missing');
    const resolved = fs.realpathSync(jetbrainsLink);
    const expected = fs.realpathSync(grammarPath);
    assert.equal(resolved, expected);
  });

  it('vscode extension package contributes cobble language', () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(repoRoot, 'editors/vscode/package.json'), 'utf8'),
    ) as {
      contributes: { languages: { id: string; extensions: string[] }[] };
    };

    const lang = pkg.contributes.languages.find((l) => l.id === 'cobble');
    assert.ok(lang);
    assert.deepEqual(lang?.extensions, ['.cobble']);
  });
});
