<!--
SPDX-FileCopyrightText: 2026 Gary Frattarola <garyf@parkviewlab.ai>
SPDX-License-Identifier: CC-BY-4.0
-->

# Vision Pro — the enactive mode

A focused notebook for a spatial, **passthrough** version of conception-space on
Apple Vision Pro. Indexed from [`in-flight_ideas.md`](in-flight_ideas.md). Reads
against the [northstar](northstar.md) and reuses the locked vocabulary of
[`space_architecture_ideas.md`](space_architecture_ideas.md) (**Cognition Cache**,
**Notation**, **Filter**, **Spatialization**, **Cluster**, **Node**,
**Relationship**, **Commonality**, externalize / internalize).

This is a *candidate direction under consideration*, not a commitment.

---

## Why this is the apex, not a port

The northstar's core claim is that a visual, parallel perceptual channel is a
fundamentally higher-bandwidth way to grasp relational structure than any linear
medium — *"and it is the reason this tool exists."*

Read through Bruner's three modes of representation (the project already grounds
**Notation** in Bruner's *symbolic* mode), conception-space is really one
**Cognition Cache** engaged through three modes:

- **symbolic** — the **Notation** (text, the `.cns`-style projection). Must
  *reduce* to a domain subset, because symbolic cognition is capacity-bound.
- **iconic** — the desktop visual space + **Filters**. Need not reduce for
  capacity; it *shapes for purpose*.
- **enactive** — an embodied, room-scale, hands-on space. The body itself
  becomes part of the perceptual act.

Apple Vision Pro **passthrough** is the *enactive* mode: stereoscopic, room-scale,
parallax-rich, navigated by your own movement, with your real room as the ground.
It is the highest-bandwidth substrate the thesis can run on — the most of the
Cognition Cache that can be made legible *at once*. So a passthrough
conception-space is the project's central bet **at full strength**, not a feature
bolted onto the side. That is the case for it being worth a separate, native effort.

**Hard requirement (Gary):** it MUST be `immersive-ar` / passthrough — the graph
living in your real room, not a sealed VR void.

---

## The interaction north-star (and its honest caveat)

Reference vibe: the *Iron Man 2* (2010) "new element" holotable scene (UI by the
studio Perception). The beats that matter for us:

- a complex 3D structure floating in the real workspace, **manipulated directly
  with the hands** — grab, rotate, scale, pull apart. No chrome; the data *is* the
  interface (northstar Axiom 6, "perception instrument, not a navigator").
- **peeling the model down to isolate the structure hidden inside it** — that is a
  **Filter** made physical: shape-for-the-task, minimize-for-relevance, reveal
  latent structure that was always in the Cognition Cache.
- the layout *secretly is* the atomic structure — the insight was unreadable as a
  model of buildings, obvious once re-projected and **seen** spatially. The
  visual-cognition thesis, dramatized.
