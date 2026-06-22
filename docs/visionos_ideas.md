<!--
SPDX-FileCopyrightText: 2026 Gary Frattarola <garyf@parkviewlab.ai>
SPDX-License-Identifier: CC-BY-4.0
-->

# Conception-Space on Vision Pro

Conception-Space on visionOS is an immersive AR perception instrument. Its reference is not a floating desktop or a decorative 3D graph, but a hand-manipulable knowledge structure in the real workspace. The data itself is the interface: the user grabs, rotates, scales, separates, peels, and discards projections directly. Filtering becomes physical lensing. It's a way to minimize for relevance, reveal hidden structure, and reshape the visible form of the Cognition Cache without destroying the underlying knowledge.

---

## Vision Pro — the enactive mode

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

## The overview is home base; projections are for task-work

The whole point is that the headset shows **all of the Cognition Cache at once**.
That full spatial overview is **not** overwhelming — it is the one representation
human visual cognition is built to take in whole, and it is where you start.

From the overview you **drill down** into a domain to actually work, applying a
**Filter** (or moving to an alternate **Spatialization**) that purposefully shapes
and minimises the view *for that task* — chosen and designed by you, for the work at
hand. Reshape it, work it, and the results **raise back up** into the overview (the
visual ↔ symbolic loop — see [northstar](northstar.md) Concept 5), where they may
surface as new Commonalities and reveal relationships that weren't visible before.

So a projection here is **task-tuning, not overwhelm-avoidance**: the whole is
manageable — that is the bet — and a projection optimises the view for a specific
piece of work. Two first-class visual jobs: comprehend the whole, and work a domain.

The headset is the **iconic / enactive** end of that loop. The symbolic descent
(working something out exactly, "ink on paper") is real and complementary, *not*
retired — which leaves a genuine open question: does the headset host a symbolic
surface of its own, or hand the descent off to the desktop and round-trip the result
back through the Cache? (See Open tensions below.)

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
- **Where does the symbolic descent live?** The discovery loop (northstar Concept 5) needs
  an "ink on paper" step for exact logic, but the headset is the iconic/enactive end. Does
  the Vision Pro app host a symbolic surface of its own, or hand the descent off to the
  desktop and round-trip the result back through the Cache?
- **Performance ceiling** for the largest real spaces under passthrough.
- **Godot reconsideration** if/when its unbounded passthrough matures (open-source fit).

## How to build it — feel first, fake the underneath

This is new, different, and hard, so follow the northstar's "note on feel": **build a
prototype that nails the experience over stubbed internals, tune it until it's loved,
then build it for real beneath.** The holotable is the feel target; the prototype is how
you find out whether the apex claim is true *before* committing to the machinery.

So the first slice is a **faked-UX feel prototype**, not a finished viewer:
- a single canned space (hardcode `solar` / a `test*` scene; skip the real Cognition
  Cache reader for now);
- rendered room-scale in `ImmersiveSpace(.mixed)`, ARKit-anchored, navigated by walking;
- nodes instanced, a few relationships via `LowLevelMesh`, a handful of labels — only
  enough to feel real;
- one or two **faked** gestures (pinch a node to pull a Filter-scoped domain into reach;
  flick to dismiss), wired to canned responses, not a real round-trip.

The only question it must answer: *does the space feel more legible and more thinkable
embodied than on a screen?* If yes, build the real parts underneath (the Cognition Cache
reader, real Filters/Spatializations, the internalize round-trip). If no, you learned it
cheaply.

## Sources
[visionOS 27 / Safari WebXR (no immersive-ar)](https://www.vrwiki.cs.brown.edu/hardware/vr-hardware/apple-vision-pro/development-approaches-for-visionos/webxr-on-visionos) ·
[Apple open-source engine plugins (Godot/Unity/Unreal)](https://vr.org/articles/apple-visionos-27-open-source-engine-plugins-godot-unity-unreal) ·
[Unity PolySpatial visionOS](https://docs.unity3d.com/Packages/com.unity.polyspatial.visionos@2.0/manual/visionOSPlatformOverview.html) ·
[RealityKit instancing / LowLevelMesh (WWDC24)](https://developer.apple.com/videos/play/wwdc2024/10103/) ·
[Iron Man 2 holographic UI — Perception](https://www.experienceperception.com/work/iron-man-2/)
