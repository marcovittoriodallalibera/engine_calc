## Purpose

Defines private-by-default local continuity and portable, versioned project representations so users can resume, share, inspect, print, and export calculations without requiring an account or backend service.

## ADDED Requirements

### Requirement: Local project continuity
The system SHALL automatically retain the most recent valid project state in browser-local storage when that storage is available, and SHALL restore it on a later visit without requiring an account.

#### Scenario: Resume a local project
- **WHEN** the user returns in the same browser profile after a valid project was saved locally
- **THEN** the system restores the authoritative inputs, labels, modes, and display preferences needed to reproduce the project

#### Scenario: Local storage unavailable
- **WHEN** browser-local persistence is blocked, unavailable, or fails
- **THEN** the calculator remains usable for the current session and informs the user that automatic local recovery is unavailable

#### Scenario: Invalid stored payload
- **WHEN** locally stored project data fails schema validation
- **THEN** the system does not partially apply it and offers a safe empty or demonstration state without crashing

### Requirement: Canonical versioned project document
The system SHALL define a bounded schema-versioned project document containing authoritative source inputs, units, labels, modes, geometry, clearance-volume source, squish readings, rectangular port profiles, comparison configuration, uncertainty, user-selected presentation state, and non-calculating project-report identity required for reproducibility. The current document SHALL use schema version 6. Report identity SHALL include an optional bounded project code, an optional valid ISO project date, and no more than three bounded engine-detail lines. A rotary record SHALL persist its calculation mode, desired opening and closing angles, and area source. Arc-sizing mode SHALL additionally persist effective sealing-track diameter, selected manual-component authority, only that component's measured arc as physical authority, measured common axial overlap width when cylindrical-overlap area is selected, and any explicitly supplied measurement bounds. The project SHALL persist the diagnostic profile identifier `none`, `touring-box`, `sport-box`, `road-expansion`, or `race-expansion`, the selected built-in reference-set version, and the bounded character-graph RPM range. Schema version 6 SHALL additionally persist whether transmission analysis is enabled, manually entered primary driving and driven tooth counts, a four- or five-gear selection, five stable ordered gear records with labels and manually entered tooth pairs, manually entered authoritative wheel rolling circumference, and graph maximum RPM. Primary, gear and overall reductions, upshift RPM, road-speed samples, and graph series SHALL remain derived. The complementary rotary component, total arc, converted component degrees, rotary overlap-area curve, diagnostics, character annotations, print-generation timestamps, other derived mathematical results, and unrecognised properties SHALL NOT become authoritative persisted values; recognised inputs SHALL be reconstructed and all results recalculated.

#### Scenario: Export current project as JSON
- **WHEN** the user exports a valid project
- **THEN** the downloaded JSON includes a schema version and all authoritative project data required to reproduce the current calculation

#### Scenario: Recalculate after import
- **WHEN** a supported project document is imported
- **THEN** all derived geometry and analysis results are regenerated from its authoritative inputs

#### Scenario: Persist schema version 6 rotary geometry
- **WHEN** a valid rotary project in arc-sizing mode is saved, exported, or shared
- **THEN** schema version 6 retains report identity, calculation mode, desired opening advance, desired closing delay, effective sealing-track diameter, selected manual-component authority, its measured arc, rotary area source, applicable common axial width, and stated measurement bounds while recalculating total arc, the read-only complementary length, component degrees, overlap area, and all downstream metrics

#### Scenario: Persist timing-only rotary analysis
- **WHEN** a valid rotary project uses timing-only mode without complete physical arc measurements
- **THEN** schema version 6 preserves the desired opening and closing angles without inventing a diameter, component split, or physical validity claim

#### Scenario: Persist diagnostic and character settings
- **WHEN** the user selects a supported profile, reference-set version, and bounded RPM sweep
- **THEN** schema version 6 preserves those selections while regenerating profile diagnostics, area and time-area series, uncertainty envelopes, and character annotations after restoration

