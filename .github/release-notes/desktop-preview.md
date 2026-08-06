# Phase 360 desktop preview

This is a verified desktop preview for evaluation and testing. It is not a trusted public release.

## Downloads

- Windows x64 installer and portable executable
- macOS Apple Silicon ARM64 DMG and ZIP
- macOS Intel x64 DMG and ZIP
- Platform checksums, consolidated checksums and machine-readable verification evidence

## Verification status

All packages are rebuilt from the tagged source and pass the complete test suite, dependency audit and native packaged smoke checks before this pre-release can be created. The publish job reconciles every package hash and byte size against its native verification manifest.

## Trust limitations

- Windows packages are unsigned and may trigger Microsoft SmartScreen. They do not identify an authorised publisher.
- macOS packages are ad-hoc signed and not notarised. Gatekeeper may block them and they do not identify an authorised publisher.
- Verify the matching SHA-256 checksum before opening a package.
- Do not disable Gatekeeper globally.

The release is marked as a GitHub pre-release and is intentionally excluded from GitHub's stable `latest` release channel.
