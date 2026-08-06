## Context

See `proposal.md` for motivation and the six capability specs for observable behaviour. The repository now contains a working client-only MVP and a private deployed preview. This OpenSpec change remains unarchived because the task list still distinguishes implemented calculator behaviour from open hardening, browser, accessibility, export, comparison, and physical-verification work.

The calculation is deterministic, small, and privacy-sensitive only in the sense that users may label or retain their engine configurations. It does not need a server to produce results. The difficult parts are numeric correctness near dead-centre boundaries, circular intervals that cross 0 degrees, maintaining one authoritative source among linked representations, integrating geometric port area over crank angle, keeping compression-volume sign conventions auditable, distinguishing driving from driven transmission teeth, preserving measured wheel circumference as authority, handling untrusted portable project data, and making dense radial and Cartesian visualisations understandable without colour or pointer interaction.

The initial page and document language is British English. User-facing strings will be isolated so an Italian translation can be added without changing domain behaviour.

## Goals / Non-Goals

**Goals:**

- Establish a pure, deterministic domain kernel that is testable without a browser or rendering library.
- Keep one versioned authoritative project model and derive all geometry, timing analysis, warnings, and visual data from it.
- Keep physical rotary measurements and their angular equivalents visibly connected without allowing measured and derived representations to become competing sources of authority.
- Keep deterministic geometry, profile-conditioned heuristics, and measured or calibrated-model evidence as three visibly different diagnostic levels.
- Make contextual interpretation explicitly dependent on one user-selected engine-use and exhaust profile rather than inferring intent from timing values.
- Make invalid, incomplete, uncertain, and measured data explicit instead of coercing it into apparently precise results.
- Add transparent geometric calculations for displacement, mean piston speed, compression, squish, rectangular-port time-area, and configuration deltas without converting them into performance claims.
- Add a transparent optional transmission calculation from editable Vespa primary and four- or five-gear tooth pairs, measured wheel rolling circumference, and selected maximum RPM without converting theoretical gearing speed into a vehicle-performance claim.
- Separate deterministic calculations, documented configuration-specific references, and tuning hypotheses in every recommendation surface.
- Deliver the first release as a static browser application that remains useful without accounts, project APIs, or server-side calculation.
- Package the same client-only calculator as offline Windows x64 and native macOS ARM64 and x64 applications without introducing a calculation backend or a second project model.
- Make desktop privilege boundaries, native execution evidence, artefact provenance, integrity, and signing status explicit.
- Preserve extension points for non-rectangular measured port profiles, localisation, dynamic simulation, and a future persistence service without designing those features now.

**Non-Goals:**

- Do not build a CFD model, gas-dynamic pressure model, combustion model, exhaust-pipe calculator, absolute torque or power predictor, synthetic dyno curve, or machining-safety evaluator.
- Do not predict reachable top speed, acceleration, road load, shift time, tyre slip or growth, clutch slip, drivetrain loss, aerodynamic drag, gradient effects, or whether the engine can pull the selected RPM in any gear.
- Do not infer dynamic compression pressure, mean squish velocity, detonation margin, thermal loading, safe clearance, or an optimum combination from geometric inputs alone.
- Do not model lateral cylinder or gudgeon-pin offset in the standard kernel. Expert measured events cover non-symmetric real-world observations in this release.
- Do not infer fixed timing for reed induction.
- Do not add accounts, cloud projects, short-link services, telemetry containing project data, or collaborative editing.
- Do not make the radial diagram directly draggable in the first release. Equivalent numeric controls are the authoritative edit surface.
- Do not treat a straight chord, tangential ruler width, or remaining solid crank-web shoulder as the open cut-away arc. Do not infer a second crankcase-track diameter, disconnected windows, rounded edge timing, axial alignment, leakage, crankshaft strength, or balance from the MVP inputs.
- Do not add automatic updates, machine-wide administration, Windows x86 or ARM64 builds, MSIX distribution, a Mac App Store or PKG package, a universal Mac binary, a signing-certificate service, hosted-code fallback, or a general-purpose Electron IPC API in this change.

## Decisions

### 1. React and TypeScript browser application packaged with Vinext

The implemented MVP uses the Next App Router, React, and TypeScript, with Vinext and Vite producing the Cloudflare-compatible deployment artefact. Calculation happens synchronously in the browser and project content does not require a calculation backend. No Web Worker is needed because the workload is a small number of trigonometric and interval operations per edit.

React owns the DOM and the timing diagram uses small deterministic SVG path helpers for circular tracks and markers. This keeps the accessible live diagram and current SVG download path within the same presentation model without a chart library managing mutable DOM state. Complete overlay export and export-specific verification remain open tasks.

Alternatives considered:

- Plain TypeScript and custom elements would reduce dependencies but increase form-state, accessibility, and component-composition work for little practical benefit.
- A chart library remains an option if later visual complexity justifies it, but the current track count does not require one.
- Canvas would make accessible semantics and vector export harder while providing no meaningful performance advantage for the expected number of arcs.

### 2. Layered data flow with a framework-independent domain core

The implementation will be split into these conceptual layers:

1. Raw edit state: locale-tolerant strings and transient incomplete input.
2. Project validation: conversion into a schema-versioned authoritative project or structured field errors.
3. Geometry kernel: forward and inverse centred slider-crank calculations and uncertainty envelopes.
4. Circular timing kernel: normalised events, union, intersection, gap, sweep, and ordering operations.
5. Performance metrics: displacement, piston speed, compression, squish geometry, rectangular-port area, cylindrical rotary-overlap area, angle-area, and specific time-area.
6. Transmission kernel: primary and per-gear reductions, wheel-circumference-based theoretical road speed, adjacent-upshift RPM drop, progression warnings, and bounded graph endpoints.
7. Analysis: blowdown, staging, signed intake-to-transfer margin, separate inlet closing, overlap, triple overlap, elapsed time, uncertainty intervals, configuration deltas, profile-qualified diagnostics, and typed warnings.
8. Presentation model: formatted labels, diagram tracks, area, engine-character and transmission series, qualitative character annotations, table rows, diagnostic levels, export data, and accessibility summaries.

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

Rotary induction follows the same authority rule, conceptually:

