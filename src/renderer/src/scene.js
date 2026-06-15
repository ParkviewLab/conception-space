// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Gary Frattarola <garyf@parkviewlab.ai>
import * as THREE from 'three'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'

// Exported refs used by controls.js and main.js
export let scene, camera, renderer, labelRenderer, ambientLight
export const nodeMeshes = []          // pickable meshes, each has .userData.nodeId
export const groupMeshes = new Map()  // groupId → group mesh (wireframe or solid)
const _groupLabelObjects = new Map()  // groupId → CSS2DObject label (solid mode only)
const _solidGroups = new Set()        // groupIds currently rendered solid
const _edgeItems     = []             // { tube, label, from, to } — for visibility updates
const _commonalities = []             // { mesh, hostNodeId, commonalityId, hostGroupId } — halo satellites
const _groupFrames = new Map()        // groupId → { frame, mat, cylGeo, sphGeo }
let _groups = []                      // current scene's group list, for descendant lookup
const _dynamic = []                   // edges + group meshes + edge labels — cleared on reload
let _grid, _gridBaseColors
let _commonalitiesVisible = true      // HUD toggle — see setCommonalitiesVisible

export function initScene(container) {
  // ── WebGL renderer ────────────────────────────────────────────────────────
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  container.appendChild(renderer.domElement)

  // ── CSS2D label renderer ──────────────────────────────────────────────────
  labelRenderer = new CSS2DRenderer()
  labelRenderer.setSize(window.innerWidth, window.innerHeight)
  labelRenderer.domElement.className = 'label-layer'
  container.appendChild(labelRenderer.domElement)

  // ── Scene ─────────────────────────────────────────────────────────────────
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x090916)
  scene.fog = new THREE.FogExp2(0x090916, 0.010)

  ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)
  const dir = new THREE.DirectionalLight(0xffffff, 1.0)
  dir.position.set(10, 20, 10)
  scene.add(dir)

  _grid = new THREE.GridHelper(80, 80, 0x1a1a3a, 0x111128)
  _gridBaseColors = _grid.geometry.attributes.color.array.slice()
  scene.add(_grid)
  scene.add(new THREE.AxesHelper(5))

  // ── Camera ────────────────────────────────────────────────────────────────
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 800)
  camera.position.set(15, 12, 20)
  camera.lookAt(0, 0, 0)

  // ── Resize ────────────────────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    labelRenderer.setSize(window.innerWidth, window.innerHeight)
  })
}

export function setGridBrightness(factor) {
  const colors = _grid.geometry.attributes.color.array
  for (let i = 0; i < colors.length; i++) {
    colors[i] = Math.min(1, _gridBaseColors[i] * factor)
  }
  _grid.geometry.attributes.color.needsUpdate = true
}

export function setFogDensity(density) {
  if (scene.fog) scene.fog.density = density
}

export function setLabelsVisible(visible) {
  labelRenderer.domElement.style.display = visible ? '' : 'none'
}

// Toggle all commonality satellites (and their child labels) on/off.  When
// off, every satellite mesh is hidden regardless of per-host visibility; when
// on, per-host visibility is restored via _updateDescendantVisibility.
export function setCommonalitiesVisible(visible) {
  _commonalitiesVisible = !!visible
  _updateDescendantVisibility()
}

export function clearScene() {
  for (const mesh of nodeMeshes) {
    for (const child of mesh.children) {
      if (child.isCSS2DObject) child.element.remove()
    }
    scene.remove(mesh)
    mesh.geometry.dispose()
    mesh.material.dispose()
  }
  nodeMeshes.length = 0

  for (const id of [..._groupFrames.keys()]) _disposeGroupFrame(id)

  for (const obj of _dynamic) {
    for (const child of [...obj.children]) {
      if (child.isCSS2DObject) child.element.remove()
    }
    if (obj.isCSS2DObject) obj.element.remove()
    scene.remove(obj)
    obj.geometry?.dispose()
    obj.material?.dispose()
  }
  _dynamic.length = 0
  _edgeItems.length = 0
  _commonalities.length = 0
  _solidGroups.clear()
  groupMeshes.clear()
  _groupLabelObjects.clear()
}

