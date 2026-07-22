<!--
SPDX-FileCopyrightText: 2026 Gary Frattarola <garyf@parkviewlab.ai>
SPDX-License-Identifier: CC-BY-4.0
-->

# Rust port — moving Conception-Space off Electron

Status: under study. An in-flight idea held for exploration, not a commitment;
`in-flight_ideas.md` entry 8 is the index pointer. Everything below is weighed
against `northstar.md`. Dates and versions are as of July 2026, from a dedicated
research pass (sources cited per section). A sibling study exists for the org's
other Electron app; see PensaGrex's `docs/rust_port_ideas.md` for the shared
reasoning on the note editor and math rendering, which recurs here.

## Why consider it, and why CS's own axioms bear on it

Conception-Space is a 3D "space for thinking": an Author hand-places nodes (each a
handle onto a real markdown or PDF file) in space, joined by edges and gathered into
clusters, navigated by a smooth orbit camera. Two of its northstar axioms speak
directly to the rendering substrate. Axiom 3 holds that smooth camera motion is part
of the medium, not decoration; a snap or stutter breaks the perceptual act. Axiom 6
holds that the app is a transparent perception instrument, so lag and jank are
failures, not blemishes. A native GPU renderer serves both better than a browser
webview, which is the unusual feature of this case: the port is not only about
leaving JavaScript and Chromium, it is about removing a compositor that sits between
the render loop and the display. The visionOS enactive mode does not enter into this:
it is already decided as a separate native SwiftUI and RealityKit app that shares only
the JSON5 schema (`in-flight_ideas.md` #6), so the desktop renderer choice is
independent of it.

## What the app is, and what ports

CS is small: about 3,490 lines of plain JS across ten files, electron-vite plus
electron-builder, AGPL-3.0-or-later with REUSE. It is a single-document viewer and
author (one `.cns` open at a time), with no multi-domain model and no in-app MCP
server. The data model is files on disk (the "Cognition Cache"): a `.cns` file, JSON5
sidecars, and per-node markdown notes, which stay the single source of truth under any
port (axiom 8). The renderer is Node-free and webview-portable. The main process is a
roughly nine-method file-I/O IPC surface (open, load, per-node markdown read/write,
sidecar read/write, a `cs-file://` streaming protocol, menu events). The note editor
is CodeMirror 6 plus KaTeX plus Marked plus `marked-katex-extension`.

The rendering lives in two files. `scene.js` (about 606 lines) uses three.js r0.170:
`WebGLRenderer`, `Scene`, `PerspectiveCamera`, `OrbitControls`, `CSS2DRenderer` HTML
labels, `MeshPhongMaterial` with ambient and directional lights, `FogExp2`, grid and
axes helpers; node glyphs are platonic-solid geometries; edges are `TubeGeometry`;
group shells are wireframe icosahedra with satellites and rings; an `InstancedMesh`
builds the solid-cluster tube frame; a `Raycaster` (with a screen-space nearest-node
fallback) does picking; and `controls.js` uses a `TransformControls` gizmo for
hand-placement. `camera_path.js` (about 830 lines) is the smooth flight and tour
system that serves axiom 3. There are no custom GLSL shaders and no post-processing.
It is a vanilla, static-topology scene graph, which is what makes replacing it
feasible.

---

# Design A — Tauri hybrid: keep three.js in the webview

Keep the three.js renderer and the note editor in the OS webview; reimplement the
small main process in Rust as the Tauri backend. The backend port is genuinely small
(a day or two): the nine-method IPC surface becomes Tauri commands plus the official
dialog, fs, and opener plugins, JSON5 parsing stays in the renderer, and the
`cs-file://` protocol maps to `register_uri_scheme_protocol`. Signing, notarization,
and the updater carry over cleanly, and CS already owns the full Apple signing chain
from its v0.8.3 notarized build. Installers shrink from roughly 90 MB to under 10, and
idle memory from 200 to 300 MB down to 30 to 50.

The reason to hesitate is not the backend; it is that a 3D app stakes everything on
WebGL2, and WebGL2 in the three system webviews stratifies sharply. three.js r0.170
creates a WebGL2 context by default. On Windows, WebView2 is Chromium and Edge running
ANGLE over Direct3D 11, effectively Chrome parity, self-updating, and uniform across
machines. On macOS, WKWebView works and reports Safari-identical capabilities, but
carries a documented, unresolved jitter against native Safari and, on macOS 13 to 15, a
hard 60 fps cap on `requestAnimationFrame` (lifted only in macOS 26, otherwise only
through a private-API plugin), which a ProMotion 120 Hz user feels during orbit and
tour motion. Both touch axioms 3 and 6 mildly.

Linux, WebKitGTK, is the real problem, and the evidence is unambiguous. Tauri's own
Linux graphics documentation records blank windows, resize crashes, and DMABUF
framebuffer errors (most often on NVIDIA), with a workaround ladder of environment
variables that in the worst case disables accelerated compositing entirely. Decisively
for a 3D app, that same page warns that a WebGL2 context can be created successfully
while backed by software rendering, and that WebKitGTK's fingerprinting protection
makes the renderer string report a fake "Apple GPU" on every Linux machine, so the app
cannot detect that it has fallen onto a slow path. Community reports show roughly 40
fps under WebKitGTK against 240 under a Chromium webview on the same box, and Tauri's
maintainers are building a CEF/Chromium backend precisely because WebKitGTK is
inadequate for demanding web content. WebKitGTK is also not one engine but whatever the
distro ships (a documented spread from 2.20 to 2.36), so you cannot pin a known-good
renderer or reproduce a user's rendering bug in CI, the opposite of Electron's single
bundled Chromium.

A second casualty is the PDF handle (axiom 7). CS renders PDF nodes with an
`<iframe src="cs-file://…">` that works today only because Chromium bundles PDFium. Of
the three webviews only WebView2 inherits a native PDF viewer; WKWebView subframe PDF is
historically flaky and WebKitGTK has none, so the hybrid would have to bundle pdf.js and
feed it blobs on Linux. Bounded work, but work the Electron build never needed. The
CSS2D labels, by contrast, are fine everywhere, since they are ordinary DOM over the
canvas rather than a WebGL feature.

Verdict: the hybrid does not remove the fragile WebGL dependency; it relocates it onto
the least reliable and least controllable of the three renderers, worst exactly where CS
has the least leverage, while leaving macOS and Windows roughly lateral. Defensible on
macOS and Windows, a genuine and hard-to-gate regression on Linux, and at odds with an
instrument whose northstar makes smooth motion and transparency non-negotiable. Best
role: an interim, or a fallback if the native path proves too large.

Stack (MIT or Apache-2.0, plus system webviews): Tauri v2 and WRY; the updater, dialog,
fs, and opener plugins; pdf.js (Apache-2.0) for macOS and Linux PDF.

# Design B — 100% Rust: replace three.js with a Rust renderer

No JavaScript and no webview: the whole app in Rust, the 3D scene on a Rust renderer,
the chrome and labels in an egui overlay, the model and file I/O in-process. The model
re-homing tension that complicates a hybrid disappears here, since there is one process
and one language; `parser.js` is pure JS with no three.js dependency and transliterates
directly to Rust, and the file model is untouched.

## Engine: three-d recommended, Bevy the alternative

The two viable Rust engines are three-d and Bevy, and the choice is genuinely split
along CS's two halves, the viewer and the author.

three-d (0.19.0, 2026-04-17, MIT) is the closer match to `scene.js`. It is a retained
scene-graph renderer whose owned render loop mirrors CS's `requestAnimationFrame` loop,
and it ships in-tree exactly the primitives CS uses: `PhysicalMaterial` objects,
`InstancedMesh`, `FogEffect`, `OrbitControl` with damping, a `pick()`/`ray_intersect`
function, a `TextGenerator`, and a built-in egui integration. The port reads as a
transliteration rather than a re-architecture; even the instanced-cylinder frame trick in
`_buildGroupFrame` maps one-to-one. Its two real drawbacks are that it has no
transform-gizmo (the authoring half would be built from scratch) and that it is built on
glow/OpenGL rather than wgpu, and macOS OpenGL is deprecated and frozen at 4.1 (emulated
over Metal), which is functional today but a longevity question. It is also a small,
largely single-maintainer project (about 1.7k stars, pre-1.0), so bus-factor and API
churn are real.

Bevy (0.19, mid-2026, MIT or Apache-2.0) is the wgpu-based alternative. It gives you more
for free where CS is weak on three-d: upstreamed mesh picking, first-class exponential
fog, immediate-mode gizmos, and a mature translate/rotate/scale gizmo crate
(`transform-gizmo-bevy`) that answers `TransformControls` directly, which matters because
hand-placement is axiom 1 and the authoring tools are an in-flight priority. Its costs are
that it inverts CS's owned loop into ECS systems (the single largest paradigm shift of a
Bevy port), that its weakest areas coincide with CS's needs (in-world text crates lag,
notably `bevy_mod_billboard` at Bevy 0.14, and wireframe is native-only and coarse), and
that its roughly three breaking releases a year impose a recurring upgrade tax that a
3,500-line instrument does not otherwise incur. Its ECS machinery pays off at ten thousand
to a million entities, not CS's few hundred meshes.

