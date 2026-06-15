#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# SPDX-FileCopyrightText: 2026 Gary Frattarola <garyf@parkviewlab.ai>
"""
generate_test550.py — generate a synthetic ~550-node test scene as a .cns file.

Usage:
    python3 generate_test550.py > ../src/renderer/public/examples/test550.cns

Produces a scene with 5 top-level clusters (3+ nesting levels), each
demonstrating a different spatial arrangement:

  • Sphere surface  (Fibonacci spiral) — globular_cluster, nebula_cloud
  • Planar / solar  (concentric rings) — stellar_neighborhood
  • Molecule-like   (helix, β-sheet,   — protein_complex, crystal_lattice
                    honeycomb)

Final node count: 535.
"""

import math
import sys

# ─── State ────────────────────────────────────────────────────────────────────
lines = []
node_count = [0]


def w(s): lines.append(s)
def r2(x): return round(x, 2)


# ─── Coordinate generators ────────────────────────────────────────────────────

def fibonacci_sphere(n, radius):
    """Evenly distribute n points on a sphere surface using the golden-angle spiral."""
    phi = math.pi * (3 - math.sqrt(5))   # golden angle (~137.5°)
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
    """n points on a circle in the XZ plane, with a sinusoidal Y wobble for visual interest."""
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        pts.append((r2(radius * math.cos(a)),
                    r2(wobble * math.sin(3 * a + 0.3)),
                    r2(radius * math.sin(a))))
    return pts


def helix_pts(n, radius, pitch_total):
    """α-helix-like spiral with 3.6 nodes per turn, total height = pitch_total."""
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / 3.6
        y = r2((i / (n - 1)) * pitch_total - pitch_total / 2) if n > 1 else 0
        pts.append((r2(radius * math.cos(t)), y, r2(radius * math.sin(t))))
    return pts


def beta_sheet_pts(n_strands, strand_len, spacing):
    """β-sheet — parallel strands with alternating Y (zig-zag backbone)."""
    pts = []
    for s in range(n_strands):
        for r in range(strand_len):
            x = r2((s - n_strands / 2.0) * spacing)
            z = r2((r - strand_len / 2.0) * spacing * 1.5)
            y = r2(0.5 * (1 if r % 2 == 0 else -1))
            pts.append((x, y, z))
    return pts


def honeycomb_pts(rings_n):
    """Hexagonal honeycomb in the XZ plane using cube coordinates (q, r, s with q+r+s=0)."""
    a = 2.5   # lattice constant
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


# ─── Node line emitter ────────────────────────────────────────────────────────

def nd(nid, shape, x, y, z, color, size=1.0, label=None, indent=4):
    """Format one `node` statement and bump the global counter."""
    node_count[0] += 1
    lbl = label or nid
    sp = ' ' * indent
    return f'{sp}node {nid} ( shape={shape} locus=[{x},{y},{z}] label="{lbl}" color={color} size={size} )'


# ─── File header ──────────────────────────────────────────────────────────────

w('# test550.cns — synthetic test scene, ~550 nodes')
w('# Three spatial arrangements across 3+ levels of clusters:')
w('#   • Sphere surface  (Fibonacci spiral)  — globular_cluster, nebula_cloud')
w('#   • Planar / solar  (concentric rings)  — stellar_neighborhood')
w('#   • Molecule-like   (helix, β-sheet, honeycomb) — protein_complex, crystal_lattice')
w('')
w('cluster test_universe ( label="Test Universe" locus=[0,0,0] N=2 color=#06061a brightness=0.4 tube_thickness=1 ) {')
w('')

# ─── 1. PROTEIN COMPLEX — molecule arrangements ───────────────────────────────
w('  # ── Protein Complex  (helix + β-sheet + binding sphere)')
w('  cluster protein_complex ( label="Protein Complex" locus=[0,0,0] N=3 color=#1a2a4a brightness=2.0 tube_color=#4488bb tube_thickness=3 ) {')
w('')

