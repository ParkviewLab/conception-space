#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# SPDX-FileCopyrightText: 2026 Gary Frattarola <garyf@parkviewlab.ai>
"""
generate_test1000.py — synthetic test scene with ~1090 nodes AND edges.

Usage:
    python3 generate_test1000.py > ../src/renderer/public/examples/test1000.cns

Structure (4-level deep at protein_complex → active_site → binding_pocket):

  test_universe/
    protein_complex/                   180 nodes, ~205 edges
      alpha_helix/        56 — helix backbone + (every-other) i→i+3 H-bonds
      beta_sheet/         60 — strand backbones + cross-strand H-bonds
      active_site/        20 free + binding_pocket subgroup
        binding_pocket/   30 — inner sphere, sparse bonds
      14 free cofactors — each linked to a backbone node

    stellar_neighborhood/              260 nodes, ~264 edges
      star_sol (1)
      inner_system/       78 — 6 concentric rings, ring + spoke edges
      outer_system/      120 — 5 concentric rings, ring edges
      asteroid_belt/      60 — single ring with ring edges

    globular_cluster/                  240 nodes, ~35 edges
      core_region/       120 — Fibonacci sphere, no edges (too dense)
      halo_region/       100 — sparse constellation k-NN edges
      20 free outliers

    crystal_lattice/                   200 nodes, ~175 edges
      unit_cell_a–d/   4×37 — hex honeycomb cells, distance-based bonds
      ionic_bridge/       48 — inner sphere connecting cells
      6 free lattice pivots — links from bridge to pivots

    nebula_cloud/                      210 nodes, ~20 edges
      dense_core/         90
      outer_shell/        90
      30 free mid-scatter — sparse filament edges
"""

import math
import sys

# ─── State ────────────────────────────────────────────────────────────────────
lines = []
node_count = [0]
edge_count = [0]
node_sizes = {}      # id → size, used to clamp edge thickness ≤ 0.5 × min(endpoint sizes)
clamped_edges = [0]  # count of edges whose requested thickness was clamped down


def w(s): lines.append(s)
def r2(x): return round(x, 2)


# ─── Coordinate generators ────────────────────────────────────────────────────

def fibonacci_sphere(n, radius):
    phi = math.pi * (3 - math.sqrt(5))
    pts = []
    for i in range(n):
        y = (1 - (i / (n - 1)) * 2) if n > 1 else 0
        rr = math.sqrt(max(0, 1 - y * y))
        t = phi * i
        pts.append((r2(math.cos(t) * rr * radius),
                    r2(y * radius),
                    r2(math.sin(t) * rr * radius)))
    return pts


def ring(n, radius, wobble=0.5):
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        pts.append((r2(radius * math.cos(a)),
                    r2(wobble * math.sin(3 * a + 0.3)),
                    r2(radius * math.sin(a))))
    return pts


def helix_pts(n, radius, pitch_total):
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / 3.6
        y = r2((i / (n - 1)) * pitch_total - pitch_total / 2) if n > 1 else 0
        pts.append((r2(radius * math.cos(t)), y, r2(radius * math.sin(t))))
    return pts


def beta_sheet_pts(n_strands, strand_len, spacing):
    pts = []
    for s in range(n_strands):
        for r in range(strand_len):
            x = r2((s - n_strands / 2.0) * spacing)
            z = r2((r - strand_len / 2.0) * spacing * 1.5)
            y = r2(0.5 * (1 if r % 2 == 0 else -1))
            pts.append((x, y, z))
    return pts


def honeycomb_pts(rings_n):
    a = 2.5
    seen, pts = set(), []
    for q in range(-rings_n, rings_n + 1):
        for rv in range(-rings_n, rings_n + 1):
            s = -q - rv
            if abs(q) <= rings_n and abs(rv) <= rings_n and abs(s) <= rings_n:
                x = r2(a * (q + rv / 2.0))
                z = r2(a * rv * math.sqrt(3) / 2.0)
                y = r2(0.15 * math.sin(x * 0.8) * math.cos(z * 0.8))
                key = (x, z)
                if key not in seen:
                    seen.add(key)
                    pts.append((x, y, z))
    return pts


