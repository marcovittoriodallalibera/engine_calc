## Purpose

Defines configurable two-stroke timing events and the circular analyses needed to explain exhaust, transfer, and Vespa rotary-inlet relationships without presenting geometry as a prediction of gas flow or engine performance.

## ADDED Requirements

### Requirement: Configurable port groups
The system SHALL support an exhaust event and an independently editable collection of transfer-port groups. Transfer groups SHALL provide suggested categories for primary, secondary, front/boost, auxiliary, and custom ports while retaining a user-defined label and independent timing source.

#### Scenario: Cylinder with staged transfer groups
- **WHEN** the user adds primary, secondary, and front/boost transfer groups with different roof positions
- **THEN** the system preserves and analyses each group as a separate timing event

#### Scenario: Custom transfer terminology
- **WHEN** the user adds a custom transfer group and supplies a label
- **THEN** the label appears in calculations and outputs without assigning undocumented flow behaviour to that group

#### Scenario: Incomplete group
- **WHEN** one transfer group is missing data while other events are valid
- **THEN** the incomplete group is marked unavailable without preventing calculations for the valid events

### Requirement: Piston-controlled event representation
Every valid piston-controlled event SHALL be represented as an opening angle, closing angle, clockwise circular sweep, duration, and source provenance. Symmetric events derived from centred geometry SHALL open on the descending stroke and close at the mirrored angle on the ascending stroke.

#### Scenario: Derived transfer interval
- **WHEN** a transfer opens at 120 degrees ATDC from centred geometry
- **THEN** its interval starts at 120 degrees, ends at 240 degrees, and has a 120-degree sweep

#### Scenario: Measured event provenance
- **WHEN** an event was entered from degree-wheel opening and closing readings
- **THEN** the result identifies both values as measured rather than geometry-derived

### Requirement: Induction mode semantics
The system SHALL support no induction analysis, rotary-valve induction, and reed induction. A rotary-valve event SHALL use opening advance before TDC and closing delay after TDC. A reed event SHALL not be assigned a fixed geometric timing interval.

#### Scenario: Rotary-valve interval crosses TDC
- **WHEN** the rotary inlet opens `A` degrees before TDC and closes `R` degrees after TDC
- **THEN** the system represents it as a circular interval starting at `360 - A` degrees with a sweep of `A + R` degrees

#### Scenario: Reed induction selected
- **WHEN** the user selects reed induction
- **THEN** fixed inlet timing, rotary overlap, and rotary gap metrics are marked not applicable because reed movement is pressure-controlled

#### Scenario: No induction analysis selected
- **WHEN** the user selects no induction analysis
- **THEN** cylinder-port calculations remain available and inlet-specific results are omitted

### Requirement: Rotary inlet from crank and crankcase arcs
The system SHALL optionally derive rotary-inlet duration from a crank-web cut-away arc and a crankcase inlet-opening arc measured on one effective diameter. It SHALL convert each arc using `angle = 360 * arc length / (pi * diameter)`, add the two angular widths, and require one measured opening-before-TDC or closing-after-TDC edge to position the duration. The derived event SHALL use the same canonical rotary interval as direct timing angles.

#### Scenario: Opening edge anchors combined geometry
- **WHEN** the crank cut-away contributes 150 degrees, the crankcase opening contributes 35 degrees, and the measured inlet opening is 120 degrees BTDC
- **THEN** the system reports 185 degrees of duration, derives closing at 65 degrees ATDC, and represents the interval from 240 degrees through TDC to 65 degrees

#### Scenario: Closing edge anchors combined geometry
- **WHEN** the same 185-degree geometry is anchored by a measured closing at 65 degrees ATDC
- **THEN** the system derives opening at 120 degrees BTDC and produces the same canonical interval

#### Scenario: Arc geometry lacks an anchor
- **WHEN** both arc lengths and diameter are valid but no measured edge positions them relative to TDC
- **THEN** the component angles and duration may be described as incomplete geometry, while positioned timing, diagram overlap and margin results remain unavailable

