# SPDX-License-Identifier: AGPL-3.0-or-later
# SPDX-FileCopyrightText: 2026 Gary Frattarola <garyf@parkviewlab.ai>
"""conception-space v0 — .cns → self-contained HTML/Three.js translator."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import TypedDict

# ── Types ──────────────────────────────────────────────────────────────────────


class Node(TypedDict):
    id: str
    shape: str
    x: float
    y: float
    z: float
    label: str
    color: str


class Edge(TypedDict):
    from_: str
    to: str
    label: str


class Scene(TypedDict):
    nodes: list[Node]
    edges: list[Edge]


# ── Constants ──────────────────────────────────────────────────────────────────

SHAPES: frozenset[str] = frozenset({
    "sphere", "cylinder",
    "cube", "tetrahedron", "octahedron", "dodecahedron", "icosahedron",
})

PALETTE: tuple[str, ...] = (
    "#4fc3f7",
    "#81c784",
    "#ffb74d",
    "#f06292",
    "#ce93d8",
    "#80cbc4",
    "#fff176",
    "#ff8a65",
)

SM_PORT = 8765  # SpaceMouse WebSocket bridge port

# ── HTML template ──────────────────────────────────────────────────────────────
# Substitution tokens: __TITLE__  __SCENE_JSON__

HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>__TITLE__</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #090916; overflow: hidden; font-family: sans-serif; }
    canvas { display: block; }
    .label {
      color: #fff; font-size: 13px;
      background: rgba(0,0,0,0.55);
      padding: 2px 7px; border-radius: 3px;
      pointer-events: none; white-space: nowrap;
    }
    .edge-label {
      color: rgba(255,255,255,0.55); font-size: 11px;
      background: rgba(0,0,0,0.4);
      padding: 1px 5px; border-radius: 2px;
      pointer-events: none;
    }
    #hud {
      position: fixed; bottom: 14px; left: 50%;
      transform: translateX(-50%);
      display: flex; gap: 24px; align-items: center;
      pointer-events: none;
    }
    #hint, #sm-status {
      color: rgba(255,255,255,0.3);
      font-size: 12px; letter-spacing: 0.03em;
    }
    #sm-status.connected { color: #4fc3f7; }
  </style>
</head>
<body>
<div id="hud">
  <span id="hint">Mouse: left=orbit · scroll=zoom · right=pan</span>
  <span id="sm-status">SpaceMouse: —</span>
</div>

<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.164.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.164.0/examples/jsm/"
  }
}
</script>

<script type="module">
import * as THREE from 'three';
import { OrbitControls }                    from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject }        from 'three/addons/renderers/CSS2DRenderer.js';

const DATA = __SCENE_JSON__;

// ── Renderers ─────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
Object.assign(labelRenderer.domElement.style,
  { position: 'absolute', top: '0', pointerEvents: 'none' });
document.body.appendChild(labelRenderer.domElement);

// ── Scene ─────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x090916);
scene.fog = new THREE.FogExp2(0x090916, 0.012);

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(10, 20, 10);
scene.add(sun);

scene.add(new THREE.GridHelper(60, 60, 0x1a1a3a, 0x111128));
scene.add(new THREE.AxesHelper(4));

// ── Camera + controls ─────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 600);
camera.position.set(12, 9, 18);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping  = true;
controls.dampingFactor  = 0.07;
controls.minDistance    = 0.5;
controls.maxDistance    = 300;

// ── Build scene ───────────────────────────────────────────────────────────────
const nodePos = {};

const FLAT_SHADED = new Set(['cube', 'tetrahedron', 'octahedron', 'dodecahedron', 'icosahedron']);

function makeGeometry(shape) {
  switch (shape) {
    case 'cube':         return new THREE.BoxGeometry(0.9, 0.9, 0.9);
    case 'cylinder':     return new THREE.CylinderGeometry(0.38, 0.38, 0.95, 24);
    case 'tetrahedron':  return new THREE.TetrahedronGeometry(0.62);
    case 'octahedron':   return new THREE.OctahedronGeometry(0.58);
    case 'dodecahedron': return new THREE.DodecahedronGeometry(0.52);
    case 'icosahedron':  return new THREE.IcosahedronGeometry(0.55);
    default:             return new THREE.SphereGeometry(0.48, 32, 16);
  }
}

for (const n of DATA.nodes) {
  const mat = new THREE.MeshPhongMaterial({
    color:       new THREE.Color(n.color),
    emissive:    new THREE.Color(n.color).multiplyScalar(0.15),
    shininess:   90,
    flatShading: FLAT_SHADED.has(n.shape),
  });
  const mesh = new THREE.Mesh(makeGeometry(n.shape), mat);
  mesh.position.set(n.x, n.y, n.z);
  scene.add(mesh);

  const div = document.createElement('div');
  div.className = 'label';
  div.textContent = n.label;
  const lobj = new CSS2DObject(div);
  lobj.position.set(0, 0.75, 0);
  mesh.add(lobj);

  nodePos[n.id] = new THREE.Vector3(n.x, n.y, n.z);
}

for (const e of DATA.edges) {
  const a = nodePos[e.from_];
  const b = nodePos[e.to];
  if (!a || !b) continue;

  scene.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([a, b]),
    new THREE.LineBasicMaterial({ color: 0x334455 })
  ));

  if (e.label) {
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const div = document.createElement('div');
    div.className = 'edge-label';
    div.textContent = e.label;
    const lobj = new CSS2DObject(div);
    lobj.position.copy(mid);
    scene.add(lobj);
  }
}

// ── SpaceMouse bridge ─────────────────────────────────────────────────────────
let smState = null;
const smStatusEl = document.getElementById('sm-status');
const SM_WS = 'ws://localhost:__SM_PORT__';

function connectSpaceMouse() {
  const ws = new WebSocket(SM_WS);
  ws.onopen = () => {
    smStatusEl.textContent = 'SpaceMouse: connected';
    smStatusEl.className   = 'connected';
  };
  ws.onmessage = (e) => { smState = JSON.parse(e.data); };
  ws.onclose   = () => {
    smState = null;
    smStatusEl.textContent = 'SpaceMouse: —';
    smStatusEl.className   = '';
    setTimeout(connectSpaceMouse, 2000);
  };
  ws.onerror = () => ws.close();
}
connectSpaceMouse();

// SpaceMouse → camera: T=pan+dolly, R=orbit
const T_SCALE  = 0.015;
const R_SCALE  = 0.025;
const _sph     = new THREE.Spherical();
const _forward = new THREE.Vector3();
const _right   = new THREE.Vector3();

function applySpaceMouse() {
  if (!smState) return;
  const [tx, ty, tz] = smState.t;
  const [rx, ry]     = smState.r;   // rz (roll) ignored for now

  camera.getWorldDirection(_forward);
  _right.crossVectors(_forward, camera.up).normalize();

  // Lateral pan + vertical pan
  const pan = _right.clone().multiplyScalar(tx * T_SCALE)
    .addScaledVector(camera.up, -ty * T_SCALE);
  controls.target.add(pan);
  camera.position.add(pan);

  // Dolly (push cap forward = move into scene)
  camera.position.addScaledVector(_forward, -tz * T_SCALE * 3);

  // Orbit
  const offset = camera.position.clone().sub(controls.target);
  _sph.setFromVector3(offset);
  _sph.theta += -ry * R_SCALE;
  _sph.phi   +=  rx * R_SCALE;
  _sph.phi    = Math.max(0.01, Math.min(Math.PI - 0.01, _sph.phi));
  offset.setFromSpherical(_sph);
  camera.position.copy(controls.target).add(offset);
  camera.lookAt(controls.target);
}

// ── Resize ────────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Render loop ───────────────────────────────────────────────────────────────
(function animate() {
  requestAnimationFrame(animate);
  applySpaceMouse();
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
})();
</script>
</body>
</html>
"""