```ts
type RotaryManualArc =
  | { authority: "crank-cutaway"; openCrankCutawayArcMm: number }
  | { authority: "crankcase-opening"; crankcaseOpeningArcMm: number };

interface RotaryTimingDefinition {
  timingSource: "direct-angles" | "crank-and-case-arcs";
  openingAdvanceBtdcDeg: number;
  closingDelayAtdcDeg: number;
  sealingTrackDiameterMm?: number;
  manualArc?: RotaryManualArc;
}
```

The desired opening and closing angles are the sole authority for the positioned inlet event and total duration. `direct-angles` supports timing analysis without requiring physical sizing. `crank-and-case-arcs` activates the physical solver, makes diameter and one manual component mandatory, and recalculates the complementary component as read-only. The two physical lengths can therefore never become competing authorities.

Deck position belongs to shared engine geometry because all deck-referenced ports use the same assembled piston reference. The project stores the chosen source and original full-precision value. It does not store calculated representations as authority.

Clearance volume will follow the same authority rule. A project can use a directly measured assembled clearance volume or a component breakdown, but not both as simultaneous sources of truth. The breakdown uses signed piston-crown and deck corrections so additions to clearance volume are positive and displacements into the chamber are negative. Squish bowl diameter and radial band width are linked representations with one explicit source mode.

Each piston-controlled port can optionally include a bounded geometric area profile. The first schema supports a rectangular projected window with width, height, and multiplicity. Timing remains usable when area data is absent; time-area becomes unavailable rather than guessed.

Raw form strings remain separate from the canonical project so tokens such as `57,` can exist temporarily without corrupting the last valid model. Choosing to edit a derived field dispatches an explicit source-mode change rather than creating a second independent value.

Alternatives considered:

- Storing both component arc lengths as simultaneously editable measurements would simplify form binding but create contradictory states whenever their sum differs from the total arc implied by the desired timing.
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

Domain functions will return explicit result variants rather than `NaN`, thrown validation errors, or magic zero values. Warnings will have stable codes, severity, affected entity identifiers, structured parameters, and message keys. Examples include invalid event order, non-positive blowdown, uncertain ordering, measured asymmetry, an exhaust interval that does not contain a transfer interval, a non-positive rotary complementary arc, a rotary result beyond one circumference, and a desired rotary duration that spans the full cycle and leaves no positive-duration closed interval.

Every diagnostic also carries one of three claim levels:

1. `calculated-geometry`: deterministic input validity, event order, signed relationships, area and time-area results, or an explicit unavailable state;
2. `profile-heuristic`: a contextual comparison against one selected, versioned and source-labelled engine-use profile;
3. `measured-or-modelled`: a comparison against an identified physical measurement or calibrated model, with provenance, calibration scope, and uncertainty.

Severity and claim level are separate. Only calculated geometry can create a blocking input error. Profile heuristics are advisory, remain conditional on their selected profile and reference set, and cannot claim that a setup is good, bad, safe, or optimal. Measured and modelled records identify which subtype they use and never relabel a simulation as a measurement. A tuning hypothesis may accompany a profile or measured/modelled record, but must name the road, degree-wheel, pressure, temperature, or dyno check needed to assess it. No lower level can override a geometric error or an unavailable result.

Alternatives considered:

- Free-form warning strings are easy to start with but cannot be reliably tested, localised, filtered, or attached to exported results.
- Exceptions are appropriate for programmer invariants, not expected incomplete or physically invalid user input.
- A single red-amber-green tuning score would be compact but would collapse evidence level, configuration intent, uncertainty, and model boundary into a false verdict.

### 7. Project state managed by a reducer with stable entity identifiers

One reducer will manage authoritative project edits, port collection changes, induction selection, rotary-area source and measurements, bounded uncertainties, diagnostic profile and reference-set version, character-graph RPM range, optional transmission enablement, primary and gear tooth pairs, four- or five-gear selection, wheel rolling circumference, transmission maximum RPM, compression and squish inputs, an optional comparison configuration, preferences, reset, import, and restoration. Transfer groups and transmission gear rows receive stable identifiers so renaming, switching between four and five gears, or reordering other collections does not remount unaffected fields or change analysis references.

Derived calculation state is computed from the validated project and is never dispatched back into the reducer. Component-local state is limited to raw input text, focus, disclosure state, and transient action feedback.

Alternative considered: an external state library is unnecessary for a single-page, single-project graph at this scale. A reducer keeps transitions explicit and testable without adding another persistence abstraction.

### 8. SVG diagram and semantic table share one presentation model

The presentation layer will produce labelled tracks and overlay segments from the analysis result. The SVG renders those segments with React-owned path helpers, CSS variables, and reusable patterns. It includes `role="img"`, a concise title and description, but does not expose every decorative tick as an accessibility node.

The semantic HTML table is the detailed non-visual representation and contains every datum expressed by the diagram. Colour is never the only distinction: opening and closing markers, patterns, labels, and legends differentiate events and overlays. Pointer tooltips are supplementary and must also be available through focus or visible table content.

The transmission view uses a separate Cartesian SVG derived from the same transmission presentation result. Road speed is the horizontal axis, engine RPM is the vertical axis, and each configured gear has a labelled line style and matching semantic table row. The graph does not reuse the 360-degree timing coordinate system and does not become a second calculation path.

Alternative considered: embedding extensive per-path ARIA text would create a noisy accessibility tree and still be less usable than the structured table.

### 9. Client-side persistence and portable schema

The current bounded `EngineProject` document uses `schemaVersion: 6`. Explicit project validation covers local data, imported JSON, and share fragments before atomic replacement of the current project. Limits cover document bytes, number of port groups, label length, project code, a real ISO project date, three bounded engine-detail lines, numeric ranges, fixed four- or five-gear transmission structure, and nesting depth implied by the schema. Version 4 stores desired rotary opening and closing angles plus the selected calculation mode. Arc-sizing mode additionally stores sealing-track diameter, the selected manual component, and only that component's authoritative arc. Version 5 adds rotary-area source, measured common axial overlap width when applicable, optional measurement bounds, `none`, `touring-box`, `sport-box`, `road-expansion`, or `race-expansion` with the applicable built-in reference-set version, and the requested character-graph RPM range. Version 6 adds optional transmission enablement, manually entered authoritative primary tooth counts, exactly five stable gear-row drafts with four or five active and manually entered tooth pairs, manually entered authoritative wheel rolling circumference, and a bounded graph maximum RPM. Ratios, speed values, upshift results, and transmission graph series are derived and are not persisted as authority. Supported version 1, 2, 3, 4, and 5 documents migrate through the rules in Decisions 17 to 22 with transmission disabled and without fabricated tooth counts, wheel circumference, uncertainty, or profile judgement. Unsupported newer versions are rejected without partial application.

