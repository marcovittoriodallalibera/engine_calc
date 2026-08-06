# Project format and portability

## Schema version

Current portable projects are JSON objects with `schemaVersion: 6`. A document stores authoritative editable inputs, report identity and presentation preferences. It does not store derived timing, overlap, diagnostics, graph series, compression, time-area or transmission results.

The principal sections are:

```text
schemaVersion
name
report
geometry
ports[]
induction
character
transmission
compression
squish
presentation
```

The `report` section stores an optional project code, an optional ISO project date and up to three bounded lines describing components, engine characteristics or test notes. These fields identify the project but never alter a calculation. The report generation date is created at print time and is not persisted.

Each port has a stable identifier, label, category, enabled state, authoritative source mode and source value. Idealised window width, height, count and measurement uncertainty are also retained.

Compression records whether the authoritative clearance volume is a measured assembled total or a signed component sum. Squish geometry records whether bowl diameter or radial band width is authoritative.

Rotary induction records desired opening advance and closing delay. The selected calculation mode then determines whether physical arc sizing is required:

- `direct-angles` uses the desired angles without requiring physical arc inputs
- `crank-and-case-arcs` also stores the timing-track diameter, which component is measured, and that single measured circumferential length

The diameter and authoritative measured arc each have an optional non-negative plus-or-minus measurement uncertainty. The calculated complementary arc remains derived. Migration never invents either uncertainty.

In arc-sizing mode the desired duration is `advance + delay`, circumference is `π × diameter`, and required total arc is `circumference × duration / 360`. The unmeasured crank or crankcase length is calculated by subtracting the one measured length. That calculated counterpart is never persisted as a second authority. Changing the measured component promotes the current full-precision calculated value when a valid solution exists.

Rotary area has one explicit source. `constant-area` retains a separately entered square-millimetre approximation for older projects. `cylindrical-overlap` stores the measured common axial overlap width and its optional non-negative plus-or-minus uncertainty, then derives the changing area from the solved crank and crankcase arcs. Neither area curve nor its integral is persisted.

When every entered uncertainty range remains inside the positive physical domain, the calculator propagates deterministic worst-case lower and upper bounds through the complementary arc, the sampled cylindrical opening curve, angle-area and specific time-area. The area-product maximum includes the interior stationary measured arc where it falls inside the entered range. These bounds do not represent a probability distribution, confidence interval or statistical coverage. If any bound leaves the physical domain, nominal results remain available and bounded results are withheld with a diagnostic.

The `character` section stores `none`, `touring-box`, `sport-box`, `road-expansion` or `race-expansion`, the profile reference-set version and a bounded RPM sweep. Profiles affect contextual annotations only. Calculated geometry and time-area remain invariant when the profile changes.

The `transmission` section stores whether gearing analysis is enabled, the manually entered primary drive pinion and driven gear tooth counts, a `gearCount` of 4 or 5, five stable gear records, the measured wheel rolling circumference in millimetres and the graph maximum RPM. Each gear record contains a stable identifier, label, manually entered cluster pinion tooth count and driven gear wheel tooth count. Only the first `gearCount` records are active, so changing between four and five gears does not require changing the document shape.

The entered tooth counts and measured rolling circumference are the only authoritative transmission inputs.

```text
transmission.enabled
transmission.primaryDrivePinionTeeth
transmission.primaryDrivenGearTeeth
transmission.gearCount
transmission.gears[5].id
transmission.gears[5].label
transmission.gears[5].clusterPinionTeeth
transmission.gears[5].drivenGearTeeth
transmission.wheelRollingCircumferenceMm
transmission.maximumRpm
```

Primary ratio, individual gear ratio, overall reduction, speed per 1,000 RPM, theoretical speed, post-shift RPM, RPM drop and graph coordinates are all derived and are never persisted as source data. The measured loaded-wheel rolling circumference is authoritative.

## Validation boundary

Imported documents are treated as untrusted data. Before replacement, the complete document is checked for:

