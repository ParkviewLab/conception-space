// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Gary Frattarola <garyf@parkviewlab.ai>
/**
 * Parse a conception-space source string into scene data.
 *
 * Grammar (v0):
 *   node <id> ( [shape=<shape>] [locus=[<x>,<y>,<z>]] [label="<text>"] [color=<color>] [size=<n>] [file="<path>"] )
 *   edge <from> -> <to> ( ["<label>"] [color=<color>] [thickness=<n>] )
 *   cluster <id> ( [label="<text>"] [N=<n>] [locus=[<x>,<y>,<z>]] [color=<color>] [brightness=<n>] [tube_color=<color>] [tube_thickness=<n>] ) {
 *     node/edge/cluster ...
 *   }
 *   commonality <id> ( [label="<text>"] [color=<color>] [shape=<shape>] ) { <member-id>, <member-id>, ... }
 *   # comment
 *
 * `commonality` is file-scope only (rejected inside a cluster).  The
 * member list permits whitespace and newlines inside the braces.
 *
 * Color formats: #RGB  #RRGGBB  #RGBA  #RRGGBBAA  rgb[r,g,b]  rgba[r,g,b,a]
 *   r/g/b/a are 0.0–1.0 floats.  Alpha drives node material opacity.
 */

const SHAPES = new Set([
  'sphere', 'cylinder',
  'cube', 'tetrahedron', 'octahedron', 'dodecahedron', 'icosahedron',
])

const DEFAULT_COLOR = '#BFBFBF'

const NODE_RE         = /^node\s+(\w+)\s*\(([^)]*)\)/
const KV_RE           = /(\w+)=("(?:[^"]*)"|\[[^\]]*\]|[^\s)]+)/g
const EDGE_RE         = /^edge\s+(\w+)\s+->\s+(\w+)\s*\(([^)]*)\)/
const GROUP_RE        = /^cluster\s+(\w+)\s*\(([^)]*)\)\s*\{/
const COMMONALITY_RE  = /^commonality\s+(\w+)\s*\(([^)]*)\)\s*\{(.*)$/

// Returns { hex: '#RRGGBB', alpha: 0–1 } or null
function parseColor(str) {
  if (!str) return null

  const hex = /^#([0-9a-fA-F]{3,8})$/.exec(str)
  if (hex) {
    const h = hex[1]
    if (h.length === 8) return { hex: '#' + h.slice(0, 6), alpha: parseInt(h.slice(6), 16) / 255 }
    if (h.length === 4) return { hex: '#' + h.slice(0, 3), alpha: parseInt(h[3] + h[3], 16) / 255 }
    return { hex: str, alpha: 1 }
  }

  const fn = /^rgba?\[\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\]$/.exec(str)
  if (fn) {
    const ch = v => Math.round(parseFloat(v) * 255).toString(16).padStart(2, '0')
    return {
      hex:   '#' + ch(fn[1]) + ch(fn[2]) + ch(fn[3]),
      alpha: fn[4] !== undefined ? parseFloat(fn[4]) : 1,
    }
  }

  return null
}

// Split a commonality's accumulated `membersText` on commas, trim each
// token, drop empties (trailing commas, whitespace), and push the
// resulting commonality onto the array.  Caller has already parsed
// attributes; this just finalises the member list.
function finalizeCommonality(p, commonalities) {
  const members = p.membersText
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0)
  commonalities.push({
    id: p.id, label: p.label, color: p.color, shape: p.shape, members,
    _lineno: p.lineno,
  })
}

/**
 * @param {string} source
 * @returns {{ nodes: object[], edges: object[], groups: object[], commonalities: object[], errors: string[] }}
 */