#### Scenario: Measurement convention is explicit
- **WHEN** rotary arc controls or results are presented
- **THEN** the system states that lengths are measured along the curved sealing track rather than as straight chords and that the crankcase track is assumed to use the entered crankshaft diameter

#### Scenario: Impossible combined geometry
- **WHEN** either arc exceeds one circumference, the two arcs combine beyond one cycle, or the anchor exceeds their duration
- **THEN** the system reports a deterministic invalid-geometry result without inventing an opening or closing edge

### Requirement: Circular interval operations
The system SHALL calculate intersections, unions, gaps, and sweeps correctly for intervals that remain within the cycle and for intervals that cross the 0/360-degree boundary.

#### Scenario: Wrapped rotary event intersects a transfer event
- **WHEN** a rotary interval starts before 360 degrees, crosses TDC, and intersects a transfer interval before TDC
- **THEN** the system reports the exact intersecting sweep without losing the wrapped segment

#### Scenario: Union of overlapping transfer groups
- **WHEN** multiple transfer intervals overlap one another
- **THEN** their union duration is calculated without counting the same crank angle more than once

#### Scenario: Touching intervals
- **WHEN** two events meet at exactly one angular boundary but share no positive sweep
- **THEN** the simultaneous-open duration is 0 degrees and the boundary is reported as coincident

### Requirement: Exhaust-to-transfer analysis
For every valid exhaust and transfer pair, the system SHALL report opening separation, closing separation, duration difference, and geometric simultaneous-open duration. For symmetric events it SHALL additionally report one-sided blowdown as both `transfer opening - exhaust opening` and `(exhaust duration - transfer duration) / 2`.

#### Scenario: Conventional symmetric timing
- **WHEN** exhaust duration is 180 degrees and transfer duration is 120 degrees
- **THEN** the system reports a 60-degree duration difference, 30 degrees of one-sided blowdown, and 120 degrees of simultaneous opening

#### Scenario: Transfer opens before exhaust
- **WHEN** a transfer opening angle is earlier than the exhaust opening angle
- **THEN** the system preserves the signed opening separation, reports negative blowdown where applicable, and raises a deterministic ordering warning

#### Scenario: Asymmetric measured events
- **WHEN** either event is sourced from asymmetric opening and closing measurements
- **THEN** the system reports opening and closing separations independently and does not derive blowdown by halving the duration difference

#### Scenario: Missing exhaust event
- **WHEN** transfer events are valid but no exhaust event is available
- **THEN** transfer durations remain available while exhaust comparison and blowdown metrics are marked unavailable

### Requirement: Global transfer staging analysis
The system SHALL identify the earliest and latest valid transfer openings, the spread between them, the global blowdown from exhaust opening to the first transfer opening, and the union of all transfer-open intervals.

#### Scenario: Staged primary and secondary transfers
- **WHEN** the primary transfer opens at 118 degrees and the secondary transfer opens at 122 degrees
- **THEN** the system reports a 4-degree transfer-opening spread and identifies the primary group as first to open

#### Scenario: Simultaneous transfer openings
- **WHEN** all valid transfer groups open at the same angle
- **THEN** the transfer-opening spread is 0 degrees and all those groups are identified as coincident first openings

### Requirement: Rotary-inlet overlap and gap analysis
For a valid rotary inlet and each valid transfer group, the system SHALL report their geometric intersection, their nearest closed gap when no intersection exists, and the intersection between the rotary inlet and the union of all transfers without double counting.

#### Scenario: Rotary inlet opens before transfer closes
- **WHEN** the rotary inlet begins while a transfer remains open on the ascending stroke
- **THEN** the system reports the shared angular interval as rotary-to-transfer overlap

#### Scenario: Rotary inlet opens after all transfers close
- **WHEN** the rotary inlet starts after the union of transfer events has ended and no wrapped intersection exists
- **THEN** the system reports zero overlap and the positive angular gap to the nearest transfer boundary

#### Scenario: Multiple transfer overlaps at the same angle
- **WHEN** the rotary inlet intersects two transfer groups over the same crank angles
- **THEN** per-group overlap is reported for each group while total rotary-to-transfer overlap counts the shared crank angles once

