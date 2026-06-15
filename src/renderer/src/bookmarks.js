// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Gary Frattarola <garyf@parkviewlab.ai>
// View-bookmark store for the current .cns file.
//
// Persisted to a JSON5 sidecar (foo.cns → foo.views.json5). Reads use the
// `json5` package so users can hand-edit freely (comments, trailing commas,
// unquoted keys). Writes use a hand-built serializer below so the documenting
// header / per-field comments reappear every time the app rewrites the file.
//
// Per-bookmark comments a user adds inside the array are NOT preserved on
// rewrite — known v1 tradeoff. The header always survives.

import JSON5 from 'json5'

let _bookmarks = []   // [{ name, camera, fogDensity, … }]

// Read sidecar from disk (Electron only). Browser dev shim has no sidecar;
// bookmark state lives only in memory for that session.
export async function loadBookmarks() {
  _bookmarks = []
  if (!window.cs) return
  const r = await window.cs.readSidecar('views')
  if (r?.error || !r?.content) return
  try {
    const data = JSON5.parse(r.content)
    if (data.version === 1 && Array.isArray(data.bookmarks)) {
      _bookmarks = data.bookmarks
    }
  } catch (e) {
    console.warn('[bookmarks] sidecar parse failed:', e.message)
  }
}

async function persist() {
  if (!window.cs) return
  const r = await window.cs.writeSidecar('views', _serialize(_bookmarks))
  if (r?.error) console.warn('[bookmarks] save failed:', r.error)
}

// Hand-built JSON5 emitter — stable comments, deterministic field order.
function _serialize(bookmarks) {
  const lines = [
    '// conception-space view bookmarks',
    '// Sidecar for the matching .cns file. Safe to hand-edit and commit to git.',
    '//',
    '// Each bookmark captures a named viewpoint plus the HUD/atmosphere state',
    '// that was in effect when it was saved. "Go to bookmark" snaps the HUD',
    '// state instantly and then glides the camera over ~2 s.',
    '',
    '{',
    '  version: 1,',
    '  bookmarks: [',
  ]
  for (const b of bookmarks) {
    const c = b.camera ?? {}
    lines.push(
      '    {',
      `      name: ${JSON.stringify(b.name)},`,
      `      // Camera position + orbit target (world coordinates)`,
      `      camera: { px: ${_num(c.px)}, py: ${_num(c.py)}, pz: ${_num(c.pz)}, tx: ${_num(c.tx)}, ty: ${_num(c.ty)}, tz: ${_num(c.tz)} },`,
      `      // Atmosphere / HUD`,
      `      fogDensity:       ${_num(b.fogDensity)},`,
      `      gridBrightness:   ${_num(b.gridBrightness)},`,
      `      ambientIntensity: ${_num(b.ambientIntensity)},`,
      `      labelsVisible:    ${b.labelsVisible === true},`,
      `      // Group IDs currently rendered as solid spheres`,
      `      solidGroups: ${JSON.stringify(b.solidGroups ?? [])},`,
      '    },',
    )
  }
  lines.push('  ],', '}', '')
  return lines.join('\n')
}

// Format numbers compactly without trailing junk
function _num(n) {
  if (typeof n !== 'number' || !isFinite(n)) return 0
  // 4 decimal places keeps camera coords readable; trim trailing zeros
  return parseFloat(n.toFixed(4))
}

// ── Public API ────────────────────────────────────────────────────────────────

export function list()      { return _bookmarks.slice() }
export function get(name)   { return _bookmarks.find(b => b.name === name) }
export function has(name)   { return _bookmarks.some(b => b.name === name) }
export function isEmpty()   { return _bookmarks.length === 0 }
export function clearAll()  { _bookmarks = [] }

// Save (or overwrite) a bookmark by name. `state` is the captured-view shape.
export async function save(name, state) {
  const entry = { name, ...state }
  const i = _bookmarks.findIndex(b => b.name === name)
  if (i >= 0) _bookmarks[i] = entry
  else        _bookmarks.push(entry)
  await persist()
}

export async function remove(name) {
  const before = _bookmarks.length
  _bookmarks = _bookmarks.filter(b => b.name !== name)
  if (_bookmarks.length !== before) await persist()
}