const FLAT_SHADED = new Set(['cube', 'tetrahedron', 'octahedron', 'dodecahedron', 'icosahedron'])

// ── Commonality satellites halo (see docs/commonality_visual_study.md) ─────
// Each commonality contributes one small coloured marker on an equatorial
// ring around each member node.  Per host, satellites are distributed
// evenly: the N memberships of a host land at angles (i / N) × 2π,
// lex-sorted by commonality id so order is deterministic.  All satellites
// share one orbital phase so each host's ring rotates as a unit — the
// motion is what tells the eye they are decoration markers, not regular
// small nodes.
const COMMONALITY_RING_GAP        = 0.2          // absolute — gap between host surface and satellite surface
const COMMONALITY_SAT_RADIUS      = 0.1           // absolute — a commonality has the same meaning regardless of host
const COMMONALITY_RING_Y_FACTOR   = 0.0           // × host.size — ring plane y-offset (below host center)
const COMMONALITY_ORBIT_RAD_PER_S = 3.5           // ~1.8-second full orbit
// Effective node body radius for spacing satellites away from the host.
// Matches the convention used by the cluster-bounding-sphere code below.
const NODE_BODY_RADIUS_FACTOR     = 0.6           // × host.size — node body "radius"

let _satellitePhase = 0  // global orbital phase shared by all satellites

function makeGeometry(shape) {
  switch (shape) {
    case 'cube':         return new THREE.BoxGeometry(0.9, 0.9, 0.9)
    case 'cylinder':     return new THREE.CylinderGeometry(0.38, 0.38, 0.95, 24)
    case 'tetrahedron':  return new THREE.TetrahedronGeometry(0.62)
    case 'octahedron':   return new THREE.OctahedronGeometry(0.58)
    case 'dodecahedron': return new THREE.DodecahedronGeometry(0.52)
    case 'icosahedron':  return new THREE.IcosahedronGeometry(0.55)
    default:             return new THREE.SphereGeometry(0.48, 32, 16)
  }
}

