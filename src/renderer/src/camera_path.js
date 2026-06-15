// =============================================================================
// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Gary Frattarola <garyf@parkviewlab.ai>
//  camera_path.js — Quintic Hermite 3D spline + septic time-scaling
//                   + look-ahead orientation with symmetric endpoint blends
// =============================================================================
//
// WHAT THIS MODULE IS
// -------------------
// A camera-path tween used by `gotoBookmark` in main.js to animate the camera
// from one saved viewpoint to another.
//
// Two-track design (v0.6.8+):
//   * POSITION track — a single C²-continuous 3D quintic Hermite spline
//     (no segment boundaries), traversed by a C³-continuous septic
//     time-scaling (no longitudinal jerk at the endpoints). Unchanged
//     since v0.6.5.
//   * ORIENTATION track — a path-anticipating "look-ahead" direction in
//     the cruise region, blended at both endpoints to the user's exact
//     saved look direction. The strict "look direction = velocity
//     direction" invariant of v0.6.5–v0.6.7 is relaxed near the endpoints
//     to anchor the orientation to the saved bookmark poses. See the
//     ORIENTATION DERIVATION section below.
//
// A complementary "pre-aim" tween (see pre_aim.js) lives in its own
// module — main.js orchestrates the two-step "look first, then go"
// flow by running CameraPreAim and then constructing a CameraPath on
// completion.  This file knows nothing about the pre-aim.
//
//
// WHY THIS APPROACH EXISTS — A HISTORY
// ------------------------------------
//   v0.5.x  Various hand-rolled tweens with phase-boundary stalls and
//           side-slip during the approach.
//   v0.6.0  Full Dubins-airplane (G¹ in XZ), linear Y. Yaw target was the
//           path tangent rather than toPos — destination off-centre.
//   v0.6.1  Cruise-then-Dubins with yaw aimed at toPos. Three phase
//           boundaries; perceptually clunky.
//   v0.6.2  Total duration tweaked. Still clunky.
//   v0.6.3  Pure Dubins, no other phases. Snap in look direction at t=0
//           because path's constant dy/ds didn't match user's actual
//           initial 3D look-direction Y component.
//   v0.6.4  Added cubic Hermite altitude profile with endpoint slope
//           constraints to kill the t=0/t=L snap. Worked for position,
//           but cubic Hermite only matches position and tangent — not
//           curvature — so a small lateral-acceleration kick remained.
//           Also quintic time-scaling has Q'''(0) = 60 ≠ 0, leaving a
//           longitudinal jerk at the endpoints.
//   v0.6.5  Single 3D quintic Hermite spline + arc-length LUT + septic
//           timing. Both jerk sources eliminated:
//             • Curvature jerk: gone, because the path is a single
//               C^∞-in-the-interior polynomial with zero second
//               derivative enforced at both endpoints (G² at endpoints).
//             • Speed jerk: gone, because septic time-scaling has all
//               derivatives up to and including the third zero at both
//               u=0 and u=1.
//           Still used the instantaneous spline tangent as the look
//           direction — which produced perceptible orientation snaps at
//           both endpoints when d₀/d₁ diverged from the chord.
//   v0.6.6  Approach-pose attempt: reshape the POSITION path so all
//           rotation finishes before arrival (curve segment + straight
//           segment). Made the feel worse; reverted.
//   v0.6.7  Revert of v0.6.6; identical to v0.6.5.
//   v0.6.8  Orientation derivation rewritten. The position path and the
//           septic time-warp are unchanged (still the v0.6.5 machinery),
//           but the look direction is no longer the instantaneous spline
//           tangent. Three orientation changes:
//             1. Look-ahead direction (point at where the camera will be
//                a short distance ahead, not exactly along p'(u)) — kills
//                short-term tangent wobble.
//             2. Symmetric endpoint blends (d₀ → look-ahead over 0–20%,
//                pure look-ahead 20–75%, look-ahead → d₁ over 75–100%) —
//                anchors orientation to the saved bookmark poses, so the
//                end-of-path and start-of-path orientation snaps disappear.
//             3. Adaptive Hermite handle length (smaller when d₀/d₁
//                diverges strongly from the chord) — gives the look-ahead
//                direction a gentler curve to track.
//           Plus: ARC_SAMPLES 64 → 256 (orientation is more sensitive to
//           LUT aliasing than position), and inline final-frame handling
//           in tick() (no _finish-call blip).
//           Still left some perceived "fast spinning" at both ends in
//           bookmark configurations with large d₀/d₁ divergence — the
//           blends produced a smooth weight but did not bound the actual
//           angular rate (septic peak rate ≈ 2.19 × mean rate).
//   v0.6.9  Angular-rate limiter as the missing backstop.
//           Two additions on top of v0.6.8:
//             1. Per-frame angular-rate clamp.  A stateful _prevLookDir
//                holds the previous frame's look direction; this frame's
//                lookDir is allowed to rotate at most MAX_ANGULAR_SPEED·dt
//                radians toward the desired direction (the blend output).
//                Excess rotation catches up on subsequent frames.
//             2. Soft end-of-tween catch-up zone.  Past q = END_BOOST_START
//                the rate cap is multiplied by a septic-eased factor
//                ramping 1 → END_BOOST_MAX, guaranteeing the rate-limited
//                direction converges to d₁ before the final-frame
//                hard-set — no residual snap.
//           Plus: widened blends (START_BLEND_END 0.20→0.30,
//           END_BLEND_START 0.75→0.60) to reduce the peak desired rate
//           the limiter has to clamp.
//   v0.6.10 Hand-tuned the three v0.6.9 rate-limiter knobs after live
//           testing.  No structural changes:
//             MAX_ANGULAR_SPEED   120°/s → 90°/s    (gentler cruise)
//             END_BOOST_START     0.85   → 0.65     (earlier catch-up)
//             END_BOOST_MAX       3.0    → 5.0      (bigger catch-up)
//           Worst-case rate at q = 1: 90 × 5 = 450°/s.
//   v0.6.11 Further hand-tuning toward a very gentle
//           cruise with a long, aggressive end catch-up.  No structural
//           changes:
//             END_BLEND_START     0.60   → 0.40   (cruise shrinks to ~10%
//                                                  of q, end blend grows
//                                                  to 60%)
//             MAX_ANGULAR_SPEED    90°/s → 22.5°/s (very gentle cruise)
//             END_BOOST_START     0.65   → 0.40   (boost starts at the
//                                                  end-blend boundary —
//                                                  the entire end blend
//                                                  is boosted)
//             END_BOOST_MAX       5.0    → 8.0     (bigger catch-up)
//           Worst-case rate at q = 1: 22.5 × 8 = 180°/s, with mean ≈
//           100°/s across the 60%-of-tween boost zone — enough budget
//           to absorb even near-reversal end-blend rotations cleanly
//           while keeping the cruise feel deliberate.  See the TUNING
//           CONSTANTS section for the current authoritative values.
//   v0.6.12 The "pre-aim" pivot (pivot the camera to look at the
//           destination before starting the travel) moved out of this
//           file into its own pre_aim.js / CameraPreAim module, with
//           main.js orchestrating the "look first, then go" chain.
//           CameraPath itself is unchanged from v0.6.11 — same
//           constructor signature, same path logic.
//
//
// TWO INDEPENDENT JERK SOURCES — AND HOW EACH IS KILLED
// ------------------------------------------------------
// 1. Longitudinal (speed) jerk. With quintic time-scaling Q(u)=10u³−15u⁴+6u⁵,
//    Q(0)=0, Q'(0)=Q'(1)=0, Q''(0)=Q''(1)=0 but Q'''(0)=Q'''(1)=60. The
//    third derivative — the *rate of change of acceleration* — is non-zero
//    at the endpoints. The camera feels a "push off" at start and a "thump"
//    at arrival. Septic smoothstep S(u)=35u⁴−84u⁵+70u⁶−20u⁷ has Q AND all
//    three derivatives zero at both u=0 and u=1. Eight boundary conditions,
//    seventh-order polynomial — minimum degree that gives zero jerk at both
//    endpoints. Peak velocity 2.1875 (vs quintic's 1.875) — ~17% higher
//    middle speed for genuinely silky endpoints.
//
// 2. Lateral (curvature) jerk. v0.6.4 used a Dubins XZ path, which is only
//    G¹ — tangent-continuous but NOT curvature-continuous. At every
//    straight↔arc segment boundary the curvature jumped from 0 to ±1/R or
//    vice versa, producing a sudden change in lateral acceleration v²·κ.
//    A single quintic Hermite 3D spline has no segment boundaries — the
//    curvature is C^∞ in the interior and explicitly zero at the
//    endpoints (we constrain p''(0)=p''(1)=0). The camera never feels a
//    steering snap.
//
//
// THE 3D QUINTIC HERMITE SPLINE
// -----------------------------
// Six endpoint conditions (per axis):
//
//   p(0)  = fromPos          p(1)  = toPos                (positions)
//   p'(0) = M·d₀             p'(1) = M·d₁                 (tangents)
//   p''(0) = 0               p''(1) = 0                   (zero endpoint curvature)
//
// where d₀, d₁ are the user's 3D unit look directions at start and end,
// and M is the Hermite handle length = HANDLE_FRAC · |chord|. The default
// HANDLE_FRAC = 0.4 (in the canonical 0.25–0.5 range) gives a graceful
// curve without excessive bow.
//
// With the endpoint accelerations set to zero, the spline reduces to:
//
//   p(u) = H₀₀(u)·p₀ + H₁₀(u)·M·d₀ + H₀₁(u)·p₁ + H₁₁(u)·M·d₁
//
// where the H_ij are the standard quintic Hermite basis polynomials:
//
//   H₀₀(u) =  1 − 10u³ + 15u⁴ − 6u⁵
//   H₁₀(u) =  u − 6u³  +  8u⁴ − 3u⁵
//   H₀₁(u) =     10u³ − 15u⁴ + 6u⁵       (this is also the quintic smoothstep)
//   H₁₁(u) =     −4u³ +  7u⁴ − 3u⁵
//
// Cross-check the boundary conditions:
//   p(0)  = 1·p₀ + 0 + 0 + 0 = p₀                           ✓
//   p(1)  = 0 + 0 + 1·p₁ + 0 = p₁                           ✓
//   p'(0) = 0 + 1·(M·d₀) + 0 + 0 = M·d₀, direction = d₀     ✓
//   p'(1) = 0 + 0 + 0 + 1·(M·d₁) = M·d₁, direction = d₁     ✓
//   p''(0) = p''(1) = 0 (zero by construction of the basis polynomials)
//
// The two crucial perceptual consequences:
//   • Look direction at t=0 = path tangent direction = d₀ = user's actual
//     look direction. No snap.
//   • Curvature at t=0 = 0. The camera doesn't suddenly begin turning at
//     the moment motion starts — it flies "straight" along d₀ momentarily
//     and then gradually curves. Same at the destination — straight final
//     approach, then comes to rest.
//
//
// ARC-LENGTH REPARAMETERISATION (essential)
// -----------------------------------------
// The spline parameter u ∈ [0, 1] is NOT arc length. The curve's geometric
// length grows non-uniformly with u — faster in the middle, slower near
// the ends. If we drove the camera directly by u, perceived speed would
// vary even with perfect septic timing.
//
// In the constructor we precompute an arc-length lookup table:
//
//   For i = 0..N:  u_i = i/N,  p_i = p(u_i)
//   s_0 = 0,  s_i = s_{i-1} + |p_i − p_{i-1}|
//   Total arc length L = s_N
//
// N = ARC_SAMPLES (256 since v0.6.8) — sub-pixel accurate at any reasonable
// scene scale; resolution chosen for the look-ahead orientation, which is
// more sensitive to coarse LUT inverses than the position is.
//
// Each frame in `tick(dt)`:
//
//   1. Map time → arc-length fraction via septic: q = S(t / duration)
//   2. Target arc length: targetS = q · L
//   3. Invert the LUT (binary search + linear lerp) to get the spline
//      parameter u that corresponds to that arc length.
//   4. Evaluate p(u) and p'(u) using the inlined Hermite basis.
//
// The result: the camera moves at uniform arc-length-rate along the
// *curve*, modulated only by the septic timing's natural ease-in/ease-out.
// No spatially-uneven glide.
//
//
// ORIENTATION DERIVATION (v0.6.8)
// -------------------------------
// Each frame, the camera position comes straight from the spline at the
// LUT-inverted u. The look direction is built in three steps:
//
// 1. PATH LOOK DIRECTION via look-ahead. Pick a target arc length sAhead
//    a small distance further along the path, find the corresponding
//    spline parameter via the LUT, evaluate the spline there, and take
//    the unit vector from the current position to that look-ahead point:
//
//      lookaheadDist = clamp(LOOKAHEAD_D_FRAC · lookDist,
//                            LOOKAHEAD_S_MIN_FRAC · L,
//                            LOOKAHEAD_S_MAX_FRAC · L)
//      pathLookDir   = normalise(p(sAhead) − camera.position)
//
//    The lookDist term sets the natural anticipation in proportion to
//    how far away the user is currently looking; the two-sided path-length
//    clamp prevents short transitions from collapsing into "look at the
//    endpoint" (which would reintroduce the very endpoint bias the blends
//    in step 2 are trying to fix).
//
// 2. SYMMETRIC ENDPOINT BLENDS. The orientation policy in q (time-warp);
//    bounds are the module constants START_BLEND_END and END_BLEND_START
//    (see TUNING CONSTANTS for current values):
//
//      0 ≤ q < START_BLEND_END:               lerp(d₀, pathLookDir,
//                                                  septic(q / START_BLEND_END))
//      START_BLEND_END ≤ q ≤ END_BLEND_START: pathLookDir
//      END_BLEND_START < q ≤ 1:               lerp(pathLookDir, d₁,
//                                                  septic((q − END_BLEND_START)
//                                                         / (1 − END_BLEND_START)))
//
//    The septic-eased blend weight reaches the seam with zero derivative,
//    so lookDir is continuous across the seam (lookDir → pathLookDir
//    exactly at q = START_BLEND_END and q = END_BLEND_START).  At the
//    endpoints (q = 0 and q = 1) the blend weight is septic(0) = 0 /
//    septic(1) = 1, so the desired direction is exactly the user's
//    saved look direction.
//
// 2b. ANGULAR-RATE LIMITER + END-OF-TWEEN CATCH-UP (v0.6.9). The blends
//     above produce the *desired* look direction; the *actual* look
//     direction lerps toward it, never rotating faster than the cap:
//
//       endBoost  = q > END_BOOST_START
//                     ? lerp(1, END_BOOST_MAX,
//                            septic((q − END_BOOST_START) / (1 − END_BOOST_START)))
//                     : 1
//       maxAngle  = MAX_ANGULAR_SPEED · endBoost · dt
//       angle     = ∠(prevLookDir, lookDir)
//       if angle > maxAngle:
//         lookDir = slerp(prevLookDir, lookDir, maxAngle / angle)
//       prevLookDir = lookDir
//
//     The end-boost ensures convergence to d₁ before the final-frame
//     hard-set, so the user never perceives a residual snap at arrival.
//
// 3. orbit.target = camera.position + lookDir · lookDist(q), where
//    lookDist(q) is a linear lerp between startDist and endDist in q.
//
// What is given up: the strict v0.6.5 invariant "look direction ∥ velocity
// at every instant." Inside the cruise region (20 % ≤ q ≤ 75 %) the
// look-ahead direction is very close to — but not exactly — the
// instantaneous tangent, and inside the blend regions the look direction
// is intentionally pulled toward the saved bookmark look directions
// rather than toward the spline tangent. In return: no perceptible
// orientation snap at either endpoint, even when d₀ / d₁ diverges
// strongly from the chord direction.
//
//
// EXTERNAL API CONTRACT
// ---------------------
// Constructor: `new CameraPath({ camera, orbit, from, to, duration, onComplete })`
//
//   camera     THREE.PerspectiveCamera (will be mutated by tick)
//   orbit      OrbitControls instance  (target will be mutated)
//   from       { px, py, pz, tx, ty, tz }  — start camera + target
//   to         { px, py, pz, tx, ty, tz }  — bookmark camera + target
//   duration   total seconds (default 2.0)
//   onComplete optional callback fired when the tween finishes
//
// Methods:
//   tick(dt)   advance by dt seconds; called once per frame from the
//              render loop with a real delta-time (NOT a frame index).
//   cancel()   abort early — leaves camera/target at their current values.
//
// State: .done is true once the tween completes or is cancelled.
//
//
// TUNING CONSTANTS
// ----------------
// HANDLE_FRAC          default 0.4 — Hermite tangent magnitude as a fraction
//                      of chord. Range 0.25..0.5 is the canonical sweet
//                      spot. v0.6.8 scales this down adaptively in the
//                      constructor when d₀ or d₁ diverges from the chord.
// ARC_SAMPLES          default 256 (v0.6.8; was 64) — arc-length LUT
//                      resolution. Position is forgiving (sub-pixel even
//                      at 64), but the look-ahead orientation is more
//                      sensitive to coarse LUT inverses. Two Float32Arrays
//                      of (ARC_SAMPLES + 1) entries ⇒ ~2 KB at 256.
// START_BLEND_END      default 0.30 (v0.6.9; was 0.20) — q at which the
//                      start-blend ends and the cruise (pure look-ahead)
//                      begins.
// END_BLEND_START      default 0.40 (hand-tuned in v0.6.11; was 0.60 in
//                      v0.6.9–v0.6.10, was 0.75 in v0.6.8) — q at which
//                      the cruise ends and the end-blend toward d₁
//                      begins.  At 0.40 the cruise is only ~10% of the
//                      tween and the end blend is 60%, leaving a long
//                      window for the rate-limited direction to converge.
// LOOKAHEAD_S_MIN_FRAC default 0.05 — lower bound on look-ahead distance,
//                      as a fraction of total arc length.
// LOOKAHEAD_S_MAX_FRAC default 0.20 — upper bound on look-ahead distance,
//                      as a fraction of total arc length.  The upper bound
//                      matters: without it, short transitions with large
//                      lookDist would clamp the look-ahead point to the
//                      end of the path almost immediately, reintroducing
//                      the endpoint bias the blends are trying to fix.
// LOOKAHEAD_D_FRAC     default 0.25 — nominal look-ahead distance, as a
//                      fraction of the current orbit distance. Sized to
//                      anticipate roughly where the user is already
//                      pointing the camera.
// MAX_ANGULAR_SPEED    default 22.5°/s (hand-tuned in v0.6.11; was 90 in
//                      v0.6.10, 120 in v0.6.9) — per-frame cap on the
//                      angular rotation of the camera look direction.
//                      Lower ⇒ slower, more deliberate camera response
//                      but more risk of residual rotation at arrival;
//                      higher ⇒ snappier but easier to see fast spin.
//                      Paired with an early + aggressive end-of-tween
//                      boost (below) to converge cleanly at this low
//                      base rate.
// END_BOOST_START      default 0.40 (hand-tuned in v0.6.11; was 0.65 in
//                      v0.6.10, 0.85 in v0.6.9) — q at which the
//                      end-of-tween catch-up boost begins.  In v0.6.11
//                      this equals END_BLEND_START, so the entire end
//                      blend region is boosted.
// END_BOOST_MAX        default 8.0 (hand-tuned in v0.6.11; was 5.0 in
//                      v0.6.10, 3.0 in v0.6.9) — maximum multiplier on
//                      the rate cap at q = 1.  Ramped septic-eased from
//                      1.0 at END_BOOST_START.  8.0 with the 22.5°/s
//                      base gives a worst-case 180°/s allowance at the
//                      final frame, mean ≈ 100°/s across the boost zone
//                      — enough budget to absorb any reasonable
//                      end-blend rotation cleanly.
//
//
// WHAT DISAPPEARED FROM v0.6.4
// ----------------------------
// The entire Dubins solver and sampler: _LSL, _RSR, _LSR, _RSL, _RLR, _LRL,
// _solveDubins, _buildPath, _sampleAt, _sampleSegment, mod2pi, and the
// constants TURN_R_MIN / TURN_R_MAX / TURN_R_FRAC. The cubic Hermite Y
// altitude profile is also gone (the 3D spline subsumes altitude
// naturally). The class is now ~250 lines instead of ~500.
//
//
// WHAT'S DEFERRED
// ---------------
// • Overlapping three-way blend at the seams (q = START_BLEND_END,
//   q = END_BLEND_START) — would make the angular *acceleration* of
//   lookDir strictly continuous across the seam, not just the angular
//   velocity. The current two-way blend is C¹ across the seam in
//   practice and almost certainly invisible.
// • Per-endpoint handle lengths M₀ ≠ M₁ — would let us tune start and
//   end swoopiness independently. Requires a different quintic Hermite
//   basis formulation; only worth it if the current blend-based fix is
//   inadequate for some bookmark configuration.
// • Spherical (slerp) blends instead of lerp+normalize — would be the
//   strictly-correct way to interpolate unit vectors. The visible
//   improvement at sub-180° angles is negligible.
// • Rate-limiting the stationary branch (v0.6.9 deferred) — the stationary
//   tween rotates orbit.target via target-position lerp, not via a
//   direction blend, so applying the rate limiter requires refactoring
//   that branch into direction space. Defer unless a stationary-case
//   spin is reported.
// • Adaptive MAX_ANGULAR_SPEED per tween — scale the cap by the tween
//   duration so short jumps don't bind. Not yet needed given the static
//   base cap + end-boost combination (see TUNING CONSTANTS for current
//   values).
// • Clothoid transitions: the aerospace-faithful approach is "Dubins +
//   clothoid transitions" (G²-continuous path with bounded curvature).
//   For cameras this is overkill — a single C²-continuous spline gives
//   the same perceptual smoothness without Fresnel integrals.
// • Bank/roll from coordinated-turn formula (tan(roll) = v²/(g·R)) — not
//   implemented because OrbitControls doesn't expose camera roll. Future
//   FPV-style camera could add it.
//
//
// REFERENCES (annotated)
// ----------------------
// * Cubic Hermite spline — Wikipedia:
//   https://en.wikipedia.org/wiki/Cubic_Hermite_spline
//   The "Higher-order Hermite interpolation" section covers the quintic
//   generalisation (6 DoF per dimension: position, tangent, and second
//   derivative at each endpoint). Source for the H₀₀ / H₁₀ / H₀₁ / H₁₁
//   basis polynomials and their first-derivative form used inline in
//   `_evalPos` / `_evalTan`.
//
// * Industrial Monitor Direct, "Creating Smooth Cam Profiles with Zero
//   Jerk at Start and End":
//   https://industrialmonitordirect.com/blogs/knowledgebase/creating-smooth-cam-profiles-with-zero-jerk-at-start-and-end
//   Source for the septic time-scaling S(u) = 35u⁴ − 84u⁵ + 70u⁶ − 20u⁷.
//   Establishes 7th order as the minimum degree that simultaneously zeroes
//   position, velocity, acceleration, AND jerk at both endpoints, and
//   documents the peak-velocity trade-off (~2× average velocity for septic).
//
// * Akinwande & Adeoye (AJERD 2022), "Joint Space Robot Arm Trajectory
//   Planning Using Septic Polynomial":
//   https://ajerd.abuad.edu.ng/wp-content/uploads/2022/07/AJERD0501-10.pdf
//   Robotics confirmation: septic polynomials are the canonical choice for
//   "null start and end-point velocities, accelerations, AND jerks."
//
// * Ken Perlin (SIGGRAPH 2002), "Improving Noise" — the C²-continuous
//   quintic smoothstep `10u³ − 15u⁴ + 6u⁵`, used here as a reference
//   point for why the C³-continuous septic version improves the feel.
//
// * Arc-length parameterisation — Wikipedia:
//   https://en.wikipedia.org/wiki/Arc_length
//   Standard technique for traversing parameterised curves at uniform
//   perceived speed. The LUT-based inverse used here is the canonical
//   real-time approximation.
//
// * G²-continuous path planning, clothoids, Dubins limitations —
//   user-supplied advisor note (in-conversation, May 2026). Diagnosed
//   the two independent jerk sources (timing vs. curvature) and
//   prompted the move from G¹ Dubins to a single G² spline. The
//   advisor's "Dubins + clothoid transitions" recommendation is the
//   aerospace-faithful approach; for cameras the simpler 3D quintic
//   Hermite gives equivalent perceptual smoothness.
//
// * Look-ahead orientation + endpoint blends — user-supplied advisor
//   note (in-conversation, May 2026, post-v0.6.6-revert). Diagnosed
//   the residual orientation snap as "the instantaneous spline tangent
//   is the wrong source for the look direction." Prescribed: look-ahead
//   tangent + symmetric endpoint blends + ARC_SAMPLES bump + inline
//   final-frame handling + adaptive Hermite handle length. v0.6.8
//   implements the full prescription minus angular-velocity limiting
//   (deferred as a backstop).
//
// * Angular-rate limiter as the missing backstop — user-supplied
//   advisor note (in-conversation, May 2026, post-v0.6.8). After
//   v0.6.8 still left "too much fast spinning sometimes at the start
//   and the end", the advisor identified that the blends improved
//   the *desired* direction but did not bound how fast it can rotate.
//   Prescribed: stateful _prevLookDir, per-frame clamp at
//   MAX_ANGULAR_SPEED · dt, widened blends. Refined with a soft
//   end-of-tween catch-up zone (cap × septic-eased ramp 1 →
//   END_BOOST_MAX over q ∈ [END_BOOST_START, 1]) so the
//   rate-limited direction converges to d₁ before the final-frame
//   hard-set — no residual snap. v0.6.9 implements both the rate
//   limiter and the catch-up zone; v0.6.10 and v0.6.11 successively
//   hand-tune the four knobs (base cap, end-blend boundary, boost
//   start, boost max) toward a very gentle cruise + long aggressive
//   end catch-up.  See TUNING CONSTANTS for the authoritative current
//   values.
// =============================================================================

