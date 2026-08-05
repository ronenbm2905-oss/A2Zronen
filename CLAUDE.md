@AGENTS.md

# Vault protocol — mandatory

The project vault at `vault/` is long-term memory for this codebase. Invoke the
**`obsidian-vault-workflow`** skill at the **start of every task** and at the
**end of every task** — coding, architecture, UI, bugfixes, reviews, refactors.
Skip only for pure read-only questions that touch zero files and produce zero
decisions.

- **Before starting:** name the topic, open the relevant folder's `_index.md`,
  read the matching topic file in full, then read the 2–3 most recent
  `vault/Meeting Notes/` entries.
- **After finishing:** append a dated `### YYYY-MM-DD — <title> [status]` entry
  to the topic file's Session Log, update the Overview only if scope or status
  changed, update Open Questions, and read the file back to verify.

Code documentation lives in `vault/Codebase/` — one file per module, each with a
table covering every file in its area. Start at `vault/Codebase/_index.md`.
**When you change code, update the matching module file in the same session.**

The full protocol, folder conventions and anti-patterns are in
`.claude/skills/obsidian-vault-workflow/SKILL.md`.
