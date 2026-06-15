# Northstar

This file is the canonical statement of *why* conception-space exists and
*what it is trying to do*.  It is not a roadmap, not a feature list, and
not a how-to.  It is the **intent** — the underlying purpose that any
specific feature, design decision, or refactor should be in service of.

Use it like this:

* When proposing a new feature, check whether it serves the intent
  below.  If it doesn't, it probably doesn't belong.
* When choosing between two implementations, prefer the one that better
  preserves the intent.
* When working becomes confused about "what is this even for," return
  here.
* When the work surfaces a new design principle that follows from the
  intent, add it as an axiom below so future work inherits it.

---

<span style="font-size:1.5em;">Conception-Space</span>

Organize your knowledge in space.<BR>
Build navigable places. Shape visible relationships. Discover emergent patterns.

---

## The intents

conception-space serves four complementary intents.  They are
different facets of the project's purpose — none is "primary"; each
fills a part of the picture the others don't, and tensions between
them are themselves design-revealing.  Each is elaborated below.

1. **Parallel perception of relationships** — the perceptual channel argument.
2. **Hand-authoring as sense-making** — the act of placement as the author's reasoning.
3. **Sharing a mental model** — the file as a transmissible argument.
4. **A persistent thinking artifact** — the file as a long-lived companion to ongoing thought.

---

## 1. Parallel perception of relationships

**conception-space is for parallel perception of relationships.**

A list, an index, or an appendix forces relationships through a *linear*
perceptual channel — you read item by item, holding the previous in
working memory while you read the next, building the structure
incrementally and forgetting most of it by the end.  Even with a great
index, "what is the *shape* of these 200 relationships?" is unanswerable
from the index itself; you have to construct that shape in your head, one
relationship at a time.

A `.cns` space pushes the same information through a *parallel*
perceptual channel — your visual system, which is built exactly for
this.  The moment you look at the scene, three things become available
**at once**, without sequential effort:

* **Number** — how many relationships exist, read by edge density and
  node count at a glance.  *"This region is busy; that one is sparse."*
* **Weight** — the strength or importance of relationships, read by
  edge thickness, colour, label, shape.  *"These connections are heavy;
  those are incidental."*
* **Congruence** — how relationships align, cluster, and point, read
  by spatial proximity, group shells, and shared direction.  *"These
  things belong together; those two clusters point at each other; this
  is an outlier."*

The user does not *recall* the structure — they *see* it.  Reasoning is
not sequential reconstruction; it is pattern recognition over a structure
presented as a whole.  That is a fundamentally higher-bandwidth way to
grasp relational data than any linear medium can be, and it is the
reason this tool exists.

