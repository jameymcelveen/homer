# Cobble

> Declarative filesystem DSL with plan/apply — Terraform for folders, without the shell.

![Cobble in action — plan, apply, done](./assets/fast-typing.gif)

Cobble reads a `.cobble` file (a declarative list of filesystem operations), shows you a
human-readable diff (`plan`), and applies changes only after review (`apply`). Every operation
is jailed to a root directory. **There is no code execution, no shell, no AI invocation — ever.**

Published on npm as **`@jameymcelveen/cobble`** (the unscoped name `cobble` is taken).

---

## Install

```bash
npm install -g @jameymcelveen/cobble
```

Requires **Node.js 18+**. Works on macOS, Linux, and Windows (pure Node — no bash).

From source:

```bash
git clone https://github.com/jameymcelveen/homer.git
cd homer && npm install && npm run build
npm link   # or: node dist/cli.js plan examples/sample.cobble
```

---

## Quickstart

```bash
cobble init                    # creates setup.cobble
cobble plan setup.cobble       # preview changes (writes nothing)
cobble apply setup.cobble      # interactive confirm, then apply
cobble undo                    # revert last apply from journal
```

---

## Grammar

A `.cobble` file is a sequence of blocks:

```
[COBBLE v=1]          # optional format version header

[ROOT]
path=%CWD%/sandbox    # jail root (required, or inferred from first ENSURE-DIR)

[ENSURE-DIR]
path=src

[WRITE-FILE]
name=src/hello.txt
<%
Hello, World!
%>
```

- **`[VERB]`** — block header (uppercase, hyphens allowed)
- **`key=value`** — parameters
- **`<% … %>`** — heredoc body for file content
- **`#`** — comment (outside heredocs)

### Variables (resolved at plan time)

| Token | Meaning |
|-------|---------|
| `%HOME%` | User home directory |
| `%CWD%` | Current working directory |
| `%ENV:NAME%` | Environment variable (error if unset) |

---

## Commands

| Command | Description |
|---------|-------------|
| `cobble plan <file>` | Parse → resolve vars → diff vs disk. **Side-effect free.** Default. |
| `cobble apply <file>` | Show plan, confirm (unless `--yes`), execute, write journal |
| `cobble apply --once <file>` | Migration mode — record script hash; skip if already applied **and** tree matches |
| `cobble undo` | Revert last apply using `.cobble/journal.json` |
| `cobble init [file]` | Drop a starter `.cobble` in the current directory |

Flags: `--yes` / `-y` skip confirmation. `--once` enables the migration ledger.
Set `NO_COLOR=1` to disable chalk coloring.

---

## Verbs (v1)

| Verb | Params | Body | Idempotent behavior |
|------|--------|------|---------------------|
| `ROOT` | `path` | — | Meta — declares jail root |
| `ENSURE-DIR` | `path` | — | **Convergent** — mkdir -p, no-op if exists |
| `WRITE-FILE` | `name` | required | **Convergent** — skip if content matches |
| `APPEND` | `name`, `id` | required | **Guarded** — wraps content in `<!--cobble:append id-->` sentinels; skip if block present |
| `REPLACE` | `name`, `marker` or `find` | required | **Convergent** — marker or literal find/replace |
| `DELETE-FILE` | `name` | — | **Convergent** — skip if already absent |

### REPLACE modes

**Marker** (`marker=id`):

```html
<!--cobble:start id-->…<!--cobble:end-->
```

**Literal** (`find=…`): replaces the find string with the body.

---

## Idempotency model

A `.cobble` file describes a **desired end-state**. Applying it twice yields the same tree;
the second `cobble plan` shows **no changes**. That empty diff is the proof.

- **Convergent verbs** (`ENSURE-DIR`, `WRITE-FILE`, `DELETE-FILE`, `REPLACE`) compare desired vs actual and no-op when matched.
- **Guarded `APPEND`** requires an `id=` parameter. Content is wrapped in sentinel markers so re-runs never duplicate.
- **`apply --once`** (opt-in migration mode) records the script's SHA-256 hash in `.cobble/applied.json`. If the hash was already applied **and** the tree still matches the desired state, apply is skipped. If the tree has **drifted**, Cobble **warns and does not silently skip** — the ledger never overrides reality.

---

## Safety: no exec

Cobble's verb set is the security boundary:

- No `RUN`, `EXEC`, or shell invocation
- No `child_process`, no AI/LLM API calls
- Filesystem operations only, confined to the jail root
- Path traversal (`..`) and out-of-root absolutes rejected at **plan time**

---

## `.cobble/` runtime directory

Under the jail root after apply:

| File | Purpose |
|------|---------|
| `journal.json` | Undo state from the last apply |
| `applied.json` | Migration ledger for `--once` mode |

---

## Examples

### Sample project script

See [`examples/sample.cobble`](./examples/sample.cobble):

```bash
cobble plan examples/sample.cobble
```

### Test fixtures (tape files)

Recorded scenarios live in [`test/fixtures/`](./test/fixtures/) — used by the test suite for
idempotency, guarded append, and `--once` drift checks. Run the suite:

```bash
npm test
```

---

## About this repo

This repository is also **Homer's home** — the Product Owner replicant in Jamey's Bobiverse.
See [`ME-BURGER.md`](./ME-BURGER.md) for persona context and [`HOMER.md`](./HOMER.md) for session status.

Full format spec: [`SPEC.md`](./SPEC.md).

---

🍩 Homer specs · 🖖 Garfield builds
