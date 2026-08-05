## Purpose

Defines the responsive, real-time, and accessible workbench through which users edit engine timing data, understand source and uncertainty, and inspect equivalent graphical and numeric results.

## ADDED Requirements

### Requirement: Real-time valid-state calculation
The workbench SHALL recalculate all affected valid results as soon as an authoritative input becomes valid, without requiring a separate calculate action.

#### Scenario: User changes a port measurement
- **WHEN** the user enters a valid new port-roof measurement
- **THEN** dependent angles, metrics, diagram arcs, and table values update in the same interaction cycle

#### Scenario: User enters an intermediate numeric token
- **WHEN** the current text is an incomplete number such as `57,` or `-`
- **THEN** the field remains editable, is not coerced to zero, and the last valid dependent presentation remains visible with a field-level validation state

#### Scenario: Independent valid events remain usable
- **WHEN** one field is invalid but other port or induction events remain valid
- **THEN** the workbench updates and presents the independent valid results rather than replacing the entire project with an error state

### Requirement: Real-time cylinder lift study
The workbench SHALL provide a dedicated cylinder lift control with direct decimal entry and 0.1 mm decrement and increment actions. For a positive valid lift it SHALL update the active timing diagram and all dependent results immediately, retain the no-spacer configuration as the comparison baseline, and provide a semantic table of baseline, lifted, and signed delta values for every enabled port.

#### Scenario: Step the cylinder upwards
- **WHEN** the user increases installed cylinder lift by 0.1 mm
- **THEN** the diagram, exhaust and transfer durations, blowdown, overlaps, time-area, compression, squish, and per-port comparison table update in the same interaction cycle

#### Scenario: Compare without colour
- **WHEN** a cylinder lift comparison is active
- **THEN** labelled no-spacer reference markers and the numeric comparison table communicate the baseline independently of colour

#### Scenario: Preserve the mechanical assumption
- **WHEN** the cylinder lift study is displayed
- **THEN** the interface states that stroke and connecting-rod length remain unchanged and that compression and squish effects assume the cylinder and head move together without corrective machining

### Requirement: Locale-tolerant numeric entry
The workbench SHALL accept either a comma or a point as the decimal separator for manual metric and angular input, while serialising and calculating from one canonical numeric representation.

#### Scenario: Italian decimal separator
- **WHEN** the user enters `30,5` in a millimetre field
- **THEN** the system interprets the value as 30.5 mm and preserves an appropriate local display representation

#### Scenario: Blank field
- **WHEN** the user clears an optional numeric field
- **THEN** the field becomes not provided rather than numeric zero

### Requirement: Source and derived-value clarity
The workbench SHALL visually distinguish authoritative inputs, derived values, measured values, and unavailable values. A user SHALL be able to make a supported derived representation authoritative through an explicit edit action.

#### Scenario: Geometry-derived phase
- **WHEN** a port is sourced from a millimetre measurement
- **THEN** its degree values are visibly identified as calculated from that measurement

#### Scenario: User selects a derived value for editing
- **WHEN** the user chooses to edit a derived duration
- **THEN** the interface confirms or visibly applies the source-mode change before recalculating linked fields

#### Scenario: Unsupported reverse conversion
- **WHEN** an asymmetric measured event cannot produce one linear port height
- **THEN** the unavailable height is explained rather than shown as zero or a guessed value

### Requirement: Rotary timing source bridge
The workbench SHALL let the user choose direct timing angles or crank-and-crankcase arc geometry as the authoritative rotary source. It SHALL show crank arc, crankcase arc, combined physical length, each angular contribution, combined duration, anchored edge and derived edge together so the correspondence remains inspectable without relying on the diagram.

#### Scenario: Edit physical rotary geometry
- **WHEN** the user changes crankshaft diameter, crank cut-away arc, crankcase opening arc or the active anchor
- **THEN** the converted component angles, derived edge, timing map, overlap, signed margins and time-area update in the same interaction cycle

#### Scenario: Compare with direct timing
- **WHEN** valid direct timing and valid arc geometry are both present
- **THEN** the workbench shows their duration difference while using only the selected source for downstream calculation

#### Scenario: Switch phase anchor
- **WHEN** the user changes from opening-fixed to closing-fixed while valid geometry is available
- **THEN** the newly authoritative anchor begins from the previously derived full-precision edge so the event does not jump solely because the anchor mode changed