# ── Parser ─────────────────────────────────────────────────────────────────────

_NODE_RE = re.compile(r"node\s+(\w+)\s+(\w+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+\"([^\"]*)\"")
_EDGE_RE = re.compile(r"edge\s+(\w+)\s+->\s+(\w+)(?:\s+\"([^\"]*)\")?")


def parse_cs(source: str) -> Scene:
    nodes: list[Node] = []
    edges: list[Edge] = []
    color_idx = 0

    for lineno, raw in enumerate(source.splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue

        if line.startswith("node "):
            m = _NODE_RE.match(line)
            if not m:
                print(f"line {lineno}: cannot parse node — {raw!r}", file=sys.stderr)
                continue
            shape = m.group(2)
            if shape not in SHAPES:
                print(f"line {lineno}: unknown shape {shape!r}, using sphere", file=sys.stderr)
                shape = "sphere"
            nodes.append(
                Node(
                    id=m.group(1),
                    shape=shape,
                    x=float(m.group(3)),
                    y=float(m.group(4)),
                    z=float(m.group(5)),
                    label=m.group(6),
                    color=PALETTE[color_idx % len(PALETTE)],
                )
            )
            color_idx += 1

        elif line.startswith("edge "):
            m = _EDGE_RE.match(line)
            if not m:
                print(f"line {lineno}: cannot parse edge — {raw!r}", file=sys.stderr)
                continue
            edges.append(Edge(from_=m.group(1), to=m.group(2), label=m.group(3) or ""))

        else:
            print(f"line {lineno}: unrecognised statement — {raw!r}", file=sys.stderr)

    return Scene(nodes=nodes, edges=edges)


# ── Translator ─────────────────────────────────────────────────────────────────


def translate(source: str, title: str = "conception-space") -> str:
    scene = parse_cs(source)
    if not scene["nodes"]:
        print("warning: no nodes found", file=sys.stderr)
    # Guard against </script> in label text breaking HTML parsing
    scene_json = json.dumps(scene).replace("</", "<\\/")
    return (
        HTML_TEMPLATE.replace("__TITLE__", title)
        .replace("__SCENE_JSON__", scene_json)
        .replace("__SM_PORT__", str(SM_PORT))
    )


def main() -> None:
    if len(sys.argv) < 2:
        print("usage: cs2html <input.cns> [output.html]", file=sys.stderr)
        sys.exit(1)
    src = Path(sys.argv[1])
    dest = Path(sys.argv[2]) if len(sys.argv) > 2 else src.with_suffix(".html")
    dest.write_text(translate(src.read_text(), title=src.stem))
    print(f"wrote {dest}")