#### Scenario: Persist an enabled transmission study
- **WHEN** a valid enabled transmission configuration is saved, exported, or shared
- **THEN** schema version 6 preserves its enabled state, authoritative tooth counts, four- or five-gear selection, stable gear labels, wheel rolling circumference, and graph maximum RPM while recalculating all ratios, road-speed values, shift results, and graph series after restoration

#### Scenario: Persist a disabled transmission draft
- **WHEN** transmission analysis is disabled and its hardware fields are incomplete
- **THEN** schema version 6 preserves the disabled state without requiring or fabricating a valid primary, gearbox, wheel measurement, or road-speed claim

#### Scenario: Persist report identity across portable representations
- **WHEN** the user saves locally, exports JSON, or creates a supported share link after entering a project code, project date, and up to three engine-detail lines
- **THEN** every representation preserves those fields exactly without using them as calculation inputs

#### Scenario: Migrate any supported pre-transmission project
- **WHEN** a valid schema version 1, 2, 3, 4, or 5 project is migrated to schema version 6
- **THEN** every recognised authoritative legacy field is preserved, transmission analysis is added disabled, and no primary teeth, gear teeth, wheel circumference, ratio, road speed, or transmission claim is invented

#### Scenario: Read a legacy schema version 1 rotary project
- **WHEN** a supported version 1 document contains direct rotary angles but predates the rotary source and arc fields
- **THEN** the reader preserves the desired opening and closing angles, adds empty report fields, selects timing-only mode and profile `none`, preserves a recognised prior effective-area input as `constant-area` when present, adds transmission analysis disabled, and does not invent diameter, physical component measurements, uncertainty, tooth counts, wheel circumference, or profile judgements

#### Scenario: Read a schema version 2 project
- **WHEN** a supported version 2 document has valid active two-arc geometry and a phase anchor
- **THEN** the reader resolves its positioned opening and closing angles, selects the stored open crank cut-away as deterministic manual authority, verifies that the complementary solve reproduces the stored crankcase opening within tolerance, adds empty report fields, selects profile `none`, preserves a recognised prior effective-area input as `constant-area` when present, adds transmission analysis disabled, invents no uncertainty or transmission hardware, and reconstructs schema version 6

#### Scenario: Read a schema version 3 arc-authoritative project
- **WHEN** a supported version 3 document has valid active two-arc geometry and a phase anchor
- **THEN** the reader applies the same deterministic component migration while preserving its report identity, selecting profile `none`, preserving a recognised prior effective-area input as `constant-area` when present, adding transmission analysis disabled, inventing no uncertainty or transmission hardware, and reconstructing schema version 6

#### Scenario: Read a schema version 4 project
- **WHEN** a supported version 4 document contains desired rotary timing and its single-manual-component authority but predates version 5 diagnostic, area-source, uncertainty, and character fields
- **THEN** the reader preserves the version 4 rotary authority, report identity, and recognised constant-area input, selects profile `none`, uses the documented default character RPM range, adds transmission analysis disabled, invents no physical measurement, uncertainty, tooth count, or wheel circumference, and reconstructs schema version 6

#### Scenario: Read a schema version 5 project
- **WHEN** a supported version 5 document contains diagnostic, uncertainty, rotary-area, and character settings but predates transmission analysis
- **THEN** the reader preserves every recognised version 5 authoritative field, adds transmission analysis disabled with no populated hardware or wheel measurement, and reconstructs schema version 6

#### Scenario: Read a legacy direct-angle project
- **WHEN** a version 2 or 3 project uses direct-angle authority
- **THEN** the reader preserves its desired angles in timing-only mode, retains only recognised inactive physical draft fields, and does not promote those fields into a physical validity claim

#### Scenario: Restore legacy local storage
- **WHEN** no current-schema project is stored and a valid schema version 1 project exists under the documented legacy storage key
- **THEN** the application restores its desired angles in timing-only mode with empty report identity and disabled transmission analysis and writes subsequent valid saves using the current schema version 6 storage key

