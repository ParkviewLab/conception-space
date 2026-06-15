# Hand-authoring ideas

A focused brainstorm of editing tools that would let the author
**reason in 3D directly**, instead of transducing through a text
editor.  This file is a deeper notebook on one of the ideas
referenced by `in-flight_ideas.md` — and it serves intent #2 of the
[northstar](northstar.md): *hand-authoring as sense-making*.

Status: brainstorm only.  Nothing here has been promoted to a plan.
Items marked with **★** are my (Claude's) current favourites for
where to start; the user has not yet ratified that order.

---

## The friction, said sharply

Today, hand-authoring is hand-*typing*.  To make the claim "Mars
belongs near Jupiter, but not in the same group," the author opens a
text editor, calculates a coordinate, types `locus=[16,-13,6]`, saves,
switches to the viewer, looks, decides it's wrong, switches back,
retypes.  The reasoning happens in the *viewer* and the *editing*
happens in the *text* — the author transduces between them mentally
on every step.

This violates the spirit of intent #2 in a way that is almost
ironic.  The whole point is that placement is reasoning, and we
currently force the author to do their reasoning in a medium that
doesn't support spatial perception at all.

So the editor's job is: **let the author's spatial reasoning drive
the file directly.**  Less typing, more handling.

---

## A. Direct manipulation in the viewer

The viewer becomes the editor.  Toggle a mode (e.g. ⌘E for "edit"),
and the camera is still 3D but the nodes are grabbable.

- **★ Drag-to-move.**  Click and drag a node.  It follows the cursor
  on a plane perpendicular to the camera.  Release, position is
  updated, `.cns` file's `locus=` line gets rewritten.  Most direct
  mapping of intent to motor action.
- **Six-axis nudge.**  Select a node, arrow keys / hjkl nudge by a
  small step along x/y/z.  Shift = bigger step.  Cmd = snap to grid.
  For when "approximately right, just a hair more z" is the operation.
- **Click-to-add.**  Press `n`, click in the viewport, a new node
  drops onto the plane at the camera depth, ready to be labeled in a
  small popup.  Most direct mapping of "I want a node *there*."
- **Drag-to-connect.**  With `e` held, drag from one node to another
  to create an `edge`.  Drop on empty space to abort.

Tension with Axiom 1 (placement is argument): dragging is "imprecise."
That is OK.  The author's reasoning is usually approximate ("near",
"between", "to the left of"); the file captures whatever the hand
says.  A node at `[10.0327, ...]` is no worse than at `[10, ...]` —
position is what the author chose.

Risk: mouse-only editing makes precision hard.  Keyboard nudge solves
it, but the handoff between mouse and keyboard needs to feel like one
continuous interaction.

---

## B. Spatial reasoning aids

Things that help the author **see what they're reasoning about**
while editing.

- **★ Reference planes / axes you can drop temporarily.**  "Show me a
  horizontal plane at y=0 right now" — helps when placing a flat row
  of things.  Toggle off when done.  Like construction lines in CAD,
  but ephemeral.
- **★ Live alignment hints.**  While dragging, if the node gets close
  to sharing x, y, or z with another node, show a faint line and snap
  softly.  The author *sees* "ah, this lines up with Mars on the x
  axis" and can choose to accept or break the alignment.  Critical:
  the snap is a *signal* the author opts into, never imposed.
- **Live measurement.**  Hover a node, see its position in the corner.
  Select two nodes, see distance.  Select three, see angle.  Numbers
  there when wanted, never displayed by default.
- **Group-relative editing.**  Inside a `node_neighborhood`, the
  coordinates shown and edited are relative to the group origin.
  Moving the group moves everything inside it as a unit.  This is
  already true of the data model — the editor should *show* it.
- **Multiple viewports.**  A second small viewport showing the same
  space from a different angle, side-by-side.  Helps with the depth
  ambiguity of "is this node further forward than that one?" — which
  is brutally hard with a single perspective camera.

Why alignment hints are interesting: they preserve author choice
(no auto-snap; the snap is *opt-in*) while making the spatial
relationships the author is trying to perceive *legible* during the
act of placing.

