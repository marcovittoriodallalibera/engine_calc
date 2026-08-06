# Phase 360

Phase 360 is a client-only visual workbench for Vespa and other piston-ported two-stroke engines. It links measured port positions to crankshaft timing and presents the complete cycle in one accessible 360-degree diagram.

The current release is an MVP. Calculation, local persistence, portable projects and export are implemented in the browser. Accounts, cloud projects and a backend are deliberately deferred.

## What it calculates

- Exact centred slider-crank piston travel and inverse millimetre-to-degree conversion
- Exhaust, primary transfer, secondary transfer and boost-port opening, closing and duration
- Dynamic additional transfer groups with independent source modes and uncertainty
- Exhaust-to-transfer blowdown, phase difference, simultaneous opening and transfer staging
- Rotary inlet timing from direct angles or combined crank-web and crankcase arc geometry, with an anchored opening or closing edge
- Signed inlet-to-transfer margin, overlap and triple overlap from the resolved rotary timing
- Degrees converted to elapsed milliseconds at the selected engine speed
- Displacement and mean piston speed
- Geometric and trapped compression ratios, trapped swept volume and target clearance volume
- Four-point squish statistics, central bowl band width and squish area ratio
- Idealised rectangular port angle-area, specific time-area and downstroke blowdown time-area
- Configurable Vespa primary and four- or five-speed gearbox reductions from editable tooth counts
- Theoretical road speed, speed per 1,000 RPM, post-shift RPM and RPM drop for every enabled gear
- A real-time and printable road-speed graph with speed on the horizontal axis and engine RPM on the vertical axis
- A real-time cylinder lift study with 0.1 mm steps, per-port timing deltas, no-spacer reference markers, and recalculated blowdown, overlap, compression, squish and time-area
- Independent what-if effects for a head gasket and exhaust-roof raise

All results update as soon as a valid input changes. Comma and point decimal separators are accepted.

## Interpretation boundary

The application calculates geometry. It does not predict gas flow, pressure waves, power, torque, combustion temperature, detonation margin or machining safety.

Positive overlap means that events are geometrically open at the same crank angle. It does not establish flow direction or performance. Trapped compression is a geometric volume ratio beginning at exhaust closure, not a dynamic pressure estimate. Time-area uses idealised projected windows and excludes duct angle, edge radius, chamfer, discharge coefficient and gas dynamics.

Transmission results are kinematic calculations from manually entered tooth counts and wheel circumference, not performance predictions. The graph does not show whether the engine can pull a given ratio or reach the displayed speed. It excludes clutch and tyre slip, tyre deformation and growth, transmission losses, engine load, gradient, wind and aerodynamic drag. A measured loaded-wheel rolling circumference is authoritative.

No universal timing, compression or squish target is built in. Source-specific limits may be entered and compared, but physical assembly and tuning decisions require manufacturer data and direct verification.

## Local development

Node.js 22.13 or later is required.

```bash
npm ci
npm run dev
```

The development preview is normally available at `http://localhost:3000`.

## Quality commands

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:desktop
npm run build
npm run test:render
npm run desktop:build
```

`npm test` runs the complete sequence. The mathematical suite includes the Polini 51 mm stroke, 97 mm rod and 33-degree reference, which corresponds to approximately 5.1 mm piston travel.

## Architecture

- `lib/engine`: pure deterministic mathematical kernel for engine geometry and transmission kinematics, with typed diagnostics
- `lib/project`: schema-versioned project model and browser portability helpers
- `lib/presentation`: one project-to-results analysis path used by the interface
- `components`: realtime workbench and accessible SVG timing dial
- `app`: Vinext application shell, metadata and responsive print styling
- `desktop`: offline Vite renderer, hardened Electron host, and packaged Windows and macOS application boundary
- `scripts`: Electron fuse and native Windows and macOS package verification
- `tests`: mathematical, portability and rendered-output acceptance tests
- `openspec`: proposal, design, capability specifications and implementation tasks

The domain kernel has no React, storage or browser dependencies. Derived results are recalculated from authoritative inputs and are not persisted as source data.

## Data and privacy

The latest valid project is saved to `localStorage` when available. JSON import is bounded and validated before atomic replacement. Share links encode project data in the URL fragment, which is not sent to the hosting server by normal browser requests. SVG and JSON exports are generated locally.

The Project menu includes a confirmed `Clear local data` action. If a stored project is unreadable, automatic saving pauses and preserves that payload until the user explicitly edits, imports, resets or clears the local state.

Future network transfer of project content requires a separate capability and explicit user action.

## Documentation

- [Calculation methodology](docs/methodology.md)
- [Project format and portability](docs/project-format.md)
- [Security audit](docs/security-audit.md)
- [Windows desktop distribution](docs/windows-desktop.md)
- [macOS desktop distribution](docs/macos-desktop.md)
- [OpenSpec change](openspec/changes/vespa-2t-visual-timing-calculator/proposal.md)

## Web deployment

The production build is a Cloudflare Worker-compatible Vinext artefact. Hosting bindings are intentionally empty because the MVP has no database or object storage.

```bash
npm run build
```

Deployment configuration lives in `.openai/hosting.json`.

## Windows desktop

The desktop application reuses the same schema-version-6 project model, calculation kernel and React workbench. It is packaged locally, does not load the hosted application, and does not require a network connection for calculation, persistence, JSON or SVG export, or print. Approved methodology references open separately in the system browser.

```bash
npm run desktop:build
npm run desktop:smoke
npm run desktop:dist:win
```

`desktop:smoke` runs the local Electron runtime and needs a graphical host. The release workflow builds natively on Windows x64, tests the unpacked application, portable executable and installed application, verifies Electron fuses and Authenticode status, and emits SHA-256 checksums plus a machine-readable verification record.

The initial Windows package is intentionally unsigned. It is suitable for internal verification, may trigger Microsoft SmartScreen, and must not be presented as a trusted public release. Public promotion requires a valid Authenticode signature from the expected publisher. See [Windows desktop distribution](docs/windows-desktop.md) for the exact boundary and verification procedure.

The first verified internal Windows x64 candidate is retained by [GitHub Actions run 31044034676](https://github.com/marcovittoriodallalibera/engine_calc/actions/runs/31044034676) for source commit `6172a3b6d225417f06d9c001921010d1258ba37b`.

## macOS desktop

The same offline desktop renderer is packaged separately for Apple Silicon ARM64 and Intel x64. Choose the package matching the processor. Neither build relies on Rosetta as compatibility evidence.

```bash
npm run desktop:dist:mac:arm64
npm run desktop:dist:mac:x64
node scripts/verify-macos-package.mjs --dist-dir desktop-dist --arch arm64 --expected-signature unsigned
```

Each native workflow opens the unpacked application, mounted DMG and extracted ZIP, verifies every Mach-O architecture, checks the Electron fuses and bundle integrity, and emits architecture-specific SHA-256 checksums and a machine-readable verification record.

The initial Mac packages are ad-hoc signed and not notarised. They are internal verification candidates, identify no authorised publisher, and may be stopped by Gatekeeper after download. Public distribution requires the expected Developer ID Application and Apple Team ID, effective hardened runtime, accepted notarisation, stapled tickets and active Gatekeeper acceptance. See [macOS desktop distribution](docs/macos-desktop.md).