#### Scenario: Restore schema version 2 local storage
- **WHEN** no current-schema project is stored and a valid schema version 2 project exists under its documented legacy storage key
- **THEN** the application applies the documented rotary migration, adds empty report identity and disabled transmission analysis, and writes a valid migrated or subsequently completed project using the schema version 6 storage key

#### Scenario: Restore schema version 3 local storage
- **WHEN** no current-schema project is stored and a supported schema version 3 project exists under its documented legacy storage key
- **THEN** the application preserves report identity, applies the documented rotary migration, adds disabled transmission analysis, and writes a valid migrated or subsequently completed project using the schema version 6 storage key

#### Scenario: Restore schema version 4 local storage
- **WHEN** no current-schema project is stored and a supported schema version 4 project exists under its documented legacy storage key
- **THEN** the application preserves its desired timing, manual-component authority, report identity, and recognised constant-area input, adds profile `none` without uncertainty and disabled transmission analysis, and writes subsequent valid saves using the schema version 6 storage key

#### Scenario: Restore schema version 5 local storage
- **WHEN** no current-schema project is stored and a supported schema version 5 project exists under its documented legacy storage key
- **THEN** the application preserves every recognised version 5 field, adds disabled transmission analysis without hardware assumptions, and writes subsequent valid saves using the schema version 6 storage key

#### Scenario: Invalid rotary component solver
- **WHEN** arc-sizing mode lacks a valid diameter or selected manual component, desired duration is outside its bounds, or the derived complement is non-positive or exceeds one circumference
- **THEN** automatic saving does not replace the last valid local project and JSON export, fragment sharing, and print are declined with an actionable validation message

#### Scenario: Invalid enabled transmission
- **WHEN** transmission analysis is enabled with an invalid gear count, tooth count, wheel rolling circumference, or maximum RPM
- **THEN** automatic saving does not replace the last valid local project and JSON export, fragment sharing, and print are declined with an actionable transmission validation message

#### Scenario: Derived complement is not persisted as authority
- **WHEN** a valid schema-version-6 project contains a displayed complementary arc or converted component degrees
- **THEN** save, export, and share reconstruct those values from desired timing, diameter, manual authority, and manual arc rather than retaining derived fields as independent inputs

#### Scenario: Derived transmission results are not persisted as authority
- **WHEN** a valid schema-version-6 project contains displayed reductions, road-speed values, upshift results, or graph samples
- **THEN** save, export, and share reconstruct those values from recognised transmission inputs rather than retaining them as authoritative records

#### Scenario: Reconstruct recognised authoritative fields
- **WHEN** an otherwise supported document contains unrecognised properties or persisted derived rotary edges, durations, overlaps, converted angles, transmission ratios, shift results, road speeds, or graph samples
- **THEN** the reader reconstructs the canonical project from recognised authoritative fields and recalculates all derived values without retaining the extra properties as authority

#### Scenario: Unsupported diagnostic reference-set version
- **WHEN** a structurally valid schema-version-6 project names a recognised diagnostic profile but a built-in reference-set version unavailable in the current application
- **THEN** authoritative project geometry loads and recalculates, profile diagnostics and character annotations are marked unavailable, and no newer or older reference set is silently substituted

#### Scenario: Unsupported newer schema
- **WHEN** a project document declares a schema version newer than the application supports
- **THEN** the system rejects the import atomically and explains that the file requires a newer application version

### Requirement: Validated JSON import
The system SHALL treat imported JSON as untrusted input, validate its complete structure and bounded values before applying it, and leave the current project unchanged if validation fails.

#### Scenario: Valid import
- **WHEN** the user imports a supported and valid project document
- **THEN** the system replaces the current project only after validation succeeds and reports completion