Local continuity uses `localStorage` behind a small repository interface. Storage failures are caught and exposed as non-blocking status. Future browser or backend repositories can implement the same conceptual interface without entering the domain core.

Share links contain a URL-safe base64 encoding of compact schema-versioned JSON in the fragment. A conservative encoded-length cap prevents unreliable links; projects beyond it use JSON export. No server record or link-shortening service is introduced.

JSON export and share links are generated from validated authoritative project data. The current SVG download serialises the live vector timing diagram. The dedicated A4 print view uses the same calculated presentation, adds an editable project header and authoritative input snapshot, preserves timing and transmission graphs as vector content, includes the equivalent transmission table when enabled, and creates a non-authoritative generation timestamp immediately before printing. Complete overlay disclosure and export-specific browser verification remain open tasks. Imported labels are rendered as text, never injected as HTML.

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
- signed intake-to-transfer margins, separate inlet-closing delay, complete blowdown representations, diagnostic-level integrity, profile isolation, configuration deltas, and overlapping uncertainty ranges;
- rotary timing-to-total-arc conversion, each manual-component solve direction, authority-switch invariance, non-positive complement rejection, circumference bounds, and full-cycle warnings;
- circular crank-to-case overlap length, geometric inlet-area curves, rotary angle-area integration, common-width boundaries, and invariance under a valid manual-authority switch;
- deterministic area-versus-angle and time-area-versus-RPM series, profile-qualified qualitative annotations, absence of torque or power outputs, and uncertainty-band crossing behaviour;
- primary, per-gear, and overall transmission reduction identities, speed and inverse-RPM round trips, four- and five-gear configurations, adjacent-upshift RPM drop, non-taller progression warnings, and invalid whole-tooth boundaries;
- manual transmission entry, authoritative wheel rolling circumference, speed-horizontal and RPM-vertical graph endpoints, semantic-table equivalence, and absence of reachable-top-speed or vehicle-performance claims;
- project transitions and schema migrations, including legacy storage-key fallback, timing-only recovery, and manual-authority validation.

Schema tests additionally prove that versions 1 to 5 preserve every recognised authoritative field while receiving disabled transmission analysis with no fabricated hardware or wheel measurement, and that version 6 never trusts persisted ratios, road speeds, shift results, or graph samples.

Component tests will exercise labelled controls, source-mode changes, partial numeric input, warnings, table equivalence, import failures, and storage failures. Browser tests will cover responsive layouts, keyboard use, sharing, export, print styling, and supported browsers. Automated accessibility checks are supporting evidence and will be supplemented by manual keyboard and screen-reader review. SVG regression fixtures will test geometry, while screenshots test final visual presentation.

### 11. Replaceable client-only hosting

Continuous integration will install from the lockfile, run type checks, unit and component tests, build production assets, and run bounded browser smoke tests. The current preview is packaged as a Cloudflare-compatible Vinext artefact and deployed privately through Sites. A later public or commercial deployment can move to another compatible host and custom domain without changing the calculation model.

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

### 14. Time-area uses disclosed piston-port and rotary-overlap area models

For a piston-controlled port with projected width `w`, window height `h`, multiplicity `m`, roof travel `xRoof`, and piston travel `x(theta)`, the instantaneous geometric open area is:

```text
uncovered height = clamp(x(theta) - xRoof, 0, h)
area(theta) = w * uncovered height * m
```

The kernel numerically integrates full-precision area over the selected crank interval to produce angle-area `AA` in square millimetre degrees. At positive engine speed `n` and displacement `Vd` in cubic centimetres, specific time-area is:

```text
TA = AA / (6 * n * Vd)
```

The result unit is square millimetre seconds per cubic centimetre. Exhaust blowdown time-area integrates exhaust open area only from exhaust opening to the earliest valid transfer opening. The piston-port model is geometric: it excludes discharge coefficients, chamfers, curved roofs, duct area, pressure ratio, gas state, and wave action. No area is inferred when width or height is absent.

Rotary inlet supports two explicit area sources. `constant-area` preserves the existing user-entered approximation `Ae` across the desired duration. `cylindrical-overlap` requires valid arc-sizing geometry and one measured positive common axial overlap width `Wa`. Let `Ic(theta)` be the moving crank cut-away interval and `Ik` the fixed case-window interval on the unwrapped sealing-track circumference. The kernel uses the same circular intersection operations as timing analysis:

```text
overlapLength(theta) = measure(Ic(theta) intersect Ik)
Ageom(theta) = Wa * overlapLength(theta)
AAinlet = integral(Ageom(theta) dtheta)
TAinlet = AAinlet / (6 * n * Vd)
```

The desired opening and closing edges align first and final positive overlap. The curve starts and ends at zero for ideal sharp edges, reaches at most `Wa * min(Lc, Lk)`, and is invariant when a valid manual-authority switch preserves `Lc` and `Lk`. The calculated surface-overlap area is more faithful than applying one constant area across the event, but it is still not true discharge-corrected effective flow area. Axial offset, non-rectangular boundaries, edge radius, leakage, duct restriction, discharge coefficient, pressure ratio, and gas state remain excluded. If `Wa` or physical arc sizing is unavailable, the geometric area curve is unavailable rather than inferred from circumferential lengths alone.

### 15. Relationships and recommendations are comparison-led, not target-led

The explicit rotary-inlet opening relationship is the signed margin between inlet opening advance and transfer closing before TDC. Positive values denote geometric overlap, zero denotes coincident boundaries, and negative values denote a closed gap. The nominal signed value and any bounded uncertainty interval remain visible even when a profile comparison is present. If the interval crosses zero, the relation is uncertain rather than classified from the nominal sign.

