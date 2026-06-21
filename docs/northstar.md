<!--
SPDX-FileCopyrightText: 2026 Gary Frattarola <garyf@parkviewlab.ai>
SPDX-License-Identifier: CC-BY-4.0
-->

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

**Organize your knowledge in space.**<BR>
**Build navigable places. Shape visible relationships. Discover emergent patterns.**

---

## The intents

1. **Organize your knowledge in space** - gives knowledge spatial structure the mind can remember
2. **Build navigable places** - spatial navigation helps knowledge become easier to revisit
3. **Shape visible relationships** - parallel perception of relationships makes abstract connections perceivable
4. **Discover emergent patterns** - recurring visual attributes help the mind detect emergent structures

---

### 1. Organize your knowledge in space

Human memory and perception are strongly spatial. A place gives knowledge landmarks, regions, paths, distances, and orientations, which help the mind recognize relationships instead of having to recall everything abstractly. We remember locations, regions, landmarks, and relationships well, and we use spatial structure to reduce mental load. When knowledge is organized in space, we can recognize patterns, revisit familiar areas, compare nearby ideas, notice gaps, and build a cognitive map of what we know.

---

### 2. Build navigable places

Navigable places have cognitive value because humans are especially good at remembering and reasoning with spatial structure. Navigation turns understanding into an active process: we can move through ideas, return to familiar areas, compare nearby concepts, and gradually form a cognitive map. In this sense, the space becomes an external memory aid that reduces cognitive load and makes complex relationships easier to perceive, revisit, and develop.

---

### 3. Shape visible relationships

Visible relationships are valuable because cognition depends heavily on perceiving relations, not just isolated things. When relationships are made visible through distance, grouping, alignment, connection, containment, motion, color, or scale, we can recognize patterns directly instead of reconstructing them from text or memory. Shaping those relationships also turns understanding into an active process: we can adjust a representation, test whether it "fits", notice inconsistencies, and refine the structure. This supports perception, memory, attention, and reasoning by making abstract relations external, manipulable, and easier to compare.

---

### 4. Discover emergent patterns

When many ideas and relationships are arranged visibly, emergent structures are revealed that were not obvious item by item: clusters, gaps, bridges, symmetries, outliers, repeated forms and motions, and unexpected analogies.

This matters because our perception is good at detecting patterns across space. By externalizing knowledge into a visible arrangement, our perceptual system participates in thinking: the eye can notice structure before the mind has to verbalize it. That supports memory, attention, and reasoning because we can recognize higher-order organization, see what is missing or overconnected, and form a stronger cognitive map of the knowledge.

---

## Concepts

The intents say *why* in broad strokes. These concepts are their underlying mechanisms and the source of the axioms below.

### 1. Parallel perception of relationships

**conception-space is for parallel perception of relationships.**

A list, an index, or an appendix forces relationships through a *linear*
perceptual channel — one reads item by item, holding the previous in
working memory while one reads the next, building the structure
incrementally and forgetting most of it by the end.  Even with a great
index, "what is the *shape* of these 200 relationships?" is unanswerable
from the index itself; one has to construct that shape in one's head, one
relationship at a time.

A visual space pushes the same information through a *parallel*
perceptual channel — one's visual system, which is built exactly for
this.  The moment one looks at the scene, three things become available
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

One does not *recall* the structure — one *sees* it.  Reasoning is
not sequential reconstruction; it is pattern recognition over a structure
presented as a whole.  That is a fundamentally higher-bandwidth way to
grasp relational data than any linear medium can be, and it is the
reason this tool exists.

