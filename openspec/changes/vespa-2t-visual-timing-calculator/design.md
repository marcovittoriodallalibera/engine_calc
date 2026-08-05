## Context

See `proposal.md` for motivation and the five capability specs for observable behaviour. The repository currently contains OpenSpec planning assets and no application implementation, so this change establishes the initial product architecture rather than integrating with a legacy runtime.

The calculation is deterministic, small, and privacy-sensitive only in the sense that users may label or retain their engine configurations. It does not need a server to produce results. The difficult parts are numeric correctness near dead-centre boundaries, circular intervals that cross 0 degrees, maintaining one authoritative source among linked representations, integrating geometric port area over crank angle, keeping compression-volume sign conventions auditable, untrusted portable project data, and making a dense radial visualisation understandable without colour or pointer interaction.

The initial page and document language is British English. User-facing strings will be isolated so an Italian translation can be added without changing domain behaviour.

## Goals / Non-Goals

**Goals:**

- Establish a pure, deterministic domain kernel that is testable without a browser or rendering library.
- Keep one versioned authoritative project model and derive all geometry, timing analysis, warnings, and visual data from it.
- Make invalid, incomplete, uncertain, and measured data explicit instead of coercing it into apparently precise results.
- Add transparent geometric calculations for displacement, mean piston speed, compression, squish, rectangular-port time-area, and configuration deltas without converting them into performance claims.
- Separate deterministic calculations, documented configuration-specific references, and tuning hypotheses in every recommendation surface.
- Deliver the first release as a static browser application that remains useful without accounts, project APIs, or server-side calculation.
- Preserve extension points for non-rectangular measured port profiles, localisation, dynamic simulation, and a future persistence service without designing those features now.

**Non-Goals:**

- Do not build a CFD model, gas-dynamic pressure model, combustion model, exhaust-pipe calculator, performance predictor, or machining-safety evaluator.
- Do not infer dynamic compression pressure, mean squish velocity, detonation margin, thermal loading, safe clearance, or an optimum combination from geometric inputs alone.
- Do not model lateral cylinder or gudgeon-pin offset in the standard kernel. Expert measured events cover non-symmetric real-world observations in this release.
- Do not infer fixed timing for reed induction.
- Do not add accounts, cloud projects, short-link services, telemetry containing project data, or collaborative editing.
- Do not make the radial diagram directly draggable in the first release. Equivalent numeric controls are the authoritative edit surface.

## Decisions

### 1. Static React and TypeScript application built with Vite

The application will use React and TypeScript with Vite and will be deployable as static assets. Calculation happens synchronously in the browser. No Web Worker is needed because the workload is a small number of trigonometric and interval operations per edit.

React will own the DOM. `d3-shape` will be used only to generate SVG annular path data. This avoids D3-managed mutable DOM state while retaining a proven arc implementation whose angular convention matches the diagram.

Alternatives considered:

- Plain TypeScript and custom elements would reduce dependencies but increase form-state, accessibility, and component-composition work for little practical benefit.
- A server-rendered full-stack framework would add runtime and deployment complexity without improving deterministic client-side calculation.
- Canvas would make accessible semantics and vector export harder while providing no meaningful performance advantage for the expected number of arcs.

### 2. Layered data flow with a framework-independent domain core

The implementation will be split into these conceptual layers:

1. Raw edit state: locale-tolerant strings and transient incomplete input.
2. Project validation: conversion into a schema-versioned authoritative project or structured field errors.
3. Geometry kernel: forward and inverse centred slider-crank calculations and uncertainty envelopes.
4. Circular timing kernel: normalised events, union, intersection, gap, sweep, and ordering operations.
5. Performance metrics: displacement, piston speed, compression, squish geometry, rectangular-port angle-area and specific time-area.
6. Analysis: blowdown, staging, signed intake-to-transfer margin, overlap, triple overlap, elapsed time, configuration deltas, and typed warnings.
7. Presentation model: formatted labels, diagram tracks, table rows, evidence tiers, export data, and accessibility summaries.

