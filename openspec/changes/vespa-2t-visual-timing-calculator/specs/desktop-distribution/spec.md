## Purpose

Defines the offline Windows and macOS desktop distributions, hardened Electron runtime boundary, native-build evidence, artefact integrity, signing and notarisation policy, and supported-platform limits for the same client-only Phase 360 calculator.

## ADDED Requirements

### Requirement: Offline packaged Windows application
The system SHALL provide a Windows x64 desktop application whose renderer, styles, calculation code, and project-validation code are packaged locally. Editing, calculation, local continuity, validated JSON import and export, SVG export, and print SHALL NOT require a network connection. The desktop application SHALL NOT load or fall back to hosted application code.

#### Scenario: Launch without network access
- **WHEN** the packaged executable is launched on a supported Windows x64 host without network access
- **THEN** the workbench loads from packaged assets and a known project produces the same deterministic results as the tested web build

#### Scenario: Hosted application is unavailable
- **WHEN** the public web application is unavailable
- **THEN** the packaged desktop application remains usable and does not attempt to replace missing local content with remote content

#### Scenario: Packaged content is missing or invalid
- **WHEN** a required packaged renderer asset cannot be resolved or fails the packaged-content boundary
- **THEN** the desktop application fails closed with a local error and does not navigate to a hosted fallback

### Requirement: Hardened Electron host boundary
The desktop host SHALL enable renderer sandboxing, context isolation and web security, disable Node integration, deny renderer network access, device and media permissions, renderer-created windows, and navigation away from the packaged application origin. It SHALL expose no preload bridge or Electron or Node API to the renderer. Sanitised clipboard write MAY be granted only to the main packaged workbench for an explicit user copy action. The packaged build SHALL disable Electron run-as-Node and debug-enabling environment or command-line fuses, validate the embedded application archive, and load application code only from that archive. The desktop Content Security Policy SHALL deny remote scripts, remote connections, frames, objects, forms, workers, media, and code evaluation.

#### Scenario: Renderer attempts privileged access
- **WHEN** renderer content attempts to access `require`, Node `process`, Electron APIs, a remote connection, or an undeclared bridge
- **THEN** those capabilities are unavailable

#### Scenario: Content requests a device or media permission
- **WHEN** renderer content requests a browser device or media permission
- **THEN** the host denies the request without prompting

#### Scenario: User copies a share reference
- **WHEN** the user explicitly activates the Share action from the packaged workbench
- **THEN** only sanitised clipboard write may be granted and the copied value is the locally generated canonical HTTPS fragment

#### Scenario: Content attempts navigation
- **WHEN** content attempts to navigate the application window or create a new window
- **THEN** the host blocks the in-application navigation

#### Scenario: User opens an approved reference
- **WHEN** the user explicitly activates a reference whose HTTPS origin matches the version-controlled external-document allowlist
- **THEN** the destination opens in the system browser and never inside the application window

#### Scenario: Packaged path escapes its root
- **WHEN** a custom-scheme request contains traversal, an unsupported method, unsupported type, or a path outside the packaged renderer root
- **THEN** the request is rejected without filesystem disclosure

### Requirement: Desktop project continuity and privacy
The desktop application SHALL use the same bounded schema, validation, migration, local continuity, clear-data action, and portable JSON format as the web application. Project content SHALL remain in the local desktop profile or an explicitly selected export or share representation and SHALL NOT be sent to telemetry, an updater, a project backend, or an external service.

#### Scenario: Resume and clear a desktop project
- **WHEN** a valid project was saved in the same operating-system user profile and the application is reopened
- **THEN** it restores the same authoritative inputs, recalculates all results, and removes only retained profile data when the user confirms Clear local data

#### Scenario: Exchange a project with the web application
- **WHEN** the user exports a valid desktop project and imports it into a compatible web build
- **THEN** the same schema validation and deterministic recalculation apply without desktop-specific authoritative fields

#### Scenario: Create a desktop share reference
- **WHEN** a desktop share action is requested
- **THEN** the application creates a fragment over the configured canonical HTTPS origin locally and never exposes its custom-scheme URL

### Requirement: Traceable Windows artefacts
A release build SHALL run natively on Windows from the committed lockfile and SHALL produce an x64 installer executable, an x64 portable executable, SHA-256 checksums, and a machine-readable build manifest. The manifest SHALL identify application version, source commit, target architecture, native runner, Node and Electron versions, artefact names, byte sizes, hashes, fuse verification, smoke results, and signing status. Runtime auto-update SHALL remain disabled unless separately specified and secured.

#### Scenario: Build a Windows candidate
- **WHEN** the native Windows release workflow completes from a tested commit
- **THEN** the installer, portable executable, checksum file, smoke records, fuse record, and build manifest refer to that same commit and are retained together

#### Scenario: Verify an artefact hash
- **WHEN** a recipient calculates SHA-256 for either distributable executable
- **THEN** it matches the corresponding manifest and checksum entry