import * as THREE from 'three'

const EPS = 1e-6

// Hermite handle length as a fraction of chord — controls how "swoopy" the
// curve is. Range 0.25..0.5 is the canonical sweet spot. v0.6.8 scales
// this down adaptively when the start/end look directions diverge strongly
// from the chord direction (see the adaptive handle calculation in the
// constructor).
const HANDLE_FRAC = 0.4

// Arc-length LUT resolution. v0.6.8 raised this from 64 to 256: position
// is forgiving (sub-pixel even at 64), but the orientation derived from
// the look-ahead direction is more sensitive — coarse arc-length inverses
// produce small parameter steps that are visible in the look direction
// even when they are invisible in the position.
const ARC_SAMPLES = 256

// Endpoint look-direction blend bounds, expressed in q (the time-warped
// parameter).  The orientation policy is:
//
//   0 .. START_BLEND_END:                d₀          → pathLookDir
//   START_BLEND_END .. END_BLEND_START:  pathLookDir              (cruise)
//   END_BLEND_START .. 1:                pathLookDir → d₁
//
// Both blend weights are eased with septic() so the weight reaches its
// endpoint with zero derivative.  Successive widening (v0.6.9: 0.20→0.30
// and 0.75→0.60; v0.6.11: 0.60→0.40) reduces the peak desired angular
// rate that the rate limiter has to clamp — a wider blend window means
// a gentler blend.  With v0.6.11's values, the cruise is only ~10% of q
// and the end blend is 60%, giving the rate-limited direction a long
// runway to converge to d₁.
const START_BLEND_END = 0.30
const END_BLEND_START = 0.40

