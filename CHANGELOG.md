<!--
SPDX-FileCopyrightText: 2026 Gary Frattarola <garyf@parkviewlab.ai>
SPDX-License-Identifier: CC-BY-4.0
-->

# Changelog

All notable changes to this project are recorded here.

## [Unreleased]

## [v0.8.4] - 2026-06-25

### Highlights

This release is documentation and CI maintenance only, with no user-visible changes to the application. The README gains a new tagline ("Build and navigate 3D spaces for thinking / Hand-place and sculpt ideas / See unplanned connections"), and the docs tree picks up a draft user intro aimed at PKM users, a visionOS/Vision Pro ideas notebook, and substantial revisions to the northstar (new concepts on modes of representation and the visual↔symbolic discovery loop, plus Axiom 8 establishing the canonical space as the single source of truth).

### Docs

- V0.8.3 [skip ci] (08713af)
- Add visionos_ideas notebook + northstar projection/modes concept (#15) (c57f699)
- Add user intro for PKM users (MD + app-styled HTML) (#16) (01f6040)
- Add in-flight idea — a projections menu + auto-generated projections (#17) (dc7ab31)
- Add opening abstract to visionos_ideas notebook (#18) (19b6f6c)

## [v0.8.3] - 2026-06-21

### Highlights

The macOS arm64 .dmg is now signed with an Apple Developer ID and notarized, so Apple-Silicon users can install it without Gatekeeper warnings; Windows and Linux builds remain unsigned. The rest of the release fixes CI breakages in the legal-notices step that had blocked the v0.8.2 build, ensuring Electron's Chromium and Node notices are packaged completely.

### Bug fixes

- Ensure Electron's prebuilt is present for its notices in CI (#11) (2710666)
- Pin yauzl to fix partial electron dist extraction on CI (#12) (e3f7a7d)

### Docs

- V0.8.2 [skip ci] (ac4291d)

### Features

- Sign and notarize the macOS build (Apple Developer ID) (#14) (1bbb8ec)

## [v0.8.2] - 2026-06-16

### Highlights

The app now ships third-party license notices as a packaged legal bundle and exposes them through a new Help → Open Source Licenses window, which lists the bundled packages and links to the full notice files. The About dialog gains a GitHub source-code link, and the Help menu is now available on Windows and Linux rather than macOS only. The remaining changes fix CI packaging failures so the notices are reliably present in release builds.

### Bug fixes

- Ensure Electron's prebuilt is present for its notices in CI (#11) (ad6975c)
- Pin yauzl to fix partial electron dist extraction on CI (#12) (1681b10)

### Docs

- V0.8.1 [skip ci] (3911fb9)

### Features

- In-app Open Source Licenses viewer + packaged legal/ notice bundle (#10) (2a851e0)

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

