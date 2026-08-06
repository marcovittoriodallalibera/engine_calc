## 1. Application Foundation

- [x] 1.1 Scaffold a React and TypeScript application with the Next App Router and Vinext/Vite build while preserving the OpenSpec directories and repository history
- [x] 1.2 Add the minimal runtime and test dependencies for React, Next, Vinext/Vite, TypeScript, ESLint, and the Node test runner
- [ ] 1.3 Complete strict TypeScript, linting, formatting, type-check, unit-test, browser-test, automated-accessibility, and production-build scripts beyond the current lint, type-check, unit, server-render, and build coverage
- [x] 1.4 Establish source boundaries for domain, project schema, application state, presentation, persistence, export, and UI modules
- [ ] 1.5 Add a British English message catalogue and shared unit, number, event, warning, and accessibility terminology
- [ ] 1.6 Add continuous integration that installs from the lockfile and runs lint, type-check, unit tests, component tests, and the production build

## 2. Canonical Project Model

- [ ] 2.1 Complete the schema-version 6 engine project model, stable entity identifiers, report identity, port categories, induction modes, desired rotary timing, single manual component-arc authority, clearance-volume and squish-band sources, optional rectangular port profiles, comparison configuration, diagnostic metadata, and optional authoritative transmission configuration
- [ ] 2.2 Complete bounded validation for project names, geometry, bore, volume components, squish readings, port collections and area profiles, arc-sizing rotary diameter, desired rotary duration, manual component authority, non-positive and over-circumference complementary results, uncertainty, RPM, comparison data, diagnostic references, transmission enablement, four- or five-gear structure, whole tooth counts, wheel rolling circumference, transmission maximum RPM, and presentation preferences
- [x] 2.3 Implement structured valid, unavailable, and invalid result types so expected user-data problems never become `NaN` or magic zero values
- [x] 2.4 Define stable warning codes, severities, affected-entity references, parameters, and message keys for deterministic and interpretive notices
- [x] 2.5 Implement canonical angle, radian, millimetre, numeric-tolerance, and presentation-rounding helpers
- [ ] 2.6 Add schema tests covering valid projects, bounded collections and labels, malformed values, non-finite numbers, impossible volume and profile dimensions, comparison bounds, and unsupported schema versions
- [x] 2.7 Introduce the legacy schema version 2 dual rotary-source model and schema version 3 report identity, sanitised canonical reconstruction, version 1 and 2 migration, and legacy local-storage fallback without treating persisted derived values as authority
- [x] 2.8 Introduce schema version 4 desired rotary timing plus single manual component authority, ensure the complementary arc is derived rather than persisted, and add deterministic version 1, 2, and 3 migrations while preserving timing-only legacy projects without fabricated geometry
- [ ] 2.9 Introduce schema version 5 for rotary area source and common axial width, bounded physical uncertainties, diagnostic profile and reference-set version, and character-graph RPM range; migrate versions 1 to 4 with profile `none`, preserve recognised constant-area input, and invent no measurements or bounds
- [ ] 2.10 Introduce schema version 6 for optional transmission authority; migrate versions 1 to 5 with transmission disabled, preserve every recognised legacy field, populate no primary teeth, gear teeth, wheel circumference, ratio, or road-speed result, and retain five stable blank gear rows for later four- or five-speed editing

## 3. Engine Geometry Kernel