// Look-ahead distance bounds for the path-look direction.  Capping by path
// length on BOTH sides matters: short transitions with a large lookDist
// would otherwise let LOOKAHEAD_D_FRAC * lookDist dominate and clamp the
// look-ahead point to the end of the path almost immediately, which would
// reintroduce the endpoint bias that the blends are trying to fix.
//
//   lookaheadDist = clamp( LOOKAHEAD_D_FRAC * lookDist,
//                          LOOKAHEAD_S_MIN_FRAC * _L,
//                          LOOKAHEAD_S_MAX_FRAC * _L )
const LOOKAHEAD_S_MIN_FRAC = 0.05   // floor: 5% of total arc length
const LOOKAHEAD_S_MAX_FRAC = 0.20   // cap:   20% of total arc length
const LOOKAHEAD_D_FRAC     = 0.25   // nominal: 25% of current orbit distance

// Angular-rate limiter (v0.6.9).  The v0.6.8 look-ahead + endpoint blends
// produce a "desired" look direction per frame; the rate limiter caps how
// far the *actual* look direction is allowed to rotate toward the desired
// one in any single frame.  Spillover catches up on subsequent frames.
//
// The advisor's range was 60–120°/s; hand-tuning has driven this far
// lower (22.5°/s as of v0.6.11) paired with an early + aggressive
// end-of-tween boost (below).  A low base cap makes the cruise feel
// gentle and deliberate; the boost guarantees convergence to d₁ before
// the final-frame hard-set even at this low base.
const MAX_ANGULAR_SPEED = THREE.MathUtils.degToRad(22.5)   // rad/sec

