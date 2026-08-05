## Purpose

Defines transparent geometric calculations for displacement, piston speed, compression, squish, piston-port and rotary-overlap time-area, configuration comparison, uncertainty, and evidence-qualified interpretation without presenting those outputs as dynamic engine predictions or universal tuning targets.

## ADDED Requirements

### Requirement: Bore-derived displacement and mean piston speed
The system SHALL calculate piston area as `A = pi * bore^2 / 4`, displacement as `Vd = A * stroke / 1000` in cubic centimetres, and mean piston speed as `2 * stroke_metres * RPM / 60` when the required positive inputs are available.

#### Scenario: Calculate displacement
- **WHEN** the user enters a positive bore and stroke
- **THEN** the system reports full-precision single-cylinder swept displacement and identifies bore and stroke as its authoritative inputs

#### Scenario: Calculate mean piston speed
- **WHEN** bore and stroke are valid and the user enters a positive engine speed
- **THEN** the system reports mean piston speed in metres per second without treating it as peak piston speed or a universal safe-speed verdict

#### Scenario: Engine speed is absent
- **WHEN** no RPM is provided
- **THEN** displacement remains available and mean piston speed is marked not requested

### Requirement: Authoritative clearance volume
The system SHALL support either a directly measured assembled clearance volume or a component breakdown as the authoritative clearance-volume source. Component mode SHALL expose head-chamber, gasket or shim, signed deck-clearance, signed piston-crown, and optional bounded correction volumes and SHALL report their full-precision sum.

#### Scenario: Direct measured volume
- **WHEN** the user selects measured assembled volume and enters a positive value
- **THEN** that value is used for compression calculations without simultaneously adding component volumes

#### Scenario: Component breakdown
- **WHEN** the user selects component mode and supplies valid component values
- **THEN** the system displays each signed contribution and their total before using the total as clearance volume

#### Scenario: Piston protrusion or dome correction
- **WHEN** a piston or deck feature displaces volume into the assembled chamber
- **THEN** its documented signed correction reduces clearance volume rather than being silently converted to a positive addition

#### Scenario: Non-positive total clearance volume
- **WHEN** the component sum is zero or negative
- **THEN** compression results are invalid and the system identifies the breakdown that produced the impossible total

### Requirement: Geometric compression ratio
For valid swept displacement `Vd` and assembled clearance volume `Vc`, the system SHALL calculate geometric compression ratio as `(Vc + Vd) / Vc` and SHALL retain the unrounded volumes used in the result.

#### Scenario: Calculate geometric ratio
- **WHEN** displacement and clearance volume are valid
- **THEN** the system reports geometric compression ratio and the two contributing volumes

#### Scenario: Exhaust timing changes by itself
- **WHEN** only the exhaust-roof timing source changes
- **THEN** geometric compression ratio remains unchanged because bore, stroke, and clearance volume have not changed

### Requirement: Exhaust-closure trapped geometric compression ratio
For a valid exhaust closing event, the system SHALL calculate piston travel `xE` at that closure, effective trapped swept volume as `A * xE / 1000`, and exhaust-closure trapped geometric compression ratio as `(Vc + Vtrapped) / Vc`.

#### Scenario: Symmetric exhaust event
- **WHEN** a centred piston-controlled exhaust event has valid opening and closing geometry
- **THEN** the system uses its full-precision exhaust-closure piston position to calculate the trapped geometric ratio

#### Scenario: Measured exhaust closure
- **WHEN** the exhaust event uses an independently measured valid closing angle
- **THEN** the system uses that closing angle rather than imposing symmetric duration

#### Scenario: Exhaust roof is raised while volume is fixed
- **WHEN** a comparison changes only the exhaust roof so the exhaust closes later
- **THEN** the calculated trapped swept volume and trapped geometric ratio decrease while geometric compression ratio remains unchanged

#### Scenario: Dynamic interpretation boundary
- **WHEN** a trapped ratio is displayed or exported
- **THEN** it is identified as a geometric exhaust-closure ratio and not as running pressure, effective combustion ratio, detonation margin, or a dynamic-compression prediction

### Requirement: Target clearance volume
The system SHALL calculate a target assembled clearance volume as `Vtrapped / (target_ratio - 1)` for a finite target trapped geometric ratio greater than 1. The result SHALL be presented as a geometric volume target and not a machining instruction.

