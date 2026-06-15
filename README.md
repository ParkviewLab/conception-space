# conception-space

Organize your knowledge in space.<BR>
Build navigable places. Shape visible relationships. Discover emergent patterns.

---

A graph description language where nodes are 3D objects placed at explicit coordinates in space.
Unlike Mermaid or DOT, layout is **not computed** — you define where things live. This makes the
space spatially memorable.

## v0 language

```
# comment

node <id> <shape> <x> <y> <z> "<label>"
edge <from> -> <to>
edge <from> -> <to> "<label>"
```

**Shapes:** `sphere` · `cube` · `cylinder`

**Coordinates:** any float, right-hand coordinate system. The grid plane is y = 0.

### Example

```
node sun   sphere  0 0 0  "Sun"
node earth sphere  6 0 0  "Earth"
node moon  sphere  7 0.8 0 "Moon"

edge sun -> earth "orbits"
edge earth -> moon "orbits"
```

## Translator

Requires Python 3.6+. No dependencies beyond the standard library.

```bash
python cs2html.py examples/solar.cns         # writes examples/solar.html
python cs2html.py myfile.cns output.html     # explicit output path
```

Open the generated HTML in any modern browser. The viewer requires an internet connection
(Three.js is loaded from CDN).

### Camera controls

| Action | Control |
|--------|---------|
| Orbit  | Left drag |
| Zoom   | Scroll wheel |
| Pan    | Right drag |

## Roadmap

- v0 — nodes, edges, 3 shapes, camera navigation ✓
- v1 — node colour, size, camera start position in language
- v2 — groups / namespaces, arrow styles, dashed edges
- v3 — offline / embedded Three.js, no CDN dependency

## License

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![REUSE compliant](https://img.shields.io/badge/REUSE-compliant-green.svg)](https://reuse.software)

conception-space is **dual-licensed**: the code is free software under
**AGPL-3.0-or-later** by default, with a **commercial license** available as an
alternative (for closed-source use without the AGPL's obligations).
Documentation is **CC-BY-4.0**; the ParkviewLab logo is proprietary.

**See [LICENSING.md](LICENSING.md)** for the full picture and the
commercial-license contact. Canonical per-license texts live in
[`LICENSES/`](LICENSES/) ([REUSE](https://reuse.software)-compliant).
