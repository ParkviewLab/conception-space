<!--
SPDX-FileCopyrightText: 2026 Gary Frattarola <garyf@parkviewlab.ai>
SPDX-License-Identifier: CC-BY-4.0
-->

# The CNS Language

A hand-authored description language for 3D conceptual graphs.  The
file extension is `.cns`; the viewer/editor is conception-space.

This document covers the language itself — syntax, semantics, and the
rationale behind each design choice — at the level of detail someone
designing a new feature, writing a parser, or trying to understand
*why the language is shaped this way* would need.  For the broader
project intent that drives these choices, see
[`northstar.md`](northstar.md).

> **Status note.** As of v0.7.4 every construct described here
> ships.  `commonality` renders as orbiting satellites, with an
> optional `shape=` attribute selecting the satellite geometry.
> An earlier opt-in `style=lines` (v0.7.2) was removed in v0.7.3
> — the lines were visually indistinguishable from `edge` tubes.
> The **Status / Migration** section at the bottom is
> authoritative.

---

## At a glance — the keyword space

The language has **four top-level keywords**.  Every `.cns` file is
some combination of declarations using these four.

| Keyword       | What it declares                                                                 |
| ------------- | -------------------------------------------------------------------------------- |
| `node`        | An individual 3D object — a sphere, cube, octahedron, etc. — at a defined position. |
| `edge`        | A relationship between two nodes (with optional label, colour, thickness).         |
| `cluster`     | A spatial container with its own origin / reference frame.  Children's positions are relative to the cluster.  Hierarchical: clusters can nest inside other clusters. |
| `commonality` | A flat, non-spatial grouping of nodes that share some property.  Multi-membership: any node can belong to many commonalities. |

All four are **single-word, un-prefixed keywords**.  Reading a `.cns`
file, the keyword tells you immediately what kind of declaration
you're looking at.

Two attributes deserve early mention because they appear everywhere:

- **`locus=[x,y,z]`** — every `node` and every `cluster` has a
  locus, the defined position it occupies (relative to its parent
  cluster if it has one, or to the world origin if not).
- **`label="..."`** — almost every declaration has a human-readable
  label.

The rest of the attributes (colour, shape, size, brightness, file
pointer, edge thickness, ...) are construct-specific and covered
in each construct's section below.

---

## `node` — an individual 3D object

The simplest declaration.  A `node` is a 3D object in space.

### Syntax

```
node <id> ( <attributes> )
```

The `<id>` is a unique identifier (used by `edge` and `commonality`
to reference the node).  Attributes are comma-separated `key=value`
pairs inside parentheses; order doesn't matter.

### Attributes

| Attribute    | Type    | Default        | Meaning                                          |
| ------------ | ------- | -------------- | ------------------------------------------------ |
| `locus`      | [x,y,z] | required       | Position in 3D space (relative to parent cluster, or world if none). |
| `label`      | string  | id             | Human-readable label drawn near the node.        |
| `shape`      | enum    | `sphere`       | `sphere`, `cube`, `tetrahedron`, `octahedron`, `dodecahedron`, `icosahedron`, `cylinder`. |
| `color`      | hex     | parent's color | `#rrggbb` fill colour for the mesh.              |
| `size`       | float   | 1.0            | Scale factor.                                    |
| `brightness` | float   | inherited      | Light emitted by the node (affects ambient feel). |
| `file`       | string  | none           | Path to an attached file (`.md`, `.pdf`, etc.); shown in a side panel when the node is opened. |

### Example

```
node mars ( locus=[16,-13,6] shape=dodecahedron color=#cc4422 label="Mars" file="mars_notes.md" )
```

A red dodecahedron at position `[16,-13,6]`, with a markdown file
attached that opens in the panel when the user double-clicks.

### Rationale

Why hand-place the node's `locus=`?  Because **placement is
argument** — see northstar Axiom 1.  When the author writes
`locus=[16,-13,6]`, they are making the claim "Mars belongs *here*."
That claim is the author's reasoning about how Mars relates to
everything else in the file.  An auto-layout would erase the claim.
The language refuses to provide one.