Rotary inlet closing delay after TDC is analysed separately from opening advance, signed opening margin, and total duration. A profile may compare closing delay against a contextual band, but no angle alone establishes reverse flow because crankcase pressure, inlet restriction, engine speed, load, sealing, and gas dynamics are not modelled. Duration ratios remain descriptive only and are not used as a universal tuning rule.

Global blowdown is presented as one linked family: degrees from exhaust opening to the earliest transfer opening, elapsed milliseconds at the selected RPM, exhaust angle-area over the same interval, and specific time-area when the necessary area, speed, and displacement data exists. The earliest-transfer identity and integration limits are part of the result. Missing area data does not suppress valid degrees or elapsed time, and degrees alone never produce a sufficient or insufficient capacity verdict.

An optional comparison configuration is recalculated through the same kernel. The application reports signed deltas for comparable inputs and outputs and shows whether uncertainty intervals overlap. It does not rank one configuration as better. Documented references must include a source label and the configuration to which they apply. Tuning hypotheses must say what physical measurement or trial would be needed to verify them.

### 16. Cylinder lift is a reversible transform over the complete analysis

The cylinder-spacer field introduced in schema version 1 remains persisted through migration to schema version 6, but the workbench promotes it from an isolated what-if card to a primary cylinder lift study. The no-spacer project remains authoritative. Analysis first resolves every port source mode to canonical roof travel, applies `liftedTravel = baselineTravel - spacerThickness`, and then recalculates the complete candidate through the same timing, interval, compression, squish, angle-area, and time-area paths.

This preserves angle- or duration-authoritative source values instead of rewriting them, keeps stroke, connecting-rod length, bore, rotary-valve timing, and port window geometry invariant, and exposes the non-linear degree change for each port. A positive lift also increases signed piston-below-deck position and entered squish readings by the spacer thickness and increases clearance volume by piston area multiplied by thickness. These compression consequences are explicitly conditional on the cylinder and head moving together without corrective machining.

The live diagram shows lifted events as the active coloured arcs and labels no-spacer opening and closing reference markers. A semantic comparison table is the complete non-colour alternative. Lift that would move any enabled roof beyond TDC is rejected without clipping or mutation of source measurements.

Alternative considered: mutating every port source field would make a quick visual update possible but would destroy the measured baseline, break angle-authoritative inputs, and feed derived values back into project authority.

### 17. Desired rotary timing defines total arc while one component remains measured

Rotary induction has one positioned timing authority. The user enters desired opening advance before TDC `A` and closing delay after TDC `R`. Their sum `T = A + R` defines the canonical rotary duration and interval. Timing-only mode can use that event without physical sizing. When the user selects arc-sizing mode, the effective rotary-valve sealing-track diameter `D` becomes mandatory; it is the diameter of the timing track on the crank web, not a journal diameter. The MVP projects the crankcase opening onto that same diameter.

With circumference `C = pi * D`, the total circumferential opening required by the desired timing is:

```text
T = A + R
Ltotal = C * T / 360
```

The user then selects exactly one manual measurement authority:

- `crank-cutaway`: the open crank-web cut-away arc `Lc` is measured and `Lk = Ltotal - Lc` is derived;
- `crankcase-opening`: the crankcase inlet-opening arc `Lk` is measured and `Lc = Ltotal - Lk` is derived.

The non-selected length is read-only and is recalculated from full-precision inputs on every edit. Its angular contribution is `360 * Lderived / C`; the selected manual component uses the same conversion. Their unrounded contributions sum to `T`. For one continuous rotating open cut-away and one continuous fixed opening with sharp idealised edges, this contact-geometry relationship describes crank travel from first positive overlap to final positive overlap. By itself it does not calculate instantaneous open area or airflow; the optional geometric area model in Decisions 14 and 19 additionally requires measured common axial overlap width.

Switching manual authority is a domain transition, not a relabelling of the same numeric token. When the current solution is valid, the full-precision derived complementary length is promoted to the newly selected manual component before recalculation. This preserves `Lc`, `Lk`, `Ltotal`, and the positioned inlet event across the switch. When a valid complementary length is unavailable, the old manual token is not reinterpreted under the other measurement convention. The new manual field remains incomplete, or restores only a separately retained non-authoritative edit draft, until the user provides that physical measurement.

The inputs must be finite. `A` and `R` must each be non-negative and their sum must not exceed 360 degrees. In arc-sizing mode, `D` must be greater than zero, `T` must satisfy `0 < T <= 360`, and the selected manual arc must be greater than zero. For `C` in millimetres, equality tolerance is `toleranceMm = max(1, C) * 1e-12`. `Ltotal` and the selected manual arc must not exceed `C + toleranceMm`. The derived complementary length must satisfy `0 < Lderived <= C + toleranceMm`. A zero or negative complement means the measured component consumes all or more of the total arc implied by the desired timing and is a blocking error. A result above one circumference is also a blocking error. Invalid results are not clamped, complemented, saturated, or written back as authority. A total satisfying `abs(Ltotal - C) <= toleranceMm` is normalised to a valid 360-degree duration and raises the existing warning that no positive-duration closed interval remains.

For valid geometry the presentation exposes `A`, `R`, `T`, `D`, `C`, `Ltotal`, the selected manual authority and length, the read-only complementary length, both angular contributions, and source provenance. The selected manual value, not the displayed derived value, is persisted. Changing the desired timing recalculates `Ltotal` and the read-only component while leaving the user's selected physical measurement unchanged. The desired positioned event drives the diagram, overlap, margin, and rotary time-area in either calculation mode. Selecting arc sizing additionally gates save, export, share, and print on a valid diameter and component solve.

Schema version 4 introduces this authority model. Version 1 direct-angle projects preserve `A` and `R`, migrate to timing-only mode, and do not receive fabricated physical geometry. For version 2 or 3 projects whose active arc geometry and phase anchor resolve a positioned event, migration derives `A` and `R` from that event, selects the stored open crank cut-away as the deterministic manual authority, and verifies that recomputing the crankcase length reproduces the stored geometry within tolerance. Direct-angle version 2 or 3 projects preserve `A` and `R` and remain in timing-only mode; a structurally valid stored diameter and crank cut-away token may remain as inactive draft data but does not become a valid physical claim until arc sizing is selected and validated. Schema version 5 preserves the version 4 authority model and adds the fields in Decisions 18 to 21. Schema version 6 preserves every recognised version 5 field and adds only the optional transmission authority in Decision 22. Older readers reject newer schemas rather than ignoring semantics they cannot reproduce.

