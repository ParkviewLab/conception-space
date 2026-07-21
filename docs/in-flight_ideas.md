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

# 6. Vision Pro — the enactive mode (spatial passthrough)

A spatial, **passthrough** (`immersive-ar`) version of conception-space on Apple
Vision Pro: the canonical **Cognition Cache** rendered room-scale in your real
space, reached into and reshaped with your hands. Framed against the
[northstar](northstar.md) (Concept 4) as the **enactive** mode of the
visual-cognition thesis — the bet at full strength, not a port.

Hard requirement (Gary): it MUST be passthrough, which forces a native renderer.
Decided engine: **native SwiftUI + RealityKit + ARKit** (Unity ruled out as a
proprietary engine; Godot watched as the open-source option). A **separate repo**,
sharing the Cognition Cache JSON5 schema + test corpus as the cross-repo source of
truth.

This idea has its own deeper notebook: see
[`visionos_ideas.md`](visionos_ideas.md) — the apex argument, the Iron Man 2
interaction reference (and its caveat), spatial projections, the engine comparison
+ decision, the RealityKit rendering R&D, repo strategy, the file-access tension,
open questions, and a suggested first slice.

# 7. A projections menu + auto-generated projections (the chronological space)

The northstar now names this terrain: **Concept 4 ("one space, many modes of
representation")** and **Axiom 8 ("views are projections of it")** establish
that the Author engages the canonical Cache through **projections** —
purposeful lenses, each serving a task, that round-trip back into the one
truth. This idea proposes two concrete things on top of that principle:

1. **A projections menu** — first-class UI to switch between a space's
   projections (the iconic **Filtered** views, named **Spatializations**, the
   symbolic **Notations**), the way you'd switch tabs.
2. **Tools to auto-generate projections** from the data the nodes already
   carry — rather than only hand-building each one.

**First auto-generated projection — a chronological space (a 3D timeline /
spatial calendar).** Pull in only the nodes that carry a date attribute (in
their `meta`), optionally **future-dated only**, optionally narrowed to one
other attribute (e.g. `meeting`), and lay them out along a time axis → a
glanceable 3D calendar of dated nodes the author never had to place by hand.
The "which nodes come in" half *is* a **Filter** (the iconic mode's
shape-for-purpose control, per Concept 4); the "where they sit" half is a
generated **Spatialization** with an advisory **named dimension** (`x: time`)
— see [`space_architecture_ideas.md`](space_architecture_ideas.md). So the
chronological view is a concrete, motivating use case that stitches Filters,
multi-Spatialization, and named dimensions into one user-facing projection.

**The sharp tension (not decided): auto-*generated placement* vs. Axiom 1.**
Concept 4 / Axiom 8 bless *projections* — but **Axiom 1 ("placement is
argument; nothing auto-lays-out")** still forbids an algorithm from writing the
Author's poses. The reconciliation Axiom 8 points to: a generated projection is
a **derived, task-serving view, not a second source of truth** — it reads date
`meta` off the Cache and arranges a *transient* timeline, never overwriting a
hand-authored Spatialization. The open question is the round-trip (guiding
question 8): is an auto-generated projection **discard-only** (a pure lens,
like a Filtered view), or can the Author tweak it and **internalize** the
result into a real hand-owned Spatialization — at which point Axiom 1 reclaims
it as authored?

Sibling to **#6**: [`visionos_ideas.md`](visionos_ideas.md) already floats
spatial projections and an *"AI projection designer"* for the enactive mode;
auto-generation here is the same move in the core app. Related to **#5** (an
import filter is the same select-by-attribute machinery). Downstream of the
JSON5 / Spatialization / Filter work in
[`space_architecture_ideas.md`](space_architecture_ideas.md); the date and type
data ride in each node's `meta`. If it grows, it splits into its own
`projections_ideas.md`.

# 8. Under study: a Rust port (off Electron) — [`rust_port_ideas.md`](rust_port_ideas.md)

Should conception-space leave Electron? The deeper notebook is
[`rust_port_ideas.md`](rust_port_ideas.md); in brief, two designs plus a survey:

- **Design A (Tauri hybrid):** keep the three.js renderer and note editor in the OS
  webview, rewrite the small file-I/O main process in Rust. The backend port is
  trivial, but a 3D app stakes everything on WebGL2 in the system webviews, and on
  Linux (WebKitGTK) a WebGL2 context can silently fall to *software* rendering that
  the app cannot even detect. That directly threatens **axiom 3** (smooth motion is
  part of the medium) and **axiom 6** (a transparent, lag-free instrument), and it
  breaks the iframe **PDF** handle (axiom 7) on macOS/Linux. Defensible on
  macOS/Windows, uncomfortable on Linux; an interim at best.
- **Design B (100% Rust) — the recommended end state:** replace three.js with a Rust
  renderer (**three-d** recommended for its near-1:1 match to `scene.js`; **Bevy** the
  alternative that wins the authoring gizmo and a wgpu-native future), labels and
  chrome in an **egui** overlay, the `camera_path.js` math ported verbatim as glam
  vectors. A native renderer *serves* axioms 3/6 rather than fighting them (no browser
  compositor between the loop and the display). ~85% of the three.js surface maps
  directly (see the feature table).
- **The real cost is the note editor**, engine-independent: CodeMirror 6 + KaTeX have
  no drop-in egui equal. Math is answered by **RaTeX** (per the PensaGrex study); the
  pragmatic fork is a **scoped editor webview** (keep CodeMirror/PDF in a small webview,
  everything else native) as the interim vs a fully native editor as the clean end.
- Others surveyed (Fyrox, Godot, rend3 [archived], renderling, kiss3d, Flutter,
  Dioxus/Blitz) — none beats three-d/Bevy; the DOM text/editor cost recurs everywhere.
  The visionOS enactive mode (#6) is a separate RealityKit app and does not bear on
  this. Licensing is clean (all MIT/Apache into CS's AGPL).

A question under study, not a plan or a commitment.