// Soft end-of-tween catch-up zone (v0.6.9).  Past END_BOOST_START, the
// rate cap is multiplied by a factor that ramps 1 → END_BOOST_MAX using
// septic easing, so the rate-limited direction has enough budget to
// converge to d₁ before the final-frame hard-set fires.  Without this
// boost, large end-blend rotations would leave a residual at the boundary
// that the user would perceive as a snap.
const END_BOOST_START = 0.40
const END_BOOST_MAX   = 8.0

// Septic smoothstep — C³ at both ends (zero position, velocity, acceleration,
// AND jerk at u=0 and u=1). The minimum-degree polynomial with this property.
//
//   S(u)   =  35u⁴ −  84u⁵ + 70u⁶ − 20u⁷       (Horner: u⁴·(35 + u·(−84 + u·(70 − 20u))))
//   S'(u)  = 140u³(1 − u)³                      ⇒ S'(0)  = S'(1)  = 0
//   S''(u) = piecewise polynomial               ⇒ S''(0) = S''(1) = 0
//   S'''   = piecewise polynomial               ⇒ S'''(0) = S'''(1) = 0
const septic = (u) => {
  const u4 = u * u * u * u
  return u4 * (35 + u * (-84 + u * (70 - 20 * u)))
}

// Scratch vectors reused across frames to avoid per-tick allocations.
// v0.6.8 added _pAhead and _lookDir for the look-ahead + blend logic.
const _t3      = new THREE.Vector3()
const _pAhead  = new THREE.Vector3()
const _lookDir = new THREE.Vector3()