#### Scenario: Accessible numeric alternative
- **WHEN** the arc-derived inlet is drawn on the 360-degree timing diagram
- **THEN** a semantic table also identifies source, opening, closing, duration, physical lengths and converted angular contributions

### Requirement: 360-degree timing diagram
The workbench SHALL render a responsive circular timing diagram with TDC at 0 degrees at the top, BDC at 180 degrees at the bottom, and increasing logical cycle angle clockwise. Separate concentric tracks SHALL represent exhaust, each enabled transfer group, rotary inlet when applicable, and analysis overlays.

#### Scenario: Standard cylinder events
- **WHEN** valid exhaust and transfer events exist
- **THEN** each event appears on its own labelled track with distinct opening and closing boundaries

#### Scenario: Wrapped rotary inlet
- **WHEN** a rotary-inlet event crosses the 360/0-degree boundary
- **THEN** it appears as one conceptually continuous event across TDC rather than as an incorrectly reversed arc

#### Scenario: Dynamic transfer collection
- **WHEN** the user adds, removes, renames, enables, or disables a transfer group
- **THEN** the diagram track collection and labels update while retaining the identity of unaffected groups

### Requirement: Compression, squish, and port-area controls
The workbench SHALL provide labelled controls for bore, clearance-volume source, volume breakdown, target trapped ratio, multiple squish readings, annular-band geometry, and optional rectangular projected area for every exhaust and transfer group. Inputs that are not required for angular timing SHALL remain optional and SHALL not block independent timing results.

#### Scenario: Add compression and squish inputs
- **WHEN** the user enters valid bore, clearance volume, and squish measurements
- **THEN** displacement, compression, and squish results update in the same interaction cycle as the timing presentation

#### Scenario: Add port profile later
- **WHEN** a port already has valid timing and the user adds projected width, height, and multiplicity
- **THEN** its angle-area and applicable time-area results appear without changing the authoritative timing source

#### Scenario: Optional data remains incomplete
- **WHEN** the user leaves compression, squish, or area inputs blank
- **THEN** the workbench identifies only the dependent metrics as not provided and keeps all independent calculations operable

### Requirement: Metric and evidence presentation
The workbench SHALL present displacement, mean piston speed, geometric compression, exhaust-closure trapped geometric compression, target clearance volume, squish statistics, annular geometry, angle-area, specific time-area, and blowdown time-area with inputs, units, model names, and interpretation boundaries. Interpretive content SHALL visibly distinguish calculated geometry, documented reference, and tuning hypothesis.

#### Scenario: Review trapped compression
- **WHEN** a valid trapped geometric ratio is shown
- **THEN** the same panel identifies the exhaust-closing reference and states that the value is not a running-pressure or detonation prediction

#### Scenario: Review documented reference
- **WHEN** the application presents a manufacturer or published configuration value
- **THEN** its source and applicable component configuration are visible next to the value

#### Scenario: Review tuning hypothesis
- **WHEN** a possible tuning implication is presented
- **THEN** it is labelled as a hypothesis and includes the required physical verification rather than a universal verdict

### Requirement: Configuration comparison view
The workbench SHALL let the user capture or load one comparison configuration, show compatible values side by side, and report signed deltas and uncertainty-range overlap without ranking either configuration.

#### Scenario: Compare two complete configurations
- **WHEN** current and comparison configurations both contain a compatible metric
- **THEN** the workbench shows both full-precision-derived display values, their signed delta, and available uncertainty relationship

#### Scenario: Comparison metric is unavailable
- **WHEN** only one configuration can calculate a metric
- **THEN** that delta is explained as unavailable without hiding other valid comparison rows

#### Scenario: Edit current configuration
- **WHEN** the user changes an authoritative current input
- **THEN** current results and deltas update in real time while the captured comparison remains unchanged

### Requirement: Diagram orientation disclosure
The workbench SHALL identify clockwise growth as a logical display convention and SHALL not imply a physical viewing side or actual crankshaft rotation direction unless that separate information is explicitly modelled.

#### Scenario: User views diagram guidance
- **WHEN** the user inspects the orientation explanation
- **THEN** it distinguishes the normalised 0-to-360-degree cycle from a flywheel-side or clutch-side physical view

### Requirement: Visual analysis overlays
The diagram SHALL be able to display exhaust-only blowdown, transfer-open union, rotary-to-transfer overlap, triple overlap, event uncertainty, and coincident event boundaries without relying on colour alone.