The measurement contract remains narrow: one continuous open crank cut-away, one continuous crankcase opening, true arc lengths on the sealing track, sharp idealised boundaries and a common effective diameter. Diameter, the selected manual arc, and common axial overlap width accept optional stated bounds; when no bound is supplied they remain point inputs and no uncertainty is invented. Chords, the remaining solid shoulder, multiple disconnected windows, edge radii, axial alignment beyond the measured common width, leakage, flow, structural strength and crankshaft balance are outside this calculation.

Alternatives considered:

- Keeping two manual arcs would admit a physical split inconsistent with the desired duration. The retained timing-only mode is not a competing authority because the same desired angles drive timing in both modes.
- Allowing both component arcs to remain editable while merely highlighting one would still let the read-only complement drift from the user's desired timing.
- Reinterpreting the same numeric token when authority switches would confuse two physically different measurements and can create a discontinuous geometry.

### 18. Profiles select contextual heuristics and never modify geometry

The project stores one explicit diagnostic profile: `none`, `touring-box`, `sport-box`, `road-expansion`, or `race-expansion`. The application never infers this choice from timings, exhaust dimensions, product labels, or current results. Changing profile recalculates only contextual comparisons and qualitative annotations. It cannot change an event, signed margin, closing delay, overlap, blowdown, compression result, area curve, angle-area, time-area, or uncertainty range.

Every diagnostic has exactly one claim level:

1. `calculated-geometry` for deterministic validity, relationships, values, bounded ranges, and unavailable states;
2. `profile-heuristic` for comparison against one selected built-in profile's contextual bands;
3. `measured-or-modelled` for identified physical evidence or a calibrated model result.

Severity is orthogonal to claim level. Only a calculated input or geometry error can block a dependent calculation. Profile heuristics are advisory, include profile identifier, reference-set version, source, applicability, numeric comparison, and uncertainty status, and cannot assert good, bad, safe, unsafe, optimal, sufficient, or insufficient. If a result interval crosses a profile threshold, the comparison is indeterminate. Measured or modelled evidence must identify its subtype, provenance, applicable hardware and operating condition, calibration scope, and uncertainty; model output is never labelled as measurement.

The built-in reference catalogue is versioned independently from the formulas so a project can reproduce which bands were requested. Loading a project whose reference-set version is unavailable preserves and recalculates geometry while withholding heuristics rather than silently substituting a different catalogue.

Alternative considered: automatically choosing a profile from exhaust or timing values would make the interface faster, but it would hide user intent and could make a circular claim in which entered geometry selects the band later used to judge that same geometry.

### 19. Rotary inlet area means geometric cylindrical overlap, not flow-effective area

Decision 14 defines the `cylindrical-overlap` calculation from moving crank interval, fixed case interval, shared sealing-track diameter, and measured common axial overlap width. The product calls this geometric rotary overlap area. If user language calls it true effective area, the interface explains that effective means the area of the idealised sealing-surface overlap in this calculation, not a discharge-corrected effective flow area.

This distinction is a model boundary, not a naming detail. The geometric curve can show how the window opens, reaches a maximum bounded by `Wa * min(Lc, Lk)`, and closes, but it cannot account for axial offset beyond the measured common width, irregular boundaries, rounded edges, duct restriction, leakage, discharge coefficient, pressure ratio, gas state, or wave action. `constant-area` remains an explicit backward-compatible approximation. The two modes are never silently substituted or blended.

### 20. Uncertainty is propagated as bounded geometry, not probability

An authoritative measurement may carry an optional non-negative bound. The kernel propagates only stated bounds through piston event edges, signed margins, inlet closing, blowdown angle and elapsed time, compression, squish, piston-port area, rotary diameter and complement solving, common axial overlap width, area curves, angle-area, and specific time-area. Results contain nominal, lower, and upper values plus source provenance. They do not claim probability, confidence, standard deviation, or a manufacturing tolerance that the user did not provide.

For monotonic transformations, evaluating valid input bounds is sufficient. For circular intersections, complementary solves, and integrated area where extrema are not proven to occur at endpoints, the kernel uses a documented conservative interval-enclosure method and tests it against bounded sampling. An input bound that enters an impossible physical state makes the dependent uncertainty result invalid or unavailable; it is never clipped into the valid domain. Any diagnostic threshold crossed by the result interval becomes indeterminate while the deterministic nominal result remains visible.

Alternative considered: showing only plus-or-minus display arithmetic would be simpler but could understate non-linear slider-crank and circular-overlap effects and would falsely imply a symmetric statistical distribution.

### 21. Engine character estimate is a qualitative view of geometry, not a dyno simulation

The view is titled Engine character estimate and contains two linked deterministic plots: area versus crank angle for available port and rotary models, and specific time-area versus RPM across a bounded user-selected sweep. Axes retain real geometric units. When a diagnostic profile is selected, separate source-labelled heuristic annotations may describe lower-speed, mid-range, upper-speed, or area-limited tendencies where that profile's reference catalogue supports them. Uncertainty is drawn as a bounded envelope and can make an annotation indeterminate.

The view never synthesises these inputs into torque, power, brake mean effective pressure, acceleration, vehicle speed, peak output, or an undisclosed performance score. It has no torque or power axis, units, curve, or predicted peak and is not called a dyno simulation. With profile `none`, it shows geometry only. With incomplete area data, it shows the available series and explicit unavailable states rather than deriving a curve from timing degrees alone. A semantic table exposes every plotted sample and annotation without colour or pointer interaction.

Alternative considered: generating a normalised bell curve from timing and time-area would look familiar, but without volumetric-efficiency, pressure, exhaust-wave, combustion, friction, ignition, fuel, temperature, and calibration data it would be a cosmetic performance claim rather than a defensible calculation.