> *Status:* shipping today (as of v0.7.0, with `locus=`).

---

## `edge` — a relationship between two nodes

### Syntax

```
edge <from-id> -> <to-id> ( <attributes> )
```

The `->` is the syntactic separator.  Currently all edges are
directed (from → to); a future direction-less form may be added.

### Attributes

| Attribute    | Type    | Default | Meaning                                                                            |
| ------------ | ------- | ------- | ---------------------------------------------------------------------------------- |
| `label`      | string  | none    | Drawn near the edge midpoint.                                                       |
| `color`      | hex     | grey    | `#rrggbb` colour for the line.                                                      |
| `thickness`  | float   | 0.05    | Tube radius for the edge geometry.                                                  |

### Example

```
edge sun -> earth ( label="orbits" color=#aeb014 thickness=0.08 )
```

### Rationale

Edges are first-class structural information.  See northstar Axiom
5: *"Edges carry as much reasoning as nodes."*  The thickness,
colour, and label of an edge are visual channels the author uses to
encode the *weight* and *kind* of the relationship.  A thick gold
edge says something different than a thin grey one; the language
exposes both.

The language deliberately does **not** auto-infer edges from node
proximity or content similarity (see *Anti-features* below).  The
author declares every edge explicitly because each one is a claim.

> *Status:* shipping today.

---

## `cluster` — a spatial container with its own origin

### Syntax

```
cluster <id> ( <attributes> ) {
    <child node, edge, or cluster declarations>
}
```

Cluster declarations are hierarchical: a cluster can contain
`node`s, `edge`s (whose endpoints are inside the cluster), and
other `cluster`s.  Every node inside a cluster is positioned
**relative to the cluster's `locus`** — the cluster sets the
reference frame for its children.

### Attributes

| Attribute         | Type    | Default      | Meaning                                                                        |
| ----------------- | ------- | ------------ | ------------------------------------------------------------------------------ |
| `locus`           | [x,y,z] | required     | The cluster's origin in its parent frame (or world if top-level).               |
| `label`           | string  | id           | Cluster label drawn near its origin.                                            |
| `color`           | hex     | grey         | Default colour for child nodes that don't override.                             |
| `brightness`      | float   | inherited    | Ambient brightness inside this cluster's region.                                |
| `N`               | int     | none         | Number of subdivisions for the cluster's optional Goldberg-sphere tube frame.   |
| `stube_color`     | hex     | none         | Tube frame edge colour (if `N` is set).                                         |
| `tube_thickness`  | float   | none         | Tube frame edge thickness.                                                      |

### Example

```
cluster jupiter_system ( locus=[20,4,-8] color=#1a3a6a N=5 stube_color=#44FFFF tube_thickness=3 ) {
    node jupiter  ( locus=[0,0,0]    shape=sphere     color=#c8944a label="Jupiter" )
    node io       ( locus=[-2,2,2]   shape=sphere     color=#ffee44 label="Io"      size=0.5 )
    node europa   ( locus=[2,2,2]    shape=octahedron color=#c0d8f0 label="Europa"  size=0.5 )
    node ganymede ( locus=[-2,-2,-2] shape=dodecahedron color=#9098a0 label="Ganymede" size=0.5 )
    node callisto ( locus=[2,-2,-2]  shape=icosahedron  color=#606870 label="Callisto" size=0.5 )
}
```

Jupiter's system as a unit.  The cluster has its origin at
`[20,4,-8]` (relative to the world).  Inside, each moon has its own
locus *relative to Jupiter* — so io's `[-2,2,2]` is two units left,
two up, two forward from Jupiter, not from the world origin.

### Nesting

Clusters can contain other clusters.  Example: a top-level
`solar_system` cluster contains `jupiter_system`, `saturn_system`,
etc., each with their own moons.  Each level adds its own reference
frame.

### Rationale

