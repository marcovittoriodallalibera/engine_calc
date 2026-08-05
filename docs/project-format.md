# Project format and portability

## Schema version

Current portable projects are JSON objects with `schemaVersion: 2`. A document stores authoritative editable inputs and presentation preferences. It does not store derived timing, overlap, compression or time-area results.

The principal sections are:

```text
schemaVersion
name
geometry
ports[]
induction
compression
squish
presentation
```

Each port has a stable identifier, label, category, enabled state, authoritative source mode and source value. Idealised window width, height, count and measurement uncertainty are also retained.

Compression records whether the authoritative clearance volume is a measured assembled total or a signed component sum. Squish geometry records whether bowl diameter or radial band width is authoritative.

Rotary induction records one authoritative timing source:

- `direct-angles` stores opening advance before TDC and closing delay after TDC
- `crank-and-case-arcs` stores crankshaft diameter, crank-web cut-away arc, crankcase opening arc, and one opening or closing anchor

Both source representations may remain in the document for comparison, but only `timingSource` drives calculated timing. Derived angles are recalculated and are not written back as authoritative input.

## Validation boundary

Imported documents are treated as untrusted data. Before replacement, the complete document is checked for:

- supported schema version
- bounded byte size
- bounded project name and port labels
- a bounded number of port groups
- known categories, source modes and induction modes
- expected string and boolean field types
- a complete, physically bounded active rotary source, including positive arc widths and an anchor within the derived duration

Malformed or unsupported data leaves the current project unchanged.

## Local continuity

The latest valid project is written to the browser's local storage. Storage failure is non-blocking: calculation and explicit export continue to work for the current session.

At startup, a valid project encoded in the URL fragment takes precedence over a locally stored project. The fragment is validated before use.

## Share links

Share links use URL-safe base64 encoded JSON after `#p=`. Browser URL fragments are not included in normal HTTP requests, so opening or copying such a link does not create a server-side project record.

An encoded-length cap avoids creating unreliable URLs. JSON export is the fallback for larger projects.

## Compatibility

A project with a newer schema version is rejected with a clear version message. Future migrations must be explicit and tested. An unreadable stored payload must remain recoverable rather than being silently overwritten during a failed migration.

The current reader remains backward compatible with legacy schema version 1 documents. Their missing rotary timing source is normalised to `direct-angles`, empty geometry fields are added, and the in-memory project is migrated to version 2. Version 2 prevents an older reader from silently treating inactive direct-angle comparison fields as the authority for an arc-sourced project.

## Privacy

The MVP has no accounts, project API, cloud database or telemetry containing project measurements. Import, calculation, local save, fragment creation, JSON export and SVG export occur in the browser.

Any future feature that transmits project content requires a separately specified capability and explicit user action.