### 22. Transmission analysis derives theoretical road speed from authoritative tooth pairs and rolling circumference

Transmission analysis is optional and independent from the engine-timing kernel. Its authority consists of an enabled flag, primary driving-pinion teeth `Pdrive`, primary driven-gear teeth `Pdriven`, four or five ordered gear rows, wheel rolling circumference `C` in millimetres, and graph maximum engine speed `Nmax` in RPM. Each gear row contains cluster-pinion teeth `Gdrive` and driven gear-wheel teeth `Gdriven`. Tooth counts must be positive whole numbers. Enabled wheel circumference is bounded from 500 to 5,000 mm and maximum RPM from 500 to 20,000 to reject unit mistakes and unbounded graph domains without claiming those bounds describe every possible vehicle.

The deterministic kernel calculates:

```text
primary reduction = Pdriven / Pdrive
gear reduction = Gdriven / Gdrive
overall reduction = primary reduction * gear reduction
wheel RPM = engine RPM / overall reduction
road speed km/h = engine RPM * C * 60 / (overall reduction * 1,000,000)
engine RPM = road speed km/h * overall reduction * 1,000,000 / (C * 60)
```

For each gear it derives theoretical speed per 1,000 RPM and at `Nmax`. For each adjacent upshift it calculates the engine RPM after shifting at unchanged road speed and the percentage RPM drop. If a later gear is not taller than its predecessor, the valid result remains available with a warning to verify the tooth pairing. The kernel does not reorder gears or repair tooth counts.

The road-speed graph plots speed on the horizontal axis and engine RPM on the vertical axis. Each gear is a straight line from zero to its speed at `Nmax`, derived from the same full-precision result used by the table. A semantic table contains the complete non-visual equivalent, including tooth pairs, ratios, speed per 1,000 RPM, maximum-RPM speed, adjacent-shift RPM, RPM drop, and units. Print uses the same graph and table presentation model.

All tooth counts and wheel circumference are entered manually. Measured loaded wheel rolling circumference is the authoritative physical datum because nominal tyre size alone does not establish the installed rolling distance. The application does not infer or populate transmission hardware or rolling circumference from a model, product, or tyre-size field.

The maximum-RPM speed is theoretical gearing speed, not reachable top speed. The calculation excludes loaded tyre deformation beyond the entered circumference, tyre growth, wheel and clutch slip, drivetrain compliance and loss, aerodynamic drag, gradient, mass, road load, engine torque and power, and whether the engine can attain the selected RPM in a given gear. These exclusions remain adjacent to results and in print.

Schema version 6 introduces this optional transmission record. Supported version 1 to 5 projects preserve all recognised authority, receive transmission analysis disabled, and receive no populated primary teeth, gear teeth, wheel circumference, or transmission claim. Five stable blank gear rows permit a later four- or five-speed configuration without making migrated hardware assumptions. Derived reductions, road speeds, shift results, and graph samples are always regenerated.

Alternatives considered:

- Deriving circumference from nominal tyre notation would create false precision because installed construction, pressure, load, and wear change rolling distance.
- Plotting road speed on the vertical axis would conflict with the requested comparison and make speed at a selected RPM harder to scan across gears.
- Calling the highest graph endpoint top speed would imply available power and road-load modelling that the project does not contain.

### 23. Package the shared client inside a hardened Electron host

The desktop renderer reuses the same React presentation path, project validator, and framework-independent calculation kernel as the web application. A separate Electron main process serves only packaged assets through the secure `phase360` custom scheme and a dedicated persistent session. It never loads the production website. The renderer remains sandboxed and has no Node integration, Electron remote access, preload bridge, or general-purpose IPC.

Navigation, renderer-created windows, device and media permissions, and renderer network requests are denied by default. Sanitised clipboard write is the only permission exception and is limited to the packaged origin and main workbench, so the explicit Share action can copy a canonical HTTPS fragment without exposing the private custom-scheme URL. Version-controlled HTTPS methodology references may open in the system browser only through an exact-origin allowlist. JSON and SVG downloads are limited to user-generated Blob URLs, safe filenames, and explicit user gestures.

The desktop renderer uses a stricter local Content Security Policy than the server-rendered web build because it does not need inline bootstrap scripts. Packaged builds harden Electron fuses, validate the embedded archive, and restrict application loading to that archive. These controls do not make the archive a publisher signature and do not replace Authenticode on Windows or Developer ID and notarisation on macOS.

On macOS the application provides only the native application, edit, and window roles required for expected keyboard and window behaviour. Packaged menus expose no reload or developer-tools role and introduce no preload or IPC bridge.

### 24. Treat native execution, integrity and publisher identity as separate evidence

Windows packaging runs on a native Windows CI runner from the committed lockfile and produces installer and portable x64 executables. A build manifest and SHA-256 checksums establish source and byte-level traceability. A native smoke record proves that the matching executable starts from the packaged custom origin, retains renderer isolation, executes a known deterministic calculation, preserves local data across reload, and shuts down cleanly.

Checksum integrity, successful execution, and Authenticode publisher identity are separate claims. An unsigned executable can be a verified internal test artefact but is not a trusted public release. Public promotion requires a valid signature from the expected publisher and a retained post-build verification result.

### 25. Build and verify each macOS architecture natively

Apple Silicon and Intel receive separate DMG and ZIP artefacts rather than one untested universal bundle. The ARM64 build runs on a native `macos-15` runner and the x64 build runs on a native `macos-15-intel` runner. Each verifier rejects a translated or mismatched runner, checks every packaged Mach-O slice, reads hardened Electron fuses from the final application, mounts or extracts each distributable, and repeats the local-origin smoke test against the actual packaged application.

The initial macOS candidate uses the ad-hoc signature restored after fuse modification and records that state, the absence of publisher identity and notary tickets, and the effective Gatekeeper assessment. Configuration intent such as `hardenedRuntime: true` is not treated as final runtime evidence. Public promotion requires a Developer ID Application identity from the expected Apple Team ID, successful strict code-signature verification, effective hardened runtime, accepted notarisation, stapled tickets, and Gatekeeper acceptance. Signing credentials remain outside source, artefacts, and logs.

## Reasoning log

