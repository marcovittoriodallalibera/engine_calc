## Why

Vespa two-stroke builders currently have to combine separate calculators, degree-wheel measurements, and manual sketches to understand how cylinder and rotary-inlet timing events interact. A single visual workbench can make those geometric relationships accurate, immediate, comparable, and easier to verify before irreversible machining work.

## What Changes

- Add an exact slider-crank calculator that converts piston travel and port-roof measurements into crankshaft opening angles, closing angles, and durations using stroke and connecting-rod length.
- Support signed piston-to-deck position and multiple measurement modes without treating inconsistent millimetre and degree values as simultaneous sources of truth.
- Support a configurable exhaust and any number of primary, secondary, front/boost, auxiliary, or custom transfer-port groups.
- Support Vespa rotary-inlet opening before TDC and closing after TDC, while treating reed induction as pressure-controlled rather than assigning it a false fixed timing phase.
- Derive rotary-inlet duration from crank-web cut-away and crankcase opening arc lengths at the entered crankshaft diameter, with one measured timing edge anchoring the result relative to TDC and a direct-angle comparison kept visible.
- Calculate exhaust-to-transfer blowdown, duration differences, transfer staging, geometric simultaneous-open windows, rotary-inlet-to-transfer overlap or gap, and triple overlap.
- Express the rotary-inlet relationship to each transfer through a signed inlet-opening versus transfer-closing margin, without inventing a universal intake-to-transfer duration ratio.
- Calculate bore-derived displacement, mean piston speed, geometric and exhaust-closure trapped compression ratios, target clearance volume, and an auditable clearance-volume breakdown.
- Calculate squish gap minimum, mean, and asymmetry together with circular annular-band area, area ratio, bowl diameter, and radial band width.
- Calculate geometric angle-area and RPM-dependent specific time-area for rectangular projected exhaust and transfer windows, including the exhaust blowdown interval.
- Add a real-time cylinder lift study in 0.1 mm steps that raises every cylinder-controlled port together and compares no-spacer and lifted timings without changing stroke, connecting-rod length, or rotary-valve timing.
- Compare configurations and propagate stated measurement uncertainty so users can inspect deltas and overlapping result ranges rather than false point precision.
- Present recommendations in three explicit evidence levels: calculated geometry, documented configuration-specific reference, and tuning hypothesis requiring physical verification.
- Present all valid results immediately in a responsive 360-degree timing diagram and an equivalent numeric event table.
- Add deterministic validation, measurement uncertainty, and warnings that distinguish geometric calculations from airflow, performance, structural-safety, and tuning predictions.
- Add local project persistence, versioned JSON import/export, shareable client-side links, SVG export, and print output.
- Keep the first release client-only. Accounts, cloud projects, CFD, dynamic pressure or combustion simulation, exhaust-pipe design, and universal tuning targets are outside this change.

## Capabilities

### New Capabilities

- `engine-geometry`: Exact piston-motion conversion, measurement references, inverse calculations, numeric constraints, uncertainty, and measurable geometry outputs.
- `timing-analysis`: Configurable port and induction events, circular intervals, timing metrics, overlap analysis, and deterministic domain warnings.
- `engine-performance-metrics`: Displacement, mean piston speed, compression, squish geometry, rectangular-port time-area, evidence-tiered recommendations, configuration comparison, and uncertainty-aware interpretation.
- `visual-workbench`: Real-time editing, the accessible 360-degree timing diagram, numeric results, responsive interaction, and comparison-ready presentation.
- `project-portability`: Local persistence, schema-versioned import/export, shareable links, SVG export, and printable output.

### Modified Capabilities

None.

## Impact

- Introduces a browser application and a framework-independent TypeScript calculation kernel.
- Adds a versioned project data model shared by geometry, compression, squish, time-area, comparison, rendering, persistence, and export paths.
- Introduces client-side validation, SVG rendering, local storage, URL-state handling, and automated mathematical, interaction, accessibility, and visual tests.
- Requires static hosting and continuous integration for build, test, and deployment checks, but no runtime backend or user-data service.
