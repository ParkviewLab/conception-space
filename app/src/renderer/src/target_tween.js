// =============================================================================
// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Gary Frattarola <garyf@parkviewlab.ai>
//  target_tween.js — Septic-eased lerp of orbit.target from current → toTarget
// =============================================================================
//
// WHAT THIS MODULE IS
// -------------------
// A short, focused tween used to smooth the click-to-select orbit-target snap
// in controls.js.  Before v0.6.13, clicking a node hard-set:
//
//     orbit.target.copy(mesh.position)
//
// — which made the camera's look direction snap instantly to the new pivot
// (OrbitControls' damping does not smooth direct target mutations).  This
// module replaces the snap with a 1.0 s septic-eased lerp of orbit.target
// from wherever it is now to the requested point.  At completion, the
// orbit pivot is exactly at the clicked object, so subsequent drag-orbit
// and scroll-zoom pivot around it.
//
// "Smooth the pivot, don't move the camera" — only orbit.target is mutated.
//
//
// WHY NOT REUSE CameraPreAim?
// ---------------------------
// CameraPreAim (pre_aim.js) is structurally close but its endpoint differs:
// it slerps a *direction* at constant orbit radius, so its final orbit.target
// lands on a sphere of the original radius around the camera — not at the
// clicked object.  Subsequent drag-orbit would then pivot around an in-space
// point on the sight-line, not around the object.  TargetTween is a sibling
// module, not a fork — same tick/cancel/.done API, same septic easing,
// but it lerps a 3D *point* directly so the final orbit pivot is bit-exact
// on the requested object.
//
//
// EXTERNAL API CONTRACT
// ---------------------
// Constructor: `new TargetTween({ orbit, toTarget, duration, onComplete })`
//
//   orbit       OrbitControls instance — target will be mutated.
//   toTarget    { x, y, z }            — destination point for orbit.target.
//   duration    seconds (default 1.0).
//   onComplete  optional callback fired when the tween finishes (also on cancel,
//               consistent with CameraPath / CameraPreAim).
//
// Methods:
//   tick(dt)    advance by dt seconds; called once per frame.
//   cancel()    abort early; leaves orbit.target wherever it was mid-lerp.
//
// State:  .done is true once the tween completes or is cancelled.
//
//
// HAND-OFF SEMANTICS
// ------------------
// The tween snapshots `orbit.target.clone()` at construction time, so a
// re-click (or any other consumer that constructs a new TargetTween) gets
// a clean hand-off: the new tween's _fromTarget is wherever the previous
// tween got orbit.target to, with no visual jump on replacement.
// =============================================================================

import * as THREE from 'three'

// Septic smoothstep — C³ at both ends (zero position, velocity,
// acceleration, AND jerk).  Same function as in camera_path.js / pre_aim.js;
// duplicated here to keep this module self-contained.
const septic = (u) => {
  const u4 = u * u * u * u
  return u4 * (35 + u * (-84 + u * (70 - 20 * u)))
}

export class TargetTween {
  constructor({ orbit, toTarget, duration = 1.0, onComplete } = {}) {
    this.orbit      = orbit
    this.duration   = Math.max(0.001, duration)
    this.elapsed    = 0
    this.onComplete = onComplete
    this.done       = false

    // Snapshot the *current* orbit.target so a re-click during an in-flight
    // tween cleanly hands off from wherever the previous lerp got to.
    this._fromTarget = orbit.target.clone()
    this._toTarget   = new THREE.Vector3(toTarget.x, toTarget.y, toTarget.z)
  }

  tick(dt) {
    if (this.done) return
    this.elapsed += dt
    if (this.elapsed >= this.duration) {
      // Final-frame hard-set so the orbit pivot is bit-precisely at the
      // requested point.  Subsequent drag-orbit and scroll-zoom will then
      // pivot exactly around the clicked object.
      this.orbit.target.copy(this._toTarget)
      this.done = true
      this.onComplete?.()
      return
    }
    const k = septic(this.elapsed / this.duration)
    this.orbit.target.lerpVectors(this._fromTarget, this._toTarget, k)
  }

  cancel() {
    if (this.done) return
    this.done = true
    this.onComplete?.()
  }
}
