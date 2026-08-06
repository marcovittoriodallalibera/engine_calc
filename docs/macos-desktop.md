# macOS desktop distribution

## Supported release surface

Phase 360 is packaged as separate thin applications for:

- Apple Silicon: `arm64`
- Intel: `x64`

Each architecture produces a DMG for normal drag-to-Applications installation and a ZIP containing the same application bundle. No universal binary is claimed. The configured minimum is macOS 12.0 because Electron 43 supports that baseline, but compatibility is claimed only for the exact native runner environments retained by a successful release workflow.

Mac App Store, PKG, automatic updates, Rosetta-only verification and operating-system versions outside the retained evidence are not supported by this release.

## Offline behaviour and local data

The renderer, styles, calculation kernel and schema-version-6 project code are inside `app.asar`. The application loads them through `phase360://app/` and never loads or falls back to the production website. Calculation, local continuity, validated JSON import and export, SVG export and print work without network access.

Approved methodology references open in the system browser. Project content is not sent to a backend, updater or telemetry service.

The latest valid project is retained in the dedicated Electron profile, normally below the current user's macOS Application Support directory. It is plain local-storage data, not an encrypted project vault. Clear local data removes recognised retained project keys after confirmation but does not remove files deliberately exported by the user.

## Native application menu

The Mac package supplies the normal application, edit and window roles, including About, Services, Hide, Quit, Undo, Redo, Cut, Copy, Paste, Select All, Minimise, Zoom, Close and Bring All to Front. Packaged menus contain no reload or developer-tools action. The menu adds no preload, IPC, Node or navigation capability.

## Security boundary

The macOS and Windows packages share the same Electron controls:

- process and renderer sandboxing
- context isolation and web security
- no Node integration, preload or IPC bridge
- packaged custom origin and restrictive desktop CSP
- renderer network, navigation, popup, device and media denial
- exact external-reference origin allowlist
- user-gesture-limited JSON and SVG Blob downloads
- embedded ASAR integrity and application-only ASAR loading
- hardened Electron fuses verified from the packaged executable

On Apple Silicon the fuse step resets the required ad-hoc signature after changing the Electron binary. This permits local execution and code-integrity verification but does not identify an authorised publisher.

## Local build

Install from the committed lockfile and run the build matching the host processor:

```bash
npm ci
npm audit
npm test
npm run desktop:dist:mac:arm64
```

For an Intel host use:

```bash
npm run desktop:dist:mac:x64
```

Building an x64 package under Rosetta can be a secondary packaging check, but it is not native Intel verification.

## Build outputs

For version `0.1.0`, each architecture produces:

- `Phase-360-0.1.0-macOS-<arch>.dmg`
- `Phase-360-0.1.0-macOS-<arch>.zip`
- `SHA256SUMS-macos-<arch>.txt`
- `macos-verification-<arch>.json`
- `electron-fuses-macos-<arch>.json`
- separate unpacked, DMG and ZIP smoke records

The GitHub workflow uses `macos-15` for ARM64 and `macos-15-intel` for x64. Each job installs the lockfile, audits dependencies, runs the complete test suite, builds only its native architecture, verifies the final packages and retains one architecture-labelled artefact.

## Native package verification

The verifier must run on the matching native architecture:

```bash
node scripts/verify-macos-package.mjs \
  --dist-dir desktop-dist \
  --arch arm64 \
  --expected-signature unsigned
```

It verifies:

- native runner and every executable Mach-O slice
- bundle identifier, application version and configured minimum macOS version
- DMG checksum integrity and `/Applications` link
- metadata-preserving ZIP extraction
- strict nested code integrity
- Electron fuses from the final executable
- equality of the unpacked, DMG and ZIP application executables
- packaged custom origin, Node isolation, CSP, network and popup denial
- denied geolocation, deterministic calculation and project round trip
- local-storage persistence across reload and single clean application window
- actual signature classification, Team ID, hardened-runtime flag, notary tickets and Gatekeeper assessment
- source commit, toolchain, package sizes and SHA-256 hashes

The verifier records when Gatekeeper policy is disabled on a development host rather than treating that override as public-release acceptance.

## Checksum verification

On macOS:

```bash
shasum -a 256 Phase-360-0.1.0-macOS-arm64.dmg
shasum -a 256 Phase-360-0.1.0-macOS-arm64.zip
```

Compare the results with `SHA256SUMS-macos-arm64.txt` and `macos-verification-arm64.json`. Replace `arm64` with `x64` for the Intel package. A matching hash proves byte equality with the verified candidate, not publisher identity.

## Gatekeeper, Developer ID and notarisation

The initial packages are ad-hoc signed and not notarised. They are internal candidates and may be stopped by Gatekeeper when downloaded. After verifying the checksum, an authorised internal tester may use the normal Finder Open or macOS Privacy & Security approval flow. Gatekeeper must never be disabled globally for this application.

Public distribution outside the Mac App Store requires all of the following:

- `Developer ID Application` signature from the expected Apple Team ID
- strict post-package code-signature verification
- effective hardened runtime on the final application
- Apple notarisation acceptance
- stapled application and DMG tickets
- Gatekeeper acceptance while policy is active

The verifier supports a fail-closed `developer-id` expectation with an explicit Team ID. The build configuration and protected workflow credentials must be changed before that mode is used. Certificates, private keys, passwords and App Store Connect API keys must remain in protected secrets and must never be written to source, uploaded artefacts or logs.

Apple describes Developer ID as the publisher-identity mechanism for applications distributed outside the Mac App Store and notarisation as a separate malware and signing check. See [Signing Mac software with Developer ID](https://developer.apple.com/developer-id/) and [Notarising macOS software before distribution](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution).

## Known limits

- The internal package does not provide verified publisher identity or notarisation.
- Local project data is not encrypted by the application.
- No automatic updater, backend project store or telemetry transport is present.
- ZIP cannot itself carry a stapled ticket; a future public ZIP must contain the already signed, notarised and stapled application.
- A configured `hardenedRuntime` value is not evidence that the final ad-hoc bundle has effective hardened runtime.
- macOS ARM64 and Intel compatibility remain separate claims tied to separate native workflow records.