- [x] 3.1 Implement engine-geometry validation for positive stroke, centre-to-centre connecting-rod length, and the `rod > stroke / 2` constraint
- [x] 3.2 Implement normalisation from travel below TDC, height above BDC, and deck-referenced roof depth with signed piston position
- [x] 3.3 Implement exact centred slider-crank piston position for a complete 0-to-360-degree cycle
- [x] 3.4 Implement the exact inverse conversion from reachable piston travel to descending opening angle, ascending closing angle, and duration
- [x] 3.5 Implement reverse conversion from authoritative opening angle or symmetric duration to all supported linear and mechanical notations
- [x] 3.6 Implement explicit TDC, BDC, out-of-range, non-finite, and inverse-trigonometric tolerance handling without silently repairing invalid user data
- [ ] 3.7 Implement measured opening and closing events, symmetry-tolerance evaluation, and suppression of a fabricated single port height for asymmetric events
- [ ] 3.8 Implement linear uncertainty propagation into opening, closing, duration, and ordering envelopes
- [ ] 3.9 Add geometry golden tests for TDC, BDC, cycle symmetry, forward-inverse round trips, the Polini 51 mm and 97 mm reference, physical limits, and uncertainty boundaries
- [x] 3.10 Implement and test the explicit cylinder lift transform for every port source mode, including 0.1 mm precision and physical-boundary rejection

## 4. Circular Interval Kernel

- [x] 4.1 Implement canonical clockwise circular intervals using normalised start angle and sweep, including explicit empty and full-cycle cases
- [x] 4.2 Implement conversion between circular intervals and half-open non-wrapped linear segments
- [x] 4.3 Implement segment sorting, adjacency merging, circular union, circular intersection, and total sweep without double counting
- [ ] 4.4 Implement nearest circular gaps and coincident-boundary detection for non-intersecting events
- [ ] 4.5 Add exhaustive boundary tests for wrapped rotary intervals, empty and full-cycle intervals, touching events, nested intervals, disjoint segments, and multi-event unions

## 5. Timing Analysis

- [ ] 5.1 Normalise exhaust, dynamic transfer groups, measured piston-controlled events, and rotary induction into canonical event intervals with source provenance
- [x] 5.2 Implement no-induction and reed-induction semantics so fixed rotary metrics are marked not applicable rather than invented
- [x] 5.3 Implement per-transfer exhaust opening separation, closing separation, duration difference, simultaneous-open sweep, and symmetric one-sided blowdown
- [x] 5.4 Implement earliest and latest transfer detection, coincident first openings, opening spread, global blowdown, and union of all transfer intervals
- [x] 5.5 Implement per-group and union rotary-to-transfer overlap, closed gap, and no-double-counting behaviour across TDC
- [x] 5.6 Implement per-group and union triple overlap between rotary inlet, exhaust, and transfers
- [x] 5.7 Implement optional conversion of angular metrics to milliseconds for positive RPM
- [ ] 5.8 Implement deterministic warnings for invalid order, non-positive blowdown, exhaust containment, measured asymmetry, and uncertainty crossing an ordering boundary
- [x] 5.9 Attach geometric-only interpretation notices without blocking valid timing results or inferring performance and flow outcomes
- [ ] 5.10 Add analysis tests for conventional 180/120-degree timing, staged transfers, wrapped rotary overlap, triple overlap, gaps, asymmetric events, invalid ordering, uncertainty, and RPM conversion
- [ ] 5.11 Implement and test the signed rotary-inlet opening versus transfer-closing margin per group and for the transfer union, including positive overlap, zero boundary, negative gap, and measured asymmetric closure
- [x] 5.12 Implement the legacy full-precision conversion from effective sealing-track diameter and two positive true arcs to component degrees, combined length and duration, including opening or closing phase anchors and equivalence tests against direct rotary timing
- [x] 5.13 Preserve legacy component conversions and duration without an anchor, reject unsupported circumference and anchor bounds, and warn without rejection when direct or arc-derived duration spans the full 360-degree cycle
- [x] 5.14 Replace the dual physical-arc calculation with `T = A + R`, `C = pi * D`, `Ltotal = C * T / 360`, and a bidirectional complementary solver in which exactly one of crank cut-away or crankcase opening is manual
- [x] 5.15 In arc-sizing mode reject missing or non-positive diameter, invalid desired duration, non-positive manual arc, non-positive complement, and any total, manual, or derived result above one circumference; preserve valid full-cycle timing with the no-closed-interval warning
- [ ] 5.16 Implement the three canonical diagnostic levels, explicit profile selection, profile-reference versioning, profile isolation from geometry, and indeterminate status when uncertainty crosses a contextual band
- [ ] 5.17 Implement separate rotary inlet-closing analysis and propagate stated uncertainty through closing delay and signed inlet-opening versus transfer-closing margin, including the zero-crossing state
- [x] 5.18 Present global blowdown as one result with earliest-transfer provenance, degrees, milliseconds, exhaust angle-area, and specific time-area while retaining partial results and prohibiting a capacity verdict from degrees alone