#### Scenario: Build identity is incomplete
- **WHEN** an artefact cannot be tied to its source commit, architecture, checksum, fuse state, native smoke evidence, and signing status
- **THEN** it is not eligible to be described as a verified release candidate

### Requirement: Native Windows smoke-test gate
A Windows executable SHALL be described as verified only after a smoke test runs the packaged application natively on Windows and records the exact artefact context. The smoke test SHALL prove local custom-origin start-up, renderer isolation, restrictive CSP, blocked remote access and popup creation, one known deterministic calculation, local persistence across reload, portable project round-trip, and clean shutdown without a hosted-code dependency. The installer SHALL additionally install per user and uninstall cleanly.

#### Scenario: Portable executable passes native smoke
- **WHEN** the portable executable is run by the Windows smoke harness
- **THEN** every required check passes and the record contains application version, source commit, architecture, and Windows runner version

#### Scenario: Installer passes native smoke
- **WHEN** the installer candidate is installed in its supported per-user mode
- **THEN** the installed executable starts, passes the same local-runtime checks, and can be uninstalled cleanly

#### Scenario: A smoke check fails
- **WHEN** any required native check fails or no matching record exists
- **THEN** the artefact remains an unverified build and is not promoted

### Requirement: Explicit signing status and public-release gate
Every Windows artefact SHALL state whether it is unsigned or Authenticode-signed. A checksum SHALL NOT be presented as a code signature. Unsigned artefacts MAY be retained for internal testing with a Microsoft SmartScreen limitation, but public distribution SHALL require a valid Authenticode signature from the expected publisher and successful post-build signature verification. Signing credentials SHALL remain outside source, artefacts, and logs.

#### Scenario: No signing certificate is configured
- **WHEN** the native build succeeds without signing credentials
- **THEN** the artefact is labelled unsigned, its SmartScreen limitation is documented, and it is not described as a trusted public release

#### Scenario: A signed release is produced
- **WHEN** authorised signing credentials are supplied through the protected build environment
- **THEN** Windows reports a valid signature from the expected publisher and the release record contains the verification result without exposing credentials

#### Scenario: Signature verification fails
- **WHEN** the executable is unsigned unexpectedly, the publisher differs, or signature verification is not valid
- **THEN** public promotion is blocked even when the checksum matches

### Requirement: Declared Windows support and limits
The release documentation SHALL state the exact Windows architecture and native Windows environment used for verification. The initial desktop target SHALL be Windows x64 only. Windows x86, ARM64, automatic updates, MSIX distribution, machine-wide installation, hosted-code fallback, backend storage, and operating-system encryption guarantees SHALL remain unsupported unless separately implemented and verified.

#### Scenario: Run on an unverified platform
- **WHEN** an artefact is used on an architecture or Windows version outside the declared release surface
- **THEN** the documentation does not claim compatibility and directs the user to a supported build

#### Scenario: Use an external reference offline
- **WHEN** the user activates an approved external reference without network access
- **THEN** the calculator remains usable and only the system-browser reference fails or waits according to normal operating-system behaviour

### Requirement: Offline packaged macOS applications
The system SHALL provide separate Apple Silicon `arm64` and Intel `x64` macOS applications whose renderer, styles, calculation code, and project-validation code are packaged locally. Each architecture SHALL produce a DMG and ZIP carrying the same application bundle. Editing, calculation, local continuity, validated JSON import and export, SVG export, and print SHALL NOT require a network connection. The macOS applications SHALL NOT load or fall back to hosted application code.

#### Scenario: Launch natively on Apple Silicon
- **WHEN** the `arm64` package is launched on a supported Apple Silicon host without network access
- **THEN** the workbench loads from packaged assets and produces the same deterministic results as the tested web and Windows builds

#### Scenario: Launch natively on Intel
- **WHEN** the `x64` package is launched on a supported Intel host without network access
- **THEN** the workbench loads from packaged assets and produces the same deterministic results as the tested web and Windows builds

#### Scenario: macOS package content is unavailable
- **WHEN** a required packaged renderer asset is missing, invalid, or outside the packaged-content boundary
- **THEN** the application fails closed locally and does not navigate to a hosted fallback

### Requirement: Native macOS application menu
The packaged macOS application SHALL provide native application, edit, and window menus with the standard About, Services, Hide, Quit, Undo, Redo, Cut, Copy, Paste, Select All, Minimise, Zoom, Close, and Bring All to Front roles. A packaged menu SHALL NOT expose reload or developer-tools roles and SHALL NOT add preload, IPC, Node, navigation, or remote-content capabilities. Windows MAY continue to suppress its application menu.

#### Scenario: Use standard macOS editing and window commands
- **WHEN** the user activates a supported native menu role or its normal Command-key shortcut
- **THEN** the focused field or window receives the normal operating-system action without expanding renderer privilege

#### Scenario: Inspect the packaged menu
- **WHEN** the production application menu is created on macOS
- **THEN** no reload or developer-tools role is present

