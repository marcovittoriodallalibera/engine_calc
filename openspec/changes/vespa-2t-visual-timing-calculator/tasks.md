## 1. Application Foundation

- [x] 1.1 Scaffold a React and TypeScript application with Vite while preserving the OpenSpec directories and repository history
- [ ] 1.2 Add the minimal runtime and test dependencies for React, d3-shape, Zod, Vitest, Testing Library, Playwright, and automated accessibility checks
- [ ] 1.3 Configure strict TypeScript, linting, formatting, type-check, unit-test, browser-test, and production-build scripts
- [x] 1.4 Establish source boundaries for domain, project schema, application state, presentation, persistence, export, and UI modules
- [ ] 1.5 Add a British English message catalogue and shared unit, number, event, warning, and accessibility terminology
- [ ] 1.6 Add continuous integration that installs from the lockfile and runs lint, type-check, unit tests, component tests, and the production build

## 2. Canonical Project Model

- [ ] 2.1 Define the schema-version 1 engine project model, stable entity identifiers, port categories, induction modes, discriminated authoritative timing, clearance-volume and squish-band sources, optional rectangular port profiles, comparison configuration, and evidence metadata
- [ ] 2.2 Define bounded Zod schemas for project names, geometry, bore, volume components, squish readings, port collections and area profiles, induction data, uncertainty, RPM, comparison data, documented references, and presentation preferences
- [x] 2.3 Implement structured valid, unavailable, and invalid result types so expected user-data problems never become `NaN` or magic zero values
- [x] 2.4 Define stable warning codes, severities, affected-entity references, parameters, and message keys for deterministic and interpretive notices
- [x] 2.5 Implement canonical angle, radian, millimetre, numeric-tolerance, and presentation-rounding helpers
- [ ] 2.6 Add schema tests covering valid projects, bounded collections and labels, malformed values, non-finite numbers, impossible volume and profile dimensions, comparison bounds, and unsupported schema versions

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
- [x] 5.12 Implement arc-length conversion, combined crank-web and crankcase duration, opening or closing phase anchors, physical-boundary diagnostics, and equivalence tests against direct rotary timing

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
- [ ] 6.10 Implement evidence-tier records for calculated geometry, documented configuration-specific references with sources, and tuning hypotheses with required verification
- [x] 6.11 Add analytic, golden, boundary, and convergence tests for displacement, piston speed, volume identities, compression, squish, rectangular-area integration, blowdown time-area, and RPM scaling
- [x] 6.12 Add relationship tests proving that an exhaust-only roof change affects trapped but not geometric compression, spacing changes remain explicit configuration inputs, and no universal intake, transfer, compression, squish, or exhaust target is emitted

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
- [x] 7.14 Add direct-angle versus crank-and-case rotary source controls, true-arc measurement guidance, full-precision anchor switching, and field-level physical constraints

## 8. Results and 360-Degree Visualisation

- [x] 8.1 Build one shared presentation model for diagram tracks, metric and comparison rows, legends, warnings, evidence tiers, source labels, uncertainty, print, and export
- [x] 8.2 Implement British English formatting for canonical degrees, ATDC, BTDC, BBDC, ABDC, millimetres, square millimetres, cubic centimetres, metres per second, RPM, milliseconds, angle-area, specific time-area, ratios, measured values, and calculated values
- [x] 8.3 Render the responsive SVG frame with TDC at the top, BDC at the bottom, clockwise logical angles, major and minor ticks, track labels, and orientation guidance
- [ ] 8.4 Render exhaust, each enabled transfer group, and wrapped rotary-inlet arcs from canonical intervals using React-owned SVG and d3-shape paths
- [x] 8.5 Render distinct opening and closing markers, event identities, and focus-accessible details without relying on pointer hover
- [ ] 8.6 Render patterned blowdown, transfer-union, rotary-overlap, triple-overlap, coincident-boundary, and uncertainty overlays with independent visibility controls
- [ ] 8.7 Build semantic event, compression, squish, area, relationship, and comparison tables containing every value expressed by the visual presentation, including unavailable and asymmetric cases
- [x] 8.8 Present calculated geometry, documented reference, and tuning hypothesis as visibly distinct evidence levels, with source and verification details where required
- [x] 8.9 Implement wide and narrow responsive layouts that keep primary controls, diagram, summaries, port groups, metric tables, and comparison operable without page-level horizontal scrolling
- [x] 8.10 Add SVG title and description, visible focus, keyboard-operable controls, labelled inputs, non-colour distinctions, and restrained status announcements
- [ ] 8.11 Add presentation-model unit tests, SVG geometry fixtures, component accessibility tests, and visual regression cases for standard, wrapped, uncertain, incomplete, compression, squish, time-area, and comparison projects
- [x] 8.12 Show lifted phases with no-spacer diagram references and a semantic per-port baseline, lifted, and delta table
- [x] 8.13 Show rotary physical length, per-component angular contribution, combined duration, anchored and derived edges, source provenance, and direct-angle difference in semantic results