export class CameraPath {
  constructor({ camera, orbit, from, to, duration = 2.0, onComplete } = {}) {
    this.camera     = camera
    this.orbit      = orbit
    this.duration   = Math.max(0.001, duration)
    this.elapsed    = 0
    this.onComplete = onComplete
    this.done       = false

    this._fromPos = new THREE.Vector3(from.px, from.py, from.pz)
    this._toPos   = new THREE.Vector3(to.px,   to.py,   to.pz)
    this._fromTarget = new THREE.Vector3(from.tx, from.ty, from.tz)
    this._toTarget   = new THREE.Vector3(to.tx,   to.ty,   to.tz)

    // 3D look directions and orbit radii at the endpoints
    const lookStart = new THREE.Vector3().subVectors(this._fromTarget, this._fromPos)
    this._startDist = Math.max(EPS, lookStart.length())
    this._d0 = lookStart.clone().divideScalar(this._startDist)

    const lookEnd = new THREE.Vector3().subVectors(this._toTarget, this._toPos)
    this._endDist = Math.max(EPS, lookEnd.length())
    this._d1 = lookEnd.clone().divideScalar(this._endDist)

    // Previous frame's actual look direction (v0.6.9).  Initialised to d₀
    // so the first tick (q ≈ 0, lookDir ≈ d₀) sees zero angular distance
    // and the rate limiter does not bind from a stale prev value.
    this._prevLookDir = this._d0.clone()

    const chord = new THREE.Vector3().subVectors(this._toPos, this._fromPos)
    const chordLen = chord.length()

    if (chordLen < EPS) {
      // Stationary bookmark — same XZ/Y position. Camera doesn't move; only
      // the orbit.target rotates from fromTarget → toTarget over the duration.
      this._stationary = true
      return
    }
    this._stationary = false

    // ── Adaptive Hermite handle length (v0.6.8) ──────────────────────────
    // A fixed HANDLE_FRAC * chordLen produces aggressive curvature
    // concentration near the endpoints when d₀ or d₁ diverges strongly
    // from the chord direction — and that's exactly the geometry that
    // forces the look-ahead direction to rotate hardest just inside the
    // blend regions. Scale the handle length down toward 0.5× of nominal
    // at the orthogonal/reversed extreme. The blends in tick() are the
    // primary fix for the snap; this just gives the look-ahead direction
    // a gentler curve to track in the cruise region.
    const chordDir = chord.clone().divideScalar(chordLen)
    // 0 = aligned with chord, 1 = orthogonal-or-reversed (the Math.max(0, …)
    // clamp folds the back-half of the dot product onto the front half, so
    // "reversed" reads the same as "orthogonal" for handle-scaling purposes).
    const divergence0 = 1 - Math.max(0, this._d0.dot(chordDir))
    const divergence1 = 1 - Math.max(0, this._d1.dot(chordDir))
    const maxDiv = Math.max(divergence0, divergence1)
    // handleScale: 1.0 when aligned, 0.5 when orthogonal/reversed
    const handleScale = 1 - 0.5 * Math.min(1, maxDiv)
    this._M = HANDLE_FRAC * chordLen * handleScale   // Hermite handle length

    // ── Build the arc-length lookup table ────────────────────────────────
    // Sample the spline at N+1 evenly-spaced u values, cumulate Euclidean
    // distances between consecutive samples to get arc lengths at each u.
    const N = ARC_SAMPLES
    this._lutU = new Float32Array(N + 1)
    this._lutS = new Float32Array(N + 1)

    const tmp = new THREE.Vector3()
    const prev = new THREE.Vector3()
    this._evalPos(0, prev)
    this._lutU[0] = 0
    this._lutS[0] = 0
    for (let i = 1; i <= N; i++) {
      const u = i / N
      this._evalPos(u, tmp)
      this._lutS[i] = this._lutS[i - 1] + tmp.distanceTo(prev)
      this._lutU[i] = u
      prev.copy(tmp)
    }
    this._L = this._lutS[N]   // total arc length of the spline
  }