## 6. Compression, Squish, Time-Area, and Comparison

- [x] 6.1 Implement bore-derived piston area, single-cylinder displacement, and RPM-dependent mean piston speed with explicit units and missing-input states
- [x] 6.2 Implement authoritative measured clearance volume and component-breakdown modes with head, gasket or shim, signed deck, signed piston-crown, custom correction, and auditable total
- [x] 6.3 Implement geometric compression ratio, exhaust-closure trapped swept volume and geometric ratio, and target clearance volume for a valid target ratio greater than 1
- [x] 6.4 Implement squish reading statistics for minimum, mean, maximum, observed asymmetry, optional instrument uncertainty, and insufficient-reading notices
- [x] 6.5 Implement circular annular-band calculations and explicit source switching between bowl diameter and radial band width
- [x] 6.6 Implement rectangular projected port profiles with width, height, multiplicity, bounded instantaneous open area, and unavailable behaviour when profile data is absent
- [x] 6.7 Implement deterministic numerical integration for per-port angle-area, RPM-dependent specific time-area, and exhaust blowdown angle-area and time-area
- [ ] 6.8 Propagate valid measurement bounds through compression, squish, and area metrics without clipping impossible bounds or implying statistical confidence
- [ ] 6.9 Implement independent baseline or candidate calculation, compatible signed deltas, and uncertainty-range overlap without an automatic ranking
- [ ] 6.10 Implement diagnostic records for `calculated-geometry`, versioned and source-labelled `profile-heuristic`, and provenance-qualified `measured-or-modelled` evidence, with severity represented independently
- [x] 6.11 Add analytic, golden, boundary, and convergence tests for displacement, piston speed, volume identities, compression, squish, rectangular-area integration, blowdown time-area, and RPM scaling
- [x] 6.12 Add relationship tests proving that an exhaust-only roof change affects trapped but not geometric compression, spacing changes remain explicit configuration inputs, and no universal intake, transfer, compression, squish, or exhaust target is emitted
- [x] 6.13 Preserve the backward-compatible constant-area rotary approximation from valid desired timing and a separately entered area without requiring physical arc sizing or inferring area from circumferential lengths
- [x] 6.14 Implement the cylindrical rotary overlap-length and geometric area curve from valid component arcs and measured common axial width, including integration, full-precision authority-switch invariance, boundaries, and explicit exclusion of discharge-corrected flow area
- [ ] 6.15 Extend conservative bounded uncertainty propagation to event margins, inlet closing, complete blowdown, rotary physical solving, area curves, angle-area, time-area, and profile-threshold crossings without statistical claims or physical clipping
- [ ] 6.16 Implement deterministic area-versus-angle and specific-time-area-versus-RPM series plus profile-qualified Engine character estimate annotations, unavailable states, uncertainty envelopes, and explicit absence of torque, power, peak-output, or synthetic dyno claims

## 7. Project State and Editing

