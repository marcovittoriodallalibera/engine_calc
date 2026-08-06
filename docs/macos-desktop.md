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

After changing the Electron fuse wire, the packaging step applies an explicit ad-hoc signature to the complete application bundle on both architectures. The native verifier requires every Mach-O to retain valid ad-hoc code integrity. This permits local execution and code-integrity verification but does not identify an authorised publisher.

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

## Native verification evidence

[GitHub Actions run 31079396042](https://github.com/marcovittoriodallalibera/engine_calc/actions/runs/31079396042) completed successfully for source commit `cc3ac36caf7791f4143f3b2c5587de556708bb1f`:

- ARM64 job `92544516704` ran natively on the `macos-15` Apple Silicon image and completed successfully.
- Intel job `92544514358` ran natively on the `macos-15-intel` x64 image and completed successfully.
- ARM64 artefact `phase-360-macos-arm64-cc3ac36caf7791f4143f3b2c5587de556708bb1f`, artefact ID `8958878074`, has GitHub archive digest `sha256:62c8bb0f66e4faa7f641bb67dc3f48d6d200f0a5024d6e25523dd91ddb451bc6`.
- Intel artefact `phase-360-macos-x64-cc3ac36caf7791f4143f3b2c5587de556708bb1f`, artefact ID `8958927081`, has GitHub archive digest `sha256:a12de1e853c95b55b942b744b796b016d6668c053462d1ef03b3c025084dda09`.
- The retained architecture-specific checksum, verification, fuse and smoke records bind the individual DMG and ZIP hashes, complete bundle manifests, native architecture, macOS 15 runner class, toolchain, dependency audit, package smoke results, ad-hoc signature classification, absent Apple Team ID, absent notary tickets and recorded Gatekeeper state to that commit.

These artefacts expire on 5 September 2026 under the workflow's 30-day retention policy. They are verified internal candidates, not trusted public releases.

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

The initial packages are ad-hoc signed and not notarised. They are internal candidates or explicitly labelled GitHub pre-release packages and may be stopped by Gatekeeper when downloaded. After verifying the checksum, an authorised tester may use the normal Finder Open or macOS Privacy & Security approval flow when organisational policy permits it. Gatekeeper must never be disabled globally for this application.

Trusted public distribution or use of the stable release channel outside the Mac App Store requires all of the following:

- `Developer ID Application` signature from the expected Apple Team ID
- strict post-package code-signature verification
- effective hardened runtime on the final application
- Apple notarisation acceptance
- stapled application and DMG tickets
- Gatekeeper acceptance while policy is active

The verifier supports a fail-closed `developer-id` expectation with an explicit Team ID. The build configuration and protected workflow credentials must be changed before that mode is used. Certificates, private keys, passwords and App Store Connect API keys must remain in protected secrets and must never be written to source, uploaded artefacts or logs.

Apple describes Developer ID as the publisher-identity mechanism for applications distributed outside the Mac App Store and notarisation as a separate malware and signing check. See [Signing Mac software with Developer ID](https://developer.apple.com/developer-id/) and [Notarising macOS software before distribution](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution).

## Known limits

- The internal or pre-release package does not provide verified publisher identity or notarisation.
- Local project data is not encrypted by the application.
- No automatic updater, backend project store or telemetry transport is present.
- ZIP cannot itself carry a stapled ticket; a future public ZIP must contain the already signed, notarised and stapled application.
- A configured `hardenedRuntime` value is not evidence that the final ad-hoc bundle has effective hardened runtime.
- macOS ARM64 and Intel compatibility remain separate claims tied to separate native workflow records.
