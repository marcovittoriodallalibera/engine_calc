# Calculation methodology

## Conventions

The crank cycle is expressed from 0 to 360 degrees:

- 0 degrees: top dead centre, TDC
- 180 degrees: bottom dead centre, BDC
- 360 degrees: the following TDC
- angles increase in the direction of the displayed cycle

Piston-controlled ports are treated as symmetric around BDC unless a future measured-event mode explicitly supplies separate opening and closing observations. Rotary inlet advance is entered in degrees before TDC and delay in degrees after TDC.

## Slider-crank geometry

For stroke `S`, crank radius `r = S / 2`, centre-to-centre rod length `L` and crank angle `theta`, piston travel from TDC is:

```text
x(theta) = r(1 - cos(theta)) + L - sqrt(L^2 - r^2 sin^2(theta))
```

For an observed travel `x`, the descending opening angle is solved through:

```text
q = L + r - x
cos(theta) = (q^2 + r^2 - L^2) / (2 r q)
```

The symmetric closing angle is `360 - theta` and duration is `360 - 2 theta`.

The golden check uses the [Polini PP18 instruction table](https://catalogue.polini.com/dep/PI702.pdf): 51 mm stroke, 97 mm rod length and 33 degrees correspond to approximately 5.1 mm piston movement from TDC.

## Port measurements

An event may be authoritative as:

- roof travel below the piston crown at TDC
- roof height above the piston crown at BDC
- opening angle after TDC
- symmetric duration

When measuring roof depth from the cylinder deck, signed assembled piston position matters:

```text
travel from TDC = roof depth from deck - crown below deck at TDC
```

The initial interface records the deck position as measurement context. Direct roof-travel inputs are already relative to the piston crown and must not be adjusted twice.

## Timing relationships

One-sided blowdown is the difference between transfer and exhaust opening angles:

```text
blowdown = transfer opening - exhaust opening
```

For symmetric durations this also equals half the duration difference.

For a transfer duration `Dt`, its closing boundary before the following TDC is:

```text
transfer closes BTDC = (360 - Dt) / 2
```

The signed rotary inlet-to-transfer margin is:

```text
margin = inlet advance BTDC - transfer closes BTDC
```

A positive result is geometric overlap, a negative result is a closed gap and zero is a coincident boundary. This phase relationship is reported instead of a universal ratio between inlet and transfer durations.

Elapsed time at engine speed `n` is:

```text
milliseconds = degrees * 1000 / (6 n)
```

## Rotary inlet arc geometry

The rotary inlet timing always starts from desired opening advance BTDC and closing delay ATDC. In direct-angle mode these two edges are sufficient. Arc-sizing mode additionally uses the effective sealing-track diameter and one authoritative circumferential measurement, selected as either the crank cut-away or the crankcase opening. For arc length `l` measured at effective diameter `D`:

```text
circumference = pi D
arc angle = 360 l / (pi D)
```

The crank-web cut-away and the crankcase inlet opening are idealised as two continuous angular windows on the same sealing-track diameter. If their circumferential arc lengths are `a` and `b`, the interval from first edge contact to final edge contact is:

```text
geometric inlet duration = 360 (a + b) / (pi D)
```

The desired edges set duration `Dt = advance BTDC + delay ATDC`. Arc-sizing calculates the total required circumferential length and solves the unmeasured component:

```text
required combined arc = pi D Dt / 360
derived arc = required combined arc - measured arc
```

The measured arc must be positive and shorter than the required combined arc. The derived component is a calculated complement, not a second measurement or an independent confirmation of the desired timing. Duration is a timing result and is not the same quantity as the instantaneous open area described below.

The MVP follows the stated Vespa measurement assumption that the crankcase sealing-track diameter equals the crankshaft diameter. Any entered arc length must be measured along that curved track, not as a straight chord. A chord needs a different equation and is outside the current input contract.

Both desired edges remain authoritative for the position of the interval relative to TDC. The solved physical split is then passed through the same canonical rotary interval used by direct-angle mode. Diagram arcs, inlet-to-transfer margins, overlap, triple overlap and time-area therefore use the same positioned opening and closing events. Direct-angle mode can show an equivalent combined arc when a diameter is available, but it cannot create the two physical component arcs required by the cylindrical-overlap area model.

This is circumferential geometry only. It excludes edge radius, chamfer, axial alignment, leakage, clearance, effective flow area, pressure, crankshaft strength and balance. Patented two-stroke arrangements document crank-web cut-outs opening and closing crankcase passages, while manufacturer instructions treat crank modification and crankcase sealing geometry as distinct physical operations: [US20050139179A1](https://patents.google.com/patent/US20050139179A1/en), [Polini Vespa rotary crank instructions](https://catalogue.polini.com/dep/210_0043.pdf).

## Compression

For bore `B`, cylinder area `A`, stroke `S`, clearance volume `Vc` and exhaust-roof travel `xE`:

```text
A = pi B^2 / 4
Vd = A S
geometric CR = (Vc + Vd) / Vc
trapped CR = (Vc + A xE) / Vc
target Vc = A xE / (target trapped CR - 1)
```

Volumes produced from millimetre geometry are converted from cubic millimetres to cubic centimetres.

Clearance volume may be entered as one assembled measurement or as an auditable signed sum of head chamber, gasket or shim, deck, piston-crown and custom correction volumes. A positive piston-crown value adds clearance volume; a negative value represents a dome that displaces it.

The trapped ratio begins at geometric exhaust closure. It is not cylinder pressure and does not account for pressure waves, temperature, retained exhaust gas, trapping efficiency or combustion.

## Squish

Four gap observations produce minimum, maximum, mean, range, maximum deviation and population standard deviation. For a centred circular bowl of diameter `Db` in a bore `B`:

```text
squish area ratio = 1 - (Db / B)^2
radial band width = (B - Db) / 2
```

This geometry does not model non-circular bowls, band angle, piston crown contour or running deformation.

The interface accepts either bowl diameter or radial band width as the authoritative annular-band dimension and derives the other representation.

Squish values are engine and kit specific. For example, the [SIP-BFA engine instructions](https://api.sip-scootershop.com/api/files/download/1/pdf/fd38cfbd-e197-4fe7-9c64-4904a6cdf2a3/SIP%2BBFA%2BEngine%2BInstructions.pdf) publish different clearances for two cylinders in the same product family. This is why Phase 360 accepts an optional documented minimum instead of applying one universal target.

## Geometric time-area

Each port group may define an idealised rectangular window width, height and count. At each crank angle, piston travel determines uncovered height. Trapezoidal integration over crank angle gives angle-area in square millimetres-degrees.

```text
area-time = angle-area / (6 n)
specific time-area = area-time / displacement
```

`n` is engine speed in revolutions per minute. Angle-area is expressed in square millimetres-degrees, area-time in square millimetres-seconds and specific time-area in square millimetres-seconds per cubic centimetre.

Downstroke blowdown angle-area integrates the idealised rectangular exhaust opening from exhaust opening to the earliest enabled transfer opening. Full-event port angle-area integrates the uncovered rectangular port area between its symmetric opening and closing events. Port width, height and count are projected dimensions. No discharge coefficient, port-angle correction, corner radius or duct flow is applied.

### Cylindrical rotary-overlap area

The preferred rotary area model unwraps the common cylindrical sealing track into two one-dimensional intervals. Let:

- `C = pi D` be the sealing-track circumference
- `a` be the crank cut-away arc length
- `b` be the crankcase window arc length
- `w` be the measured common axial overlap width
- `phi` be degrees elapsed since the inlet starts opening
- `s(phi) = C phi / 360` be the relative circumferential travel

For sharp, square edges, the instantaneous overlapping arc is:

```text
o(phi) = max(0, min(s(phi), a, b, a + b - s(phi)))
A(phi) = w o(phi)
```

The area therefore rises linearly, remains at a plateau when the two arcs have unequal lengths, and falls linearly to zero. Its principal geometric results are:

```text
maximum open area = w min(a, b)
crankcase window area = w b
angle-area = w a b 360 / C
mean open area = angle-area / geometric inlet duration
```

The displayed curve is sampled every 0.25 degrees. The angle-area uses the exact interval-product identity above, so the integral does not depend on whether a sample lands on a corner of the trapezoidal area profile.

This model requires arc lengths measured along the same effective diameter and a positive common axial width. It assumes a constant axial overlap, complete passage of one ideal rectangular interval across the other, no wrap-around beyond one circumference, and no deformation. It excludes edge radii, chamfers, port taper, axial misalignment, partial sealing, clearance, leakage, surface finish, discharge coefficient, pressure ratio, gas inertia and duct flow. The result is geometric area on an unwrapped cylindrical surface, not effective flow area.

### Constant-area compatibility path

Legacy or timing-only projects may explicitly select `constant-area` and enter an approximate area `Ac`. This is not an automatic fallback when cylindrical inputs are incomplete or invalid. It is a separate, user-selected compatibility model:

```text
A(phi) = Ac for the full inlet duration
angle-area = Ac * inlet duration
maximum area = mean area = Ac
```

The approximation has discontinuous opening and closing edges and does not represent the physical growth or decay of the overlap. The current implementation does not calculate measurement bounds for this path. If neither a valid cylindrical-overlap model nor a positive selected constant area is available, rotary angle-area and specific time-area are reported as unavailable.

The importance of inlet time-area has long been examined experimentally, including [SAE 670030](https://saemobilus.sae.org/papers/effect-crankcase-volume-inlet-system-delivery-ratio-two-stroke-cycle-engines-670030). Port area alone is not a performance model: [SAE 1999-01-3333](https://saemobilus.sae.org/papers/relationship-port-shape-engine-performance-two-stroke-engines-1999-01-3333) reports material relationships between transfer geometry, in-cylinder flow and engine output.

## Diagnostic claim levels

Every advisory uses one of three implementation labels. They describe the basis of a statement, not an ordered confidence scale:

1. `calculated-geometry`: a deterministic consequence of valid entered geometry, such as a duration, signed margin, overlap or blowdown. It proves that the arithmetic follows the input model, not that the input was measured correctly or that the engine is safe.
2. `profile-heuristic`: contextual interpretation under an explicitly selected use and exhaust profile, or a named sourced tuning reference. It remains advisory and cannot convert a setup into good, bad, safe or optimal.
3. `measured-or-modelled`: a result that depends on entered physical measurements, an explicit area idealisation or deterministic uncertainty propagation. The label does not by itself mean that a result was measured on the engine, calibrated against a test dataset or independently validated. Engine character annotations remain `profile-heuristic` statements.

Diagnostic tone and evidence level are separate. A strong profile warning remains a heuristic, while a neutral geometric statement remains deterministic. A source link qualifies a particular reference statement and does not validate unrelated calculations.

The current sourced inlet-overlap reference is the conservative `+5 degree` Vespa opening-overlap ceiling discussed by [WhiteOne Racing](https://www.youtube.com/watch?v=jhnKO9YTaC0&t=506s). The application compares the signed inlet-to-transfer opening margin with this reference and reports an indeterminate comparison when entered measurement bounds cross it. The reference is contextual guidance, not a universal physical limit or proof of correct flow direction.

## Profiles and reference-set version

Interpretation is optional. `none` keeps calculated geometry and geometric plots available without a profile judgement. The four selectable contexts are:

| Profile | Declared intended use | Declared exhaust context |
| --- | --- | --- |
| Touring box | Road touring, flexibility and sustained part-throttle use | Conventional touring box selected by the user |
| Sport box | Responsive road use | Sport-oriented box selected by the user |
| Road expansion | Road use with a deliberately more focused speed region | Road-oriented expansion chamber, without pipe dimensions or wave simulation |
| Race expansion | Competition use with a deliberately focused operating region | Competition expansion chamber, without pipe dimensions or wave simulation |

The implemented reference-set identifier is `phase360-profile-lens-1`. Its status is `uncalibrated-contextual`. It contains a developer-authored profile taxonomy, a set of declared interpretation rules and one source-qualified practitioner comparison. The taxonomy is an application convention, not a literature-derived performance band. No built-in profile identifies a particular exhaust, cylinder, inlet, ignition, fuel, load or measured engine response.

All four profiles use the same declared rules:

1. The selected profile is context only. It is never inferred from geometry and never alters a calculated value.
2. Blowdown degrees remain geometry, not a flow-capacity verdict. Available angle-area and specific time-area must remain separate and visible.
3. The signed inlet-opening versus final-transfer-closure margin may be compared with the `+5 crank degree` maximum-inclusive practitioner reference discussed by [WhiteOne Racing](https://www.youtube.com/watch?v=jhnKO9YTaC0&t=506s).
4. Inlet closing ATDC remains a separate edge. The reference set declares no universal good, bad or optimum inlet-closing band.
5. Angle-area and specific time-area remain in physical units and are never combined into a performance rank.

Changing profile does not change port geometry, rotary geometry, overlap, compression, squish, angle-area or specific time-area. If a saved reference-set version is unavailable, geometry is recalculated but profile rules and character annotations are withheld. The application does not silently substitute another version.

The reference set applies to Vespa-style piston-ported two-stroke geometry with optional crankshaft rotary induction and an explicitly selected exhaust-use context. It has not been calibrated against road, pressure, flow-bench or dyno data. Hardware identity, pipe dimensions, carburation, ignition, gas state, load and losses remain outside its scope.

## Engine character model

The Engine character annotation model is version `phase360-character-annotations-2`. It does not create a synthetic performance curve, dimensionless performance index or configuration ranking. It presents calculated observations in their original units and applies explicit reference-set rules to those observations.

The observation record contains:

- exhaust duration, transfer duration and blowdown in crank degrees, with bounded values when valid timing bounds are available
- inlet opening BTDC and inlet closing ATDC in crank degrees
- signed inlet-to-transfer margin in crank degrees, with bounded values when available
- exhaust blowdown specific time-area and rotary inlet specific time-area in square millimetres-seconds per cubic centimetre

The selected transfer observation is the enabled transfer with the longest duration. Global blowdown uses the earliest enabled transfer opening. Specific time-area remains tied to the entered RPM and displacement. Its mathematical decline across the RPM sweep is not a prediction of torque or power.

Every generated character annotation has claim level `profile-heuristic` and one of three evidence subtypes:

- `selected-profile-context` records the explicit user selection and makes no geometry comparison
- `declared-interpretation-rule` applies a documented application rule without claiming an empirical target
- `practitioner-threshold-comparison` performs the source-qualified `+5 degree` inlet-margin comparison

Each annotation carries the rule and source identifiers, reference-set version, applicability, limitations, calibration scope, operating scope, contributing observations and uncertainty status. The model produces five annotation topics: selected profile, blowdown context, inlet-opening overlap reference, separate inlet closing and the geometric time-area boundary.

The inlet-overlap comparison is maximum-inclusive:

```text
upper bound <= +5 degrees: at-or-below-reference
lower bound > +5 degrees: above-reference
lower bound <= +5 degrees and upper bound > +5 degrees: indeterminate
missing signed margin: unavailable
```

Without entered bounds, the nominal signed margin is compared and uncertainty is `not-entered`. The `+5 degree` statement is practitioner guidance for Vespa-style crankshaft rotary induction. It is not a statistical tolerance, universal optimum or proof of flow direction. Starting, blowback and delivery require physical verification.

Blowdown remains `context-only` when available and `unavailable` otherwise. The rule explicitly prevents degrees alone from becoming a capacity claim. Inlet closing remains `context-only` when available and has no target-band comparison. The time-area annotation is `context-only` only when both exhaust blowdown and rotary inlet specific time-area are available; otherwise it is `unavailable` and no surrogate index or timing-only performance curve is generated.

The model and reference set are explicitly not calibrated. No road, pressure, flow-bench or dyno dataset is fitted. They do not calculate or imply torque, power, brake mean effective pressure, volumetric efficiency, airflow, combustion, exhaust-wave tuning, carburettor response, ignition demand, thermal load, peak output, acceleration, vehicle speed or safe RPM. Measured engine behaviour remains the verification source.

## Measurement uncertainty

Entered uncertainty is treated as an absolute symmetric plus-or-minus bound around the entered value. The propagation is deterministic and worst-case. It is not a probability distribution, standard deviation, confidence interval, tolerance analysis or estimate of instrument accuracy. An empty uncertainty field means that no bound is reported, not that the physical measurement is exact.

For piston-controlled ports, millimetre uncertainty is propagated only when the authoritative source is travel from TDC, height above BDC or depth from the deck. The two travel endpoints are transformed separately through slider-crank geometry. Because this transformation is nonlinear, especially near TDC and BDC, equal linear bounds can produce unequal angular changes. If the travel interval leaves the reachable 0 to stroke domain, the nominal result remains available and the affected bound is withheld rather than clipped. Direct opening-angle and duration inputs do not currently accept an angular uncertainty.

Valid port-travel bounds feed duration, blowdown, inlet-to-transfer margin, rectangular angle-area and specific time-area limits. Port width, height and count are treated as exact inputs in the current model. Bore, stroke, rod length, deck position, cylinder lift, RPM, clearance volume, squish inputs and transmission inputs also have no propagated uncertainty model.

For rotary arc geometry, optional bounds may be entered for the sealing-track diameter and the one authoritative measured arc. The complementary arc is recalculated at each relevant extreme:

```text
derived arc = pi D * inlet duration / 360 - measured arc
```

The diameter, measured arc, derived arc and common axial width must remain positive across their requested intervals. If they do not, nominal geometry remains available but the affected rotary uncertainty result is withheld rather than clipped.

For cylindrical-overlap area, the common axial width may also have a bound. The exact product identity is evaluated at the limiting diameter and measured-arc values. Its internal stationary arc is included when it lies inside the entered interval, so the maximum of the concave arc product is not missed. Sampled area envelopes are conservative pointwise bounds. They need not describe one jointly attainable curve across every crank angle.

Rotary timing position and duration remain authoritative desired angles in arc-sizing mode, so diameter and arc-length uncertainty affects the physical component split and area model, not the entered opening and closing events. The constant-area compatibility path has no propagated area uncertainty.

Character observations may carry bounded values for exhaust duration, transfer duration, blowdown and signed inlet-to-transfer margin. `bounded` means only that valid deterministic lower and upper values were supplied to the annotation. `indeterminate` means that the inlet-margin bounds straddle the source-qualified `+5 degree` comparison. `not-entered`, `not-applicable` and `unavailable` remain distinct states. None of these states is a probability or confidence level.

The character annotation record does not currently attach bounds to inlet opening, inlet closing or either specific time-area observation. Area curves may expose their own geometric bounds elsewhere, but the annotation model does not promote them into a calibrated performance interpretation.

The [German Scooter Forum measurement guidance](https://wiki.germanscooterforum.de/index.php/Steuerzeiten_messen) is linked as practical context for measurement repeatability. It does not turn entered bounds into statistical evidence. Repeated degree-wheel measurements, calibrated tools and physical road, pressure, flow-bench or dyno tests remain outside the calculator and are required to assess real engine behaviour.

## Transmission and theoretical road speed

The transmission study accepts one manually entered primary pair and either four or five manually entered gearbox pairs.

For primary drive pinion teeth `P`, primary driven gear teeth `C`, cluster pinion teeth `p` and the corresponding driven gear wheel teeth `g`:

```text
primary ratio = C / P
gear ratio = g / p
overall reduction = primary ratio * gear ratio
wheel RPM = engine RPM / overall reduction
```

The terminology describes the direction of power transmission. The primary pinion drives the larger primary gear, and each selected cluster pinion drives its corresponding loose gear wheel.

For engine speed `n`, measured wheel rolling circumference `W` in millimetres and overall reduction `R`, ideal road speed is:

```text
speed km/h = n W 60 / (R 1,000,000)
```

The graph uses the inverse relationship for each gear:

```text
engine RPM = speed km/h * R * 1,000,000 / (W 60)
```

Speed is on the horizontal axis and engine RPM is on the vertical axis. With a fixed rolling circumference and fixed tooth counts, each gear is a straight line through the origin. The entered maximum RPM sets the graph range and the common comparison point; it is not a predicted safe limit or an achievable engine speed.

For an upshift made at the entered maximum RPM, the geometric engine-speed recovery and percentage drop are:

```text
RPM after upshift = maximum RPM * next overall reduction / current overall reduction
RPM drop percent = 100 * (1 - RPM after upshift / maximum RPM)
```

The actual loaded-wheel rolling circumference is authoritative. It should be measured over one complete wheel revolution on the ground in the intended running condition. Nominal or catalogue tyre dimensions are useful starting points but can differ from the fitted value because of tyre construction, pressure, wear and load.

Technical material used to check terminology and calculation examples includes the [SIP Gearbox Technology guide](https://www.sip-scootershop.com/en/download/article/1/pdf/fa6fa8d4-75db-48e7-8d72-31c6952120a1/Gearbox%2BTechnology.pdf?contentType=application-pdf), the [SIP Smallframe primary-drive table](https://www.sip-scootershop.com/en/download/article/1/pdf/dc20197c-cf8c-4336-bfdf-0836e35d2f46/%C3%9Cbersicht%2BPrim%C3%A4r%C3%BCbersetzung%2BSmallframe.pdf?contentType=application-pdf), the [VMC Smallframe five-speed kit listing](https://www.sip-scootershop.com/en/product/gearbox-kit-56-53-50-47-46-teeth-vmc-5-speed_40477000) and the [Pirelli technical tyre guide](https://tyre24.pirelli.com/moto/assets/pirelli/pdf/global/TDB/PIRELLI_TDB_2025_HR.pdf). These sources do not populate the project. The user must enter the measured or verified values for the fitted engine, wheel and gearbox.

These equations describe ideal kinematics only. They exclude clutch slip, tyre slip, tyre deformation and growth, transmission losses, engine load, gradient, wind and aerodynamic drag. The plotted endpoint is therefore theoretical gearing speed, not a forecast of attainable road speed, power or torque.

## What-if effects

The installed cylinder lift is evaluated as an active assembled configuration. Remaining what-if controls are evaluated independently from that current configuration:

- a head gasket increases clearance volume and squish gap while leaving port timing unchanged
- the installed cylinder lift increases clearance volume and squish gap and raises every cylinder port relative to piston travel
- raising only the exhaust roof increases exhaust duration and reduces trapped compression, while geometric compression remains unchanged if chamber volume is unchanged

The effects are not compounded in the current interface.
