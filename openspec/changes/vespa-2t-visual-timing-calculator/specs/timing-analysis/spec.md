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

### Requirement: Rotary inlet desired timing and complementary arc solver
For rotary induction the system SHALL use desired opening advance `A` before TDC and desired closing delay `R` after TDC as the sole positioned timing authority. Timing-only mode SHALL calculate the positioned event without requiring physical arc sizing. Arc-sizing mode SHALL require an effective rotary-valve sealing-track diameter `D`, where `D` identifies the crank-web timing track rather than a crankshaft journal. The MVP SHALL project the crankcase opening onto the same `D` and SHALL expose that equal-diameter assumption wherever the physical inputs or results are presented.

For `T = A + R` and circumference `C = pi * D`, the system SHALL calculate total required opening arc `Ltotal = C * T / 360`. The user SHALL choose exactly one authoritative manual arc: open crank-web cut-away `Lc` or crankcase inlet opening `Lk`. If `Lc` is manual, the system SHALL derive read-only `Lk = Ltotal - Lc`; if `Lk` is manual, it SHALL derive read-only `Lc = Ltotal - Lk`. It SHALL retain full precision through all conversions, derive each component's angular contribution as `360 * Lcomponent / C`, and round only for presentation. The desired angles SHALL produce the same canonical rotary interval used by all overlap, margin, diagram, and time-area calculations.

The inputs SHALL be finite. `A` and `R` SHALL each be non-negative and `T` SHALL not exceed 360 degrees. In arc-sizing mode, `D` and the selected manual arc SHALL be greater than zero and `T` SHALL satisfy `0 < T <= 360`. For `C` in millimetres, equality tolerance SHALL be `toleranceMm = max(1, C) * 1e-12`. `Ltotal` and the selected manual arc SHALL not exceed `C + toleranceMm`. The derived complementary result SHALL satisfy `0 < Lderived <= C + toleranceMm`. A zero or negative complement or a result over one circumference SHALL be a blocking error. Unsupported geometry SHALL not be clamped, saturated, complemented, or silently reinterpreted.

#### Scenario: Timing-only rotary analysis
- **WHEN** the user enters valid desired opening and closing angles and selects timing-only mode
- **THEN** the positioned event, diagram, overlaps, margins, and timing time-area remain available without claiming or fabricating physical crank and crankcase arc lengths

#### Scenario: Crank cut-away is the manual authority
- **WHEN** `D` gives circumference 300 mm, desired timing totals 180 degrees, and the user selects and measures a 110 mm open crank cut-away
- **THEN** the system reports a 150 mm total arc, preserves 110 mm as manual, derives a read-only 40 mm crankcase opening, and reports component contributions of 132 and 48 degrees

#### Scenario: Crankcase opening is the manual authority
- **WHEN** the same 150 mm total arc is used and the user selects and measures a 40 mm crankcase opening
- **THEN** the system preserves 40 mm as manual, derives a read-only 110 mm crank cut-away, and produces the same positioned 180-degree inlet event

#### Scenario: Desired angles position the event
- **WHEN** the desired inlet opens 120 degrees BTDC and closes 65 degrees ATDC with a valid diameter and manual component solve
- **THEN** the system reports 185 degrees of duration and represents the interval from 240 degrees through TDC to 65 degrees without requiring a separate arc phase anchor

#### Scenario: Desired timing changes with one physical measurement fixed
- **WHEN** the user changes only opening advance or closing delay while diameter and the selected manual arc remain fixed
- **THEN** total arc and the read-only complementary component update at full precision while the selected physical measurement remains unchanged

#### Scenario: Switch manual authority with valid geometry
- **WHEN** the user switches from crank-cut-away authority to crankcase-opening authority while both current component lengths are valid
- **THEN** the current full-precision derived crankcase length becomes the new manual value and recomputation preserves both component lengths, total arc, and positioned timing without using a rounded display value

#### Scenario: Switch manual authority without a valid complement
- **WHEN** the user switches authority while the current complement is unavailable or invalid
- **THEN** the previous manual numeric token is not reinterpreted under the other physical label and the newly selected manual input remains incomplete until a valid measurement is supplied

