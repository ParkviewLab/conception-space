// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Gary Frattarola <garyf@parkviewlab.ai>
import * as THREE from 'three'
import { OrbitControls }    from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import { ambientLight, groupMeshes } from './scene.js'
import { TargetTween }                from './target_tween.js'

let orbit, transform
let selected      = null   // currently selected node mesh
let selectedGroup = null   // { id, label } when a solid group sphere is clicked directly
let isDraggingGizmo = false
let pointerDownAt   = null
let _onModeChange   = null

// In-flight click → orbit.target tween (v0.6.13).  Smooths the
// click-to-select snap over 1.0 s so the camera glides to the new pivot
// instead of teleporting.  Ticked from updateControls() each frame.
let _clickTween = null
const CLICK_TWEEN_DURATION = 1.0

// ── Init ──────────────────────────────────────────────────────────────────────

export function initControls({ camera, renderer, scene, nodeMeshes, onModeChange, onNodeDoubleClick }) {
  _onModeChange = onModeChange

  // Orbit (camera)
  orbit = new OrbitControls(camera, renderer.domElement)
  orbit.enableDamping  = true
  orbit.dampingFactor  = 0.07
  orbit.minDistance    = 0.5
  orbit.maxDistance    = 400

  // Transform (selected object)
  transform = new TransformControls(camera, renderer.domElement)
  transform.size = 0.8
  scene.add(transform)

  // Disable orbit while dragging a gizmo handle
  transform.addEventListener('dragging-changed', (e) => {
    orbit.enabled   = !e.value
    isDraggingGizmo = e.value
  })

  // Notify main.js whenever selection or mode changes so the HUD updates
  transform.addEventListener('change', () => onModeChange(getState()))

  // ── Pointer events ─────────────────────────────────────────────────────────
  const canvas = renderer.domElement

  canvas.addEventListener('pointerdown', (e) => {
    pointerDownAt = { x: e.clientX, y: e.clientY }
  })

  canvas.addEventListener('pointerup', (e) => {
    if (!pointerDownAt || isDraggingGizmo) return
    const dx = e.clientX - pointerDownAt.x
    const dy = e.clientY - pointerDownAt.y
    if (Math.hypot(dx, dy) < 5) handleClick(e, camera, nodeMeshes)
    pointerDownAt = null
  })

  canvas.addEventListener('dblclick', (e) => {
    if (!onNodeDoubleClick) return
    const rect = canvas.getBoundingClientRect()
    const ndc  = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width)  *  2 - 1,
      -((e.clientY - rect.top)  / rect.height) * 2 + 1,
    )
    const ray = new THREE.Raycaster()
    ray.setFromCamera(ndc, camera)
    const visibleNodes = nodeMeshes.filter(m => m.visible)
    const hits = ray.intersectObjects(visibleNodes)
    if (hits.length && hits[0].object.userData.file) {
      onNodeDoubleClick(hits[0].object.userData)
      return
    }
    // Snap fallback: forgive near-misses on tiny distant nodes
    const snap = findNearestVisibleNode(canvas, camera, visibleNodes, e.clientX, e.clientY, 25)
    if (snap?.userData.file) onNodeDoubleClick(snap.userData)
  })

  // ── Keyboard ───────────────────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.target !== document.body && e.target.tagName !== 'CANVAS') return
    switch (e.key) {
      case 'Escape':           deselect(); break
      case 'g': case 'G':     if (selected) setTransformMode('translate'); break
      case 'r': case 'R':     if (selected) setTransformMode('rotate');    break
      case 's': case 'S':     if (selected) setTransformMode('scale');     break
      case '+': case '=':     adjustAmbient(+0.02); break
      case '-':               adjustAmbient(-0.02); break
    }
    onModeChange(getState())
  })

  return { orbit, transform }
}

// ── Selection ─────────────────────────────────────────────────────────────────

function handleClick(event, camera, nodeMeshes) {
  const canvas = event.target
  const rect   = canvas.getBoundingClientRect()
  const ndc = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width)  * 2 - 1,
    -((event.clientY - rect.top)  / rect.height) * 2 + 1,
  )

  const ray = new THREE.Raycaster()
  ray.setFromCamera(ndc, camera)

  const visibleNodes  = nodeMeshes.filter(m => m.visible)
  const visibleSolids = [...groupMeshes.values()].filter(m => m.userData.isSolid && m.visible)
  const nodeHits  = ray.intersectObjects(visibleNodes)
  const groupHits = ray.intersectObjects(visibleSolids)

  const allHits = [...nodeHits, ...groupHits].sort((a, b) => a.distance - b.distance)

  let mesh = allHits[0]?.object ?? null

  // Forgiving fallback: if the raycast missed everything, snap to the closest
  // visible node/group within 25 px of the cursor. Distant tiny nodes become
  // selectable without pixel-perfect aim.
  if (!mesh) {
    mesh = findNearestVisibleNode(
      canvas, camera, [...visibleNodes, ...visibleSolids],
      event.clientX, event.clientY, 25,
    )
  }

  if (!mesh) { deselect(); return }

  if (mesh.userData.nodeId) {
    selectNode(mesh)
  } else {
    selected = null
    selectedGroup = { id: mesh.userData.groupId, label: mesh.userData.groupLabel }
    transform.detach()
    startClickTween(mesh.position)        // v0.6.13: smooth the pivot move
    _onModeChange(getState())
  }
}

