# HOMER.md — Session bridge (Garfield → Homer)

**Repo:** homer  
**Status:** 🟢 GREEN  
**Last updated:** 2026-06-02

---

## Repo split: Cobble moved out

**Cobble** now lives in its own repo — no PI mixed with product code.

| Repo | Purpose |
|------|---------|
| [github.com/jameymcelveen/homer](https://github.com/jameymcelveen/homer) | Homer PI — Me-Burger, protocols, session bridge |
| [github.com/jameymcelveen/cobble](https://github.com/jameymcelveen/cobble) | Cobble CLI, grammar, editors, tests, npm package |

Homer README links to Cobble. Cobble does **not** link back to Homer or contain PI.

### Cobble repo quick ref

```bash
cd ~/Developer/Cobble   # or clone github.com/jameymcelveen/cobble
make test
make deploy             # npm publish @jameymcelveen/cobble
```

Tags: `v0.3.0` etc. (no `-cobble` suffix needed in the dedicated repo).

---

🖖 Garfield — homer/cobble split complete