Recommendation: prototype the scene in three-d first, because it is the lighter and more
faithful transliteration of the viewer and CS is not GPU-bound at this scale, while
treating two things as the decision's swing votes: if the authoring gizmo's maturity or a
wgpu-native future (Metal longevity, WebGPU) proves decisive, Bevy is the better long-term
home despite the ECS overhead. Either way the CSS2D labels become an egui overlay that
projects each node's world position to screen, which is what `CSS2DObject` already does and
which neutralizes Bevy's billboard-text gap; that overlay must add its own depth and
occlusion test, which the DOM gave partly for free.

Axioms 3 and 6 are served by this path, not merely preserved: both engines are native, so
nothing like Chromium's compositor sits between the loop and the display, both provide a
per-frame delta-time hook, and the `camera_path.js` easing and tour math (a quintic Hermite
spline, a septic time-warp, an arc-length table, a rate limiter) ports verbatim as glam
vector arithmetic. That camera math is the largest single logic port (about 500 lines of
real code), and its difficulty is volume and perceptual fidelity, not missing capability;
the one integration constraint is that the replacement orbit control must tolerate external
per-frame pose and target writes without fighting its own damping.

## The note editor and PDF: the real cost, and a scoped-webview option

The dominant cost of the 100% Rust path is not the renderer; it is the note layer, and it
is engine-independent. CS's note editor is CodeMirror 6 with KaTeX, Marked, and
`marked-katex-extension`, and its PDF nodes render through a browser iframe. egui offers a
plain multiline `TextEdit` and no browser-grade text input, IME, or accessibility, and no
KaTeX-equivalent math on its own. This is the same wall PensaGrex hit, and the same two
answers apply. Math is a preview-pane task with a native Rust renderer: RaTeX (MIT, with
OFL fonts), which PensaGrex validated and adopted with a vendor-the-subset stance, renders
KaTeX-grade math to SVG or a texture in the rendered pane while the editor holds plain
LaTeX source. Markdown renders through `pulldown-cmark` and `egui_commonmark`. PDF viewing
needs a Rust PDF path (a `pdfium`-backed or pure-Rust rasterizer into a texture), which is
real work.