- [ ] 7.1 Implement a reducer for authoritative project changes, stable port identifiers, collection edits, induction selection, compression, squish, port profiles, comparison configuration, preferences, import, restoration, demonstration data, and reset
- [x] 7.2 Implement locale-tolerant raw numeric editing that accepts comma or point, distinguishes blank from zero, and retains incomplete tokens without corrupting the last valid project
- [x] 7.3 Build engine-geometry controls for bore, stroke, connecting-rod length, signed deck position, RPM, units, and measurement uncertainty
- [ ] 7.4 Build source-mode controls for travel from TDC, height above BDC, depth from deck, opening angle, duration, and measured opening/closing events
- [ ] 7.5 Build dynamic exhaust and transfer-group editors with suggested categories, custom labels, enable/disable, add, remove, stable reorder behaviour, and optional rectangular projected area
- [x] 7.6 Build no-induction, rotary-valve, and reed-induction controls with unambiguous BTDC and ATDC terminology
- [x] 7.7 Build clearance-volume, target trapped-ratio, squish-reading, annular-band, and comparison controls with explicit authority and sign guidance
- [x] 7.8 Implement explicit source switching when a user elects to edit a derived representation, preserving unrounded authoritative values
- [x] 7.9 Present field-level blocking errors separately from result-level warnings and clear each state immediately when its condition is resolved
- [ ] 7.10 Add focus and touch-accessible measurement guidance for every physical datum, including deck, piston edge, port roof and profile, connecting-rod centres, chamber volume, squish, and rotary timing references
- [x] 7.11 Add clearly labelled demonstration data and confirmed reset behaviour without presenting sample values as tuning recommendations
- [ ] 7.12 Add component tests for partial numeric input, source switching, independent invalid groups, dynamic ports, profiles, compression, squish, comparison, induction modes, warnings, demonstration data, and reset confirmation
- [x] 7.13 Add a dedicated cylinder lift study with direct entry, 0.1 mm controls, reset, measurement guidance, and unchanged stroke and rod disclosure
- [x] 7.14 Add the legacy direct-angle versus crank-and-case source controls, effective sealing-track diameter labelling, open-cut-away and true-arc guidance, shared-diameter disclosure, full-precision anchor switching, and field-level physical constraints
- [ ] 7.15 Retire legacy source and phase-anchor switching after schema-version-4 migration without losing recoverable user data
- [x] 7.16 Add desired opening and closing controls, an arc-sizing mode with mandatory diameter, one manual-component selector, one editable measured arc, one visibly calculated read-only complement, total-arc feedback, and authority-specific measurement guidance
- [ ] 7.17 Implement full-precision manual-authority switching that promotes a valid complement to the new editable source, preserves solved geometry, and leaves the new field incomplete rather than reinterpreting an invalid old token
- [ ] 7.18 Add explicit profile, rotary area-source, common axial-width, measurement-bound, and character RPM-sweep controls with source, version, datum, and model-boundary guidance

## 8. Results and 360-Degree Visualisation

- [x] 8.1 Build one shared presentation model for diagram tracks, metric and comparison rows, legends, warnings, diagnostic levels, source labels, uncertainty, print, and export
- [x] 8.2 Implement British English formatting for canonical degrees, ATDC, BTDC, BBDC, ABDC, millimetres, square millimetres, cubic centimetres, metres per second, RPM, milliseconds, angle-area, specific time-area, ratios, measured values, and calculated values
- [x] 8.3 Render the responsive SVG frame with TDC at the top, BDC at the bottom, clockwise logical angles, major and minor ticks, track labels, and orientation guidance
- [ ] 8.4 Complete rendering of exhaust, each enabled transfer group, and wrapped rotary-inlet arcs from canonical intervals using React-owned SVG path helpers
- [x] 8.5 Render distinct opening and closing markers, event identities, and focus-accessible details without relying on pointer hover
- [ ] 8.6 Render patterned blowdown, transfer-union, rotary-overlap, triple-overlap, coincident-boundary, and uncertainty overlays with independent visibility controls
- [ ] 8.7 Build semantic event, compression, squish, area, relationship, and comparison tables containing every value expressed by the visual presentation, including unavailable and asymmetric cases
- [x] 8.8 Present `calculated-geometry`, contextual `profile-heuristic`, and verification-dependent `measured-or-modelled` content as visibly distinct levels, with source and verification details where required
- [x] 8.9 Implement wide and narrow responsive layouts that keep primary controls, diagram, summaries, port groups, metric tables, and comparison operable without page-level horizontal scrolling
- [x] 8.10 Add SVG title and description, visible focus, keyboard-operable controls, labelled inputs, non-colour distinctions, and restrained status announcements
- [ ] 8.11 Add presentation-model unit tests, SVG geometry fixtures, component accessibility tests, and visual regression cases for standard, wrapped, uncertain, incomplete, compression, squish, time-area, and comparison projects
- [x] 8.12 Show lifted phases with no-spacer diagram references and a semantic per-port baseline, lifted, and delta table
- [x] 8.13 Show the legacy sealing-track diameter, both physical arcs, per-component angular contribution, combined length and duration, anchored and derived edges, source provenance, direct duration, and duration difference across semantic timing and conversion results
- [ ] 8.14 Replace the legacy comparison bridge with desired opening, desired closing, duration, circumference, total required arc, selected manual component, calculated complementary component, both angular contributions, and explicit remaining-solid-shoulder guidance
- [ ] 8.15 Complete accessible read-only, incomplete, non-positive-result, and over-circumference states without relying on colour or a disabled control alone
- [x] 8.16 Present the three canonical diagnostic levels and explicit profile selector with source, version, applicability, uncertainty status, and non-colour distinctions
- [x] 8.17 Present inlet opening margin, separate inlet closing, and complete blowdown in adjacent accessible groups that preserve signed values, bounds, units, provenance, and partial unavailable states
- [ ] 8.18 Render the geometric rotary area curve and Engine character estimate with real geometric units, bounded uncertainty, profile annotations, semantic numeric tables, and no torque, power, peak-output, or dyno labels