- supported schema version
- bounded byte size
- bounded project name and port labels
- non-empty unique port identifiers and a valid signed piston crown position
- bounded project code and engine details, a real ISO project date, and a maximum of three detail lines
- a bounded number of port groups
- known categories, source modes and induction modes
- expected string and boolean field types
- valid desired rotary opening and closing angles
- in arc-sizing mode, a positive timing-track diameter, one positive measured arc and a strictly positive calculated counterpart
- a known rotary area source, bounded area-source measurement strings, and optional non-negative rotary measurement uncertainties
- a supported profile identifier and a bounded RPM sweep from 500 to 20,000 RPM
- a transmission gear count of 4 or 5 and exactly five structurally valid gear records with unique identifiers
- when transmission analysis is enabled, positive whole tooth counts up to 200 for the primary and active gear pairs, a wheel rolling circumference from 500 to 5,000 mm, and a graph maximum from 500 to 20,000 RPM

Malformed or unsupported data leaves the current project unchanged.

## Local continuity

The latest valid project is written to the client profile's local storage. On the web this is the browser profile; in the packaged application it is the dedicated local Electron profile. Storage failure is non-blocking: calculation and explicit export continue to work for the current session.

If stored data cannot be validated, it is left untouched and automatic saving pauses until an explicit edit, import, reset or clear action. The Project menu can clear current and legacy local project keys after confirmation.

At startup, a valid project encoded in the URL fragment takes precedence over a locally stored project. The fragment is validated before use.

## Share links

Share links use URL-safe base64 encoded JSON after `#p=`. Browser URL fragments are not included in normal HTTP requests, so opening or copying such a link does not create a server-side project record.

The desktop application uses the configured canonical HTTPS application origin for copied links. It never exposes the private `phase360` scheme. Web and desktop clients share schema version 6 and the same migration rules; the desktop profile directory itself is neither a portable project format nor a data-encryption guarantee.

An encoded-length cap avoids creating unreliable URLs. JSON export is the fallback for larger projects.

## Compatibility

A project with a newer schema version is rejected with a clear version message. Future migrations must be explicit and tested. An unreadable stored payload must remain recoverable rather than being silently overwritten during a failed migration.

The current reader remains backward compatible with schema versions 1, 2, 3, 4 and 5. Version 1 documents have their missing rotary timing source normalised to `direct-angles` and receive empty optional geometry inputs. Versions 1 and 2 receive empty report metadata. Version 3 and 4 report identity is preserved.

For a version 2 or 3 project whose active source was crank-and-case geometry, migration first reconstructs its effective opening and closing angles from the two historical arcs and timing anchor. It then keeps the crank cut-away as the single measured length and reproduces the former crankcase opening as a calculated value. The version 5 document strips the second persisted arc and obsolete timing anchor.

Version 4 projects preserve their single measured rotary component and any historical constant-area value. They migrate with profile `none`, the documented default RPM sweep and no invented common axial width, diameter uncertainty, measured-arc uncertainty or axial-width uncertainty. A schema 5 document created before these optional fields existed is also normalised to empty uncertainty strings rather than receiving assumed values.

Every schema 1 to 5 project migrates to schema 6 with transmission analysis disabled. The migration creates five stable empty gear rows, selects four active gears, and leaves the primary tooth counts, gear tooth counts and wheel rolling circumference empty. It does not infer fitted hardware from the engine geometry or project name. The dormant 10,000 RPM graph maximum is an interface default only and has no calculation effect while the transmission module is disabled.

## Privacy

The MVP has no accounts, project API, cloud database or telemetry containing project measurements. Import, calculation, local save, fragment creation, JSON export and SVG export occur in the browser or packaged desktop client.

Desktop local storage remains readable to software with access to the Windows or macOS user profile. The enabled Electron cookie-encryption fuse does not encrypt local storage. Use JSON export for deliberate portability and Clear local data to remove retained project keys from the active profile.

Any future feature that transfers project content over a network requires a separately specified capability and explicit user action.
