# Phase 360 desktop preview

This is a verified desktop preview for evaluation and testing. It is not a trusted public release.

## What changed in 0.1.1 preview 1

- Engineering charts have been distilled into a clearer hierarchy with direct labels, cleaner comparison cues and less duplicated chart furniture.
- Compact screens now use a persistent result-chapter selector and a concise engine summary, while the responsive transmission chart keeps every configured gear visible.
- Hidden 0-100 character scores have been replaced with source-qualified annotations in engineering units. Each annotation states its evidence level, applicability, uncertainty and method limits.
- A4 output has been refined for both browser and Electron printing, including clearer chart, diagnostics, transmission and methodology pages.
- Engine-character guidance remains a contextual, uncalibrated interpretation of the selected reference profile. It is not a simulated dyno curve or a power and torque prediction.

## Downloads

- Windows x64 installer and portable executable
- macOS Apple Silicon ARM64 DMG and ZIP
- macOS Intel x64 DMG and ZIP
- Platform checksums, consolidated checksums and machine-readable verification evidence

## Verification status

All packages are rebuilt from the tagged source and pass the complete test suite, dependency audit and native packaged smoke checks before this pre-release can be created. The publish job reconciles every package hash and byte size against its native verification manifest.

Calculation results are separated into calculated geometry, contextual heuristics and modelled or measured evidence. Refer to the in-app methodology and release evidence before using any recommendation outside its stated operating scope.

## Trust limitations

- Windows packages are unsigned and may trigger Microsoft SmartScreen. They do not identify an authorised publisher.
- macOS packages are ad-hoc signed and not notarised. Gatekeeper may block them and they do not identify an authorised publisher.
- Verify the matching SHA-256 checksum before opening a package.
- Do not disable Gatekeeper globally.

The release is marked as a GitHub pre-release and is intentionally excluded from GitHub's stable `latest` release channel.
