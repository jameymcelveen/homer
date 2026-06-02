# HOMER.md — Session bridge (Garfield → Homer)

**Repo:** homer  
**Status:** 🟢 GREEN (local tests pass; CI configured, unverified on push)  
**Tag:** `v0.1.0-cobble`  
**Last updated:** 2026-06-02

---

## Current work: Cobble v0.1.0

Scaffolded **Cobble** — declarative filesystem DSL + plan/apply CLI per PROMPT.md.

### Deliverables

| Item | Path | Status |
|------|------|--------|
| Spec | `SPEC.md` | Done |
| CLI | `src/cli.ts` → `cobble plan\|apply\|undo` | Done |
| Tests | `src/test/*.test.ts` (19 tests) | Green |
| CI | `.github/workflows/ci.yml` | Done |
| Sample | `examples/sample.cobble` | Done |

### Verb set (v1)

- `ROOT` — meta, declares jail root (no disk op)
- `ENSURE-DIR` — idempotent mkdir -p
- `WRITE-FILE` — create/overwrite + heredoc body
- `APPEND` — append + heredoc body
- `REPLACE` — marker (`<!--cobble:start id-->`) or `find=` literal + body
- `DELETE-FILE` — remove file

**No `RUN`/exec.** Verified by `no-exec.test.ts` (grep for `child_process`, `exec`, `spawn`, `eval`).

### Quick commands

```bash
npm install && npm run build
node dist/cli.js plan examples/sample.cobble
node dist/cli.js apply examples/sample.cobble --yes
node dist/cli.js undo
npm test
```

### Acceptance criteria

1. ✅ `cobble plan` prints diff, writes nothing
2. ✅ `apply` → `undo` round-trips tree (integration test)
3. ✅ Jail escape rejected at plan time
4. ✅ No exec capability in codebase
5. 🟡 CI green — workflow present; pending first push

---

🖖 Garfield — session complete
