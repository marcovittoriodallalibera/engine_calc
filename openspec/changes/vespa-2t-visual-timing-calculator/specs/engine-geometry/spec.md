## Purpose

Defines the authoritative engine measurements and exact piston-motion conversions used to relate linear port positions to crankshaft timing without hiding geometric assumptions or measurement uncertainty.

## ADDED Requirements

### Requirement: Engine geometry validation
The system SHALL accept a positive stroke and a connecting-rod length measured centre-to-centre, and SHALL require the connecting-rod length to be greater than half the stroke whenever a linear-to-angular conversion is requested.

#### Scenario: Valid centred geometry
- **WHEN** the user enters a stroke of 51 mm and a connecting-rod length of 97 mm
- **THEN** the system accepts the geometry for exact centred slider-crank calculations

#### Scenario: Impossible connecting-rod geometry
- **WHEN** the connecting-rod length is less than or equal to half the entered stroke
- **THEN** the system marks the geometry invalid and does not publish dependent timing results

#### Scenario: Geometry not needed for direct measured angles
- **WHEN** a timing event is sourced from independently measured opening and closing angles and no linear conversion is requested
- **THEN** the event remains usable without forcing the user to enter stroke or connecting-rod length

### Requirement: Explicit measurement references
The system SHALL support piston travel from TDC, port-roof height above BDC, and port-roof depth from the cylinder deck as distinct measurement references. Deck-referenced input SHALL also require the signed position of the piston crown edge relative to the deck at TDC.

#### Scenario: Direct travel from TDC
- **WHEN** the user enters piston travel `x` from TDC
- **THEN** the calculation uses `x` directly as the travel required to uncover the port roof

#### Scenario: Height above BDC
- **WHEN** the user enters a port-roof height `h` above BDC for a stroke `C`
- **THEN** the system normalises the measurement to travel from TDC as `x = C - h`

#### Scenario: Piston below the cylinder deck
- **WHEN** the roof is 30.5 mm below the deck and the piston crown edge is 0.5 mm below the deck at TDC
- **THEN** the system normalises the measurement to 30.0 mm of piston travel from TDC

#### Scenario: Piston protrudes above the cylinder deck
- **WHEN** the roof is 30.0 mm below the deck and the signed piston position is -0.5 mm because the crown edge protrudes above the deck
- **THEN** the system normalises the measurement to 30.5 mm of piston travel from TDC

### Requirement: Exact centred slider-crank conversion
For centred geometry, the system SHALL calculate piston travel from TDC using `x(theta) = r(1 - cos(theta)) + L - sqrt(L^2 - r^2 sin^2(theta))`, where `r` is half the stroke and `L` is connecting-rod length. It SHALL use the exact inverse geometry for linear-to-angular conversion rather than a sinusoidal or infinite-rod approximation.

#### Scenario: Convert travel to a symmetric port event
- **WHEN** valid geometry and a port-roof travel between TDC and BDC are provided
- **THEN** the system returns one opening angle on the descending stroke, one closing angle on the ascending stroke, and a duration equal to the circular interval between them

#### Scenario: Manufacturer reference value
- **WHEN** stroke is 51 mm, connecting-rod length is 97 mm, and crank angle is 33 degrees from TDC
- **THEN** the calculated piston travel rounds to 5.1 mm at one decimal place

#### Scenario: TDC boundary
- **WHEN** the effective port-roof travel is exactly 0 mm
- **THEN** the system returns an opening angle of 0 degrees, a closing angle of 360 degrees, and a geometric duration of 360 degrees

#### Scenario: BDC boundary
- **WHEN** the effective port-roof travel equals the stroke
- **THEN** the system returns a coincident event at 180 degrees and a geometric duration of 0 degrees

### Requirement: Angular-to-linear inverse conversion
The system SHALL convert a valid centred piston-controlled opening angle or symmetric duration back to its corresponding piston travel and supported measurement references.

#### Scenario: Opening angle becomes the authoritative value
- **WHEN** the user chooses an opening angle between 0 and 180 degrees as the source for a centred piston-controlled port
- **THEN** the system derives the matching piston travel, closing angle, duration, BBDC opening notation, and ABDC closing notation

