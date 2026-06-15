#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# SPDX-FileCopyrightText: 2026 Gary Frattarola <garyf@parkviewlab.ai>
"""
generate_test2000.py — synthetic test scene with ~2000 nodes and edges.

Usage:
    python3 generate_test2000.py > ../src/renderer/public/examples/test2000.cns

Structure (5 major groups, 4-level deep at protein_complex):

  test_universe/
    protein_complex/                   350 nodes
      alpha_helix/      100 — backbone + every-other i→i+3 H-bonds
      beta_sheet/       100 — 10 strands × 10, within-strand + cross-strand bonds
      active_site/      50 free + binding_pocket subgroup
        binding_pocket/  50 — inner sphere, sparse octahedron bonds
      50 free cofactors — each linked to a backbone residue

    stellar_neighborhood/              500 nodes
      star_sol (1)
      inner_system/    136 — 8 concentric rings (10,12,14,16,18,20,22,24)
      outer_system/    180 — 5 concentric rings (32,34,36,38,40)
      asteroid_belt/   130 — single ring with ring edges
      kuiper_belt/      53 — far ring

    globular_cluster/                  450 nodes
      core_region/     200 — Fibonacci sphere, no edges (too dense)
      halo_region/     200 — sparse constellation k-NN edges
      50 free outliers

    crystal_lattice/                   350 nodes
      unit_cell_a..f/  6×37 — hex honeycomb cells, distance-based bonds
      ionic_bridge/    120 — inner sphere connecting cells
      8 free lattice pivots — links from bridge to pivots

    nebula_cloud/                      350 nodes
      dense_core/      150
      outer_shell/     150
      50 free mid-scatter — sparse filaments to nearest core + shell

Edge thicknesses are auto-clamped to ≤ 0.5 × min(endpoint node sizes).
"""

import math
import sys

# ─── State ────────────────────────────────────────────────────────────────────
lines = []
node_count = [0]
edge_count = [0]
node_sizes = {}      # id → size, used to clamp edge thickness
clamped_edges = [0]  # how many edges had their thickness reduced
node_ids   = []      # insertion-ordered list of node ids — used to emit commonalities at the end


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
    node_ids.append(nid)
    lbl = label or nid
    sp = ' ' * indent
    return f'{sp}node {nid} ( shape={shape} locus=[{x},{y},{z}] label="{lbl}" color={color} size={size} )'


def eg(a, b, color=None, thickness=None, label=None, indent=4):
    """Emit an edge, clamping thickness ≤ 0.5 × min(endpoint sizes)."""
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
    bonds = []
    for i in range(len(points)):
        for j in range(i + 1, len(points)):
            d = dist3(points[i], points[j])
            if d < threshold:
                bonds.append((d, i, j))
    bonds.sort()
    if max_bonds is not None:
        bonds = bonds[:max_bonds]
    for _, i, j in bonds:
        w(eg(f'{prefix}_{i}', f'{prefix}_{j}', color=color, thickness=thickness, indent=indent))


# ─── File header ──────────────────────────────────────────────────────────────

w('# test2000.cns — synthetic test scene, ~2000 nodes with edges')
w('# Five major groups, up to 4 levels deep. Same arrangements as test1000')
w('# at roughly double the size. Edge thicknesses are auto-clamped to')
w('# at most half the diameter of the smaller endpoint node.')
w('')
w('cluster test_universe ( label="Test Universe" locus=[0,0,0] N=2 color=#06061a brightness=0.4 tube_thickness=1 ) {')
w('')

# ─── 1. PROTEIN COMPLEX ───────────────────────────────────────────────────────
w('  # ── Protein Complex')
w('  cluster protein_complex ( label="Protein Complex" locus=[0,0,0] N=3 color=#1a2a4a brightness=2.0 tube_color=#4488bb tube_thickness=3 ) {')
w('')

