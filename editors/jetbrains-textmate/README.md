# Cobble — JetBrains TextMate bundle

Import Cobble syntax highlighting into **IntelliJ IDEA**, **WebStorm**, **PyCharm**, or any
JetBrains IDE — **no plugin code**, no Kotlin, no Gradle.

This bundle uses the **same grammar** as the VSCode extension:

```
Cobble.tmbundle/Syntaxes/cobble.tmLanguage.json
  → symlink to ../../vscode/syntaxes/cobble.tmLanguage.json
```

## Import steps

1. Clone or locate this repo on disk.
2. Open your JetBrains IDE.
3. Go to **Settings** (macOS: **Preferences**) → **Editor** → **TextMate Bundles**.
4. Click **+** and select:

   ```
   /path/to/homer/editors/jetbrains-textmate/Cobble.tmbundle
   ```

5. Ensure the bundle is **enabled** (checkbox on).
6. Open any `.cobble` file — highlighting should apply automatically by file extension.

If `.cobble` is not associated, check **Settings → Editor → File Types** and confirm `.cobble`
is mapped to the Cobble TextMate grammar (JetBrains usually picks this up from the bundle).

## Verify

Open `examples/sample.cobble`. You should see the same categories as VSCode:

- `[VERB]` headers as section keywords
- `key=value` parameter lines with distinct key/value coloring
- `<% … %>` heredoc delimiters vs body content
- `%HOME%`, `%CWD%`, `%ENV:NAME%` as variable tokens
- `#` line comments

## Deferred: native plugin

A full IntelliJ Platform plugin (completion, validation, structure view) is **explicitly out of
scope**. TextMate import is sufficient for syntax highlighting until there's a real need for more.

## Grammar ownership

Edit **`editors/vscode/syntaxes/cobble.tmLanguage.json` only.** This bundle symlinks to it.