#### Scenario: Manual component consumes the desired total
- **WHEN** subtracting the selected manual arc from `Ltotal` produces zero or a negative length
- **THEN** the system reports a blocking error on the incompatible manual measurement and does not publish or persist a fabricated complementary arc

#### Scenario: Derived component exceeds one circumference
- **WHEN** the complementary solve produces a result greater than `C + toleranceMm`
- **THEN** the system reports a blocking one-cycle-model error and does not clamp the result to the circumference

#### Scenario: Full-cycle desired timing
- **WHEN** `A + R` equals 360 degrees and both component arcs solve to positive values within one circumference
- **THEN** `Ltotal` is normalised to one circumference, the full-circle event remains valid, and a non-blocking warning states that the idealised model has no positive-duration closed interval

#### Scenario: Component and combined conversion remains visible
- **WHEN** desired angles, diameter, and one manual component produce valid geometry
- **THEN** the system presents `A`, `R`, `T`, `D`, `C`, `Ltotal`, both component lengths, both angular contributions, and which component is manual or derived

#### Scenario: Measurement convention is explicit
- **WHEN** rotary arc controls or results are presented
- **THEN** the system states that the selected manual source is a true circumferential arc measured along the matching sealing track between relevant timing edges, not a straight chord, tangential width, projected ruler measurement, or complementary remaining solid shoulder, and that the crankcase track is assumed to use the entered crank-web sealing-track diameter

#### Scenario: Physical measurements with or without uncertainty bounds
- **WHEN** the user enters sealing-track diameter and one manual arc with optional valid stated uncertainty
- **THEN** the system propagates only the supplied bounds and otherwise treats each value as a point measurement without inventing precision

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
The system SHALL identify the earliest and latest valid transfer openings, the spread between them, the global blowdown from exhaust opening to the first transfer opening, and the union of all transfer-open intervals. It SHALL present global blowdown as one connected result comprising crank degrees, elapsed milliseconds at the selected positive RPM, exhaust blowdown angle-area, and specific blowdown time-area whenever each dependent input is available. It SHALL retain available timing values when RPM or exhaust-area data is missing and SHALL NOT judge blowdown capacity from degrees alone.

#### Scenario: Staged primary and secondary transfers
- **WHEN** the primary transfer opens at 118 degrees and the secondary transfer opens at 122 degrees
- **THEN** the system reports a 4-degree transfer-opening spread and identifies the primary group as first to open

#### Scenario: Simultaneous transfer openings
- **WHEN** all valid transfer groups open at the same angle
- **THEN** the transfer-opening spread is 0 degrees and all those groups are identified as coincident first openings

#### Scenario: Complete global blowdown result
- **WHEN** exhaust timing, the earliest transfer opening, a positive RPM, displacement, and a valid exhaust-area profile are available
- **THEN** the system reports the first-opening transfer identity, blowdown degrees, elapsed milliseconds, exhaust angle-area, and specific time-area together with their units and integration boundary

#### Scenario: Blowdown area is unavailable
- **WHEN** exhaust and transfer timing are valid but exhaust-area data is absent
- **THEN** blowdown degrees and applicable elapsed milliseconds remain available while angle-area and specific time-area are explicitly unavailable

#### Scenario: Degrees do not establish capacity
- **WHEN** a positive or negative global blowdown angle is calculated
- **THEN** the deterministic order remains visible but no sufficient, insufficient, safe, unsafe, optimal, torque, or power conclusion is produced from that angle alone

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

#### Scenario: Profile comparison preserves the signed result
- **WHEN** a selected diagnostic profile compares an inlet-to-transfer margin with one of its versioned reference bands
- **THEN** the exact signed calculated margin remains primary and the comparison is separately labelled as a contextual profile heuristic

#### Scenario: Margin uncertainty crosses zero
- **WHEN** propagated measurement bounds permit both positive and negative inlet-to-transfer margin
- **THEN** the nominal value and full signed interval remain visible and the geometric relation is labelled uncertain rather than forced into an overlap or gap verdict

### Requirement: Separate rotary inlet-closing analysis
The system SHALL report rotary inlet closing delay `R` after TDC as a result independent from inlet opening advance `A`, total duration `A + R`, and inlet-opening versus transfer-closing margin. For positive RPM it SHALL also report the elapsed time from TDC to inlet closing. Profile comparisons MAY assess closing delay independently, but SHALL NOT infer blowback or optimum closing from that angle alone.