#### Scenario: Valid target ratio
- **WHEN** trapped swept volume is available and the user enters a target ratio greater than 1
- **THEN** the system reports target clearance volume and the signed difference from current clearance volume

#### Scenario: Invalid target ratio
- **WHEN** the target ratio is less than or equal to 1 or non-finite
- **THEN** target clearance volume is withheld and the input is identified as invalid

### Requirement: Squish gap statistics
The system SHALL accept one or more non-negative named squish-gap readings and SHALL calculate minimum, arithmetic mean, maximum, and asymmetry as `maximum - minimum` without applying an unsourced safe-clearance threshold.

#### Scenario: Multiple edge readings
- **WHEN** the user enters valid left, right, front, and rear squish measurements
- **THEN** the system reports the minimum, mean, maximum, and complete spread while preserving each reading

#### Scenario: One reading only
- **WHEN** the user enters a single valid squish measurement
- **THEN** minimum, mean, and maximum equal that reading and the system states that assembly asymmetry cannot be assessed from one point

#### Scenario: Invalid reading
- **WHEN** any squish reading is negative or non-finite
- **THEN** the affected statistic is withheld rather than clipped or replaced with zero

### Requirement: Circular annular squish geometry
For bore `B` and a central circular bowl diameter `Db`, the system SHALL calculate radial band width as `(B - Db) / 2`, annular band area as `pi * (B^2 - Db^2) / 4`, and squish area ratio as `1 - (Db / B)^2`. Bowl diameter and band width SHALL be linked representations with one explicit authoritative source.

#### Scenario: Bowl diameter is authoritative
- **WHEN** the user enters a bowl diameter greater than 0 and no greater than the bore
- **THEN** the system derives radial band width, annular area, and area ratio from the unrounded diameter

#### Scenario: Band width becomes authoritative
- **WHEN** the user elects to edit a derived radial band width
- **THEN** the system changes source mode and derives the matching bowl diameter and annular metrics

#### Scenario: Non-circular geometry
- **WHEN** the actual chamber or squish band is not a central circular annulus
- **THEN** the circular-annulus result is labelled unavailable or approximate according to the selected geometry mode and is not presented as a measured effective area

### Requirement: Rectangular projected port area profile
Each piston-controlled exhaust or transfer group SHALL optionally accept projected window width, window height, and integer multiplicity. For that profile the system SHALL calculate instantaneous geometric open area as `width * clamp(piston_travel - roof_travel, 0, window_height) * multiplicity`.

#### Scenario: Partially uncovered rectangular window
- **WHEN** piston travel is 2 mm below the port roof for a valid 30 mm projected width and the height limit is not reached
- **THEN** one window has 60 square millimetres of geometric open area before multiplicity is applied

#### Scenario: Window fully uncovered
- **WHEN** piston travel exceeds roof travel plus window height
- **THEN** uncovered height is capped at the entered window height

#### Scenario: Area geometry absent
- **WHEN** a port has valid timing but no projected width or window height
- **THEN** timing remains available and area-dependent results are marked unavailable rather than estimated

#### Scenario: Profile limitations
- **WHEN** a rectangular profile result is displayed
- **THEN** the system identifies that chamfers, curved roofs, duct cross-section, discharge coefficient, pressure ratio, and gas state are excluded

### Requirement: Geometric angle-area and specific time-area
The system SHALL numerically integrate each valid rectangular port profile over its open crank interval to obtain angle-area `AA` in square millimetre degrees. For positive RPM `n` and displacement `Vd` in cubic centimetres it SHALL calculate specific time-area as `AA / (6 * n * Vd)` in square millimetre seconds per cubic centimetre.

#### Scenario: Angle-area without RPM
- **WHEN** port geometry and timing are valid but RPM is absent
- **THEN** geometric angle-area remains available and RPM-dependent specific time-area is marked not requested

#### Scenario: Specific time-area at engine speed
- **WHEN** angle-area, displacement, and a positive RPM are available
- **THEN** the system reports specific time-area from full-precision values and states the selected engine speed

#### Scenario: Numerical integration quality
- **WHEN** the same smooth rectangular-profile case is evaluated with the documented production integration tolerance and a finer verification tolerance
- **THEN** the results agree within the published numeric acceptance bound