export function buildScene(data) {
  clearScene()

  const positions = {}   // id → Vector3 (world positions)

  // ── Group world origins ───────────────────────────────────────────────────
  // Each group may have a locus that is relative to its parent group's origin.
  // Compute each group's absolute world-origin recursively.
  const _groups0  = data.groups ?? []
  const _groupMap = Object.fromEntries(_groups0.map(g => [g.id, g]))
  const _origins  = {}   // groupId → Vector3 (world origin)

  function groupWorldOrigin(id) {
    if (_origins[id]) return _origins[id]
    const g = _groupMap[id]
    if (!g) { _origins[id] = new THREE.Vector3(); return _origins[id] }
    const local = new THREE.Vector3(g.x ?? 0, g.y ?? 0, g.z ?? 0)
    if (g.parentId) local.add(groupWorldOrigin(g.parentId))
    _origins[id] = local
    return local
  }
  for (const g of _groups0) groupWorldOrigin(g.id)

  // ── Nodes ─────────────────────────────────────────────────────────────────
  const groupLabelById = Object.fromEntries(_groups0.map(g => [g.id, g.label]))

  for (const n of data.nodes) {
    const origin = n.groupId ? (_origins[n.groupId] ?? new THREE.Vector3()) : new THREE.Vector3()
    const wx = n.x + origin.x
    const wy = n.y + origin.y
    const wz = n.z + origin.z

    const color = new THREE.Color(n.color)
    const mat = new THREE.MeshPhongMaterial({
      color,
      shininess: 90,
      flatShading: FLAT_SHADED.has(n.shape),
      transparent: n.alpha < 1,
      opacity: n.alpha,
    })
    const mesh = new THREE.Mesh(makeGeometry(n.shape), mat)
    mesh.position.set(wx, wy, wz)
    mesh.scale.setScalar(n.size)
    mesh.userData = { nodeId: n.id, label: n.label, baseColor: n.color,
                      groupId: n.groupId, groupLabel: groupLabelById[n.groupId] ?? null,
                      file: n.file ?? null }
    scene.add(mesh)
    nodeMeshes.push(mesh)

    const div = document.createElement('div')
    div.className = 'node-label'
    div.textContent = n.label
    const lobj = new CSS2DObject(div)
    lobj.position.set(0, 0.78 / n.size, 0)
    mesh.add(lobj)

    positions[n.id] = new THREE.Vector3(wx, wy, wz)
  }

  // ── Edges ─────────────────────────────────────────────────────────────────
  for (const e of data.edges) {
    const a = positions[e.from]
    const b = positions[e.to]
    if (!a || !b) continue

    const curve = new THREE.LineCurve3(a, b)
    const geo = new THREE.TubeGeometry(curve, 1, e.thickness ?? 0.04, 6, false)
    const mat = new THREE.MeshPhongMaterial({ color: e.color ?? '#BFBFBF', shininess: 30 })
    const tube = new THREE.Mesh(geo, mat)
    scene.add(tube)
    _dynamic.push(tube)

    let edgeLabel = null
    if (e.label) {
      const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5)
      const div = document.createElement('div')
      div.className = 'edge-label'
      div.textContent = e.label
      const lobj = new CSS2DObject(div)
      lobj.position.copy(mid)
      scene.add(lobj)
      _dynamic.push(lobj)
      edgeLabel = lobj
    }

    _edgeItems.push({ tube, label: edgeLabel, from: e.from, to: e.to })
  }

  // ── Node groups ───────────────────────────────────────────────────────────
  // Recursively compute { center: Vector3, radius: number } for a group,
  // treating child-group spheres as items to enclose (not just node points).
  // Node positions are already world-coords in the `positions` map.
  _groups        = _groups0
  const groups   = _groups
  const _spheres = new Map()  // groupId → { center, radius }

  function groupSphere(id) {
    if (_spheres.has(id)) return _spheres.get(id)

    const items = []   // { center: Vector3, radius: number }

    for (const n of data.nodes.filter(n => n.groupId === id))
      items.push({ center: positions[n.id].clone(), radius: n.size * 0.6 })

    for (const child of groups.filter(g => g.parentId === id)) {
      const cs = groupSphere(child.id)
      if (cs) items.push(cs)
    }

    if (items.length === 0) { _spheres.set(id, null); return null }

    const center = new THREE.Vector3()
    for (const it of items) center.add(it.center)
    center.divideScalar(items.length)

    let radius = 0
    for (const it of items) {
      const d = center.distanceTo(it.center) + it.radius
      if (d > radius) radius = d
    }

    const result = { center, radius: radius + 1.5 }
    _spheres.set(id, result)
    return result
  }

  for (const g of groups) {
    const s = groupSphere(g.id)
    if (!s) continue

    const geo = new THREE.IcosahedronGeometry(s.radius, g.N)
    const col = new THREE.Color(g.color ?? '#BFBFBF').multiplyScalar(g.brightness)
    const mat = new THREE.MeshPhongMaterial({ color: col, wireframe: true, shininess: 60 })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.copy(s.center)
    mesh.userData = { groupId: g.id, groupLabel: g.label, radius: s.radius, isSolid: false,
                      groupColor: g.color ?? '#BFBFBF',
                      tubeColor: g.tubeColor, tubeThickness: g.tubeThickness }
    scene.add(mesh)
    _dynamic.push(mesh)
    groupMeshes.set(g.id, mesh)
  }

  // ── Commonality satellites ────────────────────────────────────────────────
  // Group memberships per host so we can distribute them evenly around the
  // host's ring: N memberships → 2π / N spacing.  Lex-sorted by id so order
  // is deterministic across reloads.
  const commonalities  = data.commonalities ?? []
  const nodeById       = Object.fromEntries(data.nodes.map(n => [n.id, n]))
  const membershipsBy  = new Map()  // nodeId → [ { commonalityId, color, label, shape } ]
  for (const c of commonalities) {
    for (const memberId of c.members) {
      if (!membershipsBy.has(memberId)) membershipsBy.set(memberId, [])
      membershipsBy.get(memberId).push({
        commonalityId: c.id,
        color:         c.color ?? '#BFBFBF',
        label:         c.label ?? c.id,
        shape:         c.shape ?? 'sphere',
      })
    }
  }

  for (const [hostNodeId, memberships] of membershipsBy) {
    const host = nodeById[hostNodeId]
    if (!host) continue  // unknown ids were stripped by the parser; defensive

    const hostPos = positions[hostNodeId]
    if (!hostPos) continue

    const hostSize    = host.size ?? 1
    const ringR       = (hostSize * 0.5) + (COMMONALITY_SAT_RADIUS * 0.5) + COMMONALITY_RING_GAP
    const satR        = COMMONALITY_SAT_RADIUS
    const ringCenterY = hostPos.y + hostSize * COMMONALITY_RING_Y_FACTOR

    memberships.sort((a, b) => a.commonalityId.localeCompare(b.commonalityId))

    const angleStep = (Math.PI * 2) / memberships.length
    for (let i = 0; i < memberships.length; i++) {
      const m = memberships[i]
      const baseAngle = i * angleStep
      // Reuse the node-shape geometry primitives; their base radius is ≈0.5,
      // so scale by satR / 0.5 to land at the desired satellite size.
      const satGeo = makeGeometry(m.shape)
      const satMat = new THREE.MeshPhongMaterial({
        color:             m.color,
        emissive:          m.color,
        emissiveIntensity: 0.45,
        shininess:         30,
        flatShading:       FLAT_SHADED.has(m.shape),
      })
      const satScale = satR / 0.5
      const satMesh = new THREE.Mesh(satGeo, satMat)
      satMesh.scale.setScalar(satScale)
      // Respect the HUD commonalities toggle on initial build.  Per-host
      // solid-cluster hiding (via _updateDescendantVisibility) is applied
      // later when setGroupSolid replays the solid set.
      satMesh.visible = _commonalitiesVisible
      // Position is recomputed every frame in updateCommonalities — set an
      // initial value here so the first paint before tick #1 is correct.
      const theta0 = baseAngle + _satellitePhase
      satMesh.position.set(
        hostPos.x + Math.cos(theta0) * ringR,
        ringCenterY,
        hostPos.z + Math.sin(theta0) * ringR,
      )
      satMesh.userData = { commonalityId: m.commonalityId, hostNodeId }
      scene.add(satMesh)
      _dynamic.push(satMesh)

      const labDiv = document.createElement('div')
      labDiv.className = 'satellite-label'
      labDiv.textContent = m.label
      const labObj = new CSS2DObject(labDiv)
      // Label is a child of the scaled satellite mesh, so divide by satScale
      // to land at (satR + 0.12) in world units (just above the satellite).
      labObj.position.set(0, (satR + 0.12) / satScale, 0)
      satMesh.add(labObj)
      _commonalities.push({
        mesh:          satMesh,
        hostNodeId,
        commonalityId: m.commonalityId,
        hostGroupId:   host.groupId ?? null,
        ringCenter:    new THREE.Vector3(hostPos.x, ringCenterY, hostPos.z),
        ringR,
        baseAngle,
      })
    }
  }

}