Two design choices here, both load-bearing.

**Why a cluster sets a reference frame.**  Real-world conceptual
hierarchies have *natural* origins — Jupiter's moons are positioned
relative to Jupiter, not relative to some abstract world point.
Allowing the cluster to carry its origin means the author can
declare moons in *Jupiter-relative* coordinates, which is how they
actually think about them.  The author's reasoning matches the
syntax.

**Why single-parent (hierarchical, not tag-like).**  A node can
only be relative to one origin at a time — the spatial frame is
intrinsically tree-shaped.  Multi-parent membership would be
geometrically incoherent: which origin would a node like `earth`
be positioned relative to if it were in both `solar_system` and
`inhabited_planets`?  The language doesn't ask the author to
answer impossible questions.

For *non-spatial* multi-membership (earth IS in both solar_system
AND the set of inhabited planets, in the conceptual sense),
`commonality` exists.  See next section.

> *Status:* shipping today as `cluster` (with `locus=`, since
> v0.7.0).  Aligns with northstar Axiom 2:
> *"Hierarchical grouping carries meta-relationships."*

---

## `commonality` — a flat, multi-membership grouping by shared property

A second kind of grouping construct, used for relationships that
*aren't* spatial.  Any node can belong to any number of
commonalities.

### Syntax

```
commonality <id> ( <attributes> ) { <member id>, <member id>, ... }
```

The members list is a comma-separated set of node ids (referencing
nodes declared elsewhere in the file).  Member order doesn't matter
— commonality is set-like, not list-like.

### Attributes

| Attribute | Type    | Default  | Meaning                                                                                                                                  |
| --------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `label`   | string  | id       | Human-readable label for the commonality.                                                                                                |
| `color`   | hex     | grey     | Colour for the per-host satellite marker.                                                                                                |
| `shape`   | enum    | `sphere` | Geometry of the satellite marker.  Same set as `node`: `sphere`, `cube`, `tetrahedron`, `octahedron`, `dodecahedron`, `icosahedron`, `cylinder`. |

### Examples

```
commonality inhabited       ( color=#ff8844 )  { earth }
commonality ice_moons       ( color=#88ccff )  { europa, enceladus, callisto }
commonality rocky_planets   ( color=#a08070 )  { mercury, venus, earth, mars }
```

`earth` belongs to `inhabited` AND `rocky_planets` simultaneously.
That's not contradictory — the two commonalities encode different
shared properties.  Visually, earth gets two satellites on its
ring, one per commonality, each in the relevant colour.

### Rendering — orbiting satellites

A `commonality` renders as a ring of **satellites**: each member
node gets a small orbiting marker in the construct's colour and
(optionally) its declared `shape`.  Multi-membership *stacks*: a
node in two commonalities gets two satellites in two colours,
evenly spaced around the host's ring.  The author can perceive
multi-membership at a glance — and varying `shape=` between
commonalities lets the eye disambiguate without consulting
colour-to-meaning mappings.

Full geometry is locked in
[`commonality_visual_study.md`](commonality_visual_study.md).

### Grammar — file scope

Commonality declarations live **at file scope**, alongside `edge`
declarations.  They are *not* nested inside a `cluster`.  A
commonality is non-spatial; it doesn't belong to a particular
spatial container.

### Rationale

The name **`commonality`** was chosen deliberately, after a long
brainstorm.  See "The thought behind the naming" below for the
full story.  The short version:

- `commonality` names the *reason for grouping* (a shared
  characteristic) rather than the *thing* (a set / group /
  collection).  Other words name the container; this one names
  what makes the container cohere.
- It *intrinsically* requires multi-membership — a commonality of
  one is nonsensical.  Single-membership wouldn't be a
  commonality at all.
- It lands cleanly in **concept formation and category theory**
  in cognitive science (Rosch, Wittgenstein, Gentner).  The
  cognitive operation the construct enables — *abstracting across
  examples to find a shared property* — is exactly what these
  theorists call "extracting commonalities."  The keyword matches
  the cognitive act.
