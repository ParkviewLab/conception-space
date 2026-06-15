<!--
SPDX-FileCopyrightText: 2026 Gary Frattarola <garyf@parkviewlab.ai>
SPDX-License-Identifier: CC-BY-4.0
-->

Not many are “DSLs for cognitive science” in the narrow programming-language sense, but several families are directly relevant.

The best ones to study:

| Candidate | Why it matters for Conception-Space |
|---|---|
| Gärdenfors’ Conceptual Spaces | Core inspiration: concepts as regions in multidimensional quality spaces; similarity becomes distance. This is probably the closest theoretical neighbor. |
| Qualitative Spatial Reasoning / RCC8 | Defines relationships like disconnected, overlapping, containment, tangential contact. Good lesson: name spatial relations symbolically, not just numerically. |
| CogSketch / nuSketch | Combines sketch geometry, qualitative spatial relations, conceptual knowledge, and analogical reasoning. Very relevant if Conception-Space has diagrams or spatial canvases. |
| Structure-Mapping / analogy systems | Not a placement DSL, but crucial for “relationship-preserving” comparison between conceptual arrangements. CogSketch explicitly uses this lineage. |
| OWL/RDF/SWRL spatial ontologies | Useful lesson: separate entities, relations, inference rules, and visual/layout projection. RCC8 has been represented this way. |
| SpatialGrammar-style scene DSLs | Newer 3D layout DSL work, less cognitive-science-rooted, but useful for syntax design: declarative objects, constraints, placement, containment, adjacency. |

Main design lessons I’d steal:

1. Separate conceptual relation from rendered position.
    “A contains B,” “A opposes B,” and “A is prerequisite for B” should not be identical to x/y coordinates.
2. Use qualitative relations first, metrics second.
    Cognitive spaces often care more about near, inside, between, overlapping, adjacent, orthogonal, opposed, or derived-from than exact coordinates.
3. Represent concepts as regions, not just points.
    A concept can have fuzzy extent, prototypes, borders, overlap, and family resemblance.
4. Make dimensions explicit.
    A Conception-Space DSL should let you declare axes such as abstraction, certainty, agency, scale, causality, time, embodiment, or evidence-strength.
5. Allow multiple simultaneous spaces.
    The same object may live in causal space, semantic space, temporal space, social space, and implementation space.
6. Treat relationships as first-class objects.
    Relationships should have type, strength, direction, evidence, provenance, and maybe uncertainty.
7. Support inference without forcing full logic.
    RCC8/OWL show the value of inference, but a usable DSL should probably permit soft constraints, partial contradiction, and “unknown,” not just theorem-prover rigidity.

For Conception-Space, I’d look hardest at Conceptual Spaces + RCC8/QSR + CogSketch. That trio gives you the strongest blend of cognitive plausibility, spatial semantics, and practical representational machinery.

-----

Absolutely. The syntax lessons are arguably more valuable than the underlying theory, because most of these systems succeeded or failed based on how naturally humans could author, read, modify, and reason about the representations.

A few strong recurring patterns emerge.

⸻

1. Declarative syntax wins overwhelmingly

The successful exemplars describe what is true, not how to compute it.

Bad:

(move-concept A (+ x 5))

Good:

A near B
A overlaps C
A inside D

Or:

concept "gravity" {
    region: physics
    near: mass
    opposes: levity
}

The cognitive-science systems that endured tend to look more like:

* logic
* ontology declarations
* graph definitions
* constraint systems
* scene descriptions

—not procedural code.

Conception-Space almost certainly wants:

* declarative semantics
* constraint-oriented syntax
* graph/space statements
* incremental refinement

rather than an imperative language.

⸻

2. Human-readable relation syntax matters enormously

The successful systems use relations that read almost like English.

RCC8:

A disconnected_from B
A overlaps B
A inside B

Conceptual graph systems:

bird isa animal
sparrow instance_of bird

The key lesson:

Prefer semantic verbs over symbolic punctuation.

This:

ideaA -> ideaB

is weaker than:

ideaA causes ideaB
ideaA refines ideaB
ideaA contradicts ideaB

because:

* humans parse it faster
* LLMs parse it better
* inference becomes easier
* visualization becomes richer

A Conception-Space DSL should probably have a fairly large vocabulary of first-class relationship verbs.

⸻

3. Nested containment syntax is cognitively powerful

Spatial cognition systems repeatedly rediscover the value of containment.

Example pattern:

space Physics {
    concept Gravity {
        near Mass
    }
}

Humans naturally understand:

* inside
* outside
* grouped-within
* layered scope

This maps directly onto:

* conceptual clustering
* abstraction
* domains
* contexts
* frames

