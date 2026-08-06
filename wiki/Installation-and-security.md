# Installation and security

Phase 360 0.1.0 preview 1 has passed native package verification, but it does not carry a verified publisher identity.

## Windows x64

Use the installer for a normal per-user installation. Use the portable executable when you do not want an installed copy.

The current executables are unsigned and may trigger Microsoft SmartScreen. Verify the checksum before running either file. An unsigned package does not prove an authorised publisher.

PowerShell checksum example:

```powershell
Get-FileHash .\Phase-360-Setup-0.1.0-x64.exe -Algorithm SHA256
```

Compare the result with `SHA256SUMS-windows-x64.txt` or `SHA256SUMS-release.txt` from the same release.

## macOS

Open **Apple menu > About This Mac** before downloading:

- If the chip name starts with Apple, choose **Apple Silicon ARM64**.
- If the processor is identified as Intel, choose **Intel x64**.
- Use the DMG for normal drag-to-Applications installation. The ZIP carries the same application bundle.

The current macOS packages are ad-hoc signed and not notarised. Gatekeeper may stop the application after download. Verify the checksum first, then use Finder **Open** or the normal approval control in **System Settings > Privacy & Security** if your organisation permits this preview. Do not disable Gatekeeper globally.

macOS checksum example:

```bash
shasum -a 256 Phase-360-0.1.0-macOS-arm64.dmg
```

Compare the result with the matching architecture checksum file or `SHA256SUMS-release.txt` from the same release.

## Trust boundary

- SHA-256 proves byte equality with the verified package. It does not prove publisher identity.
- The Windows packages are not Authenticode signed.
- The macOS packages have no Developer ID identity, Apple Team ID or notarisation ticket.
- The release is a GitHub pre-release and must not be described as stable, signed or trusted.

For the recorded native checks and residual risks, read the [security audit](https://github.com/marcovittoriodallalibera/engine_calc/blob/main/docs/security-audit.md).

## Updating

Phase 360 does not currently update itself. Return to [Downloads](Downloads) for the version explicitly listed as the latest verified preview. Export important projects as JSON before replacing the application.