### Requirement: Traceable macOS artefacts
Each release build SHALL run from the committed lockfile on a native runner matching its target architecture and SHALL produce an architecture-labelled DMG, ZIP, SHA-256 checksum file, fuse record, packaged smoke records, and machine-readable build manifest. The manifest SHALL identify application version, source commit, bundle identifier, target and native runner architecture, macOS runner version, minimum configured macOS version, Node and Electron versions, artefact names, byte sizes, hashes, every packaged Mach-O architecture, fuse state, packaged-format smoke results, code-signature classification, Apple Team ID when present, effective hardened-runtime state, notary tickets, Gatekeeper assessment, and public-promotion eligibility.

#### Scenario: Build an Apple Silicon candidate
- **WHEN** the native `arm64` workflow completes from a tested commit
- **THEN** its ARM64 DMG, ZIP, checksum, fuses, smoke records, and manifest are retained together and refer to that commit

#### Scenario: Build an Intel candidate
- **WHEN** the native `x64` workflow completes from a tested commit
- **THEN** its x64 DMG, ZIP, checksum, fuses, smoke records, and manifest are retained together and refer to that commit

#### Scenario: macOS build identity is incomplete
- **WHEN** a package cannot be tied to its source commit, architecture, checksum, native smoke, fuse state, actual signature state, and Gatekeeper evidence
- **THEN** it is not eligible to be described as a verified macOS candidate

### Requirement: Native macOS smoke-test gate
A macOS package SHALL be described as verified only after its thin Mach-O bundle runs on a matching native macOS architecture and every executable Mach-O slice in the application matches that target. The native verifier SHALL validate bundle identifier, version, configured minimum system version, DMG integrity, the DMG Applications link, ZIP extraction, strict bundle code integrity, Electron fuses, and equality of the packaged executables. It SHALL launch the unpacked, DMG-contained, and ZIP-contained applications and repeat the local-origin, renderer-isolation, restrictive-CSP, blocked-network, blocked-popup, denied-permission, deterministic-calculation, local-persistence, project-round-trip, single-window, and clean-shutdown smoke checks.

#### Scenario: Verify a DMG
- **WHEN** the DMG is verified, mounted read-only, and its application is launched by the native harness
- **THEN** its architecture, code integrity, packaged origin, security checks, known calculation, project round trip, persistence, and clean shutdown all pass

#### Scenario: Verify a ZIP
- **WHEN** the ZIP is extracted with metadata preservation and its application is launched by the native harness
- **THEN** the same required native checks pass and the executable matches the verified unpacked bundle

#### Scenario: Detect translated or mixed execution
- **WHEN** the runner architecture differs from the target or any packaged Mach-O contains an unexpected or additional architecture
- **THEN** verification fails and Rosetta execution is not accepted as native compatibility evidence

### Requirement: Explicit macOS signing and notarisation status
Every macOS artefact SHALL report whether its final bundle is unsigned, ad-hoc signed, or Developer ID signed. An unsigned or ad-hoc signed artefact MAY be retained as an internal candidate but SHALL NOT be presented as publisher-identified, notarised, Gatekeeper-trusted, or publicly promotable. Public distribution SHALL require a strict valid Developer ID Application signature from the expected Apple Team ID, effective hardened runtime, Apple notarisation acceptance, stapled application and DMG tickets, and Gatekeeper acceptance under an active policy. Hashes, ad-hoc code integrity, publisher identity, notarisation, stapling, and Gatekeeper status SHALL remain separate evidence. Credentials SHALL remain outside source, artefacts, and logs.

#### Scenario: No Apple distribution identity is configured
- **WHEN** a native package is produced with no authorised Developer ID credentials
- **THEN** its actual unsigned or ad-hoc state, absent Team ID and notary tickets, and Gatekeeper limitation are recorded and public promotion is blocked

#### Scenario: A public macOS candidate is produced
- **WHEN** authorised signing and notarisation credentials are supplied through the protected build environment
- **THEN** the expected Team ID, strict signature, hardened runtime, accepted notarisation, stapled application and DMG tickets, and active Gatekeeper acceptance are all verified after packaging

#### Scenario: Apple trust verification is incomplete
- **WHEN** identity, Team ID, hardened runtime, notarisation, stapling, or Gatekeeper verification is missing or invalid
- **THEN** public promotion is blocked even when native smoke and every checksum pass

### Requirement: Declared macOS support and limits
Release documentation SHALL distinguish Apple Silicon `arm64` and Intel `x64`, state the minimum configured macOS version and the exact native runner versions used for verification, and direct users to the matching package. The initial release SHALL NOT claim a universal binary, Mac App Store package, PKG installer, automatic updates, application-level local-data encryption, or compatibility outside the verified architecture and operating-system surface.

#### Scenario: Select the wrong architecture
- **WHEN** a user attempts to use an artefact for an unverified or different Mac architecture
- **THEN** the documentation makes no compatibility claim and directs the user to the matching verified package

#### Scenario: Use an internal candidate under Gatekeeper
- **WHEN** an unsigned or ad-hoc signed internal package is downloaded and Gatekeeper does not identify an authorised publisher
- **THEN** the documentation explains the limited internal status without recommending global Gatekeeper disablement
