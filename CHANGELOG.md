<!--
SPDX-FileCopyrightText: 2026 Gary Frattarola <garyf@parkviewlab.ai>
SPDX-License-Identifier: CC-BY-4.0
-->

# Changelog

All notable changes to this project are recorded here.

## [Unreleased]

## [v0.8.8] - 2026-09-27

### Highlights

This release contains no user-facing changes: it switches the project's own merge and release process from squash merges and a direct back-merge to merge commits and a back-merge pull request, updates the version-guard and changelog workflows to pinned dev-tools v1.5.1, re-assembles the dev-release workflow, and re-syncs the agent instruction files. Contributor documentation has been updated to describe the merge-commit workflow and the back-merge pull request that closes a release.

### Maintenance

- Merge commits and the checked back-merge pull request (#32)

## [v0.8.7] - 2026-09-27

### Highlights

The About box now reads the application version at runtime rather than from a value inlined at build time, and the packaged app no longer bundles the `.claude/` directory. Documentation has been corrected against the shipped code: the README and CONTRIBUTING notes on the AppImage name, signing and release steps, and the CNS language reference and its HTML copies, where a non-existent node attribute was removed, attribute defaults, colour forms, edge labels and whitespace separation were fixed, and the worked example now parses cleanly; bookmark glide notes also state the real 5-second flight. The remainder is build and CI work, including an electron-builder pin that keeps macOS signing working, plus a new notebook studying a possible port off Electron to Rust.

### Bug fixes

- Electron-builder 26.16.1, so macOS signing keeps working (#27)
- Read the version at runtime, and correct the documents before the release (#31)

### Docs

- Add rust_port_ideas notebook (off-Electron study; three.js → Rust) (#26)

### Maintenance

- Drop the shallow re-fetch from the version guard (#28)
- Assemble the release workflows from the handbook's parts (#29)
- Generate the changelog with dev-tools' shared script (#30)

## [v0.8.6] - 2026-07-20

### Highlights

This is a maintenance release with no user-visible changes: the workflow and script comments describing macOS signing status and the electron 43 extraction mechanism have been corrected, and an inert yauzl dependency override was removed without affecting lockfile resolution.

### Docs

- V0.8.5 [skip ci] (68fe52b)
- Correct stale "unsigned" comment headers (macOS is signed + notarized) (#25) (2fb74c3)

## [v0.8.5] - 2026-07-20

### Highlights

A maintenance release with no user-visible feature changes: Electron is upgraded from 34 to 43 to pick up current Chromium and Node security fixes, the build toolchain is refreshed to electron-vite 5 and vite 7, and residual npm advisories in undici and @babel/core are cleared. A CI fix ensures Electron 43's prebuilt is fully extracted before the legal step, unblocking packaged builds on all three platforms.

### Bug fixes

- Upgrade Electron 34 → 43 (security) (#20) (bfc57f1)

### Docs

- V0.8.4 [skip ci] (4c3e675)

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

