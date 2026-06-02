# Cobble — VSCode extension

Syntax highlighting for [Cobble](https://github.com/jameymcelveen/homer) `.cobble` files.

The grammar lives at **`syntaxes/cobble.tmLanguage.json`** — the single source of truth shared
with JetBrains via TextMate bundle import (`../jetbrains-textmate/`).

## What gets highlighted

| Element | Example | Scope |
|---------|---------|-------|
| Verb headers | `[WRITE-FILE]` | section keyword |
| Version header | `[COBBLE v=1]` | section + version number |
| Parameters | `name=src/foo.txt` | param key + value |
| Heredoc delimiters | `<%` / `%>` | punctuation |
| Heredoc body | arbitrary content | embedded string (not parsed as code) |
| Variables | `%HOME%`, `%CWD%`, `%ENV:FOO%` | language constant |
| Comments | `# …` | line comment |

## Local install

### Option A — symlink (fastest for dev)

```bash
# macOS / Linux
ln -sf "$(pwd)/editors/vscode" ~/.vscode/extensions/cobble-jameymcelveen
# Reload VSCode window (Cmd+Shift+P → Developer: Reload Window)
```

For **Cursor**, use `~/.cursor/extensions/` instead of `~/.vscode/extensions/`.

### Option B — VSIX package

```bash
cd editors/vscode
npx @vscode/vsce package
code --install-extension cobble-0.3.0.vsix
# Cursor: same path with cursor CLI if available
```

Marketplace publishing is optional and deferred.

## Verify

Open `examples/sample.cobble` from the repo root. You should see:

- `[ROOT]`, `[WRITE-FILE]`, etc. as distinct section headers
- `path=`, `name=`, `marker=`, `id=` keys highlighted separately from values
- `<%` and `%>` delimiters standing out from the heredoc body
- `%CWD%` in parameter values highlighted as a variable token
- `#` comments muted

## Grammar ownership

**Do not copy or fork the grammar into another editor folder.** Edit
`syntaxes/cobble.tmLanguage.json` here; JetBrains picks it up via the symlinked TextMate bundle.