Because the editor and PDF are the hard part and they are not the perceptual 3D surface the
northstar's axioms 3 and 6 are about, there is an elegant middle path worth naming: a mostly
native app (wgpu 3D plus egui chrome and labels) that retains a small webview for the note
editor and PDF pane only. This is not strictly 100% Rust, but it isolates the webview to a
non-perceptual surface where WebKitGTK's WebGL weakness does not apply (the editor is DOM
and text, not WebGL), keeps CodeMirror, KaTeX, and iframe PDF exactly as they are, and lets
the 3D instrument be fully native and uniform across platforms. The fully native editor
(egui plus RaTeX plus a Rust PDF crate) remains achievable and is the cleaner end state; the
scoped editor webview is the lower-risk first cut. This is the CS-specific fork to decide
deliberately.

Packaging is engine-agnostic and matches the existing Apple flow: `cargo-packager` bundles
the `.app`/`.dmg`/`.msi`/`.deb`/`.AppImage`, and `apple-codesign`/`rcodesign` performs
pure-Rust Developer ID signing, notarization, and stapling (the same notarized path CS
already ships), with Windows signing via `signtool` or Azure Trusted Signing.

Verdict: the recommended end state. The renderer port is a bounded transliteration of a
vanilla scene graph, the camera math ports verbatim, and native rendering directly serves
the app's own axioms rather than fighting them. The real work and the real decision are the
note editor and PDF, where a scoped editor webview is a reasonable interim and a fully
native editor (with RaTeX for math) is the clean destination.

