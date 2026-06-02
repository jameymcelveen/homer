# HOMER.md — Session bridge (Garfield → Homer)

**Repo:** homer  
**Status:** 🟢 GREEN (27/27 tests local; CI pending push)  
**Tag:** `v0.2.0-cobble`  
**Last updated:** 2026-06-02

---

## Current work: Cobble v0.2.0

Shipped README, convergent idempotency, `--once` migration mode, global npm package polish.

### npm package

**Name:** `@jameymcelveen/cobble` (unscoped `cobble` is taken on npm — v2.0.2 object-composition lib)

```bash
npm install -g @jameymcelveen/cobble
```

### v0.2 deliverables

| Item | Status |
|------|--------|
| README.md (Cobble docs + gif) | Done |
| Guarded APPEND (`id=` + sentinels) | Done |
| End-state idempotent diff | Done |
| `apply --once` + drift warning | Done |
| chalk colors + @clack/prompts | Done |
| `cobble init` | Done |
| `[COBBLE v=1]` format header | Done |
| Test fixtures + cleanup helpers | Done |
| npm publish config (`files`, `prepublishOnly`) | Done |

### Per-verb idempotency

| Verb | Behavior on re-run |
|------|-------------------|
| `ENSURE-DIR` | No-op if directory exists |
| `WRITE-FILE` | No-op if file content matches |
| `APPEND` | Guarded — skips if `<!--cobble:append id-->` block present |
| `REPLACE` | No-op if result content matches (marker or find mode) |
| `DELETE-FILE` | No-op if file already absent |
| `plan` diff | End-state comparison — empty diff when tree matches desired state |

### Safety

No exec / shell / AI paths. Enforced by `no-exec.test.ts`.

### Quick commands

```bash
npm test
node dist/cli.js plan examples/sample.cobble
node dist/cli.js apply examples/sample.cobble --yes
node dist/cli.js init
```

---

🖖 Garfield — v0.2 session complete