def dist3(p1, p2):
    return math.sqrt((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2 + (p1[2]-p2[2])**2)


# ─── Emitters ─────────────────────────────────────────────────────────────────

def nd(nid, shape, x, y, z, color, size=1.0, label=None, indent=4):
    node_count[0] += 1
    node_sizes[nid] = size
    lbl = label or nid
    sp = ' ' * indent
    return f'{sp}node {nid} ( shape={shape} locus=[{x},{y},{z}] label="{lbl}" color={color} size={size} )'


def eg(a, b, color=None, thickness=None, label=None, indent=4):
    """Emit an edge, clamping `thickness` so the edge diameter never exceeds
    half the diameter of the smaller of its two endpoint nodes."""
    edge_count[0] += 1
    if thickness is not None:
        sa = node_sizes.get(a, 1.0)
        sb = node_sizes.get(b, 1.0)
        max_thick = round(0.5 * min(sa, sb), 2)
        if thickness > max_thick:
            clamped_edges[0] += 1
            thickness = max_thick
    sp = ' ' * indent
    parts = []
    if label is not None: parts.append(f'"{label}"')
    if color: parts.append(f'color={color}')
    if thickness is not None: parts.append(f'thickness={thickness}')
    inner = ' '.join(parts)
    return f'{sp}edge {a} -> {b} ( {inner} )' if inner else f'{sp}edge {a} -> {b} ()'


def emit_ring_edges(prefix, start, count, color, thickness=0.5, indent=6):
    for i in range(count):
        a = start + i
        b = start + (i + 1) % count
        w(eg(f'{prefix}_{a}', f'{prefix}_{b}', color=color, thickness=thickness, indent=indent))


def emit_hex_bonds(prefix, points, color, thickness=0.5, indent=6, threshold=2.7, max_bonds=None):
    """Emit edges between every pair of points within `threshold`, optionally capped."""
    bonds = []
    for i in range(len(points)):
        for j in range(i + 1, len(points)):
            d = dist3(points[i], points[j])
            if d < threshold:
                bonds.append((d, i, j))
    bonds.sort()  # shortest first
    if max_bonds is not None:
        bonds = bonds[:max_bonds]
    for _, i, j in bonds:
        w(eg(f'{prefix}_{i}', f'{prefix}_{j}', color=color, thickness=thickness, indent=indent))


# ─── File header ──────────────────────────────────────────────────────────────

w('# test1000.cns — synthetic test scene, ~1090 nodes with edges')
w('# Five major groups, up to 4 levels deep, with edges suited to each arrangement:')
w('#   • protein_complex   — helix backbone + i→i+3 H-bonds, β-sheet bonds, binding pocket')
w('#   • stellar_neighborhood — orbital rings + star spokes + asteroid belt loop')
w('#   • globular_cluster  — sparse halo constellation + outlier links')
w('#   • crystal_lattice   — hex bonds within unit cells + ionic_bridge linking pivots')
w('#   • nebula_cloud      — sparse filaments')
w('')
w('cluster test_universe ( label="Test Universe" locus=[0,0,0] N=2 color=#06061a brightness=0.4 tube_thickness=1 ) {')
w('')

# ─── 1. PROTEIN COMPLEX ───────────────────────────────────────────────────────
w('  # ── Protein Complex (helix + β-sheet + active site with binding pocket)')
w('  cluster protein_complex ( label="Protein Complex" locus=[0,0,0] N=3 color=#1a2a4a brightness=2.0 tube_color=#4488bb tube_thickness=3 ) {')
w('')

# Alpha helix — 56 residues, backbone + selective H-bonds
w('    cluster alpha_helix ( label="Alpha Helix" locus=[-18,0,0] N=2 color=#1a3a5a brightness=3.5 tube_color=#55aadd tube_thickness=2 ) {')
SHAPES_AH = ['sphere', 'sphere', 'sphere', 'sphere', 'icosahedron']
COLORS_AH = ['#5599cc', '#5599cc', '#5599cc', '#5599cc', '#99ccff']
for i, (x, y, z) in enumerate(helix_pts(56, 2.8, 32)):
    s = SHAPES_AH[i % 5]
    c = COLORS_AH[i % 5]
    sz = 1.2 if s == 'icosahedron' else 0.7
    w(nd(f'ah_{i}', s, x, y, z, c, sz, f'AH-{i}', 6))
# Backbone edges
for i in range(55):
    w(eg(f'ah_{i}', f'ah_{i+1}', color='#66aacc', thickness=1.0, indent=6))
# i → i+3 H-bonds, every other residue
for i in range(0, 53, 2):
    w(eg(f'ah_{i}', f'ah_{i+3}', color='#446688', thickness=0.4, indent=6))
w('    }')
w('')

# Beta sheet — 60 residues (6 strands × 10), strand + cross-strand H-bonds
w('    cluster beta_sheet ( label="Beta Sheet" locus=[18,0,0] N=2 color=#2a1a4a brightness=3.5 tube_color=#aa55dd tube_thickness=2 ) {')
sheet = beta_sheet_pts(6, 10, 2.2)
for i, (x, y, z) in enumerate(sheet):
    c = '#8855cc' if (i // 10) % 2 == 0 else '#aa77ee'
    w(nd(f'bs_{i}', 'sphere', x, y, z, c, 0.8, f'BS-{i}', 6))
# Within-strand backbone: 6 strands × 9 = 54 edges
for s in range(6):
    base = s * 10
    for k in range(9):
        w(eg(f'bs_{base+k}', f'bs_{base+k+1}', color='#9966dd', thickness=0.9, indent=6))
# Cross-strand H-bonds: every other residue between adjacent strands
for s in range(5):
    base_a = s * 10
    base_b = (s + 1) * 10
    for k in range(0, 10, 2):
        w(eg(f'bs_{base_a+k}', f'bs_{base_b+k}', color='#664488', thickness=0.4, indent=6))
w('    }')
w('')

# Active site — 20 free nodes + binding_pocket subgroup (4-level deep)
w('    cluster active_site ( label="Active Site" locus=[0,12,0] N=2 color=#3a1a1a brightness=4.5 tube_color=#dd5555 tube_thickness=2 ) {')
AS_SH = ['sphere', 'sphere', 'sphere', 'sphere', 'tetrahedron']
AS_CO = ['#cc4444', '#cc4444', '#cc4444', '#cc4444', '#ff8888']
active_pts = fibonacci_sphere(20, 5)
for i, (x, y, z) in enumerate(active_pts):
    s = AS_SH[i % 5]
    c = AS_CO[i % 5]
    sz = 1.4 if s == 'tetrahedron' else 0.9
    w(nd(f'as_{i}', s, x, y, z, c, sz, f'AS-{i}', 6))
# Sparse catalytic-residue bonds: link each tetrahedron to its neighbors
tet_indices = [i for i in range(20) if i % 5 == 4]
for ti in tet_indices:
    # Find 2 closest other nodes
    dists = sorted(
        [(dist3(active_pts[ti], active_pts[j]), j) for j in range(20) if j != ti]
    )
    for _, j in dists[:2]:
        if ti < j:
            w(eg(f'as_{ti}', f'as_{j}', color='#ee6666', thickness=0.5, indent=6))
w('')

# Binding pocket — inside active_site, 30 nodes on inner sphere (LEVEL 4)
w('      cluster binding_pocket ( label="Binding Pocket" locus=[0,0,0] N=2 color=#5a1a3a brightness=5.5 tube_color=#ff4499 tube_thickness=1 ) {')
bp_pts = fibonacci_sphere(30, 2.2)
for i, (x, y, z) in enumerate(bp_pts):
    s = 'sphere' if i % 6 != 0 else 'octahedron'
    c = '#ee5599' if i % 6 != 0 else '#ffaadd'
    sz = 0.5 if s == 'sphere' else 0.8
    w(nd(f'bp_{i}', s, x, y, z, c, sz, f'BP-{i}', 8))
# Sparse pocket bonds: connect each octahedron to nearest 2 others
oct_indices = [i for i in range(30) if i % 6 == 0]
for oi in oct_indices:
    dists = sorted(
        [(dist3(bp_pts[oi], bp_pts[j]), j) for j in range(30) if j != oi]
    )
    for _, j in dists[:2]:
        if oi < j:
            w(eg(f'bp_{oi}', f'bp_{j}', color='#ff77bb', thickness=0.4, indent=8))
w('      }')
w('    }')
w('')

# 14 free cofactors at protein_complex level, each linked to a sample residue
CFPOS = [(-9, 6, 5), (9, 6, -5), (0, -8, 6), (-6, -6, -6),
         (6, 4, 8), (-4, 8, -7), (5, -5, 9), (-7, 0, 7),
         (7, -3, -6), (-2, -8, 4), (3, 9, 3), (-8, 4, 0),
         (8, 0, 0), (0, 0, 9)]
CFSH = ['dodecahedron', 'cube', 'octahedron', 'dodecahedron', 'cube', 'icosahedron',
        'dodecahedron', 'cube', 'octahedron', 'icosahedron', 'dodecahedron',
        'cube', 'octahedron', 'dodecahedron']
CFCO = ['#ffdd44', '#44ffdd', '#ff44dd', '#ffaa44', '#44aaff', '#aaff44',
        '#ff6644', '#88ffaa', '#aa88ff', '#ffaa88', '#88aaff', '#ddff44',
        '#44ddff', '#ff88dd']
# Cofactor → linked residue ID (mix of helix and sheet)
LINKED = ['ah_4', 'ah_14', 'ah_24', 'ah_34', 'ah_44', 'ah_54',
          'bs_5', 'bs_15', 'bs_25', 'bs_35', 'bs_45', 'bs_55',
          'as_4', 'as_14']
for i, (x, y, z) in enumerate(CFPOS):
    w(nd(f'cofactor_{i}', CFSH[i], x, y, z, CFCO[i], 1.5, f'Cofactor-{i}', 4))
    w(eg(f'cofactor_{i}', LINKED[i], color=CFCO[i], thickness=0.8, indent=4))
w('')
w('  }')
w('')

# ─── 2. STELLAR NEIGHBORHOOD ──────────────────────────────────────────────────
w('  # ── Stellar Neighborhood (concentric rings + star spokes + asteroid loop)')
w('  cluster stellar_neighborhood ( label="Stellar Neighborhood" locus=[150,0,0] N=3 color=#0a1a3a brightness=1.5 tube_color=#4466aa tube_thickness=4 ) {')
w('')
w('    node star_sol ( shape=sphere locus=[0,0,0] label="Sol" color=#ffee44 size=3.5 )')
w('')

# Inner system — 6 rings: 8, 10, 12, 14, 16, 18 = 78 nodes
w('    cluster inner_system ( label="Inner System" locus=[0,0,0] N=2 color=#1a2a3a brightness=2.5 tube_color=#6688cc tube_thickness=2 ) {')
IN_RINGS = [(8, 9, 0.3), (10, 14, 0.5), (12, 19, 0.7), (14, 24, 0.9), (16, 30, 1.1), (18, 36, 1.3)]
IN_SH = ['sphere', 'cube', 'icosahedron', 'tetrahedron', 'dodecahedron', 'sphere']
IN_CO = ['#4488ff', '#44bbff', '#88ccff', '#aaddff', '#66aaff', '#3377ff']
idx = 0
ring_starts = []   # remember where each ring begins for closing-edge logic
for n, r, wob in IN_RINGS:
    ring_starts.append(idx)
    for j, (x, y, z) in enumerate(ring(n, r, wob)):
        w(nd(f'inner_{idx}', IN_SH[j % 6], x, y, z, IN_CO[j % 6], 1.0, f'Planet-{idx}', 6))
        idx += 1
# Ring edges — closing each ring
for (n, _, _), start in zip(IN_RINGS, ring_starts):
    emit_ring_edges('inner', start, n, color='#5577bb', thickness=0.5, indent=6)
w('    }')
# Star spokes — sun to one representative planet from each inner ring
for start in ring_starts:
    w(eg('star_sol', f'inner_{start}', color='#ffaa44', thickness=1.5, indent=4))
w('')

# Outer system — 5 rings: 20, 22, 24, 26, 28 = 120 nodes
w('    cluster outer_system ( label="Outer System" locus=[0,0,0] N=2 color=#0a1a2a brightness=1.5 tube_color=#3355aa tube_thickness=3 ) {')
OUT_RINGS = [(20, 46, 1.5), (22, 56, 1.8), (24, 66, 2.0), (26, 76, 2.2), (28, 86, 2.4)]
OUT_CO = ['#336699', '#3355aa', '#2244bb', '#334488', '#225588']
idx = 0
out_starts = []
for n, r, wob in OUT_RINGS:
    out_starts.append(idx)
    for j, (x, y, z) in enumerate(ring(n, r, wob)):
        s = 'icosahedron' if j % 3 == 0 else 'sphere'
        sz = 2.0 if j % 3 == 0 else 1.2
        w(nd(f'outer_{idx}', s, x, y, z, OUT_CO[j % 5], sz, f'GasGiant-{idx}', 6))
        idx += 1
for (n, _, _), start in zip(OUT_RINGS, out_starts):
    emit_ring_edges('outer', start, n, color='#445599', thickness=0.4, indent=6)
w('    }')
w('')

# Asteroid belt — single ring of 60
w('    cluster asteroid_belt ( label="Asteroid Belt" locus=[0,0,0] N=2 color=#2a2a1a brightness=1.0 tube_color=#665533 tube_thickness=1 ) {')
BELT_SH = ['tetrahedron', 'cube', 'sphere']
BELT_CO = ['#887755', '#665544']
for i, (x, y, z) in enumerate(ring(60, 40, 3.5)):
    sz = round(0.4 + 0.3 * (i % 4) / 3, 1)
    w(nd(f'ast_{i}', BELT_SH[i % 3], x, y, z, BELT_CO[i % 2], sz, f'Asteroid-{i}', 6))
emit_ring_edges('ast', 0, 60, color='#776644', thickness=0.3, indent=6)
w('    }')
w('')
w('  }')
w('')

# ─── 3. GLOBULAR CLUSTER ──────────────────────────────────────────────────────
w('  # ── Globular Cluster (sphere shells + sparse constellation edges)')
w('  cluster globular_cluster ( label="Globular Cluster" locus=[-90,70,0] N=3 color=#1a0a3a brightness=2.0 tube_color=#8844cc tube_thickness=3 ) {')
w('')

# Core — dense, no edges
w('    cluster core_region ( label="Core Region" locus=[0,0,0] N=2 color=#2a0a4a brightness=4.5 tube_color=#aa55ff tube_thickness=2 ) {')
core_pts = fibonacci_sphere(120, 13)
for i, (x, y, z) in enumerate(core_pts):
    t = i / 119
    rv = min(255, int(120 + t * 100))
    gv = min(255, int(80 + t * 60))
    bv = min(255, int(200 + t * 55))
    c = f'#{rv:02x}{gv:02x}{bv:02x}'
    sz = round(1.4 - t * 0.8, 1)
    w(nd(f'core_{i}', 'sphere', x, y, z, c, sz, f'Core-{i}', 6))
w('    }')
w('')

# Halo — sparser, with k-NN constellation edges
w('    cluster halo_region ( label="Halo Region" locus=[0,0,0] N=2 color=#0a0a2a brightness=1.5 tube_color=#4422aa tube_thickness=2 ) {')
HALO_SH = ['sphere', 'sphere', 'sphere', 'sphere', 'icosahedron']
HALO_CO = ['#4433aa', '#4433aa', '#4433aa', '#4433aa', '#6655cc']
halo_pts = fibonacci_sphere(100, 32)
for i, (x, y, z) in enumerate(halo_pts):
    s = HALO_SH[i % 5]
    c = HALO_CO[i % 5]
    sz = 1.0 if s == 'icosahedron' else 0.5
    w(nd(f'halo_{i}', s, x, y, z, c, sz, f'Halo-{i}', 6))
# Constellation edges: every 5th halo node connected to its single nearest other
for i in range(0, 100, 5):
    dists = sorted(
        [(dist3(halo_pts[i], halo_pts[j]), j) for j in range(100) if j != i]
    )
    j = dists[0][1]
    if i < j:
        w(eg(f'halo_{i}', f'halo_{j}', color='#6644cc', thickness=0.3, indent=6))
w('    }')
w('')

# Outliers — sparse
outlier_pts = fibonacci_sphere(20, 48)
for i, (x, y, z) in enumerate(outlier_pts):
    w(nd(f'outlier_{i}', 'sphere', x, y, z, '#221144', 0.4, f'Outlier-{i}', 4))
# Each outlier linked to nearest halo node
for i in range(20):
    dists = sorted(
        [(dist3(outlier_pts[i], halo_pts[j]), j) for j in range(100)]
    )
    j = dists[0][1]
    w(eg(f'outlier_{i}', f'halo_{j}', color='#332266', thickness=0.2, indent=4))
w('')
w('  }')
w('')

# ─── 4. CRYSTAL LATTICE ───────────────────────────────────────────────────────
w('  # ── Crystal Lattice (4 honeycomb cells + ionic_bridge)')
w('  cluster crystal_lattice ( label="Crystal Lattice" locus=[0,-130,0] N=3 color=#1a3a1a brightness=2.0 tube_color=#44cc44 tube_thickness=2 ) {')
w('')

UC_OFFSETS = [(-30, 0, 0), (-10, 0, 0), (10, 0, 0), (30, 0, 0)]
UC_PFX = ['cla', 'clb', 'clc', 'cld']
UC_CO1 = ['#33aa33', '#44bb44', '#2299aa', '#33cc88']
UC_CO2 = ['#88ff88', '#99ff99', '#55ccdd', '#77ffaa']
UC_SH2 = ['octahedron', 'dodecahedron', 'sphere', 'icosahedron']
UC_MOD = [7, 7, 5, 6]
UC_TC = ['#55dd55', '#66ee66', '#44cc88', '#66ffaa']
UC_LBL = ['A', 'B', 'C', 'D']
for u, (ox, oy, oz) in enumerate(UC_OFFSETS):
    pfx = UC_PFX[u]
    w(f'    cluster unit_cell_{UC_LBL[u].lower()} ( label="Unit Cell {UC_LBL[u]}" locus=[{ox},{oy},{oz}] N=2 color=#1a4a1a brightness=3.0 tube_color={UC_TC[u]} tube_thickness=2 ) {{')
    hex_pts = honeycomb_pts(3)
    for i, (x, y, z) in enumerate(hex_pts):
        mod = UC_MOD[u]
        if i % mod == 0:
            s, c, sz = UC_SH2[u], UC_CO2[u], 1.5
        else:
            s, c, sz = 'sphere', UC_CO1[u], 1.0
        w(nd(f'{pfx}_{i}', s, x, y, z, c, sz, f'UC{UC_LBL[u]}-{i}', 6))
    # Hex bonds (each cell capped at 45 shortest bonds)
    emit_hex_bonds(pfx, hex_pts, color=UC_TC[u], thickness=0.4, indent=6, max_bonds=45)
    w('    }')
    w('')

# Ionic bridge — inner sphere connecting all unit cells
w('    cluster ionic_bridge ( label="Ionic Bridge" locus=[0,0,0] N=2 color=#3a3a1a brightness=3.5 tube_color=#ffdd44 tube_thickness=2 ) {')
ib_pts = fibonacci_sphere(48, 8)
for i, (x, y, z) in enumerate(ib_pts):
    s = 'sphere' if i % 4 != 0 else 'icosahedron'
    c = '#ddcc44' if i % 4 != 0 else '#ffee88'
    sz = 1.1 if s == 'icosahedron' else 0.7
    w(nd(f'ib_{i}', s, x, y, z, c, sz, f'IB-{i}', 6))
# Each ionic_bridge icosahedron linked to its nearest neighbor in the bridge
ico_indices = [i for i in range(48) if i % 4 == 0]
for ti in ico_indices:
    dists = sorted(
        [(dist3(ib_pts[ti], ib_pts[j]), j) for j in range(48) if j != ti]
    )
    j = dists[0][1]
    if ti < j:
        w(eg(f'ib_{ti}', f'ib_{j}', color='#ffcc44', thickness=0.5, indent=6))
w('    }')
w('')

# Lattice pivots
w('    node lpivot_l ( shape=dodecahedron locus=[-22,0,0] label="LPivotL" color=#aaff44 size=2.0 )')
w('    node lpivot_r ( shape=dodecahedron locus=[22,0,0]  label="LPivotR" color=#aaff44 size=2.0 )')
w('    node lpivot_f ( shape=dodecahedron locus=[0,0,15]  label="LPivotF" color=#aaff44 size=2.0 )')
w('    node lpivot_b ( shape=dodecahedron locus=[0,0,-15] label="LPivotB" color=#aaff44 size=2.0 )')
w('    node lapex    ( shape=octahedron   locus=[0,12,0]  label="LApex"   color=#ffaa44 size=2.0 )')
w('    node lbase    ( shape=octahedron   locus=[0,-12,0] label="LBase"   color=#ffaa44 size=2.0 )')
# Bridge → pivot edges
for pivot in ['lpivot_l', 'lpivot_r', 'lpivot_f', 'lpivot_b', 'lapex', 'lbase']:
    w(eg('ib_0', pivot, color='#ddbb44', thickness=0.7, indent=4))
w('')
w('  }')
w('')

# ─── 5. NEBULA CLOUD ──────────────────────────────────────────────────────────
w('  # ── Nebula Cloud (dense core + outer shell + filament edges)')
w('  cluster nebula_cloud ( label="Nebula Cloud" locus=[-70,-60,90] N=3 color=#3a1a0a brightness=1.5 tube_color=#cc4422 tube_thickness=3 ) {')
w('')

# Dense core — 90 nodes
w('    cluster dense_core ( label="Dense Core" locus=[0,0,0] N=2 color=#4a1a0a brightness=5.5 tube_color=#ff6633 tube_thickness=2 ) {')
DC_SH = ['sphere', 'sphere', 'sphere', 'sphere', 'sphere', 'tetrahedron']
dc_pts = fibonacci_sphere(90, 11)
for i, (x, y, z) in enumerate(dc_pts):
    t = i / 89
    rv = min(255, int(200 + t * 55))
    gv = min(255, int(80 + t * 80))
    bv = min(255, int(20 + t * 40))
    c = f'#{rv:02x}{gv:02x}{bv:02x}'
    sz = round(1.5 - t * 0.8, 1)
    s = DC_SH[i % 6]
    w(nd(f'dc_{i}', s, x, y, z, c, sz, f'DC-{i}', 6))
w('    }')
w('')

# Outer shell — 90 nodes
w('    cluster outer_shell ( label="Outer Shell" locus=[0,0,0] N=2 color=#3a1a0a brightness=2.0 tube_color=#aa3311 tube_thickness=2 ) {')
OS_SH = ['sphere', 'sphere', 'sphere', 'sphere', 'sphere', 'sphere', 'icosahedron']
os_pts = fibonacci_sphere(90, 30)
for i, (x, y, z) in enumerate(os_pts):
    t = i / 89
    rv = min(255, int(140 + t * 60))
    gv = min(255, int(50 + t * 50))
    bv = min(255, int(20 + t * 30))
    c = f'#{rv:02x}{gv:02x}{bv:02x}'
    sz = round(0.7 + t * 0.6, 1)
    s = OS_SH[i % 7]
    w(nd(f'os_{i}', s, x, y, z, c, sz, f'OS-{i}', 6))
w('    }')
w('')

# Mid-radius scatter — 30 nodes, with sparse filaments between core and shell
NEB_CO = ['#cc5522', '#dd6633', '#ee7744', '#ff8855', '#cc4411']
neb_pts = fibonacci_sphere(30, 19)
for i, (x, y, z) in enumerate(neb_pts):
    w(nd(f'neb_{i}', 'sphere', x, y, z, NEB_CO[i % 5], 0.6, f'Neb-{i}', 4))
# Each mid-radius node connected to its nearest core and nearest shell
for i in range(0, 30, 2):   # every other to keep ~15 filaments
    p = neb_pts[i]
    core_j = min(range(90), key=lambda j: dist3(p, dc_pts[j]))
    shell_j = min(range(90), key=lambda j: dist3(p, os_pts[j]))
    w(eg(f'neb_{i}', f'dc_{core_j}',  color='#ee6633', thickness=0.3, indent=4))
    w(eg(f'neb_{i}', f'os_{shell_j}', color='#bb4422', thickness=0.3, indent=4))
w('')
w('  }')
w('')

w('}')
w('')

print(f'# node_count: {node_count[0]}', file=sys.stderr)
print(f'# edge_count: {edge_count[0]}', file=sys.stderr)
print(f'# clamped_edges (thickness reduced to ≤ 0.5 × min endpoint size): {clamped_edges[0]}', file=sys.stderr)
print('\n'.join(lines))