Stack (fully MIT or Apache-2.0): three-d (or Bevy plus `bevy_panorbit_camera` and
`transform-gizmo-bevy`), wgpu or glow, winit, egui, `glam`, `pulldown-cmark`,
`egui_commonmark`, RaTeX; `cargo-packager` and `apple-codesign` at build time.

---

# three.js → Rust feature mapping

Read from `scene.js`, `controls.js`, and the camera modules. Difficulty is for the Rust
port; equivalents are three-d first, Bevy where it differs.

| three.js feature (CS use) | Rust equivalent | Difficulty | Notes |
| --- | --- | --- | --- |
| `WebGLRenderer` + owned rAF loop | three-d owned render loop; Bevy inverts into ECS systems | easy | three-d keeps CS's control flow; the Bevy inversion is pervasive, not hard |
| `Scene` + solid background | three-d render-target clear; Bevy `ClearColor` | trivial | mental-model shift only |
| `FogExp2` (runtime density) | three-d `FogEffect`; Bevy `DistanceFog` `ExponentialSquared` | easy | Bevy exact match; three-d a small shader term |
| `PerspectiveCamera` | three-d `Camera::new_perspective`; Bevy `Projection::Perspective` | trivial | Bevy tracks aspect automatically |
| `OrbitControls` (damping) | three-d `OrbitControl`; Bevy `bevy_panorbit_camera` | easy | must expose a writable target for the camera-path system |
| `TransformControls` gizmo (placement) | `transform-gizmo-bevy` (Bevy); none in three-d | moderate | the authoring half; mature on Bevy, from-scratch on three-d |
| `camera_path.js` spline + tweens | pure `glam` Vec3/Quat, no crate | moderate | largest logic port (~500 lines); axiom-3-critical; ports verbatim |
| `CSS2DRenderer` labels | egui overlay via world-to-screen projection | hard | no native match to constant-screen-size DOM; needs own depth/occlusion + culling |
| `MeshPhongMaterial` + lights | three-d `PhysicalMaterial`; Bevy `StandardMaterial` | easy | Phong→PBR needs one retune; `flatShading` = duplicated verts + flat normals |
| Platonic-solid glyphs | mostly built-in; octahedron/dodecahedron hand-authored | moderate | box/sphere/cylinder/icosa trivial; two solids lack primitives in both |
| `TubeGeometry` edges | oriented cylinder mesh (`Quat::from_rotation_arc`) | easy | 1 tubular + 6 radial segments is just a hexagonal cylinder |
| Wireframe icosphere shells | `ico(N)` mesh + wireframe | moderate | wasm/WebGL wireframe needs explicit line meshes |
| `InstancedMesh` group frame | three-d `InstancedMesh`; Bevy auto-batch | easy | scene.js:546 already instances; maps 1:1 |
| `GridHelper`/`AxesHelper` | Bevy immediate-mode gizmos; three-d line meshes | easy/trivial | Bevy recolors per frame, no vertex-buffer hack |
| `Raycaster` + screen-space fallback | Bevy `MeshPickingPlugin`; three-d `pick()` | easy | Bevy upstreamed picking at 0.15; fallback is world-to-viewport |
| `Vector3`/`Quaternion`/`Object3D` | `glam` + Transform hierarchy; `Visibility` | trivial | both engines build on glam; `dispose()` vanishes (Drop/Assets) |