- a flick to discard what isn't needed — ephemeral, gestural lensing.
- JARVIS ambient throughout — the eventual **AI projection designer** (assist the
  lensing, don't drive menus).

**Caveat to write down so it inspires without misleading:** the holotable is
cinematic — instant, frictionless, narratively convenient. It is a *feel-and-intent*
reference for the interaction grammar (direct manipulation, fluid filtering to
reveal, ambient assist, embodied), **not** a UX spec. Real hand input is gaze +
pinch + hand-tracking, with latency, occlusion, and fatigue budgets the movie ignores.

---

## Spatial projections — you never edit the whole space in VR

The desktop edits a **Notation** (a reduced text projection of one domain). The
spatial analog is the load-bearing idea here:

> Render the canonical **Cognition Cache** in the room, then pull a **Filter-scoped
> domain** into reach, manipulate *that* projection spatially, and **internalize**
> the change back into the Cache.

You never expose the entire Cache for editing in VR — that is the trap that makes
spatial editing overwhelming. You work a *distilled, purposeful projection* of it,
exactly as the cog-sci framing intends (Gärdenfors-style conceptual domains scoped
by a Filter). So: desktop gives **symbolic** projections (Notation), Vision Pro
gives **enactive** projections (a Filter/Spatialization you reach into and reshape),
and both round-trip through the one Cognition Cache.

---

## The technical reality (researched, June 2026 / visionOS 27)

**Passthrough on visionOS is rendered by RealityKit, full stop.** WebXR still has
no `immersive-ar` even in visionOS 27, so anything web / Three.js / Electron is out
for passthrough. Three engines can feed RealityKit:

| Path | Language | Room-scale passthrough | Verdict |
|---|---|---|---|
| **Native SwiftUI + RealityKit + ARKit** | Swift | ✅ `ImmersiveSpace(.mixed)`, unbounded, ARKit-anchored | **Chosen** |
| Unity 6.3 + PolySpatial | C# | ✅ unbounded | Ruled out — proprietary engine; against the open ethos |
| Godot 4.5+ + Apple's RealityKit plugin | GDScript/C# | ⚠️ bounded volumes confirmed; unbounded unproven | Open-source; watch, not yet |

**Decision (Gary): native SwiftUI + RealityKit + ARKit.** It is the only first-party,
proven, unbounded-passthrough path; the toolchain is free with no third-party engine
license (matches the org's minimal-dependency pattern); a Vision Pro app is Apple-only
anyway; and the Apple Developer account + Team `2CKMPN3Y7C` already exists. Cost: a
Swift renderer + a Swift reader for the Cognition Cache.

### The R&D core (where the effort actually goes)
Rendering the graph in RealityKit is lumpy:
- **Nodes** — easy: instanced meshes (one draw call per material); scales to the
  ~2,000-node test scenes.
- **Relationships (edges)** — the fiddly part: RealityKit has no thick 3D line, so
  build them with `LowLevelMesh` (or billboarded quads / thin cylinders).
- **Labels** — RealityKit text is heavy at scale; batch / atlas them.
- **Spatialization** maps cleanly: the hand-placed coordinates are already the layout
  (Axiom 1, "placement is argument"), so no auto-layout to fight.

### Distribution
Native visionOS ships via **App Store / TestFlight**, *not* the Developer ID +
notarization flow built for the desktop `.dmg`. The signing work does not transfer;
the Apple account does.

---

## Repo strategy

A **wholly separate repo** (Swift / Xcode, App Store distribution — a different world
from the Electron desktop). It still adopts the org conventions (AGPL/REUSE,
AGENTS/CLAUDE, CI). The cross-repo single-source-of-truth to protect from drift is the
**Cognition Cache JSON5 schema** plus a shared **test corpus** (the `solar` / `test*`
spaces), so the desktop reader (JS) and the Vision Pro reader (Swift) cannot diverge.
The `.cns`/Notation *language* is a desktop-side authoring concern the headset need not
replicate.

---

## Open tensions / questions

- **Axiom 7 ("a node is a handle onto content") vs. the visionOS sandbox.** Native
  gives more than the web (document picker, security-scoped bookmarks, iCloud) but not
  raw filesystem paths. Design the corpus around iCloud / scoped access. Decide early:
  is the Vision Pro build *navigate + reshape* (read-mostly, corpus synced) or full
  *edit-the-corpus*?
- **Reading vs. opening content.** On desktop a node opens a markdown/PDF in an editor.
  In the headset, what is "open the node" — a floating document panel? Read-only?
- **The enactive-edit round-trip.** What is the minimal spatial gesture set that edits a
  Filter-scoped projection and internalizes cleanly (move, regroup, relate, hide)?
- **Performance ceiling** for the largest real spaces under passthrough.
- **Godot reconsideration** if/when its unbounded passthrough matures (open-source fit).

## Suggested first slice
A read-only **viewer**: Swift reader for the Cognition Cache JSON5 + a RealityKit
`ImmersiveSpace(.mixed)` that renders nodes (instanced) + relationships (LowLevelMesh) +
labels at room scale, anchored via ARKit, navigated by walking around it. No editing, no
content-opening. That alone tests the apex claim — does the space *feel* more legible
embodied than on a screen — before any authoring is built.

## Sources
[visionOS 27 / Safari WebXR (no immersive-ar)](https://www.vrwiki.cs.brown.edu/hardware/vr-hardware/apple-vision-pro/development-approaches-for-visionos/webxr-on-visionos) ·
[Apple open-source engine plugins (Godot/Unity/Unreal)](https://vr.org/articles/apple-visionos-27-open-source-engine-plugins-godot-unity-unreal) ·
[Unity PolySpatial visionOS](https://docs.unity3d.com/Packages/com.unity.polyspatial.visionos@2.0/manual/visionOSPlatformOverview.html) ·
[RealityKit instancing / LowLevelMesh (WWDC24)](https://developer.apple.com/videos/play/wwdc2024/10103/) ·
[Iron Man 2 holographic UI — Perception](https://www.experienceperception.com/work/iron-man-2/)
