## Why

Vespa two-stroke builders currently have to combine separate calculators, degree-wheel measurements, and manual sketches to understand how cylinder and rotary-inlet timing events interact. A single visual workbench can make those geometric relationships accurate, immediate, comparable, and easier to verify before irreversible machining work.

## What Changes

- Add an exact slider-crank calculator that converts piston travel and port-roof measurements into crankshaft opening angles, closing angles, and durations using stroke and connecting-rod length.
- Support signed piston-to-deck position and multiple measurement modes without treating inconsistent millimetre and degree values as simultaneous sources of truth.
- Support a configurable exhaust and any number of primary, secondary, front/boost, auxiliary, or custom transfer-port groups.
- Support Vespa rotary-inlet opening before TDC and closing after TDC, while treating reed induction as pressure-controlled rather than assigning it a false fixed timing phase.
- Keep timing-only rotary analysis available from desired opening advance before TDC and closing delay after TDC. When physical arc sizing is selected, require the effective rotary-valve sealing-track diameter and use the desired duration to define the total circumferential opening length.
- Let the user select exactly one authoritative manual circumferential measurement, either the open crank-web cut-away arc or the crankcase inlet-opening arc. Derive the complementary length at full precision, keep it read-only, and preserve the solved geometry when measurement authority is switched and a valid complementary result exists.
- Keep the physical and angular representations in parallel: show circumference, desired opening and closing angles, total duration, total arc length, the selected manual measurement, the derived complementary length, and both angular contributions. Treat both component lengths as true circumferential arcs and project the crankcase opening onto the entered crank-web diameter as an explicit MVP assumption.
- Calculate exhaust-to-transfer blowdown, duration differences, transfer staging, geometric simultaneous-open windows, rotary-inlet-to-transfer overlap or gap, and triple overlap.
- Express the rotary-inlet relationship to each transfer through a signed inlet-opening versus transfer-closing margin, and analyse inlet closing delay separately from opening overlap and total duration without inventing a universal intake-to-transfer ratio.
- Present global blowdown as one connected result in crank degrees, elapsed milliseconds at the selected RPM, geometric angle-area, and specific time-area when the required exhaust profile is available. Do not classify blowdown capacity from degrees alone.
- Calculate bore-derived displacement, mean piston speed, geometric and exhaust-closure trapped compression ratios, target clearance volume, and an auditable clearance-volume breakdown.
- Calculate squish gap minimum, mean, and asymmetry together with circular annular-band area, area ratio, bowl diameter, and radial band width.
- Calculate geometric angle-area and RPM-dependent specific time-area for rectangular projected exhaust and transfer windows, including the exhaust blowdown interval.
- In physical rotary arc-sizing mode, calculate the changing cylindrical overlap between the moving crank cut-away and fixed case window, convert it to a geometric inlet-area curve with an explicitly measured common axial overlap width, and integrate that curve for rotary angle-area and specific time-area. Keep geometric overlap area distinct from discharge-corrected effective flow area.
- Add a real-time cylinder lift study in 0.1 mm steps that raises every cylinder-controlled port together and compares no-spacer and lifted timings without changing stroke, connecting-rod length, or rotary-valve timing.
- Compare configurations and propagate stated measurement uncertainty through event boundaries, signed margins, inlet closing, blowdown, geometric overlap area, time-area, and applicable profile comparisons so users can inspect deltas and bounded ranges rather than false point precision.
- Add an optional, explicit engine-use profile with four built-in choices: touring box, sport box, road expansion, and race expansion. Profiles select versioned, source-labelled comparison bands and never change calculated geometry.
- Present diagnostics in three explicit levels: deterministic calculated geometry, contextual profile heuristic, and measured or calibrated-model evidence. A profile heuristic can never become a hard geometric error or a measured claim.
- Present all valid results immediately in a responsive 360-degree timing diagram and an equivalent numeric event table.
- Add a qualitative Engine character estimate combining area-versus-angle and time-area-versus-RPM geometry with profile-qualified lower-speed, mid-range, upper-speed, or area-limited tendency annotations. Do not draw or label simulated torque, power, peak output, or a predicted dyno curve.
- Add deterministic validation, measurement uncertainty, and warnings that distinguish geometric calculations from airflow, performance, structural-safety, and tuning predictions.
- Add local project persistence, versioned JSON import/export, shareable client-side links, SVG export, and an A4 report with editable project code, date, and three-line engine specification.
- Keep the first release client-only. Accounts, cloud projects, CFD, dynamic pressure or combustion simulation, absolute torque or power prediction, synthetic dyno curves, exhaust-pipe design, universal tuning targets, chord-to-arc conversion, independent crankcase-track diameter, disconnected rotary windows, edge-radius modelling, and crankshaft strength or balance assessment are outside this change.

## Capabilities

### New Capabilities

- `engine-geometry`: Exact piston-motion conversion, measurement references, inverse calculations, numeric constraints, uncertainty, and measurable geometry outputs.
- `timing-analysis`: Configurable port and induction events, circular intervals, signed margins, separate inlet-closing analysis, complete blowdown metrics, profile-qualified diagnostics, and deterministic domain warnings.
- `engine-performance-metrics`: Displacement, mean piston speed, compression, squish geometry, port and rotary-overlap time-area, three-level diagnostics, configuration comparison, uncertainty-aware interpretation, and qualitative engine-character geometry.
- `visual-workbench`: Real-time editing, the accessible 360-degree timing diagram, numeric results, diagnostic profiles, qualitative character visualisation, responsive interaction, and comparison-ready presentation.
- `project-portability`: Local persistence, schema-versioned import/export, shareable links, SVG export, and printable output.

### Modified Capabilities

None.

## Impact

- Introduces a browser application and a framework-independent TypeScript calculation kernel.
- Adds a versioned project data model shared by geometry, compression, squish, time-area, comparison, rendering, persistence, and export paths.
- Upgrades the portable project model to schema version 5. Version 2 introduced dual rotary source authority, version 3 added bounded report identity, and version 4 kept desired timing authoritative while replacing two editable physical arcs with one explicit manual component and one calculated complement. Version 5 adds the selected versioned diagnostic profile, rotary-area source, bounded physical uncertainties, and character-graph RPM range. Supported version 1, 2, 3, and 4 projects migrate deterministically with profile `none` and without fabricated measurements, uncertainty, or profile judgements.
- Introduces client-side validation, SVG rendering, local storage, URL-state handling, and automated mathematical and server-render checks. Interactive component, accessibility, visual-regression, and complete browser coverage remain explicit hardening tasks.
- Uses private client-only hosting for the current preview. Continuous integration and the complete deployment acceptance suite remain open, and no runtime calculation backend or user-data service is required.