### Requirement: Triple-overlap analysis
The system SHALL calculate the circular intersection of rotary inlet, exhaust, and each transfer group, and SHALL also report the union of all such triple-overlap intervals without double counting.

#### Scenario: Intake begins during scavenging
- **WHEN** rotary inlet, exhaust, and a transfer group are all open over a positive angular sweep
- **THEN** the system reports that sweep as geometric triple overlap and identifies the participating events

#### Scenario: Rotary and transfer overlap outside exhaust timing
- **WHEN** rotary inlet and a transfer intersect but the exhaust does not intersect that same angular segment
- **THEN** the segment contributes to rotary-to-transfer overlap but not to triple overlap

### Requirement: Signed rotary-inlet to transfer-closing margin
For each valid rotary-inlet and transfer event, the system SHALL report a signed phase margin between rotary-inlet opening advance before TDC and transfer closing before TDC. Positive values SHALL denote geometric overlap, zero SHALL denote coincident boundaries, and negative values SHALL denote a closed gap. The system SHALL also report the equivalent margin against the union of valid transfers without converting it into a universal duration ratio.

#### Scenario: Positive signed margin
- **WHEN** rotary inlet opens 130 degrees before TDC and a symmetric transfer closes 120 degrees before TDC
- **THEN** the system reports a signed margin of positive 10 degrees and identifies it as geometric inlet-to-transfer overlap

#### Scenario: Negative signed margin
- **WHEN** rotary inlet opens 110 degrees before TDC and the transfer closes 120 degrees before TDC
- **THEN** the system reports a signed margin of negative 10 degrees and identifies a 10-degree closed gap

#### Scenario: Measured asymmetric transfer
- **WHEN** the transfer has an independently measured closing event
- **THEN** the system derives the before-TDC closing reference from that measured boundary rather than assuming symmetric duration

#### Scenario: No universal intake-to-transfer ratio
- **WHEN** rotary and transfer durations are both available
- **THEN** any displayed duration ratio is labelled descriptive and is not used to emit an optimum, safe, or performance recommendation

### Requirement: Event duration at engine speed
The system SHALL accept an optional positive engine speed and convert any angular sweep to elapsed time using `time_ms = 166.6666667 * sweep_degrees / RPM`.

#### Scenario: Convert blowdown to milliseconds
- **WHEN** blowdown is 30 degrees and engine speed is 6,000 RPM
- **THEN** the system reports approximately 0.8333 milliseconds using the full-precision angle

#### Scenario: Missing engine speed
- **WHEN** no RPM is entered
- **THEN** all angular metrics remain available and time metrics are marked not requested

#### Scenario: Invalid engine speed
- **WHEN** RPM is zero, negative, or non-finite
- **THEN** the system reports the speed as invalid and does not calculate elapsed time

### Requirement: Deterministic domain warnings
The system SHALL raise warnings from explicit geometric conditions, including invalid event order, non-positive blowdown, measured asymmetry, uncertainty crossing an ordering boundary, and a piston-controlled exhaust interval that does not contain a transfer interval.

#### Scenario: Warning condition clears
- **WHEN** the user changes the source data so a previously invalid event order becomes valid
- **THEN** the corresponding warning clears immediately without altering the source data

#### Scenario: Uncertainty changes ordering confidence
- **WHEN** the uncertainty bands allow both positive and negative exhaust-to-transfer separation
- **THEN** the system reports the ordering as uncertain rather than selecting one result from the nominal values

### Requirement: Geometric interpretation boundaries
The system SHALL label overlap and simultaneous-opening results as geometric. It SHALL not infer airflow direction, short-circuit mass, blowback, power, torque, safe machining limits, or an optimum engine-speed range from timing angles alone.

#### Scenario: Positive overlap result
- **WHEN** any positive overlap is displayed
- **THEN** the result states that actual flow also depends on open area, port and duct geometry, pressure, engine speed, load, crankcase behaviour, and exhaust-wave action

#### Scenario: User enters a high timing value
- **WHEN** a timing value is geometrically valid but outside a sourced example range
- **THEN** the system does not label it universally good, bad, safe, or unsafe solely from that angle