The domain core will not import React, browser storage APIs, D3, or formatting code. The same core functions will drive the live workbench, table, share-link reconstruction, SVG export, and print output.

Alternative considered: deriving values independently inside components would be quicker initially but risks contradictory results and makes export and testing depend on UI state.

### 3. Discriminated authoritative source model

Each piston-controlled event will use a discriminated source value, conceptually:

```ts
type PortTimingSource =
  | { mode: "travel-from-tdc"; travelMm: number; uncertaintyMm?: number }
  | { mode: "height-above-bdc"; heightMm: number; uncertaintyMm?: number }
  | { mode: "depth-from-deck"; depthMm: number; uncertaintyMm?: number }
  | { mode: "opening-angle"; openingDeg: number }
  | { mode: "duration"; durationDeg: number }
  | { mode: "measured-events"; openingDeg: number; closingDeg: number };
```

Deck position belongs to shared engine geometry because all deck-referenced ports use the same assembled piston reference. The project stores the chosen source and original full-precision value. It does not store calculated representations as authority.

Clearance volume will follow the same authority rule. A project can use a directly measured assembled clearance volume or a component breakdown, but not both as simultaneous sources of truth. The breakdown uses signed piston-crown and deck corrections so additions to clearance volume are positive and displacements into the chamber are negative. Squish bowl diameter and radial band width are linked representations with one explicit source mode.

Each piston-controlled port can optionally include a bounded geometric area profile. The first schema supports a rectangular projected window with width, height, and multiplicity. Timing remains usable when area data is absent; time-area becomes unavailable rather than guessed.

Raw form strings remain separate from the canonical project so tokens such as `57,` can exist temporarily without corrupting the last valid model. Choosing to edit a derived field dispatches an explicit source-mode change rather than creating a second independent value.

Alternatives considered:

- Storing all millimetre and degree fields would simplify form binding but create contradictory states and rounding feedback loops.
- A last-write-wins model without an explicit source mode would make imported projects and user intent ambiguous.

### 4. Canonical units, angles, and numeric policy

The kernel uses millimetres, degrees at public domain boundaries, and radians only inside trigonometric functions. Canonical cycle angles are normalised to `[0, 360)`, with an explicit 360-degree endpoint allowed only where needed to describe TDC closure in user-facing output.

The centred geometry uses:

```text
r = stroke / 2
x(theta) = r(1 - cos(theta)) + L - sqrt(L^2 - r^2 sin^2(theta))
q = L + r - x
cos(theta) = (q^2 + r^2 - L^2) / (2 r q)
```

User data outside the physical domain is rejected. Only inverse-trigonometric arguments outside `[-1, 1]` by a documented machine-scale tolerance are clamped. Full-precision numbers flow through all calculations; formatting rounds only at the presentation boundary.

The initial default display precision will be two decimal places for millimetres and one decimal place for degrees, while exports retain authoritative full-precision numeric values. Display precision remains a presentation preference and cannot change the project result.

Alternative considered: arbitrary-precision decimal arithmetic is unnecessary because IEEE 754 double precision is substantially finer than physical measurement uncertainty here. Explicit boundary handling and golden tests address the relevant risk.

### 5. Circular intervals use start and sweep as the canonical form

A normalised event will use a start angle and clockwise sweep rather than a start and end pair:

```ts
interface CircularInterval {
  startDeg: number;
  sweepDeg: number;
}
```

This representation distinguishes a zero-duration event from a full-cycle event and represents wrapped rotary timing without an inverted end angle. Set operations will split intervals into non-wrapped half-open linear segments in `[0, 360)`, calculate unions or intersections, then merge adjacent results and convert them back to circular segments. Boundary contact has zero sweep unless an interval contains a positive range on both sides.

