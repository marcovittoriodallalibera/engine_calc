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

### Requirement: Rotary desired-timing and manual-component bridge
For rotary induction the workbench SHALL present desired opening advance before TDC and closing delay after TDC as the timing controls and SHALL offer timing-only and physical arc-sizing modes. Arc-sizing mode SHALL require an effective rotary-valve sealing-track diameter rather than a nominal journal diameter. It SHALL let the user choose exactly one manual physical measurement, either open crank cut-away arc or crankcase inlet-opening arc. The other component SHALL be visibly calculated, read-only, and updated from the desired total arc. The bridge SHALL show desired angles, duration, circumference, total required arc, both component lengths, both angular contributions, and source provenance without relying on the diagram.

#### Scenario: Use timing-only mode
- **WHEN** the user selects timing-only mode and enters valid desired opening and closing angles
- **THEN** the timing map and timing relationships remain available while physical arc inputs and claims are not required

#### Scenario: Enter crank cut-away measurement
- **WHEN** the user selects crank cut-away as the manual source and enters a valid true arc length
- **THEN** the crankcase opening field is read-only, is labelled calculated, and updates with total arc, timing map, overlap, signed margins, and time-area in the same interaction cycle

#### Scenario: Enter crankcase opening measurement
- **WHEN** the user selects crankcase opening as the manual source and enters a valid true arc length
- **THEN** the crank cut-away field is read-only, is labelled calculated, and the same downstream results update in the same interaction cycle

#### Scenario: Diameter is visibly required
- **WHEN** rotary induction and physical arc-sizing mode are selected
- **THEN** the sealing-track diameter is shown as required, its common-diameter assumption is adjacent to the physical inputs, and no other engine diameter is substituted when it is blank or invalid

#### Scenario: Measurement guidance follows authority
- **WHEN** either manual component is selected
- **THEN** guidance identifies the relevant curved sealing-track path, distinguishes open cut-away arc length from the remaining solid shoulder and from a straight chord, and states that the crankcase timing-track diameter is assumed equal to the crank-web timing-track diameter

#### Scenario: Switch manual component with a valid solve
- **WHEN** the user changes manual authority while the current complement is valid
- **THEN** the newly editable field begins with the previous full-precision calculated complement, the other field becomes read-only, and neither component nor the timing diagram jumps solely because authority changed

#### Scenario: Switch manual component without a valid solve
- **WHEN** the user changes manual authority before a valid complement exists
- **THEN** the old numeric token is not relabelled, the new manual field is blank or restores only its own draft, and an actionable incomplete state replaces fabricated geometry

#### Scenario: Desired timing recalculates the complement
- **WHEN** the user edits opening advance or closing delay while diameter and the selected manual arc are valid
- **THEN** duration, total arc, the read-only complementary length, both component degrees, timing map, overlap, signed margins, and time-area update in the same interaction cycle while the manual length remains unchanged

#### Scenario: Non-positive calculated complement
- **WHEN** the selected manual measurement equals or exceeds the total arc implied by desired timing
- **THEN** the calculated field shows a blocking incompatibility instead of zero or a negative physical length, desired timing remains visibly identifiable, and save, share, export, and print remain ineligible while arc-sizing mode is active

#### Scenario: Calculated complement exceeds circumference
- **WHEN** the solve produces a complementary length beyond one circumference
- **THEN** the calculated field identifies the one-cycle boundary, no clamped physical geometry is presented, and desired timing remains distinct from the invalid physical solve

#### Scenario: Full-cycle rotary opening
- **WHEN** desired opening advance plus closing delay equals exactly 360 degrees and both components remain positive and within one circumference
- **THEN** the 360-degree duration and one-circumference total remain visible and a non-blocking warning states that the idealised model has no positive-duration closed interval

#### Scenario: Accessible numeric alternative
- **WHEN** the solved rotary inlet is drawn on the 360-degree timing diagram
- **THEN** the semantic timing and conversion representations identify opening, closing, duration, sealing-track diameter, circumference, total arc, manual component, read-only component, and both converted angular contributions

#### Scenario: Non-rotary induction mode
- **WHEN** reed induction or no induction analysis is selected
- **THEN** rotary desired-timing and component-solver controls are not presented as applicable while cylinder-port calculations remain available

### Requirement: Rotary inlet area controls and geometric curve
The workbench SHALL provide an explicit rotary area-source control for `constant-area` and `cylindrical-overlap`. Constant-area mode SHALL request the entered approximation in square millimetres. Cylindrical-overlap mode SHALL be available only with physical arc sizing and SHALL request a measured positive common axial overlap width, with optional stated uncertainty, beside its measurement guidance. The result SHALL show the selected source, area-versus-angle curve, angle-area, applicable specific time-area, and its model boundary.