#### Scenario: Change only inlet opening advance
- **WHEN** the user changes `A` while `R` remains authoritative and unchanged
- **THEN** total duration and opening-related margins update while inlet closing angle and its TDC-to-closing elapsed time remain unchanged

#### Scenario: Change only inlet closing delay
- **WHEN** the user changes `R` while `A` remains authoritative and unchanged
- **THEN** inlet closing and total duration update while the inlet-opening versus transfer-closing margin remains unchanged

#### Scenario: Convert inlet closing delay to time
- **WHEN** inlet closing delay is 65 degrees ATDC and the selected speed is positive
- **THEN** the system reports both 65 degrees ATDC and the corresponding full-precision elapsed milliseconds after TDC

#### Scenario: Closing interpretation boundary
- **WHEN** inlet closing is compared with a profile band
- **THEN** the comparison states that actual reverse flow depends on crankcase pressure, inlet restriction, engine speed, load, gas dynamics, and rotary sealing, and remains a heuristic rather than a calculated blowback result

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

### Requirement: Three-level diagnostics and explicit profiles
Every diagnostic SHALL identify exactly one claim level: `calculated-geometry`, `profile-heuristic`, or `measured-or-modelled`. The optional diagnostic profile SHALL be explicitly selected as `none`, `touring-box`, `sport-box`, `road-expansion`, or `race-expansion`; it SHALL never be inferred from timing, exhaust dimensions, or other project values. Selecting a profile SHALL only choose a versioned, source-labelled set of contextual reference bands and SHALL NOT alter geometry, events, overlaps, margins, blowdown, areas, or time-area. A measured-or-modelled diagnostic SHALL identify whether its evidence is measured or modelled and SHALL include provenance, applicable configuration, calibration scope, and stated uncertainty.

#### Scenario: No diagnostic profile selected
- **WHEN** profile is `none`
- **THEN** calculated geometry and explicit unavailable states remain available while profile heuristics are omitted

#### Scenario: Change exhaust-use profile
- **WHEN** the user changes from touring box to race expansion without editing engine inputs
- **THEN** all calculated values remain bit-for-bit unchanged and only source-labelled profile comparisons and character annotations are recalculated

#### Scenario: Geometry creates a blocking error
- **WHEN** an authoritative input is physically invalid for a requested calculation
- **THEN** a `calculated-geometry` diagnostic may block that dependent result and identifies the responsible field

#### Scenario: Profile value lies outside a contextual band
- **WHEN** valid geometry falls outside a selected profile's documented comparison band
- **THEN** the system emits an advisory `profile-heuristic` result with profile, reference-set version, source, applicability, and numeric signed distance to the band, without labelling the configuration universally good, bad, safe, unsafe, or optimal

#### Scenario: Uncertainty crosses a profile boundary
- **WHEN** a propagated result interval spans both sides of a profile threshold
- **THEN** the profile diagnostic is `indeterminate` and retains the nominal value and interval rather than classifying the result from its midpoint

#### Scenario: Measured or modelled evidence lacks provenance
- **WHEN** a proposed measured or calibrated-model diagnostic lacks evidence subtype, source, applicable configuration, calibration scope, or uncertainty
- **THEN** the system does not publish it at the `measured-or-modelled` level or silently downgrade it into a calculated fact

### Requirement: Geometric interpretation boundaries
The system SHALL label overlap and simultaneous-opening results as geometric. It SHALL not infer airflow direction, short-circuit mass, blowback, power, torque, safe machining limits, or an optimum engine-speed range from timing angles alone. No timing diagnostic or profile comparison SHALL produce a predicted torque curve, power curve, peak output, or synthetic dyno result.

#### Scenario: Positive overlap result
- **WHEN** any positive overlap is displayed
- **THEN** the result states that actual flow also depends on open area, port and duct geometry, pressure, engine speed, load, crankcase behaviour, and exhaust-wave action

#### Scenario: User enters a high timing value
- **WHEN** a timing value is geometrically valid but outside a sourced example range
- **THEN** the system does not label it universally good, bad, safe, or unsafe solely from that angle
