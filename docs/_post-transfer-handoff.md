# Post-transfer handoff — resuming conception-space

**Why this file exists:** conception-space was transferred from `garycoding/`
to the **ParkviewLab** org (kept **private**) and its local folder relocated to
`~/dev/github/ParkviewLab/conception-space`. This note orients a fresh Claude
session picking up afterward. **Delete it once the compliance project is done
and §4 work has resumed.**

## Nothing about the design was lost
The JSON5 schema design and all settled vocabulary/decisions live entirely in
**`docs/space_architecture_ideas.md`** — committed, so it relocated with the
repo. Reading that doc restores the full design state. No half-finished schema
edit was in flight at transfer time; we paused at a clean threshold.

## Continuity check (do this first)
1. Confirm memory loaded — `MEMORY.md` (auto-loaded) should list the
   conception-space memories, including:
   - `project_cspace_parkviewlab_compliance.md` — the 5 compliance decisions
   - `project_cspace_licensing.md` — dual-license + REUSE state
   - `project_jonobones_direction.md` — the storage-layer direction
   - `project_conception_space.md` — language/repo basics
   If `MEMORY.md` does **not** list these, the `~/.claude/projects/<slug>`
   rename was missed during the move: the memory is still on disk under the old
   `…-garycoding-conception-space` slug — rename that dir to
   `…-ParkviewLab-conception-space` to restore it.
2. Read the ParkviewLab handbook (github.com/ParkviewLab/handbook) — the org's
   single source of truth.

## Order of operations
1. **First: the ParkviewLab compliance project** — per
   `project_cspace_parkviewlab_compliance.md`. CI workflows, changelog tooling,
   `AGENTS.md`/`CLAUDE.md`, `docs/CONTRIBUTING.md`, **version de-duplication**
   (remove the `0.8.0` literals → one runtime-derived SoT), `pyproject.toml` →
   org shape (Python 3.13, line-length 110), tests, doc copyright footers. Plus
   the agreed calls: keep the name; adopt ParkviewLab brand (re-skin the
   northstar HTML off gold/ink + Kandinsky); **amend the handbook** for the
   org's first Electron app; adopt handbook branching (**the `claude` branch
   retires**); the local layout is now the contained
   `conception-space.git + conception-space-main + conception-space-develop`.
2. **Then: resume §4, the JSON5 schema (v1 draft)** — read
   `docs/space_architecture_ideas.md` §4 + §7. Open seams when we paused:
   - §7.1 nested vs flat storage (doc leans nested)
   - §7.2 cross-cluster spatialization coordination
   - §7.4 file extension (`.cns` vs `.cns.json5`)
   - §7.5 migration of the ~5 example `.cns` files + Python generators
   - §7.6 per-instance metadata syntax in Notations
   The user said "we need to work in the JSON5 schema" but had **not named the
   specific changes** — re-confirm the target before editing. Edit MD-first.

## How we work now (post-compliance)
Handbook rules: squash-PRs into `develop`; **a human merges (never
self-merge)**; release-driven `develop→main` via `git bump`/`git release` (from
`ParkviewLab/dev-tools`); ephemeral prefixed worktrees off `develop`; push
after each commit; prompt for release after each merge. If the compliance
migration hasn't landed yet, the old `claude → ff develop → ff main` flow may
still be in effect — check which state the repo is in.

## Heads-up: stale loose ends carried over
Three example files were long-modified-but-unstaged in the old `claude`
worktree (`app/src/renderer/public/examples/{sample.md,solar.cns,solar.views.json5}`).
A re-clone won't carry uncommitted changes — confirm whether they mattered.