---

## C. Text ↔ viewer feedback loop

Even with great direct manipulation, there will be times text is
right (renaming, editing a color, batch operations).  Those moments
should feel continuous with the visual editing, not modal.

- **★ Live highlight.**  Cursor on a `node sun (...)` line in the file
  panel ⇒ the `sun` mesh in the viewer glows.  Click `sun` in the
  viewer ⇒ the editor scrolls to and highlights that line.  This
  bridge alone is a big sense-making win and is probably cheap to
  build.
- **Inline attribute popup.**  Click a node in the viewer, a small
  panel appears with editable label / color / size / shape.  Type a
  new label, the file updates.  Cancel = no change.  No file
  navigation required for the common edit.
- **Diff visualization.**  When the file changes (revert, compared
  to git HEAD, unsaved edits), show *which nodes moved* with a
  subtle "ghost" of their old positions and an arrow.  Shows what
  reasoning shifted.

---

## D. Authoring history as artifact

This is where the work gets most interesting — it ties intent #2
directly to intent #4 (persistent thinking artifact).

- **★ Annotated moves.**  When the author moves a node by more than
  a small threshold, the editor optionally pops a "why?" prompt.
  Skip = no annotation.  Type a sentence = stored as a comment in
  the file (or in an annotations sidecar).  The placement is the
  *argument*; the annotation is the author's *commentary on their
  own argument*.  Months later, returning to the file, the author
  can see not just where things are but *why* they put them there.
- **Time-slider over git history.**  Slide through the project's
  git commits, watch nodes move into place over the file's lifetime.
  Reasoning becomes a *flight* through versions.  Pairs naturally
  with bookmarks (Axiom 4) — bookmark specific commits as "this is
  when the cluster structure clicked."
- **Local undo/redo with named checkpoints.**  Plain Cmd-Z works,
  but also: name a state ("after rearranging Jupiter system") so
  the author can roll back to it later.  Lightweight save-points
  within an editing session.

Annotated moves is the most novel item on this list.  It treats the
*reasoning* itself as a first-class artifact, not just the result.
It is also a *gentle* feature — the author doesn't have to use it;
it shows up only when they make a significant move, and lets them
optionally explain.

---

## E. Whole-graph operations (sparingly)

These risk Axiom 1 if done wrong.  They're useful but need careful
framing as "the author asks; the tool does."

- **Multi-select and translate.**  Select N nodes (drag-rect or
  shift-click), drag them as a unit.  Relative positions preserved;
  the author moves a whole sub-region.
- **Scale a group.**  "This Jupiter system should be 30% smaller
  relative to the rest of the solar system."  Author-driven scale,
  not auto-layout.
- **Rotate a group around its own origin.**  Author rotates a
  sub-region as a unit to read better from the current viewpoint.

These are *meta-placements*: the author is still arguing, but at the
group level.  Lower priority than the single-node ops in A.

---

## What to avoid

- **Auto-layout / "make this look nice" / force-directed placement.**
  Violates Axiom 1.  The author's roughness is not a bug.
- **Auto-edge-inference** (two nodes are close, draw an edge).
  Violates Axiom 5.  The author decides which relationships exist.
- **Round / snap by default** without an explicit modifier.
  Whatever the author drew is what they meant.
- **A separate "editor app".**  The whole point is that editing
  happens *in* the perceptual frame.  Splitting it out re-creates
  today's text-vs-viewer dance in a new wrapper.

---

## Suggested starting slice

If forced to commit to a first slice that would unlock the most, in
priority order:

1. **Drag-to-move + keyboard nudge + inline attribute popup** (A, C).
   Removes ~80 % of the text-editor dance for the common case.
2. **Live highlight** (C).  Cheap to build, big sense-making win.
3. **Alignment hints while dragging** (B).  Makes spatial reasoning
   *visible* during the act of editing.
4. **Annotated moves** (D).  The reasoning-as-artifact move.  Most
   novel; least clear how to design well.  Worth exploring further
   before committing.

The first three are concrete and well-understood as design patterns.
The fourth is the one most worth deepening in a follow-up.