- It has zero overload with programming concepts (no OO baggage
  like `class`; no key-value overload like `attribute` or
  `property`; no data-structure overload like `set` in JavaScript).

The cost is length — 11 characters, 5 syllables — but `.cns` files
are expected to be **read more than typed** (AI authoring is the
primary write path; humans read), so verbosity is acceptable.

> *Status:* shipping today (v0.7.1) with the satellites halo
> render.  An earlier `style=lines` constellation render shipped
> in v0.7.2 was removed in v0.7.3 — the lines were visually
> indistinguishable from `edge` tubes.  See
> [`commonality_visual_study.md`](commonality_visual_study.md) for
> the current halo geometry.

---

## The `locus=` attribute

Both `node` and `cluster` carry a `locus=` attribute specifying
their position.  It's the same attribute meaning the same thing
in both contexts: *the defined place this thing sits in space*.

Format: `locus=[x, y, z]` where x, y, z are floats.  Right-hand
3D coordinate system.

### Why this name

`xyz=` (the pre-0.7 attribute name) was generic and technical — it
just said "here are coordinates."

`locus=` is semantic.  It says "this is the defined place of this
thing."  The word *locus* (Latin for "place") is the root of the
**method of loci** — the ancient memory technique of associating
information with specific spatial locations.  Method of loci is
arguably the original instance of the cognitive trick that
conception-space mechanises at scale: anchoring information in
space so it can be perceived and recalled spatially.

Putting `locus=` on every node and every cluster places that
cognitive-science wink in the most-frequent attribute in the
language.  Every coordinate in every `.cns` file becomes a small
nod to the lineage of using space for thought.

> *Status:* shipping today (as of v0.7.0).  Aligns with the
> *secondary* effect described in the northstar (spatial
> memorability) and complements the primary thesis (parallel
> perception of relationships).

---

## Attribute syntax in general

All declarations use the same attribute pattern:

```
<keyword> <id> ( key=value  key=value  key=value )
```

- Whitespace between attributes is the separator; commas are also
  accepted and sometimes improve readability.
- `key` is a bare identifier.
- `value` types:
  - **number**: `1`, `0.5`, `-3.7`
  - **integer**: `5`, `12` (used for things like `N=5`).
  - **string**: `"Mars"`, `"orbits"` (always double-quoted).
  - **hex color**: `#ff8844`, `#cccc33` (six hex digits, no
    alpha currently).
  - **array** (3-vector for `locus=`): `[16, -13, 6]`.
  - **enum**: bare identifier matching one of the allowed values
    (e.g. `shape=sphere`).

### Comments

Lines beginning with `#` are comments and are ignored by the parser.

```
# This is the inner planets cluster.
cluster inner_planets ( locus=[0,0,0] ) {
    ...
}
```

---

## A worked example

This is `solar.cns` written in the shipping syntax — every
construct shown here is supported as of v0.7.4.

