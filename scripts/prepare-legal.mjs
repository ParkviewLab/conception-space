// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Gary Frattarola <garyf@parkviewlab.ai>
//
// prepare-legal.mjs — assemble the packaged legal/ notice bundle.
//
// Recreates legal/ and copies in the project's own license texts plus Electron's
// own Chromium/Node third-party notices. electron-builder DELETES
// LICENSES.chromium.html from the macOS .app (and only leaves it next-to-binary
// on Win/Linux), so we ship our own copy for one stable, cross-platform path.
// The npm-dependency notices (THIRD-PARTY-NOTICES.txt) and the structured list
// (oss-licenses.json) are produced by the `legal:notices` / `legal:list` npm
// scripts; this file only does fs copies so it stays dependency-free.
//
// legal/ is gitignored — it is a build artifact, regenerated before packaging.

import { rm, mkdir, copyFile, cp } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const legal = join(root, 'legal')
const electronDist = join(root, 'node_modules', 'electron', 'dist')

await rm(legal, { recursive: true, force: true })
await mkdir(legal, { recursive: true })

// Project license texts.
await copyFile(join(root, 'LICENSE'), join(legal, 'LICENSE.txt'))
await copyFile(join(root, 'LICENSING.md'), join(legal, 'LICENSING.md'))
await cp(join(root, 'LICENSES'), join(legal, 'LICENSES'), { recursive: true })

// Electron's bundled Chromium/Node notices (electron drops these from the mac .app).
await copyFile(join(electronDist, 'LICENSES.chromium.html'), join(legal, 'LICENSES.chromium.html'))
await copyFile(join(electronDist, 'LICENSE'), join(legal, 'LICENSE.electron.txt'))

console.log('legal/ prepared (project licenses + Electron Chromium/Node notices)')