About 85% of the three.js surface has a direct Rust equivalent. The three hardest pieces
are the CSS2D label and note-editor DOM layer, the camera-path fidelity, and authoring parity
(the gizmo).

---

# Other options considered

All permissively licensed; none excluded on license, and none clearly beats the three-d /
Bevy pair, because the DOM text-and-editor cost recurs in every native option.

- Fyrox (MIT, stable 1.0 2025-03-29): a genuine retained scene-graph engine with a native
  editor and ray-cast picking, conceptually the closest off-the-shelf fit to a hand-placed
  graph, but a full engine with its own non-DOM UI and asset pipeline, so a rebuild rather
  than a port.
- Godot (MIT, mature): editor, scene graph, picking, smooth camera, and the visionOS
  notebook's watched open-source option, but a from-scratch rebuild in GDScript or C# with
  the note editor re-homed. Capable, heavy, paradigm-shifted.
- rend3 (permissive): excluded on maintenance, the upstream repo was archived read-only on
  2025-06-07; only a single-maintainer fork continues.
- renderling (MIT or Apache-2.0): a promising GPU-driven scene-graph with text, but alpha,
  single-maintainer, and mid-rewrite. Watch, do not adopt.
- kiss3d (BSD-3-Clause), macroquad/miniquad (MIT or Apache-2.0): too minimal or 2D-first for
  a lit graph with picking, text, and smooth camera.
- raw wgpu plus a hand-written scene layer: maximal control and longevity, but you write
  camera, picking, culling, and text yourself; unjustified for CS's modest scene when three-d
  provides them.
- Dioxus/Blitz (MIT or Apache-2.0): not a 3D renderer at all, its native path is 2D DOM via
  Vello. Inapplicable.
- Flutter GPU plus flutter_scene (BSD-3-Clause): real 3D but preview-grade and a full Dart
  rewrite plus a re-homed note stack. Poor fit.

---

# Comparison

| | Design A (Tauri hybrid) | Design B (100% Rust, three-d/Bevy) |
| --- | --- | --- |
| 100% Rust | No (web UI in webview) | Yes (or a scoped editor webview) |
| 3D renderer | three.js kept, in the OS webview | Rust on glow (three-d) or wgpu (Bevy) |
| Webview-fidelity risk | Yes, severe on Linux (WebKitGTK software fallback) | None (own renderer, uniform across OSes) |
| Serves axioms 3, 6 | Weakly; degrades on Linux/older macOS | Yes; no compositor between loop and display |
| PDF handle (axiom 7) | Breaks on macOS/Linux; needs pdf.js | Needs a Rust PDF path either way |
| Note editor | Kept (CodeMirror/KaTeX) | Rewrite (egui + RaTeX) or a scoped editor webview |
| Backend port | Trivial (~1-2 days) | Subsumed into one Rust process |
| Rewrite scope | Small (shell only) | Renderer + camera + labels + editor |
| Binary / idle | ~10 MB / ~40 MB | small native binary |
| Permissive-clean | Yes | Yes |

---

# Northstar fit

- Axiom 1 (placement is argument, no auto-layout): unaffected; hand-placed positions live in
  the `.cns` file, and the authoring gizmo is the `TransformControls` equivalent (mature on
  Bevy, bespoke on three-d).
- Axiom 3 (smooth camera motion is part of the medium): the camera-path math ports verbatim,
  and a native renderer removes the browser compositor that the hybrid keeps, so the native
  path serves this axiom better than either Electron or Tauri.
- Axiom 6 (the app is a transparent instrument, no jank): the strongest northstar argument for
  the native path and against the Tauri hybrid, whose Linux WebGL can silently fall to software
  rendering undetectably.