```
# Solar system — conception-space example.
# Node locus values are relative to their parent cluster's locus.

cluster solar_system ( label="Solar System" N=6 color=#CCCC33 brightness=2 stube_color=#CCCC33 tube_thickness=3 ) {

    node sun     ( shape=sphere      locus=[0,0,0]   label="Sun"     color=#ffdd00 size=5.0 )
    node mercury ( shape=tetrahedron locus=[4,2,-2]  label="Mercury" color=#b5a090 )
    node venus   ( shape=cube        locus=[7,-1,4]  label="Venus"   color=#e8c060 )

    cluster jupiter_system ( label="Jupiter System" locus=[20,4,-8] N=5 color=#1a3a6a brightness=3.5 stube_color=#44FFFF tube_thickness=3 ) {
        node jupiter  ( shape=sphere       locus=[0,0,0]    label="Jupiter"  color=#c8944a )
        node io       ( shape=sphere       locus=[-2,2,2]   label="Io"       color=#ffee44  size=0.5 )
        node europa   ( shape=octahedron   locus=[2,2,2]    label="Europa"   color=#c0d8f0  size=0.5 )
        node ganymede ( shape=dodecahedron locus=[-2,-2,-2] label="Ganymede" color=#9098a0  size=0.5 )
        node callisto ( shape=icosahedron  locus=[2,-2,-2]  label="Callisto" color=#606870  size=0.5 )
    }

    cluster earth_system ( label="Earth System" locus=[10,2,-5] N=2 color=#223355 ) {
        node earth ( shape=octahedron  locus=[0,0,0]  label="Earth" color=#4488ee file="earth_notes.md" )
        node moon  ( shape=icosahedron locus=[1,3,2]  label="Moon"  color=#aaaaaa size=0.5 )
    }

    cluster mars_system ( label="Mars System" locus=[16,-13,6] N=3 color=#550000 ) {
        node mars   ( shape=dodecahedron locus=[0,0,0]    label="Mars"   color=#cc4422 file="mars_notes.md" )
        node phobos ( shape=tetrahedron  locus=[-2,2,1.5] label="Phobos" color=#887060 size=0.5 )
        node deimos ( shape=cube         locus=[2,-2,-1.5] label="Deimos" color=#998878 size=0.5 )
    }
}

# Edges — orbital relationships.
edge sun -> mercury  ( label="orbits" color=#aeb014 thickness=0.08 )
edge sun -> venus    ( label="orbits" color=#aeb014 thickness=0.08 )
edge sun -> earth    ( label="orbits" color=#aeb014 thickness=0.08 )
edge sun -> mars     ( label="orbits" color=#aeb014 thickness=0.08 )
edge sun -> jupiter  ( label="orbits" color=#aeb014 thickness=0.08 )

edge earth   -> moon      ( label="orbits" color=#336655 )
edge mars    -> phobos    ( label="orbits" color=#663322 )
edge mars    -> deimos    ( label="orbits" color=#663322 )
edge jupiter -> io        ( label="orbits" color=#665533 )
edge jupiter -> europa    ( label="orbits" color=#665533 )
edge jupiter -> ganymede  ( label="orbits" color=#665533 )
edge jupiter -> callisto  ( label="orbits" color=#665533 )

# Commonalities — non-spatial groupings by shared property.
commonality inhabited      ( color=#ff8844 )               { earth }
commonality rocky_planets  ( color=#a08070 )               { mercury, venus, earth, mars }
commonality ice_moons      ( color=#88ccff )               { europa, ganymede, callisto, enceladus }
```

Notice:

- `earth` lives in `earth_system` (its spatial home — a cluster) but
  also belongs to `inhabited` AND `rocky_planets` (two
  commonalities — non-spatial groupings).  No conflict.
- `mars` lives in `mars_system` but also belongs to `rocky_planets`
  alongside the others.
- `ice_moons` includes `enceladus` which lives in `saturn_system`
  (if declared), demonstrating that commonality membership crosses
  cluster boundaries freely.

---

## The thought behind the naming

The language has been through several rounds of naming.  This
section captures the thinking, because the choices weren't
arbitrary and the *why* matters as much as the *what*.

### Why drop the `node_` prefix

The original language had `node`, `node_group`, and `edge` —
mixing prefixed and un-prefixed keywords inconsistently.  `edge`
wasn't `node_edge`; there was no real reason `node_group` had to
be prefixed either.

The rename to `cluster` was already going to break files.  That
was the right moment to rationalize the whole keyword space:
single-word, un-prefixed throughout.  The four top-level keywords
now sit as peers — `node`, `edge`, `cluster`, `commonality` — and
the reader sees each one as a *structural concept* in the
language, not as a prefix family.

### Why `cluster` for the spatial container

The original name `node_group` did *two jobs* — it was both a
spatial reference frame (xyz origin) and a visual association
(coloured shell, tube frame).  We split it because we wanted
multi-membership for the *association* role (a node can belong to
many flat groupings) without breaking the *spatial* role (a node
has exactly one position, anchored relative to one origin).

