# AI-authoring ideas

A focused brainstorm of how AI assistance can support an author who is
building a conception-space — especially the **bulk-import case**
where existing notes from elsewhere (Obsidian vaults, folders of PDFs,
piles of `.docx`) are coming in.

This file is a deeper notebook on one of the ideas referenced by
`in-flight_ideas.md`.  It sits in tension with intent #2 of the
[northstar](northstar.md) — *hand-authoring as sense-making* — and
that tension is the central design problem, not an afterthought.

Status: brainstorm only.  Nothing here has been promoted to a plan.
Items marked with **★** are my (Claude's) current favourites; the
user has ratified one of them (the multi-proposal rule), but the
ordering and the rest are still open.

---

## Architectural framing

**conception-space is the visualization + interaction (editing) layer
of a larger system.**  The larger system handles:

- File ingestion (`.docx`, `.pdf`, `.md`, etc.).
- Content analysis (extracting meaning, vocabulary, structure).
- Storage and indexing.
- Sidecar files (notes, annotations) for each ingested file.
- **Hosting the AI itself.**

conception-space talks to the larger system over an API.  AI
suggestions arrive over that boundary.  **This file is about how
conception-space receives, presents, and lets the author engage with
those suggestions** — not about how the AI itself is built.

Practical consequences:

- conception-space stays small and focused on the perceptual /
  interaction job (intents #1 and #2).
- The choice of AI model (local vs. external, GPT-class vs. local
  llama, etc.) lives in the larger system, not here.
- Privacy and consent decisions also live in the larger system;
  conception-space just respects the answers.
- A `.cns` file references files by an ID the larger system
  understands, not necessarily by local path.

---

## The thesis collision

Axiom 1: **placement is argument.**  When *you* place mars at
`[16,-13,6]`, that placement is *your* claim.  If an AI does it, the
placement is the AI's claim sitting in your file with your name on
it.  The space starts to look authoritative without anyone actually
having reasoned about it.

This is the worst possible failure mode for this project — the
medium of authoring (where reasoning lives) silently becomes the
medium of AI output (where reasoning is hidden).

So the question is not "should we add AI?"  The question is: **can
we design AI assistance in a way that supports sense-making instead
of replacing it?**

The frame that works:

> **AI prepares; the author reasons.**
> The AI's job is to get the author over the wall of bulk-tedium so
> they can *start* arguing.  It is not to make the argument for
> them.

---

## Two very different use cases

The original sketch contains two workflows with very different axiom
pressures.  Conflating them is a design trap.

### A. Single file, on demand

Author drops a new file into an existing, well-developed space.
AI looks at the file and at the current space, suggests options.

**Low pressure** on Axiom 1.  The author is already in flow, has
already made dozens of arguments about the space's structure, and
just wants a suggestion for one node.  The AI's role is small; the
author's surrounding reasoning is large.

### B. Bulk import from a 500-note Obsidian vault

Author has no existing structure.  Drops the whole vault in.  Asks
AI to propose a topology.

**High pressure** on Axiom 1.  The author hasn't argued about
anything yet; the AI is about to propose the *entire initial
structure*.  If the author accepts it, they've outsourced their
thinking before doing any of it.

These two cases need different UX.

---

## Design principles

Apply across both use cases; *most strict* in the bulk-import case.

### ★ The multi-proposal rule  (user-ratified)

Every AI suggestion arrives as **N alternatives, never one
default.**  The author *must* choose between them — there is no
"accept the suggestion" path because there is no single suggestion.
**The act of choosing IS the act of authorship.**  An "Other — I'll
do it myself" option is always present as a fallback, never as a
default.

This pattern eliminates the "looks reasonable, accept by default"
failure mode.  There are no defaults — only choices.

Examples of where multi-proposal applies:

**Single-node placement.**
> Where should this node go?
> (A) Near Mars and Earth — rocky-planet vocabulary
> (B) Inside the `astronomy_concepts` neighborhood — abstract astronomy
> (C) New neighborhood `space_exploration` — themes of exploration
> (Other — I'll place it manually)

**Cluster definition (bulk import).**
> How should I cluster these 143 files?
> (A) By topic — 7 clusters (astronomy, philosophy, journal, ...)
> (B) By document type — 3 clusters (notes, references, drafts)
> (C) By date written — 5 clusters (2018–19, 2020, 2021, 2022, 2023+)
> (Other — describe your own clustering criterion)

**Shape selection.**
> What shape for this node?
> (A) sphere — generic
> (B) octahedron — matches your `idea_notes` convention
> (C) cube — matches your `reference_material` convention
> (Other — pick from full list)

**Candidate edges (multi-select variant).**
> Which of these edges would you draw?
> ☐ → sun (orbits) — file mentions sun 5×
> ☐ → mars_system (member-of) — strong topical overlap
> ☐ ↔ earth (related) — files cross-reference each other
> ☐ None of these

Multi-proposal is a **UX motif**, not a single feature.  It applies
across placement, clustering, shape, edges, group memberships,
neighborhood inclusion.  Same shape, different content.

### Draft until touched

Every AI placement starts as a *draft* — visually distinct (dashed
outline, lower opacity, "unreviewed" badge, however we encode it).
It stays draft until the author has *touched* it.

With the multi-proposal rule, the moment of choosing IS the moment
of touching.  Draft state evaporates into "owned by author" when
the choice is made.  In practice, **multi-proposal + draft-until-
touched are the same rule** expressed at different moments — the
choice is the touch.

The "draft" visual is therefore reserved for the rare cases where a
node ended up in the space *without* an explicit choice — e.g. the
author chose "Other — I'll place these myself" on a batch of 200
files and walked away.  Those land in the intake pile (below) and
visibly show their unreviewed state.

### The space shows you what is still draft

Walk into your own space a year later — you can see at a glance
which nodes you actually placed and which are AI drafts you haven't
engaged with.  Sharing a `.cns` is honest about what is authored
versus what is still pending.  (Intent #3: shared mental models —
AI drafts are not yet anyone's argument.)

### AI explains its reasoning

Every option in a multi-proposal menu comes with a *why*.  "Why
option A? — shares vocabulary with Mars and Earth; file mentions
'orbit' 3×; matches your existing `rocky_planets` group."  The
author can disagree with the reasoning and use that disagreement to
articulate their own.  Sense-making *fuel*, not a replacement.

### Confidence is visible

When AI's confidence is low across all the alternatives, the menu
says so.  "I'm not very sure about any of these — you may want to
place this one manually."  Low-confidence menus are visually
distinct (washed-out colour, italic header) so the author engages
more skeptically.

### Cluster-level review before node-level review

For bulk import: before showing 143 individual placements, present
what was *found*.  "I detected 7 themes; here's how I'd label
them."  Author refines clusters first; cluster choices cascade into
per-node placements.  Coarse first, fine last.

### The intake pile

Imported files first land in a special region (visually separated
from the existing space — call it the "intake" or "loading dock").
The author *moves them out* of intake to commit them to the space.
The act of leaving intake = the act of placement = the author's
argument.  Files that arrived via "Other — I'll do it myself" and
haven't been touched yet sit here visibly waiting.

### Provenance is preserved

Every AI proposal is recoverable.  Months later: "what alternatives
did the AI propose for this node?"  "Which option did I choose,
and why was it presented?"  The history of *how* the space came to
be is itself part of intent #4 (persistent thinking artifact).

### What AI never does

AI can: group, propose alternatives, identify candidate edges, pick
shape options.  These are *categorization* operations.  It cannot:

- Decide the author's hierarchy of importance.
- Auto-merge files it thinks are duplicates.
- Discard files it can't categorize.
- Hide complexity ("we tucked 50 files into 'misc' for you").
- Render a non-draft placement without the author having chosen it.

---

## UX sketches (rough)

### Single-file import

Drag a file onto the viewer.  A small panel slides in:

> **`my-new-note.md`** ready to place.
>
> Where should I put it?
> (A) [option] — [why]
> (B) [option] — [why]
> (C) [option] — [why]
> (Other — I'll place it manually)

Author picks.  Node lands at the chosen position — *not* in draft
state, because the choice is the authorship.  (If "Other," the node
lands in the intake pile in draft state, awaiting hand placement.)

A follow-up prompt may chain for shape, group memberships,
candidate edges — each its own multi-proposal.

### Bulk import

Drop a folder onto the viewer.  A modal opens:

> **143 files detected.**
>
> How should I cluster them?
> (A) By topic — 7 clusters
> (B) By document type — 3 clusters
> (C) By date written — 5 clusters
> (Other — describe your own criterion / cluster them yourself)

Author picks a clustering scheme.  Once chosen, the AI proposes per-
cluster layouts.  Each cluster surfaces as a draft `node_neighborhood`
with the proposed members.  Author walks through, refining at the
cluster level first (rename, merge, split), then drills into
individual node placements (each via multi-proposal again).

A *batch-apply* affordance: once the author has chosen the
placement scheme for several files in a cluster, they can
"apply this pattern to the remaining 18" — turning a per-node
choice into a per-batch choice, scaled by the author's just-
demonstrated preference.

### Ongoing "ask AI" on an existing node

Keystroke (e.g. `?`) on a selected node opens a contextual AI
panel: "Where would you put this?  What shape?  Which groups?"  All
multi-proposal answers; author picks.  Lightweight, on-demand.

---

## Tensions and risks

1. **The "looks reasonable" trap.**  Plausible-looking suggestions
   get rubber-stamped by tired authors.  *The multi-proposal rule is
   the primary defense* — there is no single suggestion to
   rubber-stamp.

2. **AI bias as your bias.**  If the LLM consistently clusters by
   surface vocabulary and the author keeps picking option (A)
   (which always looks right at first glance), the space ends up
   reflecting LLM patterns.  Visible explanations let the author
   notice; a periodic "you've picked option (A) on the last 10 —
   want to step back?" prompt could help.

3. **Misread content.**  A note about "rocky stability" is
   metaphorical; AI clusters it with Mars and Earth.  Author has to
   actively correct.  Low-confidence menus are explicitly marked
   so the author engages more carefully.

4. **Privacy and model choice.**  Lives in the larger system per
   the architectural framing.  conception-space inherits whatever
   consent / data-residency / model-choice policy the larger
   system enforces.

5. **Choice paralysis.**  Multi-proposal has its own failure mode —
   if every action requires picking 1-of-N, the author tires out.
   Mitigations: keep N small (3 + Other); batch-apply once a
   pattern emerges; surface a "skip this for now" path that drops
   the node into intake as draft for later review.

6. **The "now what?" problem.**  Bulk import leaves 143 draft (or
   placed) nodes in a rough topology.  Author may be paralyzed by
   volume.  Guided review flow: AI proposes a sequence ("review
   the highest-confidence cluster first; this cluster's vocabulary
   overlaps with that one — worth a look").

7. **The "Other — I'll do it myself" must be a real path.**  If it
   means "open the text editor and type coordinates," it's a paper
   option and the multi-proposal rule collapses.  This is why
   **AI-authoring is downstream of hand-authoring** — see
   `hand-authoring_ideas.md`.

---

## Sequencing — what ships before what

The full feature stack has a natural order.  Each layer assumes the
ones below it:

1. **Hand-authoring tools** (see `hand-authoring_ideas.md`).
   The "Other — I'll do it myself" path has to be ergonomic.
   Drag-to-move, click-to-edit-attributes, inline attribute popup:
   prerequisites.

2. **Larger-system API contract.**  conception-space needs to talk
   to the analysis / storage system over a defined interface.
   Define what suggestions look like, what file references look
   like, what the round-trip is for "the author chose this."

3. **Single-file import with multi-proposal.**  Easiest entry
   point; lowest axiom pressure; validates the UX before bulk.

4. **Bulk-import flow.**  Highest value, highest stakes.  Builds
   on (3).

5. **Ongoing "ask AI" affordance** on existing nodes.

6. **Provenance + history viewing.**  Pairs with intent #4.
   Lower urgency than the import flows themselves.

---

## Open questions

- **The "Other — I'll do it myself" UX in detail.**  Does the modal
  close and the node land in intake?  Does the hand-authoring tools
  open immediately?  A hybrid?
- **What gets sent to the AI on each request.**  Just the new file?
  The whole `.cns`?  A summary of the existing space?  An ID
  reference?  This is a contract question with the larger system.
- **How does the AI know about the author's conventions?**
  ("Octahedron means `idea_notes` for me.")  Does conception-space
  communicate conventions explicitly, or does the AI infer from
  the existing `.cns`?
- **Live updates as the space evolves.**  If the author has placed
  30 new nodes since an AI draft was made, should the AI re-propose?
  Or stay frozen until the author asks?
- **Multi-user / shared spaces.**  Eventually.  Not now.  But the
  architecture should not preclude it.
- **Where edges come from when there's no obvious cross-reference.**
  Vocabulary overlap?  Semantic similarity?  Both?  And how much
  confidence is needed before AI proposes one?
- **How `commonality` (the flat construct) interacts with AI.**
  With the spatial-vs-flat split now in place (`cluster` for the
  spatial reference frame, `commonality` for flat shared-property
  groupings — see [`The_CNS_Language.md`](The_CNS_Language.md)),
  AI proposes both kinds of membership.  Flat commonalities are
  easier to get right (no placement implication); start there
  before tackling full neighborhood placement?