export function parseCS(source) {
  const nodes         = []
  const edges         = []
  const groups        = []
  const commonalities = []
  const errors        = []
  const groupStack    = []   // stack of open groups; top = innermost
  let   pending       = null // multi-line commonality in progress: { id, label, color, style, membersText, lineno }

  for (const [i, raw] of source.split('\n').entries()) {
    const lineno = i + 1

    // Multi-line commonality continuation: accumulate raw lines (preserving
    // commas) until we see the closing `}`.  This runs BEFORE the empty/comment
    // skip so blank lines inside the brace list are tolerated harmlessly.
    if (pending) {
      const closeIdx = raw.indexOf('}')
      if (closeIdx >= 0) {
        pending.membersText += ' ' + raw.slice(0, closeIdx)
        finalizeCommonality(pending, commonalities)
        pending = null
        const remainder = raw.slice(closeIdx + 1).trim()
        if (remainder && !remainder.startsWith('#')) {
          errors.push(`line ${lineno}: unexpected content after commonality close: "${remainder}"`)
        }
      } else {
        pending.membersText += ' ' + raw
      }
      continue
    }

    const line = raw.trim()
    if (!line || line.startsWith('#')) continue

    if (line.startsWith('commonality ')) {
      if (groupStack.length > 0) {
        errors.push(`line ${lineno}: commonality must be at file scope, not inside a cluster`)
        continue
      }
      const m = COMMONALITY_RE.exec(line)
      if (!m) { errors.push(`line ${lineno}: cannot parse commonality — expected: commonality <id> ( attrs ) { id, id, ... }`); continue }

      const id        = m[1]
      const attrsStr  = m[2]
      const afterOpen = m[3]

      let label = id, color = null, shape = 'sphere'
      for (const [, key, val] of attrsStr.matchAll(KV_RE)) {
        switch (key) {
          case 'label':
            label = val.startsWith('"') ? val.slice(1, -1) : val
            break
          case 'color':
            color = parseColor(val)?.hex ?? null
            if (color === null) errors.push(`line ${lineno}: invalid commonality color "${val}"`)
            break
          case 'shape':
            if (!SHAPES.has(val)) errors.push(`line ${lineno}: unknown shape "${val}", using sphere`)
            else shape = val
            break
          default:
            errors.push(`line ${lineno}: unknown commonality attribute "${key}"`)
        }
      }

      const closeIdx = afterOpen.indexOf('}')
      if (closeIdx >= 0) {
        // Single-line form.
        const membersText = afterOpen.slice(0, closeIdx)
        finalizeCommonality({ id, label, color, shape, membersText, lineno }, commonalities)
        const remainder = afterOpen.slice(closeIdx + 1).trim()
        if (remainder && !remainder.startsWith('#')) {
          errors.push(`line ${lineno}: unexpected content after commonality close: "${remainder}"`)
        }
      } else {
        // Multi-line form: start accumulating until the closing `}`.
        pending = { id, label, color, shape, membersText: afterOpen, lineno }
      }

    } else if (line.startsWith('cluster ')) {
      const m = GROUP_RE.exec(line)
      if (!m) { errors.push(`line ${lineno}: cannot parse cluster`); continue }

      let label = m[1], N = 2, gx = 0, gy = 0, gz = 0, color = null, brightness = 1, tubeColor = null, tubeThickness = null
      for (const [, key, val] of m[2].matchAll(KV_RE)) {
        switch (key) {
          case 'label':
            label = val.startsWith('"') ? val.slice(1, -1) : val
            break
          case 'N':
            N = parseInt(val)
            break
          case 'locus': {
            const c = val.slice(1, -1).split(',').map(s => parseFloat(s.trim()))
            if (c.length === 3 && c.every(n => !isNaN(n))) { [gx, gy, gz] = c }
            else errors.push(`line ${lineno}: locus needs 3 numeric values, got "${val}"`)
            break
          }
          case 'color':
            color = parseColor(val)?.hex ?? null
            if (color === null) errors.push(`line ${lineno}: invalid group color "${val}"`)
            break
          case 'brightness':
            brightness = parseFloat(val)
            break
          case 'tube_color': {
            const tc = parseColor(val)
            if (!tc) errors.push(`line ${lineno}: invalid tube_color "${val}"`)
            else tubeColor = tc.hex
            break
          }
          case 'tube_thickness':
            tubeThickness = parseFloat(val) || null
            break
          default:
            errors.push(`line ${lineno}: unknown cluster attribute "${key}"`)
        }
      }

      const parent = groupStack.at(-1) ?? null
      const group  = { id: m[1], label, N, x: gx, y: gy, z: gz, color, brightness, tubeColor, tubeThickness, parentId: parent?.id ?? null }
      groups.push(group)
      groupStack.push(group)

    } else if (line === '}') {
      if (groupStack.length === 0) errors.push(`line ${lineno}: } without matching cluster`)
      else groupStack.pop()

    } else if (line.startsWith('node ')) {
      const m = NODE_RE.exec(line)
      if (!m) { errors.push(`line ${lineno}: cannot parse node — expected: node <id> ( key=value ... )`); continue }

      let shape = 'sphere', x = 0, y = 0, z = 0, label = m[1], size = 1, colorParsed = null, file = null

      for (const [, key, val] of m[2].matchAll(KV_RE)) {
        switch (key) {
          case 'shape':
            if (!SHAPES.has(val)) { errors.push(`line ${lineno}: unknown shape "${val}", using sphere`); break }
            shape = val
            break
          case 'locus': {
            const c = val.slice(1, -1).split(',').map(s => parseFloat(s.trim()))
            if (c.length === 3 && c.every(n => !isNaN(n))) { [x, y, z] = c }
            else errors.push(`line ${lineno}: locus needs 3 numeric values, got "${val}"`)
            break
          }
          case 'label':
            label = val.startsWith('"') ? val.slice(1, -1) : val
            break
          case 'color':
            colorParsed = parseColor(val)
            if (!colorParsed) errors.push(`line ${lineno}: invalid color "${val}"`)
            break
          case 'size':
            size = parseFloat(val)
            break
          case 'file':
            file = val.startsWith('"') ? val.slice(1, -1) : val
            break
          default:
            errors.push(`line ${lineno}: unknown node attribute "${key}"`)
        }
      }

      nodes.push({
        id: m[1], shape, x, y, z, label, size,
        color: colorParsed?.hex  ?? DEFAULT_COLOR,
        alpha: colorParsed?.alpha ?? 1,
        groupId: groupStack.at(-1)?.id ?? null,
        file,
      })

    } else if (line.startsWith('edge ')) {
      const m = EDGE_RE.exec(line)
      if (!m) { errors.push(`line ${lineno}: cannot parse edge — expected: edge <from> -> <to> ( ... )`); continue }

      let label = '', color = null, thickness = null
      const inner = m[3]

      const labelM = /"([^"]*)"/.exec(inner)
      if (labelM) label = labelM[1]

      for (const [, key, val] of inner.matchAll(KV_RE)) {
        switch (key) {
          case 'color':
            color = parseColor(val)?.hex ?? null
            if (color === null) errors.push(`line ${lineno}: invalid edge color "${val}"`)
            break
          case 'thickness':
            thickness = parseFloat(val)
            break
          default:
            errors.push(`line ${lineno}: unknown edge attribute "${key}"`)
        }
      }

      edges.push({ from: m[1], to: m[2], label, color, thickness })

    } else {
      errors.push(`line ${lineno}: unrecognised statement`)
    }
  }

  // Unclosed multi-line commonality at EOF.
  if (pending) {
    errors.push(`line ${pending.lineno}: commonality "${pending.id}" missing closing }`)
    finalizeCommonality(pending, commonalities)
    pending = null
  }

  // Validate commonality members against the parsed node set.  Unknown
  // ids are stripped and warned; the rest of the commonality renders.
  const nodeIds = new Set(nodes.map(n => n.id))
  for (const c of commonalities) {
    const valid = []
    for (const memberId of c.members) {
      if (nodeIds.has(memberId)) valid.push(memberId)
      else errors.push(`line ${c._lineno}: commonality "${c.id}" references unknown node "${memberId}" — skipped`)
    }
    c.members = valid
    delete c._lineno
  }

  return { nodes, edges, groups, commonalities, errors }
}