### Requirement: Explicit rotary inlet area source
The system SHALL support `constant-area` and `cylindrical-overlap` as distinct rotary inlet area sources. `constant-area` SHALL preserve backward-compatible idealised calculation from a separately entered positive area `Ae`, calculating angle-area as `Ae * T` for desired duration `T`. `cylindrical-overlap` SHALL use the changing geometric sealing-surface overlap defined below and SHALL be available only with a valid physical arc solve and measured positive common axial overlap width. Both sources SHALL calculate specific time-area as `AA / (6 * n * Vd)` for positive RPM `n` and displacement `Vd`. The chosen source and its model boundary SHALL remain visible with every rotary area result.

#### Scenario: Constant-area approximation remains available in timing-only mode
- **WHEN** desired rotary timing and a positive entered `Ae` are valid while physical arc sizing is unavailable
- **THEN** the system reports `Ae * T` as a constant-area approximation and does not claim a changing geometric overlap curve

#### Scenario: Physical arc solve is invalid for cylindrical overlap
- **WHEN** `cylindrical-overlap` is selected but diameter, manual arc, complementary arc, or common axial width is incomplete or invalid
- **THEN** the geometric area curve, rotary angle-area, and rotary time-area are unavailable while desired timing remains available independently

#### Scenario: Area-source comparison
- **WHEN** both area sources can be evaluated for the same desired timing
- **THEN** the system identifies their different assumptions and does not silently replace the entered constant area with a value inferred from physical arc lengths

### Requirement: Geometric rotary inlet overlap-area profile
For `cylindrical-overlap`, the system SHALL model one continuous moving crank cut-away interval `Ic(theta)` and one continuous fixed crankcase-window interval `Ik` on the same unwrapped sealing-track circumference. The desired opening and closing edges SHALL locate the first and final positive overlap. For measured common axial overlap width `Wa`, it SHALL calculate `overlapLength(theta) = measure(Ic(theta) intersect Ik)` using circular interval operations and `Ageom(theta) = Wa * overlapLength(theta)`. It SHALL numerically integrate `Ageom(theta)` across the desired event for rotary angle-area and derive specific time-area from that result.

This result SHALL be named geometric rotary overlap area. If the user describes it as true effective area, the interface SHALL clarify that it is the effective geometric sealing-surface overlap in this idealised model, not discharge-corrected effective flow area. The model SHALL exclude axial offset beyond the measured common width, non-rectangular or disconnected boundaries, edge radius, leakage, duct restriction, discharge coefficient, pressure ratio, gas state, and wave action.

#### Scenario: Geometric overlap opens and closes
- **WHEN** valid sharp-edged component arcs and desired timing define a cylindrical-overlap event
- **THEN** the area curve is zero at first contact, positive within the event, returns to zero at final contact, and never exceeds `Wa * min(Lc, Lk)` within the documented numeric tolerance

#### Scenario: Manual-authority switch preserves geometric area
- **WHEN** a valid switch between crank-cut-away and crankcase-opening authority preserves full-precision `Lc`, `Lk`, desired timing, diameter, and `Wa`
- **THEN** the complete area-versus-angle curve, rotary angle-area, and rotary specific time-area remain unchanged

#### Scenario: Change one physical arc through desired timing
- **WHEN** desired opening or closing changes while diameter and the selected manual arc remain fixed and the complementary solve stays valid
- **THEN** the complementary arc and geometric overlap-area curve are recalculated rather than scaling one constant area by duration

#### Scenario: Common axial width is absent
- **WHEN** component arc geometry is valid but `Wa` is missing
- **THEN** circumferential overlap length may be shown in millimetres but area, angle-area, and time-area are unavailable and no width is inferred

#### Scenario: Geometric overlap is not effective flow area
- **WHEN** geometric rotary overlap area is displayed or exported
- **THEN** its square-millimetre values carry the geometric model name and the excluded flow and sealing effects, without a flow coefficient, mass-flow result, or performance claim

### Requirement: Exhaust blowdown time-area
The system SHALL calculate exhaust blowdown angle-area by integrating the exhaust open-area profile from exhaust opening to the earliest valid transfer opening. It SHALL convert that result to specific blowdown time-area when positive RPM and displacement are available.

#### Scenario: Conventional exhaust-first order
- **WHEN** exhaust area data is valid and exhaust opens before the earliest transfer
- **THEN** the system reports the integration bounds, blowdown angle-area, and applicable specific time-area