#### Scenario: Positive blowdown and triple overlap
- **WHEN** both metrics exist
- **THEN** the diagram displays independently identifiable patterns or markers for each and the legend names them

#### Scenario: Uncertainty band
- **WHEN** an event includes measurement uncertainty
- **THEN** the relevant opening and closing range is visible without replacing the nominal event boundary

#### Scenario: Overlay hidden by user
- **WHEN** the user disables an analysis overlay
- **THEN** underlying event tracks and numeric results remain unchanged

### Requirement: Equivalent numeric event table
Every value conveyed by the timing diagram SHALL also be available in a structured HTML table or equivalent semantic representation, including event label, source, opening, closing, duration, supported mechanical notation, uncertainty, and applicable warnings.

#### Scenario: Diagram cannot be perceived
- **WHEN** a user relies on the numeric table rather than the visual diagram
- **THEN** the same event boundaries and analysis results remain available without requiring colour or pointer interaction

#### Scenario: Wrapped interval in the table
- **WHEN** an event crosses TDC
- **THEN** the table identifies the before-TDC opening, after-TDC closing, total duration, and canonical 0-to-360-degree boundaries unambiguously

### Requirement: Measurement guidance
Every physical measurement input SHALL provide visible or focus-accessible guidance that identifies the measured edges, datum, units, sign convention, and whether the value is measured or calculated.

#### Scenario: Deck-referenced roof input
- **WHEN** the user requests help for the deck-referenced port field
- **THEN** the guidance identifies the cylinder deck, port roof, piston crown edge at the cylinder wall, and signed TDC piston position

#### Scenario: Rotary timing input
- **WHEN** the user requests help for rotary-inlet timing
- **THEN** the guidance distinguishes intake opening advance from ignition advance and explains before-TDC and after-TDC references

### Requirement: Warning presentation
Errors that prevent a calculation SHALL be associated with the responsible input, while non-blocking domain warnings SHALL remain attached to the affected result. Warning text SHALL not silently change or repair authoritative user data.

#### Scenario: Invalid connecting-rod length
- **WHEN** engine geometry is impossible
- **THEN** the connecting-rod field identifies the blocking error and dependent values are unavailable

#### Scenario: Geometrically valid but interpretively limited result
- **WHEN** overlap is calculated successfully
- **THEN** the result remains visible with a non-blocking explanation that it is not an airflow or performance prediction

### Requirement: Responsive workbench layout
The workbench SHALL remain operable on narrow mobile viewports and wide desktop viewports without horizontal page scrolling for primary inputs or loss of access to the diagram and result table.

#### Scenario: Wide viewport
- **WHEN** sufficient width is available
- **THEN** inputs, the timing diagram, and the main results can be inspected together

#### Scenario: Narrow viewport
- **WHEN** the viewport is narrow
- **THEN** geometry, diagram, summary, and expandable port groups are presented in a logical vertical order with touch-operable controls

### Requirement: Keyboard and assistive-technology access
All workbench functions SHALL be operable by keyboard, all form controls SHALL have programmatic names and visible units, and non-text distinctions SHALL have text equivalents. The diagram SHALL expose a concise accessible name and description while the numeric table remains the authoritative detailed alternative.

#### Scenario: Keyboard-only editing
- **WHEN** a user navigates and edits the workbench without a pointer
- **THEN** every input, source-mode action, overlay control, export action, and warning detail is reachable with visible focus

#### Scenario: Screen-reader diagram access
- **WHEN** assistive technology encounters the diagram
- **THEN** it receives a concise diagram title and summary and can reach the full semantic event table for detailed values

#### Scenario: Real-time updates
- **WHEN** repeated valid keystrokes update calculations
- **THEN** the application avoids announcing every numeric change as an intrusive live-region message and reserves status announcements for meaningful errors or completed actions

### Requirement: Safe reset and demonstration data
The workbench SHALL offer an explicitly labelled demonstration configuration and a reset action that requires confirmation when it would discard unsaved edits. Demonstration values SHALL never be represented as universal tuning recommendations.

#### Scenario: Load demonstration
- **WHEN** the user loads the demonstration project
- **THEN** all sample values are labelled as illustrative and their source mode is visible

#### Scenario: Reset edited project
- **WHEN** the user requests reset after changing the current project
- **THEN** the workbench confirms the destructive action before clearing current project data