// Start a 1.0-s septic-eased lerp of orbit.target toward `pos` (a
// THREE.Vector3-ish {x,y,z}).  Any in-flight click tween is cancelled
// first so the new tween picks up cleanly from wherever orbit.target
// currently is — no visual jump on rapid re-clicks.
function startClickTween(pos) {
  if (_clickTween) _clickTween.cancel()
  _clickTween = new TargetTween({
    orbit,
    toTarget: { x: pos.x, y: pos.y, z: pos.z },
    duration: CLICK_TWEEN_DURATION,
    onComplete: () => { _clickTween = null },
  })
}

// Called from main.js:gotoBookmark before launching a bookmark transition
// so the click tween doesn't fight the pre-aim / path tweens for control
// of orbit.target.  The bookmark's `from = captureCurrentView()` then sees
// the current (mid-lerp) orbit.target and starts smoothly from there.
export function cancelClickTween() {
  if (_clickTween) { _clickTween.cancel(); _clickTween = null }
}

// Project every visible mesh to screen space and return the closest within
// `maxPx` of (x, y). Used by both the click and dblclick snap fallbacks so
// users don't need pixel-perfect aim for tiny distant nodes.
function findNearestVisibleNode(canvas, camera, meshes, x, y, maxPx) {
  const rect = canvas.getBoundingClientRect()
  const v = new THREE.Vector3()
  let best = null
  let bestDist = maxPx
  for (const m of meshes) {
    if (!m.visible) continue
    v.setFromMatrixPosition(m.matrixWorld).project(camera)
    if (v.z > 1 || v.z < -1) continue
    if (v.x < -1 || v.x > 1 || v.y < -1 || v.y > 1) continue
    const sx = (v.x + 1) * 0.5 * rect.width  + rect.left
    const sy = (1 - v.y) * 0.5 * rect.height + rect.top
    const d  = Math.hypot(x - sx, y - sy)
    if (d < bestDist) { bestDist = d; best = m }
  }
  return best
}

function selectNode(mesh) {
  if (selected === mesh) return
  selectedGroup = null
  selected = mesh
  transform.attach(mesh)
  transform.setMode('translate')
  startClickTween(mesh.position)          // v0.6.13: smooth the pivot move
}

export function select(mesh) { selectNode(mesh) }

export function deselect() {
  if (!selected && !selectedGroup) return
  selected      = null
  selectedGroup = null
  transform.detach()
  _onModeChange?.(getState())
}

// ── Transform mode ────────────────────────────────────────────────────────────

export function setTransformMode(mode) {
  transform.setMode(mode)   // 'translate' | 'rotate' | 'scale'
}

// ── Ambient light ─────────────────────────────────────────────────────────────

const AMBIENT_STEPS_MAX = 150   // 150 × 0.02 = 3.0

function adjustAmbient(delta) {
  // Work in integer steps to avoid float accumulation
  const current = Math.round(ambientLight.intensity * 50)
  const next    = Math.max(0, Math.min(AMBIENT_STEPS_MAX, current + Math.round(delta * 50)))
  ambientLight.intensity = next / 50
}

// ── State snapshot for HUD ────────────────────────────────────────────────────

export function getState() {
  return {
    selected:             selected ? selected.userData.label      : null,
    selectedGroupId:      selected ? selected.userData.groupId    : selectedGroup?.id    ?? null,
    selectedGroupLabel:   selected ? selected.userData.groupLabel : selectedGroup?.label ?? null,
    directGroupSelected:  !selected && selectedGroup !== null,
    transformMode:        transform.mode,
    ambientIntensity:     Math.round(ambientLight.intensity * 10) / 10,
  }
}

// ── Per-frame update (call inside render loop) ────────────────────────────────

export function updateControls(dt = 0) {
  // Tick the click tween BEFORE orbit.update() so OrbitControls sees the
  // up-to-date target on this frame.
  if (_clickTween) _clickTween.tick(dt)
  orbit.update()
}