#### Scenario: No positive blowdown interval
- **WHEN** the earliest transfer opens at or before exhaust opening
- **THEN** the system reports no positive blowdown time-area and retains the deterministic event-order warning

#### Scenario: Missing transfer or exhaust area data
- **WHEN** the timing bound or exhaust rectangular profile is unavailable
- **THEN** blowdown time-area is unavailable without affecting valid angular blowdown results

### Requirement: Uncertainty-aware metric ranges
The system SHALL propagate explicitly stated measurement bounds through event boundaries, signed inlet-to-transfer margins, separate inlet closing, blowdown degrees and elapsed time, compression, squish, piston-port area, rotary diameter and component solving, common axial overlap width, area-versus-angle curves, angle-area, and specific time-area whenever the complete input domain remains physically valid. It SHALL calculate a conservative bounded enclosure, display nominal value plus lower and upper bounds, and SHALL NOT describe the interval as a probability, confidence interval, standard deviation, or inferred manufacturing tolerance. Where extrema are not proven to occur only at input endpoints, the implementation SHALL use a documented bounded interval method rather than assuming monotonicity.

#### Scenario: Port-roof uncertainty affects trapped ratio
- **WHEN** exhaust timing derives from a roof measurement with a valid uncertainty range
- **THEN** the system reports the resulting bounded trapped geometric compression-ratio range

#### Scenario: Squish readings form a measured range
- **WHEN** several squish-gap readings are supplied
- **THEN** their observed minimum and maximum remain distinct from instrument uncertainty attached to each reading

#### Scenario: Uncertainty crosses a physical limit
- **WHEN** an input uncertainty interval includes an impossible bore, volume, bowl diameter, port dimension, rotary diameter, component arc, complementary solve, or axial overlap width
- **THEN** the system identifies the invalid bound and does not silently clip the interval

#### Scenario: Uncertainty affects signed timing relationships
- **WHEN** stated input bounds produce an inlet-to-transfer margin or blowdown range that crosses zero
- **THEN** the system preserves the signed nominal result and complete range and marks the relation uncertain rather than selecting the nominal sign as definitive

#### Scenario: Rotary area uncertainty is propagated
- **WHEN** valid bounds are supplied for diameter, the manual component arc, and common axial overlap width
- **THEN** the system encloses the resulting complementary arc, area-versus-angle curve, angle-area, and RPM-dependent specific time-area without inventing correlation or statistical confidence

#### Scenario: Uncertainty crosses a profile band
- **WHEN** a valid result range spans a selected profile threshold
- **THEN** the profile comparison is indeterminate while the deterministic nominal value and bounds remain available

### Requirement: Configuration comparison
The system SHALL allow the current valid configuration to be compared with one optional valid baseline or candidate configuration. Each configuration SHALL be calculated independently, and the system SHALL report signed deltas only for compatible metrics together with uncertainty-range overlap where available.

#### Scenario: Compare spacing changes
- **WHEN** two configurations differ in head gasket or base spacing inputs
- **THEN** the system reports the resulting signed changes in the geometry, timing, squish, and compression values that each independent model supports

#### Scenario: Compare incompatible or incomplete metrics
- **WHEN** one configuration lacks the area inputs required for time-area
- **THEN** the time-area delta is marked unavailable while other compatible deltas remain visible

#### Scenario: No automatic winner
- **WHEN** any comparison delta is positive or negative
- **THEN** the system does not rank either configuration as universally better, safer, or more powerful

### Requirement: Geometry-change dependency disclosure
The system SHALL distinguish direct geometric dependencies from tuning interpretation when relating compression, squish, and exhaust timing. It SHALL not present a fixed ratio among them because the same mechanical change can affect different subsets of those outputs.

#### Scenario: Exhaust roof changes alone
- **WHEN** only exhaust roof position changes and chamber geometry is held fixed
- **THEN** exhaust timing and exhaust-closure trapped geometric compression change while geometric compression and squish geometry remain unchanged

#### Scenario: Head gasket or shim changes alone
- **WHEN** a comparison adds head gasket or shim thickness without moving the cylinder ports
- **THEN** clearance volume and squish gap increase and compression ratios decrease while port timings remain unchanged in the selected geometric model