# α-helix
w('    cluster alpha_helix ( label="Alpha Helix" locus=[-14,0,0] N=2 color=#1a3a5a brightness=3.5 tube_color=#55aadd tube_thickness=2 ) {')
SHAPES_AH = ['sphere', 'sphere', 'sphere', 'sphere', 'icosahedron']
COLORS_AH = ['#5599cc', '#5599cc', '#5599cc', '#5599cc', '#99ccff']
for i, (x, y, z) in enumerate(helix_pts(28, 2.8, 16)):
    s = SHAPES_AH[i % 5]
    c = COLORS_AH[i % 5]
    sz = 1.2 if s == 'icosahedron' else 0.7
    w(nd(f'ah_{i}', s, x, y, z, c, sz, f'AH-{i}', 6))
w('    }')
w('')

# β-sheet
w('    cluster beta_sheet ( label="Beta Sheet" locus=[14,0,0] N=2 color=#2a1a4a brightness=3.5 tube_color=#aa55dd tube_thickness=2 ) {')
for i, (x, y, z) in enumerate(beta_sheet_pts(5, 6, 2.2)):
    c = '#8855cc' if (i // 6) % 2 == 0 else '#aa77ee'
    w(nd(f'bs_{i}', 'sphere', x, y, z, c, 0.8, f'BS-{i}', 6))
w('    }')
w('')

# Binding pocket (sphere)
w('    cluster active_site ( label="Active Site" locus=[0,10,0] N=2 color=#3a1a1a brightness=4.5 tube_color=#dd5555 tube_thickness=2 ) {')
AS_SH = ['sphere', 'sphere', 'sphere', 'sphere', 'tetrahedron']
AS_CO = ['#cc4444', '#cc4444', '#cc4444', '#cc4444', '#ff8888']
for i, (x, y, z) in enumerate(fibonacci_sphere(20, 4)):
    s = AS_SH[i % 5]
    c = AS_CO[i % 5]
    sz = 1.4 if s == 'tetrahedron' else 0.9
    w(nd(f'as_{i}', s, x, y, z, c, sz, f'AS-{i}', 6))
w('    }')
w('')

# Free nodes — cofactors / ligands
CFPOS = [(-7, 5, 4), (7, 5, -4), (0, -7, 5), (-5, -5, -5),
         (5, 3, 7), (-3, 7, -6), (4, -4, 8)]
CFSH = ['dodecahedron', 'cube', 'octahedron', 'dodecahedron',
        'cube', 'icosahedron', 'dodecahedron']
CFCO = ['#ffdd44', '#44ffdd', '#ff44dd', '#ffaa44',
        '#44aaff', '#aaff44', '#ff6644']
for i, (x, y, z) in enumerate(CFPOS):
    w(nd(f'cofactor_{i}', CFSH[i], x, y, z, CFCO[i], 1.5, f'Cofactor-{i}', 4))
w('')
w('  }')
w('')

# ─── 2. STELLAR NEIGHBORHOOD — planar arrangements ────────────────────────────
w('  # ── Stellar Neighborhood  (concentric rings in XZ plane)')
w('  cluster stellar_neighborhood ( label="Stellar Neighborhood" locus=[120,0,0] N=3 color=#0a1a3a brightness=1.5 tube_color=#4466aa tube_thickness=4 ) {')
w('')
w('    node star_sol ( shape=sphere locus=[0,0,0] label="Sol" color=#ffee44 size=3.0 )')
w('')

# Inner system
w('    cluster inner_system ( label="Inner System" locus=[0,0,0] N=2 color=#1a2a3a brightness=2.5 tube_color=#6688cc tube_thickness=2 ) {')
IN_RINGS = [(6, 8, 0.3), (8, 14, 0.5), (10, 20, 0.7), (12, 27, 0.9)]
IN_SH = ['sphere', 'cube', 'icosahedron', 'tetrahedron', 'dodecahedron', 'sphere']
IN_CO = ['#4488ff', '#44bbff', '#88ccff', '#aaddff', '#66aaff', '#3377ff']
idx = 0
for n, r, wob in IN_RINGS:
    for j, (x, y, z) in enumerate(ring(n, r, wob)):
        w(nd(f'inner_{idx}', IN_SH[j % 6], x, y, z, IN_CO[j % 6], 1.0, f'Planet-{idx}', 6))
        idx += 1
w('    }')
w('')

# Outer system
w('    cluster outer_system ( label="Outer System" locus=[0,0,0] N=2 color=#0a1a2a brightness=1.5 tube_color=#3355aa tube_thickness=3 ) {')
OUT_RINGS = [(14, 38, 1.2), (16, 50, 1.5), (18, 65, 2.0)]
OUT_CO = ['#336699', '#3355aa', '#2244bb', '#334488', '#225588']
idx = 0
for n, r, wob in OUT_RINGS:
    for j, (x, y, z) in enumerate(ring(n, r, wob)):
        s = 'icosahedron' if j % 3 == 0 else 'sphere'
        sz = 2.0 if j % 3 == 0 else 1.2
        w(nd(f'outer_{idx}', s, x, y, z, OUT_CO[j % 5], sz, f'GasGiant-{idx}', 6))
        idx += 1
w('    }')
w('')

# Asteroid belt
w('    cluster asteroid_belt ( label="Asteroid Belt" locus=[0,0,0] N=2 color=#2a2a1a brightness=1.0 tube_color=#665533 tube_thickness=1 ) {')
BELT_SH = ['tetrahedron', 'cube', 'sphere']
BELT_CO = ['#887755', '#665544']
for i, (x, y, z) in enumerate(ring(35, 33, 3.5)):
    sz = round(0.4 + 0.3 * (i % 4) / 3, 1)
    w(nd(f'ast_{i}', BELT_SH[i % 3], x, y, z, BELT_CO[i % 2], sz, f'Asteroid-{i}', 6))
w('    }')
w('')
w('  }')
w('')

# ─── 3. GLOBULAR CLUSTER — sphere surface ─────────────────────────────────────
w('  # ── Globular Cluster  (two concentric Fibonacci spheres + outliers)')
w('  cluster globular_cluster ( label="Globular Cluster" locus=[-80,60,0] N=3 color=#1a0a3a brightness=2.0 tube_color=#8844cc tube_thickness=3 ) {')
w('')

# Bright dense core — colour gradient from purple toward blue
w('    cluster core_region ( label="Core Region" locus=[0,0,0] N=2 color=#2a0a4a brightness=4.5 tube_color=#aa55ff tube_thickness=2 ) {')
for i, (x, y, z) in enumerate(fibonacci_sphere(50, 12)):
    t = i / 49
    rv = min(255, int(120 + t * 100))
    gv = min(255, int(80 + t * 60))
    bv = min(255, int(200 + t * 55))
    c = f'#{rv:02x}{gv:02x}{bv:02x}'
    sz = round(1.4 - t * 0.8, 1)
    w(nd(f'core_{i}', 'sphere', x, y, z, c, sz, f'Core-{i}', 6))
w('    }')
w('')

# Dimmer halo
w('    cluster halo_region ( label="Halo Region" locus=[0,0,0] N=2 color=#0a0a2a brightness=1.5 tube_color=#4422aa tube_thickness=2 ) {')
HALO_SH = ['sphere', 'sphere', 'sphere', 'sphere', 'icosahedron']
HALO_CO = ['#4433aa', '#4433aa', '#4433aa', '#4433aa', '#6655cc']
for i, (x, y, z) in enumerate(fibonacci_sphere(50, 30)):
    s = HALO_SH[i % 5]
    c = HALO_CO[i % 5]
    sz = 1.0 if s == 'icosahedron' else 0.5
    w(nd(f'halo_{i}', s, x, y, z, c, sz, f'Halo-{i}', 6))
w('    }')
w('')

# Outliers (sparse, far)
for i, (x, y, z) in enumerate(fibonacci_sphere(10, 45)):
    w(nd(f'outlier_{i}', 'sphere', x, y, z, '#221144', 0.4, f'Outlier-{i}', 4))
w('')
w('  }')
w('')

# ─── 4. CRYSTAL LATTICE — honeycomb/molecule arrangements ─────────────────────
w('  # ── Crystal Lattice  (hexagonal honeycomb unit cells)')
w('  cluster crystal_lattice ( label="Crystal Lattice" locus=[0,-110,0] N=3 color=#1a3a1a brightness=2.0 tube_color=#44cc44 tube_thickness=2 ) {')
w('')

UC_OFFSETS = [(-24, 0, 0), (0, 0, 0), (24, 0, 0)]
UC_PFX = ['cla', 'clb', 'clc']
UC_CO1 = ['#33aa33', '#44bb44', '#2299aa']     # base atom colour
UC_CO2 = ['#88ff88', '#99ff99', '#55ccdd']     # accent atom colour
UC_SH2 = ['octahedron', 'dodecahedron', 'sphere']
UC_MOD = [7, 7, 5]                              # every Nth atom is the accent type
for u, (ox, oy, oz) in enumerate(UC_OFFSETS):
    lbl = chr(65 + u)   # A, B, C
    tc = ['#55dd55', '#66ee66', '#44cc88'][u]
    w(f'    cluster unit_cell_{lbl.lower()} ( label="Unit Cell {lbl}" locus=[{ox},{oy},{oz}] N=2 color=#1a4a1a brightness=3.0 tube_color={tc} tube_thickness=2 ) {{')
    for i, (x, y, z) in enumerate(honeycomb_pts(3)):
        mod = UC_MOD[u]
        if i % mod == 0:
            s, c, sz = UC_SH2[u], UC_CO2[u], 1.5
        else:
            s, c, sz = 'sphere', UC_CO1[u], 1.0
        w(nd(f'{UC_PFX[u]}_{i}', s, x, y, z, c, sz, f'UC{lbl}-{i}', 6))
    w('    }')
    w('')

# Free lattice pivots
w('    node lattice_pivot_l ( shape=dodecahedron locus=[-12,0,0] label="LPivotL" color=#aaff44 size=2.0 )')
w('    node lattice_pivot_r ( shape=dodecahedron locus=[12,0,0]  label="LPivotR" color=#aaff44 size=2.0 )')
w('    node lattice_apex    ( shape=octahedron   locus=[0,9,0]   label="LApex"   color=#ffaa44 size=1.8 )')
w('    node lattice_base    ( shape=octahedron   locus=[0,-9,0]  label="LBase"   color=#ffaa44 size=1.8 )')
w('')
w('  }')
w('')

# ─── 5. NEBULA CLOUD — sphere surface ─────────────────────────────────────────
w('  # ── Nebula Cloud  (dense core + outer shell + mid-radius scatter)')
w('  cluster nebula_cloud ( label="Nebula Cloud" locus=[-60,-50,80] N=3 color=#3a1a0a brightness=1.5 tube_color=#cc4422 tube_thickness=3 ) {')
w('')

# Hot dense core — bright orange/yellow
w('    cluster dense_core ( label="Dense Core" locus=[0,0,0] N=2 color=#4a1a0a brightness=5.5 tube_color=#ff6633 tube_thickness=2 ) {')
DC_SH = ['sphere', 'sphere', 'sphere', 'sphere', 'sphere', 'tetrahedron']
for i, (x, y, z) in enumerate(fibonacci_sphere(45, 10)):
    t = i / 44
    rv = min(255, int(200 + t * 55))
    gv = min(255, int(80 + t * 80))
    bv = min(255, int(20 + t * 40))
    c = f'#{rv:02x}{gv:02x}{bv:02x}'
    sz = round(1.5 - t * 0.8, 1)
    s = DC_SH[i % 6]
    w(nd(f'dc_{i}', s, x, y, z, c, sz, f'DC-{i}', 6))
w('    }')
w('')

# Cooler outer shell — deeper red/brown
w('    cluster outer_shell ( label="Outer Shell" locus=[0,0,0] N=2 color=#3a1a0a brightness=2.0 tube_color=#aa3311 tube_thickness=2 ) {')
OS_SH = ['sphere', 'sphere', 'sphere', 'sphere', 'sphere', 'sphere', 'icosahedron']
for i, (x, y, z) in enumerate(fibonacci_sphere(45, 28)):
    t = i / 44
    rv = min(255, int(140 + t * 60))
    gv = min(255, int(50 + t * 50))
    bv = min(255, int(20 + t * 30))
    c = f'#{rv:02x}{gv:02x}{bv:02x}'
    sz = round(0.7 + t * 0.6, 1)
    s = OS_SH[i % 7]
    w(nd(f'os_{i}', s, x, y, z, c, sz, f'OS-{i}', 6))
w('    }')
w('')

# Mid-radius scatter
NEB_CO = ['#cc5522', '#dd6633', '#ee7744', '#ff8855', '#cc4411']
for i, (x, y, z) in enumerate(fibonacci_sphere(20, 18)):
    w(nd(f'neb_{i}', 'sphere', x, y, z, NEB_CO[i % 5], 0.6, f'Neb-{i}', 4))
w('')
w('  }')
w('')

w('}')
w('')

print(f'# node_count: {node_count[0]}', file=sys.stderr)
print('\n'.join(lines))
