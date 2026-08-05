# Windows desktop distribution

## Supported release surface

The initial desktop target is Windows x64. It produces a per-user NSIS installer and a portable executable. Windows x86, Windows ARM64, MSIX, machine-wide installation and automatic updates are not supported by this release.

The same schema-version-6 project validator, migrations, calculation kernel, presentation model and React workbench are used by the web and desktop applications. Electron is a local packaging and host boundary, not a second calculation implementation.

## Offline behaviour

The workbench, styles, calculation code and project code are packaged inside `app.asar`. The application loads them through `phase360://app/` and never loads or falls back to the production website. Calculation, local continuity, JSON import and export, SVG export and print work without network access.

Methodology references are the only external destinations. An exact HTTPS origin allowlist opens them in the user's system browser. If the computer is offline, the reference may fail to open but the calculator remains usable.

## Local data

The latest valid project is retained in the dedicated Electron user profile, normally under the current Windows user's application-data directory. It is plain local-storage data, not an encrypted project vault. Electron cookie encryption is enabled, but that fuse does not encrypt local storage.

Clear local data removes current and recognised legacy project keys after confirmation. It does not delete JSON or SVG files that the user explicitly exported. A corrupt stored payload is preserved and automatic saving pauses until the user edits, imports, resets or clears the local state.

The Share action creates a canonical HTTPS fragment locally. Project content is not sent to a project backend and the private `phase360` scheme is never copied. JSON remains the reliable exchange format for projects that exceed the link limit.

## Security model

The packaged host applies these controls:

- Electron process sandbox and renderer sandbox
- context isolation and web security enabled
- Node integration, Node workers, Node subframes, webviews, preload and IPC bridges disabled or absent
- dedicated persistent `persist:phase360` session
- only contained, recognised packaged asset types served by the custom protocol
- remote renderer HTTP, HTTPS, WebSocket and FTP requests cancelled
- strict desktop CSP with no inline script, evaluation, remote connection, object, frame, worker, form or media capability
- renderer navigation and popup creation denied
- device, media and general browser permissions denied
- only sanitised clipboard write allowed for the explicit Share action
- JSON and SVG downloads limited to user-generated Blob URLs, safe filenames and user gestures
- exact-origin allowlist for methodology links opened by the operating-system browser
- hardened Electron fuses verified from the final executable

Application content, the Electron main process and the local renderer are kept inside `app.asar`. Embedded ASAR integrity and `OnlyLoadAppFromAsar` work together to prevent fallback to an unvalidated application directory. This protects packaged-content integrity but does not identify the publisher.

## Local build and smoke test

Install from the committed lockfile and run:

```bash
npm ci
npm audit
npm test
npm run desktop:smoke
```

The smoke mode starts an invisible window and writes `phase360-smoke-report.json` in the operating-system temporary directory. It verifies the packaged origin, workbench and diagram, absence of Node and `require` in the renderer, inline-script and remote-request blocking, denied geolocation, blocked popup creation, the deterministic 51 mm stroke, 97 mm rod and 33-degree result, a schema-version-6 project round trip, local-storage persistence across reload and a single clean application window.

An unbundled macOS or Linux smoke is useful implementation evidence but is not Windows verification.

## Build outputs

The native Windows workflow runs:

```bash
npm run desktop:dist:win
pwsh -NoProfile -File scripts/verify-windows-package.ps1 -DistDir desktop-dist -ExpectedSignature NotSigned
```

Successful verification retains:

- `Phase-360-Setup-<version>-x64.exe`
- `Phase-360-Portable-<version>-x64.exe`
- `SHA256SUMS.txt`
- `windows-verification.json`
- `electron-fuses.json`
- separate unpacked, portable and installed smoke records

The workflow verifies the AMD64 header on the application executable. Installer and portable launchers may use a different PE stub architecture, so their PE headers are validated without incorrectly treating the stub as the packaged application payload.

## Native Windows verification

The package verifier launches the actual `win-unpacked` application, the portable executable and the installed NSIS application. It checks that every smoke report is packaged, `win32`, x64 and successful. It installs into a unique runner temporary directory and runs the uninstaller after the installed smoke.

The machine-readable record binds application version, source commit, native runner, Node, Electron and electron-builder versions, artefact names, byte sizes, hashes, fuse state, smoke evidence, installation result and signing status. An executable without this matching record is an unverified build.

## Checksum verification

On Windows PowerShell:

```powershell
Get-FileHash .\Phase-360-Setup-0.1.0-x64.exe -Algorithm SHA256
Get-FileHash .\Phase-360-Portable-0.1.0-x64.exe -Algorithm SHA256
```

Compare each value with `SHA256SUMS.txt` and `windows-verification.json`. A matching hash proves that the received bytes match the verified candidate. It does not prove who published them.

## Authenticode signing

The initial pipeline explicitly expects `NotSigned`. These outputs are internal test artefacts and may trigger Microsoft SmartScreen. They are not eligible for trusted public promotion.

A public Windows release requires authorised signing credentials in a protected build environment, `Get-AuthenticodeSignature` status `Valid`, the expected publisher identity and a retained post-build verification result. Credentials must never be stored in source, artefacts or logs. The workflow must change its expected status to `Valid` only when that controlled signing path exists.

## Known limits

- Local project data is not encrypted by the application.
- No automatic updater is present.
- No backend account, project store or telemetry transport is present.
- Approved external references still need normal network access in the system browser.
- ASAR integrity and SHA-256 do not replace Authenticode publisher identity.
- Compatibility is claimed only for the Windows x64 environment recorded by the native workflow.