// Per-frame orbital update for commonality satellites.  Called from the
// main loop's animation tick.  All satellites share `_satellitePhase` so
// the rings advance in synchrony — multi-membership reads as one ring
// rotating, not independent specks.
export function updateCommonalities(dt) {
  if (_commonalities.length === 0) return
  _satellitePhase += dt * COMMONALITY_ORBIT_RAD_PER_S
  for (const sat of _commonalities) {
    const theta = sat.baseAngle + _satellitePhase
    sat.mesh.position.set(
      sat.ringCenter.x + Math.cos(theta) * sat.ringR,
      sat.ringCenter.y,
      sat.ringCenter.z + Math.sin(theta) * sat.ringR,
    )
  }
}

function descendantGroupIds(rootId) {
  const ids = new Set([rootId])
  let grew = true
  while (grew) {
    grew = false
    for (const g of _groups) {
      if (!ids.has(g.id) && ids.has(g.parentId)) { ids.add(g.id); grew = true }
    }
  }
  return ids
}

// Hide/show nodes, child group meshes, and tube frames based on _solidGroups.
// "allDescendants"    includes the solid root  → nodes inside it are hidden.
// "strictDescendants" excludes the solid root  → the opaque sphere stays visible;
//   only its children are hidden.  CSS2DObject labels on hidden meshes disappear
//   automatically because Three.js traverseVisible skips invisible subtrees.
function _updateDescendantVisibility() {
  const allDescendants    = new Set()
  const strictDescendants = new Set()
  for (const solidId of _solidGroups) {
    for (const id of descendantGroupIds(solidId)) {
      allDescendants.add(id)
      if (id !== solidId) strictDescendants.add(id)
    }
  }
  for (const nm of nodeMeshes)
    nm.visible = !allDescendants.has(nm.userData.groupId)
  for (const [id, gMesh] of groupMeshes)
    gMesh.visible = !strictDescendants.has(id)
  for (const [id, entry] of _groupFrames)
    entry.frame.visible = !strictDescendants.has(id)
  for (const { mesh, hostGroupId } of _commonalities)
    mesh.visible = _commonalitiesVisible && !allDescendants.has(hostGroupId)
}

