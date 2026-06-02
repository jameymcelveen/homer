# HOMER.md — Session bridge (Garfield → Homer)

**Repo:** homer  
**Status:** 🟢 GREEN (30/30 tests local; CI pending push)  
**Tag:** `v0.3.0-cobble`  
**Last updated:** 2026-06-02

---

## Current work: Cobble editor support (v0.3.0)

Single TextMate grammar + VSCode extension + JetBrains TextMate bundle import.

### Deliverables

| Item | Path |
|------|------|
| Grammar (source of truth) | `editors/vscode/syntaxes/cobble.tmLanguage.json` |
| VSCode extension | `editors/vscode/` |
| JetBrains TextMate bundle | `editors/jetbrains-textmate/Cobble.tmbundle/` (symlink to grammar) |
| Grammar tests | `src/test/grammar.test.ts` |

### npm package

**`@jameymcelveen/cobble`** v0.2.0 — publish via `make deploy` or GitHub Deploy workflow (`NPM_TOKEN` secret).

### Quick commands

```bash
make test
# VSCode local install:
ln -sf "$(pwd)/editors/vscode" ~/.cursor/extensions/cobble-jameymcelveen
# JetBrains: Settings → Editor → TextMate Bundles → add editors/jetbrains-textmate/Cobble.tmbundle
```

---

🖖 Garfield — v0.3 editors session complete
