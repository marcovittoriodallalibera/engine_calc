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
The system SHALL define a schema-versioned project document containing authoritative source inputs, units, labels, modes, geometry, clearance-volume source, squish readings, rectangular port profiles, comparison configuration, documented-reference metadata, uncertainty, and user-selected presentation state required for reproducibility. Derived mathematical results SHALL be recalculated rather than treated as authoritative persisted values.

#### Scenario: Export current project as JSON
- **WHEN** the user exports a valid project
- **THEN** the downloaded JSON includes a schema version and all authoritative project data required to reproduce the current calculation

#### Scenario: Recalculate after import
- **WHEN** a supported project document is imported
- **THEN** all derived geometry and analysis results are regenerated from its authoritative inputs

#### Scenario: Unsupported newer schema
- **WHEN** a project document declares a schema version newer than the application supports
- **THEN** the system rejects the import atomically and explains that the file requires a newer application version

### Requirement: Validated JSON import
The system SHALL treat imported JSON as untrusted input, validate its complete structure and bounded values before applying it, and leave the current project unchanged if validation fails.

#### Scenario: Valid import
- **WHEN** the user imports a supported and valid project document
- **THEN** the system replaces the current project only after validation succeeds and reports completion

#### Scenario: Malformed import
- **WHEN** the imported file is malformed JSON, exceeds documented size or collection limits, or contains invalid field types
- **THEN** the system rejects it, identifies the validation problem, and preserves the current project

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

### Requirement: Printable report
The system SHALL provide a print layout containing project identification, engine geometry, source measurements, the timing diagram, the complete numeric event table, compression, squish, time-area, comparison deltas, uncertainty, evidence-tier labels, applicable warnings, model assumptions, and generation date.

#### Scenario: Print valid project
- **WHEN** the user invokes print from a valid project
- **THEN** the print preview contains sufficient numeric information to interpret the result without relying on colour alone

#### Scenario: Print a geometric overlap
- **WHEN** the report contains overlap metrics
- **THEN** the report also includes the geometric-only interpretation boundary

### Requirement: Export naming and user control
Downloaded project and diagram files SHALL use a sanitised project name plus an unambiguous file-type suffix. Exporting SHALL not modify the authoritative project or mark a calculation as physically verified.

#### Scenario: Project name contains unsupported filename characters
- **WHEN** the user exports a project whose name contains unsupported filename characters
- **THEN** the downloaded filename uses a safe sanitised form while the project label inside the document remains intact

#### Scenario: Export completed
- **WHEN** any export succeeds
- **THEN** the system confirms the completed action without changing source measurements, warnings, or verification status