function _updateEdgeVisibility() {
  const hiddenGroupIds = new Set()
  for (const solidId of _solidGroups) {
    for (const id of descendantGroupIds(solidId)) hiddenGroupIds.add(id)
  }
  const hiddenNodes = new Set(
    nodeMeshes
      .filter(nm => hiddenGroupIds.has(nm.userData.groupId))
      .map(nm => nm.userData.nodeId)
  )
  for (const { tube, label, from, to } of _edgeItems) {
    const hide = hiddenNodes.has(from) && hiddenNodes.has(to)
    tube.visible = !hide
    if (label) label.visible = !hide
  }
}

function _ihsComplement(hex) {
  const n = parseInt((hex ?? '#BFBFBF').slice(1), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >>  8) & 255) / 255
  const b =  (n        & 255) / 255

  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0, s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6;               break
      case b: h = ((r - g) / d + 4) / 6;               break
    }
  }

  // IHS complement: H + 180°, S unchanged, I (L) inverted
  const ch = (h + 0.5) % 1.0
  const cs = s
  const cl = 1.0 - l

  // HSL → RGB
  function hue2rgb(p, q, t) {
    if (t < 0) t += 1; if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }
  let cr, cg, cb
  if (cs === 0) {
    cr = cg = cb = cl
  } else {
    const q = cl < 0.5 ? cl * (1 + cs) : cl + cs - cl * cs
    const p = 2 * cl - q
    cr = hue2rgb(p, q, ch + 1/3)
    cg = hue2rgb(p, q, ch)
    cb = hue2rgb(p, q, ch - 1/3)
  }
  const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0')
  return '#' + toHex(cr) + toHex(cg) + toHex(cb)
}