- Axiom 7 (a node is a handle onto a real file, markdown or PDF): the file model is untouched,
  but PDF viewing is real work under both designs (bundled pdf.js under Tauri; a Rust PDF path
  under native).
- Axiom 8 (the canonical space is the single source of truth): the `.cns` file plus sidecars
  plus markdown stay the one truth under any option; the renderer is a projection.
- The visionOS enactive mode is a separate RealityKit app by decision and shares only the JSON5
  schema, so it neither constrains nor is constrained by this choice.

# Licensing

CS is AGPL-3.0-or-later with REUSE. Every candidate is permissive and one-way compatible into
AGPL: Tauri and its plugins, three-d, Bevy, `glam`, wgpu, glow, winit, egui, `bevy_panorbit_camera`,
`transform-gizmo-bevy`, `pulldown-cmark`, `egui_commonmark`, and RaTeX are all MIT or Apache-2.0
(RaTeX bundles OFL-1.1 math fonts, the class CS already vendors). rend3's license is not its
problem; it is excluded on maintenance. No GPL, copyleft, or commercial dependency appears on
either path; Slint-class GPL toolkits are not in scope here. The main licensing chore is
bookkeeping: a second, Rust-side dependency inventory for the in-app Open Source Licenses viewer,
alongside the existing npm one, and REUSE headers carry over unchanged.

# Costs and open questions

- The note editor and PDF are the dominant cost and are engine-independent. Decide the fork
  early: a scoped editor webview (lower risk, not 100% Rust) versus a fully native editor (egui
  plus RaTeX plus a Rust PDF crate, the clean end state).
- Engine choice (three-d versus Bevy) is genuinely split: three-d is the faithful, lighter
  viewer transliteration but lacks a gizmo and rides deprecated macOS OpenGL; Bevy wins authoring
  and wgpu longevity at the cost of ECS overhead and a heavy upgrade cadence. Prototype the scene
  in three-d; let the gizmo and the wgpu-future be the swing votes.
- Camera-path perceptual fidelity is the acceptance bar for axiom 3; the math is deterministic and
  ports verbatim, but the replacement orbit control must not fight external per-frame writes.
- No handbook Rust-desktop profile exists yet; a Rust signing and notarization CI profile replaces
  the electron-builder pipeline, and belongs in the handbook once chosen.
- The data is safe under every option: `.cns`, JSON5 sidecars, and markdown are unchanged.

# Recommendation

The 100% Rust path (Design B) is the stronger end state, and more clearly so than for PensaGrex,
because CS's own axioms 3 and 6 argue for removing the webview rather than merely tolerating it, and
because the Tauri hybrid would relocate the fragile WebGL dependency onto WebKitGTK, the least
reliable renderer, exactly where the app can least afford jank. The renderer rewrite is a bounded
transliteration of a vanilla scene graph, and the camera math ports verbatim. The real work is the
note editor and PDF, and the pragmatic sequence is to prototype the 3D scene natively in three-d
(validating axiom-3 camera feel first), keep a scoped editor webview as the interim for CodeMirror
and PDF, and move the editor fully native (egui plus RaTeX) as a later step. Tauri remains a
defensible macOS-and-Windows interim, but not the destination for a Linux-supporting perception
instrument.

# Decisions log

- 2026-07-21 — Study opened (author asked for it). Two designs researched: A Tauri hybrid (backend
  trivial, but relocates WebGL onto WebKitGTK where it can silently fall to software rendering,
  breaking axioms 3/6 on Linux, and breaks iframe PDF on macOS/Linux); B 100% Rust (replace three.js
  with three-d, Bevy the alternative, egui overlay for labels/chrome, RaTeX for math). Author's prior:
  "100% Rust sounds best." Working recommendation: Design B is the stronger end state; prototype the
  scene in three-d, keep a scoped editor webview as the interim, move the editor fully native later.
  Engine (three-d vs Bevy) and editor (scoped webview vs fully native) are the two open forks.
  Captured as an in-flight idea, not a plan.