Spatial memorability (Method-of-Loci–style "I remember the red book because it's
over there") is a *secondary* effect that follows from the placement
being stable across sessions.  Useful, but not the primary thing.

---

### 2. Hand-authoring as sense-making

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

### 3. A persistent thinking artifact

A visual space lives across sessions.  One can leave it and come
back.  One can evolve it as one's understanding evolves.  One can
revisit a layout from last year and ask "what was I thinking when I put
that there?" — and often the placement itself encodes the answer.

"Bookmarks" (Axiom 4) operate on the short time-scale — saved
viewpoints into a space for a particular act of perception.  The space
itself is the longer time-scale: a thinking-vehicle that outlasts any
single sitting.  A space is not a chart that captures a moment; it is
a workshop the author keeps returning to.

---

### 4. One space, many modes of representation

The space the author builds is a single canonical model — the **Cognition
Cache** (see [`space_architecture_ideas.md`](space_architecture_ideas.md)).
It is deliberately *richer than any single read*: the whole point of intent
#4 is that structure emerges only when *many* relationships are present at
once, which is exactly what overwhelms a linear medium.

So the author never confronts the whole Cache through one channel.  They
engage it through **projections** — purposeful lenses onto the one canonical
model, each serving a particular task or domain.  Following Bruner's three
modes of representation:

* **symbolic** — a **Notation** (the text rendering).  It must *reduce* to a
  domain subset, because symbolic cognition is capacity-bound: too much text
  is too much to hold in the mind.
* **iconic** — the visual space and its **Filters**.  It need not reduce *for
  capacity* — the eye takes the whole at once — so a Filter's job is to
  *shape for purpose*: emphasise, de-emphasise, scope to a domain.  A
  different motive entirely from the Notation's: shape-for-the-task, not
  shrink-to-fit-the-mind.
* **enactive** — an embodied, room-scale form (see
  [`visionos_ideas.md`](visionos_ideas.md)).  The body joins the perceptual
  act.

These are not three apps; they are three bandwidths onto one Cache.  And the
**bandwidth scales with the medium**: the wider and more embodied the visual
channel, the more of the canonical space becomes directly perceivable at
once.  A flat screen is this thesis at working strength; an embodied,
stereoscopic, room-scale space is the thesis at *full* strength — the deep
reason a spatial form is not a port of the tool but its fullest expression.

The modes are **complementary, not ranked**.  The full **iconic** overview is
not a hazard to reduce away but the home base the eye is built for — you take in
the whole space at once, then drill into a domain to work.  And the symbolic
**Notation** is not a fallback for when the visual fails: it does *different
work* (exact logic and measurement, which you cannot do with floating objects),
and its results feed *back* into the visual.  That interplay is the engine — the
next concept.

---

### 5. The discovery loop — visual ↔ symbolic

The visual and symbolic modes are not just two views; together they form a loop,
and the loop is where the tool earns its keep.

* **Visual** is for **interpretation, inference, insight** — seeing what is
  related, what is missing, what to work on next.
* **Symbolic** is for **exact logic and measurement** — actually working it out.
  Symbols exist precisely because you cannot do the laws of motion, or the
  calculus, with floating 3D objects.

You **drill down** from the visual to the symbolic to solve a problem exactly.
Then comes the move that is easy to miss and is the generative one: you **raise
back up**, carrying the solution's *categorized residue*.  The methods and
attributes of what you just worked out become **Commonalities** (concept
formation) on the node — and those reveal relationships that were not there
before.

> A robotic wheel-control task, solved on paper, turns out to be a physics
> problem, then a calculus one.  Its Commonalities gain *physics* and *calculus*;
> the overview now shows this task related to calculus, and to your other
> calculus problems, in a way invisible before the symbolic solution.

So the symbolic descent pays out twice: the answer, **plus new visible
structure**.  The space therefore **compounds** — it grows new perceivable
relationships as a by-product of real work done in it, and is worth more the
more you genuinely think in it.  This is intents #3 and #4 made *dynamic*:
relationships and emergent patterns are not only arranged, they are *produced* by
the loop.  **Build, solve, discover, reveal.**

The step that closes the loop — turning a solved node into the Commonalities that
ride back up — is **human and AI together**, not either alone.  The author may
attach them deliberately as a post-mortem; an AI (see AI-authoring,
[`in-flight_ideas.md`](in-flight_ideas.md) #3) may analyse the solved node and
propose them.  The AI's suggestions are best understood as **seeds**: they often
spark a *better* attachment in the author than any option offered.  Whatever the
author ratifies or improves is the authorship (Axiom 1) — the two sharing
thoughts reach a result neither would alone.

---

## Axioms

Treat these as design constraints on future work.

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

A snap, spin, or teleport breaks the perceptual channel mid-act.
One stops perceiving relationships and starts re-orienting from
scratch.  Smooth flight allows one to **sweep** across many
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

### Axiom 6 — The app is a perception instrument, not a navigator.

Its job is to be transparent enough that one forgets one is
using it.  Anything that draws attention to the app itself (lag, UI
clutter, animation glitches, modal interruptions) competes with the
perceptual act one is trying to perform.  Default toward calm,
get-out-of-the-way design.

### Axiom 7 — A node is a handle onto content.

A node's first-class job is to stand for — and open — a real file (usually
markdown, sometimes a PDF).  Its visuals (shape, colour, size) are
secondary to that binding.  Decoupling a node from the content it points at
removes its reason to exist: the space is an interface to a corpus, not a
diagram floating free of it.

### Axiom 8 — The canonical space is the single source of truth; views are projections of it.

There is one truth: the canonical space (the **Cognition Cache**).  Every
view of it — a text **Notation**, a **Filtered** visual, a spatial scene — is
a *projection* serving a task, never a second place where truth lives.  A
projection may be edited, but the edit must **internalize** back into the
Cache; a view that forks the truth (becomes independently authoritative)
breaks the model.  Reduce or reshape within a projection freely — but keep
the Cache the single thing every projection is *of*.

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
6. Does this keep the space **bound to its corpus** — the real files its
   nodes stand for — or does it drift toward a diagram detached from the
   content?
7. Does this stay useful **across sessions and over time**, or is it
   tied to a transient state?
8. Does this treat the **canonical space as the single source of truth**,
   with this view as a projection that round-trips into it — or does it
   create a second place where truth can live?
9. Does this support the **discovery loop** — drilling down from the visual to
   the symbolic to work something out, and raising the result back up as
   Commonalities that reveal new relationships — or is it a one-way street?

If a change scores well on these questions, it probably belongs.  If it
scores poorly, it is probably the wrong design.

---

## A note on feel

A northstar can also hold a **feel-and-intent reference**: a concrete exemplar
of the *experience* we want — even a fictional one (the *Iron Man 2* holotable
for the enactive mode; see [`visionos_ideas.md`](visionos_ideas.md)).  It is a
target for the **feel**, not a spec for the build.

For something new, different, and hard to build, the way to honour such a
reference is to **build the feel first and fake the underneath**: a prototype
that nails the desired experience over stubbed internals, tuned until you
*love* it, and only then built for real beneath.  The loved prototype becomes
the guide for the real work.  Get the experience right before committing to
the machinery under it.  (Fittingly, the holotable itself was a *faked* UX,
built for a film, that went on to guide real spatial interfaces.)