function _buildGroupFrame(groupId) {
  const groupMesh = groupMeshes.get(groupId)
  if (!groupMesh) return

  const sphereRadius = groupMesh.userData.radius
  const thickness = ((groupMesh.userData.tubeThickness ?? 1.0) / 100) * (2 * sphereRadius / 6)

  let tubeColor
  if (groupMesh.userData.tubeColor) {
    tubeColor = new THREE.Color(groupMesh.userData.tubeColor)
  } else {
    tubeColor = new THREE.Color(_ihsComplement(groupMesh.userData.groupColor))
  }

  const geo = groupMesh.geometry
  const pos = geo.attributes.position
  const idx = geo.index?.array

  const pKey = i => `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`
  const pVec = i => new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))

  // Extract unique edges — IcosahedronGeometry is non-indexed, so handle both cases
  const edgeSet   = new Set()
  const edgeVerts = []
  if (idx) {
    for (let i = 0; i < idx.length; i += 3) {
      for (const [a, b] of [[idx[i],idx[i+1]], [idx[i+1],idx[i+2]], [idx[i+2],idx[i]]]) {
        const key = a < b ? `${a}_${b}` : `${b}_${a}`
        if (!edgeSet.has(key)) { edgeSet.add(key); edgeVerts.push([pVec(a), pVec(b)]) }
      }
    }
  } else {
    // Non-indexed: every 3 positions form a triangle; deduplicate by position string
    for (let i = 0; i < pos.count; i += 3) {
      for (const [ai, bi] of [[i,i+1],[i+1,i+2],[i+2,i]]) {
        const ka = pKey(ai), kb = pKey(bi)
        const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`
        if (!edgeSet.has(key)) { edgeSet.add(key); edgeVerts.push([pVec(ai), pVec(bi)]) }
      }
    }
  }

  const mat   = new THREE.MeshPhongMaterial({ color: tubeColor, shininess: 60 })
  const up    = new THREE.Vector3(0, 1, 0)
  const dummy = new THREE.Object3D()
  const frame = new THREE.Group()
  frame.position.copy(groupMesh.position)

  // Instanced cylinders along each edge
  const cylGeo  = new THREE.CylinderGeometry(thickness, thickness, 1, 8, 1)
  const cylMesh = new THREE.InstancedMesh(cylGeo, mat, edgeVerts.length)
  for (let i = 0; i < edgeVerts.length; i++) {
    const [a, b] = edgeVerts[i]
    const dir = new THREE.Vector3().subVectors(b, a)
    const len = dir.length()
    dummy.position.addVectors(a, b).multiplyScalar(0.5)
    dummy.quaternion.setFromUnitVectors(up, dir.divideScalar(len))
    dummy.scale.set(1, len, 1)
    dummy.updateMatrix()
    cylMesh.setMatrixAt(i, dummy.matrix)
  }
  cylMesh.instanceMatrix.needsUpdate = true
  frame.add(cylMesh)

  scene.add(frame)
  _groupFrames.set(groupId, { frame, mat, cylGeo })
}

function _disposeGroupFrame(groupId) {
  const entry = _groupFrames.get(groupId)
  if (!entry) return
  scene.remove(entry.frame)
  entry.cylGeo.dispose()
  entry.mat.dispose()
  _groupFrames.delete(groupId)
}

export function setGroupSolid(groupId, solid) {
  const mesh = groupMeshes.get(groupId)
  if (!mesh) return

  mesh.material.wireframe   = !solid
  mesh.material.transparent = false
  mesh.material.opacity     = 1
  mesh.material.side        = THREE.FrontSide
  mesh.material.needsUpdate = true
  mesh.userData.isSolid     = solid

  if (solid) { _solidGroups.add(groupId);    _buildGroupFrame(groupId)   }
  else       { _solidGroups.delete(groupId); _disposeGroupFrame(groupId) }

  _updateDescendantVisibility()
  _updateEdgeVisibility()

  if (solid) {
    const div = document.createElement('div')
    div.className = 'group-label'
    div.textContent = mesh.userData.groupLabel
    const lobj = new CSS2DObject(div)
    lobj.position.set(0, 0, 0)
    mesh.add(lobj)
    _groupLabelObjects.set(groupId, lobj)
  } else {
    const lobj = _groupLabelObjects.get(groupId)
    if (lobj) {
      lobj.element.remove()
      mesh.remove(lobj)
      _groupLabelObjects.delete(groupId)
    }
  }
}
