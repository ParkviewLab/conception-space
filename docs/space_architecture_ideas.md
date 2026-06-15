# Cognition Cache — architecture & vocabulary (settled foundation)

This document captures the architecture direction and the settled
vocabulary for the next major evolution of conception-space: moving
the canonical file format to JSON5, externalizing it to a
hand-editable Notation on demand, and extending the language with
the constructs cog-sci research suggests.

It is **not yet an implementation plan** — it is the agreed ground
the next planning session starts from.  Where decisions are locked
they're marked **settled**; where they're still live they're
collected under *Open questions*.

---

## 1. Vocabulary (settled)

The single most important outcome of the design discussion was a
coherent, cog-sci-grounded vocabulary.  Every term below is locked.

| Concept | Term | Cog-sci grounding |
|---|---|---|
| The canonical file / top-level container | **Cognition Cache** (UI name); a root **Cluster** (in the schema) | Zettelkasten lineage; "residue of cognition" (northstar Intent 4) |
| Structural unit, nestable | **Cluster** | hierarchical grouping |
| Individual 3D object | **Node** | — |
| Typed relationship (replaces `edge`) | **Relationship** (holds *instances*) | typed edges; Cypher relationship-types |
| Flat shared-property grouping | **Commonality** | concept formation / category theory (Rosch, Wittgenstein, Gentner) |
| A 3D arrangement of a cluster's children | **Spatialization** | Lakoff's spatialization-of-form; Gärdenfors conceptual spaces |
| User-applied view control (shape TBD) | **Filter** | attention framing |
| A symbolic text rendering of a cluster | **Notation** | Bruner's symbolic mode of representation |
| canonical → notation | **externalize** | Vygotsky externalization |
| edited notation → canonical | **internalize** | Vygotsky internalization |

The loop in one sentence:

> We **externalize** a Cluster to produce a **Notation**. The user
> edits the Notation. We then **internalize** their changes back
> into the Cluster in its canonical **Cognition Cache**.

### Term glosses

- **Cognition Cache** — the persistent thinking artifact: a file on
  disk holding the canonical truth.  *Cognition* (not *Concept*)
  because the file holds the residue of thinking, not a static
  store of concept-units.  Schema-wise the file simply *is* a root
  Cluster plus file-level metadata — no separate container concept.
- **Cluster** — the one nestable structural unit, at every scale.
  The file is the root Cluster; clusters nest inside clusters down
  to leaf nodes.  Carries a reference frame, visual attributes,
  child nodes/clusters, and its own Spatializations.
- **Node** — an individual 3D object.  Identity (id, label, shape,
  colour, size, attached file, metadata).  Its *pose* —
  locus + orientation — is **not** intrinsic; a Spatialization
  supplies it (see §5).  (Its `size`, listed above, *is* intrinsic.)
- **Relationship** — a *typed* link.  Defines the cognitive meaning
  + visual treatment once; individual links are terse *instances*
  inside it.  Replaces the old untyped `edge`.
- **Commonality** — a flat, file-scope grouping of nodes by a
  shared property.  Multi-membership.  Members may carry per-member
  `weight` and `confidence`.
- **Spatialization** — one way of placing a cluster's children in
  3D.  A cluster may have many ("causal", "temporal", "physical").
  The same node sits at a different *pose* (locus + orientation) in
  different spatializations.  This is the multi-position model —
  *not* merely a camera move.
- **Filter** — a **user-applied view control**: it selects a subset
  of nodes/edges and visually marks them (enable/disable, hide/show,
  highlight); it does not move anything.  Lives on the Cluster; which
  Filters are enabled is view state, saved in bookmarks/session.
  Exact shape **deferred** (§4).
- **Notation** — a symbolic text rendering of a cluster (or a
  focused subset of it), in a DSL surface form, for text-mode
  editing.  Multiple notations of the same truth are possible, each
  surfacing different aspects in different syntax.

---

## 2. What prompted this

We set out to plan four concrete features — **New Cache…**,
**Import File…**, file-level metadata, and per-element metadata —
and the metadata-syntax question opened the deeper question of
*what a `.cns` file is, who writes it, and what it's for*.

