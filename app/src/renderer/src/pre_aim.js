// =============================================================================
// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Gary Frattarola <garyf@parkviewlab.ai>
//  pre_aim.js — Camera pre-aim tween (pivot in place to look at a target point)
// =============================================================================
//
// WHAT THIS MODULE IS
// -------------------
// A short, focused tween used *before* a CameraPath bookmark transition.
// It pivots the camera in place — no translation — over a fixed duration so
// the camera ends up looking directly at a specified 3D point, at the same
// orbit distance it started with.
//
// The intended flow (orchestrated by main.js):
//
//   1.  Construct CameraPreAim with `aimAt` = destination camera position.
//   2.  Tick to completion (default 1.5 s).  orbit.target slerps from the
//       user's current look direction toward (aimAt − cameraPos) / |…|.
//   3.  On completion, construct a CameraPath from the now-aimed view to
//       the destination bookmark pose.  Because the camera is already
//       pointing down the chord, CameraPath's launch tangent matches the
//       camera's look direction and the start blend in CameraPath is
//       essentially a no-op.
//
// "Look first, then go" — like turning your head before walking somewhere.
//
//
// THE PIVOT
// ---------
// Per frame, with t = elapsed seconds and duration = the constructor's
// `duration`:
//
//   k       = septic(t / duration)
//   dir     = normalise(lerp(originalDir, aimDir, k))      (approx slerp)
//   target  = fromPos + dir · orbitRadius
//
// Both originalDir and aimDir are unit vectors.  Lerp+normalise is the
// same approximate-slerp pattern used by CameraPath's endpoint blends and
// is perceptually indistinguishable from a true slerp at sub-180° angles
// (always true here, since both come from a viewer the user has been
// looking around in).
//
// Septic easing — S(u) = 35u⁴ − 84u⁵ + 70u⁶ − 20u⁷ — gives zero angular
// velocity at both endpoints of the pivot.  Matches the orientation
// contract that the subsequent CameraPath expects at its launch.
//
// **No rate limiter.**  The caller asked for a fixed pivot duration, not
// a rate-clamped sweep.  Peak angular speed inside the pivot is
// (aimAngle / duration) × septic-peak (≈ 2.19).  For a 90° pivot over
// 1.5 s that's ≈ 131°/s peak — visibly faster than CameraPath's rate cap
// (22.5°/s) but bounded by the geometry × duration, not by a runtime
// clamp.  If the pivot ever needs to feel slower, raise `duration`.
//
//
// EXTERNAL API CONTRACT
// ---------------------
// Constructor:
//
//   `new CameraPreAim({ camera, orbit, from, aimAt, duration, onComplete })`
//
//     camera     THREE.PerspectiveCamera   (NOT moved — only orbit.target
//                                            is mutated here; the camera
//                                            position is held at fromPos)
//     orbit      OrbitControls instance    (target will be mutated)
//     from       { px, py, pz, tx, ty, tz } — start camera + target
//     aimAt      { x,  y,  z }             — 3D point to aim at
//     duration   seconds (default 1.5)
//     onComplete optional callback fired when the pivot finishes
//
// Methods:
//   tick(dt)   advance by dt seconds; called once per frame from the
//              render loop with a real delta-time.
//   cancel()   abort early — leaves orbit.target wherever the interpolation
//              had it; fires onComplete (consistent with CameraPath).
//
// State: .done is true once the tween completes or is cancelled.
//
//
// EDGE CASES
// ----------
// • `aimAt` ≈ camera position (degenerate self-aim): aimDir falls back to
//   originalDir, so the pivot is a visual no-op but still consumes the
//   full duration.  onComplete fires normally.
// • `originalDir` ≈ `aimDir` (camera already looking at the target):
//   pivot is a visual no-op but still consumes the full duration.
// • Cancel mid-pivot: orbit.target stays where it is; the next consumer
//   (e.g. main.js's onComplete handler) can capture the current view and
//   proceed from there.
// =============================================================================

import * as THREE from 'three'

const EPS = 1e-6

// Septic smoothstep — C³ at both ends (same as camera_path.js).  Duplicated
// here to keep this module self-contained.
const septic = (u) => {
  const u4 = u * u * u * u
  return u4 * (35 + u * (-84 + u * (70 - 20 * u)))
}

// Scratch vector reused across frames to avoid per-tick allocations.
const _dir = new THREE.Vector3()

export class CameraPreAim {
  constructor({ camera, orbit, from, aimAt, duration = 1.5, onComplete } = {}) {
    this.camera     = camera
    this.orbit      = orbit
    this.duration   = Math.max(0.001, duration)
    this.elapsed    = 0
    this.onComplete = onComplete
    this.done       = false

    this._fromPos = new THREE.Vector3(from.px, from.py, from.pz)

    // Original look direction (unit) and orbit radius at the start.
    const lookStart = new THREE.Vector3(from.tx, from.ty, from.tz).sub(this._fromPos)
    this._orbitRadius = Math.max(EPS, lookStart.length())
    this._originalDir = lookStart.divideScalar(this._orbitRadius)

    // Aim direction (unit) from camera toward aimAt.  Degenerate self-aim
    // (aimAt = camera position) falls back to the original direction so the
    // pivot is a visual no-op but the timing contract is preserved.
    const aimVec = new THREE.Vector3(aimAt.x, aimAt.y, aimAt.z).sub(this._fromPos)
    const aimLen = aimVec.length()
    this._aimDir = aimLen < EPS
      ? this._originalDir.clone()
      : aimVec.divideScalar(aimLen)
  }

  tick(dt) {
    if (this.done) return
    this.elapsed += dt
    const t = this.elapsed

    if (t >= this.duration) {
      // Final frame: hard-set to exactly aimDir at orbitRadius so the
      // handoff to the subsequent CameraPath is bit-precise.
      this.camera.position.copy(this._fromPos)
      this.orbit.target
        .copy(this._fromPos)
        .addScaledVector(this._aimDir, this._orbitRadius)
      this.done = true
      this.onComplete?.()
      return
    }

    const k = septic(t / this.duration)
    _dir.lerpVectors(this._originalDir, this._aimDir, k).normalize()
    this.camera.position.copy(this._fromPos)
    this.orbit.target
      .copy(this._fromPos)
      .addScaledVector(_dir, this._orbitRadius)
  }

  cancel() {
    if (this.done) return
    this.done = true
    this.onComplete?.()
  }
}