### 2026-08-05: Keep gearing authoritative at the tooth-pair and measured-wheel level

The project stores only the exact tooth pairs and rolling circumference entered by the user, not a product name or nominal tyre size. This makes measurement authority explicit and prevents hidden hardware assumptions. Four and five active gears share five stable rows so changing the count does not destroy the fifth-gear draft or disturb existing row identity.

The requested graph uses road speed on X and engine RPM on Y. Both axes come directly from the same reversible gearing equation as the table, so the chart is an inspectable view rather than a separate estimate. The highest endpoint remains theoretical speed at selected RPM because reachable top speed would additionally require torque, power, loss, drag, mass, gradient, tyre and operating-condition data.

### 2026-08-05: Replace dual rotary timing sources with a constrained complement solver

The desired opening and closing angles answer the user's primary question: which positioned timing event is wanted. When arc sizing is selected, the entered sealing-track diameter turns that duration into one exact total circumferential length. Once either the crank cut-away or the case opening is physically measured, the other is no longer independent. Making the complement derived removes contradictory states, makes machining deltas inspectable, and keeps the user responsible for exactly one real measurement. Full-precision promotion on a valid authority switch preserves geometry without allowing a rounded display value to become source data. Schema version 4 is required because previous documents treated two physical arcs and a timing anchor as simultaneous geometry inputs.

### 2026-08-05: Keep contextual tuning guidance outside the deterministic model

The requested exhaust-use profiles are useful only if they expose intent, source, version, applicability, and uncertainty. Treating a touring-box or race-expansion band as a geometric law would turn a literature comparison into a false error state. The three-level diagnostic model therefore preserves exact relationships first, makes profile comparison conditional and advisory, and reserves the highest evidence level for identified measurements or calibrated models. The same boundary applies to the character graph: area and time-area can be calculated, but torque and power require pressure, combustion, exhaust-wave, loss, and calibration data that this MVP does not possess.

The requested true effective inlet area is consequently named geometric rotary overlap area. It improves materially on a constant-area rectangle by modelling the moving cylindrical contact, but it remains a sealing-surface geometry calculation. Keeping that name and its exclusions adjacent to the curve prevents a precise square-millimetre result from becoming an unsupported mass-flow claim.

### 2026-08-06: Keep macOS architecture and publisher trust explicit

Separate native ARM64 and x64 builds make the supported processor visible in the filename, manifest, and smoke report and avoid relying on Rosetta as compatibility evidence. DMG is the normal installation surface and ZIP remains an equivalent portable archive only because both formats are opened and smoke-tested independently.

The ad-hoc signature required for a runnable Apple Silicon internal build protects code integrity locally but identifies no publisher. Hashes, native execution, ad-hoc code integrity, Developer ID identity, notarisation, stapling, and Gatekeeper acceptance therefore remain separate evidence fields rather than one generic signed state.

### 2026-08-06: Distil charts as layers of one engineering instrument

The 360-degree timing diagram answers when an event occurs. Linear graphs answer how a calculated quantity changes. Their interfaces therefore share one visual language but do not repeat the same evidence through nested cards, duplicate legends, unexplained grid lines, decorative centre copy, and permanently expanded numeric samples.

The screen presentation keeps the plotted relation, units, uncertainty and direct series identity primary. Provenance detail and numeric samples remain available through semantic disclosures and are forced open for print. Direct line labels replace a separate legend when they remain collision-free; a non-colour fallback remains required when the viewport or data geometry cannot support them. Selecting a timing phase changes emphasis only and never changes calculated content. Mobile transmission charts may scroll inside their own bounded region, but the page itself must not acquire horizontal overflow.

## Risks / Trade-offs

- [Users may mistake precise geometry for precise engine behaviour] -> Keep source provenance, uncertainty, model assumptions, and geometric-only notices adjacent to results and in exports.
- [Users may mistake trapped compression ratio for dynamic pressure or detonation margin] -> Use the full geometric name, show the exhaust-closure reference, and explicitly exclude pressure, temperature, leakage, combustion, and wave effects.
- [Rectangular projected port area can differ materially from effective flow area] -> Require optional explicit window dimensions, disclose the profile, and never infer a flow coefficient or performance verdict.
- [Geometric rotary overlap area can be mistaken for discharge-corrected effective flow area] -> Use the geometric name, display the measured common-width and shared-diameter assumptions, and repeat excluded flow effects beside charts and exports.
- [A selected profile can be mistaken for a universal tuning target] -> Require explicit selection, source and version every band, keep numeric geometry primary, and make every comparison advisory or indeterminate.
- [A qualitative character graph can be mistaken for a dyno curve] -> Plot only real geometric units, prohibit torque, power, peak, and dyno labels, and include the model boundary in the graph, table, print, and export surfaces.
- [The fastest transmission endpoint can be mistaken for achievable top speed] -> Call it theoretical road speed at selected RPM and repeat the excluded tyre, slip, loss, load, drag, power, and reachability factors beside the graph, table, and print result.
- [Driving and driven gear teeth can be entered in reverse] -> Name primary and gearbox components explicitly, show the resulting reductions, and warn when a later gear is not taller without silently swapping values.
- [A nominal tyre dimension can be mistaken for the installed rolling circumference] -> Accept only a manually entered circumference and provide one-loaded-revolution measurement guidance.
- [Bounded uncertainty can be mistaken for statistical confidence] -> Label it as propagation of stated limits, never invent probability, and invalidate rather than clip physically impossible bounds.
- [A saved profile reference version can become unavailable] -> Recalculate geometry, withhold contextual diagnostics, and never substitute a different reference set silently.
- [A single squish reading can hide assembly asymmetry] -> Support multiple named readings and show minimum, mean, maximum, and spread without applying an unsourced safety threshold.
- [Configuration deltas can look like optimisation advice] -> Keep them signed and descriptive, retain uncertainty, and prohibit automatic better-or-worse rankings.
- [A curved or chamfered port roof has no single objective first-opening point] -> Provide measurement guidance and uncertainty rather than silently selecting an edge convention.
- [A crank cut-away or crankcase opening can be measured as a chord, projected width, or complementary solid shoulder instead of the required open arc] -> Name the exact sealing-track datum, show the common-diameter assumption beside the controls, and reject unsupported interpretations rather than silently converting them.
- [A selected manual component can consume all of the total arc implied by the desired timing] -> Show the total available arc beside the input and reject a zero or negative complementary result without changing the user's measurement.
- [Switching manual authority can reinterpret a crank measurement as a case measurement] -> Promote the current full-precision complement only when the solve is valid; otherwise require a new measurement and never reuse the old token under the new label.
- [Legacy timing-only projects may not contain a diameter or component measurement] -> Preserve their desired angles in timing-only mode and never fabricate a diameter, component split, or physical validity claim during migration.
- [Raw text and canonical state can appear temporarily out of sync] -> Retain the last valid presentation, show field-level status, and commit only complete valid tokens.
- [Circular boundary bugs can corrupt overlap totals] -> Centralise all interval operations and use boundary, property, and golden tests before any chart work consumes them.
- [Share URLs can become too long] -> Enforce a conservative cap and make versioned JSON the reliable fallback.
- [Browser storage can be unavailable or cleared] -> Treat autosave as convenience, expose failures, and provide explicit file export.
- [Static hosting limits future accounts or shared project services] -> Keep persistence behind an interface and add a backend only through a separately specified capability.
- [SVG export and live rendering can drift] -> Generate both from the same presentation model and regression-test exported fixtures.
- [Additional dependencies increase supply-chain surface] -> Keep the runtime dependency set small, lock versions, review updates, and run dependency and build checks in CI.
- [Electron expands the dependency and privilege surface] -> Keep Electron outside the domain core, expose no general-purpose bridge, lock dependencies, audit every release, and apply hardened fuses.
- [A desktop shell can silently become a remote-code browser] -> Load only packaged application content, deny renderer network access and navigation, and open approved references only in the system browser.
- [A checksum can be mistaken for publisher trust] -> Report hash integrity and Authenticode status separately and block public promotion when signature verification is not valid.
- [A cross-built executable can be mistaken for Windows verification] -> Require a native Windows smoke record tied to the final artefact hash.
- [An Intel package can be mistaken for Apple Silicon compatibility, or vice versa] -> Build and smoke-test separate thin Mach-O packages on matching native runners and include the architecture in every filename and manifest.
- [An ad-hoc macOS signature can be mistaken for publisher identity] -> Record the actual signature classification and Apple Team ID and block public promotion without the expected Developer ID identity.
- [A configured hardened runtime can be mistaken for final signed-bundle evidence] -> Inspect the packaged code-signing flags and require notarisation, stapled tickets, and Gatekeeper acceptance independently.

