<!--
SPDX-FileCopyrightText: 2026 Gary Frattarola <garyf@parkviewlab.ai>
SPDX-License-Identifier: CC-BY-4.0
-->

# Commonality satellites halo

Describes the satellites-halo render for `commonality` declarations
as it actually ships (v0.7.1).  See
[`The_CNS_Language.md`](The_CNS_Language.md) for the language-level
context.

The idiom is **satellites**: each commonality contributes one small
coloured marker around each of its member nodes.  Multi-membership
stacks naturally — a node in three commonalities gets three
satellites in three colours.

## 1. Slow synchronous orbiting

Satellites orbit on their host's ring at ~3.5 rad/s (≈ 1.8-second
full revolution).  All satellites share a single global orbital
phase, so each host's ring rotates as a unit — multi-membership
reads as one ring turning, not independent specks drifting.

Motion is the disambiguator.  Without it, the small static markers
were visually indistinguishable from regular `size=0.5` nodes; the
colour alone didn't separate decoration from substance, especially
at oblique camera angles where ring geometry compresses.

This extends [`northstar.md`](northstar.md) Axiom 3 ("smooth motion
is load-bearing, not polish") beyond camera flight: in this project,
*decoration markers benefit from motion-as-disambiguation*.

## 2. Absolute satellite size

Satellite radius is **absolute** (0.10 world units), not a fraction
of the host's size.

The rationale is semantic: a commonality has the same meaning
regardless of what node it is applied to.  A `inhabited` marker
should weigh the same on a sun-sized node as on a moon-sized one,
because the *commonality* is the same thing in both contexts.
Scaling the marker with the host would imply that "inhabited on the
sun" carries more visual weight than "inhabited on Earth," which is
the opposite of how flat membership should read.

## 3. Per-host even distribution; gap-based ring radius

**Distribution.**  Per host, satellites are spaced evenly: a node
with N memberships gets satellites at angles `(i / N) × 2π`,
lex-sorted by commonality id so order is deterministic across
reloads.

A node with 2 memberships shows them 180° apart; with 3, 120°
apart; with 4, 90° apart.  Even spacing reads cleanly at a glance
and scales naturally to any N.

**Ring plane.**  Equatorial — XZ plane, fixed in world space.  The
ring appears elliptical at oblique camera angles; the ellipse helps
depth reading.

**Ring radius.**  Computed per host as

```
ringR = host_body_radius + satellite_radius + ring_gap
      = host.size × 0.6 + 0.10 + 0.20
```

The gap between the host's surface and the satellite's surface is a
constant 0.20 world units regardless of host size.  Same visual
breathing room around every host: a moon's ring sits just outside
the moon, the sun's ring just outside the sun, both with identical
spacing margins.

## 4. Labels and visibility

**Labels.**  Each satellite carries a CSS2D label showing the
commonality's `label=` attribute (defaulting to its id).  The
label sits 0.12 units above the satellite's top.  Hidden together
with the global labels toggle (`setLabelsVisible`), same as node
and edge labels.

**Visibility hooked to host.**  When a containing cluster goes
solid, the host node hides — and its satellites hide with it.  This
mirrors the existing `_updateDescendantVisibility` rule for node
meshes and tube frames.

## Rejected alternatives

These were considered during design and ruled out:

- **Distributed sphere** for satellite placement.  Harder to read
  at a glance, no canonical "up."  Equatorial ring won.
- **Per-host hash-assigned slots from a fixed 8-slot ring.**  Gave
  cross-host visual consistency (same commonality always at the
  same clock position), but produced uneven per-host spacing when
  N < 8.  Even spacing per host won — the gain from "evenly spaced
  on this node" exceeds the gain from "same clock position
  everywhere."
- **Static (no orbit).**  Indistinguishable from regular small
  nodes; reversed during Phase 2 review.  See §1.
- **Soft-cap with warning at high N.**  Not needed under even
  distribution — N satellites with 360°/N spacing remain readable
  up into double digits.  Revisit if real scenes hit problems.

## Implementation constants

From [`scene.js`](../app/src/renderer/src/scene.js):

```js
const COMMONALITY_RING_GAP        = 0.20  // absolute — gap between host surface and satellite surface
const COMMONALITY_SAT_RADIUS      = 0.10  // absolute — same on every host
const COMMONALITY_RING_Y_FACTOR   = 0.0   // × host.size — ring plane y-offset
const COMMONALITY_ORBIT_RAD_PER_S = 3.5   // ~1.8-second full orbit
const NODE_BODY_RADIUS_FACTOR     = 0.6   // × host.size — node body "radius"
```

The Y-factor is currently 0 (equatorial); the constant is kept so
the ring plane can be shifted below the host (tropical orbit) by
tweaking one number if a future scene benefits from it.