Research into mature descriptive DSLs (HCL, USDA, Cypher, GraphQL
SDL) plus a cog-sci essay on representation-language design pushed
us to two reframes:

1. **The 3D editor is the primary author surface, not the text
   file.**  Most users never see the underlying file.
2. **Therefore the file can be machine-shaped (JSON5), and the
   human-friendly text surface becomes a Notation, externalized on
   demand.**

Those two reframes resolve almost every earlier tension.

---

## 3. Storage architecture (settled)

### JSON5 is canonical

The file on disk is **JSON5** (the project already depends on
`json5` for bookmark sidecars).  The 3D editor reads and writes it
directly.  Every present and future feature — typed relationships,
spatializations, dimensions, reification, confidence — lands in
JSON5 as *another key*.  No per-feature syntax design.

### The Cognition Cache is a root Cluster

The top level of the file *is* a Cluster — the root one — plus
file-level metadata.  Clusters nest; the root contains everything.
No separate "project" / "space" container concept.

### Notation is the externalized text surface

The custom `.cns` DSL is no longer a storage format.  It is a
**Notation**: a text rendering produced by *externalizing* a
cluster, edited by the user, and *internalized* back into the
canonical JSON5.  A Notation can be **focused** — surfacing only
the causal relationships, or only the naming layer, or only
AI-proposed elements — and rendered in whatever surface syntax
suits that focus.  This is where the cog-sci essay's English-verb
syntax recommendations live (`A causes B`, `A near B`), without
constraining storage.

### externalize / internalize

- **externalize**: canonical JSON5 → Notation (text).
- **internalize**: edited Notation → canonical JSON5 — a *bounded
  merge*: only the editable aspect of the scoped elements is written
  back; everything else is untouchable by construction.

**The round-trip is the point — not a deferred milestone.**  A
Notation exists to be *edited*; externalize-without-internalize
ships the engine without the wheels.  What makes internalize safe
enough to ship from the start is **scope**: a Notation always
externalizes a bounded slice (a selection × one editable
aspect, §5), so the merge can only touch *that* slice.  The
narrower the scope, the more trivial the merge.  The residual hard
part is no longer "can we merge?" but the **drift policy** — what
to do if the Cache changed underneath the Notation between
externalize and internalize (§7).

### Axiom 1 is preserved

The cog-sci advice that "geometry should emerge from relations" is
**rejected**.  Hand-placed coordinates *are* the argument
(northstar Axiom 1) — that's the contrarian bet that makes the
parallel-perception thesis work.  Spatializations hold *hand-placed*
poses per arrangement; nothing auto-lays-out.  Qualitative
relations (`near`, `inside`) may be layered as *additional*
assertions, never as a replacement for placement.

---

## 4. The JSON5 schema (v1 draft)

A first concrete cut.  Open structural questions are flagged inline
and collected in §7.

### Conventions

- `$schema_version` at the top; bumped on shape changes.
- Every element MAY carry a `meta: { … }` sub-object for arbitrary
  user/AI metadata.  Unknown keys are ignored with a soft warning,
  so forward-extensions don't break older apps.
- Well-known `meta` keys with rendering rules: `provenance`,
  `confidence`, `status`, `weight`.
- A Node's identity and intrinsic `size` live on the Node; **its
  pose — `locus` + `orientation` — lives in a Spatialization** (§5).
  A Node has no intrinsic locus or orientation.

### Top-level skeleton (the root Cluster)

```json5
{
  $schema_version: 1,

  // The file IS the root cluster.  These are root-cluster fields:
  id:    'solar_knowledge',
  label: 'Solar System Knowledge',

  meta: {
    creation_timestamp:          '2026-05-27T15:30:00Z', // set once
    last_modification_timestamp: '2026-05-27T15:30:00Z', // every save
    tool_version:                '0.8.0',
    authors:                     ['gary'],
    description:                 'Worked example',
  },

  // The root cluster's direct children:
  clusters:      [ /* nested Clusters */ ],
  nodes:         [ /* direct child Nodes, if any */ ],
  relationships: [ /* Relationships (live on the lowest common cluster) */ ],
  commonalities: [ /* Commonalities (flat, cluster-scope) */ ],

  // User-applied view filters — select + visually mark a subset.
  // Shape deferred; defined later (§5).
  filters: [ /* … */ ],

  // The root cluster's Spatializations (placements of its children):
  spatializations: [ /* … */ ],

  // Notations — scoped, editable text slices that round-trip (§5):
  notations: [ /* … */ ],
}
```