## 9. Persistence, Sharing, and Export

- [x] 9.1 Implement a browser-local project repository that autosaves only validated authoritative project state and reports storage failures without blocking calculation
- [x] 9.2 Implement startup restoration with a valid share fragment taking explicit precedence over the last local project and with atomic fallback on invalid data
- [x] 9.3 Implement schema-versioned JSON export with sanitised filenames and no persisted derived values
- [x] 9.4 Implement bounded, atomic JSON import that preserves the current project on malformed, oversized, unsupported, or semantically invalid input
- [x] 9.5 Implement URL-safe fragment encoding and decoding, documented link-size limits, copy/share actions, and JSON fallback for projects that exceed the limit
- [ ] 9.6 Implement SVG export from the shared presentation model with visible tracks, selected overlays, orientation, legend, accessible description, and unavailable-event disclosure
- [x] 9.7 Implement an A4 print stylesheet and printable report containing editable project identity, authoritative geometry and source measurements, vector timing diagram, event and metric tables, comparison, uncertainty, diagnostic levels, warnings, assumptions, and generation date
- [x] 9.8 Add action feedback that confirms completed save, share, import, and export operations without changing source data or physical-verification status
- [ ] 9.9 Add persistence and portability tests for restoration, unavailable storage, corrupt local state, schema versions, import limits, fragment round trips, long-link fallback, SVG content, and print structure
- [x] 9.10 Persist the legacy schema version 2 rotary source authority and schema version 3 report identity, gate save, export, share, and print on valid authoritative state, and normalise legacy schema version 1 and 2 projects without changing engine timing
- [ ] 9.11 Make blocked save, JSON export, fragment-share, and print messages identify missing diameter, invalid desired duration, missing manual component, non-positive complement, or circumference overflow rather than returning only a generic geometry error
- [x] 9.12 Add model, storage, fragment, and server-render checks for report metadata, legacy migration, print controls, and print structure; browser PDF pagination remains covered by 9.9 and 11.5
- [x] 9.13 Add schema-version-4 storage and portable migration from versions 1, 2, and 3, including arc-authoritative reconstruction, timing-only legacy preservation, deterministic crank-component selection, and schema-version-3 report preservation
- [ ] 9.14 Add model, transition, storage, JSON, fragment, and UI tests for each solve direction, full-precision authority switching, migration precedence, invalid complement boundaries, and proof that derived fields never become persisted authority
- [ ] 9.15 Add schema-version-5 persistence, migration, storage, JSON, fragment, and report tests for profile and reference version, area source and common width, stated bounds, RPM sweep, unsupported reference sets, and proof that diagnostics and graph series remain derived
- [x] 9.16 Add schema-version-6 persistence, legacy-key fallback, JSON, fragment, and report tests for disabled migration, manually entered four- and five-gear authority, wheel circumference, maximum RPM, and proof that ratios, road speeds, shift results, and graph series remain derived

