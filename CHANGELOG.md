<!--
SPDX-FileCopyrightText: 2026 Gary Frattarola <garyf@parkviewlab.ai>
SPDX-License-Identifier: CC-BY-4.0
-->

# Changelog

All notable changes to this project are recorded here.

## [Unreleased]

## [v0.8.1] - 2026-06-15

### Highlights

This is a maintenance release with no user-facing changes to the visualiser itself. It fixes the release CI so installer artifacts are correctly attached to GitHub releases (v0.8.0's installers had to be uploaded by hand), and tightens the dev-build pipeline to refuse producing dev builds that would be indistinguishable from a real release.

### Bug fixes

- Release attaches files only; dev-release requires a dev-cycle version (#8) (4717363)

### Docs

- V0.8.0 [skip ci] (6f55bf5)

## [v0.8.0] - 2026-06-15

### Highlights

First tagged release of conception-space as a pure Electron desktop app at the repo root, with a branded installer (B&W ParkviewLab mark) built for macOS, Windows, and Linux via electron-builder. The bundled solar.cns example and CNS language reference have been reconciled against the actual parser, and the README documents install steps including the unsigned-launch fallbacks for macOS "Open Anyway" and Linux AppImage `chmod +x`.