The spatial half kept the bundle; we just needed a name for it.
Candidates considered and discarded:

- **`node_neighborhood`** — warm, intuitive; "where you live."
  The first proposal.  Lost out because:
- **`cluster`** — shorter (7 chars vs 12); intrinsically collective
  in English (cluster of stars, of buildings); already carries
  spatial-co-location.  Combined with the explicit `locus=`
  attribute, the keyword doesn't need to spell out "this is the
  spatial one" — the attribute does.

Other rejected options: `node_region` (clinical), `node_realm`
(mystical), `node_locus` (singular-feeling), `nodes_locus`
(ambiguous — singular possessive vs plural vs plural possessive
once the apostrophe is dropped by DSL parsing), `node_cluster_locus`
(maximally explicit but long; the locus information moved to the
attribute name instead, freeing the keyword to be shorter).

### Why `commonality` for the flat construct

The flat construct names sets of nodes that share some property —
`inhabited`, `ice_moons`, `rocky_planets`.  Candidates considered:

- **`set`** — mathematically precise; multi-membership exact.
  Cold.  Sharp contrast with cluster but no semantic warmth.
- **`group`** — generic, familiar.  Near-synonym with cluster;
  weak contrast.
- **`collection`** — implies *deliberate gathering*; mismatches
  with property-based grouping ("inhabited" isn't curated, it's
  observed).
- **`category`** — taxonomic; defaults to *single*-membership
  in everyday English ("what category is this in?").
- **`trait`** — short, common-English.  Multi-friendly but doesn't
  *intrinsically* require multi (a trait can be unique to one
  individual).  Also lives in personality psychology more than
  concept-formation in cog-sci.
- **`commonality`** — names the *reason for grouping* (a shared
  characteristic), not the *thing*.  Intrinsically requires multi
  ("commonality of one" is nonsensical).  Lands squarely in
  concept formation and category theory in cog-sci (Rosch's
  prototype theory; Wittgenstein's family resemblance; Gentner's
  structure-mapping).  Long (11 chars, 5 syllables) but the
  language is expected to be AI-written more than human-typed —
  verbosity is acceptable for low-frequency declarations.

`commonality` won on the strength of being *semantically the right
word*: it names exactly what the construct does (groups things by
what they have in common), it intrinsically carries the
multi-membership constraint, and it situates the construct in the
right intellectual neighborhood.

### Why move `locus` to an attribute name

`locus` is a beautiful word: precise, Latin-rooted, evocative of
"method of loci" (the cognitive technique of using spatial
locations as memory anchors).  We wanted it in the language
somewhere.

Initially we considered it as part of a keyword (`node_locus`,
`cluster_locus`).  Both proposals had problems — `node_locus`
sounded singular ("the locus of one node"); compound forms got
long.

The realisation: `locus` is not a *kind of thing* — it's a
*property*.  A node *has* a locus.  A cluster *has* a locus.
That's exactly what an attribute is for.

Putting `locus=` in place of the previously-generic `xyz=`:

- Replaces a technical attribute name with a semantic one
  ("here is a defined place" vs "here are coordinates").
- Places the cog-sci wink in the most-frequent attribute in the
  language — every node has one, every cluster has one.
- The same word means the same thing in both contexts (a node's
  locus is its position; a cluster's locus is its origin /
  reference frame).  Consistency across constructs.
- The keyword space stays clean and single-token.

This was the move that unlocked the rest: with `locus` carried by
the attribute, the keyword could be simply `cluster` instead of
some compound, and the keyword space became maximally clean.

### The cog-sci threads

Three threads from cognitive science run through the design:

1. **Method of loci** → `locus=`.  Every coordinate is a spatial
   anchor for memory and reasoning.
2. **Concept formation / category theory** → `commonality`.  The
   construct enables the cognitive act of abstracting across
   examples to find shared features (Rosch, Wittgenstein,
   Gentner).