  // ── Spline position p(u) ─────────────────────────────────────────────────
  // p(u) = H₀₀(u)·p₀ + H₁₀(u)·M·d₀ + H₀₁(u)·p₁ + H₁₁(u)·M·d₁
  _evalPos(u, out) {
    const u2 = u * u
    const u3 = u2 * u
    const u4 = u3 * u
    const u5 = u4 * u
    const h00 = 1 - 10 * u3 + 15 * u4 - 6 * u5
    const h10 =     u  - 6 * u3 +  8 * u4 - 3 * u5
    const h01 =          10 * u3 - 15 * u4 + 6 * u5
    const h11 =          -4 * u3 +  7 * u4 - 3 * u5
    const Md0x = this._M * this._d0.x, Md0y = this._M * this._d0.y, Md0z = this._M * this._d0.z
    const Md1x = this._M * this._d1.x, Md1y = this._M * this._d1.y, Md1z = this._M * this._d1.z
    out.set(
      h00 * this._fromPos.x + h10 * Md0x + h01 * this._toPos.x + h11 * Md1x,
      h00 * this._fromPos.y + h10 * Md0y + h01 * this._toPos.y + h11 * Md1y,
      h00 * this._fromPos.z + h10 * Md0z + h01 * this._toPos.z + h11 * Md1z,
    )
    return out
  }

