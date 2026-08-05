# Project format and portability

## Schema version

Current portable projects are JSON objects with `schemaVersion: 5`. A document stores authoritative editable inputs, report identity and presentation preferences. It does not store derived timing, overlap, diagnostics, graph series, compression or time-area results.

The principal sections are:

```text
schemaVersion
name
report
geometry
ports[]
induction
character
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

## Validation boundary

Imported documents are treated as untrusted data. Before replacement, the complete document is checked for:

- supported schema version
- bounded byte size
- bounded project name and port labels
- bounded project code and engine details, a real ISO project date, and a maximum of three detail lines
- a bounded number of port groups
- known categories, source modes and induction modes
- expected string and boolean field types
- valid desired rotary opening and closing angles
- in arc-sizing mode, a positive timing-track diameter, one positive measured arc and a strictly positive calculated counterpart
- a known rotary area source, bounded area-source measurement strings, and optional non-negative rotary measurement uncertainties
- a supported profile identifier and a bounded RPM sweep from 500 to 20,000 RPM

Malformed or unsupported data leaves the current project unchanged.

## Local continuity

The latest valid project is written to the browser's local storage. Storage failure is non-blocking: calculation and explicit export continue to work for the current session.

At startup, a valid project encoded in the URL fragment takes precedence over a locally stored project. The fragment is validated before use.

## Share links

Share links use URL-safe base64 encoded JSON after `#p=`. Browser URL fragments are not included in normal HTTP requests, so opening or copying such a link does not create a server-side project record.

An encoded-length cap avoids creating unreliable URLs. JSON export is the fallback for larger projects.

## Compatibility

A project with a newer schema version is rejected with a clear version message. Future migrations must be explicit and tested. An unreadable stored payload must remain recoverable rather than being silently overwritten during a failed migration.

The current reader remains backward compatible with schema versions 1, 2, 3 and 4. Version 1 documents have their missing rotary timing source normalised to `direct-angles` and receive empty optional geometry inputs. Versions 1 and 2 receive empty report metadata. Version 3 and 4 report identity is preserved.

For a version 2 or 3 project whose active source was crank-and-case geometry, migration first reconstructs its effective opening and closing angles from the two historical arcs and timing anchor. It then keeps the crank cut-away as the single measured length and reproduces the former crankcase opening as a calculated value. The version 5 document strips the second persisted arc and obsolete timing anchor.

Version 4 projects preserve their single measured rotary component and any historical constant-area value. They migrate with profile `none`, the documented default RPM sweep and no invented common axial width, diameter uncertainty, measured-arc uncertainty or axial-width uncertainty. A schema 5 document created before these optional fields existed is also normalised to empty uncertainty strings rather than receiving assumed values.

## Privacy

The MVP has no accounts, project API, cloud database or telemetry containing project measurements. Import, calculation, local save, fragment creation, JSON export and SVG export occur in the browser.

Any future feature that transmits project content requires a separately specified capability and explicit user action.