### Cluster

```json5
{
  id:             'jupiter_system',
  label:          'Jupiter System',
  color:          '#1a3a6a',
  brightness:     3.5,
  N:              5,           // Goldberg-sphere subdivision (optional)
  stube_color:    '#44FFFF',
  tube_thickness: 3,
  meta:           { /* … */ },

  // children (nested):
  clusters: [ /* … */ ],
  nodes:    [ /* … */ ],

  // user-applied view filters — shape deferred (§5):
  filters: [ /* … */ ],

  // how this cluster's direct children are placed:
  spatializations: [
    {
      id:    'default',
      label: 'Default',
      dimensions: {           // advisory axis semantics (optional)
        x: { label: 'Heliocentric distance', units: 'au' },
        y: { label: 'Inclination',           units: 'deg' },
        z: { label: 'Phase',                 units: 'rad' },
      },
      // pose of each DIRECT child (node or child-cluster) in THIS
      // spatialization, keyed by child id.  locus = location [x,y,z]
      // (required); orientation = quaternion [x,y,z,w] (optional;
      // omitted = identity).  size is NOT here — it's an intrinsic
      // Node property.
      poses: {
        jupiter:  { locus: [0, 0, 0] },
        io:       { locus: [-2, 2, 2],   orientation: [0, 0.383, 0, 0.924] }, // 45° yaw
        europa:   { locus: [2, 2, 2] },
        ganymede: { locus: [-2, -2, -2] },
        callisto: { locus: [2, -2, -2] },
      },
    },
  ],

  // scoped, editable text slices (see §5):
  notations: [ /* … */ ],
}
```

### Node

```json5
{
  id:    'mars',
  label: 'Mars',
  shape: 'dodecahedron',   // sphere|cube|tetrahedron|octahedron|dodecahedron|icosahedron|cylinder
  color: '#cc4422',
  size:  1.0,                    // intrinsic — the SAME in every spatialization
  file:  'files/mars_notes.md',  // optional attached file (relative to cache dir)
  meta: {
    provenance: 'human',   // human | ai | imported-from:<path>
    confidence: 1.0,       // 0..1 or low|medium|high
    status:     'accepted',// proposed | accepted | hypothesis | rejected
  },
  // NB: no `locus`/`orientation` — the node's POSE (where it sits and
  // which way it faces) is supplied per-spatialization (§5).  Only the
  // intrinsic `size` lives on the node.
}
```

### Relationship (replaces `edge`)

```json5
{
  id:        'orbits',     // type-level identity, unique within cluster
  label:     'orbits',
  color:     '#aeb014',
  thickness: 0.08,
  meta:      { /* type-level metadata */ },

  // The instances.  `from -> to` becomes { from, to }.
  // Per-instance fields override type defaults; per-instance meta
  // carries weight / confidence / provenance / status.
  instances: [
    { from: 'mercury', to: 'sun' },
    { from: 'venus',   to: 'sun' },
    { from: 'io',      to: 'jupiter', color: '#665533' },   // visual override
    { from: 'thunder', to: 'lightning', symmetric: true },  // non-directional
    {
      id:   'moon_orbits_earth',   // reified — has its own id
      from: 'moon', to: 'earth',
      meta: { weight: 1.0, confidence: 1.0, observed_since: 1610 },
    },
  ],
}
```

### Commonality

```json5
{
  id:    'inhabited',
  label: 'Inhabited',
  color: '#ff8844',
  shape: 'tetrahedron',     // satellite geometry (defaults to sphere)
  meta:  { /* … */ },

  // Members: bare id strings (common case), or { node, meta } objects
  // when per-member weight / confidence are needed.
  members: [
    { node: 'earth', meta: { weight: 1.0, confidence: 0.9 } },
    { node: 'moon',  meta: { weight: 0.1, confidence: 0.4 } },
  ],
},
{
  id: 'rocky_planets', label: 'Rocky planets', color: '#a08070',
  members: ['mercury', 'venus', 'earth', 'mars'],   // shorthand form
},
```