## 9. Persistence, Sharing, and Export

- [x] 9.1 Implement a browser-local project repository that autosaves only validated authoritative project state and reports storage failures without blocking calculation
- [x] 9.2 Implement startup restoration with a valid share fragment taking explicit precedence over the last local project and with atomic fallback on invalid data
- [x] 9.3 Implement schema-versioned JSON export with sanitised filenames and no persisted derived values
- [x] 9.4 Implement bounded, atomic JSON import that preserves the current project on malformed, oversized, unsupported, or semantically invalid input
- [x] 9.5 Implement URL-safe fragment encoding and decoding, documented link-size limits, copy/share actions, and JSON fallback for projects that exceed the limit
- [ ] 9.6 Implement SVG export from the shared presentation model with visible tracks, selected overlays, orientation, legend, accessible description, and unavailable-event disclosure
- [ ] 9.7 Implement a print stylesheet and printable report containing project identity, authoritative geometry, diagram, event and metric tables, comparison, uncertainty, evidence tiers, warnings, assumptions, and generation date
- [x] 9.8 Add action feedback that confirms completed save, share, import, and export operations without changing source data or physical-verification status
- [ ] 9.9 Add persistence and portability tests for restoration, unavailable storage, corrupt local state, schema versions, import limits, fragment round trips, long-link fallback, SVG content, and print structure
- [x] 9.10 Persist rotary arc authority and normalise legacy schema version 1 projects without changing their direct timing

## 10. Product Hardening and Verification

- [x] 10.1 Ensure imported and user-authored labels render only as text, project content is not sent to a backend, and generated downloads use safe blob and filename handling
- [x] 10.2 Add a content-security policy and production security headers compatible with static hosting and the required client-side features
- [ ] 10.3 Run keyboard-only and screen-reader reviews against the workbench, diagram summary, semantic tables, metric panels, comparison, validation, sharing, and export flows
- [ ] 10.4 Run responsive and cross-browser checks for the supported desktop and mobile browser matrix
- [ ] 10.5 Cross-check golden engine configurations against independent calculations and record at least one assembled-engine degree-wheel, volume, and squish verification
- [ ] 10.6 Verify that display rounding never feeds back into the canonical project and that repeated source-mode round trips remain within the documented tolerance
- [ ] 10.7 Verify that every overlap, compression, squish, time-area, comparison, and exported report carries its model boundary and evidence level and that no universal tuning judgement is emitted
- [x] 10.8 Complete a dependency review, production build inspection, secret scan, and static-asset size check before release

## 11. Documentation and Deployment

- [x] 11.1 Write a British English README covering local development, quality commands, architecture boundaries, static deployment, and OpenSpec workflow
- [x] 11.2 Add user-facing methodology and measurement documentation for geometry assumptions, port references and profiles, rotary timing, compression, squish, time-area, comparison, uncertainty, blowdown, overlap, evidence tiers, and excluded predictions
- [x] 11.3 Document the project JSON schema, compatibility policy, privacy boundary, share-link limits, and recovery from unsupported or corrupt data
- [ ] 11.4 Configure an immutable static preview deployment with the correct repository base path and no backend project storage
- [ ] 11.5 Run the full CI, production preview, browser smoke, accessibility, import/export, print, and mathematical acceptance suite against the deployed artefact
- [ ] 11.6 Record the verified release artefact and rollback target, then publish the preview without selecting a final commercial host or domain
- [x] 11.7 Document the rotary arc formula, shared-diameter and true-arc assumptions, phase-anchor requirement, source authority, compatibility and excluded predictions