## 10. Product Hardening and Verification

- [x] 10.1 Ensure imported and user-authored labels render only as text, project content is not sent to a backend, and generated downloads use safe blob and filename handling
- [x] 10.2 Add a content-security policy and production security headers compatible with static hosting and the required client-side features
- [ ] 10.3 Run keyboard-only and screen-reader reviews against the workbench, diagram summary, semantic tables, metric panels, comparison, validation, sharing, and export flows
- [ ] 10.4 Run responsive and cross-browser checks for the supported desktop and mobile browser matrix
- [ ] 10.5 Cross-check golden engine configurations against independent calculations and record at least one assembled-engine degree-wheel, volume, and squish verification
- [ ] 10.6 Verify that display rounding never feeds back into the canonical project and that repeated source-mode round trips remain within the documented tolerance
- [ ] 10.7 Verify that every overlap, compression, squish, time-area, comparison, and exported report carries its model boundary and canonical diagnostic level and that no universal tuning judgement is emitted
- [x] 10.8 Complete a dependency review, production build inspection, secret scan, and static-asset size check before release
- [ ] 10.9 Verify profile isolation, diagnostic provenance, uncertainty boundary behaviour, geometric-area naming, and the absence of torque, power, peak-output, or synthetic dyno claims in UI, accessible tables, print, and export

## 11. Documentation and Deployment

- [x] 11.1 Write a British English README covering local development, quality commands, architecture boundaries, static deployment, and OpenSpec workflow
- [x] 11.2 Add user-facing methodology and measurement documentation for geometry assumptions, port references and profiles, rotary timing, compression, squish, time-area, comparison, uncertainty, blowdown, overlap, diagnostic levels, transmission tooth conventions, wheel rolling circumference, theoretical road speed, and excluded predictions
- [x] 11.3 Document the project JSON schema, compatibility policy, privacy boundary, share-link limits, and recovery from unsupported or corrupt data
- [ ] 11.4 Configure an immutable static preview deployment with the correct repository base path and no backend project storage
- [ ] 11.5 Run the full CI, production preview, browser smoke, accessibility, import/export, print, and mathematical acceptance suite against the deployed artefact
- [ ] 11.6 Record the verified release artefact and rollback target, then publish the preview without selecting a final commercial host or domain
- [x] 11.7 Document the legacy rotary arc formula, effective sealing-track diameter, open-cut-away convention, shared-diameter and true-arc assumptions, phase-anchor requirement, schema compatibility, and excluded predictions
- [x] 11.8 Replace legacy phase-anchor documentation with desired timing, arc-sizing diameter, one manual component, calculated complement, exact circumference tolerance, full-cycle warning, and invalid-result policy
- [x] 11.9 Document schema-version-4 migration precedence and timing-only recovery for legacy projects without fabricating diameter or component geometry
- [ ] 11.10 Document profile catalogue sources and versions, separate inlet-closing and complete-blowdown interpretation, rotary overlap-area measurement and exclusions, bounded uncertainty, Engine character estimate limits, and schema-version-5 migration
- [x] 11.11 Document manual primary and gearbox tooth entry, loaded-wheel rolling-circumference measurement, gearing formulas, speed-versus-RPM axes, theoretical-road-speed exclusions, and schema-version-6 migration

## 12. Transmission and Road-Speed Analysis