#### Scenario: Supported timing-only legacy import
- **WHEN** a structurally valid version 1, 2, 3, 4, or 5 document preserves desired timing but cannot establish physical rotary geometry without invention
- **THEN** the system atomically opens the migrated timing-only project, keeps physical geometry unavailable, and does not fabricate a component solve

#### Scenario: Malformed import
- **WHEN** the imported file is malformed JSON, exceeds documented size or collection limits, or contains invalid field types
- **THEN** the system rejects it, identifies the validation problem, and preserves the current project

#### Scenario: Import invalid active rotary geometry
- **WHEN** a current-version imported project selects arc-sizing mode and contains an invalid sealing-track diameter, desired duration, manual authority, manual arc, or non-positive or over-circumference complementary result
- **THEN** the complete import is rejected, the current project remains unchanged, and no partial rotary values are applied

#### Scenario: Import invalid enabled transmission
- **WHEN** a current-version imported project enables transmission analysis with an invalid gear count, duplicate or unbounded gear identity, non-whole tooth count, invalid wheel rolling circumference, or invalid maximum RPM
- **THEN** the complete import is rejected, the current project remains unchanged, and no partial transmission values or derived road-speed results are applied

#### Scenario: Excessive custom label
- **WHEN** imported data contains a label beyond the documented length limit
- **THEN** the system rejects or explicitly sanitises the field according to the published schema rather than inserting unbounded content

### Requirement: Client-side share links
The system SHALL create a shareable URL that encodes a validated, versioned project state in the client-side URL fragment when the project fits the documented link-size limit. Opening that URL SHALL reconstruct the same authoritative project state without a project-content request to a backend.

#### Scenario: Open a valid share link
- **WHEN** a recipient opens a supported share URL
- **THEN** the calculator validates the fragment and reproduces the shared authoritative inputs and calculated results

#### Scenario: Project exceeds link limit
- **WHEN** the encoded project would exceed the documented safe link size
- **THEN** the system declines to create an unreliable link and directs the user to JSON export instead

#### Scenario: Corrupt share fragment
- **WHEN** a link contains an invalid or corrupted project fragment
- **THEN** the system reports that the shared project cannot be loaded and does not merge partial values into an existing project

### Requirement: Project-content privacy
The client-only release SHALL NOT transmit project measurements, labels, calculated results, or imported documents to a project backend. Any future action that transmits project content SHALL require a separate capability and an explicit user action.

#### Scenario: Calculate and autosave
- **WHEN** the user edits, calculates, and stores a project locally
- **THEN** project content remains within the browser environment

#### Scenario: Create fragment share link
- **WHEN** the user creates a supported client-side share link
- **THEN** the encoded project remains in the URL fragment and no project record is created on a server

### Requirement: SVG export
The system SHALL export the current timing diagram as a valid SVG containing its visible event tracks, orientation labels, legend, and a concise textual description. Export SHALL use full calculated geometry appropriate to the selected display state rather than a raster screenshot.

#### Scenario: Export diagram
- **WHEN** the user exports SVG from a valid project
- **THEN** the downloaded vector file reproduces the visible nominal events and selected overlays at scalable resolution

#### Scenario: Export with unavailable events
- **WHEN** some configured events are invalid or incomplete
- **THEN** the export includes valid visible events and a concise indication that omitted events were unavailable rather than drawing fabricated arcs

### Requirement: Portable diagnostic provenance and boundaries
Every portable representation that includes a diagnostic, geometric area curve, Engine character estimate, or transmission graph SHALL include its units and model boundary. Diagnostic content SHALL additionally include claim level, source, selected profile and reference-set version, applicability, and uncertainty status. Canonical JSON SHALL persist only authoritative profile, geometry, and transmission inputs and SHALL regenerate diagnostics, ratios, road speeds, and graph series after validation rather than storing them as evidence.