#### Scenario: Base spacing changes cylinder position
- **WHEN** a comparison raises the cylinder with a base spacer and retains the same head and piston assembly
- **THEN** the project explicitly adds spacer thickness to the signed deck position and squish readings, adds `piston_area * spacer_thickness` to clearance volume, subtracts spacer thickness from every normalised port-roof travel, and reports the resulting timing and compression deltas rather than applying a hidden correction

#### Scenario: Head machining hypothesis
- **WHEN** a reduction in chamber or squish geometry is considered as a tuning action
- **THEN** the system calculates only the entered dimensional consequences and requires configuration-specific clearance, volume, ignition, fuel, temperature, and physical verification before any tuning conclusion

### Requirement: Three-level evidence-qualified diagnostics
Every diagnostic SHALL use one of three explicit levels: deterministic `calculated-geometry`, contextual `profile-heuristic`, or `measured-or-modelled` evidence. Calculated geometry SHALL report only deterministic relationships, validity, and unavailable states. A profile heuristic SHALL compare a valid result with the versioned, source-labelled bands of the explicitly selected touring box, sport box, road expansion, or race expansion profile and SHALL remain advisory. Measured or modelled evidence SHALL identify its subtype, source, applicable hardware and operating condition, calibration scope, and uncertainty. No level SHALL be promoted into another by wording or colour.

#### Scenario: Deterministic relationship
- **WHEN** the system explains that a later exhaust closure reduces trapped swept volume while other inputs remain fixed
- **THEN** the explanation is labelled `calculated-geometry`

#### Scenario: Profile-qualified comparison
- **WHEN** a valid blowdown, inlet closing, signed margin, or time-area result is compared with the selected profile
- **THEN** it is labelled `profile-heuristic` and includes profile identifier, reference-set version, source, applicability, numeric comparison, and uncertainty status without becoming a hard error

#### Scenario: Measured or calibrated-model evidence
- **WHEN** the application presents a road, degree-wheel, pressure, temperature, flow-bench, or dyno observation, or a calibrated model result
- **THEN** it is labelled `measured-or-modelled`, distinguishes measurement from model output, and names the provenance, configuration, operating condition, calibration scope, and uncertainty

#### Scenario: Profile selection changes interpretation only
- **WHEN** the user changes the selected exhaust-use profile
- **THEN** geometry, compression, squish, timing, area, and time-area results remain unchanged while only contextual comparisons and character annotations may change

#### Scenario: Unsupported ratio request
- **WHEN** the available data does not establish a universal ratio between rotary-inlet duration, transfer duration, squish, compression, and exhaust degrees
- **THEN** the system presents the measurable relationships and declines to create an unsourced good, bad, safe, unsafe, or optimum verdict

### Requirement: Qualitative Engine character estimate
The system SHALL provide an optional view titled Engine character estimate, built only from deterministic area-versus-angle series, specific time-area-versus-RPM series across a bounded user-selected RPM sweep, and the versioned bands of the explicitly selected diagnostic profile. It MAY annotate lower-speed, mid-range, upper-speed, or area-limited tendencies as `profile-heuristic` statements. It SHALL NOT calculate, plot, label, or imply torque, power, brake mean effective pressure, peak output, acceleration, vehicle speed, or a synthetic dyno curve. It SHALL NOT combine the geometric series into an undisclosed performance score.

#### Scenario: Character geometry with a selected profile
- **WHEN** valid port or rotary area geometry, displacement, an RPM sweep, and a diagnostic profile are available
- **THEN** the view plots the underlying area-versus-angle and specific time-area-versus-RPM series with their real units and places separate source-labelled qualitative profile annotations beside them

#### Scenario: No profile selected
- **WHEN** profile is `none` and valid geometric series are available
- **THEN** the graph shows only calculated geometry and explicit model boundaries without lower-speed, mid-range, upper-speed, or area-limited profile annotations

#### Scenario: Insufficient area data
- **WHEN** timing is valid but the area inputs required for an area or time-area series are absent
- **THEN** the missing series is marked unavailable and no synthetic curve is generated from timing degrees alone

#### Scenario: Character uncertainty bands
- **WHEN** stated input uncertainty produces valid bounded area or time-area series
- **THEN** the nominal series and bounded envelope are shown distinctly and any profile annotation whose threshold is crossed becomes indeterminate

#### Scenario: Compare character geometry
- **WHEN** current and comparison configurations both provide compatible character series
- **THEN** the system shows their real geometric series and signed deltas without ranking either configuration or calling one more powerful