## Migration Plan

1. Scaffold the static application, quality tooling, and continuous-integration checks without changing the OpenSpec assets.
2. Implement and verify the framework-independent geometry and circular-interval kernels before connecting any UI.
3. Add the project schema, project transitions, compression, squish, time-area, comparison results, and typed warnings; migrate version 1 direct-angle projects into the version 2 rotary model and version 1 and 2 projects into the version 3 report model.
4. Verify the expanded domain kernel with analytic identities, numerical-integration convergence tests, and independent reference calculations.
5. Build the workbench, semantic tables, three-level diagnostic presentation, and SVG visualisation from the shared presentation model.
6. Add local persistence, validated import/export, fragment sharing, print output, and production hardening.
7. Introduce schema version 4, migrate supported version 1, 2, and 3 projects through the explicit rotary rules in Decision 17, retain timing-only analysis, and replace dual physical arc inputs with the desired-timing complement solver.
8. Introduce schema version 5 with diagnostic profile and reference version, rotary area source and common width, stated uncertainties, and character-graph RPM range; migrate supported version 1, 2, 3, and 4 projects to profile `none` without invented bounds and keep every curve, diagnostic, and graph series derived.
9. Introduce schema version 6 with optional manually entered authoritative transmission inputs; migrate supported version 1, 2, 3, 4, and 5 projects with transmission disabled and no invented hardware, implement the reduction and road-speed kernel, and generate the speed-horizontal and RPM-vertical graph, semantic table, and print section from one result.
10. Build the offline Windows x64 installer and portable executable on a native Windows runner from the lockfile, verify hardened fuses and the final packaged origin, run the native smoke suite, and retain checksums, build manifest, exact signing status, and matching source commit.
11. Build separate offline macOS ARM64 and x64 DMG and ZIP artefacts on matching native runners, inspect all Mach-O slices, verify the final packaged origin and fuses, run every packaged-format smoke, and retain checksums, build manifests, exact signing, notarisation, stapling, and Gatekeeper state.
12. Deploy an immutable preview build, run mathematical, browser, accessibility, migration, authority-switch, manual measurement, transmission, print, diagnostic-boundary, and no-performance-claim cross-checks, then promote the same verified artefact. Promote a Windows build publicly only after Authenticode validates the expected publisher. Promote a macOS build publicly only after Developer ID, hardened runtime, notarisation, stapling, and Gatekeeper validation all succeed for the expected Apple Team ID.

Rollback consists of redeploying the previous static artefact. The initial release has no server data migration. If a later application build cannot read a stored project schema, it must leave the stored payload intact and offer export or a clear version error rather than overwriting it.

## Open Questions

- Final public product name, visual identity, domain, and production static host can be selected after the verified preview without changing the architecture.
- Italian localisation can be prioritised after the British English source catalogue and layout have been validated.
- Confirm through physical measurement trials whether a later schema should support a remaining-solid-shoulder source, straight-chord conversion, or an independently measured crankcase-track diameter. The MVP accepts only one selected open circumferential component arc and the stated shared-diameter assumption.
- Validate the first built-in profile reference catalogue against traceable published configurations and, separately, against physical road, pressure, flow-bench, or dyno datasets before any future calibrated performance model is proposed. This does not block the MVP's explicitly heuristic profile comparisons.
- Cross-check manually entered tooth pairs and measured wheel circumference against the exact installed components used in physical acceptance tests.
- Select the future Authenticode certificate and expected publisher identity before public Windows distribution. This does not block an explicitly unsigned internal verification build.
- Select the future Developer ID Application certificate and expected Apple Team ID before public macOS distribution. This does not block an explicitly ad-hoc signed and non-notarised internal verification build.