Metric calculations consume interval sets, not chart geometry. The same union logic prevents double counting when rotary inlet intersects multiple simultaneous transfer groups.

Alternative considered: storing `startDeg` and `endDeg` alone makes wrapped, empty, and full-cycle cases ambiguous and encourages scattered special cases.

### 6. Structured results and warnings

Domain functions will return explicit result variants rather than `NaN`, thrown validation errors, or magic zero values. Warnings will have stable codes, severity, affected entity identifiers, structured parameters, and message keys. Examples include invalid event order, non-positive blowdown, uncertain ordering, measured asymmetry, and an exhaust interval that does not contain a transfer interval.

Interpretive notices, such as geometric-only overlap, are distinct from invalid-data errors and deterministic geometry warnings. Recommendation entries also carry one of three stable evidence levels: calculated geometry, documented reference, or tuning hypothesis. They remain visible without blocking valid output, and a reference or hypothesis can never override a validation error.

Alternatives considered:

- Free-form warning strings are easy to start with but cannot be reliably tested, localised, filtered, or attached to exported results.
- Exceptions are appropriate for programmer invariants, not expected incomplete or physically invalid user input.

### 7. Project state managed by a reducer with stable entity identifiers

One reducer will manage authoritative project edits, port collection changes, induction selection, compression and squish inputs, an optional comparison configuration, preferences, reset, import, and restoration. Transfer groups receive stable generated identifiers so renaming or reordering does not remount unrelated fields or change analysis references.

Derived calculation state is computed from the validated project and is never dispatched back into the reducer. Component-local state is limited to raw input text, focus, disclosure state, and transient action feedback.

Alternative considered: an external state library is unnecessary for a single-page, single-project graph at this scale. A reducer keeps transitions explicit and testable without adding another persistence abstraction.

### 8. SVG diagram and semantic table share one presentation model

The presentation layer will produce labelled tracks and overlay segments from the analysis result. The SVG renders those segments with `d3-shape`, CSS variables, and reusable patterns. It includes `role="img"`, a concise title and description, but does not expose every decorative tick as an accessibility node.

The semantic HTML table is the detailed non-visual representation and contains every datum expressed by the diagram. Colour is never the only distinction: opening and closing markers, patterns, labels, and legends differentiate events and overlays. Pointer tooltips are supplementary and must also be available through focus or visible table content.

Alternative considered: embedding extensive per-path ARIA text would create a noisy accessibility tree and still be less usable than the structured table.

### 9. Client-side persistence and portable schema

The first schema is a bounded `EngineProject` document with `schemaVersion: 1`. Zod validates local data, imported JSON, and share fragments before atomic replacement of the current project. Limits cover document bytes, number of port groups, label length, numeric ranges, and nesting depth implied by the fixed schema.

Local continuity uses `localStorage` behind a small repository interface. Storage failures are caught and exposed as non-blocking status. Future browser or backend repositories can implement the same conceptual interface without entering the domain core.

Share links contain a URL-safe base64 encoding of compact schema-versioned JSON in the fragment. A conservative encoded-length cap prevents unreliable links; projects beyond it use JSON export. No server record or link-shortening service is introduced.

Exports are generated from validated project and presentation data. SVG is serialised as vector markup, JSON contains authoritative inputs, and print uses a dedicated stylesheet. Imported labels are rendered as text, never injected as HTML.

Alternatives considered:

- Query parameters are readable for a few fields but become unwieldy with dynamic port groups and versioned unions.
- Share-payload compression adds compatibility and migration complexity before actual project sizes demonstrate a need.
- IndexedDB is unnecessary for one small current project and complicates failure handling.

### 10. Test strategy treats mathematical and presentation evidence separately

Unit and property-oriented tests will cover:

