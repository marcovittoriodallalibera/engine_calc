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

The rotary inlet may use direct opening and closing angles or two physical circumferential measurements. For arc length `l` measured at effective diameter `D`:

```text
circumference = pi D
arc angle = 360 l / (pi D)
```

The crank-web cut-away and the crankcase inlet opening are idealised as two continuous angular windows on the same sealing-track diameter. From first positive overlap to final positive overlap, their widths combine:

```text
geometric inlet duration = crank cut-away angle + crankcase opening angle
```

The MVP follows the stated Vespa measurement assumption that the crankcase sealing-track diameter equals the crankshaft diameter. Both lengths must be measured along that curved track, not as straight chords. A chord needs a different equation and is outside the current input contract.

The two lengths determine duration, not its absolute position relative to TDC. One edge therefore remains authoritative:

```text
opening anchored: closing delay ATDC = duration - opening advance BTDC
closing anchored: opening advance BTDC = duration - closing delay ATDC
```

The derived timing is then passed through the same canonical rotary interval used by direct angles. Diagram arcs, inlet-to-transfer margins, overlap, triple overlap and time-area therefore have one calculation path.

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

Downstroke blowdown angle-area integrates exhaust area from exhaust opening to the earliest enabled transfer opening. The rotary inlet estimate assumes the entered effective area remains constant for the full rotary duration, so it must be treated as an idealised comparison value.

The importance of inlet time-area has long been examined experimentally, including [SAE 670030](https://saemobilus.sae.org/papers/effect-crankcase-volume-inlet-system-delivery-ratio-two-stroke-cycle-engines-670030). Port area alone is not a performance model: [SAE 1999-01-3333](https://saemobilus.sae.org/papers/relationship-port-shape-engine-performance-two-stroke-engines-1999-01-3333) reports material relationships between transfer geometry, in-cylinder flow and engine output.

## What-if effects

The installed cylinder lift is evaluated as an active assembled configuration. Remaining what-if controls are evaluated independently from that current configuration:

- a head gasket increases clearance volume and squish gap while leaving port timing unchanged
- the installed cylinder lift increases clearance volume and squish gap and raises every cylinder port relative to piston travel
- raising only the exhaust roof increases exhaust duration and reduces trapped compression, while geometric compression remains unchanged if chamber volume is unchanged

The effects are not compounded in the current interface.

## Evidence levels

Phase 360 separates three classes of statement:

1. Calculated geometry, derived deterministically from entered data
2. Documented reference, tied to a named manufacturer or technical source
3. Tuning hypothesis, which requires direct physical verification

No geometric result marks an engine as safe, optimal or physically verified.