### Filter (shape deferred)

A Cluster carries a `filters: [ … ]` array — but **the Filter shape
is not defined yet**; it's deferred to a later pass.

Direction only (not settled — do not build on it): a Filter's
`match` will likely be a Boolean expression over sets of nodes and
edges, and the Filter will carry its own visual `op` — there is no
separate visual-application construct.
Filters are **user-applied to the current view**; *which* are enabled
is view state, persisted in bookmarks and the saved session and
restored on restart.

### Notation (a scoped, editable text slice that round-trips)

```json5
{
  id:       'wire_inhabited',
  label:    'Wire edges among rocky & inhabited',
  scope:    'rocky_inhabited',  // a Filter id — its selection scopes this Notation
  halo:     'incident-edges',   // out-of-scope endpoints shown read-only,
                                // so you can see what you're wiring
  editable: 'relationships',    // the one aspect the user may change here
  surface:  'verb-list',        // which DSL surface form to externalize as
  // internalize writes back ONLY `editable` of the scoped core;
  // references to out-of-scope nodes: accept-by-id, reject-unknown.
}
```

### Worked example — `solar.cns.json5` (abridged)

```json5
{
  $schema_version: 1,
  id: 'solar_knowledge',
  label: 'Solar System Knowledge',
  meta: {
    creation_timestamp:          '2026-05-27T15:30:00Z',
    last_modification_timestamp: '2026-05-27T15:30:00Z',
    tool_version: '0.8.0', authors: ['gary'],
  },

  clusters: [
    {
      id: 'solar_system', label: 'Solar System',
      color: '#CCCC33', N: 6, brightness: 2,
      nodes: [
        { id: 'sun',     label: 'Sun',     shape: 'sphere',      color: '#ffdd00', size: 5.0 },
        { id: 'mercury', label: 'Mercury', shape: 'tetrahedron', color: '#b5a090' },
        { id: 'venus',   label: 'Venus',   shape: 'cube',        color: '#e8c060' },
      ],
      clusters: [
        {
          id: 'jupiter_system', label: 'Jupiter System', color: '#1a3a6a', N: 5,
          nodes: [
            { id: 'jupiter',  label: 'Jupiter',  shape: 'sphere',       color: '#c8944a' },
            { id: 'io',       label: 'Io',       shape: 'sphere',       color: '#ffee44', size: 0.5 },
            { id: 'europa',   label: 'Europa',   shape: 'octahedron',   color: '#c0d8f0', size: 0.5 },
            { id: 'ganymede', label: 'Ganymede', shape: 'dodecahedron', color: '#9098a0', size: 0.5 },
            { id: 'callisto', label: 'Callisto', shape: 'icosahedron',  color: '#606870', size: 0.5 },
          ],
          spatializations: [
            { id: 'default', poses: {
                jupiter: { locus: [0,0,0] }, io: { locus: [-2,2,2] }, europa: { locus: [2,2,2] },
                ganymede: { locus: [-2,-2,-2] }, callisto: { locus: [2,-2,-2] },
            } },
          ],
        },
        // earth_system, mars_system, saturn_system … (elided)
      ],
      spatializations: [
        { id: 'default', poses: {
            sun: { locus: [0,0,0] }, mercury: { locus: [4,2,-2] }, venus: { locus: [7,-1,4] },
            jupiter_system: { locus: [20,4,-8] }, earth_system: { locus: [10,2,-5] }, mars_system: { locus: [16,-13,6] },
        } },
      ],
    },
  ],

  relationships: [
    {
      id: 'orbits', label: 'orbits', color: '#aeb014', thickness: 0.08,
      instances: [
        { from: 'mercury', to: 'sun' },
        { from: 'venus',   to: 'sun' },
        { from: 'jupiter', to: 'sun' },
        { from: 'io',      to: 'jupiter', color: '#665533' },
        { from: 'europa',  to: 'jupiter', color: '#665533' },
      ],
    },
  ],

  commonalities: [
    { id: 'inhabited',     label: 'Inhabited',     color: '#ff8844',
      members: [{ node: 'earth', meta: { weight: 1.0, confidence: 0.9 } }] },
    { id: 'rocky_planets', label: 'Rocky planets', color: '#a08070',
      members: ['mercury', 'venus', 'earth', 'mars'] },
  ],

  spatializations: [
    { id: 'default', poses: { solar_system: { locus: [0,0,0] } } },
  ],

  notations: [],
}
```