- piston position at TDC, BDC, and symmetric cycle angles;
- exact forward-inverse round trips;
- the Polini 51 mm, 97 mm, 33-degree reference;
- physical boundaries and near-boundary inverse calculations;
- uncertainty envelopes;
- wrapped, empty, full-cycle, touching, union, intersection, and gap intervals;
- blowdown, staging, overlap, triple overlap, and no-double-counting cases;
- displacement, mean piston speed, compression identities, target clearance volume, and signed clearance-volume breakdowns;
- squish gap statistics, annular area conversions, rectangular-port integration, blowdown time-area, and RPM scaling;
- signed intake-to-transfer margins, evidence-tier integrity, configuration deltas, and overlapping uncertainty ranges;
- reducer transitions and schema migrations.

Component tests will exercise labelled controls, source-mode changes, partial numeric input, warnings, table equivalence, import failures, and storage failures. Browser tests will cover responsive layouts, keyboard use, sharing, export, print styling, and supported browsers. Automated accessibility checks are supporting evidence and will be supplemented by manual keyboard and screen-reader review. SVG regression fixtures will test geometry, while screenshots test final visual presentation.

### 11. Static deployment with replaceable hosting

Continuous integration will install from the lockfile, run type checks, unit and component tests, build production assets, and run bounded browser smoke tests. The first preview may use GitHub Pages with the correct repository base path. A production commercial deployment can move the same static output to a dedicated static host and custom domain.

No hosting-specific runtime API enters the calculation or project model. This keeps deployment migration limited to build and domain configuration.

### 12. Compression calculations remain geometric and volume-authoritative

For bore `B`, stroke `S`, piston area `A`, displacement `Vd`, clearance volume `Vc`, and piston travel at exhaust closure `xE`, the kernel uses:

```text
A = pi * B^2 / 4
Vd = A * S / 1000
RCg = (Vc + Vd) / Vc
Vtrapped = A * xE / 1000
RCt = (Vc + Vtrapped) / Vc
Vc_target = Vtrapped / (RCt_target - 1)
```

Volumes are in cubic centimetres after conversion from cubic millimetres. `RCg` is geometric compression ratio. `RCt` is the geometric trapped ratio referenced to exhaust closure, not a prediction of running cylinder pressure. A target ratio must be greater than 1 and produces a target assembled clearance volume, not a machining instruction.

The component mode totals head chamber, gasket or shim, signed deck-clearance, signed piston-crown, and bounded custom correction volumes. The presentation exposes every component and the final sum. Changing only the exhaust roof changes the trapped ratio but not geometric ratio or squish clearance; base and head spacing changes are represented as configuration deltas rather than universal recommendations.

### 13. Squish is represented as measurable geometry

The user can enter multiple squish-gap readings. The kernel reports minimum, arithmetic mean, maximum, and asymmetry as `maximum - minimum`; it does not infer a safe gap from those values. With bore `B` and central circular bowl diameter `Db`, it calculates:

```text
band width = (B - Db) / 2
annular band area = pi * (B^2 - Db^2) / 4
area ratio = 1 - (Db / B)^2
```

The model requires `0 < Db <= B`. Editing bowl diameter or band width explicitly changes the authoritative source. Optional band and piston-crown angles may be retained as measured context, but the MVP does not calculate gas velocity or clearance at every radius from them.

### 14. Time-area uses a disclosed rectangular projected-window model

For a piston-controlled port with projected width `w`, window height `h`, multiplicity `m`, roof travel `xRoof`, and piston travel `x(theta)`, the instantaneous geometric open area is:

```text
uncovered height = clamp(x(theta) - xRoof, 0, h)
area(theta) = w * uncovered height * m
```

The kernel numerically integrates full-precision area over the selected crank interval to produce angle-area `AA` in square millimetre degrees. At positive engine speed `n` and displacement `Vd` in cubic centimetres, specific time-area is:

```text
TA = AA / (6 * n * Vd)
```

