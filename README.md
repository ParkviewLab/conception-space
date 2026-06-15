# conception-space

Organize your knowledge in space.<BR>
Build navigable places. Shape visible relationships. Discover emergent patterns.

---

A desktop app for organizing knowledge in 3D space. You place nodes by hand at explicit coordinates —
and each node is a **handle onto a real file** (usually a markdown note, sometimes a PDF). Unlike Mermaid
or DOT, layout is **not computed**: you decide where things live, which makes the space spatially
memorable and lets you *see* the shape of your relationships at a glance.

Open a node to read or edit its content; the arrangement becomes a navigable index over your own corpus.
Built with Electron + Three.js; runs on **macOS, Windows, and Linux**.

See [`docs/northstar.md`](docs/northstar.md) for the project's intent.

## Install

Download the installer for your platform from the
[latest release](https://github.com/ParkviewLab/conception-space/releases):

| Platform | File |
|---|---|
| macOS | `.dmg` |
| Windows | `.exe` (installer) or portable `.exe` |
| Linux | `.AppImage` or `.deb` |

> The app is **not yet code-signed**, so your OS may warn on first launch:
> - **macOS:** right-click the app → **Open** (or run `xattr -dr com.apple.quarantine "/Applications/Conception Space.app"`).
> - **Windows:** SmartScreen → **More info** → **Run anyway**.

## Run from source

```bash
npm ci
npm run dev      # electron-vite dev server with HMR
npm run build    # bundle to out/
npm start        # preview the built app
```

## The .cns language

A graph description language where nodes are 3D objects at explicit coordinates.

```
# comment
node <id> <shape> <x> <y> <z> "<label>"
edge <from> -> <to>
edge <from> -> <to> "<label>"
```

**Shapes:** `sphere` · `cube` · `cylinder` · `tetrahedron` · `octahedron` · `dodecahedron` · `icosahedron`<BR>
**Coordinates:** any float, right-hand coordinate system; the grid plane is y = 0.

### Example

```
node sun   sphere  0 0 0   "Sun"
node earth sphere  6 0 0   "Earth"
node moon  sphere  7 0.8 0 "Moon"

edge sun -> earth "orbits"
edge earth -> moon "orbits"
```

See [`docs/The_CNS_Language.md`](docs/The_CNS_Language.md) for the full language reference.

### Camera controls

| Action | Control |
|--------|---------|
| Orbit  | Left drag |
| Zoom   | Scroll wheel |
| Pan    | Right drag |

## License

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![REUSE compliant](https://img.shields.io/badge/REUSE-compliant-green.svg)](https://reuse.software)

conception-space is **dual-licensed**: the code is free software under **AGPL-3.0-or-later** by default,
with a **commercial license** available as an alternative (for closed-source use without the AGPL's
obligations). Documentation is **CC-BY-4.0**; the ParkviewLab logo is proprietary.

**See [LICENSING.md](LICENSING.md)** for the full picture and the commercial-license contact. Canonical
per-license texts live in [`LICENSES/`](LICENSES/) ([REUSE](https://reuse.software)-compliant).

---
<sub>© 2026 Gary Frattarola · part of [ParkviewLab](https://parkviewlab.ai)</sub>
