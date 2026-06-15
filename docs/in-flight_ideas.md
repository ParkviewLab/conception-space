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