#### Scenario: Export profile-qualified interpretation
- **WHEN** a human-readable export includes a profile heuristic
- **THEN** it identifies `profile-heuristic`, profile, reference-set version, source, applicability, and uncertainty state beside the interpretation

#### Scenario: Export geometric rotary area
- **WHEN** a human-readable export includes the rotary overlap-area curve or its integral
- **THEN** it identifies the shared-diameter and common-width assumptions and states that the result is geometric rather than discharge-corrected effective flow area

#### Scenario: Portable JSON is recalculated
- **WHEN** a valid schema-version-6 JSON document is opened
- **THEN** diagnostic, rotary-area, character, and transmission graph content is regenerated from authoritative inputs and the supported diagnostic reference set rather than trusted from persisted derived records

#### Scenario: Export a transmission study
- **WHEN** a human-readable export includes transmission results
- **THEN** it includes the authoritative tooth counts and wheel rolling circumference, calculated reductions and road-speed values, axis units, and the statement that the result does not predict achievable top speed or vehicle performance

### Requirement: Printable report
The system SHALL provide a dedicated A4 portrait print layout containing the project title, editable project code, editable project date, up to three editable component or engine-characteristic lines, print-generation date, authoritative engine geometry, source measurements, the vector timing diagram, the complete numeric event table, compression, squish, time-area, comparison deltas, uncertainty, diagnostic-level labels, selected profile and reference-set version, applicable warnings, and model assumptions. When present in the current project, the report SHALL include the geometric rotary area curve and Engine character estimate with accessible numeric values, real geometric units, source labels, and the no-torque-or-power boundary. When transmission analysis is enabled and valid, the report SHALL also include authoritative primary and gear tooth pairs, wheel rolling circumference, selected maximum RPM, calculated reduction and road-speed table, the road-speed-horizontal and RPM-vertical graph, and the theoretical-road-speed boundary. The layout SHALL hide interactive-only controls, remain independent of the currently selected diagram phase, and use controlled page breaks without treating colour as the only carrier of meaning.

#### Scenario: Print valid project
- **WHEN** the user invokes print from a valid project
- **THEN** the A4 print preview opens from a visible print action and contains the project header, data, vector graph, and sufficient numeric information to interpret the result without relying on colour alone

#### Scenario: Print project documentation
- **WHEN** project code, project date, and engine-detail lines are entered before printing
- **THEN** the report places them in a dedicated first-page header and distinguishes project date from the generation timestamp

#### Scenario: Print a geometric overlap
- **WHEN** the report contains overlap metrics
- **THEN** the report also includes the geometric-only interpretation boundary

#### Scenario: Print profile-qualified diagnostics
- **WHEN** a selected profile contributes advisory diagnostics or character annotations
- **THEN** the report identifies each as `profile-heuristic`, includes the profile, reference-set version, source, applicability, and uncertainty state, and distinguishes it from calculated geometry

#### Scenario: Print character geometry
- **WHEN** the report contains a qualitative engine-character graph
- **THEN** it includes the underlying geometric series or numeric table and explicitly states that no torque, power, peak-output, or dyno prediction is present

#### Scenario: Print transmission analysis
- **WHEN** the report contains a valid enabled transmission study
- **THEN** it includes the editable hardware and wheel inputs, calculated ratios, speed-versus-RPM graph, equivalent numeric values, and the boundary that selected-RPM speed is theoretical rather than an achievable top-speed prediction

### Requirement: Export naming and user control
Downloaded project and diagram files SHALL use a sanitised project name plus an unambiguous file-type suffix. Exporting SHALL not modify the authoritative project or mark a calculation as physically verified.

#### Scenario: Project name contains unsupported filename characters
- **WHEN** the user exports a project whose name contains unsupported filename characters
- **THEN** the downloaded filename uses a safe sanitised form while the project label inside the document remains intact

#### Scenario: Export completed
- **WHEN** any export succeeds
- **THEN** the system confirms the completed action without changing source measurements, warnings, or verification status