  // ── Spline tangent p'(u) (unnormalised) ──────────────────────────────────
  // p'(u) = H'₀₀(u)·p₀ + H'₁₀(u)·M·d₀ + H'₀₁(u)·p₁ + H'₁₁(u)·M·d₁
  _evalTan(u, out) {
    const u2 = u * u
    const u3 = u2 * u
    const u4 = u3 * u
    const dh00 =      -30 * u2 + 60 * u3 - 30 * u4
    const dh10 = 1   - 18 * u2 + 32 * u3 - 15 * u4
    const dh01 =       30 * u2 - 60 * u3 + 30 * u4
    const dh11 =      -12 * u2 + 28 * u3 - 15 * u4
    const Md0x = this._M * this._d0.x, Md0y = this._M * this._d0.y, Md0z = this._M * this._d0.z
    const Md1x = this._M * this._d1.x, Md1y = this._M * this._d1.y, Md1z = this._M * this._d1.z
    out.set(
      dh00 * this._fromPos.x + dh10 * Md0x + dh01 * this._toPos.x + dh11 * Md1x,
      dh00 * this._fromPos.y + dh10 * Md0y + dh01 * this._toPos.y + dh11 * Md1y,
      dh00 * this._fromPos.z + dh10 * Md0z + dh01 * this._toPos.z + dh11 * Md1z,
    )
    return out
  }