#### Scenario: Duration becomes the authoritative value
- **WHEN** the user chooses a duration between 0 and 360 degrees as the source for a centred piston-controlled port
- **THEN** the system derives `opening = (360 - duration) / 2` before converting that angle to the equivalent linear measurements

### Requirement: One authoritative source per measurement
Each calculated geometry item SHALL have exactly one authoritative source mode at a time. Editing a derived millimetre or degree value SHALL explicitly change the source mode and recalculate the other representations without feeding rounded display values back into the calculation.

#### Scenario: Edit a derived duration
- **WHEN** a port is sourced from millimetres and the user elects to edit its derived duration
- **THEN** duration becomes the authoritative source and all supported millimetre values are recalculated from the unrounded angular value

#### Scenario: Change engine geometry
- **WHEN** a port remains sourced from a linear measurement and the user changes stroke or connecting-rod length
- **THEN** the linear source remains unchanged and its angular results are recalculated

#### Scenario: Change engine geometry for an angle-sourced port
- **WHEN** a port remains sourced from duration or opening angle and the user changes stroke or connecting-rod length
- **THEN** the angular source remains unchanged and its derived linear measurements are recalculated

### Requirement: Physical range and numeric error handling
The system SHALL reject non-finite geometry values and effective travel outside the inclusive range from 0 to the stroke. It SHALL distinguish invalid user data from tiny floating-point excursions caused by evaluating inverse trigonometric functions near a valid boundary.

#### Scenario: Port roof below reachable piston travel
- **WHEN** the normalised travel is greater than the stroke
- **THEN** the system reports that the piston never reaches the requested opening position and withholds dependent timing values

#### Scenario: Port already uncovered at TDC
- **WHEN** the normalised travel is less than 0 mm
- **THEN** the system reports that the port is geometrically uncovered at TDC and withholds a conventional symmetric duration

#### Scenario: Numeric noise at an inverse boundary
- **WHEN** a valid boundary calculation produces an inverse-cosine argument outside `[-1, 1]` only within the documented numeric tolerance
- **THEN** the system clamps the argument to the boundary and returns the valid endpoint without displaying a user-data error

### Requirement: Measured asymmetric events
The system SHALL allow expert users to enter independently measured opening and closing angles. It SHALL preserve those angles rather than forcing symmetry, and SHALL not fabricate one linear port height when the two measurements imply different piston positions.

#### Scenario: Symmetric measured event
- **WHEN** independently measured opening and closing angles are symmetric around BDC within the measurement tolerance
- **THEN** the system may derive one representative linear port position and labels it as derived from measured angles

#### Scenario: Asymmetric measured event
- **WHEN** independently measured opening and closing angles are not symmetric around BDC
- **THEN** the system preserves both angles, reports the asymmetry, and marks a single port-height conversion as unavailable

### Requirement: Measurement uncertainty propagation
The system SHALL accept an optional non-negative linear measurement uncertainty and calculate the corresponding minimum and maximum angular results from the full-precision geometry.

#### Scenario: Valid uncertainty band
- **WHEN** a 30.0 mm roof position has an uncertainty of plus or minus 0.1 mm and the complete range is physically reachable
- **THEN** the system returns a timing range calculated from 29.9 mm and 30.1 mm rather than treating 30.0 mm as exact

#### Scenario: Uncertainty crosses a physical boundary
- **WHEN** the uncertainty range extends outside 0 mm to the entered stroke
- **THEN** the system reports the invalid part of the range and does not silently clip it

### Requirement: Geometry model disclosure
The system SHALL identify calculated piston timing as a centred, rigid slider-crank result and SHALL state that crown shape, chamfers, piston rocking, clearances, and lateral cranktrain offset are not included in the standard model.

#### Scenario: User reviews a calculated result
- **WHEN** a result was derived from the standard geometry model
- **THEN** the result view makes the centred-model assumption and excluded physical effects available without presenting the value as a direct engine measurement