#### Scenario: Select cylindrical-overlap area
- **WHEN** physical arc sizing is valid and the user selects cylindrical overlap and enters a valid common axial width
- **THEN** the workbench updates the geometric rotary overlap-area curve, angle-area, specific time-area, uncertainty envelope, and accessible numeric table in the same interaction cycle

#### Scenario: Width or physical geometry is missing
- **WHEN** cylindrical overlap is selected but common axial width or a required physical arc value is incomplete
- **THEN** affected area results show an actionable unavailable state while desired timing, inlet closing, overlap, and signed margin calculations remain usable

#### Scenario: Area terminology is explicit
- **WHEN** the cylindrical result is visible
- **THEN** it is labelled geometric rotary overlap area, identifies the common-width and shared-diameter assumptions, and states that it is not discharge-corrected effective flow area

#### Scenario: Area curve does not rely on colour
- **WHEN** nominal and uncertainty-bounded rotary area series are presented
- **THEN** line style, labels, markers, and a semantic numeric table distinguish them independently of colour

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

### Requirement: Metric and diagnostic-level presentation
The workbench SHALL present displacement, mean piston speed, geometric compression, exhaust-closure trapped geometric compression, target clearance volume, squish statistics, annular geometry, angle-area, specific time-area, and blowdown time-area with inputs, units, model names, and interpretation boundaries. Every diagnostic SHALL visibly identify `calculated-geometry`, `profile-heuristic`, or `measured-or-modelled`, and SHALL show the evidence subtype, source, reference-set version, applicability, calibration scope, and uncertainty required by that level. Severity SHALL be visually and semantically separate from claim level.

#### Scenario: Review trapped compression
- **WHEN** a valid trapped geometric ratio is shown
- **THEN** the same panel identifies the exhaust-closing reference and states that the value is not a running-pressure or detonation prediction

#### Scenario: Review profile heuristic
- **WHEN** the application presents a comparison with a selected profile band
- **THEN** the profile identifier, reference-set version, source, applicable configuration, numeric comparison, and uncertainty status are visible next to the advisory result

#### Scenario: Review measured or modelled evidence
- **WHEN** a measured observation or calibrated-model result is presented
- **THEN** the interface distinguishes its subtype and displays provenance, operating condition, calibration scope, and uncertainty without presenting a model as a measurement

#### Scenario: Claim level does not rely on colour
- **WHEN** diagnostics at more than one level are present
- **THEN** visible text labels, accessible names, and structured grouping distinguish the levels independently of hue or warning severity

### Requirement: Explicit engine-use profile selection
The workbench SHALL provide an optional diagnostic profile selector containing `none`, touring box, sport box, road expansion, and race expansion. It SHALL explain the intended engine-use and exhaust context of each profile, show the active reference-set version and sources, default to `none` for migrated projects without a selection, and SHALL never auto-select or infer a profile from entered geometry.

#### Scenario: Select a profile explicitly
- **WHEN** the user selects road expansion
- **THEN** profile-qualified diagnostics and character annotations update while all calculated values, diagram events, areas, and uncertainty intervals remain unchanged

#### Scenario: Select no profile
- **WHEN** the user chooses `none`
- **THEN** calculated geometry remains visible, profile heuristics are omitted, and no previous profile judgement remains attached to the project

#### Scenario: Profile reference is unsupported
- **WHEN** a project requests a profile reference-set version unavailable in the application
- **THEN** geometry loads, profile diagnostics are marked unavailable, and the interface does not silently substitute the current version

### Requirement: Connected inlet and blowdown analysis panels
The workbench SHALL present the signed inlet-opening versus transfer-closing margin, rotary inlet closing delay, and global blowdown as separate but adjacent results. The margin SHALL preserve its sign and uncertainty interval. Inlet closing SHALL remain separate from opening and total duration. Global blowdown SHALL group degrees, elapsed milliseconds, exhaust angle-area, and specific time-area with the earliest-transfer and RPM references.

#### Scenario: Inspect rotary timing relationships
- **WHEN** rotary timing and at least one transfer event are valid
- **THEN** the user can inspect opening advance, signed inlet-to-transfer margin, closing delay, and total duration as independently labelled values rather than one combined intake score

#### Scenario: Inspect complete blowdown
- **WHEN** all timing, RPM, displacement, and exhaust-area inputs are valid
- **THEN** blowdown degrees, elapsed milliseconds, angle-area, specific time-area, first-opening transfer identity, and integration boundary appear in one result group