  // ── Arc length → spline parameter (LUT inverse, binary search) ──────────
  _uForArcLength(s) {
    const lutS = this._lutS
    if (s <= 0) return 0
    if (s >= this._L) return 1
    let lo = 0
    let hi = lutS.length - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (lutS[mid] <= s) lo = mid
      else                hi = mid
    }
    const span = lutS[hi] - lutS[lo]
    const frac = span > EPS ? (s - lutS[lo]) / span : 0
    return this._lutU[lo] + frac * (this._lutU[hi] - this._lutU[lo])
  }

  tick(dt) {
    if (this.done) return
    this.elapsed += dt
    const t = this.elapsed

    if (this._stationary) {
      // Degenerate path — just rotate orbit.target with septic easing
      const k = septic(Math.min(1, t / this.duration))
      this.orbit.target.copy(this._fromTarget).lerp(this._toTarget, k)
      this.camera.position.copy(this._fromPos)
      if (t >= this.duration) this._finish()
      return
    }

    if (t >= this.duration) {
      // Final-frame handling (v0.6.8). The path's u=1 point is exactly
      // toPos by construction (Hermite endpoint constraint), and the end
      // blend at q=1 is exactly d₁ (septic(1) = 1), so the live evaluation
      // and the hard-set values agree at the boundary. We set them inline
      // here (instead of going through _finish) so that there is no
      // possibility of a one-frame stale-state blip between the last live
      // tick (at, say, q = 0.985) and the _finish call.
      this.camera.position.copy(this._toPos)
      this.orbit.target.copy(this._toTarget)
      this.done = true
      this.onComplete?.()
      return
    }

    // 1. Time → arc-length fraction via septic (zero-jerk endpoints)
    const q = septic(t / this.duration)
    const targetS = q * this._L

    // 2. Arc length → spline parameter via the precomputed LUT
    const u = this._uForArcLength(targetS)

    // 3. Evaluate spline position at this u
    this._evalPos(u, this.camera.position)

    // 4. Path look direction via look-ahead (v0.6.8).
    //    Instead of using the instantaneous spline tangent p'(u), aim at
    //    a point a short distance further along the path. This anticipates
    //    the curve and removes the short-term tangent wobble that produced
    //    the orientation snap. Cap the look-ahead distance on both sides
    //    by path length so that on short transitions the look-ahead does
    //    not collapse into "look at the endpoint."
    const lookDist = this._startDist + q * (this._endDist - this._startDist)
    const lookaheadDist = Math.min(
      LOOKAHEAD_S_MAX_FRAC * this._L,
      Math.max(LOOKAHEAD_S_MIN_FRAC * this._L, LOOKAHEAD_D_FRAC * lookDist),
    )
    const sAhead = Math.min(this._L, targetS + lookaheadDist)
    const uAhead = this._uForArcLength(sAhead)
    this._evalPos(uAhead, _pAhead)

    // pathLookDir is an alias for _t3 (same Vector3 instance) — the
    // subsequent normalize() / fallback mutate the scratch vector in place.
    const pathLookDir = _t3.subVectors(_pAhead, this.camera.position)
    // Check magnitude BEFORE normalising: Three.js's .normalize() of a
    // tiny vector replaces it with (0,0,0) via safe-divide, so the
    // post-normalize lengthSq is 0 or 1 — not the original input
    // magnitude. A post-normalize check would be unreliable.
    if (pathLookDir.lengthSq() < EPS * EPS) {
      // Tight curve or numerical edge — fall back to the raw spline
      // tangent so we never feed a near-zero vector into the blends.
      this._evalTan(u, pathLookDir).normalize()
    } else {
      pathLookDir.normalize()
    }

    // 5. Symmetric endpoint blends (v0.6.8).
    //    Anchor the look direction exactly at the saved bookmark poses by
    //    blending d₀ → pathLookDir over the first START_BLEND_END of q,
    //    and pathLookDir → d₁ from END_BLEND_START to 1. In the cruise
    //    region between, lookDir is exactly the path's look-ahead direction.
    const lookDir = _lookDir.copy(pathLookDir)
    if (q < START_BLEND_END) {
      const a = q / START_BLEND_END
      const k = septic(a)
      lookDir.lerpVectors(this._d0, pathLookDir, k).normalize()
    } else if (q > END_BLEND_START) {
      const a = (q - END_BLEND_START) / (1 - END_BLEND_START)
      const k = septic(a)
      lookDir.lerpVectors(pathLookDir, this._d1, k).normalize()
    }

    // 5b. Angular-rate limiter with soft end-of-tween catch-up (v0.6.9).
    //     The blends above give us the "desired" look direction this frame.
    //     Cap how far the actual look direction is allowed to rotate from
    //     the previous frame; any spillover catches up on subsequent
    //     frames.  Past END_BOOST_START, multiply the cap by a septic-eased
    //     factor ramping 1 → END_BOOST_MAX so the rate-limited direction
    //     converges cleanly to d₁ before the final-frame hard-set fires —
    //     no residual snap.
    const endBoost = q > END_BOOST_START
      ? THREE.MathUtils.lerp(
          1,
          END_BOOST_MAX,
          septic((q - END_BOOST_START) / (1 - END_BOOST_START)),
        )
      : 1
    const maxAngle = MAX_ANGULAR_SPEED * endBoost * dt
    const angle    = this._prevLookDir.angleTo(lookDir)
    if (angle > maxAngle && angle > EPS) {
      const k = maxAngle / angle
      lookDir.lerpVectors(this._prevLookDir, lookDir, k).normalize()
    }
    this._prevLookDir.copy(lookDir)

    // 6. orbit.target = position + lookDir · lookDist.
    //    Lerping lookDist by q (arc-length fraction) rather than u keeps
    //    the orbit-radius change perceptually uniform alongside the motion.
    this.orbit.target.copy(this.camera.position).addScaledVector(lookDir, lookDist)
  }

  _finish() {
    this.camera.position.copy(this._toPos)
    this.orbit.target.copy(this._toTarget)
    this.done = true
    this.onComplete?.()
  }

  cancel() {
    if (this.done) return
    this.done = true
    this.onComplete?.()
  }
}