---

## 5. Spatializations, Filters, Notations

Three constructs a Cluster carries alongside its content, and they
are independent: a **Spatialization** governs 3D placement, a
**Filter** is a view control, a **Notation** governs the editable
text surface.

| You want to… | You use a… | It does… |
|---|---|---|
| place the same nodes differently per domain | **Spatialization** | sets each child's 3D **pose** (locus + orientation) |
| highlight / hide a subset on your current view | **Filter** | a user-applied view control (shape deferred — §4) |
| read / edit a focused subset as text | **Notation** | externalizes a scoped slice → you edit it → it internalizes back |

**A Notation is a scoped round-trip.**  It externalizes a *core*
(a selected subset of elements) plus a read-only *halo* (e.g. the
far endpoints of edges that leave the selection — shown so you can
see what you're wiring), with one declared **editable aspect** (e.g.
the edges among the core).  You edit the text; internalize writes
back *only* that aspect of *only* the core.  References to
out-of-scope nodes are accepted by id when they exist in the Cache,
and rejected when unknown.

- **Spatialization** = "where everything sits in 3D right now."
  `causal`, `temporal`, `physical` — same nodes, different poses.
  Belongs to a Cluster; a cluster may have several.
- **Filter** = a **user-applied view control**: it selects a subset
  of nodes/edges and visually marks them (highlight / hide / …).  The
  user toggles Filters on the current view; which are enabled is view
  state, saved in bookmarks/session.  Lives on the Cluster.  *Exact
  shape deferred — see §4.*
- **Notation** = "the focused, editable text I'm working in."  A
  scoped externalize + one editable aspect that internalizes back.
  Belongs to a Cluster; a cluster may have several.

All three are per-Cluster and independent of one another.

---

## 6. Language extensions

### Typed Relationship replaces `edge` — **settled**

`edge` is gone (hard rename, like `node_group → cluster`).  A
`Relationship` declares meaning + visual treatment once; instances
are terse pairs (`from -> to`, or `<->` symmetric).  Per-instance
visual overrides allowed.  Instances may be reified (given ids) for
metadata or relationship-of-relationship references.

### Commonalities are regions — **settled**, plus weighted members