Spatial memorability (Method-of-Loci–style "I remember Mars because it's
over there") is a *secondary* effect that follows from the placement
being stable across sessions.  Useful, but not the primary thing.

---

## 2. Hand-authoring as sense-making

The act of placing a node *is* an act of reasoning.  The author decides
where it goes — and that decision is informed by their understanding of
how it relates to the others.  As more nodes are placed, the
understanding sharpens; as the understanding sharpens, nodes move.  The
file is the residue of that thinking.

This is why hand-placement is non-negotiable (Axiom 1): if a layout
algorithm overwrites the positions, it overwrites the reasoning.  The
author is not just *describing* a graph; they are *thinking about it in
3D space*.  A blank `.cns` file is an invitation to think.  A finished
one is the shape of a thought.

---

## 3. Sharing a mental model

Once a `.cns` file exists, anyone with the viewer can *see* the author's
argument directly.  The spatial layout is the author's understanding made
transmissible.  Reading someone else's `.cns` is not reading their
summary of the concepts; it is perceiving the structure they perceived.

Two consequences.  The file is legible across people with no narrator —
the shape stands by itself.  And an author can use the file to *teach* —
laying out the topology of an idea and walking a viewer through it,
knowing the viewer is taking in the structure simultaneously, not
sequentially.  This is the social complement to perception: parallel
perception of *someone else's* relational argument.

---

## 4. A persistent thinking artifact

A `.cns` file lives across sessions.  The author can leave it and come
back.  They can evolve it as their understanding evolves.  They can
revisit a layout from last year and ask "what was I thinking when I put
that there?" — and often the placement itself encodes the answer.

The viewer's bookmarks (Axiom 4) operate on the short time-scale — saved
viewpoints into a file for a particular act of perception.  The file
itself is the longer time-scale: a thinking-vehicle that outlasts any
single sitting.  A `.cns` is not a chart that captures a moment; it is
a workshop the author keeps returning to.

---

## How the four reinforce each other

Each intent strengthens the others.  Sense-making depends on perception:
the author can only reason about the layout if they can see it
parallel-channel as they build it.  Perception depends on sense-making:
the layout has its high-bandwidth structure only because the author
placed it deliberately.  Sharing depends on both: the file is
transmissible only because the author's argument is encoded in the
layout *and* readable in parallel by the viewer.  Persistence is the
time-axis that lets all three accumulate value: a one-off arrangement
is a sketch; a returned-to arrangement is a body of work.

Tensions between them are design-revealing.  For example: a feature
that improves *perception* by auto-rounding edge paths for visual
cleanliness would damage *sense-making* if it overrides what the author
drew.  Both intents are real; the tension forces the design to be
specific about what it favours and why.

---

## Axioms

These axioms follow from the intent above and have proven load-bearing
in past design decisions.  Treat them as design constraints on future
work.

### Axiom 1 — Placement is argument.

When the author places node A near node B and far from C, that placement
**is** the claim "A and B are related; C is not."  The space is the
author's understanding of the relationships made directly perceptible.
Anything that overwrites placement (auto-layout, repositioning on
resize, etc.) erases the author's argument.  Hand-placement is
non-negotiable.

### Axiom 2 — Hierarchical grouping carries meta-relationships.

A `cluster` says "these N things are one *thing* at the next scale
up."  The cluster's own position then encodes how that aggregate
relates to other aggregates.  A `.cns` file is a multi-scale relational
argument: each level reveals a different layer of structure.  Treat
cluster-level visuals (shell, tube frame, label) as carrying real
reasoning content, not decoration.

### Axiom 3 — Smooth motion is load-bearing, not polish.

A snap, spin, or teleport breaks the perceptual channel mid-act.  The
user stops perceiving relationships and starts re-orienting from
scratch.  Smooth flight lets the user **sweep** across many
relationships in a single continuous perceptual act, picking up
patterns the static view can't show ("the edges from this cluster all
bend toward that region").  Camera transitions are part of the medium,
not decoration on top of it.

### Axiom 4 — Bookmarks are saved arguments.

A bookmark is a curated viewpoint that frames a specific
relationship-pattern for a specific perceptual act.  The viewpoint
**is** the argument.  Bookmarks deserve first-class treatment (naming,
organisation, easy travel) because each one is a piece of authored
sense-making.

### Axiom 5 — Edges carry as much reasoning as nodes.

Edge thickness, colour, label, dash, arrowhead — these are the *weight*
and *congruence* channels.  The reasoning content of the graph lives as
much in the edges as in the nodes.  Invest in edge visual quality with
the same seriousness as node visual quality.

### Axiom 6 — The viewer is a perception instrument, not a navigator.

Its job is to be transparent enough that the user forgets they are
using it.  Anything that draws attention to the viewer itself (lag, UI
clutter, animation glitches, modal interruptions) competes with the
perceptual act the user came to perform.  Default toward calm,
get-out-of-the-way design.

---

## Guiding questions for future work

When proposing a change, ask:

1. Does this serve **simultaneous perception** of relationships, or
   does it force the user into a sequential read?
2. Does this preserve the **perceptual channel during motion**, or does
   it interrupt it?
3. Does this respect the **author's placement** as argument, or does it
   overwrite it?
4. Does this strengthen one of the three perceptual signals (**number,
   weight, congruence**), or does it add unrelated noise?
5. Does this make the viewer **more transparent**, or more demanding of
   the user's attention?
6. Does this **preserve the author's argument** when the file is seen by
   another viewer?  Does it make the file easier or harder to share?
7. Does this stay useful **across sessions and over time**, or is it
   tied to a transient state?

If a change scores well on these questions, it probably belongs.  If it
scores poorly, it is probably the wrong design.