Containment is one of the deepest primitives in cognition.

⸻

4. Constraints are better than coordinates

The strongest systems avoid explicit coordinates whenever possible.

Weak:

A at (10,20)
B at (12,21)

Strong:

A near B
A above C
A between D and E
A inside F

Why?

Because cognitive relationships are:

* relational
* elastic
* topology-oriented
* meaning-oriented

not pixel-oriented.

Even modern scene DSLs increasingly use:

* constraints
* anchoring
* adjacency
* force systems

rather than fixed coordinates.

You probably want:

* optional coordinates
* primary relational semantics

⸻

5. Typed relationships outperform generic edges

Many graph systems failed because every edge became:

A -> B

without semantics.

Good systems strongly type edges:

A causes B
A analogous_to B
A derived_from B
A prerequisite_for B
A refutes B

This is probably one of the most important lessons for Conception-Space.

The edge is not secondary metadata.

The edge is often the actual meaning.

⸻

6. Multi-layer semantics are important

The best systems separate:

| Layer | Example |
|---|---|
| Ontology | “dog isa mammal” |
| Spatial relation | “dog near wolf” |
| Epistemic status | “hypothesized” |
| Causal relation | “A causes B” |
| Confidence | “0.72” |
| Provenance | “from paper X” |

A syntax lesson:

Do not overload one construct with all semantics.

Instead:

relation {
    from: A
    to: B
    type: analogous_to
    confidence: 0.82
    evidence: paper123
}

or concise sugar over such structure.

⸻

7. Optional verbosity is critical

The best DSLs usually have:

* concise forms
* expanded canonical forms

Example:

Compact:

A near B

Expanded:

relation {
    source: A
    target: B
    type: proximity
    metric: semantic
    strength: 0.8
}

This duality is extremely important.

Humans think in shorthand.
Machines often need explicit structure.

⸻

8. Identity syntax matters more than expected

A huge issue in conceptual systems:

* aliases
* ambiguity
* partial identity
* prototypes
* perspectives

Study how ontology languages handle identifiers.

Potential Conception-Space pattern:

concept gravity as Physics::Gravity

versus display labels:

label "Gravity"

You probably want:

* stable IDs
* human labels
* aliases
* namespace support

from the beginning.

⸻

9. Geometry should emerge, not dominate

CogSketch and qualitative reasoning systems teach a subtle lesson:

The meaning should survive layout changes.

If you drag nodes around, semantics should remain true.

Thus:

A near B

should not merely mean Euclidean closeness.
It should mean conceptual proximity.

Visualization becomes a projection of semantics.

This is an extremely important architectural principle.

⸻

10. The best syntax supports incomplete knowledge

Human cognition is incomplete and approximate.

Good systems allow:

A maybe_related_to B
A ?inside B
A weakly_supports B

or:

confidence: low

Rigid logic-only systems become brittle.

Conception-Space likely wants:

* gradients
* fuzziness
* probabilistic relations
* tentative assertions

⸻

11. Reification becomes unavoidable

Eventually users want to talk about relationships themselves.

Example:

relation R1 {
    type: causes
    from: A
    to: B
}

Then:

R1 contradicted_by R2
R1 discovered_by "Einstein"

Most mature knowledge systems eventually require this.

Design for it early.

⸻

12. Avoid excessive symbolic punctuation

Many historical AI DSLs became unreadable:

(inside A (and B (not C)))

or:

inside(a,b):-not(overlaps(a,c)).

Readable symbolic density matters enormously.

Modern successful DSLs trend toward:

* YAML-like
* Markdown-like
* indentation-based
* lightly structured text

because:

* humans edit them better
* diffs are cleaner
* LLMs manipulate them better

⸻

My strongest syntax recommendation

Conception-Space probably wants a hybrid of:

| Influence | Borrow |
|---|---|
| Conceptual Spaces | regions, dimensions, similarity |
| RCC8/QSR | qualitative spatial relations |
| Graph DSLs | typed edges |
| YAML/TOML | readability |
| Markdown | authorability |
| Ontologies | identity + typing |
| Scene DSLs | containment + constraints |

Something like:

space Physics {
    concept Gravity {
        near: Mass
        related_to: Curvature
        opposes: Levity?
        confidence: high
    }
    concept Relativity {
        contains: {
            Spacetime
            Curvature
        }
    }
    relation {
        from: Gravity
        to: Curvature
        type: causes
        strength: 0.82
    }
}

That is:

* readable
* composable
* inferable
* visualizable
* LLM-friendly
* diff-friendly
* machine-structured

—which is an unusually hard combination to achieve simultaneously.