- [x] 12.1 Implement a framework-independent transmission kernel for primary, per-gear, and overall reductions, wheel RPM, theoretical road speed, inverse engine RPM, speed per 1,000 RPM, maximum-RPM speed, adjacent-upshift RPM, and percentage RPM drop
- [x] 12.2 Validate positive whole primary and gear tooth counts, exactly four or five ordered active gears, positive bounded wheel rolling circumference, and bounded graph maximum RPM without rounding or silently swapping driving and driven values
- [x] 12.3 Build the optional Transmission editor with stable gear identities, four- or five-gear selection, explicit primary driving and driven labels, explicit cluster-pinion and driven-wheel labels, manually entered tooth counts, authoritative loaded-wheel measurement guidance, manually entered circumference, and real-time valid-state calculation
- [x] 12.4 Render a responsive graph with road speed in kilometres per hour on X and engine RPM on Y, one labelled and non-colour-distinguished line per gear, selected maximum-RPM endpoints, and a semantic table containing every plotted and calculated value
- [x] 12.5 Add non-blocking progression diagnostics and repeat the geometric-only boundary that road-speed results exclude tyre growth or slip, clutch slip, drivetrain loss, load, drag, gradient, power, acceleration, and the ability to reach selected RPM
- [x] 12.6 Include authoritative transmission inputs, calculated ratios, speed-versus-RPM graph, equivalent table, units, and vehicle-dynamics boundary in the A4 print report while omitting interactive-only controls
- [ ] 12.7 Add analytic, round-trip, invalid-boundary, manual-entry, four- and five-gear, progression-warning, semantic-equivalence, server-render, responsive, accessibility, print, migration, and no-top-speed-claim tests

## 13. Windows Desktop Distribution

- [x] 13.1 Build a desktop renderer from the shared calculation, project, presentation, accessibility, print, and export paths without a hosted-code dependency or project-schema fork
- [x] 13.2 Implement the hardened Electron host with a bounded packaged-content scheme, sandboxing, context isolation, no Node integration, denied renderer network access and navigation, an external-reference allowlist, strict desktop CSP, and hardened fuses
- [x] 13.3 Define explicit desktop behaviour for local persistence, clear-data, JSON and SVG export, print, and a canonical HTTPS share link without transmitting project content
- [x] 13.4 Add a native Windows lockfile build that produces x64 installer and portable executables, SHA-256 checksums, and a source-linked build manifest
- [x] 13.5 Add automated desktop security tests for Node isolation, protocol traversal, CSP, permissions, navigation, external links, archive loading, fuse state, deterministic calculation, and local persistence
- [x] 13.6 Run the native Windows smoke test against the portable and installed application, including offline local loading, a known calculation, persistence, clean shutdown, installation, and uninstall
- [x] 13.7 Record exact artefact hashes, Windows runner, architecture, source commit, dependency-audit result, smoke evidence, and signing status
- [x] 13.8 Document unsigned SmartScreen behaviour and require verified Authenticode publisher identity before any public Windows promotion

## 14. macOS Desktop Distribution

- [x] 14.1 Configure separate DMG and ZIP packages for Apple Silicon ARM64 and Intel x64 with an explicit bundle identifier, icon, category, filename architecture, and macOS 12 minimum
- [x] 14.2 Add a native macOS application, edit, and window menu with standard roles and no packaged reload or developer-tools entry
- [x] 14.3 Add a native macOS verifier for every Mach-O architecture, bundle metadata, DMG integrity, ZIP extraction, Electron fuses, code integrity, signing state, notarisation, Gatekeeper, checksums, and packaged-format smoke tests
- [x] 14.4 Add lockfile-based native `macos-15` ARM64 and `macos-15-intel` x64 workflow jobs with immutable actions and architecture-specific retained artefacts
- [ ] 14.5 Run native ARM64 and Intel smoke tests against the unpacked, DMG-contained, and ZIP-contained applications
- [ ] 14.6 Record exact hashes, source commit, runner and macOS versions, architectures, dependency audit, fuses, package smoke evidence, signature classification, Apple Team ID, notary tickets, and Gatekeeper state for both architectures
- [x] 14.7 Document installation, architecture selection, internal ad-hoc and Gatekeeper limits, local-data behaviour, and checksum verification without recommending global Gatekeeper disablement
- [x] 14.8 Block public promotion unless the expected Developer ID Application and Team ID, strict signature, effective hardened runtime, notarisation, stapled app and DMG tickets, and active Gatekeeper acceptance all pass