No separate `region` construct — a node in N commonalities is at an
N-region intersection.  New: per-member `weight` + `confidence`
give prototype-style fuzzy borders ("earth is more central to
`inhabited` than moon is").

### Confidence / provenance / status — **settled as three fields**

Distinct concepts, distinct keys under `meta`, distinct visual
rules (dashed = proposed, faded = low confidence, badge = AI
provenance).  They compose: an AI-proposed, low-confidence node
renders translucent + dashed + badged until the user accepts it.

### Named dimensions (advisory) — **settled for v1 as advisory**

A spatialization may declare axis semantics (`x: timeline`).
Advisory only in v1 — not enforced.  Sidesteps the
imported-dimension-merge problem (which survives as a future
question).

### Reified relationships — **settled in principle**

Instances may carry an `id`.  Enables per-instance metadata and
future relationship-of-relationships.  Build the id mechanism in
from the start; defer the *referencing* design until needed.

### Multi-spatialization (multi-position) — **settled as the model**

"Any Cluster may have multiple Spatializations" resolves the
earlier open question in favour of the *multi-position* model: a
node's pose (locus + orientation) is per-spatialization, hand-placed
in each, Axiom-1 honoured per arrangement.  (Filters are a separate,
lighter view-control mechanism.)

### Inference / soft constraints — **deferred**

AI's job, post-tooling.  Build the human tool first; AI then uses
its surface to propose nodes / relationships, find contradictions,
research links — all as `status: proposed` until the user accepts.

---

## 7. Open questions (genuinely still open)

1. **Nested vs flat cluster storage.**  Draft above is *nested*
   (clusters contain their children; spatializations hold a
   per-direct-child pose map).  Alternative: flat arrays with
   `parent` / `clusterId` refs.  Nested keeps poses near their
   cluster and scopes spatializations structurally; flat is easier
   to query and to re-parent.  Lean: nested, given spatializations.
2. **Cross-cluster spatialization coordination.**  When the root is
   in its `causal` spatialization, do nested clusters switch to
   their `causal` too (matched by name), or does each cluster
   remember its own current spatialization independently (session
   state)?
3. **Notation drift policy.**  Internalize ships from v1 — scope
   makes the merge bounded (§3, §5), so *whether* to round-trip is
   settled.  The open part is what to do when the Cache changed
   underneath a Notation between externalize and internalize: rebase
   the edit onto current, or reject and re-externalize.  Snapshotting
   the base alongside the Notation lets us *detect* drift; the
   natural quick-loop usage (externalize → edit → internalize right
   away) keeps the window small.
4. **File extension.**  `.cns` (treated as JSON5)?  `.cns.json5`?
   a new one?  Affects editor integration + grep.
5. **Migration of existing `.cns` files.**  ~5 examples + 3 test
   generators emit the old DSL.  Parallel format with a one-shot
   converter, or hard cut?  No shipped users → a hard cut is
   feasible if timed right.
6. **Per-instance metadata syntax in *Notations*.**  When we build
   the editable text surface, what does per-instance metadata look
   like in the DSL?  (Inherits whatever `node` uses for attributes,
   probably.)

---

## 8. Where this leaves the immediate four-item feature set

Under JSON5-canonical the four user-stated features shrink to
near-trivial:

| Feature | Under JSON5 canonical |
|---|---|
| **New Cache…** | dialog + `mkdir <dir>/<name>/files/` + write an initial JSON5 root-cluster object with `meta.creation_timestamp` |
| **Import File…** | dialog + `copyFile` into `files/` + insert a Node object + position it in the active Spatialization (in front of camera, ¼ viewport height, no intersection) + write back |
| **Front-matter timestamps** | top-level `meta.creation_timestamp` / `meta.last_modification_timestamp` |
| **Per-element metadata** | `meta: { … }` on any element — native, no syntax design |

The custom DSL stays alive only as the **Notation** surface, which
does *not* need to be finalised before these four ship.  A v0
Notation can be "pretty-printed JSON5 with focus filtering."

---

## 9. Suggested phasing (for the next implementation plan)

1. **JSON5 storage format** — define the canonical schema (resolve
   §7.1, §7.4, §7.5), port the example files + generators, teach the
   parser/loader to read JSON5.  Decide migration.
2. **New Cache… + Import File…** — dialogs + filesystem + JSON5
   object mutation.  Front-matter timestamps land here.
3. **Per-element metadata + rendering rules** — define the
   well-known `meta` keys (`provenance`, `confidence`, `status`,
   `weight`) and the visual rules that respond to them.
4. **Typed `Relationship`** — replaces `edge`; schema + renderer +
   example migration.  Own plan.
5. **Spatializations** — multi-position schema + the
   spatialization-switcher UI (resolve §7.2).
6. **Filters** — the user-applied view control: select a subset of
   nodes/edges and visually mark them (highlight / hide / …), toggled
   per view with the enabled-set saved in bookmarks/session.  (Full
   shape to be designed — see §4.)
7. **Notation round-trip (scoped)** — externalize a scoped slice
   with one editable aspect → edit → internalize.  Includes
   core/halo, accept-by-id / reject-unknown, and drift detection via
   a base snapshot (§7.3).  This is the whole point of Notations —
   it ships *with* internalize, not as a read-only render.
8. **Named dimensions (advisory)** — schema + axis-label rendering.
9. **Reification + confidence / provenance / status visuals.**

Phases 1–3 are the immediate user-stated work, enlarged only by the
JSON5 switch.  Phases 4–9 are the cog-sci-informed extensions,
each its own follow-on plan.

---

## 10. Next step

When ready, pick the most-leveraged decisions first — they unblock
everything else:

- File extension + migration strategy (§7.4, §7.5)
- Nested vs flat storage (§7.1)
- Whether `Relationship` ships in the first format cut or follows

Everything else can be decided in-flight without painting us into a
corner.