#### Scenario: Blowdown inputs are incomplete
- **WHEN** blowdown degrees are valid but RPM or exhaust-area data is absent
- **THEN** the valid degrees remain visible and each dependent metric states what is missing without applying a sufficiency judgement

#### Scenario: Timing relation is uncertain
- **WHEN** a signed margin or blowdown interval crosses zero after uncertainty propagation
- **THEN** nominal value, lower bound, upper bound, and an explicit uncertain relation are available without relying on colour or the nominal sign alone

### Requirement: Qualitative Engine character estimate visualisation
The workbench SHALL provide a section titled Engine character estimate that plots calculated area versus crank angle and specific time-area versus a bounded user-editable RPM sweep using their actual units. If a profile is selected, it MAY add separately labelled lower-speed, mid-range, upper-speed, or area-limited contextual annotations. It SHALL provide a semantic numeric table for every plotted series. No axis or series SHALL use torque, power, horsepower, CV, kilowatts, newton metres, peak-output, or dyno-curve terminology.

#### Scenario: Inspect geometry-based character view
- **WHEN** valid geometric area inputs and RPM sweep are available
- **THEN** the graphs, units, source labels, uncertainty bands, and model boundaries update in real time without fabricating a torque or power series

#### Scenario: Profile annotation is conditional
- **WHEN** a selected profile supports a qualitative annotation
- **THEN** the annotation is labelled `profile-heuristic`, names the profile and reference-set version, and remains visually separate from the calculated series

#### Scenario: No profile or insufficient input
- **WHEN** no profile is selected or a required area input is absent
- **THEN** available calculated series remain visible, unsupported annotations or series are marked unavailable, and timing degrees are not converted into a synthetic curve

#### Scenario: Character graph cannot be perceived
- **WHEN** a user relies on the semantic table instead of the graph
- **THEN** the same RPM samples, geometric area or specific time-area values, uncertainty bounds, profile annotation text, and model boundaries are available without colour or pointer interaction

### Requirement: Transmission editor and road-speed visualisation
The workbench SHALL provide an optional Transmission editor in which the user manually enters primary driving-pinion and driven-gear tooth counts, selects four or five gears, manually enters cluster-pinion and driven-wheel tooth counts for each active gear, and manually enters wheel rolling circumference and graph maximum RPM. It SHALL recalculate valid reductions and road-speed results in real time. A dedicated result section SHALL show theoretical road speed on the horizontal axis and engine RPM on the vertical axis, with one distinctly labelled series per gear and an equivalent semantic table.

#### Scenario: Edit a primary tooth count
- **WHEN** the user enters a valid new primary driving-pinion or driven-gear tooth count
- **THEN** the primary ratio, every overall ratio, every road-speed value, the graph, and the numeric table update in the same interaction cycle

#### Scenario: Switch between four and five gears
- **WHEN** the user selects four or five gears
- **THEN** the editor, graph series, legend, and semantic table expose exactly that number of active ordered gears without remounting or renaming the retained gear rows

#### Scenario: Measure the installed wheel
- **WHEN** the user inspects wheel-circumference guidance
- **THEN** the workbench identifies one loaded rolling revolution as the authoritative measurement and explains that the circumference must be entered manually

#### Scenario: Transmission input is temporarily incomplete
- **WHEN** one enabled transmission field contains an intermediate or invalid token
- **THEN** that field receives an actionable validation state, the last valid graph may remain visible as stale, and unrelated timing, compression, squish, and character results remain operable

#### Scenario: Transmission graph cannot be perceived
- **WHEN** a user relies on the semantic table rather than the transmission graph
- **THEN** the primary ratio, each gear and overall ratio, theoretical speed per 1,000 RPM, theoretical speed at maximum RPM, adjacent-shift RPM and drop, units, and vehicle-dynamics exclusions remain available without colour or pointer interaction

#### Scenario: Narrow transmission layout
- **WHEN** the viewport is narrow
- **THEN** tooth-pair controls, source guidance, graph, legend, and table remain operable in a logical vertical order without page-level horizontal scrolling

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

### Requirement: Editable project report identity
The workbench SHALL provide a discoverable project-report section containing project name, project code, project date, and up to three lines for components and engine characteristics. Editing these fields SHALL update local and portable project state without changing any engine calculation.

#### Scenario: Document a project
- **WHEN** the user enters project identity and engine-detail text
- **THEN** the values are available to autosave, import, export, sharing, and the print report while all calculated timing and geometry remain unchanged

#### Scenario: Exceed the engine-detail line limit
- **WHEN** the engine-detail field contains more than three logical lines
- **THEN** the field identifies the recoverable error and valid persistence, sharing, export, and print remain blocked until the text is reduced to three lines
