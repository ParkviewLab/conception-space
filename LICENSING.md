<!--
SPDX-FileCopyrightText: 2026 Gary Frattarola <garyf@parkviewlab.ai>
SPDX-License-Identifier: CC-BY-4.0
-->

# Licensing

conception-space is **dual-licensed**, and different parts of the repository
carry different licenses. This file is the human-readable guide; the exact,
machine-readable license texts live in [`LICENSES/`](LICENSES/) — one file per
license, as required by the [REUSE](https://reuse.software) specification.

## The open-source option (default)

The **code** is free software under the **GNU Affero General Public License,
version 3 or (at your option) any later version** (`AGPL-3.0-or-later`). You
may use, study, modify, and redistribute it under those terms.

Note the AGPL's network clause (section 13): if you run a modified version and
let users interact with it over a network, you must offer them the
corresponding source.

Full text: [`LICENSE`](LICENSE) (also `LICENSES/AGPL-3.0-or-later.txt`).

## The commercial option

If you cannot or prefer not to comply with the AGPL — for example to embed
conception-space in a closed-source product, or to avoid the source-disclosure
obligation — a **separate commercial license** is available from the copyright
holder.

> **Commercial licensing — Gary Frattarola — garyf@parkviewlab.ai**

## What each part of the repository is licensed under

| Part | License |
|---|---|
| Source code, build scripts, example scenes, configuration, lockfiles | **`AGPL-3.0-or-later`** — or the commercial license above |
| Documentation (`docs/`, `README.md`, this file) | **`CC-BY-4.0`** |
| ParkviewLab logo and brand assets | **All rights reserved** (`LicenseRef-AllRightsReserved`) — *not* covered by the AGPL or the commercial grant |

Licensing is machine-verifiable: every file carries an SPDX tag or is annotated
in [`REUSE.toml`](REUSE.toml), and the repository passes `reuse lint`.

### A note on the layout

Three similar-looking things, three jobs:

- [`LICENSE`](LICENSE) — a copy of the AGPL text at the repository root, kept so
  GitHub detects and displays the license.
- [`LICENSES/`](LICENSES/) — the canonical license texts for tooling (REUSE),
  one file per SPDX identifier.
- `LICENSING.md` (this file) — the human explanation of the dual-license model.

Copyright © 2026 Gary Frattarola <garyf@parkviewlab.ai>
