# Cobble — declarative filesystem DSL

Cobble is a small, cross-platform Node CLI that reads a `.cobble` file (a declarative
list of filesystem operations) and applies it safely, plan/apply style (think Terraform,
scoped to a folder). **Filesystem-only — no code execution, ever.**

## Block grammar

A `.cobble` file is a sequence of blocks. Each block:

1. Starts with a `[VERB]` header line (verb name, uppercase, hyphens allowed).
2. Contains zero or more `key=value` parameter lines (whitespace around `=` is trimmed).
3. Optionally ends with a `<% … %>` heredoc body for file content.

```
[ROOT]
path=%CWD%/sandbox

[ENSURE-DIR]
path=src

[WRITE-FILE]
name=src/hello.txt
<%
Hello from Cobble
%>
```

Comments: lines starting with `#` outside heredocs are ignored.

## Root jail

Every operation is confined under a **jail root**:

- A required `[ROOT]` block with `path=…` declares the root, **or**
- The first `[ENSURE-DIR]` block's path becomes the root if no `[ROOT]` is present.

All paths are resolved relative to the jail root. At **plan time**, Cobble rejects:

- Path segments containing `..`
- Absolute paths that resolve outside the jail root

## Variables

Resolved at plan time (before path jail checks):

| Token | Meaning |
|-------|---------|
| `%HOME%` | User home directory (`os.homedir()`) |
| `%CWD%` | Process current working directory |
| `%ENV:NAME%` | Environment variable `NAME` (error if unset) |

Variables may appear in any parameter value.

## v1 verbs

| Verb | Params | Body | Effect |
|------|--------|------|--------|
| `ROOT` | `path` | — | Declares jail root (no disk op) |
| `ENSURE-DIR` | `path` | — | Idempotent `mkdir -p`, jailed |
| `WRITE-FILE` | `name` | required | Create or overwrite file |
| `APPEND` | `name`, `id` | required | Append to file; **guarded** by sentinel markers (see below) |
| `REPLACE` | `name` | required | Replace content via marker or FIND/REPLACE |
| `DELETE-FILE` | `name` | — | Remove file if it exists |

### REPLACE modes

**Marker mode** (params `marker=id`):

```html
<!--cobble:start id-->
... old content ...
<!--cobble:end-->
```

The body replaces the region between start and end markers (markers preserved).

**Literal mode** (params `find=…`):

The body is the replacement text. The `find` value is matched literally in the file.
If `find` is absent, the entire file is replaced.

No raw line-number edits — too brittle.

### Guarded APPEND

`APPEND` requires `id=` (e.g. `id=footer`). Content is wrapped in:

```html
<!--cobble:append footer-->
…body…
<!--cobble:append-end-->
```

If the sentinel block is already present, the append is skipped — re-runs never duplicate.

## Format version header

Optional `[COBBLE v=1]` line or `[COBBLE]` block with `v=1` declares the format version.

## Idempotency

Cobble describes desired end-state. A second `plan` after a successful `apply` shows no changes.
All v1 verbs are convergent or guarded; see README for per-verb behavior.

## Run-once / migration mode

`cobble apply --once` records the script SHA-256 in `.cobble/applied.json`. Re-applying an
identical script is skipped only when the tree still matches the desired state. Drift triggers
a warning — the ledger never silently overrides reality.

## Explicitly excluded

- **No `RUN` / exec verb** in v1. The constrained verb set is the safety boundary.
- No shell invocation, no `child_process`, no eval.

## CLI

```
cobble plan <file.cobble>   # parse → resolve → diff (default, side-effect-free)
cobble apply <file.cobble>  # plan then execute; writes .cobble/journal.json
cobble undo                 # revert last apply from journal
```

`apply` prompts for confirmation unless `--yes` / `-y`.

## Journal

After each successful `apply`, Cobble writes `.cobble/journal.json` under the jail root
capturing prior state sufficient to undo: file contents before mutation, directory
existence, deleted file contents.

`applied.json` in the same directory records script hashes for `--once` migration mode.