# Alpha helix — 100 residues
w('    cluster alpha_helix ( label="Alpha Helix" locus=[-26,0,0] N=2 color=#1a3a5a brightness=3.5 tube_color=#55aadd tube_thickness=2 ) {')
SHAPES_AH = ['sphere', 'sphere', 'sphere', 'sphere', 'icosahedron']
COLORS_AH = ['#5599cc', '#5599cc', '#5599cc', '#5599cc', '#99ccff']
for i, (x, y, z) in enumerate(helix_pts(100, 2.8, 56)):
    s = SHAPES_AH[i % 5]
    c = COLORS_AH[i % 5]
    sz = 1.2 if s == 'icosahedron' else 0.7
    w(nd(f'ah_{i}', s, x, y, z, c, sz, f'AH-{i}', 6))
# Backbone
for i in range(99):
    w(eg(f'ah_{i}', f'ah_{i+1}', color='#66aacc', thickness=1.0, indent=6))
# i → i+3 H-bonds, every other residue
for i in range(0, 97, 2):
    w(eg(f'ah_{i}', f'ah_{i+3}', color='#446688', thickness=0.4, indent=6))
w('    }')
w('')

# Beta sheet — 10 strands × 10 = 100 residues
w('    cluster beta_sheet ( label="Beta Sheet" locus=[26,0,0] N=2 color=#2a1a4a brightness=3.5 tube_color=#aa55dd tube_thickness=2 ) {')
sheet = beta_sheet_pts(10, 10, 2.2)
for i, (x, y, z) in enumerate(sheet):
    c = '#8855cc' if (i // 10) % 2 == 0 else '#aa77ee'
    w(nd(f'bs_{i}', 'sphere', x, y, z, c, 0.8, f'BS-{i}', 6))
# Within-strand backbones: 10 × 9 = 90 edges
for s in range(10):
    base = s * 10
    for k in range(9):
        w(eg(f'bs_{base+k}', f'bs_{base+k+1}', color='#9966dd', thickness=0.9, indent=6))
# Cross-strand H-bonds, every other residue between adjacent strands: 9 × 5 = 45
for s in range(9):
    base_a = s * 10
    base_b = (s + 1) * 10
    for k in range(0, 10, 2):
        w(eg(f'bs_{base_a+k}', f'bs_{base_b+k}', color='#664488', thickness=0.4, indent=6))
w('    }')
w('')

# Active site — 50 free + binding_pocket subgroup (4-level deep)
w('    cluster active_site ( label="Active Site" locus=[0,16,0] N=2 color=#3a1a1a brightness=4.5 tube_color=#dd5555 tube_thickness=2 ) {')
AS_SH = ['sphere', 'sphere', 'sphere', 'sphere', 'tetrahedron']
AS_CO = ['#cc4444', '#cc4444', '#cc4444', '#cc4444', '#ff8888']
active_pts = fibonacci_sphere(50, 7)
for i, (x, y, z) in enumerate(active_pts):
    s = AS_SH[i % 5]
    c = AS_CO[i % 5]
    sz = 1.4 if s == 'tetrahedron' else 0.9
    w(nd(f'as_{i}', s, x, y, z, c, sz, f'AS-{i}', 6))
# Sparse catalytic bonds: each tetrahedron to its 2 nearest neighbors
tet_indices = [i for i in range(50) if i % 5 == 4]
for ti in tet_indices:
    dists = sorted([(dist3(active_pts[ti], active_pts[j]), j) for j in range(50) if j != ti])
    for _, j in dists[:2]:
        if ti < j:
            w(eg(f'as_{ti}', f'as_{j}', color='#ee6666', thickness=0.5, indent=6))
w('')

# Binding pocket — 50 nodes on inner sphere (LEVEL 4)
w('      cluster binding_pocket ( label="Binding Pocket" locus=[0,0,0] N=2 color=#5a1a3a brightness=5.5 tube_color=#ff4499 tube_thickness=1 ) {')
bp_pts = fibonacci_sphere(50, 3)
for i, (x, y, z) in enumerate(bp_pts):
    s = 'sphere' if i % 6 != 0 else 'octahedron'
    c = '#ee5599' if i % 6 != 0 else '#ffaadd'
    sz = 0.5 if s == 'sphere' else 0.8
    w(nd(f'bp_{i}', s, x, y, z, c, sz, f'BP-{i}', 8))
# Sparse pocket bonds: each octahedron to its 2 nearest neighbors
oct_indices = [i for i in range(50) if i % 6 == 0]
for oi in oct_indices:
    dists = sorted([(dist3(bp_pts[oi], bp_pts[j]), j) for j in range(50) if j != oi])
    for _, j in dists[:2]:
        if oi < j:
            w(eg(f'bp_{oi}', f'bp_{j}', color='#ff77bb', thickness=0.4, indent=8))
w('      }')
w('    }')
w('')

# 50 free cofactors, each linked to a representative residue
CFSH_PALETTE = ['dodecahedron', 'cube', 'octahedron', 'icosahedron']
CFCO_PALETTE = ['#ffdd44', '#44ffdd', '#ff44dd', '#ffaa44', '#44aaff', '#aaff44',
                '#ff6644', '#88ffaa', '#aa88ff', '#ffaa88', '#88aaff', '#ddff44',
                '#44ddff', '#ff88dd', '#dd44ff', '#44ffaa', '#ffaa55', '#55aaff',
                '#aaff55', '#ff5555', '#55ff55', '#5555ff', '#ddaa44', '#44ddaa',
                '#aa44dd', '#ffcc88', '#88ccff', '#ccff88', '#cc88ff', '#88ffcc']
# Place cofactors on a Fibonacci sphere around the protein at radius ~14
for i, (x, y, z) in enumerate(fibonacci_sphere(50, 14)):
    sh = CFSH_PALETTE[i % 4]
    co = CFCO_PALETTE[i % len(CFCO_PALETTE)]
    w(nd(f'cofactor_{i}', sh, x, y, z, co, 1.5, f'Cofactor-{i}', 4))
    # Each cofactor linked to a residue (cycling through helix/sheet/site)
    if i < 17:
        target = f'ah_{(i * 6) % 100}'
    elif i < 34:
        target = f'bs_{((i - 17) * 6) % 100}'
    else:
        target = f'as_{((i - 34) * 3) % 50}'
    w(eg(f'cofactor_{i}', target, color=CFCO_PALETTE[i % len(CFCO_PALETTE)], thickness=0.8, indent=4))
w('')
w('  }')
w('')

# ─── 2. STELLAR NEIGHBORHOOD ──────────────────────────────────────────────────
w('  # ── Stellar Neighborhood')
w('  cluster stellar_neighborhood ( label="Stellar Neighborhood" locus=[210,0,0] N=3 color=#0a1a3a brightness=1.5 tube_color=#4466aa tube_thickness=4 ) {')
w('')
w(nd('star_sol', 'sphere', 0, 0, 0, '#ffee44', 4.5, 'Sol', 4))
w('')

# Inner system — 8 rings: 10..24 = 136 nodes
w('    cluster inner_system ( label="Inner System" locus=[0,0,0] N=2 color=#1a2a3a brightness=2.5 tube_color=#6688cc tube_thickness=2 ) {')
IN_RINGS = [(10, 10, 0.3), (12, 16, 0.5), (14, 22, 0.7), (16, 28, 0.9),
            (18, 35, 1.1), (20, 42, 1.3), (22, 50, 1.5), (24, 58, 1.7)]
IN_SH = ['sphere', 'cube', 'icosahedron', 'tetrahedron', 'dodecahedron', 'sphere']
IN_CO = ['#4488ff', '#44bbff', '#88ccff', '#aaddff', '#66aaff', '#3377ff']
idx = 0
ring_starts = []
for n, r, wob in IN_RINGS:
    ring_starts.append(idx)
    for j, (x, y, z) in enumerate(ring(n, r, wob)):
        w(nd(f'inner_{idx}', IN_SH[j % 6], x, y, z, IN_CO[j % 6], 1.0, f'Planet-{idx}', 6))
        idx += 1
for (n, _, _), start in zip(IN_RINGS, ring_starts):
    emit_ring_edges('inner', start, n, color='#5577bb', thickness=0.5, indent=6)
w('    }')
# Star spokes
for start in ring_starts:
    w(eg('star_sol', f'inner_{start}', color='#ffaa44', thickness=1.5, indent=4))
w('')

# Outer system — 5 rings: 32, 34, 36, 38, 40 = 180 nodes
w('    cluster outer_system ( label="Outer System" locus=[0,0,0] N=2 color=#0a1a2a brightness=1.5 tube_color=#3355aa tube_thickness=3 ) {')
OUT_RINGS = [(32, 70, 2.0), (34, 84, 2.2), (36, 98, 2.4), (38, 113, 2.6), (40, 128, 2.8)]
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

# Asteroid belt — 130 nodes
w('    cluster asteroid_belt ( label="Asteroid Belt" locus=[0,0,0] N=2 color=#2a2a1a brightness=1.0 tube_color=#665533 tube_thickness=1 ) {')
BELT_SH = ['tetrahedron', 'cube', 'sphere']
BELT_CO = ['#887755', '#665544']
for i, (x, y, z) in enumerate(ring(130, 62, 4.0)):
    sz = round(0.4 + 0.3 * (i % 4) / 3, 1)
    w(nd(f'ast_{i}', BELT_SH[i % 3], x, y, z, BELT_CO[i % 2], sz, f'Asteroid-{i}', 6))
emit_ring_edges('ast', 0, 130, color='#776644', thickness=0.3, indent=6)
w('    }')
w('')

# Kuiper belt — 53 nodes, even farther
w('    cluster kuiper_belt ( label="Kuiper Belt" locus=[0,0,0] N=2 color=#1a2a3a brightness=0.8 tube_color=#446699 tube_thickness=1 ) {')
KB_SH = ['sphere', 'tetrahedron', 'icosahedron']
KB_CO = ['#557799', '#446688']
for i, (x, y, z) in enumerate(ring(53, 145, 5.0)):
    sz = round(0.5 + 0.4 * (i % 5) / 4, 1)
    s = KB_SH[i % 3]
    w(nd(f'kb_{i}', s, x, y, z, KB_CO[i % 2], sz, f'KBO-{i}', 6))
emit_ring_edges('kb', 0, 53, color='#556677', thickness=0.3, indent=6)
w('    }')
w('')
w('  }')
w('')

# ─── 3. GLOBULAR CLUSTER ──────────────────────────────────────────────────────
w('  # ── Globular Cluster')
w('  cluster globular_cluster ( label="Globular Cluster" locus=[-150,110,0] N=3 color=#1a0a3a brightness=2.0 tube_color=#8844cc tube_thickness=3 ) {')
w('')

# Core — 200 nodes, no edges
w('    cluster core_region ( label="Core Region" locus=[0,0,0] N=2 color=#2a0a4a brightness=4.5 tube_color=#aa55ff tube_thickness=2 ) {')
core_pts = fibonacci_sphere(200, 17)
for i, (x, y, z) in enumerate(core_pts):
    t = i / 199
    rv = min(255, int(120 + t * 100))
    gv = min(255, int(80 + t * 60))
    bv = min(255, int(200 + t * 55))
    c = f'#{rv:02x}{gv:02x}{bv:02x}'
    sz = round(1.4 - t * 0.8, 1)
    w(nd(f'core_{i}', 'sphere', x, y, z, c, sz, f'Core-{i}', 6))
w('    }')
w('')

# Halo — 200 nodes with constellation edges
w('    cluster halo_region ( label="Halo Region" locus=[0,0,0] N=2 color=#0a0a2a brightness=1.5 tube_color=#4422aa tube_thickness=2 ) {')
HALO_SH = ['sphere', 'sphere', 'sphere', 'sphere', 'icosahedron']
HALO_CO = ['#4433aa', '#4433aa', '#4433aa', '#4433aa', '#6655cc']
halo_pts = fibonacci_sphere(200, 42)
for i, (x, y, z) in enumerate(halo_pts):
    s = HALO_SH[i % 5]
    c = HALO_CO[i % 5]
    sz = 1.0 if s == 'icosahedron' else 0.5
    w(nd(f'halo_{i}', s, x, y, z, c, sz, f'Halo-{i}', 6))
# Constellation edges: every 5th halo node to its nearest neighbor
for i in range(0, 200, 5):
    dists = sorted([(dist3(halo_pts[i], halo_pts[j]), j) for j in range(200) if j != i])
    j = dists[0][1]
    if i < j:
        w(eg(f'halo_{i}', f'halo_{j}', color='#6644cc', thickness=0.3, indent=6))
w('    }')
w('')

# Outliers — 50
outlier_pts = fibonacci_sphere(50, 62)
for i, (x, y, z) in enumerate(outlier_pts):
    w(nd(f'outlier_{i}', 'sphere', x, y, z, '#221144', 0.4, f'Outlier-{i}', 4))
for i in range(50):
    dists = sorted([(dist3(outlier_pts[i], halo_pts[j]), j) for j in range(200)])
    j = dists[0][1]
    w(eg(f'outlier_{i}', f'halo_{j}', color='#332266', thickness=0.2, indent=4))
w('')
w('  }')
w('')

# ─── 4. CRYSTAL LATTICE ───────────────────────────────────────────────────────
w('  # ── Crystal Lattice')
w('  cluster crystal_lattice ( label="Crystal Lattice" locus=[0,-180,0] N=3 color=#1a3a1a brightness=2.0 tube_color=#44cc44 tube_thickness=2 ) {')
w('')

UC_OFFSETS = [(-45, 0, -15), (-15, 0, -15), (15, 0, -15), (45, 0, -15),
              (-30, 0, 15), (30, 0, 15)]
UC_PFX = ['cla', 'clb', 'clc', 'cld', 'cle', 'clf']
UC_CO1 = ['#33aa33', '#44bb44', '#2299aa', '#33cc88', '#55cc33', '#88aa33']
UC_CO2 = ['#88ff88', '#99ff99', '#55ccdd', '#77ffaa', '#aaff77', '#ccff88']
UC_SH2 = ['octahedron', 'dodecahedron', 'sphere', 'icosahedron', 'octahedron', 'dodecahedron']
UC_MOD = [7, 7, 5, 6, 7, 6]
UC_TC = ['#55dd55', '#66ee66', '#44cc88', '#66ffaa', '#88dd55', '#aacc55']
UC_LBL = ['A', 'B', 'C', 'D', 'E', 'F']
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
    emit_hex_bonds(pfx, hex_pts, color=UC_TC[u], thickness=0.4, indent=6, max_bonds=45)
    w('    }')
    w('')

# Ionic bridge — 120 nodes
w('    cluster ionic_bridge ( label="Ionic Bridge" locus=[0,0,0] N=2 color=#3a3a1a brightness=3.5 tube_color=#ffdd44 tube_thickness=2 ) {')
ib_pts = fibonacci_sphere(120, 12)
for i, (x, y, z) in enumerate(ib_pts):
    s = 'sphere' if i % 4 != 0 else 'icosahedron'
    c = '#ddcc44' if i % 4 != 0 else '#ffee88'
    sz = 1.1 if s == 'icosahedron' else 0.7
    w(nd(f'ib_{i}', s, x, y, z, c, sz, f'IB-{i}', 6))
# Each icosahedron linked to its nearest neighbor
ico_indices = [i for i in range(120) if i % 4 == 0]
for ti in ico_indices:
    dists = sorted([(dist3(ib_pts[ti], ib_pts[j]), j) for j in range(120) if j != ti])
    j = dists[0][1]
    if ti < j:
        w(eg(f'ib_{ti}', f'ib_{j}', color='#ffcc44', thickness=0.5, indent=6))
w('    }')
w('')

# Lattice pivots — 8 free
LP_POS = [(-32, 0, 0), (32, 0, 0), (0, 0, 22), (0, 0, -22),
          (0, 16, 0), (0, -16, 0), (-22, 12, -10), (22, -12, 10)]
LP_NAME = ['lpivot_l', 'lpivot_r', 'lpivot_f', 'lpivot_b',
           'lapex', 'lbase', 'lpivot_x1', 'lpivot_x2']
LP_SH = ['dodecahedron', 'dodecahedron', 'dodecahedron', 'dodecahedron',
         'octahedron', 'octahedron', 'icosahedron', 'icosahedron']
LP_CO = ['#aaff44', '#aaff44', '#aaff44', '#aaff44',
         '#ffaa44', '#ffaa44', '#ffff44', '#ffff44']
for name, sh, co, (x, y, z) in zip(LP_NAME, LP_SH, LP_CO, LP_POS):
    w(nd(name, sh, x, y, z, co, 2.0, label=name.replace('lpivot_', 'LP_').replace('lapex', 'LApex').replace('lbase', 'LBase'), indent=4))
# Bridge → pivot edges
for name in LP_NAME:
    w(eg('ib_0', name, color='#ddbb44', thickness=0.7, indent=4))
w('')
w('  }')
w('')

# ─── 5. NEBULA CLOUD ──────────────────────────────────────────────────────────
w('  # ── Nebula Cloud')
w('  cluster nebula_cloud ( label="Nebula Cloud" locus=[-110,-100,140] N=3 color=#3a1a0a brightness=1.5 tube_color=#cc4422 tube_thickness=3 ) {')
w('')

# Dense core — 150
w('    cluster dense_core ( label="Dense Core" locus=[0,0,0] N=2 color=#4a1a0a brightness=5.5 tube_color=#ff6633 tube_thickness=2 ) {')
DC_SH = ['sphere', 'sphere', 'sphere', 'sphere', 'sphere', 'tetrahedron']
dc_pts = fibonacci_sphere(150, 14)
for i, (x, y, z) in enumerate(dc_pts):
    t = i / 149
    rv = min(255, int(200 + t * 55))
    gv = min(255, int(80 + t * 80))
    bv = min(255, int(20 + t * 40))
    c = f'#{rv:02x}{gv:02x}{bv:02x}'
    sz = round(1.5 - t * 0.8, 1)
    s = DC_SH[i % 6]
    w(nd(f'dc_{i}', s, x, y, z, c, sz, f'DC-{i}', 6))
w('    }')
w('')

# Outer shell — 150
w('    cluster outer_shell ( label="Outer Shell" locus=[0,0,0] N=2 color=#3a1a0a brightness=2.0 tube_color=#aa3311 tube_thickness=2 ) {')
OS_SH = ['sphere', 'sphere', 'sphere', 'sphere', 'sphere', 'sphere', 'icosahedron']
os_pts = fibonacci_sphere(150, 38)
for i, (x, y, z) in enumerate(os_pts):
    t = i / 149
    rv = min(255, int(140 + t * 60))
    gv = min(255, int(50 + t * 50))
    bv = min(255, int(20 + t * 30))
    c = f'#{rv:02x}{gv:02x}{bv:02x}'
    sz = round(0.7 + t * 0.6, 1)
    s = OS_SH[i % 7]
    w(nd(f'os_{i}', s, x, y, z, c, sz, f'OS-{i}', 6))
w('    }')
w('')

# Mid-radius scatter — 50 nodes, sparse filaments to nearest core + shell
NEB_CO = ['#cc5522', '#dd6633', '#ee7744', '#ff8855', '#cc4411']
neb_pts = fibonacci_sphere(50, 24)
for i, (x, y, z) in enumerate(neb_pts):
    w(nd(f'neb_{i}', 'sphere', x, y, z, NEB_CO[i % 5], 0.6, f'Neb-{i}', 4))
for i in range(0, 50, 2):
    p = neb_pts[i]
    core_j = min(range(150), key=lambda j: dist3(p, dc_pts[j]))
    shell_j = min(range(150), key=lambda j: dist3(p, os_pts[j]))
    w(eg(f'neb_{i}', f'dc_{core_j}',  color='#ee6633', thickness=0.3, indent=4))
    w(eg(f'neb_{i}', f'os_{shell_j}', color='#bb4422', thickness=0.3, indent=4))
w('')
w('  }')
w('')

w('}')
w('')

# ─── Commonalities ────────────────────────────────────────────────────────────
# Stress-test the satellites halo: every node ends up with at least 3
# commonalities, and a handful of nodes accumulate ~20.  Membership is
# deterministic — driven by a stable hash of (commonality_id + node_id) — so
# regenerating the file always produces the same layout.

import hashlib

def _h(seed, nid):
    return int(hashlib.md5(f'{seed}::{nid}'.encode()).hexdigest()[:8], 16) / 0xFFFFFFFF

def prefix_of(nid):
    # 'ah_42' → 'ah'; 'star_sol' → 'star_sol'; 'lpivot_l' → 'lpivot_l'
    if nid == 'star_sol' or nid.startswith('lapex') or nid.startswith('lbase') or nid.startswith('lpivot'):
        return nid.rstrip('0123456789').rstrip('_') or nid
    return nid.split('_')[0]

# Domain commonalities — each node belongs to exactly one, based on its id prefix.
DOMAIN_PREFIXES = {
    'biological':  {'ah', 'bs', 'as', 'bp', 'cofactor'},
    'stellar':     {'star_sol', 'inner', 'outer', 'ast', 'kb'},
    'globular':    {'core', 'halo', 'outlier'},
    'crystalline': {'cla', 'clb', 'clc', 'cld', 'cle', 'clf', 'ib', 'lapex', 'lbase',
                    'lpivot_b', 'lpivot_f', 'lpivot_l', 'lpivot_r', 'lpivot_x'},
    'nebulous':    {'dc', 'os', 'neb'},
}
DOMAIN_META = {
    'biological':  ('Biological',  '#ff8844', 'sphere'),
    'stellar':     ('Stellar',     '#aabbff', 'icosahedron'),
    'globular':    ('Globular',    '#aa99ff', 'dodecahedron'),
    'crystalline': ('Crystalline', '#88ffaa', 'octahedron'),
    'nebulous':    ('Nebulous',    '#ddaaff', 'sphere'),
}

# Feature commonalities — (id, label, color, shape, inclusion_probability).
# 35 entries; probabilities sum to ~7.4, so the average node ends up with
# 1 (domain) + ~7 (features) ≈ 8 satellites.  Min and max are then enforced
# by the post-processing pass below.
FEATURE_COMMS = [
    ('curious',     'curious',     '#ffaa88', 'tetrahedron',  0.65),
    ('grounded',    'grounded',    '#88aaff', 'cube',         0.55),
    ('balanced',    'balanced',    '#cccccc', 'sphere',       0.50),
    ('vibrant',     'vibrant',     '#ff5588', 'tetrahedron',  0.45),
    ('luminous',    'luminous',    '#ffffaa', 'octahedron',   0.40),
    ('cosmic',      'cosmic',      '#5588ff', 'icosahedron',  0.35),
    ('intricate',   'intricate',   '#88ddaa', 'dodecahedron', 0.30),
    ('wandering',   'wandering',   '#cc88ff', 'sphere',       0.30),
    ('persistent',  'persistent',  '#ffdd44', 'cube',         0.30),
    ('liminal',     'liminal',     '#aaccff', 'sphere',       0.25),
    ('threaded',    'threaded',    '#ff66cc', 'cylinder',     0.25),
    ('sparking',    'sparking',    '#ffaa00', 'tetrahedron',  0.22),
    ('flowing',     'flowing',     '#44ffcc', 'sphere',       0.22),
    ('quiet',       'quiet',       '#666688', 'cube',         0.22),
    ('echoing',     'echoing',     '#ffccaa', 'sphere',       0.18),
    ('drifting',    'drifting',    '#aabbcc', 'sphere',       0.18),
    ('refracting',  'refracting',  '#cc88ff', 'octahedron',   0.15),
    ('woven',       'woven',       '#dd66aa', 'cube',         0.15),
    ('singing',     'singing',     '#ddffaa', 'tetrahedron',  0.12),
    ('vast',        'vast',        '#445566', 'icosahedron',  0.12),
    ('intimate',    'intimate',    '#ff8888', 'sphere',       0.12),
    ('whisper',     'whisper',     '#dddddd', 'sphere',       0.20),
    ('hum',         'hum',         '#aaddff', 'cube',         0.18),
    ('pulse',       'pulse',       '#ff4488', 'octahedron',   0.15),
    ('arc',         'arc',         '#aaccff', 'cylinder',     0.12),
    ('seed',        'seed',        '#aabb44', 'tetrahedron',  0.10),
    ('root',        'root',        '#884422', 'cylinder',     0.08),
    ('canopy',      'canopy',      '#44ff88', 'dodecahedron', 0.10),
    ('twilight',    'twilight',    '#553388', 'sphere',       0.08),
    ('rare',        'rare',        '#ffff00', 'tetrahedron',  0.10),
    ('rarer',       'rarer',       '#cc00ff', 'octahedron',   0.07),
    ('rarest',      'rarest',      '#ff00cc', 'icosahedron',  0.05),
    ('apex',        'apex',        '#ffaa00', 'tetrahedron',  0.04),
    ('hidden',      'hidden',      '#222266', 'sphere',       0.03),
    ('hypercharged','hypercharged','#ff66ff', 'icosahedron',  0.02),  # used to push a few nodes toward ~20
]

# Build per-node membership lists.
domain_of = {}
for nid in node_ids:
    p = prefix_of(nid)
    for dom, prefixes in DOMAIN_PREFIXES.items():
        if p in prefixes:
            domain_of[nid] = dom
            break
    if nid not in domain_of:
        # Unrecognised prefix — fall back to a synthetic catch-all so every node
        # still has its one domain commonality.  Should not fire for the
        # current generator output.
        domain_of[nid] = 'biological'  # safe default; biological is already broad

memberships = {nid: [] for nid in node_ids}
for nid in node_ids:
    memberships[nid].append(domain_of[nid])

for (cid, _lbl, _col, _shp, prob) in FEATURE_COMMS:
    for nid in node_ids:
        if _h(cid, nid) < prob:
            memberships[nid].append(cid)

# Post-process: ensure every node has at least 3 commonalities.  For any node
# short of the minimum, add it to feature commonalities in order of lowest
# membership-so-far (so we backfill from the rarer pool rather than the most
# common).
MIN_PER_NODE = 3
RARE_FEATURE_IDS = [c[0] for c in reversed(FEATURE_COMMS)]  # rarest first
for nid in node_ids:
    if len(memberships[nid]) >= MIN_PER_NODE:
        continue
    for cid in RARE_FEATURE_IDS:
        if cid in memberships[nid]:
            continue
        memberships[nid].append(cid)
        if len(memberships[nid]) >= MIN_PER_NODE:
            break

# Boost: nudge a small number of nodes toward ~20 memberships by force-adding
# any features they don't already have, until they reach the ceiling.  This
# exercises the high-N rendering path.
MAX_TARGET = 20
boost_nodes = [nid for nid in node_ids if _h('boost', nid) < 0.012]  # ~24 of 2000
for nid in boost_nodes:
    if len(memberships[nid]) >= MAX_TARGET:
        continue
    for (cid, _, _, _, _) in FEATURE_COMMS:
        if cid in memberships[nid]:
            continue
        memberships[nid].append(cid)
        if len(memberships[nid]) >= MAX_TARGET:
            break

# Invert: commonality_id → [member_ids in insertion order]
members_of = {cid: [] for cid in DOMAIN_META}
for (cid, *_rest) in FEATURE_COMMS:
    members_of[cid] = []
for nid in node_ids:
    for cid in memberships[nid]:
        members_of[cid].append(nid)

# Emit commonality declarations at file scope.
w('# ── Commonalities ─────────────────────────────────────────────────────────')
w('# Stress test for the satellites halo: every node belongs to 3+ commonalities,')
w('# a handful belong to ~20.  Membership is deterministic (hashed).')
w('')
w('# Domain commonalities (one per node, by prefix)')
for cid in ('biological', 'stellar', 'globular', 'crystalline', 'nebulous'):
    lbl, col, shp = DOMAIN_META[cid]
    members = members_of[cid]
    if not members: continue
    members_text = ', '.join(members)
    w(f'commonality {cid} ( label="{lbl}" color={col} shape={shp} ) {{ {members_text} }}')
w('')
w('# Feature commonalities (varying probabilities)')
for (cid, lbl, col, shp, _prob) in FEATURE_COMMS:
    members = members_of[cid]
    if not members: continue
    members_text = ', '.join(members)
    w(f'commonality {cid} ( label="{lbl}" color={col} shape={shp} ) {{ {members_text} }}')

# Stats for the # comment lines that go to stderr.
membership_counts = [len(memberships[nid]) for nid in node_ids]
print(f'# node_count: {node_count[0]}', file=sys.stderr)
print(f'# edge_count: {edge_count[0]}', file=sys.stderr)
print(f'# clamped_edges: {clamped_edges[0]}', file=sys.stderr)
print(f'# commonality_count: {len(DOMAIN_META) + len(FEATURE_COMMS)}', file=sys.stderr)
print(f'# memberships per node: min={min(membership_counts)}  '
      f'avg={sum(membership_counts)/len(membership_counts):.2f}  '
      f'max={max(membership_counts)}', file=sys.stderr)
print('\n'.join(lines))
