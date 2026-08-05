# Phase 360

Phase 360 is a client-only visual workbench for Vespa and other piston-ported two-stroke engines. It links measured port positions to crankshaft timing and presents the complete cycle in one accessible 360-degree diagram.

The current release is an MVP. Calculation, local persistence, portable projects and export are implemented in the browser. Accounts, cloud projects and a backend are deliberately deferred.

## What it calculates

- Exact centred slider-crank piston travel and inverse millimetre-to-degree conversion
- Exhaust, primary transfer, secondary transfer and boost-port opening, closing and duration
- Dynamic additional transfer groups with independent source modes and uncertainty
- Exhaust-to-transfer blowdown, phase difference, simultaneous opening and transfer staging
- Rotary inlet timing, signed inlet-to-transfer margin, overlap and triple overlap
- Degrees converted to elapsed milliseconds at the selected engine speed
- Displacement and mean piston speed
- Geometric and trapped compression ratios, trapped swept volume and target clearance volume
- Four-point squish statistics, central bowl band width and squish area ratio
- Idealised rectangular port angle-area, specific time-area and downstroke blowdown time-area
- A real-time cylinder lift study with 0.1 mm steps, per-port timing deltas, no-spacer reference markers, and recalculated blowdown, overlap, compression, squish and time-area
- Independent what-if effects for a head gasket and exhaust-roof raise

All results update as soon as a valid input changes. Comma and point decimal separators are accepted.

## Interpretation boundary

The application calculates geometry. It does not predict gas flow, pressure waves, power, torque, combustion temperature, detonation margin or machining safety.

Positive overlap means that events are geometrically open at the same crank angle. It does not establish flow direction or performance. Trapped compression is a geometric volume ratio beginning at exhaust closure, not a dynamic pressure estimate. Time-area uses idealised projected windows and excludes duct angle, edge radius, chamfer, discharge coefficient and gas dynamics.

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
npm run build
npm run test:render
```

`npm test` runs the complete sequence. The mathematical suite includes the Polini 51 mm stroke, 97 mm rod and 33-degree reference, which corresponds to approximately 5.1 mm piston travel.

## Architecture

- `lib/engine`: pure deterministic mathematical kernel with typed diagnostics
- `lib/project`: schema-versioned project model and browser portability helpers
- `lib/presentation`: one project-to-results analysis path used by the interface
- `components`: realtime workbench and accessible SVG timing dial
- `app`: Vinext application shell, metadata and responsive print styling
- `tests`: mathematical, portability and rendered-output acceptance tests
- `openspec`: proposal, design, capability specifications and implementation tasks

The domain kernel has no React, storage or browser dependencies. Derived results are recalculated from authoritative inputs and are not persisted as source data.

## Data and privacy

The latest valid project is saved to `localStorage` when available. JSON import is bounded and validated before atomic replacement. Share links encode project data in the URL fragment, which is not sent to the hosting server by normal browser requests. SVG and JSON exports are generated locally.

Future transmission of project content requires a separate capability and explicit user action.

## Documentation

- [Calculation methodology](docs/methodology.md)
- [Project format and portability](docs/project-format.md)
- [OpenSpec change](openspec/changes/vespa-2t-visual-timing-calculator/proposal.md)

## Deployment

The production build is a Cloudflare Worker-compatible Vinext artefact. Hosting bindings are intentionally empty because the MVP has no database or object storage.

```bash
npm run build
```

Deployment configuration lives in `.openai/hosting.json`.