3. **Spatial cognition** → the whole language.  Hand-placing
   nodes in 3D engages the visual system's parallel-perception
   machinery — see the northstar for the full thesis.

These aren't decoration.  They're the project's intellectual
heritage.  The keywords gesture at the corners of cog-sci that
inform what conception-space is trying to do.

---

## What the language deliberately doesn't have

These are anti-features.  Their absence is *part of the design*.

| Missing thing                | Why                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Auto-layout** of any kind  | Violates northstar Axiom 1 (*placement is argument*).  An algorithm placing nodes erases the author's claim. |
| **Auto-edge-inference**      | Violates Axiom 5 (*edges carry as much reasoning as nodes*).  The author decides which relationships exist. |
| **Inheritance / classes**    | Wrong vocabulary for the domain.  A `.cns` file isn't an object hierarchy; it's a spatial argument.   |
| **Macros / generation**      | The whole point is hand-authoring as sense-making.  Programmatic generation removes the reasoning.    |
| **Auto-snap on coordinates** | If the author types `locus=[10.0327, ...]`, that exact value is what they meant.  No silent rounding.  |
| **Default styling**          | Beyond very safe minimums (grey edges, default sphere shape), every visual choice is the author's.    |
| **A separate "edit mode" syntax** | Editing happens in the viewer (see `hand-authoring_ideas.md`); the `.cns` file is the canonical representation but not the editing surface. |

Each missing feature is a deliberate choice not to do something
that would weaken the author's argument-making.

---

## Status / migration

### What's shipping today

The parser and renderer currently support:

- `node` declarations (with the `locus=` attribute).
- `edge` declarations.
- `cluster` declarations (hierarchical, spatial; carries `locus=`
  for its reference-frame origin).
- `commonality` declarations (flat, file-scope, multi-membership)
  rendered as orbiting satellites — one marker per commonality,
  evenly spaced 360°/N around the host, with an optional
  `shape=` selecting the satellite geometry.
- Comments via `#`.
- Nested clusters.
- All listed attribute types (number, string, hex colour, array,
  enum).

As of v0.7.0 the keyword and attribute renames shipped (Phase 1
of the Keyword Rationalization + Flat Multi-membership work):
`node_group` → `cluster` and `xyz=` → `locus=` across the parser,
renderer, examples, generators, and docs.  Northstar Axiom 2 now
references `cluster`.

As of v0.7.1 the `commonality` keyword (Phase 2) ships with the
satellites halo render.  Design decisions in
[`commonality_visual_study.md`](commonality_visual_study.md).

As of v0.7.3 the `style=lines` opt-in shipped in v0.7.2 (Phase 3)
is **removed**.  The lines were visually indistinguishable from
`edge` tubes — see the rejected-alternatives section of
[`commonality_visual_study.md`](commonality_visual_study.md).
`commonality` now has only the satellites render and no `style=`
attribute at all.

As of v0.7.4 `commonality` supports an optional `shape=`
attribute (same value set as `node shape=`).  Each commonality's
satellites take that shape; default is `sphere`.  Varying shape
between commonalities lets a node carrying multiple satellites
disambiguate them at a glance even without colour.

### What's in-flight

All three phases of the Keyword Rationalization + Flat
Multi-membership work have landed (Phase 3 was reverted
post-experiment).  See
[`in-flight_ideas.md`](in-flight_ideas.md) for design directions
still considered but explicitly punted (bookmark × commonality
interactions, additional render styles beyond satellites).

This document presents the full target syntax — every construct
described here ships as of v0.7.4.

### For readers of older `.cns` files

Files written before v0.7.0 use:

- `node_group` where this document says `cluster`.
- `xyz=` where this document says `locus=`.
- No `commonality` construct (the use case was previously
  approximated with edge-based or repeated `node_group`
  workarounds).

The two are mechanically interchangeable — a search-and-replace
between the old and new names is sufficient for the keyword and
attribute renames.  The `commonality` construct has no pre-0.7
equivalent and must be added freshly when desired.
