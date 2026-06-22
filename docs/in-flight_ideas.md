<!--
SPDX-FileCopyrightText: 2026 Gary Frattarola <garyf@parkviewlab.ai>
SPDX-License-Identifier: CC-BY-4.0
-->

# 1. Alternate Camera View
Dring flight to a bookmark, show a camera view that constantly points the camera toward the orbit point of the choosen bookmark.

# 2. Hand-Authoring Space

The project has no tools for editing the 3D space. Every edit today
is hand-typed coordinates in a text editor, then a save and a switch
to the viewer — a sharp mismatch with intent #2 of the
[northstar](northstar.md) (*hand-authoring as sense-making*).

This idea has its own deeper notebook: see
[`hand-authoring_ideas.md`](hand-authoring_ideas.md) for the focused
brainstorm — friction analysis, five categories of editing-tool
ideas (direct manipulation, spatial reasoning aids, text ↔ viewer
feedback, authoring history as artifact, whole-graph operations),
explicit anti-features, and a suggested starting slice.

# 3. AI Authoring Assistance

conception-space sits inside (or alongside) a larger system that
handles file ingestion, content analysis, storage, and indexing —
and hosts the AI itself.  AI suggestions for placement, clustering,
shape, edges, and group membership arrive from that larger system
over an API; conception-space's job is the **interaction layer** —
receiving suggestions, presenting them to the author, and rendering
the "draft until touched" lifecycle.

Central design move (user-ratified): every AI suggestion arrives as
**N alternatives, never one default**.  The author *must* choose
between them — the choice itself is the authorship.  There is no
rubber-stamp path.

Sequencing note: **AI-authoring is downstream of hand-authoring.**
The "Other — I'll do it myself" option in every multi-proposal menu
has to be ergonomic, which means the hand-authoring tools (#2) must
land first.

This idea has its own deeper notebook: see
[`ai-authoring_ideas.md`](ai-authoring_ideas.md) for the focused
brainstorm — architectural framing, the thesis collision with
Axiom 1, the multi-proposal rule, two use cases (single-file
vs. bulk-import), UX sketches, tensions, sequencing, and open
questions.

# 4. Commonality refinements

Carried over from the now-shipped Keyword Rationalization + Flat
Multi-membership work (v0.7.x commit series; the original
in-flight entry was retired when the work landed).  Two threads
were explicitly punted at the time and remain on the shelf:

- **Bookmark × commonality interactions.** A bookmark could
  *focus* a particular `commonality` — highlight its members, dim
  or hide the rest.  Ties directly into Axiom 4 ("bookmarks are
  saved arguments") of the northstar.  Not decided.
- **Additional render styles** beyond the orbiting satellites
  (labelled callouts, tints, convex-hull blobs).  Worth
  revisiting if the satellites prove insufficient in real scenes.
  Any line-based render is ruled out — see the `style=lines`
  revert in v0.7.3 (the lines were visually indistinguishable
  from `edge` tubes).

# 5. Import from existing knowledge bases (Joplin / Obsidian)

Most people don't start from a blank `.cns` — they already have a corpus.
This is the on-ramp for northstar intent #3 (*the space as an interface to
a living corpus*): **open a Joplin notebook (via
[jonobones](https://github.com/ParkviewLab/jonobones)) or an Obsidian
vault, instantiate its notes as nodes, then hand the author the spatial
tools to regroup, rearrange, and reshape them** into a place they can think
in. A menu-driven import filter (by notebook, tag, folder, date…) chooses
what comes in.

Reframes the audience: not only authors who build from scratch, but
existing Obsidian/Joplin users who want a visual-cognition layer over
knowledge they already have. Closely related to #3 (AI authoring — the
bulk-import use case) and downstream of #2 (hand-authoring tools to reshape
the imports). If it grows, it splits into its own `import_ideas.md`.

# 6. Alternate projections of a space (auto-generated views)

A space is authored once, but it could be *read* through many lenses.
This idea adds a **menu of alternate projections** of a given space —
plus **tools to auto-generate** some of them from the data the nodes
already carry.

This lands almost exactly on the **Spatialization** concept already
settled in [`space_architecture_ideas.md`](space_architecture_ideas.md)
(§1, §5): "a 3D arrangement of a cluster's children," where one cluster
may hold several (`causal`, `temporal`, `physical`). The new move here is
**generation** — rather than only hand-placing each spatialization, offer
a tool that *derives* one from node attributes, and a menu to switch
between them.

**First projection — a chronological space (a 3D timeline / spatial
calendar).** Pull in only the nodes that carry a date attribute (in their
`meta`), optionally **future-dated only**, optionally narrowed further to
one other attribute (e.g. `meeting`), and lay them out along a time axis.
The result is a quick 3D calendar of dated nodes — a glanceable timeline
the author never had to place by hand. Note the two halves map onto
constructs already in the design but still deferred: the "which nodes come
in" half *is* a **Filter** (select by attribute), and the "where they sit"
half is a generated Spatialization with an advisory **named dimension**
(`x: time`). So the chronological view is a concrete, motivating use case
that stitches Filters, multi-Spatialization, and named dimensions into one
user-facing action.

**Tension to resolve (not decided).** Auto-generated placement collides
head-on with **Axiom 1 — placement is argument** ("nothing auto-lays-out";
the "geometry emerges from relations" advice is explicitly *rejected* in
[`space_architecture_ideas.md`](space_architecture_ideas.md) §3). Likely
reconciliation: a projection is **derived, non-destructive, and clearly
marked as such** — a generated lens that sits *alongside* the hand-authored
spatializations and never overwrites them, much as a Filter is view state
rather than authored geometry. The author's argument stays the authored
spatialization; a projection is a different way of *looking*, not a claim
about relationships. Open question: should a generated projection be
discard-only, or **promotable** into an editable, hand-owned spatialization
once the author starts tweaking it (at which point Axiom 1 reclaims it)?

Downstream of the JSON5 / Spatialization / Filter work in
[`space_architecture_ideas.md`](space_architecture_ideas.md); the date and
type data ride in each node's `meta`. Related to #5 (an import filter is
the same select-by-attribute machinery). If it grows, it splits into its
own `projections_ideas.md`.
