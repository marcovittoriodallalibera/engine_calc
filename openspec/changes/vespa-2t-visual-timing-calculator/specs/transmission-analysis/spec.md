## Purpose

Defines the manually configurable Vespa transmission calculation, wheel-circumference measurement contract, theoretical road-speed outputs, gear-shift relationships, and the speed-versus-RPM presentation boundary.

## ADDED Requirements

### Requirement: Optional authoritative transmission configuration
The system SHALL provide an optional transmission study containing one primary drive, exactly four or five ordered gears, one wheel rolling circumference, and one graph maximum engine speed. The user SHALL manually enter the primary driving-pinion and driven-gear tooth counts and the cluster-pinion and driven gear-wheel tooth counts for every active gear. Enabled tooth counts SHALL be positive whole numbers. Transmission inputs SHALL remain independent of engine geometry, port timing, induction, compression, squish, and cylinder lift.

#### Scenario: Configure a four-speed transmission
- **WHEN** the user enables transmission analysis and supplies valid primary teeth, four valid gear pairs, wheel rolling circumference, and maximum RPM
- **THEN** the system calculates the four ordered gear results without changing any engine timing or performance-metric input

#### Scenario: Configure a five-speed transmission
- **WHEN** the user changes the gearbox to five gears and supplies a valid fifth gear pair
- **THEN** the system calculates and presents five ordered gear results and retains stable identities for the existing four gears

#### Scenario: Leave transmission analysis disabled
- **WHEN** transmission analysis is disabled
- **THEN** incomplete or blank transmission fields do not block independent engine calculations, persistence, sharing, export, or print

#### Scenario: Enter a fractional tooth count
- **WHEN** an enabled primary or gear tooth field contains a positive non-integer value
- **THEN** the affected transmission calculation is rejected with a field-specific whole-tooth validation state rather than rounding or truncating the value

### Requirement: Authoritative wheel rolling circumference
The road-speed calculation SHALL use one positive manually entered wheel rolling circumference in millimetres. The interface SHALL identify a directly measured loaded rolling circumference as the authoritative datum and explain how to measure one complete wheel revolution. The system SHALL NOT infer or populate circumference from another wheel or tyre field.

#### Scenario: Enter a measured circumference
- **WHEN** the user enters a valid measured wheel rolling circumference
- **THEN** every road-speed and engine-RPM conversion uses that full-precision value

#### Scenario: Circumference is missing or invalid
- **WHEN** transmission analysis is enabled but wheel rolling circumference is blank, zero, negative, non-finite, or outside the documented bounded project range
- **THEN** road-speed results are unavailable with an actionable validation state and the system does not substitute a nominal tyre diameter

### Requirement: Deterministic reduction and theoretical road-speed calculation
For primary driving teeth `Pdrive`, primary driven teeth `Pdriven`, gear cluster-pinion teeth `Gdrive`, gear-wheel teeth `Gdriven`, engine speed `N` in RPM, and wheel rolling circumference `C` in millimetres, the system SHALL calculate at full precision:

```text
primary reduction = Pdriven / Pdrive
gear reduction = Gdriven / Gdrive
overall reduction = primary reduction * gear reduction
wheel RPM = N / overall reduction
road speed km/h = N * C * 60 / (overall reduction * 1,000,000)
engine RPM = road speed km/h * overall reduction * 1,000,000 / (C * 60)
```

It SHALL report primary reduction, each gear reduction, each overall reduction, theoretical speed per 1,000 RPM, and theoretical speed at the selected maximum RPM. For every adjacent upshift it SHALL also report the engine RPM immediately after shifting at unchanged road speed and the corresponding percentage RPM drop.

#### Scenario: Calculate all gear reductions
- **WHEN** a complete enabled transmission configuration is valid
- **THEN** the system reports the primary reduction and the gear and overall reductions for every configured gear from the authoritative tooth counts

#### Scenario: Calculate speed at selected maximum RPM
- **WHEN** the user changes maximum RPM while tooth counts and circumference remain valid
- **THEN** theoretical speed at maximum RPM and all graph endpoints update while the reductions and speed per 1,000 RPM remain unchanged

#### Scenario: Calculate an adjacent upshift
- **WHEN** two adjacent gears are valid and the engine is at the selected maximum RPM in the lower gear
- **THEN** the system reports the RPM after the upshift at unchanged road speed and the percentage RPM drop without modelling shift time or clutch slip

#### Scenario: Gear progression is not taller
- **WHEN** an entered later gear has an overall reduction equal to or greater than the preceding gear
- **THEN** the valid numeric result remains visible with a non-blocking warning to verify the tooth pairing

### Requirement: Speed-horizontal and RPM-vertical transmission graph
The system SHALL render a real-time graph with theoretical road speed in kilometres per hour on the horizontal axis and engine RPM on the vertical axis. It SHALL draw one distinctly labelled series for each configured gear from zero to the selected maximum RPM using the same full-precision reductions and circumference as the numeric results. The graph SHALL provide a legend and SHALL distinguish gear series without relying on colour alone.

#### Scenario: Render a valid four-speed graph
- **WHEN** a valid four-speed transmission result is available
- **THEN** the graph shows four labelled lines with road speed on X and engine RPM on Y and scales the speed domain to include the fastest configured gear at maximum RPM

#### Scenario: Add the fifth gear
- **WHEN** the user changes a valid configuration from four to five gears
- **THEN** the fifth labelled line and its graph endpoint appear in the same interaction cycle

#### Scenario: Edit wheel circumference
- **WHEN** the user changes the valid wheel rolling circumference
- **THEN** every gear line and speed endpoint updates in the same interaction cycle while the RPM axis and reduction ratios remain unchanged

#### Scenario: Graph cannot be perceived
- **WHEN** a user relies on the semantic result table instead of the graph
- **THEN** the same primary and gear tooth counts, reductions, speed per 1,000 RPM, maximum-RPM speed, adjacent-shift RPM, RPM drop, axis units, and model boundary are available without colour or pointer interaction

### Requirement: Theoretical road-speed boundary
Every transmission result SHALL be identified as a geometric gearing calculation. It SHALL state that theoretical road speed does not include loaded tyre deformation beyond the entered circumference, tyre growth, wheel slip, clutch slip, drivetrain compliance or loss, aerodynamic drag, gradient, vehicle mass, engine load, available torque or power, or the ability to reach the selected RPM in a given gear. The result SHALL NOT be labelled as a reachable top speed, acceleration prediction, or road-performance simulation.

#### Scenario: Review maximum-speed output
- **WHEN** the fastest-gear speed at maximum RPM is shown
- **THEN** it is labelled theoretical road speed at the selected RPM and is not presented as an achievable vehicle top speed

#### Scenario: Print or export transmission results
- **WHEN** a human-readable report includes transmission calculations
- **THEN** the authoritative tooth counts and wheel circumference, calculated ratios, graph or equivalent values, and theoretical-road-speed boundary are included together

### Requirement: Printable transmission graph and table
The print report SHALL include the configured primary and gear tooth pairs, wheel rolling circumference, selected maximum RPM, reduction and road-speed table, and the speed-horizontal, RPM-vertical graph. Printed series SHALL remain distinguishable without colour, and interactive edit affordances SHALL be omitted.

#### Scenario: Print a valid transmission study
- **WHEN** the user prints a valid project with transmission analysis enabled
- **THEN** the report contains the transmission inputs, graph, equivalent numeric table, units, and model boundary with controlled page breaks

#### Scenario: Print with transmission disabled
- **WHEN** the user prints a project whose transmission analysis is disabled
- **THEN** the report does not fabricate or populate any transmission hardware or road-speed result