The result unit is square millimetre seconds per cubic centimetre. Exhaust blowdown time-area integrates exhaust open area only from exhaust opening to the earliest valid transfer opening. The model is geometric: it excludes discharge coefficients, chamfers, curved roofs, duct area, pressure ratio, gas state, and wave action. No area is inferred when width or height is absent.

### 15. Relationships and recommendations are comparison-led, not target-led

The explicit rotary-inlet relationship is the signed margin between inlet opening advance and transfer closing before TDC. Positive values denote geometric overlap, zero denotes coincident boundaries, and negative values denote a closed gap. Duration ratios are descriptive only and are not used as a universal tuning rule.

An optional comparison configuration is recalculated through the same kernel. The application reports signed deltas for comparable inputs and outputs and shows whether uncertainty intervals overlap. It does not rank one configuration as better. Documented references must include a source label and the configuration to which they apply. Tuning hypotheses must say what physical measurement or trial would be needed to verify them.

## Risks / Trade-offs

- [Users may mistake precise geometry for precise engine behaviour] -> Keep source provenance, uncertainty, model assumptions, and geometric-only notices adjacent to results and in exports.
- [Users may mistake trapped compression ratio for dynamic pressure or detonation margin] -> Use the full geometric name, show the exhaust-closure reference, and explicitly exclude pressure, temperature, leakage, combustion, and wave effects.
- [Rectangular projected port area can differ materially from effective flow area] -> Require optional explicit window dimensions, disclose the profile, and never infer a flow coefficient or performance verdict.
- [A single squish reading can hide assembly asymmetry] -> Support multiple named readings and show minimum, mean, maximum, and spread without applying an unsourced safety threshold.
- [Configuration deltas can look like optimisation advice] -> Keep them signed and descriptive, retain uncertainty, and prohibit automatic better-or-worse rankings.
- [A curved or chamfered port roof has no single objective first-opening point] -> Provide measurement guidance and uncertainty rather than silently selecting an edge convention.
- [Raw text and canonical state can appear temporarily out of sync] -> Retain the last valid presentation, show field-level status, and commit only complete valid tokens.
- [Circular boundary bugs can corrupt overlap totals] -> Centralise all interval operations and use boundary, property, and golden tests before any chart work consumes them.
- [Share URLs can become too long] -> Enforce a conservative cap and make versioned JSON the reliable fallback.
- [Browser storage can be unavailable or cleared] -> Treat autosave as convenience, expose failures, and provide explicit file export.
- [Static hosting limits future accounts or governed presets] -> Keep persistence behind an interface and add a backend only through a separately specified capability.
- [SVG export and live rendering can drift] -> Generate both from the same presentation model and regression-test exported fixtures.
- [Additional dependencies increase supply-chain surface] -> Keep the runtime dependency set small, lock versions, review updates, and run dependency and build checks in CI.

## Migration Plan

1. Scaffold the static application, quality tooling, and continuous-integration checks without changing the OpenSpec assets.
2. Implement and verify the framework-independent geometry and circular-interval kernels before connecting any UI.
3. Add the project schema, reducer, compression, squish, time-area, comparison results, and typed warnings with migration support starting at schema version 1.
4. Verify the expanded domain kernel with analytic identities, numerical-integration convergence tests, and independent reference calculations.
5. Build the workbench, semantic tables, evidence-tiered interpretation, and SVG visualisation from the shared presentation model.
6. Add local persistence, validated import/export, fragment sharing, print output, and production hardening.
7. Deploy an immutable preview build, run mathematical, browser, accessibility, and manual measurement cross-checks, then promote the same verified artefact.

Rollback consists of redeploying the previous static artefact. The initial release has no server data migration. If a later application build cannot read a stored project schema, it must leave the stored payload intact and offer export or a clear version error rather than overwriting it.

## Open Questions

- Final public product name, visual identity, domain, and production static host can be selected after the verified preview without changing the architecture.
- Italian localisation can be prioritised after the British English source catalogue and layout have been validated.
